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
                "language": "en-IN"
            },
            {
                "id": "usa",
                "name": "United States",
                "flag": "🇺🇸",
                "vaccination_schedule": "CDC",
                "id_fields": ["insurance_provider", "insurance_id"],
                "currency": "USD",
                "language": "en-US"
            }
        ]
    }
