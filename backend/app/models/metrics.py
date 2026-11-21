import uuid
from datetime import datetime, timezone
from sqlalchemy import BigInteger, DateTime, Float, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ContainerMetricRecord(Base):
    __tablename__ = "container_metrics"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    container_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
    cpu_percent: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    memory_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    memory_limit: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    network_rx_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    network_tx_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    block_read_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    block_write_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)

    __table_args__ = (
        Index("ix_container_metrics_cid_time", "container_id", "timestamp"),
    )
