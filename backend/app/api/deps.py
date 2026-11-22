from functools import lru_cache
from typing import AsyncGenerator, Callable, Optional
import uuid

from fastapi import Depends, HTTPException, Query, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import Role
from app.core.database import get_db_session
from app.core.security import decode_token
from app.docker.interface import DockerGateway
from app.docker.engine import EngineGateway
from app.docker.fake import FakeGateway
from app.models.user import User
from app.services.overview_service import OverviewCollectorService
from app.services.host_service import HostService
from app.services.compose_service import ComposeService
from app.services.event_listener_service import EventListenerService
from app.services.events_service import EventsService
from app.services.alert_evaluator_service import AlertEvaluatorService
from app.services.alert_service import AlertService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

ROLE_HIERARCHY: dict[Role | str, int] = {
    Role.VIEWER: 1,
    "viewer": 1,
    Role.OPERATOR: 2,
    "operator": 2,
    Role.ADMIN: 3,
    "admin": 3,
}


@lru_cache
def get_docker_gateway() -> DockerGateway:
    return EngineGateway()


def get_host_service(
    docker_gateway: DockerGateway = Depends(get_docker_gateway),
) -> HostService:
    return HostService(docker_gateway=docker_gateway)


def get_compose_service(
    docker_gateway: DockerGateway = Depends(get_docker_gateway),
) -> ComposeService:
    return ComposeService(docker_gateway=docker_gateway)


def get_overview_collector(
    request: Request,
    docker_gateway: DockerGateway = Depends(get_docker_gateway),
) -> OverviewCollectorService:
    collector = getattr(request.app.state, "overview_collector", None)
    if collector is None:
        collector = OverviewCollectorService(docker_gateway=docker_gateway)
        request.app.state.overview_collector = collector
    elif collector.docker_gateway is None and docker_gateway is not None:
        collector._docker_gateway = docker_gateway
    return collector


def get_event_listener(
    request: Request,
    docker_gateway: DockerGateway = Depends(get_docker_gateway),
) -> EventListenerService:
    listener = getattr(request.app.state, "event_listener", None)
    if listener is None:
        listener = EventListenerService(docker_gateway=docker_gateway)
        request.app.state.event_listener = listener
    elif listener._docker_gateway is None and docker_gateway is not None:
        listener._docker_gateway = docker_gateway
    return listener


def get_events_service(
    request: Request,
    db: AsyncSession = Depends(get_db_session),
    event_listener: EventListenerService = Depends(get_event_listener),
) -> EventsService:
    return EventsService(db=db, event_listener=event_listener)


def get_alert_evaluator(
    request: Request,
    docker_gateway: DockerGateway = Depends(get_docker_gateway),
) -> AlertEvaluatorService:
    evaluator = getattr(request.app.state, "alert_evaluator", None)
    if evaluator is None:
        evaluator = AlertEvaluatorService(docker_gateway=docker_gateway)
        request.app.state.alert_evaluator = evaluator
    elif evaluator._docker_gateway is None and docker_gateway is not None:
        evaluator._docker_gateway = docker_gateway
    return evaluator


def get_alert_service(
    db: AsyncSession = Depends(get_db_session),
    docker_gateway: DockerGateway = Depends(get_docker_gateway),
) -> AlertService:
    return AlertService(db=db, docker_gateway=docker_gateway)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_db_session():
        yield session


async def get_token(
    header_token: Optional[str] = Depends(oauth2_scheme),
    query_token: Optional[str] = Query(None, alias="token"),
) -> str:
    token = header_token or query_token
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token


async def get_current_user(
    token: str = Depends(get_token),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
    except Exception:
        raise credentials_exception

    if payload.get("type") != "access":
        raise credentials_exception

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise credentials_exception

    try:
        user_id = uuid.UUID(user_id_str)
    except (ValueError, TypeError):
        raise credentials_exception

    try:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
    except Exception:
        user = None

    if user is not None:
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Inactive user",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user

    return User(
        id=user_id,
        username=payload.get("username", "user"),
        role=payload.get("role", Role.VIEWER),
        is_active=True,
    )


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user


def require_role(min_role: Role) -> Callable:
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_level = ROLE_HIERARCHY.get(current_user.role, 0)
        required_level = ROLE_HIERARCHY.get(min_role, 0)
        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return role_checker
