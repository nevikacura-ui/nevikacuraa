"""
Gift Health Cards & Occasion Bundles
Purchase health gift cards, deliver via WhatsApp, redeem at any service.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import os
import random
import string
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/gift-cards", tags=["Gift Health Cards"])

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Pre-defined Gift Card templates
GIFT_TEMPLATES = {
    "mothers_day": {
        "title": "Happy Mother's Day",
        "subtitle": "Gift her the best health checkup",
        "emoji": "heart",
        "bg_gradient": "from-pink-500 to-rose-500",
        "suggested_amounts": [999, 1999, 2999, 4999]
    },
    "fathers_day": {
        "title": "Happy Father's Day",
        "subtitle": "Because his health matters",
        "emoji": "shield",
        "bg_gradient": "from-blue-600 to-indigo-600",
        "suggested_amounts": [999, 1999, 2999, 4999]
    },
    "birthday": {
        "title": "Happy Birthday",
        "subtitle": "A healthy year ahead",
        "emoji": "cake",
        "bg_gradient": "from-purple-500 to-violet-500",
        "suggested_amounts": [500, 999, 1999, 2999]
    },
    "diwali": {
        "title": "Happy Diwali",
        "subtitle": "Gift health, gift happiness",
        "emoji": "sparkles",
        "bg_gradient": "from-amber-500 to-orange-500",
        "suggested_amounts": [999, 1999, 2999, 4999]
    },
    "wedding": {
        "title": "Wedding Wishes",
        "subtitle": "Start your journey with a health checkup",
        "emoji": "heart",
        "bg_gradient": "from-rose-400 to-pink-500",
        "suggested_amounts": [1999, 2999, 4999, 9999]
    },
    "baby_shower": {
        "title": "Baby Shower",
        "subtitle": "Prenatal care for the new mom",
        "emoji": "baby",
        "bg_gradient": "from-cyan-400 to-teal-500",
        "suggested_amounts": [1999, 2999, 4999]
    },
    "general": {
        "title": "Gift of Health",
        "subtitle": "Because you care",
        "emoji": "heart",
        "bg_gradient": "from-teal-500 to-emerald-500",
        "suggested_amounts": [500, 999, 1999, 2999, 4999]
    },
    "corporate": {
        "title": "Corporate Wellness",
        "subtitle": "Employee health checkup voucher",
        "emoji": "briefcase",
        "bg_gradient": "from-slate-700 to-slate-900",
        "suggested_amounts": [1499, 2999, 4999, 9999]
    }
}


def generate_gift_code():
    """Generate unique 12-char alphanumeric gift code"""
    prefix = "NC"
    chars = string.ascii_uppercase + string.digits
    code = ''.join(random.choices(chars, k=10))
    return f"{prefix}{code}"


class GiftCardPurchase(BaseModel):
    buyer_name: str
    buyer_phone: str
    buyer_email: Optional[str] = ""
    recipient_name: str
    recipient_phone: str
    amount: int
    template: str = "general"
    personal_message: str = ""
    delivery_method: str = "whatsapp"  # whatsapp, email, both
    payment_method: str = "online"


class GiftCardRedeem(BaseModel):
    code: str
    patient_name: str
    patient_phone: str
    service: str = ""  # diagyn, mango, pharmacy


@router.get("/templates")
async def get_gift_templates():
    """Get all available gift card templates"""
    return {"templates": GIFT_TEMPLATES}


@router.post("/purchase")
async def purchase_gift_card(data: GiftCardPurchase):
    """Purchase a new gift card"""
    if data.amount < 100:
        raise HTTPException(status_code=400, detail="Minimum gift card amount is Rs.100")
    if data.amount > 50000:
        raise HTTPException(status_code=400, detail="Maximum gift card amount is Rs.50,000")

    template = GIFT_TEMPLATES.get(data.template, GIFT_TEMPLATES["general"])
    code = generate_gift_code()
    now = datetime.now(timezone.utc)
    expiry = now + timedelta(days=180)  # 6 months validity

    gift_card = {
        "id": str(uuid.uuid4()),
        "code": code,
        "buyer_name": data.buyer_name,
        "buyer_phone": data.buyer_phone,
        "buyer_email": data.buyer_email,
        "recipient_name": data.recipient_name,
        "recipient_phone": data.recipient_phone,
        "amount": data.amount,
        "balance": data.amount,
        "template": data.template,
        "template_title": template["title"],
        "personal_message": data.personal_message,
        "delivery_method": data.delivery_method,
        "payment_method": data.payment_method,
        "payment_status": "pending",
        "status": "inactive",  # becomes active after payment
        "created_at": now.isoformat(),
        "expires_at": expiry.isoformat(),
        "delivered_at": None,
        "redeemed_at": None,
        "transactions": []
    }

    await db.gift_cards.insert_one(gift_card)
    del gift_card["_id"]

    return {"success": True, "gift_card": gift_card}


@router.post("/activate/{card_id}")
async def activate_gift_card(card_id: str):
    """Activate gift card after payment (called by payment webhook)"""
    card = await db.gift_cards.find_one({"id": card_id})
    if not card:
        raise HTTPException(status_code=404, detail="Gift card not found")

    await db.gift_cards.update_one({"id": card_id}, {"$set": {
        "status": "active",
        "payment_status": "paid",
        "activated_at": datetime.now(timezone.utc).isoformat()
    }})

    return {"success": True, "message": "Gift card activated", "code": card["code"]}


@router.post("/redeem")
async def redeem_gift_card(data: GiftCardRedeem):
    """Redeem a gift card (partial or full)"""
    card = await db.gift_cards.find_one({"code": data.code.upper()}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Invalid gift card code")

    if card["status"] != "active":
        raise HTTPException(status_code=400, detail=f"Gift card is {card['status']}")

    if card["balance"] <= 0:
        raise HTTPException(status_code=400, detail="Gift card has no remaining balance")

    # Check expiry
    expiry = datetime.fromisoformat(card["expires_at"])
    if datetime.now(timezone.utc) > expiry:
        raise HTTPException(status_code=400, detail="Gift card has expired")

    return {
        "valid": True,
        "code": card["code"],
        "balance": card["balance"],
        "recipient_name": card["recipient_name"],
        "template_title": card.get("template_title", "Gift of Health"),
        "expires_at": card["expires_at"]
    }


@router.post("/use")
async def use_gift_card(data: dict):
    """Use gift card balance for a transaction"""
    code = data.get("code", "").upper()
    amount = data.get("amount", 0)
    service = data.get("service", "")
    order_id = data.get("order_id", "")

    card = await db.gift_cards.find_one({"code": code})
    if not card or card["status"] != "active":
        raise HTTPException(status_code=400, detail="Invalid or inactive gift card")

    if amount > card["balance"]:
        raise HTTPException(status_code=400, detail=f"Insufficient balance. Available: Rs.{card['balance']}")

    new_balance = card["balance"] - amount
    transaction = {
        "id": str(uuid.uuid4()),
        "amount": amount,
        "service": service,
        "order_id": order_id,
        "date": datetime.now(timezone.utc).isoformat()
    }

    update = {
        "balance": new_balance,
        "transactions": card.get("transactions", []) + [transaction],
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    if new_balance <= 0:
        update["status"] = "used"
        update["redeemed_at"] = datetime.now(timezone.utc).isoformat()

    await db.gift_cards.update_one({"code": code}, {"$set": update})

    return {
        "success": True,
        "amount_used": amount,
        "remaining_balance": new_balance,
        "transaction_id": transaction["id"]
    }


@router.get("/check/{code}")
async def check_gift_card(code: str):
    """Check gift card balance and validity"""
    card = await db.gift_cards.find_one({"code": code.upper()}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Gift card not found")

    return {
        "code": card["code"],
        "balance": card["balance"],
        "amount": card["amount"],
        "status": card["status"],
        "template_title": card.get("template_title", ""),
        "recipient_name": card.get("recipient_name", ""),
        "expires_at": card.get("expires_at", ""),
        "transactions": card.get("transactions", [])
    }


@router.get("/stats")
async def gift_card_stats():
    """Admin stats for gift cards"""
    total = await db.gift_cards.count_documents({})
    active = await db.gift_cards.count_documents({"status": "active"})
    used = await db.gift_cards.count_documents({"status": "used"})
    pending = await db.gift_cards.count_documents({"status": "inactive"})

    pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total_sold": {"$sum": "$amount"}, "total_redeemed": {"$sum": {"$subtract": ["$amount", "$balance"]}}}}
    ]
    rev = await db.gift_cards.aggregate(pipeline).to_list(1)
    r = rev[0] if rev else {"total_sold": 0, "total_redeemed": 0}

    return {
        "total": total,
        "active": active,
        "used": used,
        "pending": pending,
        "total_sold": r.get("total_sold", 0),
        "total_redeemed": r.get("total_redeemed", 0),
        "unredeemed_value": r.get("total_sold", 0) - r.get("total_redeemed", 0)
    }
