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
    # Mango Templates
    "proton_lab_confirm": "proton_lab_confirm",
    "proton_report_ready": "proton_report_ready",
    "proton_report_delivered": "proton_report_delivered",
    "proton_sonography_confirm": "proton_sonography_confirm",
    # Mango Status Update Templates
    "mango_sample_collected": "mango_sample_collected",
    "mango_processing": "mango_processing",
    "mango_reports_ready": "mango_reports_ready",
    # Orange Pharmacy Templates
    "orange_pharmacy_confirm": "orange_pharmacy_confirm",
    "orange_order_delivered": "orange_order_delivered",
    # Orange Pharmacy Status Update Templates
    "orange_order_confirmed": "orange_order_confirmed",
    "orange_order_packed": "orange_order_packed",
    "orange_order_dispatched": "orange_order_dispatched",
    # Payment Templates
    "payment_link_reminder": "payment_link_reminder",
    # Unified Document Delivery Template (for prescription/invoice/report)
    "document_delivery": "document_delivery",
    # Unified Cancellation/Refund Template (for all services)
    "order_cancelled": "order_cancelled",
    "refund_initiated": "refund_initiated",
    # DiaGyn Check-in Template
    "patient_checkin": "patient_checkin",
    # DiaGyn Clinic Switch Template
    "diagyn_clinic_switch": "appointment_clinic_update",
}

# Clinic Addresses
CLINIC_ADDRESSES = {
    "pushpa clinic": "A-4, Sai Darshan, Near Don Bosco High School, Naigaon East",
    "amnion clinic": "G-7, Rashmi Star City Phase 5, Opp Thakur School, Naigaon East (Now at Pushpa Clinic)",
    "default": "Naigaon East, Palghar"
}

# Google Maps URLs for clinics
CLINIC_MAP_URLS = {
    "pushpa clinic": "https://maps.google.com/?q=Pushpa+Clinic+Naigaon",
    "amnion clinic": "https://maps.google.com/?q=Amnion+Clinic+Naigaon",
    "mango health labs": "https://maps.google.com/?q=Mango+Health+Labs+Naigaon",
    "default": "https://maps.google.com/?q=Naigaon+East"
}


async def send_payment_link_whatsapp(
    recipient_phone: str,
    customer_name: str,
    order_id: str,
    amount: float,
    payment_link: str,
    order_type: str = "lab_test",
    items_description: str = None,
    db=None
) -> dict:
    """
    Send payment link via WhatsApp using MSG91's interactive message feature
    Similar to Truemeds style payment reminder
    """
    if not MSG91_AUTH_KEY:
        logger.warning("MSG91_AUTH_KEY not configured")
        return {"success": False, "error": "MSG91 not configured"}
    
    # Clean phone number
    clean_phone = str(recipient_phone).replace("+", "").replace(" ", "").replace("-", "")
    if len(clean_phone) == 10:
        clean_phone = "91" + clean_phone
    elif not clean_phone.startswith("91"):
        clean_phone = "91" + clean_phone[-10:]
    
    # Format order type for display
    order_type_display = "Lab Test" if order_type == "lab_test" else "Medicine Order"
    brand_name = "Mango Health Labs" if order_type == "lab_test" else "Orange Pharmacy"
    
    # Short order ID for display
    short_order_id = order_id[-8:] if len(order_id) > 8 else order_id
    
    url = f"{MSG91_BASE_URL}/whatsapp/whatsapp-outbound-message/"
    
    # Try using payment_link_reminder template first
    # Template variables: [customer_name, order_id, amount, order_type, payment_link]
    payload = {
        "integrated_number": MSG91_WHATSAPP_NUMBER,
        "content_type": "template",
        "messaging_product": "whatsapp",
        "payload": {
            "messaging_product": "whatsapp",
            "to": clean_phone,
            "type": "template",
            "template": {
                "name": "payment_link_reminder",
                "language": {
                    "code": "en",
                    "policy": "deterministic"
                },
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": customer_name},
                            {"type": "text", "text": short_order_id},
                            {"type": "text", "text": f"₹{amount:.2f}"},
                            {"type": "text", "text": order_type_display},
                            {"type": "text", "text": payment_link}
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
        
        logger.info(f"MSG91 Payment Link Response - Status: {response.status_code}, Data: {response_data}")
        
        success = (
            response.status_code == 200 and 
            response_data.get("type") != "error" and
            response_data.get("status") == "success"
        )
        
        if success:
            logger.info(f"✅ Payment link WhatsApp sent to {clean_phone}")
            return {"success": True, "request_id": response_data.get("data", {}).get("message_uuid")}
        else:
            error_msg = response_data.get("message", str(response_data))
            logger.warning(f"Template failed, trying alternative: {error_msg}")
            
            # If template fails, return with link generated status
            return {"success": False, "error": error_msg, "link_generated": True}
            
    except Exception as e:
        logger.error(f"Payment link WhatsApp failed: {e}")
        return {"success": False, "error": str(e)}


async def send_payment_reminder_whatsapp(
    phone: str,
    patient_name: str,
    amount: float,
    order_id: str
) -> dict:
    """
    Send payment reminder via WhatsApp when order is Ready for Pickup
    Uses the payment_link_reminder template
    """
    if not MSG91_AUTH_KEY:
        logger.warning("MSG91_AUTH_KEY not configured for payment reminder")
        return {"success": False, "error": "MSG91 not configured"}
    
    # Clean phone number
    clean_phone = str(phone).replace("+", "").replace(" ", "").replace("-", "")
    if len(clean_phone) == 10:
        clean_phone = "91" + clean_phone
    elif not clean_phone.startswith("91"):
        clean_phone = "91" + clean_phone[-10:]
    
    short_order_id = order_id[-8:] if len(order_id) > 8 else order_id
    
    url = f"{MSG91_BASE_URL}/whatsapp/whatsapp-outbound-message/"
    
    # Use payment_link_reminder template
    # Variables: customer_name, order_id, amount, order_type, payment_link
    payload = {
        "integrated_number": MSG91_WHATSAPP_NUMBER,
        "content_type": "template",
        "messaging_product": "whatsapp",
        "payload": {
            "messaging_product": "whatsapp",
            "to": clean_phone,
            "type": "template",
            "template": {
                "name": "payment_link_reminder",
                "language": {
                    "code": "en",
                    "policy": "deterministic"
                },
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": patient_name},
                            {"type": "text", "text": short_order_id},
                            {"type": "text", "text": f"₹{amount:.2f}"},
                            {"type": "text", "text": "Medicine Order"},
                            {"type": "text", "text": "Payment pending - please visit store"}
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
        
        logger.info(f"Payment reminder response: {response_data}")
        
        if response.status_code == 200 and response_data.get("status") == "success":
            logger.info(f"✅ Payment reminder sent to {clean_phone} for order {order_id}")
            return {"success": True, "request_id": response_data.get("data", {}).get("message_uuid")}
        else:
            error_msg = response_data.get("message", str(response_data))
            logger.warning(f"Payment reminder failed: {error_msg}")
            return {"success": False, "error": error_msg}
            
    except Exception as e:
        logger.error(f"Payment reminder WhatsApp failed: {e}")
        return {"success": False, "error": str(e)}


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
    # Debug: Log the exact template name received
    logger.info(f"📤 send_msg91_whatsapp called with template_name: '{template_name}'")
    
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
    
    # Build parameters list — MSG91 rejects newlines in body values
    parameters = [{"type": "text", "text": str(var).replace("\n", " ").replace("\r", "")} for var in variables]
    
    payload = {
        "integrated_number": MSG91_WHATSAPP_NUMBER,
        "content_type": "template",
        "messaging_product": "whatsapp",
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
        
        # Log full response for debugging
        logger.info(f"MSG91 Response - Status: {response.status_code}, Data: {response_data}")
        
        # Check for success - MSG91 returns status: "success" or hasError: false
        success = (
            response.status_code == 200 and 
            response_data.get("type") != "error" and
            response_data.get("status") == "success" and
            not response_data.get("hasError", True)
        )
        
        # Extract message_uuid from nested data object
        data_obj = response_data.get("data") or {}
        request_id = data_obj.get("message_uuid", response_data.get("request_id", response_data.get("id", "unknown")))
        
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
    """Send DiaGyn appointment confirmation via WhatsApp
    
    Template includes check-in instruction directly in the message body.
    """
    clinic_lower = clinic_name.lower().strip()
    address = CLINIC_ADDRESSES.get(clinic_lower, CLINIC_ADDRESSES["default"])
    
    # The check-in instruction is part of the booking_id variable itself
    # Format: "1234 - Please show this ID to staff at check-in"
    booking_id_with_instruction = f"{booking_id}\n\nPlease show this Booking ID to the staff when you arrive for check-in."
    
    variables = [
        patient_name,               # {{1}}
        date,                       # {{2}}
        time,                       # {{3}}
        doctor_name,                # {{4}}
        clinic_name,                # {{5}}
        booking_id_with_instruction, # {{6}} - Includes check-in instruction
        address                     # {{7}}
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
    total_amount: str = "N/A",
    payment_link: str = "",
    db=None
) -> dict:
    """Send DiaGyn appointment completed / thank you via WhatsApp with payment link"""
    # Combine payment link into feedback_url if payment exists, else keep review link
    combined_link = payment_link if payment_link else feedback_url
    amount_display = f"₹{total_amount}" if total_amount and total_amount != "N/A" and total_amount != "0" else "Paid"
    
    variables = [
        patient_name,      # {{1}} - Patient name
        doctor_name,       # {{2}} - Doctor name
        follow_up_date,    # {{3}} - Follow-up date
        amount_display,    # {{4}} - Total amount
        combined_link      # {{5}} - Payment/Review link
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
# Mango Health Labs Templates
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
    """Send Mango Health Labs lab test confirmation via WhatsApp"""
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
    """Send Mango Health Labs report ready via WhatsApp"""
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


async def send_proton_report_delivered(
    phone: str,
    patient_name: str,
    tests: str,
    booking_id: str,
    delivery_date: str,
    delivery_time: str,
    delivered_by: str,
    db=None
) -> dict:
    """
    Send Mango Health Labs report delivered notification via WhatsApp
    
    Template variables:
    {{1}} - Patient Name
    {{2}} - Test Names
    {{3}} - Booking ID
    {{4}} - Delivery Date
    {{5}} - Delivery Time
    {{6}} - Delivered By (staff name)
    """
    variables = [
        patient_name,      # {{1}} - Patient Name
        tests,             # {{2}} - Test Names  
        booking_id,        # {{3}} - Booking ID
        delivery_date,     # {{4}} - Delivery Date
        delivery_time,     # {{5}} - Delivery Time
        delivered_by       # {{6}} - Delivered By
    ]
    
    return await send_msg91_whatsapp(
        recipient_phone=phone,
        template_name=TEMPLATES["proton_report_delivered"],
        variables=variables,
        db=db,
        reference_id=booking_id,
        message_type="report_delivered"
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
# Orange Pharmacy Status Update Templates
# =============================================

async def send_orange_order_confirmed(
    phone: str,
    patient_name: str,
    order_id: str,
    items: str,
    estimated_time: str,
    db=None
) -> dict:
    """
    Send Orange Pharmacy order confirmed status via WhatsApp
    
    Template: orange_order_confirmed
    Message: Hi {{1}}! Your order #{{2}} has been confirmed.
    Items: {{3}}
    Estimated delivery: {{4}}
    Our pharmacist will call you shortly to confirm availability.
    Track: nevikacura.com/track
    """
    variables = [
        patient_name,      # {{1}} - Customer name
        order_id,          # {{2}} - Order ID
        items,             # {{3}} - Items ordered
        estimated_time     # {{4}} - Estimated delivery time
    ]
    
    return await send_msg91_whatsapp(
        recipient_phone=phone,
        template_name=TEMPLATES["orange_order_confirmed"],
        variables=variables,
        db=db,
        reference_id=order_id,
        message_type="order_confirmed"
    )


async def send_orange_order_packed(
    phone: str,
    patient_name: str,
    order_id: str,
    total_amount: str,
    payment_status: str,
    db=None
) -> dict:
    """
    Send Orange Pharmacy order packed status via WhatsApp
    
    Template: orange_order_packed
    Message: Hi {{1}}! Great news - your order #{{2}} is packed and ready!
    Total: {{3}}
    Payment: {{4}}
    Our delivery partner will pick it up shortly.
    Track: nevikacura.com/track
    """
    variables = [
        patient_name,      # {{1}} - Customer name
        order_id,          # {{2}} - Order ID
        total_amount,      # {{3}} - Total amount (e.g., "₹450")
        payment_status     # {{4}} - Payment status (e.g., "Paid" or "Cash on Delivery")
    ]
    
    return await send_msg91_whatsapp(
        recipient_phone=phone,
        template_name=TEMPLATES["orange_order_packed"],
        variables=variables,
        db=db,
        reference_id=order_id,
        message_type="order_packed"
    )


async def send_orange_order_dispatched(
    phone: str,
    patient_name: str,
    order_id: str,
    delivery_partner: str,
    estimated_arrival: str,
    contact_number: str,
    db=None
) -> dict:
    """
    Send Orange Pharmacy order dispatched status via WhatsApp
    
    Template: orange_order_dispatched
    Message: Hi {{1}}! Your order #{{2}} is on the way!
    Delivery by: {{3}}
    Arriving in: {{4}}
    Contact: {{5}}
    Keep your payment ready if Cash on Delivery.
    Track: nevikacura.com/track
    """
    variables = [
        patient_name,      # {{1}} - Customer name
        order_id,          # {{2}} - Order ID
        delivery_partner,  # {{3}} - Delivery partner name
        estimated_arrival, # {{4}} - ETA (e.g., "30-45 mins")
        contact_number     # {{5}} - Delivery contact number
    ]
    
    return await send_msg91_whatsapp(
        recipient_phone=phone,
        template_name=TEMPLATES["orange_order_dispatched"],
        variables=variables,
        db=db,
        reference_id=order_id,
        message_type="order_dispatched"
    )


# =============================================
# Mango Health Labs Status Update Templates
# =============================================

async def send_mango_sample_collected(
    phone: str,
    patient_name: str,
    booking_id: str,
    tests: str,
    collected_by: str,
    collection_time: str,
    db=None
) -> dict:
    """
    Send Mango Health Labs sample collected status via WhatsApp
    
    Template: mango_sample_collected
    Message: Hi {{1}}! Your sample for booking #{{2}} has been collected.
    Tests: {{3}}
    Collected by: {{4}} at {{5}}
    Your sample is being transported to our NABL certified lab.
    Reports expected within 6-24 hours.
    Track: nevikacura.com/track
    """
    variables = [
        patient_name,      # {{1}} - Patient name
        booking_id,        # {{2}} - Booking ID
        tests,             # {{3}} - Test names
        collected_by,      # {{4}} - Phlebotomist name
        collection_time    # {{5}} - Collection time
    ]
    
    return await send_msg91_whatsapp(
        recipient_phone=phone,
        template_name=TEMPLATES["mango_sample_collected"],
        variables=variables,
        db=db,
        reference_id=booking_id,
        message_type="sample_collected"
    )


async def send_mango_processing(
    phone: str,
    patient_name: str,
    booking_id: str,
    tests: str,
    expected_time: str,
    db=None
) -> dict:
    """
    Send Mango Health Labs processing status via WhatsApp
    
    Template: mango_processing
    Message: Hi {{1}}! Your tests for booking #{{2}} are now being processed.
    Tests: {{3}}
    Expected completion: {{4}}
    We'll notify you as soon as your reports are ready!
    Track: nevikacura.com/track
    """
    variables = [
        patient_name,      # {{1}} - Patient name
        booking_id,        # {{2}} - Booking ID
        tests,             # {{3}} - Test names
        expected_time      # {{4}} - Expected completion time
    ]
    
    return await send_msg91_whatsapp(
        recipient_phone=phone,
        template_name=TEMPLATES["mango_processing"],
        variables=variables,
        db=db,
        reference_id=booking_id,
        message_type="processing"
    )


async def send_mango_reports_ready(
    phone: str,
    patient_name: str,
    booking_id: str,
    tests: str,
    report_url: str,
    db=None
) -> dict:
    """
    Send Mango Health Labs reports ready status via WhatsApp
    
    Template: mango_reports_ready
    Message: Hi {{1}}! Great news - your reports for booking #{{2}} are ready!
    Tests: {{3}}
    Download your reports: {{4}}
    For any queries, please consult your doctor.
    Thank you for choosing Mango Health Labs!
    """
    variables = [
        patient_name,      # {{1}} - Patient name
        booking_id,        # {{2}} - Booking ID
        tests,             # {{3}} - Test names
        report_url         # {{4}} - Report download URL
    ]
    
    return await send_msg91_whatsapp(
        recipient_phone=phone,
        template_name=TEMPLATES["mango_reports_ready"],
        variables=variables,
        db=db,
        reference_id=booking_id,
        message_type="reports_ready"
    )



# =============================================
# DiaGyn Patient Check-in Notification
# =============================================

async def send_patient_checkin_notification(
    phone: str,
    patient_name: str,
    token_number: str,
    doctor_name: str,
    clinic_name: str,
    db=None
):
    """
    Send WhatsApp notification when patient is checked in at clinic.
    
    MSG91 Template: patient_checkin
    Variables:
    - {{patient_name}} - Patient's name
    - {{token_number}} - Assigned token (e.g., S001, W002)
    - {{doctor_name}} - Doctor's name
    - {{clinic_name}} - Clinic location
    """
    return await send_whatsapp_template(
        phone=phone,
        template_name=TEMPLATES["patient_checkin"],
        variables={
            "patient_name": patient_name,
            "token_number": token_number,
            "doctor_name": doctor_name,
            "clinic_name": clinic_name
        },
        db=db,
        reference_id=f"checkin_{token_number}",
        message_type="patient_checkin"
    )



# =============================================
# Unified Document Delivery (Prescription/Invoice/Report)
# =============================================

async def send_document_delivery(
    phone: str,
    patient_name: str,
    document_type: str,  # "prescription", "invoice", "report"
    from_name: str,      # Doctor name or "Nevika Cura"
    download_url: str,
    reference_id: str = None,
    db=None
) -> dict:
    """
    Send unified document delivery notification via WhatsApp
    Works for prescriptions, invoices, and reports
    
    Template format (to be registered in MSG91):
    "document_delivery" template:
    Hi {{1}},
    
    Your {{2}} from {{3}} is ready!
    
    Download: {{4}}
    
    For queries: 9833188288
    - Nevika Cura
    
    Variables:
    {{1}} - Patient Name
    {{2}} - Document Type (Prescription/Invoice/Report)
    {{3}} - From Name (Doctor name or Nevika Cura)
    {{4}} - Download URL
    """
    # Format document type for display
    doc_type_display = document_type.capitalize()
    if document_type.lower() == "prescription":
        doc_type_display = "Prescription"
    elif document_type.lower() == "invoice":
        doc_type_display = "Invoice"
    elif document_type.lower() == "report":
        doc_type_display = "Lab Report"
    
    variables = [
        patient_name,      # {{1}} - Patient Name
        doc_type_display,  # {{2}} - Document Type
        from_name,         # {{3}} - From Name
        download_url       # {{4}} - Download URL
    ]
    
    return await send_msg91_whatsapp(
        recipient_phone=phone,
        template_name=TEMPLATES.get("document_delivery", "document_delivery"),
        variables=variables,
        db=db,
        reference_id=reference_id,
        message_type=f"document_delivery_{document_type}"
    )


# =============================================
# Unified Cancellation/Refund (All Services)
# =============================================

async def send_order_cancelled(
    phone: str,
    patient_name: str,
    service_name: str,      # "DiaGyn" / "Orange Pharmacy" / "Mango Labs"
    order_id: str,
    db=None
) -> dict:
    """
    Send unified order/appointment cancellation notification
    Works for DiaGyn appointments, Orange Pharmacy orders, and Mango Labs bookings
    
    Template format (registered in MSG91):
    "order_cancelled" template:
    Hi {{1}},
    
    Your {{2}} booking #{{3}} has been cancelled.
    
    Need help? Call 9833188288
    - Nevika Cura
    
    Variables:
    {{1}} - Patient Name
    {{2}} - Service Name (DiaGyn/Orange Pharmacy/Mango Labs)
    {{3}} - Order/Booking ID
    """
    variables = [
        patient_name,      # {{1}} - Patient Name
        service_name,      # {{2}} - Service Name
        order_id           # {{3}} - Order/Booking ID
    ]
    
    return await send_msg91_whatsapp(
        recipient_phone=phone,
        template_name=TEMPLATES.get("order_cancelled", "order_cancelled"),
        variables=variables,
        db=db,
        reference_id=order_id,
        message_type=f"cancellation_{service_name.lower().replace(' ', '_')}"
    )


async def send_refund_initiated(
    phone: str,
    patient_name: str,
    service_name: str,      # "DiaGyn" / "Orange Pharmacy" / "Mango Labs"
    order_id: str,
    amount: str,            # "₹500" or "$30"
    refund_timeline: str = "3-5 business days",
    db=None
) -> dict:
    """
    Send unified refund notification
    Works for all services
    
    Template format (to be registered in MSG91):
    "refund_initiated" template:
    Hi {{1}},
    
    Refund of {{2}} for your {{3}} order #{{4}} has been initiated.
    
    Expected: {{5}}
    
    Questions? 9833188288
    - Nevika Cura
    
    Variables:
    {{1}} - Patient Name
    {{2}} - Amount
    {{3}} - Service Name
    {{4}} - Order ID
    {{5}} - Refund Timeline
    """
    variables = [
        patient_name,      # {{1}} - Patient Name
        amount,            # {{2}} - Amount
        service_name,      # {{3}} - Service Name
        order_id,          # {{4}} - Order ID
        refund_timeline    # {{5}} - Timeline
    ]
    
    return await send_msg91_whatsapp(
        recipient_phone=phone,
        template_name=TEMPLATES.get("refund_initiated", "refund_initiated"),
        variables=variables,
        db=db,
        reference_id=order_id,
        message_type=f"refund_{service_name.lower().replace(' ', '_')}"
    )


# =============================================
# Clinic Switch Notification
# =============================================

async def send_clinic_switch_whatsapp(
    recipient_phone: str,
    patient_name: str,
    doctor_name: str,
    new_clinic: str,
    appointment_date: str,
    session: str,
    db=None
) -> dict:
    """
    Send clinic switch WhatsApp notification to patient via MSG91 template.
    
    Template: appointment_clinic_update
    
    Dear {{1}},
    Appointment Update
    Your appointment with Dr. {{2}} has been shifted to:
    {{3}}
    {{4}} | {{5}}
    Date & time remain the same — only location has changed.
    For help/directions: 9403890429
    – Team DiaGyn
    
    Variables:
    {{1}} - Patient Name
    {{2}} - Doctor Name
    {{3}} - New Clinic Name
    {{4}} - Appointment Date
    {{5}} - Session Time
    """
    session_display = "Morning (11:30 AM - 2:00 PM)" if session == "morning" else "Evening (6:00 PM - 10:00 PM)"

    variables = [
        patient_name,       # {{1}}
        doctor_name,        # {{2}}
        new_clinic,         # {{3}}
        appointment_date,   # {{4}}
        session_display,    # {{5}}
    ]

    return await send_msg91_whatsapp(
        recipient_phone=recipient_phone,
        template_name=TEMPLATES.get("diagyn_clinic_switch", "appointment_clinic_update"),
        variables=variables,
        db=db,
        message_type="clinic_switch"
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
