"""
Post-Visit Pipeline API (#1)
- After a doctor visit, auto-generates pharmacy cart + lab test suggestions
- Patient taps "Confirm All" → medicines added to cart + lab tests booked
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/visit-pipeline", tags=["Post-Visit Pipeline"])
db = None

def set_db(database):
    global db
    db = database

# Medicine-to-Lab mapping (intelligent cross-sell)
MEDICINE_LAB_SUGGESTIONS = {
    "metformin": {"test": "HbA1c", "reason": "Monitor diabetes control", "frequency_days": 90},
    "glimepiride": {"test": "HbA1c", "reason": "Monitor blood sugar levels", "frequency_days": 90},
    "insulin": {"test": "HbA1c", "reason": "Track insulin effectiveness", "frequency_days": 90},
    "levothyroxine": {"test": "Thyroid Profile (T3, T4, TSH)", "reason": "Monitor thyroid levels", "frequency_days": 180},
    "thyronorm": {"test": "Thyroid Profile (T3, T4, TSH)", "reason": "Track thyroid medication effect", "frequency_days": 180},
    "atorvastatin": {"test": "Lipid Profile", "reason": "Monitor cholesterol levels", "frequency_days": 180},
    "rosuvastatin": {"test": "Lipid Profile", "reason": "Check cholesterol management", "frequency_days": 180},
    "losartan": {"test": "Kidney Function Test (KFT)", "reason": "Monitor kidney health with BP medication", "frequency_days": 180},
    "enalapril": {"test": "Kidney Function Test (KFT)", "reason": "ACE inhibitors need kidney monitoring", "frequency_days": 180},
    "amlodipine": {"test": "Blood Pressure Log", "reason": "Track BP medication effectiveness", "frequency_days": 90},
    "warfarin": {"test": "PT/INR", "reason": "Monitor blood thinning levels", "frequency_days": 30},
    "lithium": {"test": "Serum Lithium Level", "reason": "Critical therapeutic drug monitoring", "frequency_days": 90},
    "prednisone": {"test": "Blood Sugar + CBC", "reason": "Steroids can affect blood sugar and immunity", "frequency_days": 60},
}


@router.get("/pending/{phone}")
async def get_pending_actions(phone: str):
    """
    Get pending post-visit actions for a patient.
    Returns prescriptions that haven't been converted to pharmacy orders yet.
    """
    # Find recent appointments with prescriptions
    appointments = await db.appointments.find(
        {"$or": [{"phone": phone}, {"patient_phone": phone}], "status": {"$in": ["completed", "confirmed"]}},
        {"_id": 0}
    ).sort("date", -1).limit(5).to_list(5)
    
    # Find recent prescriptions not yet ordered
    prescriptions = await db.prescriptions.find(
        {"patient_phone": phone, "ordered": {"$ne": True}},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    pending_actions = []
    
    for rx in prescriptions:
        medicines = rx.get("medicines", [])
        
        # Suggest lab tests based on prescribed medicines
        suggested_labs = []
        seen_tests = set()
        for med in medicines:
            med_name = (med.get("generic_name", "") or med.get("name", "")).lower()
            for drug_key, lab_info in MEDICINE_LAB_SUGGESTIONS.items():
                if drug_key in med_name and lab_info["test"] not in seen_tests:
                    seen_tests.add(lab_info["test"])
                    suggested_labs.append({
                        "test_name": lab_info["test"],
                        "reason": lab_info["reason"],
                        "triggered_by": med.get("name", ""),
                        "frequency_days": lab_info["frequency_days"],
                    })
        
        pending_actions.append({
            "prescription_id": rx.get("prescription_id", rx.get("id", "")),
            "doctor_name": rx.get("doctor_name", ""),
            "date": rx.get("created_at", ""),
            "diagnosis": rx.get("diagnosis", ""),
            "medicines": medicines,
            "suggested_labs": suggested_labs,
            "medicine_count": len(medicines),
            "lab_count": len(suggested_labs),
        })
    
    return {
        "success": True,
        "pending_actions": pending_actions,
        "total_pending": len(pending_actions),
    }


@router.post("/confirm")
async def confirm_post_visit_actions(data: dict):
    """
    Confirm post-visit actions:
    - Add medicines to pharmacy cart
    - Book suggested lab tests
    """
    phone = data.get("phone", "")
    prescription_id = data.get("prescription_id", "")
    medicines = data.get("medicines", [])
    lab_tests = data.get("lab_tests", [])
    
    if not phone:
        raise HTTPException(status_code=400, detail="Phone required")
    
    results = {"medicines_added": 0, "labs_booked": 0}
    
    # Add medicines to pharmacy cart
    if medicines:
        cart_items = []
        for med in medicines:
            cart_items.append({
                "name": med.get("name", ""),
                "quantity": med.get("quantity", 1),
                "form": med.get("form", ""),
                "mrp": med.get("mrp", 0),
                "source": "post_visit_pipeline",
                "prescription_id": prescription_id,
            })
        
        # Upsert into patient's cart
        await db.pharmacy_carts.update_one(
            {"phone": phone},
            {
                "$push": {"items": {"$each": cart_items}},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            },
            upsert=True
        )
        results["medicines_added"] = len(cart_items)
    
    # Book lab tests
    if lab_tests:
        for test in lab_tests:
            await db.lab_bookings.insert_one({
                "patient_phone": phone,
                "test_name": test.get("test_name", ""),
                "reason": test.get("reason", ""),
                "triggered_by": test.get("triggered_by", ""),
                "prescription_id": prescription_id,
                "status": "pending",
                "source": "post_visit_pipeline",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        results["labs_booked"] = len(lab_tests)
    
    # Mark prescription as ordered
    if prescription_id:
        await db.prescriptions.update_one(
            {"$or": [{"prescription_id": prescription_id}, {"id": prescription_id}]},
            {"$set": {"ordered": True, "ordered_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return {
        "success": True,
        "message": f"Added {results['medicines_added']} medicines to cart and booked {results['labs_booked']} lab tests",
        **results
    }
