"""
Tenant (Organization) model — top-level multi-tenant isolation entity.
"""
import enum
import uuid

from sqlalchemy import Boolean
from sqlalchemy import Enum as SAEnum
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import TimestampMixin
from app.models.base import UUIDMixin


class TenantStatus(enum.StrEnum):
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
    receipt_template: Mapped[str] = mapped_column(String(50), default="modern", server_default="modern")
    allow_permanent_deletion: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    enable_email_receipts: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    enable_daily_digest: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    enable_welcome_email: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    digest_recipients: Mapped[str | None] = mapped_column(Text)
    ai_provider: Mapped[str] = mapped_column(String(50), default="gemini", server_default="gemini")

    # Relationships
    users: Mapped[list["User"]] = relationship("User", back_populates="tenant")
    financial_years: Mapped[list["FinancialYear"]] = relationship(
        "FinancialYear", back_populates="tenant"
    )

    def __repr__(self) -> str:
        return f"<Tenant {self.name}>"
