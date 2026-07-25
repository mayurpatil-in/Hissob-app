"""
Pydantic schemas for Expense module.
"""
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import date, datetime


class ExpenseBase(BaseModel):
    financial_year_id: Optional[UUID] = None
    festival_id: Optional[UUID] = None
    category: str = Field(..., min_length=2, max_length=100)
    vendor_name: Optional[str] = None
    amount: float = Field(..., gt=0)
    description: Optional[str] = None
    voucher_number: Optional[str] = None
    bill_url: Optional[str] = None


class ExpenseCreate(ExpenseBase):
    expense_date: Optional[date] = None


class ExpenseApproval(BaseModel):
    action: str = Field(..., pattern="^(approve|reject|pay)$")
    rejection_reason: Optional[str] = None


class ExpenseResponse(ExpenseBase):
    id: UUID
    tenant_id: UUID
    requested_by: UUID
    requested_by_name: Optional[str] = None
    expense_number: str
    expense_date: date
    status: str
    approved_by: Optional[UUID] = None
    approved_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
