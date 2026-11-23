import asyncio
import uuid
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

from app.api.deps import get_docker_gateway
from app.core.constants import Role
from app.core.security import create_access_token
from app.docker.fake import FakeGateway
from app.main import create_app
from app.models.base import Base


@pytest_asyncio.fixture(autouse=True)
async def setup_test_db(monkeypatch):
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    monkeypatch.setattr("app.core.database.async_session", session_factory)
    monkeypatch.setattr("app.core.database.engine", engine)
    monkeypatch.setattr("app.main.async_session", session_factory)

    yield session_factory
    try:
        await engine.dispose()
    except Exception:
        pass


def auth_header(role: Role = Role.ADMIN, username: str = "admin") -> dict:
    token = create_access_token(user_id=uuid.uuid4(), username=username, role=role.value)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_resources_auth_and_rbac():
    fake_gw = FakeGateway()
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: fake_gw

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Unauthenticated request fails
        resp = await client.get("/api/v1/resources/images")
        assert resp.status_code == 401

        # Viewer can list images, volumes, networks
        viewer_headers = auth_header(Role.VIEWER)
        resp_img = await client.get("/api/v1/resources/images", headers=viewer_headers)
        assert resp_img.status_code == 200
        assert "images" in resp_img.json()

        resp_vol = await client.get("/api/v1/resources/volumes", headers=viewer_headers)
        assert resp_vol.status_code == 200
        assert "volumes" in resp_vol.json()

        resp_net = await client.get("/api/v1/resources/networks", headers=viewer_headers)
        assert resp_net.status_code == 200
        assert "networks" in resp_net.json()

        # Viewer cannot delete or prune (needs OPERATOR)
        del_resp = await client.delete("/api/v1/resources/images/test-img", headers=viewer_headers)
        assert del_resp.status_code == 403

        pull_resp = await client.post("/api/v1/resources/images/pull", json={"image_name": "busybox"}, headers=viewer_headers)
        assert pull_resp.status_code == 403


@pytest.mark.asyncio
async def test_resources_delete_and_protected_api():
    fake_gw = FakeGateway()
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: fake_gw

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        op_headers = auth_header(Role.OPERATOR)

        # 1. Attempt to delete protected image (e.g. postgres:16-alpine) -> 400
        resp = await client.delete("/api/v1/resources/images/postgres:16-alpine", headers=op_headers)
        assert resp.status_code == 400
        assert "protected" in resp.json()["detail"].lower()

        # 2. Attempt to delete in-use image (e.g. nginx:alpine) -> 409
        resp = await client.delete("/api/v1/resources/images/nginx:alpine", headers=op_headers)
        assert resp.status_code == 409
        assert "in use" in resp.json()["detail"].lower()

        # 3. Successfully delete unused image (node:20-alpine) -> 200
        resp = await client.delete("/api/v1/resources/images/node:20-alpine", headers=op_headers)
        assert resp.status_code == 200
        assert resp.json()["ok"] is True


@pytest.mark.asyncio
async def test_prune_workflow_api():
    fake_gw = FakeGateway()
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: fake_gw

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        op_headers = auth_header(Role.OPERATOR)

        # 1. Preview volumes prune
        prev_resp = await client.post("/api/v1/resources/volumes/prune/preview", headers=op_headers)
        assert prev_resp.status_code == 200
        data = prev_resp.json()
        assert data["resource_type"] == "volumes"
        assert data["items_count"] >= 1
        token = data["confirmation_token"]
        assert token

        # 2. Confirm volume prune
        conf_resp = await client.post(
            "/api/v1/resources/volumes/prune",
            json={"confirmation_token": token},
            headers=op_headers,
        )
        assert conf_resp.status_code == 200
        conf_data = conf_resp.json()
        assert conf_data["resource_type"] == "volumes"
        assert len(conf_data["items_deleted"]) == data["items_count"]


@pytest.mark.asyncio
async def test_pull_image_and_jobs_api():
    fake_gw = FakeGateway()
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: fake_gw

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        op_headers = auth_header(Role.OPERATOR)

        # 1. Trigger image pull
        pull_resp = await client.post(
            "/api/v1/resources/images/pull",
            json={"image_name": "busybox:latest"},
            headers=op_headers,
        )
        assert pull_resp.status_code == 200
        job_data = pull_resp.json()
        assert job_data["action"] == "pull"
        job_id = job_data["id"]

        # 2. Check job status
        viewer_headers = auth_header(Role.VIEWER)
        status_resp = await client.get(f"/api/v1/jobs/{job_id}", headers=viewer_headers)
        assert status_resp.status_code == 200
        assert status_resp.json()["id"] == job_id
