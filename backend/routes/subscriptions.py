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

def set_db(database):
    global db
    db = database

# Subscription Plans - Updated pricing
SUBSCRIPTION_PLANS = {
    "glydex": {
        "name": "Glydex Premium",
        "description": "Comprehensive Diabetes Management",
        "price": 3600,
        "currency": "INR",
        "duration_days": 180,  # 6 months free access
        "billing_period": "yearly",  # ₹3600/year
        "features": [
            "Personalized diet plans",
            "Blood sugar tracking & analytics",
            "Doctor consultations",
            "Medicine reminders",
            "Monthly health reports",
            "AI-powered health insights",
            "Priority support"
        ],
        "tiers": {
            "starter": {"price": 499, "duration_days": 30, "name": "Starter (1 Month)"},
            "standard": {"price": 1299, "duration_days": 90, "name": "Standard (3 Months)", "popular": True},
            "premium": {"price": 2199, "duration_days": 180, "name": "Premium (6 Months)", "best_value": True},
            "annual": {"price": 3600, "duration_days": 365, "name": "Annual", "includes_free": 180}
        },
        "free_trial_days": 7,
        "family_plan": {
            "duo": {"price": 5499, "users": 2, "duration_days": 180},
            "family": {"price": 8999, "users": 4, "duration_days": 365}
        }
    },
    "evara": {
        "name": "Evara Premium",
        "description": "Complete Women's Health Care",
        "price": 3600,
        "currency": "INR",
        "duration_days": 270,  # 9 months free access
        "billing_period": "yearly",  # ₹3600/year
        "features": [
            "Personalized care plans",
            "Cycle & pregnancy tracking",
            "Expert consultations",
            "Health reminders",
            "Monthly wellness reports",
            "AI health assistant",
            "Priority support"
        ],
        "tiers": {
            "starter": {"price": 499, "duration_days": 30, "name": "Starter (1 Month)"},
            "standard": {"price": 1299, "duration_days": 90, "name": "Standard (3 Months)", "popular": True},
            "premium": {"price": 2499, "duration_days": 180, "name": "Premium (6 Months)", "best_value": True},
            "annual": {"price": 3600, "duration_days": 365, "name": "Annual", "includes_free": 270}
        },
        "free_trial_days": 7,
        "family_plan": {
            "duo": {"price": 4999, "users": 2, "duration_days": 180},
            "family": {"price": 7999, "users": 4, "duration_days": 365}
        }
    }
}

# ==================== ALL-IN-ONE MEMBERSHIP PLANS ====================
MEMBERSHIP_PLANS = {
    "basic": {
        "name": "Basic Membership",
        "description": "Essential healthcare services",
        "monthly": {"price": 999, "duration_days": 30},
        "quarterly": {"price": 2499, "duration_days": 90, "savings": 498},
        "yearly": {"price": 7999, "duration_days": 365, "savings": 3989},
        "includes": {
            "consultation": {"visits": 2, "desc": "2 GP consultations/month"},
            "pharmacy": {"discount": 10, "desc": "10% off on medicines"},
            "diagnostic": {"discount": 15, "desc": "15% off on tests"},
            "portal": None
        },
        "features": [
            "2 GP consultations per month",
            "10% discount on pharmacy",
            "15% discount on diagnostics",
            "Health records access",
            "Basic teleconsultation"
        ]
    },
    "standard": {
        "name": "Standard Membership",
        "description": "Complete healthcare package",
        "monthly": {"price": 1999, "duration_days": 30},
        "quarterly": {"price": 4999, "duration_days": 90, "savings": 1998, "popular": True},
        "yearly": {"price": 14999, "duration_days": 365, "savings": 8989},
        "includes": {
            "consultation": {"visits": 4, "desc": "4 consultations/month"},
            "pharmacy": {"discount": 15, "desc": "15% off on medicines"},
            "diagnostic": {"discount": 20, "desc": "20% off on tests"},
            "portal": {"portals": ["glydex", "evara"], "desc": "Choose 1 portal"}
        },
        "features": [
            "4 consultations per month (GP + Specialist)",
            "15% discount on pharmacy",
            "20% discount on diagnostics",
            "1 Health portal access (Glydex/Evara)",
            "Priority appointments",
            "24/7 teleconsultation"
        ]
    },
    "premium": {
        "name": "Premium Membership",
        "description": "Comprehensive health & wellness",
        "monthly": {"price": 3499, "duration_days": 30},
        "quarterly": {"price": 8999, "duration_days": 90, "savings": 1498},
        "yearly": {"price": 29999, "duration_days": 365, "savings": 11989, "best_value": True},
        "includes": {
            "consultation": {"visits": "unlimited", "desc": "Unlimited consultations"},
            "pharmacy": {"discount": 20, "desc": "20% off + free delivery"},
            "diagnostic": {"discount": 25, "desc": "25% off on tests"},
            "portal": {"portals": ["glydex", "evara", "corvia", "thrive360"], "desc": "All portals"}
        },
        "features": [
            "Unlimited consultations",
            "20% discount on pharmacy + FREE delivery",
            "25% discount on diagnostics",
            "All health portals access",
            "1 Executive health checkup/year",
            "Personal health manager",
            "Home visits (2/year)",
            "Insurance assistance"
        ]
    }
}

# ==================== FAMILY PLANS ====================
FAMILY_PLANS = {
    "diagnostic_only": {
        "name": "Family Diagnostic Plan",
        "description": "Lab tests for the whole family",
        "members": 4,
        "monthly": {"price": 1499, "duration_days": 30},
        "quarterly": {"price": 3999, "duration_days": 90, "savings": 498},
        "yearly": {"price": 12999, "duration_days": 365, "savings": 4989},
        "includes": {
            "diagnostic_discount": 25,
            "free_tests_per_month": 2,
            "home_collection": True
        },
        "features": [
            "25% off on all lab tests",
            "2 free basic tests/member/month",
            "Free home sample collection",
            "Family health dashboard",
            "Shared reports access"
        ]
    },
    "diagnostic_pharmacy": {
        "name": "Family Diagnostic + Pharmacy",
        "description": "Tests & medicines for family",
        "members": 4,
        "monthly": {"price": 2499, "duration_days": 30},
        "quarterly": {"price": 6499, "duration_days": 90, "savings": 998, "popular": True},
        "yearly": {"price": 21999, "duration_days": 365, "savings": 7989},
        "includes": {
            "diagnostic_discount": 25,
            "pharmacy_discount": 15,
            "free_tests_per_month": 2,
            "free_delivery": True
        },
        "features": [
            "25% off on all lab tests",
            "15% off on pharmacy",
            "2 free basic tests/member/month",
            "Free medicine delivery",
            "Refill reminders for family",
            "Family health dashboard"
        ]
    },
    "complete_family": {
        "name": "Complete Family Care",
        "description": "Full healthcare for family",
        "members": 4,
        "monthly": {"price": 4999, "duration_days": 30},
        "quarterly": {"price": 12999, "duration_days": 90, "savings": 1998},
        "yearly": {"price": 44999, "duration_days": 365, "savings": 14989, "best_value": True},
        "includes": {
            "consultation_visits": 8,
            "diagnostic_discount": 30,
            "pharmacy_discount": 20,
            "free_tests_per_month": 4,
            "home_visits": 2
        },
        "features": [
            "8 family consultations/month",
            "30% off on all lab tests",
            "20% off on pharmacy + FREE delivery",
            "4 free tests/month (shared)",
            "2 home doctor visits/year",
            "All family members on same plan",
            "Priority appointments",
            "24/7 family health helpline"
        ]
    },
    "portal_family": {
        "name": "Family Portal Access",
        "description": "Health portals for entire family",
        "members": 4,
        "portals": ["glydex", "evara", "corvia", "thrive360"],
        "monthly": {"price": 1999, "duration_days": 30},
        "quarterly": {"price": 4999, "duration_days": 90, "savings": 998},
        "yearly": {"price": 16999, "duration_days": 365, "savings": 6989},
        "features": [
            "All 4 health portals access",
            "Personalized plans for each member",
            "Family health tracking",
            "Shared progress reports",
            "Family wellness challenges"
        ]
    }
}

# Pydantic Models
class CouponValidateRequest(BaseModel):
    coupon_code: str
    plan_type: str  # glydex or evara
    email: Optional[str] = None  # For security binding check
    device_id: Optional[str] = None  # For security binding check

class CouponValidateResponse(BaseModel):
    valid: bool
    discount_percent: int = 0
    message: str
    duration_days: Optional[int] = None

class SubscriptionCreateRequest(BaseModel):
    plan_type: str
    patient_id: str
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    coupon_code: Optional[str] = None
    device_id: Optional[str] = None  # For security binding

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
    """Validate a coupon code with device and email binding security"""
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
    
    # SECURITY: Check device and email binding
    # If coupon was previously attempted (bound to device/email), verify it matches
    bound_email = coupon.get("bound_email")
    bound_device = coupon.get("bound_device_id")
    
    if bound_email or bound_device:
        # Coupon is already bound, verify caller matches
        if bound_email and request.email and bound_email.lower() != request.email.lower():
            return CouponValidateResponse(
                valid=False,
                discount_percent=0,
                message="This coupon is registered to a different email"
            )
        if bound_device and request.device_id and bound_device != request.device_id:
            return CouponValidateResponse(
                valid=False,
                discount_percent=0,
                message="This coupon is registered to a different device"
            )
    else:
        # First time validation - bind to email and device
        if request.email or request.device_id:
            update_fields = {}
            if request.email:
                update_fields["bound_email"] = request.email.lower()
            if request.device_id:
                update_fields["bound_device_id"] = request.device_id
            update_fields["bound_at"] = datetime.now(timezone.utc).isoformat()
            
            await db.coupons.update_one(
                {"code": request.coupon_code.upper()},
                {"$set": update_fields}
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
        message=f"Coupon valid! {coupon.get('discount_percent', 100)}% discount applied",
        duration_days=coupon.get("duration_days", 180)
    )

class RedeemCouponRequest(BaseModel):
    coupon_code: str
    plan_type: str
    patient_id: str
    patient_name: str
    patient_email: str
    patient_phone: Optional[str] = ""
    device_id: Optional[str] = None

@router.post("/redeem-coupon")
async def redeem_coupon(request: RedeemCouponRequest):
    """Redeem a 100% discount coupon to activate free subscription"""
    coupon = await db.coupons.find_one({
        "code": request.coupon_code.upper(),
        "plan_type": request.plan_type,
        "is_active": True
    })
    
    if not coupon:
        return {"success": False, "message": "Invalid or expired coupon code"}
    
    if coupon.get("used_by"):
        return {"success": False, "message": "Coupon already used"}
    
    if coupon.get("expires_at"):
        expiry = datetime.fromisoformat(coupon["expires_at"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > expiry:
            return {"success": False, "message": "Coupon has expired"}
    
    discount = coupon.get("discount_percent", 100)
    if discount < 100:
        return {"success": False, "message": "This coupon requires payment. Use checkout instead."}
    
    duration = coupon.get("duration_days", 180)
    
    # Activate subscription
    subscription = await activate_subscription(
        patient_id=request.patient_id,
        patient_name=request.patient_name,
        patient_phone=request.patient_phone,
        patient_email=request.patient_email,
        plan_type=request.plan_type,
        payment_method="coupon_redeem",
        coupon_code=request.coupon_code.upper(),
        amount_paid=0
    )
    
    # Mark coupon as used
    await db.coupons.update_one(
        {"code": request.coupon_code.upper()},
        {"$set": {
            "used_by": request.patient_id,
            "used_at": datetime.now(timezone.utc).isoformat(),
            "used_email": request.patient_email,
            "used_device": request.device_id,
            "is_active": False
        }}
    )
    
    logger.info(f"Coupon redeemed: {request.coupon_code} by {request.patient_id} for {request.plan_type}")
    
    return {
        "success": True,
        "subscription_id": subscription["subscription_id"],
        "plan_name": subscription["plan_name"],
        "duration_days": duration,
        "message": f"Subscription activated! Enjoy {duration // 30} months free access."
    }

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
    
    host_url = os.environ.get("REACT_APP_BACKEND_URL", "https://premium-rx-portal.preview.emergentagent.com")
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

@router.post("/admin/generate-and-email-coupons")
async def generate_and_email_coupons(
    email_to: str = "nevikacura@gmail.com",
    count: int = 100,
    validity_days: int = 365
):
    """Generate 100 coupons each for Glydex & Evara (6 months free) and email them"""
    from services.notification_service import send_email_notification
    
    all_codes = {"glydex": [], "evara": []}
    expiry_date = datetime.now(timezone.utc) + timedelta(days=validity_days)
    
    for plan_type in ["glydex", "evara"]:
        prefix = "GLY" if plan_type == "glydex" else "EVA"
        coupons = []
        for _ in range(count):
            code = generate_coupon_code(prefix)
            coupon = {
                "code": code,
                "plan_type": plan_type,
                "discount_percent": 100,
                "duration_days": 180,
                "is_active": True,
                "used_by": None,
                "used_at": None,
                "coupon_type": "6_month_free",
                "expires_at": expiry_date.isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            coupons.append(coupon)
            all_codes[plan_type].append(code)
        
        await db.coupons.insert_many(coupons)
    
    # Build HTML email
    glydex_codes_html = "".join([f"<tr><td style='padding:4px 12px;border:1px solid #e5e7eb;font-family:monospace;font-size:14px;'>{c}</td></tr>" for c in all_codes["glydex"]])
    evara_codes_html = "".join([f"<tr><td style='padding:4px 12px;border:1px solid #e5e7eb;font-family:monospace;font-size:14px;'>{c}</td></tr>" for c in all_codes["evara"]])
    
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:20px;">
      <h1 style="color:#0d9488;">Nevika Cura - Subscription Coupon Codes</h1>
      <p>Generated {count} unique coupon codes for each portal. Each code grants <strong>6 months free premium access</strong>.</p>
      <p>Expiry: <strong>{expiry_date.strftime('%d %b %Y')}</strong></p>
      
      <h2 style="color:#3b82f6;margin-top:30px;">Glydex (Diabetes Management) - {count} Codes</h2>
      <table style="border-collapse:collapse;width:100%;margin-bottom:30px;">{glydex_codes_html}</table>
      
      <h2 style="color:#ec4899;margin-top:30px;">Evara (Women's Health) - {count} Codes</h2>
      <table style="border-collapse:collapse;width:100%;margin-bottom:30px;">{evara_codes_html}</table>
      
      <hr style="border:1px solid #e5e7eb;margin:30px 0;">
      <p style="color:#6b7280;font-size:12px;">This email was auto-generated by Nevika Cura. Each code is single-use and device/email-bound on first validation.</p>
    </div>
    """
    
    try:
        await send_email_notification(
            subject=f"Nevika Cura - {count * 2} Subscription Coupon Codes (Glydex + Evara)",
            html_content=html,
            patient_email=email_to
        )
        logger.info(f"Coupon codes emailed to {email_to}: {count} glydex + {count} evara")
    except Exception as e:
        logger.error(f"Failed to email coupons: {e}")
        return {
            "success": True,
            "email_sent": False,
            "error": str(e),
            "glydex_count": count,
            "evara_count": count,
            "glydex_sample": all_codes["glydex"][:5],
            "evara_sample": all_codes["evara"][:5]
        }
    
    return {
        "success": True,
        "email_sent": True,
        "email_to": email_to,
        "glydex_count": count,
        "evara_count": count,
        "glydex_sample": all_codes["glydex"][:5],
        "evara_sample": all_codes["evara"][:5],
        "expires_at": expiry_date.isoformat()
    }

# ==================== FREE TRIAL ====================

class FreeTrialRequest(BaseModel):
    patient_id: str
    patient_name: str
    patient_email: str
    plan_type: str
    device_id: Optional[str] = None

@router.post("/free-trial/start")
async def start_free_trial(request: FreeTrialRequest):
    """Start a 7-day free trial for a plan"""
    plan = SUBSCRIPTION_PLANS.get(request.plan_type)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan type")
    
    # Check if user already had a trial
    existing_trial = await db.free_trials.find_one({
        "patient_id": request.patient_id,
        "plan_type": request.plan_type
    })
    
    if existing_trial:
        return {
            "success": False,
            "message": "You have already used your free trial for this plan",
            "trial_used_on": existing_trial.get("started_at")
        }
    
    # Create trial
    trial_days = plan.get("free_trial_days", 7)
    start_date = datetime.now(timezone.utc)
    end_date = start_date + timedelta(days=trial_days)
    
    trial = {
        "trial_id": f"TRIAL-{request.plan_type.upper()[:3]}-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "patient_id": request.patient_id,
        "patient_name": request.patient_name,
        "patient_email": request.patient_email,
        "plan_type": request.plan_type,
        "device_id": request.device_id,
        "started_at": start_date.isoformat(),
        "ends_at": end_date.isoformat(),
        "status": "active",
        "converted_to_paid": False
    }
    
    await db.free_trials.insert_one(trial)
    
    # Also create a temporary subscription
    temp_subscription = {
        "subscription_id": f"SUB-TRIAL-{request.plan_type.upper()[:3]}-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "patient_id": request.patient_id,
        "patient_name": request.patient_name,
        "patient_email": request.patient_email,
        "plan_type": request.plan_type,
        "plan_name": f"{plan['name']} (Trial)",
        "amount_paid": 0,
        "payment_method": "free_trial",
        "status": "trial",
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "is_trial": True,
        "features": plan["features"],
        "created_at": start_date.isoformat()
    }
    
    await db.subscriptions.insert_one(temp_subscription)
    
    # Award points for starting trial
    await award_points(request.patient_id, 50, "Started free trial", "trial_start")
    
    return {
        "success": True,
        "message": f"Your {trial_days}-day free trial has started!",
        "trial": {
            "trial_id": trial["trial_id"],
            "ends_at": end_date.isoformat(),
            "days_remaining": trial_days
        }
    }

@router.get("/free-trial/status/{plan_type}/{patient_id}")
async def check_trial_status(plan_type: str, patient_id: str):
    """Check if user has used or has active trial"""
    trial = await db.free_trials.find_one({
        "patient_id": patient_id,
        "plan_type": plan_type
    })
    
    if not trial:
        return {
            "has_trial": False,
            "can_start_trial": True,
            "message": "Free trial available"
        }
    
    end_date = datetime.fromisoformat(trial["ends_at"].replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)
    
    if now < end_date and trial["status"] == "active":
        days_remaining = (end_date - now).days
        return {
            "has_trial": True,
            "is_active": True,
            "can_start_trial": False,
            "days_remaining": days_remaining,
            "ends_at": trial["ends_at"]
        }
    
    return {
        "has_trial": True,
        "is_active": False,
        "can_start_trial": False,
        "message": "Trial already used",
        "used_on": trial["started_at"]
    }

# ==================== REFERRAL PROGRAM ====================

@router.post("/referral/generate")
async def generate_referral_code(patient_id: str, patient_name: str):
    """Generate a unique referral code for a user"""
    # Check if user already has a referral code
    existing = await db.referral_codes.find_one({"patient_id": patient_id})
    
    if existing:
        return {
            "success": True,
            "referral_code": existing["code"],
            "referral_link": f"https://nevikacura.com/join?ref={existing['code']}",
            "stats": {
                "total_referrals": existing.get("total_referrals", 0),
                "successful_referrals": existing.get("successful_referrals", 0),
                "rewards_earned": existing.get("rewards_earned", 0)
            }
        }
    
    # Generate new code
    code = f"REF-{patient_name[:3].upper()}-{random.randint(1000, 9999)}"
    
    referral = {
        "code": code,
        "patient_id": patient_id,
        "patient_name": patient_name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "total_referrals": 0,
        "successful_referrals": 0,
        "rewards_earned": 0,
        "is_active": True
    }
    
    await db.referral_codes.insert_one(referral)
    
    return {
        "success": True,
        "referral_code": code,
        "referral_link": f"https://nevikacura.com/join?ref={code}",
        "rewards": {
            "referrer_gets": "1 month FREE subscription",
            "referee_gets": "20% off first subscription"
        }
    }

@router.post("/referral/apply")
async def apply_referral_code(referral_code: str, new_patient_id: str, new_patient_name: str):
    """Apply a referral code for a new user"""
    referral = await db.referral_codes.find_one({
        "code": referral_code.upper(),
        "is_active": True
    })
    
    if not referral:
        return {"success": False, "message": "Invalid referral code"}
    
    # Check if already used by this patient
    existing_use = await db.referral_uses.find_one({
        "referral_code": referral_code.upper(),
        "used_by_patient_id": new_patient_id
    })
    
    if existing_use:
        return {"success": False, "message": "You have already used a referral code"}
    
    # Record the referral use
    use_record = {
        "referral_code": referral_code.upper(),
        "referrer_id": referral["patient_id"],
        "used_by_patient_id": new_patient_id,
        "used_by_name": new_patient_name,
        "used_at": datetime.now(timezone.utc).isoformat(),
        "reward_given": False,
        "discount_percent": 20
    }
    
    await db.referral_uses.insert_one(use_record)
    
    # Update referral stats
    await db.referral_codes.update_one(
        {"code": referral_code.upper()},
        {"$inc": {"total_referrals": 1}}
    )
    
    return {
        "success": True,
        "message": "Referral code applied! You get 20% off your first subscription",
        "discount_percent": 20
    }

@router.post("/referral/reward")
async def process_referral_reward(referral_code: str, new_patient_id: str):
    """Process reward when referred user makes first purchase"""
    use_record = await db.referral_uses.find_one({
        "referral_code": referral_code.upper(),
        "used_by_patient_id": new_patient_id,
        "reward_given": False
    })
    
    if not use_record:
        return {"success": False, "message": "No pending referral reward"}
    
    referral = await db.referral_codes.find_one({"code": referral_code.upper()})
    
    if not referral:
        return {"success": False, "message": "Referral code not found"}
    
    # Give referrer 30 days free subscription extension
    referrer_id = referral["patient_id"]
    
    # Find referrer's active subscription and extend it
    active_sub = await db.subscriptions.find_one({
        "patient_id": referrer_id,
        "status": "active"
    })
    
    reward_days = 30
    
    if active_sub:
        current_end = datetime.fromisoformat(active_sub["end_date"].replace("Z", "+00:00"))
        new_end = current_end + timedelta(days=reward_days)
        
        await db.subscriptions.update_one(
            {"subscription_id": active_sub["subscription_id"]},
            {"$set": {"end_date": new_end.isoformat()}}
        )
    
    # Update referral stats
    await db.referral_codes.update_one(
        {"code": referral_code.upper()},
        {
            "$inc": {
                "successful_referrals": 1,
                "rewards_earned": reward_days
            }
        }
    )
    
    # Mark reward as given
    await db.referral_uses.update_one(
        {"_id": use_record["_id"]},
        {"$set": {"reward_given": True, "rewarded_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Award points to both
    await award_points(referrer_id, 500, "Referral converted", "referral_success")
    await award_points(new_patient_id, 100, "Joined via referral", "referral_join")
    
    return {
        "success": True,
        "message": f"Referrer rewarded with {reward_days} days free!",
        "referrer_id": referrer_id,
        "reward_days": reward_days
    }

@router.get("/referral/stats/{patient_id}")
async def get_referral_stats(patient_id: str):
    """Get referral statistics for a user"""
    referral = await db.referral_codes.find_one({"patient_id": patient_id})
    
    if not referral:
        return {
            "has_referral_code": False,
            "message": "Generate your referral code to start earning rewards!"
        }
    
    referral.pop("_id", None)
    
    # Get list of successful referrals
    successful = await db.referral_uses.find({
        "referral_code": referral["code"],
        "reward_given": True
    }).to_list(50)
    
    return {
        "has_referral_code": True,
        "code": referral["code"],
        "link": f"https://nevikacura.com/join?ref={referral['code']}",
        "stats": {
            "total_shared": referral.get("total_referrals", 0),
            "successful_conversions": referral.get("successful_referrals", 0),
            "total_days_earned": referral.get("rewards_earned", 0)
        },
        "recent_referrals": [{"name": r.get("used_by_name", "User"), "date": r.get("used_at")} for r in successful[:5]]
    }

# ==================== GAMIFICATION & POINTS ====================

async def award_points(patient_id: str, points: int, reason: str, action_type: str):
    """Award points to a patient"""
    point_record = {
        "patient_id": patient_id,
        "points": points,
        "reason": reason,
        "action_type": action_type,
        "awarded_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.patient_points.insert_one(point_record)
    
    # Update total points
    await db.patients.update_one(
        {"id": patient_id},
        {"$inc": {"total_points": points}}
    )
    
    return point_record

@router.get("/points/{patient_id}")
async def get_patient_points(patient_id: str):
    """Get patient's points and history"""
    # Get total points
    patient = await db.patients.find_one({"id": patient_id})
    total_points = patient.get("total_points", 0) if patient else 0
    
    # Get point history
    history = await db.patient_points.find(
        {"patient_id": patient_id}
    ).sort("awarded_at", -1).to_list(50)
    
    for h in history:
        h.pop("_id", None)
    
    # Calculate level
    level = "Bronze"
    if total_points >= 5000:
        level = "Platinum"
    elif total_points >= 2000:
        level = "Gold"
    elif total_points >= 500:
        level = "Silver"
    
    return {
        "total_points": total_points,
        "level": level,
        "next_level_points": {"Bronze": 500, "Silver": 2000, "Gold": 5000, "Platinum": 10000}.get(level, 10000),
        "history": history[:20],
        "redemption_value": f"₹{total_points // 10} discount available"
    }

@router.post("/points/award")
async def award_points_endpoint(patient_id: str, points: int, reason: str, action_type: str = "manual"):
    """Award points to a patient (admin/system use)"""
    result = await award_points(patient_id, points, reason, action_type)
    return {"success": True, "awarded": points, "reason": reason}

@router.post("/points/redeem")
async def redeem_points(patient_id: str, points_to_redeem: int):
    """Redeem points for discount"""
    patient = await db.patients.find_one({"id": patient_id})
    total_points = patient.get("total_points", 0) if patient else 0
    
    if points_to_redeem > total_points:
        return {"success": False, "message": "Insufficient points"}
    
    if points_to_redeem < 100:
        return {"success": False, "message": "Minimum 100 points required for redemption"}
    
    # Calculate discount (10 points = ₹1)
    discount_amount = points_to_redeem // 10
    
    # Deduct points
    await db.patients.update_one(
        {"id": patient_id},
        {"$inc": {"total_points": -points_to_redeem}}
    )
    
    # Record redemption
    redemption = {
        "patient_id": patient_id,
        "points_redeemed": points_to_redeem,
        "discount_amount": discount_amount,
        "redeemed_at": datetime.now(timezone.utc).isoformat(),
        "status": "active",
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    }
    
    result = await db.point_redemptions.insert_one(redemption)
    
    return {
        "success": True,
        "discount_code": f"PTS-{str(result.inserted_id)[-8:].upper()}",
        "discount_amount": discount_amount,
        "points_used": points_to_redeem,
        "remaining_points": total_points - points_to_redeem,
        "valid_until": redemption["expires_at"]
    }

# ==================== STREAKS ====================

@router.post("/streaks/log")
async def log_streak_activity(patient_id: str, activity_type: str):
    """Log activity for streak tracking"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Check if already logged today
    existing = await db.streak_logs.find_one({
        "patient_id": patient_id,
        "activity_type": activity_type,
        "date": today
    })
    
    if existing:
        return {"success": True, "message": "Already logged today", "streak_maintained": True}
    
    # Log the activity
    await db.streak_logs.insert_one({
        "patient_id": patient_id,
        "activity_type": activity_type,
        "date": today,
        "logged_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Calculate streak
    streak_count = 1
    check_date = datetime.now(timezone.utc) - timedelta(days=1)
    
    for _ in range(365):  # Max 365 days
        prev_log = await db.streak_logs.find_one({
            "patient_id": patient_id,
            "activity_type": activity_type,
            "date": check_date.strftime("%Y-%m-%d")
        })
        
        if prev_log:
            streak_count += 1
            check_date -= timedelta(days=1)
        else:
            break
    
    # Award bonus points for streaks
    bonus_points = 0
    if streak_count == 7:
        bonus_points = 100
        await award_points(patient_id, bonus_points, "7-day streak!", "streak_7")
    elif streak_count == 30:
        bonus_points = 500
        await award_points(patient_id, bonus_points, "30-day streak!", "streak_30")
    elif streak_count == 100:
        bonus_points = 2000
        await award_points(patient_id, bonus_points, "100-day streak!", "streak_100")
    elif streak_count % 7 == 0:
        bonus_points = 50
        await award_points(patient_id, bonus_points, f"{streak_count}-day streak!", f"streak_{streak_count}")
    
    # Update patient's streak record
    await db.patients.update_one(
        {"id": patient_id},
        {
            "$set": {
                f"streaks.{activity_type}": streak_count,
                f"streaks.{activity_type}_last_date": today
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "streak_count": streak_count,
        "bonus_points": bonus_points,
        "message": f"🔥 {streak_count} day streak!" if streak_count > 1 else "Streak started!"
    }


# ==================== HELPER FUNCTIONS FOR STREAKS ====================

async def get_patient_badges(patient_id: str):
    """Get patient's earned badges"""
    badges = await db.patient_badges.find({"patient_id": patient_id}).to_list(50)
    return [{"name": b["badge_name"], "earned_at": b["earned_at"]} for b in badges]

def get_next_streak_milestone(current_streak: int):
    """Get the next streak milestone"""
    milestones = [7, 14, 30, 60, 100, 200, 365]
    for m in milestones:
        if current_streak < m:
            return {"days": m, "days_remaining": m - current_streak}
    return {"days": 365, "days_remaining": 0, "message": "Maximum streak achieved!"}

@router.get("/streaks/{patient_id}")
async def get_streaks(patient_id: str):
    """Get patient's streak information"""
    patient = await db.patients.find_one({"id": patient_id})
    streaks = patient.get("streaks", {}) if patient else {}
    
    return {
        "streaks": {
            "health_logging": streaks.get("health_logging", 0),
            "medication": streaks.get("medication", 0),
            "exercise": streaks.get("exercise", 0),
            "app_checkin": streaks.get("app_checkin", 0)
        },
        "badges": await get_patient_badges(patient_id),
        "next_milestone": get_next_streak_milestone(max(streaks.values()) if streaks else 0)
    }


# ==================== GUEST CHECKOUT (NO LOGIN REQUIRED) ====================

class GuestCheckoutRequest(BaseModel):
    plan_type: str
    tier: str
    email: str
    device_id: Optional[str] = None
    coupon_code: Optional[str] = None
    referral_code: Optional[str] = None
    temp_patient_id: Optional[str] = None

@router.post("/checkout/guest")
async def create_guest_checkout(request: GuestCheckoutRequest):
    """Create checkout for guest user - NO LOGIN REQUIRED"""
    import stripe
    
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Payment not configured")
    
    stripe.api_key = stripe_api_key
    
    plan = SUBSCRIPTION_PLANS.get(request.plan_type)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan type")
    
    tiers = plan.get("tiers", {})
    tier_info = tiers.get(request.tier)
    
    if not tier_info:
        raise HTTPException(status_code=400, detail="Invalid tier")
    
    price = tier_info["price"]
    duration_days = tier_info["duration_days"]
    
    # Generate temp patient ID if not provided
    temp_id = request.temp_patient_id or f"guest_{datetime.now().strftime('%Y%m%d%H%M%S')}_{random.randint(1000, 9999)}"
    
    # Apply referral discount
    if request.referral_code:
        referral_use = await db.referral_uses.find_one({
            "referral_code": request.referral_code.upper(),
            "used_by_email": request.email.lower()
        })
        if referral_use:
            discount_percent = referral_use.get("discount_percent", 20)
            price = int(price * (100 - discount_percent) / 100)
    
    # Apply coupon
    if request.coupon_code:
        coupon = await db.coupons.find_one({
            "code": request.coupon_code.upper(),
            "is_active": True
        })
        if coupon and not coupon.get("used_by"):
            discount = coupon.get("discount_percent", 0)
            price = int(price * (100 - discount) / 100)
            
            # If 100% discount, activate subscription immediately
            if discount >= 100:
                # Mark coupon as used
                await db.coupons.update_one(
                    {"code": request.coupon_code.upper()},
                    {"$set": {
                        "used_by": request.email,
                        "used_by_email": request.email.lower(),
                        "used_by_device_id": request.device_id,
                        "used_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                # Create pending membership
                pending = {
                    "temp_id": temp_id,
                    "email": request.email.lower(),
                    "plan_type": request.plan_type,
                    "tier": request.tier,
                    "duration_days": duration_days,
                    "payment_status": "completed",
                    "payment_method": "coupon",
                    "coupon_code": request.coupon_code.upper(),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "membership_completed": False
                }
                await db.pending_memberships.insert_one(pending)
                
                return {
                    "free_subscription": True,
                    "temp_id": temp_id,
                    "message": "Coupon applied! Complete your membership details."
                }
    
    if price == 0:
        return {
            "free_subscription": True,
            "temp_id": temp_id,
            "message": "Free subscription activated!"
        }
    
    # Create Stripe checkout for guest
    frontend_url = os.environ.get('FRONTEND_URL', os.environ.get('REACT_APP_BACKEND_URL', 'https://nevikacura.com'))
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            customer_email=request.email,
            line_items=[{
                'price_data': {
                    'currency': 'inr',
                    'product_data': {
                        'name': f"{plan['name']} - {tier_info['name']}",
                        'description': f"{duration_days} days premium access"
                    },
                    'unit_amount': price * 100
                },
                'quantity': 1
            }],
            mode='payment',
            success_url=f"{frontend_url}/{request.plan_type}?success=true&membership=pending&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_url}/{request.plan_type}?canceled=true",
            metadata={
                'temp_patient_id': temp_id,
                'email': request.email,
                'plan_type': request.plan_type,
                'tier': request.tier,
                'duration_days': str(duration_days),
                'coupon_code': request.coupon_code or '',
                'referral_code': request.referral_code or '',
                'is_guest': 'true'
            }
        )
        
        # Store pending membership
        pending = {
            "temp_id": temp_id,
            "email": request.email.lower(),
            "plan_type": request.plan_type,
            "tier": request.tier,
            "duration_days": duration_days,
            "stripe_session_id": session.id,
            "payment_status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "membership_completed": False
        }
        await db.pending_memberships.insert_one(pending)
        
        return {
            "checkout_url": session.url,
            "session_id": session.id,
            "amount": price,
            "tier": tier_info["name"],
            "duration_days": duration_days
        }
    except Exception as e:
        logger.error(f"Stripe guest checkout error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class CompleteMembershipRequest(BaseModel):
    email: str
    plan_type: str
    name: str
    phone: str
    age: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None


# ==================== MEMBERSHIP PLAN ENDPOINTS ====================

@router.get("/membership-plans")
async def get_membership_plans():
    """Get all membership plans"""
    return {
        "plans": MEMBERSHIP_PLANS,
        "family_plans": FAMILY_PLANS
    }

@router.get("/membership-plans/{plan_id}")
async def get_membership_plan_details(plan_id: str):
    """Get specific membership plan details"""
    plan = MEMBERSHIP_PLANS.get(plan_id)
    if not plan:
        plan = FAMILY_PLANS.get(plan_id)
    
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    return {"plan": plan}

class MembershipPurchaseRequest(BaseModel):
    plan_type: str  # basic, standard, premium, diagnostic_only, etc.
    billing_cycle: str  # monthly, quarterly, yearly
    email: str
    family_members: Optional[List[dict]] = None  # For family plans [{name, relation, phone, email}]
    coupon_code: Optional[str] = None

@router.post("/membership/purchase")
async def purchase_membership(request: MembershipPurchaseRequest):
    """
    DEPRECATED: Use /api/payments/cashfree/create-order instead
    This endpoint now redirects to Cashfree payment gateway
    """
    # Get plan
    plan = MEMBERSHIP_PLANS.get(request.plan_type)
    is_family = False
    
    if not plan:
        plan = FAMILY_PLANS.get(request.plan_type)
        is_family = True
    
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan type")
    
    billing = plan.get(request.billing_cycle)
    if not billing:
        raise HTTPException(status_code=400, detail="Invalid billing cycle")
    
    price = billing["price"]
    duration_days = billing["duration_days"]
    
    # Apply coupon
    if request.coupon_code:
        coupon = await db.coupons.find_one({
            "code": request.coupon_code.upper(),
            "is_active": True,
            "used_by": None
        })
        if coupon:
            discount = coupon.get("discount_percent", 0)
            price = int(price * (100 - discount) / 100)
        elif request.coupon_code:
            raise HTTPException(status_code=400, detail="Invalid or already used coupon code")
    
    if price == 0:
        # Mark coupon as used
        if request.coupon_code:
            await db.coupons.update_one(
                {"code": request.coupon_code.upper()},
                {"$set": {"is_active": False, "used_by": request.email.lower(), "used_at": datetime.now(timezone.utc).isoformat()}}
            )
        # Free membership with 100% coupon
        membership = {
            "id": f"MEM-{datetime.now().strftime('%Y%m%d%H%M%S')}-{random.randint(1000, 9999)}",
            "email": request.email.lower(),
            "plan_type": request.plan_type,
            "plan_name": plan["name"],
            "billing_cycle": request.billing_cycle,
            "is_family": is_family,
            "family_members": request.family_members or [],
            "amount_paid": 0,
            "payment_method": "coupon",
            "coupon_code": request.coupon_code,
            "status": "pending_details",
            "start_date": datetime.now(timezone.utc).isoformat(),
            "end_date": (datetime.now(timezone.utc) + timedelta(days=duration_days)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.memberships.insert_one(membership)
        
        return {
            "success": True,
            "free_membership": True,
            "membership_id": membership["id"],
            "message": "Membership activated! Please complete your profile."
        }
    
    # Create Cashfree order for paid membership
    try:
        from routes.cashfree import init_cashfree, API_VERSION
        from cashfree_pg.models.create_order_request import CreateOrderRequest as CFOrderRequest
        from cashfree_pg.models.customer_details import CustomerDetails
        from cashfree_pg.models.order_meta import OrderMeta
        import random as _rand

        timestamp = int(datetime.now(timezone.utc).timestamp())
        order_id = f"NC_MEMBERSHIP_{timestamp}_{_rand.randint(1000,9999)}"
        frontend_url = os.environ.get("FRONTEND_URL", os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")[0])
        return_url = f"{frontend_url}/one?order_id={order_id}"

        cashfree = init_cashfree()
        customer_details = CustomerDetails(
            customer_id=f"MEM_{request.email.split('@')[0]}_{timestamp}",
            customer_phone="9999999999",
            customer_email=request.email,
            customer_name=request.email.split('@')[0]
        )
        order_meta = OrderMeta(return_url=return_url)
        create_req = CFOrderRequest(
            order_id=order_id,
            order_amount=float(price),
            order_currency="INR",
            customer_details=customer_details,
            order_meta=order_meta
        )
        response = cashfree.PGCreateOrder(API_VERSION, create_req, None, None)

        if response and response.data:
            await db.cashfree_orders.insert_one({
                "order_id": order_id,
                "cf_order_id": response.data.cf_order_id,
                "payment_session_id": response.data.payment_session_id,
                "customer_email": request.email,
                "customer_phone": "9999999999",
                "customer_name": request.email.split('@')[0],
                "amount": price,
                "currency": "INR",
                "product_type": "membership",
                "product_id": request.plan_type,
                "membership_plan": request.plan_type,
                "billing_cycle": request.billing_cycle,
                "plan_name": plan["name"],
                "duration_days": duration_days,
                "order_status": "ACTIVE",
                "payment_status": "PENDING",
                "payment_gateway": "cashfree",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            return {
                "success": True,
                "redirect_to_cashfree": True,
                "payment_session_id": response.data.payment_session_id,
                "order_id": order_id,
                "plan_name": plan["name"],
                "amount": price,
                "billing_cycle": request.billing_cycle,
            }
        raise HTTPException(status_code=500, detail="Failed to create payment order")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cashfree membership order error: {e}")
        raise HTTPException(status_code=500, detail=f"Payment processing error: {str(e)}")

class CompleteMembershipDetailsRequest(BaseModel):
    email: str
    name: str
    phone: str
    age: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    family_members: Optional[List[dict]] = None

@router.post("/membership/complete-details")
async def complete_membership_details(request: CompleteMembershipDetailsRequest):
    """Complete membership details after payment"""
    # Find pending membership
    membership = await db.memberships.find_one({
        "email": request.email.lower(),
        "status": "pending_details"
    })
    
    if not membership:
        return {"success": False, "message": "No pending membership found"}
    
    # Update with details
    update_data = {
        "member_name": request.name,
        "member_phone": request.phone,
        "member_age": request.age,
        "member_gender": request.gender,
        "member_address": request.address,
        "status": "active",
        "activated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if request.family_members:
        update_data["family_members"] = request.family_members
    
    await db.memberships.update_one(
        {"id": membership["id"]},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "message": "Membership activated successfully!",
        "membership_id": membership["id"]
    }

@router.get("/membership/status/{email}")
async def get_membership_status(email: str):
    """Get membership status for an email"""
    membership = await db.memberships.find_one({
        "email": email.lower(),
        "status": "active"
    })
    
    if not membership:
        return {"has_membership": False}
    
    membership.pop("_id", None)
    
    # Check if expired
    end_date = datetime.fromisoformat(membership.get("end_date", "").replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)
    
    if now > end_date:
        return {
            "has_membership": True,
            "status": "expired",
            "expired_on": membership["end_date"]
        }
    
    days_remaining = (end_date - now).days
    
    return {
        "has_membership": True,
        "status": "active",
        "membership": membership,
        "days_remaining": days_remaining
    }

@router.get("/membership/dashboard/{email}")
async def get_membership_dashboard(email: str):
    """Get membership dashboard with usage stats and active discounts"""
    # Get active membership
    membership = await db.memberships.find_one({
        "email": email.lower(),
        "status": "active"
    })
    
    if not membership:
        return {
            "has_membership": False,
            "message": "No active membership found"
        }
    
    membership_id = str(membership.get("_id", ""))
    membership.pop("_id", None)
    
    # Check if expired
    end_date = datetime.fromisoformat(membership.get("end_date", "").replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)
    
    if now > end_date:
        return {
            "has_membership": True,
            "status": "expired",
            "expired_on": membership["end_date"]
        }
    
    days_remaining = (end_date - now).days
    
    # Get usage stats
    # Count pharmacy orders
    pharmacy_orders = await db.pharmacy_orders.count_documents({
        "$or": [
            {"email": email.lower()},
            {"patient_email": email.lower()}
        ]
    })
    
    # Count lab test bookings
    lab_bookings = await db.lab_bookings.count_documents({
        "$or": [
            {"email": email.lower()},
            {"patient_email": email.lower()}
        ]
    })
    
    # Count appointments
    appointments = await db.appointments.count_documents({
        "$or": [
            {"email": email.lower()},
            {"patient_email": email.lower()}
        ]
    })
    
    # Calculate estimated savings (based on discount rates)
    # Pharmacy: 25% discount, Lab: 30% discount
    # Using mock averages: Pharmacy order avg ₹500, Lab test avg ₹1000
    pharmacy_savings = pharmacy_orders * 500 * 0.25  # 25% of ₹500 average
    lab_savings = lab_bookings * 1000 * 0.30  # 30% of ₹1000 average
    total_savings = pharmacy_savings + lab_savings
    
    # Get portal access history (which portals user has visited)
    portal_visits = await db.portal_visits.find({"email": email.lower()}).to_list(100)
    visited_portals = list(set([v.get("portal") for v in portal_visits if v.get("portal")]))
    
    # Active discounts
    active_discounts = [
        {
            "service": "Orange Pharmacy",
            "discount": "25%",
            "description": "On all medicines and health products",
            "color": "orange"
        },
        {
            "service": "Proton Diagnostics",
            "discount": "30%",
            "description": "On all lab tests and packages",
            "color": "cyan"
        },
        {
            "service": "Home Collection",
            "discount": "FREE",
            "description": "Free home sample collection",
            "color": "green"
        },
        {
            "service": "Priority Booking",
            "discount": "VIP",
            "description": "Priority slots at DiaGyn clinics",
            "color": "purple"
        }
    ]
    
    # All portals included
    all_portals = [
        {"name": "Evara", "category": "PCOS Care", "icon": "🌸"},
        {"name": "Glydex", "category": "Diabetes", "icon": "💉"},
        {"name": "Corvia", "category": "Heart Health", "icon": "❤️"},
        {"name": "Serena", "category": "Mental Wellness", "icon": "🧘"},
        {"name": "Thrive360", "category": "Fitness", "icon": "🏃"},
        {"name": "Alyne", "category": "Kids Health", "icon": "👶"},
        {"name": "Aanya", "category": "Newborn Care", "icon": "🍼"},
        {"name": "Senova", "category": "Senior Care", "icon": "👴"},
        {"name": "Reneu", "category": "Preventive Health", "icon": "🛡️"},
        {"name": "DiaGyn", "category": "Clinic Services", "icon": "🏥"},
        {"name": "Proton", "category": "Lab Tests", "icon": "🧪"},
        {"name": "Orange", "category": "Pharmacy", "icon": "💊"}
    ]
    
    return {
        "has_membership": True,
        "status": "active",
        "membership": {
            "id": membership_id,
            "plan_name": membership.get("plan_name", "Nevika Cura ONE"),
            "plan_type": membership.get("plan_type", "premium"),
            "billing_cycle": membership.get("billing_cycle", "monthly"),
            "start_date": membership.get("start_date"),
            "end_date": membership.get("end_date"),
            "amount_paid": membership.get("amount", 0)
        },
        "days_remaining": days_remaining,
        "usage_stats": {
            "pharmacy_orders": pharmacy_orders,
            "lab_bookings": lab_bookings,
            "appointments": appointments,
            "portals_visited": len(visited_portals),
            "estimated_savings": round(total_savings)
        },
        "active_discounts": active_discounts,
        "all_portals": all_portals,
        "visited_portals": visited_portals
    }

# ==================== FAMILY PLAN ENDPOINTS ====================

@router.get("/family-plans")
async def get_family_plans():
    """Get all family plans"""
    return {"plans": FAMILY_PLANS}

class FamilyMemberRequest(BaseModel):
    membership_id: str
    name: str
    relation: str
    phone: str
    email: Optional[str] = None
    age: Optional[str] = None

@router.post("/family/add-member")
async def add_family_member(request: FamilyMemberRequest):
    """Add a family member to an existing family plan"""
    membership = await db.memberships.find_one({"id": request.membership_id})
    
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")
    
    if not membership.get("is_family"):
        raise HTTPException(status_code=400, detail="Not a family plan")
    
    # Check member limit
    plan = FAMILY_PLANS.get(membership["plan_type"])
    max_members = plan.get("members", 4) if plan else 4
    
    current_members = membership.get("family_members", [])
    if len(current_members) >= max_members:
        raise HTTPException(status_code=400, detail=f"Maximum {max_members} members allowed")
    
    new_member = {
        "id": f"FAM-{random.randint(1000, 9999)}",
        "name": request.name,
        "relation": request.relation,
        "phone": request.phone,
        "email": request.email,
        "age": request.age,
        "added_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.memberships.update_one(
        {"id": request.membership_id},
        {"$push": {"family_members": new_member}}
    )
    
    return {
        "success": True,
        "message": f"{request.name} added to family plan",
        "member_id": new_member["id"]
    }

@router.get("/family/members/{membership_id}")
async def get_family_members(membership_id: str):
    """Get all family members for a membership"""
    membership = await db.memberships.find_one({"id": membership_id})
    
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")
    
    return {
        "membership_id": membership_id,
        "plan_name": membership.get("plan_name"),
        "members": membership.get("family_members", []),
        "primary_member": {
            "name": membership.get("member_name"),
            "phone": membership.get("member_phone"),
            "email": membership.get("email")
        }
    }


@router.post("/complete-membership")
async def complete_membership(request: CompleteMembershipRequest):
    """Complete membership after payment - fill in user details"""
    # Find pending membership
    pending = await db.pending_memberships.find_one({
        "email": request.email.lower(),
        "plan_type": request.plan_type,
        "membership_completed": False
    })
    
    if not pending:
        return {"success": False, "message": "No pending membership found for this email"}
    
    # Create or update patient record
    patient_id = f"PAT-{datetime.now().strftime('%Y%m%d%H%M%S')}-{random.randint(1000, 9999)}"
    
    patient = {
        "id": patient_id,
        "name": request.name,
        "email": request.email.lower(),
        "phone": request.phone,
        "age": request.age,
        "gender": request.gender,
        "address": request.address,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": "subscription_purchase"
    }
    
    # Check if patient with email already exists
    existing = await db.patients.find_one({"email": request.email.lower()})
    if existing:
        patient_id = existing["id"]
        # Update existing patient
        await db.patients.update_one(
            {"email": request.email.lower()},
            {"$set": {
                "name": request.name,
                "phone": request.phone,
                "age": request.age or existing.get("age"),
                "gender": request.gender or existing.get("gender"),
                "address": request.address or existing.get("address")
            }}
        )
    else:
        await db.patients.insert_one(patient)
    
    # Create subscription
    plan = SUBSCRIPTION_PLANS[request.plan_type]
    duration_days = pending.get("duration_days", plan["duration_days"])
    
    start_date = datetime.now(timezone.utc)
    end_date = start_date + timedelta(days=duration_days)
    
    subscription = {
        "subscription_id": f"SUB-{request.plan_type.upper()[:3]}-{datetime.now().strftime('%Y%m%d%H%M%S')}-{random.randint(1000, 9999)}",
        "patient_id": patient_id,
        "patient_name": request.name,
        "patient_phone": request.phone,
        "patient_email": request.email.lower(),
        "plan_type": request.plan_type,
        "plan_name": plan["name"],
        "tier": pending.get("tier", "annual"),
        "amount_paid": pending.get("amount_paid", 0),
        "payment_method": pending.get("payment_method", "stripe"),
        "coupon_code": pending.get("coupon_code"),
        "status": "active",
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "features": plan["features"],
        "created_at": start_date.isoformat()
    }
    
    await db.subscriptions.insert_one(subscription)
    
    # Mark pending membership as completed
    await db.pending_memberships.update_one(
        {"_id": pending["_id"]},
        {"$set": {
            "membership_completed": True,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "patient_id": patient_id,
            "subscription_id": subscription["subscription_id"]
        }}
    )
    
    # Award welcome points
    await award_points(patient_id, 200, "Welcome bonus - Subscription activated", "welcome_bonus")
    
    return {
        "success": True,
        "message": "Membership activated successfully!",
        "subscription_id": subscription["subscription_id"],
        "patient_id": patient_id,
        "expires_at": end_date.isoformat()
    }

# ==================== TIERED CHECKOUT ====================

class TieredCheckoutRequest(BaseModel):
    plan_type: str
    tier: str  # starter, standard, premium, annual
    patient_id: str
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    coupon_code: Optional[str] = None
    referral_code: Optional[str] = None

@router.post("/checkout/tiered")
async def create_tiered_checkout(request: TieredCheckoutRequest):
    """Create checkout for a specific tier"""
    import stripe
    
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Payment not configured")
    
    stripe.api_key = stripe_api_key
    
    plan = SUBSCRIPTION_PLANS.get(request.plan_type)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan type")
    
    tiers = plan.get("tiers", {})
    tier_info = tiers.get(request.tier)
    
    if not tier_info:
        raise HTTPException(status_code=400, detail="Invalid tier")
    
    price = tier_info["price"]
    duration_days = tier_info["duration_days"]
    
    # Apply referral discount if applicable
    if request.referral_code:
        referral_use = await db.referral_uses.find_one({
            "referral_code": request.referral_code.upper(),
            "used_by_patient_id": request.patient_id,
            "reward_given": False
        })
        if referral_use:
            discount_percent = referral_use.get("discount_percent", 20)
            price = int(price * (100 - discount_percent) / 100)
    
    # Apply coupon if provided
    if request.coupon_code:
        coupon = await db.coupons.find_one({
            "code": request.coupon_code.upper(),
            "is_active": True
        })
        if coupon:
            discount = coupon.get("discount_percent", 0)
            price = int(price * (100 - discount) / 100)
    
    if price == 0:
        # Free subscription
        subscription = await activate_subscription(
            patient_id=request.patient_id,
            patient_name=request.patient_name,
            patient_phone=request.patient_phone,
            patient_email=request.patient_email,
            plan_type=request.plan_type,
            payment_method="coupon",
            coupon_code=request.coupon_code,
            amount_paid=0
        )
        
        # Process referral reward
        if request.referral_code:
            await process_referral_reward(request.referral_code, request.patient_id)
        
        return {
            "free_subscription": True,
            "subscription_id": subscription["subscription_id"],
            "message": "Subscription activated!"
        }
    
    # Create Stripe checkout
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'inr',
                    'product_data': {
                        'name': f"{plan['name']} - {tier_info['name']}",
                        'description': f"{duration_days} days access"
                    },
                    'unit_amount': price * 100
                },
                'quantity': 1
            }],
            mode='payment',
            success_url=f"{os.environ.get('FRONTEND_URL', 'https://nevikacura.com')}/{request.plan_type}?success=true&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{os.environ.get('FRONTEND_URL', 'https://nevikacura.com')}/{request.plan_type}?canceled=true",
            metadata={
                'patient_id': request.patient_id,
                'patient_name': request.patient_name,
                'patient_phone': request.patient_phone,
                'patient_email': request.patient_email or '',
                'plan_type': request.plan_type,
                'tier': request.tier,
                'duration_days': str(duration_days),
                'coupon_code': request.coupon_code or '',
                'referral_code': request.referral_code or ''
            }
        )
        
        return {
            "checkout_url": session.url,
            "session_id": session.id,
            "amount": price,
            "tier": tier_info["name"],
            "duration_days": duration_days
        }
    except Exception as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# AUTO-REFILL MEDICINE SUBSCRIPTIONS
# ============================================================

class AutoRefillCreate(BaseModel):
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = ""
    items: list  # [{name, quantity, price}]
    frequency_days: int = 30
    delivery_address: str = ""
    payment_method: str = "cod"
    notes: str = ""


@router.post("/auto-refill/create")
async def create_auto_refill(data: AutoRefillCreate):
    """Create a new medicine auto-refill subscription"""
    import uuid as _uuid
    now = datetime.now(timezone.utc)
    next_refill = now + timedelta(days=data.frequency_days)
    total_per_cycle = sum(i.get("price", 0) * i.get("quantity", 1) for i in data.items)

    subscription = {
        "id": str(_uuid.uuid4()),
        "type": "auto_refill",
        "patient_name": data.patient_name,
        "patient_phone": data.patient_phone,
        "patient_email": data.patient_email,
        "items": data.items,
        "frequency_days": data.frequency_days,
        "delivery_address": data.delivery_address,
        "payment_method": data.payment_method,
        "notes": data.notes,
        "total_per_cycle": total_per_cycle,
        "discount_percent": 5,
        "discounted_total": round(total_per_cycle * 0.95),
        "status": "active",
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "next_refill_date": next_refill.isoformat(),
        "last_refill_date": None,
        "total_cycles_completed": 0,
        "total_revenue": 0
    }

    await db.auto_refill_subscriptions.insert_one(subscription)
    del subscription["_id"]
    return {"success": True, "subscription": subscription}


@router.get("/auto-refill/list")
async def list_auto_refills(phone: str = None, status: str = None):
    """List auto-refill subscriptions"""
    query = {"type": "auto_refill"}
    if phone:
        query["patient_phone"] = phone
    if status:
        query["status"] = status

    subs = await db.auto_refill_subscriptions.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"subscriptions": subs, "total": len(subs)}


@router.get("/auto-refill/{sub_id}")
async def get_auto_refill(sub_id: str):
    """Get single auto-refill subscription"""
    sub = await db.auto_refill_subscriptions.find_one({"id": sub_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return sub


@router.put("/auto-refill/{sub_id}")
async def update_auto_refill(sub_id: str, data: dict):
    """Update auto-refill subscription"""
    sub = await db.auto_refill_subscriptions.find_one({"id": sub_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    allowed = ["items", "frequency_days", "delivery_address", "payment_method", "notes", "status"]
    update = {k: v for k, v in data.items() if k in allowed}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()

    if "items" in update:
        total = sum(i.get("price", 0) * i.get("quantity", 1) for i in update["items"])
        update["total_per_cycle"] = total
        update["discounted_total"] = round(total * 0.95)
    if "frequency_days" in update:
        update["next_refill_date"] = (datetime.now(timezone.utc) + timedelta(days=update["frequency_days"])).isoformat()

    await db.auto_refill_subscriptions.update_one({"id": sub_id}, {"$set": update})
    updated = await db.auto_refill_subscriptions.find_one({"id": sub_id}, {"_id": 0})
    return {"success": True, "subscription": updated}


@router.post("/auto-refill/{sub_id}/pause")
async def pause_auto_refill(sub_id: str, data: dict = {}):
    """Pause auto-refill"""
    sub = await db.auto_refill_subscriptions.find_one({"id": sub_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    pause_days = data.get("pause_days", 30)
    await db.auto_refill_subscriptions.update_one({"id": sub_id}, {"$set": {
        "status": "paused",
        "pause_until": (datetime.now(timezone.utc) + timedelta(days=pause_days)).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }})
    return {"success": True, "message": f"Paused for {pause_days} days"}


@router.post("/auto-refill/{sub_id}/resume")
async def resume_auto_refill(sub_id: str):
    """Resume paused auto-refill"""
    sub = await db.auto_refill_subscriptions.find_one({"id": sub_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    freq = sub.get("frequency_days", 30)
    await db.auto_refill_subscriptions.update_one({"id": sub_id}, {"$set": {
        "status": "active",
        "pause_until": None,
        "next_refill_date": (datetime.now(timezone.utc) + timedelta(days=freq)).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }})
    return {"success": True, "message": "Subscription resumed"}


@router.post("/auto-refill/{sub_id}/cancel")
async def cancel_auto_refill(sub_id: str, data: dict = {}):
    """Cancel auto-refill"""
    sub = await db.auto_refill_subscriptions.find_one({"id": sub_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    await db.auto_refill_subscriptions.update_one({"id": sub_id}, {"$set": {
        "status": "cancelled",
        "cancelled_at": datetime.now(timezone.utc).isoformat(),
        "cancel_reason": data.get("reason", ""),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }})
    return {"success": True, "message": "Subscription cancelled"}


@router.post("/auto-refill/process-due")
async def process_due_auto_refills():
    """Process all auto-refill subscriptions due today (cron endpoint)"""
    import uuid as _uuid
    now = datetime.now(timezone.utc).isoformat()
    due = await db.auto_refill_subscriptions.find({
        "status": "active",
        "next_refill_date": {"$lte": now}
    }, {"_id": 0}).to_list(500)

    processed = 0
    for sub in due:
        try:
            order = {
                "id": str(_uuid.uuid4()),
                "subscription_id": sub["id"],
                "customer_name": sub["patient_name"],
                "customer_phone": sub["patient_phone"],
                "items": sub["items"],
                "total_amount": sub.get("discounted_total", sub["total_per_cycle"]),
                "delivery_address": sub["delivery_address"],
                "payment_method": sub["payment_method"],
                "status": "pending",
                "type": "auto_refill",
                "created_at": now
            }
            await db.pharmacy_orders.insert_one(order)
            freq = sub.get("frequency_days", 30)
            await db.auto_refill_subscriptions.update_one({"id": sub["id"]}, {"$set": {
                "next_refill_date": (datetime.now(timezone.utc) + timedelta(days=freq)).isoformat(),
                "last_refill_date": now,
                "total_cycles_completed": sub.get("total_cycles_completed", 0) + 1,
                "total_revenue": sub.get("total_revenue", 0) + sub.get("discounted_total", sub["total_per_cycle"]),
                "updated_at": now
            }})
            processed += 1
        except Exception as e:
            logger.error(f"Auto-refill processing failed for {sub['id']}: {e}")

    return {"success": True, "processed": processed, "total_due": len(due)}


@router.get("/auto-refill/dashboard/stats")
async def auto_refill_dashboard():
    """Dashboard stats for staff portal"""
    active = await db.auto_refill_subscriptions.count_documents({"status": "active"})
    paused = await db.auto_refill_subscriptions.count_documents({"status": "paused"})
    cancelled = await db.auto_refill_subscriptions.count_documents({"status": "cancelled"})

    pipeline = [
        {"$match": {"status": "active"}},
        {"$group": {"_id": None, "mrr": {"$sum": "$discounted_total"}, "avg": {"$avg": "$discounted_total"}}}
    ]
    rev = await db.auto_refill_subscriptions.aggregate(pipeline).to_list(1)
    r = rev[0] if rev else {"mrr": 0, "avg": 0}

    return {
        "active": active,
        "paused": paused,
        "cancelled": cancelled,
        "monthly_recurring_revenue": r.get("mrr", 0),
        "avg_order_value": round(r.get("avg", 0)),
        "total_subscriptions": active + paused + cancelled
    }
