from decimal import Decimal

from sqlalchemy import text
from sqlalchemy.orm import Session


def get_fiscal_branch_balances(db: Session, parent_account: str, fiscal_year: int) -> list[dict[str, object]]:
    """Return signed base-currency balances by postable account and cost center for fiscal closing."""
    rows = db.execute(
        text(
            """
            WITH RECURSIVE account_tree(account_code) AS (
                SELECT account_code FROM chart_of_accounts WHERE account_code = :parent_account
                UNION ALL
                SELECT child.account_code
                FROM chart_of_accounts AS child
                JOIN account_tree AS parent ON child.parent_code = parent.account_code
            )
            SELECT
                journal_lines.account,
                journal_lines.cost_center_id,
                COALESCE(SUM(journal_lines.base_debit), 0) - COALESCE(SUM(journal_lines.base_credit), 0) AS balance
            FROM journal_lines
            JOIN journal_entries ON journal_entries.id = journal_lines.journal_entry_id
            WHERE journal_lines.account IN (SELECT account_code FROM account_tree)
              AND journal_entries.fiscal_year = :fiscal_year
              AND journal_entries.status IN ('POSTED_TO_MAIN_LEDGER', 'Posted', 'Approved')
            GROUP BY journal_lines.account, journal_lines.cost_center_id
            HAVING balance <> 0
            """
        ),
        {"parent_account": parent_account, "fiscal_year": fiscal_year},
    ).mappings().all()
    return [
        {
            "account": row["account"],
            "cost_center_id": row["cost_center_id"],
            "balance": Decimal(str(row["balance"])),
        }
        for row in rows
    ]