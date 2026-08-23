"""
Order/Payment Failure Alert System
Sends WhatsApp notification to admin (9833188288) when any order creation or payment fails.
"""
import logging
import os
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

ADMIN_ALERT_PHONE = "919833188288"
IST_OFFSET = timedelta(hours=5, minutes=30)


async def send_failure_alert(
    failure_type: str,
    details: dict,
    db=None,
):
    """Send failure alert to admin via WhatsApp."""
    try:
        from services.msg91_whatsapp import send_whatsapp_notification
    except ImportError:
        logger.warning("[ALERT] msg91_whatsapp not available")
        return

    now = (datetime.now(timezone.utc) + IST_OFFSET).strftime("%d %b %Y %I:%M %p")
    
    patient_name = details.get("patient_name", "Unknown")
    patient_phone = details.get("patient_phone", "N/A")
    error_msg = details.get("error", "Unknown error")
    order_type = details.get("order_type", failure_type)
    amount = details.get("amount", "N/A")
    order_id = details.get("order_id", "N/A")

    message = (
        f"ALERT: {failure_type.upper()} FAILED\n"
        f"Time: {now}\n"
        f"Type: {order_type}\n"
        f"Patient: {patient_name}\n"
        f"Phone: {patient_phone}\n"
        f"Amount: {amount}\n"
        f"Order ID: {order_id}\n"
        f"Error: {error_msg[:200]}"
    )

    try:
        await send_whatsapp_notification(ADMIN_ALERT_PHONE, message)
        logger.info(f"[ALERT] Failure alert sent for {failure_type}: {patient_name}")
    except Exception as e:
        logger.error(f"[ALERT] Could not send failure alert: {e}")

    # Also log to DB for tracking
    if db:
        try:
            await db.failure_alerts.insert_one({
                "type": failure_type,
                "details": {k: str(v) for k, v in details.items()},
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "alert_sent": True,
            })
        except Exception:
            pass
