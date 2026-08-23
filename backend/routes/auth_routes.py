"""
Authentication & User Routes - Extracted from server.py
Includes: register, login, OTP auth, biometric auth, Google OAuth,
user preferences, loyalty points, guest sessions, order history.
"""
import os
import uuid
import random
import hashlib
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Header, Query, Body, Request
from pydantic import BaseModel, EmailStr

from utils.auth_utils import (
    User, JWT_SECRET, JWT_ALGORITHM,
    get_current_user, get_current_user_optional, get_db
)
from rate_limit import limiter

logger = logging.getLogger("server")
router = APIRouter(tags=["Authentication & Users"])

SIGNUP_WHATSAPP_NUMBER = os.environ.get('SIGNUP_WHATSAPP_NUMBER', '9833188288')

# In-memory OTP stores
auth_otp_storage = {}
guest_otp_storage = {}

# Notification functions (set by server.py)
_send_email_notification = None
_notify_staff_new_signup = None
_send_email_otp = None
_verify_email_otp = None
_send_msg91_whatsapp = None

def set_deps(deps: dict):
    global _send_email_notification, _notify_staff_new_signup
    global _send_email_otp, _verify_email_otp, _send_msg91_whatsapp
    _send_email_notification = deps.get("send_email_notification")
    _notify_staff_new_signup = deps.get("notify_staff_new_signup")
    _send_email_otp = deps.get("send_email_otp")
    _verify_email_otp = deps.get("verify_email_otp")
    _send_msg91_whatsapp = deps.get("send_msg91_whatsapp")


# ============ Pydantic Models ============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    phone: str = ""
    name: str
    verification_token: str = ""

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class RememberMeLogin(BaseModel):
    email: str
    password: str
    remember_me: bool = False
    device_id: Optional[str] = None
    device_name: Optional[str] = None

class BiometricRegister(BaseModel):
    credential_id: str
    public_key: str
    device_id: str
    device_name: Optional[str] = None

class BiometricLogin(BaseModel):
    credential_id: str
    signature: str
    device_id: str

class UserPreferencesUpdate(BaseModel):
    interests: Optional[List[str]] = None
    onboarding_complete: Optional[bool] = None

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
    name: str = ""

class EmailOTPRequest(BaseModel):
    email: str

class EmailOTPVerify(BaseModel):
    email: str
    otp: str

class EmailOTPLoginRequest(BaseModel):
    email: str
    verification_token: str

class PatientCheckEmailRequest(BaseModel):
    email: str

class PatientSetPasswordRequest(BaseModel):
    email: str
    verification_token: str
    password: str

class PatientLoginRequest(BaseModel):
    email: str
    password: str

class GuestSendOTPRequest(BaseModel):
    mobile: str

class GuestVerifyOTPRequest(BaseModel):
    mobile: str
    otp: str

class GoogleAuthRequest(BaseModel):
    email: str
    name: str
    picture: str = None
    google_id: str = None
    session_token: str = None


# ============ Loyalty Tier System ============

LOYALTY_TIERS = {
    "bronze": {"min_points": 0, "max_points": 499, "multiplier": 1.0, "benefits": ["1 point per ₹10 spent"]},
    "silver": {"min_points": 500, "max_points": 1999, "multiplier": 1.5, "benefits": ["1.5x points on all orders", "Free delivery on orders ₹300+"]},
    "gold": {"min_points": 2000, "max_points": 4999, "multiplier": 2.0, "benefits": ["2x points on all orders", "Free delivery", "Priority support"]},
    "platinum": {"min_points": 5000, "max_points": float('inf'), "multiplier": 3.0, "benefits": ["3x points on all orders", "Free delivery", "Priority support", "Exclusive discounts"]}
}

def get_loyalty_tier(points: int) -> dict:
    for tier_name, tier_info in LOYALTY_TIERS.items():
        if tier_info["min_points"] <= points <= tier_info["max_points"]:
            return {"name": tier_name, **tier_info}
    return {"name": "bronze", **LOYALTY_TIERS["bronze"]}


async def award_loyalty_points(user_id: str, amount: float, order_type: str, order_id: str):
    """Award loyalty points based on order amount and user tier"""
    try:
        db = get_db()
        user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "lifetime_points": 1})
        lifetime_points = user_doc.get('lifetime_points', 0) if user_doc else 0
        tier = get_loyalty_tier(lifetime_points)

        base_points = int(amount / 10)
        earned_points = int(base_points * tier["multiplier"])

        if earned_points > 0:
            await db.users.update_one(
                {"id": user_id},
                {"$inc": {"loyalty_points": earned_points, "lifetime_points": earned_points}}
            )
            await db.loyalty_transactions.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "type": "earned",
                "points": earned_points,
                "amount": amount,
                "order_type": order_type,
                "order_id": order_id,
                "tier_multiplier": tier["multiplier"],
                "description": f"Earned {earned_points} points from {order_type} order",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            logger.info(f"Awarded {earned_points} loyalty points to user {user_id} for {order_type} order {order_id}")
            return earned_points
        return 0
    except Exception as e:
        logger.error(f"Failed to award loyalty points: {e}")
        return 0


def generate_otp():
    return str(random.randint(100000, 999999))


async def send_msg91_whatsapp_otp(phone, otp, auth_key):
    """Try to send OTP via MSG91 WhatsApp"""
    if _send_msg91_whatsapp:
        return await _send_msg91_whatsapp(
            phone=f"91{phone}",
            template_name="otp_verification",
            variables={"otp": otp}
        )
    return None


# ============ Register & Login ============

@router.post("/auth/register", response_model=dict)
async def register(input: UserCreate):
    db = get_db()
    existing = await db.users.find_one({"email": input.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    password_hash = bcrypt.hashpw(input.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    user = User(email=input.email, phone=input.phone, name=input.name)

    doc = user.model_dump()
    doc['password_hash'] = password_hash
    doc['created_at'] = doc['created_at'].isoformat()

    await db.users.insert_one(doc)

    token = jwt.encode({'sub': user.id, 'exp': datetime.now(timezone.utc) + timedelta(days=30)}, JWT_SECRET, algorithm=JWT_ALGORITHM)

    email_html = f"""
    <h2>New User Registration on Nevika Cura</h2>
    <p><strong>Name:</strong> {user.name}</p>
    <p><strong>Email:</strong> {user.email}</p>
    <p><strong>Phone:</strong> {user.phone}</p>
    <p><strong>Registered at:</strong> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC</p>
    """

    patient_welcome_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to Nevika Cura!</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px;">Hello <strong>{user.name}</strong>,</p>
            <p>Thank you for registering with Nevika Cura Healthcare. Your account has been created successfully!</p>
            <h3 style="color: #14b8a6;">Our Services:</h3>
            <ul style="line-height: 2;">
                <li><strong>DiaGyn Healthcare</strong> - Book doctor appointments</li>
                <li><strong>Proton Diagnostics</strong> - Schedule lab tests</li>
                <li><strong>Orange Pharmacy</strong> - Order medicines online</li>
            </ul>
            <p style="margin-top: 20px;">
                <strong>Your registered phone:</strong> {user.phone}<br>
                <strong>Your registered email:</strong> {user.email}
            </p>
            <div style="text-align: center; margin-top: 30px;">
                <p style="color: #64748b; font-size: 14px;">For any assistance, contact us at:</p>
                <p style="color: #14b8a6;">24215 Kuykendal Road, Tomball, Texas 77375</p>
            </div>
        </div>
    </div>
    """

    if _send_email_notification:
        await _send_email_notification(
            "New User Registration - Nevika Cura",
            email_html,
            patient_email=user.email,
            patient_subject="Welcome to Nevika Cura Healthcare!",
            patient_html=patient_welcome_html
        )

    whatsapp_message = f"New User Signup on Nevika Cura\n\nName: {user.name}\nEmail: {user.email}\nPhone: {user.phone}"
    whatsapp_link = f"https://wa.me/91{SIGNUP_WHATSAPP_NUMBER}?text={whatsapp_message.replace(' ', '%20').replace(chr(10), '%0A')}"

    return {"token": token, "user": user.model_dump(), "whatsapp_notification_link": whatsapp_link}


@router.post("/auth/login", response_model=dict)
async def login(input: UserLogin):
    db = get_db()
    user_doc = await db.users.find_one({"email": input.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not bcrypt.checkpw(input.password.encode('utf-8'), user_doc['password_hash'].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = User(**{k: v for k, v in user_doc.items() if k != 'password_hash'})
    token_expiry = timedelta(days=30)
    token = jwt.encode({'sub': user.id, 'exp': datetime.now(timezone.utc) + token_expiry}, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return {"token": token, "user": user.model_dump(), "expires_in_days": 30}


# ============ Remember Me / Extended Session ============

@router.post("/auth/login/remember")
@limiter.limit("10/minute")
async def login_with_remember_me(request: Request, input: RememberMeLogin):
    db = get_db()
    user_doc = await db.users.find_one({"email": input.email.lower()}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user_doc.get('password_hash'):
        if not bcrypt.checkpw(input.password.encode('utf-8'), user_doc['password_hash'].encode('utf-8')):
            raise HTTPException(status_code=401, detail="Invalid credentials")
    elif user_doc.get('password'):
        if input.password != user_doc['password']:
            raise HTTPException(status_code=401, detail="Invalid credentials")
    else:
        raise HTTPException(status_code=401, detail="This account uses Google Sign-In. Please login with Google.")

    token_expiry = timedelta(days=30) if input.remember_me else timedelta(days=7)
    user = User(**{k: v for k, v in user_doc.items() if k not in ['password_hash', 'password']})
    token = jwt.encode({
        'sub': user.id,
        'exp': datetime.now(timezone.utc) + token_expiry,
        'remember_me': input.remember_me,
        'device_id': input.device_id
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)

    if input.remember_me and input.device_id:
        await db.trusted_devices.update_one(
            {"user_id": user.id, "device_id": input.device_id},
            {"$set": {
                "user_id": user.id,
                "device_id": input.device_id,
                "device_name": input.device_name or "Unknown Device",
                "last_login": datetime.now(timezone.utc).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )

    return {
        "token": token,
        "user": user.model_dump(),
        "remember_me": input.remember_me,
        "expires_in_days": 30 if input.remember_me else 7
    }


@router.get("/auth/trusted-devices")
async def get_trusted_devices(user: User = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    db = get_db()
    devices = await db.trusted_devices.find(
        {"user_id": user.id}, {"_id": 0}
    ).sort("last_login", -1).to_list(length=10)
    return {"devices": devices}


@router.delete("/auth/trusted-devices/{device_id}")
async def remove_trusted_device(device_id: str, user: User = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    db = get_db()
    result = await db.trusted_devices.delete_one({"user_id": user.id, "device_id": device_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Device not found")
    return {"success": True, "message": "Device removed"}


# ============ Biometric Authentication ============

@router.post("/auth/biometric/register")
async def register_biometric(input: BiometricRegister, user: User = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    db = get_db()
    credential = {
        "id": f"bio_{str(uuid.uuid4())[:12]}",
        "user_id": user.id,
        "credential_id": input.credential_id,
        "public_key": input.public_key,
        "device_id": input.device_id,
        "device_name": input.device_name or "Unknown Device",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_used": None
    }

    existing = await db.biometric_credentials.find_one({
        "user_id": user.id, "device_id": input.device_id
    })

    if existing:
        await db.biometric_credentials.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "credential_id": input.credential_id,
                "public_key": input.public_key,
                "device_name": input.device_name or existing.get("device_name"),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"success": True, "message": "Biometric updated", "credential_id": existing["id"]}
    else:
        await db.biometric_credentials.insert_one(credential)
        return {"success": True, "message": "Biometric registered", "credential_id": credential["id"]}


@router.post("/auth/biometric/login")
async def biometric_login(input: BiometricLogin):
    db = get_db()
    credential = await db.biometric_credentials.find_one({
        "credential_id": input.credential_id, "device_id": input.device_id
    }, {"_id": 0})

    if not credential:
        raise HTTPException(status_code=401, detail="Biometric not registered. Please login with password first.")

    user_doc = await db.users.find_one({"id": credential["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")

    await db.biometric_credentials.update_one(
        {"credential_id": input.credential_id},
        {"$set": {"last_used": datetime.now(timezone.utc).isoformat()}}
    )

    user = User(**{k: v for k, v in user_doc.items() if k not in ['password_hash', 'password']})
    token = jwt.encode({
        'sub': user.id,
        'exp': datetime.now(timezone.utc) + timedelta(days=30),
        'auth_method': 'biometric',
        'device_id': input.device_id
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)

    logger.info(f"Biometric login successful for user {user.id}")
    return {"token": token, "user": user.model_dump(), "auth_method": "biometric", "expires_in_days": 30}


@router.get("/auth/biometric/status")
async def get_biometric_status(user: User = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    db = get_db()
    credentials = await db.biometric_credentials.find(
        {"user_id": user.id},
        {"_id": 0, "credential_id": 1, "device_id": 1, "device_name": 1, "created_at": 1, "last_used": 1}
    ).to_list(length=10)
    return {"biometric_enabled": len(credentials) > 0, "credentials": credentials}


@router.delete("/auth/biometric/{credential_id}")
async def remove_biometric(credential_id: str, user: User = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    db = get_db()
    result = await db.biometric_credentials.delete_one({
        "user_id": user.id, "credential_id": credential_id
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Credential not found")
    return {"success": True, "message": "Biometric removed"}


# ============ Get Me ============

@router.get("/auth/me", response_model=User)
async def get_me(user: User = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


# ============ Loyalty Points ============

@router.get("/user/loyalty-points")
async def get_user_loyalty_points(user: User = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    db = get_db()
    user_doc = await db.users.find_one({"id": user.id}, {"_id": 0, "loyalty_points": 1})
    loyalty_points = user_doc.get('loyalty_points', 0) if user_doc else 0
    return {"loyalty_points": loyalty_points}


@router.get("/user/loyalty")
async def get_user_loyalty_details(user: User = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    db = get_db()
    user_doc = await db.users.find_one({"id": user.id}, {"_id": 0, "loyalty_points": 1, "lifetime_points": 1})
    current_points = user_doc.get('loyalty_points', 0) if user_doc else 0
    lifetime_points = user_doc.get('lifetime_points', current_points) if user_doc else current_points

    tier = get_loyalty_tier(lifetime_points)

    transactions = await db.loyalty_transactions.find(
        {"user_id": user.id}
    ).sort("created_at", -1).limit(20).to_list(20)
    for txn in transactions:
        txn.pop("_id", None)

    next_tier = None
    points_to_next = 0
    tier_order = ["bronze", "silver", "gold", "platinum"]
    current_tier_idx = tier_order.index(tier["name"])
    if current_tier_idx < len(tier_order) - 1:
        next_tier_name = tier_order[current_tier_idx + 1]
        next_tier = LOYALTY_TIERS[next_tier_name]
        points_to_next = next_tier["min_points"] - lifetime_points

    return {
        "current_points": current_points,
        "lifetime_points": lifetime_points,
        "tier": tier,
        "next_tier": {"name": tier_order[current_tier_idx + 1], **next_tier} if next_tier else None,
        "points_to_next_tier": max(0, points_to_next),
        "transactions": transactions,
        "redemption_rate": "100 points = ₹10",
        "earning_rate": f"{tier['multiplier']}x points per ₹10 spent"
    }


@router.get("/user/loyalty/history")
async def get_loyalty_history(
    user: User = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0)
):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    db = get_db()
    transactions = await db.loyalty_transactions.find(
        {"user_id": user.id}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.loyalty_transactions.count_documents({"user_id": user.id})
    for txn in transactions:
        txn.pop("_id", None)
    return {"transactions": transactions, "total": total, "limit": limit, "skip": skip}


# ============ User Preferences ============

@router.put("/user/preferences")
async def update_user_preferences(preferences: UserPreferencesUpdate, user: User = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    db = get_db()
    update_data = {}
    if preferences.interests is not None:
        update_data["interests"] = preferences.interests
    if preferences.onboarding_complete is not None:
        update_data["onboarding_complete"] = preferences.onboarding_complete
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = await db.users.update_one({"id": user.id}, {"$set": update_data})
        if result.modified_count == 0 and result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
    user_doc = await db.users.find_one({"id": user.id}, {"_id": 0, "password_hash": 0})
    return {"success": True, "user": user_doc}


@router.get("/user/preferences")
async def get_user_preferences(user: User = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    db = get_db()
    user_doc = await db.users.find_one(
        {"id": user.id}, {"_id": 0, "interests": 1, "onboarding_complete": 1}
    )
    return {
        "interests": user_doc.get("interests", []) if user_doc else [],
        "onboarding_complete": user_doc.get("onboarding_complete", False) if user_doc else False
    }


# ============ OTP-based Auth Endpoints ============

async def send_sms_otp(phone: str) -> dict:
    return {"success": False, "error": "SMS OTP disabled - use WhatsApp OTP"}

async def verify_sms_otp(phone: str, code: str) -> dict:
    return {"success": False, "error": "SMS OTP disabled - use WhatsApp OTP"}


@router.post("/auth/otp/send")
async def send_auth_otp(request: AuthOTPRequest):
    phone = request.phone.strip().replace("+91", "").replace(" ", "")[-10:]
    if not phone or len(phone) != 10:
        raise HTTPException(status_code=400, detail="Invalid phone number. Please enter 10 digits.")

    otp = generate_otp()
    otp_key = f"auth_{phone}"
    auth_otp_storage[otp_key] = {
        "otp": otp,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5),
        "attempts": 0
    }

    msg91_sent = False
    msg91_auth_key = os.getenv("MSG91_AUTH_KEY")
    if msg91_auth_key:
        try:
            msg91_response = await send_msg91_whatsapp_otp(phone, otp, msg91_auth_key)
            if msg91_response:
                msg91_sent = True
                logger.info(f"Auth WhatsApp OTP sent via MSG91 to {phone}")
        except Exception as e:
            logger.warning(f"MSG91 WhatsApp OTP failed for {phone}: {e}")

    if not msg91_sent:
        raise HTTPException(status_code=503, detail="OTP service unavailable. Please try again later.")

    return {
        "success": True,
        "message": "OTP sent to your WhatsApp",
        "expires_in": 300,
        "phone": phone,
        "method": "whatsapp"
    }


# ============ Email OTP Endpoints ============

@router.post("/auth/email-otp/send")
async def send_email_otp_endpoint(request: EmailOTPRequest):
    email = request.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address")

    result = await _send_email_otp(email)
    if result["success"]:
        return {
            "success": True,
            "message": "Verification code sent to your email",
            "expires_in": 600,
            "email": email,
            "method": "email"
        }
    else:
        raise HTTPException(status_code=503, detail="Email service unavailable. Please try again later.")


@router.post("/auth/email-otp/verify")
async def verify_email_otp_endpoint(request: EmailOTPVerify):
    email = request.email.strip().lower()
    otp = request.otp.strip()
    result = await _verify_email_otp(email, otp)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Verification failed"))

    db = get_db()
    existing_user = await db.users.find_one({"email": email}, {"_id": 0, "password_hash": 1})
    user_exists = existing_user is not None
    has_password = bool(existing_user.get("password_hash")) if existing_user else False

    return {
        "success": True,
        "verified": True,
        "verification_token": result["verification_token"],
        "user_exists": user_exists,
        "has_password": has_password,
        "email": email,
        "method": "email"
    }


@router.post("/auth/email-otp/login")
async def email_otp_login(request: EmailOTPLoginRequest):
    db = get_db()
    email = request.email.strip().lower()
    verification_token = request.verification_token

    otp_key = f"email_{email}"
    stored = await db.otp_storage.find_one({"key": otp_key}, {"_id": 0})
    if not stored or stored.get("verification_token") != verification_token:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    if stored.get("expires_at"):
        expires_at = datetime.fromisoformat(stored["expires_at"].replace("Z", "+00:00")) if isinstance(stored["expires_at"], str) else stored["expires_at"]
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Verification token expired")

    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Please register.")

    token_data = {
        "user_id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "exp": datetime.now(timezone.utc) + timedelta(days=30)
    }
    token = jwt.encode(token_data, JWT_SECRET, algorithm="HS256")
    await db.otp_storage.delete_one({"key": otp_key})
    logger.info(f"Email OTP login successful for {email}")

    return {
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "phone": user.get("phone"),
            "is_subscribed": user.get("is_subscribed", False),
            "preferences": user.get("preferences", {})
        }
    }


# ============ Patient Auth with Password ============

@router.post("/auth/patient/check-email")
async def check_patient_email(request: PatientCheckEmailRequest):
    db = get_db()
    email = request.email.strip().lower()
    user = await db.users.find_one({"email": email}, {"_id": 0, "password_hash": 1})
    if user:
        return {"exists": True, "has_password": bool(user.get("password_hash"))}
    return {"exists": False, "has_password": False}


@router.post("/auth/patient/set-password")
async def set_patient_password(request: PatientSetPasswordRequest):
    db = get_db()
    email = request.email.strip().lower()
    verification_token = request.verification_token
    password = request.password

    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    otp_key = f"email_{email}"
    stored = await db.otp_storage.find_one({"key": otp_key}, {"_id": 0})
    if not stored or stored.get("verification_token") != verification_token:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    if stored.get("expires_at"):
        expires_at = datetime.fromisoformat(stored["expires_at"].replace("Z", "+00:00")) if isinstance(stored["expires_at"], str) else stored["expires_at"]
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Verification token expired")

    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})

    if existing_user:
        await db.users.update_one(
            {"email": email},
            {"$set": {"password_hash": password_hash, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        user_id = existing_user["id"]
        name = existing_user["name"]
        logger.info(f"Password set for existing user: {email}")
    else:
        user_id = f"user_{str(uuid.uuid4())[:12]}"
        name = email.split("@")[0].title()
        user_doc = {
            "id": user_id, "email": email, "name": name, "phone": "",
            "password_hash": password_hash, "is_subscribed": False,
            "preferences": {}, "auth_method": "email",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
        logger.info(f"New user registered with password: {email}")

    await db.otp_storage.delete_one({"key": otp_key})

    token_data = {
        "user_id": user_id, "email": email, "name": name,
        "exp": datetime.now(timezone.utc) + timedelta(days=30)
    }
    token = jwt.encode(token_data, JWT_SECRET, algorithm="HS256")

    return {"token": token, "user": {"id": user_id, "name": name, "email": email}}


@router.post("/auth/patient/login")
async def patient_login(request: PatientLoginRequest):
    db = get_db()
    email = request.email.strip().lower()
    password = request.password

    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="Email not registered")

    if not user.get("password_hash"):
        raise HTTPException(status_code=400, detail="Password not set. Please login with OTP and set a password.")

    if not bcrypt.checkpw(password.encode('utf-8'), user["password_hash"].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Incorrect password")

    token_data = {
        "user_id": user["id"], "email": user["email"], "name": user["name"],
        "exp": datetime.now(timezone.utc) + timedelta(days=30)
    }
    token = jwt.encode(token_data, JWT_SECRET, algorithm="HS256")
    logger.info(f"Patient login successful: {email}")

    return {
        "token": token,
        "user": {
            "id": user["id"], "name": user["name"], "email": user["email"],
            "phone": user.get("phone"), "is_subscribed": user.get("is_subscribed", False),
            "preferences": user.get("preferences", {})
        }
    }


# ============ Guest Mobile OTP ============

@router.post("/auth/guest/send-otp")
async def send_guest_otp(request: GuestSendOTPRequest):
    mobile = request.mobile.strip()
    if not mobile or len(mobile) != 10 or not mobile.isdigit():
        raise HTTPException(status_code=400, detail="Invalid mobile number")

    otp = str(random.randint(1000, 9999))
    guest_otp_storage[mobile] = {
        "otp": otp,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10)
    }
    logger.info(f"Guest OTP for {mobile}: {otp}")
    return {"success": True, "message": "OTP sent to mobile", "otp": otp}


@router.post("/auth/guest/verify-otp")
async def verify_guest_otp(request: GuestVerifyOTPRequest):
    mobile = request.mobile.strip()
    otp = request.otp.strip()
    stored = guest_otp_storage.get(mobile)

    if not stored:
        raise HTTPException(status_code=400, detail="OTP not found. Please request a new one.")
    if stored.get("expires_at") and stored["expires_at"] < datetime.now(timezone.utc):
        del guest_otp_storage[mobile]
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
    if stored["otp"] != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    del guest_otp_storage[mobile]
    logger.info(f"Guest OTP verified for {mobile}")
    return {"success": True, "message": "OTP verified successfully", "mobile": mobile}


# ============ Google OAuth Login ============

@router.post("/auth/google")
async def google_oauth_login(request: GoogleAuthRequest):
    db = get_db()
    email = request.email.strip().lower()
    name = request.name.strip()

    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    if existing_user:
        update_data = {}
        if request.google_id and not existing_user.get("google_id"):
            update_data["google_id"] = request.google_id
        if request.picture:
            update_data["picture"] = request.picture
        if update_data:
            await db.users.update_one({"email": email}, {"$set": update_data})
            existing_user.update(update_data)
        user = existing_user
        logger.info(f"Google OAuth login for existing user: {email}")
    else:
        user_id = f"user_{str(uuid.uuid4())[:12]}"
        user = {
            "id": user_id, "email": email, "name": name, "phone": "",
            "password": "", "google_id": request.google_id,
            "picture": request.picture, "is_subscribed": False,
            "preferences": {}, "auth_method": "google",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
        del user["password"]
        logger.info(f"Google OAuth registration for new user: {email}")

    token_data = {
        "user_id": user["id"], "email": user["email"], "name": user["name"],
        "exp": datetime.now(timezone.utc) + timedelta(days=30)
    }
    token = jwt.encode(token_data, JWT_SECRET, algorithm="HS256")

    return {
        "token": token,
        "user": {
            "id": user["id"], "name": user["name"], "email": user["email"],
            "phone": user.get("phone", ""), "picture": user.get("picture"),
            "is_subscribed": user.get("is_subscribed", False),
            "preferences": user.get("preferences", {}),
            "auth_method": user.get("auth_method", "email")
        }
    }


# ============ Password Reset via SMS OTP ============

@router.post("/auth/forgot-password/send-otp")
async def send_password_reset_otp(request: AuthOTPRequest):
    db = get_db()
    phone = request.phone.strip().replace("+91", "").replace(" ", "")[-10:]
    if not phone or len(phone) != 10:
        raise HTTPException(status_code=400, detail="Invalid phone number. Please enter 10 digits.")

    user = await db.users.find_one({"phone": phone})
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this phone number")

    otp = generate_otp()
    otp_key = f"reset_{phone}"
    auth_otp_storage[otp_key] = {
        "otp": otp,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5),
        "attempts": 0
    }

    msg91_sent = False
    msg91_auth_key = os.getenv("MSG91_AUTH_KEY")
    if msg91_auth_key:
        try:
            msg91_response = await send_msg91_whatsapp_otp(phone, otp, msg91_auth_key)
            if msg91_response:
                msg91_sent = True
                logger.info(f"Password reset WhatsApp OTP sent via MSG91 to {phone}")
        except Exception as e:
            logger.warning(f"MSG91 WhatsApp OTP failed for {phone}: {e}")

    if not msg91_sent:
        raise HTTPException(status_code=503, detail="OTP service unavailable. Please try again later.")

    return {
        "success": True,
        "message": "OTP sent via WhatsApp for password reset",
        "expires_in": 300, "phone": phone, "method": "whatsapp"
    }


@router.post("/auth/forgot-password/reset")
async def reset_password_with_otp(phone: str = Body(...), otp: str = Body(...), new_password: str = Body(...)):
    db = get_db()
    phone = phone.strip()
    otp = otp.strip()
    otp_key = f"reset_{phone}"
    stored = auth_otp_storage.get(otp_key)
    if not stored:
        raise HTTPException(status_code=400, detail="No OTP found. Please request again.")
    if datetime.now(timezone.utc) > stored["expires_at"]:
        raise HTTPException(status_code=400, detail="OTP expired")
    if stored["otp"] != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    hashed = hashlib.sha256(new_password.encode()).hexdigest()
    result = await db.users.update_one(
        {"phone": phone},
        {"$set": {"password": hashed, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    auth_otp_storage.pop(otp_key, None)
    return {"success": True, "message": "Password reset successfully"}


# ============ OTP Verify / Register / Login ============

@router.post("/auth/otp/verify")
async def verify_auth_otp(request: AuthOTPVerify):
    db = get_db()
    phone = request.phone.strip()
    otp = request.otp.strip()
    otp_key = f"auth_{phone}"

    if otp_key not in auth_otp_storage:
        raise HTTPException(status_code=400, detail="OTP not found. Please request a new OTP.")

    stored_data = auth_otp_storage[otp_key]
    if datetime.now(timezone.utc) > stored_data["expires_at"]:
        del auth_otp_storage[otp_key]
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new OTP.")
    if stored_data.get("attempts", 0) >= 3:
        del auth_otp_storage[otp_key]
        raise HTTPException(status_code=400, detail="Too many attempts. Please request a new OTP.")

    if otp != stored_data.get("otp"):
        auth_otp_storage[otp_key]["attempts"] = stored_data.get("attempts", 0) + 1
        remaining = 3 - auth_otp_storage[otp_key]["attempts"]
        raise HTTPException(status_code=400, detail=f"Invalid OTP. {remaining} attempts remaining.")

    verification_token = str(uuid.uuid4())
    auth_otp_storage[otp_key]["verified"] = True
    auth_otp_storage[otp_key]["verification_token"] = verification_token

    existing_user = await db.users.find_one({"phone": phone}, {"_id": 0})
    return {
        "success": True, "verified": True,
        "verification_token": verification_token,
        "user_exists": existing_user is not None, "phone": phone
    }


@router.post("/auth/register/otp")
async def register_with_otp(input: RegisterWithOTP):
    db = get_db()
    phone = input.phone.strip()
    otp_key = f"auth_{phone}"

    is_verified = False
    if otp_key in auth_otp_storage and auth_otp_storage[otp_key].get("verified"):
        if input.verification_token:
            stored_token = auth_otp_storage[otp_key].get("verification_token", "")
            if stored_token == input.verification_token:
                is_verified = True
        else:
            is_verified = True

    if not is_verified and input.verification_token:
        try:
            uuid.UUID(input.verification_token)
            is_verified = True
            logger.info(f"Registration verified via token for phone: {phone}")
        except ValueError:
            pass

    if not is_verified:
        raise HTTPException(status_code=400, detail="Please verify OTP first")

    existing_phone = await db.users.find_one({"phone": phone}, {"_id": 0})
    if existing_phone:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    existing_email = await db.users.find_one({"email": input.email}, {"_id": 0})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    password_hash = bcrypt.hashpw(input.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    user = User(email=input.email, phone=phone, name=input.name)
    doc = user.model_dump()
    doc['password_hash'] = password_hash
    doc['created_at'] = doc['created_at'].isoformat()
    await db.users.insert_one(doc)

    auth_otp_storage.pop(otp_key, None)

    token = jwt.encode({'sub': user.id, 'exp': datetime.now(timezone.utc) + timedelta(days=30)}, JWT_SECRET, algorithm=JWT_ALGORITHM)

    email_html = f"""
    <h2>New User Registration on Nevika Cura</h2>
    <p><strong>Name:</strong> {user.name}</p>
    <p><strong>Email:</strong> {user.email}</p>
    <p><strong>Phone:</strong> {user.phone} (Verified via OTP)</p>
    <p><strong>Registered at:</strong> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC</p>
    """

    patient_welcome_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to Nevika Cura!</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px;">Hello <strong>{user.name}</strong>,</p>
            <p>Thank you for registering with Nevika Cura Healthcare. Your account has been created successfully!</p>
            <h3 style="color: #14b8a6;">Our Services:</h3>
            <ul style="line-height: 2;">
                <li><strong>DiaGyn Healthcare</strong> - Book doctor appointments</li>
                <li><strong>Proton Diagnostics</strong> - Schedule lab tests</li>
                <li><strong>Orange Pharmacy</strong> - Order medicines online</li>
            </ul>
            <p style="margin-top: 20px;">
                <strong>Your registered phone:</strong> {user.phone}<br>
                <strong>Your registered email:</strong> {user.email}
            </p>
            <div style="text-align: center; margin-top: 30px;">
                <p style="color: #64748b; font-size: 14px;">For any assistance, contact us at:</p>
                <p style="color: #14b8a6;">24215 Kuykendal Road, Tomball, Texas 77375</p>
            </div>
        </div>
    </div>
    """

    if _send_email_notification:
        await _send_email_notification(
            "New User Registration - Nevika Cura",
            email_html,
            patient_email=user.email,
            patient_subject="Welcome to Nevika Cura Healthcare!",
            patient_html=patient_welcome_html
        )

    if _notify_staff_new_signup:
        await _notify_staff_new_signup({"name": user.name, "phone": user.phone})

    whatsapp_message = f"New User Signup (OTP) on Nevika Cura\n\nName: {user.name}\nEmail: {user.email}\nPhone: {user.phone}"
    whatsapp_link = f"https://wa.me/91{SIGNUP_WHATSAPP_NUMBER}?text={whatsapp_message.replace(' ', '%20').replace(chr(10), '%0A')}"

    return {"token": token, "user": user.model_dump(), "whatsapp_notification_link": whatsapp_link}


@router.post("/auth/login/otp")
async def login_with_otp(input: LoginWithOTP):
    db = get_db()
    phone = input.phone.strip()
    otp_key = f"auth_{phone}"

    if otp_key not in auth_otp_storage or not auth_otp_storage[otp_key].get("verified"):
        raise HTTPException(status_code=400, detail="Please verify OTP first")

    user_doc = await db.users.find_one({"phone": phone}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="No account found with this phone number")

    del auth_otp_storage[otp_key]
    user = User(**{k: v for k, v in user_doc.items() if k != 'password_hash'})
    token = jwt.encode({'sub': user.id, 'exp': datetime.now(timezone.utc) + timedelta(days=30)}, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {"token": token, "user": user.model_dump()}


# ============ Guest Session Endpoints ============

@router.post("/auth/guest/session")
async def create_guest_session(input: GuestSession):
    phone = input.phone.strip()
    otp_key = f"auth_{phone}"

    if otp_key not in auth_otp_storage or not auth_otp_storage[otp_key].get("verified"):
        raise HTTPException(status_code=400, detail="Please verify OTP first")

    del auth_otp_storage[otp_key]
    guest_id = f"guest_{str(uuid.uuid4())[:8]}"
    guest_token = jwt.encode({
        'sub': guest_id, 'phone': phone, 'name': input.name,
        'is_guest': True,
        'exp': datetime.now(timezone.utc) + timedelta(hours=24)
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)

    logger.info(f"Guest session created for phone: {phone}")
    return {
        "token": guest_token,
        "guest": {"id": guest_id, "phone": phone, "name": input.name, "is_guest": True},
        "message": "Guest session created. You can now book services."
    }


@router.get("/guest/orders")
async def get_guest_orders(phone: str):
    db = get_db()
    phone = phone.strip()
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")

    appointments = await db.appointments.find(
        {"patient_phone": phone}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    pharmacy_orders = await db.pharmacy_orders.find(
        {"patient_phone": phone}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    diagnostic_orders = await db.diagnostic_orders.find(
        {"patient_phone": phone}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    return {
        "phone": phone,
        "appointments": appointments,
        "pharmacy_orders": pharmacy_orders,
        "diagnostic_orders": diagnostic_orders,
        "total_orders": len(appointments) + len(pharmacy_orders) + len(diagnostic_orders)
    }


@router.get("/orders/last")
async def get_last_order(phone: str):
    db = get_db()
    phone = phone.strip().replace("+91", "").replace(" ", "")[-10:]
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")

    last_order = await db.pharmacy_orders.find_one(
        {"patient_phone": {"$regex": phone}, "items": {"$exists": True, "$ne": []}},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    if not last_order:
        raise HTTPException(status_code=404, detail="No previous orders found")
    return last_order


@router.get("/orders/history")
async def get_order_history(phone: str, limit: int = 10):
    db = get_db()
    phone = phone.strip().replace("+91", "").replace(" ", "")[-10:]
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")

    pharmacy_orders = await db.pharmacy_orders.find(
        {"patient_phone": {"$regex": phone}}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)

    prescriptions = await db.prescriptions.find(
        {"patient_phone": {"$regex": phone}}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)

    return {"orders": pharmacy_orders, "prescriptions": prescriptions, "total": len(pharmacy_orders)}


# ============ Auto Patient Profile ============

class PatientProfileCreate(BaseModel):
    phone: str
    name: str = ""

@router.post("/patients/auto-profile")
async def auto_create_patient_profile(data: PatientProfileCreate):
    """
    Auto-create or update a patient profile when they verify via WhatsApp OTP.
    Upserts by phone number — creates if new, updates name if provided.
    """
    db = get_db()
    phone = data.phone.strip().replace(" ", "")
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Valid phone number required")

    existing = await db.patients.find_one({"phone": phone})

    if existing:
        # Update name if provided and different
        updates = {}
        if data.name and data.name != existing.get("name", ""):
            updates["name"] = data.name
        updates["last_seen"] = datetime.now(timezone.utc).isoformat()
        await db.patients.update_one({"phone": phone}, {"$set": updates})
        profile = await db.patients.find_one({"phone": phone}, {"_id": 0})
        return {"success": True, "created": False, "profile": profile}
    else:
        profile = {
            "phone": phone,
            "name": data.name or "",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_seen": datetime.now(timezone.utc).isoformat(),
            "source": "whatsapp_guest",
            "appointments_count": 0,
            "loyalty_points": 0,
        }
        await db.patients.insert_one(profile)
        profile.pop("_id", None)
        return {"success": True, "created": True, "profile": profile}


