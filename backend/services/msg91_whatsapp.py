"""
MSG91 WhatsApp API Service for Nevika Cura
Cost-effective WhatsApp notifications for appointments
"""
import httpx
import logging
import os
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

# MSG91 Configuration
MSG91_AUTH_KEY = os.environ.get("MSG91_AUTH_KEY")
MSG91_BASE_URL = "https://control.msg91.com/api/v5"
MSG91_WHATSAPP_NUMBER = os.environ.get("MSG91_WHATSAPP_NUMBER", "919403890429")


async def send_msg91_whatsapp(
    recipient_phone: str,
    template_name: str,
    variables: list,
    db=None,
    appointment_id: str = None,
    message_type: str = "notification"
) -> dict:
    """
    Send WhatsApp message via MSG91 API
    
    Args:
        recipient_phone: Phone number (with or without country code)
        template_name: Pre-approved MSG91 template name
        variables: List of variable values for template placeholders
        db: MongoDB database instance for logging
        appointment_id: Optional appointment ID for tracking
        message_type: Type of message (confirmation, reminder, completion)
    
    Returns:
        dict with success status and request_id
    """
    if not MSG91_AUTH_KEY:
        logger.warning("MSG91_AUTH_KEY not configured")
        return {"success": False, "error": "MSG91 not configured"}
    
    # Clean and format phone number
    clean_phone = str(recipient_phone).replace("+", "").replace(" ", "").replace("-", "")
    
    # Add India country code if not present
    if len(clean_phone) == 10:
        clean_phone = "91" + clean_phone
    elif not clean_phone.startswith("91"):
        clean_phone = "91" + clean_phone[-10:]
    
    # Format with + for API
    formatted_phone = f"+{clean_phone}"
    
    url = f"{MSG91_BASE_URL}/whatsapp/whatsapp-outbound-message/"
    
    payload = {
        "integrated_number": MSG91_WHATSAPP_NUMBER,
        "content_type": "template",
        "payload": {
            "to": formatted_phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {
                    "code": "en",
                    "policy": "deterministic"
                },
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": str(var)} for var in variables
                        ]
                    }
                ]
            }
        }
    }
    
    headers = {
        "authkey": MSG91_AUTH_KEY,
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response_data = response.json()
        
        success = response.status_code == 200 and response_data.get("type") != "error"
        request_id = response_data.get("request_id", response_data.get("id", "unknown"))
        
        # Log to database if available
        if db:
            try:
                await db.whatsapp_logs.insert_one({
                    "appointment_id": appointment_id,
                    "recipient_phone": formatted_phone,
                    "template_name": template_name,
                    "message_type": message_type,
                    "variables": variables,
                    "status": "sent" if success else "failed",
                    "msg91_request_id": request_id,
                    "response": response_data,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
            except Exception as e:
                logger.error(f"Failed to log WhatsApp message: {e}")
        
        if success:
            logger.info(f"✅ MSG91 WhatsApp sent to {formatted_phone}: {request_id}")
            return {"success": True, "request_id": request_id, "to": formatted_phone}
        else:
            error_msg = response_data.get("message", "Unknown error")
            logger.error(f"❌ MSG91 WhatsApp failed: {error_msg}")
            return {"success": False, "error": error_msg}
            
    except httpx.RequestError as e:
        logger.error(f"❌ MSG91 request failed: {e}")
        return {"success": False, "error": str(e)}
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        return {"success": False, "error": str(e)}


# =============================================
# Template-Specific Functions
# =============================================

async def send_appointment_confirmation_msg91(
    phone: str,
    patient_name: str,
    doctor_name: str,
    clinic_name: str,
    date: str,
    time: str,
    db=None,
    appointment_id: str = None
) -> dict:
    """Send appointment confirmation via MSG91 WhatsApp"""
    variables = [patient_name, doctor_name, clinic_name, date, time]
    return await send_msg91_whatsapp(
        recipient_phone=phone,
        template_name="appointment_confirmation",
        variables=variables,
        db=db,
        appointment_id=appointment_id,
        message_type="confirmation"
    )


async def send_appointment_reminder_msg91(
    phone: str,
    patient_name: str,
    doctor_name: str,
    clinic_name: str,
    date: str,
    time: str,
    db=None,
    appointment_id: str = None
) -> dict:
    """Send appointment reminder via MSG91 WhatsApp"""
    variables = [patient_name, doctor_name, date, time]
    return await send_msg91_whatsapp(
        recipient_phone=phone,
        template_name="appointment_reminder",
        variables=variables,
        db=db,
        appointment_id=appointment_id,
        message_type="reminder"
    )


async def send_appointment_completion_msg91(
    phone: str,
    patient_name: str,
    doctor_name: str,
    clinic_name: str,
    db=None,
    appointment_id: str = None
) -> dict:
    """Send consultation completion notification via MSG91 WhatsApp"""
    variables = [patient_name, doctor_name, clinic_name]
    return await send_msg91_whatsapp(
        recipient_phone=phone,
        template_name="consultation_complete",
        variables=variables,
        db=db,
        appointment_id=appointment_id,
        message_type="completion"
    )


async def send_pharmacy_order_msg91(
    phone: str,
    patient_name: str,
    order_id: str,
    status: str,
    db=None
) -> dict:
    """Send pharmacy order update via MSG91 WhatsApp"""
    variables = [patient_name, order_id, status]
    return await send_msg91_whatsapp(
        recipient_phone=phone,
        template_name="pharmacy_order_update",
        variables=variables,
        db=db,
        message_type="pharmacy"
    )


async def send_lab_report_msg91(
    phone: str,
    patient_name: str,
    test_name: str,
    order_id: str,
    db=None
) -> dict:
    """Send lab report ready notification via MSG91 WhatsApp"""
    variables = [patient_name, test_name, order_id]
    return await send_msg91_whatsapp(
        recipient_phone=phone,
        template_name="lab_report_ready",
        variables=variables,
        db=db,
        message_type="lab_report"
    )


# =============================================
# Fallback: Direct Text Message (if templates not ready)
# =============================================

async def send_msg91_text_message(
    recipient_phone: str,
    message: str,
    db=None
) -> dict:
    """
    Send plain text WhatsApp message (only works within 24-hour window)
    Use this for replies or when templates are pending approval
    """
    if not MSG91_AUTH_KEY:
        return {"success": False, "error": "MSG91 not configured"}
    
    # Clean phone number
    clean_phone = str(recipient_phone).replace("+", "").replace(" ", "").replace("-", "")
    if len(clean_phone) == 10:
        clean_phone = "91" + clean_phone
    formatted_phone = f"+{clean_phone}"
    
    url = f"{MSG91_BASE_URL}/whatsapp/whatsapp-outbound-message/"
    
    payload = {
        "integrated_number": MSG91_WHATSAPP_NUMBER,
        "content_type": "text",
        "payload": {
            "to": formatted_phone,
            "type": "text",
            "text": {
                "body": message
            }
        }
    }
    
    headers = {
        "authkey": MSG91_AUTH_KEY,
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response_data = response.json()
        
        success = response.status_code == 200
        
        if success:
            logger.info(f"✅ MSG91 text message sent to {formatted_phone}")
            return {"success": True, "to": formatted_phone}
        else:
            error_msg = response_data.get("message", "Unknown error")
            logger.error(f"❌ MSG91 text message failed: {error_msg}")
            return {"success": False, "error": error_msg}
            
    except Exception as e:
        logger.error(f"❌ Error sending text message: {e}")
        return {"success": False, "error": str(e)}
