import json

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from uuid import uuid4

from backend.backend.auth import create_access_token, hash_password
from backend.backend.database import SessionLocal
from backend.backend.main import app, reconcile_overdue_invoices
from backend.backend.models import AuditLog, ChartOfAccount, CostCenter, EmployeeContract, FiscalPeriod, FixedAsset, InventoryLayer, Invoice, JournalEntry, JournalLine, PublicInvoiceToken, Role, TenantLicense, User


client = TestClient(app)


def test_system_settings_returns_white_label_values_as_flat_json(monkeypatch):
    monkeypatch.setenv("APP_SYSTEM_NAME", "Example ERP")
    monkeypatch.setenv("APP_COMPANY_NAME", "Example Contracting Co.")
    monkeypatch.setenv("APP_DEFAULT_VAT_RATE", "0.20")

    response = client.get("/api/system/settings")

    assert response.status_code == 200, response.text
    assert response.json() == {
        "system_name": "Example ERP",
        "company_name": "Example Contracting Co.",
        "vat_rate": 0.2,
        "theme_mode": "LIGHT",
        "primary_color": "#0F172A",
        "secondary_color": "#F59E0B",
        "font_family": "Inter, sans-serif",
        "logo_url": "https://example.com",
    }

    oxen_blue = client.get("/api/system/settings", params={"identity": "oxen_blue"})
    assert oxen_blue.status_code == 200, oxen_blue.text
    assert oxen_blue.json()["primary_color"] == "#1E3A8A"
    assert oxen_blue.json()["secondary_color"] == "#10B981"


def test_reconcile_overdue_invoices_marks_only_past_due_issued_records():
    overdue_invoice_id = str(uuid4())
    current_invoice_id = str(uuid4())
    db = SessionLocal()
    try:
        db.add_all([
            Invoice(
                id=overdue_invoice_id, invoice_number=f"INV-OVERDUE-{uuid4().hex[:10]}",
                customer_id="overdue-customer", customer_name="Overdue Customer", status="Issued",
                due_date=datetime.now(timezone.utc) - timedelta(days=1),
            ),
            Invoice(
                id=current_invoice_id, invoice_number=f"INV-CURRENT-{uuid4().hex[:10]}",
                customer_id="current-customer", customer_name="Current Customer", status="Issued",
                due_date=datetime.now(timezone.utc) + timedelta(days=1),
            ),
        ])
        db.commit()
        assert reconcile_overdue_invoices(db) >= 1
        assert db.get(Invoice, overdue_invoice_id).status == "Overdue"
        assert db.get(Invoice, current_invoice_id).status == "Issued"
    finally:
        db.close()


def test_admin_login_uses_database_credentials(monkeypatch):
    monkeypatch.setenv("DEFAULT_ADMIN_EMAIL", "admin@meayon.local")
    monkeypatch.setenv("DEFAULT_ADMIN_PASSWORD", "ChangeMe123!")

    response = client.post(
        "/token",
        data={"username": "admin@meayon.local", "password": "ChangeMe123!"},
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["token_type"] == "bearer"
    assert payload["access_token"]


def test_login_accepts_configured_admin_aliases(monkeypatch):
    monkeypatch.setenv("DEFAULT_ADMIN_EMAIL", "admin@meayon.local")
    monkeypatch.setenv("DEFAULT_ADMIN_PASSWORD", "ChangeMe123!")
    monkeypatch.setenv("ADMIN_LOGIN_ALIASES", "administrator@example.local")

    response = client.post(
        "/token",
        data={"username": "administrator@example.local", "password": "ChangeMe123!"},
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["token_type"] == "bearer"
    assert payload["access_token"]


def test_auth_verify_returns_user_profile_for_known_account(monkeypatch):
    monkeypatch.setenv("DEFAULT_ADMIN_EMAIL", "admin@meayon.local")
    monkeypatch.setenv("DEFAULT_ADMIN_PASSWORD", "ChangeMe123!")

    response = client.post(
        "/api/auth/verify",
        json={"email": "admin@meayon.local", "name": "System Administrator", "uid": "google-admin-001"},
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["status"] == "Active"
    assert payload["user"]["email"] == "admin@meayon.local"
    assert payload["user"]["role"] == "Admin"


def test_get_current_user_profile_from_token(monkeypatch):
    monkeypatch.setenv("DEFAULT_ADMIN_EMAIL", "admin@meayon.local")
    monkeypatch.setenv("DEFAULT_ADMIN_PASSWORD", "ChangeMe123!")

    token_response = client.post(
        "/token",
        data={"username": "admin@meayon.local", "password": "ChangeMe123!"},
    )
    token = token_response.json()["access_token"]

    response = client.get(
        "/api/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["email"] == "admin@meayon.local"
    assert payload["role"] == "Admin"


def test_operation_to_journal_workflow_is_transactional(monkeypatch):
    monkeypatch.setenv("DEFAULT_ADMIN_EMAIL", "admin@meayon.local")
    monkeypatch.setenv("DEFAULT_ADMIN_PASSWORD", "ChangeMe123!")

    token_response = client.post(
        "/token",
        data={"username": "admin@meayon.local", "password": "ChangeMe123!"},
    )
    token = token_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    suffix = uuid4().hex[:10]
    payload = {
        "transporter_id": "transporter-test",
        "route": "Riyadh - Test Project",
        "amount": 1150.0,
        "client_name": "Workflow Test Client",
        "customer_id": "customer-test",
        "customer_name": "Workflow Test Customer",
        "invoice_number": f"INV-WORKFLOW-{suffix}",
        "beneficiary": "Workflow Test Beneficiary",
        "voucher_number": f"PV-WORKFLOW-{suffix}",
        "description": "Transactional workflow test",
    }

    response = client.post("/api/workflows/operation-to-journal", json=payload, headers=headers)

    assert response.status_code == 200, response.text
    result = response.json()
    assert result["invoice_status"] == "Pending_Approval"
    assert result["voucher_status"] == "Pending_Approval"
    assert result["journal_status"] == "PENDING_CEO_APPROVAL"
    assert all(result[key] for key in ("operation_id", "invoice_id", "voucher_id", "journal_entry_id"))

    duplicate_response = client.post("/api/workflows/operation-to-journal", json=payload, headers=headers)
    assert duplicate_response.status_code == 409, duplicate_response.text


def test_inventory_sales_hook_creates_pending_four_line_journal(monkeypatch):
    monkeypatch.setenv("DEFAULT_ADMIN_EMAIL", "admin@meayon.local")
    monkeypatch.setenv("DEFAULT_ADMIN_PASSWORD", "ChangeMe123!")
    token_response = client.post("/token", data={"username": "admin@meayon.local", "password": "ChangeMe123!"})
    headers = {"Authorization": f"Bearer {token_response.json()['access_token']}"}
    cost_center_id = f"route-{uuid4().hex[:10]}"
    db = SessionLocal()
    try:
        db.add(CostCenter(code=cost_center_id, name="Riyadh Route", is_leaf=True))
        db.commit()
    finally:
        db.close()

    response = client.post(
        "/api/inventory/sales-hook",
        headers=headers,
        json={
            "trip_id": f"trip-{uuid4().hex[:10]}",
            "item_sku": "AGG-20MM",
            "quantity": 3,
            "unit_cost_price": 25,
            "unit_sale_price": 40,
            "cost_center_id": cost_center_id,
        },
    )

    assert response.status_code == 200, response.text
    result = response.json()
    assert result["status"] == "PENDING_CEO_APPROVAL"
    assert result["totalDebit"] == 195
    assert result["totalCredit"] == 195
    db = SessionLocal()
    try:
        lines = db.query(JournalLine).filter_by(journal_entry_id=result["id"]).order_by(JournalLine.created_at).all()
        assert [(line.account, line.debit, line.credit, line.cost_center_id) for line in lines] == [
            ("1101", 120, 0, None),
            ("4101", 0, 120, cost_center_id),
            ("5101", 75, 0, cost_center_id),
            ("1201", 0, 75, None),
        ]
    finally:
        db.close()


def test_add_trip_creates_five_line_vat_journal(monkeypatch):
    monkeypatch.setenv("DEFAULT_ADMIN_EMAIL", "admin@meayon.local")
    monkeypatch.setenv("DEFAULT_ADMIN_PASSWORD", "ChangeMe123!")
    token_response = client.post("/token", data={"username": "admin@meayon.local", "password": "ChangeMe123!"})
    headers = {"Authorization": f"Bearer {token_response.json()['access_token']}"}
    cost_center_id = f"vat-route-{uuid4().hex[:10]}"
    item_sku = f"AGG-{uuid4().hex[:10]}"
    db = SessionLocal()
    try:
        db.add(CostCenter(code=cost_center_id, name="VAT Route", is_leaf=True))
        db.commit()
    finally:
        db.close()

    oldest_layer = client.post(
        "/api/inventory/layers",
        headers=headers,
        json={"item_sku": item_sku, "original_quantity": 2, "unit_cost": "20.00", "purchase_date": "2026-01-01T00:00:00Z"},
    )
    newest_layer = client.post(
        "/api/inventory/layers",
        headers=headers,
        json={"item_sku": item_sku, "original_quantity": 3, "unit_cost": "30.00", "purchase_date": "2026-02-01T00:00:00Z"},
    )
    assert oldest_layer.status_code == 200, oldest_layer.text
    assert newest_layer.status_code == 200, newest_layer.text

    response = client.post(
        "/api/operations/add-trip",
        headers=headers,
        json={
            "trip_id": f"trip-{uuid4().hex[:10]}",
            "item_sku": item_sku,
            "quantity": 4,
            "unit_sale_price": 40,
            "cost_center_id": cost_center_id,
        },
    )

    assert response.status_code == 200, response.text
    result = response.json()
    assert result["status"] == "PENDING_CEO_APPROVAL"
    assert result["totalDebit"] == 260.0
    assert result["totalCredit"] == 260.0
    db = SessionLocal()
    try:
        lines = db.query(JournalLine).filter_by(journal_entry_id=result["id"]).order_by(JournalLine.created_at).all()
        assert [(line.account, line.debit, line.credit, line.cost_center_id) for line in lines] == [
            ("1101", 160, 0, None),
            ("4101", 0, 139.13, cost_center_id),
            ("2201", 0, 20.87, None),
            ("5101", 100, 0, cost_center_id),
            ("1201", 0, 100, None),
        ]
        assert db.get(InventoryLayer, oldest_layer.json()["id"]).remaining_quantity == 0
        assert db.get(InventoryLayer, newest_layer.json()["id"]).remaining_quantity == 1
    finally:
        db.close()


def test_add_trip_rejects_insufficient_fifo_inventory(monkeypatch):
    monkeypatch.setenv("DEFAULT_ADMIN_EMAIL", "admin@meayon.local")
    monkeypatch.setenv("DEFAULT_ADMIN_PASSWORD", "ChangeMe123!")
    token_response = client.post("/token", data={"username": "admin@meayon.local", "password": "ChangeMe123!"})
    headers = {"Authorization": f"Bearer {token_response.json()['access_token']}"}
    cost_center_id = f"fifo-route-{uuid4().hex[:10]}"
    db = SessionLocal()
    try:
        db.add(CostCenter(code=cost_center_id, name="FIFO Route", is_leaf=True))
        db.commit()
    finally:
        db.close()

    response = client.post(
        "/api/operations/add-trip",
        headers=headers,
        json={
            "trip_id": f"trip-{uuid4().hex[:10]}",
            "item_sku": f"NO-STOCK-{uuid4().hex[:10]}",
            "quantity": 1,
            "unit_sale_price": 40,
            "cost_center_id": cost_center_id,
        },
    )
    assert response.status_code == 400, response.text
    assert response.json()["detail"].startswith("Insufficient inventory")


def test_journal_entry_converts_foreign_currency_and_preserves_source_amounts(monkeypatch):
    monkeypatch.setenv("DEFAULT_ADMIN_EMAIL", "admin@meayon.local")
    monkeypatch.setenv("DEFAULT_ADMIN_PASSWORD", "ChangeMe123!")
    token_response = client.post("/token", data={"username": "admin@meayon.local", "password": "ChangeMe123!"})
    headers = {"Authorization": f"Bearer {token_response.json()['access_token']}"}
    entry_number = f"JE-EUR-{uuid4().hex[:10]}"
    response = client.post(
        "/api/journal-entries",
        headers=headers,
        json={
            "entry_number": entry_number,
            "description": "EUR conversion test",
            "currency": "EUR",
            "exchange_rate": 1.2,
            "lines": [
                {"account": "Cash", "debit": 100, "credit": 0},
                {"account": "Sales", "debit": 0, "credit": 100},
            ],
        },
    )

    assert response.status_code == 200, response.text
    assert response.json()["totalDebit"] == 120.0
    assert response.json()["totalCredit"] == 120.0
    db = SessionLocal()
    try:
        journal = db.get(JournalEntry, response.json()["id"])
        assert journal.currency == "EUR"
        assert journal.exchange_rate == 1.2
        lines = db.query(JournalLine).filter_by(journal_entry_id=journal.id).order_by(JournalLine.created_at).all()
        assert [(line.source_debit, line.source_credit, line.base_debit, line.base_credit, line.debit, line.credit) for line in lines] == [
            (100, 0, 120, 0, 120, 0),
            (0, 100, 0, 120, 0, 120),
        ]
    finally:
        db.close()


def test_bank_reconciliation_marks_only_exact_posted_bank_matches(monkeypatch):
    monkeypatch.setenv("DEFAULT_ADMIN_EMAIL", "admin@meayon.local")
    monkeypatch.setenv("DEFAULT_ADMIN_PASSWORD", "ChangeMe123!")
    token_response = client.post("/token", data={"username": "admin@meayon.local", "password": "ChangeMe123!"})
    headers = {"Authorization": f"Bearer {token_response.json()['access_token']}"}
    journal_id = str(uuid4())
    reference_id = f"trip-bank-{uuid4().hex[:10]}"
    db = SessionLocal()
    try:
        db.add_all([
            JournalEntry(
                id=journal_id, entry_number=f"JE-BANK-{uuid4().hex[:10]}", reference_id=reference_id,
                description="Bank reconciliation test", status="POSTED_TO_MAIN_LEDGER",
                total_debit=125.5, total_credit=125.5,
            ),
            JournalLine(
                id=str(uuid4()), journal_entry_id=journal_id, account="1101", debit=125.5, credit=0,
                source_debit=100, source_credit=0, base_debit=125.5, base_credit=0,
            ),
        ])
        db.commit()
    finally:
        db.close()

    response = client.post(
        "/api/finance/bank-reconciliation",
        headers=headers,
        json={"rows": [
            {"bank_date": "2026-08-31", "bank_reference": reference_id, "bank_amount": 125.5},
            {"bank_date": "2026-08-31", "bank_reference": reference_id, "bank_amount": 120},
            {"bank_date": "2026-08-31", "bank_reference": "unknown-reference", "bank_amount": 50},
        ]},
    )

    assert response.status_code == 200, response.text
    assert response.json() == {
        "total_processed_bank_rows": 3,
        "successfully_reconciled_count": 1,
        "unmatched_exceptions_count": 2,
        "unmatched_reference_ids": [reference_id, "unknown-reference"],
    }
    db = SessionLocal()
    try:
        line = db.query(JournalLine).filter_by(journal_entry_id=journal_id, account="1101").one()
        assert line.reconciliation_status == "RECONCILED"
    finally:
        db.close()


def test_multi_currency_bank_reconciliation_matches_source_and_base_amounts(monkeypatch):
    monkeypatch.setenv("DEFAULT_ADMIN_EMAIL", "admin@meayon.local")
    monkeypatch.setenv("DEFAULT_ADMIN_PASSWORD", "ChangeMe123!")
    token_response = client.post("/token", data={"username": "admin@meayon.local", "password": "ChangeMe123!"})
    headers = {"Authorization": f"Bearer {token_response.json()['access_token']}"}
    eur_reference = f"eur-bank-{uuid4().hex[:10]}"
    usd_reference = f"usd-bank-{uuid4().hex[:10]}"
    eur_journal_id = str(uuid4())
    usd_journal_id = str(uuid4())
    db = SessionLocal()
    try:
        db.add_all([
            JournalEntry(
                id=eur_journal_id, entry_number=f"JE-EUR-{uuid4().hex[:10]}", reference_id=eur_reference,
                description="EUR bank match", status="POSTED_TO_MAIN_LEDGER", currency="EUR", exchange_rate=1.25,
                total_debit=62.5, total_credit=62.5,
            ),
            JournalEntry(
                id=usd_journal_id, entry_number=f"JE-USD-{uuid4().hex[:10]}", reference_id=usd_reference,
                description="Cross currency bank match", status="POSTED_TO_MAIN_LEDGER", currency="USD", exchange_rate=1.2,
                total_debit=120, total_credit=120,
            ),
            JournalLine(
                id=str(uuid4()), journal_entry_id=eur_journal_id, account="1101", debit=62.5, credit=0,
                source_debit=50, source_credit=0, base_debit=62.5, base_credit=0,
            ),
            JournalLine(
                id=str(uuid4()), journal_entry_id=usd_journal_id, account="1101", debit=120, credit=0,
                source_debit=100, source_credit=0, base_debit=120, base_credit=0,
            ),
        ])
        db.commit()
    finally:
        db.close()

    response = client.post(
        "/api/finance/bank-reconciliation/multi-currency",
        headers=headers,
        json={"rows": [
            {"bank_date": "2026-08-31", "bank_reference": eur_reference, "bank_amount": 50, "bank_currency": "EUR"},
            {"bank_date": "2026-08-31", "bank_reference": usd_reference, "bank_amount": 100, "bank_currency": "EUR"},
            {"bank_date": "2026-08-31", "bank_reference": "unmatched", "bank_amount": 10, "bank_currency": "USD"},
        ]},
    )

    assert response.status_code == 200, response.text
    assert response.json()["total_processed"] == 3
    assert response.json()["reconciled_count"] == 2
    assert response.json()["exceptions_count"] == 1
    assert response.json()["unmatched_details"][0]["bank_reference"] == "unmatched"
    db = SessionLocal()
    try:
        lines = db.query(JournalLine).filter(JournalLine.journal_entry_id.in_([eur_journal_id, usd_journal_id])).all()
        assert all(line.reconciliation_status == "RECONCILED" and line.reconciled_at is not None for line in lines)
    finally:
        db.close()


def test_financial_statement_pdf_exports_from_memory(monkeypatch):
    monkeypatch.setenv("DEFAULT_ADMIN_EMAIL", "admin@meayon.local")
    monkeypatch.setenv("DEFAULT_ADMIN_PASSWORD", "ChangeMe123!")
    token_response = client.post("/token", data={"username": "admin@meayon.local", "password": "ChangeMe123!"})
    headers = {"Authorization": f"Bearer {token_response.json()['access_token']}"}

    for report_type in ("balance_sheet", "profit_and_loss"):
        response = client.get(
            "/api/reports/export-pdf",
            headers=headers,
            params={"report_type": report_type, "fiscal_year": 2026},
        )
        assert response.status_code == 200, response.text
        assert response.headers["content-type"].startswith("application/pdf")
        assert response.headers["content-disposition"] == 'attachment; filename="financial_statement_report.pdf"'
        assert response.content.startswith(b"%PDF-")
        assert len(response.content) > 500


def test_dashboard_data_feeds_return_chart_compatible_shapes(monkeypatch):
    monkeypatch.setenv("DEFAULT_ADMIN_EMAIL", "admin@meayon.local")
    monkeypatch.setenv("DEFAULT_ADMIN_PASSWORD", "ChangeMe123!")
    token_response = client.post("/token", data={"username": "admin@meayon.local", "password": "ChangeMe123!"})
    headers = {"Authorization": f"Bearer {token_response.json()['access_token']}"}

    summary = client.get("/api/dashboard/summary-cards", headers=headers)
    revenue_expense = client.get("/api/dashboard/charts/revenue-expense", headers=headers)
    cost_centers = client.get("/api/dashboard/charts/cost-centers", headers=headers)

    assert summary.status_code == 200, summary.text
    assert summary.json().keys() == {"assets", "liabilities", "cash_on_hand", "equity"}
    assert all(isinstance(value, float) for value in summary.json().values())
    assert revenue_expense.status_code == 200, revenue_expense.text
    assert all(set(row) == {"month", "revenue", "expenses", "net_profit"} for row in revenue_expense.json())
    assert all(isinstance(row["month"], str) and all(isinstance(row[key], float) for key in ("revenue", "expenses", "net_profit")) for row in revenue_expense.json())
    assert cost_centers.status_code == 200, cost_centers.text
    assert all(set(row) == {"cost_center", "total_spent"} and isinstance(row["total_spent"], float) for row in cost_centers.json())


def test_admin_pending_user_queue_enforces_access_and_audits_decisions(monkeypatch):
    monkeypatch.setenv("DEFAULT_ADMIN_EMAIL", "admin@meayon.local")
    monkeypatch.setenv("DEFAULT_ADMIN_PASSWORD", "ChangeMe123!")
    token_response = client.post("/token", data={"username": "admin@meayon.local", "password": "ChangeMe123!"})
    headers = {"Authorization": f"Bearer {token_response.json()['access_token']}"}
    db = SessionLocal()
    try:
        admin_role = db.query(Role).filter_by(name="Admin").one()
        approved_user_id = str(uuid4())
        rejected_user_id = str(uuid4())
        db.add_all([
            User(
                id=approved_user_id, username=f"pending.approve.{uuid4().hex[:10]}", email=f"pending.approve.{uuid4().hex[:10]}@meayon.local",
                full_name="Pending Approval", password_hash=hash_password("ChangeMe123!"), role_id=admin_role.id,
                is_active=False, status="AWAITING_ADMIN_APPROVAL",
            ),
            User(
                id=rejected_user_id, username=f"pending.reject.{uuid4().hex[:10]}", email=f"pending.reject.{uuid4().hex[:10]}@meayon.local",
                full_name="Pending Rejection", password_hash=hash_password("ChangeMe123!"), role_id=admin_role.id,
                is_active=False, status="AWAITING_ADMIN_APPROVAL",
            ),
        ])
        db.commit()
    finally:
        db.close()

    assert client.get("/api/admin/pending-users").status_code == 401
    pending = client.get("/api/admin/pending-users", headers=headers)
    assert pending.status_code == 200, pending.text
    assert {user["id"] for user in pending.json()} >= {approved_user_id, rejected_user_id}

    approved = client.post(f"/api/admin/approve-user/{approved_user_id}", headers=headers)
    rejected = client.post(f"/api/admin/reject-user/{rejected_user_id}", headers=headers)
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "ACTIVE"
    assert approved.json()["role"] == "Clerk"
    assert rejected.status_code == 200, rejected.text
    assert rejected.json()["status"] == "REGISTRATION_DENIED"
    db = SessionLocal()
    try:
        assert db.get(User, approved_user_id).is_active is True
        assert db.get(User, rejected_user_id).is_active is False
        assert db.query(AuditLog).filter_by(action="USER_ACTIVATION", entity_id=approved_user_id).count() == 1
        assert db.query(AuditLog).filter_by(action="USER_REGISTRATION_REJECTION", entity_id=rejected_user_id).count() == 1
    finally:
        db.close()


def test_admin_waf_threat_feed_aggregates_429_access_log_rows(monkeypatch, tmp_path):
    monkeypatch.setenv("DEFAULT_ADMIN_EMAIL", "admin@meayon.local")
    monkeypatch.setenv("DEFAULT_ADMIN_PASSWORD", "ChangeMe123!")
    access_log = tmp_path / "access.log"
    access_log.write_text(
        "203.0.113.10 - - [31/Aug/2026:10:00:00 +0000] \"GET /public/invoice/token HTTP/1.1\" 429 153\n"
        "198.51.100.5 - - [31/Aug/2026:10:01:00 +0000] \"GET /public/invoice/token HTTP/1.1\" 200 153\n"
        "203.0.113.10 - - [31/Aug/2026:10:02:00 +0000] \"GET /public/invoice/token HTTP/1.1\" 429 153\n"
        "198.51.100.20 - - [31/Aug/2026:10:03:00 +0000] \"GET /public/invoice/token HTTP/1.1\" 429 153\n",
        encoding="utf-8",
    )
    monkeypatch.setenv("NGINX_ACCESS_LOG", str(access_log))
    token_response = client.post("/token", data={"username": "admin@meayon.local", "password": "ChangeMe123!"})
    headers = {"Authorization": f"Bearer {token_response.json()['access_token']}"}

    assert client.get("/api/admin/waf-threats").status_code == 401
    response = client.get("/api/admin/waf-threats", headers=headers)
    assert response.status_code == 200, response.text
    assert response.json() == [
        {"source_ip": "203.0.113.10", "total_blocked_attempts": 2, "perceived_threat_rating": "HIGH"},
        {"source_ip": "198.51.100.20", "total_blocked_attempts": 1, "perceived_threat_rating": "HIGH"},
    ]


def test_admin_database_optimization_check_returns_metrics_and_indexes(monkeypatch):
    monkeypatch.setenv("DEFAULT_ADMIN_EMAIL", "admin@meayon.local")
    monkeypatch.setenv("DEFAULT_ADMIN_PASSWORD", "ChangeMe123!")
    token_response = client.post("/token", data={"username": "admin@meayon.local", "password": "ChangeMe123!"})
    headers = {"Authorization": f"Bearer {token_response.json()['access_token']}"}

    assert client.get("/api/admin/db/optimize-check").status_code == 401
    response = client.get("/api/admin/db/optimize-check", headers=headers)
    assert response.status_code == 200, response.text
    assert response.json().keys() == {
        "query_execution_time_ms",
        "optimization_status",
        "index_utilization_percentage",
        "database_file_size_mb",
    }
    assert response.json()["optimization_status"] in {"OPTIMAL", "TUNING_REQUIRED"}
    assert all(isinstance(response.json()[key], float) for key in (
        "query_execution_time_ms", "index_utilization_percentage", "database_file_size_mb",
    ))
    db = SessionLocal()
    try:
        indexes = {
            row[0]
            for table_name in ("chart_of_accounts", "journal_lines", "journal_entries")
            for row in db.execute(text(f"SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = '{table_name}'"))
        }
        assert {"idx_coa_parent", "idx_jl_search", "idx_jh_status_year"} <= indexes
    finally:
        db.close()


def test_tenant_license_gates_operational_routes_and_tier_features(monkeypatch):
    monkeypatch.setenv("DEFAULT_ADMIN_EMAIL", "admin@meayon.local")
    monkeypatch.setenv("DEFAULT_ADMIN_PASSWORD", "ChangeMe123!")
    monkeypatch.setenv("SYSTEM_SUPERADMIN_KEY", "test-superadmin-key")
    token_response = client.post("/token", data={"username": "admin@meayon.local", "password": "ChangeMe123!"})
    authorization_headers = {"Authorization": f"Bearer {token_response.json()['access_token']}"}

    denied_issuance = client.post("/api/saas/issue-license", json={"company_name": "Test Tenant"})
    assert denied_issuance.status_code == 403
    issued = client.post(
        "/api/saas/issue-license",
        headers={"X-System-SuperAdmin": "test-superadmin-key"},
        json={"company_name": "Test Tenant", "subscription_tier": "BASIC", "max_allowed_cost_centers": 1},
    )
    assert issued.status_code == 200, issued.text
    license_headers = {**authorization_headers, "X-Tenant-License-Key": issued.json()["license_key"]}
    assert issued.json()["subscription_tier"] == "BASIC"
    assert isinstance(issued.json()["max_allowed_cost_centers"], int)

    suspended = client.get("/api/dashboard/summary-cards", headers=authorization_headers)
    assert suspended.status_code == 402, suspended.text
    assert suspended.json() == {"detail": "Subscription Suspended: Plan renewal or update required."}
    assert client.get("/api/dashboard/summary-cards", headers=license_headers).status_code == 200

    advanced = client.post("/api/finance/bank-reconciliation/multi-currency", headers=license_headers, json={"rows": []})
    assert advanced.status_code == 403, advanced.text

    first_cost_center = client.post(
        "/api/cost-centers", headers=license_headers,
        json={"code": f"tenant-cc-{uuid4().hex[:10]}", "name": "Tenant Cost Center", "is_leaf": True},
    )
    second_cost_center = client.post(
        "/api/cost-centers", headers=license_headers,
        json={"code": f"tenant-cc-{uuid4().hex[:10]}", "name": "Over Limit Cost Center", "is_leaf": True},
    )
    assert first_cost_center.status_code == 200, first_cost_center.text
    assert second_cost_center.status_code == 403, second_cost_center.text
    db = SessionLocal()
    try:
        db.delete(db.get(TenantLicense, issued.json()["tenant_id"]))
        db.commit()
    finally:
        db.close()


def test_system_settings_uses_active_tenant_visual_identity(monkeypatch):
    monkeypatch.setenv("SYSTEM_SUPERADMIN_KEY", "theme-superadmin-key")
    issued = client.post(
        "/api/saas/issue-license",
        headers={"X-System-SuperAdmin": "theme-superadmin-key"},
        json={
            "company_name": "Tenant Branding Co.",
            "subscription_tier": "PROFESSIONAL",
            "ui_theme_mode": "CUSTOM",
            "ui_primary_color": "#123456",
            "ui_secondary_color": "#FEDCBA",
            "ui_font_family": "Source Sans 3, sans-serif",
            "ui_logo_url": "https://example.com/tenant-logo.png",
        },
    )
    assert issued.status_code == 200, issued.text
    response = client.get("/api/system/settings", headers={"X-Tenant-License-Key": issued.json()["license_key"]})
    assert response.status_code == 200, response.text
    assert response.json() == {
        "system_name": "Oxen GL",
        "company_name": "Tenant Branding Co.",
        "vat_rate": 0.15,
        "theme_mode": "CUSTOM",
        "primary_color": "#123456",
        "secondary_color": "#FEDCBA",
        "font_family": "Source Sans 3, sans-serif",
        "logo_url": "https://example.com/tenant-logo.png",
    }
    db = SessionLocal()
    try:
        db.delete(db.get(TenantLicense, issued.json()["tenant_id"]))
        db.commit()
    finally:
        db.close()


def test_public_invoice_link_streams_pdf_and_rejects_expired_tokens(monkeypatch):
    monkeypatch.setenv("DEFAULT_ADMIN_EMAIL", "admin@meayon.local")
    monkeypatch.setenv("DEFAULT_ADMIN_PASSWORD", "ChangeMe123!")
    token_response = client.post("/token", data={"username": "admin@meayon.local", "password": "ChangeMe123!"})
    headers = {"Authorization": f"Bearer {token_response.json()['access_token']}"}
    invoice_id = str(uuid4())
    db = SessionLocal()
    try:
        db.add(Invoice(
            id=invoice_id, invoice_number=f"INV-PUBLIC-{uuid4().hex[:10]}",
            customer_id="public-customer", customer_name="Public Invoice Customer",
            subtotal=100, vat_amount=15, grand_total=115,
            status="FULLY_SIGNED_AND_ISSUED", is_signed=True,
        ))
        db.commit()
    finally:
        db.close()

    generated = client.post(f"/api/invoices/generate-public-link/{invoice_id}", headers=headers)
    assert generated.status_code == 200, generated.text
    secure_token = generated.json()["short_url"].rsplit("/", 1)[-1]
    assert len(secure_token) >= 20

    public_view = client.get(f"/public/invoice/{secure_token}")
    assert public_view.status_code == 200, public_view.text
    assert public_view.headers["content-type"].startswith("application/pdf")
    assert public_view.headers["content-disposition"] == 'inline; filename="Invoice.pdf"'
    assert public_view.content.startswith(b"%PDF-")
    db = SessionLocal()
    try:
        token = db.query(PublicInvoiceToken).filter_by(secure_token=secure_token).one()
        assert token.invoice_id == invoice_id
        assert db.query(AuditLog).filter_by(action="PUBLIC_INVOICE_OPENED", entity_id=invoice_id).count() == 1
        token.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.commit()
    finally:
        db.close()

    expired = client.get(f"/public/invoice/{secure_token}")
    assert expired.status_code == 403, expired.text


def test_fiscal_year_close_posts_retained_earnings_and_locks_new_entries(monkeypatch):
    monkeypatch.setenv("DEFAULT_ADMIN_EMAIL", "admin@meayon.local")
    monkeypatch.setenv("DEFAULT_ADMIN_PASSWORD", "ChangeMe123!")
    token_response = client.post("/token", data={"username": "admin@meayon.local", "password": "ChangeMe123!"})
    headers = {"Authorization": f"Bearer {token_response.json()['access_token']}"}
    fiscal_year = 3000 + (uuid4().int % 6000)
    revenue_account = f"REV-{uuid4().hex[:12]}"
    expense_account = f"EXP-{uuid4().hex[:12]}"
    revenue_cost_center = f"revenue-{uuid4().hex[:10]}"
    expense_cost_center = f"expense-{uuid4().hex[:10]}"
    revenue_journal_id = str(uuid4())
    expense_journal_id = str(uuid4())
    db = SessionLocal()
    try:
        db.add_all([
            ChartOfAccount(account_code=revenue_account, account_name="Closing Revenue Leaf", account_type="Revenue", parent_code="4000", is_postable=True),
            ChartOfAccount(account_code=expense_account, account_name="Closing Expense Leaf", account_type="Expense", parent_code="5000", is_postable=True),
            CostCenter(code=revenue_cost_center, name="Revenue Closing Center", is_leaf=True),
            CostCenter(code=expense_cost_center, name="Expense Closing Center", is_leaf=True),
            JournalEntry(
                id=revenue_journal_id, entry_number=f"JE-REV-CLOSE-{uuid4().hex[:10]}", fiscal_year=fiscal_year,
                description="Revenue for closing", status="POSTED_TO_MAIN_LEDGER", total_debit=0, total_credit=1000,
            ),
            JournalEntry(
                id=expense_journal_id, entry_number=f"JE-EXP-CLOSE-{uuid4().hex[:10]}", fiscal_year=fiscal_year,
                description="Expense for closing", status="POSTED_TO_MAIN_LEDGER", total_debit=600, total_credit=0,
            ),
            JournalLine(
                id=str(uuid4()), journal_entry_id=revenue_journal_id, account=revenue_account,
                debit=0, credit=1000, base_debit=0, base_credit=1000, cost_center_id=revenue_cost_center,
            ),
            JournalLine(
                id=str(uuid4()), journal_entry_id=expense_journal_id, account=expense_account,
                debit=600, credit=0, base_debit=600, base_credit=0, cost_center_id=expense_cost_center,
            ),
        ])
        db.commit()
    finally:
        db.close()

    response = client.post(f"/api/finance/year-end-close/{fiscal_year}", headers=headers)
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["status"] == "CLOSED"
    assert result["totalRevenue"] == 1000.0
    assert result["totalExpenses"] == 600.0
    assert result["netIncome"] == 400.0
    assert result["journal"]["totalDebit"] == 1000.0
    assert result["journal"]["totalCredit"] == 1000.0
    db = SessionLocal()
    try:
        assert db.get(FiscalPeriod, fiscal_year).closed_by_user_id
        closing_lines = db.query(JournalLine).filter_by(journal_entry_id=result["journal"]["id"]).order_by(JournalLine.created_at).all()
        assert [(line.account, line.debit, line.credit) for line in closing_lines] == [
            (revenue_account, 1000, 0),
            (expense_account, 0, 600),
            ("3100", 0, 400),
        ]
        assert db.get(JournalEntry, revenue_journal_id).is_locked is True
    finally:
        db.close()

    locked_write = client.post(
        "/api/journal-entries",
        headers=headers,
        json={
            "entry_number": f"JE-LOCKED-{uuid4().hex[:10]}",
            "entry_date": f"{fiscal_year}-12-31T00:00:00Z",
            "description": "Should be denied",
            "lines": [{"account": "Cash", "debit": 10, "credit": 0}, {"account": "Sales", "debit": 0, "credit": 10}],
        },
    )
    assert locked_write.status_code == 400, locked_write.text
    assert locked_write.json() == {"detail": "Transaction Denied: Target fiscal year is locked and audited."}


def test_ceo_signing_issues_invoice_and_posts_three_line_journal():
    cost_center_id = f"invoice-route-{uuid4().hex[:10]}"
    invoice_id = str(uuid4())
    ceo_email = f"ceo-{uuid4().hex[:10]}@meayon.local"
    db = SessionLocal()
    try:
        ceo_role = db.query(Role).filter_by(name="CEO").first()
        if ceo_role is None:
            ceo_role = Role(id=str(uuid4()), name="CEO", description="Chief Executive Officer")
            db.add(ceo_role)
            db.flush()
        ceo_user_id = str(uuid4())
        ceo_user = User(
            id=ceo_user_id, username=f"chief.executive.{uuid4().hex[:10]}", email=ceo_email,
            full_name="Chief Executive", password_hash=hash_password("ChangeMe123!"),
            role_id=ceo_role.id, is_active=True,
        )
        db.add_all([
            ceo_user,
            CostCenter(code=cost_center_id, name="Invoice Route", is_leaf=True),
            Invoice(
                id=invoice_id, invoice_number=f"INV-SIGN-{uuid4().hex[:10]}",
                customer_id="customer-sign", customer_name="Signed Invoice Customer",
                subtotal=100, vat_amount=15, grand_total=115, status="Approved",
                cost_center_id=cost_center_id,
            ),
        ])
        db.commit()
    finally:
        db.close()

    token = create_access_token(subject=ceo_email)
    response = client.post(
        f"/api/invoices/approve-and-sign/{invoice_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"electronic_signature_hash": "sha256:test-signature"},
    )

    assert response.status_code == 200, response.text
    result = response.json()
    assert result["status"] == "FULLY_SIGNED_AND_ISSUED"
    assert result["isSigned"] is True
    assert result["totalDebit"] == 115.0
    assert result["totalCredit"] == 115.0
    db = SessionLocal()
    try:
        invoice = db.get(Invoice, invoice_id)
        assert invoice.electronic_signature_hash == "sha256:test-signature"
        assert invoice.approved_by_user_id == ceo_user_id
        lines = db.query(JournalLine).filter_by(journal_entry_id=result["journalEntryId"]).order_by(JournalLine.created_at).all()
        assert [(line.account, line.debit, line.credit, line.cost_center_id) for line in lines] == [
            ("1201", 115, 0, None),
            ("4101", 0, 100, cost_center_id),
            ("2201", 0, 15, None),
        ]
        audit_log = db.query(AuditLog).filter_by(action="APPROVE_AND_SIGN_INVOICE", entity_id=invoice_id).one()
        assert audit_log.user_id == ceo_user_id
        assert audit_log.endpoint_accessed == f"/api/invoices/approve-and-sign/{invoice_id}"
        assert audit_log.ip_address
        assert json.loads(audit_log.mathematical_impact)["gross_amount"] == 115.0
    finally:
        db.close()

    duplicate = client.post(
        f"/api/invoices/approve-and-sign/{invoice_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"electronic_signature_hash": "sha256:duplicate"},
    )
    assert duplicate.status_code == 400, duplicate.text


def test_audit_log_records_cannot_be_updated_or_deleted():
    audit_log_id = str(uuid4())
    db = SessionLocal()
    try:
        db.add(AuditLog(id=audit_log_id, actor_email="audit@test.local", action="CREATE", entity="Test"))
        db.commit()
        audit_log = db.get(AuditLog, audit_log_id)
        audit_log.details = "altered"
        with pytest.raises(IntegrityError, match="AuditLog records are immutable"):
            db.commit()
        db.rollback()
        audit_log = db.get(AuditLog, audit_log_id)
        db.delete(audit_log)
        with pytest.raises(IntegrityError, match="AuditLog records are immutable"):
            db.commit()
        db.rollback()
    finally:
        db.close()


def test_fixed_asset_depreciation_posts_straight_line_journal(monkeypatch):
    monkeypatch.setenv("DEFAULT_ADMIN_EMAIL", "admin@meayon.local")
    monkeypatch.setenv("DEFAULT_ADMIN_PASSWORD", "ChangeMe123!")
    token_response = client.post("/token", data={"username": "admin@meayon.local", "password": "ChangeMe123!"})
    headers = {"Authorization": f"Bearer {token_response.json()['access_token']}"}
    cost_center_id = f"asset-route-{uuid4().hex[:10]}"
    db = SessionLocal()
    try:
        db.add(CostCenter(code=cost_center_id, name="Asset Operations", is_leaf=True))
        db.commit()
    finally:
        db.close()

    created = client.post(
        "/api/finance/fixed-assets",
        headers=headers,
        json={
            "asset_name": "Loader Unit 01",
            "purchase_cost": "1200.00",
            "residual_value": "120.00",
            "useful_life_months": 12,
            "asset_account_code": "1201",
            "expense_account_code": "5101",
            "cost_center_id": cost_center_id,
        },
    )
    assert created.status_code == 200, created.text

    response = client.post("/api/finance/fixed-assets/run-depreciation", headers=headers)
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["processedAssets"] >= 1
    journal = next(item for item in result["journals"] if item["assetId"] == created.json()["id"])
    assert journal["status"] == "POSTED_TO_MAIN_LEDGER"
    assert journal["totalDebit"] == 90.0
    assert journal["totalCredit"] == 90.0
    db = SessionLocal()
    try:
        asset = db.get(FixedAsset, created.json()["id"])
        assert asset.depreciated_months == 1
        lines = db.query(JournalLine).filter_by(journal_entry_id=journal["id"]).order_by(JournalLine.created_at).all()
        assert [(line.account, line.debit, line.credit, line.cost_center_id) for line in lines] == [
            ("5101", 90, 0, cost_center_id),
            ("1201", 0, 90, None),
        ]
    finally:
        db.close()


def test_monthly_payroll_posts_consolidated_balanced_journal(monkeypatch):
    monkeypatch.setenv("DEFAULT_ADMIN_EMAIL", "admin@meayon.local")
    monkeypatch.setenv("DEFAULT_ADMIN_PASSWORD", "ChangeMe123!")
    token_response = client.post("/token", data={"username": "admin@meayon.local", "password": "ChangeMe123!"})
    headers = {"Authorization": f"Bearer {token_response.json()['access_token']}"}
    first_cost_center_id = f"payroll-a-{uuid4().hex[:10]}"
    second_cost_center_id = f"payroll-b-{uuid4().hex[:10]}"
    db = SessionLocal()
    try:
        db.add_all([
            CostCenter(code=first_cost_center_id, name="Payroll Route A", is_leaf=True),
            CostCenter(code=second_cost_center_id, name="Payroll Route B", is_leaf=True),
        ])
        db.commit()
    finally:
        db.close()

    first_contract = client.post(
        "/api/finance/employee-contracts",
        headers=headers,
        json={"employee_name": "Employee One", "base_salary": "2000.00", "allowances": "200.00", "deductions": "200.00", "cost_center_id": first_cost_center_id},
    )
    second_contract = client.post(
        "/api/finance/employee-contracts",
        headers=headers,
        json={"employee_name": "Employee Two", "base_salary": "1000.00", "allowances": "0.00", "deductions": "0.00", "cost_center_id": second_cost_center_id},
    )
    assert first_contract.status_code == 200, first_contract.text
    assert second_contract.status_code == 200, second_contract.text

    response = client.post("/api/finance/payroll/process-monthly", headers=headers)
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["processedEmployees"] == 2
    assert result["totalGrossSalary"] == 3200.0
    assert result["totalNetPayout"] == 3000.0
    assert result["totalDeductions"] == 200.0
    assert result["journal"]["status"] == "POSTED_TO_MAIN_LEDGER"
    assert result["journal"]["totalDebit"] == 3200.0
    assert result["journal"]["totalCredit"] == 3200.0
    db = SessionLocal()
    try:
        lines = db.query(JournalLine).filter_by(journal_entry_id=result["journal"]["id"]).order_by(JournalLine.created_at).all()
        assert [(line.account, line.debit, line.credit, line.cost_center_id) for line in lines] == [
            ("5201", 2200, 0, first_cost_center_id),
            ("5201", 1000, 0, second_cost_center_id),
            ("2300", 0, 3000, None),
            ("2310", 0, 200, None),
        ]
        db.query(EmployeeContract).filter(EmployeeContract.id.in_([first_contract.json()["id"], second_contract.json()["id"]])).update(
            {EmployeeContract.is_active: False}, synchronize_session=False
        )
        db.commit()
    finally:
        db.close()


def test_intercompany_trade_creates_balanced_pending_journal(monkeypatch):
    monkeypatch.setenv("DEFAULT_ADMIN_EMAIL", "admin@meayon.local")
    monkeypatch.setenv("DEFAULT_ADMIN_PASSWORD", "ChangeMe123!")
    token_response = client.post("/token", data={"username": "admin@meayon.local", "password": "ChangeMe123!"})
    headers = {"Authorization": f"Bearer {token_response.json()['access_token']}"}
    origin_cost_center_id = f"origin-{uuid4().hex[:10]}"
    target_cost_center_id = f"target-{uuid4().hex[:10]}"
    db = SessionLocal()
    try:
        db.add_all([
            CostCenter(code=origin_cost_center_id, name="Origin Route", is_leaf=True),
            CostCenter(code=target_cost_center_id, name="Target Route", is_leaf=True),
        ])
        db.commit()
    finally:
        db.close()

    response = client.post(
        "/api/operations/intercompany-trade",
        headers=headers,
        json={
            "origin_company_id": "company-a",
            "target_company_id": "company-b",
            "amount": 250,
            "origin_cost_center_id": origin_cost_center_id,
            "target_cost_center_id": target_cost_center_id,
            "reference_id": f"trade-{uuid4().hex[:10]}",
        },
    )

    assert response.status_code == 200, response.text
    result = response.json()
    assert result["status"] == "PENDING_CEO_APPROVAL"
    assert result["totalDebit"] == 500
    assert result["totalCredit"] == 500
    db = SessionLocal()
    try:
        lines = db.query(JournalLine).filter_by(journal_entry_id=result["id"]).order_by(JournalLine.created_at).all()
        assert [(line.account, line.debit, line.credit, line.cost_center_id) for line in lines] == [
            ("1300", 250, 0, None),
            ("4100", 0, 250, origin_cost_center_id),
            ("5100", 250, 0, target_cost_center_id),
            ("2300", 0, 250, None),
        ]
    finally:
        db.close()


def test_posted_journal_is_reversed_without_mutating_original(monkeypatch):
    monkeypatch.setenv("DEFAULT_ADMIN_EMAIL", "admin@meayon.local")
    monkeypatch.setenv("DEFAULT_ADMIN_PASSWORD", "ChangeMe123!")
    token_response = client.post("/token", data={"username": "admin@meayon.local", "password": "ChangeMe123!"})
    headers = {"Authorization": f"Bearer {token_response.json()['access_token']}"}
    suffix = uuid4().hex[:10]
    created = client.post(
        "/api/journal-entries",
        headers=headers,
        json={
            "entry_number": f"JE-REV-{suffix}",
            "description": "Reversal test",
            "status": "Draft",
            "lines": [
                {"account": "Expense", "debit": 75, "credit": 0},
                {"account": "Cash", "debit": 0, "credit": 75},
            ],
        },
    )
    journal_id = created.json()["id"]
    posted = client.post(f"/api/journal-entries/{journal_id}/post", headers=headers)
    reversed_entry = client.post(f"/api/journal-entries/{journal_id}/reverse", headers=headers)

    assert posted.status_code == 200, posted.text
    assert reversed_entry.status_code == 200, reversed_entry.text
    assert reversed_entry.json()["referenceId"] == journal_id
    assert reversed_entry.json()["totalDebit"] == 75
    assert reversed_entry.json()["totalCredit"] == 75

    duplicate = client.post(f"/api/journal-entries/{journal_id}/reverse", headers=headers)
    assert duplicate.status_code == 409, duplicate.text


def test_invoice_lifecycle_requires_valid_transitions(monkeypatch):
    monkeypatch.setenv("DEFAULT_ADMIN_EMAIL", "admin@meayon.local")
    monkeypatch.setenv("DEFAULT_ADMIN_PASSWORD", "ChangeMe123!")
    token_response = client.post("/token", data={"username": "admin@meayon.local", "password": "ChangeMe123!"})
    headers = {"Authorization": f"Bearer {token_response.json()['access_token']}"}
    suffix = uuid4().hex[:10]
    created = client.post(
        "/api/invoices",
        headers=headers,
        json={
            "invoice_number": f"INV-LIFECYCLE-{suffix}",
            "customer_id": "customer-lifecycle",
            "customer_name": "Lifecycle Customer",
            "subtotal": 100,
            "vat_amount": 15,
            "grand_total": 115,
            "status": "Pending_Approval",
        },
    )
    invoice_id = created.json()["id"]
    approved = client.post(f"/api/invoices/{invoice_id}/approve", headers=headers)
    issued = client.post(f"/api/invoices/{invoice_id}/issue", headers=headers)
    paid = client.post(f"/api/invoices/{invoice_id}/pay", headers=headers)

    assert created.status_code == 200, created.text
    assert approved.status_code == 200 and approved.json()["status"] == "Approved", approved.text
    assert issued.status_code == 200 and issued.json()["status"] == "Issued", issued.text
    assert paid.status_code == 200 and paid.json()["status"] == "Paid", paid.text
    assert client.post(f"/api/invoices/{invoice_id}/pay", headers=headers).status_code == 409
