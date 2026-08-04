"""
Audit Log model — every mutation is recorded.
"""
import uuid
from datetime import datetime

from sqlalchemy import JSON
from sqlalchemy import DateTime
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column

from app.core.database import Base
from app.models.base import UUIDMixin


class AuditLog(Base, UUIDMixin):
    __tablename__ = "audit_logs"

    tenant_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    user_email: Mapped[str | None] = mapped_column(String(255))

    # What happened
    action: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # create/update/delete/login etc.
    module: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    record_id: Mapped[str | None] = mapped_column(String(100))
    record_label: Mapped[str | None] = mapped_column(String(500))

    # Context
    ip_address: Mapped[str | None] = mapped_column(String(50))
    user_agent: Mapped[str | None] = mapped_column(String(500))

    # Data diff
    old_values: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    new_values: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Meta
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    def __repr__(self) -> str:
        return f"<AuditLog {self.module}:{self.action}>"
