"""
Doctor Handoff Notes
Structured shift handoff notes for doctors to pass critical information between shifts.
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import jwt
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/handoff-notes", tags=["Doctor Handoff Notes"])

db = None
JWT_SECRET = None
JWT_ALGORITHM = "HS256"

def set_db(database):
    global db
    db = database

def set_jwt_config(secret, algorithm="HS256"):
    global JWT_SECRET, JWT_ALGORITHM
    JWT_SECRET = secret
    JWT_ALGORITHM = algorithm


def get_ist_now():
    ist = timezone(timedelta(hours=5, minutes=30))
    return datetime.now(ist)


async def get_current_doctor(authorization: str = Header(None)):
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


# ============ Models ============

class CriticalPatient(BaseModel):
    name: str
    phone: Optional[str] = None
    condition: str
    notes: str
    priority: str = "high"  # high, medium, low

class PendingItem(BaseModel):
    description: str
    assigned_to: Optional[str] = None
    due_by: Optional[str] = None
    priority: str = "normal"

class CreateHandoffNote(BaseModel):
    shift: str = "morning"  # morning, afternoon, evening, night
    summary: str = Field(..., min_length=5, max_length=2000)
    critical_patients: List[CriticalPatient] = []
    pending_items: List[PendingItem] = []
    medications_changed: Optional[str] = None
    equipment_issues: Optional[str] = None
    staffing_notes: Optional[str] = None
    clinic: str = "diagyn"


# ============ Endpoints ============

@router.post("")
async def create_handoff_note(note: CreateHandoffNote, authorization: str = Header(None)):
    """Create a new handoff note"""
    doctor = await get_current_doctor(authorization)
    now = get_ist_now()
    
    doc = {
        "doctor_id": doctor.get("username") or doctor.get("sub"),
        "doctor_name": doctor.get("name", "Doctor"),
        "doctor_role": doctor.get("role", "doctor"),
        "shift": note.shift,
        "summary": note.summary,
        "critical_patients": [cp.dict() for cp in note.critical_patients],
        "pending_items": [pi.dict() for pi in note.pending_items],
        "medications_changed": note.medications_changed,
        "equipment_issues": note.equipment_issues,
        "staffing_notes": note.staffing_notes,
        "clinic": note.clinic,
        "date": now.strftime("%Y-%m-%d"),
        "created_at": now.isoformat(),
        "acknowledged_by": [],
        "is_active": True
    }
    
    result = await db.handoff_notes.insert_one(doc)
    doc.pop("_id", None)
    
    logger.info(f"Handoff note created by {doc['doctor_name']} for {note.shift} shift")
    
    return {"success": True, "message": "Handoff note created", "note": doc}


@router.get("")
async def get_handoff_notes(
    days: int = 7,
    clinic: str = "all",
    authorization: str = Header(None)
):
    """Get handoff notes for the past N days"""
    await get_current_doctor(authorization)
    now = get_ist_now()
    start_date = (now - timedelta(days=days)).strftime("%Y-%m-%d")
    
    query = {"date": {"$gte": start_date}}
    if clinic != "all":
        query["clinic"] = {"$regex": clinic, "$options": "i"}
    
    notes = await db.handoff_notes.find(
        query, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"success": True, "notes": notes, "count": len(notes)}


@router.get("/latest")
async def get_latest_handoff(
    clinic: str = "all",
    authorization: str = Header(None)
):
    """Get the most recent handoff note (for incoming doctor)"""
    await get_current_doctor(authorization)
    
    query = {"is_active": True}
    if clinic != "all":
        query["clinic"] = {"$regex": clinic, "$options": "i"}
    
    note = await db.handoff_notes.find_one(
        query, {"_id": 0}, sort=[("created_at", -1)]
    )
    
    if not note:
        return {"success": True, "note": None, "message": "No active handoff notes"}
    
    return {"success": True, "note": note}


@router.post("/{date}/{shift}/acknowledge")
async def acknowledge_handoff(date: str, shift: str, authorization: str = Header(None)):
    """Acknowledge a handoff note (incoming doctor confirms they've read it)"""
    doctor = await get_current_doctor(authorization)
    now = get_ist_now()
    
    ack_entry = {
        "doctor_id": doctor.get("username") or doctor.get("sub"),
        "doctor_name": doctor.get("name", "Doctor"),
        "acknowledged_at": now.isoformat()
    }
    
    result = await db.handoff_notes.update_one(
        {"date": date, "shift": shift},
        {"$addToSet": {"acknowledged_by": ack_entry}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Handoff note not found")
    
    return {"success": True, "message": "Handoff acknowledged"}


@router.get("/stats")
async def get_handoff_stats(days: int = 30, authorization: str = Header(None)):
    """Get handoff note statistics"""
    await get_current_doctor(authorization)
    now = get_ist_now()
    start_date = (now - timedelta(days=days)).strftime("%Y-%m-%d")
    
    notes = await db.handoff_notes.find(
        {"date": {"$gte": start_date}}, {"_id": 0}
    ).to_list(500)
    
    total = len(notes)
    acknowledged = len([n for n in notes if len(n.get("acknowledged_by", [])) > 0])
    with_critical = len([n for n in notes if len(n.get("critical_patients", [])) > 0])
    with_pending = len([n for n in notes if len(n.get("pending_items", [])) > 0])
    
    by_shift = {}
    for n in notes:
        s = n.get("shift", "unknown")
        by_shift[s] = by_shift.get(s, 0) + 1
    
    return {
        "success": True,
        "period_days": days,
        "total_notes": total,
        "acknowledged": acknowledged,
        "acknowledgement_rate": round((acknowledged / total) * 100, 1) if total > 0 else 0,
        "with_critical_patients": with_critical,
        "with_pending_items": with_pending,
        "by_shift": by_shift
    }
