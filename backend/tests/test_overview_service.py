import asyncio
from typing import Any, Dict
import pytest
from app.docker.fake import FakeGateway
from app.services.overview_service import OverviewCollectorService
from app.core.config import Settings

@pytest.mark.asyncio
async def test_overview_collector_collect_metrics():
    gateway = FakeGateway()
    collector = OverviewCollectorService(docker_gateway=gateway)
    
    snapshot = await collector.collect_metrics()
    assert snapshot is not None
    assert snapshot.host.cpu_percent >= 0.0
    assert snapshot.host.memory_total_bytes > 0
    assert snapshot.containers.total == 5
    assert snapshot.containers.running == 2
    assert snapshot.docker_connected is True
    assert len(snapshot.top_cpu) <= 5
    assert len(snapshot.recent_events) >= 1

@pytest.mark.asyncio
async def test_overview_collector_broadcast_queue():
    gateway = FakeGateway()
    collector = OverviewCollectorService(docker_gateway=gateway)
    
    queue = collector.subscribe()
    snapshot = await collector.collect_metrics()
    await collector.broadcast(snapshot)
    
    received = await queue.get()
    assert received.host.memory_total_bytes == snapshot.host.memory_total_bytes
    collector.unsubscribe(queue)

@pytest.mark.asyncio
async def test_overview_collector_docker_error_graceful():
    class BrokenGateway(FakeGateway):
        async def list_containers(self, all: bool = True):
            raise RuntimeError("Docker daemon connection failed")

    collector = OverviewCollectorService(docker_gateway=BrokenGateway())
    snapshot = await collector.collect_metrics()
    assert snapshot.docker_connected is False
    assert snapshot.containers.total == 0
    assert snapshot.host.cpu_percent >= 0.0

@pytest.mark.asyncio
async def test_overview_collector_snapshot_caching():
    gateway = FakeGateway()
    collector = OverviewCollectorService(docker_gateway=gateway)
    
    assert collector.get_snapshot() is None
    snapshot = await collector.collect_metrics()
    cached = collector.get_snapshot()
    assert cached is not None
    assert cached.host.memory_total_bytes == snapshot.host.memory_total_bytes

@pytest.mark.asyncio
async def test_overview_collector_container_grouping_and_ranking():
    containers = {
        "c1": {
            "id": "c1",
            "name": "web",
            "image": "nginx:latest",
            "state": "running",
            "status": "Up 2 hours",
        },
        "c2": {
            "id": "c2",
            "name": "db",
            "image": "postgres:16",
            "state": "running",
            "status": "Up 3 hours",
        },
        "c3": {
            "id": "c3",
            "name": "worker",
            "image": "worker:latest",
            "state": "restarting",
            "status": "Restarting (1) 5 seconds ago",
        },
        "c4": {
            "id": "c4",
            "name": "cache",
            "image": "redis:alpine",
            "state": "paused",
            "status": "Up 1 hour (paused)",
        },
        "c5": {
            "id": "c5",
            "name": "cron",
            "image": "busybox",
            "state": "exited",
            "status": "Exited (0) 10 minutes ago",
        },
        "c6": {
            "id": "c6",
            "name": "api",
            "image": "api:v1",
            "state": "running",
            "status": "Up 10 minutes (unhealthy)",
        },
    }
    gateway = FakeGateway(containers=containers)
    gateway.stats["c1"] = {
        "cpu_percent": 15.0,
        "memory_bytes": 100 * 1024 * 1024,
        "memory_limit": 1024 * 1024 * 1024,
        "memory_percent": 9.77,
    }
    gateway.stats["c2"] = {
        "cpu_percent": 35.0,
        "memory_bytes": 500 * 1024 * 1024,
        "memory_limit": 1024 * 1024 * 1024,
        "memory_percent": 48.83,
    }
    gateway.stats["c6"] = {
        "cpu_percent": 5.0,
        "memory_bytes": 50 * 1024 * 1024,
        "memory_limit": 1024 * 1024 * 1024,
        "memory_percent": 4.88,
    }

    settings = Settings(top_containers_limit=2)
    collector = OverviewCollectorService(docker_gateway=gateway, settings=settings)
    snapshot = await collector.collect_metrics()

    assert snapshot.containers.total == 6
    assert snapshot.containers.running == 2  # c1, c2
    assert snapshot.containers.restarting == 1  # c3
    assert snapshot.containers.paused == 1  # c4
    assert snapshot.containers.exited == 1  # c5
    assert snapshot.containers.unhealthy == 1  # c6

    # Verify top sorting and limit
    assert len(snapshot.top_cpu) == 2
    assert snapshot.top_cpu[0].id == "c2"  # 35.0%
    assert snapshot.top_cpu[1].id == "c1"  # 15.0%

    assert len(snapshot.top_memory) == 2
    assert snapshot.top_memory[0].id == "c2"  # 500MB
    assert snapshot.top_memory[1].id == "c1"  # 100MB

@pytest.mark.asyncio
async def test_overview_collector_container_stats_failure_resilience():
    class PartialFailGateway(FakeGateway):
        async def get_container_stats(self, container_id: str) -> Dict[str, Any]:
            if container_id == "c1":
                raise RuntimeError("Stats timed out for c1")
            return await super().get_container_stats(container_id)

    containers = {
        "c1": {"id": "c1", "name": "c1", "image": "img1", "state": "running", "status": "Up 1m"},
        "c2": {"id": "c2", "name": "c2", "image": "img2", "state": "running", "status": "Up 2m"},
    }
    gateway = PartialFailGateway(containers=containers)
    gateway.stats["c2"] = {
        "cpu_percent": 20.0,
        "memory_bytes": 1000,
        "memory_limit": 2000,
        "memory_percent": 50.0,
    }
    collector = OverviewCollectorService(docker_gateway=gateway)
    snapshot = await collector.collect_metrics()

    assert snapshot.docker_connected is True
    assert snapshot.containers.total == 2
    assert snapshot.containers.running == 2
    # c2 succeeded, c1 defaulted to 0.0
    c1_summary = next(c for c in snapshot.top_cpu if c.id == "c1")
    assert c1_summary.cpu_percent == 0.0

@pytest.mark.asyncio
async def test_overview_collector_start_and_stop():
    gateway = FakeGateway()
    settings = Settings(metrics_interval_seconds=1)
    collector = OverviewCollectorService(docker_gateway=gateway, settings=settings)
    
    queue = collector.subscribe()
    await collector.start()
    
    # Wait for first broadcast from background task
    received = await asyncio.wait_for(queue.get(), timeout=2.0)
    assert received is not None
    assert received.docker_connected is True
    
    await collector.stop()
    assert collector._running is False
    assert collector._task is None
