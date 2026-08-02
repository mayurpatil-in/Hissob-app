"""
Repositories for FinancialYear and Festival modules.
"""
from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select, update
from app.models.financial_year import FinancialYear, FYStatus
from app.models.festival import Festival
from app.models.tenant import Tenant
from app.repositories.base import BaseRepository


class TenantRepository(BaseRepository[Tenant]):
    def __init__(self, db: Session):
        super().__init__(Tenant, db)

    def get_by_slug(self, slug: str) -> Optional[Tenant]:
        stmt = select(Tenant).where(Tenant.slug == slug.lower().strip())
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_email(self, email: str) -> Optional[Tenant]:
        stmt = select(Tenant).where(Tenant.email == email.lower().strip())
        return self.db.execute(stmt).scalar_one_or_none()


class FinancialYearRepository(BaseRepository[FinancialYear]):
    def __init__(self, db: Session):
        super().__init__(FinancialYear, db)

    def get_current(self, tenant_id: UUID) -> Optional[FinancialYear]:
        stmt = select(FinancialYear).where(
            FinancialYear.tenant_id == tenant_id,
            FinancialYear.is_current == True,
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def set_current(self, tenant_id: UUID, fy_id: UUID) -> Optional[FinancialYear]:
        # Unset all current FY for tenant
        self.db.execute(
            update(FinancialYear)
            .where(FinancialYear.tenant_id == tenant_id)
            .values(is_current=False)
        )
        # Set target as current
        fy = self.get(fy_id)
        if fy and fy.tenant_id == tenant_id:
            fy.is_current = True
            fy.status = FYStatus.ACTIVE
            self.db.commit()
            self.db.refresh(fy)
            return fy
        self.db.commit()
        return None

    def get_by_tenant(self, tenant_id: UUID, skip: int = 0, limit: int = 100) -> List[FinancialYear]:
        stmt = (
            select(FinancialYear)
            .where(FinancialYear.tenant_id == tenant_id)
            .order_by(FinancialYear.start_date.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().all())


class FestivalRepository(BaseRepository[Festival]):
    def __init__(self, db: Session):
        super().__init__(Festival, db)

    def get_by_financial_year(self, tenant_id: UUID, fy_id: UUID) -> List[Festival]:
        stmt = (
            select(Festival)
            .where(
                Festival.tenant_id == tenant_id,
                Festival.financial_year_id == fy_id,
                Festival.is_active == True,
            )
            .order_by(Festival.start_date.asc())
        )
        return list(self.db.execute(stmt).scalars().all())
