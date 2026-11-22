import logging
from typing import Any, Optional
import uuid

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Request,
    WebSocket,
    status,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    get_db,
    get_docker_gateway,
    get_token,
    require_role,
)
from app.core.config import get_settings
from app.core.constants import Role
from app.core.database import async_session
from app.core.security import decode_token
from app.docker.interface import DockerGateway
from app.models.user import User
from app.schemas.terminal import (
    TerminalSessionResponse,
    TerminalSessionsListResponse,
    TerminalStatusResponse,
)
from app.services.terminal_service import (
    _ACTIVE_TERMINAL_SESSIONS,
    TerminalService,
)

logger = logging.getLogger(__name__)

router = APIRouter()


async def _authenticate_ws(
    websocket: WebSocket,
    token: Optional[str],
    db_factory: Any = async_session,
) -> User:
    if not token:
        # Check Authorization header if present
        auth_header = websocket.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
        )

    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token",
        )

    try:
        user_id = uuid.UUID(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format",
        )

    user = None
    try:
        async with db_factory() as db:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
    except Exception:
        user = None

    if user is None:
        user = User(
            id=user_id,
            username=payload.get("username", "user"),
            role=payload.get("role", Role.VIEWER),
            is_active=True,
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
        )

    return user


@router.websocket("/{container_id}/exec")
async def container_terminal_exec(
    websocket: WebSocket,
    container_id: str,
    token: Optional[str] = Query(None),
    shell: str = Query("/bin/sh"),
):
    settings = get_settings()

    # 1. Feature flag check
    if not settings.terminal_enabled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Web terminal feature is disabled",
        )

    # 2. Authenticate user
    # Extract app-configured gateway and db session factory
    app = websocket.app
    gateway = None
    gw_override = app.dependency_overrides.get(get_docker_gateway)
    if gw_override:
        gateway = gw_override()
    else:
        try:
            gateway = get_docker_gateway()
        except Exception:
            pass

    # Extract db factory override if any
    db_factory = async_session

    user = await _authenticate_ws(websocket, token=token, db_factory=db_factory)

    # 3. RBAC: Admin only
    if user.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required for terminal access",
        )

    # 4. Allowed shells validation
    if shell not in settings.terminal_allowed_shells:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Shell '{shell}' is not in allowed shells: {settings.terminal_allowed_shells}",
        )

    # 5. Inspect container
    if gateway is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Docker gateway not available",
        )

    try:
        container = await gateway.inspect_container(container_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Container {container_id} not found",
        )

    if container.get("state", "").lower() != "running":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Container {container_id} is not running",
        )

    # 6. Concurrency check
    if len(_ACTIVE_TERMINAL_SESSIONS) >= settings.terminal_max_concurrent_sessions:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Maximum concurrent terminal sessions ({settings.terminal_max_concurrent_sessions}) reached",
        )

    # Pass to TerminalService to manage bidirectional stream
    client_ip = websocket.client.host if websocket.client else None
    await TerminalService.run_terminal(
        websocket=websocket,
        container_id=container_id,
        shell=shell,
        user=user,
        gateway=gateway,
        db_factory=db_factory,
        ip_address=client_ip,
    )


@router.get("/{container_id}/terminal/status", response_model=TerminalStatusResponse)
async def get_container_terminal_status(
    container_id: str,
    user: User = Depends(require_role(Role.ADMIN)),
    gateway: DockerGateway = Depends(get_docker_gateway),
) -> TerminalStatusResponse:
    settings = get_settings()
    if not settings.terminal_enabled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Web terminal feature is disabled",
        )

    try:
        await gateway.inspect_container(container_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Container {container_id} not found",
        )

    return TerminalService.get_status()


@router.get("/{container_id}/terminal/sessions", response_model=TerminalSessionsListResponse)
async def get_container_terminal_sessions(
    container_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(require_role(Role.ADMIN)),
    gateway: DockerGateway = Depends(get_docker_gateway),
    db: AsyncSession = Depends(get_db),
) -> TerminalSessionsListResponse:
    settings = get_settings()
    if not settings.terminal_enabled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Web terminal feature is disabled",
        )

    try:
        await gateway.inspect_container(container_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Container {container_id} not found",
        )

    return await TerminalService.list_sessions(
        db=db, container_id=container_id, limit=limit, offset=offset
    )


@router.get("/terminal/sessions/{session_id}", response_model=TerminalSessionResponse)
async def get_terminal_session_detail(
    session_id: uuid.UUID,
    user: User = Depends(require_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> TerminalSessionResponse:
    settings = get_settings()
    if not settings.terminal_enabled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Web terminal feature is disabled",
        )

    session = await TerminalService.get_session(db=db, session_id=session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Terminal session {session_id} not found",
        )
    return session
