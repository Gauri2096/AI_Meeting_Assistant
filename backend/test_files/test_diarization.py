import os
from dotenv import load_dotenv
import time
load_dotenv()
import whisperx

os.environ["HF_HUB_DISABLE_XET"] = "1"
HF_TOKEN = os.getenv('HF_TOKEN')

audio_file = "test_files/sample_3.wav"

# Step 1: Load WhisperX model
model = whisperx.load_model(
    "base",
    device="cpu",
    compute_type="int8"
)
start=time.time()

# Step 2: Load audio
audio = whisperx.load_audio(audio_file)

# Step 3: Transcribe
result = model.transcribe(audio)
print("transcribe:", time.time() - start)

print("Transcription complete")
start=time.time()
# Step 4: Alignment model
model_a, metadata = whisperx.load_align_model(
    language_code=result["language"],
    device="cpu"
)

# Step 5: Align words
result = whisperx.align(
    result["segments"],
    model_a,
    metadata,
    audio,
    device="cpu"
)
print("alignment:", time.time() - start)
print("Alignment complete")

start=time.time()
# Step 6: Speaker diarization
diarize_model = whisperx.diarize.DiarizationPipeline(
    token=HF_TOKEN,
    device="cpu"
)

diarize_segments = diarize_model(audio_file)

print("Diarization complete")
print("diarization:", time.time() - start)

start=time.time()
# Step 7: Assign speakers to words
result = whisperx.assign_word_speakers(
    diarize_segments,
    result
)

print("speaker_assignment:", time.time() - start)
print("Speaker assignment complete")

# Step 8: Print output
for segment in result["segments"]:
    speaker = segment.get("speaker", "UNKNOWN")
    text = segment.get("text", "")

    print(f"\n[{speaker}]")
    print(text)