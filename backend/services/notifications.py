"""
Nevika Cura - Notification Services
SMS, Email, WhatsApp, and Push notification utilities
"""

import os
import logging
import asyncio
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

# ============ Twilio Configuration ============
try:
    from twilio.rest import Client
    TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
    TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
    TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER")
    TWILIO_VERIFY_SERVICE_SID = os.environ.get("TWILIO_VERIFY_SERVICE_SID")
    
    if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        logger.info("Twilio client initialized successfully")
    else:
        twilio_client = None
        logger.warning("Twilio credentials not found, SMS disabled")
except Exception as e:
    twilio_client = None
    TWILIO_VERIFY_SERVICE_SID = None
    logger.warning(f"Twilio initialization failed: {e}")

# ============ Resend Configuration ============
try:
    import resend
    RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
    if RESEND_API_KEY:
        resend.api_key = RESEND_API_KEY
        logger.info("Resend email client initialized")
    else:
        logger.warning("Resend API key not found, email disabled")
except Exception as e:
    logger.warning(f"Resend initialization failed: {e}")

# ============ SMS Functions ============

async def send_sms_notification(to_number: str, message: str):
    """Send SMS via Twilio"""
    if not twilio_client or not TWILIO_PHONE_NUMBER:
        logger.warning(f"SMS disabled - would send to {to_number}: {message[:50]}...")
        return {"success": False, "error": "SMS not configured"}
    
    try:
        formatted_number = to_number.strip()
        if not formatted_number.startswith('+'):
            if len(formatted_number) == 10:
                formatted_number = f"+91{formatted_number}"
            else:
                formatted_number = f"+{formatted_number}"
        
        result = await asyncio.to_thread(
            twilio_client.messages.create,
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=formatted_number
        )
        
        logger.info(f"SMS sent to {formatted_number}: SID={result.sid}")
        return {"success": True, "sid": result.sid}
    except Exception as e:
        logger.error(f"SMS failed to {to_number}: {e}")
        return {"success": False, "error": str(e)}

async def send_twilio_otp(phone: str) -> dict:
    """Send OTP via Twilio Verify Service"""
    if not twilio_client or not TWILIO_VERIFY_SERVICE_SID:
        return {"success": False, "error": "Twilio not configured"}
    
    try:
        formatted_phone = phone.strip()
        if not formatted_phone.startswith('+'):
            if len(formatted_phone) == 10:
                formatted_phone = f"+91{formatted_phone}"
            else:
                formatted_phone = f"+{formatted_phone}"
        
        verification = await asyncio.to_thread(
            twilio_client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID)
            .verifications.create,
            to=formatted_phone,
            channel="sms"
        )
        
        logger.info(f"Twilio OTP sent to {formatted_phone}: status={verification.status}")
        return {"success": True, "status": verification.status, "phone": formatted_phone}
    except Exception as e:
        logger.error(f"Twilio OTP send failed: {str(e)}")
        return {"success": False, "error": str(e)}

async def verify_twilio_otp(phone: str, code: str) -> dict:
    """Verify OTP via Twilio Verify Service"""
    if not twilio_client or not TWILIO_VERIFY_SERVICE_SID:
        return {"success": False, "error": "Twilio not configured"}
    
    try:
        formatted_phone = phone.strip()
        if not formatted_phone.startswith('+'):
            if len(formatted_phone) == 10:
                formatted_phone = f"+91{formatted_phone}"
            else:
                formatted_phone = f"+{formatted_phone}"
        
        verification_check = await asyncio.to_thread(
            twilio_client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID)
            .verification_checks.create,
            to=formatted_phone,
            code=code
        )
        
        logger.info(f"Twilio OTP verification for {formatted_phone}: status={verification_check.status}")
        
        if verification_check.status == "approved":
            return {"success": True, "valid": True, "status": verification_check.status}
        else:
            return {"success": True, "valid": False, "status": verification_check.status}
    except Exception as e:
        error_str = str(e)
        logger.error(f"Twilio OTP verification failed: {error_str}")
        
        if "Max check attempts reached" in error_str:
            return {"success": False, "error": "Too many attempts. Request a new OTP.", "code": "MAX_ATTEMPTS"}
        return {"success": False, "error": error_str}

# ============ Email Functions ============

async def send_email_notification(
    subject: str, 
    html_content: str, 
    patient_email: str = None,
    patient_subject: str = None,
    patient_html: str = None
):
    """Send email notification via Resend"""
    try:
        import resend
        
        # Admin notification
        admin_email = os.environ.get("ADMIN_EMAIL", "csnvkp@gmail.com")
        
        await asyncio.to_thread(
            resend.Emails.send,
            {
                "from": "Nevika Cura <notifications@nevikacura.com>",
                "to": admin_email,
                "subject": subject,
                "html": html_content
            }
        )
        logger.info(f"Admin email sent: {subject}")
        
        # Patient email if provided
        if patient_email and patient_subject and patient_html:
            await asyncio.to_thread(
                resend.Emails.send,
                {
                    "from": "Nevika Cura <notifications@nevikacura.com>",
                    "to": patient_email,
                    "subject": patient_subject,
                    "html": patient_html
                }
            )
            logger.info(f"Patient email sent to {patient_email}")
        
        return {"success": True}
    except Exception as e:
        logger.error(f"Email notification failed: {e}")
        return {"success": False, "error": str(e)}

# ============ WhatsApp Functions ============

async def send_whatsapp_notification(to_number: str, message: str):
    """Send WhatsApp message via Twilio"""
    if not twilio_client:
        logger.warning(f"WhatsApp disabled - would send to {to_number}")
        return {"success": False, "error": "WhatsApp not configured"}
    
    try:
        formatted_number = to_number.strip()
        if not formatted_number.startswith('+'):
            if len(formatted_number) == 10:
                formatted_number = f"+91{formatted_number}"
            else:
                formatted_number = f"+{formatted_number}"
        
        TWILIO_WHATSAPP_NUMBER = os.environ.get("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")
        
        result = await asyncio.to_thread(
            twilio_client.messages.create,
            body=message,
            from_=TWILIO_WHATSAPP_NUMBER,
            to=f"whatsapp:{formatted_number}"
        )
        
        logger.info(f"WhatsApp sent to {formatted_number}: SID={result.sid}")
        return {"success": True, "sid": result.sid}
    except Exception as e:
        logger.error(f"WhatsApp failed: {e}")
        return {"success": False, "error": str(e)}

# ============ Appointment Notifications ============

async def send_appointment_notification(patient_phone: str, appointment_details: dict, db=None):
    """Send appointment confirmation via MSG91 WhatsApp (primary)"""
    from services.msg91_whatsapp import send_diagyn_appointment_confirmation
    
    try:
        result = await send_diagyn_appointment_confirmation(
            phone=patient_phone,
            patient_name=appointment_details.get('patient_name', 'Patient'),
            date=appointment_details.get('date', ''),
            time=appointment_details.get('time', ''),
            doctor_name=appointment_details.get('doctor', 'Doctor'),
            clinic_name=appointment_details.get('clinic', 'Clinic'),
            booking_id=appointment_details.get('booking_id', ''),
            db=db
        )
        return result
    except Exception as e:
        logger.error(f"MSG91 WhatsApp failed: {e}")
        return {"success": False, "error": str(e)}

async def send_appointment_sms(patient_phone: str, appointment_details: dict):
    """Legacy SMS - deprecated, use send_appointment_notification instead"""
    return await send_appointment_notification(patient_phone, appointment_details)

async def send_pharmacy_notification(patient_phone: str, order_details: dict, db=None):
    """Send pharmacy order confirmation via MSG91 WhatsApp"""
    from services.msg91_whatsapp import send_orange_pharmacy_confirmation
    
    try:
        result = await send_orange_pharmacy_confirmation(
            phone=patient_phone,
            patient_name=order_details.get('patient_name', 'Customer'),
            order_id=order_details.get('order_id', ''),
            items_summary=order_details.get('items_summary', 'Medicine order'),
            total=str(order_details.get('total', 0)),
            delivery_type=order_details.get('delivery_type', 'Home Delivery'),
            db=db
        )
        return result
    except Exception as e:
        logger.error(f"MSG91 Pharmacy WhatsApp failed: {e}")
        return {"success": False, "error": str(e)}

async def send_pharmacy_order_sms(patient_phone: str, order_details: dict):
    """Legacy SMS - deprecated, use send_pharmacy_notification instead"""
    return await send_pharmacy_notification(patient_phone, order_details)

async def send_diagnostic_order_sms(patient_phone: str, order_details: dict):
    """Send diagnostic order confirmation SMS"""
    message = f"""🔬 Nevika Cura - Test Booked

Order #{order_details.get('order_id', '')[:8]}

Your test booking is confirmed.
Tests: {order_details.get('test_count', 1)} test(s)
Date: {order_details.get('date', 'To be scheduled')}

We'll contact you for sample collection.

Help: 9403890429"""

    return await send_sms_notification(patient_phone, message)
