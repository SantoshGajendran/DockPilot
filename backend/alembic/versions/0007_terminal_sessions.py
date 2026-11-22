"""add terminal_sessions table

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-23 00:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "terminal_sessions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("container_id", sa.String(64), nullable=False),
        sa.Column("container_name", sa.String(128), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("username", sa.String(64), nullable=False),
        sa.Column("shell", sa.String(64), server_default="/bin/sh", nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(32), server_default="active", nullable=False),
        sa.Column("transcript", sa.Text(), nullable=True),
        sa.Column("bytes_sent", sa.Integer(), server_default="0", nullable=False),
        sa.Column("bytes_received", sa.Integer(), server_default="0", nullable=False),
        sa.Column("ip_address", sa.String(45), nullable=True),
    )
    op.create_index("ix_terminal_sessions_container_id", "terminal_sessions", ["container_id"])
    op.create_index("ix_terminal_sessions_container_name", "terminal_sessions", ["container_name"])


def downgrade() -> None:
    op.drop_index("ix_terminal_sessions_container_name", table_name="terminal_sessions")
    op.drop_index("ix_terminal_sessions_container_id", table_name="terminal_sessions")
    op.drop_table("terminal_sessions")
