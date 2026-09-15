import asyncio
import uuid
import random
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import SessionLocal
from backend.app.domains.inventory.models import StockBalance

TENANT_ID = uuid.UUID("fc04f267-47ac-4bb4-bcd3-285425c4df69")
WAREHOUSE_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
MATERIAL_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")

async def seed_historical_stock_ledger():
    db = SessionLocal()
    print("[DATA SEED] Commencing 6-month historical stock valuation data generation injection...")
    
    base_date = datetime.utcnow() - timedelta(days=180)
    base_value = 120000.00  # Starting capital buffer: $120,000
    
    for day in range(180):
        current_date = base_date + timedelta(days=day)
        # Apply an upward trending linear slope (+250/day) mixed with a +/- $5,000 noise variance parameter
        simulated_value = base_value + (day * 250.00) + random.uniform(-5000.00, 5000.00)
        
        balance_snapshot = StockBalance(
            id=uuid.uuid4(),
            tenant_id=TENANT_ID,
            warehouse_id=WAREHOUSE_ID,
            material_id=MATERIAL_ID,
            quantity_on_hand=Decimal("1000.0000"),
            quantity_reserved=Decimal("0.0000"),
            unit_cost_moving_avg=Decimal(f"{simulated_value / 1000.0:.4f}"),
            total_valuation=Decimal(f"{max(1000.00, simulated_value):.4f}"),
            last_revaluation_date=current_date
        )
        db.add(balance_snapshot)
        
        if day % 30 == 0:
            await db.flush()  # type: ignore[misc]
            
    await db.commit()  # type: ignore[misc]
    print("[DATA SEED] Complete. 180 historical ledger entries successfully seeded into PostgreSQL.")
    db.close()

if __name__ == "__main__":
    asyncio.run(seed_historical_stock_ledger())
