import uuid

from sqlalchemy import Column, DateTime, ForeignKey, JSON, String, func, Integer
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class ActionTakenReport(Base):
    __tablename__ = "action_taken_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    meeting_id = Column(
        UUID(as_uuid=True),
        ForeignKey("meetings.id"),
        nullable=False,
    )
    sender_name = Column(String(255), nullable=False)

    sender_email = Column( String(255), nullable=False)

    recipient_email = Column(String(255), nullable=False)

    recipient_name = Column(String(255), nullable=False)

    assigned_items = Column(JSON, nullable=False, default=list)

    targets = Column(JSON, nullable=False, default=list)

    status = Column(String(50), nullable=False, default="draft")

    sent_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    version = Column(Integer, nullable=False, default=1)