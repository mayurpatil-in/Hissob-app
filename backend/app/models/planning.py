"""
Planning models — Tasks, Category Budget Allocations, Volunteer Shifts, and Event Schedules for Festivals.
"""
import enum
import uuid
from datetime import date
from datetime import datetime

from sqlalchemy import Date
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import Numeric
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import TenantMixin
from app.models.base import TimestampMixin
from app.models.base import UUIDMixin


class TaskPriority(enum.StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskStatus(enum.StrEnum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ShiftStatus(enum.StrEnum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class EventType(enum.StrEnum):
    AARTI = "aarti"
    POOJA = "pooja"
    CULTURAL = "cultural"
    BLOOD_DONATION = "blood_donation"
    ANNOUTSAV = "annoutsav"
    OTHER = "other"


class FestivalTask(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "festival_tasks"

    festival_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("festivals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(250), nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="General", index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[TaskPriority] = mapped_column(String(20), default=TaskPriority.MEDIUM)
    status: Mapped[TaskStatus] = mapped_column(String(20), default=TaskStatus.TODO, index=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    assigned_to_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    assigned_to = relationship("User", foreign_keys=[assigned_to_user_id])


class FestivalBudgetAllocation(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "festival_budget_allocations"

    festival_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("festivals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category_name: Mapped[str] = mapped_column(String(150), nullable=False)
    allocated_amount: Mapped[float] = mapped_column(Numeric(15, 2), default=0.0, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class VolunteerShift(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "volunteer_shifts"

    festival_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("festivals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    shift_name: Mapped[str] = mapped_column(String(200), nullable=False)
    duty_zone: Mapped[str] = mapped_column(String(100), default="Main Stage")
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    assigned_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[ShiftStatus] = mapped_column(String(20), default=ShiftStatus.SCHEDULED)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    assigned_user = relationship("User", foreign_keys=[assigned_user_id])


class FestivalEventSchedule(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "festival_event_schedules"

    festival_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("festivals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(250), nullable=False)
    event_type: Mapped[EventType] = mapped_column(String(30), default=EventType.AARTI)
    event_date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[str | None] = mapped_column(String(20), nullable=True)
    end_time: Mapped[str | None] = mapped_column(String(20), nullable=True)
    yajman_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
