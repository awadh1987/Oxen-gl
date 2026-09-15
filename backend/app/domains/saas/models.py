"""
OxenGL Multi-Tenant SaaS Billing & Subscription Domain Models.
Enforces automated tier metering, seat allocation constraints, and atomic usage boundaries.
"""

import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, Boolean, Integer, Numeric, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

try:
    from backend.database import Base
except ImportError:
    from app.db.base import Base


class SubscriptionPlan(Base):
    """Stores product pricing tiers, seat quotas, and fleet size limits."""
    __tablename__ = "subscription_plans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # 'STARTER', 'ENTERPRISE'
    stripe_price_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    max_seats: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    max_vehicles: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    monthly_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)


class TenantSubscription(Base):
    """Tracks active tenant subscription contracts, payment states, and active metrics counters."""
    __tablename__ = "tenant_subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True, index=True, nullable=False)
    plan_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("subscription_plans.id"), nullable=False)
    stripe_customer_id: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)  # 'active', 'past_due', 'canceled'
    current_seats_used: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    current_vehicles_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    current_period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    def __init__(self, **kwargs):
        max_seats_val = kwargs.pop("max_seats", None)
        super().__init__(**kwargs)
        if max_seats_val is not None:
            self.max_seats = max_seats_val
