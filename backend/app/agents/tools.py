from typing import Any

HUMAN_REVIEW_STATE: dict[str, Any] = {
    "flagged": False,
    "reason": None,
    "excerpt": None,
}

from langchain_core.tools import tool
from sqlalchemy import or_

from app.core.database import SessionLocal
from app.models.meeting import Meeting
from app.models.transcript import Transcript

@tool
def search_past_meetings(query: str) -> str:
    """
    Search previous meetings and transcripts for information
    related to a topic, project, decision, customer, or discussion.

    Returns the most relevant meetings including title,
    meeting date, and transcript excerpts.
    """

    db = SessionLocal()

    try:
        transcripts = (
            db.query(Transcript, Meeting)
            .join(
                Meeting,
                Transcript.meeting_id == Meeting.id
            )
            .filter(
                or_(
                    Transcript.raw_text.ilike(f"%{query}%"),
                )
            )
            .limit(3)
            .all()
        )

        if not transcripts:
            return "No matching meetings found."

        results = []

        for transcript, meeting in transcripts:
            excerpt = transcript.raw_text[:300]

            results.append(
                f"""
Title: {meeting.title}
Date: {meeting.created_at}
Excerpt: {excerpt}
                """.strip()
            )

        return "\n\n".join(results)

    finally:
        db.close()

@tool
def get_speaker_context(speaker_name: str) -> str:
    """
    Retrieve historical context about a meeting participant,
    including attendance history, department, role,
    and recurring discussion themes.
    """

    db = SessionLocal()

    try:
        meetings = (
            db.query(Meeting)
            .filter(
                Meeting.attendees.isnot(None)
            )
            .all()
        )

        matching = []

        for meeting in meetings:
            attendees = meeting.attendees or []

            for attendee in attendees:
                if (
                    attendee.get("name", "").lower()
                    == speaker_name.lower()
                ):
                    matching.append(attendee)

        if not matching:
            return f"No context found for {speaker_name}"

        attendance_count = len(matching)

        latest = matching[-1]

        department = latest.get("department")
        role = latest.get("role")

        return (
            f"Name: {speaker_name}\n"
            f"Department: {department}\n"
            f"Role: {role}\n"
            f"Meetings attended: {attendance_count}"
        )

    finally:
        db.close()

@tool
def flag_for_human_review(
    reason: str,
    excerpt: str
) -> str:
    """
    Flag a meeting for human review when information is
    ambiguous, contradictory, incomplete, or confidence
    is too low for automated processing.
    """

    HUMAN_REVIEW_STATE["flagged"] = True
    HUMAN_REVIEW_STATE["reason"] = reason
    HUMAN_REVIEW_STATE["excerpt"] = excerpt

    return f"Flagged for human review: {reason}"

@tool
def chunk_transcript(
    text: str,
    chunk_size: int = 3000,
    overlap: int = 200,
) -> list[str]:
    """
    Split a long transcript into overlapping chunks.

    Overlap preserves context between chunk boundaries
    so important information is not lost.
    """

    if not text:
        return []

    chunks = []

    start = 0

    while start < len(text):
        end = start + chunk_size

        chunks.append(
            text[start:end]
        )

        start += chunk_size - overlap

    return chunks

