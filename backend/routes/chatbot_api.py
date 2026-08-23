"""
Chatbot API Endpoints
Lightweight APIs for MSG91 WhatsApp chatbot to fetch doctors, slots, and book appointments.
These endpoints are PUBLIC (no auth) since the chatbot calls them on behalf of patients.
"""
import os
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chatbot", tags=["Chatbot API"])

db = None

def set_db(database):
    global db
    db = database


# ============ Helper ============

def get_ist_date(offset_days=0):
    """Get IST date string like '2026-03-17'"""
    ist = timezone(timedelta(hours=5, minutes=30))
    return (datetime.now(ist) + timedelta(days=offset_days)).strftime("%Y-%m-%d")

def get_ist_now():
    ist = timezone(timedelta(hours=5, minutes=30))
    return datetime.now(ist)


# ============ Models ============

class ChatbotBookingRequest(BaseModel):
    patient_name: str
    patient_phone: str
    doctor: str
    clinic: str
    date: str  # YYYY-MM-DD
    time_slot: str  # e.g. "10:00 AM"
    visit_type: Optional[str] = "SCHEDULED"
    source: str = "whatsapp_chatbot"


# ============ Endpoints ============

@router.get("/doctors")
async def get_doctors():
    """Get list of available doctors for chatbot selection"""
    doctors = await db.doctors.find(
        {"is_active": {"$ne": False}},
        {"_id": 0, "name": 1, "specialty": 1, "clinic": 1, "qualification": 1}
    ).to_list(20)
    
    if not doctors:
        # Fallback to known doctors
        doctors = [
            {"name": "Dr Neha Patel", "specialty": "OBGYN", "clinic": "Pushpa Clinic", "qualification": "M.B.B.S, D.G.O"},
            {"name": "Dr Vikas Jha", "specialty": "Diabetes & Internal Medicine", "clinic": "Pushpa Clinic", "qualification": "M.B.B.S, Diabetes (U.K)"},
        ]
    
    # Format for chatbot list message
    formatted = []
    for doc in doctors:
        formatted.append({
            "id": doc.get("name", "").replace(" ", "_").lower(),
            "title": doc.get("name"),
            "description": f"{doc.get('specialty', '')} - {doc.get('clinic', '')}",
            "clinic": doc.get("clinic", "Pushpa Clinic")
        })
    
    return {
        "success": True,
        "doctors": formatted,
        "count": len(formatted)
    }


@router.get("/slots")
async def get_available_slots(
    doctor: str = Query(..., description="Doctor name"),
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format"),
    clinic: Optional[str] = Query(None, description="Clinic name")
):
    """Get available time slots using actual DiaGyn schedule"""
    from routes.diagyn_staff import DOCTOR_SCHEDULE, get_slots_for_doctor_clinic_date
    
    if not date:
        date = get_ist_date()
    
    clinics_to_check = []
    if clinic:
        clinics_to_check = [clinic]
    else:
        doc_schedule = DOCTOR_SCHEDULE.get(doctor, {})
        clinics_to_check = list(doc_schedule.keys())
    
    booked = await db.appointments.find(
        {"doctor": {"$regex": doctor, "$options": "i"}, "date": date, "status": {"$nin": ["Cancelled", "NoShow", "No Show"]}},
        {"_id": 0, "time": 1, "time_slot": 1, "slot": 1}
    ).to_list(100)
    
    # Collect ALL time variants (both 24h and 12h) from booked appointments
    from utils.timezone_utils import normalize_time_to_24h, format_time_for_display
    booked_times = set()
    for b in booked:
        for field in ["time", "time_slot", "slot"]:
            t = b.get(field, "")
            if t and t.strip():
                t = t.strip()
                booked_times.add(t)
                booked_times.add(normalize_time_to_24h(t))
                booked_times.add(format_time_for_display(t))

    # Reserved slots (doctor prep time) — not bookable by patients
    reserved_slots = {"11:00", "11:15"}

    ist_now = get_ist_now()
    current_date_str = ist_now.strftime("%Y-%m-%d")
    is_today = (date == current_date_str)
    current_minutes = ist_now.hour * 60 + ist_now.minute if is_today else 0
    
    all_available = []
    for c in clinics_to_check:
        slot_data = get_slots_for_doctor_clinic_date(doctor, c, date, session_filter=None)
        for s in slot_data.get("all", []):
            if s["value"] not in booked_times and s["display"] not in booked_times and s["value"] not in reserved_slots:
                if is_today:
                    parts = s["value"].split(":")
                    slot_minutes = int(parts[0]) * 60 + int(parts[1])
                    if slot_minutes <= current_minutes:
                        continue
                all_available.append(s["display"])
    
    return {
        "success": True,
        "doctor": doctor,
        "date": date,
        "clinic": clinic,
        "available_slots": all_available,
        "available_count": len(all_available)
    }


@router.get("/slots-text")
async def get_available_slots_text(
    doctor: str = Query(..., description="Doctor name"),
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format"),
    clinic: Optional[str] = Query(None, description="Clinic name")
):
    """Text response using actual DiaGyn schedule — for AI chatbot.
    Uses NO session filtering; for today, filters out past time slots manually.
    If no slots found, auto-suggests next available dates.
    """
    from fastapi.responses import PlainTextResponse
    from routes.diagyn_staff import DOCTOR_SCHEDULE, CLINICS, get_slots_for_doctor_clinic_date
    
    if not date:
        date = get_ist_date()
    
    # If no clinic specified, try all clinics for this doctor
    clinics_to_check = []
    if clinic:
        clinics_to_check = [clinic]
    else:
        doc_schedule = DOCTOR_SCHEDULE.get(doctor, {})
        clinics_to_check = list(doc_schedule.keys())
    
    if not clinics_to_check:
        return PlainTextResponse(f"No schedule found for {doctor}. Available doctors: Dr. Vikas Jha, Dr. Neha Patel")
    
    # Get booked appointments for this doctor+date
    booked = await db.appointments.find(
        {"doctor": {"$regex": doctor, "$options": "i"}, "date": date, "status": {"$nin": ["Cancelled", "NoShow", "No Show"]}},
        {"_id": 0, "time": 1, "time_slot": 1, "slot": 1, "clinic": 1}
    ).to_list(100)
    
    booked_times = set()
    for b in booked:
        from utils.timezone_utils import normalize_time_to_24h, format_time_for_display
        for field in ["time", "time_slot", "slot"]:
            t = b.get(field, "")
            if t and t.strip():
                t = t.strip()
                booked_times.add(t)
                booked_times.add(normalize_time_to_24h(t))
                booked_times.add(format_time_for_display(t))
    
    # Reserved slots (doctor prep time) — not bookable by patients
    reserved_slots = {"11:00", "11:15"}

    # Check if requested date is today — to filter past slots
    ist_now = get_ist_now()
    current_date_str = ist_now.strftime("%Y-%m-%d")
    is_today = (date == current_date_str)
    current_minutes = ist_now.hour * 60 + ist_now.minute if is_today else 0
    
    results = []
    for c in clinics_to_check:
        # Use NO session filter — get ALL slots for the day
        slot_data = get_slots_for_doctor_clinic_date(doctor, c, date, session_filter=None)
        
        def is_future_slot(slot):
            """For today, only keep slots after current IST time"""
            if not is_today:
                return True
            parts = slot["value"].split(":")
            slot_minutes = int(parts[0]) * 60 + int(parts[1])
            return slot_minutes > current_minutes
        
        morning_available = [
            s["display"] for s in slot_data.get("morning", [])
            if is_future_slot(s) and s["value"] not in booked_times and s["display"] not in booked_times and s["value"] not in reserved_slots
        ]
        evening_available = [
            s["display"] for s in slot_data.get("evening", [])
            if is_future_slot(s) and s["value"] not in booked_times and s["display"] not in booked_times
        ]
        
        if morning_available or evening_available:
            text = f"{c}:\n"
            if morning_available:
                text += f"  Morning: {', '.join(morning_available)}\n"
            if evening_available:
                text += f"  Evening: {', '.join(evening_available)}\n"
            total = len(morning_available) + len(evening_available)
            text += f"  Total: {total} slots available"
            results.append(text)
    
    if results:
        header = f"Available slots for {doctor} on {date}:\n\n"
        return PlainTextResponse(header + "\n\n".join(results))
    else:
        # No slots for this date — auto-find next 3 available dates
        next_dates = []
        for offset in range(1, 15):
            future_date = get_ist_date(offset_days=offset)
            for c in clinics_to_check:
                sd = get_slots_for_doctor_clinic_date(doctor, c, future_date, session_filter=None)
                if sd.get("all"):
                    next_dates.append(future_date)
                    break
            if len(next_dates) >= 3:
                break
        
        date_obj = datetime.strptime(date, "%Y-%m-%d")
        day_name = date_obj.strftime("%A")
        msg = f"No available slots for {doctor} on {date} ({day_name})."
        if next_dates:
            suggestions = []
            for nd in next_dates:
                nd_obj = datetime.strptime(nd, "%Y-%m-%d")
                suggestions.append(f"{nd} ({nd_obj.strftime('%A')})")
            msg += f"\n\nNext available dates:\n" + "\n".join(suggestions)
            msg += f"\n\nWould you like to check slots for one of these dates?"
        return PlainTextResponse(msg)


@router.get("/book-simple")
async def chatbot_book_simple(
    patient_name: str = Query(...),
    patient_phone: str = Query(...),
    doctor: str = Query(...),
    clinic: str = Query(...),
    date: str = Query(...),
    time_slot: str = Query(...),
):
    """GET-based booking — simpler for AI chatbots that struggle with POST JSON.
    Example: /api/chatbot/book-simple?patient_name=Vikas&patient_phone=9876543210&doctor=Dr.+Vikas+Jha&clinic=Pushpa+Clinic&date=2026-03-20&time_slot=06:00+PM
    """
    from fastapi.responses import PlainTextResponse
    logger.info(f"[CHATBOT-GET] book-simple called: {patient_name}, {doctor}, {clinic}, {date}, {time_slot}")
    data = ChatbotBookingRequest(
        patient_name=patient_name,
        patient_phone=patient_phone,
        doctor=doctor,
        clinic=clinic,
        date=date,
        time_slot=time_slot,
    )
    result = await chatbot_book_appointment(data)
    if result.get("success"):
        return PlainTextResponse(
            f"BOOKING CONFIRMED!\n"
            f"Booking ID: {result['booking_id']}\n"
            f"Patient: {patient_name}\n"
            f"Doctor: {doctor}\n"
            f"Clinic: {clinic}\n"
            f"Date: {date}\n"
            f"Time: {time_slot}\n\n"
            f"Please arrive 10 minutes early. For cancellation, call the clinic."
        )
    else:
        return PlainTextResponse(f"BOOKING FAILED: {result.get('message', 'Slot no longer available')}")



@router.post("/book")
async def chatbot_book_appointment(data: ChatbotBookingRequest):
    """Book an appointment from the WhatsApp chatbot"""
    logger.info(f"[CHATBOT-POST] /book called: name={data.patient_name}, doctor={data.doctor}, clinic={data.clinic}, date={data.date}, time={data.time_slot}, phone={data.patient_phone}")
    from utils.timezone_utils import normalize_time_to_24h, format_time_for_display
    
    # Normalize time to both 24h and 12h formats for cross-format matching
    time_24h = normalize_time_to_24h(data.time_slot)  # e.g. "18:00"
    time_12h = format_time_for_display(data.time_slot)  # e.g. "06:00 PM"
    
    # Build all possible time variants the slot could be stored as
    time_variants = list({v for v in [data.time_slot.strip(), time_24h, time_12h] if v})
    
    # Check if slot is still available — check ALL time fields × ALL format variants
    existing = await db.appointments.find_one({
        "doctor": {"$regex": data.doctor, "$options": "i"},
        "clinic": data.clinic,
        "date": data.date,
        "$or": [
            {"time": {"$in": time_variants}},
            {"time_slot": {"$in": time_variants}},
            {"slot": {"$in": time_variants}},
        ],
        "status": {"$nin": ["Cancelled", "NoShow", "No Show"]}
    })
    
    if existing:
        return {
            "success": False,
            "message": f"Sorry, {time_12h} on {data.date} is no longer available. Please select another slot."
        }
    
    # Clean phone
    phone = data.patient_phone.replace("+", "").replace(" ", "").replace("-", "")
    if not phone.startswith("91") and len(phone) == 10:
        phone = "91" + phone
    
    # Check/create patient
    patient = await db.patients.find_one(
        {"$or": [{"mobile": phone}, {"mobile": phone[-10:]}]},
        {"_id": 0}
    )
    
    patient_id = None
    if patient:
        patient_id = patient.get("id")
    
    # Create appointment — use uniform booking ID with DGW prefix for WhatsApp
    appointment_id = f"apt_{str(uuid.uuid4())[:12]}"
    from utils.booking_utils import generate_booking_id
    booking_id = await generate_booking_id(service="diagyn", source="whatsapp", db_instance=db)
    
    appointment = {
        "id": appointment_id,
        "booking_id": booking_id,
        "patient_name": data.patient_name,
        "patient_phone": phone,
        "patient_id": patient_id,
        "doctor": data.doctor,
        "clinic": data.clinic,
        "date": data.date,
        "time": time_24h,
        "time_slot": time_12h,
        "slot": time_12h,
        "appointment_type": data.visit_type,
        "status": "Booked",
        "source": "WhatsApp",
        "portal": "diagyn",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.appointments.insert_one(appointment)
    appointment.pop("_id", None)
    
    # Try to send confirmation via WhatsApp
    try:
        from services.msg91_whatsapp import send_diagyn_appointment_confirmation
        formatted_date = datetime.strptime(data.date, "%Y-%m-%d").strftime("%d %b %Y")
        await send_diagyn_appointment_confirmation(
            phone=phone,
            patient_name=data.patient_name,
            date=formatted_date,
            time=time_12h,
            doctor_name=data.doctor,
            clinic_name=data.clinic,
            booking_id=booking_id,
            db=db,
        )
        logger.info(f"[CHATBOT] WhatsApp confirmation sent to {phone}")
    except Exception as e:
        logger.warning(f"Chatbot booking WhatsApp confirmation failed: {e}")
    
    logger.info(f"[CHATBOT] Appointment booked: {booking_id} - {data.patient_name} with {data.doctor} on {data.date} {data.time_slot}")
    
    return {
        "success": True,
        "message": f"Appointment confirmed! Booking ID: {booking_id}",
        "booking_id": booking_id,
        "appointment_id": appointment_id,
        "doctor": data.doctor,
        "clinic": data.clinic,
        "date": data.date,
        "time_slot": data.time_slot,
        "patient_name": data.patient_name
    }


@router.get("/services")
async def get_services():
    """Get available services for chatbot menu"""
    return {
        "success": True,
        "services": [
            {"id": "appointment", "title": "Book Appointment", "description": "Consult with our doctors"},
            {"id": "lab_test", "title": "Book Lab Test", "description": "Mango Health Labs - Blood tests, scans & more"},
            {"id": "pharmacy", "title": "Order Medicine", "description": "Orange Pharmacy - Upload prescription or search"},
            {"id": "genetic", "title": "Genetic Testing", "description": "Nexugene - Advanced genetic tests"},
        ]
    }
