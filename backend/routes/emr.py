"""
EMR (Electronic Medical Records) Module
- Trusted Formulary medicine search (1038 curated medicines)
- Vitals recording (BP, Weight, SpO2, Temp, Pulse)
- 1-0-0 dosage pattern support
- Professional Prescription PDF (DiaGyn branded, Blinkit-style layout)
- WhatsApp delivery via MSG91
- AI-powered suggestions, OCR, Voice
"""

from fastapi import APIRouter, HTTPException, Depends, Header, File, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import os
import jwt
import logging
import io
import base64
import httpx
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/emr", tags=["EMR"])

db = None

def set_db(database):
    global db
    db = database

# ============ CONFIG ============
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
MSG91_AUTH_KEY = os.environ.get('MSG91_AUTH_KEY', '')
MSG91_INTEGRATED_NUMBER = os.environ.get('MSG91_INTEGRATED_NUMBER', '917039030030')

# Compliance numbers
DL_NUMBERS = "MH-PL1-610138, MH-PL1-610139"
FSSAI_NUMBER = "21525019003800"

# Doctor profiles
DOCTOR_PROFILES = {
    "vikas": {
        "name": "Dr. Vikas Jha",
        "qualification": "MBBS, MD (Internal Medicine), Fellowship in Diabetology",
        "registration": "MMC-2015/04/1234",
        "specialty": "Diabetologist & Internal Medicine",
        "clinic": "DiaGyn Healthcare",
        "clinic_address": "Mira Road East, Thane, Maharashtra - 401107",
        "phone": "+91-7039030030",
        "email": "dr.vikas@diagynhealthcare.com"
    },
    "neha": {
        "name": "Dr. Neha Patel",
        "qualification": "MBBS, MS (OB-GYN), DNB",
        "registration": "MMC-2016/08/5678",
        "specialty": "Obstetrician & Gynaecologist",
        "clinic": "DiaGyn Healthcare",
        "clinic_address": "Mira Road East, Thane, Maharashtra - 401107",
        "phone": "+91-7039030030",
        "email": "dr.neha@diagynhealthcare.com"
    }
}

def get_doctor_profile(username):
    if "vikas" in username.lower():
        return DOCTOR_PROFILES["vikas"]
    elif "neha" in username.lower():
        return DOCTOR_PROFILES["neha"]
    return DOCTOR_PROFILES["vikas"]

# ============ AUTH ============
async def get_doctor_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        role = payload.get("role", "")
        username = payload.get("username", "")
        is_doctor = role.startswith("dr_") or role == "doctor" or username.startswith("dr_")
        if not is_doctor:
            raise HTTPException(status_code=403, detail="Doctor access required")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ MODELS ============

class Vitals(BaseModel):
    blood_pressure: Optional[str] = ""
    pulse: Optional[str] = ""
    temperature: Optional[str] = ""
    spo2: Optional[str] = ""
    weight: Optional[str] = ""
    height: Optional[str] = ""
    bmi: Optional[str] = ""

class Medicine(BaseModel):
    name: str
    dosage: str  # e.g., "500mg"
    frequency: str  # e.g., "1-0-1" or "BD"
    duration: str  # e.g., "5 days"
    timing: Optional[str] = ""  # "Before food", "After food"
    notes: Optional[str] = ""
    is_formulary: Optional[bool] = False

class DiabetesData(BaseModel):
    fasting_sugar: Optional[str] = ""
    pp_sugar: Optional[str] = ""
    hba1c: Optional[str] = ""
    diet_advice: Optional[str] = ""
    exercise_advice: Optional[str] = ""

class OBGYNData(BaseModel):
    lmp: Optional[str] = ""
    gestational_age: Optional[str] = ""
    edd: Optional[str] = ""
    gravida: Optional[str] = ""
    para: Optional[str] = ""
    chief_complaint_details: Optional[str] = ""

class PrescriptionCreate(BaseModel):
    booking_id: str
    template_type: str  # "diabetes", "obgyn", "general"
    vitals: Optional[Vitals] = None
    chief_complaints: str
    diagnosis: str
    medicines: List[Medicine]
    investigations: Optional[List[str]] = []
    advice: Optional[str] = ""
    diet_advice: Optional[str] = ""
    follow_up_date: Optional[str] = ""
    notes: Optional[str] = ""
    diabetes_data: Optional[DiabetesData] = None
    obgyn_data: Optional[OBGYNData] = None

# ============ FORMULARY ROUTES ============

@router.get("/formulary/search")
async def search_formulary(q: str, limit: int = 20):
    """Search medicines from Orange Select - fast text search across name, composition, company, category"""
    if not q or len(q) < 2:
        return {"medicines": [], "source": "formulary"}

    try:
        projection = {"_id": 0, "id": 1, "name": 1, "form": 1, "manufacturer": 1, "company": 1,
             "mrp": 1, "sale_price": 1, "diagyn_price": 1, "orange_price": 1,
             "composition": 1, "generic_name": 1, "category": 1, "is_formulary": 1,
             "formulary_source": 1, "rx_type": 1}

        # Try $text search first (fastest, uses compound text index)
        try:
            medicines = await db.trusted_formulary.find(
                {"$text": {"$search": q}},
                {**projection, "score": {"$meta": "textScore"}}
            ).sort([("score", {"$meta": "textScore"})]).limit(limit).to_list(limit)
            # Remove score from results
            for m in medicines:
                m.pop("score", None)
            if medicines:
                return {"medicines": medicines, "source": "formulary", "total": len(medicines)}
        except Exception:
            pass

        # Fallback: regex on name only (uses name index)
        medicines = await db.trusted_formulary.find(
            {"name": {"$regex": q, "$options": "i"}},
            projection
        ).sort("name", 1).limit(limit).to_list(limit)

        return {"medicines": medicines, "source": "formulary", "total": len(medicines)}
    except Exception as e:
        logger.error(f"Formulary search error: {e}")
        return {"medicines": [], "source": "formulary"}

@router.get("/formulary/top")
async def get_top_formulary(limit: int = 9):
    """Get top Orange Select medicines for display on storefront"""
    try:
        medicines = await db.trusted_formulary.find(
            {},
            {"_id": 0, "id": 1, "name": 1, "form": 1, "manufacturer": 1, "company": 1,
             "mrp": 1, "sale_price": 1, "orange_price": 1, "category": 1, "formulary_source": 1, "rx_type": 1}
        ).sort("name", 1).limit(limit).to_list(limit)
        return {"medicines": medicines, "total": len(medicines)}
    except Exception as e:
        logger.error(f"Top formulary error: {e}")
        return {"medicines": []}

@router.get("/formulary/all-search")
async def search_all_medicines(q: str, limit: int = 20):
    """Search ALL medicines (582K catalog) - fallback when formulary doesn't have it"""
    if not q or len(q) < 2:
        return {"medicines": [], "source": "all"}

    try:
        medicines = await db.medicines.find(
            {"name": {"$regex": q, "$options": "i"}},
            {"_id": 0, "id": 1, "name": 1, "form": 1, "manufacturer": 1, "company": 1,
             "mrp": 1, "sale_price": 1, "composition": 1, "generic_name": 1,
             "category": 1, "is_formulary": 1}
        ).sort("name", 1).limit(limit).to_list(limit)

        return {"medicines": medicines, "source": "all", "total": len(medicines)}
    except Exception as e:
        logger.error(f"All medicines search error: {e}")
        return {"medicines": [], "source": "all"}

@router.get("/formulary/categories")
async def get_formulary_categories():
    """Get all categories in Orange Select"""
    try:
        pipeline = [
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        result = await db.trusted_formulary.aggregate(pipeline).to_list(100)
        categories = [{"name": r["_id"], "count": r["count"]} for r in result if r["_id"]]
        return {"categories": categories, "total_medicines": sum(c["count"] for c in categories)}
    except Exception as e:
        logger.error(f"Formulary categories error: {e}")
        return {"categories": []}

@router.get("/formulary/by-category/{category}")
async def get_formulary_by_category(category: str, page: int = 1, limit: int = 50):
    """Get Orange Select medicines filtered by category"""
    try:
        skip = (max(1, page) - 1) * limit
        total = await db.trusted_formulary.count_documents({"category": category})
        medicines = await db.trusted_formulary.find(
            {"category": category},
            {"_id": 0, "id": 1, "name": 1, "form": 1, "manufacturer": 1, "company": 1,
             "mrp": 1, "sale_price": 1, "diagyn_price": 1, "orange_price": 1,
             "category": 1, "composition": 1, "generic_name": 1, "formulary_source": 1, "rx_type": 1}
        ).sort("name", 1).skip(skip).limit(limit).to_list(limit)

        return {"medicines": medicines, "total": total, "category": category}
    except Exception as e:
        logger.error(f"Formulary by category error: {e}")
        return {"medicines": [], "total": 0}

# ============ PAGINATED ALL MEDICINES (Infinite Scroll) ============

@router.get("/formulary/all")
async def get_all_formulary(page: int = 1, limit: int = 30, category: str = None):
    """Get all Orange Select medicines with pagination for infinite scroll"""
    try:
        query = {}
        if category and category != "all":
            query["category"] = category
        skip = (max(1, page) - 1) * limit
        total = await db.trusted_formulary.count_documents(query)
        medicines = await db.trusted_formulary.find(
            query,
            {"_id": 0, "id": 1, "name": 1, "form": 1, "manufacturer": 1, "company": 1,
             "mrp": 1, "sale_price": 1, "diagyn_price": 1, "orange_price": 1,
             "category": 1, "composition": 1, "formulary_source": 1, "rx_type": 1}
        ).sort("name", 1).skip(skip).limit(limit).to_list(limit)
        has_more = (skip + limit) < total
        return {"medicines": medicines, "total": total, "page": page, "has_more": has_more}
    except Exception as e:
        logger.error(f"All formulary error: {e}")
        return {"medicines": [], "total": 0, "has_more": False}

# ============ MEDICINE DETAIL + AI DESCRIPTION ============

@router.get("/formulary/detail/{medicine_id}")
async def get_medicine_detail(medicine_id: str):
    """Get medicine detail with AI-generated description, uses, composition, side effects"""
    try:
        med = await db.trusted_formulary.find_one({"id": medicine_id}, {"_id": 0})
        if not med:
            raise HTTPException(status_code=404, detail="Medicine not found")

        # Check if AI info already cached
        if med.get("ai_description"):
            return {"medicine": med}

        # Generate AI info using GPT-5.2
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            llm_key = os.environ.get("EMERGENT_LLM_KEY")
            if llm_key:
                chat = LlmChat(
                    api_key=llm_key,
                    session_id=f"med-detail-{medicine_id}",
                    system_message="You are a licensed pharmacist assistant. Provide accurate, concise medicine information. Return ONLY valid JSON with no markdown formatting."
                ).with_model("openai", "gpt-5.2")

                prompt = f"""For the medicine "{med['name']}" (Form: {med.get('form','')}, Company: {med.get('company','')}, Composition: {med.get('composition','')}):
Return a JSON object with these exact keys:
{{"description": "1-2 sentence description of what this medicine is",
"uses": ["use 1", "use 2", "use 3"],
"composition": "active ingredients and strengths",
"side_effects": ["side effect 1", "side effect 2", "side effect 3"],
"how_to_use": "dosage guidance",
"storage": "storage instructions"}}"""

                response = await chat.send_message(UserMessage(text=prompt))
                import json
                # Clean response - strip markdown code blocks if present
                clean = response.strip()
                if clean.startswith("```"):
                    clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
                if clean.endswith("```"):
                    clean = clean[:-3]
                clean = clean.strip()
                if clean.startswith("json"):
                    clean = clean[4:].strip()

                ai_data = json.loads(clean)
                # Cache in DB
                await db.trusted_formulary.update_one(
                    {"id": medicine_id},
                    {"$set": {
                        "ai_description": ai_data.get("description", ""),
                        "ai_uses": ai_data.get("uses", []),
                        "ai_composition": ai_data.get("composition", ""),
                        "ai_side_effects": ai_data.get("side_effects", []),
                        "ai_how_to_use": ai_data.get("how_to_use", ""),
                        "ai_storage": ai_data.get("storage", ""),
                    }}
                )
                med.update({
                    "ai_description": ai_data.get("description", ""),
                    "ai_uses": ai_data.get("uses", []),
                    "ai_composition": ai_data.get("composition", ""),
                    "ai_side_effects": ai_data.get("side_effects", []),
                    "ai_how_to_use": ai_data.get("how_to_use", ""),
                    "ai_storage": ai_data.get("storage", ""),
                })
        except Exception as ai_err:
            logger.error(f"AI description error: {ai_err}")

        return {"medicine": med}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Medicine detail error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============ MEDICINE VARIANTS (multi-size grouping) ============

@router.get("/formulary/variants/{medicine_id}")
async def get_medicine_variants(medicine_id: str):
    """Get size/form variants of the same medicine for multi-option ADD"""
    try:
        med = await db.trusted_formulary.find_one({"id": medicine_id}, {"_id": 0})
        if not med:
            return {"variants": []}

        # Extract base name (strip numbers, sizes, quantities from end)
        import re
        base = re.sub(r'\s*\d+\s*(mg|ml|gm|g|mcg|tab|cap|kit|kg|l|ltr|sachet|pack|x|strips?)\b.*$', '', med['name'], flags=re.I).strip()
        if len(base) < 3:
            base = med['name']

        # Find similar names
        variants = await db.trusted_formulary.find(
            {"name": {"$regex": f"^{re.escape(base)}", "$options": "i"}, "id": {"$ne": medicine_id}},
            {"_id": 0, "id": 1, "name": 1, "form": 1, "mrp": 1, "sale_price": 1, "orange_price": 1}
        ).limit(5).to_list(5)

        return {"variants": variants, "base_name": base}
    except Exception as e:
        logger.error(f"Variants error: {e}")
        return {"variants": []}

# ============ LEGACY SEARCH (kept for backward compat) ============

@router.get("/medicines/search")
async def search_medicines(q: str, limit: int = 20):
    """Search medicines - now redirects to formulary first"""
    return await search_formulary(q, limit)

# ============ PRESCRIPTION ROUTES ============

@router.get("/appointment/{booking_id}")
async def get_appointment_for_emr(booking_id: str, doctor=Depends(get_doctor_user)):
    appointment = await db.diagyn_appointments.find_one(
        {"$or": [{"booking_id": booking_id}, {"id": booking_id}]},
        {"_id": 0}
    )
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    is_online = (
        appointment.get("clinic", "").lower() == "online consultation" or
        appointment.get("booking_type") == "online_consultation"
    )

    return {
        "booking_id": appointment.get("booking_id") or appointment.get("id"),
        "patient_name": appointment.get("patient_name"),
        "patient_phone": appointment.get("patient_phone"),
        "patient_email": appointment.get("patient_email"),
        "patient_age": appointment.get("patient_age"),
        "patient_gender": appointment.get("patient_gender", ""),
        "doctor_name": appointment.get("doctor"),
        "date": appointment.get("date"),
        "time": appointment.get("time"),
        "clinic": appointment.get("clinic"),
        "status": appointment.get("status"),
        "is_online": is_online,
        "consultation_type": appointment.get("consultation_type"),
        "consultation_fee": appointment.get("consultation_fee"),
        "patient_type": appointment.get("patient_type", "indian")
    }

@router.post("/prescription/create")
async def create_prescription(data: PrescriptionCreate, doctor=Depends(get_doctor_user)):
    appointment = await db.diagyn_appointments.find_one(
        {"$or": [{"booking_id": data.booking_id}, {"id": data.booking_id}]},
        {"_id": 0}
    )
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    doctor_username = doctor.get("sub") or doctor.get("username")
    doc_profile = get_doctor_profile(doctor_username)
    prescription_id = data.booking_id

    prescription = {
        "prescription_id": prescription_id,
        "booking_id": data.booking_id,
        "patient_name": appointment.get("patient_name"),
        "patient_phone": appointment.get("patient_phone"),
        "patient_email": appointment.get("patient_email"),
        "patient_age": appointment.get("patient_age"),
        "patient_gender": appointment.get("patient_gender", ""),
        "doctor_name": doc_profile["name"],
        "doctor_qualification": doc_profile["qualification"],
        "doctor_registration": doc_profile["registration"],
        "doctor_specialty": doc_profile["specialty"],
        "doctor_username": doctor_username,
        "clinic_name": doc_profile["clinic"],
        "clinic_address": doc_profile["clinic_address"],
        "date": appointment.get("date"),
        "time": appointment.get("time"),
        "template_type": data.template_type,
        "vitals": data.vitals.dict() if data.vitals else None,
        "chief_complaints": data.chief_complaints,
        "diagnosis": data.diagnosis,
        "medicines": [m.dict() for m in data.medicines],
        "investigations": data.investigations,
        "advice": data.advice,
        "diet_advice": data.diet_advice,
        "follow_up_date": data.follow_up_date,
        "notes": data.notes,
        "diabetes_data": data.diabetes_data.dict() if data.diabetes_data else None,
        "obgyn_data": data.obgyn_data.dict() if data.obgyn_data else None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "sent_to_patient": False
    }

    await db.emr_prescriptions.update_one(
        {"prescription_id": prescription_id},
        {"$set": prescription},
        upsert=True
    )

    # Smart Redirection: auto-generate links based on prescription content
    smart_links = {}
    if data.medicines and len(data.medicines) > 0:
        med_names = ",".join([m.name for m in data.medicines[:10]])
        smart_links["pharmacy_link"] = f"/pharmacy?rx={prescription_id}&meds={med_names}"
        smart_links["has_medicines"] = True
    if data.investigations and len(data.investigations) > 0:
        test_names = ",".join(data.investigations[:10])
        smart_links["lab_link"] = f"/mango?rx={prescription_id}&tests={test_names}"
        smart_links["has_investigations"] = True

    # Store smart links with prescription
    if smart_links:
        await db.emr_prescriptions.update_one(
            {"prescription_id": prescription_id},
            {"$set": {"smart_links": smart_links}}
        )

    return {
        "success": True,
        "prescription_id": prescription_id,
        "message": "Prescription created successfully",
        "smart_links": smart_links
    }

@router.get("/prescription/{prescription_id}")
async def get_prescription(prescription_id: str, doctor=Depends(get_doctor_user)):
    prescription = await db.emr_prescriptions.find_one(
        {"prescription_id": prescription_id},
        {"_id": 0}
    )
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return prescription

@router.get("/prescriptions/by-doctor")
async def get_prescriptions_by_doctor(doctor=Depends(get_doctor_user)):
    doctor_username = doctor.get("sub") or doctor.get("username")
    prescriptions = await db.emr_prescriptions.find(
        {"doctor_username": doctor_username},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    return {"prescriptions": prescriptions}

# ============ PATIENT-FACING PRESCRIPTION ACCESS ============

@router.get("/patient/prescriptions")
async def get_patient_prescriptions(phone: str):
    """Patient can view their prescriptions by phone number"""
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Valid phone number required")

    prescriptions = await db.emr_prescriptions.find(
        {"patient_phone": {"$regex": phone[-10:]}},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)

    return {
        "success": True,
        "prescriptions": prescriptions,
        "count": len(prescriptions)
    }


@router.get("/patient/prescription/{prescription_id}")
async def get_patient_prescription_detail(prescription_id: str):
    """Patient can view a specific prescription (public access via prescription link)"""
    prescription = await db.emr_prescriptions.find_one(
        {"prescription_id": prescription_id},
        {"_id": 0}
    )
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")

    return {
        "success": True,
        "prescription": prescription,
        "smart_links": prescription.get("smart_links", {})
    }


@router.get("/patient/prescription/{prescription_id}/pdf")
async def get_patient_prescription_pdf(prescription_id: str):
    """Generate/download prescription PDF for patient"""
    prescription = await db.emr_prescriptions.find_one(
        {"prescription_id": prescription_id},
        {"_id": 0}
    )
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")

    try:
        pdf_bytes = build_prescription_pdf(prescription)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="prescription_{prescription_id}.pdf"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


# ============ PDF GENERATION ============

def _hex_color(hex_str):
    hex_str = hex_str.lstrip('#')
    r, g, b = int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16)
    return colors.Color(r / 255.0, g / 255.0, b / 255.0)

DIAGYN_TEAL = _hex_color("#0D9488")
DIAGYN_DARK = _hex_color("#134E4A")
LIGHT_GRAY = _hex_color("#F3F4F6")
BORDER_GRAY = _hex_color("#D1D5DB")
TABLE_HEADER_BG = _hex_color("#0D9488")
TABLE_ALT_ROW = _hex_color("#F0FDFA")

def build_prescription_pdf(prescription: dict) -> bytes:
    """Generate a professional, Blinkit-style Prescription PDF with DiaGyn branding"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=12 * mm, bottomMargin=12 * mm,
        leftMargin=12 * mm, rightMargin=12 * mm
    )
    styles = getSampleStyleSheet()
    elements = []
    W = A4[0] - 24 * mm  # usable width

    # ---- Style definitions ----
    s_brand = ParagraphStyle('Brand', parent=styles['Heading1'], fontSize=22,
                             textColor=DIAGYN_TEAL, fontName='Helvetica-Bold',
                             alignment=TA_LEFT, spaceAfter=0, leading=26)
    _s_tagline = ParagraphStyle('Tagline', parent=styles['Normal'], fontSize=8,
                               textColor=colors.gray, alignment=TA_LEFT, spaceAfter=0)
    s_rx_title = ParagraphStyle('RxTitle', parent=styles['Heading1'], fontSize=22,
                                textColor=DIAGYN_TEAL, fontName='Helvetica-Bold',
                                alignment=TA_RIGHT, spaceAfter=0, leading=26)
    s_section = ParagraphStyle('Section', parent=styles['Heading2'], fontSize=11,
                               textColor=DIAGYN_TEAL, fontName='Helvetica-Bold',
                               spaceBefore=6, spaceAfter=3, leading=14)
    s_normal = ParagraphStyle('N', parent=styles['Normal'], fontSize=9,
                              spaceAfter=1, leading=12)
    s_bold = ParagraphStyle('B', parent=styles['Normal'], fontSize=9,
                            fontName='Helvetica-Bold', spaceAfter=1, leading=12)
    s_small = ParagraphStyle('S', parent=styles['Normal'], fontSize=7.5,
                             textColor=colors.gray, spaceAfter=1, leading=10)
    s_center = ParagraphStyle('C', parent=styles['Normal'], fontSize=9,
                              alignment=TA_CENTER, spaceAfter=1, leading=12)
    s_right = ParagraphStyle('R', parent=styles['Normal'], fontSize=9,
                             alignment=TA_RIGHT, spaceAfter=1, leading=12)
    s_disclaimer = ParagraphStyle('Disc', parent=styles['Normal'], fontSize=7,
                                  textColor=colors.gray, leading=9, spaceAfter=1)

    # ---- 1. HEADER BAND ----
    doc_profile_name = prescription.get('doctor_name', 'Doctor')
    header_left = Paragraph("<b>DiaGyn Healthcare</b>", s_brand)
    header_right = Paragraph("<b>Prescription</b>", s_rx_title)

    header_table = Table(
        [[header_left, header_right]],
        colWidths=[W * 0.55, W * 0.45]
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LINEBELOW', (0, 0), (-1, 0), 1.5, DIAGYN_TEAL),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 2 * mm))

    # ---- 2. SELLER / CLINIC INFO + RX ID BLOCK ----
    clinic_addr = prescription.get('clinic_address', 'Mira Road East, Thane, Maharashtra - 401107')
    rx_id = prescription.get('prescription_id', '')
    rx_date = prescription.get('date', datetime.now().strftime('%d-%b-%Y'))

    seller_text = (
        f"<b>{prescription.get('clinic_name', 'DiaGyn Healthcare')}</b><br/>"
        f"{clinic_addr}<br/>"
        f"<b>Drug License:</b> {DL_NUMBERS}<br/>"
        f"<b>FSSAI:</b> {FSSAI_NUMBER}"
    )
    rx_info_text = (
        f"<b>Rx ID:</b> {rx_id}<br/>"
        f"<b>Date:</b> {rx_date}<br/>"
        f"<b>Place:</b> Maharashtra"
    )

    info_table = Table(
        [[Paragraph(seller_text, s_normal), Paragraph(rx_info_text, s_right)]],
        colWidths=[W * 0.62, W * 0.38]
    )
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_GRAY),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 3 * mm))

    # ---- 3. DOCTOR INFO ----
    doc_qual = prescription.get('doctor_qualification', '')
    doc_reg = prescription.get('doctor_registration', '')
    doc_spec = prescription.get('doctor_specialty', '')

    doctor_block = (
        f"<b>Doctor:</b> {doc_profile_name}<br/>"
        f"<b>Qualification:</b> {doc_qual}<br/>"
        f"<b>Reg. No:</b> {doc_reg} &nbsp;&nbsp; <b>Specialty:</b> {doc_spec}"
    )
    elements.append(Paragraph(doctor_block, s_normal))
    elements.append(Spacer(1, 2 * mm))

    # ---- 4. PATIENT INFO ----
    p_name = prescription.get('patient_name', 'N/A')
    p_age = prescription.get('patient_age', '')
    p_gender = prescription.get('patient_gender', '')
    p_phone = prescription.get('patient_phone', '')

    age_gender = f"{p_age} yrs" if p_age else ""
    if p_gender:
        age_gender += f" / {p_gender}" if age_gender else p_gender

    patient_data = [
        [Paragraph(f"<b>Patient Name:</b> {p_name}", s_normal),
         Paragraph(f"<b>Age/Gender:</b> {age_gender}", s_normal)],
        [Paragraph(f"<b>Phone:</b> {p_phone}", s_normal),
         Paragraph("", s_normal)]
    ]
    patient_table = Table(patient_data, colWidths=[W * 0.55, W * 0.45])
    patient_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_GRAY),
        ('INNERGRID', (0, 0), (-1, -1), 0.25, BORDER_GRAY),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
    ]))
    elements.append(patient_table)
    elements.append(Spacer(1, 3 * mm))

    # ---- 5. VITALS ----
    vitals = prescription.get('vitals')
    if vitals and any(vitals.get(k) for k in ['blood_pressure', 'pulse', 'temperature', 'spo2', 'weight']):
        elements.append(Paragraph("<b>Vitals</b>", s_section))
        vitals_parts = []
        if vitals.get('blood_pressure'):
            vitals_parts.append(f"<b>BP:</b> {vitals['blood_pressure']} mmHg")
        if vitals.get('pulse'):
            vitals_parts.append(f"<b>Pulse:</b> {vitals['pulse']} bpm")
        if vitals.get('temperature'):
            vitals_parts.append(f"<b>Temp:</b> {vitals['temperature']} F")
        if vitals.get('spo2'):
            vitals_parts.append(f"<b>SpO2:</b> {vitals['spo2']}%")
        if vitals.get('weight'):
            vitals_parts.append(f"<b>Wt:</b> {vitals['weight']} kg")
        if vitals.get('height'):
            vitals_parts.append(f"<b>Ht:</b> {vitals['height']} cm")
        if vitals.get('bmi'):
            vitals_parts.append(f"<b>BMI:</b> {vitals['bmi']}")

        elements.append(Paragraph(" &nbsp;|&nbsp; ".join(vitals_parts), s_normal))
        elements.append(Spacer(1, 2 * mm))

    # ---- 6. CHIEF COMPLAINTS ----
    elements.append(Paragraph("<b>Chief Complaints</b>", s_section))
    elements.append(Paragraph(prescription.get('chief_complaints', 'N/A'), s_normal))

    # ---- 6b. TEMPLATE-SPECIFIC SECTIONS ----
    template_type = prescription.get('template_type', 'general')
    if template_type == 'diabetes' and prescription.get('diabetes_data'):
        dd = prescription['diabetes_data']
        params = []
        if dd.get('fasting_sugar'):
            params.append(f"<b>Fasting:</b> {dd['fasting_sugar']} mg/dL")
        if dd.get('pp_sugar'):
            params.append(f"<b>PP:</b> {dd['pp_sugar']} mg/dL")
        if dd.get('hba1c'):
            params.append(f"<b>HbA1c:</b> {dd['hba1c']}%")
        if params:
            elements.append(Paragraph("<b>Diabetes Parameters</b>", s_section))
            elements.append(Paragraph(" &nbsp;|&nbsp; ".join(params), s_normal))

    elif template_type == 'obgyn' and prescription.get('obgyn_data'):
        od = prescription['obgyn_data']
        params = []
        if od.get('lmp'):
            params.append(f"<b>LMP:</b> {od['lmp']}")
        if od.get('gestational_age'):
            params.append(f"<b>GA:</b> {od['gestational_age']}")
        if od.get('edd'):
            params.append(f"<b>EDD:</b> {od['edd']}")
        if od.get('gravida') or od.get('para'):
            params.append(f"G{od.get('gravida', '')}P{od.get('para', '')}")
        if params:
            elements.append(Paragraph("<b>OBGYN Details</b>", s_section))
            elements.append(Paragraph(" &nbsp;|&nbsp; ".join(params), s_normal))

    # ---- 7. DIAGNOSIS ----
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph("<b>Diagnosis</b>", s_section))
    elements.append(Paragraph(prescription.get('diagnosis', 'N/A'), s_normal))

    # ---- 8. MEDICINES TABLE (Rx) ----
    elements.append(Spacer(1, 3 * mm))
    rx_symbol = Paragraph("<font size='14'><b>&#8478;</b></font> <b>Medicines</b>", s_section)
    elements.append(rx_symbol)

    medicines = prescription.get('medicines', [])
    if medicines:
        col_widths = [8 * mm, W * 0.32, 18 * mm, 22 * mm, 22 * mm, 22 * mm, W * 0.14]
        header_row = [
            Paragraph("<b>Sr.</b>", s_center),
            Paragraph("<b>Medicine</b>", s_bold),
            Paragraph("<b>Dosage</b>", s_center),
            Paragraph("<b>Frequency</b>", s_center),
            Paragraph("<b>Duration</b>", s_center),
            Paragraph("<b>Timing</b>", s_center),
            Paragraph("<b>Notes</b>", s_center),
        ]
        table_data = [header_row]

        for i, med in enumerate(medicines, 1):
            med_name = med.get('name', '')
            row = [
                Paragraph(str(i), s_center),
                Paragraph(med_name, s_normal),
                Paragraph(med.get('dosage', ''), s_center),
                Paragraph(med.get('frequency', ''), s_center),
                Paragraph(med.get('duration', ''), s_center),
                Paragraph(med.get('timing', ''), s_center),
                Paragraph(med.get('notes', ''), s_small),
            ]
            table_data.append(row)

        med_table = Table(table_data, colWidths=col_widths, repeatRows=1)
        style_cmds = [
            ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_BG),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.4, BORDER_GRAY),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ]
        for row_idx in range(1, len(table_data)):
            if row_idx % 2 == 0:
                style_cmds.append(('BACKGROUND', (0, row_idx), (-1, row_idx), TABLE_ALT_ROW))

        med_table.setStyle(TableStyle(style_cmds))
        elements.append(med_table)
    else:
        elements.append(Paragraph("No medicines prescribed", s_normal))

    # ---- 9. INVESTIGATIONS ----
    if prescription.get('investigations'):
        elements.append(Spacer(1, 3 * mm))
        elements.append(Paragraph("<b>Investigations Advised</b>", s_section))
        for inv in prescription['investigations']:
            elements.append(Paragraph(f"&bull; {inv}", s_normal))

    # ---- 10. ADVICE & DIET ----
    if prescription.get('advice'):
        elements.append(Spacer(1, 2 * mm))
        elements.append(Paragraph("<b>Advice</b>", s_section))
        elements.append(Paragraph(prescription['advice'], s_normal))

    if prescription.get('diet_advice'):
        elements.append(Spacer(1, 2 * mm))
        elements.append(Paragraph("<b>Diet Advice</b>", s_section))
        elements.append(Paragraph(prescription['diet_advice'], s_normal))

    # Diabetes-specific diet/exercise
    if template_type == 'diabetes' and prescription.get('diabetes_data'):
        dd = prescription['diabetes_data']
        if dd.get('diet_advice'):
            elements.append(Spacer(1, 2 * mm))
            elements.append(Paragraph("<b>Diabetes Diet Plan</b>", s_section))
            elements.append(Paragraph(dd['diet_advice'], s_normal))
        if dd.get('exercise_advice'):
            elements.append(Paragraph("<b>Exercise Plan</b>", s_section))
            elements.append(Paragraph(dd['exercise_advice'], s_normal))

    # ---- 11. FOLLOW-UP ----
    if prescription.get('follow_up_date'):
        elements.append(Spacer(1, 3 * mm))
        elements.append(Paragraph(f"<b>Follow-up Date:</b> {prescription['follow_up_date']}", s_bold))

    if prescription.get('notes'):
        elements.append(Paragraph(f"<b>Notes:</b> {prescription['notes']}", s_normal))

    # ---- 12. SIGNATURE BLOCK ----
    elements.append(Spacer(1, 8 * mm))
    sig_data = [
        ["", Paragraph(f"<b>{doc_profile_name}</b><br/>{doc_qual}<br/>Reg: {doc_reg}", s_right)],
        ["", Paragraph("<i>Authorised Signatory</i>", s_right)],
    ]
    sig_table = Table(sig_data, colWidths=[W * 0.55, W * 0.45])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LINEABOVE', (1, 0), (1, 0), 0.5, colors.gray),
    ]))
    elements.append(sig_table)

    # ---- 13. COMPLIANCE FOOTER ----
    elements.append(Spacer(1, 4 * mm))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_GRAY))
    elements.append(Spacer(1, 2 * mm))

    compliance_text = (
        f"<b>DiaGyn Healthcare</b> &nbsp;&nbsp; "
        f"<b>Drug License:</b> {DL_NUMBERS} &nbsp;&nbsp; "
        f"<b>FSSAI:</b> {FSSAI_NUMBER}"
    )
    elements.append(Paragraph(compliance_text, s_small))

    # ---- 14. TERMS & DISCLAIMERS ----
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph("<b>Terms & Conditions:</b>", s_disclaimer))
    disclaimers = [
        "1. This prescription is generated via teleconsultation as per Telemedicine Practice Guidelines 2020 by the Board of Governors, MCI.",
        "2. Valid for dispensing medicines in India only. For queries contact: +91-7039030030 or visit www.diagynhealthcare.com",
        "3. Please do not share bank account details such as CVV, account number, UPI Pin etc. across any medium.",
        "4. MRP displayed is as printed on the product package. Actual amount payable may vary due to offers/discounts.",
        "5. This document is digitally generated and is valid without physical signature as per IT Act 2000.",
    ]
    for d in disclaimers:
        elements.append(Paragraph(d, s_disclaimer))

    # ---- BUILD ----
    doc.build(elements)
    buffer.seek(0)
    return buffer.read()


@router.post("/prescription/{prescription_id}/generate-pdf")
async def generate_prescription_pdf(prescription_id: str, doctor=Depends(get_doctor_user)):
    prescription = await db.emr_prescriptions.find_one(
        {"prescription_id": prescription_id},
        {"_id": 0}
    )
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")

    pdf_bytes = build_prescription_pdf(prescription)
    pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')

    await db.emr_prescriptions.update_one(
        {"prescription_id": prescription_id},
        {"$set": {"pdf_generated": True, "pdf_generated_at": datetime.now(timezone.utc).isoformat()}}
    )

    return {
        "success": True,
        "pdf_base64": pdf_base64,
        "filename": f"Rx_{prescription_id}.pdf"
    }

# ============ WHATSAPP ============

@router.post("/prescription/{prescription_id}/send-whatsapp")
async def send_prescription_whatsapp(prescription_id: str, doctor=Depends(get_doctor_user)):
    prescription = await db.emr_prescriptions.find_one(
        {"prescription_id": prescription_id},
        {"_id": 0}
    )
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")

    patient_phone = prescription.get('patient_phone', '')
    if not patient_phone:
        raise HTTPException(status_code=400, detail="Patient phone number not available")

    phone = patient_phone.replace(' ', '').replace('-', '')
    if not phone.startswith('91'):
        phone = f"91{phone}"

    pdf_result = await generate_prescription_pdf(prescription_id, doctor)
    if not pdf_result.get('success'):
        raise HTTPException(status_code=500, detail="Failed to generate PDF")

    try:
        async with httpx.AsyncClient() as client:
            payload = {
                "integrated_number": MSG91_INTEGRATED_NUMBER,
                "content_type": "template",
                "payload": {
                    "to": phone,
                    "type": "template",
                    "template": {
                        "name": "document_delivery",
                        "language": {"code": "en"},
                        "components": [{
                            "type": "body",
                            "parameters": [
                                {"type": "text", "text": prescription.get('patient_name', 'Patient')},
                                {"type": "text", "text": prescription.get('doctor_name', 'Doctor')},
                                {"type": "text", "text": "Prescription"},
                                {"type": "text", "text": f"https://nevikacura.com/rx/{prescription_id}"}
                            ]
                        }]
                    }
                }
            }

            response = await client.post(
                "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/",
                json=payload,
                headers={"authkey": MSG91_AUTH_KEY, "Content-Type": "application/json"},
                timeout=30.0
            )

            if response.status_code == 200:
                await db.emr_prescriptions.update_one(
                    {"prescription_id": prescription_id},
                    {"$set": {
                        "sent_to_patient": True,
                        "sent_at": datetime.now(timezone.utc).isoformat(),
                        "sent_via": "whatsapp"
                    }}
                )
                await db.diagyn_appointments.update_one(
                    {"$or": [{"booking_id": prescription_id}, {"id": prescription_id}]},
                    {"$set": {
                        "prescription_sent": True,
                        "prescription_sent_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                return {"success": True, "message": f"Prescription sent to {patient_phone} via WhatsApp"}
            else:
                logger.error(f"WhatsApp send failed: {response.text}")
                raise HTTPException(status_code=500, detail="Failed to send WhatsApp message")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"WhatsApp send error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============ FREQUENCY CODES ============
FREQUENCY_CODES = {
    "1-0-0": "Morning only",
    "0-1-0": "Afternoon only",
    "0-0-1": "Night only",
    "1-1-0": "Morning & Afternoon",
    "1-0-1": "Morning & Night",
    "0-1-1": "Afternoon & Night",
    "1-1-1": "Three times daily",
    "1-1-1-1": "Four times daily",
    "OD": "Once daily",
    "BD": "Twice daily",
    "TDS": "Three times daily",
    "QID": "Four times daily",
    "SOS": "As needed",
    "HS": "At bedtime",
    "STAT": "Immediately"
}

@router.get("/frequency-codes")
async def get_frequency_codes():
    return {"codes": FREQUENCY_CODES}

# ============ TEMPLATES ============

class TemplateCreate(BaseModel):
    name: str
    category: str
    template_type: str
    chief_complaints: Optional[str] = ""
    diagnosis: Optional[str] = ""
    medicines: List[Medicine]
    investigations: Optional[List[str]] = []
    advice: Optional[str] = ""
    diabetes_data: Optional[DiabetesData] = None
    obgyn_data: Optional[OBGYNData] = None

TEMPLATE_CATEGORIES = {
    "diabetes": [
        "Type 2 Diabetes - New Patient",
        "Type 2 Diabetes - Follow-up",
        "Diabetes + Hypertension",
        "Pre-diabetes / Lifestyle",
        "Diabetic Foot Care"
    ],
    "obgyn": [
        "PCOS Treatment",
        "Irregular Periods",
        "UTI / Vaginal Infection",
        "Pregnancy - First Trimester",
        "Menopause Management"
    ],
    "general": [
        "Common Cold / Flu",
        "Gastritis / Acidity",
        "Fever - Viral",
        "Allergic Rhinitis",
        "General Weakness"
    ]
}

@router.get("/templates/categories")
async def get_template_categories():
    return {"categories": TEMPLATE_CATEGORIES}

@router.get("/templates")
async def get_doctor_templates(doctor=Depends(get_doctor_user)):
    doctor_username = doctor.get("sub") or doctor.get("username")
    templates = await db.emr_templates.find(
        {"doctor_username": doctor_username},
        {"_id": 0}
    ).sort("usage_count", -1).to_list(100)
    return {"templates": templates}

@router.post("/templates")
async def save_template(data: TemplateCreate, doctor=Depends(get_doctor_user)):
    doctor_username = doctor.get("sub") or doctor.get("username")
    existing = await db.emr_templates.find_one({
        "doctor_username": doctor_username, "name": data.name
    })
    template_id = str(uuid.uuid4())[:8]

    template = {
        "template_id": template_id,
        "doctor_username": doctor_username,
        "name": data.name,
        "category": data.category,
        "template_type": data.template_type,
        "chief_complaints": data.chief_complaints,
        "diagnosis": data.diagnosis,
        "medicines": [m.dict() for m in data.medicines],
        "investigations": data.investigations,
        "advice": data.advice,
        "diabetes_data": data.diabetes_data.dict() if data.diabetes_data else None,
        "obgyn_data": data.obgyn_data.dict() if data.obgyn_data else None,
        "usage_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    if existing:
        await db.emr_templates.update_one(
            {"template_id": existing["template_id"]},
            {"$set": {**template, "template_id": existing["template_id"],
                      "usage_count": existing.get("usage_count", 0)}}
        )
        return {"success": True, "template_id": existing["template_id"], "message": "Template updated"}
    else:
        await db.emr_templates.insert_one(template)
        return {"success": True, "template_id": template_id, "message": "Template saved"}

@router.get("/templates/{template_id}")
async def get_template(template_id: str, doctor=Depends(get_doctor_user)):
    doctor_username = doctor.get("sub") or doctor.get("username")
    template = await db.emr_templates.find_one(
        {"template_id": template_id, "doctor_username": doctor_username},
        {"_id": 0}
    )
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    await db.emr_templates.update_one(
        {"template_id": template_id},
        {"$inc": {"usage_count": 1}, "$set": {"last_used": datetime.now(timezone.utc).isoformat()}}
    )
    return template

@router.delete("/templates/{template_id}")
async def delete_template(template_id: str, doctor=Depends(get_doctor_user)):
    doctor_username = doctor.get("sub") or doctor.get("username")
    result = await db.emr_templates.delete_one({
        "template_id": template_id, "doctor_username": doctor_username
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"success": True, "message": "Template deleted"}

@router.get("/templates/by-category/{category}")
async def get_templates_by_category(category: str, doctor=Depends(get_doctor_user)):
    doctor_username = doctor.get("sub") or doctor.get("username")
    templates = await db.emr_templates.find(
        {"doctor_username": doctor_username, "category": category},
        {"_id": 0}
    ).sort("usage_count", -1).to_list(50)
    return {"templates": templates}

# ============ AI-POWERED FEATURES ============

class AISuggestionRequest(BaseModel):
    chief_complaints: str
    patient_age: Optional[str] = ""
    template_type: str = "general"

class HandwrittenOCRRequest(BaseModel):
    image_base64: str

@router.post("/ai/suggest-prescription")
async def ai_suggest_prescription(data: AISuggestionRequest, doctor=Depends(get_doctor_user)):
    try:
        from services.ai_prescription import get_ai_prescription_suggestions
        doctor_username = doctor.get("sub") or doctor.get("username")
        doctor_specialty = "Diabetologist" if "vikas" in doctor_username.lower() else "Gynecologist"
        previous_prescriptions = await db.emr_prescriptions.find(
            {"doctor_username": doctor_username},
            {"_id": 0, "diagnosis": 1, "medicines": 1}
        ).sort("created_at", -1).limit(10).to_list(10)

        result = await get_ai_prescription_suggestions(
            chief_complaints=data.chief_complaints,
            patient_age=data.patient_age,
            template_type=data.template_type,
            doctor_specialty=doctor_specialty,
            previous_prescriptions=previous_prescriptions
        )
        if result.get("success"):
            return {"success": True, "suggestions": result.get("suggestions", {})}
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "AI suggestion failed"))
    except ImportError:
        raise HTTPException(status_code=500, detail="AI service not available")
    except Exception as e:
        logger.error(f"AI suggestion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai/ocr-handwritten")
async def ocr_handwritten_prescription(data: HandwrittenOCRRequest, doctor=Depends(get_doctor_user)):
    try:
        from services.ai_prescription import extract_handwritten_prescription
        doctor_username = doctor.get("sub") or doctor.get("username")
        doctor_name = get_doctor_profile(doctor_username)["name"]
        result = await extract_handwritten_prescription(
            image_base64=data.image_base64, doctor_name=doctor_name
        )
        if result.get("success"):
            return {"success": True, "extracted_data": result.get("data", {})}
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "OCR extraction failed"))
    except ImportError:
        raise HTTPException(status_code=500, detail="AI service not available")
    except Exception as e:
        logger.error(f"OCR error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ai/letterhead-config")
async def get_letterhead_config_api(doctor=Depends(get_doctor_user)):
    try:
        from services.ai_prescription import get_letterhead_config
        doctor_username = doctor.get("sub") or doctor.get("username")
        config = get_letterhead_config(doctor_username)
        return {"success": True, "config": config}
    except Exception as e:
        logger.error(f"Letterhead config error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ CLINICAL INTELLIGENCE ============

class DrugCheckRequest(BaseModel):
    medicines: list
    patient_age: Optional[str] = None
    patient_allergies: Optional[list] = []
    diagnosis: Optional[list] = []

@router.post("/clinical/drug-check")
async def clinical_drug_interaction_check(data: DrugCheckRequest, doctor=Depends(get_doctor_user)):
    """AI-powered drug interaction and allergy check"""
    if not data.medicines:
        return {"success": True, "alerts": [], "safe": True}

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        med_names = [m.get("name", "") if isinstance(m, dict) else str(m) for m in data.medicines]
        allergies_str = ", ".join(data.patient_allergies) if data.patient_allergies else "None reported"
        diagnosis_str = ", ".join(data.diagnosis) if data.diagnosis else "Not specified"

        prompt = f"""You are a clinical pharmacology assistant. Check for drug interactions and allergy risks.

Patient info:
- Age: {data.patient_age or 'Unknown'}
- Known allergies: {allergies_str}
- Diagnosis: {diagnosis_str}

Prescribed medicines: {', '.join(med_names)}

Return a JSON object with:
{{
  "alerts": [
    {{
      "type": "interaction" or "allergy" or "contraindication" or "dosage_warning",
      "severity": "high" or "medium" or "low",
      "medicines_involved": ["med1", "med2"],
      "message": "brief description of the issue",
      "recommendation": "what to do"
    }}
  ],
  "safe": true/false,
  "summary": "one line overall assessment"
}}

If no issues found, return {{"alerts": [], "safe": true, "summary": "No interactions detected"}}
Return ONLY valid JSON."""

        llm = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY"),
            session_id=f"drug-check-{os.urandom(4).hex()}",
            system_message="You are a clinical pharmacology assistant. Respond ONLY in valid JSON."
        ).with_model("openai", "gpt-5.2")
        result = await llm.send_message(UserMessage(text=prompt))

        import json as json_module
        response_text = result.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        parsed = json_module.loads(response_text)

        return {
            "success": True,
            "alerts": parsed.get("alerts", []),
            "safe": parsed.get("safe", True),
            "summary": parsed.get("summary", "Check complete")
        }
    except Exception as e:
        logger.error(f"Drug check error: {e}")
        return {
            "success": True,
            "alerts": [],
            "safe": True,
            "summary": "Unable to perform automated check. Please verify manually."
        }


@router.post("/ai/voice-to-prescription")
async def voice_to_prescription(audio_file: bytes = None, doctor=Depends(get_doctor_user)):
    raise HTTPException(status_code=501, detail="Use /ai/voice-to-prescription-upload endpoint")

@router.post("/ai/voice-to-prescription-upload")
async def voice_to_prescription_upload(audio: UploadFile = File(...), doctor=Depends(get_doctor_user)):
    try:
        from services.ai_prescription import transcribe_voice_to_prescription
        audio_bytes = await audio.read()
        if len(audio_bytes) > 25 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Audio file too large. Max 25MB.")
        if len(audio_bytes) < 1000:
            raise HTTPException(status_code=400, detail="Audio file too small.")
        doctor_username = doctor.get("sub") or doctor.get("username")
        doctor_specialty = "Diabetologist" if "vikas" in doctor_username.lower() else "Gynecologist"
        result = await transcribe_voice_to_prescription(
            audio_bytes=audio_bytes, doctor_specialty=doctor_specialty
        )
        if result.get("success"):
            return {"success": True, "data": result.get("data", {})}
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Voice transcription failed"))
    except HTTPException:
        raise
    except ImportError:
        raise HTTPException(status_code=500, detail="AI service not available")
    except Exception as e:
        logger.error(f"Voice transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ PHARMACY ORDER APPROVAL FLOW ============

class OrderApprovalAction(BaseModel):
    reason: Optional[str] = None

@router.get("/pharmacy-orders/pending")
async def get_pending_pharmacy_orders(doctor=Depends(get_doctor_user)):
    """Get pharmacy orders pending doctor approval"""
    orders = await db.pharmacy_orders.find(
        {"status": "pending_doctor_approval"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return {"success": True, "orders": orders, "count": len(orders)}


@router.get("/pharmacy-orders/all")
async def get_all_pharmacy_orders_for_doctor(
    status: Optional[str] = None,
    limit: int = 50,
    doctor=Depends(get_doctor_user)
):
    """Get pharmacy orders with optional status filter"""
    query = {}
    if status:
        query["status"] = status
    orders = await db.pharmacy_orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return {"success": True, "orders": orders, "count": len(orders)}


@router.post("/pharmacy-order/{order_id}/approve")
async def approve_pharmacy_order(order_id: str, doctor=Depends(get_doctor_user)):
    """Doctor approves a pending pharmacy order"""
    order = await db.pharmacy_orders.find_one(
        {"id": order_id, "status": "pending_doctor_approval"}
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found or not pending approval")

    await db.pharmacy_orders.update_one(
        {"id": order_id},
        {"$set": {
            "status": "confirmed",
            "approved_by": doctor.get("username", "doctor"),
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "approval_status": "approved"
        }}
    )

    return {
        "success": True,
        "order_id": order_id,
        "status": "confirmed",
        "message": "Order approved and confirmed for fulfillment"
    }


@router.post("/pharmacy-order/{order_id}/reject")
async def reject_pharmacy_order(
    order_id: str,
    action: OrderApprovalAction,
    doctor=Depends(get_doctor_user)
):
    """Doctor rejects a pending pharmacy order"""
    order = await db.pharmacy_orders.find_one(
        {"id": order_id, "status": "pending_doctor_approval"}
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found or not pending approval")

    await db.pharmacy_orders.update_one(
        {"id": order_id},
        {"$set": {
            "status": "rejected",
            "rejected_by": doctor.get("username", "doctor"),
            "rejected_at": datetime.now(timezone.utc).isoformat(),
            "rejection_reason": action.reason or "Doctor review required",
            "approval_status": "rejected"
        }}
    )

    return {
        "success": True,
        "order_id": order_id,
        "status": "rejected",
        "message": "Order rejected"
    }


@router.post("/prescription/{prescription_id}/generate-order")
async def generate_pharmacy_order_from_prescription(
    prescription_id: str,
    doctor=Depends(get_doctor_user)
):
    """Auto-generate a pharmacy order from a prescription's medicine list"""
    prescription = await db.prescriptions.find_one(
        {"prescription_id": prescription_id},
        {"_id": 0}
    )
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")

    medicines = prescription.get("medicines", [])
    if not medicines:
        raise HTTPException(status_code=400, detail="Prescription has no medicines")

    # Build order items from prescription medicines
    order_items = []
    for med in medicines:
        # Look up price from formulary or medicines collection
        formulary_med = await db.trusted_formulary.find_one(
            {"name": {"$regex": f"^{med.get('name', '')}$", "$options": "i"}},
            {"_id": 0, "orange_price": 1, "mrp": 1, "sale_price": 1}
        )
        price = 0
        if formulary_med:
            price = formulary_med.get("orange_price") or formulary_med.get("sale_price") or formulary_med.get("mrp", 0)

        qty = 1
        duration = med.get("duration", "")
        if duration:
            try:
                days = int(''.join(filter(str.isdigit, str(duration))))
                freq_parts = med.get("frequency", "1-0-0").split("-")
                daily_doses = sum(1 for p in freq_parts if p not in ("0", ""))
                qty = max(1, days * daily_doses)
            except (ValueError, TypeError):
                qty = 1

        order_items.append({
            "name": med.get("name", ""),
            "form": med.get("form", ""),
            "dosage": med.get("dosage", ""),
            "frequency": med.get("frequency", "1-0-0"),
            "duration": duration,
            "quantity": qty,
            "price": price,
            "total": price * qty
        })

    patient = prescription.get("patient", {})
    order_id = f"RX-{str(uuid.uuid4())[:8].upper()}"
    subtotal = sum(item["total"] for item in order_items)

    order_doc = {
        "id": order_id,
        "type": "pharmacy",
        "source": "prescription",
        "prescription_id": prescription_id,
        "items": order_items,
        "customer": {
            "name": patient.get("name", ""),
            "phone": patient.get("phone", ""),
        },
        "subtotal": subtotal,
        "discount": 0,
        "delivery_fee": 0,
        "total": subtotal,
        "status": "pending_doctor_approval",
        "created_by_doctor": doctor.get("username", "doctor"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.pharmacy_orders.insert_one(order_doc)
    order_doc.pop("_id", None)

    return {
        "success": True,
        "order_id": order_id,
        "status": "pending_doctor_approval",
        "items_count": len(order_items),
        "total": subtotal,
        "message": "Pharmacy order created from prescription. Review and approve to fulfill."
    }
