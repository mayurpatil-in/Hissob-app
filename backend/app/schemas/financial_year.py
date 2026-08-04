"""
Pydantic schemas for Financial Year.
"""
from datetime import date
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel
from pydantic import Field

from app.models.financial_year import FYStatus


class FinancialYearBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=50, description="e.g. 2025-26")
    start_date: date
    end_date: date
    opening_balance: float = 0.0
    notes: str | None = None


class FinancialYearCreate(FinancialYearBase):
    is_current: bool = False


class FinancialYearUpdate(BaseModel):
    name: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: FYStatus | None = None
    is_current: bool | None = None
    opening_balance: float | None = None
    closing_balance: float | None = None
    carry_forward_amount: float | None = None
    notes: str | None = None


class FinancialYearResponse(FinancialYearBase):
    id: UUID
    tenant_id: UUID
    status: FYStatus
    is_current: bool
    closing_balance: float
    carry_forward_amount: float
    closed_by: UUID | None = None
    locked_by: UUID | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
