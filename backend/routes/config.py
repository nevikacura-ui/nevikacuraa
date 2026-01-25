"""
Configuration API Routes
Handles clinic config, doctors, fees, and other configurable data stored in MongoDB
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient
import os
import jwt
from datetime import datetime, timezone

router = APIRouter(prefix="/config", tags=["Configuration"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'nevika_cura')]

# JWT config
JWT_SECRET = os.environ.get('JWT_SECRET', 'nevika-cura-secret-key-2025')
JWT_ALGORITHM = 'HS256'

# ============================================
# Auth Helper
# ============================================

async def verify_admin(authorization: str = Header(None)):
    """Verify the user is an admin or super_admin"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.replace('Bearer ', '')
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        role = payload.get('role', '')
        if role not in ['admin', 'super_admin']:
            raise HTTPException(status_code=403, detail="Admin access required")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============================================
# Pydantic Models
# ============================================

class ClinicSchedule(BaseModel):
    days: List[str]
    time: str

class Clinic(BaseModel):
    id: str
    name: str
    address: str
    city: str
    phone: str
    hours: str
    map_link: Optional[str] = None
    services: List[str]
    logo: Optional[str] = None
    doctors: List[str]
    active: bool = True

class DoctorSchedules(BaseModel):
    clinic_name: str
    schedules: List[ClinicSchedule]

class Doctor(BaseModel):
    id: str
    name: str
    specialization: str
    qualification: str
    experience: Optional[str] = None
    avatar: str
    color: str
    schedules: Dict[str, List[ClinicSchedule]]
    active: bool = True

class FeeCode(BaseModel):
    code: str
    label: str
    amount: int
    color: str
    category: str

class Service(BaseModel):
    id: str
    name: str
    description: str
    logo: str
    path: str
    bg_color: str
    is_dark: bool
    active: bool = True

class Certification(BaseModel):
    name: str
    full_name: str
    color: str

class Testimonial(BaseModel):
    id: int
    name: str
    location: str
    rating: int
    text: str
    service: str
    avatar: str
    active: bool = True

class HealthTip(BaseModel):
    tip: str
    icon: str
    category: str

# ============================================
# API Endpoints - GET (Public)
# ============================================

@router.get("/clinics")
async def get_clinics():
    """Get all active clinics"""
    clinics = await db.clinics.find({"active": {"$ne": False}}, {"_id": 0}).to_list(100)
    if not clinics:
        # Return default data if no data in DB
        from data.clinic_config import CLINICS_DATA
        return CLINICS_DATA["clinics"]
    return clinics

@router.get("/clinics/{clinic_id}")
async def get_clinic(clinic_id: str):
    """Get clinic by ID"""
    clinic = await db.clinics.find_one({"id": clinic_id}, {"_id": 0})
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    return clinic

@router.get("/doctors")
async def get_doctors():
    """Get all active doctors"""
    doctors = await db.doctors.find({"active": {"$ne": False}}, {"_id": 0}).to_list(100)
    if not doctors:
        from data.clinic_config import DOCTORS_DATA
        return DOCTORS_DATA["doctors"]
    return doctors

@router.get("/doctors/{doctor_id}")
async def get_doctor(doctor_id: str):
    """Get doctor by ID"""
    doctor = await db.doctors.find_one({"id": doctor_id}, {"_id": 0})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor

@router.get("/doctor-schedules/{doctor_name}")
async def get_doctor_schedules(doctor_name: str):
    """Get schedules for a specific doctor"""
    doctor = await db.doctors.find_one({"name": doctor_name}, {"_id": 0, "schedules": 1})
    if not doctor:
        # Fallback to default data
        from data.clinic_config import DOCTORS_DATA
        for doc in DOCTORS_DATA["doctors"]:
            if doc["name"] == doctor_name:
                return doc.get("schedules", {})
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor.get("schedules", {})

@router.get("/fees")
async def get_fee_codes():
    """Get all fee codes"""
    fees = await db.fee_codes.find({}, {"_id": 0}).to_list(100)
    if not fees:
        from data.clinic_config import FEE_CODES_DATA
        return FEE_CODES_DATA
    return {"consultation_fees": [f for f in fees if f.get("type") == "consultation"],
            "scan_fees": [f for f in fees if f.get("type") == "scan"]}

@router.get("/fees/consultation")
async def get_consultation_fees():
    """Get consultation fee codes"""
    fees = await db.fee_codes.find({"type": "consultation"}, {"_id": 0}).to_list(100)
    if not fees:
        from data.clinic_config import FEE_CODES_DATA
        return FEE_CODES_DATA["consultation_fees"]
    return fees

@router.get("/fees/scan")
async def get_scan_fees():
    """Get scan/ultrasound fee codes"""
    fees = await db.fee_codes.find({"type": "scan"}, {"_id": 0}).to_list(100)
    if not fees:
        from data.clinic_config import FEE_CODES_DATA
        return FEE_CODES_DATA["scan_fees"]
    return fees

@router.get("/services")
async def get_services():
    """Get all active services"""
    services = await db.services.find({"active": {"$ne": False}}, {"_id": 0}).to_list(100)
    if not services:
        from data.clinic_config import SERVICES_DATA
        return SERVICES_DATA["services"]
    return services

@router.get("/certifications")
async def get_certifications():
    """Get all certifications"""
    certs = await db.certifications.find({}, {"_id": 0}).to_list(100)
    if not certs:
        from data.clinic_config import CERTIFICATIONS_DATA
        return CERTIFICATIONS_DATA["certifications"]
    return certs

@router.get("/testimonials")
async def get_testimonials():
    """Get all active testimonials"""
    testimonials = await db.testimonials.find({"active": {"$ne": False}}, {"_id": 0}).to_list(100)
    if not testimonials:
        from data.clinic_config import TESTIMONIALS_DATA
        return TESTIMONIALS_DATA["testimonials"]
    return testimonials

@router.get("/health-tips")
async def get_health_tips():
    """Get all health tips"""
    tips = await db.health_tips.find({}, {"_id": 0}).to_list(100)
    if not tips:
        from data.clinic_config import HEALTH_TIPS_DATA
        return HEALTH_TIPS_DATA["health_tips"]
    return tips

@router.get("/health-tip/today")
async def get_todays_health_tip():
    """Get today's health tip based on day of year"""
    tips = await db.health_tips.find({}, {"_id": 0}).to_list(100)
    if not tips:
        from data.clinic_config import HEALTH_TIPS_DATA
        tips = HEALTH_TIPS_DATA["health_tips"]
    
    # Get tip based on day of year
    day_of_year = datetime.now(timezone.utc).timetuple().tm_yday
    tip_index = day_of_year % len(tips)
    return tips[tip_index]

# ============================================
# Seed Data Endpoint (Admin only)
# ============================================

@router.post("/seed")
async def seed_config_data():
    """Seed all configuration data to MongoDB (Admin only)"""
    from data.clinic_config import (
        CLINICS_DATA, DOCTORS_DATA, FEE_CODES_DATA, 
        SERVICES_DATA, CERTIFICATIONS_DATA, TESTIMONIALS_DATA, HEALTH_TIPS_DATA
    )
    
    results = {}
    
    # Seed clinics
    if CLINICS_DATA.get("clinics"):
        await db.clinics.delete_many({})
        await db.clinics.insert_many(CLINICS_DATA["clinics"])
        results["clinics"] = len(CLINICS_DATA["clinics"])
    
    # Seed doctors
    if DOCTORS_DATA.get("doctors"):
        await db.doctors.delete_many({})
        await db.doctors.insert_many(DOCTORS_DATA["doctors"])
        results["doctors"] = len(DOCTORS_DATA["doctors"])
    
    # Seed fee codes
    fee_codes = []
    for fee in FEE_CODES_DATA.get("consultation_fees", []):
        fee["type"] = "consultation"
        fee_codes.append(fee)
    for fee in FEE_CODES_DATA.get("scan_fees", []):
        fee["type"] = "scan"
        fee_codes.append(fee)
    if fee_codes:
        await db.fee_codes.delete_many({})
        await db.fee_codes.insert_many(fee_codes)
        results["fee_codes"] = len(fee_codes)
    
    # Seed services
    if SERVICES_DATA.get("services"):
        await db.services.delete_many({})
        await db.services.insert_many(SERVICES_DATA["services"])
        results["services"] = len(SERVICES_DATA["services"])
    
    # Seed certifications
    if CERTIFICATIONS_DATA.get("certifications"):
        await db.certifications.delete_many({})
        await db.certifications.insert_many(CERTIFICATIONS_DATA["certifications"])
        results["certifications"] = len(CERTIFICATIONS_DATA["certifications"])
    
    # Seed testimonials
    if TESTIMONIALS_DATA.get("testimonials"):
        await db.testimonials.delete_many({})
        await db.testimonials.insert_many(TESTIMONIALS_DATA["testimonials"])
        results["testimonials"] = len(TESTIMONIALS_DATA["testimonials"])
    
    # Seed health tips
    if HEALTH_TIPS_DATA.get("health_tips"):
        await db.health_tips.delete_many({})
        await db.health_tips.insert_many(HEALTH_TIPS_DATA["health_tips"])
        results["health_tips"] = len(HEALTH_TIPS_DATA["health_tips"])
    
    return {"success": True, "seeded": results}
