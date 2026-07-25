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
    return repo.search_donors(current_user.tenant_id, query=q, area_id=area_id, skip=skip, limit=limit)


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
