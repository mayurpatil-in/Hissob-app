"""
Pydantic schemas for Festival Planning & Execution Suite.
"""
from datetime import date
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import Field

from app.models.planning import EventType
from app.models.planning import ShiftStatus
from app.models.planning import TaskPriority
from app.models.planning import TaskStatus


# ── 1. Festival Task Schemas ──
class FestivalTaskBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=250)
    category: str = Field(default="General", max_length=100)
    description: str | None = None
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.TODO
    due_date: date | None = None
    assigned_to_user_id: UUID | None = None


class FestivalTaskCreate(FestivalTaskBase):
    festival_id: UUID


class FestivalTaskUpdate(BaseModel):
    title: str | None = None
    category: str | None = None
    description: str | None = None
    priority: TaskPriority | None = None
    status: TaskStatus | None = None
    due_date: date | None = None
    assigned_to_user_id: UUID | None = None


class FestivalTaskResponse(FestivalTaskBase):
    id: UUID
    tenant_id: UUID
    festival_id: UUID
    assigned_to_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── 2. Category Budget Allocation Schemas ──
class FestivalBudgetAllocationBase(BaseModel):
    category_name: str = Field(..., min_length=2, max_length=150)
    allocated_amount: float = Field(..., ge=0.0)
    notes: str | None = None


class FestivalBudgetAllocationCreate(FestivalBudgetAllocationBase):
    festival_id: UUID


class FestivalBudgetAllocationUpdate(BaseModel):
    category_name: str | None = None
    allocated_amount: float | None = Field(None, ge=0.0)
    notes: str | None = None


class FestivalBudgetAllocationResponse(FestivalBudgetAllocationBase):
    id: UUID
    tenant_id: UUID
    festival_id: UUID
    actual_spent: float = 0.0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── 3. Volunteer Shift Schemas ──
class VolunteerShiftBase(BaseModel):
    shift_name: str = Field(..., min_length=2, max_length=200)
    duty_zone: str = Field(default="Main Stage", max_length=100)
    start_time: datetime
    end_time: datetime
    assigned_user_id: UUID | None = None
    status: ShiftStatus = ShiftStatus.SCHEDULED
    notes: str | None = None


class VolunteerShiftCreate(VolunteerShiftBase):
    festival_id: UUID


class VolunteerShiftUpdate(BaseModel):
    shift_name: str | None = None
    duty_zone: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    assigned_user_id: UUID | None = None
    status: ShiftStatus | None = None
    notes: str | None = None


class VolunteerShiftResponse(VolunteerShiftBase):
    id: UUID
    tenant_id: UUID
    festival_id: UUID
    assigned_user_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── 4. Festival Event Schedule Schemas ──
class FestivalEventScheduleBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=250)
    event_type: EventType = EventType.AARTI
    event_date: date
    start_time: str | None = None
    end_time: str | None = None
    yajman_name: str | None = None
    description: str | None = None
    location: str | None = None


class FestivalEventScheduleCreate(FestivalEventScheduleBase):
    festival_id: UUID


class FestivalEventScheduleUpdate(BaseModel):
    title: str | None = None
    event_type: EventType | None = None
    event_date: date | None = None
    start_time: str | None = None
    end_time: str | None = None
    yajman_name: str | None = None
    description: str | None = None
    location: str | None = None


class FestivalEventScheduleResponse(FestivalEventScheduleBase):
    id: UUID
    tenant_id: UUID
    festival_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── 5. Planning Dashboard Summary Schema ──
class PlanningSummaryResponse(BaseModel):
    festival_id: UUID
    festival_name: str
    total_tasks: int
    completed_tasks: int
    task_completion_percentage: float
    total_allocated_budget: float
    total_spent_budget: float
    budget_utilization_percentage: float
    total_shifts: int
    filled_shifts: int
    total_events: int
