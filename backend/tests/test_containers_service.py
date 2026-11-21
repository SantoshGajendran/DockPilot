import uuid
import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.models.base import Base
from app.docker.fake import FakeGateway
from app.models.audit import AuditLog
from app.services.containers_service import (
    delete_container,
    execute_bulk_actions,
    execute_container_action,
    generate_delete_token,
    list_containers,
    stream_container_metrics,
)


@pytest_asyncio.fixture
async def async_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_list_containers_default():
    gw = FakeGateway()
    res = await list_containers(gateway=gw)
    assert res.total == 5
    assert len(res.items) == 5
    assert res.page == 1
    assert res.total_pages == 1


@pytest.mark.asyncio
async def test_list_containers_filters():
    gw = FakeGateway()

    # Search filter q
    res_q = await list_containers(gateway=gw, q="redis")
    assert res_q.total == 1
    assert res_q.items[0].name == "dockpilot-redis"

    # State filter
    res_running = await list_containers(gateway=gw, state="running")
    assert res_running.total == 2
    assert all(c.state == "running" for c in res_running.items)

    res_exited = await list_containers(gateway=gw, state="exited")
    assert res_exited.total == 1
    assert res_exited.items[0].name == "web-nginx"

    # Health filter
    res_healthy = await list_containers(gateway=gw, health="healthy")
    assert res_healthy.total == 2
    assert all(c.health == "healthy" for c in res_healthy.items)

    # Compose project filter
    res_proj = await list_containers(gateway=gw, compose_project="dockpilot")
    assert res_proj.total == 2
    assert all(c.compose_project == "dockpilot" for c in res_proj.items)

    # Label key=val filter
    res_label = await list_containers(gateway=gw, label="tier=cache")
    assert res_label.total == 1
    assert res_label.items[0].name == "dockpilot-redis"


@pytest.mark.asyncio
async def test_list_containers_sorting_and_pagination():
    gw = FakeGateway()

    # Sort by name desc
    res_desc = await list_containers(gateway=gw, sort_by="name", sort_order="desc")
    names = [c.name for c in res_desc.items]
    assert names == sorted(names, reverse=True)

    # Pagination: page_size = 2
    res_p1 = await list_containers(gateway=gw, page=1, page_size=2)
    assert len(res_p1.items) == 2
    assert res_p1.total == 5
    assert res_p1.total_pages == 3

    res_p2 = await list_containers(gateway=gw, page=2, page_size=2)
    assert len(res_p2.items) == 2
    assert res_p1.items[0].id != res_p2.items[0].id


@pytest.mark.asyncio
async def test_execute_container_action_success_and_audit(async_db):
    gw = FakeGateway()
    user_id = uuid.uuid4()
    username = "operator_user"
    ip = "127.0.0.1"

    success = await execute_container_action(
        gateway=gw,
        container_id="c1",
        action="stop",
        user_id=user_id,
        username=username,
        ip=ip,
        db=async_db,
    )
    assert success is True
    assert gw.containers["c1"]["state"] == "exited"

    # Verify audit record
    res = await async_db.execute(
        select(AuditLog).where(AuditLog.target_id == "c1", AuditLog.action == "container.stop")
    )
    audit = res.scalars().first()
    assert audit is not None
    assert audit.username == username
    assert audit.payload.get("status") == "completed"


@pytest.mark.asyncio
async def test_execute_container_action_invalid_action(async_db):
    gw = FakeGateway()
    user_id = uuid.uuid4()
    with pytest.raises(HTTPException) as exc_info:
        await execute_container_action(
            gateway=gw,
            container_id="c1",
            action="invalid_action",
            user_id=user_id,
            username="admin",
            ip=None,
            db=async_db,
        )
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_execute_container_action_not_found(async_db):
    gw = FakeGateway()
    user_id = uuid.uuid4()
    with pytest.raises(HTTPException) as exc_info:
        await execute_container_action(
            gateway=gw,
            container_id="unknown_c",
            action="start",
            user_id=user_id,
            username="admin",
            ip=None,
            db=async_db,
        )
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_execute_bulk_actions_partial_failure(async_db):
    gw = FakeGateway()
    user_id = uuid.uuid4()
    username = "operator_user"

    res = await execute_bulk_actions(
        gateway=gw,
        action="stop",
        container_ids=["c1", "c2", "non_existent"],
        user_id=user_id,
        username=username,
        ip=None,
        db=async_db,
    )
    assert res.total_success == 2
    assert res.total_failed == 1
    assert len(res.results) == 3
    assert res.results[0].success is True
    assert res.results[1].success is True
    assert res.results[2].success is False


@pytest.mark.asyncio
async def test_delete_token_lifecycle_and_container_deletion(async_db):
    gw = FakeGateway()
    admin_id = uuid.uuid4()
    username = "admin_user"

    # Step 1: Generate delete token
    token_resp = await generate_delete_token(
        gateway=gw,
        container_id="c3",
        user_id=admin_id,
    )
    assert token_resp.container_id == "c3"
    assert token_resp.token is not None

    # Step 2: Delete container with valid token
    deleted = await delete_container(
        gateway=gw,
        container_id="c3",
        token=token_resp.token,
        user_id=admin_id,
        username=username,
        ip="127.0.0.1",
        db=async_db,
    )
    assert deleted is True
    assert "c3" not in gw.containers

    # Verify audit record
    res = await async_db.execute(
        select(AuditLog).where(AuditLog.target_id == "c3", AuditLog.action == "container.delete")
    )
    audit = res.scalars().first()
    assert audit is not None
    assert audit.username == username
    assert audit.payload.get("status") == "completed"


@pytest.mark.asyncio
async def test_delete_container_invalid_token(async_db):
    gw = FakeGateway()
    admin_id = uuid.uuid4()
    with pytest.raises(HTTPException) as exc_info:
        await delete_container(
            gateway=gw,
            container_id="c1",
            token="invalid.jwt.token",
            user_id=admin_id,
            username="admin_user",
            ip=None,
            db=async_db,
        )
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_stream_container_metrics_generator():
    gw = FakeGateway()
    generator = stream_container_metrics(gateway=gw, interval_seconds=1)
    async for message in generator:
        assert message.startswith("data: ")
        assert "container_id" in message
        assert "dockpilot-redis" in message
        break
