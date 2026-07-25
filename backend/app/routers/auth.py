"""
Auth router — login, logout, refresh, me.
"""
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.core.security import verify_password
from app.auth.jwt import create_access_token, create_refresh_token, decode_token
from app.auth.deps import get_current_active_user
from app.repositories.user import UserRepository, RefreshTokenRepository
from app.schemas.auth import LoginRequest, LoginResponse, RefreshRequest, TokenResponse, UserInfo
from app.schemas.common import SuccessResponse
from app.permissions.rbac import get_user_permissions
from app.models.user import User
import uuid

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse, summary="User Login")
async def login(
    request: Request,
    payload: LoginRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user_repo = UserRepository(db)
    user = user_repo.get_by_email(payload.email)

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended. Contact administrator.",
        )

    # Create tokens
    access_token = create_access_token(
        data={"sub": str(user.id), "tenant_id": str(user.tenant_id) if user.tenant_id else None}
    )
    refresh_token_str = create_refresh_token(
        data={"sub": str(user.id)}
    )

    # Store refresh token
    rt_repo = RefreshTokenRepository(db)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    rt_repo.create_refresh_token(
        user_id=user.id,
        token=refresh_token_str,
        expires_at=expires_at,
        ip_address=request.client.host if request.client else None,
        device_info=request.headers.get("user-agent"),
    )

    # Update last login in background
    def _update_last_login():
        user.last_login = datetime.now(timezone.utc)
        db.commit()

    background_tasks.add_task(_update_last_login)

    permissions = get_user_permissions(user)

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token_str,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserInfo(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_super_admin=user.is_super_admin,
            tenant_id=user.tenant_id,
            avatar_url=user.avatar_url,
            permissions=permissions,
        ),
    )


@router.post("/refresh", response_model=TokenResponse, summary="Refresh Access Token")
async def refresh_token(
    payload: RefreshRequest,
    db: Session = Depends(get_db),
):
    decoded = decode_token(payload.refresh_token)
    if not decoded or decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    rt_repo = RefreshTokenRepository(db)
    stored = rt_repo.get_by_token(payload.refresh_token)
    if not stored or stored.is_revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked",
        )

    if stored.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired",
        )

    user_repo = UserRepository(db)
    user = user_repo.get(decoded["sub"])
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # Rotate refresh token
    rt_repo.revoke(payload.refresh_token)
    new_access = create_access_token(
        data={"sub": str(user.id), "tenant_id": str(user.tenant_id) if user.tenant_id else None}
    )
    new_refresh = create_refresh_token(data={"sub": str(user.id)})
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    rt_repo.create_refresh_token(user.id, new_refresh, expires_at)

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout", response_model=SuccessResponse, summary="Logout")
async def logout(
    payload: RefreshRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    rt_repo = RefreshTokenRepository(db)
    rt_repo.revoke(payload.refresh_token)
    return SuccessResponse(message="Logged out successfully")


@router.post("/logout-all", response_model=SuccessResponse, summary="Logout from all devices")
async def logout_all(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    rt_repo = RefreshTokenRepository(db)
    rt_repo.revoke_all_for_user(current_user.id)
    return SuccessResponse(message="Logged out from all devices")


@router.get("/me", response_model=UserInfo, summary="Get current user info")
async def me(current_user: User = Depends(get_current_active_user)):
    permissions = get_user_permissions(current_user)
    return UserInfo(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_super_admin=current_user.is_super_admin,
        tenant_id=current_user.tenant_id,
        avatar_url=current_user.avatar_url,
        permissions=permissions,
    )
