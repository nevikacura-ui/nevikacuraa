from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import os
import requests as http_requests
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/video-consult", tags=["Video Consultations"])

db = None

def set_db(database):
    global db
    db = database

# ── Models ──

class CreateRoomRequest(BaseModel):
    appointment_id: Optional[str] = None
    doctor_name: Optional[str] = None
    patient_phone: Optional[str] = None

class JoinRoomRequest(BaseModel):
    room_name: str
    user_name: str
    is_doctor: bool = False

# ── Daily.co Integration ──

DAILY_API_URL = "https://api.daily.co/v1"

def _get_daily_headers():
    api_key = os.environ.get("DAILY_CO_API_KEY")
    if not api_key:
        raise HTTPException(500, "Daily.co API key not configured")
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

# ── Endpoints ──

@router.post("/create-room")
async def create_video_room(req: CreateRoomRequest):
    """Create a Daily.co video room for consultation"""
    room_name = f"cura-{uuid.uuid4().hex[:8]}"
    exp_time = int((datetime.utcnow() + timedelta(hours=2)).timestamp())

    try:
        resp = http_requests.post(
            f"{DAILY_API_URL}/rooms/",
            json={
                "name": room_name,
                "properties": {
                    "exp": exp_time,
                    "start_audio_off": False,
                    "start_video_off": False,
                    "enable_chat": True,
                    "enable_knocking": True,
                    "lang": "en",
                }
            },
            headers=_get_daily_headers(),
            timeout=10,
        )
        resp.raise_for_status()
        room_data = resp.json()
    except Exception as e:
        logger.error(f"Daily.co room creation failed: {e}")
        raise HTTPException(500, f"Failed to create video room: {str(e)}")

    # Store consultation record
    consultation = {
        "consultation_id": f"VC-{uuid.uuid4().hex[:8].upper()}",
        "room_name": room_data["name"],
        "room_url": room_data["url"],
        "appointment_id": req.appointment_id or "",
        "doctor_name": req.doctor_name or "",
        "patient_phone": req.patient_phone or "",
        "status": "created",
        "expires_at": datetime.fromtimestamp(exp_time, tz=timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.video_consultations.insert_one({**consultation})
    consultation.pop("_id", None)

    return {
        "room_url": room_data["url"],
        "room_name": room_data["name"],
        "consultation_id": consultation["consultation_id"],
        "expires_at": consultation["expires_at"],
    }


@router.post("/create-token")
async def create_meeting_token(req: JoinRoomRequest):
    """Create a meeting token for a participant"""
    exp_time = int((datetime.utcnow() + timedelta(hours=2)).timestamp())

    try:
        resp = http_requests.post(
            f"{DAILY_API_URL}/meeting-tokens",
            json={
                "properties": {
                    "room_name": req.room_name,
                    "user_name": req.user_name,
                    "is_owner": req.is_doctor,
                    "exp": exp_time,
                    "enable_screenshare": True,
                }
            },
            headers=_get_daily_headers(),
            timeout=10,
        )
        resp.raise_for_status()
        token_data = resp.json()
    except Exception as e:
        logger.error(f"Daily.co token creation failed: {e}")
        raise HTTPException(500, f"Failed to create meeting token: {str(e)}")

    return {"token": token_data.get("token", ""), "room_name": req.room_name}


@router.get("/consultations/{phone}")
async def get_consultations(phone: str):
    """Get video consultation history for a patient"""
    consultations = await db.video_consultations.find(
        {"patient_phone": phone}, {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    return {"consultations": consultations}


@router.get("/active")
async def get_active_rooms():
    """Get active video consultation rooms"""
    now = datetime.now(timezone.utc).isoformat()
    active = await db.video_consultations.find(
        {"status": {"$in": ["created", "in_progress"]}, "expires_at": {"$gte": now}},
        {"_id": 0}
    ).to_list(50)
    return {"active_rooms": active, "total": len(active)}


@router.patch("/status/{consultation_id}")
async def update_consultation_status(consultation_id: str, status: str):
    """Update consultation status"""
    valid_statuses = ["created", "in_progress", "completed", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(400, f"Invalid status. Must be one of: {valid_statuses}")

    result = await db.video_consultations.update_one(
        {"consultation_id": consultation_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(404, "Consultation not found")
    return {"message": f"Status updated to {status}"}
