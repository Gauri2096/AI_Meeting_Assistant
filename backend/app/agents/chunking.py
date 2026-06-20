from typing import List


def chunk_transcript(
    text: str,
    chunk_size: int = 3000,
    overlap: int = 200,
) -> List[str]:
    """
    Deterministically split transcript into
    overlapping word-based chunks.

    Example:

    chunk 1 = words 0-3000
    chunk 2 = words 2800-5800
    chunk 3 = words 5600-8600
    """

    words = text.split()

    if not words:
        return []

    chunks = []

    start = 0

    while start < len(words):
        end = start + chunk_size

        chunk = " ".join(
            words[start:end]
        )

        chunks.append(chunk)

        if end >= len(words):
            break

        start = end - overlap

    return chunks