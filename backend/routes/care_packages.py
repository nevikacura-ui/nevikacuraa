"""
Outcome-Based Care Packages
Bundled health programs with recurring billing and better margins.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/care-packages", tags=["Outcome Packages"])

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Pre-defined Care Packages
CARE_PACKAGES = {
    "diabetes_care": {
        "id": "diabetes_care",
        "name": "Diabetes Care Program",
        "description": "Complete diabetes management with quarterly monitoring",
        "duration_days": 90,
        "billing_period": "quarterly",
        "price": 4999,
        "original_value": 7500,
        "savings_percent": 33,
        "includes": [
            {"type": "lab_test", "name": "HbA1c Test", "frequency": "Every 3 months", "value": 450},
            {"type": "lab_test", "name": "Fasting Blood Sugar", "frequency": "Monthly", "value": 225},
            {"type": "lab_test", "name": "Lipid Profile", "frequency": "Every 3 months", "value": 500},
            {"type": "consultation", "name": "Doctor Consultation", "frequency": "Monthly", "value": 1500},
            {"type": "medicine", "name": "Medicine Delivery", "frequency": "Monthly", "value": 0},
            {"type": "digital", "name": "Glydex Premium Access", "frequency": "Included", "value": 499},
            {"type": "digital", "name": "Diet Plan & Tracking", "frequency": "Ongoing", "value": 0}
        ],
        "category": "chronic",
        "target_condition": "diabetes",
        "color": "from-blue-500 to-cyan-500",
        "icon": "activity"
    },
    "thyroid_management": {
        "id": "thyroid_management",
        "name": "Thyroid Management Program",
        "description": "Regular thyroid monitoring and medication management",
        "duration_days": 180,
        "billing_period": "half-yearly",
        "price": 3999,
        "original_value": 6000,
        "savings_percent": 33,
        "includes": [
            {"type": "lab_test", "name": "Thyroid Profile (T3, T4, TSH)", "frequency": "Every 3 months", "value": 1100},
            {"type": "consultation", "name": "Endocrinologist Consultation", "frequency": "Every 3 months", "value": 2000},
            {"type": "medicine", "name": "Medicine Delivery", "frequency": "Monthly", "value": 0},
            {"type": "digital", "name": "Thyroid Tracking Dashboard", "frequency": "Ongoing", "value": 0}
        ],
        "category": "chronic",
        "target_condition": "thyroid",
        "color": "from-purple-500 to-violet-500",
        "icon": "shield"
    },
    "pregnancy_journey": {
        "id": "pregnancy_journey",
        "name": "Pregnancy Journey Package",
        "description": "Complete prenatal care from first trimester to delivery",
        "duration_days": 270,
        "billing_period": "per-trimester",
        "price": 14999,
        "original_value": 25000,
        "savings_percent": 40,
        "includes": [
            {"type": "lab_test", "name": "ANC Profile", "frequency": "Per trimester", "value": 5850},
            {"type": "lab_test", "name": "Dual Marker / Quad Marker", "frequency": "Once", "value": 4600},
            {"type": "imaging", "name": "NT Scan + Growth Scans (3)", "frequency": "Per trimester", "value": 4500},
            {"type": "consultation", "name": "OB-GYN Consultations (9)", "frequency": "Monthly", "value": 4500},
            {"type": "medicine", "name": "Prenatal Vitamins & Supplements", "frequency": "Monthly", "value": 3150},
            {"type": "digital", "name": "Evara Premium Access", "frequency": "Included", "value": 0},
            {"type": "special", "name": "Priority Delivery Booking", "frequency": "Once", "value": 0}
        ],
        "category": "lifecycle",
        "target_condition": "pregnancy",
        "color": "from-pink-500 to-rose-500",
        "icon": "heart"
    },
    "senior_wellness": {
        "id": "senior_wellness",
        "name": "Senior Wellness Program",
        "description": "Comprehensive health monitoring for seniors (60+)",
        "duration_days": 90,
        "billing_period": "quarterly",
        "price": 2999,
        "original_value": 5000,
        "savings_percent": 40,
        "includes": [
            {"type": "lab_test", "name": "Master Health Checkup", "frequency": "Quarterly", "value": 3999},
            {"type": "consultation", "name": "General Physician", "frequency": "Monthly", "value": 1500},
            {"type": "lab_test", "name": "Diabetes + Thyroid + Vitamin Panel", "frequency": "Quarterly", "value": 1600},
            {"type": "medicine", "name": "Medicine Delivery (Free)", "frequency": "Monthly", "value": 0},
            {"type": "special", "name": "Home Sample Collection", "frequency": "Included", "value": 150}
        ],
        "category": "preventive",
        "target_condition": "senior",
        "color": "from-amber-500 to-orange-500",
        "icon": "users"
    },
    "cardiac_care": {
        "id": "cardiac_care",
        "name": "Cardiac Care Program",
        "description": "Heart health monitoring and risk management",
        "duration_days": 180,
        "billing_period": "half-yearly",
        "price": 5999,
        "original_value": 9000,
        "savings_percent": 33,
        "includes": [
            {"type": "lab_test", "name": "Cardiac Risk Profile", "frequency": "Every 3 months", "value": 3000},
            {"type": "lab_test", "name": "ECG", "frequency": "Every 3 months", "value": 600},
            {"type": "consultation", "name": "Cardiologist Consultation", "frequency": "Every 3 months", "value": 3000},
            {"type": "medicine", "name": "Medicine Delivery", "frequency": "Monthly", "value": 0},
            {"type": "digital", "name": "BP & Heart Rate Tracking", "frequency": "Ongoing", "value": 0}
        ],
        "category": "chronic",
        "target_condition": "cardiac",
        "color": "from-red-500 to-rose-600",
        "icon": "heart-pulse"
    }
}


class PackageEnrollment(BaseModel):
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = ""
    package_id: str
    payment_method: str = "online"
    notes: str = ""


@router.get("/list")
async def list_care_packages():
    """List all available care packages"""
    packages = list(CARE_PACKAGES.values())
    return {"packages": packages, "total": len(packages)}


@router.get("/{package_id}")
async def get_care_package(package_id: str):
    """Get single care package details"""
    pkg = CARE_PACKAGES.get(package_id)
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")
    return pkg


@router.post("/enroll")
async def enroll_in_package(data: PackageEnrollment):
    """Enroll a patient in a care package"""
    pkg = CARE_PACKAGES.get(data.package_id)
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")

    now = datetime.now(timezone.utc)
    end_date = now + timedelta(days=pkg["duration_days"])

    enrollment = {
        "id": str(uuid.uuid4()),
        "patient_name": data.patient_name,
        "patient_phone": data.patient_phone,
        "patient_email": data.patient_email,
        "package_id": data.package_id,
        "package_name": pkg["name"],
        "package_price": pkg["price"],
        "original_value": pkg["original_value"],
        "savings": pkg["original_value"] - pkg["price"],
        "payment_method": data.payment_method,
        "payment_status": "pending",
        "status": "active",
        "start_date": now.isoformat(),
        "end_date": end_date.isoformat(),
        "includes": pkg["includes"],
        "services_used": [],
        "notes": data.notes,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }

    await db.care_enrollments.insert_one(enrollment)
    del enrollment["_id"]

    return {"success": True, "enrollment": enrollment}


@router.get("/enrollments/list")
async def list_enrollments(phone: str = None, status: str = None):
    """List patient enrollments"""
    query = {}
    if phone:
        query["patient_phone"] = phone
    if status:
        query["status"] = status

    enrollments = await db.care_enrollments.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"enrollments": enrollments, "total": len(enrollments)}


@router.post("/enrollments/{enrollment_id}/use-service")
async def use_package_service(enrollment_id: str, data: dict):
    """Record usage of a service within the package"""
    enrollment = await db.care_enrollments.find_one({"id": enrollment_id})
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    if enrollment["status"] != "active":
        raise HTTPException(status_code=400, detail="Enrollment is not active")

    service_usage = {
        "id": str(uuid.uuid4()),
        "service_type": data.get("service_type", ""),
        "service_name": data.get("service_name", ""),
        "date": datetime.now(timezone.utc).isoformat(),
        "notes": data.get("notes", "")
    }

    await db.care_enrollments.update_one(
        {"id": enrollment_id},
        {
            "$push": {"services_used": service_usage},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )

    return {"success": True, "service_usage": service_usage}


@router.get("/dashboard/stats")
async def care_package_dashboard():
    """Dashboard stats for care packages"""
    active = await db.care_enrollments.count_documents({"status": "active"})
    completed = await db.care_enrollments.count_documents({"status": "completed"})
    total_revenue_pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$package_price"}, "total_value": {"$sum": "$original_value"}}}
    ]
    rev = await db.care_enrollments.aggregate(total_revenue_pipeline).to_list(1)
    r = rev[0] if rev else {"total": 0, "total_value": 0}

    popular_pipeline = [
        {"$group": {"_id": "$package_id", "count": {"$sum": 1}, "name": {"$first": "$package_name"}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    popular = await db.care_enrollments.aggregate(popular_pipeline).to_list(5)

    return {
        "active_enrollments": active,
        "completed": completed,
        "total_revenue": r.get("total", 0),
        "total_value_delivered": r.get("total_value", 0),
        "margin": r.get("total_value", 0) - r.get("total", 0),
        "popular_packages": [{"id": p["_id"], "name": p["name"], "count": p["count"]} for p in popular]
    }
