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
async def test_host_endpoints_unauthorized():
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/host/info")
        assert res.status_code == 401

        res = await client.get("/api/v1/host/metrics")
        assert res.status_code == 401

        res = await client.get("/api/v1/host/metrics/history")
        assert res.status_code == 401

        res = await client.get("/api/v1/host/docker-usage")
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_get_host_info_authorized():
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()
    token = create_access_token(user_id=uuid.uuid4(), username="viewer", role=Role.VIEWER)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/host/info", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert "hostname" in data
        assert "cpu_cores_logical" in data
        assert data["docker_version"] == "27.3.1"
        assert data["docker_storage_driver"] == "overlay2"


@pytest.mark.asyncio
async def test_get_host_metrics_authorized():
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()
    token = create_access_token(user_id=uuid.uuid4(), username="viewer", role=Role.VIEWER)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/host/metrics", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert "cpu" in data
        assert "memory" in data
        assert "mounts" in data
        assert "disk_io" in data
        assert "network" in data
        assert "top_processes" in data


@pytest.mark.asyncio
async def test_get_host_metrics_history():
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()
    token = create_access_token(user_id=uuid.uuid4(), username="viewer", role=Role.VIEWER)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Valid range
        res = await client.get("/api/v1/host/metrics/history?range=6h", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["range"] == "6h"
        assert len(data["points"]) > 0

        # Invalid range
        res_inv = await client.get("/api/v1/host/metrics/history?range=invalid", headers={"Authorization": f"Bearer {token}"})
        assert res_inv.status_code == 422


@pytest.mark.asyncio
async def test_get_docker_usage_authorized():
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()
    token = create_access_token(user_id=uuid.uuid4(), username="viewer", role=Role.VIEWER)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/host/docker-usage", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["images"]["count"] == 14
        assert data["containers"]["count"] == 6
        assert data["volumes"]["count"] == 8
        assert data["build_cache"]["count"] == 22
