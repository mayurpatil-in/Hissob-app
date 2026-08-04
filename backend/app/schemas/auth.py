"""
Auth schemas — login, token response, refresh.
"""
import re
from uuid import UUID

from pydantic import BaseModel
from pydantic import EmailStr
from pydantic import Field
from pydantic import field_validator


# ─── Password Complexity Validator ──────────────────────────────
def _validate_password_strength(password: str) -> str:
    """Enforce strong password rules: min 8 chars, uppercase, lowercase, digit, special character."""
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter (A-Z).")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least one lowercase letter (a-z).")
    if not re.search(r"\d", password):
        raise ValueError("Password must contain at least one digit (0-9).")
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?~`]", password):
        raise ValueError("Password must contain at least one special character (!@#$%^&* etc.).")
    return password


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    totp_code: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class RefreshRequest(BaseModel):
    refresh_token: str


class RoleInfo(BaseModel):
    id: UUID
    name: str
    slug: str | None = None

    model_config = {"from_attributes": True}


class UserInfo(BaseModel):
    id: UUID
    email: str
    full_name: str
    is_super_admin: bool
    tenant_id: UUID | None
    avatar_url: str | None
    permissions: dict[str, list[str]]
    roles: list[RoleInfo] = []
    totp_enabled: bool = False

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str = "bearer"
    expires_in: int | None = None
    user: UserInfo | None = None
    requires_2fa: bool = False


class TOTPSetupResponse(BaseModel):
    secret: str
    otpauth_url: str
    qr_code_base64: str


class TOTPVerifyRequest(BaseModel):
    code: str


class TOTPDisableRequest(BaseModel):
    password: str = Field(min_length=1, description="Password is required to disable 2FA")


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password_strength(v)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password_strength(v)



