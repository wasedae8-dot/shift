from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List

class ReviewBase(BaseModel):
    subject_id: int
    content: str
    category: str
    rating: int
    actually_met: bool = True
    occurred_at: Optional[str] = None
    location: Optional[str] = None
    meeting_duration: Optional[str] = None
    amount_agreed: Optional[int] = None
    amount_paid: Optional[int] = None
    is_id_verified: bool = False
    evidence_url: Optional[str] = None

class ReviewCreate(ReviewBase):
    pass

class Review(ReviewBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class SubjectBase(BaseModel):
    identifier: str
    type: str
    name: Optional[str] = None
    description: Optional[str] = None

class SubjectCreate(SubjectBase):
    pass

class Subject(SubjectBase):
    id: int
    trust_score: float
    reviews: List[Review] = []
    model_config = ConfigDict(from_attributes=True)

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    review_points: int
    model_config = ConfigDict(from_attributes=True)
