from langgraph.graph import StateGraph, END

from app.agents.state import MeetingAgentState
from app.agents.nodes import (
    analyse_transcript,
    route_by_length,
    chunk_transcript_node,
    extract_directly,
    extract_each_chunk,
    reconcile_chunks,
    check_confidence,
    flag_review,
    finalise,
)

def build_graph():

    graph = StateGraph(MeetingAgentState)

    graph.add_node(
        "analyse_transcript",
        analyse_transcript,
    )

    graph.add_node(
        "chunk_transcript",
        chunk_transcript_node,
    )

    graph.add_node(
        "extract_directly",
        extract_directly,
    )

    graph.add_node(
        "extract_each_chunk",
        extract_each_chunk,
    )

    graph.add_node(
        "reconcile_chunks",
        reconcile_chunks,
    )

    graph.add_node(
        "flag_review",
        flag_review,
    )

    graph.add_node(
        "finalise",
        finalise,
    )

    graph.set_entry_point(
        "analyse_transcript"
    )

    graph.add_conditional_edges(
        "analyse_transcript",
        route_by_length,
        {
            "chunk_transcript": "chunk_transcript",
            "extract_directly": "extract_directly",
        },
    )
    graph.add_edge(
        "chunk_transcript",
        "extract_each_chunk"
    )

    graph.add_edge(
        "extract_each_chunk",
        "reconcile_chunks"
    )

    graph.add_conditional_edges(
        "extract_directly",
        check_confidence,
        {
            "finalise": "finalise",
            "flag_for_review": "flag_review",
        },
    )

    graph.add_edge(
        "flag_review",
        "finalise"
    )

    graph.add_edge(
        "finalise",
        END
    )

    return graph.compile()

def run_extraction_agent(
    meeting_id: str,
    transcript_text: str,
    speaker_map: dict,
) -> dict:

    print(f"[AGENT GRAPH] Compiling extraction state graph for meeting ID: {meeting_id}...")
    graph = build_graph()
    print("[AGENT GRAPH] Graph compiled successfully.")

    initial_state = {
        "meeting_id": meeting_id,
        "transcript_text": transcript_text,
        "speaker_map": speaker_map,

        "transcript_length": 0,
        "chunks": [],
        "chunk_extractions": [],
        "final_extraction": {},

        "confidence": 0.0,

        "needs_human_review": False,
        "review_reason": "",

        "agent_run_log": [],
        "error": "",
    }

    print(f"[AGENT GRAPH] Invoking graph. Transcript length: {len(transcript_text)} characters, Speaker map entries: {len(speaker_map) if speaker_map else 0}.")
    try:
        result = graph.invoke(
            initial_state
        )
        print(f"[AGENT GRAPH] Graph execution completed successfully. Needs human review: {result.get('needs_human_review')}, Confidence: {result.get('confidence')}")
    except Exception as e:
        print(f"[AGENT GRAPH] ERROR during Graph execution: {str(e)}")
        raise e

    return result