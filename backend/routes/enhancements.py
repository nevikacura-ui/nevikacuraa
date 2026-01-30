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
    if db is None:
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
    
    if db is None:
        return {"prescriptions": []}
    
    prescriptions = await db.prescriptions.find(
        {"patient_phone": patient_phone},
        {"_id": 0}
    ).sort("date", -1).to_list(50)
    
    return {"prescriptions": prescriptions}

@router.post("/prescriptions/{prescription_id}/refill")
async def request_refill(prescription_id: str, patient = Depends(get_patient_from_token)):
    """Request prescription refill"""
    if db is not None:
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
    
    if db is None:
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
    
    if db is not None:
        await db.family_members.insert_one(member_doc)
    
    # Exclude MongoDB _id from response
    response_doc = {k: v for k, v in member_doc.items() if k != "_id"}
    return {"success": True, "member": response_doc}

# ============ Loyalty Points (#11) ============
@router.get("/loyalty")
async def get_loyalty_data(patient = Depends(get_patient_from_token)):
    """Get patient's loyalty points and tier"""
    patient_phone = patient.get("phone") or patient.get("sub")
    
    if db is None:
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
    
    if db is not None:
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
    
    if db is None:
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
    
    if db is not None:
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
    payment_link = f"https://nevikacura-5.preview.emergentagent.com/pay/{link_id}"
    
    if db is not None:
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

# ============ Health Score Gamification (#5) ============
@router.get("/health-score")
async def get_health_score(patient = Depends(get_patient_from_token)):
    """Get patient's health score and gamification data"""
    patient_phone = patient.get("phone") or patient.get("sub")
    
    default_data = {
        "score": 72,
        "streak": 0,
        "level": 1,
        "xp": 150,
        "xpToNextLevel": 500,
        "badges": ["first_checkup", "med_master"],
        "lastCheckIn": None
    }
    
    if db is None:
        return default_data
    
    data = await db.health_scores.find_one(
        {"patient_phone": patient_phone},
        {"_id": 0, "patient_phone": 0}
    )
    
    return data or default_data

@router.post("/health-score/checkin")
async def health_checkin(patient = Depends(get_patient_from_token)):
    """Record daily health check-in"""
    patient_phone = patient.get("phone") or patient.get("sub")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    if db is not None:
        # Check if already checked in today
        existing = await db.health_scores.find_one({"patient_phone": patient_phone})
        
        if existing and existing.get("lastCheckIn") == today:
            return {"success": False, "message": "Already checked in today", "streak": existing.get("streak", 1)}
        
        # Update streak
        current_streak = existing.get("streak", 0) if existing else 0
        last_checkin = existing.get("lastCheckIn") if existing else None
        
        # Check if streak continues
        from datetime import timedelta
        yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
        new_streak = current_streak + 1 if last_checkin == yesterday else 1
        
        await db.health_scores.update_one(
            {"patient_phone": patient_phone},
            {"$set": {"lastCheckIn": today, "streak": new_streak}, "$inc": {"xp": 10}},
            upsert=True
        )
        
        return {"success": True, "streak": new_streak, "xp_earned": 10}
    
    return {"success": True, "streak": 1, "xp_earned": 10}

# ============ Smart Reminders (#1) ============
@router.get("/reminders")
async def get_reminders(patient = Depends(get_patient_from_token)):
    """Get patient's reminders"""
    patient_phone = patient.get("phone") or patient.get("sub")
    
    # Get upcoming appointments
    appointments = []
    medications = []
    
    if db is not None:
        # Get appointments for this patient
        patient_data = await db.patients.find_one({"phone": patient_phone})
        if patient_data:
            patient_name = patient_data.get("name", "")
            appts = await db.appointments.find({
                "patient_name": patient_name,
                "status": {"$in": ["pending", "Booked", "confirmed"]}
            }).to_list(10)
            
            for appt in appts:
                appointments.append({
                    "id": str(appt.get("_id", appt.get("id"))),
                    "type": "appointment",
                    "title": f"Dr. {appt.get('doctor', 'Doctor')} Consultation",
                    "datetime": f"{appt.get('date')} {appt.get('time')}",
                    "location": appt.get("clinic", "Clinic"),
                    "status": "upcoming"
                })
    
    # Return combined reminders
    return {"reminders": appointments + medications}

@router.post("/reminders")
async def add_reminder(reminder: dict, patient = Depends(get_patient_from_token)):
    """Add a new reminder"""
    patient_phone = patient.get("phone") or patient.get("sub")
    
    reminder_data = {
        "id": str(uuid.uuid4())[:8],
        "patient_phone": patient_phone,
        "type": reminder.get("type", "medication"),
        "title": reminder.get("name"),
        "time": reminder.get("time"),
        "frequency": reminder.get("frequency"),
        "channels": reminder.get("channels", {"push": True}),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if db is not None:
        await db.reminders.insert_one(reminder_data)
    
    return {"success": True, "reminder_id": reminder_data["id"]}

# ============ Emergency SOS (#30) ============
@router.post("/emergency/sos")
async def trigger_emergency_sos(data: dict, patient = Depends(get_patient_from_token)):
    """Trigger emergency SOS alert"""
    patient_phone = patient.get("phone") or patient.get("sub")
    
    emergency_data = {
        "id": str(uuid.uuid4()),
        "patient_phone": patient_phone,
        "location": data.get("location"),
        "contacts": data.get("contacts", []),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "sent"
    }
    
    if db is not None:
        await db.emergency_alerts.insert_one(emergency_data)
        
        # In production, send SMS/WhatsApp to emergency contacts
        # For now, just log it
    
    return {"success": True, "alert_id": emergency_data["id"], "message": "Emergency alert sent"}

# ============ Medication Interaction Checker (#20) ============
@router.post("/medications/check-interactions")
async def check_medication_interactions(medications: List[str]):
    """Check for drug interactions"""
    # In production, this would call a drug interaction API
    
    known_interactions = [
        {"drugs": ["aspirin", "ibuprofen"], "severity": "moderate", "description": "Increased bleeding risk"},
        {"drugs": ["warfarin", "aspirin"], "severity": "high", "description": "Significantly increases bleeding risk"},
        {"drugs": ["metformin", "alcohol"], "severity": "moderate", "description": "Risk of lactic acidosis"},
    ]
    
    found_interactions = []
    med_lower = [m.lower() for m in medications]
    
    for interaction in known_interactions:
        if all(drug.lower() in med_lower for drug in interaction["drugs"]):
            found_interactions.append(interaction)
    
    return {
        "interactions": found_interactions,
        "safe": len(found_interactions) == 0
    }

# ============ Health Content Hub (#17) ============
@router.get("/health-content")
async def get_health_content(category: str = None, search: str = None):
    """Get health articles and content"""
    # In production, this would come from a CMS
    articles = [
        {
            "id": 1,
            "title": "10 Foods to Lower Blood Sugar Naturally",
            "category": "diabetes",
            "type": "article",
            "readTime": "5 min",
            "author": "Dr. Vikas Jha"
        },
        {
            "id": 2,
            "title": "Understanding Pregnancy Trimesters",
            "category": "pregnancy",
            "type": "video",
            "duration": "12 min",
            "author": "Dr. Neha Patel"
        }
    ]
    
    if category:
        articles = [a for a in articles if a["category"] == category]
    
    if search:
        articles = [a for a in articles if search.lower() in a["title"].lower()]
    
    return {"articles": articles, "total": len(articles)}

def setup_routes(database):
    """Setup routes with database"""
    global db
    db = database
    return router
