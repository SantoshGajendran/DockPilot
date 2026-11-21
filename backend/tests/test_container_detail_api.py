import uuid
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.api.deps import get_docker_gateway
from app.core.constants import Role
from app.core.security import create_access_token
from app.docker.fake import FakeGateway
from app.main import create_app
from app.models.base import Base


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
async def test_container_detail_unauthorized():
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/containers/c1")
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_container_detail_viewer_masked():
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()
    token = create_access_token(user_id=uuid.uuid4(), username="viewer", role=Role.VIEWER)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/containers/c1", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == "c1"
        assert data["name"] == "dockpilot-redis"
        assert len(data["mounts"]) == 1
        assert len(data["networks"]) == 1
        
        # Verify masked
        pw_var = next(e for e in data["env"] if e["key"] == "REDIS_PASSWORD")
        assert pw_var["value"] == "********"
        assert pw_var["is_masked"] is True


@pytest.mark.asyncio
async def test_container_detail_not_found():
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()
    token = create_access_token(user_id=uuid.uuid4(), username="viewer", role=Role.VIEWER)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/containers/c_not_exist", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 404


@pytest.mark.asyncio
async def test_container_env_reveal_rbac():
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()

    viewer_token = create_access_token(user_id=uuid.uuid4(), username="viewer", role=Role.VIEWER)
    operator_token = create_access_token(user_id=uuid.uuid4(), username="operator", role=Role.OPERATOR)
    admin_token = create_access_token(user_id=uuid.uuid4(), username="admin", role=Role.ADMIN)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Viewer denied
        res_v = await client.post(
            "/api/v1/containers/c1/env/reveal",
            headers={"Authorization": f"Bearer {viewer_token}"},
        )
        assert res_v.status_code == 403

        # Operator denied
        res_o = await client.post(
            "/api/v1/containers/c1/env/reveal",
            headers={"Authorization": f"Bearer {operator_token}"},
        )
        assert res_o.status_code == 403

        # Admin allowed
        res_a = await client.post(
            "/api/v1/containers/c1/env/reveal",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_a.status_code == 200
        env_data = res_a.json()["env"]
        pw_var = next(e for e in env_data if e["key"] == "REDIS_PASSWORD")
        assert pw_var["value"] == "secret123"


@pytest.mark.asyncio
async def test_container_stats_sse():
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()
    token = create_access_token(user_id=uuid.uuid4(), username="viewer", role=Role.VIEWER)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get(
            "/api/v1/containers/c1/stats?once=true",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        assert "text/event-stream" in res.headers["content-type"]
        assert "data: " in res.text
        assert "cpu_percent" in res.text


@pytest.mark.asyncio
async def test_container_metrics_history():
    app = create_app()
    token = create_access_token(user_id=uuid.uuid4(), username="viewer", role=Role.VIEWER)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get(
            "/api/v1/containers/c1/metrics?range=1h",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["container_id"] == "c1"
        assert data["range"] == "1h"
        assert isinstance(data["points"], list)
