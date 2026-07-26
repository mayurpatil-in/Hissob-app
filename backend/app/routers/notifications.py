"""
Notifications Router — In-app real-time notification API.
"""
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.auth.deps import get_current_active_user
from app.models.user import User
from app.models.notification import Notification

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationResponse(BaseModel):
    id: UUID
    title: str
    message: str
    notification_type: str
    related_module: Optional[str] = None
    related_id: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationCountResponse(BaseModel):
    unread_count: int
    notifications: List[NotificationResponse]


@router.get("", response_model=NotificationCountResponse, summary="Get Notifications")
async def get_notifications(
    limit: int = 20,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get recent notifications for the current user."""
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )

    unread_count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)
        .count()
    )

    return NotificationCountResponse(
        unread_count=unread_count,
        notifications=notifications,
    )


@router.post("/{notification_id}/read", response_model=NotificationResponse, summary="Mark Notification as Read")
async def mark_notification_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    notif = db.get(Notification, notification_id)
    if not notif or notif.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.is_read = True
    notif.read_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(notif)
    return notif


@router.post("/read-all", summary="Mark All Notifications as Read")
async def mark_all_read(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({"is_read": True, "read_at": datetime.now(timezone.utc)})
    db.commit()
    return {"message": "All notifications marked as read"}
