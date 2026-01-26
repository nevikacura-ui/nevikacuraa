"""
Staff Notifications API
Real-time notifications for clinic staff when patients book appointments
"""
from fastapi import APIRouter, HTTPException, Header, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import jwt
import os

router = APIRouter(prefix="/staff/notifications", tags=["Staff Notifications"])

# Get JWT secret from environment
JWT_SECRET = os.environ.get('JWT_SECRET', 'your_jwt_secret_here')

async def get_staff_from_token(authorization: str = Header(None)):
    """Extract staff info from JWT token"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        token = authorization.split(' ')[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return {
            "username": payload.get("sub"),
            "role": payload.get("role"),
            "clinic": payload.get("clinic")
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    message: str
    clinic: Optional[str] = None
    appointment_id: Optional[str] = None
    patient_name: Optional[str] = None
    doctor: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    is_read: bool = False
    created_at: str


def setup_routes(db):
    """Setup routes with database dependency"""
    
    @router.get("", response_model=List[NotificationResponse])
    async def get_staff_notifications(
        unread_only: bool = Query(False, description="Get only unread notifications"),
        limit: int = Query(20, description="Max notifications to return"),
        authorization: str = Header(None)
    ):
        """Get notifications for the authenticated staff member"""
        staff = await get_staff_from_token(authorization)
        staff_clinic = staff.get("clinic")
        
        # Build query - staff sees notifications for their clinic
        query = {}
        if staff_clinic:
            query["clinic"] = staff_clinic
        
        if unread_only:
            query["is_read"] = False
        
        # Fetch notifications, newest first
        cursor = db.staff_notifications.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).limit(limit)
        
        notifications = await cursor.to_list(length=limit)
        return notifications
    
    @router.get("/count")
    async def get_unread_count(authorization: str = Header(None)):
        """Get count of unread notifications"""
        staff = await get_staff_from_token(authorization)
        staff_clinic = staff.get("clinic")
        
        query = {"is_read": False}
        if staff_clinic:
            query["clinic"] = staff_clinic
        
        count = await db.staff_notifications.count_documents(query)
        return {"unread_count": count}
    
    @router.put("/{notification_id}/read")
    async def mark_notification_read(
        notification_id: str,
        authorization: str = Header(None)
    ):
        """Mark a single notification as read"""
        await get_staff_from_token(authorization)
        
        result = await db.staff_notifications.update_one(
            {"id": notification_id},
            {"$set": {"is_read": True}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return {"success": True, "message": "Notification marked as read"}
    
    @router.put("/mark-all-read")
    async def mark_all_notifications_read(authorization: str = Header(None)):
        """Mark all notifications as read for the staff's clinic"""
        staff = await get_staff_from_token(authorization)
        staff_clinic = staff.get("clinic")
        
        query = {}
        if staff_clinic:
            query["clinic"] = staff_clinic
        
        result = await db.staff_notifications.update_many(
            query,
            {"$set": {"is_read": True}}
        )
        
        return {"success": True, "marked_read": result.modified_count}
    
    @router.delete("/{notification_id}")
    async def delete_notification(
        notification_id: str,
        authorization: str = Header(None)
    ):
        """Delete a notification"""
        await get_staff_from_token(authorization)
        
        result = await db.staff_notifications.delete_one({"id": notification_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return {"success": True, "message": "Notification deleted"}
    
    return router


async def create_staff_notification(
    db,
    notification_type: str,
    title: str,
    message: str,
    clinic: str = None,
    appointment_id: str = None,
    patient_name: str = None,
    doctor: str = None,
    date: str = None,
    time: str = None
):
    """
    Create a notification for clinic staff
    
    Types: 'new_appointment', 'cancelled_appointment', 'emergency', 'walk_in', 'check_in'
    """
    import uuid
    
    notification = {
        "id": str(uuid.uuid4()),
        "type": notification_type,
        "title": title,
        "message": message,
        "clinic": clinic,
        "appointment_id": appointment_id,
        "patient_name": patient_name,
        "doctor": doctor,
        "date": date,
        "time": time,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.staff_notifications.insert_one(notification)
    return notification
