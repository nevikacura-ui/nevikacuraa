"""
Shared authentication utilities.
Contains get_current_user, User model, and JWT constants.
Used by auth_routes.py and other route files that need auth dependencies.
"""
import os
import jwt
import logging
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import Header
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from bson import ObjectId
import uuid

logger = logging.getLogger("server")

JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"

_db = None

def set_db(database):
    global _db
    _db = database

def get_db():
    return _db


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    name: str = ""
    role: Optional[str] = None
    username: Optional[str] = None
    department: Optional[str] = None
    loyalty_points: int = 0
    interests: List[str] = []
    onboarding_complete: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        return None
    token = authorization.split(' ')[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('sub')
        if not user_id:
            return None

        db = get_db()
        # First try users collection
        user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        if user_doc:
            return User(**user_doc)

        # Try staff collection
        staff_doc = await db.staff.find_one(
            {"$or": [{"id": user_id}, {"_id": ObjectId(user_id) if len(user_id) == 24 else None}]},
            {"_id": 0, "password_hash": 0}
        ) if user_id else None

        if staff_doc:
            return User(
                id=staff_doc.get("id", user_id),
                name=staff_doc.get("name") or payload.get("name"),
                email=staff_doc.get("email"),
                phone=staff_doc.get("phone"),
                role=staff_doc.get("role") or payload.get("role", "staff"),
                username=staff_doc.get("username") or payload.get("username"),
                department=staff_doc.get("department") or payload.get("department")
            )

        # Fallback: Create User from token payload if staff doc not found
        if payload.get("role") in ["staff", "admin", "pharmacy_staff", "lab_staff", "doctor"]:
            return User(
                id=user_id,
                name=payload.get("name"),
                email=None,
                phone=payload.get("phone"),
                role=payload.get("role", "staff"),
                username=payload.get("username"),
                department=payload.get("department")
            )

        return None
    except Exception as e:
        logger.error(f"Token validation error: {str(e)}")
        return None


async def get_current_user_optional(authorization: str = Header(None)):
    """Same as get_current_user but explicitly for optional auth endpoints"""
    if not authorization or not authorization.startswith('Bearer '):
        return None
    token = authorization.split(' ')[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('sub')
        if not user_id:
            return None
        db = get_db()
        user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        if not user_doc:
            return None
        return user_doc
    except Exception:
        return None
