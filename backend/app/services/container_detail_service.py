import asyncio
from datetime import datetime, timedelta, timezone
import fnmatch
from typing import Any, AsyncGenerator, Dict, List, Optional
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.constants import AuditResult
from app.docker.interface import DockerGateway
from app.models.audit import AuditLog
from app.models.metrics import ContainerMetricRecord
from app.schemas.container_detail import (
    ContainerDetailResponse,
    ContainerLiveStats,
    ContainerMetricsHistoryResponse,
    EnvRevealResponse,
    EnvVarItem,
    HealthcheckInfo,
    MountItem,
    NetworkItem,
)


def is_secret_key(key: str, patterns: List[str]) -> bool:
    upper_key = key.upper()
    return any(fnmatch.fnmatch(upper_key, pat.upper()) for pat in patterns)


def parse_env(
    raw_env: List[str], patterns: List[str], mask_secrets: bool = True
) -> List[EnvVarItem]:
    items: List[EnvVarItem] = []
    for item in raw_env:
        if "=" in item:
            key, val = item.split("=", 1)
        else:
            key, val = item, ""

        secret = is_secret_key(key, patterns)
        if secret and mask_secrets:
            items.append(EnvVarItem(key=key, value="********", is_masked=True))
        else:
            items.append(EnvVarItem(key=key, value=val, is_masked=secret))
    return items


def parse_mounts(raw_mounts: Any) -> List[MountItem]:
    mounts: List[MountItem] = []
    if not isinstance(raw_mounts, list):
        return mounts

    for m in raw_mounts:
        if isinstance(m, dict):
            m_type = m.get("Type") or m.get("type") or "volume"
            src = m.get("Source") or m.get("source") or ""
            dst = m.get("Destination") or m.get("destination") or ""
            mode = m.get("Mode") or m.get("mode") or ""
            rw = m.get("RW") if "RW" in m else m.get("rw", True)
            mounts.append(
                MountItem(
                    type=str(m_type),
                    source=str(src),
                    destination=str(dst),
                    mode=str(mode),
                    rw=bool(rw),
                )
            )
    return mounts


def parse_networks(raw_networks: Any) -> List[NetworkItem]:
    networks: List[NetworkItem] = []
    if not isinstance(raw_networks, dict):
        return networks

    for net_name, net_cfg in raw_networks.items():
        if isinstance(net_cfg, dict):
            ip = net_cfg.get("IPAddress") or net_cfg.get("ip_address") or ""
            gw = net_cfg.get("Gateway") or net_cfg.get("gateway") or ""
            mac = net_cfg.get("MacAddress") or net_cfg.get("mac_address") or ""
            networks.append(
                NetworkItem(
                    network_name=str(net_name),
                    ip_address=str(ip),
                    gateway=str(gw),
                    mac_address=str(mac),
                )
            )
    return networks


def parse_healthcheck(raw_health: Any) -> Optional[HealthcheckInfo]:
    if not isinstance(raw_health, dict) or not raw_health:
        return None
    status_val = raw_health.get("Status") or raw_health.get("status") or "none"
    streak = raw_health.get("FailingStreak") or raw_health.get("failing_streak") or 0
    raw_log = raw_health.get("Log") or raw_health.get("log") or []
    log_list: List[Dict[str, Any]] = []
    if isinstance(raw_log, list):
        for entry in raw_log:
            if isinstance(entry, dict):
                log_list.append(entry)
    return HealthcheckInfo(
        status=str(status_val),
        failing_streak=int(streak),
        log=log_list,
    )


async def get_container_details(
    gateway: DockerGateway,
    container_id: str,
) -> ContainerDetailResponse:
    try:
        data = await gateway.inspect_container(container_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Container {container_id} not found",
        )

    settings = get_settings()
    patterns = settings.secret_mask_patterns

    raw_env = data.get("env") or []
    env_items = parse_env(raw_env, patterns, mask_secrets=True)

    mounts = parse_mounts(data.get("mounts"))
    networks = parse_networks(data.get("networks"))
    healthcheck = parse_healthcheck(data.get("health_info"))

    host_config = data.get("host_config") or {}
    limits = {
        "memory": host_config.get("Memory", 0),
        "nano_cpus": host_config.get("NanoCpus", 0),
        "cpu_quota": host_config.get("CpuQuota", 0),
        "cpu_period": host_config.get("CpuPeriod", 0),
        "cpu_shares": host_config.get("CpuShares", 0),
    }

    return ContainerDetailResponse(
        id=data.get("id", container_id),
        name=data.get("name", ""),
        image=data.get("image", ""),
        command=data.get("command", ""),
        created=data.get("created", ""),
        state=data.get("state", "unknown"),
        status=data.get("status", ""),
        health=data.get("health", "none"),
        restart_count=data.get("restart_count", 0),
        restart_policy=data.get("restart_policy") or {},
        ports=data.get("ports") or {},
        mounts=mounts,
        networks=networks,
        labels=data.get("labels") or {},
        env=env_items,
        limits=limits,
        healthcheck=healthcheck,
    )


async def reveal_container_env(
    gateway: DockerGateway,
    container_id: str,
    user_id: Optional[uuid.UUID],
    username: str,
    ip: Optional[str],
    db: AsyncSession,
) -> EnvRevealResponse:
    try:
        data = await gateway.inspect_container(container_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Container {container_id} not found",
        )

    container_name = data.get("name", container_id)

    audit = AuditLog(
        user_id=user_id,
        username=username,
        action="container.reveal_env",
        target_type="container",
        target_id=container_id,
        result=AuditResult.SUCCESS,
        payload={"container_name": container_name},
        ip_address=ip,
    )
    db.add(audit)
    await db.commit()

    settings = get_settings()
    patterns = settings.secret_mask_patterns
    raw_env = data.get("env") or []
    env_items = parse_env(raw_env, patterns, mask_secrets=False)

    return EnvRevealResponse(env=env_items)


async def stream_container_stats(
    gateway: DockerGateway,
    container_id: str,
    interval_seconds: int = 2,
    once: bool = False,
) -> AsyncGenerator[str, None]:
    try:
        while True:
            stats = await gateway.get_container_stats(container_id)
            now_iso = datetime.now(timezone.utc).isoformat()
            live = ContainerLiveStats(
                container_id=container_id,
                timestamp=now_iso,
                cpu_percent=stats.get("cpu_percent", 0.0),
                memory_bytes=stats.get("memory_bytes", 0),
                memory_limit=stats.get("memory_limit", 0),
                memory_percent=stats.get("memory_percent", 0.0),
                net_rx_bytes=stats.get("net_rx_bytes", 0),
                net_tx_bytes=stats.get("net_tx_bytes", 0),
                block_read_bytes=stats.get("block_read_bytes", 0),
                block_write_bytes=stats.get("block_write_bytes", 0),
            )
            yield f"data: {live.model_dump_json()}\n\n"
            if once:
                break
            await asyncio.sleep(interval_seconds)
    except (asyncio.CancelledError, GeneratorExit):
        return
    except Exception as e:
        err_msg = f'{{"error": "Stream disconnected: {str(e)}"}}'
        yield f"data: {err_msg}\n\n"


async def get_container_metrics_history(
    container_id: str,
    range_str: str,
    db: AsyncSession,
) -> ContainerMetricsHistoryResponse:
    now = datetime.now(timezone.utc)
    range_clean = range_str.lower()
    if range_clean == "6h":
        since = now - timedelta(hours=6)
    elif range_clean == "24h":
        since = now - timedelta(hours=24)
    elif range_clean == "7d":
        since = now - timedelta(days=7)
    else:
        range_clean = "1h"
        since = now - timedelta(hours=1)

    stmt = (
        select(ContainerMetricRecord)
        .where(
            ContainerMetricRecord.container_id == container_id,
            ContainerMetricRecord.timestamp >= since,
        )
        .order_by(ContainerMetricRecord.timestamp.asc())
    )
    result = await db.execute(stmt)
    records = list(result.scalars().all())

    # Downsample to at most 100 points
    max_points = 100
    if len(records) > max_points:
        step = len(records) / float(max_points)
        sampled_records = [records[int(i * step)] for i in range(max_points)]
    else:
        sampled_records = records

    points: List[ContainerLiveStats] = []
    for r in sampled_records:
        mem_pct = (
            round((r.memory_bytes / r.memory_limit) * 100.0, 2)
            if r.memory_limit > 0
            else 0.0
        )
        points.append(
            ContainerLiveStats(
                container_id=r.container_id,
                timestamp=r.timestamp.isoformat(),
                cpu_percent=r.cpu_percent,
                memory_bytes=r.memory_bytes,
                memory_limit=r.memory_limit,
                memory_percent=mem_pct,
                net_rx_bytes=r.network_rx_bytes,
                net_tx_bytes=r.network_tx_bytes,
                block_read_bytes=r.block_read_bytes,
                block_write_bytes=r.block_write_bytes,
            )
        )

    return ContainerMetricsHistoryResponse(
        container_id=container_id,
        range=range_clean,
        points=points,
    )


async def record_container_metric(
    container_id: str,
    stats: Dict[str, Any],
    db: AsyncSession,
) -> ContainerMetricRecord:
    metric = ContainerMetricRecord(
        container_id=container_id,
        timestamp=datetime.now(timezone.utc),
        cpu_percent=stats.get("cpu_percent", 0.0),
        memory_bytes=stats.get("memory_bytes", 0),
        memory_limit=stats.get("memory_limit", 0),
        network_rx_bytes=stats.get("net_rx_bytes", 0),
        network_tx_bytes=stats.get("net_tx_bytes", 0),
        block_read_bytes=stats.get("block_read_bytes", 0),
        block_write_bytes=stats.get("block_write_bytes", 0),
    )
    db.add(metric)
    await db.commit()
    await db.refresh(metric)
    return metric
