"""
Festival Router — Create, view, and manage festivals.
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.permissions.rbac import require
from app.models.user import User
from app.models.festival import Festival
from app.repositories.financial import FestivalRepository
from app.schemas.festival import FestivalCreate, FestivalUpdate, FestivalResponse

router = APIRouter(prefix="/festivals", tags=["Festivals"])


from app.auth.deps import get_current_active_user


@router.get("", response_model=List[FestivalResponse], summary="List Festivals")
async def list_festivals(
    fy_id: UUID = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not current_user.tenant_id and not current_user.is_super_admin:
        raise HTTPException(status_code=400, detail="Tenant context required")

    repo = FestivalRepository(db)
    if fy_id:
        return repo.get_by_financial_year(current_user.tenant_id, fy_id)
    return repo.get_by_tenant(current_user.tenant_id)


@router.post("", response_model=FestivalResponse, status_code=status.HTTP_201_CREATED, summary="Create Festival")
async def create_festival(
    payload: FestivalCreate,
    current_user: User = Depends(require("festivals", "create")),
    db: Session = Depends(get_db),
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")

    repo = FestivalRepository(db)
    festival = Festival(
        tenant_id=current_user.tenant_id,
        financial_year_id=payload.financial_year_id,
        name=payload.name,
        deity=payload.deity,
        location=payload.location,
        start_date=payload.start_date,
        end_date=payload.end_date,
        budget=payload.budget,
        description=payload.description,
    )
    return repo.create(festival)


@router.get("/{festival_id}", response_model=FestivalResponse, summary="Get Festival Details")
async def get_festival(
    festival_id: UUID,
    current_user: User = Depends(require("festivals", "view")),
    db: Session = Depends(get_db),
):
    repo = FestivalRepository(db)
    festival = repo.get(festival_id)
    if not festival or (festival.tenant_id != current_user.tenant_id and not current_user.is_super_admin):
        raise HTTPException(status_code=404, detail="Festival not found")
    return festival


@router.put("/{festival_id}", response_model=FestivalResponse, summary="Update Festival")
async def update_festival(
    festival_id: UUID,
    payload: FestivalUpdate,
    current_user: User = Depends(require("festivals", "update")),
    db: Session = Depends(get_db),
):
    return repo.update(festival, payload.model_dump(exclude_unset=True))


@router.delete("/{festival_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete Festival")
async def delete_festival(
    festival_id: UUID,
    current_user: User = Depends(require("festivals", "delete")),
    db: Session = Depends(get_db),
):
    repo = FestivalRepository(db)
    festival = repo.get(festival_id)
    if not festival or (festival.tenant_id != current_user.tenant_id and not current_user.is_super_admin):
        raise HTTPException(status_code=404, detail="Festival not found")

    repo.delete(festival)
