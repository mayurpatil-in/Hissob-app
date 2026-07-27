"""
Organizations / Tenants Router — Super Admin & Org Admin profile management.
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.deps import get_current_active_user, get_super_admin
from app.core.security import hash_password
from app.permissions.rbac import require
from app.models.user import User
from app.models.tenant import Tenant, TenantStatus
from app.models.rbac import Role
from app.repositories.financial import TenantRepository
from app.repositories.user import UserRepository
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantResponse

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.get("", response_model=List[TenantResponse], summary="List Organizations (Super Admin)")
async def list_organizations(
    current_user: User = Depends(get_super_admin),
    db: Session = Depends(get_db),
):
    repo = TenantRepository(db)
    return repo.get_all()


@router.post("", response_model=TenantResponse, status_code=status.HTTP_201_CREATED, summary="Create Organization (Super Admin)")
async def create_organization(
    payload: TenantCreate,
    current_user: User = Depends(get_super_admin),
    db: Session = Depends(get_db),
):
    tenant_repo = TenantRepository(db)
    user_repo = UserRepository(db)

    if tenant_repo.get_by_slug(payload.slug):
        raise HTTPException(status_code=400, detail="Organization slug already taken")

    if user_repo.email_exists(payload.admin_email):
        raise HTTPException(status_code=400, detail="Admin email already in use")

    # Create tenant
    tenant = Tenant(
        name=payload.name,
        slug=payload.slug,
        email=payload.email,
        phone=payload.phone,
        address=payload.address,
        city=payload.city,
        state=payload.state,
        country=payload.country,
        pincode=payload.pincode,
        gstin=payload.gstin,
        pan=payload.pan,
        storage_limit_mb=payload.storage_limit_mb,
        max_users=payload.max_users,
        status=TenantStatus.ACTIVE,
    )
    created_tenant = tenant_repo.create(tenant)

    # Find org_admin role
    org_admin_role = db.query(Role).filter_by(slug="org_admin", tenant_id=None).first()

    # Create Org Admin User
    admin_user = User(
        tenant_id=created_tenant.id,
        email=payload.admin_email,
        full_name=payload.admin_name,
        hashed_password=hash_password(payload.admin_password),
        is_super_admin=False,
        is_active=True,
        email_verified=True,
    )
    if org_admin_role:
        admin_user.roles.append(org_admin_role)

    user_repo.create(admin_user)
    return created_tenant


@router.get("/my-org", response_model=TenantResponse, summary="Get Current User's Organization Profile")
async def get_my_organization(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    repo = TenantRepository(db)
    tenant_id = current_user.tenant_id

    if not tenant_id and current_user.is_super_admin:
        # Fallback to first tenant for Super Admins for testing/global defaults
        first_tenant = db.query(Tenant).first()
        if first_tenant:
            tenant_id = first_tenant.id

    if not tenant_id:
        raise HTTPException(status_code=404, detail="No organization linked to user")
        
    tenant = repo.get(tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Organization not found")
    return tenant


@router.put("/my-org", response_model=TenantResponse, summary="Update Current Organization Profile")
async def update_my_organization(
    payload: TenantUpdate,
    current_user: User = Depends(require("settings", "update")),
    db: Session = Depends(get_db),
):
    repo = TenantRepository(db)
    tenant_id = current_user.tenant_id

    if not tenant_id and current_user.is_super_admin:
        first_tenant = db.query(Tenant).first()
        if first_tenant:
            tenant_id = first_tenant.id

    if not tenant_id:
        raise HTTPException(status_code=404, detail="No organization linked to user")

    tenant = repo.get(tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Organization not found")

    return repo.update(tenant, payload.model_dump(exclude_unset=True))


@router.put("/{org_id}", response_model=TenantResponse, summary="Update Organization (Super Admin)")
async def update_organization(
    org_id: UUID,
    payload: TenantUpdate,
    current_user: User = Depends(get_super_admin),
    db: Session = Depends(get_db),
):
    repo = TenantRepository(db)
    tenant = repo.get(org_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Organization not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] is not None:
        tenant.is_active = (update_data["status"] == TenantStatus.ACTIVE)

    return repo.update(tenant, update_data)
