from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AttendeeSchema(BaseModel):
    name: str
    email: str
    department: Optional[str] = None
    role: Optional[str] = None


class MeetingCreateResponse(BaseModel):
    id: UUID
    status: str
    source: str

    model_config = ConfigDict(from_attributes=True)


class MeetingListItem(BaseModel):
    id: UUID
    title: Optional[str] = None
    status: str
    source: str
    created_at: datetime
    organiser_email: str

    model_config = ConfigDict(from_attributes=True)


class MeetingDetail(BaseModel):
    id: UUID
    title: Optional[str] = None
    status: str
    source: str
    created_at: datetime
    organiser_email: str

    attendees: list[AttendeeSchema]
    duration_seconds: Optional[int] = None
    webex_meeting_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)