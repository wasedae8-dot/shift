from pydantic import BaseModel
from typing import List, Optional

# --- Facility Schemas ---
class FacilityBase(BaseModel):
    name: str

class FacilityCreate(FacilityBase):
    pass

class Facility(FacilityBase):
    id: int

    class Config:
        orm_mode = True

# --- Staff Schemas ---
class StaffBase(BaseModel):
    name: str
    is_part_time: bool = False
    facility_id: int
    is_nurse: bool = False
    is_consultant: bool = False
    is_care_worker: bool = False
    is_driver: bool = False
    is_functional_trainer: bool = False
    is_active: bool = True
    sort_order: int = 0
    work_hours: int = 8
    
    # Availability for part-time staff
    is_available_mon: bool = True
    is_available_tue: bool = True
    is_available_wed: bool = True
    is_available_thu: bool = True
    is_available_fri: bool = True
    is_available_sat: bool = True
    is_available_sun: bool = True

class StaffCreate(StaffBase):
    pass

class Staff(StaffBase):
    id: int

    class Config:
        orm_mode = True

# --- LeaveRequest Schemas ---
class LeaveRequestBase(BaseModel):
    staff_id: int
    date: str
    reason: Optional[str] = "希望休"
    is_summer_vacation: bool = False

class LeaveRequestCreate(LeaveRequestBase):
    pass

class LeaveRequest(LeaveRequestBase):
    id: int

    class Config:
        orm_mode = True

# --- DailyConstraint Schemas ---
class DailyConstraintBase(BaseModel):
    facility_id: int
    date: str
    min_headcount_override: Optional[int] = None
    is_priority: bool = False

class DailyConstraintCreate(DailyConstraintBase):
    pass

class DailyConstraint(DailyConstraintBase):
    id: int

    class Config:
        orm_mode = True

# --- FacilitySetting Schemas ---
class FacilitySettingBase(BaseModel):
    facility_id: int
    min_headcount: int = 12
    weight_leveling_low: int = 150
    weight_leveling_mid: int = 1000
    weight_leveling_high: int = 5000
    base_shift_reward: int = 30

class FacilitySettingCreate(FacilitySettingBase):
    pass

class FacilitySetting(FacilitySettingBase):
    id: int

    class Config:
        orm_mode = True
