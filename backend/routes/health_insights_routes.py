"""
Health Insights, Health Score, Streaks, Medicine Lookup, Family Wallet
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid

router = APIRouter(prefix="/api")
db = None

def init_db(database):
    global db
    db = database

# ── Health Insights ──

@router.get("/health-insights/{phone}")
async def get_health_insights(phone: str):
    clean = phone[-10:]
    # Gather data from various collections
    appointments = await db.appointments.find({"patient_phone": clean}, {"_id": 0}).sort("date", -1).to_list(10)
    pharmacy_orders = await db.pharmacy_orders.find({"phone": clean}, {"_id": 0}).sort("created_at", -1).to_list(10)
    lab_orders = await db.diagnostic_orders.find({"phone": clean}, {"_id": 0}).sort("created_at", -1).to_list(10)
    
    # Calculate health score
    score = 72  # base
    activity_count = len(appointments) + len(pharmacy_orders) + len(lab_orders)
    if activity_count > 5: score += 8
    if activity_count > 10: score += 5
    recent_checkup = any(a for a in appointments if a.get("date") and (datetime.now(timezone.utc) - datetime.fromisoformat(str(a["date"]).replace("Z", "+00:00"))).days < 90) if appointments else False
    if recent_checkup: score += 10
    score = min(score, 100)

    # Risk indicators
    risks = []
    if not recent_checkup:
        risks.append({"level": "medium", "title": "Checkup Overdue", "desc": "Last checkup was over 90 days ago", "action": "Book a consultation"})
    if not lab_orders:
        risks.append({"level": "low", "title": "No Lab Tests", "desc": "Consider routine blood work", "action": "Book a lab test"})

    # Wellness tips
    tips = [
        {"category": "Prevention", "tip": "Regular health checkups can detect issues early", "priority": "high"},
        {"category": "Nutrition", "tip": "Include seasonal fruits and vegetables in your diet", "priority": "medium"},
        {"category": "Activity", "tip": "30 minutes of daily walking improves heart health", "priority": "medium"},
        {"category": "Sleep", "tip": "7-8 hours of quality sleep boosts immunity", "priority": "low"},
    ]

    # Summary stats
    stats = {
        "total_consultations": len(appointments),
        "total_lab_tests": len(lab_orders),
        "total_pharmacy_orders": len(pharmacy_orders),
        "last_visit": appointments[0].get("date") if appointments else None,
        "last_test": lab_orders[0].get("created_at") if lab_orders else None,
    }

    return {
        "health_score": score,
        "score_label": "Excellent" if score >= 85 else "Good" if score >= 70 else "Needs Attention" if score >= 50 else "Poor",
        "risks": risks,
        "tips": tips,
        "stats": stats,
        "recent_appointments": appointments[:3],
        "recent_tests": lab_orders[:3],
    }


# ── Dynamic Health Score ──

@router.get("/health-score/{phone}")
async def get_health_score(phone: str):
    clean = phone[-10:]
    # Check activity streak
    streak = await db.health_streaks.find_one({"phone": clean}, {"_id": 0})
    if not streak:
        streak = {"phone": clean, "current_streak": 0, "longest_streak": 0, "last_activity": None, "total_activities": 0}
    
    wallet = await db.cura_wallets.find_one({"phone": clean}, {"_id": 0})
    
    appointments = await db.appointments.count_documents({"patient_phone": clean})
    lab_tests = await db.diagnostic_orders.count_documents({"phone": clean})
    
    # Score calculation
    base = 50
    if appointments > 0: base += min(appointments * 3, 15)
    if lab_tests > 0: base += min(lab_tests * 4, 20)
    if streak.get("current_streak", 0) > 3: base += 5
    if streak.get("current_streak", 0) > 7: base += 5
    if wallet and wallet.get("tier") != "none": base += 5
    score = min(base, 100)
    
    return {
        "score": score,
        "breakdown": {
            "consultations": min(appointments * 3, 15),
            "lab_tests": min(lab_tests * 4, 20),
            "streak_bonus": 5 if streak.get("current_streak", 0) > 3 else 0,
            "loyalty_bonus": 5 if wallet and wallet.get("tier") != "none" else 0,
        },
        "streak": streak,
    }


# ── Health Streaks (moved to routes/health_streak.py) ──


# ── Medicine Lookup ──

MEDICINE_DB = {
    "8901234567890": {"name": "Paracetamol 500mg", "brand": "Crocin", "mrp": 25, "type": "Tablet", "uses": "Fever, Pain relief", "dosage": "1-2 tablets every 4-6 hours"},
    "8901234567891": {"name": "Amoxicillin 500mg", "brand": "Mox", "mrp": 85, "type": "Capsule", "uses": "Bacterial infections", "dosage": "1 capsule 3 times daily"},
    "8901234567892": {"name": "Omeprazole 20mg", "brand": "Omez", "mrp": 65, "type": "Capsule", "uses": "Acid reflux, Ulcers", "dosage": "1 capsule before breakfast"},
    "8901234567893": {"name": "Metformin 500mg", "brand": "Glycomet", "mrp": 35, "type": "Tablet", "uses": "Type 2 Diabetes", "dosage": "1 tablet with meals"},
    "8901234567894": {"name": "Cetirizine 10mg", "brand": "Cetzine", "mrp": 30, "type": "Tablet", "uses": "Allergies, Cold", "dosage": "1 tablet at bedtime"},
    "8901234567895": {"name": "Azithromycin 500mg", "brand": "Azee", "mrp": 120, "type": "Tablet", "uses": "Bacterial infections", "dosage": "1 tablet daily for 3 days"},
}

@router.get("/medicine/lookup/{barcode}")
async def lookup_medicine(barcode: str):
    med = MEDICINE_DB.get(barcode)
    if not med:
        # Try finding in pharmacy products collection
        product = await db.pharmacy_products.find_one({"barcode": barcode}, {"_id": 0})
        if product:
            return {"found": True, "medicine": product}
        return {"found": False, "message": "Medicine not found. Try searching in our pharmacy."}
    return {"found": True, "medicine": med}

@router.get("/medicine/search")
async def search_medicine(q: str = ""):
    if not q or len(q) < 2:
        return {"results": []}
    results = [v for v in MEDICINE_DB.values() if q.lower() in v["name"].lower() or q.lower() in v.get("brand", "").lower()]
    return {"results": results[:10]}


# ── Family Wallet ──

class FamilyWalletRequest(BaseModel):
    primary_phone: str
    member_phone: str

@router.post("/wallet/family/add")
async def add_family_to_wallet(req: FamilyWalletRequest):
    primary = req.primary_phone[-10:]
    member = req.member_phone[-10:]
    if primary == member:
        raise HTTPException(400, "Cannot add yourself")
    
    # Check primary wallet exists
    pw = await db.cura_wallets.find_one({"phone": primary})
    if not pw:
        raise HTTPException(404, "Primary wallet not found")
    
    # Add member to family wallet list
    family = pw.get("family_members", [])
    if member in family:
        return {"success": True, "message": "Already a family member"}
    
    family.append(member)
    await db.cura_wallets.update_one({"phone": primary}, {"$set": {"family_members": family}})
    
    # Mark member's wallet as linked
    mw = await db.cura_wallets.find_one({"phone": member})
    if mw:
        await db.cura_wallets.update_one({"phone": member}, {"$set": {"linked_to": primary}})
    
    return {"success": True, "message": f"Added {member} to family wallet", "family_members": family}

@router.delete("/wallet/family/remove")
async def remove_family_from_wallet(primary_phone: str, member_phone: str):
    primary = primary_phone[-10:]
    member = member_phone[-10:]
    pw = await db.cura_wallets.find_one({"phone": primary})
    if not pw:
        raise HTTPException(404, "Wallet not found")
    family = [m for m in pw.get("family_members", []) if m != member]
    await db.cura_wallets.update_one({"phone": primary}, {"$set": {"family_members": family}})
    await db.cura_wallets.update_one({"phone": member}, {"$unset": {"linked_to": ""}})
    return {"success": True, "family_members": family}

@router.get("/wallet/family/{phone}")
async def get_family_wallet(phone: str):
    clean = phone[-10:]
    wallet = await db.cura_wallets.find_one({"phone": clean}, {"_id": 0})
    if not wallet:
        return {"wallet": None, "family_members": []}
    
    family_phones = wallet.get("family_members", [])
    family_data = []
    for fp in family_phones:
        member = await db.family_members.find_one({"owner_phone": clean, "phone": fp}, {"_id": 0})
        fw = await db.cura_wallets.find_one({"phone": fp}, {"_id": 0})
        family_data.append({
            "phone": fp,
            "name": member.get("name") if member else fp,
            "coins": fw.get("coins", 0) if fw else 0,
        })
    
    return {"wallet": wallet, "family_members": family_data, "is_primary": True}
