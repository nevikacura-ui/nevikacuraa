"""
Teleconsultation Module - Enhanced Version
- Video appointments with DiaGyn doctors
- 9 AM to 9 PM slots (15-minute intervals)
- Wallet-based payments
- E-prescriptions with Proton/Orange integration
"""

from fastapi import APIRouter, HTTPException, Depends, Header, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import os
import jwt
import logging
import io
import httpx
import resend

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/teleconsult", tags=["Teleconsultation"])

db = None

def set_db(database):
    global db
    db = database

# MSG91 Configuration
MSG91_AUTH_KEY = os.environ.get('MSG91_AUTH_KEY', '')

# Resend Email Configuration
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'Nevika Cura <onboarding@resend.dev>')

# Initialize Resend
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# ============ AUTH ============
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        # Support both 'sub' (from server.py) and 'user_id' (legacy) for user ID
        user_id = payload.get("sub") or payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ CONFIG ============

# DiaGyn Doctors for Teleconsultation
TELECONSULT_DOCTORS = {
    "dr-neha-patel": {
        "name": "Dr. Neha Patel",
        "fee": 500,
        "specialization": "Obstetrics & Gynecology"
    },
    "dr-vikas-jha": {
        "name": "Dr. Vikas Jha", 
        "fee": 500,
        "specialization": "Obstetrics & Gynecology"
    }
}

# Generate 15-minute slots from 9 AM to 9 PM
def generate_time_slots():
    slots = []
    for hour in range(9, 21):  # 9 AM to 9 PM (21:00)
        for minute in [0, 15, 30, 45]:
            hour_12 = hour if hour <= 12 else hour - 12
            if hour_12 == 0:
                hour_12 = 12
            ampm = "AM" if hour < 12 else "PM"
            time_12 = f"{hour_12}:{str(minute).zfill(2)} {ampm}"
            time_24 = f"{str(hour).zfill(2)}:{str(minute).zfill(2)}"
            slots.append({"time_12": time_12, "time_24": time_24, "hour": hour, "minute": minute})
    return slots

TIME_SLOTS = generate_time_slots()

# ============ MODELS ============

class TeleconsultBookingRequest(BaseModel):
    doctor_id: str
    doctor_name: str
    date: str
    time: str
    patient_name: str
    patient_phone: str
    reason: str
    symptoms: Optional[str] = ""
    fee: float
    payment_method: str = "wallet"

class EPrescriptionCreate(BaseModel):
    consultation_id: str
    diagnosis: str
    notes: str
    medicines: Optional[List[dict]] = []
    tests: Optional[List[str]] = []
    follow_up_days: Optional[int] = None

# ============ ROUTES ============

@router.get("/config")
async def get_config():
    """Get teleconsultation configuration"""
    return {
        "doctors": TELECONSULT_DOCTORS,
        "slots_per_day": len(TIME_SLOTS),
        "slot_duration": 15,
        "timing": "9:00 AM - 9:00 PM",
        "payment_method": "wallet_only"
    }

@router.get("/booked-slots")
async def get_booked_slots(doctor: str, date: str):
    """Get booked slots for a doctor on a date"""
    booked = await db.teleconsult_bookings.find(
        {"doctor_id": doctor, "date": date, "status": {"$nin": ["cancelled", "Cancelled"]}},
        {"_id": 0, "time": 1}
    ).to_list(100)

    booked_slots = [b["time"] for b in booked]

    # Check doctor leave/session blocks (set via Doctor Portal -> Manage Leave)
    doctor_name = TELECONSULT_DOCTORS.get(doctor, {}).get("name")
    if doctor_name:
        from routes.appointment_routes import get_doctor_schedule_by_name
        doctor_schedule = await get_doctor_schedule_by_name(db, doctor_name)
        if doctor_schedule:
            for blocked_date in doctor_schedule.get("blocked_dates", []):
                if blocked_date.get("date") == date:
                    return {"booked_slots": [s["time_12"] for s in TIME_SLOTS], "date_blocked": True, "reason": blocked_date.get("reason", "Leave")}

            for session in doctor_schedule.get("blocked_sessions", []):
                if session.get("date") == date:
                    try:
                        s_start = datetime.strptime(session["start_time"], "%H:%M")
                        s_end = datetime.strptime(session["end_time"], "%H:%M")
                        for slot in TIME_SLOTS:
                            slot_time = datetime.strptime(slot["time_24"], "%H:%M")
                            if s_start <= slot_time < s_end:
                                booked_slots.append(slot["time_12"])
                    except (ValueError, KeyError):
                        pass

    return {"booked_slots": booked_slots}

@router.post("/book")
async def book_teleconsultation(
    data: TeleconsultBookingRequest,
    user = Depends(get_current_user)
):
    """Book a teleconsultation with wallet payment"""
    
    # Validate doctor
    if data.doctor_id not in TELECONSULT_DOCTORS:
        raise HTTPException(status_code=400, detail="Invalid doctor selected")
    
    # BOOKING LIMIT: Check if user already has an active teleconsultation
    active_booking = await db.teleconsult_bookings.find_one({
        "user_id": user["id"],
        "status": {"$in": ["pending", "confirmed", "Booked"]},  # Not completed or cancelled
    })
    
    if active_booking:
        # Log duplicate teleconsult attempt (SMS notification disabled)
        try:
            staff_message = f"""⚠️ DUPLICATE TELECONSULT ATTEMPT
Patient: {data.patient_name}
Phone: {data.patient_phone}
Email: {user.get('email', 'N/A')}
Tried: {data.doctor_name} on {data.date} at {data.time}
❌ BLOCKED - Already has active booking:
Doctor: {active_booking.get('doctor_name')}
Date: {active_booking.get('date')}
Time: {active_booking.get('time')}
Status: {active_booking.get('status')}
Please check if patient needs to reschedule."""
            logger.warning(f"Duplicate teleconsult attempt by {data.patient_phone}: {staff_message}")
        except Exception as e:
            logger.error(f"Failed to log duplicate teleconsult: {e}")
        
        raise HTTPException(
            status_code=400,
            detail=f"You already have an active teleconsultation on {active_booking.get('date')} at {active_booking.get('time')} with {active_booking.get('doctor_name')}. Please complete or cancel it before booking a new one."
        )
    
    # Check if slot is available
    existing = await db.teleconsult_bookings.find_one({
        "doctor_id": data.doctor_id,
        "date": data.date,
        "time": data.time,
        "status": {"$nin": ["cancelled", "Cancelled"]}
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="This slot is no longer available")

    # Reject if doctor has marked leave for this date/session
    doctor_name = TELECONSULT_DOCTORS.get(data.doctor_id, {}).get("name")
    if doctor_name:
        from routes.appointment_routes import get_doctor_schedule_by_name
        doctor_schedule = await get_doctor_schedule_by_name(db, doctor_name)
        if doctor_schedule:
            for blocked_date in doctor_schedule.get("blocked_dates", []):
                if blocked_date.get("date") == data.date:
                    raise HTTPException(status_code=400, detail=f"{doctor_name} is on leave on {data.date}. Please pick another date.")
            for session in doctor_schedule.get("blocked_sessions", []):
                if session.get("date") == data.date:
                    try:
                        s_start = datetime.strptime(session["start_time"], "%H:%M")
                        s_end = datetime.strptime(session["end_time"], "%H:%M")
                        slot_time = next((datetime.strptime(s["time_24"], "%H:%M") for s in TIME_SLOTS if s["time_12"] == data.time), None)
                        if slot_time and s_start <= slot_time < s_end:
                            raise HTTPException(status_code=400, detail=f"{doctor_name} is unavailable at this time. Please pick another slot.")
                    except (ValueError, KeyError):
                        pass
    
    # Check wallet balance
    wallet = await db.wallets.find_one({"user_id": user["id"]})
    if not wallet or wallet.get("balance", 0) < data.fee:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient wallet balance. Required: ₹{data.fee}"
        )
    
    # Deduct from wallet
    new_balance = wallet["balance"] - data.fee
    await db.wallets.update_one(
        {"user_id": user["id"]},
        {"$set": {
            "balance": new_balance,
            "total_spent": wallet.get("total_spent", 0) + data.fee,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Record wallet transaction
    wallet_txn = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "type": "debit",
        "amount": data.fee,
        "service_type": "teleconsult",
        "description": f"Video consultation with {data.doctor_name}",
        "status": "completed",
        "balance_after": new_balance,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.wallet_transactions.insert_one(wallet_txn)
    
    # Generate meeting link
    meeting_id = str(uuid.uuid4())[:8]
    meeting_link = f"https://meet.jit.si/nevikacura-{meeting_id}"
    
    # Create booking
    booking = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "doctor_id": data.doctor_id,
        "doctor_name": data.doctor_name,
        "date": data.date,
        "time": data.time,
        "patient_name": data.patient_name,
        "patient_phone": data.patient_phone,
        "reason": data.reason,
        "symptoms": data.symptoms,
        "fee": data.fee,
        "payment_method": "wallet",
        "payment_status": "paid",
        "wallet_transaction_id": wallet_txn["id"],
        "meeting_link": meeting_link,
        "meeting_id": meeting_id,
        "status": "upcoming",
        "has_prescription": False,
        "prescription": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.teleconsult_bookings.insert_one(booking)
    
    logger.info(f"Teleconsult booked: {booking['id']} for {data.patient_name} with {data.doctor_name}")
    
    return {
        "success": True,
        "booking": {k: v for k, v in booking.items() if k != "_id"},
        "message": "Consultation booked successfully!"
    }

@router.get("/my-bookings")
async def get_my_bookings(user = Depends(get_current_user)):
    """Get user's teleconsultation bookings"""
    bookings = await db.teleconsult_bookings.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    # Update status based on date/time
    today = datetime.now(timezone.utc).date()
    for booking in bookings:
        if booking.get("status") == "upcoming":
            booking_date = datetime.strptime(booking["date"], "%Y-%m-%d").date()
            if booking_date < today:
                booking["status"] = "completed"
    
    return {"bookings": bookings}

@router.get("/booking/{booking_id}")
async def get_booking_details(booking_id: str, user = Depends(get_current_user)):
    """Get details of a specific booking"""
    booking = await db.teleconsult_bookings.find_one(
        {"id": booking_id, "user_id": user["id"]},
        {"_id": 0}
    )
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return {"booking": booking}

# ============ E-PRESCRIPTION (Doctor/Admin) ============

@router.post("/prescription")
async def create_prescription(data: EPrescriptionCreate):
    """Create e-prescription for a consultation (doctor access)"""
    
    booking = await db.teleconsult_bookings.find_one({"id": data.consultation_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Consultation not found")
    
    prescription = {
        "id": str(uuid.uuid4()),
        "consultation_id": data.consultation_id,
        "doctor_name": booking.get("doctor_name"),
        "patient_name": booking.get("patient_name"),
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "diagnosis": data.diagnosis,
        "notes": data.notes,
        "medicines": data.medicines,
        "tests": data.tests,
        "follow_up_days": data.follow_up_days,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.eprescriptions.insert_one(prescription)
    
    # Update booking
    await db.teleconsult_bookings.update_one(
        {"id": data.consultation_id},
        {"$set": {
            "has_prescription": True,
            "prescription": {k: v for k, v in prescription.items() if k != "_id"},
            "status": "completed"
        }}
    )
    
    return {
        "success": True,
        "prescription_id": prescription["id"],
        "message": "E-Prescription created successfully"
    }

@router.get("/prescription/{consultation_id}")
async def get_prescription(consultation_id: str, user = Depends(get_current_user)):
    """Get e-prescription for a consultation"""
    booking = await db.teleconsult_bookings.find_one(
        {"id": consultation_id, "user_id": user["id"]},
        {"_id": 0}
    )
    
    if not booking:
        raise HTTPException(status_code=404, detail="Consultation not found")
    
    if not booking.get("has_prescription"):
        raise HTTPException(status_code=404, detail="No prescription available yet")
    
    return {"prescription": booking.get("prescription")}

# ============ CANCEL ============

@router.post("/cancel/{booking_id}")
async def cancel_booking(booking_id: str, user = Depends(get_current_user)):
    """Cancel a teleconsultation and refund to wallet"""
    
    booking = await db.teleconsult_bookings.find_one({
        "id": booking_id,
        "user_id": user["id"],
        "status": "upcoming"
    })
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found or cannot be cancelled")
    
    # Check if within cancellation window (2 hours before)
    booking_datetime = datetime.strptime(f"{booking['date']} {booking['time']}", "%Y-%m-%d %I:%M %p")
    if datetime.now() > booking_datetime - timedelta(hours=2):
        raise HTTPException(status_code=400, detail="Cannot cancel within 2 hours of appointment")
    
    # Refund to wallet
    fee = booking.get("fee", 0)
    wallet = await db.wallets.find_one({"user_id": user["id"]})
    
    if wallet and fee > 0:
        new_balance = wallet.get("balance", 0) + fee
        await db.wallets.update_one(
            {"user_id": user["id"]},
            {"$set": {
                "balance": new_balance,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Record refund transaction
        refund_txn = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "type": "refund",
            "amount": fee,
            "service_type": "teleconsult",
            "reference_id": booking_id,
            "description": "Refund for cancelled consultation",
            "status": "completed",
            "balance_after": new_balance,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.wallet_transactions.insert_one(refund_txn)
    
    # Update booking status
    await db.teleconsult_bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "cancelled",
            "cancelled_at": datetime.now(timezone.utc).isoformat(),
            "refund_amount": fee
        }}
    )
    
    return {
        "success": True,
        "message": f"Booking cancelled. ₹{fee} refunded to wallet.",
        "refund_amount": fee
    }


# ============ PRESCRIPTION UPLOAD & DELIVERY ============

def image_to_pdf_bytes(image_data: bytes, patient_name: str, doctor_name: str) -> bytes:
    """Convert image to PDF with header information"""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
        from reportlab.lib.utils import ImageReader
        from PIL import Image
        
        # Create PDF in memory
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        
        # Add header
        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, height - 50, "Nevika Cura - Teleconsultation Prescription")
        
        c.setFont("Helvetica", 12)
        c.drawString(50, height - 80, f"Patient: {patient_name}")
        c.drawString(50, height - 100, f"Doctor: {doctor_name}")
        c.drawString(50, height - 120, f"Date: {datetime.now().strftime('%d-%m-%Y %I:%M %p')}")
        
        # Draw line separator
        c.line(50, height - 140, width - 50, height - 140)
        
        # Add image
        img = Image.open(io.BytesIO(image_data))
        img_width, img_height = img.size
        
        # Calculate aspect ratio and fit to page
        max_width = width - 100
        max_height = height - 200
        
        scale = min(max_width / img_width, max_height / img_height)
        new_width = img_width * scale
        new_height = img_height * scale
        
        # Center image
        x = (width - new_width) / 2
        y = height - 160 - new_height
        
        img_reader = ImageReader(img)
        c.drawImage(img_reader, x, y, new_width, new_height)
        
        # Footer
        c.setFont("Helvetica", 8)
        c.drawString(50, 30, "This is a digitally generated prescription from Nevika Cura Teleconsultation.")
        c.drawString(50, 20, "For queries, contact: 9833188288 | www.nevikacura.com")
        
        c.save()
        buffer.seek(0)
        return buffer.getvalue()
        
    except ImportError as e:
        logger.warning(f"PDF generation library not available: {e}")
        return image_data


async def send_whatsapp_prescription(phone: str, pdf_url: str, patient_name: str, doctor_name: str):
    """Send prescription via WhatsApp using MSG91"""
    if not MSG91_AUTH_KEY:
        logger.warning("MSG91 not configured for prescription delivery")
        return False
    
    try:
        # Format phone number
        phone_formatted = phone.lstrip('+').lstrip('91')
        if len(phone_formatted) == 10:
            phone_formatted = f"91{phone_formatted}"
        
        # Use a simple text message with link since media template may not be approved
        payload = {
            "integrated_number": "919833188288",
            "content_type": "template",
            "payload": {
                "messaging_product": "whatsapp",
                "type": "template",
                "template": {
                    "name": "prescription_delivery",
                    "language": {"code": "en", "policy": "deterministic"},
                    "namespace": "",
                    "to_and_components": [
                        {
                            "to": [phone_formatted],
                            "components": {
                                "body_1": {"type": "text", "value": patient_name},
                                "body_2": {"type": "text", "value": doctor_name}
                            }
                        }
                    ]
                }
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
                json=payload,
                headers={
                    "authkey": MSG91_AUTH_KEY,
                    "Content-Type": "application/json"
                },
                timeout=30
            )
            
            if response.status_code == 200:
                logger.info(f"Prescription WhatsApp sent to {phone}")
                return True
            else:
                logger.error(f"WhatsApp send failed: {response.text}")
                return False
                
    except Exception as e:
        logger.error(f"WhatsApp prescription error: {e}")
        return False


async def send_email_prescription(email: str, pdf_data: bytes, filename: str, patient_name: str, doctor_name: str, pdf_url: str):
    """Send prescription via Email using Resend"""
    if not RESEND_API_KEY or not email:
        logger.warning("Email not configured or no email provided")
        return False
    
    try:
        import asyncio
        
        # Create beautiful HTML email
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">Your Prescription is Ready</h1>
                    <p style="color: #ccfbf1; margin: 8px 0 0 0; font-size: 14px;">From your teleconsultation</p>
                </div>
                
                <!-- Content -->
                <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <p style="font-size: 16px; color: #334155; margin: 0 0 20px 0;">Dear <strong>{patient_name}</strong>,</p>
                    
                    <p style="font-size: 14px; color: #64748b; line-height: 1.6; margin: 0 0 24px 0;">
                        Your prescription from <strong style="color: #0d9488;">{doctor_name}</strong> is attached to this email.
                        You can also download it using the button below.
                    </p>
                    
                    <!-- Download Button -->
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{pdf_url}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px;">
                            Download Prescription
                        </a>
                    </div>
                    
                    <!-- Info Cards -->
                    <div style="background: #f0fdfa; padding: 20px; border-radius: 12px; border-left: 4px solid #14b8a6; margin: 24px 0;">
                        <p style="margin: 0; font-size: 13px; color: #0f766e;">
                            <strong>Quick Actions:</strong><br>
                            • Order medicines from <strong>Orange Pharmacy</strong> - delivery at your doorstep<br>
                            • Book lab tests from <strong>Mango Health Labs</strong> for home collection<br>
                            • Upload prescription to get medicine reminders
                        </p>
                    </div>
                    
                    <!-- Footer Note -->
                    <p style="font-size: 12px; color: #94a3b8; margin: 24px 0 0 0; text-align: center;">
                        For any queries, contact us at <a href="tel:9833188288" style="color: #0d9488;">9833188288</a><br>
                        or WhatsApp us for quick assistance.
                    </p>
                </div>
                
                <!-- Bottom Footer -->
                <div style="text-align: center; padding: 24px 0;">
                    <p style="font-size: 11px; color: #94a3b8; margin: 0;">
                        Nevika Cura | Unified Healthcare Platform<br>
                        This is an automatically generated email. Please do not reply.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Send email with attachment
        import base64
        pdf_base64 = base64.b64encode(pdf_data).decode('utf-8')
        
        result = await asyncio.to_thread(
            resend.Emails.send,
            {
                "from": SENDER_EMAIL,
                "to": email,
                "subject": f"Your Prescription from {doctor_name} - Nevika Cura",
                "html": html_content,
                "attachments": [
                    {
                        "filename": filename,
                        "content": pdf_base64
                    }
                ]
            }
        )
        
        logger.info(f"Prescription email sent to {email}: {result}")
        return True
        
    except Exception as e:
        logger.error(f"Email prescription error: {e}")
        return False


@router.post("/prescription/upload")
async def upload_prescription(
    prescription_image: UploadFile = File(...),
    appointment_id: str = Form(...),
    patient_name: str = Form(...),
    patient_phone: str = Form(...),
    patient_email: Optional[str] = Form(None),
    doctor_name: str = Form(...),
    notes: Optional[str] = Form(""),
    send_whatsapp: str = Form("true"),
    send_email: str = Form("false")
):
    """
    Upload prescription image, convert to PDF, and send to patient
    """
    try:
        # Read uploaded image
        image_data = await prescription_image.read()
        
        if not image_data:
            raise HTTPException(status_code=400, detail="No image data received")
        
        # Validate image
        try:
            from PIL import Image
            img = Image.open(io.BytesIO(image_data))
            img.verify()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # Convert to PDF
        pdf_data = image_to_pdf_bytes(image_data, patient_name, doctor_name)
        
        # Generate a unique filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"prescription_{appointment_id}_{timestamp}.pdf"
        
        # Save PDF temporarily
        pdf_path = f"/tmp/{filename}"
        with open(pdf_path, 'wb') as f:
            f.write(pdf_data)
        
        # Get base URL from environment
        base_url = os.environ.get('REACT_APP_BACKEND_URL', 'https://premium-rx-portal.preview.emergentagent.com')
        pdf_url = f"{base_url}/api/teleconsult/prescription/download/{filename}"
        
        # Store prescription record in database
        prescription_record = {
            "appointment_id": appointment_id,
            "patient_name": patient_name,
            "patient_phone": patient_phone,
            "patient_email": patient_email,
            "doctor_name": doctor_name,
            "notes": notes,
            "pdf_filename": filename,
            "pdf_url": pdf_url,
            "created_at": datetime.now(timezone.utc),
            "sent_whatsapp": False,
            "sent_email": False
        }
        
        if db:
            await db.prescriptions.insert_one(prescription_record)
        
        results = {"whatsapp": False, "email": False}
        
        # Send via WhatsApp
        if send_whatsapp.lower() == "true":
            results["whatsapp"] = await send_whatsapp_prescription(
                patient_phone, pdf_url, patient_name, doctor_name
            )
        
        # Send via Email
        if send_email.lower() == "true" and patient_email:
            results["email"] = await send_email_prescription(
                patient_email, pdf_data, filename, patient_name, doctor_name, pdf_url
            )
        
        # Update record with send status
        if db:
            await db.prescriptions.update_one(
                {"appointment_id": appointment_id, "pdf_filename": filename},
                {"$set": {"sent_whatsapp": results["whatsapp"], "sent_email": results["email"]}}
            )
        
        # Update appointment record
        if db:
            await db.appointments.update_one(
                {"$or": [{"booking_id": appointment_id}, {"id": appointment_id}]},
                {"$set": {
                    "prescription_sent": True,
                    "prescription_filename": filename,
                    "prescription_url": pdf_url,
                    "prescription_sent_at": datetime.now(timezone.utc)
                }}
            )
        
        return {
            "success": True,
            "message": "Prescription uploaded and sent",
            "pdf_url": pdf_url,
            "delivery_status": results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prescription upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process prescription: {str(e)}")


@router.get("/prescription/download/{filename}")
async def download_prescription(filename: str):
    """Download a prescription PDF"""
    pdf_path = f"/tmp/{filename}"
    
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="Prescription not found")
    
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=filename
    )
