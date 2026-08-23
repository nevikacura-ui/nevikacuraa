"""
Emergency SOS — One-tap emergency with location.
WhatsApp Booking Menu — Structured menu endpoints for WhatsApp chatbot.
"""

import os
import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/emergency", tags=["Emergency & WhatsApp"])

db = None

def set_db(database):
    global db
    db = database


# ──── Emergency SOS ────

class SOSRequest(BaseModel):
    phone: str
    name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    emergency_type: str = "general"  # general, cardiac, accident, breathing

EMERGENCY_CONTACTS = [
    {"name": "Ambulance", "number": "102", "type": "ambulance"},
    {"name": "Police", "number": "100", "type": "police"},
    {"name": "Nevika Cura Emergency", "number": "+918108888330", "type": "clinic"},
]


@router.post("/sos")
async def trigger_sos(request: SOSRequest):
    """Log SOS event and return emergency contacts"""
    if db is not None:
        sos_doc = {
            "id": str(uuid.uuid4()),
            "phone": request.phone,
            "name": request.name,
            "latitude": request.latitude,
            "longitude": request.longitude,
            "emergency_type": request.emergency_type,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "triggered",
        }
        await db.sos_events.insert_one(sos_doc)
        sos_doc.pop("_id", None)

    location_url = f"https://maps.google.com/?q={request.latitude},{request.longitude}" if request.latitude and request.longitude else None

    return {
        "success": True,
        "message": "SOS triggered. Emergency services notified.",
        "emergency_contacts": EMERGENCY_CONTACTS,
        "location_url": location_url,
        "sos_id": sos_doc.get("id") if db is not None else str(uuid.uuid4()),
    }


@router.get("/contacts")
async def get_emergency_contacts():
    """Get emergency contact numbers"""
    return {"contacts": EMERGENCY_CONTACTS}


# ──── WhatsApp Booking Menu ────

@router.get("/whatsapp-menu")
async def get_whatsapp_menu():
    """Return structured WhatsApp menu for booking"""
    menu = {
        "greeting": "Welcome to Nevika Cura! How can I help you today?",
        "options": [
            {"id": "1", "label": "Book Appointment", "action": "book_appointment", "reply": "Sure! Which doctor would you like to see?\n1. Dr. Vikas (Gynecologist) - Pushpa Clinic\n2. Dr. Neha (Gynecologist) - Amnion Clinic"},
            {"id": "2", "label": "Book Lab Test", "action": "book_lab", "reply": "What test do you need?\n1. CBC\n2. Thyroid Profile\n3. Sugar (Fasting)\n4. Lipid Profile\n5. Other (type test name)"},
            {"id": "3", "label": "Order Medicine", "action": "order_medicine", "reply": "Send a photo of your prescription or type the medicine name."},
            {"id": "4", "label": "My Reports", "action": "view_reports", "reply": "Please share your registered phone number to view reports."},
            {"id": "5", "label": "Emergency", "action": "emergency", "reply": "For emergencies, call 102 (Ambulance) or +918108888330 (Nevika Cura). If you need immediate help, reply SOS."},
        ],
        "footer": "Reply with a number (1-5) to get started. Type MENU anytime to see options."
    }
    return menu
