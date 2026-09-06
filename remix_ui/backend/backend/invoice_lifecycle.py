from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone


class InvoiceLifecycleError(ValueError):
    pass


@dataclass
class Invoice:
    id: str
    invoice_number: str
    customer_id: str
    customer_name: str
    subtotal: float
    vat_amount: float
    grand_total: float
    status: str = "Draft"
    issue_date: datetime | None = None
    due_date: datetime | None = None
    approved_by: str | None = None
    approved_at: datetime | None = None


def validate_invoice(invoice: Invoice) -> None:
    if not invoice.invoice_number.strip():
        raise InvoiceLifecycleError("Invoice number is required.")
    if not invoice.customer_id.strip():
        raise InvoiceLifecycleError("Customer is required.")
    if invoice.grand_total <= 0:
        raise InvoiceLifecycleError("Invoice total must be greater than zero.")
    if abs((invoice.subtotal + invoice.vat_amount) - invoice.grand_total) > 0.01:
        raise InvoiceLifecycleError("Invoice totals do not match subtotal + VAT.")


def issue_invoice(invoice: Invoice) -> Invoice:
    validate_invoice(invoice)
    if invoice.status not in {"Draft", "Pending_Approval"}:
        raise InvoiceLifecycleError("Invoice can only be issued from Draft or Pending_Approval status.")
    invoice.status = "Issued"
    invoice.issue_date = invoice.issue_date or datetime.now(timezone.utc)
    return invoice


def approve_invoice(invoice: Invoice, approver: str) -> Invoice:
    validate_invoice(invoice)
    if invoice.status == "Approved":
        raise InvoiceLifecycleError("Invoice is already approved.")
    invoice.status = "Approved"
    invoice.approved_by = approver
    invoice.approved_at = datetime.now(timezone.utc)
    return invoice
