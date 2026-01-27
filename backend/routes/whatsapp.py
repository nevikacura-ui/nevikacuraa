"""
WhatsApp Notification Routes
Cost-effective alternative to Twilio for appointment reminders
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
import logging

from services.whatsapp_service import (
    initialize_whatsapp,
    get_whatsapp_qr,
    check_whatsapp_connection,
    send_whatsapp_message,
    get_appointment_confirmation_message,
    get_appointment_reminder_message,
    get_pharmacy_order_message,
    get_lab_report_ready_message
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp Notifications"])


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
# Connection Management Endpoints
# ==========================================

@router.post("/initialize")
async def init_whatsapp():
    """
    Initialize WhatsApp connection
    Returns QR code requirement status
    """
    result = await initialize_whatsapp()
    return result


@router.get("/qr-code")
async def get_qr_code():
    """
    Get QR code for WhatsApp pairing
    Scan this with your WhatsApp mobile app
    """
    result = await get_whatsapp_qr()
    return result


@router.get("/status")
async def get_connection_status():
    """
    Check if WhatsApp is connected
    """
    result = await check_whatsapp_connection()
    return result


# ==========================================
# Message Sending Endpoints
# ==========================================

@router.post("/send")
async def send_message(request: WhatsAppMessageRequest):
    """
    Send a custom WhatsApp message
    """
    result = await send_whatsapp_message(request.phone, request.message)
    
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("message"))
    
    return result


@router.post("/send/appointment-confirmation")
async def send_appointment_confirmation(request: AppointmentNotificationRequest):
    """
    Send appointment confirmation via WhatsApp
    """
    message = get_appointment_confirmation_message(
        patient_name=request.patient_name,
        doctor_name=request.doctor_name,
        clinic_name=request.clinic_name,
        date=request.date,
        time=request.time
    )
    
    result = await send_whatsapp_message(request.phone, message)
    
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("message"))
    
    return {
        **result,
        "notification_type": "appointment_confirmation"
    }


@router.post("/send/appointment-reminder")
async def send_appointment_reminder(request: AppointmentNotificationRequest):
    """
    Send appointment reminder via WhatsApp
    """
    message = get_appointment_reminder_message(
        patient_name=request.patient_name,
        doctor_name=request.doctor_name,
        clinic_name=request.clinic_name,
        date=request.date,
        time=request.time
    )
    
    result = await send_whatsapp_message(request.phone, message)
    
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("message"))
    
    return {
        **result,
        "notification_type": "appointment_reminder"
    }


@router.post("/send/pharmacy-order")
async def send_pharmacy_order_notification(request: PharmacyOrderNotificationRequest):
    """
    Send pharmacy order update via WhatsApp
    """
    message = get_pharmacy_order_message(
        patient_name=request.patient_name,
        order_id=request.order_id,
        medicines=request.medicines,
        status=request.status
    )
    
    result = await send_whatsapp_message(request.phone, message)
    
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("message"))
    
    return {
        **result,
        "notification_type": "pharmacy_order_update"
    }


@router.post("/send/lab-report")
async def send_lab_report_notification(request: LabReportNotificationRequest):
    """
    Send lab report ready notification via WhatsApp
    """
    message = get_lab_report_ready_message(
        patient_name=request.patient_name,
        test_name=request.test_name,
        order_id=request.order_id
    )
    
    result = await send_whatsapp_message(request.phone, message)
    
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("message"))
    
    return {
        **result,
        "notification_type": "lab_report_ready"
    }


# ==========================================
# Utility Endpoints
# ==========================================

@router.get("/templates")
async def get_message_templates():
    """
    Get available message templates and their parameters
    """
    return {
        "templates": [
            {
                "name": "appointment_confirmation",
                "description": "Send when appointment is booked",
                "required_params": ["patient_name", "doctor_name", "clinic_name", "date", "time"],
                "endpoint": "/api/whatsapp/send/appointment-confirmation"
            },
            {
                "name": "appointment_reminder",
                "description": "Send day before appointment",
                "required_params": ["patient_name", "doctor_name", "clinic_name", "date", "time"],
                "endpoint": "/api/whatsapp/send/appointment-reminder"
            },
            {
                "name": "pharmacy_order",
                "description": "Send pharmacy order updates",
                "required_params": ["patient_name", "order_id", "medicines", "status"],
                "endpoint": "/api/whatsapp/send/pharmacy-order"
            },
            {
                "name": "lab_report",
                "description": "Send when lab report is ready",
                "required_params": ["patient_name", "test_name", "order_id"],
                "endpoint": "/api/whatsapp/send/lab-report"
            }
        ],
        "info": {
            "service": "Baileys WhatsApp Integration",
            "cost": "FREE (no per-message charges)",
            "note": "Requires QR code scan to connect your WhatsApp Business number"
        }
    }
