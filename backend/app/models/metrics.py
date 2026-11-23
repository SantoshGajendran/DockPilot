import uuid
from datetime import datetime, timezone
from sqlalchemy import BigInteger, DateTime, Float, Index, Integer, String
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


class HostMetricRecord(Base):
    __tablename__ = "host_metrics"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
    cpu_percent: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    memory_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    memory_total: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    swap_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    swap_total: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    disk_read_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    disk_write_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    network_rx_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    network_tx_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    load_1m: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)


class MetricRollupRecord(Base):
    __tablename__ = "metric_rollups"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    container_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    bucket_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    cpu_percent_avg: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    cpu_percent_max: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    memory_bytes_avg: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    memory_bytes_max: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    sample_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_metric_rollups_cid_bucket", "container_id", "bucket_time"),
    )


