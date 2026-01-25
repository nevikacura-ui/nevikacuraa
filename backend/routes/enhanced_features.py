"""
Enhanced Features Module for Nevika Cura
- Smart Notifications & Appointment Reminders
- Enhanced Loyalty & Gamification
- Health Dashboard Data
- Smart Scheduling
- Multi-language Support
"""

from fastapi import APIRouter, HTTPException, Depends, Header, Query, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime, timezone, timedelta
import uuid
import os
import jwt
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Enhanced Features"])

# MongoDB reference
db = None

def set_db(database):
    global db
    db = database

JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("sub") or payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============================================
# MODELS
# ============================================

class NotificationPreferences(BaseModel):
    appointment_reminders: bool = True
    reminder_24h: bool = True
    reminder_1h: bool = True
    medicine_refill: bool = True
    lab_results: bool = True
    promotional: bool = False
    preferred_channel: str = "sms"  # sms, email, push, all

class HealthMetricEntry(BaseModel):
    metric_type: str  # weight, bp_systolic, bp_diastolic, heart_rate, bmi, steps
    value: float
    unit: str
    notes: Optional[str] = None

class AchievementClaim(BaseModel):
    achievement_id: str

class LanguagePreference(BaseModel):
    language: str  # en, hi, mr

# ============================================
# SMART NOTIFICATIONS & REMINDERS
# ============================================

@router.get("/notifications/preferences")
async def get_notification_preferences(user = Depends(get_current_user)):
    """Get user's notification preferences"""
    prefs = await db.notification_preferences.find_one(
        {"user_id": user["id"]}, {"_id": 0}
    )
    
    if not prefs:
        # Default preferences
        prefs = {
            "user_id": user["id"],
            "appointment_reminders": True,
            "reminder_24h": True,
            "reminder_1h": True,
            "medicine_refill": True,
            "lab_results": True,
            "promotional": False,
            "preferred_channel": "sms"
        }
        await db.notification_preferences.insert_one(prefs)
        prefs.pop("_id", None)
    
    return prefs

@router.put("/notifications/preferences")
async def update_notification_preferences(
    prefs: NotificationPreferences,
    user = Depends(get_current_user)
):
    """Update notification preferences"""
    await db.notification_preferences.update_one(
        {"user_id": user["id"]},
        {"$set": {
            "appointment_reminders": prefs.appointment_reminders,
            "reminder_24h": prefs.reminder_24h,
            "reminder_1h": prefs.reminder_1h,
            "medicine_refill": prefs.medicine_refill,
            "lab_results": prefs.lab_results,
            "promotional": prefs.promotional,
            "preferred_channel": prefs.preferred_channel,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"success": True, "message": "Preferences updated"}

@router.get("/notifications/history")
async def get_notification_history(
    limit: int = Query(20, ge=1, le=100),
    user = Depends(get_current_user)
):
    """Get user's notification history"""
    notifications = await db.user_notifications.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Mark unread count
    unread = await db.user_notifications.count_documents({
        "user_id": user["id"],
        "read": False
    })
    
    return {"notifications": notifications, "unread_count": unread}

@router.post("/notifications/mark-read")
async def mark_notifications_read(
    notification_ids: List[str] = None,
    user = Depends(get_current_user)
):
    """Mark notifications as read"""
    query = {"user_id": user["id"]}
    if notification_ids:
        query["id"] = {"$in": notification_ids}
    
    await db.user_notifications.update_many(
        query,
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True}

@router.post("/notifications/schedule-appointment-reminders")
async def schedule_appointment_reminders(appointment_id: str):
    """Schedule reminders for an appointment (called after booking)"""
    appointment = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Parse appointment datetime
    apt_date = appointment.get("date", "")
    apt_time = appointment.get("time", "10:00")
    
    try:
        apt_datetime = datetime.strptime(f"{apt_date} {apt_time}", "%Y-%m-%d %H:%M")
    except:
        apt_datetime = datetime.strptime(apt_date, "%Y-%m-%d")
    
    reminders_created = []
    
    # Get user preferences
    user_id = appointment.get("user_id")
    prefs = await db.notification_preferences.find_one({"user_id": user_id}) or {}
    
    # 24-hour reminder
    if prefs.get("reminder_24h", True):
        reminder_24h = apt_datetime - timedelta(hours=24)
        if reminder_24h > datetime.now():
            reminder_doc = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "appointment_id": appointment_id,
                "reminder_type": "appointment_24h",
                "title": "Appointment Tomorrow",
                "message": f"Reminder: Your appointment with {appointment.get('doctor')} is tomorrow at {apt_time}. Clinic: {appointment.get('clinic')}",
                "scheduled_for": reminder_24h.isoformat(),
                "status": "scheduled",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.scheduled_reminders.insert_one(reminder_doc)
            reminders_created.append("24h")
    
    # 1-hour reminder
    if prefs.get("reminder_1h", True):
        reminder_1h = apt_datetime - timedelta(hours=1)
        if reminder_1h > datetime.now():
            reminder_doc = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "appointment_id": appointment_id,
                "reminder_type": "appointment_1h",
                "title": "Appointment in 1 Hour",
                "message": f"Your appointment with {appointment.get('doctor')} is in 1 hour at {appointment.get('clinic')}. Token: {appointment.get('token_number', 'N/A')}",
                "scheduled_for": reminder_1h.isoformat(),
                "status": "scheduled",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.scheduled_reminders.insert_one(reminder_doc)
            reminders_created.append("1h")
    
    return {"success": True, "reminders_scheduled": reminders_created}

# ============================================
# ENHANCED LOYALTY & GAMIFICATION
# ============================================

ACHIEVEMENTS = {
    "first_appointment": {
        "id": "first_appointment",
        "name": "First Steps",
        "description": "Book your first appointment",
        "icon": "🏥",
        "points": 50,
        "category": "milestone"
    },
    "five_appointments": {
        "id": "five_appointments",
        "name": "Regular Visitor",
        "description": "Complete 5 appointments",
        "icon": "⭐",
        "points": 100,
        "category": "milestone"
    },
    "first_pharmacy": {
        "id": "first_pharmacy",
        "name": "Medicine Master",
        "description": "Place your first pharmacy order",
        "icon": "💊",
        "points": 30,
        "category": "milestone"
    },
    "first_lab": {
        "id": "first_lab",
        "name": "Health Conscious",
        "description": "Book your first lab test",
        "icon": "🔬",
        "points": 40,
        "category": "milestone"
    },
    "health_streak_7": {
        "id": "health_streak_7",
        "name": "Week Warrior",
        "description": "Log health metrics for 7 consecutive days",
        "icon": "🔥",
        "points": 75,
        "category": "streak"
    },
    "health_streak_30": {
        "id": "health_streak_30",
        "name": "Monthly Champion",
        "description": "Log health metrics for 30 consecutive days",
        "icon": "🏆",
        "points": 200,
        "category": "streak"
    },
    "referral_1": {
        "id": "referral_1",
        "name": "Friend Finder",
        "description": "Refer your first friend",
        "icon": "👥",
        "points": 100,
        "category": "social"
    },
    "referral_5": {
        "id": "referral_5",
        "name": "Community Builder",
        "description": "Refer 5 friends",
        "icon": "🌟",
        "points": 300,
        "category": "social"
    },
    "profile_complete": {
        "id": "profile_complete",
        "name": "Identity Verified",
        "description": "Complete your profile with all details",
        "icon": "✅",
        "points": 25,
        "category": "profile"
    },
    "family_added": {
        "id": "family_added",
        "name": "Family First",
        "description": "Add a family member",
        "icon": "👨‍👩‍👧",
        "points": 50,
        "category": "family"
    }
}

@router.get("/gamification/achievements")
async def get_achievements(user = Depends(get_current_user)):
    """Get all achievements and user's progress"""
    # Get user's earned achievements
    earned = await db.user_achievements.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).to_list(100)
    
    earned_ids = {a["achievement_id"] for a in earned}
    
    # Calculate progress for unearned achievements
    progress = {}
    
    # Check appointment count
    apt_count = await db.appointments.count_documents({
        "user_id": user["id"],
        "status": {"$in": ["Completed", "Confirmed"]}
    })
    progress["five_appointments"] = {"current": min(apt_count, 5), "target": 5}
    
    # Check pharmacy orders
    pharma_count = await db.pharmacy_orders.count_documents({"user_id": user["id"]})
    progress["first_pharmacy"] = {"current": min(pharma_count, 1), "target": 1}
    
    # Check lab orders
    lab_count = await db.diagnostic_orders.count_documents({"user_id": user["id"]})
    progress["first_lab"] = {"current": min(lab_count, 1), "target": 1}
    
    # Check referrals
    referral_count = await db.referrals.count_documents({
        "referrer_id": user["id"],
        "status": "completed"
    })
    progress["referral_1"] = {"current": min(referral_count, 1), "target": 1}
    progress["referral_5"] = {"current": min(referral_count, 5), "target": 5}
    
    # Check health streak
    streak = await get_health_logging_streak(user["id"])
    progress["health_streak_7"] = {"current": min(streak, 7), "target": 7}
    progress["health_streak_30"] = {"current": min(streak, 30), "target": 30}
    
    # Check family members
    family_count = await db.family_members.count_documents({"primary_user_id": user["id"]})
    progress["family_added"] = {"current": min(family_count, 1), "target": 1}
    
    # Build response
    all_achievements = []
    for aid, ach in ACHIEVEMENTS.items():
        ach_data = {**ach}
        ach_data["earned"] = aid in earned_ids
        if aid in progress:
            ach_data["progress"] = progress[aid]
        if aid in earned_ids:
            earned_data = next((e for e in earned if e["achievement_id"] == aid), {})
            ach_data["earned_at"] = earned_data.get("earned_at")
        all_achievements.append(ach_data)
    
    # Calculate total points
    total_points = sum(ACHIEVEMENTS[e["achievement_id"]]["points"] for e in earned if e["achievement_id"] in ACHIEVEMENTS)
    
    return {
        "achievements": all_achievements,
        "total_earned": len(earned),
        "total_available": len(ACHIEVEMENTS),
        "total_points": total_points
    }

@router.post("/gamification/check-achievements")
async def check_and_award_achievements(user = Depends(get_current_user)):
    """Check and automatically award achievements"""
    user_id = user["id"]
    newly_earned = []
    
    # Get already earned
    earned = await db.user_achievements.find(
        {"user_id": user_id},
        {"achievement_id": 1}
    ).to_list(100)
    earned_ids = {e["achievement_id"] for e in earned}
    
    # Check each achievement
    # First appointment
    if "first_appointment" not in earned_ids:
        count = await db.appointments.count_documents({"user_id": user_id})
        if count >= 1:
            newly_earned.append(await award_achievement(user_id, "first_appointment"))
    
    # Five appointments
    if "five_appointments" not in earned_ids:
        count = await db.appointments.count_documents({
            "user_id": user_id,
            "status": {"$in": ["Completed", "Confirmed"]}
        })
        if count >= 5:
            newly_earned.append(await award_achievement(user_id, "five_appointments"))
    
    # First pharmacy
    if "first_pharmacy" not in earned_ids:
        count = await db.pharmacy_orders.count_documents({"user_id": user_id})
        if count >= 1:
            newly_earned.append(await award_achievement(user_id, "first_pharmacy"))
    
    # First lab
    if "first_lab" not in earned_ids:
        count = await db.diagnostic_orders.count_documents({"user_id": user_id})
        if count >= 1:
            newly_earned.append(await award_achievement(user_id, "first_lab"))
    
    # Health streaks
    streak = await get_health_logging_streak(user_id)
    if "health_streak_7" not in earned_ids and streak >= 7:
        newly_earned.append(await award_achievement(user_id, "health_streak_7"))
    if "health_streak_30" not in earned_ids and streak >= 30:
        newly_earned.append(await award_achievement(user_id, "health_streak_30"))
    
    # Referrals
    ref_count = await db.referrals.count_documents({
        "referrer_id": user_id,
        "status": "completed"
    })
    if "referral_1" not in earned_ids and ref_count >= 1:
        newly_earned.append(await award_achievement(user_id, "referral_1"))
    if "referral_5" not in earned_ids and ref_count >= 5:
        newly_earned.append(await award_achievement(user_id, "referral_5"))
    
    # Family member
    if "family_added" not in earned_ids:
        fam_count = await db.family_members.count_documents({"primary_user_id": user_id})
        if fam_count >= 1:
            newly_earned.append(await award_achievement(user_id, "family_added"))
    
    return {"newly_earned": [n for n in newly_earned if n], "count": len([n for n in newly_earned if n])}

async def award_achievement(user_id: str, achievement_id: str):
    """Award an achievement to a user"""
    if achievement_id not in ACHIEVEMENTS:
        return None
    
    ach = ACHIEVEMENTS[achievement_id]
    
    # Check if already earned
    existing = await db.user_achievements.find_one({
        "user_id": user_id,
        "achievement_id": achievement_id
    })
    if existing:
        return None
    
    # Award achievement
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "achievement_id": achievement_id,
        "points_earned": ach["points"],
        "earned_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_achievements.insert_one(doc)
    
    # Add points to user
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {"loyalty_points": ach["points"], "gamification_points": ach["points"]}}
    )
    
    # Create notification
    await db.user_notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "achievement",
        "title": f"Achievement Unlocked: {ach['name']}!",
        "message": f"{ach['icon']} {ach['description']} - You earned {ach['points']} points!",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"achievement": ach, "points": ach["points"]}

async def get_health_logging_streak(user_id: str) -> int:
    """Calculate health logging streak"""
    logs = await db.health_metrics.find(
        {"user_id": user_id},
        {"date": 1}
    ).sort("date", -1).to_list(100)
    
    if not logs:
        return 0
    
    # Get unique dates
    dates = sorted(set(l.get("date", "")[:10] for l in logs if l.get("date")), reverse=True)
    
    if not dates:
        return 0
    
    # Check if today or yesterday is logged
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    
    if dates[0] not in [today, yesterday]:
        return 0
    
    # Count consecutive days
    streak = 1
    for i in range(len(dates) - 1):
        current = datetime.strptime(dates[i], "%Y-%m-%d")
        prev = datetime.strptime(dates[i + 1], "%Y-%m-%d")
        if (current - prev).days == 1:
            streak += 1
        else:
            break
    
    return streak

@router.get("/gamification/leaderboard")
async def get_gamification_leaderboard(
    period: str = Query("all", regex="^(weekly|monthly|all)$"),
    limit: int = Query(10, ge=1, le=50)
):
    """Get gamification leaderboard"""
    # Get users sorted by gamification points
    pipeline = [
        {"$match": {"gamification_points": {"$gt": 0}}},
        {"$sort": {"gamification_points": -1}},
        {"$limit": limit},
        {"$project": {
            "_id": 0,
            "id": 1,
            "name": 1,
            "gamification_points": 1
        }}
    ]
    
    users = await db.users.aggregate(pipeline).to_list(limit)
    
    # Add rank and mask names
    leaderboard = []
    for i, u in enumerate(users, 1):
        name = u.get("name", "User")
        masked_name = name[:2] + "*" * (len(name) - 2) if len(name) > 2 else name
        leaderboard.append({
            "rank": i,
            "display_name": masked_name,
            "points": u.get("gamification_points", 0)
        })
    
    return {"leaderboard": leaderboard, "period": period}

# ============================================
# HEALTH DASHBOARD
# ============================================

@router.post("/health/metrics")
async def log_health_metric(
    metric: HealthMetricEntry,
    user = Depends(get_current_user)
):
    """Log a health metric"""
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "metric_type": metric.metric_type,
        "value": metric.value,
        "unit": metric.unit,
        "notes": metric.notes,
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "time": datetime.now(timezone.utc).strftime("%H:%M"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.health_metrics.insert_one(doc)
    
    # Check achievements
    await check_and_award_achievements(user)
    
    return {"success": True, "metric_id": doc["id"]}

@router.get("/health/metrics")
async def get_health_metrics(
    metric_type: Optional[str] = None,
    days: int = Query(30, ge=1, le=365),
    user = Depends(get_current_user)
):
    """Get health metrics history"""
    from_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    
    query = {"user_id": user["id"], "date": {"$gte": from_date}}
    if metric_type:
        query["metric_type"] = metric_type
    
    metrics = await db.health_metrics.find(
        query,
        {"_id": 0}
    ).sort("date", -1).to_list(500)
    
    return {"metrics": metrics, "count": len(metrics)}

@router.get("/health/dashboard")
async def get_health_dashboard(user = Depends(get_current_user)):
    """Get comprehensive health dashboard data"""
    user_id = user["id"]
    
    # Get recent metrics by type
    metric_types = ["weight", "bp_systolic", "bp_diastolic", "heart_rate", "bmi", "steps"]
    latest_metrics = {}
    trends = {}
    
    for mt in metric_types:
        metrics = await db.health_metrics.find(
            {"user_id": user_id, "metric_type": mt},
            {"_id": 0}
        ).sort("date", -1).limit(30).to_list(30)
        
        if metrics:
            latest_metrics[mt] = metrics[0]
            # Calculate trend (compare last 7 days avg to previous 7 days)
            if len(metrics) >= 7:
                recent_avg = sum(m["value"] for m in metrics[:7]) / 7
                if len(metrics) >= 14:
                    prev_avg = sum(m["value"] for m in metrics[7:14]) / 7
                    change = ((recent_avg - prev_avg) / prev_avg) * 100 if prev_avg else 0
                    trends[mt] = {
                        "direction": "up" if change > 0 else "down" if change < 0 else "stable",
                        "change_percent": round(abs(change), 1)
                    }
    
    # Calculate health score (simplified)
    health_score = 75  # Base score
    if "bmi" in latest_metrics:
        bmi = latest_metrics["bmi"]["value"]
        if 18.5 <= bmi <= 24.9:
            health_score += 10
        elif 25 <= bmi <= 29.9:
            health_score += 5
    
    if "bp_systolic" in latest_metrics:
        bp = latest_metrics["bp_systolic"]["value"]
        if bp < 120:
            health_score += 10
        elif bp < 130:
            health_score += 5
    
    # Get logging streak
    streak = await get_health_logging_streak(user_id)
    
    # Get upcoming appointments
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    upcoming_apts = await db.appointments.find(
        {"user_id": user_id, "date": {"$gte": today}, "status": {"$ne": "Cancelled"}},
        {"_id": 0}
    ).sort("date", 1).limit(3).to_list(3)
    
    # Get pending lab results
    pending_labs = await db.diagnostic_orders.find(
        {"user_id": user_id, "status": {"$in": ["Pending", "Sample Collected"]}},
        {"_id": 0}
    ).limit(5).to_list(5)
    
    return {
        "health_score": min(health_score, 100),
        "latest_metrics": latest_metrics,
        "trends": trends,
        "logging_streak": streak,
        "upcoming_appointments": upcoming_apts,
        "pending_lab_results": pending_labs,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }

@router.get("/health/insights")
async def get_health_insights(user = Depends(get_current_user)):
    """Get personalized health insights and tips"""
    user_id = user["id"]
    insights = []
    
    # Check BMI
    bmi_metrics = await db.health_metrics.find(
        {"user_id": user_id, "metric_type": "bmi"},
        {"_id": 0}
    ).sort("date", -1).limit(1).to_list(1)
    
    if bmi_metrics:
        bmi = bmi_metrics[0]["value"]
        if bmi < 18.5:
            insights.append({
                "type": "warning",
                "category": "weight",
                "title": "Underweight Alert",
                "message": "Your BMI indicates you may be underweight. Consider consulting a nutritionist.",
                "icon": "⚠️"
            })
        elif bmi >= 25:
            insights.append({
                "type": "info",
                "category": "weight",
                "title": "Weight Management",
                "message": "Consider regular exercise and balanced diet to maintain healthy weight.",
                "icon": "💪"
            })
    
    # Check BP
    bp_metrics = await db.health_metrics.find(
        {"user_id": user_id, "metric_type": "bp_systolic"},
        {"_id": 0}
    ).sort("date", -1).limit(5).to_list(5)
    
    if bp_metrics:
        avg_bp = sum(m["value"] for m in bp_metrics) / len(bp_metrics)
        if avg_bp >= 130:
            insights.append({
                "type": "alert",
                "category": "cardiovascular",
                "title": "Blood Pressure Alert",
                "message": "Your recent BP readings are elevated. Please consult Dr. Vikas Jha.",
                "icon": "❤️",
                "action": {"type": "book_appointment", "doctor": "vikas"}
            })
    
    # Check logging streak
    streak = await get_health_logging_streak(user_id)
    if streak >= 7:
        insights.append({
            "type": "success",
            "category": "engagement",
            "title": f"🔥 {streak}-Day Streak!",
            "message": "Great job logging your health metrics consistently!",
            "icon": "🎉"
        })
    elif streak == 0:
        insights.append({
            "type": "reminder",
            "category": "engagement",
            "title": "Start Your Health Journey",
            "message": "Log your first health metric today to start building healthy habits.",
            "icon": "📊"
        })
    
    return {"insights": insights, "generated_at": datetime.now(timezone.utc).isoformat()}

# ============================================
# SMART SCHEDULING
# ============================================

@router.get("/scheduling/suggestions")
async def get_scheduling_suggestions(
    doctor_id: str,
    clinic_id: str,
    user = Depends(get_current_user)
):
    """Get AI-powered scheduling suggestions"""
    # Get doctor's availability for next 7 days
    from datetime import date
    
    suggestions = []
    today = date.today()
    
    # Simple suggestion logic - return least busy slots
    for i in range(7):
        check_date = (today + timedelta(days=i)).strftime("%Y-%m-%d")
        
        # Count existing appointments
        apt_count = await db.appointments.count_documents({
            "doctor": {"$regex": doctor_id, "$options": "i"},
            "clinic_id": clinic_id,
            "date": check_date,
            "status": {"$ne": "Cancelled"}
        })
        
        # Skip if too many appointments
        if apt_count < 20:
            day_name = (today + timedelta(days=i)).strftime("%A")
            suggestions.append({
                "date": check_date,
                "day": day_name,
                "slots_available": 20 - apt_count,
                "recommended": apt_count < 10,
                "message": "Low crowd expected" if apt_count < 10 else "Moderate crowd"
            })
    
    return {
        "suggestions": suggestions[:5],
        "tip": "Morning slots (10-12 PM) typically have shorter wait times."
    }

@router.post("/scheduling/waitlist")
async def join_waitlist(
    doctor_id: str,
    clinic_id: str,
    preferred_date: str,
    user = Depends(get_current_user)
):
    """Join waitlist for a fully booked slot"""
    # Check if already on waitlist
    existing = await db.appointment_waitlist.find_one({
        "user_id": user["id"],
        "doctor_id": doctor_id,
        "preferred_date": preferred_date,
        "status": "waiting"
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Already on waitlist for this date")
    
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user.get("name"),
        "user_phone": user.get("phone"),
        "doctor_id": doctor_id,
        "clinic_id": clinic_id,
        "preferred_date": preferred_date,
        "status": "waiting",
        "position": await db.appointment_waitlist.count_documents({
            "doctor_id": doctor_id,
            "preferred_date": preferred_date,
            "status": "waiting"
        }) + 1,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.appointment_waitlist.insert_one(doc)
    
    return {
        "success": True,
        "position": doc["position"],
        "message": f"You're #{doc['position']} on the waitlist. We'll notify you if a slot opens."
    }

@router.get("/scheduling/waitlist")
async def get_my_waitlist(user = Depends(get_current_user)):
    """Get user's waitlist entries"""
    entries = await db.appointment_waitlist.find(
        {"user_id": user["id"], "status": "waiting"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(10)
    
    return {"waitlist_entries": entries}

@router.delete("/scheduling/waitlist/{waitlist_id}")
async def leave_waitlist(waitlist_id: str, user = Depends(get_current_user)):
    """Leave waitlist"""
    result = await db.appointment_waitlist.update_one(
        {"id": waitlist_id, "user_id": user["id"]},
        {"$set": {"status": "cancelled"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Waitlist entry not found")
    
    return {"success": True, "message": "Removed from waitlist"}

# ============================================
# MULTI-LANGUAGE SUPPORT
# ============================================

TRANSLATIONS = {
    "en": {
        "welcome": "Welcome to Nevika Cura",
        "book_appointment": "Book Appointment",
        "order_medicines": "Order Medicines",
        "lab_tests": "Lab Tests",
        "my_health": "My Health",
        "profile": "Profile",
        "logout": "Logout",
        "home": "Home",
        "appointments": "Appointments",
        "pharmacy": "Pharmacy",
        "diagnostics": "Diagnostics"
    },
    "hi": {
        "welcome": "नेविका कुरा में आपका स्वागत है",
        "book_appointment": "अपॉइंटमेंट बुक करें",
        "order_medicines": "दवाइयाँ ऑर्डर करें",
        "lab_tests": "लैब टेस्ट",
        "my_health": "मेरा स्वास्थ्य",
        "profile": "प्रोफ़ाइल",
        "logout": "लॉग आउट",
        "home": "होम",
        "appointments": "अपॉइंटमेंट्स",
        "pharmacy": "फार्मेसी",
        "diagnostics": "डायग्नोस्टिक्स"
    },
    "mr": {
        "welcome": "नेविका कुरा मध्ये आपले स्वागत आहे",
        "book_appointment": "अपॉइंटमेंट बुक करा",
        "order_medicines": "औषधे ऑर्डर करा",
        "lab_tests": "लॅब चाचण्या",
        "my_health": "माझे आरोग्य",
        "profile": "प्रोफाइल",
        "logout": "लॉग आउट",
        "home": "होम",
        "appointments": "अपॉइंटमेंट्स",
        "pharmacy": "फार्मसी",
        "diagnostics": "डायग्नोस्टिक्स"
    }
}

@router.get("/language/translations/{lang}")
async def get_translations(lang: str = "en"):
    """Get translations for a language"""
    if lang not in TRANSLATIONS:
        lang = "en"
    
    return {"language": lang, "translations": TRANSLATIONS[lang]}

@router.get("/language/preferences")
async def get_language_preference(user = Depends(get_current_user)):
    """Get user's language preference"""
    prefs = await db.user_preferences.find_one(
        {"user_id": user["id"]},
        {"_id": 0, "language": 1}
    )
    
    return {"language": prefs.get("language", "en") if prefs else "en"}

@router.put("/language/preferences")
async def set_language_preference(
    pref: LanguagePreference,
    user = Depends(get_current_user)
):
    """Set user's language preference"""
    if pref.language not in ["en", "hi", "mr"]:
        raise HTTPException(status_code=400, detail="Unsupported language")
    
    await db.user_preferences.update_one(
        {"user_id": user["id"]},
        {"$set": {"language": pref.language, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"success": True, "language": pref.language}

@router.get("/language/available")
async def get_available_languages():
    """Get list of available languages"""
    return {
        "languages": [
            {"code": "en", "name": "English", "native_name": "English"},
            {"code": "hi", "name": "Hindi", "native_name": "हिंदी"},
            {"code": "mr", "name": "Marathi", "native_name": "मराठी"}
        ]
    }
