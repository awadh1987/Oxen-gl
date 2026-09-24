"""
Inventory Management & Double-Entry Financial Ledger API Router.
Implements Phase 8 Inventory Ledger Integration:
- Warehouse and Product Catalog Management
- Perpetual Inventory Movements and Stock Adjustments
- Balanced Double-Entry General Ledger posting (total_debit == total_credit)
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import desc, select, func
from sqlalchemy.orm import Session

try:
    from backend.database import get_db
    from backend.models import (
        Warehouse,
        ProductProduct,
        InventoryMovement,
        FinanceJournalEntry,
        FinanceJournalLine,
        ResCompany,
    )
except ImportError:
    from database import get_db
    from models import (
        Warehouse,
        ProductProduct,
        InventoryMovement,
        FinanceJournalEntry,
        FinanceJournalLine,
        ResCompany,
    )

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/inventory", tags=["Inventory & Financial Ledger"])


# ==============================================================================
# Pydantic Schemas
# ==============================================================================

class JournalLineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    account_code: str
    account_id: Optional[uuid.UUID] = None
    description: Optional[str] = None
    debit: Decimal
    credit: Decimal


class JournalEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    company_id: Optional[uuid.UUID] = None
    entry_number: str
    entry_date: datetime
    description: str
    total_debit: Decimal
    total_credit: Decimal
    status: str
    lines: List[JournalLineResponse] = []


class WarehouseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    company_id: uuid.UUID
    code: str
    name: str
    address: Optional[str] = None
    is_active: bool


class WarehouseCreate(BaseModel):
    code: str
    name: str
    address: Optional[str] = None
    company_id: Optional[uuid.UUID] = None


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sku: str
    name: str
    product_type: str
    unit_of_measure: str
    standard_cost: Decimal
    sale_price: Decimal
    is_active: bool


class ProductCreate(BaseModel):
    sku: str
    name: str
    product_type: str = "storable"
    unit_of_measure: str = "ton"
    standard_cost: Decimal = Decimal("0.0000")
    sale_price: Decimal = Decimal("0.0000")
    company_id: Optional[uuid.UUID] = None


class InventoryMovementCreate(BaseModel):
    tenant_id: Optional[uuid.UUID] = None
    company_id: Optional[uuid.UUID] = None
    warehouse_id: uuid.UUID
    product_id: Optional[uuid.UUID] = None
    movement_type: str = "ADJUSTMENT"  # ADJUSTMENT, INBOUND, OUTBOUND, TRANSFER, SCRAP
    quantity: Decimal
    unit_cost: Decimal = Decimal("0.0000")
    total_cost: Optional[Decimal] = None
    reason: Optional[str] = None
    reference: Optional[str] = None


class InventoryMovementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    company_id: Optional[uuid.UUID] = None
    movement_number: str
    movement_type: str
    warehouse_id: uuid.UUID
    warehouse_name: str
    product_id: Optional[uuid.UUID] = None
    product_name: str
    quantity: Decimal
    unit_cost: Decimal
    total_cost: Decimal
    reason: Optional[str] = None
    reference: Optional[str] = None
    status: str
    is_posted: bool
    journal_entry_id: Optional[uuid.UUID] = None
    created_at: datetime


class InventoryValuationSummary(BaseModel):
    total_valuation: Decimal
    total_items: int
    posted_movements: int
    pending_movements: int


# ==============================================================================
# Helper Methods
# ==============================================================================

def _resolve_company_id(db: Session, comp_id: Optional[uuid.UUID] = None) -> uuid.UUID:
    if comp_id:
        return comp_id
    comp = db.query(ResCompany).first()
    return comp.id if comp else uuid.UUID("a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d")


def _format_movement_response(movement: InventoryMovement, db: Session) -> InventoryMovementResponse:
    wh_name = "Central Warehouse"
    if movement.warehouse:
        wh_name = movement.warehouse.name
    elif movement.warehouse_id:
        wh = db.query(Warehouse).filter(Warehouse.id == movement.warehouse_id).first()
        if wh:
            wh_name = wh.name

    prod_name = "Standard Stock Item"
    if movement.product:
        prod_name = movement.product.name
    elif movement.product_id:
        prod = db.query(ProductProduct).filter(ProductProduct.id == movement.product_id).first()
        if prod:
            prod_name = prod.name

    return InventoryMovementResponse(
        id=movement.id,
        tenant_id=movement.tenant_id,
        company_id=movement.company_id,
        movement_number=movement.movement_number,
        movement_type=movement.movement_type,
        warehouse_id=movement.warehouse_id,
        warehouse_name=wh_name,
        product_id=movement.product_id,
        product_name=prod_name,
        quantity=movement.quantity,
        unit_cost=movement.unit_cost,
        total_cost=movement.total_cost,
        reason=movement.reason,
        reference=movement.reference,
        status=movement.status,
        is_posted=movement.is_posted,
        journal_entry_id=movement.journal_entry_id,
        created_at=movement.created_at,
    )


# ==============================================================================
# Warehouse & Product Catalog Endpoints
# ==============================================================================

@router.get("/warehouses", response_model=List[WarehouseResponse])
def list_warehouses(
    db: Session = Depends(get_db),
    company_id: Optional[uuid.UUID] = None,
):
    """List warehouses; auto-seed a default warehouse if none exist."""
    query = db.query(Warehouse)
    if company_id:
        query = query.filter(Warehouse.company_id == company_id)
    warehouses = query.order_by(Warehouse.code).all()

    if not warehouses:
        cid = _resolve_company_id(db, company_id)
        default_wh = Warehouse(
            id=uuid.uuid4(),
            company_id=cid,
            code="WH-MAIN",
            name="المستودع اللوجستي الرئيسي / Central Hub",
            address="King Fahd Industrial Port Logistics Yard",
            is_active=True,
        )
        db.add(default_wh)
        db.commit()
        db.refresh(default_wh)
        warehouses = [default_wh]

    return warehouses


@router.post("/warehouses", response_model=WarehouseResponse, status_code=status.HTTP_201_CREATED)
def create_warehouse(
    payload: WarehouseCreate,
    db: Session = Depends(get_db),
):
    """Create a new warehouse location."""
    cid = _resolve_company_id(db, payload.company_id)
    existing = db.query(Warehouse).filter(Warehouse.company_id == cid, Warehouse.code == payload.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Warehouse code '{payload.code}' already exists.",
        )

    wh = Warehouse(
        id=uuid.uuid4(),
        company_id=cid,
        code=payload.code,
        name=payload.name,
        address=payload.address,
        is_active=True,
    )
    db.add(wh)
    db.commit()
    db.refresh(wh)
    return wh


@router.get("/products", response_model=List[ProductResponse])
def list_products(
    db: Session = Depends(get_db),
    company_id: Optional[uuid.UUID] = None,
):
    """List products from product catalog."""
    query = db.query(ProductProduct)
    if company_id:
        query = query.filter(ProductProduct.company_id == company_id)
    return query.order_by(ProductProduct.name).limit(100).all()


@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
):
    """Create a product catalog item."""
    cid = _resolve_company_id(db, payload.company_id)
    existing = db.query(ProductProduct).filter(ProductProduct.sku == payload.sku).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Product SKU '{payload.sku}' already exists.")

    prod = ProductProduct(
        id=uuid.uuid4(),
        company_id=cid,
        sku=payload.sku,
        name=payload.name,
        product_type=payload.product_type,
        unit_of_measure=payload.unit_of_measure,
        standard_cost=payload.standard_cost,
        sale_price=payload.sale_price,
        is_active=True,
    )
    db.add(prod)
    db.commit()
    db.refresh(prod)
    return prod


# ==============================================================================
# Inventory Movement Endpoints
# ==============================================================================

@router.get("/movements", response_model=List[InventoryMovementResponse])
def list_inventory_movements(
    warehouse_id: Optional[uuid.UUID] = None,
    product_id: Optional[uuid.UUID] = None,
    movement_type: Optional[str] = None,
    is_posted: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    """List inventory movements with joined warehouse and product details."""
    query = db.query(InventoryMovement)
    if warehouse_id:
        query = query.filter(InventoryMovement.warehouse_id == warehouse_id)
    if product_id:
        query = query.filter(InventoryMovement.product_id == product_id)
    if movement_type:
        query = query.filter(InventoryMovement.movement_type == movement_type)
    if is_posted is not None:
        query = query.filter(InventoryMovement.is_posted == is_posted)

    movements = query.order_by(desc(InventoryMovement.created_at)).all()
    return [_format_movement_response(m, db) for m in movements]


@router.get("/movements/{movement_id}", response_model=InventoryMovementResponse)
def get_inventory_movement(
    movement_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """Retrieve details for a single inventory movement."""
    movement = db.query(InventoryMovement).filter(InventoryMovement.id == movement_id).first()
    if not movement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory movement not found.")
    return _format_movement_response(movement, db)


@router.post("/movements", response_model=InventoryMovementResponse, status_code=status.HTTP_201_CREATED)
def create_inventory_movement(
    payload: InventoryMovementCreate,
    db: Session = Depends(get_db),
):
    """Create a new stock movement or adjustment."""
    cid = _resolve_company_id(db, payload.company_id)
    tenant_id = payload.tenant_id or cid

    # Ensure warehouse exists
    wh = db.query(Warehouse).filter(Warehouse.id == payload.warehouse_id).first()
    if not wh:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Warehouse '{payload.warehouse_id}' not found.")

    qty = Decimal(str(payload.quantity))
    unit_cost = Decimal(str(payload.unit_cost))
    total_cost = payload.total_cost
    if total_cost is None:
        total_cost = abs(qty * unit_cost)
    else:
        total_cost = Decimal(str(total_cost))

    movement_num = f"MOV-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    movement = InventoryMovement(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        company_id=cid,
        movement_number=movement_num,
        movement_type=payload.movement_type.upper(),
        warehouse_id=payload.warehouse_id,
        product_id=payload.product_id,
        quantity=qty,
        unit_cost=unit_cost,
        total_cost=total_cost,
        reason=payload.reason or "Inventory Valuation Adjustment",
        reference=payload.reference,
        status="COMPLETED",
        is_posted=False,
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return _format_movement_response(movement, db)


# ==============================================================================
# Phase 8 Core: Post Inventory Movement to General Ledger
# ==============================================================================

@router.post("/movements/{movement_id}/post-ledger", response_model=JournalEntryResponse)
def post_inventory_movement_to_ledger(
    movement_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """
    Approves an inventory movement/adjustment and posts a balanced double-entry
    journal entry to the General Ledger.

    Enforces debit/credit mathematical invariance:
      total_debit (Asset or Valuation Adjustment) == total_credit (Cost Variance or Asset)
    """
    movement = db.query(InventoryMovement).filter(InventoryMovement.id == movement_id).first()
    if not movement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inventory movement '{movement_id}' not found.",
        )

    if movement.is_posted:
        if movement.journal_entry_id:
            existing_entry = db.query(FinanceJournalEntry).filter(FinanceJournalEntry.id == movement.journal_entry_id).first()
            if existing_entry:
                return existing_entry
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Movement '{movement.movement_number}' has already been posted to the general ledger.",
        )

    qty = Decimal(str(movement.quantity))
    unit_cost = Decimal(str(movement.unit_cost))
    total_cost = Decimal(str(movement.total_cost))

    if total_cost <= Decimal("0.0000"):
        total_cost = abs(qty * unit_cost)

    if total_cost <= Decimal("0.0000"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invariance Failure: Movement total cost must be greater than zero for ledger posting.",
        )

    # Double-entry mathematical invariance
    total_debit = total_cost
    total_credit = total_cost

    if total_debit != total_credit:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invariance Failure: Debits ({total_debit}) do not balance with credits ({total_credit}).",
        )

    item_name = "Stock Item"
    if movement.product_id:
        prod = db.query(ProductProduct).filter(ProductProduct.id == movement.product_id).first()
        if prod:
            item_name = prod.name

    wh_name = "Warehouse"
    if movement.warehouse_id:
        wh = db.query(Warehouse).filter(Warehouse.id == movement.warehouse_id).first()
        if wh:
            wh_name = wh.name

    # Create Master Journal Voucher Entry
    entry = FinanceJournalEntry(
        id=uuid.uuid4(),
        tenant_id=movement.tenant_id,
        company_id=movement.company_id,
        entry_number=f"INV-{movement.movement_number}-{uuid.uuid4().hex[:6].upper()}",
        description=f"Inventory Adjustment {movement.movement_number} ({movement.movement_type}) for {item_name} at {wh_name}",
        entry_date=datetime.now(timezone.utc),
        total_debit=total_debit,
        total_credit=total_credit,
        status="POSTED",
        created_at=datetime.now(timezone.utc),
    )
    db.add(entry)
    db.flush()

    # Balanced Journal Lines:
    # If quantity >= 0 (Stock Gain / Receipt / Positive Adjustment):
    #   Debit: 120000 (Inventory Asset / Stock on Hand)
    #   Credit: 520000 (Inventory Valuation Adjustment / Variance Gain)
    # If quantity < 0 (Stock Reduction / Shrinkage / Scrap / Issue):
    #   Debit: 520000 (Inventory Adjustment Expense / Scrap Loss)
    #   Credit: 120000 (Inventory Asset / Stock on Hand)
    if qty >= Decimal("0.0000"):
        debit_account = "120000"
        debit_desc = f"Inventory Asset Increase - {movement.movement_number} ({item_name})"
        credit_account = "520000"
        credit_desc = f"Inventory Valuation Gain/Adjustment - {movement.movement_number}"
    else:
        debit_account = "520000"
        debit_desc = f"Inventory Adjustment Loss/Scrap - {movement.movement_number} ({item_name})"
        credit_account = "120000"
        credit_desc = f"Inventory Asset Decrease - {movement.movement_number}"

    lines = [
        FinanceJournalLine(
            id=uuid.uuid4(),
            tenant_id=movement.tenant_id,
            entry_id=entry.id,
            account_code=debit_account,
            description=debit_desc,
            debit=total_debit,
            credit=Decimal("0.0000"),
        ),
        FinanceJournalLine(
            id=uuid.uuid4(),
            tenant_id=movement.tenant_id,
            entry_id=entry.id,
            account_code=credit_account,
            description=credit_desc,
            debit=Decimal("0.0000"),
            credit=total_credit,
        ),
    ]

    db.add_all(lines)

    # Link movement to journal entry and update state
    movement.is_posted = True
    movement.journal_entry_id = entry.id
    movement.status = "POSTED"

    db.commit()
    db.refresh(entry)
    db.refresh(movement)
    return entry


# ==============================================================================
# Inventory Valuation Summary
# ==============================================================================

@router.get("/valuation", response_model=InventoryValuationSummary)
def get_inventory_valuation_summary(
    warehouse_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
):
    """Retrieve aggregate inventory valuation and posting metrics."""
    query = db.query(InventoryMovement)
    if warehouse_id:
        query = query.filter(InventoryMovement.warehouse_id == warehouse_id)

    movements = query.all()
    total_val = sum((Decimal(str(m.total_cost)) for m in movements), Decimal("0.0000"))
    posted_count = sum(1 for m in movements if m.is_posted)
    pending_count = len(movements) - posted_count

    return InventoryValuationSummary(
        total_valuation=total_val,
        total_items=len(movements),
        posted_movements=posted_count,
        pending_movements=pending_count,
    )
