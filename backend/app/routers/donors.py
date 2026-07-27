"""
Donors & Areas Routers — Manage donors and collection areas.
"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.permissions.rbac import require
from app.models.user import User
from app.models.donor import Donor, Area
from app.repositories.donor import DonorRepository, AreaRepository
from app.schemas.donor import (
    DonorCreate, DonorUpdate, DonorResponse,
    AreaCreate, AreaUpdate, AreaResponse
)

router = APIRouter(prefix="/donors", tags=["Donors"])
areas_router = APIRouter(prefix="/areas", tags=["Areas"])


# ── Area Endpoints ──
@areas_router.get("", response_model=List[AreaResponse], summary="List Areas")
async def list_areas(
    current_user: User = Depends(require("areas", "view")),
    db: Session = Depends(get_db),
):
    if not current_user.tenant_id and not current_user.is_super_admin:
        raise HTTPException(status_code=400, detail="Tenant context required")
    repo = AreaRepository(db)
    return repo.get_active_by_tenant(current_user.tenant_id)


@areas_router.post("", response_model=AreaResponse, status_code=status.HTTP_201_CREATED, summary="Create Area")
async def create_area(
    payload: AreaCreate,
    current_user: User = Depends(require("areas", "create")),
    db: Session = Depends(get_db),
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    repo = AreaRepository(db)
    area = Area(
        tenant_id=current_user.tenant_id,
        name=payload.name,
        code=payload.code,
        description=payload.description,
    )
    return repo.create(area)


from app.auth.deps import get_current_active_user


# ── Donor Endpoints ──
@router.get("", response_model=List[DonorResponse], summary="List & Search Donors")
async def list_donors(
    q: Optional[str] = Query(None, description="Search by name, phone or donor number"),
    area_id: Optional[UUID] = Query(None, description="Filter by area"),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not current_user.tenant_id and not current_user.is_super_admin:
        raise HTTPException(status_code=400, detail="Tenant context required")
    repo = DonorRepository(db)
    donors = repo.search_donors(current_user.tenant_id, query=q, area_id=area_id, skip=skip, limit=limit)

    # Active Financial Year
    from app.models.financial_year import FinancialYear
    from app.models.receipt import Receipt, ReceiptStatus
    from sqlalchemy import func

    active_fy = db.query(FinancialYear).filter(
        FinancialYear.tenant_id == current_user.tenant_id,
        FinancialYear.is_current == True
    ).first()

    fy_donations_map = {}
    if active_fy:
        fy_sums = (
            db.query(Receipt.donor_id, func.sum(Receipt.amount))
            .filter(
                Receipt.tenant_id == current_user.tenant_id,
                Receipt.financial_year_id == active_fy.id,
                Receipt.status != ReceiptStatus.CANCELLED,
            )
            .group_by(Receipt.donor_id)
            .all()
        )
        fy_donations_map = {donor_id: int(total or 0) for donor_id, total in fy_sums}

    lifetime_sums = (
        db.query(Receipt.donor_id, func.sum(Receipt.amount))
        .filter(
            Receipt.tenant_id == current_user.tenant_id,
            Receipt.status != ReceiptStatus.CANCELLED,
        )
        .group_by(Receipt.donor_id)
        .all()
    )
    lifetime_map = {donor_id: int(total or 0) for donor_id, total in lifetime_sums}

    for d in donors:
        if d.id in lifetime_map:
            d.total_donations = lifetime_map[d.id]
        setattr(d, 'this_year_donations', fy_donations_map.get(d.id, 0))

    return donors


@router.post("", response_model=DonorResponse, status_code=status.HTTP_201_CREATED, summary="Create Donor")
async def create_donor(
    payload: DonorCreate,
    current_user: User = Depends(require("donors", "create")),
    db: Session = Depends(get_db),
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")

    repo = DonorRepository(db)
    donor_number = payload.donor_number or repo.generate_donor_number(current_user.tenant_id)

    donor = Donor(
        tenant_id=current_user.tenant_id,
        area_id=payload.area_id,
        donor_number=donor_number,
        full_name=payload.full_name,
        phone=payload.phone,
        email=payload.email,
        address=payload.address,
        city=payload.city,
        pincode=payload.pincode,
        pan_number=payload.pan_number,
        is_80g_eligible=payload.is_80g_eligible,
        is_vip=payload.is_vip,
        notes=payload.notes,
    )
    return repo.create(donor)


@router.get("/{donor_id}", response_model=DonorResponse, summary="Get Donor Details")
async def get_donor(
    donor_id: UUID,
    current_user: User = Depends(require("donors", "view")),
    db: Session = Depends(get_db),
):
    repo = DonorRepository(db)
    donor = repo.get(donor_id)
    if not donor or (donor.tenant_id != current_user.tenant_id and not current_user.is_super_admin):
        raise HTTPException(status_code=404, detail="Donor not found")
    return donor


@router.get("/{donor_id}/summary", summary="Get Donor Comprehensive History & Metrics")
async def get_donor_summary(
    donor_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    from app.models.receipt import Receipt, ReceiptStatus, PaymentMode
    from sqlalchemy import func

    repo = DonorRepository(db)
    donor = repo.get(donor_id)
    if not donor or (donor.tenant_id != current_user.tenant_id and not current_user.is_super_admin):
        raise HTTPException(status_code=404, detail="Donor not found")

    # Query receipts for this donor
    receipts_raw = (
        db.query(Receipt)
        .filter(
            Receipt.tenant_id == current_user.tenant_id,
            Receipt.donor_id == donor_id,
            Receipt.status != ReceiptStatus.CANCELLED,
        )
        .order_by(Receipt.receipt_date.desc())
        .all()
    )

    total_amount = sum(r.amount for r in receipts_raw)
    receipt_count = len(receipts_raw)
    avg_donation = (total_amount / receipt_count) if receipt_count > 0 else 0.0
    cash_total = sum(r.amount for r in receipts_raw if r.payment_mode == PaymentMode.CASH)
    digital_total = total_amount - cash_total

    first_date = str(receipts_raw[-1].receipt_date) if receipts_raw else None
    last_date = str(receipts_raw[0].receipt_date) if receipts_raw else None

    user_map = {u.id: u.full_name for u in db.query(User).all()}
    receipt_list = []
    for r in receipts_raw:
        collector_name = user_map.get(r.collector_id, "Collector")
        receipt_list.append({
            "id": str(r.id),
            "receipt_number": r.receipt_number,
            "receipt_date": str(r.receipt_date),
            "amount": float(r.amount),
            "payment_mode": r.payment_mode.value if hasattr(r.payment_mode, "value") else str(r.payment_mode),
            "status": r.status.value if hasattr(r.status, "value") else str(r.status),
            "collector_name": collector_name,
            "purpose": r.purpose or "Festival Donation",
            "notes": r.notes,
        })

    return {
        "donor": {
            "id": str(donor.id),
            "donor_number": donor.donor_number,
            "full_name": donor.full_name,
            "phone": donor.phone,
            "email": donor.email,
            "address": donor.address,
            "city": donor.city,
            "pan_number": donor.pan_number,
            "is_vip": donor.is_vip,
            "is_80g_eligible": donor.is_80g_eligible,
        },
        "metrics": {
            "total_amount": float(total_amount),
            "receipt_count": receipt_count,
            "average_donation": float(avg_donation),
            "cash_total": float(cash_total),
            "digital_total": float(digital_total),
            "first_donation_date": first_date,
            "last_donation_date": last_date,
        },
        "receipts": receipt_list,
    }


@router.put("/{donor_id}", response_model=DonorResponse, summary="Update Donor")
async def update_donor(
    donor_id: UUID,
    payload: DonorUpdate,
    current_user: User = Depends(require("donors", "update")),
    db: Session = Depends(get_db),
):
    repo = DonorRepository(db)
    donor = repo.get(donor_id)
    if not donor or (donor.tenant_id != current_user.tenant_id and not current_user.is_super_admin):
        raise HTTPException(status_code=404, detail="Donor not found")

    return repo.update(donor, payload.model_dump(exclude_unset=True))
