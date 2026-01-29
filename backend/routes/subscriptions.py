"""
Nevika Cura - Subscription Management
Glydex & Evara Premium Subscriptions with Coupon Codes
"""

import os
import random
import string
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

# Database reference
db = None
stripe_api_key = None

def set_db(database):
    global db
    db = database

def set_stripe_key(key):
    global stripe_api_key
    stripe_api_key = key

# Subscription Plans
SUBSCRIPTION_PLANS = {
    "glydex": {
        "name": "Glydex Premium",
        "description": "Comprehensive Diabetes Management",
        "price": 3600,
        "currency": "INR",
        "duration_days": 365,
        "features": [
            "Personalized diet plans",
            "Blood sugar tracking & analytics",
            "Doctor consultations",
            "Medicine reminders",
            "Monthly health reports"
        ]
    },
    "evara": {
        "name": "Evara Premium",
        "description": "Complete Women's Health Care",
        "price": 3600,
        "currency": "INR",
        "duration_days": 365,
        "features": [
            "Personalized care plans",
            "Cycle & pregnancy tracking",
            "Expert consultations",
            "Health reminders",
            "Monthly wellness reports"
        ]
    }
}

# Pydantic Models
class CouponValidateRequest(BaseModel):
    coupon_code: str
    plan_type: str  # glydex or evara

class CouponValidateResponse(BaseModel):
    valid: bool
    discount_percent: int = 0
    message: str

class SubscriptionCreateRequest(BaseModel):
    plan_type: str
    patient_id: str
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    coupon_code: Optional[str] = None

class AdminValidityRequest(BaseModel):
    patient_id: str
    plan_type: str
    validity_days: int
    reason: Optional[str] = "Admin granted"

# Generate unique coupon codes
def generate_coupon_code(prefix: str, length: int = 8) -> str:
    """Generate a unique coupon code"""
    chars = string.ascii_uppercase + string.digits
    random_part = ''.join(random.choices(chars, k=length))
    return f"{prefix}-{random_part}"

# API Endpoints
@router.get("/plans")
async def get_subscription_plans():
    """Get available subscription plans"""
    return {
        "success": True,
        "plans": SUBSCRIPTION_PLANS
    }

@router.get("/plans/{plan_type}")
async def get_plan_details(plan_type: str):
    """Get details of a specific plan"""
    if plan_type not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {
        "success": True,
        "plan": SUBSCRIPTION_PLANS[plan_type]
    }

@router.post("/validate-coupon")
async def validate_coupon(request: CouponValidateRequest):
    """Validate a coupon code"""
    coupon = await db.coupons.find_one({
        "code": request.coupon_code.upper(),
        "plan_type": request.plan_type,
        "is_active": True
    })
    
    if not coupon:
        return CouponValidateResponse(
            valid=False,
            discount_percent=0,
            message="Invalid or expired coupon code"
        )
    
    # Check if coupon is already used
    if coupon.get("used_by"):
        return CouponValidateResponse(
            valid=False,
            discount_percent=0,
            message="Coupon code already used"
        )
    
    # Check expiry
    if coupon.get("expires_at"):
        expiry = datetime.fromisoformat(coupon["expires_at"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > expiry:
            return CouponValidateResponse(
                valid=False,
                discount_percent=0,
                message="Coupon code has expired"
            )
    
    return CouponValidateResponse(
        valid=True,
        discount_percent=coupon.get("discount_percent", 100),
        message=f"Coupon valid! {coupon.get('discount_percent', 100)}% discount applied"
    )

@router.post("/create-checkout")
async def create_subscription_checkout(request: SubscriptionCreateRequest):
    """Create Stripe checkout session for subscription"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    
    if request.plan_type not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan type")
    
    plan = SUBSCRIPTION_PLANS[request.plan_type]
    final_price = plan["price"]
    coupon_applied = False
    
    # Check coupon if provided
    if request.coupon_code:
        coupon = await db.coupons.find_one({
            "code": request.coupon_code.upper(),
            "plan_type": request.plan_type,
            "is_active": True,
            "used_by": None
        })
        
        if coupon:
            discount = coupon.get("discount_percent", 100)
            final_price = int(plan["price"] * (100 - discount) / 100)
            coupon_applied = True
            
            # If 100% discount, activate subscription directly
            if final_price == 0:
                subscription = await activate_subscription(
                    patient_id=request.patient_id,
                    patient_name=request.patient_name,
                    patient_phone=request.patient_phone,
                    patient_email=request.patient_email,
                    plan_type=request.plan_type,
                    payment_method="coupon",
                    coupon_code=request.coupon_code
                )
                
                # Mark coupon as used
                await db.coupons.update_one(
                    {"code": request.coupon_code.upper()},
                    {"$set": {
                        "used_by": request.patient_id,
                        "used_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                return {
                    "success": True,
                    "free_subscription": True,
                    "subscription_id": subscription["subscription_id"],
                    "message": "Subscription activated with coupon!"
                }
    
    # Create Stripe checkout for paid subscription
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Payment system not configured")
    
    host_url = os.environ.get("REACT_APP_BACKEND_URL", "https://medportal-nevika.preview.emergentagent.com")
    webhook_url = f"{host_url}/api/webhook/subscription"
    
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    checkout_request = CheckoutSessionRequest(
        line_items=[{
            "price_data": {
                "currency": "inr",
                "product_data": {
                    "name": plan["name"],
                    "description": plan["description"]
                },
                "unit_amount": final_price * 100  # Stripe uses paisa
            },
            "quantity": 1
        }],
        mode="payment",
        success_url=f"{host_url}/{request.plan_type}?subscription=success",
        cancel_url=f"{host_url}/{request.plan_type}?subscription=cancelled",
        metadata={
            "patient_id": request.patient_id,
            "patient_name": request.patient_name,
            "patient_phone": request.patient_phone,
            "plan_type": request.plan_type,
            "coupon_code": request.coupon_code or ""
        }
    )
    
    try:
        session = stripe_checkout.create_checkout_session(checkout_request)
        
        # Store pending subscription
        await db.pending_subscriptions.insert_one({
            "session_id": session.session_id,
            "patient_id": request.patient_id,
            "patient_name": request.patient_name,
            "patient_phone": request.patient_phone,
            "patient_email": request.patient_email,
            "plan_type": request.plan_type,
            "amount": final_price,
            "coupon_code": request.coupon_code,
            "coupon_applied": coupon_applied,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "success": True,
            "checkout_url": session.checkout_url,
            "session_id": session.session_id,
            "amount": final_price
        }
    except Exception as e:
        logger.error(f"Stripe checkout error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def activate_subscription(
    patient_id: str,
    patient_name: str,
    patient_phone: str,
    patient_email: Optional[str],
    plan_type: str,
    payment_method: str,
    coupon_code: Optional[str] = None,
    amount_paid: int = 0,
    stripe_session_id: Optional[str] = None
) -> dict:
    """Activate a subscription for a patient"""
    plan = SUBSCRIPTION_PLANS[plan_type]
    
    subscription_id = f"SUB-{plan_type.upper()[:3]}-{datetime.now().strftime('%Y%m%d%H%M%S')}-{random.randint(1000, 9999)}"
    
    start_date = datetime.now(timezone.utc)
    end_date = start_date + timedelta(days=plan["duration_days"])
    
    subscription = {
        "subscription_id": subscription_id,
        "patient_id": patient_id,
        "patient_name": patient_name,
        "patient_phone": patient_phone,
        "patient_email": patient_email,
        "plan_type": plan_type,
        "plan_name": plan["name"],
        "amount_paid": amount_paid,
        "payment_method": payment_method,
        "coupon_code": coupon_code,
        "stripe_session_id": stripe_session_id,
        "status": "active",
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "features": plan["features"],
        "created_at": start_date.isoformat()
    }
    
    await db.subscriptions.insert_one(subscription)
    
    logger.info(f"Subscription activated: {subscription_id} for {patient_id} ({plan_type})")
    
    return subscription

@router.get("/check/{plan_type}/{patient_id}")
async def check_subscription_status(plan_type: str, patient_id: str):
    """Check if a patient has an active subscription"""
    subscription = await db.subscriptions.find_one({
        "patient_id": patient_id,
        "plan_type": plan_type,
        "status": "active"
    })
    
    if not subscription:
        return {
            "has_subscription": False,
            "message": "No active subscription"
        }
    
    # Check if expired
    end_date = datetime.fromisoformat(subscription["end_date"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > end_date:
        await db.subscriptions.update_one(
            {"subscription_id": subscription["subscription_id"]},
            {"$set": {"status": "expired"}}
        )
        return {
            "has_subscription": False,
            "message": "Subscription expired"
        }
    
    days_remaining = (end_date - datetime.now(timezone.utc)).days
    
    return {
        "has_subscription": True,
        "subscription_id": subscription["subscription_id"],
        "plan_name": subscription["plan_name"],
        "start_date": subscription["start_date"],
        "end_date": subscription["end_date"],
        "days_remaining": days_remaining,
        "features": subscription.get("features", [])
    }

@router.get("/my-subscriptions/{patient_id}")
async def get_patient_subscriptions(patient_id: str):
    """Get all subscriptions for a patient"""
    subscriptions = await db.subscriptions.find(
        {"patient_id": patient_id}
    ).to_list(100)
    
    # Remove MongoDB _id
    for sub in subscriptions:
        sub.pop("_id", None)
    
    return {
        "success": True,
        "subscriptions": subscriptions
    }

# Admin Endpoints
@router.post("/admin/grant-access")
async def admin_grant_subscription(request: AdminValidityRequest):
    """Admin grants free subscription access"""
    if request.plan_type not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan type")
    
    # Check if already has active subscription
    existing = await db.subscriptions.find_one({
        "patient_id": request.patient_id,
        "plan_type": request.plan_type,
        "status": "active"
    })
    
    if existing:
        # Extend existing subscription
        current_end = datetime.fromisoformat(existing["end_date"].replace("Z", "+00:00"))
        new_end = current_end + timedelta(days=request.validity_days)
        
        await db.subscriptions.update_one(
            {"subscription_id": existing["subscription_id"]},
            {"$set": {
                "end_date": new_end.isoformat(),
                "admin_extended": True,
                "extension_reason": request.reason,
                "extended_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "success": True,
            "action": "extended",
            "subscription_id": existing["subscription_id"],
            "new_end_date": new_end.isoformat(),
            "message": f"Subscription extended by {request.validity_days} days"
        }
    
    # Create new free subscription
    subscription = await activate_subscription(
        patient_id=request.patient_id,
        patient_name="Admin Granted",
        patient_phone="",
        patient_email=None,
        plan_type=request.plan_type,
        payment_method="admin_grant",
        amount_paid=0
    )
    
    # Update validity if different from default
    if request.validity_days != SUBSCRIPTION_PLANS[request.plan_type]["duration_days"]:
        new_end = datetime.now(timezone.utc) + timedelta(days=request.validity_days)
        await db.subscriptions.update_one(
            {"subscription_id": subscription["subscription_id"]},
            {"$set": {
                "end_date": new_end.isoformat(),
                "admin_granted": True,
                "grant_reason": request.reason
            }}
        )
    
    return {
        "success": True,
        "action": "created",
        "subscription_id": subscription["subscription_id"],
        "message": f"Subscription granted for {request.validity_days} days"
    }

@router.get("/admin/all-subscriptions")
async def admin_get_all_subscriptions(status: Optional[str] = None):
    """Admin: Get all subscriptions"""
    query = {}
    if status:
        query["status"] = status
    
    subscriptions = await db.subscriptions.find(query).sort("created_at", -1).to_list(500)
    
    for sub in subscriptions:
        sub.pop("_id", None)
    
    return {
        "success": True,
        "count": len(subscriptions),
        "subscriptions": subscriptions
    }

@router.get("/admin/coupons")
async def admin_get_all_coupons(plan_type: Optional[str] = None, used: Optional[bool] = None):
    """Admin: Get all coupon codes"""
    query = {}
    if plan_type:
        query["plan_type"] = plan_type
    if used is not None:
        if used:
            query["used_by"] = {"$ne": None}
        else:
            query["used_by"] = None
    
    coupons = await db.coupons.find(query).to_list(500)
    
    for coupon in coupons:
        coupon.pop("_id", None)
    
    return {
        "success": True,
        "count": len(coupons),
        "coupons": coupons
    }

@router.post("/admin/generate-coupons")
async def admin_generate_coupons(
    plan_type: str,
    count: int = 100,
    discount_percent: int = 100,
    validity_days: int = 365
):
    """Admin: Generate new coupon codes"""
    if plan_type not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan type")
    
    if count > 500:
        raise HTTPException(status_code=400, detail="Maximum 500 coupons at a time")
    
    prefix = "GLY" if plan_type == "glydex" else "EVA"
    expiry_date = datetime.now(timezone.utc) + timedelta(days=validity_days)
    
    coupons = []
    for _ in range(count):
        code = generate_coupon_code(prefix)
        coupon = {
            "code": code,
            "plan_type": plan_type,
            "discount_percent": discount_percent,
            "is_active": True,
            "used_by": None,
            "used_at": None,
            "expires_at": expiry_date.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        coupons.append(coupon)
    
    await db.coupons.insert_many(coupons)
    
    return {
        "success": True,
        "count": count,
        "plan_type": plan_type,
        "discount_percent": discount_percent,
        "expires_at": expiry_date.isoformat(),
        "sample_codes": [c["code"] for c in coupons[:10]]
    }
