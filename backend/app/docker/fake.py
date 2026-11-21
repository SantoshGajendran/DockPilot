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
                    "health": "healthy",
                    "restart_count": 0,
                    "created": "2026-11-18T20:00:00Z",
                    "ports": {"6379/tcp": [{"HostIp": "0.0.0.0", "HostPort": "6379"}]},
                    "labels": {"com.docker.compose.project": "dockpilot", "tier": "cache"},
                    "env": ["REDIS_PASSWORD=secret123", "PORT=6379", "API_KEY=key_abcdef123456"],
                    "command": "redis-server --protected-mode no",
                    "mounts": [
                        {
                            "Type": "volume",
                            "Source": "dockpilot_redis_data",
                            "Destination": "/data",
                            "Mode": "rw",
                            "RW": True,
                        }
                    ],
                    "networks": {
                        "dockpilot_default": {
                            "IPAddress": "172.20.0.2",
                            "Gateway": "172.20.0.1",
                            "MacAddress": "02:42:ac:14:00:02",
                        }
                    },
                    "restart_policy": {"Name": "unless-stopped", "MaximumRetryCount": 0},
                    "host_config": {"Memory": 536870912, "NanoCpus": 1000000000},
                    "health_info": {
                        "Status": "healthy",
                        "FailingStreak": 0,
                        "Log": [{"Output": "PONG", "ExitCode": 0}],
                    },
                },
                "c2": {
                    "id": "c2",
                    "name": "dockpilot-postgres",
                    "image": "postgres:16-alpine",
                    "state": "running",
                    "status": "Up 5 hours",
                    "health": "healthy",
                    "restart_count": 1,
                    "created": "2026-11-18T18:00:00Z",
                    "ports": {"5432/tcp": [{"HostIp": "0.0.0.0", "HostPort": "5432"}]},
                    "labels": {"com.docker.compose.project": "dockpilot", "tier": "db"},
                    "env": ["POSTGRES_DB=dockpilot"],
                },
                "c3": {
                    "id": "c3",
                    "name": "web-nginx",
                    "image": "nginx:alpine",
                    "state": "exited",
                    "status": "Exited (0) 10 minutes ago",
                    "health": "none",
                    "restart_count": 3,
                    "created": "2026-11-18T15:00:00Z",
                    "ports": {"80/tcp": [{"HostIp": "0.0.0.0", "HostPort": "8080"}]},
                    "labels": {"com.docker.compose.project": "web", "tier": "frontend"},
                    "env": [],
                },
                "c4": {
                    "id": "c4",
                    "name": "worker-task",
                    "image": "python:3.12-slim",
                    "state": "unhealthy",
                    "status": "Up 1 hour (unhealthy)",
                    "health": "unhealthy",
                    "restart_count": 5,
                    "created": "2026-11-18T19:00:00Z",
                    "ports": {},
                    "labels": {"com.docker.compose.project": "worker"},
                    "env": [],
                },
                "c5": {
                    "id": "c5",
                    "name": "cache-memcached",
                    "image": "memcached:alpine",
                    "state": "paused",
                    "status": "Paused",
                    "health": "none",
                    "restart_count": 0,
                    "created": "2026-11-18T17:00:00Z",
                    "ports": {"11211/tcp": [{"HostIp": "0.0.0.0", "HostPort": "11211"}]},
                    "labels": {"com.docker.compose.project": "cache"},
                    "env": [],
                },
            }
        self.stats: Dict[str, Dict[str, Any]] = {}
        self.events: List[Dict[str, Any]] = [
            {
                "id": "ev-1",
                "action": "start",
                "actor_type": "container",
                "actor_name": "dockpilot-redis",
                "timestamp": "2026-11-18T20:00:00Z",
            }
        ]

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

    async def remove_container(self, container_id: str, force: bool = False) -> bool:
        if container_id in self.containers:
            del self.containers[container_id]
            return True
        return False

    async def stream_events(self) -> AsyncGenerator[Dict[str, Any], None]:
        yield {"status": "start", "id": "c1", "from": "redis:7-alpine"}

    async def get_container_stats(self, container_id: str) -> Dict[str, Any]:
        if container_id in self.containers:
            if container_id in self.stats:
                return self.stats[container_id]
            return {
                "cpu_percent": 2.5,
                "memory_bytes": 67108864,
                "memory_limit": 1073741824,
                "memory_percent": 6.25,
                "net_rx_bytes": 1048576,
                "net_tx_bytes": 524288,
                "block_read_bytes": 2097152,
                "block_write_bytes": 4194304,
            }
        raise ValueError(f"Container {container_id} not found")

    async def get_recent_events(self, limit: int = 10) -> List[Dict[str, Any]]:
        return self.events[:limit]
