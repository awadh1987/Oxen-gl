import json
import uuid
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
    AIGovernanceLog,
    AIModelConfig,
    ResCompany,
    ResUser,
)
from backend.services.ai_governance import ai_governance_engine


@pytest.fixture(scope="module")
def db_session():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="module")
def ai_gov_fixtures(db_session: Session):
    # 1. Tenant Company Alpha
    company_a = db_session.scalar(select(ResCompany).where(ResCompany.slug == "p9-ai-corp-alpha"))
    if not company_a:
        company_a = ResCompany(
            name="AI Governance Corp Alpha",
            slug="p9-ai-corp-alpha",
            currency="SAR",
            commercial_registration="1010444001",
            tax_id="300044400100003",
            subscription_tier="ENTERPRISE",
        )
        db_session.add(company_a)
        db_session.commit()
        db_session.refresh(company_a)

    # 2. Tenant Admin Alpha
    admin_a = db_session.scalar(select(ResUser).where(ResUser.email == "admin@ai-corp-alpha.com"))
    if not admin_a:
        admin_a = ResUser(
            firebase_uid="uid-ai-admin-alpha",
            email="admin@ai-corp-alpha.com",
            full_name="Alpha AI Admin",
            company_id=company_a.id,
            role="Admin",
            is_active=True,
        )
        db_session.add(admin_a)
        db_session.commit()
        db_session.refresh(admin_a)

    # 3. Regular Staff Alpha (unauthorized for HITL approval)
    staff_a = db_session.scalar(select(ResUser).where(ResUser.email == "staff@ai-corp-alpha.com"))
    if not staff_a:
        staff_a = ResUser(
            firebase_uid="uid-ai-staff-alpha",
            email="staff@ai-corp-alpha.com",
            full_name="Alpha AI Staff",
            company_id=company_a.id,
            role="Data_Entry",
            is_active=True,
        )
        db_session.add(staff_a)
        db_session.commit()
        db_session.refresh(staff_a)

    # 4. Tenant Company Beta (Isolation Target)
    company_b = db_session.scalar(select(ResCompany).where(ResCompany.slug == "p9-ai-corp-beta"))
    if not company_b:
        company_b = ResCompany(
            name="AI Governance Corp Beta",
            slug="p9-ai-corp-beta",
            currency="SAR",
            commercial_registration="1010444002",
            tax_id="300044400200003",
            subscription_tier="ENTERPRISE",
        )
        db_session.add(company_b)
        db_session.commit()
        db_session.refresh(company_b)

    # 5. Accounts for Alpha
    acc_cash = db_session.scalar(
        select(AccountAccount).where(
            AccountAccount.company_id == company_a.id,
            AccountAccount.code == "101100"
        )
    )
    if not acc_cash:
        acc_cash = AccountAccount(
            company_id=company_a.id,
            code="101100",
            name="Cash Account Alpha",
            internal_type="asset",
            currency="SAR",
        )
        db_session.add(acc_cash)

    acc_expense = db_session.scalar(
        select(AccountAccount).where(
            AccountAccount.company_id == company_a.id,
            AccountAccount.code == "500100"
        )
    )
    if not acc_expense:
        acc_expense = AccountAccount(
            company_id=company_a.id,
            code="500100",
            name="Fuel Expense Alpha",
            internal_type="expense",
            currency="SAR",
        )
        db_session.add(acc_expense)

    # 6. Journal for Alpha
    journal = db_session.scalar(
        select(AccountJournal).where(
            AccountJournal.company_id == company_a.id,
            AccountJournal.code == "MISC"
        )
    )
    if not journal:
        journal = AccountJournal(
            company_id=company_a.id,
            code="MISC",
            name="Miscellaneous Operations Journal",
            journal_type="general",
            sequence_prefix="MISC-A",
        )
        db_session.add(journal)

    db_session.commit()
    db_session.refresh(company_a)
    db_session.refresh(admin_a)
    db_session.refresh(staff_a)
    db_session.refresh(company_b)
    db_session.refresh(acc_cash)
    db_session.refresh(acc_expense)
    db_session.refresh(journal)

    return {
        "company_a": company_a,
        "admin_a": admin_a,
        "staff_a": staff_a,
        "company_b": company_b,
        "acc_cash": acc_cash,
        "acc_expense": acc_expense,
        "journal": journal,
    }


def test_low_confidence_proposal_blocked(db_session: Session, ai_gov_fixtures: dict):
    company_a = ai_gov_fixtures["company_a"]
    acc_cash = ai_gov_fixtures["acc_cash"]
    acc_expense = ai_gov_fixtures["acc_expense"]

    proposal = {
        "lines": [
            {"account_id": str(acc_expense.id), "debit": 500, "credit": 0},
            {"account_id": str(acc_cash.id), "debit": 0, "credit": 500},
        ]
    }

    # Low confidence 0.45 (< 0.60 safety threshold)
    log = ai_governance_engine.validate_proposal(
        company_id=company_a.id,
        agent_name="financial_assistant_v1",
        action_type="POST_ACCOUNT_MOVE",
        proposal_payload=proposal,
        confidence_score=Decimal("0.45"),
        prompt="Record estimated fuel expense for driver 4",
        db=db_session,
    )

    assert log.safety_validation_status == "BLOCKED"
    assert log.risk_level == "CRITICAL"
    assert log.execution_status == "BLOCKED"
    assert "below minimum safety threshold" in (log.validation_errors or "")

    # Attempting to approve or execute a blocked proposal must fail
    with pytest.raises(ValueError, match="Blocked proposals cannot be approved"):
        ai_governance_engine.approve_hitl_proposal(
            log_id=log.id,
            approver_user=ai_gov_fixtures["admin_a"],
            approval_token="dummy-token",
            db=db_session,
        )


def test_deterministic_validation_unbalanced_gl_rejected(db_session: Session, ai_gov_fixtures: dict):
    company_a = ai_gov_fixtures["company_a"]
    acc_cash = ai_gov_fixtures["acc_cash"]
    acc_expense = ai_gov_fixtures["acc_expense"]

    # Unbalanced: Debit 800 != Credit 500 (BR-001 violation)
    proposal = {
        "lines": [
            {"account_id": str(acc_expense.id), "debit": 800, "credit": 0},
            {"account_id": str(acc_cash.id), "debit": 0, "credit": 500},
        ]
    }

    log = ai_governance_engine.validate_proposal(
        company_id=company_a.id,
        agent_name="gl_automation_agent",
        action_type="POST_ACCOUNT_MOVE",
        proposal_payload=proposal,
        confidence_score=Decimal("0.95"),
        prompt="Adjust fuel cost discrepancy",
        db=db_session,
    )

    assert log.safety_validation_status == "BLOCKED"
    assert log.risk_level == "HIGH"
    assert log.execution_status == "BLOCKED"
    assert "Double-entry balance violation" in (log.validation_errors or "")


def test_high_value_proposal_requires_hitl_token(db_session: Session, ai_gov_fixtures: dict):
    company_a = ai_gov_fixtures["company_a"]
    acc_cash = ai_gov_fixtures["acc_cash"]
    acc_expense = ai_gov_fixtures["acc_expense"]
    journal = ai_gov_fixtures["journal"]

    # High value 25,000 SAR (> 10,000 SAR threshold)
    proposal = {
        "journal_id": str(journal.id),
        "name": f"AI-TEST-{uuid.uuid4().hex[:6].upper()}",
        "lines": [
            {"account_id": str(acc_expense.id), "debit": 25000, "credit": 0},
            {"account_id": str(acc_cash.id), "debit": 0, "credit": 25000},
        ]
    }

    log = ai_governance_engine.validate_proposal(
        company_id=company_a.id,
        agent_name="gl_automation_agent",
        action_type="POST_ACCOUNT_MOVE",
        proposal_payload=proposal,
        confidence_score=Decimal("0.98"),
        prompt="Post monthly major overhaul invoice",
        db=db_session,
    )

    assert log.safety_validation_status == "PENDING_APPROVAL"
    assert log.risk_level == "HIGH"
    assert log.hitl_required is True
    assert log.hitl_approved is False
    assert log.hitl_approval_token is not None

    # Cannot execute before HITL approval
    with pytest.raises(ValueError, match="Current status is 'PROPOSED', expected 'APPROVED'"):
        ai_governance_engine.execute_approved_proposal(
            log_id=log.id,
            executing_user=ai_gov_fixtures["admin_a"],
            db=db_session,
        )


def test_hitl_approval_token_verification_and_oltp_execution(db_session: Session, ai_gov_fixtures: dict):
    company_a = ai_gov_fixtures["company_a"]
    admin_a = ai_gov_fixtures["admin_a"]
    staff_a = ai_gov_fixtures["staff_a"]
    acc_cash = ai_gov_fixtures["acc_cash"]
    acc_expense = ai_gov_fixtures["acc_expense"]
    journal = ai_gov_fixtures["journal"]

    proposal = {
        "journal_id": str(journal.id),
        "name": f"AI-EXEC-{uuid.uuid4().hex[:6].upper()}",
        "lines": [
            {"account_id": str(acc_expense.id), "debit": 15000, "credit": 0, "name": "AI Approved Fleet Repair"},
            {"account_id": str(acc_cash.id), "debit": 0, "credit": 15000, "name": "Cash Disbursement"},
        ]
    }

    log = ai_governance_engine.validate_proposal(
        company_id=company_a.id,
        agent_name="fleet_expense_agent",
        action_type="POST_ACCOUNT_MOVE",
        proposal_payload=proposal,
        confidence_score=Decimal("0.92"),
        db=db_session,
    )

    # 1. Tampered token fails approval
    with pytest.raises(ValueError, match="Invalid or tampered HITL approval token"):
        ai_governance_engine.approve_hitl_proposal(
            log_id=log.id,
            approver_user=admin_a,
            approval_token="forged-or-tampered-approval-token-xyz",
            db=db_session,
        )

    # 2. Unauthorized role fails approval
    with pytest.raises(PermissionError, match="User does not have sufficient privileges"):
        ai_governance_engine.approve_hitl_proposal(
            log_id=log.id,
            approver_user=staff_a,
            approval_token=log.hitl_approval_token,
            db=db_session,
        )

    # 3. Valid admin approval succeeds
    approved_log = ai_governance_engine.approve_hitl_proposal(
        log_id=log.id,
        approver_user=admin_a,
        approval_token=log.hitl_approval_token,
        db=db_session,
    )
    assert approved_log.hitl_approved is True
    assert approved_log.hitl_approved_by == admin_a.id
    assert approved_log.execution_status == "APPROVED"

    # 4. Execute approved proposal into OLTP database
    exec_result = ai_governance_engine.execute_approved_proposal(
        log_id=log.id,
        executing_user=admin_a,
        db=db_session,
    )
    assert exec_result["entity"] == "AccountMove"
    move_id = uuid.UUID(exec_result["id"])

    # Verify OLTP AccountMove was committed
    oltp_move = db_session.get(AccountMove, move_id)
    assert oltp_move is not None
    assert oltp_move.company_id == company_a.id
    assert oltp_move.state == "posted"
    assert len(oltp_move.lines) == 2


def test_tenant_isolation_in_ai_governance(db_session: Session, ai_gov_fixtures: dict):
    company_b = ai_gov_fixtures["company_b"]
    admin_a = ai_gov_fixtures["admin_a"]

    # Create a proposal under Company B
    log_b = ai_governance_engine.validate_proposal(
        company_id=company_b.id,
        agent_name="tenant_b_agent",
        action_type="GENERIC_RECOMMENDATION",
        proposal_payload={"recommendation": "Optimize route 12"},
        confidence_score=Decimal("0.70"),
        db=db_session,
    )

    # Admin from Company A cannot approve Company B's proposal
    with pytest.raises(PermissionError, match="Cross-tenant HITL approval is strictly forbidden"):
        ai_governance_engine.approve_hitl_proposal(
            log_id=log_b.id,
            approver_user=admin_a,
            approval_token=log_b.hitl_approval_token or "",
            db=db_session,
        )


def test_ai_governance_rest_endpoints(ai_gov_fixtures: dict):
    company_a = ai_gov_fixtures["company_a"]
    admin_a = ai_gov_fixtures["admin_a"]
    acc_cash = ai_gov_fixtures["acc_cash"]
    acc_expense = ai_gov_fixtures["acc_expense"]
    journal = ai_gov_fixtures["journal"]

    client = TestClient(app)
    app.dependency_overrides[get_authenticated_user] = lambda: admin_a
    app.dependency_overrides[get_active_company_id] = lambda: company_a.id

    try:
        # 1. Register AI Model Config
        model_name = f"gemini-test-{uuid.uuid4().hex[:6]}"
        res_model = client.post(
            "/api/ai/models/config",
            headers={"X-Company-ID": str(company_a.id)},
            json={
                "model_name": model_name,
                "provider": "google",
                "endpoint_url": "https://generativelanguage.googleapis.com/v1beta",
                "api_key": "test-gemini-key",
                "rate_limit_rpm": 120,
                "rate_limit_tpm": 200000,
                "permission_tier": "ASSISTANT",
                "max_risk_tier_allowed": "HIGH",
            },
        )
        assert res_model.status_code == 200
        model_data = res_model.json()
        assert model_data["model_name"] == model_name
        assert model_data["rate_limit_rpm"] == 120

        # 2. List Model Configs
        res_list = client.get(
            "/api/ai/models/config",
            headers={"X-Company-ID": str(company_a.id)},
        )
        assert res_list.status_code == 200
        assert any(c["model_name"] == model_name for c in res_list.json())

        # 3. Validate High-Value Proposal via API
        val_res = client.post(
            "/api/ai/governance/proposals/validate",
            headers={"X-Company-ID": str(company_a.id)},
            json={
                "agent_name": "gl_rest_agent",
                "action_type": "POST_ACCOUNT_MOVE",
                "confidence_score": "0.95",
                "proposal_payload": {
                    "journal_id": str(journal.id),
                    "name": f"API-MOV-{uuid.uuid4().hex[:6]}",
                    "lines": [
                        {"account_id": str(acc_expense.id), "debit": 12000, "credit": 0},
                        {"account_id": str(acc_cash.id), "debit": 0, "credit": 12000},
                    ],
                },
            },
        )
        assert val_res.status_code == 200
        val_data = val_res.json()
        assert val_data["hitl_required"] is True
        log_id = val_data["log_id"]
        approval_token = val_data["approval_token"]
        assert approval_token is not None

        # 4. Approve via API
        app_res = client.post(
            f"/api/ai/governance/proposals/{log_id}/approve",
            headers={"X-Company-ID": str(company_a.id)},
            json={"approval_token": approval_token},
        )
        assert app_res.status_code == 200
        assert app_res.json()["status"] == "APPROVED"

        # 5. Execute via API
        exec_res = client.post(
            f"/api/ai/governance/proposals/{log_id}/execute",
            headers={"X-Company-ID": str(company_a.id)},
            json={"force_sync": True},
        )
        assert exec_res.status_code == 200
        assert exec_res.json()["execution_status"] == "EXECUTED"

        # 6. Query Logs via API
        logs_res = client.get(
            "/api/ai/governance/logs",
            headers={"X-Company-ID": str(company_a.id)},
        )
        assert logs_res.status_code == 200
        logs = logs_res.json()
        assert any(l["id"] == log_id for l in logs)

    finally:
        app.dependency_overrides.clear()
