"""
Repositories for Receipts and Cash Settlements.
"""
from typing import Optional, List
from uuid import UUID
from datetime import date
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func, and_
from app.models.receipt import Receipt, ReceiptStatus, PaymentMode
from app.models.finance import CashSettlement, SettlementStatus
from app.repositories.base import BaseRepository


class ReceiptRepository(BaseRepository[Receipt]):
    def __init__(self, db: Session):
        super().__init__(Receipt, db)

    def generate_receipt_number(self, tenant_id: UUID, fy_name: str = "2025-26") -> str:
        count = self.count_by_tenant(tenant_id) + 1
        prefix = fy_name.replace("-", "")
        return f"RC-{prefix}-{count:06d}"

    def get_by_tenant(
        self,
        tenant_id: UUID,
        collector_id: Optional[UUID] = None,
        fy_id: Optional[UUID] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Receipt]:
        stmt = (
            select(Receipt)
            .options(joinedload(Receipt.donor))
            .where(Receipt.tenant_id == tenant_id)
        )
        if collector_id:
            stmt = stmt.where(Receipt.collector_id == collector_id)
        if fy_id:
            stmt = stmt.where(Receipt.financial_year_id == fy_id)
        if status:
            stmt = stmt.where(Receipt.status == status)

        stmt = stmt.order_by(Receipt.created_at.desc()).offset(skip).limit(limit)
        return list(self.db.execute(stmt).scalars().all())

    def get_unsettled_for_collector(self, tenant_id: UUID, collector_id: UUID) -> List[Receipt]:
        stmt = (
            select(Receipt)
            .where(
                Receipt.tenant_id == tenant_id,
                Receipt.collector_id == collector_id,
                Receipt.payment_mode == PaymentMode.CASH,
                Receipt.status.in_([ReceiptStatus.ISSUED, ReceiptStatus.PENDING_SETTLEMENT]),
            )
            .order_by(Receipt.receipt_date.asc())
        )
        return list(self.db.execute(stmt).scalars().all())


class CashSettlementRepository(BaseRepository[CashSettlement]):
    def __init__(self, db: Session):
        super().__init__(CashSettlement, db)

    def generate_settlement_number(self, tenant_id: UUID) -> str:
        count = self.count_by_tenant(tenant_id) + 1
        return f"SETTL-{count:06d}"

    def get_by_tenant(
        self,
        tenant_id: UUID,
        status: Optional[str] = None,
        collector_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[CashSettlement]:
        stmt = select(CashSettlement).where(CashSettlement.tenant_id == tenant_id)
        if status:
            stmt = stmt.where(CashSettlement.status == status)
        if collector_id:
            stmt = stmt.where(CashSettlement.collector_id == collector_id)

        stmt = stmt.order_by(CashSettlement.created_at.desc()).offset(skip).limit(limit)
        return list(self.db.execute(stmt).scalars().all())
