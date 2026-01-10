from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Header, Query
from fastapi.responses import RedirectResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import io
import asyncio
import resend
import json
from pywebpush import webpush, WebPushException

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Health check endpoint for Kubernetes liveness/readiness probes
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "nevika-cura-api"}

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"

# Resend Email Configuration
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
NOTIFICATION_EMAIL = os.environ.get('NOTIFICATION_EMAIL', 'nevikacura@gmail.com')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'Nevika Cura <onboarding@resend.dev>')
SIGNUP_WHATSAPP_NUMBER = os.environ.get('SIGNUP_WHATSAPP_NUMBER', '9833188288')

# Twilio Configuration for WhatsApp
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', '')
TWILIO_WHATSAPP_FROM = os.environ.get('TWILIO_WHATSAPP_FROM', '')  # e.g., 'whatsapp:+14155238886'

# Doctor WhatsApp Numbers for appointment notifications
DOCTOR_WHATSAPP_NUMBERS = {
    "Dr. Neha Patel": "917045266466",
    "Dr. Vikas Jha": "919930266466"
}

# VAPID Configuration for Web Push Notifications
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', '')
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '')
VAPID_CLAIMS_EMAIL = os.environ.get('VAPID_CLAIMS_EMAIL', 'nevikacura@gmail.com')

# Initialize Resend
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Initialize Twilio client
twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    try:
        from twilio.rest import Client as TwilioClient
        twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        logger.info("Twilio client initialized successfully")
    except Exception as e:
        logger.warning(f"Failed to initialize Twilio client: {e}")

async def send_whatsapp_notification(to_number: str, message: str):
    """Send WhatsApp notification using Twilio or generate wa.me link as fallback"""
    if not twilio_client or not TWILIO_WHATSAPP_FROM:
        logger.warning("Twilio not configured, generating wa.me link instead")
        # Generate wa.me link for manual sending
        encoded_msg = message.replace('\n', '%0A').replace(' ', '%20').replace('*', '')
        wa_link = f"https://wa.me/{to_number}?text={encoded_msg}"
        logger.info(f"WhatsApp link for {to_number}: {wa_link}")
        return {"type": "link", "url": wa_link}
    
    try:
        # Format numbers for WhatsApp
        whatsapp_to = f"whatsapp:+{to_number}" if not to_number.startswith("whatsapp:") else to_number
        whatsapp_from = TWILIO_WHATSAPP_FROM if TWILIO_WHATSAPP_FROM.startswith("whatsapp:") else f"whatsapp:{TWILIO_WHATSAPP_FROM}"
        
        result = await asyncio.to_thread(
            twilio_client.messages.create,
            body=message,
            from_=whatsapp_from,
            to=whatsapp_to
        )
        logger.info(f"WhatsApp message sent to {to_number}: SID={result.sid}")
        return {"type": "sent", "sid": result.sid}
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to send WhatsApp to {to_number}: {error_msg}")
        
        # If Twilio fails, generate wa.me link as fallback
        encoded_msg = message.replace('\n', '%0A').replace(' ', '%20').replace('*', '')
        wa_link = f"https://wa.me/{to_number}?text={encoded_msg}"
        logger.info(f"Fallback wa.me link: {wa_link}")
        
        # Store the notification for manual sending
        await db.pending_whatsapp.insert_one({
            "to_number": to_number,
            "message": message,
            "wa_link": wa_link,
            "error": error_msg,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {"type": "pending", "url": wa_link, "error": error_msg}

async def notify_doctor_whatsapp(doctor_name: str, appointment_details: dict, booking_type: str = "walk_in"):
    """Send WhatsApp notification to doctor about new appointment"""
    doctor_number = DOCTOR_WHATSAPP_NUMBERS.get(doctor_name)
    if not doctor_number:
        logger.warning(f"No WhatsApp number configured for {doctor_name}")
        return None
    
    # Format the message
    appointment_type = "🔴 EMERGENCY" if appointment_details.get("appointment_type") == "EMERGENCY" else "📅 Walk-in"
    time_info = appointment_details.get("time") or "No time slot (Emergency)"
    
    message = f"""*New Appointment Booked* {appointment_type}

👨‍⚕️ *Doctor:* {doctor_name}
🏥 *Clinic:* {appointment_details.get('clinic', 'N/A')}
📆 *Date:* {appointment_details.get('date', 'N/A')}
⏰ *Time:* {time_info}

*Patient Details:*
👤 Name: {appointment_details.get('patient_name', 'N/A')}
📞 Phone: {appointment_details.get('patient_phone', 'N/A')}

📝 Booked by: {appointment_details.get('booked_by', 'Staff')}

_Nevika Cura Healthcare_"""
    
    return await send_whatsapp_notification(doctor_number, message)

async def send_email_notification(subject: str, html_content: str, patient_email: str = None, patient_subject: str = None, patient_html: str = None):
    """Send email notification using Resend - to admin and optionally to patient"""
    if not RESEND_API_KEY:
        logger.warning("Resend API key not configured, skipping email notification")
        return None
    
    results = []
    
    # Send to admin
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [NOTIFICATION_EMAIL],
            "subject": subject,
            "html": html_content
        }
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Admin email sent successfully: {email.get('id')}")
        results.append({"admin": email})
    except Exception as e:
        logger.error(f"Failed to send admin email: {str(e)}")
        results.append({"admin": None})
    
    # Send to patient if email provided (with delay to avoid rate limiting)
    if patient_email:
        await asyncio.sleep(0.6)  # Wait 600ms to stay under 2 req/sec rate limit
        try:
            patient_params = {
                "from": SENDER_EMAIL,
                "to": [patient_email],
                "subject": patient_subject or subject,
                "html": patient_html or html_content
            }
            patient_result = await asyncio.to_thread(resend.Emails.send, patient_params)
            logger.info(f"Patient email sent successfully to {patient_email}: {patient_result.get('id')}")
            results.append({"patient": patient_result})
        except Exception as e:
            logger.error(f"Failed to send patient email to {patient_email}: {str(e)}")
            results.append({"patient": None})
    
    return results

# Push Notification Models
class PushSubscription(BaseModel):
    endpoint: str
    keys: dict
    user_id: Optional[str] = None

class PushNotificationPayload(BaseModel):
    title: str
    body: str
    icon: Optional[str] = "/icons/icon-192x192.png"
    badge: Optional[str] = "/icons/icon-72x72.png"
    url: Optional[str] = "/"
    tag: Optional[str] = None

async def send_push_notification(user_id: str = None, title: str = "", body: str = "", url: str = "/", tag: str = None):
    """Send push notification to subscribed users"""
    if not VAPID_PUBLIC_KEY or not VAPID_PRIVATE_KEY:
        logger.warning("VAPID keys not configured, skipping push notification")
        return None
    
    try:
        # Get subscriptions - either for specific user or all subscriptions
        query = {"user_id": user_id} if user_id else {}
        subscriptions = await db.push_subscriptions.find(query, {"_id": 0}).to_list(1000)
        
        if not subscriptions:
            logger.info(f"No push subscriptions found for query: {query}")
            return {"sent": 0, "failed": 0}
        
        sent_count = 0
        failed_count = 0
        
        payload = json.dumps({
            "title": title,
            "body": body,
            "icon": "/icons/icon-192x192.png",
            "badge": "/icons/icon-72x72.png",
            "url": url,
            "tag": tag or f"nevika-{datetime.now().timestamp()}"
        })
        
        vapid_claims = {
            "sub": f"mailto:{VAPID_CLAIMS_EMAIL}"
        }
        
        for sub in subscriptions:
            try:
                subscription_info = {
                    "endpoint": sub["endpoint"],
                    "keys": sub["keys"]
                }
                
                webpush(
                    subscription_info=subscription_info,
                    data=payload,
                    vapid_private_key=VAPID_PRIVATE_KEY,
                    vapid_claims=vapid_claims
                )
                sent_count += 1
                logger.info(f"Push notification sent to endpoint: {sub['endpoint'][:50]}...")
            except WebPushException as e:
                logger.error(f"Push notification failed: {str(e)}")
                # Remove invalid subscriptions (410 Gone or 404 Not Found)
                if e.response and e.response.status_code in [404, 410]:
                    await db.push_subscriptions.delete_one({"endpoint": sub["endpoint"]})
                    logger.info(f"Removed invalid subscription: {sub['endpoint'][:50]}...")
                failed_count += 1
            except Exception as e:
                logger.error(f"Push notification error: {str(e)}")
                failed_count += 1
        
        logger.info(f"Push notifications sent: {sent_count}, failed: {failed_count}")
        return {"sent": sent_count, "failed": failed_count}
    
    except Exception as e:
        logger.error(f"Failed to send push notifications: {str(e)}")
        return None

async def broadcast_push_notification(title: str, body: str, url: str = "/", tag: str = None):
    """Send push notification to all subscribed users"""
    return await send_push_notification(user_id=None, title=title, body=body, url=url, tag=tag)

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    phone: str
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    phone: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GuestUser(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None

class Appointment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    doctor: str
    clinic: str
    date: str
    time: str
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AppointmentCreate(BaseModel):
    doctor: str
    clinic: str
    date: str
    time: str
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None

class DiagnosticOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    tests: List[str]
    prescription_url: Optional[str] = None
    preferred_date: str
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DiagnosticOrderCreate(BaseModel):
    tests: List[str]
    prescription_url: Optional[str] = None
    preferred_date: str
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None

class PharmacyOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    medicines: List[dict]
    prescription_url: Optional[str] = None
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    delivery_address: Optional[str] = None
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PharmacyOrderCreate(BaseModel):
    medicines: List[dict]
    prescription_url: Optional[str] = None
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    delivery_address: Optional[str] = None

# OTP Models for Mock OTP verification
class OTPRequest(BaseModel):
    phone: str
    service: str  # 'diagyn', 'proton', 'pharmacy'

class OTPVerify(BaseModel):
    phone: str
    otp: str
    service: str

# In-memory OTP storage (for mock OTP - replace with Redis in production)
import random
otp_storage = {}

def generate_otp():
    """Generate a 6-digit OTP"""
    return str(random.randint(100000, 999999))

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        return None
    token = authorization.split(' ')[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('sub')
        if not user_id:
            return None
        user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        if not user_doc:
            return None
        return User(**user_doc)
    except Exception as e:
        logger.error(f"Token validation error: {str(e)}")
        return None

@api_router.post("/auth/register", response_model=dict)
async def register(input: UserCreate):
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
    
    # Send email notification for new user registration
    email_html = f"""
    <h2>🎉 New User Registration on Nevika Cura</h2>
    <p><strong>Name:</strong> {user.name}</p>
    <p><strong>Email:</strong> {user.email}</p>
    <p><strong>Phone:</strong> {user.phone}</p>
    <p><strong>Registered at:</strong> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC</p>
    """
    
    # Welcome email for the patient
    patient_welcome_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to Nevika Cura! 🎉</h1>
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
                <p style="color: #14b8a6;">📍 24215 Kuykendal Road, Tomball, Texas 77375</p>
            </div>
        </div>
    </div>
    """
    
    await send_email_notification(
        "New User Registration - Nevika Cura", 
        email_html,
        patient_email=user.email,
        patient_subject="Welcome to Nevika Cura Healthcare! 🏥",
        patient_html=patient_welcome_html
    )
    
    # Generate WhatsApp link for signup notification
    whatsapp_message = f"New User Signup on Nevika Cura\n\nName: {user.name}\nEmail: {user.email}\nPhone: {user.phone}"
    whatsapp_link = f"https://wa.me/91{SIGNUP_WHATSAPP_NUMBER}?text={whatsapp_message.replace(' ', '%20').replace(chr(10), '%0A')}"
    
    return {"token": token, "user": user.model_dump(), "whatsapp_notification_link": whatsapp_link}

@api_router.post("/auth/login", response_model=dict)
async def login(input: UserLogin):
    user_doc = await db.users.find_one({"email": input.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not bcrypt.checkpw(input.password.encode('utf-8'), user_doc['password_hash'].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = User(**{k: v for k, v in user_doc.items() if k != 'password_hash'})
    token = jwt.encode({'sub': user.id, 'exp': datetime.now(timezone.utc) + timedelta(days=30)}, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return {"token": token, "user": user.model_dump()}

@api_router.get("/auth/me", response_model=User)
async def get_me(user: User = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

# ============ OTP-based Auth Endpoints ============

class AuthOTPRequest(BaseModel):
    phone: str

class AuthOTPVerify(BaseModel):
    phone: str
    otp: str
    
class RegisterWithOTP(BaseModel):
    phone: str
    otp: str
    email: EmailStr
    password: str
    name: str

class LoginWithOTP(BaseModel):
    phone: str
    otp: str

# Store for auth OTPs (separate from order OTPs)
auth_otp_storage = {}

@api_router.post("/auth/otp/send")
async def send_auth_otp(request: AuthOTPRequest):
    """Send OTP for authentication (login/register)"""
    phone = request.phone.strip()
    
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    
    # Generate OTP
    otp = generate_otp()
    
    # Store OTP with expiry (5 minutes)
    otp_key = f"auth_{phone}"
    auth_otp_storage[otp_key] = {
        "otp": otp,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5),
        "attempts": 0
    }
    
    logger.info(f"Auth OTP generated for {phone}: {otp}")
    
    return {
        "success": True,
        "message": "OTP sent successfully",
        "mock_otp": otp,  # REMOVE IN PRODUCTION
        "expires_in": 300,
        "phone": phone
    }

@api_router.post("/auth/otp/verify")
async def verify_auth_otp(request: AuthOTPVerify):
    """Verify OTP for authentication"""
    phone = request.phone.strip()
    otp = request.otp.strip()
    
    otp_key = f"auth_{phone}"
    
    if otp_key not in auth_otp_storage:
        raise HTTPException(status_code=400, detail="OTP not found. Please request a new OTP.")
    
    stored_data = auth_otp_storage[otp_key]
    
    # Check expiry
    if datetime.now(timezone.utc) > stored_data["expires_at"]:
        del auth_otp_storage[otp_key]
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new OTP.")
    
    # Check attempts
    if stored_data["attempts"] >= 3:
        del auth_otp_storage[otp_key]
        raise HTTPException(status_code=400, detail="Too many attempts. Please request a new OTP.")
    
    # Verify OTP
    if otp != stored_data["otp"]:
        auth_otp_storage[otp_key]["attempts"] += 1
        remaining = 3 - auth_otp_storage[otp_key]["attempts"]
        raise HTTPException(status_code=400, detail=f"Invalid OTP. {remaining} attempts remaining.")
    
    # OTP verified - generate verification token
    verification_token = str(uuid.uuid4())
    auth_otp_storage[otp_key]["verified"] = True
    auth_otp_storage[otp_key]["verification_token"] = verification_token
    
    # Check if user exists with this phone
    existing_user = await db.users.find_one({"phone": phone}, {"_id": 0})
    
    return {
        "success": True,
        "verified": True,
        "verification_token": verification_token,
        "user_exists": existing_user is not None,
        "phone": phone
    }

@api_router.post("/auth/register/otp")
async def register_with_otp(input: RegisterWithOTP):
    """Complete registration after OTP verification"""
    phone = input.phone.strip()
    otp_key = f"auth_{phone}"
    
    # Verify the OTP was verified
    if otp_key not in auth_otp_storage or not auth_otp_storage[otp_key].get("verified"):
        raise HTTPException(status_code=400, detail="Please verify OTP first")
    
    # Check if phone already registered
    existing_phone = await db.users.find_one({"phone": phone}, {"_id": 0})
    if existing_phone:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Check if email already registered
    existing_email = await db.users.find_one({"email": input.email}, {"_id": 0})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    password_hash = bcrypt.hashpw(input.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    user = User(email=input.email, phone=phone, name=input.name)
    
    doc = user.model_dump()
    doc['password_hash'] = password_hash
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    
    # Clean up OTP storage
    del auth_otp_storage[otp_key]
    
    token = jwt.encode({'sub': user.id, 'exp': datetime.now(timezone.utc) + timedelta(days=30)}, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    # Send email notification
    email_html = f"""
    <h2>🎉 New User Registration on Nevika Cura</h2>
    <p><strong>Name:</strong> {user.name}</p>
    <p><strong>Email:</strong> {user.email}</p>
    <p><strong>Phone:</strong> {user.phone} (Verified via OTP)</p>
    <p><strong>Registered at:</strong> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC</p>
    """
    
    # Welcome email for the patient
    patient_welcome_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to Nevika Cura! 🎉</h1>
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
                <p style="color: #14b8a6;">📍 24215 Kuykendal Road, Tomball, Texas 77375</p>
            </div>
        </div>
    </div>
    """
    
    await send_email_notification(
        "New User Registration - Nevika Cura", 
        email_html,
        patient_email=user.email,
        patient_subject="Welcome to Nevika Cura Healthcare! 🏥",
        patient_html=patient_welcome_html
    )
    
    # Generate WhatsApp link for signup notification (consistent with regular registration)
    whatsapp_message = f"New User Signup (OTP) on Nevika Cura\n\nName: {user.name}\nEmail: {user.email}\nPhone: {user.phone}"
    whatsapp_link = f"https://wa.me/91{SIGNUP_WHATSAPP_NUMBER}?text={whatsapp_message.replace(' ', '%20').replace(chr(10), '%0A')}"
    
    return {"token": token, "user": user.model_dump(), "whatsapp_notification_link": whatsapp_link}

@api_router.post("/auth/login/otp")
async def login_with_otp(input: LoginWithOTP):
    """Login after OTP verification"""
    phone = input.phone.strip()
    otp_key = f"auth_{phone}"
    
    # Verify the OTP was verified
    if otp_key not in auth_otp_storage or not auth_otp_storage[otp_key].get("verified"):
        raise HTTPException(status_code=400, detail="Please verify OTP first")
    
    # Find user by phone
    user_doc = await db.users.find_one({"phone": phone}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="No account found with this phone number")
    
    # Clean up OTP storage
    del auth_otp_storage[otp_key]
    
    user = User(**{k: v for k, v in user_doc.items() if k != 'password_hash'})
    token = jwt.encode({'sub': user.id, 'exp': datetime.now(timezone.utc) + timedelta(days=30)}, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return {"token": token, "user": user.model_dump()}

# ============ Guest Session Endpoints ============

class GuestSession(BaseModel):
    phone: str
    name: str = ""

@api_router.post("/auth/guest/session")
async def create_guest_session(input: GuestSession):
    """Create a guest session after OTP verification - no account needed"""
    phone = input.phone.strip()
    otp_key = f"auth_{phone}"
    
    # Verify the OTP was verified
    if otp_key not in auth_otp_storage or not auth_otp_storage[otp_key].get("verified"):
        raise HTTPException(status_code=400, detail="Please verify OTP first")
    
    # Clean up OTP storage
    del auth_otp_storage[otp_key]
    
    # Create a guest token (valid for 24 hours)
    guest_id = f"guest_{str(uuid.uuid4())[:8]}"
    guest_token = jwt.encode({
        'sub': guest_id,
        'phone': phone,
        'name': input.name,
        'is_guest': True,
        'exp': datetime.now(timezone.utc) + timedelta(hours=24)
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    logger.info(f"Guest session created for phone: {phone}")
    
    return {
        "token": guest_token,
        "guest": {
            "id": guest_id,
            "phone": phone,
            "name": input.name,
            "is_guest": True
        },
        "message": "Guest session created. You can now book services."
    }

@api_router.get("/guest/orders")
async def get_guest_orders(phone: str):
    """Get all orders for a guest by phone number"""
    phone = phone.strip()
    
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    
    # Get appointments
    appointments = await db.appointments.find(
        {"patient_phone": phone},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    # Get pharmacy orders
    pharmacy_orders = await db.pharmacy_orders.find(
        {"patient_phone": phone},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    # Get diagnostic orders
    diagnostic_orders = await db.diagnostic_orders.find(
        {"patient_phone": phone},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {
        "phone": phone,
        "appointments": appointments,
        "pharmacy_orders": pharmacy_orders,
        "diagnostic_orders": diagnostic_orders,
        "total_orders": len(appointments) + len(pharmacy_orders) + len(diagnostic_orders)
    }


# ============ OTP Endpoints (Mock OTP for testing) ============

@api_router.post("/otp/send")
async def send_otp(request: OTPRequest):
    """Send OTP to phone number (Mock - displays OTP in response for testing)"""
    phone = request.phone.strip()
    service = request.service.lower()
    
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    
    if service not in ['diagyn', 'proton', 'pharmacy']:
        raise HTTPException(status_code=400, detail="Invalid service")
    
    # Generate OTP
    otp = generate_otp()
    
    # Store OTP with expiry (5 minutes)
    otp_key = f"{phone}_{service}"
    otp_storage[otp_key] = {
        "otp": otp,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5),
        "attempts": 0
    }
    
    logger.info(f"Mock OTP generated for {phone} ({service}): {otp}")
    
    # In production, this would send SMS via MSG91
    # For now, return the OTP in response (MOCK MODE)
    return {
        "success": True,
        "message": "OTP sent successfully",
        "mock_otp": otp,  # REMOVE IN PRODUCTION - only for testing
        "expires_in": 300,  # 5 minutes
        "phone": phone
    }

@api_router.post("/otp/verify")
async def verify_otp(request: OTPVerify):
    """Verify OTP"""
    phone = request.phone.strip()
    otp = request.otp.strip()
    service = request.service.lower()
    
    otp_key = f"{phone}_{service}"
    
    if otp_key not in otp_storage:
        raise HTTPException(status_code=400, detail="OTP not found. Please request a new OTP.")
    
    stored_data = otp_storage[otp_key]
    
    # Check expiry
    if datetime.now(timezone.utc) > stored_data["expires_at"]:
        del otp_storage[otp_key]
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new OTP.")
    
    # Check attempts (max 3)
    if stored_data["attempts"] >= 3:
        del otp_storage[otp_key]
        raise HTTPException(status_code=400, detail="Too many attempts. Please request a new OTP.")
    
    # Verify OTP
    if stored_data["otp"] != otp:
        otp_storage[otp_key]["attempts"] += 1
        remaining = 3 - otp_storage[otp_key]["attempts"]
        raise HTTPException(status_code=400, detail=f"Invalid OTP. {remaining} attempts remaining.")
    
    # OTP verified - remove from storage
    del otp_storage[otp_key]
    
    # Generate verification token (valid for 30 minutes)
    verification_token = jwt.encode({
        'phone': phone,
        'service': service,
        'verified': True,
        'exp': datetime.now(timezone.utc) + timedelta(minutes=30)
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    logger.info(f"OTP verified successfully for {phone} ({service})")
    
    return {
        "success": True,
        "message": "OTP verified successfully",
        "verification_token": verification_token
    }

@api_router.post("/otp/resend")
async def resend_otp(request: OTPRequest):
    """Resend OTP to phone number"""
    # Simply call send_otp again
    return await send_otp(request)

@api_router.get("/drive/connect")
async def connect_drive(user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        redirect_uri = os.getenv("GOOGLE_DRIVE_REDIRECT_URI")
        
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                    "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [redirect_uri]
                }
            },
            scopes=['https://www.googleapis.com/auth/drive.file'],
            redirect_uri=redirect_uri
        )
        
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent',
            state=user.id
        )
        
        logger.info(f"Drive OAuth initiated for user {user.id}")
        return {"authorization_url": authorization_url}
    
    except Exception as e:
        logger.error(f"Failed to initiate OAuth: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to initiate OAuth: {str(e)}")

@api_router.get("/drive/callback")
async def drive_callback(code: str = Query(...), state: str = Query(...)):
    try:
        redirect_uri = os.getenv("GOOGLE_DRIVE_REDIRECT_URI")
        
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                    "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [redirect_uri]
                }
            },
            scopes=None,
            redirect_uri=redirect_uri
        )
        
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        logger.info(f"Drive credentials obtained for user {state}, scopes: {credentials.scopes}")

        required_scopes = {"https://www.googleapis.com/auth/drive.file"}
        granted_scopes = set(credentials.scopes or [])
        if not required_scopes.issubset(granted_scopes):
            missing = required_scopes - granted_scopes
            logger.error(f"Missing required Drive scopes: {missing}")
            raise HTTPException(status_code=400, detail=f"Missing required Drive scopes: {', '.join(missing)}")
        
        await db.drive_credentials.update_one(
            {"user_id": state},
            {"$set": {
                "user_id": state,
                "access_token": credentials.token,
                "refresh_token": credentials.refresh_token,
                "token_uri": credentials.token_uri,
                "client_id": credentials.client_id,
                "client_secret": credentials.client_secret,
                "scopes": credentials.scopes,
                "expiry": credentials.expiry.isoformat() if credentials.expiry else None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        
        logger.info(f"Drive credentials stored for user {state}")
        
        frontend_url = os.getenv("FRONTEND_URL", os.getenv("REACT_APP_BACKEND_URL", "").replace("/api", ""))
        return RedirectResponse(url=f"{frontend_url}?drive_connected=true")
    
    except Exception as e:
        logger.error(f"OAuth callback failed: {str(e)}")
        raise HTTPException(status_code=400, detail=f"OAuth failed: {str(e)}")

async def get_drive_service(user_id: str):
    creds_doc = await db.drive_credentials.find_one({"user_id": user_id}, {"_id": 0})
    if not creds_doc:
        return None
    
    creds = Credentials(
        token=creds_doc["access_token"],
        refresh_token=creds_doc.get("refresh_token"),
        token_uri=creds_doc["token_uri"],
        client_id=creds_doc["client_id"],
        client_secret=creds_doc["client_secret"],
        scopes=creds_doc["scopes"]
    )
    
    if creds.expired and creds.refresh_token:
        logger.info(f"Refreshing expired token for user {user_id}")
        creds.refresh(GoogleRequest())
        
        await db.drive_credentials.update_one(
            {"user_id": user_id},
            {"$set": {
                "access_token": creds.token,
                "expiry": creds.expiry.isoformat() if creds.expiry else None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    return build('drive', 'v3', credentials=creds)

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), user_id: Optional[str] = None):
    try:
        if user_id:
            drive_service = await get_drive_service(user_id)
            if drive_service:
                file_content = await file.read()
                file_stream = io.BytesIO(file_content)
                
                file_metadata = {
                    'name': file.filename,
                    'mimeType': file.content_type
                }
                
                media = MediaIoBaseUpload(file_stream, mimetype=file.content_type, resumable=True)
                uploaded_file = drive_service.files().create(
                    body=file_metadata,
                    media_body=media,
                    fields='id, webViewLink'
                ).execute()
                
                drive_service.permissions().create(
                    fileId=uploaded_file['id'],
                    body={'type': 'anyone', 'role': 'reader'}
                ).execute()
                
                file_url = uploaded_file.get('webViewLink', f"https://drive.google.com/file/d/{uploaded_file['id']}/view")
                logger.info(f"File uploaded to Google Drive: {file_url}")
                return {"url": file_url, "file_id": uploaded_file['id']}
        
        file_content = await file.read()
        encoded_file = f"data:{file.content_type};base64,{io.BytesIO(file_content).read().hex()}"
        logger.info(f"File stored as base64 (fallback)")
        return {"url": encoded_file, "file_id": None}
    
    except Exception as e:
        logger.error(f"File upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

@api_router.post("/appointments", response_model=Appointment)
async def create_appointment(input: AppointmentCreate, user = Depends(get_current_user)):
    # SLOT BLOCKING: Check if slot is already booked (includes pending from patient bookings)
    existing = await db.appointments.find_one({
        "doctor": input.doctor,
        "clinic": input.clinic,
        "date": input.date,
        "time": input.time,
        "status": {"$in": ["pending", "Booked", "In Clinic", "Completed"]}
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="This time slot is already booked. Please select another slot.")
    
    appointment = Appointment(
        user_id=user.id if user else None,
        **input.model_dump()
    )
    
    doc = appointment.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['appointment_type'] = "NORMAL"  # Customer bookings are always NORMAL
    
    await db.appointments.insert_one(doc)
    logger.info(f"Appointment created: {appointment.id}")
    
    # Generate WhatsApp link for appointment notification
    whatsapp_message = f"""New DiaGyn Appointment Booking

Patient: {appointment.patient_name}
Phone: {appointment.patient_phone}

Doctor: {appointment.doctor}
Clinic: {appointment.clinic}
Date: {appointment.date}
Time: {appointment.time}

Booking ID: {appointment.id[:8]}"""
    
    whatsapp_link = f"https://wa.me/917039020020?text={whatsapp_message.replace(chr(10), '%0A').replace(' ', '%20')}"
    
    # Send email notification for new appointment
    email_html = f"""
    <h2>📅 New DiaGyn Appointment Booking</h2>
    <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Doctor:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{appointment.doctor}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Clinic:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{appointment.clinic}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Date:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{appointment.date}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Time:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{appointment.time}</td></tr>
    </table>
    <h3>Patient Details</h3>
    <p><strong>Name:</strong> {appointment.patient_name}</p>
    <p><strong>Phone:</strong> {appointment.patient_phone}</p>
    <p><strong>Email:</strong> {appointment.patient_email or 'Not provided'}</p>
    <p><strong>Booked at:</strong> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC</p>
    <div style="margin-top: 20px; padding: 15px; background: #dcfce7; border-radius: 8px;">
        <p style="margin: 0;"><strong>📱 WhatsApp Forward Link:</strong></p>
        <p style="margin: 5px 0;"><a href="{whatsapp_link}" style="color: #16a34a;">Click to forward appointment on WhatsApp</a></p>
    </div>
    """
    
    # Patient confirmation email
    patient_appt_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Appointment Confirmed! 📅</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px;">Hello <strong>{appointment.patient_name}</strong>,</p>
            <p>Your appointment has been successfully booked at <strong>DiaGyn Healthcare</strong>.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                <h3 style="color: #3b82f6; margin-top: 0;">Appointment Details</h3>
                <p><strong>Doctor:</strong> {appointment.doctor}</p>
                <p><strong>Clinic:</strong> {appointment.clinic}</p>
                <p><strong>Date:</strong> {appointment.date}</p>
                <p><strong>Time:</strong> {appointment.time}</p>
            </div>
            
            <p style="color: #64748b; font-size: 14px;">
                Please arrive 15 minutes before your scheduled time. Bring any relevant medical records or prescriptions.
            </p>
            
            <div style="text-align: center; margin-top: 30px; padding: 15px; background: #dbeafe; border-radius: 8px;">
                <p style="margin: 0; color: #1e40af;"><strong>Need to reschedule?</strong></p>
                <p style="margin: 5px 0 0 0; color: #3b82f6;">Contact us: 7039020020</p>
            </div>
        </div>
    </div>
    """
    
    await send_email_notification(
        f"New Appointment - {appointment.doctor} on {appointment.date}", 
        email_html,
        patient_email=appointment.patient_email,
        patient_subject=f"Appointment Confirmed - {appointment.doctor} on {appointment.date}",
        patient_html=patient_appt_html
    )
    
    # Send WhatsApp notification to doctor
    await notify_doctor_whatsapp(appointment.doctor, {
        "clinic": appointment.clinic,
        "date": appointment.date,
        "time": appointment.time,
        "patient_name": appointment.patient_name,
        "patient_phone": appointment.patient_phone,
        "booked_by": "Patient (Online)"
    }, "online")
    
    # Send push notification if user is logged in
    if user:
        await send_push_notification(
            user_id=user.id,
            title="Appointment Confirmed! 📅",
            body=f"Your appointment with {appointment.doctor} on {appointment.date} at {appointment.time} is confirmed.",
            url="/profile",
            tag=f"appointment-{appointment.id}"
        )
    
    return appointment

@api_router.get("/appointments/booked-slots")
async def get_booked_slots(doctor: str, clinic: str, date: str):
    """Get booked slots for a specific doctor, clinic, and date
    Returns slots that are actively booked (not cancelled/no-show)
    This endpoint is used by both DiaGyn (patient) and StaffPortal for slot synchronization
    Includes 'pending' status to block slots from patient bookings as well
    """
    booked = await db.appointments.find(
        {
            "doctor": doctor, 
            "clinic": clinic, 
            "date": date,
            "status": {"$in": ["pending", "Booked", "In Clinic", "Completed"]}
        },
        {"_id": 0, "time": 1}
    ).to_list(100)
    
    return {"booked_slots": [b["time"] for b in booked if b.get("time")]}

@api_router.get("/appointments", response_model=List[Appointment])
async def get_appointments(user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    appointments = await db.appointments.find({"user_id": user.id}, {"_id": 0}).to_list(100)
    
    for appt in appointments:
        if isinstance(appt.get('created_at'), str):
            appt['created_at'] = datetime.fromisoformat(appt['created_at'])
    
    return appointments

@api_router.post("/diagnostics", response_model=DiagnosticOrder)
async def create_diagnostic_order(input: DiagnosticOrderCreate, user = Depends(get_current_user)):
    order = DiagnosticOrder(
        user_id=user.id if user else None,
        **input.model_dump()
    )
    
    doc = order.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.diagnostic_orders.insert_one(doc)
    logger.info(f"Diagnostic order created: {order.id}")
    
    # Generate WhatsApp link for order notification
    tests_text = ", ".join(order.tests[:3])
    if len(order.tests) > 3:
        tests_text += f" +{len(order.tests) - 3} more"
    
    whatsapp_message = f"""New Diagnostic Order - Proton Diagnostics

Patient: {order.patient_name}
Phone: {order.patient_phone}
Order ID: {order.id[:8]}

Tests: {tests_text}
Preferred Date: {order.preferred_date}
Prescription: {order.prescription_url or 'Not uploaded'}"""
    
    whatsapp_link = f"https://wa.me/917039040040?text={whatsapp_message.replace(chr(10), '%0A').replace(' ', '%20')}"
    
    # Format prescription as clickable link
    prescription_display = f'<a href="{order.prescription_url}" target="_blank" style="color: #8b5cf6;">📎 View Prescription</a>' if order.prescription_url else 'Not uploaded'
    
    # Send email notification for new diagnostic order
    tests_list = "<br>".join([f"• {test}" for test in order.tests])
    email_html = f"""
    <h2>🔬 New Proton Diagnostics Order</h2>
    <h3>Tests Ordered:</h3>
    <p>{tests_list}</p>
    <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Preferred Date:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{order.preferred_date}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Prescription:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{prescription_display}</td></tr>
    </table>
    <h3>Patient Details</h3>
    <p><strong>Name:</strong> {order.patient_name}</p>
    <p><strong>Phone:</strong> {order.patient_phone}</p>
    <p><strong>Email:</strong> {order.patient_email or 'Not provided'}</p>
    <p><strong>Ordered at:</strong> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC</p>
    <div style="margin-top: 20px; padding: 15px; background: #dcfce7; border-radius: 8px;">
        <p style="margin: 0;"><strong>📱 WhatsApp Forward Link:</strong></p>
        <p style="margin: 5px 0;"><a href="{whatsapp_link}" style="color: #16a34a;">Click to forward order on WhatsApp</a></p>
    </div>
    """
    
    # Patient confirmation email for diagnostics
    tests_list_patient = "".join([f"<li>{test}</li>" for test in order.tests])
    patient_diag_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Test Booking Confirmed! 🔬</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px;">Hello <strong>{order.patient_name}</strong>,</p>
            <p>Your diagnostic tests have been successfully booked at <strong>Proton Diagnostics</strong>.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
                <h3 style="color: #8b5cf6; margin-top: 0;">Tests Booked</h3>
                <ul style="line-height: 1.8;">{tests_list_patient}</ul>
                <p><strong>Preferred Date:</strong> {order.preferred_date}</p>
                <p><strong>Order ID:</strong> {order.id[:8]}...</p>
            </div>
            
            <p style="color: #64748b; font-size: 14px;">
                Our team will contact you shortly to confirm the sample collection time. Please keep your prescription handy.
            </p>
            
            <div style="text-align: center; margin-top: 30px; padding: 15px; background: #ede9fe; border-radius: 8px;">
                <p style="margin: 0; color: #5b21b6;"><strong>Questions about your tests?</strong></p>
                <p style="margin: 5px 0 0 0; color: #7c3aed;">Contact us: 7039040040</p>
            </div>
        </div>
    </div>
    """
    
    await send_email_notification(
        f"New Diagnostic Order - {order.patient_name}", 
        email_html,
        patient_email=order.patient_email,
        patient_subject=f"Test Booking Confirmed - Proton Diagnostics",
        patient_html=patient_diag_html
    )
    
    # Send push notification if user is logged in
    if user:
        tests_preview = ", ".join(order.tests[:2]) + ("..." if len(order.tests) > 2 else "")
        await send_push_notification(
            user_id=user.id,
            title="Test Booking Confirmed! 🔬",
            body=f"Your tests ({tests_preview}) are scheduled for {order.preferred_date}.",
            url="/profile",
            tag=f"diagnostic-{order.id}"
        )
    
    return order

@api_router.get("/diagnostics", response_model=List[DiagnosticOrder])
async def get_diagnostic_orders(user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    orders = await db.diagnostic_orders.find({"user_id": user.id}, {"_id": 0}).to_list(100)
    
    for order in orders:
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
    
    return orders

@api_router.post("/pharmacy", response_model=PharmacyOrder)
async def create_pharmacy_order(input: PharmacyOrderCreate, user = Depends(get_current_user)):
    order = PharmacyOrder(
        user_id=user.id if user else None,
        **input.model_dump()
    )
    
    doc = order.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.pharmacy_orders.insert_one(doc)
    logger.info(f"Pharmacy order created: {order.id}")
    
    # Generate WhatsApp link for order notification
    medicines_text = ", ".join([f"{m.get('name', 'Unknown')} x{m.get('quantity', 1)}" for m in order.medicines[:3]])
    if len(order.medicines) > 3:
        medicines_text += f" +{len(order.medicines) - 3} more"
    
    whatsapp_message = f"""New Pharmacy Order - Orange Pharmacy

Patient: {order.patient_name}
Phone: {order.patient_phone}
Order ID: {order.id[:8]}

Medicines: {medicines_text if order.medicines else 'See prescription'}
Prescription: {order.prescription_url or 'Not uploaded'}
Delivery: {order.delivery_address or 'Not provided'}"""
    
    whatsapp_link = f"https://wa.me/917039030030?text={whatsapp_message.replace(chr(10), '%0A').replace(' ', '%20')}"
    
    # Format prescription as clickable link
    prescription_display = f'<a href="{order.prescription_url}" target="_blank" style="color: #f97316;">📎 View Prescription</a>' if order.prescription_url else 'Not uploaded'
    
    # Send email notification for new pharmacy order
    medicines_list = "<br>".join([f"• {m.get('name', 'Unknown')} (Qty: {m.get('quantity', 1)})" for m in order.medicines]) if order.medicines else '<em>No medicines specified - Check prescription</em>'
    email_html = f"""
    <h2>💊 New Orange Pharmacy Order</h2>
    <h3>Medicines Ordered:</h3>
    <p>{medicines_list}</p>
    <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Delivery Address:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{order.delivery_address or 'Not provided'}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Prescription:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{prescription_display}</td></tr>
    </table>
    <h3>Customer Details</h3>
    <p><strong>Name:</strong> {order.patient_name}</p>
    <p><strong>Phone:</strong> {order.patient_phone}</p>
    <p><strong>Email:</strong> {order.patient_email or 'Not provided'}</p>
    <p><strong>Ordered at:</strong> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC</p>
    <div style="margin-top: 20px; padding: 15px; background: #dcfce7; border-radius: 8px;">
        <p style="margin: 0;"><strong>📱 WhatsApp Forward Link:</strong></p>
        <p style="margin: 5px 0;"><a href="{whatsapp_link}" style="color: #16a34a;">Click to forward order on WhatsApp</a></p>
    </div>
    """
    
    # Patient confirmation email for pharmacy
    medicines_list_patient = "".join([f"<li>{m.get('name', 'Unknown')} - Qty: {m.get('quantity', 1)}</li>" for m in order.medicines]) if order.medicines else '<li><em>Medicines as per prescription</em></li>'
    patient_pharmacy_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Order Confirmed! 💊</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px;">Hello <strong>{order.patient_name}</strong>,</p>
            <p>Your order has been successfully placed at <strong>Orange Pharmacy</strong>.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316;">
                <h3 style="color: #f97316; margin-top: 0;">Order Details</h3>
                <p><strong>Order ID:</strong> {order.id[:8]}...</p>
                <p><strong>Status:</strong> <span style="background: #fef3c7; padding: 4px 8px; border-radius: 4px; color: #d97706;">Order Booked</span></p>
                <h4>Medicines:</h4>
                <ul style="line-height: 1.8;">{medicines_list_patient}</ul>
                <p><strong>Delivery Address:</strong> {order.delivery_address or 'Will be confirmed'}</p>
            </div>
            
            <p style="color: #64748b; font-size: 14px;">
                Your order is being processed. We'll notify you when it's out for delivery.
            </p>
            
            <div style="text-align: center; margin-top: 30px; padding: 15px; background: #ffedd5; border-radius: 8px;">
                <p style="margin: 0; color: #c2410c;"><strong>Need help with your order?</strong></p>
                <p style="margin: 5px 0 0 0; color: #ea580c;">Contact us: 7039030030</p>
            </div>
        </div>
    </div>
    """
    
    await send_email_notification(
        f"New Pharmacy Order - {order.patient_name}", 
        email_html,
        patient_email=order.patient_email,
        patient_subject=f"Order Confirmed - Orange Pharmacy #{order.id[:8]}",
        patient_html=patient_pharmacy_html
    )
    
    # Send push notification if user is logged in
    if user:
        medicine_count = len(order.medicines) if order.medicines else 0
        await send_push_notification(
            user_id=user.id,
            title="Order Placed! 💊",
            body=f"Your order with {medicine_count} item(s) has been placed. We'll notify you when it's out for delivery.",
            url="/profile",
            tag=f"pharmacy-{order.id}"
        )
    
    return order

@api_router.get("/pharmacy", response_model=List[PharmacyOrder])
async def get_pharmacy_orders(user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    orders = await db.pharmacy_orders.find({"user_id": user.id}, {"_id": 0}).to_list(100)
    
    for order in orders:
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
    
    return orders


# Medicine inventory for Orange Pharmacy - 2715 medicines from product list
MEDICINE_INVENTORY = [
    {"name": "3-KAT-60TAB", "form": "Tablet"},
    {"name": "8X KT SHAMPOO", "form": "Shampoo"},
    {"name": "8X KT SHAMPOO 60ML", "form": "Shampoo"},
    {"name": "8X SHAMPOO 100ML", "form": "Shampoo"},
    {"name": "A TO Z DROPS 15ML", "form": "Drops"},
    {"name": "A TO Z GOLD CAPS", "form": "Capsule"},
    {"name": "A TO Z NS TAB", "form": "Tablet"},
    {"name": "A TO Z SYP 100ML", "form": "Syrup"},
    {"name": "A TO Z WOMEN CAP", "form": "Capsule"},
    {"name": "AB FLO CAPS", "form": "Capsule"},
    {"name": "AB FLO SR", "form": "Tablet"},
    {"name": "AB PHYLINE CAPS", "form": "Capsule"},
    {"name": "AB PHYLINE SR200", "form": "Tablet"},
    {"name": "ABANA TAB", "form": "Tablet"},
    {"name": "ABENDOL 10", "form": "Medicine"},
    {"name": "ABOUND PLUS", "form": "Tablet"},
    {"name": "ABOUND TAB", "form": "Tablet"},
    {"name": "ABSOLUT -3G CAPS'", "form": "Capsule"},
    {"name": "ABSOLUT GOLD", "form": "Tablet"},
    {"name": "ABSOLUT WOMAN", "form": "Medicine"},
    {"name": "ABSOLUT WOMAN CAPS", "form": "Capsule"},
    {"name": "ABZORB POWDER 100GM", "form": "Powder"},
    {"name": "ABZORB POWDER 50GM", "form": "Powder"},
    {"name": "ACE PROXYVON", "form": "Tablet"},
    {"name": "ACE PROXYVON CR 20", "form": "Tablet"},
    {"name": "ACECLO 100MG TAB", "form": "Tablet"},
    {"name": "ACECLO PLUS", "form": "Tablet"},
    {"name": "ACEFLAM SP", "form": "Medicine"},
    {"name": "ACEMIZ MR", "form": "Medicine"},
    {"name": "ACEMIZ S 10T TAB", "form": "Tablet"},
    {"name": "ACEMIZ S TAB", "form": "Tablet"},
    {"name": "ACEMIZ-S", "form": "Medicine"},
    {"name": "ACIBAN 20MG TAB", "form": "Tablet"},
    {"name": "ACIBAN 40MG TAB", "form": "Tablet"},
    {"name": "ACIGENE MINT GEL SUSP 170ML", "form": "Syrup"},
    {"name": "ACILOC 150MG TAB", "form": "Tablet"},
    {"name": "ACILOC 300MG TAB", "form": "Tablet"},
    {"name": "ACILOC RD TAB", "form": "Tablet"},
    {"name": "ACITROM 0.5MG", "form": "Tablet"},
    {"name": "ACITROM 1MG TAB", "form": "Tablet"},
    {"name": "ACITROM-2MG TAB", "form": "Tablet"},
    {"name": "ACITROM-3 MG TAB", "form": "Tablet"},
    {"name": "ACITROM-4MG TAB", "form": "Tablet"},
    {"name": "ACIVIR DT 400MG TAB", "form": "Tablet"},
    {"name": "ACIVIR SKIN CREAM", "form": "Cream"},
    {"name": "ACIVIR SKIN CREAM 5GM", "form": "Cream"},
    {"name": "ACNELAK SOAP 75GM", "form": "Soap"},
    {"name": "ACNESTAL SOAP 75GM", "form": "Soap"},
    {"name": "ACNESTAR GEL 22G", "form": "Cream"},
    {"name": "ACNESTAR SOAP 75GM", "form": "Soap"},
    {"name": "ACNIL SOAP 75GM", "form": "Soap"},
    {"name": "ACTIGUT", "form": "Medicine"},
    {"name": "ACTIGUUT CAP", "form": "Medicine"},
    {"name": "ACTRAPID HM PENFILL 3ML", "form": "Injection"},
    {"name": "ACULAR LS DROPS 5ML", "form": "Drops"},
    {"name": "ACUPERA TH 4 TAB", "form": "Tablet"},
    {"name": "ADDYZOA CAPS", "form": "Capsule"},
    {"name": "ADIGESIC MR", "form": "Medicine"},
    {"name": "ADMENTA 10MG TAB", "form": "Tablet"},
    {"name": "ADMENTA 5MG TAB", "form": "Tablet"},
    {"name": "ADVANT 625MG TAB", "form": "Tablet"},
    {"name": "ADVENT 228.5 DRY SYP 30ML", "form": "Syrup"},
    {"name": "ADVENT 228.5MG DRY SYP", "form": "Syrup"},
    {"name": "ADVENT 228.5MG DRY SYP 30ML", "form": "Syrup"},
    {"name": "ADVENT FORTE 457SYP 30ML", "form": "Syrup"},
    {"name": "AEROCORT FORTE ROTACAPS", "form": "Capsule"},
    {"name": "AEROCORT INHR", "form": "Tablet"},
    {"name": "AEROCORT ROTACAPS 60S", "form": "Capsule"},
    {"name": "AEROCORT ROTCAP", "form": "Capsule"},
    {"name": "AEROMIST NEBULIZER MASK CHILD", "form": "Tablet"},
    {"name": "AIMIL NEERI TAB 30S", "form": "Tablet"},
    {"name": "AIRFLOW 250MCG ROTACAPS", "form": "Capsule"},
    {"name": "AJADUO 10/5MG TAB", "form": "Tablet"},
    {"name": "AJADUO 25/5 MG", "form": "Tablet"},
    {"name": "AJANTAS CALAMINE LOTION 100ML", "form": "Lotion"},
    {"name": "AKASH AYURVEDIC SOAP 75GM", "form": "Soap"},
    {"name": "AKT 3 TAB", "form": "Tablet"},
    {"name": "AKT 4 TAB", "form": "Tablet"},
    {"name": "ALASPAN AM TAB", "form": "Tablet"},
    {"name": "ALASPAN TAB", "form": "Tablet"},
    {"name": "ALBAYES", "form": "Medicine"},
    {"name": "ALBAYES SYP", "form": "Medicine"},
    {"name": "ALCIFLOX D", "form": "Medicine"},
    {"name": "ALCIFLOX D EYE DROPS", "form": "Drops"},
    {"name": "ALCIFLOX D EYE DROPS 10ML", "form": "Drops"},
    {"name": "ALDACTONE 100MG 15'S", "form": "Tablet"},
    {"name": "ALDACTONE 25MG TAB", "form": "Tablet"},
    {"name": "ALDACTONE 50MG TAB", "form": "Tablet"},
    {"name": "ALDAY TAB", "form": "Tablet"},
    {"name": "ALDIGESIC TH 4MG TAB", "form": "Tablet"},
    {"name": "ALDONIL OD TAB", "form": "Tablet"},
    {"name": "ALDONIL PLUS", "form": "Tablet"},
    {"name": "ALERID 30ML SYP", "form": "Syrup"},
    {"name": "ALERID D TAB", "form": "Tablet"},
    {"name": "ALERID SYP 60ML", "form": "Syrup"},
    {"name": "ALERID TAB", "form": "Tablet"},
    {"name": "ALEX 5MG TAB", "form": "Tablet"},
    {"name": "ALEX JUNIOR SYP 60ML", "form": "Syrup"},
    {"name": "ALEX LOZENGES", "form": "Tablet"},
    {"name": "ALEX PAEDIATRIC DROPS 15ML", "form": "Drops"},
    {"name": "ALEX S.F SYP 100ML", "form": "Syrup"},
    {"name": "ALEX SYP 100ML", "form": "Syrup"},
    {"name": "ALFA KETOSEN TAB", "form": "Tablet"},
    {"name": "ALFOO  TAB", "form": "Tablet"},
    {"name": "ALFUNOL 10MG TAB", "form": "Tablet"},
    {"name": "ALICLAIR 125 SYRUP", "form": "Medicine"},
    {"name": "ALICLAIR 250 SYRP", "form": "Medicine"},
    {"name": "ALICLAIR 250MG TAB", "form": "Tablet"},
    {"name": "ALICLAIR 500", "form": "Medicine"},
    {"name": "ALKACIP 100 ML SYP", "form": "Medicine"},
    {"name": "ALKACIP SYP 100ML", "form": "Syrup"},
    {"name": "ALKAZIP SODA SACHET", "form": "Powder"},
    {"name": "ALKAZIP SODA SACHET 4GM", "form": "Sachet"},
    {"name": "ALKOF DX SYP 100ML", "form": "Syrup"},
    {"name": "ALKOF JUNIOR 100", "form": "Medicine"},
    {"name": "ALKOF JUNIOR 60 ML", "form": "Medicine"},
    {"name": "ALKOF JUNIOR COUGH SYRUP", "form": "Syrup"},
    {"name": "ALKOF JUNIOR COUGH SYRUP (100ML) SYP", "form": "Medicine"},
    {"name": "ALKOF JUNIOR SYP 100ML", "form": "Syrup"},
    {"name": "ALKOF LS PLUS", "form": "Medicine"},
    {"name": "ALKOF LS SYP", "form": "Medicine"},
    {"name": "ALKOF ORANGE SYP 60ML", "form": "Syrup"},
    {"name": "ALLEGRA 120MG TAB", "form": "Tablet"},
    {"name": "ALLEGRA 180MG TAB", "form": "Tablet"},
    {"name": "ALLEGRA M TAB", "form": "Tablet"},
    {"name": "ALLEGRA SUSPENSION 50ML", "form": "Syrup"},
    {"name": "ALLERFEX M TAB", "form": "Tablet"},
    {"name": "ALLUGEL O SYP 200ML", "form": "Syrup"},
    {"name": "ALMEFKEM SPAS TAB", "form": "Tablet"},
    {"name": "ALMOX CV 625", "form": "Medicine"},
    {"name": "ALMOX CV 625MG TABLETS", "form": "Tablet"},
    {"name": "ALNURO PLUS", "form": "Medicine"},
    {"name": "ALNURO PLUS CAP", "form": "Capsule"},
    {"name": "ALOGRACE CREAM", "form": "Cream"},
    {"name": "ALOGRACE CREAM 50GM", "form": "Cream"},
    {"name": "ALPHA KETONAVAG", "form": "Medicine"},
    {"name": "ALPHA-CAD TAB", "form": "Tablet"},
    {"name": "ALPHAGAN EYE DROPS 5ML", "form": "Drops"},
    {"name": "ALPHAGAN P EYE DROPS 5ML", "form": "Drops"},
    {"name": "ALPHAGAN-Z E/DROPS 5ML", "form": "Drops"},
    {"name": "ALPRAX 0.25MG TAB", "form": "Tablet"},
    {"name": "ALPRAX 0.5MG TAB", "form": "Tablet"},
    {"name": "ALPRAX 1MG TAB", "form": "Tablet"},
    {"name": "ALPRAX FORTE TAB", "form": "Tablet"},
    {"name": "ALTHROCIN 250MG", "form": "Tablet"},
    {"name": "ALTHROCIN 500MG", "form": "Tablet"},
    {"name": "ALTHROCIN DROPS 10ML", "form": "Drops"},
    {"name": "ALTHROCIN SYP 60ML", "form": "Syrup"},
    {"name": "ALTIVA 120 MG", "form": "Medicine"},
    {"name": "ALTIVA 120MG TAB", "form": "Tablet"},
    {"name": "ALTRADAY CAP", "form": "Capsule"},
    {"name": "ALZOLAM 0.25MG TAB", "form": "Tablet"},
    {"name": "ALZOLAM 0.5MG TAB", "form": "Tablet"},
    {"name": "ALZYME SYRUP", "form": "Medicine"},
    {"name": "AMANTRAL TAB", "form": "Tablet"},
    {"name": "AMARYL - M1MG", "form": "Tablet"},
    {"name": "AMARYL 1MG", "form": "Tablet"},
    {"name": "AMARYL 1MG TAB", "form": "Tablet"},
    {"name": "AMARYL 2MG TAB", "form": "Tablet"},
    {"name": "AMARYL 3MG TAB", "form": "Tablet"},
    {"name": "AMARYL M-FORTE 1MG", "form": "Tablet"},
    {"name": "AMARYL M-FORTE 2MG", "form": "Tablet"},
    {"name": "AMARYL MV 1MG TAB", "form": "Tablet"},
    {"name": "AMARYL MV 2MG TAB", "form": "Tablet"},
    {"name": "AMARYL- M2MG", "form": "Tablet"},
    {"name": "AMBRODIL S SYP 100ML", "form": "Syrup"},
    {"name": "AMBRODIL S SYRUP 100ML", "form": "Syrup"},
    {"name": "AMBRODIL SYP 100ML", "form": "Syrup"},
    {"name": "AMBROLITE SYP 100ML", "form": "Syrup"},
    {"name": "AMBROLITE-D-PLUS SYP 100ML", "form": "Syrup"},
    {"name": "AMBROLITE-S SYP 100ML", "form": "Syrup"},
    {"name": "AMIXIDE H TAB", "form": "Tablet"},
    {"name": "AMIXIDE TAB", "form": "Tablet"},
    {"name": "AMLIP 2.5 TAB", "form": "Tablet"},
    {"name": "AMLIP 2.5MG TAB", "form": "Tablet"},
    {"name": "AMLIP 5MG TAB", "form": "Tablet"},
    {"name": "AMLOBIG 5", "form": "Medicine"},
    {"name": "AMLOBIG AT", "form": "Medicine"},
    {"name": "AMLODAC 10MG", "form": "Tablet"},
    {"name": "AMLODAC 2.5MG TAB", "form": "Tablet"},
    {"name": "AMLODAC 5MG TAB", "form": "Tablet"},
    {"name": "AMLODAC AT TAB", "form": "Tablet"},
    {"name": "AMLOGARD 2.5MG TAB", "form": "Tablet"},
    {"name": "AMLOGARD 5MG TAB", "form": "Tablet"},
    {"name": "AMLOKIND 10MG TAB", "form": "Tablet"},
    {"name": "AMLOKIND 2.5MG", "form": "Tablet"},
    {"name": "AMLOKIND 5MG", "form": "Medicine"},
    {"name": "AMLOKIND 5MG TAB", "form": "Tablet"},
    {"name": "AMLOKIND AT", "form": "Tablet"},
    {"name": "AMLOKIND H TAB", "form": "Tablet"},
    {"name": "AMLOKIND L TAB 10'S", "form": "Tablet"},
    {"name": "AMLONG -A TABS", "form": "Tablet"},
    {"name": "AMLONG 10MG TAB", "form": "Tablet"},
    {"name": "AMLONG 2.5MG TAB", "form": "Tablet"},
    {"name": "AMLONG 5 MG TAB", "form": "Tablet"},
    {"name": "AMLONG H", "form": "Tablet"},
    {"name": "AMLONG-MT-25MG TAB", "form": "Tablet"},
    {"name": "AMLONG-MT-50MG TAB", "form": "Tablet"},
    {"name": "AMLOPIN 2.5MG TAB", "form": "Tablet"},
    {"name": "AMLOPIN 5MG TAB", "form": "Tablet"},
    {"name": "AMLOPIN AT TABS", "form": "Tablet"},
    {"name": "AMLOPRES- AT TAB", "form": "Tablet"},
    {"name": "AMLOPRESS 2.5MG", "form": "Tablet"},
    {"name": "AMLOPRESS 5MG", "form": "Tablet"},
    {"name": "AMLOPRESS AT 25MG TAB", "form": "Tablet"},
    {"name": "AMLOPRESS TL", "form": "Tablet"},
    {"name": "AMLOSAFE 2.5MG TAB", "form": "Tablet"},
    {"name": "AMLOSAFE 3D", "form": "Tablet"},
    {"name": "AMLOSAFE 5MG", "form": "Tablet"},
    {"name": "AMLOSAFE-AT TAB", "form": "Tablet"},
    {"name": "AMODEP 5MG TAB", "form": "Tablet"},
    {"name": "AMODEP AT TAB", "form": "Tablet"},
    {"name": "AMOXYCLAV 375", "form": "Medicine"},
    {"name": "AMOXYCLAV 375MG TAB", "form": "Tablet"},
    {"name": "AMOXYCLAV 625 MG", "form": "Medicine"},
    {"name": "AMOXYCLAV 625MG TAB", "form": "Tablet"},
    {"name": "AMPOXIN 500MG TAB", "form": "Tablet"},
    {"name": "AMPOXIN CV 375MG TAB", "form": "Tablet"},
    {"name": "AMPOXIN CV 625MG TAB", "form": "Tablet"},
    {"name": "AMPOXIN CV FORTE SYP 30ML", "form": "Syrup"},
    {"name": "AMPOXIN CV SUSP 30ML", "form": "Syrup"},
    {"name": "AMROLTRU 0.25%", "form": "Medicine"},
    {"name": "AMROX JUNIOR", "form": "Medicine"},
    {"name": "AMRUTANJAN ADVANCED BACK PAIN ROLLON", "form": "Tablet"},
    {"name": "AMRUTANJAN ADVANCED BACK PAIN ROLLON 50ML", "form": "Balm"},
    {"name": "AMRUTANJAN PAIN BALM EXTRA POWER", "form": "Tablet"},
    {"name": "AMRUTANJAN PAIN BALM EXTRA POWER, HEADACHE & COLD, 8ML", "form": "Balm"},
    {"name": "AMTAS 2.5MG TAB", "form": "Tablet"},
    {"name": "AMTAS 5MG TABS", "form": "Tablet"},
    {"name": "AMTAS AT", "form": "Tablet"},
    {"name": "ANDIAL TAB", "form": "Tablet"},
    {"name": "ANERGEN", "form": "Medicine"},
    {"name": "ANERGEN TAB", "form": "Tablet"},
    {"name": "ANGICAM 2.5MG TAB", "form": "Tablet"},
    {"name": "ANGICAM 5MG", "form": "Tablet"},
    {"name": "ANGICAM BETA TAB", "form": "Tablet"},
    {"name": "ANGISPAN TR 2.5MG TAB", "form": "Tablet"},
    {"name": "ANGISPAN TR 6.5MG TAB", "form": "Tablet"},
    {"name": "ANGIZEM 30MG", "form": "Tablet"},
    {"name": "ANGIZEM CD 90MG", "form": "Tablet"},
    {"name": "ANOVATE CREAM", "form": "Cream"},
    {"name": "ANOVATE CREAM 20GM", "form": "Cream"},
    {"name": "ANXIT 0.25MG", "form": "Tablet"},
    {"name": "ANXIT 0.5MG", "form": "Tablet"},
    {"name": "APARCARMINE RAFT", "form": "Medicine"},
    {"name": "APPECIA BF TAB", "form": "Tablet"},
    {"name": "APTAMIL GOLD 1 REFIL 400GM", "form": "Tablet"},
    {"name": "APTAMIL GOLD 2 REFIL 400GM", "form": "Tablet"},
    {"name": "APTAMIL GOLD NO:1 TIN 400GM", "form": "Tablet"},
    {"name": "APTIMUST SYP 200ML", "form": "Syrup"},
    {"name": "APTISATRT SYP", "form": "Medicine"},
    {"name": "APTISTART SYP 200ML", "form": "Syrup"},
    {"name": "APTIVATE PINEAPPLE FLAVOUR SYP 175ML", "form": "Syrup"},
    {"name": "APTIVATE SYP 175ML", "form": "Syrup"},
    {"name": "APTIVATE SYP 200ML", "form": "Syrup"},
    {"name": "AQUAGERMINA ONE RESP", "form": "Medicine"},
    {"name": "AQUASOL-A VITAMIN A CAP", "form": "Capsule"},
    {"name": "AQUAZIDE 12.5MG TAB", "form": "Tablet"},
    {"name": "AQUAZIDE 25MG TAB", "form": "Tablet"},
    {"name": "ARADIM 0.25% CREAM 30GM", "form": "Cream"},
    {"name": "ARADIM 0.25% OINT", "form": "Medicine"},
    {"name": "ARBITAL H TAB", "form": "Tablet"},
    {"name": "ARBITEL 20MG", "form": "Tablet"},
    {"name": "ARBITEL 40MG", "form": "Tablet"},
    {"name": "ARBITEL AM TAB", "form": "Tablet"},
    {"name": "ARBITEL AV", "form": "Tablet"},
    {"name": "ARBITEL TRIO 25 TAB", "form": "Tablet"},
    {"name": "ARBITEL TRIO 50MG", "form": "Tablet"},
    {"name": "ARGIGEM", "form": "Sachet"},
    {"name": "ARGIGEM SACHET", "form": "Powder"},
    {"name": "ARGIHYPE SACHETS", "form": "Powder"},
    {"name": "ARGIPREG SACHET", "form": "Powder"},
    {"name": "ARILIZAR LIQUID 100ML", "form": "Syrup"},
    {"name": "ARISTO EMEGON SYP", "form": "Syrup"},
    {"name": "ARISTO FEBU 40 TAB", "form": "Tablet"},
    {"name": "ARISTO NEXOM RD CAP", "form": "Capsule"},
    {"name": "ARISTOMOX CV 625", "form": "Medicine"},
    {"name": "ARISTOMOX CV 625 TAB", "form": "Tablet"},
    {"name": "ARISTOMOX CV 625 TAB 10S", "form": "Tablet"},
    {"name": "ARISTOMOX CV DDS (WITH SWFI) SYP 30ML", "form": "Syrup"},
    {"name": "ARISTOMOX CV DDS SYP 30ML", "form": "Syrup"},
    {"name": "ARISTONEUROL OD", "form": "Medicine"},
    {"name": "ARISTONEUROL PLUS", "form": "Medicine"},
    {"name": "ARISTONEUROL PLUS CAP", "form": "Capsule"},
    {"name": "ARISTOVERT 16", "form": "Medicine"},
    {"name": "ARISTOVERT 16MG TAB", "form": "Tablet"},
    {"name": "ARISTOZYME DROPS 15ML", "form": "Drops"},
    {"name": "ARISTOZYME LIQ 200ML", "form": "Tablet"},
    {"name": "ARKAMIN 100MCG TAB", "form": "Tablet"},
    {"name": "ARKAMIN TABS", "form": "Tablet"},
    {"name": "ARLIN LINIMNT 100ML", "form": "Tablet"},
    {"name": "ARLIN LINIMNT 50ML", "form": "Tablet"},
    {"name": "AROLAC POWDER 45GM", "form": "Powder"},
    {"name": "ASCAZIN TAB", "form": "Tablet"},
    {"name": "ASCODEX JR LS DRP", "form": "Medicine"},
    {"name": "ASCODEX LS JUNIOR SYRP", "form": "Medicine"},
    {"name": "ASCORIL D JUNIOR 60ML", "form": "Tablet"},
    {"name": "ASCORIL DPLUS SYP 100ML", "form": "Syrup"},
    {"name": "ASCORIL EXP SYP 100ML", "form": "Syrup"},
    {"name": "ASCORIL LS DROPS 15ML", "form": "Drops"},
    {"name": "ASCORIL LS JUNIOR SYP 60ML", "form": "Syrup"},
    {"name": "ASCORIL LS SYP 100ML", "form": "Syrup"},
    {"name": "ASCORIL SF SYP 100ML", "form": "Syrup"},
    {"name": "ASSURANS TAB", "form": "Tablet"},
    {"name": "ASTHAKIND DX SUGAR FREE SYP 100ML", "form": "Syrup"},
    {"name": "ASTHAKIND DX SYP 100ML", "form": "Syrup"},
    {"name": "ASTHAKIND DX SYP 60ML", "form": "Syrup"},
    {"name": "ASTHAKIND EXP 100ML", "form": "Tablet"},
    {"name": "ASTHAKIND EXPT 60ML", "form": "Tablet"},
    {"name": "ASTHALIN 100MCG CFC FREE BOX OF 200MD METERED DOSE INHALER", "form": "Inhaler"},
    {"name": "ASTHALIN 100MCG CFC FREE INHALER", "form": "Inhaler"},
    {"name": "ASTHALIN 2MG TAB", "form": "Tablet"},
    {"name": "ASTHALIN 4MG TAB", "form": "Tablet"},
    {"name": "ASTHALIN CFC INH", "form": "Tablet"},
    {"name": "ASTHALIN REPSULES 2.5ML", "form": "Tablet"},
    {"name": "ASTHALIN RESP SOLUTION 15ML", "form": "Solution"},
    {"name": "ASTHALIN ROTACAPS", "form": "Capsule"},
    {"name": "ASTHALIN SYP 100ML", "form": "Syrup"},
    {"name": "ASTIN 10MG TAB", "form": "Tablet"},
    {"name": "ASTIN 20MG TAB", "form": "Tablet"},
    {"name": "ASTIN CV 10MG", "form": "Tablet"},
    {"name": "ASTYMIN C DROPS 15ML", "form": "Drops"},
    {"name": "ASTYMIN FORTE CAPS", "form": "Capsule"},
    {"name": "ASTYMIN LIQ 110ML", "form": "Tablet"},
    {"name": "ASTYMIN LIQ 200ML", "form": "Tablet"},
    {"name": "ATARAX 10MG TAB", "form": "Tablet"},
    {"name": "ATARAX 25MG TAB", "form": "Tablet"},
    {"name": "ATARAX 6MG ML DROP 15ML", "form": "Drops"},
    {"name": "ATARAX 6MG/ML DROP 15ML", "form": "Drops"},
    {"name": "ATARAX DROPS 15ML", "form": "Drops"},
    {"name": "ATARAX SYP 100ML", "form": "Syrup"},
    {"name": "ATAREX SYP 100ML", "form": "Syrup"},
    {"name": "ATARISE 10", "form": "Medicine"},
    {"name": "ATCHOL 10MG TAB", "form": "Tablet"},
    {"name": "ATCHOL 20MG TAB", "form": "Tablet"},
    {"name": "ATCHOL 40MG TAB", "form": "Tablet"},
    {"name": "ATEN 25 MG", "form": "Tablet"},
    {"name": "ATEN 25MG TAB", "form": "Tablet"},
    {"name": "ATEN 50MG TAB", "form": "Tablet"},
    {"name": "ATEN AM TAB", "form": "Tablet"},
    {"name": "ATEN-D TAB", "form": "Tablet"},
    {"name": "ATIVAN 1MG TAB", "form": "Tablet"},
    {"name": "ATIVAN 2MG TAB", "form": "Tablet"},
    {"name": "ATOCOR 10MGTAB", "form": "Tablet"},
    {"name": "ATOCOR 20MG TAB", "form": "Tablet"},
    {"name": "ATORBEST 10", "form": "Medicine"},
    {"name": "ATORBEST 20", "form": "Medicine"},
    {"name": "ATORBEST 20MG TAB", "form": "Tablet"},
    {"name": "ATORFIT 10MG TAB", "form": "Tablet"},
    {"name": "ATORFIT 20MG TAB", "form": "Tablet"},
    {"name": "ATORFIT CV 10MG TAB", "form": "Tablet"},
    {"name": "ATORFIT CV 20MG TAB", "form": "Tablet"},
    {"name": "ATORLIP 10MG TAB", "form": "Tablet"},
    {"name": "ATORLIP 20MG TAB", "form": "Tablet"},
    {"name": "ATORLIP 40MG", "form": "Tablet"},
    {"name": "ATORLIP 5MG TAB", "form": "Tablet"},
    {"name": "ATORSAVE 10MG TAB", "form": "Tablet"},
    {"name": "ATORSAVE 20MG TAB", "form": "Tablet"},
    {"name": "ATORSAVE 40MG TAB", "form": "Tablet"},
    {"name": "ATORSAVE CV 10MG TAB", "form": "Tablet"},
    {"name": "ATORVA 10MG TAB", "form": "Tablet"},
    {"name": "ATORVA 20MG TAB", "form": "Tablet"},
    {"name": "ATORVA 40MG TAB", "form": "Tablet"},
    {"name": "ATORVA 5MG TAB", "form": "Tablet"},
    {"name": "ATORVAKIND 10", "form": "Medicine"},
    {"name": "ATOSTA 10MG TAB", "form": "Tablet"},
    {"name": "ATOSTA 20MG TAB", "form": "Tablet"},
    {"name": "ATOSTA 40MG TAB", "form": "Tablet"},
    {"name": "ATOSTA F TAB", "form": "Tablet"},
    {"name": "AUGMENTIN 375MG TAB", "form": "Tablet"},
    {"name": "AUGMENTIN 625 DUO TAB", "form": "Tablet"},
    {"name": "AUGMENTIN 625MG TAB", "form": "Tablet"},
    {"name": "AUGMENTIN DUO SYP 30ML", "form": "Syrup"},
    {"name": "AUGUMENTIN DDS SYP 30ML", "form": "Syrup"},
    {"name": "AUGUMENTIN DUO SYP 30ML", "form": "Syrup"},
    {"name": "AUTRIN CAPS", "form": "Capsule"},
    {"name": "AVACRD AT 50/5 MG", "form": "Medicine"},
    {"name": "AVAS 10MG TAB", "form": "Tablet"},
    {"name": "AVAS 20MG TAB", "form": "Tablet"},
    {"name": "AVAS 5MG TAB", "form": "Tablet"},
    {"name": "AVAS CV 10MG TAB", "form": "Tablet"},
    {"name": "AVEENO BABY WASH SHAMPOO", "form": "Medicine"},
    {"name": "AVIL 25MG TAB", "form": "Tablet"},
    {"name": "AVIL 50MG TAB", "form": "Tablet"},
    {"name": "AVOMINE TAB", "form": "Tablet"},
    {"name": "AXCER 60MG TAB", "form": "Tablet"},
    {"name": "AXCER 90 TAB", "form": "Tablet"},
    {"name": "AXE OIL 10ML", "form": "Oil"},
    {"name": "AXE OIL 28ML", "form": "Oil"},
    {"name": "AXE OIL 3ML", "form": "Oil"},
    {"name": "AXE OIL 56ML", "form": "Oil"},
    {"name": "AXE OIL 5ML", "form": "Oil"},
    {"name": "AZEE 500MG TAB", "form": "Tablet"},
    {"name": "AZEE XL 200MG LIQUID 30ML", "form": "Syrup"},
    {"name": "AZEE XL 200MG LIQUID PEPPERMINT & ORANGE 30ML", "form": "Liquid"},
    {"name": "AZIBACT 250MG TAB", "form": "Tablet"},
    {"name": "AZIBACT 500MG TAB", "form": "Tablet"},
    {"name": "AZIKIND 250", "form": "Medicine"},
    {"name": "AZIKIND 500", "form": "Medicine"},
    {"name": "AZIPRO 250MG TAB", "form": "Tablet"},
    {"name": "AZITHRAL 250MG TAB", "form": "Tablet"},
    {"name": "AZITHRAL 500MG TAB", "form": "Tablet"},
    {"name": "AZITHRAL LIQUID 100MG", "form": "Syrup"},
    {"name": "AZITHRAL LIQUID 200MG", "form": "Syrup"},
    {"name": "AZORAN 50MG TAB", "form": "Tablet"},
    {"name": "AZTOGOLD 10 MG", "form": "Tablet"},
    {"name": "AZTOGOLD 20MG", "form": "Tablet"},
    {"name": "AZTOLET 10MG TAB", "form": "Tablet"},
    {"name": "AZTOLET 20MG TAB", "form": "Tablet"},
    {"name": "AZTOR 10MG TAB", "form": "Tablet"},
    {"name": "AZTOR 20MG TAB", "form": "Tablet"},
    {"name": "AZTOR 40MG TAB", "form": "Tablet"},
    {"name": "AZTOR 5MG TAB", "form": "Tablet"},
    {"name": "AZTOR ASP 75MG", "form": "Tablet"},
    {"name": "AZTOR-EZ-TAB", "form": "Tablet"},
    {"name": "AZULIX 1MF", "form": "Tablet"},
    {"name": "AZULIX 1MF FORTE TAB", "form": "Tablet"},
    {"name": "AZULIX 1MG TAB", "form": "Tablet"},
    {"name": "AZULIX 2MF FORTE", "form": "Tablet"},
    {"name": "AZULIX 2MF TAB", "form": "Tablet"},
    {"name": "AZULIX 2MG TAB", "form": "Tablet"},
    {"name": "AZULIX 3MF", "form": "Tablet"},
    {"name": "AZULIX 3MG TAB", "form": "Tablet"},
    {"name": "AZULIX 4MG TAB", "form": "Tablet"},
    {"name": "B METHYL 16", "form": "Medicine"},
    {"name": "B METHYL 4 MG", "form": "Medicine"},
    {"name": "B PROTIN CHOC 200GM", "form": "Tablet"},
    {"name": "B PROTIN CHOC 500GM", "form": "Tablet"},
    {"name": "B-LONG", "form": "Tablet"},
    {"name": "BACTRIM DS TAB", "form": "Tablet"},
    {"name": "BAIDYANATH ISABGOL 100GM", "form": "Tablet"},
    {"name": "BANDY PLUS TAB 1'S", "form": "Tablet"},
    {"name": "BANOCIDE 50MG TAB", "form": "Tablet"},
    {"name": "BANOCIDE FORTE TAB", "form": "Tablet"},
    {"name": "BASALOG 3ML REFIL", "form": "Tablet"},
    {"name": "BASALOG 5ML VIAL", "form": "Injection"},
    {"name": "BAYER'S TONIC 250ML", "form": "Tablet"},
    {"name": "BD DISCARDIT 2 24*1 2ML", "form": "Medicine"},
    {"name": "BD DISCARDIT II SYRINGE 5ML", "form": "Syringe"},
    {"name": "BD GLIDE ULTRA FINE INSULIN SYRINGE 40IU 1ML", "form": "Device"},
    {"name": "BECADEXAMINE CAPS", "form": "Capsule"},
    {"name": "BECELAC FORTZ CAPS", "form": "Capsule"},
    {"name": "BECOSULES CAPS", "form": "Capsule"},
    {"name": "BECOSULES Z CAP", "form": "Capsule"},
    {"name": "BECOSULES Z CAP: 20 CAP", "form": "Medicine"},
    {"name": "BECOZINC CAPS", "form": "Capsule"},
    {"name": "BECOZYME C FORTE", "form": "Tablet"},
    {"name": "BELIV AF", "form": "Medicine"},
    {"name": "BENADON 40MG TAB", "form": "Tablet"},
    {"name": "BENADON 40MG TABLET TAB", "form": "Tablet"},
    {"name": "BENADON TAB", "form": "Tablet"},
    {"name": "BENADRY DR 100ML", "form": "Tablet"},
    {"name": "BENADRY DR 50ML", "form": "Tablet"},
    {"name": "BENADRYL CF 50ML", "form": "Tablet"},
    {"name": "BENADRYL CF SYP 450ML", "form": "Syrup"},
    {"name": "BENADRYL COUGH FORMULA SYP 50ML", "form": "Syrup"},
    {"name": "BENADRYL-CF-SYP 150ML", "form": "Syrup"},
    {"name": "BENDEX", "form": "Medicine"},
    {"name": "BENDEX 400MG TAB", "form": "Tablet"},
    {"name": "BENDEX CHERRY SYRP", "form": "Medicine"},
    {"name": "BEPLEX FORTE TAB", "form": "Tablet"},
    {"name": "BESIFLAM SYP 60ML", "form": "Syrup"},
    {"name": "BESIFLAM SYRUP", "form": "Medicine"},
    {"name": "BETACAP 10MG CAP", "form": "Capsule"},
    {"name": "BETACAP 20MG TAB", "form": "Tablet"},
    {"name": "BETACAP TR 20MG", "form": "Capsule"},
    {"name": "BETACAP TR 40MG TAB", "form": "Tablet"},
    {"name": "BETACARD 25MG TAB", "form": "Tablet"},
    {"name": "BETACARD 50MG TAB", "form": "Tablet"},
    {"name": "BETACARD AM TAB", "form": "Tablet"},
    {"name": "BETADINE GARGLE 100ML", "form": "Tablet"},
    {"name": "BETADINE GARGLE 50ML", "form": "Tablet"},
    {"name": "BETADINE PESSARY", "form": "Medicine"},
    {"name": "BETADINE POWDER 10GM", "form": "Powder"},
    {"name": "BETADINE SOLUTION 100ML", "form": "Solution"},
    {"name": "BETADINE-OINT 20GM", "form": "Cream"},
    {"name": "BETALOC 25MG TAB", "form": "Tablet"},
    {"name": "BETALOC 50MG TAB", "form": "Tablet"},
    {"name": "BETAVERT 16MG TAB", "form": "Tablet"},
    {"name": "BETAVERT 8MG TAB", "form": "Tablet"},
    {"name": "BETHNEVOID 25", "form": "Medicine"},
    {"name": "BETNESOL FORTE TAB", "form": "Tablet"},
    {"name": "BETNESOL N E/E DROPS 5ML", "form": "Drops"},
    {"name": "BETNESOL ORAL DROPS 15ML", "form": "Drops"},
    {"name": "BETNESOL TAB", "form": "Tablet"},
    {"name": "BETNOVATE C CREAM 30GM", "form": "Cream"},
    {"name": "BETNOVATE N CREAM 25GM", "form": "Cream"},
    {"name": "BETNOVATE- GM 20GM", "form": "Tablet"},
    {"name": "BETNOVATE- OINT 20GM", "form": "Cream"},
    {"name": "BETNOVATE- S OINT 20GM", "form": "Cream"},
    {"name": "BETONIN AST SYP 200ML", "form": "Syrup"},
    {"name": "BIFILAC CAPS", "form": "Capsule"},
    {"name": "BIFILAC DRY SYP 50ML", "form": "Syrup"},
    {"name": "BIFILAC HP CAPS", "form": "Capsule"},
    {"name": "BIFILAC SACHETS", "form": "Powder"},
    {"name": "BILATEK M", "form": "Medicine"},
    {"name": "BILAXL M TAB", "form": "Tablet"},
    {"name": "BIO D3 CAPS", "form": "Capsule"},
    {"name": "BIO-D3 PLUS", "form": "Tablet"},
    {"name": "BIOCIB P TAB", "form": "Tablet"},
    {"name": "BIOCIB T4", "form": "Medicine"},
    {"name": "BIOSKIN SOAP 75GM", "form": "Soap"},
    {"name": "BIOVEIN FORTE", "form": "Medicine"},
    {"name": "BIS BETA 5MG TAB", "form": "Tablet"},
    {"name": "BIS-BETA 2.5MG TAB", "form": "Tablet"},
    {"name": "BISONOL 2.5MG TAB", "form": "Tablet"},
    {"name": "BLACK PERFUME", "form": "Medicine"},
    {"name": "BON K2 TAB", "form": "Tablet"},
    {"name": "BONNISAN 100ML SYP", "form": "Syrup"},
    {"name": "BONNISAN 200ML", "form": "Tablet"},
    {"name": "BONNISAN DROPS 30ML", "form": "Drops"},
    {"name": "BOROPLUS ANTISEPTIC CREAM 120ML", "form": "Cream"},
    {"name": "BRILINTA 90M MG TAB", "form": "Tablet"},
    {"name": "BRO COFDEX SYP", "form": "Medicine"},
    {"name": "BRO ZEDEX SF SYP 100ML", "form": "Syrup"},
    {"name": "BRO ZEDEX SYP 100ML", "form": "Syrup"},
    {"name": "BRONCHOFIL N", "form": "Medicine"},
    {"name": "BRUFEN 200MG TAB", "form": "Tablet"},
    {"name": "BRUFEN 400MG TAB", "form": "Tablet"},
    {"name": "BRUFEN 600MG TAB", "form": "Tablet"},
    {"name": "BRUTACROSS 100", "form": "Medicine"},
    {"name": "BRUTACROSS CV 200", "form": "Medicine"},
    {"name": "BRUTACROSS CV D/S SYP 30ML", "form": "Syrup"},
    {"name": "BRUTACROSS CV SYP 30ML", "form": "Syrup"},
    {"name": "BRUTIFUR 100", "form": "Medicine"},
    {"name": "BUDAMATE 100 INHLR", "form": "Inhaler"},
    {"name": "BUDAMATE 100TRANSCAP", "form": "Capsule"},
    {"name": "BUDAMATE 200 INH", "form": "Tablet"},
    {"name": "BUDAMATE 200 TRANSCAP", "form": "Capsule"},
    {"name": "BUDAMATE 400 INH", "form": "Tablet"},
    {"name": "BUDAMATE 400 TRANSCAP", "form": "Capsule"},
    {"name": "BUDECORT 0.5MG REPSULES 2ML", "form": "Tablet"},
    {"name": "BUDECORT 100MG INHLR", "form": "Inhaler"},
    {"name": "BUDECORT 200 INHLR", "form": "Inhaler"},
    {"name": "BUDECORT 200MG R/CAP", "form": "Capsule"},
    {"name": "BUDECORT 400MG R/C", "form": "Tablet"},
    {"name": "BUDESAL 0.5MG REPS 5ML", "form": "Tablet"},
    {"name": "BUDICORT 200 CFC I/H", "form": "Tablet"},
    {"name": "BURNHEAL", "form": "Medicine"},
    {"name": "BURNHEAL CREAM 15GM", "form": "Cream"},
    {"name": "BURNOL 10GM OINT", "form": "Cream"},
    {"name": "BURNOL 20GM OINT", "form": "Cream"},
    {"name": "BUSCOGAST INJ 1ML", "form": "Injection"},
    {"name": "BUSCOGAST TAB", "form": "Tablet"},
    {"name": "BUTA PROXYVON CAPS", "form": "Capsule"},
    {"name": "CABERLIN 0.25MG TAB", "form": "Tablet"},
    {"name": "CABERLIN 0.5MG TAB", "form": "Tablet"},
    {"name": "CABGOLIN .25MG TAB", "form": "Tablet"},
    {"name": "CABGOLIN 0.5MG TAB", "form": "Tablet"},
    {"name": "CACEF CV 100MG SUSP 30ML", "form": "Syrup"},
    {"name": "CALADRYL LOTION 120ML", "form": "Lotion"},
    {"name": "CALADRYL LOTION 60ML", "form": "Lotion"},
    {"name": "CALADRYL LOTION 65ML", "form": "Lotion"},
    {"name": "CALAMINE LOTION", "form": "Medicine"},
    {"name": "CALAPTIN 40MG TAB", "form": "Tablet"},
    {"name": "CALAPTIN 80MG TAB", "form": "Tablet"},
    {"name": "CALAPURE A LOTION 100ML", "form": "Lotion"},
    {"name": "CALAPURE A LOTION 50ML", "form": "Lotion"},
    {"name": "CALCICARD RETD 20MG TAB", "form": "Tablet"},
    {"name": "CALCIFIT 500MG 30S TAB", "form": "Tablet"},
    {"name": "CALCIFIT 500MG TAB", "form": "Tablet"},
    {"name": "CALCIGAL D3 SHOTS", "form": "Tablet"},
    {"name": "CALCIGARD 10 TAB", "form": "Tablet"},
    {"name": "CALCIGARD 5MG TAB", "form": "Tablet"},
    {"name": "CALCIGARD RET 10MG", "form": "Tablet"},
    {"name": "CALCIGEN D3", "form": "Medicine"},
    {"name": "CALCIMAX 500MG TAB", "form": "Tablet"},
    {"name": "CALCIMAX FORTE", "form": "Tablet"},
    {"name": "CALCIROL 800IU DROPS 15ML", "form": "Drops"},
    {"name": "CALCIROL GRANULES 1GM", "form": "Powder"},
    {"name": "CALCIROL PLUS TAB", "form": "Tablet"},
    {"name": "CALCIROL SOFTGELS", "form": "Cream"},
    {"name": "CALCIROL SYRUP 100ML", "form": "Syrup"},
    {"name": "CALDIMINT CORAL", "form": "Medicine"},
    {"name": "CALDIMINT CORAL TAB", "form": "Tablet"},
    {"name": "CALDIMINT FEM", "form": "Medicine"},
    {"name": "CALFLIP D3", "form": "Medicine"},
    {"name": "CALFLIP D3 TAB", "form": "Tablet"},
    {"name": "CALFLIP QUICK", "form": "Tablet"},
    {"name": "CALFLIP QUICK TAB", "form": "Tablet"},
    {"name": "CALOSOFT AF LOTION 50ML", "form": "Lotion"},
    {"name": "CALOSOFT-AF LOTION 100ML", "form": "Lotion"},
    {"name": "CALPAL-T TAB", "form": "Tablet"},
    {"name": "CALPOL 120 SYP 30ML", "form": "Syrup"},
    {"name": "CALPOL 250MG SUSP 60ML", "form": "Syrup"},
    {"name": "CALPOL 250MG SYP 60ML", "form": "Syrup"},
    {"name": "CALPOL 500MG TAB", "form": "Tablet"},
    {"name": "CALPOL 650MG TAB", "form": "Tablet"},
    {"name": "CALPOL PEAD DROPS 15ML", "form": "Drops"},
    {"name": "CANAZOLE MOUTH PAINT", "form": "Medicine"},
    {"name": "CANDIBIOTIC PLUS EAR DROPS", "form": "Drops"},
    {"name": "CANDIBIOTIC PLUS EAR DROPS 5ML", "form": "Drops"},
    {"name": "CANDID B 10GM", "form": "Tablet"},
    {"name": "CANDID B CREAM 20GM", "form": "Cream"},
    {"name": "CANDID B LOTION 30ML", "form": "Lotion"},
    {"name": "CANDID B20GM OINT", "form": "Cream"},
    {"name": "CANDID CREAM 30GM", "form": "Cream"},
    {"name": "CANDID DUSTING POWDER 120GM", "form": "Powder"},
    {"name": "CANDID E/DROPS", "form": "Drops"},
    {"name": "CANDID EAR DROPS 10ML", "form": "Drops"},
    {"name": "CANDID MOUTH PAINT 25ML", "form": "Tablet"},
    {"name": "CANDID POWDER 50GM", "form": "Powder"},
    {"name": "CANDID POWDERS 120GM", "form": "Powder"},
    {"name": "CANDID SOAP 125GM", "form": "Soap"},
    {"name": "CANDID SOAP 75GM", "form": "Soap"},
    {"name": "CANDID TOTAL +CREAM 20GM", "form": "Cream"},
    {"name": "CANDID TV LOTION 75ML", "form": "Lotion"},
    {"name": "CANDID V GEL 30GM", "form": "Cream"},
    {"name": "CANDID V6 TAB", "form": "Tablet"},
    {"name": "CANDIDERMA 10GM CREAM", "form": "Cream"},
    {"name": "CANDIDERMA 20GM CREAM", "form": "Cream"},
    {"name": "CANDIFORCE 100MG TAB", "form": "Tablet"},
    {"name": "CANDIPRAZ 100", "form": "Medicine"},
    {"name": "CANDIPRAZ 200", "form": "Medicine"},
    {"name": "CANSOFT CL SUPPOSITOR", "form": "Tablet"},
    {"name": "CANZOLE B LOTION", "form": "Medicine"},
    {"name": "CARBOPHAGE G1", "form": "Tablet"},
    {"name": "CARBOPHAGE G2", "form": "Tablet"},
    {"name": "CARBOPHAGE XR 1000 TAB", "form": "Tablet"},
    {"name": "CARBOPHAGE XR 500MG", "form": "Tablet"},
    {"name": "CARCA 6.25MG TAB", "form": "Tablet"},
    {"name": "CARCA3.125MG TAB", "form": "Tablet"},
    {"name": "CARDACE 1.25MG TAB", "form": "Tablet"},
    {"name": "CARDACE 10MG TAB", "form": "Tablet"},
    {"name": "CARDACE 2.5MG TAB", "form": "Tablet"},
    {"name": "CARDACE 5MG TAB", "form": "Tablet"},
    {"name": "CARDACE AM 2.5MG", "form": "Tablet"},
    {"name": "CARDACE AM 5MG TAB", "form": "Tablet"},
    {"name": "CARDACE H 2.5MG TAB", "form": "Tablet"},
    {"name": "CARDACE H 5MG", "form": "Tablet"},
    {"name": "CARDACE METO 2.5/25MG TAB", "form": "Tablet"},
    {"name": "CARDACE METO 5/50MG", "form": "Tablet"},
    {"name": "CARDACE PROTECT 2.5MG TAB", "form": "Tablet"},
    {"name": "CARDACE PROTECT 5MG TAB", "form": "Tablet"},
    {"name": "CARDARONE TAB", "form": "Tablet"},
    {"name": "CARDIDON MR", "form": "Tablet"},
    {"name": "CARDIOROSTIN 10MG TAB", "form": "Tablet"},
    {"name": "CARDIPURE 10", "form": "Medicine"},
    {"name": "CARDIPURE T", "form": "Medicine"},
    {"name": "CARDIPURE T TAB", "form": "Tablet"},
    {"name": "CARDIVAS 12.5", "form": "Tablet"},
    {"name": "CARDIVAS 25MG TAB", "form": "Tablet"},
    {"name": "CARDIVAS 3.125 TAB", "form": "Tablet"},
    {"name": "CARDIVAS 6.25", "form": "Tablet"},
    {"name": "CARDIVAS CR 10MG TAB", "form": "Tablet"},
    {"name": "CARDIVAS CR 20MG TAB", "form": "Tablet"},
    {"name": "CARDORONE X 200MG", "form": "Tablet"},
    {"name": "CAREBACT", "form": "Medicine"},
    {"name": "CAREFIT", "form": "Medicine"},
    {"name": "CAREFIT TAB", "form": "Tablet"},
    {"name": "CARIFORD TAB", "form": "Medicine"},
    {"name": "CARITERO", "form": "Medicine"},
    {"name": "CARITERO TAB", "form": "Tablet"},
    {"name": "CARLOC 12.5MG TAB", "form": "Tablet"},
    {"name": "CARLOC 3.125MG TAB", "form": "Tablet"},
    {"name": "CARLOC 6.25MG TAB", "form": "Tablet"},
    {"name": "CARNISURE 500MG", "form": "Tablet"},
    {"name": "CARTIFLOW TAB", "form": "Medicine"},
    {"name": "CARTIGEN DN", "form": "Medicine"},
    {"name": "CARTIGEN DN TAB", "form": "Tablet"},
    {"name": "CARTIGEN FORTE + TAB", "form": "Tablet"},
    {"name": "CARTIGEN FORTE TAB", "form": "Tablet"},
    {"name": "CARTIGEN PRO 10 TAB", "form": "Tablet"},
    {"name": "CARVI BETA-6.25MG TAB", "form": "Tablet"},
    {"name": "CARVI-BRETA 3.125MG TAB", "form": "Tablet"},
    {"name": "CARVIBETA-12.5MGTAB", "form": "Tablet"},
    {"name": "CARVIDON 20 MG", "form": "Tablet"},
    {"name": "CARVIDON MR", "form": "Tablet"},
    {"name": "CARVIDON OD CAPS", "form": "Capsule"},
    {"name": "CARVISTAR 3.125MG TAB", "form": "Tablet"},
    {"name": "CARVISTAR 6.25MG", "form": "Tablet"},
    {"name": "CASTOR D EYE EAR", "form": "Medicine"},
    {"name": "CAVERTA 100MG", "form": "Tablet"},
    {"name": "CAVERTA 25MG TAB", "form": "Tablet"},
    {"name": "CAVERTA 50MG", "form": "Tablet"},
    {"name": "CCD 4 FLAVOURS 1300 PIECES", "form": "Tablet"},
    {"name": "CCM TAB", "form": "Tablet"},
    {"name": "CEFABLAST 250", "form": "Medicine"},
    {"name": "CEFABLAST 250MG TAB", "form": "Tablet"},
    {"name": "CEFAKIND CV 250MG TAB", "form": "Tablet"},
    {"name": "CEFAKIND CV500MG TAB", "form": "Tablet"},
    {"name": "CEFASYN 250 MG", "form": "Medicine"},
    {"name": "CEFASYN 250MG TAB", "form": "Tablet"},
    {"name": "CEFASYN 500", "form": "Medicine"},
    {"name": "CEFASYN 500MG TAB", "form": "Tablet"},
    {"name": "CEFIX 200MG TAB", "form": "Tablet"},
    {"name": "CEFIX 50MG SYRUP", "form": "Syrup"},
    {"name": "CEFPER 500", "form": "Medicine"},
    {"name": "CEFPER 500MG TAB", "form": "Tablet"},
    {"name": "CEFPER CV", "form": "Medicine"},
    {"name": "CEFTUM 250MG", "form": "Tablet"},
    {"name": "CEFTUM-500MG TAB", "form": "Tablet"},
    {"name": "CEFUVAX 250 TAB", "form": "Tablet"},
    {"name": "CEFUVAX 500 TAB", "form": "Tablet"},
    {"name": "CELIN 500MG TAB", "form": "Tablet"},
    {"name": "CEPODEM 100MG TAB", "form": "Tablet"},
    {"name": "CEPODEM 200MG TAB", "form": "Tablet"},
    {"name": "CEPODEM 50MG SYP 30ML", "form": "Syrup"},
    {"name": "CEPODEM DT 100MG TAB", "form": "Tablet"},
    {"name": "CERIZ 10 MG", "form": "Medicine"},
    {"name": "CETAPHIL BABY MILD B 75GM", "form": "Tablet"},
    {"name": "CETAPHIL BABY MILD BAR 75GM", "form": "Soap"},
    {"name": "CETAPHIL BAR 75GM", "form": "Tablet"},
    {"name": "CETAPHIL CLEANSING SOAP 75GM", "form": "Soap"},
    {"name": "CETAPHIL DAM 30GM", "form": "Tablet"},
    {"name": "CETAPHIL GENTLE SKIN CLEANSER", "form": "Medicine"},
    {"name": "CETAPHIL GENTLE SKIN CLEAR 125ML", "form": "Tablet"},
    {"name": "CETAPHIL MOIST CREAM 80GM", "form": "Cream"},
    {"name": "CETAPHIL MOIST LOTION 100ML", "form": "Lotion"},
    {"name": "CETAPHIL MOIST LOTION 250ML", "form": "Lotion"},
    {"name": "CETAPHIL OILY SKIN", "form": "Medicine"},
    {"name": "CETAPIN XR-1000MG TAB", "form": "Tablet"},
    {"name": "CETAPIN XR-500MG TAB", "form": "Tablet"},
    {"name": "CETCIP SYP 30ML", "form": "Syrup"},
    {"name": "CETPHIL MOISTURISING", "form": "Medicine"},
    {"name": "CETRIZENE 10", "form": "Medicine"},
    {"name": "CETZINE SYP 60ML", "form": "Syrup"},
    {"name": "CETZINE TAB", "form": "Tablet"},
    {"name": "CFURO CV SYP 30ML", "form": "Syrup"},
    {"name": "CHANGE M SYP 30ML", "form": "Syrup"},
    {"name": "CHEERIO GEL 75GM", "form": "Cream"},
    {"name": "CHERICOF 60ML", "form": "Tablet"},
    {"name": "CHERICOF LS SYP 100ML", "form": "Syrup"},
    {"name": "CHERICOF SYP 100ML", "form": "Syrup"},
    {"name": "CHESTON AX SYP", "form": "Medicine"},
    {"name": "CHESTON AX SYP 100ML", "form": "Syrup"},
    {"name": "CHESTON AX SYRUP", "form": "Medicine"},
    {"name": "CHESTON COLD TOTAL", "form": "Medicine"},
    {"name": "CHESTON COLD TOTAL TAB", "form": "Tablet"},
    {"name": "CHESTON PLUS EXPECTORANT 100ML", "form": "Tablet"},
    {"name": "CHESTON PLUS SYP", "form": "Medicine"},
    {"name": "CHORONEX GEL", "form": "Medicine"},
    {"name": "CHORONEX TAB", "form": "Tablet"},
    {"name": "CHORONEX TABLET TAB", "form": "Tablet"},
    {"name": "CHYMORAL FORTE", "form": "Tablet"},
    {"name": "CHYMORAL FORTE 20 TAB", "form": "Tablet"},
    {"name": "CHYMORAL FORTE TAB", "form": "Tablet"},
    {"name": "CHYMORAL PLUS", "form": "Tablet"},
    {"name": "CHYMORIXL FORTE", "form": "Medicine"},
    {"name": "CHYMORIXL FORTE TAB", "form": "Tablet"},
    {"name": "CHYMOTAS FORTE TAB", "form": "Tablet"},
    {"name": "CHYMOTAS FORTE TAB: 20 TAB", "form": "Tablet"},
    {"name": "CIDMUS 100MG TAB", "form": "Tablet"},
    {"name": "CIDMUS 200MG TAB", "form": "Tablet"},
    {"name": "CIDMUS 50MG TAB", "form": "Tablet"},
    {"name": "CIFRAN 250MG TAB", "form": "Tablet"},
    {"name": "CIFRAN 500MG TAB", "form": "Tablet"},
    {"name": "CIFRAN CT TAB", "form": "Tablet"},
    {"name": "CILACAR 10MG TAB", "form": "Tablet"},
    {"name": "CILACAR 20MG TAB", "form": "Tablet"},
    {"name": "CILACAR 5MG TAB", "form": "Tablet"},
    {"name": "CILACAR M 10/25MG TAB", "form": "Tablet"},
    {"name": "CILACAR M 10/50MG", "form": "Tablet"},
    {"name": "CILACAR T", "form": "Tablet"},
    {"name": "CILAHEART 10MG TAB", "form": "Tablet"},
    {"name": "CILAHEART 20MG", "form": "Tablet"},
    {"name": "CILAHEART 5MG TAB", "form": "Tablet"},
    {"name": "CILAHEART T TAB 6X10'S", "form": "Tablet"},
    {"name": "CILODOC 100MG", "form": "Tablet"},
    {"name": "CILODOC 50MG TABS", "form": "Tablet"},
    {"name": "CILOGARD 10MG TAB", "form": "Tablet"},
    {"name": "CILOGARD 5 MG", "form": "Medicine"},
    {"name": "CILOGARD 5MG TAB", "form": "Tablet"},
    {"name": "CILOSTAHEAL 50MG TAB", "form": "Tablet"},
    {"name": "CILOSTAHEAL 50MG TABS", "form": "Tablet"},
    {"name": "CINABET", "form": "Medicine"},
    {"name": "CINABET 16", "form": "Medicine"},
    {"name": "CINABET 8", "form": "Medicine"},
    {"name": "CINABET 8MG TAB", "form": "Tablet"},
    {"name": "CINAFREE PLUS", "form": "Medicine"},
    {"name": "CINALOC 5", "form": "Medicine"},
    {"name": "CINALOC M10", "form": "Medicine"},
    {"name": "CINALOC T", "form": "Medicine"},
    {"name": "CINAVAX D TAB", "form": "Tablet"},
    {"name": "CINOD 10MG TAB", "form": "Tablet"},
    {"name": "CINOD 20MG", "form": "Tablet"},
    {"name": "CINOD 5MG", "form": "Tablet"},
    {"name": "CINOD T", "form": "Tablet"},
    {"name": "CIPANATE CV 325MG TAB", "form": "Tablet"},
    {"name": "CIPANATE CV 375", "form": "Medicine"},
    {"name": "CIPANATE FORTE DDS SYR", "form": "Medicine"},
    {"name": "CIPCAL 250MG TAB", "form": "Tablet"},
    {"name": "CIPCAL 500MG TAB", "form": "Tablet"},
    {"name": "CIPCAL D3 60 K CAP", "form": "Medicine"},
    {"name": "CIPCAL D3 CAP", "form": "Capsule"},
    {"name": "CIPCAL HD 15TAB 15TAB", "form": "Medicine"},
    {"name": "CIPCAL HD TAB", "form": "Tablet"},
    {"name": "CIPCAL SYP 150ML", "form": "Syrup"},
    {"name": "CIPCAL SYRUP", "form": "Medicine"},
    {"name": "CIPLACTIN SYP", "form": "Syrup"},
    {"name": "CIPLACTIN SYRP", "form": "Medicine"},
    {"name": "CIPLADIEN GARGLE", "form": "Medicine"},
    {"name": "CIPLADINE 5% OINT", "form": "Cream"},
    {"name": "CIPLADINE 5% POWDER 10GM", "form": "Powder"},
    {"name": "CIPLADINE 5% SOLUTION 100ML", "form": "Solution"},
    {"name": "CIPLADINE GARGLE LIQUID 100ML", "form": "Syrup"},
    {"name": "CIPLADINE OINT 10GM", "form": "Cream"},
    {"name": "CIPLADINE OINT 20GM", "form": "Cream"},
    {"name": "CIPLADINE OINT 30GM", "form": "Cream"},
    {"name": "CIPLADINE SOLUTION 100ML", "form": "Solution"},
    {"name": "CIPLAR 10MG TAB", "form": "Tablet"},
    {"name": "CIPLAR 40MG TAB", "form": "Tablet"},
    {"name": "CIPLAR LA 20MG", "form": "Tablet"},
    {"name": "CIPLAR LA 20MG TAB", "form": "Tablet"},
    {"name": "CIPLAR LA 40MG", "form": "Tablet"},
    {"name": "CIPLOX 500MG", "form": "Tablet"},
    {"name": "CIPLOX D E/DROPS 10ML", "form": "Drops"},
    {"name": "CIPLOX D EYE EAR DROPS 10ML", "form": "Drops"},
    {"name": "CIPLOX D EYE/EAR DROPS 10ML", "form": "Drops"},
    {"name": "CIPLOX E/E DROPS 10ML", "form": "Drops"},
    {"name": "CIPLOX EYE EAR DROPS 10ML", "form": "Drops"},
    {"name": "CIPLOX EYE/EAR DROPS 10ML", "form": "Drops"},
    {"name": "CIPLOX TZ", "form": "Tablet"},
    {"name": "CIPRODAC 250", "form": "Medicine"},
    {"name": "CIPZEN D", "form": "Medicine"},
    {"name": "CIPZEN D TAB", "form": "Tablet"},
    {"name": "CIPZOX", "form": "Medicine"},
    {"name": "CIPZOX 10S TAB", "form": "Tablet"},
    {"name": "CIPZOX TAB", "form": "Tablet"},
    {"name": "CIPZOX TAB 6S", "form": "Tablet"},
    {"name": "CITAL SYP 100ML", "form": "Syrup"},
    {"name": "CITRALKA SYP 100ML", "form": "Syrup"},
    {"name": "CITRO FLO B6", "form": "Medicine"},
    {"name": "CITROFLO B6 LIQUID 200ML", "form": "Syrup"},
    {"name": "CLARIBID 250MG DRY SYP 30ML", "form": "Syrup"},
    {"name": "CLARIBID 500MG TAB", "form": "Tablet"},
    {"name": "CLARIBID SYP 30ML", "form": "Syrup"},
    {"name": "CLARINOVA 250MG TAB", "form": "Tablet"},
    {"name": "CLARIXL 250", "form": "Medicine"},
    {"name": "CLARIXL 250 TAB", "form": "Tablet"},
    {"name": "CLARIXL 500", "form": "Medicine"},
    {"name": "CLARIXL 500 TAB", "form": "Tablet"},
    {"name": "CLAVAM 375 TAB", "form": "Tablet"},
    {"name": "CLAVAM 625 TAB", "form": "Tablet"},
    {"name": "CLAVAM BID DRY SYP 30ML", "form": "Syrup"},
    {"name": "CLAVAM DROPS 10ML", "form": "Drops"},
    {"name": "CLAVAM DRY SYP 30ML", "form": "Syrup"},
    {"name": "CLAVIX 75MG", "form": "Tablet"},
    {"name": "CLAVIX AS 75MG TAB", "form": "Tablet"},
    {"name": "CLEARWAX EAR DROPS 10ML", "form": "Drops"},
    {"name": "CLINDOAID 300", "form": "Medicine"},
    {"name": "CLINEP 10", "form": "Medicine"},
    {"name": "CLINEPEU PESARY", "form": "Medicine"},
    {"name": "CLINISOL GEL", "form": "Medicine"},
    {"name": "CLINPEU 300 MG", "form": "Medicine"},
    {"name": "CLINSOL GEL 15GM", "form": "Cream"},
    {"name": "CLINSTEP FORTE", "form": "Medicine"},
    {"name": "CLINSTEP FORTE CAP", "form": "Capsule"},
    {"name": "CLINSTICK 300 CAP", "form": "Capsule"},
    {"name": "CLISTOAZOL 50", "form": "Medicine"},
    {"name": "CLOCIP B CREAM 10GM", "form": "Cream"},
    {"name": "CLOCIP CREAM 15GM", "form": "Cream"},
    {"name": "CLOCIP KZ SOAP 75GM", "form": "Soap"},
    {"name": "CLOCIP L CREAM 10GM", "form": "Cream"},
    {"name": "CLOET-GM", "form": "Medicine"},
    {"name": "CLOHEX MOUTHWASH LIQUID 150ML", "form": "Syrup"},
    {"name": "CLOMIYES 25", "form": "Medicine"},
    {"name": "CLOMIYES 25 TAB", "form": "Tablet"},
    {"name": "CLOMIYES 50", "form": "Medicine"},
    {"name": "CLONIT S OINT 20GM", "form": "Cream"},
    {"name": "CLONOTRIL 0.25MG TAB", "form": "Tablet"},
    {"name": "CLONOTRIL 0.5MG", "form": "Tablet"},
    {"name": "CLONOTRIL 2MG TAB", "form": "Tablet"},
    {"name": "CLOP-G-CREAM 30GM", "form": "Cream"},
    {"name": "CLOPILET 150MG TAB", "form": "Tablet"},
    {"name": "CLOPILET 75MG TAB", "form": "Tablet"},
    {"name": "CLOPILET A 150 TAB", "form": "Tablet"},
    {"name": "CLOPILET A75MG TAB", "form": "Tablet"},
    {"name": "CLOPITAB 75MG TAB", "form": "Tablet"},
    {"name": "CLOPITAB A 75MG TAB", "form": "Tablet"},
    {"name": "CLOPITAB CV 10MG TAB", "form": "Tablet"},
    {"name": "CLOPITAB CV 20MG", "form": "Tablet"},
    {"name": "CLOPITAB CV GOLD 10MG", "form": "Tablet"},
    {"name": "CLOPITORVA 10MG TAB", "form": "Tablet"},
    {"name": "CLOPITORVA 20MG TAB", "form": "Tablet"},
    {"name": "CLOPIVAS 75MG TAB", "form": "Tablet"},
    {"name": "CLOPIVAS AP 150MG TAB", "form": "Tablet"},
    {"name": "CLOPIVAS AP 75MG TAB", "form": "Tablet"},
    {"name": "COBADEX CZS TAB", "form": "Tablet"},
    {"name": "COFOL Z", "form": "Medicine"},
    {"name": "COFRYL SYRUP", "form": "Medicine"},
    {"name": "COFSILS COUGH SYP 100ML", "form": "Syrup"},
    {"name": "COFSILS ORANGE LOZENGES JAR", "form": "Tablet"},
    {"name": "COGNIX PLUS TAB", "form": "Tablet"},
    {"name": "COGNIX PLUS TAB'", "form": "Tablet"},
    {"name": "COLDACT CAPS", "form": "Capsule"},
    {"name": "COLGATE CHARCOAL CLEAN GEL", "form": "Medicine"},
    {"name": "COLGATE TOTAL ACTIVE PRE", "form": "Medicine"},
    {"name": "COLICAID DROPS 15ML", "form": "Drops"},
    {"name": "COLICAID DROPS-15ML", "form": "Drops"},
    {"name": "COLICAID SYP 100ML", "form": "Syrup"},
    {"name": "COLICAID SYP 60ML", "form": "Syrup"},
    {"name": "COMBIFLAM 20 TAB", "form": "Tablet"},
    {"name": "COMBIFLAM SYP 60ML", "form": "Syrup"},
    {"name": "COMBIFLAM TAB", "form": "Tablet"},
    {"name": "COMBIGAN EYE DROPS 5ML", "form": "Drops"},
    {"name": "COMPLAN NUTRIGRO CHOCOLATE 200GM", "form": "Tablet"},
    {"name": "COMPLETE TD TAB", "form": "Tablet"},
    {"name": "CONCOR 1.25MG TAB", "form": "Tablet"},
    {"name": "CONCOR 10MG TAB", "form": "Tablet"},
    {"name": "CONCOR 5MG TAB", "form": "Tablet"},
    {"name": "CONCOR AM 2.5MG TAB", "form": "Tablet"},
    {"name": "CONCOR AM 5MG TAB", "form": "Tablet"},
    {"name": "CONCOR COR 2.5 TAB", "form": "Tablet"},
    {"name": "CONCOR COR 2.5MG TAB", "form": "Tablet"},
    {"name": "CONCOR PLUS TAB", "form": "Tablet"},
    {"name": "CONFIDO TAB", "form": "Tablet"},
    {"name": "CORBIS 2.5MG TAB", "form": "Tablet"},
    {"name": "COREX DX SYP 100ML", "form": "Syrup"},
    {"name": "COREX DX SYP 50ML", "form": "Syrup"},
    {"name": "CORIMINIC DROPS 15ML", "form": "Drops"},
    {"name": "CORIMINIC SYP 60ML", "form": "Syrup"},
    {"name": "CORN CAPS", "form": "Medicine"},
    {"name": "CORN PLASTER", "form": "Medicine"},
    {"name": "CORTIYES M 4MG TAB", "form": "Tablet"},
    {"name": "CORTIYES M 8MG TAB", "form": "Tablet"},
    {"name": "CORTIYES MD 16", "form": "Medicine"},
    {"name": "CORTIYES MD 8", "form": "Medicine"},
    {"name": "COSART 25MG TAB", "form": "Tablet"},
    {"name": "COSART 50MG TAB", "form": "Tablet"},
    {"name": "COTARYL CREAM 75GM", "form": "Cream"},
    {"name": "COVANCE 25MG TAB", "form": "Tablet"},
    {"name": "COVANCE D TABS", "form": "Tablet"},
    {"name": "COVANCE-50MG TAB", "form": "Tablet"},
    {"name": "COVERSYL  4MG TAB", "form": "Tablet"},
    {"name": "COVERSYL 2MG TAB", "form": "Tablet"},
    {"name": "COVERSYL 8MG", "form": "Tablet"},
    {"name": "COVERSYL AM 4/5MG TAB", "form": "Tablet"},
    {"name": "COVERSYL PLUS", "form": "Tablet"},
    {"name": "CREMAFFIN MIXED FRUIT LIQUID 225ML", "form": "Syrup"},
    {"name": "CREMAFFIN PALIN MINT [GREEN]SYP 225ML", "form": "Syrup"},
    {"name": "CREMAFFIN PINK SYP 170 ML", "form": "Syrup"},
    {"name": "CREMAFFIN PLUS SYP 150ML", "form": "Syrup"},
    {"name": "CREMALAX TAB", "form": "Tablet"},
    {"name": "CREON 10000MG TAB", "form": "Tablet"},
    {"name": "CREON 25000 CAPS", "form": "Capsule"},
    {"name": "CRESAR 20MG TAB", "form": "Tablet"},
    {"name": "CRESAR 40MG TAB", "form": "Tablet"},
    {"name": "CRESAR AM TAB", "form": "Tablet"},
    {"name": "CRESAR H TAB 10'S", "form": "Tablet"},
    {"name": "CRESTOR 10MG TAB", "form": "Tablet"},
    {"name": "CRESTOR 20MG TAB", "form": "Tablet"},
    {"name": "CRESTOR 5MG TAB", "form": "Tablet"},
    {"name": "CRITICOLD PLUS", "form": "Medicine"},
    {"name": "CROCIN 650 TAB", "form": "Tablet"},
    {"name": "CROCIN 650MG TAB", "form": "Tablet"},
    {"name": "CROCIN ADVANCE TAB", "form": "Tablet"},
    {"name": "CROCIN PAIN RELIF", "form": "Tablet"},
    {"name": "CTD 12.5MG TAB", "form": "Tablet"},
    {"name": "CTD 6.25MG TAB", "form": "Tablet"},
    {"name": "CUFLIFT LS JUNIOR 60 ML", "form": "Medicine"},
    {"name": "CUFLIFT-LS SYP", "form": "Medicine"},
    {"name": "CURCUZIT TAB", "form": "Tablet"},
    {"name": "CURCUZIT TABLET TAB", "form": "Tablet"},
    {"name": "CURIVIT", "form": "Medicine"},
    {"name": "CYBLEX 40MG TAB", "form": "Tablet"},
    {"name": "CYBLEX 80MG TAB", "form": "Tablet"},
    {"name": "CYBLEX M 40 TAB", "form": "Tablet"},
    {"name": "CYBLEX M 80 TAB", "form": "Tablet"},
    {"name": "CYCITA", "form": "Medicine"},
    {"name": "CYCLOPAM DROPS 10ML", "form": "Drops"},
    {"name": "CYCLOPAM SUS 60ML", "form": "Tablet"},
    {"name": "CYCLOPAM SUSP 60ML", "form": "Syrup"},
    {"name": "CYCLOPAM SYP 30ML", "form": "Syrup"},
    {"name": "CYCLOPAM TAB", "form": "Tablet"},
    {"name": "CYPON DROPS 15ML", "form": "Drops"},
    {"name": "CYPON SYP 200ML", "form": "Syrup"},
    {"name": "CYSTONE SYP 200ML", "form": "Syrup"},
    {"name": "CYSTONE TAB", "form": "Tablet"},
    {"name": "D PROTIN CHOC  500GM", "form": "Tablet"},
    {"name": "D PROTIN CHOC 200GM", "form": "Tablet"},
    {"name": "D PROTIN VANILLA 200GM", "form": "Tablet"},
    {"name": "D PROTIN VANILLA 500GM", "form": "Tablet"},
    {"name": "D VANIZEP 100M G", "form": "Tablet"},
    {"name": "D VENIZ 50MG TAB", "form": "Tablet"},
    {"name": "D-AZTOR 10MG", "form": "Tablet"},
    {"name": "D-RISE 2000 CAPS", "form": "Capsule"},
    {"name": "D-RISE 60K CAPS", "form": "Capsule"},
    {"name": "D-RISE SACHET 1GM", "form": "Powder"},
    {"name": "D3 HIGH CAP", "form": "Medicine"},
    {"name": "D3 MUST 2K TAB", "form": "Tablet"},
    {"name": "D3 MUST 60K TAB", "form": "Tablet"},
    {"name": "D3 MUST DROPS 15ML", "form": "Drops"},
    {"name": "DABUR ALMA HAIR OIL", "form": "Medicine"},
    {"name": "DAFLON 1000MG TAB", "form": "Tablet"},
    {"name": "DAFLON 500MG TAB", "form": "Tablet"},
    {"name": "DAILYGLIM M1", "form": "Medicine"},
    {"name": "DAIONIL TAB", "form": "Tablet"},
    {"name": "DALACIN C 300MG TAB", "form": "Tablet"},
    {"name": "DANFREE 1% SHAMPOO 100ML", "form": "Shampoo"},
    {"name": "DANFREE 2 % SHAMPOO 100ML", "form": "Shampoo"},
    {"name": "DANFREE 2% SHAMPOO 100ML", "form": "Shampoo"},
    {"name": "DANFREE SHAMPOO", "form": "Medicine"},
    {"name": "DAONIL TABS", "form": "Tablet"},
    {"name": "DAPAGLYN 10MG TAB", "form": "Tablet"},
    {"name": "DAPAGLYN M 500MG TAB", "form": "Tablet"},
    {"name": "DAPANTA TRIO", "form": "Medicine"},
    {"name": "DAPAVEL 10", "form": "Tablet"},
    {"name": "DART TAB", "form": "Tablet"},
    {"name": "DAXID 25MG TAB", "form": "Tablet"},
    {"name": "DAXID 50MG TAB", "form": "Tablet"},
    {"name": "DAZTOR 20 MG", "form": "Tablet"},
    {"name": "DEBISTAL GM2", "form": "Medicine"},
    {"name": "DEC 100MG TAB", "form": "Tablet"},
    {"name": "DEFCORT 6MG TAB", "form": "Tablet"},
    {"name": "DEFLISO 6", "form": "Medicine"},
    {"name": "DEFLISTO 6 TAB", "form": "Tablet"},
    {"name": "DEFLOVEIN", "form": "Medicine"},
    {"name": "DELETUS D PLUS SYP 200ML", "form": "Syrup"},
    {"name": "DELICES DROPS 15ML", "form": "Drops"},
    {"name": "DELICES SYP 100ML", "form": "Syrup"},
    {"name": "DELTONE 60 MG", "form": "Medicine"},
    {"name": "DELTONE 60MG CAP", "form": "Capsule"},
    {"name": "DELTONE 60MG TAB", "form": "Tablet"},
    {"name": "DENTOGEL LIQ 20GM", "form": "Cream"},
    {"name": "DENTOGEL-TUBE 15GM", "form": "Cream"},
    {"name": "DEPLAT A 150MG TAB", "form": "Tablet"},
    {"name": "DEPLAT CV TAB", "form": "Tablet"},
    {"name": "DEPLATT 150MG", "form": "Tablet"},
    {"name": "DEPLATT 75MG TAB", "form": "Tablet"},
    {"name": "DEPLATT A 75MG TAB", "form": "Tablet"},
    {"name": "DEPLATT CV 20MG", "form": "Tablet"},
    {"name": "DEPURA KIDS NANO DROPS 15ML", "form": "Drops"},
    {"name": "DEPURA VITAMIN D3 60 K SF SOLUTION 5ML", "form": "Solution"},
    {"name": "DEPURA VITAMIN D3 60K SF SOLUTION 5ML", "form": "Solution"},
    {"name": "DERICIP 150", "form": "Medicine"},
    {"name": "DERICIP RETARD 150 TAB", "form": "Tablet"},
    {"name": "DERIPHYLLIN AMP  2ML", "form": "Tablet"},
    {"name": "DERIPHYLLIN RETA 150", "form": "Tablet"},
    {"name": "DERIPHYLLIN RETARD 150 TAB", "form": "Tablet"},
    {"name": "DERIPHYLLIN RTD 300MG", "form": "Tablet"},
    {"name": "DERIPHYLLIN TAB", "form": "Tablet"},
    {"name": "DERMIYES OC", "form": "Medicine"},
    {"name": "DESLOR 5MG TAB", "form": "Tablet"},
    {"name": "DETTOL 60ML", "form": "Tablet"},
    {"name": "DETTOL ANTISEPTIC LIQUID", "form": "Medicine"},
    {"name": "DETTOL ANTISEPTIC LIQUID SMALL", "form": "Medicine"},
    {"name": "DETTOL ORIGINAL GERM DEFENCE", "form": "Medicine"},
    {"name": "DETTOL ORIGINAL SOAP 40GM", "form": "Soap"},
    {"name": "DEVIRY 10MG TAB", "form": "Tablet"},
    {"name": "DEXLURON LC", "form": "Medicine"},
    {"name": "DEXLURON LC TAB", "form": "Tablet"},
    {"name": "DEXOLAC NO 1 REFIL 400GM", "form": "Tablet"},
    {"name": "DEXOLAC NO 2 REFIL 400GM", "form": "Tablet"},
    {"name": "DEXOLAC NO 3 REFIL 400GM", "form": "Tablet"},
    {"name": "DEXOLAC NO 4 REFILL 400GM", "form": "Tablet"},
    {"name": "DEXOLAC NO:1 400GM TIN", "form": "Tablet"},
    {"name": "DEXOLOC SPL CARE 400GM TIN", "form": "Tablet"},
    {"name": "DEXONA INJ 2ML", "form": "Injection"},
    {"name": "DEXONA TAB", "form": "Tablet"},
    {"name": "DEXORAN EYE DROPS 5ML", "form": "Drops"},
    {"name": "DEXORAN S EYE/DROPS 5ML", "form": "Drops"},
    {"name": "DEXORANGE CAPS", "form": "Capsule"},
    {"name": "DEXORANGE PLUS CAPS", "form": "Capsule"},
    {"name": "DEXORANGE PLUS SYP 200ML", "form": "Syrup"},
    {"name": "DEXORANGE SYP", "form": "Medicine"},
    {"name": "DEXORANGE SYP 200ML", "form": "Syrup"},
    {"name": "DIABECON DS TAB", "form": "Tablet"},
    {"name": "DIABECON TAB", "form": "Tablet"},
    {"name": "DIABEND-M", "form": "Tablet"},
    {"name": "DIABETRAL SR TAB", "form": "Tablet"},
    {"name": "DIABETROL  TAB", "form": "Tablet"},
    {"name": "DIAMICRON TAB", "form": "Tablet"},
    {"name": "DIAMICRON XR 60MG TAB", "form": "Tablet"},
    {"name": "DIAMICRON XR MEX 60/1000MG", "form": "Tablet"},
    {"name": "DIAMICRON XR-MEX 500MG", "form": "Tablet"},
    {"name": "DIAMICRON-MR 30MG", "form": "Tablet"},
    {"name": "DIANORM M OD TAB", "form": "Tablet"},
    {"name": "DIANORM M TAB", "form": "Tablet"},
    {"name": "DIAPLAN PROTEIN POWDER", "form": "Medicine"},
    {"name": "DIAPRIDE 1MG TAB", "form": "Tablet"},
    {"name": "DIAPRIDE 2MG TAB", "form": "Tablet"},
    {"name": "DIAPRIDE M1", "form": "Tablet"},
    {"name": "DIAPRIDE M1 FORTE", "form": "Tablet"},
    {"name": "DIAPRIDE M2 FORTE", "form": "Tablet"},
    {"name": "DIAPRIDE M2 TAB", "form": "Tablet"},
    {"name": "DIATAAL CAPS", "form": "Capsule"},
    {"name": "DIAVIT PLUS", "form": "Tablet"},
    {"name": "DIBIZIDE M TABS", "form": "Tablet"},
    {"name": "DICLOGESIC GEL 30 GM", "form": "Medicine"},
    {"name": "DICLOGESIC GEL 30GM", "form": "Cream"},
    {"name": "DICLOGESIC GEL 50GM", "form": "Cream"},
    {"name": "DICLOGESIC MAXX SPRAY 55GM", "form": "Spray"},
    {"name": "DICLOGESIC TH 8MG TAB", "form": "Tablet"},
    {"name": "DICLOKEM PLUS", "form": "Tablet"},
    {"name": "DICLOKEM PLUS TAB", "form": "Tablet"},
    {"name": "DICLOTREAT CREAM", "form": "Medicine"},
    {"name": "DICLOWIN PLUS", "form": "Medicine"},
    {"name": "DICORATE ER250 MG", "form": "Tablet"},
    {"name": "DICORATE ER500 MG TAB", "form": "Tablet"},
    {"name": "DIGENE GEL 200ML M/F", "form": "Gel"},
    {"name": "DIGENE GEL 200ML [MINT]", "form": "Cream"},
    {"name": "DIGENE GEL 200ML [ORANGE]", "form": "Cream"},
    {"name": "DIGENE MINT GEL 450ML", "form": "Gel"},
    {"name": "DIGENE MINT TAB", "form": "Tablet"},
    {"name": "DIGENE TAB [ M/F]", "form": "Tablet"},
    {"name": "DIGENE TAB [ MINT ]", "form": "Tablet"},
    {"name": "DIGENE TAB [ ORANGE ]", "form": "Tablet"},
    {"name": "DIGEPLEX SYP 200ML", "form": "Syrup"},
    {"name": "DILIGAN 25", "form": "Medicine"},
    {"name": "DILIGAN 25MG TAB", "form": "Tablet"},
    {"name": "DILNIP 10MG TAB", "form": "Tablet"},
    {"name": "DILNIP 5MG TAB", "form": "Tablet"},
    {"name": "DILZEM 30MG", "form": "Tablet"},
    {"name": "DILZEM 60MG TAB", "form": "Tablet"},
    {"name": "DILZEM CD 90MG TAB", "form": "Tablet"},
    {"name": "DILZEM SR 90MG TAB", "form": "Tablet"},
    {"name": "DIOVOL MINT SUS 170ML", "form": "Tablet"},
    {"name": "DIPROBATE PLUS CREAM 30G 30GM", "form": "Cream"},
    {"name": "DIPSALIC-F OINT 20GM", "form": "Cream"},
    {"name": "DIZITAC TAB", "form": "Tablet"},
    {"name": "DMAX SOAP 75GM", "form": "Soap"},
    {"name": "DOBIMEC CAP", "form": "Capsule"},
    {"name": "DOBIMEC TAB", "form": "Medicine"},
    {"name": "DOLIEF 6 SYRUP", "form": "Medicine"},
    {"name": "DOLO-650MG TAB", "form": "Tablet"},
    {"name": "DOLOBRAKE MR", "form": "Medicine"},
    {"name": "DOLOBRAKE SP", "form": "Medicine"},
    {"name": "DOLOCOLD DS SYRUP", "form": "Medicine"},
    {"name": "DOLOKIND MR TAB", "form": "Tablet"},
    {"name": "DOLOKIND PLUS TAB", "form": "Tablet"},
    {"name": "DOLONEX-DT TAB", "form": "Tablet"},
    {"name": "DOLOPAR TAB", "form": "Tablet"},
    {"name": "DOLOSEN 500", "form": "Medicine"},
    {"name": "DOLOZOX NEO", "form": "Medicine"},
    {"name": "DOMSTAL 30ML SUS", "form": "Tablet"},
    {"name": "DOMSTAL BABY DROPS 5 ML", "form": "Drops"},
    {"name": "DOMSTAL O CAPS", "form": "Capsule"},
    {"name": "DOMSTAL TAB", "form": "Tablet"},
    {"name": "DOMSTAL10", "form": "Medicine"},
    {"name": "DORIMAC", "form": "Medicine"},
    {"name": "DORZOX E/DROPS 10ML", "form": "Drops"},
    {"name": "DORZOX-T DROPS 5ML", "form": "Drops"},
    {"name": "DOTHIP 25MG TAB", "form": "Tablet"},
    {"name": "DOTHIP 50MG", "form": "Tablet"},
    {"name": "DOTHIP 75MG  TAB", "form": "Tablet"},
    {"name": "DOXINATE OD TAB", "form": "Tablet"},
    {"name": "DOXINATE PLUS", "form": "Tablet"},
    {"name": "DOXINATE TAB 30'S", "form": "Tablet"},
    {"name": "DOXO 400 TAB", "form": "Tablet"},
    {"name": "DOXOCIP 400", "form": "Medicine"},
    {"name": "DOXOHIGH", "form": "Medicine"},
    {"name": "DOXT-SL  TAB", "form": "Tablet"},
    {"name": "DOXY 1 LDR CAP", "form": "Capsule"},
    {"name": "DOXY 1 LDR CAPS", "form": "Capsule"},
    {"name": "DOXYITIC LB", "form": "Medicine"},
    {"name": "DOXYKIND LB", "form": "Tablet"},
    {"name": "DOXYKIND LB CAPSULES", "form": "Medicine"},
    {"name": "DOXYKIND LB TAB", "form": "Tablet"},
    {"name": "DOXYTIC LB CAP", "form": "Capsule"},
    {"name": "DOXYTIME", "form": "Medicine"},
    {"name": "DR ORTHO PAIN RELIEF OINTMENT 30GM", "form": "Cream"},
    {"name": "DR ORTHO PAIN RELIEF OINTMENT TUBE OF 30 G 30GM", "form": "Cream"},
    {"name": "DR ORTHO STRONG OIL 60ML", "form": "Oil"},
    {"name": "DREAMSURE M", "form": "Medicine"},
    {"name": "DREZ  POWDER 10GM", "form": "Powder"},
    {"name": "DREZ S OINT 15GM", "form": "Cream"},
    {"name": "DREZ SPRAY 30GM", "form": "Spray"},
    {"name": "DREZ-10% SOLUTION SMALL 100ML", "form": "Solution"},
    {"name": "DROKEZ M TAB", "form": "Medicine"},
    {"name": "DRONIS 20MG TAB", "form": "Tablet"},
    {"name": "DRONIS 30MG TAB", "form": "Tablet"},
    {"name": "DROTIN DS", "form": "Tablet"},
    {"name": "DROTIN M TAB", "form": "Tablet"},
    {"name": "DROTIN PLUS TAB", "form": "Tablet"},
    {"name": "DROTIN TABS", "form": "Tablet"},
    {"name": "DROXYL 250DT TAB", "form": "Tablet"},
    {"name": "DROXYL 500DT", "form": "Tablet"},
    {"name": "DUCODYL 10 10TAB STR TAB", "form": "Tablet"},
    {"name": "DUCODYL 10 TAB", "form": "Tablet"},
    {"name": "DULANE 30MG CAPS", "form": "Capsule"},
    {"name": "DULCOFLEX 5MG CONSTIPATION LAXATIVE BOWEL MOVEMENT REGULATOR 1 STRIP 10 TABLET TAB", "form": "Tablet"},
    {"name": "DULCOFLEX 5MG TAB", "form": "Tablet"},
    {"name": "DULCOFLEX ADULT SUP", "form": "Tablet"},
    {"name": "DULCOFLEX ADULTS 10MG SUPPOSITORY", "form": "Suppository"},
    {"name": "DULCOFLEX SUPP PAED", "form": "Tablet"},
    {"name": "DULCOFLEX TAB", "form": "Tablet"},
    {"name": "DULINE 20MG TAB", "form": "Tablet"},
    {"name": "DUOLIN 3 REPSULES 3ML", "form": "Tablet"},
    {"name": "DUOLIN CFC INHLR", "form": "Inhaler"},
    {"name": "DUOLIN LD 5X2.5ML RESPULES", "form": "Respule"},
    {"name": "DUOLIN LD REPSULES 5ML", "form": "Tablet"},
    {"name": "DUOLIN LD RESPULES", "form": "Inhaler"},
    {"name": "DUOLIN ROTOCAPS", "form": "Capsule"},
    {"name": "DUONASE NASAL SPRY", "form": "Tablet"},
    {"name": "DUPHALAC LEMON FLAVOUR SOLUTION 150ML", "form": "Solution"},
    {"name": "DUPHALAC SYP 150ML", "form": "Syrup"},
    {"name": "DUPHALAC SYP 250ML", "form": "Syrup"},
    {"name": "DUPHALAC SYP 450ML", "form": "Syrup"},
    {"name": "DUPHASTAN TAB", "form": "Tablet"},
    {"name": "DUTAS CAPS", "form": "Capsule"},
    {"name": "DUTAS-T CAPS", "form": "Capsule"},
    {"name": "DUVADILAN 10MG TAB", "form": "Tablet"},
    {"name": "DYDROFEM 10", "form": "Medicine"},
    {"name": "DYDROFEM TAB", "form": "Tablet"},
    {"name": "DYNAFLEX MR", "form": "Medicine"},
    {"name": "DYNAFLEX MR TAB", "form": "Tablet"},
    {"name": "DYNAFLEX SP", "form": "Medicine"},
    {"name": "DYNAFLEX SP TAB", "form": "Tablet"},
    {"name": "DYNAFLEX SPRAY", "form": "Medicine"},
    {"name": "DYNAFLEX SPRAY 55GM", "form": "Spray"},
    {"name": "DYNAGLIPT M TAB", "form": "Tablet"},
    {"name": "DYNAGLIPT TABS", "form": "Tablet"},
    {"name": "DYNAPRESS 0.4MG TAB", "form": "Tablet"},
    {"name": "DYTOR 100MG TAB", "form": "Tablet"},
    {"name": "DYTOR 10MG TAB", "form": "Tablet"},
    {"name": "DYTOR 20MG", "form": "Tablet"},
    {"name": "DYTOR 40MG TAB", "form": "Tablet"},
    {"name": "DYTOR 5MG TAB", "form": "Tablet"},
    {"name": "DYTOR E TAB", "form": "Tablet"},
    {"name": "DYTOR PLUS 10MG", "form": "Tablet"},
    {"name": "DYTOR PLUS 10MG TAB", "form": "Tablet"},
    {"name": "DYTOR PLUS 20MG TAB", "form": "Tablet"},
    {"name": "DYTOR PLUS 5MG TAB", "form": "Tablet"},
    {"name": "DYTOR PLUS LS TAB", "form": "Tablet"},
    {"name": "EASIBREATHE INHALANT 10 CAP", "form": "Capsule"},
    {"name": "EASIBREATHE INHALANT CAP", "form": "Capsule"},
    {"name": "EASUM BABY CEREAL 400GM", "form": "Tablet"},
    {"name": "EASYLAX L 100 ML SF", "form": "Medicine"},
    {"name": "EASYLAX L LEMON 100ML SOL", "form": "Solution"},
    {"name": "EASYLAX L SOLUTION 200ML", "form": "Solution"},
    {"name": "EASYLAX PLUS", "form": "Medicine"},
    {"name": "EASYLAX PLUS SUGAR FREE PEPPERMINT 170ML", "form": "Tablet"},
    {"name": "EBAST 20MG TAB", "form": "Tablet"},
    {"name": "EBAST TAB", "form": "Tablet"},
    {"name": "ECCINORM SACHET", "form": "Medicine"},
    {"name": "ECHINORM GRANULES 1GM", "form": "Powder"},
    {"name": "ECOD OMEGA CAPS", "form": "Capsule"},
    {"name": "ECONORM CAP", "form": "Capsule"},
    {"name": "ECONORM SHAC", "form": "Tablet"},
    {"name": "ECOSPRIN 150", "form": "Tablet"},
    {"name": "ECOSPRIN 150 MG", "form": "Medicine"},
    {"name": "ECOSPRIN 150 TAB", "form": "Tablet"},
    {"name": "ECOSPRIN 75 MG", "form": "Medicine"},
    {"name": "ECOSPRIN 75 TAB", "form": "Tablet"},
    {"name": "ECOSPRIN 75MG", "form": "Tablet"},
    {"name": "ECOSPRIN AV 150/20MG TAB", "form": "Tablet"},
    {"name": "ECOSPRIN AV 150MG", "form": "Tablet"},
    {"name": "ECOSPRIN AV 75 20 CAP", "form": "Capsule"},
    {"name": "ECOSPRIN AV 75 CAP", "form": "Capsule"},
    {"name": "ECOSPRIN AV 75/20 CAP", "form": "Capsule"},
    {"name": "ECOSPRIN AV 75/20MG TAB\\", "form": "Tablet"},
    {"name": "ECOSPRIN AV75MG", "form": "Tablet"},
    {"name": "ECOSPRIN GOLD 10 MG", "form": "Tablet"},
    {"name": "ECOSPRIN GOLD20MG TAB", "form": "Tablet"},
    {"name": "ELDOPER CAPS", "form": "Capsule"},
    {"name": "ELECTRAL ORANGE FLAVOUR POWDER SACHET", "form": "Powder"},
    {"name": "ELECTRAL ORANGE FLAVOUR POWDER SACHET 21.8GM", "form": "Powder"},
    {"name": "ELECTRAL POWDER 4.4GM ORANGE", "form": "Powder"},
    {"name": "ELECTROL ORANGE 21.8GM", "form": "Tablet"},
    {"name": "ELECTROL POWDER 21GM", "form": "Powder"},
    {"name": "ELECTROL POWDER 4.4GM", "form": "Powder"},
    {"name": "ELIQUIS 2.5MG TAB", "form": "Tablet"},
    {"name": "ELIQUIS 5MG TAB", "form": "Tablet"},
    {"name": "ELIWEL 10MG TAB", "form": "Tablet"},
    {"name": "ELIWEL25MG TAB", "form": "Tablet"},
    {"name": "ELOVERA CREAM 75GM", "form": "Cream"},
    {"name": "ELTROXIN 100MG", "form": "Tablet"},
    {"name": "ELTROXIN 125MG", "form": "Tablet"},
    {"name": "ELTROXIN 25 MG", "form": "Tablet"},
    {"name": "ELTROXIN 50MG TAB", "form": "Tablet"},
    {"name": "ELTROXIN 75MG", "form": "Tablet"},
    {"name": "ELTROXIN 88MG TAB", "form": "Tablet"},
    {"name": "EMBETA XR 25MG TAB", "form": "Tablet"},
    {"name": "EMBETA XR 50MG TAB", "form": "Tablet"},
    {"name": "EMESET 4MG TAB", "form": "Tablet"},
    {"name": "EMESET 8MG TAB", "form": "Tablet"},
    {"name": "EMESET INJ 2ML", "form": "Injection"},
    {"name": "EMESET SYP 30ML", "form": "Syrup"},
    {"name": "EMPASOFT 25", "form": "Medicine"},
    {"name": "EMSYLATE 500", "form": "Medicine"},
    {"name": "ENAM 2.5MG TAB", "form": "Tablet"},
    {"name": "ENAM 5MG TAB", "form": "Tablet"},
    {"name": "ENCOATE CHRONO 300MG", "form": "Tablet"},
    {"name": "ENCORATE 200MG TAB", "form": "Tablet"},
    {"name": "ENCORATE CHRONO 200MG", "form": "Tablet"},
    {"name": "ENCORATE CHRONO 300MG", "form": "Tablet"},
    {"name": "ENCORATE CHRONO 500", "form": "Tablet"},
    {"name": "ENDOGEST 200", "form": "Medicine"},
    {"name": "ENERZAL ORANGE FLAVOUR SACHET", "form": "Powder"},
    {"name": "ENERZAL ORANGE FLAVOUR SCH 15 G", "form": "Medicine"},
    {"name": "ENO FRUIT SALT LEMON 5GM", "form": "Tablet"},
    {"name": "ENO FRUIT SALT ORANGE POWDER", "form": "Powder"},
    {"name": "ENOXAPARIN 60MG INJ", "form": "Injection"},
    {"name": "ENOXAPRIN", "form": "Medicine"},
    {"name": "ENTERO QUINOL TAB", "form": "Tablet"},
    {"name": "ENTEROGERMINA VIAL5ML", "form": "Injection"},
    {"name": "ENTOGERMINA CAPS", "form": "Capsule"},
    {"name": "ENVAS 10MG TAB", "form": "Tablet"},
    {"name": "ENVAS 2.5MG TAB", "form": "Tablet"},
    {"name": "ENVAS 5MG TAB", "form": "Tablet"},
    {"name": "ENZYM SYP 200ML", "form": "Syrup"},
    {"name": "EOFIL FORTE", "form": "Tablet"},
    {"name": "EOFIL TABS", "form": "Tablet"},
    {"name": "EPILIVE 250MG TAB", "form": "Tablet"},
    {"name": "EPILIVE 500MG TAB", "form": "Tablet"},
    {"name": "EPTOIN 100MG", "form": "Tablet"},
    {"name": "EPTOIN 50MG TAB", "form": "Tablet"},
    {"name": "EPTUS 25MG TAB", "form": "Tablet"},
    {"name": "ERITEL 20MG TAB", "form": "Tablet"},
    {"name": "ERITEL 40MG TAB", "form": "Tablet"},
    {"name": "ERITEL 80MG TAB", "form": "Tablet"},
    {"name": "ERITEL AM", "form": "Tablet"},
    {"name": "ERITEL CH 40 TAB", "form": "Tablet"},
    {"name": "ERITEL CH 80MG TAB", "form": "Tablet"},
    {"name": "ERITEL H 80MG TAB", "form": "Tablet"},
    {"name": "ERITEL H TAB", "form": "Tablet"},
    {"name": "ERITEL LN 40MG", "form": "Tablet"},
    {"name": "ERYTHROCIN 250MG TAB", "form": "Tablet"},
    {"name": "ERYTOP GEL 20GM", "form": "Cream"},
    {"name": "ERYTOP LOTION 25ML", "form": "Lotion"},
    {"name": "ERYTROCIN 500MG TAB", "form": "Tablet"},
    {"name": "ESAM 2.5MG TAB", "form": "Tablet"},
    {"name": "ESAM 5MG TAB", "form": "Tablet"},
    {"name": "ESGIPYRIN TAB", "form": "Tablet"},
    {"name": "ESIFLO 100MG RC", "form": "Tablet"},
    {"name": "ESIFLO 250MG RC", "form": "Tablet"},
    {"name": "ESOMAC 20MG TAB", "form": "Tablet"},
    {"name": "ESOZ 20MG TAB", "form": "Tablet"},
    {"name": "ESOZ 40MG TAB", "form": "Tablet"},
    {"name": "ESOZ D 20MG TABS", "form": "Tablet"},
    {"name": "ESOZ D 40MG TAB", "form": "Tablet"},
    {"name": "ETHAMCIP 500", "form": "Medicine"},
    {"name": "ETHAMCIP 500MG TAB", "form": "Tablet"},
    {"name": "ETHIGLO FACE WASH 70GM", "form": "Soap"},
    {"name": "ETHIGLO SOAP 75GM", "form": "Soap"},
    {"name": "ETOLYTE MR", "form": "Medicine"},
    {"name": "ETORIDAY 120", "form": "Medicine"},
    {"name": "ETORIDAY 120 TAB", "form": "Tablet"},
    {"name": "ETORIDAY 90", "form": "Medicine"},
    {"name": "ETORIDAY 90 TAB", "form": "Tablet"},
    {"name": "ETORISEN MR", "form": "Medicine"},
    {"name": "ETOSHINE 120MG TAB", "form": "Tablet"},
    {"name": "ETOSHINE 60MG TAB", "form": "Tablet"},
    {"name": "ETOSHINE 90MG", "form": "Tablet"},
    {"name": "ETOSHINE MR", "form": "Tablet"},
    {"name": "ETOVA 400MG", "form": "Tablet"},
    {"name": "ETOVA ER 400MG TAB", "form": "Tablet"},
    {"name": "ETOVA MR400", "form": "Tablet"},
    {"name": "ETOVARA 120 TAB", "form": "Tablet"},
    {"name": "ETOXIB 120 MG TAB", "form": "Tablet"},
    {"name": "ETOXIB 120MG TAB", "form": "Tablet"},
    {"name": "ETOXIB 60 MG TAB", "form": "Tablet"},
    {"name": "ETOXIB 60MG TAB", "form": "Tablet"},
    {"name": "ETOXIB 90 TAB", "form": "Tablet"},
    {"name": "ETOZOX 60", "form": "Medicine"},
    {"name": "ETOZOX 60MG TAB", "form": "Tablet"},
    {"name": "ETOZOX 90", "form": "Medicine"},
    {"name": "ETOZOX 90MG TAB", "form": "Tablet"},
    {"name": "EUGLIM 1MG TAB", "form": "Tablet"},
    {"name": "EUGLIM 2MG TAB", "form": "Tablet"},
    {"name": "EUGLIM M2MG TAB", "form": "Tablet"},
    {"name": "EUGLIM-M1", "form": "Tablet"},
    {"name": "EVEREADY LEAKPROOF AA1015", "form": "Medicine"},
    {"name": "EVERFRESH TEARS EYE DROPS 10ML", "form": "Drops"},
    {"name": "EVION 200MG TAB", "form": "Tablet"},
    {"name": "EVION 400 CAP", "form": "Capsule"},
    {"name": "EVION 400MG TAB 20X10'S", "form": "Tablet"},
    {"name": "EVION 600MG TAB", "form": "Tablet"},
    {"name": "EVION CREAM 20GM", "form": "Cream"},
    {"name": "EVION CREAM 60GM", "form": "Cream"},
    {"name": "EVION-LC TAB", "form": "Tablet"},
    {"name": "EWINDIOL", "form": "Medicine"},
    {"name": "EWINDIOL TAB", "form": "Tablet"},
    {"name": "EXCERAFT 200 ML", "form": "Medicine"},
    {"name": "EXCERAFT SUSPENSION 150ML", "form": "Syrup"},
    {"name": "EXCERAFT SUSPENSION 150ML SUSP", "form": "Suspension"},
    {"name": "EXCERAFT SYRUP", "form": "Syrup"},
    {"name": "EXERMET SR 500 TAB 15'S", "form": "Tablet"},
    {"name": "EYEMIST EYE DROPS 10ML", "form": "Drops"},
    {"name": "FAMOCID 20MG TAB", "form": "Tablet"},
    {"name": "FAMOCID 40MG TAB", "form": "Tablet"},
    {"name": "FEBRUX PLUS  TAB", "form": "Tablet"},
    {"name": "FEBRUX PLUS SYP 60ML", "form": "Syrup"},
    {"name": "FEBUGET 40MG TAB", "form": "Tablet"},
    {"name": "FEBUSTAT 40MG TAB", "form": "Tablet"},
    {"name": "FEBUTAZ 40MG TAB", "form": "Tablet"},
    {"name": "FEBUTEC 40 MG", "form": "Medicine"},
    {"name": "FEBUTEC 40MG TAB", "form": "Tablet"},
    {"name": "FEBUWISE 40 TAB", "form": "Tablet"},
    {"name": "FEFOL Z CAPS", "form": "Capsule"},
    {"name": "FELIZ S 5MG TAB", "form": "Tablet"},
    {"name": "FEMIPRISTAL", "form": "Medicine"},
    {"name": "FENLONG LINIMENT 30ML", "form": "Tablet"},
    {"name": "FENLONG MR 30ML", "form": "Tablet"},
    {"name": "FENLONG ROLLON 50ML", "form": "Tablet"},
    {"name": "FENLONG SPRAY 50GM", "form": "Spray"},
    {"name": "FEPANIL TAB", "form": "Tablet"},
    {"name": "FERCEE RED SYRUP", "form": "Medicine"},
    {"name": "FERCEE XT", "form": "Medicine"},
    {"name": "FERCIP XT SYRUP", "form": "Medicine"},
    {"name": "FERCIP XT TAB", "form": "Tablet"},
    {"name": "FERICIP XT", "form": "Medicine"},
    {"name": "FERICIP XT SYP 150ML", "form": "Syrup"},
    {"name": "FERIUM XT TAB", "form": "Tablet"},
    {"name": "FERTIMORE F TAB", "form": "Tablet"},
    {"name": "FERTIMORE F TABLETS", "form": "Medicine"},
    {"name": "FERTISURE-F-TAB", "form": "Tablet"},
    {"name": "FERTISURE-M", "form": "Tablet"},
    {"name": "FERTYL M 25", "form": "Medicine"},
    {"name": "FERYWIN XT PRO", "form": "Medicine"},
    {"name": "FERYWIN XT PRO TAB", "form": "Tablet"},
    {"name": "FERYWIN XT PRO TABLET TAB", "form": "Tablet"},
    {"name": "FEVAGO DS SYP 60ML", "form": "Syrup"},
    {"name": "FEVASTIN INJ 10X2ML", "form": "Injection"},
    {"name": "FEXOTRUE 120", "form": "Medicine"},
    {"name": "FEXOTRUE 120MG TAB", "form": "Tablet"},
    {"name": "FEXOTRUE 180", "form": "Medicine"},
    {"name": "FEXOVAX M TAB", "form": "Tablet"},
    {"name": "FIBAFEX 120MG TAB", "form": "Tablet"},
    {"name": "FIBAFEX 180MG TAB", "form": "Tablet"},
    {"name": "FIBATOR 5MG TAB", "form": "Tablet"},
    {"name": "FIBATOR TAB", "form": "Tablet"},
    {"name": "FIBOGEST", "form": "Medicine"},
    {"name": "FIBOGEST 200", "form": "Medicine"},
    {"name": "FIBOGEST 400", "form": "Medicine"},
    {"name": "FIBOGEST TAB", "form": "Tablet"},
    {"name": "FINOBRATE 145", "form": "Medicine"},
    {"name": "FINOBRATE 145MG TAB", "form": "Tablet"},
    {"name": "FINOBRATE 160", "form": "Medicine"},
    {"name": "FINOBRATE 160MG TAB", "form": "Tablet"},
    {"name": "FLAGYL", "form": "Medicine"},
    {"name": "FLAGYL 200MG TAB", "form": "Tablet"},
    {"name": "FLAGYL 400MG TAB", "form": "Tablet"},
    {"name": "FLAGYL 60ML SYP", "form": "Syrup"},
    {"name": "FLAGYL OF SUSP 60ML", "form": "Syrup"},
    {"name": "FLAMOC CV DDS 457", "form": "Medicine"},
    {"name": "FLAMOX CV 228.5", "form": "Medicine"},
    {"name": "FLAMOX CV 375", "form": "Medicine"},
    {"name": "FLAVEDON MR TABS", "form": "Tablet"},
    {"name": "FLEXIB SYRUP", "form": "Medicine"},
    {"name": "FLEXIBON", "form": "Medicine"},
    {"name": "FLEXIBON TAB", "form": "Tablet"},
    {"name": "FLEXIBON TAB 10S", "form": "Tablet"},
    {"name": "FLEXON MR 10 TAB", "form": "Tablet"},
    {"name": "FLEXON MR TAB", "form": "Tablet"},
    {"name": "FLEXON TAB", "form": "Tablet"},
    {"name": "FLEXURA D TAB", "form": "Tablet"},
    {"name": "FLOMIST NASAL SPRY", "form": "Tablet"},
    {"name": "FLORA BC DRY SYP 60ML", "form": "Syrup"},
    {"name": "FLOZEN AA TAB", "form": "Tablet"},
    {"name": "FLUBLAST NASAL DROPS ADULT", "form": "Drops"},
    {"name": "FLUBLAST SPRAY", "form": "Medicine"},
    {"name": "FLUCOBIG 150 TAB", "form": "Tablet"},
    {"name": "FLUKA 150 MG", "form": "Medicine"},
    {"name": "FLUKA 150MG TAB", "form": "Tablet"},
    {"name": "FLUKONAZ 400", "form": "Medicine"},
    {"name": "FLUKONAZ TAB", "form": "Medicine"},
    {"name": "FLUMONT LC KID SYP", "form": "Medicine"},
    {"name": "FLUMONT LC KID TAB", "form": "Tablet"},
    {"name": "FLUNARIN 10MG TAB", "form": "Tablet"},
    {"name": "FLUNARIN 5MG TAB", "form": "Tablet"},
    {"name": "FLUR DROPS 10ML", "form": "Drops"},
    {"name": "FLUTIVATE CREAM 20GM", "form": "Cream"},
    {"name": "FLUTIVATE CREAM BIG 20GM", "form": "Cream"},
    {"name": "FLUTIVATE OINT 20GM", "form": "Cream"},
    {"name": "FLUVIR 75 CAP", "form": "Capsule"},
    {"name": "FML EYE DROPS 5ML", "form": "Drops"},
    {"name": "FML-T EYE DROPS 5ML", "form": "Drops"},
    {"name": "FOL 123", "form": "Tablet"},
    {"name": "FOLIHAIR NEW TAB 10'S", "form": "Tablet"},
    {"name": "FOLITRAX 5MG TAB", "form": "Tablet"},
    {"name": "FOLITRAX-10 MG TAB", "form": "Tablet"},
    {"name": "FOLITRAX-2.5MG-TAB", "form": "Tablet"},
    {"name": "FOLITRAX-7.5MG-TAB", "form": "Tablet"},
    {"name": "FOLLIHAIR AMPM 20S TAB", "form": "Tablet"},
    {"name": "FOLLIHAIR AMPM TAB", "form": "Tablet"},
    {"name": "FOLLIHAIR TAB", "form": "Tablet"},
    {"name": "FOLVAITE TAB", "form": "Tablet"},
    {"name": "FORACORT  0.5 RESP 2 ML", "form": "Tablet"},
    {"name": "FORACORT 100 INHR", "form": "Tablet"},
    {"name": "FORACORT 100MG R/C", "form": "Tablet"},
    {"name": "FORACORT 200 INHLR", "form": "Inhaler"},
    {"name": "FORACORT 200 ROTACAPS", "form": "Capsule"},
    {"name": "FORACORT 200INH", "form": "Tablet"},
    {"name": "FORACORT 200MG ROTACAP", "form": "Capsule"},
    {"name": "FORACORT 400 INH", "form": "Tablet"},
    {"name": "FORACORT 400 R/C", "form": "Tablet"},
    {"name": "FORACORT FORTE ROTACAP", "form": "Capsule"},
    {"name": "FORCAN 150MG", "form": "Tablet"},
    {"name": "FORCAN 150MG TAB", "form": "Tablet"},
    {"name": "FORISTAL TAB", "form": "Tablet"},
    {"name": "FORMOFLO 100 TRANSCAP", "form": "Capsule"},
    {"name": "FORMOFLO 250 TRANSCAP", "form": "Capsule"},
    {"name": "FORMOFLO 250INHR", "form": "Tablet"},
    {"name": "FORMONIDE 200MG INHLR 120ML", "form": "Inhaler"},
    {"name": "FORMONIDE 200MG RC", "form": "Tablet"},
    {"name": "FORMONIDE 200MG RESP", "form": "Tablet"},
    {"name": "FORMONIDE 400 INHLR", "form": "Inhaler"},
    {"name": "FORMONIDE 400MG RC", "form": "Tablet"},
    {"name": "FORXIGA 10MG TAB", "form": "Tablet"},
    {"name": "FOSIROL SACHET 8GM", "form": "Powder"},
    {"name": "FOURDERM", "form": "Medicine"},
    {"name": "FOURDERM CREAM 10GM", "form": "Cream"},
    {"name": "FOURDERM CREAM 15GM", "form": "Cream"},
    {"name": "FOURDERM CREAM 20GM", "form": "Cream"},
    {"name": "FOURDERM TUBE OF CREAM 10.0GM 10GM", "form": "Ointment"},
    {"name": "FOURDERM TUBE OF CREAM 20.0GM 20GM", "form": "Ointment"},
    {"name": "FOURTS B SYP 200ML", "form": "Syrup"},
    {"name": "FOURTS B TAB", "form": "Tablet"},
    {"name": "FREEGO LAXATIVE POWDER 90GM", "form": "Powder"},
    {"name": "FREEGO PEG SYP 200ML", "form": "Syrup"},
    {"name": "FREEGO SYP", "form": "Syrup"},
    {"name": "FREEGO SYRUP", "form": "Medicine"},
    {"name": "FRISIUM 10MG", "form": "Tablet"},
    {"name": "FRISIUM 5MG", "form": "Tablet"},
    {"name": "FRUSELAC  TAB", "form": "Tablet"},
    {"name": "FUCIDIN OINT 5GM", "form": "Cream"},
    {"name": "FUL AID GOLD", "form": "Medicine"},
    {"name": "FUL AID GOLD CAP", "form": "Capsule"},
    {"name": "FUL AID GOLD SYP 210ML", "form": "Syrup"},
    {"name": "FULFORM 200MG R/C", "form": "Tablet"},
    {"name": "FULLFORM 400MG R/C", "form": "Tablet"},
    {"name": "FUNGICIP", "form": "Medicine"},
    {"name": "FUNGICIP 200 MG", "form": "Medicine"},
    {"name": "FUNGIFORCE", "form": "Medicine"},
    {"name": "FUNGITOP F CREAM", "form": "Medicine"},
    {"name": "FUTURENZYME", "form": "Medicine"},
    {"name": "FUTUREZYME SYP 200ML", "form": "Syrup"},
    {"name": "GABA-CAD TAB", "form": "Tablet"},
    {"name": "GABAKEM NT", "form": "Medicine"},
    {"name": "GABAKIND M TAB", "form": "Tablet"},
    {"name": "GABAKIND NT", "form": "Medicine"},
    {"name": "GABANEURON 100", "form": "Tablet"},
    {"name": "GABANEURON NT 100MG", "form": "Tablet"},
    {"name": "GABANEURON NT 300MG", "form": "Tablet"},
    {"name": "GABANEURON TAB", "form": "Tablet"},
    {"name": "GABANTIN 100MG", "form": "Tablet"},
    {"name": "GABANTIN 100MG TAB", "form": "Tablet"},
    {"name": "GABANTIN 300MG TAB", "form": "Tablet"},
    {"name": "GABANTIN FORTE", "form": "Tablet"},
    {"name": "GABANTIN NT TAB", "form": "Tablet"},
    {"name": "GABANTIN PLUS", "form": "Tablet"},
    {"name": "GABANYL NT 100 TAB", "form": "Tablet"},
    {"name": "GABANYL NT100", "form": "Medicine"},
    {"name": "GABAPREX-M", "form": "Medicine"},
    {"name": "GABATOR 300CAP", "form": "Capsule"},
    {"name": "GABAVAX NT TAB", "form": "Tablet"},
    {"name": "GABAYES PLUS", "form": "Medicine"},
    {"name": "GABAYES PLUS TAB", "form": "Tablet"},
    {"name": "GALACT GRANULES 200GM", "form": "Powder"},
    {"name": "GALVAMARK 50MG", "form": "Medicine"},
    {"name": "GALVAMARK MET 50/500", "form": "Medicine"},
    {"name": "GALVUS 50MG TAB", "form": "Tablet"},
    {"name": "GALVUS MET 50/500MG", "form": "Tablet"},
    {"name": "GALVUS OD 100MG", "form": "Tablet"},
    {"name": "GALVUSMET 50/1000MG TAB", "form": "Tablet"},
    {"name": "GALVUSMET 50/850MG TAB", "form": "Tablet"},
    {"name": "GANATON OD CAPS", "form": "Capsule"},
    {"name": "GANATON TAB", "form": "Tablet"},
    {"name": "GANATON TOTAL CAPS", "form": "Capsule"},
    {"name": "GANFORT EYE DROPS 3ML", "form": "Drops"},
    {"name": "GARDENAL 30MG TAB", "form": "Tablet"},
    {"name": "GARDENAL 60MG TAB", "form": "Tablet"},
    {"name": "GARLIC PEARLS", "form": "Tablet"},
    {"name": "GAS O FAST GUAVA FLAVOUR SACHET 5GM", "form": "Powder"},
    {"name": "GAS O FAST LEMON SACHET", "form": "Powder"},
    {"name": "GASEX TAB", "form": "Tablet"},
    {"name": "GAVISCON SYP 150ML", "form": "Syrup"},
    {"name": "GELUSIL MPS ORIGINAL MINT FLAVOUR SUGAR FREE SYP 200ML", "form": "Syrup"},
    {"name": "GELUSIL SYP 200ML", "form": "Syrup"},
    {"name": "GELUSIL SYP 400ML", "form": "Syrup"},
    {"name": "GELUSIL TAB", "form": "Tablet"},
    {"name": "GEMCAL CAPS", "form": "Capsule"},
    {"name": "GEMCAL D3", "form": "Tablet"},
    {"name": "GEMCAL PLUS SOFT CAPS", "form": "Capsule"},
    {"name": "GEMCAL-CAP", "form": "Capsule"},
    {"name": "GEMER 0.5MG TAB", "form": "Tablet"},
    {"name": "GEMER 1MG TAB", "form": "Tablet"},
    {"name": "GEMER 2MG TAB", "form": "Tablet"},
    {"name": "GEMER 3MG", "form": "Tablet"},
    {"name": "GEMER 4 MG TAB", "form": "Tablet"},
    {"name": "GEMER DS 1MG TAB", "form": "Tablet"},
    {"name": "GEMER DS 2MG TAB", "form": "Tablet"},
    {"name": "GEMER FORTE 1MG TAB", "form": "Tablet"},
    {"name": "GEMER FORTE 2 MG TAB", "form": "Tablet"},
    {"name": "GEMER P1MG TAB", "form": "Tablet"},
    {"name": "GEMER P2MG TAB", "form": "Tablet"},
    {"name": "GEMER V2", "form": "Tablet"},
    {"name": "GENTAKEM D", "form": "Medicine"},
    {"name": "GENTICYN 80MG INJ 2ML", "form": "Injection"},
    {"name": "GERIFORTE TAB", "form": "Tablet"},
    {"name": "GERMBETA 10%", "form": "Medicine"},
    {"name": "GIBTULIO 10MG TAB", "form": "Tablet"},
    {"name": "GIBTULIO 25MG TAB", "form": "Tablet"},
    {"name": "GILLETTE FOAM REGULAR", "form": "Medicine"},
    {"name": "GILLETTE SHAVING FOAM NEEM", "form": "Medicine"},
    {"name": "GLADOR 1MG TAB", "form": "Tablet"},
    {"name": "GLADOR 2MG TAB", "form": "Tablet"},
    {"name": "GLADOR 3", "form": "Tablet"},
    {"name": "GLADOR M1", "form": "Tablet"},
    {"name": "GLADOR M2 TAB", "form": "Tablet"},
    {"name": "GLENDAN 4 MG", "form": "Medicine"},
    {"name": "GLICLA DM FORTE TAB", "form": "Tablet"},
    {"name": "GLICLA DM PLUS TAB", "form": "Tablet"},
    {"name": "GLIMDA 1", "form": "Medicine"},
    {"name": "GLIMDA 1MG TAB", "form": "Tablet"},
    {"name": "GLIMDA 2", "form": "Medicine"},
    {"name": "GLIMDA 2MG TAB", "form": "Tablet"},
    {"name": "GLIMDA 4", "form": "Medicine"},
    {"name": "GLIMDA 4 TAB", "form": "Tablet"},
    {"name": "GLIMDA MV 1 TAB SR", "form": "Tablet"},
    {"name": "GLIMDA MV 1 TABLET SR 10", "form": "Tablet"},
    {"name": "GLIMDA MV1", "form": "Medicine"},
    {"name": "GLIMDA MV2", "form": "Medicine"},
    {"name": "GLIMER-1MG TAB", "form": "Tablet"},
    {"name": "GLIMER-2MG", "form": "Tablet"},
    {"name": "GLIMESTAR 1 MG TAB", "form": "Tablet"},
    {"name": "GLIMESTAR 2MG TAB", "form": "Tablet"},
    {"name": "GLIMESTAR 3MG TAB", "form": "Tablet"},
    {"name": "GLIMESTAR M 1MG TAB", "form": "Tablet"},
    {"name": "GLIMESTAR M 1MG TAB 10S", "form": "Tablet"},
    {"name": "GLIMESTAR M1 TAB", "form": "Tablet"},
    {"name": "GLIMESTAR M2 FORTE", "form": "Tablet"},
    {"name": "GLIMESTAR M2 TAB", "form": "Tablet"},
    {"name": "GLIMESTAR PM1", "form": "Tablet"},
    {"name": "GLIMESTAR PM2 TAB", "form": "Tablet"},
    {"name": "GLIMIHELP M 1MG TAB", "form": "Tablet"},
    {"name": "GLIMIHELP M 2MG TAB", "form": "Tablet"},
    {"name": "GLIMIHELP M1", "form": "Medicine"},
    {"name": "GLIMIHELP M2", "form": "Medicine"},
    {"name": "GLIMIHELP PM 1 TAB", "form": "Tablet"},
    {"name": "GLIMIHELP PM 2 TAB", "form": "Tablet"},
    {"name": "GLIMIHELP PM1", "form": "Medicine"},
    {"name": "GLIMIHELP PM2", "form": "Medicine"},
    {"name": "GLIMIHELP VM1 TAB", "form": "Tablet"},
    {"name": "GLIMIHELP VM1/0.2", "form": "Medicine"},
    {"name": "GLIMIHELP VM2 TAB", "form": "Tablet"},
    {"name": "GLIMIHELP VM2/0.2", "form": "Medicine"},
    {"name": "GLIMIHELP VM2/0.2 TAB", "form": "Tablet"},
    {"name": "GLIMISAVE 1MG TAB", "form": "Tablet"},
    {"name": "GLIMISAVE 2MG TAB", "form": "Tablet"},
    {"name": "GLIMISAVE MV 3.3 TAB", "form": "Tablet"},
    {"name": "GLIMISAVE- M1", "form": "Tablet"},
    {"name": "GLIMISAVE- M2", "form": "Tablet"},
    {"name": "GLIMY 1MG TAB", "form": "Tablet"},
    {"name": "GLIMY 2MG TAB", "form": "Tablet"},
    {"name": "GLIMY 3MG TAB", "form": "Tablet"},
    {"name": "GLIMY M1 TAB", "form": "Tablet"},
    {"name": "GLIMY M2 TAB", "form": "Tablet"},
    {"name": "GLINIL M 10 TAB", "form": "Tablet"},
    {"name": "GLIPTAGREAT 50MG TAB", "form": "Tablet"},
    {"name": "GLIPTAGREAT M", "form": "Tablet"},
    {"name": "GLISEN SM 1/50/500", "form": "Medicine"},
    {"name": "GLISEN SM 2/50/500", "form": "Medicine"},
    {"name": "GLITASENZ M 100", "form": "Medicine"},
    {"name": "GLIZID 40MG TAB", "form": "Tablet"},
    {"name": "GLIZID 80MG TAB", "form": "Tablet"},
    {"name": "GLIZID M TAB", "form": "Tablet"},
    {"name": "GLIZID MR 30MG TAB", "form": "Tablet"},
    {"name": "GLIZID MR 60MG TAB", "form": "Tablet"},
    {"name": "GLIZID MV TAB", "form": "Tablet"},
    {"name": "GLOBAC XT TAB", "form": "Tablet"},
    {"name": "GLOBAC Z CAPS", "form": "Capsule"},
    {"name": "GLOBAC Z LIQUID 200ML", "form": "Syrup"},
    {"name": "GLUCOBAY 25MG TAB", "form": "Tablet"},
    {"name": "GLUCOBAY 50MG TAB", "form": "Tablet"},
    {"name": "GLUCOBAY M 50MG TAB", "form": "Tablet"},
    {"name": "GLUCOBAY M25MG TAB", "form": "Tablet"},
    {"name": "GLUCOJET DM TAB", "form": "Tablet"},
    {"name": "GLUCOMOL 0.5ML E/DROPS 3ML", "form": "Drops"},
    {"name": "GLUCOND ORANGE", "form": "Medicine"},
    {"name": "GLUCONORM G1 TABS", "form": "Tablet"},
    {"name": "GLUCONORM G2 TABS", "form": "Tablet"},
    {"name": "GLUCONORM SR 1GM", "form": "Tablet"},
    {"name": "GLUCONORM SR TABS", "form": "Tablet"},
    {"name": "GLUCONORM VG2", "form": "Tablet"},
    {"name": "GLUCORED FORTE 850TAB", "form": "Tablet"},
    {"name": "GLUCORED FORTE TAB", "form": "Tablet"},
    {"name": "GLUCORED TAB", "form": "Tablet"},
    {"name": "GLUFORMIN 500MG TAB", "form": "Tablet"},
    {"name": "GLUFORMIN G1 TAB", "form": "Tablet"},
    {"name": "GLUFORMIN G2 TAB", "form": "Tablet"},
    {"name": "GLUFORMIN XL 500MG TAB", "form": "Tablet"},
    {"name": "GLY SEB SOAP 75GM", "form": "Soap"},
    {"name": "GLYBOVIN 1.25", "form": "Medicine"},
    {"name": "GLYBOVIN 2.5", "form": "Medicine"},
    {"name": "GLYBOVIN 2.5MG TAB", "form": "Tablet"},
    {"name": "GLYCINORM  M80MG TAB", "form": "Tablet"},
    {"name": "GLYCINORM 40MG TAB", "form": "Tablet"},
    {"name": "GLYCINORM 80MG TAB", "form": "Tablet"},
    {"name": "GLYCINORM M 30 OD TAB", "form": "Tablet"},
    {"name": "GLYCINORM M 60 OD TAB", "form": "Tablet"},
    {"name": "GLYCINORM M40 MG TAB", "form": "Tablet"},
    {"name": "GLYCINORM OD 30MG TAB", "form": "Tablet"},
    {"name": "GLYCINORM OD 60MG TAB", "form": "Tablet"},
    {"name": "GLYCIPAGE 850MG", "form": "Tablet"},
    {"name": "GLYCIPAGE SR 500MG TAB", "form": "Tablet"},
    {"name": "GLYCIPHAGE 250MG", "form": "Tablet"},
    {"name": "GLYCIPHAGE 500MG", "form": "Tablet"},
    {"name": "GLYCIPHAGE 850MG TAB", "form": "Tablet"},
    {"name": "GLYCIPHAGE G1 TAB", "form": "Tablet"},
    {"name": "GLYCIPHAGE G2 TAB", "form": "Tablet"},
    {"name": "GLYCIPHAGE SR 1GM", "form": "Tablet"},
    {"name": "GLYCIPHAGE SR 850MG", "form": "Tablet"},
    {"name": "GLYCIPHAGE VG1", "form": "Tablet"},
    {"name": "GLYCIPHAGE VG2MG TAB", "form": "Tablet"},
    {"name": "GLYCOHALE FB 400 ROTACAPS", "form": "Capsule"},
    {"name": "GLYCOHALE FB 400 ROTACAPS CAP 10S", "form": "Capsule"},
    {"name": "GLYCOMET 1 GM", "form": "Tablet"},
    {"name": "GLYCOMET 250MG", "form": "Tablet"},
    {"name": "GLYCOMET 250MG TAB", "form": "Tablet"},
    {"name": "GLYCOMET 500MG TAB", "form": "Tablet"},
    {"name": "GLYCOMET 850MG TAB", "form": "Tablet"},
    {"name": "GLYCOMET GP 0.5MG TAB", "form": "Tablet"},
    {"name": "GLYCOMET GP 1MG TAB", "form": "Tablet"},
    {"name": "GLYCOMET GP 2MG TAB", "form": "Tablet"},
    {"name": "GLYCOMET GP1 FORTE", "form": "Tablet"},
    {"name": "GLYCOMET GP2 FORTE TAB", "form": "Tablet"},
    {"name": "GLYCOMET SR 500MG TAB", "form": "Tablet"},
    {"name": "GLYCOMET SR 850MG", "form": "Tablet"},
    {"name": "GLYCOMET TRIO 1 MG TABS", "form": "Tablet"},
    {"name": "GLYCOMET TRIO 2/0.3MG", "form": "Tablet"},
    {"name": "GLYCOMET TRIO 2MG TABS", "form": "Tablet"},
    {"name": "GLYKIND-M  TAB", "form": "Tablet"},
    {"name": "GLYNASE 5MG TAB", "form": "Tablet"},
    {"name": "GLYNASE MF", "form": "Tablet"},
    {"name": "GLYNASE XL 10MG TAB", "form": "Tablet"},
    {"name": "GLYNASE XL 5MG TAB", "form": "Tablet"},
    {"name": "GLYPRIDE 1MG TAB", "form": "Tablet"},
    {"name": "GLYPRIDE 2MG TAB", "form": "Tablet"},
    {"name": "GLYREE M1 TAB 10X10S", "form": "Tablet"},
    {"name": "GLYREE M2 10'S", "form": "Tablet"},
    {"name": "GLYXAMBI 10/5MG TAB", "form": "Tablet"},
    {"name": "GLYXAMBI 25/5MG TAB", "form": "Tablet"},
    {"name": "GOOD NEWS", "form": "Medicine"},
    {"name": "GOODBLOC LA 20", "form": "Medicine"},
    {"name": "GOODMORN", "form": "Medicine"},
    {"name": "GP 0.5MG", "form": "Tablet"},
    {"name": "GP 1MG TAB", "form": "Tablet"},
    {"name": "GP 2MG TAB", "form": "Tablet"},
    {"name": "GP 3MG TAB", "form": "Tablet"},
    {"name": "GP 4MG TAB", "form": "Tablet"},
    {"name": "GRANTIN D GEL", "form": "Medicine"},
    {"name": "GRANTIN D GEL 30GM", "form": "Cream"},
    {"name": "GRENIL TAB", "form": "Tablet"},
    {"name": "GRILINCTUS DX SYP 100ML", "form": "Syrup"},
    {"name": "GROWCARE HAIR OIL 100ML", "form": "Oil"},
    {"name": "GTN SORBITRATE 2.6 TAB", "form": "Tablet"},
    {"name": "GTN SORBITRATE 6.4 TAB", "form": "Tablet"},
    {"name": "GTN SORBITRATE CR6.4", "form": "Tablet"},
    {"name": "GUDCEF 100 DRY SYP 30ML", "form": "Syrup"},
    {"name": "GUDCEF 200MG TAB", "form": "Tablet"},
    {"name": "GUDCEF 50 DRY SYP 30ML", "form": "Syrup"},
    {"name": "GUDCEF CV 100 TAB", "form": "Tablet"},
    {"name": "GUDCEF CV 200 MG TAB", "form": "Tablet"},
    {"name": "GUDPRES XL 50MG TAB", "form": "Tablet"},
    {"name": "GUMTONE GEL 50GM", "form": "Cream"},
    {"name": "GUMTONE POWDER 40GM", "form": "Powder"},
    {"name": "GUTBLISS", "form": "Medicine"},
    {"name": "GUTBLISS CAP", "form": "Capsule"},
    {"name": "GUTQUICK SUSP 170ML", "form": "Syrup"},
    {"name": "GYNOVIT SYP 200ML", "form": "Syrup"},
    {"name": "HAEM UP LIQ 200ML", "form": "Tablet"},
    {"name": "HAEM-UP GEMS 30'S", "form": "Tablet"},
    {"name": "HAIRFOLIC MEN", "form": "Medicine"},
    {"name": "HAIRFOLIC WOMEN", "form": "Medicine"},
    {"name": "HALOVATE F CREAM 15GM", "form": "Cream"},
    {"name": "HALOVATE S OINT 30GM", "form": "Cream"},
    {"name": "HAMDARD SAFI 200ML", "form": "Tablet"},
    {"name": "HANSAPLAST REGULAR", "form": "Tablet"},
    {"name": "HANSAPLAST REGULAR 100", "form": "Bandage"},
    {"name": "HAPPI 20MG TAB", "form": "Tablet"},
    {"name": "HAPPI-D", "form": "Tablet"},
    {"name": "HAPPY BABY GIFT PACK", "form": "Medicine"},
    {"name": "HCQS 200TAB", "form": "Tablet"},
    {"name": "HCQS 300TAB", "form": "Tablet"},
    {"name": "HCQS 400MG TAB", "form": "Tablet"},
    {"name": "HEAD SHOULDER COOL MENTHOL", "form": "Medicine"},
    {"name": "HEAD SHOULDER SMOTH SILKY", "form": "Medicine"},
    {"name": "HEADSET TAB 2'S", "form": "Tablet"},
    {"name": "HEALCEE PLUS 15 TAB", "form": "Tablet"},
    {"name": "HEALCEE PLUS TAB", "form": "Tablet"},
    {"name": "HEALCEE TAB", "form": "Medicine"},
    {"name": "HEALD SHOULDER ANTI-HAIRFALL", "form": "Medicine"},
    {"name": "HEALD SHOULDER OILY STICKY DANDRUFF", "form": "Medicine"},
    {"name": "HEALTH OK TAB", "form": "Tablet"},
    {"name": "HEALTH OK TAB 30S", "form": "Tablet"},
    {"name": "HEAM-UP 100'S", "form": "Tablet"},
    {"name": "HEMFER SYP 225ML", "form": "Syrup"},
    {"name": "HEPACO 140 TAB", "form": "Tablet"},
    {"name": "HEPACOZY SACHET", "form": "Powder"},
    {"name": "HEPATOGLOBINE SYP 300ML", "form": "Syrup"},
    {"name": "HERPIKIND 400MG TAB", "form": "Tablet"},
    {"name": "HETRAZAN 100MG TAB", "form": "Tablet"},
    {"name": "HEXIDINE MOUTH WASH 160ML", "form": "Soap"},
    {"name": "HEXIDINE MOUTH WASH 80ML", "form": "Soap"},
    {"name": "HICOPE SYP 100ML", "form": "Syrup"},
    {"name": "HIFENAC 100MG TAB", "form": "Tablet"},
    {"name": "HIFENAC SP TAB", "form": "Tablet"},
    {"name": "HIFENAC SR TABS", "form": "Tablet"},
    {"name": "HIFENAC-MR TAB", "form": "Tablet"},
    {"name": "HIFENAC-P TAB", "form": "Tablet"},
    {"name": "HIMALAYA ABANA 60 TAB", "form": "Tablet"},
    {"name": "HIMALAYA ABANA TAB", "form": "Tablet"},
    {"name": "HIMALAYA ANTI HAIR FALL SHAMPOO", "form": "Medicine"},
    {"name": "HIMALAYA BABY POWDER", "form": "Medicine"},
    {"name": "HIMALAYA GASEX TAB", "form": "Tablet"},
    {"name": "HIMALAYA LIV 52 TAB", "form": "Tablet"},
    {"name": "HIPRES 25", "form": "Medicine"},
    {"name": "HIPRES 25MG TAB", "form": "Tablet"},
    {"name": "HISTAFREE M TAB", "form": "Tablet"},
    {"name": "HISTAFREE SYP 60ML", "form": "Syrup"},
    {"name": "HISTOX 16", "form": "Medicine"},
    {"name": "HITAP ER 50", "form": "Medicine"},
    {"name": "HITAP ER 50MG TAB", "form": "Tablet"},
    {"name": "HITAP ER 50MG TAB 15S", "form": "Tablet"},
    {"name": "HOPACE 2.5MG TAB", "form": "Tablet"},
    {"name": "HOPACE 5MG TAB", "form": "Tablet"},
    {"name": "HP KIT TABS", "form": "Tablet"},
    {"name": "HUMALOG MIX 25 CATRIDGE 3ML", "form": "Tablet"},
    {"name": "HUMALOG MIX 50 CATRIDGE 3ML", "form": "Tablet"},
    {"name": "HUMAN ACTRAPID 10ML", "form": "Tablet"},
    {"name": "HUMAN INSULARTED 40IU", "form": "Tablet"},
    {"name": "HUMAN MIXTARD 30\\70 VIAL 3ML", "form": "Injection"},
    {"name": "HUMAN MIXTARD 50 VAIL 10ML", "form": "Tablet"},
    {"name": "HUMAN MIXTRAD 100 UI 10ML", "form": "Tablet"},
    {"name": "HUMINSULIN 30/70 40UI 10ML", "form": "Tablet"},
    {"name": "HUMINSULIN 50/50 40IU", "form": "Tablet"},
    {"name": "HUMINSULIN N CARTGE 3ML", "form": "Tablet"},
    {"name": "HUMINSULIN N VIAL 10ML", "form": "Injection"},
    {"name": "HUMINSULIN R INJ 40IU", "form": "Injection"},
    {"name": "HUMINSULIN-30/70 CATR 3ML", "form": "Tablet"},
    {"name": "HUNGREE SYRUP", "form": "Medicine"},
    {"name": "HYDENT K PASTE 100GM", "form": "Paste"},
    {"name": "HYDROHEAL AM 50GM", "form": "Tablet"},
    {"name": "HYDROHEAL AM15GM", "form": "Tablet"},
    {"name": "HYDROXYSEN", "form": "Medicine"},
    {"name": "HYDROXYSEN 200 TAB", "form": "Tablet"},
    {"name": "HYNASAL DROPS /SPRAY 20ML", "form": "Spray"},
    {"name": "HYNASAL DROPS SPRAY 20ML", "form": "Drops"},
    {"name": "HYOCIMAX S", "form": "Medicine"},
    {"name": "HYPERNEB 3% RESPULES 4ML", "form": "Inhaler"},
    {"name": "IBUGESIC PLUS (STRAWBERRY) SUSP", "form": "Suspension"},
    {"name": "IBUGESIC PLUS 100ML", "form": "Tablet"},
    {"name": "IBUGESIC PLUS 20TAB 20TAB", "form": "Medicine"},
    {"name": "IBUGESIC PLUS STRAWBERRY SUSP", "form": "Syrup"},
    {"name": "IBUGESIC PLUS SYP 100ML", "form": "Syrup"},
    {"name": "IBUGESIC PLUS SYP 60ML", "form": "Syrup"},
    {"name": "IBUGESIC PLUS TAB", "form": "Tablet"},
    {"name": "ICE GEL 25GM", "form": "Cream"},
    {"name": "IMEZEMIC 500 TAB", "form": "Tablet"},
    {"name": "IMODIUM 2MG CAP", "form": "Capsule"},
    {"name": "IMOL  PLUS TAB", "form": "Tablet"},
    {"name": "IMULAC MOISTRIZING LOTION", "form": "Lotion"},
    {"name": "IMUNWISE OK", "form": "Sachet"},
    {"name": "IMUNWISE OK SACHET", "form": "Powder"},
    {"name": "INAPURE 5MG TAB", "form": "Tablet"},
    {"name": "INCID-L TAB", "form": "Tablet"},
    {"name": "INDERAL 10MG TABS", "form": "Tablet"},
    {"name": "INDERAL 20MG TAB", "form": "Tablet"},
    {"name": "INDERAL 40MG TAB", "form": "Tablet"},
    {"name": "INDERAL LA 20MG TAB", "form": "Tablet"},
    {"name": "INDERAL LA 40MG TAB", "form": "Tablet"},
    {"name": "INDOCAP CAP", "form": "Capsule"},
    {"name": "INDOCAP SR CAPS", "form": "Capsule"},
    {"name": "INDULEKHA BRINGHA OIL", "form": "Medicine"},
    {"name": "INJ FCM 500", "form": "Medicine"},
    {"name": "INJ PROLUTON", "form": "Medicine"},
    {"name": "INSUGEN 30/70 ING 2ML", "form": "Tablet"},
    {"name": "INSUGEN 50/50 INJ 10ML", "form": "Injection"},
    {"name": "INSUGEN N 10ML", "form": "Tablet"},
    {"name": "INSUGEN R 10ML", "form": "Tablet"},
    {"name": "INVOKANA 100MG 10'S", "form": "Tablet"},
    {"name": "IOBET EYE DROPS 5ML", "form": "Drops"},
    {"name": "IODEX ULTRA GEL 30GM", "form": "Cream"},
    {"name": "IODEX ULTRAGEL 15GM", "form": "Cream"},
    {"name": "IOTIM 0.5ML DROPS", "form": "Drops"},
    {"name": "IPILL EMERGENCY CONTRACEPTIVE PILL", "form": "Tablet"},
    {"name": "IPRAVENT REPSULES 2ML", "form": "Tablet"},
    {"name": "ISCEPT FORTE", "form": "Tablet"},
    {"name": "ISCEPT FORTE TAB", "form": "Tablet"},
    {"name": "ISMO 10MG TAB", "form": "Tablet"},
    {"name": "ISMO 20MG", "form": "Tablet"},
    {"name": "ISOCALDIN 300MG", "form": "Tablet"},
    {"name": "ISOERDIL 10MG TAB", "form": "Tablet"},
    {"name": "ISOFIT 10", "form": "Medicine"},
    {"name": "ISOFIT TAB", "form": "Tablet"},
    {"name": "ISOLAZINE TAB", "form": "Tablet"},
    {"name": "ISORDIL 5MG TAB", "form": "Tablet"},
    {"name": "ISTAMET 50 500MG TAB", "form": "Tablet"},
    {"name": "ISTAMET 50/1000MG TAB", "form": "Tablet"},
    {"name": "ISTAMET 50/500MG TAB", "form": "Tablet"},
    {"name": "ISTAMET D XR 500 TAB", "form": "Tablet"},
    {"name": "ISTAMET G IR 50/500/1 TAB", "form": "Tablet"},
    {"name": "ISTAMET G IR TAB", "form": "Tablet"},
    {"name": "ISTAMET XR (100/1000) TAB", "form": "Tablet"},
    {"name": "ISTAMET XR 100 1000 TAB", "form": "Tablet"},
    {"name": "ISTAMET XR 500 TAB", "form": "Tablet"},
    {"name": "ISTAVEL 100MG TAB", "form": "Tablet"},
    {"name": "ISTAVEL 25MG TAB", "form": "Tablet"},
    {"name": "ISTAVEL 50MG TAB", "form": "Tablet"},
    {"name": "ISTAVEL D 10/100MG TAB", "form": "Tablet"},
    {"name": "ISTAVEL D 10/50MG TAB", "form": "Tablet"},
    {"name": "ISTAVEL D 5/50MG TAB", "form": "Tablet"},
    {"name": "ISTAVEL D TAB", "form": "Tablet"},
    {"name": "ITCH GUARD CREAM 12GM", "form": "Cream"},
    {"name": "ITCH GUARD CREAM 20GM", "form": "Cream"},
    {"name": "ITONE EYE DROPS 10ML", "form": "Drops"},
    {"name": "ITRALIST 100", "form": "Capsule"},
    {"name": "ITRALIST 100 CAPSULE", "form": "Capsule"},
    {"name": "ITRALIST 200 CAP", "form": "Capsule"},
    {"name": "ITRANOX 200", "form": "Medicine"},
    {"name": "ITRANOX 200MG CAP", "form": "Capsule"},
    {"name": "ITROMED SOAP", "form": "Medicine"},
    {"name": "IVABID 5MG TAB", "form": "Tablet"},
    {"name": "IVABRAD 5MG TAB", "form": "Tablet"},
    {"name": "IVEPRED 4MG TAB", "form": "Tablet"},
    {"name": "JAKOSTE PLUS", "form": "Medicine"},
    {"name": "JALRA 50MG", "form": "Tablet"},
    {"name": "JALRA M 50/500 MG", "form": "Tablet"},
    {"name": "JALRA M 50MG/1000MG TAB", "form": "Tablet"},
    {"name": "JALRA OD 100MG", "form": "Tablet"},
    {"name": "JANUMET 50/1000MG TAB", "form": "Tablet"},
    {"name": "JANUMET 50/500MG TAB", "form": "Tablet"},
    {"name": "JANUMET XR CP TAB", "form": "Tablet"},
    {"name": "JANUVIA 100MG TAB", "form": "Tablet"},
    {"name": "JANUVIA 50MG", "form": "Tablet"},
    {"name": "JARDIANCE 10MG TAB", "form": "Tablet"},
    {"name": "JARDIANCE 25MG TAB", "form": "Tablet"},
    {"name": "JARDIANCE MET 12.5/1000MG", "form": "Tablet"},
    {"name": "JARDIANCE MET 12.5/500MG", "form": "Tablet"},
    {"name": "JARDIANCE MET 5/500MG TAB", "form": "Tablet"},
    {"name": "JAREN 25 MG", "form": "Medicine"},
    {"name": "JAREN L 25/5", "form": "Medicine"},
    {"name": "JMS IV SET", "form": "Medicine"},
    {"name": "JOINTACE C2 TAB", "form": "Tablet"},
    {"name": "JOINTACE DN TAB", "form": "Tablet"},
    {"name": "JOINTACE TAB", "form": "Tablet"},
    {"name": "JUNGLE FORMULA LICE LOTION 25ML", "form": "Lotion"},
    {"name": "JUNGLE FORMULA LICE SHAMPOO 25ML", "form": "Shampoo"},
    {"name": "JUNGLE FORMULA ROLLON 50ML", "form": "Tablet"},
    {"name": "JUNIOR LANZOL 15MG", "form": "Tablet"},
    {"name": "JUNIOR LANZOL 30MG", "form": "Tablet"},
    {"name": "JUSDEE DROPS 30ML", "form": "Drops"},
    {"name": "JUST TEARS EYE DROPS 10ML", "form": "Drops"},
    {"name": "K GLIM 1MG TAB", "form": "Tablet"},
    {"name": "K GLIM 2MG", "form": "Tablet"},
    {"name": "K GLIM M1MG TAB", "form": "Tablet"},
    {"name": "K GLIM M2MG TAB", "form": "Tablet"},
    {"name": "K TRIP FORTE TAB", "form": "Tablet"},
    {"name": "K TRIP FORTE TAB.", "form": "Tablet"},
    {"name": "K-BIND POWDER 15GM", "form": "Powder"},
    {"name": "K-CIT SYP 200ML", "form": "Syrup"},
    {"name": "K-GEM TAB", "form": "Tablet"},
    {"name": "K-MAC SYP 200ML", "form": "Syrup"},
    {"name": "KALZIN 6L INJ 1ML", "form": "Injection"},
    {"name": "KANDIZYME SYRUP", "form": "Medicine"},
    {"name": "KARVOL PLUS", "form": "Tablet"},
    {"name": "KASJEL CS SYRUP SF", "form": "Medicine"},
    {"name": "KENOCORT 40MG INJ 1ML", "form": "Injection"},
    {"name": "KENOCORT PASTE 5GM", "form": "Paste"},
    {"name": "KENZ 15ML", "form": "Tablet"},
    {"name": "KENZ OIL 30ML", "form": "Oil"},
    {"name": "KENZ OIL 60ML", "form": "Oil"},
    {"name": "KEPPRA 250MG TAB", "form": "Tablet"},
    {"name": "KEPPRA 500MG TAB", "form": "Tablet"},
    {"name": "KEPPRA 750MG", "form": "Tablet"},
    {"name": "KETANOV INJ  5X1ML", "form": "Injection"},
    {"name": "KETANOV TAB", "form": "Tablet"},
    {"name": "KETO B CREAM 10GM", "form": "Cream"},
    {"name": "KETO SOAP 100GM", "form": "Soap"},
    {"name": "KETO SOAP 50GM", "form": "Soap"},
    {"name": "KETOADD TAB", "form": "Tablet"},
    {"name": "KETOCIP 2% SHAMPOO 100ML", "form": "Shampoo"},
    {"name": "KETOCIP CREAM", "form": "Medicine"},
    {"name": "KETOKEM Z SHAMPOO 110ML", "form": "Shampoo"},
    {"name": "KETONALOG ALPHA", "form": "Medicine"},
    {"name": "KETOROL DT TAB", "form": "Tablet"},
    {"name": "KETOROL INJ 1ML", "form": "Injection"},
    {"name": "KETOROL TAB", "form": "Tablet"},
    {"name": "KETOSTAR CREAM 30GM", "form": "Cream"},
    {"name": "KETOSTAR SOAP 50GM", "form": "Soap"},
    {"name": "KIDODENT PASTE 75GM", "form": "Paste"},
    {"name": "KIDS PRO VENNILA 200GM", "form": "Tablet"},
    {"name": "KIDS PRO VENNILA 500GM", "form": "Tablet"},
    {"name": "KOLDKIND", "form": "Medicine"},
    {"name": "KORANDIL 10MG  TAB", "form": "Tablet"},
    {"name": "KORANDIL 5MG TAB", "form": "Tablet"},
    {"name": "KRACK 15GM", "form": "Tablet"},
    {"name": "KRACK CREAM 25GM", "form": "Cream"},
    {"name": "KRACK HEEL REPAIR CREAM 25GM", "form": "Cream"},
    {"name": "KRIMLY", "form": "Medicine"},
    {"name": "KRIMSON 35 MG", "form": "Tablet"},
    {"name": "KUFRIL LS DROPS 15ML", "form": "Drops"},
    {"name": "L HIST MONT JUNIOR 30 ML", "form": "Medicine"},
    {"name": "L MONTUS SYP 60ML", "form": "Syrup"},
    {"name": "L MONTUS TAB", "form": "Tablet"},
    {"name": "LABEBET 100 TAB", "form": "Tablet"},
    {"name": "LABETOS 100", "form": "Medicine"},
    {"name": "LACOSAM 100MG TAB", "form": "Tablet"},
    {"name": "LACOSAM 50MG TAB", "form": "Tablet"},
    {"name": "LACOSET 100 TAB", "form": "Tablet"},
    {"name": "LACOSET 50MG TAB", "form": "Tablet"},
    {"name": "LACTARE 30 CAP", "form": "Capsule"},
    {"name": "LACTARE CAP", "form": "Capsule"},
    {"name": "LACTARE CAPS", "form": "Capsule"},
    {"name": "LACTARE GRANULE 250GM", "form": "Powder"},
    {"name": "LACTICOZY GRANULES", "form": "Powder"},
    {"name": "LACTIFIBER 180GM", "form": "Tablet"},
    {"name": "LACTIFIBER 90GM", "form": "Tablet"},
    {"name": "LACTO-B CAPS", "form": "Capsule"},
    {"name": "LACTONIC GRANULES 200GM", "form": "Powder"},
    {"name": "LACTONIC POWDER 200GM", "form": "Powder"},
    {"name": "LANOL ER 650MG TAB", "form": "Tablet"},
    {"name": "LANOXIN TAB", "form": "Tablet"},
    {"name": "LANTUS CARTRIDGE 3ML", "form": "Tablet"},
    {"name": "LANTUS SOLOSTAR FLEXPEN 3ML", "form": "Injection"},
    {"name": "LANUM TAB", "form": "Tablet"},
    {"name": "LARIAGO 250 TAB", "form": "Tablet"},
    {"name": "LARIAGO DS TAB", "form": "Tablet"},
    {"name": "LASILACTONE 50MG", "form": "Tablet"},
    {"name": "LASILACTONE 50MG TAB", "form": "Tablet"},
    {"name": "LASIPEN 40", "form": "Medicine"},
    {"name": "LASIPEN 40MG TAB", "form": "Tablet"},
    {"name": "LASIX 40MG TAB", "form": "Tablet"},
    {"name": "LAXIKEM MIXED FRUIT 170 ML SYP", "form": "Medicine"},
    {"name": "LECOPE TABS", "form": "Tablet"},
    {"name": "LEE DOTT SACHET 1GM", "form": "Powder"},
    {"name": "LEEBIOTIC CAP", "form": "Medicine"},
    {"name": "LEECOVAX M", "form": "Medicine"},
    {"name": "LEECOVAX M TAB", "form": "Tablet"},
    {"name": "LEFRA 10", "form": "Tablet"},
    {"name": "LESURIDE TAB", "form": "Tablet"},
    {"name": "LETROLIM 2.5", "form": "Medicine"},
    {"name": "LETROLIM 2.5 TAB", "form": "Tablet"},
    {"name": "LETROZ 2.5MG TAB", "form": "Tablet"},
    {"name": "LEVEPSY 250MG TAB", "form": "Tablet"},
    {"name": "LEVEPSY 500MG TAB", "form": "Tablet"},
    {"name": "LEVERA 250MG TAB", "form": "Tablet"},
    {"name": "LEVERA 500 MG TAB", "form": "Tablet"},
    {"name": "LEVIPIL 1GM TAB", "form": "Tablet"},
    {"name": "LEVIPIL 250MG TAB", "form": "Tablet"},
    {"name": "LEVIPIL 500MG TAB", "form": "Tablet"},
    {"name": "LEVIPIL 750MG TAB", "form": "Tablet"},
    {"name": "LEVIPIL SYP 100ML", "form": "Syrup"},
    {"name": "LEVIPIL XR 500", "form": "Tablet"},
    {"name": "LEVOCAT 500", "form": "Medicine"},
    {"name": "LEVOCAT 500 TAB", "form": "Tablet"},
    {"name": "LEVOFLOX 750MG TAB", "form": "Tablet"},
    {"name": "LEVOLIN .63 RESPULES 5ML", "form": "Tablet"},
    {"name": "LEVOLIN 1.25MG REPSULES 5ML", "form": "Tablet"},
    {"name": "LEVOLIN 30S ROTACAPS", "form": "Inhaler"},
    {"name": "LEVOLIN INHALER 200ML", "form": "Inhaler"},
    {"name": "LEVOLIN PLUS SYP 100ML", "form": "Syrup"},
    {"name": "LEVOLIN ROTACAPS", "form": "Capsule"},
    {"name": "LEVOLIN SYP 100ML", "form": "Syrup"},
    {"name": "LEVOQUIN 500", "form": "Medicine"},
    {"name": "LEVOQUIN 500MG TAB", "form": "Tablet"},
    {"name": "LEVPZET 5MG", "form": "Medicine"},
    {"name": "LHIST MONT SYP 30ML", "form": "Syrup"},
    {"name": "LIBOTRYP DS TAB", "form": "Tablet"},
    {"name": "LIBRAX TAB", "form": "Tablet"},
    {"name": "LIBRIUM 10MG TAB", "form": "Tablet"},
    {"name": "LIBRIUM 25MG TAB", "form": "Tablet"},
    {"name": "LICE CLEAR SHAMPOO 50ML", "form": "Shampoo"},
    {"name": "LIFE PRIDE 1MG", "form": "Tablet"},
    {"name": "LIFE PRIDE 2MG", "form": "Tablet"},
    {"name": "LIFE PRIED M2", "form": "Tablet"},
    {"name": "LIFEPRIDE M1 MG TAB", "form": "Tablet"},
    {"name": "LIMCEE 500MG TAB", "form": "Tablet"},
    {"name": "LIMCEE GUMMIES 30'S", "form": "Tablet"},
    {"name": "LINAMIT 5 MG", "form": "Medicine"},
    {"name": "LINID TAB", "form": "Tablet"},
    {"name": "LINOWIN 600", "form": "Medicine"},
    {"name": "LINOWIN 600MG TAB", "form": "Tablet"},
    {"name": "LINZOVAX 600 TAB", "form": "Tablet"},
    {"name": "LIOFEN 10MG TAB", "form": "Tablet"},
    {"name": "LIPAGLIN 4MG TAB", "form": "Tablet"},
    {"name": "LIPICROSS R 10", "form": "Medicine"},
    {"name": "LIPICROSS R 10 TAB", "form": "Tablet"},
    {"name": "LIPICROSS RF", "form": "Medicine"},
    {"name": "LIPICROSS RF TAB", "form": "Tablet"},
    {"name": "LIPICURE 10MG TAB", "form": "Tablet"},
    {"name": "LIPICURE 20MG TAB", "form": "Tablet"},
    {"name": "LIPIKIND 10MG TAB", "form": "Tablet"},
    {"name": "LIPIKIND 20MG TAB", "form": "Tablet"},
    {"name": "LIPRAX TABS", "form": "Tablet"},
    {"name": "LIPVAS 10 MG", "form": "Medicine"},
    {"name": "LIPVAS 10MG TAB", "form": "Tablet"},
    {"name": "LIPVAS 20 MG", "form": "Medicine"},
    {"name": "LIPVAS 20MG TAB", "form": "Tablet"},
    {"name": "LISTERINE COOL MINT MOUTH WASH", "form": "Medicine"},
    {"name": "LISTRIL 5MG TAB", "form": "Tablet"},
    {"name": "LITHOSUN SR", "form": "Tablet"},
    {"name": "LITTLES BABY WIPES", "form": "Medicine"},
    {"name": "LIV 52 DROPS 60ML", "form": "Drops"},
    {"name": "LIV 52 SYP 200ML", "form": "Syrup"},
    {"name": "LIV 52 SYP100ML", "form": "Syrup"},
    {"name": "LIV 52DS TAB", "form": "Tablet"},
    {"name": "LIV 52MG TAB", "form": "Tablet"},
    {"name": "LIV52 SYP 200ML", "form": "Syrup"},
    {"name": "LIVEASY CREPE BANDAGE 10 CM", "form": "Medicine"},
    {"name": "LIVEASY NAIL PAINT", "form": "Medicine"},
    {"name": "LIVEASY NATURAL MOSQUITO REPELLENT CREAM 50GM", "form": "Cream"},
    {"name": "LIVEASY PATCH", "form": "Medicine"},
    {"name": "LIVEAZY SPRAY", "form": "Medicine"},
    {"name": "LIVOFLOX 750MG TAB", "form": "Tablet"},
    {"name": "LIVOGEN SYP 200ML", "form": "Syrup"},
    {"name": "LIVOGEN TAB", "form": "Tablet"},
    {"name": "LIVOGEN XT TAB", "form": "Tablet"},
    {"name": "LIVOGEN Z TAB", "form": "Tablet"},
    {"name": "LIVOSOFT 150", "form": "Medicine"},
    {"name": "LIVOSOFT 150 TAB", "form": "Tablet"},
    {"name": "LIVOSOFT 300", "form": "Medicine"},
    {"name": "LIZERTON B6 ORAL SOLUTION 450ML", "form": "Solution"},
    {"name": "LN BETA 2.5MG", "form": "Tablet"},
    {"name": "LN BLOC 10MG TAB", "form": "Tablet"},
    {"name": "LN BLOC 5MG TAB", "form": "Tablet"},
    {"name": "LNBETA 5MG TAB", "form": "Tablet"},
    {"name": "LNBLOC 20MG TAB", "form": "Tablet"},
    {"name": "LOBATE GM-N CREAM 15GM", "form": "Cream"},
    {"name": "LOBAZAM 10MG TAB", "form": "Tablet"},
    {"name": "LOBAZAM 5MG TAB", "form": "Tablet"},
    {"name": "LOBAZAM MD 5MG TAB", "form": "Tablet"},
    {"name": "LOBET 100MG TAB", "form": "Tablet"},
    {"name": "LODENS 5", "form": "Medicine"},
    {"name": "LODENS 5MG TAB", "form": "Tablet"},
    {"name": "LODENS F", "form": "Medicine"},
    {"name": "LODENS F 10MG TAB", "form": "Tablet"},
    {"name": "LODOS 5MG TAB", "form": "Tablet"},
    {"name": "LODOZ 2.5MG TAB", "form": "Tablet"},
    {"name": "LOETTE TABS", "form": "Tablet"},
    {"name": "LOFECTION LB CAP", "form": "Capsule"},
    {"name": "LOMOFEN TAB", "form": "Tablet"},
    {"name": "LOMOTIL 20 20 TAB", "form": "Tablet"},
    {"name": "LOMOTIL TAB", "form": "Tablet"},
    {"name": "LONAZEP 0.25 TAB", "form": "Tablet"},
    {"name": "LONAZEP 0.25MG TAB", "form": "Tablet"},
    {"name": "LONAZEP 0.5MG TAB", "form": "Tablet"},
    {"name": "LONAZEP 1MG TAB", "form": "Tablet"},
    {"name": "LONAZEP 2MG TAB", "form": "Tablet"},
    {"name": "LONOPIN 40 MG INJ", "form": "Medicine"},
    {"name": "LOOZ SYP 200ML", "form": "Syrup"},
    {"name": "LOPAMIDE TAB", "form": "Tablet"},
    {"name": "LOPARET TAB", "form": "Tablet"},
    {"name": "LOPID 300 CAP", "form": "Medicine"},
    {"name": "LOPID 300MG CAP", "form": "Capsule"},
    {"name": "LOSAKIND 25MG TAB", "form": "Tablet"},
    {"name": "LOSAKIND 50MG", "form": "Tablet"},
    {"name": "LOSAKIND H TAB", "form": "Tablet"},
    {"name": "LOSANORM 25MG TAB", "form": "Tablet"},
    {"name": "LOSANORM 50MG TAB", "form": "Tablet"},
    {"name": "LOSAR 25MG TAB", "form": "Tablet"},
    {"name": "LOSAR 50MG TAB", "form": "Tablet"},
    {"name": "LOSAR H TAB", "form": "Tablet"},
    {"name": "LOSARTAR 25MG TAB", "form": "Tablet"},
    {"name": "LOSARTAR H TAB", "form": "Tablet"},
    {"name": "LOSIUM 25MG TAB", "form": "Tablet"},
    {"name": "LOSIUM 50MG TAB", "form": "Tablet"},
    {"name": "LOVOLKEM 250", "form": "Medicine"},
    {"name": "LOVOLKEM 250MG TAB", "form": "Tablet"},
    {"name": "LUBISTAR EYE 1% DROPS 10ML", "form": "Drops"},
    {"name": "LUBREX DS EYE DROPS 10ML", "form": "Drops"},
    {"name": "LUBREX EYE DROPS", "form": "Drops"},
    {"name": "LUCIARA CREAM 50GM", "form": "Cream"},
    {"name": "LUKOL TAB", "form": "Tablet"},
    {"name": "LULI EASE CREAM 10GM", "form": "Cream"},
    {"name": "LULIACT LOTION", "form": "Medicine"},
    {"name": "LULIEASE CREAM 10 GM", "form": "Medicine"},
    {"name": "LULIFIN CREAM 10GM", "form": "Cream"},
    {"name": "LULIFIN CREAM 20GM", "form": "Cream"},
    {"name": "LULIFIN CREAM 30GM", "form": "Cream"},
    {"name": "LULIHIGH LOTION", "form": "Medicine"},
    {"name": "LULITEC 20 GM CREAM", "form": "Medicine"},
    {"name": "LULITEC CREAM 10 GM", "form": "Medicine"},
    {"name": "LULITEC CREAM 10GM", "form": "Cream"},
    {"name": "LULITEC SPRAY", "form": "Medicine"},
    {"name": "LULITEC SPRAY 30ML", "form": "Spray"},
    {"name": "LULITREAT 1% SOAP LULICON 50GM", "form": "Soap"},
    {"name": "LULITREAT B CREAM 10 GM", "form": "Medicine"},
    {"name": "LULITREAT SOAP", "form": "Medicine"},
    {"name": "LUMIA- 60K", "form": "Tablet"},
    {"name": "LUMICAN 0.3 DROPS 3ML", "form": "Drops"},
    {"name": "LUMIGAN 0.1% 3ML", "form": "Tablet"},
    {"name": "LUPISULIN-M30/70IU VIAL", "form": "Injection"},
    {"name": "LUPITUSS SF SUSP 100ML", "form": "Syrup"},
    {"name": "LYMPEDIM TAB", "form": "Tablet"},
    {"name": "LYRICA 75MG CAP", "form": "Capsule"},
    {"name": "M PREDNACORTIL 4", "form": "Tablet"},
    {"name": "M PREDNACORTIL 4 TAB", "form": "Tablet"},
    {"name": "M PREDNACORTIL 8 TAB", "form": "Tablet"},
    {"name": "M2-TONE SYP 200ML", "form": "Syrup"},
    {"name": "MA DHA", "form": "Medicine"},
    {"name": "MACBION LC 100ML", "form": "Medicine"},
    {"name": "MACBION LC 200", "form": "Medicine"},
    {"name": "MACBION LC SYP 100ML", "form": "Syrup"},
    {"name": "MACBION LC SYP 200ML", "form": "Syrup"},
    {"name": "MACPLATIN 200 ML", "form": "Medicine"},
    {"name": "MACPLATIN PLUS SYP 200ML", "form": "Syrup"},
    {"name": "MACTHROMBO GEL", "form": "Medicine"},
    {"name": "MAGINS 400", "form": "Medicine"},
    {"name": "MAGINSO", "form": "Medicine"},
    {"name": "MAGINSO TAB", "form": "Tablet"},
    {"name": "MAGNAKOF DX JR", "form": "Medicine"},
    {"name": "MAGNAKOF DX SF", "form": "Medicine"},
    {"name": "MAGNAKOF DX SUGAR FREE 100 SYP", "form": "Syrup"},
    {"name": "MAGNAKOF DX SUGAR FREE SYP 60ML", "form": "Syrup"},
    {"name": "MAGNAKOF DX SUGER FREE SYP 60ML", "form": "Syrup"},
    {"name": "MAGNAKOF LS SF", "form": "Medicine"},
    {"name": "MAGNAKOF LS SUGAR FREE 100 SYP", "form": "Syrup"},
    {"name": "MAGNAKOF LS SUGAR FREE SYP", "form": "Syrup"},
    {"name": "MAHACLA RTD", "form": "Medicine"},
    {"name": "MAHAMOX CV 625", "form": "Medicine"},
    {"name": "MAHAMOX CV DUO", "form": "Medicine"},
    {"name": "MAHAMOX CV SYRP", "form": "Medicine"},
    {"name": "MAHAZIN FX TAB", "form": "Tablet"},
    {"name": "MAINTAINE TABS", "form": "Tablet"},
    {"name": "MALIDENS 500MG", "form": "Tablet"},
    {"name": "MALIDENS 650MG TAB", "form": "Tablet"},
    {"name": "MAMA XPERT PREGNANCY TEST KIT", "form": "Tablet"},
    {"name": "MANKINDS PLACIDA", "form": "Tablet"},
    {"name": "MATILDA FORTE CAPS", "form": "Capsule"},
    {"name": "MATILDA PLUS CAPS", "form": "Capsule"},
    {"name": "MAXGALIN 50MG TAB", "form": "Tablet"},
    {"name": "MAXGALIN 75MG TAB", "form": "Tablet"},
    {"name": "MAXGALIN ER 75 MG TAB", "form": "Tablet"},
    {"name": "MAXGALIN M 50", "form": "Tablet"},
    {"name": "MAXGALIN M 75MG TAB", "form": "Tablet"},
    {"name": "MAXIFLO 100 R/C", "form": "Tablet"},
    {"name": "MAXIFLO 125 INH", "form": "Tablet"},
    {"name": "MAXIFLO 250 INH", "form": "Tablet"},
    {"name": "MAXIFLO 250 ROTACAPS", "form": "Capsule"},
    {"name": "MAXIRICH", "form": "Medicine"},
    {"name": "MAXIRICH GOLD 30S", "form": "Capsule"},
    {"name": "MAXIRICH GOLD CAPSULE", "form": "Capsule"},
    {"name": "MAXIRICH MULTIVITAMIN SYP 200ML", "form": "Syrup"},
    {"name": "MAXMALA CAPS", "form": "Capsule"},
    {"name": "MAXMALA FORTE CAPS", "form": "Capsule"},
    {"name": "MAXNERVE 1000-INJ 2ML", "form": "Injection"},
    {"name": "MAXNERVE CAPS", "form": "Capsule"},
    {"name": "MAXNERVE PG CAP", "form": "Capsule"},
    {"name": "MAXOZA L SACHET", "form": "Powder"},
    {"name": "MAXTRA HS BOTTLE OF ORAL DROPS 15ML", "form": "Syrup"},
    {"name": "MAXTRA HS ORAL DROPS 15ML", "form": "Drops"},
    {"name": "MAXTRA SYP 60ML", "form": "Syrup"},
    {"name": "MEBALIN OD", "form": "Medicine"},
    {"name": "MEBALIN OD TAB", "form": "Tablet"},
    {"name": "MEBEX", "form": "Medicine"},
    {"name": "MEBEX 6 TAB", "form": "Tablet"},
    {"name": "MEBEX TAB", "form": "Tablet"},
    {"name": "MECONERV PLUS CAP", "form": "Capsule"},
    {"name": "MECOVIXR 2500 INJ", "form": "Injection"},
    {"name": "MECOVIXR D3 TAB", "form": "Tablet"},
    {"name": "MECOVIXR G TAB", "form": "Tablet"},
    {"name": "MECOVIXR LC TAB", "form": "Tablet"},
    {"name": "MECOVIXR NP", "form": "Medicine"},
    {"name": "MECOVIXR NP TAB", "form": "Tablet"},
    {"name": "MECOVIXR PLUS CAP", "form": "Capsule"},
    {"name": "MEDERMA ADVANCED PLUS 5GM", "form": "Tablet"},
    {"name": "MEDERMA ADVANCED SCAR GEL 10GM", "form": "Cream"},
    {"name": "MEDERMA GEL 10GM", "form": "Cream"},
    {"name": "MEDERMA GEL 20GM", "form": "Cream"},
    {"name": "MEDERMA PM ACNE SCAR CREAM 10GM", "form": "Cream"},
    {"name": "MEDERMA PM ACNE SCAR CREAM 30GM", "form": "Cream"},
    {"name": "MEDERMA STRETCH MARK CREAM 25GM", "form": "Cream"},
    {"name": "MEDINEURON CAPS", "form": "Capsule"},
    {"name": "MEDLIP 145MG TAB", "form": "Tablet"},
    {"name": "MEDLIP 160MG TAB", "form": "Tablet"},
    {"name": "MEDROL 4MG", "form": "Tablet"},
    {"name": "MEDROL 8MG TAB", "form": "Tablet"},
    {"name": "MEFTAL 250MG TAB", "form": "Tablet"},
    {"name": "MEFTAL 500MG", "form": "Tablet"},
    {"name": "MEFTAL 500MG TAB", "form": "Tablet"},
    {"name": "MEFTAL FORTE TAB", "form": "Tablet"},
    {"name": "MEFTAL P SYP 60ML", "form": "Syrup"},
    {"name": "MEFTAL P TAB", "form": "Tablet"},
    {"name": "MEFTAL SPAS TAB", "form": "Tablet"},
    {"name": "MEGA HEAL OINT 15G", "form": "Cream"},
    {"name": "MEGACECLO SPAS", "form": "Medicine"},
    {"name": "MEGAGLIPITN TAB", "form": "Tablet"},
    {"name": "MEGAHEAL GEL 50GM", "form": "Cream"},
    {"name": "MEGANERON OD PLUS CAP", "form": "Capsule"},
    {"name": "MEGANEURON NT 75", "form": "Tablet"},
    {"name": "MEGANEURON OD PLUS CAP", "form": "Capsule"},
    {"name": "MEGANEURON OD PLUS CAP: 10 CAP", "form": "Medicine"},
    {"name": "MEGAPEN 500MG TAB", "form": "Tablet"},
    {"name": "MEGAVAX 5G", "form": "Medicine"},
    {"name": "MEGAVAX 5G SOFT GEL", "form": "Cream"},
    {"name": "MEGAVAX 9G", "form": "Soflets"},
    {"name": "MEGAVAX 9G SOFLETS", "form": "Tablet"},
    {"name": "MELACARE OINT 25G 25GM", "form": "Cream"},
    {"name": "MELACARE OINT 25G 30GM", "form": "Cream"},
    {"name": "MELMET 500MG TAB", "form": "Tablet"},
    {"name": "MELMET SR 1GM TAB", "form": "Tablet"},
    {"name": "MELMET SR 500MG TAB", "form": "Tablet"},
    {"name": "MELNOR CREAM", "form": "Medicine"},
    {"name": "MENABOL TAB 20'S", "form": "Tablet"},
    {"name": "MENSOVIT PLUS", "form": "Tablet"},
    {"name": "MENTAT TAB", "form": "Tablet"},
    {"name": "MEPRATE 10MG TAB", "form": "Tablet"},
    {"name": "MERO 500MG INJ", "form": "Injection"},
    {"name": "MEROMAC INJ 1GM", "form": "Injection"},
    {"name": "MESACAL OD TAB", "form": "Tablet"},
    {"name": "MESACOL TAB", "form": "Tablet"},
    {"name": "MET XL 12.5 MG TAB", "form": "Tablet"},
    {"name": "MET XL 25MG TAB", "form": "Tablet"},
    {"name": "MET XL 50MG TAB", "form": "Tablet"},
    {"name": "MET XL AM 25/5MG", "form": "Tablet"},
    {"name": "MET XL AM 50/5MG", "form": "Tablet"},
    {"name": "MET-XL-50MG", "form": "Tablet"},
    {"name": "METAHART XL 50", "form": "Medicine"},
    {"name": "METAHENZ VG2", "form": "Medicine"},
    {"name": "METASENS V 0.3", "form": "Medicine"},
    {"name": "METASENS VG 1MG TAB", "form": "Tablet"},
    {"name": "METASENS VG 2MG TAB", "form": "Tablet"},
    {"name": "METASENS VG1", "form": "Medicine"},
    {"name": "METASPRAY NASAL SPRAY", "form": "Spray"},
    {"name": "METBETA XL-50MG TAB", "form": "Tablet"},
    {"name": "METBETA-XL 12.5MG TAB", "form": "Tablet"},
    {"name": "METBETA-XL 25MG TAB", "form": "Tablet"},
    {"name": "METBETIC GL2", "form": "Medicine"},
    {"name": "METFOR 500 MG", "form": "Medicine"},
    {"name": "METFOR 500MG TAB", "form": "Tablet"},
    {"name": "METHERGIN", "form": "Medicine"},
    {"name": "METHERGIN 10 TAB", "form": "Tablet"},
    {"name": "METHERGIN TAB", "form": "Tablet"},
    {"name": "METHIFOL LC", "form": "Medicine"},
    {"name": "METHYCOBAL INJ 1ML", "form": "Injection"},
    {"name": "METHYCOBAL TAB", "form": "Tablet"},
    {"name": "METOCARD AM TAB", "form": "Tablet"},
    {"name": "METOCARD XL 12.5MG TAB", "form": "Tablet"},
    {"name": "METOCARD XL 25MG TAB", "form": "Tablet"},
    {"name": "METOCARD XL 50MG TAB", "form": "Tablet"},
    {"name": "METOHART XL 50", "form": "Medicine"},
    {"name": "METOHART XL 50 TAB", "form": "Tablet"},
    {"name": "METOHART XL25", "form": "Medicine"},
    {"name": "METOHART XL25 TAB", "form": "Tablet"},
    {"name": "METOHEART XL 25", "form": "Medicine"},
    {"name": "METOHEART XL 50", "form": "Medicine"},
    {"name": "METOLOR 25MG TAB", "form": "Tablet"},
    {"name": "METOLOR 50MG TAB", "form": "Tablet"},
    {"name": "METOLOR XR 25MG TAB", "form": "Tablet"},
    {"name": "METOLOR XR 50MG CAPS", "form": "Capsule"},
    {"name": "METOSARTAN 25MG TAB", "form": "Tablet"},
    {"name": "METOSARTAN 50MG TAB", "form": "Tablet"},
    {"name": "METOZ 2.5", "form": "Medicine"},
    {"name": "METOZ 5MG TAB", "form": "Tablet"},
    {"name": "METPURE XL 25 TAB", "form": "Tablet"},
    {"name": "METPURE XL 50MG TAB", "form": "Tablet"},
    {"name": "METROGYL 200MG", "form": "Tablet"},
    {"name": "METROGYL 400MG", "form": "Tablet"},
    {"name": "METROGYL 600", "form": "Medicine"},
    {"name": "METROGYL DG GEL FORTE 20GM", "form": "Cream"},
    {"name": "METROGYL GEL 2% 30GM", "form": "Cream"},
    {"name": "METROGYL GEL 30GM", "form": "Cream"},
    {"name": "METROGYL M OINT 5GM", "form": "Cream"},
    {"name": "METROGYL-P OINT 15GM", "form": "Cream"},
    {"name": "METSMALL 1GM", "form": "Tablet"},
    {"name": "METSMALL 500MG TAB", "form": "Tablet"},
    {"name": "METSMALL VX 500MG", "form": "Tablet"},
    {"name": "METZOK 12.5MG TAB", "form": "Tablet"},
    {"name": "METZOK 25MG TAB", "form": "Tablet"},
    {"name": "METZOK 50MG TAB", "form": "Tablet"},
    {"name": "MGD3", "form": "Medicine"},
    {"name": "MICOGEL 2% OINT 15GM", "form": "Cream"},
    {"name": "MICROCID CAPS", "form": "Capsule"},
    {"name": "MIKACIN 100MG INJ 1ML", "form": "Injection"},
    {"name": "MIKACIN 250MG INJ", "form": "Injection"},
    {"name": "MIKACIN 500MG INJ", "form": "Injection"},
    {"name": "MINIPRESS XL 2.5MG TAB", "form": "Tablet"},
    {"name": "MINIPRESS XL 5MG TAB", "form": "Tablet"},
    {"name": "MINMIN PB SYP 120ML", "form": "Syrup"},
    {"name": "MINMIN PB TAB", "form": "Tablet"},
    {"name": "MINTOP 5% FORTE FOAM 60ML", "form": "Tablet"},
    {"name": "MINTOP-10%-LOTION 60ML", "form": "Lotion"},
    {"name": "MINTOP-2% LOTION-GLASS 60ML", "form": "Lotion"},
    {"name": "MIRAHYPE 25 TAB", "form": "Tablet"},
    {"name": "MIRAHYPE S 50/5 TAB", "form": "Tablet"},
    {"name": "MIRAHYPE S TAB", "form": "Tablet"},
    {"name": "MIRBEG S 50MG TAB", "form": "Tablet"},
    {"name": "MIRTAZ 15MG TAB", "form": "Tablet"},
    {"name": "MIRTAZ 30MG TAB", "form": "Tablet"},
    {"name": "MIRTAZ 7.5MG TAB", "form": "Tablet"},
    {"name": "MIXTARD 30 HM PENFIL 3ML", "form": "Tablet"},
    {"name": "MIXTARD 30HM FLEXPEN 3ML", "form": "Injection"},
    {"name": "MIXTARD 50 HM PENFIL 3ML", "form": "Tablet"},
    {"name": "MMF-500TAB", "form": "Tablet"},
    {"name": "MOBIZOX TAB", "form": "Tablet"},
    {"name": "MODLIP 10MG TAB", "form": "Tablet"},
    {"name": "MODLIP AS75MG TAB", "form": "Tablet"},
    {"name": "MOISTUREX CREAM 100GM", "form": "Cream"},
    {"name": "MOISTUREX SYNDET SOAP 60GM", "form": "Soap"},
    {"name": "MOMATE OINT 15GM", "form": "Cream"},
    {"name": "MONDESLOR TAB", "form": "Tablet"},
    {"name": "MONIT GTN 2.6MG TAB", "form": "Tablet"},
    {"name": "MONIT GTN 6.4MG TAB", "form": "Tablet"},
    {"name": "MONOCAN 100MG CAP", "form": "Capsule"},
    {"name": "MONOCAN 200MG CAP", "form": "Capsule"},
    {"name": "MONOCEF INJ 1GM", "form": "Injection"},
    {"name": "MONOTRATE 10MG TAB", "form": "Tablet"},
    {"name": "MONOTRATE 20MG TAB", "form": "Tablet"},
    {"name": "MONOVONO", "form": "Medicine"},
    {"name": "MONOVONO 20MG (10 TAB) TAB", "form": "Tablet"},
    {"name": "MONOVONO 20MG TAB", "form": "Tablet"},
    {"name": "MONTAIR 10MG TAB", "form": "Tablet"},
    {"name": "MONTAIR 5MG TAB", "form": "Tablet"},
    {"name": "MONTAIR FX", "form": "Tablet"},
    {"name": "MONTAIR FX 15", "form": "Medicine"},
    {"name": "MONTAIR FX TAB", "form": "Tablet"},
    {"name": "MONTAIR LC KID", "form": "Tablet"},
    {"name": "MONTAIR LC KID SYP 60ML", "form": "Syrup"},
    {"name": "MONTAIR LC TAB", "form": "Tablet"},
    {"name": "MONTAIR LC TAB 15S", "form": "Tablet"},
    {"name": "MONTAIR-LC", "form": "Tablet"},
    {"name": "MONTECIP FX", "form": "Medicine"},
    {"name": "MONTECIP LC", "form": "Medicine"},
    {"name": "MONTECIP LC JUNIOR SYP", "form": "Syrup"},
    {"name": "MONTECIP LC JUNIOR SYP 60ML", "form": "Syrup"},
    {"name": "MONTECIP LC SYRUP", "form": "Medicine"},
    {"name": "MONTECIP LC TAB", "form": "Tablet"},
    {"name": "MONTEK 10MG TAB", "form": "Tablet"},
    {"name": "MONTEK AB TAB", "form": "Tablet"},
    {"name": "MONTEK BL TABS", "form": "Tablet"},
    {"name": "MONTEK LC KID", "form": "Tablet"},
    {"name": "MONTEK LC TAB", "form": "Tablet"},
    {"name": "MONTENOVA FX", "form": "Medicine"},
    {"name": "MONTENOVA LC", "form": "Medicine"},
    {"name": "MONTICOPE TAB", "form": "Tablet"},
    {"name": "MOOV GEL 50GM", "form": "Cream"},
    {"name": "MOOV OINT 10GM", "form": "Cream"},
    {"name": "MOOV OINT 15GM", "form": "Cream"},
    {"name": "MOOV OINT 30GM", "form": "Cream"},
    {"name": "MOOV OINTMENT 10GM", "form": "Cream"},
    {"name": "MOOV PAIN RELIEF 5GM OINT", "form": "Ointment"},
    {"name": "MOOV PAIN RELIEF SPRAY 15GM", "form": "Spray"},
    {"name": "MOOV SPRAY 50GM", "form": "Spray"},
    {"name": "MOOV SPRAY 80GM", "form": "Spray"},
    {"name": "MOOV SPRY 35GM", "form": "Tablet"},
    {"name": "MOOV SPY 15GM", "form": "Tablet"},
    {"name": "MOREDOT 10 MG", "form": "Medicine"},
    {"name": "MOREDOT 100", "form": "Medicine"},
    {"name": "MOSI D EYE DROPS 5ML", "form": "Drops"},
    {"name": "MOSI E/D 5ML", "form": "Tablet"},
    {"name": "MOUTH ULCER GEL", "form": "Medicine"},
    {"name": "MOVEXX SP TAB", "form": "Tablet"},
    {"name": "MOX 250MG CAP", "form": "Capsule"},
    {"name": "MOX 500MG CAP", "form": "Capsule"},
    {"name": "MOX CV 625MG TAB", "form": "Tablet"},
    {"name": "MOXICIP E/DROPS 5ML", "form": "Drops"},
    {"name": "MOXIFORCE CV 625MG ATB", "form": "Tablet"},
    {"name": "MOXIKIND CV 625 TAB", "form": "Tablet"},
    {"name": "MOXIMAX D", "form": "Medicine"},
    {"name": "MOXIMAX D EYE DROPS 10ML", "form": "Drops"},
    {"name": "MUCAINE GEL MINT 200ML", "form": "Cream"},
    {"name": "MUCAINE GEL MINT SYP 200ML", "form": "Syrup"},
    {"name": "MUCAINE GEL ORANGE 200ML", "form": "Cream"},
    {"name": "MUCINAC 600MG TAB", "form": "Tablet"},
    {"name": "MUCINAC AB TAB", "form": "Tablet"},
    {"name": "MUCINOVA EF 600", "form": "Medicine"},
    {"name": "MUCOEND 600 EF", "form": "Medicine"},
    {"name": "MUCOFORM AB 200", "form": "Medicine"},
    {"name": "MUCOFORM AB 200MG SR TAB", "form": "Tablet"},
    {"name": "MUCOFORM AB FORTE TAB", "form": "Tablet"},
    {"name": "MUCOFORM AB SR TAB", "form": "Tablet"},
    {"name": "MUCOHYPE 600 TAB", "form": "Tablet"},
    {"name": "MUCOLINC EXPECTORANT 100ML", "form": "Tablet"},
    {"name": "MUCOLINC SYP", "form": "Medicine"},
    {"name": "MUCOLINC SYP 100ML", "form": "Syrup"},
    {"name": "MUCOLITE DROPS 15ML", "form": "Drops"},
    {"name": "MUCOLITE SYP 100ML", "form": "Syrup"},
    {"name": "MUCOLITE TAB", "form": "Tablet"},
    {"name": "MULTIRICH", "form": "Medicine"},
    {"name": "MULTIRICH CAP", "form": "Capsule"},
    {"name": "MULTIVATE FM OMEGA CAPS", "form": "Capsule"},
    {"name": "MUPICIP 10GM", "form": "Cream"},
    {"name": "MUPICIP 2% 15 GM OINT", "form": "Medicine"},
    {"name": "MUPICIP 5GM", "form": "Medicine"},
    {"name": "MUPICIP CREAM", "form": "Cream"},
    {"name": "MUPICIP CREAM 5GM", "form": "Cream"},
    {"name": "MUPICIP OINT 5GM", "form": "Cream"},
    {"name": "MUPIMET CREAM 5GM", "form": "Cream"},
    {"name": "MYO BD", "form": "Medicine"},
    {"name": "MYOSPAS 500/250 TAB 10S", "form": "Tablet"},
    {"name": "MYOSPAS TAB", "form": "Tablet"},
    {"name": "MYOSPAZ FORTE", "form": "Tablet"},
    {"name": "MYOSPAZ TAB", "form": "Tablet"},
    {"name": "MYOVIL FORTE", "form": "Medicine"},
    {"name": "MYOVIL FORTE TAB", "form": "Tablet"},
    {"name": "MYOVIL PLUS SACHETS", "form": "Powder"},
    {"name": "N ACETAU", "form": "Medicine"},
    {"name": "NADOXIN CREAM 10GM", "form": "Cream"},
    {"name": "NAFODIL 75", "form": "Medicine"},
    {"name": "NAPROSTRONG 250", "form": "Medicine"},
    {"name": "NAPROSTRONG D 250", "form": "Tablet"},
    {"name": "NAPROSTRONG D 250 TAB", "form": "Tablet"},
    {"name": "NAPROSTRONG D 500", "form": "Tablet"},
    {"name": "NAPROSTRONG D 500 TAB", "form": "Tablet"},
    {"name": "NAPROSYN 250 PLUS", "form": "Tablet"},
    {"name": "NAPROSYN 250 PLUS TAB", "form": "Tablet"},
    {"name": "NAPROSYN 250MG TAB", "form": "Tablet"},
    {"name": "NAPROSYN 500 PLUS", "form": "Tablet"},
    {"name": "NAPROSYN 500 PLUS TAB", "form": "Tablet"},
    {"name": "NAPROSYN 500MG TAB", "form": "Tablet"},
    {"name": "NAPROWEL FORTE TAB", "form": "Tablet"},
    {"name": "NAPROWEL FORTE TABLET", "form": "Tablet"},
    {"name": "NAPROWEL PLUS", "form": "Medicine"},
    {"name": "NASIVION ADULT DROPS 10ML", "form": "Drops"},
    {"name": "NASIVION ADULT SPRAY 10ML", "form": "Spray"},
    {"name": "NASIVION MINI [BABY]DROPS 0.1", "form": "Drops"},
    {"name": "NASIVION PEDIATRIC [CHILD]0.25", "form": "Tablet"},
    {"name": "NASIVION S DROPS", "form": "Drops"},
    {"name": "NASOCLEAR NASAL DROPS 20ML", "form": "Drops"},
    {"name": "NASOMIST NASAL DROPS 20ML", "form": "Drops"},
    {"name": "NATRILIX SR TB", "form": "Tablet"},
    {"name": "NAVRATANA OIL", "form": "Medicine"},
    {"name": "NAZOHYPE NASAL SPRAY", "form": "Spray"},
    {"name": "NAZOHYPE P DROP", "form": "Drops"},
    {"name": "NAZOHYPE S", "form": "Medicine"},
    {"name": "NAZOHYPE S DROP", "form": "Drops"},
    {"name": "NEBASULF POWDER 10GM", "form": "Powder"},
    {"name": "NEBI 2.5MG TAB", "form": "Tablet"},
    {"name": "NEBI 5MG TAB", "form": "Tablet"},
    {"name": "NEBI AM", "form": "Tablet"},
    {"name": "NEBI H TAB", "form": "Tablet"},
    {"name": "NEBIBETA-2.5MG TAB", "form": "Tablet"},
    {"name": "NEBIBETA-5MG TAB", "form": "Tablet"},
    {"name": "NEBICARD 2.5MG", "form": "Tablet"},
    {"name": "NEBICARD 5MG", "form": "Tablet"},
    {"name": "NEBICARD H TAB", "form": "Tablet"},
    {"name": "NEBICARD H TABS", "form": "Tablet"},
    {"name": "NEBICARD SM TAB", "form": "Tablet"},
    {"name": "NEBICARD T TAB", "form": "Tablet"},
    {"name": "NEBILONG 2.5MG TAB", "form": "Tablet"},
    {"name": "NEBILONG AM", "form": "Tablet"},
    {"name": "NEBILONG H", "form": "Tablet"},
    {"name": "NEBILONG TAB", "form": "Tablet"},
    {"name": "NEBISTAR 2.5MG TAB", "form": "Tablet"},
    {"name": "NEBISTAR 5MG TAB", "form": "Tablet"},
    {"name": "NEBISTAR H", "form": "Tablet"},
    {"name": "NEERI TAB", "form": "Tablet"},
    {"name": "NEFROPATH", "form": "Medicine"},
    {"name": "NEFROSAVE FORTE", "form": "Tablet"},
    {"name": "NEFROSAVE FORTE 15 TAB", "form": "Tablet"},
    {"name": "NEFROSAVE FORTE TAB", "form": "Tablet"},
    {"name": "NEFROSAVE TAB", "form": "Tablet"},
    {"name": "NEFROSMOOTH AT", "form": "Medicine"},
    {"name": "NEKO SOAP 75GM", "form": "Soap"},
    {"name": "NEKSIUM 20MG", "form": "Tablet"},
    {"name": "NEKSIUM 40MG TAB", "form": "Tablet"},
    {"name": "NEO MERCAZOLE 10MG TAB", "form": "Tablet"},
    {"name": "NEO MERCAZOLE 5MG TAB", "form": "Tablet"},
    {"name": "NEOGADINE ELIXER 300ML", "form": "Tablet"},
    {"name": "NEOPEPTINE DROPS 15ML", "form": "Drops"},
    {"name": "NEOPEPTINE SYP 100ML", "form": "Syrup"},
    {"name": "NEOSPORIN E/ONIT 10GM", "form": "Tablet"},
    {"name": "NEOSPORIN POWDER 10GM", "form": "Powder"},
    {"name": "NEOSPRIN 30GM OINT", "form": "Cream"},
    {"name": "NEOSPRIN H EAR DROPS 5ML", "form": "Drops"},
    {"name": "NEOSPRIN H OINT 5GM", "form": "Cream"},
    {"name": "NEOTOMIC ENEMA 20ML", "form": "Tablet"},
    {"name": "NERVEUP FORTE CAPS", "form": "Capsule"},
    {"name": "NERVEUP OD CAPS", "form": "Capsule"},
    {"name": "NERVIJEN PLUS CAPS", "form": "Capsule"},
    {"name": "NEUGABA 75MG TAB", "form": "Tablet"},
    {"name": "NEUGABA M 75MG CAPS", "form": "Capsule"},
    {"name": "NEUROBION FORTE", "form": "Medicine"},
    {"name": "NEUROBION FORTE INJ [7X2ML]", "form": "Injection"},
    {"name": "NEUROBION FORTE TAB", "form": "Tablet"},
    {"name": "NEUROBION FORTE TAB / VITAMIN B COMPLEX WITH B12", "form": "Tablet"},
    {"name": "NEUROBION FORTE TABS", "form": "Tablet"},
    {"name": "NEUROBION PLUS TAB", "form": "Tablet"},
    {"name": "NEURORUSH FORTE TAB", "form": "Tablet"},
    {"name": "NEURORUSH LC", "form": "Medicine"},
    {"name": "NEVANAC EYE DROPS 5ML", "form": "Drops"},
    {"name": "NEVIA FRESH POWER", "form": "Medicine"},
    {"name": "NEVIA MEN DEEP IMPACT", "form": "Medicine"},
    {"name": "NEVIA MEN FRESH ACTIVE", "form": "Medicine"},
    {"name": "NEVIA PEARL BEAUTY", "form": "Medicine"},
    {"name": "NEW MODLIP ASG 75MG", "form": "Tablet"},
    {"name": "NEWLARG SACHET", "form": "Medicine"},
    {"name": "NEXITO 10MG TAB", "form": "Tablet"},
    {"name": "NEXITO 20MG  TAB", "form": "Tablet"},
    {"name": "NEXITO 5MG TAB", "form": "Tablet"},
    {"name": "NEXITO FORTE", "form": "Tablet"},
    {"name": "NEXITO LS TAB", "form": "Tablet"},
    {"name": "NEXITO PLUS TAB", "form": "Tablet"},
    {"name": "NEXOM RD CAP", "form": "Medicine"},
    {"name": "NEXPRO 20MG TAB", "form": "Tablet"},
    {"name": "NEXPRO 40MG TAB", "form": "Tablet"},
    {"name": "NEXPRO FAST 20MG", "form": "Tablet"},
    {"name": "NEXPRO FAST 40MG TAB", "form": "Tablet"},
    {"name": "NEXPRO JUNIOR SACHET 1GM", "form": "Powder"},
    {"name": "NEXPRO L TAB", "form": "Tablet"},
    {"name": "NEXPRO-RD 20MG TAB", "form": "Tablet"},
    {"name": "NEXPRO-RD 40MG TAB", "form": "Tablet"},
    {"name": "NICARDIA 20MG RETARD TAB", "form": "Tablet"},
    {"name": "NICARDIA RETARD 20MG TAB", "form": "Tablet"},
    {"name": "NICARDIA RTD 10 MG", "form": "Tablet"},
    {"name": "NICARDIA XL 30MG TAB", "form": "Tablet"},
    {"name": "NICIP 100MG TAB", "form": "Tablet"},
    {"name": "NICOGUM 2M TAB", "form": "Tablet"},
    {"name": "NICOGUM 4MG MINT", "form": "Tablet"},
    {"name": "NICOSTAR 10MG TAB", "form": "Tablet"},
    {"name": "NICOSTAR 5MG TAB", "form": "Tablet"},
    {"name": "NICOTEX 2MG TAB", "form": "Tablet"},
    {"name": "NICOTEX 4MG MINT", "form": "Tablet"},
    {"name": "NIFURTI 100", "form": "Medicine"},
    {"name": "NIKORAN 10MG", "form": "Tablet"},
    {"name": "NIKORAN 5MG", "form": "Tablet"},
    {"name": "NIKORAN OD 10MG TAB", "form": "Tablet"},
    {"name": "NIOCARDIA RTD 20MG", "form": "Tablet"},
    {"name": "NISE GEL 30GM", "form": "Cream"},
    {"name": "NISE TAB", "form": "Tablet"},
    {"name": "NITAXAN 100 SR", "form": "Medicine"},
    {"name": "NITAXAN SR 100 TAB", "form": "Tablet"},
    {"name": "NITRA PASTE 100GM", "form": "Paste"},
    {"name": "NITRA PASTE 50GM", "form": "Paste"},
    {"name": "NITRAVET 10MG TAB", "form": "Tablet"},
    {"name": "NITRAVET 5MG TAB", "form": "Tablet"},
    {"name": "NITREST 10MG TAB", "form": "Tablet"},
    {"name": "NITREST 5MG TAB", "form": "Tablet"},
    {"name": "NITROCONTIN 2.6MG TAB", "form": "Tablet"},
    {"name": "NITROCONTIN 6.4MG TAB", "form": "Tablet"},
    {"name": "NITROLONG 2.6MG TAB", "form": "Tablet"},
    {"name": "NITROSUN 10MG TAB", "form": "Tablet"},
    {"name": "NITROSUN 5 MG TAB", "form": "Tablet"},
    {"name": "NITZOXIDE 500", "form": "Medicine"},
    {"name": "NIVEA", "form": "Medicine"},
    {"name": "NIVEA BODY LOTION COCOA NOURRISH", "form": "Medicine"},
    {"name": "NIVEA BODY MILK LOTION", "form": "Medicine"},
    {"name": "NIVEA PURE IMPACT", "form": "Medicine"},
    {"name": "NIVEA SOFT LIGHT MOIST", "form": "Medicine"},
    {"name": "NIVEA SUN PROTECT MOIST", "form": "Medicine"},
    {"name": "NOCOLD SYP 60ML", "form": "Syrup"},
    {"name": "NOCOLD TAB", "form": "Medicine"},
    {"name": "NODOSIS 500MG TAB", "form": "Tablet"},
    {"name": "NODOSIS DS TAB", "form": "Tablet"},
    {"name": "NODOSIS GST TAB", "form": "Tablet"},
    {"name": "NOOTROPIL 800MG TAB", "form": "Tablet"},
    {"name": "NOOTROPIL SYP 100ML", "form": "Syrup"},
    {"name": "NOR METROGYL PLUS TAB", "form": "Tablet"},
    {"name": "NOR-METROGYL SYP 60ML", "form": "Syrup"},
    {"name": "NORDAY TZ NF", "form": "Medicine"},
    {"name": "NORFLOX 200MG", "form": "Tablet"},
    {"name": "NORFLOX 400MG", "form": "Tablet"},
    {"name": "NORFLOX-TZ", "form": "Tablet"},
    {"name": "NORMOZ TAB", "form": "Tablet"},
    {"name": "NOVACLAV 625", "form": "Medicine"},
    {"name": "NOVACLAV 625 (6S) TAB", "form": "Tablet"},
    {"name": "NOVACLAV 625 TAB", "form": "Tablet"},
    {"name": "NOVAMIX 125G REDUSE 30ML", "form": "Tablet"},
    {"name": "NOVAMOX 250MG REDUSE 30ML", "form": "Tablet"},
    {"name": "NOVAMOX 250MG TAB", "form": "Tablet"},
    {"name": "NOVAMOX 500MG", "form": "Tablet"},
    {"name": "NOVAMOX REDIUSE DROPS 10ML", "form": "Drops"},
    {"name": "NOVASTAT 10MG TAB", "form": "Tablet"},
    {"name": "NOVASTAT 20MG TAB", "form": "Tablet"},
    {"name": "NOVASTAT 5MG TAB", "form": "Tablet"},
    {"name": "NOVASTAT CV 10MG TAB", "form": "Tablet"},
    {"name": "NOVASTAT CV 20MG", "form": "Tablet"},
    {"name": "NOVASTAT GOLD 20MG", "form": "Tablet"},
    {"name": "NOVASTAT GOLD TAB", "form": "Tablet"},
    {"name": "NOVELON TAB", "form": "Tablet"},
    {"name": "NOVOFINE NEEDLE", "form": "Tablet"},
    {"name": "NOVOMIX 30 FLEXPEN", "form": "Injection"},
    {"name": "NOVOMIX 30HM PENFILL 3ML", "form": "Injection"},
    {"name": "NOVOMIX 50 FLEXPEN", "form": "Injection"},
    {"name": "NOVOMIX 50HM PENFIL 3ML", "form": "Tablet"},
    {"name": "NOVOMOX 125MG REDIUSE 30ML", "form": "Tablet"},
    {"name": "NOVORAPID  FLEXPEN 3ML", "form": "Injection"},
    {"name": "NOVORAPID PENFIL 3ML", "form": "Tablet"},
    {"name": "NOVUGEST 10 TAB", "form": "Tablet"},
    {"name": "NOVUGEST M 10", "form": "Medicine"},
    {"name": "NOVUGEST M10 TAB", "form": "Tablet"},
    {"name": "NUCOXIA 60MG TAB", "form": "Tablet"},
    {"name": "NUCOXIA 90MG TAB", "form": "Tablet"},
    {"name": "NUCOXIA P", "form": "Tablet"},
    {"name": "NUCOXIA-MR TAB", "form": "Tablet"},
    {"name": "NUDICLO2X", "form": "Medicine"},
    {"name": "NULONG 10MG", "form": "Tablet"},
    {"name": "NULONG 5MG TAB", "form": "Tablet"},
    {"name": "NUROKIND 500MG TAB", "form": "Tablet"},
    {"name": "NUROKIND G", "form": "Tablet"},
    {"name": "NUROKIND GOLD CAPS", "form": "Capsule"},
    {"name": "NUROKIND GOLD RF CAP", "form": "Capsule"},
    {"name": "NUROKIND LC TAB", "form": "Tablet"},
    {"name": "NUROKIND OD TAB", "form": "Tablet"},
    {"name": "NUROKIND PLUS", "form": "Tablet"},
    {"name": "NUROKIND Z MORE TAB", "form": "Tablet"},
    {"name": "NUTRACIBEL CHOCO", "form": "Medicine"},
    {"name": "NUTRACIBEL ELAICHI", "form": "Medicine"},
    {"name": "NUTREME LITE", "form": "Medicine"},
    {"name": "NUTREME LITE PROTEIN POWDER", "form": "Powder"},
    {"name": "NUTROLIN B PLUS CAP", "form": "Capsule"},
    {"name": "NUTROLIN B SYP 60ML", "form": "Syrup"},
    {"name": "O-BERRY 0.2MG TAB", "form": "Tablet"},
    {"name": "O-BERRY 0.3 TAB", "form": "Tablet"},
    {"name": "O2 TABS", "form": "Tablet"},
    {"name": "OBIMET SR TAB", "form": "Tablet"},
    {"name": "OBIMET-SR 1GM TAB", "form": "Tablet"},
    {"name": "OCANA SOAP 50GM", "form": "Soap"},
    {"name": "OCID 20MG TAB", "form": "Tablet"},
    {"name": "OF 200MG TAB", "form": "Tablet"},
    {"name": "OFLIN 200MG TAB", "form": "Tablet"},
    {"name": "OFLIN 400MG TAB", "form": "Tablet"},
    {"name": "OFLOFINE -M", "form": "Medicine"},
    {"name": "OFLOFINE-M SUSPENSION", "form": "Medicine"},
    {"name": "OFLOX -200MG", "form": "Tablet"},
    {"name": "OFM SYP 60ML", "form": "Syrup"},
    {"name": "OKACET 10MG TAB", "form": "Tablet"},
    {"name": "OKACET COLD TAB", "form": "Tablet"},
    {"name": "OKACET COLD TOTAL TAB", "form": "Tablet"},
    {"name": "OKACET L", "form": "Medicine"},
    {"name": "OKACET L TAB", "form": "Tablet"},
    {"name": "OKAMET 500MG TAB", "form": "Tablet"},
    {"name": "OKAMET GM 501 TAB", "form": "Tablet"},
    {"name": "OKAMET GM 502", "form": "Tablet"},
    {"name": "OKAMET GM 502 TAB", "form": "Tablet"},
    {"name": "OLEANZ 10MG TAB", "form": "Tablet"},
    {"name": "OLEANZ 2.5MG TAB", "form": "Tablet"},
    {"name": "OLEANZ 5MG TAB", "form": "Tablet"},
    {"name": "OLEFINE M SYRP", "form": "Medicine"},
    {"name": "OLEMAR 20 AM TAB", "form": "Tablet"},
    {"name": "OLEMAR 20MG", "form": "Tablet"},
    {"name": "OLEMAR 40AM TAB", "form": "Tablet"},
    {"name": "OLEMAR-40MG TAB", "form": "Tablet"},
    {"name": "OLMAT 20AMH", "form": "Tablet"},
    {"name": "OLMAT 20MG TAB", "form": "Tablet"},
    {"name": "OLMAT 40MG TAB", "form": "Tablet"},
    {"name": "OLMAT AMH 20MG TAB", "form": "Tablet"},
    {"name": "OLMAT H", "form": "Tablet"},
    {"name": "OLMAT H 40MG TAB\\", "form": "Tablet"},
    {"name": "OLMEZEST 10MG TAB", "form": "Tablet"},
    {"name": "OLMEZEST 20 MG", "form": "Tablet"},
    {"name": "OLMEZEST 40MG TABS", "form": "Tablet"},
    {"name": "OLMEZEST AM 40MG", "form": "Tablet"},
    {"name": "OLMEZEST AM TAB", "form": "Tablet"},
    {"name": "OLMEZEST H 20MG TAB", "form": "Tablet"},
    {"name": "OLMEZEST H40 MG", "form": "Tablet"},
    {"name": "OLMIN 20MG TAB", "form": "Tablet"},
    {"name": "OLMIZEST 40MG TAB", "form": "Tablet"},
    {"name": "OLMIZEST AM", "form": "Tablet"},
    {"name": "OMEE 20MG CAP", "form": "Capsule"},
    {"name": "OMEE CAINE GEL 200ML", "form": "Cream"},
    {"name": "OMEECAINE GEL", "form": "Medicine"},
    {"name": "OMEZ 20MG TAB", "form": "Tablet"},
    {"name": "OMEZ DSR CAPS", "form": "Capsule"},
    {"name": "OMEZ INSTA SACHET 9GM", "form": "Powder"},
    {"name": "OMNACORDIL 10MG TAB", "form": "Tablet"},
    {"name": "OMNACORDIL 2.5MG", "form": "Tablet"},
    {"name": "OMNACORDIL DROPS 10ML", "form": "Drops"},
    {"name": "OMNACORTIL 10", "form": "Medicine"},
    {"name": "OMNACORTIL 10MG TAB", "form": "Tablet"},
    {"name": "OMNACORTIL 20", "form": "Medicine"},
    {"name": "OMNACORTIL 20MG", "form": "Tablet"},
    {"name": "OMNACORTIL 40MG TAB", "form": "Tablet"},
    {"name": "OMNACORTIL 5", "form": "Medicine"},
    {"name": "OMNACORTIL 5MG TAB", "form": "Tablet"},
    {"name": "OMNACORTIL 60 ML", "form": "Medicine"},
    {"name": "OMNACORTIL DROPS", "form": "Medicine"},
    {"name": "OMNACORTIL DROPS 10ML", "form": "Drops"},
    {"name": "OMNACORTIL FORTE SUSP 60ML", "form": "Syrup"},
    {"name": "OMNACORTIL FORTE SYP", "form": "Medicine"},
    {"name": "OMNACORTIL SOLUTION 5MG 5MG 60ML", "form": "Solution"},
    {"name": "OMNACORTIL SOLUTION 5MG 60ML", "form": "Solution"},
    {"name": "OMNACORTIL SYP 60ML", "form": "Syrup"},
    {"name": "OMNACORTIL-5MG TAB", "form": "Tablet"},
    {"name": "OMNICLAV 375", "form": "Medicine"},
    {"name": "OMNICLAV 375MG TAB", "form": "Tablet"},
    {"name": "OMNIGEL 50GM", "form": "Gel"},
    {"name": "OMNIGEL 50GM GEL", "form": "Cream"},
    {"name": "OMNIGEL OINTMENT 10GM", "form": "Cream"},
    {"name": "OMNIGEL OINTMENT 30GM", "form": "Cream"},
    {"name": "OMNIGEL OINTMENT 50GM", "form": "Cream"},
    {"name": "OMNIGEL OINTMNT 75GM", "form": "Cream"},
    {"name": "OMNIGEL SPRAY 55GM", "form": "Cream"},
    {"name": "ONDEM SYP 30ML", "form": "Syrup"},
    {"name": "ONDENTRU 2MG SOLUTION", "form": "Medicine"},
    {"name": "ONDERO MET 2.5/500MG TAB", "form": "Tablet"},
    {"name": "ONDERO TAB", "form": "Tablet"},
    {"name": "ONE AL 5MG TAB", "form": "Tablet"},
    {"name": "ONE AL TAB", "form": "Tablet"},
    {"name": "ONE TOUCH SELECT 50'S", "form": "Tablet"},
    {"name": "ONE TOUCH SELECT PLUS 25'S", "form": "Tablet"},
    {"name": "ONE-UP GOLD-D", "form": "Tablet"},
    {"name": "OPTIVE EYE DROPS 10ML", "form": "Drops"},
    {"name": "OPTVA E/DROPS 10ML", "form": "Drops"},
    {"name": "ORACRAFT GEL", "form": "Medicine"},
    {"name": "ORAGUARD INSTA", "form": "Medicine"},
    {"name": "OROFER XT TAB", "form": "Tablet"},
    {"name": "ORS PROLYTE APPLE 200ML", "form": "Tablet"},
    {"name": "ORS PROLYTE ORANGE 200ML", "form": "Tablet"},
    {"name": "ORS REFRESHING ORANGE FLAVOUR 21.8G", "form": "Medicine"},
    {"name": "ORS REFRESHING ORANGE FLAVOUR SACHET", "form": "Powder"},
    {"name": "ORS SACHET", "form": "Medicine"},
    {"name": "ORSL APPLE DRINK 200ML", "form": "Tablet"},
    {"name": "ORSL LEMON DRINK 200ML", "form": "Tablet"},
    {"name": "ORSL ORANGE DRINK 200ML", "form": "Tablet"},
    {"name": "ORSL REHYDRATE APPLE DRINK 200ML", "form": "Tablet"},
    {"name": "ORTHAL FORTE", "form": "Medicine"},
    {"name": "ORTHAL FORTE TAB", "form": "Tablet"},
    {"name": "OSIL CREAM 30GM", "form": "Cream"},
    {"name": "OSIL PLUS TAB", "form": "Tablet"},
    {"name": "OSLID CREAM", "form": "Medicine"},
    {"name": "OSTEOFOS 70MG TAB", "form": "Tablet"},
    {"name": "OSTOVAXL DM", "form": "Medicine"},
    {"name": "OSTOVAXL DM TAB", "form": "Tablet"},
    {"name": "OTOGESIC DROPS 5ML", "form": "Drops"},
    {"name": "OTOREX EAR DROPS 10ML", "form": "Drops"},
    {"name": "OTRIVIN BABY SALINE 10ML", "form": "Tablet"},
    {"name": "OTRIVIN FAST RELIF 10ML", "form": "Tablet"},
    {"name": "OTRIVIN OXY FAST RELIEF ADULT NASAL SPRAY 10ML", "form": "Spray"},
    {"name": "OTRIVIN PEAD DROPS 10ML", "form": "Drops"},
    {"name": "OVABLESS MYO ORANGE TAB", "form": "Tablet"},
    {"name": "OVACHIP SR TAB", "form": "Tablet"},
    {"name": "OVRAL L TAB", "form": "Tablet"},
    {"name": "OXALGIN DP TAB", "form": "Tablet"},
    {"name": "OXALGIN NANO GEL 30GM", "form": "Cream"},
    {"name": "OXETOL 150MG TAB", "form": "Tablet"},
    {"name": "OXETOL 300MG TAB", "form": "Tablet"},
    {"name": "OXETOL 450MG", "form": "Tablet"},
    {"name": "OXETOL 600MG", "form": "Tablet"},
    {"name": "OXIPOD 100MG SYP 30ML", "form": "Syrup"},
    {"name": "OXOLINE SPRAY", "form": "Medicine"},
    {"name": "OXRA 10MG TAB", "form": "Tablet"},
    {"name": "OXRA 5MG TAB", "form": "Tablet"},
    {"name": "OXRA MET 10/500MG TAB", "form": "Tablet"},
    {"name": "OXRA MET 5/1000MG", "form": "Tablet"},
    {"name": "OXRA MET XR 10/1000MG", "form": "Tablet"},
    {"name": "OZEWID NG 5GM", "form": "Tablet"},
    {"name": "OZIVA BIOTIN", "form": "Medicine"},
    {"name": "OZIVA HAIR VITAMINS", "form": "Medicine"},
    {"name": "P OD PLUS TAB", "form": "Tablet"},
    {"name": "P OD TAB", "form": "Tablet"},
    {"name": "PACITANE TAB", "form": "Tablet"},
    {"name": "PAN 20MG TAB", "form": "Tablet"},
    {"name": "PAN 40MG", "form": "Tablet"},
    {"name": "PAN D 15 CAP", "form": "Capsule"},
    {"name": "PAN D CAPS", "form": "Capsule"},
    {"name": "PAN IV INJ", "form": "Injection"},
    {"name": "PAN MPS SYP 200ML", "form": "Syrup"},
    {"name": "PANCRYPT 25K CAP", "form": "Capsule"},
    {"name": "PANDERM PLUS DUSTING POWDER 100GM", "form": "Powder"},
    {"name": "PANDERM POWDER", "form": "Medicine"},
    {"name": "PANKREOFLAT TAB", "form": "Tablet"},
    {"name": "PANLIPASE CAPS", "form": "Capsule"},
    {"name": "PANTAKIND 40MG", "form": "Tablet"},
    {"name": "PANTAKIND 40MG INJ 10ML", "form": "Injection"},
    {"name": "PANTAKIND DSR", "form": "Tablet"},
    {"name": "PANTOCID 20MG TAB", "form": "Tablet"},
    {"name": "PANTOCID 40MG TAB", "form": "Tablet"},
    {"name": "PANTOCID D CAP", "form": "Capsule"},
    {"name": "PANTOCID DSR CAPS", "form": "Capsule"},
    {"name": "PANTOCID IT TAB", "form": "Tablet"},
    {"name": "PANTOCID L TAB", "form": "Tablet"},
    {"name": "PANTODAC 40MG TAB", "form": "Tablet"},
    {"name": "PANTODAC DSR TAB", "form": "Tablet"},
    {"name": "PANTOLUP DSR", "form": "Medicine"},
    {"name": "PANTOP 20MG TAB", "form": "Tablet"},
    {"name": "PANTOP 40MG TAB", "form": "Tablet"},
    {"name": "PANTOP D", "form": "Tablet"},
    {"name": "PANTOP DSR TAB", "form": "Tablet"},
    {"name": "PANTOP IV 40MG", "form": "Tablet"},
    {"name": "PANTOSEC DSR CAP", "form": "Capsule"},
    {"name": "PANTOSEC DSR CAP: 10 CAP", "form": "Medicine"},
    {"name": "PARACIP 250MG SUSP 60ML", "form": "Syrup"},
    {"name": "PARACIP 650MG TAB", "form": "Tablet"},
    {"name": "PARAKIND DS SYP", "form": "Medicine"},
    {"name": "PARAXIN 250MG TAB", "form": "Tablet"},
    {"name": "PARAXIN 500MG CAPS", "form": "Capsule"},
    {"name": "PARKIN TAB", "form": "Tablet"},
    {"name": "PAUSE 500MG TAB", "form": "Tablet"},
    {"name": "PEDICLORYL SYP 30ML", "form": "Syrup"},
    {"name": "PENATLOC DSR", "form": "Medicine"},
    {"name": "PENDITS 200MG", "form": "Tablet"},
    {"name": "PENDITS 800MG TAB", "form": "Tablet"},
    {"name": "PENEGRA 50", "form": "Tablet"},
    {"name": "PENTIDS 400MG TAB", "form": "Tablet"},
    {"name": "PENVAX OXT TAB", "form": "Tablet"},
    {"name": "PEPTIRAN SYP 100ML", "form": "Syrup"},
    {"name": "PERINORM", "form": "Tablet"},
    {"name": "PERINORM AMP 2 ML", "form": "Tablet"},
    {"name": "PERLICE CREAM 120GM", "form": "Cream"},
    {"name": "PETRIL 0.5MG TAB", "form": "Tablet"},
    {"name": "PHARCAL FORTE", "form": "Medicine"},
    {"name": "PHARCAL K27", "form": "Medicine"},
    {"name": "PHENARGAN 25MG TAB 2ML", "form": "Tablet"},
    {"name": "PHENARGAN INJ 2ML", "form": "Injection"},
    {"name": "PHENERGAN SYP 100ML", "form": "Syrup"},
    {"name": "PHENSDYL DX SYRUP", "form": "Medicine"},
    {"name": "PHENSEDYL DX ADVANCED D/SYP 100ML", "form": "Medicine"},
    {"name": "PHENSEDYL DX ADVANCED SYP 100ML", "form": "Syrup"},
    {"name": "PHENSEDYL DX SYP 100ML", "form": "Syrup"},
    {"name": "PHEXIN 125MG REDYMIX 60ML", "form": "Tablet"},
    {"name": "PHEXIN 250MG CAP", "form": "Capsule"},
    {"name": "PHEXIN 250MG REDYMIX SYP 60ML", "form": "Syrup"},
    {"name": "PHEXIN 500MG TAB", "form": "Tablet"},
    {"name": "PHEXIN DRY SYP 30ML", "form": "Syrup"},
    {"name": "PHEXIN KID TAB", "form": "Tablet"},
    {"name": "PILANTS CAPS", "form": "Capsule"},
    {"name": "PILEX FORTE OINT 30GM", "form": "Cream"},
    {"name": "PILEX TAB", "form": "Tablet"},
    {"name": "PILOGO CREAM 20 GM", "form": "Medicine"},
    {"name": "PILOGO CREAM 20GM", "form": "Cream"},
    {"name": "PILOGO PLUS CREAM 30GM", "form": "Cream"},
    {"name": "PIMPLE CURE OINT 20GM", "form": "Cream"},
    {"name": "PINKQUIN FORTE CREAM 15GM", "form": "Cream"},
    {"name": "PINKQUIN OINT 25GM", "form": "Cream"},
    {"name": "PINOM 10MG TAB", "form": "Tablet"},
    {"name": "PINOM 20MG TAB", "form": "Tablet"},
    {"name": "PIOGLIT 15MG TAB", "form": "Tablet"},
    {"name": "PIOGLIT 30MG TAB", "form": "Tablet"},
    {"name": "PIOGLIT 7.5MG TAB", "form": "Tablet"},
    {"name": "PIOGLIT MF 15MG TAB", "form": "Tablet"},
    {"name": "PIORIDE 1 MG", "form": "Medicine"},
    {"name": "PIORIDE 1MG TAB", "form": "Tablet"},
    {"name": "PIORIDE 1MG TABLET 10", "form": "Tablet"},
    {"name": "PIORIDE 2 MG", "form": "Medicine"},
    {"name": "PIOZ 15MG TAB", "form": "Tablet"},
    {"name": "PIOZ 7.5MG TAB", "form": "Tablet"},
    {"name": "PIOZ MF 15MG TAB", "form": "Tablet"},
    {"name": "PIRITON EXP SYP 100ML", "form": "Syrup"},
    {"name": "PIROX DT 10*5*10T TAB", "form": "Tablet"},
    {"name": "PIROX DT TAB", "form": "Tablet"},
    {"name": "PIRTON CS COUGH SYP 100ML", "form": "Syrup"},
    {"name": "PK BREATH EASY POWDER 400GM", "form": "Powder"},
    {"name": "PK BREATHE EASY POWDER 200GM", "form": "Powder"},
    {"name": "PK ORTHOHERB CAPS 30'S", "form": "Capsule"},
    {"name": "PK ORTHOHERB CAPS 60'S", "form": "Capsule"},
    {"name": "PK ORTHOHERB OIL 100ML", "form": "Oil"},
    {"name": "PK PANKAJAKASTHURI [HONEY]SYP 100ML", "form": "Syrup"},
    {"name": "PK PANKAJAKASTURI SYY 200ML", "form": "Tablet"},
    {"name": "PK PANKAJAKASTURI [THULASI]SYP 100ML", "form": "Syrup"},
    {"name": "PLACENTREX CREAM", "form": "Medicine"},
    {"name": "PLACENTREX GEL 20GM", "form": "Cream"},
    {"name": "PLACENTREX INJ 7X2ML", "form": "Injection"},
    {"name": "PLAGRINE 75MG TAB", "form": "Tablet"},
    {"name": "PLAGRINE A75MG TAB", "form": "Tablet"},
    {"name": "PLATERISE TAB", "form": "Tablet"},
    {"name": "PLATONIC SYRUP", "form": "Medicine"},
    {"name": "PLAVIX TAB 14'S", "form": "Tablet"},
    {"name": "PODAWART-PAINT 10ML", "form": "Tablet"},
    {"name": "PODOCIP CV 200MG TAB", "form": "Tablet"},
    {"name": "PODOLGEN 50 SYRP", "form": "Medicine"},
    {"name": "PODOLGEN FORTE SYRUP", "form": "Medicine"},
    {"name": "POLARMINE 2MG", "form": "Tablet"},
    {"name": "POLYBION ACTIVE  SYP 150ML", "form": "Syrup"},
    {"name": "POLYBION ACTIVE SYP 300ML", "form": "Syrup"},
    {"name": "POLYBION INJ 5X2ML", "form": "Injection"},
    {"name": "POLYBION LC MANGO SYP", "form": "Syrup"},
    {"name": "POLYBION LC SYP 150ML", "form": "Syrup"},
    {"name": "POLYBION LC SYP 300ML", "form": "Syrup"},
    {"name": "POLYBION-CZS TAB", "form": "Tablet"},
    {"name": "POVIDOT GARGLE", "form": "Medicine"},
    {"name": "POWERFLAM MR", "form": "Medicine"},
    {"name": "PPG .3MG", "form": "Tablet"},
    {"name": "PPG 0.2MG TAB", "form": "Tablet"},
    {"name": "PPG MET 0.2MG TAB", "form": "Tablet"},
    {"name": "PPG MET 0.3MG TAB", "form": "Tablet"},
    {"name": "PRACTIN 4MG TAB", "form": "Tablet"},
    {"name": "PRAMIPEX 0.125 TAB", "form": "Tablet"},
    {"name": "PRAMIPEX 0.25MG TAB", "form": "Tablet"},
    {"name": "PRAMIPEX 0.5MG", "form": "Tablet"},
    {"name": "PRAXIN 250MG CAP", "form": "Capsule"},
    {"name": "PRAZOPRESS XL 2.5MG", "form": "Tablet"},
    {"name": "PRAZOPRESS XL 5MG TAB", "form": "Tablet"},
    {"name": "PRE-GABAPREX", "form": "Medicine"},
    {"name": "PREDMET 16MG", "form": "Tablet"},
    {"name": "PREDMET 4 MG TAB", "form": "Tablet"},
    {"name": "PREDMET 8MG TAB", "form": "Tablet"},
    {"name": "PREGAB 75MG TAB", "form": "Tablet"},
    {"name": "PREGAB M OD 75MG TAB", "form": "Tablet"},
    {"name": "PREGAB M75 TAB", "form": "Tablet"},
    {"name": "PREGABA 75MG", "form": "Tablet"},
    {"name": "PREGABA-M75MG", "form": "Tablet"},
    {"name": "PREGABANYL NT", "form": "Medicine"},
    {"name": "PREGACIP M 10 CAP", "form": "Capsule"},
    {"name": "PREGACIP M CAP", "form": "Capsule"},
    {"name": "PREGALIN 75MG TAB", "form": "Tablet"},
    {"name": "PREGALIN M75MG", "form": "Tablet"},
    {"name": "PREGALIN SR 75MG TAB", "form": "Tablet"},
    {"name": "PREGALIN X SR 75MG", "form": "Tablet"},
    {"name": "PREGATOR CAPS", "form": "Capsule"},
    {"name": "PREGHYPE NT TAB", "form": "Tablet"},
    {"name": "PREGNERV NT", "form": "Medicine"},
    {"name": "PREGNOVA NT", "form": "Medicine"},
    {"name": "PREGVOM", "form": "Medicine"},
    {"name": "PREGVOM PLUS", "form": "Medicine"},
    {"name": "PRIKLY HEAT POWDER 150GM", "form": "Powder"},
    {"name": "PRIMEPILL 35", "form": "Medicine"},
    {"name": "PRIMEPILL ULTRA", "form": "Medicine"},
    {"name": "PRIMEPILL ULTRA TAB", "form": "Tablet"},
    {"name": "PRIMOLUT -N", "form": "Tablet"},
    {"name": "PRIMOSA 1000 CAPS", "form": "Capsule"},
    {"name": "PRIMOSA 500 CAPS", "form": "Capsule"},
    {"name": "PRIUX MNT", "form": "Tablet"},
    {"name": "PRIUX MNT TAB", "form": "Tablet"},
    {"name": "PRIUX NT", "form": "Medicine"},
    {"name": "PRIUX NT TAB", "form": "Tablet"},
    {"name": "PRO PL CARDAMOM FLAVER 200GM", "form": "Tablet"},
    {"name": "PRO PL CHOCLATE 200GM", "form": "Tablet"},
    {"name": "PRO PL VENNILA 200GM", "form": "Tablet"},
    {"name": "PRODEP 10MG TAB", "form": "Tablet"},
    {"name": "PRODEP 20MG CAPS", "form": "Capsule"},
    {"name": "PROGABA GEL 30GM", "form": "Cream"},
    {"name": "PROGYNOVA 2MG 28'S", "form": "Tablet"},
    {"name": "PROHANCE D VANNILA 200GM", "form": "Tablet"},
    {"name": "PROHANCE D VANNILA 400GM", "form": "Tablet"},
    {"name": "PROHANCE JUNIOR CHOCOLATE 400GM", "form": "Tablet"},
    {"name": "PROHANCE MOM 200GM", "form": "Tablet"},
    {"name": "PROLOMET AM 25MG TAB", "form": "Tablet"},
    {"name": "PROLOMET AM 50MG TAB", "form": "Tablet"},
    {"name": "PROLOMET R 25MG TAB", "form": "Tablet"},
    {"name": "PROLOMET R50MG TAB", "form": "Tablet"},
    {"name": "PROLOMET T 25MG", "form": "Tablet"},
    {"name": "PROLOMET T 50MG TAB", "form": "Tablet"},
    {"name": "PROLOMET XL 100MG TAB", "form": "Tablet"},
    {"name": "PROLOMET XL 12.5MG", "form": "Tablet"},
    {"name": "PROLOMET XL 25MG TAB", "form": "Tablet"},
    {"name": "PROLOMET XL 50MG TAB", "form": "Tablet"},
    {"name": "PROLYTE APPLE 200ML", "form": "Tablet"},
    {"name": "PROLYTE ORANGE 200ML", "form": "Tablet"},
    {"name": "PROSTAGARD D 8MG CAP", "form": "Capsule"},
    {"name": "PROTHIADEN 25MG TAB", "form": "Tablet"},
    {"name": "PROTHIADEN 50MG TAB", "form": "Tablet"},
    {"name": "PROTHIADIN 75 MG TAB", "form": "Tablet"},
    {"name": "PROTINEX CHOCLATE 400GM", "form": "Tablet"},
    {"name": "PROTINEX CHOCOLATE 250GM", "form": "Tablet"},
    {"name": "PROTINEX DIABETES CARE 250GM", "form": "Tablet"},
    {"name": "PROTINEX ORIGINAL 250GM", "form": "Tablet"},
    {"name": "PROTINEX ORIGINAL 400GM", "form": "Tablet"},
    {"name": "PROTINEX VENNILA 250GM", "form": "Tablet"},
    {"name": "PROTINEX VENNILA 400GM", "form": "Tablet"},
    {"name": "PROTIVAX DHA CHOCO", "form": "Powder"},
    {"name": "PROTIVAX DHA CHOCO POWDER", "form": "Powder"},
    {"name": "PROTIVAX MOM", "form": "Powder"},
    {"name": "PROTIVAX MOM POWDER", "form": "Powder"},
    {"name": "PROXYVAN PLUS CAPS", "form": "Capsule"},
    {"name": "PROZEF CAP", "form": "Medicine"},
    {"name": "PRUVICT 1 MG", "form": "Medicine"},
    {"name": "PUDINA COM CAP", "form": "Capsule"},
    {"name": "PULMOCLEAR 15 TAB", "form": "Tablet"},
    {"name": "PULMOCLEAR SYP 100ML", "form": "Syrup"},
    {"name": "PULMOCLEAR TAB", "form": "Tablet"},
    {"name": "PYRIDIUM 200", "form": "Medicine"},
    {"name": "PYRIDIUM 200MG TAB", "form": "Tablet"},
    {"name": "PYRIGESIC 500MG TAB", "form": "Tablet"},
    {"name": "Q MAX 200", "form": "Medicine"},
    {"name": "QUADRIDERM RF 10GM", "form": "Tablet"},
    {"name": "QUADRIDERM RF 5GM", "form": "Tablet"},
    {"name": "QURE 500MG TAB", "form": "Tablet"},
    {"name": "QUTIPIN 100MG TAB", "form": "Tablet"},
    {"name": "QUTIPIN 200MG TAB", "form": "Tablet"},
    {"name": "QUTIPIN 25MG TAB", "form": "Tablet"},
    {"name": "QUTIPIN 50MG TAB", "form": "Tablet"},
    {"name": "R-LOC 150MG TAB", "form": "Tablet"},
    {"name": "R-LOC INJ 7X2ML", "form": "Injection"},
    {"name": "R.B TONE SYP 200ML", "form": "Syrup"},
    {"name": "R.S PATHY MARUNTHU HERBO 20ML", "form": "Tablet"},
    {"name": "R.S.PATHY MARUNTHU HERBO 5ML", "form": "Tablet"},
    {"name": "RABALKEM DSR 10S", "form": "Medicine"},
    {"name": "RABALKEM DSR CAP", "form": "Capsule"},
    {"name": "RABALKEM IT CAP", "form": "Capsule"},
    {"name": "RABALKEM IT TAB", "form": "Tablet"},
    {"name": "RABALKEM LS CAP", "form": "Capsule"},
    {"name": "RABEFINE DSR", "form": "Medicine"},
    {"name": "RABEKIND 20MG TAB", "form": "Tablet"},
    {"name": "RABEKIND DSR CAPS", "form": "Capsule"},
    {"name": "RABELKEM DSR", "form": "Medicine"},
    {"name": "RABELKEM IT", "form": "Medicine"},
    {"name": "RABESEC DSR", "form": "Medicine"},
    {"name": "RABESEC DSR CAP", "form": "Capsule"},
    {"name": "RABESEC DSR CAP: 10 CAP", "form": "Medicine"},
    {"name": "RABESEC LS", "form": "Medicine"},
    {"name": "RABESEC LS 75/20 10 CAP", "form": "Capsule"},
    {"name": "RABESEC LS CAP", "form": "Capsule"},
    {"name": "RABESEC-D SR", "form": "Medicine"},
    {"name": "RABITOP D SR CAP", "form": "Capsule"},
    {"name": "RABITOP LS CAP", "form": "Capsule"},
    {"name": "RABIWOK DSR", "form": "Medicine"},
    {"name": "RABLET 20MG TAB", "form": "Tablet"},
    {"name": "RABLET D CAPS", "form": "Capsule"},
    {"name": "RACIPER 40MG", "form": "Tablet"},
    {"name": "RACIPER 40MG TAB", "form": "Tablet"},
    {"name": "RACIPER D40", "form": "Tablet"},
    {"name": "RAFLE 200", "form": "Medicine"},
    {"name": "RAFLE 200MG TAB", "form": "Tablet"},
    {"name": "RAFLE 400", "form": "Medicine"},
    {"name": "RAFLE 400MG TAB", "form": "Tablet"},
    {"name": "RAFLE 550", "form": "Medicine"},
    {"name": "RAFLE 550MG TAB", "form": "Tablet"},
    {"name": "RAMCOR 1.25MG TAB", "form": "Tablet"},
    {"name": "RAMCOR 2.5MG TAB", "form": "Tablet"},
    {"name": "RAMCOR 5MG TAB", "form": "Tablet"},
    {"name": "RAMIPRESS 2.5MG TAB", "form": "Tablet"},
    {"name": "RAMIPRESS 5MG TAB", "form": "Tablet"},
    {"name": "RAMIRACE 2.5MG TAB", "form": "Tablet"},
    {"name": "RAMIRACE 5MG TAB", "form": "Tablet"},
    {"name": "RAMISTAR 1.25MG TAB", "form": "Tablet"},
    {"name": "RAMISTAR 2.5MG TAB", "form": "Tablet"},
    {"name": "RAMISTAR-5-MG", "form": "Tablet"},
    {"name": "RAMITORVA CAPS", "form": "Capsule"},
    {"name": "RANIPRIDE SYP", "form": "Medicine"},
    {"name": "RANIPRIDE SYRP", "form": "Medicine"},
    {"name": "RANITIN 150 MG TAB", "form": "Tablet"},
    {"name": "RANITIN 300MG TAB", "form": "Tablet"},
    {"name": "RANITIN INJ 5X2ML", "form": "Injection"},
    {"name": "RANOLAZ 500MG TAB", "form": "Tablet"},
    {"name": "RANOZEX TAB", "form": "Tablet"},
    {"name": "RANRAFT SUSP 150ML", "form": "Syrup"},
    {"name": "RANTAC 150MG", "form": "Tablet"},
    {"name": "RANTAC 150MG TAB", "form": "Tablet"},
    {"name": "RANTAC 300MG TAB", "form": "Tablet"},
    {"name": "RANTAC DOM TAB", "form": "Tablet"},
    {"name": "RANTAC MPS SYP 170ML", "form": "Syrup"},
    {"name": "RANTAC OD 300", "form": "Tablet"},
    {"name": "RANTAC SYP 100ML", "form": "Syrup"},
    {"name": "RANTOP 150", "form": "Medicine"},
    {"name": "RANTOP 150MG TAB", "form": "Tablet"},
    {"name": "RAPID GEL", "form": "Medicine"},
    {"name": "RAPID GEL 30GM", "form": "Cream"},
    {"name": "RAPITUS PLUS SYP 100ML", "form": "Syrup"},
    {"name": "RAPITUS SYP 100ML", "form": "Syrup"},
    {"name": "RAPITUS XT SYP 100ML", "form": "Syrup"},
    {"name": "RARICAP TAB", "form": "Tablet"},
    {"name": "RAZEL 10MG TAB", "form": "Tablet"},
    {"name": "RAZEL 20MG TAB", "form": "Tablet"},
    {"name": "RAZO 20MG TAB", "form": "Tablet"},
    {"name": "RAZO D CAPS", "form": "Capsule"},
    {"name": "RAZO L TAB", "form": "Tablet"},
    {"name": "RBP TAB", "form": "Tablet"},
    {"name": "REACTIN SR 100", "form": "Medicine"},
    {"name": "REACTIN SR 100MG TAB", "form": "Tablet"},
    {"name": "RECEBOSE 0.2MG", "form": "Tablet"},
    {"name": "RECEBOSE 0.3MG", "form": "Tablet"},
    {"name": "RECEMIN SR 500MG", "form": "Tablet"},
    {"name": "RECLER MPS PLUS", "form": "Medicine"},
    {"name": "RECLIDE 40MG TAB", "form": "Tablet"},
    {"name": "RECLIDE 60MR TAB", "form": "Tablet"},
    {"name": "RECLIDE 80MG TAB", "form": "Tablet"},
    {"name": "RECLIDE MR 30MG", "form": "Tablet"},
    {"name": "RECLIDE MR 60MG TAB", "form": "Tablet"},
    {"name": "RECLIDE XR 60MG", "form": "Tablet"},
    {"name": "RECLIMET TAB", "form": "Tablet"},
    {"name": "RECLIMET XR 60MG TAB", "form": "Tablet"},
    {"name": "REDMET 4MG TAB", "form": "Tablet"},
    {"name": "REESHAPE 120MG TAB", "form": "Tablet"},
    {"name": "REFRESH LIQ 10ML", "form": "Tablet"},
    {"name": "REFRESH TEARS 10ML", "form": "Tablet"},
    {"name": "REGESTONE CR TAB", "form": "Tablet"},
    {"name": "REGESTRONE TAB", "form": "Tablet"},
    {"name": "REGITOR -TG", "form": "Tablet"},
    {"name": "REGITOR 10MG", "form": "Tablet"},
    {"name": "REGITOR-C", "form": "Tablet"},
    {"name": "REJOINT NEW TAB", "form": "Tablet"},
    {"name": "REJUCALCIUM TAB", "form": "Tablet"},
    {"name": "REJUNATE L", "form": "Medicine"},
    {"name": "REJUNATE-L TAB", "form": "Medicine"},
    {"name": "REKOOL 20MG TAB", "form": "Tablet"},
    {"name": "REKOOL D CAPS", "form": "Capsule"},
    {"name": "RELENT PLUS SYP 60ML", "form": "Syrup"},
    {"name": "RELENT TAB", "form": "Tablet"},
    {"name": "RELIKAST FX", "form": "Medicine"},
    {"name": "REMO M TAB", "form": "Tablet"},
    {"name": "REMO MV 500MG TAB", "form": "Tablet"},
    {"name": "REMO TAB", "form": "Tablet"},
    {"name": "REMO V", "form": "Tablet"},
    {"name": "REMYLIN D TAB", "form": "Tablet"},
    {"name": "RENERVE BT CAPS", "form": "Capsule"},
    {"name": "RENERVE CAPS", "form": "Capsule"},
    {"name": "RENERVE G 100MG TAB", "form": "Tablet"},
    {"name": "RENERVE G 300MG CAPS", "form": "Capsule"},
    {"name": "RENERVE PLUS BT", "form": "Tablet"},
    {"name": "RENERVE PLUS CAPS", "form": "Capsule"},
    {"name": "RENERVE PLUS INJ 2ML", "form": "Injection"},
    {"name": "RENORF", "form": "Medicine"},
    {"name": "RENU SOLUTION 120ML", "form": "Solution"},
    {"name": "RENU SOLUTION 335ML", "form": "Solution"},
    {"name": "RENU SOLUTION 500ML", "form": "Solution"},
    {"name": "REPACE 25MG TAB", "form": "Tablet"},
    {"name": "REPACE 50MG TAB", "form": "Tablet"},
    {"name": "REPACE H", "form": "Tablet"},
    {"name": "RESTECLIN 250MG TAB", "form": "Tablet"},
    {"name": "RESTECLIN 500MG TAB", "form": "Tablet"},
    {"name": "RESTYL 0.25MG TAB", "form": "Tablet"},
    {"name": "RESTYL 0.5MG TAB", "form": "Tablet"},
    {"name": "RESTYL 1MG TAB", "form": "Tablet"},
    {"name": "RESWAS LS SYS 100ML", "form": "Tablet"},
    {"name": "RESWAS SYP 120ML", "form": "Syrup"},
    {"name": "REVELOL AM 25/2.5MG", "form": "Tablet"},
    {"name": "REVELOL AM 25/5MG TAB", "form": "Tablet"},
    {"name": "REVELOL AM 50/5MG TAB", "form": "Tablet"},
    {"name": "REVELOL XL 12.5MG TAB", "form": "Tablet"},
    {"name": "REVELOL XL 25/2.5", "form": "Tablet"},
    {"name": "REVELOL XL 25MG TAB", "form": "Tablet"},
    {"name": "REVELOL XL 50MG TAB", "form": "Tablet"},
    {"name": "REVITAL H 60'S", "form": "Tablet"},
    {"name": "REVITAL H CAP MEN", "form": "Capsule"},
    {"name": "REVITAL H CAP MEN 30S", "form": "Capsule"},
    {"name": "REVITAL H CAPS 10'S", "form": "Capsule"},
    {"name": "REVITAL H CAPS 30'S", "form": "Capsule"},
    {"name": "REVITAL H WOMAN 10S", "form": "Tablet"},
    {"name": "REVITAL H-WOMANS 30'S", "form": "Tablet"},
    {"name": "REVOLIZER", "form": "Tablet"},
    {"name": "REXCOF DX SYP", "form": "Medicine"},
    {"name": "REXIDIN MOUTH WASH 150ML", "form": "Soap"},
    {"name": "REXIDIN MOUTH WASH 60ML", "form": "Soap"},
    {"name": "REXIGUT 550", "form": "Medicine"},
    {"name": "RIBVAX OXT", "form": "Tablet"},
    {"name": "RIBVAX OXT TAB", "form": "Tablet"},
    {"name": "RICONIA G", "form": "Tablet"},
    {"name": "RICONIA LP TAB", "form": "Tablet"},
    {"name": "RICONIA SILVER LP", "form": "Tablet"},
    {"name": "RIFA YES 200", "form": "Medicine"},
    {"name": "RIFAGUT 200MG TAB", "form": "Tablet"},
    {"name": "RIFAGUT 400MG", "form": "Tablet"},
    {"name": "RIFAGUT 550 TAB", "form": "Tablet"},
    {"name": "RIFATREAT 200", "form": "Medicine"},
    {"name": "RIFAXIGYL 60 ML", "form": "Medicine"},
    {"name": "RIFAXIGYL M SUSP SYP 60ML", "form": "Syrup"},
    {"name": "RIFAXIMAX SYRUP", "form": "Medicine"},
    {"name": "RIFCURE 200", "form": "Medicine"},
    {"name": "RIFCURE 400", "form": "Medicine"},
    {"name": "RIFCURE 550", "form": "Medicine"},
    {"name": "RILENT TAB", "form": "Tablet"},
    {"name": "RING GUARD 12GM", "form": "Tablet"},
    {"name": "RING GUARD 20GM", "form": "Tablet"},
    {"name": "RING GUARD CREAM 12GM", "form": "Cream"},
    {"name": "RING OUT POWDER", "form": "Medicine"},
    {"name": "RINIFOL DRY SYP 60ML", "form": "Syrup"},
    {"name": "RINILACT CAP", "form": "Capsule"},
    {"name": "RINILACT DRY SYP", "form": "Syrup"},
    {"name": "RIOMET OD 1000MG TAB", "form": "Tablet"},
    {"name": "RIOMET OD 500MG TAB", "form": "Tablet"},
    {"name": "RIVOTRIL 0.5MG TAB", "form": "Tablet"},
    {"name": "RIVOTRIL0.25MG TAB", "form": "Tablet"},
    {"name": "ROCALTROL 0.25MG", "form": "Tablet"},
    {"name": "ROKO", "form": "Medicine"},
    {"name": "ROKO CAP", "form": "Capsule"},
    {"name": "ROLITEN 2MG TAB", "form": "Medicine"},
    {"name": "ROLITEN OD 2MG CAP", "form": "Capsule"},
    {"name": "ROPARK 0.25MG TAB", "form": "Tablet"},
    {"name": "ROPARK 0.5MG TAB", "form": "Tablet"},
    {"name": "ROPARK 1MG TAB", "form": "Tablet"},
    {"name": "ROSAVE EZ 10", "form": "Tablet"},
    {"name": "ROSAVE EZ 10 TAB", "form": "Tablet"},
    {"name": "ROSAVE EZ 20", "form": "Medicine"},
    {"name": "ROSAVE EZ 20MG TAB", "form": "Tablet"},
    {"name": "ROSEDAY 10MG TAB", "form": "Tablet"},
    {"name": "ROSEDAY 20MG TAB", "form": "Tablet"},
    {"name": "ROSEDAY 5", "form": "Tablet"},
    {"name": "ROSEDAY A 10MG TABS", "form": "Tablet"},
    {"name": "ROSEDAY A 20MG TAB", "form": "Tablet"},
    {"name": "ROSEDAY F 10MG TAB", "form": "Tablet"},
    {"name": "ROSEDAY F 5MG TAB", "form": "Tablet"},
    {"name": "ROSEDAY GOLD 10MG CAPS", "form": "Capsule"},
    {"name": "ROSEDAY GOLD 20MG CAPS", "form": "Capsule"},
    {"name": "ROSTA 10MG TAB", "form": "Tablet"},
    {"name": "ROSTA 20MG", "form": "Tablet"},
    {"name": "ROSTA 5MG TAB", "form": "Tablet"},
    {"name": "ROSTA F TAB", "form": "Tablet"},
    {"name": "ROSUBEST 10", "form": "Medicine"},
    {"name": "ROSUBEST 20 MG", "form": "Medicine"},
    {"name": "ROSUBEST F", "form": "Medicine"},
    {"name": "ROSUFIT 10MG", "form": "Tablet"},
    {"name": "ROSUFIT CV 10MG TAB", "form": "Tablet"},
    {"name": "ROSUFIT CV 20", "form": "Tablet"},
    {"name": "ROSULIP 10MG", "form": "Tablet"},
    {"name": "ROSULIP 5MG TAB", "form": "Tablet"},
    {"name": "ROSULIP F10MG TAB", "form": "Tablet"},
    {"name": "ROSUREN GOLD", "form": "Medicine"},
    {"name": "ROSUVAGOLD 10MG TAB", "form": "Tablet"},
    {"name": "ROSUVAGOLD 20MG TAB", "form": "Tablet"},
    {"name": "ROSUVAS 10MG TAB", "form": "Tablet"},
    {"name": "ROSUVAS 20MG TAB", "form": "Tablet"},
    {"name": "ROSUVAS 40MG TAB", "form": "Tablet"},
    {"name": "ROSUVAS 5MG TAB", "form": "Tablet"},
    {"name": "ROSUVAS CV 10MG", "form": "Tablet"},
    {"name": "ROSUVAS CV 20MG", "form": "Tablet"},
    {"name": "ROSUVAS F 10MG", "form": "Tablet"},
    {"name": "ROSUVAS F-20MG TAB", "form": "Tablet"},
    {"name": "ROTAHALER", "form": "Tablet"},
    {"name": "ROXID 150MG", "form": "Tablet"},
    {"name": "ROZAGOLD 10MG TAB", "form": "Tablet"},
    {"name": "ROZAGOLD 20MG TAB", "form": "Tablet"},
    {"name": "ROZALET 10MG TAB", "form": "Tablet"},
    {"name": "ROZALET 20MG TAB", "form": "Tablet"},
    {"name": "ROZAT 10MG TAB", "form": "Tablet"},
    {"name": "ROZAT 20MG TAB", "form": "Tablet"},
    {"name": "ROZAT 5MG TAB", "form": "Tablet"},
    {"name": "ROZAVEL 10MG TAB", "form": "Tablet"},
    {"name": "ROZAVEL 20MG TAB", "form": "Tablet"},
    {"name": "ROZAVEL 40MG TAB", "form": "Tablet"},
    {"name": "ROZAVEL 5MG TAB", "form": "Tablet"},
    {"name": "ROZAVEL A TAB", "form": "Tablet"},
    {"name": "ROZAVEL EZ TABS", "form": "Tablet"},
    {"name": "ROZAVEL F 10MG TAB", "form": "Tablet"},
    {"name": "ROZAVEL F5MG TAB", "form": "Tablet"},
    {"name": "ROZUCAR 10MG TAB", "form": "Tablet"},
    {"name": "ROZUCAR 20MG TAB", "form": "Tablet"},
    {"name": "ROZUCOR 5MG TAB", "form": "Tablet"},
    {"name": "ROZUCOR ASP 10MG", "form": "Tablet"},
    {"name": "ROZUCOR F 10MG TAB", "form": "Tablet"},
    {"name": "ROZUTIN 5MG TAB", "form": "Tablet"},
    {"name": "RUDIMIN", "form": "Tablet"},
    {"name": "RUFLET TAB", "form": "Medicine"},
    {"name": "RUMALAYA GEL 30GM", "form": "Cream"},
    {"name": "RUMEX FORTE OIL 50ML", "form": "Oil"},
    {"name": "RYZODEG FLEX TOUCH", "form": "Tablet"},
    {"name": "RYZODEG PENFIL 3ML", "form": "Tablet"},
    {"name": "RZOLE DSR", "form": "Medicine"},
    {"name": "SAAZ DS", "form": "Tablet"},
    {"name": "SAAZ TAB", "form": "Tablet"},
    {"name": "SACMIGUT SACHET", "form": "Medicine"},
    {"name": "SACMIGUT SACHET 1GM", "form": "Powder"},
    {"name": "SACURISE 100MG TAB", "form": "Tablet"},
    {"name": "SACURISE 50MG TAB", "form": "Tablet"},
    {"name": "SAFI 100ML", "form": "Tablet"},
    {"name": "SAFI 200ML", "form": "Tablet"},
    {"name": "SAFI 500ML", "form": "Tablet"},
    {"name": "SAIBOL OINTMENT 15GM", "form": "Cream"},
    {"name": "SALACTIN PAINT 10ML", "form": "Solution"},
    {"name": "SALISIA KT SHAMPOO 75ML", "form": "Shampoo"},
    {"name": "SAM 200", "form": "Medicine"},
    {"name": "SAM 400", "form": "Medicine"},
    {"name": "SAM 400 TAB", "form": "Tablet"},
    {"name": "SAMFOS", "form": "Medicine"},
    {"name": "SAMFOS SAMARTH TAB", "form": "Tablet"},
    {"name": "SARIDON (NEW) FOR FAST HEADACHE RELIEF 10 TAB   TAB", "form": "Tablet"},
    {"name": "SARIDON TAB", "form": "Tablet"},
    {"name": "SARTEL 20MG", "form": "Tablet"},
    {"name": "SARTEL 40MG TAB", "form": "Tablet"},
    {"name": "SARTEL AM", "form": "Tablet"},
    {"name": "SARTEL H", "form": "Tablet"},
    {"name": "SARTEL LN 40MG", "form": "Tablet"},
    {"name": "SASLIC 1 % FOAM WASH 1S", "form": "Facewash"},
    {"name": "SASLIC 1% FOAM WASH", "form": "Soap"},
    {"name": "SAZO 1000MG TAB", "form": "Tablet"},
    {"name": "SAZO 500MG TAB", "form": "Tablet"},
    {"name": "SCABOMA LOTION 100 MG", "form": "Lotion"},
    {"name": "SCABOMA LOTION 50ML", "form": "Lotion"},
    {"name": "SCALPE LOTION 60ML", "form": "Lotion"},
    {"name": "SCALPE PRO SHAMPOO 100ML", "form": "Shampoo"},
    {"name": "SEACOD CAP", "form": "Capsule"},
    {"name": "SEACURE 200", "form": "Medicine"},
    {"name": "SEBAMED BABY BAR 100GM", "form": "Tablet"},
    {"name": "SEBAMED CLEAR FACE CLEANING FOAM 50ML", "form": "Tablet"},
    {"name": "SEBAMED CLEAR FACE CLEANING FOAM 50ML 50ML", "form": "Facewash"},
    {"name": "SEBOWASH SHAMPOO 125ML", "form": "Shampoo"},
    {"name": "SELENIUM LUNG HEALTH", "form": "Medicine"},
    {"name": "SELOKEN XL 25MG TAB", "form": "Tablet"},
    {"name": "SELOKEN XL50MG TAB", "form": "Tablet"},
    {"name": "SELSUN 120ML SHAMPOO", "form": "Shampoo"},
    {"name": "SELSUN DAILY SHAMPOO 120ML", "form": "Shampoo"},
    {"name": "SELSUN SHAMPOO 60ML", "form": "Shampoo"},
    {"name": "SEMI AMARYL0.5", "form": "Tablet"},
    {"name": "SEMI DAONIL TAB", "form": "Tablet"},
    {"name": "SEMI RECLIMET TAB", "form": "Tablet"},
    {"name": "SENQUEL F 100GM", "form": "Tablet"},
    {"name": "SENQUEL F 50GM PASTE", "form": "Paste"},
    {"name": "SENSODENT-K 120GM", "form": "Tablet"},
    {"name": "SENSODENT-K 50GM PASTE", "form": "Paste"},
    {"name": "SENSODENT-KF 125GM", "form": "Tablet"},
    {"name": "SENSODENT-KF 75GM", "form": "Tablet"},
    {"name": "SENSODYNE X2", "form": "Medicine"},
    {"name": "SENSOFORM PAINT 20ML", "form": "Tablet"},
    {"name": "SENSOFORM-100GM", "form": "Tablet"},
    {"name": "SENSOFORM-50GM", "form": "Tablet"},
    {"name": "SENTOSA SAM 400 TAB", "form": "Tablet"},
    {"name": "SENZIRYL 100ML", "form": "Tablet"},
    {"name": "SEPTILIN SYP 200ML", "form": "Syrup"},
    {"name": "SEPTILIN TABS", "form": "Tablet"},
    {"name": "SEPTRAN DS TAB 10'S", "form": "Tablet"},
    {"name": "SEROFLO 100 INHR", "form": "Tablet"},
    {"name": "SEROFLO 100 ROTOCAPS", "form": "Capsule"},
    {"name": "SEROFLO 125 INHLR", "form": "Inhaler"},
    {"name": "SEROFLO 250 INHALER", "form": "Inhaler"},
    {"name": "SEROFLO 250 INHLR", "form": "Inhaler"},
    {"name": "SEROFLO 250 ROTACAPS", "form": "Capsule"},
    {"name": "SERTA 100 TAB", "form": "Tablet"},
    {"name": "SERTA 25MG", "form": "Tablet"},
    {"name": "SERTA 50MG", "form": "Tablet"},
    {"name": "SESA HAIR OIL 100ML", "form": "Oil"},
    {"name": "SESA HAIR OIL 200ML", "form": "Oil"},
    {"name": "SET WET COOL AVATAR", "form": "Medicine"},
    {"name": "SEVAL TAB", "form": "Tablet"},
    {"name": "SEVENSEAS 100'S", "form": "Tablet"},
    {"name": "SHELCAL 250MG TAB", "form": "Tablet"},
    {"name": "SHELCAL 500MG", "form": "Tablet"},
    {"name": "SHELCAL 500MG TAB", "form": "Tablet"},
    {"name": "SHELCAL CT", "form": "Tablet"},
    {"name": "SHELCAL CT MAX", "form": "Tablet"},
    {"name": "SHELCAL HD", "form": "Tablet"},
    {"name": "SHELCAL HD 12", "form": "Tablet"},
    {"name": "SHELCAL M", "form": "Tablet"},
    {"name": "SHELCAL OS TAB", "form": "Tablet"},
    {"name": "SHELCAL SYP 200ML", "form": "Syrup"},
    {"name": "SHELCAL XT", "form": "Tablet"},
    {"name": "SIGNOFLAM TABS", "form": "Tablet"},
    {"name": "SILDOEASE 8MG", "form": "Medicine"},
    {"name": "SILDOEASE D", "form": "Medicine"},
    {"name": "SILHOLIFE 8", "form": "Medicine"},
    {"name": "SILHOLIFE D", "form": "Medicine"},
    {"name": "SILIOSTRU 8 MG", "form": "Medicine"},
    {"name": "SILIOSTRU D 10CAP", "form": "Medicine"},
    {"name": "SILIOSTRU D CAP", "form": "Capsule"},
    {"name": "SILIOSTRU-D TAB", "form": "Medicine"},
    {"name": "SILODAL 4MG TAB", "form": "Tablet"},
    {"name": "SILODAL 8MG", "form": "Tablet"},
    {"name": "SILODAL D4", "form": "Tablet"},
    {"name": "SILODAL D8", "form": "Tablet"},
    {"name": "SILODOVA 8", "form": "Medicine"},
    {"name": "SILODOVA 8 TAB", "form": "Tablet"},
    {"name": "SILOFAST 4MG", "form": "Tablet"},
    {"name": "SILOFAST 8MG TAB", "form": "Tablet"},
    {"name": "SILOFAST D4 TAB", "form": "Tablet"},
    {"name": "SILOFAST D8 TAB", "form": "Tablet"},
    {"name": "SILVEREX 20GM OINT", "form": "Cream"},
    {"name": "SILVEREX OINT 10GM", "form": "Cream"},
    {"name": "SIM B6 TAB", "form": "Medicine"},
    {"name": "SINAREST AF NEW 15 EACH OF 1 TAB", "form": "Tablet"},
    {"name": "SINAREST AF NEW TAB", "form": "Tablet"},
    {"name": "SINAREST TAB", "form": "Tablet"},
    {"name": "SITACIP 100 TAB", "form": "Tablet"},
    {"name": "SITAGLIP 100", "form": "Medicine"},
    {"name": "SITAGLIP 100 TAB", "form": "Tablet"},
    {"name": "SITAGLIP 50", "form": "Medicine"},
    {"name": "SITAGLIP 50 TAB", "form": "Tablet"},
    {"name": "SITAGLIP D", "form": "Medicine"},
    {"name": "SITAGLIP D 50/5", "form": "Medicine"},
    {"name": "SITAGLIP D TAB", "form": "Tablet"},
    {"name": "SITAGLIP DM", "form": "Medicine"},
    {"name": "SITAGLIP DM 10/100/500 TAB", "form": "Tablet"},
    {"name": "SITAGLIP DM TAB", "form": "Tablet"},
    {"name": "SITAGLIP M", "form": "Tablet"},
    {"name": "SITAGLIP M TAB", "form": "Tablet"},
    {"name": "SITAKRAFT 100", "form": "Medicine"},
    {"name": "SITAKRAFT 100 TAB", "form": "Tablet"},
    {"name": "SITAKRAFT 50", "form": "Medicine"},
    {"name": "SITAKRAFT 50 TAB", "form": "Tablet"},
    {"name": "SITAKRAFT M 500", "form": "Medicine"},
    {"name": "SITAKRAFT M 500 TAB", "form": "Tablet"},
    {"name": "SITANIA UTI SUSPENSION SYP", "form": "Syrup"},
    {"name": "SITARED 100MG TAB", "form": "Tablet"},
    {"name": "SITARED 50MG TAB", "form": "Tablet"},
    {"name": "SITARED M 50/500MG", "form": "Tablet"},
    {"name": "SITARED MD XR 1000MG", "form": "Tablet"},
    {"name": "SITATRI M 50/500", "form": "Medicine"},
    {"name": "SITAYES M 500", "form": "Medicine"},
    {"name": "SIZODON 1MG TAB", "form": "Tablet"},
    {"name": "SIZODON 2MG TAB", "form": "Tablet"},
    {"name": "SIZODON 3MG TAB", "form": "Tablet"},
    {"name": "SIZODON 4MG TAB", "form": "Tablet"},
    {"name": "SIZODON FORTE TAB", "form": "Tablet"},
    {"name": "SIZODON LS TAB", "form": "Tablet"},
    {"name": "SIZODON MD 0.5MG TAB", "form": "Tablet"},
    {"name": "SIZODON PLUS TAB", "form": "Tablet"},
    {"name": "SKIN-C SOAP 75GM", "form": "Soap"},
    {"name": "SKINLITE CREAM 15GM", "form": "Cream"},
    {"name": "SKINLITE CREAM 25GM", "form": "Cream"},
    {"name": "SKINSHINE CREAM", "form": "Medicine"},
    {"name": "SKIWASH", "form": "Medicine"},
    {"name": "SKIWASH SOAP", "form": "Soap"},
    {"name": "SMOOTHE EYE DROP", "form": "Drops"},
    {"name": "SMUTH CREAM 30GM", "form": "Cream"},
    {"name": "SMUTH SYRUP 110ML", "form": "Syrup"},
    {"name": "SMUTH SYRUP 200ML", "form": "Syrup"},
    {"name": "SOAPEX BAR 75GM", "form": "Soap"},
    {"name": "SOBISIS TAB", "form": "Tablet"},
    {"name": "SODATAB 500", "form": "Medicine"},
    {"name": "SODATAB DS", "form": "Medicine"},
    {"name": "SODATAB DS TAB", "form": "Tablet"},
    {"name": "SODIMCAR 500 MG TABLETS", "form": "Tablet"},
    {"name": "SODIMCAR 500MG TAB", "form": "Tablet"},
    {"name": "SOFRAMYCIN CREAM 30GM", "form": "Cream"},
    {"name": "SOFRAMYCIN SKIN CREAM 30GM", "form": "Cream"},
    {"name": "SOFTOLAX POWDER 100GM", "form": "Powder"},
    {"name": "SOFTOVAC POWDER 100GM", "form": "Powder"},
    {"name": "SOFTOVAC-SF POWDER 50GM", "form": "Powder"},
    {"name": "SOLINOL 5 TAB", "form": "Tablet"},
    {"name": "SOLSPRE NASAL SPRAY", "form": "Spray"},
    {"name": "SOLVIN COLD DROPS 15ML", "form": "Drops"},
    {"name": "SOLVIN COLD SYP 60ML", "form": "Syrup"},
    {"name": "SOLVIN COLD TAB", "form": "Tablet"},
    {"name": "SOMPRAZ 20MG TAB", "form": "Tablet"},
    {"name": "SOMPRAZ 40MG TAB", "form": "Tablet"},
    {"name": "SOMPRAZ D 20MG TAB", "form": "Tablet"},
    {"name": "SOMPRAZ D 40MG CAP", "form": "Capsule"},
    {"name": "SOMPRAZ D 40MG TAB", "form": "Tablet"},
    {"name": "SOMPRAZ IT TAB", "form": "Tablet"},
    {"name": "SOMPRAZ L TAB", "form": "Tablet"},
    {"name": "SOPRIDEX REDIMIX 250MG", "form": "Tablet"},
    {"name": "SORBITRATE 10MG TAB", "form": "Tablet"},
    {"name": "SORBITRATE 5MG TAB", "form": "Tablet"},
    {"name": "SOSTIN 10", "form": "Medicine"},
    {"name": "SOSTIN A", "form": "Medicine"},
    {"name": "SOSTIN AC", "form": "Medicine"},
    {"name": "SOSTIN F", "form": "Medicine"},
    {"name": "SPASCADEINE SUSPENSION", "form": "Medicine"},
    {"name": "SPASMO PROXYVON PLUS CAPS", "form": "Capsule"},
    {"name": "SPASMONIL DROPS", "form": "Medicine"},
    {"name": "SPASMONIL DROPS 10ML", "form": "Drops"},
    {"name": "SPASONIX 200", "form": "Medicine"},
    {"name": "SPASONIX TAB", "form": "Tablet"},
    {"name": "SPASONIX TAB 200", "form": "Tablet"},
    {"name": "SPASRELIEF SUSPENSION", "form": "Medicine"},
    {"name": "SPASRELIF DROPS", "form": "Medicine"},
    {"name": "SPASRELIF SYP 60ML", "form": "Syrup"},
    {"name": "SPOO BABY SHAMPOO 125ML", "form": "Shampoo"},
    {"name": "SPORIDEX 500MG TAB", "form": "Tablet"},
    {"name": "SPORIDEX REDIMIX 125MG", "form": "Tablet"},
    {"name": "SPORIDEX REDIMIX DROPS 10ML", "form": "Drops"},
    {"name": "SPORLAC SHA", "form": "Tablet"},
    {"name": "SPORLOC DS TAB", "form": "Tablet"},
    {"name": "STALOPAM 10MG TAB", "form": "Tablet"},
    {"name": "STALOPAM PLUS TAB", "form": "Tablet"},
    {"name": "STAMINA OD TAB", "form": "Tablet"},
    {"name": "STAMLO 2.5MG TAB", "form": "Tablet"},
    {"name": "STAMLO 5MG TAB", "form": "Tablet"},
    {"name": "STAMLO BETA TAB", "form": "Tablet"},
    {"name": "STAMLO D TAB", "form": "Tablet"},
    {"name": "STAMLO T TAB", "form": "Tablet"},
    {"name": "STANLIP 145MG", "form": "Tablet"},
    {"name": "STARPRESS XL 25MG TAB", "form": "Tablet"},
    {"name": "STARPRESS XL 50MG TAB", "form": "Tablet"},
    {"name": "STARVOG 0.2MG TAB", "form": "Tablet"},
    {"name": "STARVOG 0.3MG TAB", "form": "Tablet"},
    {"name": "STARVOG M .2MG TAB", "form": "Tablet"},
    {"name": "STARVOG M .3MG TAB", "form": "Tablet"},
    {"name": "STATOR 10MG TAB", "form": "Tablet"},
    {"name": "STATOR 20MG TAB", "form": "Tablet"},
    {"name": "STATOR 40MG TAB", "form": "Tablet"},
    {"name": "STATOR ASP", "form": "Tablet"},
    {"name": "STATOR CV 10MG", "form": "Tablet"},
    {"name": "STATOR CV 20MG TAB", "form": "Tablet"},
    {"name": "STATOR F TAB", "form": "Tablet"},
    {"name": "STAYCLEAR TUBE", "form": "Medicine"},
    {"name": "STEMETIL AMP 1ML", "form": "Tablet"},
    {"name": "STEMETIL MD TAB", "form": "Tablet"},
    {"name": "STILOZ 100MG TAB", "form": "Tablet"},
    {"name": "STILOZ 50MG TAB", "form": "Tablet"},
    {"name": "STOLIN R 100GM", "form": "Tablet"},
    {"name": "STOLIN R 50GM PASTE", "form": "Paste"},
    {"name": "STORVA GOLD 10MG TAB", "form": "Tablet"},
    {"name": "STORVA GOLD 20MG TAB", "form": "Tablet"},
    {"name": "STORVAS 10MG TAB", "form": "Tablet"},
    {"name": "STORVAS 20MG TAB", "form": "Tablet"},
    {"name": "STORVAS 40MG TAB", "form": "Tablet"},
    {"name": "STORVAS 5MG TAB", "form": "Tablet"},
    {"name": "STORVAS 80MG", "form": "Tablet"},
    {"name": "STORVAS CV 10MG TAB", "form": "Tablet"},
    {"name": "STORVAS CV 20MG", "form": "Tablet"},
    {"name": "STRECHMIN CREAM", "form": "Medicine"},
    {"name": "STRECHMIN CREAM 50GM", "form": "Cream"},
    {"name": "STRESNIL 0.25MG TAB", "form": "Tablet"},
    {"name": "STRESNIL 0.5 MG TAB", "form": "Tablet"},
    {"name": "STROCIT 500MG TAB", "form": "Tablet"},
    {"name": "STROCIT PLUS TAB", "form": "Tablet"},
    {"name": "STRONE 200", "form": "Medicine"},
    {"name": "STUGERON FORTE", "form": "Tablet"},
    {"name": "STUGERON TAB", "form": "Tablet"},
    {"name": "STYPTOVIT E", "form": "Tablet"},
    {"name": "SUCC-C ORANGE", "form": "Medicine"},
    {"name": "SUCRA RECLER O 200", "form": "Medicine"},
    {"name": "SUCRAFIL  GEL 200ML", "form": "Cream"},
    {"name": "SUCRAFIL O GEL 200ML", "form": "Cream"},
    {"name": "SUCRAFIL O SUGAR FREE GEL 200ML", "form": "Cream"},
    {"name": "SUCRAZIDE 60MR", "form": "Medicine"},
    {"name": "SUCRZIDE MV 0.2", "form": "Medicine"},
    {"name": "SUGAR FREE GOLD 100 PELLETS", "form": "Pellet"},
    {"name": "SUGAR FREE GOLD 500'S CAPS", "form": "Capsule"},
    {"name": "SUGAR FREE GOLD CAPS 100'S", "form": "Capsule"},
    {"name": "SUGAR FREE GOLD PELLETS", "form": "Tablet"},
    {"name": "SUGAR FREE GOLD POWDER 100GM", "form": "Powder"},
    {"name": "SUGAR FREE NATURA POWDER 100GM", "form": "Powder"},
    {"name": "SUHAGRA 25", "form": "Medicine"},
    {"name": "SUHAGRA 25MG TAB", "form": "Tablet"},
    {"name": "SULBACEF INJ 1.5GM", "form": "Injection"},
    {"name": "SULOXID O 100 ML", "form": "Medicine"},
    {"name": "SULOXID O 100ML", "form": "Tablet"},
    {"name": "SULPITAC 100MG TAB", "form": "Tablet"},
    {"name": "SULPITAC 200MG TAB", "form": "Tablet"},
    {"name": "SULPITAC 50MG TAB", "form": "Tablet"},
    {"name": "SUMO PLUS SPRAY 35 GM", "form": "Medicine"},
    {"name": "SUMO-TAB", "form": "Tablet"},
    {"name": "SUMOGEL 50GM", "form": "Gel"},
    {"name": "SUMOGEL 50GM GEL", "form": "Cream"},
    {"name": "SUNCROS 50 AQUA SPF 50 LOTION 60ML", "form": "Lotion"},
    {"name": "SUPER ZINC", "form": "Medicine"},
    {"name": "SUPERMET XL 25MG TAB", "form": "Tablet"},
    {"name": "SUPERMET XL 50MG", "form": "Tablet"},
    {"name": "SUPIROBAN OINT", "form": "Medicine"},
    {"name": "SUPRA PLUS TAB", "form": "Tablet"},
    {"name": "SUPRACAL 2000", "form": "Medicine"},
    {"name": "SUPRACAL 2000 TAB", "form": "Tablet"},
    {"name": "SUPRACAL HD", "form": "Tablet"},
    {"name": "SUPRACAL ISO", "form": "Medicine"},
    {"name": "SUPRACAL TAB", "form": "Tablet"},
    {"name": "SUPRACAL TABS", "form": "Tablet"},
    {"name": "SUPRADYN DAILY TAB", "form": "Tablet"},
    {"name": "SUPRADYN DAILY TABLET", "form": "Tablet"},
    {"name": "SUPRADYN IMMUNITY BT 30S", "form": "Tablet"},
    {"name": "SUPRADYN IMMUNITY TAB", "form": "Tablet"},
    {"name": "SUPRADYN TAB", "form": "Tablet"},
    {"name": "SURBEX XT TAB", "form": "Tablet"},
    {"name": "SUREPENAM 200MG TAB", "form": "Tablet"},
    {"name": "SUREPENEM 200", "form": "Medicine"},
    {"name": "SURFAZ SN OINT 7GM", "form": "Cream"},
    {"name": "SUSTEN 100MG TAB", "form": "Tablet"},
    {"name": "SUSTEN 200MG TAB", "form": "Tablet"},
    {"name": "SUSTEN 300MG TAB]", "form": "Tablet"},
    {"name": "SUSTEN 400MG", "form": "Tablet"},
    {"name": "SUSTEN SR 200 CAP", "form": "Capsule"},
    {"name": "SUSTEN SR 300", "form": "Tablet"},
    {"name": "SUSTEN SR 400MG", "form": "Tablet"},
    {"name": "SYMBIOTIK CAPS", "form": "Capsule"},
    {"name": "SYNDOPA 110MG TAB", "form": "Tablet"},
    {"name": "SYNDOPA 275 TAB", "form": "Tablet"},
    {"name": "SYNDOPA CR 125", "form": "Tablet"},
    {"name": "SYNDOPA CR 250 TAB", "form": "Tablet"},
    {"name": "SYNDOPA PLUS", "form": "Tablet"},
    {"name": "SYNDOPA PLUS TAB", "form": "Tablet"},
    {"name": "SYSCON 150", "form": "Tablet"},
    {"name": "T BACT 2% OINTMENT 15GM", "form": "Cream"},
    {"name": "T BACT 2% OINTMENT 15GM OINT", "form": "Ointment"},
    {"name": "T-MINIC DROPS 15ML", "form": "Drops"},
    {"name": "T-MINIC SYP 60ML", "form": "Syrup"},
    {"name": "TAMDURA TAB", "form": "Tablet"},
    {"name": "TARGIT 20MG TAB", "form": "Tablet"},
    {"name": "TARGIT 40MG TAB", "form": "Tablet"},
    {"name": "TARGIT 80MG", "form": "Tablet"},
    {"name": "TARGIT AM 40MG TAB", "form": "Tablet"},
    {"name": "TARGIT H", "form": "Tablet"},
    {"name": "TAXIM 1000MG INJ", "form": "Injection"},
    {"name": "TAXIM 250MG INJ", "form": "Injection"},
    {"name": "TAXIM 500 ING", "form": "Tablet"},
    {"name": "TAXIM O 100MG TAB", "form": "Tablet"},
    {"name": "TAXIM O 200MG TAB", "form": "Tablet"},
    {"name": "TAXIM O 50MG TAB", "form": "Tablet"},
    {"name": "TAXIM O DROPS 10ML", "form": "Drops"},
    {"name": "TAXIM O FORTE DRY SYP 30ML", "form": "Syrup"},
    {"name": "TAXIM O SYR 30ML", "form": "Tablet"},
    {"name": "TAXIM- O FORTE D/SYP 30ML", "form": "Syrup"},
    {"name": "TAYO 60K TAB", "form": "Tablet"},
    {"name": "TAYO TAB", "form": "Tablet"},
    {"name": "TAZLOC 20MG TAB", "form": "Tablet"},
    {"name": "TAZLOC 40MG", "form": "Tablet"},
    {"name": "TAZLOC 80MG", "form": "Tablet"},
    {"name": "TAZLOC AM", "form": "Tablet"},
    {"name": "TAZLOC BETA 25MG TAB", "form": "Tablet"},
    {"name": "TAZLOC BETA 50MG TAB", "form": "Tablet"},
    {"name": "TAZLOC CT 40MG TAB", "form": "Tablet"},
    {"name": "TAZLOC CT 80MG TAB", "form": "Tablet"},
    {"name": "TAZLOC H 40MG", "form": "Tablet"},
    {"name": "TAZLOC TRIO 40MG TAB", "form": "Tablet"},
    {"name": "TBACT 5GM OINT", "form": "Cream"},
    {"name": "TBACT OINT BIG 15GM", "form": "Cream"},
    {"name": "TCU D3 NANO SHOT", "form": "Medicine"},
    {"name": "TEAR EYE DROPS 5ML", "form": "Drops"},
    {"name": "TEARS PLUS DROPS 10ML", "form": "Drops"},
    {"name": "TEDI BAR SOAP 75GM", "form": "Soap"},
    {"name": "TEDIBAR BATHING BAR (75GM)", "form": "Soap"},
    {"name": "TEDIBAR BATHING BAR 75GM", "form": "Soap"},
    {"name": "TEGRETAL 100TAB", "form": "Tablet"},
    {"name": "TEGRETAL 200MG TAB", "form": "Tablet"},
    {"name": "TEGRETAL 400 TABS", "form": "Tablet"},
    {"name": "TEGRETAL CR 200MG TAB", "form": "Tablet"},
    {"name": "TEGRETAL CR 300MG", "form": "Tablet"},
    {"name": "TEGRETAL CR 400MG TAB", "form": "Tablet"},
    {"name": "TELDAY 40MG", "form": "Tablet"},
    {"name": "TELDAY H40MG TAB", "form": "Tablet"},
    {"name": "TELEACT 20MG TAB", "form": "Tablet"},
    {"name": "TELEACT 40MG TAB", "form": "Tablet"},
    {"name": "TELEACT AM", "form": "Tablet"},
    {"name": "TELEACT CT 40MG TAB", "form": "Tablet"},
    {"name": "TELEKAST F TAB", "form": "Tablet"},
    {"name": "TELEKAST-L TAB", "form": "Tablet"},
    {"name": "TELEMAR 40MG", "form": "Tablet"},
    {"name": "TELEMAR H 40", "form": "Tablet"},
    {"name": "TELISTA 20MG TAB", "form": "Tablet"},
    {"name": "TELISTA 40MG TAB", "form": "Tablet"},
    {"name": "TELISTA AM", "form": "Tablet"},
    {"name": "TELISTA CH 40MG TAB", "form": "Tablet"},
    {"name": "TELISTA H40 MG TAB", "form": "Tablet"},
    {"name": "TELKONOL AM TAB", "form": "Tablet"},
    {"name": "TELLZY 40MG TAB", "form": "Tablet"},
    {"name": "TELMA 20 TAB", "form": "Tablet"},
    {"name": "TELMA 20 TAB 30S", "form": "Tablet"},
    {"name": "TELMA 20MG TAB", "form": "Tablet"},
    {"name": "TELMA 40MG TAB", "form": "Tablet"},
    {"name": "TELMA 80MG TAB", "form": "Tablet"},
    {"name": "TELMA AM TAB", "form": "Tablet"},
    {"name": "TELMA CT 40/12.5MG TAB", "form": "Tablet"},
    {"name": "TELMA CT 40/6.25MG TAB", "form": "Tablet"},
    {"name": "TELMA H 80MG TAB", "form": "Tablet"},
    {"name": "TELMA H TAB", "form": "Tablet"},
    {"name": "TELMED 20MG", "form": "Tablet"},
    {"name": "TELMED 40MG", "form": "Tablet"},
    {"name": "TELMIBLESS 40", "form": "Tablet"},
    {"name": "TELMIBLESS 40 TAB", "form": "Tablet"},
    {"name": "TELMIBLESS AM", "form": "Tablet"},
    {"name": "TELMIBLESS AM TAB", "form": "Tablet"},
    {"name": "TELMIBLESS AMH", "form": "Medicine"},
    {"name": "TELMIBLESS AMH 15 TAB", "form": "Tablet"},
    {"name": "TELMIBLESS AMH TAB", "form": "Tablet"},
    {"name": "TELMIBLESS CT", "form": "Medicine"},
    {"name": "TELMIBLESS H", "form": "Medicine"},
    {"name": "TELMIBLESS H TAB", "form": "Tablet"},
    {"name": "TELMIDUCE AM 40MG TAB", "form": "Tablet"},
    {"name": "TELMIDUCE H 40MG TAB", "form": "Tablet"},
    {"name": "TELMIKIND 20", "form": "Medicine"},
    {"name": "TELMIKIND 20MG", "form": "Tablet"},
    {"name": "TELMIKIND 40MG", "form": "Tablet"},
    {"name": "TELMIKIND AM", "form": "Tablet"},
    {"name": "TELMIKIND AMH TAB", "form": "Tablet"},
    {"name": "TELMIKIND BETA 25MG", "form": "Tablet"},
    {"name": "TELMIKIND BETA 50MG", "form": "Tablet"},
    {"name": "TELMIKIND CT 40MG", "form": "Tablet"},
    {"name": "TELMIKIND H 40MG", "form": "Tablet"},
    {"name": "TELMIKIND TRIO 6.25", "form": "Medicine"},
    {"name": "TELMWERES TRIO 40/6.25", "form": "Medicine"},
    {"name": "TELPLUS TAB", "form": "Tablet"},
    {"name": "TELPLUS TRIO", "form": "Tablet"},
    {"name": "TELPRES MT 25MG TAB", "form": "Tablet"},
    {"name": "TELPRES MT50MG TAB", "form": "Tablet"},
    {"name": "TELPRESS 20MG TAB", "form": "Tablet"},
    {"name": "TELPRESS 40MG TAB", "form": "Tablet"},
    {"name": "TELPRESS AM TAB", "form": "Tablet"},
    {"name": "TELPRESS CT 40/12.5MG", "form": "Tablet"},
    {"name": "TELPRESS CT 40/6.25", "form": "Tablet"},
    {"name": "TELPRESS H40 TAB", "form": "Tablet"},
    {"name": "TELROSE TAB", "form": "Tablet"},
    {"name": "TELSARTAN 20MG TAB", "form": "Tablet"},
    {"name": "TELSARTAN 40MG TAB", "form": "Tablet"},
    {"name": "TELSARTAN AM TAB", "form": "Tablet"},
    {"name": "TELSARTAN H", "form": "Tablet"},
    {"name": "TELSITE 20MG TAB", "form": "Tablet"},
    {"name": "TELSITE 40MG TAB", "form": "Tablet"},
    {"name": "TELSITE AM TAB", "form": "Tablet"},
    {"name": "TELSITE H TAB", "form": "Tablet"},
    {"name": "TELTAN 40", "form": "Medicine"},
    {"name": "TELTAN AMH", "form": "Medicine"},
    {"name": "TELVAS 20MG TAB", "form": "Tablet"},
    {"name": "TELVAS 3D", "form": "Tablet"},
    {"name": "TELVAS 40MG TAB", "form": "Tablet"},
    {"name": "TELVAS AM TAB", "form": "Tablet"},
    {"name": "TELVAS CT40MG TAB", "form": "Tablet"},
    {"name": "TELVAS H40/12.5MG", "form": "Tablet"},
    {"name": "TENACID MF", "form": "Medicine"},
    {"name": "TENDIA TAB", "form": "Tablet"},
    {"name": "TENDIA-M TAB", "form": "Tablet"},
    {"name": "TENDOCARE", "form": "Medicine"},
    {"name": "TENDOCARE FORTE TAB", "form": "Tablet"},
    {"name": "TENDOCARE TAB", "form": "Tablet"},
    {"name": "TENDONOVA", "form": "Medicine"},
    {"name": "TENDOWISE FORTE TAB", "form": "Tablet"},
    {"name": "TENEPLA 20 TAB", "form": "Tablet"},
    {"name": "TENEPLA M 500 TAB", "form": "Tablet"},
    {"name": "TENEPRIDE 20MG TAB", "form": "Tablet"},
    {"name": "TENEPRIDE M-500MG TAB", "form": "Tablet"},
    {"name": "TENGLYN M500", "form": "Tablet"},
    {"name": "TENGLYN TABS", "form": "Tablet"},
    {"name": "TENOLOL 12.5MG TAB", "form": "Tablet"},
    {"name": "TENOLOL 25MG", "form": "Tablet"},
    {"name": "TENOLOL 50MG TAB", "form": "Tablet"},
    {"name": "TENOVATE CREAM 30GM", "form": "Cream"},
    {"name": "TENOVATE OINT 15GM", "form": "Cream"},
    {"name": "TENOVATE-GN OINT 20GM", "form": "Cream"},
    {"name": "TENOVATE-M OINT 20GM", "form": "Cream"},
    {"name": "TENTEX FORTE TABS", "form": "Tablet"},
    {"name": "TENTEX ROYAL CAPS", "form": "Capsule"},
    {"name": "TERBINAFORCE 250MG TAB", "form": "Tablet"},
    {"name": "TERBINAFORCE 500MG", "form": "Tablet"},
    {"name": "TERBIZOL 250", "form": "Medicine"},
    {"name": "TERBIZOL 250 TAB", "form": "Tablet"},
    {"name": "TETMOSOL SOAP 100GM", "form": "Soap"},
    {"name": "THEO ASTHALIN TAB", "form": "Tablet"},
    {"name": "THEOASTHALIN FORTE", "form": "Tablet"},
    {"name": "THEOASTHALIN TAB", "form": "Tablet"},
    {"name": "THERBINAFORCE 500MG TAB", "form": "Tablet"},
    {"name": "THIROACE 125", "form": "Medicine"},
    {"name": "THIROACE 37.5", "form": "Medicine"},
    {"name": "THIROACE 75", "form": "Medicine"},
    {"name": "THREPTIN BISCUIT REGULAR 275GM", "form": "Tablet"},
    {"name": "THREPTIN DISKETTES VANILLA 275GM", "form": "Tablet"},
    {"name": "THROMBOPHOB GEL 20GM", "form": "Cream"},
    {"name": "THROMBOPHOB OINT 20GM", "form": "Cream"},
    {"name": "THYIOUP 150", "form": "Medicine"},
    {"name": "THYROACTIV 50MCG 100S TAB", "form": "Tablet"},
    {"name": "THYROACTIV 50MCG TAB", "form": "Tablet"},
    {"name": "THYROCRUSH 100MG", "form": "Medicine"},
    {"name": "THYROCRUSH 25 MG", "form": "Medicine"},
    {"name": "THYROCRUSH 50 MG", "form": "Medicine"},
    {"name": "THYRONORM 100MCG 120S TAB", "form": "Tablet"},
    {"name": "THYRONORM 100MCG TAB", "form": "Tablet"},
    {"name": "THYRONORM 100MG TAB", "form": "Tablet"},
    {"name": "THYRONORM 12.5", "form": "Tablet"},
    {"name": "THYRONORM 12.5MCG 120S TAB", "form": "Tablet"},
    {"name": "THYRONORM 12.5MCG TAB", "form": "Tablet"},
    {"name": "THYRONORM 125MCG 120S TAB", "form": "Tablet"},
    {"name": "THYRONORM 125MCG TAB", "form": "Tablet"},
    {"name": "THYRONORM 125MG TAB", "form": "Tablet"},
    {"name": "THYRONORM 150MCG 120S TAB", "form": "Tablet"},
    {"name": "THYRONORM 150MCG TAB", "form": "Tablet"},
    {"name": "THYRONORM 150MG TAB", "form": "Tablet"},
    {"name": "THYRONORM 25MCG 120S TAB", "form": "Tablet"},
    {"name": "THYRONORM 25MCG TAB", "form": "Tablet"},
    {"name": "THYRONORM 25MG TAB", "form": "Tablet"},
    {"name": "THYRONORM 37.5MCG 100S TAB", "form": "Tablet"},
    {"name": "THYRONORM 37.5MCG TAB", "form": "Tablet"},
    {"name": "THYRONORM 50MCG 120S TAB", "form": "Tablet"},
    {"name": "THYRONORM 50MCG TAB", "form": "Tablet"},
    {"name": "THYRONORM 50MG TAB", "form": "Tablet"},
    {"name": "THYRONORM 62.5MCG 120S TAB", "form": "Tablet"},
    {"name": "THYRONORM 62.5MCG TAB", "form": "Tablet"},
    {"name": "THYRONORM 75MG TAB", "form": "Tablet"},
    {"name": "THYRONORM 88MCG 120S TAB", "form": "Tablet"},
    {"name": "THYRONORM 88MCG TAB", "form": "Tablet"},
    {"name": "THYRONORM 88MG TAB", "form": "Tablet"},
    {"name": "THYROX 100 TAB 100'S", "form": "Tablet"},
    {"name": "THYROX 25 100'S TAB", "form": "Tablet"},
    {"name": "THYROX 50 TAB 100'S", "form": "Tablet"},
    {"name": "THYROX 75 100'S TAB", "form": "Tablet"},
    {"name": "THYROXINOL", "form": "Medicine"},
    {"name": "THYROXINOL 100MCG 100S TAB", "form": "Tablet"},
    {"name": "THYROXINOL 100MCG TAB", "form": "Tablet"},
    {"name": "THYROXINOL 25", "form": "Medicine"},
    {"name": "THYROXINOL 25MCG LOOSE TAB", "form": "Tablet"},
    {"name": "THYROXINOL 25MCG TAB", "form": "Tablet"},
    {"name": "THYROXINOL 75", "form": "Medicine"},
    {"name": "THYROXINOL 75MCG 100S TAB", "form": "Tablet"},
    {"name": "THYROXINOL 75MCG TAB", "form": "Tablet"},
    {"name": "TIBAN 20", "form": "Tablet"},
    {"name": "TICMOXY CL 375", "form": "Medicine"},
    {"name": "TICMOXY CL 375 TAB", "form": "Tablet"},
    {"name": "TIDE 10MG", "form": "Tablet"},
    {"name": "TIDE 5MG TAB", "form": "Tablet"},
    {"name": "TIDE PLUS", "form": "Tablet"},
    {"name": "TIGATEL 40MG TAB", "form": "Tablet"},
    {"name": "TIGATEL CH40", "form": "Tablet"},
    {"name": "TIGER BALM RED  9ML", "form": "Tablet"},
    {"name": "TIGER BALM RED 21ML", "form": "Tablet"},
    {"name": "TIGER BALM WHITE 9ML", "form": "Tablet"},
    {"name": "TINFAL 5%", "form": "Medicine"},
    {"name": "TINFAL TAB", "form": "Medicine"},
    {"name": "TIOVA INHALER", "form": "Inhaler"},
    {"name": "TIOVA R/C", "form": "Tablet"},
    {"name": "TIXILIX SYP 60ML", "form": "Syrup"},
    {"name": "TIZAN 2 MG", "form": "Medicine"},
    {"name": "TIZAN 2MG TAB", "form": "Tablet"},
    {"name": "TOFAVAC 5MG", "form": "Medicine"},
    {"name": "TOFAVAC 5MG TAB", "form": "Tablet"},
    {"name": "TOLAGIN 8", "form": "Medicine"},
    {"name": "TONACT 10MG TAB", "form": "Tablet"},
    {"name": "TONACT 20MG TAB", "form": "Tablet"},
    {"name": "TONACT 40MG TAB", "form": "Tablet"},
    {"name": "TONACT 5MG", "form": "Tablet"},
    {"name": "TONACT ASP 75MG TAB", "form": "Tablet"},
    {"name": "TONACT TG 10MG TAB", "form": "Tablet"},
    {"name": "TORGLIP 50", "form": "Tablet"},
    {"name": "TORLEVA 500MG TAB", "form": "Tablet"},
    {"name": "TORLIVA 250MG", "form": "Tablet"},
    {"name": "TORMOXIN CLAV 375 TAB", "form": "Tablet"},
    {"name": "TORMOXIN CLAV SYP 30ML", "form": "Syrup"},
    {"name": "TORSEMIDE 10 MG", "form": "Medicine"},
    {"name": "TORSEMIDE 5MG", "form": "Medicine"},
    {"name": "TORSINOL 10MG TAB", "form": "Tablet"},
    {"name": "TORSINOL 5 TAB", "form": "Tablet"},
    {"name": "TOSSEX SYP 100ML", "form": "Syrup"},
    {"name": "TOSSEX-DMR SYP 100ML", "form": "Syrup"},
    {"name": "TOUJEO CATRIDGE", "form": "Tablet"},
    {"name": "TOUJEO SOLOSTAR INJ", "form": "Injection"},
    {"name": "TOXOCARE TAB", "form": "Tablet"},
    {"name": "TOZAAR 25MG TAB", "form": "Tablet"},
    {"name": "TOZAAR 50MG TAB", "form": "Tablet"},
    {"name": "TOZAAR H TAB", "form": "Tablet"},
    {"name": "TOZZAR 50MG TAB", "form": "Tablet"},
    {"name": "TRAJANTA DUO 2.5MG/1000MG", "form": "Tablet"},
    {"name": "TRAJANTA DUO 500MG", "form": "Tablet"},
    {"name": "TRAJENTA 5MG TAB", "form": "Tablet"},
    {"name": "TRAJENTA DUO 2.5/500MG TAB", "form": "Tablet"},
    {"name": "TRAMAZAC CAPS", "form": "Capsule"},
    {"name": "TRANOFRESH 500 TAB", "form": "Tablet"},
    {"name": "TRANSOFRESH MF", "form": "Medicine"},
    {"name": "TRAPIC 500MG", "form": "Tablet"},
    {"name": "TRAPIC 650MG TAB", "form": "Tablet"},
    {"name": "TRAPIC MF TAB", "form": "Tablet"},
    {"name": "TRESIBA FLEXTOUCH", "form": "Tablet"},
    {"name": "TRESIBA PENFIL 3ML", "form": "Tablet"},
    {"name": "TRI OLMEZEST", "form": "Tablet"},
    {"name": "TRIBET 1 MG TAB", "form": "Tablet"},
    {"name": "TRIBET 2MG TAB", "form": "Tablet"},
    {"name": "TRIBETROL 1MG TAB", "form": "Tablet"},
    {"name": "TRIBETROL 2MG TAB", "form": "Tablet"},
    {"name": "TRIGABANTIN 100MG TAB", "form": "Tablet"},
    {"name": "TRIGABANTIN 300MG TAB", "form": "Tablet"},
    {"name": "TRIGLUCORED FORTE TAB", "form": "Tablet"},
    {"name": "TRIGLYNASE 1MG TAB", "form": "Tablet"},
    {"name": "TRIGLYNASE 2MG TAB", "form": "Tablet"},
    {"name": "TRIKA 0.25MG", "form": "Tablet"},
    {"name": "TRIKA 0.5MG TAB", "form": "Tablet"},
    {"name": "TRIOLMEZEST 40MG TAB", "form": "Tablet"},
    {"name": "TRIPLEACAL D", "form": "Tablet"},
    {"name": "TRIPLEACAL FD", "form": "Tablet"},
    {"name": "TRIPLEACAL FORTE", "form": "Tablet"},
    {"name": "TRIPLEACAL TAB", "form": "Tablet"},
    {"name": "TRIPRIDE 1MG TAB", "form": "Tablet"},
    {"name": "TRIPRIDE 2 MG TAB", "form": "Tablet"},
    {"name": "TRIVEDON MR", "form": "Tablet"},
    {"name": "TRIVOLIB 1MG TAB", "form": "Tablet"},
    {"name": "TRIVOLIB 2MG TAB", "form": "Tablet"},
    {"name": "TRIVOLIB FORTE 1MG TAB", "form": "Tablet"},
    {"name": "TRIVOLIB FORTE 2MG", "form": "Tablet"},
    {"name": "TRUFEBUX 40", "form": "Medicine"},
    {"name": "TRYPTOMER 10MG TAB", "form": "Tablet"},
    {"name": "TRYPTOMER 25MG TAB", "form": "Tablet"},
    {"name": "TRYVAX BR FORTE TAB", "form": "Tablet"},
    {"name": "TRYVAX D TAB", "form": "Tablet"},
    {"name": "TRYZEN D", "form": "Medicine"},
    {"name": "TRYZEN D TAB", "form": "Tablet"},
    {"name": "TUGAIN 5% SOLUTION 60ML", "form": "Solution"},
    {"name": "TURBOVAS 10MG TAB", "form": "Tablet"},
    {"name": "TUSQ D COUGH LOZ", "form": "Tablet"},
    {"name": "TUSQ DX SUGAR FREE SYP", "form": "Syrup"},
    {"name": "TUSQ DX SYP 100ML", "form": "Syrup"},
    {"name": "TUSQ DX TAB", "form": "Tablet"},
    {"name": "TUSQ X SYP 100ML", "form": "Syrup"},
    {"name": "TUSSMARK D SYP", "form": "Medicine"},
    {"name": "TUSSMARK D SYP 100ML", "form": "Syrup"},
    {"name": "U V A CEF 100 SYP", "form": "Tablet"},
    {"name": "U V A CEF 50 DRY SYP", "form": "Syrup"},
    {"name": "UDAPA 5MG TAB", "form": "Tablet"},
    {"name": "UDAPA TAB 10MG", "form": "Tablet"},
    {"name": "UDILIV 150MG TAB", "form": "Tablet"},
    {"name": "UDILIV 300MG TAB", "form": "Tablet"},
    {"name": "UDISEN 450 SR", "form": "Medicine"},
    {"name": "UDOVAX 300 TAB", "form": "Tablet"},
    {"name": "ULGEL A", "form": "Medicine"},
    {"name": "ULGEL A SYP 170ML", "form": "Syrup"},
    {"name": "ULGEL LIQ 200ML", "form": "Cream"},
    {"name": "ULTRA D3 400IU DROPS 15ML", "form": "Drops"},
    {"name": "ULTRA D3 400IU DROPS 30ML", "form": "Drops"},
    {"name": "ULTRA D3 DROPS 30ML", "form": "Drops"},
    {"name": "ULTRA D3 TABS", "form": "Tablet"},
    {"name": "ULTRACET SEMI TAB", "form": "Tablet"},
    {"name": "ULTRACET TABS", "form": "Tablet"},
    {"name": "UNICONTIN E400MG TAB", "form": "Tablet"},
    {"name": "UNIENZYME DROPS 15ML", "form": "Drops"},
    {"name": "UNIENZYME PLUS LIQUID 200ML", "form": "Syrup"},
    {"name": "UNIENZYME SYP", "form": "Syrup"},
    {"name": "UNIENZYME TAB", "form": "Tablet"},
    {"name": "UNILAX ORAL SOLUTION 100ML", "form": "Solution"},
    {"name": "UNISPEED CZ TAB", "form": "Tablet"},
    {"name": "UPRISE D3 60K CAP", "form": "Capsule"},
    {"name": "UPRISE D3-2K", "form": "Tablet"},
    {"name": "URILISER 100ML", "form": "Tablet"},
    {"name": "URIMAX 0.2MG TAB", "form": "Tablet"},
    {"name": "URIMAX 0.4 CAP", "form": "Capsule"},
    {"name": "URIMAX 0.4 CAP 20'S", "form": "Capsule"},
    {"name": "URIMAX 0.4 TAB", "form": "Tablet"},
    {"name": "URIMAX 4 BOTT", "form": "Tablet"},
    {"name": "URIMAX D TAB", "form": "Tablet"},
    {"name": "URIMAX F TAB", "form": "Tablet"},
    {"name": "URISLASH KM SACHET", "form": "Powder"},
    {"name": "URISOLIN D", "form": "Medicine"},
    {"name": "URISPAS TAB", "form": "Tablet"},
    {"name": "URIVEL", "form": "Medicine"},
    {"name": "URIVEL 200MG TAB", "form": "Tablet"},
    {"name": "URIWAVE 0.4", "form": "Medicine"},
    {"name": "URIWAVE 0.4 TAB", "form": "Tablet"},
    {"name": "URSOCOL 150MG TAB", "form": "Tablet"},
    {"name": "URSOCOL 300MG TAB", "form": "Tablet"},
    {"name": "URSOLIN D", "form": "Medicine"},
    {"name": "UVA CEF 100 SYP", "form": "Syrup"},
    {"name": "UVA CEF 50 DRY SYP", "form": "Syrup"},
    {"name": "UVNIL MONT KID SYP 30ML", "form": "Syrup"},
    {"name": "UVSPAS TAB", "form": "Medicine"},
    {"name": "V WASH PLUS 20ML", "form": "Soap"},
    {"name": "V-WASH PLUS 100ML", "form": "Soap"},
    {"name": "VALCIVIR 1000MG TAB", "form": "Tablet"},
    {"name": "VALENT 40MG", "form": "Tablet"},
    {"name": "VALENT 80MG TAB", "form": "Tablet"},
    {"name": "VALIUM 10MG TAB", "form": "Tablet"},
    {"name": "VALIUM 2MG TAB", "form": "Tablet"},
    {"name": "VALIUM 5MG TAB", "form": "Tablet"},
    {"name": "VALPARIN 200MG TAB", "form": "Tablet"},
    {"name": "VALPARIN 500MG TAB", "form": "Tablet"},
    {"name": "VALPARIN CHRONO 200", "form": "Tablet"},
    {"name": "VALPARIN CHRONO 300MG TAB", "form": "Tablet"},
    {"name": "VALPARIN CHRONO 500MG", "form": "Tablet"},
    {"name": "VALPARIN SYP 200ML", "form": "Syrup"},
    {"name": "VALZAAR 40MG TAB", "form": "Tablet"},
    {"name": "VALZAAR 80MG TAB", "form": "Tablet"},
    {"name": "VALZAAR H TAB", "form": "Tablet"},
    {"name": "VANTAJ PASTE 100GM", "form": "Paste"},
    {"name": "VANTEJ PASTE 50GM", "form": "Paste"},
    {"name": "VASELINE DEEP MOISTURE 48 HR", "form": "Medicine"},
    {"name": "VASOGRAIN TAB", "form": "Tablet"},
    {"name": "VASOVIN XL 2.5MG TAB", "form": "Tablet"},
    {"name": "VAXHIST 16 TAB", "form": "Tablet"},
    {"name": "VAXPRIDE ENERGY", "form": "Medicine"},
    {"name": "VAXPRITE POWDER", "form": "Powder"},
    {"name": "VAXPRITE PWD", "form": "Powder"},
    {"name": "VAXTIC", "form": "Medicine"},
    {"name": "VAXTIC CAP", "form": "Medicine"},
    {"name": "VAXTIC TAB", "form": "Tablet"},
    {"name": "VAXTIC Z", "form": "Medicine"},
    {"name": "VAXTIC Z TAB", "form": "Tablet"},
    {"name": "VELOZ FAST 10'S", "form": "Tablet"},
    {"name": "VELOZ L CAP", "form": "Capsule"},
    {"name": "VELOZ- 20MG TAB", "form": "Tablet"},
    {"name": "VELOZ-D CAPS", "form": "Capsule"},
    {"name": "VELTAM 0.4MG TAB 15'S", "form": "Tablet"},
    {"name": "VENTIDOX M TAB", "form": "Tablet"},
    {"name": "VENTILEX A SYP 100ML", "form": "Syrup"},
    {"name": "VENTILEX LS SYP 100ML", "form": "Syrup"},
    {"name": "VENTILEX SYP 100ML", "form": "Syrup"},
    {"name": "VENUSIA CREAM 100GM", "form": "Cream"},
    {"name": "VENUSIA LOTION 100ML", "form": "Lotion"},
    {"name": "VENUSIA MAX CREAM JAR 150GM", "form": "Cream"},
    {"name": "VENUSIA MAX LOTION 300ML", "form": "Lotion"},
    {"name": "VENUSIA MAX LOTION 500ML", "form": "Lotion"},
    {"name": "VENUSIA MOISTURIZING CREAM 100GM", "form": "Cream"},
    {"name": "VERTIFORD 16", "form": "Medicine"},
    {"name": "VERTIGIL", "form": "Medicine"},
    {"name": "VERTIGIL 10*6T TAB", "form": "Tablet"},
    {"name": "VERTIGIL TAB", "form": "Tablet"},
    {"name": "VERTIN 16MG TAB", "form": "Tablet"},
    {"name": "VERTIN 24MG TAB", "form": "Tablet"},
    {"name": "VERTIN 8MG TAB", "form": "Tablet"},
    {"name": "VERTIRON 25", "form": "Medicine"},
    {"name": "VERTIRON 25MG TAB", "form": "Tablet"},
    {"name": "VIBACT CAPS", "form": "Capsule"},
    {"name": "VIBACT DS CAPS", "form": "Capsule"},
    {"name": "VICKS ACTION500", "form": "Tablet"},
    {"name": "VICKS VAPORUB XTRA STRONG 25ML", "form": "Tablet"},
    {"name": "VIGAMOX EYE DROPS 5ML", "form": "Drops"},
    {"name": "VIL DM PLUS TAB", "form": "Tablet"},
    {"name": "VIL DM TAB", "form": "Tablet"},
    {"name": "VILDAPRIDE 50MG TAB", "form": "Tablet"},
    {"name": "VILDAPRIDE M500MG TAB", "form": "Tablet"},
    {"name": "VINGLIN M 1000MG", "form": "Tablet"},
    {"name": "VINGLIN SR 100MG TAB", "form": "Tablet"},
    {"name": "VINGLYN D 10MG TAB", "form": "Tablet"},
    {"name": "VINGLYN M 500MG TAB", "form": "Tablet"},
    {"name": "VINGLYN TAB", "form": "Tablet"},
    {"name": "VIOMETIL MD", "form": "Medicine"},
    {"name": "VISCO MPS LIQUID 170ML", "form": "Syrup"},
    {"name": "VITAFOL 30 TAB", "form": "Tablet"},
    {"name": "VITAFOL TAB", "form": "Tablet"},
    {"name": "VITIC O", "form": "Medicine"},
    {"name": "VITOMIN D3 DROPS 30ML", "form": "Drops"},
    {"name": "VITOMIN D3 SACHET 1GM", "form": "Powder"},
    {"name": "VIZYLAC CAPS", "form": "Capsule"},
    {"name": "VOGLI RAPID 0.3/2.0 TAB", "form": "Tablet"},
    {"name": "VOGLI RAPID 2/0.3", "form": "Medicine"},
    {"name": "VOGLI RAPID TAB", "form": "Tablet"},
    {"name": "VOGLI-RAPID 0.2/0.5", "form": "Medicine"},
    {"name": "VOGLIMET-0.3 MD", "form": "Medicine"},
    {"name": "VOGLIMIT TRIO 1.3", "form": "Medicine"},
    {"name": "VOGLIMIT TRIO 2.3", "form": "Medicine"},
    {"name": "VOGLINORM GM1", "form": "Tablet"},
    {"name": "VOGLISTAR GM 2MG", "form": "Tablet"},
    {"name": "VOGLISTAR GM1 MG", "form": "Tablet"},
    {"name": "VOLIBO 0.2MG TAB", "form": "Tablet"},
    {"name": "VOLIBO 0.3MG TAB", "form": "Tablet"},
    {"name": "VOLIBO M 0.2MG TAB", "form": "Tablet"},
    {"name": "VOLIBO M 0.3 TAB", "form": "Tablet"},
    {"name": "VOLIBO R 0.3/1", "form": "Medicine"},
    {"name": "VOLINI GEL 10GM", "form": "Cream"},
    {"name": "VOLINI GEL 15GM", "form": "Cream"},
    {"name": "VOLINI GEL 30GM", "form": "Cream"},
    {"name": "VOLINI GEL 4GM", "form": "Cream"},
    {"name": "VOLINI GEL 50GM", "form": "Cream"},
    {"name": "VOLINI GEL 75GM", "form": "Cream"},
    {"name": "VOLINI MAXX SPRAY 25GM", "form": "Spray"},
    {"name": "VOLINI PAIN RELIEF GEL 15GM", "form": "Cream"},
    {"name": "VOLINI SPRAY 15GM", "form": "Spray"},
    {"name": "VOLINI SPRAY 40GM", "form": "Spray"},
    {"name": "VOLINI SPRAY 60GM", "form": "Spray"},
    {"name": "VOLINI SPY 100GM", "form": "Tablet"},
    {"name": "VOLITRA GEL 30GM", "form": "Cream"},
    {"name": "VOLIX 0.2MG TAB", "form": "Tablet"},
    {"name": "VOLIX 0.3MG TAB", "form": "Tablet"},
    {"name": "VOLIX M 0.2MG TAB", "form": "Tablet"},
    {"name": "VOLIX M 0.3MG TAB", "form": "Tablet"},
    {"name": "VOLIX TRIO 1MG", "form": "Tablet"},
    {"name": "VOLIX TRIO 2MG", "form": "Tablet"},
    {"name": "VOLIX TRIO FORTE 1MG", "form": "Tablet"},
    {"name": "VOLIX TRIO FORTE 2MG", "form": "Tablet"},
    {"name": "VOLTEND 0.2 MG", "form": "Medicine"},
    {"name": "VOLTEND 0.3", "form": "Medicine"},
    {"name": "VOLTEND R 0.3", "form": "Medicine"},
    {"name": "VOLTEND R 0.3 TAB", "form": "Tablet"},
    {"name": "VOMETIL MD TAB", "form": "Tablet"},
    {"name": "VOMETIL MD TABLETS", "form": "Medicine"},
    {"name": "VOMIFORD 8 MG", "form": "Medicine"},
    {"name": "VOMIKIND MD 4MG", "form": "Tablet"},
    {"name": "VOMINORM", "form": "Medicine"},
    {"name": "VOMINORM 10MG TAB", "form": "Tablet"},
    {"name": "VOMIOVER MD 4", "form": "Medicine"},
    {"name": "VOMIOVER SYRUP", "form": "Medicine"},
    {"name": "VOMIRAP-MD", "form": "Medicine"},
    {"name": "VOMISHIELD 4MD", "form": "Medicine"},
    {"name": "VOMISHIELD MD 4MG TAB", "form": "Tablet"},
    {"name": "VOMISHIELD MD 8 MG", "form": "Medicine"},
    {"name": "VOMIVAX MD", "form": "Tablet"},
    {"name": "VOMIVAX MD TAB", "form": "Tablet"},
    {"name": "VONO 20", "form": "Medicine"},
    {"name": "VOVERAN 50MG TAB", "form": "Tablet"},
    {"name": "VOVERAN GEL30GM", "form": "Cream"},
    {"name": "VOVERAN INJ 2ML", "form": "Injection"},
    {"name": "VOVERAN SR 75MG", "form": "Tablet"},
    {"name": "VOVERAN-SR 100MG TAB", "form": "Tablet"},
    {"name": "VOZET 5MG TAB", "form": "Tablet"},
    {"name": "VSL 3", "form": "Tablet"},
    {"name": "VYMADA 100MG TAB", "form": "Tablet"},
    {"name": "VYMADA 200MG TAB", "form": "Tablet"},
    {"name": "VYMADA 50MG TAB", "form": "Tablet"},
    {"name": "VYSOV 50MG TAB", "form": "Tablet"},
    {"name": "WAL D3 PLUS DROPS 5ML", "form": "Drops"},
    {"name": "WALAMYCIN DS 25MG/5ML SUSP 30ML", "form": "Suspension"},
    {"name": "WALAMYCIN DS SUSP 30ML", "form": "Syrup"},
    {"name": "WARF 1MG TAB", "form": "Tablet"},
    {"name": "WARF 2MG TAB", "form": "Tablet"},
    {"name": "WARF 3MG TAB", "form": "Tablet"},
    {"name": "WARF 5MG TAB", "form": "Tablet"},
    {"name": "WAXONIL-E/DROPS 10ML", "form": "Drops"},
    {"name": "WELLMAN 50 PLUS TAB", "form": "Tablet"},
    {"name": "WELLWOMAN CAP", "form": "Capsule"},
    {"name": "WELLWOMAN CAP 30S", "form": "Capsule"},
    {"name": "WIKORYL DROPS 10ML", "form": "Drops"},
    {"name": "WIKORYL SUPS 60ML", "form": "Tablet"},
    {"name": "WIKORYL TAB", "form": "Tablet"},
    {"name": "WINCAB 0.5", "form": "Medicine"},
    {"name": "WINCAB 0.5 TAB", "form": "Tablet"},
    {"name": "WINOGASS", "form": "Medicine"},
    {"name": "WINOGASS CAP", "form": "Capsule"},
    {"name": "WINSTEP MAX", "form": "Medicine"},
    {"name": "WINSTEP MAX TAB", "form": "Tablet"},
    {"name": "WYSOLONE 10MG TAB", "form": "Tablet"},
    {"name": "WYSOLONE 20 DT TAB", "form": "Tablet"},
    {"name": "WYSOLONE 20MG TAB", "form": "Tablet"},
    {"name": "WYSOLONE 5MG TAB", "form": "Tablet"},
    {"name": "XIGDUO XR 10/1000MG TAB", "form": "Tablet"},
    {"name": "XIGDUO XR 10/500MG TAB", "form": "Tablet"},
    {"name": "XMET 500MG TAB", "form": "Tablet"},
    {"name": "XMET SR 1GM TAB", "form": "Tablet"},
    {"name": "XMET SR 500MG TAB", "form": "Tablet"},
    {"name": "XMETOR 500", "form": "Medicine"},
    {"name": "XONE 1GM INJ", "form": "Injection"},
    {"name": "XTOR 10MG TAB", "form": "Tablet"},
    {"name": "XTOR 40MG TAB", "form": "Tablet"},
    {"name": "XTOR-20MG TAB", "form": "Tablet"},
    {"name": "XTOR-5MG TAB", "form": "Tablet"},
    {"name": "XYLOCAINE 2% JELLY 30GM", "form": "Tablet"},
    {"name": "XYLOCAINE 2% JELLY 50GM", "form": "Tablet"},
    {"name": "XYLOCAINE 2% VIAL 30ML", "form": "Injection"},
    {"name": "XYZAL 10MG TAB", "form": "Tablet"},
    {"name": "XYZAL 5MG TAB", "form": "Tablet"},
    {"name": "XYZAL-M", "form": "Tablet"},
    {"name": "YAHAR BABY SOAP 75GM", "form": "Soap"},
    {"name": "YAHER HERBAL SOAP 75GM", "form": "Soap"},
    {"name": "YAHER M SOAP 75GM", "form": "Soap"},
    {"name": "YAMOIST LOTION 100GM", "form": "Lotion"},
    {"name": "YAMOIST SOAP 75GM", "form": "Soap"},
    {"name": "Z&D DRY SYRUP 20ML", "form": "Syrup"},
    {"name": "ZADY 500MG", "form": "Tablet"},
    {"name": "ZANDU CHYAVANPRASH", "form": "Medicine"},
    {"name": "ZANDU NITYAM 10 TAB", "form": "Tablet"},
    {"name": "ZANDU NITYAM TAB", "form": "Tablet"},
    {"name": "ZANDU PANCHARISHTA", "form": "Medicine"},
    {"name": "ZANDU SATAVAREX", "form": "Medicine"},
    {"name": "ZANDU SATAVAREX GRANULES 210G", "form": "Powder"},
    {"name": "ZANDU SHILAJITPRASH", "form": "Medicine"},
    {"name": "ZANDU ULTRA POWER BALM", "form": "Medicine"},
    {"name": "ZANDUBALM ULTRA 25ML", "form": "Tablet"},
    {"name": "ZANOCIN 200MG TAB", "form": "Tablet"},
    {"name": "ZECUF SYP 100ML", "form": "Syrup"},
    {"name": "ZEDEX P SYP 60ML", "form": "Syrup"},
    {"name": "ZEDEX SF SYP 100ML", "form": "Syrup"},
    {"name": "ZEDEX SYP 100ML", "form": "Syrup"},
    {"name": "ZEEBEE SYRUP", "form": "Medicine"},
    {"name": "ZEET EXP  SYP 100ML", "form": "Syrup"},
    {"name": "ZENFLOX 200MG", "form": "Tablet"},
    {"name": "ZENFLOX 400MG", "form": "Tablet"},
    {"name": "ZENKIND M SYP", "form": "Medicine"},
    {"name": "ZENTAL 400MG TAB", "form": "Tablet"},
    {"name": "ZENTAL-SUSP 10ML", "form": "Syrup"},
    {"name": "ZEPTOL 200MG TAB", "form": "Tablet"},
    {"name": "ZEPTOL CR 200MG TAB", "form": "Tablet"},
    {"name": "ZEPTOL CR 300MG TAB", "form": "Tablet"},
    {"name": "ZEPTOL CR 400MG TAB", "form": "Tablet"},
    {"name": "ZEROD0L-P", "form": "Tablet"},
    {"name": "ZERODOL 100TAB", "form": "Tablet"},
    {"name": "ZERODOL CR TAB", "form": "Tablet"},
    {"name": "ZERODOL MR TAB", "form": "Tablet"},
    {"name": "ZERODOL SP TAB", "form": "Tablet"},
    {"name": "ZIBLOCK-50MG TAB", "form": "Tablet"},
    {"name": "ZIBLOK 25MG TAB", "form": "Tablet"},
    {"name": "ZIFI 100DRY SYP 30ML", "form": "Syrup"},
    {"name": "ZIFI 100DT", "form": "Tablet"},
    {"name": "ZIFI 200MG TAB", "form": "Tablet"},
    {"name": "ZIFI 50 DT", "form": "Tablet"},
    {"name": "ZIFI 50DRY SYP 30ML", "form": "Syrup"},
    {"name": "ZIFI BOTTLE OF 30ML 30ML DRY SYP 50GM", "form": "Syrup"},
    {"name": "ZIFI CV 200MG", "form": "Tablet"},
    {"name": "ZIFI DRY SYP 50GM", "form": "Syrup"},
    {"name": "ZIFI O 200MG TAB", "form": "Tablet"},
    {"name": "ZILOS 25MG TAB", "form": "Tablet"},
    {"name": "ZILOS 50MG TAB", "form": "Tablet"},
    {"name": "ZINCIWELL 100 ML", "form": "Medicine"},
    {"name": "ZINCIWELL 200 ML", "form": "Medicine"},
    {"name": "ZINCIWELL DROPS", "form": "Medicine"},
    {"name": "ZINCIWELL SYP 200ML", "form": "Syrup"},
    {"name": "ZINCOCHARI SYP", "form": "Medicine"},
    {"name": "ZINCODERM GM 15GM", "form": "Tablet"},
    {"name": "ZINCODERM OINT 15GM", "form": "Cream"},
    {"name": "ZINCONYD", "form": "Medicine"},
    {"name": "ZINCONYD TAB", "form": "Tablet"},
    {"name": "ZINCOVIT SF SYP 200ML", "form": "Syrup"},
    {"name": "ZINCOVIT TAB", "form": "Tablet"},
    {"name": "ZINDERVIT", "form": "Medicine"},
    {"name": "ZINDERVIT TAB", "form": "Tablet"},
    {"name": "ZITA MET PLUS 20/500MG", "form": "Tablet"},
    {"name": "ZITEN 20MG TAB", "form": "Tablet"},
    {"name": "ZITEN M20/500 TAB", "form": "Tablet"},
    {"name": "ZITHOWIN SF KIT", "form": "Tablet"},
    {"name": "ZITHROVIL SF KIT", "form": "Medicine"},
    {"name": "ZIVAST-10MG TAB", "form": "Tablet"},
    {"name": "ZIVAST-20MG TAB", "form": "Tablet"},
    {"name": "ZIVAST-5MG TAB", "form": "Tablet"},
    {"name": "ZOCLAR 250MG TAB", "form": "Tablet"},
    {"name": "ZOCLAR 500", "form": "Medicine"},
    {"name": "ZOCLAR 500MG TAB", "form": "Tablet"},
    {"name": "ZOCON 150MG CAP", "form": "Capsule"},
    {"name": "ZOLE OINT 15GM", "form": "Cream"},
    {"name": "ZOLE-F OINT 15GM", "form": "Cream"},
    {"name": "ZOLFRESH 10MG TAB", "form": "Tablet"},
    {"name": "ZOLFRESH 5MG TAB", "form": "Tablet"},
    {"name": "ZOMELIS MET 50/500MG", "form": "Tablet"},
    {"name": "ZOMELIS MET 50/500MG TAB", "form": "Tablet"},
    {"name": "ZOMLELIS 50MG TAB", "form": "Tablet"},
    {"name": "ZORYL 1MG TAB", "form": "Tablet"},
    {"name": "ZORYL 2MG TAB", "form": "Tablet"},
    {"name": "ZORYL M0.5MG TAB", "form": "Tablet"},
    {"name": "ZORYL M1 FORTE TAB", "form": "Tablet"},
    {"name": "ZORYL M1MG TAB", "form": "Tablet"},
    {"name": "ZORYL M2 FORTE TAB", "form": "Tablet"},
    {"name": "ZORYL M2 TAB", "form": "Tablet"},
    {"name": "ZORYL M3 FORTE", "form": "Tablet"},
    {"name": "ZORYL M3 TAB", "form": "Tablet"},
    {"name": "ZORYL M4 FORTE", "form": "Tablet"},
    {"name": "ZORYL M4 MG TAB", "form": "Tablet"},
    {"name": "ZOVIRAX 200MG", "form": "Tablet"},
    {"name": "ZOVIRAX 400MG TAB", "form": "Tablet"},
    {"name": "ZOVIRAX 800MG TAB", "form": "Tablet"},
    {"name": "ZOXAN EYE DROPS 10ML", "form": "Drops"},
    {"name": "ZOXAN EYE OINT 10GM", "form": "Cream"},
    {"name": "ZOXAN EYE OINT 5GM", "form": "Cream"},
    {"name": "ZREPAG RAPID", "form": "Medicine"},
    {"name": "ZUKAMIN DROPS", "form": "Medicine"},
    {"name": "ZUKAMIN PLUS DROPS", "form": "Medicine"},
    {"name": "ZUKANORM M 500 TAB", "form": "Tablet"},
    {"name": "ZYLORIC 100MG", "form": "Tablet"},
    {"name": "ZYMVAX TAB", "form": "Tablet"},
    {"name": "ZYRCOLD 5MG TAB", "form": "Tablet"},
    {"name": "ZYRCOLD SYP 100ML", "form": "Syrup"},
    {"name": "ZYROVA 10MG TAB", "form": "Tablet"},
    {"name": "ZYRTEC SYP 60ML", "form": "Syrup"},
    {"name": "ZYRTEC TAB", "form": "Tablet"},
    {"name": "ZYTANIX 2.5MG TAB", "form": "Tablet"},
    {"name": "ZYTANIX 5MG TAB", "form": "Tablet"},
    {"name": "ZYTEE DROPS 10ML", "form": "Drops"},
    {"name": "ZYTEE TUBE 10ML", "form": "Tablet"}
]

# ============ Admin Configuration ============
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'nevikacura2026')  # Change in production

# Staff Roles
STAFF_ROLES = {
    "super_admin": "Super Admin - Full Access (Owner)",
    "doctor": "Doctor - Multi-Clinic Access",  # NEW: Unified doctor role
    "doctor_pushpa": "Doctor - Pushpa Clinic (Legacy)",
    "doctor_amnion": "Doctor - Amnion Clinic (Legacy)",
    "clinic_staff_pushpa": "Clinic Staff - Pushpa Clinic",
    "clinic_staff_amnion": "Clinic Staff - Amnion Clinic",
    "pharmacy_staff": "Pharmacy Staff - Orange Pharmacy",
    "diagnostics_staff": "Diagnostics Staff - Proton Diagnostics"
}

# Clinics
CLINICS = {
    "Pushpa Clinic": ["Dr. Neha Patel", "Dr. Vikas Jha"],
    "Amnion Clinic": ["Dr. Vikas Jha", "Dr. Neha Patel"]
}

# Doctor-to-Clinics mapping (which clinics each doctor works at)
DOCTOR_CLINICS = {
    "Dr. Neha Patel": ["Pushpa Clinic", "Amnion Clinic"],
    "Dr. Vikas Jha": ["Pushpa Clinic", "Amnion Clinic"]
}

# Appointment Statuses (Updated flow)
APPOINTMENT_STATUSES = ["Booked", "In Clinic", "Completed", "Cancelled", "No Show"]

# Appointment Types
APPOINTMENT_TYPES = ["NORMAL", "EMERGENCY"]

# Max emergency appointments per doctor per day
MAX_EMERGENCY_PER_DOCTOR_PER_DAY = 10

# Pharmacy Order Statuses (Updated)
PHARMACY_STATUSES = ["Order Booked", "Packing", "Out for Delivery", "Delivered"]

# Diagnostic Order Statuses (Updated)
DIAGNOSTIC_STATUSES = ["Test Booked", "Sample Collected", "In Process", "Reports Generated"]

# Add-on Service Types
SERVICE_TYPES = ["BLOOD_TEST", "SONOGRAPHY", "ECG"]

# Service Statuses
SERVICE_STATUSES = ["ORDERED", "SAMPLE_COLLECTED", "PROCESSING", "COMPLETED"]

class AdminLogin(BaseModel):
    password: str

class StaffCreate(BaseModel):
    username: str
    password: str
    name: str
    role: str
    doctor_name: Optional[str] = None  # Only for doctor role
    clinic: Optional[str] = None  # For clinic-specific roles

class StaffLogin(BaseModel):
    username: str
    password: str

class WalkInAppointment(BaseModel):
    doctor: str
    clinic: str
    date: str
    time: str
    patient_name: str
    patient_phone: str

class AppointmentStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class StaffOrderStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class StaffDiagnosticOrderCreate(BaseModel):
    """Create diagnostic order by staff"""
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    age: Optional[str] = None
    sex: Optional[str] = None  # Male, Female, Other
    tests: List[str]
    notes: Optional[str] = None

class EmergencyAppointment(BaseModel):
    """Emergency appointment - no time slot required"""
    doctor: str
    clinic: str
    date: str
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None

class AddServiceRequest(BaseModel):
    """Add service to an appointment"""
    service_type: str  # BLOOD_TEST, SONOGRAPHY, ECG
    service_details: Optional[str] = None
    specific_tests: Optional[List[str]] = None  # List of specific test names

class ServiceStatusUpdate(BaseModel):
    """Update service status"""
    status: str
    notes: Optional[str] = None

@api_router.post("/admin/login")
async def admin_login(input: AdminLogin):
    """Admin login with password"""
    if input.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin password")
    
    # Generate admin token with 30 days expiry for persistent login
    admin_token = jwt.encode({
        'sub': 'admin',
        'role': 'super_admin',
        'name': 'Super Admin',
        'exp': datetime.now(timezone.utc) + timedelta(days=30)
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return {"token": admin_token, "role": "super_admin", "name": "Super Admin"}

async def verify_admin(authorization: str = Header(None)):
    """Verify admin token"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Admin authentication required")
    
    token = authorization.split(' ')[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get('role') not in ['admin', 'super_admin']:
            raise HTTPException(status_code=403, detail="Admin access required")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Admin session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid admin token")

async def verify_staff(authorization: str = Header(None)):
    """Verify staff token and return staff info"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Staff authentication required")
    
    token = authorization.split(' ')[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ Staff Management Endpoints ============

@api_router.post("/admin/staff")
async def create_staff(staff: StaffCreate, admin = Depends(verify_admin)):
    """Create a new staff member (Super Admin only)"""
    if staff.role not in STAFF_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {list(STAFF_ROLES.keys())}")
    
    # Check if username already exists
    existing = await db.staff.find_one({"username": staff.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Hash password
    password_hash = bcrypt.hashpw(staff.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Determine clinic based on role
    clinic = staff.clinic
    if staff.role in ["doctor_pushpa", "clinic_staff_pushpa"]:
        clinic = "Pushpa Clinic"
    elif staff.role in ["doctor_amnion", "clinic_staff_amnion"]:
        clinic = "Amnion Clinic"
    
    staff_doc = {
        "id": str(uuid.uuid4()),
        "username": staff.username,
        "password_hash": password_hash,
        "name": staff.name,
        "role": staff.role,
        "doctor_name": staff.doctor_name if staff.role.startswith("doctor") else None,
        "clinic": clinic,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "active": True
    }
    
    await db.staff.insert_one(staff_doc)
    logger.info(f"Staff created: {staff.username} ({staff.role})")
    
    return {
        "id": staff_doc["id"],
        "username": staff.username,
        "name": staff.name,
        "role": staff.role,
        "doctor_name": staff_doc["doctor_name"],
        "clinic": staff_doc["clinic"]
    }

@api_router.get("/admin/staff")
async def list_staff(admin = Depends(verify_admin)):
    """List all staff members"""
    staff_list = await db.staff.find({}, {"_id": 0, "password_hash": 0}).to_list(100)
    return {"staff": staff_list, "roles": STAFF_ROLES, "clinics": CLINICS}

@api_router.delete("/admin/staff/{staff_id}")
async def delete_staff(staff_id: str, admin = Depends(verify_admin)):
    """Delete a staff member"""
    result = await db.staff.delete_one({"id": staff_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return {"success": True, "message": "Staff member deleted"}

@api_router.put("/admin/staff/{staff_id}/toggle")
async def toggle_staff_status(staff_id: str, admin = Depends(verify_admin)):
    """Enable/disable a staff member"""
    staff = await db.staff.find_one({"id": staff_id})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    new_status = not staff.get("active", True)
    await db.staff.update_one({"id": staff_id}, {"$set": {"active": new_status}})
    
    return {"success": True, "active": new_status}

# ============ Staff Login & Role-specific Endpoints ============

@api_router.post("/staff/login")
async def staff_login(input: StaffLogin):
    """Staff login with username and password"""
    staff = await db.staff.find_one({"username": input.username})
    
    if not staff:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not staff.get("active", True):
        raise HTTPException(status_code=403, detail="Account is disabled")
    
    if not bcrypt.checkpw(input.password.encode('utf-8'), staff["password_hash"].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Log login for audit
    await db.audit_logs.insert_one({
        "action": "staff_login",
        "staff_id": staff["id"],
        "username": staff["username"],
        "role": staff["role"],
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    # Get all clinics this doctor works at (for doctor roles)
    doctor_name = staff.get("doctor_name")
    doctor_clinics = []
    if doctor_name and staff["role"] in ["doctor", "doctor_pushpa", "doctor_amnion"]:
        doctor_clinics = DOCTOR_CLINICS.get(doctor_name, [])
    
    # Generate staff token with 30 days expiry
    staff_token = jwt.encode({
        'sub': staff["id"],
        'username': staff["username"],
        'role': staff["role"],
        'name': staff["name"],
        'doctor_name': doctor_name,
        'clinic': staff.get("clinic"),
        'doctor_clinics': doctor_clinics,  # All clinics doctor works at
        'exp': datetime.now(timezone.utc) + timedelta(days=30)
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return {
        "token": staff_token,
        "role": staff["role"],
        "name": staff["name"],
        "doctor_name": doctor_name,
        "clinic": staff.get("clinic"),
        "doctor_clinics": doctor_clinics  # Return all clinics for doctor
    }

# ============ Clinic Staff Endpoints ============

@api_router.post("/staff/appointments/walk-in")
async def book_walk_in_appointment(appt: WalkInAppointment, staff = Depends(verify_staff)):
    """Book a walk-in appointment (Clinic Staff only)"""
    role = staff.get("role")
    if role not in ["clinic_staff_pushpa", "clinic_staff_amnion", "super_admin"]:
        raise HTTPException(status_code=403, detail="Clinic staff access required")
    
    # Verify staff can only book for their clinic
    if role == "clinic_staff_pushpa" and appt.clinic != "Pushpa Clinic":
        raise HTTPException(status_code=403, detail="You can only book for Pushpa Clinic")
    if role == "clinic_staff_amnion" and appt.clinic != "Amnion Clinic":
        raise HTTPException(status_code=403, detail="You can only book for Amnion Clinic")
    
    # SLOT BLOCKING: Check if slot is already booked for normal appointments (includes pending from patient bookings)
    existing_slot = await db.appointments.find_one({
        "doctor": appt.doctor,
        "date": appt.date,
        "time": appt.time,
        "status": {"$in": ["pending", "Booked", "In Clinic", "Completed"]}
    })
    
    if existing_slot:
        raise HTTPException(
            status_code=400, 
            detail="This time slot is already booked. Please select another slot."
        )
    
    appointment = {
        "id": str(uuid.uuid4()),
        "user_id": None,  # Walk-in, no user account
        "doctor": appt.doctor,
        "clinic": appt.clinic,
        "date": appt.date,
        "time": appt.time,
        "patient_name": appt.patient_name,
        "patient_phone": appt.patient_phone,
        "patient_email": None,
        "status": "Booked",
        "appointment_type": "NORMAL",
        "booking_type": "walk_in",
        "booked_by": staff.get("name"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.appointments.insert_one(appointment)
    
    # Log action
    await db.audit_logs.insert_one({
        "action": "appointment_booked",
        "appointment_id": appointment["id"],
        "staff_id": staff.get("sub"),
        "staff_name": staff.get("name"),
        "patient_name": appt.patient_name,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    logger.info(f"Walk-in appointment booked by {staff.get('name')}: {appt.patient_name}")
    
    # Send WhatsApp notification to doctor
    await notify_doctor_whatsapp(appt.doctor, appointment, "walk_in")
    
    return {k: v for k, v in appointment.items() if k != "_id"}

# ============ Emergency Appointments ============

@api_router.post("/staff/appointments/emergency")
async def book_emergency_appointment(appt: EmergencyAppointment, staff = Depends(verify_staff)):
    """Book an emergency appointment - NO time slot required (Clinic Staff only)"""
    role = staff.get("role")
    if role not in ["clinic_staff_pushpa", "clinic_staff_amnion", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only Clinic Staff can book emergency appointments")
    
    # Verify staff can only book for their clinic
    if role == "clinic_staff_pushpa" and appt.clinic != "Pushpa Clinic":
        raise HTTPException(status_code=403, detail="You can only book for Pushpa Clinic")
    if role == "clinic_staff_amnion" and appt.clinic != "Amnion Clinic":
        raise HTTPException(status_code=403, detail="You can only book for Amnion Clinic")
    
    # Check emergency appointment limit (max 10 per doctor per day)
    emergency_count = await db.appointments.count_documents({
        "doctor": appt.doctor,
        "date": appt.date,
        "appointment_type": "EMERGENCY",
        "status": {"$ne": "Cancelled"}
    })
    
    if emergency_count >= MAX_EMERGENCY_PER_DOCTOR_PER_DAY:
        raise HTTPException(
            status_code=400,
            detail=f"Daily emergency appointment limit reached ({MAX_EMERGENCY_PER_DOCTOR_PER_DAY}/day). Cannot book more emergency appointments for this doctor today."
        )
    
    appointment = {
        "id": str(uuid.uuid4()),
        "user_id": None,
        "doctor": appt.doctor,
        "clinic": appt.clinic,
        "date": appt.date,
        "time": None,  # Emergency appointments have NO time slot
        "patient_name": appt.patient_name,
        "patient_phone": appt.patient_phone,
        "patient_email": appt.patient_email,
        "status": "Booked",
        "appointment_type": "EMERGENCY",
        "booking_type": "emergency",
        "booked_by": staff.get("name"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.appointments.insert_one(appointment)
    
    # Log action
    await db.audit_logs.insert_one({
        "action": "EMERGENCY_BOOKED",
        "appointment_id": appointment["id"],
        "staff_id": staff.get("sub"),
        "staff_name": staff.get("name"),
        "patient_name": appt.patient_name,
        "doctor": appt.doctor,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    logger.info(f"EMERGENCY appointment booked by {staff.get('name')}: {appt.patient_name} for {appt.doctor}")
    
    # Send WhatsApp notification to doctor (EMERGENCY priority)
    await notify_doctor_whatsapp(appt.doctor, appointment, "emergency")
    
    return {k: v for k, v in appointment.items() if k != "_id"}

@api_router.get("/staff/emergency-count/{doctor}/{date}")
async def get_emergency_count(doctor: str, date: str, staff = Depends(verify_staff)):
    """Get emergency appointment count for a doctor on a specific date"""
    count = await db.appointments.count_documents({
        "doctor": doctor,
        "date": date,
        "appointment_type": "EMERGENCY",
        "status": {"$ne": "Cancelled"}
    })
    
    return {
        "doctor": doctor,
        "date": date,
        "emergency_count": count,
        "max_allowed": MAX_EMERGENCY_PER_DOCTOR_PER_DAY,
        "remaining": MAX_EMERGENCY_PER_DOCTOR_PER_DAY - count
    }

# ============ Add-on Services (Blood Test, Sonography, ECG) ============

@api_router.post("/staff/appointments/{appointment_id}/services")
async def add_service_to_appointment(appointment_id: str, service: AddServiceRequest, staff = Depends(verify_staff)):
    """Add a service (Blood Test, Sonography, ECG) to an appointment - Clinic Staff only"""
    role = staff.get("role")
    if role not in ["clinic_staff_pushpa", "clinic_staff_amnion", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only Clinic Staff can add services")
    
    # Validate service type
    if service.service_type not in SERVICE_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid service type. Must be one of: {SERVICE_TYPES}")
    
    # Get appointment
    appointment = await db.appointments.find_one({"id": appointment_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Verify clinic access
    if role == "clinic_staff_pushpa" and appointment.get("clinic") != "Pushpa Clinic":
        raise HTTPException(status_code=403, detail="You can only manage Pushpa Clinic appointments")
    if role == "clinic_staff_amnion" and appointment.get("clinic") != "Amnion Clinic":
        raise HTTPException(status_code=403, detail="You can only manage Amnion Clinic appointments")
    
    # Cannot add services after appointment is completed
    if appointment.get("status") == "Completed":
        raise HTTPException(status_code=400, detail="Cannot add services to completed appointments")
    
    # Create service record
    service_record = {
        "id": str(uuid.uuid4()),
        "appointment_id": appointment_id,
        "patient_name": appointment.get("patient_name"),
        "patient_phone": appointment.get("patient_phone"),
        "patient_email": appointment.get("patient_email"),
        "clinic": appointment.get("clinic"),
        "doctor": appointment.get("doctor"),
        "service_type": service.service_type,
        "service_details": service.service_details,
        "specific_tests": service.specific_tests or [],
        "ordered_by": staff.get("name"),
        "ordered_by_id": staff.get("sub"),
        "status": "ORDERED",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.appointment_services.insert_one(service_record)
    
    # Also create a linked diagnostic order for tracking
    # Use specific tests if provided, otherwise use generic name
    tests_for_order = service.specific_tests if service.specific_tests else [f"{service.service_type} (Clinic Add-on)"]
    
    diagnostic_order = {
        "id": str(uuid.uuid4()),
        "user_id": appointment.get("user_id"),
        "tests": tests_for_order,
        "prescription_url": None,
        "preferred_date": appointment.get("date"),
        "patient_name": appointment.get("patient_name"),
        "patient_phone": appointment.get("patient_phone"),
        "patient_email": appointment.get("patient_email"),
        "clinic": appointment.get("clinic"),  # Include clinic name for Proton staff
        "doctor": appointment.get("doctor"),  # Include doctor name
        "status": "Test Booked",
        "linked_appointment_id": appointment_id,
        "linked_service_id": service_record["id"],
        "service_type": service.service_type,
        "ordered_by": staff.get("name"),  # Track who ordered
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.diagnostic_orders.insert_one(diagnostic_order)
    
    # Log action
    await db.audit_logs.insert_one({
        "action": "SERVICE_ADDED",
        "appointment_id": appointment_id,
        "service_id": service_record["id"],
        "service_type": service.service_type,
        "staff_id": staff.get("sub"),
        "staff_name": staff.get("name"),
        "patient_name": appointment.get("patient_name"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    # Send email notification if patient has email
    if appointment.get("patient_email"):
        service_display = {
            "BLOOD_TEST": "Blood Test",
            "SONOGRAPHY": "Sonography / USG",
            "ECG": "ECG (Electrocardiogram)"
        }
        patient_html = f"""
        <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">Diagnostic Test Ordered 🔬</h1>
            </div>
            <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
                <p>Dear <strong>{appointment.get('patient_name')}</strong>,</p>
                <p>The following test has been booked during your visit:</p>
                <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
                    <p><strong>Test:</strong> {service_display.get(service.service_type, service.service_type)}</p>
                    <p><strong>Clinic:</strong> {appointment.get('clinic')}</p>
                    <p><strong>Doctor:</strong> {appointment.get('doctor')}</p>
                </div>
                <p style="color: #64748b; font-size: 14px;">Thank you for choosing Nevika Cura Healthcare.</p>
            </div>
        </div>
        """
        await send_email_notification(
            f"Diagnostic Test Ordered - {appointment.get('patient_name')}",
            f"Service {service.service_type} added for patient {appointment.get('patient_name')}",
            patient_email=appointment.get("patient_email"),
            patient_subject="Diagnostic Test Ordered – Nevika Cura",
            patient_html=patient_html
        )
    
    logger.info(f"Service {service.service_type} added to appointment {appointment_id} by {staff.get('name')}")
    
    return {
        "success": True,
        "service": {k: v for k, v in service_record.items() if k != "_id"},
        "message": f"{service.service_type} service added successfully"
    }

@api_router.get("/staff/appointments/{appointment_id}/services")
async def get_appointment_services(appointment_id: str, staff = Depends(verify_staff)):
    """Get all services linked to an appointment"""
    services = await db.appointment_services.find(
        {"appointment_id": appointment_id},
        {"_id": 0}
    ).to_list(50)
    
    return {"services": services}

@api_router.get("/staff/diagnostic/service-orders")
async def get_service_linked_orders(staff = Depends(verify_staff), status: Optional[str] = None):
    """Get diagnostic orders that are linked to clinic services (Diagnostics Staff)"""
    if staff.get("role") not in ["diagnostics_staff", "super_admin"]:
        raise HTTPException(status_code=403, detail="Diagnostics staff access required")
    
    query = {"linked_appointment_id": {"$exists": True, "$ne": None}}
    if status:
        query["status"] = status
    
    orders = await db.diagnostic_orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"orders": orders, "service_statuses": SERVICE_STATUSES}

@api_router.put("/staff/services/{service_id}/status")
async def update_service_status(service_id: str, update: ServiceStatusUpdate, staff = Depends(verify_staff)):
    """Update add-on service status (Diagnostics Staff only)"""
    if staff.get("role") not in ["diagnostics_staff", "super_admin"]:
        raise HTTPException(status_code=403, detail="Diagnostics staff access required")
    
    if update.status not in SERVICE_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {SERVICE_STATUSES}")
    
    # Update service record
    result = await db.appointment_services.update_one(
        {"id": service_id},
        {"$set": {
            "status": update.status,
            "updated_by": staff.get("name"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "notes": update.notes
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Also update linked diagnostic order
    service = await db.appointment_services.find_one({"id": service_id})
    if service:
        status_map = {
            "ORDERED": "Test Booked",
            "SAMPLE_COLLECTED": "Sample Collected",
            "PROCESSING": "In Process",
            "COMPLETED": "Reports Generated"
        }
        await db.diagnostic_orders.update_many(
            {"linked_service_id": service_id},
            {"$set": {"status": status_map.get(update.status, update.status)}}
        )
    
    # Log action
    await db.audit_logs.insert_one({
        "action": "SERVICE_STATUS_UPDATED",
        "service_id": service_id,
        "new_status": update.status,
        "staff_id": staff.get("sub"),
        "staff_name": staff.get("name"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "status": update.status}

@api_router.put("/staff/appointments/{appointment_id}/check-in")
async def check_in_patient(appointment_id: str, staff = Depends(verify_staff)):
    """Mark patient as checked in / IN CLINIC (Clinic Staff only)"""
    role = staff.get("role")
    if role not in ["clinic_staff_pushpa", "clinic_staff_amnion", "super_admin"]:
        raise HTTPException(status_code=403, detail="Clinic staff access required")
    
    appointment = await db.appointments.find_one({"id": appointment_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Verify staff can only check-in for their clinic
    if role == "clinic_staff_pushpa" and appointment.get("clinic") != "Pushpa Clinic":
        raise HTTPException(status_code=403, detail="You can only manage Pushpa Clinic appointments")
    if role == "clinic_staff_amnion" and appointment.get("clinic") != "Amnion Clinic":
        raise HTTPException(status_code=403, detail="You can only manage Amnion Clinic appointments")
    
    await db.appointments.update_one(
        {"id": appointment_id},
        {"$set": {
            "status": "In Clinic",
            "checked_in_at": datetime.now(timezone.utc).isoformat(),
            "checked_in_by": staff.get("name")
        }}
    )
    
    # Log action
    await db.audit_logs.insert_one({
        "action": "patient_checked_in",
        "appointment_id": appointment_id,
        "staff_id": staff.get("sub"),
        "staff_name": staff.get("name"),
        "patient_name": appointment.get("patient_name"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    # Send WhatsApp notification to doctor about patient check-in
    doctor_name = appointment.get("doctor")
    doctor_number = DOCTOR_WHATSAPP_NUMBERS.get(doctor_name)
    if doctor_number:
        checkin_message = f"""*🏥 Patient Checked In*

👤 *Patient:* {appointment.get('patient_name')}
📞 *Phone:* {appointment.get('patient_phone', 'N/A')}

👨‍⚕️ *Doctor:* {doctor_name}
🏥 *Clinic:* {appointment.get('clinic')}
⏰ *Time:* {appointment.get('time') or 'Emergency'}

✅ *Status:* IN CLINIC
📝 *Checked in by:* {staff.get('name')}

_Patient is waiting. Please see them shortly._

_Nevika Cura Healthcare_"""
        await send_whatsapp_notification(doctor_number, checkin_message)
    
    # Send email if patient has email
    if appointment.get("patient_email"):
        patient_html = f"""
        <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">You are Checked-In ✓</h1>
            </div>
            <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
                <p>Dear <strong>{appointment.get('patient_name')}</strong>,</p>
                <p>You have been marked <strong>IN CLINIC</strong> for your appointment.</p>
                <p>Please wait, the doctor will see you shortly.</p>
                <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Doctor:</strong> {appointment.get('doctor')}</p>
                    <p><strong>Clinic:</strong> {appointment.get('clinic')}</p>
                </div>
                <p style="color: #64748b; font-size: 14px;">Thank you for choosing Nevika Cura Healthcare.</p>
            </div>
        </div>
        """
        await send_email_notification(
            f"Patient Check-In - {appointment.get('patient_name')}",
            f"Patient {appointment.get('patient_name')} checked in at {appointment.get('clinic')}",
            patient_email=appointment.get("patient_email"),
            patient_subject="You are Checked-In – Nevika Cura",
            patient_html=patient_html
        )
    
    logger.info(f"Patient checked in by {staff.get('name')}: {appointment.get('patient_name')}")
    
    return {"success": True, "status": "In Clinic", "message": "Patient checked in successfully"}

# ============ Doctor Endpoints ============

@api_router.get("/staff/doctor/appointments")
async def get_doctor_appointments(staff = Depends(verify_staff), date: Optional[str] = None, clinic: Optional[str] = None):
    """Get appointments for the logged-in doctor - Emergency appointments pinned on top
    
    Doctors can filter by:
    - date: specific date (YYYY-MM-DD)
    - clinic: specific clinic name (for doctors working at multiple clinics)
    """
    role = staff.get("role")
    if role not in ["doctor", "doctor_pushpa", "doctor_amnion", "super_admin"]:
        raise HTTPException(status_code=403, detail="Doctor access required")
    
    # Doctors can only see their own appointments
    query = {}
    if role in ["doctor", "doctor_pushpa", "doctor_amnion"]:
        query["doctor"] = staff.get("doctor_name")
    
    # Filter by date if provided
    if date:
        query["date"] = date
    
    # Filter by clinic if provided (for multi-clinic doctors)
    if clinic:
        query["clinic"] = clinic
    
    # Get all appointments matching query
    all_appointments = await db.appointments.find(query, {"_id": 0}).to_list(500)
    
    # Separate emergency and normal appointments
    emergency_appts = [a for a in all_appointments if a.get("appointment_type") == "EMERGENCY"]
    normal_appts = [a for a in all_appointments if a.get("appointment_type") != "EMERGENCY"]
    
    # Sort normal appointments by date then time
    normal_appts.sort(key=lambda x: (x.get("date") or "", x.get("time") or "99:99"))
    
    # Emergency appointments pinned on top
    appointments = emergency_appts + normal_appts
    
    # Get doctor's clinics for frontend
    doctor_name = staff.get("doctor_name")
    doctor_clinics = DOCTOR_CLINICS.get(doctor_name, []) if doctor_name else []
    
    return {
        "appointments": appointments,
        "doctor_name": doctor_name,
        "doctor_clinics": doctor_clinics,
        "selected_clinic": clinic,
        "selected_date": date,
        "total_count": len(appointments)
    }

@api_router.get("/staff/patient/history/{phone}")
async def get_patient_history(phone: str, staff = Depends(verify_staff)):
    """Get complete history for a patient by phone number
    
    Returns all appointments, diagnostic orders, and pharmacy orders for the patient.
    Available to doctors and clinic staff.
    """
    role = staff.get("role")
    if role not in ["doctor", "doctor_pushpa", "doctor_amnion", "clinic_staff_pushpa", "clinic_staff_amnion", "super_admin"]:
        raise HTTPException(status_code=403, detail="Doctor or Clinic Staff access required")
    
    # Clean phone number
    phone = phone.strip().replace(" ", "").replace("-", "")
    
    # Get all appointments for this patient
    appointments = await db.appointments.find(
        {"patient_phone": {"$regex": phone}},
        {"_id": 0}
    ).sort([("date", -1), ("time", -1)]).to_list(100)
    
    # Get all diagnostic orders for this patient
    diagnostic_orders = await db.diagnostic_orders.find(
        {"patient_phone": {"$regex": phone}},
        {"_id": 0}
    ).sort([("created_at", -1)]).to_list(50)
    
    # Get all pharmacy orders for this patient
    pharmacy_orders = await db.pharmacy_orders.find(
        {"patient_phone": {"$regex": phone}},
        {"_id": 0}
    ).sort([("created_at", -1)]).to_list(50)
    
    # Get patient name from most recent record
    patient_name = None
    if appointments:
        patient_name = appointments[0].get("patient_name")
    elif diagnostic_orders:
        patient_name = diagnostic_orders[0].get("patient_name")
    elif pharmacy_orders:
        patient_name = pharmacy_orders[0].get("patient_name")
    
    # Separate past and upcoming appointments
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    past_appointments = [a for a in appointments if a.get("date", "") < today or a.get("status") == "Completed"]
    upcoming_appointments = [a for a in appointments if a.get("date", "") >= today and a.get("status") != "Completed"]
    
    return {
        "patient_phone": phone,
        "patient_name": patient_name,
        "summary": {
            "total_appointments": len(appointments),
            "past_appointments": len(past_appointments),
            "upcoming_appointments": len(upcoming_appointments),
            "total_diagnostic_orders": len(diagnostic_orders),
            "total_pharmacy_orders": len(pharmacy_orders)
        },
        "past_appointments": past_appointments,
        "upcoming_appointments": upcoming_appointments,
        "diagnostic_orders": diagnostic_orders,
        "pharmacy_orders": pharmacy_orders
    }

@api_router.put("/staff/appointments/{appointment_id}/complete")
async def mark_appointment_complete(appointment_id: str, notes: Optional[str] = None, staff = Depends(verify_staff)):
    """Mark appointment as completed (Doctor or Clinic Staff)"""
    role = staff.get("role")
    if role not in ["doctor", "doctor_pushpa", "doctor_amnion", "clinic_staff_pushpa", "clinic_staff_amnion", "super_admin"]:
        raise HTTPException(status_code=403, detail="Doctor or Clinic Staff access required")
    
    appointment = await db.appointments.find_one({"id": appointment_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # If doctor role, verify it's their appointment
    if role.startswith("doctor") and appointment.get("doctor") != staff.get("doctor_name"):
        raise HTTPException(status_code=403, detail="You can only complete your own appointments")
    
    # If clinic staff, verify it's their clinic
    if role == "clinic_staff_pushpa" and appointment.get("clinic") != "Pushpa Clinic":
        raise HTTPException(status_code=403, detail="You can only manage Pushpa Clinic appointments")
    if role == "clinic_staff_amnion" and appointment.get("clinic") != "Amnion Clinic":
        raise HTTPException(status_code=403, detail="You can only manage Amnion Clinic appointments")
    
    await db.appointments.update_one(
        {"id": appointment_id},
        {"$set": {
            "status": "Completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "completed_by": staff.get("name"),
            "completion_notes": notes
        }}
    )
    
    # Log action
    await db.audit_logs.insert_one({
        "action": "appointment_completed",
        "appointment_id": appointment_id,
        "staff_id": staff.get("sub"),
        "staff_name": staff.get("name"),
        "patient_name": appointment.get("patient_name"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    # Send completion email if patient has email
    if appointment.get("patient_email"):
        patient_html = f"""
        <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">Appointment Completed ✓</h1>
            </div>
            <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
                <p>Dear <strong>{appointment.get('patient_name')}</strong>,</p>
                <p>Your appointment has been successfully completed.</p>
                <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Doctor:</strong> {appointment.get('doctor')}</p>
                    <p><strong>Clinic:</strong> {appointment.get('clinic')}</p>
                    <p><strong>Date:</strong> {appointment.get('date')}</p>
                </div>
                <p>We appreciate your trust in Nevika Cura Healthcare.</p>
                <p style="color: #10b981; font-weight: bold;">Wishing you good health!</p>
                <p style="color: #64748b; font-size: 14px; margin-top: 20px;">Warm regards,<br>Nevika Cura Team</p>
            </div>
        </div>
        """
        await send_email_notification(
            f"Appointment Completed - {appointment.get('patient_name')}",
            f"Appointment completed for {appointment.get('patient_name')} with {appointment.get('doctor')}",
            patient_email=appointment.get("patient_email"),
            patient_subject="Appointment Completed – Thank You",
            patient_html=patient_html
        )
    
    logger.info(f"Appointment completed by {staff.get('name')}: {appointment.get('patient_name')}")
    
    return {"success": True, "status": "Completed", "message": "Appointment marked as completed"}

# ============ Pharmacy Staff Endpoints ============

@api_router.get("/staff/pharmacy/orders")
async def get_pharmacy_orders_for_staff(staff = Depends(verify_staff), status: Optional[str] = None, date: Optional[str] = None):
    """Get pharmacy orders for staff - supports date filtering"""
    if staff.get("role") not in ["pharmacy_staff", "super_admin"]:
        raise HTTPException(status_code=403, detail="Pharmacy staff access required")
    
    query = {}
    if status:
        query["status"] = status
    
    # Date filtering - filter by created_at date
    if date:
        # Match orders created on this date (created_at starts with the date string)
        query["created_at"] = {"$regex": f"^{date}"}
    
    orders = await db.pharmacy_orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    
    # Get order counts by date for calendar view
    all_orders = await db.pharmacy_orders.find({}, {"_id": 0, "created_at": 1, "status": 1}).to_list(1000)
    date_counts = {}
    for order in all_orders:
        order_date = order.get("created_at", "")[:10]
        if order_date:
            if order_date not in date_counts:
                date_counts[order_date] = {"total": 0, "pending": 0}
            date_counts[order_date]["total"] += 1
            if order.get("status") not in ["Delivered", "Cancelled"]:
                date_counts[order_date]["pending"] += 1
    
    return {"orders": orders, "statuses": PHARMACY_STATUSES, "date_counts": date_counts}

@api_router.post("/staff/pharmacy/orders/{order_id}/upload-bill")
async def upload_pharmacy_bill(order_id: str, file: UploadFile = File(...), staff = Depends(verify_staff)):
    """Upload bill/receipt for pharmacy order (required before Out for Delivery)"""
    if staff.get("role") not in ["pharmacy_staff", "super_admin"]:
        raise HTTPException(status_code=403, detail="Pharmacy staff access required")
    
    order = await db.pharmacy_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Upload file - save to static folder
    try:
        # Create uploads directory if not exists
        uploads_dir = ROOT_DIR / "uploads" / "bills"
        uploads_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        file_ext = Path(file.filename).suffix or ".pdf"
        unique_filename = f"bill_{order_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}{file_ext}"
        file_path = uploads_dir / unique_filename
        
        # Save file
        file_content = await file.read()
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        # Generate URL - will be served by static files mount
        file_url = f"/api/uploads/bills/{unique_filename}"
        
        # Update order with bill URL
        await db.pharmacy_orders.update_one(
            {"id": order_id},
            {"$set": {
                "bill_url": file_url,
                "bill_filename": file.filename,
                "bill_uploaded_at": datetime.now(timezone.utc).isoformat(),
                "bill_uploaded_by": staff.get("name")
            }}
        )
        
        logger.info(f"Bill uploaded for pharmacy order {order_id} by {staff.get('name')}")
        return {"success": True, "bill_url": file_url, "message": "Bill uploaded successfully"}
        
    except Exception as e:
        logger.error(f"Failed to upload bill: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload bill: {str(e)}")

@api_router.put("/staff/pharmacy/orders/{order_id}/status")
async def update_pharmacy_order_staff(order_id: str, update: StaffOrderStatusUpdate, staff = Depends(verify_staff)):
    """Update pharmacy order status (Pharmacy Staff only)"""
    if staff.get("role") not in ["pharmacy_staff", "super_admin"]:
        raise HTTPException(status_code=403, detail="Pharmacy staff access required")
    
    if update.status not in PHARMACY_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {PHARMACY_STATUSES}")
    
    order = await db.pharmacy_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # MANDATORY: Bill must be uploaded before "Out for Delivery"
    if update.status == "Out for Delivery" and not order.get("bill_url"):
        raise HTTPException(
            status_code=400, 
            detail="Bill/Receipt must be uploaded before marking order as 'Out for Delivery'"
        )
    
    status_entry = {
        "status": update.status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "notes": update.notes,
        "updated_by": staff.get("name")
    }
    
    await db.pharmacy_orders.update_one(
        {"id": order_id},
        {
            "$set": {"status": update.status},
            "$push": {"status_history": status_entry}
        }
    )
    
    # Send email notification with bill attachment link
    bill_section = ""
    if order.get('bill_url') and update.status in ['Out for Delivery', 'Delivered']:
        bill_section = f"""
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316;">
            <h3 style="color: #92400e; margin-top: 0;">📄 Your Bill/Receipt</h3>
            <p style="margin-bottom: 10px;">Your bill is attached below. Click to download:</p>
            <a href="{order.get('bill_url')}" style="display: inline-block; background: #f97316; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; font-weight: bold;">
                📥 Download Bill (PDF)
            </a>
        </div>
        """
    
    email_html = f"""
    <h2>📦 Pharmacy Order Status Update</h2>
    <p><strong>Order ID:</strong> {order_id[:8]}...</p>
    <p><strong>Patient:</strong> {order.get('patient_name')}</p>
    <p><strong>New Status:</strong> {update.status}</p>
    <p><strong>Updated by:</strong> {staff.get('name')}</p>
    """
    
    patient_html = f"""
    <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Order Update</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
            <p>Hello <strong>{order.get('patient_name')}</strong>,</p>
            <p>Your Orange Pharmacy order status has been updated to: <strong style="color: #f97316;">{update.status}</strong></p>
            
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Order ID:</strong> {order_id[:8]}...</p>
                <p style="margin: 5px 0;"><strong>Medicines:</strong> {', '.join([m.get('name', '') for m in order.get('medicines', [])])}</p>
            </div>
            
            {f"<p><strong>Notes:</strong> {update.notes}</p>" if update.notes else ""}
            
            {bill_section}
            
            <p style="color: #64748b; font-size: 14px; margin-top: 20px;">Thank you for choosing Orange Pharmacy!</p>
        </div>
    </div>
    """
    
    await send_email_notification(
        f"Pharmacy Order Update - {update.status}",
        email_html,
        patient_email=order.get('patient_email'),
        patient_subject=f"Your Order is {update.status} - Orange Pharmacy" + (" (Bill Attached)" if order.get('bill_url') and update.status in ['Out for Delivery', 'Delivered'] else ""),
        patient_html=patient_html
    )
    
    # Send push notification
    if order.get('user_id'):
        await send_push_notification(
            user_id=order.get('user_id'),
            title=f"Order Update: {update.status}",
            body=f"Your pharmacy order is now: {update.status}",
            url="/profile"
        )
    
    logger.info(f"Pharmacy order {order_id} updated to {update.status} by {staff.get('name')}")
    
    return {"success": True, "status": update.status}

# ============ Diagnostics Staff Endpoints ============

@api_router.get("/staff/diagnostic/orders")
async def get_diagnostic_orders_for_staff(staff = Depends(verify_staff), status: Optional[str] = None, date: Optional[str] = None):
    """Get diagnostic orders for staff - supports date filtering"""
    if staff.get("role") not in ["diagnostics_staff", "super_admin"]:
        raise HTTPException(status_code=403, detail="Diagnostics staff access required")
    
    query = {}
    if status:
        query["status"] = status
    
    # Date filtering - filter by preferred_date or created_at
    if date:
        query["$or"] = [
            {"preferred_date": date},
            {"created_at": {"$regex": f"^{date}"}}
        ]
    
    # Get orders from test_orders collection
    test_orders = await db.test_orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    
    # Also get orders from diagnostic_orders collection (excluding service-linked ones)
    diag_query = {**query, "linked_appointment_id": {"$exists": False}}
    diag_orders = await db.diagnostic_orders.find(diag_query, {"_id": 0}).sort("created_at", -1).to_list(200)
    
    # Combine and sort by created_at
    all_orders = test_orders + diag_orders
    all_orders.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    # Get order counts by date for calendar view
    all_test_orders = await db.test_orders.find({}, {"_id": 0, "preferred_date": 1, "created_at": 1, "status": 1}).to_list(1000)
    all_diag_orders = await db.diagnostic_orders.find({"linked_appointment_id": {"$exists": False}}, {"_id": 0, "preferred_date": 1, "created_at": 1, "status": 1}).to_list(1000)
    
    date_counts = {}
    for order in all_test_orders + all_diag_orders:
        order_date = order.get("preferred_date") or order.get("created_at", "")[:10]
        if order_date:
            if order_date not in date_counts:
                date_counts[order_date] = {"total": 0, "pending": 0}
            date_counts[order_date]["total"] += 1
            if order.get("status") not in ["Reports Generated", "Completed", "Cancelled"]:
                date_counts[order_date]["pending"] += 1
    
    return {"orders": all_orders, "statuses": DIAGNOSTIC_STATUSES, "date_counts": date_counts}

@api_router.post("/staff/diagnostic/orders")
async def create_diagnostic_order_by_staff(order_data: StaffDiagnosticOrderCreate, staff = Depends(verify_staff)):
    """Create a new diagnostic order (Diagnostics Staff only)"""
    if staff.get("role") not in ["diagnostics_staff", "super_admin"]:
        raise HTTPException(status_code=403, detail="Diagnostics staff access required")
    
    if not order_data.tests or len(order_data.tests) == 0:
        raise HTTPException(status_code=400, detail="At least one test must be selected")
    
    order = {
        "id": str(uuid.uuid4()),
        "user_id": None,  # Walk-in order, no user account
        "tests": order_data.tests,
        "patient_name": order_data.patient_name,
        "patient_phone": order_data.patient_phone,
        "patient_email": order_data.patient_email,
        "age": order_data.age,
        "sex": order_data.sex,
        "preferred_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "status": "Test Booked",
        "notes": order_data.notes,
        "created_by": staff.get("name"),
        "created_by_id": staff.get("sub"),
        "booking_type": "walk_in",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.diagnostic_orders.insert_one(order)
    
    # Log action
    await db.audit_logs.insert_one({
        "action": "DIAGNOSTIC_ORDER_CREATED",
        "order_id": order["id"],
        "staff_id": staff.get("sub"),
        "staff_name": staff.get("name"),
        "patient_name": order_data.patient_name,
        "tests": order_data.tests,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    # Send confirmation email if patient email is provided
    if order_data.patient_email:
        tests_list = ', '.join(order_data.tests)
        patient_html = f"""
        <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">Test Booking Confirmed 🔬</h1>
            </div>
            <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
                <p>Hello <strong>{order_data.patient_name}</strong>,</p>
                <p>Your diagnostic tests have been booked at Proton Diagnostics.</p>
                
                <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
                    <p style="margin: 5px 0;"><strong>Order ID:</strong> {order['id'][:8]}...</p>
                    <p style="margin: 5px 0;"><strong>Tests:</strong> {tests_list}</p>
                    {f"<p style='margin: 5px 0;'><strong>Age/Sex:</strong> {order_data.age or 'N/A'} / {order_data.sex or 'N/A'}</p>" if order_data.age or order_data.sex else ""}
                    <p style="margin: 5px 0;"><strong>Status:</strong> Test Booked</p>
                </div>
                
                <p>You will receive your reports via email once they are ready.</p>
                <p style="color: #64748b; font-size: 14px; margin-top: 20px;">Thank you for choosing Proton Diagnostics!</p>
            </div>
        </div>
        """
        
        await send_email_notification(
            f"New Diagnostic Order Created - {order_data.patient_name}",
            f"Order created by {staff.get('name')}: {tests_list}",
            patient_email=order_data.patient_email,
            patient_subject="Test Booking Confirmed - Proton Diagnostics",
            patient_html=patient_html
        )
    
    logger.info(f"Diagnostic order created by {staff.get('name')}: {order_data.patient_name} - {order_data.tests}")
    
    return {
        "success": True,
        "order": {k: v for k, v in order.items() if k != "_id"},
        "message": "Diagnostic order created successfully"
    }

@api_router.post("/staff/diagnostic/orders/{order_id}/upload-report")
async def upload_diagnostic_report(order_id: str, file: UploadFile = File(...), staff = Depends(verify_staff)):
    """Upload report for diagnostic order (required before Reports Generated)"""
    if staff.get("role") not in ["diagnostics_staff", "super_admin"]:
        raise HTTPException(status_code=403, detail="Diagnostics staff access required")
    
    # Try to find in test_orders first
    order = await db.test_orders.find_one({"id": order_id})
    collection = db.test_orders
    
    # If not found, try diagnostic_orders
    if not order:
        order = await db.diagnostic_orders.find_one({"id": order_id})
        collection = db.diagnostic_orders
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Upload file - save to static folder
    try:
        # Create uploads directory if not exists
        uploads_dir = ROOT_DIR / "uploads" / "reports"
        uploads_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        file_ext = Path(file.filename).suffix or ".pdf"
        unique_filename = f"report_{order_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}{file_ext}"
        file_path = uploads_dir / unique_filename
        
        # Save file
        file_content = await file.read()
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        # Generate URL - will be served by static files mount
        file_url = f"/api/uploads/reports/{unique_filename}"
        
        # Update order with report URL
        await collection.update_one(
            {"id": order_id},
            {"$set": {
                "report_url": file_url,
                "report_filename": file.filename,
                "report_uploaded_at": datetime.now(timezone.utc).isoformat(),
                "report_uploaded_by": staff.get("name")
            }}
        )
        
        logger.info(f"Report uploaded for diagnostic order {order_id} by {staff.get('name')}")
        return {"success": True, "report_url": file_url, "message": "Report uploaded successfully"}
        
    except Exception as e:
        logger.error(f"Failed to upload report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload report: {str(e)}")

@api_router.put("/staff/diagnostic/orders/{order_id}/status")
async def update_diagnostic_order_staff(order_id: str, update: StaffOrderStatusUpdate, staff = Depends(verify_staff)):
    """Update diagnostic order status (Diagnostics Staff only)"""
    if staff.get("role") not in ["diagnostics_staff", "super_admin"]:
        raise HTTPException(status_code=403, detail="Diagnostics staff access required")
    
    if update.status not in DIAGNOSTIC_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {DIAGNOSTIC_STATUSES}")
    
    # Try to find in test_orders first
    order = await db.test_orders.find_one({"id": order_id}, {"_id": 0})
    collection = db.test_orders
    
    # If not found, try diagnostic_orders
    if not order:
        order = await db.diagnostic_orders.find_one({"id": order_id}, {"_id": 0})
        collection = db.diagnostic_orders
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # MANDATORY: Report must be uploaded before "Reports Generated"
    if update.status == "Reports Generated" and not order.get("report_url"):
        raise HTTPException(
            status_code=400, 
            detail="Report must be uploaded before marking order as 'Reports Generated'"
        )
    
    status_entry = {
        "status": update.status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "notes": update.notes,
        "updated_by": staff.get("name")
    }
    
    await collection.update_one(
        {"id": order_id},
        {
            "$set": {"status": update.status},
            "$push": {"status_history": status_entry}
        }
    )
    
    # Build report section for email
    report_section = ""
    if order.get('report_url') and update.status == "Reports Generated":
        report_section = f"""
        <div style="background: #dcfce7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
            <h3 style="color: #166534; margin-top: 0;">📋 Your Test Reports Are Ready!</h3>
            <p style="margin-bottom: 10px;">Your diagnostic reports are now available. Click below to download:</p>
            <a href="{order.get('report_url')}" style="display: inline-block; background: #8b5cf6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; font-weight: bold;">
                📥 Download Report (PDF)
            </a>
        </div>
        """
    
    # Send email notification with report attachment link
    email_html = f"""
    <h2>🔬 Diagnostic Order Status Update</h2>
    <p><strong>Order ID:</strong> {order_id[:8]}...</p>
    <p><strong>Patient:</strong> {order.get('patient_name')}</p>
    <p><strong>New Status:</strong> {update.status}</p>
    <p><strong>Updated by:</strong> {staff.get('name')}</p>
    """
    
    # Get tests list
    tests_list = order.get('tests', [])
    if isinstance(tests_list, list):
        tests_display = ', '.join(tests_list[:5]) + ('...' if len(tests_list) > 5 else '')
    else:
        tests_display = str(tests_list)
    
    patient_html = f"""
    <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Test Update</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
            <p>Hello <strong>{order.get('patient_name')}</strong>,</p>
            <p>Your Proton Diagnostics test status has been updated to: <strong style="color: #8b5cf6;">{update.status}</strong></p>
            
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Order ID:</strong> {order_id[:8]}...</p>
                <p style="margin: 5px 0;"><strong>Tests:</strong> {tests_display}</p>
                {f"<p style='margin: 5px 0;'><strong>Age/Sex:</strong> {order.get('age', 'N/A')} / {order.get('sex', 'N/A')}</p>" if order.get('age') or order.get('sex') else ""}
            </div>
            
            {f"<p><strong>Notes:</strong> {update.notes}</p>" if update.notes else ""}
            
            {report_section}
            
            <p style="color: #64748b; font-size: 14px; margin-top: 20px;">Thank you for choosing Proton Diagnostics!</p>
        </div>
    </div>
    """
    
    await send_email_notification(
        f"Diagnostic Order Update - {update.status}",
        email_html,
        patient_email=order.get('patient_email'),
        patient_subject=f"Test Status: {update.status} - Proton Diagnostics" + (" (Report Attached)" if update.status == "Reports Generated" and order.get('report_url') else ""),
        patient_html=patient_html
    )
    
    # Send push notification
    if order.get('user_id'):
        await send_push_notification(
            user_id=order.get('user_id'),
            title=f"Test Update: {update.status}",
            body=f"Your test reports are ready!" if update.status == "Reports Generated" else f"Your diagnostic order is now: {update.status}",
            url="/profile"
        )
    
    logger.info(f"Diagnostic order {order_id} updated to {update.status} by {staff.get('name')}")
    
    return {"success": True, "status": update.status}

# ============ Clinic Staff - Get Today's Appointments ============

@api_router.get("/staff/clinic/appointments")
async def get_clinic_appointments(staff = Depends(verify_staff), date: Optional[str] = None, status: Optional[str] = None):
    """Get appointments for clinic staff - Emergency appointments pinned on top"""
    role = staff.get("role")
    if role not in ["clinic_staff_pushpa", "clinic_staff_amnion", "super_admin"]:
        raise HTTPException(status_code=403, detail="Clinic staff access required")
    
    query = {}
    clinic = None
    
    # Filter by clinic based on role
    if role == "clinic_staff_pushpa":
        query["clinic"] = "Pushpa Clinic"
        clinic = "Pushpa Clinic"
    elif role == "clinic_staff_amnion":
        query["clinic"] = "Amnion Clinic"
        clinic = "Amnion Clinic"
    
    if date:
        query["date"] = date
    if status:
        query["status"] = status
    
    # Get all appointments
    all_appointments = await db.appointments.find(query, {"_id": 0}).to_list(200)
    
    # Separate emergency and normal appointments
    emergency_appts = [a for a in all_appointments if a.get("appointment_type") == "EMERGENCY"]
    normal_appts = [a for a in all_appointments if a.get("appointment_type") != "EMERGENCY"]
    
    # Sort normal appointments by time
    normal_appts.sort(key=lambda x: (x.get("date", ""), x.get("time") or "99:99"))
    
    # Emergency appointments pinned on top
    appointments = emergency_appts + normal_appts
    
    # Get emergency counts by doctor for today
    emergency_counts = {}
    target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if clinic:
        doctors = CLINICS.get(clinic, [])
        for doctor in doctors:
            count = await db.appointments.count_documents({
                "doctor": doctor,
                "date": target_date,
                "appointment_type": "EMERGENCY",
                "status": {"$ne": "Cancelled"}
            })
            emergency_counts[doctor] = {
                "count": count,
                "max": MAX_EMERGENCY_PER_DOCTOR_PER_DAY,
                "remaining": MAX_EMERGENCY_PER_DOCTOR_PER_DAY - count
            }
    
    return {
        "appointments": appointments, 
        "statuses": APPOINTMENT_STATUSES, 
        "clinics": CLINICS,
        "emergency_counts": emergency_counts
    }

@api_router.get("/admin/stats")
async def get_admin_stats(admin = Depends(verify_admin)):
    """Get admin dashboard statistics"""
    total_users = await db.users.count_documents({})
    total_appointments = await db.appointments.count_documents({})
    total_diagnostics = await db.diagnostic_orders.count_documents({})
    total_pharmacy = await db.pharmacy_orders.count_documents({})
    
    return {
        "total_medicines": len(MEDICINE_INVENTORY),
        "total_users": total_users,
        "total_appointments": total_appointments,
        "total_diagnostic_orders": total_diagnostics,
        "total_pharmacy_orders": total_pharmacy
    }

@api_router.post("/admin/send-credentials-email")
async def send_credentials_email(admin = Depends(verify_admin)):
    """Send all staff credentials to admin email"""
    
    # All credentials
    credentials_html = """
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Nevika Cura - Staff Credentials</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
            
            <h2 style="color: #0d9488; border-bottom: 2px solid #0d9488; padding-bottom: 10px;">🔐 Admin Access</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr style="background: #f1f5f9;">
                    <td style="padding: 12px; border: 1px solid #e2e8f0;"><strong>Portal URL</strong></td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">/admin</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;"><strong>Password</strong></td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;">nevikacura2026</td>
                </tr>
            </table>
            
            <h2 style="color: #3b82f6; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">👨‍⚕️ DiaGyn Doctors</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr style="background: #dbeafe;">
                    <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Doctor</th>
                    <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Clinic</th>
                    <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Username</th>
                    <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Password</th>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">Dr. Neha Patel</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">Pushpa Clinic</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace;">doc_pushpa_01</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;">Nevika@2026D</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">Dr. Vikas Jha</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">Amnion Clinic</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace;">doc_amnion_01</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;">Nevika@2026D</td>
                </tr>
            </table>
            
            <h2 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 10px;">👩‍💼 DiaGyn Clinic Staff</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr style="background: #d1fae5;">
                    <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Staff</th>
                    <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Clinic</th>
                    <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Username</th>
                    <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Password</th>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">Reception Staff</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">Pushpa Clinic</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace;">staff_pushpa</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;">Nevika@2026C</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">Reception Staff</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">Amnion Clinic</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace;">staff_amnion</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;">Nevika@2026C</td>
                </tr>
            </table>
            
            <h2 style="color: #f97316; border-bottom: 2px solid #f97316; padding-bottom: 10px;">💊 Orange Pharmacy Staff</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr style="background: #ffedd5;">
                    <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Staff</th>
                    <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Username</th>
                    <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Password</th>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">Pharmacy Team</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace;">staff_pharmacy</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;">Nevika@2026P</td>
                </tr>
            </table>
            
            <h2 style="color: #8b5cf6; border-bottom: 2px solid #8b5cf6; padding-bottom: 10px;">🔬 Proton Diagnostics Staff</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr style="background: #ede9fe;">
                    <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Staff</th>
                    <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Username</th>
                    <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left;">Password</th>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">Lab Team</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace;">staff_proton</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;">Nevika@2026L</td>
                </tr>
            </table>
            
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                <h3 style="color: #166534; margin-top: 0;">📱 Staff Portal Access</h3>
                <p style="margin-bottom: 0;"><strong>URL:</strong> <code>/staff</code></p>
                <p style="margin-bottom: 0; color: #166534;">All staff members remain logged in until they manually logout (30-day session).</p>
            </div>
            
            <p style="color: #64748b; font-size: 12px; margin-top: 30px; text-align: center;">
                This email was sent from Nevika Cura Healthcare System.<br>
                Generated on: """ + datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC') + """
            </p>
        </div>
    </div>
    """
    
    try:
        # Send email to admin
        if RESEND_API_KEY:
            params = {
                "from": SENDER_EMAIL,
                "to": [NOTIFICATION_EMAIL],
                "subject": "Nevika Cura - All Staff Login Credentials",
                "html": credentials_html
            }
            email_result = await asyncio.to_thread(resend.Emails.send, params)
            logger.info(f"Credentials email sent: {email_result.get('id')}")
            return {"success": True, "message": f"Credentials sent to {NOTIFICATION_EMAIL}", "email_id": email_result.get('id')}
        else:
            return {"success": False, "message": "Email not configured"}
    except Exception as e:
        logger.error(f"Failed to send credentials email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

@api_router.get("/admin/orders/recent")
async def get_recent_orders(admin = Depends(verify_admin), limit: int = 20):
    """Get recent orders across all services"""
    appointments = await db.appointments.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    diagnostics = await db.diagnostic_orders.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    pharmacy = await db.pharmacy_orders.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {
        "appointments": appointments,
        "diagnostic_orders": diagnostics,
        "pharmacy_orders": pharmacy
    }

# ============ Diagnostic Tests Management ============

# Default diagnostic tests organized by category
DIAGNOSTIC_TESTS = {
    "imaging": {
        "ecg": ["ECG (Electrocardiogram)"],
        "sonography": [
            "Early Scan", "NT Scan (Nuchal Translucency)", "Growth Scan",
            "USG Pelvis", "Follicular Monitoring"
        ]
    },
    "pathology": {
        "blood": [
            # Basic Blood Tests
            "CBC (Complete Blood Count)", "Blood Group", "Hemoglobin (Hb)", "ESR",
            # Sugar Tests
            "FBS (Fasting Blood Sugar)", "PPBS", "RBS", "HbA1c", "OGTT - 3 Sample",
            # Kidney Function
            "Creatinine", "Blood Urea", "RFT (Renal Function Test)", "Uric Acid",
            "Serum Electrolytes", "UPCR",
            # Liver Function
            "LFT (Liver Function Test)", "SGPT (ALT)", "SGOT (AST)", "Bilirubin Total",
            "Serum Amylase", "Lipase", "LDH",
            # Lipid Profile
            "Lipid Profile", "Total Cholesterol", "Triglycerides", "HDL", "LDL",
            # Thyroid Tests
            "TSH", "Thyroid Profile - Free", "Thyroid Profile - Total", "T3", "T4",
            # Vitamins & Minerals
            "Vitamin D", "Vitamin B12", "Iron Studies", "Calcium", "G6PD",
            # Inflammatory Markers
            "CRP (C-Reactive Protein)", "ESR",
            # Hormonal Tests
            "AMH (Anti-Mullerian Hormone)", "Serum Testosterone", "Serum PSA",
            "Beta HCG", "Hormonal Basic", "Hormonal Advance",
            # Tumor Markers
            "Alpha Fetoprotein", "CA 19.9",
            # Pregnancy Markers
            "Dual / Double Marker", "Quadruple Marker", "ANC (Ante Natal Profile)",
            # Arthritis & Autoimmune
            "Arthritis Basic Panel", "Anti CCP", "RA Factor",
            # Infectious Disease
            "HIV - Rapid", "HCV - Rapid", "VDRL / RPR", "H3 Viral Marker",
            "MP Antigen (Malaria)", "Blood Culture & Sensitivity",
            # Coagulation
            "PT INR",
            # Health Packages
            "Diabetes Basic", "Diabetes Screening", "Diabetes Advance"
        ],
        "urine": [
            "Urine Routine & Microscopy", "Urine Culture & Sensitivity", "Urine Albumin"
        ],
        "stool": [
            "Stool Routine & Microscopy", "Stool Occult Blood"
        ]
    }
}

# Diagnostic test prices (from Lupin Diagnostics rate list)
DIAGNOSTIC_TEST_PRICES = {
    "Alpha Fetoprotein": 650, "AMH (Anti-Mullerian Hormone)": 1650, "ANC (Ante Natal Profile)": 1950,
    "Anti CCP": 1250, "Arthritis Basic Panel": 1650, "Beta HCG": 680,
    "Blood Culture & Sensitivity": 1000, "Blood Group": 150, "CA 19.9": 850,
    "CBC (Complete Blood Count)": 200, "Creatinine": 180, "CRP (C-Reactive Protein)": 450,
    "Diabetes Advance": 650, "Diabetes Basic": 150, "Diabetes Screening": 250,
    "Dual / Double Marker": 2000, "FBS (Fasting Blood Sugar)": 75, "G6PD": 470,
    "H3 Viral Marker": 1200, "HbA1c": 400, "HCV - Rapid": 600, "HIV - Rapid": 450,
    "Hormonal Advance": 1200, "Hormonal Basic": 800, "LDH": 550,
    "LFT (Liver Function Test)": 450, "Lipase": 600, "Lipid Profile": 500,
    "MP Antigen (Malaria)": 650, "OGTT - 3 Sample": 450, "PPBS": 75, "PT INR": 450,
    "Quadruple Marker": 2600, "RBS": 75, "RFT (Renal Function Test)": 600,
    "Serum Amylase": 550, "Serum Electrolytes": 400, "Serum PSA": 850,
    "Serum Testosterone": 500, "SGOT (AST)": 180, "SGPT (ALT)": 180,
    "Thyroid Profile - Free": 550, "Thyroid Profile - Total": 350, "TSH": 200,
    "UPCR": 680, "Uric Acid": 200, "Urine Culture & Sensitivity": 1000,
    "Urine Routine & Microscopy": 150, "Vitamin B12": 500, "Vitamin D": 850,
    "VDRL / RPR": 200, "ECG (Electrocardiogram)": 300, "Early Scan": 800,
    "NT Scan (Nuchal Translucency)": 1500, "Growth Scan": 1000, "USG Pelvis": 700,
    "Follicular Monitoring": 500, "Home Visit": 100
}

class DiagnosticTestAdd(BaseModel):
    name: str
    category: str  # imaging or pathology
    subcategory: str  # ecg, sonography, blood, urine, stool

@api_router.get("/admin/diagnostic-tests")
async def get_diagnostic_tests(admin = Depends(verify_admin)):
    """Get all diagnostic tests"""
    # Check if custom tests exist in database
    custom_tests = await db.diagnostic_tests.find_one({"type": "custom"}, {"_id": 0})
    if custom_tests:
        return {"tests": custom_tests.get("tests", DIAGNOSTIC_TESTS)}
    return {"tests": DIAGNOSTIC_TESTS}

@api_router.get("/staff/diagnostic-tests")
async def get_diagnostic_tests_for_staff(staff = Depends(verify_staff)):
    """Get all diagnostic tests for staff - accessible by all staff roles for assigning tests to patients"""
    # All staff can access diagnostic tests (clinic staff needs it for add-on services)
    
    # Check if custom tests exist in database
    custom_tests = await db.diagnostic_tests.find_one({"type": "custom"}, {"_id": 0})
    if custom_tests:
        return {"tests": custom_tests.get("tests", DIAGNOSTIC_TESTS), "prices": DIAGNOSTIC_TEST_PRICES}
    return {"tests": DIAGNOSTIC_TESTS, "prices": DIAGNOSTIC_TEST_PRICES}

@api_router.post("/admin/diagnostic-tests/add")
async def add_diagnostic_test(test: DiagnosticTestAdd, admin = Depends(verify_admin)):
    """Add a new diagnostic test"""
    # Get current tests
    custom_tests = await db.diagnostic_tests.find_one({"type": "custom"})
    if custom_tests:
        tests = custom_tests.get("tests", DIAGNOSTIC_TESTS.copy())
    else:
        tests = DIAGNOSTIC_TESTS.copy()
    
    # Validate category and subcategory
    if test.category not in tests:
        raise HTTPException(status_code=400, detail=f"Invalid category: {test.category}")
    if test.subcategory not in tests[test.category]:
        raise HTTPException(status_code=400, detail=f"Invalid subcategory: {test.subcategory}")
    
    # Check if test already exists
    if test.name in tests[test.category][test.subcategory]:
        raise HTTPException(status_code=400, detail="Test already exists")
    
    # Add test
    tests[test.category][test.subcategory].append(test.name)
    tests[test.category][test.subcategory].sort()
    
    # Save to database
    await db.diagnostic_tests.update_one(
        {"type": "custom"},
        {"$set": {"tests": tests}},
        upsert=True
    )
    
    return {"success": True, "message": f"Test '{test.name}' added successfully"}

@api_router.delete("/admin/diagnostic-tests/{category}/{subcategory}/{test_name}")
async def delete_diagnostic_test(category: str, subcategory: str, test_name: str, admin = Depends(verify_admin)):
    """Delete a diagnostic test"""
    custom_tests = await db.diagnostic_tests.find_one({"type": "custom"})
    if custom_tests:
        tests = custom_tests.get("tests", DIAGNOSTIC_TESTS.copy())
    else:
        tests = DIAGNOSTIC_TESTS.copy()
    
    if category not in tests or subcategory not in tests[category]:
        raise HTTPException(status_code=404, detail="Category or subcategory not found")
    
    # URL decode the test name
    from urllib.parse import unquote
    test_name = unquote(test_name)
    
    if test_name not in tests[category][subcategory]:
        raise HTTPException(status_code=404, detail="Test not found")
    
    tests[category][subcategory].remove(test_name)
    
    await db.diagnostic_tests.update_one(
        {"type": "custom"},
        {"$set": {"tests": tests}},
        upsert=True
    )
    
    return {"success": True, "message": f"Test '{test_name}' deleted successfully"}

# ============ WhatsApp Notifications Management ============

@api_router.get("/admin/pending-whatsapp")
async def get_pending_whatsapp(admin = Depends(verify_admin)):
    """Get pending WhatsApp notifications that failed to send"""
    pending = await db.pending_whatsapp.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"pending": pending}

@api_router.delete("/admin/pending-whatsapp/{notification_id}")
async def delete_pending_whatsapp(notification_id: str, admin = Depends(verify_admin)):
    """Mark a pending WhatsApp notification as handled"""
    await db.pending_whatsapp.delete_one({"id": notification_id})
    return {"success": True}

@api_router.get("/diagnostic-tests")
async def get_public_diagnostic_tests():
    """Get diagnostic tests for public use (frontend)"""
    custom_tests = await db.diagnostic_tests.find_one({"type": "custom"}, {"_id": 0})
    if custom_tests:
        return {"tests": custom_tests.get("tests", DIAGNOSTIC_TESTS)}
    return {"tests": DIAGNOSTIC_TESTS}

# ============ Doctor Leave / Appointment Cancellation ============

class CancelAppointmentsRequest(BaseModel):
    doctor: str
    clinic: str
    cancel_type: str  # 'session', 'day', 'range'
    date: Optional[str] = None  # For single day or session
    time: Optional[str] = None  # For single session only
    start_date: Optional[str] = None  # For range
    end_date: Optional[str] = None  # For range
    reason: str = "Doctor on leave"

@api_router.get("/admin/doctors")
async def get_doctors(admin = Depends(verify_admin)):
    """Get list of doctors with their appointments"""
    # Get unique doctors from appointments
    pipeline = [
        {"$group": {
            "_id": {"doctor": "$doctor", "clinic": "$clinic"},
            "appointment_count": {"$sum": 1}
        }},
        {"$sort": {"_id.doctor": 1}}
    ]
    doctors_raw = await db.appointments.aggregate(pipeline).to_list(100)
    
    doctors = []
    for d in doctors_raw:
        doctors.append({
            "doctor": d["_id"]["doctor"],
            "clinic": d["_id"]["clinic"],
            "appointment_count": d["appointment_count"]
        })
    
    # Add default doctors if no appointments exist
    if not doctors:
        doctors = [
            {"doctor": "Dr. Vikas Jha", "clinic": "Nevika Clinic", "appointment_count": 0},
            {"doctor": "Dr. Vikas Jha", "clinic": "Nevika Clinic", "appointment_count": 0}
        ]
    
    return {"doctors": doctors}

@api_router.get("/admin/appointments")
async def get_admin_appointments(
    admin = Depends(verify_admin),
    doctor: Optional[str] = None,
    date: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get appointments for admin with filters"""
    query = {}
    
    if doctor:
        query["doctor"] = doctor
    
    if date:
        query["date"] = date
    elif start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    
    appointments = await db.appointments.find(query, {"_id": 0}).sort([("date", 1), ("time", 1)]).to_list(500)
    return {"appointments": appointments, "total": len(appointments)}

@api_router.post("/admin/appointments/cancel")
async def cancel_appointments(request: CancelAppointmentsRequest, admin = Depends(verify_admin)):
    """Cancel appointments for a doctor (session, day, or date range)"""
    query = {
        "doctor": request.doctor,
        "clinic": request.clinic
    }
    
    if request.cancel_type == "session":
        if not request.date or not request.time:
            raise HTTPException(status_code=400, detail="Date and time required for session cancellation")
        query["date"] = request.date
        query["time"] = request.time
        
    elif request.cancel_type == "day":
        if not request.date:
            raise HTTPException(status_code=400, detail="Date required for day cancellation")
        query["date"] = request.date
        
    elif request.cancel_type == "range":
        if not request.start_date or not request.end_date:
            raise HTTPException(status_code=400, detail="Start and end dates required for range cancellation")
        query["date"] = {"$gte": request.start_date, "$lte": request.end_date}
    else:
        raise HTTPException(status_code=400, detail="Invalid cancel_type. Use 'session', 'day', or 'range'")
    
    # Get appointments to be cancelled
    appointments_to_cancel = await db.appointments.find(query, {"_id": 0}).to_list(500)
    
    if not appointments_to_cancel:
        return {
            "success": True,
            "cancelled_count": 0,
            "message": "No appointments found matching the criteria"
        }
    
    # Update appointments status to cancelled
    result = await db.appointments.update_many(
        query,
        {"$set": {"status": "cancelled", "cancellation_reason": request.reason}}
    )
    
    # Send email notification about cancellations
    cancelled_list = "<br>".join([
        f"• {a['patient_name']} - {a['date']} at {a['time']}" 
        for a in appointments_to_cancel[:20]  # Limit to first 20 in email
    ])
    
    email_html = f"""
    <h2>⚠️ Appointments Cancelled - {request.doctor}</h2>
    <p><strong>Reason:</strong> {request.reason}</p>
    <p><strong>Clinic:</strong> {request.clinic}</p>
    <p><strong>Cancel Type:</strong> {request.cancel_type}</p>
    <p><strong>Total Cancelled:</strong> {result.modified_count}</p>
    <h3>Affected Patients:</h3>
    <p>{cancelled_list}</p>
    {f"<p><em>...and {len(appointments_to_cancel) - 20} more</em></p>" if len(appointments_to_cancel) > 20 else ""}
    """
    await send_email_notification(f"Appointments Cancelled - {request.doctor}", email_html)
    
    # Send cancellation emails to patients who have email
    for appt in appointments_to_cancel:
        if appt.get('patient_email'):
            patient_cancel_html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">Appointment Cancelled ⚠️</h1>
                </div>
                <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
                    <p style="font-size: 18px;">Hello <strong>{appt.get('patient_name')}</strong>,</p>
                    <p>We regret to inform you that your appointment has been cancelled.</p>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
                        <h3 style="color: #ef4444; margin-top: 0;">Cancelled Appointment</h3>
                        <p><strong>Doctor:</strong> {request.doctor}</p>
                        <p><strong>Clinic:</strong> {request.clinic}</p>
                        <p><strong>Date:</strong> {appt.get('date')}</p>
                        <p><strong>Time:</strong> {appt.get('time')}</p>
                        <p><strong>Reason:</strong> {request.reason}</p>
                    </div>
                    
                    <p>Please reschedule your appointment at your earliest convenience.</p>
                    
                    <div style="text-align: center; margin-top: 30px; padding: 15px; background: #fee2e2; border-radius: 8px;">
                        <p style="margin: 0; color: #b91c1c;"><strong>Need assistance?</strong></p>
                        <p style="margin: 5px 0 0 0; color: #dc2626;">Contact us: 7039020020</p>
                    </div>
                </div>
            </div>
            """
            await send_email_notification(
                f"Appointment Cancelled - {request.doctor}",
                email_html,
                patient_email=appt.get('patient_email'),
                patient_subject=f"Your Appointment on {appt.get('date')} has been Cancelled",
                patient_html=patient_cancel_html
            )
    
    return {
        "success": True,
        "cancelled_count": result.modified_count,
        "message": f"Successfully cancelled {result.modified_count} appointment(s)",
        "cancelled_appointments": appointments_to_cancel
    }

@api_router.delete("/admin/appointments/{appointment_id}")
async def delete_single_appointment(appointment_id: str, admin = Depends(verify_admin)):
    """Delete a single appointment"""
    result = await db.appointments.delete_one({"id": appointment_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    return {"success": True, "message": "Appointment deleted successfully"}

# ============ Order Tracking & Status Updates ============

class OrderStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

@api_router.get("/admin/pharmacy/orders")
async def get_admin_pharmacy_orders(admin = Depends(verify_admin), status: Optional[str] = None, limit: int = 50):
    """Get pharmacy orders for admin with optional status filter"""
    query = {}
    if status:
        query["status"] = status
    
    orders = await db.pharmacy_orders.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Add status history if not present
    for order in orders:
        if "status_history" not in order:
            order["status_history"] = []
    
    return {"orders": orders, "total": len(orders), "statuses": PHARMACY_STATUSES}

@api_router.put("/admin/pharmacy/orders/{order_id}/status")
async def update_pharmacy_order_status(order_id: str, update: OrderStatusUpdate, admin = Depends(verify_admin)):
    """Update pharmacy order status"""
    if update.status not in PHARMACY_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {PHARMACY_STATUSES}")
    
    # Get current order
    order = await db.pharmacy_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Create status history entry
    status_entry = {
        "status": update.status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "notes": update.notes
    }
    
    # Update order
    result = await db.pharmacy_orders.update_one(
        {"id": order_id},
        {
            "$set": {"status": update.status},
            "$push": {"status_history": status_entry}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to update order status")
    
    # Send email notification for status update
    email_html = f"""
    <h2>📦 Pharmacy Order Status Update</h2>
    <p><strong>Order ID:</strong> {order_id[:8]}...</p>
    <p><strong>Patient:</strong> {order.get('patient_name')}</p>
    <p><strong>Phone:</strong> {order.get('patient_phone')}</p>
    <p><strong>New Status:</strong> <span style="color: #10b981; font-weight: bold;">{update.status}</span></p>
    {f"<p><strong>Notes:</strong> {update.notes}</p>" if update.notes else ""}
    <p><strong>Updated at:</strong> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC</p>
    """
    
    # Patient status update email
    status_colors = {
        "Order Booked": "#f59e0b",
        "Packing": "#3b82f6",
        "Out for Delivery": "#8b5cf6",
        "Delivered": "#10b981"
    }
    status_color = status_colors.get(update.status, "#6b7280")
    status_icons = {
        "Order Booked": "📋",
        "Packing": "📦",
        "Out for Delivery": "🚚",
        "Delivered": "✅"
    }
    status_icon = status_icons.get(update.status, "📋")
    
    patient_status_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Order Update {status_icon}</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px;">Hello <strong>{order.get('patient_name')}</strong>,</p>
            <p>Your Orange Pharmacy order status has been updated.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <div style="display: inline-block; padding: 15px 30px; background: {status_color}; border-radius: 8px;">
                    <span style="color: white; font-size: 20px; font-weight: bold;">{update.status}</span>
                </div>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Order ID:</strong> {order_id[:8]}...</p>
                {f"<p><strong>Notes:</strong> {update.notes}</p>" if update.notes else ""}
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding: 15px; background: #ffedd5; border-radius: 8px;">
                <p style="margin: 0; color: #c2410c;"><strong>Track your order or need help?</strong></p>
                <p style="margin: 5px 0 0 0; color: #ea580c;">Contact us: 7039030030</p>
            </div>
        </div>
    </div>
    """
    
    await send_email_notification(
        f"Pharmacy Order Update - {update.status}", 
        email_html,
        patient_email=order.get('patient_email'),
        patient_subject=f"Your Order is {update.status} - Orange Pharmacy",
        patient_html=patient_status_html
    )
    
    # Send push notification to user
    if order.get('user_id'):
        push_body = f"Your pharmacy order is now: {update.status}"
        if update.status == "Delivered":
            push_body = "Your pharmacy order has been delivered! 🎉"
        elif update.status == "Out for Delivery":
            push_body = "Your order is out for delivery! 🚚"
        
        await send_push_notification(
            user_id=order.get('user_id'),
            title=f"Order Update: {update.status}",
            body=push_body,
            url="/profile",
            tag=f"pharmacy-update-{order_id}"
        )
    
    return {"success": True, "message": f"Order status updated to '{update.status}'", "status": update.status}

@api_router.get("/admin/diagnostic/orders")
async def get_admin_diagnostic_orders(admin = Depends(verify_admin), status: Optional[str] = None, limit: int = 50):
    """Get diagnostic orders for admin with optional status filter"""
    query = {}
    if status:
        query["status"] = status
    
    orders = await db.diagnostic_orders.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Add status history if not present
    for order in orders:
        if "status_history" not in order:
            order["status_history"] = []
    
    return {"orders": orders, "total": len(orders), "statuses": DIAGNOSTIC_STATUSES}

@api_router.put("/admin/diagnostic/orders/{order_id}/status")
async def update_diagnostic_order_status(order_id: str, update: OrderStatusUpdate, admin = Depends(verify_admin)):
    """Update diagnostic order status"""
    if update.status not in DIAGNOSTIC_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {DIAGNOSTIC_STATUSES}")
    
    # Get current order
    order = await db.diagnostic_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Create status history entry
    status_entry = {
        "status": update.status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "notes": update.notes
    }
    
    # Update order
    result = await db.diagnostic_orders.update_one(
        {"id": order_id},
        {
            "$set": {"status": update.status},
            "$push": {"status_history": status_entry}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to update order status")
    
    # Send email notification for status update
    email_html = f"""
    <h2>🔬 Diagnostic Order Status Update</h2>
    <p><strong>Order ID:</strong> {order_id[:8]}...</p>
    <p><strong>Patient:</strong> {order.get('patient_name')}</p>
    <p><strong>Phone:</strong> {order.get('patient_phone')}</p>
    <p><strong>Tests:</strong> {', '.join(order.get('tests', [])[:3])}{'...' if len(order.get('tests', [])) > 3 else ''}</p>
    <p><strong>New Status:</strong> <span style="color: #8b5cf6; font-weight: bold;">{update.status}</span></p>
    {f"<p><strong>Notes:</strong> {update.notes}</p>" if update.notes else ""}
    <p><strong>Updated at:</strong> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC</p>
    """
    
    # Patient status update email for diagnostics
    status_colors = {
        "Test Booked": "#f59e0b",
        "Sample Collected": "#3b82f6",
        "In Process": "#8b5cf6",
        "Reports Generated": "#10b981"
    }
    status_color = status_colors.get(update.status, "#6b7280")
    status_icons = {
        "Test Booked": "📋",
        "Sample Collected": "🧪",
        "In Process": "⏳",
        "Reports Generated": "📊"
    }
    status_icon = status_icons.get(update.status, "📋")
    
    patient_diag_status_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Test Update {status_icon}</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px;">Hello <strong>{order.get('patient_name')}</strong>,</p>
            <p>Your Proton Diagnostics order status has been updated.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <div style="display: inline-block; padding: 15px 30px; background: {status_color}; border-radius: 8px;">
                    <span style="color: white; font-size: 20px; font-weight: bold;">{update.status}</span>
                </div>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Order ID:</strong> {order_id[:8]}...</p>
                <p><strong>Tests:</strong> {', '.join(order.get('tests', [])[:3])}{'...' if len(order.get('tests', [])) > 3 else ''}</p>
                {f"<p><strong>Notes:</strong> {update.notes}</p>" if update.notes else ""}
            </div>
            
            {"<p style='text-align: center; color: #10b981; font-size: 16px;'><strong>Your reports are ready! Please visit our center or contact us to collect them.</strong></p>" if update.status == "Reports Generated" else ""}
            
            <div style="text-align: center; margin-top: 30px; padding: 15px; background: #ede9fe; border-radius: 8px;">
                <p style="margin: 0; color: #5b21b6;"><strong>Questions about your tests?</strong></p>
                <p style="margin: 5px 0 0 0; color: #7c3aed;">Contact us: 7039040040</p>
            </div>
        </div>
    </div>
    """
    
    await send_email_notification(
        f"Diagnostic Order Update - {update.status}", 
        email_html,
        patient_email=order.get('patient_email'),
        patient_subject=f"Test Status: {update.status} - Proton Diagnostics",
        patient_html=patient_diag_status_html
    )
    
    # Send push notification to user
    if order.get('user_id'):
        push_body = f"Your diagnostic order is now: {update.status}"
        if update.status == "Reports Generated":
            push_body = "Your test reports are ready! 📊"
        elif update.status == "Sample Collected":
            push_body = "Sample collected. Processing your tests..."
        
        await send_push_notification(
            user_id=order.get('user_id'),
            title=f"Test Update: {update.status}",
            body=push_body,
            url="/profile",
            tag=f"diagnostic-update-{order_id}"
        )
    
    return {"success": True, "message": f"Order status updated to '{update.status}'", "status": update.status}

@api_router.get("/orders/pharmacy/{order_id}/track")
async def track_pharmacy_order(order_id: str):
    """Track pharmacy order status (public endpoint)"""
    order = await db.pharmacy_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {
        "order_id": order_id,
        "status": order.get("status", "Order Booked"),
        "status_history": order.get("status_history", []),
        "all_statuses": PHARMACY_STATUSES,
        "patient_name": order.get("patient_name"),
        "created_at": order.get("created_at")
    }

@api_router.get("/orders/diagnostic/{order_id}/track")
async def track_diagnostic_order(order_id: str):
    """Track diagnostic order status (public endpoint)"""
    order = await db.diagnostic_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {
        "order_id": order_id,
        "status": order.get("status", "Test Booked"),
        "status_history": order.get("status_history", []),
        "all_statuses": DIAGNOSTIC_STATUSES,
        "patient_name": order.get("patient_name"),
        "tests": order.get("tests", []),
        "created_at": order.get("created_at")
    }

# Model for adding medicine
class MedicineAdd(BaseModel):
    name: str
    form: str = "Tablet"

@api_router.post("/pharmacy/inventory/add")
async def add_medicine(medicine: MedicineAdd):
    """Add a medicine to the inventory"""
    # Check if medicine already exists
    name_lower = medicine.name.strip().upper()
    for m in MEDICINE_INVENTORY:
        if m["name"].upper() == name_lower:
            raise HTTPException(status_code=400, detail="Medicine already exists in inventory")
    
    new_medicine = {
        "name": medicine.name.strip().upper(),
        "form": medicine.form
    }
    MEDICINE_INVENTORY.append(new_medicine)
    MEDICINE_INVENTORY.sort(key=lambda x: x["name"])
    
    return {"success": True, "message": "Medicine added successfully", "medicine": new_medicine, "total": len(MEDICINE_INVENTORY)}

@api_router.delete("/pharmacy/inventory/{medicine_name}")
async def remove_medicine(medicine_name: str):
    """Remove a medicine from the inventory"""
    global MEDICINE_INVENTORY
    name_upper = medicine_name.strip().upper()
    original_len = len(MEDICINE_INVENTORY)
    MEDICINE_INVENTORY = [m for m in MEDICINE_INVENTORY if m["name"].upper() != name_upper]
    
    if len(MEDICINE_INVENTORY) == original_len:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    return {"success": True, "message": "Medicine removed successfully", "total": len(MEDICINE_INVENTORY)}

@api_router.get("/pharmacy/inventory")
async def get_pharmacy_inventory(search: Optional[str] = None, form: Optional[str] = None, limit: int = 50):
    """Get pharmacy inventory with optional filtering"""
    inventory = MEDICINE_INVENTORY.copy()
    
    if search:
        search_lower = search.lower()
        inventory = [m for m in inventory if search_lower in m["name"].lower()]
    
    if form:
        form_lower = form.lower()
        inventory = [m for m in inventory if form_lower in m["form"].lower()]
    
    # Limit results for autocomplete performance
    limited_inventory = inventory[:limit]
    
    return {"medicines": limited_inventory, "total": len(inventory), "showing": len(limited_inventory)}

@api_router.get("/pharmacy/autocomplete")
async def autocomplete_medicine(q: str = "", limit: int = 10):
    """Autocomplete endpoint for medicine search"""
    if not q or len(q) < 2:
        return {"suggestions": []}
    
    query_lower = q.lower()
    suggestions = []
    
    for m in MEDICINE_INVENTORY:
        if query_lower in m["name"].lower():
            suggestions.append({
                "name": m["name"],
                "form": m["form"]
            })
            if len(suggestions) >= limit:
                break
    
    return {"suggestions": suggestions, "query": q}

@api_router.get("/pharmacy/forms")
async def get_medicine_forms():
    """Get all unique medicine forms for filtering"""
    forms = list(set(m["form"] for m in MEDICINE_INVENTORY))
    forms.sort()
    return {"forms": forms}

@api_router.get("/pharmacy/count")
async def get_medicine_count():
    """Get total medicine count in inventory"""
    return {"total": len(MEDICINE_INVENTORY)}

@api_router.get("/pharmacy/all")
async def get_all_medicines(page: int = 1, per_page: int = 50, search: Optional[str] = None):
    """Get all medicines with pagination for scrollable list"""
    inventory = MEDICINE_INVENTORY.copy()
    
    if search:
        search_lower = search.lower()
        inventory = [m for m in inventory if search_lower in m["name"].lower()]
    
    total = len(inventory)
    start = (page - 1) * per_page
    end = start + per_page
    paginated = inventory[start:end]
    
    return {
        "medicines": paginated,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page
    }

# ==================== PUSH NOTIFICATION ENDPOINTS ====================

@api_router.get("/push/vapid-public-key")
async def get_vapid_public_key():
    """Get VAPID public key for push subscription"""
    if not VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=500, detail="Push notifications not configured")
    return {"publicKey": VAPID_PUBLIC_KEY}

@api_router.post("/push/subscribe")
async def subscribe_push(subscription: PushSubscription, user = Depends(get_current_user)):
    """Subscribe to push notifications"""
    try:
        # Store subscription with user_id if authenticated
        sub_doc = {
            "endpoint": subscription.endpoint,
            "keys": subscription.keys,
            "user_id": user.id if user else None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Upsert to avoid duplicates
        await db.push_subscriptions.update_one(
            {"endpoint": subscription.endpoint},
            {"$set": sub_doc},
            upsert=True
        )
        
        logger.info(f"Push subscription saved for user: {user.id if user else 'anonymous'}")
        return {"success": True, "message": "Successfully subscribed to push notifications"}
    except Exception as e:
        logger.error(f"Failed to save push subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to subscribe")

@api_router.post("/push/unsubscribe")
async def unsubscribe_push(subscription: PushSubscription):
    """Unsubscribe from push notifications"""
    try:
        result = await db.push_subscriptions.delete_one({"endpoint": subscription.endpoint})
        if result.deleted_count > 0:
            logger.info(f"Push subscription removed: {subscription.endpoint[:50]}...")
            return {"success": True, "message": "Successfully unsubscribed"}
        return {"success": False, "message": "Subscription not found"}
    except Exception as e:
        logger.error(f"Failed to remove push subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to unsubscribe")

@api_router.post("/push/test")
async def test_push_notification(user = Depends(get_current_user)):
    """Send a test push notification to the current user"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    result = await send_push_notification(
        user_id=user.id,
        title="Test Notification 🔔",
        body="Push notifications are working! You'll receive updates about your orders and appointments.",
        url="/profile",
        tag="test-notification"
    )
    
    if result and result.get("sent", 0) > 0:
        return {"success": True, "message": f"Test notification sent successfully", "details": result}
    return {"success": False, "message": "No subscriptions found or all failed", "details": result}

@api_router.post("/admin/push/broadcast")
async def admin_broadcast_push(payload: PushNotificationPayload, admin = Depends(verify_admin)):
    """Admin: Broadcast push notification to all subscribers"""
    result = await broadcast_push_notification(
        title=payload.title,
        body=payload.body,
        url=payload.url or "/",
        tag=payload.tag
    )
    
    return {"success": True, "message": "Broadcast sent", "details": result}

@api_router.get("/admin/push/subscribers")
async def get_push_subscribers(admin = Depends(verify_admin)):
    """Admin: Get count of push notification subscribers"""
    total = await db.push_subscriptions.count_documents({})
    with_user = await db.push_subscriptions.count_documents({"user_id": {"$ne": None}})
    
    return {
        "total_subscribers": total,
        "authenticated_users": with_user,
        "anonymous": total - with_user
    }

@api_router.get("/")
async def root():
    return {"message": "Nevika Cura Healthcare API"}

# Create uploads directories
uploads_dir = ROOT_DIR / "uploads"
(uploads_dir / "reports").mkdir(parents=True, exist_ok=True)
(uploads_dir / "bills").mkdir(parents=True, exist_ok=True)

# Mount static files for uploads
app.mount("/api/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

# NOTE: Routes below were moved before include_router

# Catch-all handler for root API endpoint to prevent 405 errors
@api_router.post("/admin/send-credentials-email")
async def send_credentials_email(email: str, admin = Depends(verify_admin)):
    """Send staff login credentials to specified email"""
    
    credentials_html = """
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background: #f8fafc;">
        <div style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: white; padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🏥 Nevika Cura</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Staff Portal Login Credentials</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #0d9488; margin-top: 0;">📋 Login Credentials</h2>
            <p style="color: #64748b;">Access the Staff Portal at: <a href="https://medapp-11.preview.emergentagent.com/staff" style="color: #0d9488;">Staff Portal</a></p>
            
            <h3 style="color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">👨‍⚕️ DiaGyn - Doctors</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr style="background: #f1f5f9;">
                    <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Doctor</th>
                    <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Username</th>
                    <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Password</th>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">Dr. Neha Patel</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;">doc_pushpa_01</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;">Nevika@2026D</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">Dr. Vikas Jha</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;">doc_amnion_01</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;">Nevika@2026D</td>
                </tr>
            </table>
            
            <h3 style="color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">🏥 DiaGyn - Clinic Staff</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr style="background: #f1f5f9;">
                    <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Clinic</th>
                    <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Username</th>
                    <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Password</th>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">Pushpa Clinic Staff</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #d1fae5;">staff_pushpa</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #d1fae5;">Nevika@2026C</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">Amnion Clinic Staff</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #d1fae5;">staff_amnion</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #d1fae5;">Nevika@2026C</td>
                </tr>
            </table>
            
            <h3 style="color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">💊 Orange Pharmacy</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr style="background: #f1f5f9;">
                    <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Role</th>
                    <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Username</th>
                    <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Password</th>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">Pharmacy Staff</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fed7aa;">staff_pharmacy</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fed7aa;">Nevika@2026P</td>
                </tr>
            </table>
            
            <h3 style="color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">🔬 Proton Diagnostics</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr style="background: #f1f5f9;">
                    <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Role</th>
                    <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Username</th>
                    <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Password</th>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">Diagnostics Staff</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #e9d5ff;">staff_proton</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #e9d5ff;">Nevika@2026L</td>
                </tr>
            </table>
            
            <h3 style="color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">🔐 Admin Portal</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr style="background: #f1f5f9;">
                    <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Portal</th>
                    <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">URL</th>
                    <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Password</th>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">Admin Dashboard</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;"><a href="https://medapp-11.preview.emergentagent.com/admin" style="color: #0d9488;">/admin</a></td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fecaca;">nevikacura2026</td>
                </tr>
            </table>
            
            <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin-top: 20px; border-radius: 4px;">
                <strong style="color: #15803d;">🔒 Security Note:</strong>
                <p style="color: #166534; margin: 5px 0 0;">Please change these passwords after first login for security. Keep this information confidential.</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 14px;">Nevika Cura Healthcare<br>📍 24215 Kuykendal Road, Tomball, Texas 77375</p>
            </div>
        </div>
    </div>
    """
    
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [email],
            "subject": "🏥 Nevika Cura - Staff Login Credentials",
            "html": credentials_html
        }
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Credentials email sent to {email}: {result.get('id')}")
        return {"success": True, "message": f"Credentials sent to {email}", "email_id": result.get('id')}
    except Exception as e:
        logger.error(f"Failed to send credentials email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


# ============ PATIENT PROFILE ENDPOINTS ============

class PatientProfile(BaseModel):
    phone: str
    name: str
    email: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[List[str]] = []
    emergency_contact: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


@api_router.post("/patients/profile")
async def save_patient_profile(profile: PatientProfile):
    """Save or update patient profile for future appointments"""
    phone = profile.phone.strip().replace(" ", "").replace("-", "")
    
    # Check if profile exists
    existing = await db.patient_profiles.find_one({"phone": {"$regex": phone[-10:]}})
    
    profile_data = profile.model_dump()
    profile_data["phone"] = phone
    profile_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if existing:
        # Update existing profile
        await db.patient_profiles.update_one(
            {"phone": {"$regex": phone[-10:]}},
            {"$set": profile_data}
        )
        return {"success": True, "message": "Profile updated", "is_new": False}
    else:
        # Create new profile
        profile_data["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.patient_profiles.insert_one(profile_data)
        return {"success": True, "message": "Profile saved", "is_new": True}


@api_router.get("/patients/profile/{phone}")
async def get_patient_profile(phone: str):
    """Get patient profile by phone number"""
    phone = phone.strip().replace(" ", "").replace("-", "")
    
    profile = await db.patient_profiles.find_one(
        {"phone": {"$regex": phone[-10:]}},
        {"_id": 0}
    )
    
    if not profile:
        # Try to find from existing appointments/orders
        appointment = await db.appointments.find_one(
            {"patient_phone": {"$regex": phone[-10:]}},
            {"_id": 0, "patient_name": 1, "patient_phone": 1, "patient_email": 1}
        )
        if appointment:
            return {
                "found": True,
                "from_history": True,
                "profile": {
                    "phone": appointment.get("patient_phone"),
                    "name": appointment.get("patient_name"),
                    "email": appointment.get("patient_email")
                }
            }
        return {"found": False, "profile": None}
    
    return {"found": True, "from_history": False, "profile": profile}


@api_router.get("/patients/autocomplete/{phone}")
async def autocomplete_patient(phone: str):
    """Autocomplete patient details from saved profile or history"""
    phone = phone.strip().replace(" ", "").replace("-", "")
    
    if len(phone) < 6:
        return {"suggestions": []}
    
    # Search in profiles first
    profiles = await db.patient_profiles.find(
        {"phone": {"$regex": phone}},
        {"_id": 0, "phone": 1, "name": 1, "email": 1, "address": 1}
    ).limit(5).to_list(5)
    
    if profiles:
        return {"suggestions": profiles, "source": "profiles"}
    
    # Fallback to appointment history
    appointments = await db.appointments.find(
        {"patient_phone": {"$regex": phone}},
        {"_id": 0, "patient_phone": 1, "patient_name": 1, "patient_email": 1}
    ).limit(5).to_list(5)
    
    # Deduplicate by phone
    seen = set()
    suggestions = []
    for apt in appointments:
        if apt["patient_phone"] not in seen:
            seen.add(apt["patient_phone"])
            suggestions.append({
                "phone": apt["patient_phone"],
                "name": apt["patient_name"],
                "email": apt.get("patient_email")
            })
    
    return {"suggestions": suggestions, "source": "history"}


@app.api_route("/api/", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
@app.api_route("/api", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def api_root_handler():
    """Root API endpoint - returns API info"""
    return {
        "name": "Nevika Cura API",
        "version": "1.0.0",
        "status": "healthy",
        "services": ["diagyn", "proton", "pharmacy", "staff", "admin"]
    }

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
