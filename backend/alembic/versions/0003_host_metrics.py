"""add host_metrics table

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-21 18:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "host_metrics",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cpu_percent", sa.Float(), nullable=False),
        sa.Column("memory_bytes", sa.BigInteger(), nullable=False),
        sa.Column("memory_total", sa.BigInteger(), nullable=False),
        sa.Column("swap_bytes", sa.BigInteger(), nullable=False),
        sa.Column("swap_total", sa.BigInteger(), nullable=False),
        sa.Column("disk_read_bytes", sa.BigInteger(), nullable=False),
        sa.Column("disk_write_bytes", sa.BigInteger(), nullable=False),
        sa.Column("network_rx_bytes", sa.BigInteger(), nullable=False),
        sa.Column("network_tx_bytes", sa.BigInteger(), nullable=False),
        sa.Column("load_1m", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_host_metrics_timestamp"),
        "host_metrics",
        ["timestamp"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_host_metrics_timestamp"), table_name="host_metrics")
    op.drop_table("host_metrics")
