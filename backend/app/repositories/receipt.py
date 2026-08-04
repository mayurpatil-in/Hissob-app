"""
Repositories for Receipts and Cash Settlements.
"""
from uuid import UUID

from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload

from app.models.finance import CashSettlement
from app.models.receipt import PaymentMode
from app.models.receipt import Receipt
from app.models.receipt import ReceiptStatus
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
        collector_id: UUID | None = None,
        donor_id: UUID | None = None,
        fy_id: UUID | None = None,
        status: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Receipt]:
        stmt = (
            select(Receipt)
            .options(joinedload(Receipt.donor))
            .where(Receipt.tenant_id == tenant_id, Receipt.is_deleted == False)
        )
        if collector_id:
            stmt = stmt.where(Receipt.collector_id == collector_id)
        if donor_id:
            stmt = stmt.where(Receipt.donor_id == donor_id)
        if fy_id:
            stmt = stmt.where(Receipt.financial_year_id == fy_id)
        if status:
            stmt = stmt.where(Receipt.status == status)

        stmt = stmt.order_by(Receipt.created_at.desc()).offset(skip).limit(limit)
        return list(self.db.execute(stmt).scalars().all())

    def get_unsettled_for_collector(self, tenant_id: UUID, collector_id: UUID) -> list[Receipt]:
        stmt = (
            select(Receipt)
            .where(
                Receipt.tenant_id == tenant_id,
                Receipt.collector_id == collector_id,
                Receipt.payment_mode == PaymentMode.CASH,
                Receipt.status.in_([ReceiptStatus.ISSUED, ReceiptStatus.PENDING_SETTLEMENT]),
                Receipt.is_deleted == False,
            )
            .order_by(Receipt.receipt_date.asc())
        )
        return list(self.db.execute(stmt).scalars().all())


class CashSettlementRepository(BaseRepository[CashSettlement]):
    def __init__(self, db: Session):
        super().__init__(CashSettlement, db)

    def generate_settlement_number(self, tenant_id: UUID) -> str:
        total_count = self.db.query(func.count(CashSettlement.id)).scalar() or 0
        num = total_count + 1
        candidate = f"SETTL-{num:06d}"
        while self.db.query(CashSettlement.id).filter(CashSettlement.settlement_number == candidate).first():
            num += 1
            candidate = f"SETTL-{num:06d}"
        return candidate

    def get_by_tenant(
        self,
        tenant_id: UUID,
        status: str | None = None,
        collector_id: UUID | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[CashSettlement]:
        stmt = select(CashSettlement).where(CashSettlement.tenant_id == tenant_id)
        if status:
            stmt = stmt.where(CashSettlement.status == status)
        if collector_id:
            stmt = stmt.where(CashSettlement.collector_id == collector_id)

        stmt = stmt.order_by(CashSettlement.created_at.desc()).offset(skip).limit(limit)
        return list(self.db.execute(stmt).scalars().all())
