"""
Pydantic schemas for Donor and Area modules.
"""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel
from pydantic import EmailStr
from pydantic import Field


# ── Area Schemas ──
class AreaBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    code: str | None = None
    description: str | None = None


class AreaCreate(AreaBase):
    pass


class AreaUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    description: str | None = None
    is_active: bool | None = None


class AreaResponse(AreaBase):
    id: UUID
    tenant_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Donor Schemas ──
class DonorBase(BaseModel):
    area_id: UUID | None = None
    full_name: str = Field(..., min_length=2, max_length=200)
    phone: str | None = None
    email: EmailStr | None = None
    address: str | None = None
    city: str | None = None
    pincode: str | None = None
    pan_number: str | None = None
    is_80g_eligible: bool = False
    is_vip: bool = False
    notes: str | None = None


class DonorCreate(DonorBase):
    donor_number: str | None = None


class DonorUpdate(BaseModel):
    area_id: UUID | None = None
    full_name: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    address: str | None = None
    city: str | None = None
    pincode: str | None = None
    pan_number: str | None = None
    is_80g_eligible: bool | None = None
    is_vip: bool | None = None
    notes: str | None = None
    is_active: bool | None = None


class DonorResponse(DonorBase):
    id: UUID
    tenant_id: UUID
    donor_number: str | None = None
    total_donations: int
    this_year_donations: int | None = 0
    is_active: bool
    created_at: datetime
    updated_at: datetime
    area: AreaResponse | None = None

    model_config = {"from_attributes": True}
