import math
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import delete, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.constants import AuditResult
from app.models.audit import AuditLog
from app.models.event import ContainerEventRecord
from app.models.metrics import ContainerMetricRecord, HostMetricRecord, MetricRollupRecord
from app.models.notification import NotificationChannel, NotificationRoute, NotificationDeliveryLog
from app.models.session import UserSession
from app.models.setting import SystemSetting
from app.models.terminal import TerminalSession
from app.models.user import User
from app.schemas.settings import (
    AlertSettings,
    FeatureFlagSettings,
    FieldMetadata,
    RetentionRunResponse,
    RetentionSettings,
    SecuritySettings,
    SettingsResponse,
    SettingsUpdateRequest,
    StorageUsageResponse,
    TableStorageItem,
    TelemetrySettings,
)


def format_bytes(size: float) -> str:
    if size < 0:
        return "0 B"
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if abs(size) < 1024.0:
            return f"{size:3.1f} {unit}"
        size /= 1024.0
    return f"{size:.1f} PB"


class SettingsService:
    def __init__(self, db: AsyncSession, settings: Optional[Settings] = None):
        self.db = db
        self.settings = settings or get_settings()

    async def get_all_settings(self) -> SettingsResponse:
        db_settings = await self._get_db_settings_map()

        def val(key: str, default: Any) -> Any:
            return db_settings.get(key, getattr(self.settings, key, default))

        telemetry = TelemetrySettings(
            collection_interval_seconds=val("collection_interval_seconds", 5),
            metrics_interval_seconds=val("metrics_interval_seconds", 3),
            container_detail_stats_interval_seconds=val("container_detail_stats_interval_seconds", 2),
            host_metrics_interval_seconds=val("host_metrics_interval_seconds", 3),
            log_tail_default=val("log_tail_default", 200),
        )

        retention = RetentionSettings(
            retention_days=val("retention_days", 30),
            events_retention_days=val("events_retention_days", 30),
            audit_retention_days=val("audit_retention_days", 90),
            terminal_transcript_retention_days=val("terminal_transcript_retention_days", 30),
            metrics_rollup_age_hours=val("metrics_rollup_age_hours", 24),
        )

        security = SecuritySettings(
            secret_mask_patterns=val("secret_mask_patterns", [
                "*PASSWORD*", "*SECRET*", "*TOKEN*", "*KEY*", "*AUTH*", "*CREDENTIAL*", "*PRIVATE*"
            ]),
            max_login_attempts=val("max_login_attempts", 5),
            lockout_duration_minutes=val("lockout_duration_minutes", 15),
        )

        alerts = AlertSettings(
            alert_eval_interval_seconds=val("alert_eval_interval_seconds", 15),
            alert_default_cooldown_minutes=val("alert_default_cooldown_minutes", 15),
        )

        features = FeatureFlagSettings(
            terminal_enabled=val("terminal_enabled", False),
            metrics_collection_enabled=val("metrics_collection_enabled", True),
            auto_prune_enabled=val("auto_prune_enabled", False),
            registration_enabled=val("registration_enabled", False),
        )

        metadata = self._build_metadata()

        return SettingsResponse(
            telemetry=telemetry,
            retention=retention,
            security=security,
            alerts=alerts,
            features=features,
            metadata=metadata,
        )

    async def update_settings(
        self,
        updates: SettingsUpdateRequest,
        user: Optional[User] = None,
    ) -> SettingsResponse:
        data = updates.model_dump(exclude_unset=True)
        if not data:
            return await self.get_all_settings()

        now = datetime.now(timezone.utc)
        username = user.username if user else "system"
        user_id = user.id if user else None

        for k, v in data.items():
            res = await self.db.execute(select(SystemSetting).where(SystemSetting.key == k))
            setting = res.scalar_one_or_none()
            if setting:
                setting.value = {"v": v}
                setting.updated_at = now
                setting.updated_by = username
            else:
                setting = SystemSetting(
                    key=k,
                    value={"v": v},
                    updated_at=now,
                    updated_by=username,
                )
                self.db.add(setting)

            # Hot-patch active in-memory settings so changes take effect immediately
            if hasattr(self.settings, k):
                try:
                    setattr(self.settings, k, v)
                except Exception:
                    pass

        # Audit log entry
        audit = AuditLog(
            user_id=user_id,
            username=username,
            action="settings.update",
            target_type="settings",
            target_id="system",
            result=AuditResult.SUCCESS,
            payload={"updated_keys": list(data.keys()), "changes": data},
        )
        self.db.add(audit)
        await self.db.commit()

        return await self.get_all_settings()

    async def get_storage_usage(self) -> StorageUsageResponse:
        tables = [
            ("container_metrics", ContainerMetricRecord),
            ("metric_rollups", MetricRollupRecord),
            ("host_metrics", HostMetricRecord),
            ("container_events", ContainerEventRecord),
            ("audit_logs", AuditLog),
            ("terminal_sessions", TerminalSession),
            ("users", User),
            ("user_sessions", UserSession),
            ("notification_channels", NotificationChannel),
            ("notification_routes", NotificationRoute),
            ("notification_delivery_logs", NotificationDeliveryLog),
        ]

        table_items: List[TableStorageItem] = []
        total_db_bytes = 0
        bind = self.db.bind
        dialect_name = bind.dialect.name if bind else "postgresql"

        # Check PostgreSQL database size if on postgres
        if dialect_name == "postgresql":
            try:
                db_res = await self.db.execute(text("SELECT pg_database_size(current_database());"))
                total_db_bytes = db_res.scalar() or 0
            except Exception:
                total_db_bytes = 0

        for tbl_name, model in tables:
            try:
                cnt_res = await self.db.execute(select(func.count()).select_from(model))
                count = cnt_res.scalar() or 0

                size_bytes = 0
                if dialect_name == "postgresql":
                    try:
                        sz_res = await self.db.execute(
                            text(f"SELECT pg_total_relation_size('{tbl_name}');")
                        )
                        size_bytes = sz_res.scalar() or 0
                    except Exception:
                        size_bytes = count * 256
                else:
                    size_bytes = count * 256

                table_items.append(
                    TableStorageItem(
                        table_name=tbl_name,
                        row_count=count,
                        size_bytes=size_bytes,
                        size_human=format_bytes(size_bytes),
                    )
                )
            except Exception:
                table_items.append(
                    TableStorageItem(
                        table_name=tbl_name,
                        row_count=0,
                        size_bytes=0,
                        size_human="0 B",
                    )
                )

        if total_db_bytes == 0:
            total_db_bytes = sum(t.size_bytes for t in table_items)

        db_name = "dockpilot"
        if dialect_name == "postgresql" and bind and hasattr(bind.url, "database"):
            db_name = bind.url.database or "dockpilot"

        return StorageUsageResponse(
            database_name=db_name,
            database_size_bytes=total_db_bytes,
            database_size_human=format_bytes(total_db_bytes),
            tables=table_items,
            updated_at=datetime.now(timezone.utc),
        )

    async def run_retention(self, user: Optional[User] = None) -> RetentionRunResponse:
        start_time = time.monotonic()
        now = datetime.now(timezone.utc)
        db_settings = await self._get_db_settings_map()

        def val(k: str, default: Any) -> Any:
            return db_settings.get(k, getattr(self.settings, k, default))

        metrics_rollup_age_hours = val("metrics_rollup_age_hours", 24)
        retention_days = val("retention_days", 30)
        events_retention_days = val("events_retention_days", 30)
        audit_retention_days = val("audit_retention_days", 90)
        terminal_transcript_retention_days = val("terminal_transcript_retention_days", 30)

        # 1. Roll up raw container metrics older than metrics_rollup_age_hours
        rollup_cutoff = now - timedelta(hours=metrics_rollup_age_hours)
        cand_res = await self.db.execute(
            select(ContainerMetricRecord).where(ContainerMetricRecord.timestamp <= rollup_cutoff)
        )
        cand_metrics = cand_res.scalars().all()

        buckets: Dict[tuple, Dict[str, Any]] = {}
        for m in cand_metrics:
            ts = m.timestamp
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            b_time = ts.replace(minute=0, second=0, microsecond=0)
            key = (m.container_id, b_time)
            if key not in buckets:
                buckets[key] = {
                    "cpu_sum": 0.0,
                    "cpu_max": 0.0,
                    "mem_sum": 0,
                    "mem_max": 0,
                    "count": 0,
                }
            b = buckets[key]
            b["cpu_sum"] += m.cpu_percent
            b["cpu_max"] = max(b["cpu_max"], m.cpu_percent)
            b["mem_sum"] += m.memory_bytes
            b["mem_max"] = max(b["mem_max"], m.memory_bytes)
            b["count"] += 1

        for (cid, btime), b in buckets.items():
            rollup = MetricRollupRecord(
                container_id=cid,
                bucket_time=btime,
                cpu_percent_avg=round(b["cpu_sum"] / b["count"], 2),
                cpu_percent_max=round(b["cpu_max"], 2),
                memory_bytes_avg=int(b["mem_sum"] / b["count"]),
                memory_bytes_max=b["mem_max"],
                sample_count=b["count"],
            )
            self.db.add(rollup)

        metrics_downsampled = len(cand_metrics)
        if cand_metrics:
            ids = [m.id for m in cand_metrics]
            await self.db.execute(
                delete(ContainerMetricRecord)
                .where(ContainerMetricRecord.id.in_(ids))
                .execution_options(synchronize_session=False)
            )

        # 2. Purge expired metrics past retention_days
        metric_cutoff = now - timedelta(days=retention_days)
        m_del = await self.db.execute(
            delete(MetricRollupRecord)
            .where(MetricRollupRecord.bucket_time < metric_cutoff)
            .execution_options(synchronize_session=False)
        )
        m_raw_del = await self.db.execute(
            delete(ContainerMetricRecord)
            .where(ContainerMetricRecord.timestamp < metric_cutoff)
            .execution_options(synchronize_session=False)
        )
        metrics_deleted = (m_del.rowcount or 0) + (m_raw_del.rowcount or 0)

        # 3. Purge container events past events_retention_days
        ev_cutoff = now - timedelta(days=events_retention_days)
        ev_del = await self.db.execute(
            delete(ContainerEventRecord)
            .where(ContainerEventRecord.timestamp < ev_cutoff)
            .execution_options(synchronize_session=False)
        )
        events_deleted = ev_del.rowcount or 0

        # 4. Purge audit logs past audit_retention_days
        au_cutoff = now - timedelta(days=audit_retention_days)
        au_del = await self.db.execute(
            delete(AuditLog)
            .where(AuditLog.timestamp < au_cutoff)
            .execution_options(synchronize_session=False)
        )
        audit_deleted = au_del.rowcount or 0

        # 5. Purge terminal sessions past terminal_transcript_retention_days
        tm_cutoff = now - timedelta(days=terminal_transcript_retention_days)
        tm_del = await self.db.execute(
            delete(TerminalSession)
            .where(TerminalSession.started_at < tm_cutoff)
            .execution_options(synchronize_session=False)
        )
        term_deleted = tm_del.rowcount or 0

        # Audit log for retention run
        username = user.username if user else "system"
        user_id = user.id if user else None
        duration = round(time.monotonic() - start_time, 3)

        audit = AuditLog(
            user_id=user_id,
            username=username,
            action="settings.retention_run",
            target_type="retention",
            target_id="system",
            result=AuditResult.SUCCESS,
            payload={
                "metrics_downsampled": metrics_downsampled,
                "metrics_deleted": metrics_deleted,
                "events_deleted": events_deleted,
                "audit_logs_deleted": audit_deleted,
                "terminal_sessions_deleted": term_deleted,
                "duration_seconds": duration,
            },
        )
        self.db.add(audit)
        await self.db.commit()

        return RetentionRunResponse(
            metrics_downsampled=metrics_downsampled,
            metrics_deleted=metrics_deleted,
            events_deleted=events_deleted,
            audit_logs_deleted=audit_deleted,
            terminal_sessions_deleted=term_deleted,
            duration_seconds=duration,
            timestamp=datetime.now(timezone.utc),
            message="Data retention cleanup completed successfully",
        )

    async def _get_db_settings_map(self) -> Dict[str, Any]:
        res = await self.db.execute(select(SystemSetting))
        rows = res.scalars().all()
        mapping = {}
        for r in rows:
            if isinstance(r.value, dict) and "v" in r.value:
                mapping[r.key] = r.value["v"]
            else:
                mapping[r.key] = r.value
        return mapping

    def _build_metadata(self) -> Dict[str, FieldMetadata]:
        return {
            "collection_interval_seconds": FieldMetadata(
                hot_reload=True,
                restart_required=False,
                help_text="Frequency (in seconds) for periodic Docker container polling",
                min_value=1,
                max_value=60,
            ),
            "metrics_interval_seconds": FieldMetadata(
                hot_reload=True,
                restart_required=False,
                help_text="Interval between container resource usage metrics snapshots",
                min_value=1,
                max_value=30,
            ),
            "container_detail_stats_interval_seconds": FieldMetadata(
                hot_reload=True,
                restart_required=False,
                help_text="Streaming interval for real-time SSE telemetry on container detail page",
                min_value=1,
                max_value=10,
            ),
            "host_metrics_interval_seconds": FieldMetadata(
                hot_reload=True,
                restart_required=False,
                help_text="Frequency of server host CPU, Memory, and Disk stats capture",
                min_value=1,
                max_value=30,
            ),
            "log_tail_default": FieldMetadata(
                hot_reload=True,
                restart_required=False,
                help_text="Initial line count fetched when opening container logs",
                min_value=10,
                max_value=1000,
            ),
            "retention_days": FieldMetadata(
                hot_reload=True,
                restart_required=False,
                help_text="Days to retain historical container metric samples before purge",
                min_value=1,
                max_value=365,
            ),
            "events_retention_days": FieldMetadata(
                hot_reload=True,
                restart_required=False,
                help_text="Days to retain lifecycle container event timeline logs",
                min_value=1,
                max_value=365,
            ),
            "audit_retention_days": FieldMetadata(
                hot_reload=True,
                restart_required=False,
                help_text="Days to retain immutable system and user audit trail records",
                min_value=7,
                max_value=365,
            ),
            "terminal_transcript_retention_days": FieldMetadata(
                hot_reload=True,
                restart_required=False,
                help_text="Days to retain web terminal session recordings and logs",
                min_value=1,
                max_value=365,
            ),
            "metrics_rollup_age_hours": FieldMetadata(
                hot_reload=True,
                restart_required=False,
                help_text="Hours before raw high-frequency telemetry is aggregated into hourly rollups",
                min_value=1,
                max_value=168,
            ),
            "secret_mask_patterns": FieldMetadata(
                hot_reload=True,
                restart_required=False,
                help_text="Wildcard glob patterns used to redact sensitive environment variables",
            ),
            "max_login_attempts": FieldMetadata(
                hot_reload=True,
                restart_required=False,
                help_text="Failed login attempts allowed before account enters temporary lockout",
                min_value=3,
                max_value=20,
            ),
            "lockout_duration_minutes": FieldMetadata(
                hot_reload=True,
                restart_required=False,
                help_text="Duration in minutes an account remains locked after max failures",
                min_value=1,
                max_value=60,
            ),
            "alert_eval_interval_seconds": FieldMetadata(
                hot_reload=True,
                restart_required=False,
                help_text="Interval between background alert rule evaluation ticks",
                min_value=5,
                max_value=300,
            ),
            "alert_default_cooldown_minutes": FieldMetadata(
                hot_reload=True,
                restart_required=False,
                help_text="Default quiet period before re-triggering notifications for an active alert",
                min_value=1,
                max_value=1440,
            ),
            "terminal_enabled": FieldMetadata(
                hot_reload=True,
                restart_required=False,
                help_text="Enable or disable interactive web terminal execution system-wide",
            ),
            "metrics_collection_enabled": FieldMetadata(
                hot_reload=True,
                restart_required=False,
                help_text="Enable background collection of container and host metrics",
            ),
            "auto_prune_enabled": FieldMetadata(
                hot_reload=True,
                restart_required=False,
                help_text="Enable automated periodic pruning of unused Docker resources",
            ),
            "registration_enabled": FieldMetadata(
                hot_reload=True,
                restart_required=False,
                help_text="Allow public self-registration (otherwise users are admin-created only)",
            ),
        }
