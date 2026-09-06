import json
import uuid
from dataclasses import dataclass

from fastapi import Request
from sqlalchemy.orm import Session

from .models import AuditLog, User


@dataclass(frozen=True)
class AuditContext:
    user_id: str | None
    user_email: str
    endpoint_accessed: str
    ip_address: str


def get_audit_context(request: Request, user_email: str, db: Session) -> AuditContext:
    user = db.query(User).filter_by(email=user_email).first()
    return AuditContext(
        user_id=user.id if user else None,
        user_email=user_email,
        endpoint_accessed=request.url.path,
        ip_address=request.client.host if request.client else "unknown",
    )


def create_structured_audit_log(
    context: AuditContext,
    action: str,
    entity: str,
    entity_id: str | None,
    mathematical_impact: dict[str, object],
) -> AuditLog:
    return AuditLog(
        id=str(uuid.uuid4()), actor_email=context.user_email, action=action,
        entity=entity, entity_id=entity_id,
        details=f"{action} via {context.endpoint_accessed}",
        user_id=context.user_id, endpoint_accessed=context.endpoint_accessed,
        ip_address=context.ip_address,
        mathematical_impact=json.dumps(mathematical_impact, sort_keys=True, default=str),
    )