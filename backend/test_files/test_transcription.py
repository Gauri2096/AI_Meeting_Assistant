from pprint import pprint
import json
from pathlib import Path

from app.services.transcription.transcription_service import (
    get_transcription_service
)

AUDIO_FILE = r"C:\Projects\Meet_Assistant\backend\sample.wav"


def main():
    print("=" * 80)
    print("INITIALIZING TRANSCRIPTION SERVICE")
    print("=" * 80)

    service = get_transcription_service()

    print("\nService loaded successfully")

    print("\n" + "=" * 80)
    print("STARTING TRANSCRIPTION")
    print("=" * 80)

    result = service.transcribe(AUDIO_FILE)

    print("\n" + "=" * 80)
    print("METADATA")
    print("=" * 80)

    print(f"Language : {result['language']}")
    print(f"Duration : {result['duration']:.2f}s")
    print(f"Turns     : {len(result['segments'])}")

    print("\n" + "=" * 80)
    print("FULL TRANSCRIPT")
    print("=" * 80)

    print(result["full_text"])

    print("\n" + "=" * 80)
    print("SPEAKER TURNS")
    print("=" * 80)

    for i, segment in enumerate(result["segments"], start=1):
        print(
            f"\n[{i}] "
            f"{segment['speaker']} "
            f"({segment['start']:.2f}s → {segment['end']:.2f}s)"
        )
        print(segment["text"])

    print("\n" + "=" * 80)
    print("FIRST 5 SEGMENTS (RAW STRUCTURE)")
    print("=" * 80)

    pprint(result["segments"][:5])

    print("\n" + "=" * 80)
    print("VALIDATING CONTRACT")
    print("=" * 80)

    required_keys = {
        "full_text",
        "segments",
        "language",
        "duration"
    }

    missing = required_keys - set(result.keys())

    if missing:
        print(f"FAILED - Missing keys: {missing}")
    else:
        print("PASSED - Top level schema valid")

    for idx, segment in enumerate(result["segments"]):
        segment_keys = {
            "speaker",
            "text",
            "start",
            "end"
        }

        missing_segment_keys = (
            segment_keys - set(segment.keys())
        )

        if missing_segment_keys:
            print(
                f"FAILED - Segment {idx} missing "
                f"{missing_segment_keys}"
            )
            break
    else:
        print("PASSED - Segment schema valid")

    print("\n" + "=" * 80)
    print("SAVING OUTPUT")
    print("=" * 80)

    output_file = Path("transcription_output.json")

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(
            result,
            f,
            indent=2,
            ensure_ascii=False
        )

    print(f"Saved output to: {output_file.resolve()}")

    print("\n" + "=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    main()