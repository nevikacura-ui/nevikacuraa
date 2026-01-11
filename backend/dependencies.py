"""
Nevika Cura - Shared Dependencies
Common dependencies, models, and utilities used across routes
"""

import os
import jwt
import bcrypt
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import Header, HTTPException, Depends
from pydantic import BaseModel, EmailStr

logger = logging.getLogger(__name__)

# JWT Configuration
JWT_SECRET = os.environ.get("JWT_SECRET", "nevika-cura-jwt-secret-key-2025")
JWT_ALGORITHM = "HS256"

# ============ Pydantic Models ============

class User(BaseModel):
    id: str
    email: str
    phone: Optional[str] = None
    name: str
    created_at: datetime = datetime.now(timezone.utc)
    loyalty_points: int = 0

class UserCreate(BaseModel):
    email: EmailStr
    phone: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class AuthOTPRequest(BaseModel):
    phone: str

class AuthOTPVerify(BaseModel):
    phone: str
    otp: str

class RegisterWithOTP(BaseModel):
    phone: str
    otp: str = ""
    email: EmailStr
    password: str
    name: str
    verification_token: str = ""

class LoginWithOTP(BaseModel):
    phone: str
    otp: str

class GuestSession(BaseModel):
    phone: str
    name: str

class OTPRequest(BaseModel):
    phone: str

class OTPVerify(BaseModel):
    phone: str
    otp: str

# ============ Authentication Dependencies ============

async def get_current_user(authorization: str = Header(None)):
    """Get current authenticated user from JWT token"""
    from database import get_db
    db = get_db()
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
        
        if not user_doc:
            raise HTTPException(status_code=401, detail="User not found")
        
        return User(**user_doc)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user_optional(authorization: str = Header(None)):
    """Get current user if authenticated, otherwise return None"""
    from database import get_db
    db = get_db()
    
    if not authorization or not authorization.startswith("Bearer "):
        return None
    
    token = authorization.replace("Bearer ", "")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        
        if not user_id:
            return None
        
        user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
        
        if not user_doc:
            return None
        
        return User(**user_doc)
    except:
        return None

async def verify_admin(authorization: str = Header(None)):
    """Verify admin authentication"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    
    token = authorization.replace("Bearer ", "")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def verify_staff(authorization: str = Header(None)):
    """Verify staff authentication"""
    from database import get_db
    db = get_db()
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")
    
    token = authorization.replace("Bearer ", "")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        staff_id = payload.get("staff_id")
        
        if not staff_id:
            raise HTTPException(status_code=401, detail="Invalid staff token")
        
        staff = await db.staff.find_one({"id": staff_id}, {"_id": 0})
        
        if not staff or not staff.get("active"):
            raise HTTPException(status_code=401, detail="Staff account inactive")
        
        return staff
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ Utility Functions ============

def generate_otp():
    """Generate 6-digit OTP"""
    return str(random.randint(100000, 999999))

def create_user_token(user_id: str, days: int = 30) -> str:
    """Create JWT token for user"""
    return jwt.encode(
        {'sub': user_id, 'exp': datetime.now(timezone.utc) + timedelta(days=days)},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )

def create_admin_token(days: int = 1) -> str:
    """Create JWT token for admin"""
    return jwt.encode(
        {'role': 'admin', 'exp': datetime.now(timezone.utc) + timedelta(days=days)},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )

def create_staff_token(staff_id: str, role: str, days: int = 7) -> str:
    """Create JWT token for staff"""
    return jwt.encode(
        {'staff_id': staff_id, 'role': role, 'exp': datetime.now(timezone.utc) + timedelta(days=days)},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

# Import random for OTP generation
import random
