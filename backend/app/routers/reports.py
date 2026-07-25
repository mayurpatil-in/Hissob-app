"""
Reports Router — Generate Daily Collection, Cash Book, and Income/Expense reports.
"""
from typing import List, Optional
from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.permissions.rbac import require
from app.models.user import User
from app.services.reports import ReportsService
from app.schemas.reports import (
    DailyCollectionSummary,
    CashBookEntry,
    FinancialReportSummary,
)

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/daily-collection", response_model=List[DailyCollectionSummary], summary="Daily Collection Summary Report")
async def daily_collection_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: User = Depends(require("reports", "view")),
    db: Session = Depends(get_db),
):
    if not current_user.tenant_id and not current_user.is_super_admin:
        raise HTTPException(status_code=400, detail="Tenant context required")
    service = ReportsService(db)
    return service.get_daily_collection_report(current_user.tenant_id, start_date=start_date, end_date=end_date)


@router.get("/cash-book", response_model=List[CashBookEntry], summary="Cash Book Ledger Report")
async def cash_book_report(
    fy_id: Optional[UUID] = Query(None),
    current_user: User = Depends(require("reports", "view")),
    db: Session = Depends(get_db),
):
    if not current_user.tenant_id and not current_user.is_super_admin:
        raise HTTPException(status_code=400, detail="Tenant context required")
    service = ReportsService(db)
    return service.get_cash_book_report(current_user.tenant_id, fy_id=fy_id)


@router.get("/income-expense", response_model=FinancialReportSummary, summary="Income & Expense Financial Statement")
async def income_expense_report(
    fy_id: Optional[UUID] = Query(None),
    current_user: User = Depends(require("reports", "view")),
    db: Session = Depends(get_db),
):
    if not current_user.tenant_id and not current_user.is_super_admin:
        raise HTTPException(status_code=400, detail="Tenant context required")
    service = ReportsService(db)
    return service.get_income_expense_statement(current_user.tenant_id, fy_id=fy_id)
