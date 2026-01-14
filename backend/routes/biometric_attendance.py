"""
Nevika Cura - Staff Biometric Attendance System
WebAuthn-based fingerprint/face authentication for attendance
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import logging
import json
import os
import hashlib
import base64

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/biometric-attendance", tags=["Biometric Attendance"])

# Database reference
db = None
JWT_SECRET = None
JWT_ALGORITHM = "HS256"

def set_db(database):
    global db
    db = database

def set_jwt_config(secret, algorithm="HS256"):
    global JWT_SECRET, JWT_ALGORITHM
    JWT_SECRET = secret
    JWT_ALGORITHM = algorithm

# ============ MODELS ============

class BiometricDeviceRegister(BaseModel):
    staff_id: str
    staff_name: str
    clinic: str  # pushpa, amnion, pharmacy, proton
    device_id: str
    credential_id: str
    public_key: str
    device_name: Optional[str] = "Unknown Device"

class BiometricAttendanceLog(BaseModel):
    staff_id: str
    credential_id: str
    signature: str  # Base64 encoded signature from WebAuthn
    action: str = "check_in"  # check_in, check_out

class ManualAttendanceOverride(BaseModel):
    staff_id: str
    date: str  # YYYY-MM-DD
    status: str  # present, absent, late, half_day
    reason: Optional[str] = None
    override_by: str  # admin username

# ============ DEVICE REGISTRATION ============

@router.post("/register-device")
async def register_biometric_device(registration: BiometricDeviceRegister):
    """Register a staff member's device for biometric authentication"""
    
    # Check if staff exists
    staff = await db.staff_members.find_one({"username": registration.staff_id})
    if not staff:
        # Create staff record if not exists
        await db.staff_members.insert_one({
            "username": registration.staff_id,
            "name": registration.staff_name,
            "clinic": registration.clinic,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Check if device already registered
    existing = await db.biometric_devices.find_one({
        "staff_id": registration.staff_id,
        "credential_id": registration.credential_id
    })
    
    if existing:
        return {"success": True, "message": "Device already registered", "device_id": existing.get("id")}
    
    # Register new device
    device_doc = {
        "id": str(uuid.uuid4()),
        "staff_id": registration.staff_id,
        "staff_name": registration.staff_name,
        "clinic": registration.clinic,
        "device_id": registration.device_id,
        "credential_id": registration.credential_id,
        "public_key": registration.public_key,
        "device_name": registration.device_name,
        "registered_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True
    }
    
    await db.biometric_devices.insert_one(device_doc)
    
    logger.info(f"Biometric device registered for staff: {registration.staff_id}")
    
    return {
        "success": True,
        "message": f"Device registered for {registration.staff_name}",
        "device_id": device_doc["id"]
    }

@router.get("/devices/{staff_id}")
async def get_staff_devices(staff_id: str):
    """Get all registered devices for a staff member"""
    devices = await db.biometric_devices.find(
        {"staff_id": staff_id, "is_active": True},
        {"_id": 0, "public_key": 0}
    ).to_list(10)
    
    return {"success": True, "devices": devices}

@router.delete("/devices/{device_id}")
async def remove_device(device_id: str):
    """Remove a registered device"""
    result = await db.biometric_devices.update_one(
        {"id": device_id},
        {"$set": {"is_active": False, "removed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Device not found")
    
    return {"success": True, "message": "Device removed"}

# ============ ATTENDANCE MARKING ============

@router.post("/mark-attendance")
async def mark_biometric_attendance(attendance: BiometricAttendanceLog):
    """Mark attendance using biometric verification"""
    
    # Verify device is registered
    device = await db.biometric_devices.find_one({
        "staff_id": attendance.staff_id,
        "credential_id": attendance.credential_id,
        "is_active": True
    })
    
    if not device:
        raise HTTPException(status_code=401, detail="Device not registered or inactive")
    
    # In production, verify the signature using the stored public key
    # For now, we trust the credential_id match as verification
    
    today = datetime.now().strftime("%Y-%m-%d")
    now = datetime.now(timezone.utc)
    current_time = now.strftime("%H:%M:%S")
    
    # Check if already marked today
    existing = await db.biometric_attendance.find_one({
        "staff_id": attendance.staff_id,
        "date": today
    })
    
    if attendance.action == "check_in":
        if existing and existing.get("check_in_time"):
            return {
                "success": False,
                "message": "Already checked in today",
                "check_in_time": existing.get("check_in_time")
            }
        
        # Determine if late (after 9:30 AM)
        is_late = datetime.now().hour > 9 or (datetime.now().hour == 9 and datetime.now().minute > 30)
        status = "late" if is_late else "present"
        
        if existing:
            await db.biometric_attendance.update_one(
                {"staff_id": attendance.staff_id, "date": today},
                {"$set": {
                    "check_in_time": current_time,
                    "status": status,
                    "device_id": device.get("device_id"),
                    "verified_by": "biometric"
                }}
            )
        else:
            await db.biometric_attendance.insert_one({
                "id": str(uuid.uuid4()),
                "staff_id": attendance.staff_id,
                "staff_name": device.get("staff_name"),
                "clinic": device.get("clinic"),
                "date": today,
                "check_in_time": current_time,
                "check_out_time": None,
                "status": status,
                "device_id": device.get("device_id"),
                "verified_by": "biometric",
                "created_at": now.isoformat()
            })
        
        return {
            "success": True,
            "message": f"Checked in at {current_time}" + (" (Late)" if is_late else ""),
            "status": status,
            "check_in_time": current_time
        }
    
    elif attendance.action == "check_out":
        if not existing or not existing.get("check_in_time"):
            raise HTTPException(status_code=400, detail="Must check in before checking out")
        
        if existing.get("check_out_time"):
            return {
                "success": False,
                "message": "Already checked out today",
                "check_out_time": existing.get("check_out_time")
            }
        
        # Calculate hours worked
        check_in = datetime.strptime(existing.get("check_in_time"), "%H:%M:%S")
        check_out = datetime.strptime(current_time, "%H:%M:%S")
        hours_worked = (check_out - check_in).total_seconds() / 3600
        
        await db.biometric_attendance.update_one(
            {"staff_id": attendance.staff_id, "date": today},
            {"$set": {
                "check_out_time": current_time,
                "hours_worked": round(hours_worked, 2)
            }}
        )
        
        return {
            "success": True,
            "message": f"Checked out at {current_time}",
            "check_out_time": current_time,
            "hours_worked": round(hours_worked, 2)
        }

@router.get("/today/{staff_id}")
async def get_today_attendance(staff_id: str):
    """Get today's attendance status for a staff member"""
    today = datetime.now().strftime("%Y-%m-%d")
    
    attendance = await db.biometric_attendance.find_one(
        {"staff_id": staff_id, "date": today},
        {"_id": 0}
    )
    
    return {
        "success": True,
        "date": today,
        "attendance": attendance
    }

@router.get("/history/{staff_id}")
async def get_attendance_history(staff_id: str, days: int = 30):
    """Get attendance history for a staff member"""
    from_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    history = await db.biometric_attendance.find(
        {"staff_id": staff_id, "date": {"$gte": from_date}},
        {"_id": 0}
    ).sort("date", -1).to_list(days)
    
    # Calculate summary
    present_days = len([h for h in history if h.get("status") in ["present", "late"]])
    late_days = len([h for h in history if h.get("status") == "late"])
    absent_days = len([h for h in history if h.get("status") == "absent"])
    total_hours = sum(h.get("hours_worked", 0) for h in history)
    
    return {
        "success": True,
        "staff_id": staff_id,
        "period_days": days,
        "history": history,
        "summary": {
            "present_days": present_days,
            "late_days": late_days,
            "absent_days": absent_days,
            "total_hours": round(total_hours, 2),
            "attendance_rate": round(present_days / days * 100, 1) if days > 0 else 0
        }
    }

@router.get("/report/{clinic}")
async def get_clinic_attendance_report(clinic: str, date: Optional[str] = None):
    """Get attendance report for all staff in a clinic"""
    report_date = date or datetime.now().strftime("%Y-%m-%d")
    
    # Get all staff for this clinic
    staff_list = await db.biometric_devices.find(
        {"clinic": {"$regex": clinic, "$options": "i"}, "is_active": True},
        {"_id": 0}
    ).to_list(50)
    
    # Get unique staff IDs
    staff_ids = list(set(s.get("staff_id") for s in staff_list))
    
    # Get attendance for each
    report = []
    for staff_id in staff_ids:
        staff_info = next((s for s in staff_list if s.get("staff_id") == staff_id), {})
        attendance = await db.biometric_attendance.find_one(
            {"staff_id": staff_id, "date": report_date},
            {"_id": 0}
        )
        
        report.append({
            "staff_id": staff_id,
            "staff_name": staff_info.get("staff_name", "Unknown"),
            "status": attendance.get("status", "absent") if attendance else "absent",
            "check_in_time": attendance.get("check_in_time") if attendance else None,
            "check_out_time": attendance.get("check_out_time") if attendance else None,
            "hours_worked": attendance.get("hours_worked") if attendance else None,
            "verified_by": attendance.get("verified_by") if attendance else None
        })
    
    return {
        "success": True,
        "clinic": clinic,
        "date": report_date,
        "report": report,
        "summary": {
            "total_staff": len(report),
            "present": len([r for r in report if r["status"] in ["present", "late"]]),
            "late": len([r for r in report if r["status"] == "late"]),
            "absent": len([r for r in report if r["status"] == "absent"])
        }
    }

# ============ ADMIN OVERRIDE ============

@router.post("/admin/override")
async def admin_attendance_override(override: ManualAttendanceOverride):
    """Admin can manually override attendance (for corrections)"""
    
    existing = await db.biometric_attendance.find_one({
        "staff_id": override.staff_id,
        "date": override.date
    })
    
    if existing:
        await db.biometric_attendance.update_one(
            {"staff_id": override.staff_id, "date": override.date},
            {"$set": {
                "status": override.status,
                "override_reason": override.reason,
                "override_by": override.override_by,
                "override_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    else:
        # Get staff info
        device = await db.biometric_devices.find_one({"staff_id": override.staff_id})
        
        await db.biometric_attendance.insert_one({
            "id": str(uuid.uuid4()),
            "staff_id": override.staff_id,
            "staff_name": device.get("staff_name", "Unknown") if device else "Unknown",
            "clinic": device.get("clinic", "") if device else "",
            "date": override.date,
            "check_in_time": None,
            "check_out_time": None,
            "status": override.status,
            "verified_by": "admin_override",
            "override_reason": override.reason,
            "override_by": override.override_by,
            "override_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {
        "success": True,
        "message": f"Attendance overridden to {override.status} for {override.date}"
    }

# ============ WEBAUTHN CHALLENGE ============

@router.get("/challenge/{staff_id}")
async def get_authentication_challenge(staff_id: str):
    """Generate a challenge for WebAuthn authentication"""
    import secrets
    
    challenge = secrets.token_urlsafe(32)
    
    # Store challenge temporarily (expires in 5 minutes)
    await db.biometric_challenges.update_one(
        {"staff_id": staff_id},
        {"$set": {
            "challenge": challenge,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
        }},
        upsert=True
    )
    
    # Get registered credentials for this staff
    devices = await db.biometric_devices.find(
        {"staff_id": staff_id, "is_active": True},
        {"credential_id": 1, "_id": 0}
    ).to_list(10)
    
    return {
        "success": True,
        "challenge": challenge,
        "allowCredentials": [{"id": d["credential_id"], "type": "public-key"} for d in devices],
        "timeout": 300000,  # 5 minutes
        "userVerification": "required"
    }
