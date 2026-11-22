import asyncio
from datetime import datetime, timezone
import time
from typing import Any, AsyncGenerator, Dict, List, Optional, Union
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

    async def stream_events(
        self, since: Optional[Union[int, datetime]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        loop = asyncio.get_running_loop()
        try:
            kwargs: Dict[str, Any] = {"decode": True}
            if since is not None:
                kwargs["since"] = since
            event_stream = self._client.events(**kwargs)
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

    async def get_docker_info(self) -> Dict[str, Any]:
        try:
            info = await asyncio.to_thread(self._client.info)
            ver = await asyncio.to_thread(self._client.version)
            return {
                "version": ver.get("Version", "") if isinstance(ver, dict) else "",
                "api_version": ver.get("ApiVersion", "") if isinstance(ver, dict) else "",
                "storage_driver": info.get("Driver", "") if isinstance(info, dict) else "",
                "docker_root_dir": info.get("DockerRootDir", "/var/lib/docker") if isinstance(info, dict) else "/var/lib/docker",
                "operating_system": info.get("OperatingSystem", "") if isinstance(info, dict) else "",
                "architecture": info.get("Architecture", "") if isinstance(info, dict) else "",
                "cpus": info.get("NCPU", 0) if isinstance(info, dict) else 0,
                "total_memory": info.get("MemTotal", 0) if isinstance(info, dict) else 0,
            }
        except Exception:
            return {
                "version": "unknown",
                "api_version": "unknown",
                "storage_driver": "unknown",
                "docker_root_dir": "/var/lib/docker",
                "operating_system": "unknown",
                "architecture": "unknown",
                "cpus": 0,
                "total_memory": 0,
            }

    async def get_docker_disk_usage(self) -> Dict[str, Any]:
        try:
            df = await asyncio.to_thread(self._client.df)
            if not isinstance(df, dict):
                df = {}

            images = df.get("Images") or []
            img_total = sum(i.get("Size", 0) for i in images if isinstance(i, dict))
            img_reclaimable = sum(i.get("Size", 0) for i in images if isinstance(i, dict) and i.get("Containers", 0) == 0)
            img_pct = round((img_reclaimable / img_total * 100), 1) if img_total > 0 else 0.0

            containers = df.get("Containers") or []
            cnt_total = sum(c.get("SizeRw", 0) for c in containers if isinstance(c, dict))
            cnt_reclaimable = sum(c.get("SizeRw", 0) for c in containers if isinstance(c, dict) and c.get("State", "") != "running")
            cnt_pct = round((cnt_reclaimable / cnt_total * 100), 1) if cnt_total > 0 else 0.0

            volumes = df.get("Volumes") or []
            vol_total = 0
            vol_reclaimable = 0
            for v in volumes:
                if isinstance(v, dict):
                    usage = v.get("UsageData") or {}
                    size = usage.get("Size", 0)
                    vol_total += size
                    if usage.get("RefCount", 0) == 0:
                        vol_reclaimable += size
            vol_pct = round((vol_reclaimable / vol_total * 100), 1) if vol_total > 0 else 0.0

            build_cache = df.get("BuildCache") or []
            bc_total = sum(b.get("Size", 0) for b in build_cache if isinstance(b, dict))
            bc_reclaimable = sum(b.get("Size", 0) for b in build_cache if isinstance(b, dict) and not b.get("Shared", False))
            bc_pct = round((bc_reclaimable / bc_total * 100), 1) if bc_total > 0 else 0.0

            return {
                "images": {
                    "count": len(images),
                    "total_bytes": img_total,
                    "reclaimable_bytes": img_reclaimable,
                    "reclaimable_percent": img_pct,
                },
                "containers": {
                    "count": len(containers),
                    "total_bytes": cnt_total,
                    "reclaimable_bytes": cnt_reclaimable,
                    "reclaimable_percent": cnt_pct,
                },
                "volumes": {
                    "count": len(volumes),
                    "total_bytes": vol_total,
                    "reclaimable_bytes": vol_reclaimable,
                    "reclaimable_percent": vol_pct,
                },
                "build_cache": {
                    "count": len(build_cache),
                    "total_bytes": bc_total,
                    "reclaimable_bytes": bc_reclaimable,
                    "reclaimable_percent": bc_pct,
                },
            }
        except Exception:
            return {
                "images": {"count": 0, "total_bytes": 0, "reclaimable_bytes": 0, "reclaimable_percent": 0.0},
                "containers": {"count": 0, "total_bytes": 0, "reclaimable_bytes": 0, "reclaimable_percent": 0.0},
                "volumes": {"count": 0, "total_bytes": 0, "reclaimable_bytes": 0, "reclaimable_percent": 0.0},
                "build_cache": {"count": 0, "total_bytes": 0, "reclaimable_bytes": 0, "reclaimable_percent": 0.0},
            }

    async def execute_compose_action(
        self,
        project_name: str,
        action: str,
        working_dir: Optional[str] = None,
        config_files: Optional[List[str]] = None,
    ) -> AsyncGenerator[str, None]:
        allowed_actions = {"up", "down", "restart", "pull", "stop", "start"}
        if action not in allowed_actions:
            raise ValueError(f"Action '{action}' is not allowed for docker compose")

        cmd = ["docker", "compose"]
        if config_files:
            for cfg in config_files:
                cmd.extend(["-f", cfg])
        elif working_dir:
            cmd.extend(["--project-directory", working_dir])
        else:
            cmd.extend(["-p", project_name])

        if action == "up":
            cmd.extend(["up", "-d"])
        else:
            cmd.append(action)

        yield f"Executing: {' '.join(cmd)}"

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                cwd=working_dir if working_dir and os.path.isdir(working_dir) else None,
            )

            assert process.stdout is not None
            while True:
                line = await process.stdout.readline()
                if not line:
                    break
                yield line.decode("utf-8", errors="replace").rstrip()

            exit_code = await process.wait()
            if exit_code != 0:
                raise RuntimeError(f"docker compose {action} exited with code {exit_code}")
        except Exception as e:
            yield f"Error executing compose {action}: {e}"
            raise

    async def list_images(self) -> List[Dict[str, Any]]:
        def _list() -> List[Dict[str, Any]]:
            imgs = self._client.images.list(all=True)
            results = []
            for img in imgs:
                attrs = getattr(img, "attrs", {}) or {}
                tags = getattr(img, "tags", []) or []
                img_id = getattr(img, "id", "")
                short_id = getattr(img, "short_id", "")
                size = attrs.get("Size", 0)
                created = attrs.get("Created", "")
                labels = attrs.get("Config", {}).get("Labels", {}) or {}
                is_dangling = len(tags) == 0 or tags == ["<none>:<none>"]
                results.append({
                    "id": img_id,
                    "short_id": short_id,
                    "tags": tags,
                    "size": size,
                    "created": created,
                    "labels": labels,
                    "is_dangling": is_dangling,
                })
            return results
        return await asyncio.to_thread(_list)

    async def list_volumes(self) -> List[Dict[str, Any]]:
        def _list() -> List[Dict[str, Any]]:
            vols = self._client.volumes.list()
            results = []
            for v in vols:
                attrs = getattr(v, "attrs", {}) or {}
                name = getattr(v, "name", "")
                driver = attrs.get("Driver", getattr(v, "driver", "local"))
                mountpoint = attrs.get("Mountpoint", "")
                created = attrs.get("CreatedAt", "")
                labels = attrs.get("Labels", {}) or {}
                usage = attrs.get("UsageData", {}) or {}
                size = usage.get("Size", None)
                results.append({
                    "name": name,
                    "driver": driver,
                    "mountpoint": mountpoint,
                    "created": created,
                    "labels": labels,
                    "size": size,
                })
            return results
        return await asyncio.to_thread(_list)

    async def list_networks(self) -> List[Dict[str, Any]]:
        def _list() -> List[Dict[str, Any]]:
            nets = self._client.networks.list()
            results = []
            for net in nets:
                attrs = getattr(net, "attrs", {}) or {}
                net_id = getattr(net, "id", "")
                short_id = getattr(net, "short_id", "")
                name = getattr(net, "name", "")
                driver = attrs.get("Driver", "")
                scope = attrs.get("Scope", "local")
                internal = attrs.get("Internal", False)
                created = attrs.get("Created", "")
                labels = attrs.get("Labels", {}) or {}
                containers_dict = attrs.get("Containers", {}) or {}
                connected_container_ids = list(containers_dict.keys())
                results.append({
                    "id": net_id,
                    "short_id": short_id,
                    "name": name,
                    "driver": driver,
                    "scope": scope,
                    "internal": internal,
                    "created": created,
                    "labels": labels,
                    "connected_container_ids": connected_container_ids,
                })
            return results
        return await asyncio.to_thread(_list)

    async def pull_image(self, image_name: str) -> AsyncGenerator[str, None]:
        tag = image_name.split(":", 1)[1] if ":" in image_name else "latest"
        repository = image_name.split(":", 1)[0]

        loop = asyncio.get_running_loop()
        queue: asyncio.Queue[Union[str, Exception, None]] = asyncio.Queue()

        def _pull_worker():
            try:
                for line in self._client.api.pull(repository, tag=tag, stream=True, decode=True):
                    status = line.get("status", "")
                    progress = line.get("progress", "")
                    layer_id = line.get("id", "")
                    msg = f"{layer_id}: {status} {progress}".strip() if layer_id else f"{status} {progress}".strip()
                    if msg:
                        loop.call_soon_threadsafe(queue.put_nowait, msg)
                loop.call_soon_threadsafe(queue.put_nowait, None)
            except Exception as e:
                loop.call_soon_threadsafe(queue.put_nowait, e)

        asyncio.create_task(asyncio.to_thread(_pull_worker))

        while True:
            item = await queue.get()
            if item is None:
                break
            if isinstance(item, Exception):
                raise item
            yield item

    async def remove_image(self, image_id: str, force: bool = False) -> bool:
        def _remove():
            try:
                self._client.images.remove(image_id, force=force)
                return True
            except NotFound:
                raise ValueError(f"Image {image_id} not found")
            except Exception as e:
                raise ValueError(f"Error removing image {image_id}: {e}")
        return await asyncio.to_thread(_remove)

    async def remove_volume(self, volume_name: str, force: bool = False) -> bool:
        def _remove():
            try:
                vol = self._client.volumes.get(volume_name)
                vol.remove(force=force)
                return True
            except NotFound:
                raise ValueError(f"Volume {volume_name} not found")
            except Exception as e:
                raise ValueError(f"Error removing volume {volume_name}: {e}")
        return await asyncio.to_thread(_remove)

    async def remove_network(self, network_id: str) -> bool:
        def _remove():
            try:
                net = self._client.networks.get(network_id)
                net.remove()
                return True
            except NotFound:
                raise ValueError(f"Network {network_id} not found")
            except Exception as e:
                raise ValueError(f"Error removing network {network_id}: {e}")
        return await asyncio.to_thread(_remove)

    async def prune_images(self, dangling_only: bool = True) -> Dict[str, Any]:
        def _prune():
            filters = {"dangling": True} if dangling_only else {}
            res = self._client.images.prune(filters=filters) or {}
            raw_deleted = res.get("ImagesDeleted", []) or []
            deleted = []
            for d in raw_deleted:
                if isinstance(d, dict):
                    deleted.append(d.get("Deleted") or d.get("Untagged") or "")
                else:
                    deleted.append(str(d))
            deleted = [x for x in deleted if x]
            space = res.get("SpaceReclaimed", 0) or 0
            return {"items_deleted": deleted, "space_reclaimed": space}
        return await asyncio.to_thread(_prune)

    async def prune_volumes(self) -> Dict[str, Any]:
        def _prune():
            res = self._client.volumes.prune() or {}
            deleted = res.get("VolumesDeleted", []) or []
            space = res.get("SpaceReclaimed", 0) or 0
            return {"items_deleted": deleted, "space_reclaimed": space}
        return await asyncio.to_thread(_prune)

    async def prune_networks(self) -> Dict[str, Any]:
        def _prune():
            res = self._client.networks.prune() or {}
            deleted = res.get("NetworksDeleted", []) or []
            return {"items_deleted": deleted, "space_reclaimed": 0}
        return await asyncio.to_thread(_prune)




