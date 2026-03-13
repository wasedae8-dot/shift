from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import datetime

Base = declarative_base()

class Subject(Base):
    """
    The person or ID being reviewed (e.g., X ID, phone number).
    """
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    identifier = Column(String, unique=True, index=True)  # e.g., "@abc_123"
    type = Column(String)  # "twitter_id", "phone", etc.
    name = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    trust_score = Column(Float, default=0.0)  # Calculated score based on reviews
    
    reviews = relationship("Review", back_populates="subject")

class Review(Base):
    """
    Anonymous reviews submitted by users.
    """
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    content = Column(Text)
    category = Column(String)  # "fraud", "no-show", "harassment", "good"
    rating = Column(Integer)  # 1 to 5
    
    # Detailed fields
    actually_met = Column(Boolean, default=True)
    occurred_at = Column(String, nullable=True)      # e.g., "2024-04"
    location = Column(String, nullable=True)         # e.g., "新宿"
    meeting_duration = Column(String, nullable=True)  # e.g., "2時間"
    amount_agreed = Column(Integer, nullable=True)
    amount_paid = Column(Integer, nullable=True)
    is_id_verified = Column(Boolean, default=False)
    
    evidence_url = Column(String, nullable=True)  # Link to screenshot or tweet
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    subject = relationship("Subject", back_populates="reviews")

class User(Base):
    """
    Users of the platform (optional for anonymous, but needed for '1 review for 3 views' logic).
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    review_points = Column(Integer, default=3)  # Credits to view details
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
