"""
Audit Log Router — View system mutations and security trail.
"""
import math
from datetime import UTC
from datetime import datetime

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.deps import get_current_active_user
from app.core.database import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.permissions.rbac import require
from app.schemas.audit import ActivityFeedItem
from app.schemas.audit import AuditLogResponse

router = APIRouter(prefix="/audit", tags=["Audit Log"])


def _format_time_ago(dt: datetime) -> str:
    now = datetime.now(UTC)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    diff = max(0, (now - dt).total_seconds())
    if diff < 60:
        return "Just now"
    elif diff < 3600:
        mins = math.floor(diff / 60)
        return f"{mins} min{'s' if mins > 1 else ''} ago"
    elif diff < 86400:
        hours = math.floor(diff / 3600)
        return f"{hours} hr{'s' if hours > 1 else ''} ago"
    else:
        days = math.floor(diff / 86400)
        return f"{days} day{'s' if days > 1 else ''} ago"


def _format_story(action: str, module: str, label: str, notes: str | None) -> str:
    lbl = label or "record"
    note_str = f" • {notes}" if notes else ""
    act = (action or "").lower()
    mod = (module or "").lower()

    if mod == "receipts":
        if act == "create":
            return f"issued {lbl}{note_str}"
        elif act == "update":
            return f"updated {lbl}{note_str}"
        elif act in ["reject", "cancel"]:
            return f"cancelled {lbl}{note_str}"
        elif act == "settle":
            return f"reconciled {lbl}{note_str}"
    elif mod == "cash_settlement":
        if act == "create":
            return f"submitted {lbl}{note_str}"
        elif act == "approve":
            return f"approved {lbl}{note_str}"
        elif act == "reject":
            return f"rejected {lbl}{note_str}"
    elif mod == "expenses":
        if act == "create":
            return f"requested {lbl}{note_str}"
        elif act == "approve":
            return f"approved {lbl}{note_str}"
        elif act == "reject":
            return f"rejected {lbl}{note_str}"
    elif mod == "auth":
        if act == "login":
            return "signed into Hisob ERP"
        elif act == "logout":
            return "logged out of Hisob ERP"
    elif mod == "donors":
        if act == "create":
            return f"registered new donor profile {lbl}"
        elif act == "update":
            return f"updated donor profile {lbl}"

    return f"{act} {mod.replace('_', ' ')}: {lbl}{note_str}"


@router.get("", response_model=list[AuditLogResponse], summary="List & Filter Audit Logs")
async def list_audit_logs(
    module: str | None = Query(None),
    action: str | None = Query(None),
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


@router.get("/feed", response_model=list[ActivityFeedItem], summary="Get Human-Readable Activity Feed")
async def get_activity_feed(
    module: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    # Query audit logs with user info
    stmt = select(AuditLog, User.full_name, User.avatar_url).outerjoin(User, AuditLog.user_id == User.id)
    if not current_user.is_super_admin:
        if not current_user.tenant_id:
            raise HTTPException(status_code=400, detail="Tenant context required")
        stmt = stmt.where(AuditLog.tenant_id == current_user.tenant_id)

    if module:
        stmt = stmt.where(AuditLog.module == module)

    stmt = stmt.order_by(AuditLog.created_at.desc()).limit(limit)
    results = db.execute(stmt).all()

    feed_items = []
    for log, full_name, avatar_url in results:
        email = log.user_email or "system@hisob.in"
        display_name = full_name or (email.split('@')[0].replace('.', ' ').title() if email else "System Event")
        story_action = _format_story(log.action, log.module, log.record_label or "", log.notes)
        full_story = f"{display_name} {story_action}"

        feed_items.append(
            ActivityFeedItem(
                id=log.id,
                user_name=display_name,
                user_email=email,
                user_avatar=avatar_url,
                story=full_story,
                action=log.action,
                module=log.module,
                created_at=log.created_at,
                time_ago=_format_time_ago(log.created_at),
            )
        )

    return feed_items
