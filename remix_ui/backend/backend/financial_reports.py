from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import text
from sqlalchemy.orm import Session

from .settings import get_system_settings

ELIGIBLE_LEDGER_STATUSES = ("POSTED_TO_MAIN_LEDGER", "Posted", "Approved")
MONTH_NAMES = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")


def get_branch_balance(db: Session, account_code: str, fiscal_year: int | None = None) -> float:
    fiscal_filter = "AND journal_entries.fiscal_year = :fiscal_year" if fiscal_year is not None else ""
    result = db.execute(
        text(
            f"""
            WITH RECURSIVE account_tree(account_code) AS (
                SELECT account_code FROM chart_of_accounts WHERE account_code = :account_code
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
              {fiscal_filter}
            """
        ),
        {"account_code": account_code, "fiscal_year": fiscal_year},
    ).mappings().one()
    return float(result["total_debit"]) - float(result["total_credit"])


def compile_financial_report(db: Session, report_type: str, fiscal_year: int) -> tuple[str, list[tuple[str, float]]]:
    if report_type == "profit_and_loss":
        revenue = -get_branch_balance(db, "4000", fiscal_year)
        expenses = get_branch_balance(db, "5000", fiscal_year)
        return "Profit and Loss Statement", [
            ("Revenue", float(revenue)),
            ("Expenses", float(expenses)),
            ("Net Income", float(revenue - expenses)),
        ]

    assets = get_branch_balance(db, "1000")
    liabilities = -get_branch_balance(db, "2000")
    equity = -get_branch_balance(db, "3000")
    return "Balance Sheet", [
        ("Assets", float(assets)),
        ("Liabilities", float(liabilities)),
        ("Equity", float(equity)),
        ("Liabilities and Equity", float(liabilities + equity)),
    ]


def get_revenue_expense_by_month(db: Session, fiscal_year: int) -> list[dict[str, float | str]]:
    rows = db.execute(
        text(
            """
            WITH RECURSIVE
            revenue_tree(account_code) AS (
                SELECT account_code FROM chart_of_accounts WHERE account_code = '4000'
                UNION ALL
                SELECT child.account_code FROM chart_of_accounts AS child
                JOIN revenue_tree AS parent ON child.parent_code = parent.account_code
            ),
            expense_tree(account_code) AS (
                SELECT account_code FROM chart_of_accounts WHERE account_code = '5000'
                UNION ALL
                SELECT child.account_code FROM chart_of_accounts AS child
                JOIN expense_tree AS parent ON child.parent_code = parent.account_code
            )
            SELECT
                CAST(strftime('%m', journal_entries.entry_date) AS INTEGER) AS month_number,
                COALESCE(SUM(CASE WHEN journal_lines.account IN (SELECT account_code FROM revenue_tree)
                    THEN journal_lines.base_credit - journal_lines.base_debit ELSE 0 END), 0) AS revenue,
                COALESCE(SUM(CASE WHEN journal_lines.account IN (SELECT account_code FROM expense_tree)
                    THEN journal_lines.base_debit - journal_lines.base_credit ELSE 0 END), 0) AS expenses
            FROM journal_lines
            JOIN journal_entries ON journal_entries.id = journal_lines.journal_entry_id
            WHERE journal_entries.fiscal_year = :fiscal_year
              AND journal_entries.status IN ('POSTED_TO_MAIN_LEDGER', 'Posted', 'Approved')
              AND (
                  journal_lines.account IN (SELECT account_code FROM revenue_tree)
                  OR journal_lines.account IN (SELECT account_code FROM expense_tree)
              )
            GROUP BY month_number
            ORDER BY month_number
            """
        ),
        {"fiscal_year": fiscal_year},
    ).mappings().all()
    return [
        {
            "month": MONTH_NAMES[int(row["month_number"]) - 1],
            "revenue": float(row["revenue"]),
            "expenses": float(row["expenses"]),
            "net_profit": float(row["revenue"] - row["expenses"]),
        }
        for row in rows
    ]


def get_cost_center_spending(db: Session, fiscal_year: int) -> list[dict[str, float | str]]:
    rows = db.execute(
        text(
            """
            SELECT
                cost_centers.name AS cost_center,
                COALESCE(SUM(journal_lines.base_debit) - SUM(journal_lines.base_credit), 0) AS total_spent
            FROM journal_lines
            JOIN journal_entries ON journal_entries.id = journal_lines.journal_entry_id
            JOIN chart_of_accounts ON chart_of_accounts.account_code = journal_lines.account
            JOIN cost_centers ON cost_centers.code = journal_lines.cost_center_id
            WHERE journal_entries.fiscal_year = :fiscal_year
              AND journal_entries.status IN ('POSTED_TO_MAIN_LEDGER', 'Posted', 'Approved')
              AND chart_of_accounts.account_type = 'Expense'
              AND cost_centers.is_leaf = 1
            GROUP BY cost_centers.code, cost_centers.name
            HAVING total_spent <> 0
            ORDER BY total_spent DESC, cost_centers.name ASC
            """
        ),
        {"fiscal_year": fiscal_year},
    ).mappings().all()
    return [{"cost_center": str(row["cost_center"]), "total_spent": float(row["total_spent"])} for row in rows]


def build_financial_report_pdf(title: str, fiscal_year: int, rows: list[tuple[str, float]]) -> BytesIO:
    buffer = BytesIO()
    document = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=0.65 * inch, leftMargin=0.65 * inch)
    styles = getSampleStyleSheet()
    table_data = [["Account Category", "Base Currency Amount"]]
    table_data.extend([[label, f"{float(amount):,.2f}"] for label, amount in rows])
    table = Table(table_data, colWidths=[3.7 * inch, 2.4 * inch])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f4e78")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#9aa5b1")),
        ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f7fafc")),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    document.build([
        Paragraph(get_system_settings().company_name, styles["Heading2"]),
        Spacer(1, 0.08 * inch),
        Paragraph(title, styles["Title"]),
        Spacer(1, 0.15 * inch),
        Paragraph(f"Fiscal Year: {fiscal_year}", styles["Normal"]),
        Spacer(1, 0.2 * inch),
        table,
    ])
    buffer.seek(0)
    return buffer


def build_public_invoice_pdf(invoice: object) -> BytesIO:
    rows = [
        ("Invoice Number", str(invoice.invoice_number)),
        ("Customer", str(invoice.customer_name)),
        ("Subtotal", f"{float(invoice.subtotal):,.2f}"),
        ("VAT", f"{float(invoice.vat_amount):,.2f}"),
        ("Grand Total", f"{float(invoice.grand_total):,.2f}"),
        ("Status", str(invoice.status)),
    ]
    buffer = BytesIO()
    document = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=0.65 * inch, leftMargin=0.65 * inch)
    styles = getSampleStyleSheet()
    table = Table([["Certified Invoice", "Value"], *rows], colWidths=[2.4 * inch, 3.7 * inch])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f4e78")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#9aa5b1")),
        ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f7fafc")),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    document.build([
        Paragraph(get_system_settings().company_name, styles["Heading2"]),
        Spacer(1, 0.08 * inch),
        Paragraph("Certified Customer Invoice", styles["Title"]),
        Spacer(1, 0.2 * inch),
        table,
    ])
    buffer.seek(0)
    return buffer