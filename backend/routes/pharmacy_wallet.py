"""Medicine Alternatives & Prescription Wallet Routes"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional, List
from datetime import datetime, timezone
from database import get_db
import uuid
import logging
import re

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/pharmacy/alternatives/{medicine_id}")
async def get_medicine_alternatives(medicine_id: str, limit: int = 10):
    """Find alternative medicines with same salt/composition"""
    db = get_db()

    medicine = await db.medicines.find_one({"id": medicine_id}, {"_id": 0})
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    composition = medicine.get("composition", "") or medicine.get("salt", "") or ""
    if not composition:
        return {"alternatives": [], "original": medicine.get("name"), "composition": "", "message": "No composition data available"}

    # Normalize composition for matching
    comp_lower = composition.lower().strip()
    # Extract active ingredients (before dosage numbers)
    ingredients = re.split(r'[+&,]', comp_lower)
    ingredients = [i.strip().split('(')[0].strip() for i in ingredients if i.strip()]

    if not ingredients:
        return {"alternatives": [], "original": medicine.get("name"), "composition": composition}

    # Search for medicines with matching composition
    search_conditions = []
    for ingredient in ingredients[:3]:  # Use top 3 ingredients
        clean = re.sub(r'\d+\s*(mg|ml|mcg|iu|gm|%)', '', ingredient).strip()
        if clean and len(clean) > 2:
            search_conditions.append({"composition": {"$regex": re.escape(clean), "$options": "i"}})

    if not search_conditions:
        return {"alternatives": [], "original": medicine.get("name"), "composition": composition}

    query = {
        "$and": search_conditions,
        "id": {"$ne": medicine_id}  # Exclude the original
    }

    alternatives = await db.medicines.find(
        query, {"_id": 0}
    ).sort("mrp", 1).to_list(limit)

    # Calculate savings
    original_mrp = float(medicine.get("mrp", 0) or 0)
    for alt in alternatives:
        alt_mrp = float(alt.get("mrp", 0) or 0)
        if original_mrp > 0 and alt_mrp > 0:
            alt["savings"] = round(original_mrp - alt_mrp, 2)
            alt["savings_percent"] = round((1 - alt_mrp / original_mrp) * 100, 1)

    return {
        "original": medicine.get("name"),
        "composition": composition,
        "alternatives": alternatives,
        "count": len(alternatives)
    }


@router.get("/prescriptions/{user_id}")
async def get_user_prescriptions(user_id: str, limit: int = 20):
    """Get all prescriptions for a user"""
    db = get_db()
    prescriptions = await db.prescriptions.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(limit)

    return {"prescriptions": prescriptions, "count": len(prescriptions)}


@router.post("/prescriptions")
async def save_prescription(
    user_id: str = Form(...),
    doctor_name: str = Form(""),
    clinic_name: str = Form(""),
    notes: str = Form(""),
    prescription_url: str = Form(""),
    medicines: str = Form("[]")
):
    """Save a prescription to the wallet"""
    db = get_db()
    import json

    prescription = {
        "id": f"RX-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}",
        "user_id": user_id,
        "doctor_name": doctor_name,
        "clinic_name": clinic_name,
        "notes": notes,
        "prescription_url": prescription_url,
        "medicines": json.loads(medicines) if medicines else [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "active"
    }

    await db.prescriptions.insert_one(prescription)
    prescription.pop("_id", None)

    return {"success": True, "prescription": prescription}


@router.delete("/prescriptions/{prescription_id}")
async def delete_prescription(prescription_id: str):
    """Delete a prescription"""
    db = get_db()
    result = await db.prescriptions.update_one(
        {"id": prescription_id},
        {"$set": {"status": "archived", "archived_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return {"success": True}


@router.get("/pharmacy/reorder-suggestions/{user_phone}")
async def get_reorder_suggestions(user_phone: str, limit: int = 8):
    """Get personalized reorder suggestions based on purchase history"""
    db = get_db()

    orders = await db.pharmacy_orders.find(
        {"$or": [{"patient_phone": user_phone}, {"customer_phone": user_phone}]}
    ).sort("created_at", -1).to_list(50)

    medicine_freq = {}
    for order in orders:
        for med in order.get("medicines", []):
            name = med.get("name", "")
            if name:
                if name not in medicine_freq:
                    medicine_freq[name] = {"name": name, "count": 0, "last_ordered": order.get("created_at")}
                medicine_freq[name]["count"] += 1

    # Sort by frequency
    suggestions = sorted(medicine_freq.values(), key=lambda x: x["count"], reverse=True)[:limit]

    # Enrich with medicine details
    enriched = []
    for s in suggestions:
        med = await db.medicines.find_one({"name": s["name"]}, {"_id": 0})
        if med:
            enriched.append({**med, "order_count": s["count"], "last_ordered": s["last_ordered"]})

    return {"suggestions": enriched, "total_orders": len(orders)}
