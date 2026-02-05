"""
Nevika Cura - Super Admin Routes
Unified dashboard, staff activity logs, and admin management
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import jwt
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/super-admin", tags=["Super Admin"])

# Database and config - injected from server.py
db = None
JWT_SECRET = None
JWT_ALGORITHM = "HS256"

def set_db(database):
    global db
    db = database

def set_jwt_config(secret, algorithm):
    global JWT_SECRET, JWT_ALGORITHM
    JWT_SECRET = secret
    JWT_ALGORITHM = algorithm


# ============ Auth ============

async def verify_super_admin(authorization: str = Header(None)):
    """Verify super admin token"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Authentication required")
    
    token = authorization.replace('Bearer ', '')
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("role") not in ["super_admin", "admin"]:
            raise HTTPException(status_code=403, detail="Super admin access required")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============ Dashboard Stats ============

@router.get("/dashboard")
async def get_unified_dashboard(admin=Depends(verify_super_admin)):
    """Get unified dashboard stats for all portals"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # DiaGyn Stats
    diagyn_stats = {
        "today_appointments": await db.appointments.count_documents({"date": today}),
        "pending": await db.appointments.count_documents({"date": today, "status": "waiting"}),
        "completed": await db.appointments.count_documents({"date": today, "status": "done"}),
        "total_patients": await db.patients.count_documents({})
    }
    
    # Mango Labs Stats
    mango_stats = {
        "today_bookings": await db.lab_bookings.count_documents({"booking_date": today}),
        "pending_collection": await db.lab_bookings.count_documents({"status": "booked"}),
        "in_process": await db.lab_bookings.count_documents({"status": "in_process"}),
        "reports_ready": await db.lab_bookings.count_documents({"status": "report_generated"})
    }
    
    # Orange Pharmacy Stats
    pharmacy_stats = {
        "today_orders": await db.pharmacy_orders.count_documents({"order_date": {"$regex": f"^{today}"}}),
        "pending": await db.pharmacy_orders.count_documents({"status": {"$in": ["booked", "packing"]}}),
        "out_for_delivery": await db.pharmacy_orders.count_documents({"status": "out_for_delivery"}),
        "completed": await db.pharmacy_orders.count_documents({"status": "completed"})
    }
    
    # Revenue (approximate from today)
    diagyn_revenue = 0
    async for apt in db.appointments.find({"date": today, "status": "done"}):
        diagyn_revenue += apt.get("consultation_fee", 0) + apt.get("scan_fee", 0)
    
    mango_revenue = 0
    async for booking in db.lab_bookings.find({"booking_date": today}):
        mango_revenue += booking.get("total_amount", 0)
    
    pharmacy_revenue = 0
    async for order in db.pharmacy_orders.find({"order_date": {"$regex": f"^{today}"}}):
        pharmacy_revenue += order.get("total_amount", 0)
    
    # Staff Activity Summary
    staff_logins_today = await db.staff_activity.count_documents({
        "action": "login",
        "timestamp": {"$regex": f"^{today}"}
    })
    
    return {
        "date": today,
        "diagyn": diagyn_stats,
        "mango_labs": mango_stats,
        "orange_pharmacy": pharmacy_stats,
        "revenue": {
            "diagyn": diagyn_revenue,
            "mango_labs": mango_revenue,
            "orange_pharmacy": pharmacy_revenue,
            "total": diagyn_revenue + mango_revenue + pharmacy_revenue
        },
        "staff_logins_today": staff_logins_today
    }


# ============ Staff Activity Log ============

@router.get("/activity-logs")
async def get_activity_logs(
    page: int = 1,
    limit: int = 50,
    staff_id: str = None,
    action_type: str = None,
    date_from: str = None,
    date_to: str = None,
    admin=Depends(verify_super_admin)
):
    """Get staff activity logs with filters"""
    query = {}
    
    if staff_id:
        query["staff_id"] = staff_id
    if action_type:
        query["action"] = action_type
    if date_from:
        query["timestamp"] = {"$gte": date_from}
    if date_to:
        if "timestamp" in query:
            query["timestamp"]["$lte"] = date_to + "T23:59:59"
        else:
            query["timestamp"] = {"$lte": date_to + "T23:59:59"}
    
    skip = (page - 1) * limit
    
    logs = await db.staff_activity.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.staff_activity.count_documents(query)
    
    return {
        "logs": logs,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }


@router.get("/staff-list")
async def get_all_staff(admin=Depends(verify_super_admin)):
    """Get list of all staff members"""
    staff_list = await db.staff.find({}, {"_id": 0, "password_hash": 0}).to_list(100)
    return {"staff": staff_list}


# ============ Activity Logging Helper ============

async def log_staff_activity(
    staff_id: str,
    staff_name: str,
    action: str,
    details: dict = None,
    portal: str = None
):
    """Log staff activity to database"""
    try:
        await db.staff_activity.insert_one({
            "staff_id": staff_id,
            "staff_name": staff_name,
            "action": action,
            "details": details or {},
            "portal": portal,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d")
        })
    except Exception as e:
        logger.error(f"Failed to log activity: {e}")
