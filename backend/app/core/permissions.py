from fastapi import HTTPException

from app.models.meeting import Meeting
from app.models.user import User


def check_meeting_access(
    meeting: Meeting,
    user: User,
):

    attendees = meeting.attendees or []

    allowed = (
        meeting.organiser_email
        == user.email
        or user.email in attendees
    )

    if not allowed:
        raise HTTPException(
            status_code=403,
            detail="Access denied",
        )