"""
Dashboard API router — Aggregates live organization analytics, metrics, recent receipts, and festival progress.
"""
from typing import Dict, Any, List
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from sqlalchemy.orm import joinedload

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
    Optimized: Single SQL aggregate queries to eliminate N+1 overhead.
    """
    tenant_id = current_user.tenant_id

    # 1. Total Collections & Receipts Aggregations (Single Query)
    receipt_stats = db.query(
        func.count(Receipt.id).label("total_receipts"),
        func.coalesce(func.sum(Receipt.amount), 0.0).label("total_collections"),
        func.coalesce(func.sum(case((Receipt.status == "settled", Receipt.amount), else_=0.0)), 0.0).label("settled_amount"),
        func.coalesce(func.sum(case((Receipt.status.in_(["pending_settlement", "issued"]), Receipt.amount), else_=0.0)), 0.0).label("pending_amount"),
        func.count(case((Receipt.status.in_(["pending_settlement", "issued"]), 1))).label("pending_count"),
        func.coalesce(func.sum(case((Receipt.payment_mode == "cash", Receipt.amount), else_=0.0)), 0.0).label("cash_amount"),
    ).filter(
        Receipt.tenant_id == tenant_id,
        Receipt.status != "cancelled"
    ).first()

    total_receipts = receipt_stats.total_receipts if receipt_stats else 0
    total_collections = float(receipt_stats.total_collections if receipt_stats else 0.0)
    settled_amount = float(receipt_stats.settled_amount if receipt_stats else 0.0)
    pending_amount = float(receipt_stats.pending_amount if receipt_stats else 0.0)
    pending_count = receipt_stats.pending_count if receipt_stats else 0
    cash_amount = float(receipt_stats.cash_amount if receipt_stats else 0.0)
    digital_amount = total_collections - cash_amount

    # 2. Donor Aggregations (Single Query)
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    donor_stats = db.query(
        func.count(Donor.id).label("total_donors"),
        func.count(case((Donor.created_at >= seven_days_ago, 1))).label("new_donors_week"),
        func.count(case((Donor.is_vip == True, 1))).label("vip_donors_count"),
    ).filter(Donor.tenant_id == tenant_id).first()

    total_donors = donor_stats.total_donors if donor_stats else 0
    new_donors_week = donor_stats.new_donors_week if donor_stats else 0
    vip_donors_count = donor_stats.vip_donors_count if donor_stats else 0

    # 3. Recent 5 Receipts (With Eager Loading to avoid N+1 per row)
    recent_receipts_raw = db.query(Receipt).options(
        joinedload(Receipt.donor)
    ).filter(
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

    # 4. Festivals Campaign Progress (Grouped in 1 Query instead of N+1 loop)
    festivals_raw = db.query(Festival).filter(Festival.tenant_id == tenant_id).limit(4).all()
    
    festival_totals = {}
    if festivals_raw:
        festival_ids = [f.id for f in festivals_raw]
        totals_query = db.query(
            Receipt.festival_id,
            func.coalesce(func.sum(Receipt.amount), 0.0).label("collected")
        ).filter(
            Receipt.tenant_id == tenant_id,
            Receipt.festival_id.in_(festival_ids),
            Receipt.status != "cancelled"
        ).group_by(Receipt.festival_id).all()

        festival_totals = {row.festival_id: float(row.collected) for row in totals_query}

    festivals = []
    for f in festivals_raw:
        collected = festival_totals.get(f.id, 0.0)
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
