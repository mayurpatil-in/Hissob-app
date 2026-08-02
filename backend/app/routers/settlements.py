"""
Cash Settlement Router — Collector submit $\rightarrow$ Treasurer verify & approve.
"""
from typing import List, Optional
from uuid import UUID
from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.permissions.rbac import require
from app.models.user import User
from app.models.receipt import Receipt, ReceiptStatus
from app.models.finance import CashSettlement, SettlementStatus
from app.repositories.receipt import CashSettlementRepository, ReceiptRepository
from app.schemas.receipt import (
    CashSettlementCreate,
    CashSettlementVerify,
    CashSettlementResponse,
)

router = APIRouter(prefix="/settlements", tags=["Cash Settlements"])


@router.get("", response_model=List[CashSettlementResponse], summary="List Cash Settlements")
async def list_settlements(
    status: Optional[str] = Query(None),
    collector_id: Optional[UUID] = Query(None),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require("cash_settlement", "view")),
    db: Session = Depends(get_db),
):
    if not current_user.tenant_id and not current_user.is_super_admin:
        raise HTTPException(status_code=400, detail="Tenant context required")

    repo = CashSettlementRepository(db)
    return repo.get_by_tenant(
        tenant_id=current_user.tenant_id,
        status=status,
        collector_id=collector_id,
        skip=skip,
        limit=limit,
    )


@router.post("", response_model=CashSettlementResponse, status_code=status.HTTP_201_CREATED, summary="Collector Submit Cash Settlement")
async def submit_settlement(
    payload: CashSettlementCreate,
    current_user: User = Depends(require("cash_settlement", "create")),
    db: Session = Depends(get_db),
):
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")

    if not payload.receipt_ids:
        raise HTTPException(status_code=400, detail="No receipts selected for settlement")

    # Fetch and validate receipts
    user_role_slugs = [r.slug for r in getattr(current_user, "roles", [])] if hasattr(current_user, "roles") else []
    is_privileged = current_user.is_super_admin or any(role in user_role_slugs for role in ["org_admin", "super_admin", "treasurer", "admin", "trustee", "president"])

    query = db.query(Receipt).filter(
        Receipt.id.in_(payload.receipt_ids),
        Receipt.tenant_id == current_user.tenant_id,
        Receipt.status.in_([ReceiptStatus.ISSUED, ReceiptStatus.PENDING_SETTLEMENT]),
    )
    if not is_privileged:
        query = query.filter(Receipt.collector_id == current_user.id)

    receipts = query.all()

    if len(receipts) != len(payload.receipt_ids):
        raise HTTPException(status_code=400, detail="Some selected receipts are invalid or already settled")

    total_amount = sum(r.amount for r in receipts)

    # Auto-resolve financial_year_id if not explicitly provided
    fy_id = payload.financial_year_id
    if not fy_id and receipts:
        fy_id = receipts[0].financial_year_id
    if not fy_id:
        from app.models.financial_year import FinancialYear
        active_fy = db.query(FinancialYear).filter(
            FinancialYear.tenant_id == current_user.tenant_id,
            FinancialYear.is_current == True
        ).first()
        if active_fy:
            fy_id = active_fy.id
    if not fy_id:
        raise HTTPException(status_code=400, detail="Active Financial Year context required for cash settlement.")

    repo = CashSettlementRepository(db)
    settlement_num = repo.generate_settlement_number(current_user.tenant_id)

    target_collector_id = receipts[0].collector_id if receipts else current_user.id

    settlement = CashSettlement(
        tenant_id=current_user.tenant_id,
        financial_year_id=fy_id,
        festival_id=payload.festival_id or (receipts[0].festival_id if receipts else None),
        collector_id=target_collector_id,
        settlement_number=settlement_num,
        settlement_date=payload.settlement_date or date.today(),
        total_amount=total_amount,
        receipt_count=len(receipts),
        status=SettlementStatus.SUBMITTED,
        submitted_at=datetime.now(timezone.utc),
        notes=payload.notes,
    )
    created = repo.create(settlement)

    # Link receipts to settlement
    for r in receipts:
        r.settlement_id = created.id
        r.status = ReceiptStatus.PENDING_SETTLEMENT

    db.commit()

    # 🔔 Notify Treasurer role about new cash settlement submission
    try:
        from app.services.notification_service import notify_role
        notify_role(
            db=db,
            tenant_id=current_user.tenant_id,
            role_slug="treasurer",
            title=f"💰 Cash Settlement Submitted — ₹{total_amount:,.2f}",
            message=f"Collector {current_user.full_name} submitted settlement {settlement_num} with {len(receipts)} receipts totalling ₹{total_amount:,.2f}. Please review and approve.",
            notification_type="settlement",
            related_module="settlements",
            related_id=str(created.id),
            exclude_user_id=current_user.id,
        )
        db.commit()
    except Exception:
        pass

    try:
        from app.services.audit_service import log_audit_event
        log_audit_event(db=db, user=current_user, module="cash_settlement", action="create", record_id=str(created.id), record_label=f"Submitted Cash Settlement {settlement_num} (₹{total_amount:,.2f})", notes=f"Included {len(receipts)} receipts")
    except Exception:
        pass

    return created


@router.post("/{settlement_id}/verify", response_model=CashSettlementResponse, summary="Treasurer Approve or Reject Settlement")
async def verify_settlement(
    settlement_id: UUID,
    payload: CashSettlementVerify,
    current_user: User = Depends(require("cash_settlement", "approve")),
    db: Session = Depends(get_db),
):
    repo = CashSettlementRepository(db)
    settlement = repo.get(settlement_id)
    if not settlement or (settlement.tenant_id != current_user.tenant_id and not current_user.is_super_admin):
        raise HTTPException(status_code=404, detail="Settlement not found")

    if settlement.status not in [SettlementStatus.SUBMITTED, SettlementStatus.PENDING]:
        raise HTTPException(status_code=400, detail="Settlement already processed")

    now = datetime.now(timezone.utc)
    receipts = db.query(Receipt).filter(Receipt.settlement_id == settlement.id).all()

    if payload.action == "approve":
        settlement.status = SettlementStatus.APPROVED
        settlement.approved_by = current_user.id
        settlement.approved_at = now
        settlement.notes = payload.notes or settlement.notes
        for r in receipts:
            r.status = ReceiptStatus.SETTLED
    else:
        settlement.status = SettlementStatus.REJECTED
        settlement.rejection_reason = payload.rejection_reason
        for r in receipts:
            r.status = ReceiptStatus.PENDING_SETTLEMENT
            r.settlement_id = None

    db.commit()
    db.refresh(settlement)

    try:
        from app.services.audit_service import log_audit_event
        audit_act = "approve" if payload.action == "approve" else "reject"
        log_audit_event(db=db, user=current_user, module="cash_settlement", action=audit_act, record_id=str(settlement.id), record_label=f"Cash Settlement {settlement.settlement_number} {payload.action.upper()} (₹{settlement.total_amount:,.2f})", notes=f"Reviewed by {current_user.full_name}")
    except Exception:
        pass

    # 🔔 Notify the collector about approval or rejection
    try:
        from app.services.notification_service import create_notification
        collector = db.get(User, settlement.collector_id)
        if collector:
            if payload.action == "approve":
                create_notification(
                    db=db,
                    user_id=settlement.collector_id,
                    title=f"✅ Settlement {settlement.settlement_number} Approved!",
                    message=f"Your cash settlement of ₹{float(settlement.total_amount):,.2f} has been approved by {current_user.full_name}.",
                    notification_type="success",
                    related_module="settlements",
                    related_id=str(settlement.id),
                    tenant_id=settlement.tenant_id,
                )
            else:
                reason = payload.rejection_reason or "No reason provided"
                create_notification(
                    db=db,
                    user_id=settlement.collector_id,
                    title=f"❌ Settlement {settlement.settlement_number} Rejected",
                    message=f"Your cash settlement was rejected by {current_user.full_name}. Reason: {reason}",
                    notification_type="error",
                    related_module="settlements",
                    related_id=str(settlement.id),
                    tenant_id=settlement.tenant_id,
                )
            db.commit()
    except Exception:
        pass

    return settlement
