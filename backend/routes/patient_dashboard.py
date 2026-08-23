"""Patient Dashboard Route - Extracted from server.py"""
from fastapi import APIRouter
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

_db = None

def set_db(database):
    global _db
    _db = database


@router.get("/patient-dashboard/{phone}")
async def get_patient_dashboard(phone: str):
    """Unified patient dashboard: upcoming appointments + lab orders + pharmacy orders"""
    clean_phone = phone.replace("+91", "").replace(" ", "")[-10:]
    try:
        appts_cursor = _db.appointments.find(
            {"patient_phone": {"$regex": clean_phone}},
            {"_id": 0, "patient_name": 1, "doctor": 1, "clinic": 1, "date": 1, "time": 1,
             "booking_id": 1, "status": 1, "created_at": 1}
        ).sort("created_at", -1).limit(10)
        appointments = await appts_cursor.to_list(10)

        lab_cursor = _db.lab_orders.find(
            {"patient_phone": {"$regex": clean_phone}},
            {"_id": 0, "patient_name": 1, "booking_id": 1, "tests": 1, "status": 1,
             "preferred_date": 1, "collection_type": 1, "total_amount": 1, "created_at": 1,
             "report_url": 1}
        ).sort("created_at", -1).limit(10)
        lab_orders = await lab_cursor.to_list(10)

        pharm_cursor = _db.pharmacy_orders.find(
            {"$or": [
                {"patient_phone": {"$regex": clean_phone}},
                {"phone": {"$regex": clean_phone}},
            ]},
            {"_id": 0, "patient_name": 1, "order_id": 1, "booking_id": 1, "items": 1,
             "status": 1, "total_amount": 1, "total": 1, "payment_method": 1,
             "created_at": 1, "delivery_partner": 1}
        ).sort("created_at", -1).limit(10)
        pharmacy_orders = await pharm_cursor.to_list(10)

        upcoming_appts = sum(1 for a in appointments if a.get("status") in ("confirmed", "booked", "pending"))
        active_lab = sum(1 for l in lab_orders if l.get("status") not in ("completed", "cancelled", "delivered"))
        active_pharmacy = sum(1 for p in pharmacy_orders if p.get("status") not in ("delivered", "cancelled"))

        return {
            "success": True,
            "stats": {
                "upcoming_appointments": upcoming_appts,
                "active_lab_orders": active_lab,
                "active_pharmacy_orders": active_pharmacy,
                "total_appointments": len(appointments),
                "total_lab_orders": len(lab_orders),
                "total_pharmacy_orders": len(pharmacy_orders),
            },
            "appointments": appointments,
            "lab_orders": lab_orders,
            "pharmacy_orders": pharmacy_orders,
        }
    except Exception as e:
        logger.error(f"Patient dashboard error: {e}")
        return {"success": False, "error": str(e)}
