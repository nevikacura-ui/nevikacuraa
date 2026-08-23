"""
Real-time Order Status Notifications
Triggers in-app + WhatsApp notifications when order status changes.
WhatsApp is sent for key statuses (confirmed, shipped, delivered, report_ready).
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")
db = None
_send_whatsapp = None

def init_db(database):
    global db
    db = database

def set_whatsapp_func(func):
    global _send_whatsapp
    _send_whatsapp = func

# Status change messages for patients
STATUS_MESSAGES = {
    "pharmacy_order": {
        "confirmed": {"title": "Order Confirmed", "body": "Your pharmacy order has been confirmed and is being prepared.", "wa": True},
        "packed": {"title": "Order Packed", "body": "Your medicines are packed and ready for dispatch.", "wa": False},
        "shipped": {"title": "Order Shipped", "body": "Your pharmacy order is on its way!", "wa": True},
        "out_for_delivery": {"title": "Out for Delivery", "body": "Your medicines are out for delivery. They'll reach you shortly!", "wa": True},
        "delivered": {"title": "Order Delivered", "body": "Your pharmacy order has been delivered. Stay healthy!", "wa": True},
    },
    "lab_order": {
        "confirmed": {"title": "Booking Confirmed", "body": "Your lab test booking has been confirmed.", "wa": True},
        "sample_collected": {"title": "Sample Collected", "body": "Your sample has been collected and sent to the lab.", "wa": True},
        "in_progress": {"title": "Tests in Progress", "body": "Your lab tests are being processed.", "wa": False},
        "report_ready": {"title": "Report Ready", "body": "Your lab test report is ready! View it now.", "wa": True},
        "delivered": {"title": "Report Delivered", "body": "Your lab report has been delivered.", "wa": False},
    },
    "appointment": {
        "Confirmed": {"title": "Appointment Confirmed", "body": "Your appointment has been confirmed by the doctor.", "wa": True},
        "Checked In": {"title": "Checked In", "body": "You've been checked in. The doctor will see you soon.", "wa": False},
        "In Progress": {"title": "Consultation Started", "body": "Your consultation with the doctor has started.", "wa": False},
        "Completed": {"title": "Consultation Complete", "body": "Your consultation is complete. Take care!", "wa": False},
        "Cancelled": {"title": "Appointment Cancelled", "body": "Your appointment has been cancelled.", "wa": True},
    },
}


class StatusUpdateRequest(BaseModel):
    order_type: str  # pharmacy_order, lab_order, appointment
    order_id: str
    new_status: str
    phone: str
    patient_name: Optional[str] = "Customer"
    items_summary: Optional[str] = None
    total_amount: Optional[str] = None
    extra_message: Optional[str] = None


async def _send_whatsapp_notification(phone: str, patient_name: str, order_type: str, order_id: str, status: str, body: str, items_summary: str = None, total: str = None):
    """Send WhatsApp notification for key order status changes."""
    if _send_whatsapp is None:
        logger.warning("WhatsApp function not configured for order notifications")
        return

    try:
        # Build a summary message
        msg_parts = [f"Hi {patient_name}!", body]
        if items_summary:
            msg_parts.append(f"Items: {items_summary}")
        if total:
            msg_parts.append(f"Total: {total}")
        msg_parts.append(f"ID: {order_id}")
        msg_parts.append("Track at nevikacura.com")

        # Use the generic WhatsApp send function
        from services.msg91_whatsapp import send_msg91_whatsapp, TEMPLATES
        template = None
        variables = []

        if order_type == "pharmacy_order" and status == "confirmed":
            template = TEMPLATES.get("orange_pharmacy_confirm")
            variables = [patient_name, order_id, items_summary or "Your medicines", "Delivery in 30-60 mins"]
        elif order_type == "pharmacy_order" and status in ("shipped", "out_for_delivery"):
            template = TEMPLATES.get("orange_order_shipped")
            variables = [patient_name, order_id, "Your order is on its way!", "Track at nevikacura.com"]
        elif order_type == "pharmacy_order" and status == "delivered":
            template = TEMPLATES.get("orange_order_delivered")
            now_str = datetime.now(timezone.utc).strftime("%d %b %Y, %I:%M %p")
            variables = [patient_name, order_id, now_str, "nevikacura.com/my-orders"]
        elif order_type == "lab_order" and status == "confirmed":
            template = TEMPLATES.get("proton_lab_confirm") or TEMPLATES.get("lab_booking_confirm")
            variables = [patient_name, order_id, items_summary or "Lab tests booked", "nevikacura.com/my-orders"]
        elif order_type == "lab_order" and status == "report_ready":
            template = TEMPLATES.get("lab_report_ready")
            variables = [patient_name, order_id, "Your report is ready", "nevikacura.com/my-orders"]

        if template and variables:
            result = await send_msg91_whatsapp(
                recipient_phone=phone,
                template_name=template,
                variables=variables,
                db=db,
                reference_id=order_id,
                message_type=f"{order_type}_{status}",
            )
            logger.info(f"WhatsApp sent for {order_type} {order_id} → {status}: {result.get('success', False)}")
        else:
            logger.info(f"No WhatsApp template for {order_type}/{status}, skipping")

    except Exception as e:
        logger.error(f"WhatsApp notification failed for {order_id}: {e}")


@router.post("/order-status-notify")
async def notify_status_change(req: StatusUpdateRequest):
    """Store notification + send WhatsApp for key statuses."""
    msgs = STATUS_MESSAGES.get(req.order_type, {}).get(req.new_status, {})
    title = msgs.get("title", f"Status Update: {req.new_status}")
    body = req.extra_message or msgs.get("body", f"Your {req.order_type.replace('_', ' ')} status changed to {req.new_status}")
    should_wa = msgs.get("wa", False)

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
    if db is not None:
        await db.order_notifications.insert_one(notification)
    notification.pop("_id", None)

    # Send WhatsApp for important statuses
    if should_wa:
        await _send_whatsapp_notification(
            phone=req.phone,
            patient_name=req.patient_name or "Customer",
            order_type=req.order_type,
            order_id=req.order_id,
            status=req.new_status,
            body=body,
            items_summary=req.items_summary,
            total=req.total_amount,
        )

    return {"success": True, "notification": notification, "whatsapp_sent": should_wa}


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
