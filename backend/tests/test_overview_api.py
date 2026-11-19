import asyncio
import uuid
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import create_app
from app.core.security import create_access_token
from app.core.constants import Role
from app.api.deps import get_docker_gateway
from app.docker.fake import FakeGateway
from app.services.overview_service import OverviewCollectorService


@pytest.mark.asyncio
async def test_get_overview_unauthorized():
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/overview")
        assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_overview_authorized():
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()
    token = create_access_token(user_id=uuid.uuid4(), username="viewer_user", role=Role.VIEWER)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/overview", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "host" in data
        assert "containers" in data
        assert "docker_connected" in data


@pytest.mark.asyncio
async def test_overview_stream_sse():
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()
    token = create_access_token(user_id=uuid.uuid4(), username="viewer_user", role=Role.VIEWER)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        async with client.stream(
            "GET",
            "/api/v1/overview/stream",
            headers={"Authorization": f"Bearer {token}"},
        ) as response:
            assert response.status_code == 200
            assert "text/event-stream" in response.headers["content-type"]
            lines = []
            async for line in response.aiter_lines():
                if line:
                    lines.append(line)
                if len(lines) >= 2:
                    break
            assert any("data:" in l or ": ping" in l for l in lines)


@pytest.mark.asyncio
async def test_overview_stream_sse_query_token():
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()
    token = create_access_token(user_id=uuid.uuid4(), username="viewer_user", role=Role.VIEWER)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        async with client.stream(
            "GET",
            f"/api/v1/overview/stream?token={token}",
        ) as response:
            assert response.status_code == 200
            assert "text/event-stream" in response.headers["content-type"]
            lines = []
            async for line in response.aiter_lines():
                if line:
                    lines.append(line)
                if len(lines) >= 2:
                    break
            assert any("data:" in l or ": ping" in l for l in lines)


@pytest.mark.asyncio
async def test_overview_stream_unauthorized():
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/overview/stream")
        assert resp.status_code == 401


@pytest.mark.asyncio
async def test_app_lifespan_starts_and_stops_collector():
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()
    async with app.router.lifespan_context(app):
        collector = getattr(app.state, "overview_collector", None)
        assert collector is not None
        assert collector._running is True
        assert collector.get_snapshot() is not None
    assert collector._running is False


@pytest.mark.asyncio
async def test_overview_stream_subscription_cleanup():
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()
    token = create_access_token(user_id=uuid.uuid4(), username="viewer_user", role=Role.VIEWER)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        async with client.stream(
            "GET",
            "/api/v1/overview/stream",
            headers={"Authorization": f"Bearer {token}"},
        ) as response:
            assert response.status_code == 200
        collector = getattr(app.state, "overview_collector", None)
        if collector:
            assert len(collector._subscribers) == 0


@pytest.mark.asyncio
async def test_overview_collector_queue_overflow_safety():
    fake = FakeGateway()
    collector = OverviewCollectorService(docker_gateway=fake)
    queue = collector.subscribe(maxsize=1)
    snapshot = await collector.collect_metrics()
    await collector.broadcast(snapshot)
    assert queue.qsize() == 1
    # Broadcast a second time into full queue - should not raise QueueFull
    await collector.broadcast(snapshot)
    assert queue.qsize() == 1
    collector.unsubscribe(queue)
