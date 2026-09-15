"""
OxenGL Procurement Domain Models.
Defines entities for S2P (Source-to-Pay), Approval Matrix Workflows,
Purchase Requisitions, Purchase Orders, Goods Receipts with Batch Logs, and Vendor Bills.
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import (
    String,
    Numeric,
    ForeignKey,
    DateTime,
    Integer,
    Boolean,
    Text,
    CheckConstraint,
    Index,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base

try:
    from backend.models import PurchaseOrder, GoodsReceipt
except ImportError:
    from models import PurchaseOrder, GoodsReceipt


class ApprovalRule(Base):
    """Metadata-driven routing rules determining approvals based on value thresholds."""
    __tablename__ = "approval_rules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, nullable=False)
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)  # 'PURCHASE_REQUISITION', 'PURCHASE_ORDER', 'VENDOR_BILL'
    cost_center_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)

    min_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0.0000"))
    max_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")

    sequence_order: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    required_role_code: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., 'DEPARTMENT_SUPERVISOR', 'FINANCE_MANAGER'
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)


class WorkflowInstance(Base):
    """Tracks live lifecycle routing pipelines for targeted document transactions."""
    __tablename__ = "workflow_instances"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, nullable=False)
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)
    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, nullable=False)

    status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)  # 'PENDING', 'APPROVED', 'REJECTED'
    current_step: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    steps: Mapped[List["WorkflowStep"]] = relationship("WorkflowStep", back_populates="instance", cascade="all, delete-orphan", order_by="WorkflowStep.sequence_order")


class WorkflowStep(Base):
    """Granular approval tier records tracking historical logs and individual signatures."""
    __tablename__ = "workflow_steps"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    instance_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workflow_instances.id", ondelete="CASCADE"), nullable=False, index=True)
    sequence_order: Mapped[int] = mapped_column(Integer, nullable=False)
    assigned_role_code: Mapped[str] = mapped_column(String(100), nullable=False)

    status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)  # 'PENDING', 'APPROVED', 'REJECTED'
    actioned_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    actioned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    instance: Mapped["WorkflowInstance"] = relationship("WorkflowInstance", back_populates="steps")


class Vendor(Base):
    """Supplier & Vendor master entity for procurement operations."""
    __tablename__ = "vendors"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, nullable=False)
    vendor_code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    commercial_registration: Mapped[Optional[str]] = mapped_column(String(64))
    vat_number: Mapped[Optional[str]] = mapped_column(String(64))
    payment_terms_days: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="SAR", nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255))
    phone: Mapped[Optional[str]] = mapped_column(String(64))
    address: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)


class PurchaseRequisition(Base):
    """Internal departmental purchase requests triggering multi-level approvals."""
    __tablename__ = "purchase_requisitions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, nullable=False)
    pr_number: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    requester_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    cost_center_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    justification: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="DRAFT", nullable=False)  # DRAFT, SUBMITTED, APPROVED, REJECTED, CONVERTED_TO_PO
    currency: Mapped[str] = mapped_column(String(3), default="SAR", nullable=False)
    total_estimated_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)

    lines: Mapped[List["PurchaseRequisitionLine"]] = relationship("PurchaseRequisitionLine", back_populates="requisition", cascade="all, delete-orphan")


class PurchaseRequisitionLine(Base):
    """Line items for Purchase Requisitions."""
    __tablename__ = "purchase_requisition_lines"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    requisition_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("purchase_requisitions.id", ondelete="CASCADE"), nullable=False, index=True)
    item_description: Mapped[str] = mapped_column(String(255), nullable=False)
    material_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    quantity_requested: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    uom: Mapped[str] = mapped_column(String(20), default="UNIT", nullable=False)
    estimated_unit_price: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
    line_total: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)

    requisition: Mapped["PurchaseRequisition"] = relationship("PurchaseRequisition", back_populates="lines")


class PurchaseOrderLine(Base):
    """Line items for Purchase Orders (binding PO to materials and quantities)."""
    __tablename__ = "purchase_order_lines"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    purchase_order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    material_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity_ordered: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    quantity_received: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
    quantity_billed: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    tax_rate: Mapped[Decimal] = mapped_column(Numeric(5, 4), default=Decimal("0.1500"), nullable=False)  # 15% VAT default
    line_subtotal: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    line_total: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)


class GoodsReceiptBatchLog(Base):
    """Batch tracking logs recorded at Goods Receipt Inspection (GRN)."""
    __tablename__ = "goods_receipt_batch_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    goods_receipt_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("goods_receipts.id", ondelete="CASCADE"), nullable=False, index=True)
    material_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    batch_number: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    quantity_received: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    uom: Mapped[str] = mapped_column(String(20), default="KG", nullable=False)
    manufacture_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    expiry_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    inspection_result: Mapped[str] = mapped_column(String(32), default="PASSED", nullable=False)  # PASSED, REJECTED, CONDITIONAL
    storage_location: Mapped[Optional[str]] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)


class VendorBill(Base):
    """Supplier Vendor Invoices for 3-Way Matching against PO and Goods Receipt."""
    __tablename__ = "vendor_bills"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, nullable=False)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    invoice_number: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    vendor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("vendors.id", ondelete="SET NULL"), nullable=True)
    purchase_order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    goods_receipt_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("goods_receipts.id", ondelete="CASCADE"), nullable=False, index=True)

    invoice_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    currency: Mapped[str] = mapped_column(String(3), default="SAR", nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
    total_billed: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)

    match_status: Mapped[str] = mapped_column(String(32), default="PENDING", nullable=False)  # 'PENDING', 'MATCHED', 'HOLD_DISCREPANCY'
    discrepancy_details: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    is_posted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
