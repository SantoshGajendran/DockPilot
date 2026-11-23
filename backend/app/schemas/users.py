import uuid
from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, field_validator
from app.core.constants import Role


class UserCreate(BaseModel):
    username: str
    password: str
    role: str = Role.VIEWER
    email: Optional[str] = None
    is_active: bool = True
    force_password_change: bool = False


class UserUpdate(BaseModel):
    role: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None
    force_password_change: Optional[bool] = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    email: Optional[str] = None
    role: str
    is_active: bool
    force_password_change: bool
    totp_enabled: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @field_validator("id", mode="before")
    @classmethod
    def serialize_id(cls, v: Any) -> str:
        return str(v)


class UsersListResponse(BaseModel):
    items: List[UserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class AdminPasswordResetRequest(BaseModel):
    new_password: str
    force_password_change: bool = True


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class TotpEnrolResponse(BaseModel):
    secret: str
    otpauth_url: str


class TotpVerifyRequest(BaseModel):
    code: str


class TotpStatusResponse(BaseModel):
    totp_enabled: bool


class UserSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    last_seen_at: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    is_current: bool = False

    @field_validator("id", mode="before")
    @classmethod
    def serialize_id(cls, v: Any) -> str:
        return str(v)


class UserSessionsListResponse(BaseModel):
    items: List[UserSessionResponse]
    total: int
