import uuid
import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import Settings
from app.docker.fake import FakeGateway
from app.models.base import Base
from app.models.user import User
from app.services.compose_service import ComposeService, is_path_allowed
from app.services.job_service import JobManager


@pytest_asyncio.fixture
async def async_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session
    await engine.dispose()


def test_is_path_allowed():
    allowed = ["/opt/stacks", "/home/ubuntu/dockpilot", "."]

    assert is_path_allowed(".", allowed) is True
    assert is_path_allowed("/opt/stacks", allowed) is True
    assert is_path_allowed("/opt/stacks/web", allowed) is True
    assert is_path_allowed("/home/ubuntu/dockpilot/compose", allowed) is True

    # Disallowed and traversal attempts
    assert is_path_allowed("/etc/shadow", allowed) is False
    assert is_path_allowed("/var/log", allowed) is False
    assert is_path_allowed("/opt/stacks/../../etc/passwd", allowed) is False


@pytest.mark.asyncio
async def test_list_projects(async_db: AsyncSession):
    gateway = FakeGateway()
    job_mgr = JobManager()
    service = ComposeService(docker_gateway=gateway, job_manager=job_mgr)

    resp = await service.list_projects(db=async_db)

    assert resp.total >= 4
    project_names = [p.name for p in resp.projects]
    assert "dockpilot" in project_names
    assert "web" in project_names
    assert "worker" in project_names

    dockpilot = next(p for p in resp.projects if p.name == "dockpilot")
    assert dockpilot.status == "running"
    assert dockpilot.containers_count == 2
    assert dockpilot.running_count == 2
    assert len(dockpilot.services) == 2

    web = next(p for p in resp.projects if p.name == "web")
    assert web.status == "stopped"

    worker = next(p for p in resp.projects if p.name == "worker")
    assert worker.status == "unhealthy"


@pytest.mark.asyncio
async def test_execute_project_action_invalid_action(async_db: AsyncSession):
    gateway = FakeGateway()
    job_mgr = JobManager()
    service = ComposeService(docker_gateway=gateway, job_manager=job_mgr)
    user = User(id=uuid.uuid4(), username="operator", email="op@example.com", hashed_password="pwd", role="operator")

    with pytest.raises(HTTPException) as exc_info:
        await service.execute_project_action("dockpilot", "invalid_action", user, "127.0.0.1", async_db)
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_execute_project_action_disallowed_path(async_db: AsyncSession):
    gateway = FakeGateway()
    job_mgr = JobManager()
    custom_settings = Settings(
        compose_project_allow_paths=["/secure/only"],
        compose_project_paths={"hacked": "/etc/malicious"},
    )
    service = ComposeService(docker_gateway=gateway, job_manager=job_mgr, settings=custom_settings)
    user = User(id=uuid.uuid4(), username="operator", email="op@example.com", hashed_password="pwd", role="operator")

    with pytest.raises(HTTPException) as exc_info:
        await service.execute_project_action("hacked", "up", user, "127.0.0.1", async_db)
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_execute_project_action_success(async_db: AsyncSession):
    gateway = FakeGateway()
    job_mgr = JobManager()
    service = ComposeService(docker_gateway=gateway, job_manager=job_mgr)
    user = User(id=uuid.uuid4(), username="operator", email="op@example.com", hashed_password="pwd", role="operator")

    resp = await service.execute_project_action("dockpilot", "restart", user, "127.0.0.1", async_db)

    assert resp.project_name == "dockpilot"
    assert resp.action == "restart"
    assert resp.job_id
    assert resp.status == "running"

    job = job_mgr.get_job(resp.job_id)
    assert job is not None
