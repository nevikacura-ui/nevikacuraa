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
    
    return {"token": token, "user": user.model_dump()}

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

# Medicine inventory for Orange Pharmacy
MEDICINE_INVENTORY = [
    {"name": "8x Kt Shampoo", "form": "Shampoo", "company": "Cipla"},
    {"name": "Acivir Dt 400mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Acivir Skin Cream", "form": "Cream", "company": "Cipla"},
    {"name": "Advent 228.5mg Dry Syp", "form": "Syrup", "company": "Cipla"},
    {"name": "Aerocort Rotacaps 60s", "form": "Inhaler", "company": "Cipla"},
    {"name": "Aimil Neeri Tab 30s", "form": "Tablet", "company": "Aimil"},
    {"name": "Airflow 250mcg Rotacaps", "form": "Rotacap", "company": "Steris"},
    {"name": "Alciflox D Eye Drops", "form": "Drops", "company": "Alkem"},
    {"name": "Aldigesic Th 4mg Tab", "form": "Tablet", "company": "Alkem"},
    {"name": "Alex 5mg Tab", "form": "Tablet", "company": "Glenmark"},
    {"name": "Alfunol 10mg Tab", "form": "Tablet", "company": "Knoll"},
    {"name": "Alkacip Syp 100ml", "form": "Syrup", "company": "Cipla"},
    {"name": "Alkof Junior Cough Syrup 100ml", "form": "Syrup", "company": "Alkem"},
    {"name": "Allegra 120mg Tab", "form": "Tablet", "company": "Sanofi"},
    {"name": "Allegra 180mg Tab", "form": "Tablet", "company": "Sanofi"},
    {"name": "Almefkem Spas Tab", "form": "Tablet", "company": "Alkem"},
    {"name": "Almox Cv 625mg Tablets", "form": "Tablet", "company": "Alkem"},
    {"name": "Alnuro Plus Cap", "form": "Capsule", "company": "Mankind"},
    {"name": "Alograce Cream", "form": "Cream", "company": "Lifestar"},
    {"name": "Altiva 120mg Tab", "form": "Tablet", "company": "Sun"},
    {"name": "Amaryl 1mg Tab", "form": "Tablet", "company": "Sanofi"},
    {"name": "Ambrodil S Syp 100ml", "form": "Syrup", "company": "Aristo"},
    {"name": "Amlip 2.5mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Amlip 5mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Amlokind 5mg Tab", "form": "Tablet", "company": "Mankind"},
    {"name": "Amoxyclav 375mg Tab", "form": "Tablet", "company": "Abbott"},
    {"name": "Amoxyclav 625mg Tab", "form": "Tablet", "company": "Abbott"},
    {"name": "Anergen Tab", "form": "Tablet", "company": "Anthem"},
    {"name": "Anovate Cream", "form": "Cream", "company": "Usv"},
    {"name": "Aptistart Syp 200ml", "form": "Syrup", "company": "Prime"},
    {"name": "Aptivate Syp 175ml", "form": "Syrup", "company": "Lupin"},
    {"name": "Aquazide 12.5mg Tab", "form": "Tablet", "company": "Sun"},
    {"name": "Arkamin 100mcg Tab", "form": "Tablet", "company": "Torrent"},
    {"name": "Asthakind Dx Sugar Free Syp 100ml", "form": "Syrup", "company": "Mankind"},
    {"name": "Asthalin 100mcg Inhaler", "form": "Inhaler", "company": "Cipla"},
    {"name": "Asthalin Syp 100ml", "form": "Syrup", "company": "Cipla"},
    {"name": "Atarax 6mg/Ml Drop", "form": "Drops", "company": "Mankind"},
    {"name": "Atarax Syp 100ml", "form": "Syrup", "company": "Dr Reddy"},
    {"name": "Augmentin 625 Duo Tab", "form": "Tablet", "company": "Glaxo"},
    {"name": "Augmentin Duo Syp 30ml", "form": "Syrup", "company": "Glaxo"},
    {"name": "Avil 25mg Tab", "form": "Tablet", "company": "Sanofi"},
    {"name": "Avil 50mg Tab", "form": "Tablet", "company": "Sanofi"},
    {"name": "Azee Xl 200mg Liquid", "form": "Liquid", "company": "Cipla"},
    {"name": "Azipro 250mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Baidyanath Isabgol", "form": "Powder", "company": "Baidyanath"},
    {"name": "Becosules Z Cap 20s", "form": "Capsule", "company": "Pfizer"},
    {"name": "Benadon 40mg Tablet", "form": "Tablet", "company": "Bayer"},
    {"name": "Benadryl Cough Formula Syp 50ml", "form": "Syrup", "company": "J&J"},
    {"name": "Bendex 400mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Betonin Ast Syp 200ml", "form": "Syrup", "company": "Abbott"},
    {"name": "Bisonol 2.5mg Tab", "form": "Tablet", "company": "Knoll"},
    {"name": "Boroplus Antiseptic Cream", "form": "Cream", "company": "Emami"},
    {"name": "Burnheal Cream", "form": "Cream", "company": "Cipla"},
    {"name": "Cacef Cv 100mg Susp 30ml", "form": "Suspension", "company": "Cachet"},
    {"name": "Caladryl Lotion", "form": "Lotion", "company": "Piramal"},
    {"name": "Calcifit 500mg 30s Tab", "form": "Tablet", "company": "Meridian"},
    {"name": "Calpol 250mg Syp 60ml", "form": "Syrup", "company": "Glaxo"},
    {"name": "Candibiotic Plus Ear Drops", "form": "Drops", "company": "Glenmark"},
    {"name": "Candid B Cream", "form": "Cream", "company": "Glenmark"},
    {"name": "Candid Dusting Powder", "form": "Powder", "company": "Glenmark"},
    {"name": "Candid Ear Drops", "form": "Drops", "company": "Glenmark"},
    {"name": "Cardiorostin 10mg Tab", "form": "Tablet", "company": "Leeford"},
    {"name": "Cefasyn 250mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Cefix 200mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Cefix 50mg Syrup", "form": "Syrup", "company": "Cipla"},
    {"name": "Cetaphil Baby Mild Bar", "form": "Soap", "company": "Galderma"},
    {"name": "Cetaphil Cleansing Soap", "form": "Soap", "company": "Galderma"},
    {"name": "Cetcip Syp 30ml", "form": "Syrup", "company": "Cipla"},
    {"name": "Cheston Ax Syp 100ml", "form": "Syrup", "company": "Cipla"},
    {"name": "Cheston Cold Total Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Cheston Plus Expectorant 100ml", "form": "Expectorant", "company": "Cipla"},
    {"name": "Chymoral Forte Tab", "form": "Tablet", "company": "Torrent"},
    {"name": "Cilogard 10mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Cipcal 500mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Cipcal D3 Cap", "form": "Capsule", "company": "Cipla"},
    {"name": "Cipcal Syp 150ml", "form": "Syrup", "company": "Cipla"},
    {"name": "Cipladine 5% Powder", "form": "Powder", "company": "Cipla"},
    {"name": "Cipladine 5% Solution", "form": "Solution", "company": "Cipla"},
    {"name": "Cipladine Gargle Liquid", "form": "Liquid", "company": "Cipla"},
    {"name": "Cipladine Oint", "form": "Ointment", "company": "Cipla"},
    {"name": "Ciplar La 20mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Ciplox D Eye/Ear Drops", "form": "Drops", "company": "Cipla"},
    {"name": "Ciplox Eye/Ear Drops", "form": "Drops", "company": "Cipla"},
    {"name": "Cipzox Tab 6s", "form": "Tablet", "company": "Cipla"},
    {"name": "Cital Syp 100ml", "form": "Syrup", "company": "Indoco"},
    {"name": "Claribid 250mg Dry Syp 30ml", "form": "Powder", "company": "Abbott"},
    {"name": "Claribid 500mg Tab", "form": "Tablet", "company": "Abbott"},
    {"name": "Clearwax Ear Drops", "form": "Drops", "company": "Cipla"},
    {"name": "Clinsol Gel", "form": "Gel", "company": "Leeford"},
    {"name": "Clohex Mouthwash", "form": "Liquid", "company": "Dr Reddy"},
    {"name": "Colicaid Drops", "form": "Drops", "company": "Meyer"},
    {"name": "Combiflam Tab", "form": "Tablet", "company": "Sanofi"},
    {"name": "Combiflam Syp 60ml", "form": "Syrup", "company": "Sanofi"},
    {"name": "Concor Cor 2.5 Tab", "form": "Tablet", "company": "Merck"},
    {"name": "Corbis 2.5mg Tab", "form": "Tablet", "company": "Torrent"},
    {"name": "Corex Dx Syp 100ml", "form": "Syrup", "company": "Pfizer"},
    {"name": "Cortiyes M 4mg Tab", "form": "Tablet", "company": "Mankind"},
    {"name": "Cortiyes M 8mg Tab", "form": "Tablet", "company": "Mankind"},
    {"name": "Cosart 25mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Cosart 50mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Cremaffin Mixed Fruit Liquid 225ml", "form": "Syrup", "company": "Abbott"},
    {"name": "Crocin 650 Tab", "form": "Tablet", "company": "Glaxo"},
    {"name": "Crocin Advance Tab", "form": "Tablet", "company": "Glaxo"},
    {"name": "Cyclopam Susp 60ml", "form": "Suspension", "company": "Indoco"},
    {"name": "Cypon Syp 200ml", "form": "Syrup", "company": "Geno"},
    {"name": "D3 Must Drops", "form": "Drops", "company": "Mankind"},
    {"name": "Daflon 500mg Tab", "form": "Tablet", "company": "Serdia"},
    {"name": "Danfree 1% Shampoo", "form": "Shampoo", "company": "Cipla"},
    {"name": "Danfree 2% Shampoo", "form": "Shampoo", "company": "Cipla"},
    {"name": "Defcort 6mg Tab", "form": "Tablet", "company": "Macleods"},
    {"name": "Deltone 60mg Cap", "form": "Capsule", "company": "Alembic"},
    {"name": "Depura Kids Nano Drops", "form": "Drops", "company": "Sanofi"},
    {"name": "Depura Vitamin D3 60K Solution", "form": "Solution", "company": "Sanofi"},
    {"name": "Deriphyllin Retard 150 Tab", "form": "Tablet", "company": "Zydus"},
    {"name": "Dettol Original Soap", "form": "Soap", "company": "Reckitt"},
    {"name": "Deviry 10mg Tab", "form": "Tablet", "company": "Torrent"},
    {"name": "Dexorange Syp 200ml", "form": "Syrup", "company": "Franco"},
    {"name": "Digene Mint Tab", "form": "Tablet", "company": "Abbott"},
    {"name": "Diligan 25mg Tab", "form": "Tablet", "company": "Dr Reddy"},
    {"name": "Doxykind Lb Tablet", "form": "Tablet", "company": "Mankind"},
    {"name": "Ducodyl Tab", "form": "Tablet", "company": "Universal"},
    {"name": "Dulcoflex 5mg Tab", "form": "Tablet", "company": "Sanofi"},
    {"name": "Dulcoflex 10mg Suppository", "form": "Suppository", "company": "Sanofi"},
    {"name": "Duolin Ld Respules", "form": "Respule", "company": "Cipla"},
    {"name": "Duphalac Lemon Solution 150ml", "form": "Syrup", "company": "Abbott"},
    {"name": "Dytor Plus 10mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Dytor Plus 20mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Easylax L Lemon 100ml", "form": "Solution", "company": "Cipla"},
    {"name": "Ecosprin 150 Tab", "form": "Tablet", "company": "Usv"},
    {"name": "Ecosprin 75 Tab", "form": "Tablet", "company": "Usv"},
    {"name": "Ecosprin Av 75/20 Cap", "form": "Capsule", "company": "Usv"},
    {"name": "Electral Orange Powder Sachet", "form": "Powder", "company": "Fdc"},
    {"name": "Eno Fruit Salt Lemon", "form": "Powder", "company": "Glaxo"},
    {"name": "Eno Fruit Salt Orange", "form": "Powder", "company": "Glaxo"},
    {"name": "Ethamcip 500mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Etoriday 120 Tab", "form": "Tablet", "company": "Mankind"},
    {"name": "Etoriday 90 Tab", "form": "Tablet", "company": "Mankind"},
    {"name": "Etozox 60mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Etozox 90mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Everfresh Tears Eye Drops", "form": "Drops", "company": "Biochem"},
    {"name": "Evion 400 Cap", "form": "Capsule", "company": "Merck"},
    {"name": "Febutec 40mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Fericip Xt Syp 150ml", "form": "Syrup", "company": "Cipla"},
    {"name": "Finobrate 145mg Tab", "form": "Tablet", "company": "Knoll"},
    {"name": "Finobrate 160mg Tab", "form": "Tablet", "company": "Knoll"},
    {"name": "Flagyl Susp 60ml", "form": "Suspension", "company": "Abbott"},
    {"name": "Flexon Mr Tab", "form": "Tablet", "company": "Aristo"},
    {"name": "Flora Bc Dry Syp 60ml", "form": "Syrup", "company": "Mankind"},
    {"name": "Fluka 150mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Fluvir 75 Cap", "form": "Capsule", "company": "Hetero"},
    {"name": "Follihair Ampm Tab", "form": "Tablet", "company": "Abbott"},
    {"name": "Foracort 200 Rotacaps", "form": "Capsule", "company": "Cipla"},
    {"name": "Forcan 150mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Fosirol Sachet", "form": "Sachet", "company": "Cipla"},
    {"name": "Fourderm Cream 20gm", "form": "Ointment", "company": "Cipla"},
    {"name": "Freego Laxative Powder", "form": "Powder", "company": "Alembic"},
    {"name": "Freego Peg Syp 200ml", "form": "Syrup", "company": "Alembic"},
    {"name": "Gelusil Mps Sugar Free Syp 200ml", "form": "Syrup", "company": "Pfizer"},
    {"name": "Glimda 1mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Glimestar M 1mg Tab", "form": "Tablet", "company": "Mankind"},
    {"name": "Glinil M 10 Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Glycomet 250mg Tab", "form": "Tablet", "company": "Usv"},
    {"name": "Grilinctus Dx Syp 100ml", "form": "Syrup", "company": "Franco"},
    {"name": "Hamdard Safi", "form": "Syrup", "company": "Hamdard"},
    {"name": "Health Ok Tab", "form": "Tablet", "company": "Mankind"},
    {"name": "Hetrazan 100mg Tab", "form": "Tablet", "company": "Pfizer"},
    {"name": "Hicope Syp 100ml", "form": "Syrup", "company": "Mankind"},
    {"name": "Himalaya Abana Tab", "form": "Tablet", "company": "Himalaya"},
    {"name": "Himalaya Gasex Tab", "form": "Tablet", "company": "Himalaya"},
    {"name": "Himalaya Liv 52 Tab", "form": "Tablet", "company": "Himalaya"},
    {"name": "Hipres 25mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Histafree Syp 60ml", "form": "Syrup", "company": "Mankind"},
    {"name": "Hynasal Drops/Spray", "form": "Spray", "company": "Dwd"},
    {"name": "Hyperneb 3% Respules", "form": "Respule", "company": "Cipla"},
    {"name": "Ibugesic Plus Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Ibugesic Plus Susp", "form": "Suspension", "company": "Cipla"},
    {"name": "Ibugesic Plus Syp 100ml", "form": "Syrup", "company": "Cipla"},
    {"name": "Ipill Emergency Contraceptive", "form": "Pill", "company": "Cipla"},
    {"name": "Istamet 50/500mg Tab", "form": "Tablet", "company": "Sun"},
    {"name": "Istavel 100mg Tab", "form": "Tablet", "company": "Sun"},
    {"name": "Istavel 50mg Tab", "form": "Tablet", "company": "Sun"},
    {"name": "Ketocip 2% Shampoo", "form": "Shampoo", "company": "Cipla"},
    {"name": "K Trip Forte Tab", "form": "Tablet", "company": "Fdc"},
    {"name": "Lactare 30 Cap", "form": "Capsule", "company": "S"},
    {"name": "Lariago 250 Tab", "form": "Tablet", "company": "Ipca"},
    {"name": "Lasilactone 50mg Tab", "form": "Tablet", "company": "Sanofi"},
    {"name": "Lesuride Tab", "form": "Tablet", "company": "Sun"},
    {"name": "Levipil 500mg Tab", "form": "Tablet", "company": "Sun"},
    {"name": "Levolin Rotacaps", "form": "Capsule", "company": "Cipla"},
    {"name": "Levolin Syp 100ml", "form": "Syrup", "company": "Cipla"},
    {"name": "Levoquin 500mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Linowin 600mg Tab", "form": "Tablet", "company": "Hetero"},
    {"name": "Lipvas 10mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Lipvas 20mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Liv 52 Syp 200ml", "form": "Syrup", "company": "Himalaya"},
    {"name": "Lomotil Tab", "form": "Tablet", "company": "Rpg"},
    {"name": "Lopid 300mg Cap", "form": "Capsule", "company": "Pfizer"},
    {"name": "Lubistar Eye Drops", "form": "Drops", "company": "Mankind"},
    {"name": "Luciara Cream", "form": "Cream", "company": "Bayer"},
    {"name": "Lulifin Cream", "form": "Cream", "company": "Sun"},
    {"name": "Lulitec Cream", "form": "Cream", "company": "Cipla"},
    {"name": "Lulitec Spray", "form": "Lotion", "company": "Cipla"},
    {"name": "Lupituss Sf Susp 100ml", "form": "Suspension", "company": "Lupin"},
    {"name": "Magnakof Dx Sugar Free Syp", "form": "Syrup", "company": "Mankind"},
    {"name": "Maxiflo 250 Rotacaps", "form": "Rotacap", "company": "Cipla"},
    {"name": "Maxirich Gold 30s", "form": "Capsule", "company": "Cipla"},
    {"name": "Maxirich Multivitamin Syp 200ml", "form": "Syrup", "company": "Cipla"},
    {"name": "Maxtra Syp 60ml", "form": "Syrup", "company": "Zuventus"},
    {"name": "Mebex Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Meganeuron Od Plus Cap", "form": "Capsule", "company": "Aristo"},
    {"name": "Methergin Tab", "form": "Tablet", "company": "Novartis"},
    {"name": "Metohart Xl 25mg Tab", "form": "Tablet", "company": "Prime"},
    {"name": "Metohart Xl 50mg Tab", "form": "Tablet", "company": "Mankind"},
    {"name": "Micogel 2% Oint", "form": "Ointment", "company": "Cipla"},
    {"name": "Minmin Pb Syp 120ml", "form": "Syrup", "company": "Rpg"},
    {"name": "Monocef Inj 1gm", "form": "Injection", "company": "Aristo"},
    {"name": "Montair Fx 15 Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Montair Lc Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Montecip Lc Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Moov Ointment", "form": "Ointment", "company": "Reckitt"},
    {"name": "Moov Pain Relief Spray", "form": "Spray", "company": "Reckitt"},
    {"name": "Movexx Sp Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Mucaine Gel Mint Syp 200ml", "form": "Syrup", "company": "Pfizer"},
    {"name": "Mucinac 600mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Mucinac Ab Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Mucolinc Syp 100ml", "form": "Liquid", "company": "Cipla"},
    {"name": "Mucolite Syp 100ml", "form": "Syrup", "company": "Dr Reddy"},
    {"name": "Multirich Cap", "form": "Capsule", "company": "Lupin"},
    {"name": "Mupicip 10gm Cream", "form": "Cream", "company": "Cipla"},
    {"name": "Mupicip Oint 5gm", "form": "Ointment", "company": "Cipla"},
    {"name": "Myospas Tab", "form": "Tablet", "company": "Win"},
    {"name": "Naprosyn 250 Plus Tab", "form": "Tablet", "company": "Rpg"},
    {"name": "Naprosyn 500 Plus Tab", "form": "Tablet", "company": "Rpg"},
    {"name": "Nasomist Nasal Drops", "form": "Drops", "company": "Meridian"},
    {"name": "Nefrosave Forte Tab", "form": "Tablet", "company": "Fourrts"},
    {"name": "Neosporin Powder", "form": "Powder", "company": "Glaxo"},
    {"name": "Neurobion Forte Tab", "form": "Tablet", "company": "Procter"},
    {"name": "Nexpro Junior Sachet", "form": "Sachet", "company": "Torrent"},
    {"name": "Nicardia 20mg Retard Tab", "form": "Tablet", "company": "J&J"},
    {"name": "Nicip 100mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Nurokind Gold Rf Cap", "form": "Capsule", "company": "Mankind"},
    {"name": "Nurokind Z More Tab", "form": "Tablet", "company": "Mankind"},
    {"name": "Okacet Cold Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Okacet L Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Okamet 500mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Omee 20mg Cap", "form": "Capsule", "company": "Alkem"},
    {"name": "Omnacortil 10mg Tab", "form": "Tablet", "company": "Macleods"},
    {"name": "Omnacortil 40mg Tab", "form": "Tablet", "company": "Macleods"},
    {"name": "Omnacortil 5mg Tab", "form": "Tablet", "company": "Macleods"},
    {"name": "Omnacortil Drops", "form": "Drops", "company": "Macleods"},
    {"name": "Omnacortil Syp 60ml", "form": "Syrup", "company": "Macleods"},
    {"name": "Omniclav 375mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Ondem Syp 30ml", "form": "Syrup", "company": "Alkem"},
    {"name": "Otrivin Nasal Spray", "form": "Spray", "company": "Glaxo"},
    {"name": "Pan D 15 Cap", "form": "Capsule", "company": "Alkem"},
    {"name": "Pantosec Dsr Cap", "form": "Capsule", "company": "Cipla"},
    {"name": "Paracip 250mg Susp 60ml", "form": "Suspension", "company": "Cipla"},
    {"name": "Paracip 650mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Pause 500mg Tab", "form": "Tablet", "company": "Emcure"},
    {"name": "Phensedyl Dx Syp 100ml", "form": "Syrup", "company": "Abbott"},
    {"name": "Pirox Dt Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Placentrex Gel", "form": "Gel", "company": "Albert"},
    {"name": "Polybion Lc Syp", "form": "Syrup", "company": "Procter"},
    {"name": "Pregacip M Cap", "form": "Capsule", "company": "Cipla"},
    {"name": "Pulmoclear Tab", "form": "Tablet", "company": "Fourrts"},
    {"name": "Pulmoclear Syp 100ml", "form": "Syrup", "company": "Fourrts"},
    {"name": "Rabesec Dsr Cap", "form": "Capsule", "company": "Cipla"},
    {"name": "Rafle 200mg Tab", "form": "Tablet", "company": "Alembic"},
    {"name": "Rafle 400mg Tab", "form": "Tablet", "company": "Alembic"},
    {"name": "Ramirace 2.5mg Tab", "form": "Tablet", "company": "Knoll"},
    {"name": "Ramirace 5mg Tab", "form": "Tablet", "company": "Knoll"},
    {"name": "Rantac 150mg Tab", "form": "Tablet", "company": "J&J"},
    {"name": "Rapitus Plus Syp 100ml", "form": "Syrup", "company": "Macleods"},
    {"name": "Rapitus Syp 100ml", "form": "Syrup", "company": "Macleods"},
    {"name": "Reactin Sr 100mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Revital H Cap Men 30s", "form": "Capsule", "company": "Sun"},
    {"name": "Ring Guard Cream", "form": "Cream", "company": "Reckitt"},
    {"name": "Roko Cap", "form": "Capsule", "company": "Cipla"},
    {"name": "Rozutin 5mg Tab", "form": "Tablet", "company": "Knoll"},
    {"name": "Saridon Tab", "form": "Tablet", "company": "Piramal"},
    {"name": "Scalpe Pro Shampoo", "form": "Shampoo", "company": "Glenmark"},
    {"name": "Sebamed Clear Face Foam", "form": "Facewash", "company": "Sebamed"},
    {"name": "Sebowash Shampoo", "form": "Shampoo", "company": "Cipla"},
    {"name": "Selsun Daily Shampoo", "form": "Shampoo", "company": "Abbott"},
    {"name": "Seroflo 250 Inhaler", "form": "Inhaler", "company": "Cipla"},
    {"name": "Seroflo 250 Rotacaps", "form": "Capsule", "company": "Cipla"},
    {"name": "Shelcal 500mg Tab", "form": "Tablet", "company": "Torrent"},
    {"name": "Sinarest Af Tab", "form": "Tablet", "company": "Centaur"},
    {"name": "Sitacip 100 Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Sitakraft 100 Tab", "form": "Tablet", "company": "Prime"},
    {"name": "Smuth Cream", "form": "Cream", "company": "Aristo"},
    {"name": "Soframycin Skin Cream", "form": "Cream", "company": "Sanofi"},
    {"name": "Softolax Powder", "form": "Powder", "company": "Lupin"},
    {"name": "Softovac Powder", "form": "Powder", "company": "Lupin"},
    {"name": "Solspre Nasal Spray", "form": "Spray", "company": "Abbott"},
    {"name": "Sompraz D 40mg Cap", "form": "Capsule", "company": "Sun"},
    {"name": "Spasmonil Drops", "form": "Drops", "company": "Cipla"},
    {"name": "Stemetil Md Tab", "form": "Tablet", "company": "Abbott"},
    {"name": "Sucrafil O Sugar Free Gel", "form": "Syrup", "company": "Fourrts"},
    {"name": "Sugar Free Gold Pellets", "form": "Pellet", "company": "Zydus"},
    {"name": "Sulbacef Inj 1.5gm", "form": "Injection", "company": "Biochem"},
    {"name": "Suncros 50 Aqua Lotion", "form": "Lotion", "company": "Sun"},
    {"name": "Supradyn Daily Tablet", "form": "Tablet", "company": "Bayer"},
    {"name": "Supradyn Immunity Tab", "form": "Tablet", "company": "Piramal"},
    {"name": "Syndopa Plus Tab", "form": "Tablet", "company": "Sun"},
    {"name": "Taxim O Forte Dry Syp 30ml", "form": "Syrup", "company": "Alkem"},
    {"name": "T Bact 2% Ointment", "form": "Ointment", "company": "Glaxo"},
    {"name": "Tedibar Bathing Bar", "form": "Soap", "company": "Curatio"},
    {"name": "Telma 20 Tab", "form": "Tablet", "company": "Glenmark"},
    {"name": "Telmiduce Am 40mg Tab", "form": "Tablet", "company": "Macleods"},
    {"name": "Telmiduce H 40mg Tab", "form": "Tablet", "company": "Macleods"},
    {"name": "Terbinaforce 250mg Tab", "form": "Tablet", "company": "Mankind"},
    {"name": "Theo Asthalin Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Thyronorm 100mcg Tab", "form": "Tablet", "company": "Abbott"},
    {"name": "Thyronorm 125mcg Tab", "form": "Tablet", "company": "Abbott"},
    {"name": "Thyronorm 12.5mcg Tab", "form": "Tablet", "company": "Abbott"},
    {"name": "Thyronorm 150mcg Tab", "form": "Tablet", "company": "Abbott"},
    {"name": "Thyronorm 25mcg Tab", "form": "Tablet", "company": "Abbott"},
    {"name": "Thyronorm 50mcg Tab", "form": "Tablet", "company": "Abbott"},
    {"name": "Tizan 2mg Tab", "form": "Tablet", "company": "Sun"},
    {"name": "Torsinol 10mg Tab", "form": "Tablet", "company": "Knoll"},
    {"name": "Torsinol 5mg Tab", "form": "Tablet", "company": "Knoll"},
    {"name": "Tugain 5% Solution", "form": "Solution", "company": "Cipla"},
    {"name": "Tusq Dx Sugar Free Syp", "form": "Syrup", "company": "Blue"},
    {"name": "Tusq X Syp 100ml", "form": "Syrup", "company": "Blue"},
    {"name": "Tussmark D Syp 100ml", "form": "Syrup", "company": "Prime"},
    {"name": "Ultra D3 400iu Drops", "form": "Drops", "company": "Meyer"},
    {"name": "Unienzyme Plus Liquid 200ml", "form": "Liquid", "company": "Torrent"},
    {"name": "Urimax 0.4 Cap", "form": "Capsule", "company": "Cipla"},
    {"name": "Valcivir 1000mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Venusia Moisturizing Cream", "form": "Cream", "company": "Dr Reddy"},
    {"name": "Vertigil Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Vicks Vaporub", "form": "Ointment", "company": "Procter"},
    {"name": "Vitafol Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Vitomin D3 Drops", "form": "Drops", "company": "Cipla"},
    {"name": "Vitomin D3 Sachet", "form": "Sachet", "company": "Cipla"},
    {"name": "Volini Pain Relief Gel", "form": "Gel", "company": "Sun"},
    {"name": "Vometil Md Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Vominorm 10mg Tab", "form": "Tablet", "company": "Cipla"},
    {"name": "Wellman 50 Plus Tab", "form": "Tablet", "company": "Meyer"},
    {"name": "Wellwoman Cap 30s", "form": "Capsule", "company": "Meyer"},
    {"name": "Wysolone 20 Dt Tab", "form": "Tablet", "company": "Pfizer"},
    {"name": "Zandubalm Ultra", "form": "Balm", "company": "Zandu"},
    {"name": "Zandu Nityam Tab", "form": "Tablet", "company": "Zandu"},
    {"name": "Zincovit Sf Syp 200ml", "form": "Syrup", "company": "Apex"},
    {"name": "Zoxan Eye Oint", "form": "Ointment", "company": "Fdc"},
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
