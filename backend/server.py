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

# Import data from modular files
from data.medicine_inventory import MEDICINE_INVENTORY
from data.diagnostic_tests import DIAGNOSTIC_TESTS, DIAGNOSTIC_TEST_PRICES

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Startup event to ensure database connection is ready
@app.on_event("startup")
async def startup_db_client():
    """Initialize database connection on startup"""
    try:
        # Ping MongoDB to ensure connection is ready
        await client.admin.command('ping')
        logger.info("MongoDB connection established successfully")
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")

# Health check endpoint for Kubernetes liveness/readiness probes
@app.get("/health")
async def health_check():
    """Health check endpoint - verifies service and database are operational"""
    try:
        # Quick database ping to verify connection
        await client.admin.command('ping')
        return {"status": "healthy", "service": "nevika-cura-api", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "healthy", "service": "nevika-cura-api", "database": "reconnecting"}

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
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER', '')  # SMS sender number
TWILIO_VERIFY_SERVICE_SID = os.environ.get('TWILIO_VERIFY_SERVICE_SID', '')  # For OTP verification

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
        if TWILIO_VERIFY_SERVICE_SID:
            logger.info(f"Twilio Verify Service configured: {TWILIO_VERIFY_SERVICE_SID[:10]}...")
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

# ============ SMS Notification Functions ============

async def send_sms_notification(to_number: str, message: str):
    """Send SMS notification to patient via Twilio"""
    if not twilio_client or not TWILIO_PHONE_NUMBER:
        logger.warning("Twilio SMS not configured, skipping SMS notification")
        return {"success": False, "error": "SMS not configured"}
    
    try:
        # Format phone number for India
        formatted_to = to_number.strip()
        if not formatted_to.startswith('+'):
            if len(formatted_to) == 10:
                formatted_to = f"+91{formatted_to}"
            else:
                formatted_to = f"+{formatted_to}"
        
        result = await asyncio.to_thread(
            twilio_client.messages.create,
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=formatted_to
        )
        
        logger.info(f"SMS sent to {formatted_to}: sid={result.sid}")
        return {"success": True, "sid": result.sid}
    
    except Exception as e:
        logger.error(f"SMS send failed to {to_number}: {str(e)}")
        return {"success": False, "error": str(e)}

async def send_appointment_sms(patient_phone: str, appointment_details: dict):
    """Send appointment confirmation SMS to patient"""
    doctor = appointment_details.get('doctor', 'Doctor')
    clinic = appointment_details.get('clinic', 'Clinic')
    date = appointment_details.get('date', '')
    time = appointment_details.get('time', '')
    booking_type = appointment_details.get('booking_type', 'online')
    
    if booking_type == 'walk_in':
        message = f"""DiaGyn Healthcare - Walk-in Registered!

Doctor: {doctor}
Clinic: {clinic}
Date: {date}
Token Time: {time}

Note: The time mentioned is your arrival slot. Patients are attended in sequence.

Please wait in the clinic. You will be called shortly.

- DiaGyn Healthcare
  Call: 9403890429"""
    elif booking_type == 'emergency':
        message = f"""DiaGyn Healthcare - Emergency Appointment!

Doctor: {doctor}
Clinic: {clinic}
Date: {date}

EMERGENCY PRIORITY - You will be attended on priority basis.

Please proceed directly to the clinic.

- DiaGyn Healthcare
  Call: 9403890429"""
    else:
        # Online booking
        message = f"""DiaGyn Healthcare - Appointment Confirmed!

Doctor: {doctor}
Clinic: {clinic}
Date: {date}
Time: {time}

Note: The appointment time is your arrival time at the clinic, not the exact consultation time. Patients will be attended in sequence.

Please arrive 10 mins early. For queries, call 9403890429.

- DiaGyn Healthcare"""
    
    return await send_sms_notification(patient_phone, message)

async def send_pharmacy_order_sms(patient_phone: str, order_details: dict):
    """Send pharmacy order confirmation SMS to patient"""
    order_id = order_details.get('id', '')[:8]
    medicines_count = len(order_details.get('medicines', []))
    
    message = f"""Nevika Cura - Order Confirmed!

Order ID: {order_id}
Items: {medicines_count} medicine(s)
Status: Order Booked

We'll notify you when your order is out for delivery.

Thank you!
- Orange Pharmacy"""
    
    return await send_sms_notification(patient_phone, message)

async def send_pharmacy_status_sms(patient_phone: str, order_id: str, status: str):
    """Send pharmacy order status update SMS"""
    status_messages = {
        "Packing": "Your order is being packed.",
        "Out for Delivery": "Your order is out for delivery! 🚚",
        "Delivered": "Your order has been delivered. Thank you!"
    }
    
    message = f"""Nevika Cura - Order Update

Order ID: {order_id[:8]}
Status: {status}

{status_messages.get(status, f'Your order status: {status}')}

- Orange Pharmacy"""
    
    return await send_sms_notification(patient_phone, message)

async def send_diagnostic_order_sms(patient_phone: str, order_details: dict):
    """Send diagnostic test booking confirmation SMS to patient"""
    order_id = order_details.get('id', '')[:8]
    tests = order_details.get('tests', [])
    tests_count = len(tests) if isinstance(tests, list) else 1
    
    message = f"""Nevika Cura - Test Booked!

Order ID: {order_id}
Tests: {tests_count} test(s)
Status: Test Booked

Our team will contact you for sample collection.

Thank you!
- Proton Diagnostics"""
    
    return await send_sms_notification(patient_phone, message)

async def send_diagnostic_status_sms(patient_phone: str, order_id: str, status: str, report_url: str = None):
    """Send diagnostic test status update SMS"""
    status_messages = {
        "Sample Collected": "Your sample has been collected.",
        "In Process": "Your test is being processed.",
        "Reports Generated": "Your reports are ready! Check your email or visit our portal."
    }
    
    message = f"""Nevika Cura - Test Update

Order ID: {order_id[:8]}
Status: {status}

{status_messages.get(status, f'Your test status: {status}')}

- Proton Diagnostics"""
    
    return await send_sms_notification(patient_phone, message)

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
    loyalty_points: int = 0  # Loyalty points for registered users
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
    points_used: int = 0  # Loyalty points redeemed
    discount_amount: float = 0.0  # Discount in rupees (100 pts = ₹10)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PharmacyOrderCreate(BaseModel):
    medicines: List[dict]
    prescription_url: Optional[str] = None
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    delivery_address: Optional[str] = None
    points_used: Optional[int] = 0  # Loyalty points to redeem (100 pts = ₹10)

# OTP Models for Mock OTP verification
class OTPRequest(BaseModel):
    phone: str
    service: str  # 'diagyn', 'proton', 'pharmacy'

class OTPVerify(BaseModel):
    phone: str
    otp: str
    service: str

# Feedback model for appointment ratings
class AppointmentFeedback(BaseModel):
    rating: int  # 1-5 stars
    comment: Optional[str] = None

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
        user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        if not user_doc:
            return None
        return user_doc
    except Exception:
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

@api_router.get("/user/loyalty-points")
async def get_user_loyalty_points(user: User = Depends(get_current_user)):
    """Get current user's loyalty points balance"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Fetch fresh data from DB
    user_doc = await db.users.find_one({"id": user.id}, {"_id": 0, "loyalty_points": 1})
    loyalty_points = user_doc.get('loyalty_points', 0) if user_doc else 0
    
    return {"loyalty_points": loyalty_points}

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

# Store for auth OTPs (used as fallback when Twilio is not available)
auth_otp_storage = {}

# Helper function to send OTP via Twilio Verify
async def send_twilio_otp(phone: str) -> dict:
    """Send OTP via Twilio Verify Service"""
    if not twilio_client or not TWILIO_VERIFY_SERVICE_SID:
        return {"success": False, "error": "Twilio not configured"}
    
    try:
        # Format phone number for India (add +91 if needed)
        formatted_phone = phone.strip()
        if not formatted_phone.startswith('+'):
            if len(formatted_phone) == 10:
                formatted_phone = f"+91{formatted_phone}"
            else:
                formatted_phone = f"+{formatted_phone}"
        
        verification = await asyncio.to_thread(
            twilio_client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID)
            .verifications.create,
            to=formatted_phone,
            channel="sms"
        )
        
        logger.info(f"Twilio OTP sent to {formatted_phone}: status={verification.status}")
        return {"success": True, "status": verification.status, "phone": formatted_phone}
    
    except Exception as e:
        logger.error(f"Twilio OTP send failed: {str(e)}")
        return {"success": False, "error": str(e)}

# Helper function to verify OTP via Twilio Verify
async def verify_twilio_otp(phone: str, code: str) -> dict:
    """Verify OTP via Twilio Verify Service"""
    if not twilio_client or not TWILIO_VERIFY_SERVICE_SID:
        return {"success": False, "error": "Twilio not configured"}
    
    try:
        # Format phone number for India (add +91 if needed)
        formatted_phone = phone.strip()
        if not formatted_phone.startswith('+'):
            if len(formatted_phone) == 10:
                formatted_phone = f"+91{formatted_phone}"
            else:
                formatted_phone = f"+{formatted_phone}"
        
        verification_check = await asyncio.to_thread(
            twilio_client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID)
            .verification_checks.create,
            to=formatted_phone,
            code=code
        )
        
        is_valid = verification_check.status == "approved"
        logger.info(f"Twilio OTP verify for {formatted_phone}: status={verification_check.status}, valid={is_valid}")
        return {"success": True, "valid": is_valid, "status": verification_check.status}
    
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Twilio OTP verify failed: {error_msg}")
        # Check for specific error codes
        if "60202" in error_msg or "Max check attempts reached" in error_msg:
            return {"success": False, "error": "Too many attempts. Please request a new OTP.", "code": "MAX_ATTEMPTS"}
        if "60200" in error_msg or "Invalid parameter" in error_msg:
            return {"success": False, "error": "Invalid OTP code.", "code": "INVALID"}
        return {"success": False, "error": error_msg}

@api_router.post("/auth/otp/send")
async def send_auth_otp(request: AuthOTPRequest):
    """Send OTP for authentication (login/register) via Twilio SMS"""
    phone = request.phone.strip()
    
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    
    # Try Twilio first
    if twilio_client and TWILIO_VERIFY_SERVICE_SID:
        result = await send_twilio_otp(phone)
        if result["success"]:
            return {
                "success": True,
                "message": "OTP sent to your phone via SMS",
                "expires_in": 300,
                "phone": phone,
                "method": "sms"
            }
        else:
            logger.warning(f"Twilio failed, falling back to mock OTP: {result.get('error')}")
    
    # Fallback to mock OTP (for development/testing)
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
        "mock_otp": otp,  # Only shown when using fallback
        "expires_in": 300,
        "phone": phone,
        "method": "mock"
    }

@api_router.post("/auth/otp/verify")
async def verify_auth_otp(request: AuthOTPVerify):
    """Verify OTP for authentication via Twilio or fallback"""
    phone = request.phone.strip()
    otp = request.otp.strip()
    
    # Try Twilio verification first
    if twilio_client and TWILIO_VERIFY_SERVICE_SID:
        result = await verify_twilio_otp(phone, otp)
        if result["success"]:
            if result["valid"]:
                # OTP verified - generate verification token
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
        else:
            error_code = result.get("code", "")
            if error_code == "MAX_ATTEMPTS":
                raise HTTPException(status_code=400, detail=result["error"])
            # Fall through to mock verification
            logger.warning(f"Twilio verify failed, trying mock: {result.get('error')}")
    
    # Fallback to mock OTP verification
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


# ============ OTP Endpoints (Twilio SMS with Mock fallback) ============

@api_router.post("/otp/send")
async def send_otp(request: OTPRequest):
    """Send OTP to phone number via Twilio SMS (with mock fallback)"""
    phone = request.phone.strip()
    service = request.service.lower()
    
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    
    if service not in ['diagyn', 'proton', 'pharmacy']:
        raise HTTPException(status_code=400, detail="Invalid service")
    
    # Try Twilio first
    if twilio_client and TWILIO_VERIFY_SERVICE_SID:
        result = await send_twilio_otp(phone)
        if result["success"]:
            return {
                "success": True,
                "message": f"OTP sent to your phone via SMS for {service.title()} booking",
                "expires_in": 300,
                "phone": phone,
                "method": "sms"
            }
        else:
            logger.warning(f"Twilio failed for {service}, using mock: {result.get('error')}")
    
    # Fallback to mock OTP
    otp = generate_otp()
    otp_key = f"{phone}_{service}"
    otp_storage[otp_key] = {
        "otp": otp,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5),
        "attempts": 0
    }
    
    logger.info(f"Mock OTP generated for {phone} ({service}): {otp}")
    
    return {
        "success": True,
        "message": "OTP sent successfully",
        "mock_otp": otp,  # Only shown when using fallback
        "expires_in": 300,
        "phone": phone,
        "method": "mock"
    }

@api_router.post("/otp/verify")
async def verify_otp(request: OTPVerify):
    """Verify OTP via Twilio or fallback"""
    phone = request.phone.strip()
    otp = request.otp.strip()
    service = request.service.lower()
    
    # Try Twilio verification first
    if twilio_client and TWILIO_VERIFY_SERVICE_SID:
        result = await verify_twilio_otp(phone, otp)
        if result["success"]:
            if result["valid"]:
                # Generate verification token
                verification_token = jwt.encode({
                    'phone': phone,
                    'service': service,
                    'verified': True,
                    'exp': datetime.now(timezone.utc) + timedelta(minutes=30)
                }, JWT_SECRET, algorithm=JWT_ALGORITHM)
                
                logger.info(f"OTP verified via Twilio for {phone} ({service})")
                return {
                    "success": True,
                    "verified": True,
                    "verification_token": verification_token,
                    "message": "Phone verified successfully",
                    "method": "sms"
                }
            else:
                raise HTTPException(status_code=400, detail="Invalid OTP. Please try again.")
        else:
            error_code = result.get("code", "")
            if error_code == "MAX_ATTEMPTS":
                raise HTTPException(status_code=400, detail=result["error"])
            logger.warning(f"Twilio verify failed for {service}, trying mock: {result.get('error')}")
    
    # Fallback to mock verification
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
    
    # Send SMS confirmation to patient
    await send_appointment_sms(appointment.patient_phone, {
        "doctor": appointment.doctor,
        "clinic": appointment.clinic,
        "date": appointment.date,
        "time": appointment.time,
        "booking_type": "online"
    })
    
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

# ============ Appointment Feedback Endpoint ============
@api_router.post("/feedback/{feedback_token}")
async def submit_appointment_feedback(feedback_token: str, feedback: AppointmentFeedback):
    """Submit feedback for a completed appointment (via email link)"""
    # Validate rating
    if not 1 <= feedback.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    # Find appointment by feedback token
    appointment = await db.appointments.find_one(
        {"feedback_token": feedback_token},
        {"_id": 0}
    )
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Invalid feedback link")
    
    if appointment.get("feedback_submitted"):
        raise HTTPException(status_code=400, detail="Feedback already submitted for this appointment")
    
    # Store feedback (not shown in app, only for admin)
    await db.appointments.update_one(
        {"feedback_token": feedback_token},
        {"$set": {
            "feedback_rating": feedback.rating,
            "feedback_comment": feedback.comment,
            "feedback_submitted": True,
            "feedback_submitted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Store in separate feedback collection for analytics
    await db.appointment_feedback.insert_one({
        "id": str(uuid.uuid4()),
        "appointment_id": appointment.get("id"),
        "doctor": appointment.get("doctor"),
        "clinic": appointment.get("clinic"),
        "rating": feedback.rating,
        "comment": feedback.comment,
        "patient_name": appointment.get("patient_name"),
        "submitted_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Send notification to admin about new feedback
    admin_html = f"""
    <h2>⭐ New Appointment Feedback Received</h2>
    <p><strong>Rating:</strong> {'⭐' * feedback.rating} ({feedback.rating}/5)</p>
    <p><strong>Doctor:</strong> {appointment.get('doctor')}</p>
    <p><strong>Clinic:</strong> {appointment.get('clinic')}</p>
    <p><strong>Patient:</strong> {appointment.get('patient_name')}</p>
    <p><strong>Date:</strong> {appointment.get('date')}</p>
    {f"<p><strong>Comment:</strong> {feedback.comment}</p>" if feedback.comment else ""}
    """
    await send_email_notification(f"New Feedback: {feedback.rating}/5 Stars - {appointment.get('doctor')}", admin_html)
    
    logger.info(f"Feedback submitted for appointment {appointment.get('id')}: {feedback.rating}/5")
    
    return {
        "success": True, 
        "message": "Thank you for your feedback!",
        "rating": feedback.rating
    }

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
    
    # Send SMS confirmation to patient
    await send_diagnostic_order_sms(order.patient_phone, {
        "id": order.id,
        "tests": order.tests
    })
    
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
    # Validate medicine quantities - max 20 strips per medicine
    MAX_QUANTITY_PER_MEDICINE = 20
    for medicine in input.medicines:
        qty = medicine.get('quantity', 1)
        if qty > MAX_QUANTITY_PER_MEDICINE:
            raise HTTPException(
                status_code=400, 
                detail=f"Maximum {MAX_QUANTITY_PER_MEDICINE} strips allowed per medicine. '{medicine.get('name', 'Unknown')}' has {qty} strips."
            )
    
    # Handle loyalty points redemption
    points_used = input.points_used or 0
    discount_amount = 0.0
    
    if points_used > 0:
        if not user:
            raise HTTPException(status_code=401, detail="Login required to redeem loyalty points")
        
        # Verify user has enough points
        user_doc = await db.users.find_one({"id": user.id})
        current_points = user_doc.get('loyalty_points', 0) if user_doc else 0
        
        if points_used > current_points:
            raise HTTPException(status_code=400, detail=f"Insufficient loyalty points. You have {current_points} points.")
        
        # Calculate discount (100 points = ₹10)
        discount_amount = (points_used / 100) * 10
        
        # Deduct points from user
        await db.users.update_one(
            {"id": user.id},
            {"$inc": {"loyalty_points": -points_used}}
        )
        
        # Record transaction
        await db.loyalty_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user.id,
            "phone": user.phone,
            "type": "debit",
            "points": points_used,
            "reason": f"Pharmacy order discount - ₹{discount_amount:.0f} off",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "staff_id": "system"
        })
        
        logger.info(f"Loyalty points redeemed: {points_used} pts = ₹{discount_amount} for user {user.id}")
    
    # Create order data without points_used field (handled separately)
    order_data = input.model_dump()
    del order_data['points_used']  # Remove as we add it separately with discount
    
    order = PharmacyOrder(
        user_id=user.id if user else None,
        points_used=points_used,
        discount_amount=discount_amount,
        **order_data
    )
    
    doc = order.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.pharmacy_orders.insert_one(doc)
    logger.info(f"Pharmacy order created: {order.id}")
    
    # Generate WhatsApp link for order notification
    medicines_text = ", ".join([f"{m.get('name', 'Unknown')} x{m.get('quantity', 1)}" for m in order.medicines[:3]])
    if len(order.medicines) > 3:
        medicines_text += f" +{len(order.medicines) - 3} more"
    
    # Add discount info to WhatsApp message if applicable
    discount_text = f"\nLoyalty Discount: ₹{order.discount_amount:.0f} ({order.points_used} pts)" if order.points_used > 0 else ""
    
    whatsapp_message = f"""New Pharmacy Order - Orange Pharmacy

Patient: {order.patient_name}
Phone: {order.patient_phone}
Order ID: {order.id[:8]}{discount_text}

Medicines: {medicines_text if order.medicines else 'See prescription'}
Prescription: {order.prescription_url or 'Not uploaded'}
Delivery: {order.delivery_address or 'Not provided'}"""
    
    whatsapp_link = f"https://wa.me/917039030030?text={whatsapp_message.replace(chr(10), '%0A').replace(' ', '%20')}"
    
    # Format prescription as clickable link
    prescription_display = f'<a href="{order.prescription_url}" target="_blank" style="color: #f97316;">📎 View Prescription</a>' if order.prescription_url else 'Not uploaded'
    
    # Add loyalty discount row to email if applicable
    discount_html = f'<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>🎁 Loyalty Discount:</strong></td><td style="padding: 8px; border: 1px solid #ddd; color: #16a34a; font-weight: bold;">₹{order.discount_amount:.0f} ({order.points_used} points used)</td></tr>' if order.points_used > 0 else ''
    
    # Send email notification for new pharmacy order
    medicines_list = "<br>".join([f"• {m.get('name', 'Unknown')} (Qty: {m.get('quantity', 1)})" for m in order.medicines]) if order.medicines else '<em>No medicines specified - Check prescription</em>'
    email_html = f"""
    <h2>💊 New Orange Pharmacy Order</h2>
    <h3>Medicines Ordered:</h3>
    <p>{medicines_list}</p>
    <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Delivery Address:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{order.delivery_address or 'Not provided'}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Prescription:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{prescription_display}</td></tr>
        {discount_html}
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
    
    # Discount info for patient email
    patient_discount_html = f'''
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center;">
            <p style="margin: 0; color: #d97706; font-weight: bold;">🎁 Loyalty Discount Applied!</p>
            <p style="margin: 5px 0 0 0; color: #92400e; font-size: 20px;">₹{order.discount_amount:.0f} OFF</p>
            <p style="margin: 5px 0 0 0; color: #78350f; font-size: 12px;">({order.points_used} points redeemed)</p>
        </div>
    ''' if order.points_used > 0 else ''
    
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
            {patient_discount_html}
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
    
    # Send SMS confirmation to patient
    await send_pharmacy_order_sms(order.patient_phone, {
        "id": order.id,
        "medicines": order.medicines
    })
    
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


class StaffUpdate(BaseModel):
    username: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None
    doctor_name: Optional[str] = None
    clinic: Optional[str] = None


@api_router.put("/admin/staff/{staff_id}")
async def update_staff(staff_id: str, update: StaffUpdate, admin = Depends(verify_admin)):
    """Update a staff member's details"""
    staff = await db.staff.find_one({"id": staff_id})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    update_data = {}
    if update.username:
        # Check if username already exists
        existing = await db.staff.find_one({"username": update.username, "id": {"$ne": staff_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Username already exists")
        update_data["username"] = update.username
    if update.name:
        update_data["name"] = update.name
    if update.role:
        if update.role not in STAFF_ROLES:
            raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {list(STAFF_ROLES.keys())}")
        update_data["role"] = update.role
    if update.doctor_name:
        update_data["doctor_name"] = update.doctor_name
    if update.clinic:
        update_data["clinic"] = update.clinic
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    await db.staff.update_one({"id": staff_id}, {"$set": update_data})
    
    updated_staff = await db.staff.find_one({"id": staff_id}, {"_id": 0, "password_hash": 0})
    return {"success": True, "staff": updated_staff}


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
    
    # Send SMS confirmation to patient
    await send_appointment_sms(appt.patient_phone, {
        "doctor": appt.doctor,
        "clinic": appt.clinic,
        "date": appt.date,
        "time": appt.time,
        "booking_type": "walk_in"
    })
    
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
    
    # Send SMS confirmation to patient
    await send_appointment_sms(appt.patient_phone, {
        "doctor": appt.doctor,
        "clinic": appt.clinic,
        "date": appt.date,
        "time": None,
        "booking_type": "emergency"
    })
    
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
    
    # Send PUSH NOTIFICATION for check-in (no email for status updates)
    if appointment.get("user_id"):
        await send_push_notification(
            user_id=appointment.get("user_id"),
            title="✅ Checked In",
            body=f"You're checked in at {appointment.get('clinic')}. The doctor will see you shortly.",
            url="/profile",
            tag=f"appointment-{appointment_id}"
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
    
    # Generate unique feedback token
    feedback_token = str(uuid.uuid4())
    
    await db.appointments.update_one(
        {"id": appointment_id},
        {"$set": {
            "status": "Completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "completed_by": staff.get("name"),
            "completion_notes": notes,
            "feedback_token": feedback_token,
            "feedback_requested": True
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
    
    # Send push notification
    if appointment.get("user_id"):
        await send_push_notification(
            user_id=appointment.get("user_id"),
            title="✅ Appointment Completed",
            body=f"Your appointment with {appointment.get('doctor')} is complete. Thank you for visiting!",
            url="/profile",
            tag=f"appointment-{appointment_id}"
        )
    
    # Send feedback request email if patient has email
    if appointment.get("patient_email"):
        feedback_url = f"{os.environ.get('FRONTEND_URL', 'https://healthcare-app-23.preview.emergentagent.com')}/feedback/{feedback_token}"
        
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
                
                <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                    <h3 style="color: #92400e; margin: 0 0 15px 0;">How was your experience?</h3>
                    <p style="color: #78350f; margin-bottom: 15px;">We'd love to hear your feedback. Please rate your visit:</p>
                    
                    <div style="margin: 20px 0;">
                        <a href="{feedback_url}?rating=1" style="text-decoration: none; font-size: 28px; margin: 0 5px;">⭐</a>
                        <a href="{feedback_url}?rating=2" style="text-decoration: none; font-size: 28px; margin: 0 5px;">⭐</a>
                        <a href="{feedback_url}?rating=3" style="text-decoration: none; font-size: 28px; margin: 0 5px;">⭐</a>
                        <a href="{feedback_url}?rating=4" style="text-decoration: none; font-size: 28px; margin: 0 5px;">⭐</a>
                        <a href="{feedback_url}?rating=5" style="text-decoration: none; font-size: 28px; margin: 0 5px;">⭐</a>
                    </div>
                    
                    <p style="font-size: 12px; color: #92400e;">Click on the stars to rate (1-5)</p>
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
            patient_subject="Your Appointment is Complete – Share Your Feedback ⭐",
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
    
    # Send PUSH NOTIFICATION for status updates (no email for status updates)
    if order.get('user_id'):
        # Determine notification message based on status
        status_messages = {
            "Order Booked": "Your order has been received and is being processed.",
            "Packing": "Your medicines are being packed for delivery.",
            "Out for Delivery": "Your order is out for delivery! 🚚",
            "Delivered": "Your order has been delivered! Thank you for choosing Orange Pharmacy. 💊"
        }
        
        await send_push_notification(
            user_id=order.get('user_id'),
            title=f"📦 {update.status}",
            body=status_messages.get(update.status, f"Order status updated to: {update.status}"),
            url="/profile",
            tag=f"pharmacy-{order_id}"
        )
    
    # Send SMS to patient for status updates
    if order.get('patient_phone') and update.status in ["Packing", "Out for Delivery", "Delivered"]:
        await send_pharmacy_status_sms(order.get('patient_phone'), order_id, update.status)
    
    # Send email to ADMIN only (internal tracking)
    email_html = f"""
    <h2>📦 Pharmacy Order Status Update</h2>
    <p><strong>Order ID:</strong> {order_id[:8]}...</p>
    <p><strong>Patient:</strong> {order.get('patient_name')}</p>
    <p><strong>New Status:</strong> {update.status}</p>
    <p><strong>Updated by:</strong> {staff.get('name')}</p>
    """
    await send_email_notification(f"Pharmacy Order Update - {update.status}", email_html)
    
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
    
    # Send PUSH NOTIFICATION for status updates (no email for status updates)
    if order.get('user_id'):
        status_messages = {
            "Test Booked": "Your diagnostic test has been booked successfully.",
            "Sample Collected": "Your sample has been collected and is being processed. 🧪",
            "In Process": "Your test is being processed in our lab.",
            "Reports Generated": "🎉 Your test reports are ready! Check your profile to download."
        }
        
        await send_push_notification(
            user_id=order.get('user_id'),
            title=f"🔬 {update.status}",
            body=status_messages.get(update.status, f"Test status updated to: {update.status}"),
            url="/profile",
            tag=f"diagnostic-{order_id}"
        )
    
    # Send SMS to patient for status updates
    if order.get('patient_phone') and update.status in ["Sample Collected", "In Process", "Reports Generated"]:
        await send_diagnostic_status_sms(
            order.get('patient_phone'), 
            order_id, 
            update.status, 
            order.get('report_url')
        )
    
    # Send email to ADMIN only (internal tracking)
    email_html = f"""
    <h2>🔬 Diagnostic Order Status Update</h2>
    <p><strong>Order ID:</strong> {order_id[:8]}...</p>
    <p><strong>Patient:</strong> {order.get('patient_name')}</p>
    <p><strong>New Status:</strong> {update.status}</p>
    <p><strong>Updated by:</strong> {staff.get('name')}</p>
    """
    await send_email_notification(f"Diagnostic Order Update - {update.status}", email_html)
    
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
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace;">doc_neha</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;">Nevika@2026D</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">Dr. Vikas Jha</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">Amnion Clinic</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace;">doc_vikas</td>
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


# ============ CLEANUP ENDPOINTS - Day End Operations ============

@api_router.delete("/admin/cleanup/appointments/date/{date}")
async def cleanup_appointments_by_date(date: str, admin = Depends(verify_admin)):
    """Delete all appointments for a specific date (Day End Cleanup for DiaGyn)"""
    result = await db.appointments.delete_many({"date": date})
    return {
        "success": True,
        "message": f"Deleted {result.deleted_count} appointments for {date}",
        "deleted_count": result.deleted_count
    }


@api_router.delete("/admin/cleanup/appointments/completed")
async def cleanup_completed_appointments(admin = Depends(verify_admin)):
    """Delete all completed appointments"""
    result = await db.appointments.delete_many({"status": "Completed"})
    return {
        "success": True,
        "message": f"Deleted {result.deleted_count} completed appointments",
        "deleted_count": result.deleted_count
    }


@api_router.delete("/admin/cleanup/pharmacy/completed")
async def cleanup_completed_pharmacy_orders(admin = Depends(verify_admin)):
    """Delete only completed/delivered pharmacy orders (Orange Pharmacy)"""
    result = await db.pharmacy_orders.delete_many({"status": {"$in": ["Delivered", "Completed"]}})
    return {
        "success": True,
        "message": f"Deleted {result.deleted_count} completed pharmacy orders",
        "deleted_count": result.deleted_count
    }


@api_router.delete("/admin/cleanup/diagnostic/completed")
async def cleanup_completed_diagnostic_orders(admin = Depends(verify_admin)):
    """Delete only completed diagnostic orders (Proton Diagnostics)"""
    result = await db.diagnostic_orders.delete_many({"status": {"$in": ["Report Ready", "Delivered", "Completed"]}})
    return {
        "success": True,
        "message": f"Deleted {result.deleted_count} completed diagnostic orders",
        "deleted_count": result.deleted_count
    }


@api_router.delete("/admin/cleanup/all")
async def cleanup_all_data(admin = Depends(verify_admin), confirm: str = None):
    """Delete ALL appointments, pharmacy orders, and diagnostic orders to start fresh
    Requires confirm=DELETEALL parameter for safety
    """
    if confirm != "DELETEALL":
        raise HTTPException(status_code=400, detail="Must provide confirm=DELETEALL parameter to proceed")
    
    appointments_result = await db.appointments.delete_many({})
    pharmacy_result = await db.pharmacy_orders.delete_many({})
    diagnostic_result = await db.diagnostic_orders.delete_many({})
    
    return {
        "success": True,
        "message": "All data cleared - fresh start",
        "deleted": {
            "appointments": appointments_result.deleted_count,
            "pharmacy_orders": pharmacy_result.deleted_count,
            "diagnostic_orders": diagnostic_result.deleted_count
        },
        "total_deleted": appointments_result.deleted_count + pharmacy_result.deleted_count + diagnostic_result.deleted_count
    }


@api_router.get("/admin/cleanup/stats")
async def get_cleanup_stats(admin = Depends(verify_admin)):
    """Get current counts of all records for cleanup planning"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Appointment counts
    total_appointments = await db.appointments.count_documents({})
    completed_appointments = await db.appointments.count_documents({"status": "Completed"})
    today_appointments = await db.appointments.count_documents({"date": today})
    
    # Pharmacy counts
    total_pharmacy = await db.pharmacy_orders.count_documents({})
    completed_pharmacy = await db.pharmacy_orders.count_documents({"status": {"$in": ["Delivered", "Completed"]}})
    
    # Diagnostic counts
    total_diagnostic = await db.diagnostic_orders.count_documents({})
    completed_diagnostic = await db.diagnostic_orders.count_documents({"status": {"$in": ["Report Ready", "Delivered", "Completed"]}})
    
    return {
        "today": today,
        "appointments": {
            "total": total_appointments,
            "completed": completed_appointments,
            "today": today_appointments
        },
        "pharmacy_orders": {
            "total": total_pharmacy,
            "completed": completed_pharmacy
        },
        "diagnostic_orders": {
            "total": total_diagnostic,
            "completed": completed_diagnostic
        }
    }


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
            <p style="color: #64748b;">Access the Staff Portal at: <a href="https://healthcare-app-23.preview.emergentagent.com/staff" style="color: #0d9488;">Staff Portal</a></p>
            
            <h3 style="color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">👨‍⚕️ DiaGyn - Doctors</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr style="background: #f1f5f9;">
                    <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Doctor</th>
                    <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Username</th>
                    <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Password</th>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">Dr. Neha Patel</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;">doc_neha</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;">Nevika@2026D</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">Dr. Vikas Jha</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;">doc_vikas</td>
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
                    <td style="padding: 12px; border: 1px solid #e2e8f0;"><a href="https://healthcare-app-23.preview.emergentagent.com/admin" style="color: #0d9488;">/admin</a></td>
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


# ============ LOYALTY POINTS SYSTEM ============

class LoyaltyPointsAdd(BaseModel):
    phone: str
    points: int
    reason: Optional[str] = None  # e.g., "Pharmacy order", "Diagnostic test"


class LoyaltyPointsSubtract(BaseModel):
    phone: str
    points: int
    reason: Optional[str] = None  # e.g., "Redeemed for pharmacy order"


@api_router.get("/user/loyalty-points")
async def get_user_loyalty_points(user = Depends(get_current_user)):
    """Get loyalty points for logged-in user"""
    if not user:
        raise HTTPException(status_code=401, detail="Login required to view loyalty points")
    
    # Get user from database to get latest points
    db_user = await db.users.find_one({"id": user.id}, {"_id": 0, "loyalty_points": 1, "name": 1, "phone": 1})
    if not db_user:
        return {"loyalty_points": 0, "user_name": user.name}
    
    return {
        "loyalty_points": db_user.get("loyalty_points", 0),
        "user_name": db_user.get("name", user.name),
        "phone": db_user.get("phone")
    }


@api_router.get("/loyalty-points/by-phone/{phone}")
async def get_loyalty_points_by_phone(phone: str, staff = Depends(verify_staff)):
    """Get loyalty points for a user by phone number (Staff access)"""
    role = staff.get("role")
    if role not in ["pharmacy_staff", "diagnostics_staff", "super_admin"]:
        raise HTTPException(status_code=403, detail="Pharmacy or Diagnostics staff access required")
    
    phone = phone.strip().replace(" ", "").replace("-", "")
    
    # Find user by phone
    db_user = await db.users.find_one({"phone": {"$regex": phone[-10:]}}, {"_id": 0})
    if not db_user:
        return {"found": False, "message": "User not registered", "loyalty_points": 0}
    
    return {
        "found": True,
        "user_id": db_user.get("id"),
        "user_name": db_user.get("name"),
        "phone": db_user.get("phone"),
        "email": db_user.get("email"),
        "loyalty_points": db_user.get("loyalty_points", 0)
    }


@api_router.post("/staff/loyalty-points/add")
async def staff_add_loyalty_points(data: LoyaltyPointsAdd, staff = Depends(verify_staff)):
    """Add loyalty points to a registered user (Pharmacy/Diagnostics Staff only)"""
    role = staff.get("role")
    if role not in ["pharmacy_staff", "diagnostics_staff", "super_admin"]:
        raise HTTPException(status_code=403, detail="Pharmacy or Diagnostics staff access required")
    
    if data.points <= 0:
        raise HTTPException(status_code=400, detail="Points must be a positive number")
    
    phone = data.phone.strip().replace(" ", "").replace("-", "")
    
    # Find and update user
    result = await db.users.find_one_and_update(
        {"phone": {"$regex": phone[-10:]}},
        {"$inc": {"loyalty_points": data.points}},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="User not registered. Only registered users can earn loyalty points.")
    
    # Log the transaction
    await db.loyalty_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": result.get("id"),
        "user_phone": result.get("phone"),
        "user_name": result.get("name"),
        "type": "credit",
        "points": data.points,
        "reason": data.reason or "Staff added points",
        "staff_username": staff.get("username"),
        "staff_role": role,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "message": f"Added {data.points} loyalty points",
        "user_name": result.get("name"),
        "new_balance": result.get("loyalty_points", 0) + data.points
    }


@api_router.post("/admin/loyalty-points/subtract")
async def admin_subtract_loyalty_points(data: LoyaltyPointsSubtract, admin = Depends(verify_admin)):
    """Subtract loyalty points from a registered user (Admin only - for redemption)"""
    if data.points <= 0:
        raise HTTPException(status_code=400, detail="Points must be a positive number")
    
    phone = data.phone.strip().replace(" ", "").replace("-", "")
    
    # Find user first to check balance
    user = await db.users.find_one({"phone": {"$regex": phone[-10:]}})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_points = user.get("loyalty_points", 0)
    if current_points < data.points:
        raise HTTPException(status_code=400, detail=f"Insufficient points. User has {current_points} points, trying to subtract {data.points}")
    
    # Update user points
    result = await db.users.find_one_and_update(
        {"phone": {"$regex": phone[-10:]}},
        {"$inc": {"loyalty_points": -data.points}},
        return_document=True
    )
    
    # Log the transaction
    await db.loyalty_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user.get("id"),
        "user_phone": user.get("phone"),
        "user_name": user.get("name"),
        "type": "debit",
        "points": data.points,
        "reason": data.reason or "Points redeemed",
        "admin": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "message": f"Subtracted {data.points} loyalty points",
        "user_name": result.get("name"),
        "previous_balance": current_points,
        "new_balance": current_points - data.points
    }


@api_router.get("/admin/loyalty-points/transactions")
async def get_loyalty_transactions(admin = Depends(verify_admin), phone: Optional[str] = None, limit: int = 50):
    """Get loyalty points transaction history (Admin only)"""
    query = {}
    if phone:
        phone = phone.strip().replace(" ", "").replace("-", "")
        query["user_phone"] = {"$regex": phone[-10:]}
    
    transactions = await db.loyalty_transactions.find(query, {"_id": 0}).sort([("created_at", -1)]).limit(limit).to_list(limit)
    
    return {"transactions": transactions, "count": len(transactions)}


@api_router.get("/admin/loyalty-points/summary")
async def get_loyalty_summary(admin = Depends(verify_admin)):
    """Get loyalty points summary statistics (Admin only)"""
    # Get total points issued
    pipeline_credit = [
        {"$match": {"type": "credit"}},
        {"$group": {"_id": None, "total": {"$sum": "$points"}}}
    ]
    credit_result = await db.loyalty_transactions.aggregate(pipeline_credit).to_list(1)
    total_issued = credit_result[0]["total"] if credit_result else 0
    
    # Get total points redeemed
    pipeline_debit = [
        {"$match": {"type": "debit"}},
        {"$group": {"_id": None, "total": {"$sum": "$points"}}}
    ]
    debit_result = await db.loyalty_transactions.aggregate(pipeline_debit).to_list(1)
    total_redeemed = debit_result[0]["total"] if debit_result else 0
    
    # Get users with points
    users_with_points = await db.users.count_documents({"loyalty_points": {"$gt": 0}})
    
    # Get top users by points
    top_users = await db.users.find(
        {"loyalty_points": {"$gt": 0}},
        {"_id": 0, "name": 1, "phone": 1, "loyalty_points": 1}
    ).sort([("loyalty_points", -1)]).limit(10).to_list(10)
    
    return {
        "total_points_issued": total_issued,
        "total_points_redeemed": total_redeemed,
        "points_in_circulation": total_issued - total_redeemed,
        "users_with_points": users_with_points,
        "top_users": top_users
    }


# ============ EVARA - Women's Wellness & Care Program ============

# Evara System Message for AI
EVARA_SYSTEM_MESSAGE = """You are Evara, a compassionate and knowledgeable women's wellness companion by Nevika Cura Healthcare. 

Your role is to:
- Provide empathetic, non-judgmental support for women's health topics
- Offer educational information about menstrual health, pregnancy, PCOS, menopause, and general wellness
- Give lifestyle and nutrition guidance appropriate to the user's life stage
- Send gentle reminders and encouragement

IMPORTANT RULES:
1. NEVER provide medical diagnosis or prescriptions
2. NEVER replace professional medical consultation
3. Always include appropriate disclaimers
4. If user reports severe symptoms (heavy bleeding, severe pain, pregnancy danger signs, mental health crisis), immediately advise seeking medical help
5. Use warm, caring, and professional language
6. Respect privacy and sensitivity of topics
7. Be culturally aware and inclusive

Always end responses about health concerns with: "For personalized medical advice, please consult with a healthcare professional."

You support women through:
- Adolescence & Young Adult (15-25): Period tracking, PMS education, lifestyle tips
- Reproductive Age (25-40): PCOS management, hormonal balance, pregnancy planning
- Pregnancy: Week-by-week guidance, antenatal education, danger sign awareness
- Perimenopause & Menopause (40+): Lifestyle care, bone health, mental wellbeing
"""

# Evara Pydantic Models
class EvaraProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    age: int
    marital_status: Optional[str] = None  # single, married, other
    pregnancy_status: str  # no, yes, planning
    menstrual_status: str  # regular, irregular, menopausal
    known_conditions: Optional[List[str]] = []  # PCOS, thyroid, diabetes, etc.
    weight: Optional[float] = None
    height: Optional[float] = None
    lifestyle_goals: Optional[List[str]] = []
    preferred_language: str = "English"
    assigned_programs: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EvaraOnboarding(BaseModel):
    age: int
    marital_status: Optional[str] = None
    pregnancy_status: str
    menstrual_status: str
    known_conditions: Optional[List[str]] = []
    weight: Optional[float] = None
    height: Optional[float] = None
    lifestyle_goals: Optional[List[str]] = []
    preferred_language: str = "English"

class EvaraChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

class EvaraReminder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str  # period, medication, appointment, wellness_checkin, pregnancy_week
    title: str
    message: str
    scheduled_date: str
    scheduled_time: str
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None  # daily, weekly, monthly
    is_active: bool = True
    last_sent: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EvaraReminderCreate(BaseModel):
    type: str
    title: str
    message: str
    scheduled_date: str
    scheduled_time: str
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None

# Evara Program Definitions
EVARA_PROGRAMS = {
    "menstrual_health": {
        "name": "Menstrual Health & Period Tracking",
        "description": "Track your cycle, understand your body, and manage PMS effectively",
        "age_range": [15, 50],
        "features": ["Period tracking", "PMS education", "Symptom logging", "Cycle predictions"]
    },
    "pcos_hormonal": {
        "name": "PCOS & Hormonal Balance Program",
        "description": "Comprehensive support for managing PCOS and hormonal health",
        "age_range": [18, 45],
        "conditions": ["PCOS"],
        "features": ["Symptom tracking", "Diet plans", "Exercise guidance", "Progress monitoring"]
    },
    "pregnancy_support": {
        "name": "Pregnancy Education & Support",
        "description": "Your companion through the beautiful journey of pregnancy",
        "pregnancy_status": ["yes", "planning"],
        "features": ["Week-by-week guidance", "Antenatal education", "Danger sign alerts", "Nutrition tips"]
    },
    "menopause_care": {
        "name": "Menopause & Perimenopause Care",
        "description": "Navigate this transition with confidence and support",
        "menstrual_status": ["menopausal"],
        "age_range": [40, 65],
        "features": ["Symptom management", "Bone health", "Mental wellbeing", "Lifestyle guidance"]
    },
    "wellness_community": {
        "name": "Women's Health Community",
        "description": "A safe space to learn, share, and grow together",
        "age_range": [15, 65],
        "features": ["Educational content", "Monthly live sessions", "Peer support", "Expert Q&A"]
    }
}

def assign_evara_programs(profile: dict) -> List[str]:
    """Auto-assign programs based on user profile"""
    assigned = []
    age = profile.get("age", 25)
    pregnancy_status = profile.get("pregnancy_status", "no")
    menstrual_status = profile.get("menstrual_status", "regular")
    conditions = profile.get("known_conditions", [])
    
    # Always assign wellness community
    assigned.append("wellness_community")
    
    # Menstrual health for non-menopausal women
    if menstrual_status != "menopausal" and 15 <= age <= 50:
        assigned.append("menstrual_health")
    
    # PCOS program if condition present
    if "PCOS" in conditions or "pcos" in [c.lower() for c in conditions]:
        assigned.append("pcos_hormonal")
    
    # Pregnancy support
    if pregnancy_status in ["yes", "planning"]:
        assigned.append("pregnancy_support")
    
    # Menopause care
    if menstrual_status == "menopausal" or age >= 45:
        assigned.append("menopause_care")
    
    return assigned

# Evara AI Chat initialization
from emergentintegrations.llm.chat import LlmChat, UserMessage

evara_chats = {}  # Store chat sessions

async def get_evara_chat(session_id: str, user_context: str = "") -> LlmChat:
    """Get or create Evara AI chat session"""
    if session_id not in evara_chats:
        system_msg = EVARA_SYSTEM_MESSAGE
        if user_context:
            system_msg += f"\n\nUser Context: {user_context}"
        
        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY"),
            session_id=session_id,
            system_message=system_msg
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        evara_chats[session_id] = chat
    
    return evara_chats[session_id]

# Evara Routes
@api_router.post("/evara/onboarding")
async def evara_onboarding(data: EvaraOnboarding, user = Depends(get_current_user_optional)):
    """Complete Evara onboarding and get program assignments"""
    user_id = user["id"] if user else str(uuid.uuid4())
    
    # Check if profile already exists
    existing = await db.evara_profiles.find_one({"user_id": user_id})
    if existing:
        # Update existing profile
        assigned_programs = assign_evara_programs(data.model_dump())
        await db.evara_profiles.update_one(
            {"user_id": user_id},
            {"$set": {
                **data.model_dump(),
                "assigned_programs": assigned_programs,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        profile = await db.evara_profiles.find_one({"user_id": user_id}, {"_id": 0})
    else:
        # Create new profile
        assigned_programs = assign_evara_programs(data.model_dump())
        profile = EvaraProfile(
            user_id=user_id,
            assigned_programs=assigned_programs,
            **data.model_dump()
        ).model_dump()
        profile["created_at"] = profile["created_at"].isoformat()
        profile["updated_at"] = profile["updated_at"].isoformat()
        await db.evara_profiles.insert_one(profile)
        if "_id" in profile:
            del profile["_id"]
    
    # Get program details
    program_details = [
        {**EVARA_PROGRAMS[p], "id": p}
        for p in assigned_programs if p in EVARA_PROGRAMS
    ]
    
    return {
        "success": True,
        "profile": {k: v for k, v in profile.items() if k != "_id"},
        "assigned_programs": program_details,
        "message": "Welcome to Evara! Based on your profile, we've personalized your wellness journey."
    }

@api_router.get("/evara/profile")
async def get_evara_profile(user = Depends(get_current_user_optional)):
    """Get user's Evara profile"""
    if not user:
        raise HTTPException(status_code=401, detail="Please login to access your Evara profile")
    
    profile = await db.evara_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    if not profile:
        return {"has_profile": False, "message": "Please complete onboarding first"}
    
    program_details = [
        {**EVARA_PROGRAMS[p], "id": p}
        for p in profile.get("assigned_programs", []) if p in EVARA_PROGRAMS
    ]
    
    return {
        "has_profile": True,
        "profile": profile,
        "programs": program_details
    }

@api_router.get("/evara/programs")
async def get_evara_programs():
    """Get all available Evara programs"""
    return {
        "programs": [
            {**v, "id": k} for k, v in EVARA_PROGRAMS.items()
        ]
    }

@api_router.get("/evara/program/{program_id}/content")
async def get_program_content(program_id: str, user = Depends(get_current_user_optional)):
    """Get AI-generated content for a specific program"""
    if program_id not in EVARA_PROGRAMS:
        raise HTTPException(status_code=404, detail="Program not found")
    
    program = EVARA_PROGRAMS[program_id]
    
    # Generate content using AI
    try:
        chat = await get_evara_chat(f"content_{program_id}", "")
        prompt = f"""Generate helpful educational content for the "{program['name']}" program. 
        Include:
        1. Overview (2-3 sentences)
        2. Key tips (5 bullet points)
        3. Daily wellness suggestion
        4. A motivational message
        
        Keep it warm, supportive, and educational. Format as JSON with keys: overview, tips, daily_tip, motivation"""
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Try to parse JSON from response
        import json
        try:
            content = json.loads(response)
        except:
            content = {
                "overview": response[:200] if len(response) > 200 else response,
                "tips": ["Stay hydrated", "Get enough sleep", "Exercise regularly", "Eat nutritious food", "Practice self-care"],
                "daily_tip": "Take a moment today to appreciate your body and all it does for you.",
                "motivation": "Every step you take towards wellness is a step towards a healthier, happier you!"
            }
        
        return {
            "program": program,
            "content": content
        }
    except Exception as e:
        logger.error(f"Error generating content: {e}")
        return {
            "program": program,
            "content": {
                "overview": program["description"],
                "tips": program["features"],
                "daily_tip": "Take care of yourself today - you deserve it!",
                "motivation": "Your wellness journey is unique and beautiful. Keep going!"
            }
        }

@api_router.post("/evara/chat")
async def evara_chat(data: EvaraChatMessage, user = Depends(get_current_user_optional)):
    """Chat with Evara AI wellness companion"""
    user_id = user["id"] if user else "guest"
    session_id = data.session_id or f"evara_{user_id}_{datetime.now().strftime('%Y%m%d')}"
    
    # Get user context if available
    user_context = ""
    if user:
        profile = await db.evara_profiles.find_one({"user_id": user["id"]})
        if profile:
            user_context = f"Age: {profile.get('age')}, Pregnancy status: {profile.get('pregnancy_status')}, Menstrual status: {profile.get('menstrual_status')}"
    
    try:
        chat = await get_evara_chat(session_id, user_context)
        response = await chat.send_message(UserMessage(text=data.message))
        
        # Store chat history
        chat_record = {
            "user_id": user_id,
            "session_id": session_id,
            "user_message": data.message,
            "ai_response": response,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.evara_chats.insert_one(chat_record)
        
        return {
            "response": response,
            "session_id": session_id
        }
    except Exception as e:
        logger.error(f"Evara chat error: {e}")
        return {
            "response": "I'm here to help with your wellness journey. For personalized medical advice, please consult with a healthcare professional. How can I support you today?",
            "session_id": session_id,
            "error": True
        }

@api_router.get("/evara/chat/history")
async def get_evara_chat_history(user = Depends(get_current_user_optional)):
    """Get user's chat history with Evara"""
    if not user:
        return {"history": []}
    
    history = await db.evara_chats.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort([("created_at", -1)]).limit(50).to_list(50)
    
    return {"history": history}

# Evara Reminders
@api_router.post("/evara/reminders")
async def create_evara_reminder(data: EvaraReminderCreate, user = Depends(get_current_user_optional)):
    """Create a wellness reminder"""
    if not user:
        raise HTTPException(status_code=401, detail="Please login to set reminders")
    
    reminder = EvaraReminder(
        user_id=user["id"],
        **data.model_dump()
    ).model_dump()
    reminder["created_at"] = reminder["created_at"].isoformat()
    
    await db.evara_reminders.insert_one(reminder)
    if "_id" in reminder: del reminder["_id"]
    
    return {"success": True, "reminder": reminder}

@api_router.get("/evara/reminders")
async def get_evara_reminders(user = Depends(get_current_user_optional)):
    """Get user's wellness reminders"""
    if not user:
        return {"reminders": []}
    
    reminders = await db.evara_reminders.find(
        {"user_id": user["id"], "is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    return {"reminders": reminders}

@api_router.delete("/evara/reminders/{reminder_id}")
async def delete_evara_reminder(reminder_id: str, user = Depends(get_current_user_optional)):
    """Delete a reminder"""
    if not user:
        raise HTTPException(status_code=401, detail="Please login")
    
    result = await db.evara_reminders.delete_one({"id": reminder_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    return {"success": True}

# Period Tracking
@api_router.post("/evara/period/log")
async def log_period(
    start_date: str,
    end_date: Optional[str] = None,
    flow: str = "medium",
    symptoms: Optional[List[str]] = None,
    notes: Optional[str] = None,
    user = Depends(get_current_user_optional)
):
    """Log period data"""
    if not user:
        raise HTTPException(status_code=401, detail="Please login to track your period")
    
    period_log = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "start_date": start_date,
        "end_date": end_date,
        "flow": flow,  # light, medium, heavy
        "symptoms": symptoms or [],
        "notes": notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.evara_period_logs.insert_one(period_log)
    
    # Calculate next predicted period (average 28-day cycle)
    from datetime import timedelta
    start = datetime.strptime(start_date, "%Y-%m-%d")
    next_predicted = (start + timedelta(days=28)).strftime("%Y-%m-%d")
    
    return {
        "success": True,
        "log": {k: v for k, v in period_log.items() if k != "_id"},
        "next_predicted": next_predicted
    }

@api_router.get("/evara/period/history")
async def get_period_history(user = Depends(get_current_user_optional)):
    """Get period tracking history"""
    if not user:
        return {"history": [], "predictions": None}
    
    history = await db.evara_period_logs.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort([("start_date", -1)]).limit(12).to_list(12)
    
    # Calculate average cycle length
    if len(history) >= 2:
        cycles = []
        for i in range(len(history) - 1):
            start1 = datetime.strptime(history[i]["start_date"], "%Y-%m-%d")
            start2 = datetime.strptime(history[i+1]["start_date"], "%Y-%m-%d")
            cycles.append((start1 - start2).days)
        avg_cycle = sum(cycles) // len(cycles) if cycles else 28
    else:
        avg_cycle = 28
    
    # Predict next period
    next_predicted = None
    if history:
        last_start = datetime.strptime(history[0]["start_date"], "%Y-%m-%d")
        next_predicted = (last_start + timedelta(days=avg_cycle)).strftime("%Y-%m-%d")
    
    return {
        "history": history,
        "average_cycle_length": avg_cycle,
        "next_predicted": next_predicted
    }

# ============ EVARA - Pregnancy Week-by-Week Content ============

PREGNANCY_WEEKLY_CONTENT = {
    1: {"title": "Week 1", "baby": "Conception hasn't occurred yet. Your body is preparing for ovulation.", "mom": "Track your cycle and take prenatal vitamins with folic acid.", "size": "N/A", "tip": "Start taking 400mcg folic acid daily."},
    2: {"title": "Week 2", "baby": "Ovulation occurs. The egg is released and may be fertilized.", "mom": "This is your fertile window. Optimal time for conception.", "size": "N/A", "tip": "Stay relaxed and maintain a healthy lifestyle."},
    3: {"title": "Week 3", "baby": "Fertilization! The sperm meets the egg. Cell division begins.", "mom": "You may not feel different yet. The fertilized egg travels to the uterus.", "size": "Poppy seed", "tip": "Avoid alcohol, smoking, and limit caffeine."},
    4: {"title": "Week 4", "baby": "Implantation occurs. The embryo attaches to the uterine wall.", "mom": "You might miss your period. Some women experience light spotting.", "size": "Poppy seed", "tip": "Take a pregnancy test if your period is late."},
    5: {"title": "Week 5", "baby": "Heart begins to form and will start beating soon. Neural tube developing.", "mom": "Morning sickness may begin. Breast tenderness and fatigue common.", "size": "Sesame seed", "tip": "Eat small, frequent meals to combat nausea."},
    6: {"title": "Week 6", "baby": "Heartbeat can be detected on ultrasound! Facial features forming.", "mom": "Increased urination, mood swings, and food aversions.", "size": "Lentil", "tip": "Schedule your first prenatal appointment."},
    7: {"title": "Week 7", "baby": "Arms and legs are forming. Brain growing rapidly.", "mom": "Nausea may peak. Skin changes possible.", "size": "Blueberry", "tip": "Stay hydrated and get plenty of rest."},
    8: {"title": "Week 8", "baby": "All major organs are forming. Baby is now called a fetus.", "mom": "Uterus is growing. Clothes may feel tighter.", "size": "Raspberry", "tip": "Avoid hot tubs and saunas."},
    9: {"title": "Week 9", "baby": "Baby can move, though you can't feel it yet. Tiny muscles forming.", "mom": "Fatigue may increase. Hormones stabilizing.", "size": "Cherry", "tip": "Consider announcing to close family."},
    10: {"title": "Week 10", "baby": "Vital organs are fully formed and starting to function.", "mom": "Belly may start showing slightly. Round ligament pain possible.", "size": "Strawberry", "tip": "Start thinking about maternity clothes."},
    11: {"title": "Week 11", "baby": "Baby's bones are hardening. Fingers and toes separating.", "mom": "Hair and nails may grow faster. Mood improving.", "size": "Fig", "tip": "Maintain regular gentle exercise."},
    12: {"title": "Week 12", "baby": "Reflexes developing. Baby can open and close fingers.", "mom": "Risk of miscarriage decreases significantly. Energy returning.", "size": "Lime", "tip": "Safe to share pregnancy news more widely!"},
    13: {"title": "Week 13 - Second Trimester!", "baby": "Fingerprints forming. Vocal cords developing.", "mom": "Welcome to the second trimester! Energy often increases.", "size": "Peach", "tip": "Many women feel their best in this trimester."},
    14: {"title": "Week 14", "baby": "Baby can make facial expressions. Kidneys producing urine.", "mom": "Appetite may increase. Less nausea for most.", "size": "Lemon", "tip": "Eat iron-rich foods to prevent anemia."},
    15: {"title": "Week 15", "baby": "Baby is practicing breathing movements with amniotic fluid.", "mom": "Nasal congestion common. Skin changes (linea nigra) may appear.", "size": "Apple", "tip": "Use a humidifier for congestion relief."},
    16: {"title": "Week 16", "baby": "Baby can hear sounds! Eyes are moving.", "mom": "You might feel first movements (quickening) - like flutters!", "size": "Avocado", "tip": "Talk or sing to your baby."},
    17: {"title": "Week 17", "baby": "Fat starting to form under skin. Sweat glands developing.", "mom": "Weight gain becoming noticeable. Back pain may start.", "size": "Pomegranate", "tip": "Practice good posture and wear supportive shoes."},
    18: {"title": "Week 18", "baby": "Baby can yawn and hiccup! Ears are in final position.", "mom": "Feeling hungrier. Sleep position adjustments needed.", "size": "Sweet potato", "tip": "Start sleeping on your side."},
    19: {"title": "Week 19", "baby": "Protective coating (vernix) forms on skin.", "mom": "Round ligament pain common. Dizziness possible.", "size": "Mango", "tip": "Rise slowly from sitting or lying down."},
    20: {"title": "Week 20 - Halfway There!", "baby": "Anatomy scan ultrasound! Can find out baby's sex.", "mom": "Belly is clearly visible. May feel baby's sleep/wake cycles.", "size": "Banana", "tip": "Celebrate this milestone!"},
    21: {"title": "Week 21", "baby": "Eyebrows and eyelids fully formed. Baby moving more.", "mom": "Varicose veins may appear. Leg cramps possible.", "size": "Carrot", "tip": "Elevate feet when resting."},
    22: {"title": "Week 22", "baby": "Sense of touch developing. Baby can feel the umbilical cord.", "mom": "Stretch marks may appear. Belly button may pop out.", "size": "Papaya", "tip": "Moisturize belly to help with itching."},
    23: {"title": "Week 23", "baby": "Baby can hear your heartbeat and voice clearly.", "mom": "Braxton Hicks contractions may start (practice contractions).", "size": "Grapefruit", "tip": "Learn the difference between Braxton Hicks and real labor."},
    24: {"title": "Week 24 - Viability!", "baby": "Lungs developing. Baby is now viable outside womb with medical help.", "mom": "Glucose screening test usually done now.", "size": "Cantaloupe", "tip": "Take the glucose test to check for gestational diabetes."},
    25: {"title": "Week 25", "baby": "Baby responds to familiar voices. Hair growing.", "mom": "Hemorrhoids and constipation common. Heartburn may worsen.", "size": "Cauliflower", "tip": "Eat fiber-rich foods and stay hydrated."},
    26: {"title": "Week 26", "baby": "Eyes opening! Baby can see light filtering through.", "mom": "Trouble sleeping. Swelling in feet and ankles.", "size": "Lettuce head", "tip": "Use pillows for support while sleeping."},
    27: {"title": "Week 27", "baby": "Baby practicing breathing movements regularly.", "mom": "End of second trimester approaching. Possible leg cramps.", "size": "Rutabaga", "tip": "Stretch calves before bed."},
    28: {"title": "Week 28 - Third Trimester!", "baby": "Eyes can blink. Baby dreaming during REM sleep.", "mom": "Third trimester begins! More frequent prenatal visits.", "size": "Eggplant", "tip": "Start counting baby kicks daily."},
    29: {"title": "Week 29", "baby": "Muscles and lungs maturing. Baby very active.", "mom": "Shortness of breath as uterus presses on diaphragm.", "size": "Butternut squash", "tip": "Practice relaxation breathing techniques."},
    30: {"title": "Week 30", "baby": "Brain growing rapidly. Baby can regulate own temperature.", "mom": "Heartburn and indigestion common. Mood swings may return.", "size": "Cabbage", "tip": "Eat smaller meals more frequently."},
    31: {"title": "Week 31", "baby": "All five senses are working! Baby getting into position.", "mom": "Frequent urination increases. Trouble getting comfortable.", "size": "Coconut", "tip": "Do pelvic floor exercises (Kegels)."},
    32: {"title": "Week 32", "baby": "Fingernails and toenails fully formed.", "mom": "Braxton Hicks more frequent. Baby shower time!", "size": "Squash", "tip": "Pack your hospital bag."},
    33: {"title": "Week 33", "baby": "Bones hardening (except skull for birth). Less room to move.", "mom": "Waddling gait common. Back pain may increase.", "size": "Pineapple", "tip": "Prenatal massage can help with discomfort."},
    34: {"title": "Week 34", "baby": "Vernix coating thickening. Lungs almost mature.", "mom": "Fatigue returning. Nesting instinct may kick in.", "size": "Cantaloupe", "tip": "Prepare baby's nursery and supplies."},
    35: {"title": "Week 35", "baby": "Baby gaining about half a pound per week now.", "mom": "Pelvic pressure increasing. Baby may 'drop' soon.", "size": "Honeydew melon", "tip": "Review your birth plan with your doctor."},
    36: {"title": "Week 36", "baby": "Baby is considered early term. Most organs fully mature.", "mom": "More pelvic exams. Watch for labor signs.", "size": "Romaine lettuce", "tip": "Know the signs of labor."},
    37: {"title": "Week 37 - Full Term!", "baby": "Baby is full term! Ready for life outside.", "mom": "May lose mucus plug. More Braxton Hicks.", "size": "Winter melon", "tip": "Rest when you can!"},
    38: {"title": "Week 38", "baby": "Organs fully ready. Baby practicing sucking.", "mom": "Cervix may begin dilating. Increased discharge.", "size": "Leek", "tip": "Stay close to home and hospital."},
    39: {"title": "Week 39", "baby": "Brain still developing rapidly. Full-term and ready!", "mom": "May feel more emotional. Water could break anytime.", "size": "Watermelon", "tip": "Trust your body - it knows what to do."},
    40: {"title": "Week 40 - Due Date!", "baby": "Baby is fully developed and ready to meet you!", "mom": "Due date! Only 5% of babies arrive exactly on this day.", "size": "Small pumpkin", "tip": "Stay patient - baby will come when ready!"},
    41: {"title": "Week 41", "baby": "Still growing! May need induction discussion.", "mom": "Doctor will monitor closely. Induction may be discussed.", "size": "Pumpkin", "tip": "Try natural induction methods with doctor approval."},
    42: {"title": "Week 42", "baby": "Post-term. Induction usually recommended.", "mom": "Close monitoring essential. Birth likely imminent.", "size": "Pumpkin", "tip": "Trust your medical team."}
}

@api_router.get("/evara/pregnancy/week/{week}")
async def get_pregnancy_week_content(week: int):
    """Get pregnancy content for a specific week"""
    if week < 1 or week > 42:
        raise HTTPException(status_code=400, detail="Week must be between 1 and 42")
    
    content = PREGNANCY_WEEKLY_CONTENT.get(week, {})
    return {
        "week": week,
        "content": content,
        "trimester": 1 if week <= 12 else (2 if week <= 27 else 3)
    }

@api_router.get("/evara/pregnancy/all-weeks")
async def get_all_pregnancy_weeks():
    """Get all pregnancy week content"""
    return {
        "weeks": [
            {"week": w, **content}
            for w, content in PREGNANCY_WEEKLY_CONTENT.items()
        ]
    }

# ============ EVARA - Home Services Coordination ============

HOME_SERVICES = {
    "postnatal_nurse": {
        "name": "Postnatal Nurse Visit",
        "description": "Professional nurse visits for mother and baby care after delivery",
        "includes": ["Mother health check", "Baby care guidance", "Breastfeeding support", "Wound care"],
        "duration": "1-2 hours per visit",
        "note": "Services coordinated through partner healthcare providers"
    },
    "lactation_consultant": {
        "name": "Lactation Consultant",
        "description": "Expert guidance for breastfeeding challenges",
        "includes": ["Latch assessment", "Feeding positions", "Milk supply issues", "Pumping guidance"],
        "duration": "45-60 minutes",
        "note": "Virtual and home visit options available"
    },
    "physiotherapy": {
        "name": "Women's Physiotherapy",
        "description": "Specialized physiotherapy for prenatal and postnatal care",
        "includes": ["Pelvic floor exercises", "Diastasis recti treatment", "Back pain relief", "Pregnancy exercises"],
        "duration": "45 minutes",
        "note": "Home visits available in select areas"
    },
    "sample_collection": {
        "name": "Home Sample Collection",
        "description": "Lab sample collection at your doorstep",
        "includes": ["Blood tests", "Urine tests", "Prenatal screenings"],
        "duration": "15-20 minutes",
        "note": "Coordinated with Proton Diagnostics",
        "redirect": "/proton"
    }
}

class HomeServiceRequest(BaseModel):
    service_type: str
    preferred_date: str
    preferred_time: str
    address: str
    notes: Optional[str] = None
    phone: str

@api_router.get("/evara/home-services")
async def get_home_services():
    """Get available home services"""
    return {
        "services": [
            {"id": k, **v} for k, v in HOME_SERVICES.items()
        ],
        "disclaimer": "These services are coordinated through our partner providers. Evara facilitates booking but does not directly provide medical services."
    }

@api_router.post("/evara/home-services/request")
async def request_home_service(data: HomeServiceRequest, user = Depends(get_current_user_optional)):
    """Request a home service"""
    if data.service_type not in HOME_SERVICES:
        raise HTTPException(status_code=400, detail="Invalid service type")
    
    service = HOME_SERVICES[data.service_type]
    
    # Create service request record
    request_record = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"] if user else None,
        "service_type": data.service_type,
        "service_name": service["name"],
        "preferred_date": data.preferred_date,
        "preferred_time": data.preferred_time,
        "address": data.address,
        "phone": data.phone,
        "notes": data.notes,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.evara_service_requests.insert_one(request_record)
    
    # Send SMS confirmation
    try:
        message = f"""Evara - Home Service Request Received!

Service: {service['name']}
Date: {data.preferred_date}
Time: {data.preferred_time}

Our team will contact you within 24 hours to confirm.

- Evara by Nevika Cura
  Call: 9403890429"""
        await send_sms_notification(data.phone, message)
    except Exception as e:
        logger.error(f"Failed to send service request SMS: {e}")
    
    return {
        "success": True,
        "request_id": request_record["id"],
        "message": "Your service request has been received. Our team will contact you within 24 hours.",
        "service": service
    }

@api_router.get("/evara/home-services/my-requests")
async def get_my_service_requests(user = Depends(get_current_user_optional)):
    """Get user's service requests"""
    if not user:
        return {"requests": []}
    
    requests = await db.evara_service_requests.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort([("created_at", -1)]).limit(20).to_list(20)
    
    return {"requests": requests}

# ============ EVARA - Live Sessions / Community ============

LIVE_SESSIONS = [
    {
        "id": "period_health_101",
        "title": "Period Health 101",
        "description": "Understanding your menstrual cycle and managing period symptoms",
        "host": "Dr. Priya Sharma, Gynecologist",
        "duration": "45 minutes",
        "topics": ["Cycle phases", "PMS management", "When to see a doctor"],
        "type": "recorded"
    },
    {
        "id": "pcos_lifestyle",
        "title": "Living Well with PCOS",
        "description": "Diet, exercise, and lifestyle tips for managing PCOS",
        "host": "Dr. Neha Patel, Endocrinologist",
        "duration": "60 minutes",
        "topics": ["PCOS diet", "Exercise routines", "Hormonal balance"],
        "type": "recorded"
    },
    {
        "id": "pregnancy_nutrition",
        "title": "Nutrition During Pregnancy",
        "description": "What to eat and avoid for a healthy pregnancy",
        "host": "Dietitian Anjali Mehta",
        "duration": "50 minutes",
        "topics": ["Essential nutrients", "Foods to avoid", "Meal planning"],
        "type": "recorded"
    },
    {
        "id": "breastfeeding_basics",
        "title": "Breastfeeding Basics",
        "description": "Getting started with breastfeeding and overcoming challenges",
        "host": "Lactation Consultant Meera Joshi",
        "duration": "55 minutes",
        "topics": ["Latching techniques", "Common problems", "Pumping tips"],
        "type": "recorded"
    },
    {
        "id": "menopause_wellness",
        "title": "Thriving Through Menopause",
        "description": "Managing menopause symptoms and maintaining wellness",
        "host": "Dr. Sunita Rao, Women's Health Specialist",
        "duration": "50 minutes",
        "topics": ["Symptom management", "HRT options", "Bone health"],
        "type": "recorded"
    },
    {
        "id": "mental_wellness",
        "title": "Mental Health for Women",
        "description": "Addressing anxiety, depression, and emotional wellbeing",
        "host": "Psychologist Dr. Kavita Singh",
        "duration": "45 minutes",
        "topics": ["Stress management", "Self-care practices", "When to seek help"],
        "type": "recorded"
    }
]

@api_router.get("/evara/community/sessions")
async def get_community_sessions():
    """Get available community sessions"""
    return {
        "sessions": LIVE_SESSIONS,
        "upcoming_live": {
            "title": "Monthly Q&A with Gynecologist",
            "description": "Submit your questions and get answers from our expert",
            "next_date": "Last Saturday of every month",
            "time": "11:00 AM IST"
        }
    }

@api_router.post("/evara/community/register/{session_id}")
async def register_for_session(session_id: str, user = Depends(get_current_user_optional)):
    """Register for a community session"""
    session = next((s for s in LIVE_SESSIONS if s["id"] == session_id), None)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    registration = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"] if user else None,
        "session_id": session_id,
        "session_title": session["title"],
        "registered_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.evara_session_registrations.insert_one(registration)
    
    return {
        "success": True,
        "message": f"Registered for {session['title']}",
        "session": session
    }

# ============ EVARA - WhatsApp Reminders ============

@api_router.post("/evara/reminders/whatsapp")
async def set_whatsapp_reminder(
    reminder_type: str,
    phone: str,
    user = Depends(get_current_user_optional)
):
    """Set up WhatsApp reminder preferences"""
    valid_types = ["period", "medication", "appointment", "pregnancy_weekly", "wellness"]
    if reminder_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid type. Choose from: {valid_types}")
    
    preference = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"] if user else None,
        "phone": phone,
        "reminder_type": reminder_type,
        "channel": "sms",  # Using SMS as WhatsApp requires business setup
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Check if preference exists
    existing = await db.evara_reminder_preferences.find_one({
        "phone": phone,
        "reminder_type": reminder_type
    })
    
    if existing:
        await db.evara_reminder_preferences.update_one(
            {"_id": existing["_id"]},
            {"$set": {"is_active": True}}
        )
    else:
        await db.evara_reminder_preferences.insert_one(preference)
    
    # Send confirmation SMS
    try:
        message = f"""Evara - Reminder Set! ✓

Type: {reminder_type.replace('_', ' ').title()}
Channel: SMS

You'll receive reminders on this number.

To stop: Reply STOP

- Evara by Nevika Cura"""
        await send_sms_notification(phone, message)
    except Exception as e:
        logger.error(f"Failed to send reminder confirmation: {e}")
    
    return {
        "success": True,
        "message": f"{reminder_type.replace('_', ' ').title()} reminders activated via SMS",
        "note": "WhatsApp reminders will be available once WhatsApp Business is configured."
    }


@app.api_route("/api/", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
@app.api_route("/api", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def api_root_handler():
    """Root API endpoint - returns API info"""
    return {
        "name": "Nevika Cura API",
        "version": "1.0.0",
        "status": "healthy",
        "services": ["diagyn", "proton", "pharmacy", "evara", "staff", "admin"]
    }

# ============ HEALTH RECORDS STORAGE ============

class HealthRecordUpload(BaseModel):
    record_type: str  # prescription, lab_report, other
    title: str
    notes: Optional[str] = None
    file_url: str
    date: Optional[str] = None

@api_router.get("/health-records")
async def get_health_records(user = Depends(get_current_user)):
    """Get user's health records"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    records = await db.health_records.find(
        {"user_id": user.id},
        {"_id": 0}
    ).sort([("created_at", -1)]).to_list(100)
    return {"records": records}

@api_router.post("/health-records")
async def upload_health_record(data: HealthRecordUpload, user = Depends(get_current_user)):
    """Upload a health record"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    record = {
        "id": str(uuid.uuid4()),
        "user_id": user.id,
        "record_type": data.record_type,
        "title": data.title,
        "notes": data.notes,
        "file_url": data.file_url,
        "date": data.date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.health_records.insert_one(record)
    return {"success": True, "record": {k: v for k, v in record.items() if k != "_id"}}

@api_router.delete("/health-records/{record_id}")
async def delete_health_record(record_id: str, user = Depends(get_current_user)):
    """Delete a health record"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    result = await db.health_records.delete_one({"id": record_id, "user_id": user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"success": True}

# ============ MEDICINE REORDER ============

@api_router.get("/pharmacy/reorder/{order_id}")
async def get_reorder_details(order_id: str, user = Depends(get_current_user)):
    """Get details of a previous order for reordering"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    order = await db.pharmacy_orders.find_one(
        {"id": order_id, "user_id": user.id},
        {"_id": 0}
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return {
        "medicines": order.get("medicines", []),
        "delivery_address": order.get("delivery_address", ""),
        "patient_name": order.get("patient_name", ""),
        "patient_phone": order.get("patient_phone", "")
    }

# ============ DOCTOR AVAILABILITY CALENDAR ============

@api_router.get("/doctors/availability")
async def get_doctors_availability(days: int = 7):
    """Get all doctors' availability for the next N days"""
    from datetime import timedelta
    
    doctors = [
        {"id": "doc_neha", "name": "Dr. Neha", "clinic": "Pushpa Clinic"},
        {"id": "doc_vikas", "name": "Dr. Vikas", "clinic": "Amnion Clinic"}
    ]
    
    today = datetime.now(timezone.utc).date()
    availability = []
    
    for doctor in doctors:
        doctor_slots = []
        for i in range(days):
            date = today + timedelta(days=i)
            date_str = date.strftime("%Y-%m-%d")
            
            # Get booked slots for this doctor on this date
            booked = await db.appointments.find({
                "doctor": doctor["name"],
                "date": date_str,
                "status": {"$in": ["pending", "Booked", "In Clinic"]}
            }).to_list(100)
            
            booked_times = [apt.get("time") for apt in booked]
            
            # Define all available time slots
            all_slots = [
                "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
                "12:00 PM", "12:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
                "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM", "06:00 PM"
            ]
            
            available_slots = [s for s in all_slots if s not in booked_times]
            
            doctor_slots.append({
                "date": date_str,
                "day": date.strftime("%A"),
                "available_count": len(available_slots),
                "booked_count": len(booked_times),
                "available_slots": available_slots[:5]  # Show first 5 for preview
            })
        
        availability.append({
            "doctor": doctor,
            "slots": doctor_slots
        })
    
    return {"availability": availability}

# ============ APPOINTMENT REMINDERS ============

@api_router.post("/appointments/{appointment_id}/send-reminder")
async def send_appointment_reminder(appointment_id: str):
    """Manually send appointment reminder SMS"""
    appointment = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    phone = appointment.get("patient_phone")
    if not phone:
        raise HTTPException(status_code=400, detail="No phone number on appointment")
    
    message = f"""Reminder: DiaGyn Healthcare

Your appointment is scheduled:
Doctor: {appointment.get('doctor')}
Date: {appointment.get('date')}
Time: {appointment.get('time')}
Clinic: {appointment.get('clinic')}

Please arrive 10 mins early.
Note: This is arrival time, not consultation time.

Call: 9403890429
WhatsApp: 7039020020"""
    
    try:
        await send_sms_notification(phone, message)
        return {"success": True, "message": "Reminder sent"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ WHATSAPP SHARE FOR EVARA ============

@api_router.get("/evara/share/{content_type}")
async def get_evara_share_content(content_type: str):
    """Get shareable WhatsApp content for Evara educational material"""
    share_content = {
        "pcos_guide": {
            "title": "PCOS Guide",
            "message": "🌸 *Understanding PCOS* 🌸\n\nLearn about symptoms, diet plans, and exercise routines for managing PCOS.\n\n✅ Symptoms & Diagnosis\n✅ PCOS-Friendly Diet\n✅ Weekly Exercise Plan\n\nDownload Nevika Cura app for the complete guide!\n\n#PCOSAwareness #WomensHealth"
        },
        "pms_guide": {
            "title": "PMS Guide", 
            "message": "🌷 *Understanding PMS* 🌷\n\nTips to manage premenstrual syndrome effectively.\n\n✅ Physical & Emotional Symptoms\n✅ Dietary Changes\n✅ Exercise & Lifestyle Tips\n\nDownload Nevika Cura app for more!\n\n#PMS #WomensWellness"
        },
        "pregnancy_tips": {
            "title": "Pregnancy Tips",
            "message": "🤰 *Pregnancy Week-by-Week Guide* 🤰\n\nTrack your baby's development from week 1 to 42!\n\n✅ Baby's size & growth\n✅ Mom's body changes\n✅ Weekly tips\n\nDownload Nevika Cura app!\n\n#Pregnancy #MomToBe"
        }
    }
    
    if content_type not in share_content:
        raise HTTPException(status_code=404, detail="Content type not found")
    
    content = share_content[content_type]
    message = content['message'].replace(' ', '%20').replace('\n', '%0A')
    whatsapp_url = f"https://wa.me/?text={message}"
    
    return {
        "title": content["title"],
        "message": content["message"],
        "whatsapp_url": whatsapp_url
    }

# ============ OMNIA - DIABETES CARE PORTAL ============

class OmniaProfile(BaseModel):
    diabetesType: str
    age: str
    gender: str
    height: Optional[str] = None
    weight: Optional[str] = None
    medications: Optional[str] = None

class SugarLog(BaseModel):
    type: str  # fbs, ppbs, random
    value: str
    date: str
    time: Optional[str] = None

@api_router.get("/omnia/profile")
async def get_omnia_profile(user = Depends(get_current_user)):
    """Get user's Omnia diabetes profile"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    profile = await db.omnia_profiles.find_one(
        {"user_id": user.id},
        {"_id": 0}
    )
    return {"profile": profile}

@api_router.post("/omnia/profile")
async def save_omnia_profile(data: OmniaProfile, user = Depends(get_current_user)):
    """Save or update user's Omnia diabetes profile"""
    profile_data = {
        "user_id": user["id"],
        "diabetesType": data.diabetesType,
        "age": data.age,
        "gender": data.gender,
        "height": data.height,
        "weight": data.weight,
        "medications": data.medications,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.omnia_profiles.update_one(
        {"user_id": user["id"]},
        {"$set": profile_data},
        upsert=True
    )
    
    return {"success": True, "message": "Profile saved"}

@api_router.get("/omnia/sugar-logs")
async def get_sugar_logs(user = Depends(get_current_user)):
    """Get user's blood sugar logs"""
    logs = await db.omnia_sugar_logs.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort([("date", -1), ("time", -1)]).to_list(100)
    return {"logs": logs}

@api_router.post("/omnia/sugar-logs")
async def add_sugar_log(data: SugarLog, user = Depends(get_current_user)):
    """Add a new blood sugar reading"""
    log = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "type": data.type,
        "value": data.value,
        "date": data.date,
        "time": data.time or "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.omnia_sugar_logs.insert_one(log)
    
    # Check for abnormal values and flag
    value = int(data.value)
    alert = None
    if value < 70:
        alert = "low"
    elif value > 250:
        alert = "very_high"
    elif value > 180:
        alert = "high"
    
    return {
        "success": True, 
        "log": {k: v for k, v in log.items() if k != "_id"},
        "alert": alert
    }

@api_router.delete("/omnia/sugar-logs/{log_id}")
async def delete_sugar_log(log_id: str, user = Depends(get_current_user)):
    """Delete a blood sugar log"""
    result = await db.omnia_sugar_logs.delete_one(
        {"id": log_id, "user_id": user["id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Log not found")
    return {"success": True}

@api_router.get("/omnia/sugar-stats")
async def get_sugar_stats(user = Depends(get_current_user)):
    """Get blood sugar statistics for the user"""
    logs = await db.omnia_sugar_logs.find(
        {"user_id": user["id"]}
    ).to_list(1000)
    
    if not logs:
        return {"stats": None}
    
    fbs_values = [int(l["value"]) for l in logs if l.get("type") == "fbs"]
    ppbs_values = [int(l["value"]) for l in logs if l.get("type") == "ppbs"]
    
    stats = {
        "total_readings": len(logs),
        "fbs": {
            "count": len(fbs_values),
            "avg": round(sum(fbs_values) / len(fbs_values)) if fbs_values else None,
            "min": min(fbs_values) if fbs_values else None,
            "max": max(fbs_values) if fbs_values else None
        },
        "ppbs": {
            "count": len(ppbs_values),
            "avg": round(sum(ppbs_values) / len(ppbs_values)) if ppbs_values else None,
            "min": min(ppbs_values) if ppbs_values else None,
            "max": max(ppbs_values) if ppbs_values else None
        }
    }
    
    return {"stats": stats}

# Include router AFTER all routes are defined
app.include_router(api_router)

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
