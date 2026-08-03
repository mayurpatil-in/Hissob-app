"""
Donor & Area models.
"""
import uuid
from sqlalchemy import String, Boolean, ForeignKey, Text, Date, Integer, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin, TenantMixin, SoftDeleteMixin


class Area(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "areas"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str | None] = mapped_column(String(20))
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    donors: Mapped[list["Donor"]] = relationship("Donor", back_populates="area")

    def __repr__(self) -> str:
        return f"<Area {self.name}>"


class Donor(Base, UUIDMixin, TimestampMixin, TenantMixin, SoftDeleteMixin):
    __tablename__ = "donors"
    __table_args__ = (
        Index("idx_donors_tenant_phone", "tenant_id", "phone"),
    )

    area_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("areas.id"), nullable=True
    )

    # Identity
    donor_number: Mapped[str | None] = mapped_column(String(50), index=True)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), index=True)
    email: Mapped[str | None] = mapped_column(String(255))
    address: Mapped[str | None] = mapped_column(Text)
    city: Mapped[str | None] = mapped_column(String(100))
    pincode: Mapped[str | None] = mapped_column(String(10))

    # Business
    pan_number: Mapped[str | None] = mapped_column(String(20))
    is_80g_eligible: Mapped[bool] = mapped_column(Boolean, default=False)
    is_vip: Mapped[bool] = mapped_column(Boolean, default=False)
    total_donations: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    area: Mapped["Area"] = relationship("Area", back_populates="donors")
    receipts: Mapped[list["Receipt"]] = relationship("Receipt", back_populates="donor")

    def __repr__(self) -> str:
        return f"<Donor {self.full_name}>"
