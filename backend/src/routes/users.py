from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database.db import (
    get_user_by_id,
    create_user,
)    
from ..utils.utils import authenticate_and_get_user
from ..database.models import get_db
import json
from datetime import datetime

router = APIRouter()

# Pydantic models(for req boundary)
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

# Routes
@router.post("/", response_model=UserResponse)
def create_new_user(user_data: UserCreate, request: Request, db: Session = Depends(get_db)):
    # Get user from Clerk auth
    clerk_user = authenticate_and_get_user(request)
    
    # Check if user already exists
    existing_user = get_user_by_id(db, clerk_user.id)
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Create user in database
    new_user = create_user(
        db=db,
        user_id=clerk_user.id,
        email=user_data.email,
        name=user_data.name
    )
    return new_user

@router.get("/me", response_model=UserResponse)
def get_current_user(request: Request, db: Session = Depends(get_db)):
    # Authenticate and get user from Clerk
    clerk_user = authenticate_and_get_user(request)
    
    # Get user from database
    db_user = get_user_by_id(db, clerk_user.id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return db_user

@router.get("/{user_id}", response_model=UserResponse)
def get_user_by_id_endpoint(user_id: str, db: Session = Depends(get_db)):
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/me", response_model=UserResponse)
def update_current_user(user_data: UserCreate, request: Request, db: Session = Depends(get_db)):
    # Authenticate and get user from Clerk
    clerk_user = authenticate_and_get_user(request)
    
    # Get existing user
    db_user = get_user_by_id(db, clerk_user.id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user fields
    db_user.email = user_data.email
    db_user.name = user_data.name
    
    db.commit()
    db.refresh(db_user)
    return db_user