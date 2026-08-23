"""
DiaGyn Staff Portal — Check-in by booking code + doctor fee collection.
"""

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
import uuid
import logging

from . import shared
from .auth import verify_staff
from .models import BookingCodeCheckIn, DoctorFeeCollection
from .utils import get_ist_date, get_ist_datetime, get_ist_now

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/check-in/by-code")
async def check_in_by_booking_code(data: BookingCodeCheckIn, staff=Depends(verify_staff)):
    booking_code = data.booking_code.strip()
    today = get_ist_date()

    code_match = {
        "$or": [
            {"booking_id": booking_code},
            {"booking_id": {"$regex": f"^{booking_code}$", "$options": "i"}},
            {"booking_id": {"$regex": booking_code, "$options": "i"}},
            {"id": {"$regex": booking_code, "$options": "i"}},
        ]
    }

    # Step 1-4: progressive search
    appointment = await shared.db.appointments.find_one({**code_match, "date": today, "clinic": data.clinic}, {"_id": 0})
    if not appointment:
        appointment = await shared.db.appointments.find_one({**code_match, "date": today}, {"_id": 0})
    if not appointment:
        appointment = await shared.db.appointments.find_one(
            {**code_match, "clinic": data.clinic, "status": {"$in": ["Booked", "pending", "confirmed"]}}, {"_id": 0}
        )
    if not appointment:
        appointment = await shared.db.appointments.find_one(
            {**code_match, "status": {"$in": ["Booked", "pending", "confirmed"]}}, {"_id": 0}
        )

    if not appointment:
        any_date_appt = await shared.db.appointments.find_one(
            {
                "$or": [
                    {"booking_id": {"$regex": f"^{booking_code}", "$options": "i"}},
                    {"booking_id": {"$regex": booking_code, "$options": "i"}},
                    {"id": {"$regex": booking_code, "$options": "i"}},
                ]
            },
            {"_id": 0},
        )
        if any_date_appt:
            appt_date = any_date_appt.get("date", "unknown")
            raise HTTPException(
                status_code=404,
                detail=f"Booking '{booking_code}' found but scheduled for {appt_date}, not today ({get_ist_date()}). Please verify the date.",
            )
        raise HTTPException(status_code=404, detail=f"No appointment found with code '{booking_code}'. Please verify the booking ID.")

    current_status = appointment.get("status", "")
    if current_status not in ["Booked", "pending", "confirmed"]:
        if current_status == "CheckedIn":
            return {
                "success": False,
                "error": "already_checked_in",
                "message": f"Patient already checked in (Token #{appointment.get('token_number', 'N/A')})",
                "appointment": appointment,
            }
        elif current_status in ["WithDoctor", "Completed"]:
            return {
                "success": False,
                "error": "invalid_status",
                "message": f"Appointment already {current_status}",
                "appointment": appointment,
            }
        else:
            raise HTTPException(status_code=400, detail=f"Cannot check-in appointment with status: {current_status}")

    today_ist = get_ist_date()
    clinic = appointment.get("clinic", data.clinic)
    appointment_type = appointment.get("appointment_type", "SCHEDULED")

    existing_tokens_of_type = await shared.db.appointments.count_documents(
        {"clinic": clinic, "date": today_ist, "appointment_type": appointment_type, "token_number": {"$exists": True}}
    )

    total_tokens = await shared.db.appointments.count_documents(
        {"clinic": clinic, "date": today_ist, "token_number": {"$exists": True}}
    )

    token_number = str(existing_tokens_of_type + 1)

    update_data = {
        "status": "CheckedIn",
        "checked_in_at": get_ist_datetime(),
        "checked_in_by": staff.get("name", "Staff"),
        "checked_in_via": "booking_code",
        "token_number": token_number,
        "token_sequence": total_tokens + 1,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    await shared.db.appointments.update_one({"id": appointment["id"]}, {"$set": update_data})

    # WebSocket broadcast
    if shared.appointment_ws_manager:
        try:
            await shared.appointment_ws_manager.broadcast_status_change(
                {
                    "id": appointment["id"],
                    "booking_id": appointment.get("booking_id"),
                    "patient_name": appointment.get("patient_name"),
                    "patient_phone": appointment.get("patient_phone") or appointment.get("phone"),
                    "doctor": appointment.get("doctor"),
                    "clinic": clinic,
                    "date": appointment.get("date"),
                    "time": appointment.get("time"),
                    "status": "CheckedIn",
                    "portal": "diagyn",
                    "token_number": token_number,
                    "updated_by": staff.get("name", "Staff"),
                }
            )
        except Exception as e:
            logger.error(f"[WS] Failed to broadcast check-in: {e}")

    # Log activity
    try:
        await shared.db.staff_activity.insert_one(
            {
                "staff_id": staff.get("sub"),
                "staff_name": staff.get("name"),
                "action": "check_in_by_code",
                "details": {
                    "appointment_id": appointment["id"],
                    "booking_code": booking_code,
                    "patient_name": appointment.get("patient_name"),
                    "clinic": clinic,
                    "token_number": token_number,
                },
                "portal": "diagyn",
                "timestamp": get_ist_datetime(),
                "date": get_ist_date(),
            }
        )
    except Exception as e:
        logger.error(f"Failed to log check-in activity: {e}")

    # WhatsApp check-in notification
    patient_phone = appointment.get("patient_phone") or appointment.get("phone")
    if patient_phone:
        try:
            from services.msg91_whatsapp import send_patient_checkin_notification

            clean_phone = patient_phone.replace("+", "").replace(" ", "").replace("-", "")
            if not clean_phone.startswith("91"):
                clean_phone = "91" + clean_phone

            await send_patient_checkin_notification(
                phone=clean_phone,
                patient_name=appointment.get("patient_name", "Patient"),
                token_number=token_number,
                doctor_name=appointment.get("doctor", "Doctor"),
                clinic_name=clinic,
                db=shared.db,
            )
            logger.info(f"[WhatsApp] Check-in notification sent to {clean_phone} for token {token_number}")
        except Exception as e:
            logger.error(f"[WhatsApp] Failed to send check-in notification: {e}")

    logger.info(f"Check-in by code: {booking_code} -> Token #{token_number} at {clinic}")

    return {
        "success": True,
        "message": "Patient checked in successfully",
        "token_number": token_number,
        "appointment": {
            "id": appointment["id"],
            "booking_id": appointment.get("booking_id"),
            "patient_name": appointment.get("patient_name"),
            "patient_phone": appointment.get("patient_phone") or appointment.get("phone"),
            "doctor": appointment.get("doctor"),
            "clinic": clinic,
            "time": appointment.get("time"),
            "date": appointment.get("date"),
            "status": "CheckedIn",
            "token_number": token_number,
        },
        "token_data": {
            "token_number": token_number,
            "patient_name": appointment.get("patient_name"),
            "clinic": clinic,
            "clinic_address": shared.CLINICS.get(clinic, {}).get("address", ""),
            "slot_time": appointment.get("time") or "Walk-in",
            "date": appointment.get("date"),
            "booking_id": appointment.get("booking_id"),
            "appointment_type": appointment.get("appointment_type", "SCHEDULED"),
        },
    }


@router.post("/doctor/collect-fee")
async def doctor_collect_fee(data: DoctorFeeCollection, staff=Depends(verify_staff)):
    appointment = await shared.db.appointments.find_one({"id": data.appointment_id}, {"_id": 0})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    ist_now = get_ist_now()
    receipt_number = f"DG{ist_now.strftime('%Y%m%d')}{str(uuid.uuid4())[:4].upper()}"

    # Cashfree payment order
    cashfree_order = None
    if data.payment_method == "cashfree":
        try:
            from routes.cashfree import init_cashfree, API_VERSION
            from cashfree_pg.models.create_order_request import CreateOrderRequest
            from cashfree_pg.models.customer_details import CustomerDetails
            from cashfree_pg.models.order_meta import OrderMeta
            import os

            cashfree = init_cashfree()

            patient_phone = (appointment.get("patient_phone") or appointment.get("phone") or "").replace("+91", "").replace(" ", "")[-10:]
            patient_email = appointment.get("patient_email") or "patient@nevikacura.com"

            order_id = f"DG_{data.appointment_id[:8]}_{int(ist_now.timestamp())}"

            customer = CustomerDetails(
                customer_id=f"DG_{patient_phone}",
                customer_name=appointment.get("patient_name", "Patient"),
                customer_phone=patient_phone,
                customer_email=patient_email,
            )

            frontend_url = os.environ.get("REACT_APP_BACKEND_URL", "https://nevikacura.com")
            return_url = f"{frontend_url}/doctor-portal/payment-success?order_id={order_id}"

            order_meta = OrderMeta(return_url=return_url)

            order_request = CreateOrderRequest(
                order_id=order_id,
                order_amount=float(data.total_amount),
                order_currency="INR",
                customer_details=customer,
                order_meta=order_meta,
                order_note=f"DiaGyn Consultation - {appointment.get('patient_name')}",
            )

            response = cashfree.PGCreateOrder(API_VERSION, order_request, None, None)

            if response and response.data:
                cashfree_order = {
                    "order_id": order_id,
                    "cf_order_id": response.data.cf_order_id,
                    "payment_session_id": response.data.payment_session_id,
                    "amount": data.total_amount,
                }

                await shared.db.cashfree_orders.insert_one(
                    {
                        "order_id": order_id,
                        "cf_order_id": response.data.cf_order_id,
                        "payment_session_id": response.data.payment_session_id,
                        "appointment_id": data.appointment_id,
                        "patient_name": appointment.get("patient_name"),
                        "patient_phone": patient_phone,
                        "amount": data.total_amount,
                        "product_type": "diagyn_consultation",
                        "order_status": "ACTIVE",
                        "payment_status": "PENDING",
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    }
                )

                logger.info(f"Cashfree order created: {order_id}")
        except Exception as e:
            logger.error(f"Cashfree order creation failed: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to create payment order: {str(e)}")

    billing_timer_start = datetime.now(timezone.utc).isoformat()
    update_data = {
        "status": "billing_pending",
        "fee_code": data.fee_code,
        "scan_codes": data.scan_codes or [],
        "doctor_fee_amount": data.total_amount,
        "payment_method": data.payment_method,
        "payment_status": "billing_pending",
        "receipt_number": receipt_number,
        "completion_notes": data.notes,
        "follow_up_date": data.follow_up_date,
        "doctor_ended_at": datetime.now(timezone.utc).isoformat(),
        "doctor_ended_by": staff.get("name", "Doctor"),
        "billing_timer_start": billing_timer_start,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    if cashfree_order:
        update_data["cashfree_order_id"] = cashfree_order["order_id"]
        update_data["payment_status"] = "cashfree_pending"

    await shared.db.appointments.update_one({"id": data.appointment_id}, {"$set": update_data})

    # Record fee transaction
    fee_transaction = {
        "id": f"fee_{str(uuid.uuid4())[:12]}",
        "appointment_id": data.appointment_id,
        "patient_id": appointment.get("patient_id"),
        "patient_name": appointment.get("patient_name"),
        "patient_phone": appointment.get("patient_phone") or appointment.get("phone"),
        "doctor": appointment.get("doctor"),
        "clinic": appointment.get("clinic"),
        "fee_code": data.fee_code,
        "scan_codes": data.scan_codes or [],
        "amount": data.total_amount,
        "payment_method": data.payment_method,
        "receipt_number": receipt_number,
        "collected_by": staff.get("name", "Doctor"),
        "collected_at": get_ist_datetime(),
        "status": "billing_pending",
        "date": get_ist_date(),
    }

    await shared.db.fee_transactions.insert_one(fee_transaction)

    # WebSocket broadcast
    if shared.appointment_ws_manager:
        try:
            await shared.appointment_ws_manager.broadcast_status_change(
                {
                    "id": data.appointment_id,
                    "booking_id": appointment.get("booking_id"),
                    "patient_name": appointment.get("patient_name"),
                    "doctor": appointment.get("doctor"),
                    "clinic": appointment.get("clinic"),
                    "date": appointment.get("date"),
                    "status": "billing_pending",
                    "portal": "diagyn",
                    "doctor_fee_amount": data.total_amount,
                    "billing_timer_start": billing_timer_start,
                    "updated_by": staff.get("name", "Doctor"),
                }
            )
        except Exception as e:
            logger.error(f"[WS] Failed to broadcast billing_pending: {e}")

    logger.info(f"Doctor ended consultation: {receipt_number} - \u20b9{data.total_amount} via {data.payment_method} - billing_pending")

    response = {
        "success": True,
        "message": "Consultation ended \u2014 Billing timer started. Staff must close the bill.",
        "receipt_number": receipt_number,
        "payment_method": data.payment_method,
        "doctor_fee_amount": data.total_amount,
        "billing_timer_start": billing_timer_start,
        "status": "billing_pending",
    }

    if cashfree_order:
        response["cashfree_order"] = cashfree_order
        response["message"] = "Payment order created. Staff must close the bill after payment."

    return response
