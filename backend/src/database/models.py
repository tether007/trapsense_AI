from sqlalchemy import Column, String, DateTime, create_engine, ForeignKey, Float, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

engine = create_engine("sqlite:///./test.db", connect_args={"check_same_thread": False}, echo=True)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, index=True)
    name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now)


class Media(Base):
    __tablename__ = "media"

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"))
    file_url = Column(String, nullable=False)
    file_type = Column(String)
    folder_path = Column(String, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.now)
    classification = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    species = Column(String, nullable=True)
    predictions = Column(Text, nullable=True)
    is_processed = Column(Boolean, default=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)


Base.metadata.create_all(engine)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
