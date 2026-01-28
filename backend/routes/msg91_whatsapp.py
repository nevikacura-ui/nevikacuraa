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
    send_diagyn_appointment_confirmation,
    send_diagyn_appointment_reminder,
    send_proton_lab_confirmation,
    send_orange_pharmacy_confirmation,
    test_msg91_connection
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

class DiaGynAppointmentRequest(BaseModel):
    phone: str = Field(..., description="Patient phone number")
    patient_name: str
    date: str
    time: str
    doctor_name: str
    clinic_name: str
    booking_id: str


class ProtonLabRequest(BaseModel):
    phone: str
    patient_name: str
    tests: str
    preferred_date: str
    preferred_time: str
    booking_id: str
    address: str


class OrangePharmacyRequest(BaseModel):
    phone: str
    patient_name: str
    order_id: str
    items: str
    delivery_address: str


# ==========================================
# API Endpoints
# ==========================================

@router.get("/status")
async def check_msg91_status():
    """Check MSG91 WhatsApp configuration status"""
    return await test_msg91_connection()


@router.post("/send/diagyn-appointment")
async def send_diagyn_appointment(request: DiaGynAppointmentRequest):
    """Send DiaGyn appointment confirmation via WhatsApp"""
    try:
        result = await send_diagyn_appointment_confirmation(
            phone=request.phone,
            patient_name=request.patient_name,
            date=request.date,
            time=request.time,
            doctor_name=request.doctor_name,
            clinic_name=request.clinic_name,
            booking_id=request.booking_id,
            db=db
        )
        
        if result.get("success"):
            return {"success": True, "message": "WhatsApp sent successfully", "details": result}
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Failed to send WhatsApp"))
    except Exception as e:
        logger.error(f"Failed to send DiaGyn appointment WhatsApp: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send/diagyn-reminder")
async def send_diagyn_reminder(request: DiaGynAppointmentRequest):
    """Send DiaGyn appointment reminder via WhatsApp"""
    try:
        result = await send_diagyn_appointment_reminder(
            phone=request.phone,
            patient_name=request.patient_name,
            date=request.date,
            time=request.time,
            doctor_name=request.doctor_name,
            clinic_name=request.clinic_name,
            booking_id=request.booking_id,
            db=db
        )
        
        if result.get("success"):
            return {"success": True, "message": "Reminder WhatsApp sent successfully", "details": result}
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Failed to send WhatsApp"))
    except Exception as e:
        logger.error(f"Failed to send DiaGyn reminder WhatsApp: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send/proton-lab")
async def send_proton_lab(request: ProtonLabRequest):
    """Send Proton Diagnostics lab confirmation via WhatsApp"""
    try:
        result = await send_proton_lab_confirmation(
            phone=request.phone,
            patient_name=request.patient_name,
            tests=request.tests,
            preferred_date=request.preferred_date,
            preferred_time=request.preferred_time,
            booking_id=request.booking_id,
            address=request.address,
            db=db
        )
        
        if result.get("success"):
            return {"success": True, "message": "Lab WhatsApp sent successfully", "details": result}
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Failed to send WhatsApp"))
    except Exception as e:
        logger.error(f"Failed to send Proton lab WhatsApp: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send/orange-pharmacy")
async def send_orange_pharmacy(request: OrangePharmacyRequest):
    """Send Orange Pharmacy order confirmation via WhatsApp"""
    try:
        result = await send_orange_pharmacy_confirmation(
            phone=request.phone,
            patient_name=request.patient_name,
            order_id=request.order_id,
            items=request.items,
            delivery_address=request.delivery_address,
            db=db
        )
        
        if result.get("success"):
            return {"success": True, "message": "Pharmacy WhatsApp sent successfully", "details": result}
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Failed to send WhatsApp"))
    except Exception as e:
        logger.error(f"Failed to send Orange pharmacy WhatsApp: {e}")
        raise HTTPException(status_code=500, detail=str(e))
