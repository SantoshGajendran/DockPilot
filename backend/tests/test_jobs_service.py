import asyncio
import json
import pytest

from app.schemas.jobs import JobStatus
from app.services.job_service import JobManager


@pytest.mark.asyncio
async def test_job_lifecycle():
    manager = JobManager()
    job = manager.create_job(project_name="dockpilot", action="up")

    assert job.id
    assert job.status == JobStatus.PENDING
    assert job.project_name == "dockpilot"
    assert job.action == "up"

    manager.set_running(job.id)
    assert job.status == JobStatus.RUNNING

    manager.append_log(job.id, "Step 1: creating networks")
    manager.append_log(job.id, "Step 2: starting containers")
    assert len(job.logs) == 2

    manager.complete_job(job.id, exit_code=0)
    assert job.status == JobStatus.COMPLETED
    assert job.exit_code == 0
    assert job.finished_at is not None

    resp = job.to_response()
    assert resp.status == JobStatus.COMPLETED
    assert len(resp.logs) == 2


@pytest.mark.asyncio
async def test_job_failure():
    manager = JobManager()
    job = manager.create_job(project_name="bad-stack", action="down")
    manager.set_running(job.id)
    manager.append_log(job.id, "Error: compose file not found")
    manager.complete_job(job.id, exit_code=1, error="File missing")

    assert job.status == JobStatus.FAILED
    assert job.exit_code == 1
    assert job.error == "File missing"


@pytest.mark.asyncio
async def test_job_sse_streaming():
    manager = JobManager()
    job = manager.create_job(project_name="dockpilot", action="restart")
    manager.append_log(job.id, "Initial line 1")

    # Start streaming in an async task
    collected_events = []

    async def consumer():
        async for sse_chunk in manager.stream_job_sse(job.id):
            if sse_chunk.startswith("data: "):
                payload = json.loads(sse_chunk[6:].strip())
                collected_events.append(payload)

    task = asyncio.create_task(consumer())
    await asyncio.sleep(0.02)

    manager.set_running(job.id)
    manager.append_log(job.id, "Live line 2")
    await asyncio.sleep(0.02)

    manager.complete_job(job.id, exit_code=0)
    await asyncio.sleep(0.02)
    await task

    # Assert that all events were streamed
    lines = [e.get("line") for e in collected_events if e.get("line")]
    assert "Initial line 1" in lines
    assert "Live line 2" in lines
    statuses = [e.get("status") for e in collected_events]
    assert "completed" in statuses
