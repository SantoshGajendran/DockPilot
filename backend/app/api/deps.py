from functools import lru_cache
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db_session
from app.docker.interface import DockerGateway
from app.docker.engine import EngineGateway
from app.docker.fake import FakeGateway

@lru_cache
def get_docker_gateway() -> DockerGateway:
    return EngineGateway()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_db_session():
        yield session
