"""
Payment Methods Management + WhatsApp Wallet Notification Templates
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid
import logging

router = APIRouter(prefix="/api")
db = None
send_whatsapp = None

logger = logging.getLogger(__name__)

def init_db(database):
    global db
    db = database

def set_whatsapp_fn(fn):
    global send_whatsapp
    send_whatsapp = fn


# ═══════════════════════════════════════
# PAYMENT METHODS CRUD
# ═══════════════════════════════════════

class SavePaymentMethod(BaseModel):
    phone: str
    method_type: str  # upi, card
    # UPI fields
    upi_id: Optional[str] = None
    # Card fields
    card_last4: Optional[str] = None
    card_network: Optional[str] = None  # visa, mastercard, rupay
    card_holder: Optional[str] = None
    card_expiry: Optional[str] = None
    # Common
    label: Optional[str] = None
    is_default: bool = False

@router.post("/payment-methods")
async def save_payment_method(req: SavePaymentMethod):
    clean = req.phone[-10:]
    
    if req.method_type == "upi" and not req.upi_id:
        raise HTTPException(400, "UPI ID is required")
    if req.method_type == "card" and not req.card_last4:
        raise HTTPException(400, "Card details are required")
    
    pm_id = str(uuid.uuid4())[:8]
    
    if req.is_default:
        await db.payment_methods.update_many({"phone": clean}, {"$set": {"is_default": False}})
    
    doc = {
        "id": pm_id,
        "phone": clean,
        "method_type": req.method_type,
        "upi_id": req.upi_id if req.method_type == "upi" else None,
        "card_last4": req.card_last4 if req.method_type == "card" else None,
        "card_network": req.card_network if req.method_type == "card" else None,
        "card_holder": req.card_holder if req.method_type == "card" else None,
        "card_expiry": req.card_expiry if req.method_type == "card" else None,
        "label": req.label or (req.upi_id if req.method_type == "upi" else f"•••• {req.card_last4}"),
        "is_default": req.is_default,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.payment_methods.insert_one(doc)
    doc.pop("_id", None)
    return {"success": True, "payment_method": doc}

@router.get("/payment-methods/{phone}")
async def get_payment_methods(phone: str):
    clean = phone[-10:]
    methods = await db.payment_methods.find({"phone": clean}, {"_id": 0}).to_list(20)
    return {"payment_methods": methods}

@router.delete("/payment-methods/{pm_id}")
async def delete_payment_method(pm_id: str):
    result = await db.payment_methods.delete_one({"id": pm_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Payment method not found")
    return {"success": True}

@router.put("/payment-methods/{pm_id}/default")
async def set_default_payment(pm_id: str, phone: str = ""):
    clean = phone[-10:] if phone else ""
    if clean:
        await db.payment_methods.update_many({"phone": clean}, {"$set": {"is_default": False}})
    await db.payment_methods.update_one({"id": pm_id}, {"$set": {"is_default": True}})
    return {"success": True}


# ═══════════════════════════════════════
# WHATSAPP WALLET NOTIFICATION TEMPLATES
# ═══════════════════════════════════════

def template_wallet_reward(patient_name: str, amount: str, coins: str, action: str, balance: str, total_coins: str) -> str:
    """Template: cura_wallet_reward — Earned coins + Wallet credit (fused)"""
    return f"""*Nevika Cura - Rewards*

Hi {patient_name},

You earned *{coins} CuraX Coins* for {action}!
₹{amount} has been credited to your *Cura Wallet*.

*Your Balance:*
• Cura Wallet: ₹{balance}
• CuraX Coins: {total_coins}

Use your balance at *Orange Pharmacy* for medicines or *Mango Health Labs* for diagnostic tests — all within the Nevika Cura ecosystem.

Redeem coins anytime at nevikacura.com
— Team Nevika Cura"""


def template_coins_redeemed(patient_name: str, coins: str, value: str, balance: str, remaining_coins: str) -> str:
    """Template: cura_coins_redeemed — Coins redeemed to wallet"""
    return f"""*Nevika Cura - Coins Redeemed*

Hi {patient_name},

You redeemed *{coins} CuraX Coins* (₹{value}).
Amount added to your *Cura Wallet*.

*Updated Balance:*
• Cura Wallet: ₹{balance}
• CuraX Coins: {remaining_coins}

Use your wallet balance at *Orange Pharmacy* for medicines, *Mango Health Labs* for blood tests & health checkups, or book a consultation with *DiaGyn Healthcare*.

Thank you for choosing Nevika Cura!
— Team Nevika Cura"""


def template_wallet_refund(patient_name: str, amount: str, reason: str, balance: str) -> str:
    """Template: cura_wallet_refund — Refund credited"""
    return f"""*Nevika Cura - Refund Processed*

Hi {patient_name},

₹{amount} has been refunded to your *Cura Wallet*.
Reason: {reason}

*Wallet Balance:* ₹{balance}

Your wallet balance can be used for:
• Medicines at *Orange Pharmacy*
• Lab tests at *Mango Health Labs*
• Doctor consultations at *DiaGyn Healthcare*

No expiry on wallet balance.
— Team Nevika Cura"""


# ── Send notification endpoints ──

class WalletRewardNotification(BaseModel):
    phone: str
    patient_name: str
    amount: float = 0
    coins: int = 0
    action: str = ""
    balance: float = 0
    total_coins: int = 0

class CoinsRedeemedNotification(BaseModel):
    phone: str
    patient_name: str
    coins: int
    value: float
    balance: float
    remaining_coins: int

class WalletRefundNotification(BaseModel):
    phone: str
    patient_name: str
    amount: float
    reason: str
    balance: float


@router.post("/notify/wallet-reward")
async def send_wallet_reward_notification(req: WalletRewardNotification):
    msg = template_wallet_reward(req.patient_name, str(req.amount), str(req.coins), req.action, str(req.balance), str(req.total_coins))
    
    # Log notification
    await db.wallet_notifications.insert_one({
        "id": str(uuid.uuid4())[:8],
        "phone": req.phone[-10:],
        "template": "cura_wallet_reward",
        "message": msg,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    
    if send_whatsapp:
        try:
            result = await send_whatsapp(req.phone, msg)
            await db.wallet_notifications.update_one(
                {"phone": req.phone[-10:]},
                {"$set": {"status": "sent"}},
                sort=[("created_at", -1)]
            )
            return {"success": True, "sent": True, "message": "Notification sent via WhatsApp"}
        except Exception as e:
            logger.warning(f"WhatsApp send failed: {e}")
    
    return {"success": True, "sent": False, "message": "Notification logged (WhatsApp not configured)", "preview": msg}


@router.post("/notify/coins-redeemed")
async def send_coins_redeemed_notification(req: CoinsRedeemedNotification):
    msg = template_coins_redeemed(req.patient_name, str(req.coins), str(req.value), str(req.balance), str(req.remaining_coins))
    
    await db.wallet_notifications.insert_one({
        "id": str(uuid.uuid4())[:8],
        "phone": req.phone[-10:],
        "template": "cura_coins_redeemed",
        "message": msg,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    
    if send_whatsapp:
        try:
            await send_whatsapp(req.phone, msg)
            return {"success": True, "sent": True}
        except Exception as e:
            logger.warning(f"WhatsApp send failed: {e}")
    
    return {"success": True, "sent": False, "message": "Notification logged", "preview": msg}


@router.post("/notify/wallet-refund")
async def send_wallet_refund_notification(req: WalletRefundNotification):
    msg = template_wallet_refund(req.patient_name, str(req.amount), req.reason, str(req.balance))
    
    await db.wallet_notifications.insert_one({
        "id": str(uuid.uuid4())[:8],
        "phone": req.phone[-10:],
        "template": "cura_wallet_refund",
        "message": msg,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    
    if send_whatsapp:
        try:
            await send_whatsapp(req.phone, msg)
            return {"success": True, "sent": True}
        except Exception as e:
            logger.warning(f"WhatsApp send failed: {e}")
    
    return {"success": True, "sent": False, "message": "Notification logged", "preview": msg}


# ── Get notification history ──

@router.get("/notifications/wallet/{phone}")
async def get_wallet_notifications(phone: str, limit: int = 20):
    clean = phone[-10:]
    notifs = await db.wallet_notifications.find({"phone": clean}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return {"notifications": notifs}


# ── Template preview (for admin) ──

@router.get("/notify/templates")
async def get_notification_templates():
    return {
        "templates": [
            {
                "name": "cura_wallet_reward",
                "description": "Earned coins + Wallet credit (fused notification)",
                "variables": ["patient_name", "amount", "coins", "action", "balance", "total_coins"],
                "sample": template_wallet_reward("Rahul", "50", "20", "consultation booking", "550", "120"),
            },
            {
                "name": "cura_coins_redeemed",
                "description": "Coins redeemed to wallet balance",
                "variables": ["patient_name", "coins", "value", "balance", "remaining_coins"],
                "sample": template_coins_redeemed("Rahul", "200", "200", "750", "120"),
            },
            {
                "name": "cura_wallet_refund",
                "description": "Refund credited to wallet",
                "variables": ["patient_name", "amount", "reason", "balance"],
                "sample": template_wallet_refund("Rahul", "300", "Cancelled appointment", "1050"),
            },
        ]
    }
