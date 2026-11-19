import pytest
import pytest_asyncio
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from fastapi import HTTPException, Response

from app.models.base import Base
from app.models.user import User
from app.models.audit import AuditLog
from app.core.security import hash_password, create_refresh_token, create_access_token
from app.core.constants import Role, AuditResult
from app.schemas.auth import LoginRequest
from app.services.auth_service import authenticate_user, refresh_tokens, logout


@pytest_asyncio.fixture
async def async_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_authenticate_success_and_failure(async_db):
    user = User(
        username="testadmin",
        hashed_password=hash_password("Secret1234!"),
        role=Role.ADMIN,
        is_active=True,
    )
    async_db.add(user)
    await async_db.commit()

    # Success
    authenticated_user, access_token, refresh_token = await authenticate_user(
        async_db, LoginRequest(username="testadmin", password="Secret1234!"), ip="127.0.0.1"
    )
    assert authenticated_user.username == "testadmin"
    assert access_token is not None
    assert refresh_token is not None
    assert authenticated_user.failed_login_attempts == 0
    assert authenticated_user.locked_until is None

    # Check audit log for success
    result = await async_db.execute(select(AuditLog).where(AuditLog.action == "auth.login"))
    logs = result.scalars().all()
    assert len(logs) == 1
    assert logs[0].result == AuditResult.SUCCESS
    assert logs[0].username == "testadmin"
    assert logs[0].ip_address == "127.0.0.1"

    # Failure - wrong password
    with pytest.raises(HTTPException) as exc_info:
        await authenticate_user(
            async_db, LoginRequest(username="testadmin", password="WrongPassword!"), ip="127.0.0.1"
        )
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid username or password"

    # Verify attempt incremented
    await async_db.refresh(user)
    assert user.failed_login_attempts == 1

    # Failure - non-existent user
    with pytest.raises(HTTPException) as exc_info:
        await authenticate_user(
            async_db, LoginRequest(username="nonexistent", password="WrongPassword!"), ip="127.0.0.1"
        )
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid username or password"


@pytest.mark.asyncio
async def test_authenticate_lockout_after_max_attempts(async_db):
    user = User(
        username="lockout_user",
        hashed_password=hash_password("Secret1234!"),
        role=Role.OPERATOR,
        is_active=True,
    )
    async_db.add(user)
    await async_db.commit()

    # Fail 5 times (max_login_attempts = 5)
    for i in range(5):
        with pytest.raises(HTTPException) as exc_info:
            await authenticate_user(
                async_db,
                LoginRequest(username="lockout_user", password="WrongPassword!"),
                ip="192.168.1.50",
            )
        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Invalid username or password"

    await async_db.refresh(user)
    assert user.failed_login_attempts == 5
    assert user.locked_until is not None

    # 6th attempt should trigger account lockout response
    with pytest.raises(HTTPException) as exc_info:
        await authenticate_user(
            async_db,
            LoginRequest(username="lockout_user", password="Secret1234!"),
            ip="192.168.1.50",
        )
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Account temporarily locked. Try again later."

    # If lockout time passes, login succeeds and resets lockout
    user.locked_until = datetime.now(timezone.utc) - timedelta(minutes=1)
    await async_db.commit()

    auth_user, _, _ = await authenticate_user(
        async_db,
        LoginRequest(username="lockout_user", password="Secret1234!"),
        ip="192.168.1.50",
    )
    assert auth_user.failed_login_attempts == 0
    assert auth_user.locked_until is None


@pytest.mark.asyncio
async def test_refresh_tokens_lifecycle(async_db):
    user = User(
        username="refresh_user",
        hashed_password=hash_password("Secret1234!"),
        role=Role.VIEWER,
        is_active=True,
    )
    async_db.add(user)
    await async_db.commit()

    valid_refresh = create_refresh_token(user.id)
    refreshed_user, new_access, new_refresh = await refresh_tokens(
        async_db, valid_refresh, ip="10.0.0.1"
    )
    assert refreshed_user.id == user.id
    assert new_access is not None
    assert new_refresh is not None

    # Check audit log for refresh
    result = await async_db.execute(select(AuditLog).where(AuditLog.action == "auth.refresh"))
    refresh_log = result.scalar_one_or_none()
    assert refresh_log is not None
    assert refresh_log.result == AuditResult.SUCCESS

    # Attempt refresh with an access token (wrong token type)
    access_token = create_access_token(user.id, user.username, user.role)
    with pytest.raises(HTTPException) as exc_info:
        await refresh_tokens(async_db, access_token)
    assert exc_info.value.status_code == 401
    assert "Invalid token type" in exc_info.value.detail

    # Attempt refresh with invalid token
    with pytest.raises(HTTPException) as exc_info:
        await refresh_tokens(async_db, "invalid.token.string")
    assert exc_info.value.status_code == 401

    # Attempt refresh with inactive user
    user.is_active = False
    await async_db.commit()
    with pytest.raises(HTTPException) as exc_info:
        await refresh_tokens(async_db, new_refresh)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_logout_clears_cookie_and_audits(async_db):
    user_id = uuid.uuid4()
    response = Response()
    response.set_cookie(key="refresh_token", value="test_token", path="/api/v1/auth")

    await logout(
        db=async_db,
        user_id=user_id,
        username="admin",
        ip="127.0.0.1",
        response=response,
    )

    # Check audit log
    result = await async_db.execute(select(AuditLog).where(AuditLog.action == "auth.logout"))
    logout_log = result.scalar_one_or_none()
    assert logout_log is not None
    assert logout_log.result == AuditResult.SUCCESS
    assert logout_log.user_id == user_id
    assert logout_log.username == "admin"

    # Check cookie deleted in response headers
    set_cookie_headers = [
        val for key, val in response.raw_headers if key.decode().lower() == "set-cookie"
    ]
    assert any('refresh_token=""' in h.decode() or "refresh_token=;" in h.decode() or "max-age=0" in h.decode().lower() for h in set_cookie_headers)
