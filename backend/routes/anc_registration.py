"""
Nevika Cura - ANC (Antenatal Care) Patient Registration System
For Staff at Pushpa and Amnion clinics
Includes: Registration, Digital Form, PDF Generation, Follow-ups, Evara Migration, Kick Counter
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta, date
import uuid
import logging
import json
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/anc", tags=["ANC Registration"])

# Database and notification references
db = None
JWT_SECRET = None
JWT_ALGORITHM = "HS256"
send_email_notification = None
send_sms_notification = None

def set_db(database):
    global db
    db = database

def set_jwt_config(secret, algorithm="HS256"):
    global JWT_SECRET, JWT_ALGORITHM
    JWT_SECRET = secret
    JWT_ALGORITHM = algorithm

def set_notification_functions(email_func, sms_func):
    global send_email_notification, send_sms_notification
    send_email_notification = email_func
    send_sms_notification = sms_func

# ============ MODELS ============

class ANCPatientRegistration(BaseModel):
    # Patient Details
    patient_name: str
    age: int
    date_of_birth: Optional[str] = None
    phone: str
    email: Optional[str] = None
    address: str
    aadhaar: Optional[str] = None
    
    # Husband Details
    husband_name: str
    husband_phone: Optional[str] = None
    husband_occupation: Optional[str] = None
    
    # Obstetric Details
    lmp: str  # Last Menstrual Period (YYYY-MM-DD)
    gravida: int = 1  # Total pregnancies
    para: int = 0  # Deliveries after 20 weeks
    abortion: int = 0  # Miscarriages/abortions
    living: int = 0  # Living children
    
    # Medical Details
    blood_group: Optional[str] = None
    rh_factor: Optional[str] = None  # Positive/Negative
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    
    # Medical History
    previous_cesarean: bool = False
    diabetes: bool = False
    hypertension: bool = False
    thyroid: bool = False
    other_conditions: Optional[str] = None
    
    # Clinic Info
    clinic: str  # pushpa or amnion
    registered_by: str  # staff username
    doctor_assigned: Optional[str] = None
    
    # Migration
    evara_user_id: Optional[str] = None  # If migrating from Evara

class ANCVisitRecord(BaseModel):
    registration_id: str
    visit_date: str
    gestational_weeks: int
    weight_kg: float
    bp_systolic: int
    bp_diastolic: int
    fundal_height: Optional[float] = None
    fetal_heart_rate: Optional[int] = None
    presentation: Optional[str] = None  # cephalic, breech, transverse
    edema: bool = False
    complaints: Optional[str] = None
    investigations: Optional[Dict[str, Any]] = None
    medications: Optional[List[str]] = None
    advice: Optional[str] = None
    next_visit_date: Optional[str] = None
    doctor_notes: Optional[str] = None
    recorded_by: str  # doctor username

class KickCountEntry(BaseModel):
    registration_id: str
    date: str
    start_time: str
    kicks_count: int
    duration_minutes: int
    notes: Optional[str] = None

class FollowUpSchedule(BaseModel):
    registration_id: str
    visit_dates: List[str]
    doctor: str

# ============ HELPER FUNCTIONS ============

def calculate_edd(lmp_date: str) -> str:
    """Calculate Expected Delivery Date (Naegele's Rule: LMP + 280 days)"""
    lmp = datetime.strptime(lmp_date, "%Y-%m-%d")
    edd = lmp + timedelta(days=280)
    return edd.strftime("%Y-%m-%d")

def calculate_gestational_age(lmp_date: str) -> dict:
    """Calculate current gestational age in weeks and days"""
    lmp = datetime.strptime(lmp_date, "%Y-%m-%d")
    today = datetime.now()
    days = (today - lmp).days
    weeks = days // 7
    remaining_days = days % 7
    return {"weeks": weeks, "days": remaining_days, "total_days": days}

def generate_registration_id(clinic: str) -> str:
    """Generate unique ANC registration ID"""
    year = datetime.now().strftime("%Y")
    clinic_code = clinic.upper()[:3]
    
    # Get count for this year/clinic
    # Format: ANC-PUS-2026-0001
    return f"ANC-{clinic_code}-{year}-{uuid.uuid4().hex[:6].upper()}"

# ============ REGISTRATION ENDPOINTS ============

@router.post("/register")
async def register_anc_patient(registration: ANCPatientRegistration):
    """Register a new ANC patient"""
    
    # Generate registration ID
    reg_id = generate_registration_id(registration.clinic)
    
    # Calculate EDD
    edd = calculate_edd(registration.lmp)
    gestational_age = calculate_gestational_age(registration.lmp)
    
    # Check if phone already registered
    existing = await db.anc_patients.find_one({"phone": registration.phone, "status": "active"})
    if existing:
        return {
            "success": False,
            "message": "Patient already registered with this phone",
            "existing_id": existing.get("registration_id")
        }
    
    # Create patient record
    patient_doc = {
        "registration_id": reg_id,
        "patient_name": registration.patient_name,
        "age": registration.age,
        "date_of_birth": registration.date_of_birth,
        "phone": registration.phone,
        "email": registration.email,
        "address": registration.address,
        "aadhaar": registration.aadhaar,
        
        "husband_name": registration.husband_name,
        "husband_phone": registration.husband_phone,
        "husband_occupation": registration.husband_occupation,
        
        "lmp": registration.lmp,
        "edd": edd,
        "gravida": registration.gravida,
        "para": registration.para,
        "abortion": registration.abortion,
        "living": registration.living,
        "obstetric_formula": f"G{registration.gravida}P{registration.para}A{registration.abortion}L{registration.living}",
        
        "blood_group": registration.blood_group,
        "rh_factor": registration.rh_factor,
        "height_cm": registration.height_cm,
        "initial_weight_kg": registration.weight_kg,
        "initial_bp": f"{registration.bp_systolic}/{registration.bp_diastolic}" if registration.bp_systolic else None,
        
        "medical_history": {
            "previous_cesarean": registration.previous_cesarean,
            "diabetes": registration.diabetes,
            "hypertension": registration.hypertension,
            "thyroid": registration.thyroid,
            "other": registration.other_conditions
        },
        
        "clinic": registration.clinic,
        "doctor_assigned": registration.doctor_assigned,
        "registered_by": registration.registered_by,
        "evara_user_id": registration.evara_user_id,
        
        "status": "active",
        "visits": [],
        "investigations": [],
        "kick_counts": [],
        
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.anc_patients.insert_one(patient_doc)
    
    # If migrating from Evara, update Evara record
    if registration.evara_user_id:
        await db.evara_subscriptions.update_one(
            {"user_id": registration.evara_user_id},
            {"$set": {"migrated_to_anc": reg_id, "migration_date": datetime.now(timezone.utc).isoformat()}}
        )
    
    logger.info(f"ANC patient registered: {reg_id}")
    
    return {
        "success": True,
        "registration_id": reg_id,
        "patient_name": registration.patient_name,
        "edd": edd,
        "gestational_age": gestational_age,
        "clinic": registration.clinic,
        "message": f"Patient registered successfully. ID: {reg_id}"
    }

@router.get("/patient/{registration_id}")
async def get_anc_patient(registration_id: str):
    """Get ANC patient details"""
    patient = await db.anc_patients.find_one(
        {"registration_id": registration_id},
        {"_id": 0}
    )
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Calculate current gestational age
    gestational_age = calculate_gestational_age(patient.get("lmp"))
    patient["current_gestational_age"] = gestational_age
    
    # Get visit count
    visits = await db.anc_visits.count_documents({"registration_id": registration_id})
    patient["total_visits"] = visits
    
    return {"success": True, "patient": patient}

@router.get("/patients/{clinic}")
async def get_clinic_anc_patients(clinic: str, status: str = "active"):
    """Get all ANC patients for a clinic"""
    patients = await db.anc_patients.find(
        {"clinic": {"$regex": clinic, "$options": "i"}, "status": status},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    # Add gestational age to each
    for p in patients:
        p["current_gestational_age"] = calculate_gestational_age(p.get("lmp"))
    
    return {"success": True, "patients": patients, "total": len(patients)}

@router.get("/search")
async def search_anc_patient(query: str, clinic: Optional[str] = None):
    """Search ANC patients by name, phone, or registration ID"""
    search_filter = {
        "$or": [
            {"patient_name": {"$regex": query, "$options": "i"}},
            {"phone": {"$regex": query}},
            {"registration_id": {"$regex": query, "$options": "i"}}
        ],
        "status": "active"
    }
    
    if clinic:
        search_filter["clinic"] = {"$regex": clinic, "$options": "i"}
    
    patients = await db.anc_patients.find(search_filter, {"_id": 0}).limit(20).to_list(20)
    
    for p in patients:
        p["current_gestational_age"] = calculate_gestational_age(p.get("lmp"))
    
    return {"success": True, "results": patients}

# ============ VISIT RECORDS ============

@router.post("/visit")
async def record_anc_visit(visit: ANCVisitRecord):
    """Record an ANC visit/checkup"""
    
    # Verify patient exists
    patient = await db.anc_patients.find_one({"registration_id": visit.registration_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    visit_doc = {
        "id": str(uuid.uuid4()),
        "registration_id": visit.registration_id,
        "visit_date": visit.visit_date,
        "gestational_weeks": visit.gestational_weeks,
        "weight_kg": visit.weight_kg,
        "bp": f"{visit.bp_systolic}/{visit.bp_diastolic}",
        "fundal_height": visit.fundal_height,
        "fetal_heart_rate": visit.fetal_heart_rate,
        "presentation": visit.presentation,
        "edema": visit.edema,
        "complaints": visit.complaints,
        "investigations": visit.investigations,
        "medications": visit.medications,
        "advice": visit.advice,
        "next_visit_date": visit.next_visit_date,
        "doctor_notes": visit.doctor_notes,
        "recorded_by": visit.recorded_by,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.anc_visits.insert_one(visit_doc)
    
    # Update patient's last visit info
    await db.anc_patients.update_one(
        {"registration_id": visit.registration_id},
        {"$set": {
            "last_visit_date": visit.visit_date,
            "last_weight_kg": visit.weight_kg,
            "last_bp": f"{visit.bp_systolic}/{visit.bp_diastolic}",
            "next_visit_date": visit.next_visit_date,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Send email reminder for next visit
    if visit.next_visit_date and patient.get("email") and send_email_notification:
        try:
            await send_email_notification(
                patient.get("email"),
                "ANC Visit Scheduled - Nevika Cura",
                f"""
                <h2>ANC Visit Reminder</h2>
                <p>Dear {patient.get('patient_name')},</p>
                <p>Your next ANC visit is scheduled for <strong>{visit.next_visit_date}</strong>.</p>
                <p><strong>Registration ID:</strong> {visit.registration_id}</p>
                <p><strong>Current Week:</strong> {visit.gestational_weeks} weeks</p>
                <p>Please arrive 15 minutes before your appointment.</p>
                <p>Best wishes for a healthy pregnancy!</p>
                <p>Team Nevika Cura</p>
                """
            )
        except Exception as e:
            logger.error(f"Failed to send visit reminder: {e}")
    
    return {
        "success": True,
        "visit_id": visit_doc["id"],
        "next_visit": visit.next_visit_date,
        "message": "Visit recorded successfully"
    }

@router.get("/visits/{registration_id}")
async def get_patient_visits(registration_id: str):
    """Get all visits for an ANC patient"""
    visits = await db.anc_visits.find(
        {"registration_id": registration_id},
        {"_id": 0}
    ).sort("visit_date", -1).to_list(50)
    
    return {"success": True, "visits": visits, "total": len(visits)}

# ============ KICK COUNTER ============

@router.post("/kick-count")
async def log_kick_count(entry: KickCountEntry):
    """Log baby kick count (from 28 weeks)"""
    
    # Verify patient
    patient = await db.anc_patients.find_one({"registration_id": entry.registration_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Check gestational age (kicks usually counted from 28 weeks)
    gestational = calculate_gestational_age(patient.get("lmp"))
    if gestational["weeks"] < 24:
        return {
            "success": False,
            "message": "Kick counting is typically started from 24-28 weeks",
            "current_weeks": gestational["weeks"]
        }
    
    kick_doc = {
        "id": str(uuid.uuid4()),
        "registration_id": entry.registration_id,
        "date": entry.date,
        "start_time": entry.start_time,
        "kicks_count": entry.kicks_count,
        "duration_minutes": entry.duration_minutes,
        "notes": entry.notes,
        "gestational_weeks": gestational["weeks"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.anc_kick_counts.insert_one(kick_doc)
    
    # Alert if kicks are low (less than 10 in 2 hours is concerning)
    alert = None
    if entry.kicks_count < 10 and entry.duration_minutes >= 120:
        alert = "Low kick count detected. Please consult your doctor if movement decreases."
    
    return {
        "success": True,
        "kick_id": kick_doc["id"],
        "message": "Kick count logged",
        "alert": alert
    }

@router.get("/kick-counts/{registration_id}")
async def get_kick_counts(registration_id: str, days: int = 7):
    """Get kick count history"""
    from_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    kicks = await db.anc_kick_counts.find(
        {"registration_id": registration_id, "date": {"$gte": from_date}},
        {"_id": 0}
    ).sort("date", -1).to_list(100)
    
    # Calculate average
    avg_kicks = sum(k.get("kicks_count", 0) for k in kicks) / len(kicks) if kicks else 0
    
    return {
        "success": True,
        "kick_counts": kicks,
        "average_kicks": round(avg_kicks, 1),
        "total_entries": len(kicks)
    }

# ============ FOLLOW-UP SCHEDULING ============

@router.post("/schedule-followups")
async def schedule_followup_visits(schedule: FollowUpSchedule):
    """Schedule multiple follow-up visits"""
    
    patient = await db.anc_patients.find_one({"registration_id": schedule.registration_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Create scheduled visits
    scheduled = []
    for visit_date in schedule.visit_dates:
        scheduled.append({
            "id": str(uuid.uuid4()),
            "registration_id": schedule.registration_id,
            "scheduled_date": visit_date,
            "doctor": schedule.doctor,
            "status": "scheduled",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    if scheduled:
        await db.anc_scheduled_visits.insert_many(scheduled)
    
    # Update patient record
    await db.anc_patients.update_one(
        {"registration_id": schedule.registration_id},
        {"$set": {
            "scheduled_visits": schedule.visit_dates,
            "doctor_assigned": schedule.doctor
        }}
    )
    
    return {
        "success": True,
        "scheduled_count": len(scheduled),
        "visits": schedule.visit_dates
    }

@router.get("/scheduled-visits/{registration_id}")
async def get_scheduled_visits(registration_id: str):
    """Get scheduled visits for a patient"""
    visits = await db.anc_scheduled_visits.find(
        {"registration_id": registration_id},
        {"_id": 0}
    ).sort("scheduled_date", 1).to_list(20)
    
    return {"success": True, "scheduled_visits": visits}

# ============ EVARA MIGRATION ============

@router.get("/evara-users")
async def get_evara_users_for_migration():
    """Get Evara users eligible for ANC migration"""
    
    # Find Evara users with pregnancy-related subscriptions
    evara_users = await db.evara_subscriptions.find({
        "subscription_type": {"$in": ["pregnancy", "fertility", "prenatal"]},
        "migrated_to_anc": {"$exists": False}
    }, {"_id": 0}).to_list(100)
    
    return {"success": True, "eligible_users": evara_users}

@router.post("/migrate-from-evara")
async def migrate_evara_to_anc(evara_user_id: str, clinic: str, registered_by: str):
    """Migrate an Evara user to ANC registration"""
    
    # Get Evara user data
    evara_user = await db.evara_subscriptions.find_one({"user_id": evara_user_id})
    if not evara_user:
        raise HTTPException(status_code=404, detail="Evara user not found")
    
    # Get user profile
    user_profile = await db.users.find_one({"id": evara_user_id})
    
    # Pre-fill registration with available data
    prefill_data = {
        "evara_user_id": evara_user_id,
        "patient_name": user_profile.get("name") if user_profile else "",
        "phone": user_profile.get("phone") if user_profile else "",
        "email": user_profile.get("email") if user_profile else "",
        "clinic": clinic,
        "registered_by": registered_by,
        "evara_data": {
            "subscription_type": evara_user.get("subscription_type"),
            "subscribed_at": evara_user.get("created_at"),
            "menstrual_data": evara_user.get("menstrual_data"),
            "health_records": evara_user.get("health_records")
        }
    }
    
    return {
        "success": True,
        "prefill_data": prefill_data,
        "message": "Data retrieved from Evara. Please complete the ANC registration form."
    }

# ============ PDF GENERATION ============

@router.get("/generate-pdf/{registration_id}")
async def generate_anc_pdf(registration_id: str):
    """Generate ANC card/form as PDF data"""
    
    patient = await db.anc_patients.find_one(
        {"registration_id": registration_id},
        {"_id": 0}
    )
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get visits
    visits = await db.anc_visits.find(
        {"registration_id": registration_id},
        {"_id": 0}
    ).sort("visit_date", 1).to_list(20)
    
    gestational = calculate_gestational_age(patient.get("lmp"))
    
    # Generate HTML for PDF (can be converted client-side or server-side)
    pdf_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; padding: 20px; }}
            .header {{ text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 10px; }}
            .header h1 {{ color: #0d9488; margin: 0; }}
            .section {{ margin: 20px 0; }}
            .section h3 {{ color: #0d9488; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }}
            .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }}
            .field {{ margin: 5px 0; }}
            .field label {{ font-weight: bold; color: #374151; }}
            .highlight {{ background: #f0fdfa; padding: 10px; border-radius: 5px; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
            th, td {{ border: 1px solid #e5e7eb; padding: 8px; text-align: left; }}
            th {{ background: #0d9488; color: white; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>NEVIKA CURA - ANC CARD</h1>
            <p>{patient.get('clinic', '').upper()} CLINIC</p>
        </div>
        
        <div class="highlight" style="margin-top: 20px;">
            <strong>Registration ID:</strong> {registration_id}<br>
            <strong>EDD (Expected Delivery):</strong> {patient.get('edd')}<br>
            <strong>Current Week:</strong> {gestational['weeks']} weeks {gestational['days']} days
        </div>
        
        <div class="section">
            <h3>Patient Information</h3>
            <div class="grid">
                <div class="field"><label>Name:</label> {patient.get('patient_name')}</div>
                <div class="field"><label>Age:</label> {patient.get('age')} years</div>
                <div class="field"><label>Phone:</label> {patient.get('phone')}</div>
                <div class="field"><label>Blood Group:</label> {patient.get('blood_group', 'N/A')} {patient.get('rh_factor', '')}</div>
                <div class="field"><label>Address:</label> {patient.get('address')}</div>
                <div class="field"><label>Husband:</label> {patient.get('husband_name')}</div>
            </div>
        </div>
        
        <div class="section">
            <h3>Obstetric History</h3>
            <div class="grid">
                <div class="field"><label>LMP:</label> {patient.get('lmp')}</div>
                <div class="field"><label>Formula:</label> {patient.get('obstetric_formula')}</div>
                <div class="field"><label>Height:</label> {patient.get('height_cm', 'N/A')} cm</div>
                <div class="field"><label>Initial Weight:</label> {patient.get('initial_weight_kg', 'N/A')} kg</div>
            </div>
        </div>
        
        <div class="section">
            <h3>Medical History</h3>
            <p>Previous Cesarean: {'Yes' if patient.get('medical_history', {}).get('previous_cesarean') else 'No'}</p>
            <p>Diabetes: {'Yes' if patient.get('medical_history', {}).get('diabetes') else 'No'}</p>
            <p>Hypertension: {'Yes' if patient.get('medical_history', {}).get('hypertension') else 'No'}</p>
            <p>Thyroid: {'Yes' if patient.get('medical_history', {}).get('thyroid') else 'No'}</p>
        </div>
        
        <div class="section">
            <h3>Visit Records</h3>
            <table>
                <tr>
                    <th>Date</th>
                    <th>Week</th>
                    <th>Weight</th>
                    <th>BP</th>
                    <th>FHR</th>
                    <th>Notes</th>
                </tr>
                {''.join(f"<tr><td>{v.get('visit_date')}</td><td>{v.get('gestational_weeks')}w</td><td>{v.get('weight_kg')}kg</td><td>{v.get('bp')}</td><td>{v.get('fetal_heart_rate', 'N/A')}</td><td>{v.get('doctor_notes', '')[:30]}</td></tr>" for v in visits)}
            </table>
        </div>
        
        <div style="margin-top: 30px; text-align: center; color: #6b7280; font-size: 12px;">
            Generated on {datetime.now().strftime('%Y-%m-%d %H:%M')} | Nevika Cura Healthcare
        </div>
    </body>
    </html>
    """
    
    return {
        "success": True,
        "registration_id": registration_id,
        "patient_name": patient.get("patient_name"),
        "html_content": pdf_html,
        "whatsapp_text": f"ANC Card for {patient.get('patient_name')}\nID: {registration_id}\nEDD: {patient.get('edd')}\nWeek: {gestational['weeks']}w {gestational['days']}d\nClinic: {patient.get('clinic').upper()}"
    }

# ============ DASHBOARD ============

@router.get("/dashboard/{clinic}")
async def get_anc_dashboard(clinic: str):
    """Get ANC dashboard for a clinic"""
    
    # Total active patients
    total_active = await db.anc_patients.count_documents({
        "clinic": {"$regex": clinic, "$options": "i"},
        "status": "active"
    })
    
    # Patients due this week
    today = datetime.now()
    week_end = today + timedelta(days=7)
    
    due_this_week = await db.anc_patients.count_documents({
        "clinic": {"$regex": clinic, "$options": "i"},
        "status": "active",
        "next_visit_date": {
            "$gte": today.strftime("%Y-%m-%d"),
            "$lte": week_end.strftime("%Y-%m-%d")
        }
    })
    
    # High risk patients (simplified - has medical conditions)
    high_risk = await db.anc_patients.count_documents({
        "clinic": {"$regex": clinic, "$options": "i"},
        "status": "active",
        "$or": [
            {"medical_history.previous_cesarean": True},
            {"medical_history.diabetes": True},
            {"medical_history.hypertension": True}
        ]
    })
    
    # Recent registrations (last 7 days)
    week_ago = (today - timedelta(days=7)).isoformat()
    recent = await db.anc_patients.count_documents({
        "clinic": {"$regex": clinic, "$options": "i"},
        "created_at": {"$gte": week_ago}
    })
    
    # Deliveries due this month
    month_start = today.replace(day=1).strftime("%Y-%m-%d")
    month_end = (today.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    
    due_this_month = await db.anc_patients.count_documents({
        "clinic": {"$regex": clinic, "$options": "i"},
        "status": "active",
        "edd": {"$gte": month_start, "$lte": month_end.strftime("%Y-%m-%d")}
    })
    
    return {
        "success": True,
        "clinic": clinic,
        "dashboard": {
            "total_active_patients": total_active,
            "due_this_week": due_this_week,
            "high_risk_patients": high_risk,
            "new_registrations_7d": recent,
            "deliveries_due_this_month": due_this_month
        }
    }


# ============ ANC FORM LINK SYSTEM ============

class ANCFormSendRequest(BaseModel):
    patient_id: Optional[str] = None  # Existing patient or new
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    send_via: str = "both"  # email, sms, both
    clinic: str = "Pushpa Clinic"
    doctor: str = "Dr. Neha Patel"

class ANCFormSubmission(BaseModel):
    full_name: str
    age: Optional[str] = None
    date_of_birth: Optional[str] = None
    blood_group: Optional[str] = None
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    gravida: Optional[str] = None
    para: Optional[str] = None
    abortions: Optional[str] = None
    living_children: Optional[str] = None
    lmp_date: str
    edd_date: Optional[str] = None
    medical_conditions: Optional[List[str]] = []
    allergies: Optional[str] = None
    current_medications: Optional[str] = None
    previous_surgeries: Optional[str] = None
    family_diabetes: bool = False
    family_hypertension: bool = False
    family_twins: bool = False
    family_genetic: Optional[str] = None
    pregnancy_symptoms: Optional[str] = None
    concerns: Optional[str] = None
    preferred_hospital: Optional[str] = None
    consent_given: bool = False

@router.post("/form/send")
async def send_anc_form_link(data: ANCFormSendRequest):
    """Send ANC form link to patient via Email/SMS"""
    
    # Create form record
    form_id = str(uuid.uuid4())
    base_url = os.environ.get("FRONTEND_URL", "https://healthcare-dash-16.preview.emergentagent.com")
    form_link = f"{base_url}/anc-form/{form_id}"
    
    form_record = {
        "id": form_id,
        "patient_id": data.patient_id,
        "patient_name": data.patient_name,
        "patient_phone": data.patient_phone,
        "patient_email": data.patient_email,
        "clinic": data.clinic,
        "doctor": data.doctor,
        "status": "allotted",  # allotted -> filled
        "created_at": datetime.now(timezone.utc).isoformat(),
        "sent_via": data.send_via,
        "form_link": form_link,
        "form_data": None,
        "submitted_at": None
    }
    
    await db.anc_forms.insert_one(form_record)
    
    # Send Email
    email_sent = False
    if data.patient_email and data.send_via in ["email", "both"]:
        try:
            email_html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #ec4899, #8b5cf6); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">👶 ANC Registration Form</h1>
                    <p style="margin: 10px 0 0; opacity: 0.9;">Nevika Cura Healthcare</p>
                </div>
                
                <div style="background: #fdf4ff; padding: 25px; border: 1px solid #f5d0fe;">
                    <p style="color: #333; font-size: 16px;">Dear <strong>{data.patient_name}</strong>,</p>
                    
                    <p style="color: #555;">Please fill out your Antenatal Care (ANC) registration form by clicking the button below:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{form_link}" style="background: linear-gradient(135deg, #ec4899, #8b5cf6); color: white; padding: 15px 40px; border-radius: 30px; text-decoration: none; font-weight: bold; display: inline-block;">
                            Fill ANC Form
                        </a>
                    </div>
                    
                    <p style="color: #555; font-size: 14px;">Or copy this link: <br><a href="{form_link}" style="color: #8b5cf6; word-break: break-all;">{form_link}</a></p>
                    
                    <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin-top: 20px;">
                        <p style="margin: 0; color: #92400e; font-size: 14px;">
                            <strong>📋 Instructions:</strong><br>
                            1. Click the link above to open the form<br>
                            2. Fill in all required information<br>
                            3. Submit the form online<br>
                            4. Our team will contact you to schedule your first ANC visit
                        </p>
                    </div>
                </div>
                
                <div style="background: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 12px 12px;">
                    <p style="color: #64748b; font-size: 12px; margin: 0;">
                        {data.clinic} | {data.doctor}<br>
                        For queries: <a href="mailto:nevikacura@gmail.com" style="color: #8b5cf6;">nevikacura@gmail.com</a>
                    </p>
                </div>
            </div>
            """
            
            if send_email_notification:
                await send_email_notification(
                    data.patient_email,
                    "📝 Fill Your ANC Registration Form - Nevika Cura",
                    email_html
                )
                email_sent = True
                logger.info(f"ANC form email sent to {data.patient_email}")
        except Exception as e:
            logger.error(f"Failed to send ANC form email: {e}")
    
    # Send SMS
    sms_sent = False
    if data.patient_phone and data.send_via in ["sms", "both"]:
        try:
            sms_text = f"Dear {data.patient_name}, Please fill your ANC Registration Form: {form_link} - Nevika Cura Healthcare ({data.clinic})"
            
            if send_sms_notification:
                await send_sms_notification(data.patient_phone, sms_text)
                sms_sent = True
                logger.info(f"ANC form SMS sent to {data.patient_phone}")
        except Exception as e:
            logger.error(f"Failed to send ANC form SMS: {e}")
    
    return {
        "success": True,
        "form_id": form_id,
        "form_link": form_link,
        "email_sent": email_sent,
        "sms_sent": sms_sent,
        "message": f"ANC form link sent to {data.patient_name}"
    }

@router.get("/form/{form_id}")
async def get_anc_form(form_id: str):
    """Get ANC form details for patient to fill"""
    form = await db.anc_forms.find_one({"id": form_id}, {"_id": 0})
    
    if not form:
        return {"error": "Form not found or expired"}
    
    return {
        "id": form["id"],
        "status": form["status"],
        "patient": {
            "name": form.get("patient_name"),
            "phone": form.get("patient_phone"),
            "email": form.get("patient_email")
        },
        "clinic": form.get("clinic"),
        "doctor": form.get("doctor"),
        "form_data": form.get("form_data") if form["status"] == "filled" else None
    }

@router.post("/form/{form_id}/submit")
async def submit_anc_form(form_id: str, data: ANCFormSubmission):
    """Submit filled ANC form"""
    form = await db.anc_forms.find_one({"id": form_id})
    
    if not form:
        return {"error": "Form not found"}
    
    if form["status"] == "filled":
        return {"error": "Form already submitted"}
    
    # Update form with submitted data
    await db.anc_forms.update_one(
        {"id": form_id},
        {"$set": {
            "status": "filled",
            "form_data": data.dict(),
            "submitted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Send notification to admin/staff
    try:
        if send_email_notification:
            admin_html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #22c55e; color: white; padding: 20px; text-align: center;">
                    <h2 style="margin: 0;">✅ New ANC Form Submitted</h2>
                </div>
                <div style="padding: 20px; background: #f0fdf4;">
                    <p><strong>Patient:</strong> {data.full_name}</p>
                    <p><strong>Phone:</strong> {data.phone}</p>
                    <p><strong>LMP:</strong> {data.lmp_date}</p>
                    <p><strong>EDD:</strong> {data.edd_date or 'Not specified'}</p>
                    <p><strong>Clinic:</strong> {form.get('clinic')}</p>
                    <p><strong>Form ID:</strong> {form_id[:8].upper()}</p>
                </div>
                <div style="padding: 15px; background: #fef3c7; text-align: center;">
                    <p style="margin: 0; color: #92400e;">Please review and schedule the first ANC visit.</p>
                </div>
            </div>
            """
            await send_email_notification(
                "nevikacura@gmail.com",
                f"✅ ANC Form Submitted - {data.full_name}",
                admin_html
            )
    except Exception as e:
        logger.error(f"Failed to send admin notification: {e}")
    
    return {
        "success": True,
        "message": "ANC form submitted successfully",
        "form_id": form_id
    }

@router.get("/forms/list")
async def list_anc_forms(clinic: str = None, status: str = None):
    """List all ANC forms with status for staff dashboard"""
    query = {}
    if clinic:
        query["clinic"] = {"$regex": clinic, "$options": "i"}
    if status:
        query["status"] = status
    
    forms = await db.anc_forms.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Get counts
    total = len(forms)
    allotted = len([f for f in forms if f["status"] == "allotted"])
    filled = len([f for f in forms if f["status"] == "filled"])
    
    return {
        "success": True,
        "forms": forms,
        "counts": {
            "total": total,
            "allotted": allotted,
            "filled": filled
        }
    }
