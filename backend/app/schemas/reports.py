"""
Pydantic schemas for Reports Engine.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import date


class ReportFilter(BaseModel):
    financial_year_id: Optional[UUID] = None
    festival_id: Optional[UUID] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    collector_id: Optional[UUID] = None
    category: Optional[str] = None
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
    financial_year: Optional[str] = None
    total_income: float
    total_expenses: float
    net_surplus_deficit: float
    entries: List[Dict[str, Any]]
