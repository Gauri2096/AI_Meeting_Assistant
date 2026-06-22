from deepgram import DeepgramClient
from dotenv import load_dotenv
load_dotenv()
import inspect
import os
deepgram = DeepgramClient(
    api_key=os.getenv("DEEPGRAM_API_KEY")
)


print(
    inspect.signature(
        deepgram.listen.v1.media.transcribe_file
    )
)