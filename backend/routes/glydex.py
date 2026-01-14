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
