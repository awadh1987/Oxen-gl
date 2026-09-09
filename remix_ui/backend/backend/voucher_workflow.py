from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable


class VoucherWorkflowError(ValueError):
    pass


@dataclass
class Voucher:
    id: str
    voucher_type: str
    voucher_number: str
    beneficiary: str
    amount: float
    status: str = "Draft"
    approved_by: str | None = None
    approved_at: datetime | None = None
    notes: str | None = None


def validate_voucher(voucher: Voucher) -> None:
    if not voucher.voucher_number.strip():
        raise VoucherWorkflowError("Voucher number is required.")
    if not voucher.beneficiary.strip():
        raise VoucherWorkflowError("Voucher beneficiary is required.")
    if voucher.amount <= 0:
        raise VoucherWorkflowError("Voucher amount must be greater than zero.")
    if voucher.voucher_type not in {"Cash", "Bank", "Journal", "Settlement"}:
        raise VoucherWorkflowError("Unsupported voucher type.")


def approve_voucher(voucher: Voucher, approver: str) -> Voucher:
    validate_voucher(voucher)
    if voucher.status == "Approved":
        raise VoucherWorkflowError("Voucher is already approved.")
    voucher.status = "Approved"
    voucher.approved_by = approver
    voucher.approved_at = datetime.now(timezone.utc)
    return voucher


def list_pending_vouchers(vouchers: Iterable[Voucher]) -> list[Voucher]:
    return [voucher for voucher in vouchers if voucher.status != "Approved"]
