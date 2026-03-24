import uuid
import os
import aiofiles
from fastapi import UploadFile, HTTPException

UPLOAD_DIR = './database/images'
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_MB = 50


class ImageHandler:
    def __init__(self, upload_dir: str = UPLOAD_DIR):
        self.upload_dir = upload_dir
        os.makedirs(upload_dir, exist_ok=True)

    async def save(self, file: UploadFile) -> str:
        """Validates and saves an image, returns the URL path."""
        self._validate_type(file)
        await self._validate_size(file)

        filename = self._generate_filename(file.filename)
        path = os.path.join(self.upload_dir, filename)

        async with aiofiles.open(path, "wb") as f:
            await f.write(await file.read())

        return f"/images/{filename}"

    def delete(self, image_url: str):
        """Deletes an image file given its URL path."""
        filename = image_url.split("/")[-1]
        path = os.path.join(self.upload_dir, filename)
        if os.path.exists(path):
            os.remove(path)

    def _validate_type(self, file: UploadFile):
        if file.content_type not in ALLOWED_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_TYPES)}"
            )

    async def _validate_size(self, file: UploadFile):
        contents = await file.read()
        size_mb = len(contents) / (1024 * 1024)
        if size_mb > MAX_SIZE_MB:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Max size is {MAX_SIZE_MB}MB"
            )
        await file.seek(0)  # reset cursor after reading

    def _generate_filename(self, original: str) -> str:
        ext = original.rsplit(".", 1)[-1]
        return f"{uuid.uuid4()}.{ext}"


image_handler = ImageHandler()
