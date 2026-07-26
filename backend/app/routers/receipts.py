"""
Receipts Router — Create receipt, list receipts, cancel receipt.
"""
from typing import List, Optional
from uuid import UUID
from datetime import date, datetime, timezone
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.permissions.rbac import require
from app.models.user import User
from app.models.receipt import Receipt, ReceiptStatus, PaymentMode
from app.models.financial_year import FinancialYear
from app.repositories.receipt import ReceiptRepository
from app.repositories.donor import DonorRepository
from app.schemas.receipt import ReceiptCreate, ReceiptCancel, ReceiptResponse

router = APIRouter(prefix="/receipts", tags=["Receipts"])


from app.auth.deps import get_current_active_user


@router.get("", response_model=List[ReceiptResponse], summary="List & Filter Receipts")
async def list_receipts(
    fy_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    collector_id: Optional[UUID] = Query(None),
    donor_id: Optional[UUID] = Query(None),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not current_user.tenant_id and not current_user.is_super_admin:
        raise HTTPException(status_code=400, detail="Tenant context required")

    repo = ReceiptRepository(db)
    # If user is collector, default filter to own receipts unless has wide view
    target_collector = collector_id
    if not current_user.is_super_admin and "super_admin" not in [r.slug for r in current_user.roles]:
        if "collector" in [r.slug for r in current_user.roles] and "org_admin" not in [r.slug for r in current_user.roles]:
            target_collector = current_user.id

    receipts = repo.get_by_tenant(
        tenant_id=current_user.tenant_id,
        collector_id=target_collector,
        donor_id=donor_id,
        fy_id=fy_id,
        status=status,
        skip=skip,
        limit=limit,
    )
    user_map = {u.id: u.full_name for u in db.query(User).all()}
    for r in receipts:
        r.collector_name = user_map.get(r.collector_id, "Collector")
    return receipts


@router.get("/daily-summary", summary="Collector Daily Collection & Handover Summary")
async def get_collector_daily_summary(
    target_date: Optional[date] = Query(None),
    collector_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not current_user.tenant_id and not current_user.is_super_admin:
        raise HTTPException(status_code=400, detail="Tenant context required")

    summary_date = target_date or date.today()
    target_collector_id = collector_id or current_user.id

    collector = db.get(User, target_collector_id)
    collector_name = collector.full_name if collector else "Collector"

    all_today_receipts = (
        db.query(Receipt)
        .filter(
            Receipt.tenant_id == current_user.tenant_id,
            Receipt.collector_id == target_collector_id,
            Receipt.receipt_date == summary_date,
            Receipt.status != ReceiptStatus.CANCELLED,
        )
        .order_by(Receipt.created_at.desc())
        .all()
    )

    total_collected = sum(r.amount for r in all_today_receipts)
    cash_collected = sum(r.amount for r in all_today_receipts if r.payment_mode == PaymentMode.CASH)
    digital_collected = total_collected - cash_collected
    receipts_count = len(all_today_receipts)

    unsettled_cash_receipts = [
        r for r in all_today_receipts
        if r.payment_mode == PaymentMode.CASH and r.status in [ReceiptStatus.ISSUED, ReceiptStatus.PENDING_SETTLEMENT]
    ]
    unsettled_cash_amount = sum(r.amount for r in unsettled_cash_receipts)
    unsettled_receipt_ids = [str(r.id) for r in unsettled_cash_receipts]

    user_map = {u.id: u.full_name for u in db.query(User).all()}
    receipt_list = []
    for r in all_today_receipts:
        r.collector_name = user_map.get(r.collector_id, "Collector")
        donor_name = r.donor.full_name if r.donor else "Anonymous"
        receipt_list.append({
            "id": str(r.id),
            "receipt_number": r.receipt_number,
            "receipt_date": str(r.receipt_date),
            "donor_name": donor_name,
            "collector_name": r.collector_name,
            "amount": float(r.amount),
            "payment_mode": r.payment_mode.value if hasattr(r.payment_mode, "value") else str(r.payment_mode),
            "status": r.status.value if hasattr(r.status, "value") else str(r.status),
            "purpose": r.purpose or "Festival Donation",
        })

    return {
        "date": str(summary_date),
        "collector_id": str(target_collector_id),
        "collector_name": collector_name,
        "total_collected": float(total_collected),
        "cash_collected": float(cash_collected),
        "digital_collected": float(digital_collected),
        "receipts_count": receipts_count,
        "unsettled_cash_amount": float(unsettled_cash_amount),
        "unsettled_receipt_ids": unsettled_receipt_ids,
        "receipts": receipt_list,
    }


@router.post("", response_model=ReceiptResponse, status_code=status.HTTP_201_CREATED, summary="Create Receipt")
async def create_receipt(
    payload: ReceiptCreate,
    current_user: User = Depends(require("receipts", "create")),
    db: Session = Depends(get_db),
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")

    # Verify donor exists
    donor_repo = DonorRepository(db)
    donor = donor_repo.get(payload.donor_id)
    if not donor or donor.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Donor not found")

    # Verify or auto-resolve active Financial Year
    fy = None
    if payload.financial_year_id:
        fy = db.get(FinancialYear, payload.financial_year_id)
    
    if not fy:
        fy = db.execute(
            select(FinancialYear).where(
                FinancialYear.tenant_id == current_user.tenant_id,
                FinancialYear.is_current == True
            )
        ).scalar_one_or_none()
    
    if not fy:
        fy = db.execute(
            select(FinancialYear).where(FinancialYear.tenant_id == current_user.tenant_id)
        ).scalars().first()

    if not fy:
        raise HTTPException(status_code=400, detail="No active Financial Year found. Please create a Financial Year first.")

    fy_id = fy.id
    receipt_repo = ReceiptRepository(db)
    receipt_number = receipt_repo.generate_receipt_number(current_user.tenant_id, fy.name)

    # Initial status based on payment mode:
    # CASH -> PENDING_SETTLEMENT (Awaiting Cash Handover to Treasurer)
    # UPI / CHEQUE / NEFT -> ISSUED (Awaiting Trustee Bank Credit Verification)
    initial_status = ReceiptStatus.ISSUED
    if payload.payment_mode == PaymentMode.CASH:
        initial_status = ReceiptStatus.PENDING_SETTLEMENT

    receipt = Receipt(
        tenant_id=current_user.tenant_id,
        financial_year_id=fy_id,
        festival_id=payload.festival_id,
        donor_id=payload.donor_id,
        collector_id=current_user.id,
        receipt_number=receipt_number,
        receipt_date=payload.receipt_date or date.today(),
        amount=payload.amount,
        payment_mode=payload.payment_mode,
        status=initial_status,
        cheque_number=payload.cheque_number,
        cheque_date=payload.cheque_date,
        bank_name=payload.bank_name,
        upi_reference=payload.upi_reference,
        transaction_ref=payload.transaction_ref,
        purpose=payload.purpose,
        notes=payload.notes,
    )
    created = receipt_repo.create(receipt)

    # Increment donor total donations
    donor.total_donations += int(payload.amount)
    db.commit()

    # Log Audit Event
    try:
        from app.services.audit_service import log_audit_event
        log_audit_event(
            db=db,
            user=current_user,
            module="receipts",
            action="create",
            record_id=str(created.id),
            record_label=f"Issued Receipt {created.receipt_number} (₹{created.amount} via {created.payment_mode.value.upper()})",
            new_values={"amount": float(created.amount), "payment_mode": created.payment_mode.value, "status": created.status.value}
        )
    except Exception:
        pass

    return created


@router.get("/{receipt_id}", response_model=ReceiptResponse, summary="Get Receipt Details")
async def get_receipt(
    receipt_id: UUID,
    current_user: User = Depends(require("receipts", "view")),
    db: Session = Depends(get_db),
):
    repo = ReceiptRepository(db)
    receipt = repo.get(receipt_id)
    if not receipt or (receipt.tenant_id != current_user.tenant_id and not current_user.is_super_admin):
        raise HTTPException(status_code=404, detail="Receipt not found")
    return receipt


@router.post("/{receipt_id}/cancel", response_model=ReceiptResponse, summary="Cancel Receipt")
async def cancel_receipt(
    receipt_id: UUID,
    payload: ReceiptCancel,
    current_user: User = Depends(require("receipts", "cancel")),
    db: Session = Depends(get_db),
):
    repo = ReceiptRepository(db)
    receipt = repo.get(receipt_id)
    if not receipt or (receipt.tenant_id != current_user.tenant_id and not current_user.is_super_admin):
        raise HTTPException(status_code=404, detail="Receipt not found")

    if receipt.status == ReceiptStatus.SETTLED:
        raise HTTPException(status_code=400, detail="Cannot cancel a settled receipt")

    receipt.status = ReceiptStatus.CANCELLED
    receipt.cancel_reason = payload.reason
    receipt.cancelled_by = current_user.id
    db.commit()
    db.refresh(receipt)
    return receipt


class ReceiptSettlePayload(BaseModel):
    upi_reference: Optional[str] = None
    transaction_ref: Optional[str] = None
    bank_name: Optional[str] = None
    notes: Optional[str] = None


@router.post("/{receipt_id}/settle", response_model=ReceiptResponse, summary="Settle Receipt (Bank / Digital Reconciliation)")
async def settle_receipt(
    receipt_id: UUID,
    payload: Optional[ReceiptSettlePayload] = None,
    current_user: User = Depends(require("receipts", "create")),
    db: Session = Depends(get_db),
):
    repo = ReceiptRepository(db)
    receipt = repo.get(receipt_id)
    if not receipt or (receipt.tenant_id != current_user.tenant_id and not current_user.is_super_admin):
        raise HTTPException(status_code=404, detail="Receipt not found")

    if payload:
        if payload.upi_reference:
            receipt.upi_reference = payload.upi_reference
        if payload.transaction_ref:
            receipt.transaction_ref = payload.transaction_ref
        if payload.bank_name:
            receipt.bank_name = payload.bank_name
        if payload.notes:
            receipt.notes = payload.notes

    receipt.status = ReceiptStatus.SETTLED
    db.commit()
    db.refresh(receipt)
    return receipt
