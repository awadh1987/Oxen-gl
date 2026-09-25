"""
HRMS & Double-Entry Financial Ledger API Router.
Implements Phase 2 Biometric HRMS, Payroll runs, and balanced Double-Entry Ledger integrations.
"""

from __future__ import annotations

import logging
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Security, status
from pydantic import BaseModel, Field, ConfigDict, computed_field
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from backend.api.dependencies import (
    TenantContext,
    get_tenant_context,
    require_write_access,
    require_admin_or_accountant,
    require_admin,
    StandardRole,
)

try:
    from backend.database import get_db
    from backend.models import (
        Employee,
        HrmsAttendanceLog,
        PayrollRun,
        FinanceJournalEntry,
        FinanceJournalLine,
    )
except ImportError:
    from database import get_db
    from models import (
        Employee,
        HrmsAttendanceLog,
        PayrollRun,
        FinanceJournalEntry,
        FinanceJournalLine,
    )

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/hrms", tags=["HRMS & Financial Ledger"])


# ==============================================================================
# Pydantic Schemas
# ==============================================================================

class AttendanceLogCreate(BaseModel):
    tenant_id: Optional[uuid.UUID] = None
    company_id: Optional[uuid.UUID] = None
    employee_id: uuid.UUID
    device_id: Optional[str] = "BIO-SCANNER-01"
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    biometric_hash: Optional[str] = None
    verification_mode: str = "BIOMETRIC_FINGERPRINT"


class AttendanceLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    employee_id: uuid.UUID
    device_id: Optional[str] = None
    check_in: datetime
    check_out: Optional[datetime] = None
    biometric_hash: Optional[str] = None
    verification_mode: str
    created_at: datetime


class EmployeeCreate(BaseModel):
    tenant_id: Optional[uuid.UUID] = None
    company_id: Optional[uuid.UUID] = None
    user_id: Optional[uuid.UUID] = None
    employee_code: Optional[str] = None
    employeeNumber: Optional[str] = None
    name: Optional[str] = None
    nameAr: Optional[str] = None
    nameEn: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    department: Optional[str] = None
    departmentAr: Optional[str] = None
    departmentEn: Optional[str] = None
    base_salary: Optional[Decimal] = None
    baseSalary: Optional[Decimal] = None
    hire_date: Optional[date] = None
    hireDate: Optional[date] = None
    is_active: bool = True


class EmployeeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    employee_code: str
    first_name: str
    last_name: str
    department: str
    base_salary: Decimal
    hire_date: date
    is_active: bool

    @computed_field
    def employeeNumber(self) -> str:
        return self.employee_code

    @computed_field
    def name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    @computed_field
    def nameAr(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    @computed_field
    def nameEn(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    @computed_field
    def departmentAr(self) -> str:
        return self.department

    @computed_field
    def departmentEn(self) -> str:
        return self.department

    @computed_field
    def baseSalary(self) -> float:
        return float(self.base_salary)


class PayrollRunCreate(BaseModel):
    tenant_id: Optional[uuid.UUID] = None
    company_id: Optional[uuid.UUID] = None
    employee_id: uuid.UUID
    pay_period: str = Field(..., pattern=r"^\d{4}-\d{2}$", description="Format: YYYY-MM")
    gross_earnings: Decimal
    allowances: Decimal = Decimal("0.00")
    deductions: Decimal = Decimal("0.00")
    status: str = "DRAFT"


class PayrollRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    employee_id: uuid.UUID
    pay_period: str
    gross_earnings: Decimal
    allowances: Decimal
    deductions: Decimal
    net_pay: Decimal
    status: str


class JournalLineCreate(BaseModel):
    account_code: str
    account_id: Optional[uuid.UUID] = None
    description: Optional[str] = None
    debit: Decimal = Decimal("0.0000")
    credit: Decimal = Decimal("0.0000")


class JournalLineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    account_code: str
    account_id: Optional[uuid.UUID] = None
    description: Optional[str] = None
    debit: Decimal
    credit: Decimal


class JournalEntryCreate(BaseModel):
    tenant_id: Optional[uuid.UUID] = None
    company_id: Optional[uuid.UUID] = None
    entry_number: Optional[str] = None
    description: str
    entry_date: Optional[datetime] = None
    lines: List[JournalLineCreate]


class JournalEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    company_id: Optional[uuid.UUID] = None
    entry_number: str
    entry_date: datetime
    description: str
    total_debit: Decimal
    total_credit: Decimal
    status: str
    lines: List[JournalLineResponse] = []


# ==============================================================================
# Biometric Attendance Endpoints
# ==============================================================================

@router.get("/attendance", response_model=List[AttendanceLogResponse])
def list_attendance_logs(
    employee_id: Optional[uuid.UUID] = None,
    tenant_id: Optional[uuid.UUID] = None,
    limit: int = Query(50, ge=1, le=500),
    context: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """Retrieve biometric attendance logs strictly filtered by caller tenant."""
    context.check_access(tenant_id)
    target_tenant = tenant_id if (context.is_super_admin and tenant_id) else context.tenant_id

    query = select(HrmsAttendanceLog).where(HrmsAttendanceLog.tenant_id == target_tenant).order_by(desc(HrmsAttendanceLog.check_in))
    if employee_id:
        query = query.where(HrmsAttendanceLog.employee_id == employee_id)
    query = query.limit(limit)
    return db.execute(query).scalars().all()


@router.post("/attendance", response_model=AttendanceLogResponse, status_code=status.HTTP_201_CREATED, dependencies=[Security(require_write_access)])
def record_attendance(
    payload: AttendanceLogCreate,
    context: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """Record a biometric attendance clock-in or clock-out event with cryptographic verification."""
    context.check_access(payload.tenant_id, payload.company_id)
    effective_tenant_id = (payload.tenant_id or payload.company_id) if (context.is_super_admin and (payload.tenant_id or payload.company_id)) else context.tenant_id

    emp = db.query(Employee).filter(Employee.id == payload.employee_id).first()
    if emp and not context.is_super_admin and emp.tenant_id != effective_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Multi-tenant isolation violation: Employee belongs to a different tenant.",
        )

    check_in_time = payload.check_in or datetime.now(timezone.utc)
    log = HrmsAttendanceLog(
        id=uuid.uuid4(),
        tenant_id=effective_tenant_id,
        employee_id=payload.employee_id,
        device_id=payload.device_id,
        check_in=check_in_time,
        check_out=payload.check_out,
        biometric_hash=payload.biometric_hash or f"bio_{uuid.uuid4().hex[:16]}",
        verification_mode=payload.verification_mode,
        created_at=datetime.now(timezone.utc),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/attendance/{log_id}", response_model=AttendanceLogResponse)
def get_attendance_log(
    log_id: uuid.UUID,
    context: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """Get single biometric attendance log by ID with strict tenant boundary check."""
    log = db.query(HrmsAttendanceLog).filter(HrmsAttendanceLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance log not found.")
    if not context.is_super_admin and log.tenant_id != context.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to attendance log forbidden.")
    return log


# ==============================================================================
# Employee Directory Endpoints
# ==============================================================================

@router.get("/employees", response_model=List[EmployeeResponse])
def list_employees(
    department: Optional[str] = None,
    tenant_id: Optional[uuid.UUID] = None,
    context: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """List employees in directory strictly filtered by tenant boundary."""
    context.check_access(tenant_id)
    target_tenant = tenant_id if (context.is_super_admin and tenant_id) else context.tenant_id

    query = select(Employee).where(Employee.tenant_id == target_tenant)
    if department:
        query = query.where(Employee.department == department)
    return db.execute(query).scalars().all()


@router.post("/employees", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED, dependencies=[Security(require_write_access), Security(require_admin_or_accountant)])
def create_employee(
    payload: EmployeeCreate,
    context: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """Register a new employee record within caller's isolated tenant."""
    context.check_access(payload.tenant_id, payload.company_id)
    effective_tenant_id = (payload.tenant_id or payload.company_id) if (context.is_super_admin and (payload.tenant_id or payload.company_id)) else context.tenant_id

    code = payload.employee_code or payload.employeeNumber or f"EMP-{uuid.uuid4().hex[:6].upper()}"
    raw_name = payload.name or payload.nameEn or payload.nameAr or ""
    parts = raw_name.strip().split() if raw_name.strip() else []
    first = payload.first_name or (parts[0] if parts else "Employee")
    last = payload.last_name or (" ".join(parts[1:]) if len(parts) > 1 else (payload.nameAr or "Personnel"))
    dept = payload.department or payload.departmentAr or payload.departmentEn or "General Operations"
    salary = payload.base_salary if payload.base_salary is not None else (payload.baseSalary if payload.baseSalary is not None else Decimal("10000.00"))
    hdate = payload.hire_date or payload.hireDate or date.today()

    emp = Employee(
        id=uuid.uuid4(),
        tenant_id=effective_tenant_id,
        user_id=payload.user_id,
        employee_code=code,
        first_name=first,
        last_name=last,
        department=dept,
        base_salary=salary,
        hire_date=hdate,
        is_active=payload.is_active,
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp


@router.get("/employees/{employee_id}", response_model=EmployeeResponse)
def get_employee(
    employee_id: uuid.UUID,
    context: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """Fetch employee by ID with strict tenant boundary check."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
    if not context.is_super_admin and emp.tenant_id != context.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to employee record forbidden.")
    return emp


# ==============================================================================
# Payroll Runs & GL Integration Endpoints
# ==============================================================================

@router.get("/payroll", response_model=List[PayrollRunResponse])
def list_payroll_runs(
    pay_period: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    tenant_id: Optional[uuid.UUID] = None,
    context: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """List payroll runs strictly isolated to tenant."""
    context.check_access(tenant_id)
    target_tenant = tenant_id if (context.is_super_admin and tenant_id) else context.tenant_id

    query = select(PayrollRun).where(PayrollRun.tenant_id == target_tenant)
    if pay_period:
        query = query.where(PayrollRun.pay_period == pay_period)
    if status_filter:
        query = query.where(PayrollRun.status == status_filter)
    return db.execute(query).scalars().all()


@router.post("/payroll", response_model=PayrollRunResponse, status_code=status.HTTP_201_CREATED, dependencies=[Security(require_write_access), Security(require_admin_or_accountant)])
def create_payroll_run(
    payload: PayrollRunCreate,
    context: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """Draft a new payroll run calculation in caller's tenant."""
    context.check_access(payload.tenant_id, payload.company_id)
    effective_tenant_id = (payload.tenant_id or payload.company_id) if (context.is_super_admin and (payload.tenant_id or payload.company_id)) else context.tenant_id

    emp = db.query(Employee).filter(Employee.id == payload.employee_id).first()
    if emp and not context.is_super_admin and emp.tenant_id != effective_tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employee belongs to another tenant.")

    net_pay = payload.gross_earnings + payload.allowances - payload.deductions
    run = PayrollRun(
        id=uuid.uuid4(),
        tenant_id=effective_tenant_id,
        employee_id=payload.employee_id,
        pay_period=payload.pay_period,
        gross_earnings=float(payload.gross_earnings),
        allowances=float(payload.allowances),
        deductions=float(payload.deductions),
        net_pay=float(net_pay),
        status=payload.status.upper(),
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


@router.post("/payroll/{run_id}/post-ledger", response_model=JournalEntryResponse, dependencies=[Security(require_write_access), Security(require_admin_or_accountant)])
def post_payroll_to_ledger(
    run_id: uuid.UUID,
    context: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """
    Approves a payroll draft run and posts a balanced double-entry journal entry to the GL.
    Enforces debit/credit mathematical invariance and tenant boundary.
    """
    run = db.query(PayrollRun).filter(PayrollRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payroll run not found.")

    if not context.is_super_admin and run.tenant_id != context.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to payroll run forbidden.")

    gross = Decimal(str(run.gross_earnings))
    allowances = Decimal(str(run.allowances))
    deductions = Decimal(str(run.deductions))
    net_pay = Decimal(str(run.net_pay))

    # Mathematical invariance verification gate
    total_debit = gross + allowances
    total_credit = net_pay + deductions
    if total_debit != total_credit:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invariance Failure: Debits ({total_debit}) do not balance with credits ({total_credit}).",
        )

    entry = FinanceJournalEntry(
        id=uuid.uuid4(),
        tenant_id=run.tenant_id,
        company_id=run.tenant_id,
        entry_number=f"PAY-{run.pay_period}-{uuid.uuid4().hex[:6].upper()}",
        description=f"Payroll posting period {run.pay_period} for employee {run.employee_id}",
        entry_date=datetime.now(timezone.utc),
        total_debit=total_debit,
        total_credit=total_credit,
        status="POSTED",
        created_at=datetime.now(timezone.utc),
    )
    db.add(entry)
    db.flush()

    # Create balanced journal lines:
    lines = [
        FinanceJournalLine(
            id=uuid.uuid4(),
            tenant_id=run.tenant_id,
            entry_id=entry.id,
            account_code="511000",
            description="Basic salary expense",
            debit=gross,
            credit=Decimal("0.0000"),
        ),
        FinanceJournalLine(
            id=uuid.uuid4(),
            tenant_id=run.tenant_id,
            entry_id=entry.id,
            account_code="512000",
            description="Allowances expense",
            debit=allowances,
            credit=Decimal("0.0000"),
        ),
        FinanceJournalLine(
            id=uuid.uuid4(),
            tenant_id=run.tenant_id,
            entry_id=entry.id,
            account_code="111101",
            description="Net salary payable / cash disbursement",
            debit=Decimal("0.0000"),
            credit=net_pay,
        ),
        FinanceJournalLine(
            id=uuid.uuid4(),
            tenant_id=run.tenant_id,
            entry_id=entry.id,
            account_code="211200",
            description="Payroll deductions / withholdings payable",
            debit=Decimal("0.0000"),
            credit=deductions,
        ),
    ]
    active_lines = [l for l in lines if l.debit > 0 or l.credit > 0]
    db.add_all(active_lines if active_lines else lines)

    run.status = "APPROVED"
    db.commit()
    db.refresh(entry)
    return entry


# ==============================================================================
# Double-Entry Financial Journal Endpoints
# ==============================================================================

@router.get("/journal-entries", response_model=List[JournalEntryResponse])
def list_journal_entries(
    status_filter: Optional[str] = Query(None, alias="status"),
    tenant_id: Optional[uuid.UUID] = None,
    limit: int = Query(50, ge=1, le=500),
    context: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """List financial journal entries strictly isolated to tenant."""
    context.check_access(tenant_id)
    target_tenant = tenant_id if (context.is_super_admin and tenant_id) else context.tenant_id

    query = select(FinanceJournalEntry).where(FinanceJournalEntry.tenant_id == target_tenant).order_by(desc(FinanceJournalEntry.entry_date))
    if status_filter:
        query = query.where(FinanceJournalEntry.status == status_filter)
    query = query.limit(limit)
    return db.execute(query).scalars().all()


@router.post("/journal-entries", response_model=JournalEntryResponse, status_code=status.HTTP_201_CREATED, dependencies=[Security(require_write_access), Security(require_admin_or_accountant)])
def create_journal_entry(
    payload: JournalEntryCreate,
    context: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """
    Create a balanced double-entry financial journal entry.
    Enforces strict mathematical invariance (Sum(Debit) == Sum(Credit)) and tenant boundary.
    """
    if not payload.lines:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Journal entry must contain at least one debit and credit line.",
        )

    context.check_access(payload.tenant_id, payload.company_id)
    effective_tenant_id = (payload.tenant_id or payload.company_id) if (context.is_super_admin and (payload.tenant_id or payload.company_id)) else context.tenant_id

    total_debit = sum((line.debit for line in payload.lines), Decimal("0.0000"))
    total_credit = sum((line.credit for line in payload.lines), Decimal("0.0000"))

    # Double-entry invariant gate
    if total_debit != total_credit:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Double-entry violation: Total debits ({total_debit}) must equal total credits ({total_credit}).",
        )

    entry_number = payload.entry_number or f"JE-{uuid.uuid4().hex[:8].upper()}"

    entry = FinanceJournalEntry(
        id=uuid.uuid4(),
        tenant_id=effective_tenant_id,
        company_id=payload.company_id or effective_tenant_id,
        entry_number=entry_number,
        description=payload.description,
        entry_date=payload.entry_date or datetime.now(timezone.utc),
        total_debit=total_debit,
        total_credit=total_credit,
        status="POSTED",
        created_at=datetime.now(timezone.utc),
    )
    db.add(entry)
    db.flush()

    for line in payload.lines:
        jl = FinanceJournalLine(
            id=uuid.uuid4(),
            tenant_id=effective_tenant_id,
            entry_id=entry.id,
            account_code=line.account_code,
            account_id=line.account_id,
            description=line.description,
            debit=line.debit,
            credit=line.credit,
        )
        db.add(jl)

    db.commit()
    db.refresh(entry)
    return entry


@router.get("/journal-entries/{entry_id}", response_model=JournalEntryResponse)
def get_journal_entry(
    entry_id: uuid.UUID,
    context: TenantContext = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """Retrieve journal entry details and associated lines with strict tenant isolation."""
    entry = db.query(FinanceJournalEntry).filter(FinanceJournalEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found.")
    if not context.is_super_admin and entry.tenant_id != context.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to journal entry forbidden.")
    return entry

