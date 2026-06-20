from abc import ABC, abstractmethod
import gc
import logging

import whisperx

from app.core.config import get_settings

settings = get_settings()

logger = logging.getLogger(__name__)


# CONTRACT:
# Every transcription provider must return exactly:
#
# {
#     "full_text": str,
#     "segments": [
#         {
#             "speaker": str,
#             "text": str,
#             "start": float,
#             "end": float
#         }
#     ],
#     "language": str,
#     "duration": float
# }
#
class TranscriptionService(ABC):
    """
    Standard transcription contract.
    """

    @abstractmethod
    def transcribe(self, audio_file_path: str) -> dict:
        pass


class WhisperXService(TranscriptionService):
    def __init__(self):
        logger.info("Loading WhisperX model...")

        self.model = whisperx.load_model(
            settings.WHISPER_MODEL_SIZE,
            device="cpu",
            compute_type="int8"
        )

        logger.info("Loading diarization pipeline...")

        self.diarization_pipeline = whisperx.diarize.DiarizationPipeline(
            token=settings.HF_TOKEN,
            device="cpu"
        )

        # Cache alignment models by language
        self.align_models = {}

        logger.info("WhisperX service initialized")

    def transcribe(self, audio_file_path: str) -> dict:
        logger.info(f"Starting transcription: {audio_file_path}")

        audio = whisperx.load_audio(audio_file_path)

        # -------------------------
        # Transcription
        # -------------------------
        result = self.model.transcribe(audio)

        language = result["language"]

        logger.info(f"Detected language: {language}")

        # -------------------------
        # Alignment model caching
        # -------------------------
        if language not in self.align_models:
            logger.info(
                f"Loading alignment model for language: {language}"
            )

            self.align_models[language] = whisperx.load_align_model(
                language_code=language,
                device="cpu"
            )

        align_model, metadata = self.align_models[language]

        # -------------------------
        # Alignment
        # -------------------------
        logger.info("Running alignment...")

        aligned_result = whisperx.align(
            result["segments"],
            align_model,
            metadata,
            audio,
            device="cpu"
        )

        logger.info("Alignment complete")

        # -------------------------
        # Diarization
        # -------------------------
        try:
            logger.info("Running diarization...")

            diarization_result = self.diarization_pipeline(
                audio_file_path
            )

            logger.info("Assigning speakers...")

            final_result = whisperx.assign_word_speakers(
                diarization_result,
                aligned_result
            )

            speaker_turns = self._group_speaker_turns(
                final_result["segments"]
            )

            logger.info("Diarization complete")

        except Exception as e:
            logger.exception(
                "Diarization failed. Falling back to UNKNOWN speaker."
            )

            speaker_turns = [
                {
                    "speaker": "UNKNOWN",
                    "text": segment.get("text", "").strip(),
                    "start": segment["start"],
                    "end": segment["end"]
                }
                for segment in aligned_result["segments"]
                if segment.get("text", "").strip()
            ]

        # -------------------------
        # Build response
        # -------------------------
        full_text = " ".join(
            segment["text"].strip()
            for segment in speaker_turns
        ).strip()

        duration = (
            max(segment["end"] for segment in speaker_turns)
            if speaker_turns
            else 0.0
        )

        logger.info(
            f"Transcription complete. Duration={duration:.2f}s"
        )

        gc.collect()

        return {
            "full_text": full_text,
            "segments": speaker_turns,
            "language": language,
            "duration": duration
        }

    def _group_speaker_turns(self, segments: list) -> list:
        grouped = []

        current = None

        for segment in segments:
            speaker = segment.get("speaker", "UNKNOWN")
            text = segment.get("text", "").strip()

            if not text:
                continue

            if current is None:
                current = {
                    "speaker": speaker,
                    "text": text,
                    "start": segment["start"],
                    "end": segment["end"]
                }
                continue

            if speaker == current["speaker"]:
                current["text"] += " " + text
                current["end"] = segment["end"]

            else:
                grouped.append(current)

                current = {
                    "speaker": speaker,
                    "text": text,
                    "start": segment["start"],
                    "end": segment["end"]
                }

        if current:
            grouped.append(current)

        return grouped


_transcription_service = None


def get_transcription_service() -> TranscriptionService:
    global _transcription_service

    if _transcription_service is not None:
        return _transcription_service

    provider = settings.TRANSCRIPTION_PROVIDER.lower()

    if provider == "whisperx":
        _transcription_service = WhisperXService()
        return _transcription_service

    raise ValueError(
        f"Unknown transcription provider: {provider}"
    )