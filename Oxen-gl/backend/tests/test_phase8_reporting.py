import uuid
from datetime import datetime, timezone
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.main import app, get_active_company_id, get_authenticated_user
from backend.models import (
    AccountAccount,
    AccountJournal,
    AccountMove,
    AccountMoveLine,
    FleetUtilizationFact,
    FuelTransaction,
    MaintenanceWorkOrder,
    ReportingLedgerSummary,
    ResCompany,
    ResUser,
    Vehicle,
)
from backend.workers import etl_worker


@pytest.fixture(scope="module")
def db_session():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="module")
def reporting_test_fixtures(db_session: Session):
    # 1. Tenant Company Alpha
    company_a = db_session.scalar(select(ResCompany).where(ResCompany.slug == "p8-bi-corp-alpha"))
    if not company_a:
        company_a = ResCompany(
            name="BI Analytics Corp Alpha",
            slug="p8-bi-corp-alpha",
            currency="SAR",
            commercial_registration="1010555001",
            tax_id="300055500100003",
            subscription_tier="ENTERPRISE",
        )
        db_session.add(company_a)
        db_session.commit()
        db_session.refresh(company_a)

    # 2. Tenant Admin Alpha
    admin_a = db_session.scalar(select(ResUser).where(ResUser.email == "admin@bi-corp-alpha.com"))
    if not admin_a:
        admin_a = ResUser(
            firebase_uid="uid-bi-admin-alpha",
            email="admin@bi-corp-alpha.com",
            full_name="Alpha BI Admin",
            company_id=company_a.id,
            role="Admin",
            is_active=True,
        )
        db_session.add(admin_a)
        db_session.commit()
        db_session.refresh(admin_a)

    # 3. Tenant Regular User Alpha (without ETL trigger permissions)
    user_a = db_session.scalar(select(ResUser).where(ResUser.email == "staff@bi-corp-alpha.com"))
    if not user_a:
        user_a = ResUser(
            firebase_uid="uid-bi-staff-alpha",
            email="staff@bi-corp-alpha.com",
            full_name="Alpha BI Staff",
            company_id=company_a.id,
            role="Data_Entry",
            is_active=True,
        )
        db_session.add(user_a)
        db_session.commit()
        db_session.refresh(user_a)

    # 4. Tenant Company Beta (Isolation target)
    company_b = db_session.scalar(select(ResCompany).where(ResCompany.slug == "p8-bi-corp-beta"))
    if not company_b:
        company_b = ResCompany(
            name="BI Analytics Corp Beta",
            slug="p8-bi-corp-beta",
            currency="SAR",
            commercial_registration="1010555002",
            tax_id="300055500200003",
            subscription_tier="ENTERPRISE",
        )
        db_session.add(company_b)
        db_session.commit()
        db_session.refresh(company_b)

    # 5. Accounts for Alpha
    acc_rev_a = db_session.scalar(
        select(AccountAccount).where(
            AccountAccount.company_id == company_a.id,
            AccountAccount.code == "400100"
        )
    )
    if not acc_rev_a:
        acc_rev_a = AccountAccount(
            company_id=company_a.id,
            code="400100",
            name="Freight Revenue Alpha",
            internal_type="revenue",
            currency="SAR",
        )
        db_session.add(acc_rev_a)

    acc_recv_a = db_session.scalar(
        select(AccountAccount).where(
            AccountAccount.company_id == company_a.id,
            AccountAccount.code == "101200"
        )
    )
    if not acc_recv_a:
        acc_recv_a = AccountAccount(
            company_id=company_a.id,
            code="101200",
            name="Accounts Receivable Alpha",
            internal_type="asset",
            currency="SAR",
        )
        db_session.add(acc_recv_a)

    # 6. Journal for Alpha
    journal_a = db_session.scalar(
        select(AccountJournal).where(
            AccountJournal.company_id == company_a.id,
            AccountJournal.code == "GEN"
        )
    )
    if not journal_a:
        journal_a = AccountJournal(
            company_id=company_a.id,
            code="GEN",
            name="General Journal Alpha",
            journal_type="general",
            sequence_prefix="GEN-A",
        )
        db_session.add(journal_a)

    # 7. Vehicle for Alpha
    veh_a = db_session.scalar(
        select(Vehicle).where(
            Vehicle.company_id == company_a.id,
            Vehicle.license_plate == "BI-TRK-01"
        )
    )
    if not veh_a:
        veh_a = Vehicle(
            company_id=company_a.id,
            name="Mercedes Truck Alpha 01",
            license_plate="BI-TRK-01",
            model="Mercedes Actros",
            vehicle_type="truck",
            current_odometer=Decimal("15000.00"),
            is_active=True,
        )
        db_session.add(veh_a)

    db_session.commit()
    db_session.refresh(company_a)
    db_session.refresh(admin_a)
    db_session.refresh(user_a)
    db_session.refresh(company_b)
    db_session.refresh(acc_rev_a)
    db_session.refresh(acc_recv_a)
    db_session.refresh(veh_a)

    return {
        "company_a": company_a,
        "admin_a": admin_a,
        "user_a": user_a,
        "company_b": company_b,
        "acc_rev_a": acc_rev_a,
        "acc_recv_a": acc_recv_a,
        "journal_a": journal_a,
        "veh_a": veh_a,
    }


def test_etl_ledger_summary_extraction(db_session: Session, reporting_test_fixtures: dict):
    company_a = reporting_test_fixtures["company_a"]
    acc_rev_a = reporting_test_fixtures["acc_rev_a"]
    acc_recv_a = reporting_test_fixtures["acc_recv_a"]
    journal_a = reporting_test_fixtures["journal_a"]

    period = "2026-09"
    fixed_date = datetime(2026, 9, 5, 10, 0, 0, tzinfo=timezone.utc)

    # Create posted account move with balanced lines
    move_name = f"MOV-BI-TEST-{uuid.uuid4().hex[:6].upper()}"
    move = AccountMove(
        company_id=company_a.id,
        journal_id=journal_a.id,
        name=move_name,
        move_type="entry",
        date=fixed_date,
        state="posted",
        ref="BI Reporting Test Move",
    )
    db_session.add(move)
    db_session.flush()

    line_debit = AccountMoveLine(
        company_id=company_a.id,
        move_id=move.id,
        account_id=acc_recv_a.id,
        name="Receivable Debit",
        debit=Decimal("1500.0000"),
        credit=Decimal("0.0000"),
    )
    line_credit = AccountMoveLine(
        company_id=company_a.id,
        move_id=move.id,
        account_id=acc_rev_a.id,
        name="Revenue Credit",
        debit=Decimal("0.0000"),
        credit=Decimal("1500.0000"),
    )
    db_session.add_all([line_debit, line_credit])
    db_session.commit()

    # Run GL ETL extraction
    extracted = etl_worker.extract_ledger_summary(
        company_id=company_a.id,
        period=period,
        db=db_session,
    )
    assert extracted >= 2

    # Query ReportingLedgerSummary for revenue account
    rev_summary = db_session.scalar(
        select(ReportingLedgerSummary).where(
            ReportingLedgerSummary.company_id == company_a.id,
            ReportingLedgerSummary.period == period,
            ReportingLedgerSummary.account_id == acc_rev_a.id,
        )
    )
    assert rev_summary is not None
    assert rev_summary.total_credit >= Decimal("1500.0000")
    assert rev_summary.total_debit == Decimal("0.0000")
    assert rev_summary.balance <= Decimal("-1500.0000")
    assert rev_summary.fiscal_year == 2026
    assert rev_summary.fiscal_month == 9


def test_etl_ledger_summary_idempotent_upsert(db_session: Session, reporting_test_fixtures: dict):
    company_a = reporting_test_fixtures["company_a"]
    acc_rev_a = reporting_test_fixtures["acc_rev_a"]
    period = "2026-09"

    # Count summaries before re-run
    count_before = db_session.scalar(
        select(ReportingLedgerSummary).where(
            ReportingLedgerSummary.company_id == company_a.id,
            ReportingLedgerSummary.period == period,
            ReportingLedgerSummary.account_id == acc_rev_a.id,
        )
    )
    assert count_before is not None
    orig_credit = count_before.total_credit

    # Run extraction second time without changes
    re_extracted = etl_worker.extract_ledger_summary(
        company_id=company_a.id,
        period=period,
        db=db_session,
    )
    assert re_extracted >= 2

    # Verify no duplicate rows exist
    summaries = db_session.scalars(
        select(ReportingLedgerSummary).where(
            ReportingLedgerSummary.company_id == company_a.id,
            ReportingLedgerSummary.period == period,
            ReportingLedgerSummary.account_id == acc_rev_a.id,
        )
    ).all()
    assert len(summaries) == 1
    assert summaries[0].total_credit == orig_credit


def test_etl_fleet_utilization_extraction(db_session: Session, reporting_test_fixtures: dict):
    company_a = reporting_test_fixtures["company_a"]
    veh_a = reporting_test_fixtures["veh_a"]
    period = "2026-09"

    # Add FuelTransaction for veh_a in 2026-09
    fuel_txn = FuelTransaction(
        company_id=company_a.id,
        transaction_number=f"FT-BI-{uuid.uuid4().hex[:6].upper()}",
        vehicle_id=veh_a.id,
        transaction_date=datetime(2026, 9, 2, 8, 30, tzinfo=timezone.utc),
        liters=Decimal("200.00"),
        unit_price=Decimal("2.5000"),
        total_amount=Decimal("500.0000"),
        odometer_reading=Decimal("15200.00"),
    )
    db_session.add(fuel_txn)

    # Add MaintenanceWorkOrder for veh_a in 2026-09
    maint_wo = MaintenanceWorkOrder(
        company_id=company_a.id,
        order_number=f"WO-BI-{uuid.uuid4().hex[:6].upper()}",
        vehicle_id=veh_a.id,
        order_type="routine",
        priority="medium",
        status="completed",
        odometer_reading=Decimal("15600.00"),
        description="Routine oil change and brake inspection",
        total_parts_cost=Decimal("300.0000"),
        total_labor_cost=Decimal("200.0000"),
        total_cost=Decimal("500.0000"),
        scheduled_date=datetime(2026, 9, 4, tzinfo=timezone.utc),
        completed_date=datetime(2026, 9, 4, 14, 0, tzinfo=timezone.utc),
    )
    db_session.add(maint_wo)
    db_session.commit()

    # Run Fleet Utilization ETL
    extracted_fleet = etl_worker.extract_fleet_utilization(
        company_id=company_a.id,
        period=period,
        db=db_session,
    )
    assert extracted_fleet >= 1

    # Verify fact record
    fact = db_session.scalar(
        select(FleetUtilizationFact).where(
            FleetUtilizationFact.company_id == company_a.id,
            FleetUtilizationFact.period == period,
            FleetUtilizationFact.vehicle_id == veh_a.id,
        )
    )
    assert fact is not None
    assert fact.fuel_liters >= Decimal("200.00")
    assert fact.fuel_cost >= Decimal("500.0000")
    assert fact.maintenance_cost >= Decimal("500.0000")
    assert fact.work_order_count >= 1
    # distance = max(15600, 15200) - min(15600, 15200) = 400
    assert fact.distance_traveled_km >= Decimal("400.00")


def test_tenant_isolation_in_reporting(db_session: Session, reporting_test_fixtures: dict):
    company_a = reporting_test_fixtures["company_a"]
    company_b = reporting_test_fixtures["company_b"]
    period = "2026-09"

    # Prior to Company B extraction, Company B has 0 ledger summaries and 0 fleet facts
    b_summaries = db_session.scalars(
        select(ReportingLedgerSummary).where(
            ReportingLedgerSummary.company_id == company_b.id,
            ReportingLedgerSummary.period == period,
        )
    ).all()
    assert len(b_summaries) == 0

    b_facts = db_session.scalars(
        select(FleetUtilizationFact).where(
            FleetUtilizationFact.company_id == company_b.id,
            FleetUtilizationFact.period == period,
        )
    ).all()
    assert len(b_facts) == 0


def test_api_analytics_etl_trigger_and_queries(reporting_test_fixtures: dict):
    company_a = reporting_test_fixtures["company_a"]
    admin_a = reporting_test_fixtures["admin_a"]
    user_a = reporting_test_fixtures["user_a"]
    period = "2026-09"

    client = TestClient(app)

    # 1. Test ETL Trigger as Admin
    app.dependency_overrides[get_authenticated_user] = lambda: admin_a
    app.dependency_overrides[get_active_company_id] = lambda: company_a.id

    try:
        response = client.post(
            "/api/analytics/etl/trigger",
            headers={"X-Company-ID": str(company_a.id)},
            json={"period": period, "sync_all_tenants": False},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["period"] == period
        assert data["ledger_records_extracted"] >= 1
        assert data["fleet_records_extracted"] >= 1

        # 2. Test Ledger Summary query endpoint
        res_ledger = client.get(
            f"/api/analytics/ledger-summary?period={period}",
            headers={"X-Company-ID": str(company_a.id)},
        )
        assert res_ledger.status_code == 200
        ledger_data = res_ledger.json()
        assert isinstance(ledger_data, list)
        assert len(ledger_data) >= 1
        assert all(row["company_id"] == str(company_a.id) for row in ledger_data)

        # 3. Test Fleet Utilization query endpoint
        res_fleet = client.get(
            f"/api/analytics/fleet-utilization?period={period}",
            headers={"X-Company-ID": str(company_a.id)},
        )
        assert res_fleet.status_code == 200
        fleet_data = res_fleet.json()
        assert isinstance(fleet_data, list)
        assert len(fleet_data) >= 1
        assert all(row["company_id"] == str(company_a.id) for row in fleet_data)

        # 4. Test unauthorized user role cannot trigger ETL
        app.dependency_overrides[get_authenticated_user] = lambda: user_a
        forbidden_res = client.post(
            "/api/analytics/etl/trigger",
            headers={"X-Company-ID": str(company_a.id)},
            json={"period": period, "sync_all_tenants": False},
        )
        assert forbidden_res.status_code == 403

    finally:
        app.dependency_overrides.clear()
