from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import Boolean, DateTime, Index, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ContainerEventRecord(Base):
    __tablename__ = "container_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
    action: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    container_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    container_name: Mapped[str] = mapped_column(String(128), default="", nullable=False, index=True)
    image: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    exit_code: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_oom: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    is_unexpected_exit: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    is_restart_loop: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    attributes: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_container_events_cid_time", "container_id", "timestamp"),
        Index("ix_container_events_action_time", "action", "timestamp"),
    )
