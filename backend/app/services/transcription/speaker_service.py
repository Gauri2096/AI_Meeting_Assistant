def build_processed_text(
    segments: list,
    mappings: dict,
) -> str:

    lines = []

    for segment in segments:

        speaker_label = segment["speaker"]

        val = mappings.get(speaker_label)
        if isinstance(val, dict):
            speaker_name = val.get("name") or speaker_label
        elif isinstance(val, str):
            speaker_name = val
        else:
            speaker_name = speaker_label

        lines.append(
            f"{speaker_name}: {segment['text']}"
        )

    return "\n\n".join(lines)