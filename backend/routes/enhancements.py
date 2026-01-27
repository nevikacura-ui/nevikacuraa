"""
Enhancement APIs - Backend routes for all enhancement features
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timezone
import jwt
import os
import uuid

router = APIRouter(prefix="/patient", tags=["Patient Enhancements"])

JWT_SECRET = os.environ.get('JWT_SECRET', 'your_jwt_secret_here')

# Database reference (set from server.py)
db = None

def set_db(database):
    global db
    db = database

async def get_patient_from_token(authorization: str = Header(None)):
    """Extract patient info from JWT token"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        token = authorization.split(' ')[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ Queue Tracker (#2) ============
@router.get("/queue/position")
async def get_queue_position(appointment_id: str, patient = Depends(get_patient_from_token)):
    """Get patient's position in queue"""
    if not db:
        # Return mock data if DB not available
        return {
            "position": 3,
            "totalAhead": 5,
            "estimatedWait": 45,
            "averageConsultTime": 15,
            "status": "waiting"
        }
    
    appointment = await db.appointments.find_one({"id": appointment_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Get all appointments for same doctor/clinic/date that are ahead
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    clinic = appointment.get("clinic")
    doctor = appointment.get("doctor")
    appt_time = appointment.get("time")
    
    ahead = await db.appointments.count_documents({
        "clinic": clinic,
        "doctor": doctor,
        "date": today,
        "time": {"$lt": appt_time},
        "status": {"$in": ["pending", "Booked", "In Clinic"]}
    })
    
    return {
        "position": ahead + 1,
        "totalAhead": ahead,
        "estimatedWait": ahead * 15,
        "averageConsultTime": 15,
        "status": appointment.get("status", "waiting")
    }

# ============ Prescription Wallet (#3) ============
class Prescription(BaseModel):
    id: str
    doctor: str
    date: str
    medicines: List[dict]
    isActive: bool = True
    refillDue: Optional[int] = None

@router.get("/prescriptions")
async def get_prescriptions(patient = Depends(get_patient_from_token)):
    """Get patient's prescriptions"""
    patient_phone = patient.get("phone") or patient.get("sub")
    
    if not db:
        return {"prescriptions": []}
    
    prescriptions = await db.prescriptions.find(
        {"patient_phone": patient_phone},
        {"_id": 0}
    ).sort("date", -1).to_list(50)
    
    return {"prescriptions": prescriptions}

@router.post("/prescriptions/{prescription_id}/refill")
async def request_refill(prescription_id: str, patient = Depends(get_patient_from_token)):
    """Request prescription refill"""
    if db:
        await db.refill_requests.insert_one({
            "id": str(uuid.uuid4()),
            "prescription_id": prescription_id,
            "patient_phone": patient.get("phone"),
            "status": "pending",
            "requested_at": datetime.now(timezone.utc).isoformat()
        })
    return {"success": True, "message": "Refill request submitted"}

# ============ Family Hub (#4) ============
class FamilyMember(BaseModel):
    name: str
    relation: str
    dob: Optional[str] = None
    phone: Optional[str] = None
    bloodGroup: Optional[str] = None

@router.get("/family")
async def get_family_members(patient = Depends(get_patient_from_token)):
    """Get patient's family members"""
    patient_phone = patient.get("phone") or patient.get("sub")
    
    if not db:
        return {"members": []}
    
    members = await db.family_members.find(
        {"primary_patient": patient_phone},
        {"_id": 0}
    ).to_list(20)
    
    return {"members": members}

@router.post("/family")
async def add_family_member(member: FamilyMember, patient = Depends(get_patient_from_token)):
    """Add a family member"""
    patient_phone = patient.get("phone") or patient.get("sub")
    
    member_doc = {
        "id": str(uuid.uuid4()),
        "primary_patient": patient_phone,
        **member.dict(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if db:
        await db.family_members.insert_one(member_doc)
    
    return {"success": True, "member": member_doc}

# ============ Loyalty Points (#11) ============
@router.get("/loyalty")
async def get_loyalty_data(patient = Depends(get_patient_from_token)):
    """Get patient's loyalty points and tier"""
    patient_phone = patient.get("phone") or patient.get("sub")
    
    if not db:
        return {
            "points": 750,
            "tier": "Silver",
            "pointsToNextTier": 1250,
            "history": [],
            "rewards": []
        }
    
    loyalty = await db.loyalty_points.find_one(
        {"patient_phone": patient_phone},
        {"_id": 0}
    )
    
    if not loyalty:
        loyalty = {
            "points": 0,
            "tier": "Bronze",
            "pointsToNextTier": 500,
            "history": [],
            "rewards": []
        }
    
    return loyalty

@router.post("/loyalty/earn")
async def earn_points(points: int, reason: str, patient = Depends(get_patient_from_token)):
    """Add loyalty points"""
    patient_phone = patient.get("phone") or patient.get("sub")
    
    if db:
        await db.loyalty_points.update_one(
            {"patient_phone": patient_phone},
            {
                "$inc": {"points": points},
                "$push": {
                    "history": {
                        "points": points,
                        "reason": reason,
                        "date": datetime.now(timezone.utc).isoformat()
                    }
                }
            },
            upsert=True
        )
    
    return {"success": True, "points_earned": points}

# ============ Notification Preferences (#49) ============
class NotificationPrefs(BaseModel):
    appointments: Dict[str, bool]
    reminders: Dict[str, bool]
    promotions: Dict[str, bool]
    reports: Dict[str, bool]
    queue: Dict[str, bool]

@router.get("/notification-preferences")
async def get_notification_prefs(patient = Depends(get_patient_from_token)):
    """Get notification preferences"""
    patient_phone = patient.get("phone") or patient.get("sub")
    
    default_prefs = {
        "appointments": {"push": True, "sms": True, "email": True, "whatsapp": True},
        "reminders": {"push": True, "sms": False, "email": True, "whatsapp": True},
        "promotions": {"push": False, "sms": False, "email": True, "whatsapp": False},
        "reports": {"push": True, "sms": False, "email": True, "whatsapp": True},
        "queue": {"push": True, "sms": True, "email": False, "whatsapp": True},
    }
    
    if not db:
        return default_prefs
    
    prefs = await db.notification_preferences.find_one(
        {"patient_phone": patient_phone},
        {"_id": 0, "patient_phone": 0}
    )
    
    return prefs or default_prefs

@router.post("/notification-preferences")
async def save_notification_prefs(prefs: NotificationPrefs, patient = Depends(get_patient_from_token)):
    """Save notification preferences"""
    patient_phone = patient.get("phone") or patient.get("sub")
    
    if db:
        await db.notification_preferences.update_one(
            {"patient_phone": patient_phone},
            {"$set": {**prefs.dict(), "patient_phone": patient_phone}},
            upsert=True
        )
    
    return {"success": True, "message": "Preferences saved"}

# ============ Payment Links (#48) ============
@router.post("/payment-link")
async def create_payment_link(amount: float, description: str, patient = Depends(get_patient_from_token)):
    """Create a shareable payment link"""
    link_id = str(uuid.uuid4())[:8]
    payment_link = f"https://nevika-health-6.preview.emergentagent.com/pay/{link_id}"
    
    if db:
        await db.payment_links.insert_one({
            "id": link_id,
            "amount": amount,
            "description": description,
            "created_by": patient.get("phone"),
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {
        "success": True,
        "link": payment_link,
        "whatsapp_link": f"https://wa.me/?text=Pay%20₹{amount}%20for%20{description}%20-%20{payment_link}"
    }

def setup_routes(database):
    """Setup routes with database"""
    global db
    db = database
    return router
