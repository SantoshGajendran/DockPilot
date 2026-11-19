from datetime import datetime, timezone
from typing import List
from pydantic import BaseModel, Field

class HostMetrics(BaseModel):
    cpu_percent: float
    memory_percent: float
    memory_used_bytes: int
    memory_total_bytes: int
    disk_percent: float
    disk_used_bytes: int
    disk_total_bytes: int
    load_avg: List[float] = Field(default_factory=list)
    uptime_seconds: float = 0.0

class ContainerStateCounts(BaseModel):
    total: int = 0
    running: int = 0
    exited: int = 0
    restarting: int = 0
    unhealthy: int = 0
    paused: int = 0

class ContainerConsumerSummary(BaseModel):
    id: str
    name: str
    image: str
    cpu_percent: float = 0.0
    memory_bytes: int = 0
    memory_percent: float = 0.0
    status: str = ""

class DockerEventSummary(BaseModel):
    id: str
    action: str
    actor_type: str
    actor_name: str
    timestamp: datetime

class OverviewResponse(BaseModel):
    host: HostMetrics
    containers: ContainerStateCounts
    top_cpu: List[ContainerConsumerSummary] = Field(default_factory=list)
    top_memory: List[ContainerConsumerSummary] = Field(default_factory=list)
    recent_events: List[DockerEventSummary] = Field(default_factory=list)
    active_alerts_count: int = 0
    docker_connected: bool = True
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
