from fastapi import UploadFile

from app.core.storage import (
    save_upload,
    delete_upload
)

file = UploadFile(
    filename="sample.wav",
    file=open("sample.wav", "rb")
)

path = save_upload(
    file=file,
    meeting_id="123"
)

print(path)

from fastapi import UploadFile

from app.core.storage import (
    save_upload,
    delete_upload
)

file = UploadFile(
    filename="sample.wav",
    file=open("sample.wav", "rb")
)

path = save_upload(
    file=file,
    meeting_id="123"
)

print(path)

delete_upload(path)