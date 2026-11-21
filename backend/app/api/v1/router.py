from fastapi import APIRouter
from app.api.v1 import health, auth, overview, containers, logs

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(overview.router, prefix="/overview", tags=["Overview"])
api_router.include_router(containers.router, prefix="/containers", tags=["Containers"])
api_router.include_router(logs.router, prefix="/logs", tags=["Logs"])

