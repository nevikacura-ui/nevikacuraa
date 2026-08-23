"""
Push Notification Routes - Extracted from server.py
Includes: VAPID key, subscribe, unsubscribe, test push.
"""
import jwt
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from utils.auth_utils import JWT_SECRET, get_db

logger = logging.getLogger("server")
router = APIRouter(tags=["Push Notifications"])

_deps = {}

def set_deps(deps: dict):
    global _deps
    _deps = deps


class PushSubscriptionRequest(BaseModel):
    endpoint: str
    keys: dict
    portal_type: Optional[str] = None


@router.get("/push/vapid-public-key")
async def get_vapid_public_key():
    VAPID_PUBLIC_KEY = _deps.get("VAPID_PUBLIC_KEY")
    if not VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=503, detail="Push notifications not configured")
    return {"publicKey": VAPID_PUBLIC_KEY}


@router.post("/push/subscribe")
async def subscribe_push(subscription: PushSubscriptionRequest, authorization: str = Header(None)):
    db = get_db()
    user_id = None
    role = None
    clinic = None

    if authorization and authorization.startswith('Bearer '):
        try:
            token = authorization.split(' ')[1]
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user_id = payload.get("sub") or payload.get("user_id")
            role = payload.get("role")
            clinic = payload.get("clinic")
        except Exception:
            pass

    sub_doc = {
        "endpoint": subscription.endpoint,
        "keys": subscription.keys,
        "user_id": user_id,
        "role": role,
        "clinic": clinic,
        "portal_type": subscription.portal_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.push_subscriptions.update_one(
        {"endpoint": subscription.endpoint},
        {"$set": sub_doc},
        upsert=True
    )

    logger.info(f"Push subscription saved: user={user_id}, role={role}, portal={subscription.portal_type}")
    return {"success": True, "message": "Subscription saved"}


@router.post("/push/unsubscribe")
async def unsubscribe_push(subscription: PushSubscriptionRequest):
    db = get_db()
    await db.push_subscriptions.delete_one({"endpoint": subscription.endpoint})
    return {"success": True, "message": "Subscription removed"}


@router.post("/push/test")
async def test_push_notification(authorization: str = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        token = authorization.split(' ')[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("sub") or payload.get("user_id")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    send_push_notification = _deps.get("send_push_notification")
    if send_push_notification:
        result = await send_push_notification(
            user_id=user_id,
            title="Test Notification",
            body="Push notifications are working! You'll receive medicine reminders here.",
            url="/smart-reminders",
            tag="test-notification"
        )
        return {"success": True, "message": "Test notification sent", "result": result}
    return {"success": False, "message": "Push service not available"}
