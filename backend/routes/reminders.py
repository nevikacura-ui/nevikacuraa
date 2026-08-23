"""
Automated Reminders System
Handles follow-up reminders, appointment reminders, medicine refill reminders, and subscription alerts
"""

from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid

router = APIRouter(prefix="/reminders", tags=["Reminders"])

# Models
class CreateReminder(BaseModel):
    reminder_type: str  # follow_up, appointment, medicine_refill, subscription_expiry, custom
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    user_id: Optional[str] = None
    title: str
    message: str
    scheduled_date: str  # YYYY-MM-DD
    scheduled_time: Optional[str] = "09:00"  # HH:MM
    repeat: Optional[str] = None  # daily, weekly, monthly, none
    metadata: Optional[dict] = None  # Additional data like appointment_id, medicine_name etc.

class MedicineRefillReminder(BaseModel):
    user_id: str
    medicine_name: str
    dosage: str
    days_supply: int  # Number of days the current supply lasts
    remind_before_days: int = 3  # Remind N days before running out

# Helper to get DB
def get_db():
    from database import get_db as _get_db
    return _get_db()

# Routes
@router.post("/create")
async def create_reminder(reminder: CreateReminder):
    """Create a new reminder"""
    db = get_db()
    
    reminder_doc = {
        "id": str(uuid.uuid4()),
        "reminder_type": reminder.reminder_type,
        "patient_name": reminder.patient_name,
        "patient_phone": reminder.patient_phone,
        "patient_email": reminder.patient_email,
        "user_id": reminder.user_id,
        "title": reminder.title,
        "message": reminder.message,
        "scheduled_date": reminder.scheduled_date,
        "scheduled_time": reminder.scheduled_time or "09:00",
        "repeat": reminder.repeat,
        "metadata": reminder.metadata or {},
        "status": "scheduled",  # scheduled, sent, cancelled
        "sent_count": 0,
        "last_sent_at": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.automated_reminders.insert_one(reminder_doc)
    
    return {"success": True, "reminder": {k: v for k, v in reminder_doc.items() if k != "_id"}}

@router.get("/list")
async def list_reminders(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    reminder_type: Optional[str] = None,
    status: Optional[str] = None,
    date: Optional[str] = None
):
    """List all reminders"""
    db = get_db()
    
    query = {}
    if reminder_type:
        query["reminder_type"] = reminder_type
    if status:
        query["status"] = status
    if date:
        query["scheduled_date"] = date
    
    skip = (page - 1) * limit
    total = await db.automated_reminders.count_documents(query)
    reminders = await db.automated_reminders.find(query, {"_id": 0}).sort("scheduled_date", 1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "reminders": reminders,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@router.get("/pending")
async def get_pending_reminders():
    """Get reminders due today and tomorrow"""
    db = get_db()
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
    
    reminders = await db.automated_reminders.find({
        "status": "scheduled",
        "scheduled_date": {"$in": [today, tomorrow]}
    }, {"_id": 0}).sort("scheduled_date", 1).to_list(500)
    
    return {
        "today": [r for r in reminders if r["scheduled_date"] == today],
        "tomorrow": [r for r in reminders if r["scheduled_date"] == tomorrow],
        "total": len(reminders)
    }

@router.post("/medicine-refill")
async def create_medicine_refill_reminder(reminder: MedicineRefillReminder):
    """Create medicine refill reminder for Glydex users"""
    db = get_db()
    
    # Get user info
    user = await db.users.find_one({"id": reminder.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Calculate reminder date
    refill_date = datetime.now(timezone.utc) + timedelta(days=reminder.days_supply - reminder.remind_before_days)
    
    reminder_doc = {
        "id": str(uuid.uuid4()),
        "reminder_type": "medicine_refill",
        "patient_name": user.get("name", "User"),
        "patient_phone": user.get("phone", ""),
        "patient_email": user.get("email"),
        "user_id": reminder.user_id,
        "title": f"Medicine Refill Reminder: {reminder.medicine_name}",
        "message": f"Your {reminder.medicine_name} ({reminder.dosage}) supply will run out in {reminder.remind_before_days} days. Please order a refill.",
        "scheduled_date": refill_date.strftime("%Y-%m-%d"),
        "scheduled_time": "09:00",
        "repeat": None,
        "metadata": {
            "medicine_name": reminder.medicine_name,
            "dosage": reminder.dosage,
            "days_supply": reminder.days_supply
        },
        "status": "scheduled",
        "sent_count": 0,
        "last_sent_at": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.automated_reminders.insert_one(reminder_doc)
    
    return {"success": True, "reminder": {k: v for k, v in reminder_doc.items() if k != "_id"}}

@router.post("/appointment-followup")
async def create_appointment_followup(
    appointment_id: str,
    followup_days: int = 7,
    message: Optional[str] = None
):
    """Create follow-up reminder after an appointment"""
    db = get_db()
    
    appointment = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Calculate follow-up date
    appointment_date = datetime.strptime(appointment.get("date", datetime.now().strftime("%Y-%m-%d")), "%Y-%m-%d")
    followup_date = appointment_date + timedelta(days=followup_days)
    
    default_message = f"Hello {appointment.get('patient_name')}, this is a follow-up reminder from Nevika Cura. It's been {followup_days} days since your appointment with {appointment.get('doctor', 'your doctor')}. If you have any concerns or need to schedule a follow-up visit, please contact us."
    
    reminder_doc = {
        "id": str(uuid.uuid4()),
        "reminder_type": "follow_up",
        "patient_name": appointment.get("patient_name", "Patient"),
        "patient_phone": appointment.get("phone", ""),
        "patient_email": appointment.get("email"),
        "user_id": appointment.get("user_id"),
        "title": "Follow-up Reminder",
        "message": message or default_message,
        "scheduled_date": followup_date.strftime("%Y-%m-%d"),
        "scheduled_time": "10:00",
        "repeat": None,
        "metadata": {
            "appointment_id": appointment_id,
            "doctor": appointment.get("doctor"),
            "original_date": appointment.get("date")
        },
        "status": "scheduled",
        "sent_count": 0,
        "last_sent_at": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.automated_reminders.insert_one(reminder_doc)
    
    return {"success": True, "reminder": {k: v for k, v in reminder_doc.items() if k != "_id"}}

@router.post("/subscription-expiry")
async def check_subscription_expiry_reminders():
    """Check for expiring subscriptions and create reminders"""
    db = get_db()
    
    # Check for Evara subscriptions expiring in 3 days
    today = datetime.now(timezone.utc)
    expiry_check_date = (today + timedelta(days=3)).strftime("%Y-%m-%d")
    
    # Find users with expiring subscriptions
    users = await db.users.find({
        "evara_subscription.active": True,
        "evara_subscription.end_date": {"$lte": expiry_check_date + "T23:59:59"}
    }, {"_id": 0}).to_list(1000)
    
    reminders_created = 0
    for user in users:
        sub = user.get("evara_subscription", {})
        end_date = sub.get("end_date", "")[:10]
        
        # Check if reminder already exists
        existing = await db.automated_reminders.find_one({
            "user_id": user["id"],
            "reminder_type": "subscription_expiry",
            "metadata.end_date": end_date
        })
        
        if not existing:
            reminder_doc = {
                "id": str(uuid.uuid4()),
                "reminder_type": "subscription_expiry",
                "patient_name": user.get("name", "User"),
                "patient_phone": user.get("phone", ""),
                "patient_email": user.get("email"),
                "user_id": user["id"],
                "title": "Evara Subscription Expiring Soon",
                "message": f"Your Evara {sub.get('plan_name', 'subscription')} is expiring on {end_date}. Renew now to continue enjoying premium features!",
                "scheduled_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "scheduled_time": "10:00",
                "repeat": None,
                "metadata": {
                    "plan_name": sub.get("plan_name"),
                    "end_date": end_date
                },
                "status": "scheduled",
                "sent_count": 0,
                "last_sent_at": None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.automated_reminders.insert_one(reminder_doc)
            reminders_created += 1
    
    return {"success": True, "reminders_created": reminders_created}

@router.delete("/{reminder_id}")
async def cancel_reminder(reminder_id: str):
    """Cancel a scheduled reminder"""
    db = get_db()
    
    result = await db.automated_reminders.update_one(
        {"id": reminder_id, "status": "scheduled"},
        {"$set": {"status": "cancelled"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found or already processed")
    
    return {"success": True, "message": "Reminder cancelled"}

@router.post("/process-due")
async def process_due_reminders(secret: str = ""):
    """Process and send all due reminders (call via cron job)"""
    # Simple secret check for cron security
    import os
    cron_secret = os.environ.get("CRON_SECRET", "nevika_cron_2026")
    if secret != cron_secret:
        raise HTTPException(status_code=403, detail="Invalid secret")
    
    db = get_db()
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    current_time = datetime.now(timezone.utc).strftime("%H:%M")
    
    # Find due reminders
    reminders = await db.automated_reminders.find({
        "status": "scheduled",
        "scheduled_date": today,
        "scheduled_time": {"$lte": current_time}
    }, {"_id": 0}).to_list(500)
    
    sent_count = 0
    failed_count = 0
    
    try:
        from server import send_sms_notification, send_email_notification, send_push_notification
        
        for reminder in reminders:
            try:
                # Send SMS
                if reminder.get("patient_phone"):
                    await send_sms_notification(reminder["patient_phone"], reminder["message"])
                
                # Send Email
                if reminder.get("patient_email"):
                    await send_email_notification(
                        reminder["patient_email"],
                        reminder["title"],
                        reminder["message"]
                    )
                
                # Send Push Notification
                if reminder.get("user_id"):
                    await send_push_notification(
                        user_id=reminder["user_id"],
                        title=reminder["title"],
                        body=reminder["message"][:100],
                        url="/"
                    )
                
                # Update reminder status
                new_status = "sent"
                if reminder.get("repeat"):
                    # Schedule next occurrence
                    new_status = "scheduled"
                    if reminder["repeat"] == "daily":
                        next_date = (datetime.strptime(reminder["scheduled_date"], "%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d")
                    elif reminder["repeat"] == "weekly":
                        next_date = (datetime.strptime(reminder["scheduled_date"], "%Y-%m-%d") + timedelta(weeks=1)).strftime("%Y-%m-%d")
                    elif reminder["repeat"] == "monthly":
                        next_date = (datetime.strptime(reminder["scheduled_date"], "%Y-%m-%d") + timedelta(days=30)).strftime("%Y-%m-%d")
                    else:
                        next_date = reminder["scheduled_date"]
                    
                    await db.automated_reminders.update_one(
                        {"id": reminder["id"]},
                        {
                            "$set": {
                                "scheduled_date": next_date,
                                "last_sent_at": datetime.now(timezone.utc).isoformat()
                            },
                            "$inc": {"sent_count": 1}
                        }
                    )
                else:
                    await db.automated_reminders.update_one(
                        {"id": reminder["id"]},
                        {
                            "$set": {
                                "status": "sent",
                                "last_sent_at": datetime.now(timezone.utc).isoformat()
                            },
                            "$inc": {"sent_count": 1}
                        }
                    )
                
                sent_count += 1
            except Exception as e:
                print(f"Failed to send reminder {reminder['id']}: {e}")
                failed_count += 1
    except ImportError:
        raise HTTPException(status_code=500, detail="Notification functions not available")
    
    return {
        "success": True,
        "processed": len(reminders),
        "sent": sent_count,
        "failed": failed_count
    }
