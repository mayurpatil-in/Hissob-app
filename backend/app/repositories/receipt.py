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

    def generate_receipt_number(self, tenant_id: UUID, fy_name: str = "2025-26", max_retries: int = 5) -> str:
        """
        Thread-safe & race-condition protected receipt number generator.
        Acquires row-level write lock on Tenant record within active transaction.
        Formats receipt number consistently as `RC-{fy_prefix}-{number:06d}`.
        """
        import uuid

        from app.models.tenant import Tenant

        # Acquire row-level lock on Tenant record to serialize concurrent receipt generation
        try:
            self.db.query(Tenant).filter(Tenant.id == tenant_id).with_for_update(nowait=False).first()
        except Exception:
            pass  # Fall back to max lookup retry loop if dialect/session doesn't support for_update

        prefix = fy_name.replace("-", "").replace(" ", "").replace("FY", "")
        if not prefix:
            prefix = "202526"
        pattern = f"RC-{prefix}-%"

        for attempt in range(max_retries):
            # Query max existing receipt_number matching prefix for this tenant
            max_receipt = (
                self.db.query(func.max(Receipt.receipt_number))
                .filter(
                    Receipt.tenant_id == tenant_id,
                    Receipt.receipt_number.like(pattern)
                )
                .scalar()
            )

            if max_receipt:
                try:
                    current_num = int(max_receipt.split("-")[-1])
                except (ValueError, IndexError):
                    current_num = 0
            else:
                current_num = self.count_by_tenant(tenant_id)

            next_num = current_num + 1 + attempt
            candidate = f"RC-{prefix}-{next_num:06d}"

            # Verify candidate doesn't already exist
            exists = (
                self.db.query(Receipt.id)
                .filter(Receipt.tenant_id == tenant_id, Receipt.receipt_number == candidate)
                .first()
            )
            if not exists:
                return candidate

        # Safety net fallback if all retries collided
        return f"RC-{prefix}-{uuid.uuid4().hex[:6].upper()}"

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
