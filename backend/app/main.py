from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select

from app.api.deps import get_docker_gateway
from app.api.v1 import health
from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.constants import AuditResult, Role
from app.core.database import async_session
from app.core.security import hash_password
from app.models.audit import AuditLog
from app.models.user import User
from app.services.overview_service import OverviewCollectorService
from app.services.event_listener_service import EventListenerService


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
    try:
        yield
    finally:
        await event_listener.stop()
        await collector.stop()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        docs_url="/docs" if settings.environment == "development" else None,
        redoc_url=None,
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health.router)
    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_app()
