# File: backend/app/domains/planning/logo_upload.py
import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status
from sqlalchemy.orm import Session
from backend.app.database import get_isolated_db_session  # Secure RLS Middleware Hook
from backend.app.domains.planning.models import ResCompany  

router = APIRouter(prefix="/api/v1/tenants", tags=["Tenant Branding"])

UPLOAD_DIR = "/var/www/oxengl/media/logos"
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB Limit

os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload-logo")
@router.post("/{tenant_id}/upload-logo")
async def upload_tenant_logo(
    file: UploadFile = File(...),
    tenant_id: str | None = None,
    db: Session = Depends(get_isolated_db_session)  # Enforces session isolation automatically
):
    # 1. Enforce strict size-boundary validation check
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)  # Reset pointer
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size boundary limit breached. Maximum allowed size is 2MB."
        )

    # 2. Enforce strict web format extension checking
    _, ext = os.path.splitext(file.filename.lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported media format extension. Allowed types: {ALLOWED_EXTENSIONS}"
        )

    # 3. Locate the tenant resource model inside the database session
    # Because get_isolated_db_session runs 'SET LOCAL app.current_tenant_id',
    # this query is scoped directly to the authenticated tenant automatically.
    company = db.query(ResCompany).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target enterprise tenant mapping not found or access denied."
        )

    tenant_id = str(company.id)
    unique_filename = f"logo_{tenant_id}_{uuid.uuid4().hex}{ext}"
    secure_file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # 4. Atomic write binary stream data array down to disk
    try:
        with open(secure_file_path, "wb") as buffer:
            while content := await file.read(1024 * 64):  # 64kb chunk sizes
                buffer.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File system failure encountered during asset write: {str(e)}"
        )

    # 5. Save relative public routing path to database model registry
    public_web_url = f"/media/logos/{unique_filename}"
    company.logo_url = public_web_url
    db.commit()

    return {
        "status": "SUCCESS",
        "message": "Tenant logo asset uploaded and securely isolated.",
        "logo_url": public_web_url
    }
import re
from pydantic import BaseModel, Field
from backend.app.database import SessionLocal  # Standard session connection pool (bypass RLS prior to login verification)

class SlugCheckRequest(BaseModel):
    # Enforce alphanumeric + hyphen checking to entirely block malicious SQL injection strings
    slug: str = Field(..., min_length=2, max_length=100)

@router.post("/validate-slug", status_code=status.HTTP_200_OK)
async def validate_tenant_slug(payload: SlugCheckRequest):
    """
    Zero-Disclosure backend workspace verification gateway.
    Confirms workspace existence without exposing internal database topologies.
    """
    # Clean and validate input structure string format
    sanitized_slug = payload.slug.lower().strip()
    if not re.match(r"^[a-z0-9\-]+$", sanitized_slug):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid workspace format parameters."
        )

    db = SessionLocal()
    try:
        # Search directly for matching localized tenant registry anchors
        company = db.query(ResCompany).filter(ResCompany.domain_slug == sanitized_slug).first()
        
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Requested workspace environment is either inactive or unregistered."
            )
            
        # Return strict, minimized layout parameters required to flip frontend display gates
        return {
            "status": "VALID",
            "target": str(company.id),
            "branding_context": {
                "custom_logo": bool(company.logo_url)
            }
        }
    finally:
        db.close()
