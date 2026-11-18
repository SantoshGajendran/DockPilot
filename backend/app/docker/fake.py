from typing import Any, AsyncGenerator, Dict, List
from app.docker.interface import DockerGateway

class FakeGateway(DockerGateway):
    def __init__(self, containers: Dict[str, Dict[str, Any]] | None = None):
        if containers is not None:
            self.containers = containers
        else:
            self.containers = {
                "c1": {
                    "id": "c1",
                    "name": "dockpilot-redis",
                    "image": "redis:7-alpine",
                    "state": "running",
                    "status": "Up 2 hours",
                    "created": "2026-11-18T20:00:00Z",
                    "ports": {"6379/tcp": [{"HostIp": "0.0.0.0", "HostPort": "6379"}]},
                    "labels": {"com.docker.compose.project": "dockpilot"},
                    "env": ["REDIS_PASSWORD=secret123", "PORT=6379"],
                }
            }

    async def ping(self) -> bool:
        return True

    async def list_containers(self, all: bool = True) -> List[Dict[str, Any]]:
        return list(self.containers.values())

    async def inspect_container(self, container_id: str) -> Dict[str, Any]:
        if container_id in self.containers:
            return self.containers[container_id]
        raise ValueError(f"Container {container_id} not found")

    async def execute_action(self, container_id: str, action: str) -> bool:
        if container_id in self.containers:
            if action in ["start", "restart", "unpause"]:
                self.containers[container_id]["state"] = "running"
            elif action in ["stop", "kill"]:
                self.containers[container_id]["state"] = "exited"
            elif action == "pause":
                self.containers[container_id]["state"] = "paused"
            return True
        return False

    async def stream_events(self) -> AsyncGenerator[Dict[str, Any], None]:
        yield {"status": "start", "id": "c1", "from": "redis:7-alpine"}
