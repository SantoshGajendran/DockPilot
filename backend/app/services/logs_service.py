import asyncio
import re
from typing import Any, AsyncGenerator, Dict, List, Optional

from fastapi import HTTPException, status

from app.core.config import get_settings
from app.docker.interface import DockerGateway
from app.schemas.logs import LogEntry, LogSearchResponse


async def stream_container_logs_sse(
    gateway: DockerGateway,
    container_id: str,
    tail: int = 100,
    since: Optional[int] = None,
    timestamps: bool = True,
    follow: bool = True,
    once: bool = False,
) -> AsyncGenerator[str, None]:
    try:
        container = await gateway.inspect_container(container_id)
        container_name = container.get("name", container_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Container {container_id} not found",
        )

    settings = get_settings()
    max_buf = settings.log_stream_buffer_max_lines

    if not follow:
        # Non-streaming snapshot
        raw_logs = await gateway.get_container_logs(
            container_id=container_id,
            tail=tail,
            since=since,
            timestamps=timestamps,
        )
        for r in raw_logs:
            entry = LogEntry(
                container_id=container_id,
                container_name=container_name,
                stream=r.get("stream", "stdout"),
                timestamp=r.get("timestamp"),
                message=r.get("message", ""),
                level=r.get("level"),
            )
            yield f"data: {entry.model_dump_json()}\n\n"
        return

    # Real-time streaming with backpressure handling
    queue: asyncio.Queue[Dict[str, Any]] = asyncio.Queue(maxsize=max_buf)
    skipped_count = 0
    stop_producer = asyncio.Event()

    async def producer():
        nonlocal skipped_count
        try:
            async for log_item in gateway.stream_container_logs(
                container_id=container_id,
                tail=tail,
                since=since,
                timestamps=timestamps,
            ):
                if stop_producer.is_set():
                    break
                try:
                    queue.put_nowait(log_item)
                except asyncio.QueueFull:
                    skipped_count += 1
        except Exception:
            pass

    producer_task = asyncio.create_task(producer())

    try:
        while True:
            # Check for skipped line markers from queue saturation
            if skipped_count > 0:
                count_to_report = skipped_count
                skipped_count = 0
                marker = LogEntry(
                    container_id=container_id,
                    container_name=container_name,
                    stream="system",
                    timestamp=None,
                    message=f"[--- BUFFER OVERFLOW: {count_to_report} LINES SKIPPED ---]",
                    level="WARN",
                )
                yield f"data: {marker.model_dump_json()}\n\n"

            try:
                # Wait for next item with short timeout to yield ping/keepalive or check break
                item = await asyncio.wait_for(queue.get(), timeout=1.0)
                entry = LogEntry(
                    container_id=container_id,
                    container_name=container_name,
                    stream=item.get("stream", "stdout"),
                    timestamp=item.get("timestamp"),
                    message=item.get("message", ""),
                    level=item.get("level"),
                )
                yield f"data: {entry.model_dump_json()}\n\n"
                queue.task_done()
                if once:
                    break
            except asyncio.TimeoutError:
                if producer_task.done() and queue.empty():
                    break
                if once:
                    break
                yield ": ping\n\n"
    except (asyncio.CancelledError, GeneratorExit):
        return
    finally:
        stop_producer.set()
        producer_task.cancel()
        try:
            await producer_task
        except (asyncio.CancelledError, Exception):
            pass


async def search_logs(
    gateway: DockerGateway,
    container_ids: List[str],
    q: Optional[str] = None,
    regex: bool = False,
    since: Optional[int] = None,
    until: Optional[int] = None,
    tail: int = 500,
) -> LogSearchResponse:
    settings = get_settings()
    max_bytes = settings.log_search_max_bytes_scanned

    compiled_pattern = None
    if q and regex:
        try:
            compiled_pattern = re.compile(q, re.IGNORECASE)
        except re.error as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid regex pattern: {e}",
            )

    matched_entries: List[LogEntry] = []
    total_bytes_scanned = 0
    capped = False

    for cid in container_ids:
        if capped:
            break

        try:
            container = await gateway.inspect_container(cid)
            name = container.get("name", cid)
        except Exception:
            name = cid

        try:
            raw_logs = await gateway.get_container_logs(
                container_id=cid,
                tail=tail,
                since=since,
                until=until,
                timestamps=True,
            )
        except Exception:
            continue

        for r in raw_logs:
            msg = r.get("message", "")
            msg_bytes = len(msg.encode("utf-8"))
            total_bytes_scanned += msg_bytes

            if total_bytes_scanned > max_bytes:
                capped = True
                break

            # Filter matching
            match = True
            if q:
                if compiled_pattern:
                    match = bool(compiled_pattern.search(msg))
                else:
                    match = q.lower() in msg.lower()

            if match:
                matched_entries.append(
                    LogEntry(
                        container_id=cid,
                        container_name=name,
                        stream=r.get("stream", "stdout"),
                        timestamp=r.get("timestamp"),
                        message=msg,
                        level=r.get("level"),
                    )
                )

    # Sort matched entries by timestamp if present
    matched_entries.sort(key=lambda x: x.timestamp or "")

    return LogSearchResponse(
        lines=matched_entries,
        total=len(matched_entries),
        bytes_scanned=total_bytes_scanned,
        capped=capped,
    )
