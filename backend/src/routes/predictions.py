from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from ..database.db import (
    create_prediction,
    get_predictions_by_media,
    get_prediction_by_id,
    get_prediction_by_user,
)
from ..utils.utils import authenticate_and_get_user
from ..database.models import get_db

router = APIRouter()

# Pydantic Models
class PredictionCreate(BaseModel):
    media_id: str
    species: str
    confidence: float
    is_human: bool = False

class PredictionResponse(BaseModel):
    id: str
    media_id: str
    species: str
    confidence: float
    is_human: bool
    detected_at: datetime

    class Config:
        from_attributes = True

class PredictionWithMediaResponse(BaseModel):
    id: str
    media_id: str
    species: str
    confidence: float
    is_human: bool
    detected_at: datetime
    media_file_url: str
    media_file_type: str
    media_uploaded_at: datetime

    class Config:
        from_attributes = True

class BulkPredictionCreate(BaseModel):
    media_id: str
    predictions: List[dict]  # List of species with confidence

# Routes
@router.post("/", response_model=PredictionResponse)
def create_prediction_record(
    prediction_data: PredictionCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    # Authenticate user
    clerk_user = authenticate_and_get_user(request)
    
    # Create prediction in database
    new_prediction = create_prediction(
        db=db,
        media_id=prediction_data.media_id,
        species=prediction_data.species,
        confidence=prediction_data.confidence,
        is_human=prediction_data.is_human
    )
    return new_prediction

@router.post("/bulk", response_model=List[PredictionResponse])
def create_bulk_predictions(
    bulk_data: BulkPredictionCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    # Authenticate user
    clerk_user = authenticate_and_get_user(request)
    
    created_predictions = []
    
    # Create multiple predictions for one media file
    # (e.g., multiple animals in one image)
    for pred in bulk_data.predictions:
        new_prediction = create_prediction(
            db=db,
            media_id=bulk_data.media_id,
            species=pred["species"],
            confidence=pred["confidence"],
            is_human=pred.get("is_human", False)
        )
        created_predictions.append(new_prediction)
    
    return created_predictions

@router.get("/media/{media_id}", response_model=List[PredictionResponse])
def get_predictions_for_media(
    media_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    # Authenticate user
    clerk_user = authenticate_and_get_user(request)
    
    # Get all predictions for this media file
    predictions = get_predictions_by_media(db, media_id)
    return predictions

@router.get("/{prediction_id}", response_model=PredictionResponse)
def get_specific_prediction(
    prediction_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    # Authenticate user
    clerk_user = authenticate_and_get_user(request)
    
    # Get prediction by ID
    prediction = get_prediction_by_id(db, prediction_id)
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")
    
    return prediction

@router.get("/user/recent", response_model=List[PredictionWithMediaResponse])
def get_user_recent_predictions(
    request: Request,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    # Authenticate user
    clerk_user = authenticate_and_get_user(request)
    
    # Get recent predictions for user with media info
    predictions = get_predictions_by_user(db, clerk_user.id, limit)
    return predictions

@router.get("/species/{species_name}", response_model=List[PredictionWithMediaResponse])
def get_predictions_by_species(
    species_name: str,
    request: Request,
    db: Session = Depends(get_db)
):
    # Authenticate user
    clerk_user = authenticate_and_get_user(request)
    
    # Get predictions filtered by species
    species_predictions = get_predictions_by_species(db, clerk_user.id, species_name)
    return species_predictions

# AI Processing Webhook (for external AI services)
@router.post("/webhook/process")
def ai_processing_webhook(
    media_id: str,
    predictions: List[dict],
    db: Session = Depends(get_db)
):
    """
    Webhook endpoint for AI service to send processing results
    This would be called by your AI model after processing media
    """
    try:
        created_predictions = []
        
        for pred in predictions:
            new_pred = create_prediction(
                db=db,
                media_id=media_id,
                species=pred["species"],
                confidence=pred["confidence"],
                is_human=pred.get("is_human", False)
            )
            created_predictions.append(new_pred)
        
        # Update media status to "processed"
        from ..database.db import update_media_status
        update_media_status(db, media_id, "processed")
        
        return {
            "status": "success",
            "predictions_created": len(created_predictions),
            "media_id": media_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing predictions: {str(e)}")

# Statistics endpoint
@router.get("/user/stats")
def get_prediction_stats(
    request: Request,
    db: Session = Depends(get_db)
):
    # Authenticate user
    clerk_user = authenticate_and_get_user(request)
    
    # Get prediction statistics for dashboard
    stats = get_prediction_statistics(db, clerk_user.id)
    return stats