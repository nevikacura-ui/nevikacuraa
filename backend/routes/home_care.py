"""
Nevika Home Care - Callback request handler
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/home-care", tags=["Home Care"])

db = None

def set_db(database):
    global db
    db = database

class CallbackRequest(BaseModel):
    name: str
    phone: str
    service: str
    address: Optional[str] = ""
    preferred_time: Optional[str] = "morning"
    notes: Optional[str] = ""
    requested_at: Optional[str] = None

@router.post("/callback")
async def request_callback(req: CallbackRequest):
    doc = {
        "name": req.name,
        "phone": req.phone,
        "service": req.service,
        "address": req.address,
        "preferred_time": req.preferred_time,
        "notes": req.notes,
        "status": "pending",
        "requested_at": req.requested_at or datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if db is not None:
        await db.home_care_callbacks.insert_one(doc)
        logger.info(f"Home care callback: {req.name} - {req.service}")
    return {"success": True, "message": "Callback request received"}

@router.get("/callbacks")
async def list_callbacks():
    callbacks = []
    if db is not None:
        cursor = db.home_care_callbacks.find({}, {"_id": 0}).sort("created_at", -1).limit(50)
        callbacks = await cursor.to_list(length=50)
    return {"callbacks": callbacks}
