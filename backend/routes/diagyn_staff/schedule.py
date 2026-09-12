"""
DiaGyn Staff Portal — Staff-managed doctor schedule blocking + booking audit log.
Any logged-in staff member can block/unblock a doctor's dates or sessions,
and view the log of booking attempts that were rejected due to a leave block.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
import logging

from . import shared
from .auth import verify_staff

logger = logging.getLogger(__name__)
router = APIRouter()


class StaffBlockedDate(BaseModel):
    doctor: str
    date: str
    reason: str = "Leave"
    force_override: bool = False


class StaffBlockedSession(BaseModel):
    doctor: str
    date: str
    start_time: str
    end_time: str
    reason: str = "Break"
    force_override: bool = False


async def _get_doctor_id(doctor_name: str):
    staff_record = await shared.db.staff.find_one(
        {"$or": [{"doctor_name": doctor_name}, {"name": doctor_name}]}, {"_id": 1, "id": 1}
    )
    if not staff_record:
        return None
    return staff_record.get("id") or str(staff_record.get("_id"))


@router.get("/schedule/doctors")
async def list_schedulable_doctors(staff=Depends(verify_staff)):
    """Doctors that staff can manage leave/blocks for."""
    return {"doctors": list(shared.DOCTOR_SCHEDULE.keys())}


@router.get("/schedule/blocked-dates")
async def get_doctor_blocks(doctor: str, staff=Depends(verify_staff)):
    """Get a doctor's current blocked dates and sessions."""
    doctor_id = await _get_doctor_id(doctor)
    if not doctor_id:
        raise HTTPException(status_code=404, detail="Doctor not found")
    schedule = await shared.db.doctor_schedules.find_one({"doctor_id": doctor_id}, {"_id": 0})
    return {
        "blocked_dates": schedule.get("blocked_dates", []) if schedule else [],
        "blocked_sessions": schedule.get("blocked_sessions", []) if schedule else [],
    }


@router.post("/schedule/block-date")
async def staff_block_date(data: StaffBlockedDate, staff=Depends(verify_staff)):
    """Block a full day for a doctor. If existing appointments conflict, requires force_override."""
    doctor_id = await _get_doctor_id(data.doctor)
    if not doctor_id:
        raise HTTPException(status_code=404, detail="Doctor not found")

    existing_appointments = await shared.db.appointments.find({
        "doctor": {"$regex": data.doctor, "$options": "i"},
        "date": data.date,
        "status": {"$in": ["pending", "Booked", "In Clinic"]}
    }).to_list(100)

    if existing_appointments and not data.force_override:
        patients = [{"name": a.get("patient_name", "Unknown"), "time": a.get("time", ""),
                     "phone": a.get("patient_phone", ""), "booking_id": a.get("booking_id", a.get("id", ""))}
                    for a in existing_appointments]
        return {
            "success": False, "conflict": True,
            "appointment_count": len(existing_appointments), "patients": patients,
            "message": f"{len(existing_appointments)} appointment(s) booked on {data.date}. Override to cancel and notify patients."
        }

    cancelled_count = 0
    if existing_appointments and data.force_override:
        for appt in existing_appointments:
            await shared.db.appointments.update_one(
                {"booking_id": appt.get("booking_id", appt.get("id"))},
                {"$set": {
                    "status": "Cancelled",
                    "cancellation_reason": f"Doctor on leave: {data.reason}",
                    "cancelled_at": datetime.now(timezone.utc).isoformat(),
                    "cancelled_by": f"staff:{staff.get('name', 'staff')}"
                }}
            )
            cancelled_count += 1
            patient_phone = appt.get("patient_phone", "")
            if patient_phone:
                try:
                    from services.msg91_whatsapp import send_order_cancelled
                    await send_order_cancelled(
                        phone=patient_phone, patient_name=appt.get("patient_name", "Patient"),
                        service_name="DiaGyn", order_id=str(appt.get("booking_id", appt.get("id", "")))[:8],
                        db=shared.db
                    )
                except Exception as e:
                    logger.error(f"Failed to send cancellation WhatsApp to {patient_phone}: {e}")

    await shared.db.doctor_schedules.update_one(
        {"doctor_id": doctor_id},
        {"$addToSet": {"blocked_dates": {"date": data.date, "reason": data.reason}},
         "$setOnInsert": {"doctor_id": doctor_id, "doctor_name": data.doctor, "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    logger.info(f"Staff {staff.get('name')} blocked {data.date} for {data.doctor}")
    return {"success": True, "message": f"Blocked {data.date} for {data.doctor}", "cancelled_count": cancelled_count}


@router.delete("/schedule/block-date/{doctor}/{date}")
async def staff_unblock_date(doctor: str, date: str, staff=Depends(verify_staff)):
    doctor_id = await _get_doctor_id(doctor)
    if not doctor_id:
        raise HTTPException(status_code=404, detail="Doctor not found")
    await shared.db.doctor_schedules.update_one(
        {"doctor_id": doctor_id}, {"$pull": {"blocked_dates": {"date": date}}}
    )
    return {"success": True, "message": f"Unblocked {date} for {doctor}"}


@router.post("/schedule/block-session")
async def staff_block_session(data: StaffBlockedSession, staff=Depends(verify_staff)):
    """Block a partial-day session for a doctor. If existing appointments conflict, requires force_override."""
    doctor_id = await _get_doctor_id(data.doctor)
    if not doctor_id:
        raise HTTPException(status_code=404, detail="Doctor not found")

    all_appointments = await shared.db.appointments.find({
        "doctor": {"$regex": data.doctor, "$options": "i"},
        "date": data.date,
        "status": {"$in": ["pending", "Booked", "In Clinic"]}
    }).to_list(100)

    def time_in_range(appt_time, start, end):
        try:
            t = appt_time.strip().upper()
            parsed = datetime.strptime(t, "%I:%M %p") if ("AM" in t or "PM" in t) else datetime.strptime(t, "%H:%M")
            s = datetime.strptime(start, "%H:%M")
            e = datetime.strptime(end, "%H:%M")
            return s <= parsed <= e
        except Exception:
            return False

    affected = [a for a in all_appointments if time_in_range(a.get("time", ""), data.start_time, data.end_time)]

    if affected and not data.force_override:
        patients = [{"name": a.get("patient_name", "Unknown"), "time": a.get("time", ""),
                     "phone": a.get("patient_phone", ""), "booking_id": a.get("booking_id", a.get("id", ""))}
                    for a in affected]
        return {
            "success": False, "conflict": True,
            "appointment_count": len(affected), "patients": patients,
            "message": f"{len(affected)} appointment(s) booked in this session. Override to cancel and notify patients."
        }

    cancelled_count = 0
    if affected and data.force_override:
        for appt in affected:
            await shared.db.appointments.update_one(
                {"booking_id": appt.get("booking_id", appt.get("id"))},
                {"$set": {
                    "status": "Cancelled",
                    "cancellation_reason": f"Doctor on leave: {data.reason}",
                    "cancelled_at": datetime.now(timezone.utc).isoformat(),
                    "cancelled_by": f"staff:{staff.get('name', 'staff')}"
                }}
            )
            cancelled_count += 1
            patient_phone = appt.get("patient_phone", "")
            if patient_phone:
                try:
                    from services.msg91_whatsapp import send_order_cancelled
                    await send_order_cancelled(
                        phone=patient_phone, patient_name=appt.get("patient_name", "Patient"),
                        service_name="DiaGyn", order_id=str(appt.get("booking_id", appt.get("id", "")))[:8],
                        db=shared.db
                    )
                except Exception as e:
                    logger.error(f"Failed to send cancellation WhatsApp to {patient_phone}: {e}")

    await shared.db.doctor_schedules.update_one(
        {"doctor_id": doctor_id},
        {"$addToSet": {"blocked_sessions": {"date": data.date, "start_time": data.start_time, "end_time": data.end_time, "reason": data.reason}},
         "$setOnInsert": {"doctor_id": doctor_id, "doctor_name": data.doctor, "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    logger.info(f"Staff {staff.get('name')} blocked session {data.start_time}-{data.end_time} on {data.date} for {data.doctor}")
    return {"success": True, "message": f"Blocked {data.start_time}-{data.end_time} on {data.date} for {data.doctor}", "cancelled_count": cancelled_count}


@router.delete("/schedule/block-session/{doctor}/{date}/{start_time}")
async def staff_unblock_session(doctor: str, date: str, start_time: str, staff=Depends(verify_staff)):
    doctor_id = await _get_doctor_id(doctor)
    if not doctor_id:
        raise HTTPException(status_code=404, detail="Doctor not found")
    await shared.db.doctor_schedules.update_one(
        {"doctor_id": doctor_id}, {"$pull": {"blocked_sessions": {"date": date, "start_time": start_time}}}
    )
    return {"success": True, "message": f"Unblocked session on {date} for {doctor}"}


@router.get("/schedule/blocked-attempts")
async def get_blocked_attempts(doctor: Optional[str] = None, limit: int = 100, staff=Depends(verify_staff)):
    """Audit log of booking attempts rejected because the doctor was on leave/blocked."""
    query = {"doctor": doctor} if doctor else {}
    attempts = await shared.db.blocked_slot_attempts.find(query, {"_id": 0}) \
        .sort("attempted_at", -1).to_list(min(limit, 500))
    return {"attempts": attempts, "total": len(attempts)}
