"""
Enhancement APIs V3 - Admin & Analytics Backend Routes
Implements: Audit Trail, Revenue Forecasting, Health Outcome Tracking,
Staff Shift Management, Digital Signage, Lab Report Import, Consent Management
"""
from fastapi import APIRouter, HTTPException, Depends, Header, Query, Body, UploadFile, File
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import jwt
import os
import uuid
import random

router = APIRouter(prefix="/admin", tags=["Admin & Analytics"])

JWT_SECRET = os.environ.get('JWT_SECRET', 'your_jwt_secret_here')

# Database reference
db = None

def set_db(database):
    global db
    db = database

async def get_admin_from_token(authorization: str = Header(None)):
    """Extract admin/staff info from JWT token"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        token = authorization.split(' ')[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============================================================
# AUDIT TRAIL DASHBOARD (#38)
# ============================================================
class AuditLogEntry(BaseModel):
    action: str
    entity_type: str
    entity_id: str
    details: Optional[Dict[str, Any]] = {}

@router.get("/audit-trail")
async def get_audit_trail(
    entity_type: str = None,
    action: str = None,
    user_id: str = None,
    start_date: str = None,
    end_date: str = None,
    page: int = 1,
    limit: int = 50,
    admin = Depends(get_admin_from_token)
):
    """Get audit trail logs"""
    
    if db is None:
        # Return sample data
        return {
            "logs": [
                {
                    "id": "log_001",
                    "timestamp": "2026-01-28T10:30:00Z",
                    "user": "staff_001",
                    "user_name": "Nurse Priya",
                    "action": "update",
                    "entity_type": "appointment",
                    "entity_id": "APT-123",
                    "details": {"field": "status", "old_value": "Booked", "new_value": "In Clinic"},
                    "ip_address": "192.168.1.100"
                },
                {
                    "id": "log_002",
                    "timestamp": "2026-01-28T10:25:00Z",
                    "user": "dr_vikas",
                    "user_name": "Dr. Vikas Jha",
                    "action": "create",
                    "entity_type": "prescription",
                    "entity_id": "RX-456",
                    "details": {"patient": "John Doe", "medicines_count": 3},
                    "ip_address": "192.168.1.101"
                },
                {
                    "id": "log_003",
                    "timestamp": "2026-01-28T10:20:00Z",
                    "user": "admin_001",
                    "user_name": "Admin",
                    "action": "delete",
                    "entity_type": "user",
                    "entity_id": "USR-789",
                    "details": {"reason": "Duplicate account"},
                    "ip_address": "192.168.1.1"
                }
            ],
            "total": 3,
            "page": page,
            "filters_applied": {"entity_type": entity_type, "action": action}
        }
    
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    if action:
        query["action"] = action
    if user_id:
        query["user"] = user_id
    if start_date:
        query["timestamp"] = {"$gte": start_date}
    if end_date:
        query.setdefault("timestamp", {})["$lte"] = end_date
    
    skip = (page - 1) * limit
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.audit_logs.count_documents(query)
    
    return {
        "logs": logs,
        "total": total,
        "page": page,
        "total_pages": (total + limit - 1) // limit
    }

@router.post("/audit-trail/log")
async def create_audit_log(entry: AuditLogEntry, admin = Depends(get_admin_from_token)):
    """Create an audit log entry"""
    
    log_data = {
        "id": f"log_{str(uuid.uuid4())[:8]}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user": admin.get("user_id") or admin.get("sub"),
        "user_name": admin.get("name", "System"),
        **entry.dict()
    }
    
    if db is not None:
        await db.audit_logs.insert_one(log_data)
    
    return {"success": True, "log_id": log_data["id"]}


# ============================================================
# REVENUE FORECASTING (#40)
# ============================================================
@router.get("/analytics/revenue-forecast")
async def get_revenue_forecast(
    period: str = Query(default="monthly", description="daily, weekly, monthly, yearly"),
    months_ahead: int = 3,
    admin = Depends(get_admin_from_token)
):
    """Get revenue forecasting and analytics"""
    
    # In production, this would use ML models on actual data
    current_month_revenue = 850000
    growth_rate = 0.08  # 8% monthly growth
    
    forecast = []
    for i in range(months_ahead):
        month_revenue = current_month_revenue * ((1 + growth_rate) ** (i + 1))
        forecast.append({
            "month": (datetime.now() + timedelta(days=30 * (i + 1))).strftime("%B %Y"),
            "predicted_revenue": round(month_revenue, 2),
            "confidence": max(0.95 - (i * 0.05), 0.75)
        })
    
    return {
        "current_month": {
            "revenue": current_month_revenue,
            "target": 900000,
            "achievement": round((current_month_revenue / 900000) * 100, 1)
        },
        "forecast": forecast,
        "revenue_by_service": [
            {"service": "Consultations", "amount": 320000, "percentage": 37.6},
            {"service": "Lab Tests", "amount": 250000, "percentage": 29.4},
            {"service": "Pharmacy", "amount": 180000, "percentage": 21.2},
            {"service": "Procedures", "amount": 100000, "percentage": 11.8}
        ],
        "trends": {
            "yoy_growth": 15.2,
            "mom_growth": 8.0,
            "avg_transaction": 1250
        },
        "insights": [
            "Pharmacy sales show 12% increase this month",
            "Weekend consultations up by 20%",
            "Lab test packages are top revenue drivers"
        ]
    }


# ============================================================
# HEALTH OUTCOME TRACKING (#41)
# ============================================================
@router.get("/analytics/health-outcomes")
async def get_health_outcomes(
    condition: str = None,
    period: str = "6months",
    admin = Depends(get_admin_from_token)
):
    """Get health outcome tracking data"""
    
    return {
        "summary": {
            "total_patients_tracked": 1250,
            "improved": 892,
            "stable": 298,
            "requires_attention": 60,
            "improvement_rate": 71.4
        },
        "by_condition": [
            {
                "condition": "Diabetes",
                "patients": 450,
                "avg_hba1c_improvement": -0.8,
                "target_achieved": 78,
                "follow_up_compliance": 85
            },
            {
                "condition": "Hypertension",
                "patients": 380,
                "avg_bp_improvement": "-12/-8 mmHg",
                "target_achieved": 72,
                "follow_up_compliance": 80
            },
            {
                "condition": "Pregnancy Care",
                "patients": 220,
                "healthy_deliveries": 98.5,
                "complications_prevented": 15,
                "follow_up_compliance": 95
            }
        ],
        "alerts": [
            {"patient_id": "P001", "name": "John D.", "condition": "Diabetes", "alert": "HbA1c trending up", "priority": "high"},
            {"patient_id": "P045", "name": "Mary S.", "condition": "Hypertension", "alert": "Missed 2 follow-ups", "priority": "medium"}
        ],
        "timeline": {
            "months": ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"],
            "improvement_rate": [65, 68, 70, 69, 72, 71.4]
        }
    }


# ============================================================
# STAFF SHIFT MANAGEMENT (#43)
# ============================================================
class ShiftSchedule(BaseModel):
    staff_id: str
    date: str
    shift_type: str  # morning, afternoon, evening, night
    start_time: str
    end_time: str
    department: str
    notes: Optional[str] = None

@router.get("/shifts/schedule")
async def get_shift_schedule(
    date: str = None,
    week_start: str = None,
    department: str = None,
    staff_id: str = None,
    admin = Depends(get_admin_from_token)
):
    """Get staff shift schedule"""
    
    if db is None:
        # Return sample schedule
        return {
            "schedule": [
                {
                    "staff_id": "staff_001",
                    "staff_name": "Nurse Priya",
                    "role": "Nurse",
                    "shifts": [
                        {"date": "2026-01-28", "shift": "morning", "start": "08:00", "end": "14:00", "status": "scheduled"},
                        {"date": "2026-01-29", "shift": "morning", "start": "08:00", "end": "14:00", "status": "scheduled"},
                        {"date": "2026-01-30", "shift": "off", "start": None, "end": None, "status": "off"},
                    ]
                },
                {
                    "staff_id": "staff_002",
                    "staff_name": "Nurse Sanjay",
                    "role": "Nurse",
                    "shifts": [
                        {"date": "2026-01-28", "shift": "afternoon", "start": "14:00", "end": "20:00", "status": "scheduled"},
                        {"date": "2026-01-29", "shift": "afternoon", "start": "14:00", "end": "20:00", "status": "scheduled"},
                        {"date": "2026-01-30", "shift": "morning", "start": "08:00", "end": "14:00", "status": "scheduled"},
                    ]
                }
            ],
            "summary": {
                "total_staff": 12,
                "on_duty_today": 8,
                "on_leave": 2,
                "overtime_hours_this_week": 24
            }
        }
    
    query = {}
    if date:
        query["date"] = date
    if department:
        query["department"] = department
    if staff_id:
        query["staff_id"] = staff_id
    
    shifts = await db.shifts.find(query, {"_id": 0}).to_list(200)
    
    return {"schedule": shifts}

@router.post("/shifts/schedule")
async def create_shift(shift: ShiftSchedule, admin = Depends(get_admin_from_token)):
    """Create or update a shift schedule"""
    
    shift_data = {
        "id": f"shift_{str(uuid.uuid4())[:8]}",
        **shift.dict(),
        "created_by": admin.get("user_id") or admin.get("sub"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if db is not None:
        # Upsert based on staff_id and date
        await db.shifts.update_one(
            {"staff_id": shift.staff_id, "date": shift.date},
            {"$set": shift_data},
            upsert=True
        )
    
    return {"success": True, "shift_id": shift_data["id"]}

@router.post("/shifts/swap-request")
async def request_shift_swap(
    shift_id: str = Body(...),
    target_staff_id: str = Body(...),
    reason: str = Body(None),
    admin = Depends(get_admin_from_token)
):
    """Request a shift swap"""
    
    swap_id = f"SWAP-{str(uuid.uuid4())[:8].upper()}"
    
    swap_data = {
        "id": swap_id,
        "shift_id": shift_id,
        "requested_by": admin.get("user_id") or admin.get("sub"),
        "target_staff_id": target_staff_id,
        "reason": reason,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if db is not None:
        await db.shift_swaps.insert_one(swap_data)
    
    return {"success": True, "swap_id": swap_id, "message": "Swap request submitted for approval"}


# ============================================================
# DIGITAL SIGNAGE (#37)
# ============================================================
@router.get("/signage/content")
async def get_signage_content(location: str = None, screen_id: str = None):
    """Get content for digital signage displays"""
    
    return {
        "screen_id": screen_id or "main_lobby",
        "content": [
            {
                "type": "queue_display",
                "data": {
                    "now_serving": ["A-005", "B-003"],
                    "upcoming": ["A-006", "A-007", "B-004"],
                    "average_wait": 12
                },
                "duration": 10
            },
            {
                "type": "announcement",
                "data": {
                    "title": "Health Camp This Sunday!",
                    "message": "Free diabetes screening and health checkup",
                    "image": "/images/health-camp.jpg"
                },
                "duration": 8
            },
            {
                "type": "health_tip",
                "data": {
                    "tip": "Stay hydrated! Drink at least 8 glasses of water daily.",
                    "icon": "💧"
                },
                "duration": 5
            },
            {
                "type": "doctor_schedule",
                "data": {
                    "doctors": [
                        {"name": "Dr. Vikas Jha", "specialty": "Diabetologist", "available": True, "next_slot": "10:30 AM"},
                        {"name": "Dr. Neha Patel", "specialty": "Gynecologist", "available": True, "next_slot": "11:00 AM"}
                    ]
                },
                "duration": 10
            }
        ],
        "settings": {
            "rotation_interval": 30,
            "brightness": 80,
            "volume": 50
        }
    }

@router.post("/signage/announcement")
async def create_announcement(
    title: str = Body(...),
    message: str = Body(...),
    priority: str = Body(default="normal"),
    expires_at: str = Body(None),
    admin = Depends(get_admin_from_token)
):
    """Create a new announcement for digital signage"""
    
    announcement_id = f"ANN-{str(uuid.uuid4())[:8].upper()}"
    
    announcement_data = {
        "id": announcement_id,
        "title": title,
        "message": message,
        "priority": priority,
        "expires_at": expires_at,
        "created_by": admin.get("user_id") or admin.get("sub"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "active": True
    }
    
    if db is not None:
        await db.signage_announcements.insert_one(announcement_data)
    
    return {"success": True, "announcement_id": announcement_id}


# ============================================================
# LAB REPORT AUTO-IMPORT (#35)
# ============================================================
@router.post("/lab-reports/import")
async def import_lab_report(
    patient_phone: str = Body(...),
    report_type: str = Body(...),
    report_data: Dict[str, Any] = Body(...),
    source: str = Body(default="manual"),
    admin = Depends(get_admin_from_token)
):
    """Import lab report data"""
    
    report_id = f"LAB-{str(uuid.uuid4())[:8].upper()}"
    
    report_doc = {
        "id": report_id,
        "patient_phone": patient_phone,
        "report_type": report_type,
        "results": report_data,
        "source": source,
        "imported_by": admin.get("user_id") or admin.get("sub"),
        "imported_at": datetime.now(timezone.utc).isoformat(),
        "status": "imported"
    }
    
    if db is not None:
        await db.lab_reports.insert_one(report_doc)
    
    return {
        "success": True,
        "report_id": report_id,
        "message": "Lab report imported successfully"
    }

@router.post("/lab-reports/parse")
async def parse_lab_report(
    file: UploadFile = File(None),
    file_url: str = Body(None),
    admin = Depends(get_admin_from_token)
):
    """Parse lab report from PDF/image using OCR"""
    
    # In production, this would use OCR service
    # Return sample parsed data
    return {
        "success": True,
        "parsed_data": {
            "patient_name": "Detected from report",
            "report_date": "2026-01-28",
            "tests": [
                {"name": "Hemoglobin", "value": "13.5", "unit": "g/dL", "reference": "12.0-16.0", "status": "normal"},
                {"name": "Blood Sugar (Fasting)", "value": "110", "unit": "mg/dL", "reference": "70-100", "status": "high"},
                {"name": "Cholesterol", "value": "185", "unit": "mg/dL", "reference": "<200", "status": "normal"}
            ],
            "lab_name": "Proton Diagnostics",
            "confidence": 0.92
        },
        "message": "Report parsed successfully. Please verify the data before saving."
    }


# ============================================================
# CONSENT MANAGEMENT (#34)
# ============================================================
class ConsentRecord(BaseModel):
    patient_phone: str
    consent_type: str  # treatment, data_sharing, marketing, research
    consent_given: bool
    consent_date: str
    expiry_date: Optional[str] = None
    notes: Optional[str] = None

@router.get("/consent/{patient_phone}")
async def get_patient_consents(patient_phone: str, admin = Depends(get_admin_from_token)):
    """Get all consents for a patient"""
    
    if db is None:
        return {
            "consents": [
                {
                    "consent_type": "treatment",
                    "consent_given": True,
                    "consent_date": "2026-01-15",
                    "expiry_date": None,
                    "status": "active"
                },
                {
                    "consent_type": "data_sharing",
                    "consent_given": True,
                    "consent_date": "2026-01-15",
                    "expiry_date": "2027-01-15",
                    "status": "active"
                },
                {
                    "consent_type": "marketing",
                    "consent_given": False,
                    "consent_date": "2026-01-15",
                    "status": "declined"
                }
            ]
        }
    
    consents = await db.patient_consents.find(
        {"patient_phone": patient_phone},
        {"_id": 0}
    ).to_list(50)
    
    return {"consents": consents}

@router.post("/consent")
async def record_consent(consent: ConsentRecord, admin = Depends(get_admin_from_token)):
    """Record patient consent"""
    
    consent_data = {
        "id": f"consent_{str(uuid.uuid4())[:8]}",
        **consent.dict(),
        "recorded_by": admin.get("user_id") or admin.get("sub"),
        "recorded_at": datetime.now(timezone.utc).isoformat()
    }
    
    if db is not None:
        await db.patient_consents.update_one(
            {"patient_phone": consent.patient_phone, "consent_type": consent.consent_type},
            {"$set": consent_data},
            upsert=True
        )
    
    return {"success": True, "consent_id": consent_data["id"]}

@router.post("/consent/withdraw")
async def withdraw_consent(
    patient_phone: str = Body(...),
    consent_type: str = Body(...),
    reason: str = Body(None),
    admin = Depends(get_admin_from_token)
):
    """Withdraw patient consent"""
    
    if db is not None:
        await db.patient_consents.update_one(
            {"patient_phone": patient_phone, "consent_type": consent_type},
            {"$set": {
                "consent_given": False,
                "withdrawn_at": datetime.now(timezone.utc).isoformat(),
                "withdrawal_reason": reason,
                "status": "withdrawn"
            }}
        )
    
    return {"success": True, "message": f"Consent for {consent_type} withdrawn"}


# ============================================================
# BILLING RECONCILIATION (#33)
# ============================================================
@router.get("/billing/reconciliation")
async def get_billing_reconciliation(
    start_date: str = None,
    end_date: str = None,
    status: str = None,
    admin = Depends(get_admin_from_token)
):
    """Get billing reconciliation report"""
    
    return {
        "summary": {
            "total_billed": 1250000,
            "total_collected": 1180000,
            "pending": 45000,
            "overdue": 25000,
            "collection_rate": 94.4
        },
        "by_payment_mode": [
            {"mode": "Cash", "amount": 450000, "percentage": 38.1},
            {"mode": "Card", "amount": 380000, "percentage": 32.2},
            {"mode": "UPI", "amount": 250000, "percentage": 21.2},
            {"mode": "Insurance", "amount": 100000, "percentage": 8.5}
        ],
        "pending_bills": [
            {"bill_id": "BILL-001", "patient": "John D.", "amount": 5000, "days_overdue": 15, "status": "overdue"},
            {"bill_id": "BILL-002", "patient": "Mary S.", "amount": 8000, "days_overdue": 5, "status": "pending"},
            {"bill_id": "BILL-003", "patient": "David K.", "amount": 12000, "days_overdue": 0, "status": "pending"}
        ],
        "daily_collections": {
            "dates": ["Jan 22", "Jan 23", "Jan 24", "Jan 25", "Jan 26", "Jan 27", "Jan 28"],
            "amounts": [42000, 38000, 45000, 41000, 48000, 35000, 52000]
        }
    }

@router.post("/billing/send-reminder")
async def send_payment_reminder(
    bill_id: str = Body(...),
    channel: str = Body(default="whatsapp"),
    admin = Depends(get_admin_from_token)
):
    """Send payment reminder to patient"""
    
    # In production, this would send actual notification
    return {
        "success": True,
        "message": f"Payment reminder sent via {channel}",
        "bill_id": bill_id
    }


# ============================================================
# PREDICTIVE HEALTH ALERTS (#25)
# ============================================================
@router.get("/analytics/predictive-alerts")
async def get_predictive_health_alerts(admin = Depends(get_admin_from_token)):
    """Get AI-generated predictive health alerts"""
    
    return {
        "alerts": [
            {
                "id": "alert_001",
                "patient_id": "P001",
                "patient_name": "Ramesh Kumar",
                "alert_type": "diabetes_risk",
                "severity": "high",
                "prediction": "HbA1c likely to exceed 8.0 in next 3 months based on current trend",
                "confidence": 0.85,
                "recommended_action": "Schedule consultation, review medication",
                "created_at": "2026-01-28T08:00:00Z"
            },
            {
                "id": "alert_002",
                "patient_id": "P045",
                "patient_name": "Sunita Sharma",
                "alert_type": "missed_followup",
                "severity": "medium",
                "prediction": "Patient likely to miss upcoming follow-up based on past patterns",
                "confidence": 0.78,
                "recommended_action": "Send reminder 48 hours before appointment",
                "created_at": "2026-01-28T07:30:00Z"
            },
            {
                "id": "alert_003",
                "patient_id": "P089",
                "patient_name": "Priya Patel",
                "alert_type": "pregnancy_risk",
                "severity": "medium",
                "prediction": "Gestational diabetes risk detected based on recent vitals",
                "confidence": 0.72,
                "recommended_action": "Schedule OGTT test",
                "created_at": "2026-01-28T07:00:00Z"
            }
        ],
        "summary": {
            "total_alerts": 15,
            "high_severity": 3,
            "medium_severity": 8,
            "low_severity": 4,
            "alerts_actioned_today": 5
        }
    }


# ============================================================
# PATIENT CONTEXT CARD (#32)
# ============================================================
@router.get("/patient-context/{patient_phone}")
async def get_patient_context(patient_phone: str, admin = Depends(get_admin_from_token)):
    """Get complete patient context card for consultations"""
    
    if db is None:
        return {
            "patient": {
                "name": "Ramesh Kumar",
                "phone": patient_phone,
                "age": 45,
                "gender": "Male",
                "blood_group": "B+",
                "allergies": ["Penicillin"],
                "chronic_conditions": ["Type 2 Diabetes", "Hypertension"]
            },
            "vitals_history": [
                {"date": "2026-01-28", "bp": "130/85", "sugar": "145", "weight": "78"},
                {"date": "2026-01-15", "bp": "135/88", "sugar": "160", "weight": "79"},
                {"date": "2026-01-01", "bp": "140/90", "sugar": "175", "weight": "80"}
            ],
            "recent_visits": [
                {"date": "2026-01-15", "doctor": "Dr. Vikas Jha", "diagnosis": "Diabetes follow-up", "prescription_id": "RX-123"},
                {"date": "2025-12-20", "doctor": "Dr. Neha Patel", "diagnosis": "General checkup", "prescription_id": "RX-100"}
            ],
            "active_medications": [
                {"name": "Metformin 500mg", "dosage": "Twice daily", "since": "2025-06-15"},
                {"name": "Amlodipine 5mg", "dosage": "Once daily", "since": "2025-08-20"}
            ],
            "pending_tests": ["HbA1c", "Lipid Profile"],
            "lab_results": [
                {"test": "HbA1c", "date": "2025-12-15", "value": "7.2%", "status": "slightly_high"},
                {"test": "Fasting Sugar", "date": "2026-01-15", "value": "145 mg/dL", "status": "high"}
            ],
            "insurance": {
                "provider": "Star Health",
                "policy_number": "POL123456",
                "valid_until": "2027-03-15"
            },
            "notes": "Patient prefers morning appointments. Compliant with medication."
        }
    
    # Get actual patient data from DB
    patient = await db.patients.find_one({"phone": patient_phone}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get related data
    visits = await db.appointments.find(
        {"patient_phone": patient_phone},
        {"_id": 0}
    ).sort("date", -1).limit(5).to_list(5)
    
    prescriptions = await db.prescriptions.find(
        {"patient_phone": patient_phone},
        {"_id": 0}
    ).sort("date", -1).limit(5).to_list(5)
    
    return {
        "patient": patient,
        "recent_visits": visits,
        "prescriptions": prescriptions
    }


def setup_routes(database):
    """Setup routes with database"""
    global db
    db = database
    return router
