"""add 2fa totp to users

Revision ID: b2f90a8e1c34
Revises: 08b741f0786f
Create Date: 2026-07-30 15:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2f90a8e1c34'
down_revision: Union[str, Sequence[str], None] = 'f3b8c2d1e9f0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('users')]
    if 'totp_secret' not in columns:
        op.add_column('users', sa.Column('totp_secret', sa.String(length=64), nullable=True))
    if 'totp_enabled' not in columns:
        op.add_column('users', sa.Column('totp_enabled', sa.Boolean(), server_default=sa.text('false'), nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'totp_enabled')
    op.drop_column('users', 'totp_secret')
