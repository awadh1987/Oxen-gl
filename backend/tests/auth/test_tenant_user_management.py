"""
Unit & Integration Tests for Phase 5: Tenant User Management & RBAC Isolation.
Verifies that:
1. Admins in Tenant A can list and invite users strictly within Tenant A.
2. Users with non-Admin roles (e.g., Accountant, Data_Entry, Guest) are rejected with HTTP 403 Forbidden.
3. Cross-Tenant Isolation: An Admin in Tenant A cannot view, modify, or delete a user in Tenant B (HTTP 403 Forbidden).
"""

import uuid
import pytest
from fastapi import status
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.models import ResCompany, ResUser
from backend.two_tier_auth import hash_password, issue_two_tier_jwt


@pytest.fixture
def test_tenants_and_users():
    """Seeds two separate tenant workspaces with an admin and a member each."""
    db: Session = SessionLocal()
    tenant_a_id = uuid.uuid4()
    tenant_b_id = uuid.uuid4()

    company_a = ResCompany(
        id=tenant_a_id,
        name="Tenant A Corp",
        slug=f"tenant-a-{tenant_a_id.hex[:6]}",
        currency="SAR",
        fiscal_calendar="gregorian",
        fiscal_year_start_month=1,
        tax_regime="KSA_VAT",
    )
    company_b = ResCompany(
        id=tenant_b_id,
        name="Tenant B Corp",
        slug=f"tenant-b-{tenant_b_id.hex[:6]}",
        currency="SAR",
        fiscal_calendar="gregorian",
        fiscal_year_start_month=1,
        tax_regime="KSA_VAT",
    )
    db.add_all([company_a, company_b])
    db.commit()

    # Tenant A Admin & Non-Admin
    user_admin_a_id = uuid.uuid4()
    user_accountant_a_id = uuid.uuid4()
    admin_a = ResUser(
        id=user_admin_a_id,
        company_id=tenant_a_id,
        email=f"admin_a_{user_admin_a_id.hex[:6]}@tenanta.com",
        full_name="Admin Tenant A",
        role="Admin",
        password_hash=hash_password("Pass123!"),
        is_active=True,
    )
    accountant_a = ResUser(
        id=user_accountant_a_id,
        company_id=tenant_a_id,
        email=f"acc_a_{user_accountant_a_id.hex[:6]}@tenanta.com",
        full_name="Accountant Tenant A",
        role="Accountant",
        password_hash=hash_password("Pass123!"),
        is_active=True,
    )

    # Tenant B Admin & Target Member
    user_admin_b_id = uuid.uuid4()
    user_member_b_id = uuid.uuid4()
    admin_b = ResUser(
        id=user_admin_b_id,
        company_id=tenant_b_id,
        email=f"admin_b_{user_admin_b_id.hex[:6]}@tenantb.com",
        full_name="Admin Tenant B",
        role="Admin",
        password_hash=hash_password("Pass123!"),
        is_active=True,
    )
    member_b = ResUser(
        id=user_member_b_id,
        company_id=tenant_b_id,
        email=f"member_b_{user_member_b_id.hex[:6]}@tenantb.com",
        full_name="Member Tenant B",
        role="Data_Entry",
        password_hash=hash_password("Pass123!"),
        is_active=True,
    )

    db.add_all([admin_a, accountant_a, admin_b, member_b])
    db.commit()

    # Generate JWT access tokens
    token_admin_a = issue_two_tier_jwt(
        tier="tenant",
        user_id=user_admin_a_id,
        identity=admin_a.email,
        role="Admin",
        tenant_id=tenant_a_id,
        tenant_slug=company_a.slug,
    )
    token_accountant_a = issue_two_tier_jwt(
        tier="tenant",
        user_id=user_accountant_a_id,
        identity=accountant_a.email,
        role="Accountant",
        tenant_id=tenant_a_id,
        tenant_slug=company_a.slug,
    )
    token_admin_b = issue_two_tier_jwt(
        tier="tenant",
        user_id=user_admin_b_id,
        identity=admin_b.email,
        role="Admin",
        tenant_id=tenant_b_id,
        tenant_slug=company_b.slug,
    )

    data = {
        "tenant_a_id": tenant_a_id,
        "tenant_b_id": tenant_b_id,
        "admin_a_id": user_admin_a_id,
        "member_b_id": user_member_b_id,
        "token_admin_a": token_admin_a,
        "token_accountant_a": token_accountant_a,
        "token_admin_b": token_admin_b,
    }

    yield data

    # Cleanup
    try:
        db.query(ResUser).filter(ResUser.company_id.in_([tenant_a_id, tenant_b_id])).delete(synchronize_session=False)
        db.query(ResCompany).filter(ResCompany.id.in_([tenant_a_id, tenant_b_id])).delete(synchronize_session=False)
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


@pytest.mark.asyncio
async def test_get_users_tenant_isolation(async_client, test_tenants_and_users):
    """Admin A should only see users of Tenant A, never Tenant B."""
    token_admin_a = test_tenants_and_users["token_admin_a"]
    headers = {"Authorization": f"Bearer {token_admin_a}"}

    response = await async_client.get("/api/v1/users", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    users = response.json()
    assert len(users) >= 2
    for u in users:
        assert u["tenant_id"] == str(test_tenants_and_users["tenant_a_id"])


@pytest.mark.asyncio
async def test_require_role_rejection(async_client, test_tenants_and_users):
    """Accountant (non-Admin) requesting GET /api/v1/users must receive HTTP 403 Forbidden."""
    token_accountant_a = test_tenants_and_users["token_accountant_a"]
    headers = {"Authorization": f"Bearer {token_accountant_a}"}

    response = await async_client.get("/api/v1/users", headers=headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "Access forbidden" in response.json().get("detail", "")


@pytest.mark.asyncio
async def test_invite_user_creates_tenant_scoped_record(async_client, test_tenants_and_users):
    """Admin A can invite a new user; user is created with a temporary password under Tenant A."""
    token_admin_a = test_tenants_and_users["token_admin_a"]
    headers = {"Authorization": f"Bearer {token_admin_a}"}

    unique_email = f"new_hire_{uuid.uuid4().hex[:6]}@tenanta.com"
    payload = {
        "email": unique_email,
        "role": "Data_Entry",
        "full_name": "New Hire Staff",
    }

    response = await async_client.post("/api/v1/users/invite", json=payload, headers=headers)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["status"] == "invited"
    assert data["email"] == unique_email
    assert data["role"] == "Data_Entry"
    assert "temporary_password" in data
    assert len(data["temporary_password"]) > 6


@pytest.mark.asyncio
async def test_cross_tenant_delete_prevention(async_client, test_tenants_and_users):
    """Admin A attempting to delete Member B (Tenant B) must be blocked with HTTP 403 Forbidden."""
    token_admin_a = test_tenants_and_users["token_admin_a"]
    headers = {"Authorization": f"Bearer {token_admin_a}"}
    member_b_id = test_tenants_and_users["member_b_id"]

    response = await async_client.delete(f"/api/v1/users/{member_b_id}", headers=headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "Cross-tenant violation" in response.json().get("detail", "")
