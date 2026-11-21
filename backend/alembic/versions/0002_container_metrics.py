"""add container_metrics table

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-21 16:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "container_metrics",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("container_id", sa.String(length=64), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cpu_percent", sa.Float(), nullable=False),
        sa.Column("memory_bytes", sa.BigInteger(), nullable=False),
        sa.Column("memory_limit", sa.BigInteger(), nullable=False),
        sa.Column("network_rx_bytes", sa.BigInteger(), nullable=False),
        sa.Column("network_tx_bytes", sa.BigInteger(), nullable=False),
        sa.Column("block_read_bytes", sa.BigInteger(), nullable=False),
        sa.Column("block_write_bytes", sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_container_metrics_container_id"),
        "container_metrics",
        ["container_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_container_metrics_timestamp"),
        "container_metrics",
        ["timestamp"],
        unique=False,
    )
    op.create_index(
        "ix_container_metrics_cid_time",
        "container_metrics",
        ["container_id", "timestamp"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_container_metrics_cid_time", table_name="container_metrics")
    op.drop_index(op.f("ix_container_metrics_timestamp"), table_name="container_metrics")
    op.drop_index(op.f("ix_container_metrics_container_id"), table_name="container_metrics")
    op.drop_table("container_metrics")
