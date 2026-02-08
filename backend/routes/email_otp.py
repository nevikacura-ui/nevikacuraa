"""
Nevika Cura - Email OTP Routes
Email-based OTP authentication using Resend
"""
import os
import asyncio
import random
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import resend
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/email-otp", tags=["Email OTP"])
logger = logging.getLogger(__name__)

# Resend configuration
resend.api_key = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")

# In-memory OTP storage (use Redis in production)
email_otp_store = {}

# ============ Models ============

class SendEmailOTPRequest(BaseModel):
    email: EmailStr

class VerifyEmailOTPRequest(BaseModel):
    email: EmailStr
    otp: str

# ============ Helper Functions ============

def generate_otp():
    """Generate a 6-digit OTP"""
    return ''.join([str(random.randint(0, 9)) for _ in range(6)])

async def send_otp_email(email: str, otp: str):
    """Send OTP via Resend"""
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a4d3f; margin: 0;">Nevika Cura</h1>
            <p style="color: #666; margin: 5px 0;">Your Healthcare Partner</p>
        </div>
        
        <div style="background: linear-gradient(135deg, #1a4d3f 0%, #2d7a5f 100%); color: white; padding: 30px; border-radius: 12px; text-align: center;">
            <p style="margin: 0 0 20px 0; font-size: 16px;">Your verification code is:</p>
            <div style="background: white; color: #1a4d3f; font-size: 36px; font-weight: bold; letter-spacing: 8px; padding: 20px; border-radius: 8px; margin: 0 auto; display: inline-block;">
                {otp}
            </div>
            <p style="margin: 20px 0 0 0; font-size: 14px; opacity: 0.9;">Valid for 10 minutes</p>
        </div>
        
        <p style="color: #666; font-size: 12px; text-align: center; margin-top: 20px;">
            If you didn't request this code, please ignore this email.
        </p>
    </div>
    """
    
    params = {
        "from": SENDER_EMAIL,
        "to": [email],
        "subject": f"Nevika Cura - Your verification code: {otp}",
        "html": html_content
    }
    
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"OTP email sent to {email}")
        return result
    except Exception as e:
        logger.error(f"Failed to send OTP email to {email}: {str(e)}")
        raise

# ============ API Endpoints ============

@router.post("/send")
async def send_email_otp(request: SendEmailOTPRequest):
    """Send OTP to email address"""
    email = request.email.lower()
    
    # Generate OTP
    otp = generate_otp()
    
    # Store OTP with expiry (10 minutes)
    email_otp_store[email] = {
        "otp": otp,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
        "attempts": 0
    }
    
    # Send OTP email
    try:
        await send_otp_email(email, otp)
        return {
            "success": True,
            "message": f"OTP sent to {email}",
            "email": email[:3] + "***" + email[email.index("@"):]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send OTP: {str(e)}")


@router.post("/verify")
async def verify_email_otp(request: VerifyEmailOTPRequest):
    """Verify email OTP"""
    email = request.email.lower()
    otp = request.otp.strip()
    
    # Check if OTP exists
    stored = email_otp_store.get(email)
    if not stored:
        raise HTTPException(status_code=400, detail="No OTP found. Please request a new one.")
    
    # Check expiry
    if datetime.now(timezone.utc) > stored["expires_at"]:
        del email_otp_store[email]
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
    
    # Check attempts
    if stored["attempts"] >= 3:
        del email_otp_store[email]
        raise HTTPException(status_code=400, detail="Too many attempts. Please request a new OTP.")
    
    # Verify OTP
    if stored["otp"] != otp:
        email_otp_store[email]["attempts"] += 1
        remaining = 3 - email_otp_store[email]["attempts"]
        raise HTTPException(status_code=400, detail=f"Invalid OTP. {remaining} attempts remaining.")
    
    # OTP verified - clean up
    del email_otp_store[email]
    
    return {
        "success": True,
        "verified": True,
        "email": email
    }


@router.post("/resend")
async def resend_email_otp(request: SendEmailOTPRequest):
    """Resend OTP to email"""
    return await send_email_otp(request)
