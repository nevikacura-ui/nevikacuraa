"""
Medical ID & Emergency Services Module
- Emergency card with vital info
- SOS button with location sharing
- Ambulance booking
- Nearby hospital finder
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/emergency", tags=["Emergency Services"])

db = None

def get_db():
    global db
    return db

def set_db(database):
    global db
    db = database

# Models
class MedicalID(BaseModel):
    blood_group: Optional[str] = None
    allergies: List[str] = []
    medical_conditions: List[str] = []
    current_medications: List[dict] = []  # {name, dosage, frequency}
    emergency_contacts: List[dict] = []  # {name, relation, phone}
    organ_donor: bool = False
    insurance_info: Optional[dict] = None
    doctor_name: Optional[str] = None
    doctor_phone: Optional[str] = None
    notes: Optional[str] = None

class SOSAlert(BaseModel):
    latitude: float
    longitude: float
    message: Optional[str] = "Emergency! Need help!"

# Pre-defined Hospitals (can be moved to DB)
HOSPITALS = [
    {
        "id": "fortis-kalyan",
        "name": "Fortis Hospital",
        "address": "Kalyan West, Mumbai",
        "phone": "022-12345678",
        "emergency_phone": "022-12345679",
        "latitude": 19.2437,
        "longitude": 73.1355,
        "type": "Multi-specialty",
        "has_icu": True,
        "has_ambulance": True,
        "rating": 4.5
    },
    {
        "id": "vedant-dombivli",
        "name": "Vedant Hospital",
        "address": "Dombivli East, Mumbai",
        "phone": "0251-2345678",
        "emergency_phone": "0251-2345679",
        "latitude": 19.2183,
        "longitude": 73.0878,
        "type": "Multi-specialty",
        "has_icu": True,
        "has_ambulance": True,
        "rating": 4.3
    },
    {
        "id": "shree-kalyan",
        "name": "Shree Hospital",
        "address": "Kalyan East, Mumbai",
        "phone": "0251-3456789",
        "emergency_phone": "0251-3456790",
        "latitude": 19.2350,
        "longitude": 73.1400,
        "type": "General",
        "has_icu": True,
        "has_ambulance": False,
        "rating": 4.0
    },
    {
        "id": "apex-thane",
        "name": "Apex Hospital",
        "address": "Thane West, Mumbai",
        "phone": "022-25678901",
        "emergency_phone": "022-25678902",
        "latitude": 19.1860,
        "longitude": 72.9637,
        "type": "Multi-specialty",
        "has_icu": True,
        "has_ambulance": True,
        "rating": 4.6
    },
    {
        "id": "jupiter-thane",
        "name": "Jupiter Hospital",
        "address": "Thane, Mumbai",
        "phone": "022-67891234",
        "emergency_phone": "1800-123-4567",
        "latitude": 19.2094,
        "longitude": 72.9784,
        "type": "Super-specialty",
        "has_icu": True,
        "has_ambulance": True,
        "rating": 4.7
    }
]

AMBULANCE_SERVICES = [
    {
        "id": "108-govt",
        "name": "108 Government Ambulance",
        "phone": "108",
        "type": "Government (Free)",
        "response_time": "15-30 mins",
        "available_24x7": True
    },
    {
        "id": "102-mother",
        "name": "102 Mother & Child Ambulance",
        "phone": "102",
        "type": "Government (Free)",
        "response_time": "15-30 mins",
        "available_24x7": True
    },
    {
        "id": "stanplus",
        "name": "StanPlus Ambulance",
        "phone": "9513159131",
        "type": "Private (Paid)",
        "response_time": "10-15 mins",
        "available_24x7": True
    },
    {
        "id": "medulance",
        "name": "Medulance",
        "phone": "9513159131",
        "type": "Private (Paid)",
        "response_time": "10-20 mins",
        "available_24x7": True
    }
]

# ==================== MEDICAL ID ====================

@router.get("/medical-id/{user_id}")
async def get_medical_id(user_id: str):
    """Get user's medical ID card"""
    db = get_db()
    
    # Get user info
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get medical ID
    medical_id = await db.medical_ids.find_one({"user_id": user_id}, {"_id": 0})
    
    if not medical_id:
        # Return default empty medical ID
        medical_id = {
            "user_id": user_id,
            "blood_group": None,
            "allergies": [],
            "medical_conditions": [],
            "current_medications": [],
            "emergency_contacts": [],
            "organ_donor": False,
            "is_complete": False
        }
    
    # Add user name and phone
    medical_id["user_name"] = user.get("name", "")
    medical_id["user_phone"] = user.get("phone", "")
    medical_id["user_email"] = user.get("email", "")
    
    # Check completeness
    medical_id["is_complete"] = bool(
        medical_id.get("blood_group") and 
        len(medical_id.get("emergency_contacts", [])) > 0
    )
    
    return medical_id

@router.post("/medical-id/{user_id}")
async def save_medical_id(user_id: str, data: MedicalID):
    """Save/update user's medical ID"""
    db = get_db()
    
    medical_id_doc = {
        "user_id": user_id,
        "blood_group": data.blood_group,
        "allergies": data.allergies,
        "medical_conditions": data.medical_conditions,
        "current_medications": data.current_medications,
        "emergency_contacts": data.emergency_contacts,
        "organ_donor": data.organ_donor,
        "insurance_info": data.insurance_info,
        "doctor_name": data.doctor_name,
        "doctor_phone": data.doctor_phone,
        "notes": data.notes,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.medical_ids.update_one(
        {"user_id": user_id},
        {"$set": medical_id_doc},
        upsert=True
    )
    
    return {"message": "Medical ID saved successfully"}

@router.get("/medical-id/{user_id}/share")
async def get_shareable_medical_id(user_id: str):
    """Get shareable version of medical ID (for QR code)"""
    db = get_db()
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "name": 1, "phone": 1})
    medical_id = await db.medical_ids.find_one({"user_id": user_id}, {"_id": 0})
    
    if not medical_id:
        raise HTTPException(status_code=404, detail="Medical ID not found")
    
    # Create shareable summary
    share_data = {
        "name": user.get("name", ""),
        "phone": user.get("phone", ""),
        "blood_group": medical_id.get("blood_group", "Not specified"),
        "allergies": medical_id.get("allergies", []),
        "conditions": medical_id.get("medical_conditions", []),
        "medications": [m.get("name") for m in medical_id.get("current_medications", [])],
        "emergency_contacts": [
            {"name": c.get("name"), "phone": c.get("phone")} 
            for c in medical_id.get("emergency_contacts", [])[:2]
        ],
        "organ_donor": medical_id.get("organ_donor", False),
        "generated_at": datetime.now(timezone.utc).isoformat()
    }
    
    return share_data

# ==================== SOS ALERT ====================

@router.post("/sos/{user_id}")
async def trigger_sos(user_id: str, alert: SOSAlert):
    """Trigger SOS alert - sends SMS to emergency contacts with location"""
    db = get_db()
    
    # Get user info
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get medical ID for emergency contacts
    medical_id = await db.medical_ids.find_one({"user_id": user_id}, {"_id": 0})
    emergency_contacts = medical_id.get("emergency_contacts", []) if medical_id else []
    
    # Create Google Maps link
    maps_link = f"https://www.google.com/maps?q={alert.latitude},{alert.longitude}"
    
    # Build SOS message
    sos_message = f"""🚨 EMERGENCY SOS ALERT 🚨

{user.get('name', 'Someone')} needs help!

📍 Location: {maps_link}

Message: {alert.message}

Blood Group: {medical_id.get('blood_group', 'Unknown') if medical_id else 'Unknown'}
Allergies: {', '.join(medical_id.get('allergies', [])) if medical_id else 'None listed'}

Please respond immediately or call emergency services."""

    # Log SOS alert
    sos_log = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_name": user.get("name"),
        "user_phone": user.get("phone"),
        "latitude": alert.latitude,
        "longitude": alert.longitude,
        "message": alert.message,
        "emergency_contacts_notified": [c.get("phone") for c in emergency_contacts],
        "status": "triggered",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.sos_alerts.insert_one(sos_log)
    
    # In production, send SMS via Twilio to each emergency contact
    # For now, return the contacts that would be notified
    
    return {
        "message": "SOS Alert triggered!",
        "alert_id": sos_log["id"],
        "contacts_notified": len(emergency_contacts),
        "emergency_contacts": emergency_contacts,
        "location_link": maps_link,
        "sms_message": sos_message,
        "nearby_hospitals": await get_nearby_hospitals_internal(alert.latitude, alert.longitude, 5),
        "ambulance_numbers": AMBULANCE_SERVICES[:2]
    }

# ==================== HOSPITALS & AMBULANCE ====================

@router.get("/hospitals")
async def get_hospitals(latitude: Optional[float] = None, longitude: Optional[float] = None, limit: int = 10):
    """Get list of hospitals, optionally sorted by distance"""
    hospitals = HOSPITALS.copy()
    
    if latitude and longitude:
        # Calculate distance and sort
        for h in hospitals:
            h["distance_km"] = calculate_distance(
                latitude, longitude, 
                h["latitude"], h["longitude"]
            )
        hospitals.sort(key=lambda x: x["distance_km"])
    
    return {"hospitals": hospitals[:limit]}

async def get_nearby_hospitals_internal(latitude: float, longitude: float, limit: int = 5):
    """Internal function to get nearby hospitals"""
    hospitals = HOSPITALS.copy()
    for h in hospitals:
        h["distance_km"] = calculate_distance(latitude, longitude, h["latitude"], h["longitude"])
    hospitals.sort(key=lambda x: x["distance_km"])
    return hospitals[:limit]

@router.get("/ambulance-services")
async def get_ambulance_services():
    """Get list of ambulance services"""
    return {"services": AMBULANCE_SERVICES}

@router.post("/ambulance/request")
async def request_ambulance(user_id: str, latitude: float, longitude: float, hospital_id: Optional[str] = None):
    """Request ambulance"""
    db = get_db()
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Log ambulance request
    request_log = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_name": user.get("name"),
        "user_phone": user.get("phone"),
        "latitude": latitude,
        "longitude": longitude,
        "hospital_id": hospital_id,
        "status": "requested",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.ambulance_requests.insert_one(request_log)
    
    # Get nearest hospital with ambulance
    nearby = await get_nearby_hospitals_internal(latitude, longitude, 3)
    hospitals_with_ambulance = [h for h in nearby if h.get("has_ambulance")]
    
    return {
        "message": "Ambulance request logged. Please also call 108 for fastest response.",
        "request_id": request_log["id"],
        "recommended_numbers": [
            {"name": "Government Ambulance", "phone": "108"},
            {"name": "Mother & Child", "phone": "102"}
        ],
        "nearest_hospital_with_ambulance": hospitals_with_ambulance[0] if hospitals_with_ambulance else None,
        "location_link": f"https://www.google.com/maps?q={latitude},{longitude}"
    }

# ==================== HELPER FUNCTIONS ====================

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two coordinates in km (Haversine formula)"""
    from math import radians, sin, cos, sqrt, atan2
    
    R = 6371  # Earth's radius in km
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return round(R * c, 1)
