import uuid
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.api.deps import get_docker_gateway
from app.core.constants import Role
from app.core.security import create_access_token
from app.docker.fake import FakeGateway
from app.main import create_app
from app.models.base import Base


@pytest_asyncio.fixture(autouse=True)
async def setup_test_db(monkeypatch):
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    monkeypatch.setattr("app.core.database.async_session", session_factory)
    monkeypatch.setattr("app.core.database.engine", engine)
    monkeypatch.setattr("app.main.async_session", session_factory)

    yield session_factory
    await engine.dispose()


@pytest.mark.asyncio
async def test_compose_endpoints_unauthorized():
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/compose/projects")
        assert res.status_code == 401

        res = await client.post("/api/v1/compose/projects/dockpilot/up")
        assert res.status_code == 401

        res = await client.get("/api/v1/jobs/123")
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_list_compose_projects_authorized():
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()
    token = create_access_token(user_id=uuid.uuid4(), username="viewer", role=Role.VIEWER)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/compose/projects", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert "projects" in data
        assert data["total"] >= 1
        p = data["projects"][0]
        assert "name" in p
        assert "status" in p
        assert "services" in p


@pytest.mark.asyncio
async def test_compose_action_rbac_and_job_execution():
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()

    viewer_token = create_access_token(user_id=uuid.uuid4(), username="viewer", role=Role.VIEWER)
    op_token = create_access_token(user_id=uuid.uuid4(), username="operator", role=Role.OPERATOR)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Viewer forbidden to trigger actions
        res_forbidden = await client.post(
            "/api/v1/compose/projects/dockpilot/up",
            headers={"Authorization": f"Bearer {viewer_token}"},
        )
        assert res_forbidden.status_code == 403

        # Operator allowed
        res_op = await client.post(
            "/api/v1/compose/projects/dockpilot/up",
            headers={"Authorization": f"Bearer {op_token}"},
        )
        assert res_op.status_code == 200
        data = res_op.json()
        assert "job_id" in data
        job_id = data["job_id"]

        # Check job status
        res_job = await client.get(
            f"/api/v1/jobs/{job_id}",
            headers={"Authorization": f"Bearer {viewer_token}"},
        )
        assert res_job.status_code == 200
        job_data = res_job.json()
        assert job_data["id"] == job_id
        assert job_data["project_name"] == "dockpilot"
        assert job_data["action"] == "up"
