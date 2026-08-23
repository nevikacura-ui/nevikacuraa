"""
Nevika Cura - SMS OTP Routes (Flow API)
Self-generated OTP, hashed in MongoDB, sent via MSG91 Flow API.
WhatsApp is still used for appointment/order notifications.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
import logging
import jwt
from datetime import datetime, timezone, timedelta

from services.msg91_sms_otp import send_sms_otp, verify_sms_otp, resend_sms_otp
from utils.auth_utils import JWT_SECRET, JWT_ALGORITHM

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/otp/sms", tags=["SMS OTP"])


class SendOTPRequest(BaseModel):
    phone: str
    purpose: Optional[str] = "verification"


class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str


class ResendOTPRequest(BaseModel):
    phone: str


@router.post("/send")
async def send_otp(request: SendOTPRequest, req: Request):
    """Send OTP via SMS using MSG91 Flow API"""
    phone = request.phone.strip()
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Valid phone number required")

    ip = req.client.host if req.client else None
    result = await send_sms_otp(phone, request.purpose or "verification", ip=ip)

    status = result.pop("status", None)
    if not result.get("success"):
        code = status or 500
        raise HTTPException(status_code=code, detail=result.get("error", "Failed to send OTP"))
    return result


@router.post("/verify")
async def verify_otp(request: VerifyOTPRequest, req: Request):
    """Verify SMS OTP (self-verified against MongoDB hash) and return JWT token"""
    phone = request.phone.strip()
    otp_code = request.otp.strip()

    if not phone or not otp_code:
        raise HTTPException(status_code=400, detail="Phone and OTP required")
    if len(otp_code) != 6 or not otp_code.isdigit():
        raise HTTPException(status_code=400, detail="OTP must be 6 digits")

    ip = req.client.host if req.client else None
    result = await verify_sms_otp(phone, otp_code, ip=ip)

    status = result.pop("status", None)
    if not result.get("success"):
        code = status or 400
        raise HTTPException(status_code=code, detail=result.get("error", "Invalid OTP"))

    # Generate 30-day JWT token on successful verification
    token = jwt.encode(
        {
            "sub": result["phone"],
            "phone": result["phone"],
            "type": "guest_sms",
            "exp": datetime.now(timezone.utc) + timedelta(days=30),
        },
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )
    result["token"] = token
    result["expires_in_days"] = 30
    return result


@router.post("/resend")
async def resend_otp(request: ResendOTPRequest, req: Request):
    """Resend OTP via SMS (generates new code, invalidates old)"""
    phone = request.phone.strip()
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Valid phone number required")

    ip = req.client.host if req.client else None
    result = await resend_sms_otp(phone, ip=ip)

    status = result.pop("status", None)
    if not result.get("success"):
        code = status or 500
        raise HTTPException(status_code=code, detail=result.get("error", "Failed to resend OTP"))
    return result
