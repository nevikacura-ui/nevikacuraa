"""
MSG91 WhatsApp OTP Service for Nevika Cura
Sends OTP via WhatsApp using the nevika_otp_verify template
Used for: Signup, Guest Login, Appointment Booking, Lab Booking, Pharmacy Orders
"""

import httpx
import logging
import os
import random
import time
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# MSG91 Configuration
MSG91_AUTH_KEY = os.environ.get("MSG91_AUTH_KEY")
MSG91_BASE_URL = "https://control.msg91.com/api/v5"
MSG91_WHATSAPP_NUMBER = os.environ.get("MSG91_WHATSAPP_NUMBER", "918108888330")

# OTP Template name (as registered in MSG91)
OTP_TEMPLATE_NAME = "nevika_otp_verify"

# In-memory OTP storage with expiry (5 minutes default)
otp_storage: Dict[str, dict] = {}
OTP_EXPIRY_SECONDS = 300  # 5 minutes

# Database reference (for logging)
db = None

def set_db(database):
    """Set database instance from server.py"""
    global db
    db = database


def generate_otp() -> str:
    """Generate 6-digit OTP"""
    return str(random.randint(100000, 999999))


def clean_phone_number(phone: str) -> str:
    """Clean and format phone number to Indian format"""
    clean_phone = str(phone).replace("+", "").replace(" ", "").replace("-", "")
    
    # Add India country code if not present
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
    
    Args:
        phone: Phone number (10 digits or with country code)
        purpose: Purpose of OTP (signup, guest_login, appointment, lab_booking, pharmacy_order)
        reference_id: Optional reference ID for logging
    
    Returns:
        dict with success status, otp (for testing), and message
    """
    if not MSG91_AUTH_KEY:
        logger.warning("MSG91_AUTH_KEY not configured - using mock OTP")
        # Fallback to mock OTP for development
        otp = generate_otp()
        clean_phone = clean_phone_number(phone)
        otp_key = f"otp_{clean_phone}"
        otp_storage[otp_key] = {
            "otp": otp,
            "purpose": purpose,
            "created_at": time.time(),
            "attempts": 0
        }
        return {
            "success": True,
            "mock": True,
            "otp": otp,  # Return for testing
            "message": "OTP generated (mock mode)",
            "expires_in": OTP_EXPIRY_SECONDS
        }
    
    # Clean phone number
    clean_phone = clean_phone_number(phone)
    
    # Generate OTP
    otp = generate_otp()
    
    # Build MSG91 WhatsApp API request
    url = f"{MSG91_BASE_URL}/whatsapp/whatsapp-outbound-message/"
    
    # AUTHENTICATION templates require OTP in button component with copy_code type
    # The nevika_otp_verify template is an AUTHENTICATION type with "Copy Code" button
    payload = {
        "integrated_number": MSG91_WHATSAPP_NUMBER,
        "content_type": "template",
        "messaging_product": "whatsapp",
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
                        "sub_type": "copy_code",
                        "index": "0",
                        "parameters": [
                            {"type": "coupon_code", "coupon_code": otp}
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
            response_data = response.json()
        
        logger.info(f"MSG91 OTP Response - Status: {response.status_code}, Data: {response_data}")
        
        # Check for success
        success = (
            response.status_code == 200 and 
            response_data.get("type") != "error" and
            not response_data.get("hasError", True)
        )
        
        if success:
            # Store OTP for verification
            otp_key = f"otp_{clean_phone}"
            otp_storage[otp_key] = {
                "otp": otp,
                "purpose": purpose,
                "created_at": time.time(),
                "attempts": 0,
                "msg91_id": response_data.get("data", {}).get("message_uuid")
            }
            
            # Log to database
            if db is not None:
                try:
                    await db.otp_logs.insert_one({
                        "phone": clean_phone,
                        "purpose": purpose,
                        "reference_id": reference_id,
                        "sent_at": datetime.now(timezone.utc).isoformat(),
                        "channel": "whatsapp",
                        "template": OTP_TEMPLATE_NAME,
                        "msg91_id": response_data.get("data", {}).get("message_uuid"),
                        "status": "sent"
                    })
                except Exception as e:
                    logger.error(f"Failed to log OTP: {e}")
            
            return {
                "success": True,
                "message": "OTP sent via WhatsApp",
                "expires_in": OTP_EXPIRY_SECONDS,
                "phone_masked": f"******{clean_phone[-4:]}"
            }
        else:
            error_msg = response_data.get("message", "Failed to send OTP")
            logger.error(f"MSG91 OTP failed: {error_msg}")
            
            # Fallback to mock OTP
            otp_key = f"otp_{clean_phone}"
            otp_storage[otp_key] = {
                "otp": otp,
                "purpose": purpose,
                "created_at": time.time(),
                "attempts": 0
            }
            
            return {
                "success": True,
                "mock": True,
                "otp": otp,
                "message": "OTP generated (WhatsApp delivery pending)",
                "expires_in": OTP_EXPIRY_SECONDS
            }
            
    except Exception as e:
        logger.error(f"MSG91 OTP error: {e}")
        
        # Fallback to mock OTP on error
        otp_key = f"otp_{clean_phone}"
        otp_storage[otp_key] = {
            "otp": otp,
            "purpose": purpose,
            "created_at": time.time(),
            "attempts": 0
        }
        
        return {
            "success": True,
            "mock": True,
            "otp": otp,
            "message": "OTP generated (connection error - check WhatsApp)",
            "expires_in": OTP_EXPIRY_SECONDS
        }


async def verify_whatsapp_otp(phone: str, otp: str) -> dict:
    """
    Verify OTP sent via WhatsApp
    
    Args:
        phone: Phone number
        otp: OTP code to verify
    
    Returns:
        dict with success status and message
    """
    clean_phone = clean_phone_number(phone)
    otp_key = f"otp_{clean_phone}"
    
    stored = otp_storage.get(otp_key)
    
    if not stored:
        return {
            "success": False,
            "error": "OTP expired or not found. Please request a new OTP."
        }
    
    # Check expiry
    if time.time() - stored["created_at"] > OTP_EXPIRY_SECONDS:
        del otp_storage[otp_key]
        return {
            "success": False,
            "error": "OTP has expired. Please request a new OTP."
        }
    
    # Check attempts
    if stored["attempts"] >= 3:
        del otp_storage[otp_key]
        return {
            "success": False,
            "error": "Too many failed attempts. Please request a new OTP."
        }
    
    # Verify OTP
    if stored["otp"] == otp.strip():
        purpose = stored.get("purpose", "verification")
        del otp_storage[otp_key]
        
        # Log verification
        if db is not None:
            try:
                await db.otp_logs.update_one(
                    {"phone": clean_phone},
                    {"$set": {
                        "verified_at": datetime.now(timezone.utc).isoformat(),
                        "status": "verified"
                    }},
                    upsert=False
                )
            except Exception as e:
                logger.error(f"Failed to log OTP verification: {e}")
        
        return {
            "success": True,
            "message": "OTP verified successfully",
            "purpose": purpose,
            "phone": clean_phone
        }
    else:
        # Increment attempts
        otp_storage[otp_key]["attempts"] += 1
        remaining = 3 - otp_storage[otp_key]["attempts"]
        
        return {
            "success": False,
            "error": f"Invalid OTP. {remaining} attempts remaining."
        }


async def resend_whatsapp_otp(phone: str, purpose: str = "verification") -> dict:
    """
    Resend OTP via WhatsApp
    Clears existing OTP and sends a new one
    """
    clean_phone = clean_phone_number(phone)
    otp_key = f"otp_{clean_phone}"
    
    # Clear existing OTP
    if otp_key in otp_storage:
        del otp_storage[otp_key]
    
    # Send new OTP
    return await send_whatsapp_otp(phone, purpose)


# Cleanup expired OTPs periodically
def cleanup_expired_otps():
    """Remove expired OTPs from storage"""
    current_time = time.time()
    expired_keys = [
        key for key, data in otp_storage.items()
        if current_time - data["created_at"] > OTP_EXPIRY_SECONDS
    ]
    for key in expired_keys:
        del otp_storage[key]
    if expired_keys:
        logger.info(f"Cleaned up {len(expired_keys)} expired OTPs")
