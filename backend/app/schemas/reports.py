"""
Pydantic schemas for Reports Engine.
"""
from datetime import date
from typing import Any
from uuid import UUID

from pydantic import BaseModel
from pydantic import Field


class ReportFilter(BaseModel):
    financial_year_id: UUID | None = None
    festival_id: UUID | None = None
    start_date: date | None = None
    end_date: date | None = None
    collector_id: UUID | None = None
    category: str | None = None
    format: str = Field("json", pattern="^(json|csv|excel|pdf)$")


class DailyCollectionSummary(BaseModel):
    date: date
    total_amount: float
    receipt_count: int
    cash_amount: float
    upi_amount: float
    cheque_amount: float
    other_amount: float


class CashBookEntry(BaseModel):
    date: date
    voucher_number: str
    entry_type: str  # receipt / settlement / expense
    particulars: str
    debit_amount: float
    credit_amount: float
    running_balance: float


class FinancialReportSummary(BaseModel):
    report_title: str
    generated_at: str
    financial_year: str | None = None
    total_income: float
    total_expenses: float
    net_surplus_deficit: float
    entries: list[dict[str, Any]]


class CustomReportRequest(BaseModel):
    entity: str = Field("receipts", pattern="^(receipts|expenses|donors)$")
    dimensions: list[str] = []  # date, month, festival, collector, payment_mode, category
    metrics: list[str] = ["total_amount", "count"]  # total_amount, count, avg_amount, max_amount
    date_from: date | None = None
    date_to: date | None = None
    festival_id: UUID | None = None
    payment_mode: str | None = None
    min_amount: float | None = None
    max_amount: float | None = None
    sort_by: str | None = None
    sort_order: str = "desc"


class CustomReportResponse(BaseModel):
    entity: str
    dimensions: list[str]
    metrics: list[str]
    total_records: int
    grand_total_amount: float
    data: list[dict[str, Any]]


class EmailReportRequest(BaseModel):
    recipients: list[str]
    report_title: str
    report_type: str = "custom"  # daily_collection, cash_book, income_expense, custom
    custom_message: str | None = None
    custom_report_request: CustomReportRequest | None = None
    start_date: date | None = None
    end_date: date | None = None
    fy_id: UUID | None = None


class EmailReportResponse(BaseModel):
    status: str
    total_recipients: int
    sent_count: int
    failed_count: int
    message: str
