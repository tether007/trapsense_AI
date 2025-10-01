from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from ..database.db import (
    create_alert,
    get_active_alerts,
    mark_alert_resolved,
    # Only using the functions you actually have
)
from ..utils.utils import authenticate_and_get_user
from ..database.models import get_db
from ..database import models

router = APIRouter()

# Pydantic Models
class AlertCreate(BaseModel):
    prediction_id: str
    alert_type: str  # "elephant", "poaching", "general"
    priority: str   # "low", "medium", "high"
    message: str

class AlertResponse(BaseModel):
    id: str
    user_id: str
    prediction_id: str
    alert_type: str
    priority: str
    message: str
    created_at: datetime
    resolved: bool

    class Config:
        from_attributes = True

class AlertResolveRequest(BaseModel):
    resolved: bool = True

# Routes - Only using existing CRUD functions
@router.post("/", response_model=AlertResponse)
def create_alert_record(
    alert_data: AlertCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    # Authenticate user
    clerk_user = authenticate_and_get_user(request)
    
    # Validate alert type and priority
    if alert_data.alert_type not in ["elephant", "poaching", "general"]:
        raise HTTPException(status_code=400, detail="Invalid alert type")
    
    if alert_data.priority not in ["low", "medium", "high"]:
        raise HTTPException(status_code=400, detail="Invalid priority level")
    
    # Create alert in database
    new_alert = create_alert(
        db=db,
        user_id=clerk_user.id,
        prediction_id=alert_data.prediction_id,
        alert_type=alert_data.alert_type,
        priority=alert_data.priority,
        message=alert_data.message
    )
    return new_alert

@router.get("/active", response_model=List[AlertResponse])
def get_active_user_alerts(
    request: Request,
    db: Session = Depends(get_db)
):
    # Authenticate user
    clerk_user = authenticate_and_get_user(request)
    
    # Get active (unresolved) alerts for user
    active_alerts = get_active_alerts(db, clerk_user.id)
    return active_alerts

@router.get("/", response_model=List[AlertResponse])
def get_all_user_alerts(
    request: Request,
    db: Session = Depends(get_db)
):
    # Authenticate user
    clerk_user = authenticate_and_get_user(request)
    
    # Get all alerts for user (both resolved and unresolved)
    # Since we don't have get_all_user_alerts, we'll use get_active_alerts
    # and manually query for all alerts
    all_alerts = db.query(models.Alert).filter(
        models.Alert.user_id == clerk_user.id
    ).all()
    return all_alerts

@router.get("/{alert_id}", response_model=AlertResponse)
def get_specific_alert(
    alert_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    # Authenticate user
    clerk_user = authenticate_and_get_user(request)
    
    # Get alert by ID (manual query since we don't have get_alert_by_id)
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    # Check if alert belongs to user
    if alert.user_id != clerk_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this alert")
    
    return alert

@router.patch("/{alert_id}/resolve", response_model=AlertResponse)
def resolve_alert(
    alert_id: str,
    resolve_data: AlertResolveRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    # Authenticate user
    clerk_user = authenticate_and_get_user(request)
    
    # Get alert and verify ownership (manual query)
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert or alert.user_id != clerk_user.id:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    # Mark as resolved using our existing function
    updated_alert = mark_alert_resolved(db, alert_id)
    return updated_alert

@router.post("/bulk-resolve")
def bulk_resolve_alerts(
    alert_ids: List[str],
    request: Request,
    db: Session = Depends(get_db)
):
    # Authenticate user
    clerk_user = authenticate_and_get_user(request)
    
    resolved_count = 0
    for alert_id in alert_ids:
        # Verify each alert belongs to user and exists
        alert = db.query(models.Alert).filter(
            models.Alert.id == alert_id,
            models.Alert.user_id == clerk_user.id
        ).first()
        
        if alert:
            mark_alert_resolved(db, alert_id)
            resolved_count += 1
    
    return {
        "message": f"Successfully resolved {resolved_count} alerts",
        "resolved_count": resolved_count
    }

# Simple stats endpoint using direct queries
@router.get("/stats/summary")
def get_alert_stats(
    request: Request,
    db: Session = Depends(get_db)
):
    # Authenticate user
    clerk_user = authenticate_and_get_user(request)
    
    # Get basic stats using direct queries
    total_alerts = db.query(models.Alert).filter(
        models.Alert.user_id == clerk_user.id
    ).count()
    
    active_alerts = db.query(models.Alert).filter(
        models.Alert.user_id == clerk_user.id,
        models.Alert.resolved == False
    ).count()
    
    alerts_by_type = db.query(
        models.Alert.alert_type,
        db.func.count(models.Alert.id)
    ).filter(
        models.Alert.user_id == clerk_user.id
    ).group_by(models.Alert.alert_type).all()
    
    alerts_by_priority = db.query(
        models.Alert.priority,
        db.func.count(models.Alert.id)
    ).filter(
        models.Alert.user_id == clerk_user.id
    ).group_by(models.Alert.priority).all()
    
    return {
        "total_alerts": total_alerts,
        "active_alerts": active_alerts,
        "resolved_alerts": total_alerts - active_alerts,
        "alerts_by_type": dict(alerts_by_type),
        "alerts_by_priority": dict(alerts_by_priority)
    }

# Auto-alert generation using only existing functions
@router.post("/auto-generate")
def auto_generate_alert_from_prediction(
    prediction_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Automatically generate alerts based on prediction results
    Uses only the CRUD functions we have available
    """
    # Authenticate user
    clerk_user = authenticate_and_get_user(request)
    
    # Get prediction details (manual query)
    prediction = db.query(models.Prediction).filter(
        models.Prediction.id == prediction_id
    ).first()
    
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")
    
    # Get media details to find the owner (manual query)
    media = db.query(models.Media).filter(
        models.Media.id == prediction.media_id
    ).first()
    
    if not media:
        raise HTTPException(status_code=404, detail="Media not found for this prediction")
    
    # Determine alert type and priority based on prediction
    alert_type, priority, message = determine_alert_details(prediction)
    
    # Create alert using our existing function
    new_alert = create_alert(
        db=db,
        user_id=media.user_id,  # Alert goes to media owner
        prediction_id=prediction_id,
        alert_type=alert_type,
        priority=priority,
        message=message
    )
    
    return new_alert

# Helper function for auto-alert generation
def determine_alert_details(prediction) -> tuple:
    """Determine alert type, priority, and message based on prediction"""
    
    if prediction.is_human:
        return (
            "poaching",
            "high",
            f"Human detected in camera trap - possible poaching activity"
        )
    elif prediction.species.lower() in ["elephant", "rhino", "tiger", "leopard"]:
        return (
            "elephant" if prediction.species.lower() == "elephant" else "general",
            "medium" if prediction.confidence > 0.7 else "low",
            f"{prediction.species} detected with {prediction.confidence:.0%} confidence"
        )
    elif prediction.confidence > 0.8:
        return (
            "general",
            "low",
            f"Wildlife detected: {prediction.species} ({prediction.confidence:.0%} confidence)"
        )
    else:
        return None  # No alert for low confidence detections