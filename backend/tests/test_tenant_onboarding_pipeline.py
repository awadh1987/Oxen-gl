# File: backend/tests/test_tenant_onboarding_pipeline.py
import uuid
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app  # Master FastAPI core instance
from backend.app.database import SessionLocal
from backend.app.domains.planning.models import ResCompany
from backend.app.domains.finance.models import AccountChart
from backend.models import ResUser, AccountAccount, AccountJournal, FiscalYear, StockLocation

client = TestClient(app)  # Virtualized browser test harness client

def test_end_to_end_tenant_onboarding_seeds_5_deep_ledger():
    """
    INTEGRATION AUDIT: Assures that submitting an enterprise onboarding payload 
    generates the tenant row, flags unique domain indices, and spawns a fully formed,
    linked 5-depth hierarchical Chart of Accounts list.
    """
    # 1. Establish unique test variables to avoid index collision conflicts
    random_suffix = uuid.uuid4().hex[:6]
    test_slug = f"quantum-test-{random_suffix}"
    onboarding_payload = {
        "company_name_ar": f"شركة كوانتوم اللوجستية التجريبية {random_suffix}",
        "company_name_en": f"Quantum Logistics Test Group {random_suffix}",
        "domain_slug": test_slug,
        "admin_email": f"sre-audit-{random_suffix}@quantum-test.com"
    }

    # 2. Fire live HTTP POST mutation request into the onboarding channel
    response = client.post("/api/v1/auth/register-tenant", json=onboarding_payload)
    
    # 3. Assert HTTP status code and baseline endpoint schema resolution
    assert response.status_code == 201, f"Onboarding endpoint rejected payload: {response.text}"
    
    response_data = response.json()
    assert response_data["status"] == "PROVISIONED"
    assert response_data["workspace_slug"] == test_slug
    
    generated_tenant_id = response_data["tenant_id"]
    assert generated_tenant_id is not None

    # 4. Open a distinct database transaction context loop to check database rows
    db = SessionLocal()
    try:
        # Verify the company record was committed to disk
        company_record = db.query(ResCompany).filter(ResCompany.id == generated_tenant_id).first()
        assert company_record is not None
        assert company_record.domain_slug == test_slug

        # Pull all seeded Chart of Account records allocated to this specific tenant
        tenant_ledger_accounts = db.query(AccountChart).filter(
            AccountChart.tenant_id == generated_tenant_id
        ).all()
        
        # Confirm that exactly 5 hierarchical entries were provisioned
        assert len(tenant_ledger_accounts) == 5, f"Expected 5 ledger accounts, found {len(tenant_ledger_accounts)}"

        # 5. Extract and trace the hierarchical nodes from Level 1 down to Level 5
        # Level 1 Root Node
        level_1 = next(a for a in tenant_ledger_accounts if a.account_code == "10000")
        assert level_1.parent_id is None
        assert level_1.account_type == "ASSET"

        # Level 2 Control Node
        level_2 = next(a for a in tenant_ledger_accounts if a.account_code == "11000")
        assert level_2.parent_id == level_1.id

        # Level 3 Subsidiary Node
        level_3 = next(a for a in tenant_ledger_accounts if a.account_code == "11100")
        assert level_3.parent_id == level_2.id

        # Level 4 Ledger Account Node
        level_4 = next(a for a in tenant_ledger_accounts if a.account_code == "11110")
        assert level_4.parent_id == level_3.id

        # Level 5 Child Operating Micro-Account Node
        level_5 = next(a for a in tenant_ledger_accounts if a.account_code == "11110-01")
        assert level_5.parent_id == level_4.id
        
        # Verify GL accounts, journals, fiscal year, and stock location
        gl_accounts = db.query(AccountAccount).filter(AccountAccount.company_id == generated_tenant_id).all()
        assert len(gl_accounts) >= 9, f"Expected at least 9 GL accounts, found {len(gl_accounts)}"

        journals = db.query(AccountJournal).filter(AccountJournal.company_id == generated_tenant_id).all()
        assert len(journals) >= 5, f"Expected at least 5 journals, found {len(journals)}"

        fiscal_years = db.query(FiscalYear).filter(FiscalYear.company_id == generated_tenant_id).all()
        assert len(fiscal_years) >= 1, f"Expected active fiscal year, found {len(fiscal_years)}"

        locations = db.query(StockLocation).filter(StockLocation.company_id == generated_tenant_id).all()
        assert len(locations) >= 1, f"Expected internal warehouse location, found {len(locations)}"

        print(f"\n✅ SUCCESS: E2E Tenant Provisioning validated. Hierarchy Depth: 5 Levels + Defaults linked under Tenant ID: {generated_tenant_id}")

    finally:
        # Clean teardown pass: remove mock records to keep staging tables clean
        db.query(AccountChart).filter(AccountChart.tenant_id == generated_tenant_id).delete()
        db.query(StockLocation).filter(StockLocation.company_id == generated_tenant_id).delete()
        db.query(AccountJournal).filter(AccountJournal.company_id == generated_tenant_id).delete()
        db.query(AccountAccount).filter(AccountAccount.company_id == generated_tenant_id).delete()
        db.query(FiscalYear).filter(FiscalYear.company_id == generated_tenant_id).delete()
        db.query(ResUser).filter(ResUser.company_id == generated_tenant_id).delete()
        db.query(ResCompany).filter(ResCompany.id == generated_tenant_id).delete()
        db.commit()
        db.close()
