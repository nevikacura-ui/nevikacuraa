"""
DiaGyn Staff Portal — Cashfree payment completion + appointment lookup.
"""

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
import uuid
import os
import logging

from . import shared
from .auth import verify_staff
from .models import PaymentCompleteRequest
from .utils import get_ist_now, get_ist_date

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/appointments/lookup/{booking_code}")
async def lookup_appointment_by_code(booking_code: str, staff=Depends(verify_staff)):
    booking_code = booking_code.strip().upper()

    appointment = await shared.db.appointments.find_one(
        {
            "$or": [
                {"booking_id": {"$regex": f"^{booking_code}", "$options": "i"}},
                {"booking_id": {"$regex": booking_code, "$options": "i"}},
                {"id": {"$regex": booking_code, "$options": "i"}},
            ],
            "date": get_ist_date(),
        },
        {"_id": 0},
    )

    if not appointment:
        yesterday = (get_ist_now() - timedelta(days=1)).strftime("%Y-%m-%d")
        tomorrow = (get_ist_now() + timedelta(days=1)).strftime("%Y-%m-%d")

        appointment = await shared.db.appointments.find_one(
            {
                "$or": [
                    {"booking_id": {"$regex": f"^{booking_code}", "$options": "i"}},
                    {"booking_id": {"$regex": booking_code, "$options": "i"}},
                ],
                "date": {"$in": [yesterday, get_ist_date(), tomorrow]},
            },
            {"_id": 0},
        )

    if not appointment:
        raise HTTPException(status_code=404, detail=f"No appointment found with code '{booking_code}'")

    return {
        "success": True,
        "appointment": {
            "id": appointment.get("id"),
            "booking_id": appointment.get("booking_id"),
            "patient_name": appointment.get("patient_name"),
            "patient_phone": appointment.get("patient_phone") or appointment.get("phone"),
            "doctor": appointment.get("doctor"),
            "clinic": appointment.get("clinic"),
            "time": appointment.get("time"),
            "date": appointment.get("date"),
            "status": appointment.get("status"),
            "token_number": appointment.get("token_number"),
            "appointment_type": appointment.get("appointment_type", "SCHEDULED"),
        },
    }


@router.post("/payment/complete")
async def complete_cashfree_payment(data: PaymentCompleteRequest):
    order_id = data.order_id

    order = await shared.db.cashfree_orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Payment order not found")

    try:
        from routes.cashfree import init_cashfree, API_VERSION

        cashfree = init_cashfree()
        response = cashfree.PGFetchOrder(API_VERSION, order_id, None)

        if response and response.data:
            cf_status = response.data.order_status

            if cf_status != "PAID":
                return {"success": False, "message": f"Payment not completed. Status: {cf_status}", "order_status": cf_status}

            await shared.db.cashfree_orders.update_one(
                {"order_id": order_id},
                {"$set": {"order_status": "PAID", "payment_status": "SUCCESS", "completed_at": datetime.now(timezone.utc).isoformat()}},
            )
        else:
            return {"success": False, "message": "Could not verify payment with Cashfree"}
    except Exception as cf_error:
        logger.error(f"Cashfree verification failed: {cf_error}")
        return {"success": False, "message": f"Payment verification failed: {str(cf_error)}"}

    appointment_id = order.get("appointment_id")
    if not appointment_id:
        return {"success": True, "message": "Payment verified but no appointment linked", "order_status": "PAID"}

    appointment = await shared.db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not appointment:
        return {"success": True, "message": "Payment verified but appointment not found", "order_status": "PAID"}

    ist_now = get_ist_now()
    receipt_number = f"DG{ist_now.strftime('%Y%m%d')}{str(uuid.uuid4())[:4].upper()}"

    update_data = {
        "status": "Completed",
        "payment_status": "paid",
        "payment_method": "cashfree",
        "receipt_number": receipt_number,
        "cashfree_order_id": order_id,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }

    await shared.db.appointments.update_one({"id": appointment_id}, {"$set": update_data})

    # Generate and send receipt via WhatsApp
    try:
        from services.invoice_generator import get_invoice_base64
        from services.msg91_whatsapp import send_msg91_whatsapp

        invoice_data = {
            "invoice_number": receipt_number,
            "date": ist_now.strftime("%d %b %Y"),
            "patient_name": appointment.get("patient_name"),
            "patient_phone": appointment.get("patient_phone") or appointment.get("phone"),
            "items": [
                {
                    "name": f"Consultation - {appointment.get('doctor', 'Doctor')}",
                    "quantity": 1,
                    "price": order.get("amount", 0),
                    "total": order.get("amount", 0),
                }
            ],
            "subtotal": order.get("amount", 0),
            "discount": 0,
            "total": order.get("amount", 0),
            "payment_status": "paid",
            "payment_method": "ONLINE (CASHFREE)",
            "clinic_name": appointment.get("clinic"),
            "doctor_name": appointment.get("doctor"),
        }

        pdf_base64 = get_invoice_base64(invoice_data, "diagyn")

        invoice_record = {
            "id": str(uuid.uuid4()),
            "invoice_number": receipt_number,
            "service_type": "diagyn",
            "appointment_id": appointment_id,
            "patient_name": appointment.get("patient_name"),
            "patient_phone": appointment.get("patient_phone") or appointment.get("phone"),
            "total": order.get("amount", 0),
            "payment_status": "paid",
            "payment_method": "cashfree",
            "pdf_base64": pdf_base64,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "sent_whatsapp": False,
        }

        await shared.db.generated_invoices.insert_one(invoice_record)

        patient_phone = appointment.get("patient_phone") or appointment.get("phone")
        if patient_phone:
            clean_phone = patient_phone.replace("+", "").replace(" ", "").replace("-", "")
            if not clean_phone.startswith("91"):
                clean_phone = "91" + clean_phone

            backend_url = os.environ.get("REACT_APP_BACKEND_URL", "https://nevikacura.com")
            invoice_url = f"{backend_url}/api/invoices/view/{invoice_record['id']}"

            await send_msg91_whatsapp(
                recipient_phone=clean_phone,
                template_name="diagyn_receipt",
                variables=[
                    appointment.get("patient_name", "Patient"),
                    appointment.get("doctor", "Doctor"),
                    str(int(order.get("amount", 0))),
                    "ONLINE",
                    invoice_url,
                ],
                db=shared.db,
                reference_id=f"receipt_{receipt_number}",
                message_type="receipt",
            )

            await shared.db.generated_invoices.update_one(
                {"id": invoice_record["id"]},
                {"$set": {"sent_whatsapp": True, "sent_at": datetime.now(timezone.utc).isoformat()}},
            )

    except Exception as inv_error:
        logger.error(f"Failed to generate/send invoice for Cashfree payment: {inv_error}")

    logger.info(f"Cashfree payment completed: {order_id} -> {receipt_number}")

    return {"success": True, "message": "Payment completed successfully", "receipt_number": receipt_number, "order_status": "PAID"}
