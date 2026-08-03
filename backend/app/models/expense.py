"""
Compatibility Alias Module.
Maps `app.models.expense` imports to `app.models.finance` to ensure backward compatibility
across production server cron scripts and legacy imports.
"""
from app.models.finance import Expense, ExpenseCategory, ExpenseStatus, Vendor

__all__ = ["Expense", "ExpenseCategory", "ExpenseStatus", "Vendor"]
