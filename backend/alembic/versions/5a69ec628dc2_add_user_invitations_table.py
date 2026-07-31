"""add_user_invitations_table

Revision ID: 5a69ec628dc2
Revises: b7e9f1a2c3d4
Create Date: 2026-07-31 20:38:07.405058

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '5a69ec628dc2'
down_revision: Union[str, Sequence[str], None] = 'b7e9f1a2c3d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema cleanly and idempotently for production."""
    # 1. Create user_invitations table safely
    op.execute("""
        CREATE TABLE IF NOT EXISTS user_invitations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            email VARCHAR(255) NOT NULL,
            phone VARCHAR(20),
            full_name VARCHAR(200),
            role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
            role_name VARCHAR(100) NOT NULL DEFAULT 'collector',
            token VARCHAR(100) NOT NULL UNIQUE,
            invited_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            expires_at TIMESTAMPTZ NOT NULL,
            accepted_at TIMESTAMPTZ,
            custom_note TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)

    # Create indices if they don't already exist
    op.execute("CREATE INDEX IF NOT EXISTS idx_user_invitations_tenant_id ON user_invitations(tenant_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(token);")

    # 2. Create event_invitations table safely (Digital Patrika & RSVPs)
    op.execute("""
        CREATE TABLE IF NOT EXISTS event_invitations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            festival_id UUID REFERENCES festivals(id) ON DELETE CASCADE,
            guest_name VARCHAR(200) NOT NULL,
            guest_email VARCHAR(255),
            guest_phone VARCHAR(20),
            vip_tier VARCHAR(100),
            token VARCHAR(100) NOT NULL UNIQUE,
            rsvp_status VARCHAR(50) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)

    op.execute("CREATE INDEX IF NOT EXISTS idx_event_invitations_tenant_id ON event_invitations(tenant_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_event_invitations_token ON event_invitations(token);")

    # 3. Create optional performance indices IF NOT EXISTS
    op.execute("CREATE INDEX IF NOT EXISTS idx_expenses_tenant_status ON expenses(tenant_id, status);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_receipts_tenant_date ON receipts(tenant_id, receipt_date);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_receipts_tenant_status ON receipts(tenant_id, status);")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TABLE IF EXISTS event_invitations CASCADE;")
    op.execute("DROP TABLE IF EXISTS user_invitations CASCADE;")
    op.execute("DROP INDEX IF EXISTS idx_expenses_tenant_status;")
    op.execute("DROP INDEX IF EXISTS idx_receipts_tenant_date;")
    op.execute("DROP INDEX IF EXISTS idx_receipts_tenant_status;")

