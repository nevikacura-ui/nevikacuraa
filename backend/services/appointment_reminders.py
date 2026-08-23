"""
Appointment Reminder Push Notifications
Background scheduler: checks every 10 min, sends push 30 min before appointments.
"""

import asyncio
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)

db = None

def set_db(database):
    global db
    db = database


async def run_reminder_scheduler():
    """Background loop: every 15 minutes, find upcoming appointments and send push reminders."""
    logger.info("Appointment reminder scheduler started")
    while True:
        try:
            await send_upcoming_reminders()
        except asyncio.CancelledError:
            logger.info("Reminder scheduler cancelled")
            break
        except Exception as e:
            logger.error(f"Reminder scheduler error: {e}")
        await asyncio.sleep(600)  # 10 minutes


async def send_upcoming_reminders():
    """Find appointments in the next 20-40 min window and send push + in-app reminders."""
    if db is None:
        return

    now = datetime.now(timezone.utc)
    # IST offset (+5:30)
    ist_offset = timedelta(hours=5, minutes=30)
    now_ist = now + ist_offset

    today_str = now_ist.strftime('%Y-%m-%d')
    # Also check tomorrow if near midnight
    tomorrow_str = (now_ist + timedelta(days=1)).strftime('%Y-%m-%d')

    # Get confirmed/pending appointments for today and tomorrow
    appointments = await db.appointments.find(
        {
            "date": {"$in": [today_str, tomorrow_str]},
            "status": {"$in": ["pending", "confirmed", "Confirmed", "Pending"]},
        },
        {"_id": 0}
    ).to_list(200)

    if not appointments:
        return

    sent_count = 0

    for apt in appointments:
        apt_date = apt.get("date", "")
        apt_time = apt.get("time", "")

        # Parse appointment datetime
        apt_dt = parse_appointment_datetime(apt_date, apt_time, ist_offset)
        if not apt_dt:
            continue

        # Check if appointment is 20-40 minutes from now (30-min reminder window)
        diff_minutes = (apt_dt - now).total_seconds() / 60
        if diff_minutes < 20 or diff_minutes > 40:
            continue

        # Check if reminder already sent
        apt_id = apt.get("id") or apt.get("booking_id") or ""
        already_sent = await db.push_reminders_sent.find_one({"appointment_id": apt_id, "type": "30min"})
        if already_sent:
            continue

        # Send push notification
        patient_email = apt.get("patient_email", "")
        patient_name = apt.get("patient_name", "")
        doctor = apt.get("doctor", "")
        clinic = apt.get("clinic", "")

        title = "Appointment in 30 minutes"
        body = f"Hi {patient_name}, your appointment with {doctor} at {clinic} is at {apt_time}. See you soon!"

        push_sent = await send_push_to_user(patient_email, title, body)

        # Also create in-app notification
        if patient_email:
            await db.notifications.insert_one({
                "user_id": patient_email.lower(),
                "title": title,
                "message": body,
                "type": "appointment_reminder",
                "link": "/profile",
                "read": False,
                "created_at": now.isoformat(),
            })

        # Mark reminder as sent
        await db.push_reminders_sent.insert_one({
            "appointment_id": apt_id,
            "type": "30min",
            "patient_email": patient_email,
            "push_sent": push_sent,
            "sent_at": now.isoformat(),
        })

        sent_count += 1
        logger.info(f"Reminder sent for appointment {apt_id} ({patient_name})")

    if sent_count > 0:
        logger.info(f"Sent {sent_count} appointment reminders")


def parse_appointment_datetime(date_str, time_str, ist_offset):
    """Parse appointment date + time into UTC datetime."""
    if not date_str or not time_str:
        return None

    try:
        # Handle various time formats: "10:00 AM", "10:00", "14:00"
        clean_time = time_str.strip()

        for fmt in ["%Y-%m-%d %I:%M %p", "%Y-%m-%d %I:%M%p", "%Y-%m-%d %H:%M"]:
            try:
                dt_ist = datetime.strptime(f"{date_str} {clean_time}", fmt)
                # Convert IST to UTC
                dt_utc = dt_ist.replace(tzinfo=timezone.utc) - ist_offset
                return dt_utc
            except ValueError:
                continue

        # Try just the date with a default time
        dt_ist = datetime.strptime(date_str, "%Y-%m-%d")
        return dt_ist.replace(tzinfo=timezone.utc)
    except Exception:
        return None


async def send_push_to_user(email, title, body):
    """Send FCM push to all registered tokens for a user."""
    if not email or db is None:
        return False

    tokens = await db.fcm_tokens.find(
        {"user_email": email.lower(), "active": True},
        {"_id": 0, "token": 1}
    ).to_list(10)

    if not tokens:
        return False

    try:
        import firebase_admin
        from firebase_admin import messaging

        sent = False
        for doc in tokens:
            try:
                msg = messaging.Message(
                    notification=messaging.Notification(title=title, body=body),
                    webpush=messaging.WebpushConfig(
                        notification=messaging.WebpushNotification(
                            title=title, body=body,
                            icon="/logo192.png", badge="/logo192.png",
                        ),
                    ),
                    token=doc["token"],
                )
                messaging.send(msg)
                sent = True
            except messaging.UnregisteredError:
                await db.fcm_tokens.update_one({"token": doc["token"]}, {"$set": {"active": False}})
            except Exception as e:
                logger.warning(f"Push send failed: {e}")

        return sent
    except Exception as e:
        logger.error(f"Firebase send error: {e}")
        return False
