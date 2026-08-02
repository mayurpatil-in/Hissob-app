"""
Pydantic schemas for Festival Planning & Execution Suite.
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime
from app.models.planning import TaskPriority, TaskStatus, ShiftStatus, EventType


# ── 1. Festival Task Schemas ──
class FestivalTaskBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=250)
    category: str = Field(default="General", max_length=100)
    description: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.TODO
    due_date: Optional[date] = None
    assigned_to_user_id: Optional[UUID] = None


class FestivalTaskCreate(FestivalTaskBase):
    festival_id: UUID


class FestivalTaskUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    due_date: Optional[date] = None
    assigned_to_user_id: Optional[UUID] = None


class FestivalTaskResponse(FestivalTaskBase):
    id: UUID
    tenant_id: UUID
    festival_id: UUID
    assigned_to_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── 2. Category Budget Allocation Schemas ──
class FestivalBudgetAllocationBase(BaseModel):
    category_name: str = Field(..., min_length=2, max_length=150)
    allocated_amount: float = Field(..., ge=0.0)
    notes: Optional[str] = None


class FestivalBudgetAllocationCreate(FestivalBudgetAllocationBase):
    festival_id: UUID


class FestivalBudgetAllocationUpdate(BaseModel):
    category_name: Optional[str] = None
    allocated_amount: Optional[float] = Field(None, ge=0.0)
    notes: Optional[str] = None


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
    assigned_user_id: Optional[UUID] = None
    status: ShiftStatus = ShiftStatus.SCHEDULED
    notes: Optional[str] = None


class VolunteerShiftCreate(VolunteerShiftBase):
    festival_id: UUID


class VolunteerShiftUpdate(BaseModel):
    shift_name: Optional[str] = None
    duty_zone: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    assigned_user_id: Optional[UUID] = None
    status: Optional[ShiftStatus] = None
    notes: Optional[str] = None


class VolunteerShiftResponse(VolunteerShiftBase):
    id: UUID
    tenant_id: UUID
    festival_id: UUID
    assigned_user_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── 4. Festival Event Schedule Schemas ──
class FestivalEventScheduleBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=250)
    event_type: EventType = EventType.AARTI
    event_date: date
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    yajman_name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None


class FestivalEventScheduleCreate(FestivalEventScheduleBase):
    festival_id: UUID


class FestivalEventScheduleUpdate(BaseModel):
    title: Optional[str] = None
    event_type: Optional[EventType] = None
    event_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    yajman_name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None


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
