"""
Cash Settlement model — Collector → Treasurer → Settled → CashBook workflow.
"""
import enum
import uuid
from datetime import date
from datetime import datetime

from sqlalchemy import Date
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import Index
from sqlalchemy import Integer
from sqlalchemy import Numeric
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import SoftDeleteMixin
from app.models.base import TenantMixin
from app.models.base import TimestampMixin
from app.models.base import UUIDMixin


class SettlementStatus(enum.StrEnum):
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


class ExpenseStatus(enum.StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    PAID = "paid"
    REJECTED = "rejected"


class Expense(Base, UUIDMixin, TimestampMixin, TenantMixin, SoftDeleteMixin):
    __tablename__ = "expenses"
    __table_args__ = (
        Index("idx_expenses_tenant_status", "tenant_id", "status"),
        Index("idx_expenses_tenant_status_date", "tenant_id", "status", "expense_date"),
    )

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

    status: Mapped[ExpenseStatus] = mapped_column(String(20), default=ExpenseStatus.PENDING)
    approved_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text)

    # Relationships
    festival: Mapped["Festival"] = relationship("Festival", back_populates="expenses")

    def __repr__(self) -> str:
        return f"<Expense {self.expense_number}>"


class OnlineSettlement(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "online_settlements"

    settlement_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)  # Net payout deposited to bank
    fees: Mapped[float] = mapped_column(Numeric(15, 2), default=0.0)       # Razorpay gateway fees
    tax: Mapped[float] = mapped_column(Numeric(15, 2), default=0.0)        # GST on gateway fees
    utr: Mapped[str | None] = mapped_column(String(100))                   # Bank UTR number
    status: Mapped[str] = mapped_column(String(50), default="processed")   # processed / partially_processed
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expense_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("expenses.id"), nullable=True)

    def __repr__(self) -> str:
        return f"<OnlineSettlement {self.settlement_id}>"
