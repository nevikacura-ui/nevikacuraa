"""
AI Prescription Service
- AI-powered prescription suggestions based on chief complaints
- Handwritten prescription OCR to typed text
- Voice-to-Prescription dictation
- Uses GPT-4o vision for image analysis
- Uses Whisper for speech-to-text
"""

import os
import base64
import json
import logging
from typing import Optional, Dict, List
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
from emergentintegrations.llm.openai import OpenAISpeechToText
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Get API key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# ============ AI PRESCRIPTION SUGGESTIONS ============

async def get_ai_prescription_suggestions(
    chief_complaints: str,
    patient_age: str = "",
    template_type: str = "general",
    doctor_specialty: str = "",
    previous_prescriptions: List[Dict] = None
) -> Dict:
    """
    AI analyzes chief complaints and suggests diagnosis, medicines, investigations
    """
    try:
        if not EMERGENT_LLM_KEY:
            logger.error("EMERGENT_LLM_KEY not configured")
            return {"success": False, "error": "AI service not configured"}
        
        # Build context from previous prescriptions
        prescription_context = ""
        if previous_prescriptions and len(previous_prescriptions) > 0:
            prescription_context = "\n\nPrevious prescription patterns for similar cases:\n"
            for rx in previous_prescriptions[:5]:
                prescription_context += f"- Diagnosis: {rx.get('diagnosis', 'N/A')}, Medicines: {', '.join([m.get('name', '') for m in rx.get('medicines', [])])}\n"
        
        # System prompt for medical suggestions
        system_prompt = f"""You are an AI assistant for {doctor_specialty or 'a doctor'} helping with prescription suggestions.
Based on the chief complaints, suggest appropriate:
1. Possible diagnosis (1-2 most likely)
2. Medicines with dosage, frequency, duration
3. Investigations if needed
4. General advice

Template type: {template_type}
{f'Patient age: {patient_age} years' if patient_age else ''}
{prescription_context}

IMPORTANT: 
- Suggest commonly used medicines in Indian market
- Use standard frequencies: OD (once daily), BD (twice daily), TDS (three times daily), SOS (as needed)
- Duration in days
- Be conservative and safe in suggestions

Respond in JSON format:
{{
    "diagnosis": "Primary diagnosis",
    "differential": ["Other possible diagnoses"],
    "medicines": [
        {{"name": "Medicine Name", "dosage": "500mg", "frequency": "BD", "duration": "5 days", "timing": "After food"}}
    ],
    "investigations": ["Test 1", "Test 2"],
    "advice": "General advice for patient"
}}"""
        
        # Initialize chat
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"ai-rx-{os.urandom(4).hex()}",
            system_message=system_prompt
        ).with_model("openai", "gpt-4o")
        
        # Send request
        user_message = UserMessage(
            text=f"Chief Complaints: {chief_complaints}\n\nPlease suggest appropriate prescription."
        )
        
        response = await chat.send_message(user_message)
        
        # Parse response
        try:
            # Clean response - remove markdown code blocks if present
            clean_response = response.strip()
            if clean_response.startswith("```json"):
                clean_response = clean_response[7:]
            if clean_response.startswith("```"):
                clean_response = clean_response[3:]
            if clean_response.endswith("```"):
                clean_response = clean_response[:-3]
            
            suggestions = json.loads(clean_response.strip())
            return {
                "success": True,
                "suggestions": suggestions
            }
        except json.JSONDecodeError:
            # Return raw text if JSON parsing fails
            return {
                "success": True,
                "suggestions": {"raw_response": response}
            }
            
    except Exception as e:
        logger.error(f"AI suggestion error: {e}")
        return {"success": False, "error": str(e)}


# ============ HANDWRITTEN PRESCRIPTION OCR ============

async def extract_handwritten_prescription(
    image_base64: str,
    doctor_name: str = ""
) -> Dict:
    """
    Extract text from handwritten prescription image using GPT-4o vision
    """
    try:
        if not EMERGENT_LLM_KEY:
            logger.error("EMERGENT_LLM_KEY not configured")
            return {"success": False, "error": "AI service not configured"}
        
        # Clean base64 string
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        
        # System prompt for OCR
        system_prompt = """You are an expert medical prescription reader. Analyze the handwritten prescription image and extract:
1. All medicines with their dosages, frequencies, and durations
2. Any diagnosis or chief complaints mentioned
3. Investigations advised
4. Advice or instructions

IMPORTANT:
- Read handwritten text carefully, even if messy
- Identify medicine names (may be abbreviated)
- Standard frequencies: OD, BD, TDS, QID, SOS, HS
- If unsure about a word, provide your best interpretation with [?]

Respond in JSON format:
{
    "extracted_text": "Full transcription of visible text",
    "chief_complaints": "Extracted complaints if visible",
    "diagnosis": "Diagnosis if mentioned",
    "medicines": [
        {"name": "Medicine Name", "dosage": "dose", "frequency": "freq", "duration": "days", "timing": "timing", "notes": "any special instructions"}
    ],
    "investigations": ["Test 1", "Test 2"],
    "advice": "Any advice written",
    "confidence": "high/medium/low",
    "uncertain_items": ["Items that were hard to read"]
}"""
        
        # Initialize chat with vision model
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"ocr-{os.urandom(4).hex()}",
            system_message=system_prompt
        ).with_model("openai", "gpt-4o")
        
        # Create image content
        image_content = ImageContent(image_base64=image_base64)
        
        # Send request with image
        user_message = UserMessage(
            text=f"Please read this handwritten prescription{f' from {doctor_name}' if doctor_name else ''} and extract all information.",
            file_contents=[image_content]
        )
        
        response = await chat.send_message(user_message)
        
        # Parse response
        try:
            clean_response = response.strip()
            if clean_response.startswith("```json"):
                clean_response = clean_response[7:]
            if clean_response.startswith("```"):
                clean_response = clean_response[3:]
            if clean_response.endswith("```"):
                clean_response = clean_response[:-3]
            
            extracted_data = json.loads(clean_response.strip())
            return {
                "success": True,
                "data": extracted_data
            }
        except json.JSONDecodeError:
            return {
                "success": True,
                "data": {"raw_response": response, "extracted_text": response}
            }
            
    except Exception as e:
        logger.error(f"OCR extraction error: {e}")
        return {"success": False, "error": str(e)}


# ============ LETTERHEAD DATA ============

LETTERHEAD_CONFIG = {
    "dr_vikas": {
        "doctor_name": "Dr. Vikas Vinod Jha",
        "qualifications": "M.B.B.S (MUMBAI), C. DIABETES (RSSDI, DELHI), DIP. IN DIABETOLOGY (CARDIFF, U.K)",
        "specialty": "PHYSICIAN & DIABETOLOGIST",
        "registration": "REG: MMC/2015/04/1523",
        "clinic_name": "DIAGYN DIABETES CENTRE",
        "tagline": "MANAGING DIABETES TOGETHER",
        "phone": "+91 7039030030",
        "website": "www.nevikacura.com",
        "clinics": [
            {"name": "Amnion Clinic", "address": "Infinity Mall, Malad West", "hours": "Mon-Sat: 10AM-1PM"},
            {"name": "Pushpa Clinic", "address": "Near Pushpa Park, Malad East", "hours": "Mon-Sat: 5PM-9PM"}
        ],
        "colors": {
            "primary": "#1B8A7A",  # Teal
            "secondary": "#F59E0B",  # Orange/Yellow accent
            "text": "#1F2937"
        }
    },
    "dr_neha": {
        "doctor_name": "Dr. Neha Patel (Jha)",
        "qualifications": "M.B.B.S, M.D (OBG), D.G.O, F.I.C.O.G",
        "specialty": "CONSULTANT GYNECOLOGIST & OBSTETRICIAN",
        "registration": "REG: MMC/2010/06/0892",
        "clinic_name": "DIAGYN CENTRE WOMEN HEALTH",
        "tagline": "Complete Women's Healthcare",
        "phone": "+91 7039030030",
        "website": "www.nevikacura.com",
        "clinics": [
            {"name": "Amnion Clinic", "address": "Infinity Mall, Malad West", "hours": "Mon-Sat: 11AM-2PM"},
            {"name": "Pushpa Clinic", "address": "Near Pushpa Park, Malad East", "hours": "Mon-Sat: 6PM-9PM"}
        ],
        "colors": {
            "primary": "#EC4899",  # Pink
            "secondary": "#8B5CF6",  # Purple accent
            "text": "#1F2937"
        }
    }
}

def get_letterhead_config(doctor_username: str) -> Dict:
    """Get letterhead configuration for a doctor"""
    if "vikas" in doctor_username.lower():
        return LETTERHEAD_CONFIG["dr_vikas"]
    elif "neha" in doctor_username.lower():
        return LETTERHEAD_CONFIG["dr_neha"]
    else:
        # Default to Dr. Vikas
        return LETTERHEAD_CONFIG["dr_vikas"]


# ============ VOICE-TO-PRESCRIPTION ============

async def transcribe_voice_to_prescription(
    audio_bytes: bytes,
    doctor_specialty: str = ""
) -> Dict:
    """
    Transcribe doctor's voice dictation and convert to structured prescription
    Uses Whisper for STT + GPT-4o for structuring
    """
    try:
        if not EMERGENT_LLM_KEY:
            logger.error("EMERGENT_LLM_KEY not configured")
            return {"success": False, "error": "AI service not configured"}
        
        # Step 1: Transcribe audio using Whisper
        import io
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        
        # Create file-like object from bytes
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = "recording.webm"  # Required for format detection
        
        # Transcribe with medical context prompt
        response = await stt.transcribe(
            file=audio_file,
            model="whisper-1",
            response_format="json",
            language="en",
            prompt="Medical prescription dictation. Includes medicine names, dosages like 500mg, frequencies like OD BD TDS, patient symptoms, diagnosis.",
            temperature=0.0
        )
        
        transcribed_text = response.text
        logger.info(f"Transcribed text: {transcribed_text[:200]}...")
        
        if not transcribed_text or len(transcribed_text.strip()) < 10:
            return {
                "success": False,
                "error": "Could not transcribe audio. Please speak clearly and try again."
            }
        
        # Step 2: Structure the transcription into prescription format using GPT-4o
        system_prompt = f"""You are a medical transcription assistant for a {doctor_specialty or 'doctor'}.
Convert the following voice dictation into a structured prescription format.

Extract:
1. Chief complaints mentioned
2. Diagnosis
3. Medicines with dosages, frequencies (OD/BD/TDS/QID/SOS), and duration
4. Investigations advised
5. Advice for patient

Common abbreviations:
- OD = Once daily, BD = Twice daily, TDS = Three times daily
- mg = milligrams, ml = milliliters
- Tab = Tablet, Cap = Capsule, Syp = Syrup, Inj = Injection

Respond in JSON format:
{{
    "transcribed_text": "Original transcription",
    "chief_complaints": "Extracted complaints",
    "diagnosis": "Diagnosis mentioned",
    "medicines": [
        {{"name": "Medicine Name", "dosage": "dose", "frequency": "freq", "duration": "days", "timing": "timing"}}
    ],
    "investigations": ["Test 1", "Test 2"],
    "advice": "Any advice mentioned",
    "follow_up": "Follow-up if mentioned"
}}"""

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"voice-rx-{os.urandom(4).hex()}",
            system_message=system_prompt
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(
            text=f"Voice dictation to structure:\n\n{transcribed_text}"
        )
        
        structured_response = await chat.send_message(user_message)
        
        # Parse structured response
        try:
            clean_response = structured_response.strip()
            if clean_response.startswith("```json"):
                clean_response = clean_response[7:]
            if clean_response.startswith("```"):
                clean_response = clean_response[3:]
            if clean_response.endswith("```"):
                clean_response = clean_response[:-3]
            
            structured_data = json.loads(clean_response.strip())
            structured_data["transcribed_text"] = transcribed_text
            
            return {
                "success": True,
                "data": structured_data
            }
        except json.JSONDecodeError:
            # Return with just the transcription
            return {
                "success": True,
                "data": {
                    "transcribed_text": transcribed_text,
                    "raw_response": structured_response
                }
            }
            
    except Exception as e:
        logger.error(f"Voice transcription error: {e}")
        return {"success": False, "error": str(e)}

