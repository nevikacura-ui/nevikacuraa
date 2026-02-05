"""
Teleconsultation Module - Enhanced Version
- Video appointments with DiaGyn doctors
- 9 AM to 9 PM slots (15-minute intervals)
- Wallet-based payments
- E-prescriptions with Proton/Orange integration
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import os
import jwt
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/teleconsult", tags=["Teleconsultation"])

db = None

def set_db(database):
    global db
    db = database

# ============ AUTH ============
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        # Support both 'sub' (from server.py) and 'user_id' (legacy) for user ID
        user_id = payload.get("sub") or payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ CONFIG ============

# DiaGyn Doctors for Teleconsultation
TELECONSULT_DOCTORS = {
    "dr-neha-patel": {
        "name": "Dr. Neha Patel",
        "fee": 500,
        "specialization": "Obstetrics & Gynecology"
    },
    "dr-vikas-jha": {
        "name": "Dr. Vikas Jha", 
        "fee": 500,
        "specialization": "Obstetrics & Gynecology"
    }
}

# Generate 15-minute slots from 9 AM to 9 PM
def generate_time_slots():
    slots = []
    for hour in range(9, 21):  # 9 AM to 9 PM (21:00)
        for minute in [0, 15, 30, 45]:
            hour_12 = hour if hour <= 12 else hour - 12
            if hour_12 == 0:
                hour_12 = 12
            ampm = "AM" if hour < 12 else "PM"
            time_12 = f"{hour_12}:{str(minute).zfill(2)} {ampm}"
            time_24 = f"{str(hour).zfill(2)}:{str(minute).zfill(2)}"
            slots.append({"time_12": time_12, "time_24": time_24, "hour": hour, "minute": minute})
    return slots

TIME_SLOTS = generate_time_slots()

# ============ MODELS ============

class TeleconsultBookingRequest(BaseModel):
    doctor_id: str
    doctor_name: str
    date: str
    time: str
    patient_name: str
    patient_phone: str
    reason: str
    symptoms: Optional[str] = ""
    fee: float
    payment_method: str = "wallet"

class EPrescriptionCreate(BaseModel):
    consultation_id: str
    diagnosis: str
    notes: str
    medicines: Optional[List[dict]] = []
    tests: Optional[List[str]] = []
    follow_up_days: Optional[int] = None

# ============ ROUTES ============

@router.get("/config")
async def get_config():
    """Get teleconsultation configuration"""
    return {
        "doctors": TELECONSULT_DOCTORS,
        "slots_per_day": len(TIME_SLOTS),
        "slot_duration": 15,
        "timing": "9:00 AM - 9:00 PM",
        "payment_method": "wallet_only"
    }

@router.get("/booked-slots")
async def get_booked_slots(doctor: str, date: str):
    """Get booked slots for a doctor on a date"""
    booked = await db.teleconsult_bookings.find(
        {"doctor_id": doctor, "date": date, "status": {"$nin": ["cancelled", "Cancelled"]}},
        {"_id": 0, "time": 1}
    ).to_list(100)
    
    return {"booked_slots": [b["time"] for b in booked]}

@router.post("/book")
async def book_teleconsultation(
    data: TeleconsultBookingRequest,
    user = Depends(get_current_user)
):
    """Book a teleconsultation with wallet payment"""
    
    # Validate doctor
    if data.doctor_id not in TELECONSULT_DOCTORS:
        raise HTTPException(status_code=400, detail="Invalid doctor selected")
    
    # BOOKING LIMIT: Check if user already has an active teleconsultation
    active_booking = await db.teleconsult_bookings.find_one({
        "user_id": user["id"],
        "status": {"$in": ["pending", "confirmed", "Booked"]},  # Not completed or cancelled
    })
    
    if active_booking:
        # Log duplicate teleconsult attempt (SMS notification disabled)
        try:
            staff_message = f"""⚠️ DUPLICATE TELECONSULT ATTEMPT
Patient: {data.patient_name}
Phone: {data.patient_phone}
Email: {user.get('email', 'N/A')}
Tried: {data.doctor_name} on {data.date} at {data.time}
❌ BLOCKED - Already has active booking:
Doctor: {active_booking.get('doctor_name')}
Date: {active_booking.get('date')}
Time: {active_booking.get('time')}
Status: {active_booking.get('status')}
Please check if patient needs to reschedule."""
            logger.warning(f"Duplicate teleconsult attempt by {data.patient_phone}: {staff_message}")
        except Exception as e:
            logger.error(f"Failed to log duplicate teleconsult: {e}")
        
        raise HTTPException(
            status_code=400,
            detail=f"You already have an active teleconsultation on {active_booking.get('date')} at {active_booking.get('time')} with {active_booking.get('doctor_name')}. Please complete or cancel it before booking a new one."
        )
    
    # Check if slot is available
    existing = await db.teleconsult_bookings.find_one({
        "doctor_id": data.doctor_id,
        "date": data.date,
        "time": data.time,
        "status": {"$nin": ["cancelled", "Cancelled"]}
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="This slot is no longer available")
    
    # Check wallet balance
    wallet = await db.wallets.find_one({"user_id": user["id"]})
    if not wallet or wallet.get("balance", 0) < data.fee:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient wallet balance. Required: ₹{data.fee}"
        )
    
    # Deduct from wallet
    new_balance = wallet["balance"] - data.fee
    await db.wallets.update_one(
        {"user_id": user["id"]},
        {"$set": {
            "balance": new_balance,
            "total_spent": wallet.get("total_spent", 0) + data.fee,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Record wallet transaction
    wallet_txn = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "type": "debit",
        "amount": data.fee,
        "service_type": "teleconsult",
        "description": f"Video consultation with {data.doctor_name}",
        "status": "completed",
        "balance_after": new_balance,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.wallet_transactions.insert_one(wallet_txn)
    
    # Generate meeting link
    meeting_id = str(uuid.uuid4())[:8]
    meeting_link = f"https://meet.jit.si/nevikacura-{meeting_id}"
    
    # Create booking
    booking = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "doctor_id": data.doctor_id,
        "doctor_name": data.doctor_name,
        "date": data.date,
        "time": data.time,
        "patient_name": data.patient_name,
        "patient_phone": data.patient_phone,
        "reason": data.reason,
        "symptoms": data.symptoms,
        "fee": data.fee,
        "payment_method": "wallet",
        "payment_status": "paid",
        "wallet_transaction_id": wallet_txn["id"],
        "meeting_link": meeting_link,
        "meeting_id": meeting_id,
        "status": "upcoming",
        "has_prescription": False,
        "prescription": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.teleconsult_bookings.insert_one(booking)
    
    logger.info(f"Teleconsult booked: {booking['id']} for {data.patient_name} with {data.doctor_name}")
    
    return {
        "success": True,
        "booking": {k: v for k, v in booking.items() if k != "_id"},
        "message": "Consultation booked successfully!"
    }

@router.get("/my-bookings")
async def get_my_bookings(user = Depends(get_current_user)):
    """Get user's teleconsultation bookings"""
    bookings = await db.teleconsult_bookings.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    # Update status based on date/time
    today = datetime.now(timezone.utc).date()
    for booking in bookings:
        if booking.get("status") == "upcoming":
            booking_date = datetime.strptime(booking["date"], "%Y-%m-%d").date()
            if booking_date < today:
                booking["status"] = "completed"
    
    return {"bookings": bookings}

@router.get("/booking/{booking_id}")
async def get_booking_details(booking_id: str, user = Depends(get_current_user)):
    """Get details of a specific booking"""
    booking = await db.teleconsult_bookings.find_one(
        {"id": booking_id, "user_id": user["id"]},
        {"_id": 0}
    )
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return {"booking": booking}

# ============ E-PRESCRIPTION (Doctor/Admin) ============

@router.post("/prescription")
async def create_prescription(data: EPrescriptionCreate):
    """Create e-prescription for a consultation (doctor access)"""
    
    booking = await db.teleconsult_bookings.find_one({"id": data.consultation_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Consultation not found")
    
    prescription = {
        "id": str(uuid.uuid4()),
        "consultation_id": data.consultation_id,
        "doctor_name": booking.get("doctor_name"),
        "patient_name": booking.get("patient_name"),
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "diagnosis": data.diagnosis,
        "notes": data.notes,
        "medicines": data.medicines,
        "tests": data.tests,
        "follow_up_days": data.follow_up_days,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.eprescriptions.insert_one(prescription)
    
    # Update booking
    await db.teleconsult_bookings.update_one(
        {"id": data.consultation_id},
        {"$set": {
            "has_prescription": True,
            "prescription": {k: v for k, v in prescription.items() if k != "_id"},
            "status": "completed"
        }}
    )
    
    return {
        "success": True,
        "prescription_id": prescription["id"],
        "message": "E-Prescription created successfully"
    }

@router.get("/prescription/{consultation_id}")
async def get_prescription(consultation_id: str, user = Depends(get_current_user)):
    """Get e-prescription for a consultation"""
    booking = await db.teleconsult_bookings.find_one(
        {"id": consultation_id, "user_id": user["id"]},
        {"_id": 0}
    )
    
    if not booking:
        raise HTTPException(status_code=404, detail="Consultation not found")
    
    if not booking.get("has_prescription"):
        raise HTTPException(status_code=404, detail="No prescription available yet")
    
    return {"prescription": booking.get("prescription")}

# ============ CANCEL ============

@router.post("/cancel/{booking_id}")
async def cancel_booking(booking_id: str, user = Depends(get_current_user)):
    """Cancel a teleconsultation and refund to wallet"""
    
    booking = await db.teleconsult_bookings.find_one({
        "id": booking_id,
        "user_id": user["id"],
        "status": "upcoming"
    })
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found or cannot be cancelled")
    
    # Check if within cancellation window (2 hours before)
    booking_datetime = datetime.strptime(f"{booking['date']} {booking['time']}", "%Y-%m-%d %I:%M %p")
    if datetime.now() > booking_datetime - timedelta(hours=2):
        raise HTTPException(status_code=400, detail="Cannot cancel within 2 hours of appointment")
    
    # Refund to wallet
    fee = booking.get("fee", 0)
    wallet = await db.wallets.find_one({"user_id": user["id"]})
    
    if wallet and fee > 0:
        new_balance = wallet.get("balance", 0) + fee
        await db.wallets.update_one(
            {"user_id": user["id"]},
            {"$set": {
                "balance": new_balance,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Record refund transaction
        refund_txn = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "type": "refund",
            "amount": fee,
            "service_type": "teleconsult",
            "reference_id": booking_id,
            "description": "Refund for cancelled consultation",
            "status": "completed",
            "balance_after": new_balance,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.wallet_transactions.insert_one(refund_txn)
    
    # Update booking status
    await db.teleconsult_bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "cancelled",
            "cancelled_at": datetime.now(timezone.utc).isoformat(),
            "refund_amount": fee
        }}
    )
    
    return {
        "success": True,
        "message": f"Booking cancelled. ₹{fee} refunded to wallet.",
        "refund_amount": fee
    }
