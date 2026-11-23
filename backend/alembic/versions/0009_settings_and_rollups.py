"""add system_settings and metric_rollups tables

Revision ID: 0009
Revises: 0008
Create Date: 2026-11-23 11:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "system_settings",
        sa.Column("key", sa.String(64), primary_key=True, nullable=False),
        sa.Column("value", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_by", sa.String(64), nullable=True),
    )

    op.create_table(
        "metric_rollups",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("container_id", sa.String(64), nullable=False),
        sa.Column("bucket_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cpu_percent_avg", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("cpu_percent_max", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("memory_bytes_avg", sa.BigInteger(), server_default="0", nullable=False),
        sa.Column("memory_bytes_max", sa.BigInteger(), server_default="0", nullable=False),
        sa.Column("sample_count", sa.Integer(), server_default="1", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_metric_rollups_container_id", "metric_rollups", ["container_id"])
    op.create_index("ix_metric_rollups_bucket_time", "metric_rollups", ["bucket_time"])
    op.create_index("ix_metric_rollups_cid_bucket", "metric_rollups", ["container_id", "bucket_time"])


def downgrade() -> None:
    op.drop_index("ix_metric_rollups_cid_bucket", table_name="metric_rollups")
    op.drop_index("ix_metric_rollups_bucket_time", table_name="metric_rollups")
    op.drop_index("ix_metric_rollups_container_id", table_name="metric_rollups")
    op.drop_table("metric_rollups")
    op.drop_table("system_settings")
