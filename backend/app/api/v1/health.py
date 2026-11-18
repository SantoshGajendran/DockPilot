from fastapi import APIRouter, Depends
from app.api.deps import get_docker_gateway
from app.docker.interface import DockerGateway
from app.core.config import get_settings
from app.core.constants import APP_VERSION

router = APIRouter()

@router.get("/health")
async def health_check(docker: DockerGateway = Depends(get_docker_gateway)):
    docker_ok = await docker.ping()
    return {
        "status": "ok",
        "database": "connected",
        "docker": "connected" if docker_ok else "unavailable"
    }

@router.get("/version")
async def version_check():
    settings = get_settings()
    return {
        "version": APP_VERSION,
        "app": settings.app_name
    }
