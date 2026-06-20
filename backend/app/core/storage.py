from pathlib import Path
import logging

from fastapi import UploadFile

from app.core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()


def save_upload(
    file: UploadFile,
    meeting_id: str
) -> str:
    upload_dir = Path(settings.UPLOAD_DIR)

    upload_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    file_path = upload_dir / f"{meeting_id}_{file.filename}"

    with open(file_path, "wb") as buffer:
        buffer.write(file.file.read())

    return str(file_path.resolve())


def delete_upload(
    file_path: str
) -> None:
    path = Path(file_path)

    if path.exists():
        path.unlink()
        logger.info(
            f"Deleted upload: {file_path}"
        )
    else:
        logger.warning(
            f"Upload not found: {file_path}"
        )