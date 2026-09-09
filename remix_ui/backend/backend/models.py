import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, Float, ForeignKey, Integer, Numeric, String, Text, event
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, relationship

from .database import Base


class Role(Base):
    __tablename__ = "roles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)

    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(80), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(200), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role_id = Column(String(36), ForeignKey("roles.id"), nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenant_licenses.tenant_id"), nullable=True, index=True)
    tenant_role = Column(String(50), nullable=True, default="Admin")  # Owner, Admin, Accountant, Data_Entry, Viewer
    is_platform_superadmin = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    status = Column(String(40), default="ACTIVE", nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    role = relationship("Role", back_populates="users")


class UserRegistration(Base):
    __tablename__ = "user_registrations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey("tenant_licenses.tenant_id"), nullable=True, index=True)
    full_name = Column(String(200), nullable=False)
    username = Column(String(80), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    organization = Column(String(255), nullable=True)
    requested_role = Column(String(50), nullable=False, default="Guest")
    password_hash = Column(String(255), nullable=False)
    status = Column(String(30), nullable=False, default="Pending")
    notes = Column(Text, nullable=True)
    reviewed_by = Column(String(255), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"
    __table_args__ = (
        CheckConstraint("tier IN ('BASIC', 'PROFESSIONAL', 'ENTERPRISE')", name="ck_subscription_plan_tier"),
        CheckConstraint("plan_type IN ('PARTIAL', 'PRO')", name="ck_subscription_plan_type"),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    plan_code = Column(String(50), unique=True, nullable=False, index=True)
    name_ar = Column(String(200), nullable=False)
    name_en = Column(String(200), nullable=False)
    tier = Column(String(20), nullable=False, default="BASIC")
    plan_type = Column(String(20), nullable=False, default="PARTIAL")  # PARTIAL or PRO
    monthly_price = Column(Float, nullable=False, default=0.0)
    yearly_price = Column(Float, nullable=False, default=0.0)
    max_users = Column(Integer, nullable=False, default=5)
    max_cost_centers = Column(Integer, nullable=False, default=5)
    max_branches = Column(Integer, nullable=False, default=1)
    features_json = Column(Text, nullable=True)  # JSON array of active module identifiers
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class TenantLicense(Base):
    __tablename__ = "tenant_licenses"
    __table_args__ = (
        CheckConstraint("subscription_tier IN ('BASIC', 'PROFESSIONAL', 'ENTERPRISE')", name="ck_tenant_license_tier"),
        CheckConstraint("plan_type IN ('PARTIAL', 'PRO')", name="ck_tenant_license_plan_type"),
        CheckConstraint("ui_theme_mode IN ('LIGHT', 'DARK', 'CUSTOM')", name="ck_tenant_license_theme"),
    )

    tenant_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_name = Column(String(255), nullable=False)
    company_name_en = Column(String(255), nullable=True)
    cr_number = Column(String(50), nullable=True)
    tax_number = Column(String(50), nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    license_key = Column(String(255), unique=True, nullable=False, index=True)
    subscription_tier = Column(String(20), nullable=False, default="BASIC")
    plan_type = Column(String(20), nullable=False, default="PARTIAL")  # PARTIAL or PRO
    plan_id = Column(String(36), ForeignKey("subscription_plans.id"), nullable=True)
    max_allowed_cost_centers = Column(Integer, nullable=False, default=5)
    max_allowed_users = Column(Integer, nullable=False, default=5)
    max_allowed_branches = Column(Integer, nullable=False, default=1)
    ui_theme_mode = Column(String(20), nullable=False, default="LIGHT")
    ui_primary_color = Column(String(20), nullable=False, default="#1E3A8A")
    ui_secondary_color = Column(String(20), nullable=False, default="#10B981")
    ui_font_family = Column(String(255), nullable=False, default="Inter, sans-serif")
    ui_logo_url = Column(String(2048), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)


class Customer(Base):
    __tablename__ = "customers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey("tenant_licenses.tenant_id"), nullable=True, index=True)
    customer_name = Column(String(255), nullable=False)
    customer_name_en = Column(String(255), nullable=True)
    tax_number = Column(String(50), nullable=True)
    cr_number = Column(String(50), nullable=True)
    contact_person = Column(String(200), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(String(255), nullable=True)
    opening_balance = Column(Float, default=0.0, nullable=False)
    credit_limit = Column(Float, default=0.0, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class Transporter(Base):
    __tablename__ = "transporters"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey("tenant_licenses.tenant_id"), nullable=True, index=True)
    transporter_name = Column(String(255), nullable=False)
    transporter_name_en = Column(String(255), nullable=True)
    driver_name = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    truck_details = Column(String(255), nullable=True)
    default_truck_no = Column(String(80), nullable=True)
    capacity_tons = Column(Float, default=0.0, nullable=False)
    rate_per_ton = Column(Float, default=0.0, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class Crusher(Base):
    __tablename__ = "crushers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey("tenant_licenses.tenant_id"), nullable=True, index=True)
    crusher_name = Column(String(255), nullable=False)
    crusher_name_en = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    bank_details = Column(String(255), nullable=True)
    account_number = Column(String(80), nullable=True)
    tax_number = Column(String(50), nullable=True)
    material_produced = Column(String(120), nullable=True)
    opening_balance = Column(Float, default=0.0, nullable=False)
    contact_person = Column(String(200), nullable=True)
    phone = Column(String(50), nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class Operation(Base):
    __tablename__ = "operations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey("tenant_licenses.tenant_id"), nullable=True, index=True)
    transporter_id = Column(String(120), nullable=False)
    route = Column(String(255), nullable=False)
    amount = Column(Float, nullable=False)
    client_name = Column(String(255), nullable=False)
    invoice_id = Column(String(36), nullable=False)
    profit = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey("tenant_licenses.tenant_id"), nullable=True, index=True)
    invoice_number = Column(String(120), unique=True, nullable=False, index=True)
    customer_id = Column(String(36), nullable=False)
    customer_name = Column(String(255), nullable=False)
    issue_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    due_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    subtotal = Column(Float, default=0.0, nullable=False)
    vat_amount = Column(Float, default=0.0, nullable=False)
    grand_total = Column(Float, default=0.0, nullable=False)
    status = Column(String(50), default="Draft", nullable=False)
    cost_center_id = Column(String(50), ForeignKey("cost_centers.code"), nullable=True, index=True)
    is_signed = Column(Boolean, default=False, nullable=False)
    electronic_signature_hash = Column(String(255), nullable=True)
    digitally_stamped_at = Column(DateTime(timezone=True), nullable=True)
    approved_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class PublicInvoiceToken(Base):
    __tablename__ = "public_invoice_tokens"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_id = Column(String(36), ForeignKey("invoices.id"), nullable=False, index=True)
    secure_token = Column(String(255), unique=True, nullable=False, index=True, default=lambda: secrets.token_urlsafe(16))
    expires_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc) + timedelta(days=7), nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False)


class Voucher(Base):
    __tablename__ = "vouchers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey("tenant_licenses.tenant_id"), nullable=True, index=True)
    voucher_type = Column(String(50), nullable=False)
    voucher_number = Column(String(120), unique=True, nullable=False, index=True)
    beneficiary = Column(String(255), nullable=False)
    amount = Column(Float, default=0.0, nullable=False)
    status = Column(String(50), default="Draft", nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class FixedAsset(Base):
    __tablename__ = "fixed_assets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey("tenant_licenses.tenant_id"), nullable=True, index=True)
    asset_name = Column(String(255), nullable=False)
    purchase_cost = Column(Numeric(18, 2), nullable=False)
    residual_value = Column(Numeric(18, 2), nullable=False, default=0)
    useful_life_months = Column(Integer, nullable=False)
    depreciated_months = Column(Integer, nullable=False, default=0)
    asset_account_code = Column(String(50), ForeignKey("chart_of_accounts.account_code"), nullable=False)
    expense_account_code = Column(String(50), ForeignKey("chart_of_accounts.account_code"), nullable=False)
    cost_center_id = Column(String(50), ForeignKey("cost_centers.code"), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class EmployeeContract(Base):
    __tablename__ = "employee_contracts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey("tenant_licenses.tenant_id"), nullable=True, index=True)
    employee_name = Column(String(255), nullable=False)
    base_salary = Column(Numeric(18, 2), nullable=False)
    allowances = Column(Numeric(18, 2), nullable=False, default=0)
    deductions = Column(Numeric(18, 2), nullable=False, default=0)
    cost_center_id = Column(String(50), ForeignKey("cost_centers.code"), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class InventoryLayer(Base):
    __tablename__ = "inventory_layers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey("tenant_licenses.tenant_id"), nullable=True, index=True)
    item_sku = Column(String(120), nullable=False, index=True)
    purchase_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    original_quantity = Column(Integer, nullable=False)
    remaining_quantity = Column(Integer, nullable=False)
    unit_cost = Column(Numeric(18, 2), nullable=False)


class ChartOfAccount(Base):
    __tablename__ = "chart_of_accounts"

    account_code = Column(String(50), primary_key=True)
    tenant_id = Column(String(36), ForeignKey("tenant_licenses.tenant_id"), nullable=True, index=True)
    account_name = Column(String(255), nullable=False)
    account_type = Column(String(50), nullable=True, index=True)
    parent_code = Column(String(50), ForeignKey("chart_of_accounts.account_code"), nullable=True, index=True)
    is_postable = Column(Boolean, default=True, nullable=False)

    parent = relationship("ChartOfAccount", remote_side=[account_code], back_populates="children")
    children = relationship("ChartOfAccount", back_populates="parent")


class CostCenter(Base):
    __tablename__ = "cost_centers"

    code = Column(String(50), primary_key=True)
    name = Column(String(255), nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenant_licenses.tenant_id"), nullable=True, index=True)
    parent_cc = Column(String(50), ForeignKey("cost_centers.code"), nullable=True, index=True)
    is_leaf = Column(Boolean, default=True, nullable=False)

    parent = relationship("CostCenter", remote_side=[code], back_populates="children")
    children = relationship("CostCenter", back_populates="parent")


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey("tenant_licenses.tenant_id"), nullable=True, index=True)
    entry_number = Column(String(120), unique=True, nullable=False, index=True)
    reference_type = Column(String(120), nullable=True)
    reference_id = Column(String(36), nullable=True)
    entry_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="Draft", nullable=False)
    fiscal_year = Column(Integer, nullable=True, index=True)
    is_locked = Column(Boolean, default=False, nullable=False)
    currency = Column(String(3), default="USD", nullable=False)
    exchange_rate = Column(Float, default=1.0, nullable=False)
    total_debit = Column(Float, default=0.0, nullable=False)
    total_credit = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class FiscalPeriod(Base):
    __tablename__ = "fiscal_periods"

    year = Column(Integer, primary_key=True)
    tenant_id = Column(String(36), ForeignKey("tenant_licenses.tenant_id"), nullable=True, index=True)
    closed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    closed_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)


class FiscalYearLockedError(ValueError):
    pass


@event.listens_for(Session, "before_flush")
def prevent_writes_to_locked_fiscal_year(session: Session, _, __) -> None:
    new_entries = [entry for entry in session.new if isinstance(entry, JournalEntry)]
    for entry in new_entries:
        if entry.entry_date is None:
            entry.entry_date = datetime.now(timezone.utc)
        if entry.fiscal_year is None:
            entry.fiscal_year = entry.entry_date.year
    fiscal_years = {entry.fiscal_year for entry in new_entries if entry.fiscal_year is not None}
    if fiscal_years and session.query(FiscalPeriod.year).filter(FiscalPeriod.year.in_(fiscal_years)).first():
        raise FiscalYearLockedError("Transaction Denied: Target fiscal year is locked and audited.")


class JournalLine(Base):
    __tablename__ = "journal_lines"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey("tenant_licenses.tenant_id"), nullable=True, index=True)
    journal_entry_id = Column(String(36), ForeignKey("journal_entries.id"), nullable=False)
    account = Column(String(255), nullable=False)
    debit = Column(Float, default=0.0, nullable=False)
    credit = Column(Float, default=0.0, nullable=False)
    source_debit = Column(Float, nullable=True)
    source_credit = Column(Float, nullable=True)
    base_debit = Column(Float, nullable=True)
    base_credit = Column(Float, nullable=True)
    reconciliation_status = Column(String(30), default="UNRECONCILED", nullable=False, index=True)
    reconciled_at = Column(DateTime(timezone=True), nullable=True)
    cost_center_id = Column(String(50), ForeignKey("cost_centers.code"), nullable=True, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


@event.listens_for(JournalLine, "before_insert")
def populate_legacy_currency_amounts(_, __, line: JournalLine) -> None:
    """Keep pre-existing writers valid by treating unspecified entries as base-currency USD."""
    if line.source_debit is None:
        line.source_debit = line.debit
    if line.source_credit is None:
        line.source_credit = line.credit
    if line.base_debit is None:
        line.base_debit = line.debit
    if line.base_credit is None:
        line.base_credit = line.credit


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey("tenant_licenses.tenant_id"), nullable=True, index=True)
    actor_email = Column(String(255), nullable=False)
    action = Column(String(120), nullable=False)
    entity = Column(String(120), nullable=False)
    entity_id = Column(String(120), nullable=True)
    details = Column(Text, nullable=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    endpoint_accessed = Column(String(255), nullable=True)
    ip_address = Column(String(45), nullable=True)
    mathematical_impact = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class PlatformAuditLog(Base):
    __tablename__ = "platform_audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(String(36), nullable=True, index=True)
    actor_identifier = Column(String(255), nullable=False, index=True)
    event_name = Column(String(120), nullable=False, index=True)
    outcome = Column(String(40), nullable=False, index=True)
    client_ip = Column(String(45), nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


def _raise_audit_log_immutable_error(operation: str) -> None:
    raise IntegrityError(operation, {}, ValueError("AuditLog records are immutable and only support inserts."))


@event.listens_for(AuditLog, "before_update")
def prevent_audit_log_update(_, __, ___) -> None:
    _raise_audit_log_immutable_error("UPDATE audit_logs")


@event.listens_for(AuditLog, "before_delete")
def prevent_audit_log_delete(_, __, ___) -> None:
    _raise_audit_log_immutable_error("DELETE audit_logs")
