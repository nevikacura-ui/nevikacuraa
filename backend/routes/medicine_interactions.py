"""
Medicine Interaction Guardian API
- Checks for drug-drug interactions based on composition/generic name
- Returns warnings when conflicting medicines are added to cart
"""

from fastapi import APIRouter
from typing import List
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/medicine-interactions", tags=["Medicine Interactions"])
db = None

def set_db(database):
    global db
    db = database

# Known drug interaction pairs (composition-based)
# Format: (drug_a, drug_b, severity, description)
KNOWN_INTERACTIONS = [
    ("warfarin", "aspirin", "high", "Increased bleeding risk. Consult doctor before combining."),
    ("warfarin", "azithromycin", "high", "Azithromycin may increase Warfarin effect. Monitor INR closely."),
    ("warfarin", "ibuprofen", "high", "NSAIDs increase bleeding risk with Warfarin."),
    ("metformin", "alcohol", "moderate", "Alcohol increases risk of lactic acidosis with Metformin."),
    ("metformin", "contrast dye", "high", "Stop Metformin before contrast imaging procedures."),
    ("amlodipine", "simvastatin", "moderate", "May increase simvastatin levels. Limit simvastatin to 20mg."),
    ("atenolol", "verapamil", "high", "Both slow heart rate. Risk of severe bradycardia."),
    ("lisinopril", "potassium", "moderate", "Risk of hyperkalemia. Monitor potassium levels."),
    ("enalapril", "potassium", "moderate", "Risk of hyperkalemia. Monitor potassium levels."),
    ("ciprofloxacin", "antacid", "moderate", "Antacids reduce Ciprofloxacin absorption. Take 2hrs apart."),
    ("ciprofloxacin", "theophylline", "high", "Increases theophylline toxicity risk."),
    ("methotrexate", "nsaid", "high", "NSAIDs increase methotrexate toxicity."),
    ("methotrexate", "ibuprofen", "high", "Ibuprofen increases methotrexate toxicity."),
    ("digoxin", "amiodarone", "high", "Amiodarone increases digoxin levels significantly."),
    ("digoxin", "verapamil", "high", "Verapamil increases digoxin levels."),
    ("clopidogrel", "omeprazole", "moderate", "Omeprazole may reduce Clopidogrel effectiveness."),
    ("sildenafil", "nitrate", "high", "CONTRAINDICATED. Severe hypotension risk."),
    ("fluoxetine", "tramadol", "high", "Risk of serotonin syndrome. Avoid combination."),
    ("sertraline", "tramadol", "high", "Risk of serotonin syndrome. Avoid combination."),
    ("fluconazole", "statin", "moderate", "May increase statin levels and side effects."),
    ("clarithromycin", "statin", "moderate", "May increase statin levels. Monitor for muscle pain."),
    ("erythromycin", "statin", "moderate", "May increase statin levels."),
    ("diclofenac", "aspirin", "moderate", "Increased GI bleeding risk. Use with caution."),
    ("ibuprofen", "aspirin", "moderate", "Ibuprofen may reduce aspirin's cardioprotective effect."),
    ("prednisone", "nsaid", "moderate", "Increased risk of GI ulceration."),
    ("amoxicillin", "methotrexate", "moderate", "May increase methotrexate toxicity."),
    ("glimepiride", "fluconazole", "moderate", "May increase hypoglycemia risk."),
    ("insulin", "glimepiride", "moderate", "Combined use increases hypoglycemia risk. Monitor closely."),
    ("losartan", "potassium", "moderate", "Risk of hyperkalemia."),
    ("spironolactone", "potassium", "high", "High risk of hyperkalemia. Avoid potassium supplements."),
    ("lithium", "nsaid", "high", "NSAIDs increase lithium levels. Monitor closely."),
    ("lithium", "ibuprofen", "high", "Ibuprofen increases lithium levels."),
]

NSAID_NAMES = ["ibuprofen", "diclofenac", "naproxen", "aspirin", "piroxicam", "indomethacin", "aceclofenac", "mefenamic"]
STATIN_NAMES = ["atorvastatin", "simvastatin", "rosuvastatin", "pravastatin", "lovastatin"]


def normalize_drug(name: str) -> str:
    return (name or "").lower().strip()


def get_drug_keywords(medicine: dict) -> List[str]:
    """Extract searchable drug keywords from a medicine."""
    keywords = []
    for field in ["generic_name", "composition", "name"]:
        val = normalize_drug(medicine.get(field, ""))
        if val:
            # Split by common delimiters
            for sep in ["+", ",", "/", "&", " and "]:
                val = val.replace(sep, "|")
            parts = [p.strip() for p in val.split("|") if p.strip()]
            keywords.extend(parts)
    return list(set(keywords))


def check_interaction(keywords_a: List[str], keywords_b: List[str]) -> List[dict]:
    """Check for known interactions between two sets of drug keywords."""
    warnings = []
    
    for drug_a, drug_b, severity, desc in KNOWN_INTERACTIONS:
        a_match = any(drug_a in kw for kw in keywords_a)
        b_match = any(drug_b in kw for kw in keywords_b)
        
        # Also check reverse
        a_match_rev = any(drug_b in kw for kw in keywords_a)
        b_match_rev = any(drug_a in kw for kw in keywords_b)
        
        if (a_match and b_match) or (a_match_rev and b_match_rev):
            warnings.append({
                "drug_a": drug_a.title(),
                "drug_b": drug_b.title(),
                "severity": severity,
                "description": desc
            })
    
    # Check NSAID class interactions
    a_has_nsaid = any(n in kw for kw in keywords_a for n in NSAID_NAMES)
    b_has_nsaid = any(n in kw for kw in keywords_b for n in NSAID_NAMES)
    
    if a_has_nsaid and b_has_nsaid:
        warnings.append({
            "drug_a": "NSAID",
            "drug_b": "NSAID",
            "severity": "moderate",
            "description": "Taking multiple NSAIDs increases risk of stomach bleeding and kidney damage."
        })
    
    return warnings


@router.post("/check")
async def check_interactions(data: dict):
    """
    Check for drug interactions between medicines in cart and a new medicine.
    Input: { "cart_medicines": [...], "new_medicine": {...} }
    """
    cart = data.get("cart_medicines", [])
    new_med = data.get("new_medicine", {})
    
    if not new_med or not cart:
        return {"success": True, "warnings": [], "has_interactions": False}
    
    new_keywords = get_drug_keywords(new_med)
    all_warnings = []
    
    for cart_med in cart:
        cart_keywords = get_drug_keywords(cart_med)
        interactions = check_interaction(cart_keywords, new_keywords)
        for interaction in interactions:
            interaction["medicine_a"] = cart_med.get("name", "Unknown")
            interaction["medicine_b"] = new_med.get("name", "Unknown")
            all_warnings.append(interaction)
    
    # Deduplicate
    seen = set()
    unique_warnings = []
    for w in all_warnings:
        key = f"{w['drug_a']}-{w['drug_b']}"
        if key not in seen:
            seen.add(key)
            unique_warnings.append(w)
    
    # Sort by severity
    severity_order = {"high": 0, "moderate": 1, "low": 2}
    unique_warnings.sort(key=lambda x: severity_order.get(x["severity"], 3))
    
    return {
        "success": True,
        "warnings": unique_warnings,
        "has_interactions": len(unique_warnings) > 0,
        "high_severity_count": sum(1 for w in unique_warnings if w["severity"] == "high")
    }


@router.post("/check-prescription")
async def check_prescription_interactions(data: dict):
    """
    Check interactions between a patient's current medications and a new prescription.
    Input: { "phone": "...", "new_medicines": [...] }
    """
    phone = data.get("phone", "")
    new_medicines = data.get("new_medicines", [])
    
    if not phone or not new_medicines:
        return {"success": True, "warnings": [], "has_interactions": False}
    
    # Get patient's current medications from recent prescriptions
    current_meds = []
    prescriptions = await db.prescriptions.find(
        {"patient_phone": phone}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    for rx in prescriptions:
        for med in rx.get("medicines", []):
            current_meds.append(med)
    
    # Check each new medicine against current medications
    all_warnings = []
    for new_med in new_medicines:
        new_keywords = get_drug_keywords(new_med)
        for current_med in current_meds:
            current_keywords = get_drug_keywords(current_med)
            interactions = check_interaction(current_keywords, new_keywords)
            for interaction in interactions:
                interaction["medicine_a"] = current_med.get("name", "")
                interaction["medicine_b"] = new_med.get("name", "")
                all_warnings.append(interaction)
    
    # Deduplicate
    seen = set()
    unique_warnings = []
    for w in all_warnings:
        key = f"{w['drug_a']}-{w['drug_b']}"
        if key not in seen:
            seen.add(key)
            unique_warnings.append(w)
    
    return {
        "success": True,
        "warnings": unique_warnings,
        "has_interactions": len(unique_warnings) > 0,
        "high_severity_count": sum(1 for w in unique_warnings if w["severity"] == "high")
    }
