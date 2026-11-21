from fastapi import APIRouter
from app.api.v1 import health, auth, overview, containers, logs, host, compose, jobs

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(overview.router, prefix="/overview", tags=["Overview"])
api_router.include_router(containers.router, prefix="/containers", tags=["Containers"])
api_router.include_router(logs.router, prefix="/logs", tags=["Logs"])
api_router.include_router(host.router, prefix="/host", tags=["Host"])
api_router.include_router(compose.router, prefix="/compose", tags=["Compose"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])

