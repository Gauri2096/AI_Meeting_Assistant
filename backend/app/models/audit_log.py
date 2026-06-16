import uuid

from sqlalchemy import Column, DateTime, JSON, String, func
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_email = Column(String(255), nullable=False)

    action = Column(String(255), nullable=False)

    entity_type = Column(String(100), nullable=False)

    entity_id = Column(UUID(as_uuid=True), nullable=False)

    old_value = Column(JSON, nullable=True)

    new_value = Column(JSON, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )