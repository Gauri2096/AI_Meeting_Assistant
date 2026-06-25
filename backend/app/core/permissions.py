from fastapi import HTTPException

from app.models.meeting import Meeting
from app.models.user import User


def can_view_meeting(
    meeting: Meeting,
    user: User,
) -> bool:

    attendees = meeting.attendees or []
    emails = []
    for attendee in attendees:
        if isinstance(attendee, str):
            emails.append(attendee)
        elif isinstance(attendee, dict) and "email" in attendee:
            emails.append(attendee["email"])

    return (
        meeting.created_by_user_id == user.id
        or user.email in emails
    )


def can_edit_meeting(
    meeting: Meeting,
    user: User,
) -> bool:

    return (
        meeting.created_by_user_id == user.id
    )


def check_meeting_access(
    meeting: Meeting,
    user: User,
):

    if not can_view_meeting(
        meeting,
        user,
    ):
        raise HTTPException(
            status_code=403,
            detail="Access denied",
        )


def check_meeting_edit_access(
    meeting: Meeting,
    user: User,
):

    if not can_edit_meeting(
        meeting,
        user,
    ):
        raise HTTPException(
            status_code=403,
            detail="Edit access denied",
        )