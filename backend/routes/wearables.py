"""
Terra Wearable Integration with MongoDB Storage
- Receives webhook data from Terra API
- Stores wearable data in MongoDB
- Provides endpoints to query stored data
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import requests
import os

router = APIRouter(prefix="/wearables", tags=["Wearables"])

# Database connection (injected from main server)
db = None

def get_db():
    global db
    return db

def set_db(database):
    global db
    db = database

# Terra API Configuration
TERRA_API_KEY = os.environ.get("TERRA_API_KEY", "")
TERRA_DEV_ID = os.environ.get("TERRA_DEV_ID", "")
TERRA_WEBHOOK_SECRET = os.environ.get("TERRA_WEBHOOK_SECRET", "")
TERRA_BASE_URL = "https://api.tryterra.co/v2"

def get_terra_headers():
    return {
        "x-api-key": TERRA_API_KEY,
        "dev-id": TERRA_DEV_ID,
        "Content-Type": "application/json"
    }

# ==================== TERRA AUTH & CONNECTION ====================

@router.post("/terra/connect")
async def connect_terra_wearable(user_id: str):
    """
    Generate Terra auth widget URL for user to connect their wearable.
    User clicks this URL → selects device → authorizes → Terra sends data via webhook
    """
    if not TERRA_API_KEY:
        raise HTTPException(status_code=500, detail="Terra API not configured")
    
    response = requests.post(
        f"{TERRA_BASE_URL}/auth/generateWidgetSession",
        headers=get_terra_headers(),
        json={
            "reference_id": user_id,  # Links Terra user to YOUR user
            "providers": "FITBIT,GARMIN,OURA,WHOOP,APPLE,GOOGLE,SAMSUNG,POLAR",
            "language": "en",
            "auth_success_redirect_url": f"{os.environ.get('FRONTEND_URL', '')}/wearable-connected",
            "auth_failure_redirect_url": f"{os.environ.get('FRONTEND_URL', '')}/wearable-failed"
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        
        # Store the connection attempt in MongoDB
        db = get_db()
        await db.wearable_connections.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "user_id": user_id,
                    "status": "pending",
                    "session_id": data.get("session_id"),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        return {
            "widget_url": data.get("url"),
            "session_id": data.get("session_id"),
            "message": "Open this URL to connect your wearable device"
        }
    
    raise HTTPException(status_code=400, detail="Failed to generate Terra widget")

# ==================== TERRA WEBHOOK → MONGODB ====================

@router.post("/terra/webhook")
async def terra_webhook(request: Request):
    """
    Terra sends ALL wearable data here via webhook.
    We store it directly in MongoDB.
    
    Terra Data Flow:
    1. User connects wearable via widget
    2. Terra pulls data from wearable (Fitbit, Garmin, etc.)
    3. Terra sends data to this webhook endpoint
    4. We store in MongoDB for later use
    """
    db = get_db()
    payload = await request.json()
    
    # Verify webhook signature (optional but recommended)
    # signature = request.headers.get("terra-signature")
    # if not verify_signature(payload, signature):
    #     raise HTTPException(status_code=401, detail="Invalid signature")
    
    event_type = payload.get("type")
    user = payload.get("user", {})
    terra_user_id = user.get("user_id")
    reference_id = user.get("reference_id")  # YOUR user_id
    provider = user.get("provider")  # FITBIT, GARMIN, etc.
    
    # Store raw webhook for debugging
    await db.terra_webhooks_raw.insert_one({
        "received_at": datetime.now(timezone.utc).isoformat(),
        "event_type": event_type,
        "payload": payload
    })
    
    # Handle different event types
    if event_type == "user_reauth":
        # User needs to re-authenticate their wearable
        await db.wearable_connections.update_one(
            {"user_id": reference_id},
            {"$set": {"status": "reauth_required", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"status": "received", "action": "user_reauth_needed"}
    
    elif event_type == "auth":
        # User successfully connected their wearable
        await db.wearable_connections.update_one(
            {"user_id": reference_id},
            {
                "$set": {
                    "status": "connected",
                    "terra_user_id": terra_user_id,
                    "provider": provider,
                    "connected_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        return {"status": "received", "action": "user_connected"}
    
    elif event_type == "deauth":
        # User disconnected their wearable
        await db.wearable_connections.update_one(
            {"user_id": reference_id},
            {"$set": {"status": "disconnected", "disconnected_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"status": "received", "action": "user_disconnected"}
    
    # DATA EVENTS - Store in MongoDB
    data_list = payload.get("data", [])
    
    if event_type == "activity":
        # Activity data: steps, calories, distance, heart rate
        for activity in data_list:
            activity_doc = {
                "user_id": reference_id,
                "terra_user_id": terra_user_id,
                "provider": provider,
                "date": activity.get("metadata", {}).get("start_time", "")[:10],
                "start_time": activity.get("metadata", {}).get("start_time"),
                "end_time": activity.get("metadata", {}).get("end_time"),
                # Key metrics
                "steps": activity.get("distance_data", {}).get("steps"),
                "distance_meters": activity.get("distance_data", {}).get("distance_meters"),
                "calories": activity.get("calories_data", {}).get("total_burned_calories"),
                "active_calories": activity.get("calories_data", {}).get("net_activity_calories"),
                "active_duration_seconds": activity.get("active_durations_data", {}).get("activity_seconds"),
                # Heart rate
                "avg_heart_rate": activity.get("heart_rate_data", {}).get("summary", {}).get("avg_hr_bpm"),
                "max_heart_rate": activity.get("heart_rate_data", {}).get("summary", {}).get("max_hr_bpm"),
                "resting_heart_rate": activity.get("heart_rate_data", {}).get("summary", {}).get("resting_hr_bpm"),
                # Raw data for detailed analysis
                "raw_data": activity,
                "received_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Upsert by user_id + date to avoid duplicates
            await db.wearable_activity.update_one(
                {"user_id": reference_id, "date": activity_doc["date"]},
                {"$set": activity_doc},
                upsert=True
            )
        
        return {"status": "received", "type": "activity", "records": len(data_list)}
    
    elif event_type == "sleep":
        # Sleep data: duration, stages, quality
        for sleep in data_list:
            sleep_doc = {
                "user_id": reference_id,
                "terra_user_id": terra_user_id,
                "provider": provider,
                "date": sleep.get("metadata", {}).get("start_time", "")[:10],
                "start_time": sleep.get("metadata", {}).get("start_time"),
                "end_time": sleep.get("metadata", {}).get("end_time"),
                # Key metrics
                "total_sleep_seconds": sleep.get("sleep_durations_data", {}).get("asleep", {}).get("duration_asleep_state_seconds"),
                "deep_sleep_seconds": sleep.get("sleep_durations_data", {}).get("asleep", {}).get("duration_deep_sleep_state_seconds"),
                "rem_sleep_seconds": sleep.get("sleep_durations_data", {}).get("asleep", {}).get("duration_REM_sleep_state_seconds"),
                "light_sleep_seconds": sleep.get("sleep_durations_data", {}).get("asleep", {}).get("duration_light_sleep_state_seconds"),
                "awake_seconds": sleep.get("sleep_durations_data", {}).get("awake", {}).get("duration_awake_state_seconds"),
                "sleep_efficiency": sleep.get("sleep_durations_data", {}).get("sleep_efficiency"),
                # Heart rate during sleep
                "avg_hr_bpm": sleep.get("heart_rate_data", {}).get("summary", {}).get("avg_hr_bpm"),
                "min_hr_bpm": sleep.get("heart_rate_data", {}).get("summary", {}).get("min_hr_bpm"),
                # HRV
                "avg_hrv": sleep.get("heart_rate_data", {}).get("summary", {}).get("avg_hrv_rmssd"),
                # SpO2
                "avg_spo2": sleep.get("oxygen_data", {}).get("avg_saturation_percentage"),
                # Raw data
                "raw_data": sleep,
                "received_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.wearable_sleep.update_one(
                {"user_id": reference_id, "date": sleep_doc["date"]},
                {"$set": sleep_doc},
                upsert=True
            )
        
        return {"status": "received", "type": "sleep", "records": len(data_list)}
    
    elif event_type == "body":
        # Body data: weight, body fat, BMI
        for body in data_list:
            body_doc = {
                "user_id": reference_id,
                "terra_user_id": terra_user_id,
                "provider": provider,
                "date": body.get("metadata", {}).get("start_time", "")[:10],
                "weight_kg": body.get("measurements_data", {}).get("weight_kg"),
                "body_fat_percentage": body.get("measurements_data", {}).get("bodyfat_percentage"),
                "bmi": body.get("measurements_data", {}).get("BMI"),
                "muscle_mass_kg": body.get("measurements_data", {}).get("muscle_mass_kg"),
                "bone_mass_kg": body.get("measurements_data", {}).get("bone_mass_kg"),
                "water_percentage": body.get("measurements_data", {}).get("water_percentage"),
                "raw_data": body,
                "received_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.wearable_body.update_one(
                {"user_id": reference_id, "date": body_doc["date"]},
                {"$set": body_doc},
                upsert=True
            )
        
        return {"status": "received", "type": "body", "records": len(data_list)}
    
    elif event_type == "daily":
        # Daily summary data
        for daily in data_list:
            daily_doc = {
                "user_id": reference_id,
                "terra_user_id": terra_user_id,
                "provider": provider,
                "date": daily.get("metadata", {}).get("start_time", "")[:10],
                "steps": daily.get("distance_data", {}).get("steps"),
                "calories_total": daily.get("calories_data", {}).get("total_burned_calories"),
                "calories_active": daily.get("calories_data", {}).get("net_activity_calories"),
                "distance_meters": daily.get("distance_data", {}).get("distance_meters"),
                "floors_climbed": daily.get("distance_data", {}).get("floors_climbed"),
                "stress_avg": daily.get("stress_data", {}).get("avg_stress_level"),
                "raw_data": daily,
                "received_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.wearable_daily.update_one(
                {"user_id": reference_id, "date": daily_doc["date"]},
                {"$set": daily_doc},
                upsert=True
            )
        
        return {"status": "received", "type": "daily", "records": len(data_list)}
    
    elif event_type == "menstruation":
        # Menstruation data (for Evara integration)
        for mens in data_list:
            mens_doc = {
                "user_id": reference_id,
                "terra_user_id": terra_user_id,
                "provider": provider,
                "date": mens.get("metadata", {}).get("start_time", "")[:10],
                "cycle_day": mens.get("menstruation_data", {}).get("current_day_in_cycle"),
                "cycle_length": mens.get("menstruation_data", {}).get("length_of_cycle"),
                "period_length": mens.get("menstruation_data", {}).get("period_length_days"),
                "is_predicted_cycle": mens.get("menstruation_data", {}).get("is_predicted_cycle"),
                "ovulation_day": mens.get("menstruation_data", {}).get("predicted_ovulation_day"),
                "raw_data": mens,
                "received_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.wearable_menstruation.update_one(
                {"user_id": reference_id, "date": mens_doc["date"]},
                {"$set": mens_doc},
                upsert=True
            )
        
        return {"status": "received", "type": "menstruation", "records": len(data_list)}
    
    # Unknown event type - just log it
    return {"status": "received", "type": event_type, "action": "logged"}

# ==================== QUERY WEARABLE DATA FROM MONGODB ====================

@router.get("/data/activity/{user_id}")
async def get_activity_data(user_id: str, days: int = 7):
    """Get stored activity data for a user"""
    db = get_db()
    
    from_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    
    data = await db.wearable_activity.find(
        {"user_id": user_id, "date": {"$gte": from_date}},
        {"_id": 0, "raw_data": 0}
    ).sort("date", -1).to_list(days)
    
    # Calculate summary
    if data:
        total_steps = sum(d.get("steps", 0) or 0 for d in data)
        avg_steps = total_steps // len(data)
        avg_calories = sum(d.get("calories", 0) or 0 for d in data) // len(data)
    else:
        total_steps = avg_steps = avg_calories = 0
    
    return {
        "user_id": user_id,
        "period_days": days,
        "summary": {
            "total_steps": total_steps,
            "avg_daily_steps": avg_steps,
            "avg_daily_calories": avg_calories
        },
        "daily_data": data
    }

@router.get("/data/sleep/{user_id}")
async def get_sleep_data(user_id: str, days: int = 7):
    """Get stored sleep data for a user"""
    db = get_db()
    
    from_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    
    data = await db.wearable_sleep.find(
        {"user_id": user_id, "date": {"$gte": from_date}},
        {"_id": 0, "raw_data": 0}
    ).sort("date", -1).to_list(days)
    
    # Calculate summary
    if data:
        avg_sleep_hours = sum((d.get("total_sleep_seconds", 0) or 0) / 3600 for d in data) / len(data)
        avg_efficiency = sum(d.get("sleep_efficiency", 0) or 0 for d in data) / len(data)
    else:
        avg_sleep_hours = avg_efficiency = 0
    
    return {
        "user_id": user_id,
        "period_days": days,
        "summary": {
            "avg_sleep_hours": round(avg_sleep_hours, 1),
            "avg_efficiency": round(avg_efficiency, 1)
        },
        "daily_data": data
    }

@router.get("/data/body/{user_id}")
async def get_body_data(user_id: str, days: int = 30):
    """Get stored body composition data"""
    db = get_db()
    
    from_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    
    data = await db.wearable_body.find(
        {"user_id": user_id, "date": {"$gte": from_date}},
        {"_id": 0, "raw_data": 0}
    ).sort("date", -1).to_list(days)
    
    return {
        "user_id": user_id,
        "period_days": days,
        "data": data
    }

@router.get("/connection-status/{user_id}")
async def get_connection_status(user_id: str):
    """Check if user has connected a wearable"""
    db = get_db()
    
    connection = await db.wearable_connections.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )
    
    if not connection:
        return {"connected": False, "message": "No wearable connected"}
    
    return {
        "connected": connection.get("status") == "connected",
        "status": connection.get("status"),
        "provider": connection.get("provider"),
        "connected_at": connection.get("connected_at")
    }

# ==================== GLYDEX INTEGRATION ====================

@router.get("/glydex/health-correlation/{user_id}")
async def get_glydex_health_correlation(user_id: str, days: int = 30):
    """
    Correlate wearable data with blood sugar for Glydex users.
    Shows how activity and sleep affect blood sugar.
    """
    db = get_db()
    
    from_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    
    # Get blood sugar logs
    blood_sugar = await db.blood_sugar_logs.find(
        {"user_id": user_id, "date": {"$gte": from_date}},
        {"_id": 0}
    ).sort("date", -1).to_list(days)
    
    # Get activity data
    activity = await db.wearable_activity.find(
        {"user_id": user_id, "date": {"$gte": from_date}},
        {"_id": 0, "raw_data": 0}
    ).to_list(days)
    
    # Get sleep data
    sleep = await db.wearable_sleep.find(
        {"user_id": user_id, "date": {"$gte": from_date}},
        {"_id": 0, "raw_data": 0}
    ).to_list(days)
    
    # Generate insights
    insights = []
    
    # Correlate high activity with blood sugar
    if activity and blood_sugar:
        # Group by date for comparison
        activity_by_date = {a["date"]: a for a in activity}
        
        high_activity_bs = []
        low_activity_bs = []
        
        for bs in blood_sugar:
            date = bs.get("date")
            act = activity_by_date.get(date)
            if act and act.get("steps"):
                if act["steps"] > 8000:
                    if bs.get("fbs"):
                        high_activity_bs.append(bs["fbs"])
                    if bs.get("ppbs"):
                        high_activity_bs.append(bs["ppbs"])
                else:
                    if bs.get("fbs"):
                        low_activity_bs.append(bs["fbs"])
                    if bs.get("ppbs"):
                        low_activity_bs.append(bs["ppbs"])
        
        if high_activity_bs and low_activity_bs:
            avg_high = sum(high_activity_bs) / len(high_activity_bs)
            avg_low = sum(low_activity_bs) / len(low_activity_bs)
            diff = avg_low - avg_high
            
            if diff > 10:
                insights.append({
                    "type": "positive",
                    "icon": "activity",
                    "title": "Activity Helps!",
                    "message": f"Days with 8000+ steps show {diff:.0f} mg/dL lower blood sugar on average."
                })
    
    # Sleep correlation
    if sleep and blood_sugar:
        sleep_by_date = {s["date"]: s for s in sleep}
        
        good_sleep_fbs = []
        poor_sleep_fbs = []
        
        for bs in blood_sugar:
            date = bs.get("date")
            slp = sleep_by_date.get(date)
            if slp and slp.get("total_sleep_seconds") and bs.get("fbs"):
                sleep_hours = slp["total_sleep_seconds"] / 3600
                if sleep_hours >= 7:
                    good_sleep_fbs.append(bs["fbs"])
                else:
                    poor_sleep_fbs.append(bs["fbs"])
        
        if good_sleep_fbs and poor_sleep_fbs:
            avg_good = sum(good_sleep_fbs) / len(good_sleep_fbs)
            avg_poor = sum(poor_sleep_fbs) / len(poor_sleep_fbs)
            
            if avg_poor > avg_good:
                insights.append({
                    "type": "info",
                    "icon": "moon",
                    "title": "Sleep Matters",
                    "message": f"7+ hours of sleep correlates with {avg_poor - avg_good:.0f} mg/dL lower morning glucose."
                })
    
    return {
        "user_id": user_id,
        "period_days": days,
        "blood_sugar_readings": len(blood_sugar),
        "activity_days": len(activity),
        "sleep_days": len(sleep),
        "insights": insights,
        "blood_sugar": blood_sugar[:10],  # Recent 10
        "activity": activity[:10],
        "sleep": sleep[:10]
    }
