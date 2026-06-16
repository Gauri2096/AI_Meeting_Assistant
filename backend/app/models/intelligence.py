import uuid

from sqlalchemy import Column, DateTime, Float, ForeignKey, JSON, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class MeetingIntelligence(Base):
    __tablename__ = "meeting_intelligence"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    meeting_id = Column(
        UUID(as_uuid=True),
        ForeignKey("meetings.id"),
        unique=True,
        nullable=False,
    )

    summary = Column(Text, nullable=False)

    decisions = Column(JSON, nullable=False, default=list)

    topics_discussed = Column(JSON, nullable=False, default=list)

    risks_and_concerns = Column(JSON, nullable=False, default=list)

    notable_quotes = Column(JSON, nullable=False, default=list)

    action_items = Column(JSON, nullable=False, default=list)

    confidence = Column(Float, nullable=False, default=0.0)

    ai_model_used = Column(String(100), nullable=False)

    agent_run_log = Column(JSON, nullable=False, default=list)

    approved_by = Column(String(255), nullable=True)

    approved_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )