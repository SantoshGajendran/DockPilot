import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.config import get_settings
from app.core.security import decode_token
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserPublic
from app.services.auth_service import authenticate_user, logout, refresh_tokens

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: LoginRequest,
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    client_ip = request.client.host if request.client else None
    user, access_token, refresh_token = await authenticate_user(
        db=db,
        credentials=credentials,
        ip=client_ip,
    )
    settings = get_settings()
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        path="/api/v1/auth",
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
    user, new_access_token, new_refresh_token = await refresh_tokens(
        db=db,
        refresh_token=refresh_token,
        ip=client_ip,
    )
    settings = get_settings()
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        samesite="lax",
        path="/api/v1/auth",
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

    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ", 1)[1]
            payload = decode_token(token)
            user_id = uuid.UUID(payload.get("sub"))
            username = payload.get("username")
        except Exception:
            pass

    if not user_id:
        ref_token = request.cookies.get("refresh_token")
        if ref_token:
            try:
                payload = decode_token(ref_token)
                user_id = uuid.UUID(payload.get("sub"))
            except Exception:
                pass

    await logout(
        db=db,
        user_id=user_id,
        username=username,
        ip=client_ip,
        response=response,
    )
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserPublic)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserPublic.model_validate(current_user)
