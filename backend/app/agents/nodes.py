from alembic.autogenerate.api import log
from tarfile import ExtractError
from langchain_google_genai import (
    ChatGoogleGenerativeAI,
)

from langchain_core.messages import (
    HumanMessage,
    SystemMessage,
)

from app.agents.prompts import (
    EXTRACTION_SYSTEM_PROMPT,
    RECONCILIATION_SYSTEM_PROMPT,
    build_extraction_user_prompt,
    build_reconciliation_prompt,
)
from app.agents.chunking import (
    chunk_transcript,
)
from app.agents.schemas import (
    ExtractionResult,
)
from app.agents.state import (
    MeetingAgentState,
)
from app.core.config import (
    get_settings,
)

settings = get_settings()

llm = ChatGoogleGenerativeAI(
    model=settings.GEMINI_MODEL,
    google_api_key=settings.GOOGLE_API_KEY,
    temperature=0.1,
)

structured_llm = llm.with_structured_output(
    ExtractionResult
)

def add_log(
    state: MeetingAgentState,
    message: str,
):
    log = state.get(
        "agent_run_log",
        []
    )

    log.append(message)

    return log

def invoke_extraction_llm(
    transcript: str,
    speaker_map: dict,
    is_chunk: bool = False,
    chunk_index: int = 0,
    total_chunks: int = 1,
) -> ExtractionResult:

    messages = [
        SystemMessage(content=EXTRACTION_SYSTEM_PROMPT),
        HumanMessage(
            content=build_extraction_user_prompt(
                transcript=transcript,
                speaker_map=speaker_map,
                is_chunk=is_chunk,
                chunk_index=chunk_index,
                total_chunks=total_chunks,
            )
        ),
    ]

    return structured_llm.invoke(messages)

def invoke_reconciliation_llm(
    chunk_extractions: list,
) -> ExtractionResult:

    messages = [
        SystemMessage(content=RECONCILIATION_SYSTEM_PROMPT),
        HumanMessage(
            content=build_reconciliation_prompt(
                chunk_extractions
            )
        ),
    ]

    return structured_llm.invoke(messages)



def analyse_transcript(
    state: MeetingAgentState,
):
    transcript = state[
        "transcript_text"
    ]

    word_count = len(
        transcript.split()
    )

    token_estimate = int(
        word_count * 1.3
    )

    log = add_log(
        state,
        (
            f"Analysed transcript: "
            f"{word_count} words "
            f"(~{token_estimate} tokens)"
        ),
    )

    return {
        "transcript_length": word_count,
        "agent_run_log": log,
    }

def route_by_length(
    state: MeetingAgentState,
):
    if state["transcript_length"] > 2500:
        return "chunk_transcript"  
    return "extract_directly"
    

def chunk_transcript_node(
    state: MeetingAgentState,
):
    chunks = chunk_transcript(
        state["transcript_text"]
    )

    log = add_log(
        state,
        f"Split into {len(chunks)} chunks"
    )

    return {
        "chunks": chunks,
        "agent_run_log": log,
    }

def extract_directly(
    state: MeetingAgentState,
) -> dict:

    messages = [
        SystemMessage(
            content=EXTRACTION_SYSTEM_PROMPT
        ),
        HumanMessage(
            content=build_extraction_user_prompt(
                transcript=state["transcript_text"],
                speaker_map=state["speaker_map"],
            )
        ),
    ]

    response = llm.invoke(messages)

    extraction = ExtractionResult.model_validate_json(
        response.content
    )

    log = state["agent_run_log"] + [
        "Extracted transcript directly"
    ]

    return {
        "final_extraction": extraction.model_dump(),
        "confidence": extraction.confidence,
        "agent_run_log": log,
    }

def extract_each_chunk(
    state: MeetingAgentState,
) -> dict:

    chunks = state["chunks"]

    results = []

    log = state["agent_run_log"].copy()
    log.append(
    f"[NODE] extracting chunk "
    f"{index + 1}/{len(chunks)}"
)
    for index, chunk in enumerate(chunks):

        messages = [
            SystemMessage(
                content=EXTRACTION_SYSTEM_PROMPT
            ),
            HumanMessage(
                content=build_extraction_user_prompt(
                    transcript=chunk,
                    speaker_map=state["speaker_map"],
                    is_chunk=True,
                    chunk_index=index,
                    total_chunks=len(chunks),
                )
            ),
        ]

        response = llm.invoke(messages)

        extraction = (
            ExtractionResult.model_validate_json(
                response.content
            )
        )

        results.append(
            extraction.model_dump()
        )

        log.append(
            f"Extracted chunk {index + 1}/{len(chunks)}"
        )

    return {
        "chunk_extractions": results,
        "agent_run_log": log,
    }
    
def reconcile_chunks(
    state: MeetingAgentState,
) -> dict:
    log.append(
    f"[NODE] reconcile_chunks "
    f"merging {len(chunk_extractions)} chunk results"
)
    chunk_extractions = (
        state["chunk_extractions"]
    )

    messages = [
        SystemMessage(
            content=RECONCILIATION_SYSTEM_PROMPT
        ),
        HumanMessage(
            content=build_reconciliation_prompt(
                chunk_extractions
            )
        ),
    ]

    response = llm.invoke(messages)

    merged = ExtractionResult.model_validate_json(
        response.content
    )

    log = state["agent_run_log"] + [
        "Reconciled chunk extractions"
    ]

    return {
        "final_extraction": merged.model_dump(),
        "confidence": merged.confidence,
        "agent_run_log": log,
    }


def check_confidence(
    state: MeetingAgentState,
):
    confidence = (
        state["final_extraction"]
        .get(
            "confidence",
            0.0,
        )
    )
    
    if confidence >= 0.8:
        return "finalise"

    return "flag_for_review"

def flag_review(
    state: MeetingAgentState,
):
    confidence = (
        state["final_extraction"]
        .get(
            "confidence",
            0.0,
        )
    )

    reason = (
        f"Low confidence "
        f"({confidence})"
    )

    log = add_log(
        state,
        (
            "Flagged for human "
            f"review: {reason}"
        ),
    )

    return {
        "needs_human_review": True,
        "review_reason": reason,
        "agent_run_log": log,
    }

def finalise(
    state: MeetingAgentState,
):
    extraction = (
        ExtractionResult(
            **state[
                "final_extraction"
            ]
        )
    )
    
    return {
        "final_extraction":
            extraction.model_dump()
    }

