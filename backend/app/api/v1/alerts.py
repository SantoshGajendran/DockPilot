import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.api.deps import get_alert_service, get_notification_service, require_role
from app.core.constants import Role
from app.models.user import User
from app.schemas.alert import (
    ActiveAlertsCountResponse,
    AlertDryRunRequest,
    AlertDryRunResponse,
    AlertEventAckRequest,
    AlertEventResponse,
    AlertEventsListResponse,
    AlertRuleCreate,
    AlertRuleResponse,
    AlertRulesListResponse,
    AlertRuleUpdate,
    AlertSilenceCreate,
    AlertSilenceResponse,
)
from app.schemas.notification import (
    DeliveryLogListResponse,
    NotificationChannelCreate,
    NotificationChannelResponse,
    NotificationChannelsListResponse,
    NotificationChannelUpdate,
    NotificationDeliveryLogResponse,
    NotificationRouteCreate,
    NotificationRouteResponse,
    NotificationRoutesListResponse,
    NotificationRouteUpdate,
    NotificationTestResult,
)
from app.services.alert_service import AlertService
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/rules", response_model=AlertRulesListResponse)
async def list_rules(
    enabled_only: bool = Query(False, description="Filter only enabled rules"),
    user: User = Depends(require_role(Role.VIEWER)),
    service: AlertService = Depends(get_alert_service),
) -> AlertRulesListResponse:
    rules, total = await service.list_rules(enabled_only=enabled_only)
    return AlertRulesListResponse(rules=rules, total=total)


@router.post("/rules", response_model=AlertRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_rule(
    rule_in: AlertRuleCreate,
    request: Request,
    user: User = Depends(require_role(Role.ADMIN)),
    service: AlertService = Depends(get_alert_service),
) -> AlertRuleResponse:
    ip = request.client.host if request.client else None
    return await service.create_rule(
        rule_in=rule_in,
        user_id=user.id,
        username=user.username,
        ip_address=ip,
    )


@router.get("/rules/{rule_id}", response_model=AlertRuleResponse)
async def get_rule(
    rule_id: int,
    user: User = Depends(require_role(Role.VIEWER)),
    service: AlertService = Depends(get_alert_service),
) -> AlertRuleResponse:
    rule = await service.get_rule(rule_id)
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    return rule


@router.put("/rules/{rule_id}", response_model=AlertRuleResponse)
async def update_rule(
    rule_id: int,
    rule_in: AlertRuleUpdate,
    request: Request,
    user: User = Depends(require_role(Role.ADMIN)),
    service: AlertService = Depends(get_alert_service),
) -> AlertRuleResponse:
    ip = request.client.host if request.client else None
    rule = await service.update_rule(
        rule_id=rule_id,
        rule_in=rule_in,
        user_id=user.id,
        username=user.username,
        ip_address=ip,
    )
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    return rule


@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(
    rule_id: int,
    request: Request,
    user: User = Depends(require_role(Role.ADMIN)),
    service: AlertService = Depends(get_alert_service),
) -> None:
    ip = request.client.host if request.client else None
    deleted = await service.delete_rule(
        rule_id=rule_id,
        user_id=user.id,
        username=user.username,
        ip_address=ip,
    )
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")


@router.post("/rules/test", response_model=AlertDryRunResponse)
async def dry_run_adhoc_rule(
    req: AlertDryRunRequest,
    user: User = Depends(require_role(Role.OPERATOR)),
    service: AlertService = Depends(get_alert_service),
) -> AlertDryRunResponse:
    return await service.dry_run_rule(req)


@router.post("/rules/{rule_id}/test", response_model=AlertDryRunResponse)
async def dry_run_rule_by_id(
    rule_id: int,
    user: User = Depends(require_role(Role.OPERATOR)),
    service: AlertService = Depends(get_alert_service),
) -> AlertDryRunResponse:
    res = await service.dry_run_rule_by_id(rule_id)
    if not res:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    return res


@router.get("/events", response_model=AlertEventsListResponse)
async def list_events(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (firing, resolved)"),
    severity: Optional[str] = Query(None, description="Filter by severity (critical, warning, info)"),
    rule_id: Optional[int] = Query(None, description="Filter by rule ID"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: User = Depends(require_role(Role.VIEWER)),
    service: AlertService = Depends(get_alert_service),
) -> AlertEventsListResponse:
    events, total = await service.list_events(
        status=status_filter,
        severity=severity,
        rule_id=rule_id,
        limit=limit,
        offset=offset,
    )
    return AlertEventsListResponse(events=events, total=total)


@router.post("/events/{event_id}/ack", response_model=AlertEventResponse)
async def acknowledge_event(
    event_id: int,
    request: Request,
    body: Optional[AlertEventAckRequest] = None,
    user: User = Depends(require_role(Role.OPERATOR)),
    service: AlertService = Depends(get_alert_service),
) -> AlertEventResponse:
    ip = request.client.host if request.client else None
    event = await service.acknowledge_event(
        event_id=event_id,
        user_id=user.id,
        username=user.username,
        ip_address=ip,
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert event not found")
    return event


@router.post("/silence", response_model=AlertSilenceResponse, status_code=status.HTTP_201_CREATED)
async def create_silence(
    silence_in: AlertSilenceCreate,
    request: Request,
    user: User = Depends(require_role(Role.OPERATOR)),
    service: AlertService = Depends(get_alert_service),
) -> AlertSilenceResponse:
    ip = request.client.host if request.client else None
    return await service.create_silence(
        silence_in=silence_in,
        user_id=user.id,
        username=user.username,
        ip_address=ip,
    )


@router.get("/active-count", response_model=ActiveAlertsCountResponse)
async def get_active_count(
    user: User = Depends(require_role(Role.VIEWER)),
    service: AlertService = Depends(get_alert_service),
) -> ActiveAlertsCountResponse:
    count = await service.get_active_alerts_count()
    return ActiveAlertsCountResponse(active_count=count)


# =========================================================================
# Notification Channels
# =========================================================================


@router.get("/channels", response_model=NotificationChannelsListResponse)
async def list_notification_channels(
    user: User = Depends(require_role(Role.VIEWER)),
    service: NotificationService = Depends(get_notification_service),
) -> NotificationChannelsListResponse:
    channels, total = await service.list_channels()
    return NotificationChannelsListResponse(channels=channels, total=total)


@router.post(
    "/channels",
    response_model=NotificationChannelResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_notification_channel(
    channel_in: NotificationChannelCreate,
    request: Request,
    user: User = Depends(require_role(Role.ADMIN)),
    service: NotificationService = Depends(get_notification_service),
) -> NotificationChannelResponse:
    ip = request.client.host if request.client else None
    return await service.create_channel(
        channel_in=channel_in,
        user_id=user.id,
        username=user.username,
        ip_address=ip,
    )


@router.get("/channels/{channel_id}", response_model=NotificationChannelResponse)
async def get_notification_channel(
    channel_id: int,
    user: User = Depends(require_role(Role.VIEWER)),
    service: NotificationService = Depends(get_notification_service),
) -> NotificationChannelResponse:
    c = await service.get_channel(channel_id)
    if not c:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Channel not found"
        )
    return c


@router.put("/channels/{channel_id}", response_model=NotificationChannelResponse)
async def update_notification_channel(
    channel_id: int,
    channel_in: NotificationChannelUpdate,
    request: Request,
    user: User = Depends(require_role(Role.ADMIN)),
    service: NotificationService = Depends(get_notification_service),
) -> NotificationChannelResponse:
    ip = request.client.host if request.client else None
    c = await service.update_channel(
        channel_id=channel_id,
        channel_in=channel_in,
        user_id=user.id,
        username=user.username,
        ip_address=ip,
    )
    if not c:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Channel not found"
        )
    return c


@router.delete("/channels/{channel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification_channel(
    channel_id: int,
    request: Request,
    user: User = Depends(require_role(Role.ADMIN)),
    service: NotificationService = Depends(get_notification_service),
) -> None:
    ip = request.client.host if request.client else None
    deleted = await service.delete_channel(
        channel_id=channel_id,
        user_id=user.id,
        username=user.username,
        ip_address=ip,
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Channel not found"
        )


@router.post("/channels/{channel_id}/test", response_model=NotificationTestResult)
async def test_notification_channel(
    channel_id: int,
    user: User = Depends(require_role(Role.OPERATOR)),
    service: NotificationService = Depends(get_notification_service),
) -> NotificationTestResult:
    return await service.test_channel(channel_id)


# =========================================================================
# Notification Routes (Routing Matrix)
# =========================================================================


@router.get("/routes", response_model=NotificationRoutesListResponse)
async def list_notification_routes(
    user: User = Depends(require_role(Role.VIEWER)),
    service: NotificationService = Depends(get_notification_service),
) -> NotificationRoutesListResponse:
    routes, total = await service.list_routes()
    return NotificationRoutesListResponse(routes=routes, total=total)


@router.post(
    "/routes",
    response_model=NotificationRouteResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_notification_route(
    route_in: NotificationRouteCreate,
    request: Request,
    user: User = Depends(require_role(Role.ADMIN)),
    service: NotificationService = Depends(get_notification_service),
) -> NotificationRouteResponse:
    ip = request.client.host if request.client else None
    try:
        return await service.create_route(
            route_in=route_in,
            user_id=user.id,
            username=user.username,
            ip_address=ip,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/routes/{route_id}", response_model=NotificationRouteResponse)
async def update_notification_route(
    route_id: int,
    route_in: NotificationRouteUpdate,
    request: Request,
    user: User = Depends(require_role(Role.ADMIN)),
    service: NotificationService = Depends(get_notification_service),
) -> NotificationRouteResponse:
    ip = request.client.host if request.client else None
    r = await service.update_route(
        route_id=route_id,
        route_in=route_in,
        user_id=user.id,
        username=user.username,
        ip_address=ip,
    )
    if not r:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Route not found"
        )
    return r


@router.delete("/routes/{route_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification_route(
    route_id: int,
    request: Request,
    user: User = Depends(require_role(Role.ADMIN)),
    service: NotificationService = Depends(get_notification_service),
) -> None:
    ip = request.client.host if request.client else None
    deleted = await service.delete_route(
        route_id=route_id,
        user_id=user.id,
        username=user.username,
        ip_address=ip,
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Route not found"
        )


# =========================================================================
# Delivery Logs
# =========================================================================


@router.get("/delivery-log", response_model=DeliveryLogListResponse)
async def list_delivery_logs(
    channel_id: Optional[int] = Query(None, description="Filter by channel ID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by delivery status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: User = Depends(require_role(Role.VIEWER)),
    service: NotificationService = Depends(get_notification_service),
) -> DeliveryLogListResponse:
    logs, total = await service.list_delivery_logs(
        channel_id=channel_id,
        status=status_filter,
        limit=limit,
        offset=offset,
    )
    return DeliveryLogListResponse(
        logs=[NotificationDeliveryLogResponse.model_validate(log) for log in logs],
        total=total,
    )
