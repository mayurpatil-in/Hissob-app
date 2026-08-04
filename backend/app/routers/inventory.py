"""
Inventory & Physical Assets Router — Manage Mandal equipment, checkouts, returns & damages.
"""
from datetime import UTC
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query
from fastapi import status
from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.deps import get_current_active_user
from app.core.database import get_db
from app.models.inventory import Asset
from app.models.inventory import AssetCategory
from app.models.inventory import AssetCheckout
from app.models.inventory import AssetCondition
from app.models.inventory import CheckoutAction
from app.models.inventory import CheckoutStatus
from app.models.user import User
from app.schemas.inventory import AssetCategoryCreate
from app.schemas.inventory import AssetCategoryResponse
from app.schemas.inventory import AssetCategoryUpdate
from app.schemas.inventory import AssetCheckoutCreate
from app.schemas.inventory import AssetCheckoutResponse
from app.schemas.inventory import AssetCreate
from app.schemas.inventory import AssetResponse
from app.schemas.inventory import AssetReturnCreate
from app.schemas.inventory import AssetUpdate
from app.schemas.inventory import InventorySummaryResponse
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/inventory", tags=["Inventory & Assets"])


# Helper for tenant checking
def get_tenant_id(current_user: User) -> UUID:
    if current_user.tenant_id:
        return current_user.tenant_id
    raise HTTPException(status_code=400, detail="Tenant context required")


# ── 1. Asset Categories ──

@router.get("/categories", response_model=list[AssetCategoryResponse], summary="List Asset Categories")
async def list_categories(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    tenant_id = get_tenant_id(current_user)
    stmt = select(AssetCategory).where(
        AssetCategory.tenant_id == tenant_id,
        AssetCategory.is_active
    ).order_by(AssetCategory.name)
    return db.scalars(stmt).all()


@router.post("/categories", response_model=AssetCategoryResponse, status_code=status.HTTP_201_CREATED, summary="Create Asset Category")
async def create_category(
    payload: AssetCategoryCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    tenant_id = get_tenant_id(current_user)
    cat = AssetCategory(
        tenant_id=tenant_id,
        name=payload.name,
        code=payload.code,
        description=payload.description,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)

    log_audit_event(
        db, current_user, "inventory", "create_category",
        record_label=f"Category: {cat.name}", record_id=str(cat.id)
    )
    return cat


@router.put("/categories/{category_id}", response_model=AssetCategoryResponse, summary="Update Asset Category")
async def update_category(
    category_id: UUID,
    payload: AssetCategoryUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    tenant_id = get_tenant_id(current_user)
    stmt = select(AssetCategory).where(
        AssetCategory.id == category_id,
        AssetCategory.tenant_id == tenant_id
    )
    cat = db.scalar(stmt)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    if payload.name is not None: cat.name = payload.name
    if payload.code is not None: cat.code = payload.code
    if payload.description is not None: cat.description = payload.description
    if payload.is_active is not None: cat.is_active = payload.is_active

    db.commit()
    db.refresh(cat)
    return cat


# ── 2. Asset Items ──

@router.get("/assets", response_model=list[AssetResponse], summary="List & Filter Equipment Assets")
async def list_assets(
    category_id: UUID | None = Query(None),
    festival_id: UUID | None = Query(None),
    condition: str | None = Query(None),
    search: str | None = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    tenant_id = get_tenant_id(current_user)
    stmt = select(Asset).where(
        Asset.tenant_id == tenant_id,
        Asset.is_active
    )

    if category_id:
        stmt = stmt.where(Asset.category_id == category_id)
    if festival_id:
        stmt = stmt.where(Asset.festival_id == festival_id)
    if condition:
        stmt = stmt.where(Asset.condition == condition)
    if search:
        stmt = stmt.where(
            (Asset.name.ilike(f"%{search}%")) | (Asset.asset_code.ilike(f"%{search}%")) | (Asset.storage_location.ilike(f"%{search}%"))
        )

    stmt = stmt.order_by(Asset.created_at.desc())
    assets = db.scalars(stmt).all()
    return assets


@router.post("/assets", response_model=AssetResponse, status_code=status.HTTP_201_CREATED, summary="Create Equipment Asset")
async def create_asset(
    payload: AssetCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    tenant_id = get_tenant_id(current_user)

    # Auto-generate asset code if not provided
    asset_code = payload.asset_code
    if not asset_code:
        count = db.scalar(select(func.count(Asset.id)).where(Asset.tenant_id == tenant_id)) or 0
        asset_code = f"AST-{datetime.now().year}-{count + 1:04d}"

    asset = Asset(
        tenant_id=tenant_id,
        category_id=payload.category_id,
        festival_id=payload.festival_id,
        name=payload.name,
        asset_code=asset_code,
        quantity_total=payload.quantity_total,
        quantity_available=payload.quantity_total,  # Initially all available
        unit=payload.unit,
        condition=payload.condition,
        storage_location=payload.storage_location,
        estimated_value=payload.estimated_value,
        purchase_date=payload.purchase_date,
        notes=payload.notes,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)

    log_audit_event(
        db, current_user, "inventory", "create_asset",
        record_label=f"Asset: {asset.name} ({asset.asset_code})", record_id=str(asset.id)
    )
    return asset


@router.put("/assets/{asset_id}", response_model=AssetResponse, summary="Update Asset Details")
async def update_asset(
    asset_id: UUID,
    payload: AssetUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    tenant_id = get_tenant_id(current_user)
    asset = db.scalar(select(Asset).where(Asset.id == asset_id, Asset.tenant_id == tenant_id))
    if not asset:
        raise HTTPException(status_code=404, detail="Asset item not found")

    if payload.category_id is not None: asset.category_id = payload.category_id
    if payload.festival_id is not None: asset.festival_id = payload.festival_id
    if payload.name is not None: asset.name = payload.name
    if payload.quantity_total is not None:
        diff = payload.quantity_total - asset.quantity_total
        asset.quantity_total = payload.quantity_total
        asset.quantity_available = max(0, asset.quantity_available + diff)
    if payload.unit is not None: asset.unit = payload.unit
    if payload.condition is not None: asset.condition = payload.condition
    if payload.storage_location is not None: asset.storage_location = payload.storage_location
    if payload.estimated_value is not None: asset.estimated_value = payload.estimated_value
    if payload.purchase_date is not None: asset.purchase_date = payload.purchase_date
    if payload.notes is not None: asset.notes = payload.notes
    if payload.is_active is not None: asset.is_active = payload.is_active

    db.commit()
    db.refresh(asset)

    log_audit_event(
        db, current_user, "inventory", "update_asset",
        record_label=f"Asset: {asset.name}", record_id=str(asset.id)
    )
    return asset


@router.delete("/assets/{asset_id}", summary="Soft Delete / Deactivate Asset")
async def delete_asset(
    asset_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    tenant_id = get_tenant_id(current_user)
    asset = db.scalar(select(Asset).where(Asset.id == asset_id, Asset.tenant_id == tenant_id))
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    asset.is_active = False
    db.commit()
    return {"message": f"Asset {asset.name} deactivated successfully"}


# ── 3. Checkout & Return Workflows ──

@router.post("/checkout", response_model=AssetCheckoutResponse, summary="Issue Asset Checkout to Volunteer/Contractor")
async def checkout_asset(
    payload: AssetCheckoutCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    tenant_id = get_tenant_id(current_user)
    asset = db.scalar(select(Asset).where(Asset.id == payload.asset_id, Asset.tenant_id == tenant_id))
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if asset.quantity_available < payload.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient available stock. Available: {asset.quantity_available} {asset.unit}"
        )

    # Deduct available stock
    asset.quantity_available -= payload.quantity

    checkout = AssetCheckout(
        tenant_id=tenant_id,
        asset_id=asset.id,
        action_type=CheckoutAction.CHECKOUT,
        quantity=payload.quantity,
        issued_to_person=payload.issued_to_person,
        issued_by_user_id=current_user.id,
        issued_at=datetime.now(UTC),
        expected_return_at=payload.expected_return_at,
        damage_notes=payload.notes,
        status=CheckoutStatus.ISSUED,
    )
    db.add(checkout)
    db.commit()
    db.refresh(checkout)

    log_audit_event(
        db, current_user, "inventory", "checkout_asset",
        record_label=f"Issued {payload.quantity} {asset.unit} of {asset.name} to {payload.issued_to_person}",
        record_id=str(checkout.id)
    )

    res = AssetCheckoutResponse.model_validate(checkout)
    res.issued_by_name = current_user.full_name
    return res


@router.post("/return", response_model=AssetCheckoutResponse, summary="Process Asset Return & Damage Assessment")
async def return_asset(
    payload: AssetReturnCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    tenant_id = get_tenant_id(current_user)
    checkout = db.scalar(select(AssetCheckout).where(AssetCheckout.id == payload.checkout_id, AssetCheckout.tenant_id == tenant_id))
    if not checkout:
        raise HTTPException(status_code=404, detail="Checkout record not found")

    if checkout.status == CheckoutStatus.RETURNED:
        raise HTTPException(status_code=400, detail="This item checkout has already been returned")

    asset = db.scalar(select(Asset).where(Asset.id == checkout.asset_id))
    if not asset:
        raise HTTPException(status_code=404, detail="Associated asset not found")

    checkout.returned_at = datetime.now(UTC)
    checkout.returned_condition = payload.returned_condition
    checkout.damage_notes = payload.damage_notes
    checkout.damage_charge = payload.damage_charge

    if payload.returned_condition in [AssetCondition.DAMAGED, AssetCondition.UNDER_REPAIR]:
        checkout.status = CheckoutStatus.DAMAGED
        # Do not restore damaged stock to available until repaired
    else:
        checkout.status = CheckoutStatus.RETURNED
        asset.quantity_available = min(asset.quantity_total, asset.quantity_available + checkout.quantity)

    # Update overall asset condition if returned damaged
    if payload.returned_condition == AssetCondition.DAMAGED:
        asset.condition = AssetCondition.DAMAGED

    db.commit()
    db.refresh(checkout)

    log_audit_event(
        db, current_user, "inventory", "return_asset",
        record_label=f"Returned {checkout.quantity} of {asset.name} from {checkout.issued_to_person} ({checkout.status})",
        record_id=str(checkout.id)
    )

    res = AssetCheckoutResponse.model_validate(checkout)
    res.issued_by_name = checkout.issued_by.full_name if checkout.issued_by else None
    return res


@router.get("/checkouts", response_model=list[AssetCheckoutResponse], summary="List Checkout & Return Logs")
async def list_checkouts(
    asset_id: UUID | None = Query(None),
    status: str | None = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    tenant_id = get_tenant_id(current_user)
    stmt = select(AssetCheckout).where(AssetCheckout.tenant_id == tenant_id)

    if asset_id:
        stmt = stmt.where(AssetCheckout.asset_id == asset_id)
    if status:
        stmt = stmt.where(AssetCheckout.status == status)

    stmt = stmt.order_by(AssetCheckout.issued_at.desc())
    checkouts = db.scalars(stmt).all()

    results = []
    for c in checkouts:
        res = AssetCheckoutResponse.model_validate(c)
        res.issued_by_name = c.issued_by.full_name if c.issued_by else None
        results.append(res)

    return results


# ── 4. Inventory Dashboard Summary ──

@router.get("/summary", response_model=InventorySummaryResponse, summary="Get Inventory Metric Summary")
async def get_inventory_summary(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    tenant_id = get_tenant_id(current_user)

    total_assets_count = db.scalar(select(func.count(Asset.id)).where(Asset.tenant_id == tenant_id, Asset.is_active)) or 0
    total_items_quantity = db.scalar(select(func.sum(Asset.quantity_total)).where(Asset.tenant_id == tenant_id, Asset.is_active)) or 0
    total_estimated_value = float(db.scalar(select(func.sum(Asset.estimated_value)).where(Asset.tenant_id == tenant_id, Asset.is_active)) or 0.0)

    active_checkouts_count = db.scalar(select(func.count(AssetCheckout.id)).where(AssetCheckout.tenant_id == tenant_id, AssetCheckout.status == CheckoutStatus.ISSUED)) or 0
    damaged_repair_count = db.scalar(select(func.count(Asset.id)).where(Asset.tenant_id == tenant_id, Asset.is_active, Asset.condition.in_([AssetCondition.DAMAGED, AssetCondition.UNDER_REPAIR]))) or 0

    return InventorySummaryResponse(
        total_assets_count=total_assets_count,
        total_items_quantity=total_items_quantity,
        total_estimated_value=total_estimated_value,
        active_checkouts_count=active_checkouts_count,
        damaged_repair_count=damaged_repair_count,
    )
