from app.core.config import get_settings

from app.services.transcription.base import (
    TranscriptionService,
)

from app.services.transcription.whisperx_service import (
    WhisperXService,
)

from app.services.transcription.deepgram_service import (
    DeepgramService,
)

settings = get_settings()

_transcription_service = None


def get_transcription_service(
) -> TranscriptionService:

    global _transcription_service

    if _transcription_service is not None:
        print("[TRANSCRIPTION SERVICE] Returning cached transcription service instance.")
        return _transcription_service

    provider = (
        settings.TRANSCRIPTION_PROVIDER
        .lower()
    )

    print(f"[TRANSCRIPTION SERVICE] Initializing transcription provider: {provider}")

    if provider == "whisperx":
        print("[TRANSCRIPTION SERVICE] WhisperX provider selected. Instantiating WhisperXService.")
        _transcription_service = (
            WhisperXService()
        )
        print("[TRANSCRIPTION SERVICE] WhisperXService instantiation complete.")
        return _transcription_service

    if provider == "deepgram":
        print("[TRANSCRIPTION SERVICE] Deepgram provider selected. Instantiating DeepgramService.")
        _transcription_service = (
            DeepgramService()
        )
        print("[TRANSCRIPTION SERVICE] DeepgramService instantiation complete.")
        return _transcription_service

    print(f"[TRANSCRIPTION SERVICE] ERROR: Unrecognized provider '{provider}'")
    raise ValueError(
        f"Unknown transcription provider: {provider}"
    )