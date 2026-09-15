"""
OxenGL Finance Domain Services.
Provides double-entry ledger processing, account lookups, and transaction posting pipelines.
"""
import logging
import uuid
from decimal import Decimal
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status

from backend.app.domains.finance.models import (
    Account,
    JournalEntry,
    JournalLine,
    FinanceJournalEntry,
    FinanceJournalLine,
)
from backend.app.domains.finance.guards import (
    enforce_double_entry_balance,
    validate_double_entry_invariance,
)

logger = logging.getLogger("oxengl.domains.finance")


class TransactionProcessingService:
    """Core transaction processing engine with strict double-entry ledger isolation."""

    @classmethod
    @enforce_double_entry_balance
    def post_balanced_entry(
        cls,
        db: Session,
        tenant_id: uuid.UUID,
        description: str,
        lines: List[Dict[str, Any]],
        company_id: Optional[uuid.UUID] = None,
        posted_by: Optional[uuid.UUID] = None,
    ) -> FinanceJournalEntry:
        """
        Posts a verified, balanced double-entry voucher directly into finance_journal_entries.
        Enforces sum(Debits) == sum(Credits) at the transactional boundary.
        """
        total_debit, total_credit = validate_double_entry_invariance(lines)

        entry_number = f"JV-{uuid.uuid4().hex[:8].upper()}"
        entry = FinanceJournalEntry(
            tenant_id=tenant_id,
            company_id=company_id,
            entry_number=entry_number,
            description=description,
            total_debit=total_debit,
            total_credit=total_credit,
            status="POSTED",
            posted_by=posted_by,
        )
        db.add(entry)
        db.flush()

        for line_data in lines:
            dr = Decimal(str(line_data.get("debit", 0.0) or "0.0000"))
            cr = Decimal(str(line_data.get("credit", 0.0) or "0.0000"))
            account_code = str(line_data.get("account_code", ""))
            line_desc = line_data.get("description") or description

            jl = FinanceJournalLine(
                tenant_id=tenant_id,
                entry_id=entry.id,
                account_code=account_code,
                description=line_desc,
                debit=dr,
                credit=cr,
            )
            db.add(jl)

        db.commit()
        db.refresh(entry)
        logger.info(
            f"Successfully posted balanced journal entry {entry.entry_number} for tenant {tenant_id}: "
            f"Debits={total_debit}, Credits={total_credit}"
        )
        return entry
