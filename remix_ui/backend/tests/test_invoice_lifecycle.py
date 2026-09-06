import pytest
from datetime import datetime, timezone

from backend.backend.invoice_lifecycle import Invoice, InvoiceLifecycleError, approve_invoice, issue_invoice, validate_invoice


def test_valid_invoice_passes_validation():
    invoice = Invoice(
        id='inv-1',
        invoice_number='INV-1001',
        customer_id='cust-1',
        customer_name='Client A',
        subtotal=1000,
        vat_amount=150,
        grand_total=1150,
    )
    validate_invoice(invoice)


def test_invoice_total_mismatch_fails():
    with pytest.raises(InvoiceLifecycleError):
        validate_invoice(Invoice(
            id='inv-2',
            invoice_number='INV-1002',
            customer_id='cust-2',
            customer_name='Client B',
            subtotal=1000,
            vat_amount=150,
            grand_total=1100,
        ))


def test_issue_invoice_sets_status_and_issue_date():
    invoice = Invoice(
        id='inv-3',
        invoice_number='INV-1003',
        customer_id='cust-3',
        customer_name='Client C',
        subtotal=500,
        vat_amount=75,
        grand_total=575,
        status='Draft',
    )
    issued = issue_invoice(invoice)
    assert issued.status == 'Issued'
    assert issued.issue_date is not None


def test_approve_invoice_sets_approval_data():
    invoice = Invoice(
        id='inv-4',
        invoice_number='INV-1004',
        customer_id='cust-4',
        customer_name='Client D',
        subtotal=2000,
        vat_amount=300,
        grand_total=2300,
        status='Issued',
    )
    approved = approve_invoice(invoice, 'finance.manager@meayon.local')
    assert approved.status == 'Approved'
    assert approved.approved_by == 'finance.manager@meayon.local'
    assert approved.approved_at is not None
