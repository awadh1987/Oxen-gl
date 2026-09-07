import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, ConfigDict, UUID4


app = FastAPI(
	title="Meayon ERP backend API",
	version="1.0.0",
	description="نظام إدارة عمليات النقل والشحن والمالية لشركة ميون",
)

app.add_middleware(
	CORSMiddleware,
	allow_origins=[
		"http://localhost:5173",
		"http://localhost:3000",
		"https://6grq4drw-5173.inc1.devtunnels.ms",
		"https://6grq4drw-3001.inc1.devtunnels.ms",
	],
	allow_origin_regex=r"https://.*\.devtunnels\.ms",
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


class OperationCreate(BaseModel):
	model_config = ConfigDict(extra="allow")

	transporter_id: str
	route: str
	amount: float
	client_name: str


class OperationResponse(OperationCreate):
	id: UUID4
	invoice_id: UUID4
	profit: float
	created_at: datetime


class Token(BaseModel):
	access_token: str
	token_type: str


fake_db_operations: List[OperationResponse] = []


@app.get("/", tags=["Health Check"])
async def root():
	return {
		"status": "online",
		"message": "Meayon ERP backend API is running successfully",
		"documentation": "/docs",
	}


@app.post("/token", response_model=Token, tags=["Authentication"])
async def login_for_access_token(
	form_data: OAuth2PasswordRequestForm = Depends(),
):
	if (
		form_data.username == "muath.salaih@meayon.com"
		and form_data.password == "meayon2026"
	):
		return {
			"access_token": "mock-jwt-token-for-muath-admin",
			"token_type": "bearer",
		}
	raise HTTPException(
		status_code=status.HTTP_401_UNAUTHORIZED,
		detail="اسم المستخدم أو كلمة المرور غير صحيحة",
		headers={"WWW-Authenticate": "Bearer"},
	)


@app.post(
	"/api/operations",
	response_model=OperationResponse,
	tags=["Operations & Invoicing"],
)
async def create_operation(
	op: OperationCreate,
	token: str = Depends(oauth2_scheme),
):
	data_dict = op.model_dump() if hasattr(op, "model_dump") else op.dict()
	new_record = OperationResponse(
		id=uuid.uuid4(),
		invoice_id=uuid.uuid4(),
		profit=op.amount * 0.15,
		created_at=datetime.now(timezone.utc),
		**data_dict,
	)
	fake_db_operations.append(new_record)
	return new_record


@app.get(
	"/api/operations",
	response_model=List[OperationResponse],
	tags=["Operations & Invoicing"],
)
async def get_operations(token: str = Depends(oauth2_scheme)):
	return fake_db_operations


@app.get("/api/reports/overdue-invoices", tags=["Reports"])
async def get_overdue_invoices(token: str = Depends(oauth2_scheme)):
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
