from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
import uuid
import os
from datetime import datetime

from ..database.db import (
    create_media,
    get_media_by_user,
    get_media_by_id,
    update_media_status,
)
from ..utils.utils import authenticate_and_get_user
from ..database.models import get_db
from ..services.s3 import generate_presigned_put_url, get_object_url

router = APIRouter()

# Configuration
UPLOAD_DIR = "/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)  # Create directory if doesn't exist

# Pydantic Models
class MediaCreate(BaseModel):
    file_url: str
    file_type: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class MediaResponse(BaseModel):
    id: str
    user_id: str
    file_url: str
    file_type: str
    status: str
    latitude: Optional[float]
    longitude: Optional[float]
    uploaded_at: datetime

    class Config:
        from_attributes = True

class MediaStatusUpdate(BaseModel):
    status: str  # "pending" or "processed"

# File Storage Helper
def save_uploaded_file(file: UploadFile, user_id: str) -> str:
    """Save file locally for now, easy to switch to S3 later"""
    # Generate unique filename/key
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{user_id}_{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # Read file bytes once to avoid reusing/reading a possibly-closed file object
    try:
        # file.file may be a SpooledTemporaryFile or similar; read bytes
        file.file.seek(0)
    except Exception:
        pass
    content_bytes = file.file.read()

    # If S3 is configured, upload to S3 and return the S3 object URL
    try:
        from ..services.s3 import BUCKET_NAME, upload_fileobj_to_s3
        # Only attempt S3 upload if BUCKET_NAME is set
        if BUCKET_NAME:
            import io, logging
            content_type = getattr(file, 'content_type', None)
            fileobj = io.BytesIO(content_bytes)
            try:
                file_url = upload_fileobj_to_s3(fileobj, unique_filename, content_type=content_type)
                return file_url
            except Exception as e:
                logging.exception("S3 upload failed, falling back to local storage: %s", str(e))
    except Exception:
        # If S3 not available in services or import error, fall back to local storage
        pass

    # Fallback: Save file locally
    with open(file_path, "wb") as buffer:
        buffer.write(content_bytes)

    # Return relative local path
    return f"backend/uploads/{unique_filename}"



# Routes
@router.post("/", response_model=MediaResponse)
def create_media_record(
    media_data: MediaCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    # Authenticate user
    clerk_user = authenticate_and_get_user(request)
    
    # Create media in database
    new_media = create_media(
        db=db,
        user_id=clerk_user.id,
        file_url=media_data.file_url,
        file_type=media_data.file_type,
        latitude=media_data.latitude,
        longitude=media_data.longitude
    )
    return new_media

@router.get("/", response_model=List[MediaResponse])
def get_user_media(
    request: Request,
    db: Session = Depends(get_db)
):
    # Authenticate user
    clerk_user = authenticate_and_get_user(request)
    
    # Get all media for this user
    user_media = get_media_by_user(db, clerk_user.id)
    return user_media


@router.get('/presign')
def get_presigned_url(
    request: Request,
    file_name: str,
    file_type: str,
    db: Session = Depends(get_db)
):
    """Return a presigned PUT URL and the resulting file_url for a direct-to-S3 upload.

    Frontend should PUT the raw file bytes to `upload_url` and then call the existing
    `POST /api/media` (or `POST /api/media/`) to create the DB record using the returned `file_url`.
    """
    # Authenticate the user
    clerk_user = authenticate_and_get_user(request)

    # Create an object key that includes the user id so files are namespaced by user
    import uuid
    object_key = f"{clerk_user.id}_{uuid.uuid4()}_{file_name}"

    try:
        upload_url = generate_presigned_put_url(object_key, expiration=3600, content_type=file_type)
        file_url = get_object_url(object_key)
        return {"upload_url": upload_url, "file_url": file_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating presigned URL: {str(e)}")

@router.get("/{media_id}", response_model=MediaResponse)
def get_specific_media(
    media_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    # Authenticate user
    clerk_user = authenticate_and_get_user(request)
    
    # Get media by ID
    media = get_media_by_id(db, media_id)
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    # Check if media belongs to user
    if media.user_id != clerk_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this media")
    
    return media

@router.patch("/{media_id}/status", response_model=MediaResponse)
def update_media_status_endpoint(
    media_id: str,
    status_data: MediaStatusUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    # Authenticate user
    clerk_user = authenticate_and_get_user(request)
    
    # Get media and verify ownership
    media = get_media_by_id(db, media_id)
    if not media or media.user_id != clerk_user.id:
        raise HTTPException(status_code=404, detail="Media not found")
    
    # Update status
    updated_media = update_media_status(db, media_id, status_data.status)
    return updated_media

# Main upload endpoint - handles file storage
@router.post("/upload", response_model=MediaResponse)
def upload_media_file(
    request: Request,
    file: UploadFile = File(...),
    file_type: str = Form(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    db: Session = Depends(get_db)
):
    # Authenticate user
    clerk_user = authenticate_and_get_user(request)
    
    # Validate file type
    if file_type not in ["image", "video"]:
        raise HTTPException(status_code=400, detail="File type must be 'image' or 'video'")
    
    # Validate file extension
    allowed_image_extensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp"]
    allowed_video_extensions = [".mp4", ".avi", ".mov", ".mkv"]
    
    file_extension = os.path.splitext(file.filename.lower())[1]
    
    if file_type == "image" and file_extension not in allowed_image_extensions:
        raise HTTPException(status_code=400, detail="Invalid image file format")
    
    if file_type == "video" and file_extension not in allowed_video_extensions:
        raise HTTPException(status_code=400, detail="Invalid video file format")
    
    try:
        # Save file locally (easy to switch to S3 later)
        file_url = save_uploaded_file(file, clerk_user.id)
        
        # Create media record in database
        new_media = create_media(
            db=db,
            user_id=clerk_user.id,
            file_url=file_url,
            file_type=file_type,
            latitude=latitude,
            longitude=longitude
        )
        
        return new_media
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")


@router.get('/presign')
def get_presigned_url(
    request: Request,
    file_name: str,
    file_type: str,
    db: Session = Depends(get_db)
):
    """Return a presigned PUT URL and the resulting file_url for a direct-to-S3 upload.
    THIS WHOLE ENDPOINT IS USED WHEN THE CLIENT SEND A GET REQUEST TO GET THE PRESIGNED URL->THIS URL IS THEN 'PUT' TO CREATE A SECURED UPLOAD TO S3
    Frontend should PUT the raw file bytes to `upload_url` and then call the existing
    `POST /api/media` (or `POST /api/media/`) to create the DB record using the returned `file_url`.
    """
    # Authenticate the user
    clerk_user = authenticate_and_get_user(request)

    # Create an object key that includes the user id so files are namespaced by user
    import uuid
    object_key = f"{clerk_user.id}_{uuid.uuid4()}_{file_name}"

    try:
        upload_url = generate_presigned_put_url(object_key, expiration=3600, content_type=file_type)
        file_url = get_object_url(object_key)
        return {"upload_url": upload_url, "file_url": file_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating presigned URL: {str(e)}")