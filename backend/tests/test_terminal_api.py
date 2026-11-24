import asyncio
import json
import uuid
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool
from starlette.testclient import TestClient, WebSocketDenialResponse
from starlette.websockets import WebSocketDisconnect

from app.api.deps import get_docker_gateway
from app.core.config import get_settings
from app.core.constants import Role
from app.core.security import create_access_token
from app.docker.fake import FakeGateway
from app.main import create_app
from app.models.audit import AuditLog
from app.models.base import Base
from app.models.terminal import TerminalSession
from app.services.terminal_service import _ACTIVE_TERMINAL_SESSIONS


@pytest.fixture(autouse=True)
def setup_test_db(tmp_path, monkeypatch):
    _ACTIVE_TERMINAL_SESSIONS.clear()
    db_file = tmp_path / "test_terminal.db"
    engine = create_async_engine(
        f"sqlite+aiosqlite:///{db_file}",
        echo=False,
    )

    async def init_db():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    asyncio.run(init_db())

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    monkeypatch.setattr("app.core.database.async_session", session_factory)
    monkeypatch.setattr("app.core.database.engine", engine)
    monkeypatch.setattr("app.main.async_session", session_factory)
    monkeypatch.setattr("app.api.v1.terminal.async_session", session_factory)

    yield session_factory

    async def dispose_db():
        await engine.dispose()

    asyncio.run(dispose_db())
    _ACTIVE_TERMINAL_SESSIONS.clear()


@pytest.fixture
def fake_gateway():
    return FakeGateway()


def test_terminal_disabled_returns_404(fake_gateway, monkeypatch):
    """Test feature flag off returns 404 on WebSocket and HTTP endpoints."""
    monkeypatch.setenv("TERMINAL_ENABLED", "false")
    get_settings.cache_clear()
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: fake_gateway

    token = create_access_token(user_id=uuid.uuid4(), username="admin", role=Role.ADMIN)

    client = TestClient(app)

    # 1. WebSocket /containers/{id}/exec returns 404
    with pytest.raises(WebSocketDenialResponse) as exc_info:
        with client.websocket_connect(f"/api/v1/containers/c1/exec?token={token}"):
            pass
    assert exc_info.value.status_code == 404

    # 2. WebSocket alias /containers/{id}/exec returns 404
    with pytest.raises(WebSocketDenialResponse) as exc_info_alias:
        with client.websocket_connect(f"/containers/c1/exec?token={token}"):
            pass
    assert exc_info_alias.value.status_code == 404

    # 3. HTTP GET status returns 404
    res = client.get(
        "/api/v1/containers/c1/terminal/status",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 404


def test_terminal_non_admin_returns_403(fake_gateway, monkeypatch):
    """Test non-admin (operator or viewer) receives 403 Forbidden."""
    monkeypatch.setenv("TERMINAL_ENABLED", "true")
    get_settings.cache_clear()
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: fake_gateway

    client = TestClient(app)

    # Operator role -> 403
    op_token = create_access_token(user_id=uuid.uuid4(), username="operator", role=Role.OPERATOR)
    with pytest.raises(WebSocketDenialResponse) as exc_op:
        with client.websocket_connect(f"/api/v1/containers/c1/exec?token={op_token}"):
            pass
    assert exc_op.value.status_code == 403

    # Viewer role -> 403
    view_token = create_access_token(user_id=uuid.uuid4(), username="viewer", role=Role.VIEWER)
    with pytest.raises(WebSocketDenialResponse) as exc_view:
        with client.websocket_connect(f"/api/v1/containers/c1/exec?token={view_token}"):
            pass
    assert exc_view.value.status_code == 403

    # HTTP endpoint as viewer -> 403
    res = client.get(
        "/api/v1/containers/c1/terminal/status",
        headers={"Authorization": f"Bearer {view_token}"},
    )
    assert res.status_code == 403


def test_terminal_unauthenticated_returns_401(fake_gateway, monkeypatch):
    """Test unauthenticated websocket connection receives 401."""
    monkeypatch.setenv("TERMINAL_ENABLED", "true")
    get_settings.cache_clear()
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: fake_gateway

    client = TestClient(app)
    with pytest.raises(WebSocketDenialResponse) as exc_info:
        with client.websocket_connect("/api/v1/containers/c1/exec"):
            pass
    assert exc_info.value.status_code == 401


def test_terminal_nonexistent_container_returns_404(fake_gateway, monkeypatch):
    """Test nonexistent container returns 404."""
    monkeypatch.setenv("TERMINAL_ENABLED", "true")
    get_settings.cache_clear()
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: fake_gateway

    token = create_access_token(user_id=uuid.uuid4(), username="admin", role=Role.ADMIN)
    client = TestClient(app)

    with pytest.raises(WebSocketDenialResponse) as exc_info:
        with client.websocket_connect(f"/api/v1/containers/c_does_not_exist/exec?token={token}"):
            pass
    assert exc_info.value.status_code == 404


def test_terminal_disallowed_shell_returns_400(fake_gateway, monkeypatch):
    """Test requesting shell outside allowed list returns 400."""
    monkeypatch.setenv("TERMINAL_ENABLED", "true")
    get_settings.cache_clear()
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: fake_gateway

    token = create_access_token(user_id=uuid.uuid4(), username="admin", role=Role.ADMIN)
    client = TestClient(app)

    with pytest.raises(WebSocketDenialResponse) as exc_info:
        with client.websocket_connect(f"/api/v1/containers/c1/exec?token={token}&shell=/bin/zsh"):
            pass
    assert exc_info.value.status_code == 400


def test_terminal_resize_forwarded(fake_gateway, monkeypatch):
    """Test resize messages are forwarded to docker gateway."""
    monkeypatch.setenv("TERMINAL_ENABLED", "true")
    get_settings.cache_clear()
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: fake_gateway

    token = create_access_token(user_id=uuid.uuid4(), username="admin", role=Role.ADMIN)
    client = TestClient(app)

    with client.websocket_connect(f"/api/v1/containers/c1/exec?token={token}") as ws:
        # Receive initial prompt from FakeExecSession
        msg = ws.receive_bytes()
        assert b"Connected to container shell" in msg

        # Send resize command
        resize_cmd = json.dumps({"type": "resize", "cols": 120, "rows": 40})
        ws.send_text(resize_cmd)

        # Allow loop to handle resize
        import time
        time.sleep(0.05)

        # Send exit command to end session cleanly
        ws.send_text("exit\r")
        time.sleep(0.05)

    # Check fake gateway exec session recorded resize
    assert len(fake_gateway.exec_sessions) == 1
    session = list(fake_gateway.exec_sessions.values())[0]
    assert (40, 120) in session.resized_history
    assert session.height == 40
    assert session.width == 120


def test_terminal_idle_timeout_closes_socket(fake_gateway, monkeypatch):
    """Test idle timeout closes the socket after configured seconds of inactivity."""
    monkeypatch.setenv("TERMINAL_ENABLED", "true")
    monkeypatch.setenv("TERMINAL_IDLE_TIMEOUT_SECONDS", "1")
    get_settings.cache_clear()
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: fake_gateway

    token = create_access_token(user_id=uuid.uuid4(), username="admin", role=Role.ADMIN)
    client = TestClient(app)

    with client.websocket_connect(f"/api/v1/containers/c1/exec?token={token}") as ws:
        msg = ws.receive_bytes()
        assert b"Connected" in msg

        # Wait past idle timeout (1.5 seconds)
        import time
        time.sleep(1.5)

        # Next receive or send should disconnect / close
        with pytest.raises(WebSocketDisconnect) as exc_disc:
            ws.receive_bytes()
        assert exc_disc.value.code in (1000, 4408)


def test_terminal_concurrent_limit_enforced(fake_gateway, monkeypatch):
    """Test maximum concurrent sessions limit is enforced."""
    monkeypatch.setenv("TERMINAL_ENABLED", "true")
    monkeypatch.setenv("TERMINAL_MAX_CONCURRENT_SESSIONS", "1")
    get_settings.cache_clear()
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: fake_gateway

    token = create_access_token(user_id=uuid.uuid4(), username="admin", role=Role.ADMIN)
    client = TestClient(app)

    # Open first session
    with client.websocket_connect(f"/api/v1/containers/c1/exec?token={token}") as ws1:
        msg1 = ws1.receive_bytes()
        assert b"Connected" in msg1

        # Attempt to open second session - should be rejected with 429
        with pytest.raises(WebSocketDenialResponse) as exc_info:
            with client.websocket_connect(f"/api/v1/containers/c1/exec?token={token}"):
                pass
        assert exc_info.value.status_code == 429

        # Close first session cleanly
        ws1.send_text("exit\r")
        import time
        time.sleep(0.05)


@pytest.mark.asyncio
async def test_terminal_audit_and_transcript_logging(fake_gateway, setup_test_db, monkeypatch):
    """Test audit log records start/end and session transcript is saved."""
    monkeypatch.setenv("TERMINAL_ENABLED", "true")
    monkeypatch.setenv("TERMINAL_RECORD_SESSIONS", "true")
    get_settings.cache_clear()
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: fake_gateway

    admin_id = uuid.uuid4()
    token = create_access_token(user_id=admin_id, username="admin", role=Role.ADMIN)
    client = TestClient(app)

    with client.websocket_connect(f"/api/v1/containers/c1/exec?token={token}") as ws:
        msg = ws.receive_bytes()
        assert b"Connected" in msg

        # Send command
        ws.send_text("echo hello\r")
        import time
        time.sleep(0.05)

        # Send exit
        ws.send_text("exit\r")
        import time
        time.sleep(0.1)

    # Wait for session cleanup and persistence to finish
    for _ in range(20):
        if len(_ACTIVE_TERMINAL_SESSIONS) == 0:
            await asyncio.sleep(0.05)
            break
        await asyncio.sleep(0.05)

    # Verify database records
    session_factory = setup_test_db
    async with session_factory() as db:
        # Check audit logs
        audit_res = await db.execute(select(AuditLog).order_by(AuditLog.timestamp.asc()))
        audits = audit_res.scalars().all()
        actions = [a.action for a in audits]
        assert "terminal.session_start" in actions
        assert "terminal.session_end" in actions

        end_audit = next(a for a in audits if a.action == "terminal.session_end")
        assert end_audit.payload.get("container_name") == "dockpilot-redis"
        assert end_audit.payload.get("exit_status") in ("completed", "disconnected")

        # Check terminal_sessions table
        sess_res = await db.execute(select(TerminalSession))
        sessions = sess_res.scalars().all()
        assert len(sessions) == 1
        saved_session = sessions[0]
        assert saved_session.container_id == "c1"
        assert saved_session.username == "admin"
        assert saved_session.transcript is not None
        assert "Connected to container shell" in saved_session.transcript


@pytest.mark.asyncio
async def test_terminal_status_and_sessions_api(fake_gateway, setup_test_db, monkeypatch):
    """Test GET /containers/{id}/terminal/status and /containers/{id}/terminal/sessions endpoints."""
    monkeypatch.setenv("TERMINAL_ENABLED", "true")
    get_settings.cache_clear()
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: fake_gateway

    token = create_access_token(user_id=uuid.uuid4(), username="admin", role=Role.ADMIN)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Get status
        status_res = await ac.get(
            "/api/v1/containers/c1/terminal/status",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert status_res.status_code == 200
        status_data = status_res.json()
        assert status_data["enabled"] is True
        assert "/bin/sh" in status_data["allowed_shells"]
        assert status_data["idle_timeout_seconds"] == 300

        # 2. Get sessions list
        sess_res = await ac.get(
            "/api/v1/containers/c1/terminal/sessions",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert sess_res.status_code == 200
        sess_data = sess_res.json()
        assert "sessions" in sess_data
        assert "total_count" in sess_data
