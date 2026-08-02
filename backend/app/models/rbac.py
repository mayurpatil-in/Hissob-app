"""
Role & Permission models — Dynamic RBAC engine.
"""
import uuid
import enum
from sqlalchemy import String, Boolean, ForeignKey, Table, Column, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from app.models.base import UUIDMixin, TimestampMixin


class PermissionAction(str, enum.Enum):
    VIEW = "view"
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    APPROVE = "approve"
    CANCEL = "cancel"
    PRINT = "print"
    EXPORT = "export"


# Association table: role ↔ permission
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", UUID(as_uuid=True), ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)

# Association table: user ↔ role
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)


class Role(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "roles"

    tenant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )  # NULL = system role
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    permissions: Mapped[list["Permission"]] = relationship(
        "Permission", secondary=role_permissions, back_populates="roles"
    )
    users: Mapped[list["User"]] = relationship(
        "User", secondary=user_roles, back_populates="roles"
    )


class Permission(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "permissions"

    module: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    action: Mapped[PermissionAction] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    roles: Mapped[list["Role"]] = relationship(
        "Role", secondary=role_permissions, back_populates="permissions"
    )

    def __repr__(self) -> str:
        return f"<Permission {self.module}:{self.action}>"
