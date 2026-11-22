"""add alert_rules, alert_events, and alert_silences tables

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-22 22:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. alert_rules table
    op.create_table(
        "alert_rules",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("description", sa.String(256), nullable=True),
        sa.Column("rule_type", sa.String(64), nullable=False),
        sa.Column("scope_type", sa.String(32), nullable=False, server_default="all"),
        sa.Column("scope_value", sa.String(128), nullable=True),
        sa.Column("severity", sa.String(32), nullable=False, server_default="warning"),
        sa.Column("threshold", sa.Float(), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cooldown_minutes", sa.Integer(), nullable=False, server_default="15"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(op.f("ix_alert_rules_name"), "alert_rules", ["name"], unique=True)
    op.create_index(op.f("ix_alert_rules_rule_type"), "alert_rules", ["rule_type"], unique=False)
    op.create_index(op.f("ix_alert_rules_enabled"), "alert_rules", ["enabled"], unique=False)

    # 2. alert_events table
    op.create_table(
        "alert_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("rule_id", sa.Integer(), sa.ForeignKey("alert_rules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rule_name", sa.String(128), nullable=False),
        sa.Column("rule_type", sa.String(64), nullable=False),
        sa.Column("severity", sa.String(32), nullable=False),
        sa.Column("target_type", sa.String(32), nullable=False, server_default="container"),
        sa.Column("target_id", sa.String(64), nullable=True),
        sa.Column("target_name", sa.String(128), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="firing"),
        sa.Column("message", sa.String(512), nullable=False),
        sa.Column("value", sa.Float(), nullable=True),
        sa.Column("threshold", sa.Float(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("acknowledged_by", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(op.f("ix_alert_events_rule_id"), "alert_events", ["rule_id"], unique=False)
    op.create_index(op.f("ix_alert_events_rule_type"), "alert_events", ["rule_type"], unique=False)
    op.create_index(op.f("ix_alert_events_target_id"), "alert_events", ["target_id"], unique=False)
    op.create_index(op.f("ix_alert_events_status"), "alert_events", ["status"], unique=False)
    op.create_index(op.f("ix_alert_events_started_at"), "alert_events", ["started_at"], unique=False)
    op.create_index("ix_alert_events_rule_target_status", "alert_events", ["rule_id", "target_id", "status"], unique=False)

    # 3. alert_silences table
    op.create_table(
        "alert_silences",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("rule_id", sa.Integer(), sa.ForeignKey("alert_rules.id", ondelete="CASCADE"), nullable=True),
        sa.Column("container_id", sa.String(64), nullable=True),
        sa.Column("silenced_until", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reason", sa.String(256), nullable=True),
        sa.Column("created_by", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(op.f("ix_alert_silences_rule_id"), "alert_silences", ["rule_id"], unique=False)
    op.create_index(op.f("ix_alert_silences_container_id"), "alert_silences", ["container_id"], unique=False)
    op.create_index(op.f("ix_alert_silences_silenced_until"), "alert_silences", ["silenced_until"], unique=False)


def downgrade() -> None:
    op.drop_table("alert_silences")
    op.drop_table("alert_events")
    op.drop_table("alert_rules")
