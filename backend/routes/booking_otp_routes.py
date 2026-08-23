"""
Booking Verification Code API Routes
Endpoints for code generation, verification, and management

Code Names by Service:
- DiaGyn: Appointment Code
- Mango: Booking Code  
- Orange: Delivery Code
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import logging

router = APIRouter(prefix="/booking-code", tags=["Booking Verification Codes"])

logger = logging.getLogger(__name__)

db = None

def get_db():
    global db
    return db

def set_db(database):
    global db
    db = database

# Import code utilities
from services.booking_otp import (
    generate_booking_code_record,
    store_booking_code,
    verify_booking_code,
    get_booking_code,
    resend_booking_code,
    get_code_message,
    get_code_name,
    VERIFICATION_PURPOSES,
    CODE_NAMES
)

# ============ PYDANTIC MODELS ============

class VerifyCodeRequest(BaseModel):
    booking_id: str
    code: str
    verified_by: Optional[str] = None
    verifier_role: Optional[str] = None  # staff, phlebotomist, delivery

class ResendCodeRequest(BaseModel):
    booking_id: str
    booking_type: str
    patient_phone: str
    patient_name: str

class GenerateCodeRequest(BaseModel):
    booking_id: str
    booking_type: str  # diagyn, mango, orange, nevika
    patient_phone: str
    patient_name: str
    send_whatsapp: bool = True
    additional_data: Optional[dict] = None

# ============ API ENDPOINTS ============

@router.post("/generate")
async def generate_code_endpoint(request: GenerateCodeRequest):
    """
    Generate verification code for a booking and optionally send via WhatsApp
    
    Code Names:
    - diagyn: Appointment Code
    - mango: Booking Code
    - orange: Delivery Code
    
    Use cases:
    - Called after booking creation
    - Called when customer requests new code
    """
    db = get_db()
    
    code_name = get_code_name(request.booking_type)
    
    # Generate code record
    code_record = generate_booking_code_record(
        booking_id=request.booking_id,
        booking_type=request.booking_type,
        patient_phone=request.patient_phone,
        patient_name=request.patient_name,
        additional_data=request.additional_data
    )
    
    # Store in database
    success = await store_booking_code(db, code_record)
    
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to generate {code_name}")
    
    # Send WhatsApp notification if requested
    whatsapp_result = {"sent": False}
    if request.send_whatsapp:
        try:
            # Get code message
            booking_details = {
                "patient_name": request.patient_name,
                "booking_id": request.booking_id,
                **(request.additional_data or {})
            }
            
            whatsapp_result = await send_code_whatsapp(
                phone=request.patient_phone,
                code=code_record["code"],
                booking_type=request.booking_type,
                booking_details=booking_details,
                db=db
            )
            
        except Exception as e:
            logger.error(f"Failed to send {code_name} WhatsApp: {e}")
            whatsapp_result = {"sent": False, "error": str(e)}
    
    # Get purpose info
    purpose = VERIFICATION_PURPOSES.get(request.booking_type, VERIFICATION_PURPOSES["nevika"])
    
    return {
        "success": True,
        "code": code_record["code"],
        "code_name": code_name,
        "booking_id": request.booking_id,
        "booking_type": request.booking_type,
        "expires_at": code_record["expires_at"],
        "purpose": purpose,
        "whatsapp": whatsapp_result
    }

@router.post("/verify")
async def verify_code_endpoint(request: VerifyCodeRequest):
    """
    Verify code for a booking
    
    Use cases:
    - Staff verifying Appointment Code at DiaGyn check-in
    - Phlebotomist verifying Booking Code before sample collection
    - Delivery person verifying Delivery Code before handing over order
    """
    db = get_db()
    
    result = await verify_booking_code(
        db=db,
        booking_id=request.booking_id,
        entered_code=request.code,
        verified_by=request.verified_by,
        verifier_role=request.verifier_role
    )
    
    if result["success"]:
        # Update the corresponding booking/order as verified
        await update_booking_verification_status(
            db=db,
            booking_id=request.booking_id,
            booking_type=result.get("booking_type"),
            verified_by=request.verified_by
        )
    
    return result

@router.get("/get/{booking_id}")
async def get_code_endpoint(booking_id: str):
    """
    Get verification code for a booking (for customer to view in app)
    """
    db = get_db()
    
    code_info = await get_booking_code(db, booking_id)
    
    if not code_info:
        raise HTTPException(status_code=404, detail="No active verification code found for this booking")
    
    # Get purpose info
    purpose = VERIFICATION_PURPOSES.get(code_info["booking_type"], VERIFICATION_PURPOSES["nevika"])
    
    return {
        "success": True,
        "code": code_info["code"],
        "code_name": code_info.get("code_name", get_code_name(code_info["booking_type"])),
        "booking_id": code_info["booking_id"],
        "booking_type": code_info["booking_type"],
        "expires_at": code_info["expires_at"],
        "verified": code_info["verified"],
        "purpose": purpose
    }

@router.post("/resend")
async def resend_code_endpoint(request: ResendCodeRequest):
    """
    Resend/regenerate verification code for a booking
    """
    db = get_db()
    
    code_name = get_code_name(request.booking_type)
    
    # Get original booking details
    booking = await get_booking_by_id(db, request.booking_id, request.booking_type)
    additional_data = {}
    
    if booking:
        additional_data = {
            "date": booking.get("date", booking.get("appointment_date", "")),
            "time": booking.get("time", booking.get("slot", "")),
            "doctor_name": booking.get("doctor", booking.get("doctor_name", "")),
            "clinic_name": booking.get("clinic", booking.get("clinic_name", "")),
            "tests": booking.get("tests", []),
            "items": booking.get("medicines", booking.get("items", [])),
            "total": booking.get("total", 0),
            "address": booking.get("address", "")
        }
    
    result = await resend_booking_code(
        db=db,
        booking_id=request.booking_id,
        booking_type=request.booking_type,
        patient_phone=request.patient_phone,
        patient_name=request.patient_name,
        additional_data=additional_data
    )
    
    if result["success"]:
        # Send WhatsApp with new code
        try:
            booking_details = {
                "patient_name": request.patient_name,
                "booking_id": request.booking_id,
                **additional_data
            }
            
            whatsapp_result = await send_code_whatsapp(
                phone=request.patient_phone,
                code=result["code"],
                booking_type=request.booking_type,
                booking_details=booking_details,
                db=db
            )
            result["whatsapp"] = whatsapp_result
        except Exception as e:
            logger.error(f"Failed to send resend {code_name} WhatsApp: {e}")
            result["whatsapp"] = {"sent": False, "error": str(e)}
    
    return result

@router.get("/status/{booking_id}")
async def get_verification_status(booking_id: str):
    """
    Get verification status for a booking
    """
    db = get_db()
    
    code_record = await db.booking_codes.find_one(
        {"booking_id": booking_id},
        {"_id": 0}
    )
    
    if not code_record:
        return {
            "booking_id": booking_id,
            "has_code": False,
            "verified": False
        }
    
    return {
        "booking_id": booking_id,
        "has_code": True,
        "code_name": code_record.get("code_name", "Verification Code"),
        "verified": code_record.get("verified", False),
        "verified_at": code_record.get("verified_at"),
        "verified_by": code_record.get("verified_by"),
        "verifier_role": code_record.get("verifier_role"),
        "is_active": code_record.get("is_active", False),
        "attempts": code_record.get("verification_attempts", 0)
    }

# ============ HELPER FUNCTIONS ============

async def send_code_whatsapp(phone: str, code: str, booking_type: str, booking_details: dict, db) -> dict:
    """Send verification code via WhatsApp"""
    try:
        import httpx
        import os
        
        code_name = get_code_name(booking_type)
        
        MSG91_AUTH_KEY = os.environ.get("MSG91_AUTH_KEY")
        MSG91_WHATSAPP_NUMBER = os.environ.get("MSG91_WHATSAPP_NUMBER", "918108888330")
        
        if not MSG91_AUTH_KEY:
            logger.warning("MSG91_AUTH_KEY not configured")
            return {"sent": False, "error": "WhatsApp not configured"}
        
        # Clean phone number
        clean_phone = str(phone).replace("+", "").replace(" ", "").replace("-", "")
        if len(clean_phone) == 10:
            clean_phone = "91" + clean_phone
        elif not clean_phone.startswith("91"):
            clean_phone = "91" + clean_phone[-10:]
        
        # Get formatted message
        message = get_code_message(code, booking_type, booking_details)
        
        # Service names for template
        service_names = {
            "diagyn": "DiaGyn Healthcare",
            "mango": "Mango Health Labs",
            "orange": "Orange Pharmacy",
            "nevika": "Nevika Cura"
        }
        service_name = service_names.get(booking_type, "Nevika Cura")
        
        url = "https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/"
        
        # Use template with code variable
        payload = {
            "integrated_number": MSG91_WHATSAPP_NUMBER,
            "content_type": "template",
            "payload": {
                "messaging_product": "whatsapp",
                "to": clean_phone,
                "type": "template",
                "template": {
                    "name": "booking_verification_code",  # Generic verification code template
                    "language": {"code": "en", "policy": "deterministic"},
                    "components": [
                        {
                            "type": "body",
                            "parameters": [
                                {"type": "text", "text": booking_details.get("patient_name", "Customer")},
                                {"type": "text", "text": code_name},
                                {"type": "text", "text": code},
                                {"type": "text", "text": service_name},
                                {"type": "text", "text": booking_details.get("booking_id", "")}
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
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response_data = response.json()
        
        logger.info(f"{code_name} WhatsApp response: {response_data}")
        
        success = (
            response.status_code == 200 and 
            response_data.get("status") == "success"
        )
        
        # Log the code send attempt
        await db.code_send_logs.insert_one({
            "phone": clean_phone,
            "code": code,
            "code_name": code_name,
            "booking_id": booking_details.get("booking_id"),
            "booking_type": booking_type,
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "success": success,
            "response": str(response_data)
        })
        
        if success:
            logger.info(f"✅ {code_name} sent to {clean_phone}")
            return {"sent": True}
        else:
            logger.warning(f"{code_name} WhatsApp failed: {response_data}")
            return {"sent": False, "error": response_data.get("message", "Failed to send")}
            
    except Exception as e:
        logger.error(f"{code_name} WhatsApp error: {e}")
        return {"sent": False, "error": str(e)}

async def update_booking_verification_status(db, booking_id: str, booking_type: str, verified_by: str):
    """Update the booking/order with verification status"""
    try:
        code_name = get_code_name(booking_type)
        
        update_data = {
            "code_verified": True,
            "code_verified_at": datetime.now(timezone.utc).isoformat(),
            "code_verified_by": verified_by
        }
        
        if booking_type == "diagyn":
            # Update DiaGyn appointment - Appointment Code verified = Check-in
            await db.appointments.update_one(
                {"$or": [{"id": booking_id}, {"booking_id": booking_id}]},
                {"$set": {**update_data, "checked_in": True, "check_in_time": datetime.now(timezone.utc).isoformat()}}
            )
            logger.info(f"DiaGyn appointment {booking_id} checked-in via {code_name}")
            
        elif booking_type == "mango":
            # Update Mango diagnostic booking - Booking Code verified = Sample collection authorized
            await db.diagnostic_orders.update_one(
                {"$or": [{"id": booking_id}, {"booking_id": booking_id}]},
                {"$set": {**update_data, "sample_collection_verified": True}}
            )
            logger.info(f"Mango booking {booking_id} sample collection authorized via {code_name}")
            
        elif booking_type == "orange":
            # Update Orange pharmacy order - Delivery Code verified = Delivered
            await db.pharmacy_orders.update_one(
                {"$or": [{"id": booking_id}, {"booking_id": booking_id}]},
                {"$set": {**update_data, "delivery_verified": True, "status": "Delivered"}}
            )
            logger.info(f"Orange order {booking_id} delivery confirmed via {code_name}")
            
    except Exception as e:
        logger.error(f"Failed to update booking verification status: {e}")

async def get_booking_by_id(db, booking_id: str, booking_type: str) -> dict:
    """Get booking details by ID and type"""
    try:
        if booking_type == "diagyn":
            return await db.appointments.find_one(
                {"$or": [{"id": booking_id}, {"booking_id": booking_id}]},
                {"_id": 0}
            )
        elif booking_type == "mango":
            return await db.diagnostic_orders.find_one(
                {"$or": [{"id": booking_id}, {"booking_id": booking_id}]},
                {"_id": 0}
            )
        elif booking_type == "orange":
            return await db.pharmacy_orders.find_one(
                {"$or": [{"id": booking_id}, {"booking_id": booking_id}]},
                {"_id": 0}
            )
        return None
    except Exception as e:
        logger.error(f"Failed to get booking: {e}")
        return None
