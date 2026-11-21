from unittest.mock import MagicMock
import pytest
from docker.errors import NotFound

from app.docker.interface import DockerGateway
from app.docker.fake import FakeGateway
from app.docker.engine import EngineGateway

@pytest.mark.asyncio
async def test_fake_gateway_contract():
    gateway = FakeGateway()
    assert await gateway.ping() is True
    
    containers = await gateway.list_containers(all=True)
    assert len(containers) > 0
    c_id = containers[0]["id"]
    
    details = await gateway.inspect_container(c_id)
    assert details["id"] == c_id
    assert "state" in details
    
    success = await gateway.execute_action(c_id, "restart")
    assert success is True
    
    # Test remove
    assert await gateway.remove_container(c_id) is True
    assert await gateway.remove_container("non_existent") is False
    
    events = []
    async for event in gateway.stream_events():
        events.append(event)
        break
    assert len(events) == 1
    assert events[0]["status"] == "start"

@pytest.mark.asyncio
async def test_fake_gateway_actions_and_errors():
    gateway = FakeGateway()
    
    # State transitions
    assert await gateway.execute_action("c1", "stop") is True
    assert gateway.containers["c1"]["state"] == "exited"
    
    assert await gateway.execute_action("c1", "pause") is True
    assert gateway.containers["c1"]["state"] == "paused"
    
    assert await gateway.execute_action("c1", "unpause") is True
    assert gateway.containers["c1"]["state"] == "running"
    
    assert await gateway.execute_action("c1", "kill") is True
    assert gateway.containers["c1"]["state"] == "exited"
    
    # Non-existent container
    assert await gateway.execute_action("non_existent", "start") is False
    with pytest.raises(ValueError, match="not found"):
        await gateway.inspect_container("non_existent")

def test_docker_gateway_abc():
    with pytest.raises(TypeError):
        DockerGateway()

@pytest.mark.asyncio
async def test_engine_gateway_with_mock_client():
    mock_client = MagicMock()
    mock_client.ping.return_value = True
    
    mock_container = MagicMock()
    mock_container.id = "mock_c1"
    mock_container.name = "/dockpilot-api"
    mock_container.status = "running"
    mock_container.attrs = {
        "State": {"Status": "running", "Health": {"Status": "healthy"}},
        "Config": {"Labels": {"test": "true"}, "Env": ["ENV=prod"]},
        "NetworkSettings": {"Ports": {"8000/tcp": [{"HostPort": "8000"}]}},
        "Created": "2026-11-18T20:00:00Z",
        "RestartCount": 2,
    }
    mock_container.image.tags = ["dockpilot-api:latest"]
    
    mock_client.containers.list.return_value = [mock_container]
    mock_client.containers.get.return_value = mock_container
    
    gateway = EngineGateway(client=mock_client)
    
    # Test ping
    assert await gateway.ping() is True
    
    # Test list
    containers = await gateway.list_containers(all=True)
    assert len(containers) == 1
    assert containers[0]["id"] == "mock_c1"
    assert containers[0]["name"] == "dockpilot-api"
    assert containers[0]["image"] == "dockpilot-api:latest"
    assert containers[0]["state"] == "running"
    assert containers[0]["health"] == "healthy"
    assert containers[0]["restart_count"] == 2
    
    # Test inspect
    details = await gateway.inspect_container("mock_c1")
    assert details["id"] == "mock_c1"
    assert details["name"] == "dockpilot-api"
    
    # Test execute_action
    success = await gateway.execute_action("mock_c1", "restart")
    assert success is True
    mock_container.restart.assert_called_once()
    
    # Test remove_container
    assert await gateway.remove_container("mock_c1", force=True) is True
    mock_container.remove.assert_called_once_with(force=True)
    
    # Test events stream
    mock_client.events.return_value = iter([{"status": "die", "id": "mock_c1"}])
    events = []
    async for ev in gateway.stream_events():
        events.append(ev)
        break
    assert len(events) == 1
    assert events[0]["status"] == "die"

    # Test get_container_stats
    mock_container.stats.return_value = {
        "cpu_stats": {
            "cpu_usage": {"total_usage": 200000000},
            "system_cpu_usage": 1000000000,
            "online_cpus": 2,
        },
        "precpu_stats": {
            "cpu_usage": {"total_usage": 100000000},
            "system_cpu_usage": 500000000,
        },
        "memory_stats": {
            "usage": 104857600,
            "limit": 1073741824,
            "stats": {"cache": 0},
        },
    }
    stats = await gateway.get_container_stats("mock_c1")
    assert stats["cpu_percent"] > 0
    assert stats["memory_bytes"] == 104857600
    assert stats["memory_limit"] == 1073741824

    # Test get_recent_events
    mock_client.events.return_value = [
        {
            "Action": "start",
            "Type": "container",
            "Actor": {"ID": "mock_c1", "Attributes": {"name": "dockpilot-api"}},
            "time": 1731960000,
        }
    ]
    recent_events = await gateway.get_recent_events(limit=5)
    assert len(recent_events) == 1
    assert recent_events[0]["action"] == "start"
    assert recent_events[0]["actor_name"] == "dockpilot-api"

@pytest.mark.asyncio
async def test_engine_gateway_error_handling():
    mock_client = MagicMock()
    mock_client.ping.side_effect = Exception("Docker daemon unreachable")
    mock_client.containers.get.side_effect = NotFound("Container not found")
    
    gateway = EngineGateway(client=mock_client)
    assert await gateway.ping() is False
    
    with pytest.raises(ValueError, match="not found"):
        await gateway.inspect_container("unknown_id")

    with pytest.raises(ValueError, match="not found"):
        await gateway.get_container_stats("unknown_id")
        
    assert await gateway.execute_action("unknown_id", "restart") is False
    assert await gateway.remove_container("unknown_id") is False
