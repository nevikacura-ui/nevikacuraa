"""
Nevika Cura - OTP Service
Primary: MSG91 SendOTP API (SMS)
Fallback: In-memory OTP with WhatsApp notification attempt
"""

import httpx
import logging
import os
import random
import time
import asyncio
from datetime import datetime, timezone
from typing import Dict
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# MSG91 Configuration
MSG91_AUTH_KEY = os.environ.get("MSG91_AUTH_KEY")
MSG91_BASE_URL = "https://control.msg91.com/api/v5"
MSG91_WHATSAPP_NUMBER = os.environ.get("MSG91_WHATSAPP_NUMBER", "918108888330")

# MSG91 SendOTP API
MSG91_OTP_TEMPLATE_ID = os.environ.get("MSG91_OTP_TEMPLATE_ID", "")  # DLT approved template ID

# In-memory OTP storage
otp_storage: Dict[str, dict] = {}
OTP_EXPIRY_SECONDS = 300

# Dependencies
db = None
send_msg91_whatsapp_func = None

def set_db(database):
    global db
    db = database

def set_send_function(func):
    global send_msg91_whatsapp_func
    send_msg91_whatsapp_func = func


def generate_otp() -> str:
    return str(random.randint(100000, 999999))


def clean_phone_number(phone: str) -> str:
    clean_phone = str(phone).replace("+", "").replace(" ", "").replace("-", "")
    if len(clean_phone) == 10:
        clean_phone = "91" + clean_phone
    elif not clean_phone.startswith("91"):
        clean_phone = "91" + clean_phone[-10:]
    return clean_phone


async def send_msg91_sms_otp(phone: str, otp: str) -> dict:
    """Send OTP via MSG91 SendOTP API"""
    if not MSG91_AUTH_KEY:
        return {"success": False, "error": "MSG91 not configured"}
    
    clean_phone = clean_phone_number(phone)
    
    # MSG91 SendOTP API endpoint
    url = "https://api.msg91.com/api/v5/otp"
    
    params = {
        "authkey": MSG91_AUTH_KEY,
        "mobile": clean_phone,
        "otp": otp,
        "sender": "NEVIKA",  # Sender ID (needs DLT approval)
        "message": f"Your Nevika Cura verification code is {otp}. Valid for 5 minutes. Do not share.",
        "otp_length": "6",
        "otp_expiry": "5"  # 5 minutes
    }
    
    # If template ID is configured, use it
    if MSG91_OTP_TEMPLATE_ID:
        params["template_id"] = MSG91_OTP_TEMPLATE_ID
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            data = response.json()
        
        logger.info(f"MSG91 SMS OTP Response: {data}")
        
        if data.get("type") == "success" or response.status_code == 200:
            return {
                "success": True,
                "method": "sms",
                "message": "OTP sent via SMS"
            }
        else:
            return {
                "success": False,
                "error": data.get("message", "SMS send failed")
            }
    except Exception as e:
        logger.error(f"MSG91 SMS error: {e}")
        return {"success": False, "error": str(e)}


async def verify_msg91_otp(phone: str, otp: str) -> dict:
    """Verify OTP via MSG91 (if using their verify API)"""
    if not MSG91_AUTH_KEY:
        return {"success": False, "error": "MSG91 not configured"}
    
    clean_phone = clean_phone_number(phone)
    
    url = "https://api.msg91.com/api/v5/otp/verify"
    params = {
        "authkey": MSG91_AUTH_KEY,
        "mobile": clean_phone,
        "otp": otp
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            data = response.json()
        
        if data.get("type") == "success":
            return {"success": True, "verified": True}
        else:
            return {"success": False, "error": data.get("message", "Invalid OTP")}
    except Exception as e:
        logger.error(f"MSG91 verify error: {e}")
        return {"success": False, "error": str(e)}


async def send_whatsapp_otp(
    phone: str,
    purpose: str = "verification",
    reference_id: str = None
) -> dict:
    """
    Send OTP via SMS (MSG91) with WhatsApp notification attempt
    Falls back to mock OTP if SMS fails
    """
    clean_phone = clean_phone_number(phone)
    otp = generate_otp()
    
    # Store OTP in memory
    otp_key = f"otp_{clean_phone}"
    otp_storage[otp_key] = {
        "otp": otp,
        "purpose": purpose,
        "created_at": time.time(),
        "attempts": 0,
        "method": "pending"
    }
    
    # Try MSG91 SMS OTP
    sms_result = await send_msg91_sms_otp(phone, otp)
    
    if sms_result.get("success"):
        otp_storage[otp_key]["method"] = "msg91_sms"
        
        # Log to database
        if db:
            try:
                await db.otp_logs.insert_one({
                    "phone": clean_phone,
                    "purpose": purpose,
                    "sent_at": datetime.now(timezone.utc).isoformat(),
                    "channel": "sms",
                    "provider": "msg91",
                    "status": "sent"
                })
            except:
                pass
        
        return {
            "success": True,
            "method": "sms",
            "message": "OTP sent via SMS",
            "expires_in": OTP_EXPIRY_SECONDS,
            "phone_masked": f"******{clean_phone[-4:]}"
        }
    
    # SMS failed - try WhatsApp notification (will fail if no 24hr session)
    otp_storage[otp_key]["method"] = "mock"
    
    whatsapp_attempted = False
    if send_msg91_whatsapp_func:
        try:
            asyncio.create_task(send_msg91_whatsapp_func(
                recipient_phone=clean_phone,
                template_name="nevika_otp_verify",
                variables=[otp],
                db=db,
                reference_id=reference_id or f"otp_{purpose}",
                message_type="otp_verification"
            ))
            whatsapp_attempted = True
        except:
            pass
    
    # Return mock OTP for testing
    return {
        "success": True,
        "mock": True,
        "otp": otp,
        "method": "mock",
        "message": f"OTP: {otp}" + (" (WhatsApp attempted)" if whatsapp_attempted else ""),
        "expires_in": OTP_EXPIRY_SECONDS,
        "phone_masked": f"******{clean_phone[-4:]}",
        "note": "Use this OTP code to verify"
    }


async def verify_whatsapp_otp(phone: str, otp: str) -> dict:
    """Verify OTP from memory storage"""
    clean_phone = clean_phone_number(phone)
    otp_key = f"otp_{clean_phone}"
    
    stored = otp_storage.get(otp_key)
    
    if not stored:
        return {"success": False, "error": "OTP expired or not found"}
    
    # Check expiry
    if time.time() - stored["created_at"] > OTP_EXPIRY_SECONDS:
        del otp_storage[otp_key]
        return {"success": False, "error": "OTP has expired"}
    
    # Check attempts
    if stored["attempts"] >= 3:
        del otp_storage[otp_key]
        return {"success": False, "error": "Too many attempts"}
    
    # Verify
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
    """Resend OTP"""
    clean_phone = clean_phone_number(phone)
    otp_key = f"otp_{clean_phone}"
    if otp_key in otp_storage:
        del otp_storage[otp_key]
    return await send_whatsapp_otp(phone, purpose)

