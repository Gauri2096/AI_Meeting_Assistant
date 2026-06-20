from huggingface_hub import hf_hub_download
import os

os.environ["HF_HUB_DISABLE_XET"] = "1"

hf_hub_download(
    repo_id="Systran/faster-whisper-base",
    filename="config.json"
)