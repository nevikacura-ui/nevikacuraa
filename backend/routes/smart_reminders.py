"""
Smart Reminders System
- Appointment reminders
- Medication reminders
- Health check-up reminders
- Custom reminders
- Recurring support (daily, weekly, monthly)
"""

import uuid
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/smart-reminders", tags=["Smart Reminders"])

db = None


def set_db(database):
    global db
    db = database


REMINDER_TYPES = ["medication", "appointment", "checkup", "hydration", "exercise", "custom"]
RECURRENCE_OPTIONS = ["once", "daily", "weekly", "monthly"]
PRIORITY_LEVELS = ["low", "medium", "high", "critical"]

TYPE_LABELS = {
    "medication": "Medication",
    "appointment": "Appointment",
    "checkup": "Health Check-up",
    "hydration": "Hydration",
    "exercise": "Exercise",
    "custom": "Custom",
}


class CreateReminder(BaseModel):
    phone: str
    title: str
    reminder_type: str = "custom"
    description: Optional[str] = None
    reminder_time: str  # HH:MM format
    reminder_date: Optional[str] = None  # YYYY-MM-DD, null for recurring
    recurrence: str = "once"  # once, daily, weekly, monthly
    priority: str = "medium"
    family_member: str = "self"
    linked_appointment_id: Optional[str] = None
    linked_medicine: Optional[str] = None
    end_date: Optional[str] = None  # for recurring reminders
    notes: Optional[str] = None


class UpdateReminder(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    reminder_time: Optional[str] = None
    reminder_date: Optional[str] = None
    recurrence: Optional[str] = None
    priority: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class SnoozeRequest(BaseModel):
    snooze_minutes: int = 15


@router.post("/create")
async def create_reminder(req: CreateReminder):
    """Create a new smart reminder."""
    if req.reminder_type not in REMINDER_TYPES:
        req.reminder_type = "custom"
    if req.recurrence not in RECURRENCE_OPTIONS:
        req.recurrence = "once"
    if req.priority not in PRIORITY_LEVELS:
        req.priority = "medium"

    reminder = {
        "id": str(uuid.uuid4()),
        "phone": req.phone,
        "title": req.title,
        "reminder_type": req.reminder_type,
        "description": req.description or "",
        "reminder_time": req.reminder_time,
        "reminder_date": req.reminder_date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "recurrence": req.recurrence,
        "priority": req.priority,
        "family_member": req.family_member,
        "linked_appointment_id": req.linked_appointment_id,
        "linked_medicine": req.linked_medicine,
        "end_date": req.end_date,
        "notes": req.notes or "",
        "is_active": True,
        "is_completed": False,
        "snoozed_until": None,
        "completion_log": [],
        "streak_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.smart_reminders.insert_one(reminder)
    reminder.pop("_id", None)
    return {"success": True, "reminder": reminder, "message": "Reminder created"}


@router.get("/list/{phone}")
async def list_reminders(
    phone: str,
    reminder_type: Optional[str] = Query(None),
    active_only: bool = Query(True),
    family_member: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """List reminders for a user."""
    query = {"phone": phone}
    if reminder_type and reminder_type != "all":
        query["reminder_type"] = reminder_type
    if active_only:
        query["is_active"] = True
    if family_member and family_member != "all":
        query["family_member"] = family_member

    total = await db.smart_reminders.count_documents(query)
    reminders = await db.smart_reminders.find(
        query, {"_id": 0}
    ).sort([("priority_sort", -1), ("reminder_time", 1)]).skip(skip).limit(limit).to_list(length=limit)

    # Sort by priority manually (critical > high > medium > low)
    priority_order = {"critical": 4, "high": 3, "medium": 2, "low": 1}
    reminders.sort(key=lambda r: (
        -priority_order.get(r.get("priority", "medium"), 2),
        r.get("reminder_time", "00:00"),
    ))

    type_counts = {}
    for rtype in REMINDER_TYPES:
        q = {"phone": phone, "reminder_type": rtype}
        if active_only:
            q["is_active"] = True
        count = await db.smart_reminders.count_documents(q)
        if count > 0:
            type_counts[rtype] = count

    return {
        "success": True,
        "reminders": reminders,
        "total": total,
        "type_counts": type_counts,
        "types": TYPE_LABELS,
    }


@router.get("/today/{phone}")
async def get_today_reminders(phone: str):
    """Get today's reminders sorted by time."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    query = {
        "phone": phone,
        "is_active": True,
        "$or": [
            {"reminder_date": today},
            {"recurrence": {"$ne": "once"}},
        ],
    }

    reminders = await db.smart_reminders.find(
        query, {"_id": 0}
    ).sort("reminder_time", 1).to_list(length=100)

    now_time = datetime.now(timezone.utc).strftime("%H:%M")
    upcoming = [r for r in reminders if r.get("reminder_time", "00:00") >= now_time]
    past = [r for r in reminders if r.get("reminder_time", "00:00") < now_time]

    return {
        "success": True,
        "date": today,
        "upcoming": upcoming,
        "past": past,
        "total_today": len(reminders),
    }


@router.put("/complete/{reminder_id}")
async def complete_reminder(reminder_id: str):
    """Mark a reminder as completed for today."""
    reminder = await db.smart_reminders.find_one({"id": reminder_id})
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    now = datetime.now(timezone.utc)
    log_entry = {"completed_at": now.isoformat(), "date": now.strftime("%Y-%m-%d")}

    update = {
        "$push": {"completion_log": log_entry},
        "$inc": {"streak_count": 1},
        "$set": {"updated_at": now.isoformat()},
    }

    # For one-time reminders, mark as completed
    if reminder.get("recurrence") == "once":
        update["$set"]["is_completed"] = True
        update["$set"]["is_active"] = False

    await db.smart_reminders.update_one({"id": reminder_id}, update)
    return {"success": True, "message": "Reminder completed"}


@router.put("/snooze/{reminder_id}")
async def snooze_reminder(reminder_id: str, req: SnoozeRequest):
    """Snooze a reminder."""
    reminder = await db.smart_reminders.find_one({"id": reminder_id})
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    snooze_until = (datetime.now(timezone.utc) + timedelta(minutes=req.snooze_minutes)).isoformat()
    await db.smart_reminders.update_one(
        {"id": reminder_id},
        {"$set": {"snoozed_until": snooze_until, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"success": True, "snoozed_until": snooze_until, "message": f"Snoozed for {req.snooze_minutes} minutes"}


@router.put("/update/{reminder_id}")
async def update_reminder(reminder_id: str, req: UpdateReminder):
    """Update a reminder."""
    reminder = await db.smart_reminders.find_one({"id": reminder_id})
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    for field, value in req.dict(exclude_unset=True).items():
        if value is not None:
            updates[field] = value

    await db.smart_reminders.update_one({"id": reminder_id}, {"$set": updates})
    return {"success": True, "message": "Reminder updated"}


@router.delete("/delete/{reminder_id}")
async def delete_reminder(reminder_id: str):
    """Delete a reminder."""
    result = await db.smart_reminders.delete_one({"id": reminder_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"success": True, "message": "Reminder deleted"}


@router.put("/toggle/{reminder_id}")
async def toggle_reminder(reminder_id: str):
    """Toggle a reminder active/inactive."""
    reminder = await db.smart_reminders.find_one({"id": reminder_id})
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    new_active = not reminder.get("is_active", True)
    await db.smart_reminders.update_one(
        {"id": reminder_id},
        {"$set": {"is_active": new_active, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"success": True, "is_active": new_active}


@router.get("/stats/{phone}")
async def get_reminder_stats(phone: str):
    """Get reminder stats for a user."""
    total = await db.smart_reminders.count_documents({"phone": phone})
    active = await db.smart_reminders.count_documents({"phone": phone, "is_active": True})
    completed_today = 0

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    async for rem in db.smart_reminders.find({"phone": phone}, {"completion_log": 1, "_id": 0}):
        for log in rem.get("completion_log", []):
            if log.get("date") == today:
                completed_today += 1
                break

    type_counts = {}
    for rtype in REMINDER_TYPES:
        count = await db.smart_reminders.count_documents({"phone": phone, "is_active": True, "reminder_type": rtype})
        if count > 0:
            type_counts[rtype] = count

    return {
        "success": True,
        "total_reminders": total,
        "active_reminders": active,
        "completed_today": completed_today,
        "type_counts": type_counts,
    }


@router.get("/suggestions/{phone}")
async def get_smart_suggestions(phone: str):
    """Get smart reminder suggestions based on user data."""
    suggestions = []

    # Check for upcoming appointments
    upcoming_appointments = await db.appointments.find(
        {"phone": phone, "status": {"$in": ["confirmed", "scheduled"]}},
        {"_id": 0, "id": 1, "doctor_name": 1, "date": 1, "time": 1}
    ).sort("date", 1).limit(5).to_list(length=5)

    for apt in upcoming_appointments:
        existing = await db.smart_reminders.find_one({
            "phone": phone, "linked_appointment_id": apt.get("id")
        })
        if not existing:
            suggestions.append({
                "type": "appointment",
                "title": f"Appointment with {apt.get('doctor_name', 'Doctor')}",
                "description": f"On {apt.get('date', '')} at {apt.get('time', '')}",
                "linked_id": apt.get("id"),
                "priority": "high",
            })

    # Suggest common health reminders if user has few
    active_count = await db.smart_reminders.count_documents({"phone": phone, "is_active": True})
    if active_count < 3:
        has_hydration = await db.smart_reminders.find_one({"phone": phone, "reminder_type": "hydration", "is_active": True})
        if not has_hydration:
            suggestions.append({
                "type": "hydration",
                "title": "Stay Hydrated",
                "description": "Drink 8 glasses of water daily",
                "priority": "low",
            })

        has_exercise = await db.smart_reminders.find_one({"phone": phone, "reminder_type": "exercise", "is_active": True})
        if not has_exercise:
            suggestions.append({
                "type": "exercise",
                "title": "Daily Exercise",
                "description": "30 minutes of physical activity",
                "priority": "medium",
            })

    return {"success": True, "suggestions": suggestions[:5]}
