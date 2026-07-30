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
import io
import csv
from fastapi.responses import StreamingResponse
from app.schemas.reports import (
    DailyCollectionSummary,
    CashBookEntry,
    FinancialReportSummary,
    CustomReportRequest,
    CustomReportResponse,
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


@router.post("/custom", response_model=CustomReportResponse, summary="Execute Custom Report Query")
async def custom_report(
    payload: CustomReportRequest,
    current_user: User = Depends(require("reports", "view")),
    db: Session = Depends(get_db),
):
    if not current_user.tenant_id and not current_user.is_super_admin:
        raise HTTPException(status_code=400, detail="Tenant context required")
    service = ReportsService(db)
    return service.run_custom_report(current_user.tenant_id, req=payload)


@router.post("/custom/export", summary="Export Custom Report Query to CSV")
async def export_custom_report(
    payload: CustomReportRequest,
    current_user: User = Depends(require("reports", "view")),
    db: Session = Depends(get_db),
):
    if not current_user.tenant_id and not current_user.is_super_admin:
        raise HTTPException(status_code=400, detail="Tenant context required")
    service = ReportsService(db)
    res = service.run_custom_report(current_user.tenant_id, req=payload)

    output = io.StringIO()
    writer = csv.writer(output)

    headers = ["Date", "Collector / Person", "Category / City", "Festival", "Payment Mode", "Total Amount (INR)", "Transaction Count", "Avg Amount (INR)", "Max Amount (INR)"]
    writer.writerow(headers)

    for item in res.data:
        writer.writerow([
            item.get("date"),
            item.get("collector"),
            item.get("category"),
            item.get("festival"),
            item.get("payment_mode"),
            item.get("total_amount"),
            item.get("count"),
            item.get("avg_amount"),
            item.get("max_amount"),
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=custom_report_{res.entity}.csv"}
    )
