"""Wellness Routes - Extracted from server.py
Weekly Digest, Health Glance, Smart Reminder Notifications
"""
from fastapi import APIRouter
from datetime import datetime, timezone, timedelta
import asyncio
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

_db = None
_push_notification_fn = None


def set_db(database):
    global _db
    _db = database


def set_push_notification(fn):
    global _push_notification_fn
    _push_notification_fn = fn


@router.post("/weekly-digest/send")
async def trigger_weekly_digest():
    """Manual trigger: send weekly digest as background job to avoid timeout."""
    try:
        from services.weekly_digest import send_weekly_digests
        asyncio.create_task(send_weekly_digests(_db))
        return {"success": True, "message": "Weekly digest send started in background"}
    except Exception as e:
        logger.error(f"Weekly digest trigger error: {e}")
        return {"success": False, "error": str(e)}


@router.get("/weekly-digest/preview/{phone}")
async def preview_weekly_digest(phone: str):
    """Preview weekly digest for a specific user (returns HTML)."""
    try:
        from services.weekly_digest import gather_user_digest_stats, build_digest_email
        user = await _db.users.find_one({"phone": phone}, {"_id": 0, "name": 1, "email": 1})
        stats = await gather_user_digest_stats(_db, phone)
        html = build_digest_email(phone, user.get("name", "") if user else "", user.get("email", "") if user else "", stats)
        from fastapi.responses import HTMLResponse
        return HTMLResponse(content=html)
    except Exception as e:
        logger.error(f"Weekly digest preview error: {e}")
        return {"success": False, "error": str(e)}


@router.get("/health-glance/{phone}")
async def health_glance(phone: str):
    """Aggregated health data for the home page personalization."""
    try:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        active_reminders = await _db.smart_reminders.count_documents({"phone": phone, "is_active": True})
        medical_records = await _db.medical_records.count_documents({"phone": phone})

        # Health streak from gamification
        gam_profile = await _db.gamification_profiles.find_one({"phone": phone}, {"_id": 0, "current_streak": 1})
        health_streak = gam_profile.get("current_streak", 0) if gam_profile else 0

        # CuraCoins balance
        coins_doc = await _db.curacoins.find_one({"phone": phone}, {"_id": 0, "balance": 1})
        cura_coins = coins_doc.get("balance", 0) if coins_doc else 0

        # Completed reminders today
        completed_today = 0
        async for rem in _db.smart_reminders.find({"phone": phone}, {"completion_log": 1, "_id": 0}):
            for log in rem.get("completion_log", []):
                if log.get("date") == today:
                    completed_today += 1
                    break

        # Next upcoming appointment
        next_appointment = None
        upcoming = await _db.appointments.find(
            {"phone": phone, "status": {"$in": ["confirmed", "scheduled"]}, "date": {"$gte": today}},
            {"_id": 0, "doctor_name": 1, "date": 1, "time": 1, "id": 1}
        ).sort("date", 1).limit(1).to_list(length=1)
        if upcoming:
            next_appointment = upcoming[0]

        # --- Health Score (0-100) ---
        streak_score = min(health_streak * 3, 30)
        reminder_score = min(active_reminders * 5, 15) + min(completed_today * 5, 10)
        records_score = min(medical_records * 4, 20)

        # Recent appointments (last 30 days)
        thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
        recent_appts = await _db.appointments.count_documents({
            "phone": phone, "date": {"$gte": thirty_days_ago}
        })
        appt_score = min(recent_appts * 5, 15)

        coins_score = min(cura_coins // 10, 10)

        health_score = streak_score + reminder_score + records_score + appt_score + coins_score
        health_score = max(5, min(health_score, 100))

        score_breakdown = {
            "streaks": {"value": streak_score, "max": 30, "label": "Daily Streaks"},
            "reminders": {"value": reminder_score, "max": 25, "label": "Health Reminders"},
            "records": {"value": records_score, "max": 20, "label": "Medical Records"},
            "appointments": {"value": appt_score, "max": 15, "label": "Regular Checkups"},
            "engagement": {"value": coins_score, "max": 10, "label": "App Engagement"},
        }

        # Week-over-week change
        week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")
        prev_doc = await _db.health_scores.find_one(
            {"phone": phone, "date": {"$lte": week_ago}},
            {"_id": 0, "score": 1}
        )
        prev_score = prev_doc.get("score", health_score) if prev_doc else health_score
        score_change = health_score - prev_score

        # Store today's score
        await _db.health_scores.update_one(
            {"phone": phone, "date": today},
            {"$set": {"phone": phone, "date": today, "score": health_score, "breakdown": score_breakdown}},
            upsert=True
        )

        # Steps today
        steps_doc = await _db.daily_steps.find_one(
            {"phone": phone, "date": today}, {"_id": 0, "steps": 1}
        )
        steps_today = steps_doc.get("steps", 0) if steps_doc else 0

        return {
            "success": True,
            "active_reminders": active_reminders,
            "medical_records": medical_records,
            "health_streak": health_streak,
            "cura_coins": cura_coins,
            "completed_today": completed_today,
            "next_appointment": next_appointment,
            "health_score": health_score,
            "score_change": score_change,
            "score_breakdown": score_breakdown,
            "steps_today": steps_today,
        }
    except Exception as e:
        logger.error(f"Health glance error: {e}")
        return {"success": True, "active_reminders": 0, "medical_records": 0, "health_streak": 0, "cura_coins": 0, "completed_today": 0, "next_appointment": None, "health_score": 5, "score_change": 0, "score_breakdown": {}, "steps_today": 0}


@router.post("/smart-reminders/check-notifications")
async def check_reminder_notifications():
    """Check for due reminders and send push notifications."""
    try:
        now = datetime.now(timezone.utc)
        current_time = now.strftime("%H:%M")
        today = now.strftime("%Y-%m-%d")

        # Find reminders due in the next 5 minutes
        hour, minute = int(current_time.split(":")[0]), int(current_time.split(":")[1])
        time_window = []
        for m in range(minute, min(minute + 5, 60)):
            time_window.append(f"{hour:02d}:{m:02d}")

        due_reminders = await _db.smart_reminders.find({
            "is_active": True,
            "reminder_time": {"$in": time_window},
            "$or": [
                {"reminder_date": today},
                {"recurrence": {"$ne": "once"}},
            ],
        }, {"_id": 0}).to_list(length=50)

        sent = 0
        for rem in due_reminders:
            phone = rem.get("phone")
            if phone and _push_notification_fn:
                await _push_notification_fn(
                    user_id=phone,
                    title=f"Reminder: {rem.get('title', 'Health Reminder')}",
                    body=rem.get("description") or f"Time for your {rem.get('reminder_type', 'health')} reminder",
                    url="/smart-reminders",
                    tag=f"reminder-{rem.get('id', '')}",
                )
                sent += 1

        return {"success": True, "checked": len(due_reminders), "sent": sent}
    except Exception as e:
        logger.error(f"Reminder notification check error: {e}")
        return {"success": False, "error": str(e)}
