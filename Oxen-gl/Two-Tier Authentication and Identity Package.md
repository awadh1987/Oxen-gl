# Role and Objective
You are a Senior Identity and Access Management (IAM) Engineer and SaaS Systems Architect. Your task is to design, architect, and implement a complete, production-ready **Two-Tier Authentication and Identity Package** for an enterprise ERP SaaS system. 
The authentication package must enforce strict architectural isolation between the SaaS platform's Control Plane (Master Portal) and the individual Tenant databases (Multi-Tenant level). 
# 1. Architectural Isolation Requirements
You must design the authentication package to operate across two strictly isolated levels. A user token from one level must never grant access to the other level unless explicitly designed via a secure cross-plane impersonation flow for support (which must be heavily audited).
## Level 1: Master Portal (Control Plane)
- **Purpose:** Platform administration, tenant onboarding, billing, and global SaaS management.
- **Data Store:** Control Plane PostgreSQL Database.
- **Roles:** 
  - `super_admin`: Full access to the SaaS infrastructure and all configurations.
  - `admin`: Operational management of the SaaS platform.
  - `user`: Internal platform staff (e.g., support, sales).
## Level 2: Multi-Tenant Level (Tenant Plane)
- **Purpose:** Day-to-day ERP operations for a specific subscribed company.
- **Data Store:** Isolated Tenant PostgreSQL Database (Database-per-Tenant architecture).
- **Roles:**
  - `admin`: The tenant owner or IT administrator for that specific company.
  - `user`: Standard employee of the tenant.
  - `guest_user`: Limited external access (e.g., a vendor, carrier, or auditor).
---
# 2. Required Workflows and Forms
Design the data models, API endpoints, and UI component specifications for the following standardized flows. All flows must support primary identification via **Email OR Mobile Phone Number**.
## A. Registration Forms
1. **New Tenant Registration (Control Plane):**
   - **Trigger:** A new company signs up for the ERP.
   - **Fields:** Company Name, Owner Full Name, Email, Mobile Phone Number, Password.
   - **Action:** Creates a `tenant` record in the Control Plane, provisions the Tenant DB, and creates the first `admin` user inside the new Tenant DB.
2. **New User Registration (Tenant Plane):**
   - **Trigger:** A tenant admin invites a new employee or guest.
   - **Fields:** First Name, Last Name, Email, Mobile Phone Number, Role (`user` or `guest_user`), Temporary Password or Invite Link.
## B. Login Form
- **Fields:** Identity (Email OR Mobile Phone Number), Password, and (if necessary for routing) Workspace/Tenant Slug.
- **Routing Logic:** The system must securely resolve whether the logging-in user belongs to the Master Portal or a specific Tenant, and issue the appropriate isolated session/JWT.
## C. Self-Service Password Recovery
- **Trigger:** User forgets their password.
- **Flow:** User enters Email or Mobile Phone Number.
- **Verification:** System sends a secure, time-bound One-Time Password (OTP) via SMS or a secure reset link via Email.
- **Reset:** User validates OTP/Link and sets a new password.
---
# 3. Security and Technical Constraints
- **Passwords:** Must be hashed using Argon2 or bcrypt. Never store plain text.
- **Tokens/Sessions:** Define the payload for JWTs or session cookies. The token must explicitly contain the `tier` (master vs tenant), `tenant_id` (if applicable), and `role`.
- **Rate Limiting:** Protect all login, registration, and password reset endpoints against brute-force and enumeration attacks.
- **Validation:** Enforce strong password complexity. Validate international mobile phone number formats (e.g., E.164) and email RFC standards.
---
# 4. Required Deliverables & Complete Architecture Specification

---

## Step 1: Database Schema Design

The authentication architecture enforces physical isolation across two separate database tiers:
- **Level 1 (Control Plane Database — `oxengl_control_plane`):** Manages SaaS tenants, encrypted connection strings, and master platform operators.
- **Level 2 (Tenant Plane Databases — `oxengl_tenant_<slug>`):** Self-contained, physically isolated database per customer containing tenant users, ERP records, and local password resets.

### 1.1 Control Plane PostgreSQL DDL (Raw SQL)

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Master Tenants Directory
CREATE TABLE master_tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(64) NOT NULL UNIQUE,
    custom_domain VARCHAR(255) UNIQUE,
    owner_full_name VARCHAR(255) NOT NULL,
    owner_email VARCHAR(255) NOT NULL,
    owner_mobile VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    subscription_tier VARCHAR(32) NOT NULL DEFAULT 'standard',
    max_users INT NOT NULL DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_tenant_status CHECK (status IN ('provisioning', 'active', 'suspended', 'deprovisioned')),
    CONSTRAINT ck_tenant_tier CHECK (subscription_tier IN ('starter', 'standard', 'growth', 'enterprise'))
);

CREATE INDEX ix_master_tenants_slug ON master_tenants (slug);
CREATE INDEX ix_master_tenants_domain ON master_tenants (custom_domain);

-- 2. Tenant Database Routing Configurations
CREATE TABLE tenant_databases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES master_tenants(id) ON DELETE CASCADE,
    database_name VARCHAR(128) NOT NULL,
    encrypted_dsn TEXT NOT NULL,
    host VARCHAR(255) NOT NULL DEFAULT 'localhost',
    port INT NOT NULL DEFAULT 5432,
    residency_region VARCHAR(64) NOT NULL DEFAULT 'sa-central-1',
    pool_size INT NOT NULL DEFAULT 10,
    max_overflow INT NOT NULL DEFAULT 20,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX ix_tenant_databases_active ON tenant_databases (tenant_id, is_active);

-- 3. Master Portal Users (Control Plane Staff Only)
CREATE TABLE master_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    mobile_number VARCHAR(64) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_master_user_role CHECK (role IN ('super_admin', 'admin', 'user'))
);

CREATE INDEX ix_master_users_email ON master_users (email);
CREATE INDEX ix_master_users_mobile ON master_users (mobile_number);

-- 4. Master Self-Service Password Resets & OTPs
CREATE TABLE master_password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES master_users(id) ON DELETE CASCADE,
    identifier VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    reset_token VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX ix_master_resets_token ON master_password_resets (reset_token);

-- 5. Master Platform Immutable Audit Logs
CREATE TABLE master_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID,
    actor_identifier VARCHAR(255) NOT NULL,
    action VARCHAR(120) NOT NULL,
    target_tenant_id UUID REFERENCES master_tenants(id) ON DELETE SET NULL,
    endpoint VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(512),
    outcome VARCHAR(32) NOT NULL DEFAULT 'SUCCESS',
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

### 1.2 Tenant Plane PostgreSQL DDL (In Each Tenant Database)

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tenant Plane Users
CREATE TABLE tenant_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    mobile_number VARCHAR(64) NOT NULL UNIQUE,
    first_name VARCHAR(128) NOT NULL,
    last_name VARCHAR(128) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    department VARCHAR(128),
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    invited_by_user_id UUID REFERENCES tenant_users(id) ON DELETE SET NULL,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_tenant_user_role CHECK (role IN ('admin', 'user', 'guest_user'))
);

CREATE INDEX ix_tenant_users_email ON tenant_users (email);
CREATE INDEX ix_tenant_users_mobile ON tenant_users (mobile_number);

-- 2. Tenant Self-Service Password Resets & OTPs
CREATE TABLE tenant_password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES tenant_users(id) ON DELETE CASCADE,
    identifier VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    reset_token VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Tenant User Invitations
CREATE TABLE tenant_user_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(64),
    role VARCHAR(32) NOT NULL DEFAULT 'user',
    invited_by_id UUID NOT NULL REFERENCES tenant_users(id) ON DELETE CASCADE,
    invite_token VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_invite_role CHECK (role IN ('admin', 'user', 'guest_user'))
);
```

---

## Step 2: API Contract

| Endpoint | Method | Tier | Request Schema | Response Schema | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST /api/auth/master/login` | POST | Master (Control Plane) | `{"identity": "admin@oxengl.com", "password": "..."}` | `{"access_token": "JWT...", "tier": "master", "user": {"id": "UUID", "email": "...", "role": "super_admin"}}` | 200, 401, 429 |
| `POST /api/auth/tenant/login` | POST | Tenant (Tenant Plane) | `{"workspace_slug": "alpha", "identity": "0501234567", "password": "..."}` | `{"access_token": "JWT...", "tier": "tenant", "tenant_id": "UUID", "user": {"id": "UUID", "role": "admin"}}` | 200, 401, 404, 429 |
| `POST /api/auth/register-tenant` | POST | Master (Control Plane) | `{"company_name": "...", "owner_full_name": "...", "email": "...", "mobile_number": "0501234567", "password": "..."}` | `{"message": "Provisioned", "tenant": {"id": "UUID", "slug": "alpha"}, "admin_user_id": "UUID"}` | 201, 400, 409 |
| `POST /api/auth/recover-password` | POST | Dual Plane | `{"plane": "tenant", "workspace_slug": "alpha", "identity": "0501234567"}` | `{"message": "Code sent", "delivery_channel": "SMS", "reset_token": "...", "expires_in_seconds": 600}` | 200, 400, 429 |
| `POST /api/auth/reset-password` | POST | Dual Plane | `{"plane": "tenant", "workspace_slug": "alpha", "reset_token": "...", "otp_code": "123456", "new_password": "..."}` | `{"message": "Password reset successfully."}` | 200, 400, 401, 410 |

---

## Step 3: Core Implementation Logic

```python
import hmac, json, os, re, secrets, time, uuid
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, Request, status
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from Backend.database import TenantConnectionManager, encrypt_connection_url, get_db
from Backend.models import MasterTenant, MasterUser, TenantDatabase, TenantUser, TenantPasswordReset, MasterPasswordReset

JWT_SECRET_MASTER = os.getenv("JWT_SECRET_MASTER", "oxengl-master-key-32b-min")
JWT_SECRET_TENANT = os.getenv("JWT_SECRET_TENANT", "oxengl-tenant-key-32b-min")
pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto", argon2__memory_cost=65536, argon2__time_cost=3, argon2__parallelism=4)

def normalize_identifier(raw_identity: str) -> Tuple[str, Literal["email", "mobile"]]:
    cleaned = raw_identity.strip()
    if "@" in cleaned:
        return cleaned.lower(), "email"
    digits_only = re.sub(r"[^\d+]", "", cleaned)
    if digits_only.startswith("+") and 10 <= len(digits_only) <= 16:
        return digits_only, "mobile"
    if digits_only.startswith("05") and len(digits_only) == 10:
        return f"+966{digits_only[1:]}", "mobile"
    if digits_only.startswith("5") and len(digits_only) == 9:
        return f"+966{digits_only}", "mobile"
    if digits_only.startswith("966") and len(digits_only) == 12:
        return f"+{digits_only}", "mobile"
    raise HTTPException(status_code=400, detail="Invalid Email or Mobile Phone format.")

def issue_two_tier_jwt(*, tier: Literal["master", "tenant"], user_id: uuid.UUID, identity: str, role: str, tenant_id: Optional[uuid.UUID] = None, tenant_slug: Optional[str] = None) -> str:
    now = int(time.time())
    secret = JWT_SECRET_MASTER if tier == "master" else JWT_SECRET_TENANT
    payload = {
        "tier": tier,
        "sub": str(user_id),
        "identity": identity,
        "role": role,
        "tenant_id": str(tenant_id) if tenant_id else None,
        "tenant_slug": tenant_slug,
        "iss": "oxengl-control-plane" if tier == "master" else f"oxengl-tenant-{tenant_slug}",
        "aud": "oxengl-master-portal" if tier == "master" else "oxengl-erp-app",
        "iat": now,
        "exp": now + 14400,
    }
    header = {"alg": "HS256", "typ": "JWT"}
    import base64, hashlib
    def _b64(b: bytes) -> str: return base64.urlsafe_b64encode(b).rstrip(b"=").decode("ascii")
    signing_input = f"{_b64(json.dumps(header).encode())}.{_b64(json.dumps(payload).encode())}"
    sig = hmac.new(secret.encode(), signing_input.encode(), hashlib.sha256).digest()
    return f"{signing_input}.{_b64(sig)}"

router = APIRouter(prefix="/api/auth", tags=["Two-Tier Identity"])

@router.post("/master/login")
def master_login(identity: str, password: str, db: Session = Depends(get_db)):
    norm_val, id_type = normalize_identifier(identity)
    query = select(MasterUser).where(MasterUser.email == norm_val if id_type == "email" else MasterUser.mobile_number == norm_val)
    user = db.scalar(query)
    if not user or not pwd_context.verify(password, user.password_hash):
        pwd_context.hash("dummy")
        raise HTTPException(status_code=401, detail="Invalid credentials.")
    token = issue_two_tier_jwt(tier="master", user_id=user.id, identity=user.email, role=user.role)
    return {"access_token": token, "tier": "master", "user": {"id": str(user.id), "email": user.email, "role": user.role}}

@router.post("/tenant/login")
def tenant_login(workspace_slug: str, identity: str, password: str, master_db: Session = Depends(get_db)):
    tenant = master_db.scalar(select(MasterTenant).where(MasterTenant.slug == workspace_slug.lower()))
    if not tenant or tenant.status != "active":
        raise HTTPException(status_code=404, detail="Workspace not found or inactive.")
    norm_val, id_type = normalize_identifier(identity)
    conn_mgr = TenantConnectionManager(master_db.get_bind())
    with conn_mgr.session_scope(tenant.id, db=master_db) as tenant_db:
        query = select(TenantUser).where(TenantUser.email == norm_val if id_type == "email" else TenantUser.mobile_number == norm_val)
        user = tenant_db.scalar(query)
        if not user or not pwd_context.verify(password, user.password_hash):
            pwd_context.hash("dummy")
            raise HTTPException(status_code=401, detail="Invalid credentials.")
        token = issue_two_tier_jwt(tier="tenant", user_id=user.id, identity=user.email, role=user.role, tenant_id=tenant.id, tenant_slug=tenant.slug)
        return {"access_token": token, "tier": "tenant", "tenant_id": str(tenant.id), "user": {"id": str(user.id), "email": user.email, "role": user.role}}
```

---

## Step 4: Security Audit Checklist

1. **Zero-Trust Cross-Plane Token Escalation Test:** Submitting a Tenant JWT to `/api/master/*` or `/api/platform/*` triggers **HTTP 403 Forbidden**.
2. **Cross-Tenant Context Spoofing Test:** Submitting a Tenant A JWT to Tenant B's endpoints triggers **HTTP 403 Forbidden** with zero data bleed.
3. **Dual-Identifier Equivalence Test:** Normalizing `0501234567` and `+966501234567` resolves to identical user identity; duplicate registration yields **HTTP 409 Conflict**.
4. **Brute-Force Lockout Defense:** 5 consecutive failures triggers an automatic 15-minute lockout with **HTTP 429 Too Many Requests**.
5. **Constant-Time Timing Attack Mitigation:** Failed attempts for non-existent users execute dummy Argon2 hash verification to prevent username enumeration.
6. **OTP Replay & Single-Use Enforcement:** Replaying a used OTP or expired token yields **HTTP 400 Bad Request** or **HTTP 410 Gone**.
7. **Argon2id Memory-Hard Hash Compliance:** All stored hashes adhere to `$argon2id$v=19$m=65536,t=3,p=4$` parameters.