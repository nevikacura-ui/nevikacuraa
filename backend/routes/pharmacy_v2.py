"""
Pharmacy V2 Routes - Medicine Alternatives, 1-Tap Reorder, Prescription Wallet
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import os
import re

router = APIRouter(tags=["Pharmacy V2"])

_db = None

def set_db(db):
    global _db
    _db = db

def get_db():
    return _db


# ============ Medicine Alternatives ============

@router.get("/pharmacy/v2/alternatives/{medicine_id}")
async def get_medicine_alternatives(medicine_id: str, limit: int = 20):
    """Find alternative medicines with the same composition/salt — like 1mg."""
    db = get_db()
    
    medicine = await db.medicines.find_one({"id": medicine_id}, {"_id": 0})
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    generic = (medicine.get("generic_name") or "").strip()
    composition = (medicine.get("composition") or "").strip()
    
    if not generic and not composition:
        return {
            "source_medicine": medicine.get("name"),
            "alternatives": [],
            "message": "No composition data available for this medicine"
        }
    
    # Build match query: same generic_name OR same composition
    match_conditions = []
    if generic and generic.lower() not in ["", "na", "n/a"]:
        match_conditions.append({"generic_name": {"$regex": f"^{re.escape(generic)}$", "$options": "i"}})
    if composition and composition.lower() not in ["", "na", "n/a"]:
        match_conditions.append({"composition": {"$regex": f"^{re.escape(composition)}$", "$options": "i"}})
    
    if not match_conditions:
        return {"source_medicine": medicine.get("name"), "alternatives": [], "message": "No matchable composition"}
    
    # Find alternatives, exclude source medicine and discontinued
    query = {
        "$or": match_conditions,
        "id": {"$ne": medicine_id},
        "is_discontinued": {"$ne": True},
    }
    
    # Sort: with image first, then by price ascending
    pipeline = [
        {"$match": query},
        {"$addFields": {
            "_has_img": {"$cond": [{"$and": [{"$ne": ["$image_url", ""]}, {"$ne": ["$image_url", None]}]}, 1, 0]},
            "_has_price": {"$cond": [{"$gt": ["$mrp", 0]}, 1, 0]},
        }},
        {"$sort": {"_has_img": -1, "_has_price": -1, "mrp": 1}},
        {"$limit": limit},
        {"$project": {
            "_id": 0, "_has_img": 0, "_has_price": 0,
        }}
    ]
    
    alternatives = await db.medicines.aggregate(pipeline).to_list(limit)
    
    # Calculate savings vs source medicine price
    source_price = medicine.get("mrp", 0) or 0
    for alt in alternatives:
        alt_price = alt.get("mrp", 0) or 0
        if source_price > 0 and alt_price > 0:
            alt["savings"] = round(source_price - alt_price, 2)
            alt["savings_pct"] = round((source_price - alt_price) / source_price * 100, 1)
        else:
            alt["savings"] = 0
            alt["savings_pct"] = 0
    
    return {
        "source_medicine": medicine.get("name"),
        "source_price": source_price,
        "composition": composition or generic,
        "alternatives_count": len(alternatives),
        "alternatives": alternatives,
    }


@router.get("/pharmacy/v2/alternatives-by-name")
async def get_alternatives_by_name(name: str, limit: int = 10):
    """Search alternatives by generic/salt name directly."""
    db = get_db()
    
    alternatives = await db.medicines.find(
        {
            "generic_name": {"$regex": re.escape(name), "$options": "i"},
            "stock_quantity": {"$gt": 0}
        },
        {"_id": 0, "id": 1, "name": 1, "generic_name": 1, "manufacturer": 1,
         "mrp": 1, "sale_price": 1, "discount_percent": 1, "unit": 1,
         "category": 1, "image_url": 1, "stock_quantity": 1}
    ).sort("mrp", 1).limit(limit).to_list(limit)
    
    return {
        "search_term": name,
        "count": len(alternatives),
        "alternatives": alternatives
    }


# ============ 1-Tap Reorder ============

class ReorderRequest(BaseModel):
    order_id: str
    delivery_address: Optional[str] = None

@router.post("/pharmacy/v2/reorder")
async def reorder_from_past(request: ReorderRequest):
    """Create a new order by copying medicines from a past order."""
    db = get_db()
    
    # Find the original order
    original = await db.pharmacy_orders.find_one(
        {"$or": [{"id": request.order_id}, {"order_id": request.order_id}]},
        {"_id": 0}
    )
    if not original:
        # Also check archive
        original = await db.pharmacy_orders_archive.find_one(
            {"$or": [{"id": request.order_id}, {"order_id": request.order_id}]},
            {"_id": 0}
        )
    if not original:
        raise HTTPException(status_code=404, detail="Original order not found")
    
    # Check stock availability for each medicine
    medicines = original.get("medicines", [])
    available_medicines = []
    unavailable = []
    
    for med in medicines:
        med_id = med.get("id") or med.get("medicine_id")
        if med_id:
            current = await db.medicines.find_one({"id": med_id}, {"_id": 0, "stock_quantity": 1, "mrp": 1, "sale_price": 1, "name": 1})
            if current and current.get("stock_quantity", 0) > 0:
                available_medicines.append({
                    **med,
                    "mrp": current.get("mrp", med.get("mrp", 0)),
                    "sale_price": current.get("sale_price", med.get("sale_price", 0)),
                })
            else:
                unavailable.append(med.get("name", med_id))
        else:
            available_medicines.append(med)
    
    if not available_medicines:
        raise HTTPException(status_code=400, detail="None of the medicines from the original order are currently in stock")
    
    # Create new order
    new_order = {
        "id": str(uuid.uuid4()),
        "order_id": f"ORD-{str(uuid.uuid4())[:8].upper()}",
        "user_id": original.get("user_id"),
        "medicines": available_medicines,
        "patient_name": original.get("patient_name", ""),
        "patient_phone": original.get("patient_phone", ""),
        "patient_email": original.get("patient_email"),
        "delivery_address": request.delivery_address or original.get("delivery_address", ""),
        "status": "booked",
        "payment_method": "cod",
        "payment_status": "pending",
        "total_amount": sum(
            float(m.get("sale_price") or m.get("mrp", 0)) * int(m.get("quantity", 1))
            for m in available_medicines
        ),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "reorder_from": request.order_id,
    }
    
    await db.pharmacy_orders.insert_one(new_order)
    new_order.pop("_id", None)
    
    return {
        "status": "success",
        "order": new_order,
        "unavailable_medicines": unavailable,
        "message": f"Reorder placed with {len(available_medicines)} items" + 
                   (f" ({len(unavailable)} items unavailable)" if unavailable else "")
    }


# ============ Prescription Wallet ============

class PrescriptionUpload(BaseModel):
    phone: str
    patient_name: str
    doctor_name: Optional[str] = None
    notes: Optional[str] = None

@router.get("/prescriptions/wallet/{phone}")
async def get_prescriptions(phone: str):
    """Get all prescriptions for a patient phone number."""
    db = get_db()
    prescriptions = await db.prescriptions.find(
        {"phone": phone},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"prescriptions": prescriptions, "count": len(prescriptions)}

@router.post("/prescriptions/upload")
async def upload_prescription(
    phone: str,
    patient_name: str,
    file: UploadFile = File(...),
    doctor_name: Optional[str] = None,
    notes: Optional[str] = None
):
    """Upload a prescription image/PDF to the wallet."""
    db = get_db()
    
    # Save file to Object Storage
    rx_id = str(uuid.uuid4())[:8]
    ext = os.path.splitext(file.filename)[1] if file.filename else ".png"
    filename = f"rx_{rx_id}{ext}"
    
    content = await file.read()
    storage_path = f"nevika-cura/prescriptions/{filename}"
    from services.object_storage import put_object
    put_object(storage_path, content, file.content_type or "application/octet-stream")
    
    prescription = {
        "id": rx_id,
        "phone": phone,
        "patient_name": patient_name,
        "doctor_name": doctor_name or "",
        "notes": notes or "",
        "filename": filename,
        "file_url": f"/api/pharmacy/v2/prescriptions/file/{filename}",
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.prescriptions.insert_one(prescription)
    prescription.pop("_id", None)
    
    return {"status": "success", "prescription": prescription}

@router.get("/prescriptions/file/{filename}")
async def get_prescription_file(filename: str):
    """Serve a prescription file from Object Storage."""
    from services.object_storage import get_object
    from fastapi.responses import Response
    try:
        data, content_type = get_object(f"nevika-cura/prescriptions/{filename}")
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
    return Response(content=data, media_type=content_type or "application/octet-stream")

@router.delete("/prescriptions/{prescription_id}")
async def delete_prescription(prescription_id: str):
    """Delete a prescription from the wallet."""
    db = get_db()
    result = await db.prescriptions.delete_one({"id": prescription_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return {"status": "deleted"}


# ============ Order History (for reorder feature) ============

@router.get("/pharmacy/v2/order-history/{phone}")
async def get_order_history(phone: str, limit: int = 20):
    """Get past pharmacy orders for a patient (for reorder feature)."""
    db = get_db()
    
    orders = await db.pharmacy_orders.find(
        {"patient_phone": phone},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Also check archive for older orders
    archived = await db.pharmacy_orders_archive.find(
        {"patient_phone": phone},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    all_orders = orders + archived
    all_orders.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return {"orders": all_orders[:limit], "count": len(all_orders[:limit])}
