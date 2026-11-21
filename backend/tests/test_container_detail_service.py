from datetime import datetime, timedelta, timezone
import uuid
import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.constants import Role
from app.docker.fake import FakeGateway
from app.models.audit import AuditLog
from app.models.base import Base
from app.models.metrics import ContainerMetricRecord
from app.services.container_detail_service import (
    get_container_details,
    get_container_metrics_history,
    is_secret_key,
    parse_env,
    record_container_metric,
    reveal_container_env,
    stream_container_stats,
)


@pytest_asyncio.fixture
async def async_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session

    await engine.dispose()


def test_is_secret_key():
    patterns = ["*PASSWORD*", "*SECRET*", "*TOKEN*", "*KEY*"]
    assert is_secret_key("REDIS_PASSWORD", patterns) is True
    assert is_secret_key("MY_SECRET_VAL", patterns) is True
    assert is_secret_key("API_KEY", patterns) is True
    assert is_secret_key("JWT_TOKEN", patterns) is True
    assert is_secret_key("PORT", patterns) is False
    assert is_secret_key("HOST", patterns) is False


def test_parse_env_masking():
    patterns = ["*PASSWORD*", "*SECRET*", "*TOKEN*", "*KEY*"]
    raw = ["REDIS_PASSWORD=secret123", "PORT=6379", "API_KEY=my_key"]
    
    # Masked
    masked = parse_env(raw, patterns, mask_secrets=True)
    assert len(masked) == 3
    assert masked[0].key == "REDIS_PASSWORD"
    assert masked[0].value == "********"
    assert masked[0].is_masked is True
    assert masked[1].key == "PORT"
    assert masked[1].value == "6379"
    assert masked[1].is_masked is False
    assert masked[2].key == "API_KEY"
    assert masked[2].value == "********"
    assert masked[2].is_masked is True

    # Unmasked
    unmasked = parse_env(raw, patterns, mask_secrets=False)
    assert unmasked[0].value == "secret123"
    assert unmasked[0].is_masked is True
    assert unmasked[1].value == "6379"
    assert unmasked[1].is_masked is False
    assert unmasked[2].value == "my_key"
    assert unmasked[2].is_masked is True


@pytest.mark.asyncio
async def test_get_container_details_success():
    gw = FakeGateway()
    detail = await get_container_details(gw, "c1")
    assert detail.id == "c1"
    assert detail.name == "dockpilot-redis"
    assert detail.image == "redis:7-alpine"
    assert detail.state == "running"
    assert detail.health == "healthy"
    assert detail.command == "redis-server --protected-mode no"
    assert len(detail.mounts) == 1
    assert detail.mounts[0].destination == "/data"
    assert len(detail.networks) == 1
    assert detail.networks[0].network_name == "dockpilot_default"
    assert detail.networks[0].ip_address == "172.20.0.2"
    assert detail.healthcheck is not None
    assert detail.healthcheck.status == "healthy"

    # Verify secret is masked in default inspection
    pw_item = next(e for e in detail.env if e.key == "REDIS_PASSWORD")
    assert pw_item.value == "********"
    assert pw_item.is_masked is True


@pytest.mark.asyncio
async def test_get_container_details_not_found():
    gw = FakeGateway()
    with pytest.raises(HTTPException) as exc:
        await get_container_details(gw, "c_non_existent")
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_reveal_container_env_audited(async_db: AsyncSession):
    gw = FakeGateway()
    user_id = uuid.uuid4()
    username = "admin_user"
    ip = "127.0.0.1"

    response = await reveal_container_env(
        gateway=gw,
        container_id="c1",
        user_id=user_id,
        username=username,
        ip=ip,
        db=async_db,
    )
    assert len(response.env) == 3
    pw_item = next(e for e in response.env if e.key == "REDIS_PASSWORD")
    assert pw_item.value == "secret123"

    # Verify AuditLog written
    stmt = select(AuditLog).where(AuditLog.action == "container.reveal_env")
    audit = (await async_db.execute(stmt)).scalars().first()
    assert audit is not None
    assert audit.target_id == "c1"
    assert audit.username == username
    assert audit.user_id == user_id
    assert audit.ip_address == ip


@pytest.mark.asyncio
async def test_stream_container_stats_once():
    gw = FakeGateway()
    generator = stream_container_stats(gw, "c1", once=True)
    chunks = [chunk async for chunk in generator]
    assert len(chunks) == 1
    assert chunks[0].startswith("data: ")
    assert "cpu_percent" in chunks[0]
    assert "memory_bytes" in chunks[0]
    assert "net_rx_bytes" in chunks[0]


@pytest.mark.asyncio
async def test_record_and_get_metrics_history(async_db: AsyncSession):
    container_id = "test-c1"
    now = datetime.now(timezone.utc)

    # Insert 150 points spaced 1 minute apart
    for i in range(150):
        t = now - timedelta(minutes=150 - i)
        rec = ContainerMetricRecord(
            container_id=container_id,
            timestamp=t,
            cpu_percent=1.0 + (i % 10),
            memory_bytes=1000000 + i * 100,
            memory_limit=10000000,
            network_rx_bytes=i * 1000,
            network_tx_bytes=i * 500,
            block_read_bytes=i * 200,
            block_write_bytes=i * 100,
        )
        async_db.add(rec)
    await async_db.commit()

    # Query metrics history with 6h range
    res = await get_container_metrics_history(
        container_id=container_id,
        range_str="6h",
        db=async_db,
    )
    assert res.container_id == container_id
    assert res.range == "6h"
    # Should downsample to at most 100 points
    assert len(res.points) == 100
    assert res.points[0].cpu_percent >= 0.0
