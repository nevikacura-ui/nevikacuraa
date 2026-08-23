"""
Appointment V2 Routes - Calendar View, Pre-consultation Form, Home Test Scheduler
"""
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timezone, timedelta
import uuid
import calendar

router = APIRouter(tags=["Appointments V2"])

_db = None

def set_db(db):
    global _db
    _db = db

def get_db():
    return _db


# ============ Appointment Calendar View ============

@router.get("/appointments/v2/calendar")
async def get_appointment_calendar(
    month: int,
    year: int,
    doctor: Optional[str] = None,
    clinic: Optional[str] = None,
    patient_phone: Optional[str] = None
):
    """Get appointments grouped by date for a calendar month view."""
    db = get_db()
    
    # Build date range for the month
    _, last_day = calendar.monthrange(year, month)
    start_date = f"{year}-{month:02d}-01"
    end_date = f"{year}-{month:02d}-{last_day:02d}"
    
    query = {
        "date": {"$gte": start_date, "$lte": end_date}
    }
    if doctor:
        query["doctor"] = doctor
    if clinic:
        query["clinic"] = clinic
    if patient_phone:
        # Filter by patient phone - strip leading country code for flexible matching
        phone_clean = patient_phone.lstrip("+").lstrip("91") if len(patient_phone) > 10 else patient_phone
        query["$or"] = [
            {"patient_phone": patient_phone},
            {"patient_phone": phone_clean},
            {"patient_phone": f"91{phone_clean}"},
            {"patient_phone": f"+91{phone_clean}"}
        ]
    
    appointments = await db.appointments.find(
        query,
        {"_id": 0, "id": 1, "date": 1, "time": 1, "patient_name": 1,
         "doctor": 1, "clinic": 1, "status": 1, "appointment_type": 1}
    ).to_list(500)
    
    # Group by date
    calendar_data = {}
    for apt in appointments:
        date = apt.get("date", "")
        if date not in calendar_data:
            calendar_data[date] = {"date": date, "appointments": [], "count": 0}
        calendar_data[date]["appointments"].append(apt)
        calendar_data[date]["count"] += 1
    
    # Add status summary per date
    for date, data in calendar_data.items():
        statuses = {}
        for apt in data["appointments"]:
            s = apt.get("status", "Unknown")
            statuses[s] = statuses.get(s, 0) + 1
        data["status_summary"] = statuses
    
    return {
        "month": month,
        "year": year,
        "total_appointments": len(appointments),
        "dates_with_appointments": len(calendar_data),
        "calendar": list(calendar_data.values())
    }


@router.get("/appointments/v2/available-slots")
async def get_available_slots(
    date: str,
    doctor: Optional[str] = None,
    clinic: Optional[str] = None
):
    """Get available time slots for a given date."""
    db = get_db()
    
    # Get existing appointments for the date
    query = {"date": date}
    if doctor:
        query["doctor"] = doctor
    if clinic:
        query["clinic"] = clinic
    
    existing = await db.appointments.find(
        query,
        {"_id": 0, "time": 1, "status": 1}
    ).to_list(100)
    
    booked_times = set(apt.get("time", "") for apt in existing if apt.get("status") != "Cancelled")
    
    # Define slot windows - Morning and Evening
    morning_slots = [f"{h}:{m:02d}" for h in range(11, 14) for m in (0, 15, 30, 45)]
    evening_slots = [f"{h}:{m:02d}" for h in range(18, 22) for m in (0, 15, 30, 45)]
    all_slots = morning_slots + evening_slots
    
    available = [{"time": t, "available": t not in booked_times} for t in all_slots]
    
    return {
        "date": date,
        "slots": available,
        "total_booked": len(booked_times),
        "total_available": sum(1 for s in available if s["available"])
    }


# ============ Pre-consultation Form ============

class PreConsultationForm(BaseModel):
    appointment_id: str
    # Concise form fields
    chief_complaint: str  # Main reason for visit
    duration: Optional[str] = None  # How long the issue has been present
    current_medications: Optional[str] = None  # Current medications
    allergies: Optional[str] = None  # Known allergies
    vitals: Optional[Dict] = None  # BP, temp, weight, etc.
    previous_reports: Optional[List[str]] = None  # URLs to uploaded reports

@router.post("/appointments/v2/pre-consultation")
async def submit_pre_consultation(form: PreConsultationForm):
    """Submit a concise pre-consultation form for an appointment."""
    db = get_db()
    
    # Verify appointment exists
    appointment = await db.appointments.find_one(
        {"id": form.appointment_id},
        {"_id": 0, "id": 1, "patient_name": 1, "status": 1}
    )
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    form_data = {
        "id": str(uuid.uuid4())[:8],
        "appointment_id": form.appointment_id,
        "chief_complaint": form.chief_complaint,
        "duration": form.duration or "",
        "current_medications": form.current_medications or "",
        "allergies": form.allergies or "",
        "vitals": form.vitals or {},
        "previous_reports": form.previous_reports or [],
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }
    
    # Save form and link to appointment
    await db.pre_consultation_forms.insert_one(form_data)
    form_data.pop("_id", None)
    
    # Update appointment with form reference
    await db.appointments.update_one(
        {"id": form.appointment_id},
        {"$set": {"pre_consultation_form_id": form_data["id"]}}
    )
    
    return {"status": "success", "form": form_data}

@router.get("/appointments/v2/pre-consultation/{appointment_id}")
async def get_pre_consultation(appointment_id: str):
    """Get pre-consultation form for an appointment."""
    db = get_db()
    form = await db.pre_consultation_forms.find_one(
        {"appointment_id": appointment_id},
        {"_id": 0}
    )
    if not form:
        raise HTTPException(status_code=404, detail="No pre-consultation form found")
    return form


# ============ Home Test Sample Collection Scheduler ============

class HomeTestSchedule(BaseModel):
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    address: str
    pincode: Optional[str] = None
    tests: List[str]
    preferred_date: str
    preferred_time: str  # Morning (7-10 AM), Afternoon (12-3 PM), Evening (5-7 PM)
    special_instructions: Optional[str] = None

@router.post("/appointments/v2/home-test")
async def schedule_home_test(schedule: HomeTestSchedule):
    """Schedule a home sample collection for diagnostic tests."""
    db = get_db()
    
    collection = {
        "id": f"HC-{str(uuid.uuid4())[:8].upper()}",
        "patient_name": schedule.patient_name,
        "patient_phone": schedule.patient_phone,
        "patient_email": schedule.patient_email or "",
        "address": schedule.address,
        "pincode": schedule.pincode or "",
        "tests": schedule.tests,
        "preferred_date": schedule.preferred_date,
        "preferred_time": schedule.preferred_time,
        "special_instructions": schedule.special_instructions or "",
        "status": "scheduled",
        "service_type": "home_collection",
        "collection_fee": 100.0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.home_collections.insert_one(collection)
    collection.pop("_id", None)
    
    return {"status": "success", "collection": collection}

@router.get("/appointments/v2/home-tests/{phone}")
async def get_home_tests(phone: str):
    """Get scheduled home test collections for a patient."""
    db = get_db()
    collections = await db.home_collections.find(
        {"patient_phone": phone},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    return {"collections": collections, "count": len(collections)}
