import asyncio
from datetime import datetime, timedelta, timezone
import json
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
from app.models.event import ContainerEventRecord
from app.schemas.events import EventItem


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
async def test_events_unauthorized():
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/events")
        assert res.status_code == 401

        res = await client.get("/api/v1/events/stream")
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_list_events_and_filtering(setup_test_db):
    session_factory = setup_test_db
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()

    now = datetime.now(timezone.utc)
    async with session_factory() as session:
        e1 = ContainerEventRecord(
            event_id="ev_1",
            timestamp=now - timedelta(minutes=10),
            action="start",
            container_id="c_web",
            container_name="web-service",
            image="nginx:alpine",
            exit_code=None,
            is_oom=False,
            is_unexpected_exit=False,
            is_restart_loop=False,
            attributes={},
        )
        e2 = ContainerEventRecord(
            event_id="ev_2",
            timestamp=now - timedelta(minutes=5),
            action="die",
            container_id="c_db",
            container_name="db-service",
            image="postgres:16",
            exit_code=1,
            is_oom=False,
            is_unexpected_exit=True,
            is_restart_loop=False,
            attributes={"exitCode": "1"},
        )
        e3 = ContainerEventRecord(
            event_id="ev_3",
            timestamp=now - timedelta(minutes=1),
            action="oom",
            container_id="c_worker",
            container_name="worker-service",
            image="python:3.12",
            exit_code=137,
            is_oom=True,
            is_unexpected_exit=False,
            is_restart_loop=True,
            attributes={},
        )
        session.add_all([e1, e2, e3])
        await session.commit()

    token = create_access_token(user_id=uuid.uuid4(), username="viewer", role=Role.VIEWER)
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # All events
        res = await client.get("/api/v1/events", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 3
        assert len(data["items"]) == 3

        # Filter by container_name
        res = await client.get("/api/v1/events?container_name=db", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 1
        assert data["items"][0]["container_name"] == "db-service"

        # Filter by action
        res = await client.get("/api/v1/events?action=start", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 1
        assert data["items"][0]["action"] == "start"

        # Filter incidents_only
        res = await client.get("/api/v1/events?incidents_only=true", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 2
        actions = [item["action"] for item in data["items"]]
        assert "die" in actions
        assert "oom" in actions
        assert "start" not in actions


@pytest.mark.asyncio
async def test_events_cursor_pagination(setup_test_db):
    session_factory = setup_test_db
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()

    now = datetime.now(timezone.utc)
    async with session_factory() as session:
        for i in range(5):
            rec = ContainerEventRecord(
                event_id=f"page_ev_{i}",
                timestamp=now - timedelta(minutes=i),
                action="start",
                container_id=f"c_{i}",
                container_name=f"container-{i}",
                image="alpine:latest",
                exit_code=None,
                is_oom=False,
                is_unexpected_exit=False,
                is_restart_loop=False,
                attributes={},
            )
            session.add(rec)
        await session.commit()

    token = create_access_token(user_id=uuid.uuid4(), username="viewer", role=Role.VIEWER)
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Page 1 (limit 2)
        res = await client.get("/api/v1/events?limit=2", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert len(data["items"]) == 2
        assert data["has_more"] is True
        cursor = data["next_cursor"]
        assert cursor is not None

        # Page 2 (limit 2 with cursor)
        res2 = await client.get(f"/api/v1/events?limit=2&cursor={cursor}", headers=headers)
        assert res2.status_code == 200
        data2 = res2.json()
        assert len(data2["items"]) == 2
        assert data2["has_more"] is True

        # Items in Page 1 and Page 2 should not overlap
        p1_ids = [item["id"] for item in data["items"]]
        p2_ids = [item["id"] for item in data2["items"]]
        assert set(p1_ids).isdisjoint(set(p2_ids))


@pytest.mark.asyncio
async def test_events_stream_sse():
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()
    token = create_access_token(user_id=uuid.uuid4(), username="viewer", role=Role.VIEWER)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Check stream connection with streaming request
        async with client.stream(
            "GET", "/api/v1/events/stream", headers={"Authorization": f"Bearer {token}"}
        ) as res:
            assert res.status_code == 200
            assert "text/event-stream" in res.headers.get("content-type", "")
            first_line = await anext(res.aiter_lines())
            assert ": connected" in first_line
