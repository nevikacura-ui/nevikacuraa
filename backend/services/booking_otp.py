"""
Booking Verification Code System - SIMPLIFIED
Uses the 4-digit booking_id itself as the verification code.

- DiaGyn: Show Booking ID at check-in to staff
- Mango: Show Booking ID to phlebotomist before sample collection  
- Orange: Show Booking ID to delivery person before handover
"""

import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

# Default staff override code
DEFAULT_STAFF_CODE = "0000"

# Service-specific code names
CODE_NAMES = {
    "diagyn": "Booking ID",
    "mango": "Booking ID",
    "orange": "Booking ID",
    "nevika": "Booking ID"
}

# Verification purpose descriptions (legacy - for backward compatibility)
VERIFICATION_PURPOSES = {
    "diagyn": {
        "code_name": "Booking ID",
        "title": "Check-in Verification",
        "instruction": "Please show this Booking ID to clinic staff at check-in",
        "verifier": "Clinic Staff",
        "icon": "🏥"
    },
    "mango": {
        "code_name": "Booking ID",
        "title": "Sample Collection Verification", 
        "instruction": "Please tell this Booking ID to the phlebotomist before sample collection",
        "verifier": "Phlebotomist",
        "icon": "🧪"
    },
    "orange": {
        "code_name": "Booking ID",
        "title": "Delivery Verification",
        "instruction": "Please tell this Booking ID to the delivery person when receiving your order",
        "verifier": "Delivery Person",
        "icon": "📦"
    },
    "nevika": {
        "code_name": "Booking ID",
        "title": "Service Verification",
        "instruction": "Please share this Booking ID to confirm your service",
        "verifier": "Service Provider",
        "icon": "✅"
    }
}

def get_code_name(booking_type: str) -> str:
    """Get the user-friendly name for the code based on service type"""
    return CODE_NAMES.get(booking_type, "Booking ID")


async def verify_booking_code(
    db,
    booking_id: str,
    entered_code: str,
    verified_by: str = None,
    verifier_role: str = None,  # 'staff', 'phlebotomist', 'delivery'
    booking_type: str = "diagyn"
) -> dict:
    """
    Verify code for a booking.
    The booking_id IS the verification code (4 digits).
    
    Args:
        db: Database connection
        booking_id: Booking ID to verify (this is also the code)
        entered_code: Code entered by verifier (should match booking_id)
        verified_by: ID/name of person verifying
        verifier_role: Role of verifier
        booking_type: Type of booking for logging
    
    Returns:
        dict with success status and message
    """
    code_name = get_code_name(booking_type)
    
    # Check for default staff override code (0000) - always accepted
    if entered_code == DEFAULT_STAFF_CODE:
        logger.info(f"Default staff code {DEFAULT_STAFF_CODE} used for booking {booking_id} by {verified_by}")
        return {
            "success": True,
            "message": "Verified with staff override code",
            "booking_id": booking_id,
            "used_default_code": True
        }
    
    # Normalize both for comparison
    normalized_booking_id = str(booking_id).strip()
    normalized_entered = str(entered_code).strip()
    
    # Direct match: entered code should equal booking_id
    if normalized_entered == normalized_booking_id:
        logger.info(f"Booking ID {booking_id} verified successfully by {verified_by}")
        
        # Log verification to database
        try:
            await db.verification_logs.insert_one({
                "booking_id": booking_id,
                "booking_type": booking_type,
                "verified_by": verified_by,
                "verifier_role": verifier_role,
                "verified_at": datetime.now(timezone.utc).isoformat(),
                "success": True
            })
        except Exception as e:
            logger.warning(f"Could not log verification: {e}")
        
        return {
            "success": True,
            "message": f"{code_name} verified successfully!",
            "booking_id": booking_id,
            "verified_by": verified_by
        }
    else:
        logger.warning(f"Invalid code {normalized_entered} for booking {booking_id} by {verified_by}")
        return {
            "success": False,
            "error": "invalid_code",
            "message": f"Invalid {code_name}. Please check and try again.",
            "hint": "Use 0000 if customer doesn't have their code"
        }


# Legacy functions for backward compatibility (now simplified)

def generate_booking_code_record(
    booking_id: str,
    booking_type: str,
    patient_phone: str,
    patient_name: str,
    additional_data: dict = None
) -> dict:
    """
    Legacy function - now just returns the booking_id as the code
    """
    return {
        "code": booking_id,  # The booking_id IS the code
        "code_name": get_code_name(booking_type),
        "booking_id": booking_id,
        "booking_type": booking_type,
        "patient_phone": patient_phone,
        "patient_name": patient_name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "additional_data": additional_data or {}
    }


async def store_booking_code(db, code_record: dict) -> bool:
    """
    Legacy function - no longer needed since booking_id IS the code
    Just returns True for backward compatibility
    """
    logger.info(f"Booking ID {code_record['booking_id']} will be used as verification code")
    return True


async def get_booking_code(db, booking_id: str) -> Optional[dict]:
    """
    Get code details for a booking - returns booking_id as the code
    """
    return {
        "code": booking_id,  # The booking_id IS the code
        "code_name": "Booking ID",
        "booking_id": booking_id,
        "verified": False
    }


# Verification instructions for each service
VERIFICATION_INSTRUCTIONS = {
    "diagyn": "📌 Show your Booking ID to the clinic staff at check-in.",
    "mango": "📌 Tell your Booking ID to the phlebotomist before sample collection.",
    "orange": "📌 Tell your Booking ID to the delivery person when receiving your order."
}


def get_verification_instruction(booking_type: str) -> str:
    """Get the instruction message for verification"""
    return VERIFICATION_INSTRUCTIONS.get(booking_type, "📌 Keep your Booking ID ready for verification.")


async def resend_booking_code(
    db,
    booking_id: str,
    booking_type: str,
    patient_phone: str,
    patient_name: str,
    additional_data: dict = None
) -> dict:
    """
    Legacy function - No longer needed since booking_id IS the code.
    Returns the booking_id as the "resent" code for backward compatibility.
    """
    code_name = get_code_name(booking_type)
    
    return {
        "success": True,
        "code": booking_id,  # The booking_id IS the code
        "code_name": code_name,
        "message": f"Your {code_name} is: {booking_id}"
    }


def get_code_message(code: str, booking_type: str, booking_details: dict) -> str:
    """
    Generate verification code message text for WhatsApp - Now uses booking_id as code
    
    Args:
        code: The booking_id (which IS the verification code)
        booking_type: Type of booking
        booking_details: Additional booking details
    
    Returns:
        Formatted message string
    """
    instruction = VERIFICATION_INSTRUCTIONS.get(booking_type, "📌 Keep your Booking ID ready for verification.")
    
    if booking_type == "diagyn":
        return f"""✅ *Appointment Confirmed!*

👤 {booking_details.get('patient_name', 'Patient')}
📅 {booking_details.get('date', '')} at {booking_details.get('time', '')}
👨‍⚕️ {booking_details.get('doctor_name', 'Doctor')}
🏥 {booking_details.get('clinic_name', 'Clinic')}

🎫 *Booking ID: {code}*

{instruction}
⚠️ Do not share with anyone else."""

    elif booking_type == "mango":
        tests = booking_details.get('tests', 'Lab Tests')
        if isinstance(tests, list):
            tests = ', '.join(tests[:3])
            if len(booking_details.get('tests', [])) > 3:
                tests += f" +{len(booking_details.get('tests', [])) - 3} more"
        
        return f"""✅ *Lab Test Booking Confirmed!*

👤 {booking_details.get('patient_name', 'Patient')}
📋 Tests: {tests}
📅 {booking_details.get('date', '')} | {booking_details.get('time', '')}
📍 {booking_details.get('collection_type', 'Home Collection')}

🎫 *Booking ID: {code}*

{instruction}
⚠️ Do not share with anyone else."""

    elif booking_type == "orange":
        items = booking_details.get('items', 'Medicines')
        if isinstance(items, list):
            items = ', '.join([i.get('name', '') if isinstance(i, dict) else str(i) for i in items[:3]])
            if len(booking_details.get('items', [])) > 3:
                items += f" +{len(booking_details.get('items', [])) - 3} more"
        
        return f"""✅ *Order Confirmed!*

👤 {booking_details.get('patient_name', 'Customer')}
💊 Items: {items}
💰 Total: ₹{booking_details.get('total', 0)}
📍 {booking_details.get('address', '')}

🎫 *Booking ID: {code}*

{instruction}
⚠️ Do not share with anyone else."""

    else:
        return f"""✅ *Booking Confirmed!*

👤 {booking_details.get('patient_name', 'Customer')}

🎫 *Booking ID: {code}*

{instruction}
⚠️ Do not share with anyone else."""
