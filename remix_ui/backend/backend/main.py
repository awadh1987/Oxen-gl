import os
import secrets
import uuid
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timedelta, timezone
from typing import List, Literal

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, ConfigDict, Field, UUID4
from sqlalchemy import or_
from sqlalchemy.orm import Session

from .accounting_hierarchy import AccountingHierarchyError, get_account_rollup, validate_journal_posting_lines
from .audit_context import create_structured_audit_log, get_audit_context
from .auth import ACCESS_TOKEN_EXPIRE_MINUTES, create_access_token, decode_access_token, decode_access_token_payload, hash_password, verify_password
from .database import SessionLocal, get_db, init_db
from .db_optimizer import get_query_optimization_metrics
from .fiscal_closing import get_fiscal_branch_balances
from .financial_reports import build_financial_report_pdf, build_public_invoice_pdf, compile_financial_report, get_branch_balance, get_cost_center_spending, get_revenue_expense_by_month
from .inventory_fifo import consume_inventory_fifo
from .models import AuditLog, ChartOfAccount, CostCenter, Crusher, Customer, EmployeeContract, FiscalPeriod, FiscalYearLockedError, FixedAsset, InventoryLayer, Invoice, JournalEntry, JournalLine, Operation, PlatformAuditLog, PublicInvoiceToken, Role, TenantLicense, Transporter, User, UserRegistration, Voucher
from .settings import get_system_settings, get_system_visual_identity
from .tax_engine import calculate_vat
from .waf_log_parser import get_blocked_request_threats

init_db()

app = FastAPI(
    title=get_system_settings().system_name,
    version="1.0.0",
    description="Enterprise operations, financial management, and accounting API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://6grq4drw-5173.inc1.devtunnels.ms",
        "https://6grq4drw-3001.inc1.devtunnels.ms",
    ],
    allow_origin_regex=r"https://.*\.devtunnels\.ms",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LICENSE_EXEMPT_PATHS = {"/", "/api/health", "/api/system/settings", "/token", "/api/auth/verify", "/api/auth/logout", "/api/saas/issue-license"}
ENTERPRISE_ONLY_PATHS = {"/api/finance/bank-reconciliation/multi-currency", "/api/operations/intercompany-trade"}
SUBSCRIPTION_SUSPENDED_MESSAGE = "Subscription Suspended: Plan renewal or update required."


@app.middleware("http")
async def enforce_tenant_subscription(request: Request, call_next):
    path = request.url.path
    if not path.startswith("/api/") or path in LICENSE_EXEMPT_PATHS or path.startswith("/docs") or path.startswith("/openapi"):
        return await call_next(request)

    db = SessionLocal()
    try:
        # Bootstrap remains available until the first tenant is provisioned.
        if db.query(TenantLicense).count() == 0:
            return await call_next(request)

        license_key = request.headers.get("X-Tenant-License-Key", "").strip()
        tenant_id_header = request.headers.get("X-Tenant-Id", "").strip()
        license_record = None

        if license_key:
            license_record = db.query(TenantLicense).filter_by(license_key=license_key).first()

        if not license_record and tenant_id_header:
            license_record = db.query(TenantLicense).filter_by(tenant_id=tenant_id_header).first()

        # If still not found, attempt to extract tenant claim from Bearer token
        if not license_record:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token_str = auth_header.split(" ", 1)[1]
                try:
                    payload = decode_access_token_payload(token_str)
                    token_tenant = payload.get("tenant_id")
                    if token_tenant:
                        license_record = db.query(TenantLicense).filter_by(tenant_id=token_tenant).first()
                except Exception:
                    pass

        # Fallback to default tenant for backwards compatibility with active sessions
        if not license_record:
            license_record = db.query(TenantLicense).filter_by(tenant_id="tenant-default-001").first() or db.query(TenantLicense).first()

        if license_record:
            expires_at = license_record.expires_at.replace(tzinfo=timezone.utc) if license_record.expires_at.tzinfo is None else license_record.expires_at
            if not license_record.is_active or expires_at is None or datetime.now(timezone.utc) >= expires_at:
                return JSONResponse(status_code=status.HTTP_402_PAYMENT_REQUIRED, content={"detail": SUBSCRIPTION_SUSPENDED_MESSAGE})
            if path in ENTERPRISE_ONLY_PATHS and license_record.subscription_tier != "ENTERPRISE":
                return JSONResponse(status_code=status.HTTP_403_FORBIDDEN, content={"detail": "Enterprise subscription required for this feature."})
            if path == "/api/operations/add-trip":
                current_cost_centers = db.query(CostCenter).filter_by(tenant_id=license_record.tenant_id).count()
                if current_cost_centers > license_record.max_allowed_cost_centers:
                    return JSONResponse(status_code=status.HTTP_403_FORBIDDEN, content={"detail": "Cost center limit exceeded. Upgrade your subscription plan."})

            request.state.tenant_license = license_record
            request.state.current_tenant_id = license_record.tenant_id

        return await call_next(request)
    finally:
        db.close()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)
SESSION_COOKIE_NAME = os.getenv("SESSION_COOKIE_NAME", "oxengl_session")
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "true").strip().lower() not in {"0", "false", "no"}


@app.exception_handler(FiscalYearLockedError)
async def fiscal_year_locked_exception_handler(_: Request, exc: FiscalYearLockedError):
    return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"detail": str(exc)})


class OperationCreate(BaseModel):
    model_config = ConfigDict(extra="allow")

    transporter_id: str
    route: str
    amount: float
    client_name: str


class OperationResponse(OperationCreate):
    id: UUID4
    invoice_id: UUID4
    profit: float
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str
    tenant_id: str | None = None
    role: str | None = None
    tenant_role: str | None = None
    is_platform_superadmin: bool = False


class AuthUser(BaseModel):
    username: str
    email: str
    full_name: str
    role: str
    tenant_id: str = "tenant-default-001"
    tenant_role: str = "Admin"
    is_platform_superadmin: bool = False


class AuthVerifyRequest(BaseModel):
    email: str
    password: str


class UserRegistrationCreate(BaseModel):
    full_name: str
    username: str
    email: str
    password: str
    phone: str | None = None
    organization: str | None = None
    requested_role: str = "Guest"
    notes: str | None = None


class UserRegistrationReview(BaseModel):
    assigned_role: str | None = None
    notes: str | None = None


class TenantLicenseIssue(BaseModel):
    company_name: str = Field(min_length=1, max_length=255)
    subscription_tier: Literal["BASIC", "PROFESSIONAL", "ENTERPRISE"] = "BASIC"
    max_allowed_cost_centers: int | None = Field(default=None, gt=0)
    expires_in_days: int = Field(default=30, gt=0, le=3650)
    ui_theme_mode: Literal["LIGHT", "DARK", "CUSTOM"] = "LIGHT"
    ui_primary_color: str = Field(default="#1E3A8A", min_length=4, max_length=20)
    ui_secondary_color: str = Field(default="#10B981", min_length=4, max_length=20)
    ui_font_family: str = Field(default="Inter, sans-serif", min_length=1, max_length=255)
    ui_logo_url: str | None = Field(default=None, max_length=2048)


class CostCenterCreate(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=255)
    parent_cc: str | None = Field(default=None, max_length=50)
    is_leaf: bool = True


class CustomerCreate(BaseModel):
    customer_name: str
    customer_name_en: str | None = None
    tax_number: str | None = None
    cr_number: str | None = None
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    opening_balance: float = 0.0
    credit_limit: float = 0.0


class TransporterCreate(BaseModel):
    transporter_name: str
    transporter_name_en: str | None = None
    driver_name: str | None = None
    phone: str | None = None
    truck_details: str | None = None
    default_truck_no: str | None = None
    capacity_tons: float = 0.0
    rate_per_ton: float = 0.0


class CrusherCreate(BaseModel):
    crusher_name: str
    crusher_name_en: str | None = None
    location: str | None = None
    bank_details: str | None = None
    account_number: str | None = None
    tax_number: str | None = None
    material_produced: str | None = None
    opening_balance: float = 0.0
    contact_person: str | None = None
    phone: str | None = None


class InvoiceCreate(BaseModel):
    invoice_number: str
    customer_id: str
    customer_name: str
    subtotal: float = 0.0
    vat_amount: float = 0.0
    grand_total: float = 0.0
    status: str = "Draft"
    due_date: datetime | None = None
    cost_center_id: str | None = None


class InvoiceSignRequest(BaseModel):
    electronic_signature_hash: str = Field(min_length=1, max_length=255)


class FixedAssetCreate(BaseModel):
    asset_name: str = Field(min_length=1, max_length=255)
    purchase_cost: Decimal = Field(gt=0)
    residual_value: Decimal = Field(default=Decimal("0"), ge=0)
    useful_life_months: int = Field(gt=0)
    asset_account_code: str = Field(min_length=1, max_length=50)
    expense_account_code: str = Field(min_length=1, max_length=50)
    cost_center_id: str = Field(min_length=1, max_length=50)


class EmployeeContractCreate(BaseModel):
    employee_name: str = Field(min_length=1, max_length=255)
    base_salary: Decimal = Field(gt=0)
    allowances: Decimal = Field(default=Decimal("0"), ge=0)
    deductions: Decimal = Field(default=Decimal("0"), ge=0)
    cost_center_id: str = Field(min_length=1, max_length=50)


class InventoryLayerCreate(BaseModel):
    item_sku: str = Field(min_length=1, max_length=120)
    original_quantity: int = Field(gt=0)
    unit_cost: Decimal = Field(gt=0)
    purchase_date: datetime | None = None


class BankStatementRow(BaseModel):
    bank_date: str = Field(min_length=1)
    bank_reference: str = Field(min_length=1)
    bank_amount: Decimal = Field(gt=0)
    bank_currency: str = Field(default="USD", min_length=3, max_length=3)


class BankReconciliationRequest(BaseModel):
    rows: List[BankStatementRow]


class VoucherCreate(BaseModel):
    voucher_type: str
    voucher_number: str
    beneficiary: str
    amount: float = 0.0
    status: str = "Draft"
    notes: str | None = None

class JournalLineCreate(BaseModel):
    account: str
    debit: float = 0.0
    credit: float = 0.0
    cost_center_id: str | None = None
    description: str | None = None

class JournalEntryCreate(BaseModel):
    entry_number: str
    entry_date: datetime | None = None
    reference_type: str | None = None
    reference_id: str | None = None
    description: str
    status: str = "Draft"
    currency: str = Field(default="USD", min_length=3, max_length=3)
    exchange_rate: float = Field(default=1.0, gt=0)
    lines: List[JournalLineCreate]


class InventorySalesHookCreate(BaseModel):
    trip_id: str = Field(min_length=1)
    item_sku: str = Field(min_length=1)
    quantity: float = Field(gt=0)
    unit_cost_price: float = Field(gt=0)
    unit_sale_price: float = Field(gt=0)
    cost_center_id: str = Field(min_length=1)


class TripWithVatCreate(BaseModel):
    trip_id: str = Field(min_length=1)
    item_sku: str = Field(min_length=1)
    quantity: int = Field(gt=0)
    unit_sale_price: Decimal = Field(gt=0)
    cost_center_id: str = Field(min_length=1)
    transaction_date: datetime | None = None
    currency: str = Field(default="USD", min_length=3, max_length=3)
    exchange_rate: float = Field(default=1.0, gt=0)


class IntercompanyTradeCreate(BaseModel):
    origin_company_id: str = Field(min_length=1)
    target_company_id: str = Field(min_length=1)
    amount: float = Field(gt=0)
    origin_cost_center_id: str = Field(min_length=1)
    target_cost_center_id: str = Field(min_length=1)
    reference_id: str | None = None
    description: str | None = None


class VoucherUpdate(BaseModel):
    beneficiary: str | None = None
    amount: float | None = None
    notes: str | None = None
    status: str | None = None


class JournalEntryUpdate(BaseModel):
    description: str | None = None
    reference_id: str | None = None
    lines: List[JournalLineCreate] | None = None


class WorkflowCreate(BaseModel):
    transporter_id: str
    route: str
    amount: float
    client_name: str
    customer_id: str
    customer_name: str
    invoice_number: str
    voucher_type: str = "Payment"
    beneficiary: str
    voucher_number: str
    description: str | None = None
    debit_account: str = "Transport Expense"
    credit_account: str = "Accounts Payable"


def ensure_seed_users(db: Session) -> None:
    default_email = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@example.local").strip().lower()
    default_password = os.getenv("DEFAULT_ADMIN_PASSWORD", "ChangeMe123!")

    admin_role = db.query(Role).filter_by(name="Admin").first()
    if not admin_role:
        admin_role = Role(id=str(uuid.uuid4()), name="Admin", description="System administrator")
        db.add(admin_role)
        db.commit()
        db.refresh(admin_role)

    default_user = db.query(User).filter_by(email=default_email).first()
    if not default_user:
        default_user = User(
            id=str(uuid.uuid4()),
            username="system_admin",
            email=default_email,
            full_name="System Administrator",
            password_hash=hash_password(default_password),
            role_id=admin_role.id,
            is_active=True,
        )
        db.add(default_user)
        db.commit()

    admin_aliases = [
        email.strip().lower()
        for email in os.getenv("ADMIN_LOGIN_ALIASES", "").split(",")
        if email.strip()
    ]

    for email in admin_aliases:
        if email.lower() == default_email:
            continue
        legacy_user = db.query(User).filter_by(email=email.lower()).first()
        if legacy_user:
            continue
        legacy_user = User(
            id=str(uuid.uuid4()),
            username=email.replace("@", "_").replace(".", "_"),
            email=email.lower(),
            full_name="System Administrator",
            password_hash=hash_password(default_password),
            role_id=admin_role.id,
            is_active=True,
        )
        db.add(legacy_user)
        db.commit()


def resolve_admin_login_credentials() -> dict[str, str]:
    default_email = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@example.local").strip().lower()
    default_password = os.getenv("DEFAULT_ADMIN_PASSWORD", "ChangeMe123!")
    admin_aliases = [email.strip().lower() for email in os.getenv("ADMIN_LOGIN_ALIASES", "").split(",") if email.strip()]
    return {email: default_password for email in [default_email, *admin_aliases]}


def reconcile_overdue_invoices(db: Session) -> int:
    overdue_count = db.query(Invoice).filter(
        Invoice.status == "Issued",
        Invoice.due_date < datetime.now(timezone.utc),
        Invoice.is_deleted.is_(False),
    ).update({Invoice.status: "Overdue"}, synchronize_session=False)
    if overdue_count:
        db.commit()
    return overdue_count


def get_real_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip() or "unknown"
    real_ip = request.headers.get("x-real-ip", "").strip()
    if real_ip:
        return real_ip
    return request.client.host if request.client else "unknown"


def log_platform_auth_event(
    db: Session,
    request: Request,
    *,
    actor_identifier: str,
    event_name: str,
    outcome: str,
    company_id: str | None = None,
    details: str | None = None,
) -> None:
    db.add(PlatformAuditLog(
        id=str(uuid.uuid4()),
        company_id=company_id,
        actor_identifier=actor_identifier,
        event_name=event_name,
        outcome=outcome,
        client_ip=get_real_client_ip(request),
        details=details,
    ))


def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> AuthUser:
    try:
        token = token or request.cookies.get(SESSION_COOKIE_NAME)
        if not token:
            raise ValueError("Missing token")
        payload = decode_access_token_payload(token)
        subject = payload.get("sub")
        token_tenant_id = payload.get("tenant_id")
        token_tenant_role = payload.get("tenant_role")
        token_is_superadmin = payload.get("is_platform_superadmin", False)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc

    user = db.query(User).filter_by(email=subject).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    role_name = user.role.name if user.role else "User"

    # Resolve active tenant from request headers, token claim, or user record
    header_tenant_id = request.headers.get("X-Tenant-Id")
    license_key = request.headers.get("X-Tenant-License-Key")
    resolved_tenant_id = header_tenant_id or token_tenant_id or getattr(user, "tenant_id", None)

    if not resolved_tenant_id and license_key:
        matched_license = db.query(TenantLicense).filter_by(license_key=license_key).first()
        if matched_license:
            resolved_tenant_id = matched_license.tenant_id

    if not resolved_tenant_id:
        resolved_tenant_id = "tenant-default-001"

    # Verify tenant validity
    tenant_record = db.query(TenantLicense).filter_by(tenant_id=resolved_tenant_id).first()
    if not tenant_record and resolved_tenant_id == "tenant-default-001":
        # Fallback to first active tenant if available
        first_tenant = db.query(TenantLicense).first()
        if first_tenant:
            resolved_tenant_id = first_tenant.tenant_id
            tenant_record = first_tenant

    # Determine tenant role & superadmin status
    effective_tenant_role = getattr(user, "tenant_role", None) or token_tenant_role or ("Admin" if role_name in {"Admin", "CEO"} else "Accountant")
    effective_is_superadmin = bool(getattr(user, "is_platform_superadmin", False) or token_is_superadmin or role_name in {"Admin", "CEO"})

    # Bind active tenant into request state for downstream handlers & auditing
    request.state.current_tenant_id = resolved_tenant_id
    if tenant_record:
        request.state.tenant_license = tenant_record

    return AuthUser(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=role_name,
        tenant_id=resolved_tenant_id,
        tenant_role=effective_tenant_role,
        is_platform_superadmin=effective_is_superadmin,
    )


@app.post("/api/user-registrations", status_code=status.HTTP_201_CREATED, tags=["User Registration"])
async def create_user_registration(payload: UserRegistrationCreate, db: Session = Depends(get_db)):
    full_name = payload.full_name.strip()
    username = payload.username.strip().lower()
    email = payload.email.strip().lower()
    requested_role = payload.requested_role.strip() or "Guest"

    if len(full_name) < 2 or len(username) < 3:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Name and username are too short")
    if len(payload.password) < 8:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password must be at least 8 characters")
    if requested_role not in {"Guest", "Data_Entry", "Accountant", "COO"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid requested role")
    if db.query(User).filter((User.email == email) | (User.username == username)).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account already exists with this email or username")
    if db.query(UserRegistration).filter(
        (UserRegistration.email == email) | (UserRegistration.username == username),
        UserRegistration.status == "Pending",
    ).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A registration request is already pending")

    registration = UserRegistration(
        id=str(uuid.uuid4()),
        full_name=full_name,
        username=username,
        email=email,
        password_hash=hash_password(payload.password),
        phone=payload.phone.strip() if payload.phone else None,
        organization=payload.organization.strip() if payload.organization else None,
        requested_role=requested_role,
        notes=payload.notes.strip() if payload.notes else None,
        status="Pending",
    )
    db.add(registration)
    db.commit()
    db.refresh(registration)

    return {
        "id": registration.id,
        "fullName": registration.full_name,
        "username": registration.username,
        "email": registration.email,
        "status": registration.status,
        "requestedRole": registration.requested_role,
        "requestedAt": registration.created_at,
    }


@app.get("/api/user-registrations", tags=["User Registration"])
async def get_user_registrations(current_user: AuthUser = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrators can review registrations")
    registrations = db.query(UserRegistration).order_by(UserRegistration.created_at.desc()).all()
    return [
        {
            "id": registration.id,
            "fullName": registration.full_name,
            "username": registration.username,
            "email": registration.email,
            "phone": registration.phone,
            "organization": registration.organization,
            "requestedRole": registration.requested_role,
            "status": registration.status,
            "notes": registration.notes,
            "reviewedBy": registration.reviewed_by,
            "reviewedAt": registration.reviewed_at,
            "requestedAt": registration.created_at,
        }
        for registration in registrations
    ]


@app.post("/api/user-registrations/{registration_id}/approve", tags=["User Registration"])
async def approve_user_registration(
    registration_id: str,
    payload: UserRegistrationReview,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrators can approve registrations")
    registration = db.query(UserRegistration).filter_by(id=registration_id).first()
    if not registration or registration.status != "Pending":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pending registration not found")
    assigned_role = payload.assigned_role or registration.requested_role
    if assigned_role not in {"Guest", "Data_Entry", "Accountant", "COO"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid assigned role")
    if db.query(User).filter((User.email == registration.email) | (User.username == registration.username)).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account already exists for this registration")

    role = db.query(Role).filter_by(name=assigned_role).first()
    if not role:
        role = Role(id=str(uuid.uuid4()), name=assigned_role, description=f"{assigned_role} role")
        db.add(role)
        db.flush()
    user = User(
        id=str(uuid.uuid4()), username=registration.username, email=registration.email,
        full_name=registration.full_name, password_hash=registration.password_hash,
        role_id=role.id, is_active=True,
    )
    registration.status = "Approved"
    registration.reviewed_by = current_user.email
    registration.reviewed_at = datetime.now(timezone.utc)
    db.add(user)
    db.commit()
    return {"status": "Approved", "user": {"id": user.id, "username": user.username, "email": user.email, "fullName": user.full_name, "role": assigned_role, "status": "Active"}}


@app.post("/api/user-registrations/{registration_id}/reject", tags=["User Registration"])
async def reject_user_registration(
    registration_id: str,
    payload: UserRegistrationReview,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrators can reject registrations")
    registration = db.query(UserRegistration).filter_by(id=registration_id).first()
    if not registration or registration.status != "Pending":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pending registration not found")
    registration.status = "Rejected"
    registration.notes = payload.notes or registration.notes
    registration.reviewed_by = current_user.email
    registration.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "Rejected", "id": registration.id}


@app.get("/api/admin/pending-users", tags=["Administration"])
async def get_pending_users(
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role.upper() != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrators can view pending users")
    users = db.query(User).filter_by(status="AWAITING_ADMIN_APPROVAL").order_by(User.created_at.asc()).all()
    return [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "fullName": user.full_name,
            "status": user.status,
            "role": user.role.name if user.role else None,
        }
        for user in users
    ]


@app.post("/api/admin/approve-user/{user_id}", tags=["Administration"])
async def approve_pending_user(
    user_id: str,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role.upper() != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrators can approve users")
    user = db.query(User).filter_by(id=user_id, status="AWAITING_ADMIN_APPROVAL").first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pending user not found")
    clerk_role = db.query(Role).filter_by(name="Clerk").first()
    if clerk_role is None:
        clerk_role = Role(id=str(uuid.uuid4()), name="Clerk", description="Operational clerk")
        db.add(clerk_role)
        db.flush()
    administrator = db.query(User).filter_by(email=current_user.email).first()
    user.status = "ACTIVE"
    user.is_active = True
    user.role_id = clerk_role.id
    db.add(AuditLog(
        id=str(uuid.uuid4()), actor_email=current_user.email, action="USER_ACTIVATION",
        entity="User", entity_id=user.id,
        details=f"administrator_user_id={administrator.id if administrator else current_user.email}; Admin approved account registration for User ID: {user_id}",
    ))
    db.commit()
    return {"id": user.id, "status": user.status, "role": clerk_role.name}


@app.post("/api/admin/reject-user/{user_id}", tags=["Administration"])
async def reject_pending_user(
    user_id: str,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role.upper() != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrators can reject users")
    user = db.query(User).filter_by(id=user_id, status="AWAITING_ADMIN_APPROVAL").first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pending user not found")
    user.status = "REGISTRATION_DENIED"
    user.is_active = False
    db.add(AuditLog(
        id=str(uuid.uuid4()), actor_email=current_user.email, action="USER_REGISTRATION_REJECTION",
        entity="User", entity_id=user.id,
        details=f"Admin rejected account registration for User ID: {user_id}",
    ))
    db.commit()
    return {"id": user.id, "status": user.status}


@app.post("/api/saas/issue-license", tags=["SaaS"])
async def issue_tenant_license(payload: TenantLicenseIssue, request: Request, db: Session = Depends(get_db)):
    superadmin_key = os.getenv("SYSTEM_SUPERADMIN_KEY")
    submitted_key = request.headers.get("X-System-SuperAdmin", "")
    if not superadmin_key or not secrets.compare_digest(submitted_key, superadmin_key):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="System super-admin authorization is required")
    tier_defaults = {"BASIC": 5, "PROFESSIONAL": 25, "ENTERPRISE": 100}
    license_record = TenantLicense(
        tenant_id=str(uuid.uuid4()),
        company_name=payload.company_name.strip(),
        license_key=secrets.token_urlsafe(16),
        subscription_tier=payload.subscription_tier,
        max_allowed_cost_centers=payload.max_allowed_cost_centers or tier_defaults[payload.subscription_tier],
        ui_theme_mode=payload.ui_theme_mode,
        ui_primary_color=payload.ui_primary_color,
        ui_secondary_color=payload.ui_secondary_color,
        ui_font_family=payload.ui_font_family,
        ui_logo_url=payload.ui_logo_url,
        is_active=True,
        expires_at=datetime.now(timezone.utc) + timedelta(days=payload.expires_in_days),
    )
    db.add(license_record)
    db.add(AuditLog(
        id=str(uuid.uuid4()), actor_email="system@superadmin", action="ISSUE_TENANT_LICENSE",
        entity="TenantLicense", entity_id=license_record.tenant_id,
        details=f"Issued {license_record.subscription_tier} license for {license_record.company_name}",
    ))
    db.commit()
    return {
        "tenant_id": license_record.tenant_id,
        "company_name": license_record.company_name,
        "license_key": license_record.license_key,
        "subscription_tier": license_record.subscription_tier,
        "max_allowed_cost_centers": int(license_record.max_allowed_cost_centers),
        "theme_mode": license_record.ui_theme_mode,
        "primary_color": license_record.ui_primary_color,
        "secondary_color": license_record.ui_secondary_color,
        "font_family": license_record.ui_font_family,
        "logo_url": license_record.ui_logo_url,
        "is_active": bool(license_record.is_active),
        "expires_at": license_record.expires_at.isoformat(),
    }


@app.post("/api/cost-centers", tags=["Cost Centers"])
async def create_cost_center(
    payload: CostCenterCreate,
    request: Request,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role.upper() not in {"ADMIN", "CEO", "CLERK", "ACCOUNTANT"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to create cost centers")
    license_record = getattr(request.state, "tenant_license", None)
    if license_record is None:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=SUBSCRIPTION_SUSPENDED_MESSAGE)
    current_cost_centers = db.query(CostCenter).filter_by(tenant_id=license_record.tenant_id).count()
    if current_cost_centers >= license_record.max_allowed_cost_centers:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cost center limit reached. Upgrade your subscription plan.")
    if db.get(CostCenter, payload.code):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cost center code already exists")
    if payload.parent_cc and db.get(CostCenter, payload.parent_cc) is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Parent cost center was not found")
    cost_center = CostCenter(
        code=payload.code, name=payload.name, parent_cc=payload.parent_cc,
        is_leaf=payload.is_leaf, tenant_id=license_record.tenant_id,
    )
    db.add(cost_center)
    db.add(AuditLog(
        id=str(uuid.uuid4()), actor_email=current_user.email, action="CREATE_TENANT_COST_CENTER",
        entity="CostCenter", entity_id=cost_center.code,
        details=f"Created cost center for tenant {license_record.tenant_id}",
    ))
    db.commit()
    return {"code": cost_center.code, "name": cost_center.name, "is_leaf": bool(cost_center.is_leaf)}


@app.get("/api/admin/waf-threats", tags=["Administration"])
async def get_waf_threats(current_user: AuthUser = Depends(get_current_user)):
    if current_user.role.upper() != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrators can view WAF threats")
    return get_blocked_request_threats()


@app.get("/api/admin/db/optimize-check", tags=["Administration"])
async def get_database_optimization_check(
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role.upper() not in {"ADMIN", "CEO"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Admin or CEO users can view database optimization metrics")
    return get_query_optimization_metrics(db, datetime.now(timezone.utc).year)


@app.get("/", tags=["Health Check"])
async def root():
    return {
        "status": "online",
        "message": f"{get_system_settings().system_name} is running successfully",
        "documentation": "/docs",
    }


@app.get("/api/health", tags=["Health Check"])
async def health_check():
    return {
        "status": "ok",
        "service": get_system_settings().system_name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/system/settings", tags=["System"])
async def get_system_configuration(identity: str | None = None, request: Request = None, db: Session = Depends(get_db)):
    settings = get_system_settings()
    system_visual_identity = get_system_visual_identity(identity)
    license_key = request.headers.get("X-Tenant-License-Key", "")
    license_record = db.query(TenantLicense).filter_by(license_key=license_key).first() if license_key else None
    expires_at = license_record.expires_at.replace(tzinfo=timezone.utc) if license_record and license_record.expires_at.tzinfo is None else (license_record.expires_at if license_record else None)
    has_active_license = bool(license_record and license_record.is_active and expires_at and datetime.now(timezone.utc) < expires_at)
    return {
        "system_name": settings.system_name,
        "company_name": license_record.company_name if has_active_license else settings.company_name,
        "vat_rate": float(settings.vat_rate),
        "theme_mode": license_record.ui_theme_mode if has_active_license else system_visual_identity["theme_mode"],
        "primary_color": license_record.ui_primary_color if has_active_license else system_visual_identity["primary_color"],
        "secondary_color": license_record.ui_secondary_color if has_active_license else system_visual_identity["secondary_color"],
        "font_family": license_record.ui_font_family if has_active_license else system_visual_identity["font_family"],
        "logo_url": license_record.ui_logo_url if has_active_license else system_visual_identity["logo_url"],
    }


@app.post("/token", response_model=Token, tags=["Authentication"])
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    ensure_seed_users(db)

    normalized_username = (form_data.username or "").strip().lower()
    allowed_credentials = resolve_admin_login_credentials()

    user = db.query(User).filter((User.email == normalized_username) | (User.username == normalized_username)).first()
    if not user and normalized_username in allowed_credentials:
        user = db.query(User).filter_by(email=os.getenv("DEFAULT_ADMIN_EMAIL", "admin@example.local").strip().lower()).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="اسم المستخدم أو كلمة المرور غير صحيحة",
            headers={"WWW-Authenticate": "Bearer"},
        )

    tenant_id = getattr(user, "tenant_id", None) or "tenant-default-001"
    tenant_role = getattr(user, "tenant_role", None) or ("Admin" if user.role and user.role.name in {"Admin", "CEO"} else "Accountant")
    is_superadmin = bool(getattr(user, "is_platform_superadmin", False) or (user.role and user.role.name in {"Admin", "CEO"}))

    legacy_password = allowed_credentials.get(normalized_username)
    if legacy_password and legacy_password == form_data.password:
        token = create_access_token(
            subject=user.email,
            tenant_id=tenant_id,
            role=user.role.name if user.role else "User",
            tenant_role=tenant_role,
            is_platform_superadmin=is_superadmin,
        )
        return {
            "access_token": token,
            "token_type": "bearer",
            "tenant_id": tenant_id,
            "role": user.role.name if user.role else "User",
            "tenant_role": tenant_role,
            "is_platform_superadmin": is_superadmin,
        }

    if verify_password(form_data.password, user.password_hash):
        token = create_access_token(
            subject=user.email,
            tenant_id=tenant_id,
            role=user.role.name if user.role else "User",
            tenant_role=tenant_role,
            is_platform_superadmin=is_superadmin,
        )
        return {
            "access_token": token,
            "token_type": "bearer",
            "tenant_id": tenant_id,
            "role": user.role.name if user.role else "User",
            "tenant_role": tenant_role,
            "is_platform_superadmin": is_superadmin,
        }

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="اسم المستخدم أو كلمة المرور غير صحيحة",
        headers={"WWW-Authenticate": "Bearer"},
    )


@app.post("/api/auth/verify", tags=["Authentication"])
async def verify_auth_identity(payload: AuthVerifyRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    ensure_seed_users(db)

    email = payload.email.strip().lower()
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is required")
    if not payload.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password is required")

    user = db.query(User).filter_by(email=email).first()
    if not user:
        log_platform_auth_event(db, request, actor_identifier=email, event_name="LOGIN", outcome="FAILED", details="User not found")
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    tenant_id = getattr(user, "tenant_id", None)
    if not user.is_active:
        log_platform_auth_event(db, request, actor_identifier=email, event_name="LOGIN", outcome="FAILED", company_id=tenant_id, details="User inactive")
        db.commit()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")

    if not verify_password(payload.password, user.password_hash):
        log_platform_auth_event(db, request, actor_identifier=email, event_name="LOGIN", outcome="FAILED", company_id=tenant_id, details="Invalid password")
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    role_name = user.role.name if user.role else "User"
    tenant_id = tenant_id or "tenant-default-001"
    tenant_role = getattr(user, "tenant_role", None) or ("Admin" if role_name in {"Admin", "CEO"} else "Accountant")
    is_superadmin = bool(getattr(user, "is_platform_superadmin", False) or role_name in {"Admin", "CEO"})
    token = create_access_token(
        subject=user.email,
        tenant_id=tenant_id,
        role=role_name,
        tenant_role=tenant_role,
        is_platform_superadmin=is_superadmin,
    )
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=SESSION_COOKIE_SECURE,
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )

    log_platform_auth_event(db, request, actor_identifier=user.email, event_name="LOGIN", outcome="SUCCESS", company_id=tenant_id, details=f"role={role_name}; tenant_role={tenant_role}")
    db.commit()

    return {
        "message": "Authenticated",
        "status": "Active",
        "access_token": token,
        "token_type": "bearer",
        "tenant_id": tenant_id,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "fullName": user.full_name,
            "fullNameAr": user.full_name,
            "role": role_name,
            "tenantRole": tenant_role,
            "isPlatformSuperAdmin": is_superadmin,
            "status": "Active",
            "company_id": tenant_id,
        },
    }


@app.post("/api/auth/logout", tags=["Authentication"])
async def logout_auth_identity(request: Request, response: Response, db: Session = Depends(get_db)):
    actor_identifier = "anonymous"
    company_id = None
    token = request.cookies.get(SESSION_COOKIE_NAME)

    if token:
        try:
            token_payload = decode_access_token_payload(token)
            actor_identifier = token_payload.get("sub") or actor_identifier
            company_id = token_payload.get("tenant_id")
        except Exception:
            actor_identifier = "invalid-session"

    log_platform_auth_event(
        db,
        request,
        actor_identifier=actor_identifier,
        event_name="LOGOUT",
        outcome="SUCCESS",
        company_id=company_id,
        details="Session cookie cleared",
    )
    db.commit()
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value="",
        httponly=True,
        secure=SESSION_COOKIE_SECURE,
        samesite="lax",
        max_age=0,
        expires=0,
        path="/",
    )
    return {"message": "Logged out"}


@app.get("/api/me", tags=["Authentication"])
async def get_current_user_profile(
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tenant_info = db.query(TenantLicense).filter_by(tenant_id=current_user.tenant_id).first()
    return {
        "id": current_user.email,
        "username": current_user.username,
        "email": current_user.email,
        "fullName": current_user.full_name,
        "fullNameAr": current_user.full_name,
        "role": current_user.role,
        "tenantId": current_user.tenant_id,
        "tenantRole": current_user.tenant_role,
        "isPlatformSuperAdmin": current_user.is_platform_superadmin,
        "status": "Active",
        "companyName": tenant_info.company_name if tenant_info else "مؤسسة معين للمقاولات والخدمات اللوجستية",
        "companyNameEn": tenant_info.company_name_en if tenant_info else "Moeen Logistics & Contracting Est.",
        "subscriptionTier": tenant_info.subscription_tier if tenant_info else "PROFESSIONAL",
        "planType": getattr(tenant_info, "plan_type", "PRO"),
        "licenseKey": tenant_info.license_key if tenant_info else "",
    }


@app.post("/api/operations", response_model=OperationResponse, tags=["Operations & Invoicing"])
async def create_operation(
    op: OperationCreate,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"Admin", "COO", "Data_Entry"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to create operations")

    new_record = Operation(
        id=str(uuid.uuid4()),
        transporter_id=op.transporter_id,
        route=op.route,
        amount=op.amount,
        client_name=op.client_name,
        invoice_id=str(uuid.uuid4()),
        profit=float(calculate_vat(Decimal(str(op.amount)))),
        created_at=datetime.now(timezone.utc),
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return OperationResponse(
        id=new_record.id,
        transporter_id=new_record.transporter_id,
        route=new_record.route,
        amount=new_record.amount,
        client_name=new_record.client_name,
        invoice_id=new_record.invoice_id,
        profit=new_record.profit,
        created_at=new_record.created_at,
    )


@app.get("/api/operations", response_model=List[OperationResponse], tags=["Operations & Invoicing"])
async def get_operations(
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"Admin", "COO", "Data_Entry", "Accountant"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to operations")

    rows = db.query(Operation).all()
    return [
        OperationResponse(
            id=row.id,
            invoice_id=row.invoice_id,
            profit=row.profit,
            created_at=row.created_at,
            transporter_id=row.transporter_id,
            route=row.route,
            amount=row.amount,
            client_name=row.client_name,
        )
        for row in rows
    ]


@app.get("/api/workflow-records", tags=["ERP Workflows"])
async def get_workflow_records(current_user: AuthUser = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in {"Admin", "COO", "Accountant", "Data_Entry"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to workflow records")

    operations = db.query(Operation).order_by(Operation.created_at.desc()).all()
    invoices = db.query(Invoice).filter_by(is_deleted=False).order_by(Invoice.created_at.desc()).all()
    vouchers = db.query(Voucher).order_by(Voucher.created_at.desc()).all()
    journals = db.query(JournalEntry).order_by(JournalEntry.created_at.desc()).all()
    journal_lines = db.query(JournalLine).all()
    lines_by_entry: dict[str, list[dict[str, object]]] = {}
    for line in journal_lines:
        lines_by_entry.setdefault(line.journal_entry_id, []).append({
            "id": line.id,
            "account": line.account,
            "debit": line.base_debit if line.base_debit is not None else line.debit,
            "credit": line.base_credit if line.base_credit is not None else line.credit,
            "description": line.description,
        })

    return {
        "operations": [
            {
                "id": row.id,
                "invoiceId": row.invoice_id,
                "transporterId": row.transporter_id,
                "route": row.route,
                "amount": row.amount,
                "clientName": row.client_name,
                "profit": row.profit,
                "createdAt": row.created_at,
            }
            for row in operations
        ],
        "invoices": [
            {
                "id": row.id,
                "invoiceNumber": row.invoice_number,
                "customerId": row.customer_id,
                "customerName": row.customer_name,
                "issueDate": row.issue_date,
                "dueDate": row.due_date,
                "subtotal": row.subtotal,
                "vatAmount": row.vat_amount,
                "grandTotal": row.grand_total,
                "status": row.status,
            }
            for row in invoices
        ],
        "vouchers": [
            {
                "id": row.id,
                "voucherNumber": row.voucher_number,
                "type": row.voucher_type,
                "amount": row.amount,
                "partyName": row.beneficiary,
                "status": row.status,
                "notes": row.notes,
                "createdAt": row.created_at,
            }
            for row in vouchers
        ],
        "journalEntries": [
            {
                "id": row.id,
                "entryNumber": row.entry_number,
                "date": row.entry_date,
                "referenceId": row.reference_id,
                "description": row.description,
                "status": row.status,
                "totalDebit": row.total_debit,
                "totalCredit": row.total_credit,
                "lines": lines_by_entry.get(row.id, []),
                "createdAt": row.created_at,
            }
            for row in journals
        ],
    }


@app.post("/api/workflows/operation-to-journal", tags=["ERP Workflows"])
async def create_operation_to_journal(
    payload: WorkflowCreate,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"Admin", "COO", "Accountant", "Data_Entry"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to create this workflow")
    if payload.amount <= 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Amount must be greater than zero")
    if abs(payload.amount - round(payload.amount, 2)) > 0.001:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Amount must have at most two decimal places")
    if db.query(Invoice).filter_by(invoice_number=payload.invoice_number).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Invoice number already exists")
    if db.query(Voucher).filter_by(voucher_number=payload.voucher_number).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Voucher number already exists")

    invoice_id = str(uuid.uuid4())
    operation_id = str(uuid.uuid4())
    voucher_id = str(uuid.uuid4())
    journal_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    gross_amount = Decimal(str(payload.amount))
    vat_amount = calculate_vat(gross_amount)
    subtotal = gross_amount - vat_amount

    invoice = Invoice(
        id=invoice_id,
        invoice_number=payload.invoice_number,
        customer_id=payload.customer_id,
        customer_name=payload.customer_name,
        subtotal=float(subtotal),
        vat_amount=float(vat_amount),
        grand_total=round(payload.amount, 2),
        status="Pending_Approval",
    )
    operation = Operation(
        id=operation_id,
        transporter_id=payload.transporter_id,
        route=payload.route,
        amount=round(payload.amount, 2),
        client_name=payload.client_name,
        invoice_id=invoice_id,
        profit=float(vat_amount),
        created_at=now,
    )
    voucher = Voucher(
        id=voucher_id,
        voucher_type=payload.voucher_type,
        voucher_number=payload.voucher_number,
        beneficiary=payload.beneficiary,
        amount=round(payload.amount, 2),
        status="Pending_Approval",
        notes=payload.description,
    )
    journal = JournalEntry(
        id=journal_id,
        entry_number=f"JE-{now.strftime('%Y%m%d%H%M%S')}-{journal_id[:6]}",
        reference_type="Operation",
        reference_id=operation_id,
        description=payload.description or f"Workflow posting for {payload.invoice_number}",
        status="PENDING_CEO_APPROVAL",
        total_debit=round(payload.amount, 2),
        total_credit=round(payload.amount, 2),
    )
    journal_lines = [
        JournalLine(id=str(uuid.uuid4()), journal_entry_id=journal_id, account=payload.debit_account, debit=round(payload.amount, 2), credit=0.0, description=journal.description),
        JournalLine(id=str(uuid.uuid4()), journal_entry_id=journal_id, account=payload.credit_account, debit=0.0, credit=round(payload.amount, 2), description=journal.description),
    ]

    try:
        db.add_all([invoice, operation, voucher, journal, *journal_lines])
        db.add(AuditLog(
            id=str(uuid.uuid4()),
            actor_email=current_user.email,
            action="CREATE_WORKFLOW",
            entity="OperationWorkflow",
            entity_id=operation_id,
            details=f"Created operation {operation_id}, invoice {invoice_id}, voucher {voucher_id}, journal {journal_id}",
            created_at=now,
        ))
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Workflow could not be committed") from exc

    return {
        "operation_id": operation_id,
        "invoice_id": invoice_id,
        "voucher_id": voucher_id,
        "journal_entry_id": journal_id,
        "invoice_status": invoice.status,
        "voucher_status": voucher.status,
        "journal_status": journal.status,
    }


@app.post("/api/inventory/sales-hook", tags=["Inventory"])
async def create_inventory_sales_journal(
    payload: InventorySalesHookCreate,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"Admin", "COO", "Accountant", "Data_Entry"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to submit inventory sales")

    sale_total = round(payload.quantity * payload.unit_sale_price, 2)
    cost_total = round(payload.quantity * payload.unit_cost_price, 2)
    if sale_total <= 0 or cost_total <= 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Inventory sales totals must be greater than zero")

    journal_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    description = f"Inventory sale for trip {payload.trip_id}, SKU {payload.item_sku}"
    entry_number = f"INV-SALE-{now.strftime('%Y%m%d%H%M%S')}-{journal_id[:6]}"
    lines = [
        JournalLineCreate(account="1101", debit=sale_total, credit=0.0, description=description),
        JournalLineCreate(account="4101", debit=0.0, credit=sale_total, cost_center_id=payload.cost_center_id, description=description),
        JournalLineCreate(account="5101", debit=cost_total, credit=0.0, cost_center_id=payload.cost_center_id, description=description),
        JournalLineCreate(account="1201", debit=0.0, credit=cost_total, description=description),
    ]
    try:
        validate_journal_posting_lines(db, lines)
    except AccountingHierarchyError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    journal = JournalEntry(
        id=journal_id,
        entry_number=entry_number,
        reference_type="InventorySale",
        reference_id=payload.trip_id,
        description=description,
        status="PENDING_CEO_APPROVAL",
        total_debit=round(sale_total + cost_total, 2),
        total_credit=round(sale_total + cost_total, 2),
    )
    journal_lines = [
        JournalLine(
            id=str(uuid.uuid4()),
            journal_entry_id=journal_id,
            account=line.account,
            debit=line.debit,
            credit=line.credit,
            cost_center_id=line.cost_center_id,
            description=line.description,
        )
        for line in lines
    ]
    try:
        db.add_all([journal, *journal_lines])
        db.add(AuditLog(
            id=str(uuid.uuid4()),
            actor_email=current_user.email,
            action="CREATE_INVENTORY_SALE",
            entity="JournalEntry",
            entity_id=journal_id,
            details=f"Created pending inventory sale journal for trip {payload.trip_id}, SKU {payload.item_sku}",
            created_at=now,
        ))
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Inventory sale journal could not be committed") from exc

    return {
        "id": journal.id,
        "entryNumber": journal.entry_number,
        "status": journal.status,
        "totalDebit": journal.total_debit,
        "totalCredit": journal.total_credit,
    }


@app.post("/api/operations/add-trip", tags=["Operations & Invoicing"])
async def create_trip_with_vat_journal(
    payload: TripWithVatCreate,
    request: Request,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"Admin", "COO", "Accountant", "Data_Entry", "Clerk"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to add trips")

    exchange_rate = Decimal(str(payload.exchange_rate))
    gross_amount = (Decimal(payload.quantity) * payload.unit_sale_price).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    cost_total = consume_inventory_fifo(payload.item_sku, payload.quantity, db)
    try:
        vat_amount = calculate_vat(gross_amount)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    net_revenue = gross_amount - vat_amount
    description = f"VAT trip operation for trip {payload.trip_id}, SKU {payload.item_sku}"
    lines = [
        JournalLineCreate(account="1101", debit=float(gross_amount * exchange_rate), credit=0.0, description=description),
        JournalLineCreate(account="4101", debit=0.0, credit=float(net_revenue * exchange_rate), cost_center_id=payload.cost_center_id, description=description),
        JournalLineCreate(account="2201", debit=0.0, credit=float(vat_amount * exchange_rate), description=description),
        JournalLineCreate(account="5101", debit=float(cost_total * exchange_rate), credit=0.0, cost_center_id=payload.cost_center_id, description=description),
        JournalLineCreate(account="1201", debit=0.0, credit=float(cost_total * exchange_rate), description=description),
    ]
    total_debit = round(sum(line.debit for line in lines), 2)
    total_credit = round(sum(line.credit for line in lines), 2)
    if total_debit <= 0 or abs(total_debit - total_credit) > 0.01:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="VAT trip journal must be balanced")
    try:
        validate_journal_posting_lines(db, lines)
    except AccountingHierarchyError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    journal_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    journal = JournalEntry(
        id=journal_id,
        entry_number=f"TRIP-VAT-{now.strftime('%Y%m%d%H%M%S')}-{journal_id[:6]}",
        reference_type="TripOperation",
        reference_id=payload.trip_id,
        entry_date=payload.transaction_date or now,
        description=description,
        status="PENDING_CEO_APPROVAL",
        currency=payload.currency.upper(),
        exchange_rate=float(exchange_rate),
        total_debit=total_debit,
        total_credit=total_credit,
    )
    journal_lines = [
        JournalLine(
            id=str(uuid.uuid4()), journal_entry_id=journal_id, account=line.account,
            debit=line.debit, credit=line.credit, cost_center_id=line.cost_center_id,
            source_debit=float([gross_amount, Decimal("0"), Decimal("0"), cost_total, Decimal("0")][index]),
            source_credit=float([Decimal("0"), net_revenue, vat_amount, Decimal("0"), cost_total][index]),
            base_debit=line.debit, base_credit=line.credit,
            description=line.description,
        )
        for index, line in enumerate(lines)
    ]
    audit_context = get_audit_context(request, current_user.email, db)
    try:
        db.add_all([journal, *journal_lines])
        db.add(create_structured_audit_log(
            audit_context, "CREATE_TRIP_WITH_VAT", "JournalEntry", journal_id,
            {
                "trip_id": payload.trip_id,
                "gross_amount": float(gross_amount),
                "net_revenue": float(net_revenue),
                "vat_amount": float(vat_amount),
                "fifo_cogs": float(cost_total),
                "total_debit": float(total_debit),
                "total_credit": float(total_credit),
            },
        ))
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="VAT trip journal could not be committed") from exc

    return {
        "id": journal.id,
        "entryNumber": journal.entry_number,
        "status": journal.status,
        "totalDebit": float(journal.total_debit),
        "totalCredit": float(journal.total_credit),
        "lines": [
            {
                "account": line.account,
                "accountCode": line.account,
                "debit": float(line.debit),
                "credit": float(line.credit),
                "cost_center_id": line.cost_center_id,
                "description": line.description,
            }
            for line in journal_lines
        ],
    }


@app.post("/api/inventory/layers", tags=["Inventory"])
async def create_inventory_layer(
    payload: InventoryLayerCreate,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role.upper() not in {"ADMIN", "CEO", "ACCOUNTANT", "DATA_ENTRY", "CLERK"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to add inventory layers")
    layer = InventoryLayer(
        id=str(uuid.uuid4()), item_sku=payload.item_sku.strip(),
        purchase_date=payload.purchase_date or datetime.now(timezone.utc),
        original_quantity=payload.original_quantity, remaining_quantity=payload.original_quantity,
        unit_cost=payload.unit_cost.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
    )
    db.add_all([
        layer,
        AuditLog(
            id=str(uuid.uuid4()), actor_email=current_user.email, action="CREATE_INVENTORY_LAYER",
            entity="InventoryLayer", entity_id=layer.id, details=f"Added {layer.original_quantity} units of {layer.item_sku}",
        ),
    ])
    db.commit()
    return {
        "id": layer.id,
        "itemSku": layer.item_sku,
        "originalQuantity": layer.original_quantity,
        "remainingQuantity": layer.remaining_quantity,
        "unitCost": float(layer.unit_cost),
    }


@app.post("/api/operations/intercompany-trade", tags=["Intercompany"])
async def create_intercompany_trade(
    payload: IntercompanyTradeCreate,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"Admin", "COO", "Accountant", "Data_Entry"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to create intercompany trades")
    if payload.origin_company_id == payload.target_company_id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Origin and target companies must be different")

    amount = round(payload.amount, 2)
    description = payload.description or f"Intercompany trade: {payload.origin_company_id} to {payload.target_company_id}"
    lines = [
        JournalLineCreate(account="1300", debit=amount, credit=0.0, description=description),
        JournalLineCreate(account="4100", debit=0.0, credit=amount, cost_center_id=payload.origin_cost_center_id, description=description),
        JournalLineCreate(account="5100", debit=amount, credit=0.0, cost_center_id=payload.target_cost_center_id, description=description),
        JournalLineCreate(account="2300", debit=0.0, credit=amount, description=description),
    ]
    total_debit = round(sum(line.debit for line in lines), 2)
    total_credit = round(sum(line.credit for line in lines), 2)
    if total_debit <= 0 or total_debit != total_credit:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Intercompany trade must be globally balanced")
    try:
        validate_journal_posting_lines(db, lines)
    except AccountingHierarchyError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    journal_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    journal = JournalEntry(
        id=journal_id,
        entry_number=f"IC-{now.strftime('%Y%m%d%H%M%S')}-{journal_id[:6]}",
        reference_type="IntercompanyTrade",
        reference_id=payload.reference_id,
        description=description,
        status="PENDING_CEO_APPROVAL",
        total_debit=total_debit,
        total_credit=total_credit,
    )
    journal_lines = [
        JournalLine(
            id=str(uuid.uuid4()), journal_entry_id=journal_id, account=line.account,
            debit=line.debit, credit=line.credit, cost_center_id=line.cost_center_id,
            description=line.description,
        )
        for line in lines
    ]
    try:
        db.add_all([journal, *journal_lines])
        db.add(AuditLog(
            id=str(uuid.uuid4()), actor_email=current_user.email,
            action="CREATE_INTERCOMPANY_TRADE", entity="JournalEntry", entity_id=journal_id,
            details=f"{payload.origin_company_id} to {payload.target_company_id}: {amount:.2f}", created_at=now,
        ))
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Intercompany trade could not be committed") from exc

    return {
        "id": journal.id,
        "entryNumber": journal.entry_number,
        "status": journal.status,
        "totalDebit": journal.total_debit,
        "totalCredit": journal.total_credit,
    }


@app.post("/api/finance/fixed-assets", tags=["Finance"])
async def create_fixed_asset(
    payload: FixedAssetCreate,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role.upper() not in {"ADMIN", "CEO"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Admin or CEO users can manage fixed assets")
    if payload.residual_value > payload.purchase_cost:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Residual value cannot exceed purchase cost")

    validation_lines = [
        JournalLineCreate(account=payload.expense_account_code, debit=0.01, credit=0.0, cost_center_id=payload.cost_center_id),
        JournalLineCreate(account=payload.asset_account_code, debit=0.0, credit=0.01),
    ]
    try:
        validate_journal_posting_lines(db, validation_lines)
    except AccountingHierarchyError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    asset = FixedAsset(
        id=str(uuid.uuid4()), asset_name=payload.asset_name.strip(),
        purchase_cost=payload.purchase_cost.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        residual_value=payload.residual_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        useful_life_months=payload.useful_life_months,
        asset_account_code=payload.asset_account_code,
        expense_account_code=payload.expense_account_code,
        cost_center_id=payload.cost_center_id,
    )
    db.add(asset)
    db.add(AuditLog(
        id=str(uuid.uuid4()), actor_email=current_user.email, action="CREATE_FIXED_ASSET",
        entity="FixedAsset", entity_id=asset.id, details=f"Created fixed asset {asset.asset_name}",
    ))
    db.commit()
    return {"id": asset.id, "assetName": asset.asset_name, "status": "Active"}


@app.post("/api/finance/employee-contracts", tags=["Finance"])
async def create_employee_contract(
    payload: EmployeeContractCreate,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role.upper() not in {"ADMIN", "CEO"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Admin or CEO users can manage employee contracts")
    gross_salary = payload.base_salary + payload.allowances
    if payload.deductions > gross_salary:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Deductions cannot exceed gross salary")
    try:
        validate_journal_posting_lines(db, [
            JournalLineCreate(account="5201", debit=0.01, credit=0.0, cost_center_id=payload.cost_center_id),
            JournalLineCreate(account="2300", debit=0.0, credit=0.01),
            JournalLineCreate(account="2310", debit=0.0, credit=0.01),
        ])
    except AccountingHierarchyError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    contract = EmployeeContract(
        id=str(uuid.uuid4()), employee_name=payload.employee_name.strip(),
        base_salary=payload.base_salary.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        allowances=payload.allowances.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        deductions=payload.deductions.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        cost_center_id=payload.cost_center_id,
    )
    db.add_all([
        contract,
        AuditLog(
            id=str(uuid.uuid4()), actor_email=current_user.email, action="CREATE_EMPLOYEE_CONTRACT",
            entity="EmployeeContract", entity_id=contract.id, details=f"Created employee contract for {contract.employee_name}",
        ),
    ])
    db.commit()
    return {"id": contract.id, "employeeName": contract.employee_name, "status": "Active"}


@app.post("/api/finance/bank-reconciliation", tags=["Finance"])
async def reconcile_bank_statement(
    payload: BankReconciliationRequest,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role.upper() not in {"ADMIN", "CEO", "ACCOUNTANT"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to reconcile bank statements")

    reconciled_count = 0
    unmatched_reference_ids: list[str] = []
    eligible_statuses = {"POSTED_TO_MAIN_LEDGER", "Posted", "Approved"}
    try:
        for bank_row in payload.rows:
            candidates = db.query(JournalLine).join(
                JournalEntry, JournalEntry.id == JournalLine.journal_entry_id
            ).filter(
                JournalLine.account == "1101",
                JournalLine.reconciliation_status == "UNRECONCILED",
                JournalEntry.status.in_(eligible_statuses),
                or_(
                    JournalEntry.reference_id == bank_row.bank_reference,
                    JournalEntry.entry_number == bank_row.bank_reference,
                ),
            ).all()
            matched_line = next(
                (
                    line
                    for line in candidates
                    if abs(Decimal(str(line.base_debit or 0)) - Decimal(str(line.base_credit or 0))) == bank_row.bank_amount
                ),
                None,
            )
            if matched_line is None:
                unmatched_reference_ids.append(bank_row.bank_reference)
                continue
            matched_line.reconciliation_status = "RECONCILED"
            reconciled_count += 1
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bank reconciliation could not be committed") from exc

    return {
        "total_processed_bank_rows": len(payload.rows),
        "successfully_reconciled_count": reconciled_count,
        "unmatched_exceptions_count": len(unmatched_reference_ids),
        "unmatched_reference_ids": unmatched_reference_ids,
    }


@app.post("/api/finance/bank-reconciliation/multi-currency", tags=["Finance"])
async def reconcile_bank_statement_multi_currency(
    payload: BankReconciliationRequest,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role.upper() not in {"ADMIN", "CEO"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Admin or CEO users can reconcile multi-currency bank statements")

    reconciled_count = 0
    unmatched_details: list[dict[str, object]] = []
    eligible_statuses = {"POSTED_TO_MAIN_LEDGER", "Posted", "Approved"}
    for bank_row in payload.rows:
        try:
            candidates = db.query(JournalLine, JournalEntry).join(
                JournalEntry, JournalEntry.id == JournalLine.journal_entry_id
            ).filter(
                JournalLine.account == "1101",
                JournalLine.reconciliation_status == "UNRECONCILED",
                JournalEntry.status.in_(eligible_statuses),
                or_(
                    JournalEntry.reference_id == bank_row.bank_reference,
                    JournalEntry.entry_number == bank_row.bank_reference,
                ),
            ).all()
            bank_currency = bank_row.bank_currency.upper()
            matched_line = None
            for line, journal in candidates:
                if bank_currency == journal.currency.upper():
                    expected_amount = abs(Decimal(str(line.source_debit or 0)) - Decimal(str(line.source_credit or 0)))
                else:
                    expected_amount = bank_row.bank_amount * Decimal(str(journal.exchange_rate))
                    stored_base_amount = abs(Decimal(str(line.base_debit or 0)) - Decimal(str(line.base_credit or 0)))
                    if abs(stored_base_amount - expected_amount) <= Decimal("0.01"):
                        matched_line = line
                        break
                    continue
                if abs(expected_amount - bank_row.bank_amount) <= Decimal("0.01"):
                    matched_line = line
                    break
            if matched_line is None:
                unmatched_details.append({
                    "bank_reference": bank_row.bank_reference,
                    "bank_amount": float(bank_row.bank_amount),
                    "bank_currency": bank_currency,
                    "reason": "No eligible ledger line matched the bank reference and amount",
                })
                continue
            matched_line.reconciliation_status = "RECONCILED"
            matched_line.reconciled_at = datetime.now(timezone.utc)
            reconciled_count += 1
        except Exception as exc:
            unmatched_details.append({
                "bank_reference": bank_row.bank_reference,
                "bank_amount": float(bank_row.bank_amount),
                "bank_currency": bank_row.bank_currency.upper(),
                "reason": str(exc),
            })
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Multi-currency reconciliation could not be committed") from exc

    return {
        "total_processed": len(payload.rows),
        "reconciled_count": reconciled_count,
        "exceptions_count": len(unmatched_details),
        "unmatched_details": unmatched_details,
    }


@app.post("/api/finance/year-end-close/{year}", tags=["Finance"])
async def close_fiscal_year(
    year: int,
    request: Request,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role.upper() not in {"ADMIN", "CEO"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Admin or CEO users can close a fiscal year")
    if db.get(FiscalPeriod, year):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fiscal year is already locked and audited.")
    closer = db.query(User).filter_by(email=current_user.email, is_active=True).first()
    if closer is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authenticated user was not found")

    revenue_balances = get_fiscal_branch_balances(db, "4000", year)
    expense_balances = get_fiscal_branch_balances(db, "5000", year)
    revenue_total = sum((-item["balance"] for item in revenue_balances), Decimal("0.00"))
    expense_total = sum((item["balance"] for item in expense_balances), Decimal("0.00"))
    net_income = revenue_total - expense_total
    description = f"Fiscal year {year} closing entry"
    lines: list[JournalLineCreate] = []
    for item in revenue_balances:
        balance = item["balance"]
        lines.append(JournalLineCreate(
            account=str(item["account"]), debit=float(-balance) if balance < 0 else 0.0,
            credit=float(balance) if balance > 0 else 0.0, cost_center_id=item["cost_center_id"], description=description,
        ))
    for item in expense_balances:
        balance = item["balance"]
        lines.append(JournalLineCreate(
            account=str(item["account"]), debit=float(-balance) if balance < 0 else 0.0,
            credit=float(balance) if balance > 0 else 0.0, cost_center_id=item["cost_center_id"], description=description,
        ))
    if net_income > 0:
        lines.append(JournalLineCreate(account="3100", debit=0.0, credit=float(net_income), description=description))
    elif net_income < 0:
        lines.append(JournalLineCreate(account="3100", debit=float(-net_income), credit=0.0, description=description))
    if not lines:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Fiscal year has no temporary account activity to close")
    total_debit = round(sum(line.debit for line in lines), 2)
    total_credit = round(sum(line.credit for line in lines), 2)
    if total_debit <= 0 or abs(total_debit - total_credit) > 0.01:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Fiscal closing journal must be balanced")
    try:
        validate_journal_posting_lines(db, lines)
    except AccountingHierarchyError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    closed_at = datetime.now(timezone.utc)
    journal_id = str(uuid.uuid4())
    closing_journal = JournalEntry(
        id=journal_id, entry_number=f"CLOSE-{year}-{journal_id[:6]}", entry_date=closed_at,
        fiscal_year=year, reference_type="FiscalYearClose", reference_id=str(year), description=description,
        status="POSTED_TO_MAIN_LEDGER", total_debit=total_debit, total_credit=total_credit,
    )
    audit_context = get_audit_context(request, current_user.email, db)
    try:
        db.add_all([
            closing_journal,
            *[
                JournalLine(
                    id=str(uuid.uuid4()), journal_entry_id=journal_id, account=line.account,
                    debit=line.debit, credit=line.credit, source_debit=line.debit, source_credit=line.credit,
                    base_debit=line.debit, base_credit=line.credit, cost_center_id=line.cost_center_id,
                    description=line.description,
                )
                for line in lines
            ],
            FiscalPeriod(year=year, closed_at=closed_at, closed_by_user_id=closer.id),
            create_structured_audit_log(
                audit_context, "CLOSE_FISCAL_YEAR", "FiscalPeriod", str(year),
                {
                    "total_revenue": float(revenue_total),
                    "total_expenses": float(expense_total),
                    "net_income": float(net_income),
                    "closing_debit": float(total_debit),
                    "closing_credit": float(total_credit),
                },
            ),
        ])
        db.query(JournalEntry).filter(JournalEntry.fiscal_year == year).update(
            {JournalEntry.is_locked: True}, synchronize_session=False
        )
        db.commit()
    except FiscalYearLockedError:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Fiscal year closing could not be committed") from exc

    return {
        "year": year,
        "status": "CLOSED",
        "totalRevenue": float(revenue_total),
        "totalExpenses": float(expense_total),
        "netIncome": float(net_income),
        "journal": {
            "id": closing_journal.id,
            "entryNumber": closing_journal.entry_number,
            "status": closing_journal.status,
            "totalDebit": float(closing_journal.total_debit),
            "totalCredit": float(closing_journal.total_credit),
        },
    }


@app.post("/api/finance/payroll/process-monthly", tags=["Finance"])
async def process_monthly_payroll(
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role.upper() not in {"ADMIN", "CEO"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Admin or CEO users can process payroll")

    contracts = db.query(EmployeeContract).filter(EmployeeContract.is_active.is_(True)).all()
    if not contracts:
        return {"processedEmployees": 0, "totalGrossSalary": 0.0, "totalNetPayout": 0.0, "totalDeductions": 0.0, "journal": None}

    expense_lines: list[JournalLineCreate] = []
    total_gross_salary = Decimal("0.00")
    total_deductions = Decimal("0.00")
    try:
        for contract in contracts:
            gross_salary = (Decimal(contract.base_salary) + Decimal(contract.allowances)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            deductions = Decimal(contract.deductions).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            if deductions > gross_salary:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Contract {contract.id} deductions exceed gross salary")
            expense_lines.append(JournalLineCreate(
                account="5201", debit=float(gross_salary), credit=0.0,
                cost_center_id=contract.cost_center_id, description=f"Monthly salary expense for {contract.employee_name}",
            ))
            total_gross_salary += gross_salary
            total_deductions += deductions
        total_net_payout = total_gross_salary - total_deductions
        lines = [
            *expense_lines,
            JournalLineCreate(account="2300", debit=0.0, credit=float(total_net_payout), description="Monthly salaries and wages payable"),
        ]
        if total_deductions > 0:
            lines.append(JournalLineCreate(account="2310", debit=0.0, credit=float(total_deductions), description="Monthly payroll deductions payable"))
        validate_journal_posting_lines(db, lines)
    except AccountingHierarchyError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    total_debit = round(sum(line.debit for line in lines), 2)
    total_credit = round(sum(line.credit for line in lines), 2)
    if total_debit <= 0 or abs(total_debit - total_credit) > 0.01:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Payroll journal must be balanced")

    journal_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    journal = JournalEntry(
        id=journal_id, entry_number=f"PAY-{now.strftime('%Y%m%d%H%M%S')}-{journal_id[:6]}",
        reference_type="MonthlyPayroll", description="Consolidated monthly payroll",
        status="POSTED_TO_MAIN_LEDGER", total_debit=total_debit, total_credit=total_credit,
    )
    journal_lines = [
        JournalLine(
            id=str(uuid.uuid4()), journal_entry_id=journal_id, account=line.account,
            debit=line.debit, credit=line.credit, cost_center_id=line.cost_center_id,
            description=line.description,
        )
        for line in lines
    ]
    try:
        db.add_all([
            journal,
            *journal_lines,
            AuditLog(
                id=str(uuid.uuid4()), actor_email=current_user.email, action="PROCESS_MONTHLY_PAYROLL",
                entity="JournalEntry", entity_id=journal_id,
                details=f"Processed payroll for {len(contracts)} employees", created_at=now,
            ),
        ])
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Payroll could not be committed") from exc

    return {
        "processedEmployees": len(contracts),
        "totalGrossSalary": float(total_gross_salary),
        "totalNetPayout": float(total_net_payout),
        "totalDeductions": float(total_deductions),
        "journal": {
            "id": journal.id,
            "entryNumber": journal.entry_number,
            "status": journal.status,
            "totalDebit": float(journal.total_debit),
            "totalCredit": float(journal.total_credit),
        },
    }


@app.post("/api/finance/fixed-assets/run-depreciation", tags=["Finance"])
async def run_fixed_asset_depreciation(
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role.upper() not in {"ADMIN", "CEO"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Admin or CEO users can run depreciation")

    assets = db.query(FixedAsset).filter(
        FixedAsset.is_active.is_(True),
        FixedAsset.depreciated_months < FixedAsset.useful_life_months,
    ).all()
    now = datetime.now(timezone.utc)
    generated_journals: list[JournalEntry] = []
    try:
        for asset in assets:
            monthly_depreciation = ((Decimal(asset.purchase_cost) - Decimal(asset.residual_value)) / asset.useful_life_months).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            if monthly_depreciation <= 0:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Asset {asset.id} has no depreciable value")
            description = f"Monthly depreciation for {asset.asset_name} ({asset.depreciated_months + 1}/{asset.useful_life_months})"
            lines = [
                JournalLineCreate(account=asset.expense_account_code, debit=float(monthly_depreciation), credit=0.0, cost_center_id=asset.cost_center_id, description=description),
                JournalLineCreate(account=asset.asset_account_code, debit=0.0, credit=float(monthly_depreciation), description=description),
            ]
            validate_journal_posting_lines(db, lines)
            journal_id = str(uuid.uuid4())
            journal = JournalEntry(
                id=journal_id,
                entry_number=f"DEP-{now.strftime('%Y%m%d%H%M%S')}-{journal_id[:6]}",
                reference_type="FixedAssetDepreciation",
                reference_id=asset.id,
                description=description,
                status="POSTED_TO_MAIN_LEDGER",
                total_debit=float(monthly_depreciation),
                total_credit=float(monthly_depreciation),
            )
            db.add_all([
                journal,
                JournalLine(id=str(uuid.uuid4()), journal_entry_id=journal_id, account=asset.expense_account_code, debit=float(monthly_depreciation), credit=0.0, cost_center_id=asset.cost_center_id, description=description),
                JournalLine(id=str(uuid.uuid4()), journal_entry_id=journal_id, account=asset.asset_account_code, debit=0.0, credit=float(monthly_depreciation), description=description),
            ])
            asset.depreciated_months += 1
            generated_journals.append(journal)
        db.add(AuditLog(
            id=str(uuid.uuid4()), actor_email=current_user.email, action="RUN_DEPRECIATION",
            entity="FixedAsset", details=f"Posted depreciation for {len(generated_journals)} assets", created_at=now,
        ))
        db.commit()
    except AccountingHierarchyError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Depreciation run could not be committed") from exc

    return {
        "processedAssets": len(generated_journals),
        "totalDepreciation": float(sum(Decimal(str(journal.total_debit)) for journal in generated_journals)),
        "journals": [
            {
                "id": journal.id,
                "assetId": journal.reference_id,
                "entryNumber": journal.entry_number,
                "status": journal.status,
                "totalDebit": float(journal.total_debit),
                "totalCredit": float(journal.total_credit),
            }
            for journal in generated_journals
        ],
    }


@app.get("/api/reports/overdue-invoices", tags=["Reports"])
async def get_overdue_invoices(current_user: AuthUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return {
        "status": "success",
        "count": 2,
        "overdue_invoices": [
            {
                "invoice_id": "INV-2608-0012",
                "client": "شركة النفط اليمنية",
                "amount": 4500.0,
                "days_late": 14,
            },
            {
                "invoice_id": "INV-2608-0008",
                "client": "مؤسسة الهادي للتجارة",
                "amount": 1200.0,
                "days_late": 8,
            },
        ],
    }


@app.get("/api/reports/export-pdf", tags=["Reports"])
async def export_financial_statement_pdf(
    report_type: Literal["balance_sheet", "profit_and_loss"],
    fiscal_year: int,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    title, rows = compile_financial_report(db, report_type, fiscal_year)
    buffer = build_financial_report_pdf(title, fiscal_year, rows)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="financial_statement_report.pdf"'},
    )


@app.get("/api/dashboard/summary-cards", tags=["Dashboard"])
async def get_dashboard_summary_cards(
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_year = datetime.now(timezone.utc).year
    return {
        "assets": float(get_branch_balance(db, "1000", current_year)),
        "liabilities": float(-get_branch_balance(db, "2000", current_year)),
        "cash_on_hand": float(get_branch_balance(db, "1100", current_year)),
        "equity": float(-get_branch_balance(db, "3000", current_year)),
    }


@app.get("/api/dashboard/charts/revenue-expense", tags=["Dashboard"])
async def get_dashboard_revenue_expense_chart(
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_revenue_expense_by_month(db, datetime.now(timezone.utc).year)


@app.get("/api/dashboard/charts/cost-centers", tags=["Dashboard"])
async def get_dashboard_cost_center_chart(
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_cost_center_spending(db, datetime.now(timezone.utc).year)
@app.get("/api/operations", response_model=List[OperationResponse], tags=["Operations & Invoicing"])
async def get_operations(
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"Admin", "COO", "Data_Entry", "Accountant"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to operations")

    rows = db.query(Operation).all()
    return [
        OperationResponse(
            id=row.id,
            invoice_id=row.invoice_id,
            profit=row.profit,
            created_at=row.created_at,
            transporter_id=row.transporter_id,
            route=row.route,
            amount=row.amount,
            client_name=row.client_name,
        )
        for row in rows
    ]


@app.post("/api/customers", tags=["Customers"])
async def create_customer(
    payload: CustomerCreate,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"Admin", "COO", "Accountant"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to manage customers")

    customer = Customer(
        id=str(uuid.uuid4()),
        customer_name=payload.customer_name,
        customer_name_en=payload.customer_name_en,
        tax_number=payload.tax_number,
        cr_number=payload.cr_number,
        contact_person=payload.contact_person,
        phone=payload.phone,
        email=payload.email,
        address=payload.address,
        opening_balance=payload.opening_balance,
        credit_limit=payload.credit_limit,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)

    db.add(AuditLog(
        id=str(uuid.uuid4()),
        actor_email=current_user.email,
        action="create_customer",
        entity="customer",
        entity_id=customer.id,
        details=f"Created customer {customer.customer_name}",
    ))
    db.commit()
    return customer


@app.get("/api/customers", tags=["Customers"])
async def get_customers(
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"Admin", "COO", "Accountant", "Data_Entry"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to customers")
    return db.query(Customer).filter_by(is_deleted=False).all()


@app.post("/api/transporters", tags=["Transporters"])
async def create_transporter(
    payload: TransporterCreate,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"Admin", "COO", "Data_Entry"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to manage transporters")

    item = Transporter(
        id=str(uuid.uuid4()),
        transporter_name=payload.transporter_name,
        transporter_name_en=payload.transporter_name_en,
        driver_name=payload.driver_name,
        phone=payload.phone,
        truck_details=payload.truck_details,
        default_truck_no=payload.default_truck_no,
        capacity_tons=payload.capacity_tons,
        rate_per_ton=payload.rate_per_ton,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.get("/api/transporters", tags=["Transporters"])
async def get_transporters(current_user: AuthUser = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in {"Admin", "COO", "Data_Entry", "Accountant"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to transporters")
    return db.query(Transporter).filter_by(is_deleted=False).all()


@app.post("/api/crushers", tags=["Crushers"])
async def create_crusher(
    payload: CrusherCreate,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"Admin", "COO", "Accountant"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to manage crushers")

    item = Crusher(
        id=str(uuid.uuid4()),
        crusher_name=payload.crusher_name,
        crusher_name_en=payload.crusher_name_en,
        location=payload.location,
        bank_details=payload.bank_details,
        account_number=payload.account_number,
        tax_number=payload.tax_number,
        material_produced=payload.material_produced,
        opening_balance=payload.opening_balance,
        contact_person=payload.contact_person,
        phone=payload.phone,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.get("/api/crushers", tags=["Crushers"])
async def get_crushers(current_user: AuthUser = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in {"Admin", "COO", "Accountant", "Data_Entry"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to crushers")
    return db.query(Crusher).filter_by(is_deleted=False).all()


@app.post("/api/invoices", tags=["Invoices"])
async def create_invoice(
    payload: InvoiceCreate,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"Admin", "COO", "Accountant"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to create invoices")

    invoice = Invoice(
        id=str(uuid.uuid4()),
        invoice_number=payload.invoice_number,
        customer_id=payload.customer_id,
        customer_name=payload.customer_name,
        subtotal=payload.subtotal,
        vat_amount=payload.vat_amount,
        grand_total=payload.grand_total,
        status=payload.status,
        due_date=payload.due_date or datetime.now(timezone.utc),
        cost_center_id=payload.cost_center_id,
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice


@app.post("/api/invoices/approve-and-sign/{invoice_id}", tags=["Invoices"])
async def approve_and_sign_invoice(
    invoice_id: str,
    payload: InvoiceSignRequest,
    request: Request,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "CEO":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the CEO can approve and sign invoices")

    invoice = db.query(Invoice).filter_by(id=invoice_id, is_deleted=False).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    if invoice.is_signed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invoice has already been signed and posted")
    if invoice.grand_total <= 0 or abs((invoice.subtotal + invoice.vat_amount) - invoice.grand_total) > 0.01:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invoice totals do not match subtotal plus VAT")
    if not invoice.cost_center_id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invoice requires a leaf cost center before signing")

    previous_invoice_status = invoice.status
    ceo = db.query(User).filter_by(email=current_user.email, is_active=True).first()
    if not ceo:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authenticated CEO user was not found")
    description = f"Signed invoice {invoice.invoice_number}"
    lines = [
        JournalLineCreate(account="1201", debit=round(invoice.grand_total, 2), credit=0.0, description=description),
        JournalLineCreate(account="4101", debit=0.0, credit=round(invoice.subtotal, 2), cost_center_id=invoice.cost_center_id, description=description),
        JournalLineCreate(account="2201", debit=0.0, credit=round(invoice.vat_amount, 2), description=description),
    ]
    total_debit = round(sum(line.debit for line in lines), 2)
    total_credit = round(sum(line.credit for line in lines), 2)
    if total_debit <= 0 or abs(total_debit - total_credit) > 0.01:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Signed invoice journal must be balanced")
    try:
        validate_journal_posting_lines(db, lines)
    except AccountingHierarchyError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    journal_id = str(uuid.uuid4())
    stamped_at = datetime.now(timezone.utc)
    journal = JournalEntry(
        id=journal_id,
        entry_number=f"INV-SIGN-{stamped_at.strftime('%Y%m%d%H%M%S')}-{journal_id[:6]}",
        reference_type="SignedInvoice",
        reference_id=invoice.id,
        description=description,
        status="POSTED_TO_MAIN_LEDGER",
        total_debit=total_debit,
        total_credit=total_credit,
    )
    journal_lines = [
        JournalLine(
            id=str(uuid.uuid4()), journal_entry_id=journal_id, account=line.account,
            debit=line.debit, credit=line.credit, cost_center_id=line.cost_center_id,
            description=line.description,
        )
        for line in lines
    ]
    audit_context = get_audit_context(request, current_user.email, db)
    try:
        invoice.status = "FULLY_SIGNED_AND_ISSUED"
        invoice.is_signed = True
        invoice.electronic_signature_hash = payload.electronic_signature_hash
        invoice.digitally_stamped_at = stamped_at
        invoice.approved_by_user_id = ceo.id
        db.add_all([journal, *journal_lines])
        db.add(create_structured_audit_log(
            audit_context, "APPROVE_AND_SIGN_INVOICE", "Invoice", invoice.id,
            {
                "previous_status": previous_invoice_status,
                "new_status": "FULLY_SIGNED_AND_ISSUED",
                "gross_amount": float(invoice.grand_total),
                "net_revenue": float(invoice.subtotal),
                "vat_amount": float(invoice.vat_amount),
                "total_debit": float(total_debit),
                "total_credit": float(total_credit),
            },
        ))
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Invoice signing could not be committed") from exc

    return {
        "id": invoice.id,
        "status": invoice.status,
        "isSigned": invoice.is_signed,
        "digitallyStampedAt": invoice.digitally_stamped_at,
        "journalEntryId": journal.id,
        "totalDebit": float(journal.total_debit),
        "totalCredit": float(journal.total_credit),
    }


@app.post("/api/invoices/generate-public-link/{invoice_id}", tags=["Invoices"])
async def generate_public_invoice_link(
    invoice_id: str,
    request: Request,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role.upper() not in {"CLERK", "ADMIN", "CEO"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to generate public invoice links")
    invoice = db.query(Invoice).filter_by(id=invoice_id, is_deleted=False).first()
    if invoice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    if not (invoice.is_signed or invoice.status == "FULLY_SIGNED_AND_ISSUED"):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only signed and issued invoices can receive a public link")

    token = PublicInvoiceToken(id=str(uuid.uuid4()), invoice_id=invoice.id, secure_token=secrets.token_urlsafe(16))
    db.add_all([
        token,
        AuditLog(
            id=str(uuid.uuid4()), actor_email=current_user.email, action="GENERATE_PUBLIC_INVOICE_LINK",
            entity="Invoice", entity_id=invoice.id, details="Generated public invoice access token",
        ),
    ])
    db.commit()
    return {"short_url": f"{str(request.base_url).rstrip('/')}/public/invoice/{token.secure_token}"}


@app.get("/public/invoice/{secure_token}", tags=["Public"])
async def view_public_invoice(secure_token: str, request: Request, db: Session = Depends(get_db)):
    token = db.query(PublicInvoiceToken).filter_by(secure_token=secure_token).first()
    now = datetime.now(timezone.utc)
    expires_at = token.expires_at.replace(tzinfo=timezone.utc) if token and token.expires_at.tzinfo is None else (token.expires_at if token else None)
    if token is None or token.is_revoked or expires_at is None or now >= expires_at:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Public invoice link is invalid, expired, or revoked")
    invoice = db.query(Invoice).filter_by(id=token.invoice_id, is_deleted=False).first()
    if invoice is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Public invoice link is invalid, expired, or revoked")

    remote_ip = request.client.host if request.client else "unknown"
    db.add(AuditLog(
        id=str(uuid.uuid4()), actor_email="public@anonymous", action="PUBLIC_INVOICE_OPENED",
        entity="Invoice", entity_id=invoice.id, details=f"Public invoice viewed from remote IP {remote_ip}",
    ))
    db.commit()
    return StreamingResponse(
        build_public_invoice_pdf(invoice),
        media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="Invoice.pdf"'},
    )


@app.post("/api/invoices/{invoice_id}/approve", tags=["Invoices"])
async def approve_invoice_record(invoice_id: str, current_user: AuthUser = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Admin can approve invoices")
    invoice = db.query(Invoice).filter_by(id=invoice_id).first()
    if not invoice or invoice.status not in {"Draft", "Pending_Approval"}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Invoice is not awaiting approval")
    if abs((invoice.subtotal + invoice.vat_amount) - invoice.grand_total) > 0.01:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invoice totals do not match subtotal plus VAT")
    invoice.status = "Approved"
    db.add(AuditLog(id=str(uuid.uuid4()), actor_email=current_user.email, action="APPROVE", entity="Invoice", entity_id=invoice.id, details=f"Approved invoice {invoice.invoice_number}"))
    db.commit()
    return {"id": invoice.id, "status": invoice.status, "approvedBy": current_user.email}


@app.post("/api/invoices/{invoice_id}/issue", tags=["Invoices"])
async def issue_invoice_record(invoice_id: str, current_user: AuthUser = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in {"Admin", "Accountant"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Admin or Accountant can issue invoices")
    invoice = db.query(Invoice).filter_by(id=invoice_id).first()
    if not invoice or invoice.status != "Approved":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only approved invoices can be issued")
    invoice.status = "Issued"
    invoice.issue_date = datetime.now(timezone.utc)
    db.add(AuditLog(id=str(uuid.uuid4()), actor_email=current_user.email, action="ISSUE", entity="Invoice", entity_id=invoice.id, details=f"Issued invoice {invoice.invoice_number}"))
    db.commit()
    return {"id": invoice.id, "status": invoice.status, "issuedAt": invoice.issue_date}


@app.post("/api/invoices/{invoice_id}/pay", tags=["Invoices"])
async def pay_invoice_record(invoice_id: str, current_user: AuthUser = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in {"Admin", "COO", "Accountant"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to record payments")
    invoice = db.query(Invoice).filter_by(id=invoice_id).first()
    if not invoice or invoice.status not in {"Issued", "Overdue"}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only issued or overdue invoices can be paid")
    invoice.status = "Paid"
    db.add(AuditLog(id=str(uuid.uuid4()), actor_email=current_user.email, action="PAY", entity="Invoice", entity_id=invoice.id, details=f"Marked invoice {invoice.invoice_number} as paid"))
    db.commit()
    return {"id": invoice.id, "status": invoice.status, "paidBy": current_user.email}


@app.get("/api/invoices", tags=["Invoices"])
async def list_invoices(current_user: AuthUser = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in {"Admin", "COO", "Accountant", "Guest"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to invoices")
    reconcile_overdue_invoices(db)
    return db.query(Invoice).filter_by(is_deleted=False).order_by(Invoice.created_at.desc()).all()


@app.post("/api/vouchers", tags=["Vouchers"])
async def create_voucher(
    payload: VoucherCreate,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"Admin", "COO", "Accountant"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to create vouchers")
    if payload.amount <= 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Voucher amount must be greater than zero")
    if db.query(Voucher).filter_by(voucher_number=payload.voucher_number).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Voucher number already exists")

    voucher = Voucher(
        id=str(uuid.uuid4()), voucher_type=payload.voucher_type,
        voucher_number=payload.voucher_number, beneficiary=payload.beneficiary,
        amount=round(payload.amount, 2), status=payload.status, notes=payload.notes,
    )
    db.add(voucher)
    db.add(AuditLog(
        id=str(uuid.uuid4()), actor_email=current_user.email, action="CREATE",
        entity="Voucher", entity_id=voucher.id,
        details=f"Created voucher {voucher.voucher_number}",
    ))
    db.commit()
    db.refresh(voucher)
    return voucher


@app.post("/api/journal-entries", tags=["Accounting"])
async def create_journal_entry(
    payload: JournalEntryCreate,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"Admin", "COO", "Accountant"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to create journal entries")
    if len(payload.lines) < 2:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Journal entry requires at least two lines")
    source_total_debit = round(sum(line.debit for line in payload.lines), 2)
    source_total_credit = round(sum(line.credit for line in payload.lines), 2)
    exchange_rate = round(payload.exchange_rate, 8)
    total_debit = round(source_total_debit * exchange_rate, 2)
    total_credit = round(source_total_credit * exchange_rate, 2)
    if total_debit <= 0 or abs(total_debit - total_credit) > 0.01:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Journal entry must be balanced")
    if db.query(JournalEntry).filter_by(entry_number=payload.entry_number).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Journal entry number already exists")
    try:
        validate_journal_posting_lines(db, payload.lines)
    except AccountingHierarchyError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    journal_id = str(uuid.uuid4())
    journal = JournalEntry(
        id=journal_id, entry_number=payload.entry_number,
        entry_date=payload.entry_date or datetime.now(timezone.utc),
        reference_type=payload.reference_type, reference_id=payload.reference_id,
        description=payload.description, status=payload.status,
        currency=payload.currency.upper(), exchange_rate=exchange_rate,
        total_debit=total_debit, total_credit=total_credit,
    )
    lines = [JournalLine(
        id=str(uuid.uuid4()), journal_entry_id=journal_id, account=line.account,
        debit=round(line.debit * exchange_rate, 2), credit=round(line.credit * exchange_rate, 2), cost_center_id=line.cost_center_id,
        source_debit=round(line.debit, 2), source_credit=round(line.credit, 2),
        base_debit=round(line.debit * exchange_rate, 2), base_credit=round(line.credit * exchange_rate, 2),
        description=line.description,
    ) for line in payload.lines]
    db.add_all([journal, *lines])
    db.add(AuditLog(
        id=str(uuid.uuid4()), actor_email=current_user.email, action="CREATE",
        entity="JournalEntry", entity_id=journal_id,
        details=f"Created journal entry {journal.entry_number}",
    ))
    db.commit()
    return {"id": journal_id, "entryNumber": journal.entry_number, "status": journal.status, "totalDebit": total_debit, "totalCredit": total_credit}


@app.patch("/api/vouchers/{voucher_id}", tags=["Vouchers"])
async def update_voucher(
    voucher_id: str,
    payload: VoucherUpdate,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"Admin", "COO", "Accountant"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to edit vouchers")
    voucher = db.query(Voucher).filter_by(id=voucher_id).first()
    if not voucher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voucher not found")
    if voucher.status not in {"Draft", "Pending_Approval"}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only draft or pending vouchers can be edited")
    if payload.amount is not None and payload.amount <= 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Voucher amount must be greater than zero")
    if payload.beneficiary is not None:
        voucher.beneficiary = payload.beneficiary.strip()
    if payload.amount is not None:
        voucher.amount = round(payload.amount, 2)
    if payload.notes is not None:
        voucher.notes = payload.notes.strip()
    db.add(AuditLog(id=str(uuid.uuid4()), actor_email=current_user.email, action="UPDATE", entity="Voucher", entity_id=voucher.id, details=f"Updated voucher {voucher.voucher_number}"))
    db.commit()
    db.refresh(voucher)
    return voucher


@app.patch("/api/journal-entries/{journal_id}", tags=["Accounting"])
async def update_journal_entry(
    journal_id: str,
    payload: JournalEntryUpdate,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"Admin", "COO", "Accountant"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to edit journal entries")
    journal = db.query(JournalEntry).filter_by(id=journal_id).first()
    if not journal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")
    if journal.status != "Draft":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only draft journal entries can be edited")
    if payload.lines is not None:
        if len(payload.lines) < 2:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Journal entry requires at least two lines")
        total_debit = round(sum(line.debit for line in payload.lines), 2)
        total_credit = round(sum(line.credit for line in payload.lines), 2)
        if total_debit <= 0 or abs(total_debit - total_credit) > 0.01:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Journal entry must be balanced")
        try:
            validate_journal_posting_lines(db, payload.lines)
        except AccountingHierarchyError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
        db.query(JournalLine).filter_by(journal_entry_id=journal_id).delete()
        db.add_all([
            JournalLine(
                id=str(uuid.uuid4()), journal_entry_id=journal_id, account=line.account,
                debit=round(line.debit, 2), credit=round(line.credit, 2), cost_center_id=line.cost_center_id,
                description=line.description,
            )
            for line in payload.lines
        ])
        journal.total_debit = total_debit
        journal.total_credit = total_credit
    if payload.description is not None:
        journal.description = payload.description.strip()
    if payload.reference_id is not None:
        journal.reference_id = payload.reference_id.strip()
    db.add(AuditLog(id=str(uuid.uuid4()), actor_email=current_user.email, action="UPDATE", entity="JournalEntry", entity_id=journal.id, details=f"Updated journal entry {journal.entry_number}"))
    db.commit()
    return {"id": journal.id, "status": journal.status, "totalDebit": journal.total_debit, "totalCredit": journal.total_credit}


@app.get("/api/chart-of-accounts/{account_code}/balance", tags=["Accounting"])
async def get_chart_of_account_balance(
    account_code: str,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"Admin", "COO", "Accountant"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to account balances")
    try:
        return get_account_rollup(db, account_code)
    except AccountingHierarchyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@app.post("/api/vouchers/{voucher_id}/approve", tags=["Vouchers"])
async def approve_voucher(
    voucher_id: str,
    payload: UserRegistrationReview,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"Admin", "COO"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only executives can approve vouchers")
    voucher = db.query(Voucher).filter_by(id=voucher_id).first()
    if not voucher or voucher.status not in {"Draft", "Pending_Approval"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pending voucher not found")
    voucher.status = "Approved"
    db.add(AuditLog(
        id=str(uuid.uuid4()), actor_email=current_user.email, action="APPROVE",
        entity="Voucher", entity_id=voucher.id,
        details=payload.notes or f"Approved voucher {voucher.voucher_number}",
    ))
    db.commit()
    return {"id": voucher.id, "status": voucher.status, "approvedBy": current_user.email}


@app.post("/api/vouchers/{voucher_id}/cancel", tags=["Vouchers"])
async def cancel_voucher(
    voucher_id: str,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"Admin", "COO"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only executives can cancel vouchers")
    voucher = db.query(Voucher).filter_by(id=voucher_id).first()
    if not voucher or voucher.status == "Cancelled":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active voucher not found")
    if voucher.status == "Approved":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Approved vouchers require a reversal workflow")
    voucher.status = "Cancelled"
    db.add(AuditLog(
        id=str(uuid.uuid4()), actor_email=current_user.email, action="CANCEL",
        entity="Voucher", entity_id=voucher.id,
        details=f"Cancelled voucher {voucher.voucher_number}",
    ))
    db.commit()
    return {"id": voucher.id, "status": voucher.status}


@app.post("/api/journal-entries/{journal_id}/post", tags=["Accounting"])
async def post_journal_entry(
    journal_id: str,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"Admin", "COO", "CEO"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only executives can post journal entries")
    journal = db.query(JournalEntry).filter_by(id=journal_id).first()
    if not journal or journal.status not in {"Draft", "PENDING_CEO_APPROVAL"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draft or pending journal entry not found")
    journal.status = "POSTED_TO_MAIN_LEDGER" if journal.status == "PENDING_CEO_APPROVAL" else "Posted"
    db.add(AuditLog(
        id=str(uuid.uuid4()), actor_email=current_user.email, action="POST",
        entity="JournalEntry", entity_id=journal.id,
        details=f"Posted journal entry {journal.entry_number}",
    ))
    db.commit()
    return {"id": journal.id, "status": journal.status, "postedBy": current_user.email}


@app.post("/api/journal-entries/{journal_id}/reverse", tags=["Accounting"])
async def reverse_journal_entry(
    journal_id: str,
    current_user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"Admin", "COO"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only executives can reverse journal entries")
    original = db.query(JournalEntry).filter_by(id=journal_id).first()
    if not original or original.status != "Posted":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only posted journal entries can be reversed")
    existing_reversal = db.query(JournalEntry).filter_by(reference_type="Reversal", reference_id=journal_id).first()
    if existing_reversal:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Journal entry has already been reversed")

    reversal_id = str(uuid.uuid4())
    reversal = JournalEntry(
        id=reversal_id,
        entry_number=f"REV-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{reversal_id[:6]}",
        reference_type="Reversal",
        reference_id=journal_id,
        description=f"Reversal of {original.entry_number}: {original.description}",
        status="Posted",
        total_debit=original.total_credit,
        total_credit=original.total_debit,
    )
    original_lines = db.query(JournalLine).filter_by(journal_entry_id=journal_id).all()
    reversal_lines = [JournalLine(
        id=str(uuid.uuid4()), journal_entry_id=reversal_id, account=line.account,
        debit=line.credit, credit=line.debit, description=f"Reversal of {line.description or original.entry_number}",
    ) for line in original_lines]
    db.add_all([reversal, *reversal_lines])
    db.add(AuditLog(
        id=str(uuid.uuid4()), actor_email=current_user.email, action="REVERSE",
        entity="JournalEntry", entity_id=journal_id,
        details=f"Created reversal {reversal.entry_number} for {original.entry_number}",
    ))
    db.commit()
    return {"id": reversal.id, "entryNumber": reversal.entry_number, "referenceId": journal_id, "status": reversal.status, "totalDebit": reversal.total_debit, "totalCredit": reversal.total_credit}
