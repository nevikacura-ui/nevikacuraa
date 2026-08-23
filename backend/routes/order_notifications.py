"""
Real-time Order Status Notifications
Triggers in-app and push notifications when order status changes
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")
db = None

def init_db(database):
    global db
    db = database

# Status change messages for patients
STATUS_MESSAGES = {
    "pharmacy_order": {
        "confirmed": {"title": "Order Confirmed", "body": "Your pharmacy order has been confirmed and is being prepared."},
        "packed": {"title": "Order Packed", "body": "Your medicines are packed and ready for dispatch."},
        "shipped": {"title": "Order Shipped", "body": "Your pharmacy order is on its way!"},
        "out_for_delivery": {"title": "Out for Delivery", "body": "Your medicines are out for delivery. They'll reach you shortly!"},
        "delivered": {"title": "Order Delivered", "body": "Your pharmacy order has been delivered. Stay healthy!"},
    },
    "lab_order": {
        "confirmed": {"title": "Booking Confirmed", "body": "Your lab test booking has been confirmed."},
        "sample_collected": {"title": "Sample Collected", "body": "Your sample has been collected and sent to the lab."},
        "in_progress": {"title": "Tests in Progress", "body": "Your lab tests are being processed."},
        "report_ready": {"title": "Report Ready", "body": "Your lab test report is ready! View it now."},
        "delivered": {"title": "Report Delivered", "body": "Your lab report has been delivered."},
    },
    "appointment": {
        "Confirmed": {"title": "Appointment Confirmed", "body": "Your appointment has been confirmed by the doctor."},
        "Checked In": {"title": "Checked In", "body": "You've been checked in. The doctor will see you soon."},
        "In Progress": {"title": "Consultation Started", "body": "Your consultation with the doctor has started."},
        "Completed": {"title": "Consultation Complete", "body": "Your consultation is complete. Take care!"},
        "Cancelled": {"title": "Appointment Cancelled", "body": "Your appointment has been cancelled."},
    },
}


class StatusUpdateRequest(BaseModel):
    order_type: str  # pharmacy_order, lab_order, appointment
    order_id: str
    new_status: str
    phone: str
    extra_message: Optional[str] = None


@router.post("/order-status-notify")
async def notify_status_change(req: StatusUpdateRequest):
    """Store a status notification for the patient and return notification data"""
    msgs = STATUS_MESSAGES.get(req.order_type, {}).get(req.new_status, {})
    title = msgs.get("title", f"Status Update: {req.new_status}")
    body = req.extra_message or msgs.get("body", f"Your {req.order_type.replace('_', ' ')} status changed to {req.new_status}")

    notification = {
        "phone": req.phone[-10:],
        "order_type": req.order_type,
        "order_id": req.order_id,
        "status": req.new_status,
        "title": title,
        "body": body,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.order_notifications.insert_one(notification)
    notification.pop("_id", None)

    return {"success": True, "notification": notification}


@router.get("/order-notifications/{phone}")
async def get_order_notifications(phone: str, unread_only: bool = False, limit: int = 20):
    """Get recent order status notifications for a patient"""
    clean = phone[-10:]
    query = {"phone": clean}
    if unread_only:
        query["read"] = False
    notifications = await db.order_notifications.find(
        query, {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    return {"notifications": notifications, "unread_count": sum(1 for n in notifications if not n.get("read"))}


@router.post("/order-notifications/{phone}/mark-read")
async def mark_notifications_read(phone: str):
    """Mark all order notifications as read"""
    clean = phone[-10:]
    await db.order_notifications.update_many(
        {"phone": clean, "read": False},
        {"$set": {"read": True}}
    )
    return {"success": True}
