from pydantic import BaseModel


class Topic(BaseModel):
    title: str
    discussion: str


class Quote(BaseModel):
    speaker: str
    quote: str


class ActionItem(BaseModel):
    description: str
    owner: str | None = None
    deadline_mentioned: str | None = None


class ExtractionResult(BaseModel):
    summary: str
    decisions: list[str]
    topics_discussed: list[Topic]
    risks_and_concerns: list[str]
    notable_quotes: list[Quote]
    action_items: list[ActionItem]
    confidence: float