"""
Dashboard API router — Aggregates live organization analytics, metrics, recent receipts, and festival progress.
"""
from typing import Dict, Any, List
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.auth.deps import get_current_user
from app.models.user import User
from app.models.receipt import Receipt
from app.models.donor import Donor
from app.models.festival import Festival

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=Dict[str, Any])
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns live database metrics for the active tenant's dashboard.
    """
    tenant_id = current_user.tenant_id

    # 1. Total Collections & Receipts Metrics
    receipt_query = db.query(Receipt).filter(
        Receipt.tenant_id == tenant_id,
        Receipt.status != "cancelled"
    )

    total_receipts = receipt_query.count()
    total_collections = float(db.query(func.coalesce(func.sum(Receipt.amount), 0.0)).filter(
        Receipt.tenant_id == tenant_id,
        Receipt.status != "cancelled"
    ).scalar() or 0.0)

    settled_amount = float(db.query(func.coalesce(func.sum(Receipt.amount), 0.0)).filter(
        Receipt.tenant_id == tenant_id,
        Receipt.status == "settled"
    ).scalar() or 0.0)

    pending_amount = float(db.query(func.coalesce(func.sum(Receipt.amount), 0.0)).filter(
        Receipt.tenant_id == tenant_id,
        Receipt.status.in_(["pending_settlement", "issued"])
    ).scalar() or 0.0)

    pending_count = db.query(Receipt).filter(
        Receipt.tenant_id == tenant_id,
        Receipt.status.in_(["pending_settlement", "issued"])
    ).count()

    # 2. Donor Metrics
    total_donors = db.query(Donor).filter(Donor.tenant_id == tenant_id).count()
    
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    new_donors_week = db.query(Donor).filter(
        Donor.tenant_id == tenant_id,
        Donor.created_at >= seven_days_ago
    ).count()

    vip_donors_count = db.query(Donor).filter(
        Donor.tenant_id == tenant_id,
        Donor.is_vip == True
    ).count()

    # 3. Mode Breakdown (Cash vs Digital)
    cash_amount = float(db.query(func.coalesce(func.sum(Receipt.amount), 0.0)).filter(
        Receipt.tenant_id == tenant_id,
        Receipt.status != "cancelled",
        Receipt.payment_mode == "cash"
    ).scalar() or 0.0)

    digital_amount = total_collections - cash_amount

    # 4. Recent 5 Receipts
    recent_receipts_raw = db.query(Receipt).filter(
        Receipt.tenant_id == tenant_id
    ).order_by(Receipt.created_at.desc()).limit(5).all()

    recent_receipts = []
    for r in recent_receipts_raw:
        donor_name = r.donor.full_name if r.donor else getattr(r, 'donor_name', 'Anonymous')
        collector_name = r.collector.full_name if getattr(r, 'collector', None) else "Self Service"
        recent_receipts.append({
            "key": str(r.id),
            "id": str(r.id),
            "receipt": r.receipt_number,
            "receipt_number": r.receipt_number,
            "donor": donor_name,
            "donor_name": donor_name,
            "is_vip": getattr(r.donor, 'is_vip', False) if r.donor else False,
            "amount": float(r.amount or 0.0),
            "amount_formatted": f"₹ {float(r.amount or 0.0):,.2f}",
            "mode": str(r.payment_mode).upper() if r.payment_mode else "CASH",
            "payment_mode": str(r.payment_mode).upper() if r.payment_mode else "CASH",
            "collector_name": collector_name,
            "date": r.receipt_date.strftime("%d %b %Y") if r.receipt_date else (r.created_at.strftime("%d %b %Y") if r.created_at else "Today"),
            "status": str(r.status)
        })

    # 5. Festivals Campaign Progress
    festivals_raw = db.query(Festival).filter(Festival.tenant_id == tenant_id).limit(4).all()
    festivals = []
    for f in festivals_raw:
        collected = float(db.query(func.coalesce(func.sum(Receipt.amount), 0.0)).filter(
            Receipt.tenant_id == tenant_id,
            Receipt.festival_id == f.id,
            Receipt.status != "cancelled"
        ).scalar() or 0.0)
        
        target = float(getattr(f, 'budget', 0.0) or 100000.0)
        pct = min(100, int((collected / target) * 100)) if target > 0 else 0
        
        festivals.append({
            "name": f.name,
            "collected": collected,
            "target": target,
            "percent": pct,
            "status": str(f.status)
        })

    # Calculate exact settlement rate percentage from real database numbers
    settlement_pct = int((settled_amount / total_collections * 100)) if total_collections > 0 else 0

    return {
        "metrics": {
            "total_collections": total_collections,
            "total_receipts": total_receipts,
            "active_donors": total_donors,
            "new_donors_week": new_donors_week,
            "vip_donors": vip_donors_count,
            "settled_amount": settled_amount,
            "pending_amount": pending_amount,
            "pending_count": pending_count,
            "cash_amount": cash_amount,
            "digital_amount": digital_amount,
            "settlement_pct": settlement_pct,
        },
        "recent_receipts": recent_receipts,
        "festivals": festivals,
    }
