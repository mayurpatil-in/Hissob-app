"""
Compatibility Alias Module.
Maps `app.models.expense` imports to `app.models.finance` to ensure backward compatibility
across production server cron scripts and legacy imports.
"""
from app.models.finance import Expense
from app.models.finance import ExpenseCategory
from app.models.finance import ExpenseStatus
from app.models.finance import Vendor

__all__ = ["Expense", "ExpenseCategory", "ExpenseStatus", "Vendor"]
