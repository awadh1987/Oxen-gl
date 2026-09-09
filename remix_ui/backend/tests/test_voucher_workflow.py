import pytest

from backend.backend.voucher_workflow import Voucher, VoucherWorkflowError, approve_voucher, list_pending_vouchers, validate_voucher


def test_valid_voucher_passes_validation():
    voucher = Voucher(id='v-1', voucher_type='Bank', voucher_number='V-1001', beneficiary='Crusher Co.', amount=5000)
    validate_voucher(voucher)


def test_invalid_voucher_amount_fails():
    with pytest.raises(VoucherWorkflowError):
        validate_voucher(Voucher(id='v-2', voucher_type='Cash', voucher_number='V-1002', beneficiary='Supplier', amount=0))


def test_approve_voucher_marks_it_approved():
    voucher = Voucher(id='v-3', voucher_type='Settlement', voucher_number='V-1003', beneficiary='Transporter', amount=800)
    approved = approve_voucher(voucher, 'finance.manager@meayon.local')
    assert approved.status == 'Approved'
    assert approved.approved_by == 'finance.manager@meayon.local'


def test_pending_voucher_list_filters_approved():
    vouchers = [
        Voucher(id='v-4', voucher_type='Cash', voucher_number='V-1004', beneficiary='Driver', amount=300),
        Voucher(id='v-5', voucher_type='Journal', voucher_number='V-1005', beneficiary='Accounts', amount=1200, status='Approved'),
    ]
    pending = list_pending_vouchers(vouchers)
    assert len(pending) == 1
    assert pending[0].id == 'v-4'
