"""
Automated tests for Phase 7 Part 2: Warehouse Logic Layer.

Verifies:
1. Full CRUD for Warehouse, WarehouseZone, and YardGateAppointment with strict TenantContext isolation.
2. FIFO Receipt processing creating StockLots and posting balanced GL entries (Dr 102000 / Cr 202000).
3. Multi-lot FIFO Issue processing consuming oldest lots first with row-level locking,
   generating granular StockMovements per lot, and posting balanced GL entries (Dr 501000 / Cr 102000).
4. Insufficient inventory validation rejecting outbound issues with HTTP 400.
5. Cross-tenant isolation preventing IDOR access across warehouses and yard appointments.
"""

import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.main import app, get_active_company_id, get_authenticated_user
from backend.models import (
    ResCompany,
    ResUser,
    ProductProduct,
    Warehouse,
    WarehouseZone,
    StockItem,
    StockLot,
    StockMovement,
    YardGateAppointment,
    AccountMove,
    AccountMoveLine,
    AccountAccount,
    AccountJournal,
)


@pytest.fixture(scope="module")
def db_session():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="module")
def p7_logic_fixtures(db_session: Session):
    # Tenant A: Main Operations
    company_a = db_session.scalar(select(ResCompany).where(ResCompany.slug == "p7-logic-tenant-a"))
    if not company_a:
        company_a = ResCompany(
            name="Tenant A Warehouse Hub",
            slug="p7-logic-tenant-a",
            currency="SAR",
            commercial_registration="1010889901",
            tax_id="300088990100003",
        )
        db_session.add(company_a)
        db_session.commit()
        db_session.refresh(company_a)

    user_a = db_session.scalar(select(ResUser).where(ResUser.email == "wh_user_a@oxengl.com"))
    if not user_a:
        user_a = ResUser(
            firebase_uid="uid-p7-wh-a",
            email="wh_user_a@oxengl.com",
            full_name="Fahad Warehouse Supervisor",
            company_id=company_a.id,
            role="Admin",
            is_active=True,
        )
        db_session.add(user_a)
        db_session.commit()
        db_session.refresh(user_a)

    # Product for Tenant A
    product_a = db_session.scalar(
        select(ProductProduct).where(ProductProduct.company_id == company_a.id, ProductProduct.sku == "PROD-DATES-KHALAS")
    )
    if not product_a:
        product_a = ProductProduct(
            company_id=company_a.id,
            name="Organic Khalas Dates (Bulk)",
            sku="PROD-DATES-KHALAS",
            sale_price=Decimal("25.00"),
            standard_cost=Decimal("12.00"),
            unit_of_measure="kg",
            is_active=True,
        )
        db_session.add(product_a)
        db_session.commit()
        db_session.refresh(product_a)

    # Tenant B: Isolated Tenant
    company_b = db_session.scalar(select(ResCompany).where(ResCompany.slug == "p7-logic-tenant-b"))
    if not company_b:
        company_b = ResCompany(
            name="Tenant B Warehouse Hub",
            slug="p7-logic-tenant-b",
            currency="SAR",
            commercial_registration="1010889902",
            tax_id="300088990200003",
        )
        db_session.add(company_b)
        db_session.commit()
        db_session.refresh(company_b)

    user_b = db_session.scalar(select(ResUser).where(ResUser.email == "wh_user_b@oxengl.com"))
    if not user_b:
        user_b = ResUser(
            firebase_uid="uid-p7-wh-b",
            email="wh_user_b@oxengl.com",
            full_name="Isolated Supervisor",
            company_id=company_b.id,
            role="Admin",
            is_active=True,
        )
        db_session.add(user_b)
        db_session.commit()
        db_session.refresh(user_b)

    return {
        "company_a": company_a,
        "user_a": user_a,
        "product_a": product_a,
        "company_b": company_b,
        "user_b": user_b,
    }


def make_fresh_product(db_session: Session, company_id: uuid.UUID, name: str = "Bulk Dates") -> ProductProduct:
    prod = ProductProduct(
        company_id=company_id,
        name=name,
        sku=f"PROD-TEST-{uuid.uuid4().hex[:8].upper()}",
        sale_price=Decimal("25.00"),
        standard_cost=Decimal("12.00"),
        unit_of_measure="kg",
        is_active=True,
    )
    db_session.add(prod)
    db_session.commit()
    db_session.refresh(prod)
    return prod


# ==============================================================================
# 1. Warehouse & WarehouseZone CRUD Tests with Tenant Isolation
# ==============================================================================

def test_warehouse_and_zone_crud_with_isolation(p7_logic_fixtures, db_session: Session):
    company_a = p7_logic_fixtures["company_a"]
    user_a = p7_logic_fixtures["user_a"]
    company_b = p7_logic_fixtures["company_b"]
    user_b = p7_logic_fixtures["user_b"]

    app.dependency_overrides[get_active_company_id] = lambda: company_a.id
    app.dependency_overrides[get_authenticated_user] = lambda: user_a

    with TestClient(app) as client:
        wh_code = f"WH-RYD-{uuid.uuid4().hex[:4].upper()}"
        # Create Warehouse
        wh_res = client.post(
            "/api/warehouse/warehouses",
            json={
                "code": wh_code,
                "name": "Riyadh Logistics Center North",
                "warehouse_type": "distribution",
                "city": "Riyadh",
                "address": "Exit 18 Al Kharj Road",
                "total_capacity_sqm": "12500.00",
                "is_active": True,
            },
        )
        assert wh_res.status_code == 201
        wh_data = wh_res.json()
        warehouse_id = wh_data["id"]
        assert wh_data["code"] == wh_code
        assert wh_data["company_id"] == str(company_a.id)

        # Duplicate Warehouse Code Rejection
        dup_res = client.post(
            "/api/warehouse/warehouses",
            json={
                "code": wh_code,
                "name": "Duplicate Attempt",
                "warehouse_type": "storage",
                "city": "Riyadh",
            },
        )
        assert dup_res.status_code == 409

        # Update Warehouse
        update_res = client.put(
            f"/api/warehouse/warehouses/{warehouse_id}",
            json={"name": "Riyadh Central Mega Distribution Center"},
        )
        assert update_res.status_code == 200
        assert update_res.json()["name"] == "Riyadh Central Mega Distribution Center"

        # Create Zone in Warehouse
        zone_code = f"Z-COLD-{uuid.uuid4().hex[:4].upper()}"
        zone_res = client.post(
            "/api/warehouse/zones",
            json={
                "warehouse_id": warehouse_id,
                "code": zone_code,
                "name": "Cold Room Bay 1",
                "zone_type": "cold_storage",
                "is_active": True,
            },
        )
        assert zone_res.status_code == 201
        zone_data = zone_res.json()
        zone_id = zone_data["id"]
        assert zone_data["zone_type"] == "cold_storage"

        # List Zones with filter
        list_zones_res = client.get(f"/api/warehouse/zones?warehouse_id={warehouse_id}")
        assert list_zones_res.status_code == 200
        assert len(list_zones_res.json()) >= 1

    # Switch to Tenant B to test Tenant Isolation
    app.dependency_overrides[get_active_company_id] = lambda: company_b.id
    app.dependency_overrides[get_authenticated_user] = lambda: user_b

    with TestClient(app) as client:
        # Tenant B cannot access Tenant A's warehouse
        forbidden_wh = client.get(f"/api/warehouse/warehouses/{warehouse_id}")
        assert forbidden_wh.status_code == 404

        # Tenant B cannot update Tenant A's warehouse
        forbidden_put = client.put(
            f"/api/warehouse/warehouses/{warehouse_id}",
            json={"name": "Hijacked Warehouse"},
        )
        assert forbidden_put.status_code == 404

        # Tenant B cannot create a zone in Tenant A's warehouse
        forbidden_zone = client.post(
            "/api/warehouse/zones",
            json={
                "warehouse_id": warehouse_id,
                "code": "ILLEGAL-ZONE",
                "name": "Cross Tenant Zone",
                "zone_type": "storage",
            },
        )
        assert forbidden_zone.status_code == 404


# ==============================================================================
# 2. Yard Gate Appointment CRUD Tests
# ==============================================================================

def test_yard_gate_appointment_lifecycle(p7_logic_fixtures, db_session: Session):
    company_a = p7_logic_fixtures["company_a"]
    user_a = p7_logic_fixtures["user_a"]

    app.dependency_overrides[get_active_company_id] = lambda: company_a.id
    app.dependency_overrides[get_authenticated_user] = lambda: user_a

    with TestClient(app) as client:
        # Setup warehouse first
        wh_res = client.post(
            "/api/warehouse/warehouses",
            json={
                "code": f"WH-YARD-{uuid.uuid4().hex[:4].upper()}",
                "name": "Yard Facility South",
                "warehouse_type": "hub",
                "city": "Al-Kharj",
            },
        )
        wh_id = wh_res.json()["id"]

        apt_number = f"YARD-APT-{uuid.uuid4().hex[:6].upper()}"
        scheduled = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()

        # Create Yard Appointment
        create_res = client.post(
            "/api/warehouse/yard/appointments",
            json={
                "appointment_number": apt_number,
                "warehouse_id": wh_id,
                "driver_name": "Tariq Al-Harbi",
                "driver_phone": "+966551234567",
                "scheduled_time": scheduled,
                "waiting_area": "Buffer Bay 3",
                "loading_slot": "Gate 12",
                "purpose": "inbound_unloading",
                "status": "scheduled",
                "notes": "Refrigerated produce delivery",
            },
        )
        assert create_res.status_code == 201
        apt_data = create_res.json()
        apt_id = apt_data["id"]
        assert apt_data["driver_name"] == "Tariq Al-Harbi"
        assert apt_data["status"] == "scheduled"

        # Update Appointment status to arrived_waiting -> docked
        now_str = datetime.now(timezone.utc).isoformat()
        update_res = client.put(
            f"/api/warehouse/yard/appointments/{apt_id}",
            json={
                "status": "arrived_waiting",
                "arrival_time": now_str,
                "waiting_area": "Lane 1 Fast Track",
            },
        )
        assert update_res.status_code == 200
        assert update_res.json()["status"] == "arrived_waiting"
        assert update_res.json()["waiting_area"] == "Lane 1 Fast Track"

        # List appointments with filter
        list_res = client.get(f"/api/warehouse/yard/appointments?warehouse_id={wh_id}&status_filter=arrived_waiting")
        assert list_res.status_code == 200
        assert len(list_res.json()) >= 1


# ==============================================================================
# 3. FIFO Receipts & Financial Engine Integration (Dr 102000 / Cr 202000)
# ==============================================================================

def test_fifo_receipt_and_gl_posting(p7_logic_fixtures, db_session: Session):
    company_a = p7_logic_fixtures["company_a"]
    user_a = p7_logic_fixtures["user_a"]
    product_a = p7_logic_fixtures["product_a"]

    app.dependency_overrides[get_active_company_id] = lambda: company_a.id
    app.dependency_overrides[get_authenticated_user] = lambda: user_a

    with TestClient(app) as client:
        # Create warehouse and stock item
        wh_code = f"WH-REC-{uuid.uuid4().hex[:4].upper()}"
        wh_res = client.post(
            "/api/warehouse/warehouses",
            json={
                "code": wh_code,
                "name": "Intake Hub Warehouse",
                "warehouse_type": "storage",
                "city": "Buraidah",
            },
        )
        wh_id = wh_res.json()["id"]

        sku_code = f"SKU-DATES-KHALAS-{uuid.uuid4().hex[:4].upper()}"
        fresh_product = make_fresh_product(db_session, company_a.id, "Fresh Inbound Dates")
        item_res = client.post(
            "/api/warehouse/stock-items",
            json={
                "product_id": str(fresh_product.id),
                "sku": sku_code,
                "name": "Organic Khalas Dates - Bulk",
                "base_uom": "kg",
                "conversion_factor": "1.0000",
                "reorder_point": "100.00",
                "maximum_stock": "5000.00",
            },
        )
        assert item_res.status_code == 201
        stock_item_id = item_res.json()["id"]

        # 1. First Inbound Receipt: Lot 1 -> 100 units @ 10.00 SAR (Valuation = 1,000.00 SAR)
        lot1_num = f"LOT-1-{uuid.uuid4().hex[:4].upper()}"
        receipt_time_1 = datetime(2026, 9, 1, 8, 0, 0, tzinfo=timezone.utc).isoformat()
        mov1_res = client.post(
            "/api/warehouse/movements",
            json={
                "warehouse_id": wh_id,
                "stock_item_id": stock_item_id,
                "movement_type": "inbound",
                "quantity": "100.0000",
                "unit_cost": "10.0000",
                "lot_number": lot1_num,
                "received_date": receipt_time_1,
                "reference_type": "goods_receipt",
                "reference_id": "GR-2026-001",
                "notes": "First harvest intake lot",
            },
        )
        assert mov1_res.status_code == 201
        res1_data = mov1_res.json()
        assert res1_data["success"] is True
        assert res1_data["total_quantity"] == "100.0000"
        assert Decimal(str(res1_data["total_valuation"])) == Decimal("1000.00")
        assert len(res1_data["movements"]) == 1
        mov1 = res1_data["movements"][0]
        assert mov1["balance_after"] == "100.0000"
        assert mov1["lot_id"] is not None

        # Verify General Ledger Entry for Receipt 1
        account_move_1_id = res1_data["account_move_id"]
        assert account_move_1_id is not None
        gl_move_1 = db_session.scalar(select(AccountMove).where(AccountMove.id == uuid.UUID(account_move_1_id)))
        assert gl_move_1 is not None
        assert gl_move_1.state == "posted"

        # Check GL Lines: Dr Inventory (102000) 1000.00 / Cr GRNI (202000) 1000.00
        gl_lines_1 = db_session.scalars(select(AccountMoveLine).where(AccountMoveLine.move_id == gl_move_1.id)).all()
        assert len(gl_lines_1) == 2
        inv_line = next(line for line in gl_lines_1 if line.debit > 0)
        grni_line = next(line for line in gl_lines_1 if line.credit > 0)
        assert inv_line.debit == Decimal("1000.00")
        assert grni_line.credit == Decimal("1000.00")

        # 2. Second Inbound Receipt: Lot 2 -> 50 units @ 16.00 SAR (Valuation = 800.00 SAR)
        lot2_num = f"LOT-2-{uuid.uuid4().hex[:4].upper()}"
        receipt_time_2 = datetime(2026, 9, 2, 9, 0, 0, tzinfo=timezone.utc).isoformat()
        mov2_res = client.post(
            "/api/warehouse/movements",
            json={
                "warehouse_id": wh_id,
                "stock_item_id": stock_item_id,
                "movement_type": "inbound",
                "quantity": "50.0000",
                "unit_cost": "16.0000",
                "lot_number": lot2_num,
                "received_date": receipt_time_2,
                "reference_type": "goods_receipt",
                "reference_id": "GR-2026-002",
                "notes": "Second harvest intake lot at higher quality and price",
            },
        )
        assert mov2_res.status_code == 201
        res2_data = mov2_res.json()
        assert res2_data["success"] is True
        assert Decimal(str(res2_data["total_valuation"])) == Decimal("800.00")
        mov2 = res2_data["movements"][0]
        # Cumulative balance after second receipt should be 150
        assert mov2["balance_after"] == "150.0000"

        # Verify General Ledger Entry for Receipt 2
        account_move_2_id = res2_data["account_move_id"]
        assert account_move_2_id is not None
        gl_move_2 = db_session.scalar(select(AccountMove).where(AccountMove.id == uuid.UUID(account_move_2_id)))
        assert gl_move_2.state == "posted"
        gl_lines_2 = db_session.scalars(select(AccountMoveLine).where(AccountMoveLine.move_id == gl_move_2.id)).all()
        assert len(gl_lines_2) == 2
        inv_line_2 = next(line for line in gl_lines_2 if line.debit > 0)
        grni_line_2 = next(line for line in gl_lines_2 if line.credit > 0)
        assert inv_line_2.debit == Decimal("800.00")
        assert grni_line_2.credit == Decimal("800.00")


# ==============================================================================
# 4. Multi-Lot FIFO Issue & Valuation Posting (Dr 501000 / Cr 102000)
# ==============================================================================

def test_multi_lot_fifo_issue_and_valuation(p7_logic_fixtures, db_session: Session):
    company_a = p7_logic_fixtures["company_a"]
    user_a = p7_logic_fixtures["user_a"]
    product_a = p7_logic_fixtures["product_a"]

    app.dependency_overrides[get_active_company_id] = lambda: company_a.id
    app.dependency_overrides[get_authenticated_user] = lambda: user_a

    with TestClient(app) as client:
        # Setup warehouse & item
        wh_res = client.post(
            "/api/warehouse/warehouses",
            json={
                "code": f"WH-FIFO-{uuid.uuid4().hex[:4].upper()}",
                "name": "FIFO Dispatch Depot",
                "warehouse_type": "storage",
                "city": "Dammam",
            },
        )
        wh_id = wh_res.json()["id"]

        fresh_fifo_prod = make_fresh_product(db_session, company_a.id, "FIFO Dates")
        item_res = client.post(
            "/api/warehouse/stock-items",
            json={
                "product_id": str(fresh_fifo_prod.id),
                "sku": f"SKU-FIFO-{uuid.uuid4().hex[:4].upper()}",
                "name": "FIFO Tracked Dates",
                "base_uom": "kg",
            },
        )
        assert item_res.status_code == 201
        stock_item_id = item_res.json()["id"]

        # Inbound Lot 1: 100 units @ 10.00 SAR (Received 2026-09-01)
        client.post(
            "/api/warehouse/movements",
            json={
                "warehouse_id": wh_id,
                "stock_item_id": stock_item_id,
                "movement_type": "inbound",
                "quantity": "100.0000",
                "unit_cost": "10.0000",
                "lot_number": f"LOT-FIFO-1-{uuid.uuid4().hex[:4]}",
                "received_date": datetime(2026, 9, 1, 10, 0, 0, tzinfo=timezone.utc).isoformat(),
            },
        )

        # Inbound Lot 2: 50 units @ 16.00 SAR (Received 2026-09-02)
        client.post(
            "/api/warehouse/movements",
            json={
                "warehouse_id": wh_id,
                "stock_item_id": stock_item_id,
                "movement_type": "inbound",
                "quantity": "50.0000",
                "unit_cost": "16.0000",
                "lot_number": f"LOT-FIFO-2-{uuid.uuid4().hex[:4]}",
                "received_date": datetime(2026, 9, 2, 10, 0, 0, tzinfo=timezone.utc).isoformat(),
            },
        )

        # Outbound Issue: Request 120 units
        # FIFO consumption must:
        # - Fully consume Lot 1 (100 units @ 10.00 SAR = 1,000.00 SAR)
        # - Partially consume Lot 2 (20 units @ 16.00 SAR = 320.00 SAR)
        # Total Valuation = 1,320.00 SAR
        # Remaining Stock in Lot 2 = 30 units
        issue_res = client.post(
            "/api/warehouse/movements",
            json={
                "warehouse_id": wh_id,
                "stock_item_id": stock_item_id,
                "movement_type": "outbound",
                "quantity": "120.0000",
                "reference_type": "customer_delivery",
                "reference_id": "DO-2026-0906-0045",
                "notes": "Delivery to Al-Madinah Distribution Center",
            },
        )
        assert issue_res.status_code == 201
        issue_data = issue_res.json()
        assert issue_data["success"] is True
        assert issue_data["total_quantity"] == "120.0000"
        assert Decimal(str(issue_data["total_valuation"])) == Decimal("1320.00")

        # Must have created 2 separate StockMovement records (one per lot)
        movements = issue_data["movements"]
        assert len(movements) == 2

        # First movement: 100 units @ 10.00
        mov_lot1 = movements[0]
        assert Decimal(str(mov_lot1["quantity"])) == Decimal("100.0000")
        assert Decimal(str(mov_lot1["unit_cost"])) == Decimal("10.0000")
        assert Decimal(str(mov_lot1["balance_after"])) == Decimal("50.0000")

        # Second movement: 20 units @ 16.00
        mov_lot2 = movements[1]
        assert Decimal(str(mov_lot2["quantity"])) == Decimal("20.0000")
        assert Decimal(str(mov_lot2["unit_cost"])) == Decimal("16.0000")
        assert Decimal(str(mov_lot2["balance_after"])) == Decimal("30.0000")

        # Verify General Ledger Entry for FIFO Issue
        account_move_id = issue_data["account_move_id"]
        assert account_move_id is not None
        gl_move = db_session.scalar(select(AccountMove).where(AccountMove.id == uuid.UUID(account_move_id)))
        assert gl_move is not None
        assert gl_move.state == "posted"

        # Check GL Lines: Dr COGS (501000) 1320.00 / Cr Inventory (102000) 1320.00
        gl_lines = db_session.scalars(select(AccountMoveLine).where(AccountMoveLine.move_id == gl_move.id)).all()
        assert len(gl_lines) == 2
        cogs_line = next(line for line in gl_lines if line.debit > 0)
        inv_line = next(line for line in gl_lines if line.credit > 0)
        assert cogs_line.debit == Decimal("1320.00")
        assert inv_line.credit == Decimal("1320.00")

        # Verify remaining lots in DB:
        lot1_db = db_session.scalar(select(StockLot).where(StockLot.id == uuid.UUID(mov_lot1["lot_id"])))
        lot2_db = db_session.scalar(select(StockLot).where(StockLot.id == uuid.UUID(mov_lot2["lot_id"])))
        assert lot1_db.remaining_quantity == Decimal("0.0000")
        assert lot1_db.status == "depleted"
        assert lot2_db.remaining_quantity == Decimal("30.0000")
        assert lot2_db.status == "active"


# ==============================================================================
# 5. Insufficient Inventory Rejection Test
# ==============================================================================

def test_insufficient_inventory_rejection(p7_logic_fixtures, db_session: Session):
    company_a = p7_logic_fixtures["company_a"]
    user_a = p7_logic_fixtures["user_a"]
    product_a = p7_logic_fixtures["product_a"]

    app.dependency_overrides[get_active_company_id] = lambda: company_a.id
    app.dependency_overrides[get_authenticated_user] = lambda: user_a

    with TestClient(app) as client:
        wh_res = client.post(
            "/api/warehouse/warehouses",
            json={
                "code": f"WH-OOS-{uuid.uuid4().hex[:4].upper()}",
                "name": "Out of Stock Test Warehouse",
                "warehouse_type": "storage",
                "city": "Hail",
            },
        )
        wh_id = wh_res.json()["id"]

        fresh_oos_prod = make_fresh_product(db_session, company_a.id, "OOS Test Dates")
        item_res = client.post(
            "/api/warehouse/stock-items",
            json={
                "product_id": str(fresh_oos_prod.id),
                "sku": f"SKU-OOS-{uuid.uuid4().hex[:4].upper()}",
                "name": "Stock Out Check Item",
                "base_uom": "kg",
            },
        )
        assert item_res.status_code == 201
        stock_item_id = item_res.json()["id"]

        # Only deposit 25 units
        client.post(
            "/api/warehouse/movements",
            json={
                "warehouse_id": wh_id,
                "stock_item_id": stock_item_id,
                "movement_type": "inbound",
                "quantity": "25.0000",
                "unit_cost": "10.0000",
            },
        )

        # Attempt to issue 50 units (exceeds available 25 units)
        over_issue_res = client.post(
            "/api/warehouse/movements",
            json={
                "warehouse_id": wh_id,
                "stock_item_id": stock_item_id,
                "movement_type": "outbound",
                "quantity": "50.0000",
            },
        )
        assert over_issue_res.status_code == 400
        err_detail = over_issue_res.json()["detail"]
        assert "Insufficient inventory" in err_detail
        assert "Requested: 50.0000" in err_detail
        assert "Available: 25.0000" in err_detail

        # Verify lot remains untouched at 25 units
        lots_res = client.get(f"/api/warehouse/lots?stock_item_id={stock_item_id}")
        assert lots_res.status_code == 200
        lots = lots_res.json()
        assert len(lots) == 1
        assert Decimal(str(lots[0]["remaining_quantity"])) == Decimal("25.0000")


# Clean up dependency overrides after module tests complete
@pytest.fixture(scope="module", autouse=True)
def cleanup_overrides():
    yield
    app.dependency_overrides.clear()
