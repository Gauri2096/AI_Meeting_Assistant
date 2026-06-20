import os

os.environ["HF_HUB_DISABLE_XET"] = "1"

import whisperx

audio_file = "sample.wav"

model = whisperx.load_model(
    "base",
    device="cpu",
    compute_type="int8"
)

audio = whisperx.load_audio(audio_file)

result = model.transcribe(audio)

print(result.keys())
print(result)