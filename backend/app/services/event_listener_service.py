import asyncio
from datetime import datetime, timedelta, timezone
import hashlib
import logging
from typing import Any, Callable, Dict, Optional, Set
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.database import async_session
from app.docker.interface import DockerGateway
from app.models.event import ContainerEventRecord
from app.schemas.events import EventItem

logger = logging.getLogger(__name__)


class EventListenerService:
    def __init__(
        self,
        docker_gateway: Optional[DockerGateway] = None,
        session_factory: Optional[Callable[[], AsyncSession]] = None,
        settings: Optional[Settings] = None,
    ):
        self.settings: Settings = settings or get_settings()
        self._docker_gateway = docker_gateway
        self._session_factory = session_factory or async_session
        self._subscribers: Set[asyncio.Queue[EventItem]] = set()
        self._running: bool = False
        self._task: Optional[asyncio.Task] = None
        self._last_event_time: Optional[int] = None

    @property
    def is_running(self) -> bool:
        return self._running

    def subscribe(self, maxsize: int = 100) -> asyncio.Queue[EventItem]:
        queue: asyncio.Queue[EventItem] = asyncio.Queue(maxsize=maxsize)
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue[EventItem]) -> None:
        self._subscribers.discard(queue)

    def broadcast(self, item: EventItem) -> None:
        for q in list(self._subscribers):
            try:
                q.put_nowait(item)
            except asyncio.QueueFull:
                try:
                    q.get_nowait()
                    q.put_nowait(item)
                except Exception:
                    pass

    async def start(self) -> None:
        if self._running or self._docker_gateway is None:
            return
        self._running = True
        self._task = asyncio.create_task(self._listen_loop())
        logger.info("EventListenerService started")

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info("EventListenerService stopped")

    async def _listen_loop(self) -> None:
        while self._running:
            try:
                assert self._docker_gateway is not None
                async for raw_event in self._docker_gateway.stream_events(since=self._last_event_time):
                    if not self._running:
                        break
                    await self.process_raw_event(raw_event)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning(
                    "Docker event listener error: %s. Reconnecting in %ss...",
                    e,
                    self.settings.events_reconnect_interval_seconds,
                )
                try:
                    await asyncio.sleep(self.settings.events_reconnect_interval_seconds)
                except asyncio.CancelledError:
                    break

    async def process_raw_event(self, raw_event: Dict[str, Any]) -> Optional[EventItem]:
        if not isinstance(raw_event, dict):
            return None

        actor_type = raw_event.get("Type") or "container"
        if actor_type != "container":
            return None

        action = str(raw_event.get("Action") or raw_event.get("status") or "").strip()
        if not action:
            return None

        actor = raw_event.get("Actor", {}) if isinstance(raw_event.get("Actor"), dict) else {}
        container_id = str(actor.get("ID") or raw_event.get("id") or "").strip()
        if not container_id:
            return None

        attributes = actor.get("Attributes") if isinstance(actor.get("Attributes"), dict) else {}
        container_name = str(attributes.get("name") or raw_event.get("from") or container_id[:12]).strip()
        image = attributes.get("image") or raw_event.get("from")

        time_sec = raw_event.get("time")
        time_nano = raw_event.get("timeNano")

        if time_sec:
            self._last_event_time = int(time_sec)
            event_dt = datetime.fromtimestamp(int(time_sec), tz=timezone.utc)
        else:
            event_dt = datetime.now(timezone.utc)

        # Unique event identifier for deduplication
        raw_event_key = f"{container_id}_{action}_{time_nano or time_sec or int(event_dt.timestamp() * 1e6)}"
        event_id = hashlib.sha256(raw_event_key.encode("utf-8")).hexdigest()
        clean_action = str(action or "")[:64]
        clean_container_id = str(container_id or "")[:64]
        clean_container_name = str(container_name or "")[:128]
        clean_image = str(image)[:256] if image else None

        # Exit code extraction
        exit_code: Optional[int] = None
        if "exitCode" in attributes:
            try:
                exit_code = int(attributes["exitCode"])
            except (ValueError, TypeError):
                exit_code = None

        # Incident derived flags
        is_oom = (
            action == "oom"
            or attributes.get("oom") in (True, "true", "1")
            or (action == "die" and exit_code == 137 and "oom" in str(attributes).lower())
        )
        is_unexpected_exit = action == "die" and exit_code is not None and exit_code != 0

        async with self._session_factory() as session:
            # Deduplication check
            existing = await session.execute(
                select(ContainerEventRecord).where(ContainerEventRecord.event_id == event_id)
            )
            if existing.scalar_one_or_none() is not None:
                return None

            # Restart loop detection within sliding window
            is_restart_loop = False
            window_start = event_dt - timedelta(seconds=self.settings.restart_loop_window_seconds)

            count_query = select(func.count(ContainerEventRecord.id)).where(
                ContainerEventRecord.container_id == container_id,
                ContainerEventRecord.timestamp >= window_start,
                ContainerEventRecord.action.in_(["die", "restart", "oom"]),
            )
            prior_count_result = await session.execute(count_query)
            prior_count = prior_count_result.scalar() or 0

            if action in ("die", "restart", "oom") or is_unexpected_exit:
                if (prior_count + 1) >= self.settings.restart_loop_threshold:
                    is_restart_loop = True

            record = ContainerEventRecord(
                event_id=event_id,
                timestamp=event_dt,
                action=clean_action,
                container_id=clean_container_id,
                container_name=clean_container_name,
                image=clean_image,
                exit_code=exit_code,
                is_oom=is_oom,
                is_unexpected_exit=is_unexpected_exit,
                is_restart_loop=is_restart_loop,
                attributes=attributes,
                created_at=datetime.now(timezone.utc),
            )
            session.add(record)
            await session.commit()
            await session.refresh(record)

            event_item = EventItem(
                id=str(record.id),
                event_id=record.event_id,
                timestamp=record.timestamp,
                action=record.action,
                container_id=record.container_id,
                container_name=record.container_name,
                image=record.image,
                exit_code=record.exit_code,
                is_oom=record.is_oom,
                is_unexpected_exit=record.is_unexpected_exit,
                is_restart_loop=record.is_restart_loop,
                attributes=record.attributes,
            )

        self.broadcast(event_item)
        return event_item
