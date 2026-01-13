"""
Health Checkup Packages Module
- Pre-defined test bundles
- Discounted package pricing
- Annual health checkup reminders
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/health-packages", tags=["Health Packages"])

db = None

def get_db():
    global db
    return db

def set_db(database):
    global db
    db = database

# Pre-defined Health Packages
HEALTH_PACKAGES = [
    {
        "id": "basic-health",
        "name": "Basic Health Checkup",
        "description": "Essential tests for overall health assessment",
        "category": "general",
        "tests": [
            "CBC (Complete Blood Count)",
            "FBS (Fasting Blood Sugar)",
            "Lipid Profile",
            "Liver Function Test (LFT)",
            "Kidney Function Test (KFT)",
            "Urine Routine"
        ],
        "original_price": 2500,
        "discounted_price": 1499,
        "discount_percent": 40,
        "recommended_for": ["Adults 18+", "Annual checkup"],
        "fasting_required": True,
        "report_time": "24-48 hours",
        "popular": True
    },
    {
        "id": "comprehensive-health",
        "name": "Comprehensive Health Checkup",
        "description": "Complete body checkup with advanced markers",
        "category": "general",
        "tests": [
            "CBC (Complete Blood Count)",
            "FBS (Fasting Blood Sugar)",
            "HbA1c",
            "Lipid Profile",
            "Liver Function Test (LFT)",
            "Kidney Function Test (KFT)",
            "Thyroid Profile (T3, T4, TSH)",
            "Vitamin D",
            "Vitamin B12",
            "Iron Studies",
            "Urine Routine",
            "ECG"
        ],
        "original_price": 5500,
        "discounted_price": 2999,
        "discount_percent": 45,
        "recommended_for": ["Adults 30+", "Comprehensive screening"],
        "fasting_required": True,
        "report_time": "48-72 hours",
        "popular": True
    },
    {
        "id": "diabetic-profile",
        "name": "Diabetic Care Package",
        "description": "Complete diabetes monitoring and complications screening",
        "category": "diabetes",
        "tests": [
            "FBS (Fasting Blood Sugar)",
            "PPBS (Post Prandial Blood Sugar)",
            "HbA1c",
            "Fasting Insulin",
            "Lipid Profile",
            "Kidney Function Test (KFT)",
            "Urine Microalbumin",
            "Urine Routine",
            "Liver Function Test (LFT)"
        ],
        "original_price": 3500,
        "discounted_price": 1999,
        "discount_percent": 43,
        "recommended_for": ["Diabetics", "Pre-diabetics", "Family history of diabetes"],
        "fasting_required": True,
        "report_time": "24-48 hours",
        "popular": True,
        "glydex_recommended": True
    },
    {
        "id": "womens-wellness",
        "name": "Women's Wellness Package",
        "description": "Comprehensive health checkup designed for women",
        "category": "women",
        "tests": [
            "CBC (Complete Blood Count)",
            "FBS (Fasting Blood Sugar)",
            "Lipid Profile",
            "Thyroid Profile (T3, T4, TSH)",
            "Iron Studies",
            "Vitamin D",
            "Vitamin B12",
            "Calcium",
            "FSH",
            "LH",
            "Prolactin",
            "Urine Routine"
        ],
        "original_price": 4500,
        "discounted_price": 2499,
        "discount_percent": 44,
        "recommended_for": ["Women 25+", "Hormonal health", "PCOS screening"],
        "fasting_required": True,
        "report_time": "48-72 hours",
        "popular": True,
        "evara_recommended": True
    },
    {
        "id": "pregnancy-essential",
        "name": "Pregnancy Essential Package",
        "description": "Essential tests for expecting mothers",
        "category": "pregnancy",
        "tests": [
            "CBC (Complete Blood Count)",
            "Blood Group & Rh Factor",
            "FBS (Fasting Blood Sugar)",
            "HbA1c",
            "Thyroid Profile (T3, T4, TSH)",
            "HIV 1 & 2",
            "HBsAg (Hepatitis B)",
            "VDRL",
            "Urine Routine",
            "Rubella IgG"
        ],
        "original_price": 3000,
        "discounted_price": 1799,
        "discount_percent": 40,
        "recommended_for": ["Pregnant women", "Planning pregnancy"],
        "fasting_required": True,
        "report_time": "48-72 hours",
        "evara_recommended": True
    },
    {
        "id": "heart-health",
        "name": "Cardiac Health Package",
        "description": "Comprehensive heart health assessment",
        "category": "cardiac",
        "tests": [
            "Lipid Profile",
            "Apolipoprotein A1",
            "Apolipoprotein B",
            "Lipoprotein(a)",
            "hs-CRP",
            "Homocysteine",
            "FBS (Fasting Blood Sugar)",
            "HbA1c",
            "ECG",
            "Kidney Function Test (KFT)"
        ],
        "original_price": 4000,
        "discounted_price": 2299,
        "discount_percent": 42,
        "recommended_for": ["Adults 40+", "Family history of heart disease", "High BP/Cholesterol"],
        "fasting_required": True,
        "report_time": "48-72 hours"
    },
    {
        "id": "thyroid-complete",
        "name": "Thyroid Complete Package",
        "description": "Comprehensive thyroid function assessment",
        "category": "thyroid",
        "tests": [
            "T3 (Total)",
            "T4 (Total)",
            "TSH",
            "Free T3",
            "Free T4",
            "Anti-TPO Antibody",
            "Anti-Thyroglobulin Antibody"
        ],
        "original_price": 2500,
        "discounted_price": 1299,
        "discount_percent": 48,
        "recommended_for": ["Thyroid disorders", "Fatigue", "Weight changes"],
        "fasting_required": False,
        "report_time": "24-48 hours"
    },
    {
        "id": "senior-citizen",
        "name": "Senior Citizen Package",
        "description": "Comprehensive checkup for elderly health",
        "category": "senior",
        "tests": [
            "CBC (Complete Blood Count)",
            "FBS (Fasting Blood Sugar)",
            "HbA1c",
            "Lipid Profile",
            "Liver Function Test (LFT)",
            "Kidney Function Test (KFT)",
            "Thyroid Profile (T3, T4, TSH)",
            "Vitamin D",
            "Vitamin B12",
            "Calcium",
            "Uric Acid",
            "PSA (for men) / CA-125 (for women)",
            "ECG",
            "Urine Routine"
        ],
        "original_price": 6000,
        "discounted_price": 3499,
        "discount_percent": 42,
        "recommended_for": ["Adults 60+", "Annual senior checkup"],
        "fasting_required": True,
        "report_time": "48-72 hours"
    }
]

# ==================== PACKAGE ENDPOINTS ====================

@router.get("/all")
async def get_all_packages(category: Optional[str] = None):
    """Get all health packages, optionally filtered by category"""
    packages = HEALTH_PACKAGES
    
    if category:
        packages = [p for p in packages if p.get("category") == category]
    
    # Add some dynamic data
    for pkg in packages:
        pkg["bookings_this_month"] = 50 + hash(pkg["id"]) % 100  # Simulated
    
    return {
        "packages": packages,
        "categories": list(set(p["category"] for p in HEALTH_PACKAGES))
    }

@router.get("/recommended/{user_id}")
async def get_recommended_packages(user_id: str):
    """Get personalized package recommendations based on user profile"""
    db = get_db()
    
    # Get user preferences
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    interests = user.get("interests", []) if user else []
    
    recommended = []
    
    # Recommend based on interests
    if "glydex" in interests:
        recommended.extend([p for p in HEALTH_PACKAGES if p.get("glydex_recommended")])
    
    if "evara" in interests:
        recommended.extend([p for p in HEALTH_PACKAGES if p.get("evara_recommended")])
    
    # Always include popular packages
    popular = [p for p in HEALTH_PACKAGES if p.get("popular") and p not in recommended]
    recommended.extend(popular[:2])
    
    # Remove duplicates while preserving order
    seen = set()
    unique_recommended = []
    for pkg in recommended:
        if pkg["id"] not in seen:
            seen.add(pkg["id"])
            unique_recommended.append(pkg)
    
    return {"recommended_packages": unique_recommended[:5]}

@router.get("/{package_id}")
async def get_package_details(package_id: str):
    """Get detailed information about a specific package"""
    package = next((p for p in HEALTH_PACKAGES if p["id"] == package_id), None)
    
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Add preparation instructions
    preparation = []
    if package.get("fasting_required"):
        preparation.append("Fasting for 10-12 hours required (water allowed)")
    preparation.append("Bring previous reports if available")
    preparation.append("Wear comfortable, loose clothing")
    if "ECG" in package.get("tests", []):
        preparation.append("Avoid caffeinated drinks before ECG")
    
    package["preparation_instructions"] = preparation
    
    return package

@router.post("/book")
async def book_package(user_id: str, package_id: str, booking_details: dict):
    """Book a health package"""
    db = get_db()
    
    package = next((p for p in HEALTH_PACKAGES if p["id"] == package_id), None)
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Create booking
    booking = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "package_id": package_id,
        "package_name": package["name"],
        "tests": package["tests"],
        "price": package["discounted_price"],
        "patient_name": booking_details.get("patient_name"),
        "patient_phone": booking_details.get("patient_phone"),
        "patient_address": booking_details.get("address"),
        "preferred_date": booking_details.get("preferred_date"),
        "preferred_time": booking_details.get("preferred_time"),
        "home_collection": booking_details.get("home_collection", False),
        "payment_method": booking_details.get("payment_method", "cod"),
        "status": "Booked",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.package_bookings.insert_one(booking)
    
    # Also create a diagnostic order for tracking
    diagnostic_order = {
        "id": booking["id"],
        "order_id": f"PKG-{booking['id'][:8].upper()}",
        "user_id": user_id,
        "patient_name": booking["patient_name"],
        "phone": booking["patient_phone"],
        "tests": package["tests"],
        "package_name": package["name"],
        "address": booking["patient_address"],
        "preferred_date": booking["preferred_date"],
        "home_collection": booking["home_collection"],
        "status": "Booked",
        "total_amount": package["discounted_price"],
        "payment_method": booking["payment_method"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.diagnostic_orders.insert_one(diagnostic_order)
    
    return {
        "message": "Package booked successfully!",
        "booking_id": booking["id"],
        "order_id": diagnostic_order["order_id"],
        "amount": package["discounted_price"]
    }

@router.get("/bookings/{user_id}")
async def get_user_bookings(user_id: str):
    """Get all package bookings for a user"""
    db = get_db()
    
    bookings = await db.package_bookings.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"bookings": bookings}
