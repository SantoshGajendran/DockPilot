import asyncio
from datetime import datetime, timedelta, timezone
import logging
from typing import Any, Callable, Dict, List, Optional, Set, Tuple
import psutil
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.database import async_session
from app.docker.interface import DockerGateway
from app.models.alert import AlertEvent, AlertRule, AlertSilence
from app.models.metrics import ContainerMetricRecord, HostMetricRecord
from app.schemas.alert import AlertTargetMatch

logger = logging.getLogger(__name__)


def matches_scope(
    container: Dict[str, Any], scope_type: str, scope_value: Optional[str]
) -> bool:
    if scope_type == "all" or not scope_type:
        return True

    c_name = container.get("name", "").lstrip("/")
    c_id = container.get("id", "")
    labels = container.get("labels", {}) or {}

    if scope_type == "container":
        if not scope_value:
            return True
        target = scope_value.strip().lstrip("/")
        return c_name == target or c_id == target or c_id.startswith(target)

    if scope_type == "label":
        if not scope_value:
            return True
        if "=" in scope_value:
            k, v = scope_value.split("=", 1)
            return labels.get(k.strip()) == v.strip()
        else:
            return scope_value.strip() in labels

    return True


class AlertEvaluatorService:
    def __init__(
        self,
        docker_gateway: Optional[DockerGateway] = None,
        session_factory: Optional[Callable[[], AsyncSession]] = None,
        settings: Optional[Settings] = None,
    ):
        self.settings: Settings = settings or get_settings()
        self._docker_gateway = docker_gateway
        self._session_factory = session_factory or async_session
        self._running: bool = False
        self._task: Optional[asyncio.Task] = None

    @property
    def is_running(self) -> bool:
        return self._running

    async def start(self) -> None:
        if self._running or self._docker_gateway is None:
            return
        self._running = True
        self._task = asyncio.create_task(self._eval_loop())
        logger.info("AlertEvaluatorService started")

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info("AlertEvaluatorService stopped")

    async def _eval_loop(self) -> None:
        while self._running:
            try:
                await self.evaluate_all_rules()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Error in AlertEvaluatorService eval loop: %s", e)

            try:
                await asyncio.sleep(self.settings.alert_eval_interval_seconds)
            except asyncio.CancelledError:
                break

    async def evaluate_all_rules(self) -> None:
        if not self._docker_gateway:
            return

        async with self._session_factory() as session:
            # 1. Fetch enabled rules
            rules_res = await session.execute(
                select(AlertRule).where(AlertRule.enabled.is_(True))
            )
            rules = list(rules_res.scalars().all())
            if not rules:
                return

            # 2. Fetch active silences
            now = datetime.now(timezone.utc)
            silences_res = await session.execute(
                select(AlertSilence).where(AlertSilence.silenced_until > now)
            )
            active_silences = list(silences_res.scalars().all())

            # 3. Fetch containers & host metrics
            containers = await self._docker_gateway.list_containers(all=True)

            for rule in rules:
                await self._evaluate_rule_instance(session, rule, containers, active_silences, now)

            await session.commit()

    async def _evaluate_rule_instance(
        self,
        session: AsyncSession,
        rule: AlertRule,
        containers: List[Dict[str, Any]],
        silences: List[AlertSilence],
        now: datetime,
    ) -> None:
        # Check if entire rule is silenced
        if any(s.rule_id == rule.id and s.container_id is None for s in silences):
            return

        matches = await self.evaluate_matches_for_rule(session, rule, containers, now)

        for match in matches:
            target_id = match.target_id
            target_name = match.target_name

            # Check if this specific target is silenced
            if any(
                (s.rule_id == rule.id or s.rule_id is None) and s.container_id == target_id
                for s in silences
            ):
                continue

            # Check existing active firing event
            firing_stmt = select(AlertEvent).where(
                AlertEvent.rule_id == rule.id,
                AlertEvent.target_id == target_id,
                AlertEvent.status == "firing",
            )
            firing_res = await session.execute(firing_stmt)
            existing_firing = firing_res.scalar_one_or_none()

            if match.would_fire:
                if existing_firing is None:
                    # Check cooldown: has a previous event resolved recently?
                    cooldown_cutoff = now - timedelta(minutes=rule.cooldown_minutes)
                    recent_res = await session.execute(
                        select(AlertEvent)
                        .where(
                            AlertEvent.rule_id == rule.id,
                            AlertEvent.target_id == target_id,
                            AlertEvent.created_at >= cooldown_cutoff,
                        )
                        .order_by(AlertEvent.created_at.desc())
                    )
                    recent_event = recent_res.scalars().first()
                    if recent_event and recent_event.status == "resolved":
                        # Within cooldown window of resolution, suppress refiring
                        continue

                    # Fire new alert event
                    event = AlertEvent(
                        rule_id=rule.id,
                        rule_name=rule.name,
                        rule_type=rule.rule_type,
                        severity=rule.severity,
                        target_type="container" if rule.rule_type not in ("disk_high", "host_load") else "host",
                        target_id=target_id,
                        target_name=target_name,
                        status="firing",
                        message=match.message,
                        value=match.current_value,
                        threshold=match.threshold,
                        started_at=now,
                        created_at=now,
                    )
                    session.add(event)
            else:
                # Condition no longer holds: resolve existing firing event
                if existing_firing is not None:
                    existing_firing.status = "resolved"
                    existing_firing.resolved_at = now

    async def evaluate_matches_for_rule(
        self,
        session: AsyncSession,
        rule: AlertRule,
        containers: List[Dict[str, Any]],
        now: Optional[datetime] = None,
    ) -> List[AlertTargetMatch]:
        if now is None:
            now = datetime.now(timezone.utc)

        matches: List[AlertTargetMatch] = []
        rule_type = rule.rule_type

        if rule_type == "container_missing":
            expected = (rule.scope_value or "").strip().lstrip("/")
            found = False
            for c in containers:
                c_name = c.get("name", "").lstrip("/")
                if c_name == expected or c.get("id", "") == expected:
                    found = True
                    break
            matches.append(
                AlertTargetMatch(
                    target_id=expected,
                    target_name=expected,
                    would_fire=not found,
                    current_value=0.0 if not found else 1.0,
                    threshold=1.0,
                    message=f"Container '{expected}' is missing" if not found else f"Container '{expected}' present",
                )
            )
            return matches

        if rule_type in ("disk_high", "host_load"):
            if rule_type == "disk_high":
                thresh = rule.threshold if rule.threshold is not None else 85.0
                try:
                    usage = psutil.disk_usage("/")
                    pct = float(usage.percent)
                except Exception:
                    pct = 0.0
                matches.append(
                    AlertTargetMatch(
                        target_id="host_root",
                        target_name="Host Storage (/)",
                        would_fire=pct >= thresh,
                        current_value=pct,
                        threshold=thresh,
                        message=f"Root mount storage at {pct:.1f}% (threshold: {thresh}%)",
                    )
                )
            elif rule_type == "host_load":
                thresh = rule.threshold if rule.threshold is not None else 4.0
                try:
                    load1 = psutil.getloadavg()[0]
                except Exception:
                    load1 = 0.0

                would_fire = load1 >= thresh
                # Check sustained duration if configured
                if would_fire and rule.duration_minutes > 0:
                    start_time = now - timedelta(minutes=rule.duration_minutes)
                    min_q = select(func.min(HostMetricRecord.load_1m)).where(
                        HostMetricRecord.timestamp >= start_time
                    )
                    min_res = await session.execute(min_q)
                    min_load = min_res.scalar()
                    if min_load is not None and min_load < thresh:
                        would_fire = False

                matches.append(
                    AlertTargetMatch(
                        target_id="host_load",
                        target_name="Host System Load",
                        would_fire=would_fire,
                        current_value=float(load1),
                        threshold=thresh,
                        message=f"Host 1m load is {load1:.2f} (threshold: {thresh})",
                    )
                )
            return matches

        # Container scoped rules
        for c in containers:
            if not matches_scope(c, rule.scope_type, rule.scope_value):
                continue

            c_id = c.get("id", "")
            c_name = c.get("name", "").lstrip("/")
            state = (c.get("state") or "").lower()
            health = (c.get("health") or "").lower()
            restart_count = int(c.get("restart_count") or 0)

            if rule_type == "container_down":
                is_down = state in ("exited", "dead")
                matches.append(
                    AlertTargetMatch(
                        target_id=c_id,
                        target_name=c_name,
                        would_fire=is_down,
                        message=f"Container '{c_name}' is in '{state}' state",
                    )
                )

            elif rule_type == "restart_loop":
                is_loop = restart_count >= 3
                matches.append(
                    AlertTargetMatch(
                        target_id=c_id,
                        target_name=c_name,
                        would_fire=is_loop,
                        current_value=float(restart_count),
                        threshold=3.0,
                        message=f"Container '{c_name}' has restarted {restart_count} times",
                    )
                )

            elif rule_type == "health_failing":
                is_unhealthy = health == "unhealthy"
                matches.append(
                    AlertTargetMatch(
                        target_id=c_id,
                        target_name=c_name,
                        would_fire=is_unhealthy,
                        message=f"Container '{c_name}' health status is '{health}'",
                    )
                )

            elif rule_type == "cpu_high":
                thresh = rule.threshold if rule.threshold is not None else 85.0
                curr_cpu = 0.0
                if self._docker_gateway:
                    try:
                        stats = await self._docker_gateway.get_container_stats(c_id)
                        curr_cpu = float(stats.get("cpu_percent", 0.0))
                    except Exception:
                        curr_cpu = 0.0

                would_fire = curr_cpu >= thresh

                # Sustained duration check
                if would_fire and rule.duration_minutes > 0:
                    start_time = now - timedelta(minutes=rule.duration_minutes)
                    min_q = select(func.min(ContainerMetricRecord.cpu_percent)).where(
                        ContainerMetricRecord.container_id == c_id,
                        ContainerMetricRecord.timestamp >= start_time,
                    )
                    min_res = await session.execute(min_q)
                    min_cpu = min_res.scalar()
                    if min_cpu is not None and min_cpu < thresh:
                        would_fire = False

                matches.append(
                    AlertTargetMatch(
                        target_id=c_id,
                        target_name=c_name,
                        would_fire=would_fire,
                        current_value=curr_cpu,
                        threshold=thresh,
                        message=f"Container '{c_name}' CPU at {curr_cpu:.1f}% (threshold: {thresh}%)",
                    )
                )

            elif rule_type == "memory_high":
                thresh = rule.threshold if rule.threshold is not None else 90.0
                curr_mem_pct = 0.0
                if self._docker_gateway:
                    try:
                        stats = await self._docker_gateway.get_container_stats(c_id)
                        curr_mem_pct = float(stats.get("memory_percent", 0.0))
                    except Exception:
                        curr_mem_pct = 0.0

                would_fire = curr_mem_pct >= thresh

                # Sustained duration check
                if would_fire and rule.duration_minutes > 0:
                    start_time = now - timedelta(minutes=rule.duration_minutes)
                    pct_expr = (ContainerMetricRecord.memory_bytes * 100.0) / func.nullif(
                        ContainerMetricRecord.memory_limit, 0
                    )
                    min_q = select(func.min(pct_expr)).where(
                        ContainerMetricRecord.container_id == c_id,
                        ContainerMetricRecord.timestamp >= start_time,
                    )
                    min_res = await session.execute(min_q)
                    min_mem = min_res.scalar()
                    if min_mem is not None and min_mem < thresh:
                        would_fire = False

                matches.append(
                    AlertTargetMatch(
                        target_id=c_id,
                        target_name=c_name,
                        would_fire=would_fire,
                        current_value=curr_mem_pct,
                        threshold=thresh,
                        message=f"Container '{c_name}' memory at {curr_mem_pct:.1f}% (threshold: {thresh}%)",
                    )
                )

        return matches
