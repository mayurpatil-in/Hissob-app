import logging
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.user import User

logger = logging.getLogger(__name__)


def create_notification(
    db: Session,
    user_id: UUID,
    title: str,
    message: str,
    notification_type: str = "info",
    related_module: str | None = None,
    related_id: str | None = None,
    tenant_id: UUID | None = None,
) -> None:
    """Create a notification for a specific user. Logs errors without blocking flow."""
    try:
        notif = Notification(
            user_id=user_id,
            tenant_id=tenant_id,
            title=title,
            message=message,
            notification_type=notification_type,
            related_module=related_module,
            related_id=related_id,
        )
        db.add(notif)
        db.flush()  # don't commit — let the caller commit
    except Exception:
        logger.exception("Failed to create notification for user %s", user_id)


def notify_role(
    db: Session,
    tenant_id: UUID,
    role_slug: str,
    title: str,
    message: str,
    notification_type: str = "info",
    related_module: str | None = None,
    related_id: str | None = None,
    exclude_user_id: UUID | None = None,
) -> None:
    """Send a notification to all users with a specific role in the tenant."""
    try:
        from sqlalchemy import select

        from app.models.rbac import Role
        from app.models.rbac import user_roles

        # Find all users with the given role in this tenant
        role = db.execute(
            select(Role).where(Role.slug == role_slug)
        ).scalar_one_or_none()

        if not role:
            return

        # Get users with this role
        user_ids_query = db.execute(
            select(user_roles.c.user_id).where(user_roles.c.role_id == role.id)
        ).fetchall()

        for (uid,) in user_ids_query:
            if exclude_user_id and uid == exclude_user_id:
                continue
            # Only notify users of this tenant
            user = db.get(User, uid)
            if user and (user.tenant_id == tenant_id or user.is_super_admin):
                create_notification(
                    db=db,
                    user_id=uid,
                    title=title,
                    message=message,
                    notification_type=notification_type,
                    related_module=related_module,
                    related_id=related_id,
                    tenant_id=tenant_id,
                )
    except Exception:
        logger.exception("Failed to notify role %s for tenant %s", role_slug, tenant_id)
