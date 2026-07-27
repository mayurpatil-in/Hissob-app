"""
Tenant (Organization) model — top-level multi-tenant isolation entity.
"""
import uuid
import enum
from sqlalchemy import String, Boolean, Text, Enum as SAEnum, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class TenantStatus(str, enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    TRIAL = "trial"
    CANCELLED = "cancelled"


class Tenant(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "tenants"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    address: Mapped[str | None] = mapped_column(Text)
    city: Mapped[str | None] = mapped_column(String(100))
    state: Mapped[str | None] = mapped_column(String(100))
    country: Mapped[str] = mapped_column(String(100), default="India")
    pincode: Mapped[str | None] = mapped_column(String(20))
    logo_url: Mapped[str | None] = mapped_column(String(500))
    qr_code_url: Mapped[str | None] = mapped_column(String(500))
    upi_id: Mapped[str | None] = mapped_column(String(100))
    website: Mapped[str | None] = mapped_column(String(255))
    gstin: Mapped[str | None] = mapped_column(String(20))
    pan: Mapped[str | None] = mapped_column(String(20))
    registration_number: Mapped[str | None] = mapped_column(String(100))

    # Subscription
    plan_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    status: Mapped[TenantStatus] = mapped_column(
        SAEnum(TenantStatus), default=TenantStatus.TRIAL, nullable=False
    )
    storage_limit_mb: Mapped[int] = mapped_column(Integer, default=500)
    max_users: Mapped[int] = mapped_column(Integer, default=10)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Settings
    timezone: Mapped[str] = mapped_column(String(50), default="Asia/Kolkata")
    currency: Mapped[str] = mapped_column(String(10), default="INR")
    fiscal_year_start_month: Mapped[int] = mapped_column(Integer, default=4)  # April

    # Relationships
    users: Mapped[list["User"]] = relationship("User", back_populates="tenant")
    financial_years: Mapped[list["FinancialYear"]] = relationship(
        "FinancialYear", back_populates="tenant"
    )

    def __repr__(self) -> str:
        return f"<Tenant {self.name}>"
