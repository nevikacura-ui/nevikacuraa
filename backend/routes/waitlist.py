"""Waitlist Notification Routes"""
from fastapi import APIRouter, Body
from datetime import datetime, timezone
from database import get_db
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/appointments/waitlist/notify-available")
async def notify_waitlist_slot_available(
    doctor_id: str = Body(...),
    available_date: str = Body(...),
    available_slot: str = Body(...)
):
    """Notify waitlisted patients when a slot becomes available"""
    db = get_db()
    waitlist = await db.appointment_waitlist.find({
        "doctor_id": doctor_id,
        "status": "waiting"
    }).sort("created_at", 1).to_list(10)

    notified_count = 0

    for entry in waitlist:
        preferred_dates = entry.get("preferred_dates", [])
        if preferred_dates and available_date not in preferred_dates:
            continue

        await db.appointment_waitlist.update_one(
            {"id": entry["id"]},
            {"$set": {
                "notified": True,
                "notified_at": datetime.now(timezone.utc).isoformat(),
                "available_slot": f"{available_date} {available_slot}"
            }}
        )
        notified_count += 1

    return {
        "success": True,
        "notified_count": notified_count,
        "message": f"Notified {notified_count} patients from waitlist"
    }


@router.post("/appointments/waitlist/process-cancellation")
async def process_appointment_cancellation(
    doctor_id: str = Body(...),
    cancelled_date: str = Body(...),
    cancelled_slot: str = Body(...)
):
    """When an appointment is cancelled, automatically notify waitlist"""
    result = await notify_waitlist_slot_available(
        doctor_id=doctor_id,
        available_date=cancelled_date,
        available_slot=cancelled_slot
    )
    return {
        "success": True,
        "action": "cancellation_processed",
        "waitlist_notified": result.get("notified_count", 0)
    }
