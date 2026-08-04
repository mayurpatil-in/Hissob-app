"""
Super Admin Router — System platform analytics, tenant storage, and global settings.
"""
from fastapi import APIRouter
from fastapi import Depends
from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.deps import get_super_admin
from app.core.database import get_db
from app.models.audit import AuditLog
from app.models.finance import Expense
from app.models.receipt import Receipt
from app.models.tenant import Tenant
from app.models.user import User

router = APIRouter(prefix="/super-admin", tags=["Super Admin"])


@router.get("/dashboard-stats", summary="Platform Wide Super Admin Analytics")
async def super_admin_stats(
    current_user: User = Depends(get_super_admin),
    db: Session = Depends(get_db),
):
    total_tenants = db.execute(select(func.count(Tenant.id))).scalar_one()
    total_users = db.execute(select(func.count(User.id))).scalar_one()
    total_collections = float(db.execute(select(func.sum(Receipt.amount))).scalar() or 0.0)
    total_expenses = float(db.execute(select(func.sum(Expense.amount))).scalar() or 0.0)
    total_audits = db.execute(select(func.count(AuditLog.id))).scalar_one()

    return {
        "total_organizations": total_tenants,
        "total_users": total_users,
        "total_platform_collections": total_collections,
        "total_platform_expenses": total_expenses,
        "total_audit_records": total_audits,
        "mrr": total_tenants * 1499.0,  # Simulated SaaS MRR
    }
