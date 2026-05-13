"""add_ocultar_importes_to_usuarios

Revision ID: d16ba0c142cc
Revises: f9eb287699e5
Create Date: 2026-05-11 23:09:29.104734

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd16ba0c142cc'
down_revision: Union[str, Sequence[str], None] = 'f9eb287699e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('usuarios', sa.Column('ocultar_importes', sa.Boolean(), nullable=True))
    op.execute("UPDATE usuarios SET ocultar_importes = 0 WHERE ocultar_importes IS NULL")


def downgrade() -> None:
    op.drop_column('usuarios', 'ocultar_importes')
