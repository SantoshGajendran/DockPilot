import asyncio
from datetime import datetime, timedelta, timezone
import uuid
import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import Settings
from app.docker.fake import FakeGateway
from app.models.base import Base
from app.models.user import User
from app.services.job_service import JobManager
from app.services.resource_service import (
    ResourceService,
    is_resource_protected,
    matches_patterns,
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


@pytest.fixture
def fake_gateway():
    return FakeGateway()


@pytest.fixture
def mock_settings():
    return Settings(
        protected_images=["dockpilot*", "postgres*", "redis*"],
        protected_volumes=["*dockpilot*", "*postgres*"],
        protected_networks=["bridge", "host", "none", "dockpilot*"],
        prune_token_expire_seconds=300,
    )


@pytest.fixture
def resource_service(fake_gateway, mock_settings):
    job_mgr = JobManager()
    return ResourceService(
        docker_gateway=fake_gateway,
        job_manager=job_mgr,
        settings=mock_settings,
    )


@pytest.fixture
def test_operator():
    return User(id=uuid.uuid4(), username="operator_user", role="operator", is_active=True)


def test_pattern_matching_helpers():
    assert matches_patterns("redis:7-alpine", ["redis*"]) is True
    assert matches_patterns("nginx:alpine", ["redis*"]) is False
    assert is_resource_protected(["my-app:1.0", "dockpilot-web:latest"], ["dockpilot*"]) is True
    assert is_resource_protected(["my-app:1.0"], ["dockpilot*"]) is False


@pytest.mark.asyncio
async def test_in_use_detection_images(resource_service):
    res = await resource_service.list_images()
    assert res.total_count >= 5

    # redis:7-alpine is used by c1 (dockpilot-redis)
    redis_img = next(i for i in res.images if "redis:7-alpine" in i.tags)
    assert redis_img.is_in_use is True
    assert len(redis_img.in_use_by) >= 1
    assert redis_img.in_use_by[0].name == "dockpilot-redis"
    assert redis_img.is_protected is True

    # node:20-alpine is not used by any container
    node_img = next(i for i in res.images if "node:20-alpine" in i.tags)
    assert node_img.is_in_use is False
    assert len(node_img.in_use_by) == 0
    assert node_img.is_protected is False


@pytest.mark.asyncio
async def test_in_use_detection_volumes(resource_service):
    res = await resource_service.list_volumes()
    assert res.total_count >= 4

    # dockpilot_redis_data is mounted in c1
    redis_vol = next(v for v in res.volumes if v.name == "dockpilot_redis_data")
    assert redis_vol.is_in_use is True
    assert len(redis_vol.in_use_by) >= 1
    assert redis_vol.in_use_by[0].name == "dockpilot-redis"
    assert redis_vol.is_protected is True

    # legacy_backup is unused
    legacy_vol = next(v for v in res.volumes if v.name == "legacy_backup")
    assert legacy_vol.is_in_use is False
    assert len(legacy_vol.in_use_by) == 0
    assert legacy_vol.is_protected is False


@pytest.mark.asyncio
async def test_in_use_detection_networks(resource_service):
    res = await resource_service.list_networks()
    assert res.total_count >= 5

    # dockpilot_default is connected to c1 and c2
    dp_net = next(n for n in res.networks if n.name == "dockpilot_default")
    assert dp_net.is_in_use is True
    assert len(dp_net.in_use_by) >= 2
    assert dp_net.is_protected is True

    # bridge, host, none are built-in
    bridge_net = next(n for n in res.networks if n.name == "bridge")
    assert bridge_net.is_built_in is True
    assert bridge_net.is_protected is True

    # unused_test_net is unused
    unused_net = next(n for n in res.networks if n.name == "unused_test_net")
    assert unused_net.is_in_use is False
    assert unused_net.is_protected is False


@pytest.mark.asyncio
async def test_protected_resource_removal_rejection(resource_service, test_operator, async_db):
    # Protected image cannot be removed
    with pytest.raises(HTTPException) as exc_info:
        await resource_service.remove_image("redis:7-alpine", test_operator, "127.0.0.1", async_db)
    assert exc_info.value.status_code == 400
    assert "protected" in exc_info.value.detail.lower()

    # Protected volume cannot be removed
    with pytest.raises(HTTPException) as exc_info:
        await resource_service.remove_volume("dockpilot_postgres_data", test_operator, "127.0.0.1", async_db)
    assert exc_info.value.status_code == 400
    assert "protected" in exc_info.value.detail.lower()

    # Built-in network cannot be removed
    with pytest.raises(HTTPException) as exc_info:
        await resource_service.remove_network("bridge", test_operator, "127.0.0.1", async_db)
    assert exc_info.value.status_code == 400
    assert "built-in" in exc_info.value.detail.lower() or "protected" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_in_use_resource_removal_rejection(resource_service, test_operator, async_db):
    # nginx:alpine is in use by web-nginx and not protected by default config
    with pytest.raises(HTTPException) as exc_info:
        await resource_service.remove_image("nginx:alpine", test_operator, "127.0.0.1", async_db)
    assert exc_info.value.status_code == 409
    assert "in use" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_remove_unprotected_unused_resource(resource_service, test_operator, async_db):
    # node:20-alpine is unused and unprotected
    success = await resource_service.remove_image("node:20-alpine", test_operator, "127.0.0.1", async_db)
    assert success is True

    # legacy_backup volume is unused and unprotected
    success_vol = await resource_service.remove_volume("legacy_backup", test_operator, "127.0.0.1", async_db)
    assert success_vol is True

    # unused_test_net is unused and unprotected
    success_net = await resource_service.remove_network("unused_test_net", test_operator, "127.0.0.1", async_db)
    assert success_net is True


@pytest.mark.asyncio
async def test_prune_preview_and_confirm(resource_service, test_operator, async_db):
    # 1. Preview images prune
    preview = await resource_service.preview_prune_images()
    assert preview.resource_type == "images"
    assert preview.items_count >= 1
    assert preview.space_reclaimed_bytes > 0
    assert preview.confirmation_token is not None

    token = preview.confirmation_token

    # 2. Confirm images prune
    result = await resource_service.confirm_prune("images", token, test_operator, "127.0.0.1", async_db)
    assert result.resource_type == "images"
    assert len(result.items_deleted) == preview.items_count
    assert result.space_reclaimed_bytes == preview.space_reclaimed_bytes

    # 3. Token cannot be reused
    with pytest.raises(HTTPException) as exc_info:
        await resource_service.confirm_prune("images", token, test_operator, "127.0.0.1", async_db)
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_pull_image_job(resource_service, test_operator, async_db):
    job_resp = await resource_service.start_pull_image("alpine:3.19", test_operator, "127.0.0.1", async_db)
    assert job_resp.project_name == "alpine:3.19"
    assert job_resp.action == "pull"
    assert job_resp.id is not None

    # Wait briefly for background task to complete
    await asyncio.sleep(0.05)

    job_record = resource_service.job_manager.get_job(job_resp.id)
    assert job_record is not None
    assert len(job_record.logs) > 0
