"""
Users Router — Manage tenant users, trustees, treasurers, collectors, and volunteers.
"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from app.core.database import get_db
from app.auth.deps import get_current_active_user
from app.core.security import hash_password
from app.models.user import User
from app.models.rbac import Role

router = APIRouter(prefix="/users", tags=["Users Management"])


class UserCreateSchema(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    role_name: Optional[str] = "collector"


class UserUpdateSchema(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    role_name: Optional[str] = None


class RoleOutSchema(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class UserOutSchema(BaseModel):
    id: UUID
    full_name: str
    email: str
    phone: Optional[str] = None
    is_active: bool
    is_super_admin: bool
    tenant_id: Optional[UUID] = None
    roles: List[RoleOutSchema] = []

    class Config:
        from_attributes = True


@router.get("", response_model=List[UserOutSchema], summary="List Organization Users")
def list_users(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    stmt = select(User)
    if not current_user.is_super_admin and current_user.tenant_id:
        stmt = stmt.where(User.tenant_id == current_user.tenant_id)
    
    users = db.scalars(stmt).all()
    return users


@router.post("", response_model=UserOutSchema, status_code=status.HTTP_201_CREATED, summary="Create New User")
def create_user(
    payload: UserCreateSchema,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    # Check email duplicate
    existing = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    new_user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        phone=payload.phone,
        tenant_id=current_user.tenant_id,
        is_active=True,
        is_super_admin=False,
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Assign role if specified
    if payload.role_name and current_user.tenant_id:
        role = db.execute(select(Role).where(Role.tenant_id == current_user.tenant_id, Role.name == payload.role_name)).scalar_one_or_none()
        if role:
            new_user.roles.append(role)
            db.commit()

    return new_user


@router.put("/{user_id}", response_model=UserOutSchema, summary="Update Organization User")
def update_user(
    user_id: UUID,
    payload: UserUpdateSchema,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not current_user.is_super_admin and user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Permission denied")

    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.email is not None:
        user.email = payload.email
    if payload.phone is not None:
        user.phone = payload.phone
    if payload.is_active is not None:
        user.is_active = payload.is_active

    if payload.role_name and current_user.tenant_id:
        role = db.execute(select(Role).where(Role.tenant_id == current_user.tenant_id, Role.name == payload.role_name)).scalar_one_or_none()
        if role:
            user.roles = [role]

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete User")
def delete_user(
    user_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not current_user.is_super_admin and user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Permission denied")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own active account")

    db.delete(user)
    db.commit()
    return None
