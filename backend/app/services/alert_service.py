from datetime import datetime, timedelta, timezone
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import uuid
import yaml

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import AuditResult
from app.docker.interface import DockerGateway
from app.models.alert import AlertEvent, AlertRule, AlertSilence
from app.models.audit import AuditLog
from app.schemas.alert import (
    AlertDryRunRequest,
    AlertDryRunResponse,
    AlertRuleCreate,
    AlertRuleUpdate,
    AlertSilenceCreate,
)
from app.services.alert_evaluator_service import AlertEvaluatorService

logger = logging.getLogger(__name__)


def _find_alerts_config_path() -> Optional[Path]:
    candidates = [
        Path("config/alerts.yaml"),
        Path("../config/alerts.yaml"),
        Path(__file__).resolve().parents[3] / "config" / "alerts.yaml",
    ]
    for p in candidates:
        if p.exists():
            return p
    return None


async def seed_alert_rules(session: AsyncSession) -> int:
    """Bootstrap default alert rules from config/alerts.yaml if table is empty."""
    count_res = await session.execute(select(func.count(AlertRule.id)))
    count = count_res.scalar() or 0
    if count > 0:
        return 0

    config_path = _find_alerts_config_path()
    if not config_path or not config_path.exists():
        logger.warning("config/alerts.yaml not found for seeding")
        return 0

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
    except Exception as e:
        logger.error("Failed to read %s: %s", config_path, e)
        return 0

    rules_data = data.get("rules", [])
    seeded_count = 0
    for r in rules_data:
        rule = AlertRule(
            name=r.get("name", "Unnamed Rule"),
            description=r.get("description"),
            rule_type=r.get("rule_type", "container_down"),
            scope_type=r.get("scope_type", "all"),
            scope_value=r.get("scope_value"),
            severity=r.get("severity", "warning"),
            threshold=r.get("threshold"),
            duration_minutes=r.get("duration_minutes", 0),
            cooldown_minutes=r.get("cooldown_minutes", 15),
            enabled=r.get("enabled", True),
        )
        session.add(rule)
        seeded_count += 1

    if seeded_count > 0:
        await session.commit()
        logger.info("Seeded %d alert rules from %s", seeded_count, config_path)

    return seeded_count


class AlertService:
    def __init__(
        self,
        db: AsyncSession,
        docker_gateway: Optional[DockerGateway] = None,
    ):
        self.db = db
        self.docker_gateway = docker_gateway

    async def list_rules(
        self, enabled_only: bool = False
    ) -> Tuple[List[AlertRule], int]:
        stmt = select(AlertRule)
        if enabled_only:
            stmt = stmt.where(AlertRule.enabled.is_(True))
        stmt = stmt.order_by(AlertRule.id)
        res = await self.db.execute(stmt)
        rules = list(res.scalars().all())
        return rules, len(rules)

    async def get_rule(self, rule_id: int) -> Optional[AlertRule]:
        return await self.db.get(AlertRule, rule_id)

    async def create_rule(
        self,
        rule_in: AlertRuleCreate,
        user_id: Optional[uuid.UUID] = None,
        username: str = "system",
        ip_address: Optional[str] = None,
    ) -> AlertRule:
        rule = AlertRule(
            name=rule_in.name,
            description=rule_in.description,
            rule_type=rule_in.rule_type,
            scope_type=rule_in.scope_type,
            scope_value=rule_in.scope_value,
            severity=rule_in.severity,
            threshold=rule_in.threshold,
            duration_minutes=rule_in.duration_minutes,
            cooldown_minutes=rule_in.cooldown_minutes,
            enabled=rule_in.enabled,
        )
        self.db.add(rule)
        await self.db.flush()

        audit = AuditLog(
            user_id=user_id,
            username=username,
            action="alert.rule.create",
            target_type="alert_rule",
            target_id=str(rule.id),
            result=AuditResult.SUCCESS,
            payload={"name": rule.name, "rule_type": rule.rule_type},
            ip_address=ip_address,
        )
        self.db.add(audit)
        await self.db.commit()
        await self.db.refresh(rule)
        return rule

    async def update_rule(
        self,
        rule_id: int,
        rule_in: AlertRuleUpdate,
        user_id: Optional[uuid.UUID] = None,
        username: str = "system",
        ip_address: Optional[str] = None,
    ) -> Optional[AlertRule]:
        rule = await self.db.get(AlertRule, rule_id)
        if not rule:
            return None

        update_data = rule_in.model_dump(exclude_unset=True)
        for key, val in update_data.items():
            setattr(rule, key, val)

        rule.updated_at = datetime.now(timezone.utc)
        audit = AuditLog(
            user_id=user_id,
            username=username,
            action="alert.rule.update",
            target_type="alert_rule",
            target_id=str(rule.id),
            result=AuditResult.SUCCESS,
            payload=update_data,
            ip_address=ip_address,
        )
        self.db.add(audit)
        await self.db.commit()
        await self.db.refresh(rule)
        return rule

    async def delete_rule(
        self,
        rule_id: int,
        user_id: Optional[uuid.UUID] = None,
        username: str = "system",
        ip_address: Optional[str] = None,
    ) -> bool:
        rule = await self.db.get(AlertRule, rule_id)
        if not rule:
            return False

        audit = AuditLog(
            user_id=user_id,
            username=username,
            action="alert.rule.delete",
            target_type="alert_rule",
            target_id=str(rule.id),
            result=AuditResult.SUCCESS,
            payload={"name": rule.name, "rule_type": rule.rule_type},
            ip_address=ip_address,
        )
        self.db.add(audit)
        await self.db.delete(rule)
        await self.db.commit()
        return True

    async def dry_run_rule(
        self,
        req: AlertDryRunRequest,
    ) -> AlertDryRunResponse:
        evaluator = AlertEvaluatorService(docker_gateway=self.docker_gateway)
        containers = (
            await self.docker_gateway.list_containers(all=True)
            if self.docker_gateway
            else []
        )
        now = datetime.now(timezone.utc)

        temp_rule = AlertRule(
            id=0,
            name="DryRun",
            rule_type=req.rule_type,
            scope_type=req.scope_type,
            scope_value=req.scope_value,
            severity="warning",
            threshold=req.threshold,
            duration_minutes=req.duration_minutes,
            cooldown_minutes=15,
            enabled=True,
        )

        matches = await evaluator.evaluate_matches_for_rule(
            self.db, temp_rule, containers, now
        )
        return AlertDryRunResponse(
            rule_type=req.rule_type,
            matches_count=len(matches),
            targets=matches,
        )

    async def dry_run_rule_by_id(
        self,
        rule_id: int,
    ) -> Optional[AlertDryRunResponse]:
        rule = await self.db.get(AlertRule, rule_id)
        if not rule:
            return None

        req = AlertDryRunRequest(
            rule_type=rule.rule_type,
            scope_type=rule.scope_type,
            scope_value=rule.scope_value,
            threshold=rule.threshold,
            duration_minutes=rule.duration_minutes,
        )
        return await self.dry_run_rule(req)

    async def list_events(
        self,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        rule_id: Optional[int] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[AlertEvent], int]:
        stmt = select(AlertEvent)
        count_stmt = select(func.count(AlertEvent.id))

        if status:
            stmt = stmt.where(AlertEvent.status == status)
            count_stmt = count_stmt.where(AlertEvent.status == status)
        if severity:
            stmt = stmt.where(AlertEvent.severity == severity)
            count_stmt = count_stmt.where(AlertEvent.severity == severity)
        if rule_id:
            stmt = stmt.where(AlertEvent.rule_id == rule_id)
            count_stmt = count_stmt.where(AlertEvent.rule_id == rule_id)

        count_res = await self.db.execute(count_stmt)
        total = count_res.scalar() or 0

        stmt = stmt.order_by(desc(AlertEvent.created_at)).limit(limit).offset(offset)
        res = await self.db.execute(stmt)
        events = list(res.scalars().all())
        return events, total

    async def acknowledge_event(
        self,
        event_id: int,
        user_id: Optional[uuid.UUID] = None,
        username: str = "system",
        ip_address: Optional[str] = None,
    ) -> Optional[AlertEvent]:
        event = await self.db.get(AlertEvent, event_id)
        if not event:
            return None

        now = datetime.now(timezone.utc)
        event.acknowledged_at = now
        event.acknowledged_by = username

        audit = AuditLog(
            user_id=user_id,
            username=username,
            action="alert.event.acknowledge",
            target_type="alert_event",
            target_id=str(event.id),
            result=AuditResult.SUCCESS,
            payload={"rule_id": event.rule_id, "status": event.status},
            ip_address=ip_address,
        )
        self.db.add(audit)
        await self.db.commit()
        await self.db.refresh(event)
        return event

    async def create_silence(
        self,
        silence_in: AlertSilenceCreate,
        user_id: Optional[uuid.UUID] = None,
        username: str = "system",
        ip_address: Optional[str] = None,
    ) -> AlertSilence:
        now = datetime.now(timezone.utc)
        silenced_until = now + timedelta(minutes=silence_in.duration_minutes)

        silence = AlertSilence(
            rule_id=silence_in.rule_id,
            container_id=silence_in.container_id,
            silenced_until=silenced_until,
            reason=silence_in.reason,
            created_by=username,
            created_at=now,
        )
        self.db.add(silence)
        await self.db.flush()

        audit = AuditLog(
            user_id=user_id,
            username=username,
            action="alert.silence.create",
            target_type="alert_silence",
            target_id=str(silence.id),
            result=AuditResult.SUCCESS,
            payload={
                "rule_id": silence.rule_id,
                "container_id": silence.container_id,
                "duration_minutes": silence_in.duration_minutes,
                "reason": silence.reason,
            },
            ip_address=ip_address,
        )
        self.db.add(audit)
        await self.db.commit()
        await self.db.refresh(silence)
        return silence

    async def get_active_alerts_count(self) -> int:
        stmt = select(func.count(AlertEvent.id)).where(AlertEvent.status == "firing")
        res = await self.db.execute(stmt)
        return res.scalar() or 0
