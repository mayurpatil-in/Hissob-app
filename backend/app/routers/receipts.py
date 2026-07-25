"""
Receipts Router — Create receipt, list receipts, cancel receipt.
"""
from typing import List, Optional
from uuid import UUID
from datetime import date, datetime, timezone
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


@router.get("", response_model=List[ReceiptResponse], summary="List & Filter Receipts")
async def list_receipts(
    fy_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    collector_id: Optional[UUID] = Query(None),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require("receipts", "view")),
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

    return repo.get_by_tenant(
        tenant_id=current_user.tenant_id,
        collector_id=target_collector,
        fy_id=fy_id,
        status=status,
        skip=skip,
        limit=limit,
    )


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

    # Verify Financial Year
    fy = db.get(FinancialYear, payload.financial_year_id)
    if not fy or fy.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Financial Year not found")

    receipt_repo = ReceiptRepository(db)
    receipt_number = receipt_repo.generate_receipt_number(current_user.tenant_id, fy.name)

    # Initial status based on payment mode
    initial_status = ReceiptStatus.ISSUED
    if payload.payment_mode == PaymentMode.CASH:
        initial_status = ReceiptStatus.PENDING_SETTLEMENT

    receipt = Receipt(
        tenant_id=current_user.tenant_id,
        financial_year_id=payload.financial_year_id,
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
