from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class TopicDiscussed(BaseModel):
    title: str
    discussion: str


class ActionItem(BaseModel):
    description: str
    owner: str | None = None
    deadline_mentioned: str | None = None


class NotableQuote(BaseModel):
    speaker: str
    quote: str


class IntelligenceUpdate(BaseModel):
    summary: str

    decisions: list[str]

    topics_discussed: list[TopicDiscussed]

    risks_and_concerns: list[str]

    notable_quotes: list[NotableQuote]

    action_items: list[ActionItem]


class IntelligenceResponse(IntelligenceUpdate):
    id: UUID

    meeting_id: UUID

    confidence: float

    agent_run_log: list

    approved_by: str | None

    approved_at: datetime | None

    created_at: datetime

    class Config:
        from_attributes = True