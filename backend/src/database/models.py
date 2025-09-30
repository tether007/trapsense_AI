from sqlalchemy import Column, Integer, String,DateTime,create_engine,Enum,ForeignKey,UUID,Float,Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime


engine=create_engine("sqlite:///./test.db",connect_args={"check_same_thread":False},echo=True)
Base=declarative_base()#helps in ORM to map classes to database tables


class User(Base):
    __tablename__ = "users"

    id            = Column(UUID, primary_key=True)# Clerk user_id
    email         = Column(String, unique=True)      # From Clerk profile
    name          = Column(String,nullable=False)                   # Optional (for dashboard)
    created_at    = Column(DateTime, default=datetime.now)    # When first logged in

class Media(Base):
    __tablename__ = "media"

    id            = Column(UUID, primary_key=True)
    user_id       = Column(UUID, ForeignKey("users.id"),unique=True)   # Who uploaded
    file_url      = Column(String)                         # Path/URL
    file_type     = Column(Enum("image", "video"))         # Type of media
    status        = Column(Enum("pending", "processed"))   # Processing status
    uploaded_at   = Column(DateTime, default=datetime.now)

class Prediction(Base):
    __tablename__ = "predictions"

    id            = Column(UUID, primary_key=True)
    media_id      = Column(UUID, ForeignKey("media.id"),unique=True)   # Which file
    species       = Column(String)                         # e.g., "Elephant"
    confidence    = Column(Float)                          # e.g., 0.92
    is_human      = Column(Boolean, default=False)         # Flag for poaching
    detected_at   = Column(DateTime, default=datetime.now)
    
class Alert(Base):
    __tablename__ = "alerts"

    id = Column(UUID, primary_key=True)
    user_id = Column(UUID, ForeignKey("users.id"))
    prediction_id = Column(UUID, ForeignKey("predictions.id"))
    alert_type = Column(Enum("elephant", "poaching", "general"))
    priority = Column(Enum("low", "medium", "high"))
    message = Column(String)                         # e.g., "Elephant near farm!"
    created_at = Column(DateTime, default=datetime.now)
    resolved = Column(Boolean, default=False)
    # Optional
    # latitude = Column(Float)
    # longitude = Column(Float)




Base.metadata.create_all(engine)#makes the python classes as tables in the database
SessionLocal=sessionmaker(autocommit=False,autoflush=False,bind=engine)

def get_db():
    db=SessionLocal()
    try:
        yield db    #only one session is created per request
    finally:
        db.close() #closing the session after the request is completed