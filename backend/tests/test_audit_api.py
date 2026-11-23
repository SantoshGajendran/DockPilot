import csv
import io
import uuid
from datetime import datetime, timedelta, timezone
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.api.deps import get_docker_gateway
from app.core.constants import AuditResult, Role
from app.core.security import create_access_token
from app.docker.fake import FakeGateway
from app.main import create_app
from app.models.audit import AuditLog
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
async def test_audit_list_unauthorized():
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/audit")
        assert res.status_code == 401

        res = await client.get("/audit")
        assert res.status_code == 401

        res = await client.get("/api/v1/audit/export")
        assert res.status_code == 401

        res = await client.get(f"/api/v1/audit/{uuid.uuid4()}")
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_audit_rbac_forbidden_for_non_admin():
    app = create_app()
    viewer_token = create_access_token(user_id=uuid.uuid4(), username="viewer", role=Role.VIEWER)
    operator_token = create_access_token(user_id=uuid.uuid4(), username="operator", role=Role.OPERATOR)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        for token in [viewer_token, operator_token]:
            headers = {"Authorization": f"Bearer {token}"}
            res = await client.get("/api/v1/audit", headers=headers)
            assert res.status_code == 403

            res = await client.get("/audit", headers=headers)
            assert res.status_code == 403

            res = await client.get("/api/v1/audit/export", headers=headers)
            assert res.status_code == 403

            res = await client.get(f"/api/v1/audit/{uuid.uuid4()}", headers=headers)
            assert res.status_code == 403


@pytest.mark.asyncio
async def test_audit_list_and_filters(setup_test_db):
    session_factory = setup_test_db
    app = create_app()
    admin_id = uuid.uuid4()
    admin_token = create_access_token(user_id=admin_id, username="admin_user", role=Role.ADMIN)
    headers = {"Authorization": f"Bearer {admin_token}"}

    now = datetime.now(timezone.utc)
    log_id1 = uuid.uuid4()
    log_id2 = uuid.uuid4()
    log_id3 = uuid.uuid4()

    async with session_factory() as session:
        l1 = AuditLog(
            id=log_id1,
            timestamp=now - timedelta(minutes=15),
            user_id=admin_id,
            username="admin_user",
            action="container.restart",
            target_type="container",
            target_id="cont_web",
            payload={"force": True},
            result=AuditResult.SUCCESS,
            ip_address="192.168.1.10",
        )
        l2 = AuditLog(
            id=log_id2,
            timestamp=now - timedelta(minutes=10),
            user_id=uuid.uuid4(),
            username="operator_bob",
            action="container.stop",
            target_type="container",
            target_id="cont_db",
            payload=None,
            result=AuditResult.FAILURE,
            error_message="Container lock timeout",
            ip_address="192.168.1.20",
        )
        l3 = AuditLog(
            id=log_id3,
            timestamp=now - timedelta(minutes=5),
            user_id=admin_id,
            username="admin_user",
            action="compose.up",
            target_type="compose",
            target_id="project_dockpilot",
            payload={"services": ["backend"]},
            result=AuditResult.SUCCESS,
            ip_address="127.0.0.1",
        )
        session.add_all([l1, l2, l3])
        await session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # All items (descending by default)
        res = await client.get("/api/v1/audit", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 3
        assert len(data["items"]) == 3
        assert data["items"][0]["action"] == "compose.up"

        # Alias /audit works
        res_alias = await client.get("/audit", headers=headers)
        assert res_alias.status_code == 200
        assert res_alias.json()["total"] == 3

        # Filter by user
        res = await client.get("/api/v1/audit?user=bob", headers=headers)
        data = res.json()
        assert data["total"] == 1
        assert data["items"][0]["username"] == "operator_bob"

        # Filter by action
        res = await client.get("/api/v1/audit?action=restart", headers=headers)
        data = res.json()
        assert data["total"] == 1
        assert data["items"][0]["target_id"] == "cont_web"

        # Filter by target_type
        res = await client.get("/api/v1/audit?target_type=compose", headers=headers)
        data = res.json()
        assert data["total"] == 1
        assert data["items"][0]["action"] == "compose.up"

        # Filter by target_id
        res = await client.get("/api/v1/audit?target_id=cont_db", headers=headers)
        data = res.json()
        assert data["total"] == 1
        assert data["items"][0]["result"] == "failure"

        # Filter by result
        res = await client.get("/api/v1/audit?result=failure", headers=headers)
        data = res.json()
        assert data["total"] == 1
        assert data["items"][0]["error_message"] == "Container lock timeout"

        # Filter by time range
        since_iso = (now - timedelta(minutes=12)).strftime("%Y-%m-%dT%H:%M:%SZ")
        res = await client.get(f"/api/v1/audit?since={since_iso}", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 2

        # Sort order ascending
        res = await client.get("/api/v1/audit?sort_order=asc", headers=headers)
        data = res.json()
        assert data["items"][0]["action"] == "container.restart"

        # Pagination
        res = await client.get("/api/v1/audit?page=1&page_size=2", headers=headers)
        data = res.json()
        assert len(data["items"]) == 2
        assert data["total"] == 3
        assert data["total_pages"] == 2
        assert data["page"] == 1


@pytest.mark.asyncio
async def test_audit_get_by_id(setup_test_db):
    session_factory = setup_test_db
    app = create_app()
    admin_token = create_access_token(user_id=uuid.uuid4(), username="admin", role=Role.ADMIN)
    headers = {"Authorization": f"Bearer {admin_token}"}

    test_id = uuid.uuid4()
    async with session_factory() as session:
        log = AuditLog(
            id=test_id,
            timestamp=datetime.now(timezone.utc),
            username="admin",
            action="container.delete",
            target_type="container",
            target_id="cont_old",
            payload={"force": True},
            result=AuditResult.SUCCESS,
            ip_address="10.0.0.1",
        )
        session.add(log)
        await session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Existing entry
        res = await client.get(f"/api/v1/audit/{test_id}", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == str(test_id)
        assert data["action"] == "container.delete"
        assert data["payload"] == {"force": True}

        # Nonexistent UUID
        res = await client.get(f"/api/v1/audit/{uuid.uuid4()}", headers=headers)
        assert res.status_code == 404

        # Malformed ID
        res = await client.get("/api/v1/audit/not-a-uuid", headers=headers)
        assert res.status_code == 404


@pytest.mark.asyncio
async def test_audit_export_csv(setup_test_db):
    session_factory = setup_test_db
    app = create_app()
    admin_token = create_access_token(user_id=uuid.uuid4(), username="admin", role=Role.ADMIN)
    headers = {"Authorization": f"Bearer {admin_token}"}

    async with session_factory() as session:
        for i in range(5):
            log = AuditLog(
                id=uuid.uuid4(),
                timestamp=datetime.now(timezone.utc) - timedelta(minutes=i),
                username=f"user_{i}",
                action=f"action_{i}",
                target_type="container",
                target_id=f"c_{i}",
                payload={"index": i},
                result=AuditResult.SUCCESS if i % 2 == 0 else AuditResult.FAILURE,
                ip_address=f"127.0.0.{i}",
            )
            session.add(log)
        await session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/audit/export", headers=headers)
        assert res.status_code == 200
        assert "text/csv" in res.headers["content-type"]
        assert "attachment; filename=" in res.headers["content-disposition"]

        content = res.text
        reader = csv.reader(io.StringIO(content))
        rows = list(reader)
        # Header + 5 rows
        assert len(rows) == 6
        header = rows[0]
        assert header == [
            "id",
            "timestamp",
            "user_id",
            "username",
            "action",
            "target_type",
            "target_id",
            "result",
            "error_message",
            "ip_address",
            "payload",
        ]

        # Filtered export
        res_filtered = await client.get("/api/v1/audit/export?result=failure", headers=headers)
        assert res_filtered.status_code == 200
        rows_filtered = list(csv.reader(io.StringIO(res_filtered.text)))
        assert len(rows_filtered) == 3  # Header + 2 failure rows


@pytest.mark.asyncio
async def test_audit_append_only_guarantee():
    app = create_app()
    admin_token = create_access_token(user_id=uuid.uuid4(), username="admin", role=Role.ADMIN)
    headers = {"Authorization": f"Bearer {admin_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # POST is not allowed
        res = await client.post("/api/v1/audit", headers=headers, json={"action": "fake"})
        assert res.status_code == 405

        # PUT is not allowed
        res = await client.put(f"/api/v1/audit/{uuid.uuid4()}", headers=headers, json={})
        assert res.status_code == 405

        # PATCH is not allowed
        res = await client.patch(f"/api/v1/audit/{uuid.uuid4()}", headers=headers, json={})
        assert res.status_code == 405

        # DELETE is not allowed
        res = await client.delete(f"/api/v1/audit/{uuid.uuid4()}", headers=headers)
        assert res.status_code == 405


@pytest.mark.asyncio
async def test_control_actions_produce_audit_logs(setup_test_db):
    session_factory = setup_test_db
    app = create_app()
    fake_gw = FakeGateway()
    app.dependency_overrides[get_docker_gateway] = lambda: fake_gw

    admin_id = uuid.uuid4()
    admin_token = create_access_token(user_id=admin_id, username="admin_tester", role=Role.ADMIN)
    headers = {"Authorization": f"Bearer {admin_token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Perform container stop action
        action_res = await client.post(
            "/api/v1/containers/c1/stop",
            headers=headers,
        )
        assert action_res.status_code == 200

        # Query audit log to verify record was created
        audit_res = await client.get("/api/v1/audit?target_id=c1", headers=headers)
        assert audit_res.status_code == 200
        logs = audit_res.json()
        assert logs["total"] >= 1
        entry = next(item for item in logs["items"] if item["target_id"] == "c1")
        assert entry["action"] == "container.stop"
        assert entry["username"] == "admin_tester"
        assert entry["result"] == "success"
