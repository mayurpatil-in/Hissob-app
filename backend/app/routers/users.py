"""
Users Router — Manage tenant users, trustees, treasurers, collectors, and volunteers.
"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_
from pydantic import BaseModel, EmailStr
from app.core.database import get_db
from app.auth.deps import get_current_active_user
from app.core.security import hash_password
from app.models.user import User
from app.models.tenant import Tenant
from app.models.rbac import Role
from app.services.email_service import send_user_welcome_email

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
    slug: Optional[str] = None
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


def get_or_create_role(db: Session, tenant_id: Optional[UUID], role_name: str) -> Optional[Role]:
    if not role_name:
        return None
    
    clean_name = role_name.strip()
    clean_slug = clean_name.lower().replace(" ", "_")

    # Match tenant role or system role case-insensitively
    stmt = select(Role).where(
        or_(
            func.lower(Role.slug) == clean_slug,
            func.lower(Role.name) == clean_name.lower(),
            func.lower(Role.name) == clean_slug
        )
    )
    
    if tenant_id:
        stmt = stmt.where(or_(Role.tenant_id == tenant_id, Role.tenant_id == None))
    
    role = db.scalars(stmt).first()

    if not role and tenant_id:
        # Create role if it doesn't exist yet for this tenant
        role = Role(
            tenant_id=tenant_id,
            name=clean_slug.upper(),
            slug=clean_slug,
            description=f"{clean_name} role",
            is_system=False,
            is_active=True
        )
        db.add(role)
        db.commit()
        db.refresh(role)

    return role


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
    background_tasks: BackgroundTasks,
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

    # Assign role
    if payload.role_name:
        role = get_or_create_role(db, current_user.tenant_id, payload.role_name)
        if role and role not in new_user.roles:
            new_user.roles.append(role)
            db.commit()
            db.refresh(new_user)

    # Send Welcome Email in background
    tenant = db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id)).scalar_one_or_none() if current_user.tenant_id else None
    org_name = tenant.name if tenant else "Hisob ERP"
    background_tasks.add_task(
        send_user_welcome_email,
        to_email=new_user.email,
        user_name=new_user.full_name,
        org_name=org_name,
        role_name=payload.role_name or "Member",
        initial_password=payload.password,
        db=None,
        tenant_id=current_user.tenant_id,
    )

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

    if payload.role_name:
        role = get_or_create_role(db, current_user.tenant_id or user.tenant_id, payload.role_name)
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
