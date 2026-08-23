"""
User Feature Routes - Family Profiles, Subscriptions, Prescription OCR
Extracted from server.py for modularization.
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import os
import logging

logger = logging.getLogger("server")
router = APIRouter(tags=["User Features"])

_db = None

def set_db(db):
    global _db
    _db = db

def get_db():
    return _db


# ============ Family Profiles ============

class FamilyMember(BaseModel):
    name: str
    relationship: str
    phone: str = None
    email: str = None
    date_of_birth: str = None
    gender: str = None
    blood_group: str = None

@router.get("/family/members")
async def get_family_members(phone: str):
    db = get_db()
    phone = phone.strip().replace("+91", "").replace(" ", "")[-10:]
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    family = await db.family_profiles.find_one({"primary_phone": phone}, {"_id": 0})
    if not family:
        return {"members": [], "primary_phone": phone}
    return family

@router.post("/family/member/add")
async def add_family_member(phone: str, member: FamilyMember):
    db = get_db()
    phone = phone.strip().replace("+91", "").replace(" ", "")[-10:]
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    member_id = str(uuid.uuid4())[:8]
    member_data = {"id": member_id, **member.dict(), "created_at": datetime.now(timezone.utc)}
    await db.family_profiles.update_one(
        {"primary_phone": phone},
        {"$push": {"members": member_data}, "$setOnInsert": {"primary_phone": phone, "created_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    return {"success": True, "member_id": member_id, "message": "Family member added"}

@router.delete("/family/member/{member_id}")
async def delete_family_member(member_id: str, phone: str):
    db = get_db()
    phone = phone.strip().replace("+91", "").replace(" ", "")[-10:]
    result = await db.family_profiles.update_one(
        {"primary_phone": phone}, {"$pull": {"members": {"id": member_id}}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Family member not found")
    return {"success": True, "message": "Family member removed"}


# ============ Subscription Refills ============

class SubscriptionCreate(BaseModel):
    medicine_id: str
    medicine_name: str
    quantity: int = 1
    frequency: str = "monthly"
    start_date: str = None

@router.get("/subscriptions")
async def get_subscriptions(phone: str):
    db = get_db()
    phone = phone.strip().replace("+91", "").replace(" ", "")[-10:]
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    subscriptions = await db.subscriptions.find(
        {"phone": phone, "status": {"$ne": "cancelled"}}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {"subscriptions": subscriptions}

@router.post("/subscription/create")
async def create_subscription(phone: str, subscription: SubscriptionCreate):
    db = get_db()
    phone = phone.strip().replace("+91", "").replace(" ", "")[-10:]
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    frequency_days = {"weekly": 7, "biweekly": 14, "monthly": 30, "quarterly": 90}
    start = datetime.now(timezone.utc) if not subscription.start_date else datetime.fromisoformat(subscription.start_date.replace('Z', '+00:00'))
    next_order = start + timedelta(days=frequency_days.get(subscription.frequency, 30))
    subscription_id = f"SUB-{str(uuid.uuid4())[:8].upper()}"
    subscription_data = {
        "subscription_id": subscription_id, "phone": phone,
        "medicine_id": subscription.medicine_id, "medicine_name": subscription.medicine_name,
        "quantity": subscription.quantity, "frequency": subscription.frequency,
        "next_order_date": next_order, "status": "active",
        "created_at": datetime.now(timezone.utc), "orders_placed": 0
    }
    await db.subscriptions.insert_one(subscription_data)
    subscription_data.pop("_id", None)
    return {"success": True, "subscription": subscription_data}

@router.put("/subscription/{subscription_id}/pause")
async def pause_subscription(subscription_id: str, phone: str):
    db = get_db()
    result = await db.subscriptions.update_one(
        {"subscription_id": subscription_id, "phone": {"$regex": phone[-10:]}},
        {"$set": {"status": "paused", "paused_at": datetime.now(timezone.utc)}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"success": True, "message": "Subscription paused"}

@router.put("/subscription/{subscription_id}/resume")
async def resume_subscription(subscription_id: str, phone: str):
    db = get_db()
    result = await db.subscriptions.update_one(
        {"subscription_id": subscription_id, "phone": {"$regex": phone[-10:]}},
        {"$set": {"status": "active", "resumed_at": datetime.now(timezone.utc)}, "$unset": {"paused_at": ""}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"success": True, "message": "Subscription resumed"}

@router.delete("/subscription/{subscription_id}")
async def cancel_subscription(subscription_id: str, phone: str):
    db = get_db()
    result = await db.subscriptions.update_one(
        {"subscription_id": subscription_id, "phone": {"$regex": phone[-10:]}},
        {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc)}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"success": True, "message": "Subscription cancelled"}


# ============ Prescription OCR ============

@router.post("/prescription/ocr")
async def analyze_prescription(file: UploadFile = File(...)):
    """Analyze a prescription image using OCR with medicine matching."""
    db = get_db()
    try:
        content = await file.read()
        import base64
        image_base64 = base64.b64encode(content).decode("utf-8")
        ext = os.path.splitext(file.filename)[1].lower() if file.filename else ".jpg"
        mime_type = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}.get(ext.replace(".", ""), "image/jpeg")

        try:
            from emergentintegrations.llm.anthropic import AnthropicConfig, chat
            config = AnthropicConfig(
                api_key=os.environ.get("EMERGENT_LLM_KEY", ""),
                model="claude-sonnet-4-20250514"
            )
            prompt = """You are a medical prescription OCR expert. Analyze this prescription image very carefully.

IMPORTANT: Extract ALL medicine names exactly as written, including brand names, generic names, dosage forms and strengths.

Return a JSON object with these fields:
{
  "doctor_name": "string or null",
  "clinic_name": "string or null",
  "patient_name": "string or null",
  "date": "string or null",
  "diagnosis": "string or null",
  "medicines": [
    {
      "name": "exact medicine name as written",
      "generic_name": "generic/salt name if identifiable",
      "dosage": "dosage strength e.g. 500mg",
      "form": "tablet/capsule/syrup/injection",
      "frequency": "e.g. 1-0-1, twice daily",
      "duration": "e.g. 7 days, 2 weeks",
      "instructions": "before food, after food, etc."
    }
  ],
  "tests_ordered": ["list of any lab tests mentioned"],
  "notes": "any additional instructions or follow-up"
}

Be thorough - extract every medicine mentioned even if handwriting is unclear. For unclear text, provide your best interpretation with a note."""

            response = await chat(
                config=config,
                prompt=prompt,
                image_data=image_base64,
                image_media_type=mime_type
            )

            import json
            try:
                json_str = response.strip()
                if "```json" in json_str:
                    json_str = json_str.split("```json")[1].split("```")[0].strip()
                elif "```" in json_str:
                    json_str = json_str.split("```")[1].split("```")[0].strip()
                parsed = json.loads(json_str)

                # Match extracted medicines against pharmacy inventory
                matched_medicines = []
                extracted_meds = parsed.get("medicines", [])
                if extracted_meds and db:
                    for med in extracted_meds:
                        med_name = med.get("name", "")
                        if not med_name:
                            continue
                        # Search pharmacy inventory for matching medicines
                        search_terms = med_name.split()
                        regex_pattern = "|".join([f"(?i){t}" for t in search_terms[:3]])
                        try:
                            matches = await db.pharmacy_inventory.find(
                                {"name": {"$regex": regex_pattern}},
                                {"_id": 0, "id": 1, "name": 1, "form": 1, "manufacturer": 1, "mrp": 1, "price": 1, "image_url": 1, "generic_name": 1}
                            ).limit(3).to_list(3)
                            if matches:
                                for m in matches:
                                    m["prescribed_name"] = med_name
                                    m["prescribed_dosage"] = med.get("dosage", "")
                                    m["prescribed_frequency"] = med.get("frequency", "")
                                    m["prescribed_duration"] = med.get("duration", "")
                                matched_medicines.extend(matches)
                            else:
                                matched_medicines.append({
                                    "name": med_name,
                                    "form": med.get("form", "tablet"),
                                    "prescribed_name": med_name,
                                    "prescribed_dosage": med.get("dosage", ""),
                                    "prescribed_frequency": med.get("frequency", ""),
                                    "not_in_inventory": True
                                })
                        except Exception:
                            matched_medicines.append({
                                "name": med_name,
                                "form": med.get("form", "tablet"),
                                "prescribed_name": med_name,
                                "not_in_inventory": True
                            })

                return {
                    "success": True,
                    "prescription": parsed,
                    "matched_medicines": matched_medicines,
                    "total_medicines_found": len(extracted_meds),
                    "total_matched": len([m for m in matched_medicines if not m.get("not_in_inventory")])
                }
            except json.JSONDecodeError:
                return {"success": True, "prescription": None, "matched_medicines": [], "raw_response": response, "note": "Could not parse as JSON"}
        except Exception as e:
            logger.error(f"OCR analysis failed: {e}")
            return {"success": False, "error": str(e), "matched_medicines": [], "note": "AI analysis unavailable"}
    except Exception as e:
        logger.error(f"Prescription OCR failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
