import pytest
from httpx import AsyncClient, ASGITransport
from app.main import create_app
from app.api.deps import get_docker_gateway
from app.docker.fake import FakeGateway

@pytest.mark.asyncio
async def test_health_endpoint():
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "docker" in data
        assert data["docker"] == "connected"
        assert data["database"] == "connected"

@pytest.mark.asyncio
async def test_version_endpoint():
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/version")
        assert response.status_code == 200
        data = response.json()
        assert data["version"] == "0.1.0"
        assert data["app"] == "DockPilot"

@pytest.mark.asyncio
async def test_health_endpoint_docker_unavailable():
    app = create_app()
    fake = FakeGateway()
    # Mock ping failure
    fake.ping = lambda: False
    async def fake_ping_false():
        return False
    fake.ping = fake_ping_false
    app.dependency_overrides[get_docker_gateway] = lambda: fake

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["docker"] == "unavailable"

@pytest.mark.asyncio
async def test_api_v1_prefix_endpoints():
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        health_resp = await client.get("/api/v1/health")
        assert health_resp.status_code == 200
        assert health_resp.json()["status"] == "ok"

        version_resp = await client.get("/api/v1/version")
        assert version_resp.status_code == 200
        assert version_resp.json()["version"] == "0.1.0"


@pytest.mark.asyncio
async def test_deps_get_docker_gateway(monkeypatch):
    from unittest.mock import MagicMock
    import docker
    from app.api import deps
    from app.docker.engine import EngineGateway

    monkeypatch.setattr(docker, "DockerClient", lambda **kwargs: MagicMock())
    deps.get_docker_gateway.cache_clear()
    gw = deps.get_docker_gateway()
    assert isinstance(gw, EngineGateway)

@pytest.mark.asyncio
async def test_deps_get_db(monkeypatch):
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from app.core import database
    from app.api.deps import get_db

    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    test_session_factory = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)
    monkeypatch.setattr(database, "async_session", test_session_factory)

    session_gen = get_db()
    session = await anext(session_gen)
    assert isinstance(session, AsyncSession)
    await session.close()
