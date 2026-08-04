"""
User Invitations Router — Onboarding Team Members, Trustees, Treasurers & Volunteers.
"""
import contextlib
import secrets
from datetime import UTC
from datetime import datetime
from datetime import timedelta
from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query
from fastapi import status
from sqlalchemy import or_
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.deps import get_current_active_user
from app.auth.jwt import create_access_token
from app.auth.jwt import create_refresh_token
from app.core.database import get_db
from app.core.security import hash_password
from app.models.rbac import Role
from app.models.tenant import Tenant
from app.models.user import User
from app.models.user import UserStatus
from app.models.user_invitation import InvitationStatus
from app.models.user_invitation import UserInvitation
from app.schemas.invitation import BulkUserInviteSchema
from app.schemas.invitation import PublicVerifyInviteSchema
from app.schemas.invitation import UserInviteAcceptSchema
from app.schemas.invitation import UserInviteCreateSchema
from app.schemas.invitation import UserInviteOutSchema
from app.services.email_service import send_user_invitation_email

router = APIRouter(prefix="/invitations", tags=["User Invitations"])


def _format_invite_out(invite: UserInvitation, tenant_name: str) -> UserInviteOutSchema:
    out = UserInviteOutSchema.from_orm(invite)
    out.shareable_url = f"https://hisob.in/accept-invite?token={invite.token}"

    # Generate direct WhatsApp message link
    msg = f"Hello! You've been invited to join {tenant_name} as {invite.role_name} on Hisob ERP. Complete your setup here: {out.shareable_url}"
    from urllib.parse import quote
    out.whatsapp_link = f"https://wa.me/?text={quote(msg)}"
    return out


@router.post("/send", response_model=UserInviteOutSchema)
def send_user_invitation(
    data: UserInviteCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Invite a new team member or volunteer to join current tenant."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Super Admin must switch to tenant context")

    # Check if user with email already exists
    existing_user = db.execute(select(User).where(User.email == data.email.lower())).scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email '{data.email}' is already registered in the system.",
        )

    # Check if active pending invite already exists
    existing_invite = db.execute(
        select(UserInvitation).where(
            UserInvitation.tenant_id == current_user.tenant_id,
            UserInvitation.email == data.email.lower(),
            UserInvitation.status == InvitationStatus.PENDING,
        )
    ).scalar_one_or_none()

    if existing_invite:
        # Check if expired, if so mark expired
        if existing_invite.expires_at < datetime.now(UTC):
            existing_invite.status = InvitationStatus.EXPIRED
            db.commit()
        else:
            raise HTTPException(
                status_code=400,
                detail=f"A pending invitation already exists for '{data.email}'. Use resend feature.",
            )

    tenant = db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id)).scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Find role
    role = db.execute(
        select(Role).where(
            or_(
                Role.tenant_id == current_user.tenant_id,
                Role.is_system,
                Role.tenant_id is None,
            ),
            Role.slug == data.role_name.lower(),
        )
    ).scalar_one_or_none()

    # Generate secure token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(UTC) + timedelta(days=data.expires_in_days or 7)

    invite = UserInvitation(
        tenant_id=current_user.tenant_id,
        email=data.email.lower(),
        phone=data.phone,
        full_name=data.full_name,
        role_id=role.id if role else None,
        role_name=data.role_name.lower(),
        token=token,
        invited_by_id=current_user.id,
        status=InvitationStatus.PENDING,
        expires_at=expires_at,
        custom_note=data.custom_note,
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)

    # Send Email
    invite_url = f"https://hisob.in/accept-invite?token={token}"
    expires_str = expires_at.strftime("%d %b %Y, %I:%M %p")
    try:
        send_user_invitation_email(
            to_email=data.email.lower(),
            org_name=tenant.name,
            role_name=data.role_name,
            invite_url=invite_url,
            expires_at_str=expires_str,
            custom_note=data.custom_note,
            inviter_name=current_user.full_name,
            logo_url=tenant.logo_url,
            db=db,
            tenant_id=tenant.id,
        )
    except Exception:
        pass  # Email sending error captured in log, invite record still saved

    return _format_invite_out(invite, tenant.name)


@router.post("/bulk", response_model=list[UserInviteOutSchema])
def bulk_send_user_invitations(
    data: BulkUserInviteSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Bulk send invitations (e.g. for committee or volunteer lists)."""
    results = []
    for item in data.invitations:
        try:
            invite = send_user_invitation(data=item, db=db, current_user=current_user)
            results.append(invite)
        except Exception:
            continue
    return results


@router.get("", response_model=list[UserInviteOutSchema])
def list_user_invitations(
    status_filter: InvitationStatus | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all user invitations for current tenant."""
    if not current_user.tenant_id:
        return []

    stmt = select(UserInvitation).where(UserInvitation.tenant_id == current_user.tenant_id)
    if status_filter:
        stmt = stmt.where(UserInvitation.status == status_filter)

    stmt = stmt.order_by(UserInvitation.created_at.desc())
    invites = db.execute(stmt).scalars().all()

    tenant = db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id)).scalar_one_or_none()
    tenant_name = tenant.name if tenant else "Hisob Organization"

    # Check for expired ones dynamically
    now = datetime.now(UTC)
    updated = False
    for inv in invites:
        if inv.status == InvitationStatus.PENDING and inv.expires_at < now:
            inv.status = InvitationStatus.EXPIRED
            updated = True
    if updated:
        db.commit()

    return [_format_invite_out(inv, tenant_name) for inv in invites]


@router.post("/{invite_id}/resend", response_model=UserInviteOutSchema)
def resend_user_invitation(
    invite_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Resend invitation with refreshed expiration."""
    invite = db.execute(
        select(UserInvitation).where(
            UserInvitation.id == invite_id,
            UserInvitation.tenant_id == current_user.tenant_id,
        )
    ).scalar_one_or_none()

    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")

    tenant = db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id)).scalar_one_or_none()

    # Refresh expiration and token
    invite.expires_at = datetime.now(UTC) + timedelta(days=7)
    invite.status = InvitationStatus.PENDING
    invite.token = secrets.token_urlsafe(32)
    db.commit()

    invite_url = f"https://hisob.in/accept-invite?token={invite.token}"
    expires_str = invite.expires_at.strftime("%d %b %Y, %I:%M %p")
    with contextlib.suppress(Exception):
        send_user_invitation_email(
            to_email=invite.email,
            org_name=tenant.name,
            role_name=invite.role_name,
            invite_url=invite_url,
            expires_at_str=expires_str,
            custom_note=invite.custom_note,
            inviter_name=current_user.full_name,
            logo_url=tenant.logo_url,
            db=db,
            tenant_id=tenant.id,
        )

    return _format_invite_out(invite, tenant.name if tenant else "Hisob")


@router.post("/{invite_id}/revoke", response_model=UserInviteOutSchema)
def revoke_user_invitation(
    invite_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Revoke a pending invitation."""
    invite = db.execute(
        select(UserInvitation).where(
            UserInvitation.id == invite_id,
            UserInvitation.tenant_id == current_user.tenant_id,
        )
    ).scalar_one_or_none()

    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")

    invite.status = InvitationStatus.REVOKED
    db.commit()

    tenant = db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id)).scalar_one_or_none()
    return _format_invite_out(invite, tenant.name if tenant else "Hisob")


# --- PUBLIC UNAUTHENTICATED ENDPOINTS ---

@router.get("/public/verify/{token}", response_model=PublicVerifyInviteSchema)
def verify_invite_token(token: str, db: Session = Depends(get_db)):
    """Public check for invitation link validity."""
    invite = db.execute(
        select(UserInvitation).where(UserInvitation.token == token)
    ).scalar_one_or_none()

    if not invite:
        return PublicVerifyInviteSchema(valid=False, error="Invalid or missing invitation token.")

    if invite.status == InvitationStatus.ACCEPTED:
        return PublicVerifyInviteSchema(valid=False, error="This invitation has already been accepted.")

    if invite.status == InvitationStatus.REVOKED:
        return PublicVerifyInviteSchema(valid=False, error="This invitation has been revoked by the organization admin.")

    if invite.expires_at < datetime.now(UTC):
        invite.status = InvitationStatus.EXPIRED
        db.commit()
        return PublicVerifyInviteSchema(valid=False, error="This invitation link has expired. Please request a new invite.")

    tenant = db.execute(select(Tenant).where(Tenant.id == invite.tenant_id)).scalar_one_or_none()

    return PublicVerifyInviteSchema(
        valid=True,
        email=invite.email,
        full_name=invite.full_name,
        org_name=tenant.name if tenant else "Hisob ERP",
        logo_url=tenant.logo_url if tenant else None,
        role_name=invite.role_name,
        custom_note=invite.custom_note,
        expires_at=invite.expires_at,
    )


@router.post("/public/accept")
def accept_user_invitation(data: UserInviteAcceptSchema, db: Session = Depends(get_db)):
    """Public endpoint: Complete account setup using invite token."""
    invite = db.execute(
        select(UserInvitation).where(UserInvitation.token == data.token)
    ).scalar_one_or_none()

    if not invite or invite.status != InvitationStatus.PENDING:
        raise HTTPException(status_code=400, detail="Invalid or expired invitation token.")

    if invite.expires_at < datetime.now(UTC):
        invite.status = InvitationStatus.EXPIRED
        db.commit()
        raise HTTPException(status_code=400, detail="This invitation link has expired.")

    # Double check if user already registered
    existing_user = db.execute(select(User).where(User.email == invite.email.lower())).scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=400, detail="Account already registered for this email address.")

    # Find role
    role = None
    if invite.role_id:
        role = db.execute(select(Role).where(Role.id == invite.role_id)).scalar_one_or_none()
    if not role:
        role = db.execute(
            select(Role).where(
                or_(
                    Role.tenant_id == invite.tenant_id,
                    Role.is_system,
                    Role.tenant_id is None,
                ),
                Role.slug == invite.role_name.lower(),
            )
        ).scalar_one_or_none()

    # Create new User
    new_user = User(
        tenant_id=invite.tenant_id,
        email=invite.email.lower(),
        phone=data.phone or invite.phone,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        is_active=True,
        status=UserStatus.ACTIVE,
        email_verified=True,
    )
    if role:
        new_user.roles.append(role)

    db.add(new_user)

    # Mark invite accepted
    invite.status = InvitationStatus.ACCEPTED
    invite.accepted_at = datetime.now(UTC)

    db.commit()
    db.refresh(new_user)

    # Automatically issue access and refresh tokens
    access_token = create_access_token(data={"sub": str(new_user.id), "tenant_id": str(new_user.tenant_id)})
    refresh_token = create_refresh_token(data={"sub": str(new_user.id)})

    return {
        "message": "Account successfully created and invitation accepted!",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": str(new_user.id),
            "email": new_user.email,
            "full_name": new_user.full_name,
            "tenant_id": str(new_user.tenant_id),
            "role_name": invite.role_name,
        },
    }
