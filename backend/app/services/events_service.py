import asyncio
from datetime import datetime, timezone
import json
import logging
from typing import Any, AsyncGenerator, Dict, List, Optional
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.models.event import ContainerEventRecord
from app.schemas.events import EventItem, EventsFilterParams, EventsListResponse
from app.services.event_listener_service import EventListenerService

logger = logging.getLogger(__name__)


class EventsService:
    def __init__(
        self,
        db: AsyncSession,
        event_listener: Optional[EventListenerService] = None,
        settings: Optional[Settings] = None,
    ):
        self.db = db
        self.event_listener = event_listener
        self.settings = settings or get_settings()

    async def list_events(self, filters: EventsFilterParams) -> EventsListResponse:
        conditions = []

        if filters.container_id:
            conditions.append(ContainerEventRecord.container_id == filters.container_id)
        if filters.container_name:
            conditions.append(ContainerEventRecord.container_name.ilike(f"%{filters.container_name}%"))
        if filters.action:
            conditions.append(ContainerEventRecord.action == filters.action)
        if filters.incidents_only:
            conditions.append(
                or_(
                    ContainerEventRecord.is_oom.is_(True),
                    ContainerEventRecord.is_unexpected_exit.is_(True),
                    ContainerEventRecord.is_restart_loop.is_(True),
                )
            )
        if filters.since:
            conditions.append(ContainerEventRecord.timestamp >= filters.since)
        if filters.until:
            conditions.append(ContainerEventRecord.timestamp <= filters.until)

        # Count total matching records
        count_stmt = select(func.count(ContainerEventRecord.id))
        if conditions:
            count_stmt = count_stmt.where(*conditions)
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar() or 0

        # Cursor pagination
        limit = min(filters.limit, self.settings.events_page_size_max)
        query = select(ContainerEventRecord)
        if conditions:
            query = query.where(*conditions)

        if filters.cursor:
            try:
                cursor_id = int(filters.cursor)
                query = query.where(ContainerEventRecord.id < cursor_id)
            except ValueError:
                pass

        query = query.order_by(ContainerEventRecord.id.desc()).limit(limit + 1)

        result = await self.db.execute(query)
        rows = list(result.scalars().all())

        has_more = len(rows) > limit
        if has_more:
            rows = rows[:limit]

        next_cursor = str(rows[-1].id) if has_more and rows else None

        items = [
            EventItem(
                id=str(r.id),
                event_id=r.event_id,
                timestamp=r.timestamp,
                action=r.action,
                container_id=r.container_id,
                container_name=r.container_name,
                image=r.image,
                exit_code=r.exit_code,
                is_oom=r.is_oom,
                is_unexpected_exit=r.is_unexpected_exit,
                is_restart_loop=r.is_restart_loop,
                attributes=r.attributes,
            )
            for r in rows
        ]

        return EventsListResponse(
            items=items,
            total=total,
            next_cursor=next_cursor,
            has_more=has_more,
        )

    async def stream_events(self) -> AsyncGenerator[str, None]:
        if not self.event_listener:
            yield "data: {}\n\n"
            return

        queue = self.event_listener.subscribe()
        try:
            yield ": connected\n\n"
            if not self.event_listener.is_running:
                while not queue.empty():
                    item = queue.get_nowait()
                    yield f"data: {json.dumps(item.model_dump(mode='json'))}\n\n"
                return

            while True:
                try:
                    event_item = await asyncio.wait_for(queue.get(), timeout=15.0)
                    data = event_item.model_dump(mode="json")
                    yield f"data: {json.dumps(data)}\n\n"
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
        finally:
            self.event_listener.unsubscribe(queue)
