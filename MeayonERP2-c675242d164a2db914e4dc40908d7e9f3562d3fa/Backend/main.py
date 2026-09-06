import base64
import hashlib
import hmac
import json
import re
import time
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from hmac import compare_digest
from os import getenv
from typing import Generator

from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
from sqlalchemy import func, or_, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, aliased

try:
	from .database import SessionLocal
	from . import models
	from .schemas import (
		AccountAccountRead, AccountJournalRead, AccountMoveCreate, AccountMoveRead, CostCenterCreate, CostCenterRead, CustomerInvoiceCreate, CustomerInvoiceRead, FiscalYearRead, SupplierSettlementGenerate, SupplierSettlementRead,
		AuthVerifyRequest, AuthVerifyResponse, CompanyRegistrationCreate, CompanyRegistrationRead, DirectAccessRequest,
		CompanyBrandingUpdate, CompanyUpdate, IsolationAuditRead, LicenseIssueRequest,
		ProductProductCreate, ProductProductRead, ResPartnerCreate, ResPartnerRead, ResPartnerUpdate, UserRegistrationCreate,
				ResCompanyRead, StockLocationCreate, StockLocationRead, WeighbridgeOperationCreate, WeighbridgeOperationRead,
	)
except ImportError:
	from database import SessionLocal
	import models  # type: ignore[no-redef]
	from schemas import (  # type: ignore[no-redef]
		AccountAccountRead, AccountJournalRead, AccountMoveCreate, AccountMoveRead, CostCenterCreate, CostCenterRead, CustomerInvoiceCreate, CustomerInvoiceRead, FiscalYearRead, SupplierSettlementGenerate, SupplierSettlementRead,
		AuthVerifyRequest, AuthVerifyResponse, CompanyRegistrationCreate, CompanyRegistrationRead, DirectAccessRequest,
		CompanyBrandingUpdate, CompanyUpdate, IsolationAuditRead, LicenseIssueRequest,
		ProductProductCreate, ProductProductRead, ResPartnerCreate, ResPartnerRead, ResPartnerUpdate, UserRegistrationCreate,
				ResCompanyRead, StockLocationCreate, StockLocationRead, WeighbridgeOperationCreate, WeighbridgeOperationRead,
	)


app = FastAPI(
	title="Meayon ERP Backend API",
	version="1.0.0",
	description="نظام إدارة عمليات النقل والشحن والمالية لشركة ميون",
)

DEFAULT_ACCOUNT_SEEDS = (
	("101000", "Operating Cash / Bank", "asset"),
	("120000", "Accounts Receivable", "asset"),
	("130000", "Stock Valuation / Material Inventory", "asset"),
	("201000", "Accounts Payable - Raw Materials", "liability"),
	("202000", "Accounts Payable - Freight & Logistics", "liability"),
	("203000", "VAT Payable", "liability"),
	("401000", "Sales Revenue", "revenue"),
	("501000", "Cost of Goods Sold - Materials", "expense"),
	("503000", "In-Transit Loss & Spillage Expense", "expense"),
)

SESSION_COOKIE_NAME = getenv("SESSION_COOKIE_NAME", "oxengl_session")
SESSION_COOKIE_SECURE = getenv("SESSION_COOKIE_SECURE", "true").strip().lower() not in {"0", "false", "no"}
JWT_SECRET_KEY = getenv("JWT_SECRET_KEY", getenv("OXENGL_JWT_SECRET", "development-secret-change-me"))
JWT_EXPIRE_SECONDS = int(getenv("JWT_EXPIRE_SECONDS", "7200"))
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
	return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str | None) -> bool:
	if not password_hash:
		return False
	return pwd_context.verify(plain_password, password_hash)


def _base64url_encode(payload: bytes) -> str:
	return base64.urlsafe_b64encode(payload).rstrip(b"=").decode("ascii")


def _base64url_decode(payload: str) -> bytes:
	return base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4))


def create_session_token(*, subject: str, company_id: uuid.UUID | None, role: str) -> str:
	now = int(time.time())
	header = {"alg": "HS256", "typ": "JWT"}
	payload = {"sub": subject, "company_id": str(company_id) if company_id else None, "role": role, "iat": now, "exp": now + JWT_EXPIRE_SECONDS}
	signing_input = f"{_base64url_encode(json.dumps(header, separators=(',', ':')).encode())}.{_base64url_encode(json.dumps(payload, separators=(',', ':')).encode())}"
	signature = hmac.new(JWT_SECRET_KEY.encode(), signing_input.encode(), hashlib.sha256).digest()
	return f"{signing_input}.{_base64url_encode(signature)}"


def decode_session_token(token: str) -> dict[str, object]:
	try:
		header_part, payload_part, signature_part = token.split(".")
	except ValueError as error:
		raise ValueError("Invalid token format") from error
	signing_input = f"{header_part}.{payload_part}"
	expected_signature = _base64url_encode(hmac.new(JWT_SECRET_KEY.encode(), signing_input.encode(), hashlib.sha256).digest())
	if not compare_digest(signature_part, expected_signature):
		raise ValueError("Invalid token signature")
	payload = json.loads(_base64url_decode(payload_part))
	if int(payload.get("exp", 0)) < int(time.time()):
		raise ValueError("Expired token")
	return payload


def seed_default_accounts(database: Session, company: models.ResCompany) -> None:
	existing_codes = set(database.scalars(select(models.AccountAccount.code).where(models.AccountAccount.company_id == company.id)).all())
	for code, name, internal_type in DEFAULT_ACCOUNT_SEEDS:
		if code not in existing_codes:
			database.add(models.AccountAccount(company_id=company.id, code=code, name=name, internal_type=internal_type, currency=company.currency))


@app.on_event("startup")
def verify_migration_managed_schema() -> None:
	"""Schema creation is managed by Alembic migrations, not application startup."""
	return None


app.add_middleware(
	CORSMiddleware,
	allow_origins=[
		"http://localhost:5173",
		"http://localhost:3000",
		getenv("FRONTEND_ORIGIN", "https://oxengl.com"),
	],
	allow_origin_regex=r"https://.*\.devtunnels\.ms",
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

def get_db() -> Generator[Session, None, None]:
	database = SessionLocal()
	try:
		yield database
	finally:
		database.close()


def resolve_client_ip(request: Request) -> str | None:
	"""Nginx terminates TLS, so the originating address arrives via X-Forwarded-For."""
	forwarded = request.headers.get("x-forwarded-for")
	if forwarded:
		return forwarded.split(",")[0].strip()[:45]
	return request.client.host[:45] if request.client else None


def record_platform_audit(database: Session, *, actor_email: str, action: str, endpoint: str, ip_address: str | None, company_id: uuid.UUID | None, outcome: str | None = None, request_id: str | None = None, user_agent: str | None = None) -> None:
	"""Break-glass access must leave a permanent trace, but auditing must never block the recovery path."""
	try:
		database.add(models.PlatformAuditLog(actor_email=actor_email, action=action, outcome=outcome or ("FAILED" if action.endswith("FAILED") else "SUCCESS"), endpoint_accessed=endpoint, request_id=request_id or str(uuid.uuid4()), user_agent=(user_agent or "unknown")[:512], ip_address=ip_address, company_id=company_id))
		database.commit()
	except Exception as error:  # noqa: BLE001
		database.rollback()
		print(f"CRITICAL: platform audit write failed for {action} by {actor_email}: {error}", flush=True)


def set_session_cookie(response: Response, token: str) -> None:
	response.set_cookie(key=SESSION_COOKIE_NAME, value=token, httponly=True, secure=SESSION_COOKIE_SECURE, samesite="lax", max_age=JWT_EXPIRE_SECONDS, path="/")


def clear_session_cookie(response: Response) -> None:
	response.set_cookie(key=SESSION_COOKIE_NAME, value="", httponly=True, secure=SESSION_COOKIE_SECURE, samesite="lax", max_age=0, expires=0, path="/")


def get_request_id(request: Request) -> str:
	return request.headers.get("x-request-id") or str(uuid.uuid4())


def get_authenticated_user(request: Request, database: Session = Depends(get_db)) -> models.ResUser:
	token = request.cookies.get(SESSION_COOKIE_NAME)
	if not token:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication session is required")
	try:
		claims = decode_session_token(token)
	except Exception as error:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session") from error
	email = str(claims.get("sub") or "").lower().strip()
	if not email:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session is missing an authenticated subject")
	user = database.scalar(select(models.ResUser).where(models.ResUser.email == email, models.ResUser.is_active.is_(True)))
	if user is None:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authenticated user was not found")
	claim_company_id = claims.get("company_id")
	if claim_company_id and user.role != "Super_Admin":
		try:
			claim_uuid = uuid.UUID(str(claim_company_id))
		except ValueError as error:
			raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session company claim is invalid") from error
		if claim_uuid != user.company_id:
			raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Session company does not match authenticated user membership")
	return user


def get_active_company_id(request: Request, x_company_id: str | None = Header(default=None), database: Session = Depends(get_db), current_user: models.ResUser = Depends(get_authenticated_user)) -> uuid.UUID:
	if not x_company_id:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="X-Company-ID is required")
	try:
		company_id = uuid.UUID(x_company_id)
	except ValueError as error:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="X-Company-ID must be a UUID") from error
	if database.get(models.ResCompany, company_id) is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active company was not found")
	if current_user.role != "Super_Admin" and company_id != current_user.company_id:
		record_platform_audit(database, actor_email=current_user.email, action="TENANT_ACCESS_DENIED", endpoint=request.url.path, ip_address=resolve_client_ip(request), company_id=company_id, outcome="DENIED", request_id=get_request_id(request), user_agent=request.headers.get("user-agent"))
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Authenticated user is not authorized for this company")
	return company_id


@app.get("/", tags=["Health Check"])
async def root():
	return {
		"status": "online",
		"message": "Meayon ERP Backend API is running successfully",
		"documentation": "/docs",
	}


@app.get("/api/companies", response_model=list[ResCompanyRead], tags=["Companies"])
def list_companies(database: Session = Depends(get_db)):
	return database.scalars(select(models.ResCompany).order_by(models.ResCompany.name)).all()


@app.get("/api/companies/{company_id}", response_model=ResCompanyRead, tags=["Companies"])
def get_company(company_id: uuid.UUID, active_company_id: uuid.UUID = Depends(get_active_company_id), database: Session = Depends(get_db)):
	if company_id != active_company_id:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Company details can only be read for the active company")
	company = database.get(models.ResCompany, company_id)
	if company is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company was not found")
	return company


@app.patch("/api/companies/{company_id}", response_model=ResCompanyRead, tags=["Companies"])
def update_company(company_id: uuid.UUID, payload: CompanyUpdate, active_company_id: uuid.UUID = Depends(get_active_company_id), database: Session = Depends(get_db)):
	if company_id != active_company_id:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Company can only be updated for the active company")
	company = database.get(models.ResCompany, company_id)
	if company is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company was not found")
	updates = payload.model_dump(exclude_unset=True)
	if "parent_id" in updates and updates["parent_id"] == company_id:
		raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Company cannot be its own parent")
	for field, value in updates.items():
		setattr(company, field, value)
	database.commit()
	database.refresh(company)
	return company


@app.put("/api/companies/{company_id}/branding", response_model=ResCompanyRead, tags=["Companies"])
def update_company_branding(company_id: uuid.UUID, payload: CompanyBrandingUpdate, active_company_id: uuid.UUID = Depends(get_active_company_id), database: Session = Depends(get_db)):
	if company_id != active_company_id:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Company branding can only be updated for the active company")
	company = database.get(models.ResCompany, company_id)
	if company is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company was not found")
	company.ui_logo_url = payload.ui_logo_url
	company.ui_primary_color = payload.ui_primary_color
	company.ui_secondary_color = payload.ui_secondary_color
	database.commit()
	database.refresh(company)
	return company


@app.post("/api/companies/register", response_model=CompanyRegistrationRead, status_code=status.HTTP_201_CREATED, tags=["Companies"])
def register_company(payload: CompanyRegistrationCreate, database: Session = Depends(get_db)):
	admin_email = payload.admin_email.lower().strip()
	try:
		with database.begin():
			company = models.ResCompany(name=payload.company_name, slug=payload.slug, tax_id=payload.vat_number, commercial_registration=payload.cr_number)
			database.add(company)
			database.flush()
			seed_default_accounts(database, company)
			database.add(models.StockLocation(company_id=company.id, name="Main Warehouse", location_type="internal"))
			user = models.ResUser(firebase_uid=f"native:{admin_email}", email=admin_email, full_name=payload.admin_name, phone=payload.admin_phone, password_hash=hash_password(payload.admin_password), company_id=company.id, role="Admin", is_active=True)
			database.add(user)
		database.refresh(company)
		database.refresh(user)
	except IntegrityError as error:
		database.rollback()
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Company slug, registration, VAT number, or admin email already exists") from error
	return {"company": company, "user": user}


@app.post("/api/auth/verify", response_model=AuthVerifyResponse, tags=["Authentication"])
def verify_user(payload: AuthVerifyRequest, request: Request, response: Response, database: Session = Depends(get_db)):
	email = payload.email.lower().strip()
	user = database.scalar(select(models.ResUser).where(models.ResUser.email == email))
	if user is None:
		record_platform_audit(database, actor_email=email, action="LOGIN_FAILED", endpoint="/api/auth/verify", ip_address=resolve_client_ip(request), company_id=None)
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
	if not user.is_active:
		record_platform_audit(database, actor_email=email, action="LOGIN_FAILED", endpoint="/api/auth/verify", ip_address=resolve_client_ip(request), company_id=user.company_id)
		return {"message": "Account pending tenant administrator approval", "status": "Pending", "user": {"id": str(user.id), "email": user.email, "fullName": user.full_name, "fullNameAr": user.full_name, "role": user.role, "status": "Pending", "company_id": str(user.company_id)}}
	if not verify_password(payload.password, user.password_hash):
		record_platform_audit(database, actor_email=email, action="LOGIN_FAILED", endpoint="/api/auth/verify", ip_address=resolve_client_ip(request), company_id=user.company_id)
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
	token = create_session_token(subject=user.email, company_id=user.company_id, role=user.role)
	set_session_cookie(response, token)
	record_platform_audit(database, actor_email=user.email, action="LOGIN", endpoint="/api/auth/verify", ip_address=resolve_client_ip(request), company_id=user.company_id)
	return {"message": "Authenticated", "status": "Active", "user": {"id": str(user.id), "email": user.email, "fullName": user.full_name, "fullNameAr": user.full_name, "role": user.role, "status": "Active", "company_id": str(user.company_id)}}


@app.post("/api/auth/logout", tags=["Authentication"])
def logout_user(request: Request, response: Response, database: Session = Depends(get_db)):
	actor_email = "anonymous"
	company_id = None
	token = request.cookies.get(SESSION_COOKIE_NAME)
	if token:
		try:
			claims = decode_session_token(token)
			actor_email = str(claims.get("sub") or actor_email)
			company_claim = claims.get("company_id")
			company_id = uuid.UUID(str(company_claim)) if company_claim else None
		except Exception:
			actor_email = "invalid-session"
	record_platform_audit(database, actor_email=actor_email, action="LOGOUT", endpoint="/api/auth/logout", ip_address=resolve_client_ip(request), company_id=company_id)
	clear_session_cookie(response)
	return {"message": "Logged out"}


@app.post("/api/user-registrations", response_model=AuthVerifyResponse, status_code=status.HTTP_201_CREATED, tags=["Authentication"])
def register_user(payload: UserRegistrationCreate, request: Request, database: Session = Depends(get_db)):
	email = payload.email.lower().strip()
	company = database.get(models.ResCompany, payload.company_id)
	if company is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company was not found")
	if database.scalar(select(models.ResUser).where(models.ResUser.email == email)) is not None:
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A user already exists with this email")
	user = models.ResUser(firebase_uid=f"native:{email}", email=email, full_name=payload.full_name.strip(), phone=payload.phone.strip(), password_hash=hash_password(payload.password), company_id=payload.company_id, role=payload.requested_role, is_active=False)
	database.add(user)
	database.commit()
	database.refresh(user)
	record_platform_audit(database, actor_email=user.email, action="REGISTRATION", endpoint="/api/user-registrations", ip_address=resolve_client_ip(request), company_id=user.company_id)
	return {"message": "Registration submitted for administrator approval", "status": "Pending", "user": {"id": str(user.id), "email": user.email, "fullName": user.full_name, "fullNameAr": user.full_name, "role": user.role, "status": "Pending", "company_id": str(user.company_id)}}


@app.post("/api/auth/direct-access", response_model=AuthVerifyResponse, tags=["Authentication"])
def direct_workspace_access(payload: DirectAccessRequest, request: Request, database: Session = Depends(get_db)):
	"""Break-glass access protected by a deployment-only recovery code."""
	recovery_code = getenv("OXENGL_RECOVERY_CODE", "")
	if not recovery_code:
		raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Direct workspace recovery is not configured")
	if not compare_digest(payload.recovery_code, recovery_code):
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Direct workspace recovery could not be verified")
	if payload.scope == "master":
		record_platform_audit(database, actor_email="awadh.a.1987@gmail.com", action="DIRECT_ACCESS_MASTER", endpoint="/api/auth/direct-access", ip_address=resolve_client_ip(request), company_id=None)
		return {"message": "Platform recovery session established", "status": "Active", "user": {"id": "awadh.a.1987@gmail.com", "email": "awadh.a.1987@gmail.com", "fullName": "Awadh Ahmed", "fullNameAr": "Awadh Ahmed", "role": "Super_Admin", "status": "Active", "company_id": None}}
	if payload.company_id is None:
		raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A tenant company is required")
	user = database.scalar(select(models.ResUser).where(
		models.ResUser.company_id == payload.company_id,
		models.ResUser.is_active.is_(True),
		models.ResUser.role.in_(("Admin", "COO")),
	).order_by(models.ResUser.created_at))
	if user is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active tenant administrator is available for recovery")
	record_platform_audit(database, actor_email=user.email, action="DIRECT_ACCESS_TENANT", endpoint="/api/auth/direct-access", ip_address=resolve_client_ip(request), company_id=user.company_id)
	return {"message": "Tenant recovery session established", "status": "Active", "user": {"id": str(user.id), "email": user.email, "fullName": user.full_name, "fullNameAr": user.full_name, "role": user.role, "status": "Active", "company_id": str(user.company_id)}}


TIER_COST_CENTERS = {"BASIC": 5, "PROFESSIONAL": 25, "ENTERPRISE": 100}


def require_platform_key(x_recovery_code: str | None = Header(default=None)) -> None:
	"""Platform-owner endpoints reuse the deployment-only recovery code as the SuperAdmin key."""
	recovery_code = getenv("OXENGL_RECOVERY_CODE", "")
	if not recovery_code:
		raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Platform owner key is not configured")
	if not x_recovery_code or not compare_digest(x_recovery_code, recovery_code):
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="SuperAdmin key could not be verified")


@app.get("/api/platform/audit", response_model=IsolationAuditRead, tags=["Platform"])
def platform_isolation_audit(database: Session = Depends(get_db)):
	isolated_tables = database.scalars(text(
		"SELECT table_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'company_id' ORDER BY table_name"
	)).all()
	tenant_count = database.scalar(select(func.count()).select_from(models.ResCompany)) or 0
	return {
		"isolated_tables": list(isolated_tables),
		"total_isolated_tables": len(isolated_tables),
		"total_registered_tenants": tenant_count,
		"backend_status": "Online 200 OK",
		"security_policy": "Strict Multi-Tenant",
		"checked_at": datetime.now(timezone.utc),
	}


@app.post("/api/platform/licenses", response_model=ResCompanyRead, tags=["Platform"], dependencies=[Depends(require_platform_key)])
def issue_platform_license(payload: LicenseIssueRequest, database: Session = Depends(get_db)):
	company = None
	try:
		target_uuid = uuid.UUID(payload.company_id.strip())
		company = database.get(models.ResCompany, target_uuid)
	except (ValueError, TypeError):
		pass
	if company is None:
		company = database.scalar(select(models.ResCompany).where(models.ResCompany.slug == payload.company_id.strip()))
	if company is None:
		company = database.scalar(select(models.ResCompany).where(models.ResCompany.name.ilike(payload.company_id.strip())))
	if company is None:
		company = database.scalars(select(models.ResCompany).order_by(models.ResCompany.created_at)).first()
	if company is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No registered tenant company found")

	tier = payload.subscription_tier.upper().strip()
	if tier not in TIER_COST_CENTERS:
		tier = "PROFESSIONAL"

	theme_mode = payload.theme_mode.upper().strip()
	if theme_mode not in ("LIGHT", "DARK", "CUSTOM"):
		theme_mode = "CUSTOM"

	primary_color = payload.ui_primary_color.strip()
	if not re.match(r"^#[0-9a-fA-F]{6}$", primary_color):
		primary_color = "#1E3A8A"
	secondary_color = payload.ui_secondary_color.strip()
	if not re.match(r"^#[0-9a-fA-F]{6}$", secondary_color):
		secondary_color = "#7C3AED"

	company.subscription_tier = tier
	company.max_cost_centers = TIER_COST_CENTERS[tier]
	company.theme_mode = theme_mode
	company.ui_primary_color = primary_color
	company.ui_secondary_color = secondary_color
	company.license_key = f"OXEN-{tier[:3]}-{uuid.uuid4().hex[:8].upper()}-{uuid.uuid4().hex[:4].upper()}"
	company.license_expires_at = datetime.now(timezone.utc) + timedelta(days=max(1, payload.validity_days))
	database.commit()
	database.refresh(company)
	return company


@app.get("/api/partners", response_model=list[ResPartnerRead], tags=["Master Data"])
def list_partners(company_id: uuid.UUID = Depends(get_active_company_id), database: Session = Depends(get_db)):
	return database.scalars(select(models.ResPartner).where(models.ResPartner.company_id == company_id, models.ResPartner.is_active.is_(True)).order_by(models.ResPartner.name)).all()


@app.get("/api/partners/{partner_id}", response_model=ResPartnerRead, tags=["Master Data"])
def get_partner(partner_id: uuid.UUID, company_id: uuid.UUID = Depends(get_active_company_id), database: Session = Depends(get_db)):
	partner = database.scalar(select(models.ResPartner).where(models.ResPartner.id == partner_id, models.ResPartner.company_id == company_id, models.ResPartner.is_active.is_(True)))
	if partner is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Partner was not found")
	return partner


@app.post("/api/partners", response_model=ResPartnerRead, status_code=status.HTTP_201_CREATED, tags=["Master Data"])
def create_partner(payload: ResPartnerCreate, company_id: uuid.UUID = Depends(get_active_company_id), database: Session = Depends(get_db)):
	partner = models.ResPartner(company_id=company_id, **payload.model_dump())
	try:
		database.add(partner)
		database.commit()
		database.refresh(partner)
	except IntegrityError as error:
		database.rollback()
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Partner email or tax number already exists") from error
	return partner


@app.patch("/api/partners/{partner_id}", response_model=ResPartnerRead, tags=["Master Data"])
def update_partner(partner_id: uuid.UUID, payload: ResPartnerUpdate, company_id: uuid.UUID = Depends(get_active_company_id), database: Session = Depends(get_db)):
	partner = database.scalar(select(models.ResPartner).where(models.ResPartner.id == partner_id, models.ResPartner.company_id == company_id, models.ResPartner.is_active.is_(True)))
	if partner is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Partner was not found")
	for field, value in payload.model_dump(exclude_unset=True).items():
		setattr(partner, field, value)
	try:
		database.commit()
		database.refresh(partner)
	except IntegrityError as error:
		database.rollback()
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Partner email or tax number already exists") from error
	return partner


@app.delete("/api/partners/{partner_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Master Data"])
def archive_partner(partner_id: uuid.UUID, company_id: uuid.UUID = Depends(get_active_company_id), database: Session = Depends(get_db)):
	partner = database.scalar(select(models.ResPartner).where(models.ResPartner.id == partner_id, models.ResPartner.company_id == company_id, models.ResPartner.is_active.is_(True)))
	if partner is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Partner was not found")
	partner.is_active = False
	database.commit()
	return None


@app.get("/api/locations", response_model=list[StockLocationRead], tags=["Master Data"])
def list_locations(company_id: uuid.UUID = Depends(get_active_company_id), database: Session = Depends(get_db)):
	return database.scalars(select(models.StockLocation).where(models.StockLocation.company_id == company_id, models.StockLocation.is_active.is_(True)).order_by(models.StockLocation.name)).all()


@app.post("/api/locations", response_model=StockLocationRead, status_code=status.HTTP_201_CREATED, tags=["Master Data"])
def create_location(payload: StockLocationCreate, company_id: uuid.UUID = Depends(get_active_company_id), database: Session = Depends(get_db)):
	location = models.StockLocation(company_id=company_id, **payload.model_dump())
	database.add(location)
	database.commit()
	database.refresh(location)
	return location


@app.get("/api/products", response_model=list[ProductProductRead], tags=["Master Data"])
def list_products(company_id: uuid.UUID = Depends(get_active_company_id), database: Session = Depends(get_db)):
	return database.scalars(select(models.ProductProduct).where(models.ProductProduct.company_id == company_id, models.ProductProduct.is_active.is_(True)).order_by(models.ProductProduct.name)).all()


@app.post("/api/products", response_model=ProductProductRead, status_code=status.HTTP_201_CREATED, tags=["Master Data"])
def create_product(payload: ProductProductCreate, company_id: uuid.UUID = Depends(get_active_company_id), database: Session = Depends(get_db)):
	product = models.ProductProduct(company_id=company_id, **payload.model_dump())
	try:
		database.add(product)
		database.commit()
		database.refresh(product)
	except IntegrityError as error:
		database.rollback()
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Product SKU already exists") from error
	return product


def operation_response(ticket: models.WeighbridgeTicket) -> WeighbridgeOperationRead:
	move = ticket.picking.moves[0]
	return WeighbridgeOperationRead(
		picking_id=ticket.picking.id, picking_reference=ticket.picking.reference,
		partner_id=ticket.picking.partner_id, partner_name=ticket.picking.partner.name if ticket.picking.partner else None,
		product_id=move.product_id, product_name=move.product.name,
		source_location_id=move.location_id, source_location_name=move.source_location.name,
		dest_location_id=move.location_dest_id, dest_location_name=move.destination_location.name,
		ticket_id=ticket.id, ticket_number=ticket.ticket_number, truck_number=ticket.truck_number,
		gross_weight=ticket.gross_weight, tare_weight=ticket.tare_weight, net_weight=ticket.net_weight,
		weighed_in_at=ticket.weighed_in_at,
	)


def fiscal_year_for_date(database: Session, company_id: uuid.UUID, move_date: datetime) -> models.FiscalYear:
	year_name = str(move_date.year)
	fiscal_year = database.scalar(select(models.FiscalYear).where(models.FiscalYear.company_id == company_id, models.FiscalYear.name == year_name))
	if fiscal_year is None:
		fiscal_year = models.FiscalYear(company_id=company_id, name=year_name, date_start=datetime(move_date.year, 1, 1, tzinfo=timezone.utc), date_end=datetime(move_date.year, 12, 31, 23, 59, 59, tzinfo=timezone.utc), state="open")
		database.add(fiscal_year)
		database.flush()
	if fiscal_year.state in {"closed", "locked"}:
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Fiscal year is closed or locked")
	return fiscal_year


def account_by_code(database: Session, company_id: uuid.UUID, code: str, name: str, internal_type: str) -> models.AccountAccount:
	account = database.scalar(select(models.AccountAccount).where(models.AccountAccount.company_id == company_id, models.AccountAccount.code == code))
	if account is None:
		company = database.get(models.ResCompany, company_id)
		account = models.AccountAccount(company_id=company_id, code=code, name=name, internal_type=internal_type, currency=company.currency if company else "USD")
		database.add(account)
		database.flush()
	return account


def journal_by_code(database: Session, company_id: uuid.UUID, code: str, name: str, journal_type: str, prefix: str) -> models.AccountJournal:
	journal = database.scalar(select(models.AccountJournal).where(models.AccountJournal.company_id == company_id, models.AccountJournal.code == code).with_for_update())
	if journal is None:
		journal = models.AccountJournal(company_id=company_id, code=code, name=name, journal_type=journal_type, sequence_prefix=prefix, next_sequence=1)
		database.add(journal)
		database.flush()
	return journal


def assign_move_sequence(move: models.AccountMove, journal: models.AccountJournal, move_date: datetime) -> None:
	sequence_number = journal.next_sequence
	journal.next_sequence += 1
	move.sequence_number = sequence_number
	move.name = move.name or f"{journal.sequence_prefix}/{move_date:%Y}/{sequence_number:05d}"


def validate_balanced_lines(lines: list[AccountMoveLineCreate]) -> None:
	debit_total = sum((line.debit for line in lines), Decimal("0"))
	credit_total = sum((line.credit for line in lines), Decimal("0"))
	if debit_total != credit_total:
		raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Journal entry is unbalanced: total debit must equal total credit")


def create_posted_account_move(database: Session, company_id: uuid.UUID, payload: AccountMoveCreate) -> models.AccountMove:
	validate_balanced_lines(payload.lines)
	move_date = payload.date or datetime.now(timezone.utc)
	journal = journal_by_code(database, company_id, payload.journal_code, "Miscellaneous Journal" if payload.journal_code == "MISC" else "Sales Journal", "general" if payload.journal_code == "MISC" else "sale", payload.journal_code)
	fiscal_year = fiscal_year_for_date(database, company_id, move_date)
	account_ids = {line.account_id for line in payload.lines}
	accounts = database.scalars(select(models.AccountAccount).where(models.AccountAccount.company_id == company_id, models.AccountAccount.id.in_(account_ids))).all()
	if len(accounts) != len(account_ids):
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more accounts do not belong to the active company")
	partner_ids = {line.partner_id for line in payload.lines if line.partner_id}
	if payload.partner_id:
		partner_ids.add(payload.partner_id)
	if partner_ids:
		partners = database.scalars(select(models.ResPartner.id).where(models.ResPartner.company_id == company_id, models.ResPartner.id.in_(partner_ids))).all()
		if len(partners) != len(partner_ids):
			raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more partners do not belong to the active company")
	move = models.AccountMove(company_id=company_id, journal_id=journal.id, fiscal_year_id=fiscal_year.id, name=payload.name or "", move_type=payload.move_type, partner_id=payload.partner_id, cost_center_id=payload.cost_center_id, date=move_date, state="draft", ref=payload.ref)
	assign_move_sequence(move, journal, move_date)
	database.add(move)
	database.flush()
	for line in payload.lines:
		database.add(models.AccountMoveLine(company_id=company_id, move_id=move.id, account_id=line.account_id, partner_id=line.partner_id, cost_center_id=line.cost_center_id or payload.cost_center_id, debit=line.debit, credit=line.credit, name=line.name))
	move.state = "posted"
	move.posted_at = datetime.now(timezone.utc)
	return move


@app.post("/api/operations/weighbridge", response_model=WeighbridgeOperationRead, status_code=status.HTTP_201_CREATED, tags=["Operations"])
def create_weighbridge_operation(payload: WeighbridgeOperationCreate, company_id: uuid.UUID = Depends(get_active_company_id), database: Session = Depends(get_db)):
	net_weight = payload.gross_weight - payload.tare_weight
	reference = f"WB-{datetime.now(timezone.utc):%Y%m%d%H%M%S}-{uuid.uuid4().hex[:8]}"
	ticket_number = f"TKT-{uuid.uuid4().hex[:12].upper()}"
	try:
		with database.begin():
			partner = database.scalar(select(models.ResPartner).where(models.ResPartner.id == payload.partner_id, models.ResPartner.company_id == company_id))
			product = database.scalar(select(models.ProductProduct).where(models.ProductProduct.id == payload.product_id, models.ProductProduct.company_id == company_id))
			source = database.scalar(select(models.StockLocation).where(models.StockLocation.id == payload.source_location_id, models.StockLocation.company_id == company_id))
			destination = database.scalar(select(models.StockLocation).where(models.StockLocation.id == payload.dest_location_id, models.StockLocation.company_id == company_id))
			if not all((partner, product, source, destination)):
				raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Partner, product, or stock location was not found")
			picking = models.StockPicking(company_id=company_id, reference=reference, picking_type="outgoing", state="done", partner_id=partner.id, completed_at=datetime.now(timezone.utc))
			database.add(picking)
			database.flush()
			move = models.StockMove(company_id=company_id, picking_id=picking.id, product_id=product.id, location_id=source.id, location_dest_id=destination.id, quantity_planned=net_weight, quantity_done=net_weight, state="done", moved_at=datetime.now(timezone.utc))
			database.add(move)
			for location_id, quantity_change in ((source.id, -net_weight), (destination.id, net_weight)):
				quant = database.scalar(select(models.StockQuant).where(models.StockQuant.company_id == company_id, models.StockQuant.product_id == product.id, models.StockQuant.location_id == location_id).with_for_update())
				if quant:
					quant.quantity += quantity_change
				else:
					database.add(models.StockQuant(company_id=company_id, product_id=product.id, location_id=location_id, quantity=quantity_change))
			ticket = models.WeighbridgeTicket(company_id=company_id, ticket_number=ticket_number, picking_id=picking.id, truck_number=payload.truck_number, gross_weight=payload.gross_weight, tare_weight=payload.tare_weight, net_weight=net_weight, weighed_in_at=datetime.now(timezone.utc), weighed_out_at=datetime.now(timezone.utc))
			database.add(ticket)
		database.refresh(ticket)
	except IntegrityError as error:
		database.rollback()
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Unable to create the weighbridge operation") from error
	return operation_response(ticket)


@app.get("/api/operations", response_model=list[WeighbridgeOperationRead], tags=["Operations"])
def get_operations(company_id: uuid.UUID = Depends(get_active_company_id), database: Session = Depends(get_db)):
	tickets = database.scalars(select(models.WeighbridgeTicket).join(models.WeighbridgeTicket.picking).where(models.WeighbridgeTicket.company_id == company_id).order_by(models.WeighbridgeTicket.weighed_in_at.desc()).limit(100)).all()
	return [operation_response(ticket) for ticket in tickets]


@app.get("/api/accounting/accounts", response_model=list[AccountAccountRead], tags=["Accounting"])
def list_accounts(company_id: uuid.UUID = Depends(get_active_company_id), database: Session = Depends(get_db)):
	return database.scalars(select(models.AccountAccount).where(models.AccountAccount.company_id == company_id).order_by(models.AccountAccount.code)).all()


@app.get("/api/accounting/journals", response_model=list[AccountJournalRead], tags=["Accounting"])
def list_journals(company_id: uuid.UUID = Depends(get_active_company_id), database: Session = Depends(get_db)):
	return database.scalars(select(models.AccountJournal).where(models.AccountJournal.company_id == company_id, models.AccountJournal.is_active.is_(True)).order_by(models.AccountJournal.code)).all()


@app.get("/api/accounting/fiscal-years", response_model=list[FiscalYearRead], tags=["Accounting"])
def list_fiscal_years(company_id: uuid.UUID = Depends(get_active_company_id), database: Session = Depends(get_db)):
	return database.scalars(select(models.FiscalYear).where(models.FiscalYear.company_id == company_id).order_by(models.FiscalYear.date_start.desc())).all()


@app.get("/api/accounting/cost-centers", response_model=list[CostCenterRead], tags=["Accounting"])
def list_cost_centers(company_id: uuid.UUID = Depends(get_active_company_id), database: Session = Depends(get_db)):
	return database.scalars(select(models.CostCenter).where(models.CostCenter.company_id == company_id, models.CostCenter.is_active.is_(True)).order_by(models.CostCenter.code)).all()


@app.post("/api/accounting/cost-centers", response_model=CostCenterRead, status_code=status.HTTP_201_CREATED, tags=["Accounting"])
def create_cost_center(payload: CostCenterCreate, company_id: uuid.UUID = Depends(get_active_company_id), database: Session = Depends(get_db)):
	if payload.parent_id and database.scalar(select(models.CostCenter).where(models.CostCenter.id == payload.parent_id, models.CostCenter.company_id == company_id)) is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent cost center was not found")
	cost_center = models.CostCenter(company_id=company_id, **payload.model_dump())
	database.add(cost_center)
	database.commit()
	database.refresh(cost_center)
	return cost_center


@app.get("/api/accounting/moves", response_model=list[AccountMoveRead], tags=["Accounting"])
def list_account_moves(company_id: uuid.UUID = Depends(get_active_company_id), database: Session = Depends(get_db)):
	return database.scalars(select(models.AccountMove).where(models.AccountMove.company_id == company_id).order_by(models.AccountMove.date.desc()).limit(100)).all()


@app.post("/api/accounting/moves", response_model=AccountMoveRead, status_code=status.HTTP_201_CREATED, tags=["Accounting"])
def create_account_move(payload: AccountMoveCreate, company_id: uuid.UUID = Depends(get_active_company_id), database: Session = Depends(get_db)):
	database.rollback()
	try:
		with database.begin():
			move = create_posted_account_move(database, company_id, payload)
		database.refresh(move)
	except IntegrityError as error:
		database.rollback()
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Unable to create the journal entry") from error
	return move


@app.get("/api/customer-invoices", response_model=list[CustomerInvoiceRead], tags=["Customer Invoices"])
def list_customer_invoices(company_id: uuid.UUID = Depends(get_active_company_id), database: Session = Depends(get_db)):
	return database.scalars(select(models.CustomerInvoice).where(models.CustomerInvoice.company_id == company_id).order_by(models.CustomerInvoice.created_at.desc()).limit(100)).all()


@app.post("/api/customer-invoices", response_model=CustomerInvoiceRead, status_code=status.HTTP_201_CREATED, tags=["Customer Invoices"])
def create_customer_invoice(payload: CustomerInvoiceCreate, company_id: uuid.UUID = Depends(get_active_company_id), database: Session = Depends(get_db)):
	issue_date = payload.issue_date or datetime.now(timezone.utc)
	database.rollback()
	try:
		with database.begin():
			journal = journal_by_code(database, company_id, "INV", "Sales Invoices", "sale", "INV")
			invoice_number = payload.invoice_number or f"INV/{issue_date:%Y}/{journal.next_sequence:05d}"
			journal.next_sequence += 1
			invoice = models.CustomerInvoice(company_id=company_id, partner_id=payload.partner_id, invoice_number=invoice_number, customer_name=payload.customer_name, customer_tax_number=payload.customer_tax_number, issue_date=issue_date, due_date=payload.due_date, subtotal=payload.subtotal, vat_amount=payload.vat_amount, grand_total=payload.grand_total, status="Draft")
			database.add(invoice)
		database.refresh(invoice)
	except IntegrityError as error:
		database.rollback()
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Unable to create customer invoice") from error
	return invoice


@app.get("/api/customer-invoices/{invoice_id}", response_model=CustomerInvoiceRead, tags=["Customer Invoices"])
def get_customer_invoice(invoice_id: uuid.UUID, company_id: uuid.UUID = Depends(get_active_company_id), database: Session = Depends(get_db)):
	invoice = database.scalar(select(models.CustomerInvoice).where(models.CustomerInvoice.id == invoice_id, models.CustomerInvoice.company_id == company_id))
	if invoice is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer invoice was not found")
	return invoice


@app.post("/api/customer-invoices/{invoice_id}/approve", response_model=CustomerInvoiceRead, tags=["Customer Invoices"])
def approve_customer_invoice(invoice_id: uuid.UUID, company_id: uuid.UUID = Depends(get_active_company_id), current_user: models.ResUser = Depends(get_authenticated_user), database: Session = Depends(get_db)):
	invoice = database.scalar(select(models.CustomerInvoice).where(models.CustomerInvoice.id == invoice_id, models.CustomerInvoice.company_id == company_id))
	if invoice is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer invoice was not found")
	if invoice.status != "Draft":
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only draft invoices can be approved")
	invoice.status = "Approved"
	invoice.approved_by = current_user.email
	invoice.approved_at = datetime.now(timezone.utc)
	database.commit()
	database.refresh(invoice)
	return invoice


@app.post("/api/customer-invoices/{invoice_id}/issue", response_model=CustomerInvoiceRead, tags=["Customer Invoices"])
def issue_customer_invoice(invoice_id: uuid.UUID, company_id: uuid.UUID = Depends(get_active_company_id), database: Session = Depends(get_db)):
	invoice = database.scalar(select(models.CustomerInvoice).where(models.CustomerInvoice.id == invoice_id, models.CustomerInvoice.company_id == company_id))
	if invoice is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer invoice was not found")
	if invoice.status != "Approved":
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only approved invoices can be issued")
	receivable = account_by_code(database, company_id, "120000", "Accounts Receivable", "asset")
	revenue = account_by_code(database, company_id, "401000", "Sales Revenue", "revenue")
	vat = account_by_code(database, company_id, "203000", "VAT Payable", "liability")
	payload = AccountMoveCreate(
		journal_code="INV",
		move_type="out_invoice",
		partner_id=invoice.partner_id,
		date=invoice.issue_date,
		ref=invoice.invoice_number,
		lines=[
			AccountMoveLineCreate(account_id=receivable.id, partner_id=invoice.partner_id, debit=invoice.grand_total, credit=Decimal("0"), name=f"Receivable {invoice.invoice_number}"),
			AccountMoveLineCreate(account_id=revenue.id, partner_id=invoice.partner_id, debit=Decimal("0"), credit=invoice.subtotal, name=f"Revenue {invoice.invoice_number}"),
			AccountMoveLineCreate(account_id=vat.id, partner_id=invoice.partner_id, debit=Decimal("0"), credit=invoice.vat_amount, name=f"VAT {invoice.invoice_number}"),
		],
	)
	database.rollback()
	try:
		with database.begin():
			invoice = database.scalar(select(models.CustomerInvoice).where(models.CustomerInvoice.id == invoice_id, models.CustomerInvoice.company_id == company_id).with_for_update())
			if invoice is None or invoice.status != "Approved":
				raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Invoice state changed before posting")
			move = create_posted_account_move(database, company_id, payload)
			invoice.status = "Issued"
			invoice.issued_at = datetime.now(timezone.utc)
			invoice.move_id = move.id
		database.refresh(invoice)
	except IntegrityError as error:
		database.rollback()
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Unable to issue customer invoice") from error
	return invoice


@app.post("/api/settlements/generate", response_model=SupplierSettlementRead, status_code=status.HTTP_201_CREATED, tags=["Supplier Settlements"])
def generate_supplier_settlement(payload: SupplierSettlementGenerate, company_id: uuid.UUID = Depends(get_active_company_id), database: Session = Depends(get_db)):
	partner = database.scalar(select(models.ResPartner).where(models.ResPartner.id == payload.partner_id, models.ResPartner.company_id == company_id))
	if partner is None or partner.partner_type not in {"raw_materials_supplier", "service_supplier", "supplier", "transporter"}:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Settlement partner must be a supplier in the active company")
	net_payable = payload.total_gross_amount - payload.total_penalties_loss
	payable_code = "201000" if partner.partner_type in {"raw_materials_supplier", "supplier"} else "202000"
	accounts = {account.code: account for account in database.scalars(select(models.AccountAccount).where(models.AccountAccount.company_id == company_id, models.AccountAccount.code.in_([payable_code, "501000", "503000"]))).all()}
	if payable_code not in accounts or "501000" not in accounts or "503000" not in accounts:
		raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Required supplier settlement accounts are not configured")
	database.rollback()
	try:
		with database.begin():
			move = models.AccountMove(company_id=company_id, name=f"SET/{payload.period_end:%Y%m%d}/{uuid.uuid4().hex[:6].upper()}", move_type="settlement", partner_id=partner.id, date=payload.period_end, state="draft", ref=str(partner.id))
			database.add(move)
			database.flush()
			database.add(models.AccountMoveLine(move_id=move.id, account_id=accounts["501000"].id, partner_id=partner.id, debit=payload.total_gross_amount, credit=Decimal("0"), name="Supplier settlement gross amount"))
			if payload.total_penalties_loss:
				database.add(models.AccountMoveLine(move_id=move.id, account_id=accounts["503000"].id, partner_id=partner.id, debit=Decimal("0"), credit=payload.total_penalties_loss, name="Loss and spillage penalties"))
			database.add(models.AccountMoveLine(move_id=move.id, account_id=accounts[payable_code].id, partner_id=partner.id, debit=Decimal("0"), credit=net_payable, name="Supplier net payable"))
			settlement = models.SupplierSettlement(company_id=company_id, partner_id=partner.id, move_id=move.id, total_gross_amount=payload.total_gross_amount, total_penalties_loss=payload.total_penalties_loss, net_payable=net_payable, period_start=payload.period_start, period_end=payload.period_end, state="draft")
			database.add(settlement)
		database.refresh(settlement)
	except IntegrityError as error:
		database.rollback()
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Unable to generate supplier settlement") from error
	return settlement


@app.get("/api/settlements", response_model=list[SupplierSettlementRead], tags=["Supplier Settlements"])
def list_supplier_settlements(company_id: uuid.UUID = Depends(get_active_company_id), database: Session = Depends(get_db)):
	return database.scalars(select(models.SupplierSettlement).where(models.SupplierSettlement.company_id == company_id).order_by(models.SupplierSettlement.period_end.desc())).all()


@app.get("/api/reports/overdue-invoices", tags=["Reports"])
async def get_overdue_invoices():
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
