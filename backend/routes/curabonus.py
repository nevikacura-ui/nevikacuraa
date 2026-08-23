"""
CuraBonus — Gamified Loyalty System for Orange Pharmacy (excludes Orange Generics)
Earn 1 Cura Coin per ₹100 spent. 8-step journey with milestone rewards.
Coins awarded after delivery confirmation. Tiers: Bronze, Silver, Gold.
"""

import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/curabonus", tags=["CuraBonus"])

# 8-step progression milestones (orders + spend thresholds)
STEPS = [
    {"step": 1, "orders_required": 1, "spend_required": 0, "reward": "Welcome Bonus: 10 Free Coins", "reward_type": "coins", "reward_value": 10, "icon": "gift"},
    {"step": 2, "orders_required": 3, "spend_required": 500, "reward": "5% Extra Discount on Next Order", "reward_type": "discount_pct", "reward_value": 5, "icon": "percent"},
    {"step": 3, "orders_required": 5, "spend_required": 2000, "reward": "Free Delivery Unlocked (1 Order)", "reward_type": "free_delivery", "reward_value": 1, "icon": "truck"},
    {"step": 4, "orders_required": 8, "spend_required": 5000, "reward": "10% Extra Discount on Next Order", "reward_type": "discount_pct", "reward_value": 10, "icon": "zap"},
    {"step": 5, "orders_required": 12, "spend_required": 10000, "reward": "Free Basic Health Checkup", "reward_type": "free_checkup", "reward_value": 500, "icon": "heart-pulse"},
    {"step": 6, "orders_required": 18, "spend_required": 18000, "reward": "15% Extra Discount on Next Order", "reward_type": "discount_pct", "reward_value": 15, "icon": "crown"},
    {"step": 7, "orders_required": 25, "spend_required": 30000, "reward": "Free Delivery for 3 Months", "reward_type": "free_delivery_period", "reward_value": 90, "icon": "rocket"},
    {"step": 8, "orders_required": 35, "spend_required": 50000, "reward": "Free Comprehensive Checkup + 100 Bonus Coins", "reward_type": "ultimate", "reward_value": 100, "icon": "trophy"},
]

# Tier thresholds
TIERS = {
    "bronze": {"name": "Bronze", "min_step": 0, "color": "#CD7F32", "coin_multiplier": 1.0},
    "silver": {"name": "Silver", "min_step": 4, "color": "#C0C0C0", "coin_multiplier": 1.25},
    "gold": {"name": "Gold", "min_step": 7, "color": "#FFD700", "coin_multiplier": 1.5},
}

# Redemption rates
COIN_VALUE = 1.0  # 1 coin = ₹1
MIN_REDEEM = 50
MAX_REDEEM_PCT = 0.5  # Max 50% of order can be paid with coins


def get_db():
    from database import get_db as _get_db
    return _get_db()


def determine_tier(completed_steps: int) -> str:
    if completed_steps >= 7:
        return "gold"
    if completed_steps >= 4:
        return "silver"
    return "bronze"


def calculate_current_step(total_orders: int, total_spent: float) -> int:
    current = 0
    for s in STEPS:
        if total_orders >= s["orders_required"] and total_spent >= s["spend_required"]:
            current = s["step"]
        else:
            break
    return current


def coins_for_order(amount: float, tier: str) -> int:
    base = int(amount // 100)
    multiplier = TIERS.get(tier, TIERS["bronze"])["coin_multiplier"]
    return max(0, int(base * multiplier))


# ---------- Models ----------

class EarnCoinsRequest(BaseModel):
    phone: str
    order_id: str
    amount: float  # order amount in ₹
    source: str = "orange_pharmacy"  # must NOT be orange_generics


class RedeemCoinsRequest(BaseModel):
    phone: str
    coins: int
    order_id: Optional[str] = None


class ClaimRewardRequest(BaseModel):
    phone: str
    step: int


# ---------- Routes ----------

@router.get("/profile")
async def get_curabonus_profile(phone: str = Query(...)):
    """Get user's CuraBonus profile: coins, step, tier, rewards."""
    db = get_db()
    profile = await db.curabonus_profiles.find_one({"phone": phone}, {"_id": 0})

    if not profile:
        profile = {
            "phone": phone,
            "coins": 0,
            "total_orders": 0,
            "total_spent": 0.0,
            "current_step": 0,
            "tier": "bronze",
            "claimed_rewards": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.curabonus_profiles.insert_one({**profile})

    completed = calculate_current_step(profile.get("total_orders", 0), profile.get("total_spent", 0))
    tier = determine_tier(completed)

    # Build step details
    steps_detail = []
    for s in STEPS:
        unlocked = completed >= s["step"]
        claimed = s["step"] in profile.get("claimed_rewards", [])
        steps_detail.append({
            **s,
            "unlocked": unlocked,
            "claimed": claimed,
            "claimable": unlocked and not claimed,
        })

    # Next step progress
    next_step = None
    if completed < 8:
        ns = STEPS[completed]
        next_step = {
            "step": ns["step"],
            "orders_needed": max(0, ns["orders_required"] - profile.get("total_orders", 0)),
            "spend_needed": max(0, ns["spend_required"] - profile.get("total_spent", 0)),
            "reward": ns["reward"],
        }

    return {
        "phone": phone,
        "coins": profile.get("coins", 0),
        "total_orders": profile.get("total_orders", 0),
        "total_spent": round(profile.get("total_spent", 0), 2),
        "current_step": completed,
        "tier": tier,
        "tier_info": TIERS[tier],
        "steps": steps_detail,
        "next_step": next_step,
        "coin_value": COIN_VALUE,
        "min_redeem": MIN_REDEEM,
    }


@router.post("/earn")
async def earn_coins(req: EarnCoinsRequest):
    """Award coins after delivery confirmation. Orange Pharmacy only (not Generics)."""
    if req.source == "orange_generics":
        raise HTTPException(status_code=400, detail="CuraBonus is not available for Orange Generics")
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Order amount must be positive")

    db = get_db()
    profile = await db.curabonus_profiles.find_one({"phone": req.phone}, {"_id": 0})

    if not profile:
        profile = {
            "phone": req.phone, "coins": 0, "total_orders": 0, "total_spent": 0.0,
            "current_step": 0, "tier": "bronze", "claimed_rewards": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.curabonus_profiles.insert_one({**profile})

    # Prevent double-earning
    existing = await db.curabonus_txns.find_one({"order_id": req.order_id, "type": "earn"})
    if existing:
        return {"status": "already_awarded", "coins_earned": 0}

    old_step = calculate_current_step(profile.get("total_orders", 0), profile.get("total_spent", 0))
    tier = determine_tier(old_step)
    earned = coins_for_order(req.amount, tier)

    new_orders = profile.get("total_orders", 0) + 1
    new_spent = round(profile.get("total_spent", 0) + req.amount, 2)
    new_coins = profile.get("coins", 0) + earned
    new_step = calculate_current_step(new_orders, new_spent)
    new_tier = determine_tier(new_step)

    await db.curabonus_profiles.update_one(
        {"phone": req.phone},
        {"$set": {
            "coins": new_coins,
            "total_orders": new_orders,
            "total_spent": new_spent,
            "current_step": new_step,
            "tier": new_tier,
        }}
    )

    await db.curabonus_txns.insert_one({
        "id": str(uuid.uuid4()),
        "phone": req.phone,
        "order_id": req.order_id,
        "type": "earn",
        "coins": earned,
        "amount": req.amount,
        "tier": tier,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    step_unlocked = new_step > old_step
    tier_upgraded = new_tier != tier

    return {
        "status": "coins_awarded",
        "coins_earned": earned,
        "new_balance": new_coins,
        "new_step": new_step,
        "step_unlocked": step_unlocked,
        "tier": new_tier,
        "tier_upgraded": tier_upgraded,
    }


@router.post("/redeem")
async def redeem_coins(req: RedeemCoinsRequest):
    """Redeem coins as discount. 1 coin = ₹1."""
    if req.coins < MIN_REDEEM:
        raise HTTPException(status_code=400, detail=f"Minimum {MIN_REDEEM} coins required to redeem")

    db = get_db()
    profile = await db.curabonus_profiles.find_one({"phone": req.phone}, {"_id": 0})
    if not profile or profile.get("coins", 0) < req.coins:
        raise HTTPException(status_code=400, detail="Insufficient coins")

    discount = round(req.coins * COIN_VALUE, 2)
    new_balance = profile["coins"] - req.coins

    await db.curabonus_profiles.update_one(
        {"phone": req.phone},
        {"$set": {"coins": new_balance}}
    )

    await db.curabonus_txns.insert_one({
        "id": str(uuid.uuid4()),
        "phone": req.phone,
        "order_id": req.order_id or "",
        "type": "redeem",
        "coins": -req.coins,
        "amount": discount,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "status": "redeemed",
        "coins_used": req.coins,
        "discount": discount,
        "new_balance": new_balance,
    }


@router.post("/claim-reward")
async def claim_step_reward(req: ClaimRewardRequest):
    """Claim a step milestone reward."""
    if req.step < 1 or req.step > 8:
        raise HTTPException(status_code=400, detail="Invalid step number")

    db = get_db()
    profile = await db.curabonus_profiles.find_one({"phone": req.phone}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    current_step = calculate_current_step(profile.get("total_orders", 0), profile.get("total_spent", 0))
    if req.step > current_step:
        raise HTTPException(status_code=400, detail="Step not yet unlocked")

    claimed = profile.get("claimed_rewards", [])
    if req.step in claimed:
        raise HTTPException(status_code=400, detail="Reward already claimed")

    step_data = STEPS[req.step - 1]
    bonus_coins = 0

    if step_data["reward_type"] == "coins":
        bonus_coins = step_data["reward_value"]
    elif step_data["reward_type"] == "ultimate":
        bonus_coins = step_data["reward_value"]

    new_coins = profile.get("coins", 0) + bonus_coins
    claimed.append(req.step)

    await db.curabonus_profiles.update_one(
        {"phone": req.phone},
        {"$set": {"coins": new_coins, "claimed_rewards": claimed}}
    )

    if bonus_coins > 0:
        await db.curabonus_txns.insert_one({
            "id": str(uuid.uuid4()),
            "phone": req.phone,
            "order_id": f"step_{req.step}_reward",
            "type": "bonus",
            "coins": bonus_coins,
            "amount": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    return {
        "status": "claimed",
        "step": req.step,
        "reward": step_data["reward"],
        "reward_type": step_data["reward_type"],
        "bonus_coins": bonus_coins,
        "new_coin_balance": new_coins,
    }


@router.get("/history")
async def get_coin_history(phone: str = Query(...), limit: int = Query(20)):
    """Get coin transaction history."""
    db = get_db()
    cursor = db.curabonus_txns.find(
        {"phone": phone}, {"_id": 0}
    ).sort("created_at", -1).limit(limit)
    txns = await cursor.to_list(length=limit)
    return {"transactions": txns}


@router.get("/steps")
async def get_steps_config():
    """Get the 8-step configuration."""
    return {"steps": STEPS, "tiers": TIERS, "coin_value": COIN_VALUE, "min_redeem": MIN_REDEEM}
