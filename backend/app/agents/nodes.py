from alembic.autogenerate.api import log
from tarfile import ExtractError
from langchain_google_genai import (
    ChatGoogleGenerativeAI,
)
from langchain_groq import ChatGroq

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

gemini_llm = ChatGoogleGenerativeAI(
    model=settings.GEMINI_MODEL,
    google_api_key=settings.GOOGLE_API_KEY,
    temperature=0.1,
)

groq_llm = ChatGroq(
    model=settings.GROQ_MODEL,
    api_key=settings.GROQ_API_KEY,
    temperature=0.1,
)
structured_gemini = (
    gemini_llm.with_structured_output(
        ExtractionResult
    )
)

structured_groq = (
    groq_llm.with_structured_output(
        ExtractionResult
    )
)

def invoke_with_fallback(messages):

    try:
        print("Using Gemini")

        return structured_gemini.invoke(messages)

    except Exception as e:

        print(
            f"Gemini failed: {str(e)}"
        )

        print("Using Groq fallback")

        return structured_groq.invoke(messages)

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

    return invoke_with_fallback(messages)

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

    return invoke_with_fallback(messages)



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

    print(f"[NODE analyse_transcript] Analyzing transcript: {word_count} words (estimated ~{token_estimate} tokens).")

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
    length = state["transcript_length"]
    print(f"[NODE route_by_length] Checking routing. Transcript length: {length} words.")
    if length > 2500:
        print("[NODE route_by_length] Transcript length > 2500. Routing to 'chunk_transcript'.")
        return "chunk_transcript"  
    print("[NODE route_by_length] Transcript length <= 2500. Routing to 'extract_directly'.")
    return "extract_directly"
    

def chunk_transcript_node(
    state: MeetingAgentState,
):
    print("[NODE chunk_transcript] Splitting transcript into smaller chunks...")
    chunks = chunk_transcript(
        state["transcript_text"]
    )
    print(f"[NODE chunk_transcript] Split complete. Created {len(chunks)} chunks.")

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

    print(f"[NODE extract_directly] Invoking LLM ({settings.GEMINI_MODEL}) for direct extraction...")
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

    try:
        response = invoke_with_fallback(messages)
        print("[NODE extract_directly] LLM response received.")
    except Exception as e:
        print(f"[NODE extract_directly] ERROR during LLM execution: {str(e)}")
        raise e

    extraction = response
    print(f"[NODE extract_directly] Parsed extraction result. Confidence: {extraction.confidence}")

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
    print(f"[NODE extract_each_chunk] Starting extraction of {len(chunks)} chunks using LLM: {settings.GEMINI_MODEL}...")

    results = []
    log = state["agent_run_log"].copy()

    for index, chunk in enumerate(chunks):
        print(f"[NODE extract_each_chunk] Processing chunk {index + 1}/{len(chunks)}...")
        log.append(
            f"[NODE] extracting chunk "
            f"{index + 1}/{len(chunks)}"
        )

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

        try:
            response = invoke_with_fallback(messages)
            print(f"[NODE extract_each_chunk] LLM response received for chunk {index + 1}/{len(chunks)}.")
        except Exception as e:
            print(f"[NODE extract_each_chunk] ERROR during LLM execution for chunk {index + 1}/{len(chunks)}: {str(e)}")
            raise e

        extraction = response
        print(f"[NODE extract_each_chunk] Chunk {index + 1} parsed confidence: {extraction.confidence}")

        results.append(
            extraction.model_dump()
        )

        log.append(
            f"Extracted chunk {index + 1}/{len(chunks)}"
        )

    print(f"[NODE extract_each_chunk] Finished extracting all {len(chunks)} chunks.")
    return {
        "chunk_extractions": results,
        "agent_run_log": log,
    }
    
def reconcile_chunks(
    state: MeetingAgentState,
) -> dict:
    chunk_extractions = (
        state["chunk_extractions"]
    )
    log = state["agent_run_log"].copy()

    print(f"[NODE reconcile_chunks] Merging/reconciling {len(chunk_extractions)} chunk results using LLM: {settings.GEMINI_MODEL}...")
    log.append(
        f"[NODE] reconcile_chunks "
        f"merging {len(chunk_extractions)} chunk results"
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

    try:
        response = invoke_with_fallback(messages)
        print("[NODE reconcile_chunks] LLM reconciliation response received.")
    except Exception as e:
        print(f"[NODE reconcile_chunks] ERROR during LLM reconciliation execution: {str(e)}")
        raise e

    merged = response
    print(f"[NODE reconcile_chunks] Reconciliation parsed. Confidence: {merged.confidence}")

    log = log + [
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
    print(f"[NODE check_confidence] Evaluation of confidence: {confidence}")
    if confidence >= 0.8:
        print("[NODE check_confidence] Confidence meets threshold (>= 0.8). Routing to 'finalise'.")
        return "finalise"

    print("[NODE check_confidence] Confidence is low (< 0.8). Routing to 'flag_for_review'.")
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

    print(f"[NODE flag_review] Flagging meeting analysis for human review: {reason}")
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
    print("[NODE finalise] Finalizing extracted structure...")
    extraction = (
        ExtractionResult(
            **state[
                "final_extraction"
            ]
        )
    )
    print("[NODE finalise] Finalization complete.")
    return {
        "final_extraction":
            extraction.model_dump()
    }

