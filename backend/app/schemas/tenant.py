"""
Pydantic schemas for Tenants / Organizations.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID
from datetime import datetime
from app.models.tenant import TenantStatus


class TenantBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    slug: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    pincode: Optional[str] = None
    logo_url: Optional[str] = None
    qr_code_url: Optional[str] = None
    upi_id: Optional[str] = None
    website: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    registration_number: Optional[str] = None
    timezone: str = "Asia/Kolkata"
    currency: str = "INR"
    fiscal_year_start_month: int = Field(4, ge=1, le=12)
    receipt_template: str = "modern"
    allow_permanent_deletion: bool = True


class TenantCreate(TenantBase):
    plan_id: Optional[UUID] = None
    storage_limit_mb: int = 500
    max_users: int = 10
    admin_name: str = Field(..., min_length=2, max_length=200)
    admin_email: EmailStr
    admin_password: str = Field(..., min_length=6)


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    logo_url: Optional[str] = None
    qr_code_url: Optional[str] = None
    upi_id: Optional[str] = None
    website: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    registration_number: Optional[str] = None
    status: Optional[TenantStatus] = None
    storage_limit_mb: Optional[int] = None
    max_users: Optional[int] = None
    is_active: Optional[bool] = None
    receipt_template: Optional[str] = None
    allow_permanent_deletion: Optional[bool] = None


class TenantResponse(TenantBase):
    id: UUID
    status: TenantStatus
    storage_limit_mb: int
    max_users: int
    is_active: bool
    allow_permanent_deletion: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
