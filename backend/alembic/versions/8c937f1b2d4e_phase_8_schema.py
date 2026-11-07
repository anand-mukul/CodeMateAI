"""Phase 8 schema: Analytics, Admin RBAC, Feedback, Feature Requests, Support Tickets, Feature Flags

Revision ID: 8c937f1b2d4e
Revises: 6a415dfe30f5
Create Date: 2026-11-06 16:38:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '8c937f1b2d4e'
down_revision: Union[str, Sequence[str], None] = '6a415dfe30f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add role to users
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('role', sa.String(length=30), server_default='user', nullable=False))

    # 2. Analytics Tables
    op.create_table(
        'analytics_events',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('event_name', sa.String(length=100), nullable=False, index=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('session_id', sa.String(length=36), nullable=True),
        sa.Column('feature_name', sa.String(length=100), nullable=True, index=True),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('success', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('failure_category', sa.String(length=50), nullable=True),
        sa.Column('token_usage', sa.Integer(), nullable=True),
        sa.Column('model_identifier', sa.String(length=100), nullable=True),
        sa.Column('plan_identifier', sa.String(length=50), nullable=True),
        sa.Column('application_version', sa.String(length=30), nullable=True),
        sa.Column('request_id', sa.String(length=100), nullable=True, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, index=True),
    )

    op.create_table(
        'analytics_daily_aggregates',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('date', sa.String(length=10), nullable=False, index=True),
        sa.Column('event_name', sa.String(length=100), nullable=False, index=True),
        sa.Column('feature_name', sa.String(length=100), nullable=True, index=True),
        sa.Column('total_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('success_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('failure_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('total_duration_ms', sa.Integer(), server_default='0', nullable=False),
        sa.Column('total_tokens', sa.Integer(), server_default='0', nullable=False),
        sa.UniqueConstraint('date', 'event_name', 'feature_name', name='uq_analytics_daily_agg'),
    )

    op.create_table(
        'analytics_preferences',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False, index=True),
        sa.Column('opt_out', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 3. Admin Audit Log Table
    op.create_table(
        'admin_audit_logs',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('admin_user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('target_user_id', sa.String(length=36), nullable=True, index=True),
        sa.Column('action', sa.String(length=100), nullable=False, index=True),
        sa.Column('resource_type', sa.String(length=50), nullable=False, index=True),
        sa.Column('resource_id', sa.String(length=100), nullable=True),
        sa.Column('details_json', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, index=True),
    )

    # 4. User Feedback Table
    op.create_table(
        'user_feedback',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('satisfaction_score', sa.Integer(), nullable=True),
        sa.Column('attachment_path', sa.String(length=500), nullable=True),
        sa.Column('status', sa.String(length=30), server_default='new', nullable=False),
        sa.Column('admin_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 5. Feature Requests & Votes
    op.create_table(
        'feature_requests',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=30), server_default='NEW', nullable=False, index=True),
        sa.Column('vote_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('admin_notes', sa.Text(), nullable=True),
        sa.Column('merged_into_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        'feature_request_votes',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('feature_request_id', sa.String(length=36), sa.ForeignKey('feature_requests.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('feature_request_id', 'user_id', name='uq_feature_request_user_vote'),
    )

    op.create_table(
        'feature_request_comments',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('feature_request_id', sa.String(length=36), sa.ForeignKey('feature_requests.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('comment_text', sa.Text(), nullable=False),
        sa.Column('is_official_response', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 6. Customer Support Tickets, Messages, Attachments
    op.create_table(
        'support_tickets',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('assigned_agent_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('subject', sa.String(length=200), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('priority', sa.String(length=20), server_default='NORMAL', nullable=False),
        sa.Column('status', sa.String(length=30), server_default='OPEN', nullable=False, index=True),
        sa.Column('last_reply_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        'support_messages',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('ticket_id', sa.String(length=36), sa.ForeignKey('support_tickets.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('sender_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('sender_role', sa.String(length=30), nullable=False),
        sa.Column('message_text', sa.Text(), nullable=False),
        sa.Column('attachment_path', sa.String(length=500), nullable=True),
        sa.Column('is_internal_note', sa.Boolean(), server_default='0', nullable=False, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        'support_attachments',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('ticket_id', sa.String(length=36), sa.ForeignKey('support_tickets.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('file_size_bytes', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('uploaded_by_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # 7. Feature Flags & Changes
    op.create_table(
        'feature_flags',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('key', sa.String(length=100), unique=True, nullable=False, index=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('is_enabled', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('target_audience', sa.String(length=50), server_default='all', nullable=False),
        sa.Column('minimum_plan', sa.String(length=32), nullable=True),
        sa.Column('rollout_percentage', sa.Integer(), server_default='100', nullable=False),
        sa.Column('created_by_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        'feature_flag_changes',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('flag_id', sa.String(length=36), sa.ForeignKey('feature_flags.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('admin_user_id', sa.String(length=36), nullable=True),
        sa.Column('previous_state_json', sa.Text(), nullable=False),
        sa.Column('new_state_json', sa.Text(), nullable=False),
        sa.Column('reason', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('feature_flag_changes')
    op.drop_table('feature_flags')
    op.drop_table('support_attachments')
    op.drop_table('support_messages')
    op.drop_table('support_tickets')
    op.drop_table('feature_request_comments')
    op.drop_table('feature_request_votes')
    op.drop_table('feature_requests')
    op.drop_table('user_feedback')
    op.drop_table('admin_audit_logs')
    op.drop_table('analytics_preferences')
    op.drop_table('analytics_daily_aggregates')
    op.drop_table('analytics_events')
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('role')

