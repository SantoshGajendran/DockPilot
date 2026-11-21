import asyncio
from datetime import datetime, timedelta, timezone
import logging
import os
import platform
import time
from typing import Any, Dict, List, Optional
import psutil
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.docker.interface import DockerGateway
from app.models.metrics import HostMetricRecord
from app.schemas.host import (
    DockerDiskCategory,
    DockerDiskUsageResponse,
    HostCpuMetrics,
    HostDiskIoMetrics,
    HostHistoryResponse,
    HostInfoResponse,
    HostLiveMetricsResponse,
    HostMemoryMetrics,
    HostMetricPoint,
    HostMountMetrics,
    HostNetworkMetrics,
    HostProcessItem,
    HostTemperatureItem,
)

logger = logging.getLogger(__name__)


def _get_cpu_model() -> str:
    """Extract human-readable CPU model string."""
    try:
        if os.path.exists("/proc/cpuinfo"):
            with open("/proc/cpuinfo", "r", encoding="utf-8") as f:
                for line in f:
                    if "model name" in line:
                        return line.split(":", 1)[1].strip()
    except Exception:
        pass
    proc = platform.processor()
    if proc:
        return proc
    return f"{platform.machine()} {platform.system()} CPU"


class HostService:
    def __init__(
        self,
        docker_gateway: Optional[DockerGateway] = None,
        settings: Optional[Settings] = None,
    ):
        self.settings: Settings = settings or get_settings()
        self._docker_gateway = docker_gateway
        self._last_disk_io: Optional[Any] = None
        self._last_disk_time: float = 0.0
        self._last_net_io: Dict[str, Any] = {}
        self._last_net_time: float = 0.0

    @property
    def docker_gateway(self) -> DockerGateway:
        if self._docker_gateway is None:
            from app.api.deps import get_docker_gateway
            self._docker_gateway = get_docker_gateway()
        return self._docker_gateway

    async def get_host_info(self) -> HostInfoResponse:
        uname = platform.uname()
        hostname = uname.node or platform.node()
        os_name = uname.system
        os_version = uname.version
        kernel_version = uname.release

        cpu_model = _get_cpu_model()
        physical_cores = psutil.cpu_count(logical=False) or 1
        logical_cores = psutil.cpu_count(logical=True) or physical_cores
        total_ram = psutil.virtual_memory().total

        docker_info = await self.docker_gateway.get_docker_info()
        docker_ver = docker_info.get("version", "unknown")
        storage_driver = docker_info.get("storage_driver", "unknown")

        return HostInfoResponse(
            hostname=hostname,
            os_name=os_name,
            os_version=os_version,
            kernel_version=kernel_version,
            cpu_model=cpu_model,
            cpu_cores_physical=physical_cores,
            cpu_cores_logical=logical_cores,
            total_memory_bytes=total_ram,
            docker_version=docker_ver,
            docker_storage_driver=storage_driver,
        )

    def collect_live_metrics(self) -> HostLiveMetricsResponse:
        now_ts = datetime.now(timezone.utc).isoformat()
        current_time = time.time()

        # CPU
        cores_pct = psutil.cpu_percent(percpu=True)
        overall_cpu = float(psutil.cpu_percent())
        cpu_metrics = HostCpuMetrics(
            overall_percent=overall_cpu,
            cores_percent=[float(c) for c in cores_pct],
        )

        # Memory & Swap
        vmem = psutil.virtual_memory()
        swap = psutil.swap_memory()
        mem_metrics = HostMemoryMetrics(
            total_bytes=vmem.total,
            used_bytes=vmem.used,
            available_bytes=vmem.available,
            percent=float(vmem.percent),
            swap_total_bytes=swap.total,
            swap_used_bytes=swap.used,
            swap_percent=float(swap.percent),
        )

        # Mounts & Inodes
        mounts: List[HostMountMetrics] = []
        try:
            partitions = psutil.disk_partitions(all=False)
            seen_mounts = set()
            for p in partitions:
                if p.mountpoint in seen_mounts:
                    continue
                seen_mounts.add(p.mountpoint)
                try:
                    usage = psutil.disk_usage(p.mountpoint)
                    inodes_total = 0
                    inodes_used = 0
                    inodes_free = 0
                    inodes_pct = 0.0
                    if hasattr(os, "statvfs"):
                        try:
                            st = os.statvfs(p.mountpoint)
                            inodes_total = int(st.f_files)
                            inodes_free = int(st.f_ffree)
                            inodes_used = max(0, inodes_total - inodes_free)
                            if inodes_total > 0:
                                inodes_pct = round((inodes_used / inodes_total) * 100.0, 1)
                        except Exception:
                            pass

                    mounts.append(
                        HostMountMetrics(
                            mountpoint=p.mountpoint,
                            device=p.device,
                            fstype=p.fstype,
                            total_bytes=usage.total,
                            used_bytes=usage.used,
                            free_bytes=usage.free,
                            percent=float(usage.percent),
                            inodes_total=inodes_total,
                            inodes_used=inodes_used,
                            inodes_free=inodes_free,
                            inodes_percent=inodes_pct,
                        )
                    )
                except (PermissionError, FileNotFoundError, OSError):
                    continue
        except Exception as e:
            logger.warning("Error reading disk partitions: %s", e)

        # Disk I/O Rate
        disk_io = HostDiskIoMetrics(
            read_bytes_sec=0.0,
            write_bytes_sec=0.0,
            read_count_sec=0.0,
            write_count_sec=0.0,
        )
        try:
            raw_disk = psutil.disk_io_counters()
            if raw_disk:
                if self._last_disk_io and self._last_disk_time > 0:
                    dt = max(0.1, current_time - self._last_disk_time)
                    disk_io = HostDiskIoMetrics(
                        read_bytes_sec=round(max(0, raw_disk.read_bytes - self._last_disk_io.read_bytes) / dt, 1),
                        write_bytes_sec=round(max(0, raw_disk.write_bytes - self._last_disk_io.write_bytes) / dt, 1),
                        read_count_sec=round(max(0, raw_disk.read_count - self._last_disk_io.read_count) / dt, 1),
                        write_count_sec=round(max(0, raw_disk.write_count - self._last_disk_io.write_count) / dt, 1),
                    )
                self._last_disk_io = raw_disk
                self._last_disk_time = current_time
        except Exception as e:
            logger.warning("Error calculating disk I/O: %s", e)

        # Network Rate per interface
        net_list: List[HostNetworkMetrics] = []
        try:
            raw_net = psutil.net_io_counters(pernic=True)
            dt_net = max(0.1, current_time - self._last_net_time) if self._last_net_time > 0 else 1.0
            for nic, stat in raw_net.items():
                if nic.startswith("lo"):
                    continue
                rx_rate = 0.0
                tx_rate = 0.0
                rx_p_rate = 0.0
                tx_p_rate = 0.0
                if nic in self._last_net_io:
                    prev = self._last_net_io[nic]
                    rx_rate = round(max(0, stat.bytes_recv - prev.bytes_recv) / dt_net, 1)
                    tx_rate = round(max(0, stat.bytes_sent - prev.bytes_sent) / dt_net, 1)
                    rx_p_rate = round(max(0, stat.packets_recv - prev.packets_recv) / dt_net, 1)
                    tx_p_rate = round(max(0, stat.packets_sent - prev.packets_sent) / dt_net, 1)
                net_list.append(
                    HostNetworkMetrics(
                        interface_name=nic,
                        rx_bytes_sec=rx_rate,
                        tx_bytes_sec=tx_rate,
                        rx_packets_sec=rx_p_rate,
                        tx_packets_sec=tx_p_rate,
                        rx_errors=getattr(stat, "errin", 0),
                        tx_errors=getattr(stat, "errout", 0),
                    )
                )
            self._last_net_io = raw_net
            self._last_net_time = current_time
        except Exception as e:
            logger.warning("Error calculating network rates: %s", e)

        # Load average
        try:
            l1, l5, l15 = psutil.getloadavg()
        except Exception:
            l1, l5, l15 = 0.0, 0.0, 0.0

        # Temperatures
        temps: List[HostTemperatureItem] = []
        try:
            if hasattr(psutil, "sensors_temperatures"):
                sensors = psutil.sensors_temperatures()
                if sensors:
                    for s_name, entries in sensors.items():
                        for entry in entries:
                            temps.append(
                                HostTemperatureItem(
                                    sensor_name=s_name,
                                    label=entry.label or s_name,
                                    current_celsius=float(entry.current),
                                    high_celsius=float(entry.high) if entry.high is not None else None,
                                    critical_celsius=float(entry.critical) if entry.critical is not None else None,
                                )
                            )
        except Exception:
            pass

        # Top processes
        processes: List[HostProcessItem] = []
        try:
            limit = self.settings.host_top_processes_count
            proc_list = []
            for proc in psutil.process_iter(
                ["pid", "name", "username", "cpu_percent", "memory_percent", "memory_info", "status"]
            ):
                try:
                    info = proc.info
                    rss = info["memory_info"].rss if info.get("memory_info") else 0
                    proc_list.append(
                        HostProcessItem(
                            pid=info.get("pid") or 0,
                            name=info.get("name") or "unknown",
                            username=info.get("username") or "root",
                            cpu_percent=float(info.get("cpu_percent") or 0.0),
                            memory_percent=round(float(info.get("memory_percent") or 0.0), 1),
                            memory_rss_bytes=rss,
                            status=str(info.get("status") or "running"),
                        )
                    )
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            proc_list.sort(key=lambda p: (p.cpu_percent, p.memory_percent), reverse=True)
            processes = proc_list[:limit]
        except Exception as e:
            logger.warning("Error fetching top processes: %s", e)

        return HostLiveMetricsResponse(
            timestamp=now_ts,
            cpu=cpu_metrics,
            memory=mem_metrics,
            mounts=mounts,
            disk_io=disk_io,
            network=net_list,
            load_1m=round(l1, 2),
            load_5m=round(l5, 2),
            load_15m=round(l15, 2),
            temperatures=temps,
            top_processes=processes,
        )

    async def get_metrics_history(
        self,
        db: AsyncSession,
        range_str: str = "1h",
    ) -> HostHistoryResponse:
        now = datetime.now(timezone.utc)
        range_deltas = {
            "1h": timedelta(hours=1),
            "6h": timedelta(hours=6),
            "24h": timedelta(hours=24),
            "7d": timedelta(days=7),
        }
        delta = range_deltas.get(range_str, timedelta(hours=1))
        cutoff = now - delta

        stmt = (
            select(HostMetricRecord)
            .where(HostMetricRecord.timestamp >= cutoff)
            .order_by(HostMetricRecord.timestamp.asc())
        )
        result = await db.execute(stmt)
        records = result.scalars().all()

        max_points = 100
        points: List[HostMetricPoint] = []

        if len(records) > max_points:
            stride = len(records) / max_points
            sampled = [records[int(i * stride)] for i in range(max_points)]
            points = [
                HostMetricPoint(
                    timestamp=r.timestamp.isoformat(),
                    cpu_percent=round(r.cpu_percent, 1),
                    memory_bytes=r.memory_bytes,
                    swap_bytes=r.swap_bytes,
                    disk_read_bytes=r.disk_read_bytes,
                    disk_write_bytes=r.disk_write_bytes,
                    network_rx_bytes=r.network_rx_bytes,
                    network_tx_bytes=r.network_tx_bytes,
                    load_1m=round(r.load_1m, 2),
                )
                for r in sampled
            ]
        elif records:
            points = [
                HostMetricPoint(
                    timestamp=r.timestamp.isoformat(),
                    cpu_percent=round(r.cpu_percent, 1),
                    memory_bytes=r.memory_bytes,
                    swap_bytes=r.swap_bytes,
                    disk_read_bytes=r.disk_read_bytes,
                    disk_write_bytes=r.disk_write_bytes,
                    network_rx_bytes=r.network_rx_bytes,
                    network_tx_bytes=r.network_tx_bytes,
                    load_1m=round(r.load_1m, 2),
                )
                for r in records
            ]
        else:
            # Fallback: Synthesize smooth baseline if no DB records yet
            curr = self.collect_live_metrics()
            num_baseline = 12
            step = delta / num_baseline
            for i in range(num_baseline):
                t = cutoff + (i + 1) * step
                points.append(
                    HostMetricPoint(
                        timestamp=t.isoformat(),
                        cpu_percent=curr.cpu.overall_percent,
                        memory_bytes=curr.memory.used_bytes,
                        swap_bytes=curr.memory.swap_used_bytes,
                        disk_read_bytes=int(curr.disk_io.read_bytes_sec),
                        disk_write_bytes=int(curr.disk_io.write_bytes_sec),
                        network_rx_bytes=int(sum(n.rx_bytes_sec for n in curr.network)),
                        network_tx_bytes=int(sum(n.tx_bytes_sec for n in curr.network)),
                        load_1m=curr.load_1m,
                    )
                )

        return HostHistoryResponse(range=range_str, points=points)

    async def get_docker_disk_usage(self) -> DockerDiskUsageResponse:
        data = await self.docker_gateway.get_docker_disk_usage()
        return DockerDiskUsageResponse(
            images=DockerDiskCategory(**data.get("images", {})),
            containers=DockerDiskCategory(**data.get("containers", {})),
            volumes=DockerDiskCategory(**data.get("volumes", {})),
            build_cache=DockerDiskCategory(**data.get("build_cache", {})),
        )
