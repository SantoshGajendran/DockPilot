from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class EnvVarItem(BaseModel):
    key: str
    value: str
    is_masked: bool = False


class MountItem(BaseModel):
    type: str = "volume"
    source: str = ""
    destination: str = ""
    mode: str = ""
    rw: bool = True


class NetworkItem(BaseModel):
    network_name: str = ""
    ip_address: str = ""
    gateway: str = ""
    mac_address: str = ""


class HealthcheckInfo(BaseModel):
    status: str = "none"
    failing_streak: int = 0
    log: List[Dict[str, Any]] = Field(default_factory=list)


class ContainerDetailResponse(BaseModel):
    id: str
    name: str
    image: str
    command: str = ""
    created: str = ""
    state: str = "unknown"
    status: str = ""
    health: str = "none"
    restart_count: int = 0
    restart_policy: Dict[str, Any] = Field(default_factory=dict)
    ports: Dict[str, Any] = Field(default_factory=dict)
    mounts: List[MountItem] = Field(default_factory=list)
    networks: List[NetworkItem] = Field(default_factory=list)
    labels: Dict[str, str] = Field(default_factory=dict)
    env: List[EnvVarItem] = Field(default_factory=list)
    limits: Dict[str, Any] = Field(default_factory=dict)
    healthcheck: Optional[HealthcheckInfo] = None


class ContainerLiveStats(BaseModel):
    container_id: str
    timestamp: str
    cpu_percent: float = 0.0
    memory_bytes: int = 0
    memory_limit: int = 0
    memory_percent: float = 0.0
    net_rx_bytes: int = 0
    net_tx_bytes: int = 0
    block_read_bytes: int = 0
    block_write_bytes: int = 0


class ContainerMetricsHistoryResponse(BaseModel):
    container_id: str
    range: str
    points: List[ContainerLiveStats] = Field(default_factory=list)


class EnvRevealResponse(BaseModel):
    env: List[EnvVarItem] = Field(default_factory=list)
