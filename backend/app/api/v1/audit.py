from datetime import datetime, timezone
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse

from app.api.deps import get_audit_service, require_role
from app.core.constants import Role
from app.models.user import User
from app.schemas.audit import (
    AuditLogFilterParams,
    AuditLogResponse,
    AuditLogsListResponse,
)
from app.services.audit_service import AuditService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=AuditLogsListResponse)
@router.get("/", response_model=AuditLogsListResponse, include_in_schema=False)
async def list_audit_logs(
    user: User = Depends(require_role(Role.ADMIN)),
    service: AuditService = Depends(get_audit_service),
    user_filter: Optional[str] = Query(None, alias="user", description="Filter by user"),
    action: Optional[str] = Query(None, description="Filter by action"),
    target_type: Optional[str] = Query(None, description="Filter by target type"),
    target_id: Optional[str] = Query(None, description="Filter by target ID"),
    result: Optional[str] = Query(None, description="Filter by result"),
    since: Optional[datetime] = Query(None, description="Filter logs since timestamp"),
    until: Optional[datetime] = Query(None, description="Filter logs until timestamp"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Page size"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
) -> AuditLogsListResponse:
    filters = AuditLogFilterParams(
        user=user_filter,
        action=action,
        target_type=target_type,
        target_id=target_id,
        result=result,
        since=since,
        until=until,
        page=page,
        page_size=page_size,
        sort_order=sort_order,
    )
    return await service.list_audit_logs(filters)


@router.get("/export")
async def export_audit_logs(
    user: User = Depends(require_role(Role.ADMIN)),
    service: AuditService = Depends(get_audit_service),
    user_filter: Optional[str] = Query(None, alias="user", description="Filter by user"),
    action: Optional[str] = Query(None, description="Filter by action"),
    target_type: Optional[str] = Query(None, description="Filter by target type"),
    target_id: Optional[str] = Query(None, description="Filter by target ID"),
    result: Optional[str] = Query(None, description="Filter by result"),
    since: Optional[datetime] = Query(None, description="Filter logs since timestamp"),
    until: Optional[datetime] = Query(None, description="Filter logs until timestamp"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
) -> StreamingResponse:
    filters = AuditLogFilterParams(
        user=user_filter,
        action=action,
        target_type=target_type,
        target_id=target_id,
        result=result,
        since=since,
        until=until,
        sort_order=sort_order,
    )
    generator = service.stream_audit_export_csv(filters)
    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"audit_log_{timestamp_str}.csv"
    return StreamingResponse(
        generator,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache",
        },
    )


@router.get("/{audit_id}", response_model=AuditLogResponse)
async def get_audit_log(
    audit_id: str,
    user: User = Depends(require_role(Role.ADMIN)),
    service: AuditService = Depends(get_audit_service),
) -> AuditLogResponse:
    log = await service.get_audit_log(audit_id)
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit log entry not found",
        )
    return log
