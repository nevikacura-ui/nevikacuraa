"""
Nevika Cura - SMS & WhatsApp Service
Twilio integration for OTP and notifications
"""

import os
import logging
import asyncio
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

# Twilio Configuration
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER", "")
TWILIO_WHATSAPP_FROM = os.environ.get("TWILIO_WHATSAPP_FROM", "")
TWILIO_VERIFY_SERVICE_SID = os.environ.get("TWILIO_VERIFY_SERVICE_SID", "")

# Initialize Twilio client
twilio_client = None

def init_twilio():
    """Initialize Twilio client"""
    global twilio_client
    
    if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        try:
            from twilio.rest import Client as TwilioClient
            twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            logger.info("Twilio client initialized successfully")
            if TWILIO_VERIFY_SERVICE_SID:
                logger.info(f"Twilio Verify Service configured")
            return True
        except Exception as e:
            logger.warning(f"Failed to initialize Twilio client: {e}")
            return False
    return False

def format_phone_india(phone: str) -> str:
    """Format phone number for India (+91)"""
    phone = phone.strip()
    if not phone.startswith('+'):
        if len(phone) == 10:
            phone = f"+91{phone}"
        else:
            phone = f"+{phone}"
    return phone

# ============ OTP Functions ============

async def send_twilio_otp(phone: str) -> dict:
    """Send OTP via Twilio Verify Service"""
    if not twilio_client or not TWILIO_VERIFY_SERVICE_SID:
        return {"success": False, "error": "Twilio not configured"}
    
    try:
        formatted_phone = format_phone_india(phone)
        
        verification = await asyncio.to_thread(
            twilio_client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID)
            .verifications.create,
            to=formatted_phone,
            channel="sms"
        )
        
        logger.info(f"Twilio OTP sent to {formatted_phone}: status={verification.status}")
        return {"success": True, "status": verification.status, "phone": formatted_phone}
    
    except Exception as e:
        logger.error(f"Twilio OTP send failed: {str(e)}")
        return {"success": False, "error": str(e)}

async def verify_twilio_otp(phone: str, code: str) -> dict:
    """Verify OTP via Twilio Verify Service"""
    if not twilio_client or not TWILIO_VERIFY_SERVICE_SID:
        return {"success": False, "error": "Twilio not configured"}
    
    try:
        formatted_phone = format_phone_india(phone)
        
        verification_check = await asyncio.to_thread(
            twilio_client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID)
            .verification_checks.create,
            to=formatted_phone,
            code=code
        )
        
        is_valid = verification_check.status == "approved"
        logger.info(f"Twilio OTP verify for {formatted_phone}: valid={is_valid}")
        return {"success": True, "valid": is_valid, "status": verification_check.status}
    
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Twilio OTP verify failed: {error_msg}")
        
        if "60202" in error_msg or "Max check attempts reached" in error_msg:
            return {"success": False, "error": "Too many attempts. Please request a new OTP.", "code": "MAX_ATTEMPTS"}
        if "60200" in error_msg or "Invalid parameter" in error_msg:
            return {"success": False, "error": "Invalid OTP code.", "code": "INVALID"}
        return {"success": False, "error": error_msg}

# ============ WhatsApp Functions ============

async def send_whatsapp_notification(to_number: str, message: str) -> dict:
    """Send WhatsApp notification via Twilio"""
    if not twilio_client or not TWILIO_WHATSAPP_FROM:
        logger.warning("Twilio WhatsApp not configured, generating wa.me link")
        return {
            "success": False, 
            "fallback_url": f"https://wa.me/{to_number}?text={message.replace(' ', '%20').replace(chr(10), '%0A')}"
        }
    
    try:
        formatted_to = f"whatsapp:{format_phone_india(to_number)}"
        
        result = await asyncio.to_thread(
            twilio_client.messages.create,
            body=message,
            from_=TWILIO_WHATSAPP_FROM,
            to=formatted_to
        )
        
        logger.info(f"WhatsApp sent to {formatted_to}: sid={result.sid}")
        return {"success": True, "sid": result.sid}
    
    except Exception as e:
        logger.error(f"WhatsApp send failed: {str(e)}")
        return {
            "success": False, 
            "error": str(e),
            "fallback_url": f"https://wa.me/{to_number}?text={message.replace(' ', '%20').replace(chr(10), '%0A')}"
        }

async def send_sms(to_number: str, message: str) -> dict:
    """Send SMS via Twilio"""
    if not twilio_client or not TWILIO_PHONE_NUMBER:
        return {"success": False, "error": "Twilio SMS not configured"}
    
    try:
        formatted_to = format_phone_india(to_number)
        
        result = await asyncio.to_thread(
            twilio_client.messages.create,
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=formatted_to
        )
        
        logger.info(f"SMS sent to {formatted_to}: sid={result.sid}")
        return {"success": True, "sid": result.sid}
    
    except Exception as e:
        logger.error(f"SMS send failed: {str(e)}")
        return {"success": False, "error": str(e)}

# Initialize on import
init_twilio()
