"""
ALYNE - Kids Health & Care Module
Backend routes for child health management
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, date
from bson import ObjectId
import uuid
import base64
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/alyne", tags=["ALYNE - Kids Health"])

# Database will be injected from server.py
db = None

def set_db(database):
    global db
    db = database

# ============ MODELS ============

class ChildProfile(BaseModel):
    name: str
    date_of_birth: str  # YYYY-MM-DD
    gender: str  # male, female, other
    blood_group: Optional[str] = None
    region: str = "india"  # "india" or "usa"
    # India specific
    aadhaar_number: Optional[str] = None
    uhid: Optional[str] = None
    # USA specific
    insurance_provider: Optional[str] = None
    insurance_id: Optional[str] = None
    # Optional
    allergies: Optional[List[str]] = []
    medical_conditions: Optional[List[str]] = []
    photo_url: Optional[str] = None

class ChildProfileUpdate(BaseModel):
    name: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    region: Optional[str] = None
    aadhaar_number: Optional[str] = None
    uhid: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_id: Optional[str] = None
    allergies: Optional[List[str]] = None
    medical_conditions: Optional[List[str]] = None
    photo_url: Optional[str] = None

class VaccinationRecord(BaseModel):
    vaccine_name: str
    scheduled_date: str  # YYYY-MM-DD
    status: str = "due"  # due, done, overdue, skipped
    administered_date: Optional[str] = None
    administered_by: Optional[str] = None
    batch_number: Optional[str] = None
    notes: Optional[str] = None

class GrowthRecord(BaseModel):
    date: str  # YYYY-MM-DD
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    head_circumference_cm: Optional[float] = None
    notes: Optional[str] = None

class HealthLogEntry(BaseModel):
    date: str
    type: str  # symptom, doctor_visit, medication, note
    title: str
    description: Optional[str] = None
    doctor_name: Optional[str] = None
    medications: Optional[List[str]] = None

class Document(BaseModel):
    name: str
    type: str  # immunization_record, medical_report, school_form, prescription, other
    file_data: str  # Base64 encoded
    file_type: str  # pdf, jpg, png

class Reminder(BaseModel):
    child_id: str
    type: str  # vaccination, medication, appointment, checkup
    title: str
    description: Optional[str] = None
    due_date: str  # YYYY-MM-DD
    due_time: Optional[str] = None  # HH:MM
    repeat: Optional[str] = None  # daily, weekly, monthly, none
    enabled: bool = True

# ============ VACCINATION SCHEDULES ============

# India IAP (Indian Academy of Pediatrics) Schedule
INDIA_VACCINATION_SCHEDULE = [
    # Birth
    {"vaccine": "BCG", "age_weeks": 0, "dose": "Single", "description": "Bacillus Calmette-Guérin for Tuberculosis"},
    {"vaccine": "OPV-0", "age_weeks": 0, "dose": "Zero", "description": "Oral Polio Vaccine - Birth dose"},
    {"vaccine": "Hepatitis B-1", "age_weeks": 0, "dose": "1st", "description": "Hepatitis B - Birth dose"},
    # 6 weeks
    {"vaccine": "DTwP/DTaP-1", "age_weeks": 6, "dose": "1st", "description": "Diphtheria, Tetanus, Pertussis"},
    {"vaccine": "IPV-1", "age_weeks": 6, "dose": "1st", "description": "Inactivated Polio Vaccine"},
    {"vaccine": "Hib-1", "age_weeks": 6, "dose": "1st", "description": "Haemophilus influenzae type b"},
    {"vaccine": "Rotavirus-1", "age_weeks": 6, "dose": "1st", "description": "Rotavirus"},
    {"vaccine": "PCV-1", "age_weeks": 6, "dose": "1st", "description": "Pneumococcal Conjugate Vaccine"},
    {"vaccine": "Hepatitis B-2", "age_weeks": 6, "dose": "2nd", "description": "Hepatitis B"},
    # 10 weeks
    {"vaccine": "DTwP/DTaP-2", "age_weeks": 10, "dose": "2nd", "description": "Diphtheria, Tetanus, Pertussis"},
    {"vaccine": "IPV-2", "age_weeks": 10, "dose": "2nd", "description": "Inactivated Polio Vaccine"},
    {"vaccine": "Hib-2", "age_weeks": 10, "dose": "2nd", "description": "Haemophilus influenzae type b"},
    {"vaccine": "Rotavirus-2", "age_weeks": 10, "dose": "2nd", "description": "Rotavirus"},
    {"vaccine": "PCV-2", "age_weeks": 10, "dose": "2nd", "description": "Pneumococcal Conjugate Vaccine"},
    # 14 weeks
    {"vaccine": "DTwP/DTaP-3", "age_weeks": 14, "dose": "3rd", "description": "Diphtheria, Tetanus, Pertussis"},
    {"vaccine": "IPV-3", "age_weeks": 14, "dose": "3rd", "description": "Inactivated Polio Vaccine"},
    {"vaccine": "Hib-3", "age_weeks": 14, "dose": "3rd", "description": "Haemophilus influenzae type b"},
    {"vaccine": "Rotavirus-3", "age_weeks": 14, "dose": "3rd", "description": "Rotavirus"},
    {"vaccine": "PCV-3", "age_weeks": 14, "dose": "3rd", "description": "Pneumococcal Conjugate Vaccine"},
    {"vaccine": "Hepatitis B-3", "age_weeks": 14, "dose": "3rd", "description": "Hepatitis B"},
    # 6 months
    {"vaccine": "OPV-1", "age_weeks": 26, "dose": "1st", "description": "Oral Polio Vaccine"},
    {"vaccine": "Influenza-1", "age_weeks": 26, "dose": "1st", "description": "Influenza (Flu)"},
    # 9 months
    {"vaccine": "OPV-2", "age_weeks": 39, "dose": "2nd", "description": "Oral Polio Vaccine"},
    {"vaccine": "MMR-1", "age_weeks": 39, "dose": "1st", "description": "Measles, Mumps, Rubella"},
    # 12 months
    {"vaccine": "Hepatitis A-1", "age_weeks": 52, "dose": "1st", "description": "Hepatitis A"},
    {"vaccine": "Japanese Encephalitis-1", "age_weeks": 52, "dose": "1st", "description": "Japanese Encephalitis"},
    # 15 months
    {"vaccine": "MMR-2", "age_weeks": 65, "dose": "2nd", "description": "Measles, Mumps, Rubella"},
    {"vaccine": "Varicella-1", "age_weeks": 65, "dose": "1st", "description": "Chickenpox"},
    {"vaccine": "PCV Booster", "age_weeks": 65, "dose": "Booster", "description": "Pneumococcal Conjugate Vaccine"},
    # 16-18 months
    {"vaccine": "DTwP/DTaP Booster-1", "age_weeks": 72, "dose": "Booster 1", "description": "Diphtheria, Tetanus, Pertussis"},
    {"vaccine": "IPV Booster", "age_weeks": 72, "dose": "Booster", "description": "Inactivated Polio Vaccine"},
    {"vaccine": "Hib Booster", "age_weeks": 72, "dose": "Booster", "description": "Haemophilus influenzae type b"},
    {"vaccine": "Hepatitis A-2", "age_weeks": 78, "dose": "2nd", "description": "Hepatitis A"},
    # 2 years
    {"vaccine": "Typhoid Conjugate", "age_weeks": 104, "dose": "Single", "description": "Typhoid Fever"},
    {"vaccine": "Japanese Encephalitis-2", "age_weeks": 104, "dose": "2nd", "description": "Japanese Encephalitis"},
    # 4-6 years
    {"vaccine": "DTwP/DTaP Booster-2", "age_weeks": 260, "dose": "Booster 2", "description": "Diphtheria, Tetanus, Pertussis"},
    {"vaccine": "OPV-3", "age_weeks": 260, "dose": "3rd", "description": "Oral Polio Vaccine"},
    {"vaccine": "Varicella-2", "age_weeks": 260, "dose": "2nd", "description": "Chickenpox"},
    # 10-12 years
    {"vaccine": "Tdap", "age_weeks": 520, "dose": "Single", "description": "Tetanus, Diphtheria, Pertussis (Adult)"},
    {"vaccine": "HPV-1", "age_weeks": 520, "dose": "1st", "description": "Human Papillomavirus"},
    {"vaccine": "HPV-2", "age_weeks": 546, "dose": "2nd", "description": "Human Papillomavirus"},
]

# USA CDC Schedule
USA_VACCINATION_SCHEDULE = [
    # Birth
    {"vaccine": "Hepatitis B-1", "age_weeks": 0, "dose": "1st", "description": "Hepatitis B - Birth dose"},
    # 2 months
    {"vaccine": "DTaP-1", "age_weeks": 8, "dose": "1st", "description": "Diphtheria, Tetanus, Pertussis"},
    {"vaccine": "IPV-1", "age_weeks": 8, "dose": "1st", "description": "Inactivated Polio Vaccine"},
    {"vaccine": "Hib-1", "age_weeks": 8, "dose": "1st", "description": "Haemophilus influenzae type b"},
    {"vaccine": "PCV13-1", "age_weeks": 8, "dose": "1st", "description": "Pneumococcal Conjugate Vaccine"},
    {"vaccine": "Rotavirus-1", "age_weeks": 8, "dose": "1st", "description": "Rotavirus"},
    {"vaccine": "Hepatitis B-2", "age_weeks": 8, "dose": "2nd", "description": "Hepatitis B"},
    # 4 months
    {"vaccine": "DTaP-2", "age_weeks": 16, "dose": "2nd", "description": "Diphtheria, Tetanus, Pertussis"},
    {"vaccine": "IPV-2", "age_weeks": 16, "dose": "2nd", "description": "Inactivated Polio Vaccine"},
    {"vaccine": "Hib-2", "age_weeks": 16, "dose": "2nd", "description": "Haemophilus influenzae type b"},
    {"vaccine": "PCV13-2", "age_weeks": 16, "dose": "2nd", "description": "Pneumococcal Conjugate Vaccine"},
    {"vaccine": "Rotavirus-2", "age_weeks": 16, "dose": "2nd", "description": "Rotavirus"},
    # 6 months
    {"vaccine": "DTaP-3", "age_weeks": 26, "dose": "3rd", "description": "Diphtheria, Tetanus, Pertussis"},
    {"vaccine": "IPV-3", "age_weeks": 26, "dose": "3rd", "description": "Inactivated Polio Vaccine"},
    {"vaccine": "Hib-3", "age_weeks": 26, "dose": "3rd", "description": "Haemophilus influenzae type b"},
    {"vaccine": "PCV13-3", "age_weeks": 26, "dose": "3rd", "description": "Pneumococcal Conjugate Vaccine"},
    {"vaccine": "Rotavirus-3", "age_weeks": 26, "dose": "3rd", "description": "Rotavirus (if needed)"},
    {"vaccine": "Hepatitis B-3", "age_weeks": 26, "dose": "3rd", "description": "Hepatitis B"},
    {"vaccine": "Influenza-Annual", "age_weeks": 26, "dose": "Annual", "description": "Influenza (yearly from 6 months)"},
    # 12-15 months
    {"vaccine": "MMR-1", "age_weeks": 52, "dose": "1st", "description": "Measles, Mumps, Rubella"},
    {"vaccine": "Varicella-1", "age_weeks": 52, "dose": "1st", "description": "Chickenpox"},
    {"vaccine": "Hepatitis A-1", "age_weeks": 52, "dose": "1st", "description": "Hepatitis A"},
    {"vaccine": "PCV13-4", "age_weeks": 52, "dose": "4th", "description": "Pneumococcal Conjugate Vaccine"},
    {"vaccine": "Hib-4", "age_weeks": 52, "dose": "4th", "description": "Haemophilus influenzae type b"},
    # 15-18 months
    {"vaccine": "DTaP-4", "age_weeks": 65, "dose": "4th", "description": "Diphtheria, Tetanus, Pertussis"},
    {"vaccine": "Hepatitis A-2", "age_weeks": 78, "dose": "2nd", "description": "Hepatitis A"},
    # 4-6 years
    {"vaccine": "DTaP-5", "age_weeks": 260, "dose": "5th", "description": "Diphtheria, Tetanus, Pertussis"},
    {"vaccine": "IPV-4", "age_weeks": 260, "dose": "4th", "description": "Inactivated Polio Vaccine"},
    {"vaccine": "MMR-2", "age_weeks": 260, "dose": "2nd", "description": "Measles, Mumps, Rubella"},
    {"vaccine": "Varicella-2", "age_weeks": 260, "dose": "2nd", "description": "Chickenpox"},
    # 11-12 years
    {"vaccine": "Tdap", "age_weeks": 572, "dose": "Single", "description": "Tetanus, Diphtheria, Pertussis"},
    {"vaccine": "HPV-1", "age_weeks": 572, "dose": "1st", "description": "Human Papillomavirus"},
    {"vaccine": "HPV-2", "age_weeks": 598, "dose": "2nd", "description": "Human Papillomavirus"},
    {"vaccine": "MenACWY-1", "age_weeks": 572, "dose": "1st", "description": "Meningococcal Conjugate"},
    # 16 years
    {"vaccine": "MenACWY-2", "age_weeks": 832, "dose": "2nd", "description": "Meningococcal Conjugate Booster"},
]

# WHO Growth Standards (simplified percentiles)
WHO_GROWTH_BOYS = {
    "height": {  # in cm by age in months
        0: {"p3": 46.1, "p15": 48.0, "p50": 49.9, "p85": 51.8, "p97": 53.7},
        3: {"p3": 57.3, "p15": 59.4, "p50": 61.4, "p85": 63.5, "p97": 65.5},
        6: {"p3": 63.3, "p15": 65.5, "p50": 67.6, "p85": 69.8, "p97": 71.9},
        12: {"p3": 71.0, "p15": 73.4, "p50": 75.7, "p85": 78.1, "p97": 80.5},
        24: {"p3": 81.7, "p15": 84.5, "p50": 87.1, "p85": 89.8, "p97": 92.4},
        36: {"p3": 89.4, "p15": 92.5, "p50": 95.4, "p85": 98.4, "p97": 101.4},
        48: {"p3": 96.1, "p15": 99.5, "p50": 102.7, "p85": 106.0, "p97": 109.3},
        60: {"p3": 102.2, "p15": 105.8, "p50": 109.2, "p85": 112.7, "p97": 116.2},
    },
    "weight": {  # in kg by age in months
        0: {"p3": 2.5, "p15": 2.9, "p50": 3.3, "p85": 3.9, "p97": 4.4},
        3: {"p3": 5.0, "p15": 5.6, "p50": 6.4, "p85": 7.2, "p97": 8.0},
        6: {"p3": 6.4, "p15": 7.1, "p50": 7.9, "p85": 8.8, "p97": 9.7},
        12: {"p3": 7.8, "p15": 8.6, "p50": 9.6, "p85": 10.8, "p97": 12.0},
        24: {"p3": 9.8, "p15": 10.8, "p50": 12.2, "p85": 13.7, "p97": 15.3},
        36: {"p3": 11.3, "p15": 12.5, "p50": 14.0, "p85": 15.9, "p97": 18.0},
        48: {"p3": 12.7, "p15": 14.1, "p50": 15.9, "p85": 18.2, "p97": 20.9},
        60: {"p3": 14.1, "p15": 15.7, "p50": 17.8, "p85": 20.5, "p97": 23.8},
    }
}

WHO_GROWTH_GIRLS = {
    "height": {
        0: {"p3": 45.4, "p15": 47.2, "p50": 49.1, "p85": 51.0, "p97": 52.9},
        3: {"p3": 55.6, "p15": 57.7, "p50": 59.8, "p85": 61.9, "p97": 64.0},
        6: {"p3": 61.2, "p15": 63.5, "p50": 65.7, "p85": 68.0, "p97": 70.3},
        12: {"p3": 68.9, "p15": 71.4, "p50": 74.0, "p85": 76.6, "p97": 79.2},
        24: {"p3": 80.0, "p15": 83.0, "p50": 86.0, "p85": 89.1, "p97": 92.1},
        36: {"p3": 88.2, "p15": 91.4, "p50": 94.5, "p85": 97.6, "p97": 100.7},
        48: {"p3": 95.1, "p15": 98.5, "p50": 101.8, "p85": 105.2, "p97": 108.6},
        60: {"p3": 101.4, "p15": 105.0, "p50": 108.5, "p85": 112.1, "p97": 115.7},
    },
    "weight": {
        0: {"p3": 2.4, "p15": 2.8, "p50": 3.2, "p85": 3.7, "p97": 4.2},
        3: {"p3": 4.5, "p15": 5.1, "p50": 5.8, "p85": 6.6, "p97": 7.5},
        6: {"p3": 5.8, "p15": 6.5, "p50": 7.3, "p85": 8.2, "p97": 9.3},
        12: {"p3": 7.0, "p15": 7.9, "p50": 8.9, "p85": 10.1, "p97": 11.5},
        24: {"p3": 9.0, "p15": 10.1, "p50": 11.5, "p85": 13.2, "p97": 15.1},
        36: {"p3": 10.6, "p15": 11.9, "p50": 13.5, "p85": 15.5, "p97": 18.1},
        48: {"p3": 12.0, "p15": 13.5, "p50": 15.4, "p85": 17.9, "p97": 21.0},
        60: {"p3": 13.5, "p15": 15.2, "p50": 17.4, "p85": 20.3, "p97": 24.1},
    }
}

# ============ HELPER FUNCTIONS ============

def calculate_age_weeks(date_of_birth: str) -> int:
    """Calculate age in weeks from date of birth"""
    dob = datetime.strptime(date_of_birth, "%Y-%m-%d")
    today = datetime.now()
    delta = today - dob
    return delta.days // 7

def calculate_age_months(date_of_birth: str) -> int:
    """Calculate age in months from date of birth"""
    dob = datetime.strptime(date_of_birth, "%Y-%m-%d")
    today = datetime.now()
    return (today.year - dob.year) * 12 + (today.month - dob.month)

def generate_vaccination_schedule(date_of_birth: str, region: str) -> List[dict]:
    """Generate vaccination schedule based on DOB and region"""
    dob = datetime.strptime(date_of_birth, "%Y-%m-%d")
    schedule = INDIA_VACCINATION_SCHEDULE if region == "india" else USA_VACCINATION_SCHEDULE
    current_weeks = calculate_age_weeks(date_of_birth)
    
    vaccinations = []
    for vax in schedule:
        scheduled_date = dob + timedelta(weeks=vax["age_weeks"])
        status = "due"
        if vax["age_weeks"] < current_weeks - 4:  # More than 4 weeks overdue
            status = "overdue"
        elif vax["age_weeks"] < current_weeks:
            status = "due"
        else:
            status = "upcoming"
        
        vaccinations.append({
            "id": f"vax_{uuid.uuid4().hex[:8]}",
            "vaccine_name": vax["vaccine"],
            "dose": vax["dose"],
            "description": vax["description"],
            "age_weeks": vax["age_weeks"],
            "scheduled_date": scheduled_date.strftime("%Y-%m-%d"),
            "status": status,
            "administered_date": None,
            "batch_number": None,
            "notes": None
        })
    
    return vaccinations

def get_growth_percentile(gender: str, age_months: int, measurement_type: str, value: float) -> dict:
    """Get growth percentile based on WHO standards"""
    standards = WHO_GROWTH_BOYS if gender == "male" else WHO_GROWTH_GIRLS
    data = standards.get(measurement_type, {})
    
    # Find closest age bracket
    ages = sorted(data.keys())
    closest_age = min(ages, key=lambda x: abs(x - age_months))
    percentiles = data.get(closest_age, {})
    
    if not percentiles:
        return {"percentile": None, "status": "unknown"}
    
    # Determine percentile range
    if value <= percentiles["p3"]:
        return {"percentile": "<3", "status": "below_normal", "color": "red"}
    elif value <= percentiles["p15"]:
        return {"percentile": "3-15", "status": "low_normal", "color": "yellow"}
    elif value <= percentiles["p50"]:
        return {"percentile": "15-50", "status": "normal", "color": "green"}
    elif value <= percentiles["p85"]:
        return {"percentile": "50-85", "status": "normal", "color": "green"}
    elif value <= percentiles["p97"]:
        return {"percentile": "85-97", "status": "high_normal", "color": "yellow"}
    else:
        return {"percentile": ">97", "status": "above_normal", "color": "red"}

# Import timedelta
from datetime import timedelta

# ============ ENDPOINTS ============

# ----- Child Profiles -----

@router.post("/children")
async def create_child_profile(profile: ChildProfile, user_id: str):
    """Create a new child profile"""
    child_id = f"child_{uuid.uuid4().hex[:12]}"
    
    child_doc = {
        "id": child_id,
        "user_id": user_id,  # Parent's user ID
        **profile.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.alyne_children.insert_one(child_doc)
    
    # Auto-generate vaccination schedule
    vaccinations = generate_vaccination_schedule(profile.date_of_birth, profile.region)
    for vax in vaccinations:
        vax["child_id"] = child_id
        await db.alyne_vaccinations.insert_one(vax)
    
    logger.info(f"Created child profile: {child_id} with {len(vaccinations)} vaccinations")
    
    # Remove _id from response
    child_doc.pop("_id", None)
    return {"success": True, "child": child_doc, "vaccinations_count": len(vaccinations)}

@router.get("/children/{user_id}")
async def get_children(user_id: str):
    """Get all children for a parent"""
    children = await db.alyne_children.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(length=20)
    
    # Add age calculation for each child
    for child in children:
        age_months = calculate_age_months(child["date_of_birth"])
        child["age_months"] = age_months
        child["age_display"] = f"{age_months // 12}y {age_months % 12}m" if age_months >= 12 else f"{age_months}m"
    
    return {"children": children}

@router.get("/child/{child_id}")
async def get_child(child_id: str):
    """Get a specific child's profile"""
    child = await db.alyne_children.find_one({"id": child_id}, {"_id": 0})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    age_months = calculate_age_months(child["date_of_birth"])
    child["age_months"] = age_months
    child["age_display"] = f"{age_months // 12}y {age_months % 12}m" if age_months >= 12 else f"{age_months}m"
    
    return {"child": child}

@router.put("/child/{child_id}")
async def update_child_profile(child_id: str, update: ChildProfileUpdate):
    """Update a child's profile"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.alyne_children.update_one(
        {"id": child_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Child not found")
    
    return {"success": True, "message": "Profile updated"}

@router.delete("/child/{child_id}")
async def delete_child_profile(child_id: str):
    """Delete a child's profile and all related data"""
    # Delete child
    result = await db.alyne_children.delete_one({"id": child_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Child not found")
    
    # Delete related data
    await db.alyne_vaccinations.delete_many({"child_id": child_id})
    await db.alyne_growth.delete_many({"child_id": child_id})
    await db.alyne_health_log.delete_many({"child_id": child_id})
    await db.alyne_documents.delete_many({"child_id": child_id})
    await db.alyne_reminders.delete_many({"child_id": child_id})
    
    return {"success": True, "message": "Child profile and all related data deleted"}

# ----- Vaccinations -----

@router.get("/vaccinations/{child_id}")
async def get_vaccinations(child_id: str, status: Optional[str] = None):
    """Get vaccination records for a child"""
    query = {"child_id": child_id}
    if status:
        query["status"] = status
    
    vaccinations = await db.alyne_vaccinations.find(
        query,
        {"_id": 0}
    ).sort("scheduled_date", 1).to_list(length=100)
    
    # Group by status
    stats = {
        "done": len([v for v in vaccinations if v["status"] == "done"]),
        "due": len([v for v in vaccinations if v["status"] == "due"]),
        "overdue": len([v for v in vaccinations if v["status"] == "overdue"]),
        "upcoming": len([v for v in vaccinations if v["status"] == "upcoming"]),
        "total": len(vaccinations)
    }
    
    return {"vaccinations": vaccinations, "stats": stats}

@router.put("/vaccinations/{vaccination_id}")
async def update_vaccination(vaccination_id: str, status: str, administered_date: Optional[str] = None, batch_number: Optional[str] = None, notes: Optional[str] = None):
    """Update a vaccination record"""
    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if administered_date:
        update_data["administered_date"] = administered_date
    if batch_number:
        update_data["batch_number"] = batch_number
    if notes:
        update_data["notes"] = notes
    
    result = await db.alyne_vaccinations.update_one(
        {"id": vaccination_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vaccination not found")
    
    return {"success": True, "message": "Vaccination updated"}

@router.get("/vaccinations/{child_id}/schedule")
async def get_vaccination_schedule(child_id: str):
    """Get upcoming vaccination schedule"""
    child = await db.alyne_children.find_one({"id": child_id}, {"_id": 0})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    # Get due and upcoming vaccinations
    vaccinations = await db.alyne_vaccinations.find(
        {"child_id": child_id, "status": {"$in": ["due", "overdue", "upcoming"]}},
        {"_id": 0}
    ).sort("scheduled_date", 1).to_list(length=50)
    
    return {
        "child_name": child["name"],
        "region": child["region"],
        "schedule": vaccinations
    }

# ----- Growth Tracking -----

@router.post("/growth/{child_id}")
async def add_growth_record(child_id: str, record: GrowthRecord):
    """Add a growth measurement record"""
    child = await db.alyne_children.find_one({"id": child_id}, {"_id": 0})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    age_months = calculate_age_months(child["date_of_birth"])
    
    growth_doc = {
        "id": f"growth_{uuid.uuid4().hex[:8]}",
        "child_id": child_id,
        **record.model_dump(),
        "age_months": age_months,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Calculate percentiles
    if record.height_cm:
        growth_doc["height_percentile"] = get_growth_percentile(
            child["gender"], age_months, "height", record.height_cm
        )
    if record.weight_kg:
        growth_doc["weight_percentile"] = get_growth_percentile(
            child["gender"], age_months, "weight", record.weight_kg
        )
    
    await db.alyne_growth.insert_one(growth_doc)
    growth_doc.pop("_id", None)
    
    return {"success": True, "record": growth_doc}

@router.get("/growth/{child_id}")
async def get_growth_records(child_id: str):
    """Get growth records for a child"""
    records = await db.alyne_growth.find(
        {"child_id": child_id},
        {"_id": 0}
    ).sort("date", -1).to_list(length=100)
    
    # Get child for percentile reference
    child = await db.alyne_children.find_one({"id": child_id}, {"_id": 0})
    
    return {
        "records": records,
        "child_gender": child["gender"] if child else None
    }

@router.get("/growth/{child_id}/chart")
async def get_growth_chart_data(child_id: str):
    """Get growth data formatted for charts"""
    child = await db.alyne_children.find_one({"id": child_id}, {"_id": 0})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    records = await db.alyne_growth.find(
        {"child_id": child_id},
        {"_id": 0}
    ).sort("date", 1).to_list(length=100)
    
    # Get WHO reference data
    standards = WHO_GROWTH_BOYS if child["gender"] == "male" else WHO_GROWTH_GIRLS
    
    return {
        "records": records,
        "who_standards": standards,
        "child_gender": child["gender"]
    }

# ----- Health Log -----

@router.post("/health-log/{child_id}")
async def add_health_log_entry(child_id: str, entry: HealthLogEntry):
    """Add a health log entry"""
    log_doc = {
        "id": f"log_{uuid.uuid4().hex[:8]}",
        "child_id": child_id,
        **entry.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.alyne_health_log.insert_one(log_doc)
    log_doc.pop("_id", None)
    
    return {"success": True, "entry": log_doc}

@router.get("/health-log/{child_id}")
async def get_health_log(child_id: str, type: Optional[str] = None):
    """Get health log entries for a child"""
    query = {"child_id": child_id}
    if type:
        query["type"] = type
    
    entries = await db.alyne_health_log.find(
        query,
        {"_id": 0}
    ).sort("date", -1).to_list(length=100)
    
    return {"entries": entries}

@router.delete("/health-log/{entry_id}")
async def delete_health_log_entry(entry_id: str):
    """Delete a health log entry"""
    result = await db.alyne_health_log.delete_one({"id": entry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    return {"success": True, "message": "Entry deleted"}

# ----- Documents -----

@router.post("/documents/{child_id}")
async def upload_document(child_id: str, document: Document):
    """Upload a document for a child"""
    doc = {
        "id": f"doc_{uuid.uuid4().hex[:8]}",
        "child_id": child_id,
        "name": document.name,
        "type": document.type,
        "file_data": document.file_data,
        "file_type": document.file_type,
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.alyne_documents.insert_one(doc)
    
    # Return without file_data for efficiency
    return {
        "success": True,
        "document": {
            "id": doc["id"],
            "name": doc["name"],
            "type": doc["type"],
            "file_type": doc["file_type"],
            "uploaded_at": doc["uploaded_at"]
        }
    }

@router.get("/documents/{child_id}")
async def get_documents(child_id: str, type: Optional[str] = None):
    """Get documents list for a child (without file data)"""
    query = {"child_id": child_id}
    if type:
        query["type"] = type
    
    documents = await db.alyne_documents.find(
        query,
        {"_id": 0, "file_data": 0}  # Exclude file data for listing
    ).sort("uploaded_at", -1).to_list(length=100)
    
    return {"documents": documents}

@router.get("/documents/download/{document_id}")
async def download_document(document_id: str):
    """Get a specific document with file data"""
    doc = await db.alyne_documents.find_one({"id": document_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"document": doc}

@router.delete("/documents/{document_id}")
async def delete_document(document_id: str):
    """Delete a document"""
    result = await db.alyne_documents.delete_one({"id": document_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"success": True, "message": "Document deleted"}

# ----- Reminders -----

@router.post("/reminders")
async def create_reminder(reminder: Reminder):
    """Create a reminder for a child"""
    reminder_doc = {
        "id": f"rem_{uuid.uuid4().hex[:8]}",
        **reminder.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.alyne_reminders.insert_one(reminder_doc)
    reminder_doc.pop("_id", None)
    
    return {"success": True, "reminder": reminder_doc}

@router.get("/reminders/{child_id}")
async def get_reminders(child_id: str, enabled_only: bool = True):
    """Get reminders for a child"""
    query = {"child_id": child_id}
    if enabled_only:
        query["enabled"] = True
    
    reminders = await db.alyne_reminders.find(
        query,
        {"_id": 0}
    ).sort("due_date", 1).to_list(length=100)
    
    return {"reminders": reminders}

@router.put("/reminders/{reminder_id}")
async def update_reminder(reminder_id: str, enabled: Optional[bool] = None, due_date: Optional[str] = None, due_time: Optional[str] = None):
    """Update a reminder"""
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if enabled is not None:
        update_data["enabled"] = enabled
    if due_date:
        update_data["due_date"] = due_date
    if due_time:
        update_data["due_time"] = due_time
    
    result = await db.alyne_reminders.update_one(
        {"id": reminder_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    return {"success": True, "message": "Reminder updated"}

@router.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str):
    """Delete a reminder"""
    result = await db.alyne_reminders.delete_one({"id": reminder_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    return {"success": True, "message": "Reminder deleted"}

# ----- Dashboard Summary -----

@router.get("/dashboard/{child_id}")
async def get_child_dashboard(child_id: str):
    """Get dashboard summary for a child"""
    child = await db.alyne_children.find_one({"id": child_id}, {"_id": 0})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    # Calculate age
    age_months = calculate_age_months(child["date_of_birth"])
    child["age_months"] = age_months
    child["age_display"] = f"{age_months // 12}y {age_months % 12}m" if age_months >= 12 else f"{age_months}m"
    
    # Get vaccination stats
    vaccinations = await db.alyne_vaccinations.find(
        {"child_id": child_id},
        {"_id": 0, "status": 1}
    ).to_list(length=200)
    
    vax_stats = {
        "done": len([v for v in vaccinations if v["status"] == "done"]),
        "due": len([v for v in vaccinations if v["status"] == "due"]),
        "overdue": len([v for v in vaccinations if v["status"] == "overdue"]),
        "upcoming": len([v for v in vaccinations if v["status"] == "upcoming"]),
        "total": len(vaccinations)
    }
    
    # Get latest growth record
    latest_growth = await db.alyne_growth.find_one(
        {"child_id": child_id},
        {"_id": 0},
        sort=[("date", -1)]
    )
    
    # Get upcoming reminders (next 7 days)
    today = datetime.now().strftime("%Y-%m-%d")
    next_week = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
    upcoming_reminders = await db.alyne_reminders.find(
        {"child_id": child_id, "enabled": True, "due_date": {"$gte": today, "$lte": next_week}},
        {"_id": 0}
    ).sort("due_date", 1).to_list(length=10)
    
    # Get recent health log entries
    recent_logs = await db.alyne_health_log.find(
        {"child_id": child_id},
        {"_id": 0}
    ).sort("date", -1).to_list(length=5)
    
    # Get document count
    doc_count = await db.alyne_documents.count_documents({"child_id": child_id})
    
    return {
        "child": child,
        "vaccination_stats": vax_stats,
        "latest_growth": latest_growth,
        "upcoming_reminders": upcoming_reminders,
        "recent_health_logs": recent_logs,
        "document_count": doc_count
    }

# ----- Region Configuration -----

# India-specific resources
INDIA_RESOURCES = {
    "government_schemes": [
        {
            "id": "ayushman_bharat",
            "name": "Ayushman Bharat PM-JAY",
            "description": "Free health insurance up to ₹5 lakh per family per year",
            "eligibility": "SECC database beneficiaries",
            "website": "https://pmjay.gov.in",
            "helpline": "14555"
        },
        {
            "id": "icds",
            "name": "ICDS (Integrated Child Development Services)",
            "description": "Nutrition, health education, immunization for children 0-6 years",
            "eligibility": "All children under 6 years",
            "website": "https://icds-wcd.nic.in",
            "helpline": "1800-345-6789"
        },
        {
            "id": "jssk",
            "name": "Janani Shishu Suraksha Karyakram",
            "description": "Free delivery and infant care in government hospitals",
            "eligibility": "All pregnant women & newborns",
            "website": "https://nhm.gov.in/jssk",
            "helpline": "104"
        },
        {
            "id": "rbsk",
            "name": "Rashtriya Bal Swasthya Karyakram",
            "description": "Free health screening for children 0-18 years",
            "eligibility": "All children in government/aided schools",
            "website": "https://rbsk.gov.in",
            "helpline": "1800-180-1104"
        }
    ],
    "regional_foods": {
        "north": [
            {"name": "Khichdi", "age": "6+ months", "recipe": "1/4 cup rice + 1/4 cup moong dal, cook soft, mash, add ghee", "benefits": "Easy to digest, complete protein"},
            {"name": "Daliya (Broken Wheat)", "age": "7+ months", "recipe": "Roast daliya, cook with water/milk, add jaggery", "benefits": "High fiber, iron rich"},
            {"name": "Suji Halwa", "age": "8+ months", "recipe": "Roast suji in ghee, add warm milk, cook till thick", "benefits": "Energy dense, easy to swallow"},
            {"name": "Ragi Porridge", "age": "6+ months", "recipe": "Mix ragi flour in water, cook stirring constantly", "benefits": "High calcium, iron"},
            {"name": "Sabudana Kheer", "age": "8+ months", "recipe": "Soak sabudana, cook in milk with sugar", "benefits": "Energy, easy digestion"}
        ],
        "south": [
            {"name": "Ragi Malt", "age": "6+ months", "recipe": "Mix ragi flour, cook with water, strain, add jaggery", "benefits": "Calcium, iron, aids bone growth"},
            {"name": "Rice Kanji", "age": "6+ months", "recipe": "Cook rice with excess water, mash, add salt", "benefits": "Easy first food, hydrating"},
            {"name": "Idli", "age": "9+ months", "recipe": "Soft steamed idli, mash with sambar/rasam", "benefits": "Fermented, probiotic, protein"},
            {"name": "Banana Payasam", "age": "7+ months", "recipe": "Mash banana, cook with milk, cardamom", "benefits": "Potassium, natural sweetness"},
            {"name": "Carrot Poriyal", "age": "8+ months", "recipe": "Grate carrot, cook with dal water, temper with mustard", "benefits": "Vitamin A, fiber"}
        ],
        "east": [
            {"name": "Bhat (Soft Rice)", "age": "6+ months", "recipe": "Overcooked rice mashed with dal water", "benefits": "First food, gentle on stomach"},
            {"name": "Cholar Dal", "age": "8+ months", "recipe": "Cook chana dal soft, mash, add coconut", "benefits": "Protein, healthy fats"},
            {"name": "Fish Curry (boneless)", "age": "10+ months", "recipe": "Soft fish cooked in light gravy, debone carefully", "benefits": "Omega-3, protein, DHA"}
        ],
        "west": [
            {"name": "Moong Dal Khichdi", "age": "6+ months", "recipe": "Equal rice + moong dal, pressure cook soft", "benefits": "Complete protein, easy digestion"},
            {"name": "Nachni Satva", "age": "6+ months", "recipe": "Soak nachni, grind, strain, cook with jaggery", "benefits": "Iron, calcium for bones"},
            {"name": "Puran Poli (mashed)", "age": "12+ months", "recipe": "Sweet chana dal filling, mash with ghee", "benefits": "Festival food, energy dense"}
        ]
    },
    "seasonal_alerts": {
        "monsoon": [
            {"disease": "Dengue", "symptoms": "High fever, severe headache, joint pain, rash", "prevention": ["Use mosquito nets/repellents", "Empty stagnant water", "Full-sleeve clothing", "Keep surroundings clean"]},
            {"disease": "Malaria", "symptoms": "Chills, high fever, sweating, headache", "prevention": ["Mosquito nets at night", "Anti-malarial spray", "Cover water containers", "Seek immediate treatment"]},
            {"disease": "Typhoid", "symptoms": "Prolonged fever, weakness, stomach pain", "prevention": ["Drink boiled/filtered water", "Eat freshly cooked food", "Wash hands frequently", "Get vaccinated"]},
            {"disease": "Gastroenteritis", "symptoms": "Vomiting, loose stools, stomach cramps", "prevention": ["Safe drinking water", "Avoid street food", "ORS for dehydration", "Wash fruits/vegetables"]}
        ],
        "summer": [
            {"disease": "Heat Stroke", "symptoms": "High body temp, no sweating, confusion", "prevention": ["Stay hydrated", "Avoid sun 11am-4pm", "Light cotton clothes", "Use ORS"]},
            {"disease": "Heat Rash", "symptoms": "Red bumps, itching, mostly on neck/back", "prevention": ["Keep skin dry", "Loose cotton clothes", "Cool baths", "Calamine lotion"]}
        ],
        "winter": [
            {"disease": "Cold & Flu", "symptoms": "Runny nose, cough, mild fever", "prevention": ["Warm clothing", "Steam inhalation", "Honey (>1 year)", "Good nutrition"]},
            {"disease": "Pneumonia", "symptoms": "Fast breathing, chest indrawing, high fever", "prevention": ["Complete vaccinations", "Breastfeeding", "Avoid smoke exposure", "Seek early treatment"]}
        ]
    },
    "ayurvedic_remedies": [
        {"name": "Tulsi Water", "for": "Cold, cough, immunity", "recipe": "Boil 5-6 tulsi leaves in water, cool, give 2 tsp twice daily", "age": "6+ months", "caution": "Avoid in fever"},
        {"name": "Turmeric Milk (Haldi Doodh)", "for": "Immunity, wound healing", "recipe": "1/4 tsp turmeric in warm milk with honey", "age": "12+ months", "caution": "Avoid in jaundice"},
        {"name": "Ajwain Water", "for": "Colic, gas, indigestion", "recipe": "Boil 1/2 tsp ajwain in water, strain, give 1 tsp", "age": "3+ months", "caution": "Small quantities only"},
        {"name": "Ginger Honey", "for": "Sore throat, nausea", "recipe": "Mix 1/4 tsp ginger juice with honey", "age": "12+ months", "caution": "No honey under 1 year"},
        {"name": "Cumin Water (Jeera Paani)", "for": "Digestion, gas relief", "recipe": "Boil 1/2 tsp cumin in water, strain, cool", "age": "6+ months", "caution": "Mild remedy"},
        {"name": "Coconut Oil Massage", "for": "Dry skin, growth", "recipe": "Warm coconut oil, gentle massage before bath", "age": "Birth onwards", "caution": "Test for allergy first"}
    ],
    "emergency_contacts": {
        "national_emergency": "112",
        "ambulance": "108",
        "child_helpline": "1098",
        "poison_control": "1800-116-117",
        "women_helpline": "181"
    }
}

# USA-specific resources  
USA_RESOURCES = {
    "insurance_guide": [
        {"term": "Premium", "definition": "Monthly amount you pay to have health insurance coverage"},
        {"term": "Deductible", "definition": "Amount you pay out-of-pocket before insurance starts covering costs"},
        {"term": "Copay", "definition": "Fixed amount you pay for a covered service (e.g., $25 for doctor visit)"},
        {"term": "Coinsurance", "definition": "Percentage you pay after meeting your deductible (e.g., 20% of costs)"},
        {"term": "Out-of-Pocket Maximum", "definition": "Maximum you'll pay in a year; after this, insurance covers 100%"},
        {"term": "In-Network", "definition": "Providers contracted with your insurance - lower costs"},
        {"term": "Out-of-Network", "definition": "Providers not contracted - higher costs or no coverage"},
        {"term": "Prior Authorization", "definition": "Approval needed from insurance before certain services"},
        {"term": "Explanation of Benefits (EOB)", "definition": "Statement showing what was billed, paid, and what you owe"},
        {"term": "CHIP", "definition": "Children's Health Insurance Program - low-cost coverage for kids"}
    ],
    "school_vaccine_requirements": {
        "kindergarten": [
            "DTaP - 5 doses",
            "Polio (IPV) - 4 doses", 
            "MMR - 2 doses",
            "Hepatitis B - 3 doses",
            "Varicella - 2 doses"
        ],
        "middle_school": [
            "Tdap booster",
            "Meningococcal (MenACWY)"
        ],
        "note": "Requirements vary by state. Check your state's immunization requirements.",
        "exemptions": "Medical, religious, and philosophical exemptions vary by state"
    },
    "wic_program": {
        "name": "Women, Infants, and Children (WIC)",
        "description": "Nutrition program for pregnant women, new mothers, infants, and children up to age 5",
        "eligibility": [
            "Income at or below 185% of federal poverty level",
            "Pregnant, breastfeeding, or postpartum women",
            "Infants and children under 5 at nutritional risk"
        ],
        "benefits": [
            "Healthy foods (milk, eggs, cereal, fruits, vegetables)",
            "Nutrition education and counseling",
            "Breastfeeding support",
            "Referrals to healthcare and social services"
        ],
        "website": "https://www.fns.usda.gov/wic",
        "find_office": "https://www.fns.usda.gov/wic/wic-how-apply"
    },
    "safety_standards": [
        {
            "category": "Car Seat Safety",
            "guidelines": [
                "Rear-facing: Birth to 2 years (or until max height/weight)",
                "Forward-facing with harness: 2-5 years (40-65 lbs)",
                "Booster seat: Until seat belt fits properly (usually 8-12 years)",
                "Check expiration date on car seat",
                "Register car seat for recall notifications"
            ],
            "resource": "https://www.nhtsa.gov/equipment/car-seats-and-booster-seats"
        },
        {
            "category": "Sleep Safety (SIDS Prevention)",
            "guidelines": [
                "Always place baby on BACK to sleep",
                "Use firm, flat sleep surface",
                "Keep soft objects out of sleep area",
                "Room sharing without bed sharing for first 6-12 months",
                "Avoid overheating"
            ],
            "resource": "https://safetosleep.nichd.nih.gov"
        },
        {
            "category": "Product Recalls",
            "guidelines": [
                "Check CPSC.gov for latest recalls",
                "Register products for recall alerts",
                "Stop using recalled products immediately"
            ],
            "resource": "https://www.cpsc.gov/Recalls"
        }
    ],
    "developmental_resources": {
        "cdc_milestones": {
            "name": "CDC's Milestone Tracker App",
            "description": "Track your child's milestones from 2 months to 5 years",
            "app_store": "https://apps.apple.com/app/cdcs-milestone-tracker/id1232718688",
            "play_store": "https://play.google.com/store/apps/details?id=gov.cdc.MilestoneTracker"
        },
        "early_intervention": {
            "description": "Free evaluation and services for children 0-3 with developmental delays",
            "find_services": "https://www.cdc.gov/ncbddd/actearly/parents/states.html"
        }
    },
    "emergency_contacts": {
        "emergency": "911",
        "poison_control": "1-800-222-1222",
        "child_abuse_hotline": "1-800-422-4453",
        "suicide_prevention": "988"
    }
}

# Common features for both regions
COMMON_FEATURES = {
    "developmental_screening": {
        "asq3": {
            "name": "ASQ-3 (Ages & Stages Questionnaire)",
            "description": "Screens development in 5 areas: Communication, Gross Motor, Fine Motor, Problem Solving, Personal-Social",
            "age_range": "1 month to 5.5 years",
            "how_it_works": "Answer simple questions about what your child can do",
            "areas": [
                {"name": "Communication", "examples": "Does your child say words? Follow simple directions?"},
                {"name": "Gross Motor", "examples": "Can your child walk? Jump? Kick a ball?"},
                {"name": "Fine Motor", "examples": "Can your child pick up small objects? Draw?"},
                {"name": "Problem Solving", "examples": "Does your child solve simple puzzles? Find hidden objects?"},
                {"name": "Personal-Social", "examples": "Does your child play with others? Feed self?"}
            ]
        }
    },
    "telemedicine_tips": [
        "Prepare list of symptoms, duration, and any medications given",
        "Have child's temperature and weight ready",
        "Use good lighting so doctor can see child clearly",
        "Keep child calm and engaged during video call",
        "Have pharmacy information ready for prescriptions",
        "Take photos of rashes or symptoms before the call"
    ],
    "parenting_tips": {
        "newborn": [
            "Skin-to-skin contact promotes bonding",
            "Feed on demand, 8-12 times daily",
            "Expect 10-12 wet diapers daily",
            "Sleep when baby sleeps",
            "Tummy time when awake (supervised)"
        ],
        "infant": [
            "Read and talk to baby daily",
            "Introduce variety of textures and colors",
            "Maintain consistent routines",
            "Respond to cries - builds trust",
            "Safe exploration is essential"
        ],
        "toddler": [
            "Set clear, consistent boundaries",
            "Offer choices within limits",
            "Name emotions to build vocabulary",
            "Praise effort, not just results",
            "Allow independent play"
        ]
    }
}

@router.get("/config/regions")
async def get_region_config():
    """Get region-specific configuration"""
    return {
        "regions": [
            {
                "id": "india",
                "name": "India",
                "flag": "🇮🇳",
                "vaccination_schedule": "IAP (Indian Academy of Pediatrics)",
                "id_fields": ["aadhaar_number", "uhid"],
                "currency": "INR",
                "language": "en-IN",
                "languages_available": ["English", "हिंदी", "தமிழ்", "తెలుగు", "ಕನ್ನಡ", "മലയാളം", "বাংলা", "मराठी", "ગુજરાતી"]
            },
            {
                "id": "usa",
                "name": "United States",
                "flag": "🇺🇸",
                "vaccination_schedule": "CDC",
                "id_fields": ["insurance_provider", "insurance_id"],
                "currency": "USD",
                "language": "en-US",
                "languages_available": ["English", "Español"]
            }
        ]
    }

# ============ REGION-SPECIFIC ENDPOINTS ============

@router.get("/resources/india")
async def get_india_resources():
    """Get India-specific resources and information"""
    return {
        "success": True,
        "region": "india",
        "government_schemes": INDIA_RESOURCES["government_schemes"],
        "emergency_contacts": INDIA_RESOURCES["emergency_contacts"],
        "ayurvedic_remedies": INDIA_RESOURCES["ayurvedic_remedies"]
    }

@router.get("/resources/india/food-guides")
async def get_india_food_guides(region: str = None):
    """Get regional food guides for India"""
    if region and region in INDIA_RESOURCES["regional_foods"]:
        return {
            "success": True,
            "region": region,
            "foods": INDIA_RESOURCES["regional_foods"][region]
        }
    return {
        "success": True,
        "regions": list(INDIA_RESOURCES["regional_foods"].keys()),
        "all_foods": INDIA_RESOURCES["regional_foods"]
    }

@router.get("/resources/india/seasonal-alerts")
async def get_india_seasonal_alerts(season: str = None):
    """Get seasonal health alerts for India"""
    if season and season in INDIA_RESOURCES["seasonal_alerts"]:
        return {
            "success": True,
            "season": season,
            "alerts": INDIA_RESOURCES["seasonal_alerts"][season]
        }
    # Determine current season based on month
    month = datetime.now().month
    if month in [6, 7, 8, 9]:
        current_season = "monsoon"
    elif month in [3, 4, 5]:
        current_season = "summer"
    else:
        current_season = "winter"
    
    return {
        "success": True,
        "current_season": current_season,
        "current_alerts": INDIA_RESOURCES["seasonal_alerts"].get(current_season, []),
        "all_seasons": INDIA_RESOURCES["seasonal_alerts"]
    }

@router.get("/resources/india/ayurvedic")
async def get_ayurvedic_remedies():
    """Get safe Ayurvedic home remedies for children"""
    return {
        "success": True,
        "disclaimer": "These are traditional remedies. Always consult a pediatrician before use.",
        "remedies": INDIA_RESOURCES["ayurvedic_remedies"]
    }

@router.get("/resources/usa")
async def get_usa_resources():
    """Get USA-specific resources and information"""
    return {
        "success": True,
        "region": "usa",
        "insurance_guide": USA_RESOURCES["insurance_guide"],
        "wic_program": USA_RESOURCES["wic_program"],
        "emergency_contacts": USA_RESOURCES["emergency_contacts"]
    }

@router.get("/resources/usa/insurance-guide")
async def get_usa_insurance_guide():
    """Get pediatric insurance terminology guide"""
    return {
        "success": True,
        "title": "Understanding Pediatric Health Insurance",
        "terms": USA_RESOURCES["insurance_guide"]
    }

@router.get("/resources/usa/school-vaccines")
async def get_usa_school_vaccines():
    """Get school vaccination requirements"""
    return {
        "success": True,
        "title": "School Immunization Requirements",
        "requirements": USA_RESOURCES["school_vaccine_requirements"],
        "resource": "https://www.cdc.gov/vaccines/schedules/hcp/imz/child-adolescent.html"
    }

@router.get("/resources/usa/wic")
async def get_wic_info():
    """Get WIC program information"""
    return {
        "success": True,
        "program": USA_RESOURCES["wic_program"]
    }

@router.get("/resources/usa/safety")
async def get_usa_safety_standards():
    """Get childcare safety standards and guidelines"""
    return {
        "success": True,
        "title": "Child Safety Guidelines",
        "standards": USA_RESOURCES["safety_standards"]
    }

@router.get("/resources/usa/developmental")
async def get_usa_developmental_resources():
    """Get developmental resources and CDC milestones info"""
    return {
        "success": True,
        "resources": USA_RESOURCES["developmental_resources"]
    }

# ============ COMMON FEATURES ============

@router.get("/resources/common/screening")
async def get_developmental_screening():
    """Get developmental screening information"""
    return {
        "success": True,
        "screening": COMMON_FEATURES["developmental_screening"]
    }

@router.get("/resources/common/telemedicine-tips")
async def get_telemedicine_tips():
    """Get tips for telemedicine consultations"""
    return {
        "success": True,
        "tips": COMMON_FEATURES["telemedicine_tips"]
    }

@router.get("/resources/common/parenting-tips")
async def get_parenting_tips(age_group: str = None):
    """Get age-specific parenting tips"""
    if age_group and age_group in COMMON_FEATURES["parenting_tips"]:
        return {
            "success": True,
            "age_group": age_group,
            "tips": COMMON_FEATURES["parenting_tips"][age_group]
        }
    return {
        "success": True,
        "all_tips": COMMON_FEATURES["parenting_tips"]
    }

@router.get("/vaccination-pdf/{child_id}")
async def get_vaccination_pdf(child_id: str):
    """Generate vaccination record info (for QR code/sharing)"""
    child = await db.alyne_children.find_one({"id": child_id}, {"_id": 0})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    vaccinations = await db.alyne_vaccinations.find(
        {"child_id": child_id, "status": "done"},
        {"_id": 0}
    ).to_list(length=100)
    
    record = {
        "child_name": child.get("name"),
        "date_of_birth": child.get("date_of_birth"),
        "gender": child.get("gender"),
        "blood_group": child.get("blood_group"),
        "region": child.get("region"),
        "completed_vaccinations": len(vaccinations),
        "vaccinations": vaccinations,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "qr_data": f"ALYNE_VAX_{child_id}_{len(vaccinations)}"
    }
    
    return {"success": True, "record": record}

# ============ AI CHAT WITH ALYNE ============

import os
from dotenv import load_dotenv
load_dotenv()

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# Symptom Guidelines Database (IAP/CDC based)
SYMPTOM_GUIDELINES = {
    "sore_throat": {
        "name": "Sore Throat",
        "icon": "🤒",
        "description": "Pain or irritation in the throat",
        "causes": ["Viral infections (most common)", "Bacterial infection (Strep)", "Allergies", "Dry air", "Irritants"],
        "home_care": [
            "Give warm fluids (soup, warm water with honey for >1 year)",
            "Use a cool-mist humidifier",
            "Offer cold foods like popsicles for older children",
            "Salt water gargle for children >6 years",
            "Ensure adequate rest"
        ],
        "when_to_see_doctor": [
            "Difficulty swallowing or breathing",
            "Drooling in young children",
            "Fever >101°F (38.3°C) for more than 2 days",
            "Sore throat lasting >7 days",
            "Rash accompanying sore throat",
            "Blood in saliva or phlegm"
        ],
        "iap_guidelines": "IAP recommends symptomatic treatment for viral pharyngitis. Antibiotics only for confirmed Group A Streptococcal infection.",
        "cdc_guidelines": "CDC recommends rapid strep test if bacterial infection suspected. Most sore throats are viral and don't need antibiotics."
    },
    "cough": {
        "name": "Cough",
        "icon": "🫁",
        "description": "Forceful expulsion of air from lungs",
        "causes": ["Common cold", "Asthma", "Allergies", "Bronchitis", "Croup", "Pneumonia"],
        "home_care": [
            "Keep child hydrated with plenty of fluids",
            "Use honey (for >1 year old) - 2.5ml before bedtime",
            "Run a cool-mist humidifier in bedroom",
            "Keep head elevated during sleep",
            "Avoid smoke and irritants",
            "Saline nasal drops for congestion"
        ],
        "when_to_see_doctor": [
            "Difficulty breathing or rapid breathing",
            "Blue lips or fingernails",
            "Barking cough (croup) with stridor",
            "Cough lasting >3 weeks",
            "Coughing up blood",
            "High fever with cough",
            "Infant under 3 months with cough"
        ],
        "iap_guidelines": "IAP advises against over-the-counter cough medicines for children <6 years. Honey is recommended for >1 year. Watch for signs of respiratory distress.",
        "cdc_guidelines": "CDC recommends against cough suppressants in young children. Focus on hydration and comfort measures. Seek care for persistent or severe cough."
    },
    "skin_rash": {
        "name": "Skin Rash",
        "icon": "🔴",
        "description": "Change in skin color, texture, or appearance",
        "causes": ["Viral exanthem", "Allergic reaction", "Eczema", "Heat rash", "Insect bites", "Fungal infection"],
        "home_care": [
            "Keep affected area clean and dry",
            "Apply fragrance-free moisturizer",
            "Use lukewarm baths (not hot)",
            "Dress in loose, cotton clothing",
            "Apply calamine lotion for itchy rashes",
            "Keep nails short to prevent scratching"
        ],
        "when_to_see_doctor": [
            "Rash with fever",
            "Rapidly spreading rash",
            "Purple or blood-colored spots",
            "Rash with difficulty breathing",
            "Rash near eyes, mouth, or genitals",
            "Signs of infection (pus, warmth, spreading redness)",
            "Rash that doesn't improve in 3-5 days"
        ],
        "iap_guidelines": "IAP emphasizes identifying the cause. Petechial/purpuric rashes require immediate evaluation. Most viral rashes are self-limiting.",
        "cdc_guidelines": "CDC advises watching for signs of serious conditions. Document rash progression with photos. Seek immediate care for rash with fever and lethargy."
    },
    "fever": {
        "name": "Fever",
        "icon": "🌡️",
        "description": "Body temperature above 100.4°F (38°C)",
        "causes": ["Viral infection", "Bacterial infection", "Teething (mild)", "Vaccination response", "Heat exposure"],
        "home_care": [
            "Give appropriate dose of acetaminophen or ibuprofen (>6 months)",
            "Keep child lightly dressed",
            "Encourage fluid intake",
            "Lukewarm sponge bath if uncomfortable",
            "Monitor temperature every 4-6 hours",
            "Ensure adequate rest"
        ],
        "when_to_see_doctor": [
            "Infant <3 months with any fever",
            "Temperature >104°F (40°C)",
            "Fever lasting >3 days",
            "Child appears very ill or lethargic",
            "Signs of dehydration",
            "Febrile seizure",
            "Stiff neck or severe headache"
        ],
        "iap_guidelines": "IAP recommends treating fever when child is uncomfortable. Focus on hydration. Any fever in infant <3 months requires immediate evaluation.",
        "cdc_guidelines": "CDC advises that fever itself is not dangerous but underlying cause matters. Treat discomfort, not the number on thermometer."
    },
    "vomiting": {
        "name": "Vomiting",
        "icon": "🤮",
        "description": "Forceful expulsion of stomach contents",
        "causes": ["Gastroenteritis (stomach flu)", "Food poisoning", "Motion sickness", "Overeating", "Infections"],
        "home_care": [
            "Wait 30-60 minutes after vomiting before giving fluids",
            "Start with small sips of clear fluids (ORS, clear broth)",
            "Avoid milk and solid foods initially",
            "Gradually increase fluids if tolerated",
            "Introduce bland foods (BRAT diet) when ready",
            "Keep child lying on side to prevent aspiration"
        ],
        "when_to_see_doctor": [
            "Signs of dehydration (no tears, dry mouth, no urine 6-8 hours)",
            "Vomiting blood or green/yellow bile",
            "Severe abdominal pain",
            "Projectile vomiting in infants",
            "Head injury before vomiting started",
            "Vomiting for >24 hours (children) or >12 hours (infants)",
            "Stiff neck with vomiting"
        ],
        "iap_guidelines": "IAP recommends oral rehydration as first-line treatment. ORS is preferred over plain water. Anti-emetics rarely needed in children.",
        "cdc_guidelines": "CDC emphasizes preventing dehydration. Small frequent sips of ORS are key. Avoid sugary drinks and fruit juices."
    },
    "diarrhea": {
        "name": "Diarrhea",
        "icon": "💧",
        "description": "Loose, watery stools more frequent than normal",
        "causes": ["Viral gastroenteritis", "Bacterial infection", "Parasites", "Food intolerance", "Antibiotics"],
        "home_care": [
            "Give ORS (Oral Rehydration Solution) frequently",
            "Continue breastfeeding for infants",
            "Offer age-appropriate foods (don't restrict diet)",
            "Avoid sugary drinks and juices",
            "Probiotics may help shorten duration",
            "Frequent diaper changes to prevent rash"
        ],
        "when_to_see_doctor": [
            "Signs of dehydration",
            "Blood or mucus in stool",
            "Diarrhea with high fever",
            "Severe abdominal pain",
            "Diarrhea lasting >7 days",
            "Infant <6 months with diarrhea",
            "Recent travel to high-risk areas"
        ],
        "iap_guidelines": "IAP strongly recommends ORS and zinc supplementation (10-20mg/day for 10-14 days). Continue feeding. Anti-diarrheal drugs NOT recommended.",
        "cdc_guidelines": "CDC recommends ORS as primary treatment. Continue normal diet. Zinc supplementation reduces duration and severity."
    }
}

class ChatMessage(BaseModel):
    message: str
    child_id: Optional[str] = None
    session_id: str

class SymptomQuery(BaseModel):
    symptom: str
    child_id: Optional[str] = None
    child_age_months: Optional[int] = None
    region: str = "india"

@router.post("/chat")
async def chat_with_alyne(chat: ChatMessage, user_id: str):
    """AI Chat with ALYNE - 24x7 Pediatric Health Assistant"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Get child info if provided
        child_context = ""
        if chat.child_id:
            child = await db.alyne_children.find_one({"id": chat.child_id}, {"_id": 0})
            if child:
                age_months = calculate_age_months(child["date_of_birth"])
                age_display = f"{age_months // 12}y {age_months % 12}m" if age_months >= 12 else f"{age_months}m"
                child_context = f"Child: {child['name']}, Age: {age_display}, Gender: {child['gender']}, Region: {child['region']}"
        
        system_message = f"""You are ALYNE, a friendly and knowledgeable pediatric health assistant for the Nevika Cura healthcare app. You provide helpful, evidence-based guidance on children's health following IAP (Indian Academy of Pediatrics) and CDC guidelines.

{child_context}

IMPORTANT GUIDELINES:
1. Always be warm, reassuring, and parent-friendly in your responses
2. Provide practical, actionable advice for common childhood concerns
3. Reference IAP or CDC guidelines when applicable
4. Always include when to seek immediate medical care
5. NEVER diagnose conditions - only provide general guidance
6. For serious symptoms, always recommend consulting a pediatrician
7. Keep responses concise but comprehensive
8. Use simple language that parents can understand

DISCLAIMER: Always include this reminder when giving health advice:
"This is general guidance only. Please consult your pediatrician for personalized medical advice."

You can help with:
- General child health questions
- Understanding symptoms
- Home care tips
- When to see a doctor
- Vaccination information
- Growth and development questions
- Nutrition advice
- Sleep guidance"""

        llm_chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=chat.session_id,
            system_message=system_message
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        user_message = UserMessage(text=chat.message)
        response = await llm_chat.send_message(user_message)
        
        # Store chat in database
        chat_doc = {
            "id": f"chat_{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            "child_id": chat.child_id,
            "session_id": chat.session_id,
            "user_message": chat.message,
            "ai_response": response,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.alyne_chats.insert_one(chat_doc)
        
        return {
            "success": True,
            "response": response,
            "session_id": chat.session_id
        }
        
    except Exception as e:
        logger.error(f"AI Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

@router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    """Get chat history for a session"""
    chats = await db.alyne_chats.find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(length=100)
    
    return {"chats": chats}

@router.get("/symptoms")
async def get_symptoms_list():
    """Get list of common symptoms with basic info"""
    symptoms = []
    for key, data in SYMPTOM_GUIDELINES.items():
        symptoms.append({
            "id": key,
            "name": data["name"],
            "icon": data["icon"],
            "description": data["description"]
        })
    return {"symptoms": symptoms}

@router.get("/symptoms/{symptom_id}")
async def get_symptom_details(symptom_id: str, region: str = "india"):
    """Get detailed guidelines for a specific symptom"""
    if symptom_id not in SYMPTOM_GUIDELINES:
        raise HTTPException(status_code=404, detail="Symptom not found")
    
    symptom = SYMPTOM_GUIDELINES[symptom_id]
    
    # Return region-appropriate guidelines
    guidelines = symptom["iap_guidelines"] if region == "india" else symptom["cdc_guidelines"]
    
    return {
        "symptom": symptom,
        "primary_guidelines": guidelines,
        "region": region
    }

@router.post("/symptoms/check")
async def check_symptom(query: SymptomQuery):
    """Get AI-powered symptom assessment with guidelines"""
    if query.symptom not in SYMPTOM_GUIDELINES:
        # Try to find closest match or use AI
        pass
    
    symptom_data = SYMPTOM_GUIDELINES.get(query.symptom, {})
    
    # Age-specific recommendations
    age_specific = []
    if query.child_age_months:
        if query.child_age_months < 3:
            age_specific.append("⚠️ For infants under 3 months, please consult a doctor for any symptoms")
        elif query.child_age_months < 12:
            age_specific.append("Note: Some home remedies (like honey) are not safe for children under 1 year")
    
    return {
        "symptom": symptom_data,
        "age_specific_notes": age_specific,
        "guidelines": symptom_data.get("iap_guidelines" if query.region == "india" else "cdc_guidelines"),
        "disclaimer": "This is general guidance only. Please consult your pediatrician for personalized medical advice."
    }

# ============ KIDS SHOP (Orange Pharmacy Subsidiary) ============

KIDS_SHOP_PRODUCTS = {
    "categories": [
        {"id": "baby_food", "name": "Baby Food & Nutrition", "icon": "🍼", "description": "Cereals, purees, and healthy snacks"},
        {"id": "feeding", "name": "Feeding Essentials", "icon": "🍶", "description": "Bottles, breast pumps, sterilizers"},
        {"id": "diapers", "name": "Diapers & Wipes", "icon": "👶", "description": "Diapers, wipes, and changing essentials"},
        {"id": "skincare", "name": "Baby Skincare", "icon": "🧴", "description": "Lotions, oils, and bath products"},
        {"id": "health", "name": "Health & Safety", "icon": "🩹", "description": "First aid, thermometers, monitors"},
        {"id": "supplements", "name": "Kids Supplements", "icon": "💊", "description": "Vitamins, protein powder, immunity boosters"}
    ],
    "products": [
        # Baby Food & Nutrition
        {"id": "prod_001", "category": "baby_food", "name": "Cerelac Wheat Honey", "brand": "Nestle", "price": 285, "mrp": 320, "unit": "300g", "age": "6+ months", "image": "cerelac.jpg", "rating": 4.5, "reviews": 1250},
        {"id": "prod_002", "category": "baby_food", "name": "Organic Baby Rice Cereal", "brand": "Slurrp Farm", "price": 199, "mrp": 249, "unit": "200g", "age": "6+ months", "image": "rice_cereal.jpg", "rating": 4.3, "reviews": 890},
        {"id": "prod_003", "category": "baby_food", "name": "Apple Puree", "brand": "Gerber", "price": 120, "mrp": 150, "unit": "120g", "age": "6+ months", "image": "apple_puree.jpg", "rating": 4.6, "reviews": 567},
        {"id": "prod_004", "category": "baby_food", "name": "Multigrain Millet Porridge", "brand": "Early Foods", "price": 245, "mrp": 295, "unit": "200g", "age": "8+ months", "image": "millet.jpg", "rating": 4.4, "reviews": 432},
        
        # Feeding Essentials
        {"id": "prod_010", "category": "feeding", "name": "Electric Breast Pump", "brand": "Philips Avent", "price": 4999, "mrp": 6499, "unit": "1 Unit", "age": "For mothers", "image": "breast_pump.jpg", "rating": 4.7, "reviews": 2340, "bestseller": True},
        {"id": "prod_011", "category": "feeding", "name": "Manual Breast Pump", "brand": "Medela", "price": 2499, "mrp": 2999, "unit": "1 Unit", "age": "For mothers", "image": "manual_pump.jpg", "rating": 4.5, "reviews": 1876},
        {"id": "prod_012", "category": "feeding", "name": "Silicone Feeding Bottle", "brand": "Comotomo", "price": 899, "mrp": 1099, "unit": "250ml", "age": "0+ months", "image": "silicone_bottle.jpg", "rating": 4.8, "reviews": 3456, "bestseller": True},
        {"id": "prod_013", "category": "feeding", "name": "Anti-Colic Bottle Set", "brand": "Dr. Brown's", "price": 1599, "mrp": 1999, "unit": "3 Pack", "age": "0+ months", "image": "anticolic.jpg", "rating": 4.6, "reviews": 2134},
        {"id": "prod_014", "category": "feeding", "name": "Bottle Sterilizer", "brand": "Philips Avent", "price": 3499, "mrp": 4299, "unit": "1 Unit", "age": "All ages", "image": "sterilizer.jpg", "rating": 4.5, "reviews": 1567},
        {"id": "prod_015", "category": "feeding", "name": "Breast Milk Storage Bags", "brand": "Lansinoh", "price": 599, "mrp": 750, "unit": "50 Bags", "age": "For mothers", "image": "storage_bags.jpg", "rating": 4.4, "reviews": 987},
        
        # Diapers & Wipes
        {"id": "prod_020", "category": "diapers", "name": "Premium Diapers (S)", "brand": "Pampers", "price": 899, "mrp": 1099, "unit": "66 Count", "age": "0-6 months", "image": "pampers_s.jpg", "rating": 4.6, "reviews": 5678},
        {"id": "prod_021", "category": "diapers", "name": "Organic Cotton Diapers", "brand": "Huggies Nature", "price": 1199, "mrp": 1499, "unit": "50 Count", "age": "3-8 kg", "image": "organic_diaper.jpg", "rating": 4.4, "reviews": 2345},
        {"id": "prod_022", "category": "diapers", "name": "Water Wipes", "brand": "WaterWipes", "price": 399, "mrp": 499, "unit": "60 Wipes", "age": "All ages", "image": "water_wipes.jpg", "rating": 4.8, "reviews": 4321, "bestseller": True},
        
        # Baby Skincare
        {"id": "prod_030", "category": "skincare", "name": "Baby Massage Oil", "brand": "Himalaya", "price": 199, "mrp": 250, "unit": "200ml", "age": "0+ months", "image": "massage_oil.jpg", "rating": 4.5, "reviews": 3456},
        {"id": "prod_031", "category": "skincare", "name": "Baby Lotion", "brand": "Cetaphil Baby", "price": 449, "mrp": 550, "unit": "400ml", "age": "0+ months", "image": "baby_lotion.jpg", "rating": 4.7, "reviews": 2345},
        {"id": "prod_032", "category": "skincare", "name": "Diaper Rash Cream", "brand": "Sudocrem", "price": 299, "mrp": 375, "unit": "125g", "age": "0+ months", "image": "rash_cream.jpg", "rating": 4.6, "reviews": 1876},
        {"id": "prod_033", "category": "skincare", "name": "Baby Sunscreen SPF 50", "brand": "Mamaearth", "price": 349, "mrp": 449, "unit": "100ml", "age": "6+ months", "image": "sunscreen.jpg", "rating": 4.3, "reviews": 987},
        
        # Health & Safety
        {"id": "prod_040", "category": "health", "name": "Digital Thermometer", "brand": "Omron", "price": 399, "mrp": 550, "unit": "1 Unit", "age": "All ages", "image": "thermometer.jpg", "rating": 4.6, "reviews": 2134},
        {"id": "prod_041", "category": "health", "name": "Nasal Aspirator", "brand": "Fridababy", "price": 699, "mrp": 899, "unit": "1 Unit", "age": "0+ months", "image": "aspirator.jpg", "rating": 4.5, "reviews": 1567},
        {"id": "prod_042", "category": "health", "name": "Baby First Aid Kit", "brand": "Johnson's", "price": 599, "mrp": 750, "unit": "1 Kit", "age": "All ages", "image": "first_aid.jpg", "rating": 4.4, "reviews": 876},
        
        # Kids Supplements
        {"id": "prod_050", "category": "supplements", "name": "Kids Multivitamin Gummies", "brand": "HealthKart", "price": 549, "mrp": 699, "unit": "60 Gummies", "age": "2+ years", "image": "multivitamin.jpg", "rating": 4.5, "reviews": 2345},
        {"id": "prod_051", "category": "supplements", "name": "Junior Protein Powder (Chocolate)", "brand": "PediaSure", "price": 899, "mrp": 1099, "unit": "400g", "age": "2-10 years", "image": "pediasure.jpg", "rating": 4.6, "reviews": 3456, "bestseller": True},
        {"id": "prod_052", "category": "supplements", "name": "Vitamin D3 Drops", "brand": "Wellbaby", "price": 299, "mrp": 399, "unit": "30ml", "age": "0+ months", "image": "vitamin_d.jpg", "rating": 4.7, "reviews": 1876},
        {"id": "prod_053", "category": "supplements", "name": "Immunity Booster Syrup", "brand": "Dabur", "price": 189, "mrp": 225, "unit": "200ml", "age": "1+ years", "image": "immunity.jpg", "rating": 4.3, "reviews": 1234},
        {"id": "prod_054", "category": "supplements", "name": "DHA Omega-3 Drops", "brand": "Carlson Labs", "price": 799, "mrp": 999, "unit": "60ml", "age": "0+ months", "image": "dha.jpg", "rating": 4.6, "reviews": 987}
    ]
}

class ShopOrder(BaseModel):
    user_id: str
    items: List[dict]  # [{"product_id": "prod_001", "quantity": 2}]
    delivery_address: str
    phone: str
    email: Optional[str] = None
    payment_method: str = "cod"  # cod, online

@router.get("/shop/categories")
async def get_shop_categories():
    """Get all product categories"""
    return {"categories": KIDS_SHOP_PRODUCTS["categories"]}

@router.get("/shop/products")
async def get_shop_products(category: Optional[str] = None, search: Optional[str] = None):
    """Get products with optional filtering"""
    products = KIDS_SHOP_PRODUCTS["products"]
    
    if category:
        products = [p for p in products if p["category"] == category]
    
    if search:
        search_lower = search.lower()
        products = [p for p in products if 
                   search_lower in p["name"].lower() or 
                   search_lower in p["brand"].lower()]
    
    return {"products": products, "total": len(products)}

@router.get("/shop/products/{product_id}")
async def get_product_details(product_id: str):
    """Get single product details"""
    product = next((p for p in KIDS_SHOP_PRODUCTS["products"] if p["id"] == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"product": product}

@router.get("/shop/bestsellers")
async def get_bestsellers():
    """Get bestselling products"""
    bestsellers = [p for p in KIDS_SHOP_PRODUCTS["products"] if p.get("bestseller")]
    return {"products": bestsellers}

@router.post("/shop/order")
async def create_shop_order(order: ShopOrder):
    """Create a new shop order"""
    # Calculate totals
    items_with_details = []
    subtotal = 0
    
    for item in order.items:
        product = next((p for p in KIDS_SHOP_PRODUCTS["products"] if p["id"] == item["product_id"]), None)
        if product:
            item_total = product["price"] * item["quantity"]
            subtotal += item_total
            items_with_details.append({
                "product_id": product["id"],
                "name": product["name"],
                "brand": product["brand"],
                "price": product["price"],
                "quantity": item["quantity"],
                "total": item_total
            })
    
    # Free delivery above ₹500
    delivery_charge = 0 if subtotal >= 500 else 50
    total = subtotal + delivery_charge
    
    order_doc = {
        "id": f"ALYNE{datetime.now().strftime('%Y%m%d')}{uuid.uuid4().hex[:6].upper()}",
        "user_id": order.user_id,
        "items": items_with_details,
        "subtotal": subtotal,
        "delivery_charge": delivery_charge,
        "total": total,
        "delivery_address": order.delivery_address,
        "phone": order.phone,
        "email": order.email,
        "payment_method": order.payment_method,
        "status": "placed",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.alyne_orders.insert_one(order_doc)
    order_doc.pop("_id", None)
    
    return {"success": True, "order": order_doc}

@router.get("/shop/orders/{user_id}")
async def get_user_orders(user_id: str):
    """Get orders for a user"""
    orders = await db.alyne_orders.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(length=50)
    
    return {"orders": orders}


# ============ ALYNE KIDS ZONE - Interactive Health Features for Ages 3-8 ============

# Health Stars - Gamified healthy habits tracking
HEALTH_STAR_ACTIVITIES = [
    {"id": "brush_morning", "name": "Morning Brush", "emoji": "🪥", "stars": 1, "category": "hygiene"},
    {"id": "brush_night", "name": "Night Brush", "emoji": "🪥", "stars": 1, "category": "hygiene"},
    {"id": "wash_hands", "name": "Washed Hands", "emoji": "🧼", "stars": 1, "category": "hygiene"},
    {"id": "drink_water", "name": "Drank Water", "emoji": "💧", "stars": 1, "category": "nutrition"},
    {"id": "eat_veggies", "name": "Ate Vegetables", "emoji": "🥦", "stars": 2, "category": "nutrition"},
    {"id": "eat_fruit", "name": "Ate Fruit", "emoji": "🍎", "stars": 2, "category": "nutrition"},
    {"id": "exercise", "name": "Exercise/Play", "emoji": "🏃", "stars": 2, "category": "fitness"},
    {"id": "good_sleep", "name": "Good Sleep", "emoji": "😴", "stars": 2, "category": "rest"},
    {"id": "took_medicine", "name": "Took Medicine", "emoji": "💊", "stars": 1, "category": "health"},
    {"id": "helped_friend", "name": "Helped Friend", "emoji": "🤝", "stars": 1, "category": "kindness"},
    {"id": "shared_toy", "name": "Shared Toy", "emoji": "🧸", "stars": 1, "category": "kindness"},
    {"id": "ate_breakfast", "name": "Ate Breakfast", "emoji": "🥣", "stars": 1, "category": "nutrition"},
]

STAR_REWARDS = [
    {"stars": 10, "reward": "Health Champion Badge", "emoji": "🏅"},
    {"stars": 25, "reward": "Super Star Badge", "emoji": "⭐"},
    {"stars": 50, "reward": "Health Hero Badge", "emoji": "🦸"},
    {"stars": 100, "reward": "ALYNE Master Badge", "emoji": "👑"},
]

# Mood Emojis for tracking
MOOD_EMOJIS = [
    {"id": "happy", "emoji": "😊", "name": "Happy", "color": "#FFD700"},
    {"id": "excited", "emoji": "🤩", "name": "Excited", "color": "#FF69B4"},
    {"id": "calm", "emoji": "😌", "name": "Calm", "color": "#87CEEB"},
    {"id": "tired", "emoji": "😴", "name": "Tired", "color": "#9370DB"},
    {"id": "sad", "emoji": "😢", "name": "Sad", "color": "#4682B4"},
    {"id": "angry", "emoji": "😠", "name": "Angry", "color": "#FF6347"},
    {"id": "scared", "emoji": "😨", "name": "Scared", "color": "#808080"},
    {"id": "sick", "emoji": "🤒", "name": "Not feeling well", "color": "#90EE90"},
]

# Bedtime Story Themes
STORY_THEMES = [
    {"id": "brush_teeth", "name": "Brushing Teeth Adventure", "icon": "🪥"},
    {"id": "eat_healthy", "name": "Veggie Superhero", "icon": "🥦"},
    {"id": "wash_hands", "name": "Germ Fighter", "icon": "🧼"},
    {"id": "good_sleep", "name": "Dreamland Journey", "icon": "🌙"},
    {"id": "exercise", "name": "Super Strong", "icon": "💪"},
    {"id": "doctor_visit", "name": "Friendly Doctor", "icon": "👨‍⚕️"},
    {"id": "share_toys", "name": "Sharing is Caring", "icon": "🧸"},
    {"id": "drink_water", "name": "Water Wizard", "icon": "💧"},
]

class HealthStarLog(BaseModel):
    child_id: str
    activity_id: str
    date: str  # YYYY-MM-DD

class MoodLogEntry(BaseModel):
    child_id: str
    mood_id: str
    note: Optional[str] = None

class StoryRequest(BaseModel):
    child_id: str
    theme_id: str
    child_name: str
    age: int = 5
    session_id: str

class KidsChatMessage(BaseModel):
    child_id: str
    message: str
    child_name: str
    age: int = 5
    session_id: str

# ============ HEALTH STARS ENDPOINTS ============

@router.get("/kidszone/activities")
async def get_star_activities():
    """Get list of activities kids can earn stars for"""
    return {
        "success": True,
        "activities": HEALTH_STAR_ACTIVITIES,
        "rewards": STAR_REWARDS
    }

@router.post("/kidszone/stars/log")
async def log_star_activity(entry: HealthStarLog):
    """Log a completed healthy activity for a child"""
    activity = next((a for a in HEALTH_STAR_ACTIVITIES if a["id"] == entry.activity_id), None)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    # Check if already logged today
    existing = await db.alyne_star_logs.find_one({
        "child_id": entry.child_id,
        "activity_id": entry.activity_id,
        "date": entry.date
    })
    
    if existing:
        return {"success": False, "message": "Already logged today!", "already_done": True}
    
    log_doc = {
        "id": str(uuid.uuid4()),
        "child_id": entry.child_id,
        "activity_id": entry.activity_id,
        "activity_name": activity["name"],
        "emoji": activity["emoji"],
        "stars_earned": activity["stars"],
        "date": entry.date,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.alyne_star_logs.insert_one(log_doc)
    
    # Get total stars
    total_stars = await get_child_total_stars(entry.child_id)
    
    # Check for new rewards
    new_rewards = [r for r in STAR_REWARDS if r["stars"] == total_stars]
    
    return {
        "success": True,
        "stars_earned": activity["stars"],
        "total_stars": total_stars,
        "new_reward": new_rewards[0] if new_rewards else None,
        "message": f"Great job! You earned {activity['stars']} ⭐!"
    }

async def get_child_total_stars(child_id: str) -> int:
    """Calculate total stars for a child"""
    pipeline = [
        {"$match": {"child_id": child_id}},
        {"$group": {"_id": None, "total": {"$sum": "$stars_earned"}}}
    ]
    result = await db.alyne_star_logs.aggregate(pipeline).to_list(1)
    return result[0]["total"] if result else 0

@router.get("/kidszone/stars/{child_id}")
async def get_child_stars(child_id: str, days: int = 7):
    """Get star progress for a child"""
    # Get recent activity logs
    from_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    logs = await db.alyne_star_logs.find(
        {"child_id": child_id, "date": {"$gte": from_date}},
        {"_id": 0}
    ).sort("date", -1).to_list(100)
    
    total_stars = await get_child_total_stars(child_id)
    
    # Calculate earned rewards
    earned_rewards = [r for r in STAR_REWARDS if r["stars"] <= total_stars]
    next_reward = next((r for r in STAR_REWARDS if r["stars"] > total_stars), None)
    
    # Get today's completed activities
    today = datetime.now().strftime("%Y-%m-%d")
    today_logs = [l for l in logs if l["date"] == today]
    completed_today = [l["activity_id"] for l in today_logs]
    
    return {
        "success": True,
        "total_stars": total_stars,
        "recent_logs": logs[:20],
        "completed_today": completed_today,
        "earned_rewards": earned_rewards,
        "next_reward": next_reward,
        "stars_to_next": next_reward["stars"] - total_stars if next_reward else 0
    }

# ============ MOOD TRACKER ENDPOINTS ============

@router.get("/kidszone/moods")
async def get_mood_options():
    """Get available mood emojis for kids"""
    return {"success": True, "moods": MOOD_EMOJIS}

@router.post("/kidszone/mood/log")
async def log_mood(entry: MoodLogEntry):
    """Log a child's mood"""
    mood = next((m for m in MOOD_EMOJIS if m["id"] == entry.mood_id), None)
    if not mood:
        raise HTTPException(status_code=404, detail="Mood not found")
    
    log_doc = {
        "id": str(uuid.uuid4()),
        "child_id": entry.child_id,
        "mood_id": entry.mood_id,
        "mood_emoji": mood["emoji"],
        "mood_name": mood["name"],
        "note": entry.note,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "time": datetime.now().strftime("%H:%M"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.alyne_mood_logs.insert_one(log_doc)
    
    # Generate a supportive response based on mood
    responses = {
        "happy": "That's wonderful! Keep spreading those happy vibes! 🌟",
        "excited": "Wow, how exciting! What made you feel this way? 🎉",
        "calm": "Feeling calm is so nice. You're doing great! 🌈",
        "tired": "It's okay to rest. Make sure to get some good sleep tonight! 💤",
        "sad": "It's okay to feel sad sometimes. Would you like a hug? 🤗",
        "angry": "Take a deep breath. Would you like to talk about it? 🫂",
        "scared": "It's brave to share that you're scared. You're safe! 💝",
        "sick": "I hope you feel better soon! Make sure to rest and drink water. 💚"
    }
    
    return {
        "success": True,
        "message": responses.get(entry.mood_id, "Thanks for sharing how you feel!"),
        "mood_logged": mood
    }

@router.get("/kidszone/mood/{child_id}")
async def get_mood_history(child_id: str, days: int = 7):
    """Get mood history for a child"""
    from_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    logs = await db.alyne_mood_logs.find(
        {"child_id": child_id, "date": {"$gte": from_date}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    # Calculate mood summary
    mood_counts = {}
    for log in logs:
        mood_id = log.get("mood_id")
        mood_counts[mood_id] = mood_counts.get(mood_id, 0) + 1
    
    return {
        "success": True,
        "mood_logs": logs,
        "mood_summary": mood_counts,
        "total_entries": len(logs)
    }

# ============ BEDTIME STORIES ENDPOINTS ============

@router.get("/kidszone/stories/themes")
async def get_story_themes():
    """Get available bedtime story themes"""
    return {"success": True, "themes": STORY_THEMES}

@router.post("/kidszone/stories/generate")
async def generate_bedtime_story(request: StoryRequest):
    """Generate an AI-powered health-themed bedtime story"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    theme = next((t for t in STORY_THEMES if t["id"] == request.theme_id), None)
    if not theme:
        raise HTTPException(status_code=404, detail="Story theme not found")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Use OpenAI for creative storytelling
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=request.session_id,
            system_message=f"""You are a gentle, loving storyteller creating bedtime stories for young children aged 3-8.
            
Create a SHORT, sweet bedtime story (150-200 words) that:
1. Features a child named {request.child_name} (age {request.age}) as the hero
2. Teaches about the health topic: {theme['name']}
3. Uses simple words a {request.age}-year-old can understand
4. Has a happy, comforting ending perfect for bedtime
5. Includes friendly characters like talking animals or magical helpers
6. Makes the health lesson fun and memorable

Keep it SHORT - this is a bedtime story! Use warm, soothing language. Include some descriptive emojis between paragraphs to make it engaging.

Start the story with "Once upon a time..." and end with "The End 🌙"
"""
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(
            text=f"Please create a bedtime story about {theme['name']} for {request.child_name}."
        )
        
        story = await chat.send_message(user_message)
        
        # Store the story
        story_doc = {
            "id": str(uuid.uuid4()),
            "child_id": request.child_id,
            "child_name": request.child_name,
            "theme_id": request.theme_id,
            "theme_name": theme["name"],
            "theme_icon": theme["icon"],
            "story": story,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.alyne_stories.insert_one(story_doc)
        
        return {
            "success": True,
            "story": story,
            "theme": theme,
            "story_id": story_doc["id"]
        }
        
    except Exception as e:
        logger.error(f"Story generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Could not generate story: {str(e)}")

@router.get("/kidszone/stories/{child_id}")
async def get_saved_stories(child_id: str):
    """Get previously generated stories for a child"""
    stories = await db.alyne_stories.find(
        {"child_id": child_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    
    return {"success": True, "stories": stories}

# ============ KIDS HEALTH BUDDY CHAT ============

@router.post("/kidszone/buddy/chat")
async def chat_with_health_buddy(chat_msg: KidsChatMessage):
    """Simple, child-friendly AI health buddy chat"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Use Claude for safe, thoughtful responses
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=chat_msg.session_id,
            system_message=f"""You are ALYNE Buddy, a friendly and kind health helper for children aged 3-8.

The child talking to you is {chat_msg.child_name}, who is {chat_msg.age} years old.

IMPORTANT RULES:
1. Use VERY simple words a {chat_msg.age}-year-old can understand
2. Keep responses SHORT (2-3 sentences max)
3. Be warm, friendly, and encouraging
4. Use fun emojis to make it engaging 🌟
5. If asked about health, give simple, safe advice
6. NEVER diagnose or give medical advice - always say "Let's ask mommy/daddy or the doctor!"
7. If the child seems upset or sick, be extra gentle and caring
8. Encourage healthy habits in a fun way
9. Be like a friendly teddy bear - comforting and supportive
10. If asked anything inappropriate, redirect to fun health topics

Example responses:
- "That's so cool! 🌟 Remember to drink water to stay strong!"
- "Aw, I'm sorry you feel ouchie. Let's tell mommy so she can help! 💝"
- "Yay! You're doing great! Keep being awesome! 🎉"

Always end with something positive or encouraging!
"""
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        user_message = UserMessage(text=chat_msg.message)
        response = await chat.send_message(user_message)
        
        # Store the chat
        chat_doc = {
            "id": str(uuid.uuid4()),
            "child_id": chat_msg.child_id,
            "child_name": chat_msg.child_name,
            "session_id": chat_msg.session_id,
            "message": chat_msg.message,
            "response": response,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.alyne_buddy_chats.insert_one(chat_doc)
        
        return {
            "success": True,
            "response": response,
            "buddy_name": "ALYNE Buddy"
        }
        
    except Exception as e:
        logger.error(f"Kids buddy chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

# ============ KIDS ZONE DASHBOARD ============

@router.get("/kidszone/dashboard/{child_id}")
async def get_kidszone_dashboard(child_id: str):
    """Get Kids Zone dashboard data for a child"""
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Get today's activities
    today_activities = await db.alyne_star_logs.find(
        {"child_id": child_id, "date": today},
        {"_id": 0}
    ).to_list(20)
    
    # Get total stars
    total_stars = await get_child_total_stars(child_id)
    
    # Get today's mood
    today_mood = await db.alyne_mood_logs.find_one(
        {"child_id": child_id, "date": today},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    
    # Get recent stories
    recent_stories = await db.alyne_stories.find(
        {"child_id": child_id},
        {"_id": 0, "story": 0}  # Exclude full story text for speed
    ).sort("created_at", -1).to_list(3)
    
    # Calculate streak
    streak = 0
    check_date = datetime.now()
    for i in range(30):
        date_str = check_date.strftime("%Y-%m-%d")
        day_logs = await db.alyne_star_logs.count_documents({"child_id": child_id, "date": date_str})
        if day_logs > 0:
            streak += 1
            check_date -= timedelta(days=1)
        else:
            break
    
    # Get earned rewards
    earned_rewards = [r for r in STAR_REWARDS if r["stars"] <= total_stars]
    next_reward = next((r for r in STAR_REWARDS if r["stars"] > total_stars), None)
    
    return {
        "success": True,
        "total_stars": total_stars,
        "streak_days": streak,
        "today_activities": len(today_activities),
        "today_mood": today_mood,
        "recent_stories": recent_stories,
        "earned_rewards": earned_rewards,
        "next_reward": next_reward,
        "activities_available": len(HEALTH_STAR_ACTIVITIES),
        "completed_today": [a["activity_id"] for a in today_activities]
    }

# ============ VOICE HEALTH BUDDY - Speech-to-Text & Text-to-Speech ============

from fastapi import UploadFile, File

@router.post("/kidszone/buddy/voice")
async def voice_chat_with_buddy(
    audio: UploadFile = File(...),
    child_id: str = None,
    child_name: str = "Friend",
    age: int = 5,
    session_id: str = None
):
    """Voice-based chat with Health Buddy - accepts audio, returns audio response"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    try:
        from emergentintegrations.llm.openai import OpenAISpeechToText, OpenAITextToSpeech
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import base64
        
        # Step 1: Convert speech to text using Whisper
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        audio_content = await audio.read()
        
        # Create a file-like object for the audio
        import io
        audio_file = io.BytesIO(audio_content)
        audio_file.name = audio.filename or "audio.webm"
        
        transcription = await stt.transcribe(
            file=audio_file,
            model="whisper-1",
            response_format="json",
            language="en"
        )
        
        user_message = transcription.text
        logger.info(f"Voice transcription: {user_message}")
        
        if not user_message or len(user_message.strip()) < 2:
            return {
                "success": False,
                "error": "Could not understand the audio. Please try again.",
                "transcription": ""
            }
        
        # Step 2: Get AI response using Claude
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id or f"voice_{datetime.now().timestamp()}",
            system_message=f"""You are ALYNE Buddy, a friendly and kind health helper for children aged 3-8.
            
The child talking to you is {child_name}, who is {age} years old.

IMPORTANT RULES FOR VOICE RESPONSES:
1. Use VERY simple words a {age}-year-old can understand
2. Keep responses VERY SHORT (1-2 sentences max) - this will be spoken aloud
3. Be warm, friendly, and encouraging
4. NEVER diagnose or give medical advice - always say "Let's ask mommy or daddy!"
5. If the child seems upset or sick, be extra gentle
6. Speak naturally as if talking to a child
7. Don't use emojis in your response (they can't be spoken)
8. End with something positive or a simple question
"""
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        ai_response = await chat.send_message(UserMessage(text=user_message))
        logger.info(f"AI response: {ai_response}")
        
        # Step 3: Convert text response to speech using TTS
        tts = OpenAITextToSpeech(api_key=EMERGENT_LLM_KEY)
        audio_bytes = await tts.generate_speech(
            text=ai_response,
            model="tts-1",
            voice="shimmer",  # Bright, cheerful voice perfect for kids
            speed=0.9  # Slightly slower for children to understand
        )
        
        # Convert to base64 for easy frontend handling
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        # Store the conversation
        if child_id:
            chat_doc = {
                "id": str(uuid.uuid4()),
                "child_id": child_id,
                "child_name": child_name,
                "session_id": session_id,
                "message": user_message,
                "response": ai_response,
                "is_voice": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.alyne_buddy_chats.insert_one(chat_doc)
        
        return {
            "success": True,
            "transcription": user_message,
            "response": ai_response,
            "audio_base64": audio_base64,
            "audio_format": "mp3"
        }
        
    except Exception as e:
        logger.error(f"Voice buddy error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Voice chat error: {str(e)}")

@router.post("/kidszone/buddy/speak")
async def text_to_speech(text: str, voice: str = "shimmer"):
    """Convert text to speech for reading stories or responses aloud"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    try:
        from emergentintegrations.llm.openai import OpenAITextToSpeech
        import base64
        
        # Validate text length
        if len(text) > 4000:
            text = text[:4000]  # Truncate to limit
        
        tts = OpenAITextToSpeech(api_key=EMERGENT_LLM_KEY)
        audio_bytes = await tts.generate_speech(
            text=text,
            model="tts-1",
            voice=voice,  # shimmer is cheerful, fable is storytelling
            speed=0.9
        )
        
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        return {
            "success": True,
            "audio_base64": audio_base64,
            "audio_format": "mp3"
        }
        
    except Exception as e:
        logger.error(f"TTS error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Speech generation error: {str(e)}")

# ============ CULTURAL HEALTH BRIDGE - For Indo-American Families ============

# Medicine Translation Database (Indian ↔ US equivalents)
MEDICINE_TRANSLATIONS = [
    {
        "indian_name": "Crocin",
        "us_name": "Tylenol (Acetaminophen)",
        "generic": "Paracetamol / Acetaminophen",
        "use": "Fever & Pain relief",
        "child_dosage": "10-15 mg/kg every 4-6 hours",
        "notes": "Same active ingredient, different brand names"
    },
    {
        "indian_name": "Brufen",
        "us_name": "Advil / Motrin (Ibuprofen)",
        "generic": "Ibuprofen",
        "use": "Fever, Pain & Inflammation",
        "child_dosage": "5-10 mg/kg every 6-8 hours",
        "notes": "Available as children's liquid in both countries"
    },
    {
        "indian_name": "Meftal-P",
        "us_name": "Not available in US",
        "generic": "Mefenamic Acid",
        "use": "Pain relief",
        "child_dosage": "Consult doctor",
        "notes": "Use Tylenol or Advil as alternative in US"
    },
    {
        "indian_name": "Digene",
        "us_name": "Tums / Mylanta",
        "generic": "Antacid",
        "use": "Indigestion, Acidity",
        "child_dosage": "Not for young children",
        "notes": "Consult pediatrician for children"
    },
    {
        "indian_name": "Ondem / Emeset",
        "us_name": "Zofran",
        "generic": "Ondansetron",
        "use": "Nausea & Vomiting",
        "child_dosage": "Prescription required",
        "notes": "Prescription medication in both countries"
    },
    {
        "indian_name": "Cetrizine (Cetzine)",
        "us_name": "Zyrtec",
        "generic": "Cetirizine",
        "use": "Allergies",
        "child_dosage": "2.5-5 mg based on age",
        "notes": "Children's version available OTC"
    },
    {
        "indian_name": "Allegra",
        "us_name": "Allegra",
        "generic": "Fexofenadine",
        "use": "Allergies",
        "child_dosage": "30 mg twice daily (6-11 yrs)",
        "notes": "Same brand in both countries"
    },
    {
        "indian_name": "ORS (Electral)",
        "us_name": "Pedialyte",
        "generic": "Oral Rehydration Salts",
        "use": "Dehydration, Diarrhea",
        "child_dosage": "As needed for hydration",
        "notes": "Essential for child illness recovery"
    },
    {
        "indian_name": "Vicks VapoRub",
        "us_name": "Vicks VapoRub",
        "generic": "Camphor/Menthol/Eucalyptus",
        "use": "Cold & Congestion",
        "child_dosage": "Not for under 2 years",
        "notes": "Same product in both countries"
    },
    {
        "indian_name": "Gripe Water",
        "us_name": "Gripe Water (Mommy's Bliss)",
        "generic": "Herbal supplement",
        "use": "Colic, Gas",
        "child_dosage": "Follow package directions",
        "notes": "Formulations may vary - check ingredients"
    },
    {
        "indian_name": "Lacto Calamine",
        "us_name": "Calamine Lotion",
        "generic": "Calamine",
        "use": "Skin irritation, Rashes",
        "child_dosage": "Apply as needed",
        "notes": "Safe for children"
    },
    {
        "indian_name": "Betadine",
        "us_name": "Betadine",
        "generic": "Povidone-Iodine",
        "use": "Antiseptic",
        "child_dosage": "External use only",
        "notes": "Same product available"
    },
]

# Indian Foods with US Pediatric Nutrition Info
INDIAN_FOODS_NUTRITION = [
    {
        "name": "Khichdi",
        "hindi": "खिचड़ी",
        "description": "Rice and lentil porridge",
        "us_nutrition": {
            "calories": "150 per cup",
            "protein": "5g",
            "carbs": "25g",
            "aap_approved": True,
            "introduction_age": "6 months",
            "benefits": ["Easy to digest", "Complete protein", "Iron from lentils"]
        },
        "allergens": [],
        "preparation_tip": "Start with thin consistency, thicken as baby grows"
    },
    {
        "name": "Ragi Porridge",
        "hindi": "रागी का दलिया",
        "description": "Finger millet cereal",
        "us_nutrition": {
            "calories": "120 per cup",
            "protein": "3g",
            "carbs": "22g",
            "calcium": "344mg (high!)",
            "aap_approved": True,
            "introduction_age": "6 months",
            "benefits": ["Calcium-rich", "Gluten-free", "Iron fortified"]
        },
        "allergens": [],
        "preparation_tip": "Mix with breast milk or formula initially"
    },
    {
        "name": "Dal Rice",
        "hindi": "दाल चावल",
        "description": "Lentils with rice",
        "us_nutrition": {
            "calories": "200 per cup",
            "protein": "8g",
            "carbs": "35g",
            "fiber": "4g",
            "aap_approved": True,
            "introduction_age": "8 months",
            "benefits": ["Complete amino acids", "Plant protein", "Fiber"]
        },
        "allergens": [],
        "preparation_tip": "Add ghee for healthy fats and better absorption"
    },
    {
        "name": "Idli",
        "hindi": "इडली",
        "description": "Steamed rice-lentil cakes",
        "us_nutrition": {
            "calories": "40 per idli",
            "protein": "2g",
            "carbs": "8g",
            "aap_approved": True,
            "introduction_age": "8 months",
            "benefits": ["Fermented (probiotics)", "Easy to digest", "Low fat"]
        },
        "allergens": [],
        "preparation_tip": "Mash for younger babies, soft finger food for older"
    },
    {
        "name": "Paneer",
        "hindi": "पनीर",
        "description": "Indian cottage cheese",
        "us_nutrition": {
            "calories": "265 per 100g",
            "protein": "18g",
            "calcium": "208mg",
            "aap_approved": True,
            "introduction_age": "8-10 months",
            "benefits": ["High protein", "Calcium", "Vegetarian protein source"]
        },
        "allergens": ["Dairy"],
        "preparation_tip": "Cut into small cubes as finger food"
    },
    {
        "name": "Poha",
        "hindi": "पोहा",
        "description": "Flattened rice",
        "us_nutrition": {
            "calories": "130 per cup",
            "protein": "2g",
            "carbs": "27g",
            "iron": "4mg (fortified)",
            "aap_approved": True,
            "introduction_age": "10 months",
            "benefits": ["Iron-fortified", "Light", "Easy to digest"]
        },
        "allergens": [],
        "preparation_tip": "Make soft with vegetables for toddlers"
    },
    {
        "name": "Upma",
        "hindi": "उपमा",
        "description": "Semolina porridge with vegetables",
        "us_nutrition": {
            "calories": "180 per cup",
            "protein": "5g",
            "carbs": "30g",
            "fiber": "2g",
            "aap_approved": True,
            "introduction_age": "10 months",
            "benefits": ["Vegetables added", "B vitamins", "Energy"]
        },
        "allergens": ["Gluten"],
        "preparation_tip": "Add colorful vegetables for nutrition"
    },
    {
        "name": "Ghee",
        "hindi": "घी",
        "description": "Clarified butter",
        "us_nutrition": {
            "calories": "120 per tbsp",
            "fat": "14g",
            "vitamin_a": "8% DV",
            "aap_approved": True,
            "introduction_age": "6 months",
            "benefits": ["Healthy fats for brain", "Fat-soluble vitamin absorption", "Lactose-free"]
        },
        "allergens": ["Dairy (trace)"],
        "preparation_tip": "Add small amount to foods for healthy fats"
    },
    {
        "name": "Banana (Kela)",
        "hindi": "केला",
        "description": "First food for many Indian babies",
        "us_nutrition": {
            "calories": "90 per medium",
            "potassium": "400mg",
            "fiber": "3g",
            "aap_approved": True,
            "introduction_age": "6 months",
            "benefits": ["Potassium", "Natural sweetness", "Easy first food"]
        },
        "allergens": [],
        "preparation_tip": "Mash ripe banana, can mix with breast milk"
    },
    {
        "name": "Curd/Yogurt (Dahi)",
        "hindi": "दही",
        "description": "Fresh yogurt",
        "us_nutrition": {
            "calories": "60 per cup",
            "protein": "11g",
            "calcium": "300mg",
            "aap_approved": True,
            "introduction_age": "6 months",
            "benefits": ["Probiotics", "Calcium", "Protein"]
        },
        "allergens": ["Dairy"],
        "preparation_tip": "Use plain, full-fat yogurt - no added sugar"
    },
]

# School Health Form Templates
SCHOOL_FORM_FIELDS = {
    "immunization_record": {
        "title": "Immunization Record",
        "required_vaccines": ["DTaP", "IPV", "MMR", "Varicella", "Hep B", "Hep A"],
        "fields": ["vaccine_name", "date_given", "doctor_name", "clinic_address"]
    },
    "physical_exam": {
        "title": "Physical Examination Form",
        "fields": ["height", "weight", "vision", "hearing", "blood_pressure", "doctor_signature", "date"]
    },
    "emergency_contact": {
        "title": "Emergency Contact Information",
        "fields": ["parent1_name", "parent1_phone", "parent2_name", "parent2_phone", "emergency_contact", "authorized_pickup"]
    },
    "medical_conditions": {
        "title": "Medical Conditions & Allergies",
        "fields": ["allergies", "chronic_conditions", "medications", "dietary_restrictions", "action_plan"]
    },
    "medication_authorization": {
        "title": "Medication Authorization Form",
        "fields": ["medication_name", "dosage", "frequency", "reason", "parent_signature", "doctor_signature"]
    }
}

class MedicineTranslateRequest(BaseModel):
    medicine_name: str
    direction: str = "indian_to_us"  # or "us_to_indian"

class HealthShareRequest(BaseModel):
    child_id: str
    recipient_name: str
    recipient_language: str = "hindi"  # hindi, tamil, telugu, gujarati, bengali
    include_records: list = ["growth", "vaccinations", "recent_visits"]
    sender_name: str

class SchoolFormRequest(BaseModel):
    child_id: str
    child_name: str
    form_types: list
    child_data: dict = {}

@router.get("/cultural-bridge/medicines")
async def get_medicine_translations():
    """Get the medicine translation database"""
    return {
        "success": True,
        "medicines": MEDICINE_TRANSLATIONS,
        "total": len(MEDICINE_TRANSLATIONS)
    }

@router.post("/cultural-bridge/medicines/translate")
async def translate_medicine(request: MedicineTranslateRequest):
    """Translate medicine name between Indian and US equivalents"""
    search_term = request.medicine_name.lower()
    
    results = []
    for med in MEDICINE_TRANSLATIONS:
        if request.direction == "indian_to_us":
            if search_term in med["indian_name"].lower() or search_term in med["generic"].lower():
                results.append(med)
        else:
            if search_term in med["us_name"].lower() or search_term in med["generic"].lower():
                results.append(med)
    
    if not results:
        # Use AI to help with unknown medicines
        if EMERGENT_LLM_KEY:
            try:
                from emergentintegrations.llm.chat import LlmChat, UserMessage
                chat = LlmChat(
                    api_key=EMERGENT_LLM_KEY,
                    session_id=f"med_translate_{datetime.now().timestamp()}",
                    system_message="""You are a pharmacist helping translate medicine names between India and USA.
                    Provide: generic name, US equivalent, use, and any important notes.
                    Be concise and accurate. If uncertain, say so."""
                ).with_model("anthropic", "claude-sonnet-4-5-20250929")
                
                direction_text = "Indian to US" if request.direction == "indian_to_us" else "US to Indian"
                ai_response = await chat.send_message(
                    UserMessage(text=f"Translate this medicine ({direction_text}): {request.medicine_name}")
                )
                
                return {
                    "success": True,
                    "matches": [],
                    "ai_suggestion": ai_response,
                    "note": "AI-generated suggestion - please verify with a pharmacist"
                }
            except:
                pass
    
    return {
        "success": True,
        "matches": results,
        "search_term": request.medicine_name
    }

@router.get("/cultural-bridge/foods")
async def get_indian_foods_nutrition():
    """Get Indian foods with US pediatric nutrition guidelines"""
    return {
        "success": True,
        "foods": INDIAN_FOODS_NUTRITION,
        "source": "Based on AAP (American Academy of Pediatrics) guidelines"
    }

@router.get("/cultural-bridge/foods/search")
async def search_indian_food(query: str):
    """Search for Indian food nutrition info"""
    query_lower = query.lower()
    results = [f for f in INDIAN_FOODS_NUTRITION if query_lower in f["name"].lower() or query_lower in f.get("hindi", "").lower()]
    return {"success": True, "results": results}

@router.post("/cultural-bridge/share-with-grandparents")
async def share_health_with_grandparents(request: HealthShareRequest):
    """Generate a health summary to share with grandparents in India (translated)"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    # Get child's health data
    child = await db.alyne_children.find_one({"id": request.child_id}, {"_id": 0})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    # Collect health records
    health_data = {"child": child}
    
    if "growth" in request.include_records:
        growth = await db.alyne_growth.find(
            {"child_id": request.child_id},
            {"_id": 0}
        ).sort("date", -1).to_list(5)
        health_data["growth"] = growth
    
    if "vaccinations" in request.include_records:
        vaccines = await db.alyne_vaccinations.find(
            {"child_id": request.child_id, "status": "completed"},
            {"_id": 0}
        ).to_list(20)
        health_data["vaccinations"] = vaccines
    
    # Generate summary in target language
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        language_names = {
            "hindi": "Hindi (हिंदी)",
            "tamil": "Tamil (தமிழ்)",
            "telugu": "Telugu (తెలుగు)",
            "gujarati": "Gujarati (ગુજરાતી)",
            "bengali": "Bengali (বাংলা)",
            "english": "English"
        }
        
        target_lang = language_names.get(request.recipient_language, "Hindi")
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"share_{datetime.now().timestamp()}",
            system_message=f"""You are helping create a health update about a grandchild for grandparents in India.
            
Write the message in {target_lang}. Make it warm and personal.
Include: child's name, age, recent growth/weight if available, completed vaccinations, and general health status.
Keep it conversational and loving - this is from parent to grandparent.
Start with a warm greeting appropriate to the language/culture."""
        ).with_model("openai", "gpt-5.2")
        
        summary = await chat.send_message(
            UserMessage(text=f"""Create a health update message from {request.sender_name} to {request.recipient_name}.
            
Child's data: {json.dumps(health_data, default=str)}

Make it warm, include the key health information, and write in {target_lang}.""")
        )
        
        # Store the share record
        share_doc = {
            "id": str(uuid.uuid4()),
            "child_id": request.child_id,
            "recipient_name": request.recipient_name,
            "language": request.recipient_language,
            "message": summary,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.alyne_health_shares.insert_one(share_doc)
        
        return {
            "success": True,
            "message": summary,
            "language": request.recipient_language,
            "share_id": share_doc["id"]
        }
        
    except Exception as e:
        logger.error(f"Health share generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Could not generate message: {str(e)}")

@router.get("/cultural-bridge/school-forms")
async def get_school_form_templates():
    """Get available school health form templates"""
    return {
        "success": True,
        "forms": SCHOOL_FORM_FIELDS,
        "description": "Common US school health form requirements"
    }

@router.post("/cultural-bridge/school-forms/generate")
async def generate_school_forms(request: SchoolFormRequest):
    """Generate filled school health forms for a child"""
    # Get child data
    child = await db.alyne_children.find_one({"id": request.child_id}, {"_id": 0})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    # Get vaccination records
    vaccinations = await db.alyne_vaccinations.find(
        {"child_id": request.child_id, "status": "completed"},
        {"_id": 0}
    ).to_list(50)
    
    # Get latest growth record
    latest_growth = await db.alyne_growth.find_one(
        {"child_id": request.child_id},
        {"_id": 0},
        sort=[("date", -1)]
    )
    
    generated_forms = {}
    
    for form_type in request.form_types:
        if form_type not in SCHOOL_FORM_FIELDS:
            continue
        
        form_template = SCHOOL_FORM_FIELDS[form_type]
        
        if form_type == "immunization_record":
            generated_forms["immunization_record"] = {
                "title": form_template["title"],
                "child_name": request.child_name,
                "date_of_birth": child.get("date_of_birth"),
                "vaccines": [
                    {
                        "vaccine_name": v.get("vaccine_name"),
                        "date_given": v.get("date_completed"),
                        "status": "Completed"
                    } for v in vaccinations
                ],
                "notes": "Please have your pediatrician sign this form"
            }
        
        elif form_type == "physical_exam":
            generated_forms["physical_exam"] = {
                "title": form_template["title"],
                "child_name": request.child_name,
                "date_of_birth": child.get("date_of_birth"),
                "height": latest_growth.get("height") if latest_growth else request.child_data.get("height"),
                "weight": latest_growth.get("weight") if latest_growth else request.child_data.get("weight"),
                "exam_date": datetime.now().strftime("%Y-%m-%d"),
                "notes": "To be completed by licensed physician"
            }
        
        elif form_type == "emergency_contact":
            generated_forms["emergency_contact"] = {
                "title": form_template["title"],
                "child_name": request.child_name,
                **request.child_data
            }
        
        elif form_type == "medical_conditions":
            generated_forms["medical_conditions"] = {
                "title": form_template["title"],
                "child_name": request.child_name,
                "allergies": child.get("allergies", request.child_data.get("allergies", [])),
                "conditions": child.get("medical_conditions", request.child_data.get("conditions", [])),
                "medications": request.child_data.get("medications", [])
            }
    
    return {
        "success": True,
        "forms": generated_forms,
        "child_name": request.child_name,
        "generated_at": datetime.now().isoformat()
    }

# ============ DIGITAL HEALTH TWIN - AI Predictive Health Model ============

class HealthTwinProfile(BaseModel):
    child_id: str
    family_history: dict = {}  # {"asthma": True, "allergies": ["pollen", "dust"], "diabetes": False}
    environment: dict = {}  # {"location": "urban", "pets": True, "smokers_home": False}
    birth_info: dict = {}  # {"premature": False, "birth_weight": 3.2}

class RiskAssessmentRequest(BaseModel):
    child_id: str
    assessment_type: str  # "asthma", "allergies", "growth", "comprehensive"

# Risk factors database
HEALTH_RISK_FACTORS = {
    "asthma": {
        "genetic": ["family_history_asthma", "family_history_allergies", "family_history_eczema"],
        "environmental": ["urban_living", "air_pollution", "second_hand_smoke", "mold_exposure"],
        "early_life": ["premature_birth", "low_birth_weight", "respiratory_infections"],
        "symptoms": ["frequent_cough", "wheezing", "shortness_of_breath", "chest_tightness"]
    },
    "allergies": {
        "genetic": ["family_history_allergies", "family_history_eczema", "family_history_asthma"],
        "environmental": ["pet_exposure", "pollen_region", "dust_mites", "food_sensitivities"],
        "early_life": ["formula_fed", "early_solid_foods", "antibiotic_use"],
        "symptoms": ["skin_rashes", "itchy_eyes", "runny_nose", "food_reactions"]
    },
    "growth_issues": {
        "genetic": ["family_short_stature", "family_growth_disorders", "thyroid_history"],
        "nutritional": ["picky_eating", "dairy_avoidance", "low_protein_diet", "vitamin_deficiency"],
        "medical": ["chronic_illness", "frequent_infections", "digestive_issues"],
        "developmental": ["delayed_milestones", "sleep_problems", "activity_level"]
    },
    "obesity": {
        "genetic": ["family_obesity", "family_diabetes", "metabolic_disorders"],
        "lifestyle": ["sedentary_behavior", "screen_time", "sugary_drinks", "processed_foods"],
        "environmental": ["limited_outdoor_play", "food_insecurity", "stress_eating"],
        "medical": ["hormonal_issues", "medications", "sleep_apnea"]
    }
}

@router.post("/health-twin/profile")
async def create_health_twin_profile(profile: HealthTwinProfile):
    """Create or update a child's Digital Health Twin profile"""
    existing = await db.alyne_health_twins.find_one({"child_id": profile.child_id})
    
    profile_doc = {
        "child_id": profile.child_id,
        "family_history": profile.family_history,
        "environment": profile.environment,
        "birth_info": profile.birth_info,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if existing:
        await db.alyne_health_twins.update_one(
            {"child_id": profile.child_id},
            {"$set": profile_doc}
        )
        return {"success": True, "message": "Health Twin profile updated", "is_new": False}
    else:
        profile_doc["id"] = str(uuid.uuid4())
        profile_doc["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.alyne_health_twins.insert_one(profile_doc)
        return {"success": True, "message": "Health Twin profile created", "is_new": True}

@router.get("/health-twin/profile/{child_id}")
async def get_health_twin_profile(child_id: str):
    """Get a child's Digital Health Twin profile"""
    profile = await db.alyne_health_twins.find_one({"child_id": child_id}, {"_id": 0})
    if not profile:
        return {"success": False, "profile": None, "message": "No Health Twin profile found"}
    return {"success": True, "profile": profile}

@router.post("/health-twin/assess-risk")
async def assess_health_risk(request: RiskAssessmentRequest):
    """Perform AI-powered health risk assessment"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    # Get child data
    child = await db.alyne_children.find_one({"id": request.child_id}, {"_id": 0})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    
    # Get Health Twin profile
    twin_profile = await db.alyne_health_twins.find_one({"child_id": request.child_id}, {"_id": 0})
    
    # Get growth history
    growth_history = await db.alyne_growth.find(
        {"child_id": request.child_id},
        {"_id": 0}
    ).sort("date", -1).to_list(10)
    
    # Get mood history (can indicate health patterns)
    mood_history = await db.alyne_mood_logs.find(
        {"child_id": request.child_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(30)
    
    # Calculate age
    dob = datetime.strptime(child.get("date_of_birth", "2020-01-01"), "%Y-%m-%d")
    age_months = (datetime.now() - dob).days // 30
    
    # Prepare data for AI analysis
    assessment_data = {
        "child": {
            "name": child.get("name"),
            "age_months": age_months,
            "gender": child.get("gender"),
            "region": child.get("region")
        },
        "health_twin_profile": twin_profile or {},
        "growth_data": growth_history,
        "mood_patterns": mood_history[:10],
        "risk_factors": HEALTH_RISK_FACTORS.get(request.assessment_type, HEALTH_RISK_FACTORS)
    }
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        assessment_types = {
            "asthma": "asthma and respiratory conditions",
            "allergies": "allergies and immune sensitivities",
            "growth": "growth and developmental issues",
            "comprehensive": "overall health risks including asthma, allergies, growth, and obesity"
        }
        
        focus = assessment_types.get(request.assessment_type, "overall health")
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"risk_{request.child_id}_{datetime.now().timestamp()}",
            system_message=f"""You are a pediatric health AI assistant performing a Digital Health Twin risk assessment.
            
Analyze the provided data to assess risk for {focus}.

Provide your assessment in this JSON structure:
{{
    "risk_level": "low" | "moderate" | "elevated" | "high",
    "risk_score": 0-100,
    "key_factors": ["factor1", "factor2", ...],
    "protective_factors": ["factor1", "factor2", ...],
    "recommendations": [
        {{"priority": "high"|"medium"|"low", "action": "description", "timeline": "immediate"|"short-term"|"long-term"}}
    ],
    "monitoring_suggestions": ["suggestion1", "suggestion2", ...],
    "when_to_see_doctor": "description of warning signs",
    "summary": "2-3 sentence summary for parents"
}}

IMPORTANT:
- Be evidence-based and cautious
- Never diagnose - only assess risk
- Always recommend professional consultation for elevated concerns
- Consider the family history and environmental factors
- Provide actionable, parent-friendly recommendations"""
        ).with_model("openai", "gpt-5.2")
        
        ai_response = await chat.send_message(
            UserMessage(text=f"Perform a {request.assessment_type} risk assessment for this child:\n\n{json.dumps(assessment_data, default=str)}")
        )
        
        # Try to parse as JSON
        try:
            # Extract JSON from response
            import re
            json_match = re.search(r'\{[\s\S]*\}', ai_response)
            if json_match:
                assessment_result = json.loads(json_match.group())
            else:
                assessment_result = {"raw_assessment": ai_response}
        except:
            assessment_result = {"raw_assessment": ai_response}
        
        # Store the assessment
        assessment_doc = {
            "id": str(uuid.uuid4()),
            "child_id": request.child_id,
            "assessment_type": request.assessment_type,
            "result": assessment_result,
            "data_used": assessment_data,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.alyne_risk_assessments.insert_one(assessment_doc)
        
        return {
            "success": True,
            "assessment_id": assessment_doc["id"],
            "assessment_type": request.assessment_type,
            "result": assessment_result,
            "disclaimer": "This is an AI-assisted risk assessment and not a medical diagnosis. Please consult your pediatrician for professional medical advice."
        }
        
    except Exception as e:
        logger.error(f"Risk assessment error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Assessment error: {str(e)}")

@router.get("/health-twin/assessments/{child_id}")
async def get_risk_assessments(child_id: str):
    """Get all risk assessments for a child"""
    assessments = await db.alyne_risk_assessments.find(
        {"child_id": child_id},
        {"_id": 0, "data_used": 0}  # Exclude raw data for brevity
    ).sort("created_at", -1).to_list(20)
    
    return {"success": True, "assessments": assessments}

@router.get("/health-twin/risk-factors")
async def get_risk_factor_database():
    """Get the risk factors database for reference"""
    return {
        "success": True,
        "risk_factors": HEALTH_RISK_FACTORS,
        "categories": list(HEALTH_RISK_FACTORS.keys())
    }

@router.get("/health-twin/dashboard/{child_id}")
async def get_health_twin_dashboard(child_id: str):
    """Get a comprehensive Digital Health Twin dashboard"""
    # Get profile
    profile = await db.alyne_health_twins.find_one({"child_id": child_id}, {"_id": 0})
    
    # Get latest assessments (one per type)
    latest_assessments = {}
    for assessment_type in ["asthma", "allergies", "growth", "comprehensive"]:
        assessment = await db.alyne_risk_assessments.find_one(
            {"child_id": child_id, "assessment_type": assessment_type},
            {"_id": 0, "data_used": 0},
            sort=[("created_at", -1)]
        )
        if assessment:
            latest_assessments[assessment_type] = assessment
    
    # Get child growth trend
    growth_data = await db.alyne_growth.find(
        {"child_id": child_id},
        {"_id": 0}
    ).sort("date", -1).to_list(12)
    
    # Calculate overall health score (simple algorithm)
    health_score = 85  # Base score
    if profile:
        if profile.get("environment", {}).get("smokers_home"):
            health_score -= 10
        if profile.get("birth_info", {}).get("premature"):
            health_score -= 5
    
    for assessment in latest_assessments.values():
        result = assessment.get("result", {})
        risk_score = result.get("risk_score", 50)
        if risk_score > 70:
            health_score -= 10
        elif risk_score > 50:
            health_score -= 5
    
    health_score = max(0, min(100, health_score))
    
    return {
        "success": True,
        "child_id": child_id,
        "has_profile": profile is not None,
        "profile_summary": {
            "family_history_items": len(profile.get("family_history", {})) if profile else 0,
            "environment_factors": len(profile.get("environment", {})) if profile else 0
        },
        "health_score": health_score,
        "health_status": "Excellent" if health_score >= 80 else "Good" if health_score >= 60 else "Monitor",
        "latest_assessments": latest_assessments,
        "growth_trend": growth_data[:6],
        "recommendations": [
            "Schedule regular pediatric checkups",
            "Maintain vaccination schedule",
            "Track growth monthly",
            "Complete Health Twin profile for personalized insights"
        ] if not profile else []
    }
