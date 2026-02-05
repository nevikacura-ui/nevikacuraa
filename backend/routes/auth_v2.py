"""
Nevika Cura - Two-Tiered Authentication System V2
- Guest Mode: SMS OTP (Twilio) for one-time orders → Order ID only
- Sign-up Mode: Email OTP (Resend) for persistent accounts → Registration ID + Order ID
"""

import uuid
import random
import jwt
import logging
import resend
import os
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, EmailStr

from services.sms import send_twilio_otp, verify_twilio_otp

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth/v2", tags=["Authentication V2"])

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

# In-memory OTP storage for email verification
email_otp_storage = {}

# ============ Pydantic Models ============

class GuestOTPRequest(BaseModel):
    phone: str

class GuestOTPVerify(BaseModel):
    phone: str
    otp: str

class SignUpRequest(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None

class EmailOTPVerify(BaseModel):
    email: EmailStr
    otp: str

class LoginRequest(BaseModel):
    email: EmailStr

# ============ Helper Functions ============

def generate_otp() -> str:
    """Generate 6-digit OTP"""
    return str(random.randint(100000, 999999))

def generate_registration_id() -> str:
    """Generate unique registration ID: NC-REG-YYYY-XXXXX"""
    year = datetime.now().year
    random_num = random.randint(10000, 99999)
    return f"NC-REG-{year}-{random_num}"

def generate_order_id(prefix: str = "ORD") -> str:
    """Generate unique order ID: NC-ORD-YYYYMMDD-XXXXX"""
    date_str = datetime.now().strftime("%Y%m%d")
    random_num = random.randint(10000, 99999)
    return f"NC-{prefix}-{date_str}-{random_num}"

async def send_email_otp(email: str, otp: str, purpose: str = "verify") -> bool:
    """Send OTP via email using Resend
    
    NOTE: Resend requires domain verification to send to external emails.
    In test mode, only the account owner's email can receive emails.
    To enable for all users, verify a domain at https://resend.com/domains
    """
    if not RESEND_API_KEY:
        logger.warning("Resend not configured, cannot send email OTP")
        return False
    
    try:
        subject = "Your Nevika Cura Verification Code"
        if purpose == "login":
            subject = "Your Nevika Cura Login Code"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #0F9D8C; margin: 0;">Nevika Cura</h1>
                <p style="color: #666;">A Healthcare Group</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #4FE3C1, #0F9D8C); padding: 30px; border-radius: 16px; text-align: center;">
                <p style="color: white; margin: 0 0 10px 0; font-size: 16px;">Your verification code is:</p>
                <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0;">
                    <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0F6F66;">{otp}</span>
                </div>
                <p style="color: white; margin: 0; font-size: 14px;">Valid for 10 minutes</p>
            </div>
            
            <p style="color: #666; font-size: 12px; text-align: center; margin-top: 20px;">
                If you didn't request this code, please ignore this email.
            </p>
        </div>
        """
        
        result = resend.Emails.send({
            "from": SENDER_EMAIL,
            "to": [email],
            "subject": subject,
            "html": html_content
        })
        
        logger.info(f"Email OTP sent to {email}, result: {result}")
        return True
    
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to send email OTP to {email}: {error_msg}")
        
        # Check if it's a domain verification issue
        if "verify a domain" in error_msg.lower() or "testing emails" in error_msg.lower():
            logger.warning("Resend domain not verified. To send emails to all users, verify domain at resend.com/domains")
        
        return False

# ============ GUEST MODE (SMS OTP - One-time Orders) ============

@router.post("/guest/send-otp")
async def guest_send_otp(request: GuestOTPRequest):
    """
    Send OTP via SMS for guest checkout (no account needed).
    Used for one-time orders - only Order ID generated.
    """
    phone = request.phone.strip().replace("+91", "").replace(" ", "").replace("-", "")[-10:]
    
    if len(phone) != 10 or not phone.isdigit():
        raise HTTPException(status_code=400, detail="Invalid phone number. Enter 10-digit mobile number.")
    
    # Send OTP via Twilio
    result = await send_twilio_otp(phone)
    
    if result.get("success"):
        logger.info(f"Guest OTP sent to {phone}")
        return {
            "success": True,
            "message": "OTP sent to your mobile number",
            "phone": phone,
            "expires_in": 300,
            "mode": "guest"
        }
    else:
        # Fallback: Generate mock OTP for development
        otp = generate_otp()
        global db
        await db.guest_otps.update_one(
            {"phone": phone},
            {
                "$set": {
                    "phone": phone,
                    "otp": otp,
                    "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
                    "attempts": 0
                }
            },
            upsert=True
        )
        
        logger.warning(f"Twilio failed, using mock OTP for {phone}: {otp}")
        return {
            "success": True,
            "message": "OTP generated (Demo mode)",
            "phone": phone,
            "mock_otp": otp,  # Only in development
            "expires_in": 300,
            "mode": "guest",
            "note": "Twilio unavailable, using test OTP"
        }

@router.post("/guest/verify-otp")
async def guest_verify_otp(request: GuestOTPVerify):
    """
    Verify guest OTP and return a temporary session token.
    This allows guest to complete one order without creating an account.
    """
    phone = request.phone.strip().replace("+91", "").replace(" ", "").replace("-", "")[-10:]
    otp = request.otp.strip()
    
    if len(otp) != 6:
        raise HTTPException(status_code=400, detail="Invalid OTP format")
    
    # Try Twilio verification first
    result = await verify_twilio_otp(phone, otp)
    
    if result.get("valid"):
        # Create guest session token (short-lived)
        session_token = jwt.encode(
            {
                "sub": f"guest_{phone}",
                "phone": phone,
                "type": "guest",
                "exp": datetime.now(timezone.utc) + timedelta(hours=2)  # 2-hour session
            },
            JWT_SECRET,
            algorithm=JWT_ALGORITHM
        )
        
        return {
            "success": True,
            "verified": True,
            "session_token": session_token,
            "phone": phone,
            "mode": "guest",
            "expires_in": 7200,  # 2 hours
            "message": "Phone verified! You can now complete your order."
        }
    
    # Fallback: Check mock OTP
    global db
    otp_record = await db.guest_otps.find_one({"phone": phone})
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="OTP not found. Please request a new one.")
    
    if otp_record.get("attempts", 0) >= 3:
        await db.guest_otps.delete_one({"phone": phone})
        raise HTTPException(status_code=400, detail="Too many attempts. Please request a new OTP.")
    
    expires_at = datetime.fromisoformat(otp_record["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        await db.guest_otps.delete_one({"phone": phone})
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
    
    await db.guest_otps.update_one({"phone": phone}, {"$inc": {"attempts": 1}})
    
    if otp_record["otp"] != otp:
        remaining = 3 - otp_record.get("attempts", 0) - 1
        raise HTTPException(status_code=400, detail=f"Invalid OTP. {remaining} attempts remaining.")
    
    # OTP verified - delete and create session
    await db.guest_otps.delete_one({"phone": phone})
    
    session_token = jwt.encode(
        {
            "sub": f"guest_{phone}",
            "phone": phone,
            "type": "guest",
            "exp": datetime.now(timezone.utc) + timedelta(hours=2)
        },
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )
    
    return {
        "success": True,
        "verified": True,
        "session_token": session_token,
        "phone": phone,
        "mode": "guest",
        "expires_in": 7200,
        "message": "Phone verified! You can now complete your order."
    }


# New endpoint for creating session after WhatsApp OTP verification
class CreateSessionRequest(BaseModel):
    phone: str

@router.post("/guest/create-session")
async def guest_create_session(request: CreateSessionRequest):
    """
    Create guest session after WhatsApp OTP verification.
    Called after successful /api/otp/whatsapp/verify
    """
    phone = request.phone.strip().replace("+91", "").replace(" ", "").replace("-", "")[-10:]
    
    if len(phone) != 10 or not phone.isdigit():
        raise HTTPException(status_code=400, detail="Invalid phone number")
    
    # Create guest session token
    session_token = jwt.encode(
        {
            "sub": f"guest_{phone}",
            "phone": phone,
            "type": "guest",
            "exp": datetime.now(timezone.utc) + timedelta(hours=2)  # 2-hour session
        },
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )
    
    return {
        "success": True,
        "session_token": session_token,
        "phone": phone,
        "mode": "guest",
        "expires_in": 7200,
        "message": "Session created successfully"
    }


# ============ SIGN-UP MODE (Email OTP - Persistent Account) ============

@router.post("/signup/send-otp")
async def signup_send_otp(request: SignUpRequest):
    """
    Step 1 of sign-up: Send OTP to email address.
    Creates persistent account with Registration ID.
    """
    global db
    email = request.email.lower().strip()
    
    # Check if email already registered
    existing = await db.registered_users.find_one({"email": email})
    if existing:
        raise HTTPException(
            status_code=400, 
            detail="Email already registered. Please login instead."
        )
    
    # Generate and store OTP
    otp = generate_otp()
    email_otp_storage[email] = {
        "otp": otp,
        "name": request.name,
        "phone": request.phone,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
        "attempts": 0
    }
    
    # Send email OTP
    email_sent = await send_email_otp(email, otp, purpose="verify")
    
    response = {
        "success": True,
        "message": "Verification code sent to your email",
        "email": email,
        "expires_in": 600,
        "mode": "signup"
    }
    
    if not email_sent:
        # Return mock OTP for development
        response["mock_otp"] = otp
        response["note"] = "Email service unavailable, use test OTP"
    
    return response

@router.post("/signup/verify-otp")
async def signup_verify_otp(request: EmailOTPVerify):
    """
    Step 2 of sign-up: Verify email OTP and create account.
    Returns Registration ID and persistent auth token.
    """
    global db
    email = request.email.lower().strip()
    otp = request.otp.strip()
    
    # Check stored OTP
    stored = email_otp_storage.get(email)
    if not stored:
        raise HTTPException(status_code=400, detail="OTP not found. Please request a new one.")
    
    if stored["attempts"] >= 3:
        del email_otp_storage[email]
        raise HTTPException(status_code=400, detail="Too many attempts. Please request a new OTP.")
    
    if datetime.now(timezone.utc) > stored["expires_at"]:
        del email_otp_storage[email]
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
    
    stored["attempts"] += 1
    
    if stored["otp"] != otp:
        remaining = 3 - stored["attempts"]
        raise HTTPException(status_code=400, detail=f"Invalid OTP. {remaining} attempts remaining.")
    
    # OTP verified - create account
    registration_id = generate_registration_id()
    user_id = str(uuid.uuid4())
    
    user_doc = {
        "id": user_id,
        "registration_id": registration_id,
        "email": email,
        "name": stored["name"],
        "phone": stored.get("phone"),
        "email_verified": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_login": datetime.now(timezone.utc).isoformat()
    }
    
    await db.registered_users.insert_one(user_doc)
    
    # Clean up OTP
    del email_otp_storage[email]
    
    # Generate long-lived token (30 days)
    token = jwt.encode(
        {
            "sub": user_id,
            "reg_id": registration_id,
            "email": email,
            "name": stored["name"],
            "type": "registered",
            "exp": datetime.now(timezone.utc) + timedelta(days=30)
        },
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )
    
    logger.info(f"New user registered: {email} -> {registration_id}")
    
    return {
        "success": True,
        "message": "Account created successfully!",
        "token": token,
        "user": {
            "id": user_id,
            "registration_id": registration_id,
            "email": email,
            "name": stored["name"],
            "phone": stored.get("phone")
        },
        "mode": "registered",
        "note": "You can now access all free portals without login!"
    }

# ============ LOGIN MODE (Email OTP - Existing Users) ============

@router.post("/login/send-otp")
async def login_send_otp(request: LoginRequest):
    """
    Send login OTP to existing user's email.
    Uses cached email for quick re-login.
    """
    global db
    email = request.email.lower().strip()
    
    # Check if user exists
    user = await db.registered_users.find_one({"email": email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Email not registered. Please sign up first.")
    
    # Generate and store OTP
    otp = generate_otp()
    email_otp_storage[f"login_{email}"] = {
        "otp": otp,
        "user_id": user["id"],
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
        "attempts": 0
    }
    
    # Send email OTP
    email_sent = await send_email_otp(email, otp, purpose="login")
    
    response = {
        "success": True,
        "message": "Login code sent to your email",
        "email": email,
        "name": user.get("name"),
        "expires_in": 600,
        "mode": "login"
    }
    
    if not email_sent:
        response["mock_otp"] = otp
        response["note"] = "Email service unavailable, use test OTP"
    
    return response

@router.post("/login/verify-otp")
async def login_verify_otp(request: EmailOTPVerify):
    """
    Verify login OTP and return auth token.
    """
    global db
    email = request.email.lower().strip()
    otp = request.otp.strip()
    otp_key = f"login_{email}"
    
    # Check stored OTP
    stored = email_otp_storage.get(otp_key)
    if not stored:
        raise HTTPException(status_code=400, detail="OTP not found. Please request a new one.")
    
    if stored["attempts"] >= 3:
        del email_otp_storage[otp_key]
        raise HTTPException(status_code=400, detail="Too many attempts. Please request a new OTP.")
    
    if datetime.now(timezone.utc) > stored["expires_at"]:
        del email_otp_storage[otp_key]
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
    
    stored["attempts"] += 1
    
    if stored["otp"] != otp:
        remaining = 3 - stored["attempts"]
        raise HTTPException(status_code=400, detail=f"Invalid OTP. {remaining} attempts remaining.")
    
    # Get user
    user = await db.registered_users.find_one({"id": stored["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update last login
    await db.registered_users.update_one(
        {"id": user["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Clean up OTP
    del email_otp_storage[otp_key]
    
    # Generate token
    token = jwt.encode(
        {
            "sub": user["id"],
            "reg_id": user["registration_id"],
            "email": email,
            "name": user.get("name"),
            "type": "registered",
            "exp": datetime.now(timezone.utc) + timedelta(days=30)
        },
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )
    
    return {
        "success": True,
        "message": f"Welcome back, {user.get('name')}!",
        "token": token,
        "user": {
            "id": user["id"],
            "registration_id": user["registration_id"],
            "email": email,
            "name": user.get("name"),
            "phone": user.get("phone")
        },
        "mode": "registered"
    }

# ============ USER PROFILE ============

@router.get("/me")
async def get_current_user(authorization: str = Header(None)):
    """Get current logged-in user profile"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        user_type = payload.get("type")
        
        if user_type == "guest":
            return {
                "authenticated": True,
                "type": "guest",
                "phone": payload.get("phone"),
                "expires_at": datetime.fromtimestamp(payload.get("exp")).isoformat()
            }
        
        elif user_type == "registered":
            global db
            user = await db.registered_users.find_one({"id": payload.get("sub")}, {"_id": 0})
            
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            return {
                "authenticated": True,
                "type": "registered",
                "user": {
                    "id": user["id"],
                    "registration_id": user["registration_id"],
                    "email": user["email"],
                    "name": user.get("name"),
                    "phone": user.get("phone"),
                    "email_verified": user.get("email_verified", True)
                }
            }
        
        else:
            raise HTTPException(status_code=401, detail="Invalid token type")
    
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
            "expires_at": datetime.fromtimestamp(payload.get("exp")).isoformat()
        }
    
    except jwt.ExpiredSignatureError:
        return {"valid": False, "reason": "Token expired"}
    except jwt.InvalidTokenError:
        return {"valid": False, "reason": "Invalid token"}

# ============ LOGOUT ============

@router.post("/logout")
async def logout():
    """
    Logout endpoint (client-side token removal).
    For registered users, token remains valid but client removes it.
    """
    return {
        "success": True,
        "message": "Logged out successfully",
        "note": "Please remove the token from local storage"
    }
