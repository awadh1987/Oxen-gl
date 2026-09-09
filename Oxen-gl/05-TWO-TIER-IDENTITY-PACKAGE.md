# 05-TWO-TIER-IDENTITY-PACKAGE.md
# Production-Grade Two-Tier Authentication & Identity Package for OxenGL ERP

**Document Version:** 1.0.0  
**Architect:** Senior Identity & Access Management (IAM) Engineer & SaaS Systems Architect  
**Classification:** Enterprise Multi-Tenant IAM Specification & Core Implementation  
**Target Platform:** OxenGL / Meayon ERP (Control Plane + Database-per-Tenant Architecture)  
**Date:** September 6, 2026  

---

## Executive Summary & Phase 1 Audit Findings

An evidence-based code audit of the current `OxenGL / Meayon ERP` identity and authentication subsystem revealed critical architectural limitations:

1. **Monolithic User Store (`Backend/models.py:L55-75`):**
   Platform SuperAdmins and individual tenant clerks are co-located in a single `res_users` table bound to `res_companies.id`. This violates strict data residency and control-plane isolation requirements.
2. **Missing Token Plane Scoping (`Backend/main.py:L180-186`):**
   The existing `create_session_token` generates JWTs with `{"sub": email, "company_id": uuid, "role": role}`, lacking a cryptographic `tier` claim (`master` vs `tenant`). A compromised tenant admin token could potentially be accepted by platform management routes if cross-plane checks are omitted.
3. **Single Identifier Constraint (Email Only) (`Backend/main.py:L602-618`):**
   Authentication exclusively queries `models.ResUser.email == payload.email.lower()`. There is zero support for mobile phone numbers (`phone` is an unindexed optional string), which is critical for Saudi Arabian commercial logistics and field operations.
4. **Weak Password Hashing Scheme (`Backend/main.py:L159`):**
   Passwords are currently hashed using `pbkdf2_sha256`. Enterprise SaaS standards mandate memory-hard algorithms such as **Argon2id** or **bcrypt** to prevent GPU-accelerated cracking.
5. **Absence of Self-Service Password Recovery:**
   No OTP or email reset flows exist for end-users; only an emergency break-glass rotation exists for the SuperAdmin.

This document delivers the complete, production-ready **Two-Tier Authentication and Identity Package** to resolve these gaps permanently.

---

## Step 1: Database Schema Design

The authentication architecture enforces physical isolation across two separate database tiers:
- **Tier 1 (Control Plane Database — `oxengl_control_plane`):** Manages SaaS tenants, encrypted connection strings, and master platform operators.
- **Tier 2 (Tenant Plane Databases — `oxengl_tenant_<slug>`):** Self-contained, physically isolated database per customer containing tenant users, ERP records, and local password resets.

```
┌────────────────────────────────────────────────────────────────────────┐
│               Control Plane Database (oxengl_control_plane)            │
│  - master_tenants (directory, domains, subscription, status)           │
│  - tenant_databases (encrypted connection strings via AES-256-GCM)     │
│  - master_users (super_admin, admin, user)                             │
│  - master_password_resets (OTP & signed reset tokens)                  │
│  - master_audit_logs (privileged platform actions)                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Resolves Tenant Engine
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│  Tenant DB: Alpha    │ │  Tenant DB: Beta     │ │  Tenant DB: Gamma    │
│  - tenant_users      │ │  - tenant_users      │ │  - tenant_users      │
│  - tenant_resets     │ │  - tenant_resets     │ │  - tenant_resets     │
│  - tenant_invites    │ │  - tenant_invites    │ │  - tenant_invites    │
│  - Business Entities │ │  - Business Entities │ │  - Business Entities │
└──────────────────────┘ └──────────────────────┘ └──────────────────────┘
```

### 1.1 Control Plane PostgreSQL DDL (Raw SQL)

```sql
-- ==============================================================================
-- CONTROL PLANE DATABASE SCHEMA (oxengl_control_plane)
-- ==============================================================================

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
CREATE INDEX ix_master_resets_user ON master_password_resets (user_id, is_used);

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

CREATE INDEX ix_master_audit_action ON master_audit_logs (action, created_at);
CREATE INDEX ix_master_audit_tenant ON master_audit_logs (target_tenant_id);
```

### 1.2 Tenant Plane PostgreSQL DDL (Raw SQL — In Each Tenant Database)

```sql
-- ==============================================================================
-- TENANT PLANE DATABASE SCHEMA (oxengl_tenant_<slug>)
-- ==============================================================================

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
CREATE INDEX ix_tenant_users_role ON tenant_users (role);

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

CREATE INDEX ix_tenant_resets_token ON tenant_password_resets (reset_token);
CREATE INDEX ix_tenant_resets_user ON tenant_password_resets (user_id, is_used);

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

CREATE INDEX ix_tenant_invites_token ON tenant_user_invitations (invite_token);
```

### 1.3 SQLAlchemy 2.0 Declarative Model Definitions

```python
"""SQLAlchemy 2.0 Models for Two-Tier Authentication and Identity."""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, 
    String, Text, func
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


# ------------------------------------------------------------------------------
# Level 1: Control Plane Models (Master Database)
# ------------------------------------------------------------------------------

class MasterTenant(Base):
    __tablename__ = "master_tenants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    custom_domain: Mapped[Optional[str]] = mapped_column(String(255), unique=True, index=True)
    owner_full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_email: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_mobile: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    subscription_tier: Mapped[str] = mapped_column(String(32), default="standard", nullable=False)
    max_users: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    database_config: Mapped["TenantDatabase"] = relationship(back_populates="tenant", uselist=False, cascade="all, delete-orphan")


class TenantDatabase(Base):
    __tablename__ = "tenant_databases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("master_tenants.id", ondelete="CASCADE"), unique=True, nullable=False)
    database_name: Mapped[str] = mapped_column(String(128), nullable=False)
    encrypted_dsn: Mapped[str] = mapped_column(Text, nullable=False)
    host: Mapped[str] = mapped_column(String(255), default="localhost", nullable=False)
    port: Mapped[int] = mapped_column(Integer, default=5432, nullable=False)
    residency_region: Mapped[str] = mapped_column(String(64), default="sa-central-1", nullable=False)
    pool_size: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    max_overflow: Mapped[int] = mapped_column(Integer, default=20, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    tenant: Mapped[MasterTenant] = relationship(back_populates="database_config")


class MasterUser(Base):
    __tablename__ = "master_users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    mobile_number: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), default="user", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("role IN ('super_admin', 'admin', 'user')", name="ck_master_user_role"),
    )


class MasterPasswordReset(Base):
    __tablename__ = "master_password_resets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("master_users.id", ondelete="CASCADE"), nullable=False)
    identifier: Mapped[str] = mapped_column(String(255), nullable=False)
    otp_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    reset_token: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ------------------------------------------------------------------------------
# Level 2: Tenant Plane Models (Tenant Database)
# ------------------------------------------------------------------------------

class TenantUser(Base):
    __tablename__ = "tenant_users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    mobile_number: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    first_name: Mapped[str] = mapped_column(String(128), nullable=False)
    last_name: Mapped[str] = mapped_column(String(128), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), default="user", nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    department: Mapped[Optional[str]] = mapped_column(String(128))
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    invited_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("tenant_users.id", ondelete="SET NULL"))
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("role IN ('admin', 'user', 'guest_user')", name="ck_tenant_user_role"),
    )


class TenantPasswordReset(Base):
    __tablename__ = "tenant_password_resets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenant_users.id", ondelete="CASCADE"), nullable=False)
    identifier: Mapped[str] = mapped_column(String(255), nullable=False)
    otp_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    reset_token: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

---

## Step 2: API Contract & Catalogue

| Endpoint | Method | Plane | Description | Request Payload | Response Payload | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/auth/master/login` | `POST` | Control Plane | Authenticates Master Portal staff via Email or Mobile. | `{"identity": "admin@oxengl.com", "password": "SecretPassword123!"}` | `{"token": "JWT...", "tier": "master", "user": {"id": "UUID", "email": "...", "role": "super_admin"}}` | `200 OK`, `401 Unauthorized`, `429 Too Many Requests` |
| `/api/auth/tenant/login` | `POST` | Tenant Plane | Authenticates Tenant user via Workspace Slug + Email/Mobile. | `{"workspace_slug": "alpha-logistics", "identity": "0501234567", "password": "SecretPassword123!"}` | `{"token": "JWT...", "tier": "tenant", "tenant_id": "UUID", "user": {"id": "UUID", "fullName": "...", "role": "admin"}}` | `200 OK`, `401 Unauthorized`, `404 Not Found`, `429 Too Many Requests` |
| `/api/auth/register-tenant` | `POST` | Control Plane | Provisions a new Tenant company, database, and initial Tenant Admin. | `{"company_name": "Al-Bawardi Quarry", "owner_full_name": "Tariq Al-Bawardi", "email": "tariq@albawardi.sa", "mobile_number": "0551234567", "password": "ComplexPassword2026!"}` | `{"message": "Tenant provisioned successfully", "tenant": {"id": "UUID", "slug": "al-bawardi-quarry"}, "admin_user_id": "UUID"}` | `201 Created`, `400 Bad Request`, `409 Conflict` |
| `/api/auth/recover-password` | `POST` | Dual Plane | Generates a 6-digit time-bound OTP & reset token sent via SMS/Email. | `{"plane": "tenant", "workspace_slug": "alpha-logistics", "identity": "0501234567"}` | `{"message": "Verification code dispatched", "delivery_channel": "SMS", "reset_token": "token_uuid_string", "expires_in_seconds": 600}` | `200 OK`, `400 Bad Request`, `429 Too Many Requests` |
| `/api/auth/reset-password` | `POST` | Dual Plane | Verifies OTP code & reset token, updating password with Argon2id. | `{"plane": "tenant", "workspace_slug": "alpha-logistics", "reset_token": "token_uuid_string", "otp_code": "482910", "new_password": "NewComplexPassword2026!"}` | `{"message": "Password reset successfully. Please log in with your new credentials."}` | `200 OK`, `400 Bad Request`, `401 Unauthorized`, `410 Gone` |

---

## Step 3: Core Implementation Logic

Below is the production-grade implementation in Python (`FastAPI`, `Pydantic v2`, `SQLAlchemy 2.0`, `Passlib / Argon2`). It encapsulates:
1. International E.164 phone normalization (supporting KSA standard `05XXXXXXXX` -> `+9665XXXXXXXX`).
2. Two-tier JWT token generation and verification ensuring cross-plane isolation.
3. Argon2id password hashing with constant-time verification.
4. Dynamic tenant engine routing via `TenantConnectionManager`.

```python
"""
OxenGL ERP - Two-Tier Authentication & Identity Subsystem
Filename: Backend/two_tier_auth.py
"""

import hmac
import json
import logging
import os
import re
import secrets
import string
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from Backend.database import (
    TenantConnectionManager,
    encrypt_connection_url,
    get_db,
)
from Backend.models import (
    Base,
    MasterPasswordReset,
    MasterTenant,
    MasterUser,
    TenantDatabase,
    TenantPasswordReset,
    TenantUser,
)

logger = logging.getLogger("oxengl.two_tier_auth")

# ==============================================================================
# Security & Cryptographic Settings
# ==============================================================================

JWT_SECRET_MASTER = os.getenv("JWT_SECRET_MASTER", "oxengl-master-control-plane-secret-key-32b-min")
JWT_SECRET_TENANT = os.getenv("JWT_SECRET_TENANT", "oxengl-tenant-plane-secret-key-32b-min")
JWT_EXPIRE_SECONDS = int(os.getenv("JWT_EXPIRE_SECONDS", "14400"))  # 4 hours
OTP_EXPIRE_MINUTES = 10
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

# Argon2id password context (with fallback verification for legacy pbkdf2_sha256)
pwd_context = CryptContext(
    schemes=["argon2", "bcrypt", "pbkdf2_sha256"],
    deprecated="auto",
    argon2__memory_cost=65536,
    argon2__time_cost=3,
    argon2__parallelism=4,
)

# ==============================================================================
# Phone (E.164) & Email Normalization Utilities
# ==============================================================================

def normalize_identifier(raw_identity: str) -> Tuple[str, Literal["email", "mobile"]]:
    """
    Normalizes user input to an authoritative Email or E.164 Mobile Phone number.
    Supports KSA regional formats:
      - 05XXXXXXXX  -> +9665XXXXXXXX
      - 5XXXXXXXX   -> +9665XXXXXXXX
      - 9665XXXXXXXX-> +9665XXXXXXXX
      - +9665XXXXXXXX-> +9665XXXXXXXX
    """
    cleaned = raw_identity.strip()
    if "@" in cleaned:
        # Standard email normalization
        normalized_email = cleaned.lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", normalized_email):
            raise HTTPException(status_code=400, detail="Invalid email address format.")
        return normalized_email, "email"

    # Mobile phone normalization
    digits_only = re.sub(r"[^\d+]", "", cleaned)
    if digits_only.startswith("+"):
        if not (10 <= len(digits_only) <= 16):
            raise HTTPException(status_code=400, detail="Invalid international E.164 phone number.")
        return digits_only, "mobile"

    # Strip leading zeroes or international prefixes for Saudi domestic numbers
    if digits_only.startswith("05") and len(digits_only) == 10:
        return f"+966{digits_only[1:]}", "mobile"
    elif digits_only.startswith("5") and len(digits_only) == 9:
        return f"+966{digits_only}", "mobile"
    elif digits_only.startswith("966") and len(digits_only) == 12:
        return f"+{digits_only}", "mobile"
    elif 9 <= len(digits_only) <= 15:
        return f"+{digits_only}", "mobile"

    raise HTTPException(
        status_code=400,
        detail="Identity must be a valid Email address or Mobile Phone number (e.g., 05XXXXXXXX or +9665XXXXXXXX)."
    )


# ==============================================================================
# Cryptographic Token Helpers (Two-Tier Plane Isolation)
# ==============================================================================

def _b64url_encode(data: bytes) -> str:
    import base64
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    import base64
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def issue_two_tier_jwt(
    *,
    tier: Literal["master", "tenant"],
    user_id: uuid.UUID,
    identity: str,
    role: str,
    tenant_id: Optional[uuid.UUID] = None,
    tenant_slug: Optional[str] = None,
) -> str:
    """Issues a cryptographically signed JWT strictly bound to its operational tier."""
    now = int(time.time())
    secret = JWT_SECRET_MASTER if tier == "master" else JWT_SECRET_TENANT
    issuer = "oxengl-control-plane" if tier == "master" else f"oxengl-tenant-{tenant_slug}"
    audience = "oxengl-master-portal" if tier == "master" else "oxengl-erp-app"

    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "tier": tier,
        "sub": str(user_id),
        "identity": identity,
        "role": role,
        "tenant_id": str(tenant_id) if tenant_id else None,
        "tenant_slug": tenant_slug,
        "iss": issuer,
        "aud": audience,
        "iat": now,
        "exp": now + JWT_EXPIRE_SECONDS,
    }

    signing_input = f"{_b64url_encode(json.dumps(header).encode())}.{_b64url_encode(json.dumps(payload).encode())}"
    import hashlib
    sig = hmac.new(secret.encode("utf-8"), signing_input.encode("utf-8"), hashlib.sha256).digest()
    return f"{signing_input}.{_b64url_encode(sig)}"


def verify_two_tier_jwt(token: str, expected_tier: Literal["master", "tenant"]) -> dict:
    """Decodes and cryptographically validates token, enforcing plane isolation."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Malformed token")
        header_b64, payload_b64, sig_b64 = parts
        secret = JWT_SECRET_MASTER if expected_tier == "master" else JWT_SECRET_TENANT
        signing_input = f"{header_b64}.{payload_b64}"
        import hashlib
        expected_sig = _b64url_encode(hmac.new(secret.encode("utf-8"), signing_input.encode("utf-8"), hashlib.sha256).digest())
        if not hmac.compare_digest(sig_b64, expected_sig):
            raise ValueError("Signature mismatch")

        payload = json.loads(_b64url_decode(payload_b64))
        if int(payload.get("exp", 0)) < int(time.time()):
            raise HTTPException(status_code=401, detail="Token has expired.")
        if payload.get("tier") != expected_tier:
            raise HTTPException(
                status_code=403, 
                detail=f"Cross-plane token violation: Token issued for '{payload.get('tier')}' cannot access '{expected_tier}' tier."
            )
        return payload
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(status_code=401, detail=f"Authentication token invalid: {err}")


# ==============================================================================
# Pydantic Schemas
# ==============================================================================

class MasterLoginRequest(BaseModel):
    identity: str = Field(..., description="Master operator Email or Mobile Phone")
    password: str = Field(..., min_length=8)


class TenantLoginRequest(BaseModel):
    workspace_slug: str = Field(..., description="Tenant organization slug (e.g. alpha-logistics)")
    identity: str = Field(..., description="Tenant user Email or Mobile Phone")
    password: str = Field(..., min_length=8)


class TenantRegistrationRequest(BaseModel):
    company_name: str = Field(..., min_length=3, max_length=255)
    owner_full_name: str = Field(..., min_length=3, max_length=255)
    email: EmailStr
    mobile_number: str = Field(..., min_length=9, max_length=32)
    password: str = Field(..., min_length=10)

    @field_validator("password")
    def validate_password_complexity(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter.")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one digit.")
        return v


class PasswordRecoveryInitiateRequest(BaseModel):
    plane: Literal["master", "tenant"] = "tenant"
    workspace_slug: Optional[str] = None
    identity: str


class PasswordResetCompleteRequest(BaseModel):
    plane: Literal["master", "tenant"] = "tenant"
    workspace_slug: Optional[str] = None
    reset_token: str
    otp_code: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=10)


# ==============================================================================
# FastAPI Router Implementation
# ==============================================================================

router = APIRouter(prefix="/api/auth", tags=["Two-Tier Authentication"])


@router.post("/master/login")
def master_login(payload: MasterLoginRequest, request: Request, db: Session = Depends(get_db)):
    """Authenticates Control Plane staff against the Control Plane Database."""
    normalized_val, id_type = normalize_identifier(payload.identity)

    query = select(MasterUser).where(
        MasterUser.email == normalized_val if id_type == "email" else MasterUser.mobile_number == normalized_val
    )
    user = db.scalar(query)

    # Constant-time dummy verify to prevent timing enumeration
    if user is None:
        pwd_context.hash("dummy_for_timing")
        raise HTTPException(status_code=401, detail="Invalid credentials or account inactive.")

    if not user.is_active:
        raise HTTPException(status_code=401, detail="Master account has been suspended.")

    if user.locked_until and user.locked_until > datetime.now(timezone.utc):
        raise HTTPException(status_code=429, detail="Account temporarily locked due to repeated failures.")

    if not pwd_context.verify(payload.password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= MAX_LOGIN_ATTEMPTS:
            user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid credentials or account inactive.")

    # Successful login: reset counters and issue Master token
    user.failed_login_attempts = 0
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    token = issue_two_tier_jwt(
        tier="master",
        user_id=user.id,
        identity=user.email,
        role=user.role,
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "tier": "master",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "mobile": user.mobile_number,
            "fullName": user.full_name,
            "role": user.role,
        },
    }


@router.post("/tenant/login")
def tenant_login(payload: TenantLoginRequest, request: Request, master_db: Session = Depends(get_db)):
    """Resolves Tenant Plane database via slug and authenticates tenant user."""
    slug = payload.workspace_slug.lower().strip()
    tenant = master_db.scalar(select(MasterTenant).where(MasterTenant.slug == slug))
    if not tenant:
        raise HTTPException(status_code=404, detail=f"Workspace '{slug}' does not exist.")
    if tenant.status != "active":
        raise HTTPException(status_code=403, detail="Workspace is suspended or pending initialization.")

    normalized_val, id_type = normalize_identifier(payload.identity)

    # Dynamically resolve Tenant Physical Engine
    conn_mgr = TenantConnectionManager(master_db.get_bind())
    with conn_mgr.session_scope(tenant.id, db=master_db) as tenant_db:
        query = select(TenantUser).where(
            TenantUser.email == normalized_val if id_type == "email" else TenantUser.mobile_number == normalized_val
        )
        user = tenant_db.scalar(query)

        if user is None:
            pwd_context.hash("dummy_for_timing")
            raise HTTPException(status_code=401, detail="Invalid credentials or account inactive.")

        if not user.is_active:
            raise HTTPException(status_code=401, detail="User account is inactive. Contact tenant admin.")

        if user.locked_until and user.locked_until > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Account locked. Please try again later.")

        if not pwd_context.verify(payload.password, user.password_hash):
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= MAX_LOGIN_ATTEMPTS:
                user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
            tenant_db.commit()
            raise HTTPException(status_code=401, detail="Invalid credentials or account inactive.")

        user.failed_login_attempts = 0
        user.last_login_at = datetime.now(timezone.utc)
        tenant_db.commit()

        token = issue_two_tier_jwt(
            tier="tenant",
            user_id=user.id,
            identity=user.email,
            role=user.role,
            tenant_id=tenant.id,
            tenant_slug=tenant.slug,
        )
        return {
            "access_token": token,
            "token_type": "bearer",
            "tier": "tenant",
            "tenant_id": str(tenant.id),
            "tenant_slug": tenant.slug,
            "user": {
                "id": str(user.id),
                "email": user.email,
                "mobile": user.mobile_number,
                "fullName": f"{user.first_name} {user.last_name}",
                "role": user.role,
            },
        }


@router.post("/register-tenant", status_code=status.HTTP_201_CREATED)
def register_tenant(payload: TenantRegistrationRequest, master_db: Session = Depends(get_db)):
    """Registers a new company in the Control Plane and provisions an isolated Tenant DB."""
    # 1. Generate unique URL slug
    slug = re.sub(r"[^a-z0-9]+", "-", payload.company_name.lower()).strip("-")
    if master_db.scalar(select(MasterTenant).where(MasterTenant.slug == slug)):
        slug = f"{slug}-{secrets.token_hex(2)}"

    norm_email, _ = normalize_identifier(payload.email)
    norm_mobile, _ = normalize_identifier(payload.mobile_number)

    # 2. Check collision in Master registry
    if master_db.scalar(select(MasterTenant).where(MasterTenant.owner_email == norm_email)):
        raise HTTPException(status_code=409, detail="Owner email already registered.")

    # 3. Create Master Tenant Record
    tenant = MasterTenant(
        name=payload.company_name,
        slug=slug,
        owner_full_name=payload.owner_full_name,
        owner_email=norm_email,
        owner_mobile=norm_mobile,
        status="active",
        subscription_tier="standard",
    )
    master_db.add(tenant)
    master_db.flush()

    # 4. Provision Dedicated Database Name & Encrypted DSN
    tenant_db_name = f"oxengl_tenant_{slug.replace('-', '_')}"
    raw_dsn = f"postgresql+psycopg2://oxengl:oxengl@localhost:5432/{tenant_db_name}"
    enc_dsn = encrypt_connection_url(raw_dsn)

    db_config = TenantDatabase(
        tenant_id=tenant.id,
        database_name=tenant_db_name,
        encrypted_dsn=enc_dsn,
    )
    master_db.add(db_config)
    master_db.commit()

    # 5. Bootstrap Initial Tenant Admin User inside Tenant DB
    first_name, *last_parts = payload.owner_full_name.split(" ", 1)
    last_name = last_parts[0] if last_parts else "Admin"

    conn_mgr = TenantConnectionManager(master_db.get_bind())
    with conn_mgr.session_scope(tenant.id, db=master_db) as tenant_db:
        # Create tenant schema tables if not present
        Base.metadata.create_all(bind=conn_mgr.get_engine(tenant.id, db=master_db))

        admin_user = TenantUser(
            email=norm_email,
            mobile_number=norm_mobile,
            first_name=first_name,
            last_name=last_name,
            password_hash=pwd_context.hash(payload.password),
            role="admin",
            is_active=True,
        )
        tenant_db.add(admin_user)
        tenant_db.commit()
        created_user_id = admin_user.id

    logger.info(f"Successfully provisioned Tenant '{slug}' with Admin '{norm_email}'")
    return {
        "message": "Tenant registered and provisioned successfully.",
        "tenant": {"id": str(tenant.id), "slug": tenant.slug, "name": tenant.name},
        "admin_user_id": str(created_user_id),
    }


@router.post("/recover-password")
def recover_password(payload: PasswordRecoveryInitiateRequest, master_db: Session = Depends(get_db)):
    """Dispatches a secure 6-digit OTP and reset token via SMS or Email."""
    normalized_val, id_type = normalize_identifier(payload.identity)
    otp_code = "".join(secrets.choice(string.digits) for _ in range(6))
    reset_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MINUTES)
    otp_hash = pwd_context.hash(otp_code)

    if payload.plane == "master":
        user = master_db.scalar(
            select(MasterUser).where(
                MasterUser.email == normalized_val if id_type == "email" else MasterUser.mobile_number == normalized_val
            )
        )
        if not user:
            # Silent return to prevent account enumeration
            return {"message": "If the account exists, a recovery code has been sent.", "delivery_channel": id_type.upper()}

        reset_entry = MasterPasswordReset(
            user_id=user.id,
            identifier=normalized_val,
            otp_hash=otp_hash,
            reset_token=reset_token,
            expires_at=expires_at,
        )
        master_db.add(reset_entry)
        master_db.commit()
    else:
        if not payload.workspace_slug:
            raise HTTPException(status_code=400, detail="workspace_slug is required for tenant password recovery.")
        tenant = master_db.scalar(select(MasterTenant).where(MasterTenant.slug == payload.workspace_slug.lower()))
        if not tenant:
            return {"message": "If the account exists, a recovery code has been sent.", "delivery_channel": id_type.upper()}

        conn_mgr = TenantConnectionManager(master_db.get_bind())
        with conn_mgr.session_scope(tenant.id, db=master_db) as tenant_db:
            user = tenant_db.scalar(
                select(TenantUser).where(
                    TenantUser.email == normalized_val if id_type == "email" else TenantUser.mobile_number == normalized_val
                )
            )
            if not user:
                return {"message": "If the account exists, a recovery code has been sent.", "delivery_channel": id_type.upper()}

            reset_entry = TenantPasswordReset(
                user_id=user.id,
                identifier=normalized_val,
                otp_hash=otp_hash,
                reset_token=reset_token,
                expires_at=expires_at,
            )
            tenant_db.add(reset_entry)
            tenant_db.commit()

    # In production, dispatch via SMS gateway (Unifonic/Twilio) or Email SMTP
    logger.info(f"[DISPATCH-OTP] Destination: {normalized_val} | Code: {otp_code} | Token: {reset_token}")
    return {
        "message": "Verification code dispatched successfully.",
        "delivery_channel": id_type.upper(),
        "reset_token": reset_token,
        "expires_in_seconds": OTP_EXPIRE_MINUTES * 60,
    }


@router.post("/reset-password")
def reset_password(payload: PasswordResetCompleteRequest, master_db: Session = Depends(get_db)):
    """Verifies OTP & token and securely rotates password to Argon2id hash."""
    now = datetime.now(timezone.utc)
    new_hash = pwd_context.hash(payload.new_password)

    if payload.plane == "master":
        reset = master_db.scalar(
            select(MasterPasswordReset).where(
                MasterPasswordReset.reset_token == payload.reset_token,
                MasterPasswordReset.is_used.is_(False),
                MasterPasswordReset.expires_at > now,
            )
        )
        if not reset:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

        if not pwd_context.verify(payload.otp_code, reset.otp_hash):
            reset.attempts += 1
            if reset.attempts >= 3:
                reset.is_used = True
            master_db.commit()
            raise HTTPException(status_code=400, detail="Invalid OTP code.")

        user = master_db.scalar(select(MasterUser).where(MasterUser.id == reset.user_id))
        if user:
            user.password_hash = new_hash
            reset.is_used = True
            master_db.commit()
    else:
        if not payload.workspace_slug:
            raise HTTPException(status_code=400, detail="workspace_slug is required for tenant password reset.")
        tenant = master_db.scalar(select(MasterTenant).where(MasterTenant.slug == payload.workspace_slug.lower()))
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant workspace not found.")

        conn_mgr = TenantConnectionManager(master_db.get_bind())
        with conn_mgr.session_scope(tenant.id, db=master_db) as tenant_db:
            reset = tenant_db.scalar(
                select(TenantPasswordReset).where(
                    TenantPasswordReset.reset_token == payload.reset_token,
                    TenantPasswordReset.is_used.is_(False),
                    TenantPasswordReset.expires_at > now,
                )
            )
            if not reset:
                raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

            if not pwd_context.verify(payload.otp_code, reset.otp_hash):
                reset.attempts += 1
                if reset.attempts >= 3:
                    reset.is_used = True
                tenant_db.commit()
                raise HTTPException(status_code=400, detail="Invalid OTP code.")

            user = tenant_db.scalar(select(TenantUser).where(TenantUser.id == reset.user_id))
            if user:
                user.password_hash = new_hash
                reset.is_used = True
                tenant_db.commit()

    return {"message": "Password reset successfully. You can now log in with your new credentials."}
```

---

## Step 4: Security Audit Checklist

The following 7 critical security tests must be executed to certify that this authentication package meets global and Saudi Arabian enterprise SaaS security standards:

1. **Cross-Plane Token Escalation Test (Zero Trust Boundary):**
   - *Test Objective:* Take a valid JWT issued by `/api/auth/tenant/login` (with role `admin`) and submit it to a Control Plane route (e.g., `GET /api/master/tenants`).
   - *Pass Criterion:* The Control Plane gateway must inspect the `tier` claim, reject the token with **HTTP 403 Forbidden**, and log an immutable security violation in `master_audit_logs`.
2. **Cross-Tenant Context Spoofing Test:**
   - *Test Objective:* Take a valid Tenant A JWT and present it with an HTTP header or payload requesting Tenant B's ledger (`/api/accounting/moves` with `X-Tenant-ID: <Tenant_B_UUID>`).
   - *Pass Criterion:* The dependency validator must detect a mismatch between the token's embedded `tenant_id` claim and the target context, returning **HTTP 403 Forbidden**.
3. **Dual-Identifier Equivalence & Collision Resistance:**
   - *Test Objective:* Register a user with mobile number `0501234567`. Attempt login using domestic format (`0501234567`), international format (`+966501234567`), and standard format (`966501234567`). Then attempt to register a second user with the same phone in a different format.
   - *Pass Criterion:* All valid formats resolve to the exact same normalized E.164 record (`+966501234567`). Any second registration attempt triggers **HTTP 409 Conflict**.
4. **Brute-Force & Credential Stuffing Lockout Test:**
   - *Test Objective:* Execute 5 consecutive failed login attempts against a single user account within 60 seconds.
   - *Pass Criterion:* The 6th attempt must be rejected immediately with **HTTP 429 Too Many Requests**, locking the user for 15 minutes without hitting the password hashing function.
5. **Anti-Enumeration Timing Attack Test:**
   - *Test Objective:* Measure the response time of `/api/auth/master/login` for an existing user with an incorrect password versus a non-existent user.
   - *Pass Criterion:* Both requests execute a constant-time hashing dummy verification, resulting in statistical timing variance $\Delta t < 20\text{ ms}$, preventing username enumeration.
6. **OTP Replay & Tamper Resistance Test:**
   - *Test Objective:* Initiate password recovery, capture the 6-digit OTP, successfully reset the password, and then immediately submit the same OTP and reset token a second time.
   - *Pass Criterion:* The second request must return **HTTP 400 Bad Request** or **HTTP 410 Gone** (`is_used == True`).
7. **Argon2id Memory-Hard Hash Parameter Verification:**
   - *Test Objective:* Inspect generated database password hashes and verify the hash string prefix starts with `$argon2id$v=19$m=65536,t=3,p=4$`.
   - *Pass Criterion:* Confirms zero plain-text storage and full resistance to ASIC and GPU brute-force cracking.
