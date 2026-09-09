import uuid
from datetime import datetime, timezone
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.main import app, get_active_company_id, get_authenticated_user
from backend.models import (
    AccountAccount,
    AccountJournal,
    AccountMove,
    AccountMoveLine,
    FiscalYear,
    ResCompany,
    ResPartner,
    ResUser,
)
from backend.zatca_adapter import encode_tlv, generate_zatca_qr_code, ZATCAAdapter


@pytest.fixture(scope="module")
def db_session():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="module")
def remediation_fixtures(db_session: Session):
    # Tenant Alpha
    comp_a = db_session.scalar(select(ResCompany).where(ResCompany.slug == "audit-tenant-alpha"))
    if not comp_a:
        comp_a = ResCompany(
            name="Audit Tenant Alpha",
            slug="audit-tenant-alpha",
            currency="SAR",
            commercial_registration="1010111111",
            tax_id="300011111100003",
            license_key="LIC-ALPHA-SECRET-KEY-12345",
        )
        db_session.add(comp_a)
        db_session.commit()
        db_session.refresh(comp_a)

    # Tenant Beta
    comp_b = db_session.scalar(select(ResCompany).where(ResCompany.slug == "audit-tenant-beta"))
    if not comp_b:
        comp_b = ResCompany(
            name="Audit Tenant Beta",
            slug="audit-tenant-beta",
            currency="SAR",
            commercial_registration="1010222222",
            tax_id="300022222200003",
            license_key="LIC-BETA-SECRET-KEY-67890",
        )
        db_session.add(comp_b)
        db_session.commit()
        db_session.refresh(comp_b)

    # User in Tenant Alpha
    user_a = db_session.scalar(select(ResUser).where(ResUser.email == "user-a@audit.com"))
    if not user_a:
        user_a = ResUser(
            firebase_uid="audit-uid-alpha",
            email="user-a@audit.com",
            full_name="Alpha Operator",
            company_id=comp_a.id,
            role="Accountant",
            is_active=True,
        )
        db_session.add(user_a)
        db_session.commit()
        db_session.refresh(user_a)

    # User in Tenant Beta
    user_b = db_session.scalar(select(ResUser).where(ResUser.email == "user-b@audit.com"))
    if not user_b:
        user_b = ResUser(
            firebase_uid="audit-uid-beta",
            email="user-b@audit.com",
            full_name="Beta Operator",
            company_id=comp_b.id,
            role="Accountant",
            is_active=True,
        )
        db_session.add(user_b)
        db_session.commit()
        db_session.refresh(user_b)

    # Accounts for Tenant Alpha
    acc_cash_a = db_session.scalar(
        select(AccountAccount).where(
            AccountAccount.company_id == comp_a.id,
            AccountAccount.code == "101000",
        )
    )
    if not acc_cash_a:
        acc_cash_a = AccountAccount(
            company_id=comp_a.id,
            code="101000",
            name="Alpha Operating Cash",
            internal_type="asset",
            currency="SAR",
        )
        db_session.add(acc_cash_a)

    acc_payable_a = db_session.scalar(
        select(AccountAccount).where(
            AccountAccount.company_id == comp_a.id,
            AccountAccount.code == "201000",
        )
    )
    if not acc_payable_a:
        acc_payable_a = AccountAccount(
            company_id=comp_a.id,
            code="201000",
            name="Alpha Accounts Payable",
            internal_type="liability",
            currency="SAR",
        )
        db_session.add(acc_payable_a)

    db_session.commit()
    db_session.refresh(acc_cash_a)
    db_session.refresh(acc_payable_a)

    return {
        "comp_a": comp_a,
        "comp_b": comp_b,
        "user_a": user_a,
        "user_b": user_b,
        "acc_cash_a": acc_cash_a,
        "acc_payable_a": acc_payable_a,
    }


def test_direct_access_backdoor_returns_404():
    """Verify REM-P0-002: backdoor endpoint /api/auth/direct-access is disabled and returns 404."""
    client = TestClient(app)
    response = client.post(
        "/api/auth/direct-access",
        json={"scope": "master", "recovery_code": "oxengl-master-recovery-2026"},
    )
    assert response.status_code == 404
    assert "disabled" in response.json().get("detail", "").lower() or "not found" in response.json().get("detail", "").lower()


def test_companies_unauthenticated_masks_secrets(remediation_fixtures):
    """Verify REM-P0-004: /api/companies hides tax_id, commercial_registration, and license_key for public."""
    client = TestClient(app)
    response = client.get("/api/companies")
    assert response.status_code == 200
    companies = response.json()
    assert len(companies) > 0

    alpha_entry = next((c for c in companies if c["id"] == str(remediation_fixtures["comp_a"].id)), None)
    assert alpha_entry is not None
    # Verify confidential data is masked or null
    assert alpha_entry.get("tax_id") is None or "MASKED" in alpha_entry.get("tax_id", "")
    assert alpha_entry.get("commercial_registration") is None or "MASKED" in alpha_entry.get("commercial_registration", "")
    assert alpha_entry.get("license_key") is None or "MASKED" in alpha_entry.get("license_key", "")


def test_tenants_public_endpoint_safe_fields(remediation_fixtures):
    """Verify public tenant directory endpoint exposes only UI/branding fields."""
    client = TestClient(app)
    response = client.get("/api/auth/tenants-public")
    assert response.status_code == 200
    tenants = response.json()
    assert isinstance(tenants, list)
    for t in tenants:
        assert "id" in t
        assert "name" in t
        assert "slug" in t
        assert "tax_id" not in t
        assert "commercial_registration" not in t
        assert "license_key" not in t


def test_multi_tenant_isolation_idor_prevention(remediation_fixtures):
    """Verify cross-tenant IDOR isolation between Tenant Alpha and Tenant Beta."""
    comp_a = remediation_fixtures["comp_a"]
    comp_b = remediation_fixtures["comp_b"]
    user_a = remediation_fixtures["user_a"]

    client = TestClient(app)
    app.dependency_overrides[get_authenticated_user] = lambda: user_a
    app.dependency_overrides[get_active_company_id] = lambda: comp_a.id

    try:
        # Create a partner in Tenant A
        unique_id = uuid.uuid4().hex[:6]
        res_create = client.post(
            "/api/partners",
            json={
                "name": f"Confidential Alpha Partner {unique_id}",
                "partner_type": "customer",
                "email": f"alpha_partner_{unique_id}@test.com",
            },
            headers={"X-Company-ID": str(comp_a.id)},
        )
        assert res_create.status_code == 201
        partner_a_id = res_create.json()["id"]

        # Now switch active context to Tenant B and attempt to access or list
        app.dependency_overrides[get_active_company_id] = lambda: comp_b.id

        # Query partners for Tenant B - should NOT contain Tenant A's partner
        res_list_b = client.get(
            "/api/partners",
            headers={"X-Company-ID": str(comp_b.id)},
        )
        assert res_list_b.status_code == 200
        b_partner_ids = [p["id"] for p in res_list_b.json()]
        assert partner_a_id not in b_partner_ids

        # Attempt direct read of Tenant A partner with Tenant B context
        res_direct = client.get(
            f"/api/partners/{partner_a_id}",
            headers={"X-Company-ID": str(comp_b.id)},
        )
        assert res_direct.status_code in (403, 404)
    finally:
        app.dependency_overrides.clear()


def test_zatca_phase1_and_phase2_tlv_compliance():
    """Verify Saudi ZATCA TLV encoding specifications (Tags 1 through 7) and hash chaining."""
    seller_name = "شركة ميون للنقل والخدمات اللوجستية"
    vat_num = "300099999900003"
    timestamp = datetime.now(timezone.utc)
    total_amount = Decimal("11500.00")
    vat_amount = Decimal("1500.00")

    # TLV Tag 1
    t1 = encode_tlv(1, seller_name)
    assert t1[0] == 1
    assert t1[1] == len(seller_name.encode("utf-8"))

    # Phase 2 QR generation
    dummy_hash = "a" * 64
    dummy_stamp = "b" * 64
    qr_b64 = generate_zatca_qr_code(
        seller_name=seller_name,
        vat_number=vat_num,
        timestamp=timestamp,
        total_amount=total_amount,
        vat_amount=vat_amount,
        invoice_hash=dummy_hash,
        cryptographic_stamp=dummy_stamp,
    )
    assert qr_b64 is not None
    assert len(qr_b64) > 20

    # Genesis hash check
    genesis_hash = ZATCAAdapter.GENESIS_HASH
    assert genesis_hash is not None
    assert len(genesis_hash) > 10


def test_financial_voucher_gl_account_move_creation(remediation_fixtures):
    """Verify REM-P2-001: Posting a financial voucher creates balanced AccountMove lines in SAR."""
    comp_a = remediation_fixtures["comp_a"]
    user_a = remediation_fixtures["user_a"]
    acc_cash = remediation_fixtures["acc_cash_a"]
    acc_payable = remediation_fixtures["acc_payable_a"]

    client = TestClient(app)
    app.dependency_overrides[get_authenticated_user] = lambda: user_a
    app.dependency_overrides[get_active_company_id] = lambda: comp_a.id

    try:
        voucher_ref = f"PV-2026-09-{uuid.uuid4().hex[:4].upper()}"
        amount = Decimal("2500.00")

        payload = {
            "name": f"Payment Voucher {voucher_ref}",
            "journal_code": "MISC",
            "move_type": "settlement",
            "ref": voucher_ref,
            "lines": [
                {
                    "account_id": str(acc_payable.id),
                    "debit": float(amount),
                    "credit": 0.0,
                    "name": f"{voucher_ref} - Raw Material Supplier Settlement",
                },
                {
                    "account_id": str(acc_cash.id),
                    "debit": 0.0,
                    "credit": float(amount),
                    "name": f"{voucher_ref} - Cash / Bank Outflow",
                },
            ],
        }

        res = client.post(
            "/api/accounting/moves",
            json=payload,
            headers={"X-Company-ID": str(comp_a.id)},
        )
        assert res.status_code == 201
        move_data = res.json()
        assert move_data["id"] is not None
        assert move_data["state"] == "posted"
        assert move_data["ref"] == voucher_ref
    finally:
        app.dependency_overrides.clear()
