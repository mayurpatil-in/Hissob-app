"""
Upload Router for saving static files (like logos, qr codes, receipts).
"""
import os
import shutil
import uuid

from fastapi import APIRouter
from fastapi import Depends
from fastapi import File
from fastapi import HTTPException
from fastapi import UploadFile

from app.auth.deps import get_current_active_user
from app.core.config import settings
from app.models.user import User

router = APIRouter(prefix="/upload", tags=["Uploads"])

@router.post("", response_model=dict, summary="Upload a file")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """
    Upload a file to the static uploads directory.
    Returns the URL to access the file.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")

    # Generate unique filename
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".pdf"]:
        raise HTTPException(status_code=400, detail="Invalid file type")

    unique_filename = f"{uuid.uuid4().hex}{ext}"
    upload_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    # Save file
    try:
        with open(upload_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {e}")

    # Return relative URL
    return {"url": f"/uploads/{unique_filename}"}
