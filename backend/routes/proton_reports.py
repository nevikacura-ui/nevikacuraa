"""
Proton Diagnostics Report Download API
Secure patient access to lab reports
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import logging

router = APIRouter(prefix="/proton/report", tags=["Proton Reports"])
logger = logging.getLogger(__name__)

db = None

def set_db(database):
    global db
    db = database


class ReportVerifyRequest(BaseModel):
    booking_id: str
    phone: str
    dob: Optional[str] = None


class ReportDownloadLog(BaseModel):
    booking_id: str


@router.post("/verify")
async def verify_and_get_report(request: ReportVerifyRequest):
    """
    Verify patient identity and return report details
    Patient must provide booking_id + registered phone number
    """
    if not db:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    # Clean phone number (last 10 digits)
    clean_phone = request.phone.replace(" ", "").replace("-", "")[-10:]
    booking_id = request.booking_id.strip().upper()
    
    logger.info(f"Report verification attempt - Booking: {booking_id}, Phone: ***{clean_phone[-4:]}")
    
    # Search in lab_bookings collection
    booking = await db.lab_bookings.find_one({
        "booking_id": {"$regex": f"^{booking_id}$", "$options": "i"}
    }, {"_id": 0})
    
    if not booking:
        # Also try diagnostic_bookings
        booking = await db.diagnostic_bookings.find_one({
            "booking_id": {"$regex": f"^{booking_id}$", "$options": "i"}
        }, {"_id": 0})
    
    if not booking:
        # Try proton_bookings
        booking = await db.proton_bookings.find_one({
            "booking_id": {"$regex": f"^{booking_id}$", "$options": "i"}
        }, {"_id": 0})
    
    if not booking:
        logger.warning(f"Booking not found: {booking_id}")
        return {"success": False, "detail": "Booking not found. Please check your Booking ID."}
    
    # Verify phone number matches
    booking_phone = str(booking.get("phone", booking.get("patient_phone", ""))).replace(" ", "").replace("-", "")[-10:]
    
    if clean_phone != booking_phone:
        logger.warning(f"Phone mismatch for booking {booking_id}")
        return {"success": False, "detail": "Phone number doesn't match our records."}
    
    # Check if report exists
    report = await db.lab_reports.find_one({
        "booking_id": {"$regex": f"^{booking_id}$", "$options": "i"}
    }, {"_id": 0})
    
    # Prepare response
    report_data = {
        "booking_id": booking.get("booking_id"),
        "patient_name": booking.get("patient_name", booking.get("name", "Patient")),
        "tests": booking.get("tests", booking.get("test_name", "Lab Test")),
        "booking_date": booking.get("date", booking.get("booking_date", "")),
        "report_date": report.get("report_date") if report else None,
        "status": "ready" if report and report.get("report_url") else "processing",
        "report_url": report.get("report_url") if report else None
    }
    
    # Log verification
    await db.report_access_logs.insert_one({
        "booking_id": booking_id,
        "phone_last4": clean_phone[-4:],
        "action": "verify",
        "success": True,
        "has_report": bool(report_data.get("report_url")),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ip": None  # Would need request context
    })
    
    logger.info(f"Report verification successful - Booking: {booking_id}")
    
    return {
        "success": True,
        "report": report_data
    }


@router.post("/log-download")
async def log_report_download(request: ReportDownloadLog):
    """Log when a patient downloads their report"""
    if db:
        await db.report_access_logs.insert_one({
            "booking_id": request.booking_id,
            "action": "download",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    return {"success": True}


@router.post("/upload")
async def upload_report(
    booking_id: str,
    report_url: str,
    report_date: Optional[str] = None,
    notes: Optional[str] = None
):
    """
    Staff endpoint to upload/link a report for a booking
    """
    if not db:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    # Create or update report record
    report_data = {
        "booking_id": booking_id.upper(),
        "report_url": report_url,
        "report_date": report_date or datetime.now(timezone.utc).strftime("%d %b %Y"),
        "notes": notes,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "status": "ready"
    }
    
    result = await db.lab_reports.update_one(
        {"booking_id": booking_id.upper()},
        {"$set": report_data},
        upsert=True
    )
    
    logger.info(f"Report uploaded for booking: {booking_id}")
    
    return {
        "success": True,
        "message": f"Report uploaded for {booking_id}",
        "download_link": f"https://innerscore-health.preview.emergentagent.com/report/{booking_id.upper()}"
    }
