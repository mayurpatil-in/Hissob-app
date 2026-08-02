"""
Invitation Pydantic Schemas.
"""
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field
from app.models.user_invitation import InvitationStatus
from app.models.event_invitation import RsvpStatus


# --- User Invitations ---
class UserInviteCreateSchema(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role_name: str = "collector"
    custom_note: Optional[str] = None
    expires_in_days: int = 7


class BulkUserInviteSchema(BaseModel):
    invitations: List[UserInviteCreateSchema]


class UserInviteAcceptSchema(BaseModel):
    token: str
    full_name: str
    password: str
    phone: Optional[str] = None


class UserInviteOutSchema(BaseModel):
    id: UUID
    tenant_id: UUID
    email: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role_name: str
    token: str
    status: InvitationStatus
    expires_at: datetime
    accepted_at: Optional[datetime] = None
    custom_note: Optional[str] = None
    created_at: datetime
    shareable_url: Optional[str] = None
    whatsapp_link: Optional[str] = None

    class Config:
        from_attributes = True


class PublicVerifyInviteSchema(BaseModel):
    valid: bool
    email: Optional[str] = None
    full_name: Optional[str] = None
    org_name: Optional[str] = None
    logo_url: Optional[str] = None
    role_name: Optional[str] = None
    custom_note: Optional[str] = None
    expires_at: Optional[datetime] = None
    error: Optional[str] = None


# --- Digital Event Patrika Cards & RSVP ---
class EventInviteCreateSchema(BaseModel):
    festival_id: Optional[UUID] = None
    title: str = Field(..., description="e.g. Ganesh Utsav 2026 Mahaprasad Invitation")
    guest_name: str
    guest_email: Optional[EmailStr] = None
    guest_phone: Optional[str] = None
    vip_tier: str = "General Patron"
    mahaprasad_menu: Optional[str] = None
    timing_slots: Optional[str] = None
    chief_guests: Optional[str] = None


class BulkEventInviteSchema(BaseModel):
    festival_id: Optional[UUID] = None
    title: str
    guests: List[dict]  # list of { guest_name, guest_email, guest_phone, vip_tier }


class EventRsvpSubmitSchema(BaseModel):
    rsvp_status: RsvpStatus
    guests_count: int = 1
    special_requests: Optional[str] = None
    donation_pledge_amount: Optional[float] = None


class EventInviteOutSchema(BaseModel):
    id: UUID
    tenant_id: UUID
    festival_id: Optional[UUID] = None
    title: str
    guest_name: str
    guest_email: Optional[str] = None
    guest_phone: Optional[str] = None
    vip_tier: str
    mahaprasad_menu: Optional[str] = None
    timing_slots: Optional[str] = None
    chief_guests: Optional[str] = None
    token: str
    rsvp_status: RsvpStatus
    guests_count: int
    special_requests: Optional[str] = None
    checked_in: bool
    checked_in_at: Optional[datetime] = None
    qr_code_url: Optional[str] = None
    created_at: datetime
    rsvp_url: Optional[str] = None

    class Config:
        from_attributes = True
