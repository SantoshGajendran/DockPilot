import asyncio
import pytest
from app.docker.fake import FakeGateway
from app.services.logs_service import search_logs, stream_container_logs_sse


@pytest.mark.asyncio
async def test_stream_logs_snapshot():
    gw = FakeGateway()
    generator = stream_container_logs_sse(
        gateway=gw,
        container_id="c1",
        tail=2,
        follow=False,
    )
    chunks = [c async for c in generator]
    assert len(chunks) == 2
    assert "data: " in chunks[0]
    assert "dockpilot-redis" in chunks[0]


@pytest.mark.asyncio
async def test_stream_logs_follow_once():
    gw = FakeGateway()
    generator = stream_container_logs_sse(
        gateway=gw,
        container_id="c1",
        tail=5,
        follow=True,
        once=True,
    )
    chunks = [c async for c in generator]
    assert len(chunks) >= 1
    assert "data: " in chunks[0]
    assert "dockpilot-redis" in chunks[0]


@pytest.mark.asyncio
async def test_search_logs_substring_and_regex():
    gw = FakeGateway()

    # Plain text search
    res = await search_logs(
        gateway=gw,
        container_ids=["c1"],
        q="started",
        regex=False,
    )
    assert res.total == 1
    assert "started" in res.lines[0].message.lower()

    # Regex search
    res_regex = await search_logs(
        gateway=gw,
        container_ids=["c1"],
        q=r"service\s+started",
        regex=True,
    )
    assert res_regex.total == 1
    assert "Service started" in res_regex.lines[0].message


@pytest.mark.asyncio
async def test_search_logs_byte_cap(monkeypatch):
    gw = FakeGateway()
    # Force max_bytes to 50 bytes to trigger cap
    from app.core import config
    settings = config.get_settings()
    monkeypatch.setattr(settings, "log_search_max_bytes_scanned", 50)

    res = await search_logs(
        gateway=gw,
        container_ids=["c1"],
        q=None,
    )
    assert res.capped is True
    assert res.bytes_scanned > 50
