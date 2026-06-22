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
        return _transcription_service

    provider = (
        settings.TRANSCRIPTION_PROVIDER
        .lower()
    )

    if provider == "whisperx":

        _transcription_service = (
            WhisperXService()
        )

        return _transcription_service

    if provider == "deepgram":

        _transcription_service = (
            DeepgramService()
        )

        return _transcription_service

    raise ValueError(
        f"Unknown transcription provider: {provider}"
    )