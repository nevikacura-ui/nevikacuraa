"""
WhatsApp Notification Routes
Professional WhatsApp messages via Twilio WhatsApp API
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
import logging

from services.whatsapp_service import (
    get_appointment_confirmation_message,
    get_appointment_reminder_message,
    get_appointment_completion_message,
    get_pharmacy_order_message,
    get_lab_report_ready_message,
    get_emergency_alert_message
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp Notifications"])

# Will be injected from server.py
send_whatsapp = None

def set_whatsapp_function(func):
    global send_whatsapp
    send_whatsapp = func


class WhatsAppMessageRequest(BaseModel):
    phone: str = Field(..., description="Phone number with country code")
    message: str = Field(..., description="Message to send")


class AppointmentNotificationRequest(BaseModel):
    phone: str
    patient_name: str
    doctor_name: str
    clinic_name: str
    date: str
    time: str


class AppointmentCompletionRequest(BaseModel):
    phone: str
    patient_name: str
    doctor_name: str
    clinic_name: str


class PharmacyOrderNotificationRequest(BaseModel):
    phone: str
    patient_name: str
    order_id: str
    medicines: List[str]
    status: str = "confirmed"


class LabReportNotificationRequest(BaseModel):
    phone: str
    patient_name: str
    test_name: str
    order_id: str


# ==========================================
# Status Endpoint
# ==========================================

@router.get("/status")
async def get_whatsapp_status():
    """Check WhatsApp/Twilio configuration status"""
    return {
        "configured": send_whatsapp is not None,
        "provider": "Twilio WhatsApp API",
        "status": "ready" if send_whatsapp else "not_configured"
    }


# ==========================================
# Message Sending Endpoints
# ==========================================

@router.post("/send")
async def send_custom_message(request: WhatsAppMessageRequest):
    """Send a custom WhatsApp message"""
    if not send_whatsapp:
        raise HTTPException(status_code=503, detail="WhatsApp not configured")
    
    result = await send_whatsapp(request.phone, request.message)
    
    if result.get("type") == "error":
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    return result


@router.post("/send/appointment-confirmation")
async def send_appointment_confirmation(request: AppointmentNotificationRequest):
    """Send appointment confirmation via WhatsApp"""
    if not send_whatsapp:
        raise HTTPException(status_code=503, detail="WhatsApp not configured")
    
    message = get_appointment_confirmation_message(
        patient_name=request.patient_name,
        doctor_name=request.doctor_name,
        clinic_name=request.clinic_name,
        date=request.date,
        time=request.time
    )
    
    result = await send_whatsapp(request.phone, message)
    
    if result.get("type") == "error":
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    return {
        **result,
        "notification_type": "appointment_confirmation"
    }


@router.post("/send/appointment-reminder")
async def send_appointment_reminder(request: AppointmentNotificationRequest):
    """Send appointment reminder via WhatsApp"""
    if not send_whatsapp:
        raise HTTPException(status_code=503, detail="WhatsApp not configured")
    
    message = get_appointment_reminder_message(
        patient_name=request.patient_name,
        doctor_name=request.doctor_name,
        clinic_name=request.clinic_name,
        date=request.date,
        time=request.time
    )
    
    result = await send_whatsapp(request.phone, message)
    
    if result.get("type") == "error":
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    return {
        **result,
        "notification_type": "appointment_reminder"
    }


@router.post("/send/appointment-completion")
async def send_appointment_completion(request: AppointmentCompletionRequest):
    """Send appointment completion notification via WhatsApp"""
    if not send_whatsapp:
        raise HTTPException(status_code=503, detail="WhatsApp not configured")
    
    message = get_appointment_completion_message(
        patient_name=request.patient_name,
        doctor_name=request.doctor_name,
        clinic_name=request.clinic_name
    )
    
    result = await send_whatsapp(request.phone, message)
    
    if result.get("type") == "error":
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    return {
        **result,
        "notification_type": "appointment_completion"
    }


@router.post("/send/pharmacy-order")
async def send_pharmacy_order_notification(request: PharmacyOrderNotificationRequest):
    """Send pharmacy order update via WhatsApp"""
    if not send_whatsapp:
        raise HTTPException(status_code=503, detail="WhatsApp not configured")
    
    message = get_pharmacy_order_message(
        patient_name=request.patient_name,
        order_id=request.order_id,
        medicines=request.medicines,
        status=request.status
    )
    
    result = await send_whatsapp(request.phone, message)
    
    if result.get("type") == "error":
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    return {
        **result,
        "notification_type": "pharmacy_order_update"
    }


@router.post("/send/lab-report")
async def send_lab_report_notification(request: LabReportNotificationRequest):
    """Send lab report ready notification via WhatsApp"""
    if not send_whatsapp:
        raise HTTPException(status_code=503, detail="WhatsApp not configured")
    
    message = get_lab_report_ready_message(
        patient_name=request.patient_name,
        test_name=request.test_name,
        order_id=request.order_id
    )
    
    result = await send_whatsapp(request.phone, message)
    
    if result.get("type") == "error":
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    return {
        **result,
        "notification_type": "lab_report_ready"
    }


# ==========================================
# Templates Info Endpoint
# ==========================================

@router.get("/templates")
async def get_message_templates():
    """Get available WhatsApp message templates"""
    return {
        "templates": [
            {
                "name": "appointment_confirmation",
                "description": "Sent when appointment is booked",
                "required_params": ["patient_name", "doctor_name", "clinic_name", "date", "time"],
                "endpoint": "/api/whatsapp/send/appointment-confirmation"
            },
            {
                "name": "appointment_reminder",
                "description": "Sent day before appointment",
                "required_params": ["patient_name", "doctor_name", "clinic_name", "date", "time"],
                "endpoint": "/api/whatsapp/send/appointment-reminder"
            },
            {
                "name": "appointment_completion",
                "description": "Sent when consultation is complete",
                "required_params": ["patient_name", "doctor_name", "clinic_name"],
                "endpoint": "/api/whatsapp/send/appointment-completion"
            },
            {
                "name": "pharmacy_order",
                "description": "Sent for pharmacy order updates",
                "required_params": ["patient_name", "order_id", "medicines", "status"],
                "endpoint": "/api/whatsapp/send/pharmacy-order"
            },
            {
                "name": "lab_report",
                "description": "Sent when lab report is ready",
                "required_params": ["patient_name", "test_name", "order_id"],
                "endpoint": "/api/whatsapp/send/lab-report"
            }
        ],
        "provider": "MSG91 WhatsApp Business API",
        "meta_approval_status": "Templates auto-submitted to Meta via MSG91",
        "note": "Submit/manage templates at MSG91 Dashboard → WhatsApp → Templates. Templates are routed to Meta for approval automatically. OTP template 'nevika_otp_verify' is already approved and active."
    }
