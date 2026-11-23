from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select

from app.api.deps import get_docker_gateway
from app.api.v1 import health
from app.api.v1.metrics import router as metrics_router
from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.constants import AuditResult, Role
from app.core.database import async_session
from app.core.logging_config import setup_logging
from app.core.metrics import MetricsMiddleware
from app.core.security import hash_password
from app.core.security_headers import RequestSizeLimitMiddleware, SecurityHeadersMiddleware
from app.models.audit import AuditLog
from app.models.user import User
from app.services.overview_service import OverviewCollectorService
from app.services.event_listener_service import EventListenerService
from app.services.alert_evaluator_service import AlertEvaluatorService
from app.services.alert_service import seed_alert_rules


async def bootstrap_default_admin() -> None:
    settings = get_settings()
    try:
        async with async_session() as session:
            result = await session.execute(select(func.count(User.id)))
            count = result.scalar() or 0
            if count == 0:
                admin_user = User(
                    username=settings.default_admin_user,
                    hashed_password=hash_password(settings.default_admin_password),
                    role=Role.ADMIN,
                    is_active=True,
                )
                session.add(admin_user)
                await session.flush()
                audit = AuditLog(
                    user_id=admin_user.id,
                    username="system",
                    action="user.create",
                    target_type="user",
                    target_id=str(admin_user.id),
                    result=AuditResult.SUCCESS,
                    payload={"bootstrap": True},
                )
                session.add(audit)
                await session.commit()
    except Exception:
        pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    await bootstrap_default_admin()
    try:
        async with async_session() as session:
            await seed_alert_rules(session)
    except Exception:
        pass

    gw_override = app.dependency_overrides.get(get_docker_gateway)
    if gw_override:
        docker_gw = gw_override()
    else:
        try:
            docker_gw = get_docker_gateway()
        except Exception:
            docker_gw = None
    collector = OverviewCollectorService(docker_gateway=docker_gw)
    app.state.overview_collector = collector
    await collector.start()

    event_listener = EventListenerService(docker_gateway=docker_gw)
    app.state.event_listener = event_listener
    await event_listener.start()

    alert_evaluator = AlertEvaluatorService(docker_gateway=docker_gw)
    app.state.alert_evaluator = alert_evaluator
    await alert_evaluator.start()
    try:
        yield
    finally:
        await alert_evaluator.stop()
        await event_listener.stop()
        await collector.stop()


def create_app() -> FastAPI:
    settings = get_settings()
    setup_logging(settings.environment)
    app = FastAPI(
        title=settings.app_name,
        docs_url="/docs" if settings.environment == "development" else None,
        redoc_url=None,
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=r"^https?://.*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestSizeLimitMiddleware, max_bytes=10 * 1024 * 1024)
    app.add_middleware(MetricsMiddleware)

    app.include_router(health.router)
    app.include_router(metrics_router)
    app.include_router(api_router, prefix="/api/v1")
    # Support both /api/v1/containers/{id}/exec and /containers/{id}/exec
    from app.api.v1.terminal import router as terminal_router
    app.include_router(terminal_router, prefix="/containers", include_in_schema=False)
    # Support both /api/v1/audit and /audit
    from app.api.v1.audit import router as audit_router
    app.include_router(audit_router, prefix="/audit", include_in_schema=False)
    # Support both /api/v1/settings and /settings
    from app.api.v1.settings import router as settings_router
    app.include_router(settings_router, include_in_schema=False)
    return app


app = create_app()
