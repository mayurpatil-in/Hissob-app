"""
Auth router — login, logout, refresh, me.
"""
import base64
import io
from datetime import UTC
from datetime import datetime
from datetime import timedelta

import pyotp
import qrcode
from fastapi import APIRouter
from fastapi import BackgroundTasks
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Request
from fastapi import status
from jose import jwt
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.auth.deps import get_current_active_user
from app.auth.jwt import create_access_token
from app.auth.jwt import create_refresh_token
from app.auth.jwt import decode_token
from app.core.config import settings
from app.core.database import get_db
from app.core.security import hash_password
from app.core.security import verify_password
from app.models.user import User
from app.permissions.rbac import get_user_permissions
from app.repositories.user import RefreshTokenRepository
from app.repositories.user import UserRepository
from app.schemas.auth import ChangePasswordRequest
from app.schemas.auth import ForgotPasswordRequest
from app.schemas.auth import LoginRequest
from app.schemas.auth import LoginResponse
from app.schemas.auth import RefreshRequest
from app.schemas.auth import ResetPasswordRequest
from app.schemas.auth import TokenResponse
from app.schemas.auth import TOTPDisableRequest
from app.schemas.auth import TOTPSetupResponse
from app.schemas.auth import TOTPVerifyRequest
from app.schemas.auth import UserInfo
from app.schemas.common import SuccessResponse
from app.services.email_service import send_password_reset_email

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/auth", tags=["Authentication"])


# ─── In-memory failed login tracker for account lockout ────────
_failed_logins: dict[str, dict] = {}  # email -> {"count": int, "locked_until": datetime|None}
_MAX_FAILED_ATTEMPTS = 5
_LOCKOUT_DURATION_MINUTES = 30


@router.post("/login", response_model=LoginResponse, summary="User Login")
@limiter.limit("5/minute")
async def login(
    request: Request,
    payload: LoginRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    email_key = payload.email.lower().strip()

    # ── Account Lockout Check ────────────────────────────────
    lockout_info = _failed_logins.get(email_key)
    if lockout_info:
        locked_until = lockout_info.get("locked_until")
        if locked_until and datetime.now(UTC) < locked_until:
            remaining = int((locked_until - datetime.now(UTC)).total_seconds() // 60) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Account temporarily locked due to {_MAX_FAILED_ATTEMPTS} failed login attempts. Try again in {remaining} minutes.",
            )
        elif locked_until and datetime.now(UTC) >= locked_until:
            # Lockout expired — reset counter
            _failed_logins.pop(email_key, None)

    user_repo = UserRepository(db)
    user = user_repo.get_by_email(payload.email)

    if not user or not verify_password(payload.password, user.hashed_password):
        # ── Increment failed login counter ───────────────────
        if email_key not in _failed_logins:
            _failed_logins[email_key] = {"count": 0, "locked_until": None}
        _failed_logins[email_key]["count"] += 1
        if _failed_logins[email_key]["count"] >= _MAX_FAILED_ATTEMPTS:
            _failed_logins[email_key]["locked_until"] = datetime.now(UTC) + timedelta(minutes=_LOCKOUT_DURATION_MINUTES)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Account locked for {_LOCKOUT_DURATION_MINUTES} minutes after {_MAX_FAILED_ATTEMPTS} consecutive failed login attempts.",
            )
        remaining_attempts = _MAX_FAILED_ATTEMPTS - _failed_logins[email_key]["count"]
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid email or password. {remaining_attempts} attempt(s) remaining before account lockout.",
        )

    # ── Successful credential check — clear lockout counter ──
    _failed_logins.pop(email_key, None)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended. Contact administrator.",
        )

    # 2FA TOTP check
    if bool(getattr(user, "totp_enabled", False)):
        if not payload.totp_code:
            return LoginResponse(requires_2fa=True)

        if not user.totp_secret:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="2FA is enabled but secret is missing. Contact administrator.",
            )

        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(payload.totp_code.strip(), valid_window=1):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid 2FA authentication code. Please check Google Authenticator.",
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
    expires_at = datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    rt_repo.create_refresh_token(
        user_id=user.id,
        token=refresh_token_str,
        expires_at=expires_at,
        ip_address=request.client.host if request.client else None,
        device_info=request.headers.get("user-agent"),
    )

    # Update last login in background
    def _update_last_login():
        user.last_login = datetime.now(UTC)
        db.commit()
        try:
            from app.services.audit_service import log_audit_event
            log_audit_event(
                db=db,
                user=user,
                module="auth",
                action="login",
                record_label=f"User Login ({user.full_name})",
                ip_address=request.client.host if request.client else "127.0.0.1",
                notes="Successful system login"
            )
        except Exception:
            pass

    background_tasks.add_task(_update_last_login)

    permissions = get_user_permissions(user)

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token_str,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        requires_2fa=False,
        user=UserInfo(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_super_admin=user.is_super_admin,
            tenant_id=user.tenant_id,
            avatar_url=user.avatar_url,
            permissions=permissions,
            roles=getattr(user, "roles", []),
            totp_enabled=bool(getattr(user, "totp_enabled", False)),
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

    if stored.expires_at < datetime.now(UTC):
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
    expires_at = datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
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
        roles=getattr(current_user, "roles", []),
        totp_enabled=bool(getattr(current_user, "totp_enabled", False)),
    )


@router.post("/totp/setup", response_model=TOTPSetupResponse, summary="Setup 2FA TOTP secret & QR code")
async def setup_totp(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    secret = pyotp.random_base32()
    current_user.totp_secret = secret
    db.commit()

    otpauth_url = pyotp.TOTP(secret).provisioning_uri(
        name=current_user.email,
        issuer_name="Hisob ERP"
    )

    qr_img = qrcode.make(otpauth_url)
    buffer = io.BytesIO()
    qr_img.save(buffer, format="PNG")
    b64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
    qr_code_base64 = f"data:image/png;base64,{b64_str}"

    return TOTPSetupResponse(
        secret=secret,
        otpauth_url=otpauth_url,
        qr_code_base64=qr_code_base64,
    )


@router.post("/totp/verify-setup", response_model=SuccessResponse, summary="Verify 2FA test code and activate 2FA")
async def verify_totp_setup(
    payload: TOTPVerifyRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not current_user.totp_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2FA setup not initialized. Call /auth/totp/setup first.")

    totp = pyotp.TOTP(current_user.totp_secret)
    if not totp.verify(payload.code.strip(), valid_window=1):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code. Please check your Google Authenticator app.")

    current_user.totp_enabled = True
    db.commit()
    return SuccessResponse(message="Two-Factor Authentication (2FA) successfully activated!")


@router.post("/totp/disable", response_model=SuccessResponse, summary="Disable 2FA TOTP")
async def disable_totp(
    payload: TOTPDisableRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    # Password verification is MANDATORY to disable 2FA (security requirement)
    if not verify_password(payload.password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect password. Cannot disable 2FA.")

    current_user.totp_enabled = False
    current_user.totp_secret = None
    db.commit()
    return SuccessResponse(message="Two-Factor Authentication (2FA) has been disabled.")


@router.post("/forgot-password", response_model=SuccessResponse, summary="Request password reset link via email")
async def forgot_password(
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user_repo = UserRepository(db)
    user = user_repo.get_by_email(payload.email)

    # Return success even if user not found to prevent user enumeration
    if user and user.is_active:
        expire = datetime.now(UTC) + timedelta(hours=1)  # 1-hour expiry for security
        token = jwt.encode(
            {"sub": str(user.id), "email": user.email, "exp": expire, "type": "password_reset"},
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )
        reset_url = f"https://hisob.in/reset-password?token={token}"

        background_tasks.add_task(
            send_password_reset_email,
            to_email=user.email,
            reset_url=reset_url,
            db=None,
            tenant_id=user.tenant_id,
        )

    return SuccessResponse(message="If an account exists with this email, a password reset link has been dispatched.")


@router.post("/reset-password", response_model=SuccessResponse, summary="Reset password using email token")
async def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    decoded = decode_token(payload.token)
    if not decoded or decoded.get("type") != "password_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset link.",
        )

    user_repo = UserRepository(db)
    user = user_repo.get(decoded["sub"])
    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="User account not found or deactivated.")

    user.hashed_password = hash_password(payload.new_password)
    user.email_verified = True
    db.commit()

    return SuccessResponse(message="Password successfully reset. You can now log in with your new password.")


@router.post("/change-password", response_model=SuccessResponse, summary="Change current user security password")
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect. Please double-check your current password.",
        )

    if payload.current_password == payload.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password.",
        )

    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()

    return SuccessResponse(message="Security password updated successfully! Please use your new password for your next login.")


