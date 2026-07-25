"""
Auth schemas — login, token response, refresh.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class RefreshRequest(BaseModel):
    refresh_token: str


class UserInfo(BaseModel):
    id: UUID
    email: str
    full_name: str
    is_super_admin: bool
    tenant_id: Optional[UUID]
    avatar_url: Optional[str]
    permissions: dict[str, list[str]]

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserInfo
