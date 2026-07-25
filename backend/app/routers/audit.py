"""
Audit Log Router — View system mutations and security trail.
"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.core.database import get_db
from app.permissions.rbac import require
from app.models.user import User
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogResponse

router = APIRouter(prefix="/audit", tags=["Audit Log"])


@router.get("", response_model=List[AuditLogResponse], summary="List & Filter Audit Logs")
async def list_audit_logs(
    module: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require("audit", "view")),
    db: Session = Depends(get_db),
):
    stmt = select(AuditLog)
    if not current_user.is_super_admin:
        if not current_user.tenant_id:
            raise HTTPException(status_code=400, detail="Tenant context required")
        stmt = stmt.where(AuditLog.tenant_id == current_user.tenant_id)

    if module:
        stmt = stmt.where(AuditLog.module == module)
    if action:
        stmt = stmt.where(AuditLog.action == action)

    stmt = stmt.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
    return list(db.execute(stmt).scalars().all())
