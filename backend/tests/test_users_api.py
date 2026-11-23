import uuid
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.constants import Role
from app.core.security import create_access_token, hash_password
from app.core.totp import generate_totp_code
from app.main import create_app
from app.models.base import Base
from app.models.session import UserSession
from app.models.user import User


@pytest_asyncio.fixture(autouse=True)
async def setup_test_db(monkeypatch):
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    monkeypatch.setattr("app.core.database.async_session", session_factory)
    monkeypatch.setattr("app.core.database.engine", engine)
    monkeypatch.setattr("app.main.async_session", session_factory)

    yield session_factory
    await engine.dispose()


@pytest.mark.asyncio
async def test_users_unauthorized():
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/users")
        assert res.status_code == 401

        res = await client.post("/api/v1/users", json={"username": "bob", "password": "123"})
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_users_rbac_forbidden_for_non_admin():
    app = create_app()
    viewer_token = create_access_token(user_id=uuid.uuid4(), username="viewer", role=Role.VIEWER)
    operator_token = create_access_token(user_id=uuid.uuid4(), username="operator", role=Role.OPERATOR)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        for token in [viewer_token, operator_token]:
            headers = {"Authorization": f"Bearer {token}"}
            res = await client.get("/api/v1/users", headers=headers)
            assert res.status_code == 403

            res = await client.post("/api/v1/users", headers=headers, json={"username": "bob", "password": "123"})
            assert res.status_code == 403


@pytest.mark.asyncio
async def test_users_crud_and_search(setup_test_db):
    session_factory = setup_test_db
    app = create_app()
    admin_id = uuid.uuid4()
    admin_token = create_access_token(user_id=admin_id, username="admin", role=Role.ADMIN)
    headers = {"Authorization": f"Bearer {admin_token}"}

    async with session_factory() as session:
        admin_u = User(id=admin_id, username="admin", hashed_password=hash_password("admin_pass"), role=Role.ADMIN)
        session.add(admin_u)
        await session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create user
        create_res = await client.post(
            "/api/v1/users",
            headers=headers,
            json={
                "username": "operator1",
                "password": "Password123!",
                "role": "operator",
                "email": "operator1@dockpilot.local",
                "is_active": True,
            },
        )
        assert create_res.status_code == 201
        created = create_res.json()
        assert created["username"] == "operator1"
        assert created["role"] == "operator"
        op_id = created["id"]

        # Duplicate username conflict
        dup_res = await client.post(
            "/api/v1/users",
            headers=headers,
            json={"username": "operator1", "password": "123"},
        )
        assert dup_res.status_code == 409

        # List users with search
        list_res = await client.get("/api/v1/users?q=operator", headers=headers)
        assert list_res.status_code == 200
        data = list_res.json()
        assert data["total"] == 1
        assert data["items"][0]["username"] == "operator1"

        # Get user
        get_res = await client.get(f"/api/v1/users/{op_id}", headers=headers)
        assert get_res.status_code == 200
        assert get_res.json()["email"] == "operator1@dockpilot.local"

        # Update user
        update_res = await client.put(
            f"/api/v1/users/{op_id}",
            headers=headers,
            json={"role": "viewer", "is_active": False},
        )
        assert update_res.status_code == 200
        assert update_res.json()["role"] == "viewer"
        assert update_res.json()["is_active"] is False

        # Delete user
        del_res = await client.delete(f"/api/v1/users/{op_id}", headers=headers)
        assert del_res.status_code == 204

        # Confirm deleted
        get_deleted = await client.get(f"/api/v1/users/{op_id}", headers=headers)
        assert get_deleted.status_code == 404


@pytest.mark.asyncio
async def test_last_admin_protection(setup_test_db):
    session_factory = setup_test_db
    app = create_app()
    admin_id = uuid.uuid4()
    admin_token = create_access_token(user_id=admin_id, username="sole_admin", role=Role.ADMIN)
    headers = {"Authorization": f"Bearer {admin_token}"}

    async with session_factory() as session:
        admin_u = User(id=admin_id, username="sole_admin", hashed_password=hash_password("admin_pass"), role=Role.ADMIN, is_active=True)
        session.add(admin_u)
        await session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Cannot delete sole admin
        del_res = await client.delete(f"/api/v1/users/{admin_id}", headers=headers)
        assert del_res.status_code == 400
        assert "Cannot delete the last remaining active administrator" in del_res.json()["detail"]

        # Cannot demote sole admin
        demote_res = await client.put(f"/api/v1/users/{admin_id}", headers=headers, json={"role": "viewer"})
        assert demote_res.status_code == 400
        assert "Cannot demote the last remaining active administrator" in demote_res.json()["detail"]

        # Cannot deactivate sole admin
        deact_res = await client.put(f"/api/v1/users/{admin_id}", headers=headers, json={"is_active": False})
        assert deact_res.status_code == 400
        assert "Cannot deactivate the last remaining active administrator" in deact_res.json()["detail"]

        # Add second admin
        add_second = await client.post(
            "/api/v1/users",
            headers=headers,
            json={"username": "second_admin", "password": "password123", "role": "admin", "is_active": True},
        )
        assert add_second.status_code == 201

        # Now demoting sole admin succeeds because a second active admin exists
        demote_ok = await client.put(f"/api/v1/users/{admin_id}", headers=headers, json={"role": "operator"})
        assert demote_ok.status_code == 200
        assert demote_ok.json()["role"] == "operator"


@pytest.mark.asyncio
async def test_admin_password_reset_and_change_password(setup_test_db):
    session_factory = setup_test_db
    app = create_app()
    admin_id = uuid.uuid4()
    user_id = uuid.uuid4()
    admin_token = create_access_token(user_id=admin_id, username="admin", role=Role.ADMIN)
    headers = {"Authorization": f"Bearer {admin_token}"}

    async with session_factory() as session:
        admin_u = User(id=admin_id, username="admin", hashed_password=hash_password("admin123"), role=Role.ADMIN)
        regular_u = User(id=user_id, username="user_jane", hashed_password=hash_password("old_pass1"), role=Role.VIEWER)
        session.add_all([admin_u, regular_u])
        await session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Admin resets user_jane password
        reset_res = await client.post(
            f"/api/v1/users/{user_id}/reset-password",
            headers=headers,
            json={"new_password": "NewTempPassword123!", "force_password_change": True},
        )
        assert reset_res.status_code == 200

        # Login as user_jane with new password
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"username": "user_jane", "password": "NewTempPassword123!"},
        )
        assert login_res.status_code == 200
        token_data = login_res.json()
        assert token_data["user"]["force_password_change"] is True
        jane_token = token_data["access_token"]

        # Jane changes own password with wrong current password -> 400
        bad_change = await client.post(
            "/api/v1/auth/change-password",
            headers={"Authorization": f"Bearer {jane_token}"},
            json={"current_password": "wrong_password", "new_password": "JaneFinalPassword999!"},
        )
        assert bad_change.status_code == 400

        # Jane changes own password successfully
        ok_change = await client.post(
            "/api/v1/auth/change-password",
            headers={"Authorization": f"Bearer {jane_token}"},
            json={"current_password": "NewTempPassword123!", "new_password": "JaneFinalPassword999!"},
        )
        assert ok_change.status_code == 200

        # Check me
        me_res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {jane_token}"})
        assert me_res.status_code == 200
        assert me_res.json()["force_password_change"] is False


@pytest.mark.asyncio
async def test_totp_enrol_verify_login_disable(setup_test_db):
    session_factory = setup_test_db
    app = create_app()
    user_id = uuid.uuid4()
    user_token = create_access_token(user_id=user_id, username="totp_user", role=Role.OPERATOR)
    headers = {"Authorization": f"Bearer {user_token}"}

    async with session_factory() as session:
        u = User(id=user_id, username="totp_user", hashed_password=hash_password("mypassword"), role=Role.OPERATOR)
        session.add(u)
        await session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Enrol TOTP
        enrol_res = await client.post("/api/v1/auth/2fa/enrol", headers=headers)
        assert enrol_res.status_code == 200
        enrol_data = enrol_res.json()
        secret = enrol_data["secret"]
        assert "otpauth://" in enrol_data["otpauth_url"]
        assert secret in enrol_data["otpauth_url"]

        # Verify with wrong code -> 400
        bad_verify = await client.post("/api/v1/auth/2fa/verify", headers=headers, json={"code": "000000"})
        assert bad_verify.status_code == 400

        # Verify with valid code -> 200
        valid_code = generate_totp_code(secret)
        ok_verify = await client.post("/api/v1/auth/2fa/verify", headers=headers, json={"code": valid_code})
        assert ok_verify.status_code == 200

        # Login with password only -> triggers 2FA challenge
        login_1 = await client.post("/api/v1/auth/login", json={"username": "totp_user", "password": "mypassword"})
        assert login_1.status_code == 200
        resp_1 = login_1.json()
        assert resp_1["requires_2fa"] is True
        temp_token = resp_1["temp_token"]
        assert temp_token is not None

        # Complete 2FA login with code
        code_2 = generate_totp_code(secret)
        login_2 = await client.post("/api/v1/auth/2fa/login", json={"temp_token": temp_token, "code": code_2})
        assert login_2.status_code == 200
        auth_data = login_2.json()
        assert auth_data["access_token"] != ""
        new_token = auth_data["access_token"]

        # Disable 2FA
        disable_res = await client.post("/api/v1/auth/2fa/disable", headers={"Authorization": f"Bearer {new_token}"})
        assert disable_res.status_code == 200

        # Confirm 2FA disabled on me
        me_res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {new_token}"})
        assert me_res.json()["totp_enabled"] is False


@pytest.mark.asyncio
async def test_session_management_and_revocation(setup_test_db):
    session_factory = setup_test_db
    app = create_app()

    async with session_factory() as session:
        u = User(username="sess_user", hashed_password=hash_password("pwd123"), role=Role.VIEWER)
        session.add(u)
        await session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Login to generate session and cookie
        login_res = await client.post("/api/v1/auth/login", json={"username": "sess_user", "password": "pwd123"})
        assert login_res.status_code == 200
        access_token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}

        # List active sessions
        sess_res = await client.get("/api/v1/auth/sessions", headers=headers)
        assert sess_res.status_code == 200
        sessions = sess_res.json()
        assert sessions["total"] >= 1
        current_sess = sessions["items"][0]
        assert current_sess["is_current"] is True

        # Refresh works
        ref_res = await client.post("/api/v1/auth/refresh")
        assert ref_res.status_code == 200

        # Revoke the session
        rev_res = await client.post(f"/api/v1/auth/sessions/{current_sess['id']}/revoke", headers=headers)
        assert rev_res.status_code == 200

        # Refresh should now fail with 401 Session has been revoked
        ref_fail = await client.post("/api/v1/auth/refresh")
        assert ref_fail.status_code == 401
        assert "Session has been revoked" in ref_fail.json()["detail"]
