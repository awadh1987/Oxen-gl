import os
import re
import uuid
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from fastapi import HTTPException
from backend.database import SessionLocal
from backend.main import app
from backend.models import (
    MasterTenant,
    TenantDatabase,
    MasterUser,
    MasterPasswordReset,
    MasterAuditLog,
    TenantUser,
    TenantPasswordReset,
)
from backend.two_tier_auth import (
    normalize_identifier,
    hash_password,
    verify_password,
    issue_two_tier_jwt,
    verify_two_tier_jwt,
    dummy_verify,
)

def normalize_saudi_mobile(val: str) -> str:
    try:
        norm, kind = normalize_identifier(val)
        if kind != "mobile" or not norm.startswith("+9665"):
            raise ValueError(f"Expected Saudi mobile, got {norm}")
        return norm
    except HTTPException as e:
        raise ValueError(e.detail) from e

def create_tier_jwt(*, tier: str, subject: str, role: str, tenant_id: str | None = None, tenant_slug: str | None = None, permissions: list | None = None) -> str:
    return issue_two_tier_jwt(
        tier=tier,
        user_id=uuid.UUID(subject),
        identity="test@oxengl.com",
        role=role,
        tenant_id=uuid.UUID(tenant_id) if tenant_id else None,
        tenant_slug=tenant_slug,
    )


SUPERADMIN_EMAIL = os.getenv("MASTER_SUPERADMIN_EMAIL", "superadmin@oxengl.com")
SUPERADMIN_MOBILE = os.getenv("MASTER_SUPERADMIN_MOBILE", "+966500000001")
SUPERADMIN_TEMP_PASS = os.getenv("MASTER_SUPERADMIN_TEMP_PASSWORD", "OxenGL#IEhHsza7wOxH8DZj!2026")


@pytest.fixture(scope="function")
def db():
    session = SessionLocal()
    session.rollback()
    yield session
    session.close()


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


# -------------------------------------------------------------------------
# Test 1: Argon2id Hash Parameter Compliance
# -------------------------------------------------------------------------
def test_argon2id_hash_parameters():
    """Verify that generated password hashes strictly follow Argon2id parameters (t=3, m=65536, p=4)."""
    raw_pwd = "StrongSecurePassword!2026"
    pwd_hash = hash_password(raw_pwd)

    assert pwd_hash.startswith("$argon2id$v=19$")
    assert "m=65536,t=3,p=4" in pwd_hash or ("t=3" in pwd_hash and "m=65536" in pwd_hash and "p=4" in pwd_hash)

    # Verification passes for correct password and fails for wrong password
    assert verify_password(raw_pwd, pwd_hash) is True
    assert verify_password("WrongPassword123!", pwd_hash) is False


# -------------------------------------------------------------------------
# Test 2: E.164 Saudi Mobile Normalization
# -------------------------------------------------------------------------
def test_saudi_mobile_normalization():
    """Verify E.164 normalization for all common Saudi mobile input formats."""
    expected = "+966501234567"
    valid_inputs = [
        "0501234567",
        "050 123 4567",
        "050-123-4567",
        "+966501234567",
        "+966 50 123 4567",
        "00966501234567",
        "966501234567",
    ]
    for inp in valid_inputs:
        assert normalize_saudi_mobile(inp) == expected, f"Failed normalizing: {inp}"

    # Invalid mobile formats should raise ValueError
    invalid_inputs = [
        "123456",
        "0401234567",  # Saudi mobiles start with 5
        "050123456",   # too short
        "05012345678", # too long
        "+14155552671",# Non-Saudi
        "not-a-number",
    ]
    for inv in invalid_inputs:
        with pytest.raises(ValueError):
            normalize_saudi_mobile(inv)


# -------------------------------------------------------------------------
# Test 3: Anti-Enumeration Constant-Time Behavior
# -------------------------------------------------------------------------
def test_anti_enumeration_behavior(client: TestClient):
    """Verify that querying non-existent accounts returns generic 401 without revealing user existence."""
    # Master login with non-existent account
    res = client.post(
        "/api/auth/master/login",
        json={"identity": "nonexistent_admin_user@oxengl.com", "password": "RandomPassword123!"},
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Invalid credentials or account inactive."

    # Tenant login with non-existent tenant/account
    res_tenant = client.post(
        "/api/auth/tenant/login",
        json={
            "tenant_slug": "non-existent-tenant-slug",
            "identity": "ghost@company.com",
            "password": "RandomPassword123!",
        },
    )
    assert res_tenant.status_code == 401
    assert res_tenant.json()["detail"] == "Invalid credentials or tenant not found."


# -------------------------------------------------------------------------
# Test 4: Dual-Identifier Equivalence (Email & Mobile)
# -------------------------------------------------------------------------
def test_dual_identifier_equivalence_master(client: TestClient, db: Session):
    """Verify that a Master user can login identically with email or E.164 mobile."""
    # Ensure super_admin has current temporary password
    super_admin = db.scalar(select(MasterUser).where(MasterUser.email == SUPERADMIN_EMAIL))
    assert super_admin is not None, "Seeded super_admin should exist in control plane"

    # Reset lockout if any previous test modified it
    super_admin.failed_login_attempts = 0
    super_admin.locked_until = None
    db.commit()

    # 1. Login with Email
    res_email = client.post(
        "/api/auth/master/login",
        json={"identity": SUPERADMIN_EMAIL, "password": SUPERADMIN_TEMP_PASS},
    )
    assert res_email.status_code == 200, f"Email login failed: {res_email.text}"
    token_data_email = res_email.json()
    assert token_data_email["tier"] == "master"
    assert token_data_email["role"] == "super_admin"

    # 2. Login with Local Mobile (0500000001)
    res_mobile_local = client.post(
        "/api/auth/master/login",
        json={"identity": "0500000001", "password": SUPERADMIN_TEMP_PASS},
    )
    assert res_mobile_local.status_code == 200, f"Local mobile login failed: {res_mobile_local.text}"
    token_data_mobile = res_mobile_local.json()
    assert token_data_mobile["tier"] == "master"
    assert token_data_mobile["user"]["id"] == token_data_email["user"]["id"]

    # 3. Login with International Mobile (+966500000001)
    res_mobile_intl = client.post(
        "/api/auth/master/login",
        json={"identity": "+966500000001", "password": SUPERADMIN_TEMP_PASS},
    )
    assert res_mobile_intl.status_code == 200
    assert res_mobile_intl.json()["user"]["id"] == token_data_email["user"]["id"]


# -------------------------------------------------------------------------
# Test 5: Cross-Plane Token Escalation Prevention (HTTP 403)
# -------------------------------------------------------------------------
def test_cross_plane_token_escalation_blocked(client: TestClient):
    """
    CRITICAL SECURITY CHECK:
    - Master tokens presented to Tenant endpoints must return HTTP 403 Forbidden.
    - Tenant tokens presented to Master endpoints must return HTTP 403 Forbidden.
    """
    # 1. Acquire Master token
    res_master = client.post(
        "/api/auth/master/login",
        json={"identity": SUPERADMIN_EMAIL, "password": SUPERADMIN_TEMP_PASS},
    )
    assert res_master.status_code == 200
    master_token = res_master.json()["access_token"]

    # 2. Master token calls Master-only endpoint -> Success (200)
    res_master_me = client.get(
        "/api/auth/master/me",
        headers={"Authorization": f"Bearer {master_token}"},
    )
    assert res_master_me.status_code == 200
    assert res_master_me.json()["email"] == SUPERADMIN_EMAIL

    # 3. Master token attempts to call Tenant-only endpoint -> FORBIDDEN (403)
    res_escalate_to_tenant = client.get(
        "/api/auth/tenant/me",
        headers={"Authorization": f"Bearer {master_token}"},
    )
    assert res_escalate_to_tenant.status_code == 403
    assert "Cross-plane token violation" in res_escalate_to_tenant.json()["detail"]

    # 4. Create a synthetic valid Tenant token signed with JWT_SECRET_TENANT
    tenant_user_id = str(uuid.uuid4())
    tenant_id = str(uuid.uuid4())
    tenant_token = create_tier_jwt(
        tier="tenant",
        subject=tenant_user_id,
        tenant_id=tenant_id,
        tenant_slug="test-corp",
        role="admin",
        permissions=["inventory:read", "financials:write"],
    )

    # 5. Tenant token attempts to call Master-only endpoint -> FORBIDDEN (403)
    res_escalate_to_master = client.get(
        "/api/auth/master/me",
        headers={"Authorization": f"Bearer {tenant_token}"},
    )
    assert res_escalate_to_master.status_code == 403
    assert "Cross-plane token violation" in res_escalate_to_master.json()["detail"]


# -------------------------------------------------------------------------
# Test 6: Cross-Tenant Spoofing Prevention (HTTP 403)
# -------------------------------------------------------------------------
def test_cross_tenant_spoofing_blocked(client: TestClient, db: Session):
    """
    CRITICAL SECURITY CHECK:
    A valid Tenant token issued for Tenant A cannot access Tenant B by passing
    a mismatched X-Tenant-Slug header.
    """
    tenant_a = db.scalar(select(MasterTenant).where(MasterTenant.slug == "tenant-alpha"))
    if not tenant_a:
        tenant_a = MasterTenant(
            name="Tenant Alpha Corp",
            slug="tenant-alpha",
            owner_full_name="Alpha Owner",
            owner_email="owner@tenant-alpha.com",
            owner_mobile="+966501111111",
            status="active",
            subscription_tier="standard",
        )
        db.add(tenant_a)
        db.commit()
        db.refresh(tenant_a)

    tenant_a_token = create_tier_jwt(
        tier="tenant",
        subject=str(uuid.uuid4()),
        tenant_id=str(tenant_a.id),
        tenant_slug=tenant_a.slug,
        role="admin",
    )

    # Present Tenant A token with matching header -> authorized (200)
    res_correct = client.get(
        "/api/auth/tenant/me",
        headers={
            "Authorization": f"Bearer {tenant_a_token}",
            "X-Tenant-Slug": "tenant-alpha",
        },
    )
    assert res_correct.status_code == 200
    assert res_correct.json()["tenant_slug"] == "tenant-alpha"

    # Present Tenant A token with mismatched header for Tenant B -> FORBIDDEN (403)
    res_spoof = client.get(
        "/api/auth/tenant/me",
        headers={
            "Authorization": f"Bearer {tenant_a_token}",
            "X-Tenant-Slug": "tenant-beta-spoofed",
        },
    )
    assert res_spoof.status_code == 403
    assert "Tenant isolation violation" in res_spoof.json()["detail"]


# -------------------------------------------------------------------------
# Test 7: Brute-Force Lockout (HTTP 429 after 5 failed attempts)
# -------------------------------------------------------------------------
def test_brute_force_lockout(client: TestClient, db: Session):
    """Verify that 5 consecutive failed login attempts lock the account and trigger HTTP 429."""
    # Create a dedicated test user in master_users
    test_email = f"lockout_test_{uuid.uuid4().hex[:6]}@oxengl.com"
    test_mobile = f"+96650{uuid.uuid4().int % 10000000:07d}"
    test_password = "CorrectPassword123!"

    user = MasterUser(
        email=test_email,
        mobile_number=test_mobile,
        password_hash=hash_password(test_password),
        full_name="Brute Force Test User",
        role="user",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Send 5 incorrect attempts
    for attempt in range(1, 6):
        res = client.post(
            "/api/auth/master/login",
            json={"identity": test_email, "password": "WrongPasswordAttempt!"},
        )
        assert res.status_code == 401, f"Attempt {attempt} expected 401"

    # Verify user state in database
    db.refresh(user)
    assert user.failed_login_attempts >= 5
    assert user.locked_until is not None
    assert user.locked_until > datetime.now(timezone.utc)

    # 6th attempt (even with CORRECT password) must be rejected with HTTP 429
    res_locked = client.post(
        "/api/auth/master/login",
        json={"identity": test_email, "password": test_password},
    )
    assert res_locked.status_code == 429
    assert "Account temporarily locked" in res_locked.json()["detail"] or "locked" in res_locked.json()["detail"].lower()

    # Clean up test user
    db.delete(user)
    db.commit()


# -------------------------------------------------------------------------
# Test 8: Tenant Provisioning & Dynamic Tenant Authentication
# -------------------------------------------------------------------------
def test_tenant_registration_and_dual_identifier_login(client: TestClient, db: Session):
    """
    Test full end-to-end tenant provisioning:
    1. Register tenant via /api/auth/register-tenant
    2. Verify MasterTenant and TenantDatabase records created
    3. Login to newly provisioned tenant via /api/auth/tenant/login using both email and mobile
    """
    unique_suffix = uuid.uuid4().hex[:6]
    slug = f"acme-{unique_suffix}"
    admin_email = f"admin@{slug}.sa"
    admin_mobile = f"+96655{uuid.uuid4().int % 10000000:07d}"
    admin_password = "TenantAdminPassword123!"

    reg_payload = {
        "company_name": f"Acme Logistics {unique_suffix}",
        "tenant_slug": slug,
        "commercial_registration": f"1010{uuid.uuid4().int % 1000000:06d}",
        "tax_id": f"3000{uuid.uuid4().int % 100000000000:011d}",
        "admin_email": admin_email,
        "admin_mobile": admin_mobile,
        "admin_full_name": "Acme General Manager",
        "admin_password": admin_password,
    }

    res_reg = client.post("/api/auth/register-tenant", json=reg_payload)
    assert res_reg.status_code in (200, 201), f"Registration failed: {res_reg.text}"
    reg_data = res_reg.json()
    assert reg_data["tenant_slug"] == slug
    tenant_id = reg_data["tenant_id"]

    # Verify MasterTenant & TenantDatabase records exist
    tenant_record = db.scalar(select(MasterTenant).where(MasterTenant.slug == slug))
    assert tenant_record is not None
    assert tenant_record.name == reg_payload["company_name"]

    db_record = db.scalar(select(TenantDatabase).where(TenantDatabase.tenant_id == uuid.UUID(tenant_id)))
    assert db_record is not None
    assert db_record.database_name == f"oxengl_tenant_{slug.replace('-', '_')}"

    # 1. Tenant Login via Email
    res_login_email = client.post(
        "/api/auth/tenant/login",
        json={
            "tenant_slug": slug,
            "identity": admin_email,
            "password": admin_password,
        },
    )
    assert res_login_email.status_code == 200, f"Tenant email login failed: {res_login_email.text}"
    login_data_email = res_login_email.json()
    assert login_data_email["tier"] == "tenant"
    assert login_data_email["tenant_slug"] == slug
    assert login_data_email["role"] == "admin"

    # 2. Tenant Login via Local Mobile (e.g. 055...)
    local_mobile = "05" + admin_mobile[5:]
    res_login_mobile = client.post(
        "/api/auth/tenant/login",
        json={
            "tenant_slug": slug,
            "identity": local_mobile,
            "password": admin_password,
        },
    )
    assert res_login_mobile.status_code == 200, f"Tenant mobile login failed: {res_login_mobile.text}"
    login_data_mobile = res_login_mobile.json()
    assert login_data_mobile["user"]["id"] == login_data_email["user"]["id"]


# -------------------------------------------------------------------------
# Test 9: Password Recovery & Single-Use Reset Code Verification
# -------------------------------------------------------------------------
def test_otp_recovery_and_single_use_reset(client: TestClient, db: Session):
    """
    Test OTP generation, verification, password update, and single-use enforcement:
    1. Request OTP reset code for Master superadmin
    2. Confirm OTP record created in control plane
    3. Successfully reset password with valid OTP
    4. Replaying the same OTP immediately returns HTTP 400
    """
    # 1. Request recovery code
    res_recovery = client.post(
        "/api/auth/recover-password",
        json={"identity": SUPERADMIN_EMAIL, "plane": "master"},
    )
    assert res_recovery.status_code == 200
    assert "dispatched successfully" in res_recovery.json()["message"].lower() or "verification code" in res_recovery.json()["message"].lower()

    # 2. Fetch the newly created OTP record from master_password_resets
    super_admin = db.scalar(select(MasterUser).where(MasterUser.email == SUPERADMIN_EMAIL))
    reset_record = db.scalar(
        select(MasterPasswordReset)
        .where(MasterPasswordReset.user_id == super_admin.id)
        .order_by(MasterPasswordReset.created_at.desc())
    )
    assert reset_record is not None
    assert reset_record.is_used is False
    assert reset_record.expires_at > datetime.now(timezone.utc)

    # For testing, directly generate an active OTP and store its SHA-256 hash
    import hashlib
    test_otp = "849201"
    otp_hash = hashlib.sha256(test_otp.encode("utf-8")).hexdigest()
    reset_record.otp_hash = otp_hash
    db.commit()

    # 3. Reset password using the valid OTP
    new_password = "NewStrongSuperAdminPassword!2026"
    res_reset = client.post(
        "/api/auth/reset-password",
        json={
            "identity": SUPERADMIN_EMAIL,
            "plane": "master",
            "reset_code": test_otp,
            "new_password": new_password,
        },
    )
    assert res_reset.status_code == 200
    assert "password reset successfully" in res_reset.json()["message"].lower()

    # Verify reset record is now consumed (is_used = True)
    db.refresh(reset_record)
    assert reset_record.is_used is True

    # 4. Attempt to REPLAY the exact same OTP -> HTTP 400 Bad Request
    res_replay = client.post(
        "/api/auth/reset-password",
        json={
            "identity": SUPERADMIN_EMAIL,
            "plane": "master",
            "reset_code": test_otp,
            "new_password": "AnotherNewPassword!2026",
        },
    )
    assert res_replay.status_code == 400
    assert "invalid or expired reset code" in res_replay.json()["detail"].lower()

    # Restore the superadmin temporary password so subsequent test runs stay deterministic
    super_admin.password_hash = hash_password(SUPERADMIN_TEMP_PASS)
    super_admin.failed_login_attempts = 0
    super_admin.locked_until = None
    db.commit()

