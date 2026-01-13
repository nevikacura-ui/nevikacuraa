"""
Medication Tracker / Pill Tracker Module
- Add/manage medications
- Set reminders for each medication
- Track daily adherence
- View history and statistics
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid

router = APIRouter(prefix="/medication-tracker", tags=["Medication Tracker"])

db = None

def get_db():
    global db
    return db

def set_db(database):
    global db
    db = database

# Models
class Medication(BaseModel):
    name: str
    dosage: str  # e.g., "500mg", "10ml"
    frequency: str  # once_daily, twice_daily, thrice_daily, as_needed, custom
    times: List[str] = []  # ["08:00", "20:00"]
    instructions: Optional[str] = None  # before_meal, after_meal, with_meal, empty_stomach
    start_date: str  # YYYY-MM-DD
    end_date: Optional[str] = None  # YYYY-MM-DD, None for ongoing
    quantity: Optional[int] = None  # Number of pills/units
    refill_reminder_days: int = 3  # Remind N days before running out
    notes: Optional[str] = None
    color: Optional[str] = "#14b8a6"  # For UI display

class MedicationLog(BaseModel):
    medication_id: str
    scheduled_time: str  # HH:MM
    action: str  # taken, skipped, snoozed

class UpdateMedication(BaseModel):
    name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    times: Optional[List[str]] = None
    instructions: Optional[str] = None
    end_date: Optional[str] = None
    quantity: Optional[int] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

# Frequency mapping to daily doses
FREQUENCY_DOSES = {
    "once_daily": 1,
    "twice_daily": 2,
    "thrice_daily": 3,
    "four_times": 4,
    "as_needed": 0,
    "custom": 0
}

# ==================== MEDICATION MANAGEMENT ====================

@router.post("/medications/{user_id}")
async def add_medication(user_id: str, med: Medication):
    """Add a new medication to track"""
    db = get_db()
    
    # Default times based on frequency
    times = med.times
    if not times:
        if med.frequency == "once_daily":
            times = ["09:00"]
        elif med.frequency == "twice_daily":
            times = ["09:00", "21:00"]
        elif med.frequency == "thrice_daily":
            times = ["08:00", "14:00", "20:00"]
        elif med.frequency == "four_times":
            times = ["06:00", "12:00", "18:00", "22:00"]
    
    medication_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": med.name,
        "dosage": med.dosage,
        "frequency": med.frequency,
        "times": times,
        "instructions": med.instructions,
        "start_date": med.start_date,
        "end_date": med.end_date,
        "quantity": med.quantity,
        "remaining_quantity": med.quantity,
        "refill_reminder_days": med.refill_reminder_days,
        "notes": med.notes,
        "color": med.color or "#14b8a6",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.user_medications.insert_one(medication_doc)
    
    # Return without _id
    if "_id" in medication_doc:
        del medication_doc["_id"]
    
    return {"success": True, "medication": medication_doc}

@router.get("/medications/{user_id}")
async def get_medications(user_id: str, active_only: bool = True):
    """Get all medications for a user"""
    db = get_db()
    
    query = {"user_id": user_id}
    if active_only:
        query["is_active"] = True
    
    medications = await db.user_medications.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"medications": medications}

@router.put("/medications/{user_id}/{medication_id}")
async def update_medication(user_id: str, medication_id: str, update: UpdateMedication):
    """Update medication details"""
    db = get_db()
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.user_medications.update_one(
        {"id": medication_id, "user_id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    return {"success": True, "message": "Medication updated"}

@router.delete("/medications/{user_id}/{medication_id}")
async def delete_medication(user_id: str, medication_id: str):
    """Delete (deactivate) a medication"""
    db = get_db()
    
    result = await db.user_medications.update_one(
        {"id": medication_id, "user_id": user_id},
        {"$set": {"is_active": False, "deactivated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    return {"success": True, "message": "Medication removed"}

# ==================== DAILY TRACKING ====================

@router.get("/today/{user_id}")
async def get_today_schedule(user_id: str):
    """Get today's medication schedule with status"""
    db = get_db()
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    current_time = datetime.now(timezone.utc).strftime("%H:%M")
    
    # Get active medications
    medications = await db.user_medications.find(
        {
            "user_id": user_id,
            "is_active": True,
            "start_date": {"$lte": today},
            "$or": [
                {"end_date": None},
                {"end_date": {"$gte": today}}
            ]
        },
        {"_id": 0}
    ).to_list(100)
    
    # Get today's logs
    logs = await db.medication_logs.find(
        {"user_id": user_id, "date": today},
        {"_id": 0}
    ).to_list(500)
    
    # Build schedule
    schedule = []
    for med in medications:
        for scheduled_time in med.get("times", []):
            # Find if log exists for this dose
            log = next(
                (l for l in logs if l["medication_id"] == med["id"] and l["scheduled_time"] == scheduled_time),
                None
            )
            
            status = "pending"
            if log:
                status = log["action"]  # taken, skipped, snoozed
            elif scheduled_time < current_time:
                status = "overdue"
            
            schedule.append({
                "medication_id": med["id"],
                "medication_name": med["name"],
                "dosage": med["dosage"],
                "scheduled_time": scheduled_time,
                "instructions": med["instructions"],
                "color": med.get("color", "#14b8a6"),
                "status": status,
                "log_id": log["id"] if log else None
            })
    
    # Sort by time
    schedule.sort(key=lambda x: x["scheduled_time"])
    
    # Calculate adherence
    total_doses = len([s for s in schedule if s["scheduled_time"] <= current_time])
    taken_doses = len([s for s in schedule if s["status"] == "taken"])
    adherence_rate = round((taken_doses / total_doses * 100) if total_doses > 0 else 100, 1)
    
    return {
        "date": today,
        "schedule": schedule,
        "summary": {
            "total_doses": len(schedule),
            "taken": taken_doses,
            "pending": len([s for s in schedule if s["status"] == "pending"]),
            "overdue": len([s for s in schedule if s["status"] == "overdue"]),
            "skipped": len([s for s in schedule if s["status"] == "skipped"]),
            "adherence_rate": adherence_rate
        }
    }

@router.post("/log/{user_id}")
async def log_medication(user_id: str, log: MedicationLog):
    """Log medication action (taken, skipped, snoozed)"""
    db = get_db()
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    now = datetime.now(timezone.utc).isoformat()
    
    # Check if medication exists
    medication = await db.user_medications.find_one(
        {"id": log.medication_id, "user_id": user_id},
        {"_id": 0}
    )
    
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    # Check if log already exists
    existing = await db.medication_logs.find_one({
        "user_id": user_id,
        "medication_id": log.medication_id,
        "date": today,
        "scheduled_time": log.scheduled_time
    })
    
    if existing:
        # Update existing log
        await db.medication_logs.update_one(
            {"id": existing["id"]},
            {"$set": {"action": log.action, "logged_at": now}}
        )
        return {"success": True, "message": "Log updated", "log_id": existing["id"]}
    
    # Create new log
    log_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "medication_id": log.medication_id,
        "medication_name": medication["name"],
        "dosage": medication["dosage"],
        "scheduled_time": log.scheduled_time,
        "action": log.action,
        "date": today,
        "logged_at": now
    }
    
    await db.medication_logs.insert_one(log_doc)
    
    # Update remaining quantity if taken
    if log.action == "taken" and medication.get("remaining_quantity"):
        await db.user_medications.update_one(
            {"id": log.medication_id},
            {"$inc": {"remaining_quantity": -1}}
        )
    
    return {"success": True, "message": "Medication logged", "log_id": log_doc["id"]}

# ==================== HISTORY & STATISTICS ====================

@router.get("/history/{user_id}")
async def get_medication_history(user_id: str, days: int = 7, medication_id: Optional[str] = None):
    """Get medication history for past N days"""
    db = get_db()
    
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    
    query = {
        "user_id": user_id,
        "date": {"$gte": start_date.strftime("%Y-%m-%d")}
    }
    
    if medication_id:
        query["medication_id"] = medication_id
    
    logs = await db.medication_logs.find(
        query,
        {"_id": 0}
    ).sort("date", -1).to_list(1000)
    
    # Group by date
    history = {}
    for log in logs:
        date = log["date"]
        if date not in history:
            history[date] = {"taken": 0, "skipped": 0, "total": 0}
        history[date]["total"] += 1
        if log["action"] == "taken":
            history[date]["taken"] += 1
        elif log["action"] == "skipped":
            history[date]["skipped"] += 1
    
    # Calculate weekly adherence
    total_taken = sum(h["taken"] for h in history.values())
    total_doses = sum(h["total"] for h in history.values())
    overall_adherence = round((total_taken / total_doses * 100) if total_doses > 0 else 0, 1)
    
    return {
        "period_days": days,
        "history": history,
        "logs": logs,
        "statistics": {
            "total_doses_scheduled": total_doses,
            "doses_taken": total_taken,
            "doses_skipped": sum(h["skipped"] for h in history.values()),
            "adherence_rate": overall_adherence
        }
    }

@router.get("/statistics/{user_id}")
async def get_adherence_statistics(user_id: str):
    """Get overall adherence statistics"""
    db = get_db()
    
    # Last 30 days
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=30)
    
    logs = await db.medication_logs.find(
        {
            "user_id": user_id,
            "date": {"$gte": start_date.strftime("%Y-%m-%d")}
        },
        {"_id": 0}
    ).to_list(1000)
    
    # Calculate statistics
    total = len(logs)
    taken = len([l for l in logs if l["action"] == "taken"])
    skipped = len([l for l in logs if l["action"] == "skipped"])
    
    # Get medication count
    active_meds = await db.user_medications.count_documents({
        "user_id": user_id,
        "is_active": True
    })
    
    # Streak calculation
    streak = 0
    check_date = end_date.strftime("%Y-%m-%d")
    for _ in range(30):
        day_logs = [l for l in logs if l["date"] == check_date]
        if day_logs and all(l["action"] == "taken" for l in day_logs):
            streak += 1
            check_date = (datetime.strptime(check_date, "%Y-%m-%d") - timedelta(days=1)).strftime("%Y-%m-%d")
        else:
            break
    
    return {
        "period_days": 30,
        "active_medications": active_meds,
        "total_doses": total,
        "doses_taken": taken,
        "doses_skipped": skipped,
        "adherence_rate": round((taken / total * 100) if total > 0 else 100, 1),
        "current_streak": streak,
        "best_adherence_day": max(
            [(d, len([l for l in logs if l["date"] == d and l["action"] == "taken"]))
             for d in set(l["date"] for l in logs)],
            key=lambda x: x[1],
            default=(None, 0)
        )[0]
    }

# ==================== REFILL REMINDERS ====================

@router.get("/refill-alerts/{user_id}")
async def get_refill_alerts(user_id: str):
    """Get medications that need refill soon"""
    db = get_db()
    
    medications = await db.user_medications.find(
        {
            "user_id": user_id,
            "is_active": True,
            "quantity": {"$ne": None}
        },
        {"_id": 0}
    ).to_list(100)
    
    alerts = []
    for med in medications:
        remaining = med.get("remaining_quantity", 0)
        daily_doses = FREQUENCY_DOSES.get(med.get("frequency", ""), 1)
        if daily_doses == 0:
            daily_doses = len(med.get("times", [1]))
        
        days_left = remaining // daily_doses if daily_doses > 0 else 0
        
        if days_left <= med.get("refill_reminder_days", 3):
            alerts.append({
                "medication_id": med["id"],
                "medication_name": med["name"],
                "remaining_quantity": remaining,
                "days_left": days_left,
                "urgency": "high" if days_left <= 1 else "medium" if days_left <= 3 else "low"
            })
    
    # Sort by urgency
    alerts.sort(key=lambda x: x["days_left"])
    
    return {"alerts": alerts}

# ==================== QUICK ACTIONS ====================

@router.post("/quick-log/{user_id}/{medication_id}")
async def quick_log_taken(user_id: str, medication_id: str):
    """Quick log - mark all today's doses as taken"""
    db = get_db()
    
    medication = await db.user_medications.find_one(
        {"id": medication_id, "user_id": user_id},
        {"_id": 0}
    )
    
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    now = datetime.now(timezone.utc).isoformat()
    current_time = datetime.now(timezone.utc).strftime("%H:%M")
    
    logged_count = 0
    for scheduled_time in medication.get("times", []):
        if scheduled_time <= current_time:
            # Check if already logged
            existing = await db.medication_logs.find_one({
                "user_id": user_id,
                "medication_id": medication_id,
                "date": today,
                "scheduled_time": scheduled_time
            })
            
            if not existing:
                log_doc = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "medication_id": medication_id,
                    "medication_name": medication["name"],
                    "dosage": medication["dosage"],
                    "scheduled_time": scheduled_time,
                    "action": "taken",
                    "date": today,
                    "logged_at": now
                }
                await db.medication_logs.insert_one(log_doc)
                logged_count += 1
    
    return {"success": True, "doses_logged": logged_count}
