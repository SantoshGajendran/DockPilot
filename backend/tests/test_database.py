import os
from pathlib import Path
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from alembic.config import Config
from alembic import command

from app.models.base import Base
from app.models.user import User
from app.models.audit import AuditLog
from app.core.constants import Role, AuditResult
from app.core import database


@pytest.mark.asyncio
async def test_user_and_audit_models():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        user = User(
            username="admin",
            email="admin@example.com",
            hashed_password="hash",
            role=Role.ADMIN,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        assert user.id is not None
        assert user.role == Role.ADMIN

        audit = AuditLog(
            user_id=user.id,
            username=user.username,
            action="system_init",
            target_type="system",
            target_id="0",
            payload={"initialized": True},
            result=AuditResult.SUCCESS,
        )
        session.add(audit)
        await session.commit()
        await session.refresh(audit)
        assert audit.id is not None
        assert audit.result == AuditResult.SUCCESS


@pytest.mark.asyncio
async def test_user_defaults_and_timestamps():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        user = User(
            username="default_user",
            hashed_password="hash",
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        assert user.role == Role.VIEWER
        assert user.is_active is True
        assert user.failed_login_attempts == 0
        assert user.created_at is not None
        assert user.updated_at is not None


@pytest.mark.asyncio
async def test_get_db_session(monkeypatch):
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    test_session_factory = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)
    monkeypatch.setattr(database, "async_session", test_session_factory)

    session_gen = database.get_db_session()
    session = await anext(session_gen)
    assert isinstance(session, AsyncSession)
    await session.close()


def test_alembic_migrations(tmp_path):
    test_db_path = tmp_path / "test_migration.db"
    backend_dir = Path(__file__).resolve().parents[1]
    ini_path = backend_dir / "alembic.ini"

    cfg = Config(str(ini_path))
    cfg.set_main_option("script_location", str(backend_dir / "alembic"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite:///{test_db_path.as_posix()}")

    command.upgrade(cfg, "head")
    assert test_db_path.exists()

    command.downgrade(cfg, "base")
