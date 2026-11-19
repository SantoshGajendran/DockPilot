from datetime import datetime, timezone
import pytest
from app.schemas.overview import (
    HostMetrics,
    ContainerStateCounts,
    ContainerConsumerSummary,
    DockerEventSummary,
    OverviewResponse,
)
from app.docker.fake import FakeGateway

def test_overview_schemas_serialization():
    host = HostMetrics(
        cpu_percent=12.5,
        memory_percent=45.0,
        memory_used_bytes=4294967296,
        memory_total_bytes=17179869184,
        disk_percent=60.0,
        disk_used_bytes=107374182400,
        disk_total_bytes=214748364800,
        load_avg=[0.85, 1.10, 0.95],
        uptime_seconds=86400,
    )
    counts = ContainerStateCounts(
        total=5,
        running=3,
        exited=1,
        restarting=0,
        unhealthy=1,
        paused=0,
    )
    top_c = [
        ContainerConsumerSummary(
            id="c1",
            name="web-service",
            image="nginx:latest",
            cpu_percent=8.2,
            memory_bytes=104857600,
            memory_percent=1.2,
            status="running",
        )
    ]
    events = [
        DockerEventSummary(
            id="ev1",
            action="start",
            actor_type="container",
            actor_name="web-service",
            timestamp=datetime.now(timezone.utc),
        )
    ]
    resp = OverviewResponse(
        host=host,
        containers=counts,
        top_cpu=top_c,
        top_memory=top_c,
        recent_events=events,
        active_alerts_count=0,
        docker_connected=True,
        timestamp=datetime.now(timezone.utc),
    )
    data = resp.model_dump()
    assert data["host"]["cpu_percent"] == 12.5
    assert data["containers"]["total"] == 5
    assert data["docker_connected"] is True

@pytest.mark.asyncio
async def test_fake_gateway_stats_and_events():
    gateway = FakeGateway()
    stats = await gateway.get_container_stats("c1")
    assert "cpu_percent" in stats
    assert "memory_bytes" in stats

    events = await gateway.get_recent_events(limit=5)
    assert isinstance(events, list)
    assert len(events) >= 1
