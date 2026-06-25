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
        print("[DEEPGRAM SERVICE] Initializing DeepgramClient...")
        self.client = DeepgramClient(
            api_key=settings.DEEPGRAM_API_KEY
        )

        logger.info(
            "Deepgram service initialized"
        )
        print("[DEEPGRAM SERVICE] Deepgram service client successfully initialized.")

    def transcribe(
        self,
        audio_file_path: str,
    ) -> dict:

        logger.info(
            f"Starting Deepgram transcription: {audio_file_path}"
        )
        print(f"[DEEPGRAM SERVICE] Transcribe called for audio file: {audio_file_path}")
        
        try:
            file_path = Path(audio_file_path)
            file_size = file_path.stat().st_size
            print(f"[DEEPGRAM SERVICE] Audio file exists: {file_path.exists()}, size: {file_size} bytes")
        except Exception as e:
            print(f"[DEEPGRAM SERVICE] Warning: could not retrieve file statistics: {str(e)}")

        print("[DEEPGRAM SERVICE] Reading audio file into memory...")
        with open(audio_file_path, "rb") as audio:
            buffer_data = audio.read()

        print("[DEEPGRAM SERVICE] Invoking Deepgram API transcribe_file (model: 'nova-3', options: smart_format, punctuate, diarize, utterances, paragraphs)...")
        try:
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
            print("[DEEPGRAM SERVICE] Received response from Deepgram API.")
        except Exception as e:
            print(f"[DEEPGRAM SERVICE] ERROR during Deepgram API call: {str(e)}")
            raise e

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
        
        print(f"[DEEPGRAM SERVICE] Transcript metadata - Duration: {duration}s, Language: {language}, Character count: {len(full_text)}")

        speaker_segments = (
            self._build_segments(
                result.utterances
            )
        )

        logger.info(
            "Deepgram transcription complete"
        )
        print(f"[DEEPGRAM SERVICE] Transcription complete. Final segments count: {len(speaker_segments)}")

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
            print("[DEEPGRAM SERVICE] No utterances found in response. Returning empty segments list.")
            return segments

        print(f"[DEEPGRAM SERVICE] Mapping {len(utterances)} utterances to speaker segments...")
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

        print(f"[DEEPGRAM SERVICE] Speaker segments mapping complete.")
        return segments