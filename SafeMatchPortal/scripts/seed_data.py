import sys
import os
import random

# Add parent directory to path to import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal, engine
from backend.models import Base, Subject, Review

def seed_initial_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Check if data already exists
    if db.query(Subject).first():
        print("Data already exists, skipping seeding.")
        db.close()
        return

    print("Seeding initial mock data from Twitter alerts...")
    
    # Mock data for demonstration
    mock_subjects = [
        {"identifier": "@taro_scam", "type": "twitter_id", "name": "タロウ"},
        {"identifier": "@hanako_no_pay", "type": "twitter_id", "name": "ハナコ"},
        {"identifier": "090-1234-5678", "type": "phone", "name": "不明（ドタキャン男）"},
    ]
    
    for s_data in mock_subjects:
        subject = Subject(**s_data)
        db.add(subject)
        db.flush()  # To get the ID
        
        # Add a few reviews for each
        for i in range(random.randint(2, 5)):
            review = Review(
                subject_id=subject.id,
                content=f"Twitterの注意喚起で見かけました。被害内容: {random.choice(['未払い', 'ドタキャン', '詐欺'])}。要注意です。",
                category=random.choice(["fraud", "no-show", "harassment"]),
                rating=1,
                evidence_url="https://twitter.com/example/status/123"
            )
            db.add(review)
            
    db.commit()
    db.close()
    print("Seeding complete.")

if __name__ == "__main__":
    seed_initial_data()
