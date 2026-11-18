import asyncio
from typing import Any, AsyncGenerator, Dict, List, Optional
import docker
from docker.errors import DockerException, NotFound

from app.core.config import get_settings
from app.docker.interface import DockerGateway

def _format_container(container: Any) -> Dict[str, Any]:
    attrs = getattr(container, "attrs", {}) or {}
    state_info = attrs.get("State", {}) if isinstance(attrs, dict) else {}
    status = getattr(container, "status", "")
    state_str = state_info.get("Status", status) if isinstance(state_info, dict) else status
    config = attrs.get("Config", {}) if isinstance(attrs, dict) else {}
    network_settings = attrs.get("NetworkSettings", {}) if isinstance(attrs, dict) else {}

    image_tag = ""
    if hasattr(container, "image") and container.image:
        tags = getattr(container.image, "tags", None)
        if tags:
            image_tag = tags[0]
        else:
            image_tag = getattr(container.image, "id", "")

    name = getattr(container, "name", "")
    if name and name.startswith("/"):
        name = name[1:]

    return {
        "id": getattr(container, "id", ""),
        "name": name,
        "image": image_tag,
        "state": state_str,
        "status": status,
        "created": attrs.get("Created", "") if isinstance(attrs, dict) else "",
        "ports": network_settings.get("Ports", {}) if isinstance(network_settings, dict) else {},
        "labels": config.get("Labels", {}) if isinstance(config, dict) else {},
        "env": config.get("Env", []) if isinstance(config, dict) else [],
    }

class EngineGateway(DockerGateway):
    def __init__(self, base_url: Optional[str] = None, client: Optional[docker.DockerClient] = None):
        if client is not None:
            self._client = client
        else:
            settings = get_settings()
            url = base_url or settings.docker_host
            self._client = docker.DockerClient(base_url=url)

    @property
    def client(self) -> docker.DockerClient:
        return self._client

    async def ping(self) -> bool:
        def _ping() -> bool:
            try:
                return bool(self._client.ping())
            except Exception:
                return False
        return await asyncio.to_thread(_ping)

    async def list_containers(self, all: bool = True) -> List[Dict[str, Any]]:
        def _list() -> List[Dict[str, Any]]:
            containers = self._client.containers.list(all=all)
            return [_format_container(c) for c in containers]
        return await asyncio.to_thread(_list)

    async def inspect_container(self, container_id: str) -> Dict[str, Any]:
        def _inspect() -> Dict[str, Any]:
            try:
                container = self._client.containers.get(container_id)
                return _format_container(container)
            except NotFound:
                raise ValueError(f"Container {container_id} not found")
            except Exception as e:
                raise ValueError(f"Error inspecting container {container_id}: {e}")
        return await asyncio.to_thread(_inspect)

    async def execute_action(self, container_id: str, action: str) -> bool:
        def _exec() -> bool:
            try:
                container = self._client.containers.get(container_id)
                action_func = getattr(container, action, None)
                if action_func and callable(action_func):
                    action_func()
                    return True
                return False
            except Exception:
                return False
        return await asyncio.to_thread(_exec)

    async def stream_events(self) -> AsyncGenerator[Dict[str, Any], None]:
        loop = asyncio.get_running_loop()
        try:
            event_stream = self._client.events(decode=True)
            iterator = iter(event_stream)
        except Exception:
            return

        while True:
            try:
                event = await loop.run_in_executor(None, next, iterator)
                yield event
            except (StopIteration, Exception):
                break
