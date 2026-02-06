"""
Mango Health Labs Staff Portal - Enhanced API Routes
Test management, order processing, and report delivery
"""

from fastapi import APIRouter, HTTPException, Depends, Header, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import jwt
import uuid
import logging
import base64

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mango", tags=["Mango Health Labs"])

# Database and config - injected from server.py
db = None
JWT_SECRET = None
JWT_ALGORITHM = "HS256"
send_email_notification = None
send_whatsapp_notification = None
send_proton_report_ready = None

# Test Order Status Workflow
TEST_STATUSES = [
    "test_booked",
    "sample_collected",
    "in_process",
    "report_generated",
    "completed",
    "cancelled"
]

STATUS_LABELS = {
    "test_booked": "Test Booked",
    "sample_collected": "Sample Collected",
    "in_process": "In Process",
    "report_generated": "Report Generated",
    "completed": "Completed",
    "cancelled": "Cancelled"
}


def set_db(database):
    global db
    db = database


def set_jwt_config(secret, algorithm="HS256"):
    global JWT_SECRET, JWT_ALGORITHM
    JWT_SECRET = secret
    JWT_ALGORITHM = algorithm


def set_notification_functions(email_func, whatsapp_func=None, report_ready_func=None):
    global send_email_notification, send_whatsapp_notification, send_proton_report_ready
    send_email_notification = email_func
    send_whatsapp_notification = whatsapp_func
    send_proton_report_ready = report_ready_func


# ============ Auth ============

async def verify_lab_staff(authorization: str = Header(None)):
    """Verify lab staff token"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Staff authentication required")
    
    token = authorization.split(' ')[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        role = payload.get('role', '')
        dept = payload.get('department', '')
        valid = role in ['lab_staff', 'diagnostics_staff', 'admin', 'super_admin'] or \
                'lab' in role.lower() or 'mango' in dept.lower() or 'proton' in dept.lower()
        if not valid:
            raise HTTPException(status_code=403, detail="Lab staff access required")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============ Models ============

class TestCreate(BaseModel):
    name: str
    code: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    price: float
    home_collection_price: Optional[float] = None
    sample_type: Optional[str] = None  # blood, urine, stool, etc.
    turnaround_time: Optional[str] = None  # e.g., "24 hours", "Same day"
    fasting_required: bool = False
    preparation_instructions: Optional[str] = None


class TestUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    home_collection_price: Optional[float] = None
    sample_type: Optional[str] = None
    turnaround_time: Optional[str] = None
    fasting_required: Optional[bool] = None
    preparation_instructions: Optional[str] = None


class BookingStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


# ============ Test Catalog ============

@router.post("/tests")
async def create_test(data: TestCreate, staff=Depends(verify_lab_staff)):
    """Add a new test to catalog"""
    # Generate test code if not provided
    test_code = data.code
    if not test_code:
        count = await db.lab_tests.count_documents({})
        test_code = f"MHL{count + 1:04d}"
    
    test = {
        "id": str(uuid.uuid4()),
        "code": test_code,
        "name": data.name,
        "category": data.category,
        "description": data.description,
        "price": data.price,
        "home_collection_price": data.home_collection_price or data.price + 50,
        "sample_type": data.sample_type,
        "turnaround_time": data.turnaround_time,
        "fasting_required": data.fasting_required,
        "preparation_instructions": data.preparation_instructions,
        "is_active": True,
        "created_by": staff.get('name', 'Staff'),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.lab_tests.insert_one(test)
    test.pop("_id", None)
    
    return {"success": True, "message": "Test added to catalog", "test": test}


@router.get("/tests")
async def get_tests(
    search: str = None,
    category: str = None,
    active_only: bool = True,
    staff=Depends(verify_lab_staff)
):
    """Get all tests in catalog"""
    query = {}
    
    if active_only:
        query["is_active"] = True
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"code": {"$regex": search, "$options": "i"}},
            {"category": {"$regex": search, "$options": "i"}}
        ]
    
    if category:
        query["category"] = category
    
    tests = await db.lab_tests.find(query, {"_id": 0}).sort("name", 1).to_list(500)
    
    # Get categories
    categories = await db.lab_tests.distinct("category")
    
    return {
        "tests": tests,
        "total": len(tests),
        "categories": [c for c in categories if c]
    }


@router.get("/tests/{test_id}")
async def get_test(test_id: str, staff=Depends(verify_lab_staff)):
    """Get single test details"""
    test = await db.lab_tests.find_one({"id": test_id}, {"_id": 0})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    return test


@router.put("/tests/{test_id}")
async def update_test(
    test_id: str,
    data: TestUpdate,
    staff=Depends(verify_lab_staff)
):
    """Update test details"""
    test = await db.lab_tests.find_one({"id": test_id})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    for field in ['name', 'code', 'category', 'description', 'price', 
                  'home_collection_price', 'sample_type', 'turnaround_time',
                  'fasting_required', 'preparation_instructions']:
        value = getattr(data, field, None)
        if value is not None:
            update_data[field] = value
    
    await db.lab_tests.update_one({"id": test_id}, {"$set": update_data})
    
    updated = await db.lab_tests.find_one({"id": test_id}, {"_id": 0})
    return {"success": True, "message": "Test updated", "test": updated}


@router.delete("/tests/{test_id}")
async def deactivate_test(test_id: str, staff=Depends(verify_lab_staff)):
    """Deactivate a test (soft delete)"""
    result = await db.lab_tests.update_one(
        {"id": test_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Test not found")
    return {"success": True, "message": "Test deactivated"}


# ============ Test Bookings/Orders ============

@router.get("/bookings")
async def get_bookings(
    status: str = None,
    date: str = None,
    search: str = None,
    staff=Depends(verify_lab_staff)
):
    """Get all test bookings"""
    query = {}
    
    if status and status != "all":
        query["status"] = status
    
    if date:
        query["booking_date"] = date
    
    if search:
        query["$or"] = [
            {"patient_name": {"$regex": search, "$options": "i"}},
            {"patient_phone": {"$regex": search}},
            {"booking_id": {"$regex": search, "$options": "i"}}
        ]
    
    bookings = await db.lab_bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    
    # Get counts by status
    status_counts = {}
    for s in TEST_STATUSES:
        count = await db.lab_bookings.count_documents({"status": s})
        status_counts[s] = count
    
    return {
        "bookings": bookings,
        "total": len(bookings),
        "status_counts": status_counts
    }


@router.get("/bookings/{booking_id}")
async def get_booking(booking_id: str, staff=Depends(verify_lab_staff)):
    """Get single booking details"""
    booking = await db.lab_bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@router.put("/bookings/{booking_id}/status")
async def update_booking_status(
    booking_id: str,
    data: BookingStatusUpdate,
    staff=Depends(verify_lab_staff)
):
    """Update booking status"""
    booking = await db.lab_bookings.find_one({"booking_id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if data.status not in TEST_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {TEST_STATUSES}")
    
    # Check if report required before marking as report_generated
    if data.status == "report_generated" and not booking.get("report_uploaded"):
        raise HTTPException(status_code=400, detail="Please upload report before marking as Report Generated")
    
    update_data = {
        "status": data.status,
        "status_label": STATUS_LABELS.get(data.status, data.status),
        f"{data.status}_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": staff.get('name', 'Staff'),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if data.notes:
        status_history = booking.get("status_history", [])
        status_history.append({
            "status": data.status,
            "notes": data.notes,
            "by": staff.get('name', 'Staff'),
            "at": datetime.now(timezone.utc).isoformat()
        })
        update_data["status_history"] = status_history
    
    await db.lab_bookings.update_one({"booking_id": booking_id}, {"$set": update_data})
    
    # Log staff activity
    try:
        await db.staff_activity.insert_one({
            "staff_id": staff.get("sub"),
            "staff_name": staff.get("name"),
            "action": f"booking_{data.status}",
            "details": {
                "booking_id": booking_id,
                "patient_name": booking.get("patient_name"),
                "tests": booking.get("test_names", [])
            },
            "portal": "mango_labs",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d")
        })
    except Exception as e:
        logger.error(f"Failed to log activity: {e}")
    
    # Send notifications
    patient_phone = booking.get("patient_phone")
    patient_email = booking.get("patient_email")
    patient_name = booking.get("patient_name", "Patient")
    
    # WhatsApp notification
    if send_whatsapp_notification and patient_phone:
        try:
            status_msg = STATUS_LABELS.get(data.status, data.status)
            message = f"Mango Health Labs Update!\n\nHi {patient_name},\nYour test booking #{booking_id} status: {status_msg}\n\nThank you for choosing Mango Health Labs!"
            await send_whatsapp_notification(patient_phone, message)
        except Exception as e:
            logger.error(f"WhatsApp notification failed: {e}")
    
    # Email for report ready
    if send_email_notification and patient_email and data.status == "report_generated":
        try:
            subject = f"Your Lab Report is Ready - {booking_id}"
            html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #14b8a6; color: white; padding: 20px; text-align: center;">
                    <h2>Mango Health Labs</h2>
                </div>
                <div style="padding: 20px;">
                    <p>Dear {patient_name},</p>
                    <p>Your lab report for booking <strong>#{booking_id}</strong> is now ready!</p>
                    <div style="background: #f0fdfa; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #14b8a6;">
                        <p style="margin: 0;">You can:</p>
                        <ul>
                            <li>Download from the Nevika Cura app</li>
                            <li>Visit our center to collect a printed copy</li>
                        </ul>
                    </div>
                    <p>Thank you for choosing Mango Health Labs!</p>
                </div>
            </div>
            """
            await send_email_notification(
                subject=f"Mango Health Labs - {subject}",
                html_content=html,
                patient_email=patient_email,
                patient_subject=subject,
                patient_html=html
            )
        except Exception as e:
            logger.error(f"Email notification failed: {e}")
    
    return {"success": True, "message": f"Booking status updated to {data.status}"}


@router.post("/bookings/{booking_id}/report")
async def upload_report(
    booking_id: str,
    file: UploadFile = File(...),
    staff=Depends(verify_lab_staff)
):
    """Upload report PDF for booking"""
    booking = await db.lab_bookings.find_one({"booking_id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Read and encode file
    content = await file.read()
    encoded = base64.b64encode(content).decode('utf-8')
    
    await db.lab_bookings.update_one(
        {"booking_id": booking_id},
        {"$set": {
            "report_base64": encoded,
            "report_filename": file.filename,
            "report_uploaded": True,
            "report_uploaded_at": datetime.now(timezone.utc).isoformat(),
            "report_uploaded_by": staff.get('name', 'Staff')
        }}
    )
    
    return {"success": True, "message": "Report uploaded successfully"}


@router.get("/bookings/{booking_id}/report")
async def get_report(booking_id: str, staff=Depends(verify_lab_staff)):
    """Get report for booking"""
    booking = await db.lab_bookings.find_one(
        {"booking_id": booking_id},
        {"report_base64": 1, "report_filename": 1}
    )
    if not booking or not booking.get("report_base64"):
        raise HTTPException(status_code=404, detail="Report not found")
    
    return {
        "report_base64": booking.get("report_base64"),
        "filename": booking.get("report_filename", "report.pdf")
    }


@router.post("/bookings/{booking_id}/send-report")
async def send_report_to_patient(booking_id: str, staff=Depends(verify_lab_staff)):
    """Send report to patient via email and WhatsApp using MSG91 template"""
    booking = await db.lab_bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if not booking.get("report_uploaded"):
        raise HTTPException(status_code=400, detail="No report uploaded for this booking")
    
    patient_email = booking.get("patient_email")
    patient_phone = booking.get("patient_phone")
    patient_name = booking.get("patient_name", "Patient")
    tests = booking.get("tests", [])
    test_names = ", ".join([t.get("name", "") for t in tests[:3]]) or "Lab Tests"
    
    email_sent = False
    whatsapp_sent = False
    
    # Send email with report
    if send_email_notification and patient_email:
        try:
            subject = f"Your Lab Report - {booking_id} | Mango Health Labs"
            html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #14b8a6; color: white; padding: 20px; text-align: center;">
                    <h2>Mango Health Labs</h2>
                </div>
                <div style="padding: 20px;">
                    <p>Dear {patient_name},</p>
                    <p>Your lab report is ready for booking <strong>#{booking_id}</strong>.</p>
                    <p><strong>Tests:</strong> {test_names}</p>
                    <p>Please download your report from the Nevika Cura app or contact us for assistance.</p>
                    <p>If you have any questions about your results, please consult your doctor.</p>
                    <p>Thank you for choosing Mango Health Labs!</p>
                </div>
            </div>
            """
            await send_email_notification(
                subject=subject,
                html_content=html,
                patient_email=patient_email,
                patient_subject=subject,
                patient_html=html
            )
            email_sent = True
            logger.info(f"Report email sent for booking {booking_id}")
        except Exception as e:
            logger.error(f"Failed to send report email: {e}")
    
    # Send WhatsApp notification using MSG91 proton_report_ready template
    if send_proton_report_ready and patient_phone:
        try:
            result = await send_proton_report_ready(
                phone=patient_phone,
                patient_name=patient_name,
                booking_id=booking_id
            )
            whatsapp_sent = result.get("success", False)
            logger.info(f"WhatsApp report notification result: {result}")
        except Exception as e:
            logger.error(f"Failed to send WhatsApp: {e}")
    
    # Mark as sent
    await db.lab_bookings.update_one(
        {"booking_id": booking_id},
        {"$set": {
            "report_sent": True,
            "report_sent_at": datetime.now(timezone.utc).isoformat(),
            "report_sent_email": email_sent,
            "report_sent_whatsapp": whatsapp_sent
        }}
    )
    
    return {
        "success": True,
        "email_sent": email_sent,
        "whatsapp_sent": whatsapp_sent,
        "message": "Report sent to patient"
    }


# ============ Dashboard Stats ============

@router.get("/dashboard/stats")
async def get_dashboard_stats(staff=Depends(verify_lab_staff)):
    """Get dashboard statistics"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Today's bookings
    today_bookings = await db.lab_bookings.count_documents(
        {"booking_date": today}
    )
    
    # Pending sample collection
    pending_collection = await db.lab_bookings.count_documents(
        {"status": "test_booked"}
    )
    
    # In process
    in_process = await db.lab_bookings.count_documents(
        {"status": {"$in": ["sample_collected", "in_process"]}}
    )
    
    # Reports ready today
    reports_ready = await db.lab_bookings.count_documents(
        {"status": "report_generated", "report_generated_at": {"$regex": f"^{today}"}}
    )
    
    # Total tests in catalog
    total_tests = await db.lab_tests.count_documents({"is_active": True})
    
    return {
        "today_bookings": today_bookings,
        "pending_collection": pending_collection,
        "in_process": in_process,
        "reports_ready": reports_ready,
        "total_tests": total_tests
    }
