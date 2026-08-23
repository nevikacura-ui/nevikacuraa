"""
Cura Wallet + CuraX Coins System
- Wallet: refunds, prepaid, cashback
- CuraX Coins: loyalty rewards
- WhatsApp notifications on key events
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")
db = None

def init_db(database):
    global db
    db = database

async def _send_wallet_whatsapp(phone: str, template: str, variables: dict):
    """Fire-and-forget WhatsApp notification for wallet events"""
    try:
        from services.msg91_whatsapp import send_msg91_whatsapp
        msg = ""
        if template == "wallet_credit":
            msg = f"*Nevika Cura - Wallet Update*\n\nDear {variables.get('name', 'User')},\n\n{variables.get('amount_text', '')}\n\nYour updated wallet balance: *{variables.get('balance', '0')}*\n\nThank you for choosing Nevika Cura.\n- Team Nevika Cura"
        elif template == "coins_earned":
            msg = f"*Nevika Cura - CuraX Coins Earned*\n\nCongratulations {variables.get('name', 'User')}!\n\nYou earned *{variables.get('coins', 0)} CuraX Coins* for {variables.get('action', 'your activity')}.\n\nTotal coins: *{variables.get('total', 0)}*\n\nRedeem 100+ coins for real wallet balance at 1:1 ratio!\n- Team Nevika Cura"
        elif template == "coins_redeemed":
            msg = f"*Nevika Cura - Coins Redeemed*\n\nDear {variables.get('name', 'User')},\n\nYou redeemed *{variables.get('coins', 0)} CuraX Coins* for *₹{variables.get('value', 0)}*.\n\nRemaining coins: *{variables.get('remaining', 0)}*\nWallet balance: *₹{variables.get('balance', 0)}*\n\n- Team Nevika Cura"
        if msg:
            await send_msg91_whatsapp(phone, msg)
    except Exception as e:
        logger.warning(f"WhatsApp notification failed: {e}")

# ── Models ──
class AddMoneyRequest(BaseModel):
    phone: str
    amount: float
    source: str = "self"  # self, refund, cashback, promo, admin

class DeductRequest(BaseModel):
    phone: str
    amount: float
    description: str = ""

class EarnCoinsRequest(BaseModel):
    phone: str
    coins: int
    action: str  # consultation, lab_test, pharmacy, referral, review, app_download, checkup

class RedeemCoinsRequest(BaseModel):
    phone: str
    coins: int
    description: str = ""

class ReferralApplyRequest(BaseModel):
    phone: str
    referral_code: str

COIN_RULES = {
    "consultation": 20,
    "lab_test": 40,
    "pharmacy": 10,
    "full_body_checkup": 100,
    "referral": 150,
    "app_download": 50,
    "google_review": 30,
}

TIER_MULTIPLIERS = {
    "none": 1.0,
    "silver": 1.2,
    "gold": 1.5,
    "platinum": 2.0,
}

async def get_or_create_wallet(phone):
    clean = phone[-10:]
    wallet = await db.cura_wallets.find_one({"phone": clean}, {"_id": 0})
    if not wallet:
        wallet = {
            "phone": clean,
            "balance": 0.0,
            "coins": 0,
            "total_earned_coins": 0,
            "tier": "none",
            "referral_code": f"CURA{clean[-4:]}",
            "referred_by": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.cura_wallets.insert_one(wallet)
        wallet.pop("_id", None)
    return wallet

# ── Wallet Endpoints ──

@router.get("/wallet/{phone}")
async def get_wallet(phone: str):
    wallet = await get_or_create_wallet(phone)
    return {"wallet": wallet}

@router.post("/wallet/add-money")
async def add_money(req: AddMoneyRequest):
    if req.amount <= 0:
        raise HTTPException(400, "Amount must be positive")
    clean = req.phone[-10:]
    await get_or_create_wallet(clean)
    await db.cura_wallets.update_one({"phone": clean}, {"$inc": {"balance": req.amount}})
    txn = {
        "id": str(uuid.uuid4())[:8],
        "phone": clean,
        "type": "credit",
        "amount": req.amount,
        "source": req.source,
        "description": f"Added ₹{req.amount}" if req.source == "self" else f"{req.source.title()}: ₹{req.amount}",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.wallet_transactions.insert_one(txn)
    txn.pop("_id", None)
    wallet = await get_or_create_wallet(clean)
    # Trigger WhatsApp notification for wallet credit
    try:
        await _send_wallet_whatsapp(clean, "wallet_credit", {
            "name": "User", "amount_text": f"₹{req.amount} added to your Cura Wallet ({req.source})",
            "balance": f"₹{wallet['balance']:.2f}",
        })
    except Exception:
        pass
    return {"success": True, "wallet": wallet, "transaction": txn}

@router.post("/wallet/deduct")
async def deduct_money(req: DeductRequest):
    if req.amount <= 0:
        raise HTTPException(400, "Amount must be positive")
    clean = req.phone[-10:]
    wallet = await get_or_create_wallet(clean)
    if wallet["balance"] < req.amount:
        raise HTTPException(400, "Insufficient wallet balance")
    await db.cura_wallets.update_one({"phone": clean}, {"$inc": {"balance": -req.amount}})
    txn = {
        "id": str(uuid.uuid4())[:8],
        "phone": clean,
        "type": "debit",
        "amount": req.amount,
        "description": req.description or f"Payment: ₹{req.amount}",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.wallet_transactions.insert_one(txn)
    txn.pop("_id", None)
    wallet = await get_or_create_wallet(clean)
    return {"success": True, "wallet": wallet, "transaction": txn}

@router.get("/wallet/transactions/{phone}")
async def get_wallet_transactions(phone: str, limit: int = 20):
    clean = phone[-10:]
    txns = await db.wallet_transactions.find({"phone": clean}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return {"transactions": txns}

# ── CuraX Coins Endpoints ──

@router.post("/coins/earn")
async def earn_coins(req: EarnCoinsRequest):
    clean = req.phone[-10:]
    wallet = await get_or_create_wallet(clean)
    base_coins = req.coins if req.coins > 0 else COIN_RULES.get(req.action, 10)
    multiplier = TIER_MULTIPLIERS.get(wallet.get("tier", "none"), 1.0)
    final_coins = int(base_coins * multiplier)
    await db.cura_wallets.update_one({"phone": clean}, {
        "$inc": {"coins": final_coins, "total_earned_coins": final_coins}
    })
    txn = {
        "id": str(uuid.uuid4())[:8],
        "phone": clean,
        "type": "earned",
        "coins": final_coins,
        "action": req.action,
        "multiplier": multiplier,
        "description": f"Earned {final_coins} CuraX coins for {req.action.replace('_', ' ')}",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.coin_transactions.insert_one(txn)
    txn.pop("_id", None)
    wallet = await get_or_create_wallet(clean)
    # Trigger WhatsApp notification for coins earned
    try:
        await _send_wallet_whatsapp(clean, "coins_earned", {
            "name": "User", "coins": final_coins,
            "action": req.action.replace("_", " "), "total": wallet["coins"],
        })
    except Exception:
        pass
    return {"success": True, "coins_earned": final_coins, "wallet": wallet, "transaction": txn}

@router.post("/coins/redeem")
async def redeem_coins(req: RedeemCoinsRequest):
    if req.coins < 100:
        raise HTTPException(400, "Minimum 100 coins required for redemption")
    clean = req.phone[-10:]
    wallet = await get_or_create_wallet(clean)
    if wallet["coins"] < req.coins:
        raise HTTPException(400, "Insufficient coins")
    rupee_value = float(req.coins)  # 1 coin = ₹1
    await db.cura_wallets.update_one({"phone": clean}, {
        "$inc": {"coins": -req.coins, "balance": rupee_value}
    })
    txn = {
        "id": str(uuid.uuid4())[:8],
        "phone": clean,
        "type": "redeemed",
        "coins": req.coins,
        "rupee_value": rupee_value,
        "description": req.description or f"Redeemed {req.coins} coins → ₹{rupee_value}",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.coin_transactions.insert_one(txn)
    txn.pop("_id", None)
    wallet = await get_or_create_wallet(clean)
    # Trigger WhatsApp notification for coins redeemed
    try:
        await _send_wallet_whatsapp(clean, "coins_redeemed", {
            "name": "User", "coins": req.coins, "value": rupee_value,
            "remaining": wallet["coins"], "balance": f"{wallet['balance']:.2f}",
        })
    except Exception:
        pass
    return {"success": True, "wallet": wallet, "transaction": txn}

@router.get("/coins/transactions/{phone}")
async def get_coin_transactions(phone: str, limit: int = 20):
    clean = phone[-10:]
    txns = await db.coin_transactions.find({"phone": clean}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return {"transactions": txns}

# ── Referral ──

@router.get("/referral/{phone}")
async def get_referral(phone: str):
    wallet = await get_or_create_wallet(phone)
    referrals = await db.cura_wallets.count_documents({"referred_by": wallet["referral_code"]})
    return {"referral_code": wallet["referral_code"], "referrals_count": referrals}

@router.post("/referral/apply")
async def apply_referral(req: ReferralApplyRequest):
    clean = req.phone[-10:]
    wallet = await get_or_create_wallet(clean)
    if wallet.get("referred_by"):
        raise HTTPException(400, "You have already used a referral code")
    referrer = await db.cura_wallets.find_one({"referral_code": req.referral_code}, {"_id": 0})
    if not referrer:
        raise HTTPException(404, "Invalid referral code")
    if referrer["phone"] == clean:
        raise HTTPException(400, "Cannot refer yourself")
    await db.cura_wallets.update_one({"phone": clean}, {"$set": {"referred_by": req.referral_code}})
    # Award coins to both
    await earn_coins(EarnCoinsRequest(phone=referrer["phone"], coins=150, action="referral"))
    await earn_coins(EarnCoinsRequest(phone=clean, coins=100, action="referral"))
    return {"success": True, "message": "Referral applied! Both you and your friend earned CuraX coins."}

# ── Coin Rules Info ──

@router.get("/coins/rules")
async def get_coin_rules():
    return {
        "earning_rules": COIN_RULES,
        "tier_multipliers": TIER_MULTIPLIERS,
        "conversion": "1 CuraX Coin = ₹1",
        "min_redemption": 100,
        "expiry": "12 months from earning",
    }
