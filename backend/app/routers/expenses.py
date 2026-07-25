"""
Expense Router — Expense requests & approvals.
"""
from typing import List, Optional
from uuid import UUID
from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.core.database import get_db
from app.auth.deps import get_current_active_user
from app.permissions.rbac import require
from app.models.user import User
from app.models.finance import Expense
from app.models.financial_year import FinancialYear
from app.repositories.expense import ExpenseRepository
from app.schemas.expense import ExpenseCreate, ExpenseApproval, ExpenseResponse

router = APIRouter(prefix="/expenses", tags=["Expenses"])


@router.get("", response_model=List[ExpenseResponse], summary="List & Filter Expenses")
async def list_expenses(
    status: Optional[str] = Query(None),
    fy_id: Optional[UUID] = Query(None),
    category: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not current_user.tenant_id and not current_user.is_super_admin:
        raise HTTPException(status_code=400, detail="Tenant context required")

    repo = ExpenseRepository(db)
    expenses = repo.get_by_tenant(
        tenant_id=current_user.tenant_id,
        status=status,
        fy_id=fy_id,
        category=category,
        skip=skip,
        limit=limit,
    )
    user_map = {u.id: u.full_name for u in db.query(User).all()}
    for e in expenses:
        e.requested_by_name = user_map.get(e.requested_by, "Member")
    return expenses


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED, summary="Create Expense Request")
async def create_expense(
    payload: ExpenseCreate,
    current_user: User = Depends(require("expenses", "create")),
    db: Session = Depends(get_db),
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")

    repo = ExpenseRepository(db)
    exp_num = repo.generate_expense_number(current_user.tenant_id)

    # Auto-resolve active Financial Year if not provided
    fy_id = payload.financial_year_id
    if not fy_id:
        fy = db.execute(
            select(FinancialYear).where(
                FinancialYear.tenant_id == current_user.tenant_id,
                FinancialYear.is_current == True
            )
        ).scalar_one_or_none()
        if fy:
            fy_id = fy.id

    expense = Expense(
        tenant_id=current_user.tenant_id,
        financial_year_id=fy_id,
        festival_id=payload.festival_id,
        requested_by=current_user.id,
        expense_number=exp_num,
        expense_date=payload.expense_date or date.today(),
        category=payload.category,
        vendor_name=payload.vendor_name,
        amount=payload.amount,
        description=payload.description,
        voucher_number=payload.voucher_number,
        bill_url=payload.bill_url,
        status="pending",
    )
    return repo.create(expense)


@router.post("/{expense_id}/approve", response_model=ExpenseResponse, summary="Approve/Reject/Pay Expense")
async def approve_expense(
    expense_id: UUID,
    payload: ExpenseApproval,
    current_user: User = Depends(require("expenses", "approve")),
    db: Session = Depends(get_db),
):
    repo = ExpenseRepository(db)
    expense = repo.get(expense_id)
    if not expense or (expense.tenant_id != current_user.tenant_id and not current_user.is_super_admin):
        raise HTTPException(status_code=404, detail="Expense not found")

    now = datetime.now(timezone.utc)

    if payload.action == "approve":
        expense.status = "approved"
        expense.approved_by = current_user.id
        expense.approved_at = now
    elif payload.action == "pay":
        if expense.status not in ["approved", "pending"]:
            raise HTTPException(status_code=400, detail="Expense cannot be paid in current status")
        expense.status = "paid"
        if not expense.approved_by:
            expense.approved_by = current_user.id
            expense.approved_at = now
        expense.paid_at = now
    elif payload.action == "reject":
        expense.status = "rejected"
        expense.rejection_reason = payload.rejection_reason

    db.commit()
    db.refresh(expense)
    return expense
