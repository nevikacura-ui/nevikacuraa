"""
Phase 3 Enhancement APIs - Voice Assistant, Teleconsultation, Insurance
"""
from fastapi import APIRouter, HTTPException, Depends, Header, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timezone
import jwt
import os
import json
import uuid
import base64
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/features", tags=["Phase 3 Features"])

JWT_SECRET = os.environ.get('JWT_SECRET', 'your_jwt_secret_here')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Database reference
db = None

def set_db(database):
    global db
    db = database

async def get_patient_from_token(authorization: str = Header(None)):
    """Extract patient info from JWT token"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        token = authorization.split(' ')[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ Multi-language Voice Assistant (#29) ============
class VoiceCommand(BaseModel):
    text: str
    language: str = "en"  # en, hi, mr
    intent: Optional[str] = None

@router.post("/voice/transcribe")
async def transcribe_voice(
    audio: UploadFile = File(...),
    language: str = Form("en"),
    patient = Depends(get_patient_from_token)
):
    """Transcribe voice to text using Whisper"""
    try:
        from emergentintegrations.llm.openai import OpenAISpeechToText
        
        # Read audio file
        audio_content = await audio.read()
        
        # Initialize STT
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        
        # Create a temporary file-like object
        import io
        audio_file = io.BytesIO(audio_content)
        audio_file.name = audio.filename or "audio.webm"
        
        # Transcribe
        response = await stt.transcribe(
            file=audio_file,
            model="whisper-1",
            language=language if language != "auto" else None,
            response_format="json"
        )
        
        return {
            "success": True,
            "text": response.text,
            "language": language,
            "ai_powered": True
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "text": "",
            "ai_powered": False
        }

@router.post("/voice/process-command")
async def process_voice_command(command: VoiceCommand, patient = Depends(get_patient_from_token)):
    """Process voice command and extract intent"""
    patient_phone = patient.get("phone") or patient.get("sub")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Language-specific system prompts
        language_prompts = {
            "en": "You are a healthcare appointment booking assistant.",
            "hi": "आप एक हेल्थकेयर अपॉइंटमेंट बुकिंग सहायक हैं। Respond in Hindi.",
            "mr": "तुम्ही हेल्थकेयर अपॉइंटमेंट बुकिंग सहाय्यक आहात. मराठीत उत्तर द्या."
        }
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"voice-{patient_phone}-{datetime.now().timestamp()}",
            system_message=f"""{language_prompts.get(command.language, language_prompts['en'])}
            
            Extract the intent from user's voice command. Available intents:
            - book_appointment: User wants to book an appointment
            - cancel_appointment: User wants to cancel
            - check_status: User wants to check appointment status
            - find_doctor: User wants to find a doctor
            - pharmacy_order: User wants to order medicine
            - lab_test: User wants to book a lab test
            - emergency: Emergency situation
            - general_query: General question
            
            Available doctors:
            - Dr. Vikas Jha (Diabetologist, General Physician) at Pushpa Clinic and Amnion Clinic
            - Dr. Neha Patel (OBGYN) at Pushpa Clinic and Amnion Clinic
            
            Respond in JSON with: intent, doctor (if mentioned), date (if mentioned), time (if mentioned), response_text (friendly response in user's language)"""
        ).with_model("openai", "gpt-4o")
        
        response = await chat.send_message(UserMessage(text=f"User said: {command.text}"))
        
        # Parse response
        try:
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                json_str = response.split("```")[1].split("```")[0]
            else:
                json_str = response
            result = json.loads(json_str)
        except Exception:
            result = {
                "intent": "general_query",
                "response_text": "I understood your request. How can I help you?" if command.language == "en" else 
                                "मैंने आपका अनुरोध समझ लिया। मैं आपकी कैसे मदद कर सकता हूं?" if command.language == "hi" else
                                "मला तुमची विनंती समजली. मी तुम्हाला कशी मदत करू शकतो?"
            }
        
        return {
            "success": True,
            "intent": result.get("intent", "general_query"),
            "extracted_data": {
                "doctor": result.get("doctor"),
                "date": result.get("date"),
                "time": result.get("time"),
                "specialty": result.get("specialty")
            },
            "response_text": result.get("response_text", ""),
            "language": command.language,
            "ai_powered": True
        }
        
    except Exception as e:
        # Fallback response
        responses = {
            "en": "I'm having trouble processing your request. Please try again.",
            "hi": "मुझे आपके अनुरोध को समझने में समस्या हो रही है। कृपया पुनः प्रयास करें।",
            "mr": "मला तुमची विनंती समजण्यात अडचण येत आहे. कृपया पुन्हा प्रयत्न करा."
        }
        return {
            "success": False,
            "intent": "unknown",
            "response_text": responses.get(command.language, responses["en"]),
            "ai_powered": False,
            "error": str(e)
        }

@router.post("/voice/book-appointment")
async def voice_book_appointment(
    doctor: str,
    date: str,
    time: str,
    language: str = "en",
    patient = Depends(get_patient_from_token)
):
    """Book appointment via voice command"""
    patient_phone = patient.get("phone") or patient.get("sub")
    
    # Get patient info
    patient_name = "Patient"
    if db is not None:
        patient_data = await db.patients.find_one({"phone": patient_phone})
        if patient_data:
            patient_name = patient_data.get("name", "Patient")
    
    # Create appointment
    appointment_id = str(uuid.uuid4())[:8]

    if db is not None:
        from routes.appointment_routes import assert_slot_not_blocked
        await assert_slot_not_blocked(db, doctor, date, time, source="voice_command", patient_name=patient_name, patient_phone=patient_phone)

    appointment = {
        "id": appointment_id,
        "patient_name": patient_name,
        "patient_phone": patient_phone,
        "doctor": doctor,
        "date": date,
        "time": time,
        "status": "Booked",
        "booked_via": "voice_assistant",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if db is not None:
        await db.appointments.insert_one(appointment)
        appointment.pop("_id", None)
    
    # Generate confirmation in user's language
    confirmations = {
        "en": f"Your appointment with {doctor} has been booked for {date} at {time}. Appointment ID: {appointment_id}",
        "hi": f"{doctor} के साथ आपकी अपॉइंटमेंट {date} को {time} बजे बुक हो गई है। अपॉइंटमेंट आईडी: {appointment_id}",
        "mr": f"{doctor} सोबत तुमची अपॉइंटमेंट {date} रोजी {time} वाजता बुक झाली आहे. अपॉइंटमेंट आयडी: {appointment_id}"
    }
    
    return {
        "success": True,
        "appointment_id": appointment_id,
        "confirmation": confirmations.get(language, confirmations["en"]),
        "details": appointment
    }

# ============ Teleconsultation (#12, #13) ============
class TeleconsultationRequest(BaseModel):
    doctor_id: str
    preferred_date: str
    preferred_time: str
    reason: str
    consultation_type: str = "video"  # video, audio, chat

@router.post("/teleconsult/request")
async def request_teleconsultation(request: TeleconsultationRequest, patient = Depends(get_patient_from_token)):
    """Request a teleconsultation appointment"""
    patient_phone = patient.get("phone") or patient.get("sub")
    
    consultation_id = str(uuid.uuid4())[:8]
    
    # Map doctor IDs to names
    doctors = {
        "doc_vikas": {"name": "Dr. Vikas Jha", "specialty": "Diabetologist"},
        "doc_neha": {"name": "Dr. Neha Patel", "specialty": "OBGYN"}
    }
    
    doctor_info = doctors.get(request.doctor_id, {"name": "Doctor", "specialty": "General"})
    
    consultation = {
        "id": consultation_id,
        "patient_phone": patient_phone,
        "doctor_id": request.doctor_id,
        "doctor_name": doctor_info["name"],
        "specialty": doctor_info["specialty"],
        "date": request.preferred_date,
        "time": request.preferred_time,
        "reason": request.reason,
        "type": request.consultation_type,
        "status": "pending",
        "meeting_link": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if db is not None:
        await db.teleconsultations.insert_one(consultation)
    
    return {
        "success": True,
        "consultation_id": consultation_id,
        "status": "pending",
        "message": f"Your {request.consultation_type} consultation request with {doctor_info['name']} has been submitted. You will receive a confirmation shortly.",
        "estimated_fee": 500 if request.consultation_type == "video" else 300
    }

@router.get("/teleconsult/upcoming")
async def get_upcoming_teleconsultations(patient = Depends(get_patient_from_token)):
    """Get upcoming teleconsultations"""
    patient_phone = patient.get("phone") or patient.get("sub")
    
    consultations = []
    if db is not None:
        cursor = db.teleconsultations.find({
            "patient_phone": patient_phone,
            "status": {"$in": ["pending", "confirmed"]}
        }).sort("date", 1)
        consultations = await cursor.to_list(10)
        # Remove _id
        consultations = [{k: v for k, v in c.items() if k != '_id'} for c in consultations]
    
    return {
        "success": True,
        "consultations": consultations
    }

@router.post("/teleconsult/{consultation_id}/join")
async def join_teleconsultation(consultation_id: str, patient = Depends(get_patient_from_token)):
    """Get meeting link for teleconsultation"""
    # In production, this would integrate with a video service like Daily.co, Twilio, etc.
    return {
        "success": True,
        "meeting_link": f"https://meet.nevikacura.com/{consultation_id}",
        "join_instructions": "Click the link to join your video consultation. Make sure your camera and microphone are enabled.",
        "waiting_room": True
    }

# ============ Insurance Integration (#26, #42) ============
class InsuranceClaim(BaseModel):
    insurance_provider: str
    policy_number: str
    claim_type: str  # consultation, pharmacy, lab_test, hospitalization
    amount: float
    description: str
    documents: Optional[List[str]] = []

@router.post("/insurance/verify")
async def verify_insurance(
    provider: str,
    policy_number: str,
    patient = Depends(get_patient_from_token)
):
    """Verify insurance policy and get coverage details"""
    # In production, this would call insurance provider APIs
    
    # Mock insurance data
    insurance_providers = {
        "star_health": {
            "name": "Star Health Insurance",
            "coverage": {
                "consultation": {"covered": True, "limit": 2000, "copay": 10},
                "pharmacy": {"covered": True, "limit": 5000, "copay": 20},
                "lab_test": {"covered": True, "limit": 10000, "copay": 15},
                "hospitalization": {"covered": True, "limit": 500000, "copay": 10}
            }
        },
        "hdfc_ergo": {
            "name": "HDFC ERGO Health Insurance",
            "coverage": {
                "consultation": {"covered": True, "limit": 1500, "copay": 15},
                "pharmacy": {"covered": True, "limit": 3000, "copay": 25},
                "lab_test": {"covered": True, "limit": 8000, "copay": 20},
                "hospitalization": {"covered": True, "limit": 300000, "copay": 15}
            }
        },
        "icici_lombard": {
            "name": "ICICI Lombard Health Insurance",
            "coverage": {
                "consultation": {"covered": True, "limit": 2500, "copay": 10},
                "pharmacy": {"covered": True, "limit": 4000, "copay": 20},
                "lab_test": {"covered": True, "limit": 12000, "copay": 10},
                "hospitalization": {"covered": True, "limit": 400000, "copay": 10}
            }
        }
    }
    
    provider_data = insurance_providers.get(provider.lower().replace(" ", "_"))
    
    if not provider_data:
        return {
            "success": False,
            "verified": False,
            "message": "Insurance provider not found in our network"
        }
    
    return {
        "success": True,
        "verified": True,
        "policy_number": policy_number,
        "provider": provider_data["name"],
        "coverage": provider_data["coverage"],
        "status": "active",
        "valid_until": "2026-12-31"
    }

@router.post("/insurance/preauth")
async def request_preauthorization(
    claim: InsuranceClaim,
    patient = Depends(get_patient_from_token)
):
    """Request pre-authorization for treatment"""
    patient_phone = patient.get("phone") or patient.get("sub")
    
    preauth_id = f"PA{str(uuid.uuid4())[:6].upper()}"
    
    preauth_request = {
        "id": preauth_id,
        "patient_phone": patient_phone,
        "insurance_provider": claim.insurance_provider,
        "policy_number": claim.policy_number,
        "claim_type": claim.claim_type,
        "amount": claim.amount,
        "description": claim.description,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if db is not None:
        await db.insurance_preauth.insert_one(preauth_request)
    
    return {
        "success": True,
        "preauth_id": preauth_id,
        "status": "pending",
        "estimated_approval_time": "24-48 hours",
        "message": f"Pre-authorization request submitted. Reference: {preauth_id}"
    }

@router.post("/insurance/claim")
async def submit_insurance_claim(claim: InsuranceClaim, patient = Depends(get_patient_from_token)):
    """Submit insurance claim for reimbursement"""
    patient_phone = patient.get("phone") or patient.get("sub")
    
    claim_id = f"CLM{str(uuid.uuid4())[:6].upper()}"
    
    claim_data = {
        "id": claim_id,
        "patient_phone": patient_phone,
        **claim.dict(),
        "status": "submitted",
        "submitted_at": datetime.now(timezone.utc).isoformat()
    }
    
    if db is not None:
        await db.insurance_claims.insert_one(claim_data)
    
    return {
        "success": True,
        "claim_id": claim_id,
        "status": "submitted",
        "estimated_processing_time": "7-14 working days",
        "message": f"Claim submitted successfully. Track with ID: {claim_id}"
    }

@router.get("/insurance/claims")
async def get_insurance_claims(patient = Depends(get_patient_from_token)):
    """Get all insurance claims for patient"""
    patient_phone = patient.get("phone") or patient.get("sub")
    
    claims = []
    if db is not None:
        cursor = db.insurance_claims.find({"patient_phone": patient_phone}).sort("submitted_at", -1)
        claims = await cursor.to_list(20)
        claims = [{k: v for k, v in c.items() if k != '_id'} for c in claims]
    
    return {
        "success": True,
        "claims": claims
    }

# ============ Health Packages (#12) ============
@router.get("/packages")
async def get_health_packages():
    """Get available health packages"""
    packages = [
        {
            "id": "basic_checkup",
            "name": "Basic Health Checkup",
            "description": "Essential health screening for adults",
            "price": 1499,
            "original_price": 2500,
            "discount": 40,
            "includes": [
                "Complete Blood Count (CBC)",
                "Blood Sugar (Fasting)",
                "Lipid Profile",
                "Liver Function Test",
                "Kidney Function Test",
                "Urine Analysis",
                "Doctor Consultation"
            ],
            "recommended_for": ["Adults 18-40", "Annual checkup"],
            "duration": "2-3 hours"
        },
        {
            "id": "diabetes_care",
            "name": "Diabetes Care Package",
            "description": "Comprehensive diabetes monitoring and consultation",
            "price": 2499,
            "original_price": 4000,
            "discount": 38,
            "includes": [
                "HbA1c",
                "Fasting & PP Blood Sugar",
                "Lipid Profile",
                "Kidney Function Test",
                "Urine Microalbumin",
                "Diabetologist Consultation",
                "Diet Plan",
                "3 Follow-up Calls"
            ],
            "recommended_for": ["Diabetic patients", "Pre-diabetics"],
            "duration": "3-4 hours",
            "doctor": "Dr. Vikas Jha"
        },
        {
            "id": "womens_wellness",
            "name": "Women's Wellness Package",
            "description": "Complete women's health screening",
            "price": 3499,
            "original_price": 5500,
            "discount": 36,
            "includes": [
                "Complete Blood Count",
                "Thyroid Profile",
                "Vitamin D & B12",
                "Iron Studies",
                "Pap Smear",
                "Breast Examination",
                "Pelvic Ultrasound",
                "OBGYN Consultation"
            ],
            "recommended_for": ["Women 25+", "Annual screening"],
            "duration": "4-5 hours",
            "doctor": "Dr. Neha Patel"
        },
        {
            "id": "senior_citizen",
            "name": "Senior Citizen Package",
            "description": "Comprehensive health checkup for seniors",
            "price": 4999,
            "original_price": 8000,
            "discount": 38,
            "includes": [
                "Complete Blood Count",
                "Blood Sugar (Fasting & PP)",
                "HbA1c",
                "Lipid Profile",
                "Liver & Kidney Function",
                "Thyroid Profile",
                "Vitamin D & B12",
                "ECG",
                "Chest X-Ray",
                "Eye Checkup",
                "Doctor Consultation"
            ],
            "recommended_for": ["Adults 60+"],
            "duration": "5-6 hours"
        },
        {
            "id": "maternity",
            "name": "Maternity Care Package",
            "description": "Complete pregnancy care package",
            "price": 24999,
            "original_price": 40000,
            "discount": 38,
            "includes": [
                "All ANC Visits (9 months)",
                "All Routine Blood Tests",
                "3 Ultrasounds",
                "OBGYN Consultations",
                "Delivery Charges",
                "2 Days Hospital Stay",
                "Newborn Checkup",
                "Lactation Support"
            ],
            "recommended_for": ["Expecting mothers"],
            "duration": "9 months",
            "doctor": "Dr. Neha Patel"
        }
    ]
    
    return {
        "success": True,
        "packages": packages
    }

@router.post("/packages/book")
async def book_health_package(
    package_id: str,
    preferred_date: str,
    patient = Depends(get_patient_from_token)
):
    """Book a health package"""
    patient_phone = patient.get("phone") or patient.get("sub")
    
    booking_id = f"PKG{str(uuid.uuid4())[:6].upper()}"
    
    booking = {
        "id": booking_id,
        "patient_phone": patient_phone,
        "package_id": package_id,
        "date": preferred_date,
        "status": "booked",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if db is not None:
        await db.package_bookings.insert_one(booking)
    
    return {
        "success": True,
        "booking_id": booking_id,
        "message": f"Package booked successfully for {preferred_date}. Booking ID: {booking_id}",
        "instructions": "Please arrive 30 minutes early. Fasting required for 8-10 hours before the test."
    }

def setup_routes(database):
    """Setup routes with database"""
    global db
    db = database
    return router
