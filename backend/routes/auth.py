"""
Nevika Cura - Authentication Routes
Login, register, OTP verification endpoints
"""

import uuid
import random
import jwt
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr

from database import get_db
from services import send_twilio_otp, verify_twilio_otp, send_email_notification

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# JWT Configuration
JWT_SECRET = __import__("os").environ.get("JWT_SECRET", "nevika-cura-jwt-secret-key-2025")
JWT_ALGORITHM = "HS256"

# In-memory OTP storage (fallback)
auth_otp_storage = {}

# ============ Pydantic Models ============

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class AuthOTPRequest(BaseModel):
    phone: str

class AuthOTPVerify(BaseModel):
    phone: str
    otp: str

class OTPRegister(BaseModel):
    phone: str
    name: str
    email: Optional[EmailStr] = None
    verification_token: str

class OTPLogin(BaseModel):
    phone: str
    verification_token: str

# ============ Helper Functions ============

def generate_otp() -> str:
    """Generate 6-digit OTP"""
    return str(random.randint(100000, 999999))

def hash_password(password: str) -> str:
    """Simple password hashing (use bcrypt in production)"""
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return hash_password(password) == hashed

async def get_current_user(authorization: str = None):
    """Get current user from JWT token"""
    if not authorization:
        return None
    
    try:
        if authorization.startswith("Bearer "):
            token = authorization[7:]
        else:
            token = authorization
        
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        
        if not user_id:
            return None
        
        db = get_db()
        user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
        
        if not user_doc:
            return None
        
        # Return as object-like dict
        class UserDict(dict):
            def __getattr__(self, key):
                return self.get(key)
        
        return UserDict(user_doc)
    
    except Exception as e:
        logger.error(f"Token validation error: {str(e)}")
        return None

# ============ Email-based Auth Routes ============

@router.post("/register")
async def register(user_data: UserRegister):
    """Register new user with email/password"""
    db = get_db()
    
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if phone exists
    if user_data.phone:
        existing_phone = await db.users.find_one({"phone": user_data.phone})
        if existing_phone:
            raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "phone": user_data.phone,
        "loyalty_points": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user)
    
    # Generate token
    token = jwt.encode(
        {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=30)},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )
    
    logger.info(f"New user registered: {user_data.email}")
    
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "phone": user_data.phone
        }
    }

@router.post("/login")
async def login(credentials: UserLogin):
    """Login with email/password"""
    db = get_db()
    
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(credentials.password, user.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Generate token
    token = jwt.encode(
        {"sub": user["id"], "exp": datetime.now(timezone.utc) + timedelta(days=30)},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user.get("name"),
            "phone": user.get("phone")
        }
    }

@router.get("/me")
async def get_me(authorization: str = None):
    """Get current user profile"""
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    return {
        "id": user.get("id"),
        "email": user.get("email"),
        "name": user.get("name"),
        "phone": user.get("phone"),
        "loyalty_points": user.get("loyalty_points", 0)
    }

# ============ OTP-based Auth Routes ============

@router.post("/otp/send")
async def send_auth_otp(request: AuthOTPRequest):
    """Send OTP for authentication via SMS"""
    phone = request.phone.strip()
    
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    
    # Try Twilio first
    result = await send_twilio_otp(phone)
    if result.get("success"):
        return {
            "success": True,
            "message": "OTP sent to your phone via SMS",
            "expires_in": 300,
            "phone": phone,
            "method": "sms"
        }
    
    # Fallback to mock OTP
    otp = generate_otp()
    otp_key = f"auth_{phone}"
    auth_otp_storage[otp_key] = {
        "otp": otp,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5),
        "attempts": 0
    }
    
    logger.info(f"Mock OTP generated for {phone}: {otp}")
    
    return {
        "success": True,
        "message": "OTP sent successfully",
        "mock_otp": otp,
        "expires_in": 300,
        "phone": phone,
        "method": "mock"
    }

@router.post("/otp/verify")
async def verify_auth_otp(request: AuthOTPVerify):
    """Verify OTP for authentication"""
    phone = request.phone.strip()
    otp = request.otp.strip()
    
    # Try Twilio verification first
    result = await verify_twilio_otp(phone, otp)
    if result.get("success"):
        if result.get("valid"):
            verification_token = str(uuid.uuid4())
            return {
                "success": True,
                "verified": True,
                "verification_token": verification_token,
                "phone": phone,
                "method": "sms"
            }
        else:
            raise HTTPException(status_code=400, detail="Invalid OTP. Please try again.")
    
    # Fallback to mock verification
    otp_key = f"auth_{phone}"
    
    if otp_key not in auth_otp_storage:
        raise HTTPException(status_code=400, detail="OTP not found. Please request a new OTP.")
    
    stored_data = auth_otp_storage[otp_key]
    
    if datetime.now(timezone.utc) > stored_data["expires_at"]:
        del auth_otp_storage[otp_key]
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new OTP.")
    
    if stored_data["attempts"] >= 3:
        del auth_otp_storage[otp_key]
        raise HTTPException(status_code=400, detail="Too many attempts. Please request a new OTP.")
    
    if otp != stored_data["otp"]:
        auth_otp_storage[otp_key]["attempts"] += 1
        remaining = 3 - auth_otp_storage[otp_key]["attempts"]
        raise HTTPException(status_code=400, detail=f"Invalid OTP. {remaining} attempts remaining.")
    
    verification_token = str(uuid.uuid4())
    auth_otp_storage[otp_key]["verified"] = True
    auth_otp_storage[otp_key]["verification_token"] = verification_token
    
    return {
        "success": True,
        "verified": True,
        "verification_token": verification_token,
        "phone": phone,
        "method": "mock"
    }

@router.post("/register/otp")
async def register_with_otp(data: OTPRegister):
    """Register user after OTP verification"""
    db = get_db()
    phone = data.phone.strip()
    
    # Check if phone already registered
    existing = await db.users.find_one({"phone": phone})
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered. Please login instead.")
    
    # Create user
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "phone": phone,
        "name": data.name,
        "email": data.email,
        "loyalty_points": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user)
    
    # Generate token
    token = jwt.encode(
        {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=30)},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )
    
    logger.info(f"New user registered via OTP: {phone}")
    
    return {
        "token": token,
        "user": {
            "id": user_id,
            "phone": phone,
            "name": data.name,
            "email": data.email
        },
        "is_new_user": True
    }

@router.post("/login/otp")
async def login_with_otp(data: OTPLogin):
    """Login user after OTP verification"""
    db = get_db()
    phone = data.phone.strip()
    
    user = await db.users.find_one({"phone": phone}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Please register first.")
    
    # Generate token
    token = jwt.encode(
        {"sub": user["id"], "exp": datetime.now(timezone.utc) + timedelta(days=30)},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "phone": user.get("phone"),
            "name": user.get("name"),
            "email": user.get("email")
        },
        "is_new_user": False
    }

# ============ Guest Session Routes ============

@router.post("/guest/session")
async def create_guest_session(phone: str = None):
    """Create a guest session for tracking orders"""
    session_id = str(uuid.uuid4())
    
    return {
        "session_id": session_id,
        "phone": phone,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
