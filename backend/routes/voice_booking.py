"""
Voice-First Booking - Multi-turn conversational booking via Gemini AI.
Parses natural language, asks follow-ups, and auto-books appointments.
"""

import os
import re
import json
import logging
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice-booking", tags=["Voice Booking"])

db = None

def set_db(database):
    global db
    db = database


# ──── Models ────

class VoiceBookingRequest(BaseModel):
    text: str
    service: Optional[str] = None

class BookingIntent(BaseModel):
    understood: bool
    service: Optional[str] = None
    doctor_name: Optional[str] = None
    specialization: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    patient_name: Optional[str] = None
    phone: Optional[str] = None
    test_name: Optional[str] = None
    medicine_name: Optional[str] = None
    clinic: Optional[str] = None
    message: str
    suggestions: List[str] = []

class ConversationMessage(BaseModel):
    role: str  # "user" or "assistant"
    text: str

class ConversationRequest(BaseModel):
    messages: List[ConversationMessage]
    current_intent: Optional[dict] = None

class ConversationResponse(BaseModel):
    reply: str
    intent: dict
    ready_to_book: bool
    missing_fields: List[str] = []

class ConfirmBookingRequest(BaseModel):
    doctor: str
    clinic: str
    date: str
    time: str
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    patient_age: Optional[str] = None
    source: str = "voice_booking"


# ──── Prompts ────

SYSTEM_CONVERSE = """You are Cura, a friendly healthcare booking assistant for Nevika Cura. You help patients book appointments through natural conversation.

**DOCTORS & SCHEDULES:**

1. **Dr. Vikas Jha** — Diabetologist (M.B.B.S, C.Diab (RSSDI, Delhi), Dip. In Diabetology (Cardiff, UK)), 15 years experience, 10,000+ patients
   Specializations: Diabetes Management, Thyroid Disorders, Preventive Health
   - Pushpa Clinic (Naigaon East): Mon, Wed, Fri → 6:00 PM - 10:00 PM; Mon-Sat → 11:30 AM - 2:00 PM; Tue, Thu, Sat → 6:00 PM - 10:00 PM
   - Online Consultation: Mon-Sat → 9 AM-12 PM, 3 PM-6 PM, 8 PM-10 PM; Sunday → 10 AM-10 PM

2. **Dr. Neha Patel** — OBGYN / Obstetrician & Gynaecologist (M.B.B.S, D.G.O (Mumbai), FMAS (Delhi)), 12 years experience, 8,000+ patients
   Specializations: High Risk Pregnancy, Laparoscopic Surgery, Infertility
   - Pushpa Clinic (Naigaon East): Mon-Sat → 11:30 AM - 2:00 PM; Tue, Thu, Sat → 6:00 PM - 10:00 PM; Mon, Wed, Fri → 6:00 PM - 10:00 PM
   - Online Consultation: Mon-Sat → 9 AM-12 PM, 3 PM-6 PM, 8 PM-10 PM; Sunday → 10 AM-10 PM

**CLINICS:**
- Pushpa Clinic — A-4, Sai Darshan, Near Don Bosco High School, Naigaon East
- Online Consultation — Video call from home

**OTHER SERVICES:**
- Mango Health Labs — Diagnostic tests (CBC, Thyroid, Blood Sugar, Lipid Profile, Ultrasound, ECG, X-ray, etc.)
- Orange Pharmacy — Medicine orders and prescriptions

Consultation fee: Rs 700 (Indian), Rs 2500/USD 30 (International). Follow-up within 7 days: Rs 500 (Indian), Rs 1250/USD 15 (International).

Today is {today}.

RULES:
- Be warm, brief (1-2 sentences max per response), and conversational.
- Ask ONE missing detail at a time, never dump all questions at once.
- IMPORTANT: Match doctor availability to the requested day/time. If a time slot doesn't match, suggest an available one.
- When parsing dates: "tomorrow" = next day, "Monday" = next Monday, etc. Use YYYY-MM-DD format.
- When parsing times: convert to HH:MM 24h format.
- Default clinic: Pushpa Clinic unless user specifies Amnion/Virar or online.
- If user says just a doctor name, infer the service and clinic from the doctor info above.

After EVERY response, output a JSON block with the current booking state. Format:
INTENT_JSON:
{{"service":"diagyn/mango/pharmacy/null","doctor_name":"Dr. Vikas Jha or Dr. Neha Patel or null","clinic":"Pushpa Clinic or Amnion Clinic or Online Consultation or null","date":"YYYY-MM-DD or null","time":"HH:MM or null","patient_name":"name or null","patient_phone":"10-digit or null","patient_email":"email or null","ready_to_book":false,"missing_fields":["list of still-missing required fields"]}}

Required fields for booking: service, doctor_name (for diagyn), clinic, date, time, patient_name, patient_phone.
When ALL required fields are filled, set ready_to_book=true and ask for final confirmation."""


# ──── Endpoints ────

@router.post("/parse-intent", response_model=BookingIntent)
async def parse_voice_booking(request: VoiceBookingRequest):
    """Parse a single natural language booking request into structured intent"""
    if not request.text or len(request.text.strip()) < 3:
        raise HTTPException(status_code=400, detail="Please provide a booking request")

    emergent_key = os.environ.get('EMERGENT_LLM_KEY')
    if not emergent_key:
        raise HTTPException(status_code=500, detail="Voice booking service not configured")

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        today = datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime('%A, %B %d, %Y')

        chat = LlmChat(
            api_key=emergent_key,
            session_id=f"voice-parse-{uuid.uuid4().hex[:8]}",
            system_message=f"You parse booking requests for Nevika Cura. Today is {today}. Return ONLY valid JSON."
        ).with_model("gemini", "gemini-2.5-flash")

        prompt = f"""Parse this booking request: "{request.text}"

Return ONLY JSON:
{{"understood":true/false,"service":"diagyn/mango/pharmacy/null","doctor_name":"or null","specialization":"or null","date":"YYYY-MM-DD or null","time":"HH:MM or null","patient_name":"or null","phone":"or null","test_name":"or null","medicine_name":"or null","clinic":"Pushpa Clinic/Amnion Clinic or null","message":"brief confirmation","suggestions":["follow-up if incomplete"]}}"""

        if request.service:
            prompt += f"\nContext: User is on the {request.service} page."

        response = await chat.send_message(UserMessage(text=prompt))

        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
            cleaned = re.sub(r'\s*```$', '', cleaned)

        json_match = re.search(r'\{[\s\S]*\}', cleaned)
        if json_match:
            parsed = json.loads(json_match.group())
            return BookingIntent(
                understood=parsed.get('understood', False),
                service=parsed.get('service'),
                doctor_name=parsed.get('doctor_name'),
                specialization=parsed.get('specialization'),
                date=parsed.get('date'),
                time=parsed.get('time'),
                patient_name=parsed.get('patient_name'),
                phone=parsed.get('phone'),
                test_name=parsed.get('test_name'),
                medicine_name=parsed.get('medicine_name'),
                clinic=parsed.get('clinic'),
                message=parsed.get('message', 'Request received'),
                suggestions=parsed.get('suggestions', [])
            )

        return BookingIntent(understood=False, message="Could not understand. Please try again.",
                             suggestions=["Try: 'Book Dr. Vikas tomorrow 3 PM'"])

    except Exception as e:
        logger.error(f"Voice parse error: {e}", exc_info=True)
        return BookingIntent(understood=False, message=f"Error: {str(e)}", suggestions=["Please try again"])


@router.post("/converse", response_model=ConversationResponse)
async def voice_converse(request: ConversationRequest):
    """Multi-turn conversational booking. Send message history, get AI reply + updated intent."""
    if not request.messages:
        raise HTTPException(status_code=400, detail="No messages provided")

    emergent_key = os.environ.get('EMERGENT_LLM_KEY')
    if not emergent_key:
        raise HTTPException(status_code=500, detail="Voice booking not configured")

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        today = datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime('%A, %B %d, %Y')

        chat = LlmChat(
            api_key=emergent_key,
            session_id=f"voice-converse-{uuid.uuid4().hex[:8]}",
            system_message=SYSTEM_CONVERSE.format(today=today)
        ).with_model("gemini", "gemini-2.5-flash")

        # Build conversation prompt from history
        history_text = ""
        for msg in request.messages:
            prefix = "Patient" if msg.role == "user" else "Cura"
            history_text += f"{prefix}: {msg.text}\n"

        if request.current_intent:
            history_text += f"\nCurrent booking state: {json.dumps(request.current_intent)}\n"

        history_text += "\nRespond as Cura (1-2 sentences max). Then output INTENT_JSON on a new line."

        response = await chat.send_message(UserMessage(text=history_text))

        # Extract reply text and intent JSON
        reply_text = response.strip()
        intent = request.current_intent or {}

        # Find INTENT_JSON block
        intent_match = re.search(r'INTENT_JSON:\s*(\{[\s\S]*?\})', reply_text)
        if intent_match:
            try:
                intent = json.loads(intent_match.group(1))
                reply_text = reply_text[:intent_match.start()].strip()
            except json.JSONDecodeError:
                pass
        else:
            # Try to find any JSON block at end
            json_match = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', reply_text)
            if json_match:
                try:
                    intent = json.loads(json_match.group(1))
                    reply_text = reply_text[:json_match.start()].strip()
                except json.JSONDecodeError:
                    pass
            else:
                # Last resort: find JSON at end of text
                last_json = re.search(r'(\{[^{}]*"service"[^{}]*\})', reply_text)
                if last_json:
                    try:
                        intent = json.loads(last_json.group(1))
                        reply_text = reply_text[:last_json.start()].strip()
                    except json.JSONDecodeError:
                        pass

        # Clean markdown from reply
        reply_text = re.sub(r'\*\*([^*]+)\*\*', r'\1', reply_text)
        reply_text = reply_text.strip().rstrip('`').strip()
        if not reply_text:
            reply_text = "I'm here to help you book. What appointment do you need?"

        ready = intent.get('ready_to_book', False)
        missing = intent.get('missing_fields', [])

        # Auto-detect missing fields if not provided by AI
        if not missing and not ready:
            required = ['service', 'doctor_name', 'clinic', 'date', 'time', 'patient_name', 'patient_phone']
            missing = [f for f in required if not intent.get(f)]

        return ConversationResponse(
            reply=reply_text,
            intent=intent,
            ready_to_book=ready and len(missing) == 0,
            missing_fields=missing
        )

    except Exception as e:
        logger.error(f"Voice converse error: {e}", exc_info=True)
        return ConversationResponse(
            reply="Sorry, I had trouble understanding. Could you repeat that?",
            intent=request.current_intent or {},
            ready_to_book=False,
            missing_fields=[]
        )


@router.post("/confirm-booking")
async def confirm_voice_booking(request: ConfirmBookingRequest):
    """Auto-book appointment from confirmed voice intent."""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    try:
        # Import the booking logic dependencies
        from utils.timezone_utils import normalize_time_to_24h
        import random

        # Generate booking ID
        max_attempts = 50
        booking_id = None
        for _ in range(max_attempts):
            candidate = str(random.randint(1000, 9999))
            today_str = datetime.now().strftime("%Y-%m-%d")
            existing = await db.appointments.find_one({
                "booking_id": candidate, "created_at": {"$regex": f"^{today_str}"}
            })
            if not existing:
                booking_id = candidate
                break
        if not booking_id:
            booking_id = str(int(datetime.now().timestamp()))[-4:]

        normalized_time = normalize_time_to_24h(request.time) if request.time else request.time

        # Validate slot not taken
        existing = await db.appointments.find_one({
            "doctor": request.doctor,
            "clinic": request.clinic,
            "date": request.date,
            "time": normalized_time,
            "status": {"$in": ["pending", "Booked", "CheckedIn", "WithDoctor", "billing_pending"]}
        })
        if existing:
            raise HTTPException(status_code=400, detail="This time slot is already booked. Please choose another time.")

        appointment_id = str(uuid.uuid4())
        doc = {
            "id": appointment_id,
            "booking_id": booking_id,
            "doctor": request.doctor,
            "clinic": request.clinic,
            "date": request.date,
            "time": normalized_time,
            "patient_name": request.patient_name,
            "patient_phone": request.patient_phone,
            "patient_email": request.patient_email,
            "patient_age": request.patient_age,
            "status": "Booked",
            "appointment_type": "NORMAL",
            "source": "voice_booking",
            "booked_by": "patient",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        await db.appointments.insert_one(doc)

        verify = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
        if not verify:
            raise HTTPException(status_code=500, detail="Booking verification failed. Please try again.")

        logger.info(f"Voice booking confirmed: {booking_id} - {request.patient_name} with {request.doctor} on {request.date} at {normalized_time}")

        # ─── Send ALL notifications (same as regular booking) ───
        try:
            from services.notification_service import (
                send_email_notification,
                notify_doctor_whatsapp,
                notify_staff_new_appointment,
            )
            from services.msg91_whatsapp import send_diagyn_appointment_confirmation

            # 1. WhatsApp to PATIENT
            try:
                await send_diagyn_appointment_confirmation(
                    phone=request.patient_phone,
                    patient_name=request.patient_name,
                    date=request.date,
                    time=normalized_time or request.time,
                    doctor_name=request.doctor,
                    clinic_name=request.clinic,
                    booking_id=booking_id,
                    db=db
                )
                logger.info(f"[VOICE] Patient WhatsApp sent for booking {booking_id}")
            except Exception as e:
                logger.warning(f"[VOICE] Patient WhatsApp failed: {e}")

            # 2. WhatsApp to DOCTOR
            try:
                await notify_doctor_whatsapp(request.doctor, {
                    "clinic": request.clinic, "date": request.date,
                    "time": normalized_time or request.time,
                    "patient_name": request.patient_name,
                    "patient_phone": request.patient_phone,
                    "booking_id": booking_id, "booked_by": "Voice Booking"
                }, "voice")
                logger.info(f"[VOICE] Doctor WhatsApp sent for booking {booking_id}")
            except Exception as e:
                logger.warning(f"[VOICE] Doctor WhatsApp failed: {e}")

            # 3. WhatsApp to STAFF
            try:
                await notify_staff_new_appointment({
                    "doctor": request.doctor,
                    "clinic": request.clinic,
                    "date": request.date,
                    "time": normalized_time or request.time,
                    "patient_name": request.patient_name,
                    "patient_phone": request.patient_phone,
                    "booking_id": booking_id,
                    "appointment_type": "NORMAL",
                    "booked_by": "Voice Booking",
                })
                logger.info(f"[VOICE] Staff WhatsApp sent for booking {booking_id}")
            except Exception as e:
                logger.warning(f"[VOICE] Staff WhatsApp failed: {e}")

            # 4. Email to PATIENT (if email provided)
            if request.patient_email:
                try:
                    from services.email_templates import appointment_confirmation_email, generic_notification_email
                    
                    # Admin email
                    admin_details = {
                        'Doctor': request.doctor, 'Clinic': request.clinic,
                        'Date': request.date, 'Time': normalized_time or request.time,
                        'Patient': request.patient_name, 'Phone': request.patient_phone,
                        'Email': request.patient_email, 'Source': 'Voice Booking',
                    }
                    from services.email_templates import STAFF_BANNER
                    admin_html = generic_notification_email(
                        title=f"New Voice Booking - #{booking_id}",
                        message=f"A new appointment has been booked via Voice by {request.patient_name}.",
                        details=admin_details,
                        cta_text="Open Staff Portal",
                        cta_url="https://nevikacura.com/diagyn-staff",
                        illustration=STAFF_BANNER.get("diagyn", ""),
                        palette="diagyn",
                    )
                    # Patient email
                    patient_html = appointment_confirmation_email(
                        patient_name=request.patient_name,
                        booking_id=booking_id,
                        doctor_name=request.doctor,
                        clinic_name=request.clinic,
                        appointment_date=request.date,
                        session="",
                        time_slot=normalized_time or request.time,
                        amount="",
                    )
                    await send_email_notification(
                        f"New Appointment (Voice) - {request.doctor} on {request.date} ({booking_id})",
                        admin_html,
                        patient_email=request.patient_email,
                        patient_subject=f"Booking Confirmed: #{booking_id} | {request.doctor} on {request.date}",
                        patient_html=patient_html,
                    )
                    logger.info(f"[VOICE] Patient email sent for booking {booking_id}")
                except Exception as e:
                    logger.warning(f"[VOICE] Patient email failed: {e}")

        except Exception as notif_err:
            logger.error(f"[VOICE] Notification pipeline error: {notif_err}")

        return {
            "success": True,
            "booking_id": booking_id,
            "appointment_id": appointment_id,
            "doctor": request.doctor,
            "clinic": request.clinic,
            "date": request.date,
            "time": normalized_time,
            "patient_name": request.patient_name,
            "message": f"Appointment booked! Your booking ID is #{booking_id}"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Voice booking confirm error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Booking failed: {str(e)}")


@router.get("/doctors")
async def get_available_doctors():
    """Get available doctors for voice booking suggestions"""
    if db is None:
        return {"doctors": []}
    try:
        doctors = await db.doctors.find(
            {"active": {"$ne": False}},
            {"_id": 0, "name": 1, "specialization": 1, "clinic": 1}
        ).to_list(50)
        return {"doctors": doctors}
    except Exception:
        return {"doctors": [
            {"name": "Dr. Vikas", "specialization": "Gynecologist", "clinic": "Pushpa Clinic"},
            {"name": "Dr. Neha", "specialization": "Gynecologist", "clinic": "Amnion Clinic"},
        ]}
