from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None


class RoleCreate(RoleBase):
    pass


class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str


class UserCreate(UserBase):
    password: str
    role_name: str = "Data_Entry"


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    role: str
    is_active: bool
    created_at: datetime


class OperationCreate(BaseModel):
    model_config = ConfigDict(extra="allow")

    transporter_id: str
    route: str
    amount: float
    client_name: str


class OperationRead(OperationCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    invoice_id: str
    profit: float
    created_at: datetime


class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    actor_email: str
    action: str
    entity: str
    entity_id: Optional[str]
    details: Optional[str]
    created_at: datetime
