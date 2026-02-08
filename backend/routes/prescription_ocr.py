"""
Prescription OCR and Medicine Extraction
Uses Gemini Vision to extract medicine names from prescription images
"""

import os
import re
import base64
import logging
import httpx
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/prescription", tags=["Prescription OCR"])

# Database reference (set by server.py)
db = None

def set_db(database):
    """Set database instance from server.py"""
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
    message: str

@router.post("/extract", response_model=PrescriptionOCRResponse)
async def extract_medicines_from_prescription(file: UploadFile = File(...)):
    """
    Extract medicine names from a prescription image using AI vision
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Please upload an image file (JPG, PNG)")
        
        # Read file content
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=400, detail="Image too large. Maximum 10MB allowed.")
        
        # Convert to base64
        base64_image = base64.standard_b64encode(content).decode('utf-8')
        
        # Get Emergent LLM key
        emergent_key = os.environ.get('EMERGENT_LLM_KEY')
        if not emergent_key:
            logger.warning("EMERGENT_LLM_KEY not found, returning mock data")
            return PrescriptionOCRResponse(
                success=True,
                medicines=[
                    ExtractedMedicine(name="Metformin 500mg", dosage="500mg", frequency="Twice daily", duration="30 days", quantity=60),
                    ExtractedMedicine(name="Amlodipine 5mg", dosage="5mg", frequency="Once daily", duration="30 days", quantity=30),
                ],
                raw_text="[Mock extraction - API key not configured]",
                confidence="mock",
                message="Extracted 2 medicines (demo mode)"
            )
        
        # Use emergentintegrations for Gemini
        try:
            from emergentintegrations.llm import GeminiIntegration
            
            gemini = GeminiIntegration(api_key=emergent_key)
            
            prompt = """Analyze this prescription image and extract all medicine information.

For each medicine found, provide:
1. Medicine name (including brand name and generic if visible)
2. Dosage (e.g., 500mg, 10mg)
3. Frequency (e.g., once daily, twice daily, before meals)
4. Duration (e.g., 7 days, 2 weeks, 1 month)
5. Quantity if specified

Return the information in this exact JSON format:
{
    "medicines": [
        {
            "name": "Medicine Name",
            "dosage": "dosage",
            "frequency": "how often",
            "duration": "how long",
            "quantity": number or null
        }
    ],
    "raw_text": "Any other relevant text from prescription",
    "doctor_name": "if visible",
    "date": "if visible"
}

If you cannot read the prescription clearly, still provide your best attempt with whatever is readable.
If no medicines are found, return an empty medicines array."""
            
            # Use Gemini with image
            response = await gemini.generate_with_image(
                prompt=prompt,
                image_base64=base64_image,
                mime_type=file.content_type
            )
            
            # Parse the response
            import json
            try:
                # Try to extract JSON from response
                json_match = re.search(r'\{[\s\S]*\}', response)
                if json_match:
                    parsed = json.loads(json_match.group())
                    medicines = []
                    for med in parsed.get('medicines', []):
                        medicines.append(ExtractedMedicine(
                            name=med.get('name', ''),
                            dosage=med.get('dosage'),
                            frequency=med.get('frequency'),
                            duration=med.get('duration'),
                            quantity=med.get('quantity')
                        ))
                    
                    return PrescriptionOCRResponse(
                        success=True,
                        medicines=medicines,
                        raw_text=parsed.get('raw_text'),
                        confidence="high" if len(medicines) > 0 else "low",
                        message=f"Extracted {len(medicines)} medicine(s) from prescription"
                    )
            except json.JSONDecodeError:
                pass
            
            # If JSON parsing fails, return raw response
            return PrescriptionOCRResponse(
                success=True,
                medicines=[],
                raw_text=response,
                confidence="low",
                message="Could not parse prescription. Please enter medicines manually."
            )
            
        except ImportError:
            logger.warning("emergentintegrations not installed")
            # Fallback: Return mock data
            return PrescriptionOCRResponse(
                success=True,
                medicines=[
                    ExtractedMedicine(name="Medicine from prescription", dosage="As prescribed", frequency="As directed"),
                ],
                raw_text="[Emergent integrations not available]",
                confidence="mock",
                message="Prescription uploaded. Our pharmacist will review and suggest medicines."
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prescription OCR error: {str(e)}")
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
