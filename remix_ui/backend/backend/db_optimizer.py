import time
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.orm import Session

from .database import DB_PATH


CORE_RECURSIVE_CTE = """
WITH RECURSIVE account_tree(account_code) AS (
    SELECT account_code FROM chart_of_accounts WHERE account_code = '4000'
    UNION ALL
    SELECT child.account_code
    FROM chart_of_accounts AS child
    JOIN account_tree AS parent ON child.parent_code = parent.account_code
)
SELECT
    COALESCE(SUM(journal_lines.base_debit), 0) AS total_debit,
    COALESCE(SUM(journal_lines.base_credit), 0) AS total_credit
FROM journal_lines
JOIN journal_entries ON journal_entries.id = journal_lines.journal_entry_id
WHERE journal_lines.account IN (SELECT account_code FROM account_tree)
  AND journal_entries.status IN ('POSTED_TO_MAIN_LEDGER', 'Posted', 'Approved')
  AND journal_entries.fiscal_year = :fiscal_year
"""


def _count_plan_nodes(plan: object) -> tuple[int, int]:
    if isinstance(plan, dict):
        scan_type = str(plan.get("Node Type", ""))
        index_scans = 1 if "Index" in scan_type or "Bitmap" in scan_type else 0
        sequential_scans = 1 if scan_type == "Seq Scan" else 0
        for child in plan.get("Plans", []):
            child_index_scans, child_sequential_scans = _count_plan_nodes(child)
            index_scans += child_index_scans
            sequential_scans += child_sequential_scans
        return index_scans, sequential_scans
    return 0, 0


def get_query_optimization_metrics(db: Session, fiscal_year: int) -> dict[str, float | str]:
    connection = db.connection()
    dialect = connection.dialect.name
    start = time.perf_counter()
    if dialect == "postgresql":
        explained = connection.execute(text(f"EXPLAIN (ANALYZE, FORMAT JSON) {CORE_RECURSIVE_CTE}"), {"fiscal_year": fiscal_year}).scalar_one()
        execution_time_ms = (time.perf_counter() - start) * 1000
        plan_root = explained[0] if isinstance(explained, list) else explained
        plan = plan_root.get("Plan", plan_root) if isinstance(plan_root, dict) else {}
        index_scans, sequential_scans = _count_plan_nodes(plan)
        execution_time_ms = float(plan_root.get("Execution Time", execution_time_ms)) if isinstance(plan_root, dict) else execution_time_ms
        database_file_size_mb = float(connection.execute(text("SELECT pg_database_size(current_database()) / 1048576.0")).scalar_one())
    else:
        plan_rows = connection.execute(text(f"EXPLAIN QUERY PLAN {CORE_RECURSIVE_CTE}"), {"fiscal_year": fiscal_year}).all()
        connection.execute(text(CORE_RECURSIVE_CTE), {"fiscal_year": fiscal_year}).one()
        execution_time_ms = (time.perf_counter() - start) * 1000
        details = " ".join(str(row[-1]).upper() for row in plan_rows)
        index_scans = details.count("USING INDEX") + details.count("USING COVERING INDEX")
        sequential_scans = details.count("SCAN ") - details.count("USING INDEX") - details.count("USING COVERING INDEX")
        database_file_size_mb = DB_PATH.stat().st_size / (1024 * 1024) if Path(DB_PATH).exists() else 0.0

    total_scans = index_scans + max(sequential_scans, 0)
    index_utilization_percentage = 100.0 if total_scans == 0 else (index_scans / total_scans) * 100.0
    return {
        "query_execution_time_ms": float(round(execution_time_ms, 3)),
        "optimization_status": "OPTIMAL" if index_utilization_percentage >= 50.0 else "TUNING_REQUIRED",
        "index_utilization_percentage": float(round(index_utilization_percentage, 2)),
        "database_file_size_mb": float(round(database_file_size_mb, 3)),
    }