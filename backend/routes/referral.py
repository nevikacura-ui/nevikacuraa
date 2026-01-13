"""
Referral Program Module
- Refer friends, earn rewards
- Trackable referral codes
- Integration with Loyalty Program
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid
import random
import string

router = APIRouter(prefix="/referral", tags=["Referral Program"])

db = None

def get_db():
    global db
    return db

def set_db(database):
    global db
    db = database

# Referral Program Config
REFERRAL_CONFIG = {
    "referrer_reward": 100,  # Points for the referrer
    "referee_reward": 50,    # Points for new user
    "referrer_discount": 100,  # ₹100 off for referrer
    "referee_discount": 100,   # ₹100 off for new user
    "min_order_value": 500,    # Minimum order to use discount
    "max_referrals": 50,       # Max referrals per user
    "reward_on": "first_order" # When to give reward: signup, first_order
}

# ==================== REFERRAL CODE GENERATION ====================

def generate_referral_code(name: str) -> str:
    """Generate a unique referral code based on user's name"""
    # Take first 3-4 letters of name + random alphanumeric
    prefix = ''.join(c for c in name.upper()[:4] if c.isalpha())
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"{prefix}{suffix}"

# ==================== ENDPOINTS ====================

@router.get("/code/{user_id}")
async def get_referral_code(user_id: str):
    """Get or create referral code for a user"""
    db = get_db()
    
    # Check if user already has a referral code
    referral = await db.referral_codes.find_one({"user_id": user_id}, {"_id": 0})
    
    if referral:
        # Get referral stats
        successful_referrals = await db.referrals.count_documents({
            "referrer_id": user_id,
            "status": "completed"
        })
        pending_referrals = await db.referrals.count_documents({
            "referrer_id": user_id,
            "status": "pending"
        })
        
        return {
            "referral_code": referral["code"],
            "stats": {
                "successful_referrals": successful_referrals,
                "pending_referrals": pending_referrals,
                "total_rewards_earned": successful_referrals * REFERRAL_CONFIG["referrer_reward"],
                "remaining_referrals": REFERRAL_CONFIG["max_referrals"] - successful_referrals
            },
            "config": REFERRAL_CONFIG
        }
    
    # Generate new referral code
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "name": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    code = generate_referral_code(user.get("name", "USER"))
    
    # Ensure code is unique
    while await db.referral_codes.find_one({"code": code}):
        code = generate_referral_code(user.get("name", "USER"))
    
    referral_doc = {
        "user_id": user_id,
        "code": code,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.referral_codes.insert_one(referral_doc)
    
    return {
        "referral_code": code,
        "stats": {
            "successful_referrals": 0,
            "pending_referrals": 0,
            "total_rewards_earned": 0,
            "remaining_referrals": REFERRAL_CONFIG["max_referrals"]
        },
        "config": REFERRAL_CONFIG,
        "message": "Your referral code has been created!"
    }

@router.post("/apply")
async def apply_referral_code(referee_id: str, referral_code: str):
    """Apply a referral code for a new user"""
    db = get_db()
    
    # Find the referral code
    referral = await db.referral_codes.find_one({"code": referral_code.upper()}, {"_id": 0})
    
    if not referral:
        raise HTTPException(status_code=404, detail="Invalid referral code")
    
    referrer_id = referral["user_id"]
    
    # Can't refer yourself
    if referrer_id == referee_id:
        raise HTTPException(status_code=400, detail="You cannot use your own referral code")
    
    # Check if referee already used a referral code
    existing = await db.referrals.find_one({"referee_id": referee_id})
    if existing:
        raise HTTPException(status_code=400, detail="You have already used a referral code")
    
    # Check referrer's limit
    referrer_count = await db.referrals.count_documents({"referrer_id": referrer_id, "status": "completed"})
    if referrer_count >= REFERRAL_CONFIG["max_referrals"]:
        raise HTTPException(status_code=400, detail="This referral code has reached its limit")
    
    # Create referral record
    referral_record = {
        "id": str(uuid.uuid4()),
        "referrer_id": referrer_id,
        "referee_id": referee_id,
        "referral_code": referral_code.upper(),
        "status": "pending",  # Will be completed on first order
        "referee_discount_used": False,
        "referrer_reward_given": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.referrals.insert_one(referral_record)
    
    # Update referee's profile with discount
    await db.users.update_one(
        {"id": referee_id},
        {"$set": {
            "referral_discount": REFERRAL_CONFIG["referee_discount"],
            "referred_by": referrer_id
        }}
    )
    
    return {
        "message": f"Referral code applied! You get ₹{REFERRAL_CONFIG['referee_discount']} off on your first order (min ₹{REFERRAL_CONFIG['min_order_value']})",
        "discount": REFERRAL_CONFIG["referee_discount"],
        "min_order": REFERRAL_CONFIG["min_order_value"]
    }

@router.post("/complete/{referee_id}")
async def complete_referral(referee_id: str, order_id: str, order_amount: float):
    """Complete a referral when referee makes first order"""
    db = get_db()
    
    # Find pending referral
    referral = await db.referrals.find_one({
        "referee_id": referee_id,
        "status": "pending"
    })
    
    if not referral:
        return {"message": "No pending referral found"}
    
    if order_amount < REFERRAL_CONFIG["min_order_value"]:
        return {"message": f"Order value must be at least ₹{REFERRAL_CONFIG['min_order_value']} to complete referral"}
    
    # Update referral status
    await db.referrals.update_one(
        {"id": referral["id"]},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "completed_order_id": order_id,
            "completed_order_amount": order_amount
        }}
    )
    
    # Give reward to referrer (loyalty points)
    await db.user_loyalty.update_one(
        {"user_id": referral["referrer_id"]},
        {
            "$inc": {"total_points": REFERRAL_CONFIG["referrer_reward"]},
            "$push": {
                "referral_rewards": {
                    "referee_id": referee_id,
                    "points": REFERRAL_CONFIG["referrer_reward"],
                    "date": datetime.now(timezone.utc).isoformat()
                }
            }
        },
        upsert=True
    )
    
    # Give points to referee too
    await db.user_loyalty.update_one(
        {"user_id": referee_id},
        {
            "$inc": {"total_points": REFERRAL_CONFIG["referee_reward"]},
            "$set": {"signup_bonus_given": True}
        },
        upsert=True
    )
    
    return {
        "message": "Referral completed!",
        "referrer_reward": REFERRAL_CONFIG["referrer_reward"],
        "referee_reward": REFERRAL_CONFIG["referee_reward"]
    }

@router.get("/history/{user_id}")
async def get_referral_history(user_id: str):
    """Get referral history for a user"""
    db = get_db()
    
    # Get referrals made by this user
    referrals = await db.referrals.find(
        {"referrer_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Enrich with referee names
    for ref in referrals:
        referee = await db.users.find_one({"id": ref["referee_id"]}, {"_id": 0, "name": 1})
        ref["referee_name"] = referee.get("name", "User") if referee else "User"
        # Mask name for privacy: "John Doe" -> "J***n D**e"
        name = ref["referee_name"]
        if len(name) > 2:
            parts = name.split()
            masked_parts = []
            for part in parts:
                if len(part) > 2:
                    masked_parts.append(f"{part[0]}{'*' * (len(part)-2)}{part[-1]}")
                else:
                    masked_parts.append(part)
            ref["referee_name"] = " ".join(masked_parts)
    
    return {
        "referrals": referrals,
        "total": len(referrals),
        "completed": len([r for r in referrals if r["status"] == "completed"]),
        "pending": len([r for r in referrals if r["status"] == "pending"])
    }

@router.get("/leaderboard")
async def get_referral_leaderboard(limit: int = 10):
    """Get top referrers leaderboard"""
    db = get_db()
    
    pipeline = [
        {"$match": {"status": "completed"}},
        {"$group": {
            "_id": "$referrer_id",
            "total_referrals": {"$sum": 1},
            "total_rewards": {"$sum": REFERRAL_CONFIG["referrer_reward"]}
        }},
        {"$sort": {"total_referrals": -1}},
        {"$limit": limit}
    ]
    
    top_referrers = await db.referrals.aggregate(pipeline).to_list(limit)
    
    leaderboard = []
    for idx, referrer in enumerate(top_referrers):
        user = await db.users.find_one({"id": referrer["_id"]}, {"_id": 0, "name": 1})
        name = user.get("name", "User") if user else "User"
        
        # Anonymize
        if len(name) > 2:
            parts = name.split()
            anon_parts = [f"{p[0]}{'*' * (len(p)-2)}{p[-1]}" if len(p) > 2 else p for p in parts]
            name = " ".join(anon_parts)
        
        leaderboard.append({
            "rank": idx + 1,
            "name": name,
            "referrals": referrer["total_referrals"],
            "rewards": referrer["total_rewards"]
        })
    
    return {"leaderboard": leaderboard}
