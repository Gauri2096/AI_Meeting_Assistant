from abc import ABC, abstractmethod


class TranscriptionService(ABC):
    """
    Standard transcription contract.

    Every provider must return:

    {
        "full_text": str,
        "segments": [
            {
                "speaker": str,
                "text": str,
                "start": float,
                "end": float
            }
        ],
        "language": str,
        "duration": float
    }
    """

    @abstractmethod
    def transcribe(
        self,
        audio_file_path: str,
    ) -> dict:
        pass