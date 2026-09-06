import uuid
from datetime import datetime, timezone
from decimal import Decimal
import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from Backend.database import SessionLocal
from Backend.models import (
    CustomerInvoice,
    ResCompany,
    ResUser,
    SecurityEvent,
    TaxProfile,
    TaxRule,
    ZATCALog,
)
from Backend.schemas import (
    SecurityEventCreate,
    SecurityEventRead,
    TaxProfileCreate,
    TaxProfileRead,
    TaxRuleCreate,
    TaxRuleRead,
    ZATCALogCreate,
    ZATCALogRead,
)


@pytest.fixture(scope="module")
def db_session():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="module")
def p5_fixtures(db_session: Session):
    company = db_session.scalar(select(ResCompany).where(ResCompany.slug == "phase5-compliance-corp"))
    if not company:
        company = ResCompany(
            name="Phase 5 Compliance Corp",
            slug="phase5-compliance-corp",
            currency="SAR",
            commercial_registration="1010777777",
            tax_id="300077777700003",
        )
        db_session.add(company)
        db_session.commit()
        db_session.refresh(company)

    user = db_session.scalar(select(ResUser).where(ResUser.email == "compliance_officer@oxengl.com"))
    if not user:
        user = ResUser(
            firebase_uid="p5-compliance-uid",
            email="compliance_officer@oxengl.com",
            full_name="Compliance & Security Officer",
            company_id=company.id,
            role="Admin",
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

    invoice = db_session.scalar(select(CustomerInvoice).where(CustomerInvoice.company_id == company.id, CustomerInvoice.invoice_number == "INV-P5-TEST-001"))
    if not invoice:
        invoice = CustomerInvoice(
            company_id=company.id,
            invoice_number="INV-P5-TEST-001",
            customer_name="ZATCA Clearance Customer",
            issue_date=datetime.now(timezone.utc),
            subtotal=Decimal("1000.0000"),
            vat_amount=Decimal("150.0000"),
            grand_total=Decimal("1150.0000"),
            status="Draft",
        )
        db_session.add(invoice)
        db_session.commit()
        db_session.refresh(invoice)

    return {
        "company": company,
        "user": user,
        "invoice": invoice,
    }


def test_tax_profile_model_and_schema(db_session: Session, p5_fixtures):
    company = p5_fixtures["company"]
    tax_id = f"300{uuid.uuid4().hex[:10]}00003"[:15]

    # Schema creation validation
    profile_in = TaxProfileCreate(
        tax_id=tax_id,
        legal_name="شركة ميون للخدمات اللوجستية",
        trade_name="ميون",
        city="Riyadh",
        country_code="SA",
        zatca_stage="simulation",
        zatca_environment="simulation",
    )
    assert profile_in.tax_id == tax_id
    assert TaxProfileCreate.Config.schema_extra is not None

    # DB persistence
    profile = TaxProfile(company_id=company.id, **profile_in.model_dump())
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(profile)

    assert profile.id is not None
    assert profile.company_id == company.id
    assert profile.zatca_stage == "simulation"

    # Schema Read serialization
    read_dto = TaxProfileRead.model_validate(profile)
    assert read_dto.id == profile.id
    assert read_dto.tax_id == tax_id


def test_tax_rule_model_and_schema(db_session: Session, p5_fixtures):
    company = p5_fixtures["company"]
    code = f"VAT_15_{uuid.uuid4().hex[:4].upper()}"

    # Schema creation validation (Standard 15% VAT)
    rule_in = TaxRuleCreate(
        code=code,
        name="Standard KSA VAT 15%",
        rate=Decimal("0.1500"),
        tax_type="vat",
        description="Standard 15% Value Added Tax",
    )
    assert rule_in.rate == Decimal("0.1500")
    assert TaxRuleCreate.Config.schema_extra is not None

    # DB persistence
    rule = TaxRule(company_id=company.id, **rule_in.model_dump())
    db_session.add(rule)
    db_session.commit()
    db_session.refresh(rule)

    assert rule.id is not None
    assert rule.company_id == company.id
    assert rule.rate == Decimal("0.1500")

    # Schema Read serialization
    read_dto = TaxRuleRead.model_validate(rule)
    assert read_dto.code == code
    assert read_dto.rate == Decimal("0.1500")


def test_zatca_log_model_and_schema(db_session: Session, p5_fixtures):
    company = p5_fixtures["company"]
    invoice = p5_fixtures["invoice"]
    inv_uuid = str(uuid.uuid4())

    log_in = ZATCALogCreate(
        invoice_id=invoice.id,
        invoice_uuid=inv_uuid,
        invoice_hash="47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=",
        submission_status="CLEARED",
        clearance_status="CLEARED",
        reporting_status="REPORTED",
        retry_count=0,
    )
    assert log_in.submission_status == "CLEARED"
    assert ZATCALogCreate.Config.schema_extra is not None

    log_entry = ZATCALog(company_id=company.id, **log_in.model_dump())
    db_session.add(log_entry)
    db_session.commit()
    db_session.refresh(log_entry)

    assert log_entry.id is not None
    assert log_entry.invoice_id == invoice.id
    assert log_entry.submission_status == "CLEARED"

    # Schema Read serialization
    read_dto = ZATCALogRead.model_validate(log_entry)
    assert read_dto.invoice_uuid == inv_uuid
    assert read_dto.submission_status == "CLEARED"


def test_security_event_model_and_immutability(db_session: Session, p5_fixtures):
    company = p5_fixtures["company"]
    user = p5_fixtures["user"]

    # Schema creation validation
    event_in = SecurityEventCreate(
        company_id=company.id,
        user_id=user.id,
        actor_email="attacker@malicious-node.org",
        event_type="idor_attempt",
        severity="CRITICAL",
        ip_address="45.133.1.99",
        request_path="/api/procurement/purchase-orders/00000000-0000-0000-0000-000000000000",
        request_method="GET",
        details="Attempted access to tenant resource across security boundary",
    )
    assert event_in.severity == "CRITICAL"
    assert SecurityEventCreate.Config.schema_extra is not None

    # Persist security event
    sec_event = SecurityEvent(**event_in.model_dump())
    db_session.add(sec_event)
    db_session.commit()
    db_session.refresh(sec_event)

    assert sec_event.id is not None
    assert sec_event.event_type == "idor_attempt"

    # Read serialization
    read_dto = SecurityEventRead.model_validate(sec_event)
    assert read_dto.event_type == "idor_attempt"
    assert read_dto.severity == "CRITICAL"

    # IMMUTABILITY TEST: Attempting to update a security event must be rejected
    with pytest.raises(IntegrityError) as exc_update:
        sec_event.details = "Modified attacker details"
        db_session.commit()
    assert "Security event audit logs are immutable and cannot be modified or deleted" in str(exc_update.value)
    db_session.rollback()

    # IMMUTABILITY TEST: Attempting to delete a security event must be rejected
    sec_event_reloaded = db_session.get(SecurityEvent, sec_event.id)
    with pytest.raises(IntegrityError) as exc_delete:
        db_session.delete(sec_event_reloaded)
        db_session.commit()
    assert "Security event audit logs are immutable and cannot be modified or deleted" in str(exc_delete.value)
    db_session.rollback()
