"""
Nevika Cura - Notification Services
Email and MSG91 WhatsApp notification utilities
Note: Twilio SMS has been removed - using MSG91 WhatsApp for all messaging
"""

import os
import logging
import asyncio
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

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

# ============ MSG91 WhatsApp Notifications ============

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

async def send_pharmacy_notification(patient_phone: str, order_details: dict, db=None):
    """Send pharmacy order confirmation via MSG91 WhatsApp"""
    from services.msg91_whatsapp import send_orange_pharmacy_confirmation
    
    try:
        result = await send_orange_pharmacy_confirmation(
            phone=patient_phone,
            patient_name=order_details.get('patient_name', 'Customer'),
            order_id=order_details.get('order_id', ''),
            items=order_details.get('items_summary', 'Medicine order'),
            delivery_address=order_details.get('delivery_address', 'Home Delivery'),
            db=db
        )
        return result
    except Exception as e:
        logger.error(f"MSG91 Pharmacy WhatsApp failed: {e}")
        return {"success": False, "error": str(e)}

async def send_diagnostic_notification(patient_phone: str, order_details: dict, db=None):
    """Send diagnostic order confirmation via MSG91 WhatsApp"""
    from services.msg91_whatsapp import send_proton_lab_confirmation
    
    try:
        result = await send_proton_lab_confirmation(
            phone=patient_phone,
            patient_name=order_details.get('patient_name', 'Patient'),
            tests=order_details.get('tests', 'Lab tests'),
            preferred_date=order_details.get('date', 'To be scheduled'),
            preferred_time=order_details.get('time', 'Morning'),
            booking_id=order_details.get('order_id', ''),
            address=order_details.get('address', 'Proton Diagnostics, Naigaon'),
            db=db
        )
        return result
    except Exception as e:
        logger.error(f"MSG91 Diagnostic WhatsApp failed: {e}")
        return {"success": False, "error": str(e)}

async def send_report_ready_notification(patient_phone: str, report_details: dict, db=None):
    """Send Proton report ready notification via MSG91 WhatsApp"""
    from services.msg91_whatsapp import send_proton_report_ready
    
    try:
        result = await send_proton_report_ready(
            phone=patient_phone,
            patient_name=report_details.get('patient_name', 'Patient'),
            tests=report_details.get('tests', 'Lab tests'),
            booking_id=report_details.get('order_id', ''),
            report_date=report_details.get('report_date', datetime.now().strftime('%d/%m/%Y')),
            download_url=report_details.get('download_url', 'https://nevikacura.com/reports'),
            db=db
        )
        return result
    except Exception as e:
        logger.error(f"MSG91 Report Ready WhatsApp failed: {e}")
        return {"success": False, "error": str(e)}
