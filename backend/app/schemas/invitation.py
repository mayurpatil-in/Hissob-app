"""
Invitation Pydantic Schemas.
"""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel
from pydantic import EmailStr
from pydantic import Field

from app.models.event_invitation import RsvpStatus
from app.models.user_invitation import InvitationStatus


# --- User Invitations ---
class UserInviteCreateSchema(BaseModel):
    email: EmailStr
    full_name: str | None = None
    phone: str | None = None
    role_name: str = "collector"
    custom_note: str | None = None
    expires_in_days: int = 7


class BulkUserInviteSchema(BaseModel):
    invitations: list[UserInviteCreateSchema]


class UserInviteAcceptSchema(BaseModel):
    token: str
    full_name: str
    password: str
    phone: str | None = None


class UserInviteOutSchema(BaseModel):
    id: UUID
    tenant_id: UUID
    email: str
    full_name: str | None = None
    phone: str | None = None
    role_name: str
    token: str
    status: InvitationStatus
    expires_at: datetime
    accepted_at: datetime | None = None
    custom_note: str | None = None
    created_at: datetime
    shareable_url: str | None = None
    whatsapp_link: str | None = None

    model_config = {"from_attributes": True}


class PublicVerifyInviteSchema(BaseModel):
    valid: bool
    email: str | None = None
    full_name: str | None = None
    org_name: str | None = None
    logo_url: str | None = None
    role_name: str | None = None
    custom_note: str | None = None
    expires_at: datetime | None = None
    error: str | None = None


# --- Digital Event Patrika Cards & RSVP ---
class EventInviteCreateSchema(BaseModel):
    festival_id: UUID | None = None
    title: str = Field(..., description="e.g. Ganesh Utsav 2026 Mahaprasad Invitation")
    guest_name: str
    guest_email: EmailStr | None = None
    guest_phone: str | None = None
    vip_tier: str = "General Patron"
    mahaprasad_menu: str | None = None
    timing_slots: str | None = None
    chief_guests: str | None = None


class BulkEventInviteSchema(BaseModel):
    festival_id: UUID | None = None
    title: str
    guests: list[dict]  # list of { guest_name, guest_email, guest_phone, vip_tier }


class EventRsvpSubmitSchema(BaseModel):
    rsvp_status: RsvpStatus
    guests_count: int = 1
    special_requests: str | None = None
    donation_pledge_amount: float | None = None


class EventInviteOutSchema(BaseModel):
    id: UUID
    tenant_id: UUID
    festival_id: UUID | None = None
    title: str
    guest_name: str
    guest_email: str | None = None
    guest_phone: str | None = None
    vip_tier: str
    mahaprasad_menu: str | None = None
    timing_slots: str | None = None
    chief_guests: str | None = None
    token: str
    rsvp_status: RsvpStatus
    guests_count: int
    special_requests: str | None = None
    checked_in: bool
    checked_in_at: datetime | None = None
    qr_code_url: str | None = None
    created_at: datetime
    rsvp_url: str | None = None

    model_config = {"from_attributes": True}
