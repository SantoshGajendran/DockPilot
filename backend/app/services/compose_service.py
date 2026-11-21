import asyncio
from datetime import datetime, timezone
import logging
import os
from typing import Any, Dict, List, Optional
import uuid

from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.constants import AuditResult
from app.docker.interface import DockerGateway
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.compose import (
    ComposeActionResponse,
    ComposeAuditSummary,
    ComposeProjectResponse,
    ComposeProjectsListResponse,
    ComposeServiceItem,
)
from app.services.job_service import JobManager, get_job_manager

logger = logging.getLogger(__name__)

ALLOWED_COMPOSE_ACTIONS = {"up", "down", "restart", "pull", "stop", "start"}


def is_path_allowed(path_to_check: str, allowed_paths: List[str]) -> bool:
    """Validate that path_to_check resides inside one of allowed_paths."""
    try:
        norm_check = os.path.realpath(os.path.abspath(path_to_check)).lower()
        for allowed in allowed_paths:
            norm_allowed = os.path.realpath(os.path.abspath(allowed)).lower()
            if norm_check == norm_allowed or norm_check.startswith(norm_allowed + os.sep):
                return True
        return False
    except Exception:
        return False


class ComposeService:
    def __init__(
        self,
        docker_gateway: Optional[DockerGateway] = None,
        job_manager: Optional[JobManager] = None,
        settings: Optional[Settings] = None,
    ):
        self.settings: Settings = settings or get_settings()
        self._docker_gateway = docker_gateway
        self.job_manager: JobManager = job_manager or get_job_manager()

    @property
    def docker_gateway(self) -> DockerGateway:
        if self._docker_gateway is None:
            from app.api.deps import get_docker_gateway
            self._docker_gateway = get_docker_gateway()
        return self._docker_gateway

    async def list_projects(self, db: AsyncSession) -> ComposeProjectsListResponse:
        containers = await self.docker_gateway.list_containers(all=True)

        # Group by compose project label
        grouped: Dict[str, List[Dict[str, Any]]] = {}
        for c in containers:
            labels = c.get("labels", {}) or {}
            project = labels.get("com.docker.compose.project")
            if project:
                grouped.setdefault(project, []).append(c)

        project_responses: List[ComposeProjectResponse] = []

        for pname, c_list in grouped.items():
            running_cnt = 0
            unhealthy_cnt = 0
            services: List[ComposeServiceItem] = []
            config_files: List[str] = []
            working_dir: Optional[str] = None

            for c in c_list:
                labels = c.get("labels", {}) or {}
                state = c.get("state", "").lower()
                health = c.get("health", "none").lower()

                if state == "running":
                    running_cnt += 1
                if health == "unhealthy":
                    unhealthy_cnt += 1

                svc_name = labels.get("com.docker.compose.service") or c.get("name", "")
                if svc_name.startswith("/"):
                    svc_name = svc_name[1:]

                cfg = labels.get("com.docker.compose.project.config_files")
                if cfg and cfg not in config_files:
                    config_files.append(cfg)

                if not working_dir:
                    working_dir = labels.get("com.docker.compose.project.working_dir")

                services.append(
                    ComposeServiceItem(
                        service_name=svc_name,
                        container_id=c.get("id", ""),
                        container_name=c.get("name", ""),
                        state=c.get("state", "unknown"),
                        status=c.get("status", ""),
                        health=c.get("health", "none"),
                        image=c.get("image", ""),
                    )
                )

            total_cnt = len(c_list)
            if total_cnt == 0:
                aggregate_status = "empty"
            elif unhealthy_cnt > 0:
                aggregate_status = "unhealthy"
            elif running_cnt == total_cnt:
                aggregate_status = "running"
            elif running_cnt == 0:
                aggregate_status = "stopped"
            else:
                aggregate_status = "partially_running"

            # Fallback path lookup from config
            if not working_dir and pname in self.settings.compose_project_paths:
                working_dir = self.settings.compose_project_paths[pname]

            # Fetch last action from audit log
            last_audit_stmt = (
                select(AuditLog)
                .where(
                    AuditLog.target_type == "compose_project",
                    AuditLog.target_id == pname,
                )
                .order_by(desc(AuditLog.timestamp))
                .limit(1)
            )
            audit_res = await db.execute(last_audit_stmt)
            audit_record = audit_res.scalar_one_or_none()

            last_action_summary: Optional[ComposeAuditSummary] = None
            if audit_record:
                last_action_summary = ComposeAuditSummary(
                    action=audit_record.action,
                    status=audit_record.result.value if hasattr(audit_record.result, "value") else str(audit_record.result),
                    timestamp=audit_record.timestamp.isoformat(),
                    username=audit_record.username,
                )

            project_responses.append(
                ComposeProjectResponse(
                    name=pname,
                    status=aggregate_status,
                    containers_count=total_cnt,
                    running_count=running_cnt,
                    config_files=config_files,
                    working_dir=working_dir,
                    services=services,
                    last_action=last_action_summary,
                )
            )

        project_responses.sort(key=lambda p: p.name.lower())
        return ComposeProjectsListResponse(
            projects=project_responses,
            total=len(project_responses),
        )

    async def execute_project_action(
        self,
        project_name: str,
        action: str,
        current_user: User,
        ip: Optional[str],
        db: AsyncSession,
    ) -> ComposeActionResponse:
        action_clean = action.lower()
        if action_clean not in ALLOWED_COMPOSE_ACTIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported compose action '{action}'. Allowed: {sorted(list(ALLOWED_COMPOSE_ACTIONS))}",
            )

        # 1. Resolve project directory & compose config files
        containers = await self.docker_gateway.list_containers(all=True)
        working_dir: Optional[str] = None
        config_files: List[str] = []

        for c in containers:
            labels = c.get("labels", {}) or {}
            if labels.get("com.docker.compose.project") == project_name:
                if not working_dir:
                    working_dir = labels.get("com.docker.compose.project.working_dir")
                cfg = labels.get("com.docker.compose.project.config_files")
                if cfg and cfg not in config_files:
                    config_files.append(cfg)

        if not working_dir and project_name in self.settings.compose_project_paths:
            working_dir = self.settings.compose_project_paths[project_name]

        if not working_dir:
            working_dir = "."

        # 2. Strict directory allow-list validation
        allowed_paths = self.settings.compose_project_allow_paths
        if not is_path_allowed(working_dir, allowed_paths):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Project working directory '{working_dir}' is not within allowed paths.",
            )

        # 3. Create pre-action audit record
        audit = AuditLog(
            user_id=current_user.id,
            username=current_user.username,
            action=f"compose.{action_clean}",
            target_type="compose_project",
            target_id=project_name,
            result=AuditResult.SUCCESS,
            payload={"project_name": project_name, "working_dir": working_dir, "status": "pending"},
            ip_address=ip,
        )
        db.add(audit)
        await db.commit()
        await db.refresh(audit)

        # 4. Create Job Record
        job = self.job_manager.create_job(project_name=project_name, action=action_clean)

        # 5. Launch asynchronous background runner
        asyncio.create_task(
            self._run_compose_subprocess(
                job_id=job.id,
                audit_id=audit.id,
                project_name=project_name,
                action=action_clean,
                working_dir=working_dir,
                config_files=config_files if config_files else None,
            )
        )

        return ComposeActionResponse(
            job_id=job.id,
            project_name=project_name,
            action=action_clean,
            status="running",
        )

    async def _run_compose_subprocess(
        self,
        job_id: str,
        audit_id: uuid.UUID,
        project_name: str,
        action: str,
        working_dir: str,
        config_files: Optional[List[str]],
    ) -> None:
        self.job_manager.set_running(job_id)
        failed = False
        error_msg: Optional[str] = None

        try:
            generator = self.docker_gateway.execute_compose_action(
                project_name=project_name,
                action=action,
                working_dir=working_dir,
                config_files=config_files,
            )
            async for line in generator:
                self.job_manager.append_log(job_id, line)
            self.job_manager.complete_job(job_id, exit_code=0)
        except Exception as e:
            failed = True
            error_msg = str(e)
            self.job_manager.complete_job(job_id, exit_code=1, error=error_msg)

        # Update audit record
        try:
            from app.core.database import async_session
            async with async_session() as session:
                audit = await session.get(AuditLog, audit_id)
                if audit:
                    audit.result = AuditResult.FAILURE if failed else AuditResult.SUCCESS
                    audit.payload = {
                        "project_name": project_name,
                        "working_dir": working_dir,
                        "status": "failed" if failed else "completed",
                    }
                    if failed and error_msg:
                        audit.error_message = error_msg
                    await session.commit()
        except Exception as ex:
            logger.warning("Failed to update post-execution audit log: %s", ex)
