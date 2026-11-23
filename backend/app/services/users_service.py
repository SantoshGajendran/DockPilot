import math
import uuid
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.constants import AuditResult, Role
from app.core.security import hash_password
from app.models.audit import AuditLog
from app.models.session import UserSession
from app.models.user import User
from app.schemas.users import (
    AdminPasswordResetRequest,
    UserCreate,
    UserResponse,
    UsersListResponse,
    UserUpdate,
)


class UsersService:
    def __init__(self, db: AsyncSession, settings: Optional[Settings] = None):
        self.db = db
        self.settings = settings or get_settings()

    async def list_users(
        self,
        page: int = 1,
        page_size: int = 20,
        q: Optional[str] = None,
    ) -> UsersListResponse:
        conditions = []
        if q:
            term = f"%{q.strip()}%"
            conditions.append(or_(User.username.ilike(term), User.email.ilike(term)))

        count_stmt = select(func.count(User.id))
        if conditions:
            count_stmt = count_stmt.where(*conditions)
        total_res = await self.db.execute(count_stmt)
        total = total_res.scalar() or 0

        page = max(1, page)
        page_size = min(max(1, page_size), self.settings.users_page_size_max)

        query = select(User)
        if conditions:
            query = query.where(*conditions)

        query = query.order_by(User.created_at.asc()).offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        users = result.scalars().all()

        total_pages = math.ceil(total / page_size) if total > 0 else 1
        items = [UserResponse.model_validate(u) for u in users]
        return UsersListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    async def get_user(self, user_id: str | uuid.UUID) -> UserResponse:
        parsed_id = uuid.UUID(str(user_id)) if not isinstance(user_id, uuid.UUID) else user_id
        result = await self.db.execute(select(User).where(User.id == parsed_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return UserResponse.model_validate(user)

    async def create_user(
        self,
        data: UserCreate,
        actor_id: Optional[uuid.UUID] = None,
        actor_name: str = "system",
        ip: Optional[str] = None,
    ) -> UserResponse:
        # Check username uniqueness
        existing = await self.db.execute(select(User).where(User.username == data.username))
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Username '{data.username}' is already taken",
            )

        if data.email:
            existing_email = await self.db.execute(select(User).where(User.email == data.email))
            if existing_email.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Email '{data.email}' is already registered",
                )

        new_user = User(
            username=data.username,
            email=data.email,
            hashed_password=hash_password(data.password),
            role=data.role,
            is_active=data.is_active,
            force_password_change=data.force_password_change,
        )
        self.db.add(new_user)
        await self.db.flush()

        audit = AuditLog(
            user_id=actor_id,
            username=actor_name,
            action="user.create",
            target_type="user",
            target_id=str(new_user.id),
            result=AuditResult.SUCCESS,
            payload={
                "username": new_user.username,
                "role": new_user.role,
                "force_password_change": new_user.force_password_change,
            },
            ip_address=ip,
        )
        self.db.add(audit)
        await self.db.commit()

        return UserResponse.model_validate(new_user)

    async def update_user(
        self,
        user_id: str | uuid.UUID,
        data: UserUpdate,
        actor_id: Optional[uuid.UUID] = None,
        actor_name: str = "system",
        ip: Optional[str] = None,
    ) -> UserResponse:
        parsed_id = uuid.UUID(str(user_id)) if not isinstance(user_id, uuid.UUID) else user_id
        result = await self.db.execute(select(User).where(User.id == parsed_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        # Last-admin protection: cannot demote or deactivate sole remaining active admin
        is_demoting = data.role is not None and data.role != Role.ADMIN and user.role == Role.ADMIN
        is_deactivating = data.is_active is False and user.is_active and user.role == Role.ADMIN

        if is_demoting or is_deactivating:
            admin_count_res = await self.db.execute(
                select(func.count(User.id)).where(
                    User.role == Role.ADMIN,
                    User.is_active.is_(True),
                )
            )
            active_admin_count = admin_count_res.scalar() or 0
            if active_admin_count <= 1:
                action_str = "demote" if is_demoting else "deactivate"
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot {action_str} the last remaining active administrator.",
                )

        if data.email is not None and data.email != user.email:
            existing_email = await self.db.execute(
                select(User).where(User.email == data.email, User.id != user.id)
            )
            if existing_email.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Email '{data.email}' is already registered",
                )
            user.email = data.email

        if data.role is not None:
            user.role = data.role
        if data.is_active is not None:
            user.is_active = data.is_active
        if data.force_password_change is not None:
            user.force_password_change = data.force_password_change

        audit = AuditLog(
            user_id=actor_id,
            username=actor_name,
            action="user.update",
            target_type="user",
            target_id=str(user.id),
            result=AuditResult.SUCCESS,
            payload={
                "role": user.role,
                "is_active": user.is_active,
                "force_password_change": user.force_password_change,
            },
            ip_address=ip,
        )
        self.db.add(audit)
        await self.db.commit()

        return UserResponse.model_validate(user)

    async def delete_user(
        self,
        user_id: str | uuid.UUID,
        actor_id: Optional[uuid.UUID] = None,
        actor_name: str = "system",
        ip: Optional[str] = None,
    ) -> None:
        parsed_id = uuid.UUID(str(user_id)) if not isinstance(user_id, uuid.UUID) else user_id
        result = await self.db.execute(select(User).where(User.id == parsed_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        # Last-admin protection: cannot delete last active admin
        if user.role == Role.ADMIN and user.is_active:
            admin_count_res = await self.db.execute(
                select(func.count(User.id)).where(
                    User.role == Role.ADMIN,
                    User.is_active.is_(True),
                )
            )
            active_admin_count = admin_count_res.scalar() or 0
            if active_admin_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot delete the last remaining active administrator.",
                )

        # Revoke all sessions
        await self.db.execute(
            select(UserSession).where(UserSession.user_id == user.id)
        )
        # Delete user
        await self.db.delete(user)

        audit = AuditLog(
            user_id=actor_id,
            username=actor_name,
            action="user.delete",
            target_type="user",
            target_id=str(parsed_id),
            result=AuditResult.SUCCESS,
            payload={"deleted_username": user.username},
            ip_address=ip,
        )
        self.db.add(audit)
        await self.db.commit()

    async def admin_reset_password(
        self,
        user_id: str | uuid.UUID,
        data: AdminPasswordResetRequest,
        actor_id: Optional[uuid.UUID] = None,
        actor_name: str = "system",
        ip: Optional[str] = None,
    ) -> None:
        parsed_id = uuid.UUID(str(user_id)) if not isinstance(user_id, uuid.UUID) else user_id
        result = await self.db.execute(select(User).where(User.id == parsed_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        user.hashed_password = hash_password(data.new_password)
        user.force_password_change = data.force_password_change
        user.failed_login_attempts = 0
        user.locked_until = None

        # Revoke active sessions for security
        sess_res = await self.db.execute(
            select(UserSession).where(UserSession.user_id == user.id, UserSession.is_revoked.is_(False))
        )
        for s in sess_res.scalars().all():
            s.is_revoked = True

        audit = AuditLog(
            user_id=actor_id,
            username=actor_name,
            action="user.reset_password",
            target_type="user",
            target_id=str(user.id),
            result=AuditResult.SUCCESS,
            payload={"force_password_change": user.force_password_change},
            ip_address=ip,
        )
        self.db.add(audit)
        await self.db.commit()
