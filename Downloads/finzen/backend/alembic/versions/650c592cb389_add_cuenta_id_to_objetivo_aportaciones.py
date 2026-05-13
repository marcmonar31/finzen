"""add_cuenta_id_to_objetivo_aportaciones

Revision ID: 650c592cb389
Revises: 9fde6ebaad37
Create Date: 2026-05-10 23:57:16.727313

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '650c592cb389'
down_revision: Union[str, Sequence[str], None] = '9fde6ebaad37'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass  # tabla creada por create_all, columna ya incluida en el modelo


def downgrade() -> None:
    pass
