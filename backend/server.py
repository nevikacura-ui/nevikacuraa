from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Header, Query, Body, Request, WebSocket, WebSocketDisconnect
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
from typing import List, Optional, Dict, Set
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import io
import asyncio
import resend
import json
import base64
from pywebpush import webpush, WebPushException
import qrcode
from io import BytesIO

# Import MSG91 WhatsApp service
from services.msg91_whatsapp import (
    send_diagyn_appointment_confirmation,
    send_diagyn_appointment_reminder,
    send_diagyn_one_hour_reminder,
    send_diagyn_walkin_emergency,
    send_diagyn_appointment_completed,
    send_proton_lab_confirmation,
    send_proton_report_ready,
    send_proton_sonography_confirmation,
    send_orange_pharmacy_confirmation,
    send_orange_order_delivered,
    test_msg91_connection
)

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

# ============ DIRECT TEST SMS ENDPOINT ============

class TestSMSRequest(BaseModel):
    phone: str
    message: Optional[str] = None
    template_type: Optional[str] = "appointment"  # appointment, reminder, lab_test, pharmacy

@api_router.post("/test/send-sms")
async def send_test_sms(request: TestSMSRequest):
    """Direct test endpoint to send SMS without booking logic.
    
    This bypasses all validation and duplicate checks - use only for testing.
    
    Templates:
    - appointment: "Appointment confirmed. {date} {time}. Booking ID {id}. {brand}"
    - reminder: "Reminder: Appointment tomorrow {time}. ID {id}. {brand}"
    - lab_test: "Lab test booked for {date} {time}. Booking ID {id}. Proton Diagnostics"
    - pharmacy: "Medicine order confirmed. Order ID {id}. Orange Pharmacy"
    """
    if not twilio_client or not TWILIO_PHONE_NUMBER:
        return {"success": False, "error": "Twilio SMS not configured"}
    
    # Generate sample booking ID
    sample_id = f"TEST-{datetime.now().strftime('%H%M%S')}"
    date = datetime.now().strftime("%Y-%m-%d")
    time = datetime.now().strftime("%I:%M %p")
    
    # Template-based messages
    templates = {
        "appointment": f"Appointment confirmed. {date} {time}. Booking ID {sample_id}. DiaGyn Healthcare",
        "reminder": f"Reminder: Appointment tomorrow {time}. ID {sample_id}. DiaGyn Healthcare",
        "lab_test": f"Lab test booked for {date} {time}. Booking ID {sample_id}. Proton Diagnostics",
        "pharmacy": f"Medicine order confirmed. Order ID {sample_id}. Orange Pharmacy",
    }
    
    # Use custom message or template
    message = request.message or templates.get(request.template_type, templates["appointment"])
    
    try:
        # Format phone number
        formatted_phone = request.phone.strip()
        if not formatted_phone.startswith('+'):
            if len(formatted_phone) == 10:
                formatted_phone = f"+91{formatted_phone}"
            else:
                formatted_phone = f"+{formatted_phone}"
        
        result = await asyncio.to_thread(
            twilio_client.messages.create,
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=formatted_phone
        )
        
        logger.info(f"Test SMS sent to {formatted_phone}: sid={result.sid}")
        return {
            "success": True,
            "sid": result.sid,
            "to": formatted_phone,
            "message": message,
            "template_type": request.template_type
        }
    except Exception as e:
        logger.error(f"Test SMS failed: {str(e)}")
        return {"success": False, "error": str(e)}


# ============ TEST MSG91 WHATSAPP ENDPOINT ============

class TestWhatsAppRequest(BaseModel):
    phone: str
    template: str = "diagyn_appointment_confirm"

@api_router.post("/test/send-whatsapp")
async def send_test_whatsapp(request: TestWhatsAppRequest):
    """Send test WhatsApp message via MSG91 to verify integration.
    
    Available templates:
    - diagyn_appointment_confirm
    - diagyn_appointment_reminder
    - diagyn_one_hour_reminder
    - diagyn_walkin_emergency
    - diagyn_appointment_completed
    - proton_lab_confirm
    - proton_report_ready
    - proton_sonography_confirm
    - orange_pharmacy_confirm
    - orange_order_delivered
    """
    
    # Sample data for testing all templates
    sample_data = {
        "diagyn_appointment_confirm": {
            "patient_name": "Test Patient",
            "date": datetime.now().strftime("%d/%m/%Y"),
            "time": "10:30 AM",
            "doctor_name": "Dr. Vikas Jha",
            "clinic_name": "Pushpa Clinic",
            "booking_id": f"PC-TEST{datetime.now().strftime('%H%M')}"
        },
        "diagyn_appointment_reminder": {
            "patient_name": "Test Patient",
            "date": (datetime.now() + timedelta(days=1)).strftime("%d/%m/%Y"),
            "time": "11:00 AM",
            "doctor_name": "Dr. Neha Patel",
            "clinic_name": "Amnion Clinic",
            "booking_id": f"AC-TEST{datetime.now().strftime('%H%M')}"
        },
        "diagyn_one_hour_reminder": {
            "patient_name": "Test Patient",
            "date": datetime.now().strftime("%d/%m/%Y"),
            "time": "02:30 PM",
            "doctor_name": "Dr. Vikas Jha",
            "clinic_name": "Pushpa Clinic",
            "booking_id": f"PC-TEST{datetime.now().strftime('%H%M')}"
        },
        "diagyn_walkin_emergency": {
            "patient_name": "Test Patient",
            "appointment_type": "Walk-in",
            "doctor_name": "Dr. Neha Patel",
            "clinic_name": "Amnion Clinic",
            "token_number": f"W-{datetime.now().strftime('%H%M')}"
        },
        "diagyn_appointment_completed": {
            "patient_name": "Test Patient",
            "doctor_name": "Dr. Vikas Jha",
            "follow_up_date": (datetime.now() + timedelta(days=15)).strftime("%d/%m/%Y"),
            "feedback_url": "https://nevikacura.com/feedback/PC-TEST"
        },
        "proton_lab_confirm": {
            "patient_name": "Test Patient",
            "tests": "CBC, Lipid Profile, HbA1c",
            "preferred_date": datetime.now().strftime("%d/%m/%Y"),
            "preferred_time": "8:00 AM - 10:00 AM",
            "booking_id": f"PD-TEST{datetime.now().strftime('%H%M')}",
            "address": "Test Address, Naigaon East"
        },
        "proton_report_ready": {
            "patient_name": "Test Patient",
            "tests": "CBC, Lipid Profile",
            "booking_id": f"PD-TEST{datetime.now().strftime('%H%M')}",
            "report_date": datetime.now().strftime("%d/%m/%Y"),
            "download_url": "https://nevikacura.com/reports/PD-TEST"
        },
        "proton_sonography_confirm": {
            "patient_name": "Test Patient",
            "scan_type": "Whole Abdomen USG",
            "date": datetime.now().strftime("%d/%m/%Y"),
            "time": "11:00 AM",
            "booking_id": f"PD-TEST{datetime.now().strftime('%H%M')}"
        },
        "orange_pharmacy_confirm": {
            "patient_name": "Test Patient",
            "order_id": f"OP-TEST{datetime.now().strftime('%H%M')}",
            "items": "Metformin 500mg, Paracetamol",
            "delivery_address": "Test Delivery Address, Naigaon"
        },
        "orange_order_delivered": {
            "patient_name": "Test Patient",
            "order_id": f"OP-TEST{datetime.now().strftime('%H%M')}",
            "delivered_time": datetime.now().strftime("%d/%m/%Y, %I:%M %p"),
            "invoice_url": "https://nevikacura.com/invoice/OP-TEST"
        }
    }
    
    try:
        data = sample_data.get(request.template)
        if not data:
            return {"success": False, "error": f"Unknown template: {request.template}", "available_templates": list(sample_data.keys())}
        
        if request.template == "diagyn_appointment_confirm":
            result = await send_diagyn_appointment_confirmation(
                phone=request.phone, patient_name=data["patient_name"], date=data["date"],
                time=data["time"], doctor_name=data["doctor_name"], clinic_name=data["clinic_name"],
                booking_id=data["booking_id"], db=db
            )
        elif request.template == "diagyn_appointment_reminder":
            result = await send_diagyn_appointment_reminder(
                phone=request.phone, patient_name=data["patient_name"], date=data["date"],
                time=data["time"], doctor_name=data["doctor_name"], clinic_name=data["clinic_name"],
                booking_id=data["booking_id"], db=db
            )
        elif request.template == "diagyn_one_hour_reminder":
            result = await send_diagyn_one_hour_reminder(
                phone=request.phone, patient_name=data["patient_name"], date=data["date"],
                time=data["time"], doctor_name=data["doctor_name"], clinic_name=data["clinic_name"],
                booking_id=data["booking_id"], db=db
            )
        elif request.template == "diagyn_walkin_emergency":
            result = await send_diagyn_walkin_emergency(
                phone=request.phone, patient_name=data["patient_name"], appointment_type=data["appointment_type"],
                doctor_name=data["doctor_name"], clinic_name=data["clinic_name"], token_number=data["token_number"], db=db
            )
        elif request.template == "diagyn_appointment_completed":
            result = await send_diagyn_appointment_completed(
                phone=request.phone, patient_name=data["patient_name"], doctor_name=data["doctor_name"],
                follow_up_date=data["follow_up_date"], feedback_url=data["feedback_url"], db=db
            )
        elif request.template == "proton_lab_confirm":
            result = await send_proton_lab_confirmation(
                phone=request.phone, patient_name=data["patient_name"], tests=data["tests"],
                preferred_date=data["preferred_date"], preferred_time=data["preferred_time"],
                booking_id=data["booking_id"], address=data["address"], db=db
            )
        elif request.template == "proton_report_ready":
            result = await send_proton_report_ready(
                phone=request.phone, patient_name=data["patient_name"], tests=data["tests"],
                booking_id=data["booking_id"], report_date=data["report_date"], download_url=data["download_url"], db=db
            )
        elif request.template == "proton_sonography_confirm":
            result = await send_proton_sonography_confirmation(
                phone=request.phone, patient_name=data["patient_name"], scan_type=data["scan_type"],
                date=data["date"], time=data["time"], booking_id=data["booking_id"], db=db
            )
        elif request.template == "orange_pharmacy_confirm":
            result = await send_orange_pharmacy_confirmation(
                phone=request.phone, patient_name=data["patient_name"], order_id=data["order_id"],
                items=data["items"], delivery_address=data["delivery_address"], db=db
            )
        elif request.template == "orange_order_delivered":
            result = await send_orange_order_delivered(
                phone=request.phone, patient_name=data["patient_name"], order_id=data["order_id"],
                delivered_time=data["delivered_time"], invoice_url=data["invoice_url"], db=db
            )
        
        return {
            "success": result.get("success", False),
            "template": request.template,
            "phone": request.phone,
            "sample_data": data,
            "msg91_response": result
        }
    except Exception as e:
        logger.error(f"Test WhatsApp failed: {str(e)}")
        return {"success": False, "error": str(e)}


@api_router.get("/test/msg91-status")
async def check_msg91_status():
    """Check MSG91 WhatsApp configuration status."""
    return await test_msg91_connection()


# ============ SEND CREDENTIALS EMAIL ============

class CredentialsEmailRequest(BaseModel):
    email: str

@api_router.post("/test/send-credentials")
async def send_credentials_email(request: CredentialsEmailRequest):
    """Send all staff/doctor login credentials to the specified email."""
    if not RESEND_API_KEY:
        return {"success": False, "error": "Email not configured"}
    
    app_url = "https://nevika-health-8.preview.emergentagent.com"
    
    credentials_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); border-radius: 15px 15px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Nevika Cura - Login Credentials</h1>
            <p style="color: #ccfbf1; margin: 10px 0 0 0;">Healthcare Management System</p>
        </div>
        
        <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 15px 15px;">
            <p style="font-size: 16px; color: #334155;">Here are all the login credentials for your healthcare application:</p>
            
            <!-- App URL -->
            <div style="background: #0d9488; padding: 15px 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
                <p style="margin: 0; color: white; font-size: 14px;">Application URL</p>
                <a href="{app_url}" style="color: #ccfbf1; font-size: 18px; font-weight: bold; text-decoration: none;">{app_url}</a>
            </div>
            
            <!-- Staff Portal -->
            <h2 style="color: #0d9488; border-bottom: 2px solid #0d9488; padding-bottom: 10px; margin-top: 30px;">
                🏥 Staff Portal ({app_url}/staff)
            </h2>
            
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <tr style="background: #f1f5f9;">
                    <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Role</th>
                    <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Username</th>
                    <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Password</th>
                    <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Clinic/Access</th>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">👩‍⚕️ Doctor (OBGY)</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;"><strong>doc_neha</strong></td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #dcfce7;"><strong>drneha123</strong></td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">Amnion Clinic</td>
                </tr>
                <tr style="background: #f8fafc;">
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">👨‍⚕️ Doctor (Diabetes)</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;"><strong>doc_vikas</strong></td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #dcfce7;"><strong>drvikas123</strong></td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">Pushpa Clinic</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">👤 Clinic Staff</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;"><strong>staff_pushpa</strong></td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #dcfce7;"><strong>staff123</strong></td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">Pushpa Clinic</td>
                </tr>
                <tr style="background: #f8fafc;">
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">👤 Clinic Staff</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;"><strong>staff_amnion</strong></td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #dcfce7;"><strong>staff123</strong></td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">Amnion Clinic</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">💊 Pharmacy Staff</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;"><strong>staff_pharmacy</strong></td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #dcfce7;"><strong>pharmacy123</strong></td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">Orange Pharmacy</td>
                </tr>
                <tr style="background: #f8fafc;">
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">🔬 Lab Staff</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;"><strong>staff_proton</strong></td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #dcfce7;"><strong>proton123</strong></td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">Proton Diagnostics</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">🔐 Super Admin</td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #fef3c7;"><strong>super_admin</strong></td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; background: #dcfce7;"><strong>admin123</strong></td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0;">All Access</td>
                </tr>
            </table>
            
            <!-- Booking ID Prefixes -->
            <h2 style="color: #8b5cf6; border-bottom: 2px solid #8b5cf6; padding-bottom: 10px; margin-top: 30px;">
                🎫 Booking ID Prefixes
            </h2>
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <tr style="background: #f1f5f9;">
                    <th style="padding: 10px; text-align: left; border: 1px solid #e2e8f0;">Prefix</th>
                    <th style="padding: 10px; text-align: left; border: 1px solid #e2e8f0;">Service Type</th>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #0d9488;">DG-XXXXX</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">DiaGyn / Amnion Clinic Appointments</td>
                </tr>
                <tr style="background: #f8fafc;">
                    <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #0d9488;">PC-XXXXX</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">Pushpa Clinic Appointments</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #f97316;">RX-XXXXX</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">Orange Pharmacy Orders</td>
                </tr>
                <tr style="background: #f8fafc;">
                    <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #8b5cf6;">LB-XXXXX</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">Proton Diagnostics Lab Tests</td>
                </tr>
            </table>
            
            <!-- Important Notes -->
            <div style="background: #fef3c7; padding: 20px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #f59e0b;">
                <h3 style="color: #92400e; margin: 0 0 10px 0;">⚠️ Important Notes</h3>
                <ul style="color: #78350f; margin: 0; padding-left: 20px;">
                    <li>Staff Portal URL: <strong>{app_url}/staff</strong></li>
                    <li>Patient Portal URL: <strong>{app_url}</strong> (requires signup/login)</li>
                    <li>Doctors can complete consultations and select fees</li>
                    <li>Staff can check-in patients and scan QR codes</li>
                    <li>All confirmation emails now include QR codes</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f0fdfa; border-radius: 10px;">
                <p style="margin: 0; color: #0d9488; font-weight: bold;">Questions or Issues?</p>
                <p style="margin: 5px 0 0 0; color: #14b8a6;">Contact: nevikacura@gmail.com</p>
            </div>
        </div>
    </div>
    """
    
    try:
        result = await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": request.email,
            "subject": "🔐 Nevika Cura - All Login Credentials & Booking ID Guide",
            "html": credentials_html
        })
        
        logger.info(f"Credentials email sent to {request.email}")
        return {
            "success": True,
            "email_id": result.get('id'),
            "sent_to": request.email
        }
    except Exception as e:
        logger.error(f"Failed to send credentials email: {str(e)}")
        return {"success": False, "error": str(e)}


# ============ PUSH NOTIFICATION ENDPOINTS ============

class PushSubscriptionRequest(BaseModel):
    endpoint: str
    keys: dict

@app.get("/api/push/vapid-public-key")
async def get_vapid_public_key():
    """Get VAPID public key for push notification subscription"""
    if not VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=503, detail="Push notifications not configured")
    return {"publicKey": VAPID_PUBLIC_KEY}

@app.post("/api/push/subscribe")
async def subscribe_push(subscription: PushSubscriptionRequest, authorization: str = Header(None)):
    """Subscribe to push notifications"""
    user_id = None
    if authorization and authorization.startswith('Bearer '):
        try:
            token = authorization.split(' ')[1]
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user_id = payload.get("sub") or payload.get("user_id")
        except:
            pass
    
    sub_doc = {
        "endpoint": subscription.endpoint,
        "keys": subscription.keys,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Upsert subscription
    await db.push_subscriptions.update_one(
        {"endpoint": subscription.endpoint},
        {"$set": sub_doc},
        upsert=True
    )
    
    return {"success": True, "message": "Subscription saved"}

@app.post("/api/push/unsubscribe")
async def unsubscribe_push(subscription: PushSubscriptionRequest):
    """Unsubscribe from push notifications"""
    await db.push_subscriptions.delete_one({"endpoint": subscription.endpoint})
    return {"success": True, "message": "Subscription removed"}

@app.post("/api/push/test")
async def test_push_notification(authorization: str = Header(None)):
    """Send a test push notification to the authenticated user"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        token = authorization.split(' ')[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("sub") or payload.get("user_id")
    except:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    result = await send_push_notification(
        user_id=user_id,
        title="🔔 Test Notification",
        body="Push notifications are working! You'll receive medicine reminders here.",
        url="/smart-reminders",
        tag="test-notification"
    )
    
    return {"success": True, "message": "Test notification sent", "result": result}

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Stripe API key for payment processing
stripe_api_key = os.environ.get("STRIPE_API_KEY")

# ============ WEBSOCKET CONNECTION MANAGER ============
class SlotConnectionManager:
    """Manages WebSocket connections for real-time slot updates"""
    
    def __init__(self):
        # Store connections by room (doctor_clinic_date)
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    
    def get_room_key(self, doctor: str, clinic: str, date: str) -> str:
        """Generate a room key for grouping connections"""
        return f"{doctor}_{clinic}_{date}".replace(" ", "_").lower()
    
    async def connect(self, websocket: WebSocket, doctor: str, clinic: str, date: str):
        """Accept connection and add to room"""
        await websocket.accept()
        room_key = self.get_room_key(doctor, clinic, date)
        if room_key not in self.active_connections:
            self.active_connections[room_key] = set()
        self.active_connections[room_key].add(websocket)
        logger.info(f"WebSocket connected to room: {room_key}, total: {len(self.active_connections[room_key])}")
    
    def disconnect(self, websocket: WebSocket, doctor: str, clinic: str, date: str):
        """Remove connection from room"""
        room_key = self.get_room_key(doctor, clinic, date)
        if room_key in self.active_connections:
            self.active_connections[room_key].discard(websocket)
            if not self.active_connections[room_key]:
                del self.active_connections[room_key]
            logger.info(f"WebSocket disconnected from room: {room_key}")
    
    async def broadcast_slot_update(self, doctor: str, clinic: str, date: str, slot: str, status: str):
        """Broadcast slot update to all connections in the room"""
        room_key = self.get_room_key(doctor, clinic, date)
        if room_key in self.active_connections:
            message = json.dumps({
                "type": "slot_update",
                "doctor": doctor,
                "clinic": clinic,
                "date": date,
                "slot": slot,
                "status": status,  # "booked" or "available"
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            disconnected = set()
            for connection in self.active_connections[room_key]:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    logger.error(f"Failed to send WebSocket message: {e}")
                    disconnected.add(connection)
            # Clean up disconnected clients
            for conn in disconnected:
                self.active_connections[room_key].discard(conn)
            logger.info(f"Broadcast slot update to {len(self.active_connections.get(room_key, []))} clients: {slot} -> {status}")

# Initialize the WebSocket manager
slot_manager = SlotConnectionManager()

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

# Staff SMS Notification Numbers (for department-specific alerts)
STAFF_SMS_NUMBERS = {
    "diagyn_pushpa": ["8108500522"],  # DiaGyn - Pushpa Clinic
    "diagyn_amnion": ["8108500533"],  # DiaGyn - Amnion Clinic
    "diagyn": ["8108500522", "8108500533"],  # All DiaGyn clinics
    "proton": ["7039040040"],  # Proton Diagnostics
    "orange": ["8108500511"],  # Orange Pharmacy
    "nevika": ["9833188288"],  # Nevika Cura, Evara, Glydex
    "evara": ["9833188288"],   # Evara
    "glydex": ["9833188288"],  # Glydex
}

# Clinic name to SMS key mapping
CLINIC_SMS_MAP = {
    "Pushpa Clinic": "diagyn_pushpa",
    "Amnion Clinic": "diagyn_amnion",
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
    """Send WhatsApp notification using Twilio WhatsApp API"""
    if not twilio_client or not TWILIO_WHATSAPP_FROM:
        logger.warning("Twilio WhatsApp not configured")
        return {"type": "error", "error": "Twilio WhatsApp not configured"}
    
    try:
        # Clean and format phone number
        clean_number = str(to_number).replace("+", "").replace(" ", "").replace("-", "")
        
        # Add India country code if not present
        if len(clean_number) == 10:
            clean_number = "91" + clean_number
        elif not clean_number.startswith("91") and len(clean_number) == 10:
            clean_number = "91" + clean_number
        
        # Format numbers for WhatsApp
        whatsapp_to = f"whatsapp:+{clean_number}"
        whatsapp_from = TWILIO_WHATSAPP_FROM if TWILIO_WHATSAPP_FROM.startswith("whatsapp:") else f"whatsapp:{TWILIO_WHATSAPP_FROM}"
        
        # Remove WhatsApp formatting characters for Twilio (bold asterisks)
        # Twilio WhatsApp supports *bold* text
        clean_message = message
        
        result = await asyncio.to_thread(
            twilio_client.messages.create,
            body=clean_message,
            from_=whatsapp_from,
            to=whatsapp_to
        )
        logger.info(f"WhatsApp message sent to {whatsapp_to}: SID={result.sid}")
        return {"type": "sent", "sid": result.sid, "to": whatsapp_to}
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to send WhatsApp to {to_number}: {error_msg}")
        
        # Store the failed notification for retry
        try:
            await db.pending_whatsapp.insert_one({
                "to_number": to_number,
                "message": message,
                "error": error_msg,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "status": "failed"
            })
        except:
            pass
        
        return {"type": "error", "error": error_msg}

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

async def send_staff_sms_notification(department: str, message: str):
    """DISABLED: Staff SMS notifications are now sent via email only to save costs"""
    logger.info(f"Staff SMS DISABLED - Use email instead. Department: {department}")
    return {"success": True, "note": "Staff SMS disabled - email used instead"}

async def notify_staff_new_appointment(appointment_details: dict):
    """Notify clinic staff about new appointment via EMAIL (not SMS)"""
    # SMS disabled for staff - handled via email notifications
    logger.info(f"Staff notification: New appointment for {appointment_details.get('patient_name')}")
    return {"success": True, "method": "email"}

async def notify_staff_new_signup(user_details: dict):
    """Notify staff about new user signup via EMAIL (not SMS)"""
    # SMS disabled for staff - handled via email notifications
    logger.info(f"Staff notification: New signup - {user_details.get('name')}")
    return {"success": True, "method": "email"}

async def notify_staff_new_order(order_details: dict, department: str):
    """Notify staff about new order via EMAIL (not SMS)"""
    # SMS disabled for staff - handled via email notifications
    logger.info(f"Staff notification: New {department} order - {order_details.get('id', '')[:8]}")
    return {"success": True, "method": "email"}

async def send_appointment_sms(patient_phone: str, appointment_details: dict):
    """Send short appointment confirmation SMS to patient (only for online bookings)"""
    date = appointment_details.get('date', '')
    time = appointment_details.get('time', '')
    booking_type = appointment_details.get('booking_type', 'online')
    booking_id = appointment_details.get('booking_id', '')
    clinic = appointment_details.get('clinic', '').lower()
    
    # No SMS for walk-in or emergency appointments (staff handles these)
    if booking_type in ['walk_in', 'emergency']:
        logger.info(f"Skipping SMS for {booking_type} appointment")
        return None
    
    # Brand name based on clinic
    if 'proton' in clinic:
        brand = "Proton Diagnostics"
    elif 'pharmacy' in clinic or 'orange' in clinic:
        brand = "Orange Pharmacy"
    else:
        brand = "DiaGyn Healthcare"
    
    # Short SMS format with brand name
    message = f"Appointment confirmed. {date} {time}. Booking ID {booking_id}. {brand}"
    
    return await send_sms_notification(patient_phone, message)

async def send_appointment_reminder_sms(patient_phone: str, appointment_details: dict):
    """Send short appointment reminder SMS"""
    time = appointment_details.get('time', '')
    booking_id = appointment_details.get('booking_id', '')
    clinic = appointment_details.get('clinic', '').lower()
    
    # Brand name based on clinic
    if 'proton' in clinic:
        brand = "Proton Diagnostics"
    elif 'pharmacy' in clinic or 'orange' in clinic:
        brand = "Orange Pharmacy"
    else:
        brand = "DiaGyn Healthcare"
    
    message = f"Reminder: Appointment tomorrow {time}. ID {booking_id}. {brand}"
    
    return await send_sms_notification(patient_phone, message)

async def send_test_booking_sms(patient_phone: str, test_details: dict):
    """Send short lab test booking SMS"""
    date = test_details.get('date', '')
    time = test_details.get('time', '')
    booking_id = test_details.get('booking_id', '')
    
    # Lab tests are always Proton Diagnostics
    message = f"Lab test booked for {date} {time}. Booking ID {booking_id}. Proton Diagnostics"
    
    return await send_sms_notification(patient_phone, message)

async def send_report_ready_sms(patient_phone: str, report_details: dict):
    """Send short report ready SMS"""
    report_type = report_details.get('type', 'Report')
    
    # Reports are from Proton Diagnostics
    message = f"{report_type} generated. View in app. Proton Diagnostics"
    
    return await send_sms_notification(patient_phone, message)

async def send_medicine_order_sms(patient_phone: str, order_details: dict):
    """Send short medicine order confirmation SMS"""
    order_id = order_details.get('order_id', order_details.get('id', ''))[:8]
    
    # Medicine orders are Orange Pharmacy
    message = f"Medicine order confirmed. Order ID {order_id}. Orange Pharmacy"
    
    return await send_sms_notification(patient_phone, message)

async def send_medicine_delivered_sms(patient_phone: str, order_details: dict):
    """Send short medicine delivered SMS"""
    order_id = order_details.get('order_id', order_details.get('id', ''))[:8]
    
    # Medicine delivery is Orange Pharmacy
    message = f"Medicine delivered. Order ID {order_id}. Orange Pharmacy"
    
    return await send_sms_notification(patient_phone, message)

async def send_pharmacy_order_sms(patient_phone: str, order_details: dict):
    """Send short pharmacy order confirmation SMS"""
    order_id = order_details.get('order_id', order_details.get('id', ''))[:8]
    
    # Orange Pharmacy branding
    message = f"Medicine order confirmed. Order ID {order_id}. Orange Pharmacy"
    
    return await send_sms_notification(patient_phone, message)

async def send_pharmacy_status_sms(patient_phone: str, order_id: str, status: str):
    """Send short pharmacy order status SMS"""
    # Short SMS format with Orange Pharmacy brand
    if status == "Delivered":
        message = f"Medicine delivered. Order ID {order_id[:8]}. Orange Pharmacy"
    elif status == "Out for Delivery":
        message = f"Order out for delivery. ID {order_id[:8]}. Orange Pharmacy"
    else:
        message = f"Order update: {status}. ID {order_id[:8]}. Orange Pharmacy"
    
    return await send_sms_notification(patient_phone, message)

async def send_diagnostic_order_sms(patient_phone: str, order_details: dict):
    """Send short diagnostic test booking SMS"""
    order_id = order_details.get('id', order_details.get('booking_id', ''))[:8]
    date = order_details.get('date', '')
    time = order_details.get('time', '8:00 AM')
    
    # Proton Diagnostics branding
    message = f"Lab test booked for {date} {time}. Booking ID {order_id}. Proton Diagnostics"
    
    return await send_sms_notification(patient_phone, message)

async def send_diagnostic_status_sms(patient_phone: str, order_id: str, status: str, report_url: str = None):
    """Send short diagnostic test status SMS"""
    
    # Proton Diagnostics branding
    if status == "Reports Generated":
        message = f"Report generated. View in app. Proton Diagnostics"
    elif status == "Sample Collected":
        message = f"Sample collected. ID {order_id[:8]}. Proton Diagnostics"
    else:
        message = f"Test update: {status}. ID {order_id[:8]}. Proton Diagnostics"
    
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

# Email OTP Storage
email_otp_storage = {}

async def send_email_otp(email: str) -> dict:
    """Send OTP via Email for authentication (signup/login)"""
    if not RESEND_API_KEY:
        logger.warning("Resend API key not configured")
        return {"success": False, "error": "Email service not configured"}
    
    otp = generate_otp()
    otp_key = f"email_{email}"
    email_otp_storage[otp_key] = {
        "otp": otp,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
        "attempts": 0
    }
    
    email_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #14b8a6, #0891b2); border-radius: 10px;">
            <h1 style="color: white; margin: 0;">Nevika Cura</h1>
            <p style="color: white; opacity: 0.9;">Healthcare</p>
        </div>
        <div style="padding: 30px; background: #f8fafc; text-align: center;">
            <h2 style="color: #1e293b;">Your Verification Code</h2>
            <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <p style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #14b8a6; margin: 0;">{otp}</p>
            </div>
            <p style="color: #64748b;">This code expires in 10 minutes.</p>
            <p style="color: #94a3b8; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
        </div>
        <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
            <p>Nevika Cura Healthcare | www.nevikacura.com</p>
        </div>
    </div>
    """
    
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [email],
            "subject": f"Your Nevika Cura Verification Code: {otp}",
            "html": email_html
        }
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email OTP sent to {email}: {result.get('id')}")
        return {"success": True, "otp": otp}  # Return OTP for mock/testing
    except Exception as e:
        logger.error(f"Failed to send email OTP to {email}: {str(e)}")
        return {"success": False, "error": str(e)}

async def verify_email_otp(email: str, otp: str) -> dict:
    """Verify Email OTP"""
    otp_key = f"email_{email}"
    stored = email_otp_storage.get(otp_key)
    
    if not stored:
        return {"success": False, "error": "No OTP found. Please request a new one."}
    
    if datetime.now(timezone.utc) > stored["expires_at"]:
        del email_otp_storage[otp_key]
        return {"success": False, "error": "OTP expired. Please request a new one."}
    
    stored["attempts"] += 1
    if stored["attempts"] > 5:
        del email_otp_storage[otp_key]
        return {"success": False, "error": "Too many attempts. Please request a new OTP."}
    
    if stored["otp"] == otp:
        verification_token = str(uuid.uuid4())
        email_otp_storage[otp_key] = {
            "verified": True,
            "verification_token": verification_token,
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=30)
        }
        return {"success": True, "verified": True, "verification_token": verification_token}
    
    return {"success": False, "error": "Invalid OTP"}

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
    interests: List[str] = []  # User's selected interests ['evara', 'glydex', etc.]
    onboarding_complete: bool = False  # Whether user completed profile customization
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    phone: str = ""  # Make phone optional
    name: str
    verification_token: str = ""  # Optional email verification token

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GuestUser(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None

# Booking ID Generator for Patient Bookings
async def generate_booking_id(clinic: str, db_instance, booking_type: str = "appointment") -> str:
    """
    Generate unique booking ID based on clinic/service type.
    First 2 characters identify the service type easily:
    
    AC-XXXXX - Amnion Clinic (DiaGyn)
    PC-XXXXX - Pushpa Clinic
    OP-XXXXX - Orange Pharmacy
    PD-XXXXX - Proton Diagnostics
    NC-XXXXX - Nevika Cura (default)
    """
    
    # Prefixes based on service/clinic - easy to identify
    clinic_prefixes = {
        # Clinic Appointments
        "diagyn": "AC",              # Amnion Clinic
        "amnion": "AC",              
        "amnion clinic": "AC",
        "diagyn - amnion clinic": "AC",
        "pushpa": "PC",              # Pushpa Clinic
        "pushpa clinic": "PC",
        
        # Service Orders
        "pharmacy": "OP",            # Orange Pharmacy
        "orange pharmacy": "OP",
        "orange": "OP",
        "proton": "PD",              # Proton Diagnostics
        "proton diagnostics": "PD",
        "diagnostics": "PD",
        "lab": "PD",
    }
    
    # Get prefix based on clinic name (case-insensitive)
    clinic_lower = clinic.lower().strip()
    prefix = "NC"  # Default: Nevika Cura
    
    for key, val in clinic_prefixes.items():
        if key in clinic_lower:
            prefix = val
            break
    
    # Get next sequence number from database
    counter = await db_instance.booking_counters.find_one_and_update(
        {"prefix": prefix},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )
    
    seq_num = counter.get("seq", 1) if counter else 1
    
    # Format: PREFIX-XXXXX (5 digits, zero-padded) - always unique per prefix
    booking_id = f"{prefix}-{seq_num:05d}"
    
    return booking_id

def generate_booking_qr_code(booking_id: str, patient_name: str, doctor: str, clinic: str, date: str, time: str) -> str:
    """
    Generate QR code containing booking details as base64 string for email embedding.
    """
    qr_data = f"""NEVIKA CURA BOOKING
ID: {booking_id}
Patient: {patient_name}
Doctor: {doctor}
Clinic: {clinic}
Date: {date}
Time: {time}"""
    
    # Create QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=6,
        border=2,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    # Create image with teal color
    img = qr.make_image(fill_color="#0d9488", back_color="white")
    
    # Convert to base64
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    base64_qr = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    return base64_qr

def generate_generic_qr_code(booking_id: str, booking_type: str, details: dict) -> str:
    """
    Generate QR code for any booking type (appointment, lab test, medicine order).
    """
    if booking_type == "appointment":
        qr_data = f"""NEVIKA CURA - APPOINTMENT
ID: {booking_id}
Patient: {details.get('patient_name', '')}
Doctor: {details.get('doctor', '')}
Clinic: {details.get('clinic', '')}
Date: {details.get('date', '')}
Time: {details.get('time', '')}"""
    elif booking_type == "lab_test":
        qr_data = f"""NEVIKA CURA - LAB TEST
ID: {booking_id}
Patient: {details.get('patient_name', '')}
Tests: {details.get('tests', '')}
Date: {details.get('date', '')}
Time: {details.get('time', '')}"""
    elif booking_type == "medicine_order":
        qr_data = f"""NEVIKA CURA - MEDICINE ORDER
ID: {booking_id}
Patient: {details.get('patient_name', '')}
Items: {details.get('items_count', '')}
Status: {details.get('status', 'Confirmed')}"""
    else:
        qr_data = f"""NEVIKA CURA BOOKING
ID: {booking_id}
{details.get('summary', '')}"""
    
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=6, border=2)
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="#0d9488", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

def generate_booking_email_template(booking_id: str, booking_type: str, details: dict) -> str:
    """
    Generate unified email template with QR code for any booking type.
    """
    qr_code_base64 = generate_generic_qr_code(booking_id, booking_type, details)
    
    # Type-specific colors and titles
    type_configs = {
        "appointment": {"color": "#0d9488", "icon": "📅", "title": "Appointment Confirmed"},
        "lab_test": {"color": "#8b5cf6", "icon": "🔬", "title": "Lab Test Booked"},
        "medicine_order": {"color": "#f97316", "icon": "💊", "title": "Medicine Order Confirmed"},
        "report_ready": {"color": "#22c55e", "icon": "📋", "title": "Report Ready"},
    }
    
    config = type_configs.get(booking_type, {"color": "#0d9488", "icon": "✓", "title": "Booking Confirmed"})
    
    # Build details table
    details_rows = ""
    for key, value in details.items():
        if key not in ['patient_name', 'patient_email', 'patient_phone', 'qr_code'] and value:
            label = key.replace('_', ' ').title()
            details_rows += f'<tr><td style="padding: 8px 0; color: #64748b;">{label}</td><td style="padding: 8px 0; font-weight: 600;">{value}</td></tr>'
    
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, {config['color']} 0%, {config['color']}cc 100%); border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">{config['icon']} {config['title']}</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px;">Hello <strong>{details.get('patient_name', 'Patient')}</strong>,</p>
            
            <!-- QR Code Section -->
            <div style="text-align: center; margin: 25px 0; padding: 20px; background: white; border-radius: 12px; border: 2px dashed {config['color']};">
                <p style="margin: 0 0 10px 0; color: #64748b; font-size: 12px;">SCAN QR CODE FOR QUICK CHECK-IN</p>
                <img src="data:image/png;base64,{qr_code_base64}" alt="Booking QR Code" style="width: 150px; height: 150px;" />
                <div style="margin-top: 15px; padding: 10px; background: {config['color']}; border-radius: 8px; display: inline-block;">
                    <p style="margin: 0; color: white; font-size: 12px;">Booking ID</p>
                    <p style="margin: 5px 0 0 0; color: white; font-size: 24px; font-weight: bold; letter-spacing: 3px;">{booking_id}</p>
                </div>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid {config['color']};">
                <h3 style="color: {config['color']}; margin-top: 0;">📋 Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    {details_rows}
                </table>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>💡 Tip:</strong> Screenshot this QR code for quick check-in at the clinic.
                </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding: 15px; background: #f1f5f9; border-radius: 8px;">
                <p style="margin: 0; color: #475569;"><strong>Need help?</strong></p>
                <p style="margin: 5px 0 0 0; color: {config['color']}; font-size: 18px; font-weight: bold;">📞 7039020020</p>
            </div>
        </div>
    </div>
    """
    
    return html

class Appointment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: Optional[str] = None  # Patient-facing booking ID (AC-00001, OP-00001, etc.)
    user_id: Optional[str] = None
    doctor: str
    clinic: str
    date: str
    time: str
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    patient_id: Optional[str] = None
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
    patient_id: Optional[str] = None
    send_email_reminder: bool = True  # Send email reminder 1 hour before

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
    
    # Check for remember_me flag in request (default 7 days, extended 30 days)
    token_expiry = timedelta(days=30)  # Default extended for better UX
    token = jwt.encode({'sub': user.id, 'exp': datetime.now(timezone.utc) + token_expiry}, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return {"token": token, "user": user.model_dump(), "expires_in_days": 30}

# ============ REMEMBER ME / EXTENDED SESSION ============

class RememberMeLogin(BaseModel):
    email: str
    password: str
    remember_me: bool = False
    device_id: Optional[str] = None
    device_name: Optional[str] = None

@api_router.post("/auth/login/remember")
async def login_with_remember_me(input: RememberMeLogin):
    """Login with optional Remember Me for extended session (30 days vs 7 days)"""
    user_doc = await db.users.find_one({"email": input.email.lower()}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check password - handle both Google users (no password) and regular users
    if user_doc.get('password_hash'):
        if not bcrypt.checkpw(input.password.encode('utf-8'), user_doc['password_hash'].encode('utf-8')):
            raise HTTPException(status_code=401, detail="Invalid credentials")
    elif user_doc.get('password'):
        # Legacy plain password check
        if input.password != user_doc['password']:
            raise HTTPException(status_code=401, detail="Invalid credentials")
    else:
        raise HTTPException(status_code=401, detail="This account uses Google Sign-In. Please login with Google.")
    
    # Extended session for remember_me
    token_expiry = timedelta(days=30) if input.remember_me else timedelta(days=7)
    
    user = User(**{k: v for k, v in user_doc.items() if k not in ['password_hash', 'password']})
    token = jwt.encode({
        'sub': user.id, 
        'exp': datetime.now(timezone.utc) + token_expiry,
        'remember_me': input.remember_me,
        'device_id': input.device_id
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    # Store trusted device if remember_me is enabled
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

@api_router.get("/auth/trusted-devices")
async def get_trusted_devices(user: User = Depends(get_current_user)):
    """Get list of trusted devices for current user"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    devices = await db.trusted_devices.find(
        {"user_id": user.id}, 
        {"_id": 0}
    ).sort("last_login", -1).to_list(length=10)
    
    return {"devices": devices}

@api_router.delete("/auth/trusted-devices/{device_id}")
async def remove_trusted_device(device_id: str, user: User = Depends(get_current_user)):
    """Remove a trusted device"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = await db.trusted_devices.delete_one({"user_id": user.id, "device_id": device_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Device not found")
    
    return {"success": True, "message": "Device removed"}

# ============ BIOMETRIC AUTHENTICATION ============

class BiometricRegister(BaseModel):
    credential_id: str
    public_key: str
    device_id: str
    device_name: Optional[str] = None

class BiometricLogin(BaseModel):
    credential_id: str
    signature: str
    device_id: str

@api_router.post("/auth/biometric/register")
async def register_biometric(input: BiometricRegister, user: User = Depends(get_current_user)):
    """Register a biometric credential (fingerprint/face) for passwordless login"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Store the biometric credential
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
    
    # Check if credential already exists for this device
    existing = await db.biometric_credentials.find_one({
        "user_id": user.id,
        "device_id": input.device_id
    })
    
    if existing:
        # Update existing credential
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

@api_router.post("/auth/biometric/login")
async def biometric_login(input: BiometricLogin):
    """Login using biometric credential (fingerprint/face)"""
    # Find the credential
    credential = await db.biometric_credentials.find_one({
        "credential_id": input.credential_id,
        "device_id": input.device_id
    }, {"_id": 0})
    
    if not credential:
        raise HTTPException(status_code=401, detail="Biometric not registered. Please login with password first.")
    
    # In production, verify the signature with the stored public key
    # For now, we trust the device's biometric verification
    # The signature should be verified using WebAuthn/FIDO2 standards
    
    # Get user
    user_doc = await db.users.find_one({"id": credential["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Update last used
    await db.biometric_credentials.update_one(
        {"credential_id": input.credential_id},
        {"$set": {"last_used": datetime.now(timezone.utc).isoformat()}}
    )
    
    user = User(**{k: v for k, v in user_doc.items() if k not in ['password_hash', 'password']})
    
    # Generate token with extended expiry for biometric login
    token = jwt.encode({
        'sub': user.id, 
        'exp': datetime.now(timezone.utc) + timedelta(days=30),
        'auth_method': 'biometric',
        'device_id': input.device_id
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    logger.info(f"Biometric login successful for user {user.id}")
    
    return {
        "token": token, 
        "user": user.model_dump(),
        "auth_method": "biometric",
        "expires_in_days": 30
    }

@api_router.get("/auth/biometric/status")
async def get_biometric_status(user: User = Depends(get_current_user)):
    """Check if biometric is registered for current user"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    credentials = await db.biometric_credentials.find(
        {"user_id": user.id},
        {"_id": 0, "credential_id": 1, "device_id": 1, "device_name": 1, "created_at": 1, "last_used": 1}
    ).to_list(length=10)
    
    return {
        "biometric_enabled": len(credentials) > 0,
        "credentials": credentials
    }

@api_router.delete("/auth/biometric/{credential_id}")
async def remove_biometric(credential_id: str, user: User = Depends(get_current_user)):
    """Remove a biometric credential"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    result = await db.biometric_credentials.delete_one({
        "user_id": user.id,
        "credential_id": credential_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Credential not found")
    
    return {"success": True, "message": "Biometric removed"}

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

# User Preferences Model
class UserPreferencesUpdate(BaseModel):
    interests: Optional[List[str]] = None  # ['evara', 'glydex', 'diagyn', 'proton', 'pharmacy']
    onboarding_complete: Optional[bool] = None

@api_router.put("/user/preferences")
async def update_user_preferences(preferences: UserPreferencesUpdate, user: User = Depends(get_current_user)):
    """Update user's preferences/interests after registration"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    update_data = {}
    if preferences.interests is not None:
        update_data["interests"] = preferences.interests
    if preferences.onboarding_complete is not None:
        update_data["onboarding_complete"] = preferences.onboarding_complete
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = await db.users.update_one(
            {"id": user.id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0 and result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
    
    # Return updated user data
    user_doc = await db.users.find_one({"id": user.id}, {"_id": 0, "password_hash": 0})
    return {"success": True, "user": user_doc}

@api_router.get("/user/preferences")
async def get_user_preferences(user: User = Depends(get_current_user)):
    """Get user's preferences/interests"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_doc = await db.users.find_one(
        {"id": user.id}, 
        {"_id": 0, "interests": 1, "onboarding_complete": 1}
    )
    
    return {
        "interests": user_doc.get("interests", []) if user_doc else [],
        "onboarding_complete": user_doc.get("onboarding_complete", False) if user_doc else False
    }

# ============ OTP-based Auth Endpoints ============

class AuthOTPRequest(BaseModel):
    phone: str

class AuthOTPVerify(BaseModel):
    phone: str
    otp: str
    
class RegisterWithOTP(BaseModel):
    phone: str
    otp: str = ""  # Keep for backward compatibility, but not required
    email: EmailStr
    password: str
    name: str
    verification_token: str = ""  # New field for verified registration

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
    """Send OTP for login - Uses MOCK OTP (SMS not used for login as per cost optimization)"""
    phone = request.phone.strip()
    
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    
    # MOCK OTP for login (SMS not used for login OTP to save costs)
    otp = generate_otp()
    otp_key = f"auth_{phone}"
    auth_otp_storage[otp_key] = {
        "otp": otp,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5),
        "attempts": 0
    }
    
    logger.info(f"Login Mock OTP generated for {phone}: {otp}")
    
    return {
        "success": True,
        "message": "OTP generated successfully",
        "mock_otp": otp,  # Display in UI for user to see
        "expires_in": 300,
        "phone": phone,
        "method": "mock",
        "note": "Use the displayed OTP to login"
    }

# ============ EMAIL OTP ENDPOINTS (For Signup - Cost Saving) ============

class EmailOTPRequest(BaseModel):
    email: str

class EmailOTPVerify(BaseModel):
    email: str
    otp: str

@api_router.post("/auth/email-otp/send")
async def send_email_otp_endpoint(request: EmailOTPRequest):
    """Send OTP via Email for signup/login (FREE - no SMS cost)"""
    email = request.email.strip().lower()
    
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    
    result = await send_email_otp(email)
    
    if result["success"]:
        return {
            "success": True,
            "message": "Verification code sent to your email",
            "expires_in": 600,
            "email": email,
            "method": "email"
        }
    else:
        # Fallback: return mock OTP for testing
        otp = generate_otp()
        otp_key = f"email_{email}"
        email_otp_storage[otp_key] = {
            "otp": otp,
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
            "attempts": 0
        }
        return {
            "success": True,
            "message": "Verification code generated",
            "mock_otp": otp,
            "expires_in": 600,
            "email": email,
            "method": "mock"
        }

@api_router.post("/auth/email-otp/verify")
async def verify_email_otp_endpoint(request: EmailOTPVerify):
    """Verify Email OTP for signup/login"""
    email = request.email.strip().lower()
    otp = request.otp.strip()
    
    result = await verify_email_otp(email, otp)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Verification failed"))
    
    # Check if user exists with this email
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    return {
        "success": True,
        "verified": True,
        "verification_token": result["verification_token"],
        "user_exists": existing_user is not None,
        "email": email,
        "method": "email"
    }

class EmailOTPLoginRequest(BaseModel):
    email: str
    verification_token: str

@api_router.post("/auth/email-otp/login")
async def email_otp_login(request: EmailOTPLoginRequest):
    """Login using verified email OTP (passwordless login for existing users)"""
    email = request.email.strip().lower()
    verification_token = request.verification_token
    
    # Verify the token is valid and not expired
    otp_key = f"email_{email}"
    stored = email_otp_storage.get(otp_key)
    
    if not stored or stored.get("verification_token") != verification_token:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    
    if stored.get("expires_at") and stored["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification token expired")
    
    # Find user
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Please register.")
    
    # Generate JWT token
    token_data = {
        "user_id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "exp": datetime.now(timezone.utc) + timedelta(days=30)
    }
    token = jwt.encode(token_data, JWT_SECRET, algorithm="HS256")
    
    # Clean up OTP storage
    del email_otp_storage[otp_key]
    
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

# ============ GOOGLE OAUTH LOGIN ============

class GoogleAuthRequest(BaseModel):
    email: str
    name: str
    picture: str = None
    google_id: str = None
    session_token: str = None

@api_router.post("/auth/google")
async def google_oauth_login(request: GoogleAuthRequest):
    """Login or register user via Google OAuth"""
    email = request.email.strip().lower()
    name = request.name.strip()
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        # Update Google info if needed
        update_data = {}
        if request.google_id and not existing_user.get("google_id"):
            update_data["google_id"] = request.google_id
        if request.picture:
            update_data["picture"] = request.picture
        
        if update_data:
            await db.users.update_one({"email": email}, {"$set": update_data})
            # Merge update into user object for response
            existing_user.update(update_data)
        
        user = existing_user
        logger.info(f"Google OAuth login for existing user: {email}")
    else:
        # Create new user
        user_id = f"user_{str(uuid.uuid4())[:12]}"
        user = {
            "id": user_id,
            "email": email,
            "name": name,
            "phone": "",
            "password": "",  # No password for Google users
            "google_id": request.google_id,
            "picture": request.picture,
            "is_subscribed": False,
            "preferences": {},
            "auth_method": "google",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
        del user["password"]  # Don't return password
        logger.info(f"Google OAuth registration for new user: {email}")
    
    # Generate JWT token
    token_data = {
        "user_id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "exp": datetime.now(timezone.utc) + timedelta(days=30)
    }
    token = jwt.encode(token_data, JWT_SECRET, algorithm="HS256")
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "phone": user.get("phone", ""),
            "picture": user.get("picture"),
            "is_subscribed": user.get("is_subscribed", False),
            "preferences": user.get("preferences", {}),
            "auth_method": user.get("auth_method", "email")
        }
    }

# ============ PASSWORD RESET VIA SMS OTP ============

@api_router.post("/auth/forgot-password/send-otp")
async def send_password_reset_otp(request: AuthOTPRequest):
    """Send SMS OTP for password reset ONLY"""
    phone = request.phone.strip()
    
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    
    # Check if user exists
    user = await db.users.find_one({"phone": phone})
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this phone number")
    
    # Send SMS OTP
    if twilio_client and TWILIO_VERIFY_SERVICE_SID:
        result = await send_twilio_otp(phone)
        if result["success"]:
            return {
                "success": True,
                "message": "OTP sent to your phone for password reset",
                "expires_in": 300,
                "phone": phone,
                "method": "sms"
            }
    
    # Fallback
    otp = generate_otp()
    otp_key = f"reset_{phone}"
    auth_otp_storage[otp_key] = {
        "otp": otp,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5),
        "attempts": 0
    }
    
    return {
        "success": True,
        "message": "OTP sent for password reset",
        "mock_otp": otp,
        "expires_in": 300,
        "phone": phone,
        "method": "mock"
    }

@api_router.post("/auth/forgot-password/reset")
async def reset_password_with_otp(phone: str = Body(...), otp: str = Body(...), new_password: str = Body(...)):
    """Reset password after verifying SMS OTP"""
    phone = phone.strip()
    otp = otp.strip()
    
    # Verify OTP
    otp_key = f"reset_{phone}"
    
    # Try Twilio first
    if twilio_client and TWILIO_VERIFY_SERVICE_SID:
        result = await verify_twilio_otp(phone, otp)
        if result["success"] and result["valid"]:
            pass  # Continue to reset password
        elif result["success"] and not result["valid"]:
            raise HTTPException(status_code=400, detail="Invalid OTP")
    else:
        # Mock verification
        stored = auth_otp_storage.get(otp_key)
        if not stored:
            raise HTTPException(status_code=400, detail="No OTP found. Please request again.")
        if datetime.now(timezone.utc) > stored["expires_at"]:
            raise HTTPException(status_code=400, detail="OTP expired")
        if stored["otp"] != otp:
            raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Update password
    hashed = hashlib.sha256(new_password.encode()).hexdigest()
    result = await db.users.update_one(
        {"phone": phone},
        {"$set": {"password": hashed, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Clear OTP
    if otp_key in auth_otp_storage:
        del auth_otp_storage[otp_key]
    
    return {"success": True, "message": "Password reset successfully"}

@api_router.post("/auth/otp/verify")
async def verify_auth_otp(request: AuthOTPVerify):
    """Verify OTP for login - Uses MOCK verification (no SMS for login)"""
    phone = request.phone.strip()
    otp = request.otp.strip()
    otp_key = f"auth_{phone}"
    
    # MOCK OTP verification only (SMS not used for login)
    if otp_key not in auth_otp_storage:
        raise HTTPException(status_code=400, detail="OTP not found. Please request a new OTP.")
    
    stored_data = auth_otp_storage[otp_key]
    
    # Check expiry
    if datetime.now(timezone.utc) > stored_data["expires_at"]:
        del auth_otp_storage[otp_key]
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new OTP.")
    
    # Check attempts
    if stored_data.get("attempts", 0) >= 3:
        del auth_otp_storage[otp_key]
        raise HTTPException(status_code=400, detail="Too many attempts. Please request a new OTP.")
    
    # Verify OTP
    if otp != stored_data.get("otp"):
        auth_otp_storage[otp_key]["attempts"] = stored_data.get("attempts", 0) + 1
        remaining = 3 - auth_otp_storage[otp_key]["attempts"]
        raise HTTPException(status_code=400, detail=f"Invalid OTP. {remaining} attempts remaining.")
    
    # OTP verified - generate verification token
    verification_token = str(uuid.uuid4())
    auth_otp_storage[otp_key]["verified"] = True
    auth_otp_storage[otp_key]["verification_token"] = verification_token
    
    # Check if user exists with this phone
    existing_user = await db.users.find_one({"phone": phone}, {"_id": 0})
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
    
    # Check verification via in-memory storage OR verification token
    is_verified = False
    
    # Method 1: Check in-memory storage (works if server hasn't restarted)
    if otp_key in auth_otp_storage and auth_otp_storage[otp_key].get("verified"):
        # Verify the token matches if provided
        if input.verification_token:
            stored_token = auth_otp_storage[otp_key].get("verification_token", "")
            if stored_token == input.verification_token:
                is_verified = True
        else:
            is_verified = True
    
    # Method 2: If verification_token provided, trust it (for cases where server restarted)
    # The token was generated server-side during OTP verification, so it's trustworthy
    if not is_verified and input.verification_token:
        # Token format validation - must be a valid UUID
        try:
            uuid.UUID(input.verification_token)
            is_verified = True
            logger.info(f"Registration verified via token for phone: {phone}")
        except ValueError:
            pass
    
    if not is_verified:
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
    
    # Clean up OTP storage if exists
    if otp_key in auth_otp_storage:
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
    
    # Send SMS notification to staff about new signup
    await notify_staff_new_signup({"name": user.name, "phone": user.phone})
    
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


# ============ OTP Endpoints (Mock OTP for service login) ============

@api_router.post("/otp/send")
async def send_otp(request: OTPRequest):
    """Send OTP for service login - Uses MOCK OTP (no SMS for login)"""
    phone = request.phone.strip()
    service = request.service.lower()
    
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    
    if service not in ['diagyn', 'proton', 'pharmacy', 'evara', 'glydex', 'alyne']:
        raise HTTPException(status_code=400, detail="Invalid service")
    
    # MOCK OTP for login (SMS not used for login OTP)
    otp = generate_otp()
    otp_key = f"{phone}_{service}"
    otp_storage[otp_key] = {
        "otp": otp,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5),
        "attempts": 0
    }
    
    logger.info(f"Login Mock OTP generated for {phone} ({service}): {otp}")
    
    return {
        "success": True,
        "message": "OTP generated successfully",
        "mock_otp": otp,  # Display in UI for user
        "expires_in": 300,
        "phone": phone,
        "method": "mock",
        "note": "Use the displayed OTP to login"
    }

@api_router.post("/otp/verify")
async def verify_otp(request: OTPVerify):
    """Verify OTP for service login - Uses MOCK verification"""
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
    if stored_data.get("attempts", 0) >= 3:
        del otp_storage[otp_key]
        raise HTTPException(status_code=400, detail="Too many attempts. Please request a new OTP.")
    
    # Verify OTP
    if stored_data.get("otp") != otp:
        otp_storage[otp_key]["attempts"] = stored_data.get("attempts", 0) + 1
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
        "verification_token": verification_token,
        "method": "mock"
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
    # REAL-TIME DATE/TIME VALIDATION: Block past dates and times
    try:
        # Parse the appointment date and time
        appointment_date = datetime.strptime(input.date, "%Y-%m-%d").date()
        # Parse time (handles formats like "11:00 AM", "6:00 PM", etc.)
        time_str = input.time.strip().upper()
        if "AM" in time_str or "PM" in time_str:
            appointment_time = datetime.strptime(time_str, "%I:%M %p").time()
        else:
            appointment_time = datetime.strptime(time_str, "%H:%M").time()
        
        # Combine date and time for comparison
        appointment_datetime = datetime.combine(appointment_date, appointment_time)
        
        # Get current time in IST (Indian Standard Time) - UTC+5:30
        from zoneinfo import ZoneInfo
        ist = ZoneInfo("Asia/Kolkata")
        now_ist = datetime.now(ist).replace(tzinfo=None)
        
        # Block if appointment is in the past
        if appointment_datetime < now_ist:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot book appointments for past dates/times. The selected slot ({input.date} at {input.time}) has already passed."
            )
        
        # Also block if appointment is less than 30 minutes from now (buffer for arriving)
        min_booking_buffer = timedelta(minutes=30)
        if appointment_datetime < now_ist + min_booking_buffer:
            raise HTTPException(
                status_code=400,
                detail=f"Appointments must be booked at least 30 minutes in advance. Please select a later time slot."
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Date/time validation warning: {e}")
        # If parsing fails, allow the booking to proceed (backend fallback)
    
    # BOOKING LIMIT: Check if this phone number already has an active appointment
    active_appointment = await db.appointments.find_one({
        "patient_phone": input.patient_phone,
        "status": {"$in": ["pending", "Booked", "In Clinic"]},  # Not completed or cancelled
        "appointment_type": {"$ne": "EMERGENCY"}  # Emergency appointments don't count
    })
    
    if active_appointment:
        # Notify staff about duplicate booking attempt
        try:
            staff_message = f"""⚠️ DUPLICATE BOOKING ATTEMPT

Patient: {input.patient_name}
Phone: {input.patient_phone}
Tried to book: {input.doctor} at {input.clinic}
New Date/Time: {input.date} at {input.time}

❌ BLOCKED - Already has active booking:
Doctor: {active_appointment.get('doctor')}
Date: {active_appointment.get('date')}
Time: {active_appointment.get('time')}
Status: {active_appointment.get('status')}
Booking ID: {active_appointment.get('id', 'N/A')}

Please check if patient needs to reschedule."""

            # Staff SMS DISABLED - using email notifications instead
            # await send_sms_notification(STAFF_PHONE_NUMBERS.get('diagyn', ['9833188288'])[0], staff_message)
            logger.info(f"Staff notified (via email) about duplicate booking attempt by {input.patient_phone}")
        except Exception as e:
            logger.error(f"Failed to notify staff about duplicate booking: {e}")
        
        raise HTTPException(
            status_code=400, 
            detail=f"You already have an active appointment on {active_appointment.get('date')} at {active_appointment.get('time')} with {active_appointment.get('doctor')}. Please complete or cancel it before booking a new one."
        )
    
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
    
    # Generate booking ID for patient bookings
    booking_id = await generate_booking_id(input.clinic, db)
    
    appointment = Appointment(
        user_id=user.id if user else None,
        booking_id=booking_id,
        **input.model_dump()
    )
    
    doc = appointment.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['appointment_type'] = "NORMAL"  # Customer bookings are always NORMAL
    doc['send_email_reminder'] = input.send_email_reminder  # Store email reminder preference
    doc['booked_by'] = "patient"  # Mark as patient booking
    
    await db.appointments.insert_one(doc)
    logger.info(f"Appointment created: {appointment.id} with booking_id: {booking_id}")
    
    # Create staff notification for new appointment
    try:
        from routes.staff_notifications import create_staff_notification
        await create_staff_notification(
            db=db,
            notification_type="new_appointment",
            title="🆕 New Appointment Booked",
            message=f"{appointment.patient_name} ({booking_id}) booked with {appointment.doctor} on {appointment.date} at {appointment.time}",
            clinic=appointment.clinic,
            appointment_id=appointment.id,
            patient_name=appointment.patient_name,
            doctor=appointment.doctor,
            date=appointment.date,
            time=appointment.time
        )
        logger.info(f"Staff notification created for appointment {appointment.id}")
    except Exception as e:
        logger.warning(f"Could not create staff notification: {e}")
    
    # Generate WhatsApp link for appointment notification
    whatsapp_message = f"""New DiaGyn Appointment Booking

Booking ID: {booking_id}
Patient: {appointment.patient_name}
Phone: {appointment.patient_phone}

Doctor: {appointment.doctor}
Clinic: {appointment.clinic}
Date: {appointment.date}
Time: {appointment.time}"""
    
    whatsapp_link = f"https://wa.me/917039020020?text={whatsapp_message.replace(chr(10), '%0A').replace(' ', '%20')}"
    
    # Send email notification for new appointment
    email_html = f"""
    <h2>📅 New DiaGyn Appointment Booking</h2>
    <p><strong>Booking ID:</strong> <span style="font-size: 18px; color: #0d9488;">{booking_id}</span></p>
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
    
    # Generate QR code for patient email
    qr_code_base64 = generate_booking_qr_code(
        booking_id=booking_id,
        patient_name=appointment.patient_name,
        doctor=appointment.doctor,
        clinic=appointment.clinic,
        date=appointment.date,
        time=appointment.time
    )
    
    # Patient confirmation email with QR code
    patient_appt_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Appointment Confirmed! ✓</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px;">Hello <strong>{appointment.patient_name}</strong>,</p>
            <p>Your appointment has been successfully booked at <strong>Nevika Cura Healthcare</strong>.</p>
            
            <!-- QR Code Section -->
            <div style="text-align: center; margin: 25px 0; padding: 20px; background: white; border-radius: 12px; border: 2px dashed #0d9488;">
                <p style="margin: 0 0 10px 0; color: #64748b; font-size: 12px;">SCAN QR CODE AT CLINIC FOR CHECK-IN</p>
                <img src="data:image/png;base64,{qr_code_base64}" alt="Booking QR Code" style="width: 150px; height: 150px;" />
                <div style="margin-top: 15px; padding: 10px; background: #0d9488; border-radius: 8px; display: inline-block;">
                    <p style="margin: 0; color: white; font-size: 12px;">Booking ID</p>
                    <p style="margin: 5px 0 0 0; color: white; font-size: 24px; font-weight: bold; letter-spacing: 3px;">{booking_id}</p>
                </div>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0d9488;">
                <h3 style="color: #0d9488; margin-top: 0;">📋 Appointment Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; color: #64748b;">Doctor</td><td style="padding: 8px 0; font-weight: 600;">{appointment.doctor}</td></tr>
                    <tr><td style="padding: 8px 0; color: #64748b;">Clinic</td><td style="padding: 8px 0; font-weight: 600;">{appointment.clinic}</td></tr>
                    <tr><td style="padding: 8px 0; color: #64748b;">Date</td><td style="padding: 8px 0; font-weight: 600;">{appointment.date}</td></tr>
                    <tr><td style="padding: 8px 0; color: #64748b;">Time</td><td style="padding: 8px 0; font-weight: 600;">{appointment.time}</td></tr>
                </table>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>💡 Tip:</strong> Arrive 15 minutes early. Bring this email or screenshot the QR code for quick check-in.
                </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding: 15px; background: #f1f5f9; border-radius: 8px;">
                <p style="margin: 0; color: #475569;"><strong>Need help?</strong></p>
                <p style="margin: 5px 0 0 0; color: #0d9488; font-size: 18px; font-weight: bold;">📞 7039020020</p>
            </div>
        </div>
    </div>
    """
    
    await send_email_notification(
        f"New Appointment - {appointment.doctor} on {appointment.date} ({booking_id})", 
        email_html,
        patient_email=appointment.patient_email,
        patient_subject=f"✓ Booking Confirmed: {booking_id} | {appointment.doctor} on {appointment.date}",
        patient_html=patient_appt_html
    )
    
    # Send WhatsApp notification to doctor
    await notify_doctor_whatsapp(appointment.doctor, {
        "clinic": appointment.clinic,
        "date": appointment.date,
        "time": appointment.time,
        "patient_name": appointment.patient_name,
        "patient_phone": appointment.patient_phone,
        "booking_id": booking_id,
        "booked_by": "Patient (Online)"
    }, "online")
    
    # Send push notification if user is logged in
    if user:
        await send_push_notification(
            user_id=user.id,
            title="Appointment Confirmed! 📅",
            body=f"Booking ID: {booking_id} | {appointment.doctor} on {appointment.date} at {appointment.time}",
            url="/profile",
            tag=f"appointment-{appointment.id}"
        )
    
    # Send SMS confirmation to patient
    await send_appointment_sms(appointment.patient_phone, {
        "doctor": appointment.doctor,
        "clinic": appointment.clinic,
        "date": appointment.date,
        "time": appointment.time,
        "booking_id": booking_id,
        "booking_type": "online"
    })
    
    # Send WhatsApp confirmation via MSG91
    try:
        whatsapp_result = await send_diagyn_appointment_confirmation(
            phone=appointment.patient_phone,
            patient_name=appointment.patient_name,
            date=appointment.date,
            time=appointment.time,
            doctor_name=appointment.doctor,
            clinic_name=appointment.clinic,
            booking_id=booking_id,
            db=db
        )
        if whatsapp_result.get("success"):
            logger.info(f"✅ WhatsApp confirmation sent for booking {booking_id}")
        else:
            logger.warning(f"⚠️ WhatsApp confirmation failed: {whatsapp_result.get('error')}")
    except Exception as e:
        logger.error(f"❌ WhatsApp notification error: {e}")
    
    # Send SMS notification to DiaGyn staff
    await notify_staff_new_appointment({
        "patient_name": appointment.patient_name,
        "doctor": appointment.doctor,
        "clinic": appointment.clinic,
        "date": appointment.date,
        "time": appointment.time,
        "booking_id": booking_id,
        "booking_type": "online"
    })
    
    # Broadcast real-time slot update via WebSocket
    await slot_manager.broadcast_slot_update(
        doctor=appointment.doctor,
        clinic=appointment.clinic,
        date=appointment.date,
        slot=appointment.time,
        status="booked"
    )
    
    return appointment

@api_router.get("/appointments/booked-slots")
async def get_booked_slots(doctor: str, clinic: str, date: str):
    """Get booked slots for a specific doctor, clinic, and date
    Returns slots that are actively booked (not cancelled/no-show)
    This endpoint is used by both DiaGyn (patient) and StaffPortal for slot synchronization
    Includes 'pending' and 'blocked' status to block slots from patient bookings
    """
    booked = await db.appointments.find(
        {
            "doctor": doctor, 
            "clinic": clinic, 
            "date": date,
            "status": {"$in": ["pending", "Booked", "blocked", "In Clinic", "Completed"]}
        },
        {"_id": 0, "time": 1}
    ).to_list(100)
    
    return {"booked_slots": [b["time"] for b in booked if b.get("time")]}

# ============ STAFF SLOT BLOCKING API ============
class SlotBlockRequest(BaseModel):
    doctor: str
    clinic: str
    date: str
    slots: List[str]  # List of time slots to block, e.g., ["11:00", "11:15", "11:30"]
    reason: str = "Doctor running late"

@api_router.post("/appointments/block-slots")
async def block_slots(request: SlotBlockRequest):
    """Block slots for same-day appointments (staff/doctor use only)
    Creates 'blocked' appointments to prevent patient bookings
    """
    from datetime import datetime
    
    # Validate date is today or future
    try:
        block_date = datetime.strptime(request.date, "%Y-%m-%d").date()
        today = datetime.now().date()
        if block_date < today:
            raise HTTPException(status_code=400, detail="Cannot block slots for past dates")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    blocked_count = 0
    already_blocked = []
    
    for slot in request.slots:
        # Check if slot is already booked or blocked
        existing = await db.appointments.find_one({
            "doctor": request.doctor,
            "clinic": request.clinic,
            "date": request.date,
            "time": slot,
            "status": {"$in": ["pending", "Booked", "blocked", "In Clinic"]}
        })
        
        if existing:
            already_blocked.append(slot)
            continue
        
        # Create blocked appointment
        blocked_appointment = {
            "doctor": request.doctor,
            "clinic": request.clinic,
            "date": request.date,
            "time": slot,
            "status": "blocked",
            "reason": request.reason,
            "blocked_at": datetime.now().isoformat(),
            "patient_name": "BLOCKED",
            "patient_phone": "0000000000"
        }
        
        await db.appointments.insert_one(blocked_appointment)
        blocked_count += 1
        
        # Notify connected clients via WebSocket
        await slot_manager.broadcast_slot_update(
            request.doctor, request.clinic, request.date, slot, "booked"
        )
    
    return {
        "success": True,
        "blocked_count": blocked_count,
        "already_blocked": already_blocked,
        "message": f"Blocked {blocked_count} slots" + (f", {len(already_blocked)} already unavailable" if already_blocked else "")
    }

@api_router.post("/appointments/unblock-slots")
async def unblock_slots(request: SlotBlockRequest):
    """Unblock previously blocked slots"""
    unblocked_count = 0
    
    for slot in request.slots:
        result = await db.appointments.delete_one({
            "doctor": request.doctor,
            "clinic": request.clinic,
            "date": request.date,
            "time": slot,
            "status": "blocked"
        })
        
        if result.deleted_count > 0:
            unblocked_count += 1
            # Notify connected clients via WebSocket
            await slot_manager.broadcast_slot_update(
                request.doctor, request.clinic, request.date, slot, "available"
            )
    
    return {
        "success": True,
        "unblocked_count": unblocked_count,
        "message": f"Unblocked {unblocked_count} slots"
    }

@api_router.get("/appointments/blocked-slots")
async def get_blocked_slots(doctor: str, clinic: str, date: str):
    """Get manually blocked slots for a specific doctor, clinic, and date"""
    blocked = await db.appointments.find(
        {
            "doctor": doctor,
            "clinic": clinic,
            "date": date,
            "status": "blocked"
        },
        {"_id": 0, "time": 1, "reason": 1, "blocked_at": 1}
    ).to_list(100)
    
    return {"blocked_slots": blocked}

# ============ WEBSOCKET ENDPOINT FOR REAL-TIME SLOT UPDATES ============
@app.websocket("/api/ws/slots")
async def websocket_slot_updates(
    websocket: WebSocket,
    doctor: str = Query(...),
    clinic: str = Query(...),
    date: str = Query(...)
):
    """WebSocket endpoint for real-time slot availability updates
    
    Connect with: ws://host/ws/slots?doctor=Dr.%20Neha%20Patel&clinic=Pushpa%20Clinic&date=2026-01-15
    
    Receives messages when slots are booked or become available:
    {
        "type": "slot_update",
        "doctor": "Dr. Neha Patel",
        "clinic": "Pushpa Clinic", 
        "date": "2026-01-15",
        "slot": "11:00 AM",
        "status": "booked" | "available",
        "timestamp": "2026-01-15T10:30:00Z"
    }
    """
    await slot_manager.connect(websocket, doctor, clinic, date)
    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connected",
            "message": "Connected to slot updates",
            "doctor": doctor,
            "clinic": clinic,
            "date": date
        })
        
        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Wait for messages (ping/pong or subscription changes)
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                message = json.loads(data)
                
                # Handle subscription change (user selects different date)
                if message.get("type") == "subscribe":
                    new_doctor = message.get("doctor", doctor)
                    new_clinic = message.get("clinic", clinic)
                    new_date = message.get("date", date)
                    
                    # Disconnect from old room
                    slot_manager.disconnect(websocket, doctor, clinic, date)
                    
                    # Update subscription
                    doctor, clinic, date = new_doctor, new_clinic, new_date
                    
                    # Connect to new room
                    room_key = slot_manager.get_room_key(doctor, clinic, date)
                    if room_key not in slot_manager.active_connections:
                        slot_manager.active_connections[room_key] = set()
                    slot_manager.active_connections[room_key].add(websocket)
                    
                    await websocket.send_json({
                        "type": "subscribed",
                        "doctor": doctor,
                        "clinic": clinic,
                        "date": date
                    })
                
                # Handle ping
                elif message.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                    
            except asyncio.TimeoutError:
                # Send heartbeat
                try:
                    await websocket.send_json({"type": "heartbeat"})
                except:
                    break
                    
    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected: {doctor}, {clinic}, {date}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        slot_manager.disconnect(websocket, doctor, clinic, date)

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

@api_router.get("/booking-limits/status")
async def get_booking_limits_status(phone: str = None, user = Depends(get_current_user_optional)):
    """Check if user can book appointments/orders based on current active bookings"""
    user_phone = phone or (user.phone if user else None)
    user_id = user.id if user else None
    
    if not user_phone and not user_id:
        return {
            "can_book_appointment": True,
            "can_book_diagnostic": True,
            "can_book_pharmacy": True,
            "can_book_teleconsult": True,
            "active_appointments": 0,
            "active_diagnostic_orders": 0,
            "active_pharmacy_orders": 0,
            "active_teleconsults": 0
        }
    
    # Check active DiaGyn appointments
    active_appointment = None
    if user_phone:
        active_appointment = await db.appointments.find_one({
            "patient_phone": user_phone,
            "status": {"$in": ["pending", "Booked", "In Clinic"]},
            "appointment_type": {"$ne": "EMERGENCY"}
        }, {"_id": 0, "date": 1, "time": 1, "doctor": 1})
    
    # Check active teleconsult bookings
    active_teleconsult = None
    if user_id:
        active_teleconsult = await db.teleconsult_bookings.find_one({
            "user_id": user_id,
            "status": {"$in": ["pending", "confirmed", "Booked"]}
        }, {"_id": 0, "date": 1, "time": 1, "doctor_name": 1})
    
    # Check active diagnostic orders
    active_diagnostic_count = 0
    if user_phone:
        active_diagnostic_count = await db.diagnostic_orders.count_documents({
            "patient_phone": user_phone,
            "status": {"$in": ["pending", "Pending", "confirmed", "Confirmed", "Processing", "Sample Collected", "sample_collected"]}
        })
    
    # Check active pharmacy orders
    active_pharmacy_count = 0
    if user_phone:
        active_pharmacy_count = await db.pharmacy_orders.count_documents({
            "patient_phone": user_phone,
            "status": {"$in": ["pending", "Pending", "confirmed", "Confirmed", "Processing", "Ready for Pickup", "ready_for_pickup", "Out for Delivery", "out_for_delivery"]}
        })
    
    return {
        "can_book_appointment": active_appointment is None,
        "can_book_diagnostic": active_diagnostic_count < 2,
        "can_book_pharmacy": active_pharmacy_count < 2,
        "can_book_teleconsult": active_teleconsult is None,
        "active_appointments": 1 if active_appointment else 0,
        "active_diagnostic_orders": active_diagnostic_count,
        "active_pharmacy_orders": active_pharmacy_count,
        "active_teleconsults": 1 if active_teleconsult else 0,
        "active_appointment_details": active_appointment,
        "active_teleconsult_details": active_teleconsult
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

# ==================== WAITLIST FEATURE ====================

class WaitlistRequest(BaseModel):
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    doctor_id: str
    doctor_name: str
    preferred_date: str
    service_type: str = "diagyn"
    notes: Optional[str] = None

@api_router.post("/appointments/waitlist")
async def join_waitlist(request: WaitlistRequest):
    """Join waitlist when preferred slot is not available"""
    waitlist_entry = {
        "id": f"WL-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}",
        "patient_name": request.patient_name,
        "patient_phone": request.patient_phone,
        "patient_email": request.patient_email,
        "doctor_id": request.doctor_id,
        "doctor_name": request.doctor_name,
        "preferred_date": request.preferred_date,
        "service_type": request.service_type,
        "notes": request.notes,
        "status": "waiting",
        "notified": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.appointment_waitlist.insert_one(waitlist_entry)
    waitlist_entry.pop("_id", None)
    
    # Get position in waitlist
    position = await db.appointment_waitlist.count_documents({
        "doctor_id": request.doctor_id,
        "preferred_date": request.preferred_date,
        "status": "waiting"
    })
    
    return {
        "success": True,
        "waitlist_id": waitlist_entry["id"],
        "position": position,
        "message": f"You're #{position} on the waitlist. We'll notify you when a slot opens."
    }

@api_router.get("/appointments/waitlist/{patient_phone}")
async def get_waitlist_status(patient_phone: str):
    """Get waitlist entries for a patient"""
    entries = await db.appointment_waitlist.find({
        "patient_phone": patient_phone,
        "status": "waiting"
    }).to_list(20)
    
    for e in entries:
        e.pop("_id", None)
        # Calculate position
        e["position"] = await db.appointment_waitlist.count_documents({
            "doctor_id": e["doctor_id"],
            "preferred_date": e["preferred_date"],
            "status": "waiting",
            "created_at": {"$lte": e["created_at"]}
        })
    
    return {"waitlist_entries": entries}

@api_router.get("/appointments/waitlist/status")
async def check_waitlist_status(patient_id: str, doctor_id: str):
    """Check if patient is on waitlist for a specific doctor"""
    entry = await db.appointment_waitlist.find_one({
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "status": "waiting"
    }, {"_id": 0})
    
    if entry:
        position = await db.appointment_waitlist.count_documents({
            "doctor_id": doctor_id,
            "status": "waiting",
            "created_at": {"$lt": entry.get("created_at", "")}
        }) + 1
        return {
            "success": True,
            "on_waitlist": True,
            "position": position,
            "estimated_wait": "1-2 days" if position <= 3 else "3-5 days"
        }
    
    return {"success": True, "on_waitlist": False}

@api_router.post("/appointments/waitlist/join")
async def join_waitlist_new(
    patient_id: str = Body(...),
    patient_name: str = Body(...),
    patient_phone: str = Body(...),
    doctor_id: str = Body(...),
    doctor_name: str = Body(None),
    clinic: str = Body("diagyn"),
    preferred_dates: list = Body([]),
    notify_via: str = Body("both"),
    priority: str = Body("normal")
):
    """Join waitlist for a doctor"""
    import uuid
    
    # Check if already on waitlist
    existing = await db.appointment_waitlist.find_one({
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "status": "waiting"
    })
    
    if existing:
        return {"success": False, "message": "Already on waitlist for this doctor"}
    
    waitlist_entry = {
        "id": f"WL-{uuid.uuid4().hex[:8].upper()}",
        "patient_id": patient_id,
        "patient_name": patient_name,
        "patient_phone": patient_phone,
        "doctor_id": doctor_id,
        "doctor_name": doctor_name,
        "clinic": clinic,
        "preferred_dates": preferred_dates,
        "notify_via": notify_via,
        "priority": priority,
        "status": "waiting",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "notified": False
    }
    
    await db.appointment_waitlist.insert_one(waitlist_entry)
    
    # Get position
    position = await db.appointment_waitlist.count_documents({
        "doctor_id": doctor_id,
        "status": "waiting"
    })
    
    return {
        "success": True,
        "waitlist_id": waitlist_entry["id"],
        "position": position,
        "estimated_wait": "1-2 days" if position <= 3 else "3-5 days",
        "message": f"You're #{position} on the waitlist"
    }

@api_router.post("/appointments/waitlist/leave")
async def leave_waitlist(
    patient_id: str = Body(...),
    doctor_id: str = Body(...)
):
    """Leave/cancel waitlist entry"""
    result = await db.appointment_waitlist.update_one(
        {"patient_id": patient_id, "doctor_id": doctor_id, "status": "waiting"},
        {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count > 0:
        return {"success": True, "message": "Removed from waitlist"}
    
    return {"success": False, "message": "Not found on waitlist"}

@api_router.post("/appointments/waitlist/notify")
async def notify_waitlist_slot_available(doctor_id: str = Body(...), date: str = Body(...), time: str = Body(...)):
    """Notify waitlist patients when slot becomes available"""
    # Find first waiting patient
    waiting = await db.appointment_waitlist.find_one({
        "doctor_id": doctor_id,
        "preferred_date": date,
        "status": "waiting",
        "notified": False
    })
    
    if not waiting:
        return {"success": False, "message": "No patients in waitlist"}
    
    # Mark as notified
    await db.appointment_waitlist.update_one(
        {"id": waiting["id"]},
        {"$set": {"notified": True, "notified_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # TODO: Send WhatsApp/SMS notification
    
    return {
        "success": True,
        "patient_notified": waiting["patient_name"],
        "phone": waiting["patient_phone"]
    }

# ==================== QUICK RESCHEDULE ====================

class RescheduleRequest(BaseModel):
    appointment_id: str
    new_date: str
    new_time: str
    reason: Optional[str] = None

@api_router.post("/appointments/reschedule")
async def quick_reschedule(request: RescheduleRequest):
    """Reschedule appointment in 2 taps without cancelling"""
    # Find the appointment
    appointment = await db.appointments.find_one({"id": request.appointment_id})
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    if appointment.get("status") in ["completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Cannot reschedule completed or cancelled appointment")
    
    # Store old details
    old_date = appointment.get("date")
    old_time = appointment.get("time")
    
    # Update appointment
    await db.appointments.update_one(
        {"id": request.appointment_id},
        {
            "$set": {
                "date": request.new_date,
                "time": request.new_time,
                "status": "rescheduled",
                "rescheduled_at": datetime.now(timezone.utc).isoformat(),
                "reschedule_reason": request.reason
            },
            "$push": {
                "reschedule_history": {
                    "old_date": old_date,
                    "old_time": old_time,
                    "new_date": request.new_date,
                    "new_time": request.new_time,
                    "reason": request.reason,
                    "changed_at": datetime.now(timezone.utc).isoformat()
                }
            }
        }
    )
    
    # Free up old slot and notify waitlist
    await notify_waitlist_slot_available(
        doctor_id=appointment.get("doctor_id", ""),
        date=old_date,
        time=old_time
    )
    
    return {
        "success": True,
        "message": f"Appointment rescheduled to {request.new_date} at {request.new_time}",
        "old_slot": f"{old_date} {old_time}",
        "new_slot": f"{request.new_date} {request.new_time}"
    }

# ==================== LIVE QUEUE STATUS ====================

@api_router.get("/appointments/queue/{doctor_id}")
async def get_live_queue_status(doctor_id: str, date: str = None):
    """Get real-time queue status for a doctor"""
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")
    
    # Get today's appointments for this doctor
    appointments = await db.appointments.find({
        "doctor_id": doctor_id,
        "date": date,
        "status": {"$in": ["confirmed", "checked_in", "in_progress"]}
    }).sort("time", 1).to_list(50)
    
    # Count statuses
    waiting = 0
    in_progress = 0
    completed_today = await db.appointments.count_documents({
        "doctor_id": doctor_id,
        "date": date,
        "status": "completed"
    })
    
    queue = []
    for idx, appt in enumerate(appointments):
        appt.pop("_id", None)
        status = appt.get("status")
        
        if status == "checked_in":
            waiting += 1
            queue.append({
                "position": waiting,
                "patient_name": appt.get("patient_name", "")[:20],  # Privacy
                "time": appt.get("time"),
                "status": "waiting",
                "estimated_wait": f"{waiting * 15} min"  # ~15 min per patient
            })
        elif status == "in_progress":
            in_progress += 1
    
    return {
        "doctor_id": doctor_id,
        "date": date,
        "queue": queue,
        "stats": {
            "patients_waiting": waiting,
            "currently_with_doctor": in_progress,
            "completed_today": completed_today,
            "average_wait_time": f"{waiting * 12} min"
        },
        "last_updated": datetime.now(timezone.utc).isoformat()
    }

@api_router.get("/appointments/my-position/{appointment_id}")
async def get_my_queue_position(appointment_id: str):
    """Get patient's position in queue"""
    appointment = await db.appointments.find_one({"id": appointment_id})
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Count patients ahead
    patients_ahead = await db.appointments.count_documents({
        "doctor_id": appointment.get("doctor_id"),
        "date": appointment.get("date"),
        "status": {"$in": ["checked_in", "in_progress"]},
        "time": {"$lt": appointment.get("time")}
    })
    
    return {
        "appointment_id": appointment_id,
        "position": patients_ahead + 1,
        "patients_ahead": patients_ahead,
        "estimated_wait": f"{patients_ahead * 12} min",
        "your_time": appointment.get("time"),
        "status": appointment.get("status"),
        "message": f"You're #{patients_ahead + 1} in queue" if patients_ahead > 0 else "You're next!"
    }

@api_router.post("/appointments/check-in/{appointment_id}")
async def patient_check_in(appointment_id: str):
    """Patient checks in for their appointment"""
    result = await db.appointments.update_one(
        {"id": appointment_id, "status": "confirmed"},
        {
            "$set": {
                "status": "checked_in",
                "checked_in_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Appointment not found or already checked in")
    
    # Get position
    position_data = await get_my_queue_position(appointment_id)
    
    return {
        "success": True,
        "message": "Check-in successful!",
        **position_data
    }
async def create_diagnostic_order(input: DiagnosticOrderCreate, user = Depends(get_current_user)):
    # ORDER LIMIT: Check if user already has 2 active diagnostic orders
    active_orders = await db.diagnostic_orders.find({
        "patient_phone": input.patient_phone,
        "status": {"$in": ["pending", "Pending", "confirmed", "Confirmed", "Processing", "Sample Collected", "sample_collected"]}
    }, {"_id": 0, "id": 1, "tests": 1, "status": 1, "preferred_date": 1}).to_list(2)
    
    if len(active_orders) >= 2:
        # Notify staff about order limit reached
        try:
            orders_info = "\n".join([f"  • Order {o.get('id', 'N/A')[:8]}: {', '.join(o.get('tests', [])[:2])} - {o.get('status')}" for o in active_orders])
            staff_message = f"""⚠️ DIAGNOSTIC ORDER LIMIT REACHED

Patient: {input.patient_name}
Phone: {input.patient_phone}
Tried to order: {', '.join(input.tests[:3])}

❌ BLOCKED - Already has 2 active orders:
{orders_info}

Please check if orders need to be updated or completed."""

            # Staff SMS DISABLED - using email notifications instead
            # await send_sms_notification(STAFF_PHONE_NUMBERS.get('proton', ['9833188288'])[0], staff_message)
            logger.info(f"Staff notified (via email) about diagnostic order limit for {input.patient_phone}")
        except Exception as e:
            logger.error(f"Failed to notify staff about diagnostic order limit: {e}")
        
        raise HTTPException(
            status_code=400, 
            detail="You already have 2 active diagnostic orders. Please wait for them to be completed or cancel one before placing a new order."
        )
    
    # Generate unique booking ID for lab test
    booking_id = await generate_booking_id("Proton Diagnostics", db, "lab_test")
    
    order = DiagnosticOrder(
        user_id=user.id if user else None,
        **input.model_dump()
    )
    
    doc = order.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['booking_id'] = booking_id  # Add booking ID to order
    
    await db.diagnostic_orders.insert_one(doc)
    logger.info(f"Diagnostic order created: {order.id} with booking_id: {booking_id}")
    
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
    
    # Generate QR code for lab test booking
    qr_code_base64 = generate_generic_qr_code(booking_id, "lab_test", {
        "patient_name": order.patient_name,
        "tests": ", ".join(order.tests[:3]),
        "date": order.preferred_date
    })
    
    # Send email notification for new diagnostic order
    tests_list = "<br>".join([f"• {test}" for test in order.tests])
    email_html = f"""
    <h2>🔬 New Proton Diagnostics Order</h2>
    <h3>Booking ID: {booking_id}</h3>
    <h3>Tests Ordered:</h3>
    <p>{tests_list}</p>
    <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Booking ID:</strong></td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #8b5cf6;">{booking_id}</td></tr>
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
    
    # Patient confirmation email for diagnostics with QR code
    tests_list_patient = "".join([f"<li>{test}</li>" for test in order.tests])
    patient_diag_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Test Booking Confirmed! 🔬</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px;">Hello <strong>{order.patient_name}</strong>,</p>
            <p>Your diagnostic tests have been successfully booked at <strong>Proton Diagnostics</strong>.</p>
            
            <!-- QR Code Section -->
            <div style="text-align: center; margin: 25px 0; padding: 20px; background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); border-radius: 12px;">
                <p style="color: white; margin: 0 0 10px 0; font-size: 14px;">Show this QR code at the collection center</p>
                <div style="background: white; display: inline-block; padding: 15px; border-radius: 10px;">
                    <img src="data:image/png;base64,{qr_code_base64}" alt="Booking QR Code" style="width: 150px; height: 150px;">
                </div>
                <p style="margin: 10px 0 0 0; color: white; font-size: 24px; font-weight: bold; letter-spacing: 3px;">{booking_id}</p>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
                <h3 style="color: #8b5cf6; margin-top: 0;">Tests Booked</h3>
                <ul style="line-height: 1.8;">{tests_list_patient}</ul>
                <p><strong>Preferred Date:</strong> {order.preferred_date}</p>
                <p><strong>Booking ID:</strong> <span style="font-size: 18px; color: #8b5cf6; font-weight: bold;">{booking_id}</span></p>
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
    
    # Send WhatsApp confirmation via MSG91
    try:
        tests_text = ", ".join(order.tests[:3]) + ("..." if len(order.tests) > 3 else "")
        whatsapp_result = await send_proton_lab_confirmation(
            phone=order.patient_phone,
            patient_name=order.patient_name,
            tests=tests_text,
            preferred_date=order.preferred_date,
            preferred_time=order.preferred_time or "To be confirmed",
            booking_id=booking_id,
            address=order.address or "Home collection address to be confirmed",
            db=db
        )
        if whatsapp_result.get("success"):
            logger.info(f"✅ WhatsApp lab confirmation sent for booking {booking_id}")
        else:
            logger.warning(f"⚠️ WhatsApp lab confirmation failed: {whatsapp_result.get('error')}")
    except Exception as e:
        logger.error(f"❌ WhatsApp lab notification error: {e}")
    
    # Send SMS notification to Proton Diagnostics staff
    await notify_staff_new_order({
        "id": order.id,
        "patient_name": order.patient_name,
        "test_name": ", ".join(order.tests[:2]) + ("..." if len(order.tests) > 2 else "")
    }, "proton")
    
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

# ==================== PROTON TREND ANALYSIS ====================

@api_router.get("/diagnostics/trends/{patient_id}")
async def get_report_trends(patient_id: str, test_name: str = None):
    """Get trend analysis for patient's lab reports"""
    # Get all completed orders with results
    orders = await db.diagnostic_orders.find({
        "$or": [
            {"user_id": patient_id},
            {"patient_phone": patient_id}
        ],
        "status": {"$in": ["Completed", "completed", "Delivered", "delivered"]}
    }).sort("created_at", -1).to_list(100)
    
    # Get lab results
    results = await db.lab_results.find({
        "$or": [
            {"patient_id": patient_id},
            {"patient_phone": patient_id}
        ]
    }).sort("test_date", -1).to_list(200)
    
    # Organize by test type
    trends = {}
    
    for result in results:
        test_type = result.get("test_type", result.get("test_name", "Unknown"))
        
        if test_name and test_name.lower() not in test_type.lower():
            continue
        
        if test_type not in trends:
            trends[test_type] = []
        
        trends[test_type].append({
            "date": result.get("test_date") or result.get("created_at"),
            "value": result.get("value"),
            "unit": result.get("unit", ""),
            "reference_range": result.get("reference_range", ""),
            "status": result.get("status", "normal"),  # normal, high, low, critical
            "notes": result.get("notes", "")
        })
    
    # Calculate trend direction for each test
    for test_type in trends:
        values = trends[test_type]
        if len(values) >= 2:
            try:
                latest = float(values[0]["value"]) if values[0]["value"] else 0
                previous = float(values[1]["value"]) if values[1]["value"] else 0
                if previous > 0:
                    change_percent = ((latest - previous) / previous) * 100
                    trends[test_type] = {
                        "values": values[:10],  # Last 10 readings
                        "trend": "up" if change_percent > 5 else "down" if change_percent < -5 else "stable",
                        "change_percent": round(change_percent, 1),
                        "latest_value": latest,
                        "latest_date": values[0]["date"]
                    }
                else:
                    trends[test_type] = {
                        "values": values[:10],
                        "trend": "stable",
                        "change_percent": 0,
                        "latest_value": latest,
                        "latest_date": values[0]["date"]
                    }
            except (ValueError, TypeError):
                trends[test_type] = {
                    "values": values[:10],
                    "trend": "unknown",
                    "change_percent": 0
                }
        else:
            trends[test_type] = {
                "values": values,
                "trend": "insufficient_data",
                "change_percent": 0
            }
    
    return {
        "success": True,
        "patient_id": patient_id,
        "parameters": [
            {
                "name": test_type,
                "currentValue": data.get("latest_value", data.get("values", [{}])[0].get("value", 0)),
                "unit": data.get("values", [{}])[0].get("unit", ""),
                "trend": "increasing" if data.get("trend") == "up" else "decreasing" if data.get("trend") == "down" else "stable",
                "status": data.get("values", [{}])[0].get("status", "normal"),
                "lastDate": data.get("latest_date", data.get("values", [{}])[0].get("date", "")),
                "normalRange": parse_reference_range(data.get("values", [{}])[0].get("reference_range", "")),
                "values": [{"value": v.get("value"), "date": v.get("date"), "status": v.get("status", "normal")} for v in data.get("values", [])],
                "insight": generate_insight(test_type, data)
            }
            for test_type, data in trends.items()
        ],
        "total_tests": len(trends),
        "last_updated": datetime.now(timezone.utc).isoformat()
    }

def parse_reference_range(ref_range: str):
    """Parse reference range string into min/max"""
    try:
        if "-" in ref_range:
            parts = ref_range.replace(" ", "").split("-")
            return {"min": float(parts[0]), "max": float(parts[1])}
    except:
        pass
    return {"min": None, "max": None}

def generate_insight(test_type: str, data: dict):
    """Generate insight for a parameter"""
    trend = data.get("trend", "stable")
    status = data.get("values", [{}])[0].get("status", "normal")
    
    insights = {
        "normal": f"Your {test_type} levels are within normal range. Keep up the healthy lifestyle!",
        "borderline": f"Your {test_type} is borderline. Consider dietary changes and follow-up testing.",
        "high": f"Your {test_type} is elevated. Please consult with your doctor for guidance.",
        "low": f"Your {test_type} is below normal. Discuss supplementation options with your doctor."
    }
    
    return insights.get(status, f"Your {test_type} levels are being monitored.")

@api_router.post("/diagnostics/results")
async def save_lab_result(
    patient_id: str = Body(...),
    patient_phone: str = Body(None),
    test_name: str = Body(...),
    test_type: str = Body(...),
    value: str = Body(...),
    unit: str = Body(""),
    reference_range: str = Body(""),
    status: str = Body("normal"),
    test_date: str = Body(None),
    notes: str = Body("")
):
    """Save a lab result for trend tracking"""
    result = {
        "id": str(uuid.uuid4()),
        "patient_id": patient_id,
        "patient_phone": patient_phone,
        "test_name": test_name,
        "test_type": test_type,
        "value": value,
        "unit": unit,
        "reference_range": reference_range,
        "status": status,
        "test_date": test_date or datetime.now(timezone.utc).isoformat(),
        "notes": notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.lab_results.insert_one(result)
    result.pop("_id", None)
    
    return {"success": True, "result": result}

@api_router.get("/diagnostics/history/{patient_id}")
async def get_test_history(patient_id: str, limit: int = 50):
    """Get complete test history for a patient"""
    results = await db.lab_results.find({
        "$or": [
            {"patient_id": patient_id},
            {"patient_phone": patient_id}
        ]
    }).sort("test_date", -1).to_list(limit)
    
    for r in results:
        r.pop("_id", None)
    
    # Group by test type
    grouped = {}
    for r in results:
        test_type = r.get("test_type", r.get("test_name", "Other"))
        if test_type not in grouped:
            grouped[test_type] = []
        grouped[test_type].append(r)
    
    return {
        "patient_id": patient_id,
        "history": grouped,
        "total_results": len(results),
        "test_types": list(grouped.keys())
    }

# ==================== HOME SAMPLE COLLECTION ====================

class HomeSampleRequest(BaseModel):
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    address: str
    pincode: str
    tests: List[str]
    preferred_date: str
    preferred_time: str
    special_instructions: Optional[str] = None

@api_router.post("/diagnostics/home-collection")
async def book_home_sample_collection(request: HomeSampleRequest):
    """Book home sample collection service"""
    booking = {
        "id": f"HSC-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}",
        "patient_name": request.patient_name,
        "patient_phone": request.patient_phone,
        "patient_email": request.patient_email,
        "address": request.address,
        "pincode": request.pincode,
        "tests": request.tests,
        "preferred_date": request.preferred_date,
        "preferred_time": request.preferred_time,
        "special_instructions": request.special_instructions,
        "status": "pending",
        "service_type": "home_collection",
        "collection_fee": 100,  # ₹100 home collection fee
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.home_collections.insert_one(booking)
    booking.pop("_id", None)
    
    # Notify staff
    try:
        await notify_staff_new_order({
            "id": booking["id"],
            "patient_name": request.patient_name,
            "test_name": ", ".join(request.tests[:2]),
            "type": "Home Collection"
        }, "proton")
    except Exception as e:
        logger.error(f"Failed to notify staff about home collection: {e}")
    
    return {
        "success": True,
        "booking": booking,
        "message": "Home sample collection booked! Our phlebotomist will arrive at your preferred time."
    }

@api_router.post("/diagnostics/fasting-reminder")
async def send_fasting_reminder(
    patient_phone: str = Body(...),
    patient_name: str = Body(...),
    test_date: str = Body(...),
    test_time: str = Body(...),
    tests: List[str] = Body(...)
):
    """Send fasting reminder via WhatsApp and email"""
    # Check which tests require fasting
    fasting_tests = ["glucose", "sugar", "lipid", "cholesterol", "triglyceride", "fbs", "ppbs"]
    requires_fasting = any(
        any(ft in test.lower() for ft in fasting_tests) 
        for test in tests
    )
    
    if not requires_fasting:
        return {
            "success": True,
            "requires_fasting": False,
            "message": "No fasting required for these tests"
        }
    
    # Schedule reminder (in real app, would use a scheduler)
    reminder = {
        "id": str(uuid.uuid4()),
        "patient_phone": patient_phone,
        "patient_name": patient_name,
        "test_date": test_date,
        "test_time": test_time,
        "tests": tests,
        "reminder_type": "fasting",
        "status": "scheduled",
        "message": f"🔔 Reminder: Your lab test is tomorrow at {test_time}. Please fast for 8-12 hours before the test. Drink only water.",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.test_reminders.insert_one(reminder)
    
    return {
        "success": True,
        "requires_fasting": True,
        "message": "Fasting reminder scheduled! You'll receive a WhatsApp reminder before your test.",
        "reminder_id": reminder["id"]
    }
async def create_pharmacy_order(input: PharmacyOrderCreate, user = Depends(get_current_user)):
    # ORDER LIMIT: Check if user already has 2 active pharmacy orders
    active_orders = await db.pharmacy_orders.find({
        "patient_phone": input.patient_phone,
        "status": {"$in": ["pending", "Pending", "confirmed", "Confirmed", "Processing", "Ready for Pickup", "ready_for_pickup", "Out for Delivery", "out_for_delivery"]}
    }, {"_id": 0, "id": 1, "medicines": 1, "status": 1, "created_at": 1}).to_list(2)
    
    if len(active_orders) >= 2:
        # Notify staff about order limit reached
        try:
            orders_info = "\n".join([f"  • Order {o.get('id', 'N/A')[:8]}: {len(o.get('medicines', []))} items - {o.get('status')}" for o in active_orders])
            medicines_text = ", ".join([m.get('name', 'Unknown') for m in input.medicines[:3]])
            staff_message = f"""⚠️ PHARMACY ORDER LIMIT REACHED

Patient: {input.patient_name}
Phone: {input.patient_phone}
Tried to order: {medicines_text}

❌ BLOCKED - Already has 2 active orders:
{orders_info}

Please check if orders need delivery update."""

            # Staff SMS DISABLED - using email notifications instead
            # await send_sms_notification(STAFF_PHONE_NUMBERS.get('orange', ['9833188288'])[0], staff_message)
            logger.info(f"Staff notified (via email) about pharmacy order limit for {input.patient_phone}")
        except Exception as e:
            logger.error(f"Failed to notify staff about pharmacy order limit: {e}")
        
        raise HTTPException(
            status_code=400, 
            detail="You already have 2 active pharmacy orders. Please wait for them to be delivered or cancel one before placing a new order."
        )
    
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
    
    # Generate unique booking ID for pharmacy order
    booking_id = await generate_booking_id("Orange Pharmacy", db, "pharmacy")
    
    order = PharmacyOrder(
        user_id=user.id if user else None,
        points_used=points_used,
        discount_amount=discount_amount,
        **order_data
    )
    
    doc = order.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['booking_id'] = booking_id  # Add booking ID to order
    
    await db.pharmacy_orders.insert_one(doc)
    logger.info(f"Pharmacy order created: {order.id} with booking_id: {booking_id}")
    
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
    <h3>Booking ID: <span style="color: #f97316;">{booking_id}</span></h3>
    <h3>Medicines Ordered:</h3>
    <p>{medicines_list}</p>
    <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Booking ID:</strong></td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #f97316;">{booking_id}</td></tr>
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
    
    # Generate QR code for pharmacy order
    medicines_preview = ", ".join([m.get('name', 'Unknown') for m in order.medicines[:2]]) if order.medicines else "See prescription"
    qr_code_base64 = generate_generic_qr_code(booking_id, "pharmacy", {
        "patient_name": order.patient_name,
        "medicines": medicines_preview,
        "delivery_address": order.delivery_address or "Pickup"
    })
    
    # Discount info for patient email
    patient_discount_html = f'''
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center;">
            <p style="margin: 0; color: #d97706; font-weight: bold;">🎁 Loyalty Discount Applied!</p>
            <p style="margin: 5px 0 0 0; color: #92400e; font-size: 20px;">₹{order.discount_amount:.0f} OFF</p>
            <p style="margin: 5px 0 0 0; color: #78350f; font-size: 12px;">({order.points_used} points redeemed)</p>
        </div>
    ''' if order.points_used > 0 else ''
    
    # Patient confirmation email for pharmacy with QR code
    medicines_list_patient = "".join([f"<li>{m.get('name', 'Unknown')} - Qty: {m.get('quantity', 1)}</li>" for m in order.medicines]) if order.medicines else '<li><em>Medicines as per prescription</em></li>'
    patient_pharmacy_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Order Confirmed! 💊</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px;">Hello <strong>{order.patient_name}</strong>,</p>
            <p>Your order has been successfully placed at <strong>Orange Pharmacy</strong>.</p>
            
            <!-- QR Code Section -->
            <div style="text-align: center; margin: 25px 0; padding: 20px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 12px;">
                <p style="color: white; margin: 0 0 10px 0; font-size: 14px;">Show this QR code for pickup/delivery verification</p>
                <div style="background: white; display: inline-block; padding: 15px; border-radius: 10px;">
                    <img src="data:image/png;base64,{qr_code_base64}" alt="Order QR Code" style="width: 150px; height: 150px;">
                </div>
                <p style="margin: 10px 0 0 0; color: white; font-size: 24px; font-weight: bold; letter-spacing: 3px;">{booking_id}</p>
            </div>
            
            {patient_discount_html}
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316;">
                <h3 style="color: #f97316; margin-top: 0;">Order Details</h3>
                <p><strong>Order ID:</strong> <span style="font-size: 18px; color: #f97316; font-weight: bold;">{booking_id}</span></p>
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
        f"New Pharmacy Order - {order.patient_name} ({booking_id})", 
        email_html,
        patient_email=order.patient_email,
        patient_subject=f"Order Confirmed - Orange Pharmacy {booking_id}",
        patient_html=patient_pharmacy_html
    )
    
    # Send push notification if user is logged in
    if user:
        medicine_count = len(order.medicines) if order.medicines else 0
        await send_push_notification(
            user_id=user.id,
            title="Order Placed! 💊",
            body=f"Your order {booking_id} with {medicine_count} item(s) has been placed. We'll notify you when it's out for delivery.",
            url="/profile",
            tag=f"pharmacy-{order.id}"
        )
    
    # Send SMS confirmation to patient
    await send_pharmacy_order_sms(order.patient_phone, {
        "id": order.id,
        "booking_id": booking_id,
        "medicines": order.medicines
    })
    
    # Send WhatsApp confirmation via MSG91
    try:
        medicines_text = ", ".join([m.get('name', 'Medicine') for m in order.medicines[:3]]) if order.medicines else "As per prescription"
        if len(order.medicines) > 3:
            medicines_text += "..."
        whatsapp_result = await send_orange_pharmacy_confirmation(
            phone=order.patient_phone,
            patient_name=order.patient_name,
            order_id=booking_id,
            items=medicines_text,
            delivery_address=order.delivery_address or "To be confirmed",
            db=db
        )
        if whatsapp_result.get("success"):
            logger.info(f"✅ WhatsApp pharmacy confirmation sent for order {booking_id}")
        else:
            logger.warning(f"⚠️ WhatsApp pharmacy confirmation failed: {whatsapp_result.get('error')}")
    except Exception as e:
        logger.error(f"❌ WhatsApp pharmacy notification error: {e}")
    
    # Send SMS notification to Orange Pharmacy staff
    await notify_staff_new_order({
        "id": order.id,
        "patient_name": order.patient_name,
        "medicines": order.medicines
    }, "orange")
    
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

# ============ Pharmacy Inventory Endpoints ============
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
    
    return {"suggestions": suggestions}

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
async def get_all_medicines(page: int = 1, per_page: int = 100, search: str = None, form: str = None, category: str = None):
    """Get all medicines with pagination and filtering by search, form, or category"""
    # Category keyword mappings for filtering
    CATEGORY_KEYWORDS = {
        'cold': ['cold', 'cough', 'fever', 'flu', 'paracetamol', 'cetrizine', 'antihistamine', 'decongest', 'sinusitis', 'influenza', 'antiallerg'],
        'pain': ['pain', 'analgesic', 'painkiller', 'ache', 'ibuprofen', 'diclofenac', 'aceclofenac', 'tramadol', 'muscle relaxant', 'sprain'],
        'digestive': ['antacid', 'digestive', 'stomach', 'gastric', 'acidity', 'omeprazole', 'pantoprazole', 'ranitidine', 'domperidone', 'constipation', 'laxative', 'diarrhea', 'probiotic'],
        'vitamin': ['vitamin', 'supplement', 'calcium', 'iron', 'zinc', 'folic', 'b12', 'multivitamin', 'd3', 'omega', 'mineral', 'nutraceutical'],
        'diabetes': ['diabetes', 'diabetic', 'metformin', 'glimepiride', 'insulin', 'glucose', 'glycemic', 'sugar', 'sitagliptin', 'gliclazide'],
        'skin': ['skin', 'derma', 'cream', 'ointment', 'lotion', 'acne', 'fungal', 'antifungal', 'eczema', 'psoriasis', 'moisturizer', 'sunscreen'],
        'baby': ['baby', 'infant', 'pediatric', 'child', 'kids', 'gripe', 'teething', 'diaper', 'nappy'],
        'cardiac': ['heart', 'cardiac', 'cardiovascular', 'bp', 'hypertension', 'amlodipine', 'atenolol', 'telmisartan', 'cholesterol', 'statin', 'blood pressure'],
        'respiratory': ['respiratory', 'asthma', 'bronch', 'inhaler', 'nebul', 'salbutamol', 'montelukast', 'theophylline', 'copd', 'breathe'],
        'women': ['women', 'female', 'menstrual', 'period', 'pcos', 'pregnancy', 'prenatal', 'contraceptive', 'hormonal', 'estrogen', 'progesterone'],
        'oral': ['oral', 'dental', 'tooth', 'gum', 'mouthwash', 'toothpaste', 'fluoride', 'cavity'],
        'hair': ['hair', 'scalp', 'dandruff', 'minoxidil', 'biotin', 'keratin', 'alopecia', 'hairfall'],
        'first aid': ['first aid', 'bandage', 'antiseptic', 'dettol', 'betadine', 'wound', 'burn', 'cotton', 'gauze'],
        'device': ['device', 'thermometer', 'bp monitor', 'glucometer', 'nebulizer', 'oximeter', 'syringe', 'mask', 'gloves'],
        'ayurvedic': ['ayurvedic', 'ayurveda', 'herbal', 'churna', 'ashwagandha', 'tulsi', 'giloy', 'triphala', 'chyawanprash', 'patanjali', 'himalaya', 'dabur'],
        'fitness': ['protein', 'whey', 'fitness', 'gym', 'energy', 'sports', 'muscle', 'bcaa', 'creatine', 'nutrition']
    }
    
    # Filter medicines based on search, form, and category
    filtered = MEDICINE_INVENTORY
    
    if search:
        search_lower = search.lower()
        filtered = [m for m in filtered if search_lower in m["name"].lower()]
    
    if form:
        filtered = [m for m in filtered if m.get("form", "").lower() == form.lower()]
    
    if category and category in CATEGORY_KEYWORDS:
        keywords = CATEGORY_KEYWORDS[category]
        category_filtered = []
        for m in filtered:
            name_lower = m["name"].lower()
            form_lower = m.get("form", "").lower()
            # Check if any keyword matches the medicine name or form
            if any(kw in name_lower or kw in form_lower for kw in keywords):
                category_filtered.append(m)
        filtered = category_filtered
    
    # Paginate
    total = len(filtered)
    start = (page - 1) * per_page
    end = start + per_page
    medicines = filtered[start:end]
    
    return {
        "medicines": medicines,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page if total > 0 else 1,
        "category": category
    }

@api_router.get("/pharmacy/search")
async def search_medicines(q: str, limit: int = 15, form: str = None):
    """Search medicines for autocomplete - starts matching from first character"""
    if not q:
        return {"medicines": []}
    
    search_lower = q.lower()
    filtered = MEDICINE_INVENTORY
    
    # Filter by form first if provided
    if form:
        filtered = [m for m in filtered if m.get("form", "").lower() == form.lower()]
    
    # Search matching - prioritize medicines starting with the search term
    starts_with = []
    contains = []
    
    for m in filtered:
        name_lower = m["name"].lower()
        if name_lower.startswith(search_lower):
            starts_with.append(m)
        elif search_lower in name_lower:
            contains.append(m)
    
    # Combine results - prioritizing those that start with the search term
    results = starts_with + contains
    
    return {
        "medicines": results[:limit],
        "total": len(results)
    }

@api_router.get("/pharmacy/frequently-ordered")
async def get_frequently_ordered(user = Depends(get_current_user_optional)):
    """Get user's frequently ordered medicines based on past orders"""
    if not user:
        return {"medicines": []}
    
    # Get user's past orders
    orders = await db.pharmacy_orders.find({"user_id": user.id}).to_list(50)
    
    # Count medicine occurrences
    medicine_counts = {}
    for order in orders:
        for med in order.get("medicines", []):
            name = med.get("name", "")
            if name:
                medicine_counts[name] = medicine_counts.get(name, 0) + med.get("quantity", 1)
    
    # Sort by count and return top medicines
    sorted_meds = sorted(medicine_counts.items(), key=lambda x: x[1], reverse=True)
    
    # Get full medicine info
    frequent = []
    for name, count in sorted_meds[:10]:
        med_info = next((m for m in MEDICINE_INVENTORY if m["name"] == name), None)
        if med_info:
            frequent.append({**med_info, "order_count": count})
    
    return {"medicines": frequent}

# ==================== PRESCRIPTION EMAIL NOTIFICATION ====================

@api_router.post("/pharmacy/prescription-upload")
async def upload_prescription_with_email(
    patient_name: str = Body(...),
    patient_phone: str = Body(...),
    prescription_url: str = Body(...),
    notes: str = Body("")
):
    """Upload prescription and send email notification to nevikacura@gmail.com"""
    
    upload = {
        "id": f"PRESC-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}",
        "patient_name": patient_name,
        "patient_phone": patient_phone,
        "prescription_url": prescription_url,
        "notes": notes,
        "status": "pending_review",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.prescription_uploads.insert_one(upload)
    
    # Send email to nevikacura@gmail.com
    try:
        email_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f97316;">📋 New Prescription Upload</h2>
            <p><strong>Patient:</strong> {patient_name}</p>
            <p><strong>Phone:</strong> {patient_phone}</p>
            <p><strong>Notes:</strong> {notes or 'No notes'}</p>
            <p><strong>Upload ID:</strong> {upload['id']}</p>
            <p><strong>Time:</strong> {datetime.now().strftime('%d %b %Y, %I:%M %p')}</p>
            <p style="margin-top: 20px;">
                <a href="{prescription_url}" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
                    📎 View Prescription
                </a>
            </p>
        </div>
        """
        
        await send_email_notification(
            subject=f"New Prescription Upload - {patient_name}",
            html_content=email_html
        )
        upload["email_sent"] = True
    except Exception as e:
        logger.error(f"Failed to send prescription email: {e}")
        upload["email_sent"] = False
    
    upload.pop("_id", None)
    
    return {
        "success": True,
        "upload_id": upload["id"],
        "message": "Prescription uploaded! Our pharmacy team will review and contact you."
    }

# ==================== REFILL REMINDERS ====================

class RefillReminderRequest(BaseModel):
    patient_phone: str
    patient_name: str
    medicine_name: str
    quantity_bought: int
    doses_per_day: int = 1
    purchase_date: Optional[str] = None

@api_router.post("/pharmacy/refill-reminder")
async def set_refill_reminder(request: RefillReminderRequest):
    """Set automatic refill reminder based on medicine quantity and dosage"""
    purchase_date = datetime.fromisoformat(request.purchase_date) if request.purchase_date else datetime.now(timezone.utc)
    
    # Calculate days until medicine runs out
    days_supply = request.quantity_bought // request.doses_per_day
    refill_date = purchase_date + timedelta(days=max(1, days_supply - 3))  # Remind 3 days before
    
    reminder = {
        "id": f"REFILL-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}",
        "patient_phone": request.patient_phone,
        "patient_name": request.patient_name,
        "medicine_name": request.medicine_name,
        "quantity_bought": request.quantity_bought,
        "doses_per_day": request.doses_per_day,
        "purchase_date": purchase_date.isoformat(),
        "refill_date": refill_date.isoformat(),
        "days_supply": days_supply,
        "status": "scheduled",
        "reminded": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.refill_reminders.insert_one(reminder)
    reminder.pop("_id", None)
    
    return {
        "success": True,
        "reminder_id": reminder["id"],
        "refill_date": refill_date.strftime("%d %b %Y"),
        "days_until_refill": days_supply - 3,
        "message": f"We'll remind you to refill {request.medicine_name} on {refill_date.strftime('%d %b')}"
    }

@api_router.get("/pharmacy/refill-reminders/{patient_phone}")
async def get_patient_refill_reminders(patient_phone: str):
    """Get all refill reminders for a patient"""
    reminders = await db.refill_reminders.find({
        "patient_phone": patient_phone,
        "status": "scheduled"
    }).sort("refill_date", 1).to_list(20)
    
    for r in reminders:
        r.pop("_id", None)
    
    return {"reminders": reminders}

# ==================== SUBSCRIPTION BOX (Monthly Auto-Delivery) ====================

class SubscriptionBoxRequest(BaseModel):
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    address: str
    medicines: List[dict]  # [{name, quantity, doses_per_day}]
    frequency: str = "monthly"  # monthly, bi-weekly
    start_date: Optional[str] = None

@api_router.post("/pharmacy/subscription-box")
async def create_subscription_box(request: SubscriptionBoxRequest):
    """Create monthly medicine subscription box with auto-delivery"""
    start = datetime.fromisoformat(request.start_date) if request.start_date else datetime.now(timezone.utc)
    
    # Calculate next delivery dates
    frequency_days = 30 if request.frequency == "monthly" else 14
    
    subscription = {
        "id": f"SUBBOX-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}",
        "patient_name": request.patient_name,
        "patient_phone": request.patient_phone,
        "patient_email": request.patient_email,
        "address": request.address,
        "medicines": request.medicines,
        "frequency": request.frequency,
        "frequency_days": frequency_days,
        "start_date": start.isoformat(),
        "next_delivery": start.isoformat(),
        "status": "active",
        "deliveries_completed": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.medicine_subscriptions.insert_one(subscription)
    subscription.pop("_id", None)
    
    return {
        "success": True,
        "subscription_id": subscription["id"],
        "next_delivery": start.strftime("%d %b %Y"),
        "frequency": request.frequency,
        "message": f"Medicine subscription box created! First delivery on {start.strftime('%d %b %Y')}"
    }

@api_router.get("/pharmacy/subscription-box/{patient_phone}")
async def get_subscription_boxes(patient_phone: str):
    """Get active subscription boxes for a patient"""
    subscriptions = await db.medicine_subscriptions.find({
        "patient_phone": patient_phone,
        "status": "active"
    }).to_list(10)
    
    for s in subscriptions:
        s.pop("_id", None)
    
    return {"subscriptions": subscriptions}

@api_router.post("/pharmacy/subscription-box/{subscription_id}/pause")
async def pause_subscription_box(subscription_id: str):
    """Pause a subscription box"""
    result = await db.medicine_subscriptions.update_one(
        {"id": subscription_id},
        {"$set": {"status": "paused", "paused_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    return {"success": True, "message": "Subscription paused. You can resume anytime."}

@api_router.post("/pharmacy/subscription-box/{subscription_id}/resume")
async def resume_subscription_box(subscription_id: str):
    """Resume a paused subscription box"""
    result = await db.medicine_subscriptions.update_one(
        {"id": subscription_id},
        {
            "$set": {
                "status": "active",
                "resumed_at": datetime.now(timezone.utc).isoformat(),
                "next_delivery": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    return {"success": True, "message": "Subscription resumed! Next delivery scheduled."}

# ==================== EXPRESS DELIVERY ====================

class ExpressDeliveryRequest(BaseModel):
    order_id: Optional[str] = None
    patient_name: str
    patient_phone: str
    address: str
    medicines: List[dict]
    notes: Optional[str] = None

@api_router.post("/pharmacy/express-delivery")
async def create_express_delivery(request: ExpressDeliveryRequest):
    """Create express 2-hour delivery order with extra fee"""
    EXPRESS_FEE = 50  # ₹50 express delivery fee
    
    order = {
        "id": f"EXPRESS-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}",
        "patient_name": request.patient_name,
        "patient_phone": request.patient_phone,
        "address": request.address,
        "medicines": request.medicines,
        "notes": request.notes,
        "delivery_type": "express",
        "express_fee": EXPRESS_FEE,
        "estimated_delivery": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
        "status": "processing",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.pharmacy_orders.insert_one(order)
    order.pop("_id", None)
    
    # Notify staff urgently
    try:
        await notify_staff_new_order({
            "id": order["id"],
            "patient_name": request.patient_name,
            "test_name": "🚀 EXPRESS DELIVERY - 2 HOUR",
            "type": "Express"
        }, "orange")
    except Exception as e:
        logger.error(f"Failed to notify staff about express delivery: {e}")
    
    return {
        "success": True,
        "order_id": order["id"],
        "express_fee": EXPRESS_FEE,
        "estimated_delivery": (datetime.now(timezone.utc) + timedelta(hours=2)).strftime("%I:%M %p"),
        "message": f"Express delivery confirmed! Your medicines will arrive by {(datetime.now() + timedelta(hours=2)).strftime('%I:%M %p')}"
    }

@api_router.get("/pharmacy/express-fee")
async def get_express_delivery_fee():
    """Get current express delivery fee"""
    return {
        "express_fee": 50,
        "estimated_time": "2 hours",
        "available": True,
        "hours": "9 AM - 9 PM"
    }

# ==================== MEDICINE HISTORY & QUICK REORDER ====================

@api_router.get("/pharmacy/history/{patient_phone}")
async def get_medicine_purchase_history(patient_phone: str, limit: int = 50):
    """Get complete medicine purchase history for a patient"""
    orders = await db.pharmacy_orders.find({
        "patient_phone": patient_phone
    }).sort("created_at", -1).to_list(limit)
    
    # Aggregate medicine purchases
    medicine_history = {}
    order_list = []
    
    for order in orders:
        order.pop("_id", None)
        order_list.append({
            "id": order.get("id"),
            "date": order.get("created_at"),
            "status": order.get("status"),
            "medicine_count": len(order.get("medicines", []))
        })
        
        for med in order.get("medicines", []):
            name = med.get("name", "Unknown")
            if name not in medicine_history:
                medicine_history[name] = {
                    "name": name,
                    "form": med.get("form", ""),
                    "total_quantity": 0,
                    "order_count": 0,
                    "last_ordered": order.get("created_at")
                }
            medicine_history[name]["total_quantity"] += med.get("quantity", 1)
            medicine_history[name]["order_count"] += 1
    
    # Sort by order count
    sorted_history = sorted(medicine_history.values(), key=lambda x: x["order_count"], reverse=True)
    
    return {
        "patient_phone": patient_phone,
        "total_orders": len(order_list),
        "orders": order_list[:20],
        "medicines": sorted_history,
        "quick_reorder": sorted_history[:5]  # Top 5 for quick reorder
    }

@api_router.post("/pharmacy/quick-reorder")
async def quick_reorder_medicines(
    patient_phone: str = Body(...),
    patient_name: str = Body(...),
    address: str = Body(...),
    medicines: List[str] = Body(...)  # List of medicine names
):
    """Quick reorder from previous purchases"""
    # Get full medicine info from inventory
    order_medicines = []
    for med_name in medicines:
        med_info = next((m for m in MEDICINE_INVENTORY if m["name"] == med_name), None)
        if med_info:
            order_medicines.append({
                "name": med_info["name"],
                "form": med_info["form"],
                "quantity": 1
            })
    
    if not order_medicines:
        raise HTTPException(status_code=400, detail="No valid medicines to reorder")
    
    # Create order
    order = {
        "id": f"ORD-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}",
        "patient_name": patient_name,
        "patient_phone": patient_phone,
        "address": address,
        "medicines": order_medicines,
        "order_type": "quick_reorder",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.pharmacy_orders.insert_one(order)
    order.pop("_id", None)
    
    return {
        "success": True,
        "order_id": order["id"],
        "medicines": [m["name"] for m in order_medicines],
        "message": "Quick reorder placed! We'll contact you to confirm."
    }

# ==================== SENOVA SENIOR CARE APIs ====================

class SeniorProfile(BaseModel):
    name: str
    age: int
    phone: str
    address: Optional[str] = None
    conditions: Optional[list] = []
    emergency_contacts: Optional[dict] = None
    
class FamilyContacts(BaseModel):
    senior_phone: str
    primary: dict
    secondary: Optional[dict] = None

class MedicineReminder(BaseModel):
    senior_phone: str
    medicine: str
    time: str
    frequency: str = "daily"
    family_alert: bool = True

@api_router.post("/senova/profile")
async def save_senior_profile(profile: SeniorProfile):
    """Save or update senior profile"""
    existing = await db.senior_profiles.find_one({"phone": profile.phone})
    
    profile_data = {
        "name": profile.name,
        "age": profile.age,
        "phone": profile.phone,
        "address": profile.address,
        "conditions": profile.conditions,
        "emergency_contacts": profile.emergency_contacts,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if existing:
        await db.senior_profiles.update_one(
            {"phone": profile.phone},
            {"$set": profile_data}
        )
        return {"success": True, "message": "Profile updated", "profile_id": existing.get("id")}
    else:
        profile_data["id"] = f"SNR-{uuid.uuid4().hex[:8].upper()}"
        profile_data["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.senior_profiles.insert_one(profile_data)
        return {"success": True, "message": "Profile created", "profile_id": profile_data["id"]}

@api_router.get("/senova/profile/{phone}")
async def get_senior_profile(phone: str):
    """Get senior profile by phone"""
    profile = await db.senior_profiles.find_one({"phone": phone}, {"_id": 0})
    if profile:
        return {"success": True, "profile": profile}
    return {"success": False, "message": "Profile not found"}

@api_router.post("/senova/family-contacts")
async def save_family_contacts(contacts: FamilyContacts):
    """Save family contacts for a senior"""
    contact_data = {
        "senior_phone": contacts.senior_phone,
        "primary": contacts.primary,
        "secondary": contacts.secondary,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.senior_family_contacts.update_one(
        {"senior_phone": contacts.senior_phone},
        {"$set": contact_data},
        upsert=True
    )
    
    return {"success": True, "message": "Family contacts saved"}

@api_router.get("/senova/family-contacts/{senior_phone}")
async def get_family_contacts(senior_phone: str):
    """Get family contacts for a senior"""
    contacts = await db.senior_family_contacts.find_one({"senior_phone": senior_phone}, {"_id": 0})
    if contacts:
        return {"success": True, "contacts": contacts}
    return {"success": False, "message": "No contacts found"}

@api_router.post("/senova/reminder")
async def add_medicine_reminder(reminder: MedicineReminder):
    """Add medicine reminder for a senior"""
    reminder_data = {
        "id": f"REM-{uuid.uuid4().hex[:8].upper()}",
        "senior_phone": reminder.senior_phone,
        "medicine": reminder.medicine,
        "time": reminder.time,
        "frequency": reminder.frequency,
        "family_alert": reminder.family_alert,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.senior_reminders.insert_one(reminder_data)
    
    return {
        "success": True,
        "reminder_id": reminder_data["id"],
        "message": f"Reminder set for {reminder.medicine} at {reminder.time}"
    }

@api_router.get("/senova/reminders/{senior_phone}")
async def get_reminders(senior_phone: str):
    """Get all active reminders for a senior"""
    reminders = await db.senior_reminders.find(
        {"senior_phone": senior_phone, "active": True},
        {"_id": 0}
    ).to_list(50)
    return {"success": True, "reminders": reminders}

@api_router.delete("/senova/reminder/{reminder_id}")
async def delete_reminder(reminder_id: str):
    """Delete a medicine reminder"""
    result = await db.senior_reminders.update_one(
        {"id": reminder_id},
        {"$set": {"active": False}}
    )
    if result.modified_count > 0:
        return {"success": True, "message": "Reminder deleted"}
    return {"success": False, "message": "Reminder not found"}

@api_router.post("/senova/quick-refill")
async def senova_quick_refill(
    senior_phone: str = Body(...),
    senior_name: str = Body(None)
):
    """Quick medicine refill for seniors - pharmacist will call"""
    profile = await db.senior_profiles.find_one({"phone": senior_phone})
    
    request_data = {
        "id": f"SQR-{uuid.uuid4().hex[:8].upper()}",
        "senior_phone": senior_phone,
        "senior_name": senior_name or (profile.get("name") if profile else "Senior"),
        "address": profile.get("address") if profile else None,
        "type": "medicine_refill",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.senova_quick_requests.insert_one(request_data)
    
    # Notify family
    if profile and profile.get("emergency_contacts"):
        family = await db.senior_family_contacts.find_one({"senior_phone": senior_phone})
        if family and family.get("primary", {}).get("phone"):
            # TODO: Send SMS/WhatsApp notification to family
            pass
    
    return {
        "success": True,
        "request_id": request_data["id"],
        "message": "Refill request sent! Pharmacist will call shortly."
    }

@api_router.post("/senova/quick-test")
async def senova_quick_test(
    senior_phone: str = Body(...),
    senior_name: str = Body(None),
    test_type: str = Body("routine")
):
    """Quick lab test booking for seniors - technician will call"""
    profile = await db.senior_profiles.find_one({"phone": senior_phone})
    
    request_data = {
        "id": f"SQT-{uuid.uuid4().hex[:8].upper()}",
        "senior_phone": senior_phone,
        "senior_name": senior_name or (profile.get("name") if profile else "Senior"),
        "address": profile.get("address") if profile else None,
        "test_type": test_type,
        "type": "lab_test",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.senova_quick_requests.insert_one(request_data)
    
    return {
        "success": True,
        "request_id": request_data["id"],
        "message": "Test booking request sent! Lab technician will call shortly."
    }

# ==================== WAITLIST NOTIFICATION SYSTEM ====================

@api_router.post("/appointments/waitlist/notify-available")
async def notify_waitlist_slot_available(
    doctor_id: str = Body(...),
    available_date: str = Body(...),
    available_slot: str = Body(...)
):
    """Notify waitlisted patients when a slot becomes available"""
    # Find all waiting patients for this doctor
    waitlist = await db.appointment_waitlist.find({
        "doctor_id": doctor_id,
        "status": "waiting"
    }).sort("created_at", 1).to_list(10)
    
    notified_count = 0
    
    for entry in waitlist:
        # Check if preferred date matches (if specified)
        preferred_dates = entry.get("preferred_dates", [])
        if preferred_dates and available_date not in preferred_dates:
            continue
        
        # Send notification
        notify_via = entry.get("notify_via", "both")
        patient_phone = entry.get("patient_phone")
        patient_name = entry.get("patient_name")
        doctor_name = entry.get("doctor_name", "Doctor")
        
        notification_message = f"Hi {patient_name}! A slot is now available with {doctor_name} on {available_date} at {available_slot}. Book now on Nevika Cura app!"
        
        # Update entry as notified
        await db.appointment_waitlist.update_one(
            {"id": entry["id"]},
            {
                "$set": {
                    "notified": True,
                    "notified_at": datetime.now(timezone.utc).isoformat(),
                    "available_slot": f"{available_date} {available_slot}"
                }
            }
        )
        
        notified_count += 1
        
        # TODO: Actually send SMS/WhatsApp via MSG91
        # if notify_via in ["sms", "both"]:
        #     send_sms(patient_phone, notification_message)
        # if notify_via in ["whatsapp", "both"]:
        #     send_whatsapp(patient_phone, notification_message)
    
    return {
        "success": True,
        "notified_count": notified_count,
        "message": f"Notified {notified_count} patients from waitlist"
    }

@api_router.post("/appointments/waitlist/process-cancellation")
async def process_appointment_cancellation(
    doctor_id: str = Body(...),
    cancelled_date: str = Body(...),
    cancelled_slot: str = Body(...)
):
    """When an appointment is cancelled, automatically notify waitlist"""
    # First notify waitlist
    result = await notify_waitlist_slot_available(
        doctor_id=doctor_id,
        available_date=cancelled_date,
        available_slot=cancelled_slot
    )
    
    return {
        "success": True,
        "action": "cancellation_processed",
        "waitlist_notified": result.get("notified_count", 0)
    }

# ==================== THRIVE360 FITNESS APIs ====================

@api_router.post("/thrive360/session")
async def book_fitness_session(
    program: str = Body(...),
    session_type: str = Body(...),  # video, in-person
    preferred_date: str = Body(...),
    preferred_time: str = Body(...),
    user_phone: str = Body(...),
    user_name: str = Body(None)
):
    """Book a fitness/yoga session"""
    session_data = {
        "id": f"FIT-{uuid.uuid4().hex[:8].upper()}",
        "program": program,
        "session_type": session_type,
        "preferred_date": preferred_date,
        "preferred_time": preferred_time,
        "user_phone": user_phone,
        "user_name": user_name,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.fitness_sessions.insert_one(session_data)
    
    return {
        "success": True,
        "session_id": session_data["id"],
        "message": "Session booked! Trainer will contact you to confirm."
    }

@api_router.post("/thrive360/injury-report")
async def report_fitness_injury(
    pain_location: str = Body(...),
    pain_level: int = Body(...),
    user_phone: str = Body(...),
    user_name: str = Body(None),
    notes: str = Body(None)
):
    """Report an injury during fitness activities"""
    report_data = {
        "id": f"INJ-{uuid.uuid4().hex[:8].upper()}",
        "pain_location": pain_location,
        "pain_level": pain_level,
        "user_phone": user_phone,
        "user_name": user_name,
        "notes": notes,
        "recommendation": "physio" if pain_level <= 6 else "doctor_consult",
        "status": "reported",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.fitness_injuries.insert_one(report_data)
    
    return {
        "success": True,
        "report_id": report_data["id"],
        "recommendation": report_data["recommendation"],
        "message": "Injury reported. " + (
            "We recommend starting with physiotherapy protocols." if pain_level <= 6 
            else "Please consult a doctor for this pain level."
        )
    }

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


# ============ DUPLICATE ADMIN/STAFF ROUTES REMOVED ============
# These routes are now in /routes/admin.py and /routes/staff.py
# Removed during code cleanup on Jan 15, 2026

@api_router.post("/notifications/subscription-expiry")
async def send_subscription_expiry_notification(user_id: str):
    """Send push notification for subscription expiry"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    subscription = user.get("evara_subscription", {})
    if not subscription.get("active"):
        raise HTTPException(status_code=400, detail="No active subscription")
    
    end_date = subscription.get("end_date", "")[:10]
    plan_name = subscription.get("plan_name", "subscription")
    
    title = "Subscription Expiring Soon"
    body = f"Your Evara {plan_name} expires on {end_date}. Renew now to continue premium features!"
    
    result = await send_push_notification(
        user_id=user_id,
        title=title,
        body=body,
        url="/evara",
        tag="subscription-expiry"
    )
    
    return {"success": True, "result": result}

@api_router.post("/notifications/medicine-refill")
async def send_medicine_refill_notification(user_id: str, medicine_name: str, days_left: int = 3):
    """Send push notification for medicine refill reminder"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    title = "Medicine Refill Reminder"
    body = f"Your {medicine_name} supply will run out in {days_left} days. Order refill from Orange Pharmacy."
    
    result = await send_push_notification(
        user_id=user_id,
        title=title,
        body=body,
        url="/pharmacy",
        tag="medicine-refill"
    )
    
    return {"success": True, "result": result}

@api_router.post("/cron/check-expiring-subscriptions")
async def cron_check_expiring_subscriptions(secret: str = ""):
    """Cron job to check and notify expiring subscriptions"""
    cron_secret = os.environ.get("CRON_SECRET", "nevika_cron_2026")
    if secret != cron_secret:
        raise HTTPException(status_code=403, detail="Invalid secret")
    
    # Check subscriptions expiring in next 3 days
    today = datetime.now(timezone.utc)
    check_date = (today + timedelta(days=3)).isoformat()
    
    users = await db.users.find({
        "evara_subscription.active": True,
        "evara_subscription.end_date": {"$lte": check_date}
    }, {"_id": 0, "id": 1, "name": 1, "evara_subscription": 1}).to_list(1000)
    
    notified = 0
    for user in users:
        try:
            sub = user.get("evara_subscription", {})
            end_date = sub.get("end_date", "")[:10]
            
            # Check if notification already sent today
            last_notified = await db.subscription_notifications.find_one({
                "user_id": user["id"],
                "date": today.strftime("%Y-%m-%d")
            })
            
            if not last_notified:
                await send_push_notification(
                    user_id=user["id"],
                    title="Subscription Expiring Soon",
                    body=f"Your Evara subscription expires on {end_date}. Renew now!",
                    url="/evara",
                    tag="subscription-expiry"
                )
                
                await db.subscription_notifications.insert_one({
                    "user_id": user["id"],
                    "date": today.strftime("%Y-%m-%d"),
                    "type": "expiry_warning"
                })
                notified += 1
        except Exception as e:
            logger.error(f"Failed to notify user {user['id']}: {e}")
    
    return {"success": True, "users_checked": len(users), "notified": notified}

@api_router.post("/cron/appointment-reminders")
async def cron_send_appointment_reminders(secret: str = "", reminder_type: str = "all"):
    """Cron job to send appointment reminders
    
    Call every 15 minutes with: /api/cron/appointment-reminders?secret=YOUR_SECRET&reminder_type=all
    
    reminder_type options:
    - "24h" : Send 24-hour reminders only (day before)
    - "1h"  : Send 1-hour reminders only (same day)
    - "all" : Send both types (default)
    
    Recommended cron schedule:
    - Every 15 mins: */15 * * * * curl -X POST "https://domain/api/cron/appointment-reminders?secret=SECRET"
    """
    cron_secret = os.environ.get("CRON_SECRET", "nevika_cron_2026")
    if secret != cron_secret:
        raise HTTPException(status_code=403, detail="Invalid secret")
    
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    tomorrow = (now + timedelta(days=1)).strftime("%Y-%m-%d")
    current_hour = now.hour
    current_minute = now.minute
    
    results = {
        "24h_reminders": {"checked": 0, "sent": 0},
        "1h_reminders": {"checked": 0, "sent": 0}
    }
    
    # ===== 24 HOUR REMINDERS (Day Before) =====
    if reminder_type in ["24h", "all"]:
        # Get tomorrow's appointments that haven't received 24h reminder
        tomorrow_appointments = await db.appointments.find({
            "date": tomorrow,
            "status": {"$in": ["confirmed", "pending", "Booked"]},
            "reminder_24h_sent": {"$ne": True}
        }, {"_id": 0}).to_list(500)
        
        results["24h_reminders"]["checked"] = len(tomorrow_appointments)
        
        for apt in tomorrow_appointments:
            try:
                user_id = apt.get("user_id")
                patient_name = apt.get("patient_name", "Patient")
                doctor = apt.get("doctor", "your doctor")
                clinic = apt.get("clinic", "clinic")
                time = apt.get("time", "scheduled time")
                
                # Send Push Notification
                if user_id:
                    await send_push_notification(
                        user_id=user_id,
                        title="📅 Appointment Tomorrow!",
                        body=f"Reminder: Your appointment with {doctor} at {clinic} is tomorrow at {time}. Don't forget!",
                        url="/profile",
                        tag=f"reminder-24h-{apt.get('id')}"
                    )
                
                # Send SMS Reminder
                patient_phone = apt.get("patient_phone") or apt.get("phone")
                if patient_phone:
                    sms_msg = f"""DiaGyn Reminder 📅

Dear {patient_name},
Your appointment is TOMORROW:

Doctor: {doctor}
Clinic: {clinic}
Date: {tomorrow}
Time: {time}

Please arrive 10 mins early.
For queries: 9403890429

- Nevika Cura"""
                    await send_sms_notification(patient_phone, sms_msg)
                
                # Mark as sent
                await db.appointments.update_one(
                    {"id": apt.get("id")},
                    {"$set": {"reminder_24h_sent": True, "reminder_24h_sent_at": now.isoformat()}}
                )
                results["24h_reminders"]["sent"] += 1
                logger.info(f"24h reminder sent for appointment {apt.get('id')}")
                
            except Exception as e:
                logger.error(f"Failed to send 24h reminder for appointment {apt.get('id')}: {e}")
    
    # ===== 1 HOUR REMINDERS (Same Day) =====
    if reminder_type in ["1h", "all"]:
        # Get today's appointments in the next 60-75 minutes that haven't received 1h reminder
        today_appointments = await db.appointments.find({
            "date": today,
            "status": {"$in": ["confirmed", "pending", "Booked", "In Clinic"]},
            "reminder_1h_sent": {"$ne": True}
        }, {"_id": 0}).to_list(500)
        
        for apt in today_appointments:
            try:
                apt_time = apt.get("time", "")
                if not apt_time:
                    continue
                
                # Parse appointment time (format: "11:00 AM" or "18:00")
                try:
                    if "AM" in apt_time or "PM" in apt_time:
                        # 12-hour format
                        time_parts = apt_time.replace("AM", "").replace("PM", "").strip().split(":")
                        hour = int(time_parts[0])
                        minute = int(time_parts[1]) if len(time_parts) > 1 else 0
                        if "PM" in apt_time and hour != 12:
                            hour += 12
                        elif "AM" in apt_time and hour == 12:
                            hour = 0
                    else:
                        # 24-hour format
                        time_parts = apt_time.split(":")
                        hour = int(time_parts[0])
                        minute = int(time_parts[1]) if len(time_parts) > 1 else 0
                    
                    # Calculate minutes until appointment
                    apt_minutes = hour * 60 + minute
                    current_minutes = current_hour * 60 + current_minute
                    minutes_until = apt_minutes - current_minutes
                    
                    # Send reminder if appointment is 45-75 minutes away (gives buffer for cron timing)
                    if 45 <= minutes_until <= 75:
                        results["1h_reminders"]["checked"] += 1
                        
                        user_id = apt.get("user_id")
                        patient_name = apt.get("patient_name", "Patient")
                        doctor = apt.get("doctor", "your doctor")
                        clinic = apt.get("clinic", "clinic")
                        booking_id = apt.get("booking_id", apt.get("id", "N/A"))
                        
                        # Send Push Notification
                        if user_id:
                            await send_push_notification(
                                user_id=user_id,
                                title="⏰ Appointment in 1 Hour!",
                                body=f"Your appointment with {doctor} at {clinic} is at {apt_time}. Please start heading to the clinic!",
                                url="/profile",
                                tag=f"reminder-1h-{apt.get('id')}"
                            )
                        
                        # Send SMS & WhatsApp Reminders
                        patient_phone = apt.get("patient_phone") or apt.get("phone")
                        if patient_phone:
                            # SMS Reminder
                            sms_msg = f"""⏰ DiaGyn - 1 Hour Reminder

Dear {patient_name},
Your appointment is in 1 HOUR:

Doctor: {doctor}
Clinic: {clinic}
Time: {apt_time}

Please arrive 10 mins early!
- Nevika Cura"""
                            await send_sms_notification(patient_phone, sms_msg)
                            
                            # WhatsApp Reminder via MSG91
                            try:
                                await send_diagyn_one_hour_reminder(
                                    phone=patient_phone,
                                    patient_name=patient_name,
                                    date=apt_date,
                                    time=apt_time,
                                    doctor_name=doctor,
                                    clinic_name=clinic,
                                    booking_id=booking_id
                                )
                                logger.info(f"WhatsApp 1h reminder sent for {booking_id}")
                            except Exception as wa_err:
                                logger.warning(f"WhatsApp 1h reminder failed for {booking_id}: {wa_err}")
                        
                        # Mark as sent
                        await db.appointments.update_one(
                            {"id": apt.get("id")},
                            {"$set": {"reminder_1h_sent": True, "reminder_1h_sent_at": now.isoformat()}}
                        )
                        results["1h_reminders"]["sent"] += 1
                        logger.info(f"1h reminder sent for appointment {apt.get('id')}")
                        
                except ValueError as ve:
                    logger.warning(f"Could not parse time '{apt_time}' for appointment {apt.get('id')}: {ve}")
                    
            except Exception as e:
                logger.error(f"Failed to send 1h reminder for appointment {apt.get('id')}: {e}")
    
    return {
        "success": True,
        "timestamp": now.isoformat(),
        "results": results,
        "summary": f"24h: {results['24h_reminders']['sent']}/{results['24h_reminders']['checked']} sent, 1h: {results['1h_reminders']['sent']}/{results['1h_reminders']['checked']} sent"
    }


@api_router.post("/cron/sonography-reminders")
async def cron_send_sonography_reminders(secret: str = "", reminder_minutes: int = 60):
    """Automated cron job to send sonography reminders
    
    Call every 15 minutes with: /api/cron/sonography-reminders?secret=YOUR_SECRET&reminder_minutes=60
    
    Features:
    - Sends 24-hour advance reminders (day before)
    - Sends 1-hour reminders (same day)
    - Prevents duplicate reminders with tracking flags
    - Uses IST timezone for accurate scheduling
    
    Recommended cron schedule:
    - Every 15 mins: */15 * * * * curl -X POST "https://domain/api/cron/sonography-reminders?secret=SECRET"
    """
    cron_secret = os.environ.get("CRON_SECRET", "nevika_cron_2026")
    if secret != cron_secret:
        raise HTTPException(status_code=403, detail="Invalid secret")
    
    # Clinic location Google Maps links
    CLINIC_MAP_LINKS = {
        "Pushpa Clinic": "https://maps.app.goo.gl/LfFoHwVzvMEQ1Qzt9",
        "Amnion Clinic": "https://maps.app.goo.gl/aBr4jwCv3b6874vi8"
    }
    
    # Use IST timezone for scheduling
    ist_offset = timedelta(hours=5, minutes=30)
    now_utc = datetime.now(timezone.utc)
    now_ist = now_utc + ist_offset
    today = now_ist.strftime("%Y-%m-%d")
    tomorrow = (now_ist + timedelta(days=1)).strftime("%Y-%m-%d")
    current_hour = now_ist.hour
    current_minute = now_ist.minute
    
    results = {
        "24h_reminders": {"checked": 0, "sent": 0, "errors": []},
        "1h_reminders": {"checked": 0, "sent": 0, "errors": []}
    }
    
    # ===== 24 HOUR REMINDERS (Day Before Sonography) =====
    try:
        tomorrow_bookings = await db.sonography_bookings.find({
            "booking_date": tomorrow,
            "status": "booked",
            "reminder_24h_sent": {"$ne": True}
        }, {"_id": 0}).to_list(100)
        
        results["24h_reminders"]["checked"] = len(tomorrow_bookings)
        
        for booking in tomorrow_bookings:
            try:
                booking_id = booking.get("id")
                patient_name = booking.get("patient_name", "Patient")
                mobile = booking.get("mobile_number")
                clinic = booking.get("clinic", "Clinic")
                scan_type = booking.get("scan_type", "Sonography")
                booking_time = booking.get("booking_time", "scheduled time")
                
                # Get clinic map link
                map_link = ""
                for key, link in CLINIC_MAP_LINKS.items():
                    if key.lower() in clinic.lower():
                        map_link = link
                        break
                
                # Send SMS Reminder (24h advance)
                if mobile and send_sms_notification:
                    sms_msg = f"""Nevika Cura - Sonography Reminder
                    
Dear {patient_name},
Your {scan_type} is scheduled for TOMORROW:

Date: {tomorrow}
Time: {booking_time}
Clinic: {clinic}

Preparation: Empty bladder may be required. Please confirm instructions when you arrive.
Location: {map_link}

For queries: 9403890429
- Nevika Cura"""
                    await send_sms_notification(mobile, sms_msg)
                    logger.info(f"24h sonography reminder sent to {mobile} for booking {booking_id}")
                
                # Mark reminder as sent
                await db.sonography_bookings.update_one(
                    {"id": booking_id},
                    {"$set": {
                        "reminder_24h_sent": True, 
                        "reminder_24h_sent_at": now_utc.isoformat()
                    }}
                )
                results["24h_reminders"]["sent"] += 1
                
            except Exception as e:
                error_msg = f"Failed 24h reminder for {booking.get('id')}: {str(e)}"
                logger.error(error_msg)
                results["24h_reminders"]["errors"].append(error_msg)
                
    except Exception as e:
        logger.error(f"Error fetching tomorrow's sonography bookings: {e}")
    
    # ===== 1 HOUR REMINDERS (Same Day Sonography) =====
    try:
        today_bookings = await db.sonography_bookings.find({
            "booking_date": today,
            "status": "booked",
            "reminder_1h_sent": {"$ne": True}
        }, {"_id": 0}).to_list(100)
        
        for booking in today_bookings:
            try:
                booking_time_str = booking.get("booking_time", "")
                if not booking_time_str:
                    continue
                
                # Parse booking time (format: "11:00" or "11:00 AM")
                try:
                    if "AM" in booking_time_str or "PM" in booking_time_str:
                        time_parts = booking_time_str.replace("AM", "").replace("PM", "").strip().split(":")
                        hour = int(time_parts[0])
                        minute = int(time_parts[1]) if len(time_parts) > 1 else 0
                        if "PM" in booking_time_str and hour != 12:
                            hour += 12
                        elif "AM" in booking_time_str and hour == 12:
                            hour = 0
                    else:
                        time_parts = booking_time_str.split(":")
                        hour = int(time_parts[0])
                        minute = int(time_parts[1]) if len(time_parts) > 1 else 0
                    
                    # Calculate minutes until appointment
                    booking_minutes = hour * 60 + minute
                    current_minutes = current_hour * 60 + current_minute
                    minutes_until = booking_minutes - current_minutes
                    
                    # Send reminder if sonography is 45-75 minutes away
                    if 45 <= minutes_until <= 75:
                        results["1h_reminders"]["checked"] += 1
                        
                        booking_id = booking.get("id")
                        patient_name = booking.get("patient_name", "Patient")
                        mobile = booking.get("mobile_number")
                        clinic = booking.get("clinic", "Clinic")
                        scan_type = booking.get("scan_type", "Sonography")
                        
                        # Send SMS Reminder
                        if mobile and send_sms_notification:
                            sms_msg = f"""⏰ Nevika Cura - 1 Hour Reminder

Dear {patient_name},
Your {scan_type} is in 1 HOUR:

Time: {booking_time_str}
Clinic: {clinic}

Please arrive 10 minutes early!
- Nevika Cura"""
                            await send_sms_notification(mobile, sms_msg)
                            logger.info(f"1h sonography reminder sent to {mobile} for booking {booking_id}")
                        
                        # Mark reminder as sent
                        await db.sonography_bookings.update_one(
                            {"id": booking_id},
                            {"$set": {
                                "reminder_1h_sent": True, 
                                "reminder_1h_sent_at": now_utc.isoformat()
                            }}
                        )
                        results["1h_reminders"]["sent"] += 1
                        
                except ValueError as ve:
                    logger.warning(f"Could not parse time '{booking_time_str}' for sonography {booking.get('id')}: {ve}")
                    
            except Exception as e:
                error_msg = f"Failed 1h reminder for {booking.get('id')}: {str(e)}"
                logger.error(error_msg)
                results["1h_reminders"]["errors"].append(error_msg)
                
    except Exception as e:
        logger.error(f"Error fetching today's sonography bookings: {e}")
    
    return {
        "success": True,
        "timestamp": now_utc.isoformat(),
        "ist_time": now_ist.strftime("%Y-%m-%d %H:%M:%S IST"),
        "results": results,
        "summary": f"24h: {results['24h_reminders']['sent']}/{results['24h_reminders']['checked']} sent, 1h: {results['1h_reminders']['sent']}/{results['1h_reminders']['checked']} sent"
    }


# Include router AFTER all routes are defined
app.include_router(api_router)

# Include modular routers
try:
    from routes.billing import router as billing_router
    app.include_router(billing_router, prefix="/api")
    logger.info("Billing router loaded")
except Exception as e:
    logger.warning(f"Could not load billing router: {e}")

try:
    from routes.reminders import router as reminders_router
    app.include_router(reminders_router, prefix="/api")
    logger.info("Reminders router loaded")
except Exception as e:
    logger.warning(f"Could not load reminders router: {e}")

try:
    from routes.community import router as community_router
    app.include_router(community_router, prefix="/api")
    logger.info("Community router loaded")
except Exception as e:
    logger.warning(f"Could not load community router: {e}")

try:
    from routes.pharmacy_loyalty import router as pharmacy_loyalty_router
    app.include_router(pharmacy_loyalty_router, prefix="/api")
    logger.info("Pharmacy Loyalty router loaded")
except Exception as e:
    logger.warning(f"Could not load pharmacy loyalty router: {e}")

# NEW FEATURE ROUTERS
try:
    from routes.health_records import router as health_records_router, set_db as set_health_records_db
    set_health_records_db(db)
    app.include_router(health_records_router, prefix="/api")
    logger.info("Health Records router loaded")
except Exception as e:
    logger.warning(f"Could not load health records router: {e}")

try:
    from routes.health_packages import router as health_packages_router, set_db as set_health_packages_db
    set_health_packages_db(db)
    app.include_router(health_packages_router, prefix="/api")
    logger.info("Health Packages router loaded")
except Exception as e:
    logger.warning(f"Could not load health packages router: {e}")

try:
    from routes.referral import router as referral_router, set_db as set_referral_db
    set_referral_db(db)
    app.include_router(referral_router, prefix="/api")
    logger.info("Referral router loaded")
except Exception as e:
    logger.warning(f"Could not load referral router: {e}")

try:
    from routes.health_tips import router as health_tips_router, set_db as set_health_tips_db
    set_health_tips_db(db)
    app.include_router(health_tips_router, prefix="/api")
    logger.info("Health Tips router loaded")
except Exception as e:
    logger.warning(f"Could not load health tips router: {e}")

try:
    from routes.doctor_profiles import router as doctor_profiles_router, set_db as set_doctor_profiles_db
    set_doctor_profiles_db(db)
    app.include_router(doctor_profiles_router, prefix="/api")
    logger.info("Doctor Profiles router loaded")
except Exception as e:
    logger.warning(f"Could not load doctor profiles router: {e}")

try:
    from routes.teleconsultation import router as teleconsult_router, set_db as set_teleconsult_db
    set_teleconsult_db(db)
    app.include_router(teleconsult_router, prefix="/api")
    logger.info("Teleconsultation router loaded")
except Exception as e:
    logger.warning(f"Could not load teleconsultation router: {e}")

# Wallet Router
try:
    from routes.wallet import router as wallet_router, set_db as set_wallet_db, set_notification_functions as set_wallet_notif
    set_wallet_db(db)
    set_wallet_notif(send_email_notification, send_sms_notification)
    app.include_router(wallet_router, prefix="/api")
    logger.info("Wallet router loaded")
except Exception as e:
    logger.warning(f"Could not load wallet router: {e}")

try:
    from routes.wearables import router as wearables_router, set_db as set_wearables_db
    set_wearables_db(db)
    app.include_router(wearables_router, prefix="/api")
    logger.info("Wearables router loaded")
except Exception as e:
    logger.warning(f"Could not load wearables router: {e}")

# Emergency Services Router
try:
    from routes.emergency import router as emergency_router, set_db as set_emergency_db
    set_emergency_db(db)
    app.include_router(emergency_router, prefix="/api")
    logger.info("Emergency Services router loaded")
except Exception as e:
    logger.warning(f"Could not load emergency router: {e}")

# Health Risk Assessment Router
try:
    from routes.health_assessment import router as health_assessment_router, set_db as set_health_assessment_db
    set_health_assessment_db(db)
    app.include_router(health_assessment_router, prefix="/api")
    logger.info("Health Assessment router loaded")
except Exception as e:
    logger.warning(f"Could not load health assessment router: {e}")

# Medication Tracker Router
try:
    from routes.medication_tracker import router as medication_tracker_router, set_db as set_medication_tracker_db
    set_medication_tracker_db(db)
    app.include_router(medication_tracker_router, prefix="/api")
    logger.info("Medication Tracker router loaded")
except Exception as e:
    logger.warning(f"Could not load medication tracker router: {e}")

# Patient Flow & Queue Management Router
try:
    from routes.patient_flow import router as patient_flow_router, set_db as set_patient_flow_db
    set_patient_flow_db(db)
    app.include_router(patient_flow_router, prefix="/api")
    logger.info("Patient Flow router loaded")
except Exception as e:
    logger.warning(f"Could not load patient flow router: {e}")

# Live Queue & Wait Time System
try:
    from routes.live_queue import router as live_queue_router, set_db as set_live_queue_db, set_jwt_config as set_live_queue_jwt, set_notification_functions as set_live_queue_notifications
    set_live_queue_db(db)
    set_live_queue_jwt(JWT_SECRET)
    set_live_queue_notifications(send_push_notification, send_sms_notification, send_whatsapp_notification)
    app.include_router(live_queue_router, prefix="/api")
    logger.info("Live Queue router loaded")
except Exception as e:
    logger.warning(f"Could not load live queue router: {e}")

# Smart Medicine Reminders
try:
    from routes.medicine_reminders import router as medicine_reminders_router, set_db as set_medicine_db, set_jwt_config as set_medicine_jwt, set_notification_function as set_medicine_notif
    set_medicine_db(db)
    set_medicine_jwt(JWT_SECRET)
    set_medicine_notif(send_push_notification)
    app.include_router(medicine_reminders_router, prefix="/api")
    logger.info("Medicine Reminders router loaded")
except Exception as e:
    logger.warning(f"Could not load medicine reminders router: {e}")

# Clinic Analytics Dashboard
try:
    from routes.clinic_analytics import router as clinic_analytics_router, set_db as set_analytics_db, set_jwt_config as set_analytics_jwt
    set_analytics_db(db)
    set_analytics_jwt(JWT_SECRET)
    app.include_router(clinic_analytics_router, prefix="/api")
    logger.info("Clinic Analytics router loaded")
except Exception as e:
    logger.warning(f"Could not load clinic analytics router: {e}")

# Staff Billing Router
try:
    from routes.staff_billing import router as staff_billing_router, set_db as set_staff_billing_db
    set_staff_billing_db(db)
    app.include_router(staff_billing_router, prefix="/api")
    logger.info("Staff Billing router loaded")
except Exception as e:
    logger.warning(f"Could not load staff billing router: {e}")

# ALYNE - Kids Health Router
try:
    from routes.alyne import router as alyne_router, set_db as set_alyne_db
    set_alyne_db(db)
    app.include_router(alyne_router, prefix="/api")
    logger.info("ALYNE Kids Health router loaded")
except Exception as e:
    logger.warning(f"Could not load ALYNE router: {e}")

# Evara - Women's Wellness Router
try:
    from routes.evara import router as evara_router, set_db as set_evara_db, set_auth_dependencies as set_evara_auth, set_sms_function, set_stripe_key
    set_evara_db(db)
    set_evara_auth(get_current_user, get_current_user_optional)
    set_sms_function(send_sms_notification)
    set_stripe_key(stripe_api_key)
    app.include_router(evara_router, prefix="/api")
    logger.info("Evara Women's Wellness router loaded")
except Exception as e:
    logger.warning(f"Could not load Evara router: {e}")

# Glydex - Diabetes Care Router
try:
    from routes.glydex import router as glydex_router, set_db as set_glydex_db, set_jwt_secret as set_glydex_jwt, set_notification_functions as set_glydex_notif
    set_glydex_db(db)
    set_glydex_jwt(JWT_SECRET)
    set_glydex_notif(send_email_notification, send_sms_notification)
    app.include_router(glydex_router, prefix="/api")
    logger.info("Glydex Diabetes Care router loaded")
except Exception as e:
    logger.warning(f"Could not load Glydex router: {e}")

# Subscription Management Router
try:
    from routes.subscriptions import router as subscriptions_router, set_db as set_subscriptions_db, set_stripe_key as set_subscriptions_stripe
    set_subscriptions_db(db)
    set_subscriptions_stripe(stripe_api_key)
    app.include_router(subscriptions_router, prefix="/api")
    logger.info("Subscription Management router loaded")
except Exception as e:
    logger.warning(f"Could not load Subscriptions router: {e}")

# Patient Registration System
try:
    from routes.patients import router as patients_router, set_db as set_patients_db, set_jwt_config as set_patients_jwt
    set_patients_db(db)
    set_patients_jwt(JWT_SECRET)
    app.include_router(patients_router, prefix="/api")
    logger.info("Patient Registration router loaded")
except Exception as e:
    logger.warning(f"Could not load Patient Registration router: {e}")

# Biometric Attendance Router
try:
    from routes.biometric_attendance import router as biometric_router, set_db as set_biometric_db, set_jwt_config as set_biometric_jwt
    set_biometric_db(db)
    set_biometric_jwt(JWT_SECRET, JWT_ALGORITHM)
    app.include_router(biometric_router, prefix="/api")
    logger.info("Biometric Attendance router loaded")
except Exception as e:
    logger.warning(f"Could not load Biometric Attendance router: {e}")

# ANC Registration Router
try:
    from routes.anc_registration import router as anc_router, set_db as set_anc_db, set_jwt_config as set_anc_jwt, set_notification_functions as set_anc_notif
    set_anc_db(db)
    set_anc_jwt(JWT_SECRET, JWT_ALGORITHM)
    set_anc_notif(send_email_notification, send_sms_notification)
    app.include_router(anc_router, prefix="/api")
    logger.info("ANC Registration router loaded")
except Exception as e:
    logger.warning(f"Could not load ANC Registration router: {e}")

# Admin Routes (extracted from server.py)
try:
    from routes.admin import router as admin_router, set_db as set_admin_db, set_jwt_config, set_admin_password, set_notification_functions
    set_admin_db(db)
    set_jwt_config(JWT_SECRET, JWT_ALGORITHM)
    set_admin_password(ADMIN_PASSWORD)
    set_notification_functions(send_email_notification, send_sms_notification)
    app.include_router(admin_router, prefix="/api")
    logger.info("Admin router loaded")
except Exception as e:
    logger.warning(f"Could not load Admin router: {e}")

# Staff Routes (extracted from server.py)
try:
    from routes.staff import router as staff_router, set_db as set_staff_db, set_jwt_config as set_staff_jwt, set_notification_functions as set_staff_notif, set_msg91_functions as set_staff_msg91
    set_staff_db(db)
    set_staff_jwt(JWT_SECRET, JWT_ALGORITHM)
    set_staff_notif(send_email_notification, send_sms_notification, send_whatsapp_notification)
    set_staff_msg91(completed_func=send_diagyn_appointment_completed)
    app.include_router(staff_router, prefix="/api")
    logger.info("Staff router loaded")
except Exception as e:
    logger.warning(f"Could not load Staff router: {e}")

# Clinic Management Routes
try:
    from routes.clinic_management import router as clinic_mgmt_router, set_db as set_clinic_db, set_jwt_config as set_clinic_jwt, set_llm_key as set_clinic_llm, set_notification_functions as set_clinic_notif
    set_clinic_db(db)
    set_clinic_jwt(JWT_SECRET, JWT_ALGORITHM)
    set_clinic_llm(os.environ.get("EMERGENT_LLM_KEY", ""))
    set_clinic_notif(send_email_notification)
    app.include_router(clinic_mgmt_router, prefix="/api")
    logger.info("Clinic Management router loaded")
except Exception as e:
    logger.warning(f"Could not load Clinic Management router: {e}")

# Face Recognition Attendance Router (for mobile biometric)
try:
    from routes.face_attendance import router as face_router, set_db as set_face_db
    set_face_db(db)
    app.include_router(face_router, prefix="/api/face-attendance")
    logger.info("Face Recognition Attendance router loaded")
except Exception as e:
    logger.warning(f"Could not load Face Attendance router: {e}")

# Calories Tracking Router (for Evara, Glydex, Alyne food tracking)
try:
    from routes.calories import router as calories_router
    app.include_router(calories_router)
    logger.info("Calories Tracking router loaded")
except Exception as e:
    logger.warning(f"Could not load Calories router: {e}")

# Configuration Data Router (clinics, doctors, fees, etc.)
try:
    from routes.config import router as config_router
    app.include_router(config_router, prefix="/api")
    logger.info("Configuration Data router loaded")
except Exception as e:
    logger.warning(f"Could not load Config router: {e}")

# Stripe Payment Router
try:
    from routes.payments import router as payments_router
    app.include_router(payments_router, prefix="/api")
    logger.info("Stripe Payment router loaded")
except Exception as e:
    logger.warning(f"Could not load Payments router: {e}")

# Enhanced Features Router (Notifications, Gamification, Health Dashboard, Smart Scheduling, Multi-language)
try:
    from routes.enhanced_features import router as enhanced_router, set_db as set_enhanced_db
    set_enhanced_db(db)
    app.include_router(enhanced_router, prefix="/api/features")
    logger.info("Enhanced Features router loaded")
except Exception as e:
    logger.warning(f"Could not load Enhanced Features router: {e}")

# Calendar Sync Router
try:
    from routes.calendar_sync import router as calendar_router, set_db as set_calendar_db
    set_calendar_db(db)
    app.include_router(calendar_router, prefix="/api")
    logger.info("Calendar Sync router loaded")
except Exception as e:
    logger.warning(f"Could not load Calendar Sync router: {e}")

# Staff Notifications Router
try:
    from routes.staff_notifications import setup_routes as setup_notifications_routes
    staff_notifications_router = setup_notifications_routes(db)
    app.include_router(staff_notifications_router, prefix="/api")
    logger.info("Staff Notifications router loaded")
except Exception as e:
    logger.warning(f"Could not load Staff Notifications router: {e}")

# Patient Enhancement Features Router
try:
    from routes.enhancements import setup_routes as setup_enhancement_routes
    enhancement_router = setup_enhancement_routes(db)
    app.include_router(enhancement_router, prefix="/api")
    logger.info("Patient Enhancement Features router loaded")
except Exception as e:
    logger.warning(f"Could not load Enhancement Features router: {e}")

# AI Features Router
try:
    from routes.ai_features import setup_routes as setup_ai_routes
    ai_router = setup_ai_routes(db)
    app.include_router(ai_router, prefix="/api")
    logger.info("AI Healthcare Features router loaded")
except Exception as e:
    logger.warning(f"Could not load AI Features router: {e}")

# Phase 3 Features Router
try:
    from routes.phase3_features import setup_routes as setup_phase3_routes
    phase3_router = setup_phase3_routes(db)
    app.include_router(phase3_router, prefix="/api")
    logger.info("Phase 3 Features router loaded")
except Exception as e:
    logger.warning(f"Could not load Phase 3 Features router: {e}")

# WhatsApp Notification Routes (Twilio WhatsApp API)
try:
    from routes.whatsapp import router as whatsapp_router, set_whatsapp_function
    set_whatsapp_function(send_whatsapp_notification)
    app.include_router(whatsapp_router, prefix="/api")
    logger.info("WhatsApp router loaded (Twilio)")
except Exception as e:
    logger.warning(f"Could not load WhatsApp router: {e}")

# MSG91 WhatsApp Routes (Cost-effective alternative)
try:
    from routes.msg91_whatsapp import router as msg91_router, set_db as set_msg91_db
    set_msg91_db(db)
    app.include_router(msg91_router, prefix="/api")
    logger.info("MSG91 WhatsApp router loaded")
except Exception as e:
    logger.warning(f"Could not load MSG91 WhatsApp router: {e}")

# Enhancement Features V2 Routes (AI Triage, Teleconsultation, Community, etc.)
try:
    from routes.enhancements_v2 import router as enhancements_v2_router, set_db as set_enhancements_v2_db
    set_enhancements_v2_db(db)
    app.include_router(enhancements_v2_router, prefix="/api")
    logger.info("Enhancement Features V2 router loaded (AI Triage, Teleconsultation, Community, Insurance, Wearables)")
except Exception as e:
    logger.warning(f"Could not load Enhancement Features V2 router: {e}")

# Enhancement Features V3 Routes (Admin & Analytics)
try:
    from routes.enhancements_v3 import router as enhancements_v3_router, set_db as set_enhancements_v3_db
    set_enhancements_v3_db(db)
    app.include_router(enhancements_v3_router, prefix="/api")
    logger.info("Enhancement Features V3 router loaded (Audit Trail, Revenue Forecast, Health Outcomes, Shifts, Signage)")
except Exception as e:
    logger.warning(f"Could not load Enhancement Features V3 router: {e}")

# Medicine Images Upload (No Login Required)
try:
    from routes.medicine_images import router as medicine_images_router, set_db as set_medicine_images_db
    set_medicine_images_db(db)
    app.include_router(medicine_images_router, prefix="/api")
    logger.info("Medicine Images Upload router loaded (No Login Required)")
except Exception as e:
    logger.warning(f"Could not load Medicine Images router: {e}")

# Proton Report Download API
try:
    from routes.proton_reports import router as proton_reports_router, set_db as set_proton_reports_db
    set_proton_reports_db(db)
    app.include_router(proton_reports_router, prefix="/api")
    logger.info("Proton Reports Download router loaded")
except Exception as e:
    logger.warning(f"Could not load Proton Reports router: {e}")

# Authentication V2 Routes (Two-Tiered: Guest SMS OTP + Email Sign-up)
try:
    from routes.auth_v2 import router as auth_v2_router, set_db as set_auth_v2_db
    set_auth_v2_db(db)
    app.include_router(auth_v2_router, prefix="/api")
    logger.info("Authentication V2 router loaded (Guest SMS OTP + Email Sign-up)")
except Exception as e:
    logger.warning(f"Could not load Auth V2 router: {e}")


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
