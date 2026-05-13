"""add_avatar_color_to_usuarios

Revision ID: f9eb287699e5
Revises: 98f66249bebe
Create Date: 2026-05-11 22:36:06.667966

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f9eb287699e5'
down_revision: Union[str, Sequence[str], None] = '98f66249bebe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('usuarios', sa.Column('avatar_color', sa.String(length=10), nullable=True))
    # Rellenar valor por defecto para filas existentes
    op.execute("UPDATE usuarios SET avatar_color = '#1A1A2E' WHERE avatar_color IS NULL")


def downgrade() -> None:
    op.drop_column('usuarios', 'avatar_color')
