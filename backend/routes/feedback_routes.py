"""
Post-Visit Feedback System
- Check for pending feedback (completed appointments without feedback)
- Submit emoji rating + optional comment
- Dismiss feedback prompt
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/post-visit-feedback", tags=["Feedback"])

db = None

def set_db(database):
    global db
    db = database


class FeedbackSubmit(BaseModel):
    appointment_id: str
    phone: str
    rating: int  # 1-5
    comment: str = ""
    doctor: str = ""
    clinic: str = ""


class FeedbackDismiss(BaseModel):
    appointment_id: str
    phone: str


@router.get("/pending")
async def get_pending_feedback(phone: str):
    """
    Check if there's a completed appointment in the last 24 hours
    that hasn't been rated yet (and wasn't dismissed).
    """
    if not phone or len(phone) < 10:
        return {"appointment": None}

    phone_clean = phone[-10:]
    now = datetime.now(timezone.utc)

    # Find completed appointments without feedback
    completed = await db.appointments.find(
        {
            "$or": [
                {"patient_phone": {"$regex": phone_clean}},
                {"phone": {"$regex": phone_clean}},
            ],
            "status": {"$in": ["Completed", "completed"]},
        },
        {"_id": 0}
    ).sort("updated_at", -1).to_list(10)

    for apt in completed:
        apt_id = apt.get("id") or apt.get("booking_id", "")
        if not apt_id:
            continue

        # Check if already rated or dismissed
        existing = await db.feedback.find_one({"appointment_id": apt_id})
        if existing:
            continue

        dismissed = await db.feedback_dismissed.find_one({"appointment_id": apt_id})
        if dismissed:
            continue

        return {
            "appointment": {
                "id": apt_id,
                "booking_id": apt.get("booking_id", ""),
                "doctor": apt.get("doctor", ""),
                "clinic": apt.get("clinic", ""),
                "date": apt.get("date", ""),
                "time": apt.get("time", ""),
            }
        }

    return {"appointment": None}


@router.post("/submit")
async def submit_feedback(data: FeedbackSubmit):
    """Submit emoji rating and optional comment for a completed appointment."""
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")

    # Check if already submitted
    existing = await db.feedback.find_one({"appointment_id": data.appointment_id})
    if existing:
        raise HTTPException(status_code=400, detail="Feedback already submitted")

    feedback = {
        "appointment_id": data.appointment_id,
        "phone": data.phone,
        "rating": data.rating,
        "comment": data.comment,
        "doctor": data.doctor,
        "clinic": data.clinic,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.feedback.insert_one(feedback)
    feedback.pop("_id", None)

    # Update appointment with rating
    await db.appointments.update_one(
        {"$or": [{"id": data.appointment_id}, {"booking_id": data.appointment_id}]},
        {"$set": {"feedback_rating": data.rating, "feedback_comment": data.comment}}
    )

    return {"success": True, "message": "Thank you for your feedback!"}


@router.post("/dismiss")
async def dismiss_feedback(data: FeedbackDismiss):
    """Dismiss a feedback prompt so it doesn't show again."""
    await db.feedback_dismissed.insert_one({
        "appointment_id": data.appointment_id,
        "phone": data.phone,
        "dismissed_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"success": True}
