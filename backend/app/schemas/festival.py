"""
Pydantic schemas for Festival.
"""
from datetime import date
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel
from pydantic import Field

from app.models.festival import FestivalStatus


class FestivalBase(BaseModel):
    financial_year_id: UUID
    name: str = Field(..., min_length=2, max_length=200)
    deity: str | None = None
    location: str | None = None
    start_date: date
    end_date: date
    budget: float = 0.0
    description: str | None = None


class FestivalCreate(FestivalBase):
    pass


class FestivalUpdate(BaseModel):
    name: str | None = None
    deity: str | None = None
    location: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: FestivalStatus | None = None
    budget: float | None = None
    description: str | None = None
    is_active: bool | None = None


class FestivalResponse(FestivalBase):
    id: UUID
    tenant_id: UUID
    status: FestivalStatus
    is_active: bool
    created_at: datetime
    updated_at: datetime
    collected: float = 0.0

    model_config = {"from_attributes": True}
