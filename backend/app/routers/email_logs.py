"""
Email Logs & Diagnostic SMTP Test Router.
"""
from typing import Any
from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.email_log import EmailLog
from app.models.user import User
from app.permissions.rbac import require
from app.services.email_service import send_raw_email
from app.services.email_service import send_test_smtp_email

router = APIRouter(prefix="/email-logs", tags=["Email Logs & SMTP Diagnostics"])


class TestSmtpRequest(BaseModel):
    target_email: str | None = None


class EmailLogOut(BaseModel):
    id: UUID
    tenant_id: UUID | None = None
    recipient: str
    subject: str
    email_type: str
    status: str
    error_message: str | None = None
    metadata_json: dict[str, Any] | None = None
    sent_at: Any

    model_config = {"from_attributes": True}


@router.post("/test-smtp", summary="Run Diagnostic SMTP Test Email")
async def test_smtp_connection(
    payload: TestSmtpRequest | None = None,
    current_user: User = Depends(require("settings", "update")),
    db: Session = Depends(get_db),
):
    """
    Tests SMTP connection and dispatches a diagnostic test email to the user or specified recipient.
    """
    target = (payload and payload.target_email) or current_user.email
    if not target or "@" not in target:
        raise HTTPException(status_code=400, detail="Invalid target recipient email address")

    return send_test_smtp_email(to_email=target, db=db, tenant_id=current_user.tenant_id)


@router.get("", response_model=list[EmailLogOut], summary="Get Email Dispatch Logs")
async def list_email_logs(
    email_type: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require("audit", "view")),
    db: Session = Depends(get_db),
):
    """Fetches recent email dispatch history and status logs for current tenant."""
    query = db.query(EmailLog)
    if not current_user.is_super_admin:
        if not current_user.tenant_id:
            return []
        query = query.filter(EmailLog.tenant_id == current_user.tenant_id)

    if email_type:
        query = query.filter(EmailLog.email_type == email_type)
    if status_filter:
        query = query.filter(EmailLog.status == status_filter)

    return query.order_by(EmailLog.sent_at.desc()).limit(limit).all()


@router.post("/{log_id}/resend", summary="Resend Failed or Selected Email Log Entry")
async def resend_email_log(
    log_id: UUID,
    current_user: User = Depends(require("settings", "update")),
    db: Session = Depends(get_db),
):
    """Attempts to resend an email from a historical EmailLog record."""
    log_entry = db.get(EmailLog, log_id)
    if not log_entry:
        raise HTTPException(status_code=404, detail="Email log entry not found")

    if not current_user.is_super_admin and log_entry.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this email log")

    # Re-dispatch
    success = send_raw_email(
        to_email=log_entry.recipient,
        subject=f"[Resend] {log_entry.subject}",
        html_content=f"<p>Resent email dispatch via Hisob ERP Admin.</p><h4>Original Subject: {log_entry.subject}</h4>",
        text_content=f"Resent email dispatch: {log_entry.subject}",
        db=db,
        tenant_id=log_entry.tenant_id,
        email_type=log_entry.email_type,
        metadata_json={"resent_from_log_id": str(log_entry.id)},
    )

    if success:
        return {"status": "success", "message": f"Successfully resent email to {log_entry.recipient}"}
    else:
        return {"status": "failed", "message": f"Failed to resend email to {log_entry.recipient}"}
