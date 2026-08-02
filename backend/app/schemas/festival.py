"""
Pydantic schemas for Festival.
"""
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import date, datetime
from app.models.festival import FestivalStatus


class FestivalBase(BaseModel):
    financial_year_id: UUID
    name: str = Field(..., min_length=2, max_length=200)
    deity: Optional[str] = None
    location: Optional[str] = None
    start_date: date
    end_date: date
    budget: float = 0.0
    description: Optional[str] = None


class FestivalCreate(FestivalBase):
    pass


class FestivalUpdate(BaseModel):
    name: Optional[str] = None
    deity: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[FestivalStatus] = None
    budget: Optional[float] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class FestivalResponse(FestivalBase):
    id: UUID
    tenant_id: UUID
    status: FestivalStatus
    is_active: bool
    created_at: datetime
    updated_at: datetime
    collected: float = 0.0

    model_config = {"from_attributes": True}
