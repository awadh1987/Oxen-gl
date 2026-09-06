import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from Backend.database import SessionLocal
from Backend.main import app, get_active_company_id, get_authenticated_user
from Backend.models import (
    AIGovernanceLog,
    FuelTransaction,
    HarvestBatch,
    MaintenanceWorkOrder,
    ProductProduct,
    ResCompany,
    ResUser,
    SeasonalCropCycle,
    StockItem,
    StockLot,
    StockMovement,
    Vehicle,
    Warehouse,
    WarehouseZone,
)
from Backend.schemas import RestockProposalRequest
from Backend.services.ai_forecasting import ai_forecasting_service
from Backend.services.ai_governance import ai_governance_engine


@pytest.fixture(scope="module")
def db_session():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="module")
def forecast_fixtures(db_session: Session):
    # 1. Company & Admin User
    company = db_session.scalar(select(ResCompany).where(ResCompany.slug == "p9-forecast-corp"))
    if not company:
        company = ResCompany(
            name="Predictive Logistics & Agro Corp",
            slug="p9-forecast-corp",
            currency="SAR",
            commercial_registration="1010222001",
            tax_id="300022200100003",
            subscription_tier="ENTERPRISE",
        )
        db_session.add(company)
        db_session.commit()
        db_session.refresh(company)

    admin = db_session.scalar(select(ResUser).where(ResUser.email == "admin@forecast-corp.com"))
    if not admin:
        admin = ResUser(
            firebase_uid="uid-forecast-admin",
            email="admin@forecast-corp.com",
            full_name="Forecast Admin",
            company_id=company.id,
            role="Admin",
            is_active=True,
        )
        db_session.add(admin)
        db_session.commit()
        db_session.refresh(admin)

    # 2. Warehouse & Zone
    warehouse = db_session.scalar(
        select(Warehouse).where(Warehouse.company_id == company.id, Warehouse.code == "FC-WH1")
    )
    if not warehouse:
        warehouse = Warehouse(
            company_id=company.id,
            code="FC-WH1",
            name="Forecast Central Warehouse",
            address="Exit 18 Logistics Park, Riyadh",
            is_active=True,
        )
        db_session.add(warehouse)
        db_session.commit()
        db_session.refresh(warehouse)

    zone = db_session.scalar(
        select(WarehouseZone).where(WarehouseZone.warehouse_id == warehouse.id, WarehouseZone.code == "FC-Z1")
    )
    if not zone:
        zone = WarehouseZone(
            company_id=company.id,
            warehouse_id=warehouse.id,
            code="FC-Z1",
            name="Zone 1 - Bulk Storage",
            zone_type="storage",
            is_active=True,
        )
        db_session.add(zone)
        db_session.commit()
        db_session.refresh(zone)

    # 3. Product & Stock Item
    product = db_session.scalar(
        select(ProductProduct).where(ProductProduct.company_id == company.id, ProductProduct.sku == "SKU-AGRO-FEED")
    )
    if not product:
        product = ProductProduct(
            company_id=company.id,
            name="Premium Organic Cattle Feed",
            sku="SKU-AGRO-FEED",
            product_type="consumable",
            unit_of_measure="kg",
            standard_cost=Decimal("80.00"),
            sale_price=Decimal("120.00"),
        )
        db_session.add(product)
        db_session.commit()
        db_session.refresh(product)

    stock_item = db_session.scalar(
        select(StockItem).where(StockItem.company_id == company.id, StockItem.sku == "SKU-AGRO-FEED")
    )
    if not stock_item:
        stock_item = StockItem(
            company_id=company.id,
            product_id=product.id,
            sku="SKU-AGRO-FEED",
            name="Premium Organic Cattle Feed",
            base_uom="kg",
            conversion_factor=Decimal("1.0"),
            reorder_point=Decimal("100.00"),
            maximum_stock=Decimal("500.00"),
            is_active=True,
        )
        db_session.add(stock_item)
        db_session.commit()
        db_session.refresh(stock_item)

    # 4. Agricultural Season Crop Cycle
    now = datetime.now(timezone.utc)
    crop_cycle = db_session.scalar(
        select(SeasonalCropCycle).where(SeasonalCropCycle.company_id == company.id, SeasonalCropCycle.code == "CC-2026-SP")
    )
    if not crop_cycle:
        crop_cycle = SeasonalCropCycle(
            company_id=company.id,
            code="CC-2026-SP",
            name="Spring 2026 Alfalfa Crop Cycle",
            cycle_season="spring",
            start_date=now - timedelta(days=60),
            end_date=now + timedelta(days=30),
            status="active",
            target_yield_tons=Decimal("250.00"),
            actual_yield_tons=Decimal("0.00"),
        )
        db_session.add(crop_cycle)
        db_session.commit()
        db_session.refresh(crop_cycle)

    # 5. Vehicles (One Baseline, One Anomalous)
    v_normal = db_session.scalar(
        select(Vehicle).where(Vehicle.company_id == company.id, Vehicle.license_plate == "KSA-FC-101")
    )
    if not v_normal:
        v_normal = Vehicle(
            company_id=company.id,
            name="Fleet Truck 101",
            license_plate="KSA-FC-101",
            make="Mercedes-Benz",
            model="Actros 3340",
            model_year=2022,
            vehicle_type="truck",
            current_odometer=Decimal("120000.0"),
            status="active",
        )
        db_session.add(v_normal)
        db_session.commit()
        db_session.refresh(v_normal)

    v_anomaly = db_session.scalar(
        select(Vehicle).where(Vehicle.company_id == company.id, Vehicle.license_plate == "KSA-FC-999")
    )
    if not v_anomaly:
        v_anomaly = Vehicle(
            company_id=company.id,
            name="Fleet Truck 999",
            license_plate="KSA-FC-999",
            make="Volvo",
            model="FH16",
            model_year=2020,
            vehicle_type="truck",
            current_odometer=Decimal("280000.0"),
            status="active",
        )
        db_session.add(v_anomaly)
        db_session.commit()
        db_session.refresh(v_anomaly)

    return {
        "company": company,
        "admin": admin,
        "warehouse": warehouse,
        "zone": zone,
        "product": product,
        "stock_item": stock_item,
        "crop_cycle": crop_cycle,
        "v_normal": v_normal,
        "v_anomaly": v_anomaly,
    }


def test_agricultural_yield_prediction(forecast_fixtures: dict, db_session: Session):
    company = forecast_fixtures["company"]
    crop_cycle = forecast_fixtures["crop_cycle"]

    # Seed 2 harvest batches for this cycle if none exist
    batches = db_session.scalars(
        select(HarvestBatch).where(HarvestBatch.crop_cycle_id == crop_cycle.id)
    ).all()
    if not batches:
        b1 = HarvestBatch(
            company_id=company.id,
            batch_number=f"HB-SP-{uuid.uuid4().hex[:6]}",
            crop_cycle_id=crop_cycle.id,
            harvest_date=datetime.now(timezone.utc) - timedelta(days=10),
            gross_weight=Decimal("45000.00"),
            tare_weight=Decimal("5000.00"),
            net_weight=Decimal("40000.00"),
            quality_grade="A",
            status="harvested",
        )
        b2 = HarvestBatch(
            company_id=company.id,
            batch_number=f"HB-SP-{uuid.uuid4().hex[:6]}",
            crop_cycle_id=crop_cycle.id,
            harvest_date=datetime.now(timezone.utc) - timedelta(days=3),
            gross_weight=Decimal("55000.00"),
            tare_weight=Decimal("5000.00"),
            net_weight=Decimal("50000.00"),
            quality_grade="A",
            status="stored",
        )
        db_session.add_all([b1, b2])
        db_session.commit()

    predictions = ai_forecasting_service.predict_harvest_yield(
        company_id=company.id,
        crop_cycle_id=crop_cycle.id,
        db=db_session,
    )

    assert len(predictions) == 1
    pred = predictions[0]
    assert pred.crop_cycle_id == crop_cycle.id
    assert pred.crop_cycle_code == crop_cycle.code
    assert pred.season == "spring"
    assert pred.historical_batch_count >= 2
    assert pred.predicted_yield_kg > Decimal("0")
    assert pred.confidence_score >= Decimal("0.80")
    assert "spring" in pred.notes.lower()


def test_inventory_stockout_prediction(forecast_fixtures: dict, db_session: Session):
    company = forecast_fixtures["company"]
    stock_item = forecast_fixtures["stock_item"]
    warehouse = forecast_fixtures["warehouse"]
    zone = forecast_fixtures["zone"]

    now = datetime.now(timezone.utc)

    # Ensure lot has remaining quantity of 25 kg
    lot = db_session.scalar(
        select(StockLot).where(StockLot.company_id == company.id, StockLot.stock_item_id == stock_item.id)
    )
    if not lot:
        lot = StockLot(
            company_id=company.id,
            stock_item_id=stock_item.id,
            lot_number=f"LOT-{uuid.uuid4().hex[:6]}",
            initial_quantity=Decimal("100.0"),
            remaining_quantity=Decimal("25.0"),
            unit_cost=Decimal("80.00"),
            received_date=now - timedelta(days=20),
            status="active",
        )
        db_session.add(lot)
        db_session.commit()
        db_session.refresh(lot)
    else:
        lot.remaining_quantity = Decimal("25.0")
        db_session.commit()

    # Clean and re-seed stock movements (issue velocity): 150 kg consumed over 30 days = 5.0 kg/day
    db_session.query(StockMovement).filter(StockMovement.stock_item_id == stock_item.id).delete()
    db_session.commit()

    for i in range(1, 6):
        m = StockMovement(
            company_id=company.id,
            movement_number=f"MOV-OUT-{uuid.uuid4().hex[:6]}",
            stock_item_id=stock_item.id,
            lot_id=lot.id,
            warehouse_id=warehouse.id,
            zone_id=zone.id,
            movement_type="outbound",
            quantity=Decimal("30.0"),
            unit_cost=Decimal("80.00"),
            balance_after=Decimal("25.0"),
            created_at=now - timedelta(days=i * 2),
        )
        db_session.add(m)
    db_session.commit()

    forecasts = ai_forecasting_service.predict_stockouts(
        company_id=company.id,
        window_days=30,
        risk_threshold_days=14,
        db=db_session,
    )

    matching = [f for f in forecasts if f.stock_item_id == stock_item.id]
    assert len(matching) == 1
    risk_item = matching[0]

    assert risk_item.sku == stock_item.sku
    assert risk_item.current_stock == Decimal("25.0")
    assert risk_item.daily_consumption_velocity > Decimal("0")
    assert risk_item.days_until_stockout is not None
    assert risk_item.days_until_stockout <= Decimal("14.0")
    assert risk_item.risk_level in ("WARNING", "CRITICAL")
    assert risk_item.recommended_reorder_qty > Decimal("0")


def test_fleet_anomaly_detection(forecast_fixtures: dict, db_session: Session):
    company = forecast_fixtures["company"]
    v_normal = forecast_fixtures["v_normal"]
    v_anomaly = forecast_fixtures["v_anomaly"]

    now = datetime.now(timezone.utc)

    # Seed transactions for normal vehicle (efficient: 25 L/100km, modest maintenance)
    fn = db_session.scalar(select(FuelTransaction).where(FuelTransaction.vehicle_id == v_normal.id))
    if not fn:
        ft_norm = FuelTransaction(
            company_id=company.id,
            transaction_number=f"FT-N-{uuid.uuid4().hex[:6]}",
            vehicle_id=v_normal.id,
            liters=Decimal("250.0"),
            fuel_type="diesel",
            unit_price=Decimal("1.50"),
            total_amount=Decimal("375.00"),
            odometer_reading=Decimal("121000.0"),  # 1000 km for 250 L = 25 L/100km
            transaction_date=now - timedelta(days=5),
        )
        db_session.add(ft_norm)

        wo_norm = MaintenanceWorkOrder(
            company_id=company.id,
            order_number=f"WO-N-{uuid.uuid4().hex[:6]}",
            vehicle_id=v_normal.id,
            order_type="routine",
            priority="low",
            status="completed",
            description="Routine oil and filter change",
            total_cost=Decimal("600.00"),
            completed_date=now - timedelta(days=12),
        )
        db_session.add(wo_norm)
        db_session.commit()

    # Seed transactions for anomalous vehicle (high fuel: 60 L/100km, spike maintenance: 15,000 SAR)
    fa = db_session.scalar(select(FuelTransaction).where(FuelTransaction.vehicle_id == v_anomaly.id))
    if not fa:
        ft_anom = FuelTransaction(
            company_id=company.id,
            transaction_number=f"FT-A-{uuid.uuid4().hex[:6]}",
            vehicle_id=v_anomaly.id,
            liters=Decimal("600.0"),
            fuel_type="diesel",
            unit_price=Decimal("1.50"),
            total_amount=Decimal("900.00"),
            odometer_reading=Decimal("281000.0"),  # 1000 km for 600 L = 60 L/100km (> baseline)
            transaction_date=now - timedelta(days=4),
        )
        db_session.add(ft_anom)

        wo_anom = MaintenanceWorkOrder(
            company_id=company.id,
            order_number=f"WO-A-{uuid.uuid4().hex[:6]}",
            vehicle_id=v_anomaly.id,
            order_type="emergency",
            priority="urgent",
            status="completed",
            description="Major gearbox replacement and turbo overhaul",
            total_cost=Decimal("15000.00"),
            completed_date=now - timedelta(days=8),
        )
        db_session.add(wo_anom)
        db_session.commit()

    anomalies = ai_forecasting_service.detect_fleet_anomalies(
        company_id=company.id,
        db=db_session,
    )

    assert len(anomalies) >= 1
    anomaly_vehicles = [a.vehicle_id for a in anomalies]
    assert v_anomaly.id in anomaly_vehicles

    v_anom_alerts = [a for a in anomalies if a.vehicle_id == v_anomaly.id]
    types = {a.anomaly_type for a in v_anom_alerts}
    assert "ABNORMAL_FUEL_CONSUMPTION" in types or "MAINTENANCE_COST_SPIKE" in types
    for alert in v_anom_alerts:
        assert alert.severity in ("MEDIUM", "HIGH", "CRITICAL")
        assert alert.fleet_baseline_value is not None
        assert alert.metric_value > alert.fleet_baseline_value


def test_restock_proposal_hitl_governance(forecast_fixtures: dict, db_session: Session):
    company = forecast_fixtures["company"]
    admin = forecast_fixtures["admin"]
    stock_item = forecast_fixtures["stock_item"]
    warehouse = forecast_fixtures["warehouse"]
    zone = forecast_fixtures["zone"]

    # Request high-volume restock: 200 units @ 80.00 = 16,000 SAR (> 10,000 SAR HITL threshold)
    request_data = RestockProposalRequest(
        stock_item_id=stock_item.id,
        warehouse_id=warehouse.id,
        target_quantity=Decimal("200.0"),
        supplier_hint="Primary Agro Supplies",
    )

    proposal_dict, gov_log = ai_forecasting_service.generate_restock_proposal(
        company_id=company.id,
        user_id=admin.id,
        request=request_data,
        db=db_session,
    )

    assert proposal_dict["sku"] == stock_item.sku
    assert Decimal(str(proposal_dict["quantity"])) == Decimal("200.0")
    assert Decimal(str(proposal_dict["total_cost"])) >= Decimal("16000.00")
    assert gov_log.hitl_required is True
    assert gov_log.safety_validation_status == "PENDING_APPROVAL"
    assert gov_log.risk_level in ("MEDIUM", "HIGH")
    assert gov_log.hitl_approval_token is not None

    # Approve the proposal via ai_governance_engine
    approved = ai_governance_engine.approve_hitl_proposal(
        log_id=gov_log.id,
        approver_user=admin,
        approval_token=gov_log.hitl_approval_token,
        db=db_session,
    )
    assert approved.hitl_approved is True
    assert approved.execution_status == "APPROVED"


def test_api_predictive_forecast_endpoints(forecast_fixtures: dict, db_session: Session):
    company = forecast_fixtures["company"]
    admin = forecast_fixtures["admin"]
    stock_item = forecast_fixtures["stock_item"]
    warehouse = forecast_fixtures["warehouse"]
    zone = forecast_fixtures["zone"]

    client = TestClient(app)
    app.dependency_overrides[get_authenticated_user] = lambda: admin
    app.dependency_overrides[get_active_company_id] = lambda: company.id

    try:
        # 1. Agricultural Yield Endpoint
        res_yield = client.get(
            "/api/ai/forecast/yield",
            headers={"X-Company-ID": str(company.id)},
        )
        assert res_yield.status_code == 200
        yield_data = res_yield.json()
        assert isinstance(yield_data, list)
        assert len(yield_data) >= 1
        assert "predicted_yield_kg" in yield_data[0]
        assert "confidence_score" in yield_data[0]

        # 2. Stockout Risk Endpoint
        res_stockout = client.get(
            "/api/ai/forecast/stockout?window_days=30&risk_threshold_days=14",
            headers={"X-Company-ID": str(company.id)},
        )
        assert res_stockout.status_code == 200
        stockout_data = res_stockout.json()
        assert isinstance(stockout_data, list)
        assert len(stockout_data) >= 1
        assert any(item["sku"] == stock_item.sku for item in stockout_data)

        # 3. Fleet Anomalies Endpoint
        res_anom = client.get(
            "/api/ai/forecast/fleet-anomalies",
            headers={"X-Company-ID": str(company.id)},
        )
        assert res_anom.status_code == 200
        anom_data = res_anom.json()
        assert isinstance(anom_data, list)
        assert len(anom_data) >= 1
        assert "anomaly_type" in anom_data[0]
        assert "severity" in anom_data[0]

        # 4. Restock Proposal Endpoint
        res_prop = client.post(
            "/api/ai/forecast/restock-proposal",
            headers={"X-Company-ID": str(company.id)},
            json={
                "stock_item_id": str(stock_item.id),
                "warehouse_id": str(warehouse.id),
                "target_quantity": 150.0,
                "supplier_hint": "API test for automated replenishment proposal",
            },
        )
        assert res_prop.status_code == 200
        prop_data = res_prop.json()
        assert prop_data["sku"] == stock_item.sku
        assert Decimal(str(prop_data["proposed_quantity"])) == Decimal("150.0")
        assert prop_data["hitl_required"] is True
        assert prop_data["governance_log_id"] is not None
        assert prop_data["hitl_approval_token"] is not None

    finally:
        app.dependency_overrides.clear()
