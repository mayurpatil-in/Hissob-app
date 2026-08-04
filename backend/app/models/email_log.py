"""
Email Log Model — Track all transactional and report email dispatches.
"""
import uuid
from datetime import UTC
from datetime import datetime

from sqlalchemy import JSON
from sqlalchemy import DateTime
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin
from app.models.base import UUIDMixin


class EmailLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "email_logs"

    tenant_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    recipient: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    email_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # RECEIPT, WELCOME, DAILY_DIGEST, REPORT, TEST
    status: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # SENT, FAILED
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<EmailLog {self.email_type} to {self.recipient} [{self.status}]>"
