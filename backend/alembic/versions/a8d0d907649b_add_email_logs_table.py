"""add_email_logs_table

Revision ID: a8d0d907649b
Revises: b2f90a8e1c34
Create Date: 2026-07-30 23:36:25.166877

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a8d0d907649b'
down_revision: Union[str, Sequence[str], None] = 'b2f90a8e1c34'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create email_logs table if not exists
    op.create_table(
        'email_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('tenant_id', sa.UUID(), nullable=True),
        sa.Column('recipient', sa.String(length=255), nullable=False),
        sa.Column('subject', sa.String(length=500), nullable=False),
        sa.Column('email_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_email_logs_tenant_id'), 'email_logs', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_email_logs_recipient'), 'email_logs', ['recipient'], unique=False)
    op.create_index(op.f('ix_email_logs_email_type'), 'email_logs', ['email_type'], unique=False)
    op.create_index(op.f('ix_email_logs_status'), 'email_logs', ['status'], unique=False)
    op.create_index(op.f('ix_email_logs_sent_at'), 'email_logs', ['sent_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_email_logs_sent_at'), table_name='email_logs')
    op.drop_index(op.f('ix_email_logs_status'), table_name='email_logs')
    op.drop_index(op.f('ix_email_logs_email_type'), table_name='email_logs')
    op.drop_index(op.f('ix_email_logs_recipient'), table_name='email_logs')
    op.drop_index(op.f('ix_email_logs_tenant_id'), table_name='email_logs')
    op.drop_table('email_logs')
