"""
Tests for OxenGL Double-Entry Mathematical Guard & Financial Voucher Balancing.
Verifies sum(Debits) == sum(Credits) invariance and 400 Bad Request rejection on imbalance.
"""

import uuid
import pytest
from decimal import Decimal
from fastapi import HTTPException
from starlette.testclient import TestClient

from backend.app.main import app
from backend.app.domains.finance.guards import (
    enforce_double_entry_balance,
    validate_double_entry_invariance,
)


def test_guard_valid_balanced_lines():
    """Balanced debits and credits must validate successfully without error."""
    lines = [
        {"account_code": "511000", "debit": 15000.0, "credit": 0.0},
        {"account_code": "512000", "debit": 2500.0, "credit": 0.0},
        {"account_code": "111101", "debit": 0.0, "credit": 16000.0},
        {"account_code": "211200", "debit": 0.0, "credit": 1500.0},
    ]
    dr, cr = validate_double_entry_invariance(lines)
    assert dr == Decimal("17500.0000")
    assert cr == Decimal("17500.0000")
    assert dr == cr


def test_guard_unbalanced_lines_rejection():
    """Unbalanced debits and credits must trigger immediate 400 Bad Request ledger isolation error."""
    lines = [
        {"account_code": "511000", "debit": 15000.0, "credit": 0.0},
        {"account_code": "111101", "debit": 0.0, "credit": 14000.0},  # 1000 discrepancy
    ]
    with pytest.raises(HTTPException) as exc_info:
        validate_double_entry_invariance(lines)

    assert exc_info.value.status_code == 400
    assert "Ledger isolation error" in exc_info.value.detail
    assert "Unbalanced transaction" in exc_info.value.detail


def test_guard_negative_value_rejection():
    """Negative values in debit or credit must be rejected with 400 Bad Request."""
    lines = [
        {"account_code": "511000", "debit": -500.0, "credit": 0.0},
        {"account_code": "111101", "debit": 0.0, "credit": -500.0},
    ]
    with pytest.raises(HTTPException) as exc_info:
        validate_double_entry_invariance(lines)

    assert exc_info.value.status_code == 400
    assert "negative" in exc_info.value.detail.lower()


def test_guard_decorator_on_custom_function():
    """Decorator must intercept execution and reject unbalanced payload before target function executes."""
    executed = False

    @enforce_double_entry_balance
    def mock_post_transaction(lines, memo="Test"):
        nonlocal executed
        executed = True
        return "SUCCESS"

    # 1. Balanced call should execute
    res = mock_post_transaction([
        {"account_code": "1001", "debit": 500.0, "credit": 0.0},
        {"account_code": "2001", "debit": 0.0, "credit": 500.0},
    ])
    assert res == "SUCCESS"
    assert executed is True

    # 2. Unbalanced call must abort before executing
    executed = False
    with pytest.raises(HTTPException) as exc_info:
        mock_post_transaction([
            {"account_code": "1001", "debit": 500.0, "credit": 0.0},
            {"account_code": "2001", "debit": 0.0, "credit": 400.0},
        ])
    assert exc_info.value.status_code == 400
    assert executed is False


def test_api_balanced_voucher_endpoint():
    """POST /api/v1/finance/vouchers/balanced accepts balanced voucher and rejects unbalanced with 400."""
    client = TestClient(app)

    # 1. Reject unbalanced voucher
    unbalanced_payload = {
        "description": "Unbalanced Test Payroll Voucher",
        "lines": [
            {"account_code": "511000", "debit": 10000.0, "credit": 0.0},
            {"account_code": "111101", "debit": 0.0, "credit": 9500.0},
        ],
    }
    resp = client.post("/api/v1/finance/vouchers/balanced", json=unbalanced_payload)
    assert resp.status_code == 400
    assert "Ledger isolation error" in resp.json()["detail"]

    # 2. Accept balanced voucher
    balanced_payload = {
        "description": "Balanced Test Payroll Voucher",
        "lines": [
            {"account_code": "511000", "debit": 10000.0, "credit": 0.0},
            {"account_code": "111101", "debit": 0.0, "credit": 10000.0},
        ],
    }
    resp_ok = client.post("/api/v1/finance/vouchers/balanced", json=balanced_payload)
    assert resp_ok.status_code == 201
    data = resp_ok.json()
    assert data["status"] == "SUCCESS"
    assert data["total_debit"] == 10000.0
    assert data["total_credit"] == 10000.0
