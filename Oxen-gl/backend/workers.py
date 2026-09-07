"""
ETL Background Worker and Replication Engine for Enterprise Analytics & BI (ADR-008).
Extracts transactional records (General Ledger, Fleet Fuel, Maintenance Work Orders),
aggregates balances and operational metrics, and idempotently upserts into flattened fact/summary tables.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend import models

logger = logging.getLogger(__name__)


class ETLWorker:
    """
    Asynchronous and synchronous replication engine extracting transactional core data
    into flattened analytical tables: ReportingLedgerSummary and FleetUtilizationFact.
    """

    def __init__(self, session_factory=SessionLocal):
        self.session_factory = session_factory

    def extract_ledger_summary(
        self,
        company_id: uuid.UUID | None = None,
        period: str | None = None,
        db: Session | None = None,
    ) -> int:
        """
        Extracts posted AccountMoveLine entries aggregated by tenant, period (YYYY-MM), and account.
        Upserts results into ReportingLedgerSummary.
        """
        def _execute(session: Session) -> int:
            query = (
                select(
                    models.AccountMoveLine.company_id,
                    models.AccountMoveLine.account_id,
                    models.AccountAccount.code.label("account_code"),
                    models.AccountAccount.name.label("account_name"),
                    models.AccountAccount.internal_type.label("account_type"),
                    func.to_char(models.AccountMove.date, "YYYY-MM").label("period"),
                    func.extract("year", models.AccountMove.date).label("fiscal_year"),
                    func.extract("month", models.AccountMove.date).label("fiscal_month"),
                    func.coalesce(func.sum(models.AccountMoveLine.debit), Decimal("0")).label("total_debit"),
                    func.coalesce(func.sum(models.AccountMoveLine.credit), Decimal("0")).label("total_credit"),
                    func.count(models.AccountMoveLine.id).label("entry_count"),
                )
                .join(models.AccountMove, models.AccountMoveLine.move_id == models.AccountMove.id)
                .join(models.AccountAccount, models.AccountMoveLine.account_id == models.AccountAccount.id)
                .where(models.AccountMove.state == "posted")
            )

            if company_id is not None:
                query = query.where(models.AccountMoveLine.company_id == company_id)

            if period is not None:
                query = query.where(func.to_char(models.AccountMove.date, "YYYY-MM") == period)

            query = query.group_by(
                models.AccountMoveLine.company_id,
                models.AccountMoveLine.account_id,
                models.AccountAccount.code,
                models.AccountAccount.name,
                models.AccountAccount.internal_type,
                func.to_char(models.AccountMove.date, "YYYY-MM"),
                func.extract("year", models.AccountMove.date),
                func.extract("month", models.AccountMove.date),
            )

            results = session.execute(query).all()
            now = datetime.now(timezone.utc)
            upserted_count = 0

            for row in results:
                cid = row.company_id
                acc_id = row.account_id
                prd = row.period
                f_year = int(row.fiscal_year)
                f_month = int(row.fiscal_month)
                t_debit = Decimal(str(row.total_debit))
                t_credit = Decimal(str(row.total_credit))
                balance = t_debit - t_credit
                entries = int(row.entry_count)

                existing = session.scalar(
                    select(models.ReportingLedgerSummary).where(
                        models.ReportingLedgerSummary.company_id == cid,
                        models.ReportingLedgerSummary.period == prd,
                        models.ReportingLedgerSummary.account_id == acc_id,
                    )
                )

                if existing:
                    existing.total_debit = t_debit
                    existing.total_credit = t_credit
                    existing.balance = balance
                    existing.entry_count = entries
                    existing.account_code = row.account_code
                    existing.account_name = row.account_name
                    existing.account_type = row.account_type
                    existing.last_extracted_at = now
                else:
                    new_summary = models.ReportingLedgerSummary(
                        company_id=cid,
                        period=prd,
                        fiscal_year=f_year,
                        fiscal_month=f_month,
                        account_id=acc_id,
                        account_code=row.account_code,
                        account_name=row.account_name,
                        account_type=row.account_type,
                        total_debit=t_debit,
                        total_credit=t_credit,
                        balance=balance,
                        entry_count=entries,
                        last_extracted_at=now,
                    )
                    session.add(new_summary)
                upserted_count += 1

            session.commit()
            return upserted_count

        if db is not None:
            return _execute(db)
        else:
            with self.session_factory() as sess:
                return _execute(sess)

    def extract_fleet_utilization(
        self,
        company_id: uuid.UUID | None = None,
        period: str | None = None,
        db: Session | None = None,
    ) -> int:
        """
        Extracts vehicle utilization, fuel consumption, and maintenance expenditures for a period.
        Upserts facts into FleetUtilizationFact.
        """
        target_period = period or datetime.now(timezone.utc).strftime("%Y-%m")

        def _execute(session: Session) -> int:
            v_query = select(models.Vehicle)
            if company_id is not None:
                v_query = v_query.where(models.Vehicle.company_id == company_id)
            vehicles = session.scalars(v_query).all()

            now = datetime.now(timezone.utc)
            upserted_count = 0

            for v in vehicles:
                # Fuel metrics
                fuel_q = (
                    select(
                        func.coalesce(func.sum(models.FuelTransaction.liters), Decimal("0")).label("total_liters"),
                        func.coalesce(func.sum(models.FuelTransaction.total_amount), Decimal("0")).label("total_cost"),
                        func.min(models.FuelTransaction.odometer_reading).label("min_odometer"),
                        func.max(models.FuelTransaction.odometer_reading).label("max_odometer"),
                    )
                    .where(
                        models.FuelTransaction.vehicle_id == v.id,
                        func.to_char(models.FuelTransaction.transaction_date, "YYYY-MM") == target_period,
                    )
                )
                fuel_res = session.execute(fuel_q).one()
                total_liters = Decimal(str(fuel_res.total_liters))
                total_fuel_cost = Decimal(str(fuel_res.total_cost))

                # Maintenance metrics
                maint_q = (
                    select(
                        func.coalesce(func.sum(models.MaintenanceWorkOrder.total_cost), Decimal("0")).label("total_maint_cost"),
                        func.count(models.MaintenanceWorkOrder.id).label("wo_count"),
                        func.min(models.MaintenanceWorkOrder.odometer_reading).label("min_maint_odo"),
                        func.max(models.MaintenanceWorkOrder.odometer_reading).label("max_maint_odo"),
                    )
                    .where(
                        models.MaintenanceWorkOrder.vehicle_id == v.id,
                        func.to_char(func.coalesce(models.MaintenanceWorkOrder.completed_date, models.MaintenanceWorkOrder.scheduled_date), "YYYY-MM") == target_period,
                    )
                )
                maint_res = session.execute(maint_q).one()
                total_maint_cost = Decimal(str(maint_res.total_maint_cost))
                wo_count = int(maint_res.wo_count)

                all_min = [x for x in (fuel_res.min_odometer, maint_res.min_maint_odo) if x is not None]
                all_max = [x for x in (fuel_res.max_odometer, maint_res.max_maint_odo) if x is not None]

                start_odo = Decimal(str(min(all_min))) if all_min else (v.current_odometer or Decimal("0"))
                end_odo = Decimal(str(max(all_max))) if all_max else (v.current_odometer or Decimal("0"))
                distance = max(Decimal("0"), end_odo - start_odo)
                op_hours = Decimal(str(round(float(distance) / 45.0 + wo_count * 2.5, 2)))

                existing_fact = session.scalar(
                    select(models.FleetUtilizationFact).where(
                        models.FleetUtilizationFact.company_id == v.company_id,
                        models.FleetUtilizationFact.period == target_period,
                        models.FleetUtilizationFact.vehicle_id == v.id,
                    )
                )

                if existing_fact:
                    existing_fact.license_plate = v.license_plate
                    existing_fact.vehicle_type = v.vehicle_type
                    existing_fact.start_odometer = start_odo
                    existing_fact.end_odometer = end_odo
                    existing_fact.distance_traveled_km = distance
                    existing_fact.fuel_liters = total_liters
                    existing_fact.fuel_cost = total_fuel_cost
                    existing_fact.maintenance_cost = total_maint_cost
                    existing_fact.work_order_count = wo_count
                    existing_fact.operational_hours = op_hours
                    existing_fact.last_extracted_at = now
                else:
                    new_fact = models.FleetUtilizationFact(
                        company_id=v.company_id,
                        period=target_period,
                        vehicle_id=v.id,
                        license_plate=v.license_plate,
                        vehicle_type=v.vehicle_type,
                        start_odometer=start_odo,
                        end_odometer=end_odo,
                        distance_traveled_km=distance,
                        fuel_liters=total_liters,
                        fuel_cost=total_fuel_cost,
                        maintenance_cost=total_maint_cost,
                        work_order_count=wo_count,
                        operational_hours=op_hours,
                        last_extracted_at=now,
                    )
                    session.add(new_fact)

                upserted_count += 1

            session.commit()
            return upserted_count

        if db is not None:
            return _execute(db)
        else:
            with self.session_factory() as sess:
                return _execute(sess)

    def run_etl_pipeline(
        self,
        company_id: uuid.UUID | None = None,
        period: str | None = None,
        db: Session | None = None,
    ) -> dict:
        """Runs both GL extraction and Fleet utilization extraction."""
        target_period = period or datetime.now(timezone.utc).strftime("%Y-%m")
        ledger_count = self.extract_ledger_summary(company_id=company_id, period=target_period, db=db)
        fleet_count = self.extract_fleet_utilization(company_id=company_id, period=target_period, db=db)
        return {
            "status": "completed",
            "message": f"ETL pipeline executed successfully for period {target_period}",
            "period": target_period,
            "company_id": str(company_id) if company_id else "all",
            "ledger_records_extracted": ledger_count,
            "fleet_records_extracted": fleet_count,
            "extracted_at": datetime.now(timezone.utc),
        }

    async def run_async_etl(
        self,
        company_id: uuid.UUID | None = None,
        period: str | None = None,
    ) -> dict:
        """Asynchronously executes the ETL replication pipeline in a separate thread."""
        return await asyncio.to_thread(self.run_etl_pipeline, company_id, period)


etl_worker = ETLWorker()
