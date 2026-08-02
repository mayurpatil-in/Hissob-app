"""
Auth schemas — login, token response, refresh.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    totp_code: Optional[str] = None


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
    slug: Optional[str] = None

    model_config = {"from_attributes": True}


class UserInfo(BaseModel):
    id: UUID
    email: str
    full_name: str
    is_super_admin: bool
    tenant_id: Optional[UUID]
    avatar_url: Optional[str]
    permissions: dict[str, list[str]]
    roles: list[RoleInfo] = []
    totp_enabled: bool = False

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: Optional[int] = None
    user: Optional[UserInfo] = None
    requires_2fa: bool = False


class TOTPSetupResponse(BaseModel):
    secret: str
    otpauth_url: str
    qr_code_base64: str


class TOTPVerifyRequest(BaseModel):
    code: str


class TOTPDisableRequest(BaseModel):
    password: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=6)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)



