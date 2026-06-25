from datetime import datetime
from typing import Optional, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator


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

    speaker_mapping_mode: Literal[
            "manual",
            "automatic",
        ] = "manual"

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

    attendees: list[str]
    duration_seconds: Optional[int] = None
    webex_meeting_id: Optional[str] = None
    speaker_mapping_mode: str = "manual"
    created_by_user_id: Optional[UUID] = None
    can_edit: bool = False

    model_config = ConfigDict(from_attributes=True)

    @field_validator("attendees", mode="before")
    @classmethod
    def serialize_attendees(cls, v):
        if not v:
            return []
        if isinstance(v, list):
            emails = []
            for item in v:
                if isinstance(item, str):
                    emails.append(item)
                elif isinstance(item, dict) and "email" in item:
                    emails.append(item["email"])
            return emails
        return v


class MeetingMetadataUpdate(BaseModel):
    title: str
    attendees: list[str]