def build_processed_text(
    segments: list,
    mappings: dict,
) -> str:

    lines = []

    for segment in segments:

        speaker_label = segment["speaker"]

        metadata = mappings.get(
            speaker_label,
            {},
        )

        speaker_name = (
            metadata.get("name")
            or speaker_label
        )

        lines.append(
            f"{speaker_name}: {segment['text']}"
        )

    return "\n\n".join(lines)