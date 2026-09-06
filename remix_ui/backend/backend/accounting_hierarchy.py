from __future__ import annotations

from typing import Iterable

from sqlalchemy import text
from sqlalchemy.orm import Session

from .models import ChartOfAccount, CostCenter


class AccountingHierarchyError(ValueError):
    pass


def validate_journal_posting_lines(db: Session, lines: Iterable[object]) -> None:
    """Validate account and cost-center rules without changing the existing line payload shape."""
    for line in lines:
        account_code = str(getattr(line, "account", "")).strip()
        cost_center_id = getattr(line, "cost_center_id", None)
        if cost_center_id:
            cost_center = db.get(CostCenter, str(cost_center_id))
            if cost_center is None or not cost_center.is_leaf:
                raise AccountingHierarchyError("cost_center_id must reference an active leaf cost center.")
        account = db.get(ChartOfAccount, account_code)
        if account is None:
            # Legacy clients use descriptive account labels; enforce hierarchy rules for configured COA accounts.
            continue
        if not account.is_postable:
            raise AccountingHierarchyError(f"Account {account_code} is a structural summary account and cannot receive postings.")

        requires_cost_center = (account.account_type or "").strip().lower() in {"expense", "revenue"}
        if requires_cost_center and not cost_center_id:
            raise AccountingHierarchyError(f"Expense or revenue account {account_code} requires a leaf cost center.")


def get_account_rollup(db: Session, account_code: str) -> dict[str, float | str]:
    """Return the existing flat balance keys for an account and every descendant account."""
    account = db.get(ChartOfAccount, account_code)
    if account is None:
        raise AccountingHierarchyError(f"Chart of account {account_code} was not found.")

    result = db.execute(
        text(
            """
            WITH RECURSIVE account_tree(account_code) AS (
                SELECT account_code FROM chart_of_accounts WHERE account_code = :account_code
                UNION ALL
                SELECT child.account_code
                FROM chart_of_accounts AS child
                JOIN account_tree AS parent ON child.parent_code = parent.account_code
            )
            SELECT
                COALESCE(SUM(journal_lines.debit), 0) AS total_debit,
                COALESCE(SUM(journal_lines.credit), 0) AS total_credit
            FROM journal_lines
            JOIN journal_entries ON journal_entries.id = journal_lines.journal_entry_id
            WHERE journal_lines.account IN (SELECT account_code FROM account_tree)
              AND journal_entries.status = 'Posted'
            """
        ),
        {"account_code": account_code},
    ).mappings().one()
    total_debit = float(result["total_debit"])
    total_credit = float(result["total_credit"])
    return {
        "account_code": account_code,
        "total_debit": total_debit,
        "total_credit": total_credit,
        "balance": total_debit - total_credit,
    }