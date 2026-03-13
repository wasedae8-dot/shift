import os
from sqlalchemy import create_engine, text

# Get the database URL from the environment
env_url = os.getenv("DATABASE_URL", "").strip()
if not env_url:
    SQLALCHEMY_DATABASE_URL = "postgresql://postgres:password@db:5432/dev_db"
else:
    SQLALCHEMY_DATABASE_URL = env_url

if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

print(f"Connecting to database to migrate...")

try:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    with engine.connect() as conn:
        # Check if column exists first
        check_query = text("SELECT column_name FROM information_schema.columns WHERE table_name='leave_requests' AND column_name='is_forced_attendance';")
        result = conn.execute(check_query).fetchone()
        
        if not result:
            print("Adding column 'is_forced_attendance' to table 'leave_requests'...")
            conn.execute(text("ALTER TABLE leave_requests ADD COLUMN is_forced_attendance BOOLEAN DEFAULT FALSE;"))
            conn.commit()
            print("Migration successful.")
        else:
            print("Column 'is_forced_attendance' already exists. Skipping.")
except Exception as e:
    print(f"Error during migration: {e}")
