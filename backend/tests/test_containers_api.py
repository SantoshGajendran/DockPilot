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
async def test_get_containers_unauthorized():
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/containers")
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_get_containers_as_viewer():
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()
    token = create_access_token(user_id=uuid.uuid4(), username="viewer", role=Role.VIEWER)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/containers", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 5
        assert len(data["items"]) == 5


@pytest.mark.asyncio
async def test_container_action_rbac():
    app = create_app()
    fake_gw = FakeGateway()
    app.dependency_overrides[get_docker_gateway] = lambda: fake_gw

    viewer_token = create_access_token(user_id=uuid.uuid4(), username="viewer", role=Role.VIEWER)
    operator_token = create_access_token(user_id=uuid.uuid4(), username="operator", role=Role.OPERATOR)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Viewer denied (403)
        res_viewer = await client.post(
            "/api/v1/containers/c1/stop",
            headers={"Authorization": f"Bearer {viewer_token}"},
        )
        assert res_viewer.status_code == 403

        # Operator allowed (200)
        res_operator = await client.post(
            "/api/v1/containers/c1/stop",
            headers={"Authorization": f"Bearer {operator_token}"},
        )
        assert res_operator.status_code == 200
        assert fake_gw.containers["c1"]["state"] == "exited"


@pytest.mark.asyncio
async def test_containers_bulk_action_api():
    app = create_app()
    fake_gw = FakeGateway()
    app.dependency_overrides[get_docker_gateway] = lambda: fake_gw
    operator_token = create_access_token(user_id=uuid.uuid4(), username="operator", role=Role.OPERATOR)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/api/v1/containers/bulk",
            headers={"Authorization": f"Bearer {operator_token}"},
            json={"action": "restart", "container_ids": ["c1", "c2"]},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["total_success"] == 2
        assert data["total_failed"] == 0


@pytest.mark.asyncio
async def test_delete_container_two_phase_admin_api():
    app = create_app()
    fake_gw = FakeGateway()
    app.dependency_overrides[get_docker_gateway] = lambda: fake_gw

    operator_token = create_access_token(user_id=uuid.uuid4(), username="operator", role=Role.OPERATOR)
    admin_id = uuid.uuid4()
    admin_token = create_access_token(user_id=admin_id, username="admin", role=Role.ADMIN)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Operator cannot generate delete token (403)
        res_op = await client.post(
            "/api/v1/containers/c3/delete-token",
            headers={"Authorization": f"Bearer {operator_token}"},
        )
        assert res_op.status_code == 403

        # Admin generates delete token
        res_token = await client.post(
            "/api/v1/containers/c3/delete-token",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_token.status_code == 200
        token_data = res_token.json()
        del_token = token_data["token"]

        # Operator cannot delete (403)
        res_del_op = await client.delete(
            f"/api/v1/containers/c3?token={del_token}",
            headers={"Authorization": f"Bearer {operator_token}"},
        )
        assert res_del_op.status_code == 403

        # Admin deletes with token
        res_del_admin = await client.delete(
            f"/api/v1/containers/c3?token={del_token}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_del_admin.status_code == 200
        assert "c3" not in fake_gw.containers


@pytest.mark.asyncio
async def test_containers_stream_api():
    app = create_app()
    fake_gw = FakeGateway()
    app.dependency_overrides[get_docker_gateway] = lambda: fake_gw
    viewer_token = create_access_token(user_id=uuid.uuid4(), username="viewer", role=Role.VIEWER)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        async with client.stream(
            "GET",
            "/api/v1/containers/stream?once=true",
            headers={"Authorization": f"Bearer {viewer_token}"},
        ) as response:
            assert response.status_code == 200
            assert "text/event-stream" in response.headers["content-type"]
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    assert "container_id" in line
                    break
