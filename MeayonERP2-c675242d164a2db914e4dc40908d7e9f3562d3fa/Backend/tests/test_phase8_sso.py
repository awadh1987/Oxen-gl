import json
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from Backend.database import SessionLocal, encrypt_connection_url
from Backend.main import (
    app,
    get_active_company_id,
    get_authenticated_user,
    generate_sso_state,
    verify_sso_state,
    resolve_sso_role,
)
from Backend.models import ResCompany, ResUser, SSOProvider, TenantSSOConfig


@pytest.fixture(scope="module")
def db_session():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="module")
def sso_test_fixtures(db_session: Session):
    # 1. Tenant Company
    company = db_session.scalar(select(ResCompany).where(ResCompany.slug == "p8-sso-corp-alpha"))
    if not company:
        company = ResCompany(
            name="SSO Enterprise Corp Alpha",
            slug="p8-sso-corp-alpha",
            currency="SAR",
            commercial_registration="1010666001",
            tax_id="300066600100003",
            subscription_tier="ENTERPRISE",
        )
        db_session.add(company)
        db_session.commit()
        db_session.refresh(company)

    # 2. Tenant Admin User
    admin = db_session.scalar(select(ResUser).where(ResUser.email == "admin@sso-corp-alpha.com"))
    if not admin:
        admin = ResUser(
            firebase_uid="uid-sso-admin-alpha",
            email="admin@sso-corp-alpha.com",
            full_name="Alpha Admin",
            company_id=company.id,
            role="Admin",
            is_active=True,
        )
        db_session.add(admin)
        db_session.commit()
        db_session.refresh(admin)

    # 3. Identity Provider (Entra ID)
    provider = db_session.scalar(select(SSOProvider).where(SSOProvider.slug == "entra-id"))
    if not provider:
        provider = SSOProvider(
            name="Microsoft Entra ID",
            slug="entra-id",
            protocol="OIDC",
            issuer_url="https://login.microsoftonline.com/common/v2.0",
            authorization_endpoint="https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
            token_endpoint="https://login.microsoftonline.com/common/oauth2/v2.0/token",
            userinfo_endpoint="https://graph.microsoft.com/oidc/userinfo",
            is_active=True,
        )
        db_session.add(provider)
        db_session.commit()
        db_session.refresh(provider)

    # 4. Tenant SSO Config
    config = db_session.scalar(select(TenantSSOConfig).where(TenantSSOConfig.company_id == company.id))
    role_mapping = {
        "Global Admin": "Super_Admin",
        "Enterprise Admin": "Admin",
        "Finance Director": "Accountant",
        "Warehouse Manager": "Data_Entry",
    }
    if not config:
        config = TenantSSOConfig(
            company_id=company.id,
            provider_id=provider.id,
            client_id="entra-client-id-12345",
            encrypted_client_secret=encrypt_connection_url("super-secret-entra-key-xyz"),
            domain_hint="sso-corp-alpha.com",
            role_mapping=json.dumps(role_mapping),
            default_role="Guest",
            enforce_sso_only=False,
            is_active=True,
        )
        db_session.add(config)
    else:
        config.client_id = "entra-client-id-12345"
        config.role_mapping = json.dumps(role_mapping)
        config.default_role = "Guest"
        config.enforce_sso_only = False
        config.is_active = True
    db_session.commit()
    db_session.refresh(config)

    # 5. Unconfigured Company (to test negative cases)
    unconfigured_company = db_session.scalar(select(ResCompany).where(ResCompany.slug == "p8-sso-unconfigured"))
    if not unconfigured_company:
        unconfigured_company = ResCompany(
            name="Unconfigured SSO Corp",
            slug="p8-sso-unconfigured",
            currency="SAR",
            commercial_registration="1010666002",
            tax_id="300066600200003",
        )
        db_session.add(unconfigured_company)
        db_session.commit()
        db_session.refresh(unconfigured_company)

    return {
        "company": company,
        "admin": admin,
        "provider": provider,
        "config": config,
        "unconfigured_company": unconfigured_company,
        "role_mapping": role_mapping,
    }


# ==============================================================================
# 1. State Token & Role Resolution Unit Tests
# ==============================================================================

def test_sso_state_token_generation_and_verification(sso_test_fixtures):
    company = sso_test_fixtures["company"]

    state = generate_sso_state(company.id)
    assert isinstance(state, str)
    assert "." in state

    extracted_id = verify_sso_state(state)
    assert extracted_id == company.id


def test_sso_state_token_tampered_fails():
    valid_state = generate_sso_state(uuid.uuid4())
    payload_part, sig_part = valid_state.split(".", 1)
    tampered_sig = sig_part[:-2] + "xx"
    tampered_state = f"{payload_part}.{tampered_sig}"

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        verify_sso_state(tampered_state)
    assert exc_info.value.status_code == 400
    assert "signature verification failed" in exc_info.value.detail


def test_resolve_sso_role_mapping(sso_test_fixtures):
    config = sso_test_fixtures["config"]
    config.role_mapping = json.dumps({
        "Global Admin": "Super_Admin",
        "Enterprise Admin": "Admin",
        "Finance Director": "Accountant",
        "Warehouse Manager": "Data_Entry",
    })
    config.default_role = "Guest"

    # 1. Match Finance Director -> Accountant
    role_1 = resolve_sso_role(config, {"roles": ["Finance Director"]})
    assert role_1 == "Accountant"

    # 2. Match Warehouse Manager in groups -> Data_Entry
    role_2 = resolve_sso_role(config, {"groups": ["Logistics-Team", "Warehouse Manager"]})
    assert role_2 == "Data_Entry"

    # 3. Match Enterprise Admin in role string -> Admin
    role_3 = resolve_sso_role(config, {"role": "Enterprise Admin"})
    assert role_3 == "Admin"

    # 4. Unmapped role -> default_role ("Guest")
    role_4 = resolve_sso_role(config, {"roles": ["External.Vendor.Consultant"]})
    assert role_4 == "Guest"


# ==============================================================================
# 2. SSO Provider & Tenant Config API Tests
# ==============================================================================

def test_get_sso_providers():
    with TestClient(app) as client:
        response = client.get("/api/auth/sso/providers")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        slugs = [p["slug"] for p in data]
        assert "entra-id" in slugs


def test_tenant_sso_config_crud(sso_test_fixtures, db_session: Session):
    company = sso_test_fixtures["company"]
    admin = sso_test_fixtures["admin"]
    provider = sso_test_fixtures["provider"]
    config = sso_test_fixtures["config"]

    # Ensure baseline state
    config.client_id = "entra-client-id-12345"
    db_session.commit()

    app.dependency_overrides[get_active_company_id] = lambda: company.id
    app.dependency_overrides[get_authenticated_user] = lambda: admin

    with TestClient(app) as client:
        # 1. Get existing config
        get_res = client.get("/api/tenant/sso/config")
        assert get_res.status_code == 200
        cfg_data = get_res.json()
        assert cfg_data["client_id"] == "entra-client-id-12345"

        # 2. Update config
        update_res = client.put(
            "/api/tenant/sso/config",
            json={
                "provider_id": str(provider.id),
                "client_id": "updated-entra-client-id-999",
                "client_secret": "updated-secret-key-456",
                "domain_hint": "sso-corp-alpha.com",
                "role_mapping": {"Accounting.Lead": "Accountant", "IT.Admin": "Admin"},
                "default_role": "Data_Entry",
                "enforce_sso_only": True,
                "is_active": True,
            },
        )
        assert update_res.status_code == 200
        updated = update_res.json()
        assert updated["client_id"] == "updated-entra-client-id-999"
        assert updated["default_role"] == "Data_Entry"
        assert updated["enforce_sso_only"] is True


# ==============================================================================
# 3. SSO Login Initiation & Callback Validation Tests
# ==============================================================================

def test_initiate_sso_login_success(sso_test_fixtures):
    company = sso_test_fixtures["company"]

    with TestClient(app) as client:
        # Initiate via company slug
        res = client.post("/api/auth/sso/initiate", json={"company_slug": company.slug})
        assert res.status_code == 200
        data = res.json()
        assert "authorization_url" in data
        assert "state" in data
        assert data["client_id"] in {"entra-client-id-12345", "updated-entra-client-id-999"}

        auth_url = data["authorization_url"]
        assert "https://login.microsoftonline.com/common/oauth2/v2.0/authorize" in auth_url
        assert "response_type=code" in auth_url
        assert "state=" in auth_url


def test_initiate_sso_login_via_domain(sso_test_fixtures):
    with TestClient(app) as client:
        res = client.post("/api/auth/sso/initiate", json={"domain": "sso-corp-alpha.com"})
        assert res.status_code == 200
        data = res.json()
        assert data["provider_name"] == "Microsoft Entra ID"


def test_initiate_sso_login_unconfigured_tenant_fails(sso_test_fixtures):
    unconfigured = sso_test_fixtures["unconfigured_company"]

    with TestClient(app) as client:
        res = client.post("/api/auth/sso/initiate", json={"company_slug": unconfigured.slug})
        assert res.status_code == 400
        assert "Enterprise SSO is not configured" in res.json()["detail"]


def test_process_sso_callback_jit_provisioning_and_role_mapping(sso_test_fixtures, db_session: Session):
    company = sso_test_fixtures["company"]
    state = generate_sso_state(company.id)

    new_user_email = f"sso_accountant_{uuid.uuid4().hex[:6]}@sso-corp-alpha.com"
    claims = {
        "email": new_user_email,
        "name": "Fatima Al-Zahrani",
        "roles": ["Accounting.Lead"],  # Mapped to Accountant in previous test
    }

    with TestClient(app) as client:
        callback_res = client.post(
            "/api/auth/sso/callback",
            json={"state": state, "code": "mock-auth-code-12345", "claims": claims},
        )
        assert callback_res.status_code == 200
        data = callback_res.json()
        assert data["message"] == "SSO Authentication Successful"
        assert data["mapped_role"] == "Accountant"
        assert data["user"]["email"] == new_user_email
        assert data["user"]["company_id"] == str(company.id)

        # Verify session cookie was set on response
        assert "oxengl_session" in callback_res.cookies

        # Verify new user was created in database
        db_user = db_session.scalar(select(ResUser).where(ResUser.email == new_user_email))
        assert db_user is not None
        assert db_user.role == "Accountant"
        assert db_user.company_id == company.id
        assert db_user.full_name == "Fatima Al-Zahrani"
        assert db_user.is_active is True


def test_process_sso_callback_existing_user_update(sso_test_fixtures, db_session: Session):
    company = sso_test_fixtures["company"]

    existing_email = f"existing_{uuid.uuid4().hex[:6]}@sso-corp-alpha.com"
    existing_user = ResUser(
        firebase_uid=f"local_{uuid.uuid4().hex[:8]}",
        email=existing_email,
        full_name="Existing Operator",
        company_id=company.id,
        role="Guest",
        is_active=True,
    )
    db_session.add(existing_user)
    db_session.commit()

    # Now user logs in via SSO with IT.Admin role (mapped to Admin)
    state = generate_sso_state(company.id)
    claims = {
        "email": existing_email,
        "name": "Existing Operator Senior",
        "roles": ["IT.Admin"],
    }

    with TestClient(app) as client:
        callback_res = client.post(
            "/api/auth/sso/callback",
            json={"state": state, "code": "mock-code", "claims": claims},
        )
        assert callback_res.status_code == 200
        data = callback_res.json()
        assert data["mapped_role"] == "Admin"

        db_session.refresh(existing_user)
        assert existing_user.role == "Admin"
        assert existing_user.full_name == "Existing Operator Senior"
