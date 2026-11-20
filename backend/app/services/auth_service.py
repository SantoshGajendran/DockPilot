import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from fastapi import HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.constants import AuditResult
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.auth import LoginRequest

_DUMMY_PASSWORD_HASH = hash_password("dummy-constant-time-protection-string")


async def authenticate_user(
    db: AsyncSession,
    credentials: LoginRequest,
    ip: Optional[str] = None,
) -> Tuple[User, str, str]:
    now = datetime.now(timezone.utc)
    settings = get_settings()

    result = await db.execute(select(User).where(User.username == credentials.username))
    user = result.scalar_one_or_none()

    if user is not None and user.locked_until is not None:
        locked_until = user.locked_until
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        if locked_until > now:
            audit = AuditLog(
                user_id=user.id,
                username=user.username,
                action="auth.login",
                target_type="user",
                target_id=str(user.id),
                result=AuditResult.FAILURE,
                payload={"reason": "account_locked"},
                error_message="Account temporarily locked. Try again later.",
                ip_address=ip,
            )
            db.add(audit)
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account temporarily locked. Try again later.",
            )
        else:
            user.locked_until = None
            user.failed_login_attempts = 0

    valid_password = False
    if user is not None:
        valid_password = verify_password(credentials.password, user.hashed_password)
    else:
        verify_password(credentials.password, _DUMMY_PASSWORD_HASH)

    if user is None or not valid_password:
        target_id = None
        if user is not None:
            target_id = str(user.id)
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= settings.max_login_attempts:
                user.locked_until = now + timedelta(minutes=settings.lockout_duration_minutes)
            db.add(user)

        audit = AuditLog(
            user_id=user.id if user else None,
            username=credentials.username,
            action="auth.login",
            target_type="user",
            target_id=target_id,
            result=AuditResult.FAILURE,
            payload={"reason": "bad_credentials"},
            error_message="Invalid username or password",
            ip_address=ip,
        )
        db.add(audit)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if not user.is_active:
        audit = AuditLog(
            user_id=user.id,
            username=user.username,
            action="auth.login",
            target_type="user",
            target_id=str(user.id),
            result=AuditResult.FAILURE,
            payload={"reason": "account_disabled"},
            error_message="Invalid username or password",
            ip_address=ip,
        )
        db.add(audit)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    user.failed_login_attempts = 0
    user.locked_until = None
    db.add(user)

    audit = AuditLog(
        user_id=user.id,
        username=user.username,
        action="auth.login",
        target_type="user",
        target_id=str(user.id),
        result=AuditResult.SUCCESS,
        ip_address=ip,
    )
    db.add(audit)
    await db.commit()

    access_token = create_access_token(user.id, user.username, user.role)
    refresh_token = create_refresh_token(user.id)

    return user, access_token, refresh_token


async def refresh_tokens(
    db: AsyncSession,
    refresh_token: str,
    ip: Optional[str] = None,
) -> Tuple[User, str, str]:
    now = datetime.now(timezone.utc)
    try:
        payload = decode_token(refresh_token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user identifier",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        audit = AuditLog(
            user_id=user.id if user else user_id,
            username=user.username if user else "unknown",
            action="auth.refresh",
            target_type="user",
            target_id=str(user_id),
            result=AuditResult.FAILURE,
            payload={"reason": "user_not_found_or_inactive"},
            error_message="User not found or inactive",
            ip_address=ip,
        )
        db.add(audit)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    if user.locked_until is not None:
        locked_until = user.locked_until
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        if locked_until > now:
            audit = AuditLog(
                user_id=user.id,
                username=user.username,
                action="auth.refresh",
                target_type="user",
                target_id=str(user.id),
                result=AuditResult.FAILURE,
                payload={"reason": "account_locked"},
                error_message="Account temporarily locked. Try again later.",
                ip_address=ip,
            )
            db.add(audit)
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account temporarily locked. Try again later.",
            )

    new_access_token = create_access_token(user.id, user.username, user.role)
    new_refresh_token = create_refresh_token(user.id)

    audit = AuditLog(
        user_id=user.id,
        username=user.username,
        action="auth.refresh",
        target_type="user",
        target_id=str(user.id),
        result=AuditResult.SUCCESS,
        ip_address=ip,
    )
    db.add(audit)
    await db.commit()

    return user, new_access_token, new_refresh_token


async def logout(
    db: Optional[AsyncSession] = None,
    user_id: Optional[uuid.UUID] = None,
    username: Optional[str] = None,
    ip: Optional[str] = None,
    response: Optional[Response] = None,
) -> None:
    if response is not None:
        settings = get_settings()
        response.delete_cookie(
            key="refresh_token",
            path=settings.auth_cookie_path,
        )
    if db is not None:
        audit = AuditLog(
            user_id=user_id,
            username=username or "anonymous",
            action="auth.logout",
            target_type="user",
            target_id=str(user_id) if user_id else None,
            result=AuditResult.SUCCESS,
            ip_address=ip,
        )
        db.add(audit)
        await db.commit()
