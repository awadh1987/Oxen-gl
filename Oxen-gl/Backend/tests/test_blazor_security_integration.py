import uuid
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from Backend.database import SessionLocal
from Backend.main import (
    app,
    get_active_company_id,
    get_authenticated_user,
    verify_password,
)
from Backend.models import (
    PlatformAuditLog,
    ResCompany,
    ResUser,
    SecurityEvent,
)


@pytest.fixture(scope="module")
def db_session():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="module")
def security_test_fixtures(db_session: Session):
    # 1. Platform Super Admin
    super_admin = db_session.scalar(select(ResUser).where(ResUser.email == "testadmin@oxengl.com"))
    if not super_admin:
        super_admin = ResUser(
            firebase_uid="uid-super-admin-blazor",
            email="testadmin@oxengl.com",
            full_name="Platform Super Administrator",
            role="Super_Admin",
            is_active=True,
        )
        db_session.add(super_admin)
        db_session.commit()
        db_session.refresh(super_admin)

    # 2. Tenant A
    company_a = db_session.scalar(select(ResCompany).where(ResCompany.slug == "blazor-sec-tenant-a"))
    if not company_a:
        company_a = ResCompany(
            name="Blazor Security Tenant A",
            slug="blazor-sec-tenant-a",
            currency="SAR",
            commercial_registration="1010888001",
            tax_id="300088800100003",
        )
        db_session.add(company_a)
        db_session.commit()
        db_session.refresh(company_a)

    admin_a = db_session.scalar(select(ResUser).where(ResUser.email == "admin@blazor-tenant-a.com"))
    if not admin_a:
        admin_a = ResUser(
            firebase_uid="uid-admin-blazor-a",
            email="admin@blazor-tenant-a.com",
            full_name="Admin Tenant A",
            company_id=company_a.id,
            role="Admin",
            is_active=True,
        )
        db_session.add(admin_a)
        db_session.commit()
        db_session.refresh(admin_a)

    user_a = db_session.scalar(select(ResUser).where(ResUser.email == "operator@blazor-tenant-a.com"))
    if not user_a:
        user_a = ResUser(
            firebase_uid="uid-user-blazor-a",
            email="operator@blazor-tenant-a.com",
            full_name="Operator Tenant A",
            company_id=company_a.id,
            role="Data_Entry",
            is_active=True,
        )
        db_session.add(user_a)
        db_session.commit()
        db_session.refresh(user_a)

    # 3. Tenant B
    company_b = db_session.scalar(select(ResCompany).where(ResCompany.slug == "blazor-sec-tenant-b"))
    if not company_b:
        company_b = ResCompany(
            name="Blazor Security Tenant B",
            slug="blazor-sec-tenant-b",
            currency="SAR",
            commercial_registration="1010888002",
            tax_id="300088800200003",
        )
        db_session.add(company_b)
        db_session.commit()
        db_session.refresh(company_b)

    admin_b = db_session.scalar(select(ResUser).where(ResUser.email == "admin@blazor-tenant-b.com"))
    if not admin_b:
        admin_b = ResUser(
            firebase_uid="uid-admin-blazor-b",
            email="admin@blazor-tenant-b.com",
            full_name="Admin Tenant B",
            company_id=company_b.id,
            role="Admin",
            is_active=True,
        )
        db_session.add(admin_b)
        db_session.commit()
        db_session.refresh(admin_b)

    user_b = db_session.scalar(select(ResUser).where(ResUser.email == "operator@blazor-tenant-b.com"))
    if not user_b:
        user_b = ResUser(
            firebase_uid="uid-user-blazor-b",
            email="operator@blazor-tenant-b.com",
            full_name="Operator Tenant B",
            company_id=company_b.id,
            role="Data_Entry",
            is_active=True,
        )
        db_session.add(user_b)
        db_session.commit()
        db_session.refresh(user_b)

    return {
        "super_admin": super_admin,
        "company_a": company_a,
        "admin_a": admin_a,
        "user_a": user_a,
        "company_b": company_b,
        "admin_b": admin_b,
        "user_b": user_b,
    }


# ==============================================================================
# 1. Master Platform Security Tests (Super_Admin Protected)
# ==============================================================================

def test_platform_password_rotation_super_admin(security_test_fixtures, db_session: Session):
    super_admin = security_test_fixtures["super_admin"]

    app.dependency_overrides[get_authenticated_user] = lambda: super_admin

    with TestClient(app) as client:
        new_pass = "RotationTestPass2026!#X"
        response = client.post(
            "/api/platform/security/password-rotate",
            json={
                "admin_email": super_admin.email,
                "new_password": new_pass,
                "confirm_password": new_pass,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == super_admin.email
        assert len(data["recovery_codes"]) == 5
        for code in data["recovery_codes"]:
            assert len(code) == 19  # 4 groups of 4 chars + 3 hyphens = 19 chars

        # Verify DB updated and password matches
        db_session.refresh(super_admin)
        assert verify_password(new_pass, super_admin.password_hash) is True
        assert super_admin.is_active is True

        # Verify platform audit log recorded
        audit = db_session.scalar(
            select(PlatformAuditLog)
            .where(
                PlatformAuditLog.actor_email == super_admin.email,
                PlatformAuditLog.action == "PASSWORD_AND_RECOVERY_CODES_ROTATED",
            )
            .order_by(PlatformAuditLog.created_at.desc())
        )
        assert audit is not None
        assert audit.outcome == "SUCCESS"


def test_platform_endpoints_forbidden_for_non_super_admin(security_test_fixtures, db_session: Session):
    admin_a = security_test_fixtures["admin_a"]

    app.dependency_overrides[get_authenticated_user] = lambda: admin_a

    with TestClient(app) as client:
        # Password rotation blocked
        rotate_res = client.post(
            "/api/platform/security/password-rotate",
            json={
                "admin_email": admin_a.email,
                "new_password": "IllegalPassword2026!",
                "confirm_password": "IllegalPassword2026!",
            },
        )
        assert rotate_res.status_code == 403
        assert "Super_Admin role" in rotate_res.json()["detail"]

        # Platform audit logs blocked
        audit_res = client.get("/api/platform/security/audit-logs")
        assert audit_res.status_code == 403
        assert "Super_Admin role" in audit_res.json()["detail"]

        # Verify denied audit event written
        denied_audit = db_session.scalar(
            select(PlatformAuditLog)
            .where(
                PlatformAuditLog.actor_email == admin_a.email,
                PlatformAuditLog.action == "SUPER_ADMIN_DENIED",
            )
            .order_by(PlatformAuditLog.created_at.desc())
        )
        assert denied_audit is not None
        assert denied_audit.outcome == "DENIED"


def test_platform_audit_logs_super_admin(security_test_fixtures):
    super_admin = security_test_fixtures["super_admin"]

    app.dependency_overrides[get_authenticated_user] = lambda: super_admin

    with TestClient(app) as client:
        response = client.get("/api/platform/security/audit-logs?limit=10")
        assert response.status_code == 200
        logs = response.json()
        assert isinstance(logs, list)
        assert len(logs) > 0
        first_log = logs[0]
        assert "id" in first_log
        assert "actor_email" in first_log
        assert "created_at" in first_log
        assert "outcome" in first_log


# ==============================================================================
# 2. Tenant Security UI Tests (TenantContext Isolated)
# ==============================================================================

def test_tenant_users_list_isolation(security_test_fixtures):
    company_a = security_test_fixtures["company_a"]
    admin_a = security_test_fixtures["admin_a"]
    user_b = security_test_fixtures["user_b"]

    app.dependency_overrides[get_active_company_id] = lambda: company_a.id
    app.dependency_overrides[get_authenticated_user] = lambda: admin_a

    with TestClient(app) as client:
        response = client.get("/api/tenant/users")
        assert response.status_code == 200
        users = response.json()
        assert len(users) >= 2
        user_ids = [u["id"] for u in users]
        # Tenant B user must not be present in Tenant A's listing
        assert str(user_b.id) not in user_ids
        for u in users:
            assert u["company_id"] == str(company_a.id)


def test_tenant_user_role_update(security_test_fixtures, db_session: Session):
    company_a = security_test_fixtures["company_a"]
    admin_a = security_test_fixtures["admin_a"]
    user_a = security_test_fixtures["user_a"]

    app.dependency_overrides[get_active_company_id] = lambda: company_a.id
    app.dependency_overrides[get_authenticated_user] = lambda: admin_a

    with TestClient(app) as client:
        response = client.patch(
            f"/api/tenant/users/{user_a.id}/role",
            json={"role": "Accountant"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(user_a.id)
        assert data["role"] == "Accountant"

        # Verify DB updated
        db_session.refresh(user_a)
        assert user_a.role == "Accountant"


def test_cross_tenant_idor_blocked_with_security_event(security_test_fixtures, db_session: Session):
    company_a = security_test_fixtures["company_a"]
    admin_a = security_test_fixtures["admin_a"]
    user_b = security_test_fixtures["user_b"]  # Belongs to Company B

    # Admin A attempts to modify User B's role under Tenant A context (cross-tenant IDOR attack)
    app.dependency_overrides[get_active_company_id] = lambda: company_a.id
    app.dependency_overrides[get_authenticated_user] = lambda: admin_a

    with TestClient(app) as client:
        response = client.patch(
            f"/api/tenant/users/{user_b.id}/role",
            json={"role": "Admin"},
        )
        assert response.status_code == 404
        assert "User not found in tenant company" in response.json()["detail"]

        # Verify critical tenant_escape SecurityEvent was immutably recorded
        sec_event = db_session.scalar(
            select(SecurityEvent)
            .where(
                SecurityEvent.company_id == company_a.id,
                SecurityEvent.event_type == "tenant_escape",
                SecurityEvent.severity == "CRITICAL",
            )
            .order_by(SecurityEvent.created_at.desc())
        )
        assert sec_event is not None
        assert str(user_b.id) in sec_event.details
        assert "Cross-tenant IDOR attempt" in sec_event.details


def test_tenant_api_key_generation(security_test_fixtures):
    company_a = security_test_fixtures["company_a"]
    admin_a = security_test_fixtures["admin_a"]

    app.dependency_overrides[get_active_company_id] = lambda: company_a.id
    app.dependency_overrides[get_authenticated_user] = lambda: admin_a

    with TestClient(app) as client:
        response = client.post(
            "/api/tenant/security/api-keys",
            json={
                "name": "Integration Test Scanner API Key",
                "scopes": ["warehouse:read", "weighbridge:write", "fleet:manage"],
                "expires_days": 90,
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Integration Test Scanner API Key"
        assert data["api_key"].startswith(f"oxen_sk_{company_a.id.hex[:6]}_")
        assert "warehouse:read" in data["scopes"]
        assert "fleet:manage" in data["scopes"]
        assert data["key_id"].startswith("key_")


def test_tenant_security_settings_mfa_toggle(security_test_fixtures):
    company_a = security_test_fixtures["company_a"]
    admin_a = security_test_fixtures["admin_a"]

    app.dependency_overrides[get_active_company_id] = lambda: company_a.id
    app.dependency_overrides[get_authenticated_user] = lambda: admin_a

    with TestClient(app) as client:
        response = client.patch(
            "/api/tenant/security/settings",
            json={"mfa_enforced": True},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["company_id"] == str(company_a.id)
        assert data["mfa_enforced"] is True


def test_tenant_endpoints_forbidden_for_regular_users(security_test_fixtures, db_session: Session):
    company_a = security_test_fixtures["company_a"]
    user_a = security_test_fixtures["user_a"]
    # Ensure user_a has non-admin role
    user_a.role = "Guest"
    db_session.commit()

    app.dependency_overrides[get_active_company_id] = lambda: company_a.id
    app.dependency_overrides[get_authenticated_user] = lambda: user_a

    with TestClient(app) as client:
        # Non-admin cannot list users
        list_res = client.get("/api/tenant/users")
        assert list_res.status_code == 403
        assert "Admin role required" in list_res.json()["detail"]

        # Non-admin cannot generate API keys
        key_res = client.post(
            "/api/tenant/security/api-keys",
            json={"name": "Unauthorized Key", "scopes": ["warehouse:read"], "expires_days": 30},
        )
        assert key_res.status_code == 403

        # Non-admin cannot toggle MFA
        mfa_res = client.patch(
            "/api/tenant/security/settings",
            json={"mfa_enforced": False},
        )
        assert mfa_res.status_code == 403
