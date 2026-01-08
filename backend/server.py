from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Header, Query
from fastapi.responses import RedirectResponse
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

# Initialize Resend
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

async def send_email_notification(subject: str, html_content: str):
    """Send email notification using Resend"""
    if not RESEND_API_KEY:
        logger.warning("Resend API key not configured, skipping email notification")
        return None
    
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [NOTIFICATION_EMAIL],
            "subject": subject,
            "html": html_content
        }
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent successfully: {email.get('id')}")
        return email
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return None

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
    await send_email_notification("New User Registration - Nevika Cura", email_html)
    
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
    appointment = Appointment(
        user_id=user.id if user else None,
        **input.model_dump()
    )
    
    doc = appointment.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.appointments.insert_one(doc)
    logger.info(f"Appointment created: {appointment.id}")
    
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
    """
    await send_email_notification(f"New Appointment - {appointment.doctor} on {appointment.date}", email_html)
    
    return appointment

@api_router.get("/appointments/booked-slots")
async def get_booked_slots(doctor: str, clinic: str, date: str):
    """Get booked slots for a specific doctor, clinic, and date"""
    booked = await db.appointments.find(
        {"doctor": doctor, "clinic": clinic, "date": date},
        {"_id": 0, "time": 1}
    ).to_list(100)
    
    return {"booked_slots": [b["time"] for b in booked]}

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
    
    # Send email notification for new diagnostic order
    tests_list = "<br>".join([f"• {test}" for test in order.tests])
    email_html = f"""
    <h2>🔬 New Proton Diagnostics Order</h2>
    <h3>Tests Ordered:</h3>
    <p>{tests_list}</p>
    <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Preferred Date:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{order.preferred_date}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Prescription:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{order.prescription_url or 'Not uploaded'}</td></tr>
    </table>
    <h3>Patient Details</h3>
    <p><strong>Name:</strong> {order.patient_name}</p>
    <p><strong>Phone:</strong> {order.patient_phone}</p>
    <p><strong>Email:</strong> {order.patient_email or 'Not provided'}</p>
    <p><strong>Ordered at:</strong> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC</p>
    """
    await send_email_notification(f"New Diagnostic Order - {order.patient_name}", email_html)
    
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
    
    # Send email notification for new pharmacy order
    medicines_list = "<br>".join([f"• {m.get('name', 'Unknown')} (Qty: {m.get('quantity', 1)})" for m in order.medicines])
    email_html = f"""
    <h2>💊 New Orange Pharmacy Order</h2>
    <h3>Medicines Ordered:</h3>
    <p>{medicines_list}</p>
    <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Delivery Address:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{order.delivery_address or 'Not provided'}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Prescription:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{order.prescription_url or 'Not uploaded'}</td></tr>
    </table>
    <h3>Customer Details</h3>
    <p><strong>Name:</strong> {order.patient_name}</p>
    <p><strong>Phone:</strong> {order.patient_phone}</p>
    <p><strong>Email:</strong> {order.patient_email or 'Not provided'}</p>
    <p><strong>Ordered at:</strong> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC</p>
    """
    await send_email_notification(f"New Pharmacy Order - {order.patient_name}", email_html)
    
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

# Medicine inventory for Orange Pharmacy - Updated from complete stock files January 2026
MEDICINE_INVENTORY = [
    {"name": "3 KAT 60 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "A TO Z DROPS", "form": "Drops", "company": "Generic"},
    {"name": "A TO Z GOLD CAPS", "form": "Capsule", "company": "Generic"},
    {"name": "A TO Z NS TAB", "form": "Tablet", "company": "Generic"},
    {"name": "A TO Z SYP", "form": "Syrup", "company": "Generic"},
    {"name": "A TO Z WOMEN CAP", "form": "Capsule", "company": "Generic"},
    {"name": "ABENDOL 10 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ABSOLUT GOLD CAP", "form": "Capsule", "company": "Generic"},
    {"name": "ABSOLUT WOMAN CAP", "form": "Capsule", "company": "Generic"},
    {"name": "ACE PROXYVON TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ACECLO 100MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ACECLO PLUS TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ACEFLAM SP TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ACEMIZ MR TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ACEMIZ S TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ACIBAN 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ACIBAN 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ACIGENE MINT GEL SUSP", "form": "Cream", "company": "Generic"},
    {"name": "ACILOC 150MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ACILOC 300MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ACITROM 0.5MG", "form": "Tablet", "company": "Generic"},
    {"name": "ACITROM 1MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ACITROM 2MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ACITROM 3MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ACITROM 4MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ACTIGUT CAP", "form": "Capsule", "company": "Generic"},
    {"name": "ACTIGUUT CAP", "form": "Capsule", "company": "Generic"},
    {"name": "ACULAR LS DROPS", "form": "Drops", "company": "Generic"},
    {"name": "ACUPERA TH 4 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ADDYZOA CAPS", "form": "Capsule", "company": "Generic"},
    {"name": "ADIGESIC MR TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ADVANT 625MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ADVENT 228.5 DRY SYP", "form": "Syrup", "company": "Generic"},
    {"name": "ADVENT FORTE 457 SYP", "form": "Syrup", "company": "Generic"},
    {"name": "AEROCORT FORTE ROTACAPS", "form": "Capsule", "company": "Generic"},
    {"name": "AEROCORT INHR", "form": "Inhaler", "company": "Generic"},
    {"name": "AEROCORT ROTCAP", "form": "Capsule", "company": "Generic"},
    {"name": "AJANTAS CALAMINE LOTION", "form": "Lotion", "company": "Generic"},
    {"name": "AKASH AYURVEDIC SOAP", "form": "Soap", "company": "Generic"},
    {"name": "ALBAYES SYP", "form": "Syrup", "company": "Generic"},
    {"name": "ALBAYES TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ALCIFLOX D DROP", "form": "Drops", "company": "Generic"},
    {"name": "ALCIFLOX D EYE DROPS", "form": "Drops", "company": "Generic"},
    {"name": "ALERID D TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ALERID SYP", "form": "Syrup", "company": "Generic"},
    {"name": "ALERID TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ALFA KETOSEN TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ALFOO TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ALICLAIR 125 SYP", "form": "Syrup", "company": "Generic"},
    {"name": "ALICLAIR 250 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ALICLAIR 250MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ALICLAIR 500 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ALKACIP SYP", "form": "Syrup", "company": "Generic"},
    {"name": "ALKOF DX SYP", "form": "Syrup", "company": "Generic"},
    {"name": "ALKOF JUNIOR SYP", "form": "Syrup", "company": "Generic"},
    {"name": "ALKOF LS PLUS SYP", "form": "Syrup", "company": "Generic"},
    {"name": "ALKOF LS SYP", "form": "Syrup", "company": "Generic"},
    {"name": "ALKOF ORANGE SYP", "form": "Syrup", "company": "Generic"},
    {"name": "ALLEGRA 120MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ALLEGRA 180MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ALLEGRA SUSPENSION", "form": "Tablet", "company": "Generic"},
    {"name": "ALLERFEX M TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ALLUGEL O SYP", "form": "Syrup", "company": "Generic"},
    {"name": "ALMOX CV 625 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ALNURO PLUS CAP", "form": "Capsule", "company": "Generic"},
    {"name": "ALPHA CAD TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ALPHA KETONAVAG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ALPHAGAN EYE DROPS", "form": "Drops", "company": "Generic"},
    {"name": "ALPHAGAN P EYE DROPS", "form": "Drops", "company": "Generic"},
    {"name": "ALPHAGAN Z E DROPS", "form": "Drops", "company": "Generic"},
    {"name": "ALTHROCIN 250MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ALTHROCIN 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ALTHROCIN DROPS", "form": "Drops", "company": "Generic"},
    {"name": "ALTHROCIN SYP", "form": "Syrup", "company": "Generic"},
    {"name": "ALTIVA 120MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ALZYME SYP", "form": "Syrup", "company": "Generic"},
    {"name": "AMANTRAL TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AMARYL 1MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AMARYL 2MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AMARYL 3MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AMARYL M FORTE 1MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AMARYL M FORTE 2MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AMARYL M1MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AMARYL M2MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AMARYL MV 1MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AMARYL MV 2MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AMBRODIL S SYRUP", "form": "Syrup", "company": "Generic"},
    {"name": "AMBRODIL SYP", "form": "Syrup", "company": "Generic"},
    {"name": "AMLIP 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AMLOBIG 5 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AMLOBIG AT TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AMLOKIND 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AMLOPRES AT TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AMLOPRESS 2.5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AMLOPRESS 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AMLOPRESS AT 25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AMLOPRESS TL TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AMLOSAFE 2.5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AMLOSAFE 3D TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AMLOSAFE 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AMLOSAFE AT TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AMOXYCLAV 375 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AMOXYCLAV 625MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AMPOXIN CV 375MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AMPOXIN CV 625MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AMPOXIN CV FORTE SYP", "form": "Syrup", "company": "Generic"},
    {"name": "AMPOXIN CV SUSP", "form": "Tablet", "company": "Generic"},
    {"name": "AMROLTRU SOLUTION", "form": "Solution", "company": "Generic"},
    {"name": "AMROX JUNIOR SYP", "form": "Syrup", "company": "Generic"},
    {"name": "ANERGEN TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ANGICAM 2.5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ANGICAM BETA TAB", "form": "Tablet", "company": "Generic"},
    {"name": "APARCARMINE RAFT SYP", "form": "Syrup", "company": "Generic"},
    {"name": "APPECIA BF TAB", "form": "Tablet", "company": "Generic"},
    {"name": "APTISATRT SYP", "form": "Syrup", "company": "Generic"},
    {"name": "AQUAGERMINA RESP", "form": "Inhaler", "company": "Generic"},
    {"name": "ARADIM CREAM", "form": "Cream", "company": "Generic"},
    {"name": "ARADIM OINT", "form": "Cream", "company": "Generic"},
    {"name": "ARGIGEM SACHET", "form": "Powder", "company": "Generic"},
    {"name": "ARGIHYPE SACHET", "form": "Powder", "company": "Generic"},
    {"name": "ARILIZAR LIQUID", "form": "Syrup", "company": "Generic"},
    {"name": "ARISTO EMEGON SYP", "form": "Syrup", "company": "Generic"},
    {"name": "ARISTO FEBU 40 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ARISTO NEXOM RD CAP", "form": "Capsule", "company": "Generic"},
    {"name": "ARISTOMOX CV 625 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ARISTONEUROL OD TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ARISTONEUROL PLUS CAP", "form": "Capsule", "company": "Generic"},
    {"name": "ARISTONEUROL PLUS TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ARISTOVERT 16 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ARISTOVERT 16MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ARISTOZYME DROPS", "form": "Drops", "company": "Generic"},
    {"name": "ARISTOZYME LIQ", "form": "Tablet", "company": "Generic"},
    {"name": "AROLAC POWDER", "form": "Powder", "company": "Generic"},
    {"name": "ASCAZIN TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ASCODEX JR LS DRP", "form": "Tablet", "company": "Generic"},
    {"name": "ASCODEX LS JUNIOR SYP", "form": "Syrup", "company": "Generic"},
    {"name": "ASTHALIN 2MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ASTHALIN 4MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ASTHALIN CFC INH", "form": "Inhaler", "company": "Generic"},
    {"name": "ASTHALIN RESP SOLUTION", "form": "Inhaler", "company": "Generic"},
    {"name": "ASTHALIN ROTACAPS", "form": "Capsule", "company": "Generic"},
    {"name": "ASTHALIN SYP", "form": "Syrup", "company": "Generic"},
    {"name": "ATARAX 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATARAX 25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATARAX DROPS", "form": "Drops", "company": "Generic"},
    {"name": "ATARAX SYP", "form": "Syrup", "company": "Generic"},
    {"name": "ATAREX SYP", "form": "Syrup", "company": "Generic"},
    {"name": "ATARISE 10 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATCHOL 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATCHOL 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATCHOL 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATOCOR 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATOCOR 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATORBEST 10 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATORBEST 20 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATORBEST 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATORFIT 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATORFIT 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATORFIT CV 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATORFIT CV 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATORLIP 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATORLIP 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATORLIP 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATORLIP 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATORSAVE 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATORSAVE 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATORVAKIND 10 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATOSAVE 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATOSAVE CV 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATOSTA 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATOSTA 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATOSTA 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATOSTA F TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATOZYME TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AVACRD AT TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AVEENO BABY WASH", "form": "Soap", "company": "Generic"},
    {"name": "AVIL 25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AVIL 50MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AVOMINE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AZEE 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AZICIP 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AZIKIND 250 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AZIKIND 500 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AZITHRAL 250MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AZITHRAL 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "AZITHRAL LIQUID", "form": "Syrup", "company": "Generic"},
    {"name": "B COMPLEX INJ", "form": "Injection", "company": "Generic"},
    {"name": "B METHYL 16 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "B METHYL 4MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "B PROTIN CHOC", "form": "Tablet", "company": "Generic"},
    {"name": "BACTRIM DS TAB", "form": "Tablet", "company": "Generic"},
    {"name": "BASALOG 5ML VIAL", "form": "Injection", "company": "Generic"},
    {"name": "BASALOG REFIL", "form": "Tablet", "company": "Generic"},
    {"name": "BECOSULE Z CAPS", "form": "Capsule", "company": "Generic"},
    {"name": "BECOSULES CAPS", "form": "Capsule", "company": "Generic"},
    {"name": "BECOZINC CAPS", "form": "Capsule", "company": "Generic"},
    {"name": "BECOZINC Z CAPS", "form": "Capsule", "company": "Generic"},
    {"name": "BECOZYME C FORTE", "form": "Tablet", "company": "Generic"},
    {"name": "BELIV AF TAB", "form": "Tablet", "company": "Generic"},
    {"name": "BENADRYL DR SYP", "form": "Syrup", "company": "Generic"},
    {"name": "BENADRYL SYP", "form": "Syrup", "company": "Generic"},
    {"name": "BENDEX 400 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "BENDEX CHERRY SYP", "form": "Syrup", "company": "Generic"},
    {"name": "BEPLEX FORTE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "BEROBAC LOTION", "form": "Lotion", "company": "Generic"},
    {"name": "BESIFLAM SYP", "form": "Syrup", "company": "Generic"},
    {"name": "BETADERM N CREAM", "form": "Cream", "company": "Generic"},
    {"name": "BETADINE PESSARY", "form": "Suppository", "company": "Generic"},
    {"name": "BETALOC 25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "BETALOC 50MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "BETONIN AST SYP", "form": "Syrup", "company": "Generic"},
    {"name": "BEVON TAB", "form": "Tablet", "company": "Generic"},
    {"name": "BIG FLEX TAB", "form": "Tablet", "company": "Generic"},
    {"name": "BIOFERRIN Z PLUS TAB", "form": "Tablet", "company": "Generic"},
    {"name": "BIOFRESH MOUTH WASH", "form": "Soap", "company": "Generic"},
    {"name": "BIOSKIN SOAP", "form": "Soap", "company": "Generic"},
    {"name": "BIS BETA 2.5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "BIS BETA 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "BLOSSOM TAB", "form": "Tablet", "company": "Generic"},
    {"name": "BRILINTA 90MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "BROCOMAX PLUS TAB", "form": "Tablet", "company": "Generic"},
    {"name": "BROM HEX ELIXIR SYP", "form": "Syrup", "company": "Generic"},
    {"name": "BROTIN DS SYP", "form": "Syrup", "company": "Generic"},
    {"name": "BRUFEN 200MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "BRUFEN 400MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "BRUFEN 600MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "BUDECORT 0.5MG REPSULES", "form": "Tablet", "company": "Generic"},
    {"name": "BUDECORT 100MG INHLR", "form": "Inhaler", "company": "Generic"},
    {"name": "BUDECORT 200MG INHLR", "form": "Inhaler", "company": "Generic"},
    {"name": "BUDECORT 200MG R CAP", "form": "Capsule", "company": "Generic"},
    {"name": "BUDECORT 400MG R C", "form": "Tablet", "company": "Generic"},
    {"name": "BUDESAL 0.5MG REPS", "form": "Tablet", "company": "Generic"},
    {"name": "BUDICORT 200 CFC INH", "form": "Inhaler", "company": "Generic"},
    {"name": "BURNOL OINT", "form": "Cream", "company": "Generic"},
    {"name": "BUSCOGAST TAB", "form": "Tablet", "company": "Generic"},
    {"name": "C CARDIN PLUS TAB", "form": "Tablet", "company": "Generic"},
    {"name": "C NIFLO UD DROPS", "form": "Drops", "company": "Generic"},
    {"name": "C24 CREAM", "form": "Cream", "company": "Generic"},
    {"name": "CALAPTIN 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CALAPTIN 80MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CALBOT D3 SACHET", "form": "Powder", "company": "Generic"},
    {"name": "CALCIBEST GOLD TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CALCIBEST TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CALCIROL GRANULES", "form": "Powder", "company": "Generic"},
    {"name": "CALCIUM SANDOZ", "form": "Tablet", "company": "Generic"},
    {"name": "CANDEX V 200MG CAP", "form": "Capsule", "company": "Generic"},
    {"name": "CANDILA POWDER", "form": "Powder", "company": "Generic"},
    {"name": "CARBOPHAGE SR 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CARDACE 1.25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CARDACE 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CARDACE 2.5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CARDACE AM 2.5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CARDACE AM 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CARDACE H 2.5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CARDACE H 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CARDACE PROTECT TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CARDORONE X 200MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CAREPHAGE 500 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CAREPHAGE G1 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CAREPHAGE G2 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CAREPHAGE MV1 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CAREPHAGE PM1 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CARIPILL TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CARLOC 12.5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CARLOC 3.125MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CARLOC 6.25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CARVI BETA 3.125MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CARVI BETA 6.25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CARVIBETA 12.5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CEFOLAC 200 DT TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CEFOLAC 200MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CEFOLAC CV DRY SYP", "form": "Syrup", "company": "Generic"},
    {"name": "CEFOLAC O 200MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CEFOQUIN 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CEFOVIX 200 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CEFOVIX CV TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CEFOVIX O DRY SYP", "form": "Syrup", "company": "Generic"},
    {"name": "CETAPIN XR 1000MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CETAPIN XR 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CETRIZINE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CETZINE SYP", "form": "Syrup", "company": "Generic"},
    {"name": "CETZINE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CHEERIO GEL", "form": "Cream", "company": "Generic"},
    {"name": "CHERISTIN DHA CAP", "form": "Capsule", "company": "Generic"},
    {"name": "CIDMUS 100MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CIDMUS 200MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CIDMUS 50MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CIGAPAN TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CILACAR T TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CINOD 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CINOD 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CINOD 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CINOD T TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CINOD TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CIPLADINE OINT", "form": "Cream", "company": "Generic"},
    {"name": "CIPLADINE SOLUTION", "form": "Solution", "company": "Generic"},
    {"name": "CIPLAR 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CIPLAR 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CIPLAR LA 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CIPLAR LA 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CIPLOX 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CIPLOX D E DROPS", "form": "Drops", "company": "Generic"},
    {"name": "CIPLOX E E DROPS", "form": "Drops", "company": "Generic"},
    {"name": "CIPLOX TZ TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CIRCUFIT TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CITICOLINE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CITNEURON L TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CLAVAM 375 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CLAVAM 625 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CLAVAM BID DRY SYP", "form": "Syrup", "company": "Generic"},
    {"name": "CLAVAM DROPS", "form": "Drops", "company": "Generic"},
    {"name": "CLAVAM DRY SYP", "form": "Syrup", "company": "Generic"},
    {"name": "CLOCIP B CREAM", "form": "Cream", "company": "Generic"},
    {"name": "CLOCIP CREAM", "form": "Cream", "company": "Generic"},
    {"name": "CLOMIFENE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CLONAFIT 0.5 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CLOPIVAS 75MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CLOPIVAS AP 150MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CLOPIVAS AP 75MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CLOVIR 400MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CLOVIR CREAM", "form": "Cream", "company": "Generic"},
    {"name": "COBAL XT TAB", "form": "Tablet", "company": "Generic"},
    {"name": "COBIGYL TAB", "form": "Tablet", "company": "Generic"},
    {"name": "COFSILS COUGH SYP", "form": "Syrup", "company": "Generic"},
    {"name": "COGNIX PLUS TAB", "form": "Tablet", "company": "Generic"},
    {"name": "COMBIART TAB", "form": "Tablet", "company": "Generic"},
    {"name": "COMBIFLAM SYP", "form": "Syrup", "company": "Generic"},
    {"name": "COMBIFLAM TAB", "form": "Tablet", "company": "Generic"},
    {"name": "COMBIGAN EYE DROPS", "form": "Drops", "company": "Generic"},
    {"name": "CONAZ 200MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "COREX DX SYP", "form": "Syrup", "company": "Generic"},
    {"name": "CORIM DS TAB", "form": "Tablet", "company": "Generic"},
    {"name": "COVANCE 50MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CREMAFFIN MINT SYP", "form": "Syrup", "company": "Generic"},
    {"name": "CREMAFFIN PINK SYP", "form": "Syrup", "company": "Generic"},
    {"name": "CREMAFFIN PLUS SYP", "form": "Syrup", "company": "Generic"},
    {"name": "CREMALAX TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CREON 10000MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CREON 25000 CAPS", "form": "Capsule", "company": "Generic"},
    {"name": "CRESAR 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CRESAR 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CRESAR AM TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CRESAR H TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CRESTOR 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CRESTOR 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CRESTOR 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CVEEN PLUS TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CVEEN TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CYPROZAN TAB", "form": "Tablet", "company": "Generic"},
    {"name": "D PROTIN CHOC", "form": "Tablet", "company": "Generic"},
    {"name": "D PROTIN VANILLA", "form": "Tablet", "company": "Generic"},
    {"name": "D ROSE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "D3 MUST TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DALSTEP SYP", "form": "Syrup", "company": "Generic"},
    {"name": "DEC 100MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DECDAN TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DELETUS D PLUS SYP", "form": "Syrup", "company": "Generic"},
    {"name": "DERIPHYLLIN RTD TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DERMIHEAL CREAM", "form": "Cream", "company": "Generic"},
    {"name": "DERTIP CREAM", "form": "Cream", "company": "Generic"},
    {"name": "DEXOREN S TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DIABETRAL SR TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DIABETROL TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DICIGYL TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DIGENE GEL ORANGE", "form": "Cream", "company": "Generic"},
    {"name": "DIGENE MINT GEL", "form": "Cream", "company": "Generic"},
    {"name": "DIGENE TAB MINT", "form": "Tablet", "company": "Generic"},
    {"name": "DIGENE TAB ORANGE", "form": "Tablet", "company": "Generic"},
    {"name": "DIPA ADVANCE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DISPRINE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DIVAA TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DOCET TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DOLO 650MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DOLOPAR 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DOLOPAR 650MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DOMPAN DSR TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DONEP M TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DORZOX E DROPS", "form": "Drops", "company": "Generic"},
    {"name": "DORZOX T DROPS", "form": "Drops", "company": "Generic"},
    {"name": "DOXT SL TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DULCOFLEX ADULT SUP", "form": "Suppository", "company": "Generic"},
    {"name": "DULCOFLEX SUPP PAED", "form": "Suppository", "company": "Generic"},
    {"name": "DULCOFLEX TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DULCOMAX TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DUOLIN CFC INHLR", "form": "Inhaler", "company": "Generic"},
    {"name": "DUOLIN LD REPSULES", "form": "Tablet", "company": "Generic"},
    {"name": "DUOLIN REPSULES", "form": "Tablet", "company": "Generic"},
    {"name": "DUOLIN ROTOCAPS", "form": "Capsule", "company": "Generic"},
    {"name": "DUONASE NASAL SPRAY", "form": "Spray", "company": "Generic"},
    {"name": "DUPHALAC SYP", "form": "Syrup", "company": "Generic"},
    {"name": "DUPHASTAN TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DUPION NT TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DURALITE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DUTAS CAPS", "form": "Capsule", "company": "Generic"},
    {"name": "DUTAS T CAPS", "form": "Capsule", "company": "Generic"},
    {"name": "DUVADILAN 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DYNAPRESS 0.4MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DYTOR 100MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DYTOR 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DYTOR 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DYTOR 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DYTOR 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DYTOR E TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DYTOR PLUS 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DYTOR PLUS 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DYTOR PLUS 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DYTOR PLUS LS TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ECOFRESH TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ECONORM CAP", "form": "Capsule", "company": "Generic"},
    {"name": "ECONORM SHAC", "form": "Tablet", "company": "Generic"},
    {"name": "ELOXIB 120 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ELOXIB 60MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ELOXIB 90MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ELZOLE 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "EMESET 4MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "EMESET 8MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "EMESET INJ", "form": "Injection", "company": "Generic"},
    {"name": "EMESET SYP", "form": "Syrup", "company": "Generic"},
    {"name": "EMITOP MD TAB", "form": "Tablet", "company": "Generic"},
    {"name": "EMSAN 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ENAM 2.5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ENAM 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ENDURA MASS POWDER", "form": "Powder", "company": "Generic"},
    {"name": "ENOXION 60MG INJ", "form": "Injection", "company": "Generic"},
    {"name": "ENSOY PROTEIN POWDER", "form": "Powder", "company": "Generic"},
    {"name": "ENTERO C TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ENTEROGERMINA VIAL", "form": "Injection", "company": "Generic"},
    {"name": "ENTOGERMINA CAPS", "form": "Capsule", "company": "Generic"},
    {"name": "ENVAS 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ENZOFLAM MR TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ENZOFLAM SP TAB", "form": "Tablet", "company": "Generic"},
    {"name": "EPTOIN 100MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ERYTHRO 250MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ERYTHRO 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ERYTHROCIN 250MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ERYTROCIN 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ESGIPYRIN TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ESOMAC 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ETHIGLO FACE WASH", "form": "Soap", "company": "Generic"},
    {"name": "ETHIGLO SOAP", "form": "Soap", "company": "Generic"},
    {"name": "ETOLAC PLUS TAB", "form": "Tablet", "company": "Generic"},
    {"name": "EUGLIM 1MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "EUGLIM 2MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "EUGLIM M1MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "EUGLIM M2MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "EVION 400MG CAP", "form": "Capsule", "company": "Generic"},
    {"name": "EVION 600MG CAP", "form": "Capsule", "company": "Generic"},
    {"name": "EVION E CREAM", "form": "Cream", "company": "Generic"},
    {"name": "EVION LC TAB", "form": "Tablet", "company": "Generic"},
    {"name": "EXERMET SR 500 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "EZENTIA TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FAST N UP TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FASTIUM 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FASTIUM 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FEBUMAX 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FEBUSTAT 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FEMOSTON TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FEPANIL TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FERIUM PLUS TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FERIUM XT TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FERTOMID 100MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FERTOMID 50MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FEVAGO DS SYP", "form": "Syrup", "company": "Generic"},
    {"name": "FIBROLIV TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FLAGYL 200MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FLAGYL 400MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FLAGYL SYP", "form": "Syrup", "company": "Generic"},
    {"name": "FLEXON MR TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FLEXON TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FLOMIST NASAL SPRAY", "form": "Spray", "company": "Generic"},
    {"name": "FLOVIZ XT TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FLUCAN 150MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FLUCAN 200MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FLUR DROPS", "form": "Drops", "company": "Generic"},
    {"name": "FLUSHOT NASAL SPRAY", "form": "Spray", "company": "Generic"},
    {"name": "FLUZA TABLET", "form": "Tablet", "company": "Generic"},
    {"name": "FLUZET TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FML EYE DROPS", "form": "Drops", "company": "Generic"},
    {"name": "FML T EYE DROPS", "form": "Drops", "company": "Generic"},
    {"name": "FOLIBEST L FORTE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FOLIHAIR NEW TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FOLLIHAIR TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FOLVITE 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FORACORT 0.5 RESP", "form": "Inhaler", "company": "Generic"},
    {"name": "FORACORT 100 INHR", "form": "Inhaler", "company": "Generic"},
    {"name": "FORACORT 100MG R C", "form": "Tablet", "company": "Generic"},
    {"name": "FORACORT 200 INHLR", "form": "Inhaler", "company": "Generic"},
    {"name": "FORACORT 200MG ROTACAP", "form": "Capsule", "company": "Generic"},
    {"name": "FORACORT 400 INH", "form": "Inhaler", "company": "Generic"},
    {"name": "FORACORT 400 R C", "form": "Tablet", "company": "Generic"},
    {"name": "FORCAN 150MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FORCAN 50MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FORISTAL TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FORTYPLAS TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FORXIGA 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FRISIUM 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FRISIUM 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FULFORM 200MG R C", "form": "Tablet", "company": "Generic"},
    {"name": "FULLFORM 400MG R C", "form": "Tablet", "company": "Generic"},
    {"name": "FUNGICIP 1 CREAM", "form": "Cream", "company": "Generic"},
    {"name": "FUSIWAL CREAM", "form": "Cream", "company": "Generic"},
    {"name": "GABACURE 100MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GABACURE NT 100 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GABANEURON 100MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GABANEURON NT 100MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GABANEURON NT 300MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GABANEURON TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GALACT GRANULES", "form": "Powder", "company": "Generic"},
    {"name": "GALVUS 50MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GALVUS MET TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GANATON OD CAPS", "form": "Capsule", "company": "Generic"},
    {"name": "GANATON TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GANATON TOTAL CAPS", "form": "Capsule", "company": "Generic"},
    {"name": "GANFORT EYE DROPS", "form": "Drops", "company": "Generic"},
    {"name": "GARDENAL 30MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GARDENAL 60MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GEMCAL CAP", "form": "Capsule", "company": "Generic"},
    {"name": "GEMCAL CAPS", "form": "Capsule", "company": "Generic"},
    {"name": "GEMCAL D3 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GEMCAL PLUS SOFT CAPS", "form": "Capsule", "company": "Generic"},
    {"name": "GEMINOR M1 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GEMONTAS L TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GEMONTAS LC TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GENTAMICIN INJ", "form": "Injection", "company": "Generic"},
    {"name": "GENTICYN 80MG INJ", "form": "Injection", "company": "Generic"},
    {"name": "GLICLA DM FORTE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GLICLA DM PLUS TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GLIMER 1MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GLIMER 2MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GLIMY 1MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GLIMY 2MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GLIMY 3MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GLIMY M1 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GLIMY M2 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GLUCOBAY 25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GLUCOBAY 50MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GLUCOBAY M 25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GLUCOBAY M 50MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GLUFORMIN 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GLUFORMIN G1 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GLUFORMIN G2 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GLYCIPHAGE SR 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GLYCOMET GP1 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GLYCOMET GP2 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GLYCOMET SR 1GM TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GLYCOMET SR 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GLYXAMBI TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GOECYST TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GROWCARE HAIR OIL", "form": "Tablet", "company": "Generic"},
    {"name": "GTN SORBITRATE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "GUMTONE GEL", "form": "Cream", "company": "Generic"},
    {"name": "GUMTONE POWDER", "form": "Powder", "company": "Generic"},
    {"name": "HAEM UP GEMS", "form": "Tablet", "company": "Generic"},
    {"name": "HAEM UP TAB", "form": "Tablet", "company": "Generic"},
    {"name": "HAIRFULL TAB", "form": "Tablet", "company": "Generic"},
    {"name": "HAIRVIT TAB", "form": "Tablet", "company": "Generic"},
    {"name": "HEALTHOKAY TAB", "form": "Tablet", "company": "Generic"},
    {"name": "HEMFER SYP", "form": "Syrup", "company": "Generic"},
    {"name": "HIFENAC MR TAB", "form": "Tablet", "company": "Generic"},
    {"name": "HIFENAC P TAB", "form": "Tablet", "company": "Generic"},
    {"name": "HIFENAC TH TAB", "form": "Tablet", "company": "Generic"},
    {"name": "HISTAFREE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "HOMIDE 25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "HOMIDE 50MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "HUMALOG INJ", "form": "Injection", "company": "Generic"},
    {"name": "HUMALOG MIX 50 CATRIDGE", "form": "Tablet", "company": "Generic"},
    {"name": "HUMAN INSULARTED 40IU", "form": "Tablet", "company": "Generic"},
    {"name": "HUMINSULIN 30 70 40UI", "form": "Tablet", "company": "Generic"},
    {"name": "HUMINSULIN 50 50 40IU", "form": "Tablet", "company": "Generic"},
    {"name": "HUMINSULIN INJ", "form": "Injection", "company": "Generic"},
    {"name": "HUMINSULIN N CARTGE", "form": "Tablet", "company": "Generic"},
    {"name": "HUMINSULIN N VIAL", "form": "Injection", "company": "Generic"},
    {"name": "HUMINSULIN R INJ", "form": "Injection", "company": "Generic"},
    {"name": "HUMOG 150 INJ", "form": "Injection", "company": "Generic"},
    {"name": "HYDROHEAL AM GEL", "form": "Cream", "company": "Generic"},
    {"name": "HYPONORM 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "HYPRANORM TAB", "form": "Tablet", "company": "Generic"},
    {"name": "IBUCAN PLUS TAB", "form": "Tablet", "company": "Generic"},
    {"name": "IBUGESIC PLUS SYP", "form": "Syrup", "company": "Generic"},
    {"name": "IBUGESIC PLUS TAB", "form": "Tablet", "company": "Generic"},
    {"name": "IHOPE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "INCID L TAB", "form": "Tablet", "company": "Generic"},
    {"name": "INDERAL 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "INDERAL 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "INDERAL 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "INDERAL LA 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "INDERAL LA 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "INSUGEN 30 70 INJ", "form": "Injection", "company": "Generic"},
    {"name": "INSUGEN 50 50 INJ", "form": "Injection", "company": "Generic"},
    {"name": "INSUGEN N INJ", "form": "Injection", "company": "Generic"},
    {"name": "INSUGEN R INJ", "form": "Injection", "company": "Generic"},
    {"name": "INTALITH CR TAB", "form": "Tablet", "company": "Generic"},
    {"name": "IPILL TAB", "form": "Tablet", "company": "Generic"},
    {"name": "IPRAVENT REPSULES", "form": "Tablet", "company": "Generic"},
    {"name": "IROMAX XT TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ISMO 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ISMO 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ISOL INJECTION", "form": "Injection", "company": "Generic"},
    {"name": "ISOTROIN 20MG CAP", "form": "Capsule", "company": "Generic"},
    {"name": "ITASPOR 200MG CAP", "form": "Capsule", "company": "Generic"},
    {"name": "ITONE EYE DROPS", "form": "Drops", "company": "Generic"},
    {"name": "IVABID 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "IVERMECTOL 12MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "IVERMECTOL 6MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "JARDIANCE 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "JARDIANCE 25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "JARDIANCE MET TAB", "form": "Tablet", "company": "Generic"},
    {"name": "JUNIOR LANZOL TAB", "form": "Tablet", "company": "Generic"},
    {"name": "JUSDEE DROPS", "form": "Drops", "company": "Generic"},
    {"name": "JUST TEARS EYE DROPS", "form": "Drops", "company": "Generic"},
    {"name": "K CIT SYP", "form": "Syrup", "company": "Generic"},
    {"name": "K GEM TAB", "form": "Tablet", "company": "Generic"},
    {"name": "K GLIM 1MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "K GLIM 2MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "K GLIM M1MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "K GLIM M2MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "KENOCORT 40MG INJ", "form": "Injection", "company": "Generic"},
    {"name": "KENOCORT PASTE", "form": "Paste", "company": "Generic"},
    {"name": "KEPPRA 250MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "KEPPRA 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "KEPPRA 750MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "KETO B CREAM", "form": "Cream", "company": "Generic"},
    {"name": "KETOROL 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "KETOROL DT TAB", "form": "Tablet", "company": "Generic"},
    {"name": "KETOROL INJ", "form": "Injection", "company": "Generic"},
    {"name": "KETOROL TAB", "form": "Tablet", "company": "Generic"},
    {"name": "KIDPRED 5 SYP", "form": "Syrup", "company": "Generic"},
    {"name": "KOFAREST SYP", "form": "Syrup", "company": "Generic"},
    {"name": "KOFDEX SYP", "form": "Syrup", "company": "Generic"},
    {"name": "KOFEX AX SYP", "form": "Syrup", "company": "Generic"},
    {"name": "KOFEX PLUS SYP", "form": "Syrup", "company": "Generic"},
    {"name": "L CIT SACHET", "form": "Powder", "company": "Generic"},
    {"name": "LACTIHEP SYP", "form": "Syrup", "company": "Generic"},
    {"name": "LACTO B CAPS", "form": "Capsule", "company": "Generic"},
    {"name": "LACTO CALAMINE LOTION", "form": "Lotion", "company": "Generic"},
    {"name": "LACTONIC GRANULES", "form": "Powder", "company": "Generic"},
    {"name": "LASILACTONE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LASIX 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LEFRA 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LEFRA 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LENALID 10 CAP", "form": "Capsule", "company": "Generic"},
    {"name": "LENALID 25 CAP", "form": "Capsule", "company": "Generic"},
    {"name": "LEVEPSY 250MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LEVEPSY 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LEVO PLUS SYP", "form": "Syrup", "company": "Generic"},
    {"name": "LEVOCET 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LEVOCET M TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LEVOFLOX 750MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LEVOLIN 0.63 RESPULES", "form": "Inhaler", "company": "Generic"},
    {"name": "LEVOLIN 1.25MG REPSULES", "form": "Tablet", "company": "Generic"},
    {"name": "LEVOLIN PLUS SYP", "form": "Syrup", "company": "Generic"},
    {"name": "LEVOLIN ROTACAPS", "form": "Capsule", "company": "Generic"},
    {"name": "LEVOLIN SYP", "form": "Syrup", "company": "Generic"},
    {"name": "LIBRAX TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LIBRIUM 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LIBRIUM 25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LIMCEE 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LIMCEE GUMMIES", "form": "Tablet", "company": "Generic"},
    {"name": "LINAFORT FORTE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LINID TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LIVOFLOX 750MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LIVOGEN TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LIVONORM TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LOBATE GM N CREAM", "form": "Cream", "company": "Generic"},
    {"name": "LOMONTAS 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LOMONTAS 4MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LOMONTAS LC TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LOSAR 50MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LOSAR H TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LOSARTAR 25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LOSARTAR H TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LOSIUM 25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LOSIUM 50MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LULIFIN CREAM", "form": "Cream", "company": "Generic"},
    {"name": "LULIFIN LOTION", "form": "Lotion", "company": "Generic"},
    {"name": "LULIFIN SPRAY", "form": "Spray", "company": "Generic"},
    {"name": "LULIFORD CREAM", "form": "Cream", "company": "Generic"},
    {"name": "LUMICAN 0.3 DROPS", "form": "Drops", "company": "Generic"},
    {"name": "LUMIGAN 0.1 DROPS", "form": "Drops", "company": "Generic"},
    {"name": "LUPIGYL V3 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LUXIQ FOAM", "form": "Tablet", "company": "Generic"},
    {"name": "LYRICA 50MG CAP", "form": "Capsule", "company": "Generic"},
    {"name": "LYRICA 75MG CAP", "form": "Capsule", "company": "Generic"},
    {"name": "M PREDNACORTIL 4 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "M PREDNACORTIL 8 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "M2 TONE SYP", "form": "Syrup", "company": "Generic"},
    {"name": "MACBERY SYP", "form": "Syrup", "company": "Generic"},
    {"name": "MACBERY Z TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MAHACEF 200MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MAHACEF CV DRY SYP", "form": "Syrup", "company": "Generic"},
    {"name": "MAHACEF CV TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MAHACEF PLUS TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MALIDENS 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MALIDENS 650MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MAXIFLO 100 R C", "form": "Tablet", "company": "Generic"},
    {"name": "MAXIFLO 125 INH", "form": "Inhaler", "company": "Generic"},
    {"name": "MAXIFLO 250 INH", "form": "Inhaler", "company": "Generic"},
    {"name": "MAXIFLO 250 ROTACAPS", "form": "Capsule", "company": "Generic"},
    {"name": "MAXTRA SYP", "form": "Syrup", "company": "Generic"},
    {"name": "MECOFOL PLUS TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MECOVION D3 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MECOVIXR LC TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MECOVIXR NP TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MECOVIXR PLUS CAP", "form": "Capsule", "company": "Generic"},
    {"name": "MEDLIP 145MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MEDLIP 160MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MEFTAL 250MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MEFTAL 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MEFTAL FORTE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MEFTAL P SYP", "form": "Syrup", "company": "Generic"},
    {"name": "MEFTAL P TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MEGA HEAL OINT", "form": "Cream", "company": "Generic"},
    {"name": "MEGAHEAL GEL", "form": "Cream", "company": "Generic"},
    {"name": "MEGANERON OD PLUS CAP", "form": "Capsule", "company": "Generic"},
    {"name": "MEGAPEN 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MEGAVAX SOFT GEL", "form": "Cream", "company": "Generic"},
    {"name": "MELACARE OINT", "form": "Cream", "company": "Generic"},
    {"name": "MET XL 12.5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MET XL 25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MET XL 50MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MET XL AM TAB", "form": "Tablet", "company": "Generic"},
    {"name": "METASENS VG 1MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "METASENS VG 2MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "METASPRAY NASAL SPRAY", "form": "Spray", "company": "Generic"},
    {"name": "METBETA XL 12.5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "METBETA XL 25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "METBETA XL 50MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "METFOR 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "METHERGIN TAB", "form": "Tablet", "company": "Generic"},
    {"name": "METOLOR 25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "METOLOR 50MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "METOLOR XR 25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "METOLOR XR 50MG CAPS", "form": "Capsule", "company": "Generic"},
    {"name": "METPURE XL 25 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "METPURE XL 50MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "METSMALL 1GM TAB", "form": "Tablet", "company": "Generic"},
    {"name": "METSMALL 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "METSMALL VX 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MIKACIN 100MG INJ", "form": "Injection", "company": "Generic"},
    {"name": "MIKACIN 250MG INJ", "form": "Injection", "company": "Generic"},
    {"name": "MIKACIN 500MG INJ", "form": "Injection", "company": "Generic"},
    {"name": "MINMIN PB SYP", "form": "Syrup", "company": "Generic"},
    {"name": "MINMIN PB TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MINTOP 10 LOTION", "form": "Lotion", "company": "Generic"},
    {"name": "MINTOP 2 LOTION", "form": "Lotion", "company": "Generic"},
    {"name": "MINTOP 5 FORTE FOAM", "form": "Tablet", "company": "Generic"},
    {"name": "MIRAHYPE 25 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MIRAHYPE S TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MOMATE OINT", "form": "Cream", "company": "Generic"},
    {"name": "MONOCAN 100MG CAP", "form": "Capsule", "company": "Generic"},
    {"name": "MONOCAN 200MG CAP", "form": "Capsule", "company": "Generic"},
    {"name": "MONOVONO 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MONTAIR 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MONTAIR 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MONTAIR FX TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MONTAIR LC KID TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MONTAIR LC TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MONTECIP LC JUNIOR SYP", "form": "Syrup", "company": "Generic"},
    {"name": "MOOV SPRAY", "form": "Spray", "company": "Generic"},
    {"name": "MOXICIP E DROPS", "form": "Drops", "company": "Generic"},
    {"name": "MOXIMAX D EYE DROPS", "form": "Drops", "company": "Generic"},
    {"name": "MUCINAC 600MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MUCOFORM AB FORTE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MUCOFORM AB SR TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MUCOHYPE 600 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MUCOLINC EXPECTORANT", "form": "Tablet", "company": "Generic"},
    {"name": "MUCOLITE DROPS", "form": "Drops", "company": "Generic"},
    {"name": "MUCOLITE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MUPICIP CREAM", "form": "Cream", "company": "Generic"},
    {"name": "MUPICIP OINT", "form": "Cream", "company": "Generic"},
    {"name": "MYOSPAS TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MYOVIL FORTE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MYOVIL PLUS SACHET", "form": "Powder", "company": "Generic"},
    {"name": "NAPROWEL FORTE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "NAZOHYPE NASAL SPRAY", "form": "Spray", "company": "Generic"},
    {"name": "NAZOHYPE P DROP", "form": "Drops", "company": "Generic"},
    {"name": "NAZOHYPE S DROP", "form": "Drops", "company": "Generic"},
    {"name": "NEBASULF POWDER", "form": "Powder", "company": "Generic"},
    {"name": "NEBI 2.5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "NEBI 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "NEBI AM TAB", "form": "Tablet", "company": "Generic"},
    {"name": "NEBI H TAB", "form": "Tablet", "company": "Generic"},
    {"name": "NEBIBETA 2.5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "NEBIBETA 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "NEERI TAB", "form": "Tablet", "company": "Generic"},
    {"name": "NEO MERCAZOLE 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "NEOPEPTINE DROPS", "form": "Drops", "company": "Generic"},
    {"name": "NERVEUP FORTE CAPS", "form": "Capsule", "company": "Generic"},
    {"name": "NERVEUP OD CAPS", "form": "Capsule", "company": "Generic"},
    {"name": "NEURORUSH FORTE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "NEVANAC EYE DROPS", "form": "Drops", "company": "Generic"},
    {"name": "NISE GEL", "form": "Cream", "company": "Generic"},
    {"name": "NISE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "NITAXAN SR TAB", "form": "Tablet", "company": "Generic"},
    {"name": "NITRAVET 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "NITRAVET 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "NOCOLD SYP", "form": "Syrup", "company": "Generic"},
    {"name": "NOOTROPIL 800MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "NOOTROPIL SYP", "form": "Syrup", "company": "Generic"},
    {"name": "NORFLOX 200MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "NORFLOX 400MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "NORFLOX TZ TAB", "form": "Tablet", "company": "Generic"},
    {"name": "NOVACLAV 625 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "NOVAMIX REDUSE", "form": "Tablet", "company": "Generic"},
    {"name": "NOVAMOX 250MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "NOVAMOX 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "NOVAMOX REDIUSE DROPS", "form": "Drops", "company": "Generic"},
    {"name": "NOVELON TAB", "form": "Tablet", "company": "Generic"},
    {"name": "NOVOFINE NEEDLE", "form": "Tablet", "company": "Generic"},
    {"name": "NOVOMIX 30 FLEXPEN", "form": "Tablet", "company": "Generic"},
    {"name": "NOVORAPID FLEXPEN", "form": "Tablet", "company": "Generic"},
    {"name": "NOVUGEST 10 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "NUCOXIA P TAB", "form": "Tablet", "company": "Generic"},
    {"name": "NUTREME LITE PROTEIN", "form": "Tablet", "company": "Generic"},
    {"name": "NUTROLIN B PLUS CAP", "form": "Capsule", "company": "Generic"},
    {"name": "NUTROLIN B SYP", "form": "Syrup", "company": "Generic"},
    {"name": "O BERRY 0.2MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "O BERRY 0.3MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "OBIMET SR 1GM TAB", "form": "Tablet", "company": "Generic"},
    {"name": "OFLOX 200MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "OKACET 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "OKACET COLD TAB", "form": "Tablet", "company": "Generic"},
    {"name": "OLEMAR 20 AM TAB", "form": "Tablet", "company": "Generic"},
    {"name": "OLEMAR 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "OLEMAR 40 AM TAB", "form": "Tablet", "company": "Generic"},
    {"name": "OLEMAR 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "OMEE CAINE GEL", "form": "Cream", "company": "Generic"},
    {"name": "OMEZ 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "OMEZ DSR CAPS", "form": "Capsule", "company": "Generic"},
    {"name": "OMEZ INSTA SACHET", "form": "Powder", "company": "Generic"},
    {"name": "OMNACORDIL 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "OMNACORTIL 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "OMNICLAV 375MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "OMNIGEL GEL", "form": "Cream", "company": "Generic"},
    {"name": "OMNIGEL OINTMENT", "form": "Cream", "company": "Generic"},
    {"name": "OMNIGEL SPRAY", "form": "Cream", "company": "Generic"},
    {"name": "OPTVA E DROPS", "form": "Drops", "company": "Generic"},
    {"name": "OROFER XT TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ORS ORANGE FLAVOUR", "form": "Tablet", "company": "Generic"},
    {"name": "ORS PROLYTE APPLE", "form": "Tablet", "company": "Generic"},
    {"name": "ORS PROLYTE ORANGE", "form": "Tablet", "company": "Generic"},
    {"name": "ORTHAL FORTE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "OSTEOFOS 70MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "OSTOVAXL DM TAB", "form": "Tablet", "company": "Generic"},
    {"name": "OVACHIP SR TAB", "form": "Tablet", "company": "Generic"},
    {"name": "OZEWID NG CREAM", "form": "Cream", "company": "Generic"},
    {"name": "P OD PLUS TAB", "form": "Tablet", "company": "Generic"},
    {"name": "P OD TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PAN 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PAN 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PAN D CAPS", "form": "Capsule", "company": "Generic"},
    {"name": "PAN IV INJ", "form": "Injection", "company": "Generic"},
    {"name": "PAN MPS SYP", "form": "Syrup", "company": "Generic"},
    {"name": "PANCRYPT 25K CAP", "form": "Capsule", "company": "Generic"},
    {"name": "PANDERM PLUS POWDER", "form": "Powder", "company": "Generic"},
    {"name": "PANKREOFLAT TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PANTOP 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PANTOP 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PANTOP DSR TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PANTOP IV TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PANTOSEC DSR CAP", "form": "Capsule", "company": "Generic"},
    {"name": "PARACIP 250MG SUSP", "form": "Tablet", "company": "Generic"},
    {"name": "PARAXIN 250MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PARAXIN 500MG CAPS", "form": "Capsule", "company": "Generic"},
    {"name": "PEDICLORYL SYP", "form": "Syrup", "company": "Generic"},
    {"name": "PENDITS 200MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PENDITS 800MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PENTIDS 400MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PENVAX OXT TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PEPTIRAN SYP", "form": "Syrup", "company": "Generic"},
    {"name": "PHENARGAN 25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PHENARGAN INJ", "form": "Injection", "company": "Generic"},
    {"name": "PHENERGAN SYP", "form": "Syrup", "company": "Generic"},
    {"name": "PILOGO CREAM", "form": "Cream", "company": "Generic"},
    {"name": "PILOGO PLUS CREAM", "form": "Cream", "company": "Generic"},
    {"name": "PIORIDE 1MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PLATERISE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PLAVIX TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PODOCIP CV 200MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PPG 0.2MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PPG 0.3MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PPG MET 0.2MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PPG MET 0.3MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PRACTIN 4MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PRAXIN 250MG CAP", "form": "Capsule", "company": "Generic"},
    {"name": "PREGHYPE NT TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PRIMEPILL ULTRA TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PRIUX MNT TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PRIUX NT TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PRO PL CHOCLATE", "form": "Tablet", "company": "Generic"},
    {"name": "PRO PL VENNILA", "form": "Tablet", "company": "Generic"},
    {"name": "PROLYTE APPLE", "form": "Tablet", "company": "Generic"},
    {"name": "PROLYTE ORANGE", "form": "Tablet", "company": "Generic"},
    {"name": "PROTHIADEN 25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PROTHIADEN 50MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PROTHIADIN 75MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "PROTIVAX DHA CHOCO", "form": "Tablet", "company": "Generic"},
    {"name": "PROTIVAX MOM POWDER", "form": "Powder", "company": "Generic"},
    {"name": "PROXYVAN PLUS CAPS", "form": "Capsule", "company": "Generic"},
    {"name": "QURE 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RABALKEM DSR TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RABALKEM IT TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RABALKEM LS CAP", "form": "Capsule", "company": "Generic"},
    {"name": "RABESEC DSR CAP", "form": "Capsule", "company": "Generic"},
    {"name": "RABITOP D SR CAP", "form": "Capsule", "company": "Generic"},
    {"name": "RABITOP LS CAP", "form": "Capsule", "company": "Generic"},
    {"name": "RAFLE 200MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RAFLE 400MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RAFLE 550MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RAMIPRESS 2.5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RAMIPRESS 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RANTOP 150MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RAPID GEL", "form": "Cream", "company": "Generic"},
    {"name": "RAZO 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RAZO D CAPS", "form": "Capsule", "company": "Generic"},
    {"name": "RAZO L TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RECLIDE 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RECLIDE 60MR TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RECLIDE 80MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RECLIDE MR 30MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RECLIDE MR 60MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RECLIDE XR 60MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RECLIMET TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RECLIMET XR 60MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "REJOINT NEW TAB", "form": "Tablet", "company": "Generic"},
    {"name": "REKOOL 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "REKOOL D CAPS", "form": "Capsule", "company": "Generic"},
    {"name": "RELENT PLUS SYP", "form": "Syrup", "company": "Generic"},
    {"name": "RELENT TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RENERVE PLUS CAPS", "form": "Capsule", "company": "Generic"},
    {"name": "RENERVE PLUS INJ", "form": "Injection", "company": "Generic"},
    {"name": "RENERVE PLUS TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RENU SOLUTION", "form": "Solution", "company": "Generic"},
    {"name": "RESTECLIN 250MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RESTECLIN 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RESTYL 0.25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RESTYL 0.5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RESTYL 1MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RESWAS LS SYP", "form": "Syrup", "company": "Generic"},
    {"name": "RESWAS SYP", "form": "Syrup", "company": "Generic"},
    {"name": "REVOLIZER", "form": "Tablet", "company": "Generic"},
    {"name": "RIBVAX OXT TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RIFAXIGYL M SUSP", "form": "Tablet", "company": "Generic"},
    {"name": "RILENT TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RINILACT CAP", "form": "Capsule", "company": "Generic"},
    {"name": "RINILACT DRY SYP", "form": "Syrup", "company": "Generic"},
    {"name": "RIVOTRIL 0.25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RIVOTRIL 0.5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ROCALTROL 0.25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ROLITEN OD 2MG CAP", "form": "Capsule", "company": "Generic"},
    {"name": "ROSAVE EZ 10 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ROSAVE EZ 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ROSTA 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ROSTA 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ROSTA 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ROSTA F TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ROSUFIT 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ROSUFIT CV 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ROSUFIT CV 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ROSULIP 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ROSULIP 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ROSULIP F 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ROTAHALER", "form": "Tablet", "company": "Generic"},
    {"name": "ROXID 150MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ROZAT 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ROZAT 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ROZAT 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SACMIGUT SACHET", "form": "Powder", "company": "Generic"},
    {"name": "SAM 400 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SELOKEN XL 25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SELOKEN XL 50MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SELSUN SHAMPOO", "form": "Shampoo", "company": "Generic"},
    {"name": "SEMI RECLIMET TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SEMIDAONIL TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SENQUEL F PASTE", "form": "Paste", "company": "Generic"},
    {"name": "SEROFLO 100 INHR", "form": "Inhaler", "company": "Generic"},
    {"name": "SEROFLO 100 ROTOCAPS", "form": "Capsule", "company": "Generic"},
    {"name": "SEROFLO 125 INHLR", "form": "Inhaler", "company": "Generic"},
    {"name": "SEROFLO 250 INHLR", "form": "Inhaler", "company": "Generic"},
    {"name": "SEROFLO 250 ROTACAPS", "form": "Capsule", "company": "Generic"},
    {"name": "SILODOVA 8 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SILOFAST 4MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SILOFAST 8MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SILOFAST D4 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SILOFAST D8 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SITAGLIP 100MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SITAGLIP 50 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SITAGLIP D TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SITAGLIP DM TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SITAGLIP M TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SITAKRAFT 100 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SITANIA UTI SUSP", "form": "Tablet", "company": "Generic"},
    {"name": "SMOOTHE EYE DROP", "form": "Drops", "company": "Generic"},
    {"name": "SMUTH CREAM", "form": "Cream", "company": "Generic"},
    {"name": "SMUTH SYRUP", "form": "Syrup", "company": "Generic"},
    {"name": "SODATAB DS TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SODIMCAR 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SOLINOL 5 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SORBITRATE 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SORBITRATE 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SPASMONIL DROPS", "form": "Drops", "company": "Generic"},
    {"name": "SPASONIX TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SPOO BABY SHAMPOO", "form": "Shampoo", "company": "Generic"},
    {"name": "STAMLO 2.5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "STAMLO 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "STAMLO BETA TAB", "form": "Tablet", "company": "Generic"},
    {"name": "STAMLO D TAB", "form": "Tablet", "company": "Generic"},
    {"name": "STAMLO T TAB", "form": "Tablet", "company": "Generic"},
    {"name": "STATOR 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "STATOR 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "STATOR 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "STATOR ASP TAB", "form": "Tablet", "company": "Generic"},
    {"name": "STATOR CV 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "STATOR CV 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "STATOR F TAB", "form": "Tablet", "company": "Generic"},
    {"name": "STEMETIL MD TAB", "form": "Tablet", "company": "Generic"},
    {"name": "STEMETIL TAB", "form": "Tablet", "company": "Generic"},
    {"name": "STOLIN R PASTE", "form": "Paste", "company": "Generic"},
    {"name": "STRECHMIN CREAM", "form": "Cream", "company": "Generic"},
    {"name": "STRESNIL 0.25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "STRESNIL 0.5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "STYPTOVIT E TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SUHAGRA 25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SULOXID O CREAM", "form": "Cream", "company": "Generic"},
    {"name": "SUMO TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SUMOGEL GEL", "form": "Cream", "company": "Generic"},
    {"name": "SUPERMET XL 25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SUPERMET XL 50MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SUPRA PLUS TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SUPRACAL 2000 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SURBEX XT TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SUREPENAM 200MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SYMBIOTIK CAPS", "form": "Capsule", "company": "Generic"},
    {"name": "TAXIM 1000MG INJ", "form": "Injection", "company": "Generic"},
    {"name": "TAXIM 250MG INJ", "form": "Injection", "company": "Generic"},
    {"name": "TAXIM O 100MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TAXIM O 200MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TAXIM O 50MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TAXIM O DROPS", "form": "Drops", "company": "Generic"},
    {"name": "TAXIM O FORTE SYP", "form": "Syrup", "company": "Generic"},
    {"name": "TAXIM O SYR", "form": "Tablet", "company": "Generic"},
    {"name": "TEARS PLUS DROPS", "form": "Drops", "company": "Generic"},
    {"name": "TEGRETAL 100MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TEGRETAL 400MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TEGRETAL CR 300MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TELEMAR 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TELEMAR H TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TELISTA 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TELLZY 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TELPRES MT 25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TELPRES MT 50MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TELPRESS 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TELPRESS 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TELPRESS AM TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TELPRESS CT TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TELPRESS H40 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TELSARTAN 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TELSARTAN 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TELSARTAN AM TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TELSARTAN H TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TELSITE 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TELSITE 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TELSITE AM TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TELSITE H TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TELVAS 20MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TELVAS 3D TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TELVAS 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TELVAS AM TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TELVAS CT 40MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TELVAS H TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TENDIA M TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TENDOWISE FORTE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TERBIZOL 250 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "THEOASTHALIN FORTE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "THEOASTHALIN TAB", "form": "Tablet", "company": "Generic"},
    {"name": "THYRONORM 100MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "THYRONORM 12.5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "THYRONORM 125MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "THYRONORM 150MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "THYRONORM 25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "THYRONORM 50MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "THYRONORM 75MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "THYRONORM 88MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TIBAN 20 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TICMOXY CL 375 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TIOVA INHALER", "form": "Inhaler", "company": "Generic"},
    {"name": "TIOVA R C", "form": "Tablet", "company": "Generic"},
    {"name": "TIXILIX SYP", "form": "Syrup", "company": "Generic"},
    {"name": "TIZAN 2MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TOFAVAC 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TORMOXIN CLAV 375 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TORMOXIN CLAV SYP", "form": "Syrup", "company": "Generic"},
    {"name": "TORSINOL 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TORSINOL 5 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TOSSEX SYP", "form": "Syrup", "company": "Generic"},
    {"name": "TRAJANTA DUO TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TRAJENTA 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TRANOFRESH 500 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TRIBET 1MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TRIBET 2MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TRIBETROL 1MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TRIBETROL 2MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TRIVEDON MR TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TRYVAX BR FORTE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TRYVAX D TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TRYZEN D TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TUSQ D COUGH LOZ", "form": "Tablet", "company": "Generic"},
    {"name": "TUSQ DX SYP", "form": "Syrup", "company": "Generic"},
    {"name": "TUSQ DX TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TUSSMARK D SYP", "form": "Syrup", "company": "Generic"},
    {"name": "UDILIV 150MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "UDILIV 300MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "UDOVAX 300 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ULGEL A SYP", "form": "Syrup", "company": "Generic"},
    {"name": "ULTRA D3 DROPS", "form": "Drops", "company": "Generic"},
    {"name": "UNIENZYME DROPS", "form": "Drops", "company": "Generic"},
    {"name": "UNIENZYME SYP", "form": "Syrup", "company": "Generic"},
    {"name": "UNILAX ORAL SOLUTION", "form": "Solution", "company": "Generic"},
    {"name": "UNISPEED CZ TAB", "form": "Tablet", "company": "Generic"},
    {"name": "UPRISE D3 2K TAB", "form": "Tablet", "company": "Generic"},
    {"name": "UPRISE D3 60K CAP", "form": "Capsule", "company": "Generic"},
    {"name": "URIMAX 0.2MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "URIMAX 0.4MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "URIMAX 4 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "URIMAX D TAB", "form": "Tablet", "company": "Generic"},
    {"name": "URIMAX F TAB", "form": "Tablet", "company": "Generic"},
    {"name": "URISLASH KM SACHET", "form": "Powder", "company": "Generic"},
    {"name": "URIVEL 200MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "URIWAVE 0.4 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "UVA CEF 100 SYP", "form": "Syrup", "company": "Generic"},
    {"name": "UVA CEF 50 DRY SYP", "form": "Syrup", "company": "Generic"},
    {"name": "UVNIL MONT KID SYP", "form": "Syrup", "company": "Generic"},
    {"name": "VALIUM 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "VALIUM 2MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "VALIUM 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "VALPARIN 200MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "VALPARIN 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "VALPARIN CHRONO 200MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "VALPARIN CHRONO 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "VALPARIN SYP", "form": "Syrup", "company": "Generic"},
    {"name": "VANTAJ PASTE", "form": "Paste", "company": "Generic"},
    {"name": "VANTEJ PASTE", "form": "Paste", "company": "Generic"},
    {"name": "VASOGRAIN TAB", "form": "Tablet", "company": "Generic"},
    {"name": "VAXHIST 16 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "VAXPRITE POWDER", "form": "Powder", "company": "Generic"},
    {"name": "VAXTIC TAB", "form": "Tablet", "company": "Generic"},
    {"name": "VAXTIC Z TAB", "form": "Tablet", "company": "Generic"},
    {"name": "VENTILEX A SYP", "form": "Syrup", "company": "Generic"},
    {"name": "VENTILEX LS SYP", "form": "Syrup", "company": "Generic"},
    {"name": "VENTILEX SYP", "form": "Syrup", "company": "Generic"},
    {"name": "VENUSIA LOTION", "form": "Lotion", "company": "Generic"},
    {"name": "VERTIN 16MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "VERTIN 24MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "VERTIN 8MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "VERTIRON 25MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "VIL DM PLUS TAB", "form": "Tablet", "company": "Generic"},
    {"name": "VIL DM TAB", "form": "Tablet", "company": "Generic"},
    {"name": "VISCO MPS LIQUID", "form": "Syrup", "company": "Generic"},
    {"name": "VITOMIN D3 DROPS", "form": "Drops", "company": "Generic"},
    {"name": "VOLTEND R 0.3 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "VOMISHIELD MD 4MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "VOMIVAX MD TAB", "form": "Tablet", "company": "Generic"},
    {"name": "VOZET 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "VYSOV 50MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "WALAMYCIN DS SUSP", "form": "Tablet", "company": "Generic"},
    {"name": "WARF 1MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "WARF 2MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "WARF 3MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "WARF 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "WIKORYL DROPS", "form": "Drops", "company": "Generic"},
    {"name": "WIKORYL SUPS", "form": "Suppository", "company": "Generic"},
    {"name": "WIKORYL TAB", "form": "Tablet", "company": "Generic"},
    {"name": "WINCAB 0.5 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "WINOGASS CAP", "form": "Capsule", "company": "Generic"},
    {"name": "WINSTEP MAX TAB", "form": "Tablet", "company": "Generic"},
    {"name": "XIGDUO XR TAB", "form": "Tablet", "company": "Generic"},
    {"name": "XONE 1GM INJ", "form": "Injection", "company": "Generic"},
    {"name": "XYZAL 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "XYZAL 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "XYZAL M TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ZEET EXP SYP", "form": "Syrup", "company": "Generic"},
    {"name": "ZINCIWELL SYP", "form": "Syrup", "company": "Generic"},
    {"name": "ZINCODERM GM CREAM", "form": "Cream", "company": "Generic"},
    {"name": "ZINCODERM OINT", "form": "Cream", "company": "Generic"},
    {"name": "ZINCONYD TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ZINCOVIT TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ZINDERVIT TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ZITHOWIN SF KIT", "form": "Tablet", "company": "Generic"},
    {"name": "ZOCLAR 250MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ZOCLAR 500MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ZOLFRESH 10MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ZOLFRESH 5MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ZOMELIS MET TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ZOMLELIS 50MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ZYMVAX TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ZYRCOLD SYP", "form": "Syrup", "company": "Generic"},
    {"name": "ZYRCOLD TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ZYRTEC SYP", "form": "Syrup", "company": "Generic"},
    {"name": "ZYRTEC TAB", "form": "Tablet", "company": "Generic"},
]

@api_router.get("/pharmacy/inventory")
async def get_pharmacy_inventory(search: Optional[str] = None, form: Optional[str] = None):
    """Get pharmacy inventory with optional filtering"""
    inventory = MEDICINE_INVENTORY.copy()
    
    if search:
        search_lower = search.lower()
        inventory = [m for m in inventory if search_lower in m["name"].lower() or search_lower in m["company"].lower()]
    
    if form:
        form_lower = form.lower()
        inventory = [m for m in inventory if form_lower in m["form"].lower()]
    
    return {"medicines": inventory, "total": len(inventory)}

@api_router.get("/pharmacy/forms")
async def get_medicine_forms():
    """Get all unique medicine forms for filtering"""
    forms = list(set(m["form"] for m in MEDICINE_INVENTORY))
    forms.sort()
    return {"forms": forms}

@api_router.get("/")
async def root():
    return {"message": "Nevika Cura Healthcare API"}

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
