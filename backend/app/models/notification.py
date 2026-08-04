"""
Notification model — In-app notification system for settlement, expense, and system events.
"""
import uuid
from datetime import UTC
from datetime import datetime

from sqlalchemy import Boolean
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Content
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)

    # Categorization
    notification_type = Column(String(50), nullable=False, default="info")
    # Types: info | success | warning | error | settlement | expense | receipt | system
    related_module = Column(String(50), nullable=True)  # settlements, expenses, receipts
    related_id = Column(String(100), nullable=True)     # UUID of the related record

    # State
    is_read = Column(Boolean, default=False, nullable=False, index=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
