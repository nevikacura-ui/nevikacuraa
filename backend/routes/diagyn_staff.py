"""
DiaGyn Staff Portal - Simplified Appointment Management
New unified portal for both Pushpa & Amnion clinics
"""

from fastapi import APIRouter, HTTPException, Depends, Header, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import jwt
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/diagyn-staff", tags=["DiaGyn Staff Portal"])

# IST Timezone Helper
IST_OFFSET = timedelta(hours=5, minutes=30)

def get_ist_now():
    """Get current time in IST"""
    return datetime.now(timezone.utc) + IST_OFFSET

def get_ist_date():
    """Get current date in IST (YYYY-MM-DD)"""
    return get_ist_now().strftime("%Y-%m-%d")

def get_ist_datetime():
    """Get current datetime in IST (ISO format)"""
    return get_ist_now().isoformat()

def format_ist_display(dt_str):
    """Format datetime for display (DD-MM-YYYY HH:MM AM/PM)"""
    try:
        dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        ist_dt = dt + IST_OFFSET
        return ist_dt.strftime("%d-%m-%Y %I:%M %p")
    except:
        return dt_str

# Database and config - injected from server.py
db = None
JWT_SECRET = None
JWT_ALGORITHM = "HS256"
send_whatsapp_notification = None

# Clinic configuration
CLINICS = {
    "Pushpa Clinic": {
        "doctors": ["Dr. Vikas Jha"],
        "address": "Pushpa Clinic, Naigaon East",
        "map_link": "https://maps.app.goo.gl/LfFoHwVzvMEQ1Qzt9"
    },
    "Amnion Clinic": {
        "doctors": ["Dr. Neha Patel"],
        "address": "Amnion Clinic, Naigaon",
        "map_link": "https://maps.app.goo.gl/aBr4jwCv3b6874vi8"
    }
}

# Doctor Schedule - which days at which clinic with timings
# Days: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
# Based on clinic timings image:
# Dr Vikas Jha: Pushpa Mon/Wed/Fri 6pm-10pm | Amnion Mon-Sat 11am-2pm + Tue/Thu/Sat 6pm-10pm
# Dr Neha Patel: Pushpa Mon-Sat 11am-2pm + Tue/Thu/Sat 6pm-10pm | Amnion Mon/Wed/Fri 6pm-10pm
DOCTOR_SCHEDULE = {
    "Dr. Vikas Jha": {
        "Pushpa Clinic": {
            "days": [0, 2, 4],  # Mon, Wed, Fri
            "evening": {"start": "18:00", "end": "22:00"}
        },
        "Amnion Clinic": {
            "days": [0, 1, 2, 3, 4, 5],  # Mon-Sat
            "morning": {"start": "11:00", "end": "14:00"},
            "evening": {"start": "18:00", "end": "22:00", "days": [1, 3, 5]}  # Tue/Thu/Sat only
        }
    },
    "Dr. Neha Patel": {
        "Pushpa Clinic": {
            "days": [0, 1, 2, 3, 4, 5],  # Mon-Sat
            "morning": {"start": "11:00", "end": "14:00"},
            "evening": {"start": "18:00", "end": "22:00", "days": [1, 3, 5]}  # Tue/Thu/Sat only
        },
        "Amnion Clinic": {
            "days": [0, 2, 4],  # Mon, Wed, Fri
            "evening": {"start": "18:00", "end": "22:00"}
        }
    }
}

def generate_time_slots_for_session(start_time: str, end_time: str, interval: int = 15):
    """Generate time slots for a session with given interval"""
    slots = []
    start_hour, start_min = map(int, start_time.split(':'))
    end_hour, end_min = map(int, end_time.split(':'))
    
    current_minutes = start_hour * 60 + start_min
    end_minutes = end_hour * 60 + end_min
    
    while current_minutes < end_minutes:
        hour = current_minutes // 60
        minute = current_minutes % 60
        time_str = f"{hour:02d}:{minute:02d}"
        display = datetime.strptime(time_str, "%H:%M").strftime("%I:%M %p")
        slots.append({"value": time_str, "display": display})
        current_minutes += interval
    
    return slots

def get_current_ist_session():
    """Get current session based on IST time
    Morning: 11am-2pm (hours 11-14)
    Evening: 6pm-10pm (hours 18-22)
    Returns: 'morning', 'evening', or None
    """
    now_utc = datetime.now(timezone.utc)
    ist_offset = timedelta(hours=5, minutes=30)
    now_ist = now_utc + ist_offset
    current_hour = now_ist.hour
    
    if 11 <= current_hour < 14:
        return "morning"
    elif 18 <= current_hour < 22:
        return "evening"
    return None


def get_slots_for_doctor_clinic_date(doctor: str, clinic: str, date_str: str, session_filter: str = None):
    """Get available time slots based on doctor's schedule for that day
    session_filter: None (all), 'current' (walk-in), 'future' (book appointment)
    """
    # Get day of week (0=Monday, 6=Sunday)
    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    day_of_week = date_obj.weekday()
    
    schedule = DOCTOR_SCHEDULE.get(doctor, {}).get(clinic, {})
    
    if not schedule or day_of_week not in schedule.get("days", []):
        return {"morning": [], "evening": [], "all": [], "current_session": None}
    
    # Get current IST time
    now_utc = datetime.now(timezone.utc)
    ist_offset = timedelta(hours=5, minutes=30)
    now_ist = now_utc + ist_offset
    current_date = now_ist.strftime("%Y-%m-%d")
    
    # Get current session
    current_session = get_current_ist_session()
    
    morning_slots = []
    evening_slots = []
    
    # Morning session (11am-2pm typically)
    if schedule.get("morning"):
        morning_slots = generate_time_slots_for_session(
            schedule["morning"]["start"],
            schedule["morning"]["end"]
        )
        # Tag each slot with session
        for slot in morning_slots:
            slot["session"] = "morning"
    
    # Evening session - check if it has specific days restriction
    if schedule.get("evening"):
        evening_config = schedule["evening"]
        evening_days = evening_config.get("days", schedule.get("days", []))
        if day_of_week in evening_days:
            evening_slots = generate_time_slots_for_session(
                evening_config["start"],
                evening_config["end"]
            )
            for slot in evening_slots:
                slot["session"] = "evening"
    
    is_today = date_str == current_date
    
    if session_filter == "current" and is_today:
        # Walk-in: Show ALL slots in the current session (not filtered by current time)
        # User confirmed: "Show all remaining slots"
        if current_session == "morning":
            return {"morning": morning_slots, "evening": [], "all": morning_slots, "current_session": "morning"}
        elif current_session == "evening":
            return {"morning": [], "evening": evening_slots, "all": evening_slots, "current_session": "evening"}
        else:
            # No active session - return empty for walk-in
            return {"morning": [], "evening": [], "all": [], "current_session": None}
    
    elif session_filter == "future":
        # Book appointment: Show slots for future sessions only
        if is_today:
            if current_session == "morning":
                # Morning active - show evening slots for today
                return {"morning": [], "evening": evening_slots, "all": evening_slots, "current_session": "morning"}
            elif current_session == "evening":
                # Evening active - no slots for today (must book tomorrow)
                return {"morning": [], "evening": [], "all": [], "current_session": "evening"}
            else:
                # No active session - show all slots for today
                all_slots = morning_slots + evening_slots
                return {"morning": morning_slots, "evening": evening_slots, "all": all_slots, "current_session": None}
        else:
            # Future date - show all slots
            all_slots = morning_slots + evening_slots
            return {"morning": morning_slots, "evening": evening_slots, "all": all_slots, "current_session": None}
    
    # Default: return all slots
    all_slots = morning_slots + evening_slots
    return {"morning": morning_slots, "evening": evening_slots, "all": all_slots, "current_session": current_session}

# Default time slots (fallback)
def generate_time_slots():
    slots = []
    for hour in range(9, 21):  # 9 AM to 9 PM
        for minute in [0, 15, 30, 45]:
            time_str = f"{hour:02d}:{minute:02d}"
            display = datetime.strptime(time_str, "%H:%M").strftime("%I:%M %p")
            slots.append({"value": time_str, "display": display})
    return slots

TIME_SLOTS = generate_time_slots()

# Fee codes for doctors
FEE_CODES = {
    "Dr. Vikas Jha": {
        "NF": {"label": "No Fee (Follow-up)", "amount": 0},
        "G1": {"label": "General - New", "amount": 150},
        "G2": {"label": "General - Follow-up", "amount": 100},
        "D1": {"label": "Diabetes - New", "amount": 500},
        "D2": {"label": "Diabetes - Review", "amount": 400},
        "D3": {"label": "Diabetes - Follow-up", "amount": 300},
        "S1": {"label": "Speciality - New", "amount": 300},
        "S2": {"label": "Speciality - Follow-up", "amount": 200},
        "O1": {"label": "OBGYN - New", "amount": 500},
        "O2": {"label": "OBGYN - Review", "amount": 400},
        "O3": {"label": "OBGYN - Follow-up", "amount": 300},
    },
    "Dr. Neha Patel": {
        "NF": {"label": "No Fee", "amount": 0},
        "G1": {"label": "General - New", "amount": 150},
        "G2": {"label": "General - Follow-up", "amount": 100},
        "S1": {"label": "Speciality - New", "amount": 300},
        "S2": {"label": "Speciality - Follow-up", "amount": 200},
        "O1": {"label": "OBGYN - New", "amount": 500},
        "O2": {"label": "OBGYN - Review", "amount": 400},
        "O3": {"label": "OBGYN - Follow-up", "amount": 300},
    }
}

SCAN_FEES = {
    "ES": {"label": "Early Scan", "amount": 1000},
    "NT": {"label": "NT Scan", "amount": 1200},
    "GS": {"label": "Growth Scan", "amount": 1500},
    "FL": {"label": "Follicular", "amount": 200},
    "UP": {"label": "USG Pelvis", "amount": 1000},
    "UT": {"label": "UpT", "amount": 100},
}


def set_db(database):
    global db
    db = database

def set_jwt_config(secret, algorithm="HS256"):
    global JWT_SECRET, JWT_ALGORITHM
    JWT_SECRET = secret
    JWT_ALGORITHM = algorithm

def set_whatsapp_func(func):
    global send_whatsapp_notification
    send_whatsapp_notification = func


# ============ Auth ============

async def verify_staff(authorization: str = Header(None)):
    """Verify staff token"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Staff authentication required")
    
    token = authorization.split(' ')[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        role = payload.get('role', '')
        valid_roles = ['clinic_staff', 'clinic_staff_pushpa', 'clinic_staff_amnion', 
                       'doctor', 'doctor_pushpa', 'doctor_amnion', 'diagyn_staff', 
                       'admin', 'super_admin']
        is_valid = role in valid_roles or 'staff' in role.lower() or 'doctor' in role.lower()
        if not is_valid:
            raise HTTPException(status_code=403, detail="Staff access required")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============ Models ============

class PatientLookup(BaseModel):
    mobile: str

class PatientRegister(BaseModel):
    name: str
    mobile: str
    age: Optional[int] = None
    gender: Optional[str] = None
    address: Optional[str] = None

class AppointmentBook(BaseModel):
    clinic: str
    doctor: str
    date: str
    time: Optional[str] = None  # Optional for Emergency bookings
    patient_name: str
    patient_mobile: str
    patient_id: Optional[str] = None
    appointment_type: str = "SCHEDULED"  # SCHEDULED, WALK_IN, EMERGENCY
    notes: Optional[str] = None

class AppointmentStatusUpdate(BaseModel):
    status: str  # Booked, CheckedIn, WithDoctor, Completed
    fee_code: Optional[str] = None
    scan_codes: Optional[List[str]] = []
    total_amount: Optional[float] = None
    notes: Optional[str] = None
    follow_up_date: Optional[str] = None  # For scheduling follow-up appointments


# ============ Patient Database ============

@router.post("/patient/lookup")
async def lookup_patient(data: PatientLookup, staff = Depends(verify_staff)):
    """Look up patient by mobile number for quick booking"""
    mobile = data.mobile.strip().replace(" ", "")
    
    # Search in patients collection
    patient = await db.patients.find_one(
        {"$or": [{"mobile": mobile}, {"phone": mobile}, {"patient_phone": mobile}]},
        {"_id": 0}
    )
    
    if patient:
        return {
            "found": True,
            "patient": {
                "id": patient.get("patient_id") or patient.get("id"),
                "name": patient.get("name") or patient.get("patient_name"),
                "mobile": mobile,
                "age": patient.get("age"),
                "gender": patient.get("gender"),
                "visit_count": patient.get("visit_count", 0),
                "last_visit": patient.get("last_visit")
            }
        }
    
    # Also check appointments for this phone
    last_appointment = await db.appointments.find_one(
        {"patient_phone": mobile},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    
    if last_appointment:
        return {
            "found": True,
            "patient": {
                "id": last_appointment.get("patient_id"),
                "name": last_appointment.get("patient_name"),
                "mobile": mobile,
                "age": None,
                "gender": None,
                "visit_count": 1,
                "last_visit": last_appointment.get("date")
            },
            "source": "appointments"
        }
    
    return {"found": False, "mobile": mobile}


@router.post("/patient/register")
async def register_patient(data: PatientRegister, staff = Depends(verify_staff)):
    """Register a new patient in the database"""
    mobile = data.mobile.strip().replace(" ", "")
    
    # Check if already exists
    existing = await db.patients.find_one({"mobile": mobile})
    if existing:
        return {
            "success": True,
            "patient_id": existing.get("patient_id") or existing.get("id"),
            "message": "Patient already registered",
            "existing": True
        }
    
    # Generate patient ID: PAT-YYYYMMDD-XXXX
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    count = await db.patients.count_documents({})
    patient_id = f"PAT-{today}-{(count + 1):04d}"
    
    patient_doc = {
        "patient_id": patient_id,
        "name": data.name.strip(),
        "mobile": mobile,
        "age": data.age,
        "gender": data.gender,
        "address": data.address,
        "visit_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": staff.get("name", "Staff")
    }
    
    await db.patients.insert_one(patient_doc)
    
    return {
        "success": True,
        "patient_id": patient_id,
        "message": f"Patient {data.name} registered successfully"
    }


@router.get("/patients/recent")
async def get_recent_patients(limit: int = 20, staff = Depends(verify_staff)):
    """Get recently visited patients"""
    patients = await db.patients.find(
        {},
        {"_id": 0, "patient_id": 1, "name": 1, "mobile": 1, "age": 1, "visit_count": 1, "last_visit": 1}
    ).sort("last_visit", -1).limit(limit).to_list(limit)
    
    return {"patients": patients}


# ============ Slot Management ============

@router.get("/slots/available")
async def get_available_slots(
    clinic: str,
    doctor: str,
    date: str,
    mode: str = Query(None, description="'walkin' for current session, 'book' for future sessions"),
    staff = Depends(verify_staff)
):
    """Get available slots for a doctor on a date based on their schedule
    mode='walkin': Current session only (for walk-in/emergency)
    mode='book': Future sessions only (for booking appointments)
    mode=None: All slots
    """
    
    # Map mode to session filter
    session_filter = None
    if mode == "walkin":
        session_filter = "current"
    elif mode == "book":
        session_filter = "future"
    
    # Get slots based on doctor's schedule for this clinic and day
    slot_data = get_slots_for_doctor_clinic_date(doctor, clinic, date, session_filter)
    
    if not slot_data or not slot_data.get("all"):
        # Doctor not available at this clinic on this day/session
        return {
            "clinic": clinic,
            "doctor": doctor,
            "date": date,
            "available_slots": [],
            "morning_slots": [],
            "evening_slots": [],
            "booked_count": 0,
            "total_slots": 0,
            "current_session": slot_data.get("current_session") if slot_data else None,
            "message": f"{doctor} is not available at {clinic} for this session"
        }
    
    all_slots = slot_data.get("all", [])
    
    # Get all booked appointments for this doctor/clinic/date
    booked = await db.appointments.find(
        {
            "clinic": clinic,
            "doctor": doctor,
            "date": date,
            "status": {"$nin": ["Cancelled", "No Show"]}
        },
        {"_id": 0, "time": 1}
    ).to_list(100)
    
    booked_times = set(apt.get("time") for apt in booked if apt.get("time"))
    
    # Filter available slots (exclude booked)
    available = [slot for slot in all_slots if slot["value"] not in booked_times]
    morning_available = [slot for slot in slot_data.get("morning", []) if slot["value"] not in booked_times]
    evening_available = [slot for slot in slot_data.get("evening", []) if slot["value"] not in booked_times]
    
    return {
        "clinic": clinic,
        "doctor": doctor,
        "date": date,
        "available_slots": available,
        "morning_slots": morning_available,
        "evening_slots": evening_available,
        "booked_count": len(booked_times),
        "total_slots": len(all_slots),
        "current_session": slot_data.get("current_session"),
        "mode": mode
    }


@router.get("/slots/booked")
async def get_booked_slots(
    clinic: str,
    doctor: str,
    date: str,
    staff = Depends(verify_staff)
):
    """Get list of booked slot times (for real-time sync)"""
    booked = await db.appointments.find(
        {
            "clinic": clinic,
            "doctor": doctor,
            "date": date,
            "status": {"$nin": ["Cancelled", "No Show"]}
        },
        {"_id": 0, "time": 1}
    ).to_list(100)
    
    return {
        "booked_slots": [apt.get("time") for apt in booked if apt.get("time")]
    }


# ============ Appointments ============

@router.post("/appointments/book")
async def book_appointment(data: AppointmentBook, staff = Depends(verify_staff)):
    """Book a new appointment (Walk-in, Scheduled, or Emergency)"""
    
    # Validate clinic exists
    if data.clinic not in CLINICS:
        raise HTTPException(status_code=400, detail=f"Invalid clinic: {data.clinic}")
    
    # Check if slot is already booked (for non-emergency)
    if data.appointment_type != "EMERGENCY" and data.time:
        existing = await db.appointments.find_one({
            "clinic": data.clinic,
            "doctor": data.doctor,
            "date": data.date,
            "time": data.time,
            "status": {"$nin": ["Cancelled", "No Show"]}
        })
        if existing:
            raise HTTPException(status_code=409, detail="This slot is already booked")
    
    # Generate booking ID: DG-YYYYMMDD-XXXX
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    count = await db.appointments.count_documents({"date": data.date})
    booking_id = f"DG-{today}-{(count + 1):04d}"
    
    appointment = {
        "id": str(uuid.uuid4()),
        "booking_id": booking_id,
        "clinic": data.clinic,
        "doctor": data.doctor,
        "date": data.date,
        "time": data.time if data.appointment_type != "EMERGENCY" else None,
        "patient_name": data.patient_name.strip(),
        "patient_phone": data.patient_mobile.strip(),
        "patient_id": data.patient_id,
        "appointment_type": data.appointment_type,
        "booking_type": data.appointment_type.lower(),
        "status": "Booked",
        "notes": data.notes,
        "created_by": staff.get("name", "Staff"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.appointments.insert_one(appointment)
    appointment.pop("_id", None)
    
    # Update patient's visit count
    if data.patient_id:
        await db.patients.update_one(
            {"patient_id": data.patient_id},
            {
                "$inc": {"visit_count": 1},
                "$set": {"last_visit": data.date}
            }
        )
    
    # TODO: Send WhatsApp notification via MSG91
    
    return {
        "success": True,
        "booking_id": booking_id,
        "appointment": appointment,
        "message": f"{data.appointment_type} appointment booked for {data.patient_name}"
    }


@router.get("/appointments/today")
async def get_todays_appointments(
    clinic: Optional[str] = None,
    staff = Depends(verify_staff)
):
    """Get all appointments for today"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    query = {"date": today}
    if clinic and clinic != "all":
        query["clinic"] = clinic
    
    appointments = await db.appointments.find(
        query,
        {"_id": 0}
    ).sort([("time", 1), ("created_at", 1)]).to_list(200)
    
    # Group by status for summary
    summary = {
        "total": len(appointments),
        "booked": len([a for a in appointments if a.get("status") == "Booked"]),
        "checked_in": len([a for a in appointments if a.get("status") == "CheckedIn"]),
        "with_doctor": len([a for a in appointments if a.get("status") == "WithDoctor"]),
        "completed": len([a for a in appointments if a.get("status") == "Completed"]),
        "walk_in": len([a for a in appointments if a.get("appointment_type") == "WALK_IN"]),
        "emergency": len([a for a in appointments if a.get("appointment_type") == "EMERGENCY"]),
    }
    
    return {
        "date": today,
        "clinic": clinic or "all",
        "appointments": appointments,
        "summary": summary
    }


@router.get("/appointments/by-date")
async def get_appointments_by_date(
    date: str,
    clinic: Optional[str] = None,
    staff = Depends(verify_staff)
):
    """Get appointments for a specific date"""
    query = {"date": date}
    if clinic and clinic != "all":
        query["clinic"] = clinic
    
    appointments = await db.appointments.find(
        query,
        {"_id": 0}
    ).sort([("time", 1), ("created_at", 1)]).to_list(200)
    
    # Group by status
    summary = {
        "total": len(appointments),
        "booked": len([a for a in appointments if a.get("status") == "Booked"]),
        "checked_in": len([a for a in appointments if a.get("status") == "CheckedIn"]),
        "with_doctor": len([a for a in appointments if a.get("status") == "WithDoctor"]),
        "completed": len([a for a in appointments if a.get("status") == "Completed"]),
    }
    
    return {
        "date": date,
        "appointments": appointments,
        "summary": summary
    }


@router.put("/appointments/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: str,
    data: AppointmentStatusUpdate,
    staff = Depends(verify_staff)
):
    """Update appointment status (CheckedIn, WithDoctor, Completed)"""
    
    appointment = await db.appointments.find_one({"id": appointment_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    update_data = {
        "status": data.status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": staff.get("name", "Staff")
    }
    
    if data.status == "CheckedIn":
        update_data["checked_in_at"] = datetime.now(timezone.utc).isoformat()
        
        # Generate daily token number (continuous for whole day, resets next day)
        today_ist = (datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)).strftime("%Y-%m-%d")
        clinic = appointment.get("clinic", "")
        
        # Count existing check-ins for today at this clinic
        existing_tokens = await db.appointments.count_documents({
            "clinic": clinic,
            "date": today_ist,
            "token_number": {"$exists": True}
        })
        token_number = existing_tokens + 1
        update_data["token_number"] = token_number
    
    if data.status == "WithDoctor":
        update_data["with_doctor_at"] = datetime.now(timezone.utc).isoformat()
    
    if data.status == "Completed":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
        update_data["completed_by"] = staff.get("name", "Doctor")
        if data.fee_code:
            update_data["fee_code"] = data.fee_code
        if data.scan_codes:
            update_data["scan_codes"] = data.scan_codes
        if data.total_amount is not None:
            update_data["total_amount"] = data.total_amount
        if data.notes:
            update_data["completion_notes"] = data.notes
        if data.follow_up_date:
            update_data["follow_up_date"] = data.follow_up_date
        
        # Auto-send Google Review request via WhatsApp
        # Works for ALL appointment types: SCHEDULED, WALK_IN, EMERGENCY
        appointment_type = appointment.get("appointment_type", "SCHEDULED")
        if appointment.get("phone"):
            try:
                from services.msg91_whatsapp import send_msg91_whatsapp
                
                patient_name = appointment.get("patient_name", "Patient")
                doctor_name = appointment.get("doctor", "Doctor")
                clinic_name = appointment.get("clinic", "DiaGyn Healthcare")
                
                # Get clinic-specific Google Review link
                review_links = {
                    "Pushpa Clinic": "https://g.page/r/CZBa3QPJ_1lXECI/review",
                    "Amnion Clinic": "https://g.page/r/CZyZHBaBV8i_EBI/review"
                }
                review_link = review_links.get(clinic_name, "https://g.page/r/CZBa3QPJ_1lXECI/review")
                
                clean_phone = appointment["phone"].replace("+", "").replace(" ", "").replace("-", "")
                if not clean_phone.startswith("91"):
                    clean_phone = "91" + clean_phone
                
                # Send review request
                await send_msg91_whatsapp(
                    recipient_phone=clean_phone,
                    template_name="diagyn_google_review",
                    variables=[patient_name, doctor_name, clinic_name, review_link],
                    db=db,
                    reference_id=f"review_{appointment_id}_{datetime.now().strftime('%Y%m%d%H%M')}",
                    message_type="google_review_request"
                )
                update_data["review_request_sent"] = True
                update_data["review_request_sent_at"] = datetime.now(timezone.utc).isoformat()
                logger.info(f"Google Review request sent to {clean_phone} for {clinic_name} ({appointment_type} appointment)")
            except Exception as e:
                logger.error(f"Failed to send review request: {e}")
                update_data["review_request_error"] = str(e)
    
    await db.appointments.update_one(
        {"id": appointment_id},
        {"$set": update_data}
    )
    
    # Log staff activity
    try:
        await db.staff_activity.insert_one({
            "staff_id": staff.get("sub"),
            "staff_name": staff.get("name"),
            "action": f"appointment_{data.status.lower()}",
            "details": {
                "appointment_id": appointment_id,
                "patient_name": appointment.get("patient_name"),
                "clinic": appointment.get("clinic"),
                "total_amount": update_data.get("total_amount") if data.status == "Completed" else None
            },
            "portal": "diagyn",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d")
        })
    except Exception as e:
        logger.error(f"Failed to log activity: {e}")
    
    # Prepare response with token data for printing
    response = {
        "success": True,
        "status": data.status,
        "message": f"Appointment status updated to {data.status}"
    }
    
    # Include token print data on check-in
    if data.status == "CheckedIn":
        response["token_data"] = {
            "token_number": update_data.get("token_number"),
            "patient_name": appointment.get("patient_name"),
            "clinic": appointment.get("clinic"),
            "clinic_address": CLINICS.get(appointment.get("clinic"), {}).get("address", ""),
            "slot_time": appointment.get("time") or "Emergency",
            "date": appointment.get("date"),
            "checked_in_at": update_data.get("checked_in_at"),
            "booking_id": appointment.get("booking_id"),
            "appointment_type": appointment.get("appointment_type", "SCHEDULED")
        }
    
    # Include bill/receipt data on completion
    if data.status == "Completed":
        # Get IST time
        ist_now = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
        
        response["bill_data"] = {
            "bill_number": f"DG{ist_now.strftime('%Y%m%d')}{appointment.get('token_number', '000'):03d}",
            "patient_name": appointment.get("patient_name"),
            "patient_phone": appointment.get("phone"),
            "patient_age": appointment.get("age"),
            "clinic": appointment.get("clinic"),
            "clinic_address": CLINICS.get(appointment.get("clinic"), {}).get("address", ""),
            "doctor": appointment.get("doctor"),
            "date": appointment.get("date"),
            "time": appointment.get("time") or "Emergency",
            "booking_id": appointment.get("booking_id"),
            "token_number": appointment.get("token_number"),
            "fee_code": data.fee_code,
            "scan_codes": data.scan_codes or [],
            "total_amount": data.total_amount,
            "notes": data.notes,
            "follow_up_date": data.follow_up_date,
            "completed_at": ist_now.strftime("%d-%m-%Y %I:%M %p"),
            "completed_by": staff.get("name", "Doctor"),
            "appointment_type": appointment.get("appointment_type", "SCHEDULED")
        }
    
    return response


# ============ Update Billing (Without Completing) ============

class BillingUpdate(BaseModel):
    fee_code: str
    scan_codes: Optional[List[str]] = []
    total_amount: Optional[float] = None
    notes: Optional[str] = None
    follow_up_date: Optional[str] = None

@router.put("/appointments/{appointment_id}/billing")
async def update_appointment_billing(
    appointment_id: str,
    data: BillingUpdate,
    staff = Depends(verify_staff)
):
    """Update appointment billing details without completing the consultation"""
    
    appointment = await db.appointments.find_one({"id": appointment_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    update_data = {
        "fee_code": data.fee_code,
        "scan_codes": data.scan_codes or [],
        "total_amount": data.total_amount,
        "billing_notes": data.notes,
        "follow_up_date": data.follow_up_date,
        "billing_updated_at": datetime.now(timezone.utc).isoformat(),
        "billing_updated_by": staff.get("name", "Doctor")
    }
    
    await db.appointments.update_one(
        {"id": appointment_id},
        {"$set": update_data}
    )
    
    # Log billing activity
    try:
        await db.staff_activity.insert_one({
            "staff_id": staff.get("sub"),
            "staff_name": staff.get("name"),
            "action": "appointment_billing_updated",
            "details": {
                "appointment_id": appointment_id,
                "patient_name": appointment.get("patient_name"),
                "fee_code": data.fee_code,
                "total_amount": data.total_amount
            },
            "portal": "diagyn",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d")
        })
    except Exception as e:
        logger.error(f"Failed to log billing activity: {e}")
    
    return {
        "success": True,
        "message": f"Billing updated - ₹{data.total_amount}",
        "fee_code": data.fee_code,
        "total_amount": data.total_amount
    }


# ============ Collection Summary ============

@router.get("/summary/daily")
async def get_daily_summary(
    date: Optional[str] = None,
    clinic: Optional[str] = None,
    staff = Depends(verify_staff)
):
    """Get daily collection summary"""
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    query = {"date": date, "status": "Completed"}
    if clinic and clinic != "all":
        query["clinic"] = clinic
    
    appointments = await db.appointments.find(query, {"_id": 0}).to_list(200)
    
    total_collection = sum(a.get("total_amount", 0) for a in appointments)
    total_patients = len(appointments)
    
    # Break down by fee type
    by_clinic = {}
    for apt in appointments:
        c = apt.get("clinic", "Unknown")
        if c not in by_clinic:
            by_clinic[c] = {"count": 0, "amount": 0}
        by_clinic[c]["count"] += 1
        by_clinic[c]["amount"] += apt.get("total_amount", 0)
    
    return {
        "date": date,
        "total_patients": total_patients,
        "total_collection": total_collection,
        "by_clinic": by_clinic,
        "appointments": appointments
    }


@router.get("/summary/weekly")
async def get_weekly_summary(
    clinic: Optional[str] = None,
    staff = Depends(verify_staff)
):
    """Get weekly collection summary (last 7 days)"""
    today = datetime.now(timezone.utc)
    dates = [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)]
    
    query = {"date": {"$in": dates}, "status": "Completed"}
    if clinic and clinic != "all":
        query["clinic"] = clinic
    
    appointments = await db.appointments.find(query, {"_id": 0}).to_list(500)
    
    # Group by date
    by_date = {}
    for d in dates:
        by_date[d] = {"count": 0, "amount": 0}
    
    for apt in appointments:
        d = apt.get("date")
        if d in by_date:
            by_date[d]["count"] += 1
            by_date[d]["amount"] += apt.get("total_amount", 0)
    
    total_collection = sum(a.get("total_amount", 0) for a in appointments)
    total_patients = len(appointments)
    
    return {
        "period": "weekly",
        "dates": dates,
        "total_patients": total_patients,
        "total_collection": total_collection,
        "by_date": by_date
    }


@router.get("/summary/monthly")
async def get_monthly_summary(
    month: Optional[int] = None,
    year: Optional[int] = None,
    clinic: Optional[str] = None,
    staff = Depends(verify_staff)
):
    """Get monthly collection summary"""
    today = datetime.now(timezone.utc)
    if not month:
        month = today.month
    if not year:
        year = today.year
    
    # Get all dates in the month
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"
    
    query = {
        "date": {"$gte": start_date, "$lt": end_date},
        "status": "Completed"
    }
    if clinic and clinic != "all":
        query["clinic"] = clinic
    
    appointments = await db.appointments.find(query, {"_id": 0}).to_list(1000)
    
    total_collection = sum(a.get("total_amount", 0) for a in appointments)
    total_patients = len(appointments)
    
    # Group by clinic
    by_clinic = {}
    for apt in appointments:
        c = apt.get("clinic", "Unknown")
        if c not in by_clinic:
            by_clinic[c] = {"count": 0, "amount": 0}
        by_clinic[c]["count"] += 1
        by_clinic[c]["amount"] += apt.get("total_amount", 0)
    
    return {
        "period": "monthly",
        "month": month,
        "year": year,
        "total_patients": total_patients,
        "total_collection": total_collection,
        "by_clinic": by_clinic
    }


# ============ Configuration ============

@router.get("/config")
async def get_portal_config(staff = Depends(verify_staff)):
    """Get portal configuration (clinics, doctors, time slots, fee codes, schedules)"""
    return {
        "clinics": CLINICS,
        "doctor_schedule": DOCTOR_SCHEDULE,
        "time_slots": TIME_SLOTS,
        "fee_codes": FEE_CODES,
        "scan_fees": SCAN_FEES,
        "appointment_types": ["SCHEDULED", "WALK_IN", "EMERGENCY"]
    }


# ============ GOOGLE REVIEW REQUEST API ============

# Google Review Links for clinics
GOOGLE_REVIEW_LINKS = {
    "Pushpa Clinic": "https://g.page/r/CZBa3QPJ_1lXECI/review",
    "Amnion Clinic": "https://g.page/r/CZyZHBaBV8i_EBI/review",
    "DiaGyn Healthcare": "https://g.page/r/CZBa3QPJ_1lXECI/review"
}

@router.post("/whatsapp/send-review-request")
async def send_google_review_request(
    whatsapp_number: str,
    patient_name: str = "Patient",
    clinic_name: str = "Pushpa Clinic",
    doctor_name: str = "Dr. Vikas Jha",
    review_link: str = None
):
    """Send Google Review request via WhatsApp after appointment"""
    
    # Clean phone number
    clean_number = whatsapp_number.replace("+", "").replace(" ", "").replace("-", "")
    if not clean_number.startswith("91"):
        clean_number = "91" + clean_number
    
    # Get review link
    if not review_link:
        review_link = GOOGLE_REVIEW_LINKS.get(clinic_name, GOOGLE_REVIEW_LINKS["DiaGyn Healthcare"])
    
    try:
        from services.msg91_whatsapp import send_msg91_whatsapp
        
        # Template variables: [patient_name, doctor_name, clinic_name, review_link]
        result = await send_msg91_whatsapp(
            recipient_phone=clean_number,
            template_name="diagyn_google_review",
            variables=[patient_name, doctor_name, clinic_name, review_link],
            db=db,
            reference_id=f"review_{clean_number}_{datetime.now().strftime('%Y%m%d%H%M')}",
            message_type="google_review_request"
        )
        
        return {
            "success": True,
            "message": f"Google Review request sent to {clean_number}",
            "details": {
                "patient": patient_name,
                "doctor": doctor_name,
                "clinic": clinic_name,
                "review_link": review_link
            },
            "msg91_response": result
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "note": "MSG91 template 'diagyn_google_review' may need to be registered"
        }


@router.post("/whatsapp/bulk-review-request")
async def send_bulk_review_requests(
    clinic_name: str = "Pushpa Clinic",
    date_str: str = None
):
    """Send review requests to all patients who had appointments on a specific date"""
    
    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")
    
    # Get all completed appointments for the date
    appointments = await db.diagyn_appointments.find({
        "date": date_str,
        "clinic": clinic_name,
        "status": {"$in": ["completed", "visited"]}
    }).to_list(length=100)
    
    if not appointments:
        return {
            "success": False,
            "message": f"No completed appointments found for {clinic_name} on {date_str}"
        }
    
    results = []
    success_count = 0
    
    for apt in appointments:
        if apt.get("phone"):
            try:
                result = await send_google_review_request(
                    whatsapp_number=apt["phone"],
                    patient_name=apt.get("patient_name", "Patient"),
                    clinic_name=clinic_name,
                    doctor_name=apt.get("doctor", "Doctor")
                )
                if result.get("success"):
                    success_count += 1
                results.append({
                    "patient": apt.get("patient_name"),
                    "phone": apt.get("phone"),
                    "result": result
                })
            except Exception as e:
                results.append({
                    "patient": apt.get("patient_name"),
                    "phone": apt.get("phone"),
                    "error": str(e)
                })
    
    return {
        "success": True,
        "clinic": clinic_name,
        "date": date_str,
        "total_appointments": len(appointments),
        "review_requests_sent": success_count,
        "details": results
    }



@router.get("/review-stats")
async def get_review_stats(
    clinic: str = "Pushpa Clinic",
    date: str = None
):
    """Get Google Review request statistics for doctor portal"""
    
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")
    
    try:
        # Count today's review requests sent
        today_reviews = await db.diagyn_appointments.count_documents({
            "clinic": clinic,
            "date": date,
            "review_request_sent": True
        })
        
        # Count total reviews sent this week
        week_start = (datetime.strptime(date, "%Y-%m-%d") - timedelta(days=7)).strftime("%Y-%m-%d")
        weekly_reviews = await db.diagyn_appointments.count_documents({
            "clinic": clinic,
            "date": {"$gte": week_start, "$lte": date},
            "review_request_sent": True
        })
        
        # Count total completed appointments today
        total_completed = await db.diagyn_appointments.count_documents({
            "clinic": clinic,
            "date": date,
            "status": "Completed"
        })
        
        return {
            "today": today_reviews,
            "weekly": weekly_reviews,
            "total_completed_today": total_completed,
            "review_rate": round((today_reviews / total_completed * 100) if total_completed > 0 else 0, 1)
        }
    except Exception as e:
        return {
            "today": 0,
            "weekly": 0,
            "total_completed_today": 0,
            "review_rate": 0,
            "error": str(e)
        }

