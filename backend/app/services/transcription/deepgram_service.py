import logging
from pathlib import Path

from deepgram import DeepgramClient

from app.core.config import get_settings
from app.services.transcription.base import (
    TranscriptionService,
)

settings = get_settings()

logger = logging.getLogger(__name__)


class DeepgramService(TranscriptionService):

    def __init__(self):
        self.client = DeepgramClient(
            api_key=settings.DEEPGRAM_API_KEY
        )

        logger.info(
            "Deepgram service initialized"
        )

    def transcribe(
        self,
        audio_file_path: str,
    ) -> dict:

        logger.info(
            f"Starting Deepgram transcription: {audio_file_path}"
        )

        with open(audio_file_path, "rb") as audio:
            buffer_data = audio.read()

        response = (
            self.client.listen
            .v1
            .media
            .transcribe_file(
                request=buffer_data,
                model="nova-3",

                smart_format=True,
                punctuate=True,

                diarize=True,
                utterances=True,

                paragraphs=True,
            )
        )

        result = response.results

        alternative = (
            result.channels[0]
            .alternatives[0]
        )

        full_text = alternative.transcript

        language = (
            alternative.language
            if hasattr(alternative, "language")
            else "en"
        )

        duration = (
            response.metadata.duration
        )

        speaker_segments = (
            self._build_segments(
                result.utterances
            )
        )

        logger.info(
            "Deepgram transcription complete"
        )

        return {
            "full_text": full_text,
            "segments": speaker_segments,
            "language": language,
            "duration": duration,
        }

    def _build_segments(
        self,
        utterances,
    ):

        segments = []

        if not utterances:
            return segments

        for utterance in utterances:

            speaker = (
                f"SPEAKER_{utterance.speaker:02d}"
            )

            segments.append(
                {
                    "speaker": speaker,
                    "text": utterance.transcript.strip(),
                    "start": utterance.start,
                    "end": utterance.end,
                }
            )

        return segments