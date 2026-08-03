"""
Receipt model — core financial collection document.
"""
import uuid
import enum
from datetime import date
from sqlalchemy import String, Boolean, ForeignKey, Date, Text, Numeric, Integer, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin, TenantMixin, SoftDeleteMixin


class PaymentMode(str, enum.Enum):
    CASH = "cash"
    UPI = "upi"
    CHEQUE = "cheque"
    DD = "dd"
    NEFT = "neft"
    RTGS = "rtgs"
    OTHER = "other"


class ReceiptStatus(str, enum.Enum):
    DRAFT = "draft"
    ISSUED = "issued"
    PENDING_SETTLEMENT = "pending_settlement"
    SETTLED = "settled"
    CANCELLED = "cancelled"


class Receipt(Base, UUIDMixin, TimestampMixin, TenantMixin, SoftDeleteMixin):
    __tablename__ = "receipts"
    __table_args__ = (
        UniqueConstraint("tenant_id", "receipt_number", name="uq_receipts_tenant_receipt_number"),
        Index("idx_receipts_tenant_status", "tenant_id", "status"),
        Index("idx_receipts_tenant_date", "tenant_id", "receipt_date"),
        Index("idx_receipts_tenant_status_date", "tenant_id", "status", "receipt_date"),
        Index("idx_receipts_tenant_mode_status", "tenant_id", "payment_mode", "status"),
    )

    # References
    financial_year_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("financial_years.id"), nullable=False, index=True
    )
    festival_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("festivals.id"), nullable=True
    )
    donor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("donors.id"), nullable=False, index=True
    )
    collector_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    # Receipt details
    receipt_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    receipt_date: Mapped[date] = mapped_column(Date, nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    payment_mode: Mapped[PaymentMode] = mapped_column(String(20), nullable=False)
    status: Mapped[ReceiptStatus] = mapped_column(String(30), default=ReceiptStatus.ISSUED)

    # Payment instrument
    cheque_number: Mapped[str | None] = mapped_column(String(50))
    cheque_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    bank_name: Mapped[str | None] = mapped_column(String(200))
    upi_reference: Mapped[str | None] = mapped_column(String(100))
    transaction_ref: Mapped[str | None] = mapped_column(String(100))

    # Notes
    purpose: Mapped[str | None] = mapped_column(String(500))
    notes: Mapped[str | None] = mapped_column(Text)

    # Cancel
    cancel_reason: Mapped[str | None] = mapped_column(Text)
    cancelled_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    # Settlement
    settlement_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cash_settlements.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    donor: Mapped["Donor"] = relationship("Donor", back_populates="receipts")
    festival: Mapped["Festival"] = relationship("Festival", back_populates="receipts")

    def __repr__(self) -> str:
        return f"<Receipt {self.receipt_number}>"
