from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import os

router = APIRouter(prefix="/wearables", tags=["Smart Wearables"])

db = None

def set_db(database):
    global db
    db = database

# ── Models ──

class SyncDataRequest(BaseModel):
    phone: str
    source: str = "google_fit"  # google_fit, manual
    data_type: str  # steps, heart_rate, sleep, calories, distance, weight
    value: float
    unit: str
    date: Optional[str] = None
    metadata: Optional[dict] = None

class GoogleFitAuthRequest(BaseModel):
    phone: str
    auth_code: str

# ── Google Fit OAuth Config ──

GOOGLE_FIT_SCOPES = [
    "https://www.googleapis.com/auth/fitness.activity.read",
    "https://www.googleapis.com/auth/fitness.body.read",
    "https://www.googleapis.com/auth/fitness.heart_rate.read",
    "https://www.googleapis.com/auth/fitness.sleep.read",
]

DATA_TYPES = {
    "steps": {"name": "Steps", "icon": "footprints", "unit": "steps", "daily_goal": 10000},
    "heart_rate": {"name": "Heart Rate", "icon": "heart-pulse", "unit": "bpm", "normal_range": "60-100"},
    "sleep": {"name": "Sleep", "icon": "moon", "unit": "hours", "daily_goal": 8},
    "calories": {"name": "Calories Burned", "icon": "flame", "unit": "kcal", "daily_goal": 2000},
    "distance": {"name": "Distance", "icon": "map-pin", "unit": "km", "daily_goal": 5},
    "weight": {"name": "Weight", "icon": "scale", "unit": "kg", "normal_range": "BMI 18.5-24.9"},
}

# ── Endpoints ──

@router.get("/google-fit/auth-url")
async def get_google_fit_auth_url(request: Request):
    """Get Google Fit OAuth URL for user authorization"""
    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    if not client_id or "your-google" in client_id:
        raise HTTPException(500, "Google OAuth not configured")

    # Build redirect URI dynamically from the incoming request origin
    base_url = os.environ.get("CHECKOUT_BASE_URL", str(request.base_url).rstrip("/"))
    redirect_uri = base_url + "/api/wearables/google-fit/callback"
    scope = " ".join(GOOGLE_FIT_SCOPES)

    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"response_type=code&"
        f"scope={scope}&"
        f"access_type=offline&"
        f"prompt=consent"
    )
    return {"auth_url": auth_url, "redirect_uri": redirect_uri}


@router.get("/google-fit/callback")
async def google_fit_callback(code: str = Query(...), state: str = Query(None)):
    """Handle Google Fit OAuth callback"""
    import httpx

    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.environ.get("CHECKOUT_BASE_URL", "") + "/api/wearables/google-fit/callback"

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post("https://oauth2.googleapis.com/token", data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            })
            token_data = resp.json()
    except Exception as e:
        raise HTTPException(500, f"Token exchange failed: {str(e)}")

    if "access_token" not in token_data:
        raise HTTPException(400, f"Auth failed: {token_data.get('error_description', 'Unknown error')}")

    # Store tokens (in production, encrypt these)
    await db.wearable_tokens.update_one(
        {"phone": state or "unknown"},
        {"$set": {
            "access_token": token_data["access_token"],
            "refresh_token": token_data.get("refresh_token", ""),
            "expires_in": token_data.get("expires_in", 3600),
            "source": "google_fit",
            "connected_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True
    )

    return {"message": "Google Fit connected!", "connected": True}


@router.post("/sync")
async def sync_health_data(req: SyncDataRequest):
    """Sync health data from wearable or manual input"""
    if req.data_type not in DATA_TYPES:
        raise HTTPException(400, f"Invalid data type. Choose from: {', '.join(DATA_TYPES.keys())}")

    date = req.date or datetime.now(timezone.utc).strftime("%Y-%m-%d")

    entry = {
        "phone": req.phone,
        "source": req.source,
        "data_type": req.data_type,
        "value": req.value,
        "unit": req.unit,
        "date": date,
        "metadata": req.metadata or {},
        "synced_at": datetime.now(timezone.utc).isoformat(),
    }

    # Upsert - one value per type per day per source
    await db.wearable_data.update_one(
        {"phone": req.phone, "data_type": req.data_type, "date": date, "source": req.source},
        {"$set": entry},
        upsert=True
    )

    data_info = DATA_TYPES[req.data_type]
    goal = data_info.get("daily_goal")
    goal_met = req.value >= goal if goal else None

    return {
        "message": f"{data_info['name']} synced",
        "data_type": req.data_type,
        "value": req.value,
        "unit": req.unit,
        "goal": goal,
        "goal_met": goal_met,
    }


@router.get("/data/{phone}")
async def get_wearable_data(phone: str, days: int = 7, data_type: Optional[str] = None):
    """Get wearable health data for a user"""
    from datetime import timedelta
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")

    query = {"phone": phone, "date": {"$gte": start_date}}
    if data_type:
        query["data_type"] = data_type

    data = await db.wearable_data.find(query, {"_id": 0}).sort("date", -1).to_list(200)

    # Group by data type
    grouped = {}
    for d in data:
        dt = d["data_type"]
        if dt not in grouped:
            grouped[dt] = {"info": DATA_TYPES.get(dt, {}), "entries": []}
        grouped[dt]["entries"].append(d)

    return {"data": grouped, "total_entries": len(data), "days": days}


@router.get("/summary/{phone}")
async def get_wearable_summary(phone: str):
    """Get today's wearable health summary"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    today_data = await db.wearable_data.find(
        {"phone": phone, "date": today}, {"_id": 0}
    ).to_list(20)

    summary = {}
    for d in today_data:
        dt = d["data_type"]
        info = DATA_TYPES.get(dt, {})
        goal = info.get("daily_goal")
        summary[dt] = {
            "value": d["value"],
            "unit": d["unit"],
            "goal": goal,
            "progress": round((d["value"] / goal) * 100) if goal else None,
            "name": info.get("name", dt),
            "icon": info.get("icon", ""),
        }

    # Check connection status
    token = await db.wearable_tokens.find_one({"phone": phone}, {"_id": 0, "source": 1, "connected_at": 1})
    connected = bool(token)

    return {
        "today": summary,
        "connected": connected,
        "connection_source": token.get("source") if token else None,
        "data_types": DATA_TYPES,
    }


@router.get("/connection/{phone}")
async def check_connection(phone: str):
    """Check if a wearable is connected"""
    token = await db.wearable_tokens.find_one({"phone": phone}, {"_id": 0, "source": 1, "connected_at": 1})
    return {
        "connected": bool(token),
        "source": token.get("source") if token else None,
        "connected_at": token.get("connected_at") if token else None,
    }
