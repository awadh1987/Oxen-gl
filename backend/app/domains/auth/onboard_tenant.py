# File: backend/app/domains/auth/onboard_tenant.py
import uuid
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from backend.app.database import SessionLocal
from backend.app.domains.planning.models import ResCompany
from backend.app.domains.finance.models import AccountChart

router = APIRouter(prefix="/api/v1/auth", tags=["Tenant Provisioning & Onboarding"])

class TenantRegistrationPayload(BaseModel):
    company_name_ar: str = Field(..., min_length=3, max_length=150)
    company_name_en: str = Field(..., min_length=3, max_length=150)
    domain_slug: str = Field(..., min_length=3, max_length=50)
    admin_email: str = Field(..., min_length=5, max_length=100)

def seed_default_chart_of_accounts(db: Session, tenant_id: str, slug: str = "tenant"):
    """
    Automated Seeding Hook: Attaches a standardized 5-deep nested corporate 
    Chart of Accounts skeleton framework to the newly provisioned tenant slot.
    """
    tenant_uuid = uuid.UUID(str(tenant_id)) if isinstance(tenant_id, str) else tenant_id

    # Level 1: Root Node
    root_asset = AccountChart(
        id=uuid.uuid4(),
        tenant_id=tenant_uuid,
        company_id=tenant_uuid,
        code="10000",
        name="Assets (Root)",
        path="1",
        account_type="ASSET",
    )
    db.add(root_asset)
    db.flush()
    
    # Level 2: Control Group
    current_asset = AccountChart(
        id=uuid.uuid4(),
        tenant_id=tenant_uuid,
        company_id=tenant_uuid,
        code="11000",
        name="Current Assets",
        path="1.1",
        account_type="ASSET",
        parent_id=root_asset.id,
    )
    db.add(current_asset)
    db.flush()
    
    # Level 3: Subsidiary Class
    cash_banks = AccountChart(
        id=uuid.uuid4(),
        tenant_id=tenant_uuid,
        company_id=tenant_uuid,
        code="11100",
        name="Cash & Bank Accounts",
        path="1.1.1",
        account_type="ASSET",
        parent_id=current_asset.id,
    )
    db.add(cash_banks)
    db.flush()
    
    # Level 4: Ledger Account
    sub_cash = AccountChart(
        id=uuid.uuid4(),
        tenant_id=tenant_uuid,
        company_id=tenant_uuid,
        code="11110",
        name="Sub-Cash Vault Ledgers",
        path="1.1.1.1",
        account_type="ASSET",
        parent_id=cash_banks.id,
    )
    db.add(sub_cash)
    db.flush()
    
    # Level 5: Child Operating Micro-Account
    operating_cash = AccountChart(
        id=uuid.uuid4(),
        tenant_id=tenant_uuid,
        company_id=tenant_uuid,
        code="11110-01",
        name="Primary Corporate Treasury Vault",
        path="1.1.1.1.1",
        account_type="ASSET",
        parent_id=sub_cash.id,
    )
    db.add(operating_cash)

@router.post("/register-tenant", status_code=status.HTTP_201_CREATED)
async def register_new_enterprise_tenant(payload: TenantRegistrationPayload):
    """
    Synchronized multi-tenant tenant onboarding pipeline.
    """
    db = SessionLocal()
    slug_cleaned = payload.domain_slug.lower().strip()
    
    try:
        # 1. Enforce safety validation check against the newly indexed slug field
        existing_tenant = db.query(ResCompany).filter(
            (ResCompany.domain_slug == slug_cleaned) | (ResCompany.slug == slug_cleaned)
        ).first()
        if existing_tenant:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Workspace domain slug is already allocated to another enterprise account."
            )
            
        # 2. Allocate core enterprise company registry entry
        company_uuid = uuid.uuid4()
        new_company = ResCompany(
            id=company_uuid,
            name=payload.company_name_en or payload.company_name_ar,
            slug=slug_cleaned,
            currency="SAR",
        )
        new_company.domain_slug = slug_cleaned
        if hasattr(new_company, 'name_ar'):
            setattr(new_company, 'name_ar', payload.company_name_ar)
        if hasattr(new_company, 'name_en'):
            setattr(new_company, 'name_en', payload.company_name_en)
        
        db.add(new_company)
        db.flush()  # Extract structural ID parameter cleanly
        
        # 3. Fire the template seed routine to auto-inject the 5-depth accounting array
        seed_default_chart_of_accounts(db, tenant_id=str(new_company.id), slug=slug_cleaned)
        
        db.commit()
        return {
            "status": "PROVISIONED",
            "message": "Enterprise workspace container generated with default ledger templates.",
            "workspace_slug": slug_cleaned,
            "tenant_id": str(new_company.id)
        }
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Onboarding fault: {str(e)}")
    finally:
        db.close()
