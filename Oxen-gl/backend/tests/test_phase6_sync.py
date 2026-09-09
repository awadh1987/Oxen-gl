import json
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
    DeviceRegistration,
    FarmGateWeighment,
    HarvestBatch,
    MaintenanceWorkOrder,
    ResCompany,
    ResUser,
    SeasonalCropCycle,
    SyncQueueEvent,
    Vehicle,
)


@pytest.fixture(scope="module")
def db_session():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="module")
def p6_fixtures(db_session: Session):
    # Company
    company = db_session.scalar(select(ResCompany).where(ResCompany.slug == "phase6-mobile-corp"))
    if not company:
        company = ResCompany(
            name="Phase 6 Mobile Logistics Corp",
            slug="phase6-mobile-corp",
            currency="SAR",
            commercial_registration="1010666666",
            tax_id="300066666600003",
        )
        db_session.add(company)
        db_session.commit()
        db_session.refresh(company)

    # Driver / Field Operator
    driver = db_session.scalar(select(ResUser).where(ResUser.email == "field_operator@oxengl.com"))
    if not driver:
        driver = ResUser(
            firebase_uid="p6-driver-uid",
            email="field_operator@oxengl.com",
            full_name="Rashid Field Driver",
            company_id=company.id,
            role="Admin",
            is_active=True,
        )
        db_session.add(driver)
        db_session.commit()
        db_session.refresh(driver)

    # Vehicle
    vehicle = db_session.scalar(select(Vehicle).where(Vehicle.company_id == company.id, Vehicle.license_plate == "1010-XYZ"))
    if not vehicle:
        vehicle = Vehicle(
            company_id=company.id,
            name="Mercedes-Benz Actros 3340 Heavy Dump",
            license_plate="1010-XYZ",
            make="Mercedes-Benz",
            model="Actros 3340",
            model_year=2024,
            vehicle_type="truck",
            current_odometer=Decimal("12500.00"),
            is_active=True,
        )
        db_session.add(vehicle)
        db_session.commit()
        db_session.refresh(vehicle)

    # Crop Cycle & Harvest Batch
    crop_cycle = db_session.scalar(select(SeasonalCropCycle).where(SeasonalCropCycle.company_id == company.id, SeasonalCropCycle.code == "CYCLE-P6-DATES"))
    if not crop_cycle:
        crop_cycle = SeasonalCropCycle(
            company_id=company.id,
            code="CYCLE-P6-DATES",
            name="Ajwa Dates Season 2026",
            cycle_season="full_year",
            start_date=datetime(2026, 2, 1, tzinfo=timezone.utc),
            end_date=datetime(2026, 11, 30, tzinfo=timezone.utc),
            status="active",
        )
        db_session.add(crop_cycle)
        db_session.commit()
        db_session.refresh(crop_cycle)

    batch = db_session.scalar(select(HarvestBatch).where(HarvestBatch.company_id == company.id, HarvestBatch.batch_number == "BATCH-P6-DATES-01"))
    if not batch:
        batch = HarvestBatch(
            company_id=company.id,
            batch_number="BATCH-P6-DATES-01",
            crop_cycle_id=crop_cycle.id,
            status="harvested",
            gross_weight=Decimal("25000.00"),
            tare_weight=Decimal("5000.00"),
            net_weight=Decimal("20000.00"),
        )
        db_session.add(batch)
        db_session.commit()
        db_session.refresh(batch)

    return {
        "company": company,
        "driver": driver,
        "vehicle": vehicle,
        "crop_cycle": crop_cycle,
        "batch": batch,
    }


# ==============================================================================
# Test 1: Device Registration & Revocation
# ==============================================================================

def test_device_registration_and_revocation(p6_fixtures, db_session: Session):
    company = p6_fixtures["company"]
    driver = p6_fixtures["driver"]

    app.dependency_overrides[get_active_company_id] = lambda: company.id
    app.dependency_overrides[get_authenticated_user] = lambda: driver

    token = f"fcm_token_test_{uuid.uuid4().hex[:12]}"
    with TestClient(app) as client:
        # Register device
        reg_res = client.post(
            "/api/mobile/register",
            json={
                "device_token": token,
                "device_model": "Samsung Galaxy Tab Active4 Pro Rugged",
                "os_version": "Android 14 / One UI 6.0",
                "app_version": "v2.6.4-field",
            },
        )
        assert reg_res.status_code == 200
        reg_data = reg_res.json()
        assert reg_data["device_token"] == token
        assert reg_data["is_revoked"] is False
        assert reg_data["device_model"] == "Samsung Galaxy Tab Active4 Pro Rugged"

        # Revoke device
        rev_res = client.post(
            "/api/mobile/revoke",
            json={
                "device_token": token,
                "revocation_reason": "Device lost in Rub al-Khali transit convoy",
            },
        )
        assert rev_res.status_code == 200
        rev_data = rev_res.json()
        assert rev_data["is_revoked"] is True
        assert rev_data["revocation_reason"] == "Device lost in Rub al-Khali transit convoy"

        # Sync attempt with revoked device must fail with 403
        sync_res = client.post(
            "/api/mobile/sync",
            json={
                "device_token": token,
                "events": [],
            },
        )
        assert sync_res.status_code == 403
        assert "revoked" in sync_res.json()["detail"]

    app.dependency_overrides.clear()


# ==============================================================================
# Test 2: Idempotent Sync Processing (Deduplication)
# ==============================================================================

def test_idempotent_sync_processing(p6_fixtures, db_session: Session):
    company = p6_fixtures["company"]
    driver = p6_fixtures["driver"]
    batch = p6_fixtures["batch"]

    app.dependency_overrides[get_active_company_id] = lambda: company.id
    app.dependency_overrides[get_authenticated_user] = lambda: driver

    token = f"fcm_token_idempotent_{uuid.uuid4().hex[:12]}"
    op_id = f"op-weighment-idemp-{uuid.uuid4().hex[:8]}"
    ticket_num = f"FGW-IDEMP-{uuid.uuid4().hex[:6].upper()}"

    batch_payload = {
        "device_token": token,
        "events": [
            {
                "operation_id": op_id,
                "entity_type": "farm_gate_weighment",
                "action": "create",
                "client_timestamp": "2026-09-06T06:00:00Z",
                "payload": {
                    "ticket_number": ticket_num,
                    "harvest_batch_id": str(batch.id),
                    "gross_weight": "18000.00",
                    "tare_weight": "6000.00",
                    "net_weight": "12000.00",
                    "field_location_name": "Al-Kharj North Grove 1",
                    "notes": "Offline scale intake",
                },
            }
        ],
    }

    with TestClient(app) as client:
        # First submission: Must be applied
        res1 = client.post("/api/mobile/sync", json=batch_payload)
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["processed_count"] == 1
        assert data1["applied_count"] == 1
        assert data1["duplicate_count"] == 0
        assert data1["results"][0]["status"] == "APPLIED"

        # Second submission: Duplicate op_id must be skipped idempotently
        res2 = client.post("/api/mobile/sync", json=batch_payload)
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["processed_count"] == 1
        assert data2["applied_count"] == 0
        assert data2["duplicate_count"] == 1
        assert data2["results"][0]["status"] == "SKIPPED_DUPLICATE"

    # Verify database has exactly 1 weighment ticket
    records = db_session.scalars(
        select(FarmGateWeighment).where(
            FarmGateWeighment.company_id == company.id,
            FarmGateWeighment.ticket_number == ticket_num,
        )
    ).all()
    assert len(records) == 1

    app.dependency_overrides.clear()


# ==============================================================================
# Test 3: Server-Authoritative Conflict Resolution (Farm Gate Weighment)
# ==============================================================================

def test_server_authoritative_conflict_farm_gate(p6_fixtures, db_session: Session):
    company = p6_fixtures["company"]
    driver = p6_fixtures["driver"]
    batch = p6_fixtures["batch"]

    # Create a weighment ticket that is already APPROVED and LOCKED on server
    ticket_num = f"FGW-LOCKED-{uuid.uuid4().hex[:6].upper()}"
    locked_weighment = FarmGateWeighment(
        company_id=company.id,
        ticket_number=ticket_num,
        harvest_batch_id=batch.id,
        gross_weight=Decimal("20000.00"),
        tare_weight=Decimal("7000.00"),
        net_weight=Decimal("13000.00"),
        status="approved",
        field_location_name="Riyadh Central Weighbridge",
        notes="Locked and approved by QA Officer",
    )
    db_session.add(locked_weighment)
    db_session.commit()
    db_session.refresh(locked_weighment)

    app.dependency_overrides[get_active_company_id] = lambda: company.id
    app.dependency_overrides[get_authenticated_user] = lambda: driver

    token = f"fcm_token_conflict_{uuid.uuid4().hex[:12]}"
    op_id = f"op-weighment-conflict-{uuid.uuid4().hex[:8]}"

    # Mobile device tries to update the approved weighment ticket
    sync_payload = {
        "device_token": token,
        "events": [
            {
                "operation_id": op_id,
                "entity_type": "farm_gate_weighment",
                "action": "update",
                "payload": {
                    "id": str(locked_weighment.id),
                    "ticket_number": ticket_num,
                    "gross_weight": "25000.00",
                    "tare_weight": "7000.00",
                    "net_weight": "18000.00",
                    "notes": "Hacked or stale client override",
                },
            }
        ],
    }

    with TestClient(app) as client:
        res = client.post("/api/mobile/sync", json=sync_payload)
        assert res.status_code == 200
        data = res.json()
        assert data["conflict_count"] == 1
        assert data["applied_count"] == 0
        item = data["results"][0]
        assert item["status"] == "REJECTED_CONFLICT"
        assert item["is_conflict"] is True
        assert "locked or approved" in item["conflict_reason"]

    # Verify server record was NOT modified
    db_session.refresh(locked_weighment)
    assert locked_weighment.gross_weight == Decimal("20000.00")
    assert locked_weighment.net_weight == Decimal("13000.00")
    assert locked_weighment.status == "approved"

    app.dependency_overrides.clear()


# ==============================================================================
# Test 4: Server-Authoritative Conflict Resolution (Maintenance Work Order)
# ==============================================================================

def test_server_authoritative_conflict_work_order(p6_fixtures, db_session: Session):
    company = p6_fixtures["company"]
    driver = p6_fixtures["driver"]
    vehicle = p6_fixtures["vehicle"]

    # Create a work order that is already completed on server
    wo_num = f"MWO-DONE-{uuid.uuid4().hex[:6].upper()}"
    completed_wo = MaintenanceWorkOrder(
        company_id=company.id,
        order_number=wo_num,
        vehicle_id=vehicle.id,
        order_type="routine",
        priority="medium",
        status="completed",
        description="Completed by certified workshop master",
    )
    db_session.add(completed_wo)
    db_session.commit()
    db_session.refresh(completed_wo)

    app.dependency_overrides[get_active_company_id] = lambda: company.id
    app.dependency_overrides[get_authenticated_user] = lambda: driver

    token = f"fcm_token_maint_{uuid.uuid4().hex[:12]}"
    op_id = f"op-wo-conflict-{uuid.uuid4().hex[:8]}"

    # Mobile device tries to update the completed work order
    sync_payload = {
        "device_token": token,
        "events": [
            {
                "operation_id": op_id,
                "entity_type": "maintenance_work_order",
                "action": "update",
                "payload": {
                    "id": str(completed_wo.id),
                    "order_number": wo_num,
                    "description": "Tampered description from mobile",
                    "status": "draft",
                },
            }
        ],
    }

    with TestClient(app) as client:
        res = client.post("/api/mobile/sync", json=sync_payload)
        assert res.status_code == 200
        data = res.json()
        assert data["conflict_count"] == 1
        assert data["applied_count"] == 0
        item = data["results"][0]
        assert item["status"] == "REJECTED_CONFLICT"
        assert item["is_conflict"] is True
        assert "completed" in item["conflict_reason"]

    # Verify server record was NOT modified
    db_session.refresh(completed_wo)
    assert completed_wo.status == "completed"
    assert completed_wo.description == "Completed by certified workshop master"

    app.dependency_overrides.clear()


# ==============================================================================
# Test 5: Successful Batch Offline Sync (Weighment & Rugged Work Order)
# ==============================================================================

def test_successful_batch_offline_sync(p6_fixtures, db_session: Session):
    company = p6_fixtures["company"]
    driver = p6_fixtures["driver"]
    vehicle = p6_fixtures["vehicle"]
    batch = p6_fixtures["batch"]

    app.dependency_overrides[get_active_company_id] = lambda: company.id
    app.dependency_overrides[get_authenticated_user] = lambda: driver

    token = f"fcm_token_batch_{uuid.uuid4().hex[:12]}"
    op_weigh = f"op-batch-weigh-{uuid.uuid4().hex[:8]}"
    op_maint = f"op-batch-maint-{uuid.uuid4().hex[:8]}"

    ticket_num = f"FGW-REMOTE-{uuid.uuid4().hex[:6].upper()}"
    wo_num = f"MWO-RUGGED-{uuid.uuid4().hex[:6].upper()}"

    batch_payload = {
        "device_token": token,
        "events": [
            {
                "operation_id": op_weigh,
                "entity_type": "farm_gate_weighment",
                "action": "create",
                "payload": {
                    "ticket_number": ticket_num,
                    "harvest_batch_id": str(batch.id),
                    "vehicle_id": str(vehicle.id),
                    "gross_weight": "22000.00",
                    "tare_weight": "7000.00",
                    "net_weight": "15000.00",
                    "field_location_name": "Al-Jawf Olive Orchard North",
                    "notes": "Direct intake scale reading",
                },
            },
            {
                "operation_id": op_maint,
                "entity_type": "maintenance_work_order",
                "action": "create",
                "payload": {
                    "order_number": wo_num,
                    "vehicle_id": str(vehicle.id),
                    "order_type": "emergency",
                    "priority": "urgent",
                    "description": "Repaired cracked tie rod in desert transit sector",
                },
            },
        ],
    }

    with TestClient(app) as client:
        res = client.post("/api/mobile/sync", json=batch_payload)
        assert res.status_code == 200
        data = res.json()
        assert data["processed_count"] == 2
        assert data["applied_count"] == 2
        assert data["conflict_count"] == 0
        assert data["duplicate_count"] == 0
        assert data["failed_count"] == 0

    # Verify both records created in DB
    created_weighment = db_session.scalar(
        select(FarmGateWeighment).where(
            FarmGateWeighment.company_id == company.id,
            FarmGateWeighment.ticket_number == ticket_num,
        )
    )
    assert created_weighment is not None
    assert created_weighment.net_weight == Decimal("15000.00")

    created_wo = db_session.scalar(
        select(MaintenanceWorkOrder).where(
            MaintenanceWorkOrder.company_id == company.id,
            MaintenanceWorkOrder.order_number == wo_num,
        )
    )
    assert created_wo is not None
    assert created_wo.description == "Repaired cracked tie rod in desert transit sector"
    assert created_wo.priority == "urgent"

    app.dependency_overrides.clear()
