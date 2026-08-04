"""
Pydantic schemas for Expense module.
"""
from datetime import date
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel
from pydantic import Field

from app.models.finance import ExpenseStatus


class ExpenseBase(BaseModel):
    financial_year_id: UUID | None = None
    festival_id: UUID | None = None
    category: str = Field(..., min_length=2, max_length=100)
    vendor_name: str | None = None
    amount: float = Field(..., gt=0)
    description: str | None = None
    voucher_number: str | None = None
    bill_url: str | None = None


class ExpenseCreate(ExpenseBase):
    expense_date: date | None = None


class ExpenseUpdate(BaseModel):
    category: str | None = None
    vendor_name: str | None = None
    amount: float | None = Field(None, gt=0)
    description: str | None = None
    voucher_number: str | None = None
    bill_url: str | None = None
    expense_date: date | None = None


class ExpenseApproval(BaseModel):
    action: str = Field(..., pattern="^(approve|reject|pay)$")
    rejection_reason: str | None = None


class ExpenseResponse(ExpenseBase):
    id: UUID
    tenant_id: UUID
    requested_by: UUID
    requested_by_name: str | None = None
    expense_number: str
    expense_date: date
    status: ExpenseStatus | str
    approved_by: UUID | None = None
    approved_at: datetime | None = None
    paid_at: datetime | None = None
    rejection_reason: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
