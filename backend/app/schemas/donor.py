"""
Pydantic schemas for Donor and Area modules.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


# ── Area Schemas ──
class AreaBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    code: Optional[str] = None
    description: Optional[str] = None


class AreaCreate(AreaBase):
    pass


class AreaUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class AreaResponse(AreaBase):
    id: UUID
    tenant_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Donor Schemas ──
class DonorBase(BaseModel):
    area_id: Optional[UUID] = None
    full_name: str = Field(..., min_length=2, max_length=200)
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    pan_number: Optional[str] = None
    is_80g_eligible: bool = False
    is_vip: bool = False
    notes: Optional[str] = None


class DonorCreate(DonorBase):
    donor_number: Optional[str] = None


class DonorUpdate(BaseModel):
    area_id: Optional[UUID] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    pan_number: Optional[str] = None
    is_80g_eligible: Optional[bool] = None
    is_vip: Optional[bool] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class DonorResponse(DonorBase):
    id: UUID
    tenant_id: UUID
    donor_number: Optional[str] = None
    total_donations: int
    this_year_donations: Optional[int] = 0
    is_active: bool
    created_at: datetime
    updated_at: datetime
    area: Optional[AreaResponse] = None

    model_config = {"from_attributes": True}
