"""
Glydex - Diabetes Care Portal
All Glydex-related routes for blood sugar tracking, HbA1c monitoring, reminders, etc.
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import os
import logging
import jwt

# PDF generation imports
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from io import BytesIO
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/glydex", tags=["Glydex"])

# MongoDB connection - will be injected by server.py
db = None
JWT_SECRET = None

def set_db(database):
    """Set the database instance from server.py"""
    global db
    db = database

def set_jwt_secret(secret):
    """Set the JWT secret from server.py"""
    global JWT_SECRET
    JWT_SECRET = secret

async def get_current_user(authorization: str = Header(None)):
    """Get current user from JWT token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET or os.environ.get("JWT_SECRET", "nevika-health-secret-key-2024"), algorithms=["HS256"])
        user_id = payload.get("sub") or payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Create User-like object
        class UserObj:
            def __init__(self, data):
                self.id = data.get("id")
                self.email = data.get("email")
                self.name = data.get("name")
                self.phone = data.get("phone")
        
        return UserObj(user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ GLYDEX MODELS ============

# ---- Staff-Managed Diabetes Patient Models ----

class DiabetesPatientRegistration(BaseModel):
    """Registration model for staff to register diabetes patients"""
    patient_name: str
    age: int
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    diabetes_type: str  # type1, type2, gestational, prediabetic
    date_of_diagnosis: Optional[str] = None
    current_medications: Optional[List[str]] = []
    insulin_user: bool = False
    hba1c_latest: Optional[float] = None
    fbs_latest: Optional[int] = None
    ppbs_latest: Optional[int] = None
    complications: Optional[List[str]] = []
    doctor_assigned: str = "Dr. Vikas"
    registered_by: str
    send_congratulations: bool = True  # Toggle for auto congratulatory messages

class StaffSugarLogEntry(BaseModel):
    """Sugar log entry by staff for managed patients"""
    patient_id: str
    type: str  # fbs, ppbs, random
    value: int
    date: str
    time: Optional[str] = None
    recorded_by: str
    notes: Optional[str] = None

class CongratulatoryMessageToggle(BaseModel):
    """Toggle for sending congratulatory messages"""
    patient_id: str
    enabled: bool

# ---- User Self-Service Models (existing) ----

class GlydexProfile(BaseModel):
    diabetesType: str  # type1, type2, gestational, prediabetic
    age: str
    gender: str
    height: Optional[str] = None
    weight: Optional[str] = None
    medications: Optional[str] = None
    dateOfDiagnosis: Optional[str] = None
    hba1cTarget: Optional[str] = None
    currentMedications: Optional[List[str]] = None
    insulinUser: Optional[bool] = False
    complications: Optional[List[str]] = None
    emergencyContactName: Optional[str] = None
    emergencyContactPhone: Optional[str] = None
    testReminders: Optional[bool] = True
    medicineReminders: Optional[bool] = True
    lastHba1cDate: Optional[str] = None
    lastKidneyTestDate: Optional[str] = None


class GlydexReminderSettings(BaseModel):
    hba1cReminderMonths: int = 3
    fastingBSReminderDays: int = 7
    kidneyTestReminderMonths: int = 12
    medicineRefillDays: int = 30


class SugarLog(BaseModel):
    type: str  # fbs, ppbs, random
    value: str
    date: str
    time: Optional[str] = None


class HbA1cLog(BaseModel):
    value: float
    date: str
    notes: Optional[str] = None


class TestDateUpdate(BaseModel):
    test_type: str  # hba1c, kidney
    test_date: str


# ============ HELPER FUNCTIONS ============

async def schedule_glydex_test_reminders(user_id: str, profile: dict):
    """Schedule test reminders based on profile"""
    now = datetime.now(timezone.utc)
    reminders = {
        "user_id": user_id,
        "hba1c": {
            "last_done": profile.get("lastHba1cDate"),
            "next_due": (now + timedelta(days=90)).isoformat() if not profile.get("lastHba1cDate") else None,
            "frequency_months": 3
        },
        "kidney_function": {
            "last_done": profile.get("lastKidneyTestDate"),
            "next_due": (now + timedelta(days=365)).isoformat() if not profile.get("lastKidneyTestDate") else None,
            "frequency_months": 12
        },
        "eye_exam": {
            "next_due": (now + timedelta(days=365)).isoformat(),
            "frequency_months": 12
        },
        "foot_exam": {
            "next_due": (now + timedelta(days=365)).isoformat(),
            "frequency_months": 12
        },
        "updated_at": now.isoformat()
    }
    
    await db.glydex_reminders.update_one(
        {"user_id": user_id},
        {"$set": reminders},
        upsert=True
    )


# ============ GLYDEX ROUTES ============

@router.get("/profile")
async def get_glydex_profile(user = Depends(get_current_user)):
    """Get user's Glydex diabetes profile"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    profile = await db.glydex_profiles.find_one(
        {"user_id": user.id},
        {"_id": 0}
    )
    return {"profile": profile}


@router.post("/profile")
async def save_glydex_profile(data: GlydexProfile, user = Depends(get_current_user)):
    """Save or update user's Glydex diabetes profile"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    profile_data = {
        "user_id": user.id,
        "diabetesType": data.diabetesType,
        "age": data.age,
        "gender": data.gender,
        "height": data.height,
        "weight": data.weight,
        "medications": data.medications,
        "dateOfDiagnosis": data.dateOfDiagnosis,
        "hba1cTarget": data.hba1cTarget,
        "currentMedications": data.currentMedications or [],
        "insulinUser": data.insulinUser,
        "complications": data.complications or [],
        "emergencyContactName": data.emergencyContactName,
        "emergencyContactPhone": data.emergencyContactPhone,
        "testReminders": data.testReminders if data.testReminders is not None else True,
        "medicineReminders": data.medicineReminders if data.medicineReminders is not None else True,
        "lastHba1cDate": data.lastHba1cDate,
        "lastKidneyTestDate": data.lastKidneyTestDate,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.glydex_profiles.update_one(
        {"user_id": user.id},
        {"$set": profile_data},
        upsert=True
    )
    
    if data.testReminders:
        await schedule_glydex_test_reminders(user.id, profile_data)
    
    return {"status": "saved", "profile": profile_data}


@router.get("/reminders")
async def get_glydex_reminders(user = Depends(get_current_user)):
    """Get user's diabetes test reminders"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    reminders = await db.glydex_reminders.find_one(
        {"user_id": user.id},
        {"_id": 0}
    )
    
    if not reminders:
        now = datetime.now(timezone.utc)
        reminders = {
            "hba1c": {"next_due": (now + timedelta(days=90)).isoformat(), "frequency_months": 3},
            "kidney_function": {"next_due": (now + timedelta(days=365)).isoformat(), "frequency_months": 12},
            "eye_exam": {"next_due": (now + timedelta(days=365)).isoformat(), "frequency_months": 12},
            "foot_exam": {"next_due": (now + timedelta(days=365)).isoformat(), "frequency_months": 12}
        }
    
    return {"reminders": reminders}


@router.post("/reminders/update-test-date")
async def update_glydex_test_date(data: TestDateUpdate, user = Depends(get_current_user)):
    """Update last test date and reschedule reminder"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if data.test_type == "hba1c":
        await db.glydex_profiles.update_one(
            {"user_id": user.id},
            {"$set": {"lastHba1cDate": data.test_date}}
        )
        await db.glydex_reminders.update_one(
            {"user_id": user.id},
            {"$set": {"hba1c.last_done": data.test_date, "hba1c.next_due": (datetime.fromisoformat(data.test_date) + timedelta(days=90)).isoformat()}}
        )
    elif data.test_type == "kidney":
        await db.glydex_profiles.update_one(
            {"user_id": user.id},
            {"$set": {"lastKidneyTestDate": data.test_date}}
        )
        await db.glydex_reminders.update_one(
            {"user_id": user.id},
            {"$set": {"kidney_function.last_done": data.test_date, "kidney_function.next_due": (datetime.fromisoformat(data.test_date) + timedelta(days=365)).isoformat()}}
        )
    
    return {"status": "updated"}


@router.post("/send-due-reminders")
async def send_due_reminders(admin_key: str = None):
    """Send reminders for tests that are due (admin/cron job)"""
    if admin_key != os.environ.get("ADMIN_API_KEY", "nevika-admin-2024"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    now = datetime.now(timezone.utc)
    today = now.isoformat()[:10]
    
    due_reminders = await db.glydex_reminders.find({
        "$or": [
            {"hba1c.next_due": {"$lte": today}},
            {"kidney_function.next_due": {"$lte": today}},
            {"eye_exam.next_due": {"$lte": today}},
            {"foot_exam.next_due": {"$lte": today}}
        ]
    }).to_list(100)
    
    sent_count = 0
    for reminder in due_reminders:
        user = await db.users.find_one({"id": reminder["user_id"]}, {"_id": 0, "phone": 1, "name": 1, "email": 1})
        if user:
            tests_due = []
            if reminder.get("hba1c", {}).get("next_due", "") <= today:
                tests_due.append("HbA1c")
            if reminder.get("kidney_function", {}).get("next_due", "") <= today:
                tests_due.append("Kidney Function")
            if reminder.get("eye_exam", {}).get("next_due", "") <= today:
                tests_due.append("Eye Exam")
            if reminder.get("foot_exam", {}).get("next_due", "") <= today:
                tests_due.append("Foot Exam")
            
            if tests_due:
                sent_count += 1
    
    return {"reminders_sent": sent_count}


# ============ SUGAR LOGS ============

@router.get("/sugar-logs")
async def get_sugar_logs(user = Depends(get_current_user)):
    """Get user's blood sugar logs"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    logs = await db.glydex_sugar_logs.find(
        {"user_id": user.id},
        {"_id": 0}
    ).sort("date", -1).to_list(100)
    return {"logs": logs}


@router.post("/sugar-logs")
async def add_sugar_log(data: SugarLog, user = Depends(get_current_user)):
    """Add a new blood sugar log"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    log = {
        "id": str(uuid.uuid4()),
        "user_id": user.id,
        "type": data.type,
        "value": data.value,
        "date": data.date,
        "time": data.time or datetime.now(timezone.utc).strftime("%H:%M"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.glydex_sugar_logs.insert_one(log)
    log.pop("_id", None)
    return {"status": "added", "log": log}


@router.delete("/sugar-logs/{log_id}")
async def delete_sugar_log(log_id: str, user = Depends(get_current_user)):
    """Delete a blood sugar log"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    result = await db.glydex_sugar_logs.delete_one({"id": log_id, "user_id": user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Log not found")
    return {"status": "deleted"}


@router.get("/sugar-stats")
async def get_sugar_stats(user = Depends(get_current_user)):
    """Get blood sugar statistics"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    logs = await db.glydex_sugar_logs.find(
        {"user_id": user.id},
        {"_id": 0, "type": 1, "value": 1}
    ).to_list(500)
    
    fbs_values = [int(l["value"]) for l in logs if l.get("type") == "fbs"]
    ppbs_values = [int(l["value"]) for l in logs if l.get("type") == "ppbs"]
    
    stats = {
        "fbs": {
            "count": len(fbs_values),
            "average": round(sum(fbs_values) / len(fbs_values)) if fbs_values else None,
            "min": min(fbs_values) if fbs_values else None,
            "max": max(fbs_values) if fbs_values else None
        },
        "ppbs": {
            "count": len(ppbs_values),
            "average": round(sum(ppbs_values) / len(ppbs_values)) if ppbs_values else None,
            "min": min(ppbs_values) if ppbs_values else None,
            "max": max(ppbs_values) if ppbs_values else None
        }
    }
    return {"stats": stats}


# ============ HbA1c LOGS ============

@router.get("/hba1c-logs")
async def get_hba1c_logs(user = Depends(get_current_user)):
    """Get user's HbA1c logs"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    logs = await db.glydex_hba1c_logs.find(
        {"user_id": user.id},
        {"_id": 0}
    ).sort("date", -1).to_list(50)
    return {"logs": logs}


@router.post("/hba1c-logs")
async def add_hba1c_log(data: HbA1cLog, user = Depends(get_current_user)):
    """Add a new HbA1c log"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    log = {
        "id": str(uuid.uuid4()),
        "user_id": user.id,
        "value": data.value,
        "date": data.date,
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.glydex_hba1c_logs.insert_one(log)
    
    await db.glydex_profiles.update_one(
        {"user_id": user.id},
        {"$set": {"lastHba1cDate": data.date}}
    )
    
    log.pop("_id", None)
    return {"status": "added", "log": log}


@router.delete("/hba1c-logs/{log_id}")
async def delete_hba1c_log(log_id: str, user = Depends(get_current_user)):
    """Delete an HbA1c log"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    result = await db.glydex_hba1c_logs.delete_one({"id": log_id, "user_id": user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Log not found")
    return {"status": "deleted"}


@router.get("/hba1c-trend")
async def get_hba1c_trend(user = Depends(get_current_user)):
    """Get HbA1c trend data for charting"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    logs = await db.glydex_hba1c_logs.find(
        {"user_id": user.id},
        {"_id": 0, "value": 1, "date": 1}
    ).sort("date", 1).to_list(20)
    
    if not logs:
        return {"trend": None, "analysis": None}
    
    values = [l["value"] for l in logs]
    avg = round(sum(values) / len(values), 1)
    latest = values[-1] if values else None
    
    trend_direction = "stable"
    if len(values) >= 2:
        recent_avg = sum(values[-3:]) / len(values[-3:]) if len(values) >= 3 else values[-1]
        older_avg = sum(values[:3]) / len(values[:3]) if len(values) >= 3 else values[0]
        diff = recent_avg - older_avg
        if diff < -0.3:
            trend_direction = "improving"
        elif diff > 0.3:
            trend_direction = "worsening"
    
    analysis = {
        "total_tests": len(logs),
        "average": avg,
        "latest": latest,
        "lowest": min(values),
        "highest": max(values),
        "trend_direction": trend_direction,
        "control_status": "excellent" if latest and latest < 6.5 else "good" if latest and latest < 7 else "fair" if latest and latest < 8 else "needs_improvement"
    }
    
    return {"trend": logs, "analysis": analysis}


# ============ REPORTS ============

@router.get("/share-report")
async def generate_glydex_share_report(user = Depends(get_current_user)):
    """Generate a shareable text report of blood sugar data for WhatsApp"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    profile = await db.glydex_profiles.find_one({"user_id": user.id}, {"_id": 0})
    
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    sugar_logs = await db.glydex_sugar_logs.find(
        {"user_id": user.id, "date": {"$gte": thirty_days_ago[:10]}},
        {"_id": 0}
    ).sort("date", -1).to_list(50)
    
    hba1c_logs = await db.glydex_hba1c_logs.find(
        {"user_id": user.id},
        {"_id": 0}
    ).sort("date", -1).to_list(5)
    
    fbs_values = [int(l["value"]) for l in sugar_logs if l.get("type") == "fbs"]
    ppbs_values = [int(l["value"]) for l in sugar_logs if l.get("type") == "ppbs"]
    
    report_lines = [
        "📊 *GLYDEX DIABETES REPORT*",
        f"Patient: {user.name}",
        f"Report Date: {datetime.now().strftime('%d %b %Y')}",
        "",
        "━━━━━━━━━━━━━━━━━━━━━━",
    ]
    
    if profile:
        report_lines.extend([
            "*Patient Profile:*",
            f"• Diabetes Type: {profile.get('diabetesType', 'N/A')}",
            f"• Diagnosed: {profile.get('dateOfDiagnosis', 'N/A')}",
            ""
        ])
    
    report_lines.append("*Blood Sugar Summary (Last 30 Days):*")
    
    if fbs_values:
        report_lines.extend([
            f"📍 Fasting (FBS): {len(fbs_values)} readings",
            f"   Avg: {round(sum(fbs_values)/len(fbs_values))} mg/dL",
            f"   Range: {min(fbs_values)} - {max(fbs_values)} mg/dL",
        ])
    
    if ppbs_values:
        report_lines.extend([
            f"📍 Post-Meal (PPBS): {len(ppbs_values)} readings",
            f"   Avg: {round(sum(ppbs_values)/len(ppbs_values))} mg/dL",
            f"   Range: {min(ppbs_values)} - {max(ppbs_values)} mg/dL",
        ])
    
    if hba1c_logs:
        latest_hba1c = hba1c_logs[0]
        report_lines.extend([
            "",
            "*HbA1c History:*",
            f"📍 Latest: {latest_hba1c.get('value')}% ({latest_hba1c.get('date')})",
        ])
    
    report_lines.extend([
        "",
        "━━━━━━━━━━━━━━━━━━━━━━",
        "_Generated by Nevika Cura - Glydex_",
        "_Always consult your doctor for medical advice_"
    ])
    
    report_text = "\n".join(report_lines)
    newline = '\n'
    whatsapp_url = f"https://wa.me/?text={report_text.replace(' ', '%20').replace(newline, '%0A')}"
    
    return {"report": report_text, "whatsapp_url": whatsapp_url}


@router.get("/download-pdf")
async def download_glydex_pdf_report(user = Depends(get_current_user)):
    """Generate a downloadable PDF report of blood sugar data"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    profile = await db.glydex_profiles.find_one({"user_id": user.id}, {"_id": 0})
    
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    sugar_logs = await db.glydex_sugar_logs.find(
        {"user_id": user.id, "date": {"$gte": thirty_days_ago[:10]}},
        {"_id": 0}
    ).sort("date", -1).to_list(100)
    
    hba1c_logs = await db.glydex_hba1c_logs.find(
        {"user_id": user.id},
        {"_id": 0}
    ).sort("date", -1).to_list(10)
    
    fbs_values = [int(l["value"]) for l in sugar_logs if l.get("type") == "fbs"]
    ppbs_values = [int(l["value"]) for l in sugar_logs if l.get("type") == "ppbs"]
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=1*cm, leftMargin=1*cm, topMargin=1*cm, bottomMargin=1*cm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=18, textColor=colors.HexColor('#2563eb'), spaceAfter=20)
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor('#1e40af'), spaceBefore=15, spaceAfter=10)
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=11, spaceAfter=5)
    
    elements = []
    
    elements.append(Paragraph("GLYDEX - Blood Sugar Report", title_style))
    elements.append(Paragraph(f"Patient: {user.name}", normal_style))
    elements.append(Paragraph(f"Generated: {datetime.now().strftime('%d %b %Y, %I:%M %p')}", normal_style))
    elements.append(Spacer(1, 20))
    
    if profile:
        elements.append(Paragraph("Patient Profile", heading_style))
        profile_data = [
            ["Diabetes Type:", profile.get('diabetesType', 'N/A').replace('_', ' ').title()],
            ["Diagnosis Date:", profile.get('dateOfDiagnosis', 'N/A')],
        ]
        profile_table = Table(profile_data, colWidths=[3*cm, 5*cm])
        profile_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(profile_table)
        elements.append(Spacer(1, 15))
    
    elements.append(Paragraph("Blood Sugar Summary (Last 30 Days)", heading_style))
    summary_data = [["Type", "Readings", "Average", "Min", "Max", "Status"]]
    
    if fbs_values:
        avg_fbs = round(sum(fbs_values)/len(fbs_values))
        status = "Normal" if avg_fbs < 100 else "Pre-diabetic" if avg_fbs < 126 else "High"
        summary_data.append(["Fasting (FBS)", str(len(fbs_values)), f"{avg_fbs} mg/dL", f"{min(fbs_values)}", f"{max(fbs_values)}", status])
    
    if ppbs_values:
        avg_ppbs = round(sum(ppbs_values)/len(ppbs_values))
        status = "Normal" if avg_ppbs < 140 else "Pre-diabetic" if avg_ppbs < 200 else "High"
        summary_data.append(["Post-Meal (PPBS)", str(len(ppbs_values)), f"{avg_ppbs} mg/dL", f"{min(ppbs_values)}", f"{max(ppbs_values)}", status])
    
    if len(summary_data) > 1:
        summary_table = Table(summary_data, colWidths=[3.5*cm, 2*cm, 2.5*cm, 1.5*cm, 1.5*cm, 2.5*cm])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563eb')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(summary_table)
    else:
        elements.append(Paragraph("No blood sugar readings in the last 30 days.", normal_style))
    
    if hba1c_logs:
        elements.append(Spacer(1, 15))
        elements.append(Paragraph("HbA1c History", heading_style))
        hba1c_data = [["Date", "HbA1c %", "Status"]]
        for log in hba1c_logs[:5]:
            val = float(log.get('value', 0))
            status = "Normal" if val < 5.7 else "Pre-diabetic" if val < 6.5 else "Diabetic"
            hba1c_data.append([log.get('date', 'N/A'), f"{val}%", status])
        
        hba1c_table = Table(hba1c_data, colWidths=[4*cm, 3*cm, 4*cm])
        hba1c_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#7c3aed')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(hba1c_table)
    
    elements.append(Spacer(1, 15))
    elements.append(Paragraph("Recent Blood Sugar Readings", heading_style))
    
    if sugar_logs:
        readings_data = [["Date", "Time", "Type", "Value (mg/dL)"]]
        for log in sugar_logs[:20]:
            log_type = "FBS" if log.get("type") == "fbs" else "PPBS"
            readings_data.append([
                log.get('date', 'N/A'),
                log.get('time', '-'),
                log_type,
                str(log.get('value', '-'))
            ])
        
        readings_table = Table(readings_data, colWidths=[3*cm, 2.5*cm, 2.5*cm, 3.5*cm])
        readings_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#059669')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (2, 0), (3, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f0fdf4')]),
        ]))
        elements.append(readings_table)
    else:
        elements.append(Paragraph("No readings available.", normal_style))
    
    elements.append(Spacer(1, 30))
    elements.append(Paragraph("━" * 50, normal_style))
    elements.append(Paragraph("Generated by Nevika Cura - Glydex Diabetes Care", ParagraphStyle('Footer', fontSize=9, textColor=colors.grey)))
    elements.append(Paragraph("This report is for informational purposes only. Please consult your doctor for medical advice.", ParagraphStyle('Footer', fontSize=8, textColor=colors.grey)))
    
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"glydex_report_{user.name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )



# ============ STAFF-MANAGED DIABETES PATIENTS (Dr. Vikas) ============

send_sms_notification = None
send_email_notification = None

def set_notification_functions(email_func, sms_func):
    """Set notification functions from server.py"""
    global send_email_notification, send_sms_notification
    send_email_notification = email_func
    send_sms_notification = sms_func

def generate_patient_id(doctor: str = "Vikas") -> str:
    """Generate unique diabetes patient ID"""
    year = datetime.now().strftime("%Y")
    doc_code = doctor.upper()[:3]
    return f"GLX-{doc_code}-{year}-{uuid.uuid4().hex[:6].upper()}"

@router.post("/staff/patients/register")
async def register_diabetes_patient(registration: DiabetesPatientRegistration):
    """Staff registers a new diabetes patient (Dr. Vikas workflow)"""
    
    # Generate unique patient ID
    patient_id = generate_patient_id(registration.doctor_assigned.split()[-1] if " " in registration.doctor_assigned else "VIK")
    
    # Check if phone already registered
    existing = await db.glydex_managed_patients.find_one({
        "phone": registration.phone,
        "status": "active"
    })
    if existing:
        return {
            "success": False,
            "message": "Patient already registered with this phone",
            "existing_id": existing.get("patient_id")
        }
    
    patient_doc = {
        "patient_id": patient_id,
        "patient_name": registration.patient_name,
        "age": registration.age,
        "phone": registration.phone,
        "email": registration.email,
        "address": registration.address,
        "diabetes_type": registration.diabetes_type,
        "date_of_diagnosis": registration.date_of_diagnosis,
        "current_medications": registration.current_medications,
        "insulin_user": registration.insulin_user,
        "hba1c_history": [{"value": registration.hba1c_latest, "date": datetime.now().strftime("%Y-%m-%d")}] if registration.hba1c_latest else [],
        "doctor_assigned": registration.doctor_assigned,
        "registered_by": registration.registered_by,
        "send_congratulations": registration.send_congratulations,
        "status": "active",
        "sugar_logs": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.glydex_managed_patients.insert_one(patient_doc)
    
    logger.info(f"Diabetes patient registered: {patient_id}")
    
    return {
        "success": True,
        "patient_id": patient_id,
        "patient_name": registration.patient_name,
        "doctor": registration.doctor_assigned,
        "message": f"Patient registered successfully. ID: {patient_id}"
    }

@router.get("/staff/patients")
async def get_all_diabetes_patients(doctor: Optional[str] = None, status: str = "active"):
    """Get all managed diabetes patients"""
    query = {"status": status}
    if doctor:
        query["doctor_assigned"] = {"$regex": doctor, "$options": "i"}
    
    patients = await db.glydex_managed_patients.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    return {"success": True, "patients": patients, "total": len(patients)}

@router.get("/staff/patients/{patient_id}")
async def get_diabetes_patient(patient_id: str):
    """Get specific diabetes patient details"""
    patient = await db.glydex_managed_patients.find_one(
        {"patient_id": patient_id},
        {"_id": 0}
    )
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get sugar log stats
    fbs_logs = [l for l in patient.get("sugar_logs", []) if l.get("type") == "fbs"]
    ppbs_logs = [l for l in patient.get("sugar_logs", []) if l.get("type") == "ppbs"]
    
    patient["stats"] = {
        "fbs_avg": round(sum(l.get("value", 0) for l in fbs_logs) / len(fbs_logs)) if fbs_logs else None,
        "ppbs_avg": round(sum(l.get("value", 0) for l in ppbs_logs) / len(ppbs_logs)) if ppbs_logs else None,
        "total_logs": len(patient.get("sugar_logs", [])),
        "last_hba1c": patient.get("hba1c_history", [{}])[-1] if patient.get("hba1c_history") else None
    }
    
    return {"success": True, "patient": patient}

@router.post("/staff/patients/{patient_id}/sugar-log")
async def add_staff_sugar_log(patient_id: str, entry: StaffSugarLogEntry):
    """Staff adds sugar log for a managed patient"""
    
    patient = await db.glydex_managed_patients.find_one({"patient_id": patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    log_entry = {
        "id": str(uuid.uuid4()),
        "type": entry.type,
        "value": entry.value,
        "date": entry.date,
        "time": entry.time,
        "recorded_by": entry.recorded_by,
        "notes": entry.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.glydex_managed_patients.update_one(
        {"patient_id": patient_id},
        {
            "$push": {"sugar_logs": log_entry},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # Check for good results and send congratulations if enabled
    congrats_sent = False
    if patient.get("send_congratulations", True):
        is_good_reading = False
        message = ""
        
        if entry.type == "fbs" and entry.value < 110:
            is_good_reading = True
            message = f"Great news! Your fasting sugar of {entry.value} mg/dL is excellent. Keep up the good work! - Dr. Vikas, Nevika Cura"
        elif entry.type == "ppbs" and entry.value < 140:
            is_good_reading = True
            message = f"Well done! Your post-meal sugar of {entry.value} mg/dL shows great control. Continue your healthy habits! - Dr. Vikas, Nevika Cura"
        
        if is_good_reading and message:
            # Send SMS congratulations
            if send_sms_notification and patient.get("phone"):
                try:
                    await send_sms_notification(patient.get("phone"), message)
                    congrats_sent = True
                    logger.info(f"Congratulatory SMS sent to patient {patient_id}")
                except Exception as e:
                    logger.error(f"Failed to send congratulatory SMS: {e}")
            
            # Send email congratulations
            if send_email_notification and patient.get("email"):
                try:
                    await send_email_notification(
                        patient.get("email"),
                        "Congratulations on Your Diabetes Control! - Nevika Cura",
                        f"""
                        <h2>Great Progress, {patient.get('patient_name')}!</h2>
                        <p>{message}</p>
                        <p>Your {entry.type.upper()} reading: <strong>{entry.value} mg/dL</strong></p>
                        <p>Keep following your diet and medication routine.</p>
                        <p>Best regards,<br>Dr. Vikas<br>Nevika Cura - Glydex Diabetes Care</p>
                        """
                    )
                except Exception as e:
                    logger.error(f"Failed to send congratulatory email: {e}")
    
    return {
        "success": True,
        "log_id": log_entry["id"],
        "congratulations_sent": congrats_sent,
        "message": "Sugar log added successfully"
    }

@router.post("/staff/patients/{patient_id}/hba1c")
async def add_hba1c_result(patient_id: str, value: float, date: str, notes: Optional[str] = None):
    """Add HbA1c test result for a managed patient"""
    
    patient = await db.glydex_managed_patients.find_one({"patient_id": patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    hba1c_entry = {
        "id": str(uuid.uuid4()),
        "value": value,
        "date": date,
        "notes": notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.glydex_managed_patients.update_one(
        {"patient_id": patient_id},
        {
            "$push": {"hba1c_history": hba1c_entry},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # Check for improved HbA1c and send congratulations
    congrats_sent = False
    previous_hba1c = patient.get("hba1c_history", [{}])[-1] if patient.get("hba1c_history") else None
    
    if patient.get("send_congratulations", True):
        is_improvement = False
        message = ""
        
        if value < 7.0:
            is_improvement = True
            message = f"Excellent! Your HbA1c of {value}% shows outstanding diabetes control. Congratulations! - Dr. Vikas"
        elif previous_hba1c and previous_hba1c.get("value") and value < previous_hba1c.get("value"):
            is_improvement = True
            improvement = round(previous_hba1c.get("value") - value, 1)
            message = f"Great progress! Your HbA1c improved by {improvement}% to {value}%. Keep it up! - Dr. Vikas"
        
        if is_improvement and message:
            if send_sms_notification and patient.get("phone"):
                try:
                    await send_sms_notification(patient.get("phone"), message)
                    congrats_sent = True
                except Exception as e:
                    logger.error(f"Failed to send HbA1c congratulations: {e}")
    
    return {
        "success": True,
        "hba1c_id": hba1c_entry["id"],
        "value": value,
        "congratulations_sent": congrats_sent,
        "message": "HbA1c result added"
    }

@router.put("/staff/patients/{patient_id}/congratulations")
async def toggle_congratulations(patient_id: str, toggle: CongratulatoryMessageToggle):
    """Toggle congratulatory message setting for a patient"""
    
    result = await db.glydex_managed_patients.update_one(
        {"patient_id": patient_id},
        {"$set": {
            "send_congratulations": toggle.enabled,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    return {
        "success": True,
        "send_congratulations": toggle.enabled,
        "message": f"Congratulatory messages {'enabled' if toggle.enabled else 'disabled'}"
    }

@router.get("/staff/patients/search")
async def search_diabetes_patients(query: str, doctor: Optional[str] = None):
    """Search diabetes patients by name, phone, or ID"""
    search_filter = {
        "$or": [
            {"patient_name": {"$regex": query, "$options": "i"}},
            {"phone": {"$regex": query}},
            {"patient_id": {"$regex": query, "$options": "i"}}
        ],
        "status": "active"
    }
    
    if doctor:
        search_filter["doctor_assigned"] = {"$regex": doctor, "$options": "i"}
    
    patients = await db.glydex_managed_patients.find(
        search_filter,
        {"_id": 0}
    ).limit(20).to_list(20)
    
    return {"success": True, "results": patients}

@router.get("/staff/reports/summary")
async def get_diabetes_summary_report(doctor: Optional[str] = None):
    """Get summary report of all managed diabetes patients"""
    query = {"status": "active"}
    if doctor:
        query["doctor_assigned"] = {"$regex": doctor, "$options": "i"}
    
    patients = await db.glydex_managed_patients.find(query, {"_id": 0}).to_list(500)
    
    # Calculate statistics
    total_patients = len(patients)
    controlled = 0  # HbA1c < 7%
    uncontrolled = 0
    
    for p in patients:
        latest_hba1c = p.get("hba1c_history", [{}])[-1] if p.get("hba1c_history") else {}
        if latest_hba1c.get("value"):
            if latest_hba1c.get("value") < 7.0:
                controlled += 1
            else:
                uncontrolled += 1
    
    return {
        "success": True,
        "summary": {
            "total_patients": total_patients,
            "controlled": controlled,
            "uncontrolled": uncontrolled,
            "unknown_status": total_patients - controlled - uncontrolled,
            "control_rate": round(controlled / total_patients * 100, 1) if total_patients > 0 else 0
        },
        "doctor": doctor or "All"
    }



# ============ DIABETES FORM LINK SYSTEM (Similar to ANC) ============

class DiabetesFormSendRequest(BaseModel):
    """Request model to send diabetes form link"""
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    send_via: str = "both"  # email, sms, both
    clinic: str = "Pushpa Clinic"
    doctor: str = "Dr. Vikas Jha"

class DiabetesFormSubmission(BaseModel):
    """Submission model for diabetes registration form"""
    full_name: str
    age: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    diabetes_type: str
    date_of_diagnosis: Optional[str] = None
    family_history: bool = False
    current_medications: Optional[str] = None
    insulin_user: bool = False
    insulin_type: Optional[str] = None
    insulin_dosage: Optional[str] = None
    medical_conditions: Optional[List[str]] = []
    allergies: Optional[str] = None
    previous_surgeries: Optional[str] = None
    diet_type: Optional[str] = None
    exercise_frequency: Optional[str] = None
    smoking: bool = False
    alcohol: bool = False
    recent_fbs: Optional[str] = None
    recent_ppbs: Optional[str] = None
    recent_hba1c: Optional[str] = None
    last_test_date: Optional[str] = None
    symptoms: Optional[str] = None
    concerns: Optional[str] = None
    consent_given: bool = False

@router.post("/form/send")
async def send_diabetes_form_link(data: DiabetesFormSendRequest):
    """Send Diabetes form link to patient via Email/SMS"""
    
    # Create form record
    form_id = str(uuid.uuid4())
    base_url = os.environ.get("FRONTEND_URL", "https://nevika-cura-portal.preview.emergentagent.com")
    form_link = f"{base_url}/diabetes-form/{form_id}"
    
    form_record = {
        "id": form_id,
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
    
    await db.diabetes_forms.insert_one(form_record)
    
    # Send Email
    email_sent = False
    if data.patient_email and data.send_via in ["email", "both"]:
        try:
            email_html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #10b981, #14b8a6); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">📋 Diabetes Registration Form</h1>
                    <p style="margin: 10px 0 0; opacity: 0.9;">Nevika Cura Healthcare - Glydex</p>
                </div>
                
                <div style="background: #ecfdf5; padding: 25px; border: 1px solid #a7f3d0;">
                    <p style="color: #333; font-size: 16px;">Dear <strong>{data.patient_name}</strong>,</p>
                    
                    <p style="color: #555;">Please fill out your Diabetes Registration Form by clicking the button below:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{form_link}" style="background: linear-gradient(135deg, #10b981, #14b8a6); color: white; padding: 15px 40px; border-radius: 30px; text-decoration: none; font-weight: bold; display: inline-block;">
                            Fill Diabetes Form
                        </a>
                    </div>
                    
                    <p style="color: #555; font-size: 14px;">Or copy this link: <br><a href="{form_link}" style="color: #10b981; word-break: break-all;">{form_link}</a></p>
                    
                    <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin-top: 20px;">
                        <p style="margin: 0; color: #92400e; font-size: 14px;">
                            <strong>📋 Instructions:</strong><br>
                            1. Click the link above to open the form<br>
                            2. Fill in all required information about your diabetes history<br>
                            3. Submit the form online<br>
                            4. Our team will contact you to schedule your consultation
                        </p>
                    </div>
                </div>
                
                <div style="background: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 12px 12px;">
                    <p style="color: #64748b; font-size: 12px; margin: 0;">
                        {data.clinic} | {data.doctor}<br>
                        For queries: <a href="mailto:nevikacura@gmail.com" style="color: #10b981;">nevikacura@gmail.com</a>
                    </p>
                </div>
            </div>
            """
            
            if send_email_notification:
                await send_email_notification(
                    "📋 Fill Your Diabetes Registration Form - Nevika Cura",
                    email_html,
                    data.patient_email,
                    "📋 Fill Your Diabetes Registration Form - Nevika Cura",
                    email_html
                )
                email_sent = True
                logger.info(f"Diabetes form email sent to {data.patient_email}")
        except Exception as e:
            logger.error(f"Failed to send Diabetes form email: {e}")
    
    # Send SMS
    sms_sent = False
    if data.patient_phone and data.send_via in ["sms", "both"]:
        try:
            sms_text = f"Dear {data.patient_name}, Please fill your Diabetes Registration Form: {form_link} - Nevika Cura Healthcare ({data.clinic})"
            
            if send_sms_notification:
                await send_sms_notification(data.patient_phone, sms_text)
                sms_sent = True
                logger.info(f"Diabetes form SMS sent to {data.patient_phone}")
        except Exception as e:
            logger.error(f"Failed to send Diabetes form SMS: {e}")
    
    return {
        "success": True,
        "form_id": form_id,
        "form_link": form_link,
        "email_sent": email_sent,
        "sms_sent": sms_sent,
        "message": f"Diabetes form link sent to {data.patient_name}"
    }

@router.get("/form/{form_id}")
async def get_diabetes_form(form_id: str):
    """Get Diabetes form details for patient to fill"""
    form = await db.diabetes_forms.find_one({"id": form_id}, {"_id": 0})
    
    if not form:
        return {"error": "Form not found or expired"}
    
    # Check if form has expired (1 month = 30 days)
    created_at = form.get("created_at")
    if created_at and form.get("status") == "allotted":
        try:
            created_date = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            expiry_date = created_date + timedelta(days=30)
            if datetime.now(timezone.utc) > expiry_date:
                return {"error": "This form link has expired. Please request a new form link from the clinic."}
        except Exception:
            pass
    
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
        "form_data": form.get("form_data") if form["status"] == "filled" else None,
        "expires_at": (datetime.fromisoformat(created_at.replace("Z", "+00:00")) + timedelta(days=30)).isoformat() if created_at else None
    }

@router.post("/form/{form_id}/submit")
async def submit_diabetes_form(form_id: str, data: DiabetesFormSubmission):
    """Submit filled Diabetes form"""
    form = await db.diabetes_forms.find_one({"id": form_id})
    
    if not form:
        return {"error": "Form not found"}
    
    if form["status"] == "filled":
        return {"error": "Form already submitted"}
    
    # Update form with submitted data
    await db.diabetes_forms.update_one(
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
                <div style="background: #10b981; color: white; padding: 20px; text-align: center;">
                    <h2 style="margin: 0;">✅ New Diabetes Form Submitted</h2>
                </div>
                <div style="padding: 20px; background: #ecfdf5;">
                    <p><strong>Patient:</strong> {data.full_name}</p>
                    <p><strong>Phone:</strong> {data.phone}</p>
                    <p><strong>Diabetes Type:</strong> {data.diabetes_type}</p>
                    <p><strong>HbA1c:</strong> {data.recent_hba1c or 'Not provided'}%</p>
                    <p><strong>Insulin User:</strong> {'Yes' if data.insulin_user else 'No'}</p>
                    <p><strong>Clinic:</strong> {form.get('clinic')}</p>
                    <p><strong>Form ID:</strong> {form_id[:8].upper()}</p>
                </div>
                <div style="padding: 15px; background: #fef3c7; text-align: center;">
                    <p style="margin: 0; color: #92400e;">Please review and schedule a consultation.</p>
                </div>
            </div>
            """
            await send_email_notification(
                f"✅ Diabetes Form Submitted - {data.full_name}",
                admin_html
            )
    except Exception as e:
        logger.error(f"Failed to send admin notification: {e}")
    
    return {
        "success": True,
        "message": "Diabetes form submitted successfully",
        "form_id": form_id
    }

@router.get("/forms/list")
async def list_diabetes_forms(clinic: str = None, status: str = None):
    """List all Diabetes forms with status for staff dashboard"""
    query = {}
    if clinic:
        query["clinic"] = {"$regex": clinic, "$options": "i"}
    if status:
        query["status"] = status
    
    forms = await db.diabetes_forms.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Add expiry info to each form
    now = datetime.now(timezone.utc)
    for form in forms:
        created_at = form.get("created_at")
        if created_at and form.get("status") == "allotted":
            try:
                created_date = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                expiry_date = created_date + timedelta(days=30)
                form["expires_at"] = expiry_date.isoformat()
                form["is_expired"] = now > expiry_date
                days_left = (expiry_date - now).days
                form["days_until_expiry"] = max(0, days_left)
            except Exception:
                form["is_expired"] = False
                form["days_until_expiry"] = None
        else:
            form["is_expired"] = False
            form["days_until_expiry"] = None
    
    # Get counts (excluding expired)
    total = len(forms)
    allotted = len([f for f in forms if f["status"] == "allotted" and not f.get("is_expired")])
    expired = len([f for f in forms if f["status"] == "allotted" and f.get("is_expired")])
    filled = len([f for f in forms if f["status"] == "filled"])
    
    return {
        "success": True,
        "forms": forms,
        "counts": {
            "total": total,
            "allotted": allotted,
            "expired": expired,
            "filled": filled
        }
    }

@router.post("/form/{form_id}/resend")
async def resend_diabetes_form_link(form_id: str):
    """Resend/Regenerate diabetes form link (creates new form with same patient data)"""
    old_form = await db.diabetes_forms.find_one({"id": form_id}, {"_id": 0})
    
    if not old_form:
        return {"error": "Form not found"}
    
    # Create new form with same patient data
    new_form_id = str(uuid.uuid4())
    base_url = os.environ.get("FRONTEND_URL", "https://nevika-cura-portal.preview.emergentagent.com")
    new_form_link = f"{base_url}/diabetes-form/{new_form_id}"
    
    new_form_record = {
        "id": new_form_id,
        "patient_name": old_form.get("patient_name"),
        "patient_phone": old_form.get("patient_phone"),
        "patient_email": old_form.get("patient_email"),
        "clinic": old_form.get("clinic"),
        "doctor": old_form.get("doctor"),
        "status": "allotted",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "sent_via": old_form.get("sent_via", "both"),
        "form_link": new_form_link,
        "form_data": None,
        "submitted_at": None,
        "resent_from": form_id
    }
    
    await db.diabetes_forms.insert_one(new_form_record)
    
    # Mark old form as replaced
    await db.diabetes_forms.update_one(
        {"id": form_id},
        {"$set": {"replaced_by": new_form_id}}
    )
    
    # Send notifications
    email_sent = False
    sms_sent = False
    send_via = old_form.get("sent_via", "both")
    
    if old_form.get("patient_email") and send_via in ["email", "both"]:
        try:
            email_html = f"""
            <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #10b981, #14b8a6); color: white; padding: 20px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h2>📋 New Diabetes Form Link</h2>
                </div>
                <div style="padding: 20px; background: #ecfdf5;">
                    <p>Dear <strong>{old_form.get('patient_name')}</strong>,</p>
                    <p>Here is your new diabetes registration form link:</p>
                    <div style="text-align: center; margin: 20px 0;">
                        <a href="{new_form_link}" style="background: #10b981; color: white; padding: 15px 30px; border-radius: 25px; text-decoration: none; font-weight: bold;">Fill Diabetes Form</a>
                    </div>
                    <p style="font-size: 14px; color: #666;">This link is valid for 30 days.</p>
                </div>
            </div>
            """
            if send_email_notification:
                await send_email_notification("📋 New Diabetes Form Link - Nevika Cura", email_html, old_form.get("patient_email"), "📋 New Diabetes Form Link", email_html)
                email_sent = True
        except Exception as e:
            logger.error(f"Failed to send resend email: {e}")
    
    if old_form.get("patient_phone") and send_via in ["sms", "both"]:
        try:
            sms_text = f"Dear {old_form.get('patient_name')}, Here is your new Diabetes Registration Form link: {new_form_link} - Nevika Cura"
            if send_sms_notification:
                await send_sms_notification(old_form.get("patient_phone"), sms_text)
                sms_sent = True
        except Exception as e:
            logger.error(f"Failed to send resend SMS: {e}")
    
    return {
        "success": True,
        "new_form_id": new_form_id,
        "new_form_link": new_form_link,
        "email_sent": email_sent,
        "sms_sent": sms_sent,
        "message": f"New form link sent to {old_form.get('patient_name')}"
    }
