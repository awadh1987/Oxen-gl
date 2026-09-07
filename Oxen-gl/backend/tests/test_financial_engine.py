import uuid
from datetime import datetime, timezone
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.main import app, get_active_company_id, get_authenticated_user
from backend.models import (
    AccountAccount,
    AccountJournal,
    AccountMove,
    AccountMoveLine,
    CostCenter,
    CustomerInvoice,
    FiscalYear,
    ResCompany,
    ResPartner,
    ResUser,
)


@pytest.fixture(scope="module")
def db_session():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="module")
def financial_fixtures(db_session: Session):
    # 1. Company
    company = db_session.scalar(select(ResCompany).where(ResCompany.slug == "test-fin-corp"))
    if not company:
        company = ResCompany(
            name="Test Financial Corp",
            slug="test-fin-corp",
            currency="SAR",
            commercial_registration="1010999991",
            tax_id="300099999900003",
        )
        db_session.add(company)
        db_session.commit()
        db_session.refresh(company)

    # 2. User
    user = db_session.scalar(select(ResUser).where(ResUser.email == "testadmin@oxengl.com"))
    if not user:
        user = ResUser(
            firebase_uid="test-financial-admin-uid",
            email="testadmin@oxengl.com",
            full_name="Financial Test Admin",
            company_id=company.id,
            role="Super_Admin",
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

    # 3. Fiscal Year
    fiscal_year = db_session.scalar(
        select(FiscalYear).where(FiscalYear.company_id == company.id, FiscalYear.name == "FY 2026")
    )
    if not fiscal_year:
        fiscal_year = FiscalYear(
            company_id=company.id,
            name="FY 2026",
            date_start=datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
            date_end=datetime(2026, 12, 31, 23, 59, 59, tzinfo=timezone.utc),
            state="open",
        )
        db_session.add(fiscal_year)
        db_session.commit()
        db_session.refresh(fiscal_year)

    # 4. Cost Center
    cost_center = db_session.scalar(
        select(CostCenter).where(CostCenter.company_id == company.id, CostCenter.code == "CC_MAIN")
    )
    if not cost_center:
        cost_center = CostCenter(
            company_id=company.id,
            code="CC_MAIN",
            name="Headquarters",
            is_active=True,
        )
        db_session.add(cost_center)
        db_session.commit()
        db_session.refresh(cost_center)

    # 5. Accounts
    def get_or_create_account(code: str, name: str, internal_type: str):
        acc = db_session.scalar(
            select(AccountAccount).where(AccountAccount.company_id == company.id, AccountAccount.code == code)
        )
        if not acc:
            acc = AccountAccount(
                company_id=company.id,
                code=code,
                name=name,
                internal_type=internal_type,
                currency="SAR",
            )
            db_session.add(acc)
            db_session.commit()
            db_session.refresh(acc)
        return acc

    ar_acc = get_or_create_account("120000", "Accounts Receivable", "asset")
    rev_acc = get_or_create_account("401000", "Sales Revenue", "revenue")
    vat_acc = get_or_create_account("203000", "VAT Payable", "liability")

    # 6. Journal
    journal = db_session.scalar(
        select(AccountJournal).where(AccountJournal.company_id == company.id, AccountJournal.code == "INV")
    )
    if not journal:
        journal = AccountJournal(
            company_id=company.id,
            code="INV",
            name="Customer Invoices",
            journal_type="sale",
            sequence_prefix="INV-2026",
            next_sequence=1,
            is_active=True,
        )
        db_session.add(journal)
        db_session.commit()
        db_session.refresh(journal)

    # 7. Customer Partner
    partner = db_session.scalar(
        select(ResPartner).where(ResPartner.company_id == company.id, ResPartner.name == "Test Client Partner")
    )
    if not partner:
        partner = ResPartner(
            company_id=company.id,
            name="Test Client Partner",
            partner_type="customer",
            email="client@partner.com",
            tax_number="311111111100003",
            is_active=True,
        )
        db_session.add(partner)
        db_session.commit()
        db_session.refresh(partner)

    return {
        "company": company,
        "user": user,
        "fiscal_year": fiscal_year,
        "cost_center": cost_center,
        "ar_acc": ar_acc,
        "rev_acc": rev_acc,
        "vat_acc": vat_acc,
        "journal": journal,
        "partner": partner,
    }


@pytest.fixture(scope="module")
def client(financial_fixtures):
    company = financial_fixtures["company"]
    user = financial_fixtures["user"]

    app.dependency_overrides[get_active_company_id] = lambda: company.id
    app.dependency_overrides[get_authenticated_user] = lambda: user

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def test_br001_unbalanced_move_rejected(client: TestClient, financial_fixtures):
    fixtures = financial_fixtures
    ar_acc = fixtures["ar_acc"]
    rev_acc = fixtures["rev_acc"]

    # Unbalanced payload: Debit 1000, Credit 800
    payload = {
        "journal_code": "INV",
        "move_type": "entry",
        "ref": "UNBALANCED-TEST",
        "lines": [
            {
                "account_id": str(ar_acc.id),
                "name": "Receivable",
                "debit": 1000.0,
                "credit": 0.0,
            },
            {
                "account_id": str(rev_acc.id),
                "name": "Revenue",
                "debit": 0.0,
                "credit": 800.0,
            },
        ],
    }
    resp = client.post("/api/accounting/moves", json=payload)
    assert resp.status_code == 422
    assert "debits must equal credits" in resp.text.lower() or "balance" in resp.text.lower()


def test_br001_single_sided_validation(client: TestClient, financial_fixtures):
    fixtures = financial_fixtures
    ar_acc = fixtures["ar_acc"]
    rev_acc = fixtures["rev_acc"]

    # Both debit and credit on single line
    payload = {
        "journal_code": "INV",
        "move_type": "entry",
        "ref": "DUAL-SIDED-TEST",
        "lines": [
            {
                "account_id": str(ar_acc.id),
                "name": "Invalid dual line",
                "debit": 500.0,
                "credit": 500.0,
            },
            {
                "account_id": str(rev_acc.id),
                "name": "Revenue line",
                "debit": 0.0,
                "credit": 500.0,
            },
        ],
    }
    resp = client.post("/api/accounting/moves", json=payload)
    assert resp.status_code == 422


def test_conc001_atomic_sequence_and_posting(client: TestClient, financial_fixtures):
    fixtures = financial_fixtures
    ar_acc = fixtures["ar_acc"]
    rev_acc = fixtures["rev_acc"]

    # Post balanced move 1
    p1 = {
        "journal_code": "INV",
        "move_type": "entry",
        "ref": "BALANCED-1",
        "lines": [
            {"account_id": str(ar_acc.id), "name": "Debit leg", "debit": 500.0, "credit": 0.0},
            {"account_id": str(rev_acc.id), "name": "Credit leg", "debit": 0.0, "credit": 500.0},
        ],
    }
    r1 = client.post("/api/accounting/moves", json=p1)
    assert r1.status_code == 201, r1.text
    m1 = r1.json()
    assert m1["state"] == "posted"
    assert m1["sequence_number"] is not None

    # Post balanced move 2
    p2 = {
        "journal_code": "INV",
        "move_type": "entry",
        "ref": "BALANCED-2",
        "lines": [
            {"account_id": str(ar_acc.id), "name": "Debit leg", "debit": 250.0, "credit": 0.0},
            {"account_id": str(rev_acc.id), "name": "Credit leg", "debit": 0.0, "credit": 250.0},
        ],
    }
    r2 = client.post("/api/accounting/moves", json=p2)
    assert r2.status_code == 201, r2.text
    m2 = r2.json()
    assert m2["state"] == "posted"
    assert m2["sequence_number"] == m1["sequence_number"] + 1


def test_immutable_posted_move_protection(db_session: Session, financial_fixtures):
    company = financial_fixtures["company"]
    posted_move = db_session.scalar(
        select(AccountMove).where(
            AccountMove.company_id == company.id,
            AccountMove.state == "posted",
        )
    )
    assert posted_move is not None

    # Attempt to update ref directly on posted move in database
    try:
        posted_move.ref = "MUTATION_ATTEMPT"
        with pytest.raises(IntegrityError) as exc_info:
            db_session.commit()
        assert "Posted journal entries are immutable" in str(exc_info.value)
    finally:
        db_session.rollback()

    # Attempt to delete a line from posted move
    try:
        posted_move = db_session.scalar(
            select(AccountMove).where(
                AccountMove.company_id == company.id,
                AccountMove.state == "posted",
            )
        )
        line = posted_move.lines[0]
        db_session.delete(line)
        with pytest.raises(IntegrityError) as exc_info:
            db_session.commit()
        assert "Posted journal entries are immutable" in str(exc_info.value)
    finally:
        db_session.rollback()


def test_customer_invoice_lifecycle_and_gl_issuance(client: TestClient, financial_fixtures):
    fixtures = financial_fixtures
    partner = fixtures["partner"]

    # 1. Create Draft Customer Invoice
    inv_payload = {
        "partner_id": str(partner.id),
        "customer_name": partner.name,
        "customer_tax_number": partner.tax_number,
        "subtotal": 1000.0,
        "vat_amount": 150.0,
        "grand_total": 1150.0,
    }
    r_create = client.post("/api/customer-invoices", json=inv_payload)
    assert r_create.status_code == 201, r_create.text
    inv = r_create.json()
    inv_id = inv["id"]
    assert inv["status"] == "Draft"
    assert inv["invoice_number"].startswith("INV/")

    # 2. Update Draft Invoice
    update_payload = {
        "subtotal": 2000.0,
        "vat_amount": 300.0,
        "grand_total": 2300.0,
    }
    r_update = client.patch(f"/api/customer-invoices/{inv_id}", json=update_payload)
    assert r_update.status_code == 200, r_update.text
    assert float(r_update.json()["grand_total"]) == 2300.0

    # 3. Approve Invoice
    r_app = client.post(f"/api/customer-invoices/{inv_id}/approve")
    assert r_app.status_code == 200, r_app.text
    assert r_app.json()["status"] == "Approved"

    # 4. Modifying approved invoice should be blocked
    r_mod_blocked = client.patch(f"/api/customer-invoices/{inv_id}", json={"customer_name": "Illegal Change"})
    assert r_mod_blocked.status_code == 409

    # 5. Issue Invoice -> Triggers GL Move generation
    r_issue = client.post(f"/api/customer-invoices/{inv_id}/issue")
    assert r_issue.status_code == 200, r_issue.text
    issued_inv = r_issue.json()
    assert issued_inv["status"] == "Issued"
    assert issued_inv["move_id"] is not None

    # 6. Verify GL Move exists, is posted, and is balanced
    move_id = issued_inv["move_id"]
    r_move = client.get(f"/api/accounting/moves/{move_id}")
    assert r_move.status_code == 200, r_move.text
    move_data = r_move.json()
    assert move_data["state"] == "posted"

    total_debit = sum(Decimal(str(line["debit"])) for line in move_data["lines"])
    total_credit = sum(Decimal(str(line["credit"])) for line in move_data["lines"])
    assert total_debit == total_credit == Decimal("2300.0")
