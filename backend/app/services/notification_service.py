import asyncio
from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional, Set, Tuple
import uuid

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.constants import AuditResult
from app.core.encryption import decrypt_secret, encrypt_secret
from app.models.alert import AlertEvent
from app.models.audit import AuditLog
from app.models.notification import (
    NotificationChannel,
    NotificationDeliveryLog,
    NotificationRoute,
)
from app.schemas.notification import (
    NotificationChannelCreate,
    NotificationChannelResponse,
    NotificationChannelUpdate,
    NotificationRouteCreate,
    NotificationRouteResponse,
    NotificationRouteUpdate,
    NotificationTestResult,
)
from app.services.notifiers.dispatcher import dispatch_channel

logger = logging.getLogger(__name__)

SEVERITY_LEVELS: Dict[str, int] = {
    "info": 1,
    "warning": 2,
    "critical": 3,
}


def severity_meets_min(actual: str, minimum: str) -> bool:
    a_rank = SEVERITY_LEVELS.get((actual or "").lower(), 1)
    m_rank = SEVERITY_LEVELS.get((minimum or "").lower(), 1)
    return a_rank >= m_rank


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ---------------- Channels ----------------

    async def list_channels(self) -> Tuple[List[NotificationChannelResponse], int]:
        stmt = select(NotificationChannel).order_by(NotificationChannel.id)
        res = await self.db.execute(stmt)
        channels = list(res.scalars().all())

        responses = [
            NotificationChannelResponse(
                id=c.id,
                name=c.name,
                channel_type=c.channel_type,
                enabled=c.enabled,
                config=c.config or {},
                has_secret=bool(c.encrypted_secret),
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
            for c in channels
        ]
        return responses, len(responses)

    async def get_channel(self, channel_id: int) -> Optional[NotificationChannelResponse]:
        c = await self.db.get(NotificationChannel, channel_id)
        if not c:
            return None
        return NotificationChannelResponse(
            id=c.id,
            name=c.name,
            channel_type=c.channel_type,
            enabled=c.enabled,
            config=c.config or {},
            has_secret=bool(c.encrypted_secret),
            created_at=c.created_at,
            updated_at=c.updated_at,
        )

    async def create_channel(
        self,
        channel_in: NotificationChannelCreate,
        user_id: Optional[uuid.UUID] = None,
        username: str = "system",
        ip_address: Optional[str] = None,
    ) -> NotificationChannelResponse:
        enc_secret = encrypt_secret(channel_in.secret) if channel_in.secret else None
        channel = NotificationChannel(
            name=channel_in.name,
            channel_type=channel_in.channel_type,
            enabled=channel_in.enabled,
            config=channel_in.config,
            encrypted_secret=enc_secret,
        )
        self.db.add(channel)
        await self.db.flush()

        audit = AuditLog(
            user_id=user_id,
            username=username,
            action="notification.channel.create",
            target_type="notification_channel",
            target_id=str(channel.id),
            result=AuditResult.SUCCESS,
            payload={"name": channel.name, "channel_type": channel.channel_type},
            ip_address=ip_address,
        )
        self.db.add(audit)
        await self.db.commit()
        await self.db.refresh(channel)

        return NotificationChannelResponse(
            id=channel.id,
            name=channel.name,
            channel_type=channel.channel_type,
            enabled=channel.enabled,
            config=channel.config or {},
            has_secret=bool(channel.encrypted_secret),
            created_at=channel.created_at,
            updated_at=channel.updated_at,
        )

    async def update_channel(
        self,
        channel_id: int,
        channel_in: NotificationChannelUpdate,
        user_id: Optional[uuid.UUID] = None,
        username: str = "system",
        ip_address: Optional[str] = None,
    ) -> Optional[NotificationChannelResponse]:
        c = await self.db.get(NotificationChannel, channel_id)
        if not c:
            return None

        if channel_in.name is not None:
            c.name = channel_in.name
        if channel_in.enabled is not None:
            c.enabled = channel_in.enabled
        if channel_in.config is not None:
            c.config = channel_in.config
        if channel_in.secret is not None:
            c.encrypted_secret = encrypt_secret(channel_in.secret)

        c.updated_at = datetime.now(timezone.utc)

        audit = AuditLog(
            user_id=user_id,
            username=username,
            action="notification.channel.update",
            target_type="notification_channel",
            target_id=str(c.id),
            result=AuditResult.SUCCESS,
            payload={"name": c.name, "updated_secret": channel_in.secret is not None},
            ip_address=ip_address,
        )
        self.db.add(audit)
        await self.db.commit()
        await self.db.refresh(c)

        return NotificationChannelResponse(
            id=c.id,
            name=c.name,
            channel_type=c.channel_type,
            enabled=c.enabled,
            config=c.config or {},
            has_secret=bool(c.encrypted_secret),
            created_at=c.created_at,
            updated_at=c.updated_at,
        )

    async def delete_channel(
        self,
        channel_id: int,
        user_id: Optional[uuid.UUID] = None,
        username: str = "system",
        ip_address: Optional[str] = None,
    ) -> bool:
        c = await self.db.get(NotificationChannel, channel_id)
        if not c:
            return False

        audit = AuditLog(
            user_id=user_id,
            username=username,
            action="notification.channel.delete",
            target_type="notification_channel",
            target_id=str(c.id),
            result=AuditResult.SUCCESS,
            payload={"name": c.name, "channel_type": c.channel_type},
            ip_address=ip_address,
        )
        self.db.add(audit)
        await self.db.delete(c)
        await self.db.commit()
        return True

    async def test_channel(self, channel_id: int) -> NotificationTestResult:
        c = await self.db.get(NotificationChannel, channel_id)
        if not c:
            return NotificationTestResult(success=False, message="Channel not found", attempts=0)

        secret = decrypt_secret(c.encrypted_secret)
        title = "Test Notification from DockPilot"
        message = "This is a verification test of your notification channel configuration."
        severity = "info"
        details = {
            "channel_name": c.name,
            "channel_type": c.channel_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        success, attempts, err = await dispatch_channel(
            channel_type=c.channel_type,
            config=c.config or {},
            secret=secret,
            title=title,
            message=message,
            severity=severity,
            details=details,
            max_retries=1,
        )

        # Log test delivery
        log = NotificationDeliveryLog(
            channel_id=c.id,
            channel_name=c.name,
            channel_type=c.channel_type,
            event_id=None,
            alert_title=title,
            severity=severity,
            status="testing" if success else "failed",
            attempts=attempts,
            error_message=err,
            payload_preview=f"[{severity.upper()}] {title} - {message}",
        )
        self.db.add(log)
        await self.db.commit()

        if success:
            return NotificationTestResult(
                success=True,
                message=f"Test notification delivered successfully via {c.channel_type}",
                attempts=attempts,
            )
        else:
            return NotificationTestResult(
                success=False,
                message=f"Test delivery failed: {err}",
                attempts=attempts,
            )

    # ---------------- Routes ----------------

    async def list_routes(self) -> Tuple[List[NotificationRouteResponse], int]:
        stmt = (
            select(NotificationRoute)
            .options(selectinload(NotificationRoute.channel))
            .order_by(NotificationRoute.id)
        )
        res = await self.db.execute(stmt)
        routes = list(res.scalars().all())

        responses = [
            NotificationRouteResponse(
                id=r.id,
                channel_id=r.channel_id,
                channel_name=r.channel.name if r.channel else None,
                name=r.name,
                min_severity=r.min_severity,
                rule_type=r.rule_type,
                scope_type=r.scope_type,
                scope_value=r.scope_value,
                enabled=r.enabled,
                created_at=r.created_at,
            )
            for r in routes
        ]
        return responses, len(responses)

    async def get_route(self, route_id: int) -> Optional[NotificationRouteResponse]:
        stmt = (
            select(NotificationRoute)
            .options(selectinload(NotificationRoute.channel))
            .where(NotificationRoute.id == route_id)
        )
        res = await self.db.execute(stmt)
        r = res.scalar_one_or_none()
        if not r:
            return None
        return NotificationRouteResponse(
            id=r.id,
            channel_id=r.channel_id,
            channel_name=r.channel.name if r.channel else None,
            name=r.name,
            min_severity=r.min_severity,
            rule_type=r.rule_type,
            scope_type=r.scope_type,
            scope_value=r.scope_value,
            enabled=r.enabled,
            created_at=r.created_at,
        )

    async def create_route(
        self,
        route_in: NotificationRouteCreate,
        user_id: Optional[uuid.UUID] = None,
        username: str = "system",
        ip_address: Optional[str] = None,
    ) -> NotificationRouteResponse:
        channel = await self.db.get(NotificationChannel, route_in.channel_id)
        if not channel:
            raise ValueError(f"Channel {route_in.channel_id} not found")

        route = NotificationRoute(
            channel_id=route_in.channel_id,
            name=route_in.name,
            min_severity=route_in.min_severity,
            rule_type=route_in.rule_type,
            scope_type=route_in.scope_type,
            scope_value=route_in.scope_value,
            enabled=route_in.enabled,
        )
        self.db.add(route)
        await self.db.flush()

        audit = AuditLog(
            user_id=user_id,
            username=username,
            action="notification.route.create",
            target_type="notification_route",
            target_id=str(route.id),
            result=AuditResult.SUCCESS,
            payload={"name": route.name, "channel_id": route.channel_id},
            ip_address=ip_address,
        )
        self.db.add(audit)
        await self.db.commit()
        await self.db.refresh(route)

        return NotificationRouteResponse(
            id=route.id,
            channel_id=route.channel_id,
            channel_name=channel.name,
            name=route.name,
            min_severity=route.min_severity,
            rule_type=route.rule_type,
            scope_type=route.scope_type,
            scope_value=route.scope_value,
            enabled=route.enabled,
            created_at=route.created_at,
        )

    async def update_route(
        self,
        route_id: int,
        route_in: NotificationRouteUpdate,
        user_id: Optional[uuid.UUID] = None,
        username: str = "system",
        ip_address: Optional[str] = None,
    ) -> Optional[NotificationRouteResponse]:
        route = await self.db.get(NotificationRoute, route_id)
        if not route:
            return None

        update_data = route_in.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            setattr(route, k, v)

        audit = AuditLog(
            user_id=user_id,
            username=username,
            action="notification.route.update",
            target_type="notification_route",
            target_id=str(route.id),
            result=AuditResult.SUCCESS,
            payload=update_data,
            ip_address=ip_address,
        )
        self.db.add(audit)
        await self.db.commit()
        await self.db.refresh(route)

        channel = await self.db.get(NotificationChannel, route.channel_id)
        return NotificationRouteResponse(
            id=route.id,
            channel_id=route.channel_id,
            channel_name=channel.name if channel else None,
            name=route.name,
            min_severity=route.min_severity,
            rule_type=route.rule_type,
            scope_type=route.scope_type,
            scope_value=route.scope_value,
            enabled=route.enabled,
            created_at=route.created_at,
        )

    async def delete_route(
        self,
        route_id: int,
        user_id: Optional[uuid.UUID] = None,
        username: str = "system",
        ip_address: Optional[str] = None,
    ) -> bool:
        route = await self.db.get(NotificationRoute, route_id)
        if not route:
            return False

        audit = AuditLog(
            user_id=user_id,
            username=username,
            action="notification.route.delete",
            target_type="notification_route",
            target_id=str(route.id),
            result=AuditResult.SUCCESS,
            payload={"name": route.name},
            ip_address=ip_address,
        )
        self.db.add(audit)
        await self.db.delete(route)
        await self.db.commit()
        return True

    # ---------------- Delivery Logs ----------------

    async def list_delivery_logs(
        self,
        channel_id: Optional[int] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[NotificationDeliveryLog], int]:
        stmt = select(NotificationDeliveryLog)
        count_stmt = select(func.count(NotificationDeliveryLog.id))

        if channel_id is not None:
            stmt = stmt.where(NotificationDeliveryLog.channel_id == channel_id)
            count_stmt = count_stmt.where(NotificationDeliveryLog.channel_id == channel_id)
        if status:
            stmt = stmt.where(NotificationDeliveryLog.status == status)
            count_stmt = count_stmt.where(NotificationDeliveryLog.status == status)

        count_res = await self.db.execute(count_stmt)
        total = count_res.scalar() or 0

        stmt = stmt.order_by(desc(NotificationDeliveryLog.created_at)).limit(limit).offset(offset)
        res = await self.db.execute(stmt)
        logs = list(res.scalars().all())
        return logs, total

    # ---------------- Dispatch Alert Event ----------------

    async def notify_alert_event(self, event: AlertEvent) -> int:
        """Evaluates routes and dispatches alert notifications asynchronously."""
        stmt = (
            select(NotificationRoute)
            .options(selectinload(NotificationRoute.channel))
            .where(NotificationRoute.enabled.is_(True))
        )
        res = await self.db.execute(stmt)
        routes = list(res.scalars().all())

        matched_channels: Dict[int, NotificationChannel] = {}

        for r in routes:
            if not r.channel or not r.channel.enabled:
                continue

            # 1. Severity check
            if not severity_meets_min(event.severity, r.min_severity):
                continue

            # 2. Rule type check
            if r.rule_type and r.rule_type != "all" and r.rule_type != event.rule_type:
                continue

            # 3. Scope check
            if r.scope_type == "container" and r.scope_value:
                target = r.scope_value.strip().lstrip("/")
                c_name = (event.target_name or "").lstrip("/")
                c_id = event.target_id or ""
                if c_name != target and c_id != target and not c_id.startswith(target):
                    continue

            matched_channels[r.channel.id] = r.channel

        if not matched_channels:
            return 0

        title = f"{event.rule_name} ({event.status.upper()})"
        details = {
            "rule_name": event.rule_name,
            "rule_type": event.rule_type,
            "severity": event.severity,
            "target": event.target_name or event.target_id or "host",
            "status": event.status,
            "started_at": event.started_at.isoformat() if event.started_at else None,
            "value": event.value,
            "threshold": event.threshold,
        }

        sent_count = 0
        for channel in matched_channels.values():
            secret = decrypt_secret(channel.encrypted_secret)
            success, attempts, err = await dispatch_channel(
                channel_type=channel.channel_type,
                config=channel.config or {},
                secret=secret,
                title=title,
                message=event.message,
                severity=event.severity,
                details=details,
                max_retries=3,
            )

            log = NotificationDeliveryLog(
                channel_id=channel.id,
                channel_name=channel.name,
                channel_type=channel.channel_type,
                event_id=event.id,
                alert_title=title,
                severity=event.severity,
                status="delivered" if success else "failed",
                attempts=attempts,
                error_message=err,
                payload_preview=f"[{event.severity.upper()}] {title} - {event.message}",
            )
            self.db.add(log)
            sent_count += 1

        await self.db.commit()
        return sent_count
