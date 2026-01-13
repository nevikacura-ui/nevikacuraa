"""
Teleconsultation Module
- Video appointments with doctors
- Booking and scheduling
- E-prescriptions after consultation
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid

router = APIRouter(prefix="/teleconsult", tags=["Teleconsultation"])

db = None

def get_db():
    global db
    return db

def set_db(database):
    global db
    db = database

# Teleconsultation Config
TELECONSULT_CONFIG = {
    "consultation_fee": 300,  # Base fee
    "follow_up_fee": 150,     # Within 7 days
    "slot_duration_minutes": 15,
    "max_advance_booking_days": 7,
    "cancellation_hours": 2,  # Min hours before to cancel
    "platform": "jitsi"       # Video platform
}

# Available Slots Template
TELECONSULT_SLOTS = {
    "morning": ["09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45", "11:00", "11:15", "11:30", "11:45"],
    "afternoon": ["14:00", "14:15", "14:30", "14:45", "15:00", "15:15", "15:30", "15:45", "16:00", "16:15", "16:30", "16:45"],
    "evening": ["18:00", "18:15", "18:30", "18:45", "19:00", "19:15", "19:30", "19:45", "20:00", "20:15", "20:30", "20:45"]
}

# Models
class TeleconsultBooking(BaseModel):
    doctor_id: str
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    reason: Optional[str] = None
    symptoms: Optional[List[str]] = []
    is_follow_up: bool = False
    previous_consultation_id: Optional[str] = None

class EPrescription(BaseModel):
    consultation_id: str
    diagnosis: str
    medicines: List[dict]
    advice: Optional[str] = None
    follow_up_date: Optional[str] = None
    tests_recommended: Optional[List[str]] = []

# ==================== ENDPOINTS ====================

@router.get("/config")
async def get_teleconsult_config():
    """Get teleconsultation configuration"""
    return {
        "config": TELECONSULT_CONFIG,
        "slots_template": TELECONSULT_SLOTS
    }

@router.get("/available-slots/{doctor_id}")
async def get_available_slots(doctor_id: str, date: str):
    """Get available teleconsultation slots for a doctor on a date"""
    db = get_db()
    
    # Validate date
    try:
        slot_date = datetime.strptime(date, "%Y-%m-%d")
        today = datetime.now(timezone.utc).date()
        
        if slot_date.date() < today:
            raise HTTPException(status_code=400, detail="Cannot book for past dates")
        
        max_date = today + timedelta(days=TELECONSULT_CONFIG["max_advance_booking_days"])
        if slot_date.date() > max_date:
            raise HTTPException(status_code=400, detail=f"Cannot book more than {TELECONSULT_CONFIG['max_advance_booking_days']} days in advance")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Get booked slots for this doctor on this date
    booked = await db.teleconsult_bookings.find(
        {"doctor_id": doctor_id, "date": date, "status": {"$ne": "Cancelled"}},
        {"_id": 0, "time": 1}
    ).to_list(100)
    
    booked_times = [b["time"] for b in booked]
    
    # Build available slots
    all_slots = []
    for session, times in TELECONSULT_SLOTS.items():
        session_slots = []
        for time in times:
            is_available = time not in booked_times
            
            # If today, check if slot time has passed
            if slot_date.date() == today:
                slot_datetime = datetime.strptime(f"{date} {time}", "%Y-%m-%d %H:%M")
                slot_datetime = slot_datetime.replace(tzinfo=timezone.utc)
                if slot_datetime <= datetime.now(timezone.utc):
                    is_available = False
            
            session_slots.append({
                "time": time,
                "available": is_available
            })
        
        all_slots.append({
            "session": session,
            "slots": session_slots
        })
    
    return {
        "doctor_id": doctor_id,
        "date": date,
        "sessions": all_slots,
        "fee": TELECONSULT_CONFIG["consultation_fee"]
    }

@router.post("/book")
async def book_teleconsultation(user_id: str, booking: TeleconsultBooking):
    """Book a teleconsultation appointment"""
    db = get_db()
    
    # Check if slot is available
    existing = await db.teleconsult_bookings.find_one({
        "doctor_id": booking.doctor_id,
        "date": booking.date,
        "time": booking.time,
        "status": {"$ne": "Cancelled"}
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="This slot is no longer available")
    
    # Calculate fee
    fee = TELECONSULT_CONFIG["follow_up_fee"] if booking.is_follow_up else TELECONSULT_CONFIG["consultation_fee"]
    
    # Generate meeting link (using Jitsi for simplicity)
    meeting_id = str(uuid.uuid4())[:8]
    meeting_link = f"https://meet.jit.si/nevikacura-{meeting_id}"
    
    booking_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "doctor_id": booking.doctor_id,
        "patient_name": booking.patient_name,
        "patient_phone": booking.patient_phone,
        "patient_email": booking.patient_email,
        "date": booking.date,
        "time": booking.time,
        "reason": booking.reason,
        "symptoms": booking.symptoms,
        "is_follow_up": booking.is_follow_up,
        "previous_consultation_id": booking.previous_consultation_id,
        "fee": fee,
        "meeting_link": meeting_link,
        "meeting_id": meeting_id,
        "status": "Booked",
        "prescription_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.teleconsult_bookings.insert_one(booking_doc)
    
    return {
        "message": "Teleconsultation booked successfully!",
        "booking_id": booking_doc["id"],
        "meeting_link": meeting_link,
        "date": booking.date,
        "time": booking.time,
        "fee": fee
    }

@router.get("/bookings/{user_id}")
async def get_user_teleconsultations(user_id: str, status: Optional[str] = None):
    """Get all teleconsultation bookings for a user"""
    db = get_db()
    
    query = {"user_id": user_id}
    if status:
        query["status"] = status
    
    bookings = await db.teleconsult_bookings.find(
        query,
        {"_id": 0}
    ).sort("date", -1).to_list(50)
    
    # Categorize
    upcoming = [b for b in bookings if b["status"] == "Booked" and b["date"] >= datetime.now(timezone.utc).strftime("%Y-%m-%d")]
    past = [b for b in bookings if b["status"] == "Completed" or b["date"] < datetime.now(timezone.utc).strftime("%Y-%m-%d")]
    cancelled = [b for b in bookings if b["status"] == "Cancelled"]
    
    return {
        "upcoming": upcoming,
        "past": past,
        "cancelled": cancelled,
        "total": len(bookings)
    }

@router.put("/cancel/{booking_id}")
async def cancel_teleconsultation(booking_id: str, user_id: str, reason: Optional[str] = None):
    """Cancel a teleconsultation booking"""
    db = get_db()
    
    booking = await db.teleconsult_bookings.find_one({
        "id": booking_id,
        "user_id": user_id
    })
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking["status"] != "Booked":
        raise HTTPException(status_code=400, detail="Cannot cancel this booking")
    
    # Check cancellation time limit
    booking_datetime = datetime.strptime(f"{booking['date']} {booking['time']}", "%Y-%m-%d %H:%M")
    booking_datetime = booking_datetime.replace(tzinfo=timezone.utc)
    hours_until = (booking_datetime - datetime.now(timezone.utc)).total_seconds() / 3600
    
    if hours_until < TELECONSULT_CONFIG["cancellation_hours"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot cancel within {TELECONSULT_CONFIG['cancellation_hours']} hours of appointment"
        )
    
    await db.teleconsult_bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "Cancelled",
            "cancellation_reason": reason,
            "cancelled_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Teleconsultation cancelled successfully"}

@router.post("/complete/{booking_id}")
async def complete_teleconsultation(booking_id: str, notes: Optional[str] = None):
    """Mark a teleconsultation as complete (called by doctor/staff)"""
    db = get_db()
    
    result = await db.teleconsult_bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "Completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "doctor_notes": notes
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return {"message": "Consultation marked as complete"}

@router.post("/prescription")
async def create_prescription(prescription: EPrescription):
    """Create e-prescription after consultation"""
    db = get_db()
    
    # Check if consultation exists
    consultation = await db.teleconsult_bookings.find_one({"id": prescription.consultation_id})
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    
    prescription_doc = {
        "id": str(uuid.uuid4()),
        "consultation_id": prescription.consultation_id,
        "patient_name": consultation["patient_name"],
        "patient_phone": consultation["patient_phone"],
        "doctor_id": consultation["doctor_id"],
        "diagnosis": prescription.diagnosis,
        "medicines": prescription.medicines,
        "advice": prescription.advice,
        "follow_up_date": prescription.follow_up_date,
        "tests_recommended": prescription.tests_recommended,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.teleconsult_prescriptions.insert_one(prescription_doc)
    
    # Update consultation with prescription ID
    await db.teleconsult_bookings.update_one(
        {"id": prescription.consultation_id},
        {"$set": {"prescription_id": prescription_doc["id"]}}
    )
    
    return {
        "message": "Prescription created successfully",
        "prescription_id": prescription_doc["id"]
    }

@router.get("/prescription/{prescription_id}")
async def get_prescription(prescription_id: str):
    """Get e-prescription details"""
    db = get_db()
    
    prescription = await db.teleconsult_prescriptions.find_one(
        {"id": prescription_id},
        {"_id": 0}
    )
    
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    
    return prescription

@router.get("/doctor/schedule/{doctor_id}")
async def get_doctor_teleconsult_schedule(doctor_id: str, start_date: str, end_date: str):
    """Get teleconsultation schedule for a doctor (for doctor portal)"""
    db = get_db()
    
    bookings = await db.teleconsult_bookings.find(
        {
            "doctor_id": doctor_id,
            "date": {"$gte": start_date, "$lte": end_date},
            "status": {"$ne": "Cancelled"}
        },
        {"_id": 0}
    ).sort([("date", 1), ("time", 1)]).to_list(200)
    
    return {
        "bookings": bookings,
        "total": len(bookings)
    }
