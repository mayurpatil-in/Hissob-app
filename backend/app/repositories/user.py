"""
User repository — auth-specific queries.
"""
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.user import User, RefreshToken
from app.repositories.base import BaseRepository
import hashlib


class UserRepository(BaseRepository[User]):
    def __init__(self, db: Session):
        super().__init__(User, db)

    def get_by_email(self, email: str) -> Optional[User]:
        stmt = select(User).where(User.email == email.lower().strip())
        return self.db.execute(stmt).scalar_one_or_none()

    def get_active_by_tenant(self, tenant_id: UUID) -> list[User]:
        stmt = select(User).where(User.tenant_id == tenant_id, User.is_active == True)
        return list(self.db.execute(stmt).scalars().all())

    def email_exists(self, email: str) -> bool:
        stmt = select(User.id).where(User.email == email.lower().strip())
        return self.db.execute(stmt).scalar_one_or_none() is not None


class RefreshTokenRepository(BaseRepository[RefreshToken]):
    def __init__(self, db: Session):
        super().__init__(RefreshToken, db)

    @staticmethod
    def _hash_token(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    def create_refresh_token(
        self, user_id: UUID, token: str, expires_at, ip_address: str = None, device_info: str = None
    ) -> RefreshToken:
        rt = RefreshToken(
            user_id=user_id,
            token_hash=self._hash_token(token),
            expires_at=expires_at,
            ip_address=ip_address,
            device_info=device_info,
        )
        return self.create(rt)

    def get_by_token(self, token: str) -> Optional[RefreshToken]:
        token_hash = self._hash_token(token)
        stmt = select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.is_revoked == False,
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def revoke(self, token: str) -> None:
        rt = self.get_by_token(token)
        if rt:
            rt.is_revoked = True
            self.db.commit()

    def revoke_all_for_user(self, user_id: UUID) -> None:
        stmt = select(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.is_revoked == False,
        )
        tokens = self.db.execute(stmt).scalars().all()
        for t in tokens:
            t.is_revoked = True
        self.db.commit()
