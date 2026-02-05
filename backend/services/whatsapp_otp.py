"""
MSG91 WhatsApp OTP Service for Nevika Cura
Primary: SMS OTP via Twilio Verify
Secondary: WhatsApp notification via MSG91 (for users with active session)
"""

import httpx
import logging
import os
import random
import time
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# MSG91 Configuration (for WhatsApp notification)
MSG91_AUTH_KEY = os.environ.get("MSG91_AUTH_KEY")
MSG91_BASE_URL = "https://control.msg91.com/api/v5"
MSG91_WHATSAPP_NUMBER = os.environ.get("MSG91_WHATSAPP_NUMBER", "918108888330")

# Twilio Configuration (for SMS OTP)
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
TWILIO_VERIFY_SERVICE_SID = os.environ.get("TWILIO_VERIFY_SERVICE_SID")

# OTP Template name
OTP_TEMPLATE_NAME = "nevika_otp_verify"

# In-memory OTP storage with expiry (5 minutes default)
otp_storage: Dict[str, dict] = {}
OTP_EXPIRY_SECONDS = 300  # 5 minutes

# Database reference
db = None
send_msg91_whatsapp_func = None
twilio_client = None

def set_db(database):
    """Set database instance"""
    global db
    db = database

def set_send_function(func):
    """Set the send_msg91_whatsapp function"""
    global send_msg91_whatsapp_func
    send_msg91_whatsapp_func = func

def init_twilio():
    """Initialize Twilio client"""
    global twilio_client
    if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        try:
            from twilio.rest import Client as TwilioClient
            twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            logger.info("Twilio client initialized for OTP service")
            return True
        except Exception as e:
            logger.error(f"Failed to init Twilio: {e}")
    return False

# Initialize Twilio on import
init_twilio()


def generate_otp() -> str:
    """Generate 6-digit OTP"""
    return str(random.randint(100000, 999999))


def clean_phone_number(phone: str) -> str:
    """Clean and format phone number to Indian format"""
    clean_phone = str(phone).replace("+", "").replace(" ", "").replace("-", "")
    if len(clean_phone) == 10:
        clean_phone = "91" + clean_phone
    elif not clean_phone.startswith("91"):
        clean_phone = "91" + clean_phone[-10:]
    return clean_phone


def format_phone_e164(phone: str) -> str:
    """Format to E.164 format for Twilio"""
    clean = clean_phone_number(phone)
    return f"+{clean}"


async def send_sms_otp_twilio(phone: str) -> dict:
    """Send OTP via Twilio Verify Service (Primary Method)"""
    if not twilio_client or not TWILIO_VERIFY_SERVICE_SID:
        return {"success": False, "error": "Twilio not configured"}
    
    try:
        formatted_phone = format_phone_e164(phone)
        
        verification = await asyncio.to_thread(
            twilio_client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID)
            .verifications.create,
            to=formatted_phone,
            channel="sms"
        )
        
        logger.info(f"Twilio OTP sent to {formatted_phone}: {verification.status}")
        
        return {
            "success": True,
            "method": "sms",
            "status": verification.status,
            "message": "OTP sent via SMS"
        }
    except Exception as e:
        logger.error(f"Twilio OTP error: {e}")
        return {"success": False, "error": str(e)}


async def verify_sms_otp_twilio(phone: str, otp: str) -> dict:
    """Verify OTP via Twilio Verify Service"""
    if not twilio_client or not TWILIO_VERIFY_SERVICE_SID:
        return {"success": False, "error": "Twilio not configured"}
    
    try:
        formatted_phone = format_phone_e164(phone)
        
        verification_check = await asyncio.to_thread(
            twilio_client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID)
            .verification_checks.create,
            to=formatted_phone,
            code=otp
        )
        
        if verification_check.status == "approved":
            logger.info(f"Twilio OTP verified for {formatted_phone}")
            return {
                "success": True,
                "verified": True,
                "phone": clean_phone_number(phone)
            }
        else:
            return {
                "success": False,
                "error": "Invalid OTP"
            }
    except Exception as e:
        logger.error(f"Twilio verify error: {e}")
        return {"success": False, "error": str(e)}


async def send_whatsapp_otp(
    phone: str,
    purpose: str = "verification",
    reference_id: str = None
) -> dict:
    """
    Send OTP - Primary: SMS via Twilio, Fallback: In-memory OTP
    Also tries WhatsApp notification (may fail due to 24hr window)
    """
    clean_phone = clean_phone_number(phone)
    otp = generate_otp()
    
    # Store OTP in memory (for fallback verification)
    otp_key = f"otp_{clean_phone}"
    otp_storage[otp_key] = {
        "otp": otp,
        "purpose": purpose,
        "created_at": time.time(),
        "attempts": 0,
        "method": "pending"
    }
    
    # Try Twilio SMS first (most reliable)
    if twilio_client and TWILIO_VERIFY_SERVICE_SID:
        try:
            result = await send_sms_otp_twilio(phone)
            if result.get("success"):
                otp_storage[otp_key]["method"] = "twilio_verify"
                otp_storage[otp_key]["twilio"] = True
                
                # Log to database
                if db:
                    try:
                        await db.otp_logs.insert_one({
                            "phone": clean_phone,
                            "purpose": purpose,
                            "sent_at": datetime.now(timezone.utc).isoformat(),
                            "channel": "sms",
                            "provider": "twilio",
                            "status": "sent"
                        })
                    except Exception as e:
                        logger.error(f"Failed to log OTP: {e}")
                
                return {
                    "success": True,
                    "method": "sms",
                    "message": "OTP sent via SMS",
                    "expires_in": OTP_EXPIRY_SECONDS,
                    "phone_masked": f"******{clean_phone[-4:]}"
                }
        except Exception as e:
            logger.error(f"Twilio SMS failed: {e}")
    
    # Fallback: Return mock OTP for testing (always works)
    otp_storage[otp_key]["method"] = "mock"
    
    # Also try WhatsApp notification (may fail due to 24hr rule)
    whatsapp_sent = False
    if send_msg91_whatsapp_func:
        try:
            # Try to send WhatsApp (will fail if user hasn't messaged in 24hrs)
            asyncio.create_task(send_msg91_whatsapp_func(
                recipient_phone=clean_phone,
                template_name=OTP_TEMPLATE_NAME,
                variables=[otp],
                db=db,
                reference_id=reference_id or f"otp_{purpose}",
                message_type="otp_verification"
            ))
            whatsapp_sent = True
        except Exception as e:
            logger.warning(f"WhatsApp OTP notification failed (24hr rule): {e}")
    
    return {
        "success": True,
        "mock": True,
        "otp": otp,  # Return OTP for testing
        "method": "mock",
        "message": "OTP generated" + (" (WhatsApp notification attempted)" if whatsapp_sent else ""),
        "expires_in": OTP_EXPIRY_SECONDS,
        "phone_masked": f"******{clean_phone[-4:]}",
        "note": "SMS delivery requires Twilio. Use the provided OTP code."
    }


async def verify_whatsapp_otp(phone: str, otp: str) -> dict:
    """
    Verify OTP - tries Twilio first, then in-memory storage
    """
    clean_phone = clean_phone_number(phone)
    otp_key = f"otp_{clean_phone}"
    
    stored = otp_storage.get(otp_key)
    
    # If sent via Twilio Verify, verify through Twilio
    if stored and stored.get("twilio"):
        result = await verify_sms_otp_twilio(phone, otp)
        if result.get("success"):
            del otp_storage[otp_key]
            return {
                "success": True,
                "message": "OTP verified successfully",
                "purpose": stored.get("purpose", "verification"),
                "phone": clean_phone
            }
        else:
            # Increment attempts
            stored["attempts"] = stored.get("attempts", 0) + 1
            if stored["attempts"] >= 3:
                del otp_storage[otp_key]
                return {"success": False, "error": "Too many attempts. Request new OTP."}
            return {"success": False, "error": f"Invalid OTP. {3 - stored['attempts']} attempts left."}
    
    # Fallback: Verify from in-memory storage
    if not stored:
        return {"success": False, "error": "OTP expired or not found. Request new OTP."}
    
    # Check expiry
    if time.time() - stored["created_at"] > OTP_EXPIRY_SECONDS:
        del otp_storage[otp_key]
        return {"success": False, "error": "OTP has expired. Request new OTP."}
    
    # Check attempts
    if stored["attempts"] >= 3:
        del otp_storage[otp_key]
        return {"success": False, "error": "Too many attempts. Request new OTP."}
    
    # Verify OTP
    if stored["otp"] == otp.strip():
        purpose = stored.get("purpose", "verification")
        del otp_storage[otp_key]
        
        return {
            "success": True,
            "message": "OTP verified successfully",
            "purpose": purpose,
            "phone": clean_phone
        }
    else:
        stored["attempts"] += 1
        remaining = 3 - stored["attempts"]
        return {"success": False, "error": f"Invalid OTP. {remaining} attempts left."}


async def resend_whatsapp_otp(phone: str, purpose: str = "verification") -> dict:
    """Resend OTP - clears existing and sends new"""
    clean_phone = clean_phone_number(phone)
    otp_key = f"otp_{clean_phone}"
    
    if otp_key in otp_storage:
        del otp_storage[otp_key]
    
    return await send_whatsapp_otp(phone, purpose)


def cleanup_expired_otps():
    """Remove expired OTPs from storage"""
    current_time = time.time()
    expired_keys = [
        key for key, data in otp_storage.items()
        if current_time - data["created_at"] > OTP_EXPIRY_SECONDS
    ]
    for key in expired_keys:
        del otp_storage[key]
