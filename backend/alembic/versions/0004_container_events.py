"""add container_events table

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-21 21:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "container_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("event_id", sa.String(128), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("action", sa.String(64), nullable=False),
        sa.Column("container_id", sa.String(64), nullable=False),
        sa.Column("container_name", sa.String(128), nullable=False),
        sa.Column("image", sa.String(256), nullable=True),
        sa.Column("exit_code", sa.Integer(), nullable=True),
        sa.Column("is_oom", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_unexpected_exit", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_restart_loop", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("attributes", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_container_events_event_id"), "container_events", ["event_id"], unique=True)
    op.create_index(op.f("ix_container_events_timestamp"), "container_events", ["timestamp"], unique=False)
    op.create_index(op.f("ix_container_events_action"), "container_events", ["action"], unique=False)
    op.create_index(op.f("ix_container_events_container_id"), "container_events", ["container_id"], unique=False)
    op.create_index(op.f("ix_container_events_container_name"), "container_events", ["container_name"], unique=False)
    op.create_index(op.f("ix_container_events_is_oom"), "container_events", ["is_oom"], unique=False)
    op.create_index(op.f("ix_container_events_is_unexpected_exit"), "container_events", ["is_unexpected_exit"], unique=False)
    op.create_index(op.f("ix_container_events_is_restart_loop"), "container_events", ["is_restart_loop"], unique=False)
    op.create_index("ix_container_events_cid_time", "container_events", ["container_id", "timestamp"], unique=False)
    op.create_index("ix_container_events_action_time", "container_events", ["action", "timestamp"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_container_events_action_time", table_name="container_events")
    op.drop_index("ix_container_events_cid_time", table_name="container_events")
    op.drop_index(op.f("ix_container_events_is_restart_loop"), table_name="container_events")
    op.drop_index(op.f("ix_container_events_is_unexpected_exit"), table_name="container_events")
    op.drop_index(op.f("ix_container_events_is_oom"), table_name="container_events")
    op.drop_index(op.f("ix_container_events_container_name"), table_name="container_events")
    op.drop_index(op.f("ix_container_events_container_id"), table_name="container_events")
    op.drop_index(op.f("ix_container_events_action"), table_name="container_events")
    op.drop_index(op.f("ix_container_events_timestamp"), table_name="container_events")
    op.drop_index(op.f("ix_container_events_event_id"), table_name="container_events")
    op.drop_table("container_events")
