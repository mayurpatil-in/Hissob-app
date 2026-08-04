"""
Repositories for Donor and Area modules.
"""
from uuid import UUID

from sqlalchemy import or_
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload

from app.models.donor import Area
from app.models.donor import Donor
from app.models.tenant import Tenant
from app.repositories.base import BaseRepository


class AreaRepository(BaseRepository[Area]):
    def __init__(self, db: Session):
        super().__init__(Area, db)

    def get_active_by_tenant(self, tenant_id: UUID) -> list[Area]:
        stmt = (
            select(Area)
            .where(Area.tenant_id == tenant_id, Area.is_active)
            .order_by(Area.name.asc())
        )
        return list(self.db.execute(stmt).scalars().all())


class DonorRepository(BaseRepository[Donor]):
    def __init__(self, db: Session):
        super().__init__(Donor, db)

    def search_donors(
        self, tenant_id: UUID, query: str = None, area_id: UUID = None, skip: int = 0, limit: int = 100
    ) -> list[Donor]:
        stmt = (
            select(Donor)
            .options(joinedload(Donor.area))
            .where(Donor.tenant_id == tenant_id, Donor.is_active == True, Donor.is_deleted == False)
        )
        if query:
            q = f"%{query.strip()}%"
            stmt = stmt.where(
                or_(
                    Donor.full_name.ilike(q),
                    Donor.phone.ilike(q),
                    Donor.donor_number.ilike(q),
                )
            )
        if area_id:
            stmt = stmt.where(Donor.area_id == area_id)

        stmt = stmt.order_by(Donor.full_name.asc()).offset(skip).limit(limit)
        return list(self.db.execute(stmt).scalars().all())

    def generate_donor_number(self, tenant_id: UUID) -> str:
        tenant = self.db.query(Tenant).filter(Tenant.id == tenant_id).first()
        prefix = (tenant.slug[:4].upper() if tenant and tenant.slug else "ORG")
        count = self.count_by_tenant(tenant_id) + 1
        return f"DNR-{prefix}-{count:05d}"
