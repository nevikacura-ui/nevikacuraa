"""Appointment Calendar, Pre-consultation Form & Follow-up Routes"""
from fastapi import APIRouter, HTTPException, Body
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from database import get_db
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/appointments/calendar/{doctor_id}")
async def get_doctor_availability_calendar(doctor_id: str, weeks: int = 2):
    """Get doctor's availability for a visual calendar view"""
    db = get_db()

    doctor = await db.staff_accounts.find_one(
        {"$or": [{"id": doctor_id}, {"username": doctor_id}]},
        {"_id": 0, "password": 0, "password_hash": 0}
    )

    if not doctor:
        doctor = {"name": doctor_id, "clinic": "Clinic"}

    # Generate date range
    today = datetime.now(timezone.utc).date()
    dates = []

    for i in range(weeks * 7):
        date = today + timedelta(days=i)
        date_str = date.isoformat()

        # Default time slots
        morning_slots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]
        afternoon_slots = ["14:00", "14:30", "15:00", "15:30", "16:00", "16:30"]
        evening_slots = ["18:00", "18:30", "19:00", "19:30", "20:00"]

        # Sunday - closed
        if date.weekday() == 6:
            dates.append({"date": date_str, "day": date.strftime("%a"), "slots": [], "status": "closed"})
            continue

        all_slots = morning_slots + afternoon_slots + evening_slots

        # Check existing bookings
        booked = await db.appointments.find(
            {"doctor_id": doctor_id, "date": date_str, "status": {"$nin": ["cancelled", "rejected"]}},
            {"_id": 0, "time": 1}
        ).to_list(50)

        booked_times = set(b.get("time", "") for b in booked)

        # Check blocked slots
        blocked = await db.blocked_slots.find(
            {"doctor_id": doctor_id, "date": date_str},
            {"_id": 0, "time": 1}
        ).to_list(50)
        blocked_times = set(b.get("time", "") for b in blocked)

        available_slots = []
        for slot in all_slots:
            status = "available"
            if slot in booked_times:
                status = "booked"
            elif slot in blocked_times:
                status = "blocked"
            available_slots.append({"time": slot, "status": status})

        available_count = sum(1 for s in available_slots if s["status"] == "available")
        day_status = "available" if available_count > 3 else "limited" if available_count > 0 else "full"

        dates.append({
            "date": date_str,
            "day": date.strftime("%a"),
            "date_display": date.strftime("%d %b"),
            "slots": available_slots,
            "available_count": available_count,
            "total_slots": len(all_slots),
            "status": day_status
        })

    return {
        "doctor": {"name": doctor.get("name"), "clinic": doctor.get("clinic", ""), "department": doctor.get("department", "")},
        "calendar": dates,
        "weeks": weeks
    }


@router.post("/appointments/pre-consultation")
async def save_pre_consultation_form(
    appointment_id: str = Body(...),
    chief_complaint: str = Body(...),
    duration: str = Body(""),
    current_medications: str = Body(""),
    allergies: str = Body("")
):
    """Save a concise pre-consultation form before appointment"""
    db = get_db()

    form = {
        "id": str(uuid.uuid4()),
        "appointment_id": appointment_id,
        "chief_complaint": chief_complaint,
        "duration": duration,
        "current_medications": current_medications,
        "allergies": allergies,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.pre_consultation_forms.insert_one(form)

    # Link to appointment
    await db.appointments.update_one(
        {"id": appointment_id},
        {"$set": {"pre_consultation_id": form["id"], "has_pre_consultation": True}}
    )

    return {"success": True, "form_id": form["id"]}


@router.get("/appointments/pre-consultation/{appointment_id}")
async def get_pre_consultation(appointment_id: str):
    """Get pre-consultation form for an appointment"""
    db = get_db()
    form = await db.pre_consultation_forms.find_one(
        {"appointment_id": appointment_id}, {"_id": 0}
    )
    return {"form": form}


@router.post("/appointments/follow-up")
async def book_follow_up(
    original_appointment_id: str = Body(...),
    preferred_date: str = Body(...),
    preferred_time: str = Body(""),
    notes: str = Body("")
):
    """Book a follow-up appointment from a completed one"""
    db = get_db()

    original = await db.appointments.find_one({"id": original_appointment_id}, {"_id": 0})
    if not original:
        raise HTTPException(status_code=404, detail="Original appointment not found")

    if original.get("doctor"):
        from routes.appointment_routes import assert_slot_not_blocked
        await assert_slot_not_blocked(db, original.get("doctor"), preferred_date, preferred_time,
                                       source="follow_up", patient_name=original.get("patient_name"), patient_phone=original.get("patient_phone"))

    follow_up = {
        "id": f"APT-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}",
        "user_id": original.get("user_id"),
        "patient_name": original.get("patient_name"),
        "patient_phone": original.get("patient_phone"),
        "doctor": original.get("doctor"),
        "doctor_id": original.get("doctor_id"),
        "clinic": original.get("clinic"),
        "date": preferred_date,
        "time": preferred_time,
        "type": "follow_up",
        "follow_up_of": original_appointment_id,
        "notes": notes,
        "status": "confirmed",
        "appointment_type": "ONLINE",
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.appointments.insert_one(follow_up)
    follow_up.pop("_id", None)

    return {"success": True, "appointment": follow_up}


@router.get("/diagnostics/home-collection/slots")
async def get_home_collection_slots(date: str = None):
    """Get available time slots for home sample collection"""
    db = get_db()

    if not date:
        date = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")

    # Morning and afternoon slots
    slots = [
        {"time": "07:00 - 08:00", "label": "Early Morning", "available": True},
        {"time": "08:00 - 09:00", "label": "Morning", "available": True},
        {"time": "09:00 - 10:00", "label": "Mid Morning", "available": True},
        {"time": "10:00 - 11:00", "label": "Late Morning", "available": True},
        {"time": "11:00 - 12:00", "label": "Before Noon", "available": True},
        {"time": "14:00 - 15:00", "label": "Afternoon", "available": True},
        {"time": "15:00 - 16:00", "label": "Late Afternoon", "available": True},
        {"time": "16:00 - 17:00", "label": "Evening", "available": True},
    ]

    # Check existing bookings for the date
    booked = await db.home_collection_bookings.find(
        {"date": date, "status": {"$nin": ["cancelled"]}},
        {"_id": 0, "time_slot": 1}
    ).to_list(100)

    booked_slots = {}
    for b in booked:
        slot = b.get("time_slot", "")
        booked_slots[slot] = booked_slots.get(slot, 0) + 1

    # Max 5 bookings per slot
    for slot in slots:
        count = booked_slots.get(slot["time"], 0)
        if count >= 5:
            slot["available"] = False
        slot["bookings"] = count

    return {"date": date, "slots": slots}


@router.post("/diagnostics/home-collection/book")
async def book_home_collection(
    patient_name: str = Body(...),
    patient_phone: str = Body(...),
    address: str = Body(...),
    date: str = Body(...),
    time_slot: str = Body(...),
    tests: List[str] = Body(...),
    notes: str = Body("")
):
    """Book a home sample collection slot"""
    db = get_db()

    booking = {
        "id": f"HC-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}",
        "patient_name": patient_name,
        "patient_phone": patient_phone,
        "address": address,
        "date": date,
        "time_slot": time_slot,
        "tests": tests,
        "notes": notes,
        "status": "confirmed",
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.home_collection_bookings.insert_one(booking)
    booking.pop("_id", None)

    return {
        "success": True,
        "booking": booking,
        "message": f"Home collection booked for {date} ({time_slot}). Our phlebotomist will arrive at your address."
    }
