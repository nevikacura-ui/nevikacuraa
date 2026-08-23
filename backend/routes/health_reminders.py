"""
Health Reminders - Portal-specific push notification reminders
Uses Firebase FCM to send health habit reminders
"""

from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import os
import jwt as pyjwt
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health-reminders", tags=["Health Reminders"])

db = None
JWT_SECRET = None

def set_db(database):
    global db
    db = database

def set_jwt_secret(secret):
    global JWT_SECRET
    JWT_SECRET = secret

async def _get_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    token = authorization.split(" ")[1]
    try:
        secret = JWT_SECRET or os.environ.get("JWT_SECRET", "nevika-health-secret-key-2024")
        payload = pyjwt.decode(token, secret, algorithms=["HS256"])
        user_id = payload.get("sub") or payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


DEFAULT_REMINDERS = {
    "evara": [
        {"id": "period_log", "title": "Log Your Period", "body": "Track your cycle for better predictions", "time": "09:00", "portal": "evara", "icon": "heart", "enabled": True},
        {"id": "pms_check", "title": "PMS Self-Check", "body": "How are you feeling today? Log symptoms", "time": "20:00", "portal": "evara", "icon": "activity", "enabled": False},
        {"id": "hydration", "title": "Stay Hydrated", "body": "Drink water! Aim for 8 glasses today", "time": "12:00", "portal": "evara", "icon": "droplets", "enabled": False},
    ],
    "glydex": [
        {"id": "fbs_morning", "title": "Morning Sugar Check", "body": "Time for your fasting blood sugar reading", "time": "07:00", "portal": "glydex", "icon": "activity", "enabled": True},
        {"id": "ppbs_lunch", "title": "Post-Lunch Sugar", "body": "Check your sugar 2 hours after lunch", "time": "14:00", "portal": "glydex", "icon": "clock", "enabled": True},
        {"id": "ppbs_dinner", "title": "Post-Dinner Sugar", "body": "Check your sugar 2 hours after dinner", "time": "21:00", "portal": "glydex", "icon": "moon", "enabled": False},
        {"id": "medicine", "title": "Medicine Reminder", "body": "Time to take your diabetes medication", "time": "08:00", "portal": "glydex", "icon": "pill", "enabled": False},
    ],
    "reneu": [
        {"id": "morning_workout", "title": "Morning Workout", "body": "Start your day with today's fitness program", "time": "06:30", "portal": "reneu", "icon": "dumbbell", "enabled": True},
        {"id": "meditation", "title": "Mindfulness Break", "body": "5-minute meditation for mental clarity", "time": "15:00", "portal": "reneu", "icon": "brain", "enabled": False},
        {"id": "sleep_log", "title": "Log Your Sleep", "body": "How did you sleep? Track your rest quality", "time": "08:00", "portal": "reneu", "icon": "moon", "enabled": True},
        {"id": "skin_routine", "title": "Evening Skincare", "body": "Time for your evening skincare routine", "time": "21:00", "portal": "reneu", "icon": "sparkles", "enabled": False},
    ],
    "alyne": [
        {"id": "feeding", "title": "Feeding Time", "body": "Time for baby's next feed", "time": "10:00", "portal": "alyne", "icon": "baby", "enabled": False},
        {"id": "vaccination", "title": "Vaccination Reminder", "body": "Check upcoming vaccination schedule", "time": "09:00", "portal": "alyne", "icon": "syringe", "enabled": False},
        {"id": "growth_track", "title": "Growth Check", "body": "Time to measure and log growth data", "time": "10:00", "portal": "alyne", "icon": "trending-up", "enabled": False},
    ],
}


class ReminderUpdate(BaseModel):
    reminder_id: str
    portal: str
    enabled: bool
    time: Optional[str] = None


class TestNotification(BaseModel):
    title: str
    body: str


@router.get("/defaults/{portal}")
async def get_default_reminders(portal: str):
    """Get default reminder templates for a portal"""
    if portal not in DEFAULT_REMINDERS:
        raise HTTPException(status_code=404, detail="Portal not found")
    return {"reminders": DEFAULT_REMINDERS[portal]}


@router.get("/my-reminders")
async def get_user_reminders(user=Depends(_get_user)):
    """Get user's configured reminders"""
    reminders = await db.health_reminders.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).to_list(50)
    return {"reminders": reminders}


@router.post("/configure")
async def configure_reminder(data: ReminderUpdate, user=Depends(_get_user)):
    """Enable/disable a reminder for the user"""
    defaults = DEFAULT_REMINDERS.get(data.portal, [])
    template = next((r for r in defaults if r["id"] == data.reminder_id), None)
    if not template:
        raise HTTPException(status_code=404, detail="Reminder template not found")

    reminder = {
        "user_id": user["id"],
        "reminder_id": data.reminder_id,
        "portal": data.portal,
        "title": template["title"],
        "body": template["body"],
        "icon": template["icon"],
        "time": data.time or template["time"],
        "enabled": data.enabled,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.health_reminders.update_one(
        {"user_id": user["id"], "reminder_id": data.reminder_id},
        {"$set": reminder},
        upsert=True,
    )

    return {"success": True, "reminder": reminder}


@router.post("/test-notification")
async def send_test_notification(data: TestNotification, user=Depends(_get_user)):
    """Send a test push notification to the current user"""
    user_email = user.get("email")
    if not user_email:
        raise HTTPException(status_code=400, detail="User email not found")

    tokens = await db.fcm_tokens.find(
        {"user_email": user_email, "active": True}, {"_id": 0, "token": 1}
    ).to_list(10)

    if not tokens:
        return {"success": False, "message": "No active device tokens. Enable notifications in your browser first."}

    sent = 0
    failed = 0
    try:
        from firebase_admin import messaging
        for t in tokens:
            try:
                msg = messaging.Message(
                    notification=messaging.Notification(title=data.title, body=data.body),
                    webpush=messaging.WebpushConfig(
                        notification=messaging.WebpushNotification(
                            title=data.title, body=data.body,
                            icon="/logo192.png", badge="/logo192.png",
                        ),
                    ),
                    token=t["token"],
                )
                messaging.send(msg)
                sent += 1
            except Exception as e:
                logger.warning(f"FCM send failed: {e}")
                failed += 1
    except Exception as e:
        logger.error(f"Firebase error: {e}")
        return {"success": False, "message": str(e)}

    return {"success": True, "sent": sent, "failed": failed}
