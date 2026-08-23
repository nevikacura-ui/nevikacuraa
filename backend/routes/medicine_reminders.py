"""
Nevika Cura - Smart Medicine Reminders
Auto-schedule reminders based on prescriptions

Features:
1. Auto-create reminders from prescriptions
2. "Time to take medicine" push notifications
3. Refill alerts when stock is low
4. Medication adherence tracking
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import jwt
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/medicine-reminders", tags=["Medicine Reminders"])

# Will be injected from server.py
db = None
JWT_SECRET = None
JWT_ALGORITHM = "HS256"
send_push_notification = None

def set_db(database):
    global db
    db = database

def set_jwt_config(secret, algorithm="HS256"):
    global JWT_SECRET, JWT_ALGORITHM
    JWT_SECRET = secret
    JWT_ALGORITHM = algorithm

def set_notification_function(push_func):
    global send_push_notification
    send_push_notification = push_func


# ============ Models ============

class MedicineReminder(BaseModel):
    medicine_name: str
    dosage: str
    frequency: str  # once_daily, twice_daily, thrice_daily, as_needed
    time_slots: List[str]  # ["08:00", "14:00", "20:00"]
    start_date: str
    end_date: Optional[str] = None
    notes: Optional[str] = None
    total_quantity: Optional[int] = None  # For refill tracking
    remaining_quantity: Optional[int] = None

class UpdateReminder(BaseModel):
    is_active: Optional[bool] = None
    remaining_quantity: Optional[int] = None
    notes: Optional[str] = None

class LogMedicineTaken(BaseModel):
    reminder_id: str
    taken_at: Optional[str] = None
    skipped: bool = False
    skip_reason: Optional[str] = None


# ============ Auth Helper ============

async def verify_user(authorization: str = Header(None)):
    """Verify user token"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        token = authorization.split(' ')[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============ Helper Functions ============

def get_ist_now():
    """Get current IST time"""
    ist_offset = timedelta(hours=5, minutes=30)
    return datetime.now(timezone.utc) + ist_offset

def get_ist_today():
    """Get today's date in IST"""
    return get_ist_now().strftime("%Y-%m-%d")

def parse_frequency(frequency: str) -> int:
    """Return times per day for frequency"""
    freq_map = {
        "once_daily": 1,
        "twice_daily": 2,
        "thrice_daily": 3,
        "four_times": 4,
        "as_needed": 0
    }
    return freq_map.get(frequency, 1)


# ============ User Endpoints ============

@router.get("/my-reminders")
async def get_my_reminders(user = Depends(verify_user)):
    """Get all medicine reminders for the logged-in user"""
    user_id = user.get("sub") or user.get("user_id")
    
    reminders = await db.medicine_reminders.find(
        {"user_id": user_id, "is_active": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Calculate adherence stats
    today = get_ist_today()
    week_ago = (get_ist_now() - timedelta(days=7)).strftime("%Y-%m-%d")
    
    logs = await db.medicine_logs.find({
        "user_id": user_id,
        "date": {"$gte": week_ago}
    }, {"_id": 0}).to_list(500)
    
    taken_count = len([l for l in logs if not l.get("skipped")])
    total_count = len(logs) if logs else 1
    adherence_rate = round((taken_count / total_count) * 100) if total_count > 0 else 0
    
    # Check for low stock medicines
    low_stock = [r for r in reminders if r.get("remaining_quantity", 999) <= 5]
    
    return {
        "success": True,
        "reminders": reminders,
        "stats": {
            "total_active": len(reminders),
            "adherence_rate_7d": adherence_rate,
            "low_stock_count": len(low_stock),
            "doses_taken_7d": taken_count
        },
        "low_stock_alerts": low_stock
    }


@router.post("/create")
async def create_reminder(reminder: MedicineReminder, user = Depends(verify_user)):
    """Create a new medicine reminder"""
    user_id = user.get("sub") or user.get("user_id")
    
    reminder_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "medicine_name": reminder.medicine_name,
        "dosage": reminder.dosage,
        "frequency": reminder.frequency,
        "time_slots": reminder.time_slots,
        "start_date": reminder.start_date,
        "end_date": reminder.end_date,
        "notes": reminder.notes,
        "total_quantity": reminder.total_quantity,
        "remaining_quantity": reminder.remaining_quantity or reminder.total_quantity,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.medicine_reminders.insert_one(reminder_doc)
    
    return {
        "success": True,
        "message": f"Reminder created for {reminder.medicine_name}",
        "reminder_id": reminder_doc["id"]
    }


@router.post("/from-prescription/{prescription_id}")
async def create_from_prescription(prescription_id: str, user = Depends(verify_user)):
    """Auto-create reminders from a prescription"""
    user_id = user.get("sub") or user.get("user_id")
    
    # Get prescription
    prescription = await db.prescriptions.find_one(
        {"id": prescription_id, "user_id": user_id},
        {"_id": 0}
    )
    
    if not prescription:
        # Try pharmacy order
        order = await db.pharmacy_orders.find_one(
            {"id": prescription_id, "user_id": user_id},
            {"_id": 0}
        )
        if order:
            medicines = order.get("medicines", [])
        else:
            raise HTTPException(status_code=404, detail="Prescription not found")
    else:
        medicines = prescription.get("medicines", [])
    
    created_reminders = []
    today = get_ist_today()
    
    for med in medicines:
        # Parse frequency from prescription
        freq = med.get("frequency", "once_daily")
        if "twice" in freq.lower() or "bd" in freq.lower():
            frequency = "twice_daily"
            time_slots = ["09:00", "21:00"]
        elif "thrice" in freq.lower() or "tds" in freq.lower():
            frequency = "thrice_daily"
            time_slots = ["08:00", "14:00", "20:00"]
        else:
            frequency = "once_daily"
            time_slots = ["09:00"]
        
        # Calculate end date from duration
        duration_days = med.get("duration_days", 7)
        end_date = (get_ist_now() + timedelta(days=duration_days)).strftime("%Y-%m-%d")
        
        reminder_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "medicine_name": med.get("name") or med.get("medicine_name", "Medicine"),
            "dosage": med.get("dosage", "As prescribed"),
            "frequency": frequency,
            "time_slots": time_slots,
            "start_date": today,
            "end_date": end_date,
            "notes": med.get("instructions", ""),
            "total_quantity": med.get("quantity"),
            "remaining_quantity": med.get("quantity"),
            "is_active": True,
            "prescription_id": prescription_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.medicine_reminders.insert_one(reminder_doc)
        created_reminders.append(reminder_doc["id"])
    
    return {
        "success": True,
        "message": f"Created {len(created_reminders)} reminders from prescription",
        "reminder_ids": created_reminders
    }


@router.put("/{reminder_id}")
async def update_reminder(reminder_id: str, update: UpdateReminder, user = Depends(verify_user)):
    """Update a medicine reminder"""
    user_id = user.get("sub") or user.get("user_id")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.medicine_reminders.update_one(
        {"id": reminder_id, "user_id": user_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    return {"success": True, "message": "Reminder updated"}


@router.delete("/{reminder_id}")
async def delete_reminder(reminder_id: str, user = Depends(verify_user)):
    """Delete (deactivate) a medicine reminder"""
    user_id = user.get("sub") or user.get("user_id")
    
    result = await db.medicine_reminders.update_one(
        {"id": reminder_id, "user_id": user_id},
        {"$set": {"is_active": False, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    return {"success": True, "message": "Reminder deleted"}


@router.post("/log")
async def log_medicine_taken(log: LogMedicineTaken, user = Depends(verify_user)):
    """Log that medicine was taken or skipped"""
    user_id = user.get("sub") or user.get("user_id")
    
    # Get reminder details
    reminder = await db.medicine_reminders.find_one(
        {"id": log.reminder_id, "user_id": user_id},
        {"_id": 0}
    )
    
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    now = get_ist_now()
    log_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "reminder_id": log.reminder_id,
        "medicine_name": reminder.get("medicine_name"),
        "date": now.strftime("%Y-%m-%d"),
        "time": now.strftime("%H:%M"),
        "taken_at": log.taken_at or now.isoformat(),
        "skipped": log.skipped,
        "skip_reason": log.skip_reason,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.medicine_logs.insert_one(log_doc)
    
    # Update remaining quantity if taken
    if not log.skipped and reminder.get("remaining_quantity"):
        new_qty = max(0, reminder["remaining_quantity"] - 1)
        await db.medicine_reminders.update_one(
            {"id": log.reminder_id},
            {"$set": {"remaining_quantity": new_qty}}
        )
        
        # Send refill alert if low
        if new_qty <= 5:
            logger.info(f"Low stock alert for {reminder.get('medicine_name')}: {new_qty} remaining")
            # Send WhatsApp refill reminder
            try:
                user_phone = reminder.get("user_phone") or user.get("phone") or user.get("sub", "")
                if user_phone and len(user_phone) >= 10:
                    from services.msg91_whatsapp import send_msg91_whatsapp, TEMPLATES
                    medicine_name = reminder.get("medicine_name", "your medicine")
                    template = TEMPLATES.get("medicine_refill_reminder") or TEMPLATES.get("orange_pharmacy_confirm")
                    if template:
                        await send_msg91_whatsapp(
                            recipient_phone=user_phone,
                            template_name=template,
                            variables=[
                                user.get("name", "Patient"),
                                medicine_name,
                                str(new_qty),
                                "nevikacura.com/pharmacy",
                            ],
                            db=db,
                            reference_id=reminder.get("id", ""),
                            message_type="refill_reminder",
                        )
                        logger.info(f"Refill WhatsApp sent for {medicine_name} to {user_phone}")
                        
                        # Log the refill reminder
                        await db.refill_reminders.insert_one({
                            "user_id": user.get("sub") or user.get("user_id"),
                            "phone": user_phone[-10:],
                            "medicine_name": medicine_name,
                            "remaining_qty": new_qty,
                            "reminder_id": reminder.get("id"),
                            "sent_via": "whatsapp",
                            "created_at": datetime.now(timezone.utc).isoformat(),
                        })
            except Exception as wa_err:
                logger.error(f"Failed to send refill WhatsApp: {wa_err}")
    
    return {
        "success": True,
        "message": "Logged successfully",
        "remaining_quantity": reminder.get("remaining_quantity", 0) - (0 if log.skipped else 1)
    }


@router.get("/today")
async def get_today_schedule(user = Depends(verify_user)):
    """Get today's medicine schedule with status"""
    user_id = user.get("sub") or user.get("user_id")
    today = get_ist_today()
    current_time = get_ist_now().strftime("%H:%M")
    
    # Get active reminders
    reminders = await db.medicine_reminders.find({
        "user_id": user_id,
        "is_active": True,
        "start_date": {"$lte": today},
        "$or": [
            {"end_date": None},
            {"end_date": {"$gte": today}}
        ]
    }, {"_id": 0}).to_list(50)
    
    # Get today's logs
    logs = await db.medicine_logs.find({
        "user_id": user_id,
        "date": today
    }, {"_id": 0}).to_list(200)
    
    logged_map = {}
    for log in logs:
        key = f"{log['reminder_id']}_{log.get('time', '')[:2]}"
        logged_map[key] = log
    
    # Build schedule
    schedule = []
    for reminder in reminders:
        for time_slot in reminder.get("time_slots", []):
            key = f"{reminder['id']}_{time_slot[:2]}"
            log_entry = logged_map.get(key)
            
            status = "pending"
            if log_entry:
                status = "skipped" if log_entry.get("skipped") else "taken"
            elif time_slot < current_time:
                status = "missed"
            
            schedule.append({
                "reminder_id": reminder["id"],
                "medicine_name": reminder.get("medicine_name"),
                "dosage": reminder.get("dosage"),
                "time_slot": time_slot,
                "status": status,
                "notes": reminder.get("notes"),
                "remaining_quantity": reminder.get("remaining_quantity")
            })
    
    # Sort by time
    schedule.sort(key=lambda x: x["time_slot"])
    
    # Stats
    total = len(schedule)
    taken = len([s for s in schedule if s["status"] == "taken"])
    missed = len([s for s in schedule if s["status"] == "missed"])
    pending = len([s for s in schedule if s["status"] == "pending"])
    
    return {
        "success": True,
        "date": today,
        "current_time": current_time,
        "schedule": schedule,
        "stats": {
            "total": total,
            "taken": taken,
            "missed": missed,
            "pending": pending,
            "completion_rate": round((taken / total) * 100) if total > 0 else 0
        }
    }


@router.get("/adherence-history")
async def get_adherence_history(days: int = 30, user = Depends(verify_user)):
    """Get medication adherence history"""
    user_id = user.get("sub") or user.get("user_id")
    
    start_date = (get_ist_now() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    logs = await db.medicine_logs.find({
        "user_id": user_id,
        "date": {"$gte": start_date}
    }, {"_id": 0}).sort("date", -1).to_list(1000)
    
    # Group by date
    daily_stats = {}
    for log in logs:
        date = log.get("date")
        if date not in daily_stats:
            daily_stats[date] = {"taken": 0, "skipped": 0, "total": 0}
        
        daily_stats[date]["total"] += 1
        if log.get("skipped"):
            daily_stats[date]["skipped"] += 1
        else:
            daily_stats[date]["taken"] += 1
    
    # Convert to list
    history = []
    for date, stats in sorted(daily_stats.items(), reverse=True):
        history.append({
            "date": date,
            "taken": stats["taken"],
            "skipped": stats["skipped"],
            "total": stats["total"],
            "adherence_rate": round((stats["taken"] / stats["total"]) * 100) if stats["total"] > 0 else 0
        })
    
    # Overall stats
    total_taken = sum(d["taken"] for d in history)
    total_all = sum(d["total"] for d in history)
    
    return {
        "success": True,
        "period_days": days,
        "history": history,
        "overall_stats": {
            "total_doses": total_all,
            "doses_taken": total_taken,
            "doses_missed": total_all - total_taken,
            "adherence_rate": round((total_taken / total_all) * 100) if total_all > 0 else 0
        }
    }


# ============ Cron Endpoint for Sending Reminders ============

@router.post("/cron/send-reminders")
async def cron_send_medicine_reminders(secret: str = ""):
    """
    Cron job to send medicine reminder notifications
    Run every 15 minutes
    """
    cron_secret = "nevika_cron_2026"
    if secret != cron_secret:
        raise HTTPException(status_code=403, detail="Invalid secret")
    
    now = get_ist_now()
    current_hour = now.hour
    current_minute = now.minute
    today = get_ist_today()
    
    # Find time slots within 15-minute window
    time_window_start = f"{current_hour:02d}:{(current_minute // 15) * 15:02d}"
    time_window_end = f"{current_hour:02d}:{((current_minute // 15) + 1) * 15:02d}"
    
    # Get all active reminders with matching time slots
    reminders = await db.medicine_reminders.find({
        "is_active": True,
        "start_date": {"$lte": today},
        "$or": [
            {"end_date": None},
            {"end_date": {"$gte": today}}
        ]
    }, {"_id": 0}).to_list(1000)
    
    notifications_sent = 0
    
    for reminder in reminders:
        for time_slot in reminder.get("time_slots", []):
            slot_hour, slot_minute = map(int, time_slot.split(":"))
            
            # Check if within 15-minute window
            if slot_hour == current_hour and abs(slot_minute - current_minute) <= 7:
                # Check if already logged today
                existing_log = await db.medicine_logs.find_one({
                    "reminder_id": reminder["id"],
                    "date": today,
                    "time": {"$regex": f"^{slot_hour:02d}"}
                })
                
                if not existing_log and send_push_notification:
                    try:
                        await send_push_notification(
                            user_id=reminder["user_id"],
                            title="💊 Medicine Reminder",
                            body=f"Time to take {reminder.get('medicine_name')} - {reminder.get('dosage')}",
                            url="/smart-reminders",
                            tag=f"med-{reminder['id']}-{time_slot}"
                        )
                        notifications_sent += 1
                        logger.info(f"Sent reminder for {reminder.get('medicine_name')} to {reminder['user_id']}")
                    except Exception as e:
                        logger.error(f"Failed to send reminder: {e}")
    
    return {
        "success": True,
        "timestamp": now.isoformat(),
        "notifications_sent": notifications_sent
    }



@router.get("/refill-check")
async def check_refill_alerts():
    """Check all active reminders for low stock and send WhatsApp refill alerts."""
    if db is None:
        return {"success": False, "error": "Database not available"}

    low_stock = await db.medicine_reminders.find({
        "is_active": True,
        "remaining_quantity": {"$lte": 5, "$gt": 0},
    }, {"_id": 0}).to_list(100)

    alerts_sent = 0
    for reminder in low_stock:
        user_phone = reminder.get("user_phone", "")
        if not user_phone or len(user_phone) < 10:
            continue

        # Check if we already sent a refill reminder in the last 24 hours
        from datetime import timedelta
        day_ago = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        existing = await db.refill_reminders.find_one({
            "reminder_id": reminder.get("id"),
            "created_at": {"$gte": day_ago},
        })
        if existing:
            continue

        try:
            from services.msg91_whatsapp import send_msg91_whatsapp, TEMPLATES
            template = TEMPLATES.get("medicine_refill_reminder") or TEMPLATES.get("orange_pharmacy_confirm")
            if template:
                await send_msg91_whatsapp(
                    recipient_phone=user_phone,
                    template_name=template,
                    variables=[
                        "Patient",
                        reminder.get("medicine_name", "Medicine"),
                        str(reminder.get("remaining_quantity", 0)),
                        "nevikacura.com/pharmacy",
                    ],
                    db=db,
                    reference_id=reminder.get("id", ""),
                    message_type="refill_reminder",
                )
                await db.refill_reminders.insert_one({
                    "user_id": reminder.get("user_id"),
                    "phone": user_phone[-10:],
                    "medicine_name": reminder.get("medicine_name"),
                    "remaining_qty": reminder.get("remaining_quantity"),
                    "reminder_id": reminder.get("id"),
                    "sent_via": "whatsapp",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                })
                alerts_sent += 1
        except Exception as e:
            logger.error(f"Refill alert failed for {reminder.get('medicine_name')}: {e}")

    return {"success": True, "low_stock_count": len(low_stock), "alerts_sent": alerts_sent}
