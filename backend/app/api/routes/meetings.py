from app.core import database
import json
from uuid import UUID

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    Body,
)

import logging
from fastapi.responses import FileResponse
logger = logging.getLogger(__name__)

from app.services.pdf_service import generate_meeting_pdf
from app.schemas.email import SendReportRequest
from app.services.email.email_service import send_meeting_report_email
from app.core.config import get_settings
settings=get_settings()
from sqlalchemy.orm import Session
from app.agents.graph import run_extraction_agent
from app.models.intelligence import MeetingIntelligence
from app.core.database import SessionLocal, get_db
from app.core.storage import save_upload
from app.models.meeting import Meeting
from app.models.transcript import Transcript
from app.schemas.meeting import (
    MeetingCreateResponse,
    MeetingDetail,
    MeetingListItem,
)
from app.services.transcription.transcription_service import (
    get_transcription_service,
)
from app.schemas.speakers import (
    SpeakerMappingRequest,
    SpeakerResponse,
)

from app.models.audit_log import AuditLog

from app.services.transcription.speaker_service import (
    build_processed_text,
)

from datetime import datetime

from app.models.intelligence import (
    MeetingIntelligence,
)

from app.core.audit import log_action

from app.schemas.intelligence import (
    IntelligenceUpdate,
    IntelligenceResponse,
    IntelligenceViewResponse
)
from pydantic import BaseModel
from app.core.auth import get_current_user
from app.models.user import User
from app.core.permissions import (
    check_meeting_access, check_meeting_edit_access
)

class TranscriptTestRequest(BaseModel):
    transcript_text: str
    speaker_map: list

router = APIRouter()
def process_meeting(
    meeting_id: str,
    file_path: str,
):
    print(f"[API ROUTE process_meeting] Background task triggered. Meeting ID: {meeting_id}, File: {file_path}")
    db = SessionLocal()

    try:
        # --------------------------------------------------
        # Load meeting
        # --------------------------------------------------

        meeting = (
            db.query(Meeting)
            .filter(Meeting.id == meeting_id)
            .first()
        )

        if not meeting:
            print(f"[API ROUTE process_meeting] ERROR: Meeting {meeting_id} not found in DB.")
            raise ValueError(
                f"Meeting not found: {meeting_id}"
            )

        # --------------------------------------------------
        # Transcription
        # --------------------------------------------------
        logger.info("Starting transcription")
        print(f"[API ROUTE process_meeting] Starting transcription service for meeting '{meeting.title}'...")
        service = get_transcription_service()

        transcription_result = service.transcribe(
            file_path
        )

        print(f"[API ROUTE process_meeting] Transcription complete. Saving raw transcript...")
        transcript = Transcript(
            meeting_id=meeting.id,
            raw_text=transcription_result["full_text"],
            speaker_map=transcription_result["segments"],
            language=transcription_result["language"],
        )

        db.add(transcript)

        meeting.duration_seconds = int(
            transcription_result["duration"]
        )

        meeting.status = "pending_extraction"

        # Save transcription before extraction begins
        db.commit()
        logger.info("Transcription complete")
        # --------------------------------------------------
        # Extraction Agent
        # --------------------------------------------------
        logger.info("Starting extraction agent")
        print(f"[API ROUTE process_meeting] Transcript saved. Triggering Extraction Agent...")
        agent_result = run_extraction_agent(
            meeting_id=str(meeting.id),
            transcript_text=transcription_result["full_text"],
            speaker_map=transcription_result["segments"],
        )

        extraction = agent_result["final_extraction"]
        logger.info("Extraction complete")
        # --------------------------------------------------
        # Save Intelligence
        # --------------------------------------------------
        logger.info("Saving intelligence")
        print(f"[API ROUTE process_meeting] Extraction complete. Saving intelligence output...")
        intelligence = MeetingIntelligence(
            meeting_id=meeting.id,

            summary=extraction["summary"],

            decisions=extraction["decisions"],

            topics_discussed=extraction[
                "topics_discussed"
            ],

            risks_and_concerns=extraction[
                "risks_and_concerns"
            ],

            notable_quotes=extraction[
                "notable_quotes"
            ],

            action_items=extraction[
                "action_items"
            ],

            confidence=extraction[
                "confidence"
            ],

            ai_model_used=settings.GEMINI_MODEL,

            agent_run_log=agent_result[
                "agent_run_log"
            ],
        )

        db.add(intelligence)

        # --------------------------------------------------
        # Update Meeting Status
        # --------------------------------------------------
        logger.info("Updating meeting status")
        if agent_result["needs_human_review"]:
            meeting.status = "needs_review"
            print(f"[API ROUTE process_meeting] Meeting marked as 'needs_review' (confidence: {extraction['confidence']})")
        else:
            meeting.status = "pending_review"
            print(f"[API ROUTE process_meeting] Meeting marked as 'pending_review' (confidence: {extraction['confidence']})")

        db.commit()
        logger.info( f"Meeting {meeting.id} processed successfully")
        print(f"[API ROUTE process_meeting] Meeting {meeting.id} processing successfully completed.")
        
    except Exception as e:

        print(f"[API ROUTE process_meeting] ERROR encountered: {str(e)}")
        db.rollback()

        try:
            meeting = (
                db.query(Meeting)
                .filter(Meeting.id == meeting_id)
                .first()
            )

            if meeting:
                meeting.status = "failed"
                db.commit()
                print(f"[API ROUTE process_meeting] Meeting status updated to 'failed' due to exception.")

        except Exception as rollback_err:
            db.rollback()
            print(f"[API ROUTE process_meeting] Rollback error during failure handling: {str(rollback_err)}")

    finally:
        db.close()

def process_transcript_only(
    meeting_id: str,
    transcript_text: str,
    speaker_map: list,
):
    print(f"[API ROUTE process_transcript_only] Background task triggered. Meeting ID: {meeting_id}")
    db = SessionLocal()
    try:
        meeting = (
            db.query(Meeting)
            .filter(Meeting.id == meeting_id)
            .first()
        )

        if not meeting:
            print(f"[API ROUTE process_transcript_only] ERROR: Meeting {meeting_id} not found in DB.")
            raise ValueError(
                f"Meeting {meeting_id} not found"
            )

        logger.info("Starting extraction agent")
        print(f"[API ROUTE process_transcript_only] Running Extraction Agent for meeting '{meeting.title}'...")

        agent_result = run_extraction_agent(
            meeting_id=str(meeting.id),
            transcript_text=transcript_text,
            speaker_map=speaker_map,
        )

        logger.info("Extraction complete")
        print(f"[API ROUTE process_transcript_only] Extraction complete. Saving intelligence output...")

        extraction = agent_result["final_extraction"]

        intelligence = MeetingIntelligence(
            meeting_id=meeting.id,

            summary=extraction["summary"],

            decisions=extraction["decisions"],

            topics_discussed=extraction["topics_discussed"],

            risks_and_concerns=extraction["risks_and_concerns"],

            notable_quotes=extraction["notable_quotes"],

            action_items=extraction["action_items"],

            confidence=extraction["confidence"],

            ai_model_used=settings.GEMINI_MODEL,

            agent_run_log=agent_result["agent_run_log"],
        )

        db.add(intelligence)

        if agent_result["needs_human_review"]:
            meeting.status = "needs_review"
            print(f"[API ROUTE process_transcript_only] Marked meeting as 'needs_review' (confidence: {extraction['confidence']})")
        else:
            meeting.status = "pending_review"
            print(f"[API ROUTE process_transcript_only] Marked meeting as 'pending_review' (confidence: {extraction['confidence']})")
            
        logger.info("Saving intelligence")
        db.commit()
        logger.info("Intelligence saved")

        logger.info(
            f"Meeting {meeting.id} processed successfully"
        )
        print(f"[API ROUTE process_transcript_only] Meeting {meeting.id} processing successfully completed.")

        return intelligence

    except Exception as e:
        import traceback

        traceback.print_exc()

        print(f"[API ROUTE process_transcript_only] ERROR encountered: {str(e)}")
        db.rollback()

        meeting = (
            db.query(Meeting)
            .filter(Meeting.id == meeting_id)
            .first()
        )

        if meeting:
            meeting.status = "failed"
            db.commit()
            print(f"[API ROUTE process_transcript_only] Meeting status updated to 'failed' due to exception.")

       
        logger.exception(
            "PROCESS TRANSCRIPT ONLY FAILED"
        )

    finally:
        db.close()
        
            
def process_transcription(
    meeting_id: str,
    file_path: str,
):
    print(f"[API ROUTE process_transcription] Background task triggered. Meeting ID: {meeting_id}, File: {file_path}")
    db = SessionLocal()

    try:
        print("[API ROUTE process_transcription] Retrieving transcription service...")
        service = get_transcription_service()

        print(f"[API ROUTE process_transcription] Running transcribe on: {file_path}...")
        result = service.transcribe(file_path)

        transcript = Transcript(
            meeting_id=meeting_id,
            raw_text=result["full_text"],
            speaker_map=result["segments"],
            language=result["language"],
        )

        db.add(transcript)
        print("[API ROUTE process_transcription] Raw transcript saved.")
        logger.info("Transcription complete")
        meeting = (
            db.query(Meeting)
            .filter(Meeting.id == meeting_id)
            .first()
        )

        if meeting:
            meeting.duration_seconds = int(
                result["duration"]
            )
            meeting.status = "pending_speaker_mapping"
            print(f"[API ROUTE process_transcription] Meeting status updated to 'pending_speaker_mapping'.")
        else:
            print(f"[API ROUTE process_transcription] WARNING: Meeting {meeting_id} not found in DB.")
        
        db.commit()
        logger.info(
            f"Meeting {meeting.id} waiting for speaker mapping"
        )

        return

    except Exception as e:
        print(f"[API ROUTE process_transcription] ERROR during transcription background processing: {str(e)}")
        meeting = (
            db.query(Meeting)
            .filter(Meeting.id == meeting_id)
            .first()
        )

        if meeting:
            meeting.status = "failed"
            db.commit()
            print(f"[API ROUTE process_transcription] Meeting status marked as 'failed' due to error.")

        print(f"Processing failed: {e}")

    finally:
        db.close()

@router.post(
    "/upload",
    response_model=MeetingCreateResponse
)

async def upload_meeting(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str | None = Form(None),
    attendees_json: str = Form("[]"),
    source: str = Form("upload"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    print(f"[API ROUTE /upload] Request by user: {current_user.email}, Title: {title}, Filename: {file.filename}")
    if not (
        file.content_type.startswith("audio/")
        or file.content_type.startswith("video/")
    ):
        print(f"[API ROUTE /upload] ERROR: Rejected content_type: {file.content_type}")
        raise HTTPException(
            status_code=400,
            detail="Only audio/video files allowed"
        )

    try:
        attendees = json.loads(attendees_json)
    except json.JSONDecodeError:
        print(f"[API ROUTE /upload] ERROR: Invalid JSON attendees list: {attendees_json}")
        raise HTTPException(
            status_code=400,
            detail="Invalid attendees_json"
        )
    
    meeting = Meeting(
        title=title or file.filename,
        source=source,
        organiser_email=current_user.email,
        created_by_user_id=current_user.id,
        attendees=attendees,
        status="processing",
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    print(f"[API ROUTE /upload] Meeting record created with ID: {meeting.id}")

    file_path = save_upload(
        file=file,
        meeting_id=str(meeting.id),
    )

    meeting.recording_path = file_path

    db.commit()
    print(f"[API ROUTE /upload] File saved to path: {file_path}")

    background_tasks.add_task(
        process_transcription,
        str(meeting.id),
        file_path,
    )
    print(f"[API ROUTE /upload] Added 'process_transcription' background task for meeting ID: {meeting.id}.")

    return meeting

@router.get(
    "/",
    response_model=list[MeetingListItem]
)
def list_meetings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    print(f"[API ROUTE /] List meetings requested by user: {current_user.email}")
    meetings=db.query(Meeting).order_by(Meeting.created_at.desc()).all()

    visible_meetings = []

    for meeting in meetings:

        attendees = meeting.attendees or []

        can_view = (
            meeting.created_by_user_id == current_user.id
            or current_user.email in attendees
        )

        if not can_view:
            continue

        visible_meetings.append(
                {
                    "id": str(meeting.id),
                    "title": meeting.title,
                    "status": meeting.status,
                    "created_at": meeting.created_at,
                    "source": meeting.source,
                    "organiser_email": meeting.organiser_email,
                    "can_edit": (
                        meeting.created_by_user_id
                        == current_user.id
                    ),
                }
            )

    print(f"[API ROUTE /] Returning {len(visible_meetings)} meetings for user: {current_user.email}")
    return visible_meetings

@router.get(
    "/{meeting_id}",
    response_model=MeetingDetail
)
def get_meeting(
    meeting_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    print(f"[API ROUTE /{meeting_id}] Get meeting detail requested by user: {current_user.email}")
    meeting = (
        db.query(Meeting)
        .filter(
            Meeting.id == meeting_id
        )
        .first()
    )

    if not meeting:
        print(f"[API ROUTE /{meeting_id}] ERROR: Meeting not found.")
        raise HTTPException(
            status_code=404,
            detail="Meeting not found",
        )

    check_meeting_access(
        meeting,
        current_user,
    )

    print(f"[API ROUTE /{meeting_id}] Returning details for meeting '{meeting.title}' (Status: {meeting.status}).")
    return meeting


@router.get("/{meeting_id}/transcript")
def get_transcript(
    meeting_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    print(f"[API ROUTE /{meeting_id}/transcript] Get transcript requested by user: {current_user.email}")
    meeting= (
        db.query(Meeting)
        .filter(
            Meeting.id == meeting_id
        )
        .first()
    )

    transcript = (
        db.query(Transcript)
        .filter(
            Transcript.meeting_id == meeting_id
        )
        .first()
    )

    if not transcript:
        print(f"[API ROUTE /{meeting_id}/transcript] ERROR: Transcript not found.")
        raise HTTPException(
            status_code=404,
            detail="Transcript not found"
        )
    check_meeting_access(
        meeting,
        current_user,
    )
    print(f"[API ROUTE /{meeting_id}/transcript] Returning transcript text length: {len(transcript.raw_text)} chars.")
    return transcript

@router.get(
    "/{meeting_id}/speakers",
    response_model=list[SpeakerResponse],
)
def get_speakers(
    meeting_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    print(f"[API ROUTE /{meeting_id}/speakers] Get speakers requested by user: {current_user.email}")
    meeting = (
        db.query(Meeting)
        .filter(
            Meeting.id == meeting_id
        )
        .first()
    )

    transcript = (
        db.query(Transcript)
        .filter(
            Transcript.meeting_id == meeting_id
        )
        .first()
    )

    if not transcript:
        print(f"[API ROUTE /{meeting_id}/speakers] ERROR: Transcript not found.")
        raise HTTPException(
            status_code=404,
            detail="Transcript not found",
        )

    metadata = (
        transcript.speaker_metadata
        or {}
    )

    speakers = []

    seen = set()

    for segment in transcript.speaker_map:

        label = segment["speaker"]

        if label in seen:
            continue

        seen.add(label)

        mapped = metadata.get(
            label,
            {},
        )

        speakers.append(
            {
                "speaker_label": label,
                "sample_quote": segment["text"],
                "current_name": mapped.get("name"),
                "current_email": mapped.get("email"),
            }
        )
    check_meeting_access(
        meeting,
        current_user,
    )
    print(f"[API ROUTE /{meeting_id}/speakers] Returning {len(speakers)} mapped speakers.")
    return speakers

@router.put(
    "/{meeting_id}/speakers"
)
def update_speakers(
    meeting_id: UUID,
    payload: SpeakerMappingRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    print(f"[API ROUTE /{meeting_id}/speakers] Update speakers requested by: {current_user.email}, Payload speaker labels: {list(payload.speaker_map.keys())}")
    meeting = (
        db.query(Meeting)
        .filter(Meeting.id == meeting_id)
        .first()
    )

    if not meeting:
        print(f"[API ROUTE /{meeting_id}/speakers] ERROR: Meeting not found.")
        raise HTTPException(
            status_code=404,
            detail="Meeting not found",
        )
    check_meeting_edit_access(
        meeting,
        current_user,
    )
    transcript = (
        db.query(Transcript)
        .filter(
            Transcript.meeting_id == meeting_id
        )
        .first()
    )

    if not transcript:
        print(f"[API ROUTE /{meeting_id}/speakers] ERROR: Transcript not found.")
        raise HTTPException(
            status_code=404,
            detail="Transcript not found",
        )

    old_value = (
        transcript.speaker_metadata
        or {}
    )

    speaker_metadata = {
        label: info.model_dump()
        for label, info
        in payload.speaker_map.items()
    }

    transcript.speaker_metadata = (
        speaker_metadata
    )

    transcript.processed_text = (
        build_processed_text(
            transcript.speaker_map,
            speaker_metadata,
        )
    )

    meeting.attendees = [
        {
            "name": value["name"],
            "email": value["email"],
            "department": value.get(
                "department"
            ),
            "role": value.get("role"),
        }
        for value
        in speaker_metadata.values()
    ]

    meeting.status = "extracting"

    audit_log = AuditLog(
        user_email="system",
        action="speaker_mapping_updated",
        entity_type="meeting",
        entity_id=meeting.id,
        old_value=old_value,
        new_value=speaker_metadata,
    )

    db.add(audit_log)

    db.commit()
    print("[API ROUTE /{meeting_id}/speakers] Speaker mapping saved. Triggering process_transcript_only in background tasks...")

    background_tasks.add_task(
        process_transcript_only,
        str(meeting.id),
        transcript.processed_text,
        transcript.speaker_map,
    )

    return {
        "message": "Speaker mapping saved",
        "status": "extracting",
    }


@router.get(
    "/{meeting_id}/intelligence",
    response_model=IntelligenceResponse,
)
def get_intelligence(
    meeting_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    print(f"[API ROUTE /{meeting_id}/intelligence] Get intelligence requested by: {current_user.email}")
    meeting = (
        db.query(Meeting)
        .filter(
            Meeting.id == meeting_id
        )
        .first()
    )

    if not meeting:
        print(f"[API ROUTE /{meeting_id}/intelligence] ERROR: Meeting not found.")
        raise HTTPException(
            status_code=404,
            detail="Meeting not found",
        )

    check_meeting_access(
        meeting,
        current_user,
    )
    intelligence = (
        db.query(MeetingIntelligence)
        .filter(
            MeetingIntelligence.meeting_id
            == meeting_id
        )
        .first()
    )

    if not intelligence:
        print(f"[API ROUTE /{meeting_id}/intelligence] ERROR: Intelligence not found.")
        raise HTTPException(
            status_code=404,
            detail="Meeting intelligence not found",
        )

    print(f"[API ROUTE /{meeting_id}/intelligence] Returning intelligence. Model used: {intelligence.ai_model_used}, Confidence: {intelligence.confidence}")
    return {
    "id": intelligence.id,
    "meeting_id": intelligence.meeting_id,
    "title": meeting.title,
    "summary": intelligence.summary,
    "confidence": intelligence.confidence,
    "agent_run_log": intelligence.agent_run_log,
    "approved_by": intelligence.approved_by,
    "approved_at": intelligence.approved_at,
    "created_at": intelligence.created_at,
    "decisions": intelligence.decisions,
    "topics_discussed": intelligence.topics_discussed,
    "risks_and_concerns": intelligence.risks_and_concerns,
    "notable_quotes": intelligence.notable_quotes,
    "action_items": intelligence.action_items,
}

@router.put(
    "/{meeting_id}/intelligence",
    response_model=IntelligenceViewResponse,
)
def update_intelligence(
    meeting_id: UUID,
    payload: IntelligenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    print(f"[API ROUTE /{meeting_id}/intelligence] Update intelligence requested by: {current_user.email}")
    meeting = (
        db.query(Meeting)
        .filter(
            Meeting.id == meeting_id
        )
        .first()
    )

    if not meeting:
        print(f"[API ROUTE /{meeting_id}/intelligence] ERROR: Meeting not found.")
        raise HTTPException(
            status_code=404,
            detail="Meeting not found",
        )

    check_meeting_edit_access(
        meeting,
        current_user,
    )
    intelligence = (
        db.query(MeetingIntelligence)
        .filter(
            MeetingIntelligence.meeting_id
            == meeting_id
        )
        .first()
    )

    if not intelligence:
        print(f"[API ROUTE /{meeting_id}/intelligence] ERROR: Intelligence not found.")
        raise HTTPException(
            status_code=404,
            detail="Meeting intelligence not found",
        )

    old_value = {
        "title": meeting.title,
        "summary": intelligence.summary,
        "decisions": intelligence.decisions,
        "topics_discussed": intelligence.topics_discussed,
        "risks_and_concerns": intelligence.risks_and_concerns,
        "notable_quotes": intelligence.notable_quotes,
        "action_items": intelligence.action_items,
    }

    intelligence.summary = payload.summary

    intelligence.decisions = payload.decisions

    intelligence.topics_discussed = [
        item.model_dump()
        for item in payload.topics_discussed
    ]

    intelligence.risks_and_concerns = (
        payload.risks_and_concerns
    )

    intelligence.notable_quotes = [
        item.model_dump()
        for item in payload.notable_quotes
    ]
    if payload.title:
        meeting.title = payload.title

    intelligence.action_items = [
        item.model_dump()
        for item in payload.action_items
    ]

    new_value = payload.model_dump()

    log_action(
        db=db,
        user_email="system",
        action="intelligence_updated",
        entity_type="meeting_intelligence",
        entity_id=intelligence.id,
        old_value=old_value,
        new_value=new_value,
    )

    db.commit()
    db.refresh(meeting)
    db.refresh(intelligence)
    print(f"[API ROUTE /{meeting_id}/intelligence] Intelligence successfully updated.")

    return {
    "title": meeting.title,
    "summary": intelligence.summary,
    "decisions": intelligence.decisions,
    "topics_discussed": intelligence.topics_discussed,
    "risks_and_concerns": intelligence.risks_and_concerns,
    "notable_quotes": intelligence.notable_quotes,
    "action_items": intelligence.action_items,
}
    

@router.post(
    "/{meeting_id}/approve"
)
def approve_meeting(
    meeting_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    print(f"[API ROUTE /{meeting_id}/approve] Approve meeting requested by: {current_user.email}")
    meeting = (
        db.query(Meeting)
        .filter(
            Meeting.id == meeting_id
        )
        .first()
    )

    if not meeting:
        print(f"[API ROUTE /{meeting_id}/approve] ERROR: Meeting not found.")
        raise HTTPException(
            status_code=404,
            detail="Meeting not found",
        )
    check_meeting_edit_access(
        meeting,
        current_user,
    )  
    intelligence = (
        db.query(MeetingIntelligence)
        .filter(
            MeetingIntelligence.meeting_id
            == meeting_id
        )
        .first()
    )

    if not intelligence:
        print(f"[API ROUTE /{meeting_id}/approve] ERROR: Intelligence not found.")
        raise HTTPException(
            status_code=404,
            detail="Meeting intelligence not found",
        )

    old_status = meeting.status

    meeting.status = "approved"

    intelligence.approved_by = "system"

    intelligence.approved_at = (
        datetime.utcnow()
    )

    log_action(
        db=db,
        user_email="system",
        action="meeting_approved",
        entity_type="meeting",
        entity_id=meeting.id,
        old_value={
            "status": old_status,
        },
        new_value={
            "status": "approved",
        },
    )

    print(f"[API ROUTE /{meeting_id}/approve] Generating PDF report for meeting '{meeting.title}'...")
    pdf_path = generate_meeting_pdf(
        meeting=meeting,
        intelligence=intelligence,
    )

    meeting.pdf_path = pdf_path
    db.commit()
    print(f"[API ROUTE /{meeting_id}/approve] Meeting status updated to 'approved' and PDF saved: {pdf_path}")

    return {
        "message": "Meeting approved"
    }

@router.post(
    "/{meeting_id}/test-process"
)
def test_process_meeting(
    meeting_id: UUID,
    payload: TranscriptTestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    print(f"[API ROUTE /{meeting_id}/test-process] Test process meeting requested by: {current_user.email}")
    meeting = (
        db.query(Meeting)
        .filter(Meeting.id == meeting_id)
        .first()
    )

    if not meeting:
        print(f"[API ROUTE /{meeting_id}/test-process] ERROR: Meeting not found.")
        raise HTTPException(
            status_code=404,
            detail="Meeting not found",
        )
    check_meeting_access(
        meeting,
        current_user,
    )
    transcript = Transcript(
        meeting_id=meeting.id,
        raw_text=payload.transcript_text,
        speaker_map=payload.speaker_map,
        language="en",
    )

    db.add(transcript)

    meeting.status = (
        "pending_speaker_mapping"
    )

    db.commit()
    print(f"[API ROUTE /{meeting_id}/test-process] Test transcript created. Meeting status updated to 'pending_speaker_mapping'.")

    return {
        "message": "Test transcript created"
    }

@router.get("/{meeting_id}/pdf")
def download_pdf(
    meeting_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    print(f"[API ROUTE /{meeting_id}/pdf] Download PDF requested by: {current_user.email}")
    meeting = (
        db.query(Meeting)
        .filter(Meeting.id == meeting_id)
        .first()
    )

    if not meeting:
        print(f"[API ROUTE /{meeting_id}/pdf] ERROR: Meeting not found.")
        raise HTTPException(
            status_code=404,
            detail="Meeting not found",
        )

    check_meeting_access(
        meeting,
        current_user,
    )

    if not meeting.pdf_path:
        print(f"[API ROUTE /{meeting_id}/pdf] ERROR: PDF has not been generated for this meeting.")
        raise HTTPException(
            status_code=404,
            detail="PDF not generated",
        )

    meeting_date = meeting.created_at.strftime(
        "%Y-%m-%d"
    )

    filename = (
        f"{meeting.title}_{meeting_date}.pdf"
    )
    print(f"[API ROUTE /{meeting_id}/pdf] Returning PDF file response: '{filename}' from local path: '{meeting.pdf_path}'")

    return FileResponse(
        path=meeting.pdf_path,
        media_type="application/pdf",
        filename=filename,
    )
@router.post("/{meeting_id}/send-email")
def send_summary_email(
    meeting_id: UUID,
    payload: SendReportRequest = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    print(f"[API ROUTE /{meeting_id}/send-email] Send summary email requested by: {current_user.email}")
    meeting = (
        db.query(Meeting)
        .filter(Meeting.id == meeting_id)
        .first()
    )

    if not meeting:
        print(f"[API ROUTE /{meeting_id}/send-email] ERROR: Meeting not found.")
        raise HTTPException(
            status_code=404,
            detail="Meeting not found",
        )

    check_meeting_access(
        meeting,
        current_user,
    )

    if not meeting.pdf_path:
        print(f"[API ROUTE /{meeting_id}/send-email] ERROR: PDF has not been generated for this meeting.")
        raise HTTPException(
            status_code=404,
            detail="PDF not generated",
        )

    print(f"[API ROUTE /{meeting_id}/send-email] Triggering send_meeting_report_email for recipients: {payload.recipients}")
    send_meeting_report_email(
        organizer=meeting.organiser_email,
        recipients=payload.recipients,
        pdf_path=meeting.pdf_path,
        meeting_title=meeting.title,
    )

    return {
        "message": "Report sent successfully"
    }
