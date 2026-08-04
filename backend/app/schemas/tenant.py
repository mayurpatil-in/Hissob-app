"""
Pydantic schemas for Tenants / Organizations.
"""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel
from pydantic import EmailStr
from pydantic import Field

from app.models.tenant import TenantStatus


class TenantBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    slug: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str = "India"
    pincode: str | None = None
    logo_url: str | None = None
    qr_code_url: str | None = None
    upi_id: str | None = None
    website: str | None = None
    gstin: str | None = None
    pan: str | None = None
    registration_number: str | None = None
    timezone: str = "Asia/Kolkata"
    currency: str = "INR"
    fiscal_year_start_month: int = Field(4, ge=1, le=12)
    receipt_template: str = "modern"
    allow_permanent_deletion: bool = True
    enable_email_receipts: bool = True
    enable_daily_digest: bool = True
    enable_welcome_email: bool = True
    digest_recipients: str | None = None
    ai_provider: str | None = "gemini"


class TenantCreate(TenantBase):
    plan_id: UUID | None = None
    storage_limit_mb: int = 500
    max_users: int = 10
    admin_name: str = Field(..., min_length=2, max_length=200)
    admin_email: EmailStr
    admin_password: str = Field(..., min_length=6)


class TenantUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    logo_url: str | None = None
    qr_code_url: str | None = None
    upi_id: str | None = None
    website: str | None = None
    gstin: str | None = None
    pan: str | None = None
    registration_number: str | None = None
    status: TenantStatus | None = None
    storage_limit_mb: int | None = None
    max_users: int | None = None
    is_active: bool | None = None
    receipt_template: str | None = None
    allow_permanent_deletion: bool | None = None
    enable_email_receipts: bool | None = None
    enable_daily_digest: bool | None = None
    enable_welcome_email: bool | None = None
    digest_recipients: str | None = None
    ai_provider: str | None = None


class TenantResponse(TenantBase):
    id: UUID
    status: TenantStatus
    storage_limit_mb: int
    max_users: int
    is_active: bool
    allow_permanent_deletion: bool = True
    enable_email_receipts: bool = True
    enable_daily_digest: bool = True
    enable_welcome_email: bool = True
    digest_recipients: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
