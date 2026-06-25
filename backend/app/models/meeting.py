import uuid

from sqlalchemy import Column, DateTime, Integer, JSON, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import ForeignKey
from app.core.database import Base


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    title = Column(String(500), nullable=True)

    source = Column(String(50), nullable=False)

    webex_meeting_id = Column(String(255), nullable=True)

    organiser_email = Column(String(255), nullable=False)

    attendees = Column(JSON, nullable=False, default=list)

    status = Column(String(50), nullable=False, default="processing")

    recording_path = Column(String(1000), nullable=True)

    duration_seconds = Column(Integer, nullable=True)

    task_id = Column(String(255), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    pdf_path = Column(String, nullable=True)

    approved_at = Column(DateTime(timezone=True), nullable=True)

    created_by_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
    )