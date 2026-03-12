from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import random

import models, schemas
from database import engine, get_db
from solver import solve_schedule
from datetime import datetime

# Tables will be created in startup_event to avoid crashing on import if DB is down


app = FastAPI(title="Shift Scheduling API")

@app.on_event("startup")
async def startup_event():
    app_password = os.getenv("APP_PASSWORD")
    if app_password:
        print(f"INFO: Application Password is set (length: {len(app_password)})")
    else:
        print("WARNING: APP_PASSWORD is NOT set. Authentication is DISABLED.")
        
    # Attempt to create tables, but don't crash if DB is not ready
    try:
        models.Base.metadata.create_all(bind=engine)
        print("INFO: Database tables verified/created.")
        
        # Run manual migration for sort_order column
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE staff ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0"))
        print("INFO: Migration (sort_order) verified.")
        
        # Create default facilities if none exist to match UI options (id: 1, 2)
        from database import SessionLocal
        db = SessionLocal()
        try:
            facility_data = [
                {"id": 1, "name": "サンケア上池台"},
                {"id": 2, "name": "サンケア鵜の木"}
            ]
            for f_info in facility_data:
                existing = db.query(models.Facility).filter(models.Facility.id == f_info["id"]).first()
                if not existing:
                    new_f = models.Facility(id=f_info["id"], name=f_info["name"])
                    db.add(new_f)
                    print(f"INFO: Created facility: {f_info['name']}")
                else:
                    if existing.name != f_info["name"]:
                        existing.name = f_info["name"]
                        print(f"INFO: Updated facility {f_info['id']} name to: {f_info['name']}")
            db.commit()
        finally:
            db.close()
            
    except Exception as e:
        print(f"ERROR: Failed to initialize/migrate database: {e}")


@app.middleware("http")
async def password_protect(request: Request, call_next):
    # Allow OPTIONS requests for CORS preflight
    if request.method == "OPTIONS":
        return await call_next(request)
        
    app_password = os.getenv("APP_PASSWORD")
    if not app_password:
        app_password = "password"
    
    path = request.url.path
    
    if app_password:
        app_password = app_password.strip()
        # Protect everything under /api/ except docs
        if path.startswith("/api/") and path not in ["/api/auth/diag", "/api/auth/db-diag"]:
            # Check custom header
            request_password = request.headers.get("X-App-Password")
            if request_password:
                request_password = request_password.strip()
            
            if request_password != app_password:
                response = JSONResponse(status_code=401, content={"detail": "Unauthorized"})
                response.headers["Access-Control-Allow-Origin"] = "*"
                return response

    
    response = await call_next(request)
    return response

# Allow CORS for all origins. Since we use custom headers and localStorage (not cookies),
# we don't need allow_credentials=True, which makes Origins="*" work reliably.
# Added AFTER password_protect so it wraps it and handles early 401 responses.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Shift Scheduling Optimization API is running."}

@app.get("/api/auth/verify")
def verify_auth(request: Request):
    """
    Endpoint for the frontend to verify if the password is correct.
    """
    app_password = os.getenv("APP_PASSWORD")
    if not app_password:
        app_password = "password"
    
    if not app_password:
        return {"status": "ok", "warning": "APP_PASSWORD not set"}
        
    app_password = app_password.strip()
    request_password = request.headers.get("X-App-Password", "").strip()
    
    if request_password != app_password:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    return {"status": "ok"}
    
@app.get("/api/auth/diag")
def diagnostic():
    try:
        import jpholiday
        import datetime
        import solver
        
        # Test specific date
        test_date = datetime.date(2026, 5, 4)
        is_h = jpholiday.is_holiday(test_date)
        
        # Get all holidays for May 2026
        may_holidays = jpholiday.month_holidays(2026, 5)
        
        return {
            "jpholiday_installed": True,
            "solver_HAS_JPHOLIDAY": solver.HAS_JPHOLIDAY,
            "test_2026_05_04_is_holiday": is_h,
            "may_2026_holidays": [str(h[0]) + ": " + h[1] for h in may_holidays],
            "python_version": os.popen("python --version").read().strip(),
            "server_time": datetime.datetime.now().isoformat()
        }
    except ImportError:
        return {
            "jpholiday_installed": False,
            "error": "ImportError"
        }
    except Exception as e:
        return {
            "jpholiday_installed": True,
            "error": str(e)
        }







# --- Facilities ---
@app.get("/api/facilities/", response_model=List[schemas.Facility])
def read_facilities(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Facility).offset(skip).limit(limit).all()

@app.post("/api/facilities/", response_model=schemas.Facility)
def create_facility(facility: schemas.FacilityCreate, db: Session = Depends(get_db)):
    db_facility = models.Facility(name=facility.name)
    db.add(db_facility)
    db.commit()
    db.refresh(db_facility)
    return db_facility

# --- Staff ---
@app.get("/api/staff/", response_model=List[schemas.Staff])
def read_staff(facility_id: Optional[int] = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(models.Staff)
    if facility_id:
        query = query.filter(models.Staff.facility_id == facility_id)
    return query.order_by(models.Staff.sort_order, models.Staff.id).offset(skip).limit(limit).all()

@app.post("/api/staff/", response_model=schemas.Staff)
def create_staff(staff: schemas.StaffCreate, db: Session = Depends(get_db)):
    # Assign next sort_order
    max_order = db.query(models.Staff).count()
    db_staff = models.Staff(**staff.dict(), sort_order=max_order)
    db.add(db_staff)
    db.commit()
    db.refresh(db_staff)
    return db_staff

@app.post("/api/staff/reorder")
def reorder_staff(ordered_ids: List[int], db: Session = Depends(get_db)):
    for index, staff_id in enumerate(ordered_ids):
        db.query(models.Staff).filter(models.Staff.id == staff_id).update({"sort_order": index})
    db.commit()
    return {"ok": True}

@app.delete("/api/staff/{staff_id}")
def delete_staff(staff_id: int, db: Session = Depends(get_db)):
    db_staff = db.query(models.Staff).filter(models.Staff.id == staff_id).first()
    if not db_staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    db.delete(db_staff)
    db.commit()
    return {"ok": True}

@app.put("/api/staff/{staff_id}", response_model=schemas.Staff)
def update_staff(staff_id: int, staff: schemas.StaffCreate, db: Session = Depends(get_db)):
    db_staff = db.query(models.Staff).filter(models.Staff.id == staff_id).first()
    if not db_staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    for key, value in staff.dict().items():
        setattr(db_staff, key, value)
    db.commit()
    db.refresh(db_staff)
    return db_staff

# --- Leave Requests ---
@app.get("/api/requests/", response_model=List[schemas.LeaveRequest])
def read_requests(facility_id: Optional[int] = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(models.LeaveRequest)
    if facility_id:
        query = query.join(models.Staff).filter(models.Staff.facility_id == facility_id)
    return query.offset(skip).limit(limit).all()

@app.post("/api/requests/", response_model=schemas.LeaveRequest)
def create_request(request: schemas.LeaveRequestCreate, db: Session = Depends(get_db)):
    db_request = models.LeaveRequest(**request.dict())
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    return db_request

@app.delete("/api/requests/{request_id}")
def delete_request(request_id: int, db: Session = Depends(get_db)):
    db_request = db.query(models.LeaveRequest).filter(models.LeaveRequest.id == request_id).first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Request not found")
    db.delete(db_request)
    db.commit()
    return {"ok": True}

# --- Solver Engine ---
@app.get("/api/generate-schedule/")
def generate_schedule(year: int, month: int, facility_id: int, seed: Optional[int] = None, db: Session = Depends(get_db)):
    print(f"DEBUG: Generating schedule for year={year}, month={month}, facility_id={facility_id}, seed={seed}")
    
    # Use provided seed or generate a random one
    effective_seed = seed if seed is not None else random.randint(1, 1000000)
    
    # 1. Fetch current staff properties as dicts for the solver
    staff_records = db.query(models.Staff).filter(
        models.Staff.is_active == True,
        models.Staff.facility_id == facility_id
    ).all()
    
    print(f"DEBUG: Found {len(staff_records)} active staff for facility {facility_id}")
    for s in staff_records:
        print(f"  - {s.name} (facility_id: {s.facility_id})")
        
    staff_list = []
    for s in staff_records:
        staff_list.append({
            "id": s.id,
            "name": s.name,
            "is_part_time": s.is_part_time,
            "is_nurse": s.is_nurse,
            "is_consultant": s.is_consultant,
            "is_care_worker": s.is_care_worker,
            "is_driver": s.is_driver,
            "is_functional_trainer": s.is_functional_trainer,
            "is_available_mon": s.is_available_mon,
            "is_available_tue": s.is_available_tue,
            "is_available_wed": s.is_available_wed,
            "is_available_thu": s.is_available_thu,
            "is_available_fri": s.is_available_fri,
            "is_available_sat": s.is_available_sat,
            "is_available_sun": s.is_available_sun,
            "sort_order": s.sort_order
        })
        
    # 2. Fetch leave requests for this facility's staff
    request_records = db.query(models.LeaveRequest).join(models.Staff).filter(
        models.Staff.facility_id == facility_id
    ).all()
    requests_list = []
    for r in request_records:
        requests_list.append({
            "id": r.id,
            "staff_id": r.staff_id,
            "date": r.date,
            "reason": r.reason,
            "is_summer_vacation": r.is_summer_vacation
        })
        
    # 3. Call the Python OR-Tools Logic
    result = solve_schedule(year, month, staff_list, requests_list, seed=effective_seed)
    
    if result.get("status") == "failed":
        raise HTTPException(status_code=400, detail=result.get("error"))
        
    # Include the seed used in the response
    result["seed"] = effective_seed
    return result
