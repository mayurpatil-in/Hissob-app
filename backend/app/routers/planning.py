"""
Planning Router — Manage Festival Tasks, Category Budgets, Volunteer Shifts, and Event Schedules.
"""
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.core.database import get_db
from app.auth.deps import get_current_active_user
from app.models.user import User
from app.models.tenant import Tenant
from app.models.festival import Festival
from app.models.finance import Expense
from app.models.planning import (
    FestivalTask, TaskPriority, TaskStatus,
    FestivalBudgetAllocation,
    VolunteerShift, ShiftStatus,
    FestivalEventSchedule, EventType
)
from app.schemas.planning import (
    FestivalTaskCreate, FestivalTaskUpdate, FestivalTaskResponse,
    FestivalBudgetAllocationCreate, FestivalBudgetAllocationUpdate, FestivalBudgetAllocationResponse,
    VolunteerShiftCreate, VolunteerShiftUpdate, VolunteerShiftResponse,
    FestivalEventScheduleCreate, FestivalEventScheduleUpdate, FestivalEventScheduleResponse,
    PlanningSummaryResponse
)
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/planning", tags=["Festival Planning & Execution"])


def get_tenant_id(current_user: User) -> UUID:
    if current_user.tenant_id:
        return current_user.tenant_id
    raise HTTPException(status_code=400, detail="Tenant context required")


# ── 1. Planning Overview Summary ──

@router.get("/summary/{festival_id}", response_model=PlanningSummaryResponse, summary="Get Planning Summary Metrics")
async def get_planning_summary(
    festival_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    tenant_id = get_tenant_id(current_user)
    festival = db.scalar(select(Festival).where(Festival.id == festival_id, Festival.tenant_id == tenant_id))
    if not festival:
        raise HTTPException(status_code=404, detail="Festival not found")

    total_tasks = db.scalar(select(func.count(FestivalTask.id)).where(FestivalTask.festival_id == festival_id, FestivalTask.tenant_id == tenant_id)) or 0
    completed_tasks = db.scalar(select(func.count(FestivalTask.id)).where(FestivalTask.festival_id == festival_id, FestivalTask.tenant_id == tenant_id, FestivalTask.status == TaskStatus.COMPLETED)) or 0
    task_pct = (completed_tasks / total_tasks * 100.0) if total_tasks > 0 else 0.0

    total_allocated_budget = float(db.scalar(select(func.coalesce(func.sum(FestivalBudgetAllocation.allocated_amount), 0.0)).where(FestivalBudgetAllocation.festival_id == festival_id, FestivalBudgetAllocation.tenant_id == tenant_id)) or 0.0)
    
    # Calculate actual expenses paid for this festival
    total_spent_budget = float(db.scalar(select(func.coalesce(func.sum(Expense.amount), 0.0)).where(Expense.festival_id == festival_id, Expense.tenant_id == tenant_id, Expense.status == "paid")) or 0.0)
    budget_pct = (total_spent_budget / total_allocated_budget * 100.0) if total_allocated_budget > 0 else 0.0

    total_shifts = db.scalar(select(func.count(VolunteerShift.id)).where(VolunteerShift.festival_id == festival_id, VolunteerShift.tenant_id == tenant_id)) or 0
    filled_shifts = db.scalar(select(func.count(VolunteerShift.id)).where(VolunteerShift.festival_id == festival_id, VolunteerShift.tenant_id == tenant_id, VolunteerShift.assigned_user_id.isnot(None))) or 0

    total_events = db.scalar(select(func.count(FestivalEventSchedule.id)).where(FestivalEventSchedule.festival_id == festival_id, FestivalEventSchedule.tenant_id == tenant_id)) or 0

    return PlanningSummaryResponse(
        festival_id=festival.id,
        festival_name=festival.name,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        task_completion_percentage=round(task_pct, 1),
        total_allocated_budget=total_allocated_budget,
        total_spent_budget=total_spent_budget,
        budget_utilization_percentage=round(budget_pct, 1),
        total_shifts=total_shifts,
        filled_shifts=filled_shifts,
        total_events=total_events,
    )


# ── 2. Festival Tasks Endpoints ──

@router.get("/tasks", response_model=List[FestivalTaskResponse], summary="List Festival Tasks")
async def list_tasks(
    festival_id: UUID = Query(...),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    tenant_id = get_tenant_id(current_user)
    stmt = select(FestivalTask).where(FestivalTask.festival_id == festival_id, FestivalTask.tenant_id == tenant_id)

    if status:
        stmt = stmt.where(FestivalTask.status == status)
    if priority:
        stmt = stmt.where(FestivalTask.priority == priority)
    if category:
        stmt = stmt.where(FestivalTask.category == category)

    stmt = stmt.order_by(FestivalTask.due_date.asc().nulls_last(), FestivalTask.created_at.desc())
    tasks = db.scalars(stmt).all()

    results = []
    for t in tasks:
        res = FestivalTaskResponse.model_validate(t)
        res.assigned_to_name = t.assigned_to.full_name if t.assigned_to else None
        results.append(res)

    return results


@router.post("/tasks", response_model=FestivalTaskResponse, status_code=status.HTTP_201_CREATED, summary="Create Festival Task")
async def create_task(
    payload: FestivalTaskCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    tenant_id = get_tenant_id(current_user)
    task = FestivalTask(
        tenant_id=tenant_id,
        festival_id=payload.festival_id,
        title=payload.title,
        category=payload.category,
        description=payload.description,
        priority=payload.priority,
        status=payload.status,
        due_date=payload.due_date,
        assigned_to_user_id=payload.assigned_to_user_id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    log_audit_event(
        db, current_user, "planning", "create_task",
        record_label=f"Task: {task.title}", record_id=str(task.id)
    )

    res = FestivalTaskResponse.model_validate(task)
    res.assigned_to_name = task.assigned_to.full_name if task.assigned_to else None
    return res


@router.put("/tasks/{task_id}", response_model=FestivalTaskResponse, summary="Update Festival Task")
async def update_task(
    task_id: UUID,
    payload: FestivalTaskUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    tenant_id = get_tenant_id(current_user)
    task = db.scalar(select(FestivalTask).where(FestivalTask.id == task_id, FestivalTask.tenant_id == tenant_id))
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if payload.title is not None: task.title = payload.title
    if payload.category is not None: task.category = payload.category
    if payload.description is not None: task.description = payload.description
    if payload.priority is not None: task.priority = payload.priority
    if payload.status is not None: task.status = payload.status
    if payload.due_date is not None: task.due_date = payload.due_date
    if payload.assigned_to_user_id is not None: task.assigned_to_user_id = payload.assigned_to_user_id

    db.commit()
    db.refresh(task)

    res = FestivalTaskResponse.model_validate(task)
    res.assigned_to_name = task.assigned_to.full_name if task.assigned_to else None
    return res


@router.delete("/tasks/{task_id}", summary="Delete Festival Task")
async def delete_task(
    task_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    tenant_id = get_tenant_id(current_user)
    task = db.scalar(select(FestivalTask).where(FestivalTask.id == task_id, FestivalTask.tenant_id == tenant_id))
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return {"message": "Task deleted successfully"}


# ── 3. Category Budget Allocations Endpoints ──

@router.get("/budgets", response_model=List[FestivalBudgetAllocationResponse], summary="List Category Budget Allocations")
async def list_budgets(
    festival_id: UUID = Query(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    tenant_id = get_tenant_id(current_user)
    stmt = select(FestivalBudgetAllocation).where(
        FestivalBudgetAllocation.festival_id == festival_id,
        FestivalBudgetAllocation.tenant_id == tenant_id
    ).order_by(FestivalBudgetAllocation.allocated_amount.desc())
    
    allocations = db.scalars(stmt).all()
    results = []

    for alloc in allocations:
        # Calculate actual spend for this specific expense category under this festival
        spent = db.scalar(
            select(func.coalesce(func.sum(Expense.amount), 0.0)).where(
                Expense.festival_id == festival_id,
                Expense.tenant_id == tenant_id,
                Expense.category.ilike(f"%{alloc.category_name}%"),
                Expense.status == "paid"
            )
        ) or 0.0

        res = FestivalBudgetAllocationResponse.model_validate(alloc)
        res.actual_spent = float(spent)
        results.append(res)

    return results


@router.post("/budgets", response_model=FestivalBudgetAllocationResponse, status_code=status.HTTP_201_CREATED, summary="Create Budget Allocation")
async def create_budget(
    payload: FestivalBudgetAllocationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    tenant_id = get_tenant_id(current_user)
    alloc = FestivalBudgetAllocation(
        tenant_id=tenant_id,
        festival_id=payload.festival_id,
        category_name=payload.category_name,
        allocated_amount=payload.allocated_amount,
        notes=payload.notes,
    )
    db.add(alloc)
    db.commit()
    db.refresh(alloc)

    log_audit_event(
        db, current_user, "planning", "create_budget",
        record_label=f"Budget: {alloc.category_name} (₹{alloc.allocated_amount})", record_id=str(alloc.id)
    )

    res = FestivalBudgetAllocationResponse.model_validate(alloc)
    res.actual_spent = 0.0
    return res


@router.put("/budgets/{budget_id}", response_model=FestivalBudgetAllocationResponse, summary="Update Budget Allocation")
async def update_budget(
    budget_id: UUID,
    payload: FestivalBudgetAllocationUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    tenant_id = get_tenant_id(current_user)
    alloc = db.scalar(select(FestivalBudgetAllocation).where(FestivalBudgetAllocation.id == budget_id, FestivalBudgetAllocation.tenant_id == tenant_id))
    if not alloc:
        raise HTTPException(status_code=404, detail="Budget allocation not found")

    if payload.category_name is not None: alloc.category_name = payload.category_name
    if payload.allocated_amount is not None: alloc.allocated_amount = payload.allocated_amount
    if payload.notes is not None: alloc.notes = payload.notes

    db.commit()
    db.refresh(alloc)

    spent = db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0.0)).where(
            Expense.festival_id == alloc.festival_id,
            Expense.tenant_id == tenant_id,
            Expense.category.ilike(f"%{alloc.category_name}%"),
            Expense.status == "paid"
        )
    ) or 0.0

    res = FestivalBudgetAllocationResponse.model_validate(alloc)
    res.actual_spent = float(spent)
    return res


@router.delete("/budgets/{budget_id}", summary="Delete Budget Allocation")
async def delete_budget(
    budget_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    tenant_id = get_tenant_id(current_user)
    alloc = db.scalar(select(FestivalBudgetAllocation).where(FestivalBudgetAllocation.id == budget_id, FestivalBudgetAllocation.tenant_id == tenant_id))
    if not alloc:
        raise HTTPException(status_code=404, detail="Budget allocation not found")

    db.delete(alloc)
    db.commit()
    return {"message": "Budget allocation deleted successfully"}


# ── 4. Volunteer Shifts Endpoints ──

@router.get("/shifts", response_model=List[VolunteerShiftResponse], summary="List Volunteer Shifts")
async def list_shifts(
    festival_id: UUID = Query(...),
    duty_zone: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    tenant_id = get_tenant_id(current_user)
    stmt = select(VolunteerShift).where(VolunteerShift.festival_id == festival_id, VolunteerShift.tenant_id == tenant_id)

    if duty_zone:
        stmt = stmt.where(VolunteerShift.duty_zone == duty_zone)
    if status:
        stmt = stmt.where(VolunteerShift.status == status)

    stmt = stmt.order_by(VolunteerShift.start_time.asc())
    shifts = db.scalars(stmt).all()

    results = []
    for s in shifts:
        res = VolunteerShiftResponse.model_validate(s)
        res.assigned_user_name = s.assigned_user.full_name if s.assigned_user else None
        results.append(res)

    return results


@router.post("/shifts", response_model=VolunteerShiftResponse, status_code=status.HTTP_201_CREATED, summary="Create Volunteer Shift")
async def create_shift(
    payload: VolunteerShiftCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    tenant_id = get_tenant_id(current_user)
    shift = VolunteerShift(
        tenant_id=tenant_id,
        festival_id=payload.festival_id,
        shift_name=payload.shift_name,
        duty_zone=payload.duty_zone,
        start_time=payload.start_time,
        end_time=payload.end_time,
        assigned_user_id=payload.assigned_user_id,
        status=payload.status,
        notes=payload.notes,
    )
    db.add(shift)
    db.commit()
    db.refresh(shift)

    log_audit_event(
        db, current_user, "planning", "create_shift",
        record_label=f"Shift: {shift.shift_name} ({shift.duty_zone})", record_id=str(shift.id)
    )

    res = VolunteerShiftResponse.model_validate(shift)
    res.assigned_user_name = shift.assigned_user.full_name if shift.assigned_user else None
    return res


@router.put("/shifts/{shift_id}", response_model=VolunteerShiftResponse, summary="Update Volunteer Shift")
async def update_shift(
    shift_id: UUID,
    payload: VolunteerShiftUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    tenant_id = get_tenant_id(current_user)
    shift = db.scalar(select(VolunteerShift).where(VolunteerShift.id == shift_id, VolunteerShift.tenant_id == tenant_id))
    if not shift:
        raise HTTPException(status_code=404, detail="Volunteer shift not found")

    if payload.shift_name is not None: shift.shift_name = payload.shift_name
    if payload.duty_zone is not None: shift.duty_zone = payload.duty_zone
    if payload.start_time is not None: shift.start_time = payload.start_time
    if payload.end_time is not None: shift.end_time = payload.end_time
    if payload.assigned_user_id is not None: shift.assigned_user_id = payload.assigned_user_id
    if payload.status is not None: shift.status = payload.status
    if payload.notes is not None: shift.notes = payload.notes

    db.commit()
    db.refresh(shift)

    res = VolunteerShiftResponse.model_validate(shift)
    res.assigned_user_name = shift.assigned_user.full_name if shift.assigned_user else None
    return res


@router.delete("/shifts/{shift_id}", summary="Delete Volunteer Shift")
async def delete_shift(
    shift_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    tenant_id = get_tenant_id(current_user)
    shift = db.scalar(select(VolunteerShift).where(VolunteerShift.id == shift_id, VolunteerShift.tenant_id == tenant_id))
    if not shift:
        raise HTTPException(status_code=404, detail="Volunteer shift not found")

    db.delete(shift)
    db.commit()
    return {"message": "Volunteer shift deleted successfully"}


# ── 5. Event & Ritual Schedule Endpoints ──

@router.get("/schedules", response_model=List[FestivalEventScheduleResponse], summary="List Festival Event Schedules")
async def list_schedules(
    festival_id: UUID = Query(...),
    event_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    tenant_id = get_tenant_id(current_user)
    stmt = select(FestivalEventSchedule).where(FestivalEventSchedule.festival_id == festival_id, FestivalEventSchedule.tenant_id == tenant_id)

    if event_type:
        stmt = stmt.where(FestivalEventSchedule.event_type == event_type)

    stmt = stmt.order_by(FestivalEventSchedule.event_date.asc(), FestivalEventSchedule.start_time.asc())
    schedules = db.scalars(stmt).all()
    return schedules


@router.post("/schedules", response_model=FestivalEventScheduleResponse, status_code=status.HTTP_201_CREATED, summary="Create Event Schedule")
async def create_schedule(
    payload: FestivalEventScheduleCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    tenant_id = get_tenant_id(current_user)
    item = FestivalEventSchedule(
        tenant_id=tenant_id,
        festival_id=payload.festival_id,
        title=payload.title,
        event_type=payload.event_type,
        event_date=payload.event_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        yajman_name=payload.yajman_name,
        description=payload.description,
        location=payload.location,
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    log_audit_event(
        db, current_user, "planning", "create_schedule",
        record_label=f"Event Schedule: {item.title} ({item.event_date})", record_id=str(item.id)
    )

    return item


@router.put("/schedules/{schedule_id}", response_model=FestivalEventScheduleResponse, summary="Update Event Schedule")
async def update_schedule(
    schedule_id: UUID,
    payload: FestivalEventScheduleUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    tenant_id = get_tenant_id(current_user)
    item = db.scalar(select(FestivalEventSchedule).where(FestivalEventSchedule.id == schedule_id, FestivalEventSchedule.tenant_id == tenant_id))
    if not item:
        raise HTTPException(status_code=404, detail="Event schedule not found")

    if payload.title is not None: item.title = payload.title
    if payload.event_type is not None: item.event_type = payload.event_type
    if payload.event_date is not None: item.event_date = payload.event_date
    if payload.start_time is not None: item.start_time = payload.start_time
    if payload.end_time is not None: item.end_time = payload.end_time
    if payload.yajman_name is not None: item.yajman_name = payload.yajman_name
    if payload.description is not None: item.description = payload.description
    if payload.location is not None: item.location = payload.location

    db.commit()
    db.refresh(item)
    return item


@router.delete("/schedules/{schedule_id}", summary="Delete Event Schedule")
async def delete_schedule(
    schedule_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    tenant_id = get_tenant_id(current_user)
    item = db.scalar(select(FestivalEventSchedule).where(FestivalEventSchedule.id == schedule_id, FestivalEventSchedule.tenant_id == tenant_id))
    if not item:
        raise HTTPException(status_code=404, detail="Event schedule not found")

    db.delete(item)
    db.commit()
    return {"message": "Event schedule deleted successfully"}


# ── 6. Public Unauthenticated Festival Schedule & Yajman Request Endpoints ──

@router.get("/public/schedule/{festival_id}", summary="Public Festival Event Schedule & Live Status")
@router.get("/public/festival/{festival_id}", summary="Public Festival Event Page Alias")
async def get_public_festival_schedule(
    festival_id: UUID,
    db: Session = Depends(get_db),
):
    festival = db.scalar(select(Festival).where(Festival.id == festival_id))
    if not festival:
        raise HTTPException(status_code=404, detail="Festival not found")

    schedules = list(db.scalars(
        select(FestivalEventSchedule)
        .where(FestivalEventSchedule.festival_id == festival_id)
        .order_by(FestivalEventSchedule.event_date.asc(), FestivalEventSchedule.start_time.asc())
    ).all())

    shifts = list(db.scalars(
        select(VolunteerShift)
        .where(VolunteerShift.festival_id == festival_id)
        .order_by(VolunteerShift.start_time.asc())
    ).all())

    tenant = db.scalar(select(Tenant).where(Tenant.id == festival.tenant_id)) if festival.tenant_id else None
    mandal_name = tenant.name if tenant else (getattr(festival, 'organizer_name', None) or "Festival Organization")

    return {
        "festival": {
            "id": str(festival.id),
            "name": festival.name,
            "start_date": str(festival.start_date),
            "end_date": str(festival.end_date),
            "venue": getattr(festival, 'venue', None) or getattr(festival, 'location', None) or "Main Pandal & Temple Ground",
            "mandal_name": mandal_name,
            "banner_url": getattr(festival, 'banner_url', None),
        },
        "schedules": [
            {
                "id": str(s.id),
                "title": s.title,
                "event_type": str(s.event_type.value if hasattr(s.event_type, 'value') else s.event_type),
                "event_date": str(s.event_date),
                "start_time": s.start_time,
                "end_time": s.end_time,
                "yajman_name": s.yajman_name,
                "description": s.description,
                "location": s.location or "Main Stage / Aarti Pandal",
            }
            for s in schedules
        ],
        "active_duty_zones": list(set([sh.duty_zone for sh in shifts if sh.duty_zone]))
    }


@router.post("/public/yajman-request", summary="Public Yajman / Aarti Sponsorship Request")
async def submit_public_yajman_request(
    payload: dict,
    db: Session = Depends(get_db),
):
    festival_id_str = payload.get("festival_id")
    title = payload.get("title", "Aarti Sponsorship")
    name = payload.get("name")
    phone = payload.get("phone")
    preferred_date = payload.get("preferred_date")

    if not festival_id_str or not name or not phone:
        raise HTTPException(status_code=400, detail="Festival ID, Name, and Phone number are required")

    return {
        "success": True,
        "message": f"Thank you {name}! Your Aarti sponsorship request for '{title}' on {preferred_date or 'today'} has been received by the Festival Committee.",
        "request_details": {
            "name": name,
            "phone": phone,
            "preferred_date": preferred_date,
            "status": "pending_approval"
        }
    }

