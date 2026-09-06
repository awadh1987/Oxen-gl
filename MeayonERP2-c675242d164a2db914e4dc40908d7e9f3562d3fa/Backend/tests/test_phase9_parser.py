import uuid
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from Backend.database import SessionLocal
from Backend.main import app, get_active_company_id, get_authenticated_user
from Backend.models import (
    AccountAccount,
    AccountJournal,
    AccountMove,
    AIGovernanceLog,
    ResCompany,
    ResUser,
)
from Backend.services.ai_governance import ai_governance_engine
from Backend.services.ai_parser import ai_document_parser


@pytest.fixture(scope="module")
def db_session():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="module")
def parser_fixtures(db_session: Session):
    company = db_session.scalar(select(ResCompany).where(ResCompany.slug == "p9-parser-corp"))
    if not company:
        company = ResCompany(
            name="OCR Parser Logistics Corp",
            slug="p9-parser-corp",
            currency="SAR",
            commercial_registration="1010333001",
            tax_id="300033300100003",
            subscription_tier="ENTERPRISE",
        )
        db_session.add(company)
        db_session.commit()
        db_session.refresh(company)

    admin = db_session.scalar(select(ResUser).where(ResUser.email == "admin@parser-corp.com"))
    if not admin:
        admin = ResUser(
            firebase_uid="uid-parser-admin",
            email="admin@parser-corp.com",
            full_name="Parser Admin",
            company_id=company.id,
            role="Admin",
            is_active=True,
        )
        db_session.add(admin)
        db_session.commit()
        db_session.refresh(admin)

    # Standard Accounts
    expense_acc = db_session.scalar(
        select(AccountAccount).where(
            AccountAccount.company_id == company.id,
            AccountAccount.code == "501000"
        )
    )
    if not expense_acc:
        expense_acc = AccountAccount(
            company_id=company.id,
            code="501000",
            name="Cost of Goods Sold - Materials",
            internal_type="expense",
            currency="SAR",
        )
        db_session.add(expense_acc)

    vat_acc = db_session.scalar(
        select(AccountAccount).where(
            AccountAccount.company_id == company.id,
            AccountAccount.code == "203000"
        )
    )
    if not vat_acc:
        vat_acc = AccountAccount(
            company_id=company.id,
            code="203000",
            name="VAT Payable",
            internal_type="liability",
            currency="SAR",
        )
        db_session.add(vat_acc)

    ap_acc = db_session.scalar(
        select(AccountAccount).where(
            AccountAccount.company_id == company.id,
            AccountAccount.code == "201000"
        )
    )
    if not ap_acc:
        ap_acc = AccountAccount(
            company_id=company.id,
            code="201000",
            name="Accounts Payable - Raw Materials",
            internal_type="liability",
            currency="SAR",
        )
        db_session.add(ap_acc)

    journal = db_session.scalar(
        select(AccountJournal).where(
            AccountJournal.company_id == company.id,
            AccountJournal.code == "PURCH"
        )
    )
    if not journal:
        journal = AccountJournal(
            company_id=company.id,
            code="PURCH",
            name="Purchase Journal",
            journal_type="purchase",
            sequence_prefix="PUR-",
        )
        db_session.add(journal)

    db_session.commit()
    db_session.refresh(company)
    db_session.refresh(admin)
    db_session.refresh(expense_acc)
    db_session.refresh(vat_acc)
    db_session.refresh(ap_acc)
    db_session.refresh(journal)

    return {
        "company": company,
        "admin": admin,
        "expense_acc": expense_acc,
        "vat_acc": vat_acc,
        "ap_acc": ap_acc,
        "journal": journal,
    }


def test_clean_invoice_text_extraction(parser_fixtures: dict):
    raw_invoice = """
    Vendor: Al-Yamama Automotive Parts Ltd.
    VAT ID: 300123456789003
    Invoice Number: INV-2026-9081
    Date: 2026-09-02
    Heavy Fleet Oil Filter - Qty: 10, Unit: 150.00, Total: 1500.00
    Air Brake Valve Pack - Qty: 4, Unit: 500.00, Total: 2000.00
    Subtotal: 3500.00
    VAT (15%): 525.00
    Grand Total: 4025.00 SAR
    """

    parsed = ai_document_parser.parse_invoice_text(raw_invoice)
    assert parsed.vendor_name == "Al-Yamama Automotive Parts Ltd."
    assert parsed.vendor_tax_id == "300123456789003"
    assert parsed.invoice_number == "INV-2026-9081"
    assert parsed.invoice_date == "2026-09-02"
    assert len(parsed.line_items) == 2
    assert parsed.subtotal == Decimal("3500.00")
    assert parsed.tax_total == Decimal("525.00")
    assert parsed.grand_total == Decimal("4025.00")
    assert parsed.confidence_score >= Decimal("0.85")
    assert len(parsed.warnings) == 0


def test_mathematical_inconsistency_yields_confidence_penalty():
    # Inconsistent: Subtotal 1000 + Tax 150 != Grand Total 4000
    raw_inconsistent = """
    Supplier: Quick Fix Mechanics
    Invoice #: QF-441
    Date: 2026-09-03
    Subtotal: 1000.00
    VAT: 150.00
    Total: 4000.00
    """

    parsed = ai_document_parser.parse_invoice_text(raw_inconsistent)
    assert parsed.vendor_name == "Quick Fix Mechanics"
    assert parsed.confidence_score < Decimal("0.65")
    assert any("Mathematical discrepancy" in w for w in parsed.warnings)


def test_balanced_draft_financial_proposal_generation(db_session: Session, parser_fixtures: dict):
    company = parser_fixtures["company"]
    raw_invoice = """
    Supplier: Riyadh Hydraulics Co.
    Invoice #: RH-8802
    Date: 2026-09-05
    Subtotal: 4000.00
    VAT: 600.00
    Grand Total: 4600.00 SAR
    """

    parsed = ai_document_parser.parse_invoice_text(raw_invoice)
    proposal = ai_document_parser.generate_draft_financial_proposal(
        company_id=company.id,
        parsed_data=parsed,
        db=db_session,
    )

    assert "lines" in proposal
    lines = proposal["lines"]
    assert len(lines) == 3

    # Debit Expense = 4000.0, Debit VAT = 600.0, Credit AP = 4600.0
    debits = sum(ln["debit"] for ln in lines)
    credits = sum(ln["credit"] for ln in lines)
    assert abs(debits - credits) < 0.0001
    assert debits == 4600.0


def test_high_value_invoice_routes_through_safety_boundary_requiring_hitl(db_session: Session, parser_fixtures: dict):
    company = parser_fixtures["company"]
    admin = parser_fixtures["admin"]

    # Total 23,000 SAR (> 10,000 SAR threshold)
    raw_high_value = """
    Supplier: Heavy Industrial Machinery Corp
    VAT ID: 300999888777003
    Invoice Number: HIM-2026-001
    Date: 2026-09-04
    Engine Transmission Unit - Qty: 1, Unit: 20000.00, Total: 20000.00
    Subtotal: 20000.00
    VAT (15%): 3000.00
    Grand Total: 23000.00 SAR
    """

    parsed, gov_log, proposal = ai_document_parser.process_and_govern_invoice(
        company_id=company.id,
        user_id=admin.id,
        document_text=raw_high_value,
        db=db_session,
        propose_financial_entry=True,
    )

    assert parsed.grand_total == Decimal("23000.00")
    assert gov_log is not None
    assert gov_log.hitl_required is True
    assert gov_log.safety_validation_status == "PENDING_APPROVAL"
    assert gov_log.risk_level == "HIGH"
    assert gov_log.hitl_approval_token is not None

    # Verify that the issued approval token can be verified and approved
    approved_log = ai_governance_engine.approve_hitl_proposal(
        log_id=gov_log.id,
        approver_user=admin,
        approval_token=gov_log.hitl_approval_token,
        db=db_session,
    )
    assert approved_log.hitl_approved is True
    assert approved_log.execution_status == "APPROVED"


def test_api_parse_invoice_and_governance_flow(parser_fixtures: dict, db_session: Session):
    company = parser_fixtures["company"]
    admin = parser_fixtures["admin"]

    client = TestClient(app)
    app.dependency_overrides[get_authenticated_user] = lambda: admin
    app.dependency_overrides[get_active_company_id] = lambda: company.id

    raw_invoice = """
    Vendor: Desert Fleet Maintenance Co.
    Invoice #: DFM-771
    Date: 2026-09-06
    Subtotal: 12000.00
    VAT: 1800.00
    Grand Total: 13800.00 SAR
    """

    try:
        # 1. Parse Document via API
        response = client.post(
            "/api/ai/documents/parse-invoice",
            headers={"X-Company-ID": str(company.id)},
            json={
                "document_text": raw_invoice,
                "propose_financial_entry": True,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["parsed_invoice"]["vendor_name"] == "Desert Fleet Maintenance Co."
        assert Decimal(str(data["parsed_invoice"]["grand_total"])) == Decimal("13800.00")
        assert data["hitl_required"] is True
        log_id = data["governance_log_id"]
        token = data["hitl_approval_token"]
        assert log_id is not None
        assert token is not None

        # 2. Approve via Governance API
        approve_res = client.post(
            f"/api/ai/governance/proposals/{log_id}/approve",
            headers={"X-Company-ID": str(company.id)},
            json={"approval_token": token},
        )
        assert approve_res.status_code == 200
        assert approve_res.json()["status"] == "APPROVED"

        # 3. Execute into OLTP tables
        exec_res = client.post(
            f"/api/ai/governance/proposals/{log_id}/execute",
            headers={"X-Company-ID": str(company.id)},
            json={"force_sync": True},
        )
        assert exec_res.status_code == 200
        result = exec_res.json()["result"]
        assert result["entity"] == "AccountMove"

        # 4. Verify AccountMove in database
        move_id = uuid.UUID(result["id"])
        move = db_session.get(AccountMove, move_id)
        assert move is not None
        assert move.company_id == company.id
        assert move.state == "posted"

    finally:
        app.dependency_overrides.clear()
