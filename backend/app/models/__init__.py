"""
Models package — import all models so Alembic can detect them.
"""
from app.models.base import UUIDMixin, TimestampMixin, TenantMixin
from app.models.tenant import Tenant, TenantStatus
from app.models.rbac import Role, Permission, PermissionAction, role_permissions, user_roles
from app.models.user import User, UserStatus, RefreshToken
from app.models.financial_year import FinancialYear, FYStatus
from app.models.festival import Festival, FestivalStatus
from app.models.donor import Donor, Area
from app.models.receipt import Receipt, ReceiptStatus, PaymentMode
from app.models.finance import CashSettlement, SettlementStatus, Expense, OnlineSettlement
from app.models.audit import AuditLog
from app.models.notification import Notification
from app.models.email_log import EmailLog
from app.models.inventory import (
    AssetCategory, Asset, AssetCheckout,
    AssetCondition, CheckoutAction, CheckoutStatus
)
from app.models.planning import (
    FestivalTask, TaskPriority, TaskStatus,
    FestivalBudgetAllocation,
    VolunteerShift, ShiftStatus,
    FestivalEventSchedule, EventType
)
from app.models.user_invitation import UserInvitation, InvitationStatus
from app.models.event_invitation import EventInvitation, RsvpStatus

__all__ = [
    "UUIDMixin", "TimestampMixin", "TenantMixin",
    "Tenant", "TenantStatus",
    "Role", "Permission", "PermissionAction", "role_permissions", "user_roles",
    "User", "UserStatus", "RefreshToken",
    "FinancialYear", "FYStatus",
    "Festival", "FestivalStatus",
    "Donor", "Area",
    "Receipt", "ReceiptStatus", "PaymentMode",
    "CashSettlement", "SettlementStatus", "Expense", "OnlineSettlement",
    "AuditLog",
    "Notification",
    "EmailLog",
    "AssetCategory", "Asset", "AssetCheckout",
    "AssetCondition", "CheckoutAction", "CheckoutStatus",
    "FestivalTask", "TaskPriority", "TaskStatus",
    "FestivalBudgetAllocation",
    "VolunteerShift", "ShiftStatus",
    "FestivalEventSchedule", "EventType",
    "UserInvitation", "InvitationStatus",
    "EventInvitation", "RsvpStatus",
]



