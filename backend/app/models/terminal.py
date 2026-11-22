from datetime import datetime, timezone
from typing import Optional
import uuid
from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class TerminalSession(Base):
    __tablename__ = "terminal_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    container_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    container_name: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    username: Mapped[str] = mapped_column(String(64), nullable=False)
    shell: Mapped[str] = mapped_column(String(64), default="/bin/sh", nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    transcript: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bytes_sent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    bytes_received: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
