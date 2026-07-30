"""add_inventory_assets_tables

Revision ID: b7e9f1a2c3d4
Revises: a8d0d907649b
Create Date: 2026-07-31 01:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b7e9f1a2c3d4'
down_revision: Union[str, Sequence[str], None] = 'a8d0d907649b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. asset_categories table
    op.create_table(
        'asset_categories',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_asset_categories_tenant_id'), 'asset_categories', ['tenant_id'], unique=False)

    # 2. assets table
    op.create_table(
        'assets',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('category_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('festival_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('asset_code', sa.String(length=50), nullable=False),
        sa.Column('quantity_total', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('quantity_available', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('unit', sa.String(length=30), nullable=False, server_default="'Pcs'"),
        sa.Column('condition', sa.String(length=20), nullable=False, server_default="'good'"),
        sa.Column('storage_location', sa.String(length=200), nullable=True),
        sa.Column('estimated_value', sa.Numeric(precision=15, scale=2), server_default='0.00'),
        sa.Column('purchase_date', sa.Date(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['category_id'], ['asset_categories.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['festival_id'], ['festivals.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_assets_tenant_id'), 'assets', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_assets_category_id'), 'assets', ['category_id'], unique=False)
    op.create_index(op.f('ix_assets_festival_id'), 'assets', ['festival_id'], unique=False)
    op.create_index(op.f('ix_assets_asset_code'), 'assets', ['asset_code'], unique=False)

    # 3. asset_checkouts table
    op.create_table(
        'asset_checkouts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('asset_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('action_type', sa.String(length=30), nullable=False, server_default="'checkout'"),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('issued_to_person', sa.String(length=200), nullable=False),
        sa.Column('issued_by_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('issued_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expected_return_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('returned_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('returned_condition', sa.String(length=20), nullable=True),
        sa.Column('damage_notes', sa.Text(), nullable=True),
        sa.Column('damage_charge', sa.Numeric(precision=15, scale=2), server_default='0.00'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default="'issued'"),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['asset_id'], ['assets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['issued_by_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_asset_checkouts_tenant_id'), 'asset_checkouts', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_asset_checkouts_asset_id'), 'asset_checkouts', ['asset_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_asset_checkouts_asset_id'), table_name='asset_checkouts')
    op.drop_index(op.f('ix_asset_checkouts_tenant_id'), table_name='asset_checkouts')
    op.drop_table('asset_checkouts')

    op.drop_index(op.f('ix_assets_asset_code'), table_name='assets')
    op.drop_index(op.f('ix_assets_festival_id'), table_name='assets')
    op.drop_index(op.f('ix_assets_category_id'), table_name='assets')
    op.drop_index(op.f('ix_assets_tenant_id'), table_name='assets')
    op.drop_table('assets')

    op.drop_index(op.f('ix_asset_categories_tenant_id'), table_name='asset_categories')
    op.drop_table('asset_categories')
