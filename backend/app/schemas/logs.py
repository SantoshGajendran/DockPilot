from typing import List, Optional
from pydantic import BaseModel, Field


class LogEntry(BaseModel):
    container_id: str
    container_name: str = ""
    stream: str = "stdout"
    timestamp: Optional[str] = None
    message: str
    level: Optional[str] = None


class LogSearchResponse(BaseModel):
    lines: List[LogEntry] = Field(default_factory=list)
    total: int = 0
    bytes_scanned: int = 0
    capped: bool = False
