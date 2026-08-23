"""Portal Membership & Health Card Routes"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime, timezone
from database import get_db
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class PortalMembershipFormRequest(BaseModel):
    name: str
    phone: str
    email: str
    age: int
    gender: str
    existing_conditions: Optional[str] = None
    current_medications: Optional[str] = None
    allergies: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    plan_type: str
    portal_specific: Optional[Dict] = None


@router.post("/memberships/portal-form")
async def submit_portal_membership_form(form: PortalMembershipFormRequest):
    """Submit portal-specific membership form"""
    db = get_db()
    try:
        form_id = str(uuid.uuid4())

        membership_profile = {
            "id": form_id,
            "phone": form.phone,
            "email": form.email,
            "name": form.name,
            "age": form.age,
            "gender": form.gender,
            "health_info": {
                "existing_conditions": form.existing_conditions,
                "current_medications": form.current_medications,
                "allergies": form.allergies
            },
            "emergency_contact": {
                "name": form.emergency_contact_name,
                "phone": form.emergency_contact_phone,
                "relation": form.emergency_contact_relation
            },
            "plan_type": form.plan_type,
            "portal_specific": form.portal_specific or {},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "status": "active"
        }

        await db.membership_profiles.update_one(
            {"phone": form.phone, "plan_type": form.plan_type},
            {"$set": membership_profile},
            upsert=True
        )

        await db.users.update_one(
            {"phone": form.phone},
            {"$set": {
                "name": form.name,
                "age": form.age,
                "gender": form.gender,
                "health_info": membership_profile["health_info"],
                "emergency_contact": membership_profile["emergency_contact"],
                f"{form.plan_type}_profile": form.portal_specific
            }}
        )

        logger.info(f"Membership form submitted: {form.plan_type} - {form.phone}")

        return {
            "success": True,
            "message": "Membership form submitted successfully",
            "profile_id": form_id,
            "plan_type": form.plan_type
        }
    except Exception as e:
        logger.error(f"Error submitting membership form: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/memberships/portal-form/{phone}")
async def get_portal_membership_forms(phone: str):
    """Get all membership forms for a user by phone"""
    db = get_db()
    try:
        profiles = await db.membership_profiles.find({"phone": phone}, {"_id": 0}).to_list(20)
        return {"success": True, "profiles": profiles, "count": len(profiles)}
    except Exception as e:
        logger.error(f"Error fetching membership forms: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== NOTIFICATION TRIGGERS ====================

@router.post("/notifications/subscription-expiry")
async def send_subscription_expiry_notification(user_id: str):
    """Send push notification for subscription expiry"""
    db = get_db()
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    subscription = user.get("evara_subscription", {})
    if not subscription.get("active"):
        raise HTTPException(status_code=400, detail="No active subscription")

    end_date = subscription.get("end_date", "")[:10]
    plan_name = subscription.get("plan_name", "subscription")

    try:
        from server import send_push_notification
        result = await send_push_notification(
            user_id=user_id,
            title="Subscription Expiring Soon",
            body=f"Your Evara {plan_name} expires on {end_date}. Renew now to continue premium features!",
            url="/evara",
            tag="subscription-expiry"
        )
    except Exception as e:
        logger.error(f"Push notification error: {e}")
        result = None

    return {"success": True, "result": result}


@router.post("/notifications/medicine-refill")
async def send_medicine_refill_notification(user_id: str, medicine_name: str, days_left: int = 3):
    """Send push notification for medicine refill reminder"""
    db = get_db()
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        from server import send_push_notification
        result = await send_push_notification(
            user_id=user_id,
            title="Medicine Refill Reminder",
            body=f"Your {medicine_name} supply will run out in {days_left} days. Order refill from Orange Pharmacy.",
            url="/pharmacy",
            tag="medicine-refill"
        )
    except Exception as e:
        logger.error(f"Push notification error: {e}")
        result = None

    return {"success": True, "result": result}


# ==================== DIGITAL HEALTH CARD ====================

@router.get("/health-card/{user_id}")
async def get_digital_health_card(user_id: str):
    """Get patient's digital health card with all records consolidated"""
    db = get_db()
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    appointments = await db.appointments.find(
        {"$or": [{"user_id": user_id}, {"patient_phone": user.get("phone", "")}]},
        {"_id": 0}
    ).sort("date", -1).to_list(50)

    lab_orders = await db.diagnostic_orders.find(
        {"$or": [{"user_id": user_id}, {"patient_phone": user.get("phone", "")}]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    pharmacy_orders = await db.pharmacy_orders.find(
        {"$or": [{"user_id": user_id}, {"customer_phone": user.get("phone", "")}]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    prescriptions = await db.prescriptions.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("date", -1).to_list(30)

    reports = await db.proton_reports.find(
        {"$or": [{"user_id": user_id}, {"patient_phone": user.get("phone", "")}]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(30)

    membership = user.get("membership", {})
    loyalty_points = user.get("loyalty_points", 0)

    return {
        "user": {
            "id": user.get("id"),
            "name": user.get("name"),
            "email": user.get("email"),
            "phone": user.get("phone"),
            "blood_group": user.get("blood_group", ""),
            "date_of_birth": user.get("date_of_birth", ""),
            "gender": user.get("gender", ""),
            "allergies": user.get("allergies", []),
            "chronic_conditions": user.get("chronic_conditions", []),
            "emergency_contact": user.get("emergency_contact", {})
        },
        "membership": membership,
        "loyalty_points": loyalty_points,
        "stats": {
            "total_appointments": len(appointments),
            "total_lab_tests": len(lab_orders),
            "total_prescriptions": len(prescriptions),
            "total_reports": len(reports)
        },
        "appointments": appointments[:10],
        "lab_orders": lab_orders[:10],
        "pharmacy_orders": pharmacy_orders[:10],
        "prescriptions": prescriptions[:10],
        "reports": reports[:10]
    }


@router.put("/health-card/{user_id}/profile")
async def update_health_profile(user_id: str, data: dict):
    """Update health profile details (blood group, allergies, etc.)"""
    db = get_db()
    allowed_fields = ["blood_group", "date_of_birth", "gender", "allergies",
                      "chronic_conditions", "emergency_contact", "height", "weight"]
    update = {k: v for k, v in data.items() if k in allowed_fields}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.users.update_one({"id": user_id}, {"$set": update})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"success": True, "updated_fields": list(update.keys())}


# ==================== GOOGLE REVIEW NUDGE ====================

@router.post("/review/google-nudge")
async def track_google_review_nudge(data: dict):
    """Track when a patient clicks the Google review nudge"""
    db = get_db()
    await db.google_review_nudges.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": data.get("user_id", ""),
        "action": data.get("action", "shown"),
        "source": data.get("source", "appointment"),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"success": True}


@router.get("/review/google-nudge/stats")
async def get_google_review_stats():
    """Get Google review nudge analytics"""
    db = get_db()
    shown = await db.google_review_nudges.count_documents({"action": "shown"})
    clicked = await db.google_review_nudges.count_documents({"action": "clicked"})
    dismissed = await db.google_review_nudges.count_documents({"action": "dismissed"})
    return {
        "shown": shown,
        "clicked": clicked,
        "dismissed": dismissed,
        "click_rate": round(clicked / max(shown, 1) * 100, 1)
    }
