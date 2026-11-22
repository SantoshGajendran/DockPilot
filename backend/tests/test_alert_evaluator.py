import asyncio
from datetime import datetime, timedelta, timezone
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import select

from app.docker.fake import FakeGateway
from app.models.alert import AlertEvent, AlertRule, AlertSilence
from app.models.base import Base
from app.models.metrics import ContainerMetricRecord
from app.services.alert_evaluator_service import AlertEvaluatorService, matches_scope


@pytest_asyncio.fixture
async def test_db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    yield session_factory
    await engine.dispose()


def test_matches_scope():
    c = {
        "id": "abc123def456",
        "name": "/web-frontend",
        "labels": {"environment": "production", "tier": "frontend"},
    }
    # all
    assert matches_scope(c, "all", None) is True
    assert matches_scope(c, "", None) is True

    # container scope
    assert matches_scope(c, "container", "web-frontend") is True
    assert matches_scope(c, "container", "/web-frontend") is True
    assert matches_scope(c, "container", "abc123def456") is True
    assert matches_scope(c, "container", "abc123") is True
    assert matches_scope(c, "container", "other-app") is False

    # label scope
    assert matches_scope(c, "label", "environment=production") is True
    assert matches_scope(c, "label", "environment=staging") is False
    assert matches_scope(c, "label", "tier") is True
    assert matches_scope(c, "label", "backend") is False


@pytest.mark.asyncio
async def test_evaluator_container_down_and_resolved(test_db_session):
    c_id = "test-c1"
    containers = {
        c_id: {
            "id": c_id,
            "name": "c1-worker",
            "state": "exited",
            "status": "Exited (1) 2 minutes ago",
            "image": "busybox:latest",
            "created": "2026-01-01T00:00:00Z",
            "labels": {},
            "ports": [],
            "health": "",
            "restart_count": 0,
        }
    }
    gateway = FakeGateway(containers=containers)

    evaluator = AlertEvaluatorService(docker_gateway=gateway, session_factory=test_db_session)

    # Insert container_down rule
    async with test_db_session() as session:
        rule = AlertRule(
            name="Down Rule",
            rule_type="container_down",
            scope_type="all",
            severity="critical",
            cooldown_minutes=15,
            enabled=True,
        )
        session.add(rule)
        await session.commit()

    # First evaluation -> should fire
    await evaluator.evaluate_all_rules()

    async with test_db_session() as session:
        events = (await session.execute(select(AlertEvent))).scalars().all()
        assert len(events) == 1
        assert events[0].status == "firing"
        assert events[0].target_id == c_id

    # Container starts running again
    gateway.containers[c_id]["state"] = "running"

    # Second evaluation -> should resolve
    await evaluator.evaluate_all_rules()

    async with test_db_session() as session:
        events = (await session.execute(select(AlertEvent))).scalars().all()
        assert len(events) == 1
        assert events[0].status == "resolved"
        assert events[0].resolved_at is not None


@pytest.mark.asyncio
async def test_evaluator_restart_loop_and_health_failing(test_db_session):
    containers = {
        "c_crash": {
            "id": "c_crash",
            "name": "crashing-app",
            "state": "running",
            "health": "unhealthy",
            "restart_count": 5,
            "labels": {},
            "ports": [],
        }
    }
    gateway = FakeGateway(containers=containers)

    evaluator = AlertEvaluatorService(docker_gateway=gateway, session_factory=test_db_session)

    async with test_db_session() as session:
        r1 = AlertRule(name="R1", rule_type="restart_loop", scope_type="all", enabled=True)
        r2 = AlertRule(name="R2", rule_type="health_failing", scope_type="all", enabled=True)
        session.add_all([r1, r2])
        await session.commit()

    await evaluator.evaluate_all_rules()

    async with test_db_session() as session:
        events = (await session.execute(select(AlertEvent))).scalars().all()
        assert len(events) == 2
        types = {e.rule_type for e in events}
        assert "restart_loop" in types
        assert "health_failing" in types


@pytest.mark.asyncio
async def test_evaluator_silence_suppression(test_db_session):
    containers = {
        "c_silenced": {
            "id": "c_silenced",
            "name": "silenced-app",
            "state": "exited",
            "health": "",
            "restart_count": 0,
            "labels": {},
            "ports": [],
        }
    }
    gateway = FakeGateway(containers=containers)

    evaluator = AlertEvaluatorService(docker_gateway=gateway, session_factory=test_db_session)
    now = datetime.now(timezone.utc)

    async with test_db_session() as session:
        rule = AlertRule(name="Down Rule", rule_type="container_down", scope_type="all", enabled=True)
        session.add(rule)
        await session.flush()

        silence = AlertSilence(
            rule_id=rule.id,
            container_id="c_silenced",
            silenced_until=now + timedelta(hours=1),
            reason="Testing silence",
            created_by="tester",
            created_at=now,
        )
        session.add(silence)
        await session.commit()

    await evaluator.evaluate_all_rules()

    async with test_db_session() as session:
        events = (await session.execute(select(AlertEvent))).scalars().all()
        # Suppressed by silence -> no event created
        assert len(events) == 0


@pytest.mark.asyncio
async def test_evaluator_cooldown_suppression(test_db_session):
    c_id = "c_cooldown"
    containers = {
        c_id: {
            "id": c_id,
            "name": "cooldown-app",
            "state": "exited",
            "health": "",
            "restart_count": 0,
            "labels": {},
            "ports": [],
        }
    }
    gateway = FakeGateway(containers=containers)

    evaluator = AlertEvaluatorService(docker_gateway=gateway, session_factory=test_db_session)
    now = datetime.now(timezone.utc)

    async with test_db_session() as session:
        rule = AlertRule(
            name="Down Rule",
            rule_type="container_down",
            scope_type="all",
            cooldown_minutes=15,
            enabled=True,
        )
        session.add(rule)
        await session.flush()

        # Add an event that was resolved 5 minutes ago (within 15m cooldown)
        recent_event = AlertEvent(
            rule_id=rule.id,
            rule_name=rule.name,
            rule_type=rule.rule_type,
            severity=rule.severity,
            target_type="container",
            target_id=c_id,
            target_name="cooldown-app",
            status="resolved",
            message="Previously resolved",
            started_at=now - timedelta(minutes=10),
            resolved_at=now - timedelta(minutes=5),
            created_at=now - timedelta(minutes=5),
        )
        session.add(recent_event)
        await session.commit()

    # Should not fire because of cooldown
    await evaluator.evaluate_all_rules()

    async with test_db_session() as session:
        events = (await session.execute(select(AlertEvent))).scalars().all()
        assert len(events) == 1
        assert events[0].status == "resolved"


@pytest.mark.asyncio
async def test_evaluator_container_missing(test_db_session):
    gateway = FakeGateway()
    # Missing container "database-primary"
    evaluator = AlertEvaluatorService(docker_gateway=gateway, session_factory=test_db_session)

    async with test_db_session() as session:
        rule = AlertRule(
            name="Missing DB",
            rule_type="container_missing",
            scope_type="container",
            scope_value="database-primary",
            severity="critical",
            enabled=True,
        )
        session.add(rule)
        await session.commit()

    await evaluator.evaluate_all_rules()

    async with test_db_session() as session:
        events = (await session.execute(select(AlertEvent))).scalars().all()
        assert len(events) == 1
        assert events[0].rule_type == "container_missing"
        assert events[0].status == "firing"
        assert events[0].target_id == "database-primary"


@pytest.mark.asyncio
async def test_evaluator_cpu_high_sustained_duration(test_db_session):
    gateway = FakeGateway()
    c_id = "c_cpu"
    gateway.containers[c_id] = {
        "id": c_id,
        "name": "cpu-eater",
        "state": "running",
        "health": "",
        "restart_count": 0,
        "labels": {},
        "ports": [],
    }
    # Mock container stats to 95%
    gateway.stats[c_id] = {"cpu_percent": 95.0, "memory_percent": 40.0}

    evaluator = AlertEvaluatorService(docker_gateway=gateway, session_factory=test_db_session)
    now = datetime.now(timezone.utc)

    # 1. Rule with duration_minutes=5, but in metrics table 2 mins ago cpu dropped to 50%
    async with test_db_session() as session:
        rule = AlertRule(
            name="CPU High",
            rule_type="cpu_high",
            scope_type="all",
            threshold=85.0,
            duration_minutes=5,
            severity="warning",
            enabled=True,
        )
        session.add(rule)
        # Insert a lower metric in the past 5 minutes
        m1 = ContainerMetricRecord(
            container_id=c_id,
            timestamp=now - timedelta(minutes=2),
            cpu_percent=50.0,
            memory_bytes=1000,
            memory_limit=2000,
        )
        session.add(m1)
        await session.commit()

    # Evaluates: current=95%, but min in window=50% < 85%, so sustained check fails
    await evaluator.evaluate_all_rules()

    async with test_db_session() as session:
        events = (await session.execute(select(AlertEvent))).scalars().all()
        assert len(events) == 0

    # 2. Update metric in window to be high (90% >= 85%)
    async with test_db_session() as session:
        m_rec = (await session.execute(select(ContainerMetricRecord))).scalar_one()
        m_rec.cpu_percent = 90.0
        await session.commit()

    # Evaluates: current=95%, min=90% >= 85% -> fires!
    await evaluator.evaluate_all_rules()

    async with test_db_session() as session:
        events = (await session.execute(select(AlertEvent))).scalars().all()
        assert len(events) == 1
        assert events[0].status == "firing"
