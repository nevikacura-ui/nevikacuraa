"""
Prescription OCR and Medicine Extraction
Uses Gemini Vision via emergentintegrations to extract medicine names from prescription images
"""

import os
import re
import base64
import json
import logging
import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/prescription", tags=["Prescription OCR"])

db = None

def set_db(database):
    global db
    db = database

class ExtractedMedicine(BaseModel):
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    quantity: Optional[int] = None

class PrescriptionOCRResponse(BaseModel):
    success: bool
    medicines: List[ExtractedMedicine]
    raw_text: Optional[str] = None
    confidence: Optional[str] = None
    doctor_name: Optional[str] = None
    date: Optional[str] = None
    message: str

SYSTEM_PROMPT = """You are a medical prescription OCR expert. You analyze prescription images and extract structured medicine information. Always return valid JSON. Be precise with medicine names, dosages, and frequencies. If handwriting is unclear, provide your best interpretation."""

EXTRACTION_PROMPT = """Analyze this prescription image carefully and extract ALL medicine information.

For each medicine found, provide:
1. Medicine name (brand name + generic if visible)
2. Dosage (e.g., 500mg, 10mg)
3. Frequency (e.g., once daily, twice daily, before meals)
4. Duration (e.g., 7 days, 2 weeks, 1 month)
5. Quantity if specified

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
    "medicines": [
        {
            "name": "Medicine Name",
            "dosage": "dosage or null",
            "frequency": "how often or null",
            "duration": "how long or null",
            "quantity": null
        }
    ],
    "raw_text": "All readable text from the prescription",
    "doctor_name": "Doctor name if visible or null",
    "date": "Prescription date if visible or null"
}

If no medicines are found, return {"medicines": [], "raw_text": "description of what you see", "doctor_name": null, "date": null}."""


@router.post("/extract", response_model=PrescriptionOCRResponse)
async def extract_medicines_from_prescription(file: UploadFile = File(...)):
    """Extract medicine names from a prescription image using Gemini Vision"""
    try:
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Please upload an image file (JPG, PNG, WEBP)")

        content = await file.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image too large. Maximum 10MB allowed.")

        base64_image = base64.standard_b64encode(content).decode('utf-8')

        emergent_key = os.environ.get('EMERGENT_LLM_KEY')
        if not emergent_key:
            logger.warning("EMERGENT_LLM_KEY not configured")
            raise HTTPException(status_code=500, detail="OCR service not configured")

        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

        chat = LlmChat(
            api_key=emergent_key,
            session_id=f"prescription-ocr-{uuid.uuid4().hex[:8]}",
            system_message=SYSTEM_PROMPT
        ).with_model("gemini", "gemini-2.5-flash")

        image_content = ImageContent(image_base64=base64_image)

        user_message = UserMessage(
            text=EXTRACTION_PROMPT,
            file_contents=[image_content]
        )

        response = await chat.send_message(user_message)
        logger.info(f"Gemini OCR response length: {len(response)}")

        # Parse JSON from response
        try:
            # Strip markdown code blocks if present
            cleaned = response.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
                cleaned = re.sub(r'\s*```$', '', cleaned)

            json_match = re.search(r'\{[\s\S]*\}', cleaned)
            if json_match:
                parsed = json.loads(json_match.group())
                medicines = []
                for med in parsed.get('medicines', []):
                    qty = med.get('quantity')
                    if qty is not None:
                        try:
                            qty = int(qty)
                        except (ValueError, TypeError):
                            qty = None
                    medicines.append(ExtractedMedicine(
                        name=med.get('name', 'Unknown Medicine'),
                        dosage=med.get('dosage'),
                        frequency=med.get('frequency'),
                        duration=med.get('duration'),
                        quantity=qty
                    ))

                return PrescriptionOCRResponse(
                    success=True,
                    medicines=medicines,
                    raw_text=parsed.get('raw_text'),
                    confidence="high" if len(medicines) > 0 else "low",
                    doctor_name=parsed.get('doctor_name'),
                    date=parsed.get('date'),
                    message=f"Extracted {len(medicines)} medicine(s) from prescription"
                )
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse JSON from Gemini response: {response[:200]}")

        return PrescriptionOCRResponse(
            success=True,
            medicines=[],
            raw_text=response[:500],
            confidence="low",
            message="Could not parse prescription. Please try a clearer image or enter medicines manually."
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prescription OCR error: {str(e)}", exc_info=True)
        return PrescriptionOCRResponse(
            success=False,
            medicines=[],
            raw_text=None,
            confidence="error",
            message=f"Failed to process prescription: {str(e)}"
        )


@router.get("/common-medicines")
async def get_common_medicines():
    """Get list of commonly prescribed medicines for suggestions"""
    common = [
        {"name": "Paracetamol 500mg", "category": "Pain Relief"},
        {"name": "Metformin 500mg", "category": "Diabetes"},
        {"name": "Amlodipine 5mg", "category": "Blood Pressure"},
        {"name": "Atorvastatin 10mg", "category": "Cholesterol"},
        {"name": "Omeprazole 20mg", "category": "Acidity"},
        {"name": "Cetirizine 10mg", "category": "Allergy"},
        {"name": "Azithromycin 500mg", "category": "Antibiotic"},
        {"name": "Vitamin D3 60000IU", "category": "Supplements"},
        {"name": "B-Complex", "category": "Supplements"},
        {"name": "Calcium + D3", "category": "Supplements"},
    ]
    return {"common_medicines": common}
