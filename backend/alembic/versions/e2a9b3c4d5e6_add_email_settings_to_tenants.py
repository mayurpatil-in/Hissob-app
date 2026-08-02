"""add email settings to tenants

Revision ID: e2a9b3c4d5e6
Revises: 08b741f0786f
Create Date: 2026-07-29 23:42:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e2a9b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = '08b741f0786f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('tenants', sa.Column('enable_email_receipts', sa.Boolean(), server_default=sa.text('true'), nullable=False))
    op.add_column('tenants', sa.Column('enable_daily_digest', sa.Boolean(), server_default=sa.text('true'), nullable=False))
    op.add_column('tenants', sa.Column('enable_welcome_email', sa.Boolean(), server_default=sa.text('true'), nullable=False))
    op.add_column('tenants', sa.Column('digest_recipients', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('tenants', 'digest_recipients')
    op.drop_column('tenants', 'enable_welcome_email')
    op.drop_column('tenants', 'enable_daily_digest')
    op.drop_column('tenants', 'enable_email_receipts')
