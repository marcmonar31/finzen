"""add_preferencias_to_usuarios

Revision ID: c255ecf22329
Revises: d16ba0c142cc
Create Date: 2026-05-11 23:18:25.519515

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c255ecf22329'
down_revision: Union[str, Sequence[str], None] = 'd16ba0c142cc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('usuarios', sa.Column('tema',              sa.String(length=10),  nullable=True))
    op.add_column('usuarios', sa.Column('idioma',            sa.String(length=5),   nullable=True))
    op.add_column('usuarios', sa.Column('formato_fecha',     sa.String(length=20),  nullable=True))
    op.add_column('usuarios', sa.Column('primer_dia_mes',    sa.Integer(),          nullable=True))
    op.add_column('usuarios', sa.Column('primer_dia_semana', sa.String(length=10),  nullable=True))
    op.execute("UPDATE usuarios SET tema='sistema', idioma='es', formato_fecha='DD/MM/YYYY', primer_dia_mes=1, primer_dia_semana='lunes' WHERE tema IS NULL")


def downgrade() -> None:
    op.drop_column('usuarios', 'primer_dia_semana')
    op.drop_column('usuarios', 'primer_dia_mes')
    op.drop_column('usuarios', 'formato_fecha')
    op.drop_column('usuarios', 'idioma')
    op.drop_column('usuarios', 'tema')
