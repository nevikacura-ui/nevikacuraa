"""
Nevika Cura - WhatsApp OTP Service
Uses MSG91 WhatsApp API with nevika_otp_verify template
"""

import httpx
import logging
import os
import random
import time
from datetime import datetime, timezone
from typing import Dict
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# MSG91 Configuration
MSG91_AUTH_KEY = os.environ.get("MSG91_AUTH_KEY")
MSG91_BASE_URL = "https://control.msg91.com/api/v5"
MSG91_WHATSAPP_NUMBER = os.environ.get("MSG91_WHATSAPP_NUMBER", "918108888330")

# OTP Template
OTP_TEMPLATE_NAME = "nevika_otp_verify"

# In-memory OTP storage
otp_storage: Dict[str, dict] = {}
OTP_EXPIRY_SECONDS = 300  # 5 minutes

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


async def send_whatsapp_otp(
    phone: str,
    purpose: str = "verification",
    reference_id: str = None
) -> dict:
    """
    Send OTP via WhatsApp using MSG91 nevika_otp_verify template
    Template has: body with OTP variable + URL button with OTP parameter
    """
    clean_phone = clean_phone_number(phone)
    otp = generate_otp()
    
    # Store OTP in memory
    otp_key = f"otp_{clean_phone}"
    otp_storage[otp_key] = {
        "otp": otp,
        "purpose": purpose,
        "created_at": time.time(),
        "attempts": 0
    }
    
    if not MSG91_AUTH_KEY:
        logger.warning("MSG91_AUTH_KEY not configured - using mock OTP")
        return {
            "success": True,
            "mock": True,
            "otp": otp,
            "message": "OTP generated (mock mode)",
            "expires_in": OTP_EXPIRY_SECONDS,
            "phone_masked": f"******{clean_phone[-4:]}"
        }
    
    # MSG91 WhatsApp API
    url = f"{MSG91_BASE_URL}/whatsapp/whatsapp-outbound-message/"
    
    # Template structure for nevika_otp_verify:
    # - Body: Contains {{1}} for OTP code
    # - Button (URL type): Contains {{1}} parameter for OTP
    payload = {
        "integrated_number": MSG91_WHATSAPP_NUMBER,
        "content_type": "template",
        "payload": {
            "messaging_product": "whatsapp",
            "to": clean_phone,
            "type": "template",
            "template": {
                "name": OTP_TEMPLATE_NAME,
                "language": {
                    "code": "en",
                    "policy": "deterministic"
                },
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": otp}
                        ]
                    },
                    {
                        "type": "button",
                        "sub_type": "url",
                        "index": "0",
                        "parameters": [
                            {"type": "text", "text": otp}
                        ]
                    }
                ]
            }
        }
    }
    
    headers = {
        "authkey": MSG91_AUTH_KEY,
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            data = response.json()
        
        logger.info(f"MSG91 WhatsApp OTP Response: {data}")
        
        # Check success
        success = (
            response.status_code == 200 and
            data.get("status") == "success"
        )
        
        if success:
            otp_storage[otp_key]["msg91_id"] = data.get("data", {}).get("message_uuid")
            
            # Log to database
            if db is not None:
                try:
                    await db.otp_logs.insert_one({
                        "phone": clean_phone,
                        "purpose": purpose,
                        "sent_at": datetime.now(timezone.utc).isoformat(),
                        "channel": "whatsapp",
                        "template": OTP_TEMPLATE_NAME,
                        "msg91_id": data.get("data", {}).get("message_uuid"),
                        "status": "sent"
                    })
                except:
                    pass
            
            return {
                "success": True,
                "message": "OTP sent via WhatsApp",
                "expires_in": OTP_EXPIRY_SECONDS,
                "phone_masked": f"******{clean_phone[-4:]}"
            }
        else:
            # Log error details
            error_msg = data.get("message", str(data))
            logger.error(f"MSG91 WhatsApp OTP failed: {error_msg}")
            
            # Return mock OTP for testing
            return {
                "success": True,
                "mock": True,
                "otp": otp,
                "message": f"OTP: {otp} (WhatsApp delivery pending - check MSG91 logs)",
                "expires_in": OTP_EXPIRY_SECONDS,
                "phone_masked": f"******{clean_phone[-4:]}",
                "debug": error_msg
            }
            
    except Exception as e:
        logger.error(f"MSG91 WhatsApp error: {e}")
        
        return {
            "success": True,
            "mock": True,
            "otp": otp,
            "message": f"OTP: {otp} (connection error)",
            "expires_in": OTP_EXPIRY_SECONDS,
            "phone_masked": f"******{clean_phone[-4:]}"
        }


async def verify_whatsapp_otp(phone: str, otp: str) -> dict:
    """Verify OTP from memory storage"""
    clean_phone = clean_phone_number(phone)
    otp_key = f"otp_{clean_phone}"
    
    stored = otp_storage.get(otp_key)
    
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
    
    # Verify
    if stored["otp"] == otp.strip():
        purpose = stored.get("purpose", "verification")
        del otp_storage[otp_key]
        
        # Update log
        if db is not None:
            try:
                await db.otp_logs.update_one(
                    {"phone": clean_phone},
                    {"$set": {"verified_at": datetime.now(timezone.utc).isoformat(), "status": "verified"}},
                    upsert=False
                )
            except:
                pass
        
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
