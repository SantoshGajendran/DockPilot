import asyncio
from datetime import datetime, timezone
import pytest
import pytest_asyncio
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

from app.core.config import Settings
from app.docker.fake import FakeGateway
from app.models.base import Base
from app.models.event import ContainerEventRecord
from app.services.event_listener_service import EventListenerService


@pytest_asyncio.fixture
async def session_factory(tmp_path, monkeypatch):
    db_file = tmp_path / "events_test.db"
    engine = create_async_engine(
        f"sqlite+aiosqlite:///{db_file}",
        echo=False,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    monkeypatch.setattr("app.core.database.async_session", factory)
    monkeypatch.setattr("app.core.database.engine", engine)
    yield factory
    await engine.dispose()


@pytest.mark.asyncio
async def test_process_normal_event(session_factory):
    settings = Settings(
        restart_loop_window_seconds=300,
        restart_loop_threshold=3,
        events_reconnect_interval_seconds=1,
    )
    gateway = FakeGateway()
    listener = EventListenerService(
        docker_gateway=gateway,
        session_factory=session_factory,
        settings=settings,
    )

    subscriber_q = listener.subscribe()

    raw_event = {
        "Type": "container",
        "Action": "start",
        "Actor": {
            "ID": "cont-1234567890ab",
            "Attributes": {"name": "test-web", "image": "nginx:alpine"},
        },
        "time": 1700000000,
        "timeNano": 1700000000000000000,
    }

    item = await listener.process_raw_event(raw_event)
    assert item is not None
    assert item.action == "start"
    assert item.container_id == "cont-1234567890ab"
    assert item.container_name == "test-web"
    assert item.is_oom is False
    assert item.is_unexpected_exit is False
    assert item.is_restart_loop is False

    # Check broadcast
    broadcast_item = await asyncio.wait_for(subscriber_q.get(), timeout=1.0)
    assert broadcast_item.event_id == item.event_id

    # Verify database persistence
    async with session_factory() as session:
        result = await session.execute(
            select(ContainerEventRecord).where(ContainerEventRecord.container_id == "cont-1234567890ab")
        )
        record = result.scalar_one_or_none()
        assert record is not None
        assert record.action == "start"


@pytest.mark.asyncio
async def test_event_deduplication(session_factory):
    settings = Settings()
    listener = EventListenerService(session_factory=session_factory, settings=settings)

    raw_event = {
        "Type": "container",
        "Action": "start",
        "Actor": {
            "ID": "c1",
            "Attributes": {"name": "c1-name"},
        },
        "time": 1700000000,
        "timeNano": 1700000000123456789,
    }

    # First insertion
    first = await listener.process_raw_event(raw_event)
    assert first is not None

    # Duplicate insertion with exact same ID
    second = await listener.process_raw_event(raw_event)
    assert second is None

    # Check only 1 row exists
    async with session_factory() as session:
        count = await session.scalar(select(func.count(ContainerEventRecord.id)))
        assert count == 1


@pytest.mark.asyncio
async def test_oom_and_unexpected_exit_flags(session_factory):
    settings = Settings()
    listener = EventListenerService(session_factory=session_factory, settings=settings)

    # Clean exit (exitCode 0)
    clean_exit = {
        "Type": "container",
        "Action": "die",
        "Actor": {
            "ID": "c-clean",
            "Attributes": {"name": "clean", "exitCode": "0"},
        },
        "time": 1700000010,
    }
    item_clean = await listener.process_raw_event(clean_exit)
    assert item_clean is not None
    assert item_clean.exit_code == 0
    assert item_clean.is_unexpected_exit is False
    assert item_clean.is_oom is False

    # Crash exit (exitCode 1)
    crash_exit = {
        "Type": "container",
        "Action": "die",
        "Actor": {
            "ID": "c-crash",
            "Attributes": {"name": "crasher", "exitCode": "1"},
        },
        "time": 1700000020,
    }
    item_crash = await listener.process_raw_event(crash_exit)
    assert item_crash is not None
    assert item_crash.exit_code == 1
    assert item_crash.is_unexpected_exit is True
    assert item_crash.is_oom is False

    # OOM killer event
    oom_event = {
        "Type": "container",
        "Action": "oom",
        "Actor": {
            "ID": "c-oom",
            "Attributes": {"name": "oom-app"},
        },
        "time": 1700000030,
    }
    item_oom = await listener.process_raw_event(oom_event)
    assert item_oom is not None
    assert item_oom.is_oom is True


@pytest.mark.asyncio
async def test_restart_loop_detection(session_factory):
    # Window 300s, threshold 3
    settings = Settings(
        restart_loop_window_seconds=300,
        restart_loop_threshold=3,
    )
    listener = EventListenerService(session_factory=session_factory, settings=settings)

    base_time = 1700000100

    # 1st crash
    e1 = await listener.process_raw_event({
        "Type": "container",
        "Action": "die",
        "Actor": {"ID": "flapping-app", "Attributes": {"name": "flapping", "exitCode": "1"}},
        "time": base_time,
        "timeNano": base_time * 1000000000 + 1,
    })
    assert e1.is_restart_loop is False

    # 2nd crash 20 seconds later
    e2 = await listener.process_raw_event({
        "Type": "container",
        "Action": "die",
        "Actor": {"ID": "flapping-app", "Attributes": {"name": "flapping", "exitCode": "1"}},
        "time": base_time + 20,
        "timeNano": (base_time + 20) * 1000000000 + 2,
    })
    assert e2.is_restart_loop is False

    # 3rd crash 40 seconds later -> hits threshold (>= 3) -> restart loop detected!
    e3 = await listener.process_raw_event({
        "Type": "container",
        "Action": "die",
        "Actor": {"ID": "flapping-app", "Attributes": {"name": "flapping", "exitCode": "1"}},
        "time": base_time + 40,
        "timeNano": (base_time + 40) * 1000000000 + 3,
    })
    assert e3.is_restart_loop is True


@pytest.mark.asyncio
async def test_reconnect_after_stream_drop(session_factory):
    settings = Settings(events_reconnect_interval_seconds=0.01)

    class FlakyGateway(FakeGateway):
        def __init__(self):
            super().__init__()
            self.calls = 0

        async def stream_events(self, since=None):
            self.calls += 1
            if self.calls == 1:
                # First attempt drops immediately
                raise ConnectionResetError("Connection lost to Docker socket")
            # Second attempt succeeds and yields event
            yield {
                "Type": "container",
                "Action": "start",
                "Actor": {"ID": "reconnect-cont", "Attributes": {"name": "rec"}},
                "time": 1700000500,
                "timeNano": 1700000500123456789,
            }

    flaky_gw = FlakyGateway()
    listener = EventListenerService(
        docker_gateway=flaky_gw,
        session_factory=session_factory,
        settings=settings,
    )

    await listener.start()
    # Allow background loop to experience failure and reconnect
    await asyncio.sleep(0.1)
    await listener.stop()

    assert flaky_gw.calls >= 2

    async with session_factory() as session:
        count = await session.scalar(
            select(func.count(ContainerEventRecord.id)).where(
                ContainerEventRecord.container_id == "reconnect-cont"
            )
        )
        assert count == 1
