"""
DiaGyn Staff Portal — Billing update, doctor charges, billing close, analytics.
"""

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import Optional
import uuid
import os
import logging

from . import shared
from .auth import verify_staff
from .models import BillingUpdate, DoctorChargesRequest, BillingCloseRequest
from .utils import get_ist_now, get_ist_date, get_ist_datetime

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Update Billing (Without Completing) ──────────────────────────

@router.put("/appointments/{appointment_id}/billing")
async def update_appointment_billing(
    appointment_id: str,
    data: BillingUpdate,
    staff=Depends(verify_staff),
):
    appointment = await shared.db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    update_data = {
        "fee_code": data.fee_code,
        "scan_codes": data.scan_codes or [],
        "total_amount": data.total_amount,
        "billing_notes": data.notes,
        "follow_up_date": data.follow_up_date,
        "billing_updated_at": datetime.now(timezone.utc).isoformat(),
        "billing_updated_by": staff.get("name", "Doctor"),
    }

    await shared.db.appointments.update_one({"id": appointment_id}, {"$set": update_data})

    try:
        await shared.db.staff_activity.insert_one(
            {
                "staff_id": staff.get("sub"),
                "staff_name": staff.get("name"),
                "action": "appointment_billing_updated",
                "details": {
                    "appointment_id": appointment_id,
                    "patient_name": appointment.get("patient_name"),
                    "fee_code": data.fee_code,
                    "total_amount": data.total_amount,
                },
                "portal": "diagyn",
                "timestamp": get_ist_datetime(),
                "date": get_ist_date(),
            }
        )
    except Exception as e:
        logger.error(f"Failed to log billing activity: {e}")

    return {
        "success": True,
        "message": f"Billing updated - \u20b9{data.total_amount}",
        "fee_code": data.fee_code,
        "total_amount": data.total_amount,
    }


# ── Doctor Charges (Set by Doctor during WithDoctor) ─────────────

@router.put("/appointments/{appointment_id}/doctor-charges")
async def set_doctor_charges(
    appointment_id: str,
    data: DoctorChargesRequest,
    staff=Depends(verify_staff),
):
    appointment = await shared.db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not appointment:
        appointment = await shared.db.appointments.find_one({"booking_id": appointment_id}, {"_id": 0})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if appointment.get("status") != "WithDoctor":
        raise HTTPException(
            status_code=400,
            detail=f"Can only set charges when patient is WithDoctor. Current: {appointment.get('status')}",
        )

    actual_id = appointment.get("id", appointment_id)
    await shared.db.appointments.update_one(
        {"id": actual_id},
        {
            "$set": {
                "doctor_fee_code": data.fee_code,
                "doctor_scan_codes": data.scan_codes or [],
                "doctor_charges_set": True,
                "doctor_charges_set_at": datetime.now(timezone.utc).isoformat(),
                "doctor_charges_set_by": staff.get("name", "Doctor"),
            }
        },
    )

    return {
        "success": True,
        "message": "Charges set by doctor",
        "fee_code": data.fee_code,
        "scan_codes": data.scan_codes or [],
    }


# ── Billing Pending ──────────────────────────────────────────────

@router.get("/billing/pending")
async def get_pending_billings(clinic: Optional[str] = None, staff=Depends(verify_staff)):
    query = {"status": "billing_pending", "date": get_ist_date()}
    if clinic:
        query["clinic"] = clinic

    appointments = await shared.db.appointments.find(query, {"_id": 0}).sort("billing_timer_start", 1).to_list(100)

    for apt in appointments:
        timer_start = apt.get("billing_timer_start")
        if timer_start:
            try:
                start_dt = datetime.fromisoformat(timer_start.replace("Z", "+00:00"))
                elapsed = (datetime.now(timezone.utc) - start_dt).total_seconds()
                apt["billing_elapsed_seconds"] = int(elapsed)
            except Exception:
                apt["billing_elapsed_seconds"] = 0

    return {
        "success": True,
        "pending_count": len(appointments),
        "appointments": appointments,
        "server_time": datetime.now(timezone.utc).isoformat(),
    }


# ── Billing Close ────────────────────────────────────────────────

@router.post("/billing/close")
async def close_billing(data: BillingCloseRequest, staff=Depends(verify_staff)):
    appointment = await shared.db.appointments.find_one({"id": data.appointment_id}, {"_id": 0})

    if not appointment:
        appointment = await shared.db.appointments.find_one({"booking_id": data.appointment_id}, {"_id": 0})

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    allowed = ("billing_pending", "Billing Pending", "WithDoctor", "CheckedIn", "In Consultation")
    if appointment.get("status") not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot close billing \u2014 appointment status is '{appointment.get('status')}'. Expected: billing_pending, WithDoctor or CheckedIn",
        )

    billing_timer_start = appointment.get("billing_timer_start")
    billing_timer_end = datetime.now(timezone.utc).isoformat()
    billing_duration_seconds = 0
    if billing_timer_start:
        try:
            start_dt = datetime.fromisoformat(billing_timer_start.replace("Z", "+00:00"))
            billing_duration_seconds = int((datetime.now(timezone.utc) - start_dt).total_seconds())
        except Exception:
            pass

    payment_method = data.payment_method or appointment.get("payment_method", "cash")

    ist_now = get_ist_now()
    receipt_number = appointment.get("receipt_number", f"DG{ist_now.strftime('%Y%m%d')}{str(uuid.uuid4())[:4].upper()}")

    doctor_fee = appointment.get("doctor_fee_amount", 0)
    amount_mismatch = abs(data.final_amount - doctor_fee) > 0.01 if doctor_fee else False
    flagged_fast_close = billing_duration_seconds < 60

    update_data = {
        "status": "Completed",
        "total_amount": data.final_amount,
        "payment_method": payment_method,
        "payment_status": "collected",
        "billing_timer_end": billing_timer_end,
        "billing_duration_seconds": billing_duration_seconds,
        "billing_closed_by": staff.get("name", "Staff"),
        "billing_closed_at": get_ist_datetime(),
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "completed_by": staff.get("name", "Staff"),
        "fee_collected_by": staff.get("name", "Staff"),
        "fee_collected_at": get_ist_datetime(),
        "billing_amount_mismatch": amount_mismatch,
        "billing_flagged_fast_close": flagged_fast_close,
        "billing_staff_notes": data.notes,
        "medicine_amount": data.medicine_amount or 0,
        "misc_amount": data.misc_amount or 0,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    # Save fee_code and scan_codes from staff (or keep doctor's if already set)
    if data.fee_code:
        update_data["fee_code"] = data.fee_code
    if data.scan_codes:
        update_data["scan_codes"] = data.scan_codes

    actual_apt_id = appointment.get("id", data.appointment_id)

    await shared.db.appointments.update_one({"id": actual_apt_id}, {"$set": update_data})

    # Update fee transaction
    await shared.db.fee_transactions.update_one(
        {"appointment_id": data.appointment_id},
        {
            "$set": {
                "status": "completed",
                "final_amount": data.final_amount,
                "billing_closed_by": staff.get("name", "Staff"),
                "billing_closed_at": get_ist_datetime(),
                "billing_duration_seconds": billing_duration_seconds,
            }
        },
    )

    # Billing timer record for analytics
    billing_record = {
        "id": f"billing_{str(uuid.uuid4())[:12]}",
        "appointment_id": data.appointment_id,
        "patient_name": appointment.get("patient_name"),
        "patient_phone": appointment.get("patient_phone") or appointment.get("phone"),
        "doctor": appointment.get("doctor"),
        "clinic": appointment.get("clinic"),
        "appointment_type": appointment.get("appointment_type", "SCHEDULED"),
        "doctor_fee_amount": doctor_fee,
        "final_amount": data.final_amount,
        "amount_mismatch": amount_mismatch,
        "payment_method": payment_method,
        "billing_timer_start": billing_timer_start,
        "billing_timer_end": billing_timer_end,
        "billing_duration_seconds": billing_duration_seconds,
        "flagged_fast_close": flagged_fast_close,
        "closed_by": staff.get("name", "Staff"),
        "date": get_ist_date(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await shared.db.billing_timers.insert_one(billing_record)

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
                    "status": "Completed",
                    "portal": "diagyn",
                    "total_amount": data.final_amount,
                    "billing_duration_seconds": billing_duration_seconds,
                    "updated_by": staff.get("name", "Staff"),
                }
            )
        except Exception as e:
            logger.error(f"[WS] Failed to broadcast billing close: {e}")

    # WhatsApp notifications
    receipt_sent = False
    review_sent = False
    patient_phone = appointment.get("patient_phone") or appointment.get("phone")

    if patient_phone:
        clean_phone = patient_phone.replace("+", "").replace(" ", "").replace("-", "")
        if not clean_phone.startswith("91"):
            clean_phone = "91" + clean_phone

        # Cashfree payment link
        payment_link = ""
        total_amount = str(data.final_amount or 0)
        if data.final_amount and data.final_amount > 0:
            try:
                from cashfree_pg.models.create_order_request import CreateOrderRequest
                from cashfree_pg.models.customer_details import CustomerDetails
                from cashfree_pg.models.order_meta import OrderMeta
                from cashfree_pg.api_client import Cashfree as CashfreeClient

                cf_client_id = os.environ.get("CASHFREE_CLIENT_ID")
                cf_client_secret = os.environ.get("CASHFREE_CLIENT_SECRET")
                cf_env = os.environ.get("CASHFREE_ENVIRONMENT", "sandbox")
                cf_environment = CashfreeClient.PRODUCTION if cf_env == "production" else CashfreeClient.SANDBOX
                cashfree_sdk = CashfreeClient(XEnvironment=cf_environment, XClientId=cf_client_id, XClientSecret=cf_client_secret)

                phone_10 = clean_phone[-10:]
                order_id = f"PAY_APT_{datetime.now().strftime('%Y%m%d%H%M%S')}_{data.appointment_id[-6:]}"
                frontend_url = os.environ.get("FRONTEND_URL", "https://nevikacura.com")

                customer = CustomerDetails(
                    customer_id=f"CUST_{phone_10}",
                    customer_name=appointment.get("patient_name", "Patient"),
                    customer_phone=phone_10,
                    customer_email=appointment.get("patient_email") or "customer@nevikacura.com",
                )
                order_meta = OrderMeta(return_url=f"{frontend_url}/payment-success?order_id={order_id}")
                order_request = CreateOrderRequest(
                    order_id=order_id,
                    order_amount=float(data.final_amount),
                    order_currency="INR",
                    customer_details=customer,
                    order_meta=order_meta,
                    order_note=f"Consultation - {appointment.get('doctor', 'Doctor')}",
                )
                response = cashfree_sdk.PGCreateOrder(x_api_version="2023-08-01", create_order_request=order_request)
                if response and response.data:
                    checkout_base_url = os.environ.get("CHECKOUT_BASE_URL", frontend_url)
                    payment_link = f"{checkout_base_url}/checkout?session={response.data.payment_session_id}&order={order_id}&amount={data.final_amount}"

                    await shared.db.payment_links.insert_one(
                        {
                            "order_id": order_id,
                            "cf_order_id": response.data.cf_order_id,
                            "appointment_id": data.appointment_id,
                            "amount": data.final_amount,
                            "payment_link": payment_link,
                            "status": "LINK_SENT",
                            "created_at": datetime.now(timezone.utc).isoformat(),
                        }
                    )
                    await shared.db.appointments.update_one(
                        {"id": actual_apt_id},
                        {"$set": {"payment_link": payment_link, "payment_order_id": order_id}},
                    )
                    logger.info(f"Cashfree payment link created for appointment {actual_apt_id}")
            except Exception as e:
                logger.warning(f"Failed to create Cashfree payment link: {e}")

        # Send appointment completed message
        try:
            from services.msg91_whatsapp import send_diagyn_appointment_completed

            follow_up = appointment.get("follow_up_date", "As advised")
            feedback_url = os.environ.get("REACT_APP_BACKEND_URL", "https://nevikacura.com")

            await send_diagyn_appointment_completed(
                phone=clean_phone,
                patient_name=appointment.get("patient_name", "Patient"),
                doctor_name=appointment.get("doctor", "Doctor"),
                follow_up_date=follow_up,
                feedback_url=feedback_url,
                total_amount=total_amount,
                payment_link=payment_link,
                db=shared.db,
            )
            receipt_sent = True
            logger.info(f"Appointment completed WhatsApp (with payment link) sent to {clean_phone}")
        except Exception as e:
            logger.error(f"Failed to send appointment completed WhatsApp: {e}")

        # Send Google Review request
        try:
            from services.msg91_whatsapp import send_msg91_whatsapp

            clinic_name = appointment.get("clinic", "Pushpa Clinic")
            review_link = shared.GOOGLE_REVIEW_LINKS.get(clinic_name, shared.GOOGLE_REVIEW_LINKS["DiaGyn Healthcare"])

            await send_msg91_whatsapp(
                recipient_phone=clean_phone,
                template_name="diagyn_google_review",
                variables=[
                    appointment.get("patient_name", "Patient"),
                    appointment.get("doctor", "Doctor"),
                    clinic_name,
                    review_link,
                ],
                db=shared.db,
                reference_id=f"review_{data.appointment_id}",
                message_type="google_review_request",
            )
            review_sent = True

            await shared.db.appointments.update_one(
                {"id": data.appointment_id},
                {"$set": {"review_request_sent": True, "review_request_sent_at": datetime.now(timezone.utc).isoformat()}},
            )
            logger.info(f"Google Review request sent to {clean_phone}")
        except Exception as e:
            logger.error(f"Failed to send Google Review request: {e}")

    # Generate and send invoice
    invoice_id = None
    if payment_method in ["cash", "upi"]:
        try:
            from services.invoice_generator import get_invoice_base64

            fee_info = shared.FEE_CODES.get(appointment.get("doctor"), {}).get(
                appointment.get("fee_code", ""), {"label": appointment.get("fee_code", "Consultation"), "amount": 0}
            )
            scan_items = []
            for scan_code in appointment.get("scan_codes") or []:
                scan_info = shared.SCAN_FEES.get(scan_code, {"label": scan_code, "amount": 0})
                scan_items.append({"name": scan_info["label"], "quantity": 1, "price": scan_info["amount"], "total": scan_info["amount"]})

            invoice_data = {
                "invoice_number": receipt_number,
                "date": ist_now.strftime("%d %b %Y"),
                "patient_name": appointment.get("patient_name"),
                "patient_phone": patient_phone,
                "items": [{"name": f"Consultation - {fee_info['label']}", "quantity": 1, "price": fee_info["amount"], "total": fee_info["amount"]}] + scan_items,
                "subtotal": data.final_amount,
                "discount": 0,
                "total": data.final_amount,
                "payment_status": "paid",
                "payment_method": payment_method.upper(),
                "clinic_name": appointment.get("clinic"),
                "doctor_name": appointment.get("doctor"),
                "notes": data.notes or appointment.get("completion_notes"),
            }

            pdf_base64 = get_invoice_base64(invoice_data, "diagyn")
            invoice_record = {
                "id": str(uuid.uuid4()),
                "invoice_number": receipt_number,
                "service_type": "diagyn",
                "appointment_id": data.appointment_id,
                "patient_name": appointment.get("patient_name"),
                "patient_phone": patient_phone,
                "total": data.final_amount,
                "payment_status": "paid",
                "payment_method": payment_method,
                "pdf_base64": pdf_base64,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "sent_whatsapp": False,
            }
            await shared.db.generated_invoices.insert_one(invoice_record)
            invoice_id = invoice_record["id"]

            if patient_phone:
                try:
                    from services.msg91_whatsapp import send_document_delivery

                    backend_url = os.environ.get("REACT_APP_BACKEND_URL", "https://nevikacura.com")
                    invoice_url = f"{backend_url}/api/invoices/view/{invoice_id}"
                    await send_document_delivery(
                        phone=clean_phone,
                        patient_name=appointment.get("patient_name", "Patient"),
                        document_type="Invoice",
                        from_name=appointment.get("clinic", "DiaGyn Healthcare"),
                        download_url=invoice_url,
                        reference_id=f"invoice_{receipt_number}",
                        db=shared.db,
                    )
                    await shared.db.generated_invoices.update_one(
                        {"id": invoice_id}, {"$set": {"sent_whatsapp": True, "sent_at": datetime.now(timezone.utc).isoformat()}}
                    )
                    logger.info(f"Invoice sent via WhatsApp: {receipt_number}")
                except Exception as wa_err:
                    logger.error(f"Failed to send invoice WhatsApp: {wa_err}")
        except Exception as inv_err:
            logger.error(f"Failed to generate invoice: {inv_err}")

    logger.info(f"Billing closed: {data.appointment_id} - \u20b9{data.final_amount} - Duration: {billing_duration_seconds}s")

    return {
        "success": True,
        "message": f"Bill closed \u2014 \u20b9{data.final_amount} collected. Patient notified.",
        "appointment_id": data.appointment_id,
        "final_amount": data.final_amount,
        "billing_duration_seconds": billing_duration_seconds,
        "billing_duration_display": f"{billing_duration_seconds // 60}m {billing_duration_seconds % 60}s",
        "receipt_sent": receipt_sent,
        "review_sent": review_sent,
        "invoice_id": invoice_id,
        "flagged_fast_close": flagged_fast_close,
        "amount_mismatch": amount_mismatch,
    }


# ── Billing Analytics ────────────────────────────────────────────

@router.get("/billing/analytics")
async def get_billing_analytics(clinic: Optional[str] = None, date: Optional[str] = None, staff=Depends(verify_staff)):
    query = {}
    if clinic:
        query["clinic"] = clinic
    if date:
        query["date"] = date
    else:
        query["date"] = get_ist_date()

    records = await shared.db.billing_timers.find(query, {"_id": 0}).to_list(500)

    if not records:
        return {
            "success": True,
            "date": query.get("date"),
            "total_bills": 0,
            "avg_billing_seconds": 0,
            "avg_billing_display": "0m 0s",
            "fastest_seconds": 0,
            "slowest_seconds": 0,
            "flagged_fast_close": 0,
            "amount_mismatches": 0,
            "total_collected": 0,
            "records": [],
        }

    durations = [r.get("billing_duration_seconds", 0) for r in records]
    avg_secs = int(sum(durations) / len(durations)) if durations else 0
    fastest = min(durations) if durations else 0
    slowest = max(durations) if durations else 0
    flagged = sum(1 for r in records if r.get("flagged_fast_close"))
    mismatches = sum(1 for r in records if r.get("amount_mismatch"))
    total_collected = sum(r.get("final_amount", 0) for r in records)

    return {
        "success": True,
        "date": query.get("date"),
        "total_bills": len(records),
        "avg_billing_seconds": avg_secs,
        "avg_billing_display": f"{avg_secs // 60}m {avg_secs % 60}s",
        "fastest_seconds": fastest,
        "slowest_seconds": slowest,
        "flagged_fast_close": flagged,
        "amount_mismatches": mismatches,
        "total_collected": total_collected,
        "records": records,
    }
