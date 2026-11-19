import asyncio
import logging
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from app.api.deps import get_overview_collector, require_role
from app.core.constants import Role
from app.models.user import User
from app.schemas.overview import OverviewResponse
from app.services.overview_service import OverviewCollectorService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=OverviewResponse)
@router.get("/", response_model=OverviewResponse, include_in_schema=False)
async def get_overview(
    user: User = Depends(require_role(Role.VIEWER)),
    collector: OverviewCollectorService = Depends(get_overview_collector),
) -> OverviewResponse:
    snapshot = collector.get_snapshot()
    if snapshot is None:
        snapshot = await collector.collect_metrics()
    return snapshot


@router.get("/stream")
async def stream_overview(
    request: Request,
    user: User = Depends(require_role(Role.VIEWER)),
    collector: OverviewCollectorService = Depends(get_overview_collector),
) -> StreamingResponse:
    async def event_generator():
        queue = collector.subscribe(maxsize=50)
        try:
            # Yield initial keepalive comment to establish SSE stream
            yield ": ping\n\n"

            # Yield immediate initial snapshot
            snapshot = collector.get_snapshot()
            if snapshot is None:
                snapshot = await collector.collect_metrics()
            yield f"data: {snapshot.model_dump_json()}\n\n"

            # If collector background loop is not running (e.g. unit/integration tests with ASGITransport),
            # yield any pending items and terminate generator so in-memory transports can return.
            if not collector._running:
                while not queue.empty():
                    item = queue.get_nowait()
                    yield f"data: {item.model_dump_json()}\n\n"
                return

            while True:
                try:
                    update = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {update.model_dump_json()}\n\n"
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
                except asyncio.CancelledError:
                    break
        finally:
            collector.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
