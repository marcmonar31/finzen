"""make modos_viaje fecha_fin nullable

Revision ID: 49a88561fae7
Revises: c36c01ceabad
Create Date: 2026-05-13 23:12:19.396006

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '49a88561fae7'
down_revision: Union[str, Sequence[str], None] = 'c36c01ceabad'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass  # tabla creada por create_all con fecha_fin ya nullable en el modelo


def downgrade() -> None:
    pass
