import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=1, max_length=255)
    totp_code: Optional[str] = None


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    email: Optional[str] = None
    role: str
    is_active: bool
    force_password_change: bool = False
    totp_enabled: bool = False


class TokenResponse(BaseModel):
    access_token: str = ""
    token_type: str = "bearer"
    user: Optional[UserPublic] = None
    requires_2fa: bool = False
    temp_token: Optional[str] = None
