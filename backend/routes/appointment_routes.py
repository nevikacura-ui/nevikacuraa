"""
Appointment Routes - Extracted from server.py
Includes: create/get appointments, booked slots, slot blocking,
guest appointments, next available slot, feedback, booking limits.
Note: WebSocket endpoints remain in server.py (require @app.websocket).
"""
import os
import uuid
import random
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field, ConfigDict, EmailStr

from utils.auth_utils import (
    User, JWT_SECRET, JWT_ALGORITHM,
    get_current_user, get_current_user_optional, get_db
)
from utils.timezone_utils import normalize_time_to_24h

logger = logging.getLogger("server")
router = APIRouter(tags=["Appointments"])

# Dependencies set by server.py
_deps = {}

def set_deps(deps: dict):
    global _deps
    _deps = deps


# ============ Pydantic Models ============

def _ist_now():
    from datetime import timedelta as _td
    return datetime.now(timezone.utc) + _td(hours=5, minutes=30)

class Appointment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: Optional[str] = None
    user_id: Optional[str] = None
    doctor: str
    clinic: str
    date: str
    time: str
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    patient_id: Optional[str] = None
    patient_age: Optional[str] = None
    status: str = "pending"
    created_at: datetime = Field(default_factory=_ist_now)

class AppointmentCreate(BaseModel):
    doctor: str
    clinic: str
    date: str
    time: str
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    patient_id: Optional[str] = None
    patient_age: Optional[str] = None
    send_email_reminder: bool = True
    booking_type: Optional[str] = None

class GuestAppointmentCreate(BaseModel):
    doctor: str
    clinic: str
    date: str
    time: str
    patient_name: str
    patient_phone: str
    patient_age: Optional[str] = None
    patient_email: Optional[str] = None
    otp: str

class SlotBlockRequest(BaseModel):
    doctor: str
    clinic: str
    date: str
    slots: List[str]
    reason: str = "Doctor running late"

class AppointmentFeedback(BaseModel):
    rating: int
    comment: Optional[str] = None


# ============ Helper Functions ============

def normalize_date_format(date_str: str) -> str:
    if not date_str:
        return date_str
    formats = ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%m/%d/%Y']
    for fmt in formats:
        try:
            parsed = datetime.strptime(date_str, fmt)
            return parsed.strftime('%Y-%m-%d')
        except ValueError:
            continue
    return date_str


def get_date_patterns(date_str: str) -> list:
    patterns = [date_str]
    try:
        if '-' in date_str and len(date_str.split('-')[0]) == 4:
            parsed = datetime.strptime(date_str, '%Y-%m-%d')
            patterns.append(parsed.strftime('%d/%m/%Y'))
        elif '/' in date_str:
            parsed = datetime.strptime(date_str, '%d/%m/%Y')
            patterns.append(parsed.strftime('%Y-%m-%d'))
    except ValueError:
        pass
    return list(set(patterns))


async def generate_booking_id(clinic: str, db_instance, booking_type: str = "appointment") -> str:
    """Legacy wrapper — routes to new unified booking ID generator."""
    from utils.booking_utils import generate_booking_id as gen_id
    # Determine service from clinic name
    clinic_lower = clinic.lower().strip()
    if any(k in clinic_lower for k in ["pharmacy", "orange"]):
        service = "orange"
    elif any(k in clinic_lower for k in ["proton", "diagnostic", "lab", "mango"]):
        service = "mango"
    else:
        service = "diagyn"
    return await gen_id(service=service, source="web", db_instance=db_instance)


# ============ Create Appointment ============

@router.post("/appointments", response_model=Appointment)
async def create_appointment(input: AppointmentCreate, user=Depends(get_current_user_optional)):
    db = get_db()

    # REAL-TIME DATE/TIME VALIDATION
    try:
        appointment_date = datetime.strptime(input.date, "%Y-%m-%d").date()
        time_str = input.time.strip().upper()
        if "AM" in time_str or "PM" in time_str:
            appointment_time = datetime.strptime(time_str, "%I:%M %p").time()
        else:
            appointment_time = datetime.strptime(time_str, "%H:%M").time()
        appointment_datetime = datetime.combine(appointment_date, appointment_time)

        from zoneinfo import ZoneInfo
        ist = ZoneInfo("Asia/Kolkata")
        now_ist = datetime.now(ist).replace(tzinfo=None)

        if appointment_datetime < now_ist:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot book appointments for past dates/times. The selected slot ({input.date} at {input.time}) has already passed."
            )
        min_booking_buffer = timedelta(hours=1)
        if appointment_datetime < now_ist + min_booking_buffer:
            raise HTTPException(
                status_code=400,
                detail="Appointments must be booked at least 1 hour in advance. For urgent appointments, please contact the clinic directly or use the staff portal."
            )

        is_online_consultation = 'online' in input.clinic.lower() or input.booking_type == 'online_consultation'
        if not is_online_consultation:
            hour = appointment_time.hour
            minute = appointment_time.minute
            is_morning_session = (hour == 11) or (hour == 12) or (hour == 13) or (hour == 14 and minute == 0)
            is_evening_session = (hour >= 18 and hour < 22) or (hour == 22 and minute == 0)
            if not (is_morning_session or is_evening_session):
                raise HTTPException(
                    status_code=400,
                    detail=f"Appointments can only be booked during clinic hours: 11 AM - 2 PM or 6 PM - 10 PM. The selected time ({input.time}) is outside clinic hours."
                )
        else:
            hour = appointment_time.hour
            if hour < 9 or hour >= 22:
                raise HTTPException(
                    status_code=400,
                    detail=f"Online consultations are available between 9 AM - 10 PM. The selected time ({input.time}) is outside available hours."
                )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Date/time validation warning: {e}")

    normalized_date = normalize_date_format(input.date)
    date_patterns = get_date_patterns(normalized_date)

    # Normalize time BEFORE duplicate check to prevent double-booking
    normalized_time = normalize_time_to_24h(input.time) if input.time else input.time

    await assert_slot_not_blocked(db, input.doctor, normalized_date, normalized_time,
                                   source="standard_booking", patient_name=input.patient_name, patient_phone=input.patient_phone)

    existing = await db.appointments.find_one({
        "doctor": input.doctor, "clinic": input.clinic,
        "date": {"$in": date_patterns}, "time": normalized_time,
        "status": {"$in": ["pending", "Booked", "CheckedIn", "WithDoctor", "billing_pending", "In Clinic", "Completed"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail="This time slot is already booked. Please select another slot.")

    # Smart duplicate check: prevent same patient booking same doctor on same date
    # (Allows booking different doctors, different dates, or for family members)
    if input.patient_phone:
        same_doctor_same_date = await db.appointments.find_one({
            "patient_phone": input.patient_phone.strip(),
            "doctor": input.doctor,
            "date": {"$in": date_patterns},
            "status": {"$in": ["pending", "Booked", "CheckedIn", "WithDoctor", "billing_pending", "In Clinic"]}
        }, {"_id": 0, "booking_id": 1, "date": 1, "time": 1})
        if same_doctor_same_date:
            raise HTTPException(
                status_code=400,
                detail=f"You already have an appointment (#{same_doctor_same_date.get('booking_id', '')}) with {input.doctor} on {same_doctor_same_date.get('date', '')} at {same_doctor_same_date.get('time', '')}. You can book a different doctor or a different date."
            )

    # 24-hour cooldown: prevent same patient from booking multiple appointments within 24 hours
    if input.patient_phone:
        from zoneinfo import ZoneInfo
        ist = ZoneInfo("Asia/Kolkata")
        now_ist = datetime.now(ist)
        cutoff_24h = (now_ist - timedelta(hours=24)).isoformat()
        recent_booking = await db.appointments.find_one({
            "patient_phone": input.patient_phone.strip(),
            "created_at": {"$gte": cutoff_24h},
            "status": {"$in": ["pending", "Booked", "CheckedIn", "WithDoctor", "billing_pending", "In Clinic"]},
            "source": {"$ne": "Staff"}
        }, {"_id": 0, "booking_id": 1, "doctor": 1, "date": 1, "time": 1})
        if recent_booking:
            raise HTTPException(
                status_code=400,
                detail=f"You already booked an appointment (#{recent_booking.get('booking_id', '')}) with {recent_booking.get('doctor', '')} recently. Only one booking per 24 hours is allowed. Please contact the clinic for additional appointments."
            )

    booking_id = await generate_booking_id(input.clinic, db)
    user_id = None
    if user:
        user_id = user.id if hasattr(user, 'id') else user.get("id") if isinstance(user, dict) else None
    appointment = Appointment(
        user_id=user_id,
        booking_id=booking_id,
        status="Booked",
        **input.model_dump()
    )

    doc = appointment.model_dump()
    doc['date'] = normalized_date
    doc['time'] = normalize_time_to_24h(doc.get('time', ''))
    doc['created_at'] = doc['created_at'].isoformat()
    doc['appointment_type'] = "NORMAL"
    doc['send_email_reminder'] = input.send_email_reminder
    doc['booked_by'] = "patient" if user else "guest"
    doc['status'] = "Booked"
    doc['source'] = "Website"

    # Use booking reliability services
    get_audit_logger = _deps.get("get_audit_logger")
    get_db_writer = _deps.get("get_db_writer")
    audit_logger = get_audit_logger() if get_audit_logger else None
    db_writer = get_db_writer() if get_db_writer else None

    audit_id = None
    if audit_logger:
        audit_id = await audit_logger.log_attempt(
            action="create_appointment",
            booking_data={
                "patient_name": appointment.patient_name,
                "patient_phone": appointment.patient_phone,
                "doctor": appointment.doctor,
                "clinic": appointment.clinic,
                "date": appointment.date,
                "time": appointment.time,
                "booking_id": booking_id
            },
            source="patient_app"
        )

    if db_writer:
        insert_result = await db_writer.insert_with_retry(
            collection_name="appointments",
            document=doc,
            audit_logger=audit_logger,
            audit_id=audit_id
        )
        if not insert_result["success"]:
            logger.error(f"[CRITICAL] Appointment insert failed: {insert_result['error']}")
            raise HTTPException(status_code=500, detail="Booking failed. Please try again.")
        logger.info(f"Appointment created with retry: {appointment.id}, retries={insert_result['retries']}")
    else:
        await db.appointments.insert_one(doc)
        logger.info(f"Appointment created (fallback): {appointment.id} with booking_id: {booking_id}")

    # Verify insert
    verify_doc = await db.appointments.find_one({"id": appointment.id})
    if not verify_doc:
        logger.error(f"[CRITICAL] Appointment verification failed: {appointment.id}")
        if audit_logger and audit_id:
            await audit_logger.log_failure(audit_id=audit_id, error_type="VERIFICATION_FAILED", error_message="Document not found after insert")
        raise HTTPException(status_code=500, detail="Booking verification failed. Please try again.")

    if audit_logger and audit_id:
        await audit_logger.log_success(audit_id=audit_id, booking_id=booking_id, appointment_id=appointment.id)
    logger.info(f"Appointment VERIFIED: {appointment.id} with booking_id: {booking_id}")

    # Live sync notification
    live_sync_manager = _deps.get("live_sync_manager")
    try:
        if live_sync_manager:
            await live_sync_manager.notify_new_appointment({
                "id": appointment.id, "patient_name": appointment.patient_name,
                "patient_phone": appointment.patient_phone, "doctor_name": appointment.doctor,
                "doctor_id": getattr(appointment, 'doctor_id', None),
                "clinic_id": appointment.clinic, "appointment_date": appointment.date,
                "time_slot": appointment.time, "status": "Booked",
                "created_at": appointment.created_at
            })
    except Exception as e:
        logger.warning(f"Live sync notification failed: {e}")

    # Staff notifications
    try:
        from routes.staff_notifications import create_staff_notification
        await create_staff_notification(
            db=db, notification_type="new_appointment",
            title="New Appointment Booked",
            message=f"{appointment.patient_name} ({booking_id}) booked with {appointment.doctor} on {appointment.date} at {appointment.time}",
            clinic=appointment.clinic, appointment_id=appointment.id,
            patient_name=appointment.patient_name, doctor=appointment.doctor,
            date=appointment.date, time=appointment.time
        )
    except Exception as e:
        logger.warning(f"Staff notification failed: {e}")

    try:
        from routes.notifications import notify_staff_appointment, create_notification
        await notify_staff_appointment({
            "clinic": appointment.clinic, "patient_name": appointment.patient_name,
            "doctor": appointment.doctor, "date": appointment.date,
            "time": appointment.time, "booking_id": booking_id,
        })
        patient_uid = appointment.patient_phone or appointment.patient_name
        await create_notification(
            user_id=patient_uid, title="Appointment Confirmed",
            message=f"Your appointment with {appointment.doctor} on {appointment.date} at {appointment.time} is confirmed. Booking ID: {booking_id}",
            notif_type="appointment", link="/track", icon="calendar-check",
        )
    except Exception as e:
        logger.warning(f"In-app notifications failed: {e}")

    whatsapp_message = f"""New DiaGyn Appointment Booking

Booking ID: {booking_id}
Patient: {appointment.patient_name}
Phone: {appointment.patient_phone}

Doctor: {appointment.doctor}
Clinic: {appointment.clinic}
Date: {appointment.date}
Time: {appointment.time}"""
    whatsapp_link = f"https://wa.me/917039020020?text={whatsapp_message.replace(chr(10), '%0A').replace(' ', '%20')}"

    # Send email notifications
    send_email_notification = _deps.get("send_email_notification")
    notify_doctor_whatsapp = _deps.get("notify_doctor_whatsapp")
    send_push_notification = _deps.get("send_push_notification")
    send_appointment_sms = _deps.get("send_appointment_sms")
    send_diagyn_appointment_confirmation = _deps.get("send_diagyn_appointment_confirmation")
    notify_staff_new_appointment = _deps.get("notify_staff_new_appointment")
    send_push_to_staff = _deps.get("send_push_to_staff")
    slot_manager = _deps.get("slot_manager")
    appointment_manager = _deps.get("appointment_manager")

    # --- Build premium email templates ---
    from services.email_templates import appointment_confirmation_email, _boarding_pass_card, _base_wrapper, _illustration_hero, _spacer, _helpline, ILLUST_DIAGYN

    # Admin/Staff notification — Boarding pass card with STAFF label
    admin_details = [
        ("Patient", appointment.patient_name),
        ("Phone", appointment.patient_phone),
        ("Email", appointment.patient_email or "Not provided"),
        ("Doctor", appointment.doctor),
        ("Clinic", appointment.clinic),
        ("Date", appointment.date),
        ("Time", appointment.time),
    ]
    admin_card = _boarding_pass_card(
        brand_name="DiaGyn - STAFF COPY",
        accent_color="#5b2d8e",
        patient_name=appointment.patient_name,
        clinic_name=appointment.clinic,
        booking_id=str(booking_id),
        details_rows=admin_details,
        instruction=f"New online booking by {appointment.patient_name}",
        page_bg="#f4f5f7",
    )
    from services.email_templates import _cta_button
    email_html = _base_wrapper(
        _illustration_hero(ILLUST_DIAGYN)
        + admin_card
        + _spacer(6)
        + _cta_button("Open Staff Portal", "https://nevikacura.com/diagyn-staff", "diagyn"),
        "diagyn",
        show_curapay=False,
    )

    # Patient confirmation email (premium Light UI with illustration)
    patient_appt_html = appointment_confirmation_email(
        patient_name=appointment.patient_name,
        booking_id=str(booking_id),
        doctor_name=appointment.doctor,
        clinic_name=appointment.clinic,
        appointment_date=appointment.date,
        session="",
        time_slot=appointment.time,
        amount="",
    )

    if send_email_notification:
        await send_email_notification(
            f"New Appointment - {appointment.doctor} on {appointment.date} ({booking_id})",
            email_html,
            patient_email=appointment.patient_email,
            patient_subject=f"Booking Confirmed: {booking_id} | {appointment.doctor} on {appointment.date}",
            patient_html=patient_appt_html,
        )

    if notify_doctor_whatsapp:
        await notify_doctor_whatsapp(appointment.doctor, {
            "clinic": appointment.clinic, "date": appointment.date,
            "time": appointment.time, "patient_name": appointment.patient_name,
            "patient_phone": appointment.patient_phone,
            "booking_id": booking_id, "booked_by": "Patient (Online)"
        }, "online")

    if user and send_push_notification:
        user_id = user.id if hasattr(user, 'id') else user.get("id")
        if user_id:
            await send_push_notification(
                user_id=user_id,
                title="Appointment Confirmed!",
                body=f"Booking ID: {booking_id} | {appointment.doctor} on {appointment.date} at {appointment.time}",
                url="/profile", tag=f"appointment-{appointment.id}"
            )

    if send_appointment_sms:
        await send_appointment_sms(appointment.patient_phone, {
            "doctor": appointment.doctor, "clinic": appointment.clinic,
            "date": appointment.date, "time": appointment.time,
            "booking_id": booking_id, "booking_type": "online"
        })

    if send_diagyn_appointment_confirmation:
        try:
            whatsapp_result = await send_diagyn_appointment_confirmation(
                phone=appointment.patient_phone, patient_name=appointment.patient_name,
                date=appointment.date, time=appointment.time,
                doctor_name=appointment.doctor, clinic_name=appointment.clinic,
                booking_id=booking_id, db=db
            )
            if whatsapp_result.get("success"):
                logger.info(f"WhatsApp confirmation sent for booking {booking_id}")
        except Exception as e:
            logger.error(f"WhatsApp notification error: {e}")

    # Generate appointment code
    appointment_code = None
    try:
        from services.booking_otp import generate_booking_code_record, store_booking_code
        code_record = generate_booking_code_record(
            booking_id=booking_id, booking_type="diagyn",
            patient_phone=appointment.patient_phone,
            patient_name=appointment.patient_name,
            additional_data={
                "date": appointment.date, "time": appointment.time,
                "doctor_name": appointment.doctor, "clinic_name": appointment.clinic,
                "booking_id": booking_id
            }
        )
        await store_booking_code(db, code_record)
        appointment_code = code_record["code"]
        await db.appointments.update_one(
            {"id": appointment.id}, {"$set": {"appointment_code": appointment_code}}
        )
    except Exception as e:
        logger.error(f"Appointment Code generation error: {e}")

    if notify_staff_new_appointment:
        await notify_staff_new_appointment({
            "patient_name": appointment.patient_name, "doctor": appointment.doctor,
            "clinic": appointment.clinic, "date": appointment.date,
            "time": appointment.time, "booking_id": booking_id,
            "patient_phone": appointment.patient_phone, "booking_type": "online"
        })

    if slot_manager:
        await slot_manager.broadcast_slot_update(
            doctor=appointment.doctor, clinic=appointment.clinic,
            date=appointment.date, slot=appointment.time, status="booked"
        )

    if appointment_manager:
        await appointment_manager.broadcast_new_appointment({
            "id": appointment.id, "booking_id": booking_id,
            "patient_name": appointment.patient_name,
            "patient_phone": appointment.patient_phone,
            "patient_email": appointment.patient_email,
            "doctor": appointment.doctor, "clinic": appointment.clinic,
            "date": appointment.date, "time": appointment.time,
            "status": "Booked", "portal": "diagyn", "booked_by": "patient"
        })

    if send_push_to_staff:
        try:
            await send_push_to_staff(
                portal_types=['diagyn_staff', 'doctor'],
                title="New Appointment Booked!",
                body=f"{appointment.patient_name} | {appointment.doctor} | {appointment.date} @ {appointment.time}",
                url="/staff", tag=f"new-appointment-{booking_id}",
                clinic=appointment.clinic
            )
        except Exception as e:
            logger.warning(f"Staff push notification failed: {e}")

    response_data = appointment.model_dump() if hasattr(appointment, 'model_dump') else appointment.__dict__.copy()
    response_data['appointment_code'] = appointment_code
    response_data['booking_id'] = booking_id
    return response_data


# ============ Booked Slots ============

async def get_doctor_schedule_by_name(db, doctor: str):
    """Look up a doctor's blocked_dates/blocked_sessions by their display name."""
    doctor_staff_records = await db.staff.find(
        {"$or": [{"doctor_name": doctor}, {"name": doctor}]},
        {"_id": 1, "id": 1}
    ).to_list(10)

    for staff_record in doctor_staff_records:
        doctor_id = staff_record.get("id") or str(staff_record.get("_id"))
        doctor_schedule = await db.doctor_schedules.find_one(
            {"doctor_id": doctor_id}, {"_id": 0, "blocked_sessions": 1, "blocked_dates": 1}
        )
        if doctor_schedule:
            return doctor_schedule
    return None


async def log_blocked_attempt(db, doctor: str, date: str, time_str: str, block_type: str, reason: str,
                                source: str = "unknown", patient_name: str = None, patient_phone: str = None):
    """Record a rejected booking attempt onto a doctor's leave day/session for staff audit visibility."""
    try:
        await db.blocked_slot_attempts.insert_one({
            "id": str(uuid.uuid4()),
            "doctor": doctor,
            "date": date,
            "time": time_str,
            "block_type": block_type,  # "full_day" | "session"
            "reason": reason,
            "source": source,
            "patient_name": patient_name,
            "patient_phone": patient_phone,
            "attempted_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        logger.warning(f"Failed to log blocked slot attempt: {e}")


async def assert_slot_not_blocked(db, doctor: str, date: str, time_str: str,
                                    source: str = "unknown", patient_name: str = None, patient_phone: str = None):
    """Reject booking/rescheduling onto a doctor's leave day or blocked session. Call before insert/update."""
    doctor_schedule = await get_doctor_schedule_by_name(db, doctor)
    if not doctor_schedule:
        return
    for blocked_date in doctor_schedule.get("blocked_dates", []):
        if blocked_date.get("date") == date:
            reason = blocked_date.get("reason", "Leave")
            await log_blocked_attempt(db, doctor, date, time_str, "full_day", reason, source, patient_name, patient_phone)
            raise HTTPException(status_code=400, detail=f"{doctor} is on leave on {date} ({reason}). Please pick another date.")
    for session in doctor_schedule.get("blocked_sessions", []):
        if session.get("date") != date:
            continue
        try:
            t = datetime.strptime(time_str, "%H:%M") if ":" in time_str and "AM" not in time_str.upper() and "PM" not in time_str.upper() else datetime.strptime(time_str.strip().upper(), "%I:%M %p")
            s = datetime.strptime(session["start_time"], "%H:%M")
            e = datetime.strptime(session["end_time"], "%H:%M")
            if s.time() <= t.time() < e.time():
                reason = session.get('reason', 'Leave')
                await log_blocked_attempt(db, doctor, date, time_str, "session", reason, source, patient_name, patient_phone)
                raise HTTPException(status_code=400, detail=f"{doctor} is unavailable at {time_str} on {date} ({reason}). Please pick another slot.")
        except HTTPException:
            raise
        except (ValueError, KeyError):
            pass


@router.get("/doctors/blocked-dates")
async def get_doctor_blocked_dates_public(doctor: str):
    """Public endpoint so patient-facing calendars can grey out a doctor's leave days."""
    db = get_db()
    doctor_schedule = await get_doctor_schedule_by_name(db, doctor)
    if not doctor_schedule:
        return {"blocked_dates": [], "blocked_sessions": []}
    return {
        "blocked_dates": doctor_schedule.get("blocked_dates", []),
        "blocked_sessions": doctor_schedule.get("blocked_sessions", [])
    }


@router.get("/appointments/booked-slots")
async def get_booked_slots(doctor: str, clinic: str, date: str):
    db = get_db()
    date_patterns = get_date_patterns(date)

    booked = await db.appointments.find(
        {"doctor": doctor, "clinic": clinic, "date": {"$in": date_patterns},
         "status": {"$in": ["pending", "Booked", "blocked", "In Clinic", "Completed"]}},
        {"_id": 0, "time": 1}
    ).to_list(100)

    reserved_slots = ["11:00", "11:15"]
    booked_times = [b["time"] for b in booked if b.get("time")]

    # Check doctor schedule blocked sessions
    blocked_session_slots = []
    doctor_schedule = await get_doctor_schedule_by_name(db, doctor)

    if doctor_schedule:
        blocked_dates = doctor_schedule.get("blocked_dates", [])
        for blocked_date in blocked_dates:
            if blocked_date.get("date") == date:
                all_day_slots = [f"{h:02d}:{m:02d}" for h in range(6, 23) for m in [0, 15, 30, 45]]
                return {"booked_slots": all_day_slots, "date_blocked": True, "reason": blocked_date.get("reason", "Leave")}

        blocked_sessions = doctor_schedule.get("blocked_sessions", [])
        for session in blocked_sessions:
            if session.get("date") == date:
                start_time = session.get("start_time", "")
                end_time = session.get("end_time", "")
                if start_time and end_time:
                    try:
                        start_h, start_m = map(int, start_time.split(":"))
                        end_h, end_m = map(int, end_time.split(":"))
                        current_h, current_m = start_h, start_m
                        while (current_h < end_h) or (current_h == end_h and current_m < end_m):
                            blocked_session_slots.append(f"{current_h:02d}:{current_m:02d}")
                            current_m += 15
                            if current_m >= 60:
                                current_m = 0
                                current_h += 1
                    except Exception as e:
                        logger.error(f"Error parsing blocked session times: {e}")

    all_unavailable = list(set(booked_times + reserved_slots + blocked_session_slots))
    return {"booked_slots": all_unavailable}


# ============ Next Available Slot ============

@router.get("/doctors/next-available")
async def get_next_available_slot(doctor: str = "Dr. Vikas Jha"):
    db = get_db()
    from zoneinfo import ZoneInfo

    ist = ZoneInfo("Asia/Kolkata")
    now_ist = datetime.now(ist)

    from routes.doctor_profiles import DOCTOR_PROFILES
    doc_profile = next((d for d in DOCTOR_PROFILES if d["name"] == doctor), None)
    if not doc_profile:
        return {"available": False, "message": "Doctor not found"}

    slot_duration = 15
    sessions = [{"start": "11:00", "end": "14:00"}, {"start": "18:00", "end": "22:00"}]
    available_days = [d.lower() for d in doc_profile.get("available_days", [])]

    doctor_schedule = await get_doctor_schedule_by_name(db, doctor)
    blocked_dates = {b.get("date") for b in (doctor_schedule.get("blocked_dates", []) if doctor_schedule else [])}
    blocked_sessions = doctor_schedule.get("blocked_sessions", []) if doctor_schedule else []

    def generate_slots(session_start, session_end):
        slots = []
        h, m = map(int, session_start.split(":"))
        eh, em = map(int, session_end.split(":"))
        while (h < eh) or (h == eh and m < em):
            slots.append(f"{h:02d}:{m:02d}")
            m += slot_duration
            if m >= 60:
                h += 1
                m -= 60
        return slots

    def is_slot_blocked_by_session(date_str, slot):
        for session in blocked_sessions:
            if session.get("date") != date_str:
                continue
            try:
                s = datetime.strptime(session["start_time"], "%H:%M")
                e = datetime.strptime(session["end_time"], "%H:%M")
                t = datetime.strptime(slot, "%H:%M")
                if s <= t < e:
                    return True
            except (ValueError, KeyError):
                pass
        return False

    for day_offset in range(8):
        check_date = now_ist.date() + timedelta(days=day_offset)
        day_name = check_date.strftime("%A").lower()
        if day_name not in available_days:
            continue

        date_str = check_date.strftime("%Y-%m-%d")
        if date_str in blocked_dates:
            continue

        date_patterns_val = get_date_patterns(date_str)
        booked = await db.appointments.find(
            {"doctor": doctor, "date": {"$in": date_patterns_val},
             "status": {"$in": ["pending", "Booked", "blocked", "In Clinic", "Completed"]}},
            {"_id": 0, "time": 1}
        ).to_list(100)
        booked_times = set(b["time"] for b in booked if b.get("time"))
        booked_times.update(["11:00", "11:15"])

        for session in sessions:
            all_slots = generate_slots(session["start"], session["end"])
            for slot in all_slots:
                if slot in booked_times or is_slot_blocked_by_session(date_str, slot):
                    continue
                if day_offset == 0:
                    slot_h, slot_m = map(int, slot.split(":"))
                    slot_time = now_ist.replace(hour=slot_h, minute=slot_m, second=0, microsecond=0)
                    if slot_time <= now_ist + timedelta(hours=1):
                        continue

                slot_h, slot_m = map(int, slot.split(":"))
                period = "AM" if slot_h < 12 else "PM"
                display_h = slot_h if slot_h <= 12 else slot_h - 12
                if display_h == 0:
                    display_h = 12
                display_time = f"{display_h}:{slot_m:02d} {period}"

                if day_offset == 0:
                    day_label = "Today"
                elif day_offset == 1:
                    day_label = "Tomorrow"
                else:
                    day_label = check_date.strftime("%a, %d %b")

                return {
                    "available": True, "doctor": doctor, "date": date_str,
                    "time": slot, "display_time": display_time, "day_label": day_label,
                    "clinic": doc_profile.get("clinic", ""),
                    "fee": doc_profile.get("consultation_fee", 0)
                }

    return {"available": False, "message": "No slots available in the next 7 days"}


# ============ Guest Appointment Booking ============

@router.post("/appointments/guest")
async def create_guest_appointment(input: GuestAppointmentCreate):
    db = get_db()
    phone = input.patient_phone.strip()
    otp = input.otp.strip()

    # Import guest_otp_storage from auth_routes
    from routes.auth_routes import guest_otp_storage
    stored = guest_otp_storage.get(phone)
    if not stored:
        raise HTTPException(status_code=400, detail="OTP not found. Please request a new one.")
    if stored.get("expires_at") and stored["expires_at"] < datetime.now(timezone.utc):
        guest_otp_storage.pop(phone, None)
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
    if stored["otp"] != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    guest_otp_storage.pop(phone, None)

    try:
        from zoneinfo import ZoneInfo
        appointment_date = datetime.strptime(input.date, "%Y-%m-%d").date()
        time_str = input.time.strip().upper()
        if "AM" in time_str or "PM" in time_str:
            appointment_time = datetime.strptime(time_str, "%I:%M %p").time()
        else:
            appointment_time = datetime.strptime(time_str, "%H:%M").time()
        appointment_datetime = datetime.combine(appointment_date, appointment_time)
        ist = ZoneInfo("Asia/Kolkata")
        now_ist = datetime.now(ist).replace(tzinfo=None)
        if appointment_datetime < now_ist:
            raise HTTPException(status_code=400, detail="Cannot book past appointments.")
        if appointment_datetime < now_ist + timedelta(hours=1):
            raise HTTPException(status_code=400, detail="Must book at least 1 hour in advance.")
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Guest booking date validation: {e}")

    normalized_date = normalize_date_format(input.date)
    date_patterns = get_date_patterns(normalized_date)
    await assert_slot_not_blocked(db, input.doctor, normalized_date, input.time,
                                   source="guest_booking", patient_name=input.patient_name, patient_phone=input.patient_phone)
    existing = await db.appointments.find_one({
        "doctor": input.doctor, "clinic": input.clinic,
        "date": {"$in": date_patterns}, "time": input.time,
        "status": {"$in": ["pending", "Booked", "blocked", "In Clinic", "Completed"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail="This slot is already booked.")

    # 24-hour restriction: one appointment per patient per 24 hours
    from zoneinfo import ZoneInfo
    ist_tz = ZoneInfo("Asia/Kolkata")
    now_ist_g = datetime.now(ist_tz)
    twenty_four_hours_ago_g = (now_ist_g - timedelta(hours=24)).isoformat()
    recent_guest_apt = await db.appointments.find_one({
        "patient_phone": phone,
        "status": {"$in": ["pending", "Booked", "CheckedIn", "WithDoctor", "billing_pending", "In Clinic", "Completed"]},
        "created_at": {"$gte": twenty_four_hours_ago_g}
    }, {"_id": 0, "booking_id": 1, "date": 1, "time": 1})
    if recent_guest_apt:
        raise HTTPException(
            status_code=400,
            detail=f"You already have an appointment (#{recent_guest_apt.get('booking_id', '')}) booked within the last 24 hours on {recent_guest_apt.get('date', '')} at {recent_guest_apt.get('time', '')}. Only one appointment per 24 hours is allowed."
        )

    booking_id = await generate_booking_id(input.clinic, db)
    appointment_id = str(uuid.uuid4())

    doc = {
        "id": appointment_id, "booking_id": booking_id, "user_id": None,
        "doctor": input.doctor, "clinic": input.clinic,
        "date": normalized_date, "time": normalize_time_to_24h(input.time),
        "patient_name": input.patient_name, "patient_phone": phone,
        "patient_email": input.patient_email, "patient_age": input.patient_age,
        "status": "Booked", "created_at": _ist_now().isoformat(),
        "appointment_type": "NORMAL", "booked_by": "guest", "send_email_reminder": True,
        "source": "Website"
    }
    await db.appointments.insert_one(doc)
    doc.pop("_id", None)

    notify_staff_new_appointment = _deps.get("notify_staff_new_appointment")
    if notify_staff_new_appointment:
        try:
            await notify_staff_new_appointment(doc)
        except Exception as e:
            logger.warning(f"Guest booking staff notification failed: {e}")

    try:
        from services.booking_otp import generate_booking_code_record, store_booking_code
        code_record = generate_booking_code_record(booking_id, "diagyn", phone, input.patient_name)
        await store_booking_code(db, code_record)
    except Exception as e:
        logger.warning(f"Guest booking code generation failed: {e}")

    return {
        "success": True, "booking_id": booking_id, "id": appointment_id,
        "doctor": input.doctor, "clinic": input.clinic,
        "date": normalized_date, "time": doc["time"],
        "patient_name": input.patient_name, "status": "Booked"
    }


# ============ Appointment History ============

@router.get("/appointments/by-phone/{phone}")
async def get_appointments_by_phone(phone: str):
    db = get_db()
    appointments = await db.appointments.find(
        {"patient_phone": {"$regex": phone[-10:]}}, {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    return {"appointments": appointments}


@router.get("/appointments/history")
async def get_appointment_history(phone: str):
    db = get_db()
    appointments = await db.appointments.find(
        {"patient_phone": {"$regex": phone[-10:]},
         "status": {"$in": ["Completed", "Cancelled", "NoShow"]}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    return {"appointments": appointments}


# ============ Slot Blocking ============

@router.post("/appointments/block-slots")
async def block_slots(request: SlotBlockRequest):
    db = get_db()
    try:
        block_date = datetime.strptime(request.date, "%Y-%m-%d").date()
        today = datetime.now().date()
        if block_date < today:
            raise HTTPException(status_code=400, detail="Cannot block slots for past dates")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    blocked_count = 0
    already_blocked = []
    slot_manager = _deps.get("slot_manager")

    for slot in request.slots:
        existing = await db.appointments.find_one({
            "doctor": request.doctor, "clinic": request.clinic,
            "date": request.date, "time": slot,
            "status": {"$in": ["pending", "Booked", "blocked", "In Clinic"]}
        })
        if existing:
            already_blocked.append(slot)
            continue

        blocked_appointment = {
            "doctor": request.doctor, "clinic": request.clinic,
            "date": request.date, "time": slot, "status": "blocked",
            "reason": request.reason, "blocked_at": datetime.now().isoformat(),
            "patient_name": "BLOCKED", "patient_phone": "0000000000"
        }
        await db.appointments.insert_one(blocked_appointment)
        blocked_count += 1

        if slot_manager:
            await slot_manager.broadcast_slot_update(
                request.doctor, request.clinic, request.date, slot, "booked"
            )

    return {
        "success": True, "blocked_count": blocked_count,
        "already_blocked": already_blocked,
        "message": f"Blocked {blocked_count} slots" + (f", {len(already_blocked)} already unavailable" if already_blocked else "")
    }


@router.post("/appointments/unblock-slots")
async def unblock_slots(request: SlotBlockRequest):
    db = get_db()
    unblocked_count = 0
    slot_manager = _deps.get("slot_manager")

    for slot in request.slots:
        result = await db.appointments.delete_one({
            "doctor": request.doctor, "clinic": request.clinic,
            "date": request.date, "time": slot, "status": "blocked"
        })
        if result.deleted_count > 0:
            unblocked_count += 1
            if slot_manager:
                await slot_manager.broadcast_slot_update(
                    request.doctor, request.clinic, request.date, slot, "available"
                )

    return {"success": True, "unblocked_count": unblocked_count, "message": f"Unblocked {unblocked_count} slots"}


@router.get("/appointments/blocked-slots")
async def get_blocked_slots(doctor: str, clinic: str, date: str):
    db = get_db()
    blocked = await db.appointments.find(
        {"doctor": doctor, "clinic": clinic, "date": date, "status": "blocked"},
        {"_id": 0, "time": 1, "reason": 1, "blocked_at": 1}
    ).to_list(100)
    return {"blocked_slots": blocked}


# ============ Appointment Feedback ============

@router.post("/feedback/{feedback_token}")
async def submit_appointment_feedback(feedback_token: str, feedback: AppointmentFeedback):
    db = get_db()
    if not 1 <= feedback.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    appointment = await db.appointments.find_one({"feedback_token": feedback_token}, {"_id": 0})
    if not appointment:
        raise HTTPException(status_code=404, detail="Invalid feedback link")
    if appointment.get("feedback_submitted"):
        raise HTTPException(status_code=400, detail="Feedback already submitted for this appointment")

    await db.appointments.update_one(
        {"feedback_token": feedback_token},
        {"$set": {
            "feedback_rating": feedback.rating, "feedback_comment": feedback.comment,
            "feedback_submitted": True,
            "feedback_submitted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    await db.appointment_feedback.insert_one({
        "id": str(uuid.uuid4()), "appointment_id": appointment.get("id"),
        "doctor": appointment.get("doctor"), "clinic": appointment.get("clinic"),
        "rating": feedback.rating, "comment": feedback.comment,
        "patient_name": appointment.get("patient_name"),
        "submitted_at": datetime.now(timezone.utc).isoformat()
    })

    send_email_notification = _deps.get("send_email_notification")
    if send_email_notification:
        admin_html = f"""
        <h2>New Appointment Feedback Received</h2>
        <p><strong>Rating:</strong> {'*' * feedback.rating} ({feedback.rating}/5)</p>
        <p><strong>Doctor:</strong> {appointment.get('doctor')}</p>
        <p><strong>Patient:</strong> {appointment.get('patient_name')}</p>
        {f"<p><strong>Comment:</strong> {feedback.comment}</p>" if feedback.comment else ""}
        """
        await send_email_notification(f"New Feedback: {feedback.rating}/5 Stars - {appointment.get('doctor')}", admin_html)

    return {"success": True, "message": "Thank you for your feedback!", "rating": feedback.rating}


# ============ Booking Limits ============

@router.get("/booking-limits/status")
async def get_booking_limits_status(phone: str = None, user=Depends(get_current_user_optional)):
    db = get_db()
    user_phone = phone
    user_id = None

    if user:
        if hasattr(user, 'phone'):
            user_phone = user_phone or user.phone
            user_id = user.id
        elif isinstance(user, dict):
            user_phone = user_phone or user.get("phone")
            user_id = user.get("id")

    if not user_phone and not user_id:
        return {
            "can_book_appointment": True, "can_book_diagnostic": True,
            "can_book_pharmacy": True, "can_book_teleconsult": True,
            "active_appointments": 0, "active_diagnostic_orders": 0,
            "active_pharmacy_orders": 0, "active_teleconsults": 0
        }

    active_appointment = None
    if user_phone:
        active_appointment = await db.appointments.find_one({
            "patient_phone": user_phone,
            "status": {"$in": ["pending", "Booked", "In Clinic"]},
            "appointment_type": {"$ne": "EMERGENCY"}
        }, {"_id": 0, "date": 1, "time": 1, "doctor": 1})

    active_teleconsult = None
    if user_id:
        active_teleconsult = await db.teleconsult_bookings.find_one({
            "user_id": user_id,
            "status": {"$in": ["pending", "confirmed", "Booked"]}
        }, {"_id": 0, "date": 1, "time": 1, "doctor_name": 1})

    active_diagnostic_count = 0
    if user_phone:
        active_diagnostic_count = await db.diagnostic_orders.count_documents({
            "patient_phone": user_phone,
            "status": {"$in": ["pending", "Pending", "confirmed", "Confirmed", "Processing", "Sample Collected", "sample_collected"]}
        })

    active_pharmacy_count = 0
    if user_phone:
        active_pharmacy_count = await db.pharmacy_orders.count_documents({
            "patient_phone": user_phone,
            "status": {"$in": ["pending", "Pending", "confirmed", "Confirmed", "Processing", "Ready for Pickup", "ready_for_pickup", "Out for Delivery", "out_for_delivery"]}
        })

    return {
        "can_book_appointment": True, "can_book_diagnostic": True,
        "can_book_pharmacy": True, "can_book_teleconsult": True,
        "active_appointments": 1 if active_appointment else 0,
        "active_diagnostic_orders": active_diagnostic_count,
        "active_pharmacy_orders": active_pharmacy_count,
        "active_teleconsults": 1 if active_teleconsult else 0,
        "active_appointment_details": active_appointment,
        "active_teleconsult_details": active_teleconsult
    }


# ============ Get User Appointments ============

@router.get("/appointments", response_model=List[Appointment])
async def get_appointments(user=Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    db = get_db()
    appointments = await db.appointments.find({"user_id": user.id}, {"_id": 0}).to_list(100)
    for appt in appointments:
        if isinstance(appt.get('created_at'), str):
            appt['created_at'] = datetime.fromisoformat(appt['created_at'])
    return appointments



# ==================== DIAGYN APPOINTMENT INVOICE ====================
from fastapi.responses import HTMLResponse

LOGO_DIAGYN = "https://customer-assets.emergentagent.com/job_1fa4546e-4936-4955-8a5d-dab926a22cbb/artifacts/13v9ngkp_5_20260311_124451_0004.png"
LOGO_CURAPAY = "https://customer-assets.emergentagent.com/job_1fa4546e-4936-4955-8a5d-dab926a22cbb/artifacts/bqr5vr04_file_00000000d14471faa6dd7695a521413d.png"

@router.get("/appointments/invoice/{booking_id}", response_class=HTMLResponse)
async def get_appointment_invoice(booking_id: str):
    """Generate printable DiaGyn appointment invoice"""
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    apt = await db.appointments.find_one(
        {"$or": [{"booking_id": booking_id}, {"id": booking_id}]},
        {"_id": 0}
    )
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    name = apt.get("patient_name", "Patient")
    phone = apt.get("patient_phone", apt.get("patient_mobile", ""))
    email = apt.get("patient_email", "")
    doctor = apt.get("doctor", "")
    clinic = apt.get("clinic", "")
    bid = apt.get("booking_id", booking_id)
    status = apt.get("status", "")
    date_raw = apt.get("date", apt.get("appointment_date", ""))
    time_slot = apt.get("time_slot", apt.get("time", apt.get("session", "")))
    amount = apt.get("total_amount", 0)
    fee_code = apt.get("fee_code", "")
    scan_codes = apt.get("scan_codes", [])
    patient_id = apt.get("patient_id", "")

    try:
        if isinstance(date_raw, str) and date_raw:
            dt = datetime.fromisoformat(date_raw.replace("Z", "+00:00"))
            date_str = dt.strftime("%d %b %Y")
        else:
            date_str = str(date_raw)[:10] if date_raw else "N/A"
    except Exception:
        date_str = str(date_raw)[:10] if date_raw else "N/A"

    # Fee breakdown
    fee_rows = ""
    if fee_code:
        fee_rows += f'<div class="row"><span class="label">Consultation ({fee_code})</span><span class="value">Included</span></div>'
    for sc in scan_codes:
        fee_rows += f'<div class="row"><span class="label">Scan: {sc}</span><span class="value">Included</span></div>'

    status_color = '#10b981' if status == 'Completed' else '#f59e0b'
    ILLUST_DIAGYN = "https://customer-assets.emergentagent.com/job_b8139ad6-ce84-4a3a-b3cb-f634d2795bc3/artifacts/ytuf99xa_file_0000000032347208b797968ac0c21724%20%281%29.png"

    # Build Google Calendar URL
    cal_url = ""
    if date_raw and time_slot:
        cal_title = f"Appointment - {doctor}" if doctor else "DiaGyn Appointment"
        cal_url = f"https://calendar.google.com/calendar/render?action=TEMPLATE&text={cal_title}&sf=true"

    # Build clinic short name
    clinic_short = clinic.split(',')[0].strip() if clinic else 'DiaGyn Clinic'

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice — {bid}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800&family=Outfit:wght@600;700;800;900&family=Space+Mono:wght@700&display=swap" rel="stylesheet">
<style>
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ font-family: 'DM Sans', -apple-system, sans-serif; background: linear-gradient(135deg, #7c2d12 0%, #c2410c 25%, #ea580c 50%, #f97316 75%, #fb923c 100%); color: #1e293b; min-height: 100vh; }}
  .wrapper {{ max-width: 420px; margin: 0 auto; padding: 16px 20px 120px; }}
  .no-print-btn {{ display: block; width: fit-content; margin: 0 auto 14px; background: rgba(255,255,255,0.12); color: #fff; border: 1px solid rgba(255,255,255,0.2); padding: 10px 28px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }}
  .no-print-btn:hover {{ background: rgba(255,255,255,0.22); }}

  /* Printer machine */
  .printer-machine {{ position: relative; z-index: 10; margin: 0 4px; }}
  .machine-body {{ background: linear-gradient(180deg, #1a1a2e 0%, #2a2a44 40%, #1a1a2e 100%); border-radius: 20px 20px 0 0; padding: 18px 16px 0; box-shadow: 0 4px 20px rgba(0,0,0,0.4); }}
  .machine-slot {{ background: #0a0a14; border-radius: 6px; height: 8px; margin: 0 8px; box-shadow: inset 0 3px 6px rgba(0,0,0,0.8); }}
  .machine-top {{ display: flex; align-items: center; justify-content: center; gap: 10px; padding-bottom: 12px; }}
  .machine-led {{ width: 6px; height: 6px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 8px #22c55e; }}
  .machine-label {{ color: rgba(255,255,255,0.3); font-size: 8px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; }}

  /* Roller */
  .roller-wrap {{ position: relative; z-index: 10; margin: 0 4px; }}
  .roller {{ background: linear-gradient(180deg, #0a0a1a, #1a1a2e 15%, #4a4a6e 40%, #d0d0e0 48%, #f0f0f8 50%, #d0d0e0 52%, #4a4a6e 60%, #1a1a2e 85%, #0a0a1a); box-shadow: 0 4px 16px rgba(0,0,0,0.5), inset 0 1px 3px rgba(255,255,255,0.1); padding: 10px 0; }}
  .roller-shine {{ height: 2px; margin: 0 12px; border-radius: 4px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent); }}

  /* Paper emerging from roller */
  .paper-wrap {{ position: relative; z-index: 5; margin: 0 8px; margin-top: -3px; }}
  .paper-edge-l {{ position: absolute; left: -3px; top: 0; bottom: 16px; width: 5px; background: linear-gradient(to right, transparent, rgba(0,0,0,0.08)); pointer-events: none; z-index: 6; }}
  .paper-edge-r {{ position: absolute; right: -3px; top: 0; bottom: 16px; width: 5px; background: linear-gradient(to left, transparent, rgba(0,0,0,0.08)); pointer-events: none; z-index: 6; }}

  /* Glassmorphic header */
  .paper-header {{ background: rgba(255,255,255,0.13); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-left: 1px solid rgba(255,255,255,0.18); border-right: 1px solid rgba(255,255,255,0.18); text-align: center; padding: 18px 16px 14px; }}
  .paper-header h1 {{ color: #fff; font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 900; letter-spacing: 0.15em; text-shadow: 0 2px 6px rgba(0,0,0,0.2); }}
  .paper-header .sub {{ color: rgba(255,255,255,0.7); font-size: 11px; font-weight: 600; letter-spacing: 0.1em; }}

  /* Receipt */
  .receipt {{ background: rgba(255,255,255,0.9); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); padding: 22px 20px 16px; border-left: 1px solid rgba(255,255,255,0.35); border-right: 1px solid rgba(255,255,255,0.35); }}
  .receipt-foot {{ background: rgba(255,255,255,0.9); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); padding: 0 20px 20px; border-left: 1px solid rgba(255,255,255,0.35); border-right: 1px solid rgba(255,255,255,0.35); }}

  /* Zigzag bottom */
  .zigzag-bottom {{ height: 16px; overflow: hidden; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1)); }}
  .zigzag-bottom svg {{ display: block; width: 100%; height: 16px; }}

  /* Check circle */
  .check-circle {{ width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #f97316, #ea580c); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; box-shadow: 0 6px 20px rgba(249,115,22,0.4); }}
  .check-circle svg {{ width: 28px; height: 28px; fill: none; stroke: #fff; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }}

  .inv-title {{ font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 900; color: #111827; text-align: center; }}
  .inv-sub {{ color: #9ca3af; font-size: 13px; text-align: center; margin-top: 3px; }}
  .status-badge {{ display: inline-block; background: {status_color}; color: #fff; font-size: 10px; font-weight: 800; padding: 3px 14px; border-radius: 20px; letter-spacing: 1.5px; }}

  .sep {{ height: 1px; background: #e5e7eb; margin: 14px 0; }}
  .sep-dashed {{ border-top: 1px dashed #d1d5db; margin: 16px 0; }}

  .detail-header {{ display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; color: #d1d5db; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px; }}
  .detail-row {{ display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }}
  .detail-row:last-child {{ border-bottom: none; }}
  .detail-row .dl {{ color: #9ca3af; font-size: 13px; }}
  .detail-row .dv {{ color: #111827; font-size: 13px; font-weight: 700; text-align: right; max-width: 60%; font-family: 'DM Sans', sans-serif; }}

  .total-box {{ background: #fafafa; border-radius: 12px; padding: 12px 16px; margin: 14px 0; }}
  .total-row {{ display: flex; justify-content: space-between; align-items: center; font-size: 13px; }}
  .total-row .tl {{ color: #6b7280; }}
  .total-row .tv {{ color: #374151; }}
  .total-grand {{ border-top: 1px dashed #d1d5db; margin-top: 8px; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; }}
  .total-grand .tl {{ font-weight: 800; color: #111827; font-size: 13px; }}
  .total-grand .tv {{ font-weight: 900; color: #ea580c; font-size: 20px; font-family: 'Space Mono', monospace; }}

  /* Doctor card */
  .dr-card {{ display: flex; align-items: center; gap: 12px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 14px; padding: 12px 14px; margin: 14px 0; }}
  .dr-icon {{ width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #f97316, #ea580c); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 3px 10px rgba(249,115,22,0.3); }}
  .dr-icon svg {{ width: 20px; height: 20px; fill: none; stroke: #fff; stroke-width: 2; }}
  .dr-name {{ font-size: 14px; font-weight: 800; color: #1f2937; }}
  .dr-clinic {{ font-size: 11px; color: #ea580c; font-weight: 600; }}

  /* Booking ID */
  .bid-section {{ text-align: center; margin: 4px 0; }}
  .bid-label {{ color: #9ca3af; font-size: 13px; }}
  .bid-value {{ color: #c2410c; font-size: 22px; font-weight: 900; letter-spacing: 3px; font-family: 'Space Mono', monospace; }}
  .timestamp {{ text-align: center; color: #9ca3af; font-size: 11px; margin-top: 4px; }}

  /* Instruction */
  .instr-box {{ border: 2px dashed rgba(234,88,12,0.25); background: rgba(249,115,22,0.04); border-radius: 12px; padding: 10px; text-align: center; margin: 14px 0 4px; }}
  .instr-box p {{ color: #c2410c; font-size: 12px; font-weight: 700; }}

  /* Action buttons */
  .action-btn {{ display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 13px; border-radius: 14px; font-size: 13px; font-weight: 700; cursor: pointer; border: 2px solid #e5e7eb; background: #fff; color: #374151; transition: all 0.15s; margin-top: 8px; text-decoration: none; }}
  .action-btn:hover {{ border-color: #f97316; background: #fff7ed; }}
  .action-btn svg {{ width: 18px; height: 18px; flex-shrink: 0; }}

  /* Footer */
  .footer {{ text-align: center; margin-top: 10px; }}
  .powered {{ display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px; }}
  .powered img {{ height: 26px; border-radius: 5px; }}
  .powered span {{ font-size: 9px; color: #94a3b8; }}
  .powered strong {{ font-size: 11px; color: #ea580c; font-weight: 700; }}
  .footer-text {{ font-size: 9px; color: #94a3b8; line-height: 1.6; }}

  /* ---- Sections outside receipt ---- */

  /* What Next card */
  .what-next {{ margin: 20px 0 0; border-radius: 20px; overflow: hidden; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); }}
  .what-next-header {{ padding: 12px 16px; display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.1); }}
  .what-next-header .wn-icon {{ width: 28px; height: 28px; border-radius: 50%; background: #f97316; display: flex; align-items: center; justify-content: center; }}
  .what-next-header .wn-icon svg {{ width: 14px; height: 14px; fill: none; stroke: #fff; stroke-width: 3; }}
  .what-next-header h3 {{ font-size: 14px; font-weight: 800; color: #fff; }}
  .what-next-body {{ padding: 16px; }}
  .wn-step {{ display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }}
  .wn-step:last-child {{ margin-bottom: 0; }}
  .wn-num {{ width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; flex-shrink: 0; }}
  .wn-num.done {{ background: #f97316; color: #fff; }}
  .wn-num.pending {{ background: rgba(249,115,22,0.12); color: rgba(255,255,255,0.45); border: 1px solid rgba(249,115,22,0.2); }}
  .wn-text {{ font-size: 13px; line-height: 1.5; padding-top: 3px; }}
  .wn-text.done {{ color: rgba(255,255,255,0.85); font-weight: 600; }}
  .wn-text.pending {{ color: rgba(255,255,255,0.4); }}

  /* Email section */
  .email-section {{ margin: 16px 0 0; }}
  .email-toggle {{ display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 14px 16px; border-radius: 18px; cursor: pointer; border: 1px solid rgba(249,115,22,0.2); background: rgba(249,115,22,0.06); transition: all 0.15s; }}
  .email-toggle:hover {{ background: rgba(249,115,22,0.12); }}
  .email-toggle .et-left {{ display: flex; align-items: center; gap: 12px; }}
  .email-toggle .et-icon {{ width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: rgba(249,115,22,0.15); }}
  .email-toggle .et-icon svg {{ width: 16px; height: 16px; fill: none; stroke: #f97316; stroke-width: 2; }}
  .email-toggle .et-icon.active {{ background: #f97316; }}
  .email-toggle .et-icon.active svg {{ stroke: #fff; }}
  .email-toggle .et-title {{ font-size: 13px; font-weight: 700; color: #fff; }}
  .email-toggle .et-sub {{ font-size: 10px; color: rgba(255,255,255,0.4); }}
  .email-toggle .et-eye {{ width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.06); }}
  .email-toggle .et-eye svg {{ width: 14px; height: 14px; fill: none; stroke: rgba(255,255,255,0.4); stroke-width: 2; }}

  .email-content {{ display: none; margin-top: 12px; }}
  .email-content.show {{ display: block; }}

  /* Send email form */
  .send-form {{ border-radius: 18px; overflow: hidden; background: rgba(249,115,22,0.08); border: 1px solid rgba(249,115,22,0.25); padding: 14px 16px; margin-bottom: 12px; }}
  .send-form .sf-header {{ display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }}
  .send-form .sf-icon {{ width: 24px; height: 24px; border-radius: 8px; background: #f97316; display: flex; align-items: center; justify-content: center; }}
  .send-form .sf-icon svg {{ width: 12px; height: 12px; fill: none; stroke: #fff; stroke-width: 2; }}
  .send-form .sf-label {{ font-size: 11px; font-weight: 700; color: #fdba74; }}
  .send-form .sf-row {{ display: flex; gap: 8px; }}
  .send-form input {{ flex: 1; padding: 10px 14px; border-radius: 12px; font-size: 13px; background: rgba(255,255,255,0.08); border: 1px solid rgba(249,115,22,0.2); color: #fff; outline: none; font-family: 'DM Sans', sans-serif; }}
  .send-form input::placeholder {{ color: rgba(255,255,255,0.3); }}
  .send-form input:focus {{ border-color: rgba(249,115,22,0.5); }}
  .send-form .send-btn {{ padding: 10px 20px; border-radius: 12px; font-size: 12px; font-weight: 700; border: none; cursor: pointer; color: #fff; background: linear-gradient(135deg, #f97316, #ea580c); transition: all 0.15s; }}
  .send-form .send-btn:hover {{ filter: brightness(1.1); }}
  .send-form .send-btn:disabled {{ opacity: 0.6; cursor: not-allowed; }}
  .send-form .send-btn.sent {{ background: rgba(16,185,129,0.2); color: #34d399; }}

  /* Email preview card */
  .email-preview {{ border-radius: 20px; overflow: hidden; background: #fff; border: 1px solid #e2e8f0; box-shadow: 0 2px 12px rgba(0,0,0,0.08); transform: scale(0.95); transform-origin: top center; }}
  .email-preview img {{ width: 100%; display: block; }}
  .email-preview .ep-body {{ padding: 12px 18px 4px; }}
  .email-preview .ep-hi {{ color: #1e293b; font-size: 13px; font-weight: 700; margin-bottom: 3px; }}
  .email-preview .ep-msg {{ color: #64748b; font-size: 11px; line-height: 1.5; }}
  .ep-bid {{ margin: 10px 14px; border-radius: 14px; background: #f0fdfa; border: 1px solid #b2dfdb; padding: 14px; text-align: center; }}
  .ep-bid .ep-bid-label {{ color: #94a3b8; font-size: 9px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; margin-bottom: 2px; }}
  .ep-bid .ep-bid-val {{ color: #0d9488; font-size: 22px; font-weight: 800; letter-spacing: 3px; font-family: 'Space Mono', monospace; }}
  .ep-table {{ margin: 0 14px 10px; border-radius: 16px; background: #e0f7f4; border: 1px solid #b2dfdb; overflow: hidden; }}
  .ep-row {{ display: flex; border-bottom: 1px solid rgba(0,0,0,0.06); }}
  .ep-row:last-child {{ border-bottom: none; }}
  .ep-row .ep-rl {{ padding: 10px 16px; color: #64748b; font-size: 11px; font-weight: 600; width: 35%; }}
  .ep-row .ep-rv {{ padding: 10px 16px; color: #1e293b; font-size: 12px; font-weight: 500; }}
  .ep-row .ep-rv.hl {{ color: #0d9488; font-weight: 700; }}
  .ep-curapay {{ text-align: center; padding: 6px 14px 4px; }}
  .ep-curapay-inner {{ display: inline-flex; align-items: center; gap: 8px; background: #f0fdfa; border: 1px solid #b2dfdb; border-radius: 12px; padding: 6px 16px; }}
  .ep-curapay-inner img {{ height: 20px; border-radius: 4px; }}
  .ep-curapay-inner span {{ font-size: 9px; color: #94a3b8; }}
  .ep-curapay-inner strong {{ font-size: 11px; color: #0d9488; font-weight: 700; }}
  .ep-foot {{ padding: 10px 14px 14px; text-align: center; background: #f0fdfa; border-top: 1px solid #b2dfdb; margin-top: 8px; }}
  .ep-foot .ep-help {{ color: #0d9488; font-size: 10px; font-weight: 600; margin-bottom: 2px; }}
  .ep-foot .ep-co {{ color: #94a3b8; font-size: 8px; }}

  @media print {{
    body {{ background: linear-gradient(135deg, #7c2d12, #c2410c, #ea580c, #f97316); -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
    .no-print, .no-print-btn {{ display: none !important; }}
    .wrapper {{ padding-top: 8px; padding-bottom: 8px; }}
  }}
</style>
</head>
<body>
<div class="wrapper">
  <div class="no-print"><button class="no-print-btn" onclick="window.print()">Download / Print Invoice</button></div>

  <!-- Printer Machine -->
  <div class="printer-machine">
    <div class="machine-body">
      <div class="machine-top">
        <div class="machine-led"></div>
        <span class="machine-label">Thermal Printer</span>
        <div class="machine-led"></div>
      </div>
      <div class="machine-slot"></div>
    </div>
  </div>

  <!-- Roller -->
  <div class="roller-wrap"><div class="roller"><div class="roller-shine"></div></div></div>

  <!-- Paper -->
  <div class="paper-wrap">
    <div class="paper-edge-l"></div>
    <div class="paper-edge-r"></div>

    <!-- Glassmorphic Header -->
    <div class="paper-header">
      <img src="{LOGO_DIAGYN}" alt="DiaGyn" style="height:32px;margin-bottom:8px;" />
      <h1>DIAGYN</h1>
      <p class="sub">Nevika Cura</p>
    </div>

    <!-- Receipt Body -->
    <div class="receipt">
      <div class="check-circle"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg></div>
      <p class="inv-title">Invoice</p>
      <p class="inv-sub">Appointment Receipt</p>
      <div style="text-align:center;margin-top:8px;"><span class="status-badge">{status.upper()}</span></div>

      <div class="sep"></div>

      <div class="detail-header"><span>Invoice Details</span><span>INV-{bid[-6:] if len(str(bid)) > 6 else bid}</span></div>
      <div class="detail-row"><span class="dl">Booking ID</span><span class="dv">{bid}</span></div>
      <div class="detail-row"><span class="dl">Date</span><span class="dv">{date_str}</span></div>
      {f'<div class="detail-row"><span class="dl">Time Slot</span><span class="dv">{time_slot}</span></div>' if time_slot else ''}
      <div class="detail-row"><span class="dl">Patient</span><span class="dv">{name}</span></div>
      {f'<div class="detail-row"><span class="dl">Patient ID</span><span class="dv">{patient_id}</span></div>' if patient_id else ''}
      {f'<div class="detail-row"><span class="dl">Phone</span><span class="dv">{phone}</span></div>' if phone else ''}
      {f'<div class="detail-row"><span class="dl">Email</span><span class="dv">{email}</span></div>' if email else ''}

      <div class="dr-card">
        <div class="dr-icon"><svg viewBox="0 0 24 24"><path d="M12 2a5 5 0 015 5v2a5 5 0 01-10 0V7a5 5 0 015-5z"/><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="9" y1="17" x2="15" y2="17"/></svg></div>
        <div><p class="dr-name">{doctor}</p><p class="dr-clinic">{clinic_short}</p></div>
      </div>

      {fee_rows}

      {f'''<div class="total-box">
        <div class="total-row"><span class="tl">Consultation Fee</span><span class="tv">&#8377;{amount}</span></div>
        <div class="total-grand"><span class="tl">Total</span><span class="tv">&#8377;{amount}</span></div>
      </div>''' if amount else ''}

      <div class="sep-dashed"></div>

      <div class="bid-section">
        <span class="bid-label">Booking ID: </span>
        <span class="bid-value">#{bid}</span>
      </div>
      <p class="timestamp">Nevika Cura Healthcare Pvt. Ltd.</p>

      <div class="instr-box"><p>Please show your Booking ID at the clinic reception</p></div>

      <!-- Add to Google Calendar -->
      <a href="{cal_url}" target="_blank" class="action-btn no-print" style="text-decoration:none;">
        <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>
        <span>Add to Google Calendar</span>
      </a>

      <!-- WhatsApp Share -->
      <a href="https://wa.me/?text={('My appointment at ' + clinic_short + '! Doctor: ' + doctor + ', Date: ' + date_str + ', Booking: %23' + str(bid)).replace(' ', '%20')}" target="_blank" class="action-btn no-print" style="background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;border-color:transparent;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
        <span>Share on WhatsApp</span>
      </a>
    </div>

    <!-- Footer -->
    <div class="receipt-foot">
      <div class="footer">
        <div class="powered"><img src="{LOGO_CURAPAY}" alt="CuraPay" /><div><span>Powered by</span><br/><strong>CuraPay</strong></div></div>
        <p class="footer-text">This is a computer-generated invoice.<br/>nevikacura.com</p>
      </div>
    </div>

    <!-- Zigzag Torn Bottom -->
    <div class="zigzag-bottom">
      <svg preserveAspectRatio="none" viewBox="0 0 400 16">
        <path d="M0,0 L8,16 L16,0 L24,16 L32,0 L40,16 L48,0 L56,16 L64,0 L72,16 L80,0 L88,16 L96,0 L104,16 L112,0 L120,16 L128,0 L136,16 L144,0 L152,16 L160,0 L168,16 L176,0 L184,16 L192,0 L200,16 L208,0 L216,16 L224,0 L232,16 L240,0 L248,16 L256,0 L264,16 L272,0 L280,16 L288,0 L296,16 L304,0 L312,16 L320,0 L328,16 L336,0 L344,16 L352,0 L360,16 L368,0 L376,16 L384,0 L392,16 L400,0" fill="rgba(255,255,255,0.9)" />
      </svg>
    </div>
  </div>

  <!-- What Happens Next -->
  <div class="what-next no-print">
    <div class="what-next-header">
      <div class="wn-icon"><svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></div>
      <h3>What Happens Next</h3>
    </div>
    <div class="what-next-body">
      <div class="wn-step"><div class="wn-num done"><svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:#fff;stroke-width:3;"><path d="M20 6L9 17l-5-5"/></svg></div><p class="wn-text done">WhatsApp confirmation sent to your number</p></div>
      <div class="wn-step"><div class="wn-num pending">2</div><p class="wn-text pending">Fill the Pre-Consultation Form to save time</p></div>
      <div class="wn-step"><div class="wn-num pending">3</div><p class="wn-text pending">Visit the clinic at your scheduled time</p></div>
      <div class="wn-step"><div class="wn-num pending">4</div><p class="wn-text pending">Show your Booking ID at the reception</p></div>
    </div>
  </div>

  <!-- Email Section -->
  <div class="email-section no-print">
    <button class="email-toggle" onclick="document.getElementById('emailContent').classList.toggle('show');this.querySelector('.et-icon').classList.toggle('active');">
      <div class="et-left">
        <div class="et-icon">
          <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        </div>
        <div>
          <p class="et-title">Email Confirmation Preview</p>
          <p class="et-sub">See the email you'll receive</p>
        </div>
      </div>
      <div class="et-eye"><svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></div>
    </button>

    <div id="emailContent" class="email-content">
      <!-- Send on Email Form -->
      <div class="send-form">
        <div class="sf-header">
          <div class="sf-icon"><svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>
          <span class="sf-label">Get this confirmation on your email</span>
        </div>
        <div class="sf-row">
          <input type="email" id="emailInput" placeholder="Enter your email" value="{email}" />
          <button class="send-btn" id="sendBtn" onclick="sendEmail()">Send</button>
        </div>
      </div>

      <!-- Email Preview Card -->
      <div class="email-preview">
        <img src="{ILLUST_DIAGYN}" alt="DiaGyn" />
        <div class="ep-body">
          <p class="ep-hi">Hi {name},</p>
          <p class="ep-msg">Your appointment has been confirmed. Please arrive 10 minutes before your scheduled time.</p>
        </div>
        <div class="ep-bid">
          <p class="ep-bid-label">BOOKING ID</p>
          <p class="ep-bid-val">{bid}</p>
        </div>
        <div class="ep-table">
          <div class="ep-row"><span class="ep-rl">Doctor</span><span class="ep-rv hl">{doctor}</span></div>
          <div class="ep-row"><span class="ep-rl">Clinic</span><span class="ep-rv">{clinic_short}</span></div>
          <div class="ep-row"><span class="ep-rl">Date</span><span class="ep-rv">{date_str}</span></div>
          {f'<div class="ep-row"><span class="ep-rl">Time Slot</span><span class="ep-rv">{time_slot}</span></div>' if time_slot else ''}
          {f'<div class="ep-row"><span class="ep-rl">Amount</span><span class="ep-rv hl">Rs. {amount}</span></div>' if amount else ''}
        </div>
        {f'''<div class="ep-curapay"><div class="ep-curapay-inner"><img src="{LOGO_CURAPAY}" alt="CuraPay" /><span>Powered by <strong>CuraPay</strong></span></div></div>''' if amount else ''}
        <div class="ep-foot">
          <p class="ep-help">Helpline: 9403890429 | nevikacura.com</p>
          <p class="ep-co">Nevika Cura Healthcare Pvt Ltd</p>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
async function sendEmail() {{
  const emailEl = document.getElementById('emailInput');
  const btn = document.getElementById('sendBtn');
  const email = emailEl.value.trim();
  if (!email || !email.includes('@')) {{ alert('Enter a valid email'); return; }}
  btn.disabled = true;
  btn.textContent = 'Sending...';
  try {{
    const resp = await fetch('/api/send-booking-email', {{
      method: 'POST',
      headers: {{'Content-Type': 'application/json'}},
      body: JSON.stringify({{
        email: email,
        booking_id: '{bid}',
        type: 'diagyn',
        patient_name: '{name}',
        doctor_name: '{doctor}',
        clinic_name: '{clinic_short}',
        appointment_date: '{date_str}',
        time_slot: '{time_slot}',
        amount: '{amount}'
      }})
    }});
    if (resp.ok) {{
      btn.textContent = 'Sent!';
      btn.className = 'send-btn sent';
    }} else {{
      btn.textContent = 'Failed';
      setTimeout(() => {{ btn.textContent = 'Send'; btn.disabled = false; }}, 2000);
    }}
  }} catch(e) {{
    btn.textContent = 'Error';
    setTimeout(() => {{ btn.textContent = 'Send'; btn.disabled = false; }}, 2000);
  }}
}}
</script>
</body>
</html>"""
    return HTMLResponse(content=html)



# ============ Patient Appointment Management ============

class PatientCancelRequest(BaseModel):
    reason: str = ""
    patient_phone: str

class PatientRescheduleRequest(BaseModel):
    patient_phone: str
    new_date: str
    new_time: str


@router.post("/appointments/{appointment_id}/patient-cancel")
async def patient_cancel_appointment(appointment_id: str, data: PatientCancelRequest):
    """Patient-initiated appointment cancellation. Enforces 1-hour cutoff."""
    db = get_db()

    appointment = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not appointment:
        # Try booking_id
        appointment = await db.appointments.find_one({"booking_id": appointment_id}, {"_id": 0})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Verify patient owns this appointment
    clean_phone = data.patient_phone.strip().replace("+91", "").replace(" ", "")[-10:]
    apt_phone = (appointment.get("patient_phone") or "").strip().replace("+91", "").replace(" ", "")[-10:]
    if clean_phone != apt_phone:
        raise HTTPException(status_code=403, detail="You can only cancel your own appointments")

    # Check status — only Booked/pending can be cancelled
    if appointment.get("status") not in ["Booked", "pending"]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel appointment with status '{appointment.get('status')}'")

    # 1-hour cutoff: cannot cancel if appointment is within 1 hour
    from zoneinfo import ZoneInfo
    ist = ZoneInfo("Asia/Kolkata")
    now_ist = datetime.now(ist).replace(tzinfo=None)

    try:
        apt_date = datetime.strptime(appointment["date"], "%Y-%m-%d").date()
        time_str = appointment["time"].strip().upper()
        if "AM" in time_str or "PM" in time_str:
            apt_time = datetime.strptime(time_str, "%I:%M %p").time()
        else:
            apt_time = datetime.strptime(time_str, "%H:%M").time()
        apt_datetime = datetime.combine(apt_date, apt_time)

        if apt_datetime <= now_ist + timedelta(hours=1):
            raise HTTPException(
                status_code=400,
                detail="Cannot cancel within 1 hour of the appointment time. Please contact the clinic directly."
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Could not parse appointment datetime for cutoff check: {e}")

    # Cancel the appointment — frees the slot
    update = {
        "status": "Cancelled",
        "cancelled_at": datetime.now(timezone.utc).isoformat(),
        "cancelled_by": "patient",
        "cancellation_reason": data.reason or "Cancelled by patient",
    }
    await db.appointments.update_one(
        {"id": appointment.get("id")},
        {"$set": update}
    )

    # Send WhatsApp cancellation notifications (non-blocking)
    try:
        from services.msg91_whatsapp import send_order_cancelled, send_msg91_whatsapp
        patient_name = appointment.get("patient_name", "Patient")
        booking_id = appointment.get("booking_id", appointment.get("id", ""))
        patient_phone = appointment.get("patient_phone", "")
        doctor_name = appointment.get("doctor", "Doctor")
        apt_date = appointment.get("date", "")
        apt_time = appointment.get("time", "")

        # 1) Notify the patient
        if patient_phone:
            try:
                await send_order_cancelled(
                    phone=patient_phone,
                    patient_name=patient_name,
                    service_name="DiaGyn",
                    order_id=booking_id,
                    db=db
                )
                logger.info(f"Cancellation WhatsApp sent to patient {patient_phone}")
            except Exception as e:
                logger.warning(f"Failed to send cancellation WhatsApp to patient: {e}")

        # 2) Notify staff at 8108500522
        STAFF_PHONE = "8108500522"
        try:
            staff_msg_vars = [
                f"Staff",
                "DiaGyn",
                f"{booking_id} | {patient_name} | {doctor_name} | {apt_date} {apt_time} | Cancelled by patient"
            ]
            await send_msg91_whatsapp(
                recipient_phone=STAFF_PHONE,
                template_name="order_cancelled",
                variables=staff_msg_vars,
                db=db,
                reference_id=f"staff_cancel_{booking_id}",
                message_type="staff_cancellation_alert"
            )
            logger.info(f"Cancellation WhatsApp sent to staff {STAFF_PHONE}")
        except Exception as e:
            logger.warning(f"Failed to send cancellation WhatsApp to staff: {e}")
    except ImportError:
        logger.warning("MSG91 WhatsApp not available for cancellation notifications")

    return {
        "success": True,
        "message": "Appointment cancelled successfully. The slot is now available for others.",
        "appointment_id": appointment.get("id"),
        "booking_id": appointment.get("booking_id"),
    }


@router.post("/appointments/{appointment_id}/reschedule")
async def patient_reschedule_appointment(appointment_id: str, data: PatientRescheduleRequest):
    """Patient-initiated appointment reschedule. Frees old slot, books new one."""
    db = get_db()

    appointment = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not appointment:
        appointment = await db.appointments.find_one({"booking_id": appointment_id}, {"_id": 0})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Verify patient
    clean_phone = data.patient_phone.strip().replace("+91", "").replace(" ", "")[-10:]
    apt_phone = (appointment.get("patient_phone") or "").strip().replace("+91", "").replace(" ", "")[-10:]
    if clean_phone != apt_phone:
        raise HTTPException(status_code=403, detail="You can only reschedule your own appointments")

    if appointment.get("status") not in ["Booked", "pending"]:
        raise HTTPException(status_code=400, detail=f"Cannot reschedule appointment with status '{appointment.get('status')}'")

    # Validate new date/time
    from zoneinfo import ZoneInfo
    ist = ZoneInfo("Asia/Kolkata")
    now_ist = datetime.now(ist).replace(tzinfo=None)

    normalized_new_date = normalize_date_format(data.new_date)
    normalized_new_time = normalize_time_to_24h(data.new_time) if data.new_time else data.new_time

    try:
        new_apt_date = datetime.strptime(normalized_new_date, "%Y-%m-%d").date()
        time_str = normalized_new_time.strip()
        new_apt_time = datetime.strptime(time_str, "%H:%M").time()
        new_apt_datetime = datetime.combine(new_apt_date, new_apt_time)

        if new_apt_datetime < now_ist + timedelta(hours=1):
            raise HTTPException(status_code=400, detail="New appointment must be at least 1 hour from now")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid date/time format: {e}")

    # Check new slot availability
    date_patterns = get_date_patterns(normalized_new_date)
    await assert_slot_not_blocked(db, appointment["doctor"], normalized_new_date, normalized_new_time,
                                   source="reschedule", patient_name=appointment.get("patient_name"), patient_phone=appointment.get("patient_phone"))
    existing = await db.appointments.find_one({
        "doctor": appointment["doctor"],
        "clinic": appointment["clinic"],
        "date": {"$in": date_patterns},
        "time": normalized_new_time,
        "status": {"$in": ["pending", "Booked", "CheckedIn", "WithDoctor", "Completed"]}
    })
    if existing:
        raise HTTPException(status_code=409, detail="The selected slot is already booked. Please pick another.")

    # Update the appointment with new date/time (frees old slot, takes new one)
    update = {
        "date": normalized_new_date,
        "time": normalized_new_time,
        "rescheduled_at": datetime.now(timezone.utc).isoformat(),
        "rescheduled_by": "patient",
        "previous_date": appointment.get("date"),
        "previous_time": appointment.get("time"),
    }
    await db.appointments.update_one(
        {"id": appointment.get("id")},
        {"$set": update}
    )

    return {
        "success": True,
        "message": f"Appointment rescheduled to {normalized_new_date} at {normalized_new_time}",
        "appointment_id": appointment.get("id"),
        "booking_id": appointment.get("booking_id"),
        "new_date": normalized_new_date,
        "new_time": normalized_new_time,
    }


@router.get("/appointments/patient-active")
async def get_patient_active_appointments(phone: str):
    """Get all active/future appointments for a patient, plus recent completed ones."""
    db = get_db()
    clean_phone = phone.strip().replace("+91", "").replace(" ", "")[-10:]
    if not clean_phone or len(clean_phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")

    from zoneinfo import ZoneInfo
    ist = ZoneInfo("Asia/Kolkata")
    now_ist = datetime.now(ist)
    today_str = now_ist.strftime("%Y-%m-%d")

    # Active appointments (Booked, CheckedIn, WithDoctor)
    active = await db.appointments.find(
        {
            "patient_phone": {"$regex": clean_phone},
            "status": {"$in": ["Booked", "pending", "CheckedIn", "WithDoctor"]},
        },
        {"_id": 0}
    ).sort("date", 1).to_list(20)

    # Recently completed (last 7 days)
    seven_days_ago = (now_ist - timedelta(days=7)).isoformat()
    completed = await db.appointments.find(
        {
            "patient_phone": {"$regex": clean_phone},
            "status": "Completed",
            "completed_at": {"$gte": seven_days_ago},
        },
        {"_id": 0}
    ).sort("completed_at", -1).to_list(10)

    # Cancelled (last 7 days)
    cancelled = await db.appointments.find(
        {
            "patient_phone": {"$regex": clean_phone},
            "status": "Cancelled",
            "cancelled_at": {"$gte": seven_days_ago},
        },
        {"_id": 0}
    ).sort("cancelled_at", -1).to_list(10)

    # Add cancellation eligibility flag to active appointments
    for apt in active:
        try:
            apt_date = datetime.strptime(apt["date"], "%Y-%m-%d").date()
            time_str = apt["time"].strip().upper()
            if "AM" in time_str or "PM" in time_str:
                apt_time = datetime.strptime(time_str, "%I:%M %p").time()
            else:
                apt_time = datetime.strptime(time_str, "%H:%M").time()
            apt_datetime = datetime.combine(apt_date, apt_time)
            apt["can_cancel"] = apt_datetime > now_ist.replace(tzinfo=None) + timedelta(hours=1)
            apt["can_reschedule"] = apt.get("status") in ["Booked", "pending"] and apt["can_cancel"]
        except Exception:
            apt["can_cancel"] = False
            apt["can_reschedule"] = False

    return {
        "active": active,
        "completed": completed,
        "cancelled": cancelled,
        "today": today_str,
        "total_active": len(active),
    }



@router.get("/appointments/prescription-history")
async def get_prescription_history(phone: str):
    """Get prescriptions and past completed visits for reorder functionality."""
    db = get_db()
    clean_phone = phone.strip().replace("+91", "").replace(" ", "")[-10:]
    if not clean_phone or len(clean_phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")

    # Get completed appointments that may have prescriptions
    completed = await db.appointments.find(
        {
            "patient_phone": {"$regex": clean_phone},
            "status": "Completed",
        },
        {"_id": 0}
    ).sort("completed_at", -1).to_list(20)

    # Get uploaded prescriptions
    prescriptions = await db.eprescriptions.find(
        {"patient_phone": {"$regex": clean_phone}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(10)

    # Get past express-rx flows
    rx_flows = await db.express_rx_flows.find(
        {"phone": {"$regex": clean_phone}, "status": "completed"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(10)

    return {
        "completed_visits": completed,
        "prescriptions": prescriptions,
        "rx_flows": rx_flows,
    }
