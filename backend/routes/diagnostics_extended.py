"""Proton Trend Analysis & Home Sample Collection API Routes - Extracted from server.py"""
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from database import get_db
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# ==================== PROTON TREND ANALYSIS ====================

@router.get("/diagnostics/trends/{patient_id}")
async def get_report_trends(patient_id: str, test_name: str = None):
    """Get trend analysis for patient's lab reports"""
    db = get_db()
    # Get all completed orders with results
    orders = await db.diagnostic_orders.find({
        "$or": [
            {"user_id": patient_id},
            {"patient_phone": patient_id}
        ],
        "status": {"$in": ["Completed", "completed", "Delivered", "delivered"]}
    }).sort("created_at", -1).to_list(100)
    
    # Get lab results
    results = await db.lab_results.find({
        "$or": [
            {"patient_id": patient_id},
            {"patient_phone": patient_id}
        ]
    }).sort("test_date", -1).to_list(200)
    
    # Organize by test type
    trends = {}
    
    for result in results:
        test_type = result.get("test_type", result.get("test_name", "Unknown"))
        
        if test_name and test_name.lower() not in test_type.lower():
            continue
        
        if test_type not in trends:
            trends[test_type] = []
        
        trends[test_type].append({
            "date": result.get("test_date") or result.get("created_at"),
            "value": result.get("value"),
            "unit": result.get("unit", ""),
            "reference_range": result.get("reference_range", ""),
            "status": result.get("status", "normal"),  # normal, high, low, critical
            "notes": result.get("notes", "")
        })
    
    # Calculate trend direction for each test
    for test_type in trends:
        values = trends[test_type]
        if len(values) >= 2:
            try:
                latest = float(values[0]["value"]) if values[0]["value"] else 0
                previous = float(values[1]["value"]) if values[1]["value"] else 0
                if previous > 0:
                    change_percent = ((latest - previous) / previous) * 100
                    trends[test_type] = {
                        "values": values[:10],  # Last 10 readings
                        "trend": "up" if change_percent > 5 else "down" if change_percent < -5 else "stable",
                        "change_percent": round(change_percent, 1),
                        "latest_value": latest,
                        "latest_date": values[0]["date"]
                    }
                else:
                    trends[test_type] = {
                        "values": values[:10],
                        "trend": "stable",
                        "change_percent": 0,
                        "latest_value": latest,
                        "latest_date": values[0]["date"]
                    }
            except (ValueError, TypeError):
                trends[test_type] = {
                    "values": values[:10],
                    "trend": "unknown",
                    "change_percent": 0
                }
        else:
            trends[test_type] = {
                "values": values,
                "trend": "insufficient_data",
                "change_percent": 0
            }
    
    return {
        "success": True,
        "patient_id": patient_id,
        "parameters": [
            {
                "name": test_type,
                "currentValue": data.get("latest_value", data.get("values", [{}])[0].get("value", 0)),
                "unit": data.get("values", [{}])[0].get("unit", ""),
                "trend": "increasing" if data.get("trend") == "up" else "decreasing" if data.get("trend") == "down" else "stable",
                "status": data.get("values", [{}])[0].get("status", "normal"),
                "lastDate": data.get("latest_date", data.get("values", [{}])[0].get("date", "")),
                "normalRange": parse_reference_range(data.get("values", [{}])[0].get("reference_range", "")),
                "values": [{"value": v.get("value"), "date": v.get("date"), "status": v.get("status", "normal")} for v in data.get("values", [])],
                "insight": generate_insight(test_type, data)
            }
            for test_type, data in trends.items()
        ],
        "total_tests": len(trends),
        "last_updated": datetime.now(timezone.utc).isoformat()
    }

def parse_reference_range(ref_range: str):
    """Parse reference range string into min/max"""
    try:
        if "-" in ref_range:
            parts = ref_range.replace(" ", "").split("-")
            return {"min": float(parts[0]), "max": float(parts[1])}
    except:
        pass
    return {"min": None, "max": None}

def generate_insight(test_type: str, data: dict):
    """Generate insight for a parameter"""
    trend = data.get("trend", "stable")
    status = data.get("values", [{}])[0].get("status", "normal")
    
    insights = {
        "normal": f"Your {test_type} levels are within normal range. Keep up the healthy lifestyle!",
        "borderline": f"Your {test_type} is borderline. Consider dietary changes and follow-up testing.",
        "high": f"Your {test_type} is elevated. Please consult with your doctor for guidance.",
        "low": f"Your {test_type} is below normal. Discuss supplementation options with your doctor."
    }
    
    return insights.get(status, f"Your {test_type} levels are being monitored.")

@router.post("/diagnostics/results")
async def save_lab_result(
    patient_id: str = Body(...),
    patient_phone: str = Body(None),
    test_name: str = Body(...),
    test_type: str = Body(...),
    value: str = Body(...),
    unit: str = Body(""),
    reference_range: str = Body(""),
    status: str = Body("normal"),
    test_date: str = Body(None),
    notes: str = Body("")
):
    """Save a lab result for trend tracking"""
    result = {
        "id": str(uuid.uuid4()),
        "patient_id": patient_id,
        "patient_phone": patient_phone,
        "test_name": test_name,
        "test_type": test_type,
        "value": value,
        "unit": unit,
        "reference_range": reference_range,
        "status": status,
        "test_date": test_date or datetime.now(timezone.utc).isoformat(),
        "notes": notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.lab_results.insert_one(result)
    result.pop("_id", None)
    
    return {"success": True, "result": result}

@router.get("/diagnostics/history/{patient_id}")
async def get_test_history(patient_id: str, limit: int = 50):
    """Get complete test history for a patient"""
    db = get_db()
    results = await db.lab_results.find({
        "$or": [
            {"patient_id": patient_id},
            {"patient_phone": patient_id}
        ]
    }).sort("test_date", -1).to_list(limit)
    
    for r in results:
        r.pop("_id", None)
    
    # Group by test type
    grouped = {}
    for r in results:
        test_type = r.get("test_type", r.get("test_name", "Other"))
        if test_type not in grouped:
            grouped[test_type] = []
        grouped[test_type].append(r)
    
    return {
        "patient_id": patient_id,
        "history": grouped,
        "total_results": len(results),
        "test_types": list(grouped.keys())
    }

# ==================== HOME SAMPLE COLLECTION ====================

class HomeSampleRequest(BaseModel):
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    address: str
    pincode: str
    tests: List[str]
    preferred_date: str
    preferred_time: str
    special_instructions: Optional[str] = None

@router.post("/diagnostics/home-collection")
async def book_home_sample_collection(request: HomeSampleRequest):
    """Book home sample collection service"""
    db = get_db()
    booking = {
        "id": f"HSC-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}",
        "patient_name": request.patient_name,
        "patient_phone": request.patient_phone,
        "patient_email": request.patient_email,
        "address": request.address,
        "pincode": request.pincode,
        "tests": request.tests,
        "preferred_date": request.preferred_date,
        "preferred_time": request.preferred_time,
        "special_instructions": request.special_instructions,
        "status": "pending",
        "service_type": "home_collection",
        "collection_fee": 100,  # ₹100 home collection fee
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.home_collections.insert_one(booking)
    booking.pop("_id", None)
    
    # Notify staff
    try:
        await notify_staff_new_order({
            "id": booking["id"],
            "patient_name": request.patient_name,
            "test_name": ", ".join(request.tests[:2]),
            "type": "Home Collection"
        }, "proton")
    except Exception as e:
        logger.error(f"Failed to notify staff about home collection: {e}")
    
    return {
        "success": True,
        "booking": booking,
        "message": "Home sample collection booked! Our phlebotomist will arrive at your preferred time."
    }

@router.post("/diagnostics/fasting-reminder")
async def send_fasting_reminder(
    patient_phone: str = Body(...),
    patient_name: str = Body(...),
    test_date: str = Body(...),
    test_time: str = Body(...),
    tests: List[str] = Body(...)
):
    """Send fasting reminder via WhatsApp and email"""
    # Check which tests require fasting
    fasting_tests = ["glucose", "sugar", "lipid", "cholesterol", "triglyceride", "fbs", "ppbs"]
    requires_fasting = any(
        any(ft in test.lower() for ft in fasting_tests) 
        for test in tests
    )
    
    if not requires_fasting:
        return {
            "success": True,
            "requires_fasting": False,
            "message": "No fasting required for these tests"
        }
    
    # Schedule reminder (in real app, would use a scheduler)
    reminder = {
        "id": str(uuid.uuid4()),
        "patient_phone": patient_phone,
        "patient_name": patient_name,
        "test_date": test_date,
        "test_time": test_time,
        "tests": tests,
        "reminder_type": "fasting",
        "status": "scheduled",
        "message": f"🔔 Reminder: Your lab test is tomorrow at {test_time}. Please fast for 8-12 hours before the test. Drink only water.",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.test_reminders.insert_one(reminder)
    
    return {
        "success": True,
        "requires_fasting": True,
        "message": "Fasting reminder scheduled! You'll receive a WhatsApp reminder before your test.",
        "reminder_id": reminder["id"]
    }

