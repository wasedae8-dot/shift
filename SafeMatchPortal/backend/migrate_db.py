import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.getcwd()), "safematch.db")
print(f"Inspecting DB at: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check subjects table
    cursor.execute("PRAGMA table_info(subjects)")
    cols = [col[1] for col in cursor.fetchall()]
    print(f"Subjects columns: {cols}")
    
    if "trust_score" not in cols:
        print("Adding trust_score to subjects")
        cursor.execute("ALTER TABLE subjects ADD COLUMN trust_score FLOAT DEFAULT 0.0")
    
    # Check reviews table
    cursor.execute("PRAGMA table_info(reviews)")
    review_cols = [col[1] for col in cursor.fetchall()]
    print(f"Reviews columns: {review_cols}")
    
    # New fields to add if missing
    new_fields = [
        ("actually_met", "BOOLEAN DEFAULT 1"),
        ("occurred_at", "TEXT"),
        ("location", "TEXT"),
        ("meeting_duration", "TEXT"),
        ("amount_agreed", "INTEGER"),
        ("amount_paid", "INTEGER"),
        ("is_id_verified", "BOOLEAN DEFAULT 0"),
        ("evidence_url", "TEXT")
    ]
    
    for field, type_def in new_fields:
        if field not in review_cols:
            print(f"Adding {field} to reviews")
            cursor.execute(f"ALTER TABLE reviews ADD COLUMN {field} {type_def}")
            
    conn.commit()
    conn.close()
    print("Migration finished successfully")
except Exception as e:
    print(f"Error: {e}")
