from fastapi import APIRouter
from app.api.v1 import health, auth, overview, containers, logs, host, compose, jobs, events, alerts, resources, terminal, audit, users, settings

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(overview.router, prefix="/overview", tags=["Overview"])
api_router.include_router(containers.router, prefix="/containers", tags=["Containers"])
api_router.include_router(terminal.router, prefix="/containers", tags=["Terminal"])
api_router.include_router(logs.router, prefix="/logs", tags=["Logs"])
api_router.include_router(host.router, prefix="/host", tags=["Host"])
api_router.include_router(compose.router, prefix="/compose", tags=["Compose"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
api_router.include_router(events.router, prefix="/events", tags=["Events"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(resources.router, prefix="/resources", tags=["Resources"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(settings.router, tags=["Settings"])


