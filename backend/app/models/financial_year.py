"""
Financial Year model — manages fiscal year lifecycle.
"""
import enum
import uuid
from datetime import date

from sqlalchemy import Boolean
from sqlalchemy import Date
from sqlalchemy import ForeignKey
from sqlalchemy import Numeric
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import TimestampMixin
from app.models.base import UUIDMixin


class FYStatus(enum.StrEnum):
    OPEN = "open"
    ACTIVE = "active"
    CLOSED = "closed"
    LOCKED = "locked"


class FinancialYear(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "financial_years"

    # Explicit FK — required so Tenant.financial_years relationship can resolve its join
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. "2025-26"
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[FYStatus] = mapped_column(String(20), default=FYStatus.OPEN, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)

    opening_balance: Mapped[float] = mapped_column(Numeric(15, 2), default=0.0)
    closing_balance: Mapped[float] = mapped_column(Numeric(15, 2), default=0.0)
    carry_forward_amount: Mapped[float] = mapped_column(Numeric(15, 2), default=0.0)

    notes: Mapped[str | None] = mapped_column(Text)

    # Who locked/closed
    closed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    locked_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="financial_years")
    festivals: Mapped[list["Festival"]] = relationship("Festival", back_populates="financial_year")

    def __repr__(self) -> str:
        return f"<FinancialYear {self.name}>"
