"""Phase 8.1 schema: Promo codes, coupon redemptions, and payment discounts

Revision ID: f912384a56c0
Revises: 8c937f1b2d4e
Create Date: 2026-11-07 02:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'f912384a56c0'
down_revision: Union[str, Sequence[str], None] = '8c937f1b2d4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add coupon tracking columns to payments
    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.add_column(sa.Column('coupon_code', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('discount_amount', sa.Integer(), nullable=True))

    # 2. Create promo_codes table
    op.create_table(
        'promo_codes',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('code', sa.String(length=32), nullable=False, unique=True, index=True),
        sa.Column('description', sa.String(length=255), nullable=False),
        sa.Column('discount_percent', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_free', sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column('free_duration_days', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('target_plan_id', sa.String(length=32), sa.ForeignKey('plans.id'), nullable=True),
        sa.Column('max_redemptions', sa.Integer(), nullable=True),
        sa.Column('times_redeemed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=False, server_default=sa.text('1'), index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # 3. Create promo_redemptions table
    op.create_table(
        'promo_redemptions',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('promo_code_id', sa.String(length=36), sa.ForeignKey('promo_codes.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('redeemed_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('discount_applied_paise', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('final_price_paise', sa.Integer(), nullable=False, server_default='0'),
        sa.UniqueConstraint('promo_code_id', 'user_id', name='uq_promo_user_redemption'),
    )


def downgrade() -> None:
    op.drop_table('promo_redemptions')
    op.drop_table('promo_codes')
    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.drop_column('discount_amount')
        batch_op.drop_column('coupon_code')

