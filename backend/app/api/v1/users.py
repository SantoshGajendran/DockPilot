from typing import Optional
from fastapi import APIRouter, Depends, Query, Request, status

from app.api.deps import get_users_service, require_role
from app.core.constants import Role
from app.models.user import User
from app.schemas.users import (
    AdminPasswordResetRequest,
    UserCreate,
    UserResponse,
    UsersListResponse,
    UserUpdate,
)
from app.services.users_service import UsersService

router = APIRouter()


@router.get("", response_model=UsersListResponse)
@router.get("/", response_model=UsersListResponse, include_in_schema=False)
async def list_users(
    user: User = Depends(require_role(Role.ADMIN)),
    service: UsersService = Depends(get_users_service),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size"),
    q: Optional[str] = Query(None, description="Search by username or email"),
) -> UsersListResponse:
    return await service.list_users(page=page, page_size=page_size, q=q)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_user(
    body: UserCreate,
    request: Request,
    user: User = Depends(require_role(Role.ADMIN)),
    service: UsersService = Depends(get_users_service),
) -> UserResponse:
    client_ip = request.client.host if request.client else None
    return await service.create_user(
        data=body,
        actor_id=user.id,
        actor_name=user.username,
        ip=client_ip,
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    user: User = Depends(require_role(Role.ADMIN)),
    service: UsersService = Depends(get_users_service),
) -> UserResponse:
    return await service.get_user(user_id)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    body: UserUpdate,
    request: Request,
    user: User = Depends(require_role(Role.ADMIN)),
    service: UsersService = Depends(get_users_service),
) -> UserResponse:
    client_ip = request.client.host if request.client else None
    return await service.update_user(
        user_id=user_id,
        data=body,
        actor_id=user.id,
        actor_name=user.username,
        ip=client_ip,
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    request: Request,
    user: User = Depends(require_role(Role.ADMIN)),
    service: UsersService = Depends(get_users_service),
):
    client_ip = request.client.host if request.client else None
    await service.delete_user(
        user_id=user_id,
        actor_id=user.id,
        actor_name=user.username,
        ip=client_ip,
    )


@router.post("/{user_id}/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    user_id: str,
    body: AdminPasswordResetRequest,
    request: Request,
    user: User = Depends(require_role(Role.ADMIN)),
    service: UsersService = Depends(get_users_service),
):
    client_ip = request.client.host if request.client else None
    await service.admin_reset_password(
        user_id=user_id,
        data=body,
        actor_id=user.id,
        actor_name=user.username,
        ip=client_ip,
    )
    return {"message": "Password reset successfully"}
