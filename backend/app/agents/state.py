from typing import TypedDict, Any


class MeetingAgentState(TypedDict):
    """
    Shared state passed between all LangGraph nodes.

    Every node:
        Input  -> MeetingAgentState
        Output -> Partial update dict
    """

    # Meeting metadata
    meeting_id: str

    # Transcript data
    transcript_text: str
    speaker_map: dict
    transcript_length: int

    # Chunking
    chunks: list[str]

    # Extraction results
    chunk_extractions: list[dict]
    final_extraction: dict[str, Any]

    # Confidence & review
    confidence: float
    needs_human_review: bool
    review_reason: str

    # Observability
    agent_run_log: list[str]

    # Error handling
    error: str