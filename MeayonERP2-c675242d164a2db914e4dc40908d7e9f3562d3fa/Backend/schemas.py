"""Pydantic request and response contracts for the Phase 1 API."""

from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ORMReadModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ResCompanyRead(ORMReadModel):
    id: UUID
    parent_id: UUID | None = None
    name: str
    slug: str
    tax_id: str | None
    commercial_registration: str | None
    currency: str
    fiscal_calendar: str = "gregorian"
    fiscal_year_start_month: int = 1
    tax_regime: str = "KSA_VAT"
    created_at: datetime
    subscription_tier: str = "PROFESSIONAL"
    license_key: str | None = None
    license_expires_at: datetime | None = None
    max_cost_centers: int = 25
    theme_mode: str = "CUSTOM"
    ui_primary_color: str = "#1E3A8A"
    ui_secondary_color: str = "#7C3AED"
    ui_logo_url: str | None = None


class LicenseIssueRequest(BaseModel):
    company_id: str = Field(min_length=1, max_length=128)
    subscription_tier: str = "PROFESSIONAL"
    validity_days: int = Field(default=365, ge=1, le=3650)
    theme_mode: str = "CUSTOM"
    ui_primary_color: str = "#1E3A8A"
    ui_secondary_color: str = "#7C3AED"


class CompanyBrandingUpdate(BaseModel):
    ui_logo_url: str | None = Field(default=None, max_length=5_000_000)
    ui_primary_color: str = Field(default="#1E3A8A", pattern=r"^#[0-9a-fA-F]{6}$")
    ui_secondary_color: str = Field(default="#7C3AED", pattern=r"^#[0-9a-fA-F]{6}$")


class IsolationAuditRead(BaseModel):
    isolated_tables: list[str]
    total_isolated_tables: int
    total_registered_tenants: int
    backend_status: str
    security_policy: str
    checked_at: datetime


class ResUserRead(ORMReadModel):
    id: UUID
    email: str
    full_name: str
    phone: str | None = None
    company_id: UUID
    role: Literal["Super_Admin", "Admin", "COO", "Accountant", "Data_Entry", "Guest"]
    role_ids: str | None = None
    branch_scope_ids: str | None = None
    warehouse_scope_ids: str | None = None
    access_control_list: str | None = None
    is_active: bool


class CompanyUpdate(BaseModel):
    parent_id: UUID | None = None
    name: str | None = Field(default=None, min_length=2, max_length=255)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    fiscal_calendar: str | None = Field(default=None, max_length=64)
    fiscal_year_start_month: int | None = Field(default=None, ge=1, le=12)
    tax_regime: str | None = Field(default=None, max_length=64)
    theme_mode: str | None = Field(default=None, max_length=16)
    ui_primary_color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")
    ui_secondary_color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")
    ui_logo_url: str | None = Field(default=None, max_length=5_000_000)


class CompanyRegistrationCreate(BaseModel):
    company_name: str = Field(min_length=2, max_length=255)
    slug: str = Field(pattern=r"^[a-z0-9][a-z0-9-]{1,62}$")
    cr_number: str = Field(pattern=r"^\d{10}$")
    vat_number: str = Field(pattern=r"^\d{15}$")
    admin_email: str = Field(min_length=3, max_length=255)
    admin_name: str = Field(min_length=2, max_length=255)
    admin_phone: str | None = Field(default=None, max_length=64)
    admin_password: str = Field(min_length=8, max_length=512)


class CompanyRegistrationRead(BaseModel):
    company: ResCompanyRead
    user: ResUserRead


class AuthVerifyRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=512)


class UserRegistrationCreate(BaseModel):
    company_id: UUID
    full_name: str = Field(min_length=2, max_length=255)
    email: str = Field(min_length=3, max_length=255)
    phone: str = Field(min_length=6, max_length=64)
    password: str = Field(min_length=8, max_length=512)
    requested_role: Literal["Guest", "Data_Entry", "Accountant"] = "Guest"


class AuthVerifyResponse(BaseModel):
    status: Literal["Active", "Pending"]
    message: str
    user: dict[str, str | None]


class DirectAccessRequest(BaseModel):
    scope: Literal["master", "tenant"]
    company_id: UUID | None = None
    recovery_code: str = Field(min_length=16, max_length=512)


class ResPartnerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    partner_type: Literal["raw_materials_supplier", "service_supplier", "customer", "internal", "supplier", "transporter", "employee", "other"] = "customer"
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=64)
    tax_number: str | None = Field(default=None, max_length=64)
    commercial_registration: str | None = Field(default=None, max_length=64)
    branch_scope_ids: str | None = None
    warehouse_scope_ids: str | None = None
    access_control_list: str | None = None


class ResPartnerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    partner_type: Literal["raw_materials_supplier", "service_supplier", "customer", "internal", "supplier", "transporter", "employee", "other"] | None = None
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=64)
    tax_number: str | None = Field(default=None, max_length=64)
    commercial_registration: str | None = Field(default=None, max_length=64)
    branch_scope_ids: str | None = None
    warehouse_scope_ids: str | None = None
    access_control_list: str | None = None


class ResPartnerRead(ResPartnerCreate, ORMReadModel):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime


class StockLocationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    location_type: Literal["supplier", "internal", "customer", "inventory", "production", "transit"] = "internal"
    parent_id: UUID | None = None


class StockLocationRead(StockLocationCreate, ORMReadModel):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ProductProductCreate(BaseModel):
    sku: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=255)
    product_type: Literal["storable", "consumable", "service"] = "storable"
    unit_of_measure: str = Field(default="ton", min_length=1, max_length=32)
    standard_cost: Decimal = Field(default=Decimal("0"), ge=0)
    sale_price: Decimal = Field(default=Decimal("0"), ge=0)


class ProductProductRead(ProductProductCreate, ORMReadModel):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime


class WeighbridgeOperationCreate(BaseModel):
    partner_id: UUID
    product_id: UUID
    source_location_id: UUID
    dest_location_id: UUID
    truck_number: str = Field(min_length=1, max_length=64)
    gross_weight: Decimal = Field(gt=0, decimal_places=4)
    tare_weight: Decimal = Field(ge=0, decimal_places=4)

    @model_validator(mode="after")
    def gross_weight_must_exceed_tare_weight(self) -> "WeighbridgeOperationCreate":
        if self.gross_weight <= self.tare_weight:
            raise ValueError("gross_weight must be greater than tare_weight")
        if self.source_location_id == self.dest_location_id:
            raise ValueError("source_location_id and dest_location_id must differ")
        return self


class WeighbridgeOperationRead(ORMReadModel):
    picking_id: UUID
    picking_reference: str
    partner_id: UUID | None
    partner_name: str | None
    product_id: UUID
    product_name: str
    source_location_id: UUID
    source_location_name: str
    dest_location_id: UUID
    dest_location_name: str
    ticket_id: UUID
    ticket_number: str
    truck_number: str
    gross_weight: Decimal
    tare_weight: Decimal
    net_weight: Decimal
    weighed_in_at: datetime


class AccountAccountRead(ORMReadModel):
    id: UUID
    company_id: UUID
    code: str
    name: str
    internal_type: Literal["asset", "liability", "equity", "revenue", "expense"]
    currency: str


class AccountJournalRead(ORMReadModel):
    id: UUID
    company_id: UUID
    code: str
    name: str
    journal_type: str
    sequence_prefix: str
    next_sequence: int


class FiscalYearRead(ORMReadModel):
    id: UUID
    company_id: UUID
    name: str
    date_start: datetime
    date_end: datetime
    state: str


class CostCenterCreate(BaseModel):
    parent_id: UUID | None = None
    code: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=255)


class CostCenterRead(CostCenterCreate, ORMReadModel):
    id: UUID
    company_id: UUID
    is_active: bool


class AccountMoveLineCreate(BaseModel):
    account_id: UUID
    partner_id: UUID | None = None
    cost_center_id: UUID | None = None
    debit: Decimal = Field(default=Decimal("0"), ge=0)
    credit: Decimal = Field(default=Decimal("0"), ge=0)
    name: str = Field(min_length=1, max_length=255)


class AccountMoveCreate(BaseModel):
    name: str | None = Field(default=None, max_length=64)
    journal_code: str = Field(default="MISC", min_length=1, max_length=16)
    move_type: Literal["entry", "out_invoice", "in_invoice", "settlement"] = "entry"
    partner_id: UUID | None = None
    cost_center_id: UUID | None = None
    date: datetime | None = None
    ref: str | None = Field(default=None, max_length=128)
    lines: list[AccountMoveLineCreate] = Field(min_length=2)

    @model_validator(mode="after")
    def must_balance(self) -> "AccountMoveCreate":
        debit_total = sum((line.debit for line in self.lines), Decimal("0"))
        credit_total = sum((line.credit for line in self.lines), Decimal("0"))
        if debit_total != credit_total:
            raise ValueError("Journal entry debits must equal credits")
        return self


class AccountMoveRead(ORMReadModel):
    id: UUID
    company_id: UUID
    journal_id: UUID | None = None
    fiscal_year_id: UUID | None = None
    name: str
    sequence_number: int | None = None
    move_type: str
    partner_id: UUID | None
    cost_center_id: UUID | None = None
    date: datetime
    state: str
    ref: str | None
    posted_at: datetime | None = None


class CustomerInvoiceCreate(BaseModel):
    partner_id: UUID | None = None
    invoice_number: str | None = Field(default=None, max_length=64)
    customer_name: str = Field(min_length=1, max_length=255)
    customer_tax_number: str | None = Field(default=None, max_length=64)
    issue_date: datetime | None = None
    due_date: datetime | None = None
    subtotal: Decimal = Field(ge=0)
    vat_amount: Decimal = Field(ge=0)
    grand_total: Decimal = Field(ge=0)

    @model_validator(mode="after")
    def totals_must_balance(self) -> "CustomerInvoiceCreate":
        if self.subtotal + self.vat_amount != self.grand_total:
            raise ValueError("Invoice totals are unbalanced: subtotal plus VAT must equal grand total")
        return self


class CustomerInvoiceRead(ORMReadModel):
    id: UUID
    company_id: UUID
    partner_id: UUID | None
    move_id: UUID | None
    invoice_number: str
    customer_name: str
    customer_tax_number: str | None
    issue_date: datetime
    due_date: datetime | None
    status: str
    subtotal: Decimal
    vat_amount: Decimal
    grand_total: Decimal
    approved_by: str | None
    approved_at: datetime | None
    issued_at: datetime | None
    created_at: datetime
    updated_at: datetime


class SupplierSettlementGenerate(BaseModel):
    partner_id: UUID
    period_start: datetime
    period_end: datetime
    total_gross_amount: Decimal = Field(default=Decimal("0"), ge=0)
    total_penalties_loss: Decimal = Field(default=Decimal("0"), ge=0)

    @model_validator(mode="after")
    def valid_period_and_amounts(self) -> "SupplierSettlementGenerate":
        if self.period_end < self.period_start:
            raise ValueError("period_end must be on or after period_start")
        if self.total_penalties_loss > self.total_gross_amount:
            raise ValueError("total_penalties_loss cannot exceed total_gross_amount")
        return self


class SupplierSettlementRead(ORMReadModel):
    id: UUID
    company_id: UUID
    partner_id: UUID
    move_id: UUID
    total_gross_amount: Decimal
    total_penalties_loss: Decimal
    net_payable: Decimal
    period_start: datetime
    period_end: datetime
    state: str