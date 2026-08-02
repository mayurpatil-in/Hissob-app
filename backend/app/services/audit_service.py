import logging
import uuid
from typing import Optional, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from app.models.user import User

logger = logging.getLogger(__name__)

def log_audit_event(
    db: Session,
    user: User,
    module: str,
    action: str,
    record_label: str,
    record_id: Optional[str] = None,
    old_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
    notes: Optional[str] = None,
    ip_address: Optional[str] = "127.0.0.1"
):
    try:
        log = AuditLog(
            tenant_id=user.tenant_id,
            user_id=user.id,
            user_email=user.email,
            module=module,
            action=action,
            record_id=str(record_id) if record_id else None,
            record_label=record_label,
            old_values=old_values,
            new_values=new_values,
            notes=notes,
            ip_address=ip_address,
            created_at=datetime.now(timezone.utc),
        )
        db.add(log)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to log audit event (%s:%s)", module, action)
