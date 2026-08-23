"""
DiaGyn Staff Portal — Appointment CRUD and status management.
"""

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid
import logging

from . import shared
from .auth import verify_staff
from .models import AppointmentBook, AppointmentStatusUpdate
from .utils import (
    normalize_time_to_24h,
    get_ist_date,
    get_ist_datetime,
    get_slots_for_doctor_clinic_date,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/appointments/book")
async def book_appointment(data: AppointmentBook, staff=Depends(verify_staff)):
    if data.clinic not in shared.CLINICS:
        raise HTTPException(status_code=400, detail=f"Invalid clinic: {data.clinic}")

    # 24-hour duplicate check — by mobile OR by full name (skip for EMERGENCY)
    if data.appointment_type != "EMERGENCY":
        mobile = data.patient_mobile.strip().replace(" ", "")
        name_normalized = data.patient_name.strip().lower()

        duplicate = await shared.db.appointments.find_one(
            {
                "date": data.date,
                "status": {"$nin": ["Cancelled", "No Show", "NoShow"]},
                "$or": [
                    {"patient_phone": mobile},
                    {"patient_phone": f"+91{mobile}"},
                    {"patient_phone": f"91{mobile}"},
                ],
            },
            {"_id": 0, "booking_id": 1, "doctor": 1, "patient_name": 1, "time": 1},
        )

        if not duplicate:
            import re
            name_regex = re.escape(name_normalized)
            duplicate = await shared.db.appointments.find_one(
                {
                    "date": data.date,
                    "status": {"$nin": ["Cancelled", "No Show", "NoShow"]},
                    "patient_name": {"$regex": f"^{name_regex}$", "$options": "i"},
                },
                {"_id": 0, "booking_id": 1, "doctor": 1, "patient_name": 1, "time": 1},
            )

        if duplicate:
            existing_id = duplicate.get("booking_id", "")
            existing_doc = duplicate.get("doctor", "")
            raise HTTPException(
                status_code=409,
                detail=f"Patient already has an appointment today (#{existing_id} with {existing_doc}). Only 1 booking per 24 hours allowed.",
            )

    if data.appointment_type != "EMERGENCY" and data.time:
        norm_time = normalize_time_to_24h(data.time, for_sorting=False)
        existing = await shared.db.appointments.find_one(
            {
                "clinic": data.clinic,
                "doctor": data.doctor,
                "date": data.date,
                "$or": [{"time": norm_time}, {"time_slot": norm_time}, {"slot": norm_time}],
                "status": {"$nin": ["Cancelled", "No Show", "NoShow"]},
            }
        )
        if existing:
            raise HTTPException(status_code=409, detail="This slot is already booked")

    from utils.booking_utils import generate_booking_id as gen_id
    source = "clinic" if data.appointment_type in ("WALK_IN", "EMERGENCY") else "web"
    booking_id = await gen_id(service="diagyn", source=source, db_instance=shared.db)

    normalized_time = (
        normalize_time_to_24h(data.time, for_sorting=False)
        if data.time and data.appointment_type not in ("EMERGENCY",)
        else None
    )

    appointment = {
        "id": str(uuid.uuid4()),
        "booking_id": booking_id,
        "clinic": data.clinic,
        "doctor": data.doctor,
        "date": data.date,
        "time": normalized_time,
        "patient_name": data.patient_name.strip(),
        "patient_phone": data.patient_mobile.strip(),
        "patient_id": data.patient_id,
        "appointment_type": data.appointment_type,
        "booking_type": data.appointment_type.lower(),
        "status": "Booked",
        "notes": data.notes,
        "created_by": staff.get("name", "Staff"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": "Staff",
    }

    await shared.db.appointments.insert_one(appointment)
    appointment.pop("_id", None)

    # Slot-based token for walk-in
    token_data = None
    if data.appointment_type in ("WALK_IN", "EMERGENCY"):
        clinic = data.clinic
        today_ist = get_ist_date()

        if data.appointment_type == "WALK_IN" and normalized_time:
            slot_info = get_slots_for_doctor_clinic_date(data.doctor, clinic, data.date, "current")
            all_session_slots = slot_info.get("all", [])
            slot_values = [s["value"] for s in all_session_slots]

            if normalized_time in slot_values:
                token_number = str(slot_values.index(normalized_time) + 1)
            else:
                existing_walkins = await shared.db.appointments.count_documents(
                    {"clinic": clinic, "date": today_ist, "appointment_type": "WALK_IN", "token_number": {"$exists": True}}
                )
                token_number = str(existing_walkins + 1)
        else:
            existing_of_type = await shared.db.appointments.count_documents(
                {"clinic": clinic, "date": today_ist, "appointment_type": data.appointment_type, "token_number": {"$exists": True}}
            )
            token_number = str(existing_of_type + 1)

        await shared.db.appointments.update_one(
            {"id": appointment["id"]},
            {
                "$set": {
                    "token_number": token_number,
                    "token_assigned_at": datetime.now(timezone.utc).isoformat(),
                    "status": "CheckedIn",
                    "checked_in_at": get_ist_datetime(),
                    "auto_checked_in": True,
                }
            },
        )
        appointment["status"] = "CheckedIn"
        appointment["token_number"] = token_number
        token_data = {
            "token_number": token_number,
            "patient_name": data.patient_name.strip(),
            "doctor": data.doctor,
            "clinic": data.clinic,
            "time": normalized_time or "Emergency",
            "date": data.date,
            "booking_id": booking_id,
        }

    if data.patient_id:
        await shared.db.patients.update_one(
            {"patient_id": data.patient_id},
            {"$inc": {"visit_count": 1}, "$set": {"last_visit": data.date}},
        )

    # WhatsApp booking confirmation
    try:
        from services.msg91_whatsapp import send_diagyn_appointment_confirmation

        patient_phone = data.patient_mobile.strip()
        if not patient_phone.startswith("91"):
            patient_phone = f"91{patient_phone}"
        await send_diagyn_appointment_confirmation(
            phone=patient_phone,
            patient_name=data.patient_name.strip(),
            doctor_name=data.doctor,
            clinic_name=data.clinic,
            date=data.date,
            time=normalized_time or "As per schedule",
            booking_id=booking_id,
            db=shared.db,
        )
        logger.info(f"WhatsApp confirmation sent to patient {patient_phone} for booking {booking_id}")
    except Exception as e:
        logger.error(f"Failed to send WhatsApp to patient for booking {booking_id}: {e}")

    return {
        "success": True,
        "booking_id": booking_id,
        "appointment": appointment,
        "token_data": token_data,
        "message": f"{data.appointment_type} appointment booked for {data.patient_name}",
    }


@router.get("/appointments/today")
async def get_todays_appointments(clinic: Optional[str] = None, staff=Depends(verify_staff)):
    today = get_ist_date()
    query = {"date": today}
    if clinic and clinic != "all":
        query["clinic"] = clinic

    appointments = await shared.db.appointments.find(query, {"_id": 0}).to_list(200)
    appointments.sort(key=lambda a: (normalize_time_to_24h(a.get("time", "")), a.get("created_at", "")))

    summary = {
        "total": len(appointments),
        "booked": len([a for a in appointments if a.get("status") == "Booked"]),
        "checked_in": len([a for a in appointments if a.get("status") == "CheckedIn"]),
        "with_doctor": len([a for a in appointments if a.get("status") == "WithDoctor"]),
        "completed": len([a for a in appointments if a.get("status") == "Completed"]),
        "walk_in": len([a for a in appointments if a.get("appointment_type") == "WALK_IN"]),
        "emergency": len([a for a in appointments if a.get("appointment_type") == "EMERGENCY"]),
    }

    return {"date": today, "clinic": clinic or "all", "appointments": appointments, "summary": summary}


@router.get("/appointments/by-date")
async def get_appointments_by_date(date: str, clinic: Optional[str] = None, staff=Depends(verify_staff)):
    query = {"date": date}
    if clinic and clinic != "all":
        query["clinic"] = {"$regex": clinic, "$options": "i"}

    appointments = await shared.db.appointments.find(query, {"_id": 0}).to_list(200)
    appointments.sort(key=lambda a: (normalize_time_to_24h(a.get("time", "")), a.get("created_at", "")))

    summary = {
        "total": len(appointments),
        "booked": len([a for a in appointments if a.get("status") in ["Booked", "pending"]]),
        "checked_in": len([a for a in appointments if a.get("status") == "CheckedIn"]),
        "with_doctor": len([a for a in appointments if a.get("status") == "WithDoctor"]),
        "completed": len([a for a in appointments if a.get("status") == "Completed"]),
    }

    return {"date": date, "appointments": appointments, "summary": summary}


@router.put("/appointments/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: str,
    data: AppointmentStatusUpdate,
    staff=Depends(verify_staff),
):
    appointment = await shared.db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not appointment:
        appointment = await shared.db.appointments.find_one({"booking_id": appointment_id}, {"_id": 0})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    update_data = {
        "status": data.status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": staff.get("name", "Staff"),
    }

    if data.status == "CheckedIn":
        update_data["checked_in_at"] = get_ist_datetime()

        existing_token = appointment.get("token_number")
        if existing_token:
            token_number = existing_token
        else:
            today_ist = get_ist_date()
            clinic = appointment.get("clinic", "")
            appointment_type = appointment.get("appointment_type", "SCHEDULED")

            existing_tokens_of_type = await shared.db.appointments.count_documents(
                {"clinic": clinic, "date": today_ist, "appointment_type": appointment_type, "token_number": {"$exists": True}}
            )
            token_number = str(existing_tokens_of_type + 1)

        today_ist = get_ist_date()
        clinic = appointment.get("clinic", "")
        total_tokens = await shared.db.appointments.count_documents(
            {"clinic": clinic, "date": today_ist, "token_number": {"$exists": True}}
        )

        update_data["token_number"] = token_number
        update_data["token_sequence"] = total_tokens + 1
        update_data["appointment_type"] = appointment.get("appointment_type", "SCHEDULED")

    if data.status == "Cancelled":
        update_data["cancelled_at"] = datetime.now(timezone.utc).isoformat()
        update_data["cancelled_by"] = staff.get("name", "Staff")
        if data.notes:
            update_data["cancellation_reason"] = data.notes
        # Send WhatsApp cancellation to patient
        patient_phone = appointment.get("patient_phone") or appointment.get("phone")
        if patient_phone:
            try:
                from services.msg91_whatsapp import send_order_cancelled
                await send_order_cancelled(
                    phone=patient_phone,
                    patient_name=appointment.get("patient_name", "Patient"),
                    service_name="DiaGyn",
                    order_id=appointment.get("booking_id", appointment_id),
                    db=shared.db
                )
                logger.info(f"Staff cancellation WhatsApp sent to patient {patient_phone}")
            except Exception as e:
                logger.warning(f"Failed to send staff cancellation WhatsApp: {e}")

    if data.status == "WithDoctor":
        update_data["with_doctor_at"] = datetime.now(timezone.utc).isoformat()

    if data.status == "Completed":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
        update_data["completed_by"] = staff.get("name", "Doctor")
        if data.fee_code:
            update_data["fee_code"] = data.fee_code
        if data.scan_codes:
            update_data["scan_codes"] = data.scan_codes
        if data.total_amount is not None:
            update_data["total_amount"] = data.total_amount
        if data.notes:
            update_data["completion_notes"] = data.notes
        if data.follow_up_date:
            update_data["follow_up_date"] = data.follow_up_date

        # Auto-send Google Review request via WhatsApp
        appointment_type = appointment.get("appointment_type", "SCHEDULED")
        patient_phone = appointment.get("patient_phone") or appointment.get("phone")
        if patient_phone:
            try:
                from services.msg91_whatsapp import send_msg91_whatsapp

                patient_name = appointment.get("patient_name", "Patient")
                doctor_name = appointment.get("doctor", "Doctor")
                clinic_name = appointment.get("clinic", "DiaGyn Healthcare")
                review_links = {
                    "Pushpa Clinic": "https://g.page/r/CZBa3QPJ_1lXECI/review",
                    "Amnion Clinic": "https://g.page/r/CZyZHBaBV8i_EBI/review",
                }
                review_link = review_links.get(clinic_name, "https://g.page/r/CZBa3QPJ_1lXECI/review")
                clean_phone = patient_phone.replace("+", "").replace(" ", "").replace("-", "")
                if not clean_phone.startswith("91"):
                    clean_phone = "91" + clean_phone

                await send_msg91_whatsapp(
                    recipient_phone=clean_phone,
                    template_name="diagyn_google_review",
                    variables=[patient_name, doctor_name, clinic_name, review_link],
                    db=shared.db,
                    reference_id=f"review_{appointment_id}_{datetime.now().strftime('%Y%m%d%H%M')}",
                    message_type="google_review_request",
                )
                update_data["review_request_sent"] = True
                update_data["review_request_sent_at"] = datetime.now(timezone.utc).isoformat()
                logger.info(f"Google Review request sent to {clean_phone} for {clinic_name} ({appointment_type} appointment)")
            except Exception as e:
                logger.error(f"Failed to send review request: {e}")
                update_data["review_request_error"] = str(e)

    actual_apt_id = appointment.get("id", appointment_id)

    await shared.db.appointments.update_one({"id": actual_apt_id}, {"$set": update_data})

    # WebSocket broadcast
    if shared.appointment_ws_manager:
        try:
            await shared.appointment_ws_manager.broadcast_status_change(
                {
                    "id": appointment_id,
                    "booking_id": appointment.get("booking_id"),
                    "patient_name": appointment.get("patient_name"),
                    "patient_phone": appointment.get("patient_phone") or appointment.get("phone"),
                    "doctor": appointment.get("doctor"),
                    "clinic": appointment.get("clinic"),
                    "date": appointment.get("date"),
                    "time": appointment.get("time"),
                    "status": data.status,
                    "portal": "diagyn",
                    "token_number": update_data.get("token_number"),
                    "updated_by": staff.get("name", "Staff"),
                }
            )
            logger.info(f"[WS] Broadcast status change: {appointment_id} -> {data.status}")
        except Exception as e:
            logger.error(f"[WS] Failed to broadcast status change: {e}")

    # Log staff activity
    try:
        await shared.db.staff_activity.insert_one(
            {
                "staff_id": staff.get("sub"),
                "staff_name": staff.get("name"),
                "action": f"appointment_{data.status.lower()}",
                "details": {
                    "appointment_id": appointment_id,
                    "patient_name": appointment.get("patient_name"),
                    "clinic": appointment.get("clinic"),
                    "total_amount": update_data.get("total_amount") if data.status == "Completed" else None,
                },
                "portal": "diagyn",
                "timestamp": get_ist_datetime(),
                "date": get_ist_date(),
            }
        )
    except Exception as e:
        logger.error(f"Failed to log activity: {e}")

    response = {"success": True, "status": data.status, "message": f"Appointment status updated to {data.status}"}

    if data.status == "CheckedIn":
        response["token_data"] = {
            "token_number": update_data.get("token_number"),
            "patient_name": appointment.get("patient_name"),
            "clinic": appointment.get("clinic"),
            "clinic_address": shared.CLINICS.get(appointment.get("clinic"), {}).get("address", ""),
            "slot_time": appointment.get("time") or "Emergency",
            "date": appointment.get("date"),
            "checked_in_at": update_data.get("checked_in_at"),
            "booking_id": appointment.get("booking_id"),
            "appointment_type": appointment.get("appointment_type", "SCHEDULED"),
        }

    if data.status == "Completed":
        ist_now = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
        try:
            token_num = int(appointment.get("token_number", 0))
        except (ValueError, TypeError):
            token_num = 0

        response["bill_data"] = {
            "bill_number": f"DG{ist_now.strftime('%Y%m%d')}{token_num:03d}",
            "patient_name": appointment.get("patient_name"),
            "patient_phone": appointment.get("phone"),
            "patient_age": appointment.get("age"),
            "clinic": appointment.get("clinic"),
            "clinic_address": shared.CLINICS.get(appointment.get("clinic"), {}).get("address", ""),
            "doctor": appointment.get("doctor"),
            "date": appointment.get("date"),
            "time": appointment.get("time") or "Emergency",
            "booking_id": appointment.get("booking_id"),
            "token_number": appointment.get("token_number"),
            "fee_code": data.fee_code,
            "scan_codes": data.scan_codes or [],
            "total_amount": data.total_amount,
            "notes": data.notes,
            "follow_up_date": data.follow_up_date,
            "completed_at": ist_now.strftime("%d-%m-%Y %I:%M %p"),
            "completed_by": staff.get("name", "Doctor"),
            "appointment_type": appointment.get("appointment_type", "SCHEDULED"),
        }

    return response
