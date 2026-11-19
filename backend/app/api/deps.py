from functools import lru_cache
from typing import AsyncGenerator, Callable
import uuid

from fastapi import Depends, HTTPException, status
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

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

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


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_db_session():
        yield session


async def get_current_user(
    token: str = Depends(oauth2_scheme),
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

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


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
