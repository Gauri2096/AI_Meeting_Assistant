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
    speaker_map,
    db
):
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

        if agent_result["needs_human_review"]:
            meeting.status = "needs_review"
        else:
            meeting.status = "pending_review"

        db.commit()

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

        logger.error(
            f"Meeting processing failed: {str(e)}"
        )

    finally:
        db.close()
        
            
def process_meeting_old(
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

        meeting = (
            db.query(Meeting)
            .filter(Meeting.id == meeting_id)
            .first()
        )

        if meeting:
            meeting.duration_seconds = int(
                result["duration"]
            )

            meeting.status = "pending_extraction"
        
        # ----------------------------------
        # Run extraction agent
        # ----------------------------------

        agent_result = run_extraction_agent(
            meeting_id=str(meeting.id),
            transcript_text=result["full_text"],
            speaker_map=result["segments"],
        )

        # ----------------------------------
        # Save intelligence
        # ----------------------------------

        intelligence = MeetingIntelligence(
            meeting_id=meeting.id,

            summary=agent_result["final_extraction"]["summary"],

            decisions=agent_result["final_extraction"]["decisions"],

            topics_discussed=agent_result["final_extraction"]["topics_discussed"],

            risks_and_concerns=agent_result["final_extraction"]["risks_and_concerns"],

            notable_quotes=agent_result["final_extraction"]["notable_quotes"],

            action_items=agent_result["final_extraction"]["action_items"],

            confidence_score=agent_result["confidence"],

            needs_human_review=agent_result["needs_human_review"],

            review_reason=agent_result["review_reason"],

            agent_run_log=agent_result["agent_run_log"],
        )

        db.add(intelligence)

        # ----------------------------------
        # Update meeting status
        # ----------------------------------

        if agent_result["needs_human_review"]:
            meeting.status = "needs_review"
        else:
            meeting.status = "pending_review"

        db.commit()

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
        process_meeting,
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

