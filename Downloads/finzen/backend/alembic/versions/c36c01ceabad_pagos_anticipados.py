"""pagos_anticipados

Revision ID: c36c01ceabad
Revises: c255ecf22329
Create Date: 2026-05-13 19:11:03.455096

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c36c01ceabad'
down_revision: Union[str, Sequence[str], None] = 'c255ecf22329'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'pagos_anticipados',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('deuda_id', sa.String(), nullable=False),
        sa.Column('fecha', sa.Date(), nullable=False),
        sa.Column('importe', sa.Numeric(18, 4), nullable=False),
        sa.Column('notas', sa.String(), nullable=True),
        sa.Column('creado_en', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['deuda_id'], ['deudas.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_pagos_anticipados_deuda_id', 'pagos_anticipados', ['deuda_id'])


def downgrade() -> None:
    op.drop_index('ix_pagos_anticipados_deuda_id', 'pagos_anticipados')
    op.drop_table('pagos_anticipados')
