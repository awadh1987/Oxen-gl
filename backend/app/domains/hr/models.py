import uuid
import datetime
from datetime import datetime as dt_class, date
from typing import Optional
from sqlalchemy import String, ForeignKey, DateTime, Boolean, Numeric, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class Employee(Base):
    """Core personnel identity record. Links profiles cleanly to users and tenant isolation."""
    __tablename__ = "employees"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, nullable=False)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("res_users.id", ondelete="SET NULL"), nullable=True)
    
    employee_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    base_salary: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0.00)
    hire_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class AttendanceLog(Base):
    """Tracks biometric check-ins and check-outs for automated working hours logs."""
    __tablename__ = "attendance_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, nullable=False)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    
    check_in: Mapped[dt_class] = mapped_column(DateTime(timezone=True), nullable=False)
    check_out: Mapped[Optional[dt_class]] = mapped_column(DateTime(timezone=True), nullable=True)
    device_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)


class PayrollRun(Base):
    """Calculates compensation ledgers, adding allowances and subtracting deductions dynamically."""
    __tablename__ = "payroll_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, nullable=False)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    
    pay_period: Mapped[str] = mapped_column(String(7), nullable=False, index=True)  # e.g. '2026-09'
    gross_earnings: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    allowances: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    deductions: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    net_pay: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)  # Formula: Gross + Allowances - Deductions
    status: Mapped[str] = mapped_column(String(30), default="DRAFT", nullable=False)  # 'DRAFT', 'APPROVED', 'PAID'


class HrmsAttendanceLog(Base):
    """Tracks biometric check-ins and check-outs for automated working hours logs with biometric hashes."""
    __tablename__ = "hrms_attendance_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, nullable=False)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)

    device_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    check_in: Mapped[dt_class] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    check_out: Mapped[Optional[dt_class]] = mapped_column(DateTime(timezone=True), nullable=True)
    biometric_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    verification_mode: Mapped[str] = mapped_column(String(50), default="BIOMETRIC_FINGERPRINT", nullable=False)
    created_at: Mapped[dt_class] = mapped_column(DateTime(timezone=True), default=dt_class.utcnow, nullable=False)

    def __init__(self, *args, **kwargs):
        if "biometric_timestamp" in kwargs and "check_in" not in kwargs:
            kwargs["check_in"] = kwargs.pop("biometric_timestamp")
        if "device_identifier" in kwargs and "device_id" not in kwargs:
            kwargs["device_id"] = kwargs.pop("device_identifier")
        if "crypto_hash" in kwargs and "biometric_hash" not in kwargs:
            kwargs["biometric_hash"] = kwargs.pop("crypto_hash")
        if "log_type" in kwargs and "verification_mode" not in kwargs:
            kwargs["verification_mode"] = kwargs.pop("log_type")
        if "id" in kwargs and isinstance(kwargs["id"], str):
            kwargs["id"] = uuid.UUID(kwargs["id"])
        if "tenant_id" in kwargs and isinstance(kwargs["tenant_id"], str):
            kwargs["tenant_id"] = uuid.UUID(kwargs["tenant_id"])
        if "employee_id" in kwargs and isinstance(kwargs["employee_id"], str):
            kwargs["employee_id"] = uuid.UUID(kwargs["employee_id"])
        super().__init__(*args, **kwargs)

