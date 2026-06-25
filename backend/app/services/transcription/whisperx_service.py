import gc
import logging

import whisperx

from app.core.config import get_settings
from app.services.transcription.base import (
    TranscriptionService,
)

settings = get_settings()

logger = logging.getLogger(__name__)


class WhisperXService(TranscriptionService):
    def __init__(self):
        logger.info("Loading WhisperX model...")
        print(f"[WHISPERX SERVICE] Initializing WhisperXService...")
        print(f"[WHISPERX SERVICE] Loading WhisperX model size: '{settings.WHISPER_MODEL_SIZE}' on device 'cpu' (compute_type: int8)...")

        self.model = whisperx.load_model(
            settings.WHISPER_MODEL_SIZE,
            device="cpu",
            compute_type="int8",
        )

        logger.info("Loading diarization pipeline...")
        print("[WHISPERX SERVICE] Loading PyTorch/HuggingFace Diarization pipeline on device 'cpu'...")

        self.diarization_pipeline = (
            whisperx.diarize.DiarizationPipeline(
                token=settings.HF_TOKEN,
                device="cpu",
            )
        )

        self.align_models = {}

        logger.info(
            "WhisperX service initialized"
        )
        print("[WHISPERX SERVICE] WhisperXService successfully initialized.")

    def transcribe(
        self,
        audio_file_path: str,
    ) -> dict:

        logger.info(
            f"Starting transcription: {audio_file_path}"
        )
        print(f"[WHISPERX SERVICE] Transcribe called for audio file: {audio_file_path}")

        print("[WHISPERX SERVICE] Loading audio via whisperx.load_audio()...")
        audio = whisperx.load_audio(
            audio_file_path
        )

        print("[WHISPERX SERVICE] Running model.transcribe() on loaded audio...")
        result = self.model.transcribe(audio)

        language = result["language"]

        logger.info(
            f"Detected language: {language}"
        )
        print(f"[WHISPERX SERVICE] Initial transcription finished. Detected language: {language}")

        if language not in self.align_models:

            logger.info(
                f"Loading alignment model for language: {language}"
            )
            print(f"[WHISPERX SERVICE] Loading alignment model for language: {language} on device 'cpu'...")

            self.align_models[
                language
            ] = whisperx.load_align_model(
                language_code=language,
                device="cpu",
            )

        align_model, metadata = (
            self.align_models[language]
        )

        logger.info("Running alignment...")
        print(f"[WHISPERX SERVICE] Running word-level alignment for language '{language}'...")

        aligned_result = whisperx.align(
            result["segments"],
            align_model,
            metadata,
            audio,
            device="cpu",
        )

        logger.info("Alignment complete")
        print("[WHISPERX SERVICE] Word alignment complete.")

        try:

            logger.info("Running diarization...")
            print("[WHISPERX SERVICE] Running diarization pipeline...")

            diarization_result = (
                self.diarization_pipeline(
                    audio_file_path
                )
            )

            logger.info(
                "Assigning speakers..."
            )
            print("[WHISPERX SERVICE] Diarization pipeline finished. Assigning speakers to word-level alignment...")

            final_result = (
                whisperx.assign_word_speakers(
                    diarization_result,
                    aligned_result,
                )
            )

            print("[WHISPERX SERVICE] Speaker assignment complete. Grouping speaker turns...")
            speaker_turns = (
                self._group_speaker_turns(
                    final_result["segments"]
                )
            )

            logger.info(
                "Diarization complete"
            )
            print(f"[WHISPERX SERVICE] Diarization process complete. Formatted speaker turns count: {len(speaker_turns)}")

        except Exception as e:

            logger.exception(
                "Diarization failed."
            )
            print(f"[WHISPERX SERVICE] ERROR: Diarization/Speaker-Assignment failed: {str(e)}. Falling back to UNKNOWN speaker assignment.")

            speaker_turns = [
                {
                    "speaker": "UNKNOWN",
                    "text": segment.get(
                        "text",
                        "",
                    ).strip(),
                    "start": segment[
                        "start"
                    ],
                    "end": segment["end"],
                }
                for segment in aligned_result[
                    "segments"
                ]
                if segment.get(
                    "text",
                    "",
                ).strip()
            ]

        full_text = " ".join(
            segment["text"].strip()
            for segment in speaker_turns
        ).strip()

        duration = (
            max(
                segment["end"]
                for segment in speaker_turns
            )
            if speaker_turns
            else 0.0
        )

        print(f"[WHISPERX SERVICE] Collecting garbage and finalizing...")
        gc.collect()
        
        print(f"[WHISPERX SERVICE] Transcription run finalized. Full Text character count: {len(full_text)}, Total duration: {duration}s")

        return {
            "full_text": full_text,
            "segments": speaker_turns,
            "language": language,
            "duration": duration,
        }

    def _group_speaker_turns(
        self,
        segments: list,
    ) -> list:

        grouped = []

        current = None

        print(f"[WHISPERX SERVICE] Grouping {len(segments)} segments into speaker turns...")
        for segment in segments:

            speaker = segment.get(
                "speaker",
                "UNKNOWN",
            )

            text = segment.get(
                "text",
                "",
            ).strip()

            if not text:
                continue

            if current is None:

                current = {
                    "speaker": speaker,
                    "text": text,
                    "start": segment[
                        "start"
                    ],
                    "end": segment["end"],
                }

                continue

            if (
                speaker
                == current["speaker"]
            ):
                current["text"] += (
                    " " + text
                )
                current["end"] = segment[
                    "end"
                ]

            else:

                grouped.append(current)

                current = {
                    "speaker": speaker,
                    "text": text,
                    "start": segment[
                        "start"
                    ],
                    "end": segment["end"],
                }

        if current:
            grouped.append(current)

        print(f"[WHISPERX SERVICE] Speaker turns grouping complete. Reduced to {len(grouped)} grouped speaker turns.")
        return grouped