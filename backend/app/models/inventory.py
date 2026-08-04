"""
Mandal Equipment & Physical Asset Inventory Models.
"""
import enum
import uuid
from datetime import date
from datetime import datetime

from sqlalchemy import Boolean
from sqlalchemy import Date
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import Integer
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


class AssetCondition(enum.StrEnum):
    NEW = "new"
    GOOD = "good"
    FAIR = "fair"
    DAMAGED = "damaged"
    UNDER_REPAIR = "under_repair"


class CheckoutAction(enum.StrEnum):
    CHECKOUT = "checkout"
    RETURN = "return"
    MAINTENANCE = "maintenance"
    DAMAGE_REPORT = "damage_report"


class CheckoutStatus(enum.StrEnum):
    ISSUED = "issued"
    RETURNED = "returned"
    OVERDUE = "overdue"
    DAMAGED = "damaged"
    LOST = "lost"


class AssetCategory(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "asset_categories"

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    code: Mapped[str | None] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    assets: Mapped[list["Asset"]] = relationship("Asset", back_populates="category", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<AssetCategory {self.name}>"


class Asset(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "assets"

    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("asset_categories.id"), nullable=False, index=True
    )
    festival_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("festivals.id"), nullable=True, index=True
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    asset_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    quantity_total: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    quantity_available: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit: Mapped[str] = mapped_column(String(30), default="Pcs", nullable=False)
    condition: Mapped[AssetCondition] = mapped_column(String(20), default=AssetCondition.GOOD)
    storage_location: Mapped[str | None] = mapped_column(String(200))
    estimated_value: Mapped[float] = mapped_column(Numeric(15, 2), default=0.0)
    purchase_date: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    category: Mapped["AssetCategory"] = relationship("AssetCategory", back_populates="assets")
    festival: Mapped["Festival | None"] = relationship("Festival")
    checkouts: Mapped[list["AssetCheckout"]] = relationship("AssetCheckout", back_populates="asset", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Asset {self.name} [{self.asset_code}]>"


class AssetCheckout(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "asset_checkouts"

    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False, index=True
    )
    action_type: Mapped[CheckoutAction] = mapped_column(String(30), default=CheckoutAction.CHECKOUT)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    issued_to_person: Mapped[str] = mapped_column(String(200), nullable=False)
    issued_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expected_return_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    returned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    returned_condition: Mapped[AssetCondition | None] = mapped_column(String(20))
    damage_notes: Mapped[str | None] = mapped_column(Text)
    damage_charge: Mapped[float] = mapped_column(Numeric(15, 2), default=0.0)
    status: Mapped[CheckoutStatus] = mapped_column(String(20), default=CheckoutStatus.ISSUED)

    # Relationships
    asset: Mapped["Asset"] = relationship("Asset", back_populates="checkouts")
    issued_by: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return f"<AssetCheckout {self.asset_id} to {self.issued_to_person}>"
