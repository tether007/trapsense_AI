"""Database CRUD operations

This file contains functions to interact with the database:
- Users
- Media (including YOLO predictions)
- for now later is added: Traps, Locations, etc.

"""

from sqlalchemy.orm import Session
from datetime import datetime
from . import models
import uuid


# Users crud funcs
def get_user_by_id(db: Session, user_id: str):
    return db.query(models.User).filter(models.User.id == user_id).first()


def create_user(db: Session, user_id: str, email: str, name: str = None):
    db_user = models.User(id=user_id, email=email, name=name)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# ---------------- Media ----------------
def create_media(
    db: Session,
    user_id: str,
    file_url: str,
    file_type: str,
    folder_path: str = None,
    latitude: float = None,
    longitude: float = None,
):
    media_id = str(uuid.uuid4())
    db_media = models.Media(
        id=media_id,
        user_id=user_id,
        file_url=file_url,
        file_type=file_type,
        folder_path=folder_path,
        latitude=latitude,
        longitude=longitude,
        is_processed=False,
    )
    db.add(db_media)
    db.commit()
    db.refresh(db_media)
    return db_media


def create_media_batch(db: Session, user_id: str, files: list):
    """
    files: list of dicts with keys ['file_url', 'file_type', 'folder_path', 'latitude', 'longitude']
    Inserts all media records in a single DB transaction.
    """
    media_objects = []
    for f in files:
        media_id = str(uuid.uuid4())
        media = models.Media(
            id=media_id,
            user_id=user_id,
            file_url=f.get("file_url"),
            file_type=f.get("file_type"),
            folder_path=f.get("folder_path"),  # NEW: Store folder path
            latitude=f.get("latitude"),
            longitude=f.get("longitude"),
            is_processed=False,
        )
        media_objects.append(media)

    db.add_all(media_objects)
    db.commit()
    for media in media_objects:
        db.refresh(media)

    return media_objects


def get_media_by_user(db: Session, user_id: str):
    return db.query(models.Media).filter(models.Media.user_id == user_id).all()


def get_media_by_id(db: Session, media_id: str):
    return db.query(models.Media).filter(models.Media.id == media_id).first()


def update_media_predictions(
    db: Session,
    media_id: str,
    classification: str,
    confidence: float,
    species: str = None,
    predictions: dict = None
):
    """
    Update a media record with YOLO predictions + metadata.
    """
    import json
    media = db.query(models.Media).filter(models.Media.id == media_id).first()
    if media:
        media.classification = classification
        media.confidence = confidence
        media.species = species
        media.predictions = json.dumps(predictions) if predictions else None
        media.is_processed = True
        db.commit()
        db.refresh(media)
    return media


def get_predictions_by_media(db: Session, media_id: str):
    """
    Fetch YOLO predictions + metadata for a given media_id.
    """
    media = db.query(models.Media).filter(models.Media.id == media_id).first()
    if not media:
        return None
    
    import json
    
    # Parse predictions if it's a string
    predictions_data = media.predictions
    if isinstance(predictions_data, str):
        try:
            predictions_data = json.loads(predictions_data)
        except:
            predictions_data = None
    
    return {
        "media_id": media.id,
        "classification": media.classification,
        "confidence": media.confidence,
        "species": media.species,
        "predictions": predictions_data
    }

