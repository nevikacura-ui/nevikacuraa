"""
Notification System - In-app notifications for Nevika Cura
- CRUD for notifications
- Admin send custom notifications (Dr. Vikas)
- Auto-trigger helper for other routes
- Unread count endpoint for bell badge
"""

import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Notifications"])

db = None

def set_db(database):
    global db
    db = database


# ---- Pydantic Models ----

class AdminNotificationRequest(BaseModel):
    title: str
    message: str
    type: str = "promo"  # promo, announcement, reminder
    target: str = "all"  # all, patients, staff
    link: Optional[str] = None


# ---- Helper: create_notification (callable from other modules) ----

async def create_notification(
    user_id: str,
    title: str,
    message: str,
    notif_type: str = "info",
    link: Optional[str] = None,
    icon: Optional[str] = None,
):
    """Insert a notification into MongoDB. Call from any route."""
    if db is None:
        logger.warning("Notification DB not initialized")
        return None
    doc = {
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": notif_type,
        "link": link or "",
        "icon": icon or "",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.notifications.insert_one(doc)
    return str(result.inserted_id)


async def create_bulk_notification(
    title: str,
    message: str,
    notif_type: str = "promo",
    link: str = "",
    icon: str = "",
    target: str = "all",
):
    """Send notification to all users (or filtered by target)."""
    if db is None:
        return 0

    docs = []

    # Get patients from users collection
    if target in ("all", "patients"):
        users = await db.users.find({}, {"_id": 0, "email": 1, "phone": 1}).to_list(5000)
        for u in users:
            uid = u.get("phone") or u.get("email") or "unknown"
            docs.append({
                "user_id": uid,
                "title": title,
                "message": message,
                "type": notif_type,
                "link": link,
                "icon": icon,
                "read": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

    # Get staff from staff collection
    if target in ("all", "staff"):
        staff = await db.staff.find({"active": True}, {"_id": 0, "username": 1}).to_list(100)
        for s in staff:
            sid = s.get("username", "")
            if sid:
                docs.append({
                    "user_id": sid,
                    "title": title,
                    "message": message,
                    "type": notif_type,
                    "link": link,
                    "icon": icon,
                    "read": False,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                })

    if docs:
        await db.notifications.insert_many(docs)
    return len(docs)


# ---- Helper to resolve user identifier from token ----

async def _get_user_from_token(authorization: str):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.replace("Bearer ", "")
    import jwt
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        # For staff tokens, username is the primary identifier used in notifications
        # For patient tokens, sub/phone/email is used
        return payload.get("username") or payload.get("phone") or payload.get("sub") or payload.get("email")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


async def _get_role_from_token(authorization: str):
    """Get both user_id and role from JWT."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.replace("Bearer ", "")
    import jwt
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub") or payload.get("username") or payload.get("phone") or payload.get("email")
        role = payload.get("role", "")
        username = payload.get("username", "")
        return user_id, role, username
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---- API Endpoints ----

@router.get("/notifications")
async def get_notifications(
    limit: int = 50,
    authorization: str = Header(None),
):
    """Get notifications for the current user."""
    user_id = await _get_user_from_token(authorization)

    cursor = db.notifications.find(
        {"user_id": user_id},
        {"_id": 0, "user_id": 0}
    ).sort("created_at", -1).limit(limit)

    results = await cursor.to_list(limit)
    return {"notifications": results, "count": len(results)}


@router.get("/notifications/unread-count")
async def get_unread_count(authorization: str = Header(None)):
    """Get unread notification count for the bell badge."""
    user_id = await _get_user_from_token(authorization)
    count = await db.notifications.count_documents({"user_id": user_id, "read": False})
    return {"unread": count}


@router.get("/notifications/latest")
async def get_latest_unread(authorization: str = Header(None)):
    """Get the latest unread notification (for slide-down banner)."""
    user_id = await _get_user_from_token(authorization)

    # Find latest unread that hasn't been shown as banner yet
    doc = await db.notifications.find_one(
        {"user_id": user_id, "read": False},
        {"_id": 0, "user_id": 0},
        sort=[("created_at", -1)]
    )
    return {"notification": doc}


@router.post("/notifications/read-all")
async def mark_all_read(authorization: str = Header(None)):
    """Mark all notifications as read."""
    user_id = await _get_user_from_token(authorization)
    result = await db.notifications.update_many(
        {"user_id": user_id, "read": False},
        {"$set": {"read": True}}
    )
    return {"marked": result.modified_count}


@router.post("/notifications/mark-read")
async def mark_notification_read(
    created_at: str,
    authorization: str = Header(None),
):
    """Mark a specific notification as read by created_at timestamp."""
    user_id = await _get_user_from_token(authorization)
    result = await db.notifications.update_one(
        {"user_id": user_id, "created_at": created_at},
        {"$set": {"read": True}}
    )
    return {"success": result.modified_count > 0}


# ---- Admin endpoint for Dr. Vikas ----

@router.post("/notifications/admin/send")
async def admin_send_notification(
    req: AdminNotificationRequest,
    authorization: str = Header(None),
):
    """Admin/Doctor sends a custom notification to all users."""
    user_id, role, username = await _get_role_from_token(authorization)

    # Allow admin, doctor, or staff with admin role
    allowed = role in ("admin", "doctor", "diagyn_staff", "pharmacy_staff", "lab_staff")
    if not allowed:
        allowed = any(x in str(username).lower() for x in ("admin", "dr_"))
    if not allowed:
        raise HTTPException(status_code=403, detail="Only admins and doctors can send notifications")

    count = await create_bulk_notification(
        title=req.title,
        message=req.message,
        notif_type=req.type,
        link=req.link or "",
        target=req.target,
        icon="megaphone",
    )

    logger.info(f"Admin {user_id} sent notification to {count} users: {req.title}")
    return {"success": True, "sent_to": count, "title": req.title}


# ---- Notify staff about new appointments ----

async def notify_staff_appointment(appointment: dict):
    """Create in-app notification for staff when a new appointment is booked."""
    clinic = appointment.get("clinic", "diagyn")
    patient = appointment.get("patient_name", "A patient")
    doctor = appointment.get("doctor", "")
    date = appointment.get("date", "")
    time_slot = appointment.get("time", "")
    booking_id = appointment.get("booking_id", "")

    staff_roles = {
        "diagyn": "staff_diagyn",
        "mango": "staff_mango",
        "orange": "staff_orange",
    }
    target_role = staff_roles.get(clinic, "staff_diagyn")

    # Find all staff with this role
    staff_users = await db.users.find(
        {"role": target_role},
        {"_id": 0, "username": 1}
    ).to_list(50)

    for staff in staff_users:
        sid = staff.get("username", "")
        if sid:
            await create_notification(
                user_id=sid,
                title="New Appointment Booked",
                message=f"{patient} booked with {doctor} on {date} at {time_slot} (ID: {booking_id})",
                notif_type="appointment",
                link="/diagyn-staff",
                icon="calendar",
            )

    # Also notify admin
    await create_notification(
        user_id="admin",
        title="New Appointment",
        message=f"{patient} - {doctor} on {date} {time_slot}",
        notif_type="appointment",
        link="/admin",
        icon="calendar",
    )
