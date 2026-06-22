from deepgram import DeepgramClient
import json
from dotenv import load_dotenv
load_dotenv()
import os
deepgram = DeepgramClient(
    api_key=os.getenv("DEEPGRAM_API_KEY")
)
with open("test_files/sample_3.wav", "rb") as f:
    audio_bytes = f.read()

response = deepgram.listen.v1.media.transcribe_file(
    request=audio_bytes,
    model="nova-3",
    diarize=True,
    utterances=True,
    punctuate=True,
    smart_format=True,
)

print(response.results.utterances)