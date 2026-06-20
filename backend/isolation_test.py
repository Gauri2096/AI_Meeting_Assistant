import time
import whisperx
start = time.time()
import os
from dotenv import load_dotenv
load_dotenv()
diarize_model = whisperx.diarize.DiarizationPipeline(
    token=os.getenv('HF_TOKEN'),
    device="cpu"
)

print("pipeline loaded", time.time() - start)

start = time.time()

diarize_segments = diarize_model('sample_1.wav')

print("diarization finished", time.time() - start)