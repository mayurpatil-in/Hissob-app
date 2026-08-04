"""
Pydantic schemas for Inventory & Asset Management module.
"""
from datetime import date
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel
from pydantic import Field

from app.models.inventory import AssetCondition
from app.models.inventory import CheckoutAction
from app.models.inventory import CheckoutStatus


# ── Asset Category Schemas ──
class AssetCategoryBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    code: str | None = None
    description: str | None = None


class AssetCategoryCreate(AssetCategoryBase):
    pass


class AssetCategoryUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    description: str | None = None
    is_active: bool | None = None


class AssetCategoryResponse(AssetCategoryBase):
    id: UUID
    tenant_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Asset Item Schemas ──
class AssetBase(BaseModel):
    category_id: UUID
    festival_id: UUID | None = None
    name: str = Field(..., min_length=2, max_length=200)
    asset_code: str | None = None
    quantity_total: int = Field(default=1, ge=1)
    unit: str = Field(default="Pcs", max_length=30)
    condition: AssetCondition = AssetCondition.GOOD
    storage_location: str | None = None
    estimated_value: float = Field(default=0.0, ge=0.0)
    purchase_date: date | None = None
    notes: str | None = None


class AssetCreate(AssetBase):
    pass


class AssetUpdate(BaseModel):
    category_id: UUID | None = None
    festival_id: UUID | None = None
    name: str | None = None
    quantity_total: int | None = Field(default=None, ge=1)
    unit: str | None = None
    condition: AssetCondition | None = None
    storage_location: str | None = None
    estimated_value: float | None = None
    purchase_date: date | None = None
    notes: str | None = None
    is_active: bool | None = None


class AssetResponse(AssetBase):
    id: UUID
    tenant_id: UUID
    quantity_available: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    category: AssetCategoryResponse | None = None

    model_config = {"from_attributes": True}


# ── Asset Checkout & Return Schemas ──
class AssetCheckoutCreate(BaseModel):
    asset_id: UUID
    quantity: int = Field(default=1, ge=1)
    issued_to_person: str = Field(..., min_length=2, max_length=200)
    expected_return_at: datetime | None = None
    notes: str | None = None


class AssetReturnCreate(BaseModel):
    checkout_id: UUID
    returned_condition: AssetCondition = AssetCondition.GOOD
    damage_notes: str | None = None
    damage_charge: float = Field(default=0.0, ge=0.0)


class AssetCheckoutResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    asset_id: UUID
    action_type: CheckoutAction
    quantity: int
    issued_to_person: str
    issued_by_user_id: UUID
    issued_at: datetime
    expected_return_at: datetime | None = None
    returned_at: datetime | None = None
    returned_condition: AssetCondition | None = None
    damage_notes: str | None = None
    damage_charge: float
    status: CheckoutStatus
    created_at: datetime
    updated_at: datetime
    asset: AssetResponse | None = None
    issued_by_name: str | None = None

    model_config = {"from_attributes": True}


# ── Inventory Summary Dashboard Schema ──
class InventorySummaryResponse(BaseModel):
    total_assets_count: int
    total_items_quantity: int
    total_estimated_value: float
    active_checkouts_count: int
    damaged_repair_count: int
