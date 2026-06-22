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
)
import logging

logger = logging.getLogger(__name__)

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
)
from pydantic import BaseModel


class TranscriptTestRequest(BaseModel):
    transcript_text: str
    speaker_map: list

router = APIRouter()
def process_meeting(
    meeting_id: str,
    file_path: str,
):
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
            raise ValueError(
                f"Meeting not found: {meeting_id}"
            )

        # --------------------------------------------------
        # Transcription
        # --------------------------------------------------
        logger.info("Starting transcription")
        service = get_transcription_service()

        transcription_result = service.transcribe(
            file_path
        )

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
        else:
            meeting.status = "pending_review"

        db.commit()
        logger.info( f"Meeting {meeting.id} processed successfully")
        
    except Exception as e:

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

        except Exception:
            db.rollback()

        print(
            f"Meeting processing failed: {str(e)}"
        )

    finally:
        db.close()

def process_transcript_only(
    meeting_id: str,
    transcript_text: str,
    speaker_map: list,
):
    db = SessionLocal()
    try:
        meeting = (
            db.query(Meeting)
            .filter(Meeting.id == meeting_id)
            .first()
        )

        if not meeting:
            raise ValueError(
                f"Meeting {meeting_id} not found"
            )

        logger.info("Starting extraction agent")

        agent_result = run_extraction_agent(
            meeting_id=str(meeting.id),
            transcript_text=transcript_text,
            speaker_map=speaker_map,
        )

        logger.info("Extraction complete")

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

        meeting.status = "pending_review"
        logger.info("Saving intelligence")
        db.commit()
        logger.info("Intelligence saved")

        logger.info(
            f"Meeting {meeting.id} processed successfully"
        )

        return intelligence

    except Exception as e:
        import traceback

        traceback.print_exc()

        db.rollback()

        meeting = (
            db.query(Meeting)
            .filter(Meeting.id == meeting_id)
            .first()
        )

        if meeting:
            meeting.status = "failed"
            db.commit()

        logger.exception("PROCESS FAILED")

    finally:
        db.close()
        
            
def process_transcription(
    meeting_id: str,
    file_path: str,
):
    db = SessionLocal()

    try:
        service = get_transcription_service()

        result = service.transcribe(file_path)

        transcript = Transcript(
            meeting_id=meeting_id,
            raw_text=result["full_text"],
            speaker_map=result["segments"],
            language=result["language"],
        )

        db.add(transcript)
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
        
        db.commit()
        logger.info(
            f"Meeting {meeting.id} waiting for speaker mapping"
        )

        return

    except Exception as e:
        meeting = (
            db.query(Meeting)
            .filter(Meeting.id == meeting_id)
            .first()
        )

        if meeting:
            meeting.status = "failed"
            db.commit()

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
):
    if not (
        file.content_type.startswith("audio/")
        or file.content_type.startswith("video/")
    ):
        raise HTTPException(
            status_code=400,
            detail="Only audio/video files allowed"
        )

    try:
        attendees = json.loads(attendees_json)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Invalid attendees_json"
        )

    meeting = Meeting(
        title=title or file.filename,
        source=source,
        organiser_email="system",
        attendees=attendees,
        status="processing",
    )

    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    file_path = save_upload(
        file=file,
        meeting_id=str(meeting.id),
    )

    meeting.recording_path = file_path

    db.commit()

    background_tasks.add_task(
        process_transcription,
        str(meeting.id),
        file_path,
    )

    return meeting

@router.get(
    "/",
    response_model=list[MeetingListItem]
)
def list_meetings(
    db: Session = Depends(get_db),
):
    return (
        db.query(Meeting)
        .order_by(Meeting.created_at.desc())
        .all()
    )

@router.get(
    "/{meeting_id}",
    response_model=MeetingDetail
)
def get_meeting(
    meeting_id: UUID,
    db: Session = Depends(get_db),
):
    meeting = (
        db.query(Meeting)
        .filter(Meeting.id == meeting_id)
        .first()
    )

    if not meeting:
        raise HTTPException(
            status_code=404,
            detail="Meeting not found"
        )

    return meeting

@router.get("/{meeting_id}/transcript")
def get_transcript(
    meeting_id: UUID,
    db: Session = Depends(get_db),
):
    transcript = (
        db.query(Transcript)
        .filter(
            Transcript.meeting_id == meeting_id
        )
        .first()
    )

    if not transcript:
        raise HTTPException(
            status_code=404,
            detail="Transcript not found"
        )

    return transcript

@router.get(
    "/{meeting_id}/speakers",
    response_model=list[SpeakerResponse],
)
def get_speakers(
    meeting_id: UUID,
    db: Session = Depends(get_db),
):
    transcript = (
        db.query(Transcript)
        .filter(
            Transcript.meeting_id == meeting_id
        )
        .first()
    )

    if not transcript:
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

    return speakers

@router.put(
    "/{meeting_id}/speakers"
)
def update_speakers(
    meeting_id: UUID,
    payload: SpeakerMappingRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    meeting = (
        db.query(Meeting)
        .filter(Meeting.id == meeting_id)
        .first()
    )

    if not meeting:
        raise HTTPException(
            status_code=404,
            detail="Meeting not found",
        )

    transcript = (
        db.query(Transcript)
        .filter(
            Transcript.meeting_id == meeting_id
        )
        .first()
    )

    if not transcript:
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
):
    intelligence = (
        db.query(MeetingIntelligence)
        .filter(
            MeetingIntelligence.meeting_id
            == meeting_id
        )
        .first()
    )

    if not intelligence:
        raise HTTPException(
            status_code=404,
            detail="Meeting intelligence not found",
        )

    return intelligence

@router.put(
    "/{meeting_id}/intelligence",
    response_model=IntelligenceResponse,
)
def update_intelligence(
    meeting_id: UUID,
    payload: IntelligenceUpdate,
    db: Session = Depends(get_db),
):
    intelligence = (
        db.query(MeetingIntelligence)
        .filter(
            MeetingIntelligence.meeting_id
            == meeting_id
        )
        .first()
    )

    if not intelligence:
        raise HTTPException(
            status_code=404,
            detail="Meeting intelligence not found",
        )

    old_value = {
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

    db.refresh(intelligence)

    return intelligence

@router.post(
    "/{meeting_id}/approve"
)
def approve_meeting(
    meeting_id: UUID,
    db: Session = Depends(get_db),
):
    meeting = (
        db.query(Meeting)
        .filter(
            Meeting.id == meeting_id
        )
        .first()
    )

    if not meeting:
        raise HTTPException(
            status_code=404,
            detail="Meeting not found",
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

    db.commit()

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
):
    meeting = (
        db.query(Meeting)
        .filter(Meeting.id == meeting_id)
        .first()
    )

    if not meeting:
        raise HTTPException(
            status_code=404,
            detail="Meeting not found",
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

    return {
        "message": "Test transcript created"
    }