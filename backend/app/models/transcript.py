import uuid

from sqlalchemy import Column, DateTime, ForeignKey, JSON, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    meeting_id = Column(
        UUID(as_uuid=True),
        ForeignKey("meetings.id"),
        nullable=False,
    )

    raw_text = Column(Text, nullable=False)

    processed_text = Column(Text, nullable=True)

    speaker_map = Column(JSON, nullable=False, default=dict)

    speaker_metadata = Column(JSON, nullable=True)

    language = Column(String(10), nullable=False, default="en")

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )