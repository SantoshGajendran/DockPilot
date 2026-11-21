from typing import List, Optional
from pydantic import BaseModel, Field


class ComposeServiceItem(BaseModel):
    service_name: str
    container_id: str
    container_name: str
    state: str
    status: str
    health: str
    image: str


class ComposeAuditSummary(BaseModel):
    action: str
    status: str
    timestamp: str
    username: Optional[str] = None


class ComposeProjectResponse(BaseModel):
    name: str
    status: str
    containers_count: int
    running_count: int
    config_files: List[str] = Field(default_factory=list)
    working_dir: Optional[str] = None
    services: List[ComposeServiceItem] = Field(default_factory=list)
    last_action: Optional[ComposeAuditSummary] = None


class ComposeProjectsListResponse(BaseModel):
    projects: List[ComposeProjectResponse]
    total: int


class ComposeActionResponse(BaseModel):
    job_id: str
    project_name: str
    action: str
    status: str
