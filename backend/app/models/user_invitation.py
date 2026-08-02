"""
User Invitation Model for tenant user onboarding.
"""
import uuid
import enum
from datetime import datetime
from sqlalchemy import String, ForeignKey, Text, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class InvitationStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    REVOKED = "revoked"


class UserInvitation(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "user_invitations"

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    full_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    
    role_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="SET NULL"),
        nullable=True,
    )
    role_name: Mapped[str] = mapped_column(String(100), default="collector", nullable=False)
    
    token: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    
    invited_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    
    status: Mapped[InvitationStatus] = mapped_column(
        SAEnum(InvitationStatus), default=InvitationStatus.PENDING, nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    custom_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    tenant = relationship("Tenant")
    role = relationship("Role")
    invited_by = relationship("User")

    def __repr__(self) -> str:
        return f"<UserInvitation {self.email} ({self.status.value})>"
