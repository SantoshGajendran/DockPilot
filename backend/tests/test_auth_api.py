import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, func
from fastapi import Depends

from app.main import create_app, bootstrap_default_admin
from app.models.base import Base
from app.models.user import User
from app.core.security import hash_password, create_access_token
from app.core.constants import Role
from app.api.deps import get_current_user, require_role


@pytest_asyncio.fixture(autouse=True)
async def setup_test_db(monkeypatch):
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    monkeypatch.setattr("app.core.database.async_session", session_factory)
    monkeypatch.setattr("app.core.database.engine", engine)
    monkeypatch.setattr("app.main.async_session", session_factory)

    # Seed default admin
    async with session_factory() as session:
        admin = User(
            username="admin",
            hashed_password=hash_password("dockpilot_admin_2026"),
            role=Role.ADMIN,
            is_active=True,
        )
        session.add(admin)
        await session.commit()

    yield session_factory
    await engine.dispose()


@pytest.mark.asyncio
async def test_auth_api_flow():
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Test 1: Wrong password -> 401
        res = await client.post("/api/v1/auth/login", json={"username": "admin", "password": "WrongPassword!"})
        assert res.status_code == 401

        # Test 2: Valid login -> 200, access token in body, refresh token in cookie
        res = await client.post("/api/v1/auth/login", json={"username": "admin", "password": "dockpilot_admin_2026"})
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert "refresh_token" in res.cookies
        access_token = data["access_token"]

        # Test 3: /auth/me with Bearer token
        res_me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"})
        assert res_me.status_code == 200
        assert res_me.json()["username"] == "admin"

        # Test 4: Refresh token endpoint
        res_refresh = await client.post("/api/v1/auth/refresh")
        assert res_refresh.status_code == 200
        assert "access_token" in res_refresh.json()

        # Test 5: Logout clears cookie
        res_logout = await client.post("/api/v1/auth/logout")
        assert res_logout.status_code == 200


@pytest.mark.asyncio
async def test_auth_me_unauthorized():
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/auth/me")
        assert res.status_code == 401

        res_invalid = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid.token.value"})
        assert res_invalid.status_code == 401


@pytest.mark.asyncio
async def test_auth_refresh_missing_cookie():
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/auth/refresh")
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_rbac_hierarchy(setup_test_db):
    session_factory = setup_test_db
    async with session_factory() as session:
        viewer = User(
            username="viewer_user",
            hashed_password=hash_password("Pass123!"),
            role=Role.VIEWER,
            is_active=True,
        )
        operator = User(
            username="operator_user",
            hashed_password=hash_password("Pass123!"),
            role=Role.OPERATOR,
            is_active=True,
        )
        admin = User(
            username="admin_user",
            hashed_password=hash_password("Pass123!"),
            role=Role.ADMIN,
            is_active=True,
        )
        session.add_all([viewer, operator, admin])
        await session.commit()
        await session.refresh(viewer)
        await session.refresh(operator)
        await session.refresh(admin)

    app = create_app()

    @app.get("/test/viewer")
    async def viewer_route(user: User = Depends(require_role(Role.VIEWER))):
        return {"role": user.role}

    @app.get("/test/operator")
    async def operator_route(user: User = Depends(require_role(Role.OPERATOR))):
        return {"role": user.role}

    @app.get("/test/admin")
    async def admin_route(user: User = Depends(require_role(Role.ADMIN))):
        return {"role": user.role}

    viewer_token = create_access_token(viewer.id, viewer.username, viewer.role)
    operator_token = create_access_token(operator.id, operator.username, operator.role)
    admin_token = create_access_token(admin.id, admin.username, admin.role)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Viewer access: can access viewer, forbidden on operator & admin
        res = await client.get("/test/viewer", headers={"Authorization": f"Bearer {viewer_token}"})
        assert res.status_code == 200

        res = await client.get("/test/operator", headers={"Authorization": f"Bearer {viewer_token}"})
        assert res.status_code == 403

        res = await client.get("/test/admin", headers={"Authorization": f"Bearer {viewer_token}"})
        assert res.status_code == 403

        # Operator access: can access viewer & operator, forbidden on admin
        res = await client.get("/test/viewer", headers={"Authorization": f"Bearer {operator_token}"})
        assert res.status_code == 200

        res = await client.get("/test/operator", headers={"Authorization": f"Bearer {operator_token}"})
        assert res.status_code == 200

        res = await client.get("/test/admin", headers={"Authorization": f"Bearer {operator_token}"})
        assert res.status_code == 403

        # Admin access: can access all routes
        res = await client.get("/test/viewer", headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200

        res = await client.get("/test/operator", headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200

        res = await client.get("/test/admin", headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200


@pytest.mark.asyncio
async def test_admin_bootstrap_when_db_empty(monkeypatch):
    empty_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with empty_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    empty_session_factory = async_sessionmaker(empty_engine, expire_on_commit=False, class_=AsyncSession)
    monkeypatch.setattr("app.core.database.async_session", empty_session_factory)
    monkeypatch.setattr("app.main.async_session", empty_session_factory)

    # Verify initially 0 users
    async with empty_session_factory() as session:
        count = (await session.execute(select(func.count(User.id)))).scalar()
        assert count == 0

    # Run bootstrap
    await bootstrap_default_admin()

    # Verify admin created
    async with empty_session_factory() as session:
        result = await session.execute(select(User).where(User.username == "admin"))
        user = result.scalar_one_or_none()
        assert user is not None
        assert user.role == Role.ADMIN
        assert user.is_active is True

    # Running bootstrap again should not duplicate
    await bootstrap_default_admin()
    async with empty_session_factory() as session:
        count = (await session.execute(select(func.count(User.id)))).scalar()
        assert count == 1

    await empty_engine.dispose()
