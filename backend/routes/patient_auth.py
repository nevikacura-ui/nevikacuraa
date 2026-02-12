"""
Nevika Cura - Patient Authentication Routes (New System)
- Sign up via Email + OTP → Create Password
- Sign up via WhatsApp + OTP → Collect Email → Create Password
- Login with Email/Phone + Password (or OTP)
- Unified session across patient activities
"""

import uuid
import random
import jwt
import logging
import resend
import hashlib
import os
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, EmailStr

from services.whatsapp_otp import send_whatsapp_otp, verify_whatsapp_otp

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/patient-auth", tags=["Patient Authentication"])

# Configuration
JWT_SECRET = os.environ.get("JWT_SECRET", "nevika-cura-jwt-secret-key-2025")
JWT_ALGORITHM = "HS256"
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "Nevika Cura <noreply@nevikacura.com>")

# Initialize Resend
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Database reference (set by server.py)
db = None

def set_db(database):
    """Set database instance from server.py"""
    global db
    db = database

# In-memory OTP storage
patient_otp_storage = {}

# ============ Pydantic Models ============

class EmailOTPRequest(BaseModel):
    email: EmailStr

class EmailOTPVerify(BaseModel):
    email: EmailStr
    otp: str

class WhatsAppOTPRequest(BaseModel):
    phone: str

class WhatsAppOTPVerify(BaseModel):
    phone: str
    otp: str

class CreatePasswordRequest(BaseModel):
    verification_token: str
    password: str
    name: Optional[str] = None
    email: Optional[EmailStr] = None  # Required for WhatsApp signups

class LoginWithPassword(BaseModel):
    identifier: str  # Can be email or phone
    password: str

class LoginWithOTPRequest(BaseModel):
    identifier: str  # Can be email or phone

class LoginWithOTPVerify(BaseModel):
    identifier: str
    otp: str

# ============ Helper Functions ============

def generate_otp() -> str:
    """Generate 6-digit OTP"""
    return str(random.randint(100000, 999999))

def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return hash_password(password) == hashed

def generate_patient_id() -> str:
    """Generate unique patient ID: NC-PAT-YYYY-XXXXX"""
    year = datetime.now().year
    random_num = random.randint(10000, 99999)
    return f"NC-PAT-{year}-{random_num}"

async def send_email_otp(email: str, otp: str, purpose: str = "signup") -> bool:
    """Send OTP via email using Resend"""
    if not RESEND_API_KEY:
        logger.warning("Resend not configured")
        return False
    
    try:
        subject = "Nevika Cura - Verify Your Email"
        if purpose == "login":
            subject = "Nevika Cura - Login Code"
        
        html_content = f"""
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: #f8fafb;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #0F9D8C; margin: 0; font-size: 28px;">Nevika Cura</h1>
                <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Your Healthcare Partner</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #0F9D8C, #0D7B6E); padding: 40px 30px; border-radius: 20px; text-align: center; box-shadow: 0 10px 40px rgba(15, 157, 140, 0.3);">
                <p style="color: white; margin: 0 0 15px 0; font-size: 16px; opacity: 0.9;">Your verification code is:</p>
                <div style="background: white; padding: 25px 40px; border-radius: 16px; margin: 20px 0; display: inline-block; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                    <span style="font-size: 42px; font-weight: bold; letter-spacing: 10px; color: #0F9D8C; font-family: 'SF Mono', monospace;">{otp}</span>
                </div>
                <p style="color: rgba(255,255,255,0.8); margin: 20px 0 0 0; font-size: 13px;">Valid for 10 minutes</p>
            </div>
            
            <div style="margin-top: 30px; text-align: center;">
                <p style="color: #888; font-size: 12px; margin: 0;">
                    If you didn't request this code, please ignore this email.
                </p>
            </div>
        </div>
        """
        
        resend.Emails.send({
            "from": SENDER_EMAIL,
            "to": [email],
            "subject": subject,
            "html": html_content
        })
        
        logger.info(f"Email OTP sent to {email}")
        return True
    
    except Exception as e:
        logger.error(f"Failed to send email OTP: {str(e)}")
        return False

# ============ EMAIL SIGNUP FLOW ============

@router.post("/email/send-otp")
async def email_send_otp(request: EmailOTPRequest):
    """
    Step 1: Send OTP to email for signup/login
    If user exists with password -> redirect to login
    If user exists without password -> send OTP to set password
    If user doesn't exist -> send OTP for new signup
    """
    global db
    email = request.email.lower().strip()
    
    # Check if user exists
    existing = await db.patients.find_one({"email": email}, {"_id": 0})
    
    flow_type = "signup"
    if existing:
        if existing.get("password_hash"):
            flow_type = "login_with_password"
        else:
            flow_type = "set_password"
    
    # Generate OTP
    otp = generate_otp()
    patient_otp_storage[f"email_{email}"] = {
        "otp": otp,
        "type": "email",
        "identifier": email,
        "flow_type": flow_type,
        "existing_user": existing,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
        "attempts": 0
    }
    
    # Send email OTP
    email_sent = await send_email_otp(email, otp, "signup")
    
    response = {
        "success": True,
        "message": "OTP sent to your email",
        "email": email,
        "flow_type": flow_type,
        "expires_in": 600,
        "has_password": flow_type == "login_with_password"
    }
    
    # Always include mock_otp for development/testing
    response["mock_otp"] = otp
    if not email_sent:
        response["note"] = "Email service unavailable, use test OTP"
    
    return response

@router.post("/email/verify-otp")
async def email_verify_otp(request: EmailOTPVerify):
    """
    Step 2: Verify email OTP
    Returns verification_token for password creation
    """
    email = request.email.lower().strip()
    otp = request.otp.strip()
    otp_key = f"email_{email}"
    
    stored = patient_otp_storage.get(otp_key)
    if not stored:
        raise HTTPException(status_code=400, detail="OTP not found. Please request a new one.")
    
    if stored["attempts"] >= 3:
        del patient_otp_storage[otp_key]
        raise HTTPException(status_code=400, detail="Too many attempts. Please request a new OTP.")
    
    if datetime.now(timezone.utc) > stored["expires_at"]:
        del patient_otp_storage[otp_key]
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
    
    stored["attempts"] += 1
    
    if stored["otp"] != otp:
        remaining = 3 - stored["attempts"]
        raise HTTPException(status_code=400, detail=f"Invalid OTP. {remaining} attempts remaining.")
    
    # OTP verified - generate verification token
    verification_token = str(uuid.uuid4())
    
    # Store verification for password creation
    patient_otp_storage[f"verified_{verification_token}"] = {
        "type": "email",
        "identifier": email,
        "flow_type": stored["flow_type"],
        "existing_user": stored.get("existing_user"),
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=30)
    }
    
    # Clean up OTP
    del patient_otp_storage[otp_key]
    
    return {
        "success": True,
        "verified": True,
        "email": email,
        "verification_token": verification_token,
        "flow_type": stored["flow_type"],
        "needs_password": stored["flow_type"] in ["signup", "set_password"],
        "message": "Email verified! Please create your password." if stored["flow_type"] != "login_with_password" else "Email verified!"
    }

# ============ WHATSAPP SIGNUP FLOW ============

@router.post("/whatsapp/send-otp")
async def whatsapp_send_otp(request: WhatsAppOTPRequest):
    """
    Step 1: Send OTP via WhatsApp for signup/login
    If WhatsApp fails, redirect user to email verification instead (no mock OTP)
    """
    global db
    phone = request.phone.strip().replace("+91", "").replace(" ", "").replace("-", "")[-10:]
    
    if len(phone) != 10 or not phone.isdigit():
        raise HTTPException(status_code=400, detail="Please enter a valid 10-digit mobile number")
    
    # Check if user exists
    existing = await db.patients.find_one({"phone": phone}, {"_id": 0})
    
    flow_type = "signup"
    if existing:
        if existing.get("password_hash"):
            flow_type = "login_with_password"
        else:
            flow_type = "set_password"
    
    # Generate OTP
    otp = generate_otp()
    patient_otp_storage[f"whatsapp_{phone}"] = {
        "otp": otp,
        "type": "whatsapp",
        "identifier": phone,
        "flow_type": flow_type,
        "existing_user": existing,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
        "attempts": 0
    }
    
    # Try to send real WhatsApp OTP
    result = await send_whatsapp_otp(phone, "patient_signup")
    
    if result.get("success") and not result.get("mock"):
        # WhatsApp OTP sent successfully
        return {
            "success": True,
            "message": "OTP sent via WhatsApp",
            "phone": phone,
            "flow_type": flow_type,
            "has_password": flow_type == "login_with_password",
            "expires_in": 600
        }
    else:
        # WhatsApp failed - redirect to email verification (NO mock OTP)
        return {
            "success": False,
            "whatsapp_failed": True,
            "message": "WhatsApp service unavailable. Please use email for verification.",
            "phone": phone,
            "flow_type": flow_type,
            "has_password": flow_type == "login_with_password",
            "redirect_to_email": True
        }

@router.post("/whatsapp/verify-otp")
async def whatsapp_verify_otp(request: WhatsAppOTPVerify):
    """
    Step 2: Verify WhatsApp OTP
    Returns verification_token for email collection and password creation
    """
    phone = request.phone.strip().replace("+91", "").replace(" ", "").replace("-", "")[-10:]
    otp = request.otp.strip()
    
    # Check mock OTP first
    otp_key = f"whatsapp_{phone}"
    stored = patient_otp_storage.get(otp_key)
    
    if stored:
        # Verify mock OTP
        if stored["attempts"] >= 3:
            del patient_otp_storage[otp_key]
            raise HTTPException(status_code=400, detail="Too many attempts. Please request a new OTP.")
        
        if datetime.now(timezone.utc) > stored["expires_at"]:
            del patient_otp_storage[otp_key]
            raise HTTPException(status_code=400, detail="OTP expired.")
        
        stored["attempts"] += 1
        
        if stored["otp"] != otp:
            remaining = 3 - stored["attempts"]
            raise HTTPException(status_code=400, detail=f"Invalid OTP. {remaining} attempts remaining.")
        
        flow_type = stored["flow_type"]
        existing_user = stored.get("existing_user")
        del patient_otp_storage[otp_key]
    else:
        # Try MSG91 verification
        result = await verify_whatsapp_otp(phone, otp)
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Invalid OTP"))
        
        flow_info = patient_otp_storage.get(f"whatsapp_flow_{phone}", {})
        flow_type = flow_info.get("flow_type", "signup")
        existing_user = flow_info.get("existing_user")
    
    # Generate verification token
    verification_token = str(uuid.uuid4())
    
    patient_otp_storage[f"verified_{verification_token}"] = {
        "type": "whatsapp",
        "identifier": phone,
        "flow_type": flow_type,
        "existing_user": existing_user,
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=30)
    }
    
    # For WhatsApp signups, we need email and password
    needs_email = flow_type == "signup" and not existing_user
    needs_password = flow_type in ["signup", "set_password"]
    
    return {
        "success": True,
        "verified": True,
        "phone": phone,
        "verification_token": verification_token,
        "flow_type": flow_type,
        "needs_email": needs_email,
        "needs_password": needs_password,
        "message": "Phone verified! Please complete your profile." if needs_email else "Phone verified!"
    }

# ============ CREATE PASSWORD / COMPLETE SIGNUP ============

@router.post("/create-password")
async def create_password(request: CreatePasswordRequest):
    """
    Final step: Create password and complete account setup
    For new users: Creates account
    For existing users without password: Sets password
    """
    global db
    verification_token = request.verification_token
    password = request.password.strip()
    
    # Validate password
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Get verification data
    verified_data = patient_otp_storage.get(f"verified_{verification_token}")
    if not verified_data:
        raise HTTPException(status_code=400, detail="Verification expired. Please start again.")
    
    if datetime.now(timezone.utc) > verified_data["expires_at"]:
        del patient_otp_storage[f"verified_{verification_token}"]
        raise HTTPException(status_code=400, detail="Verification expired. Please start again.")
    
    identifier_type = verified_data["type"]
    identifier = verified_data["identifier"]
    flow_type = verified_data["flow_type"]
    existing_user = verified_data.get("existing_user")
    
    password_hash = hash_password(password)
    
    if flow_type == "signup":
        # New user - create account
        patient_id = generate_patient_id()
        user_id = str(uuid.uuid4())
        
        # For WhatsApp signups, email is required
        if identifier_type == "whatsapp":
            if not request.email:
                raise HTTPException(status_code=400, detail="Email is required to complete signup")
            
            # Check if email already exists
            email_exists = await db.patients.find_one({"email": request.email.lower()})
            if email_exists:
                raise HTTPException(status_code=400, detail="Email already registered. Please login instead.")
        
        patient_doc = {
            "id": user_id,
            "patient_id": patient_id,
            "name": request.name or "Patient",
            "email": request.email.lower() if request.email else identifier if identifier_type == "email" else None,
            "phone": identifier if identifier_type == "whatsapp" else None,
            "password_hash": password_hash,
            "email_verified": identifier_type == "email",
            "phone_verified": identifier_type == "whatsapp",
            "loyalty_points": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_login": datetime.now(timezone.utc).isoformat()
        }
        
        await db.patients.insert_one(patient_doc)
        
        logger.info(f"New patient registered: {patient_id}")
        
        user_data = {
            "id": user_id,
            "patient_id": patient_id,
            "name": patient_doc["name"],
            "email": patient_doc["email"],
            "phone": patient_doc["phone"]
        }
        
    else:
        # Existing user - set password
        if not existing_user:
            raise HTTPException(status_code=400, detail="User not found")
        
        update_data = {
            "password_hash": password_hash,
            "last_login": datetime.now(timezone.utc).isoformat()
        }
        
        # Update email if provided for WhatsApp users
        if request.email and identifier_type == "whatsapp":
            update_data["email"] = request.email.lower()
        
        if request.name:
            update_data["name"] = request.name
        
        await db.patients.update_one(
            {"id": existing_user["id"]},
            {"$set": update_data}
        )
        
        user_data = {
            "id": existing_user["id"],
            "patient_id": existing_user.get("patient_id"),
            "name": request.name or existing_user.get("name"),
            "email": request.email or existing_user.get("email"),
            "phone": existing_user.get("phone")
        }
    
    # Clean up verification
    del patient_otp_storage[f"verified_{verification_token}"]
    
    # Generate JWT token (30 days)
    token = jwt.encode(
        {
            "sub": user_data["id"],
            "patient_id": user_data["patient_id"],
            "email": user_data["email"],
            "phone": user_data.get("phone"),
            "name": user_data["name"],
            "type": "patient",
            "exp": datetime.now(timezone.utc) + timedelta(days=30)
        },
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )
    
    return {
        "success": True,
        "message": "Account created successfully!" if flow_type == "signup" else "Password set successfully!",
        "token": token,
        "user": user_data
    }

# ============ LOGIN WITH PASSWORD ============

@router.post("/login")
async def login_with_password(request: LoginWithPassword):
    """
    Login with email/phone and password
    """
    global db
    identifier = request.identifier.strip().lower()
    password = request.password
    
    # Find user by email or phone
    user = None
    if "@" in identifier:
        user = await db.patients.find_one({"email": identifier}, {"_id": 0})
    else:
        phone = identifier.replace("+91", "").replace(" ", "").replace("-", "")[-10:]
        user = await db.patients.find_one({"phone": phone}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email/phone or password")
    
    if not user.get("password_hash"):
        raise HTTPException(status_code=400, detail="Password not set. Please use OTP to login and set your password.")
    
    if not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email/phone or password")
    
    # Update last login
    await db.patients.update_one(
        {"id": user["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Generate token
    token = jwt.encode(
        {
            "sub": user["id"],
            "patient_id": user.get("patient_id"),
            "email": user.get("email"),
            "phone": user.get("phone"),
            "name": user.get("name"),
            "type": "patient",
            "exp": datetime.now(timezone.utc) + timedelta(days=30)
        },
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )
    
    return {
        "success": True,
        "message": f"Welcome back, {user.get('name', 'User')}!",
        "token": token,
        "user": {
            "id": user["id"],
            "patient_id": user.get("patient_id"),
            "name": user.get("name"),
            "email": user.get("email"),
            "phone": user.get("phone")
        }
    }

# ============ LOGIN WITH OTP (for users who forgot password) ============

@router.post("/login-otp/send")
async def login_otp_send(request: LoginWithOTPRequest):
    """
    Send OTP for login (useful if user forgot password)
    """
    global db
    identifier = request.identifier.strip().lower()
    
    # Find user
    user = None
    otp_method = "email"
    
    if "@" in identifier:
        user = await db.patients.find_one({"email": identifier}, {"_id": 0})
        otp_method = "email"
    else:
        phone = identifier.replace("+91", "").replace(" ", "").replace("-", "")[-10:]
        user = await db.patients.find_one({"phone": phone}, {"_id": 0})
        otp_method = "whatsapp"
        identifier = phone
    
    if not user:
        raise HTTPException(status_code=404, detail="Account not found. Please sign up first.")
    
    # Generate OTP
    otp = generate_otp()
    otp_key = f"login_otp_{identifier}"
    
    patient_otp_storage[otp_key] = {
        "otp": otp,
        "user": user,
        "method": otp_method,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
        "attempts": 0
    }
    
    # Send OTP
    otp_sent = False
    if otp_method == "email":
        otp_sent = await send_email_otp(identifier, otp, "login")
    else:
        result = await send_whatsapp_otp(identifier, "patient_login")
        otp_sent = result.get("success", False)
    
    response = {
        "success": True,
        "message": f"OTP sent via {'Email' if otp_method == 'email' else 'WhatsApp'}",
        "method": otp_method,
        "identifier": identifier if otp_method == "email" else f"******{identifier[-4:]}",
        "expires_in": 600
    }
    
    if not otp_sent:
        response["mock_otp"] = otp
        response["note"] = "Service unavailable, use test OTP"
    
    return response

@router.post("/login-otp/verify")
async def login_otp_verify(request: LoginWithOTPVerify):
    """
    Verify login OTP and return auth token
    """
    identifier = request.identifier.strip().lower()
    otp = request.otp.strip()
    
    # Normalize phone if needed
    if "@" not in identifier:
        identifier = identifier.replace("+91", "").replace(" ", "").replace("-", "")[-10:]
    
    otp_key = f"login_otp_{identifier}"
    stored = patient_otp_storage.get(otp_key)
    
    if not stored:
        raise HTTPException(status_code=400, detail="OTP not found. Please request a new one.")
    
    if stored["attempts"] >= 3:
        del patient_otp_storage[otp_key]
        raise HTTPException(status_code=400, detail="Too many attempts. Please request a new OTP.")
    
    if datetime.now(timezone.utc) > stored["expires_at"]:
        del patient_otp_storage[otp_key]
        raise HTTPException(status_code=400, detail="OTP expired.")
    
    stored["attempts"] += 1
    
    if stored["otp"] != otp:
        remaining = 3 - stored["attempts"]
        raise HTTPException(status_code=400, detail=f"Invalid OTP. {remaining} attempts remaining.")
    
    user = stored["user"]
    del patient_otp_storage[otp_key]
    
    # Update last login
    global db
    await db.patients.update_one(
        {"id": user["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Generate token
    token = jwt.encode(
        {
            "sub": user["id"],
            "patient_id": user.get("patient_id"),
            "email": user.get("email"),
            "phone": user.get("phone"),
            "name": user.get("name"),
            "type": "patient",
            "exp": datetime.now(timezone.utc) + timedelta(days=30)
        },
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )
    
    return {
        "success": True,
        "message": f"Welcome back, {user.get('name', 'User')}!",
        "token": token,
        "user": {
            "id": user["id"],
            "patient_id": user.get("patient_id"),
            "name": user.get("name"),
            "email": user.get("email"),
            "phone": user.get("phone")
        }
    }

# ============ USER PROFILE ============

@router.get("/me")
async def get_current_patient(authorization: str = Header(None)):
    """Get current logged-in patient profile"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        if payload.get("type") != "patient":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        global db
        user = await db.patients.find_one({"id": payload.get("sub")}, {"_id": 0, "password_hash": 0})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "authenticated": True,
            "user": user
        }
    
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please login again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ TOKEN VALIDATION ============

@router.post("/validate-token")
async def validate_token(authorization: str = Header(None)):
    """Validate if token is still valid"""
    if not authorization:
        return {"valid": False, "reason": "No token provided"}
    
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        return {
            "valid": True,
            "type": payload.get("type"),
            "user_id": payload.get("sub"),
            "expires_at": datetime.fromtimestamp(payload.get("exp")).isoformat()
        }
    
    except jwt.ExpiredSignatureError:
        return {"valid": False, "reason": "Token expired"}
    except jwt.InvalidTokenError:
        return {"valid": False, "reason": "Invalid token"}
