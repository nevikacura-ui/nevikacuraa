"""Booking Email Route - Dark-themed boarding pass confirmation emails via Resend."""
from fastapi import APIRouter, Request
import os
import re
import asyncio
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/send-booking-email")
async def send_booking_email(request: Request):
    """Send dark-themed booking confirmation email via Resend."""
    data = await request.json()
    email = data.get("email", "").strip()
    booking_type = data.get("type", "diagyn")
    if not email or "@" not in email:
        return {"error": "Invalid email"}
    try:
        import resend
        resend.api_key = os.environ.get("RESEND_API_KEY")
        sender = os.environ.get("SENDER_EMAIL", "Nevika Cura <onboarding@resend.dev>")

        if booking_type == "diagyn":
            from services.email_templates import dark_appointment_confirmation_email
            clinic_raw = data.get("clinic_name", "Clinic")
            clinic_clean = re.split(r',\s*(Thane|Naigaon|Vasai|Virar|Mumbai|Nalasopara)', clinic_raw)[0]
            html = dark_appointment_confirmation_email(
                patient_name=data.get("patient_name", "Patient"),
                booking_id=data.get("booking_id", "---"),
                doctor_name=data.get("doctor_name", "Doctor"),
                clinic_name=clinic_clean,
                appointment_date=data.get("appointment_date", ""),
                session=data.get("session", ""),
                time_slot=data.get("time_slot", ""),
                amount=data.get("amount", ""),
                phone=data.get("phone", ""),
            )
            subject = f"DiaGyn - Appointment Confirmed #{data.get('booking_id', '')}"

        elif booking_type == "mango":
            from services.email_templates import dark_diagnostic_booking_email
            html = dark_diagnostic_booking_email(
                patient_name=data.get("patient_name", "Patient"),
                booking_id=data.get("booking_id", "---"),
                tests=data.get("tests", []),
                preferred_date=data.get("preferred_date", data.get("appointment_date", "")),
                time_slot=data.get("time_slot", ""),
                collection_type=data.get("collection_type", "Home Collection"),
                total_amount=data.get("total_amount", data.get("amount", "")),
                phone=data.get("phone", ""),
            )
            subject = f"Mango Labs - Booking Confirmed #{data.get('booking_id', '')}"

        elif booking_type in ("orange", "pharmacy"):
            from services.email_templates import dark_pharmacy_order_email
            html = dark_pharmacy_order_email(
                patient_name=data.get("patient_name", "Patient"),
                order_id=data.get("booking_id", "---"),
                items=data.get("items", []),
                total_amount=data.get("total_amount", data.get("amount", "")),
                payment_method=data.get("payment_method", "COD"),
                delivery_address=data.get("delivery_address", ""),
                phone=data.get("phone", ""),
            )
            subject = f"Orange Pharmacy - Order Confirmed #{data.get('booking_id', '')}"
        else:
            return {"error": "Unknown booking type"}

        email_result = await asyncio.to_thread(
            resend.Emails.send,
            {"from": sender, "to": [email], "subject": subject, "html": html}
        )
        logger.info(f"Booking email sent to {email} for {booking_type}: {email_result}")
        return {"success": True, "email_id": email_result.get("id") if isinstance(email_result, dict) else str(email_result)}

    except Exception as e:
        logger.error(f"send-booking-email error: {e}")
        return {"error": str(e)}
