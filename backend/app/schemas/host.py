from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class HostInfoResponse(BaseModel):
    hostname: str
    os_name: str
    os_version: str
    kernel_version: str
    cpu_model: str
    cpu_cores_physical: int
    cpu_cores_logical: int
    total_memory_bytes: int
    docker_version: str
    docker_storage_driver: str


class HostCpuMetrics(BaseModel):
    overall_percent: float
    cores_percent: List[float]


class HostMemoryMetrics(BaseModel):
    total_bytes: int
    used_bytes: int
    available_bytes: int
    percent: float
    swap_total_bytes: int
    swap_used_bytes: int
    swap_percent: float


class HostMountMetrics(BaseModel):
    mountpoint: str
    device: str
    fstype: str
    total_bytes: int
    used_bytes: int
    free_bytes: int
    percent: float
    inodes_total: int
    inodes_used: int
    inodes_free: int
    inodes_percent: float


class HostDiskIoMetrics(BaseModel):
    read_bytes_sec: float
    write_bytes_sec: float
    read_count_sec: float
    write_count_sec: float


class HostNetworkMetrics(BaseModel):
    interface_name: str
    rx_bytes_sec: float
    tx_bytes_sec: float
    rx_packets_sec: float
    tx_packets_sec: float
    rx_errors: int
    tx_errors: int


class HostTemperatureItem(BaseModel):
    sensor_name: str
    label: str
    current_celsius: float
    high_celsius: Optional[float] = None
    critical_celsius: Optional[float] = None


class HostProcessItem(BaseModel):
    pid: int
    name: str
    username: str
    cpu_percent: float
    memory_percent: float
    memory_rss_bytes: int
    status: str


class HostLiveMetricsResponse(BaseModel):
    timestamp: str
    cpu: HostCpuMetrics
    memory: HostMemoryMetrics
    mounts: List[HostMountMetrics]
    disk_io: HostDiskIoMetrics
    network: List[HostNetworkMetrics]
    load_1m: float
    load_5m: float
    load_15m: float
    temperatures: List[HostTemperatureItem]
    top_processes: List[HostProcessItem]


class HostMetricPoint(BaseModel):
    timestamp: str
    cpu_percent: float
    memory_bytes: int
    swap_bytes: int
    disk_read_bytes: int
    disk_write_bytes: int
    network_rx_bytes: int
    network_tx_bytes: int
    load_1m: float


class HostHistoryResponse(BaseModel):
    range: str
    points: List[HostMetricPoint]


class DockerDiskCategory(BaseModel):
    count: int
    total_bytes: int
    reclaimable_bytes: int
    reclaimable_percent: float


class DockerDiskUsageResponse(BaseModel):
    images: DockerDiskCategory
    containers: DockerDiskCategory
    volumes: DockerDiskCategory
    build_cache: DockerDiskCategory
