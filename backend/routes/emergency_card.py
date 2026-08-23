"""
Enhanced Emergency Health QR API
- Comprehensive medical profile form
- Unique QR code generation with public scan URL
- Toggle between full details and critical-only view
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from bson import ObjectId
from pydantic import BaseModel
from typing import List, Optional
import hashlib
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/emergency-card", tags=["Emergency Health Card"])
db = None

def set_db(database):
    global db
    db = database


def generate_card_id(phone: str) -> str:
    """Generate a short unique card ID from phone number."""
    h = hashlib.sha256(f"nevika-ehc-{phone}".encode()).hexdigest()[:10]
    return f"EHC-{h.upper()}"


@router.get("/{phone}")
async def get_emergency_card(phone: str):
    """Get or create emergency health card for a patient."""
    card = await db.emergency_cards.find_one({"phone": phone}, {"_id": 0})
    
    if not card:
        user = await db.users.find_one({"phone": phone}, {"_id": 0})
        
        # Auto-populate current medications from prescriptions
        current_meds = []
        prescriptions = await db.prescriptions.find(
            {"patient_phone": phone}
        ).sort("created_at", -1).limit(5).to_list(5)
        for rx in prescriptions:
            for med in rx.get("medicines", []):
                med_entry = {
                    "name": med.get("name", ""),
                    "dose": med.get("dosage", med.get("dose", "")),
                    "frequency": med.get("frequency", ""),
                }
                if med_entry["name"] and med_entry not in current_meds:
                    current_meds.append(med_entry)
        
        card_id = generate_card_id(phone)
        
        card = {
            "card_id": card_id,
            "phone": phone,
            "full_name": user.get("name", "") if user else "",
            "age": user.get("age", "") if user else "",
            "dob": "",
            "gender": "",
            "blood_group": "",
            "emergency_contact": {"name": "", "relation": "", "phone": ""},
            "secondary_contact": {"name": "", "relation": "", "phone": ""},
            "past_medical_history": [],
            "current_medications": current_meds[:10],
            "allergies": {"drug": [], "food": [], "other": []},
            "treating_doctor": {"name": "Dr. Vikas Jha", "clinic": "Nevika Cura", "phone": "+918108888330"},
            "previous_surgeries": [],
            "chronic_conditions": [],
            "implant_devices": [],
            "pregnancy_status": "",
            "special_instructions": "",
            "insurance_id": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.emergency_cards.insert_one({**card, "_id": ObjectId()})
    
    # Ensure card_id exists for older cards
    if "card_id" not in card:
        card["card_id"] = generate_card_id(phone)
        await db.emergency_cards.update_one(
            {"phone": phone},
            {"$set": {"card_id": card["card_id"]}}
        )
    
    return {"success": True, "card": card}


@router.put("/{phone}")
async def update_emergency_card(phone: str, data: dict):
    """Update emergency health card data."""
    allowed_fields = [
        "full_name", "age", "dob", "gender", "blood_group",
        "emergency_contact", "secondary_contact",
        "past_medical_history", "current_medications",
        "allergies", "treating_doctor",
        "previous_surgeries", "chronic_conditions",
        "implant_devices", "pregnancy_status",
        "special_instructions", "insurance_id",
        # Backward compat
        "name", "doctor_name", "doctor_phone",
    ]
    
    update = {}
    for k, v in data.items():
        if k in allowed_fields:
            # Backward compat mapping
            if k == "name":
                update["full_name"] = v
            elif k == "doctor_name":
                update["treating_doctor.name"] = v
            elif k == "doctor_phone":
                update["treating_doctor.phone"] = v
            else:
                update[k] = v
    
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Ensure card_id
    existing = await db.emergency_cards.find_one({"phone": phone})
    if not existing:
        card_id = generate_card_id(phone)
        update["card_id"] = card_id
        update["phone"] = phone
        update["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.emergency_cards.update_one(
        {"phone": phone},
        {"$set": update},
        upsert=True
    )
    
    card = await db.emergency_cards.find_one({"phone": phone}, {"_id": 0})
    return {"success": True, "card": card}


@router.get("/scan/{card_id}")
async def get_card_by_scan(card_id: str, mode: str = "critical"):
    """
    Public endpoint — no auth needed.
    Called when someone scans the QR code.
    mode: 'critical' (default) or 'full'
    """
    card = await db.emergency_cards.find_one({"card_id": card_id}, {"_id": 0})
    
    if not card:
        raise HTTPException(status_code=404, detail="Emergency card not found")
    
    if mode == "critical":
        # Return only life-critical information
        critical = {
            "card_id": card.get("card_id"),
            "full_name": card.get("full_name", card.get("name", "")),
            "age": card.get("age", ""),
            "gender": card.get("gender", ""),
            "blood_group": card.get("blood_group", ""),
            "allergies": card.get("allergies", {}),
            "current_medications": card.get("current_medications", []),
            "chronic_conditions": card.get("chronic_conditions", []),
            "implant_devices": card.get("implant_devices", []),
            "emergency_contact": card.get("emergency_contact", {}),
            "secondary_contact": card.get("secondary_contact", {}),
            "treating_doctor": card.get("treating_doctor", {}),
            "special_instructions": card.get("special_instructions", ""),
        }
        return {"success": True, "mode": "critical", "card": critical}
    else:
        # Return full profile (exclude internal fields)
        card.pop("_id", None)
        return {"success": True, "mode": "full", "card": card}
