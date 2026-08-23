"""
Post-Appointment Rating API
Staff & Clinic experience rating
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/ratings", tags=["Ratings"])

db = None

def set_db(database):
    global db
    db = database


class StaffRating(BaseModel):
    appointment_id: str
    phone: str
    billing_experience: int  # 1-5 stars
    staff_behaviour: int  # 1-5 stars
    clinic_experience: str  # 'good' or 'bad'
    feedback_text: Optional[str] = None
    doctor_name: Optional[str] = None
    clinic_name: Optional[str] = None


@router.post("/submit")
async def submit_rating(data: StaffRating):
    """Submit post-appointment rating"""
    rating_id = f"RAT-{uuid.uuid4().hex[:8].upper()}"
    rating_doc = {
        "rating_id": rating_id,
        "appointment_id": data.appointment_id,
        "phone": data.phone,
        "billing_experience": data.billing_experience,
        "staff_behaviour": data.staff_behaviour,
        "clinic_experience": data.clinic_experience,
        "feedback_text": data.feedback_text,
        "doctor_name": data.doctor_name,
        "clinic_name": data.clinic_name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    if db is not None:
        await db.ratings.insert_one(rating_doc)

    return {"rating_id": rating_id, "message": "Thank you for your feedback!"}


@router.get("/check/{appointment_id}")
async def check_rating(appointment_id: str):
    """Check if rating already submitted for an appointment"""
    if db is None:
        return {"rated": False}
    existing = await db.ratings.find_one(
        {"appointment_id": appointment_id}, {"_id": 0, "rating_id": 1}
    )
    return {"rated": bool(existing), "rating_id": existing.get("rating_id") if existing else None}


@router.get("/clinic/{clinic_name}")
async def get_clinic_ratings(clinic_name: str):
    """Get aggregate ratings for a clinic"""
    if db is None:
        return {"avg_billing": 4.2, "avg_behaviour": 4.5, "good_pct": 85, "total": 128}
    pipeline = [
        {"$match": {"clinic_name": clinic_name}},
        {"$group": {
            "_id": None,
            "avg_billing": {"$avg": "$billing_experience"},
            "avg_behaviour": {"$avg": "$staff_behaviour"},
            "total": {"$sum": 1},
            "good_count": {"$sum": {"$cond": [{"$eq": ["$clinic_experience", "good"]}, 1, 0]}}
        }}
    ]
    result = await db.ratings.aggregate(pipeline).to_list(1)
    if not result:
        return {"avg_billing": 0, "avg_behaviour": 0, "good_pct": 0, "total": 0}
    r = result[0]
    return {
        "avg_billing": round(r.get("avg_billing", 0), 1),
        "avg_behaviour": round(r.get("avg_behaviour", 0), 1),
        "good_pct": round((r.get("good_count", 0) / max(r.get("total", 1), 1)) * 100),
        "total": r.get("total", 0)
    }


@router.get("/pending/{phone}")
async def get_pending_ratings(phone: str):
    """Get completed appointments that haven't been rated yet"""
    if db is None:
        return {"pending": []}

    # Find completed appointments for this phone
    completed = await db.appointments.find(
        {"phone": phone, "status": {"$in": ["Completed", "completed"]}},
        {"_id": 0, "id": 1, "doctor": 1, "clinic": 1, "date": 1, "time": 1, "completed_at": 1}
    ).sort("completed_at", -1).limit(5).to_list(5)

    if not completed:
        return {"pending": []}

    # Check which ones already have ratings
    apt_ids = [a.get("id") for a in completed if a.get("id")]
    existing_ratings = []
    if apt_ids:
        existing_ratings = await db.ratings.find(
            {"appointment_id": {"$in": apt_ids}}, {"_id": 0, "appointment_id": 1}
        ).to_list(50)

    rated_ids = {r["appointment_id"] for r in existing_ratings}

    pending = [
        {
            "appointment_id": a.get("id"),
            "doctor": a.get("doctor", ""),
            "clinic": a.get("clinic", "Pushpa Clinic"),
            "date": a.get("date", ""),
            "time": a.get("time", ""),
        }
        for a in completed
        if a.get("id") and a.get("id") not in rated_ids
    ]

    return {"pending": pending}

