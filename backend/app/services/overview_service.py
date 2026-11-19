import asyncio
from datetime import datetime, timezone
import logging
import os
import time
from typing import Any, Dict, List, Optional, Set
import psutil

from app.core.config import Settings, get_settings
from app.docker.interface import DockerGateway
from app.schemas.overview import (
    ContainerConsumerSummary,
    ContainerStateCounts,
    DockerEventSummary,
    HostMetrics,
    OverviewResponse,
)

logger = logging.getLogger(__name__)


class OverviewCollectorService:
    def __init__(
        self,
        docker_gateway: Optional[DockerGateway] = None,
        settings: Optional[Settings] = None,
    ):
        self.settings: Settings = settings or get_settings()
        if docker_gateway is not None:
            self._docker_gateway = docker_gateway
        else:
            try:
                from app.api.deps import get_docker_gateway
                self._docker_gateway = get_docker_gateway()
            except Exception:
                self._docker_gateway = None

        self._subscribers: Set[asyncio.Queue[OverviewResponse]] = set()
        self._snapshot: Optional[OverviewResponse] = None
        self._task: Optional[asyncio.Task] = None
        self._running: bool = False
        self._stop_event: Optional[asyncio.Event] = None

    @property
    def docker_gateway(self) -> Optional[DockerGateway]:
        return self._docker_gateway

    def get_snapshot(self) -> Optional[OverviewResponse]:
        return self._snapshot

    def subscribe(self) -> asyncio.Queue[OverviewResponse]:
        queue: asyncio.Queue[OverviewResponse] = asyncio.Queue()
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue[OverviewResponse]) -> None:
        self._subscribers.discard(queue)

    async def broadcast(self, snapshot: OverviewResponse) -> None:
        self._snapshot = snapshot
        for queue in list(self._subscribers):
            try:
                queue.put_nowait(snapshot)
            except asyncio.QueueFull:
                pass
            except Exception as e:
                logger.warning("Error pushing to subscriber queue: %s", e)

    def _collect_host_metrics(self) -> HostMetrics:
        cpu_pct = float(psutil.cpu_percent(interval=None))
        vm = psutil.virtual_memory()

        try:
            disk = psutil.disk_usage("/")
        except Exception:
            disk = psutil.disk_usage(os.path.abspath(os.sep))

        load_avg: List[float] = []
        if hasattr(psutil, "getloadavg"):
            try:
                load_avg = [round(float(x), 2) for x in psutil.getloadavg()]
            except Exception:
                load_avg = []

        uptime_seconds = 0.0
        try:
            uptime_seconds = float(max(0.0, time.time() - psutil.boot_time()))
        except Exception:
            pass

        return HostMetrics(
            cpu_percent=round(cpu_pct, 2),
            memory_percent=round(float(vm.percent), 2),
            memory_used_bytes=int(vm.used),
            memory_total_bytes=int(vm.total),
            disk_percent=round(float(disk.percent), 2),
            disk_used_bytes=int(disk.used),
            disk_total_bytes=int(disk.total),
            load_avg=load_avg,
            uptime_seconds=uptime_seconds,
        )

    async def _fetch_container_consumer(self, c: Dict[str, Any]) -> ContainerConsumerSummary:
        cid = str(c.get("id", ""))
        name = str(c.get("name", ""))
        image = str(c.get("image", ""))
        status = str(c.get("status") or c.get("state", ""))

        if not self._docker_gateway:
            return ContainerConsumerSummary(id=cid, name=name, image=image, status=status)

        try:
            stats = await self._docker_gateway.get_container_stats(cid)
            return ContainerConsumerSummary(
                id=cid,
                name=name,
                image=image,
                cpu_percent=float(stats.get("cpu_percent", 0.0)),
                memory_bytes=int(stats.get("memory_bytes", 0)),
                memory_percent=float(stats.get("memory_percent", 0.0)),
                status=status,
            )
        except Exception as e:
            logger.debug("Failed to get stats for container %s: %s", cid, e)
            return ContainerConsumerSummary(
                id=cid,
                name=name,
                image=image,
                cpu_percent=0.0,
                memory_bytes=0,
                memory_percent=0.0,
                status=status,
            )

    async def collect_metrics(self) -> OverviewResponse:
        host_metrics = await asyncio.to_thread(self._collect_host_metrics)

        docker_connected = False
        containers_counts = ContainerStateCounts()
        top_cpu: List[ContainerConsumerSummary] = []
        top_memory: List[ContainerConsumerSummary] = []
        recent_events: List[DockerEventSummary] = []

        if self._docker_gateway is not None:
            try:
                containers_list = await self._docker_gateway.list_containers(all=True)
                docker_connected = True

                running_count = 0
                exited_count = 0
                restarting_count = 0
                unhealthy_count = 0
                paused_count = 0
                running_containers = []

                for c in containers_list:
                    state_str = str(c.get("state", "")).lower()
                    status_str = str(c.get("status", "")).lower()
                    labels = c.get("labels", {}) or {}
                    health_str = str(c.get("health", "")).lower()

                    is_unhealthy = (
                        "unhealthy" in status_str
                        or state_str == "unhealthy"
                        or health_str == "unhealthy"
                        or str(labels.get("health", "")).lower() == "unhealthy"
                    )

                    if is_unhealthy:
                        unhealthy_count += 1
                        running_containers.append(c)
                    elif state_str == "paused" or "paused" in status_str:
                        paused_count += 1
                    elif state_str == "restarting" or "restarting" in status_str:
                        restarting_count += 1
                    elif state_str == "running" or status_str.startswith("up"):
                        running_count += 1
                        running_containers.append(c)
                    else:
                        exited_count += 1

                containers_counts = ContainerStateCounts(
                    total=len(containers_list),
                    running=running_count,
                    exited=exited_count,
                    restarting=restarting_count,
                    unhealthy=unhealthy_count,
                    paused=paused_count,
                )

                if running_containers:
                    tasks = [self._fetch_container_consumer(c) for c in running_containers]
                    consumers = await asyncio.gather(*tasks, return_exceptions=False)
                else:
                    consumers = []

                top_limit = self.settings.top_containers_limit
                top_cpu = sorted(consumers, key=lambda x: x.cpu_percent, reverse=True)[:top_limit]
                top_memory = sorted(consumers, key=lambda x: x.memory_bytes, reverse=True)[:top_limit]

                events_limit = self.settings.recent_events_limit
                try:
                    raw_events = await self._docker_gateway.get_recent_events(limit=events_limit)
                except Exception as e:
                    logger.warning("Failed to get recent events: %s", e)
                    raw_events = []

                for ev in raw_events:
                    try:
                        ts = ev.get("timestamp") or datetime.now(timezone.utc)
                        recent_events.append(
                            DockerEventSummary(
                                id=str(ev.get("id", "")),
                                action=str(ev.get("action", "")),
                                actor_type=str(ev.get("actor_type", "container")),
                                actor_name=str(ev.get("actor_name", "")),
                                timestamp=ts,
                            )
                        )
                    except Exception as e:
                        logger.warning("Failed to parse event summary: %s", e)

            except Exception as e:
                logger.warning("Docker gateway collection failed: %s", e)
                docker_connected = False
                containers_counts = ContainerStateCounts()
                top_cpu = []
                top_memory = []
                recent_events = []

        snapshot = OverviewResponse(
            host=host_metrics,
            containers=containers_counts,
            top_cpu=top_cpu,
            top_memory=top_memory,
            recent_events=recent_events,
            active_alerts_count=0,
            docker_connected=docker_connected,
            timestamp=datetime.now(timezone.utc),
        )
        self._snapshot = snapshot
        return snapshot

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._stop_event = asyncio.Event()
        try:
            snapshot = await self.collect_metrics()
            await self.broadcast(snapshot)
        except Exception as e:
            logger.error("Initial overview collection failed: %s", e)
        self._task = asyncio.create_task(self._run_loop())

    async def stop(self) -> None:
        self._running = False
        if self._stop_event:
            self._stop_event.set()
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self._task = None

    async def _run_loop(self) -> None:
        while self._running:
            try:
                assert self._stop_event is not None
                await asyncio.wait_for(
                    self._stop_event.wait(),
                    timeout=float(self.settings.metrics_interval_seconds),
                )
                # If stop_event was signaled, break out
                break
            except asyncio.TimeoutError:
                # Normal interval elapsed
                pass
            except asyncio.CancelledError:
                break

            if not self._running:
                break

            try:
                snapshot = await self.collect_metrics()
                await self.broadcast(snapshot)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Error in overview collector loop: %s", e)
