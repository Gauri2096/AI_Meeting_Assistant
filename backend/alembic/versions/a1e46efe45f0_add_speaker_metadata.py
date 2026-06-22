"""add speaker metadata

Revision ID: a1e46efe45f0
Revises: 20472329a828
Create Date: 2026-06-22 12:05:51.378470

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1e46efe45f0'
down_revision: Union[str, Sequence[str], None] = '20472329a828'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "transcripts",
        sa.Column(
            "speaker_metadata",
            sa.JSON(),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column(
        "transcripts",
        "speaker_metadata",
    )
