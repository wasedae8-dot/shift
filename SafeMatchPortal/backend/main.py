from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

import models, schemas, database

app = FastAPI(title="Safe-Match Portal API")

# Create tables
models.Base.metadata.create_all(bind=database.engine)

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Safe-Match Portal API is running"}

@app.get("/search", response_model=schemas.Subject)
def search_subject(identifier: str, db: Session = Depends(database.get_db)):
    subject = db.query(models.Subject).filter(models.Subject.identifier == identifier).first()
    if not subject:
        # If not found, create a placeholder subject (entry without reviews yet)
        # This allows SEO for any ID searched
        new_subject = models.Subject(identifier=identifier, type="unknown")
        db.add(new_subject)
        db.commit()
        db.refresh(new_subject)
        return new_subject
    return subject

@app.post("/reviews", response_model=schemas.Review)
def create_review(review: schemas.ReviewCreate, db: Session = Depends(database.get_db)):
    db_review = models.Review(**review.model_dump())
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    return db_review
