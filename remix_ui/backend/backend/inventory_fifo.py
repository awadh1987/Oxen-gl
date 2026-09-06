from decimal import Decimal, ROUND_HALF_UP

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from .models import InventoryLayer


def consume_inventory_fifo(sku: str, qty_to_consume: int, db: Session) -> Decimal:
    if qty_to_consume <= 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Quantity to consume must be greater than zero")

    layers = db.query(InventoryLayer).filter(
        InventoryLayer.item_sku == sku,
        InventoryLayer.remaining_quantity > 0,
    ).order_by(InventoryLayer.purchase_date.asc(), InventoryLayer.id.asc()).all()
    if sum(layer.remaining_quantity for layer in layers) < qty_to_consume:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Insufficient inventory for SKU {sku}")

    remaining_to_consume = qty_to_consume
    total_cost = Decimal("0.00")
    for layer in layers:
        consumed_quantity = min(layer.remaining_quantity, remaining_to_consume)
        total_cost += Decimal(layer.unit_cost) * consumed_quantity
        layer.remaining_quantity -= consumed_quantity
        remaining_to_consume -= consumed_quantity
        if remaining_to_consume == 0:
            break

    return total_cost.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)