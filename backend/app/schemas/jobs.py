from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class JobResponse(BaseModel):
    id: str
    project_name: str
    action: str
    status: JobStatus
    exit_code: Optional[int] = None
    created_at: str
    finished_at: Optional[str] = None
    logs: List[str] = Field(default_factory=list)
    error: Optional[str] = None


class JobStreamEvent(BaseModel):
    job_id: str
    line: Optional[str] = None
    status: JobStatus
    exit_code: Optional[int] = None
