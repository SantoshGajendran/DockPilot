import asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch, MagicMock
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
from app.models.notification import (
    NotificationChannel,
    NotificationDeliveryLog,
    NotificationRoute,
)
from app.services.notification_service import NotificationService
from app.services.notifiers.slack_notifier import SlackNotifier
from app.services.notifiers.telegram_notifier import TelegramNotifier


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
async def test_notifications_unauthorized():
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/alerts/channels")
        assert res.status_code == 401

        res = await client.get("/api/v1/alerts/routes")
        assert res.status_code == 401

        res = await client.get("/api/v1/alerts/delivery-log")
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_channels_crud_and_secrets_safety(setup_test_db):
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()

    admin_headers = auth_header(Role.ADMIN, "admin_user")
    viewer_headers = auth_header(Role.VIEWER, "viewer_user")
    operator_headers = auth_header(Role.OPERATOR, "operator_user")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        channel_payload = {
            "name": "DevOps Slack Channel",
            "channel_type": "slack",
            "enabled": True,
            "config": {},
            "secret": "https://hooks.slack.com/services/T123/B456/SECRETXYZ",
        }

        # Viewer cannot create -> 403
        res = await client.post("/api/v1/alerts/channels", json=channel_payload, headers=viewer_headers)
        assert res.status_code == 403

        # Admin creates channel -> 201
        res = await client.post("/api/v1/alerts/channels", json=channel_payload, headers=admin_headers)
        assert res.status_code == 201
        created = res.json()
        channel_id = created["id"]
        assert created["name"] == "DevOps Slack Channel"
        assert created["has_secret"] is True
        # CRITICAL: Secret is never exposed in response
        assert "secret" not in created
        assert "encrypted_secret" not in created
        assert "SECRETXYZ" not in str(created)

        # Viewer can list channels -> secret is NOT exposed
        res = await client.get("/api/v1/alerts/channels", headers=viewer_headers)
        assert res.status_code == 200
        list_data = res.json()
        assert list_data["total"] == 1
        assert list_data["channels"][0]["has_secret"] is True
        assert "secret" not in list_data["channels"][0]
        assert "SECRETXYZ" not in str(list_data)

        # Viewer can get single channel
        res = await client.get(f"/api/v1/alerts/channels/{channel_id}", headers=viewer_headers)
        assert res.status_code == 200
        assert res.json()["has_secret"] is True
        assert "secret" not in res.json()

        # Admin updates channel name and config
        update_payload = {"name": "Prod Ops Slack", "config": {"channel": "#alerts"}}
        res = await client.put(f"/api/v1/alerts/channels/{channel_id}", json=update_payload, headers=admin_headers)
        assert res.status_code == 200
        updated = res.json()
        assert updated["name"] == "Prod Ops Slack"
        assert updated["config"]["channel"] == "#alerts"
        assert updated["has_secret"] is True
        assert "secret" not in updated

        # Test channel endpoint with mocked notifier (Operator allowed)
        with patch.object(SlackNotifier, "send", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = (True, None)
            res = await client.post(f"/api/v1/alerts/channels/{channel_id}/test", headers=operator_headers)
            assert res.status_code == 200
            test_res = res.json()
            assert test_res["success"] is True

        # Admin deletes channel -> 204
        res = await client.delete(f"/api/v1/alerts/channels/{channel_id}", headers=admin_headers)
        assert res.status_code == 204

        # Getting deleted channel -> 404
        res = await client.get(f"/api/v1/alerts/channels/{channel_id}", headers=viewer_headers)
        assert res.status_code == 404


@pytest.mark.asyncio
async def test_routes_crud_and_rbac(setup_test_db):
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()

    admin_headers = auth_header(Role.ADMIN, "admin_user")
    viewer_headers = auth_header(Role.VIEWER, "viewer_user")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # First create channel
        res = await client.post(
            "/api/v1/alerts/channels",
            json={"name": "Webhook Channel", "channel_type": "webhook", "config": {"url": "https://test.io/hook"}},
            headers=admin_headers,
        )
        channel_id = res.json()["id"]

        # Viewer cannot create route -> 403
        route_payload = {
            "channel_id": channel_id,
            "name": "Critical Alerts Route",
            "min_severity": "critical",
            "rule_type": "all",
            "scope_type": "all",
            "enabled": True,
        }
        res = await client.post("/api/v1/alerts/routes", json=route_payload, headers=viewer_headers)
        assert res.status_code == 403

        # Admin creates route -> 201
        res = await client.post("/api/v1/alerts/routes", json=route_payload, headers=admin_headers)
        assert res.status_code == 201
        created = res.json()
        route_id = created["id"]
        assert created["channel_name"] == "Webhook Channel"
        assert created["min_severity"] == "critical"

        # List routes
        res = await client.get("/api/v1/alerts/routes", headers=viewer_headers)
        assert res.status_code == 200
        assert res.json()["total"] == 1

        # Update route
        res = await client.put(
            f"/api/v1/alerts/routes/{route_id}",
            json={"min_severity": "warning"},
            headers=admin_headers,
        )
        assert res.status_code == 200
        assert res.json()["min_severity"] == "warning"

        # Delete route -> 204
        res = await client.delete(f"/api/v1/alerts/routes/{route_id}", headers=admin_headers)
        assert res.status_code == 204


@pytest.mark.asyncio
async def test_notify_alert_event_integration(setup_test_db):
    session_factory = setup_test_db
    app = create_app()
    app.dependency_overrides[get_docker_gateway] = lambda: FakeGateway()

    now = datetime.now(timezone.utc)
    channel_id = None
    event = None

    async with session_factory() as session:
        # 1. Create channel and route
        c = NotificationChannel(
            name="Telegram On-Call",
            channel_type="telegram",
            enabled=True,
            config={"chat_id": "-100123", "bot_token": "mock-token"},
            encrypted_secret=None,
        )
        session.add(c)
        await session.flush()
        channel_id = c.id

        r = NotificationRoute(
            channel_id=c.id,
            name="All Warning+ Route",
            min_severity="warning",
            rule_type="all",
            scope_type="all",
            enabled=True,
        )
        session.add(r)

        # 2. Create alert event
        rule = AlertRule(name="Down Rule", rule_type="container_down", scope_type="all", enabled=True)
        session.add(rule)
        await session.flush()

        event = AlertEvent(
            rule_id=rule.id,
            rule_name=rule.name,
            rule_type=rule.rule_type,
            severity="critical",
            target_type="container",
            target_id="c_web",
            target_name="web-frontend",
            status="firing",
            message="Web container is exited",
            started_at=now,
            created_at=now,
        )
        session.add(event)
        await session.commit()
        await session.refresh(event)

    # Dispatch notification via NotificationService with mocked telegram
    with patch.object(TelegramNotifier, "send", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = (True, None)

        async with session_factory() as session:
            service = NotificationService(db=session)
            sent = await service.notify_alert_event(event)
            assert sent == 1

    # Check delivery logs
    viewer_headers = auth_header(Role.VIEWER, "viewer_user")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/alerts/delivery-log", headers=viewer_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["total"] >= 1
        log = data["logs"][0]
        assert log["channel_name"] == "Telegram On-Call"
        assert log["status"] == "delivered"
        assert log["severity"] == "critical"
