"""Pharmacy Extended Routes - Refills, Subscriptions, Express Delivery, History, Quick Reorder"""
from fastapi import APIRouter, HTTPException, Body, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from database import get_db
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class RefillReminderRequest(BaseModel):
    patient_phone: str
    patient_name: str
    medicine_name: str
    quantity_bought: int
    doses_per_day: int = 1
    purchase_date: Optional[str] = None

class DiscountEligibilityUpdate(BaseModel):
    discount_eligible: bool

class SubscriptionBoxRequest(BaseModel):
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    address: str
    medicines: List[dict]
    frequency: str = "monthly"
    start_date: Optional[str] = None

class ExpressDeliveryRequest(BaseModel):
    order_id: Optional[str] = None
    patient_name: str
    patient_phone: str
    address: str
    medicines: List[dict]
    notes: Optional[str] = None


# ==================== DISCOUNT ELIGIBILITY ====================

@router.patch("/pharmacy/medicine/{medicine_id}/discount-eligibility")
async def update_medicine_discount_eligibility(medicine_id: str, update: DiscountEligibilityUpdate):
    """Update medicine discount eligibility (staff only)"""
    db = get_db()
    result = await db.medicines.update_one(
        {"id": medicine_id},
        {"$set": {"discount_eligible": update.discount_eligible, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return {"success": True, "medicine_id": medicine_id, "discount_eligible": update.discount_eligible}


# ==================== REFILL REMINDERS ====================

@router.post("/pharmacy/refill-reminder")
async def set_refill_reminder(request: RefillReminderRequest):
    """Set automatic refill reminder based on medicine quantity and dosage"""
    db = get_db()
    purchase_date = datetime.fromisoformat(request.purchase_date) if request.purchase_date else datetime.now(timezone.utc)
    days_supply = request.quantity_bought // request.doses_per_day
    refill_date = purchase_date + timedelta(days=max(1, days_supply - 3))

    reminder = {
        "id": f"REFILL-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}",
        "patient_phone": request.patient_phone,
        "patient_name": request.patient_name,
        "medicine_name": request.medicine_name,
        "quantity_bought": request.quantity_bought,
        "doses_per_day": request.doses_per_day,
        "purchase_date": purchase_date.isoformat(),
        "refill_date": refill_date.isoformat(),
        "days_supply": days_supply,
        "status": "scheduled",
        "reminded": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.refill_reminders.insert_one(reminder)
    reminder.pop("_id", None)

    return {
        "success": True,
        "reminder_id": reminder["id"],
        "refill_date": refill_date.strftime("%d %b %Y"),
        "days_until_refill": days_supply - 3,
        "message": f"We'll remind you to refill {request.medicine_name} on {refill_date.strftime('%d %b')}"
    }


@router.get("/pharmacy/refill-reminders/{patient_phone}")
async def get_patient_refill_reminders(patient_phone: str):
    """Get all refill reminders for a patient"""
    db = get_db()
    reminders = await db.refill_reminders.find(
        {"patient_phone": patient_phone, "status": "scheduled"}
    ).sort("refill_date", 1).to_list(20)

    for r in reminders:
        r.pop("_id", None)

    return {"reminders": reminders}


# ==================== SUBSCRIPTION BOX ====================

@router.post("/pharmacy/subscription-box")
async def create_subscription_box(request: SubscriptionBoxRequest):
    """Create monthly medicine subscription box with auto-delivery"""
    db = get_db()
    start = datetime.fromisoformat(request.start_date) if request.start_date else datetime.now(timezone.utc)
    frequency_days = 30 if request.frequency == "monthly" else 14

    subscription = {
        "id": f"SUBBOX-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}",
        "patient_name": request.patient_name,
        "patient_phone": request.patient_phone,
        "patient_email": request.patient_email,
        "address": request.address,
        "medicines": request.medicines,
        "frequency": request.frequency,
        "frequency_days": frequency_days,
        "start_date": start.isoformat(),
        "next_delivery": start.isoformat(),
        "status": "active",
        "deliveries_completed": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.medicine_subscriptions.insert_one(subscription)
    subscription.pop("_id", None)

    return {
        "success": True,
        "subscription_id": subscription["id"],
        "next_delivery": start.strftime("%d %b %Y"),
        "frequency": request.frequency,
        "message": f"Medicine subscription box created! First delivery on {start.strftime('%d %b %Y')}"
    }


@router.get("/pharmacy/subscription-box/{patient_phone}")
async def get_subscription_boxes(patient_phone: str):
    """Get active subscription boxes for a patient"""
    db = get_db()
    subscriptions = await db.medicine_subscriptions.find(
        {"patient_phone": patient_phone, "status": "active"}
    ).to_list(10)

    for s in subscriptions:
        s.pop("_id", None)

    return {"subscriptions": subscriptions}


@router.post("/pharmacy/subscription-box/{subscription_id}/pause")
async def pause_subscription_box(subscription_id: str):
    """Pause a subscription box"""
    db = get_db()
    result = await db.medicine_subscriptions.update_one(
        {"id": subscription_id},
        {"$set": {"status": "paused", "paused_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"success": True, "message": "Subscription paused. You can resume anytime."}


@router.post("/pharmacy/subscription-box/{subscription_id}/resume")
async def resume_subscription_box(subscription_id: str):
    """Resume a paused subscription box"""
    db = get_db()
    result = await db.medicine_subscriptions.update_one(
        {"id": subscription_id},
        {"$set": {
            "status": "active",
            "resumed_at": datetime.now(timezone.utc).isoformat(),
            "next_delivery": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"success": True, "message": "Subscription resumed! Next delivery scheduled."}


# ==================== EXPRESS DELIVERY ====================

@router.post("/pharmacy/express-delivery")
async def create_express_delivery(request: ExpressDeliveryRequest):
    """Create express 2-hour delivery order with extra fee"""
    db = get_db()
    EXPRESS_FEE = 50

    order = {
        "id": f"EXPRESS-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}",
        "patient_name": request.patient_name,
        "patient_phone": request.patient_phone,
        "address": request.address,
        "medicines": request.medicines,
        "notes": request.notes,
        "delivery_type": "express",
        "express_fee": EXPRESS_FEE,
        "estimated_delivery": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
        "status": "processing",
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.pharmacy_orders.insert_one(order)
    order.pop("_id", None)

    try:
        from server import notify_staff_new_order
        await notify_staff_new_order({
            "id": order["id"],
            "patient_name": request.patient_name,
            "test_name": "EXPRESS DELIVERY - 2 HOUR",
            "type": "Express"
        }, "orange")
    except Exception as e:
        logger.error(f"Failed to notify staff about express delivery: {e}")

    return {
        "success": True,
        "order_id": order["id"],
        "express_fee": EXPRESS_FEE,
        "estimated_delivery": (datetime.now(timezone.utc) + timedelta(hours=2)).strftime("%I:%M %p"),
        "message": f"Express delivery confirmed! Your medicines will arrive by {(datetime.now() + timedelta(hours=2)).strftime('%I:%M %p')}"
    }


@router.get("/pharmacy/express-fee")
async def get_express_delivery_fee():
    """Get current express delivery fee"""
    return {
        "express_fee": 50,
        "estimated_time": "2 hours",
        "available": True,
        "hours": "9 AM - 9 PM"
    }


# ==================== MEDICINE HISTORY & QUICK REORDER ====================

@router.get("/pharmacy/history/{patient_phone}")
async def get_medicine_purchase_history(patient_phone: str, limit: int = 50):
    """Get complete medicine purchase history for a patient"""
    db = get_db()
    orders = await db.pharmacy_orders.find(
        {"patient_phone": patient_phone}
    ).sort("created_at", -1).to_list(limit)

    medicine_history = {}
    order_list = []

    for order in orders:
        order.pop("_id", None)
        order_list.append({
            "id": order.get("id"),
            "date": order.get("created_at"),
            "status": order.get("status"),
            "medicine_count": len(order.get("medicines", []))
        })

        for med in order.get("medicines", []):
            name = med.get("name", "Unknown")
            if name not in medicine_history:
                medicine_history[name] = {
                    "name": name,
                    "form": med.get("form", ""),
                    "total_quantity": 0,
                    "order_count": 0,
                    "last_ordered": order.get("created_at")
                }
            medicine_history[name]["total_quantity"] += med.get("quantity", 1)
            medicine_history[name]["order_count"] += 1

    sorted_history = sorted(medicine_history.values(), key=lambda x: x["order_count"], reverse=True)

    return {
        "patient_phone": patient_phone,
        "total_orders": len(order_list),
        "orders": order_list[:20],
        "medicines": sorted_history,
        "quick_reorder": sorted_history[:5]
    }


@router.post("/pharmacy/quick-reorder")
async def quick_reorder_medicines(
    patient_phone: str = Body(...),
    patient_name: str = Body(...),
    address: str = Body(...),
    medicines: List[str] = Body(...)
):
    """Quick reorder from previous purchases"""
    db = get_db()
    try:
        from data.medicine_inventory import MEDICINE_INVENTORY
    except ImportError:
        MEDICINE_INVENTORY = []

    order_medicines = []
    for med_name in medicines:
        med_info = next((m for m in MEDICINE_INVENTORY if m["name"] == med_name), None)
        if med_info:
            order_medicines.append({"name": med_info["name"], "form": med_info["form"], "quantity": 1})

    if not order_medicines:
        raise HTTPException(status_code=400, detail="No valid medicines to reorder")

    order = {
        "id": f"ORD-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}",
        "patient_name": patient_name,
        "patient_phone": patient_phone,
        "address": address,
        "medicines": order_medicines,
        "order_type": "quick_reorder",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.pharmacy_orders.insert_one(order)
    order.pop("_id", None)

    return {
        "success": True,
        "order_id": order["id"],
        "medicines": [m["name"] for m in order_medicines],
        "message": "Quick reorder placed! We'll contact you to confirm."
    }



# ==================== SUBSCRIPTION REFILL ====================

class SubscriptionRefillRequest(BaseModel):
    phone: str
    medicines: List[str]
    interval_days: int = 30
    condition: str = "General"

@router.post("/pharmacy/subscription-refill")
async def create_subscription_refill(request: SubscriptionRefillRequest):
    """Create a subscription refill for chronic medicine management"""
    db = get_db()
    sub_id = f"SUB-{uuid.uuid4().hex[:8].upper()}"
    next_refill = datetime.now(timezone.utc) + timedelta(days=request.interval_days)

    subscription = {
        "id": sub_id,
        "phone": request.phone,
        "medicines": request.medicines,
        "condition": request.condition,
        "interval_days": request.interval_days,
        "next_refill_date": next_refill.isoformat(),
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.subscription_refills.insert_one(subscription)
    subscription.pop("_id", None)

    return {
        "success": True,
        "subscription_id": sub_id,
        "next_refill_date": next_refill.strftime("%d %b %Y"),
        "message": f"Auto refill set for {len(request.medicines)} medicines every {request.interval_days} days"
    }


@router.get("/pharmacy/subscription-refills")
async def get_subscription_refills(phone: str):
    """Get active subscription refills for a phone number"""
    db = get_db()
    subs = await db.subscription_refills.find(
        {"phone": phone, "status": "active"}, {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    return {"subscriptions": subs, "total": len(subs)}



# ==================== RETURN & REFUND POLICY EMAIL ====================

@router.post("/pharmacy/send-return-policy")
async def send_return_policy_email(email: str = Body(..., embed=True)):
    """Send return and refund policy to email"""
    try:
        from services.notification_service import send_email_notification
        html = """
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#07070f;color:#fff;padding:32px;">
          <div style="text-align:center;padding:20px 0;border-bottom:1px solid #222;">
            <h1 style="color:#F97316;font-size:24px;margin:0;">Nevika Cura</h1>
            <p style="color:#666;font-size:12px;margin-top:4px;">Return & Refund Policy</p>
          </div>

          <div style="padding:24px 0;">
            <h2 style="color:#F97316;font-size:16px;margin:0 0 12px;">Return Eligibility</h2>
            <ul style="color:#aaa;font-size:13px;line-height:1.8;padding-left:20px;">
              <li>Returns accepted within <b>7 days</b> of delivery for damaged, defective, or wrong products.</li>
              <li>Product must be unused, in original packaging with all tags and seals intact.</li>
              <li>Prescription medicines cannot be returned once dispensed (Drugs & Cosmetics Act, 1940).</li>
              <li>Temperature-sensitive medicines (insulin, vaccines) are non-returnable.</li>
              <li>Health devices can be returned within 7 days if unopened.</li>
            </ul>
          </div>

          <div style="padding:24px 0;border-top:1px solid #222;">
            <h2 style="color:#F97316;font-size:16px;margin:0 0 12px;">Refund Policy</h2>
            <ul style="color:#aaa;font-size:13px;line-height:1.8;padding-left:20px;">
              <li>Refunds processed within <b>5-7 business days</b> after return inspection.</li>
              <li>Refund credited to original payment method.</li>
              <li>COD refunds via UPI/bank transfer.</li>
              <li>CuraPay wallet refunds are instant.</li>
              <li>Partial refunds for partial returns.</li>
            </ul>
          </div>

          <div style="padding:24px 0;border-top:1px solid #222;">
            <h2 style="color:#F97316;font-size:16px;margin:0 0 12px;">How to Initiate a Return</h2>
            <ol style="color:#aaa;font-size:13px;line-height:1.8;padding-left:20px;">
              <li>Contact support via WhatsApp or call within 7 days.</li>
              <li>Provide Order ID and reason for return.</li>
              <li>Delivery partner picks up the item.</li>
              <li>Inspection completed within 48 hours.</li>
              <li>Email/SMS confirmation once refund is processed.</li>
            </ol>
          </div>

          <div style="padding:24px 0;border-top:1px solid #222;">
            <h2 style="color:#F97316;font-size:16px;margin:0 0 12px;">Non-Returnable Items</h2>
            <ul style="color:#aaa;font-size:13px;line-height:1.8;padding-left:20px;">
              <li>Opened/used medicines and supplements.</li>
              <li>Prescription medicines once dispensed.</li>
              <li>Surgical items, syringes, disposable medical supplies.</li>
              <li>Products with broken seals or tampered packaging.</li>
              <li>Clearance sale items (unless defective).</li>
            </ul>
          </div>

          <div style="padding:20px;background:#111;border-radius:12px;margin-top:16px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="color:#1B7340;font-weight:900;font-size:16px;padding:8px 0;">FSSAI</td>
                <td style="color:#888;font-size:13px;text-align:right;">Lic No: 21525019003800</td>
              </tr>
              <tr>
                <td style="color:#888;font-size:12px;padding:4px 0;">Drug License</td>
                <td style="color:#888;font-size:12px;text-align:right;">MH-PL1-610138, MH-PL1-610139</td>
              </tr>
            </table>
          </div>

          <div style="padding:20px;background:#111;border-radius:12px;margin-top:12px;text-align:center;">
            <p style="color:#F97316;font-size:14px;font-weight:bold;margin:0 0 8px;">Need Help?</p>
            <p style="color:#888;font-size:12px;margin:0;">Call: +91 98765 43210 | Email: support@nevikacura.com</p>
            <p style="color:#555;font-size:10px;margin-top:8px;">Available Mon-Sat, 9 AM - 9 PM IST</p>
          </div>

          <div style="text-align:center;padding:20px 0;border-top:1px solid #222;margin-top:24px;">
            <p style="color:#333;font-size:9px;">Governed by Consumer Protection Act, 2019 & Drugs & Cosmetics Act, 1940</p>
            <p style="color:#333;font-size:9px;">Nevika Cura Health Pvt Ltd | CIN: U85100MH2024PTC123456</p>
          </div>
        </div>
        """
        await send_email_notification(
            subject="Nevika Cura - Return & Refund Policy",
            html_content=html,
            patient_email=email,
            patient_subject="Nevika Cura - Return & Refund Policy",
            patient_html=html
        )
        return {"success": True, "message": f"Return & Refund Policy sent to {email}"}
    except Exception as e:
        logger.error(f"Failed to send policy email: {e}")
        return {"success": False, "error": str(e)}
