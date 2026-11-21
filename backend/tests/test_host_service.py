from collections import namedtuple
from datetime import datetime, timedelta, timezone
import uuid
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import Settings
from app.docker.fake import FakeGateway
from app.models.base import Base
from app.models.metrics import HostMetricRecord
from app.services.host_service import HostService, _get_cpu_model


@pytest_asyncio.fixture
async def async_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session
    await engine.dispose()


@pytest.mark.asyncio
async def test_get_host_info():
    gateway = FakeGateway()
    service = HostService(docker_gateway=gateway)
    info = await service.get_host_info()

    assert info.hostname
    assert info.os_name
    assert info.cpu_cores_logical >= 1
    assert info.cpu_cores_physical >= 1
    assert info.total_memory_bytes > 0
    assert info.docker_version == "27.3.1"
    assert info.docker_storage_driver == "overlay2"


def test_collect_live_metrics(monkeypatch):
    gateway = FakeGateway()
    service = HostService(docker_gateway=gateway)

    # Mock psutil calls for deterministic test
    VMem = namedtuple("VMem", ["total", "used", "available", "percent"])
    Swap = namedtuple("Swap", ["total", "used", "percent"])
    Partition = namedtuple("Partition", ["mountpoint", "device", "fstype"])
    Usage = namedtuple("Usage", ["total", "used", "free", "percent"])
    DiskIO = namedtuple("DiskIO", ["read_bytes", "write_bytes", "read_count", "write_count"])
    NetIO = namedtuple("NetIO", ["bytes_recv", "bytes_sent", "packets_recv", "packets_sent", "errin", "errout"])

    monkeypatch.setattr("psutil.cpu_percent", lambda percpu=False: [12.5, 25.0] if percpu else 18.75)
    monkeypatch.setattr("psutil.virtual_memory", lambda: VMem(16000000000, 8000000000, 8000000000, 50.0))
    monkeypatch.setattr("psutil.swap_memory", lambda: Swap(4000000000, 1000000000, 25.0))
    monkeypatch.setattr("psutil.disk_partitions", lambda all=False: [Partition("/", "/dev/sda1", "ext4")])
    monkeypatch.setattr("psutil.disk_usage", lambda path: Usage(100000000000, 40000000000, 60000000000, 40.0))
    monkeypatch.setattr("psutil.disk_io_counters", lambda: DiskIO(1000000, 2000000, 100, 200))
    monkeypatch.setattr("psutil.net_io_counters", lambda pernic=True: {"eth0": NetIO(500000, 300000, 50, 30, 0, 0)})
    monkeypatch.setattr("psutil.getloadavg", lambda: (0.45, 0.55, 0.65))

    metrics = service.collect_live_metrics()

    assert metrics.cpu.overall_percent == 18.75
    assert len(metrics.cpu.cores_percent) == 2
    assert metrics.memory.total_bytes == 16000000000
    assert metrics.memory.percent == 50.0
    assert metrics.memory.swap_percent == 25.0
    assert len(metrics.mounts) == 1
    assert metrics.mounts[0].mountpoint == "/"
    assert metrics.mounts[0].percent == 40.0
    assert len(metrics.network) == 1
    assert metrics.network[0].interface_name == "eth0"
    assert metrics.load_1m == 0.45


@pytest.mark.asyncio
async def test_metrics_history_empty_fallback(async_db: AsyncSession):
    gateway = FakeGateway()
    service = HostService(docker_gateway=gateway)

    history = await service.get_metrics_history(async_db, range_str="1h")
    assert history.range == "1h"
    assert len(history.points) == 12
    assert history.points[0].cpu_percent >= 0


@pytest.mark.asyncio
async def test_metrics_history_downsampling(async_db: AsyncSession):
    gateway = FakeGateway()
    service = HostService(docker_gateway=gateway)

    # Insert 150 records into DB
    now = datetime.now(timezone.utc)
    for i in range(150):
        t = now - timedelta(minutes=150 - i)
        rec = HostMetricRecord(
            id=uuid.uuid4(),
            timestamp=t,
            cpu_percent=10.0 + (i % 20),
            memory_bytes=4000000000 + i * 1000,
            memory_total=16000000000,
            swap_bytes=500000000,
            swap_total=4000000000,
            disk_read_bytes=10000,
            disk_write_bytes=20000,
            network_rx_bytes=50000,
            network_tx_bytes=30000,
            load_1m=0.5,
        )
        async_db.add(rec)
    await async_db.commit()

    # Query with range 6h
    history = await service.get_metrics_history(async_db, range_str="6h")
    assert history.range == "6h"
    assert len(history.points) == 100


@pytest.mark.asyncio
async def test_get_docker_disk_usage():
    gateway = FakeGateway()
    service = HostService(docker_gateway=gateway)
    usage = await service.get_docker_disk_usage()

    assert usage.images.count == 14
    assert usage.images.total_bytes > 0
    assert usage.containers.count == 6
    assert usage.volumes.count == 8
    assert usage.build_cache.count == 22
    assert usage.build_cache.reclaimable_percent == 66.6
