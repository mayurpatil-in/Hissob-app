"""
Receipts Router — Create receipt, list receipts, cancel receipt.
"""
from typing import List, Optional
from uuid import UUID
from datetime import date, datetime, timezone
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.permissions.rbac import require
from app.models.user import User
from app.models.tenant import Tenant
from app.models.receipt import Receipt, ReceiptStatus, PaymentMode
from app.models.donor import Donor
from app.models.financial_year import FinancialYear
from app.repositories.receipt import ReceiptRepository
from app.repositories.donor import DonorRepository
from app.schemas.receipt import ReceiptCreate, ReceiptCancel, ReceiptUpdate, ReceiptResponse, PublicReceiptVerificationResponse

router = APIRouter(prefix="/receipts", tags=["Receipts"])


class PublicDonorLookupResponse(BaseModel):
    exists: bool
    donor_number: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    pan_number: Optional[str] = None
    city: Optional[str] = None
    total_donations: Optional[int] = 0
    is_80g_eligible: Optional[bool] = False


@router.get("/public-donor-lookup", response_model=PublicDonorLookupResponse, summary="Public Lookup Donor by Phone")
async def public_donor_lookup(
    phone: Optional[str] = Query(None),
    slug_or_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    if not phone or len(phone.strip()) < 10:
        return PublicDonorLookupResponse(exists=False)
    tenant = None
    if slug_or_id:
        tenant = db.query(Tenant).filter(Tenant.slug == slug_or_id).first()
        if not tenant:
            try:
                val_uuid = UUID(slug_or_id)
                tenant = db.query(Tenant).filter(Tenant.id == val_uuid).first()
            except ValueError:
                pass

    if not tenant:
        tenant = db.query(Tenant).filter(Tenant.is_active == True).first()

    if not tenant:
        return PublicDonorLookupResponse(exists=False)

    donor = db.query(Donor).filter(Donor.tenant_id == tenant.id, Donor.phone == phone.strip()).first()
    if not donor:
        return PublicDonorLookupResponse(exists=False)

    return PublicDonorLookupResponse(
        exists=True,
        donor_number=donor.donor_number,
        full_name=donor.full_name,
        email=donor.email,
        pan_number=donor.pan_number,
        city=donor.city,
        total_donations=donor.total_donations or 0,
        is_80g_eligible=donor.is_80g_eligible or False,
    )


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
    collector_ids = {r.collector_id for r in receipts if r.collector_id}
    user_map = {u.id: u.full_name for u in db.query(User.id, User.full_name).filter(User.id.in_(collector_ids)).all()} if collector_ids else {}
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

    collector_ids = {r.collector_id for r in all_today_receipts if r.collector_id}
    user_map = {u.id: u.full_name for u in db.query(User.id, User.full_name).filter(User.id.in_(collector_ids)).all()} if collector_ids else {}
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
    background_tasks: BackgroundTasks,
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

    # Trigger Automated Email Delivery if donor email exists and enabled in settings
    tenant = db.get(Tenant, current_user.tenant_id)
    if donor and donor.email and getattr(tenant, "enable_email_receipts", True):
        from app.services.email_service import send_receipt_email_notification
        background_tasks.add_task(
            send_receipt_email_notification,
            to_email=donor.email,
            donor_name=donor.full_name,
            receipt_number=created.receipt_number,
            receipt_date=str(created.receipt_date),
            amount=float(created.amount),
            purpose=created.purpose or "General Donation",
            payment_mode=created.payment_mode.value if hasattr(created.payment_mode, "value") else str(created.payment_mode),
            org_name=tenant.name if tenant else "Hisob ERP",
            org_city=tenant.city if tenant else None,
            org_logo_url=tenant.logo_url if tenant else None,
            org_pan=tenant.pan if tenant else None,
            pan_number=donor.pan_number,
            receipt_id=str(created.id),
            transaction_ref=created.upi_reference or created.transaction_ref,
            tenant_id=current_user.tenant_id,
        )

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


@router.put("/{receipt_id}", response_model=ReceiptResponse, summary="Update Receipt")
async def update_receipt(
    receipt_id: UUID,
    payload: ReceiptUpdate,
    current_user: User = Depends(require("receipts", "create")),
    db: Session = Depends(get_db),
):
    repo = ReceiptRepository(db)
    receipt = repo.get(receipt_id)
    if not receipt or (receipt.tenant_id != current_user.tenant_id and not current_user.is_super_admin):
        raise HTTPException(status_code=404, detail="Receipt not found")

    if receipt.status == ReceiptStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Cannot edit a cancelled receipt")

    old_amount = float(receipt.amount)
    new_amount = float(payload.amount) if payload.amount is not None else old_amount

    if payload.amount is not None:
        receipt.amount = payload.amount
        if receipt.donor:
            receipt.donor.total_donations += int(new_amount - old_amount)

    if payload.payment_mode is not None:
        receipt.payment_mode = payload.payment_mode
    if payload.receipt_date is not None:
        receipt.receipt_date = payload.receipt_date
    if payload.donor_id is not None:
        receipt.donor_id = payload.donor_id
    if payload.purpose is not None:
        receipt.purpose = payload.purpose
    if payload.notes is not None:
        receipt.notes = payload.notes
    if payload.upi_reference is not None:
        receipt.upi_reference = payload.upi_reference
    if payload.cheque_number is not None:
        receipt.cheque_number = payload.cheque_number
    if payload.bank_name is not None:
        receipt.bank_name = payload.bank_name
    if payload.transaction_ref is not None:
        receipt.transaction_ref = payload.transaction_ref
    if payload.festival_id is not None:
        receipt.festival_id = payload.festival_id

    db.commit()
    db.refresh(receipt)
    try:
        from app.services.audit_service import log_audit_event
        log_audit_event(db=db, user=current_user, module="receipts", action="update", record_id=str(receipt.id), record_label=f"Updated Receipt {receipt.receipt_number}", notes=f"Amount: ₹{receipt.amount}")
    except Exception:
        pass
    return receipt


@router.post("/{receipt_id}/cancel", response_model=ReceiptResponse, summary="Cancel Receipt")
async def cancel_receipt(
    receipt_id: UUID,
    payload: Optional[ReceiptCancel] = None,
    current_user: User = Depends(require("receipts", "cancel")),
    db: Session = Depends(get_db),
):
    repo = ReceiptRepository(db)
    receipt = repo.get(receipt_id)
    if not receipt or (receipt.tenant_id != current_user.tenant_id and not current_user.is_super_admin):
        raise HTTPException(status_code=404, detail="Receipt not found")

    if receipt.donor and receipt.status != ReceiptStatus.CANCELLED:
        receipt.donor.total_donations = max(0, receipt.donor.total_donations - int(receipt.amount))

    reason_str = payload.reason if payload and payload.reason else "Cancelled by user"
    receipt.status = ReceiptStatus.CANCELLED
    receipt.cancel_reason = reason_str
    receipt.cancelled_by = current_user.id

    if receipt.settlement_id:
        from app.models.finance import CashSettlement
        settlement_id = receipt.settlement_id
        receipt.settlement_id = None
        db.flush()
        settlement = db.get(CashSettlement, settlement_id)
        if settlement:
            active_receipts = db.query(Receipt).filter(
                Receipt.settlement_id == settlement_id,
                Receipt.status != ReceiptStatus.CANCELLED
            ).all()
            if not active_receipts:
                db.delete(settlement)
            else:
                settlement.receipt_count = len(active_receipts)
                settlement.total_amount = sum(r.amount for r in active_receipts)

    db.commit()
    db.refresh(receipt)
    try:
        from app.services.audit_service import log_audit_event
        log_audit_event(db=db, user=current_user, module="receipts", action="reject", record_id=str(receipt.id), record_label=f"Cancelled Receipt {receipt.receipt_number}", notes=f"Reason: {reason_str}")
    except Exception:
        pass
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
    try:
        from app.services.audit_service import log_audit_event
        log_audit_event(db=db, user=current_user, module="receipts", action="settle", record_id=str(receipt.id), record_label=f"Settled Receipt {receipt.receipt_number}", notes="Digital/Bank reconciliation")
    except Exception:
        pass
    return receipt


@router.delete("/{receipt_id}", summary="Permanently Delete Receipt (Organization Admin Only)")
async def delete_receipt(
    receipt_id: UUID,
    current_user: User = Depends(require("receipts", "delete")),
    db: Session = Depends(get_db),
):
    repo = ReceiptRepository(db)
    receipt = repo.get(receipt_id)
    if not receipt or (receipt.tenant_id != current_user.tenant_id and not current_user.is_super_admin):
        raise HTTPException(status_code=404, detail="Receipt not found")

    user_role_slugs = {
        str(getattr(r, 'slug', '') or '').lower() for r in getattr(current_user, 'roles', [])
    } | {
        str(getattr(r, 'name', '') or '').lower() for r in getattr(current_user, 'roles', [])
    }
    is_org_admin = current_user.is_super_admin or any(
        role in user_role_slugs for role in (
            'org_admin', 'org admin', 'organization admin', 'organization_admin', 'admin', 'president', 'super_admin', 'super admin'
        )
    )

    if not is_org_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Organization Administrators can permanently delete receipts from the database."
        )

    # Verify if Super Admin enabled permanent deletion permission for this Organization
    if not current_user.is_super_admin and current_user.tenant_id:
        from app.models.tenant import Tenant
        tenant = db.get(Tenant, current_user.tenant_id)
        if tenant and not getattr(tenant, "allow_permanent_deletion", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permanent receipt deletion is disabled for your Organization by Super Admin."
            )

    if receipt.donor and receipt.status != ReceiptStatus.CANCELLED:
        receipt.donor.total_donations = max(0, receipt.donor.total_donations - int(receipt.amount))

    if receipt.settlement_id:
        from app.models.finance import CashSettlement
        settlement_id = receipt.settlement_id
        receipt.settlement_id = None
        db.flush()
        settlement = db.get(CashSettlement, settlement_id)
        if settlement:
            active_receipts = db.query(Receipt).filter(
                Receipt.settlement_id == settlement_id,
                Receipt.id != receipt.id,
                Receipt.status != ReceiptStatus.CANCELLED
            ).all()
            if not active_receipts:
                db.delete(settlement)
            else:
                settlement.receipt_count = len(active_receipts)
                settlement.total_amount = sum(r.amount for r in active_receipts)

    db.delete(receipt)
    db.commit()
    try:
        from app.services.audit_service import log_audit_event
        log_audit_event(
            db=db,
            user=current_user,
            module="receipts",
            action="delete",
            record_id=str(receipt.id),
            record_label=f"Permanently Deleted Receipt {receipt.receipt_number}",
            notes=f"Amount: ₹{receipt.amount} | Permanently deleted by Org Admin {current_user.full_name}"
        )
    except Exception:
        pass
    return {"message": "Receipt permanently deleted by Organization Admin", "id": str(receipt_id)}


@router.get("/public/{receipt_id}/verify", response_model=PublicReceiptVerificationResponse, summary="Publicly Verify Receipt")
async def verify_receipt_public(
    receipt_id: UUID,
    db: Session = Depends(get_db),
):
    repo = ReceiptRepository(db)
    receipt = repo.get(receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    tenant = db.get(Tenant, receipt.tenant_id)

    return PublicReceiptVerificationResponse(
        id=receipt.id,
        receipt_number=receipt.receipt_number,
        receipt_date=receipt.receipt_date,
        amount=receipt.amount,
        payment_mode=receipt.payment_mode,
        status=receipt.status,
        donor_name=receipt.donor.full_name if receipt.donor else "Unknown",
        purpose=receipt.purpose,
        transaction_ref=receipt.transaction_ref or receipt.upi_reference or receipt.cheque_number,
        org_name=tenant.name if tenant else "Unknown Organization",
        org_logo_url=tenant.logo_url if tenant else None,
        verified_at=datetime.now(timezone.utc)
    )


class PublicDonationPayload(BaseModel):
    slug_or_id: Optional[str] = None
    full_name: str = Field(..., min_length=2, max_length=200)
    phone: Optional[str] = None
    email: Optional[str] = None
    pan_number: Optional[str] = None
    city: Optional[str] = None
    amount: float = Field(..., gt=0)
    payment_mode: str = "upi"
    upi_reference: Optional[str] = None
    transaction_ref: Optional[str] = None
    purpose: Optional[str] = "General Donation"
    notes: Optional[str] = None


@router.post("/public-donate", response_model=ReceiptResponse, status_code=status.HTTP_201_CREATED, summary="Public Donor Submit UPI Donation")
async def create_public_donation_receipt(
    payload: PublicDonationPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    tenant = None
    if payload.slug_or_id:
        tenant = db.query(Tenant).filter(Tenant.slug == payload.slug_or_id).first()
        if not tenant:
            try:
                val_uuid = UUID(payload.slug_or_id)
                tenant = db.query(Tenant).filter(Tenant.id == val_uuid).first()
            except ValueError:
                pass

    if not tenant:
        tenant = db.query(Tenant).filter(Tenant.is_active == True).first()

    if not tenant:
        raise HTTPException(status_code=404, detail="Organization not found")

    donor = None
    if payload.phone:
        donor = db.query(Donor).filter(Donor.tenant_id == tenant.id, Donor.phone == payload.phone).first()

    if donor:
        # Update existing donor's details if provided
        if payload.pan_number and not donor.pan_number:
            donor.pan_number = payload.pan_number
            donor.is_80g_eligible = True
        if payload.email and not donor.email:
            donor.email = payload.email
        if payload.city and not donor.city:
            donor.city = payload.city
    else:
        donor_repo = DonorRepository(db)
        donor_num = donor_repo.generate_donor_number(tenant.id)
        donor = Donor(
            tenant_id=tenant.id,
            donor_number=donor_num,
            full_name=payload.full_name,
            phone=payload.phone,
            email=payload.email,
            pan_number=payload.pan_number,
            city=payload.city,
            total_donations=0,
            is_80g_eligible=bool(payload.pan_number),
        )
        db.add(donor)
        db.commit()
        db.refresh(donor)

    from app.models.financial_year import FinancialYear, FYStatus
    active_fy = db.query(FinancialYear).filter(
        FinancialYear.tenant_id == tenant.id,
        FinancialYear.is_current == True
    ).first()

    # Auto-create financial year if none exists (critical for public donations)
    if not active_fy:
        from datetime import datetime as dt
        now = dt.now()
        # Indian fiscal year: April to March
        if now.month >= 4:
            fy_start = date(now.year, 4, 1)
            fy_end = date(now.year + 1, 3, 31)
            fy_name = f"{now.year}-{str(now.year + 1)[-2:]}"
        else:
            fy_start = date(now.year - 1, 4, 1)
            fy_end = date(now.year, 3, 31)
            fy_name = f"{now.year - 1}-{str(now.year)[-2:]}"

        active_fy = FinancialYear(
            tenant_id=tenant.id,
            name=fy_name,
            start_date=fy_start,
            end_date=fy_end,
            status=FYStatus.ACTIVE,
            is_current=True,
        )
        db.add(active_fy)
        db.commit()
        db.refresh(active_fy)

    fy_id = active_fy.id
    fy_name = active_fy.name

    repo = ReceiptRepository(db)
    receipt_num = repo.generate_receipt_number(tenant.id, fy_name=fy_name)

    ref_str = payload.upi_reference or payload.transaction_ref

    # Find tenant user to assign as collector
    collector_user = db.query(User).filter(User.tenant_id == tenant.id).first()
    if not collector_user:
        collector_user = db.query(User).first()
    if not collector_user:
        raise HTTPException(status_code=500, detail="No system user found to record receipt")

    receipt = Receipt(
        tenant_id=tenant.id,
        financial_year_id=fy_id,
        donor_id=donor.id,
        collector_id=collector_user.id,
        receipt_number=receipt_num,
        receipt_date=date.today(),
        amount=payload.amount,
        payment_mode=PaymentMode.UPI if payload.payment_mode.lower() == 'upi' else PaymentMode.DIGITAL,
        upi_reference=ref_str,
        transaction_ref=ref_str,
        purpose=payload.purpose,
        notes=payload.notes or "Self-donated via UPI QR Portal",
        status=ReceiptStatus.ISSUED,
    )

    created_receipt = repo.create(receipt)
    donor.total_donations += int(payload.amount)
    db.commit()

    # Trigger Automated Email Delivery if donor email exists and enabled in settings
    if donor and donor.email and getattr(tenant, "enable_email_receipts", True):
        from app.services.email_service import send_receipt_email_notification
        background_tasks.add_task(
            send_receipt_email_notification,
            to_email=donor.email,
            donor_name=donor.full_name,
            receipt_number=created_receipt.receipt_number,
            receipt_date=str(created_receipt.receipt_date),
            amount=float(created_receipt.amount),
            purpose=created_receipt.purpose or "General Donation",
            payment_mode=created_receipt.payment_mode.value if hasattr(created_receipt.payment_mode, "value") else str(created_receipt.payment_mode),
            org_name=tenant.name if tenant else "Hisob ERP",
            org_city=tenant.city if tenant else None,
            org_logo_url=tenant.logo_url if tenant else None,
            org_pan=tenant.pan if tenant else None,
            pan_number=donor.pan_number,
            receipt_id=str(created_receipt.id),
            transaction_ref=created_receipt.upi_reference or created_receipt.transaction_ref,
        )

    return created_receipt
