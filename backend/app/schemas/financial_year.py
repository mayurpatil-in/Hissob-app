"""
Pydantic schemas for Financial Year.
"""
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import date, datetime
from app.models.financial_year import FYStatus


class FinancialYearBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=50, description="e.g. 2025-26")
    start_date: date
    end_date: date
    opening_balance: float = 0.0
    notes: Optional[str] = None


class FinancialYearCreate(FinancialYearBase):
    is_current: bool = False


class FinancialYearUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[FYStatus] = None
    is_current: Optional[bool] = None
    opening_balance: Optional[float] = None
    closing_balance: Optional[float] = None
    carry_forward_amount: Optional[float] = None
    notes: Optional[str] = None


class FinancialYearResponse(FinancialYearBase):
    id: UUID
    tenant_id: UUID
    status: FYStatus
    is_current: bool
    closing_balance: float
    carry_forward_amount: float
    closed_by: Optional[UUID] = None
    locked_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
