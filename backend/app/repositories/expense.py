"""
Expense Repository.
"""
from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.finance import Expense
from app.repositories.base import BaseRepository


class ExpenseRepository(BaseRepository[Expense]):
    def __init__(self, db: Session):
        super().__init__(Expense, db)

    def generate_expense_number(self, tenant_id: UUID) -> str:
        count = self.count_by_tenant(tenant_id) + 1
        return f"EXP-{count:06d}"

    def get_by_tenant(
        self,
        tenant_id: UUID,
        status: Optional[str] = None,
        fy_id: Optional[UUID] = None,
        category: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Expense]:
        stmt = select(Expense).where(Expense.tenant_id == tenant_id)
        if status:
            stmt = stmt.where(Expense.status == status)
        if fy_id:
            stmt = stmt.where(Expense.financial_year_id == fy_id)
        if category:
            stmt = stmt.where(Expense.category == category)

        stmt = stmt.order_by(Expense.created_at.desc()).offset(skip).limit(limit)
        return list(self.db.execute(stmt).scalars().all())
