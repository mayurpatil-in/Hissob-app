"""add ai provider to tenants

Revision ID: f3b8c2d1e9f0
Revises: e2a9b3c4d5e6
Create Date: 2026-07-30 02:12:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3b8c2d1e9f0'
down_revision: Union[str, Sequence[str], None] = 'e2a9b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('tenants')]
    if 'ai_provider' not in columns:
        op.add_column('tenants', sa.Column('ai_provider', sa.String(length=50), server_default=sa.text("'gemini'"), nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('tenants', 'ai_provider')

