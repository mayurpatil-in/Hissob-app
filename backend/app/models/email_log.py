"""
Email Log Model — Track all transactional and report email dispatches.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from app.models.base import UUIDMixin


class EmailLog(Base, UUIDMixin):
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
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True
    )

    def __repr__(self) -> str:
        return f"<EmailLog {self.email_type} to {self.recipient} [{self.status}]>"
