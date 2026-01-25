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

# ============================================
# ADMIN CRUD Endpoints
# ============================================

# --- Clinics CRUD ---
@router.post("/admin/clinics")
async def create_clinic(clinic: dict, admin: dict = Depends(verify_admin)):
    """Create a new clinic"""
    clinic["created_at"] = datetime.now(timezone.utc).isoformat()
    clinic["created_by"] = admin.get("username", "admin")
    await db.clinics.insert_one(clinic)
    return {"success": True, "message": "Clinic created"}

@router.put("/admin/clinics/{clinic_id}")
async def update_clinic(clinic_id: str, clinic: dict, admin: dict = Depends(verify_admin)):
    """Update a clinic"""
    clinic["updated_at"] = datetime.now(timezone.utc).isoformat()
    clinic["updated_by"] = admin.get("username", "admin")
    result = await db.clinics.update_one({"id": clinic_id}, {"$set": clinic})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Clinic not found")
    return {"success": True, "message": "Clinic updated"}

@router.delete("/admin/clinics/{clinic_id}")
async def delete_clinic(clinic_id: str, admin: dict = Depends(verify_admin)):
    """Delete a clinic (soft delete)"""
    result = await db.clinics.update_one({"id": clinic_id}, {"$set": {"active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Clinic not found")
    return {"success": True, "message": "Clinic deleted"}

# --- Doctors CRUD ---
@router.post("/admin/doctors")
async def create_doctor(doctor: dict, admin: dict = Depends(verify_admin)):
    """Create a new doctor"""
    doctor["created_at"] = datetime.now(timezone.utc).isoformat()
    doctor["created_by"] = admin.get("username", "admin")
    await db.doctors.insert_one(doctor)
    return {"success": True, "message": "Doctor created"}

@router.put("/admin/doctors/{doctor_id}")
async def update_doctor(doctor_id: str, doctor: dict, admin: dict = Depends(verify_admin)):
    """Update a doctor"""
    doctor["updated_at"] = datetime.now(timezone.utc).isoformat()
    doctor["updated_by"] = admin.get("username", "admin")
    result = await db.doctors.update_one({"id": doctor_id}, {"$set": doctor})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return {"success": True, "message": "Doctor updated"}

@router.delete("/admin/doctors/{doctor_id}")
async def delete_doctor(doctor_id: str, admin: dict = Depends(verify_admin)):
    """Delete a doctor (soft delete)"""
    result = await db.doctors.update_one({"id": doctor_id}, {"$set": {"active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return {"success": True, "message": "Doctor deleted"}

# --- Fee Codes CRUD ---
@router.post("/admin/fees")
async def create_fee_code(fee: dict, admin: dict = Depends(verify_admin)):
    """Create a new fee code"""
    fee["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.fee_codes.insert_one(fee)
    return {"success": True, "message": "Fee code created"}

@router.put("/admin/fees/{fee_code}")
async def update_fee_code(fee_code: str, fee: dict, admin: dict = Depends(verify_admin)):
    """Update a fee code"""
    fee["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.fee_codes.update_one({"code": fee_code}, {"$set": fee})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Fee code not found")
    return {"success": True, "message": "Fee code updated"}

@router.delete("/admin/fees/{fee_code}")
async def delete_fee_code(fee_code: str, admin: dict = Depends(verify_admin)):
    """Delete a fee code"""
    result = await db.fee_codes.delete_one({"code": fee_code})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fee code not found")
    return {"success": True, "message": "Fee code deleted"}

# --- Services CRUD ---
@router.post("/admin/services")
async def create_service(service: dict, admin: dict = Depends(verify_admin)):
    """Create a new service"""
    service["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.services.insert_one(service)
    return {"success": True, "message": "Service created"}

@router.put("/admin/services/{service_id}")
async def update_service(service_id: str, service: dict, admin: dict = Depends(verify_admin)):
    """Update a service"""
    service["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.services.update_one({"id": service_id}, {"$set": service})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"success": True, "message": "Service updated"}

@router.delete("/admin/services/{service_id}")
async def delete_service(service_id: str, admin: dict = Depends(verify_admin)):
    """Delete a service (soft delete)"""
    result = await db.services.update_one({"id": service_id}, {"$set": {"active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"success": True, "message": "Service deleted"}

# --- Testimonials CRUD ---
@router.post("/admin/testimonials")
async def create_testimonial(testimonial: dict, admin: dict = Depends(verify_admin)):
    """Create a new testimonial"""
    # Auto-generate ID
    count = await db.testimonials.count_documents({})
    testimonial["id"] = count + 1
    testimonial["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.testimonials.insert_one(testimonial)
    return {"success": True, "message": "Testimonial created", "id": testimonial["id"]}

@router.put("/admin/testimonials/{testimonial_id}")
async def update_testimonial(testimonial_id: int, testimonial: dict, admin: dict = Depends(verify_admin)):
    """Update a testimonial"""
    testimonial["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.testimonials.update_one({"id": testimonial_id}, {"$set": testimonial})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    return {"success": True, "message": "Testimonial updated"}

@router.delete("/admin/testimonials/{testimonial_id}")
async def delete_testimonial(testimonial_id: int, admin: dict = Depends(verify_admin)):
    """Delete a testimonial (soft delete)"""
    result = await db.testimonials.update_one({"id": testimonial_id}, {"$set": {"active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    return {"success": True, "message": "Testimonial deleted"}

# --- Health Tips CRUD ---
@router.post("/admin/health-tips")
async def create_health_tip(tip: dict, admin: dict = Depends(verify_admin)):
    """Create a new health tip"""
    tip["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.health_tips.insert_one(tip)
    return {"success": True, "message": "Health tip created"}

@router.put("/admin/health-tips/{tip_index}")
async def update_health_tip(tip_index: int, tip: dict, admin: dict = Depends(verify_admin)):
    """Update a health tip by index"""
    tips = await db.health_tips.find({}, {"_id": 0}).to_list(100)
    if tip_index >= len(tips):
        raise HTTPException(status_code=404, detail="Health tip not found")
    
    old_tip = tips[tip_index]
    tip["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.health_tips.update_one({"tip": old_tip["tip"]}, {"$set": tip})
    return {"success": True, "message": "Health tip updated"}

@router.delete("/admin/health-tips/{tip_index}")
async def delete_health_tip(tip_index: int, admin: dict = Depends(verify_admin)):
    """Delete a health tip by index"""
    tips = await db.health_tips.find({}, {"_id": 0}).to_list(100)
    if tip_index >= len(tips):
        raise HTTPException(status_code=404, detail="Health tip not found")
    
    old_tip = tips[tip_index]
    await db.health_tips.delete_one({"tip": old_tip["tip"]})
    return {"success": True, "message": "Health tip deleted"}

# --- Certifications CRUD ---
@router.post("/admin/certifications")
async def create_certification(cert: dict, admin: dict = Depends(verify_admin)):
    """Create a new certification"""
    cert["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.certifications.insert_one(cert)
    return {"success": True, "message": "Certification created"}

@router.put("/admin/certifications/{cert_name}")
async def update_certification(cert_name: str, cert: dict, admin: dict = Depends(verify_admin)):
    """Update a certification"""
    cert["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.certifications.update_one({"name": cert_name}, {"$set": cert})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Certification not found")
    return {"success": True, "message": "Certification updated"}

@router.delete("/admin/certifications/{cert_name}")
async def delete_certification(cert_name: str, admin: dict = Depends(verify_admin)):
    """Delete a certification"""
    result = await db.certifications.delete_one({"name": cert_name})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Certification not found")
    return {"success": True, "message": "Certification deleted"}

