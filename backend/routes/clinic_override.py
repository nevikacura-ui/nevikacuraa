"""
Nevika Cura - Doctor Clinic Override
Allows doctors to override their routine clinic assignment for specific date+session.
Affected patients get WhatsApp notification. New bookings see the overridden clinic.
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import jwt
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/clinic-override", tags=["Clinic Override"])

db = None
JWT_SECRET = None
JWT_ALGORITHM = "HS256"

def set_db(database):
    global db
    db = database

def set_jwt_config(secret, algorithm):
    global JWT_SECRET, JWT_ALGORITHM
    JWT_SECRET = secret
    JWT_ALGORITHM = algorithm

async def verify_doctor(authorization: str = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Authentication required")
    token = authorization.replace('Bearer ', '')
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("role") not in ["doctor", "admin", "super_admin"]:
            raise HTTPException(status_code=403, detail="Doctor access required")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


class ClinicOverrideCreate(BaseModel):
    date: str
    session: str
    override_clinic: str
    reason: Optional[str] = "Doctor preference"


CLINICS = {
    "pushpa": "Pushpa Clinic",
    "amnion": "Amnion Clinic",
}

DOCTOR_ROUTINE = {
    "dr_vikas": {
        "name": "Dr. Vikas Jha",
        "pushpa": [{"days": ["Monday", "Wednesday", "Friday"], "time": "18:00-22:00"}],
        "amnion": [
            {"days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], "time": "11:00-14:00"},
            {"days": ["Tuesday", "Thursday", "Saturday"], "time": "18:00-22:00"}
        ]
    },
    "dr_neha": {
        "name": "Dr. Neha Patel",
        "amnion": [{"days": ["Monday", "Wednesday", "Friday"], "time": "18:00-22:00"}],
        "pushpa": [
            {"days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], "time": "11:00-14:00"},
            {"days": ["Tuesday", "Thursday", "Saturday"], "time": "18:00-22:00"}
        ]
    }
}

SESSION_TIMES = {
    "morning": {"start": "11:00", "end": "14:00"},
    "evening": {"start": "18:00", "end": "22:00"},
}


def get_day_name(date_str):
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    return dt.strftime("%A")


def get_routine_clinic(doctor_id, date_str, session):
    routine = DOCTOR_ROUTINE.get(doctor_id)
    if not routine:
        for did, data in DOCTOR_ROUTINE.items():
            if data["name"] == doctor_id:
                routine = data
                break
    if not routine:
        return None
    day_name = get_day_name(date_str)
    session_start = SESSION_TIMES.get(session, {}).get("start", "")
    for clinic_id in ["pushpa", "amnion"]:
        schedules = routine.get(clinic_id, [])
        for s in schedules:
            if day_name in s["days"]:
                start_time = s["time"].split("-")[0]
                if start_time == session_start:
                    return clinic_id
    return None


@router.post("")
async def create_clinic_override(data: ClinicOverrideCreate, doctor=Depends(verify_doctor)):
    doctor_id = doctor.get("username") or doctor.get("sub") or doctor.get("id")
    doctor_name = doctor.get("doctor_name") or doctor.get("name", "Doctor")

    if data.session not in ["morning", "evening"]:
        raise HTTPException(status_code=400, detail="Session must be 'morning' or 'evening'")
    if data.override_clinic not in CLINICS:
        raise HTTPException(status_code=400, detail="Invalid clinic. Must be 'pushpa' or 'amnion'")

    existing = await db.clinic_overrides.find_one({
        "doctor_id": doctor_id, "date": data.date, "session": data.session,
    })
    if existing:
        raise HTTPException(status_code=400, detail="Override already exists for this date+session. Delete it first.")

    original_clinic = get_routine_clinic(doctor_id, data.date, data.session)

    if original_clinic == data.override_clinic:
        raise HTTPException(status_code=400, detail=f"You are already at {CLINICS[data.override_clinic]} for this session.")

    override_doc = {
        "doctor_id": doctor_id,
        "doctor_name": doctor_name,
        "date": data.date,
        "session": data.session,
        "original_clinic": original_clinic,
        "override_clinic": data.override_clinic,
        "override_clinic_name": CLINICS[data.override_clinic],
        "original_clinic_name": CLINICS.get(original_clinic, "N/A"),
        "reason": data.reason or "Doctor preference",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "notified_patients": []
    }

    result = await db.clinic_overrides.insert_one(override_doc)
    override_id = str(result.inserted_id)

    # Notify DiaGyn staff via staff_notifications
    await db.staff_notifications.insert_one({
        "type": "clinic_override",
        "doctor_name": doctor_name,
        "date": data.date,
        "session": data.session,
        "original_clinic": CLINICS.get(original_clinic, "N/A"),
        "override_clinic": CLINICS[data.override_clinic],
        "reason": data.reason or "Doctor preference",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "read": False
    })

    session_times = SESSION_TIMES[data.session]
    affected_appointments = []

    if original_clinic:
        cursor = db.appointments.find({
            "doctor": doctor_name,
            "date": data.date,
            "clinic": {"$regex": CLINICS.get(original_clinic, ""), "$options": "i"},
            "status": {"$nin": ["Cancelled", "NoShow"]}
        })

        async for apt in cursor:
            apt_time = apt.get("time", "")
            try:
                hour = int(apt_time.split(":")[0])
                if data.session == "morning" and 11 <= hour < 14:
                    affected_appointments.append(apt)
                elif data.session == "evening" and 18 <= hour < 22:
                    affected_appointments.append(apt)
            except Exception:
                pass

        if affected_appointments:
            apt_ids = [a["_id"] for a in affected_appointments]
            await db.appointments.update_many(
                {"_id": {"$in": apt_ids}},
                {"$set": {
                    "clinic": CLINICS[data.override_clinic],
                    "clinic_override": True,
                    "original_clinic": CLINICS.get(original_clinic, ""),
                }}
            )

            notified = []
            for apt in affected_appointments:
                phone = apt.get("patient_phone", "")
                name = apt.get("patient_name", "Patient")
                booking_id = apt.get("booking_id", "N/A")
                if phone:
                    try:
                        from services.msg91_whatsapp import send_clinic_switch_whatsapp
                        from datetime import datetime as dt
                        date_formatted = dt.strptime(data.date, "%Y-%m-%d").strftime("%A, %d %B %Y")
                        result = await send_clinic_switch_whatsapp(
                            recipient_phone=phone,
                            patient_name=name,
                            doctor_name=doctor_name,
                            new_clinic=CLINICS[data.override_clinic],
                            appointment_date=date_formatted,
                            session=data.session,
                        )
                        if result.get("success"):
                            notified.append(booking_id)
                        else:
                            logger.warning(f"Template notification failed for {phone}, trying fallback")
                            from services.notification_service import send_whatsapp_notification
                            message = (
                                f"Dear {name}, your appointment (#{booking_id}) on {data.date} "
                                f"has been moved from {CLINICS.get(original_clinic, '')} to "
                                f"{CLINICS[data.override_clinic]}. "
                                f"Session: {data.session.capitalize()} ({session_times['start']}-{session_times['end']}). "
                                f"Doctor: {doctor_name}. Sorry for the inconvenience."
                            )
                            await send_whatsapp_notification(phone, message)
                            notified.append(booking_id)
                    except Exception as e:
                        logger.error(f"Failed to notify patient {phone}: {e}")

            await db.clinic_overrides.update_one(
                {"_id": result.inserted_id},
                {"$set": {"notified_patients": notified}}
            )

    return {
        "success": True,
        "override_id": override_id,
        "message": f"Clinic override created. {len(affected_appointments)} appointment(s) moved to {CLINICS[data.override_clinic]}.",
        "affected_count": len(affected_appointments),
        "original_clinic": CLINICS.get(original_clinic, "N/A"),
        "override_clinic": CLINICS[data.override_clinic],
    }


@router.get("")
async def get_my_overrides(doctor=Depends(verify_doctor)):
    doctor_id = doctor.get("username") or doctor.get("sub") or doctor.get("id")
    overrides = await db.clinic_overrides.find(
        {"doctor_id": doctor_id}, {"_id": 0}
    ).sort("date", 1).to_list(100)
    return {"overrides": overrides}


@router.delete("/{date}/{session}")
async def delete_clinic_override(date: str, session: str, doctor=Depends(verify_doctor)):
    doctor_id = doctor.get("username") or doctor.get("sub") or doctor.get("id")

    override = await db.clinic_overrides.find_one({
        "doctor_id": doctor_id, "date": date, "session": session,
    })
    if not override:
        raise HTTPException(status_code=404, detail="Override not found")

    original_clinic_name = override.get("original_clinic_name", "")
    override_clinic_name = override.get("override_clinic_name", "")
    doctor_name = override.get("doctor_name", "")

    if original_clinic_name and override_clinic_name:
        cursor = db.appointments.find({
            "doctor": doctor_name, "date": date,
            "clinic_override": True, "clinic": override_clinic_name,
            "status": {"$nin": ["Cancelled", "NoShow"]}
        })
        async for apt in cursor:
            apt_time = apt.get("time", "")
            try:
                hour = int(apt_time.split(":")[0])
                should_revert = (
                    (session == "morning" and 11 <= hour < 14) or
                    (session == "evening" and 18 <= hour < 22)
                )
                if should_revert:
                    await db.appointments.update_one(
                        {"_id": apt["_id"]},
                        {"$set": {"clinic": original_clinic_name},
                         "$unset": {"clinic_override": 1, "original_clinic": 1}}
                    )
            except Exception:
                pass

    await db.clinic_overrides.delete_one({
        "doctor_id": doctor_id, "date": date, "session": session,
    })
    return {"success": True, "message": "Override removed. Appointments reverted to original clinic."}


@router.get("/active")
async def get_active_overrides():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    overrides = await db.clinic_overrides.find(
        {"date": {"$gte": today}},
        {"_id": 0, "notified_patients": 0, "created_at": 0}
    ).to_list(100)
    return {"overrides": overrides}
