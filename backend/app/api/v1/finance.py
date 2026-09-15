"""
OxenGL General Ledger API Endpoints.
Guarantees strict Double-Entry balancing and audit validation.
"""

import uuid
from decimal import Decimal
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.database import get_db
from backend.app.domains.finance.models import (
    Account,
    JournalEntry,
    JournalLine,
    FinanceJournalEntry,
    FinanceJournalLine,
)
from backend.app.domains.finance.guards import enforce_double_entry_balance
from backend.app.security.abac import enforce_abac

router = APIRouter(prefix="/api/v1/finance", tags=["General Ledger"])


# ==============================================================================
# Pydantic Schemas
# ==============================================================================

class JournalLineItem(BaseModel):
    account_code: str
    debit: float = 0.0
    credit: float = 0.0
    description: Optional[str] = None
    cost_center_id: Optional[uuid.UUID] = None


class JournalEntryCreate(BaseModel):
    description: str
    entry_date: Optional[str] = None
    lines: List[JournalLineItem]


# ==============================================================================
# Endpoints
# ==============================================================================

@router.post(
    "/journals",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(enforce_abac("WRITE"))],
)
@enforce_double_entry_balance
def create_journal_entry(
    payload: JournalEntryCreate,
    db: Session = Depends(get_db),
    x_tenant_id: Optional[str] = Header(None),
    x_company_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
):
    """
    Creates and posts a new balanced General Ledger Journal Entry.
    Enforces strict mathematical Double-Entry constraint (Sum Debits == Sum Credits).
    """
    if not payload.lines or len(payload.lines) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Journal entry must contain at least two transaction lines.",
        )

    tenant_uuid = uuid.UUID(x_tenant_id) if x_tenant_id else uuid.UUID("a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d")
    company_uuid = uuid.UUID(x_company_id) if x_company_id else uuid.UUID("f5e4d3c2-b1a0-9f8e-7d6c-5b4a3f2e1d0c")
    user_uuid = uuid.UUID(x_user_id) if x_user_id else None

    # 1. Calculate Sum Debits and Credits using high-precision Decimal
    total_debit = Decimal("0.0000")
    total_credit = Decimal("0.0000")

    for line in payload.lines:
        dr = Decimal(str(line.debit))
        cr = Decimal(str(line.credit))
        if dr < 0 or cr < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debit and credit amounts must be non-negative.",
            )
        if dr > 0 and cr > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A journal line cannot possess both debit and credit amounts.",
            )
        total_debit += dr
        total_credit += cr

    # 2. Strict Double-Entry Balancing Verification
    discrepancy = abs(total_debit - total_credit)
    if discrepancy > Decimal("0.0001"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unbalanced journal entry: Total debits ({total_debit:.2f}) "
                f"must strictly equal total credits ({total_credit:.2f}). "
                f"Discrepancy: {discrepancy:.2f}"
            ),
        )

    if total_debit <= Decimal("0.0000"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Journal entry total must be greater than zero.",
        )

    entry_number = f"JV-{uuid.uuid4().hex[:8].upper()}"

    # 3. Create Journal Entry Header
    entry = JournalEntry(
        tenant_id=tenant_uuid,
        company_id=company_uuid,
        entry_number=entry_number,
        description=payload.description,
        total_debit=total_debit,
        total_credit=total_credit,
        status="POSTED",
        posted_by=user_uuid,
    )
    db.add(entry)
    db.flush()

    # 4. Create Journal Lines
    for line in payload.lines:
        dr = Decimal(str(line.debit))
        cr = Decimal(str(line.credit))
        j_line = JournalLine(
            entry_id=entry.id,
            account_code=line.account_code,
            debit=dr,
            credit=cr,
            description=line.description or payload.description,
            cost_center_id=line.cost_center_id,
        )
        db.add(j_line)

    db.commit()
    db.refresh(entry)

    return {
        "id": str(entry.id),
        "entry_number": entry.entry_number,
        "description": entry.description,
        "total_debit": float(entry.total_debit),
        "total_credit": float(entry.total_credit),
        "status": entry.status,
    }


@router.get("/journals")
def list_journal_entries(
    db: Session = Depends(get_db),
    x_tenant_id: Optional[str] = Header(None),
):
    """Lists posted journal vouchers."""
    entries = db.execute(
        select(JournalEntry).order_by(JournalEntry.created_at.desc()).limit(100)
    ).scalars().all()

    return [
        {
            "id": str(e.id),
            "entry_number": e.entry_number,
            "description": e.description,
            "entry_date": e.entry_date.isoformat(),
            "total_debit": float(e.total_debit),
            "total_credit": float(e.total_credit),
            "status": e.status,
        }
        for e in entries
    ]


@router.post(
    "/vouchers/balanced",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(enforce_abac("WRITE"))],
)
@enforce_double_entry_balance
def post_balanced_financial_voucher(
    payload: JournalEntryCreate,
    db: Session = Depends(get_db),
    x_tenant_id: Optional[str] = Header(None),
    x_company_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
):
    """
    Directly posts a validated and balanced double-entry financial voucher into finance_journal_entries.
    Protected by the strict double-entry mathematical guard decorator.
    """
    tenant_uuid = uuid.UUID(x_tenant_id) if x_tenant_id else uuid.UUID("a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d")
    company_uuid = uuid.UUID(x_company_id) if x_company_id else None
    user_uuid = uuid.UUID(x_user_id) if x_user_id else None

    total_debit = sum(Decimal(str(l.debit)) for l in payload.lines)
    total_credit = sum(Decimal(str(l.credit)) for l in payload.lines)

    entry_number = f"JV-{uuid.uuid4().hex[:8].upper()}"
    entry = FinanceJournalEntry(
        tenant_id=tenant_uuid,
        company_id=company_uuid,
        entry_number=entry_number,
        description=payload.description,
        total_debit=total_debit,
        total_credit=total_credit,
        status="POSTED",
        posted_by=user_uuid,
    )
    db.add(entry)
    db.flush()

    for line in payload.lines:
        jl = FinanceJournalLine(
            tenant_id=tenant_uuid,
            entry_id=entry.id,
            account_code=line.account_code,
            description=line.description or payload.description,
            debit=Decimal(str(line.debit)),
            credit=Decimal(str(line.credit)),
        )
        db.add(jl)

    db.commit()
    db.refresh(entry)
    return {
        "status": "SUCCESS",
        "entry_id": str(entry.id),
        "entry_number": entry.entry_number,
        "description": entry.description,
        "total_debit": float(entry.total_debit),
        "total_credit": float(entry.total_credit),
        "lines_count": len(payload.lines),
    }


@router.get("/vouchers/balanced")
def list_balanced_financial_vouchers(
    db: Session = Depends(get_db),
    x_tenant_id: Optional[str] = Header(None),
):
    """Lists posted balanced financial vouchers from finance_journal_entries."""
    entries = db.execute(
        select(FinanceJournalEntry).order_by(FinanceJournalEntry.created_at.desc()).limit(100)
    ).scalars().all()

    return [
        {
            "id": str(e.id),
            "entry_number": e.entry_number,
            "description": e.description,
            "entry_date": e.entry_date.isoformat() if e.entry_date else None,
            "total_debit": float(e.total_debit),
            "total_credit": float(e.total_credit),
            "status": e.status,
            "lines": [
                {
                    "id": str(l.id),
                    "account_code": l.account_code,
                    "description": l.description,
                    "debit": float(l.debit),
                    "credit": float(l.credit),
                }
                for l in e.lines
            ] if hasattr(e, "lines") and e.lines else [],
        }
        for e in entries
    ]

