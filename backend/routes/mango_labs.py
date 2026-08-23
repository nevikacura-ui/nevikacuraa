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


# ============ Public Test Catalog (No Auth) ============

@router.get("/test-catalog")
async def get_public_test_catalog(
    search: str = None,
    category: str = None,
    sort_by: str = None,
    min_price: float = None,
    max_price: float = None,
    sample_type: str = None,
    fasting: str = None
):
    """Public endpoint - returns test catalog for patients (no auth required)"""
    query = {"is_active": True}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"category": {"$regex": search, "$options": "i"}}
        ]
    if category:
        query["category"] = category
    if sample_type:
        query["sample_type"] = {"$regex": sample_type, "$options": "i"}
    if fasting == "yes":
        query["fasting_required"] = True
    elif fasting == "no":
        query["fasting_required"] = False
    if min_price is not None:
        query.setdefault("price", {})["$gte"] = min_price
    if max_price is not None:
        query.setdefault("price", {})["$lte"] = max_price

    sort_field = "name"
    sort_dir = 1
    if sort_by == "price_low":
        sort_field, sort_dir = "price", 1
    elif sort_by == "price_high":
        sort_field, sort_dir = "price", -1
    elif sort_by == "name_az":
        sort_field, sort_dir = "name", 1
    elif sort_by == "name_za":
        sort_field, sort_dir = "name", -1

    tests = await db.lab_tests.find(
        query,
        {"_id": 0, "id": 1, "name": 1, "code": 1, "category": 1, "price": 1,
         "home_collection_price": 1, "sample_type": 1, "turnaround_time": 1,
         "fasting_required": 1, "preparation_instructions": 1}
    ).sort(sort_field, sort_dir).to_list(500)

    categories = await db.lab_tests.distinct("category", {"is_active": True})
    sample_types = await db.lab_tests.distinct("sample_type", {"is_active": True})

    return {
        "tests": tests,
        "total": len(tests),
        "categories": sorted([c for c in categories if c]),
        "sample_types": sorted([s for s in sample_types if s])
    }


# ============ Test Catalog (Staff) ============

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
            from services.email_templates import mango_report_ready_email
            tests_list = [t.get("name", t) if isinstance(t, dict) else str(t) for t in booking.get("tests", [])]
            html = mango_report_ready_email(patient_name, booking_id, tests_list)
            subject = f"Your Lab Report is Ready - {booking_id}"
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
            from services.email_templates import mango_report_ready_email
            tests_list = [t.get("name", t) if isinstance(t, dict) else str(t) for t in tests[:5]]
            html = mango_report_ready_email(patient_name, booking_id, tests_list)
            subject = f"Your Lab Report - {booking_id} | Mango Health Labs"
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



# ==================== MANGO LAB BOOKING INVOICE ====================
from fastapi.responses import HTMLResponse

LOGO_MANGO = "https://customer-assets.emergentagent.com/job_1fa4546e-4936-4955-8a5d-dab926a22cbb/artifacts/28cub72l_Add%20a%20subheading_20260311_123952_0000.png"
LOGO_CURAPAY_M = "https://customer-assets.emergentagent.com/job_1fa4546e-4936-4955-8a5d-dab926a22cbb/artifacts/bqr5vr04_file_00000000d14471faa6dd7695a521413d.png"

@router.get("/invoice/{booking_id}", response_class=HTMLResponse)
async def get_mango_invoice(booking_id: str):
    """Generate printable Mango Labs booking invoice"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    booking = await db.mango_bookings.find_one(
        {"$or": [{"booking_id": booking_id}, {"id": booking_id}]},
        {"_id": 0}
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    name = booking.get("patient_name", "Patient")
    phone = booking.get("patient_phone", "")
    email = booking.get("patient_email", "")
    bid = booking.get("booking_id", booking_id)
    status = booking.get("status", "")
    tests = booking.get("tests", [])
    amount = booking.get("total_amount", 0)
    payment = booking.get("payment_method", "COD")
    payment_status = booking.get("payment_status", "Pending")
    date_raw = booking.get("booking_date", booking.get("preferred_date", booking.get("created_at", "")))
    collection = booking.get("collection_type", "Visit Center")
    address = booking.get("collection_address", booking.get("address", ""))
    time_slot = booking.get("time_slot", "")

    try:
        if isinstance(date_raw, str) and date_raw:
            dt = datetime.fromisoformat(date_raw.replace("Z", "+00:00"))
            date_str = dt.strftime("%d %b %Y")
        else:
            date_str = str(date_raw)[:10] if date_raw else "N/A"
    except Exception:
        date_str = str(date_raw)[:10] if date_raw else "N/A"

    # Tests table
    tests_rows = ""
    for t in tests:
        t_name = t.get("name", t) if isinstance(t, dict) else str(t)
        t_price = t.get("price", "") if isinstance(t, dict) else ""
        tests_rows += f'<div class="row"><span class="label">{t_name}</span><span class="value">{t_price}</span></div>'
    if not tests_rows:
        tests_rows = '<div class="row"><span class="label">Lab Tests</span><span class="value">As prescribed</span></div>'

    status_color = '#10b981' if status in ('completed', 'report_ready') else '#D4A017' if status in ('sample_collected', 'in_process') else '#f59e0b'
    status_label = status.replace('_', ' ').upper() if status else 'BOOKED'

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice — {bid}</title>
<style>
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ font-family: 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7; color: #1e293b; }}
  .invoice {{ max-width: 600px; margin: 24px auto; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }}
  .header {{ background: linear-gradient(135deg, #8B6914, #D4A017); padding: 32px 28px 24px; text-align: center; }}
  .header img {{ height: 40px; margin-bottom: 14px; }}
  .header h1 {{ color: #fff; font-size: 22px; font-weight: 800; letter-spacing: 1px; }}
  .header p {{ color: rgba(255,255,255,0.65); font-size: 11px; margin-top: 4px; letter-spacing: 0.5px; }}
  .status-badge {{ display: inline-block; background: {status_color}; color: #fff; font-size: 11px; font-weight: 800; padding: 4px 16px; border-radius: 20px; margin-top: 12px; letter-spacing: 1.5px; }}
  .body {{ padding: 28px; }}
  .section-title {{ font-size: 9px; font-weight: 700; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px; }}
  .row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }}
  .row:last-child {{ border-bottom: none; }}
  .row .label {{ color: #64748b; font-size: 13px; }}
  .row .value {{ color: #1e293b; font-size: 13px; font-weight: 600; text-align: right; max-width: 60%; }}
  .total-box {{ background: #fef9e7; border-radius: 14px; padding: 16px 20px; margin: 16px 0; display: flex; justify-content: space-between; align-items: center; border: 1px solid #f5deb3; }}
  .total-box .total-label {{ font-size: 13px; color: #64748b; }}
  .total-box .total-amount {{ font-size: 22px; font-weight: 800; color: #8B6914; }}
  .footer {{ padding: 20px 28px 28px; text-align: center; border-top: 1px solid #f1f5f9; }}
  .footer .powered {{ display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 10px; }}
  .footer .powered img {{ height: 28px; border-radius: 6px; }}
  .footer .powered span {{ font-size: 10px; color: #94a3b8; }}
  .footer .powered strong {{ font-size: 12px; color: #D4A017; font-weight: 700; }}
  .footer p {{ font-size: 10px; color: #94a3b8; line-height: 1.6; }}
  @media print {{ body {{ background: #fff; }} .invoice {{ box-shadow: none; margin: 0; border-radius: 0; }} .no-print {{ display: none !important; }} }}
  .print-btn {{ display: block; width: fit-content; margin: 16px auto; background: #D4A017; color: #fff; border: none; padding: 12px 32px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; }}
  .print-btn:hover {{ background: #8B6914; }}
</style>
</head>
<body>
<div class="no-print" style="text-align:center;padding-top:16px;">
  <button class="print-btn" onclick="window.print()">Download / Print Invoice</button>
</div>
<div class="invoice">
  <div class="header">
    <img src="{LOGO_MANGO}" alt="Mango Health Labs" />
    <h1>INVOICE</h1>
    <p>Lab Booking Receipt</p>
    <div class="status-badge">{status_label}</div>
  </div>
  <div class="body">
    <p class="section-title">Invoice Details</p>
    <div class="row"><span class="label">Booking ID</span><span class="value">{bid}</span></div>
    <div class="row"><span class="label">Date</span><span class="value">{date_str}</span></div>
    {f'<div class="row"><span class="label">Time Slot</span><span class="value">{time_slot}</span></div>' if time_slot else ''}
    <div class="row"><span class="label">Collection</span><span class="value">{collection}</span></div>
    {f'<div class="row"><span class="label">Address</span><span class="value">{address}</span></div>' if address else ''}

    <p class="section-title" style="margin-top:20px;">Patient</p>
    <div class="row"><span class="label">Name</span><span class="value">{name}</span></div>
    {f'<div class="row"><span class="label">Phone</span><span class="value">{phone}</span></div>' if phone else ''}
    {f'<div class="row"><span class="label">Email</span><span class="value">{email}</span></div>' if email else ''}

    <p class="section-title" style="margin-top:20px;">Tests</p>
    {tests_rows}

    <p class="section-title" style="margin-top:20px;">Payment</p>
    <div class="row"><span class="label">Method</span><span class="value">{payment}</span></div>
    <div class="row"><span class="label">Status</span><span class="value">{payment_status}</span></div>

    {f'<div class="total-box"><span class="total-label">Total Amount</span><span class="total-amount">&#8377;{amount}</span></div>' if amount else ''}
  </div>
  <div class="footer">
    <div class="powered">
      <img src="{LOGO_CURAPAY_M}" alt="CuraPay" />
      <div><span>Powered by</span><br/><strong>CuraPay</strong></div>
    </div>
    <p>This is a computer-generated invoice.<br/>Mango Health Labs &bull; Nevika Cura Healthcare Pvt. Ltd.</p>
  </div>
</div>
</body>
</html>"""
    return HTMLResponse(content=html)


# ============ OTP-Based Collection Verification ============

class CollectionVerification(BaseModel):
    booking_id: str
    verification_code: str


@router.post("/collection/verify")
async def verify_collection(data: CollectionVerification):
    """
    Phlebotomist verifies sample collection by entering the 6-digit booking ID.
    The patient shares their booking ID verbally as the verification code.
    Works for Mango Health Labs, Proton Diagnostics, Nexugene.
    """
    # Search across lab bookings and diagnostic orders
    booking = await db.lab_bookings.find_one({"booking_id": data.booking_id}, {"_id": 0})
    source_collection = "lab_bookings"
    id_field = "booking_id"

    if not booking:
        booking = await db.diagnostic_orders.find_one({"booking_id": data.booking_id}, {"_id": 0})
        source_collection = "diagnostic_orders"

    if not booking:
        booking = await db.lab_orders.find_one({"id": data.booking_id}, {"_id": 0})
        source_collection = "lab_orders"
        id_field = "id"

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    actual_id = booking.get("booking_id") or booking.get("id", "")

    # Verify code matches the booking ID
    if data.verification_code.strip() != actual_id.strip():
        return {"success": False, "error": "Invalid code. Ask patient for their booking number."}

    # Check if already collected
    if booking.get("status") in ("sample_collected", "processing", "report_ready", "completed"):
        return {"success": False, "error": "Sample already collected for this booking."}

    # Mark as sample collected
    now = datetime.now(timezone.utc).isoformat()
    update = {
        "status": "sample_collected",
        "sample_collected_at": now,
        "collection_verified": True,
        "collection_verification_time": now
    }

    await db[source_collection].update_one(
        {id_field: actual_id},
        {"$set": update}
    )

    return {
        "success": True,
        "message": f"Sample collection verified for booking #{actual_id}",
        "booking_id": actual_id,
        "collected_at": now
    }


@router.get("/collection/{booking_id}/info")
async def get_collection_info(booking_id: str):
    """Get booking info for phlebotomist collection page (public - no auth)"""
    booking = await db.lab_bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        booking = await db.diagnostic_orders.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        booking = await db.lab_orders.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    tests = booking.get("tests", booking.get("items", []))
    patient = booking.get("patient_name", booking.get("customer", {}).get("name", "Patient"))
    phone = booking.get("patient_phone", booking.get("customer", {}).get("phone", ""))
    address = booking.get("address", booking.get("collection_address", ""))

    return {
        "success": True,
        "booking_id": booking.get("booking_id") or booking.get("id"),
        "status": booking.get("status", "pending"),
        "patient_name": patient,
        "patient_phone": phone,
        "address": address,
        "tests": [{"name": t.get("name", t.get("test_name", "Test")), "price": t.get("price", 0)} for t in tests] if tests else [],
        "total": booking.get("total_amount", booking.get("total", 0)),
        "collection_time": booking.get("preferred_time", booking.get("time_slot", "")),
        "created_at": booking.get("created_at", "")
    }
