import json


EXTRACTION_JSON_SCHEMA = {
    "summary": "string",
    "decisions": ["string"],
    "topics_discussed": [
        {
            "title": "string",
            "discussion": "string"
        }
    ],
    "risks_and_concerns": ["string"],
    "notable_quotes": [
        {
            "speaker": "string",
            "quote": "string"
        }
    ],
    "action_items": [
        {
            "description": "string",
            "owner": "string",
            "deadline_mentioned": "string"
        }
    ],
    "confidence": 0.0
}


EXTRACTION_SYSTEM_PROMPT = """
You are a meeting intelligence analyst for a financial institution.

Your task is to analyse meeting transcripts and extract structured intelligence.

Rules:

- Return ONLY valid JSON.
- Response must start with { and end with }.
- Do not include markdown.
- Do not explain your reasoning.
- Do not invent facts.
- Extract only information explicitly mentioned.
- If something is not stated, leave it empty.
- Confidence must be a float between 0 and 1.
"""


def build_extraction_user_prompt(
    transcript: str,
    speaker_map: dict,
    is_chunk: bool = False,
    chunk_index: int = 0,
    total_chunks: int = 1,
) -> str:

    chunk_note = ""

    if is_chunk:
        chunk_note = (
            f"\n\n"
            f"This is chunk {chunk_index + 1} "
            f"of {total_chunks}. "
            f"Extract all relevant items from this "
            f"section only.\n"
        )

    return f"""
Speaker Map:
{speaker_map}

{chunk_note}

Transcript:
{transcript}

Return JSON matching this schema exactly:

{json.dumps(EXTRACTION_JSON_SCHEMA, indent=2)}
"""

RECONCILIATION_SYSTEM_PROMPT = """
You are a senior meeting intelligence analyst.

You are given multiple extraction results produced from
different transcript chunks.

Your task:

- Merge all chunk results.
- Remove duplicate decisions.
- Remove duplicate action items.
- Merge similar topics into one topic.
- Keep all unique risks and concerns.
- Keep all unique notable quotes.
- Generate a single consolidated summary.
- Compute an overall confidence score between 0 and 1.

Return ONLY valid JSON.

Response must start with { and end with }.
"""

def build_reconciliation_prompt(
    chunk_extractions: list,
) -> str:

    return f"""
The following extraction results were produced
from different transcript chunks.

Merge them into one final extraction.

Chunk Extractions:

{json.dumps(chunk_extractions, indent=2)}

Return JSON using this schema:

{json.dumps(EXTRACTION_JSON_SCHEMA, indent=2)}
"""

