"""
Expense Router — Expense requests & approvals.
"""
import os
import uuid
from typing import List, Optional
from uuid import UUID
from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Body
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.core.database import get_db
from app.auth.deps import get_current_active_user
from app.permissions.rbac import require
from app.models.user import User
from app.models.finance import Expense
from app.models.financial_year import FinancialYear
from app.repositories.expense import ExpenseRepository
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseApproval, ExpenseResponse

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
    created = repo.create(expense)

    # 🔔 Notify Treasurer about new expense request
    try:
        from app.services.notification_service import notify_role
        notify_role(
            db=db,
            tenant_id=current_user.tenant_id,
            role_slug="treasurer",
            title=f"📤 New Expense Request — ₹{float(payload.amount):,.2f}",
            message=f"{current_user.full_name} submitted expense {exp_num} ({payload.category}) for ₹{float(payload.amount):,.2f}. Vendor: {payload.vendor_name or 'N/A'}. Please review and approve.",
            notification_type="expense",
            related_module="expenses",
            related_id=str(created.id),
            exclude_user_id=current_user.id,
        )
        db.commit()
    except Exception:
        pass

    return created


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

    # 🔔 Notify the requester about approval/rejection/payment
    try:
        from app.services.notification_service import create_notification
        requester = db.get(User, expense.requested_by)
        if requester:
            if payload.action == "approve":
                create_notification(
                    db=db,
                    user_id=expense.requested_by,
                    title=f"✅ Expense {expense.expense_number} Approved!",
                    message=f"Your expense request for ₹{float(expense.amount):,.2f} ({expense.category}) has been approved by {current_user.full_name}.",
                    notification_type="success",
                    related_module="expenses",
                    related_id=str(expense.id),
                    tenant_id=expense.tenant_id,
                )
            elif payload.action == "pay":
                create_notification(
                    db=db,
                    user_id=expense.requested_by,
                    title=f"💸 Expense {expense.expense_number} Paid!",
                    message=f"Your expense of ₹{float(expense.amount):,.2f} ({expense.category}) has been marked as paid by {current_user.full_name}.",
                    notification_type="success",
                    related_module="expenses",
                    related_id=str(expense.id),
                    tenant_id=expense.tenant_id,
                )
            elif payload.action == "reject":
                reason = payload.rejection_reason or "No reason provided"
                create_notification(
                    db=db,
                    user_id=expense.requested_by,
                    title=f"❌ Expense {expense.expense_number} Rejected",
                    message=f"Your expense request for ₹{float(expense.amount):,.2f} was rejected. Reason: {reason}",
                    notification_type="error",
                    related_module="expenses",
                    related_id=str(expense.id),
                    tenant_id=expense.tenant_id,
                )
            db.commit()
    except Exception:
        pass

    return expense


@router.post("/upload-bill", summary="Upload Expense Bill Document / Receipt Image")
async def upload_expense_bill(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
):
    """Uploads a bill/receipt document (PNG, JPG, WEBP, PDF) and returns the public asset URL."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    allowed_exts = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPG, PNG, WEBP and PDF files are allowed.")

    upload_dir = os.path.join("uploads", "bills")
    os.makedirs(upload_dir, exist_ok=True)

    filename = f"bill_{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_dir, filename)

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="File size exceeds 10 MB limit.")

    with open(filepath, "wb") as f:
        f.write(contents)

    return {
        "url": f"/uploads/bills/{filename}",
        "filename": file.filename,
        "size_bytes": len(contents),
    }


@router.post("/{expense_id}/attach-bill", response_model=ExpenseResponse, summary="Attach/Update Expense Bill URL")
async def attach_expense_bill(
    expense_id: UUID,
    bill_url: str = Body(..., embed=True),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    repo = ExpenseRepository(db)
    expense = repo.get(expense_id)
    if not expense or (expense.tenant_id != current_user.tenant_id and not current_user.is_super_admin):
        raise HTTPException(status_code=404, detail="Expense not found")

    expense.bill_url = bill_url
    db.commit()
    db.refresh(expense)
    return expense


@router.put("/{expense_id}", response_model=ExpenseResponse, summary="Update Expense Request")
async def update_expense(
    expense_id: UUID,
    payload: ExpenseUpdate,
    current_user: User = Depends(require("expenses", "create")),
    db: Session = Depends(get_db),
):
    repo = ExpenseRepository(db)
    expense = repo.get(expense_id)
    if not expense or (expense.tenant_id != current_user.tenant_id and not current_user.is_super_admin):
        raise HTTPException(status_code=404, detail="Expense not found")

    if payload.category is not None:
        expense.category = payload.category
    if payload.vendor_name is not None:
        expense.vendor_name = payload.vendor_name
    if payload.amount is not None:
        expense.amount = payload.amount
    if payload.description is not None:
        expense.description = payload.description
    if payload.voucher_number is not None:
        expense.voucher_number = payload.voucher_number
    if payload.bill_url is not None:
        expense.bill_url = payload.bill_url
    if payload.expense_date is not None:
        expense.expense_date = payload.expense_date

    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}", summary="Delete / Void Expense Request")
async def delete_expense(
    expense_id: UUID,
    current_user: User = Depends(require("expenses", "create")),
    db: Session = Depends(get_db),
):
    repo = ExpenseRepository(db)
    expense = repo.get(expense_id)
    if not expense or (expense.tenant_id != current_user.tenant_id and not current_user.is_super_admin):
        raise HTTPException(status_code=404, detail="Expense not found")

    db.delete(expense)
    db.commit()
    return {"message": "Expense deleted successfully", "id": str(expense_id)}

