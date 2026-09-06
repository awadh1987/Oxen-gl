import os
from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .settings import get_system_settings

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "enterprise_erp.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")
if os.name == "nt" and DATABASE_URL.startswith("sqlite:////app/data/"):
    DB_PATH = BASE_DIR / "data" / Path(DATABASE_URL).name
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATABASE_URL = f"sqlite:///{DB_PATH}"

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from .models import (  # noqa: F401
        AuditLog,
        ChartOfAccount,
        CostCenter,
        EmployeeContract,
        FiscalPeriod,
        FixedAsset,
        InventoryLayer,
        JournalEntry,
        JournalLine,
        Operation,
        PlatformAuditLog,
        PublicInvoiceToken,
        Role,
        SubscriptionPlan,
        TenantLicense,
        User,
        UserRegistration,
    )

    get_system_settings()
    Base.metadata.create_all(bind=engine)
    if DATABASE_URL.startswith("sqlite"):
        _migrate_sqlite_schema()
    _create_performance_indexes()
    _seed_system_chart_of_accounts()
    _seed_multi_tenant_data()


def _migrate_sqlite_schema() -> None:
    """Apply additive migrations required by multi-tenant schema isolation and accounting modules."""
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    all_tenant_scoped_tables = [
        "users",
        "user_registrations",
        "customers",
        "transporters",
        "crushers",
        "operations",
        "invoices",
        "vouchers",
        "fixed_assets",
        "employee_contracts",
        "inventory_layers",
        "chart_of_accounts",
        "cost_centers",
        "journal_entries",
        "journal_lines",
        "fiscal_periods",
        "audit_logs",
    ]

    with engine.begin() as connection:
        # 1. Ensure tenant_id column exists on all tenant-scoped tables
        for table in all_tenant_scoped_tables:
            if table in existing_tables:
                columns = {col["name"] for col in inspector.get_columns(table)}
                if "tenant_id" not in columns:
                    connection.execute(text(f"ALTER TABLE {table} ADD COLUMN tenant_id VARCHAR(36)"))
                    connection.execute(text(f"CREATE INDEX IF NOT EXISTS ix_{table}_tenant_id ON {table} (tenant_id)"))

    journal_line_columns = {column["name"] for column in inspector.get_columns("journal_lines")} if "journal_lines" in existing_tables else set()
    journal_entry_columns = {column["name"] for column in inspector.get_columns("journal_entries")} if "journal_entries" in existing_tables else set()
    invoice_columns = {column["name"] for column in inspector.get_columns("invoices")} if "invoices" in existing_tables else set()
    user_columns = {column["name"] for column in inspector.get_columns("users")} if "users" in existing_tables else set()
    audit_log_columns = {column["name"] for column in inspector.get_columns("audit_logs")} if "audit_logs" in existing_tables else set()
    cost_center_columns = {column["name"] for column in inspector.get_columns("cost_centers")} if "cost_centers" in existing_tables else set()
    tenant_license_columns = {column["name"] for column in inspector.get_columns("tenant_licenses")} if "tenant_licenses" in existing_tables else set()

    if "cost_center_id" not in journal_line_columns and "journal_lines" in existing_tables:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE journal_lines ADD COLUMN cost_center_id VARCHAR(50)"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_journal_lines_cost_center_id ON journal_lines (cost_center_id)"))
    journal_entry_migrations = {
        "fiscal_year": "INTEGER",
        "is_locked": "BOOLEAN NOT NULL DEFAULT 0",
        "currency": "VARCHAR(3) NOT NULL DEFAULT 'USD'",
        "exchange_rate": "REAL NOT NULL DEFAULT 1.0",
    }
    journal_line_migrations = {
        "source_debit": "REAL",
        "source_credit": "REAL",
        "base_debit": "REAL",
        "base_credit": "REAL",
        "reconciliation_status": "VARCHAR(30) NOT NULL DEFAULT 'UNRECONCILED'",
        "reconciled_at": "DATETIME",
    }
    with engine.begin() as connection:
        for column_name, column_definition in journal_entry_migrations.items():
            if column_name not in journal_entry_columns:
                connection.execute(text(f"ALTER TABLE journal_entries ADD COLUMN {column_name} {column_definition}"))
            connection.execute(text("UPDATE journal_entries SET fiscal_year = CAST(strftime('%Y', entry_date) AS INTEGER) WHERE fiscal_year IS NULL"))
        for column_name, column_definition in journal_line_migrations.items():
            if column_name not in journal_line_columns:
                connection.execute(text(f"ALTER TABLE journal_lines ADD COLUMN {column_name} {column_definition}"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_journal_lines_reconciliation_status ON journal_lines (reconciliation_status)"))
        connection.execute(text("UPDATE journal_lines SET source_debit = debit, source_credit = credit, base_debit = debit, base_credit = credit WHERE source_debit IS NULL OR source_credit IS NULL OR base_debit IS NULL OR base_credit IS NULL"))
    invoice_migrations = {
        "cost_center_id": "VARCHAR(50)",
        "is_signed": "BOOLEAN NOT NULL DEFAULT 0",
        "electronic_signature_hash": "VARCHAR(255)",
        "digitally_stamped_at": "DATETIME",
        "approved_by_user_id": "VARCHAR(36)",
    }
    with engine.begin() as connection:
        for column_name, column_definition in invoice_migrations.items():
            if column_name not in invoice_columns:
                connection.execute(text(f"ALTER TABLE invoices ADD COLUMN {column_name} {column_definition}"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_invoices_cost_center_id ON invoices (cost_center_id)"))
    user_migrations = {
        "status": "VARCHAR(40) NOT NULL DEFAULT 'ACTIVE'",
        "is_platform_superadmin": "BOOLEAN NOT NULL DEFAULT 0",
        "tenant_role": "VARCHAR(50) DEFAULT 'Admin'",
    }
    with engine.begin() as connection:
        for column_name, column_definition in user_migrations.items():
            if column_name not in user_columns:
                connection.execute(text(f"ALTER TABLE users ADD COLUMN {column_name} {column_definition}"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_users_status ON users (status)"))
    audit_log_migrations = {
        "user_id": "VARCHAR(36)",
        "endpoint_accessed": "VARCHAR(255)",
        "ip_address": "VARCHAR(45)",
        "mathematical_impact": "TEXT",
    }
    with engine.begin() as connection:
        for column_name, column_definition in audit_log_migrations.items():
            if column_name not in audit_log_columns:
                connection.execute(text(f"ALTER TABLE audit_logs ADD COLUMN {column_name} {column_definition}"))
    if "tenant_id" not in cost_center_columns and "cost_centers" in existing_tables:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE cost_centers ADD COLUMN tenant_id VARCHAR(36)"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_cost_centers_tenant_id ON cost_centers (tenant_id)"))
    tenant_migrations = {
        "company_name_en": "VARCHAR(255)",
        "cr_number": "VARCHAR(50)",
        "tax_number": "VARCHAR(50)",
        "contact_email": "VARCHAR(255)",
        "contact_phone": "VARCHAR(50)",
        "plan_type": "VARCHAR(20) NOT NULL DEFAULT 'PARTIAL'",
        "plan_id": "VARCHAR(36)",
        "max_allowed_users": "INTEGER NOT NULL DEFAULT 5",
        "max_allowed_branches": "INTEGER NOT NULL DEFAULT 1",
        "ui_theme_mode": "VARCHAR(20) NOT NULL DEFAULT 'LIGHT'",
        "ui_primary_color": "VARCHAR(20) NOT NULL DEFAULT '#1E3A8A'",
        "ui_secondary_color": "VARCHAR(20) NOT NULL DEFAULT '#10B981'",
        "ui_font_family": "VARCHAR(255) NOT NULL DEFAULT 'Inter, sans-serif'",
        "ui_logo_url": "VARCHAR(2048)",
        "created_at": "DATETIME",
    }
    with engine.begin() as connection:
        for column_name, column_definition in tenant_migrations.items():
            if column_name not in tenant_license_columns:
                connection.execute(text(f"ALTER TABLE tenant_licenses ADD COLUMN {column_name} {column_definition}"))


def _seed_multi_tenant_data() -> None:
    """Seed subscription plans and ensure default tenant exists with backfilled records."""
    from datetime import datetime, timezone, timedelta
    from .models import SubscriptionPlan, TenantLicense

    default_plans = [
        {
            "plan_code": "BASIC",
            "name_ar": "الباقة اللوجستية الأساسية (Partial)",
            "name_en": "Logistics Core Suite",
            "tier": "BASIC",
            "plan_type": "PARTIAL",
            "monthly_price": 299.0,
            "yearly_price": 2990.0,
            "max_users": 5,
            "max_cost_centers": 3,
            "max_branches": 1,
            "features_json": '["CUSTOMERS","TRANSPORTERS","CRUSHERS","OPERATIONS","INVOICING","VOUCHERS"]',
        },
        {
            "plan_code": "PROFESSIONAL",
            "name_ar": "الباقة المحاسبية الاحترافية (Pro Suite)",
            "name_en": "Professional ERP & Accounting Suite",
            "tier": "PROFESSIONAL",
            "plan_type": "PRO",
            "monthly_price": 799.0,
            "yearly_price": 7990.0,
            "max_users": 15,
            "max_cost_centers": 10,
            "max_branches": 3,
            "features_json": '["CUSTOMERS","TRANSPORTERS","CRUSHERS","OPERATIONS","INVOICING","VOUCHERS","FIXED_ASSETS","HR_PAYROLL","INVENTORY","FULL_ACCOUNTING","FINANCIAL_REPORTS"]',
        },
        {
            "plan_code": "ENTERPRISE",
            "name_ar": "الباقة المؤسسية الشاملة (Enterprise)",
            "name_en": "Enterprise Suite",
            "tier": "ENTERPRISE",
            "plan_type": "PRO",
            "monthly_price": 1499.0,
            "yearly_price": 14990.0,
            "max_users": 50,
            "max_cost_centers": 50,
            "max_branches": 10,
            "features_json": '["ALL"]',
        },
    ]

    default_tenant_id = "tenant-default-001"
    now_utc = datetime.now(timezone.utc)

    with SessionLocal.begin() as db:
        # 1. Seed default subscription plans
        plan_map = {}
        for plan_info in default_plans:
            plan = db.query(SubscriptionPlan).filter_by(plan_code=plan_info["plan_code"]).first()
            if not plan:
                plan = SubscriptionPlan(
                    plan_code=plan_info["plan_code"],
                    name_ar=plan_info["name_ar"],
                    name_en=plan_info["name_en"],
                    tier=plan_info["tier"],
                    plan_type=plan_info["plan_type"],
                    monthly_price=plan_info["monthly_price"],
                    yearly_price=plan_info["yearly_price"],
                    max_users=plan_info["max_users"],
                    max_cost_centers=plan_info["max_cost_centers"],
                    max_branches=plan_info["max_branches"],
                    features_json=plan_info["features_json"],
                    is_active=True,
                    created_at=now_utc,
                )
                db.add(plan)
                db.flush()
            plan_map[plan_info["tier"]] = plan.id

        # 2. Seed primary default tenant
        default_tenant = db.query(TenantLicense).filter_by(tenant_id=default_tenant_id).first()
        if not default_tenant:
            default_tenant = TenantLicense(
                tenant_id=default_tenant_id,
                company_name="مؤسسة معين للمقاولات والخدمات اللوجستية",
                company_name_en="Moeen Logistics & Contracting Est.",
                license_key="OXEN-PRO-DEFAULT-MASTER",
                subscription_tier="PROFESSIONAL",
                plan_type="PRO",
                plan_id=plan_map.get("PROFESSIONAL"),
                max_allowed_cost_centers=10,
                max_allowed_users=15,
                max_allowed_branches=3,
                ui_theme_mode="LIGHT",
                ui_primary_color="#1E3A8A",
                ui_secondary_color="#10B981",
                ui_font_family="Inter, sans-serif",
                is_active=True,
                created_at=now_utc,
                expires_at=now_utc + timedelta(days=3650),
            )
            db.add(default_tenant)
            db.flush()

    # 3. Backfill all unassigned rows to the primary tenant
    all_tenant_scoped_tables = [
        "users",
        "user_registrations",
        "customers",
        "transporters",
        "crushers",
        "operations",
        "invoices",
        "vouchers",
        "fixed_assets",
        "employee_contracts",
        "inventory_layers",
        "chart_of_accounts",
        "cost_centers",
        "journal_entries",
        "journal_lines",
        "fiscal_periods",
        "audit_logs",
    ]
    with engine.begin() as connection:
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())
        for table in all_tenant_scoped_tables:
            if table in existing_tables:
                connection.execute(
                    text(f"UPDATE {table} SET tenant_id = :def_id WHERE tenant_id IS NULL"),
                    {"def_id": default_tenant_id},
                )
        # Ensure initial super-admin flag
        if "users" in existing_tables:
            connection.execute(
                text("UPDATE users SET is_platform_superadmin = 1 WHERE username = 'admin' OR email LIKE '%admin%'")
            )


def _create_performance_indexes() -> None:
    with engine.begin() as connection:
        connection.execute(text("CREATE INDEX IF NOT EXISTS idx_coa_parent ON chart_of_accounts(parent_code)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS idx_jl_search ON journal_lines(account, cost_center_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS idx_jh_status_year ON journal_entries(status, fiscal_year, is_locked)"))


def _seed_system_chart_of_accounts() -> None:
    from .models import ChartOfAccount

    system_accounts = (
        ("1300", "Intercompany Receivables", "Asset", None, True),
        ("2300", "Intercompany Payables", "Liability", None, True),
        ("4100", "Intercompany Revenue", "Revenue", None, True),
        ("5100", "Intercompany Expenses", "Expense", None, True),
        ("2000", "Liabilities", "Liability", None, False),
        ("2200", "Tax Payables", "Liability", "2000", False),
        ("2201", "VAT Collected Liability", "Liability", "2200", True),
        ("1101", "Main Bank Cash", "Asset", None, True),
        ("1201", "Accounts Receivable", "Asset", None, True),
        ("4101", "Sales Revenue", "Revenue", None, True),
        ("5101", "Cost of Goods Sold", "Expense", None, True),
        ("5201", "Employee Salaries Expense", "Expense", None, True),
        ("2310", "Payroll Deductions Payable", "Liability", None, True),
        ("3100", "Retained Earnings", "Equity", None, True),
        ("4000", "Revenue", "Revenue", None, False),
        ("5000", "Expenses", "Expense", None, False),
    )
    with SessionLocal.begin() as db:
        existing_codes = {
            account_code
            for (account_code,) in db.query(ChartOfAccount.account_code).filter(
                ChartOfAccount.account_code.in_([account[0] for account in system_accounts])
            )
        }
        for account_code, account_name, account_type, parent_code, is_postable in system_accounts:
            if account_code not in existing_codes:
                db.add(ChartOfAccount(
                    account_code=account_code,
                    account_name=account_name,
                    account_type=account_type,
                    parent_code=parent_code,
                    is_postable=is_postable,
                ))
