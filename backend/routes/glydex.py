"""
Glydex - Diabetes Care Portal
All Glydex-related routes for blood sugar tracking, reminders, reports, etc.
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import os
import logging

from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/glydex", tags=["Glydex"])

# MongoDB connection - will be injected by server.py
db = None

def set_db(database):
    """Set the database instance from server.py"""
    global db
    db = database

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
    lab_name: str = ""
    notes: str = ""

# ============ USER MODEL ============

class User(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None

# ============ AUTH HELPER ============

import jwt
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')

async def get_current_user(authorization: str = Header(None)) -> User:
    """Get current authenticated user"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_data = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user_data:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user_data)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

async def verify_admin(authorization: str = Header(None)):
    """Verify admin token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Admin authentication required")
    
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        return payload
    except:
        raise HTTPException(status_code=401, detail="Invalid admin token")

# ============ HELPER FUNCTIONS ============

async def schedule_glydex_test_reminders(user_id: str, profile: dict):
    """Schedule test reminders based on diabetes profile"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    last_hba1c = profile.get("lastHba1cDate")
    if last_hba1c:
        next_hba1c = (datetime.strptime(last_hba1c, "%Y-%m-%d") + timedelta(days=90)).strftime("%Y-%m-%d")
    else:
        next_hba1c = (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%d")
    
    last_kidney = profile.get("lastKidneyTestDate")
    if last_kidney:
        next_kidney = (datetime.strptime(last_kidney, "%Y-%m-%d") + timedelta(days=365)).strftime("%Y-%m-%d")
    else:
        next_kidney = (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d")
    
    await db.glydex_reminders.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "hba1c_next_date": next_hba1c,
            "kidney_test_next_date": next_kidney,
            "fbs_reminder_enabled": True,
            "created_at": today,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )

async def send_push_notification(user_id: str, title: str, body: str, url: str = "/", tag: str = None):
    """Send push notification - stub for when called from this module"""
    logger.info(f"Push to {user_id}: {title}")
    return {"success": True}

# ============ GLYDEX ROUTES ============

@router.get("/profile")
async def get_glydex_profile(user: User = Depends(get_current_user)):
    """Get user's Glydex diabetes profile"""
    profile = await db.glydex_profiles.find_one(
        {"user_id": user.id},
        {"_id": 0}
    )
    return {"profile": profile}

@router.post("/profile")
async def save_glydex_profile(data: GlydexProfile, user: User = Depends(get_current_user)):
    """Save or update user's Glydex diabetes profile with extended diabetes info"""
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
    
    return {"success": True, "message": "Profile saved with diabetes information"}

@router.get("/reminders")
async def get_glydex_reminders(user: User = Depends(get_current_user)):
    """Get user's Glydex test and medicine reminders"""
    reminders = await db.glydex_reminders.find_one(
        {"user_id": user.id},
        {"_id": 0}
    )
    
    last_order = await db.pharmacy_orders.find_one(
        {"user_id": user.id},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    
    medicine_refill_date = None
    if last_order:
        order_date = last_order.get("created_at", "")[:10]
        if order_date:
            medicine_refill_date = (datetime.strptime(order_date, "%Y-%m-%d") + timedelta(days=30)).strftime("%Y-%m-%d")
    
    return {
        "reminders": reminders,
        "medicine_refill_date": medicine_refill_date,
        "last_order": last_order
    }

@router.post("/reminders/update-test-date")
async def update_glydex_test_date(
    test_type: str,
    date: str,
    user: User = Depends(get_current_user)
):
    """Update last test date and reschedule reminder"""
    if test_type == "hba1c":
        next_date = (datetime.strptime(date, "%Y-%m-%d") + timedelta(days=90)).strftime("%Y-%m-%d")
        await db.glydex_profiles.update_one(
            {"user_id": user.id},
            {"$set": {"lastHba1cDate": date}}
        )
        await db.glydex_reminders.update_one(
            {"user_id": user.id},
            {"$set": {"hba1c_next_date": next_date}},
            upsert=True
        )
    elif test_type == "kidney":
        next_date = (datetime.strptime(date, "%Y-%m-%d") + timedelta(days=365)).strftime("%Y-%m-%d")
        await db.glydex_profiles.update_one(
            {"user_id": user.id},
            {"$set": {"lastKidneyTestDate": date}}
        )
        await db.glydex_reminders.update_one(
            {"user_id": user.id},
            {"$set": {"kidney_test_next_date": next_date}},
            upsert=True
        )
    
    return {"success": True, "next_reminder_date": next_date}

@router.post("/send-due-reminders")
async def send_due_glydex_reminders(admin = Depends(verify_admin)):
    """Admin endpoint to trigger sending of due reminders (run daily via cron)"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    sent_count = 0
    
    # Get all users with due HbA1c reminders
    due_hba1c = await db.glydex_reminders.find(
        {"hba1c_next_date": {"$lte": today}},
        {"_id": 0}
    ).to_list(1000)
    
    for reminder in due_hba1c:
        user = await db.users.find_one({"id": reminder["user_id"]}, {"_id": 0})
        if user:
            await send_push_notification(
                user_id=reminder["user_id"],
                title="🩸 HbA1c Test Due",
                body="It's time for your quarterly HbA1c test. Book now on Proton Diagnostics!",
                url="/proton?preselect=HbA1c",
                tag="glydex-hba1c-reminder"
            )
            sent_count += 1
    
    # Get all users with due kidney test reminders
    due_kidney = await db.glydex_reminders.find(
        {"kidney_test_next_date": {"$lte": today}},
        {"_id": 0}
    ).to_list(1000)
    
    for reminder in due_kidney:
        user = await db.users.find_one({"id": reminder["user_id"]}, {"_id": 0})
        if user:
            await send_push_notification(
                user_id=reminder["user_id"],
                title="🧪 Kidney Function Test Due",
                body="Your annual kidney function test is due. Important for diabetes care!",
                url="/proton?preselect=Kidney%20Function%20Test",
                tag="glydex-kidney-reminder"
            )
            sent_count += 1
    
    # Medicine refill reminders (30 days from last order)
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    
    glydex_users = await db.glydex_profiles.find(
        {"medicineReminders": True},
        {"_id": 0, "user_id": 1}
    ).to_list(1000)
    
    for profile in glydex_users:
        user_id = profile["user_id"]
        
        last_order = await db.pharmacy_orders.find_one(
            {"user_id": user_id},
            {"_id": 0},
            sort=[("created_at", -1)]
        )
        
        if last_order:
            order_date = last_order.get("created_at", "")[:10]
            if order_date and order_date <= thirty_days_ago:
                medicines = last_order.get("medicines", [])
                medicine_names = ", ".join([m.get("name", "") for m in medicines[:3]])
                
                await send_push_notification(
                    user_id=user_id,
                    title="💊 Medicine Refill Reminder",
                    body=f"Time to refill: {medicine_names}... Reorder now!",
                    url="/pharmacy",
                    tag="glydex-medicine-refill"
                )
                sent_count += 1
    
    return {"success": True, "reminders_sent": sent_count}

# ============ BLOOD SUGAR LOGS ============

@router.get("/sugar-logs")
async def get_sugar_logs(user: User = Depends(get_current_user)):
    """Get user's blood sugar logs"""
    logs = await db.glydex_sugar_logs.find(
        {"user_id": user.id},
        {"_id": 0}
    ).sort([("date", -1), ("time", -1)]).to_list(100)
    return {"logs": logs}

@router.post("/sugar-logs")
async def add_sugar_log(data: SugarLog, user: User = Depends(get_current_user)):
    """Add a new blood sugar reading"""
    log = {
        "id": str(uuid.uuid4()),
        "user_id": user.id,
        "type": data.type,
        "value": data.value,
        "date": data.date,
        "time": data.time or "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.glydex_sugar_logs.insert_one(log)
    
    value = int(data.value)
    alert = None
    if value < 70:
        alert = "low"
    elif value > 250:
        alert = "very_high"
    elif value > 180:
        alert = "high"
    
    return {
        "success": True, 
        "log": {k: v for k, v in log.items() if k != "_id"},
        "alert": alert
    }

@router.delete("/sugar-logs/{log_id}")
async def delete_sugar_log(log_id: str, user: User = Depends(get_current_user)):
    """Delete a blood sugar log"""
    result = await db.glydex_sugar_logs.delete_one(
        {"id": log_id, "user_id": user.id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Log not found")
    return {"success": True}

@router.get("/sugar-stats")
async def get_sugar_stats(user: User = Depends(get_current_user)):
    """Get blood sugar statistics for the user"""
    logs = await db.glydex_sugar_logs.find(
        {"user_id": user.id}
    ).to_list(1000)
    
    if not logs:
        return {"stats": None}
    
    fbs_values = [int(l["value"]) for l in logs if l.get("type") == "fbs"]
    ppbs_values = [int(l["value"]) for l in logs if l.get("type") == "ppbs"]
    
    stats = {
        "total_readings": len(logs),
        "fbs": {
            "count": len(fbs_values),
            "avg": round(sum(fbs_values) / len(fbs_values)) if fbs_values else None,
            "min": min(fbs_values) if fbs_values else None,
            "max": max(fbs_values) if fbs_values else None
        },
        "ppbs": {
            "count": len(ppbs_values),
            "avg": round(sum(ppbs_values) / len(ppbs_values)) if ppbs_values else None,
            "min": min(ppbs_values) if ppbs_values else None,
            "max": max(ppbs_values) if ppbs_values else None
        }
    }
    
    return {"stats": stats}

# ============ HbA1c LOGS ============

@router.get("/hba1c-logs")
async def get_hba1c_logs(user: User = Depends(get_current_user)):
    """Get user's HbA1c test history"""
    logs = await db.glydex_hba1c_logs.find(
        {"user_id": user.id},
        {"_id": 0}
    ).sort("date", -1).to_list(50)
    return {"logs": logs}

@router.post("/hba1c-logs")
async def add_hba1c_log(data: HbA1cLog, user: User = Depends(get_current_user)):
    """Add a new HbA1c test result"""
    if data.value < 3 or data.value > 20:
        raise HTTPException(status_code=400, detail="Invalid HbA1c value. Normal range is 4-15%")
    
    log = {
        "id": str(uuid.uuid4()),
        "user_id": user.id,
        "value": data.value,
        "date": data.date,
        "lab_name": data.lab_name,
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.glydex_hba1c_logs.insert_one(log)
    
    status = "excellent" if data.value < 6.5 else "good" if data.value < 7 else "fair" if data.value < 8 else "poor"
    
    return {
        "success": True, 
        "log": {k: v for k, v in log.items() if k != "_id"},
        "status": status
    }

@router.delete("/hba1c-logs/{log_id}")
async def delete_hba1c_log(log_id: str, user: User = Depends(get_current_user)):
    """Delete an HbA1c log"""
    result = await db.glydex_hba1c_logs.delete_one(
        {"id": log_id, "user_id": user.id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Log not found")
    return {"success": True}

@router.get("/hba1c-trend")
async def get_hba1c_trend(user: User = Depends(get_current_user)):
    """Get HbA1c trend data for charting"""
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

# ============ SHARE REPORT ============

@router.get("/share-report")
async def generate_glydex_share_report(user: User = Depends(get_current_user)):
    """Generate a shareable text report of blood sugar data for WhatsApp"""
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
        if len(hba1c_logs) > 1:
            for log in hba1c_logs[1:3]:
                report_lines.append(f"   Previous: {log.get('value')}% ({log.get('date')})")
    
    report_lines.extend([
        "",
        "━━━━━━━━━━━━━━━━━━━━━━",
        "*Recent Readings:*"
    ])
    
    for log in sugar_logs[:10]:
        log_type = "FBS" if log.get("type") == "fbs" else "PPBS"
        report_lines.append(f"• {log.get('date')}: {log.get('value')} mg/dL ({log_type})")
    
    report_lines.extend([
        "",
        "━━━━━━━━━━━━━━━━━━━━━━",
        "📱 Report from Nevika Cura - Glydex",
        "🌐 www.nevikacura.com"
    ])
    
    report_text = "\n".join(report_lines)
    
    return {
        "report_text": report_text,
        "whatsapp_url": f"https://wa.me/?text={report_text.replace(chr(10), '%0A').replace(' ', '%20')}"
    }
