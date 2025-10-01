"""A way to talk to the database

 This file contains functions to interact with the database, such as creating and retrieving users, media, predictions, and alerts.  
    """

from sqlalchemy.orm import Session
from datetime import datetime
from . import models
import uuid

def get_user_by_id(db: Session, user_id: str):
    return db.query(models.User).filter(models.User.id == user_id).first()

def create_user(db: Session, user_id: str, email: str, name: str):
    db_user = models.User(id=user_id, email=email, name=name)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def create_media(db: Session, user_id: str, file_url: str, file_type: str, latitude: float = None, longitude: float = None):
    # Ensure the media record has a unique string id
    media_id = str(uuid.uuid4())
    db_media = models.Media(
        id=media_id,
        user_id=user_id,
        file_url=file_url,
        file_type=file_type,
        status="pending",
        latitude=latitude,
        longitude=longitude
    )
    db.add(db_media)
    db.commit()
    db.refresh(db_media)
    return db_media

def get_media_by_user(db: Session, user_id: str):
    return db.query(models.Media).filter(models.Media.user_id == user_id).all()

def get_media_by_id(db: Session, media_id: str):
    return db.query(models.Media).filter(models.Media.id == media_id).first()   

def create_prediction(db: Session, media_id: str, species: str, confidence: float, is_human=False):
    pred_id = str(uuid.uuid4())
    db_pred = models.Prediction(
        id=pred_id,
        media_id=media_id,
        species=species,
        confidence=confidence,
        is_human=is_human
    )
    db.add(db_pred)
    db.commit()
    db.refresh(db_pred)
    return db_pred

def get_predictions_by_media(db: Session, media_id: str):
    return db.query(models.Prediction).filter(models.Prediction.media_id == media_id).all()

def get_prediction_by_id(db: Session, prediction_id: str):
    return db.query(models.Prediction).filter(models.Prediction.id == prediction_id).first()

def get_prediction_by_user(db: Session,user_id: str):
    return db.query(models.Prediction).join(models.Media).filter(models.Media.user_id == user_id).all()

def update_media_status(db: Session, media_id: str, status: str):
    media = db.query(models.Media).filter(models.Media.id == media_id).first()
    if media:
        media.status = status
        db.commit()
        db.refresh(media)
    return media

def create_alert(db: Session, user_id: str, prediction_id: str, alert_type: str, priority: str, message: str):
    alert_id = str(uuid.uuid4())
    db_alert = models.Alert(
        id=alert_id,
        user_id=user_id,
        prediction_id=prediction_id,
        alert_type=alert_type,
        priority=priority,
        message=message
    )
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert

def get_active_alerts(db: Session, user_id: str):
    return db.query(models.Alert).filter(models.Alert.user_id == user_id, models.Alert.resolved == False).all()

def mark_alert_resolved(db: Session, alert_id: str):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if alert:
        alert.resolved = True
        db.commit()
        db.refresh(alert)
    return alert
