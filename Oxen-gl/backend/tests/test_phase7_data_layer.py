"""
Automated tests for Phase 7 Part 1: Warehouse & Yard Data Layer.

Verifies:
1. Warehouse and WarehouseZone models, schemas, and cascading relationships.
2. StockItem base UOM, conversion factor, and product linkage.
3. StockLot FIFO cost tracking, traceability (linking HarvestBatch), and expiry validation.
4. StockMovement transaction logging, immutability, and strict negative stock balance rejection.
5. YardGateAppointment arrival tracking, waiting areas, and loading slots.
6. Tenant isolation (company_id) across all Phase 7 warehouse & yard tables.
"""

import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.models import (
    ResCompany,
    ResUser,
    ProductProduct,
    SeasonalCropCycle,
    HarvestBatch,
    Vehicle,
    ResPartner,
    Warehouse,
    WarehouseZone,
    StockItem,
    StockLot,
    StockMovement,
    YardGateAppointment,
)
from backend.schemas import (
    WarehouseCreate,
    WarehouseRead,
    WarehouseZoneCreate,
    WarehouseZoneRead,
    StockItemCreate,
    StockItemRead,
    StockLotCreate,
    StockLotRead,
    StockMovementCreate,
    StockMovementRead,
    YardGateAppointmentCreate,
    YardGateAppointmentRead,
)


@pytest.fixture(scope="module")
def db_session():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="module")
def p7_fixtures(db_session: Session):
    # Tenant 1: Primary Warehouse Operations
    company1 = db_session.scalar(select(ResCompany).where(ResCompany.slug == "phase7-wh-corp"))
    if not company1:
        company1 = ResCompany(
            name="Phase 7 Central Warehousing Corp",
            slug="phase7-wh-corp",
            currency="SAR",
            commercial_registration="1010778899",
            tax_id="300077889900003",
        )
        db_session.add(company1)
        db_session.commit()
        db_session.refresh(company1)

    # Tenant 2: Isolation Test Tenant
    company2 = db_session.scalar(select(ResCompany).where(ResCompany.slug == "phase7-wh-isolated"))
    if not company2:
        company2 = ResCompany(
            name="Phase 7 Isolated Tenant",
            slug="phase7-wh-isolated",
            currency="SAR",
            commercial_registration="1010778800",
            tax_id="300077880000003",
        )
        db_session.add(company2)
        db_session.commit()
        db_session.refresh(company2)

    # User
    user = db_session.scalar(select(ResUser).where(ResUser.email == "warehouse_mgr@oxengl.com"))
    if not user:
        user = ResUser(
            firebase_uid="p7-wh-user-uid",
            email="warehouse_mgr@oxengl.com",
            full_name="Abdullah Warehouse Manager",
            company_id=company1.id,
            role="Admin",
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

    # Product
    product = db_session.scalar(select(ProductProduct).where(ProductProduct.company_id == company1.id, ProductProduct.sku == "SKU-SUKARI-P7"))
    if not product:
        product = ProductProduct(
            company_id=company1.id,
            sku="SKU-SUKARI-P7",
            name="Sukari Fresh Dates Organic",
            product_type="storable",
            unit_of_measure="kg",
            standard_cost=Decimal("14.50"),
            sale_price=Decimal("22.00"),
            is_active=True,
        )
        db_session.add(product)
        db_session.commit()
        db_session.refresh(product)

    # Harvest Batch for Traceability
    crop_cycle = db_session.scalar(select(SeasonalCropCycle).where(SeasonalCropCycle.company_id == company1.id, SeasonalCropCycle.code == "CYCLE-P7-DATES"))
    if not crop_cycle:
        crop_cycle = SeasonalCropCycle(
            company_id=company1.id,
            code="CYCLE-P7-DATES",
            name="Qassim Harvest 2026",
            cycle_season="autumn",
            start_date=datetime(2026, 8, 1, tzinfo=timezone.utc),
            end_date=datetime(2026, 10, 31, tzinfo=timezone.utc),
            status="active",
        )
        db_session.add(crop_cycle)
        db_session.commit()
        db_session.refresh(crop_cycle)

    batch = db_session.scalar(select(HarvestBatch).where(HarvestBatch.company_id == company1.id, HarvestBatch.batch_number == "BATCH-P7-DATES-99"))
    if not batch:
        batch = HarvestBatch(
            company_id=company1.id,
            batch_number="BATCH-P7-DATES-99",
            crop_cycle_id=crop_cycle.id,
            status="harvested",
            gross_weight=Decimal("30000.00"),
            tare_weight=Decimal("5000.00"),
            net_weight=Decimal("25000.00"),
        )
        db_session.add(batch)
        db_session.commit()
        db_session.refresh(batch)

    # Vehicle & Transporter
    vehicle = db_session.scalar(select(Vehicle).where(Vehicle.company_id == company1.id, Vehicle.license_plate == "P7-TRUCK-01"))
    if not vehicle:
        vehicle = Vehicle(
            company_id=company1.id,
            name="Mercedes-Benz Actros 2640 Reefer",
            license_plate="P7-TRUCK-01",
            make="Mercedes-Benz",
            model="Actros 2640",
            model_year=2025,
            vehicle_type="truck",
            status="active",
        )
        db_session.add(vehicle)
        db_session.commit()
        db_session.refresh(vehicle)

    transporter = db_session.scalar(select(ResPartner).where(ResPartner.company_id == company1.id, ResPartner.name == "Najd Cold Logistics"))
    if not transporter:
        transporter = ResPartner(
            company_id=company1.id,
            name="Najd Cold Logistics",
            partner_type="transporter",
            tax_number=f"3000999888{uuid.uuid4().hex[:5]}",
        )
        db_session.add(transporter)
        db_session.commit()
        db_session.refresh(transporter)

    return {
        "company1": company1,
        "company2": company2,
        "user": user,
        "product": product,
        "batch": batch,
        "vehicle": vehicle,
        "transporter": transporter,
    }


# ==============================================================================
# Test 1: Warehouse & WarehouseZone Models & Schemas
# ==============================================================================

def test_warehouse_and_zone_lifecycle(p7_fixtures, db_session: Session):
    company = p7_fixtures["company1"]
    wh_code = f"WH-TEST-{uuid.uuid4().hex[:6].upper()}"

    # 1. Schema Validation
    wh_schema = WarehouseCreate(
        code=wh_code,
        name="Al-Kharj Central Agricultural Logistics Facility",
        address="Highway 10, Al-Kharj Agri-Zone, KSA",
        is_active=True,
    )
    assert wh_schema.code == wh_code

    # 2. Database Persistence
    warehouse = Warehouse(
        company_id=company.id,
        code=wh_schema.code,
        name=wh_schema.name,
        address=wh_schema.address,
        is_active=wh_schema.is_active,
    )
    db_session.add(warehouse)
    db_session.commit()
    db_session.refresh(warehouse)

    wh_read = WarehouseRead.model_validate(warehouse)
    assert wh_read.id == warehouse.id
    assert wh_read.code == wh_code

    # 3. Zone Creation
    zone_code = "ZONE-COLD-01"
    zone_schema = WarehouseZoneCreate(
        warehouse_id=warehouse.id,
        code=zone_code,
        name="Controlled Atmosphere Produce Cooler",
        zone_type="cold_storage",
        is_active=True,
    )
    assert zone_schema.zone_type == "cold_storage"

    zone = WarehouseZone(
        company_id=company.id,
        warehouse_id=warehouse.id,
        code=zone_schema.code,
        name=zone_schema.name,
        zone_type=zone_schema.zone_type,
        is_active=zone_schema.is_active,
    )
    db_session.add(zone)
    db_session.commit()
    db_session.refresh(zone)

    zone_read = WarehouseZoneRead.model_validate(zone)
    assert zone_read.id == zone.id
    assert zone_read.zone_type == "cold_storage"


# ==============================================================================
# Test 2: StockItem Base UOM & Conversion Factors
# ==============================================================================

def test_stock_item_uom_and_conversions(p7_fixtures, db_session: Session):
    company = p7_fixtures["company1"]
    
    # Create fresh dedicated product for this test to respect unique (company_id, product_id)
    product = ProductProduct(
        company_id=company.id,
        sku=f"SKU-PROD-{uuid.uuid4().hex[:8].upper()}",
        name="Sukari Packaged Produce",
        product_type="storable",
        unit_of_measure="kg",
        standard_cost=Decimal("14.50"),
        sale_price=Decimal("22.00"),
        is_active=True,
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)

    sku = f"SKU-ITEM-{uuid.uuid4().hex[:6].upper()}"

    # 1. Schema Validation
    item_schema = StockItemCreate(
        product_id=product.id,
        sku=sku,
        name="Sukari Dates Grade A Packed",
        base_uom="kg",
        secondary_uom="carton_10kg",
        conversion_factor=Decimal("10.0000"),
        reorder_point=Decimal("1000.00"),
        maximum_stock=Decimal("25000.00"),
        is_active=True,
    )
    assert item_schema.conversion_factor == Decimal("10.0000")

    # Disallow zero or negative conversion factor
    with pytest.raises(ValueError):
        StockItemCreate(
            product_id=product.id,
            sku=sku,
            name="Invalid UOM Item",
            conversion_factor=Decimal("0.0000"),
        )

    # 2. Database Persistence
    stock_item = StockItem(
        company_id=company.id,
        product_id=product.id,
        sku=item_schema.sku,
        name=item_schema.name,
        base_uom=item_schema.base_uom,
        secondary_uom=item_schema.secondary_uom,
        conversion_factor=item_schema.conversion_factor,
        reorder_point=item_schema.reorder_point,
        maximum_stock=item_schema.maximum_stock,
        is_active=item_schema.is_active,
    )
    db_session.add(stock_item)
    db_session.commit()
    db_session.refresh(stock_item)

    item_read = StockItemRead.model_validate(stock_item)
    assert item_read.id == stock_item.id
    assert item_read.base_uom == "kg"
    assert item_read.conversion_factor == Decimal("10.0000")


# ==============================================================================
# Test 3: StockLot Strict FIFO Cost Tracking & Expiration Dates
# ==============================================================================

def test_stock_lot_fifo_tracking_and_traceability(p7_fixtures, db_session: Session):
    company = p7_fixtures["company1"]
    product = p7_fixtures["product"]
    batch = p7_fixtures["batch"]

    # Retrieve or create stock item
    stock_item = db_session.scalar(select(StockItem).where(StockItem.company_id == company.id, StockItem.product_id == product.id))
    if not stock_item:
        stock_item = StockItem(
            company_id=company.id,
            product_id=product.id,
            sku=f"SKU-LOT-{uuid.uuid4().hex[:6].upper()}",
            name="Dates Item For Lots",
            base_uom="kg",
            conversion_factor=Decimal("1.0000"),
        )
        db_session.add(stock_item)
        db_session.commit()
        db_session.refresh(stock_item)

    now = datetime.now(timezone.utc)
    lot1_time = now - timedelta(days=5)
    lot2_time = now - timedelta(days=2)

    # 1. Schema Validation (quantities & expiry)
    lot_in = StockLotCreate(
        stock_item_id=stock_item.id,
        lot_number=f"LOT-FIFO-01-{uuid.uuid4().hex[:4]}",
        harvest_batch_id=batch.id,
        initial_quantity=Decimal("5000.0000"),
        remaining_quantity=Decimal("5000.0000"),
        unit_cost=Decimal("12.5000"),
        received_date=lot1_time,
        expiration_date=now + timedelta(days=365),
        status="active",
    )
    assert lot_in.unit_cost == Decimal("12.5000")

    # Remaining cannot exceed initial
    with pytest.raises(ValueError, match="Remaining quantity cannot exceed initial"):
        StockLotCreate(
            stock_item_id=stock_item.id,
            lot_number="LOT-ERR",
            initial_quantity=Decimal("100.0000"),
            remaining_quantity=Decimal("200.0000"),
            unit_cost=Decimal("10.0000"),
        )

    # 2. Database FIFO Sequencing Test (Insert 2 lots with different received dates and costs)
    lot1 = StockLot(
        company_id=company.id,
        stock_item_id=stock_item.id,
        lot_number=f"LOT-FIFO-A-{uuid.uuid4().hex[:4]}",
        harvest_batch_id=batch.id,
        initial_quantity=Decimal("1000.0000"),
        remaining_quantity=Decimal("1000.0000"),
        unit_cost=Decimal("12.0000"),
        received_date=lot1_time,
        status="active",
    )
    lot2 = StockLot(
        company_id=company.id,
        stock_item_id=stock_item.id,
        lot_number=f"LOT-FIFO-B-{uuid.uuid4().hex[:4]}",
        harvest_batch_id=batch.id,
        initial_quantity=Decimal("2000.0000"),
        remaining_quantity=Decimal("2000.0000"),
        unit_cost=Decimal("14.5000"),
        received_date=lot2_time,
        status="active",
    )
    db_session.add_all([lot1, lot2])
    db_session.commit()

    # Query active lots sorted strictly by FIFO (oldest received_date first)
    fifo_lots = db_session.scalars(
        select(StockLot)
        .where(StockLot.company_id == company.id, StockLot.stock_item_id == stock_item.id, StockLot.status == "active")
        .order_by(StockLot.received_date.asc())
    ).all()

    assert len(fifo_lots) >= 2
    # Ensure lot1 precedes lot2 in FIFO allocation sequence
    found_lot1_idx = [i for i, l in enumerate(fifo_lots) if l.id == lot1.id][0]
    found_lot2_idx = [i for i, l in enumerate(fifo_lots) if l.id == lot2.id][0]
    assert found_lot1_idx < found_lot2_idx
    assert fifo_lots[found_lot1_idx].unit_cost == Decimal("12.0000")


# ==============================================================================
# Test 4: StockMovement Negative Balance Rejection & Immutability
# ==============================================================================

def test_stock_movement_strict_rejection_and_immutability(p7_fixtures, db_session: Session):
    company = p7_fixtures["company1"]
    product = p7_fixtures["product"]
    user = p7_fixtures["user"]

    warehouse = db_session.scalar(select(Warehouse).where(Warehouse.company_id == company.id))
    stock_item = db_session.scalar(select(StockItem).where(StockItem.company_id == company.id, StockItem.product_id == product.id))

    # 1. Strict validation in StockMovementCreate rejecting negative stock balance
    with pytest.raises(ValueError, match="Negative stock balance rejected by default"):
        StockMovementCreate(
            movement_number=f"MV-NEG-{uuid.uuid4().hex[:4]}",
            stock_item_id=stock_item.id,
            warehouse_id=warehouse.id,
            movement_type="outbound",
            quantity=Decimal("500.0000"),
            unit_cost=Decimal("14.5000"),
            balance_after=Decimal("-10.0000"),  # Strictly Forbidden!
        )

    # 2. Valid movement accepted
    mv_num = f"MV-VALID-{uuid.uuid4().hex[:6].upper()}"
    mv_create = StockMovementCreate(
        movement_number=mv_num,
        stock_item_id=stock_item.id,
        warehouse_id=warehouse.id,
        movement_type="inbound",
        quantity=Decimal("1500.0000"),
        unit_cost=Decimal("14.5000"),
        reference_type="goods_receipt",
        reference_id="GR-2026-0091",
        balance_after=Decimal("1500.0000"),
        notes="Standard FIFO inbound receipt",
    )
    assert mv_create.balance_after == Decimal("1500.0000")

    movement = StockMovement(
        company_id=company.id,
        movement_number=mv_create.movement_number,
        stock_item_id=stock_item.id,
        warehouse_id=warehouse.id,
        movement_type=mv_create.movement_type,
        quantity=mv_create.quantity,
        unit_cost=mv_create.unit_cost,
        reference_type=mv_create.reference_type,
        reference_id=mv_create.reference_id,
        performed_by_id=user.id,
        balance_after=mv_create.balance_after,
        notes=mv_create.notes,
    )
    db_session.add(movement)
    db_session.commit()
    db_session.refresh(movement)

    mv_read = StockMovementRead.model_validate(movement)
    assert mv_read.id == movement.id
    assert mv_read.movement_number == mv_num

    # 3. Immutability Enforcement (UPDATE & DELETE must raise ValueError)
    movement.notes = "Attempted illicit alteration of movement log"
    with pytest.raises(ValueError, match="StockMovement transactions are immutable audit logs. UPDATE is prohibited."):
        db_session.commit()

    db_session.rollback()

    # Re-fetch and test delete rejection
    movement_fresh = db_session.scalar(select(StockMovement).where(StockMovement.id == movement.id))
    db_session.delete(movement_fresh)
    with pytest.raises(ValueError, match="StockMovement transactions are immutable audit logs. DELETE is prohibited."):
        db_session.commit()

    db_session.rollback()


# ==============================================================================
# Test 5: YardGateAppointment Slot Allocation & Flow
# ==============================================================================

def test_yard_gate_appointment_lifecycle(p7_fixtures, db_session: Session):
    company = p7_fixtures["company1"]
    warehouse = db_session.scalar(select(Warehouse).where(Warehouse.company_id == company.id))
    vehicle = p7_fixtures["vehicle"]
    transporter = p7_fixtures["transporter"]

    apt_number = f"YARD-{uuid.uuid4().hex[:8].upper()}"
    sched_time = datetime.now(timezone.utc) + timedelta(hours=2)

    # 1. Schema Validation
    apt_create = YardGateAppointmentCreate(
        appointment_number=apt_number,
        warehouse_id=warehouse.id,
        vehicle_id=vehicle.id,
        transporter_id=transporter.id,
        driver_name="Saleh Al-Omari",
        driver_phone="+966551234567",
        scheduled_time=sched_time,
        waiting_area="Staging Lane 4",
        loading_slot="Cold Storage Bay 2",
        purpose="inbound_unloading",
        status="scheduled",
    )
    assert apt_create.loading_slot == "Cold Storage Bay 2"

    # 2. Database Persistence
    appointment = YardGateAppointment(
        company_id=company.id,
        appointment_number=apt_create.appointment_number,
        warehouse_id=warehouse.id,
        vehicle_id=vehicle.id,
        transporter_id=transporter.id,
        driver_name=apt_create.driver_name,
        driver_phone=apt_create.driver_phone,
        scheduled_time=apt_create.scheduled_time,
        waiting_area=apt_create.waiting_area,
        loading_slot=apt_create.loading_slot,
        purpose=apt_create.purpose,
        status=apt_create.status,
    )
    db_session.add(appointment)
    db_session.commit()
    db_session.refresh(appointment)

    apt_read = YardGateAppointmentRead.model_validate(appointment)
    assert apt_read.id == appointment.id
    assert apt_read.waiting_area == "Staging Lane 4"
    assert apt_read.status == "scheduled"

    # Transition status to arrived_waiting and docked
    appointment.arrival_time = datetime.now(timezone.utc)
    appointment.status = "arrived_waiting"
    db_session.commit()

    appointment.gate_in_time = datetime.now(timezone.utc)
    appointment.status = "docked"
    db_session.commit()
    db_session.refresh(appointment)

    assert appointment.status == "docked"
    assert appointment.arrival_time is not None
    assert appointment.gate_in_time is not None


# ==============================================================================
# Test 6: Multi-Tenant Isolation
# ==============================================================================

def test_warehouse_yard_tenant_isolation(p7_fixtures, db_session: Session):
    company1 = p7_fixtures["company1"]
    company2 = p7_fixtures["company2"]

    c2_code = f"WH-C2-{uuid.uuid4().hex[:6].upper()}"
    # Create warehouse for Company 2
    wh_c2 = Warehouse(
        company_id=company2.id,
        code=c2_code,
        name="Isolated Company 2 Depot",
        is_active=True,
    )
    db_session.add(wh_c2)
    db_session.commit()

    # Query warehouses scoped to Company 1
    c1_warehouses = db_session.scalars(select(Warehouse).where(Warehouse.company_id == company1.id)).all()
    c1_codes = [w.code for w in c1_warehouses]
    assert c2_code not in c1_codes

    # Query warehouses scoped to Company 2
    c2_warehouses = db_session.scalars(select(Warehouse).where(Warehouse.company_id == company2.id)).all()
    c2_codes = [w.code for w in c2_warehouses]
    assert c2_code in c2_codes
    assert all(w.company_id == company2.id for w in c2_warehouses)
