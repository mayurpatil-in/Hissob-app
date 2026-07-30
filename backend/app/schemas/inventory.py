"""
Pydantic schemas for Inventory & Asset Management module.
"""
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import date, datetime
from app.models.inventory import AssetCondition, CheckoutAction, CheckoutStatus


# ── Asset Category Schemas ──
class AssetCategoryBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    code: Optional[str] = None
    description: Optional[str] = None


class AssetCategoryCreate(AssetCategoryBase):
    pass


class AssetCategoryUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


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
    festival_id: Optional[UUID] = None
    name: str = Field(..., min_length=2, max_length=200)
    asset_code: Optional[str] = None
    quantity_total: int = Field(default=1, ge=1)
    unit: str = Field(default="Pcs", max_length=30)
    condition: AssetCondition = AssetCondition.GOOD
    storage_location: Optional[str] = None
    estimated_value: float = Field(default=0.0, ge=0.0)
    purchase_date: Optional[date] = None
    notes: Optional[str] = None


class AssetCreate(AssetBase):
    pass


class AssetUpdate(BaseModel):
    category_id: Optional[UUID] = None
    festival_id: Optional[UUID] = None
    name: Optional[str] = None
    quantity_total: Optional[int] = Field(default=None, ge=1)
    unit: Optional[str] = None
    condition: Optional[AssetCondition] = None
    storage_location: Optional[str] = None
    estimated_value: Optional[float] = None
    purchase_date: Optional[date] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class AssetResponse(AssetBase):
    id: UUID
    tenant_id: UUID
    quantity_available: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    category: Optional[AssetCategoryResponse] = None

    model_config = {"from_attributes": True}


# ── Asset Checkout & Return Schemas ──
class AssetCheckoutCreate(BaseModel):
    asset_id: UUID
    quantity: int = Field(default=1, ge=1)
    issued_to_person: str = Field(..., min_length=2, max_length=200)
    expected_return_at: Optional[datetime] = None
    notes: Optional[str] = None


class AssetReturnCreate(BaseModel):
    checkout_id: UUID
    returned_condition: AssetCondition = AssetCondition.GOOD
    damage_notes: Optional[str] = None
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
    expected_return_at: Optional[datetime] = None
    returned_at: Optional[datetime] = None
    returned_condition: Optional[AssetCondition] = None
    damage_notes: Optional[str] = None
    damage_charge: float
    status: CheckoutStatus
    created_at: datetime
    updated_at: datetime
    asset: Optional[AssetResponse] = None
    issued_by_name: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Inventory Summary Dashboard Schema ──
class InventorySummaryResponse(BaseModel):
    total_assets_count: int
    total_items_quantity: int
    total_estimated_value: float
    active_checkouts_count: int
    damaged_repair_count: int
