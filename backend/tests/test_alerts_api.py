import asyncio
from datetime import datetime, timedelta, timezone
import uuid
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

from app.api.deps import get_docker_gateway
from app.core.constants import Role
from app.core.security import create_access_token
from app.docker.fake import FakeGateway
from app.main import create_app
from app.models.alert import AlertEvent, AlertRule
from app.models.base import Base
from app.models.user import User


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


def auth_header(role: Role = Role.ADMIN, username: str = "admin") -> dict:
    token = create_access_token(user_id=uuid.uuid4(), username=username, role=role.value)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_alerts_unauthorized():
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/alerts/rules")
        assert res.status_code == 401

        res = await client.get("/api/v1/alerts/events")
        assert res.status_code == 401

        res = await client.get("/api/v1/alerts/active-count")
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_rules_crud_and_rbac(setup_test_db):
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()

    admin_headers = auth_header(Role.ADMIN, "admin_user")
    viewer_headers = auth_header(Role.VIEWER, "viewer_user")
    operator_headers = auth_header(Role.OPERATOR, "operator_user")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Viewer tries to create a rule -> 403 Forbidden
        payload = {
            "name": "Custom High CPU",
            "rule_type": "cpu_high",
            "scope_type": "all",
            "threshold": 80.0,
            "duration_minutes": 2,
            "cooldown_minutes": 10,
            "severity": "critical",
            "enabled": True,
        }
        res = await client.post("/api/v1/alerts/rules", json=payload, headers=viewer_headers)
        assert res.status_code == 403

        # Admin creates rule -> 201 Created
        res = await client.post("/api/v1/alerts/rules", json=payload, headers=admin_headers)
        assert res.status_code == 201
        created = res.json()
        rule_id = created["id"]
        assert created["name"] == "Custom High CPU"
        assert created["threshold"] == 80.0

        # Viewer can get rule
        res = await client.get(f"/api/v1/alerts/rules/{rule_id}", headers=viewer_headers)
        assert res.status_code == 200
        assert res.json()["id"] == rule_id

        # Viewer can list rules
        res = await client.get("/api/v1/alerts/rules", headers=viewer_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["total"] >= 1

        # Operator tries to update rule -> 403
        res = await client.put(f"/api/v1/alerts/rules/{rule_id}", json={"threshold": 92.0}, headers=operator_headers)
        assert res.status_code == 403

        # Admin updates rule -> 200
        res = await client.put(f"/api/v1/alerts/rules/{rule_id}", json={"threshold": 92.0}, headers=admin_headers)
        assert res.status_code == 200
        assert res.json()["threshold"] == 92.0

        # Admin deletes rule -> 204
        res = await client.delete(f"/api/v1/alerts/rules/{rule_id}", headers=admin_headers)
        assert res.status_code == 204

        # Get deleted rule -> 404
        res = await client.get(f"/api/v1/alerts/rules/{rule_id}", headers=viewer_headers)
        assert res.status_code == 404


@pytest.mark.asyncio
async def test_rules_dry_run(setup_test_db):
    fake_gateway = FakeGateway()
    fake_gateway.containers["c_test"] = {
        "id": "c_test",
        "name": "worker-1",
        "state": "exited",
        "labels": {"app": "worker"},
        "ports": [],
        "health": "",
        "restart_count": 0,
    }

    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: fake_gateway
    operator_headers = auth_header(Role.OPERATOR, "operator_user")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Ad-hoc dry run
        dry_req = {
            "rule_type": "container_down",
            "scope_type": "label",
            "scope_value": "app=worker",
        }
        res = await client.post("/api/v1/alerts/rules/test", json=dry_req, headers=operator_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["rule_type"] == "container_down"
        assert data["matches_count"] == 1
        assert data["targets"][0]["would_fire"] is True
        assert data["targets"][0]["target_id"] == "c_test"


@pytest.mark.asyncio
async def test_events_list_and_ack(setup_test_db):
    session_factory = setup_test_db
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()

    now = datetime.now(timezone.utc)
    event_id = None
    async with session_factory() as session:
        rule = AlertRule(name="R_Test", rule_type="container_down", scope_type="all", enabled=True)
        session.add(rule)
        await session.flush()

        event = AlertEvent(
            rule_id=rule.id,
            rule_name=rule.name,
            rule_type=rule.rule_type,
            severity="critical",
            target_type="container",
            target_id="c_crash",
            target_name="crash-service",
            status="firing",
            message="Container crashed",
            started_at=now,
            created_at=now,
        )
        session.add(event)
        await session.commit()
        await session.refresh(event)
        event_id = event.id

    viewer_headers = auth_header(Role.VIEWER, "viewer_user")
    operator_headers = auth_header(Role.OPERATOR, "operator_user")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # List events with filters
        res = await client.get("/api/v1/alerts/events?status=firing&severity=critical", headers=viewer_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 1
        assert data["events"][0]["id"] == event_id
        assert data["events"][0]["status"] == "firing"
        assert data["events"][0]["acknowledged_at"] is None

        # Viewer tries to ack -> 403
        res = await client.post(f"/api/v1/alerts/events/{event_id}/ack", headers=viewer_headers)
        assert res.status_code == 403

        # Operator acks -> 200
        res = await client.post(f"/api/v1/alerts/events/{event_id}/ack", headers=operator_headers)
        assert res.status_code == 200
        acked = res.json()
        assert acked["acknowledged_at"] is not None
        assert acked["acknowledged_by"] == "operator_user"


@pytest.mark.asyncio
async def test_silence_and_active_count(setup_test_db):
    session_factory = setup_test_db
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()

    now = datetime.now(timezone.utc)
    async with session_factory() as session:
        r = AlertRule(name="R_Count", rule_type="container_down", scope_type="all", enabled=True)
        session.add(r)
        await session.flush()

        e1 = AlertEvent(
            rule_id=r.id,
            rule_name=r.name,
            rule_type=r.rule_type,
            severity="critical",
            target_type="container",
            target_id="c1",
            status="firing",
            message="Down 1",
            started_at=now,
            created_at=now,
        )
        e2 = AlertEvent(
            rule_id=r.id,
            rule_name=r.name,
            rule_type=r.rule_type,
            severity="warning",
            target_type="container",
            target_id="c2",
            status="resolved",
            message="Resolved 2",
            started_at=now,
            resolved_at=now,
            created_at=now,
        )
        session.add_all([e1, e2])
        await session.commit()

    viewer_headers = auth_header(Role.VIEWER, "viewer_user")
    operator_headers = auth_header(Role.OPERATOR, "operator_user")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Active count should be 1 (e1 is firing, e2 is resolved)
        res = await client.get("/api/v1/alerts/active-count", headers=viewer_headers)
        assert res.status_code == 200
        assert res.json()["active_count"] == 1

        # Create silence
        silence_payload = {
            "container_id": "c1",
            "duration_minutes": 120,
            "reason": "Scheduled maintenance",
        }
        res = await client.post("/api/v1/alerts/silence", json=silence_payload, headers=operator_headers)
        assert res.status_code == 201
        silence_data = res.json()
        assert silence_data["container_id"] == "c1"
        assert silence_data["created_by"] == "operator_user"
        assert silence_data["silenced_until"] is not None
