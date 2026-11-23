import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
from fastapi import HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.constants import AuditResult
from app.core.security import (
    create_access_token,
    create_refresh_token,
    create_2fa_temp_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.core.totp import (
    generate_totp_secret,
    get_totp_uri,
    verify_totp_code,
)
from app.models.audit import AuditLog
from app.models.session import UserSession
from app.models.user import User
from app.schemas.auth import LoginRequest
from app.schemas.users import (
    TotpEnrolResponse,
    UserSessionResponse,
    UserSessionsListResponse,
)

_DUMMY_PASSWORD_HASH = hash_password("dummy-constant-time-protection-string")


async def authenticate_user(
    db: AsyncSession,
    credentials: LoginRequest,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Tuple[User, str, str]:
    """
    Authenticate user. Returns (user, access_token, refresh_token_or_temp_token).
    If user has 2FA enabled and no code was provided, access_token is empty and temp_token is returned.
    """
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

    # Check 2FA requirement
    if user.totp_enabled:
        if not credentials.totp_code:
            # Issue temp token for 2FA challenge
            temp_token = create_2fa_temp_token(user.id)
            return user, "", temp_token
        
        # Verify provided TOTP code
        if not verify_totp_code(user.totp_secret, credentials.totp_code, window=settings.totp_window):
            audit = AuditLog(
                user_id=user.id,
                username=user.username,
                action="auth.login_2fa",
                target_type="user",
                target_id=str(user.id),
                result=AuditResult.FAILURE,
                payload={"reason": "invalid_totp_code"},
                error_message="Invalid two-factor authentication code",
                ip_address=ip,
            )
            db.add(audit)
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid two-factor authentication code",
            )

    user.failed_login_attempts = 0
    user.locked_until = None
    db.add(user)

    access_token = create_access_token(user.id, user.username, user.role)
    refresh_token = create_refresh_token(user.id)

    refresh_payload = decode_token(refresh_token)
    token_id = refresh_payload.get("token_id", str(uuid.uuid4()))

    session_record = UserSession(
        user_id=user.id,
        token_id=token_id,
        ip_address=ip,
        user_agent=user_agent[:255] if user_agent else None,
        created_at=now,
        last_seen_at=now,
        is_revoked=False,
    )
    db.add(session_record)

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

    return user, access_token, refresh_token


async def complete_2fa_login(
    db: AsyncSession,
    temp_token: str,
    code: str,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Tuple[User, str, str]:
    now = datetime.now(timezone.utc)
    settings = get_settings()

    try:
        payload = decode_token(temp_token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired two-factor session",
        )

    if payload.get("type") != "2fa_temp":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    user_id = uuid.UUID(payload["sub"])
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()

    if not user or not user.is_active or not user.totp_enabled:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or 2FA not enabled",
        )

    if not verify_totp_code(user.totp_secret, code, window=settings.totp_window):
        audit = AuditLog(
            user_id=user.id,
            username=user.username,
            action="auth.login_2fa",
            target_type="user",
            target_id=str(user.id),
            result=AuditResult.FAILURE,
            payload={"reason": "invalid_totp_code"},
            error_message="Invalid two-factor authentication code",
            ip_address=ip,
        )
        db.add(audit)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid two-factor authentication code",
        )

    access_token = create_access_token(user.id, user.username, user.role)
    refresh_token = create_refresh_token(user.id)

    refresh_payload = decode_token(refresh_token)
    token_id = refresh_payload.get("token_id", str(uuid.uuid4()))

    session_record = UserSession(
        user_id=user.id,
        token_id=token_id,
        ip_address=ip,
        user_agent=user_agent[:255] if user_agent else None,
        created_at=now,
        last_seen_at=now,
        is_revoked=False,
    )
    db.add(session_record)

    audit = AuditLog(
        user_id=user.id,
        username=user.username,
        action="auth.login_2fa",
        target_type="user",
        target_id=str(user.id),
        result=AuditResult.SUCCESS,
        ip_address=ip,
    )
    db.add(audit)
    await db.commit()

    return user, access_token, refresh_token


async def refresh_tokens(
    db: AsyncSession,
    refresh_token: str,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
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
    token_id = payload.get("token_id")
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

    # Check session revocation
    if token_id:
        sess_res = await db.execute(
            select(UserSession).where(UserSession.token_id == token_id)
        )
        session_record = sess_res.scalar_one_or_none()
        if session_record and session_record.is_revoked:
            audit = AuditLog(
                user_id=user_id,
                username="unknown",
                action="auth.refresh",
                target_type="user",
                target_id=str(user_id),
                result=AuditResult.FAILURE,
                payload={"reason": "session_revoked"},
                error_message="Session has been revoked",
                ip_address=ip,
            )
            db.add(audit)
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has been revoked",
            )
        if session_record:
            session_record.last_seen_at = now
            if ip:
                session_record.ip_address = ip
            if user_agent:
                session_record.user_agent = user_agent[:255]

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

    # Link new refresh token to session
    new_payload = decode_token(new_refresh_token)
    new_token_id = new_payload.get("token_id")
    if token_id and new_token_id:
        sess_res = await db.execute(select(UserSession).where(UserSession.token_id == token_id))
        old_sess = sess_res.scalar_one_or_none()
        if old_sess:
            old_sess.token_id = new_token_id
            old_sess.last_seen_at = now

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


async def change_user_password(
    db: AsyncSession,
    user_id: uuid.UUID,
    current_password: str,
    new_password: str,
    ip: Optional[str] = None,
) -> None:
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if not verify_password(current_password, user.hashed_password):
        audit = AuditLog(
            user_id=user.id,
            username=user.username,
            action="user.change_password",
            target_type="user",
            target_id=str(user.id),
            result=AuditResult.FAILURE,
            payload={"reason": "wrong_current_password"},
            error_message="Current password is incorrect",
            ip_address=ip,
        )
        db.add(audit)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    user.hashed_password = hash_password(new_password)
    user.force_password_change = False

    audit = AuditLog(
        user_id=user.id,
        username=user.username,
        action="user.change_password",
        target_type="user",
        target_id=str(user.id),
        result=AuditResult.SUCCESS,
        ip_address=ip,
    )
    db.add(audit)
    await db.commit()


async def enrol_totp(
    db: AsyncSession,
    user_id: uuid.UUID,
    ip: Optional[str] = None,
) -> TotpEnrolResponse:
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    settings = get_settings()
    secret = generate_totp_secret()
    user.totp_secret = secret
    uri = get_totp_uri(secret, user.username, settings.totp_issuer)

    audit = AuditLog(
        user_id=user.id,
        username=user.username,
        action="user.2fa_enrol",
        target_type="user",
        target_id=str(user.id),
        result=AuditResult.SUCCESS,
        ip_address=ip,
    )
    db.add(audit)
    await db.commit()

    return TotpEnrolResponse(secret=secret, otpauth_url=uri)


async def verify_and_enable_totp(
    db: AsyncSession,
    user_id: uuid.UUID,
    code: str,
    ip: Optional[str] = None,
) -> None:
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    settings = get_settings()
    if not user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA enrolment must be initiated first",
        )

    if not verify_totp_code(user.totp_secret, code, window=settings.totp_window):
        audit = AuditLog(
            user_id=user.id,
            username=user.username,
            action="user.2fa_verify",
            target_type="user",
            target_id=str(user.id),
            result=AuditResult.FAILURE,
            error_message="Invalid verification code",
            ip_address=ip,
        )
        db.add(audit)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code",
        )

    user.totp_enabled = True

    audit = AuditLog(
        user_id=user.id,
        username=user.username,
        action="user.2fa_enable",
        target_type="user",
        target_id=str(user.id),
        result=AuditResult.SUCCESS,
        ip_address=ip,
    )
    db.add(audit)
    await db.commit()


async def disable_totp(
    db: AsyncSession,
    user_id: uuid.UUID,
    ip: Optional[str] = None,
) -> None:
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.totp_enabled = False
    user.totp_secret = None

    audit = AuditLog(
        user_id=user.id,
        username=user.username,
        action="user.2fa_disable",
        target_type="user",
        target_id=str(user.id),
        result=AuditResult.SUCCESS,
        ip_address=ip,
    )
    db.add(audit)
    await db.commit()


async def list_user_sessions(
    db: AsyncSession,
    user_id: uuid.UUID,
    current_token_id: Optional[str] = None,
) -> UserSessionsListResponse:
    res = await db.execute(
        select(UserSession)
        .where(UserSession.user_id == user_id, UserSession.is_revoked.is_(False))
        .order_by(UserSession.last_seen_at.desc())
    )
    sessions = res.scalars().all()
    items = [
        UserSessionResponse(
            id=str(s.id),
            created_at=s.created_at,
            last_seen_at=s.last_seen_at,
            ip_address=s.ip_address,
            user_agent=s.user_agent,
            is_current=(s.token_id == current_token_id) if current_token_id else False,
        )
        for s in sessions
    ]
    return UserSessionsListResponse(items=items, total=len(items))


async def revoke_user_session(
    db: AsyncSession,
    user_id: uuid.UUID,
    session_id: str | uuid.UUID,
    ip: Optional[str] = None,
) -> None:
    parsed_id = uuid.UUID(str(session_id)) if not isinstance(session_id, uuid.UUID) else session_id
    res = await db.execute(
        select(UserSession).where(
            UserSession.id == parsed_id,
            UserSession.user_id == user_id,
        )
    )
    sess = res.scalar_one_or_none()
    if not sess:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    sess.is_revoked = True

    audit = AuditLog(
        user_id=user_id,
        username="user",
        action="session.revoke",
        target_type="user_session",
        target_id=str(parsed_id),
        result=AuditResult.SUCCESS,
        ip_address=ip,
    )
    db.add(audit)
    await db.commit()


async def revoke_all_user_sessions(
    db: AsyncSession,
    user_id: uuid.UUID,
    current_token_id: Optional[str] = None,
    ip: Optional[str] = None,
) -> None:
    stmt = select(UserSession).where(
        UserSession.user_id == user_id,
        UserSession.is_revoked.is_(False),
    )
    if current_token_id:
        stmt = stmt.where(UserSession.token_id != current_token_id)

    res = await db.execute(stmt)
    sessions = res.scalars().all()
    for s in sessions:
        s.is_revoked = True

    audit = AuditLog(
        user_id=user_id,
        username="user",
        action="session.revoke_all",
        target_type="user_session",
        target_id=str(user_id),
        result=AuditResult.SUCCESS,
        ip_address=ip,
    )
    db.add(audit)
    await db.commit()


async def logout(
    db: Optional[AsyncSession] = None,
    user_id: Optional[uuid.UUID] = None,
    username: Optional[str] = None,
    token_id: Optional[str] = None,
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
        if token_id:
            res = await db.execute(select(UserSession).where(UserSession.token_id == token_id))
            sess = res.scalar_one_or_none()
            if sess:
                sess.is_revoked = True

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
