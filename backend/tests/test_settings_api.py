import uuid
from datetime import datetime, timedelta, timezone
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import get_settings
from app.core.constants import Role
from app.core.security import create_access_token, hash_password
from app.main import create_app
from app.models.base import Base
from app.models.metrics import ContainerMetricRecord, MetricRollupRecord
from app.models.event import ContainerEventRecord
from app.models.audit import AuditLog
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


@pytest.mark.asyncio
async def test_settings_unauthorized():
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/settings")
        assert res.status_code == 401

        res = await client.put("/api/v1/settings", json={"collection_interval_seconds": 10})
        assert res.status_code == 401

        res = await client.get("/api/v1/settings/storage")
        assert res.status_code == 401

        res = await client.post("/api/v1/settings/retention/run")
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_settings_rbac_viewer_and_operator(setup_test_db):
    app = create_app()
    viewer_token = create_access_token(user_id=uuid.uuid4(), username="viewer", role=Role.VIEWER)
    operator_token = create_access_token(user_id=uuid.uuid4(), username="operator", role=Role.OPERATOR)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        for token in [viewer_token, operator_token]:
            headers = {"Authorization": f"Bearer {token}"}
            # GET settings is allowed for authenticated users
            res = await client.get("/api/v1/settings", headers=headers)
            assert res.status_code == 200

            # GET storage is allowed for authenticated users
            res = await client.get("/api/v1/settings/storage", headers=headers)
            assert res.status_code == 200

            # PUT settings is forbidden for non-admin
            res = await client.put("/api/v1/settings", json={"collection_interval_seconds": 10}, headers=headers)
            assert res.status_code == 403

            # POST retention is forbidden for non-admin
            res = await client.post("/api/v1/settings/retention/run", headers=headers)
            assert res.status_code == 403


@pytest.mark.asyncio
async def test_settings_validation_bounds(setup_test_db):
    app = create_app()
    admin_id = uuid.uuid4()
    async with setup_test_db() as s:
        admin = User(id=admin_id, username="admin", hashed_password=hash_password("pwd"), role=Role.ADMIN)
        s.add(admin)
        await s.commit()

    token = create_access_token(user_id=admin_id, username="admin", role=Role.ADMIN)
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Collection interval bounds: 1 to 60
        res = await client.put("/api/v1/settings", json={"collection_interval_seconds": 0}, headers=headers)
        assert res.status_code == 422

        res = await client.put("/api/v1/settings", json={"collection_interval_seconds": 61}, headers=headers)
        assert res.status_code == 422

        # Retention days bounds: 1 to 365
        res = await client.put("/api/v1/settings", json={"retention_days": 0}, headers=headers)
        assert res.status_code == 422

        # Audit retention days: min 7
        res = await client.put("/api/v1/settings", json={"audit_retention_days": 6}, headers=headers)
        assert res.status_code == 422

        # Empty secret mask patterns list rejected
        res = await client.put("/api/v1/settings", json={"secret_mask_patterns": ["   "]}, headers=headers)
        assert res.status_code == 422


@pytest.mark.asyncio
async def test_settings_update_and_runtime_propagation(setup_test_db):
    app = create_app()
    admin_id = uuid.uuid4()
    async with setup_test_db() as s:
        admin = User(id=admin_id, username="admin", hashed_password=hash_password("pwd"), role=Role.ADMIN)
        s.add(admin)
        await s.commit()

    token = create_access_token(user_id=admin_id, username="admin", role=Role.ADMIN)
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Initial check
        res = await client.get("/api/v1/settings", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "telemetry" in data
        assert "metadata" in data

        # Update runtime settings
        update_payload = {
            "collection_interval_seconds": 12,
            "terminal_enabled": True,
            "metrics_collection_enabled": False,
            "retention_days": 45,
            "log_tail_default": 350,
        }
        put_res = await client.put("/api/v1/settings", json=update_payload, headers=headers)
        assert put_res.status_code == 200
        updated = put_res.json()

        assert updated["telemetry"]["collection_interval_seconds"] == 12
        assert updated["telemetry"]["log_tail_default"] == 350
        assert updated["features"]["terminal_enabled"] is True
        assert updated["features"]["metrics_collection_enabled"] is False
        assert updated["retention"]["retention_days"] == 45

        # Verify live propagation without restart in get_settings()
        settings = get_settings()
        assert settings.terminal_enabled is True
        assert settings.collection_interval_seconds == 12

        # Verify audit log was recorded
        async with setup_test_db() as s:
            audit_res = await s.execute(select(AuditLog).where(AuditLog.action == "settings.update"))
            audits = audit_res.scalars().all()
            assert len(audits) >= 1
            assert "terminal_enabled" in audits[-1].payload["updated_keys"]


@pytest.mark.asyncio
async def test_settings_storage_usage(setup_test_db):
    app = create_app()
    admin_id = uuid.uuid4()
    async with setup_test_db() as s:
        admin = User(id=admin_id, username="admin", hashed_password=hash_password("pwd"), role=Role.ADMIN)
        s.add(admin)
        await s.commit()

    token = create_access_token(user_id=admin_id, username="admin", role=Role.ADMIN)
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/settings/storage", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "database_name" in data
        assert "database_size_human" in data
        assert len(data["tables"]) > 0
        table_names = [t["table_name"] for t in data["tables"]]
        assert "container_metrics" in table_names
        assert "audit_logs" in table_names


@pytest.mark.asyncio
async def test_retention_run_keeps_rollups_and_purges_raw_and_expired(setup_test_db):
    app = create_app()
    admin_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    async with setup_test_db() as s:
        admin = User(id=admin_id, username="admin", hashed_password=hash_password("pwd"), role=Role.ADMIN)
        s.add(admin)

        # 1. Fresh metric (1 hour ago) -> should NOT be rolled up yet
        m_fresh = ContainerMetricRecord(
            container_id="c_fresh",
            timestamp=now - timedelta(hours=1),
            cpu_percent=10.0,
            memory_bytes=1000,
        )
        # 2. Old metrics (30 hours ago, same hour bucket) -> should be rolled up into 1 rollup and deleted from raw
        m_old1 = ContainerMetricRecord(
            container_id="c_old",
            timestamp=now - timedelta(hours=30),
            cpu_percent=20.0,
            memory_bytes=2000,
        )
        m_old2 = ContainerMetricRecord(
            container_id="c_old",
            timestamp=now - timedelta(hours=30) + timedelta(minutes=5),
            cpu_percent=40.0,
            memory_bytes=4000,
        )
        # 3. Expired event (40 days ago, default retention 30 days) -> should be purged
        ev_expired = ContainerEventRecord(
            event_id="ev_exp",
            timestamp=now - timedelta(days=40),
            action="die",
            container_id="c_old",
            container_name="app",
        )
        # 4. Fresh event (2 days ago) -> should stay
        ev_fresh = ContainerEventRecord(
            event_id="ev_fresh",
            timestamp=now - timedelta(days=2),
            action="start",
            container_id="c_fresh",
            container_name="app",
        )
        # 5. Expired audit log (100 days ago, default audit retention 90 days) -> should be purged
        audit_expired = AuditLog(
            user_id=admin_id,
            username="admin",
            action="container.restart",
            target_type="container",
            target_id="c_old",
            result="success",
            timestamp=now - timedelta(days=100),
        )
        s.add_all([m_fresh, m_old1, m_old2, ev_expired, ev_fresh, audit_expired])
        await s.commit()

    token = create_access_token(user_id=admin_id, username="admin", role=Role.ADMIN)
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post("/api/v1/settings/retention/run", headers=headers)
        assert res.status_code == 200
        run_data = res.json()
        assert run_data["metrics_downsampled"] == 2
        assert run_data["events_deleted"] == 1
        assert run_data["audit_logs_deleted"] == 1

        # Check DB state
        async with setup_test_db() as s:
            # Fresh metric is kept in raw container_metrics
            fresh_res = await s.execute(select(ContainerMetricRecord).where(ContainerMetricRecord.container_id == "c_fresh"))
            assert len(fresh_res.scalars().all()) == 1

            # Old metrics were deleted from raw container_metrics
            old_raw = await s.execute(select(ContainerMetricRecord).where(ContainerMetricRecord.container_id == "c_old"))
            assert len(old_raw.scalars().all()) == 0

            # Rollup was created for c_old
            rollups = await s.execute(select(MetricRollupRecord).where(MetricRollupRecord.container_id == "c_old"))
            rollups_list = rollups.scalars().all()
            assert len(rollups_list) == 1
            r = rollups_list[0]
            assert r.sample_count == 2
            assert r.cpu_percent_avg == 30.0  # (20 + 40) / 2
            assert r.cpu_percent_max == 40.0
            assert r.memory_bytes_avg == 3000
            assert r.memory_bytes_max == 4000

            # Expired event was deleted, fresh event preserved
            evs = await s.execute(select(ContainerEventRecord))
            remaining_events = evs.scalars().all()
            assert len(remaining_events) == 1
            assert remaining_events[0].event_id == "ev_fresh"
