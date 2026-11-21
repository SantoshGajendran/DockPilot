import asyncio
from datetime import datetime, timezone
import time
from typing import Any, AsyncGenerator, Dict, List, Optional
import docker
from docker.errors import DockerException, NotFound

from app.core.config import get_settings
from app.docker.demux import demux_docker_stream
from app.docker.interface import DockerGateway

def _format_container(container: Any) -> Dict[str, Any]:
    attrs = getattr(container, "attrs", {}) or {}
    state_info = attrs.get("State", {}) if isinstance(attrs, dict) else {}
    status = getattr(container, "status", "")
    state_str = state_info.get("Status", status) if isinstance(state_info, dict) else status
    config = attrs.get("Config", {}) if isinstance(attrs, dict) else {}
    network_settings = attrs.get("NetworkSettings", {}) if isinstance(attrs, dict) else {}

    health_info = state_info.get("Health", {}) if isinstance(state_info, dict) else {}
    health_status = health_info.get("Status", "none") if isinstance(health_info, dict) else "none"
    restart_count = attrs.get("RestartCount", 0) if isinstance(attrs, dict) else 0

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

    host_config = attrs.get("HostConfig", {}) if isinstance(attrs, dict) else {}
    mounts = attrs.get("Mounts", []) if isinstance(attrs, dict) else []
    networks = network_settings.get("Networks", {}) if isinstance(network_settings, dict) else {}
    cmd = config.get("Cmd", []) if isinstance(config, dict) else []
    command_str = " ".join(cmd) if isinstance(cmd, list) else str(cmd or "")
    restart_policy = host_config.get("RestartPolicy", {}) if isinstance(host_config, dict) else {}

    return {
        "id": getattr(container, "id", ""),
        "name": name,
        "image": image_tag,
        "state": state_str,
        "status": status,
        "health": health_status,
        "restart_count": restart_count,
        "created": attrs.get("Created", "") if isinstance(attrs, dict) else "",
        "ports": network_settings.get("Ports", {}) if isinstance(network_settings, dict) else {},
        "labels": config.get("Labels", {}) if isinstance(config, dict) else {},
        "env": config.get("Env", []) if isinstance(config, dict) else [],
        "command": command_str,
        "mounts": mounts,
        "networks": networks,
        "restart_policy": restart_policy,
        "host_config": host_config,
        "health_info": health_info,
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

    async def remove_container(self, container_id: str, force: bool = False) -> bool:
        def _remove() -> bool:
            try:
                container = self._client.containers.get(container_id)
                container.remove(force=force)
                return True
            except Exception:
                return False
        return await asyncio.to_thread(_remove)

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

    async def get_container_stats(self, container_id: str) -> Dict[str, Any]:
        def _stats() -> Dict[str, Any]:
            try:
                container = self._client.containers.get(container_id)
                raw_stats = container.stats(stream=False)
                
                # CPU calculation
                cpu_stats = raw_stats.get("cpu_stats", {}) if isinstance(raw_stats, dict) else {}
                precpu_stats = raw_stats.get("precpu_stats", {}) if isinstance(raw_stats, dict) else {}
                
                cpu_usage = cpu_stats.get("cpu_usage", {}).get("total_usage", 0) if isinstance(cpu_stats, dict) else 0
                precpu_usage = precpu_stats.get("cpu_usage", {}).get("total_usage", 0) if isinstance(precpu_stats, dict) else 0
                cpu_delta = cpu_usage - precpu_usage
                
                system_cpu_usage = cpu_stats.get("system_cpu_usage", 0) if isinstance(cpu_stats, dict) else 0
                system_precpu_usage = precpu_stats.get("system_cpu_usage", 0) if isinstance(precpu_stats, dict) else 0
                system_delta = system_cpu_usage - system_precpu_usage
                
                percpu_usage = cpu_stats.get("cpu_usage", {}).get("percpu_usage", []) if isinstance(cpu_stats, dict) else []
                online_cpus = cpu_stats.get("online_cpus") or (len(percpu_usage) if percpu_usage else 1) or 1
                
                cpu_percent = 0.0
                if system_delta > 0 and cpu_delta > 0:
                    cpu_percent = round((cpu_delta / system_delta) * online_cpus * 100.0, 2)
                    
                # Memory calculation
                mem_stats = raw_stats.get("memory_stats", {}) if isinstance(raw_stats, dict) else {}
                usage = mem_stats.get("usage", 0) if isinstance(mem_stats, dict) else 0
                stats_detail = mem_stats.get("stats", {}) if isinstance(mem_stats, dict) else {}
                cache = stats_detail.get("inactive_file", 0) or stats_detail.get("cache", 0)
                used_memory = max(0, usage - cache)
                limit = mem_stats.get("limit", 0) if isinstance(mem_stats, dict) else 0
                mem_percent = round((used_memory / limit) * 100.0, 2) if limit > 0 else 0.0

                # Network I/O calculation
                net_stats = raw_stats.get("networks", {}) if isinstance(raw_stats, dict) else {}
                net_rx_bytes = 0
                net_tx_bytes = 0
                if isinstance(net_stats, dict):
                    for net in net_stats.values():
                        if isinstance(net, dict):
                            net_rx_bytes += net.get("rx_bytes", 0)
                            net_tx_bytes += net.get("tx_bytes", 0)

                # Block I/O calculation
                blkio_stats = raw_stats.get("blkio_stats", {}) if isinstance(raw_stats, dict) else {}
                io_service_bytes = blkio_stats.get("io_service_bytes_recursive", []) if isinstance(blkio_stats, dict) else []
                block_read_bytes = 0
                block_write_bytes = 0
                if isinstance(io_service_bytes, list):
                    for entry in io_service_bytes:
                        if isinstance(entry, dict):
                            op = str(entry.get("op", "")).lower()
                            val = entry.get("value", 0)
                            if op == "read":
                                block_read_bytes += val
                            elif op == "write":
                                block_write_bytes += val

                return {
                    "cpu_percent": cpu_percent,
                    "memory_bytes": used_memory,
                    "memory_limit": limit,
                    "memory_percent": mem_percent,
                    "net_rx_bytes": net_rx_bytes,
                    "net_tx_bytes": net_tx_bytes,
                    "block_read_bytes": block_read_bytes,
                    "block_write_bytes": block_write_bytes,
                    "raw": raw_stats,
                }
            except NotFound:
                raise ValueError(f"Container {container_id} not found")
            except Exception as e:
                raise ValueError(f"Error fetching stats for container {container_id}: {e}")
        return await asyncio.to_thread(_stats)

    async def get_recent_events(self, limit: int = 10) -> List[Dict[str, Any]]:
        def _get_events() -> List[Dict[str, Any]]:
            try:
                now = int(time.time())
                since = now - 86400
                events = []
                event_iterable = self._client.events(since=since, until=now, decode=True)
                for event in event_iterable:
                    if not isinstance(event, dict):
                        continue
                    actor = event.get("Actor", {}) if isinstance(event, dict) else {}
                    attributes = actor.get("Attributes", {}) if isinstance(actor, dict) else {}
                    actor_name = attributes.get("name") or event.get("from") or ""
                    
                    time_val = event.get("time") or now
                    if isinstance(time_val, (int, float)):
                        ts = datetime.fromtimestamp(time_val, tz=timezone.utc).isoformat()
                    else:
                        ts = str(time_val)

                    events.append({
                        "id": str(event.get("id") or event.get("timeNano") or len(events)),
                        "action": event.get("Action") or event.get("status") or "",
                        "actor_type": event.get("Type") or "container",
                        "actor_name": actor_name,
                        "timestamp": ts,
                    })
                    if len(events) >= limit:
                        break
                return events
            except Exception:
                return []
        return await asyncio.to_thread(_get_events)

    async def get_container_logs(
        self,
        container_id: str,
        tail: int = 200,
        since: Optional[int] = None,
        until: Optional[int] = None,
        timestamps: bool = True,
    ) -> List[Dict[str, Any]]:
        def _get_logs() -> List[Dict[str, Any]]:
            try:
                container = self._client.containers.get(container_id)
                attrs = getattr(container, "attrs", {}) or {}
                config = attrs.get("Config", {}) if isinstance(attrs, dict) else {}
                is_tty = bool(config.get("Tty", False))
                raw_bytes = container.logs(
                    stream=False,
                    stdout=True,
                    stderr=True,
                    tail=tail,
                    since=since,
                    until=until,
                    timestamps=timestamps,
                )
                if isinstance(raw_bytes, str):
                    raw_bytes = raw_bytes.encode("utf-8")
                return demux_docker_stream(raw_bytes, is_tty=is_tty)
            except NotFound:
                raise ValueError(f"Container {container_id} not found")
            except Exception as e:
                raise ValueError(f"Failed to fetch logs for {container_id}: {e}")
        return await asyncio.to_thread(_get_logs)

    async def stream_container_logs(
        self,
        container_id: str,
        tail: int = 100,
        since: Optional[int] = None,
        timestamps: bool = True,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        loop = asyncio.get_running_loop()
        try:
            container = await asyncio.to_thread(self._client.containers.get, container_id)
            attrs = getattr(container, "attrs", {}) or {}
            config = attrs.get("Config", {}) if isinstance(attrs, dict) else {}
            is_tty = bool(config.get("Tty", False))
            log_stream = container.logs(
                stream=True,
                follow=True,
                stdout=True,
                stderr=True,
                tail=tail,
                since=since,
                timestamps=timestamps,
            )
            iterator = iter(log_stream)
        except NotFound:
            raise ValueError(f"Container {container_id} not found")
        except Exception:
            return

        while True:
            try:
                chunk = await loop.run_in_executor(None, next, iterator)
                if isinstance(chunk, str):
                    chunk = chunk.encode("utf-8")
                lines = demux_docker_stream(chunk, is_tty=is_tty)
                for line in lines:
                    yield line
            except (StopIteration, Exception):
                break

