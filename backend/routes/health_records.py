"""
Patient Health Records (EHR) Module
- Centralized health history
- Past appointments, prescriptions, test results
- Shareable profile with doctors
- Download complete health summary as PDF
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId
import uuid

router = APIRouter(prefix="/health-records", tags=["Health Records"])

# Database connection will be injected
db = None

def get_db():
    global db
    return db

def set_db(database):
    global db
    db = database

# Models
class HealthRecord(BaseModel):
    record_type: str  # appointment, prescription, lab_result, diagnosis, vaccination
    title: str
    description: Optional[str] = None
    date: str
    doctor_name: Optional[str] = None
    clinic_name: Optional[str] = None
    attachments: Optional[List[str]] = []
    metadata: Optional[dict] = {}

class FamilyMember(BaseModel):
    name: str
    relation: str  # self, spouse, child, parent, sibling, other
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    phone: Optional[str] = None
    medical_conditions: Optional[List[str]] = []

# ==================== HEALTH RECORDS ====================

@router.get("/summary/{user_id}")
async def get_health_summary(user_id: str):
    """Get complete health summary for a user"""
    db = get_db()
    
    # Get user info
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all appointments
    appointments = await db.appointments.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("date", -1).to_list(100)
    
    # Get all diagnostic orders
    diagnostic_orders = await db.diagnostic_orders.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Get all pharmacy orders
    pharmacy_orders = await db.pharmacy_orders.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Get prescriptions
    prescriptions = await db.prescriptions.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("date", -1).to_list(50)
    
    # Get blood sugar logs (Glydex)
    blood_sugar_logs = await db.blood_sugar_logs.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("date", -1).to_list(100)
    
    # Get period logs (Evara)
    period_logs = await db.period_logs.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("start_date", -1).to_list(50)
    
    # Calculate stats
    total_appointments = len(appointments)
    completed_appointments = len([a for a in appointments if a.get("status") == "Completed"])
    total_tests = len(diagnostic_orders)
    
    return {
        "user": user,
        "stats": {
            "total_appointments": total_appointments,
            "completed_appointments": completed_appointments,
            "total_diagnostic_tests": total_tests,
            "total_pharmacy_orders": len(pharmacy_orders),
            "blood_sugar_readings": len(blood_sugar_logs),
            "period_logs": len(period_logs)
        },
        "appointments": appointments[:10],  # Recent 10
        "diagnostic_orders": diagnostic_orders[:10],
        "pharmacy_orders": pharmacy_orders[:10],
        "prescriptions": prescriptions[:10],
        "blood_sugar_logs": blood_sugar_logs[:20],
        "period_logs": period_logs[:6]
    }

@router.get("/timeline/{user_id}")
async def get_health_timeline(user_id: str, limit: int = 50):
    """Get chronological health timeline"""
    db = get_db()
    
    timeline = []
    
    # Appointments
    appointments = await db.appointments.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(100)
    for apt in appointments:
        timeline.append({
            "type": "appointment",
            "icon": "calendar",
            "title": f"Appointment with {apt.get('doctor', 'Doctor')}",
            "subtitle": apt.get('clinic', ''),
            "date": apt.get("date", ""),
            "status": apt.get("status", ""),
            "data": apt
        })
    
    # Diagnostic orders
    diag_orders = await db.diagnostic_orders.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(100)
    for order in diag_orders:
        timeline.append({
            "type": "diagnostic",
            "icon": "flask",
            "title": f"Lab Tests: {len(order.get('tests', []))} tests",
            "subtitle": ", ".join(order.get("tests", [])[:3]),
            "date": order.get("created_at", "")[:10] if order.get("created_at") else "",
            "status": order.get("status", ""),
            "data": order
        })
    
    # Pharmacy orders
    pharma_orders = await db.pharmacy_orders.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(100)
    for order in pharma_orders:
        timeline.append({
            "type": "pharmacy",
            "icon": "pill",
            "title": f"Medicine Order: {len(order.get('medicines', []))} items",
            "subtitle": order.get("delivery_address", "")[:50],
            "date": order.get("created_at", "")[:10] if order.get("created_at") else "",
            "status": order.get("status", ""),
            "data": order
        })
    
    # Sort by date descending
    timeline.sort(key=lambda x: x.get("date", ""), reverse=True)
    
    return {"timeline": timeline[:limit]}

@router.post("/prescription")
async def add_prescription(user_id: str, prescription: dict):
    """Add a prescription to health records"""
    db = get_db()
    
    prescription_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "doctor_name": prescription.get("doctor_name"),
        "clinic_name": prescription.get("clinic_name"),
        "date": prescription.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        "diagnosis": prescription.get("diagnosis"),
        "medicines": prescription.get("medicines", []),
        "notes": prescription.get("notes"),
        "follow_up_date": prescription.get("follow_up_date"),
        "attachment_url": prescription.get("attachment_url"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.prescriptions.insert_one(prescription_doc)
    
    return {"message": "Prescription added", "prescription_id": prescription_doc["id"]}

# ==================== FAMILY MANAGEMENT ====================

@router.get("/family/{user_id}")
async def get_family_members(user_id: str):
    """Get all family members for a user"""
    db = get_db()
    
    members = await db.family_members.find(
        {"primary_user_id": user_id},
        {"_id": 0}
    ).to_list(20)
    
    return {"family_members": members}

@router.post("/family/{user_id}")
async def add_family_member(user_id: str, member: FamilyMember):
    """Add a family member"""
    db = get_db()
    
    member_doc = {
        "id": str(uuid.uuid4()),
        "primary_user_id": user_id,
        "name": member.name,
        "relation": member.relation,
        "date_of_birth": member.date_of_birth,
        "gender": member.gender,
        "blood_group": member.blood_group,
        "phone": member.phone,
        "medical_conditions": member.medical_conditions,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.family_members.insert_one(member_doc)
    
    return {"message": "Family member added", "member_id": member_doc["id"]}

@router.put("/family/{member_id}")
async def update_family_member(member_id: str, member: FamilyMember):
    """Update a family member"""
    db = get_db()
    
    result = await db.family_members.update_one(
        {"id": member_id},
        {"$set": {
            "name": member.name,
            "relation": member.relation,
            "date_of_birth": member.date_of_birth,
            "gender": member.gender,
            "blood_group": member.blood_group,
            "phone": member.phone,
            "medical_conditions": member.medical_conditions,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Family member not found")
    
    return {"message": "Family member updated"}

@router.delete("/family/{member_id}")
async def delete_family_member(member_id: str):
    """Delete a family member"""
    db = get_db()
    
    result = await db.family_members.delete_one({"id": member_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Family member not found")
    
    return {"message": "Family member removed"}

# ==================== LAB REPORT TRENDS ====================

@router.get("/trends/blood-sugar/{user_id}")
async def get_blood_sugar_trends(user_id: str, months: int = 6):
    """Get blood sugar trends with analysis"""
    db = get_db()
    
    # Get logs from last N months
    from_date = (datetime.now(timezone.utc) - timedelta(days=months * 30)).isoformat()
    
    logs = await db.blood_sugar_logs.find(
        {"user_id": user_id, "date": {"$gte": from_date[:10]}},
        {"_id": 0}
    ).sort("date", 1).to_list(500)
    
    if not logs:
        return {"trends": [], "analysis": None, "message": "No blood sugar data found"}
    
    # Calculate trends
    fbs_values = [l.get("fbs") for l in logs if l.get("fbs")]
    ppbs_values = [l.get("ppbs") for l in logs if l.get("ppbs")]
    hba1c_values = [l.get("hba1c") for l in logs if l.get("hba1c")]
    
    def calc_stats(values):
        if not values:
            return None
        return {
            "average": round(sum(values) / len(values), 1),
            "min": min(values),
            "max": max(values),
            "latest": values[-1] if values else None,
            "count": len(values)
        }
    
    # Generate insights
    insights = []
    fbs_stats = calc_stats(fbs_values)
    if fbs_stats:
        if fbs_stats["average"] < 100:
            insights.append({"type": "success", "message": "Your fasting blood sugar is well controlled!"})
        elif fbs_stats["average"] < 126:
            insights.append({"type": "warning", "message": "Your fasting blood sugar is in pre-diabetic range. Monitor closely."})
        else:
            insights.append({"type": "alert", "message": "Your fasting blood sugar is elevated. Consult your doctor."})
    
    hba1c_stats = calc_stats(hba1c_values)
    if hba1c_stats and len(hba1c_values) >= 2:
        change = hba1c_values[-1] - hba1c_values[0]
        if change < 0:
            insights.append({"type": "success", "message": f"Great progress! Your HbA1c improved by {abs(change):.1f}%"})
        elif change > 0.5:
            insights.append({"type": "alert", "message": f"Your HbA1c increased by {change:.1f}%. Please consult your doctor."})
    
    return {
        "trends": {
            "fbs": fbs_stats,
            "ppbs": calc_stats(ppbs_values),
            "hba1c": hba1c_stats
        },
        "logs": logs[-30:],  # Last 30 readings
        "insights": insights,
        "period_months": months
    }

@router.get("/trends/diagnostics/{user_id}")
async def get_diagnostic_trends(user_id: str):
    """Get trends for common diagnostic parameters"""
    db = get_db()
    
    # Get all completed diagnostic orders with results
    orders = await db.diagnostic_orders.find(
        {"user_id": user_id, "status": "Completed"},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    
    # Extract test results and group by test name
    test_trends = {}
    for order in orders:
        results = order.get("results", {})
        date = order.get("created_at", "")[:10]
        for test_name, value in results.items():
            if test_name not in test_trends:
                test_trends[test_name] = []
            test_trends[test_name].append({
                "date": date,
                "value": value
            })
    
    return {"test_trends": test_trends, "total_orders": len(orders)}
