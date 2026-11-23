import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.config import get_settings
from app.core.security import decode_token
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserPublic
from app.schemas.users import (
    ChangePasswordRequest,
    TotpEnrolResponse,
    TotpVerifyRequest,
    UserSessionsListResponse,
)
from app.services.auth_service import (
    authenticate_user,
    complete_2fa_login,
    change_user_password,
    disable_totp,
    enrol_totp,
    list_user_sessions,
    logout,
    refresh_tokens,
    revoke_all_user_sessions,
    revoke_user_session,
    verify_and_enable_totp,
)

router = APIRouter()


class TotpLoginRequest(BaseModel):
    temp_token: str
    code: str


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: LoginRequest,
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent")
    user, access_token, token_or_temp = await authenticate_user(
        db=db,
        credentials=credentials,
        ip=client_ip,
        user_agent=user_agent,
    )
    if user.totp_enabled and not credentials.totp_code:
        return TokenResponse(
            access_token="",
            token_type="bearer",
            user=None,
            requires_2fa=True,
            temp_token=token_or_temp,
        )

    settings = get_settings()
    response.set_cookie(
        key="refresh_token",
        value=token_or_temp,
        httponly=True,
        samesite="lax",
        path=settings.auth_cookie_path,
        max_age=settings.jwt_refresh_expire_days * 86400,
        secure=False if settings.environment == "development" else True,
    )
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserPublic.model_validate(user),
    )


@router.post("/2fa/login", response_model=TokenResponse)
async def login_2fa(
    body: TotpLoginRequest,
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent")
    user, access_token, refresh_token = await complete_2fa_login(
        db=db,
        temp_token=body.temp_token,
        code=body.code,
        ip=client_ip,
        user_agent=user_agent,
    )
    settings = get_settings()
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        path=settings.auth_cookie_path,
        max_age=settings.jwt_refresh_expire_days * 86400,
        secure=False if settings.environment == "development" else True,
    )
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserPublic.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )

    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent")
    user, new_access_token, new_refresh_token = await refresh_tokens(
        db=db,
        refresh_token=refresh_token,
        ip=client_ip,
        user_agent=user_agent,
    )
    settings = get_settings()
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        samesite="lax",
        path=settings.auth_cookie_path,
        max_age=settings.jwt_refresh_expire_days * 86400,
        secure=False if settings.environment == "development" else True,
    )
    return TokenResponse(
        access_token=new_access_token,
        token_type="bearer",
        user=UserPublic.model_validate(user),
    )


@router.post("/logout")
async def logout_endpoint(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    client_ip = request.client.host if request.client else None
    user_id: Optional[uuid.UUID] = None
    username: Optional[str] = None
    token_id: Optional[str] = None

    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ", 1)[1]
            payload = decode_token(token)
            user_id = uuid.UUID(payload.get("sub"))
            username = payload.get("username")
        except Exception:
            pass

    ref_token = request.cookies.get("refresh_token")
    if ref_token:
        try:
            payload = decode_token(ref_token)
            if not user_id:
                user_id = uuid.UUID(payload.get("sub"))
            token_id = payload.get("token_id")
        except Exception:
            pass

    await logout(
        db=db,
        user_id=user_id,
        username=username,
        token_id=token_id,
        ip=client_ip,
        response=response,
    )
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserPublic)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserPublic.model_validate(current_user)


@router.post("/change-password")
async def change_password_endpoint(
    body: ChangePasswordRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    client_ip = request.client.host if request.client else None
    await change_user_password(
        db=db,
        user_id=current_user.id,
        current_password=body.current_password,
        new_password=body.new_password,
        ip=client_ip,
    )
    return {"message": "Password changed successfully"}


@router.post("/2fa/enrol", response_model=TotpEnrolResponse)
async def enrol_totp_endpoint(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    client_ip = request.client.host if request.client else None
    return await enrol_totp(db=db, user_id=current_user.id, ip=client_ip)


@router.post("/2fa/verify")
async def verify_totp_endpoint(
    body: TotpVerifyRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    client_ip = request.client.host if request.client else None
    await verify_and_enable_totp(
        db=db,
        user_id=current_user.id,
        code=body.code,
        ip=client_ip,
    )
    return {"message": "Two-factor authentication enabled successfully"}


@router.post("/2fa/disable")
async def disable_totp_endpoint(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    client_ip = request.client.host if request.client else None
    await disable_totp(db=db, user_id=current_user.id, ip=client_ip)
    return {"message": "Two-factor authentication disabled"}


@router.get("/sessions", response_model=UserSessionsListResponse)
async def list_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_token_id = None
    ref_token = request.cookies.get("refresh_token")
    if ref_token:
        try:
            payload = decode_token(ref_token)
            current_token_id = payload.get("token_id")
        except Exception:
            pass

    return await list_user_sessions(
        db=db,
        user_id=current_user.id,
        current_token_id=current_token_id,
    )


@router.post("/sessions/{session_id}/revoke")
async def revoke_session_endpoint(
    session_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    client_ip = request.client.host if request.client else None
    await revoke_user_session(
        db=db,
        user_id=current_user.id,
        session_id=session_id,
        ip=client_ip,
    )
    return {"message": "Session revoked"}


@router.post("/sessions/revoke-all")
async def revoke_all_sessions_endpoint(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_token_id = None
    ref_token = request.cookies.get("refresh_token")
    if ref_token:
        try:
            payload = decode_token(ref_token)
            current_token_id = payload.get("token_id")
        except Exception:
            pass

    client_ip = request.client.host if request.client else None
    await revoke_all_user_sessions(
        db=db,
        user_id=current_user.id,
        current_token_id=current_token_id,
        ip=client_ip,
    )
    return {"message": "All other sessions revoked"}
