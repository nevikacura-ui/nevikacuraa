"""
Firebase Cloud Messaging (FCM) Push Notifications
"""

import firebase_admin
from firebase_admin import credentials, messaging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import logging
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/fcm", tags=["Push Notifications"])

db = None

def set_db(database):
    global db
    db = database

# Initialize Firebase Admin
def init_firebase():
    if not firebase_admin._apps:
        cred_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "firebase-admin.json")
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialized")

try:
    init_firebase()
except Exception as e:
    logger.warning(f"Firebase init failed: {e}")


class TokenRegister(BaseModel):
    token: str
    user_email: Optional[str] = None
    device_info: Optional[str] = None


class PushNotification(BaseModel):
    title: str
    body: str
    target_email: Optional[str] = None
    target_token: Optional[str] = None
    data: Optional[dict] = None
    topic: Optional[str] = None


@router.post("/register-token")
async def register_fcm_token(req: TokenRegister):
    """Register a device FCM token for push notifications"""
    await db.fcm_tokens.update_one(
        {"token": req.token},
        {"$set": {
            "token": req.token,
            "user_email": req.user_email,
            "device_info": req.device_info,
            "active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    # Subscribe to general topic
    try:
        messaging.subscribe_to_topic([req.token], "all_users")
    except Exception as e:
        logger.warning(f"Topic subscribe failed: {e}")

    return {"success": True, "message": "Token registered"}


@router.post("/send")
async def send_push_notification(req: PushNotification):
    """Send push notification to a specific user or topic"""
    tokens = []

    if req.target_token:
        tokens = [req.target_token]
    elif req.target_email:
        cursor = db.fcm_tokens.find(
            {"user_email": req.target_email, "active": True},
            {"_id": 0, "token": 1},
        )
        tokens = [doc["token"] async for doc in cursor]

    data_payload = req.data or {}
    data_payload["timestamp"] = datetime.now(timezone.utc).isoformat()

    notification = messaging.Notification(
        title=req.title,
        body=req.body,
    )
    webpush = messaging.WebpushConfig(
        notification=messaging.WebpushNotification(
            title=req.title,
            body=req.body,
            icon="/logo192.png",
            badge="/logo192.png",
        ),
    )

    sent = 0
    failed = 0

    if req.topic:
        try:
            msg = messaging.Message(
                notification=notification,
                webpush=webpush,
                data={k: str(v) for k, v in data_payload.items()},
                topic=req.topic,
            )
            messaging.send(msg)
            sent = 1
        except Exception as e:
            logger.error(f"Topic send failed: {e}")
            failed = 1
    elif tokens:
        for token in tokens:
            try:
                msg = messaging.Message(
                    notification=notification,
                    webpush=webpush,
                    data={k: str(v) for k, v in data_payload.items()},
                    token=token,
                )
                messaging.send(msg)
                sent += 1
            except messaging.UnregisteredError:
                await db.fcm_tokens.update_one({"token": token}, {"$set": {"active": False}})
                failed += 1
            except Exception as e:
                logger.error(f"Send to token failed: {e}")
                failed += 1
    else:
        raise HTTPException(status_code=400, detail="No target specified (token, email, or topic)")

    # Log notification
    await db.push_notifications_log.insert_one({
        "title": req.title,
        "body": req.body,
        "target_email": req.target_email,
        "topic": req.topic,
        "tokens_count": len(tokens),
        "sent": sent,
        "failed": failed,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"success": True, "sent": sent, "failed": failed}


@router.post("/send-to-all")
async def send_to_all_users(req: PushNotification):
    """Send push notification to all registered users via topic"""
    req.topic = "all_users"
    return await send_push_notification(req)


@router.delete("/unregister/{token}")
async def unregister_token(token: str):
    """Unregister a device token"""
    await db.fcm_tokens.update_one({"token": token}, {"$set": {"active": False}})
    try:
        messaging.unsubscribe_from_topic([token], "all_users")
    except:
        pass
    return {"success": True}


@router.get("/status")
async def push_notification_status():
    """Verify push notification system status"""
    firebase_ok = len(firebase_admin._apps) > 0
    
    active_tokens = 0
    total_tokens = 0
    recent_logs = []
    
    if db is not None:
        active_tokens = await db.fcm_tokens.count_documents({"active": True})
        total_tokens = await db.fcm_tokens.count_documents({})
        logs = await db.push_notifications_log.find(
            {}, {"_id": 0}
        ).sort("created_at", -1).limit(5).to_list(5)
        recent_logs = logs
    
    return {
        "firebase_initialized": firebase_ok,
        "active_tokens": active_tokens,
        "total_tokens": total_tokens,
        "recent_notifications": recent_logs,
        "status": "operational" if firebase_ok else "firebase_not_initialized"
    }


@router.post("/test-send")
async def test_send_notification():
    """Send a test notification to verify the system works end-to-end"""
    # Send to the all_users topic
    try:
        notification = messaging.Notification(
            title="Nevika Cura - System Test",
            body="Push notification system is working correctly!",
        )
        webpush = messaging.WebpushConfig(
            notification=messaging.WebpushNotification(
                title="Nevika Cura - System Test",
                body="Push notification system is working correctly!",
                icon="/logo192.png",
            ),
        )
        msg = messaging.Message(
            notification=notification,
            webpush=webpush,
            data={"type": "test", "timestamp": datetime.now(timezone.utc).isoformat()},
            topic="all_users",
        )
        result = messaging.send(msg)
        
        # Log the test
        if db is not None:
            await db.push_notifications_log.insert_one({
                "title": "System Test",
                "body": "Push notification system test",
                "topic": "all_users",
                "type": "test",
                "fcm_response": str(result),
                "sent": 1,
                "failed": 0,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        
        return {
            "success": True,
            "message": "Test notification sent successfully to FCM",
            "fcm_response": str(result),
            "instructions": [
                "1. Open the app on your device/browser",
                "2. Allow notification permissions when prompted",
                "3. The notification should appear as an OS-level notification",
                "4. If using a browser, ensure the tab is not actively focused for the notification to appear",
                "5. On Android, check your notification shade",
                "6. On iOS, notifications appear as banners"
            ]
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "troubleshooting": [
                "Ensure Firebase Admin SDK is properly configured",
                "Check firebase-admin.json credentials file",
                "Verify the device has registered an FCM token",
            ]
        }
