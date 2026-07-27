"""
Festival model — links to financial year.
"""
import uuid
import enum
from datetime import date
from sqlalchemy import String, Boolean, ForeignKey, Date, Text, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin, TenantMixin


class FestivalStatus(str, enum.Enum):
    PLANNING = "planning"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Festival(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "festivals"

    financial_year_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("financial_years.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    deity: Mapped[str | None] = mapped_column(String(100))
    location: Mapped[str | None] = mapped_column(String(300))
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[FestivalStatus] = mapped_column(String(20), default=FestivalStatus.PLANNING)
    budget: Mapped[float] = mapped_column(Numeric(15, 2), default=0.0)
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    financial_year: Mapped["FinancialYear"] = relationship("FinancialYear", back_populates="festivals")
    receipts: Mapped[list["Receipt"]] = relationship("Receipt", back_populates="festival")
    expenses: Mapped[list["Expense"]] = relationship("Expense", back_populates="festival")

    def __repr__(self) -> str:
        return f"<Festival {self.name}>"

    @property
    def collected(self) -> float:
        # Avoid circular import at module level
        from app.models.receipt import ReceiptStatus
        return sum(
            float(r.amount) 
            for r in self.receipts 
            if r.status != ReceiptStatus.CANCELLED
        )
