"""
Patient Flow & Queue Management System
- Queue management for appointments
- Real-time patient flow tracking
- Wait time estimation
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid

router = APIRouter(prefix="/patient-flow", tags=["Patient Flow"])

db = None

def get_db():
    global db
    return db

def set_db(database):
    global db
    db = database

# Models
class QueueEntry(BaseModel):
    patient_name: str
    patient_phone: str
    service_type: str  # consultation, diagnostic, pharmacy
    doctor: Optional[str] = None
    clinic: str = "pushpa"
    priority: str = "normal"  # normal, urgent, emergency
    notes: Optional[str] = None
    appointment_id: Optional[str] = None

class UpdateQueueStatus(BaseModel):
    status: str  # waiting, in_consultation, completed, cancelled, no_show

# ==================== QUEUE MANAGEMENT ====================

@router.post("/queue/add")
async def add_to_queue(entry: QueueEntry):
    """Add patient to queue"""
    db = get_db()
    
    # Get current queue count for token number
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    queue_count = await db.patient_queue.count_documents({
        "date": today,
        "clinic": entry.clinic
    })
    
    # Priority ordering
    priority_order = {"emergency": 0, "urgent": 1, "normal": 2}
    
    queue_doc = {
        "id": str(uuid.uuid4()),
        "token_number": queue_count + 1,
        "patient_name": entry.patient_name,
        "patient_phone": entry.patient_phone,
        "service_type": entry.service_type,
        "doctor": entry.doctor,
        "clinic": entry.clinic,
        "priority": entry.priority,
        "priority_order": priority_order.get(entry.priority, 2),
        "notes": entry.notes,
        "appointment_id": entry.appointment_id,
        "status": "waiting",
        "date": today,
        "check_in_time": datetime.now(timezone.utc).isoformat(),
        "called_time": None,
        "completed_time": None,
        "wait_time_minutes": None
    }
    
    await db.patient_queue.insert_one(queue_doc)
    
    # Get estimated wait time
    waiting_ahead = await db.patient_queue.count_documents({
        "date": today,
        "clinic": entry.clinic,
        "status": "waiting",
        "priority_order": {"$lte": priority_order.get(entry.priority, 2)},
        "check_in_time": {"$lt": queue_doc["check_in_time"]}
    })
    
    estimated_wait = waiting_ahead * 10  # 10 minutes per patient average
    
    return {
        "success": True,
        "queue_entry": {
            "id": queue_doc["id"],
            "token_number": queue_doc["token_number"],
            "estimated_wait_minutes": estimated_wait
        }
    }

@router.get("/queue/{clinic}")
async def get_queue(clinic: str, date: Optional[str] = None):
    """Get current queue for a clinic"""
    db = get_db()
    
    query_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    queue = await db.patient_queue.find(
        {"clinic": clinic, "date": query_date},
        {"_id": 0}
    ).sort([("priority_order", 1), ("check_in_time", 1)]).to_list(200)
    
    # Separate by status
    waiting = [q for q in queue if q["status"] == "waiting"]
    in_consultation = [q for q in queue if q["status"] == "in_consultation"]
    completed = [q for q in queue if q["status"] == "completed"]
    
    return {
        "date": query_date,
        "clinic": clinic,
        "waiting": waiting,
        "in_consultation": in_consultation,
        "completed": completed,
        "stats": {
            "total_patients": len(queue),
            "waiting_count": len(waiting),
            "in_consultation_count": len(in_consultation),
            "completed_count": len(completed),
            "avg_wait_time": sum(q.get("wait_time_minutes", 0) for q in completed) / len(completed) if completed else 0
        }
    }

@router.put("/queue/{entry_id}/status")
async def update_queue_status(entry_id: str, update: UpdateQueueStatus):
    """Update queue entry status"""
    db = get_db()
    
    entry = await db.patient_queue.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Queue entry not found")
    
    update_data = {"status": update.status}
    
    if update.status == "in_consultation":
        called_time = datetime.now(timezone.utc)
        check_in_time = datetime.fromisoformat(entry["check_in_time"].replace("Z", "+00:00"))
        wait_time = (called_time - check_in_time).total_seconds() / 60
        update_data["called_time"] = called_time.isoformat()
        update_data["wait_time_minutes"] = round(wait_time)
    
    elif update.status == "completed":
        update_data["completed_time"] = datetime.now(timezone.utc).isoformat()
    
    await db.patient_queue.update_one(
        {"id": entry_id},
        {"$set": update_data}
    )
    
    return {"success": True, "status": update.status}

@router.post("/queue/{entry_id}/call-next")
async def call_next_patient(entry_id: str):
    """Call the next patient in queue"""
    db = get_db()
    
    # Mark current as in consultation
    await db.patient_queue.update_one(
        {"id": entry_id},
        {"$set": {
            "status": "in_consultation",
            "called_time": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    entry = await db.patient_queue.find_one({"id": entry_id}, {"_id": 0})
    
    return {
        "success": True,
        "called_patient": {
            "token_number": entry.get("token_number"),
            "patient_name": entry.get("patient_name"),
            "service_type": entry.get("service_type")
        }
    }

@router.get("/queue/{clinic}/display")
async def get_queue_display(clinic: str):
    """Get queue display data for TV/monitor"""
    db = get_db()
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Currently being served
    in_consultation = await db.patient_queue.find(
        {"clinic": clinic, "date": today, "status": "in_consultation"},
        {"_id": 0, "token_number": 1, "patient_name": 1, "doctor": 1}
    ).to_list(10)
    
    # Next in line
    waiting = await db.patient_queue.find(
        {"clinic": clinic, "date": today, "status": "waiting"},
        {"_id": 0, "token_number": 1, "patient_name": 1}
    ).sort([("priority_order", 1), ("check_in_time", 1)]).limit(5).to_list(5)
    
    return {
        "clinic": clinic,
        "now_serving": in_consultation,
        "next_in_line": waiting,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }

# ==================== PATIENT LOOKUP ====================

@router.get("/patient/lookup")
async def lookup_patient(phone: str):
    """Lookup patient by phone number for quick access"""
    db = get_db()
    
    # Find user
    user = await db.users.find_one({"phone": phone}, {"_id": 0})
    
    # Find recent appointments
    appointments = await db.appointments.find(
        {"patient_phone": phone},
        {"_id": 0}
    ).sort("date", -1).limit(5).to_list(5)
    
    # Find loyalty info
    loyalty_transactions = await db.loyalty_transactions.find(
        {"$or": [
            {"patient_phone": phone},
            {"user_id": user.get("id") if user else None}
        ]},
        {"_id": 0}
    ).to_list(100)
    
    total_points = sum(t.get("points_earned", 0) for t in loyalty_transactions)
    
    # Find due payments
    dues = await db.due_payments.find(
        {"patient_phone": phone, "status": {"$ne": "paid"}},
        {"_id": 0}
    ).to_list(20)
    
    total_due = sum(d.get("amount_due", 0) for d in dues)
    
    return {
        "patient": {
            "name": user.get("name") if user else appointments[0].get("patient_name") if appointments else None,
            "phone": phone,
            "email": user.get("email") if user else None,
            "is_registered": bool(user)
        },
        "loyalty": {
            "total_points": total_points,
            "tier": "gold" if total_points >= 500 else "silver" if total_points >= 200 else "bronze"
        },
        "recent_appointments": appointments,
        "pending_dues": {
            "count": len(dues),
            "total_amount": total_due
        }
    }
