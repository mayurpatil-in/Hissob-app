"""
Base mixin for all models — provides common audit columns.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class UUIDMixin:
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False
    )


class TenantMixin:
    """Row-level multi-tenancy mixin."""
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)


class SoftDeleteMixin:
    """Soft delete mixin — marks records as deleted without destroying financial audit history."""
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="false", index=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

