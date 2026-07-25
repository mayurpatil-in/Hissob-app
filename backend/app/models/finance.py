"""
Cash Settlement model — Collector → Treasurer → Settled → CashBook workflow.
"""
import uuid
import enum
from datetime import date, datetime
from sqlalchemy import String, ForeignKey, Date, Text, Numeric, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin, TenantMixin


class SettlementStatus(str, enum.Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    VERIFIED = "verified"
    APPROVED = "approved"
    REJECTED = "rejected"


class CashSettlement(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "cash_settlements"

    financial_year_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("financial_years.id"), nullable=False
    )
    festival_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    collector_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    settlement_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    settlement_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_amount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    receipt_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[SettlementStatus] = mapped_column(String(20), default=SettlementStatus.PENDING)

    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    notes: Mapped[str | None] = mapped_column(Text)
    rejection_reason: Mapped[str | None] = mapped_column(Text)

    def __repr__(self) -> str:
        return f"<CashSettlement {self.settlement_number}>"


class Expense(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "expenses"

    financial_year_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("financial_years.id"), nullable=False
    )
    festival_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("festivals.id"), nullable=True
    )
    requested_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    expense_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    expense_date: Mapped[date] = mapped_column(Date, nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    vendor_name: Mapped[str | None] = mapped_column(String(200))
    amount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    voucher_number: Mapped[str | None] = mapped_column(String(50))
    bill_url: Mapped[str | None] = mapped_column(String(500))

    status: Mapped[str] = mapped_column(String(20), default="pending")
    approved_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text)

    # Relationships
    festival: Mapped["Festival"] = relationship("Festival", back_populates="expenses")

    def __repr__(self) -> str:
        return f"<Expense {self.expense_number}>"
