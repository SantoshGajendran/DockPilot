from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class ContainerPortMapping(BaseModel):
    host_ip: Optional[str] = None
    host_port: Optional[str] = None
    container_port: Optional[str] = None
    protocol: Optional[str] = "tcp"

class ContainerSummary(BaseModel):
    id: str
    name: str
    image: str
    state: str
    status: str
    health: str = "none"
    restart_count: int = 0
    created: str = ""
    ports: Dict[str, Any] = Field(default_factory=dict)
    labels: Dict[str, str] = Field(default_factory=dict)
    compose_project: Optional[str] = None

class ContainerLiveMetrics(BaseModel):
    container_id: str
    name: str
    cpu_percent: float = 0.0
    memory_bytes: int = 0
    memory_limit: int = 0
    memory_percent: float = 0.0
    state: str = "unknown"
    health: str = "none"

class ContainersListResponse(BaseModel):
    items: List[ContainerSummary]
    total: int
    page: int
    page_size: int
    total_pages: int

class BulkActionRequest(BaseModel):
    action: str
    container_ids: List[str]

class BulkActionResultItem(BaseModel):
    container_id: str
    action: str
    success: bool
    message: Optional[str] = None

class BulkActionResponse(BaseModel):
    results: List[BulkActionResultItem]
    total_success: int
    total_failed: int

class DeleteTokenResponse(BaseModel):
    token: str
    container_id: str
    expires_at: str
