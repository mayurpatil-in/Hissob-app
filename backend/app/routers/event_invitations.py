"""
Event Invitations Router — Digital Patrika Cards & VIP Guest RSVP Tracker.
"""
import contextlib
import secrets
from datetime import UTC
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.deps import get_current_active_user
from app.core.database import get_db
from app.models.event_invitation import EventInvitation
from app.models.event_invitation import RsvpStatus
from app.models.festival import Festival
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.invitation import BulkEventInviteSchema
from app.schemas.invitation import EventInviteCreateSchema
from app.schemas.invitation import EventInviteOutSchema
from app.schemas.invitation import EventRsvpSubmitSchema
from app.services.email_service import send_digital_patrika_email

router = APIRouter(prefix="/events/invitations", tags=["Digital Event Patrika & RSVP"])


def _format_event_invite_out(invite: EventInvitation, tenant_name: str) -> EventInviteOutSchema:
    out = EventInviteOutSchema.from_orm(invite)
    out.rsvp_url = f"https://hisob.in/rsvp?token={invite.token}"
    return out


@router.post("", response_model=EventInviteOutSchema)
def create_event_invitation(
    data: EventInviteCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a Digital Patrika / Event Invitation for a VIP guest or donor."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Super Admin must select a tenant")

    tenant = db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id)).scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    token = secrets.token_urlsafe(24)

    invite = EventInvitation(
        tenant_id=current_user.tenant_id,
        festival_id=data.festival_id,
        title=data.title,
        guest_name=data.guest_name,
        guest_email=data.guest_email.lower() if data.guest_email else None,
        guest_phone=data.guest_phone,
        vip_tier=data.vip_tier,
        mahaprasad_menu=data.mahaprasad_menu,
        timing_slots=data.timing_slots,
        chief_guests=data.chief_guests,
        token=token,
        rsvp_status=RsvpStatus.PENDING,
        created_by_id=current_user.id,
    )

    db.add(invite)
    db.commit()
    db.refresh(invite)

    # Dispatch email if guest email provided
    rsvp_url = f"https://hisob.in/rsvp?token={token}"
    if data.guest_email:
        with contextlib.suppress(Exception):
            send_digital_patrika_email(
                to_email=data.guest_email.lower(),
                guest_name=data.guest_name,
                event_title=data.title,
                org_name=tenant.name,
                rsvp_url=rsvp_url,
                vip_tier=data.vip_tier,
                db=db,
                tenant_id=tenant.id,
            )

    return _format_event_invite_out(invite, tenant.name)


@router.post("/bulk", response_model=list[EventInviteOutSchema])
def bulk_create_event_invitations(
    data: BulkEventInviteSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Bulk create Digital Patrika Cards for multiple festival guests/donors."""
    results = []
    for g in data.guests:
        schema = EventInviteCreateSchema(
            festival_id=data.festival_id,
            title=data.title,
            guest_name=g.get("guest_name", "Valued Patron"),
            guest_email=g.get("guest_email"),
            guest_phone=g.get("guest_phone"),
            vip_tier=g.get("vip_tier", "General Patron"),
        )
        try:
            res = create_event_invitation(data=schema, db=db, current_user=current_user)
            results.append(res)
        except Exception:
            continue
    return results


@router.get("", response_model=list[EventInviteOutSchema])
def list_event_invitations(
    festival_id: UUID | None = Query(None),
    rsvp_status: RsvpStatus | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List event invitations with filters."""
    if not current_user.tenant_id:
        return []

    stmt = select(EventInvitation).where(EventInvitation.tenant_id == current_user.tenant_id)
    if festival_id:
        stmt = stmt.where(EventInvitation.festival_id == festival_id)
    if rsvp_status:
        stmt = stmt.where(EventInvitation.rsvp_status == rsvp_status)

    stmt = stmt.order_by(EventInvitation.created_at.desc())
    invites = db.execute(stmt).scalars().all()

    tenant = db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id)).scalar_one_or_none()
    tenant_name = tenant.name if tenant else "Hisob Organization"

    return [_format_event_invite_out(inv, tenant_name) for inv in invites]


# --- PUBLIC RSVP ENDPOINTS ---

@router.get("/public/rsvp/{token}")
def get_public_rsvp_info(token: str, db: Session = Depends(get_db)):
    """Public endpoint to fetch Digital Patrika & event details for RSVP view."""
    invite = db.execute(select(EventInvitation).where(EventInvitation.token == token)).scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=404, detail="Digital Patrika invitation card not found.")

    tenant = db.execute(select(Tenant).where(Tenant.id == invite.tenant_id)).scalar_one_or_none()

    festival = None
    if invite.festival_id:
        festival = db.execute(select(Festival).where(Festival.id == invite.festival_id)).scalar_one_or_none()

    return {
        "token": invite.token,
        "title": invite.title,
        "guest_name": invite.guest_name,
        "vip_tier": invite.vip_tier,
        "mahaprasad_menu": invite.mahaprasad_menu,
        "timing_slots": invite.timing_slots,
        "chief_guests": invite.chief_guests,
        "rsvp_status": invite.rsvp_status,
        "guests_count": invite.guests_count,
        "special_requests": invite.special_requests,
        "org_name": tenant.name if tenant else "Organizing Committee",
        "org_logo": tenant.logo_url if tenant else None,
        "org_address": tenant.address if tenant else None,
        "org_phone": tenant.phone if tenant else None,
        "upi_id": tenant.upi_id if tenant else None,
        "tenant_slug": tenant.slug if tenant else None,
        "org_qr": tenant.qr_code_url if tenant else None,
        "festival_name": festival.name if festival else None,
        "festival_dates": f"{festival.start_date.strftime('%d %b %Y')} - {festival.end_date.strftime('%d %b %Y')}" if festival and festival.start_date and festival.end_date else None,
    }


@router.post("/public/rsvp/{token}")
def submit_public_rsvp(token: str, data: EventRsvpSubmitSchema, db: Session = Depends(get_db)):
    """Public endpoint: Submit guest RSVP status."""
    invite = db.execute(select(EventInvitation).where(EventInvitation.token == token)).scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation token invalid or expired.")

    invite.rsvp_status = data.rsvp_status
    invite.guests_count = max(1, data.guests_count)
    if data.special_requests is not None:
        invite.special_requests = data.special_requests

    db.commit()
    db.refresh(invite)

    return {
        "message": f"Thank you! Your RSVP status has been updated to '{invite.rsvp_status.value}'.",
        "rsvp_status": invite.rsvp_status,
        "guests_count": invite.guests_count,
    }


@router.post("/check-in/{token}")
def check_in_guest(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Event Entrance Scanner: Mark guest checked-in upon QR code scan."""
    invite = db.execute(
        select(EventInvitation).where(
            EventInvitation.token == token,
            EventInvitation.tenant_id == current_user.tenant_id,
        )
    ).scalar_one_or_none()

    if not invite:
        raise HTTPException(status_code=404, detail="Guest invitation ticket not found")

    if invite.checked_in:
        return {
            "already_checked_in": True,
            "guest_name": invite.guest_name,
            "vip_tier": invite.vip_tier,
            "checked_in_at": invite.checked_in_at,
            "message": f"⚠️ Guest '{invite.guest_name}' was ALREADY checked in at {invite.checked_in_at.strftime('%H:%M')}.",
        }

    invite.checked_in = True
    invite.checked_in_at = datetime.now(UTC)
    db.commit()

    return {
        "already_checked_in": False,
        "guest_name": invite.guest_name,
        "vip_tier": invite.vip_tier,
        "guests_count": invite.guests_count,
        "checked_in_at": invite.checked_in_at,
        "message": f"✅ Check-in SUCCESS! Welcome {invite.guest_name} ({invite.vip_tier}).",
    }
