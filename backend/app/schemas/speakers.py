from typing import Dict
from pydantic import BaseModel, EmailStr


class SpeakerDetails(BaseModel):
    name: str
    email: EmailStr
    department: str | None = None
    role: str | None = None


class SpeakerMappingRequest(BaseModel):
    speaker_map: Dict[str, str]


class SpeakerResponse(BaseModel):
    speaker_label: str
    sample_quote: str
    current_name: str | None = None
    current_email: str | None = None