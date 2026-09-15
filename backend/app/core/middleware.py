"""
OxenGL Correlation Context and Request Tracking Middleware.
Provides unified X-Correlation-ID tracing across API requests, background workers,
and database audit logs.
"""

from __future__ import annotations

import contextvars
import logging
import uuid
from typing import Any, Callable, Dict, Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("oxengl.middleware.correlation")

# Context variable for request correlation tracking
correlation_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar(
    "correlation_id", default=""
)


def get_correlation_id() -> str:
    """Retrieve the current request correlation ID from context, or generate one."""
    cid = correlation_id_ctx.get()
    if not cid:
        cid = str(uuid.uuid4())
        correlation_id_ctx.set(cid)
    return cid


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    Standard request-level middleware that captures or generates an
    X-Correlation-ID header for every inbound client API cycle.
    Propagates this ID into request state, contextvars, and response headers.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        header_cid = request.headers.get("X-Correlation-ID") or request.headers.get("x-correlation-id")
        cid = header_cid if header_cid else str(uuid.uuid4())

        # Set into request state and context variable
        request.state.correlation_id = cid
        token = correlation_id_ctx.set(cid)

        try:
            response = await call_next(request)
            response.headers["X-Correlation-ID"] = cid
            return response
        finally:
            correlation_id_ctx.reset(token)


def dispatch_async_audit(
    actor_email: str,
    action: str,
    endpoint_accessed: str,
    outcome: str = "SUCCESS",
    correlation_id: Optional[str] = None,
    tenant_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Safely dispatches audit event to Celery worker if available;
    falls back cleanly if Celery broker is currently unavailable.
    """
    from backend.app.core.tasks import emit_audit_log

    cid = correlation_id or get_correlation_id()
    try:
        emit_audit_log.delay(
            actor_email=actor_email,
            action=action,
            endpoint_accessed=endpoint_accessed,
            outcome=outcome,
            correlation_id=cid,
            tenant_id=tenant_id,
            details=details,
        )
    except Exception as e:
        logger.warning(
            "Celery async queue unavailable (%s); executing audit log synchronously",
            e,
        )
        try:
            emit_audit_log(
                actor_email=actor_email,
                action=action,
                endpoint_accessed=endpoint_accessed,
                outcome=outcome,
                correlation_id=cid,
                tenant_id=tenant_id,
                details=details,
            )
        except Exception as inner_e:
            logger.error("Failed synchronous fallback audit logging: %s", inner_e)
