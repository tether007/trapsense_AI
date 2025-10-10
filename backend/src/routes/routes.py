from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import uuid
import logging
from fastapi.responses import StreamingResponse
import io
import csv
import zipfile
import requests  # For downloading images from S3(later)

# Local imports
from ..database.db import (
    get_user_by_id,
    create_user,
    create_media,
    get_media_by_user,
    get_media_by_id,
    
)
from ..database.models import get_db
from ..utils.utils import authenticate_and_get_user
#initialize the router and logger
router = APIRouter()
logger = logging.getLogger(__name__)

class UserCreate(BaseModel):
    email: str
    name: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime
    class Config:
        from_attributes = True

# Media
class MediaCreate(BaseModel):
    file_url: str
    folder_path: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class MediaResponse(BaseModel):
    id: str
    user_id: str
    file_url: str
    file_type: str
    folder_path: Optional[str] = None
    latitude: Optional[float]
    longitude: Optional[float]
    uploaded_at: datetime
    classification: Optional[str] = None
    confidence: Optional[float] = None
    species: Optional[str] = None
    class Config:
        from_attributes = True
        
        
# Router setup


@router.post("/users", response_model=UserResponse)
def create_new_user(user_data: UserCreate, request: Request, db: Session = Depends(get_db)):
    clerk_user = authenticate_and_get_user(request)
    existing_user = get_user_by_id(db, clerk_user.id)
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    new_user = create_user(
        db=db,
        user_id=clerk_user.id,
        email=user_data.email,
        name=user_data.name
    )
    return new_user

@router.get("/users/me", response_model=UserResponse)
def get_current_user(request: Request, db: Session = Depends(get_db)):
    clerk_user = authenticate_and_get_user(request)
    db_user = get_user_by_id(db, clerk_user.id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user