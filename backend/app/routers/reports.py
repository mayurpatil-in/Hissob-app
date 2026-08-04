"""
Reports Router — Generate Daily Collection, Cash Book, and Income/Expense reports.
"""
import csv
import io
from datetime import date
from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.permissions.rbac import require
from app.schemas.reports import CashBookEntry
from app.schemas.reports import CustomReportRequest
from app.schemas.reports import CustomReportResponse
from app.schemas.reports import DailyCollectionSummary
from app.schemas.reports import FinancialReportSummary
from app.services.reports import ReportsService

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/daily-collection", response_model=list[DailyCollectionSummary], summary="Daily Collection Summary Report")
async def daily_collection_report(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    current_user: User = Depends(require("reports", "view")),
    db: Session = Depends(get_db),
):
    if not current_user.tenant_id and not current_user.is_super_admin:
        raise HTTPException(status_code=400, detail="Tenant context required")
    service = ReportsService(db)
    return service.get_daily_collection_report(current_user.tenant_id, start_date=start_date, end_date=end_date)


@router.get("/cash-book", response_model=list[CashBookEntry], summary="Cash Book Ledger Report")
async def cash_book_report(
    fy_id: UUID | None = Query(None),
    current_user: User = Depends(require("reports", "view")),
    db: Session = Depends(get_db),
):
    if not current_user.tenant_id and not current_user.is_super_admin:
        raise HTTPException(status_code=400, detail="Tenant context required")
    service = ReportsService(db)
    return service.get_cash_book_report(current_user.tenant_id, fy_id=fy_id)


@router.get("/income-expense", response_model=FinancialReportSummary, summary="Income & Expense Financial Statement")
async def income_expense_report(
    fy_id: UUID | None = Query(None),
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


from app.models.tenant import Tenant
from app.schemas.reports import EmailReportRequest
from app.schemas.reports import EmailReportResponse
from app.services.email_service import send_report_email


@router.post("/email", response_model=EmailReportResponse, summary="Send Financial Report via Email")
async def email_report(
    payload: EmailReportRequest,
    current_user: User = Depends(require("reports", "export")),
    db: Session = Depends(get_db),
):
    """Generates the requested financial statement/report and emails it as a CSV attachment."""
    if not current_user.tenant_id and not current_user.is_super_admin:
        raise HTTPException(status_code=400, detail="Tenant context required")

    service = ReportsService(db)
    tenant = db.get(Tenant, current_user.tenant_id)
    org_name = tenant.name if tenant else "Hisob ERP"
    org_logo_url = tenant.logo_url if tenant else None

    output = io.StringIO()
    writer = csv.writer(output)
    file_name = f"report_{payload.report_type}.csv"

    if payload.report_type == "daily_collection":
        headers = ["Date", "Total Amount (INR)", "Receipt Count", "Cash Amount", "UPI Amount", "Cheque Amount", "Other Amount"]
        writer.writerow(headers)
        rows = service.get_daily_collection_report(current_user.tenant_id, start_date=payload.start_date, end_date=payload.end_date)
        for r in rows:
            writer.writerow([r.date, r.total_amount, r.receipt_count, r.cash_amount, r.upi_amount, r.cheque_amount, r.other_amount])
        file_name = "Daily_Collection_Report.csv"

    elif payload.report_type == "cash_book":
        headers = ["Date", "Voucher No", "Type", "Particulars", "Debit (INR)", "Credit (INR)", "Running Balance (INR)"]
        writer.writerow(headers)
        entries = service.get_cash_book_report(current_user.tenant_id, fy_id=payload.fy_id)
        for e in entries:
            writer.writerow([e.date, e.voucher_number, e.entry_type, e.particulars, e.debit_amount, e.credit_amount, e.running_balance])
        file_name = "Cash_Book_Ledger.csv"

    elif payload.report_type == "income_expense":
        summary = service.get_income_expense_statement(current_user.tenant_id, fy_id=payload.fy_id)
        headers = ["Financial Statement", "Total Income (INR)", "Total Expenses (INR)", "Net Surplus / Deficit (INR)"]
        writer.writerow(headers)
        writer.writerow([summary.report_title, summary.total_income, summary.total_expenses, summary.net_surplus_deficit])
        writer.writerow([])
        writer.writerow(["Category / Particulars", "Type", "Amount (INR)", "Percentage"])
        for item in summary.entries:
            writer.writerow([item.get("category"), item.get("type"), item.get("amount"), item.get("percentage")])
        file_name = "Income_Expense_Statement.csv"

    else:  # Custom report
        req = payload.custom_report_request or CustomReportRequest()
        res = service.run_custom_report(current_user.tenant_id, req=req)
        headers = ["Date", "Collector", "Category", "Festival", "Payment Mode", "Total Amount (INR)", "Count", "Avg Amount", "Max Amount"]
        writer.writerow(headers)
        for item in res.data:
            writer.writerow([
                item.get("date"), item.get("collector"), item.get("category"), item.get("festival"),
                item.get("payment_mode"), item.get("total_amount"), item.get("count"),
                item.get("avg_amount"), item.get("max_amount"),
            ])
        file_name = f"Custom_{res.entity}_Report.csv"

    csv_bytes = output.getvalue().encode("utf-8")

    res = send_report_email(
        to_emails=payload.recipients,
        report_title=payload.report_title,
        report_type=payload.report_type,
        file_bytes=csv_bytes,
        file_name=file_name,
        mime_type="text/csv",
        org_name=org_name,
        custom_message=payload.custom_message,
        org_logo_url=org_logo_url,
        db=db,
        tenant_id=current_user.tenant_id,
    )

    return EmailReportResponse(
        status=res.get("status", "completed"),
        total_recipients=res.get("total_recipients", len(payload.recipients)),
        sent_count=res.get("sent_count", 0),
        failed_count=res.get("failed_count", 0),
        message=f"Dispatched report to {res.get('sent_count', 0)} recipients.",
    )
