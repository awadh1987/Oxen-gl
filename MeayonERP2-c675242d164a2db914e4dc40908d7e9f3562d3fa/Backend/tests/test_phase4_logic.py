import uuid
from datetime import datetime, timezone
from decimal import Decimal
import pytest
from pydantic import ValidationError
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from Backend.database import SessionLocal
from Backend.main import app, get_active_company_id, get_authenticated_user
from Backend.models import (
    AccountAccount,
    AccountJournal,
    AccountMove,
    CostCenter,
    FarmGateWeighment,
    FuelTransaction,
    GoodsReceipt,
    HarvestBatch,
    MaintenanceWorkOrder,
    PartRequirement,
    ProductProduct,
    PurchaseOrder,
    ResCompany,
    ResPartner,
    ResUser,
    SeasonalCropCycle,
    SupplierInvoice,
    Vehicle,
)
from Backend.schemas import FarmGateWeighmentCreate


@pytest.fixture(scope="module")
def db_session():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="module")
def p4_fixtures(db_session: Session):
    # Company
    company = db_session.scalar(select(ResCompany).where(ResCompany.slug == "phase4-test-corp"))
    if not company:
        company = ResCompany(
            name="Phase 4 Logistics Corp",
            slug="phase4-test-corp",
            currency="SAR",
            commercial_registration="1010888888",
            tax_id="300088888800003",
        )
        db_session.add(company)
        db_session.commit()
        db_session.refresh(company)

    # Admin user
    user = db_session.scalar(select(ResUser).where(ResUser.email == "p4admin@oxengl.com"))
    if not user:
        user = ResUser(
            firebase_uid="p4-admin-uid",
            email="p4admin@oxengl.com",
            full_name="Phase 4 Logistics Admin",
            company_id=company.id,
            role="Admin",
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

    # Accounts
    def get_or_create_acc(code: str, name: str, itype: str):
        acc = db_session.scalar(select(AccountAccount).where(AccountAccount.company_id == company.id, AccountAccount.code == code))
        if not acc:
            acc = AccountAccount(company_id=company.id, code=code, name=name, internal_type=itype, currency="SAR")
            db_session.add(acc)
            db_session.commit()
            db_session.refresh(acc)
        return acc

    cogs_acc = get_or_create_acc("501000", "Cost of Goods Sold - Materials", "expense")
    vat_acc = get_or_create_acc("203000", "VAT Payable", "liability")
    payable_acc = get_or_create_acc("201000", "Accounts Payable - Raw Materials", "liability")

    # Supplier Partner
    supplier = db_session.scalar(select(ResPartner).where(ResPartner.company_id == company.id, ResPartner.name == "Gulf Agrotech Supplier"))
    if not supplier:
        supplier = ResPartner(
            company_id=company.id,
            name="Gulf Agrotech Supplier",
            partner_type="supplier",
            email="sales@gulfagrotech.com",
            tax_number="300123456700003",
            is_active=True,
        )
        db_session.add(supplier)
        db_session.commit()
        db_session.refresh(supplier)

    # Cost center
    cc = db_session.scalar(select(CostCenter).where(CostCenter.company_id == company.id, CostCenter.code == "CC_LOGISTICS"))
    if not cc:
        cc = CostCenter(company_id=company.id, code="CC_LOGISTICS", name="Fleet & Logistics Unit", is_active=True)
        db_session.add(cc)
        db_session.commit()
        db_session.refresh(cc)

    # Product
    prod = db_session.scalar(select(ProductProduct).where(ProductProduct.company_id == company.id, ProductProduct.sku == "PART-BRK-001"))
    if not prod:
        prod = ProductProduct(
            company_id=company.id,
            name="AMG Heavy Duty Ceramic Brake Rotor",
            sku="PART-BRK-001",
            unit_of_measure="unit",
            standard_cost=Decimal("450.00"),
        )
        db_session.add(prod)
        db_session.commit()
        db_session.refresh(prod)

    return {
        "company": company,
        "user": user,
        "supplier": supplier,
        "cost_center": cc,
        "product": prod,
        "cogs_acc": cogs_acc,
        "vat_acc": vat_acc,
        "payable_acc": payable_acc,
    }


@pytest.fixture(scope="module")
def client(p4_fixtures):
    company = p4_fixtures["company"]
    user = p4_fixtures["user"]

    app.dependency_overrides[get_active_company_id] = lambda: company.id
    app.dependency_overrides[get_authenticated_user] = lambda: user

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


# ==============================================================================
# Task 1: Schema Validation Tests
# ==============================================================================

def test_farm_gate_weighment_schema_validation_success():
    payload = {
        "harvest_batch_id": str(uuid.uuid4()),
        "gross_weight": "15000.00",
        "tare_weight": "5000.00",
        "net_weight": "10000.00",
    }
    schema = FarmGateWeighmentCreate(**payload)
    assert schema.net_weight == Decimal("10000.00")
    assert schema.gross_weight - schema.tare_weight == schema.net_weight


def test_farm_gate_weighment_schema_validation_discrepancy_raises_error():
    payload = {
        "harvest_batch_id": str(uuid.uuid4()),
        "gross_weight": "15000.00",
        "tare_weight": "5000.00",
        "net_weight": "9999.00",  # Discrepancy!
    }
    with pytest.raises(ValidationError) as excinfo:
        FarmGateWeighmentCreate(**payload)
    assert "net_weight must exactly equal gross_weight - tare_weight" in str(excinfo.value)


# ==============================================================================
# Task 2: Fleet Management CRUD Tests
# ==============================================================================

def test_vehicle_crud(client: TestClient, p4_fixtures):
    fixtures = p4_fixtures
    plate = f"KSA-{uuid.uuid4().hex[:4].upper()}"
    res = client.post(
        "/api/fleet/vehicles",
        json={
            "name": "Mercedes ML 63 AMG",
            "license_plate": plate,
            "vin_chassis": f"WDC1641771A{uuid.uuid4().hex[:6].upper()}",
            "make": "Mercedes-Benz",
            "model": "ML 63 AMG",
            "model_year": 2010,
            "vehicle_type": "truck",
            "status": "active",
            "current_odometer": 125450.0,
            "fuel_capacity": 95.0,
            "cost_center_id": str(fixtures["cost_center"].id),
        },
    )
    assert res.status_code == 201, res.text
    vehicle = res.json()
    assert vehicle["license_plate"] == plate
    vehicle_id = vehicle["id"]

    # Read
    res = client.get(f"/api/fleet/vehicles/{vehicle_id}")
    assert res.status_code == 200
    assert res.json()["model"] == "ML 63 AMG"

    # Update
    res = client.put(f"/api/fleet/vehicles/{vehicle_id}", json={"current_odometer": 126000.0})
    assert res.status_code == 200
    assert float(res.json()["current_odometer"]) == 126000.0

    # Maintenance Work Order
    res_mwo = client.post(
        "/api/fleet/maintenance-orders",
        json={
            "vehicle_id": vehicle_id,
            "order_type": "preventive",
            "priority": "high",
            "status": "in_progress",
            "odometer_reading": 126000.0,
            "description": "Install high performance brake rotors and replace fluids",
            "total_parts_cost": 450.0,
            "total_labor_cost": 150.0,
            "total_cost": 600.0,
        },
    )
    assert res_mwo.status_code == 201, res_mwo.text
    mwo = res_mwo.json()
    assert mwo["vehicle_id"] == vehicle_id

    # Part Requirement
    res_part = client.post(
        "/api/fleet/part-requirements",
        json={
            "work_order_id": mwo["id"],
            "product_id": str(fixtures["product"].id),
            "quantity_required": 2.0,
            "unit_cost": 450.0,
            "total_cost": 900.0,
        },
    )
    assert res_part.status_code == 201, res_part.text
    assert float(res_part.json()["total_cost"]) == 900.0

    # Fuel Transaction
    res_fuel = client.post(
        "/api/fleet/fuel-transactions",
        json={
            "vehicle_id": vehicle_id,
            "liters": 85.5,
            "fuel_type": "gasoline_95",
            "unit_price": 2.33,
            "total_amount": 199.22,
            "odometer_reading": 126100.0,
        },
    )
    assert res_fuel.status_code == 201, res_fuel.text
    assert float(res_fuel.json()["liters"]) == 85.5


# ==============================================================================
# Task 2: Supply Chain & Weighment Validation Tests
# ==============================================================================

def test_supply_chain_and_weighment_flow(client: TestClient, p4_fixtures):
    fixtures = p4_fixtures
    cycle_code = f"SCC-2026-{uuid.uuid4().hex[:4].upper()}"

    # Create Crop Cycle
    res_cycle = client.post(
        "/api/supply-chain/crop-cycles",
        json={
            "code": cycle_code,
            "name": "Spring 2026 Alfalfa Harvest Cycle",
            "cycle_season": "spring",
            "start_date": "2026-02-01T00:00:00Z",
            "end_date": "2026-05-31T23:59:59Z",
            "target_yield_tons": 5000.0,
            "actual_yield_tons": 0.0,
            "status": "active",
        },
    )
    assert res_cycle.status_code == 201, res_cycle.text
    cycle = res_cycle.json()
    assert cycle["code"] == cycle_code

    # Create Harvest Batch
    res_batch = client.post(
        "/api/supply-chain/harvest-batches",
        json={
            "crop_cycle_id": cycle["id"],
            "quality_grade": "A",
            "status": "harvested",
            "gross_weight": 25000.0,
            "tare_weight": 5000.0,
            "net_weight": 20000.0,
        },
    )
    assert res_batch.status_code == 201, res_batch.text
    batch = res_batch.json()

    # Valid Farm Gate Weighment
    res_fgw_valid = client.post(
        "/api/supply-chain/farm-gate-weighments",
        json={
            "harvest_batch_id": batch["id"],
            "gross_weight": 18500.0,
            "tare_weight": 6200.0,
            "net_weight": 12300.0,  # 18500 - 6200 = 12300
            "field_location_name": "Wadi Al-Dawasir Sector 4",
        },
    )
    assert res_fgw_valid.status_code == 201, res_fgw_valid.text
    assert float(res_fgw_valid.json()["net_weight"]) == 12300.0

    # Invalid Farm Gate Weighment (Discrepancy) -> 422
    res_fgw_invalid = client.post(
        "/api/supply-chain/farm-gate-weighments",
        json={
            "harvest_batch_id": batch["id"],
            "gross_weight": 18500.0,
            "tare_weight": 6200.0,
            "net_weight": 12000.0,  # Incorrect!
        },
    )
    assert res_fgw_invalid.status_code == 422


# ==============================================================================
# Task 2: 3-Way Match Reconciliation Tests
# ==============================================================================

def test_three_way_match_exact_match_success(client: TestClient, p4_fixtures, db_session: Session):
    fixtures = p4_fixtures
    partner_id = str(fixtures["supplier"].id)

    # 1. Purchase Order
    po_res = client.post(
        "/api/procurement/purchase-orders",
        json={
            "partner_id": partner_id,
            "currency": "SAR",
            "subtotal": 10000.0,
            "tax_amount": 1500.0,
            "total_amount": 11500.0,
            "status": "confirmed",
        },
    )
    assert po_res.status_code == 201, po_res.text
    po = po_res.json()

    # 2. Goods Receipt
    gr_res = client.post(
        "/api/procurement/goods-receipts",
        json={
            "purchase_order_id": po["id"],
            "status": "accepted",
        },
    )
    assert gr_res.status_code == 201, gr_res.text
    gr = gr_res.json()

    # 3. Supplier Invoice matching PO exactly
    si_res = client.post(
        "/api/procurement/supplier-invoices",
        json={
            "partner_id": partner_id,
            "purchase_order_id": po["id"],
            "goods_receipt_id": gr["id"],
            "subtotal": 10000.0,
            "tax_amount": 1500.0,
            "total_amount": 11500.0,
            "status": "draft",
        },
    )
    assert si_res.status_code == 201, si_res.text
    si = si_res.json()

    # 4. Perform 3-Way Match Reconciliation
    rec_res = client.post(f"/api/procurement/reconcile-invoice/{si['id']}")
    assert rec_res.status_code == 200, rec_res.text
    reconciled = rec_res.json()

    # Assert status is Approved and linked AccountMove exists
    assert reconciled["status"] == "Approved"
    assert reconciled["move_id"] is not None

    # Verify posted AccountMove in GL
    move_id = reconciled["move_id"]
    move = db_session.scalar(select(AccountMove).where(AccountMove.id == move_id))
    assert move is not None
    assert move.state == "posted"
    assert len(move.lines) >= 2

    # Check that debits equal credits
    total_debit = sum(line.debit for line in move.lines)
    total_credit = sum(line.credit for line in move.lines)
    assert total_debit == total_credit
    assert total_debit == Decimal("11500.0000")


def test_three_way_match_price_variance_exception(client: TestClient, p4_fixtures, db_session: Session):
    fixtures = p4_fixtures
    partner_id = str(fixtures["supplier"].id)

    # 1. Purchase Order (10,000 + 1,500 = 11,500)
    po_res = client.post(
        "/api/procurement/purchase-orders",
        json={
            "partner_id": partner_id,
            "currency": "SAR",
            "subtotal": 10000.0,
            "tax_amount": 1500.0,
            "total_amount": 11500.0,
            "status": "confirmed",
        },
    )
    assert po_res.status_code == 201, po_res.text
    po = po_res.json()

    # 2. Goods Receipt
    gr_res = client.post(
        "/api/procurement/goods-receipts",
        json={
            "purchase_order_id": po["id"],
            "status": "accepted",
        },
    )
    assert gr_res.status_code == 201, gr_res.text
    gr = gr_res.json()

    # 3. Supplier Invoice with price variance (12,000 instead of 10,000)
    si_res = client.post(
        "/api/procurement/supplier-invoices",
        json={
            "partner_id": partner_id,
            "purchase_order_id": po["id"],
            "goods_receipt_id": gr["id"],
            "subtotal": 12000.0,
            "tax_amount": 1800.0,
            "total_amount": 13800.0,
            "status": "draft",
        },
    )
    assert si_res.status_code == 201, si_res.text
    si = si_res.json()

    # 4. Perform 3-Way Match Reconciliation
    rec_res = client.post(f"/api/procurement/reconcile-invoice/{si['id']}")
    assert rec_res.status_code == 200, rec_res.text
    reconciled = rec_res.json()

    # Assert status is Exception and NO AccountMove is posted
    assert reconciled["status"] == "Exception"
    assert reconciled["move_id"] is None


def test_three_way_match_missing_goods_receipt_exception(client: TestClient, p4_fixtures):
    fixtures = p4_fixtures
    partner_id = str(fixtures["supplier"].id)

    # PO with no Goods Receipt
    po_res = client.post(
        "/api/procurement/purchase-orders",
        json={
            "partner_id": partner_id,
            "currency": "SAR",
            "subtotal": 5000.0,
            "tax_amount": 750.0,
            "total_amount": 5750.0,
            "status": "confirmed",
        },
    )
    assert po_res.status_code == 201
    po = po_res.json()

    # Invoice created without GR
    si_res = client.post(
        "/api/procurement/supplier-invoices",
        json={
            "partner_id": partner_id,
            "purchase_order_id": po["id"],
            "subtotal": 5000.0,
            "tax_amount": 750.0,
            "total_amount": 5750.0,
            "status": "draft",
        },
    )
    assert si_res.status_code == 201
    si = si_res.json()

    # Reconcile -> Should flag Exception because no GR exists
    rec_res = client.post(f"/api/procurement/reconcile-invoice/{si['id']}")
    assert rec_res.status_code == 200
    reconciled = rec_res.json()
    assert reconciled["status"] == "Exception"
    assert reconciled["move_id"] is None
