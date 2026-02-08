"""
Nevika Cura - Doctor Schedule Management
Doctors can manage their own availability and schedule
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import jwt
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/doctor-schedule", tags=["Doctor Schedule"])

# Database and config
db = None
JWT_SECRET = None
JWT_ALGORITHM = "HS256"

def set_db(database):
    global db
    db = database

def set_jwt_config(secret, algorithm):
    global JWT_SECRET, JWT_ALGORITHM
    JWT_SECRET = secret
    JWT_ALGORITHM = algorithm


# ============ Auth ============

async def verify_doctor(authorization: str = Header(None)):
    """Verify doctor token"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Authentication required")
    
    token = authorization.replace('Bearer ', '')
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("role") not in ["doctor", "admin", "super_admin"]:
            raise HTTPException(status_code=403, detail="Doctor access required")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============ Models ============

class TimeSlot(BaseModel):
    start_time: str  # "09:00"
    end_time: str    # "13:00"

class DaySchedule(BaseModel):
    day: str  # "monday", "tuesday", etc.
    is_working: bool = True
    slots: List[TimeSlot] = []

class BlockedDate(BaseModel):
    date: str  # "2026-02-10"
    reason: str = "Leave"

class BlockedSession(BaseModel):
    date: str  # "2026-02-10"
    start_time: str  # "11:00"
    end_time: str  # "14:00"
    reason: str = "Break"

class ScheduleUpdate(BaseModel):
    weekly_schedule: Optional[List[DaySchedule]] = None
    slot_duration: Optional[int] = 15  # minutes per appointment
    max_patients_per_slot: Optional[int] = 1
    buffer_between_slots: Optional[int] = 0  # minutes


# ============ API Endpoints ============

@router.get("/my-schedule")
async def get_my_schedule(doctor=Depends(verify_doctor)):
    """Get doctor's current schedule"""
    doctor_id = doctor.get("sub") or doctor.get("id")
    
    schedule = await db.doctor_schedules.find_one(
        {"doctor_id": doctor_id},
        {"_id": 0}
    )
    
    if not schedule:
        # Return default schedule
        default_schedule = {
            "doctor_id": doctor_id,
            "doctor_name": doctor.get("name", "Doctor"),
            "slot_duration": 15,
            "max_patients_per_slot": 1,
            "buffer_between_slots": 0,
            "weekly_schedule": [
                {"day": "monday", "is_working": True, "slots": [{"start_time": "09:00", "end_time": "13:00"}, {"start_time": "17:00", "end_time": "20:00"}]},
                {"day": "tuesday", "is_working": True, "slots": [{"start_time": "09:00", "end_time": "13:00"}, {"start_time": "17:00", "end_time": "20:00"}]},
                {"day": "wednesday", "is_working": True, "slots": [{"start_time": "09:00", "end_time": "13:00"}, {"start_time": "17:00", "end_time": "20:00"}]},
                {"day": "thursday", "is_working": True, "slots": [{"start_time": "09:00", "end_time": "13:00"}, {"start_time": "17:00", "end_time": "20:00"}]},
                {"day": "friday", "is_working": True, "slots": [{"start_time": "09:00", "end_time": "13:00"}, {"start_time": "17:00", "end_time": "20:00"}]},
                {"day": "saturday", "is_working": True, "slots": [{"start_time": "09:00", "end_time": "13:00"}]},
                {"day": "sunday", "is_working": False, "slots": []}
            ],
            "blocked_dates": []
        }
        return default_schedule
    
    return schedule


@router.put("/my-schedule")
async def update_my_schedule(data: ScheduleUpdate, doctor=Depends(verify_doctor)):
    """Update doctor's schedule"""
    doctor_id = doctor.get("sub") or doctor.get("id")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if data.weekly_schedule:
        update_data["weekly_schedule"] = [s.dict() for s in data.weekly_schedule]
    if data.slot_duration:
        update_data["slot_duration"] = data.slot_duration
    if data.max_patients_per_slot:
        update_data["max_patients_per_slot"] = data.max_patients_per_slot
    if data.buffer_between_slots is not None:
        update_data["buffer_between_slots"] = data.buffer_between_slots
    
    await db.doctor_schedules.update_one(
        {"doctor_id": doctor_id},
        {
            "$set": update_data,
            "$setOnInsert": {
                "doctor_id": doctor_id,
                "doctor_name": doctor.get("name", "Doctor"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"success": True, "message": "Schedule updated"}


@router.post("/block-date")
async def block_date(data: BlockedDate, doctor=Depends(verify_doctor)):
    """Block a specific date (holiday/leave)"""
    doctor_id = doctor.get("sub") or doctor.get("id")
    
    await db.doctor_schedules.update_one(
        {"doctor_id": doctor_id},
        {
            "$addToSet": {
                "blocked_dates": {"date": data.date, "reason": data.reason}
            }
        },
        upsert=True
    )
    
    return {"success": True, "message": f"Blocked {data.date}"}


@router.delete("/block-date/{date}")
async def unblock_date(date: str, doctor=Depends(verify_doctor)):
    """Unblock a specific date"""
    doctor_id = doctor.get("sub") or doctor.get("id")
    
    await db.doctor_schedules.update_one(
        {"doctor_id": doctor_id},
        {"$pull": {"blocked_dates": {"date": date}}}
    )
    
    return {"success": True, "message": f"Unblocked {date}"}


@router.get("/blocked-dates")
async def get_blocked_dates(doctor=Depends(verify_doctor)):
    """Get all blocked dates"""
    doctor_id = doctor.get("sub") or doctor.get("id")
    
    schedule = await db.doctor_schedules.find_one(
        {"doctor_id": doctor_id},
        {"blocked_dates": 1, "_id": 0}
    )
    
    return {"blocked_dates": schedule.get("blocked_dates", []) if schedule else []}


@router.get("/available-slots/{date}")
async def get_available_slots(date: str, doctor_id: str = None, doctor=Depends(verify_doctor)):
    """Get available slots for a specific date"""
    target_doctor_id = doctor_id or doctor.get("sub") or doctor.get("id")
    
    # Get doctor's schedule
    schedule = await db.doctor_schedules.find_one({"doctor_id": target_doctor_id}, {"_id": 0})
    
    if not schedule:
        return {"slots": [], "message": "No schedule configured"}
    
    # Check if date is blocked
    blocked_dates = [b["date"] for b in schedule.get("blocked_dates", [])]
    if date in blocked_dates:
        return {"slots": [], "message": "This date is blocked"}
    
    # Get day of week
    try:
        date_obj = datetime.strptime(date, "%Y-%m-%d")
        day_name = date_obj.strftime("%A").lower()
    except:
        raise HTTPException(status_code=400, detail="Invalid date format")
    
    # Find day schedule
    day_schedule = None
    for ds in schedule.get("weekly_schedule", []):
        if ds["day"] == day_name:
            day_schedule = ds
            break
    
    if not day_schedule or not day_schedule.get("is_working"):
        return {"slots": [], "message": f"Not working on {day_name}"}
    
    # Generate time slots
    slot_duration = schedule.get("slot_duration", 15)
    buffer = schedule.get("buffer_between_slots", 0)
    all_slots = []
    
    for period in day_schedule.get("slots", []):
        start = datetime.strptime(period["start_time"], "%H:%M")
        end = datetime.strptime(period["end_time"], "%H:%M")
        
        current = start
        while current < end:
            all_slots.append(current.strftime("%H:%M"))
            current += timedelta(minutes=slot_duration + buffer)
    
    # Get booked slots for this date
    booked = await db.appointments.find(
        {"doctor_id": target_doctor_id, "date": date},
        {"time": 1}
    ).to_list(100)
    booked_times = [b.get("time") for b in booked]
    
    # Filter available slots
    available = [s for s in all_slots if s not in booked_times]
    
    return {
        "date": date,
        "day": day_name,
        "all_slots": all_slots,
        "booked_slots": booked_times,
        "available_slots": available,
        "slot_duration": slot_duration
    }


# ============ Staff View (for DiaGyn staff) ============

@router.get("/doctors")
async def get_all_doctors_schedules(doctor=Depends(verify_doctor)):
    """Get schedules for all doctors (for staff view)"""
    schedules = await db.doctor_schedules.find({}, {"_id": 0}).to_list(50)
    
    # Get doctor names
    doctors = await db.staff.find(
        {"role": "doctor"},
        {"_id": 0, "id": 1, "name": 1, "department": 1}
    ).to_list(50)
    
    return {
        "doctors": doctors,
        "schedules": schedules
    }



# ============ Blocked Sessions ============

@router.post("/block-session")
async def block_session(data: BlockedSession, doctor=Depends(verify_doctor)):
    """Block a specific time slot on a date"""
    doctor_id = doctor.get("sub") or doctor.get("id")
    
    await db.doctor_schedules.update_one(
        {"doctor_id": doctor_id},
        {
            "$addToSet": {
                "blocked_sessions": {
                    "date": data.date,
                    "start_time": data.start_time,
                    "end_time": data.end_time,
                    "reason": data.reason
                }
            }
        },
        upsert=True
    )
    
    return {"success": True, "message": f"Blocked session on {data.date} from {data.start_time} to {data.end_time}"}


@router.delete("/block-session/{date}/{start_time}")
async def unblock_session(date: str, start_time: str, doctor=Depends(verify_doctor)):
    """Unblock a specific session"""
    doctor_id = doctor.get("sub") or doctor.get("id")
    
    await db.doctor_schedules.update_one(
        {"doctor_id": doctor_id},
        {"$pull": {"blocked_sessions": {"date": date, "start_time": start_time}}}
    )
    
    return {"success": True, "message": f"Unblocked session on {date}"}


@router.get("/blocked-sessions")
async def get_blocked_sessions(doctor=Depends(verify_doctor)):
    """Get all blocked sessions"""
    doctor_id = doctor.get("sub") or doctor.get("id")
    
    schedule = await db.doctor_schedules.find_one(
        {"doctor_id": doctor_id},
        {"blocked_sessions": 1, "_id": 0}
    )
    
    return {"blocked_sessions": schedule.get("blocked_sessions", []) if schedule else []}
