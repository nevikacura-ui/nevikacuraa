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
DOCTOR_SCHEDULE = {
    "Dr. Vikas Jha": {
        "Pushpa Clinic": {
            "days": [0, 1, 2, 3, 4, 5],  # Mon-Sat
            "morning": {"start": "09:00", "end": "13:00"},
            "evening": {"start": "17:00", "end": "21:00"}
        }
    },
    "Dr. Neha Patel": {
        "Amnion Clinic": {
            "days": [0, 1, 2, 3, 4, 5],  # Mon-Sat
            "morning": {"start": "10:00", "end": "14:00"},
            "evening": {"start": "18:00", "end": "21:00"}
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

def get_slots_for_doctor_clinic_date(doctor: str, clinic: str, date_str: str):
    """Get available time slots based on doctor's schedule for that day"""
    # Get day of week (0=Monday, 6=Sunday)
    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    day_of_week = date_obj.weekday()
    
    schedule = DOCTOR_SCHEDULE.get(doctor, {}).get(clinic, {})
    
    if not schedule or day_of_week not in schedule.get("days", []):
        return []  # Doctor not available at this clinic on this day
    
    slots = []
    
    # Morning session
    if schedule.get("morning"):
        morning_slots = generate_time_slots_for_session(
            schedule["morning"]["start"],
            schedule["morning"]["end"]
        )
        slots.extend(morning_slots)
    
    # Evening session
    if schedule.get("evening"):
        evening_slots = generate_time_slots_for_session(
            schedule["evening"]["start"],
            schedule["evening"]["end"]
        )
        slots.extend(evening_slots)
    
    return slots

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
    },
    "Dr. Neha Patel": {
        "NF": {"label": "No Fee", "amount": 0},
        "O1": {"label": "OBGY - New", "amount": 500},
        "O2": {"label": "OBGY - Review", "amount": 400},
        "O3": {"label": "OBGY - Follow-up", "amount": 300},
        "S1": {"label": "Sonography - Basic", "amount": 300},
        "S2": {"label": "Sonography - Follow-up", "amount": 200},
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
    time: str
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
    staff = Depends(verify_staff)
):
    """Get available slots for a doctor on a date based on their schedule"""
    
    # Get slots based on doctor's schedule for this clinic and day
    all_slots = get_slots_for_doctor_clinic_date(doctor, clinic, date)
    
    if not all_slots:
        # Doctor not available at this clinic on this day
        return {
            "clinic": clinic,
            "doctor": doctor,
            "date": date,
            "available_slots": [],
            "booked_count": 0,
            "total_slots": 0,
            "message": f"{doctor} is not available at {clinic} on this day"
        }
    
    # Get all booked appointments for this doctor/clinic/date
    booked = await db.appointments.find(
        {
            "clinic": clinic,
            "doctor": doctor,
            "date": date,
            "status": {"$nin": ["Cancelled", "No Show"]}
        },
        {"_id": 0, "time": 1, "booking_type": 1}
    ).to_list(100)
    
    booked_times = set(apt.get("time") for apt in booked if apt.get("time"))
    
    # Filter available slots
    available = [slot for slot in all_slots if slot["value"] not in booked_times]
    
    return {
        "clinic": clinic,
        "doctor": doctor,
        "date": date,
        "available_slots": available,
        "booked_count": len(booked_times),
        "total_slots": len(all_slots)
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
    
    if data.status == "WithDoctor":
        update_data["with_doctor_at"] = datetime.now(timezone.utc).isoformat()
    
    if data.status == "Completed":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
        if data.fee_code:
            update_data["fee_code"] = data.fee_code
        if data.scan_codes:
            update_data["scan_codes"] = data.scan_codes
        if data.total_amount is not None:
            update_data["total_amount"] = data.total_amount
        if data.notes:
            update_data["completion_notes"] = data.notes
    
    await db.appointments.update_one(
        {"id": appointment_id},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "status": data.status,
        "message": f"Appointment status updated to {data.status}"
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
