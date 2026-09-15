from typing import Generator
from fastapi import Request, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.database import *


def get_isolated_db_session(request: Request) -> Generator[Session, None, None]:
    """
    FastAPI dependency injecting a transaction-scoped multi-tenant database session.
    Enforces PostgreSQL Row Level Security (RLS) isolation by executing:
    SET LOCAL app.current_tenant_id = :tenant_id
    """
    tenant_id = (
        request.headers.get("X-Tenant-ID")
        or request.headers.get("x-tenant-id")
        or request.path_params.get("tenant_id")
        or request.query_params.get("tenant_id")
        or getattr(request.state, "tenant_id", None)
    )

    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tenant identity header missing or unverified (X-Tenant-ID required).",
        )

    db: Session = SessionLocal()
    try:
        db.execute(text("SET LOCAL app.current_tenant_id = :tid"), {"tid": str(tenant_id)})
        yield db
    finally:
        try:
            db.execute(text("RESET app.current_tenant_id;"))
        except Exception:
            pass
        db.close()
