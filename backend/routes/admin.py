"""
Nevika Cura - Admin Routes
Administrative endpoints for the super admin dashboard
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import jwt
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])

# Will be injected from server.py
db = None
JWT_SECRET = None
JWT_ALGORITHM = "HS256"
ADMIN_PASSWORD = None
send_email_notification = None
send_sms_notification = None

def set_db(database):
    global db
    db = database

def set_jwt_config(secret, algorithm="HS256"):
    global JWT_SECRET, JWT_ALGORITHM
    JWT_SECRET = secret
    JWT_ALGORITHM = algorithm

def set_admin_password(password):
    global ADMIN_PASSWORD
    ADMIN_PASSWORD = password

def set_notification_functions(email_func, sms_func):
    global send_email_notification, send_sms_notification
    send_email_notification = email_func
    send_sms_notification = sms_func


# ============ Models ============

class AdminLogin(BaseModel):
    password: str

class StaffCreate(BaseModel):
    name: str
    phone: str
    role: str  # clinic_staff, pharmacy_staff, diagnostic_staff, doctor
    department: Optional[str] = None
    email: Optional[str] = None

class StaffUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    email: Optional[str] = None

class BroadcastNotification(BaseModel):
    title: str
    message: str

class LoyaltyPointsSubtract(BaseModel):
    phone: str
    points: int
    reason: str


# ============ Auth Functions ============

async def verify_admin(authorization: str = Header(None)):
    """Verify admin token"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Admin authentication required")
    
    token = authorization.split(' ')[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get('role') not in ['admin', 'super_admin']:
            raise HTTPException(status_code=403, detail="Admin access required")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Admin session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid admin token")


# ============ Admin Login ============

@router.post("/login")
async def admin_login(input: AdminLogin):
    """Admin login with password"""
    if input.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin password")
    
    # Generate admin token with 30 days expiry for persistent login
    admin_token = jwt.encode({
        'sub': 'admin',
        'role': 'super_admin',
        'name': 'Super Admin',
        'exp': datetime.now(timezone.utc) + timedelta(days=30)
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return {"token": admin_token, "role": "super_admin", "name": "Super Admin"}


# ============ Staff Management ============

@router.post("/staff")
async def create_staff(staff: StaffCreate, admin = Depends(verify_admin)):
    """Create a new staff member"""
    import uuid
    
    existing = await db.staff.find_one({"phone": staff.phone})
    if existing:
        raise HTTPException(status_code=400, detail="Staff member with this phone already exists")
    
    # Generate access code
    import random
    access_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    
    staff_doc = {
        "id": str(uuid.uuid4()),
        "name": staff.name,
        "phone": staff.phone,
        "role": staff.role,
        "department": staff.department,
        "email": staff.email,
        "access_code": access_code,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.staff.insert_one(staff_doc)
    staff_doc.pop("_id", None)
    
    return {"message": "Staff created", "staff": staff_doc}


@router.get("/staff")
async def list_staff(admin = Depends(verify_admin)):
    """List all staff members"""
    staff_list = await db.staff.find({}, {"_id": 0}).to_list(100)
    return {"staff": staff_list}


@router.delete("/staff/{staff_id}")
async def delete_staff(staff_id: str, admin = Depends(verify_admin)):
    """Delete a staff member"""
    result = await db.staff.delete_one({"id": staff_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Staff not found")
    return {"message": "Staff deleted"}


@router.put("/staff/{staff_id}")
async def update_staff(staff_id: str, update: StaffUpdate, admin = Depends(verify_admin)):
    """Update staff member details"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.staff.update_one(
        {"id": staff_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    updated_staff = await db.staff.find_one({"id": staff_id}, {"_id": 0})
    return {"message": "Staff updated", "staff": updated_staff}


@router.put("/staff/{staff_id}/toggle")
async def toggle_staff_status(staff_id: str, admin = Depends(verify_admin)):
    """Toggle staff active status"""
    staff = await db.staff.find_one({"id": staff_id})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    new_status = not staff.get("is_active", True)
    await db.staff.update_one(
        {"id": staff_id},
        {"$set": {"is_active": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": f"Staff {'activated' if new_status else 'deactivated'}", "is_active": new_status}


# ============ Dashboard Stats ============

@router.get("/stats")
async def get_admin_stats(admin = Depends(verify_admin)):
    """Get dashboard statistics"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    stats = {
        "total_appointments_today": await db.appointments.count_documents({"date": today}),
        "pending_appointments": await db.appointments.count_documents({"date": today, "status": {"$in": ["pending", "Booked"]}}),
        "completed_appointments": await db.appointments.count_documents({"date": today, "status": "Completed"}),
        "total_diagnostic_orders": await db.diagnostic_orders.count_documents({"preferred_date": today}),
        "total_pharmacy_orders": await db.pharmacy_orders.count_documents({}),
        "pending_pharmacy": await db.pharmacy_orders.count_documents({"status": {"$in": ["pending", "Pending", "Processing"]}}),
        "total_users": await db.users.count_documents({}),
        "total_staff": await db.staff.count_documents({"is_active": True})
    }
    
    return stats


@router.get("/analytics")
async def get_admin_analytics(days: int = 7, admin = Depends(verify_admin)):
    """Get analytics data for the specified number of days"""
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    
    # Daily appointment counts
    daily_stats = []
    for i in range(days):
        date = (end_date - timedelta(days=i)).strftime("%Y-%m-%d")
        appointments = await db.appointments.count_documents({"date": date})
        diagnostic = await db.diagnostic_orders.count_documents({"preferred_date": date})
        pharmacy = await db.pharmacy_orders.count_documents({
            "created_at": {"$regex": f"^{date}"}
        })
        daily_stats.append({
            "date": date,
            "appointments": appointments,
            "diagnostic_orders": diagnostic,
            "pharmacy_orders": pharmacy
        })
    
    return {
        "period_days": days,
        "daily_stats": daily_stats[::-1]  # Chronological order
    }


# ============ Appointments Management ============

@router.get("/appointments")
async def get_all_appointments(date: str = None, status: str = None, admin = Depends(verify_admin)):
    """Get all appointments with optional filters"""
    query = {}
    if date:
        query["date"] = date
    if status:
        query["status"] = status
    
    appointments = await db.appointments.find(query, {"_id": 0}).sort("date", -1).to_list(500)
    return {"appointments": appointments}


@router.post("/appointments/cancel")
async def cancel_appointments_by_doctor(
    doctor: str, 
    date: str, 
    reason: str = "Doctor unavailable",
    admin = Depends(verify_admin)
):
    """Cancel all appointments for a doctor on a specific date (for doctor leave)"""
    appointments = await db.appointments.find({
        "doctor": doctor,
        "date": date,
        "status": {"$in": ["pending", "Booked"]}
    }).to_list(50)
    
    cancelled_count = 0
    for appt in appointments:
        await db.appointments.update_one(
            {"id": appt["id"]},
            {"$set": {
                "status": "Cancelled",
                "cancellation_reason": reason,
                "cancelled_at": datetime.now(timezone.utc).isoformat(),
                "cancelled_by": "admin"
            }}
        )
        cancelled_count += 1
        
        # Notify patient
        if send_sms_notification and appt.get("patient_phone"):
            try:
                msg = f"Dear {appt.get('patient_name', 'Patient')}, your appointment with {doctor} on {date} at {appt.get('time')} has been cancelled. Reason: {reason}. Please reschedule. - Nevika Cura"
                await send_sms_notification(appt["patient_phone"], msg)
            except Exception as e:
                logger.error(f"Failed to notify patient about cancellation: {e}")
    
    return {"message": f"Cancelled {cancelled_count} appointments", "cancelled_count": cancelled_count}


@router.delete("/appointments/{appointment_id}")
async def delete_appointment(appointment_id: str, admin = Depends(verify_admin)):
    """Delete a specific appointment"""
    result = await db.appointments.delete_one({"id": appointment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"message": "Appointment deleted"}


@router.post("/appointments/{appointment_id}/send-reminder")
async def send_appointment_reminder(appointment_id: str, admin = Depends(verify_admin)):
    """Manually send reminder for an appointment"""
    appointment = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    if send_sms_notification and appointment.get("patient_phone"):
        try:
            msg = f"Reminder: You have an appointment with {appointment.get('doctor')} on {appointment.get('date')} at {appointment.get('time')} at {appointment.get('clinic')}. - Nevika Cura"
            await send_sms_notification(appointment["patient_phone"], msg)
            return {"message": "Reminder sent successfully"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to send reminder: {str(e)}")
    
    return {"message": "No phone number available for reminder"}


# ============ Orders Management ============

@router.get("/orders/recent")
async def get_recent_orders(limit: int = 20, admin = Depends(verify_admin)):
    """Get recent orders across all departments"""
    pharmacy_orders = await db.pharmacy_orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    diagnostic_orders = await db.diagnostic_orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    
    return {
        "pharmacy_orders": pharmacy_orders,
        "diagnostic_orders": diagnostic_orders
    }


@router.get("/pharmacy/orders")
async def get_pharmacy_orders(status: str = None, admin = Depends(verify_admin)):
    """Get all pharmacy orders"""
    query = {}
    if status:
        query["status"] = status
    
    orders = await db.pharmacy_orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"orders": orders}


@router.put("/pharmacy/orders/{order_id}/status")
async def update_pharmacy_order_status(
    order_id: str, 
    status: str, 
    admin = Depends(verify_admin)
):
    """Update pharmacy order status"""
    valid_statuses = ["Pending", "Confirmed", "Processing", "Ready for Pickup", "Out for Delivery", "Delivered", "Cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await db.pharmacy_orders.update_one(
        {"id": order_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": f"Order status updated to {status}"}


@router.get("/diagnostic/orders")
async def get_diagnostic_orders(status: str = None, admin = Depends(verify_admin)):
    """Get all diagnostic orders"""
    query = {}
    if status:
        query["status"] = status
    
    orders = await db.diagnostic_orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"orders": orders}


@router.put("/diagnostic/orders/{order_id}/status")
async def update_diagnostic_order_status(
    order_id: str, 
    status: str, 
    admin = Depends(verify_admin)
):
    """Update diagnostic order status"""
    valid_statuses = ["Pending", "Confirmed", "Sample Collected", "Processing", "Report Ready", "Completed", "Cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await db.diagnostic_orders.update_one(
        {"id": order_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": f"Order status updated to {status}"}


# ============ Doctors ============

@router.get("/doctors")
async def get_doctors(admin = Depends(verify_admin)):
    """Get list of doctors"""
    doctors = await db.staff.find({"role": "doctor"}, {"_id": 0}).to_list(50)
    return {"doctors": doctors}


# ============ Cleanup Operations ============

@router.delete("/cleanup/appointments/date/{date}")
async def cleanup_appointments_by_date(date: str, admin = Depends(verify_admin)):
    """Delete all appointments for a specific date"""
    result = await db.appointments.delete_many({"date": date})
    return {"message": f"Deleted {result.deleted_count} appointments for {date}"}


@router.delete("/cleanup/appointments/completed")
async def cleanup_completed_appointments(admin = Depends(verify_admin)):
    """Delete all completed appointments older than 30 days"""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    result = await db.appointments.delete_many({
        "status": "Completed",
        "date": {"$lt": cutoff}
    })
    return {"message": f"Deleted {result.deleted_count} old completed appointments"}


@router.delete("/cleanup/pharmacy/completed")
async def cleanup_completed_pharmacy(admin = Depends(verify_admin)):
    """Delete all delivered pharmacy orders older than 30 days"""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    result = await db.pharmacy_orders.delete_many({
        "status": "Delivered",
        "created_at": {"$lt": cutoff}
    })
    return {"message": f"Deleted {result.deleted_count} old pharmacy orders"}


@router.delete("/cleanup/diagnostic/completed")
async def cleanup_completed_diagnostic(admin = Depends(verify_admin)):
    """Delete all completed diagnostic orders older than 30 days"""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    result = await db.diagnostic_orders.delete_many({
        "status": "Completed",
        "created_at": {"$lt": cutoff}
    })
    return {"message": f"Deleted {result.deleted_count} old diagnostic orders"}


@router.delete("/cleanup/all")
async def cleanup_all_old_data(admin = Depends(verify_admin)):
    """Run all cleanup operations"""
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    cutoff_iso = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    
    appt_result = await db.appointments.delete_many({
        "status": "Completed",
        "date": {"$lt": cutoff_date}
    })
    
    pharmacy_result = await db.pharmacy_orders.delete_many({
        "status": "Delivered",
        "created_at": {"$lt": cutoff_iso}
    })
    
    diagnostic_result = await db.diagnostic_orders.delete_many({
        "status": "Completed",
        "created_at": {"$lt": cutoff_iso}
    })
    
    return {
        "deleted_appointments": appt_result.deleted_count,
        "deleted_pharmacy_orders": pharmacy_result.deleted_count,
        "deleted_diagnostic_orders": diagnostic_result.deleted_count
    }


@router.get("/cleanup/stats")
async def get_cleanup_stats(admin = Depends(verify_admin)):
    """Get statistics for data that can be cleaned up"""
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    cutoff_iso = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    
    return {
        "old_completed_appointments": await db.appointments.count_documents({
            "status": "Completed",
            "date": {"$lt": cutoff_date}
        }),
        "old_delivered_pharmacy": await db.pharmacy_orders.count_documents({
            "status": "Delivered",
            "created_at": {"$lt": cutoff_iso}
        }),
        "old_completed_diagnostic": await db.diagnostic_orders.count_documents({
            "status": "Completed",
            "created_at": {"$lt": cutoff_iso}
        })
    }


# ============ Push Notifications ============

@router.post("/push/broadcast")
async def broadcast_notification(notif: BroadcastNotification, admin = Depends(verify_admin)):
    """Broadcast push notification to all subscribers"""
    subscribers = await db.push_subscriptions.find({}, {"_id": 0, "subscription": 1}).to_list(1000)
    
    # Note: Actual push notification sending would be implemented here
    # For now, just log and return count
    logger.info(f"Broadcasting notification to {len(subscribers)} subscribers: {notif.title}")
    
    return {"message": f"Notification queued for {len(subscribers)} subscribers"}


@router.get("/push/subscribers")
async def get_push_subscribers(admin = Depends(verify_admin)):
    """Get list of push notification subscribers"""
    subscribers = await db.push_subscriptions.find({}, {"_id": 0}).to_list(500)
    return {"subscribers": subscribers, "count": len(subscribers)}


# ============ Loyalty Points ============

@router.post("/loyalty-points/subtract")
async def subtract_loyalty_points(data: LoyaltyPointsSubtract, admin = Depends(verify_admin)):
    """Subtract loyalty points from a user (for redemption)"""
    user = await db.users.find_one({"phone": data.phone})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_points = user.get("loyalty_points", 0)
    if current_points < data.points:
        raise HTTPException(status_code=400, detail=f"Insufficient points. User has {current_points} points")
    
    new_balance = current_points - data.points
    await db.users.update_one(
        {"phone": data.phone},
        {"$set": {"loyalty_points": new_balance}}
    )
    
    # Log the transaction
    import uuid
    transaction = {
        "id": str(uuid.uuid4()),
        "user_phone": data.phone,
        "type": "subtract",
        "points": data.points,
        "reason": data.reason,
        "balance_after": new_balance,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": "admin"
    }
    await db.loyalty_transactions.insert_one(transaction)
    
    return {"message": f"Subtracted {data.points} points", "new_balance": new_balance}


@router.get("/loyalty-points/transactions")
async def get_loyalty_transactions(phone: str = None, limit: int = 100, admin = Depends(verify_admin)):
    """Get loyalty points transaction history"""
    query = {}
    if phone:
        query["user_phone"] = phone
    
    transactions = await db.loyalty_transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return {"transactions": transactions}


@router.get("/loyalty-points/summary")
async def get_loyalty_summary(admin = Depends(verify_admin)):
    """Get loyalty points summary"""
    total_points = 0
    users_with_points = 0
    
    async for user in db.users.find({"loyalty_points": {"$gt": 0}}, {"loyalty_points": 1}):
        total_points += user.get("loyalty_points", 0)
        users_with_points += 1
    
    return {
        "total_points_issued": total_points,
        "users_with_points": users_with_points,
        "average_points": round(total_points / users_with_points) if users_with_points > 0 else 0
    }


# ============ Diagnostic Tests Catalog ============

@router.get("/diagnostic-tests")
async def get_diagnostic_tests_catalog(admin = Depends(verify_admin)):
    """Get full diagnostic tests catalog"""
    tests = await db.diagnostic_tests.find({}, {"_id": 0}).to_list(500)
    return {"tests": tests}


@router.post("/diagnostic-tests/add")
async def add_diagnostic_test(
    category: str,
    subcategory: str,
    test_name: str,
    price: float,
    description: str = None,
    admin = Depends(verify_admin)
):
    """Add a new diagnostic test to catalog"""
    import uuid
    
    test = {
        "id": str(uuid.uuid4()),
        "category": category,
        "subcategory": subcategory,
        "name": test_name,
        "price": price,
        "description": description,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.diagnostic_tests.insert_one(test)
    test.pop("_id", None)
    
    return {"message": "Test added", "test": test}


@router.delete("/diagnostic-tests/{category}/{subcategory}/{test_name}")
async def delete_diagnostic_test(
    category: str, 
    subcategory: str, 
    test_name: str, 
    admin = Depends(verify_admin)
):
    """Delete a diagnostic test from catalog"""
    result = await db.diagnostic_tests.delete_one({
        "category": category,
        "subcategory": subcategory,
        "name": test_name
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Test not found")
    
    return {"message": "Test deleted"}


# ============ Pending WhatsApp Notifications ============

@router.get("/pending-whatsapp")
async def get_pending_whatsapp(admin = Depends(verify_admin)):
    """Get pending WhatsApp notifications"""
    pending = await db.pending_whatsapp.find({}, {"_id": 0}).to_list(100)
    return {"pending": pending}


# ============ Send Credentials Email ============

@router.post("/send-credentials-email")
async def send_credentials_email(admin = Depends(verify_admin)):
    """Send all staff credentials to admin email"""
    import asyncio
    import resend
    
    RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
    NOTIFICATION_EMAIL = os.environ.get('NOTIFICATION_EMAIL', 'nevikacura@gmail.com')
    SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'Nevika Cura <onboarding@resend.dev>')
    
    credentials_html = """
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Nevika Cura - Staff Credentials</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
            <h2 style="color: #0d9488; border-bottom: 2px solid #0d9488; padding-bottom: 10px;">Admin Access</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr style="background: #f1f5f9;"><td style="padding: 12px; border: 1px solid #e2e8f0;"><strong>Portal URL</strong></td><td style="padding: 12px; border: 1px solid #e2e8f0;">/admin</td></tr>
                <tr><td style="padding: 12px; border: 1px solid #e2e8f0;"><strong>Password</strong></td><td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;">nevikacura2026</td></tr>
            </table>
            <h2 style="color: #3b82f6; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">DiaGyn Doctors</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr style="background: #dbeafe;"><th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Doctor</th><th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Clinic</th><th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Username</th><th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Password</th></tr>
                <tr><td style="padding: 12px; border: 1px solid #e2e8f0;">Dr. Neha Patel</td><td style="padding: 12px; border: 1px solid #e2e8f0;">Pushpa Clinic</td><td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace;">doc_neha</td><td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;">Nevika@2026D</td></tr>
                <tr><td style="padding: 12px; border: 1px solid #e2e8f0;">Dr. Vikas Jha</td><td style="padding: 12px; border: 1px solid #e2e8f0;">Amnion Clinic</td><td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace;">doc_vikas</td><td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;">Nevika@2026D</td></tr>
            </table>
            <h2 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 10px;">Clinic Staff</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr style="background: #d1fae5;"><th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Staff</th><th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Clinic</th><th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Username</th><th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Password</th></tr>
                <tr><td style="padding: 12px; border: 1px solid #e2e8f0;">Reception Staff</td><td style="padding: 12px; border: 1px solid #e2e8f0;">Pushpa Clinic</td><td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace;">staff_pushpa</td><td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;">Nevika@2026C</td></tr>
                <tr><td style="padding: 12px; border: 1px solid #e2e8f0;">Reception Staff</td><td style="padding: 12px; border: 1px solid #e2e8f0;">Amnion Clinic</td><td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace;">staff_amnion</td><td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;">Nevika@2026C</td></tr>
            </table>
            <h2 style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 10px;">Orange Pharmacy Staff</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr style="background: #ffedd5;"><th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Staff</th><th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Username</th><th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Password</th></tr>
                <tr><td style="padding: 12px; border: 1px solid #e2e8f0;">Pharmacy Team</td><td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace;">staff_pharmacy</td><td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;">Nevika@2026P</td></tr>
            </table>
            <h2 style="color: #8b5cf6; border-bottom: 2px solid #8b5cf6; padding-bottom: 10px;">Proton Diagnostics Staff</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr style="background: #ede9fe;"><th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Staff</th><th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Username</th><th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Password</th></tr>
                <tr><td style="padding: 12px; border: 1px solid #e2e8f0;">Lab Team</td><td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace;">staff_proton</td><td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;">Nevika@2026L</td></tr>
            </table>
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                <h3 style="color: #166534; margin-top: 0;">Staff Portal Access</h3>
                <p style="margin-bottom: 0;"><strong>URL:</strong> <code>/staff</code></p>
                <p style="margin-bottom: 0; color: #166534;">All staff members remain logged in until they manually logout (30-day session).</p>
            </div>
            <p style="color: #64748b; font-size: 12px; margin-top: 30px; text-align: center;">
                This email was sent from Nevika Cura Healthcare System.<br>
                Generated on: """ + datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC') + """
            </p>
        </div>
    </div>
    """
    
    try:
        if RESEND_API_KEY:
            resend.api_key = RESEND_API_KEY
            params = {
                "from": SENDER_EMAIL,
                "to": [NOTIFICATION_EMAIL],
                "subject": "Nevika Cura - All Staff Login Credentials",
                "html": credentials_html
            }
            email_result = await asyncio.to_thread(resend.Emails.send, params)
            logger.info(f"Credentials email sent: {email_result.get('id')}")
            return {"success": True, "message": f"Credentials sent to {NOTIFICATION_EMAIL}", "email_id": email_result.get('id')}
        else:
            return {"success": False, "message": "Email not configured"}
    except Exception as e:
        logger.error(f"Failed to send credentials email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


@router.delete("/pending-whatsapp/{notification_id}")
async def delete_pending_whatsapp(notification_id: str, admin = Depends(verify_admin)):
    """Mark WhatsApp notification as processed"""
    result = await db.pending_whatsapp.delete_one({"id": notification_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification removed"}
