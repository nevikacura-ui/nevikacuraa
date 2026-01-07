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
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
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

# Medicine inventory for Orange Pharmacy - Updated from Stock Summary Report 07-01-2026
MEDICINE_INVENTORY = [
    {"name": "ABENDOL 10", "form": "Tablet", "company": "Generic"},
    {"name": "ABSOLUT GOLD", "form": "Capsule", "company": "Generic"},
    {"name": "ABSOLUT WOMAN", "form": "Capsule", "company": "Generic"},
    {"name": "ACEFLAM SP", "form": "Tablet", "company": "Generic"},
    {"name": "ACEMIZ MR", "form": "Tablet", "company": "Generic"},
    {"name": "ACEMIZ-S", "form": "Tablet", "company": "Generic"},
    {"name": "ACTIGUT", "form": "Capsule", "company": "Generic"},
    {"name": "ACTIGUUT CAP", "form": "Capsule", "company": "Generic"},
    {"name": "ADIGESIC MR", "form": "Tablet", "company": "Generic"},
    {"name": "ALBAYES", "form": "Tablet", "company": "Generic"},
    {"name": "ALBAYES SYP", "form": "Syrup", "company": "Generic"},
    {"name": "ALCIFLOX D", "form": "Drops", "company": "Alkem"},
    {"name": "ALICLAIR 125 SYRUP", "form": "Syrup", "company": "Generic"},
    {"name": "ALICLAIR 250-4 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ALICLAIR 250 SYRP", "form": "Syrup", "company": "Generic"},
    {"name": "ALICLAIR 500", "form": "Tablet", "company": "Generic"},
    {"name": "ALKACIP 100 ML SYP", "form": "Syrup", "company": "Cipla"},
    {"name": "ALKOF JUNIOR 100", "form": "Syrup", "company": "Alkem"},
    {"name": "ALKOF JUNIOR 60 ML", "form": "Syrup", "company": "Alkem"},
    {"name": "ALKOF LS PLUS", "form": "Syrup", "company": "Alkem"},
    {"name": "ALKOF LS SYP", "form": "Syrup", "company": "Alkem"},
    {"name": "ALMOX CV 625-6 TAB", "form": "Tablet", "company": "Alkem"},
    {"name": "ALNURO PLUS", "form": "Capsule", "company": "Mankind"},
    {"name": "ALPHA KETONAVAG", "form": "Tablet", "company": "Generic"},
    {"name": "ALTIVA 120 MG", "form": "Tablet", "company": "Sun"},
    {"name": "ALZYME SYRUP", "form": "Syrup", "company": "Generic"},
    {"name": "AMLOBIG 5", "form": "Tablet", "company": "Generic"},
    {"name": "AMLOBIG AT", "form": "Tablet", "company": "Generic"},
    {"name": "AMLOKIND 5MG", "form": "Tablet", "company": "Mankind"},
    {"name": "AMOXYCLAV 375", "form": "Tablet", "company": "Abbott"},
    {"name": "AMOXYCLAV 625 MG", "form": "Tablet", "company": "Abbott"},
    {"name": "AMROLTRU 0.25%", "form": "Solution", "company": "Generic"},
    {"name": "AMROX JUNIOR", "form": "Syrup", "company": "Generic"},
    {"name": "ANERGEN", "form": "Tablet", "company": "Anthem"},
    {"name": "APARCARMINE RAFT", "form": "Syrup", "company": "Generic"},
    {"name": "APTISATRT SYP", "form": "Syrup", "company": "Prime"},
    {"name": "AQUAGERMINA - ONE RESP", "form": "Respule", "company": "Generic"},
    {"name": "ARADIM 0.25% OINT", "form": "Ointment", "company": "Generic"},
    {"name": "ARISTOMOX CV 625", "form": "Tablet", "company": "Aristo"},
    {"name": "ARISTONEUROL OD", "form": "Tablet", "company": "Aristo"},
    {"name": "ARISTONEUROL PLUS", "form": "Tablet", "company": "Aristo"},
    {"name": "ARISTOVERT 16", "form": "Tablet", "company": "Aristo"},
    {"name": "ASCODEX JR LS DRP", "form": "Drops", "company": "Generic"},
    {"name": "ASCODEX LS JUNIOR SYRP", "form": "Syrup", "company": "Generic"},
    {"name": "ATARISE 10-5 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ATORBEST 10", "form": "Tablet", "company": "Generic"},
    {"name": "ATORBEST 20", "form": "Tablet", "company": "Generic"},
    {"name": "ATORVAKIND 10", "form": "Tablet", "company": "Mankind"},
    {"name": "AVACRD AT 50/5 MG", "form": "Tablet", "company": "Generic"},
    {"name": "AVEENO BABY WASH & SHAMPOO", "form": "Shampoo", "company": "Aveeno"},
    {"name": "AZIKIND 250", "form": "Tablet", "company": "Mankind"},
    {"name": "AZIKIND 500", "form": "Tablet", "company": "Mankind"},
    {"name": "B METHYL 16", "form": "Tablet", "company": "Generic"},
    {"name": "B METHYL 4 MG", "form": "Tablet", "company": "Generic"},
    {"name": "BELIV AF", "form": "Tablet", "company": "Generic"},
    {"name": "BENDEX 400 TAB", "form": "Tablet", "company": "Cipla"},
    {"name": "BENDEX CHERRY SYRP", "form": "Syrup", "company": "Cipla"},
    {"name": "BESIFLAM SYRUP", "form": "Syrup", "company": "Generic"},
    {"name": "BETADINE PESSARY", "form": "Pessary", "company": "Win"},
    {"name": "BETHNEVOID 25", "form": "Tablet", "company": "Generic"},
    {"name": "BILATEK M", "form": "Tablet", "company": "Generic"},
    {"name": "BIOCIB T4", "form": "Tablet", "company": "Generic"},
    {"name": "BIOVEIN FORTE", "form": "Tablet", "company": "Generic"},
    {"name": "BLACK PERFUME", "form": "Perfume", "company": "Generic"},
    {"name": "BRO COFDEX SYP", "form": "Syrup", "company": "Generic"},
    {"name": "BRONCHOFIL N", "form": "Syrup", "company": "Generic"},
    {"name": "BRUTACROSS 100", "form": "Tablet", "company": "Generic"},
    {"name": "BRUTACROSS CV 200", "form": "Tablet", "company": "Generic"},
    {"name": "BRUTIFUR 100", "form": "Tablet", "company": "Generic"},
    {"name": "BURNHEAL", "form": "Cream", "company": "Cipla"},
    {"name": "CALAMINE LOTION", "form": "Lotion", "company": "Generic"},
    {"name": "CALCIGEN D3", "form": "Tablet", "company": "Generic"},
    {"name": "CALDIMINT CORAL", "form": "Tablet", "company": "Generic"},
    {"name": "CALDIMINT FEM", "form": "Tablet", "company": "Generic"},
    {"name": "CANAZOLE MOUTH PAINT", "form": "Mouth Paint", "company": "Generic"},
    {"name": "CANDIPRAZ 100", "form": "Capsule", "company": "Generic"},
    {"name": "CANDIPRAZ 200", "form": "Capsule", "company": "Generic"},
    {"name": "CANZOLE B LOTION", "form": "Lotion", "company": "Generic"},
    {"name": "CARDIPURE 10", "form": "Tablet", "company": "Generic"},
    {"name": "CARDIPURE T", "form": "Tablet", "company": "Generic"},
    {"name": "CAREBACT", "form": "Tablet", "company": "Generic"},
    {"name": "CAREFIT", "form": "Tablet", "company": "Generic"},
    {"name": "CARIFORD TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CARITERO", "form": "Tablet", "company": "Generic"},
    {"name": "CARTIFLOW TAB", "form": "Tablet", "company": "Generic"},
    {"name": "CARTIGEN DN", "form": "Tablet", "company": "Generic"},
    {"name": "CASTOR D EYE/EAR", "form": "Drops", "company": "Generic"},
    {"name": "CEFABLAST 250", "form": "Tablet", "company": "Generic"},
    {"name": "CEFASYN 250 MG-4", "form": "Tablet", "company": "Cipla"},
    {"name": "CEFASYN 500", "form": "Tablet", "company": "Cipla"},
    {"name": "CEFPER 500", "form": "Tablet", "company": "Generic"},
    {"name": "CEFPER CV", "form": "Tablet", "company": "Generic"},
    {"name": "CERIZ 10 MG", "form": "Tablet", "company": "Generic"},
    {"name": "CETAPHIL GENTLE SKIN CLEANSER", "form": "Cleanser", "company": "Galderma"},
    {"name": "CETAPHIL OILY SKIN", "form": "Cleanser", "company": "Galderma"},
    {"name": "CETPHIL MOISTURISING", "form": "Cream", "company": "Galderma"},
    {"name": "CETRIZENE 10", "form": "Tablet", "company": "Generic"},
    {"name": "CHESTON AX SYP", "form": "Syrup", "company": "Cipla"},
    {"name": "CHESTON AX SYRUP", "form": "Syrup", "company": "Cipla"},
    {"name": "CHESTON COLD TOTAL", "form": "Tablet", "company": "Cipla"},
    {"name": "CHESTON PLUS SYP", "form": "Syrup", "company": "Cipla"},
    {"name": "CHORONEX GEL", "form": "Gel", "company": "Generic"},
    {"name": "CILOGARD 5 MG", "form": "Tablet", "company": "Cipla"},
    {"name": "CINABET 16", "form": "Tablet", "company": "Generic"},
    {"name": "CINABET 8", "form": "Tablet", "company": "Generic"},
    {"name": "CINABET-24", "form": "Tablet", "company": "Generic"},
    {"name": "CINAFREE PLUS", "form": "Tablet", "company": "Generic"},
    {"name": "CINALOC 5", "form": "Tablet", "company": "Generic"},
    {"name": "CINALOC M10", "form": "Tablet", "company": "Generic"},
    {"name": "CINALOC T", "form": "Tablet", "company": "Generic"},
    {"name": "CIPANATE CV 375", "form": "Tablet", "company": "Cipla"},
    {"name": "CIPANATE FORTE DDS SYR", "form": "Syrup", "company": "Cipla"},
    {"name": "CIPCAL D3 60 K CAP", "form": "Capsule", "company": "Cipla"},
    {"name": "CIPCAL SYRUP", "form": "Syrup", "company": "Cipla"},
    {"name": "CIPLACTIN SYRP", "form": "Syrup", "company": "Cipla"},
    {"name": "CIPLADIEN GARGLE", "form": "Gargle", "company": "Cipla"},
    {"name": "CIPRODAC 250", "form": "Tablet", "company": "Generic"},
    {"name": "CIPZEN D", "form": "Capsule", "company": "Cipla"},
    {"name": "CIPZOX-6 TAB", "form": "Tablet", "company": "Cipla"},
    {"name": "CITRO FLO B6", "form": "Tablet", "company": "Generic"},
    {"name": "CLARIXL 250", "form": "Tablet", "company": "Generic"},
    {"name": "CLARIXL 500", "form": "Tablet", "company": "Generic"},
    {"name": "CLINDOAID 300", "form": "Capsule", "company": "Generic"},
    {"name": "CLINEP 10", "form": "Tablet", "company": "Generic"},
    {"name": "CLINEPEU PESARY", "form": "Pessary", "company": "Generic"},
    {"name": "CLINISOL GEL", "form": "Gel", "company": "Generic"},
    {"name": "CLINPEU 300 MG", "form": "Capsule", "company": "Generic"},
    {"name": "CLINSTEP FORTE", "form": "Tablet", "company": "Generic"},
    {"name": "CLISTOAZOL 50", "form": "Tablet", "company": "Generic"},
    {"name": "CLOET-GM", "form": "Cream", "company": "Generic"},
    {"name": "CLOMIYES 25", "form": "Tablet", "company": "Generic"},
    {"name": "CLOMIYES 50", "form": "Tablet", "company": "Generic"},
    {"name": "COFOL Z", "form": "Tablet", "company": "Generic"},
    {"name": "COFRYL SYRUP", "form": "Syrup", "company": "Generic"},
    {"name": "COLGATE CHARCOAL CLEAN GEL", "form": "Gel", "company": "Colgate"},
    {"name": "COLGATE TOTAL ACTIVE PRE", "form": "Toothpaste", "company": "Colgate"},
    {"name": "CORN CAPS", "form": "Capsule", "company": "Generic"},
    {"name": "CORN PLASTER 4 STRIP", "form": "Plaster", "company": "Generic"},
    {"name": "CORTIYES MD 16", "form": "Tablet", "company": "Mankind"},
    {"name": "CORTIYES MD 8", "form": "Tablet", "company": "Mankind"},
    {"name": "CRITICOLD PLUS", "form": "Tablet", "company": "Generic"},
    {"name": "CUFLIFT LS JUNIOR 60 ML", "form": "Syrup", "company": "Generic"},
    {"name": "CUFLIFT-LS SYP", "form": "Syrup", "company": "Generic"},
    {"name": "CURIVIT", "form": "Capsule", "company": "Generic"},
    {"name": "CYCITA 5 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "D3 HIGH CAP", "form": "Capsule", "company": "Generic"},
    {"name": "DABUR ALMA HAIR OIL", "form": "Oil", "company": "Dabur"},
    {"name": "DAILYGLIM M1", "form": "Tablet", "company": "Generic"},
    {"name": "DANFREE SHAMPOO", "form": "Shampoo", "company": "Cipla"},
    {"name": "DAPANTA TRIO", "form": "Tablet", "company": "Generic"},
    {"name": "DEBISTAL GM2", "form": "Tablet", "company": "Generic"},
    {"name": "DEFLISO 6", "form": "Tablet", "company": "Generic"},
    {"name": "DEFLOVEIN", "form": "Tablet", "company": "Generic"},
    {"name": "DELTONE 60 MG", "form": "Capsule", "company": "Alembic"},
    {"name": "DERICIP 150", "form": "Tablet", "company": "Cipla"},
    {"name": "DERMIYES OC", "form": "Cream", "company": "Generic"},
    {"name": "DETTOL ANTISEPTIC LIQUID", "form": "Liquid", "company": "Reckitt"},
    {"name": "DETTOL ANTISEPTIC LIQUID SMALL", "form": "Liquid", "company": "Reckitt"},
    {"name": "DETTOL ORIGINAL GERM DEFENCE", "form": "Soap", "company": "Reckitt"},
    {"name": "DEXLURON LC", "form": "Tablet", "company": "Generic"},
    {"name": "DEXORANGE SYP", "form": "Syrup", "company": "Franco"},
    {"name": "DIAPLAN PROTEIN POWDER", "form": "Powder", "company": "Generic"},
    {"name": "DICLOGESIC GEL 30 GM", "form": "Gel", "company": "Generic"},
    {"name": "DICLOTREAT CREAM", "form": "Cream", "company": "Generic"},
    {"name": "DICLOWIN PLUS 2TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DILIGAN 25", "form": "Tablet", "company": "Dr Reddy"},
    {"name": "DOBIMEC TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DOLIEF 6 SYRUP", "form": "Syrup", "company": "Generic"},
    {"name": "DOLOBRAKE MR", "form": "Tablet", "company": "Generic"},
    {"name": "DOLOBRAKE SP", "form": "Tablet", "company": "Generic"},
    {"name": "DOLOCOLD DS SYRUP", "form": "Syrup", "company": "Generic"},
    {"name": "DOLOSEN 500", "form": "Tablet", "company": "Generic"},
    {"name": "DOLOZOX NEO", "form": "Tablet", "company": "Generic"},
    {"name": "DOLOZOX NEO-5", "form": "Tablet", "company": "Generic"},
    {"name": "DOMSTAL 10", "form": "Tablet", "company": "Generic"},
    {"name": "DORIMAC-1 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DOXOCIP 400", "form": "Tablet", "company": "Cipla"},
    {"name": "DOXOHIGH-400", "form": "Tablet", "company": "Generic"},
    {"name": "DOXYITIC LB", "form": "Capsule", "company": "Generic"},
    {"name": "DOXYKIND LB CAPSULES", "form": "Capsule", "company": "Mankind"},
    {"name": "DOXYTIME", "form": "Capsule", "company": "Generic"},
    {"name": "DREAMSURE M", "form": "Tablet", "company": "Generic"},
    {"name": "DROKEZ M TAB", "form": "Tablet", "company": "Generic"},
    {"name": "DYDROFEM 10", "form": "Tablet", "company": "Generic"},
    {"name": "DYNAFLEX MR", "form": "Tablet", "company": "Generic"},
    {"name": "DYNAFLEX SP", "form": "Tablet", "company": "Generic"},
    {"name": "DYNAFLEX SPRAY", "form": "Spray", "company": "Generic"},
    {"name": "EASYLAX L 100 ML SF", "form": "Solution", "company": "Cipla"},
    {"name": "EASYLAX PLUS", "form": "Solution", "company": "Cipla"},
    {"name": "ECCINORM SACHET", "form": "Sachet", "company": "Generic"},
    {"name": "ECOSPRIN 150 MG", "form": "Tablet", "company": "Usv"},
    {"name": "ECOSPRIN 75 MG", "form": "Tablet", "company": "Usv"},
    {"name": "EMPASOFT 25", "form": "Tablet", "company": "Generic"},
    {"name": "EMSYLATE 500", "form": "Tablet", "company": "Generic"},
    {"name": "ENDOGEST 200", "form": "Capsule", "company": "Generic"},
    {"name": "ENOXAPRIN", "form": "Injection", "company": "Generic"},
    {"name": "ETHAMCIP 500", "form": "Tablet", "company": "Cipla"},
    {"name": "ETOLYTE MR", "form": "Tablet", "company": "Generic"},
    {"name": "ETORIDAY 120", "form": "Tablet", "company": "Mankind"},
    {"name": "ETORIDAY 90", "form": "Tablet", "company": "Mankind"},
    {"name": "ETORISEN MR", "form": "Tablet", "company": "Generic"},
    {"name": "ETOZOX 60", "form": "Tablet", "company": "Cipla"},
    {"name": "ETOZOX 90", "form": "Tablet", "company": "Cipla"},
    {"name": "EVEREADY LEAKPROOF AA1015", "form": "Battery", "company": "Eveready"},
    {"name": "EWINDIOL", "form": "Capsule", "company": "Generic"},
    {"name": "EXCERAFT 200 ML", "form": "Syrup", "company": "Generic"},
    {"name": "FEBUTEC 40 MG", "form": "Tablet", "company": "Cipla"},
    {"name": "FEMIPRISTAL", "form": "Tablet", "company": "Generic"},
    {"name": "FERCEE RED SYRUP", "form": "Syrup", "company": "Generic"},
    {"name": "FERCEE XT", "form": "Tablet", "company": "Generic"},
    {"name": "FERCIP XT SYRUP", "form": "Syrup", "company": "Cipla"},
    {"name": "FERICIP XT", "form": "Tablet", "company": "Cipla"},
    {"name": "FERTIMORE F TABLETS", "form": "Tablet", "company": "Generic"},
    {"name": "FERTYL M 25", "form": "Tablet", "company": "Generic"},
    {"name": "FERYWIN XT PRO", "form": "Tablet", "company": "Generic"},
    {"name": "FEXOTRUE 120", "form": "Tablet", "company": "Generic"},
    {"name": "FEXOTRUE 180", "form": "Tablet", "company": "Generic"},
    {"name": "FIBOGEST 200", "form": "Capsule", "company": "Generic"},
    {"name": "FIBOGEST 400", "form": "Capsule", "company": "Generic"},
    {"name": "FINOBRATE 145", "form": "Tablet", "company": "Knoll"},
    {"name": "FINOBRATE 160", "form": "Tablet", "company": "Knoll"},
    {"name": "FLAGYL", "form": "Tablet", "company": "Abbott"},
    {"name": "FLAMOC CV DDS 457", "form": "Tablet", "company": "Generic"},
    {"name": "FLAMOX CV 228.5", "form": "Tablet", "company": "Generic"},
    {"name": "FLAMOX CV 375", "form": "Tablet", "company": "Generic"},
    {"name": "FLEXIB SYRUP", "form": "Syrup", "company": "Generic"},
    {"name": "FLEXIBON", "form": "Tablet", "company": "Generic"},
    {"name": "FLEXON MR TAB", "form": "Tablet", "company": "Aristo"},
    {"name": "FLUBLAST SPRAY", "form": "Spray", "company": "Generic"},
    {"name": "FLUKA 150 MG", "form": "Tablet", "company": "Cipla"},
    {"name": "FLUKONAZ 400", "form": "Tablet", "company": "Generic"},
    {"name": "FLUKONAZ TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FLUMONT LC KID SYP", "form": "Syrup", "company": "Generic"},
    {"name": "FOURDERM", "form": "Cream", "company": "Cipla"},
    {"name": "FREEGO SYRUP", "form": "Syrup", "company": "Alembic"},
    {"name": "FUL AID GOLD", "form": "Tablet", "company": "Generic"},
    {"name": "FUNGICIP 150 TAB", "form": "Tablet", "company": "Cipla"},
    {"name": "FUNGICIP 200 MG", "form": "Tablet", "company": "Cipla"},
    {"name": "FUNGIFORCE 150 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "FUNGITOP F CREAM", "form": "Cream", "company": "Generic"},
    {"name": "FUTURENZYME", "form": "Capsule", "company": "Generic"},
    {"name": "GABAKEM NT", "form": "Tablet", "company": "Generic"},
    {"name": "GABAKIND NT", "form": "Tablet", "company": "Mankind"},
    {"name": "GABANYL NT100", "form": "Tablet", "company": "Generic"},
    {"name": "GABAPREX-M", "form": "Tablet", "company": "Generic"},
    {"name": "GABAYES PLUS", "form": "Tablet", "company": "Generic"},
    {"name": "GALVAMARK 50MG", "form": "Tablet", "company": "Generic"},
    {"name": "GALVAMARK MET 50/500", "form": "Tablet", "company": "Generic"},
    {"name": "GENTAKEM D", "form": "Drops", "company": "Generic"},
    {"name": "GERMBETA 10%", "form": "Solution", "company": "Generic"},
    {"name": "GILLETTE FOAM REGULAR", "form": "Foam", "company": "Gillette"},
    {"name": "GILLETTE SHAVING FOAM NEEM", "form": "Foam", "company": "Gillette"},
    {"name": "GLENDAN 4 MG", "form": "Tablet", "company": "Glenmark"},
    {"name": "GLIMDA 1", "form": "Tablet", "company": "Cipla"},
    {"name": "GLIMDA 2", "form": "Tablet", "company": "Cipla"},
    {"name": "GLIMDA MV1", "form": "Tablet", "company": "Cipla"},
    {"name": "GLIMDA MV2", "form": "Tablet", "company": "Cipla"},
    {"name": "GLIMIHELP M1", "form": "Tablet", "company": "Generic"},
    {"name": "GLIMIHELP M2", "form": "Tablet", "company": "Generic"},
    {"name": "GLIMIHELP PM1", "form": "Tablet", "company": "Generic"},
    {"name": "GLIMIHELP PM2", "form": "Tablet", "company": "Generic"},
    {"name": "GLIMIHELP VM1/0.2", "form": "Tablet", "company": "Generic"},
    {"name": "GLIMIHELP VM2/0.2", "form": "Tablet", "company": "Generic"},
    {"name": "GLISEN SM 1/50/500", "form": "Tablet", "company": "Generic"},
    {"name": "GLISEN SM 2/50/500", "form": "Tablet", "company": "Generic"},
    {"name": "GLITASENZ M 100", "form": "Tablet", "company": "Generic"},
    {"name": "GLUCOND ORANGE", "form": "Powder", "company": "Generic"},
    {"name": "GLYBOVIN 1.25", "form": "Tablet", "company": "Generic"},
    {"name": "GLYBOVIN 2.5", "form": "Tablet", "company": "Generic"},
    {"name": "GOODBLOC LA 20", "form": "Tablet", "company": "Generic"},
    {"name": "GOODMORN", "form": "Tablet", "company": "Generic"},
    {"name": "GRANTIN D GEL", "form": "Gel", "company": "Generic"},
    {"name": "GUTBLISS", "form": "Capsule", "company": "Generic"},
    {"name": "HAIRFOLIC MEN", "form": "Tablet", "company": "Generic"},
    {"name": "HAIRFOLIC WOMEN", "form": "Tablet", "company": "Generic"},
    {"name": "HAPPY BABY GIFT PACK", "form": "Kit", "company": "Generic"},
    {"name": "HEAD&SHOULDER COOL MENTHOL", "form": "Shampoo", "company": "P&G"},
    {"name": "HEAD&SHOULDER SMOTH & SILKY", "form": "Shampoo", "company": "P&G"},
    {"name": "HEALCEE TAB", "form": "Tablet", "company": "Generic"},
    {"name": "HEALD&SHOULDER OILY STICKY DANDRUFF", "form": "Shampoo", "company": "P&G"},
    {"name": "HEALD&SHOULDER ANTI-HAIRFALL", "form": "Shampoo", "company": "P&G"},
    {"name": "HIMALAYA ANTI HAIR FALL SHAMPOO", "form": "Shampoo", "company": "Himalaya"},
    {"name": "HIMALAYA BABY POWDER", "form": "Powder", "company": "Himalaya"},
    {"name": "HIPRES 25", "form": "Tablet", "company": "Cipla"},
    {"name": "HISTOX 16", "form": "Tablet", "company": "Generic"},
    {"name": "HITAP ER 50", "form": "Tablet", "company": "Generic"},
    {"name": "HUNGREE SYRUP", "form": "Syrup", "company": "Generic"},
    {"name": "HYDROXYSEN 200 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "HYOCIMAX S", "form": "Tablet", "company": "Generic"},
    {"name": "INDULEKHA BRINGHA OIL", "form": "Oil", "company": "HUL"},
    {"name": "INJ FCM 500", "form": "Injection", "company": "Generic"},
    {"name": "INJ PROLUTON", "form": "Injection", "company": "Generic"},
    {"name": "ISOFIT 10", "form": "Tablet", "company": "Generic"},
    {"name": "ITRANOX 200-7 C", "form": "Capsule", "company": "Generic"},
    {"name": "ITROMED SOAP", "form": "Soap", "company": "Generic"},
    {"name": "JAKOSTE PLUS", "form": "Tablet", "company": "Generic"},
    {"name": "JAREN 25 MG", "form": "Tablet", "company": "Generic"},
    {"name": "JAREN L 25/5", "form": "Tablet", "company": "Generic"},
    {"name": "KANDIZYME SYRUP", "form": "Syrup", "company": "Generic"},
    {"name": "KASJEL CS SYRUP SF", "form": "Syrup", "company": "Generic"},
    {"name": "KETOCIP CREAM", "form": "Cream", "company": "Cipla"},
    {"name": "KETONALOG ALPHA", "form": "Tablet", "company": "Generic"},
    {"name": "KOLDKIND", "form": "Tablet", "company": "Mankind"},
    {"name": "KRIMLY", "form": "Cream", "company": "Generic"},
    {"name": "L HIST MONT JUNIOR 30 ML", "form": "Syrup", "company": "Generic"},
    {"name": "LABETOS 100", "form": "Tablet", "company": "Generic"},
    {"name": "LASIPEN 40", "form": "Tablet", "company": "Generic"},
    {"name": "LAXIKEM MIXED FRUIT 170 ML SYP", "form": "Syrup", "company": "Generic"},
    {"name": "LEEBIOTIC CAP", "form": "Capsule", "company": "Leeford"},
    {"name": "LETROLIM 2.5", "form": "Tablet", "company": "Generic"},
    {"name": "LEVOCAT 500", "form": "Tablet", "company": "Generic"},
    {"name": "LEVOQUIN 500", "form": "Tablet", "company": "Cipla"},
    {"name": "LEVPZET 5MG", "form": "Tablet", "company": "Generic"},
    {"name": "LINAMIT 5 MG", "form": "Tablet", "company": "Generic"},
    {"name": "LINOWIN 600", "form": "Tablet", "company": "Generic"},
    {"name": "LIPICROSS R 10", "form": "Tablet", "company": "Generic"},
    {"name": "LIPICROSS RF", "form": "Tablet", "company": "Generic"},
    {"name": "LIPVAS 10 MG", "form": "Tablet", "company": "Cipla"},
    {"name": "LIPVAS 20 MG", "form": "Tablet", "company": "Cipla"},
    {"name": "LISTERINE COOL MINT MOUTH WASH", "form": "Mouth Wash", "company": "J&J"},
    {"name": "LITTLES BABY WIPES", "form": "Wipes", "company": "Generic"},
    {"name": "LIVEASY CREPE BANDAGE 10 CM", "form": "Bandage", "company": "Liveasy"},
    {"name": "LIVEASY NAIL PAINT", "form": "Nail Paint", "company": "Liveasy"},
    {"name": "LIVEASY PATCH", "form": "Patch", "company": "Liveasy"},
    {"name": "LIVEAZY SPRAY", "form": "Spray", "company": "Liveasy"},
    {"name": "LIVOSOFT 150", "form": "Tablet", "company": "Generic"},
    {"name": "LIVOSOFT 300", "form": "Tablet", "company": "Generic"},
    {"name": "LODENS 5", "form": "Tablet", "company": "Generic"},
    {"name": "LODENS F", "form": "Tablet", "company": "Generic"},
    {"name": "LONOPIN 40 MG INJ", "form": "Injection", "company": "Generic"},
    {"name": "LOPID 300 CAP", "form": "Capsule", "company": "Pfizer"},
    {"name": "LOVOLKEM 250", "form": "Tablet", "company": "Generic"},
    {"name": "LOVOLKEM 250-10 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "LULIACT LOTION", "form": "Lotion", "company": "Generic"},
    {"name": "LULIEASE CREAM 10 GM", "form": "Cream", "company": "Generic"},
    {"name": "LULIHIGH LOTION", "form": "Lotion", "company": "Generic"},
    {"name": "LULITEC 20 GM CREAM", "form": "Cream", "company": "Cipla"},
    {"name": "LULITEC CREAM 10 GM", "form": "Cream", "company": "Cipla"},
    {"name": "LULITEC SPRAY", "form": "Spray", "company": "Cipla"},
    {"name": "LULITREAT B CREAM 10 GM", "form": "Cream", "company": "Generic"},
    {"name": "LULITREAT SOAP", "form": "Soap", "company": "Generic"},
    {"name": "MA DHA", "form": "Capsule", "company": "Generic"},
    {"name": "MACBION LC 100ML", "form": "Syrup", "company": "Macleods"},
    {"name": "MACBION LC 200", "form": "Syrup", "company": "Macleods"},
    {"name": "MACPLATIN 200 ML", "form": "Syrup", "company": "Macleods"},
    {"name": "MACTHROMBO GEL", "form": "Gel", "company": "Macleods"},
    {"name": "MAGINS 400", "form": "Tablet", "company": "Generic"},
    {"name": "MAGINSO", "form": "Tablet", "company": "Generic"},
    {"name": "MAGNAKOF DX JR", "form": "Syrup", "company": "Mankind"},
    {"name": "MAGNAKOF DX SF", "form": "Syrup", "company": "Mankind"},
    {"name": "MAGNAKOF LS SF", "form": "Syrup", "company": "Mankind"},
    {"name": "MAHACLA RTD", "form": "Tablet", "company": "Generic"},
    {"name": "MAHAMOX CV 625", "form": "Tablet", "company": "Generic"},
    {"name": "MAHAMOX CV DUO", "form": "Tablet", "company": "Generic"},
    {"name": "MAHAMOX CV SYRP", "form": "Syrup", "company": "Generic"},
    {"name": "MAXIRICH", "form": "Capsule", "company": "Cipla"},
    {"name": "MEBALIN OD", "form": "Tablet", "company": "Generic"},
    {"name": "MEBEX-6 TAB", "form": "Tablet", "company": "Cipla"},
    {"name": "MEGACECLO SPAS", "form": "Tablet", "company": "Generic"},
    {"name": "MEGAVAX 5G", "form": "Sachet", "company": "Generic"},
    {"name": "MELNOR CREAM", "form": "Cream", "company": "Generic"},
    {"name": "METAHART XL 50", "form": "Tablet", "company": "Generic"},
    {"name": "METAHENZ VG2", "form": "Tablet", "company": "Generic"},
    {"name": "METASENS VG1", "form": "Tablet", "company": "Generic"},
    {"name": "METASENZ V 0.3", "form": "Tablet", "company": "Generic"},
    {"name": "METBETIC GL2", "form": "Tablet", "company": "Generic"},
    {"name": "METFOR 500 MG", "form": "Tablet", "company": "Generic"},
    {"name": "METHERGIN", "form": "Tablet", "company": "Novartis"},
    {"name": "METHIFOL LC", "form": "Tablet", "company": "Generic"},
    {"name": "METOHEART XL 25", "form": "Tablet", "company": "Generic"},
    {"name": "METOHEART XL 50", "form": "Tablet", "company": "Generic"},
    {"name": "METOZ 2.5", "form": "Tablet", "company": "Generic"},
    {"name": "METROGYL 600", "form": "Tablet", "company": "Generic"},
    {"name": "MGD3", "form": "Tablet", "company": "Generic"},
    {"name": "MINMIN PB TAB", "form": "Tablet", "company": "Rpg"},
    {"name": "MONOVONO", "form": "Tablet", "company": "Generic"},
    {"name": "MONTECIP FX", "form": "Tablet", "company": "Cipla"},
    {"name": "MONTECIP LC", "form": "Tablet", "company": "Cipla"},
    {"name": "MONTECIP LC SYRUP", "form": "Syrup", "company": "Cipla"},
    {"name": "MONTENOVA FX", "form": "Tablet", "company": "Generic"},
    {"name": "MONTENOVA LC-5 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MOREDOT 10 MG", "form": "Tablet", "company": "Generic"},
    {"name": "MOREDOT 100", "form": "Tablet", "company": "Generic"},
    {"name": "MOUTH ULCER GEL", "form": "Gel", "company": "Generic"},
    {"name": "MOXIMAX D", "form": "Tablet", "company": "Generic"},
    {"name": "MUCINOVA EF 600-2 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MUCOEND 600 EF-2 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "MUCOFORM AB 200", "form": "Tablet", "company": "Generic"},
    {"name": "MUCOLINC SYP", "form": "Syrup", "company": "Cipla"},
    {"name": "MULTIRICH", "form": "Capsule", "company": "Lupin"},
    {"name": "MUPICIP 2% 15 GM OINT", "form": "Ointment", "company": "Cipla"},
    {"name": "MUPICIP 5GM", "form": "Ointment", "company": "Cipla"},
    {"name": "MYO BD", "form": "Tablet", "company": "Generic"},
    {"name": "MYOVIL FORTE", "form": "Tablet", "company": "Generic"},
    {"name": "MYOVIL PLUS SACHETS", "form": "Sachet", "company": "Generic"},
    {"name": "N ACETAU", "form": "Tablet", "company": "Generic"},
    {"name": "NAFODIL 75", "form": "Tablet", "company": "Generic"},
    {"name": "NAPROSTRONG 250", "form": "Tablet", "company": "Generic"},
    {"name": "NAPROSTRONG D 250", "form": "Tablet", "company": "Generic"},
    {"name": "NAPROSTRONG D 500", "form": "Tablet", "company": "Generic"},
    {"name": "NAPROWEL PLUS", "form": "Tablet", "company": "Generic"},
    {"name": "NAVRATANA OIL", "form": "Oil", "company": "Navratna"},
    {"name": "NAZOHYPE S", "form": "Spray", "company": "Generic"},
    {"name": "NEFROPATH", "form": "Tablet", "company": "Generic"},
    {"name": "NEFROSMOOTH AT", "form": "Tablet", "company": "Generic"},
    {"name": "NEUROBION FORTE", "form": "Tablet", "company": "Procter"},
    {"name": "NEURORUSH LC", "form": "Tablet", "company": "Generic"},
    {"name": "NEVIA FRESH POWER", "form": "Deodorant", "company": "Nivea"},
    {"name": "NEVIA MEN DEEP IMPACT", "form": "Deodorant", "company": "Nivea"},
    {"name": "NEVIA MEN FRESH ACTIVE", "form": "Deodorant", "company": "Nivea"},
    {"name": "NEVIA PEARL & BEAUTY", "form": "Deodorant", "company": "Nivea"},
    {"name": "NEWLARG SACHET", "form": "Sachet", "company": "Generic"},
    {"name": "NEXOM RD CAP", "form": "Capsule", "company": "Generic"},
    {"name": "NIFURTI 100", "form": "Tablet", "company": "Generic"},
    {"name": "NITAXAN 100 SR", "form": "Tablet", "company": "Generic"},
    {"name": "NITZOXIDE 500", "form": "Tablet", "company": "Generic"},
    {"name": "NIVEA", "form": "Cream", "company": "Nivea"},
    {"name": "NIVEA BODY LOTION COCOA NOURRISH", "form": "Lotion", "company": "Nivea"},
    {"name": "NIVEA BODY MILK LOTION", "form": "Lotion", "company": "Nivea"},
    {"name": "NIVEA PURE IMPACT", "form": "Deodorant", "company": "Nivea"},
    {"name": "NIVEA SOFT LIGHT MOIST", "form": "Cream", "company": "Nivea"},
    {"name": "NIVEA SUN PROTECT & MOIST", "form": "Lotion", "company": "Nivea"},
    {"name": "NOCOLD TAB", "form": "Tablet", "company": "Generic"},
    {"name": "NORDAY TZ NF", "form": "Tablet", "company": "Generic"},
    {"name": "NOVACLAV 625-6 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "NOVUGEST M 10", "form": "Tablet", "company": "Generic"},
    {"name": "NUDICLO 2X", "form": "Tablet", "company": "Generic"},
    {"name": "NUTRACIBEL CHOCO", "form": "Powder", "company": "Generic"},
    {"name": "NUTRACIBEL ELAICHI", "form": "Powder", "company": "Generic"},
    {"name": "NUTREME LITE", "form": "Powder", "company": "Generic"},
    {"name": "OFLOFINE-M", "form": "Tablet", "company": "Generic"},
    {"name": "OFLOFINE-M SUSPENSION", "form": "Suspension", "company": "Generic"},
    {"name": "OKACET L", "form": "Tablet", "company": "Cipla"},
    {"name": "OLEFINE M SYRP", "form": "Syrup", "company": "Generic"},
    {"name": "OMEECAINE GEL", "form": "Gel", "company": "Generic"},
    {"name": "OMNACORTIL 10", "form": "Tablet", "company": "Macleods"},
    {"name": "OMNACORTIL 20", "form": "Tablet", "company": "Macleods"},
    {"name": "OMNACORTIL 5", "form": "Tablet", "company": "Macleods"},
    {"name": "OMNACORTIL 60 ML", "form": "Syrup", "company": "Macleods"},
    {"name": "OMNACORTIL DROPS", "form": "Drops", "company": "Macleods"},
    {"name": "OMNACORTIL FORTE SYP", "form": "Syrup", "company": "Macleods"},
    {"name": "OMNICLAV 375-6 TAB", "form": "Tablet", "company": "Cipla"},
    {"name": "ONDENTRU 2MG SOLUTION", "form": "Solution", "company": "Generic"},
    {"name": "ORACRAFT GEL", "form": "Gel", "company": "Generic"},
    {"name": "ORAGUARD INSTA", "form": "Mouthwash", "company": "Generic"},
    {"name": "ORS SACHET", "form": "Sachet", "company": "Generic"},
    {"name": "ORTHAL FORTE-5 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "OSLID CREAM", "form": "Cream", "company": "Generic"},
    {"name": "OXOLINE SPRAY", "form": "Spray", "company": "Generic"},
    {"name": "OZIVA BIOTIN", "form": "Tablet", "company": "Oziva"},
    {"name": "OZIVA HAIR VITAMINS", "form": "Tablet", "company": "Oziva"},
    {"name": "PANDERM + POWDER", "form": "Powder", "company": "Generic"},
    {"name": "PANTOLUP DSR", "form": "Capsule", "company": "Lupin"},
    {"name": "PARAKIND DS SYP", "form": "Syrup", "company": "Mankind"},
    {"name": "PENATLOC DSR", "form": "Capsule", "company": "Generic"},
    {"name": "PHARCAL FORTE", "form": "Tablet", "company": "Generic"},
    {"name": "PHARCAL K27", "form": "Tablet", "company": "Generic"},
    {"name": "PHENSDYL DX SYRUP", "form": "Syrup", "company": "Abbott"},
    {"name": "PILOGO CREAM 20 GM", "form": "Cream", "company": "Generic"},
    {"name": "PIORIDE 1 MG", "form": "Tablet", "company": "Generic"},
    {"name": "PIORIDE 2 MG", "form": "Tablet", "company": "Generic"},
    {"name": "PLACENTREX CREAM", "form": "Cream", "company": "Albert"},
    {"name": "PLATONIC SYRUP", "form": "Syrup", "company": "Generic"},
    {"name": "PODOLGEN 50 SYRP", "form": "Syrup", "company": "Generic"},
    {"name": "PODOLGEN FORTE SYRUP", "form": "Syrup", "company": "Generic"},
    {"name": "POVIDOT GARGLE", "form": "Gargle", "company": "Generic"},
    {"name": "POWERFLAM MR", "form": "Tablet", "company": "Generic"},
    {"name": "PRE-GABAPREX", "form": "Tablet", "company": "Generic"},
    {"name": "PREGABANYL NT", "form": "Tablet", "company": "Generic"},
    {"name": "PREGNERV NT", "form": "Tablet", "company": "Generic"},
    {"name": "PREGNOVA NT", "form": "Tablet", "company": "Generic"},
    {"name": "PREGVOM", "form": "Tablet", "company": "Generic"},
    {"name": "PREGVOM PLUS", "form": "Tablet", "company": "Generic"},
    {"name": "PRIMEPILL 35", "form": "Tablet", "company": "Generic"},
    {"name": "PRIMEPILL ULTRA", "form": "Tablet", "company": "Generic"},
    {"name": "PRIUX NT", "form": "Tablet", "company": "Generic"},
    {"name": "PROZEF CAP", "form": "Capsule", "company": "Generic"},
    {"name": "PRUVICT 1 MG", "form": "Tablet", "company": "Generic"},
    {"name": "PYRIDIUM 200", "form": "Tablet", "company": "Generic"},
    {"name": "Q MAX 200", "form": "Tablet", "company": "Generic"},
    {"name": "RABEFINE DSR", "form": "Capsule", "company": "Generic"},
    {"name": "RABELKEM DSR", "form": "Capsule", "company": "Generic"},
    {"name": "RABELKEM IT", "form": "Capsule", "company": "Generic"},
    {"name": "RABESEC DSR", "form": "Capsule", "company": "Cipla"},
    {"name": "RABESEC LS", "form": "Capsule", "company": "Cipla"},
    {"name": "RABESEC-D SR", "form": "Capsule", "company": "Cipla"},
    {"name": "RABIWOK DSR", "form": "Capsule", "company": "Generic"},
    {"name": "RAFLE 200", "form": "Tablet", "company": "Alembic"},
    {"name": "RAFLE 400", "form": "Tablet", "company": "Alembic"},
    {"name": "RAFLE 550", "form": "Tablet", "company": "Alembic"},
    {"name": "RANIPRIDE SYP", "form": "Syrup", "company": "Generic"},
    {"name": "RANIPRIDE SYRP", "form": "Syrup", "company": "Generic"},
    {"name": "RANTOP 150", "form": "Tablet", "company": "Generic"},
    {"name": "RAPID GEL", "form": "Gel", "company": "Generic"},
    {"name": "REACTIN SR 100", "form": "Tablet", "company": "Cipla"},
    {"name": "RECLER MPS PLUS", "form": "Syrup", "company": "Generic"},
    {"name": "REJUNATE L", "form": "Tablet", "company": "Generic"},
    {"name": "REJUNATE-L TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RELIKAST FX", "form": "Tablet", "company": "Generic"},
    {"name": "RENORF 500 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "REXCOF DX SYP", "form": "Syrup", "company": "Generic"},
    {"name": "REXIGUT 550", "form": "Tablet", "company": "Generic"},
    {"name": "RIFA YES 200", "form": "Tablet", "company": "Generic"},
    {"name": "RIFATREAT 200", "form": "Tablet", "company": "Generic"},
    {"name": "RIFAXIGYL 60 ML", "form": "Syrup", "company": "Generic"},
    {"name": "RIFAXIMAX SYRUP", "form": "Syrup", "company": "Generic"},
    {"name": "RIFCURE 200", "form": "Tablet", "company": "Generic"},
    {"name": "RIFCURE 400", "form": "Tablet", "company": "Generic"},
    {"name": "RIFCURE 550", "form": "Tablet", "company": "Generic"},
    {"name": "RING OUT POWDER", "form": "Powder", "company": "Generic"},
    {"name": "RINILACT CAP", "form": "Capsule", "company": "Generic"},
    {"name": "RINILACT DRY SYP", "form": "Syrup", "company": "Generic"},
    {"name": "ROKO", "form": "Capsule", "company": "Cipla"},
    {"name": "ROLITEN 2MG TAB", "form": "Tablet", "company": "Generic"},
    {"name": "ROSAVE EZ 10", "form": "Tablet", "company": "Generic"},
    {"name": "ROSAVE EZ 20", "form": "Tablet", "company": "Generic"},
    {"name": "ROSUBEST 10", "form": "Tablet", "company": "Generic"},
    {"name": "ROSUBEST 20 MG", "form": "Tablet", "company": "Generic"},
    {"name": "ROSUBEST F", "form": "Tablet", "company": "Generic"},
    {"name": "ROSUREN GOLD", "form": "Tablet", "company": "Generic"},
    {"name": "RUFLET TAB", "form": "Tablet", "company": "Generic"},
    {"name": "RZOLE DSR", "form": "Capsule", "company": "Generic"},
    {"name": "SACMIGUT SACHET", "form": "Sachet", "company": "Generic"},
    {"name": "SAM 200", "form": "Tablet", "company": "Generic"},
    {"name": "SAM 400", "form": "Tablet", "company": "Generic"},
    {"name": "SEACURE 200", "form": "Tablet", "company": "Generic"},
    {"name": "SELENIUM LUNG HEALTH", "form": "Tablet", "company": "Generic"},
    {"name": "SENSODYNE X2", "form": "Toothpaste", "company": "Sensodyne"},
    {"name": "SET WET COOL AVATAR", "form": "Gel", "company": "Set Wet"},
    {"name": "SILDOEASE 8MG", "form": "Tablet", "company": "Generic"},
    {"name": "SILDOEASE D", "form": "Tablet", "company": "Generic"},
    {"name": "SILHOLIFE 8", "form": "Tablet", "company": "Generic"},
    {"name": "SILHOLIFE D", "form": "Tablet", "company": "Generic"},
    {"name": "SILIOSTRU 8 MG", "form": "Tablet", "company": "Generic"},
    {"name": "SILIOSTRU-D TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SILODOVA 8", "form": "Tablet", "company": "Generic"},
    {"name": "SIM B6 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "SITAGLIP 100", "form": "Tablet", "company": "Generic"},
    {"name": "SITAGLIP 50", "form": "Tablet", "company": "Generic"},
    {"name": "SITAGLIP D", "form": "Tablet", "company": "Generic"},
    {"name": "SITAGLIP D 50/5", "form": "Tablet", "company": "Generic"},
    {"name": "SITAGLIP DM", "form": "Tablet", "company": "Generic"},
    {"name": "SITAKRAFT 100", "form": "Tablet", "company": "Prime"},
    {"name": "SITAKRAFT 50", "form": "Tablet", "company": "Prime"},
    {"name": "SITAKRAFT M 500", "form": "Tablet", "company": "Prime"},
    {"name": "SITATRI M 50/500", "form": "Tablet", "company": "Generic"},
    {"name": "SITAYES M 500", "form": "Tablet", "company": "Generic"},
    {"name": "SKINSHINE CREAM", "form": "Cream", "company": "Generic"},
    {"name": "SODATAB 500", "form": "Tablet", "company": "Generic"},
    {"name": "SODATAB DS", "form": "Tablet", "company": "Generic"},
    {"name": "SOSTIN 10", "form": "Tablet", "company": "Generic"},
    {"name": "SOSTIN A", "form": "Tablet", "company": "Generic"},
    {"name": "SOSTIN AC", "form": "Tablet", "company": "Generic"},
    {"name": "SOSTIN F", "form": "Tablet", "company": "Generic"},
    {"name": "SPASCAINE SUSPENSION", "form": "Suspension", "company": "Generic"},
    {"name": "SPASMONIL DROPS", "form": "Drops", "company": "Cipla"},
    {"name": "SPASONIX 200", "form": "Tablet", "company": "Generic"},
    {"name": "SPASRELIEF SUSPENSION", "form": "Suspension", "company": "Generic"},
    {"name": "SPASRELIF DROPS", "form": "Drops", "company": "Generic"},
    {"name": "STAYCLEAR TUBE", "form": "Cream", "company": "Generic"},
    {"name": "STRECHMIN CREAM", "form": "Cream", "company": "Generic"},
    {"name": "STRONE 200", "form": "Capsule", "company": "Generic"},
    {"name": "SUCC-C ORANGE", "form": "Tablet", "company": "Generic"},
    {"name": "SUCRA RECLER O 200", "form": "Syrup", "company": "Generic"},
    {"name": "SUCRAZIDE 60MR", "form": "Tablet", "company": "Generic"},
    {"name": "SUCRZIDE MV 0.2", "form": "Tablet", "company": "Generic"},
    {"name": "SUHAGRA 25", "form": "Tablet", "company": "Cipla"},
    {"name": "SULOXID O 100 ML", "form": "Syrup", "company": "Generic"},
    {"name": "SUMO PLUS SPRAY 35 GM", "form": "Spray", "company": "Generic"},
    {"name": "SUPER ZINC", "form": "Tablet", "company": "Generic"},
    {"name": "SUPIROBAN OINT", "form": "Ointment", "company": "Generic"},
    {"name": "SUPRACAL 2000", "form": "Tablet", "company": "Generic"},
    {"name": "SUPRACAL ISO", "form": "Tablet", "company": "Generic"},
    {"name": "SUREPENEM 200", "form": "Tablet", "company": "Generic"},
    {"name": "TCU D3 NANO SHOT-1 BOTTLE", "form": "Solution", "company": "Generic"},
    {"name": "TELMIBLESS 40", "form": "Tablet", "company": "Generic"},
    {"name": "TELMIBLESS AM", "form": "Tablet", "company": "Generic"},
    {"name": "TELMIBLESS AMH", "form": "Tablet", "company": "Generic"},
    {"name": "TELMIBLESS CT", "form": "Tablet", "company": "Generic"},
    {"name": "TELMIBLESS H", "form": "Tablet", "company": "Generic"},
    {"name": "TELMIKIND 20", "form": "Tablet", "company": "Mankind"},
    {"name": "TELMIKIND TRIO 6.25", "form": "Tablet", "company": "Mankind"},
    {"name": "TELMWERES TRIO 40/6.25", "form": "Tablet", "company": "Generic"},
    {"name": "TELTAN 40", "form": "Tablet", "company": "Generic"},
    {"name": "TELTAN AMH", "form": "Tablet", "company": "Generic"},
    {"name": "TENACID MF-2 TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TENDOCARE", "form": "Tablet", "company": "Generic"},
    {"name": "TENDONOVA", "form": "Tablet", "company": "Generic"},
    {"name": "TERBIZOL 250", "form": "Tablet", "company": "Generic"},
    {"name": "THIROACE 125", "form": "Tablet", "company": "Generic"},
    {"name": "THIROACE 37.5", "form": "Tablet", "company": "Generic"},
    {"name": "THIROACE 75", "form": "Tablet", "company": "Generic"},
    {"name": "THYIOUP 150", "form": "Tablet", "company": "Generic"},
    {"name": "THYROCRUSH 100MG", "form": "Tablet", "company": "Generic"},
    {"name": "THYROCRUSH 25 MG", "form": "Tablet", "company": "Generic"},
    {"name": "THYROCRUSH 50 MG", "form": "Tablet", "company": "Generic"},
    {"name": "THYROXINOL 25", "form": "Tablet", "company": "Generic"},
    {"name": "THYROXINOL 75", "form": "Tablet", "company": "Generic"},
    {"name": "THYROXINOL-50", "form": "Tablet", "company": "Generic"},
    {"name": "TICMOXY CL 375", "form": "Tablet", "company": "Generic"},
    {"name": "TINFAL TAB", "form": "Tablet", "company": "Generic"},
    {"name": "TINFAL 5%", "form": "Solution", "company": "Generic"},
    {"name": "TIZAN 2 MG", "form": "Tablet", "company": "Sun"},
    {"name": "TOLAGIN 8", "form": "Tablet", "company": "Generic"},
    {"name": "TORSEMIDE 10 MG", "form": "Tablet", "company": "Generic"},
    {"name": "TORSEMIDE 5MG", "form": "Tablet", "company": "Generic"},
    {"name": "TRANSOFRESH MF", "form": "Tablet", "company": "Generic"},
    {"name": "TRUFEBUX 40", "form": "Tablet", "company": "Generic"},
    {"name": "TRYZEN D", "form": "Tablet", "company": "Generic"},
    {"name": "TUSSMARK D SYP", "form": "Syrup", "company": "Prime"},
    {"name": "UDISEN 450 SR", "form": "Tablet", "company": "Generic"},
    {"name": "ULGEL A", "form": "Syrup", "company": "Generic"},
    {"name": "URISOLIN D", "form": "Tablet", "company": "Generic"},
    {"name": "URIVEL", "form": "Tablet", "company": "Generic"},
    {"name": "URIWAVE 0.4", "form": "Capsule", "company": "Generic"},
    {"name": "URSOLIN D", "form": "Tablet", "company": "Generic"},
    {"name": "UVSPAS TAB", "form": "Tablet", "company": "Generic"},
    {"name": "VASELINE DEEP MOISTURE 48 HR", "form": "Lotion", "company": "Vaseline"},
    {"name": "VAXPRIDE ENERGY", "form": "Capsule", "company": "Generic"},
    {"name": "VAXTIC CAP", "form": "Capsule", "company": "Generic"},
    {"name": "VERTIFORD 16", "form": "Tablet", "company": "Generic"},
    {"name": "VERTIGIL 6 TAB", "form": "Tablet", "company": "Cipla"},
    {"name": "VERTIRON 25", "form": "Tablet", "company": "Generic"},
    {"name": "VIOMETIL MD", "form": "Tablet", "company": "Generic"},
    {"name": "VITIC O", "form": "Tablet", "company": "Generic"},
    {"name": "VOGLI RAPID 2/0.3", "form": "Tablet", "company": "Generic"},
    {"name": "VOGLI-RAPID 0.2/0.5", "form": "Tablet", "company": "Generic"},
    {"name": "VOGLIMET-0.3 MD", "form": "Tablet", "company": "Generic"},
    {"name": "VOGLIMIT TRIO 1.3", "form": "Tablet", "company": "Generic"},
    {"name": "VOGLIMIT TRIO 2.3", "form": "Tablet", "company": "Generic"},
    {"name": "VOLIBO R 0.3/1", "form": "Tablet", "company": "Generic"},
    {"name": "VOLTEND 0.2 MG", "form": "Tablet", "company": "Generic"},
    {"name": "VOLTEND 0.3", "form": "Tablet", "company": "Generic"},
    {"name": "VOLTEND R 0.3", "form": "Tablet", "company": "Generic"},
    {"name": "VOMETIL MD TABLETS", "form": "Tablet", "company": "Cipla"},
    {"name": "VOMIFORD 8 MG", "form": "Tablet", "company": "Generic"},
    {"name": "VOMINORM", "form": "Tablet", "company": "Cipla"},
    {"name": "VOMIOVER MD 4", "form": "Tablet", "company": "Generic"},
    {"name": "VOMIOVER SYRUP", "form": "Syrup", "company": "Generic"},
    {"name": "VOMIRAP-MD", "form": "Tablet", "company": "Generic"},
    {"name": "VOMISHIELD 4MD", "form": "Tablet", "company": "Generic"},
    {"name": "VOMISHIELD MD 8 MG", "form": "Tablet", "company": "Generic"},
    {"name": "VONO 20", "form": "Tablet", "company": "Generic"},
    {"name": "WINCAB 0.5", "form": "Tablet", "company": "Generic"},
    {"name": "WINOGASS", "form": "Tablet", "company": "Generic"},
    {"name": "WINSTEP MAX TAB", "form": "Tablet", "company": "Generic"},
    {"name": "XMETOR 500", "form": "Tablet", "company": "Generic"},
    {"name": "ZANDU CHYAVANPRASH", "form": "Paste", "company": "Zandu"},
    {"name": "ZANDU PANCHARISHTA", "form": "Syrup", "company": "Zandu"},
    {"name": "ZANDU SATAVAREX", "form": "Powder", "company": "Zandu"},
    {"name": "ZANDU SHILAJITPRASH", "form": "Paste", "company": "Zandu"},
    {"name": "ZANDU ULTRA POWER BALM", "form": "Balm", "company": "Zandu"},
    {"name": "ZEEBEE SYRUP", "form": "Syrup", "company": "Generic"},
    {"name": "ZENKIND M SYP", "form": "Syrup", "company": "Mankind"},
    {"name": "ZINCIWELL 100 ML", "form": "Syrup", "company": "Generic"},
    {"name": "ZINCIWELL 200 ML", "form": "Syrup", "company": "Generic"},
    {"name": "ZINCIWELL DROPS", "form": "Drops", "company": "Generic"},
    {"name": "ZINCOCHARI SYP", "form": "Syrup", "company": "Generic"},
    {"name": "ZINCONYD", "form": "Tablet", "company": "Generic"},
    {"name": "ZINDERVIT", "form": "Tablet", "company": "Generic"},
    {"name": "ZITHROVIL SF KIT", "form": "Kit", "company": "Generic"},
    {"name": "ZOCLAR 500", "form": "Tablet", "company": "Generic"},
    {"name": "ZREPAG RAPID", "form": "Tablet", "company": "Generic"},
    {"name": "ZUKAMIN DROPS", "form": "Drops", "company": "Generic"},
    {"name": "ZUKAMIN PLUS DROPS", "form": "Drops", "company": "Generic"},
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
