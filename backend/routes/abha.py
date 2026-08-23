from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import re

router = APIRouter(prefix="/abha", tags=["ABHA/NDHM"])

db = None

def set_db(database):
    global db
    db = database

# ── Models ──

class ABHACreateRequest(BaseModel):
    method: str  # 'aadhaar' or 'mobile'
    identifier: str  # Aadhaar number or mobile number
    name: str
    year_of_birth: Optional[int] = None
    gender: Optional[str] = None

class ABHAVerifyOTPRequest(BaseModel):
    transaction_id: str
    otp: str

class ABHALinkRequest(BaseModel):
    abha_number: str
    phone: str

# ── Endpoints ──

@router.post("/create/init")
async def init_abha_creation(req: ABHACreateRequest):
    """Initialize ABHA creation - sends OTP to Aadhaar-linked mobile or direct mobile"""
    if req.method == 'aadhaar':
        if not re.match(r'^\d{12}$', req.identifier):
            raise HTTPException(400, "Invalid Aadhaar number. Must be 12 digits.")
    elif req.method == 'mobile':
        if not re.match(r'^\d{10}$', req.identifier):
            raise HTTPException(400, "Invalid mobile number. Must be 10 digits.")
    else:
        raise HTTPException(400, "Method must be 'aadhaar' or 'mobile'")

    # Store pending registration
    txn_id = f"TXN-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{req.identifier[-4:]}"
    
    await db.abha_registrations.insert_one({
        "transaction_id": txn_id,
        "method": req.method,
        "identifier_last4": req.identifier[-4:],
        "name": req.name,
        "year_of_birth": req.year_of_birth,
        "gender": req.gender,
        "status": "otp_sent",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    # NOTE: In production, this calls ABDM sandbox API:
    # POST https://healthidsbx.abdm.gov.in/api/v1/registration/aadhaar/generateOtp
    # or POST https://healthidsbx.abdm.gov.in/api/v1/registration/mobile/generateOtp
    # For now, return demo response
    return {
        "transaction_id": txn_id,
        "message": f"OTP sent to {'Aadhaar-linked mobile' if req.method == 'aadhaar' else 'mobile number'}",
        "demo_mode": True,
        "hint": "Use OTP 123456 in demo mode. For production, configure ABDM sandbox credentials."
    }


@router.post("/create/verify")
async def verify_abha_otp(req: ABHAVerifyOTPRequest):
    """Verify OTP and create ABHA number"""
    registration = await db.abha_registrations.find_one(
        {"transaction_id": req.transaction_id, "status": "otp_sent"},
        {"_id": 0}
    )
    if not registration:
        raise HTTPException(404, "Transaction not found or already completed")

    # Demo mode: accept 123456
    if req.otp != "123456":
        raise HTTPException(400, "Invalid OTP. In demo mode, use 123456.")

    # Generate demo ABHA number
    import random
    abha_number = f"{random.randint(10,99)}-{random.randint(1000,9999)}-{random.randint(1000,9999)}-{random.randint(1000,9999)}"
    abha_address = f"{registration['name'].lower().replace(' ', '')}{random.randint(10,99)}@abdm"

    # Create ABHA record
    abha_record = {
        "abha_number": abha_number,
        "abha_address": abha_address,
        "name": registration["name"],
        "year_of_birth": registration.get("year_of_birth"),
        "gender": registration.get("gender"),
        "method": registration["method"],
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "linked_records": [],
        "demo_mode": True,
    }
    await db.abha_accounts.insert_one({**abha_record})
    abha_record.pop("_id", None)

    # Update registration status
    await db.abha_registrations.update_one(
        {"transaction_id": req.transaction_id},
        {"$set": {"status": "completed", "abha_number": abha_number}}
    )

    # NOTE: In production, this calls ABDM API:
    # POST https://healthidsbx.abdm.gov.in/api/v1/registration/aadhaar/verifyOTP
    return {
        "abha_number": abha_number,
        "abha_address": abha_address,
        "name": registration["name"],
        "status": "active",
        "demo_mode": True,
        "message": "ABHA Health ID created successfully!"
    }


@router.post("/link")
async def link_abha_to_phone(req: ABHALinkRequest):
    """Link an existing ABHA number to a patient's phone"""
    # Check if phone has a user
    user = await db.users.find_one({"phone": req.phone}, {"_id": 0, "name": 1, "phone": 1})

    # Store the link
    await db.abha_links.update_one(
        {"phone": req.phone},
        {"$set": {
            "abha_number": req.abha_number,
            "phone": req.phone,
            "patient_name": user.get("name", "Unknown") if user else "Unknown",
            "linked_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True
    )

    return {
        "message": "ABHA linked to your account",
        "abha_number": req.abha_number,
        "phone": req.phone,
    }


@router.get("/profile/{phone}")
async def get_abha_profile(phone: str):
    """Get ABHA profile linked to a phone number"""
    link = await db.abha_links.find_one({"phone": phone}, {"_id": 0})
    if not link:
        return {"linked": False, "message": "No ABHA linked to this number"}

    abha = await db.abha_accounts.find_one(
        {"abha_number": link["abha_number"]},
        {"_id": 0}
    )

    return {
        "linked": True,
        "abha_number": link["abha_number"],
        "abha_address": abha.get("abha_address", "") if abha else "",
        "name": abha.get("name", link.get("patient_name", "")) if abha else link.get("patient_name", ""),
        "year_of_birth": abha.get("year_of_birth") if abha else None,
        "gender": abha.get("gender") if abha else None,
        "status": abha.get("status", "active") if abha else "unknown",
        "linked_records": abha.get("linked_records", []) if abha else [],
        "demo_mode": abha.get("demo_mode", True) if abha else True,
    }


@router.get("/records/{abha_number}")
async def get_health_records(abha_number: str):
    """Get health records linked to an ABHA number"""
    abha = await db.abha_accounts.find_one(
        {"abha_number": abha_number},
        {"_id": 0}
    )
    if not abha:
        raise HTTPException(404, "ABHA account not found")

    # Fetch linked records from the platform
    records = []

    # Get appointments
    appointments = await db.appointments.find(
        {"abha_number": abha_number},
        {"_id": 0, "booking_id": 1, "doctor_name": 1, "date": 1, "status": 1, "clinic": 1}
    ).sort("date", -1).to_list(20)
    for apt in appointments:
        records.append({"type": "appointment", **apt})

    # Get diagnostic orders
    diag_orders = await db.diagnostic_orders.find(
        {"abha_number": abha_number},
        {"_id": 0, "order_id": 1, "tests": 1, "date": 1, "status": 1}
    ).sort("created_at", -1).to_list(20)
    for order in diag_orders:
        records.append({"type": "diagnostic", **order})

    return {
        "abha_number": abha_number,
        "name": abha.get("name", ""),
        "records": records,
        "total": len(records),
        "demo_mode": True,
        "note": "In production, records sync via ABDM Health Information Exchange (HIE-CM)"
    }
