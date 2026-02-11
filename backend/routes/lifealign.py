"""
LifeAlign - Cultural & Community Health Sync Engine
API Routes
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from datetime import datetime, date, timedelta
from bson import ObjectId
import os
import math

from models.lifealign import (
    INITIAL_RELIGIONS, INITIAL_COMMUNITIES, INITIAL_FESTIVALS,
    FESTIVAL_DATES_2026, HEALTH_RULES, RAMADAN_TIMINGS_2026, FAITHCARE_ACCOUNTS,
    JAMATKHANAS, RAMADAN_DIET_PLANS,
    LocationType, FestivalType, ConditionType, ActionType,
    UserProfileUpdate, FestivalDateCreate, HealthRuleCreate, UserFestivalOptIn,
    ReligionResponse, CommunityResponse, FestivalResponse, FestivalDateResponse,
    HealthAlertResponse, DashboardResponse
)

router = APIRouter(prefix="/api/lifealign", tags=["LifeAlign"])

# Database connection
from motor.motor_asyncio import AsyncIOMotorClient
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "health_portal")

async def get_db():
    client = AsyncIOMotorClient(MONGO_URL)
    return client[DB_NAME]

# ============ INITIALIZATION ============

@router.post("/init")
async def initialize_lifealign_data():
    """Initialize LifeAlign database with seed data"""
    db = await get_db()
    
    # Initialize religions
    for religion in INITIAL_RELIGIONS:
        await db.la_religions.update_one(
            {"religion_id": religion["religion_id"]},
            {"$set": religion},
            upsert=True
        )
    
    # Initialize communities
    for community in INITIAL_COMMUNITIES:
        await db.la_communities.update_one(
            {"community_id": community["community_id"]},
            {"$set": community},
            upsert=True
        )
    
    # Initialize festivals
    for festival in INITIAL_FESTIVALS:
        await db.la_festivals.update_one(
            {"festival_id": festival["festival_id"]},
            {"$set": festival},
            upsert=True
        )
    
    # Initialize 2026 festival dates
    for fd in FESTIVAL_DATES_2026:
        festival_date_id = f"{fd['festival_id']}_{fd['year']}"
        await db.la_festival_dates.update_one(
            {"festival_date_id": festival_date_id},
            {"$set": {
                "festival_date_id": festival_date_id,
                **fd,
                "created_at": datetime.utcnow()
            }},
            upsert=True
        )
    
    # Initialize health rules
    for idx, rule in enumerate(HEALTH_RULES):
        rule_id = f"rule_{rule['festival_id']}_{rule['condition_type']}_{idx}"
        await db.la_health_rules.update_one(
            {"rule_id": rule_id},
            {"$set": {"rule_id": rule_id, **rule}},
            upsert=True
        )
    
    # Initialize Ramadan daily timings
    for timing in RAMADAN_TIMINGS_2026:
        timing_id = f"ramadan_2026_day_{timing['day']}"
        await db.la_ramadan_timings.update_one(
            {"timing_id": timing_id},
            {"$set": {"timing_id": timing_id, "year": 2026, **timing}},
            upsert=True
        )
    
    # Initialize FaithCare exclusive accounts
    import hashlib
    for account in FAITHCARE_ACCOUNTS:
        password_hash = hashlib.sha256(account["password"].encode()).hexdigest()
        await db.faithcare_accounts.update_one(
            {"user_id": account["user_id"]},
            {"$set": {
                "user_id": account["user_id"],
                "password_hash": password_hash,
                "name": account["name"],
                "active": account["active"],
                "created_at": datetime.utcnow()
            }},
            upsert=True
        )
    
    return {"success": True, "message": "FaithCare data initialized successfully"}

# ============ EXCLUSIVE ACCESS ============

@router.post("/auth/login")
async def faithcare_login(user_id: str, password: str):
    """Authenticate FaithCare exclusive access"""
    db = await get_db()
    import hashlib
    
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    
    account = await db.faithcare_accounts.find_one({
        "user_id": user_id,
        "password_hash": password_hash,
        "active": True
    }, {"_id": 0})
    
    if not account:
        raise HTTPException(status_code=401, detail="Invalid credentials or inactive account")
    
    # Update last login
    await db.faithcare_accounts.update_one(
        {"user_id": user_id},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    # Generate session token
    import secrets
    session_token = secrets.token_urlsafe(32)
    
    await db.faithcare_sessions.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "session_token": session_token,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(days=30)
        }},
        upsert=True
    )
    
    return {
        "success": True,
        "user_id": user_id,
        "name": account["name"],
        "session_token": session_token
    }

@router.get("/auth/verify/{session_token}")
async def verify_faithcare_session(session_token: str):
    """Verify FaithCare session token"""
    db = await get_db()
    
    session = await db.faithcare_sessions.find_one({
        "session_token": session_token,
        "expires_at": {"$gt": datetime.utcnow()}
    }, {"_id": 0})
    
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    return {"valid": True, "user_id": session["user_id"]}

@router.post("/auth/logout")
async def faithcare_logout(session_token: str):
    """Logout from FaithCare"""
    db = await get_db()
    await db.faithcare_sessions.delete_one({"session_token": session_token})
    return {"success": True}

# ============ RAMADAN TIMINGS ============

@router.get("/ramadan/timings/{year}")
async def get_ramadan_timings(year: int = 2026):
    """Get Ramadan daily Sehri/Iftar timings"""
    db = await get_db()
    
    timings = await db.la_ramadan_timings.find(
        {"year": year},
        {"_id": 0}
    ).sort("day", 1).to_list(31)
    
    if not timings:
        # Return from static data
        return RAMADAN_TIMINGS_2026
    
    return timings

@router.get("/ramadan/today")
async def get_today_ramadan_timing():
    """Get today's Ramadan timing if during Ramadan"""
    db = await get_db()
    today = date.today().isoformat()
    
    timing = await db.la_ramadan_timings.find_one(
        {"date": today},
        {"_id": 0}
    )
    
    if not timing:
        return {"is_ramadan": False, "message": "Not during Ramadan or no data for today"}
    
    return {
        "is_ramadan": True,
        **timing
    }

# ============ RELIGIONS & COMMUNITIES ============

@router.get("/religions", response_model=List[ReligionResponse])
async def get_religions(active_only: bool = True):
    """Get all religions"""
    db = await get_db()
    query = {"is_active": True} if active_only else {}
    religions = await db.la_religions.find(query, {"_id": 0}).to_list(100)
    return religions

@router.get("/communities/{religion_id}", response_model=List[CommunityResponse])
async def get_communities(religion_id: str, active_only: bool = True):
    """Get communities for a religion"""
    db = await get_db()
    query = {"religion_id": religion_id}
    if active_only:
        query["is_active"] = True
    communities = await db.la_communities.find(query, {"_id": 0}).to_list(100)
    return communities

# ============ FESTIVALS ============

@router.get("/festivals", response_model=List[FestivalResponse])
async def get_festivals(
    religion_id: Optional[str] = None,
    community_id: Optional[str] = None,
    festival_type: Optional[FestivalType] = None
):
    """Get festivals with optional filters"""
    db = await get_db()
    query = {}
    if religion_id:
        query["religion_id"] = religion_id
    if community_id:
        query["$or"] = [{"community_id": community_id}, {"community_id": None}]
    if festival_type:
        query["festival_type"] = festival_type.value
    
    festivals = await db.la_festivals.find(query, {"_id": 0}).to_list(100)
    return festivals

@router.get("/festivals/upcoming")
async def get_upcoming_festivals(
    religion_id: Optional[str] = None,
    community_id: Optional[str] = None,
    location_type: LocationType = LocationType.INDIA,
    days_ahead: int = 60
):
    """Get upcoming festivals within specified days"""
    db = await get_db()
    today = date.today()
    end_date = today + timedelta(days=days_ahead)
    
    # Build query for festivals
    festival_query = {}
    if religion_id:
        festival_query["religion_id"] = religion_id
    if community_id:
        festival_query["$or"] = [{"community_id": community_id}, {"community_id": None}]
    
    # Get relevant festival IDs
    festivals = await db.la_festivals.find(festival_query, {"festival_id": 1, "festival_name": 1, "festival_type": 1}).to_list(100)
    festival_map = {f["festival_id"]: f for f in festivals}
    festival_ids = list(festival_map.keys())
    
    # Get festival dates
    date_query = {
        "festival_id": {"$in": festival_ids},
        "year": today.year,
        "start_date": {"$lte": end_date.isoformat()},
        "end_date": {"$gte": today.isoformat()}
    }
    
    festival_dates = await db.la_festival_dates.find(date_query, {"_id": 0}).to_list(100)
    
    # Also check for future dates this year
    future_query = {
        "festival_id": {"$in": festival_ids},
        "year": today.year,
        "start_date": {"$gt": today.isoformat(), "$lte": end_date.isoformat()}
    }
    future_dates = await db.la_festival_dates.find(future_query, {"_id": 0}).to_list(100)
    
    all_dates = festival_dates + future_dates
    # Remove duplicates
    seen = set()
    unique_dates = []
    for fd in all_dates:
        if fd["festival_date_id"] not in seen:
            seen.add(fd["festival_date_id"])
            festival_info = festival_map.get(fd["festival_id"], {})
            start = datetime.strptime(fd["start_date"], "%Y-%m-%d").date() if isinstance(fd["start_date"], str) else fd["start_date"]
            days_remaining = (start - today).days
            unique_dates.append({
                **fd,
                "festival_name": festival_info.get("festival_name", fd["festival_id"]),
                "festival_type": festival_info.get("festival_type", "CELEBRATION"),
                "days_remaining": max(0, days_remaining),
                "is_active": today >= start and today <= (datetime.strptime(fd["end_date"], "%Y-%m-%d").date() if isinstance(fd["end_date"], str) else fd["end_date"])
            })
    
    # Sort by start date
    unique_dates.sort(key=lambda x: x["start_date"])
    
    return unique_dates

# ============ USER PROFILE ============

@router.post("/user/profile")
async def update_user_lifealign_profile(user_id: str, profile: UserProfileUpdate):
    """Update user's LifeAlign profile"""
    db = await get_db()
    
    update_data = profile.dict(exclude_none=True)
    update_data["updated_at"] = datetime.utcnow()
    
    await db.la_user_profiles.update_one(
        {"user_id": user_id},
        {"$set": update_data},
        upsert=True
    )
    
    return {"success": True, "message": "Profile updated"}

@router.get("/user/profile/{user_id}")
async def get_user_lifealign_profile(user_id: str):
    """Get user's LifeAlign profile"""
    db = await get_db()
    profile = await db.la_user_profiles.find_one({"user_id": user_id}, {"_id": 0})
    
    if not profile:
        # Return default profile
        return {
            "user_id": user_id,
            "religion_id": None,
            "community_id": None,
            "location_type": "INDIA",
            "country": "India",
            "timezone": "Asia/Kolkata",
            "chronic_conditions": [],
            "medications": [],
            "fasting_preference": True
        }
    
    return profile

# ============ HEALTH LOGIC ENGINE ============

@router.get("/health-alerts/{user_id}")
async def get_health_alerts(user_id: str):
    """Get health alerts for user based on their profile and active/upcoming festivals"""
    db = await get_db()
    
    # Get user profile
    profile = await db.la_user_profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not profile:
        return {"alerts": [], "message": "No profile configured"}
    
    religion_id = profile.get("religion_id")
    community_id = profile.get("community_id")
    conditions = profile.get("chronic_conditions", [])
    
    if not religion_id:
        return {"alerts": [], "message": "Religion not configured"}
    
    # Get active and upcoming festivals
    today = date.today()
    
    # Get festivals for user's religion/community
    festival_query = {"religion_id": religion_id}
    if community_id:
        festival_query["$or"] = [{"community_id": community_id}, {"community_id": None}]
    
    festivals = await db.la_festivals.find(festival_query, {"_id": 0}).to_list(100)
    festival_ids = [f["festival_id"] for f in festivals]
    
    # Get current/upcoming festival dates
    date_query = {
        "festival_id": {"$in": festival_ids},
        "year": today.year,
        "$or": [
            {"start_date": {"$lte": (today + timedelta(days=30)).isoformat()}, "end_date": {"$gte": today.isoformat()}},
            {"start_date": {"$gt": today.isoformat(), "$lte": (today + timedelta(days=30)).isoformat()}}
        ]
    }
    
    active_dates = await db.la_festival_dates.find(date_query, {"_id": 0}).to_list(50)
    
    # Get applicable health rules
    alerts = []
    for fd in active_dates:
        start = datetime.strptime(fd["start_date"], "%Y-%m-%d").date() if isinstance(fd["start_date"], str) else fd["start_date"]
        end = datetime.strptime(fd["end_date"], "%Y-%m-%d").date() if isinstance(fd["end_date"], str) else fd["end_date"]
        
        is_before = today < start
        is_during = start <= today <= end
        is_after = today > end
        
        trigger_types = []
        if is_before:
            trigger_types.append("BEFORE")
        if is_during:
            trigger_types.append("DURING")
        if is_after:
            trigger_types.append("AFTER")
        
        # Get rules for this festival
        rule_query = {
            "festival_id": fd["festival_id"],
            "trigger_type": {"$in": trigger_types}
        }
        
        rules = await db.la_health_rules.find(rule_query, {"_id": 0}).to_list(50)
        
        festival_info = next((f for f in festivals if f["festival_id"] == fd["festival_id"]), {})
        
        for rule in rules:
            # Check if rule applies to user's conditions
            condition = rule.get("condition_type", "GENERAL")
            if condition == "GENERAL" or condition.upper() in [c.upper() for c in conditions]:
                payload = rule.get("action_payload", {})
                alerts.append({
                    "alert_id": f"{rule.get('rule_id', '')}_{fd['festival_date_id']}",
                    "alert_type": rule.get("action_type", "ALERT"),
                    "title": payload.get("title", "Health Alert"),
                    "message": payload.get("message", ""),
                    "priority": rule.get("priority_level", 1),
                    "festival_name": festival_info.get("festival_name", fd["festival_id"]),
                    "severity": payload.get("severity", "medium"),
                    "tests": payload.get("tests", []),
                    "action_url": None
                })
    
    # Sort by priority
    alerts.sort(key=lambda x: x["priority"])
    
    return {"alerts": alerts}

# ============ DASHBOARD ============

@router.get("/dashboard/{user_id}")
async def get_lifealign_dashboard(user_id: str):
    """Get complete LifeAlign dashboard for user"""
    db = await get_db()
    
    # Get user profile
    profile = await db.la_user_profiles.find_one({"user_id": user_id}, {"_id": 0})
    
    if not profile or not profile.get("religion_id"):
        # Return setup required dashboard
        return {
            "setup_required": True,
            "user_religion": None,
            "user_community": None,
            "location_type": "INDIA",
            "upcoming_festivals": [],
            "active_festivals": [],
            "health_alerts": [],
            "health_readiness_score": 100,
            "risk_flags": [],
            "recommended_tests": [],
            "medication_adjustments": []
        }
    
    religion_id = profile.get("religion_id")
    community_id = profile.get("community_id")
    conditions = profile.get("chronic_conditions", [])
    location_type = profile.get("location_type", "INDIA")
    
    # Get religion and community names
    religion = await db.la_religions.find_one({"religion_id": religion_id}, {"_id": 0})
    community = await db.la_communities.find_one({"community_id": community_id}, {"_id": 0}) if community_id else None
    
    # Get festivals
    today = date.today()
    festival_query = {"religion_id": religion_id}
    if community_id:
        festival_query["$or"] = [{"community_id": community_id}, {"community_id": None}]
    
    festivals = await db.la_festivals.find(festival_query, {"_id": 0}).to_list(100)
    festival_map = {f["festival_id"]: f for f in festivals}
    festival_ids = list(festival_map.keys())
    
    # Get festival dates
    date_query = {
        "festival_id": {"$in": festival_ids},
        "year": today.year
    }
    all_dates = await db.la_festival_dates.find(date_query, {"_id": 0}).to_list(100)
    
    upcoming_festivals = []
    active_festivals = []
    
    for fd in all_dates:
        start = datetime.strptime(fd["start_date"], "%Y-%m-%d").date() if isinstance(fd["start_date"], str) else fd["start_date"]
        end = datetime.strptime(fd["end_date"], "%Y-%m-%d").date() if isinstance(fd["end_date"], str) else fd["end_date"]
        festival_info = festival_map.get(fd["festival_id"], {})
        
        festival_data = {
            **fd,
            "festival_name": festival_info.get("festival_name", fd["festival_id"]),
            "festival_type": festival_info.get("festival_type", "CELEBRATION"),
            "days_remaining": max(0, (start - today).days),
            "is_active": start <= today <= end
        }
        
        if start <= today <= end:
            active_festivals.append(festival_data)
        elif start > today and (start - today).days <= 60:
            upcoming_festivals.append(festival_data)
    
    # Sort by start date
    upcoming_festivals.sort(key=lambda x: x["start_date"])
    
    # Get health alerts
    alerts_response = await get_health_alerts(user_id)
    health_alerts = alerts_response.get("alerts", [])
    
    # Calculate health readiness score
    health_readiness_score = 100
    risk_flags = []
    
    # Check for risk conditions
    high_risk_conditions = ["DIABETES", "CKD", "PREGNANCY", "HEART_DISEASE"]
    for condition in conditions:
        if condition.upper() in high_risk_conditions:
            risk_flags.append(f"Has {condition}")
            health_readiness_score -= 15
    
    # If fasting festival is active and has conditions
    fasting_active = any(f.get("festival_type") == "FASTING" for f in active_festivals)
    if fasting_active and conditions:
        health_readiness_score -= 10
        risk_flags.append("Fasting period active with health conditions")
    
    health_readiness_score = max(0, health_readiness_score)
    
    # Get recommended tests from alerts
    recommended_tests = []
    for alert in health_alerts:
        if alert.get("alert_type") == "RECOMMEND_TEST":
            for test in alert.get("tests", []):
                if test not in [t["name"] for t in recommended_tests]:
                    recommended_tests.append({"name": test, "reason": alert.get("title", "")})
    
    # Get medication adjustments
    medication_adjustments = [
        alert for alert in health_alerts 
        if alert.get("alert_type") == "MEDICATION_ADJUSTMENT"
    ]
    
    return {
        "setup_required": False,
        "user_religion": religion.get("religion_name") if religion else None,
        "user_community": community.get("community_name") if community else None,
        "location_type": location_type,
        "upcoming_festivals": upcoming_festivals[:5],
        "active_festivals": active_festivals,
        "health_alerts": health_alerts[:10],
        "health_readiness_score": health_readiness_score,
        "risk_flags": risk_flags,
        "recommended_tests": recommended_tests,
        "medication_adjustments": medication_adjustments
    }

# ============ FESTIVAL OPT-IN ============

@router.post("/user/festival-optin")
async def opt_in_festival(user_id: str, opt_in: UserFestivalOptIn):
    """Opt in/out of a festival's fasting/observance"""
    db = await get_db()
    
    await db.la_user_festival_status.update_one(
        {"user_id": user_id, "festival_date_id": opt_in.festival_date_id},
        {"$set": {
            "user_id": user_id,
            "festival_date_id": opt_in.festival_date_id,
            "fasting_opt_in": opt_in.fasting_opt_in,
            "updated_at": datetime.utcnow()
        }},
        upsert=True
    )
    
    return {"success": True}

@router.get("/user/festival-status/{user_id}/{festival_date_id}")
async def get_festival_status(user_id: str, festival_date_id: str):
    """Get user's opt-in status for a specific festival"""
    db = await get_db()
    
    status = await db.la_user_festival_status.find_one(
        {"user_id": user_id, "festival_date_id": festival_date_id},
        {"_id": 0}
    )
    
    return status or {"fasting_opt_in": None}


# ============ JAMATKHANA FINDER ============

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two points using Haversine formula"""
    R = 6371  # Earth radius in km
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

@router.get("/jamatkhanas")
async def get_jamatkhanas(
    country: Optional[str] = None,
    city: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    limit: int = 10
):
    """Get Jamatkhanas, optionally filtered by location or sorted by distance"""
    results = JAMATKHANAS.copy()
    
    # Filter by country
    if country:
        results = [jk for jk in results if jk["country"].lower() == country.lower()]
    
    # Filter by city
    if city:
        results = [jk for jk in results if city.lower() in jk["city"].lower()]
    
    # Sort by distance if coordinates provided
    if lat is not None and lng is not None:
        for jk in results:
            jk["distance_km"] = round(haversine_distance(lat, lng, jk["lat"], jk["lng"]), 1)
        results.sort(key=lambda x: x["distance_km"])
    
    return results[:limit]

@router.get("/jamatkhanas/nearest")
async def get_nearest_jamatkhana(lat: float, lng: float):
    """Get the nearest Jamatkhana to given coordinates"""
    results = JAMATKHANAS.copy()
    
    for jk in results:
        jk["distance_km"] = round(haversine_distance(lat, lng, jk["lat"], jk["lng"]), 1)
    
    results.sort(key=lambda x: x["distance_km"])
    
    return results[0] if results else None

# ============ RAMADAN DIET PLANS ============

@router.get("/ramadan/diet-plans")
async def get_ramadan_diet_plans():
    """Get all available Ramadan diet plans"""
    return {
        "available_plans": list(RAMADAN_DIET_PLANS.keys()),
        "plans": RAMADAN_DIET_PLANS
    }

@router.get("/ramadan/diet-plan/{condition}")
async def get_ramadan_diet_plan(condition: str):
    """Get specific Ramadan diet plan for a health condition"""
    condition_key = condition.lower()
    
    if condition_key not in RAMADAN_DIET_PLANS:
        raise HTTPException(status_code=404, detail=f"Diet plan not found for condition: {condition}")
    
    return RAMADAN_DIET_PLANS[condition_key]

@router.get("/ramadan/calendar")
async def get_ramadan_calendar(
    location: Optional[str] = "mumbai",
    timezone: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None
):
    """Get Ramadan calendar with Sehri/Iftar timings based on location/timezone"""
    
    # International timezone adjustments (UTC offset from India +5:30)
    TIMEZONE_ADJUSTMENTS = {
        "America/New_York": {"offset_hours": -10.5, "city": "New York"},
        "America/Toronto": {"offset_hours": -10.5, "city": "Toronto"},
        "America/Chicago": {"offset_hours": -11.5, "city": "Chicago"},
        "America/Denver": {"offset_hours": -12.5, "city": "Denver"},
        "America/Los_Angeles": {"offset_hours": -13.5, "city": "Los Angeles"},
        "America/Vancouver": {"offset_hours": -13.5, "city": "Vancouver"},
        "America/Edmonton": {"offset_hours": -12.5, "city": "Calgary/Edmonton"},
        "America/Phoenix": {"offset_hours": -12.5, "city": "Phoenix"},
        "America/Montreal": {"offset_hours": -10.5, "city": "Montreal"},
        "Europe/London": {"offset_hours": -5.5, "city": "London"},
        "Europe/Paris": {"offset_hours": -4.5, "city": "Paris"},
        "Asia/Dubai": {"offset_hours": -1.5, "city": "Dubai"},
        "Asia/Singapore": {"offset_hours": 2.5, "city": "Singapore"},
    }
    
    # If GPS coordinates provided, detect timezone
    detected_city = None
    if lat and lng:
        for city_key, city_data in TIMEZONE_DATA.items():
            distance = haversine_distance(lat, lng, city_data["lat"], city_data["lng"])
            if distance < 500:
                timezone = city_data["timezone"]
                detected_city = city_data["city"]
                break
    
    # If timezone provided, adjust timings
    if timezone and timezone in TIMEZONE_ADJUSTMENTS:
        adj = TIMEZONE_ADJUSTMENTS[timezone]
        adjusted_timings = []
        
        # Note: These are approximate times for the international city
        # In reality, Sehri/Iftar times depend on local sunrise/sunset
        # These are approximations based on typical Ramadan times for each region
        
        # Approximate Sehri/Iftar times for major regions during late Feb/March
        REGIONAL_TIMINGS = {
            "America/New_York": {"sehri_base": "05:15", "iftar_base": "18:05"},
            "America/Toronto": {"sehri_base": "05:30", "iftar_base": "18:10"},
            "America/Chicago": {"sehri_base": "05:25", "iftar_base": "18:00"},
            "America/Denver": {"sehri_base": "05:20", "iftar_base": "17:55"},
            "America/Los_Angeles": {"sehri_base": "05:10", "iftar_base": "18:00"},
            "America/Vancouver": {"sehri_base": "05:25", "iftar_base": "18:10"},
            "America/Edmonton": {"sehri_base": "05:35", "iftar_base": "18:05"},
            "America/Phoenix": {"sehri_base": "05:15", "iftar_base": "18:10"},
            "America/Montreal": {"sehri_base": "05:25", "iftar_base": "18:05"},
            "Europe/London": {"sehri_base": "05:30", "iftar_base": "17:45"},
            "Europe/Paris": {"sehri_base": "06:00", "iftar_base": "18:30"},
            "Asia/Dubai": {"sehri_base": "05:20", "iftar_base": "18:20"},
            "Asia/Singapore": {"sehri_base": "05:50", "iftar_base": "19:10"},
        }
        
        regional = REGIONAL_TIMINGS.get(timezone, {"sehri_base": "05:30", "iftar_base": "18:00"})
        sehri_base = regional["sehri_base"]
        iftar_base = regional["iftar_base"]
        
        for day in RAMADAN_TIMINGS_2026:
            # Adjust times slightly based on day of Ramadan (gets later as days progress)
            day_num = day["day"]
            sehri_parts = sehri_base.split(":")
            iftar_parts = iftar_base.split(":")
            
            # Sehri gets earlier, Iftar gets later as Ramadan progresses
            sehri_min_adj = -(day_num // 3)  # Gets earlier
            iftar_min_adj = (day_num // 3)   # Gets later
            
            sehri_hour = int(sehri_parts[0])
            sehri_min = int(sehri_parts[1]) + sehri_min_adj
            iftar_hour = int(iftar_parts[0])
            iftar_min = int(iftar_parts[1]) + iftar_min_adj
            
            # Handle minute overflow
            if sehri_min < 0:
                sehri_min += 60
                sehri_hour -= 1
            if iftar_min >= 60:
                iftar_min -= 60
                iftar_hour += 1
            
            adjusted_timings.append({
                **day,
                "sehri": f"{sehri_hour:02d}:{sehri_min:02d}",
                "iftar": f"{iftar_hour:02d}:{iftar_min:02d}",
                "timezone_adjusted": True
            })
        
        return {
            "location": detected_city or adj["city"],
            "timezone": timezone,
            "year": 2026,
            "ramadan_start": "2026-02-19",
            "ramadan_end": "2026-03-20",
            "eid_expected": "2026-03-21",
            "timings": adjusted_timings,
            "note": f"Timings for {adj['city']} ({timezone}). Please verify with local mosque/Jamatkhana for exact times."
        }
    
    # Default Mumbai timings
    return {
        "location": location.title(),
        "timezone": "Asia/Kolkata",
        "year": 2026,
        "ramadan_start": "2026-02-19",
        "ramadan_end": "2026-03-20",
        "eid_expected": "2026-03-21",
        "timings": RAMADAN_TIMINGS_2026,
        "note": "Timings are approximate. Please verify with local mosque/Jamatkhana."
    }



# ============ TIMEZONE DETECTION ============

# US/Canada timezone cities with their coordinates and UTC offsets
TIMEZONE_DATA = {
    # USA - Eastern
    "new_york": {"city": "New York", "state": "NY", "country": "USA", "timezone": "America/New_York", "utc_offset": -5, "lat": 40.7128, "lng": -74.0060},
    "miami": {"city": "Miami", "state": "FL", "country": "USA", "timezone": "America/New_York", "utc_offset": -5, "lat": 25.7617, "lng": -80.1918},
    "atlanta": {"city": "Atlanta", "state": "GA", "country": "USA", "timezone": "America/New_York", "utc_offset": -5, "lat": 33.7490, "lng": -84.3880},
    # USA - Central
    "chicago": {"city": "Chicago", "state": "IL", "country": "USA", "timezone": "America/Chicago", "utc_offset": -6, "lat": 41.8781, "lng": -87.6298},
    "houston": {"city": "Houston", "state": "TX", "country": "USA", "timezone": "America/Chicago", "utc_offset": -6, "lat": 29.7604, "lng": -95.3698},
    "dallas": {"city": "Dallas", "state": "TX", "country": "USA", "timezone": "America/Chicago", "utc_offset": -6, "lat": 32.7767, "lng": -96.7970},
    # USA - Mountain
    "denver": {"city": "Denver", "state": "CO", "country": "USA", "timezone": "America/Denver", "utc_offset": -7, "lat": 39.7392, "lng": -104.9903},
    "phoenix": {"city": "Phoenix", "state": "AZ", "country": "USA", "timezone": "America/Phoenix", "utc_offset": -7, "lat": 33.4484, "lng": -112.0740},
    # USA - Pacific
    "los_angeles": {"city": "Los Angeles", "state": "CA", "country": "USA", "timezone": "America/Los_Angeles", "utc_offset": -8, "lat": 34.0522, "lng": -118.2437},
    "san_francisco": {"city": "San Francisco", "state": "CA", "country": "USA", "timezone": "America/Los_Angeles", "utc_offset": -8, "lat": 37.7749, "lng": -122.4194},
    "seattle": {"city": "Seattle", "state": "WA", "country": "USA", "timezone": "America/Los_Angeles", "utc_offset": -8, "lat": 47.6062, "lng": -122.3321},
    # Canada - Eastern
    "toronto": {"city": "Toronto", "state": "ON", "country": "Canada", "timezone": "America/Toronto", "utc_offset": -5, "lat": 43.6532, "lng": -79.3832},
    "montreal": {"city": "Montreal", "state": "QC", "country": "Canada", "timezone": "America/Montreal", "utc_offset": -5, "lat": 45.5017, "lng": -73.5673},
    "ottawa": {"city": "Ottawa", "state": "ON", "country": "Canada", "timezone": "America/Toronto", "utc_offset": -5, "lat": 45.4215, "lng": -75.6972},
    # Canada - Central/Mountain
    "calgary": {"city": "Calgary", "state": "AB", "country": "Canada", "timezone": "America/Edmonton", "utc_offset": -7, "lat": 51.0447, "lng": -114.0719},
    "edmonton": {"city": "Edmonton", "state": "AB", "country": "Canada", "timezone": "America/Edmonton", "utc_offset": -7, "lat": 53.5461, "lng": -113.4938},
    # Canada - Pacific
    "vancouver": {"city": "Vancouver", "state": "BC", "country": "Canada", "timezone": "America/Vancouver", "utc_offset": -8, "lat": 49.2827, "lng": -123.1207}
}

@router.get("/timezone/detect")
async def detect_timezone(lat: float, lng: float):
    """Detect timezone based on coordinates"""
    from datetime import datetime, timezone as tz
    
    # Find nearest city
    nearest_city = None
    min_distance = float("inf")
    
    for city_key, city_data in TIMEZONE_DATA.items():
        distance = haversine_distance(lat, lng, city_data["lat"], city_data["lng"])
        if distance < min_distance:
            min_distance = distance
            nearest_city = city_data
    
    if nearest_city and min_distance < 500:  # Within 500km
        return {
            "detected": True,
            "city": nearest_city["city"],
            "state": nearest_city["state"],
            "country": nearest_city["country"],
            "timezone": nearest_city["timezone"],
            "utc_offset": nearest_city["utc_offset"],
            "distance_km": round(min_distance, 1)
        }
    else:
        return {
            "detected": False,
            "message": "Location not in USA/Canada coverage area",
            "lat": lat,
            "lng": lng
        }

@router.get("/ramadan/timings-abroad")
async def get_ramadan_timings_abroad(city: str):
    """Get Ramadan timings for USA/Canada cities"""
    city_key = city.lower().replace(" ", "_")
    
    if city_key not in TIMEZONE_DATA:
        raise HTTPException(status_code=404, detail=f"City not found: {city}")
    
    city_data = TIMEZONE_DATA[city_key]
    utc_offset = city_data["utc_offset"]
    
    # Calculate approximate Sehri/Iftar times based on UTC offset
    # These are approximations - actual times depend on latitude and season
    base_sehri = 5  # 5 AM approximate
    base_iftar = 18  # 6 PM approximate
    
    # Ramadan 2026 dates
    timings = []
    from datetime import date, timedelta
    
    start_date = date(2026, 2, 19)
    for i in range(30):
        current_date = start_date + timedelta(days=i)
        day_num = i + 1
        
        # Adjust times slightly based on day number (sunrise/sunset changes)
        sehri_adj = 5 + (i * 0.02)  # Gets slightly earlier
        iftar_adj = 18 + (i * 0.03)  # Gets slightly later
        
        timings.append({
            "day": day_num,
            "date": current_date.strftime("%Y-%m-%d"),
            "sehri": f"{int(sehri_adj):02d}:{int((sehri_adj % 1) * 60):02d}",
            "iftar": f"{int(iftar_adj):02d}:{int((iftar_adj % 1) * 60):02d}",
            "special": "Laylatul Qadr (probable)" if day_num in [21, 23, 25, 27, 29] else None
        })
    
    return {
        "city": city_data["city"],
        "state": city_data["state"],
        "country": city_data["country"],
        "timezone": city_data["timezone"],
        "timings": timings,
        "note": "Times are approximate. Please verify with local mosque/Islamic center."
    }



# ============ EMAIL & WHATSAPP NOTIFICATION ENDPOINTS ============

import resend
import asyncio

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "Nevika Cura <noreply@nevikacura.com>")

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

@router.post("/send-credentials-email")
async def send_faithcare_credentials_email(to_email: str = "nevikacura@gmail.com"):
    """Send all 30 FaithCare login credentials via email"""
    
    if not RESEND_API_KEY:
        raise HTTPException(status_code=500, detail="Email service not configured")
    
    # Build HTML table of credentials
    credentials_rows = ""
    for idx, account in enumerate(FAITHCARE_ACCOUNTS, 1):
        credentials_rows += f"""
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; text-align: center;">{idx}</td>
            <td style="padding: 10px; font-family: monospace; font-weight: bold;">{account['user_id']}</td>
            <td style="padding: 10px; font-family: monospace;">{account['password']}</td>
        </tr>
        """
    
    html_content = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #f8fafc;">
        <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <img src="https://customer-assets.emergentagent.com/job_c3c7c000-c0b8-475a-b79b-a8334b822713/artifacts/52amv6l6_file_00000000e2a47209b2515ab5afe77eeb.png" alt="FaithCare" style="height: 80px; margin-bottom: 15px;" />
            <h1 style="color: #f59e0b; margin: 0; font-size: 28px;">FaithCare</h1>
            <p style="color: #94a3b8; margin: 10px 0 0 0;">Exclusive Access Credentials</p>
        </div>
        
        <div style="padding: 30px; background: white;">
            <p style="color: #334155; font-size: 16px; line-height: 1.6;">
                Below are the <strong>30 exclusive FaithCare access credentials</strong> for your users. 
                Each user can log in to the FaithCare portal at:
            </p>
            
            <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <a href="https://mango-labs-portal.preview.emergentagent.com/faithcare" style="color: #f59e0b; font-weight: bold; font-size: 16px;">
                    https://mango-labs-portal.preview.emergentagent.com/faithcare
                </a>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <thead>
                    <tr style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white;">
                        <th style="padding: 15px; text-align: center; width: 60px;">#</th>
                        <th style="padding: 15px; text-align: left;">Access ID</th>
                        <th style="padding: 15px; text-align: left;">Password</th>
                    </tr>
                </thead>
                <tbody>
                    {credentials_rows}
                </tbody>
            </table>
            
            <div style="margin-top: 30px; padding: 20px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e; font-weight: bold;">Important Notes:</p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #92400e;">
                    <li>These credentials are for exclusive FaithCare portal access</li>
                    <li>Users can customize their religion, community, and health conditions</li>
                    <li>Festival reminders and health alerts will be sent based on user profile</li>
                </ul>
            </div>
        </div>
        
        <div style="padding: 20px; text-align: center; background: #1e293b; border-radius: 0 0 12px 12px;">
            <p style="color: #64748b; margin: 0; font-size: 14px;">
                &copy; 2026 Nevika Cura - FaithCare | Cultural Health Sync
            </p>
        </div>
    </div>
    """
    
    try:
        # Send email using Resend
        params = {
            "from": SENDER_EMAIL,
            "to": [to_email],
            "subject": "FaithCare - 30 Exclusive Access Credentials",
            "html": html_content
        }
        
        email_result = await asyncio.to_thread(resend.Emails.send, params)
        
        return {
            "success": True,
            "message": f"Credentials email sent successfully to {to_email}",
            "email_id": email_result.get("id") if isinstance(email_result, dict) else str(email_result),
            "credentials_count": len(FAITHCARE_ACCOUNTS)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


# ============ WHATSAPP REMINDER SERVICE ============

from services.msg91_whatsapp import send_msg91_whatsapp

# MSG91 WhatsApp Templates for FaithCare
FAITHCARE_TEMPLATES = {
    "sehri_reminder": "faithcare_sehri_reminder",
    "iftar_reminder": "faithcare_iftar_reminder", 
    "festival_reminder": "faithcare_festival_reminder",
    "health_alert": "faithcare_health_alert"
}

@router.post("/whatsapp/register")
async def register_whatsapp_number(
    user_id: str,
    whatsapp_number: str,
    enable_sehri_reminder: bool = True,
    enable_iftar_reminder: bool = True,
    enable_festival_alerts: bool = True
):
    """Register WhatsApp number for FaithCare reminders"""
    
    # Validate user exists
    user_found = False
    for account in FAITHCARE_ACCOUNTS:
        if account["user_id"] == user_id:
            user_found = True
            break
    
    if not user_found:
        raise HTTPException(status_code=404, detail="FaithCare user not found")
    
    # Clean phone number
    clean_number = whatsapp_number.replace("+", "").replace(" ", "").replace("-", "")
    if not clean_number.startswith("91"):
        clean_number = "91" + clean_number
    
    db = await get_db()
    
    # Save/Update WhatsApp preferences
    await db.faithcare_whatsapp_prefs.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "whatsapp_number": clean_number,
            "enable_sehri_reminder": enable_sehri_reminder,
            "enable_iftar_reminder": enable_iftar_reminder,
            "enable_festival_alerts": enable_festival_alerts,
            "updated_at": datetime.utcnow()
        }},
        upsert=True
    )
    
    return {
        "success": True,
        "message": f"WhatsApp registered for user {user_id}",
        "whatsapp_number": clean_number,
        "preferences": {
            "sehri_reminder": enable_sehri_reminder,
            "iftar_reminder": enable_iftar_reminder,
            "festival_alerts": enable_festival_alerts
        }
    }


@router.post("/whatsapp/send-sehri-reminder")
async def send_sehri_reminder(
    whatsapp_number: str,
    user_name: str = "User",
    sehri_time: str = "04:30 AM",
    date_str: str = None
):
    """Send Sehri reminder via WhatsApp"""
    
    # Clean phone number
    clean_number = whatsapp_number.replace("+", "").replace(" ", "").replace("-", "")
    if not clean_number.startswith("91"):
        clean_number = "91" + clean_number
    
    if not date_str:
        date_str = datetime.now().strftime("%d %b %Y")
    
    db = await get_db()
    
    # Use MSG91 to send WhatsApp message
    # Template: faithcare_sehri_remind (note: no "er" at end)
    # Variables: [user_name, sehri_time, date]
    try:
        result = await send_msg91_whatsapp(
            recipient_phone=clean_number,
            template_name="faithcare_sehri_remind",
            variables=[user_name, sehri_time, date_str],
            db=db,
            reference_id=f"sehri_{clean_number}_{datetime.now().strftime('%Y%m%d')}",
            message_type="faithcare_reminder"
        )
        
        return {
            "success": True,
            "message": f"Sehri reminder sent to {clean_number}",
            "reminder": {
                "type": "sehri",
                "time": sehri_time,
                "date": date_str,
                "user": user_name
            },
            "msg91_response": result
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "note": "MSG91 template 'faithcare_sehri_remind' may need to be registered"
        }


@router.post("/whatsapp/send-iftar-reminder")
async def send_iftar_reminder(
    whatsapp_number: str,
    user_name: str = "User",
    iftar_time: str = "06:45 PM",
    date_str: str = None
):
    """Send Iftar reminder via WhatsApp"""
    
    clean_number = whatsapp_number.replace("+", "").replace(" ", "").replace("-", "")
    if not clean_number.startswith("91"):
        clean_number = "91" + clean_number
    
    if not date_str:
        date_str = datetime.now().strftime("%d %b %Y")
    
    db = await get_db()
    
    try:
        result = await send_msg91_whatsapp(
            recipient_phone=clean_number,
            template_name="faithcare_iftar_reminder",
            variables=[user_name, iftar_time, date_str],
            db=db,
            reference_id=f"iftar_{clean_number}_{datetime.now().strftime('%Y%m%d')}",
            message_type="faithcare_reminder"
        )
        
        return {
            "success": True,
            "message": f"Iftar reminder sent to {clean_number}",
            "reminder": {
                "type": "iftar",
                "time": iftar_time,
                "date": date_str,
                "user": user_name
            },
            "msg91_response": result
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "note": "MSG91 template 'faithcare_iftar_reminder' may need to be registered"
        }


@router.post("/whatsapp/send-festival-reminder")
async def send_festival_reminder(
    whatsapp_number: str,
    user_name: str = "User",
    festival_name: str = "Festival",
    festival_date: str = None,
    message: str = None
):
    """Send important festival/date reminder via WhatsApp"""
    
    clean_number = whatsapp_number.replace("+", "").replace(" ", "").replace("-", "")
    if not clean_number.startswith("91"):
        clean_number = "91" + clean_number
    
    if not festival_date:
        festival_date = datetime.now().strftime("%d %b %Y")
    
    if not message:
        message = f"Wishing you a blessed {festival_name}!"
    
    db = await get_db()
    
    try:
        result = await send_msg91_whatsapp(
            recipient_phone=clean_number,
            template_name="faithcare_festival_reminder",
            variables=[user_name, festival_name, festival_date, message],
            db=db,
            reference_id=f"festival_{clean_number}_{datetime.now().strftime('%Y%m%d')}",
            message_type="faithcare_reminder"
        )
        
        return {
            "success": True,
            "message": f"Festival reminder sent to {clean_number}",
            "reminder": {
                "type": "festival",
                "festival": festival_name,
                "date": festival_date,
                "user": user_name
            },
            "msg91_response": result
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "note": "MSG91 template 'faithcare_festival_reminder' may need to be registered"
        }


@router.get("/whatsapp/user-preferences/{user_id}")
async def get_whatsapp_preferences(user_id: str):
    """Get WhatsApp notification preferences for a user"""
    
    db = await get_db()
    prefs = await db.faithcare_whatsapp_prefs.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )
    
    if not prefs:
        return {
            "user_id": user_id,
            "registered": False,
            "message": "No WhatsApp preferences found for this user"
        }
    
    return {
        "user_id": user_id,
        "registered": True,
        "preferences": prefs
    }


@router.post("/whatsapp/bulk-reminder")
async def send_bulk_reminder(
    reminder_type: str,  # "sehri", "iftar", "festival"
    time_str: str = None,
    festival_name: str = None,
    message: str = None
):
    """Send bulk reminder to all registered FaithCare users"""
    
    db = await get_db()
    
    # Get all registered users
    cursor = db.faithcare_whatsapp_prefs.find({}, {"_id": 0})
    users = await cursor.to_list(length=100)
    
    if not users:
        return {
            "success": False,
            "message": "No users registered for WhatsApp reminders"
        }
    
    results = []
    success_count = 0
    
    for user in users:
        # Check preferences
        if reminder_type == "sehri" and not user.get("enable_sehri_reminder", True):
            continue
        if reminder_type == "iftar" and not user.get("enable_iftar_reminder", True):
            continue
        if reminder_type == "festival" and not user.get("enable_festival_alerts", True):
            continue
        
        try:
            if reminder_type == "sehri":
                result = await send_sehri_reminder(
                    whatsapp_number=user["whatsapp_number"],
                    user_name=user.get("user_name", "User"),
                    sehri_time=time_str or "04:30 AM"
                )
            elif reminder_type == "iftar":
                result = await send_iftar_reminder(
                    whatsapp_number=user["whatsapp_number"],
                    user_name=user.get("user_name", "User"),
                    iftar_time=time_str or "06:45 PM"
                )
            elif reminder_type == "festival":
                result = await send_festival_reminder(
                    whatsapp_number=user["whatsapp_number"],
                    user_name=user.get("user_name", "User"),
                    festival_name=festival_name or "Important Day",
                    message=message
                )
            else:
                continue
            
            if result.get("success"):
                success_count += 1
            results.append({"user_id": user["user_id"], "result": result})
        except Exception as e:
            results.append({"user_id": user["user_id"], "error": str(e)})
    
    return {
        "success": True,
        "reminder_type": reminder_type,
        "total_users": len(users),
        "sent_successfully": success_count,
        "details": results
    }

