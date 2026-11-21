import asyncio
import json
import math
import uuid
from typing import Any, AsyncGenerator, Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.constants import AuditResult
from app.core.security import create_delete_token, decode_token
from app.docker.interface import DockerGateway
from app.models.audit import AuditLog
from app.schemas.container import (
    BulkActionResponse,
    BulkActionResultItem,
    ContainerLiveMetrics,
    ContainersListResponse,
    ContainerSummary,
    DeleteTokenResponse,
)

ALLOWED_ACTIONS = {"start", "stop", "restart", "pause", "unpause", "kill"}


async def list_containers(
    gateway: DockerGateway,
    q: Optional[str] = None,
    state: Optional[str] = None,
    health: Optional[str] = None,
    compose_project: Optional[str] = None,
    label: Optional[str] = None,
    sort_by: str = "name",
    sort_order: str = "asc",
    page: int = 1,
    page_size: int = 20,
) -> ContainersListResponse:
    settings = get_settings()
    page_size = max(1, min(page_size, settings.containers_page_size_max))
    page = max(1, page)

    raw_containers = await gateway.list_containers(all=True)
    summaries: List[ContainerSummary] = []

    for c in raw_containers:
        labels = c.get("labels") or {}
        project = labels.get("com.docker.compose.project")
        summary = ContainerSummary(
            id=c.get("id", ""),
            name=c.get("name", ""),
            image=c.get("image", ""),
            state=c.get("state", "unknown"),
            status=c.get("status", ""),
            health=c.get("health", "none"),
            restart_count=c.get("restart_count", 0),
            created=c.get("created", ""),
            ports=c.get("ports") or {},
            labels=labels,
            compose_project=project,
        )
        summaries.append(summary)

    # Filtering
    filtered = summaries

    if q:
        q_lower = q.lower()
        filtered = [
            c for c in filtered
            if q_lower in c.name.lower() or q_lower in c.id.lower() or q_lower in c.image.lower()
        ]

    if state:
        state_lower = state.lower()
        filtered = [c for c in filtered if c.state.lower() == state_lower]

    if health:
        health_lower = health.lower()
        filtered = [c for c in filtered if c.health.lower() == health_lower]

    if compose_project:
        project_lower = compose_project.lower()
        filtered = [
            c for c in filtered
            if c.compose_project and c.compose_project.lower() == project_lower
        ]

    if label:
        if "=" in label:
            k, v = label.split("=", 1)
            filtered = [c for c in filtered if c.labels.get(k) == v]
        else:
            filtered = [c for c in filtered if label in c.labels]

    # Sorting
    reverse = sort_order.lower() == "desc"

    def sort_key(c: ContainerSummary) -> Any:
        if sort_by == "state":
            return c.state.lower()
        elif sort_by == "health":
            return c.health.lower()
        elif sort_by == "created":
            return c.created
        elif sort_by == "image":
            return c.image.lower()
        elif sort_by == "restart_count":
            return c.restart_count
        elif sort_by == "compose_project":
            return (c.compose_project or "").lower()
        return c.name.lower()

    filtered.sort(key=sort_key, reverse=reverse)

    total = len(filtered)
    total_pages = max(1, math.ceil(total / page_size)) if total > 0 else 1
    start = (page - 1) * page_size
    items = filtered[start : start + page_size]

    return ContainersListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


async def execute_container_action(
    gateway: DockerGateway,
    container_id: str,
    action: str,
    user_id: Optional[uuid.UUID],
    username: str,
    ip: Optional[str],
    db: AsyncSession,
) -> bool:
    action_clean = action.lower()
    if action_clean not in ALLOWED_ACTIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported container action '{action}'",
        )

    try:
        container = await gateway.inspect_container(container_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Container {container_id} not found",
        )

    container_name = container.get("name", container_id)

    # Pre-audit log
    audit = AuditLog(
        user_id=user_id,
        username=username,
        action=f"container.{action_clean}",
        target_type="container",
        target_id=container_id,
        result=AuditResult.SUCCESS,
        payload={"container_name": container_name, "status": "pending"},
        ip_address=ip,
    )
    db.add(audit)
    await db.commit()

    try:
        success = await gateway.execute_action(container_id, action_clean)
        if not success:
            raise RuntimeError(f"Action {action_clean} returned failure")
        audit.payload = {"container_name": container_name, "status": "completed"}
        audit.result = AuditResult.SUCCESS
        await db.commit()
        return True
    except Exception as e:
        audit.result = AuditResult.FAILURE
        audit.error_message = str(e)
        audit.payload = {"container_name": container_name, "status": "failed"}
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute {action_clean} on container {container_id}: {e}",
        )


async def execute_bulk_actions(
    gateway: DockerGateway,
    action: str,
    container_ids: List[str],
    user_id: Optional[uuid.UUID],
    username: str,
    ip: Optional[str],
    db: AsyncSession,
) -> BulkActionResponse:
    action_clean = action.lower()
    if action_clean not in ALLOWED_ACTIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported bulk action '{action}'",
        )

    results: List[BulkActionResultItem] = []
    total_success = 0
    total_failed = 0

    for cid in container_ids:
        try:
            await execute_container_action(
                gateway=gateway,
                container_id=cid,
                action=action_clean,
                user_id=user_id,
                username=username,
                ip=ip,
                db=db,
            )
            results.append(
                BulkActionResultItem(
                    container_id=cid,
                    action=action_clean,
                    success=True,
                )
            )
            total_success += 1
        except HTTPException as he:
            results.append(
                BulkActionResultItem(
                    container_id=cid,
                    action=action_clean,
                    success=False,
                    message=str(he.detail),
                )
            )
            total_failed += 1
        except Exception as ex:
            results.append(
                BulkActionResultItem(
                    container_id=cid,
                    action=action_clean,
                    success=False,
                    message=str(ex),
                )
            )
            total_failed += 1

    return BulkActionResponse(
        results=results,
        total_success=total_success,
        total_failed=total_failed,
    )


async def generate_delete_token(
    gateway: DockerGateway,
    container_id: str,
    user_id: uuid.UUID,
) -> DeleteTokenResponse:
    settings = get_settings()
    try:
        await gateway.inspect_container(container_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Container {container_id} not found",
        )

    token, expires_at = create_delete_token(
        user_id=user_id,
        container_id=container_id,
        expire_seconds=settings.delete_token_expire_seconds,
    )

    return DeleteTokenResponse(
        token=token,
        container_id=container_id,
        expires_at=expires_at.isoformat(),
    )


async def delete_container(
    gateway: DockerGateway,
    container_id: str,
    token: str,
    user_id: uuid.UUID,
    username: str,
    ip: Optional[str],
    db: AsyncSession,
) -> bool:
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired delete confirmation token",
        )

    if (
        payload.get("type") != "delete_container"
        or payload.get("container_id") != container_id
        or payload.get("sub") != str(user_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Delete confirmation token mismatch or expired",
        )

    try:
        container = await gateway.inspect_container(container_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Container {container_id} not found",
        )

    container_name = container.get("name", container_id)

    # Pre-audit log
    audit = AuditLog(
        user_id=user_id,
        username=username,
        action="container.delete",
        target_type="container",
        target_id=container_id,
        result=AuditResult.SUCCESS,
        payload={"container_name": container_name, "status": "pending"},
        ip_address=ip,
    )
    db.add(audit)
    await db.commit()

    try:
        removed = await gateway.remove_container(container_id, force=True)
        if not removed:
            raise RuntimeError("remove_container returned failure")
        audit.payload = {"container_name": container_name, "status": "completed"}
        audit.result = AuditResult.SUCCESS
        await db.commit()
        return True
    except Exception as e:
        audit.result = AuditResult.FAILURE
        audit.error_message = str(e)
        audit.payload = {"container_name": container_name, "status": "failed"}
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove container {container_id}: {e}",
        )


async def stream_container_metrics(
    gateway: DockerGateway,
    interval_seconds: int = 3,
    once: bool = False,
) -> AsyncGenerator[str, None]:
    while True:
        try:
            containers = await gateway.list_containers(all=True)
            metrics_list: List[Dict[str, Any]] = []

            for c in containers:
                cid = c.get("id", "")
                cname = c.get("name", "")
                state = c.get("state", "unknown")
                health = c.get("health", "none")

                cpu_pct = 0.0
                mem_bytes = 0
                mem_limit = 0
                mem_pct = 0.0

                if state == "running":
                    try:
                        stats = await gateway.get_container_stats(cid)
                        cpu_pct = float(stats.get("cpu_percent", 0.0))
                        mem_bytes = int(stats.get("memory_bytes", 0))
                        mem_limit = int(stats.get("memory_limit", 0))
                        mem_pct = float(stats.get("memory_percent", 0.0))
                    except Exception:
                        pass

                metrics_list.append({
                    "container_id": cid,
                    "name": cname,
                    "cpu_percent": cpu_pct,
                    "memory_bytes": mem_bytes,
                    "memory_limit": mem_limit,
                    "memory_percent": mem_pct,
                    "state": state,
                    "health": health,
                })

            data_str = json.dumps(metrics_list)
            yield f"data: {data_str}\n\n"
        except Exception as e:
            error_data = json.dumps({"error": str(e)})
            yield f"event: error\ndata: {error_data}\n\n"

        if once:
            break
        await asyncio.sleep(interval_seconds)
