"""
Nevika Cura - WhatsApp OTP Routes
API endpoints for sending and verifying OTP via WhatsApp (MSG91)
Used for: Signup, Guest Login, Booking confirmations
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging

from services.whatsapp_otp import (
    send_whatsapp_otp,
    verify_whatsapp_otp,
    resend_whatsapp_otp
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/otp/whatsapp", tags=["WhatsApp OTP"])


# ============ Request Models ============

class SendOTPRequest(BaseModel):
    phone: str
    purpose: Optional[str] = "verification"  # signup, guest_login, appointment, lab_booking, pharmacy_order

class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str

class ResendOTPRequest(BaseModel):
    phone: str
    purpose: Optional[str] = "verification"


# ============ API Endpoints ============

@router.post("/send")
async def send_otp(request: SendOTPRequest):
    """
    Send OTP via WhatsApp using MSG91
    
    Purpose options:
    - signup: New user registration
    - guest_login: Guest checkout login
    - appointment: DiaGyn appointment booking
    - lab_booking: Mango Labs test booking
    - pharmacy_order: Orange Pharmacy order
    - glydex: Glydex portal login
    - evara: Evara portal login
    """
    phone = request.phone.strip()
    purpose = request.purpose or "verification"
    
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Valid phone number required")
    
    result = await send_whatsapp_otp(phone, purpose)
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to send OTP"))
    
    return result


@router.post("/verify")
async def verify_otp(request: VerifyOTPRequest):
    """
    Verify OTP received via WhatsApp
    Returns success status and purpose for frontend routing
    """
    phone = request.phone.strip()
    otp = request.otp.strip()
    
    if not phone or not otp:
        raise HTTPException(status_code=400, detail="Phone and OTP required")
    
    if len(otp) != 6 or not otp.isdigit():
        raise HTTPException(status_code=400, detail="OTP must be 6 digits")
    
    result = await verify_whatsapp_otp(phone, otp)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Invalid OTP"))
    
    return result


@router.post("/resend")
async def resend_otp(request: ResendOTPRequest):
    """
    Resend OTP via WhatsApp
    Invalidates previous OTP and sends a new one
    """
    phone = request.phone.strip()
    purpose = request.purpose or "verification"
    
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Valid phone number required")
    
    result = await resend_whatsapp_otp(phone, purpose)
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to resend OTP"))
    
    return result
