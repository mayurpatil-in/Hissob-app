"""
Financial Year Router — Lifecycle management for fiscal years.
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.deps import get_current_active_user
from app.permissions.rbac import require
from app.models.user import User
from app.models.financial_year import FinancialYear, FYStatus
from app.repositories.financial import FinancialYearRepository
from app.schemas.financial_year import (
    FinancialYearCreate,
    FinancialYearUpdate,
    FinancialYearResponse,
)
from app.schemas.common import SuccessResponse

router = APIRouter(prefix="/financial-years", tags=["Financial Year"])


@router.get("", response_model=List[FinancialYearResponse], summary="List Financial Years")
async def list_financial_years(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not current_user.tenant_id and not current_user.is_super_admin:
        raise HTTPException(status_code=400, detail="Tenant context required")
    repo = FinancialYearRepository(db)
    return repo.get_by_tenant(current_user.tenant_id)


@router.post("", response_model=FinancialYearResponse, status_code=status.HTTP_201_CREATED, summary="Create Financial Year")
async def create_financial_year(
    payload: FinancialYearCreate,
    current_user: User = Depends(require("financial_year", "create")),
    db: Session = Depends(get_db),
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")

    repo = FinancialYearRepository(db)
    fy = FinancialYear(
        tenant_id=current_user.tenant_id,
        name=payload.name,
        start_date=payload.start_date,
        end_date=payload.end_date,
        opening_balance=payload.opening_balance,
        notes=payload.notes,
        is_current=payload.is_current,
        status=FYStatus.ACTIVE if payload.is_current else FYStatus.OPEN,
    )
    created = repo.create(fy)
    if payload.is_current:
        repo.set_current(current_user.tenant_id, created.id)
    return created


@router.get("/{fy_id}", response_model=FinancialYearResponse, summary="Get Financial Year Details")
async def get_financial_year(
    fy_id: UUID,
    current_user: User = Depends(require("financial_year", "view")),
    db: Session = Depends(get_db),
):
    repo = FinancialYearRepository(db)
    fy = repo.get(fy_id)
    if not fy or (fy.tenant_id != current_user.tenant_id and not current_user.is_super_admin):
        raise HTTPException(status_code=404, detail="Financial year not found")
    return fy


@router.put("/{fy_id}", response_model=FinancialYearResponse, summary="Update Financial Year")
async def update_financial_year(
    fy_id: UUID,
    payload: FinancialYearUpdate,
    current_user: User = Depends(require("financial_year", "update")),
    db: Session = Depends(get_db),
):
    repo = FinancialYearRepository(db)
    fy = repo.get(fy_id)
    if not fy or (fy.tenant_id != current_user.tenant_id and not current_user.is_super_admin):
        raise HTTPException(status_code=404, detail="Financial year not found")

    if fy.status == FYStatus.LOCKED and not current_user.is_super_admin:
        raise HTTPException(status_code=400, detail="Cannot modify a locked Financial Year")

    update_data = payload.model_dump(exclude_unset=True)
    updated = repo.update(fy, update_data)
    if payload.is_current:
        repo.set_current(current_user.tenant_id, fy_id)
    return updated


@router.post("/{fy_id}/set-current", response_model=FinancialYearResponse, summary="Set as Active Financial Year")
async def set_current_financial_year(
    fy_id: UUID,
    current_user: User = Depends(require("financial_year", "update")),
    db: Session = Depends(get_db),
):
    repo = FinancialYearRepository(db)
    fy = repo.set_current(current_user.tenant_id, fy_id)
    if not fy:
        raise HTTPException(status_code=404, detail="Financial year not found")
    return fy


@router.post("/{fy_id}/close", response_model=FinancialYearResponse, summary="Close Financial Year")
async def close_financial_year(
    fy_id: UUID,
    current_user: User = Depends(require("financial_year", "approve")),
    db: Session = Depends(get_db),
):
    repo = FinancialYearRepository(db)
    fy = repo.get(fy_id)
    if not fy or (fy.tenant_id != current_user.tenant_id and not current_user.is_super_admin):
        raise HTTPException(status_code=404, detail="Financial year not found")

    fy.status = FYStatus.CLOSED
    fy.closed_by = current_user.id
    db.commit()
    db.refresh(fy)
    return fy
