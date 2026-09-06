"""Phase 1 SQLAlchemy domain models for OxenGL."""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, event, func, inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class ResCompany(TimestampMixin, Base):
    __tablename__ = "res_companies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("res_companies.id", ondelete="SET NULL"), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    tax_id: Mapped[Optional[str]] = mapped_column(String(64), unique=True)
    commercial_registration: Mapped[Optional[str]] = mapped_column(String(10), unique=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    fiscal_calendar: Mapped[str] = mapped_column(String(64), nullable=False, default="gregorian")
    fiscal_year_start_month: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    tax_regime: Mapped[str] = mapped_column(String(64), nullable=False, default="KSA_VAT")
    subscription_tier: Mapped[str] = mapped_column(String(32), nullable=False, default="PROFESSIONAL")
    license_key: Mapped[Optional[str]] = mapped_column(String(64), unique=True)
    license_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    max_cost_centers: Mapped[int] = mapped_column(Integer, nullable=False, default=25)
    theme_mode: Mapped[str] = mapped_column(String(16), nullable=False, default="CUSTOM")
    ui_primary_color: Mapped[str] = mapped_column(String(9), nullable=False, default="#1E3A8A")
    ui_secondary_color: Mapped[str] = mapped_column(String(9), nullable=False, default="#7C3AED")
    ui_logo_url: Mapped[Optional[str]] = mapped_column(Text)


class ResUser(TimestampMixin, Base):
    __tablename__ = "res_users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    firebase_uid: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(64))
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("res_companies.id"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="Guest")
    role_ids: Mapped[Optional[str]] = mapped_column(Text)
    branch_scope_ids: Mapped[Optional[str]] = mapped_column(Text)
    warehouse_scope_ids: Mapped[Optional[str]] = mapped_column(Text)
    access_control_list: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    __table_args__ = (
        CheckConstraint("role IN ('Super_Admin', 'Admin', 'COO', 'Accountant', 'Data_Entry', 'Guest')", name="ck_res_user_role"),
    )


class PlatformAuditLog(Base):
    """Permanent server-side trace for privileged platform actions such as break-glass logins."""

    __tablename__ = "platform_audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    outcome: Mapped[str] = mapped_column(String(40), nullable=False, default="SUCCESS", index=True)
    endpoint_accessed: Mapped[str] = mapped_column(String(255), nullable=False)
    request_id: Mapped[Optional[str]] = mapped_column(String(64), index=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(512))
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("res_companies.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)


class ResPartner(TimestampMixin, Base):
    __tablename__ = "res_partners"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("res_companies.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    partner_type: Mapped[str] = mapped_column(String(32), nullable=False, default="customer")
    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True)
    phone: Mapped[Optional[str]] = mapped_column(String(64))
    tax_number: Mapped[Optional[str]] = mapped_column(String(64), unique=True)
    commercial_registration: Mapped[Optional[str]] = mapped_column(String(64))
    branch_scope_ids: Mapped[Optional[str]] = mapped_column(Text)
    warehouse_scope_ids: Mapped[Optional[str]] = mapped_column(Text)
    access_control_list: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    pickings: Mapped[list[StockPicking]] = relationship(back_populates="partner")
    transport_ledger_entries: Mapped[list[TransporterLedger]] = relationship(back_populates="transporter")

    __table_args__ = (
        CheckConstraint("partner_type IN ('raw_materials_supplier', 'service_supplier', 'customer', 'internal', 'supplier', 'transporter', 'employee', 'other')", name="ck_partner_type"),
    )


class StockLocation(TimestampMixin, Base):
    __tablename__ = "stock_locations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("res_companies.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    location_type: Mapped[str] = mapped_column(String(32), nullable=False, default="internal")
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("stock_locations.id", ondelete="SET NULL"))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    parent: Mapped[Optional[StockLocation]] = relationship(remote_side="StockLocation.id", back_populates="children")
    children: Mapped[list[StockLocation]] = relationship(back_populates="parent")
    source_moves: Mapped[list[StockMove]] = relationship(foreign_keys="StockMove.location_id", back_populates="source_location")
    destination_moves: Mapped[list[StockMove]] = relationship(
        foreign_keys="StockMove.location_dest_id", back_populates="destination_location"
    )
    quants: Mapped[list[StockQuant]] = relationship(back_populates="location")

    __table_args__ = (
        CheckConstraint(
            "location_type IN ('supplier', 'internal', 'customer', 'inventory', 'production', 'transit')",
            name="ck_stock_location_type",
        ),
        Index("ix_stock_locations_parent_name", "parent_id", "name"),
    )


class ProductProduct(TimestampMixin, Base):
    __tablename__ = "product_products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("res_companies.id"), nullable=False, index=True)
    sku: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    product_type: Mapped[str] = mapped_column(String(32), nullable=False, default="storable")
    unit_of_measure: Mapped[str] = mapped_column(String(32), nullable=False, default="ton")
    standard_cost: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    sale_price: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    moves: Mapped[list[StockMove]] = relationship(back_populates="product")
    quants: Mapped[list[StockQuant]] = relationship(back_populates="product")

    __table_args__ = (
        CheckConstraint("product_type IN ('storable', 'consumable', 'service')", name="ck_product_type"),
    )


class StockPicking(TimestampMixin, Base):
    __tablename__ = "stock_pickings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("res_companies.id"), nullable=False, index=True)
    reference: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    picking_type: Mapped[str] = mapped_column(String(32), nullable=False)
    state: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    partner_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("res_partners.id", ondelete="SET NULL"))
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    moves: Mapped[list[StockMove]] = relationship(back_populates="picking", cascade="all, delete-orphan")
    weighbridge_tickets: Mapped[list[WeighbridgeTicket]] = relationship(back_populates="picking")
    partner: Mapped[Optional[ResPartner]] = relationship(back_populates="pickings")

    __table_args__ = (
        CheckConstraint("picking_type IN ('incoming', 'outgoing', 'internal')", name="ck_picking_type"),
        CheckConstraint("state IN ('draft', 'confirmed', 'assigned', 'done', 'cancelled')", name="ck_picking_state"),
        Index("ix_stock_pickings_state_scheduled", "state", "scheduled_at"),
    )


class StockMove(TimestampMixin, Base):
    __tablename__ = "stock_moves"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("res_companies.id"), nullable=False, index=True)
    picking_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stock_pickings.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("product_products.id"), nullable=False)
    location_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stock_locations.id"), nullable=False)
    location_dest_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stock_locations.id"), nullable=False)
    quantity_planned: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    quantity_done: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    state: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    moved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    picking: Mapped[StockPicking] = relationship(back_populates="moves")
    product: Mapped[ProductProduct] = relationship(back_populates="moves")
    source_location: Mapped[StockLocation] = relationship(foreign_keys=[location_id], back_populates="source_moves")
    destination_location: Mapped[StockLocation] = relationship(
        foreign_keys=[location_dest_id], back_populates="destination_moves"
    )

    __table_args__ = (
        CheckConstraint("quantity_planned >= 0", name="ck_stock_move_quantity_planned"),
        CheckConstraint("quantity_done >= 0", name="ck_stock_move_quantity_done"),
        CheckConstraint("location_id <> location_dest_id", name="ck_stock_move_distinct_locations"),
        Index("ix_stock_moves_product_state", "product_id", "state"),
    )


class StockQuant(TimestampMixin, Base):
    __tablename__ = "stock_quants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("res_companies.id"), nullable=False, index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("product_products.id"), nullable=False)
    location_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stock_locations.id"), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    reserved_quantity: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))

    product: Mapped[ProductProduct] = relationship(back_populates="quants")
    location: Mapped[StockLocation] = relationship(back_populates="quants")

    __table_args__ = (
        CheckConstraint("reserved_quantity >= 0", name="ck_stock_quant_reserved"),
        CheckConstraint(
            "reserved_quantity = 0 OR (quantity >= 0 AND reserved_quantity <= quantity)",
            name="ck_stock_quant_reserved_available",
        ),
        Index("uq_stock_quant_product_location", "product_id", "location_id", unique=True),
    )


class WeighbridgeTicket(TimestampMixin, Base):
    __tablename__ = "weighbridge_tickets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("res_companies.id"), nullable=False, index=True)
    ticket_number: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    picking_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stock_pickings.id"), nullable=False, index=True)
    truck_number: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    gross_weight: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    tare_weight: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    net_weight: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    weighed_in_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    weighed_out_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    picking: Mapped[StockPicking] = relationship(back_populates="weighbridge_tickets")

    __table_args__ = (
        CheckConstraint("gross_weight >= tare_weight", name="ck_ticket_gross_weight"),
        CheckConstraint("net_weight = gross_weight - tare_weight", name="ck_ticket_net_weight"),
        Index("ix_weighbridge_tickets_truck_weighed_in", "truck_number", "weighed_in_at"),
    )


class TransporterLedger(TimestampMixin, Base):
    __tablename__ = "transporter_ledger"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("res_companies.id"), nullable=False, index=True)
    transporter_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("res_partners.id"), nullable=False)
    operation_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    expected_qty: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    delivered_qty: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    loss_percentage: Mapped[Decimal] = mapped_column(Numeric(7, 4), nullable=False, default=Decimal("0"))
    ai_risk_assessment: Mapped[Optional[str]] = mapped_column(Text)

    transporter: Mapped[ResPartner] = relationship(back_populates="transport_ledger_entries")

    __table_args__ = (
        CheckConstraint("expected_qty >= 0", name="ck_transporter_ledger_expected"),
        CheckConstraint("delivered_qty >= 0", name="ck_transporter_ledger_delivered"),
        CheckConstraint("loss_percentage >= 0 AND loss_percentage <= 100", name="ck_transporter_ledger_loss"),
        Index("ix_transporter_ledger_transporter_created", "transporter_id", "created_at"),
    )


class AccountAccount(TimestampMixin, Base):
    __tablename__ = "account_accounts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("res_companies.id"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    internal_type: Mapped[str] = mapped_column(String(16), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")

    move_lines: Mapped[list[AccountMoveLine]] = relationship(back_populates="account")

    __table_args__ = (
        CheckConstraint("internal_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')", name="ck_account_internal_type"),
        Index("uq_account_accounts_company_code", "company_id", "code", unique=True),
    )


class AccountJournal(TimestampMixin, Base):
    __tablename__ = "account_journals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("res_companies.id"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(16), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    journal_type: Mapped[str] = mapped_column(String(32), nullable=False, default="general")
    sequence_prefix: Mapped[str] = mapped_column(String(24), nullable=False, default="MISC")
    next_sequence: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    moves: Mapped[list[AccountMove]] = relationship(back_populates="journal")

    __table_args__ = (
        CheckConstraint("journal_type IN ('general', 'sale', 'purchase', 'cash', 'bank')", name="ck_account_journal_type"),
        Index("uq_account_journals_company_code", "company_id", "code", unique=True),
    )


class FiscalYear(TimestampMixin, Base):
    __tablename__ = "fiscal_years"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("res_companies.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    date_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    date_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    state: Mapped[str] = mapped_column(String(16), nullable=False, default="open")

    moves: Mapped[list[AccountMove]] = relationship(back_populates="fiscal_year")

    __table_args__ = (
        CheckConstraint("date_end >= date_start", name="ck_fiscal_year_dates"),
        CheckConstraint("state IN ('open', 'closed', 'locked')", name="ck_fiscal_year_state"),
        Index("uq_fiscal_years_company_name", "company_id", "name", unique=True),
    )


class CostCenter(TimestampMixin, Base):
    __tablename__ = "cost_centers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("res_companies.id"), nullable=False, index=True)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("cost_centers.id", ondelete="SET NULL"), index=True)
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    parent: Mapped[Optional[CostCenter]] = relationship(remote_side="CostCenter.id", back_populates="children")
    children: Mapped[list[CostCenter]] = relationship(back_populates="parent")

    __table_args__ = (
        Index("uq_cost_centers_company_code", "company_id", "code", unique=True),
    )


class AccountMove(TimestampMixin, Base):
    __tablename__ = "account_moves"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("res_companies.id"), nullable=False, index=True)
    journal_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("account_journals.id"), index=True)
    fiscal_year_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("fiscal_years.id"), index=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    sequence_number: Mapped[Optional[int]] = mapped_column(Integer)
    move_type: Mapped[str] = mapped_column(String(16), nullable=False, default="entry")
    partner_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("res_partners.id", ondelete="SET NULL"))
    cost_center_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("cost_centers.id", ondelete="SET NULL"))
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    state: Mapped[str] = mapped_column(String(16), nullable=False, default="draft")
    ref: Mapped[Optional[str]] = mapped_column(String(128))
    posted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    lines: Mapped[list[AccountMoveLine]] = relationship(back_populates="move", cascade="all, delete-orphan")
    journal: Mapped[Optional[AccountJournal]] = relationship(back_populates="moves")
    fiscal_year: Mapped[Optional[FiscalYear]] = relationship(back_populates="moves")
    settlement: Mapped[Optional[SupplierSettlement]] = relationship(back_populates="move")

    __table_args__ = (
        CheckConstraint("move_type IN ('entry', 'out_invoice', 'in_invoice', 'settlement')", name="ck_account_move_type"),
        CheckConstraint("state IN ('draft', 'posted', 'canceled')", name="ck_account_move_state"),
        Index("ix_account_moves_company_date", "company_id", "date"),
        Index("uq_account_moves_company_name", "company_id", "name", unique=True),
    )


class AccountMoveLine(Base):
    __tablename__ = "account_move_lines"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("res_companies.id"), nullable=False, index=True)
    move_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("account_moves.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("account_accounts.id"), nullable=False)
    partner_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("res_partners.id", ondelete="SET NULL"))
    cost_center_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("cost_centers.id", ondelete="SET NULL"))
    debit: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    credit: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    move: Mapped[AccountMove] = relationship(back_populates="lines")
    account: Mapped[AccountAccount] = relationship(back_populates="move_lines")

    __table_args__ = (
        CheckConstraint("debit >= 0 AND credit >= 0", name="ck_account_move_line_amounts"),
        CheckConstraint("debit = 0 OR credit = 0", name="ck_account_move_line_single_side"),
    )


class CustomerInvoice(TimestampMixin, Base):
    __tablename__ = "customer_invoices"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("res_companies.id"), nullable=False, index=True)
    partner_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("res_partners.id", ondelete="SET NULL"), index=True)
    move_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("account_moves.id", ondelete="SET NULL"), unique=True)
    invoice_number: Mapped[str] = mapped_column(String(64), nullable=False)
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_tax_number: Mapped[Optional[str]] = mapped_column(String(64))
    issue_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="Draft")
    subtotal: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    vat_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    grand_total: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    approved_by: Mapped[Optional[str]] = mapped_column(String(255))
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    issued_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint("status IN ('Draft', 'Approved', 'Issued', 'Cancelled')", name="ck_customer_invoice_status"),
        CheckConstraint("subtotal >= 0 AND vat_amount >= 0 AND grand_total >= 0", name="ck_customer_invoice_amounts"),
        Index("uq_customer_invoices_company_number", "company_id", "invoice_number", unique=True),
    )


def _raise_posted_move_immutable_error(operation: str) -> None:
    raise IntegrityError(operation, {}, ValueError("Posted journal entries are immutable and must be reversed, not modified."))


@event.listens_for(AccountMove, "before_update")
def prevent_posted_move_update(_, __, move: AccountMove) -> None:
    if move.state == "posted":
        state_history = inspect(move).attrs.state.history
        if state_history.deleted and state_history.deleted[0] == "draft" and state_history.added == ["posted"]:
            return
        _raise_posted_move_immutable_error("UPDATE account_moves")


@event.listens_for(AccountMove, "before_delete")
def prevent_posted_move_delete(_, __, move: AccountMove) -> None:
    if move.state == "posted":
        _raise_posted_move_immutable_error("DELETE account_moves")


@event.listens_for(AccountMoveLine, "before_update")
def prevent_posted_move_line_update(_, __, line: AccountMoveLine) -> None:
    if line.move and line.move.state == "posted":
        _raise_posted_move_immutable_error("UPDATE account_move_lines")


@event.listens_for(AccountMoveLine, "before_delete")
def prevent_posted_move_line_delete(_, __, line: AccountMoveLine) -> None:
    if line.move and line.move.state == "posted":
        _raise_posted_move_immutable_error("DELETE account_move_lines")


class SupplierSettlement(TimestampMixin, Base):
    __tablename__ = "supplier_settlements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("res_companies.id"), nullable=False, index=True)
    partner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("res_partners.id"), nullable=False)
    move_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("account_moves.id"), nullable=False, unique=True)
    total_gross_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    total_penalties_loss: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    net_payable: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    state: Mapped[str] = mapped_column(String(16), nullable=False, default="draft")

    move: Mapped[AccountMove] = relationship(back_populates="settlement")

    __table_args__ = (
        CheckConstraint("state IN ('draft', 'approved', 'paid')", name="ck_supplier_settlement_state"),
        CheckConstraint("total_gross_amount >= 0 AND total_penalties_loss >= 0 AND net_payable >= 0", name="ck_supplier_settlement_amounts"),
        CheckConstraint("period_end >= period_start", name="ck_supplier_settlement_period"),
        Index("ix_supplier_settlements_company_partner_period", "company_id", "partner_id", "period_start", "period_end"),
    )