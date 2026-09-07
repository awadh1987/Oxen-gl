import json
import uuid
from datetime import datetime, timezone
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from Backend.database import SessionLocal
from Backend.main import app, get_active_company_id, get_authenticated_user
from Backend.models import (
    CustomerInvoice,
    ResCompany,
    ResUser,
    SecurityEvent,
    TaxProfile,
    TaxRule,
    ZATCALog,
)


@pytest.fixture(scope="module")
def db_session():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="module")
def p5_logic_fixtures(db_session: Session):
    # Tenant A
    company_a = db_session.scalar(select(ResCompany).where(ResCompany.slug == "p5-tenant-a-logistics"))
    if not company_a:
        company_a = ResCompany(
            name="Tenant A Logistics",
            slug="p5-tenant-a-logistics",
            currency="SAR",
            commercial_registration="1010999001",
            tax_id="300099900100003",
        )
        db_session.add(company_a)
        db_session.commit()
        db_session.refresh(company_a)

    admin_a = db_session.scalar(select(ResUser).where(ResUser.email == "admin_a@tenant-a.com"))
    if not admin_a:
        admin_a = ResUser(
            firebase_uid="uid-admin-a",
            email="admin_a@tenant-a.com",
            full_name="Admin Tenant A",
            company_id=company_a.id,
            role="Admin",
            is_active=True,
        )
        db_session.add(admin_a)
        db_session.commit()
        db_session.refresh(admin_a)

    guest_a = db_session.scalar(select(ResUser).where(ResUser.email == "guest_a@tenant-a.com"))
    if not guest_a:
        guest_a = ResUser(
            firebase_uid="uid-guest-a",
            email="guest_a@tenant-a.com",
            full_name="Guest Tenant A",
            company_id=company_a.id,
            role="Guest",
            is_active=True,
        )
        db_session.add(guest_a)
        db_session.commit()
        db_session.refresh(guest_a)

    # Tenant B
    company_b = db_session.scalar(select(ResCompany).where(ResCompany.slug == "p5-tenant-b-logistics"))
    if not company_b:
        company_b = ResCompany(
            name="Tenant B Logistics",
            slug="p5-tenant-b-logistics",
            currency="SAR",
            commercial_registration="1010999002",
            tax_id="300099900200003",
        )
        db_session.add(company_b)
        db_session.commit()
        db_session.refresh(company_b)

    admin_b = db_session.scalar(select(ResUser).where(ResUser.email == "admin_b@tenant-b.com"))
    if not admin_b:
        admin_b = ResUser(
            firebase_uid="uid-admin-b",
            email="admin_b@tenant-b.com",
            full_name="Admin Tenant B",
            company_id=company_b.id,
            role="Admin",
            is_active=True,
        )
        db_session.add(admin_b)
        db_session.commit()
        db_session.refresh(admin_b)

    # Invoice for Tenant A
    invoice_a = db_session.scalar(
        select(CustomerInvoice).where(
            CustomerInvoice.company_id == company_a.id,
            CustomerInvoice.invoice_number == "INV-TENANT-A-001",
        )
    )
    if not invoice_a:
        invoice_a = CustomerInvoice(
            company_id=company_a.id,
            invoice_number="INV-TENANT-A-001",
            customer_name="Al-Marai Dairy Transport",
            customer_tax_number="300012345600003",
            issue_date=datetime.now(timezone.utc),
            subtotal=Decimal("20000.0000"),
            vat_amount=Decimal("3000.0000"),
            grand_total=Decimal("23000.0000"),
            status="Draft",
        )
        db_session.add(invoice_a)
        db_session.commit()
        db_session.refresh(invoice_a)

    return {
        "company_a": company_a,
        "admin_a": admin_a,
        "guest_a": guest_a,
        "company_b": company_b,
        "admin_b": admin_b,
        "invoice_a": invoice_a,
    }


# ==============================================================================
# 1. TaxProfile & TaxRule CRUD Tests
# ==============================================================================

def test_tax_profile_and_rule_crud(p5_logic_fixtures, db_session: Session):
    company_a = p5_logic_fixtures["company_a"]
    admin_a = p5_logic_fixtures["admin_a"]

    app.dependency_overrides[get_active_company_id] = lambda: company_a.id
    app.dependency_overrides[get_authenticated_user] = lambda: admin_a

    with TestClient(app) as client:
        unique_tax_id = f"300{uuid.uuid4().hex[:10]}00003"[:15]
        # Create Tax Profile
        profile_res = client.post(
            "/api/compliance/tax-profiles",
            json={
                "tax_id": unique_tax_id,
                "legal_name": "Tenant A Logistics Co.",
                "trade_name": "Tenant A Logistics",
                "city": "Riyadh",
                "country_code": "SA",
                "zatca_stage": "simulation",
                "is_active": True,
            },
        )
        assert profile_res.status_code == 201
        profile_data = profile_res.json()
        profile_id = profile_data["id"]
        assert profile_data["legal_name"] == "Tenant A Logistics Co."
        assert profile_data["is_active"] is True

        # Create Tax Rule linked to Profile
        rule_code = f"VAT-15-{uuid.uuid4().hex[:6].upper()}"
        rule_res = client.post(
            "/api/compliance/tax-rules",
            json={
                "tax_profile_id": profile_id,
                "code": rule_code,
                "name": "Standard VAT 15%",
                "rate": "0.1500",
                "tax_type": "vat",
                "start_date": "2026-01-01T00:00:00Z",
                "description": "Standard 15% VAT for commercial freight services",
            },
        )
        assert rule_res.status_code == 201
        rule_data = rule_res.json()
        rule_id = rule_data["id"]
        assert rule_data["code"] == rule_code
        assert Decimal(str(rule_data["rate"])) == Decimal("0.1500")

        # List Tax Profiles
        list_res = client.get("/api/compliance/tax-profiles")
        assert list_res.status_code == 200
        assert any(p["id"] == profile_id for p in list_res.json())

        # List Tax Rules
        rules_list_res = client.get(f"/api/compliance/tax-rules?tax_profile_id={profile_id}")
        assert rules_list_res.status_code == 200
        assert any(r["id"] == rule_id for r in rules_list_res.json())

    app.dependency_overrides.clear()


# ==============================================================================
# 2. ZATCA Adapter Clearance & Reporting Transitions
# ==============================================================================

def test_zatca_clearance_b2b_status_transitions(p5_logic_fixtures, db_session: Session):
    company_a = p5_logic_fixtures["company_a"]
    admin_a = p5_logic_fixtures["admin_a"]
    invoice_a = p5_logic_fixtures["invoice_a"]

    app.dependency_overrides[get_active_company_id] = lambda: company_a.id
    app.dependency_overrides[get_authenticated_user] = lambda: admin_a

    with TestClient(app) as client:
        # Submit as B2B Tax Invoice (Standard)
        res = client.post(
            f"/api/compliance/zatca/process-invoice/{invoice_a.id}?invoice_type=B2B",
        )
        assert res.status_code == 200
        zatca_log = res.json()

        # Check B2B clearance transitions
        assert zatca_log["submission_status"] == "CLEARED"
        assert zatca_log["clearance_status"] == "CLEARED"
        assert zatca_log["reporting_status"] is None
        assert zatca_log["retry_count"] == 0
        assert zatca_log["validation_errors"] is None

        # Check cryptographic attributes
        assert zatca_log["invoice_hash"] is not None
        assert len(zatca_log["invoice_hash"]) == 64  # SHA-256
        assert zatca_log["qr_code_payload"] is not None
        assert zatca_log["cryptographic_stamp"] is not None

        # Check UBL 2.1 XML content
        xml = zatca_log["xml_payload"]
        assert 'name="0100000"' in xml  # B2B Standard Tax Invoice code
        assert "<cbc:ProfileID>reporting:1.0</cbc:ProfileID>" in xml

    app.dependency_overrides.clear()


def test_zatca_reporting_b2c_status_transitions(p5_logic_fixtures, db_session: Session):
    company_a = p5_logic_fixtures["company_a"]
    admin_a = p5_logic_fixtures["admin_a"]
    invoice_a = p5_logic_fixtures["invoice_a"]

    app.dependency_overrides[get_active_company_id] = lambda: company_a.id
    app.dependency_overrides[get_authenticated_user] = lambda: admin_a

    with TestClient(app) as client:
        # Submit as B2C Simplified Tax Invoice
        res = client.post(
            f"/api/compliance/zatca/process-invoice/{invoice_a.id}?invoice_type=B2C",
        )
        assert res.status_code == 200
        zatca_log = res.json()

        # Check B2C reporting transitions
        assert zatca_log["submission_status"] == "REPORTED"
        assert zatca_log["reporting_status"] == "REPORTED"
        assert zatca_log["clearance_status"] is None
        assert zatca_log["retry_count"] == 0

        # Check UBL 2.1 XML content
        xml = zatca_log["xml_payload"]
        assert 'name="0200000"' in xml  # B2C Simplified Tax Invoice code

    app.dependency_overrides.clear()


# ==============================================================================
# 3. ZATCA Retry Mechanism
# ==============================================================================

def test_zatca_simulation_failure_and_retry_flow(p5_logic_fixtures, db_session: Session):
    company_a = p5_logic_fixtures["company_a"]
    admin_a = p5_logic_fixtures["admin_a"]
    invoice_a = p5_logic_fixtures["invoice_a"]

    app.dependency_overrides[get_active_company_id] = lambda: company_a.id
    app.dependency_overrides[get_authenticated_user] = lambda: admin_a

    with TestClient(app) as client:
        # 1. Process invoice with simulated network failure
        fail_res = client.post(
            f"/api/compliance/zatca/process-invoice/{invoice_a.id}?invoice_type=B2B&simulate_failure=true&failure_reason=Simulated%20ZATCA%20gateway%20timeout%20504",
        )
        assert fail_res.status_code == 200
        fail_log = fail_res.json()
        log_id = fail_log["id"]

        assert fail_log["submission_status"] == "FAILED"
        assert fail_log["clearance_status"] is None
        assert fail_log["reporting_status"] is None
        assert fail_log["retry_count"] == 1
        assert "504" in fail_log["validation_errors"]

        # 2. Retry with simulated failure again
        retry_fail_res = client.post(
            f"/api/compliance/zatca/retry/{log_id}?simulate_failure=true&failure_reason=Secondary%20retry%20failure",
        )
        assert retry_fail_res.status_code == 200
        retry_fail_log = retry_fail_res.json()
        assert retry_fail_log["submission_status"] == "FAILED"
        assert retry_fail_log["retry_count"] == 2
        assert "Secondary retry failure" in retry_fail_log["validation_errors"]

        # 3. Retry with recovery (success)
        retry_success_res = client.post(
            f"/api/compliance/zatca/retry/{log_id}?simulate_failure=false",
        )
        assert retry_success_res.status_code == 200
        retry_success_log = retry_success_res.json()
        assert retry_success_log["submission_status"] == "CLEARED"
        assert retry_success_log["clearance_status"] == "CLEARED"
        assert retry_success_log["retry_count"] == 3
        assert retry_success_log["validation_errors"] is None

    app.dependency_overrides.clear()


# ==============================================================================
# 4. Tenant Escape (IDOR) Blocking and SecurityEvent Audit
# ==============================================================================

def test_cross_tenant_idor_is_blocked_and_logged(p5_logic_fixtures, db_session: Session):
    company_a = p5_logic_fixtures["company_a"]
    admin_a = p5_logic_fixtures["admin_a"]
    company_b = p5_logic_fixtures["company_b"]
    admin_b = p5_logic_fixtures["admin_b"]

    # Step 1: Create a TaxProfile owned by Tenant A
    app.dependency_overrides[get_active_company_id] = lambda: company_a.id
    app.dependency_overrides[get_authenticated_user] = lambda: admin_a

    with TestClient(app) as client:
        secret_tax_id = f"300{uuid.uuid4().hex[:10]}00003"[:15]
        profile_res = client.post(
            "/api/compliance/tax-profiles",
            json={
                "tax_id": secret_tax_id,
                "legal_name": "Tenant A Secret Profile",
                "city": "Dammam",
                "country_code": "SA",
                "zatca_stage": "production",
            },
        )
        assert profile_res.status_code == 201
        tenant_a_profile_id = profile_res.json()["id"]

    app.dependency_overrides.clear()

    # Step 2: Tenant B attempts to read Tenant A's Tax Profile
    app.dependency_overrides[get_active_company_id] = lambda: company_b.id
    app.dependency_overrides[get_authenticated_user] = lambda: admin_b

    with TestClient(app) as client:
        # Cross-tenant GET
        idor_get_res = client.get(f"/api/compliance/tax-profiles/{tenant_a_profile_id}")
        assert idor_get_res.status_code == 403
        assert "IDOR" in idor_get_res.json()["detail"]

        # Cross-tenant PUT
        idor_put_res = client.put(
            f"/api/compliance/tax-profiles/{tenant_a_profile_id}",
            json={"city": "Hacked City"},
        )
        assert idor_put_res.status_code == 403

        # Cross-tenant DELETE
        idor_del_res = client.delete(f"/api/compliance/tax-profiles/{tenant_a_profile_id}")
        assert idor_del_res.status_code == 403

        # Non-existent resource returns genuine 404 (not IDOR)
        random_uuid = str(uuid.uuid4())
        not_found_res = client.get(f"/api/compliance/tax-profiles/{random_uuid}")
        assert not_found_res.status_code == 404

    app.dependency_overrides.clear()

    # Step 3: Verify immutable SecurityEvent logging in database
    idor_events = db_session.scalars(
        select(SecurityEvent).where(
            SecurityEvent.company_id == company_b.id,
            SecurityEvent.event_type == "idor_attempt",
            SecurityEvent.resource_id == tenant_a_profile_id,
        )
    ).all()

    assert len(idor_events) >= 3
    for ev in idor_events:
        assert ev.severity == "CRITICAL"
        assert ev.actor_email == admin_b.email
        assert "Cross-tenant IDOR attempt" in ev.details


# ==============================================================================
# 5. Policy Denial / Privilege Escalation Guard
# ==============================================================================

def test_policy_denial_for_non_compliance_roles(p5_logic_fixtures, db_session: Session):
    company_a = p5_logic_fixtures["company_a"]
    guest_a = p5_logic_fixtures["guest_a"]

    # Authenticated as Guest (not Admin or Accountant)
    app.dependency_overrides[get_active_company_id] = lambda: company_a.id
    app.dependency_overrides[get_authenticated_user] = lambda: guest_a

    with TestClient(app) as client:
        # Attempt to create Tax Profile
        res = client.post(
            "/api/compliance/tax-profiles",
            json={
                "tax_id": "300099900100003",
                "legal_name": "Illegal Profile Creation",
                "city": "Jeddah",
                "country_code": "SA",
            },
        )
        assert res.status_code == 403
        assert "Admin or Accountant role required" in res.json()["detail"]

    app.dependency_overrides.clear()

    # Verify immutable SecurityEvent logging for policy_denial
    denial_event = db_session.scalar(
        select(SecurityEvent).where(
            SecurityEvent.company_id == company_a.id,
            SecurityEvent.event_type == "policy_denial",
            SecurityEvent.user_id == guest_a.id,
        ).order_by(SecurityEvent.created_at.desc())
    )

    assert denial_event is not None
    assert denial_event.severity == "HIGH"
    assert denial_event.actor_email == guest_a.email
    assert "Guest" in denial_event.details


# ==============================================================================
# 6. Security Audit Event Log Query API
# ==============================================================================

def test_security_events_list_endpoint(p5_logic_fixtures):
    company_a = p5_logic_fixtures["company_a"]
    admin_a = p5_logic_fixtures["admin_a"]

    app.dependency_overrides[get_active_company_id] = lambda: company_a.id
    app.dependency_overrides[get_authenticated_user] = lambda: admin_a

    with TestClient(app) as client:
        res = client.get("/api/security/events?event_type=policy_denial")
        assert res.status_code == 200
        events = res.json()
        assert isinstance(events, list)
        assert len(events) >= 1
        assert all(e["event_type"] == "policy_denial" for e in events)

    app.dependency_overrides.clear()
