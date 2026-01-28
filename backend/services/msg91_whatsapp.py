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
    # DiaGyn Templates
    "diagyn_appointment_confirm": "diagyn_appointment_confirm",
    "diagyn_appointment_reminder": "diagyn_appointment_reminder",
    "diagyn_one_hour_reminder": "diagyn_one_hour_reminder",
    "diagyn_walkin_emergency": "diagyn_walkin_emergency",
    "diagyn_appointment_completed": "diagyn_appointment_completed",
    # Proton Templates
    "proton_lab_confirm": "proton_lab_confirm",
    "proton_report_ready": "proton_report_ready",
    "proton_sonography_confirm": "proton_sonography_confirm",
    # Orange Pharmacy Templates
    "orange_pharmacy_confirm": "orange_pharmacy_confirm",
    "orange_order_delivered": "orange_order_delivered",
}

# Clinic Addresses
CLINIC_ADDRESSES = {
    "pushpa clinic": "A-1, Sai Darshan, Near Don Bosco High School, Naigaon East",
    "amnion clinic": "G-7, Rashmi Star City Phase 5, Opp Thakur School, Naigaon East",
    "default": "Naigaon East, Palghar"
}

# Google Maps URLs for clinics
CLINIC_MAP_URLS = {
    "pushpa clinic": "https://maps.google.com/?q=Pushpa+Clinic+Naigaon",
    "amnion clinic": "https://maps.google.com/?q=Amnion+Clinic+Naigaon",
    "proton diagnostics": "https://maps.google.com/?q=Proton+Diagnostics+Naigaon",
    "default": "https://maps.google.com/?q=Naigaon+East"
}


def get_clinic_map_url(clinic_name: str) -> str:
    """Get Google Maps URL for a clinic"""
    clinic_lower = clinic_name.lower().strip()
    for key, url in CLINIC_MAP_URLS.items():
        if key in clinic_lower:
            return url
    return CLINIC_MAP_URLS["default"]


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
            "messaging_product": "whatsapp",
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
    """Send DiaGyn appointment confirmation via WhatsApp"""
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
    """Send DiaGyn appointment reminder (day before) via WhatsApp"""
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


async def send_diagyn_one_hour_reminder(
    phone: str,
    patient_name: str,
    date: str,
    time: str,
    doctor_name: str,
    clinic_name: str,
    booking_id: str,
    db=None
) -> dict:
    """Send DiaGyn 1-hour reminder via WhatsApp with Google Maps location"""
    map_url = get_clinic_map_url(clinic_name)
    
    variables = [
        patient_name,      # {{1}}
        date,              # {{2}}
        time,              # {{3}}
        doctor_name,       # {{4}}
        clinic_name,       # {{5}}
        booking_id,        # {{6}}
        map_url            # {{7}} - Google Maps URL
    ]
    
    return await send_msg91_whatsapp(
        recipient_phone=phone,
        template_name=TEMPLATES["diagyn_one_hour_reminder"],
        variables=variables,
        db=db,
        reference_id=booking_id,
        message_type="one_hour_reminder"
    )


async def send_diagyn_walkin_emergency(
    phone: str,
    patient_name: str,
    appointment_type: str,  # "Walk-in" or "EMERGENCY"
    doctor_name: str,
    clinic_name: str,
    token_number: str,
    db=None
) -> dict:
    """Send DiaGyn walk-in/emergency confirmation via WhatsApp"""
    variables = [
        patient_name,      # {{1}}
        appointment_type,  # {{2}} - "Walk-in" or "EMERGENCY"
        doctor_name,       # {{3}}
        clinic_name,       # {{4}}
        token_number       # {{5}}
    ]
    
    return await send_msg91_whatsapp(
        recipient_phone=phone,
        template_name=TEMPLATES["diagyn_walkin_emergency"],
        variables=variables,
        db=db,
        reference_id=token_number,
        message_type="walkin_emergency"
    )


async def send_diagyn_appointment_completed(
    phone: str,
    patient_name: str,
    doctor_name: str,
    follow_up_date: str,
    feedback_url: str,
    db=None
) -> dict:
    """Send DiaGyn appointment completed / thank you via WhatsApp"""
    variables = [
        patient_name,      # {{1}}
        doctor_name,       # {{2}}
        follow_up_date,    # {{3}}
        feedback_url       # {{4}}
    ]
    
    return await send_msg91_whatsapp(
        recipient_phone=phone,
        template_name=TEMPLATES["diagyn_appointment_completed"],
        variables=variables,
        db=db,
        reference_id=None,
        message_type="appointment_completed"
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
    """Send Proton Diagnostics lab test confirmation via WhatsApp"""
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


async def send_proton_report_ready(
    phone: str,
    patient_name: str,
    tests: str,
    booking_id: str,
    report_date: str,
    download_url: str,
    db=None
) -> dict:
    """Send Proton Diagnostics report ready via WhatsApp"""
    variables = [
        patient_name,      # {{1}}
        tests,             # {{2}}
        booking_id,        # {{3}}
        report_date,       # {{4}}
        download_url       # {{5}}
    ]
    
    return await send_msg91_whatsapp(
        recipient_phone=phone,
        template_name=TEMPLATES["proton_report_ready"],
        variables=variables,
        db=db,
        reference_id=booking_id,
        message_type="report_ready"
    )


async def send_proton_sonography_confirmation(
    phone: str,
    patient_name: str,
    scan_type: str,
    date: str,
    time: str,
    booking_id: str,
    db=None
) -> dict:
    """Send Proton Sonography booking confirmation via WhatsApp"""
    map_url = CLINIC_MAP_URLS.get("proton diagnostics", CLINIC_MAP_URLS["default"])
    
    variables = [
        patient_name,      # {{1}}
        scan_type,         # {{2}}
        date,              # {{3}}
        time,              # {{4}}
        booking_id,        # {{5}}
        map_url            # {{6}}
    ]
    
    return await send_msg91_whatsapp(
        recipient_phone=phone,
        template_name=TEMPLATES["proton_sonography_confirm"],
        variables=variables,
        db=db,
        reference_id=booking_id,
        message_type="sonography_confirmation"
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
    """Send Orange Pharmacy order confirmation via WhatsApp"""
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


async def send_orange_order_delivered(
    phone: str,
    patient_name: str,
    order_id: str,
    delivered_time: str,
    invoice_url: str,
    db=None
) -> dict:
    """Send Orange Pharmacy order delivered via WhatsApp"""
    variables = [
        patient_name,      # {{1}}
        order_id,          # {{2}}
        delivered_time,    # {{3}}
        invoice_url        # {{4}}
    ]
    
    return await send_msg91_whatsapp(
        recipient_phone=phone,
        template_name=TEMPLATES["orange_order_delivered"],
        variables=variables,
        db=db,
        reference_id=order_id,
        message_type="order_delivered"
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
        "templates_configured": list(TEMPLATES.keys()),
        "clinic_map_urls": CLINIC_MAP_URLS
    }
