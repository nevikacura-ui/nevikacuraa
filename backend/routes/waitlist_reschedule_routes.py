"""
Appointment Waitlist & Reschedule Routes
Extracted from server.py for modularization.
"""
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger("server")
router = APIRouter(tags=["Waitlist & Reschedule"])

_db = None

def set_db(db):
    global _db
    _db = db

def get_db():
    return _db


# ============ WAITLIST FEATURE ============

class WaitlistRequest(BaseModel):
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    doctor_id: str
    doctor_name: str
    preferred_date: str
    service_type: str = "diagyn"
    notes: Optional[str] = None

@router.post("/appointments/waitlist")
async def join_waitlist(request: WaitlistRequest):
    db = get_db()
    waitlist_entry = {
        "id": f"WL-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}",
        "patient_name": request.patient_name, "patient_phone": request.patient_phone,
        "patient_email": request.patient_email, "doctor_id": request.doctor_id,
        "doctor_name": request.doctor_name, "preferred_date": request.preferred_date,
        "service_type": request.service_type, "notes": request.notes,
        "status": "waiting", "notified": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.appointment_waitlist.insert_one(waitlist_entry)
    waitlist_entry.pop("_id", None)
    position = await db.appointment_waitlist.count_documents({
        "doctor_id": request.doctor_id, "preferred_date": request.preferred_date, "status": "waiting"
    })
    return {"success": True, "waitlist_id": waitlist_entry["id"], "position": position,
            "message": f"You're #{position} on the waitlist. We'll notify you when a slot opens."}

@router.get("/appointments/waitlist/status")
async def check_waitlist_status(patient_id: str, doctor_id: str):
    db = get_db()
    entry = await db.appointment_waitlist.find_one(
        {"patient_id": patient_id, "doctor_id": doctor_id, "status": "waiting"}, {"_id": 0}
    )
    if entry:
        position = await db.appointment_waitlist.count_documents({
            "doctor_id": doctor_id, "status": "waiting", "created_at": {"$lt": entry.get("created_at", "")}
        }) + 1
        return {"success": True, "on_waitlist": True, "position": position,
                "estimated_wait": "1-2 days" if position <= 3 else "3-5 days"}
    return {"success": True, "on_waitlist": False}

@router.get("/appointments/waitlist/{patient_phone}")
async def get_waitlist_status(patient_phone: str):
    db = get_db()
    entries = await db.appointment_waitlist.find({"patient_phone": patient_phone, "status": "waiting"}).to_list(20)
    for e in entries:
        e.pop("_id", None)
        e["position"] = await db.appointment_waitlist.count_documents({
            "doctor_id": e["doctor_id"], "preferred_date": e["preferred_date"],
            "status": "waiting", "created_at": {"$lte": e["created_at"]}
        })
    return {"waitlist_entries": entries}

@router.post("/appointments/waitlist/join")
async def join_waitlist_new(
    patient_id: str = Body(...), patient_name: str = Body(...),
    patient_phone: str = Body(...), doctor_id: str = Body(...),
    doctor_name: str = Body(None), clinic: str = Body("diagyn"),
    preferred_dates: list = Body([]), notify_via: str = Body("both"),
    priority: str = Body("normal")
):
    db = get_db()
    existing = await db.appointment_waitlist.find_one(
        {"patient_id": patient_id, "doctor_id": doctor_id, "status": "waiting"}
    )
    if existing:
        return {"success": False, "message": "Already on waitlist for this doctor"}
    waitlist_entry = {
        "id": f"WL-{uuid.uuid4().hex[:8].upper()}", "patient_id": patient_id,
        "patient_name": patient_name, "patient_phone": patient_phone,
        "doctor_id": doctor_id, "doctor_name": doctor_name, "clinic": clinic,
        "preferred_dates": preferred_dates, "notify_via": notify_via,
        "priority": priority, "status": "waiting",
        "created_at": datetime.now(timezone.utc).isoformat(), "notified": False
    }
    await db.appointment_waitlist.insert_one(waitlist_entry)
    position = await db.appointment_waitlist.count_documents({"doctor_id": doctor_id, "status": "waiting"})
    return {"success": True, "waitlist_id": waitlist_entry["id"], "position": position,
            "estimated_wait": "1-2 days" if position <= 3 else "3-5 days",
            "message": f"You're #{position} on the waitlist"}

@router.post("/appointments/waitlist/leave")
async def leave_waitlist(patient_id: str = Body(...), doctor_id: str = Body(...)):
    db = get_db()
    result = await db.appointment_waitlist.update_one(
        {"patient_id": patient_id, "doctor_id": doctor_id, "status": "waiting"},
        {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count > 0:
        return {"success": True, "message": "Removed from waitlist"}
    return {"success": False, "message": "Not found on waitlist"}

@router.post("/appointments/waitlist/notify")
async def notify_waitlist_slot_available(doctor_id: str = Body(...), date: str = Body(...), time: str = Body(...)):
    db = get_db()
    waiting = await db.appointment_waitlist.find_one({
        "doctor_id": doctor_id, "preferred_date": date, "status": "waiting", "notified": False
    })
    if not waiting:
        return {"success": False, "message": "No patients in waitlist"}
    await db.appointment_waitlist.update_one(
        {"id": waiting["id"]},
        {"$set": {"notified": True, "notified_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True, "patient_notified": waiting["patient_name"], "phone": waiting["patient_phone"]}


# ============ QUICK RESCHEDULE ============

class RescheduleRequest(BaseModel):
    appointment_id: str
    new_date: str
    new_time: str
    reason: Optional[str] = None

@router.post("/appointments/reschedule")
async def quick_reschedule(request: RescheduleRequest):
    db = get_db()
    appointment = await db.appointments.find_one({"id": request.appointment_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appointment.get("status") in ["completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Cannot reschedule completed or cancelled appointment")
    old_date = appointment.get("date")
    old_time = appointment.get("time")
    await db.appointments.update_one(
        {"id": request.appointment_id},
        {"$set": {"date": request.new_date, "time": request.new_time, "status": "rescheduled",
                  "rescheduled_at": datetime.now(timezone.utc).isoformat(), "reschedule_reason": request.reason},
         "$push": {"reschedule_history": {"old_date": old_date, "old_time": old_time,
                   "new_date": request.new_date, "new_time": request.new_time,
                   "reason": request.reason, "changed_at": datetime.now(timezone.utc).isoformat()}}}
    )
    # Notify waitlist about freed slot
    await notify_waitlist_slot_available(doctor_id=appointment.get("doctor_id", ""), date=old_date, time=old_time)
    return {"success": True, "message": f"Appointment rescheduled to {request.new_date} at {request.new_time}",
            "old_slot": f"{old_date} {old_time}", "new_slot": f"{request.new_date} {request.new_time}"}
