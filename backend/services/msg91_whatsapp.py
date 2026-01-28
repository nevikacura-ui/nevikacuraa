"""
MSG91 WhatsApp API Service for Nevika Cura
Professional WhatsApp notifications for appointments, lab tests, and pharmacy orders
"""
import httpx
import logging
import os
from datetime import datetime, timezone
from typing import Optional, List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

# MSG91 Configuration
MSG91_AUTH_KEY = os.environ.get("MSG91_AUTH_KEY")
MSG91_BASE_URL = "https://control.msg91.com/api/v5"
MSG91_WHATSAPP_NUMBER = os.environ.get("MSG91_WHATSAPP_NUMBER", "918108888330")

# Log configuration status
logger.info(f"MSG91 Auth Key configured: {bool(MSG91_AUTH_KEY)}")
logger.info(f"MSG91 WhatsApp Number: {MSG91_WHATSAPP_NUMBER}")

# Template Names (as registered in MSG91)
TEMPLATES = {
    "diagyn_appointment_confirm": "diagyn_appointment_confirm",
    "diagyn_appointment_reminder": "diagyn_appointment_reminder", 
    "proton_lab_confirm": "proton_lab_confirm",
    "orange_pharmacy_confirm": "orange_pharmacy_confirm",
}

# Clinic Addresses
CLINIC_ADDRESSES = {
    "pushpa clinic": "A-1, Sai Darshan, Near Don Bosco High School, Naigaon East",
    "amnion clinic": "G-7, Rashmi Star City Phase 5, Opp Thakur School, Naigaon East",
    "default": "Naigaon East, Palghar"
}


async def send_msg91_whatsapp(
    recipient_phone: str,
    template_name: str,
    variables: List[str],
    db=None,
    reference_id: str = None,
    message_type: str = "notification"
) -> dict:
    """
    Send WhatsApp message via MSG91 API
    
    Args:
        recipient_phone: Phone number (with or without country code)
        template_name: Pre-approved MSG91 template name
        variables: List of variable values for template placeholders
        db: MongoDB database instance for logging
        reference_id: Optional appointment/order ID for tracking
        message_type: Type of message (confirmation, reminder, etc.)
    
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
    
    url = f"{MSG91_BASE_URL}/whatsapp/whatsapp-outbound-message/"
    
    # Build parameters list
    parameters = [{"type": "text", "text": str(var)} for var in variables]
    
    payload = {
        "integrated_number": MSG91_WHATSAPP_NUMBER,
        "content_type": "template",
        "payload": {
            "to": clean_phone,
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
                        "parameters": parameters
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
        if db is not None:
            try:
                await db.whatsapp_logs.insert_one({
                    "reference_id": reference_id,
                    "recipient_phone": clean_phone,
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
            logger.info(f"✅ MSG91 WhatsApp sent to {clean_phone} using template '{template_name}': {request_id}")
            return {"success": True, "request_id": request_id, "to": clean_phone}
        else:
            error_msg = response_data.get("message", str(response_data))
            logger.error(f"❌ MSG91 WhatsApp failed: {error_msg}")
            return {"success": False, "error": error_msg, "response": response_data}
            
    except httpx.RequestError as e:
        logger.error(f"❌ MSG91 request failed: {e}")
        return {"success": False, "error": str(e)}
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        return {"success": False, "error": str(e)}


# =============================================
# DiaGyn Healthcare Templates
# =============================================

async def send_diagyn_appointment_confirmation(
    phone: str,
    patient_name: str,
    date: str,
    time: str,
    doctor_name: str,
    clinic_name: str,
    booking_id: str,
    db=None
) -> dict:
    """
    Send DiaGyn appointment confirmation via WhatsApp
    
    Template variables:
    {{1}} = Patient Name
    {{2}} = Date
    {{3}} = Time
    {{4}} = Doctor Name
    {{5}} = Clinic Name
    {{6}} = Booking ID
    {{7}} = Address
    """
    # Get clinic address
    clinic_lower = clinic_name.lower().strip()
    address = CLINIC_ADDRESSES.get(clinic_lower, CLINIC_ADDRESSES["default"])
    
    variables = [
        patient_name,      # {{1}}
        date,              # {{2}}
        time,              # {{3}}
        doctor_name,       # {{4}}
        clinic_name,       # {{5}}
        booking_id,        # {{6}}
        address            # {{7}}
    ]
    
    return await send_msg91_whatsapp(
        recipient_phone=phone,
        template_name=TEMPLATES["diagyn_appointment_confirm"],
        variables=variables,
        db=db,
        reference_id=booking_id,
        message_type="appointment_confirmation"
    )


async def send_diagyn_appointment_reminder(
    phone: str,
    patient_name: str,
    date: str,
    time: str,
    doctor_name: str,
    clinic_name: str,
    booking_id: str,
    db=None
) -> dict:
    """
    Send DiaGyn appointment reminder via WhatsApp
    
    Template variables:
    {{1}} = Patient Name
    {{2}} = Date
    {{3}} = Time
    {{4}} = Doctor Name
    {{5}} = Clinic Name
    {{6}} = Booking ID
    {{7}} = Address
    """
    clinic_lower = clinic_name.lower().strip()
    address = CLINIC_ADDRESSES.get(clinic_lower, CLINIC_ADDRESSES["default"])
    
    variables = [
        patient_name,      # {{1}}
        date,              # {{2}}
        time,              # {{3}}
        doctor_name,       # {{4}}
        clinic_name,       # {{5}}
        booking_id,        # {{6}}
        address            # {{7}}
    ]
    
    return await send_msg91_whatsapp(
        recipient_phone=phone,
        template_name=TEMPLATES["diagyn_appointment_reminder"],
        variables=variables,
        db=db,
        reference_id=booking_id,
        message_type="appointment_reminder"
    )


# =============================================
# Proton Diagnostics Templates
# =============================================

async def send_proton_lab_confirmation(
    phone: str,
    patient_name: str,
    tests: str,
    preferred_date: str,
    preferred_time: str,
    booking_id: str,
    address: str,
    db=None
) -> dict:
    """
    Send Proton Diagnostics lab test confirmation via WhatsApp
    
    Template variables:
    {{1}} = Patient Name
    {{2}} = Tests
    {{3}} = Preferred Date
    {{4}} = Preferred Time
    {{5}} = Booking ID
    {{6}} = Home Collection Address
    """
    variables = [
        patient_name,      # {{1}}
        tests,             # {{2}}
        preferred_date,    # {{3}}
        preferred_time,    # {{4}}
        booking_id,        # {{5}}
        address            # {{6}}
    ]
    
    return await send_msg91_whatsapp(
        recipient_phone=phone,
        template_name=TEMPLATES["proton_lab_confirm"],
        variables=variables,
        db=db,
        reference_id=booking_id,
        message_type="lab_confirmation"
    )


# =============================================
# Orange Pharmacy Templates
# =============================================

async def send_orange_pharmacy_confirmation(
    phone: str,
    patient_name: str,
    order_id: str,
    items: str,
    delivery_address: str,
    db=None
) -> dict:
    """
    Send Orange Pharmacy order confirmation via WhatsApp
    
    Template variables:
    {{1}} = Patient Name
    {{2}} = Order ID
    {{3}} = Items
    {{4}} = Delivery Address
    """
    variables = [
        patient_name,      # {{1}}
        order_id,          # {{2}}
        items,             # {{3}}
        delivery_address   # {{4}}
    ]
    
    return await send_msg91_whatsapp(
        recipient_phone=phone,
        template_name=TEMPLATES["orange_pharmacy_confirm"],
        variables=variables,
        db=db,
        reference_id=order_id,
        message_type="pharmacy_confirmation"
    )


# =============================================
# Test Function
# =============================================

async def test_msg91_connection() -> dict:
    """Test MSG91 API connection"""
    if not MSG91_AUTH_KEY:
        return {"success": False, "error": "MSG91_AUTH_KEY not configured"}
    
    return {
        "success": True,
        "auth_key_configured": True,
        "whatsapp_number": MSG91_WHATSAPP_NUMBER,
        "templates_configured": list(TEMPLATES.keys())
    }
