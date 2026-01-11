"""
Nevika Cura - Push Notification Service
Web Push notifications using pywebpush
"""

import os
import json
import logging
from pywebpush import webpush, WebPushException

logger = logging.getLogger(__name__)

# VAPID Configuration
VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_CLAIMS_EMAIL = os.environ.get("VAPID_CLAIMS_EMAIL", "nevikacura@gmail.com")

# Database reference (set during init)
db = None

def set_db(database):
    """Set database reference"""
    global db
    db = database

async def send_push_notification(
    user_id: str = None,
    title: str = "Nevika Cura",
    body: str = "You have a new notification",
    url: str = "/",
    tag: str = None,
    broadcast: bool = False
):
    """
    Send push notification to user(s)
    
    Args:
        user_id: Specific user to notify (None for broadcast)
        title: Notification title
        body: Notification body text
        url: URL to open when clicked
        tag: Notification tag for grouping
        broadcast: If True, send to all subscriptions
    """
    if not VAPID_PUBLIC_KEY or not VAPID_PRIVATE_KEY:
        logger.warning("VAPID keys not configured, skipping push notification")
        return {"success": False, "error": "Push notifications not configured"}
    
    if db is None:
        logger.error("Database not initialized for push notifications")
        return {"success": False, "error": "Database not initialized"}
    
    try:
        # Build query
        if broadcast:
            query = {}
        elif user_id:
            query = {"user_id": user_id}
        else:
            query = {"user_id": {"$exists": False}}  # Anonymous subscriptions
        
        subscriptions = await db.push_subscriptions.find(query).to_list(1000)
        
        if not subscriptions:
            logger.info(f"No subscriptions found for query: {query}")
            return {"success": True, "sent": 0}
        
        payload = json.dumps({
            "title": title,
            "body": body,
            "url": url,
            "tag": tag or "nevika-notification",
            "icon": "/icons/icon-192x192.png",
            "badge": "/icons/icon-72x72.png"
        })
        
        sent_count = 0
        failed_count = 0
        
        for sub in subscriptions:
            try:
                subscription_info = {
                    "endpoint": sub.get("endpoint"),
                    "keys": {
                        "p256dh": sub.get("keys", {}).get("p256dh"),
                        "auth": sub.get("keys", {}).get("auth")
                    }
                }
                
                webpush(
                    subscription_info=subscription_info,
                    data=payload,
                    vapid_private_key=VAPID_PRIVATE_KEY,
                    vapid_claims={"sub": f"mailto:{VAPID_CLAIMS_EMAIL}"}
                )
                sent_count += 1
                
            except WebPushException as e:
                logger.warning(f"Push failed for subscription: {e}")
                failed_count += 1
                
                # Remove invalid subscriptions
                if e.response and e.response.status_code in [404, 410]:
                    await db.push_subscriptions.delete_one({"endpoint": sub.get("endpoint")})
                    logger.info(f"Removed invalid subscription: {sub.get('endpoint')[:50]}...")
        
        logger.info(f"Push notifications sent: {sent_count} success, {failed_count} failed")
        return {"success": True, "sent": sent_count, "failed": failed_count}
    
    except Exception as e:
        logger.error(f"Push notification error: {str(e)}")
        return {"success": False, "error": str(e)}

async def subscribe_push(user_id: str, subscription_data: dict) -> dict:
    """Subscribe user to push notifications"""
    if db is None:
        return {"success": False, "error": "Database not initialized"}
    
    try:
        endpoint = subscription_data.get("endpoint")
        
        # Update or insert subscription
        await db.push_subscriptions.update_one(
            {"endpoint": endpoint},
            {"$set": {
                "user_id": user_id,
                "endpoint": endpoint,
                "keys": subscription_data.get("keys", {}),
                "updated_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()
            }},
            upsert=True
        )
        
        logger.info(f"Push subscription saved for user {user_id}")
        return {"success": True}
    
    except Exception as e:
        logger.error(f"Failed to save push subscription: {str(e)}")
        return {"success": False, "error": str(e)}

async def unsubscribe_push(endpoint: str) -> dict:
    """Unsubscribe from push notifications"""
    if db is None:
        return {"success": False, "error": "Database not initialized"}
    
    try:
        result = await db.push_subscriptions.delete_one({"endpoint": endpoint})
        logger.info(f"Push subscription removed: {endpoint[:50]}...")
        return {"success": True, "deleted": result.deleted_count}
    
    except Exception as e:
        logger.error(f"Failed to remove push subscription: {str(e)}")
        return {"success": False, "error": str(e)}
