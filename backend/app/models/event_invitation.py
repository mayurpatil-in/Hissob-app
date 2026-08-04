"""
Event Invitation Model for Digital Event Patrika Cards & VIP RSVP Tracking.
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean
from sqlalchemy import DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import TimestampMixin
from app.models.base import UUIDMixin


class RsvpStatus(enum.StrEnum):
    PENDING = "pending"
    ATTENDING = "attending"
    DECLINED = "declined"
    MAYBE = "maybe"


class EventInvitation(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "event_invitations"

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    festival_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("festivals.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    guest_name: Mapped[str] = mapped_column(String(200), nullable=False)
    guest_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    guest_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    vip_tier: Mapped[str] = mapped_column(String(50), default="General Patron", nullable=False)

    token: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)

    rsvp_status: Mapped[RsvpStatus] = mapped_column(
        SAEnum(RsvpStatus), default=RsvpStatus.PENDING, nullable=False
    )
    guests_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    special_requests: Mapped[str | None] = mapped_column(Text, nullable=True)

    checked_in: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    checked_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    qr_code_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Mahaprasad & Custom Patrika Details
    mahaprasad_menu: Mapped[str | None] = mapped_column(String(500), nullable=True)
    timing_slots: Mapped[str | None] = mapped_column(String(300), nullable=True)
    chief_guests: Mapped[str | None] = mapped_column(String(300), nullable=True)

    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    tenant = relationship("Tenant")
    festival = relationship("Festival")
    created_by = relationship("User")

    def __repr__(self) -> str:
        return f"<EventInvitation {self.guest_name} ({self.rsvp_status.value})>"
