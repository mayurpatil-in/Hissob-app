"""
Generic repository — provides base CRUD for all models.
"""
from typing import TypeVar, Generic, Type, Optional, List, Any
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.core.database import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType], db: Session):
        self.model = model
        self.db = db

    def get(self, id: UUID) -> Optional[ModelType]:
        return self.db.get(self.model, id)

    def get_all(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        stmt = select(self.model).offset(skip).limit(limit)
        return list(self.db.execute(stmt).scalars().all())

    def get_by_tenant(
        self, tenant_id: UUID, skip: int = 0, limit: int = 100
    ) -> List[ModelType]:
        stmt = (
            select(self.model)
            .where(self.model.tenant_id == tenant_id)
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().all())

    def count_by_tenant(self, tenant_id: UUID) -> int:
        stmt = select(func.count()).select_from(self.model).where(
            self.model.tenant_id == tenant_id
        )
        return self.db.execute(stmt).scalar_one()

    def create(self, obj: ModelType) -> ModelType:
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def update(self, obj: ModelType, data: dict) -> ModelType:
        for key, value in data.items():
            if hasattr(obj, key):
                setattr(obj, key, value)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def delete(self, obj: ModelType) -> None:
        self.db.delete(obj)
        self.db.commit()

    def soft_delete(self, obj: ModelType) -> ModelType:
        obj.is_active = False
        self.db.commit()
        self.db.refresh(obj)
        return obj
