from __future__ import annotations

from typing import Iterable


ROLE_PERMISSIONS: dict[str, set[str]] = {
    "Admin": {"*"},
    "COO": {"operations.read", "operations.write", "customers.read", "customers.write", "invoices.read", "invoices.write", "vouchers.read", "vouchers.write", "reports.read"},
    "Accountant": {"customers.read", "invoices.read", "invoices.write", "vouchers.read", "vouchers.write", "reports.read", "journal.read", "journal.write"},
    "Data_Entry": {"operations.read", "operations.write", "customers.read", "transporters.read", "crushers.read", "reports.read"},
    "Guest": {"reports.read"},
}


def authorize(role: str, required: Iterable[str]) -> bool:
    permissions = ROLE_PERMISSIONS.get(role, set())
    required_set = set(required)

    if "*" in permissions:
        return True

    return required_set.issubset(permissions)
