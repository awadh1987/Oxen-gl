import os
import uuid
import pytest
from pathlib import Path
from sqlalchemy import Column, Integer, String, create_engine, select, text
from sqlalchemy.orm import Session, declarative_base

from backend.database import (
    Base,
    SessionLocal,
    decrypt_connection_url,
    encrypt_connection_url,
    tenant_connection_manager,
)
from backend.models import ResCompany, TenantDatabaseConfig


# Create a distinct isolated test entity to verify cross-database physical isolation
ResidencyTestBase = declarative_base()


class TenantVaultRecord(ResidencyTestBase):
    __tablename__ = "tenant_vault_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_code = Column(String(64), nullable=False)
    secret_payload = Column(String(255), nullable=False)


@pytest.fixture(scope="module")
def db_session():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="module")
def residency_companies(db_session: Session):
    # Tenant Alpha (Enterprise dedicated)
    company_alpha = db_session.scalar(
        select(ResCompany).where(ResCompany.slug == "p8-enterprise-alpha")
    )
    if not company_alpha:
        company_alpha = ResCompany(
            name="Enterprise Tenant Alpha Ltd",
            slug="p8-enterprise-alpha",
            currency="SAR",
            commercial_registration="1010777001",
            tax_id="300077700100003",
            subscription_tier="ENTERPRISE",
        )
        db_session.add(company_alpha)
        db_session.commit()
        db_session.refresh(company_alpha)

    # Tenant Beta (Enterprise dedicated)
    company_beta = db_session.scalar(
        select(ResCompany).where(ResCompany.slug == "p8-enterprise-beta")
    )
    if not company_beta:
        company_beta = ResCompany(
            name="Enterprise Tenant Beta Ltd",
            slug="p8-enterprise-beta",
            currency="SAR",
            commercial_registration="1010777002",
            tax_id="300077700200003",
            subscription_tier="ENTERPRISE",
        )
        db_session.add(company_beta)
        db_session.commit()
        db_session.refresh(company_beta)

    # Tenant Gamma (Standard shared tenant without dedicated DB)
    company_gamma = db_session.scalar(
        select(ResCompany).where(ResCompany.slug == "p8-standard-gamma")
    )
    if not company_gamma:
        company_gamma = ResCompany(
            name="Standard Tenant Gamma Ltd",
            slug="p8-standard-gamma",
            currency="SAR",
            commercial_registration="1010777003",
            tax_id="300077700300003",
            subscription_tier="PROFESSIONAL",
        )
        db_session.add(company_gamma)
        db_session.commit()
        db_session.refresh(company_gamma)

    return {
        "alpha": company_alpha,
        "beta": company_beta,
        "gamma": company_gamma,
    }


# ==============================================================================
# 1. Connection String Encryption & Decryption Tests
# ==============================================================================

def test_connection_string_encryption_decryption():
    raw_postgres_url = "postgresql+psycopg2://corp_admin:SecurePass2026!@10.0.4.15:5432/corp_dedicated_db"
    
    encrypted = encrypt_connection_url(raw_postgres_url)
    assert encrypted != raw_postgres_url
    assert isinstance(encrypted, str)
    assert len(encrypted) > 20

    decrypted = decrypt_connection_url(encrypted)
    assert decrypted == raw_postgres_url


def test_encryption_custom_key():
    url = "postgresql+psycopg2://tenant_user:pass@host/db"
    key_1 = "custom-secret-key-number-one-32b!"
    key_2 = "custom-secret-key-number-two-32b!"

    enc_1 = encrypt_connection_url(url, secret_key=key_1)
    dec_1 = decrypt_connection_url(enc_1, secret_key=key_1)
    assert dec_1 == url

    # Decrypting with wrong key must fail
    with pytest.raises(Exception):
        decrypt_connection_url(enc_1, secret_key=key_2)


# ==============================================================================
# 2. TenantDatabaseConfig Model & Persistence Tests
# ==============================================================================

def test_tenant_database_config_model_lifecycle(residency_companies, db_session: Session):
    company = residency_companies["alpha"]

    # Clean existing if any
    db_session.query(TenantDatabaseConfig).filter(TenantDatabaseConfig.company_id == company.id).delete()
    db_session.commit()

    conn_url = "postgresql+psycopg2://alpha_admin:Pass123!@db-sa-central.internal:5432/alpha_db"
    encrypted_url = encrypt_connection_url(conn_url)

    config = TenantDatabaseConfig(
        company_id=company.id,
        database_name="oxengl_alpha_dedicated",
        encrypted_connection_url=encrypted_url,
        residency_region="sa-central-1",
        isolation_level="dedicated",
        is_active=True,
    )
    db_session.add(config)
    db_session.commit()
    db_session.refresh(config)

    assert config.id is not None
    assert config.database_name == "oxengl_alpha_dedicated"
    assert config.residency_region == "sa-central-1"
    assert config.isolation_level == "dedicated"
    assert config.is_active is True
    assert config.company.slug == "p8-enterprise-alpha"

    # Cleanup
    db_session.delete(config)
    db_session.commit()


# ==============================================================================
# 3. Dynamic Connection Router & Strict Physical Isolation Tests
# ==============================================================================

def test_dynamic_connection_router_physical_isolation(tmp_path: Path, residency_companies, db_session: Session):
    alpha = residency_companies["alpha"]
    beta = residency_companies["beta"]

    # 1. Initialize two entirely separate physical SQLite database files
    db_a_file = str(tmp_path / "tenant_alpha_dedicated.db")
    db_b_file = str(tmp_path / "tenant_beta_dedicated.db")

    url_a = f"sqlite:///{db_a_file}"
    url_b = f"sqlite:///{db_b_file}"

    # Prepare physical tables in Database A and Database B
    engine_a = create_engine(url_a)
    engine_b = create_engine(url_b)
    ResidencyTestBase.metadata.create_all(engine_a)
    ResidencyTestBase.metadata.create_all(engine_b)

    # Insert secret vault record into Database A exclusively
    with Session(engine_a) as s_a:
        s_a.add(TenantVaultRecord(tenant_code="ALPHA_ONLY", secret_payload="ALPHA_SUPER_SECRET_PAYLOAD_991"))
        s_a.commit()

    # Insert secret vault record into Database B exclusively
    with Session(engine_b) as s_b:
        s_b.add(TenantVaultRecord(tenant_code="BETA_ONLY", secret_payload="BETA_RESTRICTED_DATA_882"))
        s_b.commit()

    # 2. Configure Database Configs in Metadata Catalog
    # Clean up previous configs
    db_session.query(TenantDatabaseConfig).filter(
        TenantDatabaseConfig.company_id.in_([alpha.id, beta.id])
    ).delete()
    db_session.commit()

    config_a = TenantDatabaseConfig(
        company_id=alpha.id,
        database_name="tenant_alpha_phys_db",
        encrypted_connection_url=encrypt_connection_url(url_a),
        residency_region="sa-central-1",
        isolation_level="dedicated",
        is_active=True,
    )
    config_b = TenantDatabaseConfig(
        company_id=beta.id,
        database_name="tenant_beta_phys_db",
        encrypted_connection_url=encrypt_connection_url(url_b),
        residency_region="me-south-1",
        isolation_level="dedicated",
        is_active=True,
    )
    db_session.add_all([config_a, config_b])
    db_session.commit()

    # Reset cache to force clean dynamic resolution
    tenant_connection_manager.reset_cache()

    # 3. Resolve Session for Tenant Alpha
    session_alpha = tenant_connection_manager.get_session(alpha.id, db=db_session)
    try:
        # Query Database A via resolved Session
        records_in_a = session_alpha.query(TenantVaultRecord).all()
        assert len(records_in_a) == 1
        assert records_in_a[0].tenant_code == "ALPHA_ONLY"
        assert records_in_a[0].secret_payload == "ALPHA_SUPER_SECRET_PAYLOAD_991"

        # Verify that BETA record is completely absent and inaccessible
        beta_query = session_alpha.query(TenantVaultRecord).filter_by(tenant_code="BETA_ONLY").first()
        assert beta_query is None, "Physical leak: Tenant Alpha session accessed Tenant Beta record!"
    finally:
        session_alpha.close()

    # 4. Resolve Session for Tenant Beta
    session_beta = tenant_connection_manager.get_session(beta.id, db=db_session)
    try:
        # Query Database B via resolved Session
        records_in_b = session_beta.query(TenantVaultRecord).all()
        assert len(records_in_b) == 1
        assert records_in_b[0].tenant_code == "BETA_ONLY"
        assert records_in_b[0].secret_payload == "BETA_RESTRICTED_DATA_882"

        # Verify that ALPHA record is completely absent and inaccessible
        alpha_query = session_beta.query(TenantVaultRecord).filter_by(tenant_code="ALPHA_ONLY").first()
        assert alpha_query is None, "Physical leak: Tenant Beta session accessed Tenant Alpha record!"
    finally:
        session_beta.close()

    # 5. Clean up configs
    db_session.delete(config_a)
    db_session.delete(config_b)
    db_session.commit()
    tenant_connection_manager.reset_cache()


def test_dynamic_router_fallback_to_platform_default(residency_companies, db_session: Session):
    gamma = residency_companies["gamma"]

    # Ensure gamma has no dedicated config
    db_session.query(TenantDatabaseConfig).filter(TenantDatabaseConfig.company_id == gamma.id).delete()
    db_session.commit()

    tenant_connection_manager.reset_cache(gamma.id)

    # Routing gamma must fallback to default platform engine
    engine = tenant_connection_manager.get_engine(gamma.id, db=db_session)
    assert engine is tenant_connection_manager.default_engine

    # Anonymous or None company_id also routes to default engine
    assert tenant_connection_manager.get_engine(None) is tenant_connection_manager.default_engine


def test_dynamic_router_inactive_config_routes_to_default(residency_companies, db_session: Session):
    alpha = residency_companies["alpha"]

    # Set inactive config
    db_session.query(TenantDatabaseConfig).filter(TenantDatabaseConfig.company_id == alpha.id).delete()
    db_session.commit()

    inactive_config = TenantDatabaseConfig(
        company_id=alpha.id,
        database_name="inactive_db",
        encrypted_connection_url=encrypt_connection_url("sqlite:///:memory:"),
        residency_region="sa-central-1",
        isolation_level="dedicated",
        is_active=False,  # INACTIVE!
    )
    db_session.add(inactive_config)
    db_session.commit()

    tenant_connection_manager.reset_cache(alpha.id)

    # Must fallback to default platform engine
    resolved_engine = tenant_connection_manager.get_engine(alpha.id, db=db_session)
    assert resolved_engine is tenant_connection_manager.default_engine

    # Cleanup
    db_session.delete(inactive_config)
    db_session.commit()
    tenant_connection_manager.reset_cache(alpha.id)


def test_engine_caching_and_cache_invalidation(tmp_path: Path, residency_companies, db_session: Session):
    alpha = residency_companies["alpha"]
    db_file = str(tmp_path / "cache_test.db")
    url = f"sqlite:///{db_file}"

    config = TenantDatabaseConfig(
        company_id=alpha.id,
        database_name="cache_test_db",
        encrypted_connection_url=encrypt_connection_url(url),
        residency_region="sa-central-1",
        isolation_level="dedicated",
        is_active=True,
    )
    db_session.add(config)
    db_session.commit()

    tenant_connection_manager.reset_cache(alpha.id)

    # First access creates engine
    engine_1 = tenant_connection_manager.get_engine(alpha.id, db=db_session)
    # Second access returns cached engine
    engine_2 = tenant_connection_manager.get_engine(alpha.id, db=db_session)
    assert engine_1 is engine_2
    assert str(engine_1.url) == url

    # Reset cache for alpha
    tenant_connection_manager.reset_cache(alpha.id)
    assert alpha.id not in tenant_connection_manager._engine_cache

    # Cleanup
    db_session.delete(config)
    db_session.commit()
    tenant_connection_manager.reset_cache(alpha.id)


def test_session_scope_transaction_handling(tmp_path: Path, residency_companies):
    alpha = residency_companies["alpha"]
    db_file = str(tmp_path / "scope_test.db")
    url = f"sqlite:///{db_file}"

    test_eng = create_engine(url)
    ResidencyTestBase.metadata.create_all(test_eng)
    tenant_connection_manager.register_tenant_engine(alpha.id, test_eng)

    # 1. Success commits transaction
    with tenant_connection_manager.session_scope(alpha.id) as s:
        s.add(TenantVaultRecord(tenant_code="TX_TEST", secret_payload="COMMITTED_PAYLOAD"))

    # Verify committed
    with Session(test_eng) as verify_s:
        rec = verify_s.query(TenantVaultRecord).filter_by(tenant_code="TX_TEST").first()
        assert rec is not None
        assert rec.secret_payload == "COMMITTED_PAYLOAD"

    # 2. Failure rolls back transaction
    with pytest.raises(RuntimeError):
        with tenant_connection_manager.session_scope(alpha.id) as s:
            s.add(TenantVaultRecord(tenant_code="FAIL_TEST", secret_payload="SHOULD_ROLLBACK"))
            raise RuntimeError("Simulated transaction error")

    # Verify rolled back
    with Session(test_eng) as verify_s:
        rec = verify_s.query(TenantVaultRecord).filter_by(tenant_code="FAIL_TEST").first()
        assert rec is None

    tenant_connection_manager.reset_cache(alpha.id)
