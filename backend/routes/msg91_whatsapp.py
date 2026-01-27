"""
MSG91 WhatsApp API Routes
Cost-effective WhatsApp notifications for Nevika Cura
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import os
import logging

from services.msg91_whatsapp import (
    send_msg91_whatsapp,
    send_appointment_confirmation_msg91,
    send_appointment_reminder_msg91,
    send_appointment_completion_msg91,
    send_pharmacy_order_msg91,
    send_lab_report_msg91,
    send_msg91_text_message
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/msg91-whatsapp", tags=["MSG91 WhatsApp"])

# Database reference (will be injected)
db = None

def set_db(database):
    global db
    db = database


# ==========================================
# Request Models
# ==========================================

class AppointmentConfirmationRequest(BaseModel):
    phone: str = Field(..., description="Patient phone number")
    patient_name: str
    doctor_name: str
    clinic_name: str
    date: str
    time: str
    appointment_id: Optional[str] = None


class AppointmentCompletionRequest(BaseModel):
    phone: str
    patient_name: str
    doctor_name: str
    clinic_name: str
    appointment_id: Optional[str] = None


class PharmacyOrderRequest(BaseModel):
    phone: str
    patient_name: str
    order_id: str
    status: str = "confirmed"


class LabReportRequest(BaseModel):
    phone: str
    patient_name: str
    test_name: str
    order_id: str


class TextMessageRequest(BaseModel):
    phone: str
    message: str


# ==========================================
# Status & Configuration
# ==========================================

@router.get("/status")
async def get_msg91_status():
    """Check MSG91 WhatsApp configuration status"""
    auth_key = os.environ.get("MSG91_AUTH_KEY")
    whatsapp_number = os.environ.get("MSG91_WHATSAPP_NUMBER", "919403890429")
    
    return {
        "provider": "MSG91",
        "configured": bool(auth_key),
        "whatsapp_number": whatsapp_number if auth_key else None,
        "status": "ready" if auth_key else "not_configured",
        "pricing": {
            "utility_message": "~₹0.15-0.20 per message",
            "monthly_fee": "Pay-as-you-go (no monthly fee)",
            "note": "Much cheaper than Twilio!"
        }
    }


@router.get("/setup-guide")
async def get_setup_guide():
    """Get MSG91 setup instructions"""
    return {
        "steps": [
            {
                "step": 1,
                "title": "Create MSG91 Account",
                "description": "Sign up at https://msg91.com",
                "url": "https://msg91.com/signup"
            },
            {
                "step": 2,
                "title": "Get Auth Key",
                "description": "Go to MSG91 Dashboard > Top navigation > Authkey > Create New",
                "note": "Name it 'nevika-cura-whatsapp' and enable IP security"
            },
            {
                "step": 3,
                "title": "Subscribe to WhatsApp",
                "description": "Enable WhatsApp Business API in your MSG91 account",
                "url": "https://msg91.com/whatsapp"
            },
            {
                "step": 4,
                "title": "Create Templates",
                "description": "Submit templates for approval (usually 24 hours)",
                "templates_needed": [
                    "appointment_confirmation",
                    "appointment_reminder", 
                    "consultation_complete",
                    "pharmacy_order_update",
                    "lab_report_ready"
                ]
            },
            {
                "step": 5,
                "title": "Add Credentials",
                "description": "Add MSG91_AUTH_KEY and MSG91_WHATSAPP_NUMBER to backend/.env"
            }
        ],
        "template_examples": {
            "appointment_confirmation": "Hi {{1}}, your appointment with Dr. {{2}} at {{3}} on {{4}} at {{5}} is confirmed. Please arrive 15 minutes early.",
            "appointment_reminder": "Reminder: {{1}}, your appointment with Dr. {{2}} is tomorrow on {{3}} at {{4}}. Reply CONFIRM or CANCEL.",
            "consultation_complete": "Hi {{1}}, your consultation with Dr. {{2}} at {{3}} is complete. View prescription in app. Get well soon!",
            "pharmacy_order_update": "Hi {{1}}, your order #{{2}} status: {{3}}. Track in Nevika Cura app.",
            "lab_report_ready": "Hi {{1}}, your {{2}} report (Order #{{3}}) is ready. Download from Nevika Cura app."
        },
        "pricing_info": {
            "signup": "Free",
            "utility_messages_india": "₹0.15-0.20 per message",
            "marketing_messages_india": "₹0.70-0.90 per message",
            "authentication_messages": "₹0.13-0.15 per message"
        }
    }


# ==========================================
# Send Message Endpoints
# ==========================================

@router.post("/send/appointment-confirmation")
async def send_appointment_confirmation(request: AppointmentConfirmationRequest):
    """Send appointment confirmation via MSG91 WhatsApp"""
    
    result = await send_appointment_confirmation_msg91(
        phone=request.phone,
        patient_name=request.patient_name,
        doctor_name=request.doctor_name,
        clinic_name=request.clinic_name,
        date=request.date,
        time=request.time,
        db=db,
        appointment_id=request.appointment_id
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to send"))
    
    return {
        **result,
        "message_type": "appointment_confirmation"
    }


@router.post("/send/appointment-reminder")
async def send_appointment_reminder(request: AppointmentConfirmationRequest):
    """Send appointment reminder via MSG91 WhatsApp"""
    
    result = await send_appointment_reminder_msg91(
        phone=request.phone,
        patient_name=request.patient_name,
        doctor_name=request.doctor_name,
        clinic_name=request.clinic_name,
        date=request.date,
        time=request.time,
        db=db,
        appointment_id=request.appointment_id
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to send"))
    
    return {
        **result,
        "message_type": "appointment_reminder"
    }


@router.post("/send/appointment-completion")
async def send_appointment_completion(request: AppointmentCompletionRequest):
    """Send consultation completion notification via MSG91 WhatsApp"""
    
    result = await send_appointment_completion_msg91(
        phone=request.phone,
        patient_name=request.patient_name,
        doctor_name=request.doctor_name,
        clinic_name=request.clinic_name,
        db=db,
        appointment_id=request.appointment_id
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to send"))
    
    return {
        **result,
        "message_type": "appointment_completion"
    }


@router.post("/send/pharmacy-order")
async def send_pharmacy_order(request: PharmacyOrderRequest):
    """Send pharmacy order update via MSG91 WhatsApp"""
    
    result = await send_pharmacy_order_msg91(
        phone=request.phone,
        patient_name=request.patient_name,
        order_id=request.order_id,
        status=request.status,
        db=db
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to send"))
    
    return {
        **result,
        "message_type": "pharmacy_order"
    }


@router.post("/send/lab-report")
async def send_lab_report(request: LabReportRequest):
    """Send lab report ready notification via MSG91 WhatsApp"""
    
    result = await send_lab_report_msg91(
        phone=request.phone,
        patient_name=request.patient_name,
        test_name=request.test_name,
        order_id=request.order_id,
        db=db
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to send"))
    
    return {
        **result,
        "message_type": "lab_report"
    }


@router.post("/send/text")
async def send_text_message(request: TextMessageRequest):
    """
    Send plain text WhatsApp message
    Note: Only works within 24-hour customer-initiated window
    """
    
    result = await send_msg91_text_message(
        recipient_phone=request.phone,
        message=request.message,
        db=db
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to send"))
    
    return {
        **result,
        "message_type": "text"
    }


# ==========================================
# Templates Info
# ==========================================

@router.get("/templates")
async def get_templates_info():
    """Get information about MSG91 WhatsApp templates"""
    return {
        "templates": [
            {
                "name": "appointment_confirmation",
                "category": "utility",
                "variables": ["patient_name", "doctor_name", "clinic_name", "date", "time"],
                "example": "Hi John, your appointment with Dr. Smith at Pushpa Clinic on 28 Jan 2026 at 10:00 AM is confirmed.",
                "cost": "~₹0.16/message"
            },
            {
                "name": "appointment_reminder",
                "category": "utility", 
                "variables": ["patient_name", "doctor_name", "date", "time"],
                "example": "Reminder: John, your appointment with Dr. Smith is tomorrow on 28 Jan 2026 at 10:00 AM.",
                "cost": "~₹0.16/message"
            },
            {
                "name": "consultation_complete",
                "category": "utility",
                "variables": ["patient_name", "doctor_name", "clinic_name"],
                "example": "Hi John, your consultation with Dr. Smith at Pushpa Clinic is complete. View prescription in app.",
                "cost": "~₹0.16/message"
            },
            {
                "name": "pharmacy_order_update",
                "category": "utility",
                "variables": ["patient_name", "order_id", "status"],
                "example": "Hi John, your order #ORD123 status: Confirmed. Track in Nevika Cura app.",
                "cost": "~₹0.16/message"
            },
            {
                "name": "lab_report_ready",
                "category": "utility",
                "variables": ["patient_name", "test_name", "order_id"],
                "example": "Hi John, your CBC Test report (Order #LAB456) is ready. Download from Nevika Cura app.",
                "cost": "~₹0.16/message"
            }
        ],
        "total_cost_estimate": {
            "per_appointment": "₹0.48 (confirmation + reminder + completion)",
            "1000_appointments_monthly": "~₹480/month",
            "comparison": "Twilio would cost ~₹1,300+ for same volume"
        }
    }
