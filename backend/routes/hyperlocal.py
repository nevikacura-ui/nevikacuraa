from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import math

router = APIRouter(prefix="/hyperlocal", tags=["Hyperlocal Health Network"])

db = None

def set_db(database):
    global db
    db = database

# ── Models ──

class HealthServiceCreate(BaseModel):
    name: str
    type: str  # pharmacy, clinic, hospital, lab, blood_bank, ambulance
    address: str
    area: str
    city: str
    phone: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    services: Optional[List[str]] = []
    open_hours: Optional[str] = None
    rating: Optional[float] = None
    emergency_available: Optional[bool] = False

# ── Haversine distance calc ──

def haversine(lat1, lng1, lat2, lng2):
    R = 6371  # km
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

# ── Seed data for demo ──

DEMO_SERVICES = [
    {"name": "Orange Pharmacy - Vasai", "type": "pharmacy", "address": "Shop 12, Vasai Road Station Complex", "area": "Vasai", "city": "Mumbai", "phone": "9833188288", "lat": 19.3691, "lng": 72.8304, "services": ["medicines", "otc", "baby_care", "surgical"], "open_hours": "8 AM - 11 PM", "rating": 4.6, "emergency_available": True},
    {"name": "Orange Pharmacy - Nalasopara", "type": "pharmacy", "address": "D-Wing, Nalasopara West", "area": "Nalasopara", "city": "Mumbai", "phone": "9833188288", "lat": 19.4198, "lng": 72.8382, "services": ["medicines", "otc", "baby_care", "home_delivery"], "open_hours": "8 AM - 10 PM", "rating": 4.5, "emergency_available": False},
    {"name": "DiaGyn Women's Clinic - Vasai", "type": "clinic", "address": "301, Harmony Plaza, Vasai West", "area": "Vasai West", "city": "Mumbai", "phone": "9833188288", "lat": 19.3680, "lng": 72.8250, "services": ["gynecology", "obstetrics", "ultrasound", "anc", "teleconsultation"], "open_hours": "10 AM - 8 PM", "rating": 4.8, "emergency_available": False},
    {"name": "DiaGyn Women's Clinic - Nalasopara", "type": "clinic", "address": "B-205, Evershine Mall, Nalasopara East", "area": "Nalasopara", "city": "Mumbai", "phone": "9833188288", "lat": 19.4205, "lng": 72.8510, "services": ["gynecology", "obstetrics", "diabetes", "thyroid", "teleconsultation"], "open_hours": "10 AM - 8 PM", "rating": 4.7, "emergency_available": False},
    {"name": "Mango Diagnostics Lab - Vasai", "type": "lab", "address": "105, Mangoville Complex, Vasai East", "area": "Vasai East", "city": "Mumbai", "phone": "9833188288", "lat": 19.3750, "lng": 72.8400, "services": ["blood_tests", "urine_tests", "xray", "ecg", "ultrasound"], "open_hours": "7 AM - 9 PM", "rating": 4.5, "emergency_available": False},
    {"name": "Mango Diagnostics Lab - Naigaon", "type": "lab", "address": "Naigaon East, NABL Certified", "area": "Naigaon", "city": "Mumbai", "phone": "9833188288", "lat": 19.3534, "lng": 72.8481, "services": ["blood_tests", "pathology", "microbiology", "home_collection"], "open_hours": "7 AM - 8 PM", "rating": 4.4, "emergency_available": False},
    {"name": "Shalom Hospital", "type": "hospital", "address": "Shalom Hills, Mira Road East, Near Mira Road Station", "area": "Mira Road", "city": "Mumbai", "phone": "02228117777", "lat": 19.2818, "lng": 72.8726, "services": ["emergency", "icu", "surgery", "maternity", "pediatrics", "orthopedics", "cardiology"], "open_hours": "24 Hours", "rating": 4.5, "emergency_available": True, "google_maps_link": "https://maps.google.com/?q=Shalom+Hospital+Mira+Road"},
    {"name": "Sahyadri Hospital", "type": "hospital", "address": "Opp. Railway Station, Virar West", "area": "Virar", "city": "Mumbai", "phone": "02502320100", "lat": 19.4555, "lng": 72.8114, "services": ["emergency", "icu", "surgery", "maternity", "pediatrics"], "open_hours": "24 Hours", "rating": 4.2, "emergency_available": True},
    {"name": "LifeLine Blood Bank", "type": "blood_bank", "address": "Vasai Rd, Near Bus Depot", "area": "Vasai", "city": "Mumbai", "phone": "02502342567", "lat": 19.3700, "lng": 72.8330, "services": ["blood_donation", "blood_components", "platelet_donation"], "open_hours": "9 AM - 6 PM", "rating": 4.3, "emergency_available": True},
    {"name": "24x7 Ambulance Service", "type": "ambulance", "address": "Vasai-Virar Region", "area": "Vasai", "city": "Mumbai", "phone": "108", "lat": 19.3710, "lng": 72.8310, "services": ["bls_ambulance", "als_ambulance", "patient_transport"], "open_hours": "24 Hours", "rating": 4.0, "emergency_available": True},
    {"name": "Apollo Pharmacy", "type": "pharmacy", "address": "Shanti Nagar, Nalasopara East", "area": "Nalasopara", "city": "Mumbai", "phone": "18001020202", "lat": 19.4198, "lng": 72.8502, "services": ["medicines", "otc", "health_devices", "personal_care"], "open_hours": "8 AM - 10 PM", "rating": 4.4, "emergency_available": False},
    {"name": "Dr. Patil's Family Clinic", "type": "clinic", "address": "A-Wing, Green Meadows, Vasai West", "area": "Vasai West", "city": "Mumbai", "phone": "9876543210", "lat": 19.3665, "lng": 72.8220, "services": ["general_medicine", "pediatrics", "vaccination", "health_checkup"], "open_hours": "9 AM - 1 PM, 5 PM - 9 PM", "rating": 4.7, "emergency_available": False},
    {"name": "Medlife Diagnostic Centre", "type": "lab", "address": "Boisar Highway, Palghar", "area": "Palghar", "city": "Palghar", "phone": "02525252525", "lat": 19.6932, "lng": 72.7682, "services": ["ct_scan", "mri", "blood_tests", "pathology"], "open_hours": "7 AM - 8 PM", "rating": 4.1, "emergency_available": False},
    {"name": "Wockhardt Hospital", "type": "hospital", "address": "Mumbai-Ahmedabad Highway, Mira Road", "area": "Mira Road", "city": "Mumbai", "phone": "02228553500", "lat": 19.2810, "lng": 72.8676, "services": ["emergency", "cardiology", "orthopedics", "neurology", "oncology"], "open_hours": "24 Hours", "rating": 4.4, "emergency_available": True},
]

# ── Endpoints ──

@router.get("/services")
async def get_nearby_services(
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    type: Optional[str] = Query(None),
    radius: float = Query(10.0, description="Radius in km"),
    city: Optional[str] = Query(None),
):
    """Get nearby health services"""
    # Check if we have seeded data
    count = await db.health_services.count_documents({})
    if count == 0:
        # Seed demo data
        for svc in DEMO_SERVICES:
            await db.health_services.insert_one({**svc, "created_at": datetime.now(timezone.utc).isoformat()})

    # Build query
    query = {}
    if type:
        query["type"] = type
    if city:
        query["city"] = {"$regex": city, "$options": "i"}

    services = await db.health_services.find(query, {"_id": 0}).to_list(100)

    # Filter by distance if coordinates provided
    if lat is not None and lng is not None:
        for svc in services:
            if svc.get("lat") and svc.get("lng"):
                svc["distance_km"] = round(haversine(lat, lng, svc["lat"], svc["lng"]), 1)
            else:
                svc["distance_km"] = None
        services = [s for s in services if s.get("distance_km") is None or s["distance_km"] <= radius]
        services.sort(key=lambda x: x.get("distance_km") or 999)

    return {
        "services": services,
        "total": len(services),
        "radius_km": radius,
    }


@router.get("/services/emergency")
async def get_emergency_services(
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
):
    """Get emergency services (hospitals, ambulances, blood banks)"""
    count = await db.health_services.count_documents({})
    if count == 0:
        for svc in DEMO_SERVICES:
            await db.health_services.insert_one({**svc, "created_at": datetime.now(timezone.utc).isoformat()})

    services = await db.health_services.find(
        {"emergency_available": True}, {"_id": 0}
    ).to_list(50)

    if lat is not None and lng is not None:
        for svc in services:
            if svc.get("lat") and svc.get("lng"):
                svc["distance_km"] = round(haversine(lat, lng, svc["lat"], svc["lng"]), 1)
        services.sort(key=lambda x: x.get("distance_km") or 999)

    return {"services": services, "total": len(services)}


@router.post("/services")
async def add_health_service(svc: HealthServiceCreate):
    """Add a new health service (admin)"""
    doc = svc.dict()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.health_services.insert_one({**doc})
    doc.pop("_id", None)
    return {"message": "Service added", "service": doc}


@router.get("/stats")
async def get_network_stats():
    """Get hyperlocal network statistics"""
    pipeline = [
        {"$group": {"_id": "$type", "count": {"$sum": 1}}}
    ]
    stats = await db.health_services.aggregate(pipeline).to_list(20)
    type_counts = {s["_id"]: s["count"] for s in stats}
    total = sum(type_counts.values())

    return {
        "total_services": total,
        "pharmacies": type_counts.get("pharmacy", 0),
        "clinics": type_counts.get("clinic", 0),
        "hospitals": type_counts.get("hospital", 0),
        "labs": type_counts.get("lab", 0),
        "blood_banks": type_counts.get("blood_bank", 0),
        "ambulances": type_counts.get("ambulance", 0),
    }
