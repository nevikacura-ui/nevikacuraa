"""
CuraCoins Loyalty Engine — Virtual coins earned on bookings/purchases, redeemable for discounts.
"""

import os
import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List
import jwt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/curacoins", tags=["CuraCoins"])

db = None
JWT_SECRET = os.environ.get("JWT_SECRET", "nevika-cura-jwt-secret-key-2025")

def set_db(database):
    global db
    db = database

# Coin earn rates
EARN_RATES = {
    "appointment": 50,
    "lab_test": 30,
    "pharmacy_order": 20,
    "wallet_topup": 10,
    "referral": 200,
    "review": 25,
    "voice_booking": 75,  # Bonus for AI booking
    "profile_complete": 100,
}

REDEEM_OPTIONS = [
    {"id": "discount_50", "label": "₹50 Off Next Visit", "coins": 500, "value": 50},
    {"id": "discount_100", "label": "₹100 Off Lab Test", "coins": 900, "value": 100},
    {"id": "discount_200", "label": "₹200 Off Pharmacy", "coins": 1500, "value": 200},
    {"id": "free_checkup", "label": "Free Basic Checkup", "coins": 2500, "value": 500},
    {"id": "priority_queue", "label": "Priority Queue Pass", "coins": 300, "value": 0},
]


class EarnCoinsRequest(BaseModel):
    phone: str
    action: str
    amount: Optional[float] = None
    reference_id: Optional[str] = None

class RedeemRequest(BaseModel):
    phone: str
    option_id: str


@router.get("/balance/{phone}")
async def get_coin_balance(phone: str):
    """Get CuraCoin balance and recent history"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    wallet = await db.curacoins.find_one({"phone": phone}, {"_id": 0})
    if not wallet:
        wallet = {"phone": phone, "balance": 0, "total_earned": 0, "total_redeemed": 0}
        await db.curacoins.insert_one(wallet)
        wallet.pop("_id", None)

    # Recent transactions
    txns = await db.curacoin_transactions.find(
        {"phone": phone}, {"_id": 0}
    ).sort("created_at", -1).to_list(20)

    return {
        "balance": wallet.get("balance", 0),
        "total_earned": wallet.get("total_earned", 0),
        "total_redeemed": wallet.get("total_redeemed", 0),
        "transactions": txns,
        "earn_rates": EARN_RATES,
        "redeem_options": REDEEM_OPTIONS,
    }


@router.post("/earn")
async def earn_coins(request: EarnCoinsRequest):
    """Award coins for an action"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    coins = EARN_RATES.get(request.action, 0)
    if coins == 0:
        return {"success": False, "message": f"Unknown action: {request.action}", "coins_earned": 0}

    # Extra coins based on amount spent
    if request.amount and request.amount > 0:
        bonus = int(request.amount * 0.05)  # 5% of spend
        coins += bonus

    await db.curacoins.update_one(
        {"phone": request.phone},
        {"$inc": {"balance": coins, "total_earned": coins}, "$setOnInsert": {"total_redeemed": 0}},
        upsert=True
    )

    txn = {
        "id": str(uuid.uuid4()),
        "phone": request.phone,
        "type": "earn",
        "action": request.action,
        "coins": coins,
        "reference_id": request.reference_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.curacoin_transactions.insert_one(txn)
    txn.pop("_id", None)

    wallet = await db.curacoins.find_one({"phone": request.phone}, {"_id": 0})

    return {
        "success": True,
        "coins_earned": coins,
        "new_balance": wallet.get("balance", coins),
        "message": f"+{coins} CuraCoins earned for {request.action.replace('_', ' ')}!"
    }


@router.post("/redeem")
async def redeem_coins(request: RedeemRequest):
    """Redeem coins for a reward"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    option = next((o for o in REDEEM_OPTIONS if o["id"] == request.option_id), None)
    if not option:
        raise HTTPException(status_code=400, detail="Invalid redeem option")

    wallet = await db.curacoins.find_one({"phone": request.phone}, {"_id": 0})
    if not wallet or wallet.get("balance", 0) < option["coins"]:
        raise HTTPException(status_code=400, detail=f"Insufficient coins. Need {option['coins']}, have {wallet.get('balance', 0) if wallet else 0}")

    await db.curacoins.update_one(
        {"phone": request.phone},
        {"$inc": {"balance": -option["coins"], "total_redeemed": option["coins"]}}
    )

    txn = {
        "id": str(uuid.uuid4()),
        "phone": request.phone,
        "type": "redeem",
        "action": request.option_id,
        "coins": -option["coins"],
        "reward": option["label"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.curacoin_transactions.insert_one(txn)

    wallet = await db.curacoins.find_one({"phone": request.phone}, {"_id": 0})

    return {
        "success": True,
        "reward": option["label"],
        "coins_spent": option["coins"],
        "new_balance": wallet.get("balance", 0),
        "message": f"Redeemed: {option['label']}! Enjoy your reward."
    }


@router.get("/leaderboard")
async def get_leaderboard():
    """Get top CuraCoin earners"""
    if db is None:
        return {"leaderboard": []}

    pipeline = [
        {"$sort": {"total_earned": -1}},
        {"$limit": 10},
        {"$project": {"_id": 0, "phone": 1, "total_earned": 1, "balance": 1}}
    ]
    leaders = []
    async for d in db.curacoins.aggregate(pipeline):
        # Mask phone
        phone = d.get("phone", "")
        masked = phone[:3] + "****" + phone[-3:] if len(phone) >= 6 else phone
        leaders.append({"phone": masked, "total_earned": d.get("total_earned", 0), "balance": d.get("balance", 0)})

    return {"leaderboard": leaders}
