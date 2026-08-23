"""
Nevika Cura - 3-Tier Membership System (Gold, Silver, Bronze)
"""

from fastapi.responses import HTMLResponse
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/membership-tiers", tags=["Membership Tiers"])

db = None

def set_db(database):
    global db
    db = database

# ==================== PLAN DEFINITIONS ====================
TIER_PLANS = {
    "gold": {
        "id": "gold",
        "name": "Gold",
        "tagline": "The Ultimate CuraCoins Experience",
        "price": 1499,
        "duration_months": 12,
        "duration_days": 365,
        "color": "#D4AF37",
        "benefits": {
            "curacoins_signup": 3000,
            "curacoins_multiplier": 5,
            "booking_priority": "vip",
            "portal_access": "all",
            "portal_duration_months": 12,
            "portal_desc": "All portals, 1 year access",
            "free_home_collection": True,
            "birthday_bonus": True,
        },
        "features": [
            "3,000 CuraCoins on Signup",
            "5x CuraCoins per Transaction",
            "VIP Priority Booking",
            "All Portals Access (1 Year)",
            "Birthday Bonus Coins",
            "Free Home Sample Collection",
        ],
    },
    "silver": {
        "id": "silver",
        "name": "Silver",
        "tagline": "Smart Health Rewards",
        "price": 999,
        "duration_months": 12,
        "duration_days": 365,
        "color": "#C0C0C0",
        "benefits": {
            "curacoins_signup": 1500,
            "curacoins_multiplier": 3,
            "booking_priority": "priority",
            "portal_access": "any_2",
            "portal_duration_months": 9,
            "portal_desc": "CuraCore portal, 9 months access",
            "free_home_collection": False,
            "birthday_bonus": True,
        },
        "features": [
            "1,500 CuraCoins on Signup",
            "3x CuraCoins per Transaction",
            "Priority Booking",
            "CuraCore Portal Access (9 Months)",
            "Birthday Bonus Coins",
        ],
    },
    "bronze": {
        "id": "bronze",
        "name": "Bronze",
        "tagline": "Start Earning CuraCoins",
        "price": 499,
        "duration_months": 12,
        "duration_days": 365,
        "color": "#CD7F32",
        "benefits": {
            "curacoins_signup": 500,
            "curacoins_multiplier": 2,
            "booking_priority": "standard",
            "portal_access": "any_1",
            "portal_duration_months": 6,
            "portal_desc": "Any 1 portal, 6 months access",
            "free_home_collection": False,
            "birthday_bonus": False,
        },
        "features": [
            "500 CuraCoins on Signup",
            "2x CuraCoins per Transaction",
            "Standard Booking Priority",
            "Digital Health Records Access",
        ],
    },
}


@router.get("/plans")
async def get_tier_plans():
    """Get all 3-tier membership plans"""
    return {
        "success": True,
        "plans": list(TIER_PLANS.values()),
    }


@router.get("/plans/{tier_id}")
async def get_tier_plan(tier_id: str):
    """Get specific tier plan details"""
    plan = TIER_PLANS.get(tier_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"success": True, "plan": plan}


class TierSignupRequest(BaseModel):
    tier: str
    name: str
    email: str
    age: Optional[str] = None
    address: Optional[str] = None
    whatsapp_number: Optional[str] = None


@router.post("/signup")
async def signup_membership(request: TierSignupRequest):
    """Create a Cashfree order for the selected tier"""
    plan = TIER_PLANS.get(request.tier)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid tier")

    try:
        from routes.cashfree import init_cashfree, API_VERSION
        from cashfree_pg.models.create_order_request import CreateOrderRequest
        from cashfree_pg.models.customer_details import CustomerDetails
        from cashfree_pg.models.order_meta import OrderMeta
        import random
        import os

        timestamp = int(datetime.now(timezone.utc).timestamp())
        order_id = f"NC_{request.tier.upper()}_{timestamp}_{random.randint(1000, 9999)}"

        frontend_url = os.environ.get(
            "REACT_APP_BACKEND_URL", "https://premium-rx-portal.preview.emergentagent.com"
        )
        return_url = f"{frontend_url}/one?order_id={order_id}"

        cashfree = init_cashfree()

        phone = (request.whatsapp_number or "9999999999").replace("+91", "").replace(" ", "")[-10:]

        customer_details = CustomerDetails(
            customer_id=f"MEM_{request.tier.upper()}_{timestamp}",
            customer_phone=phone,
            customer_email=request.email,
            customer_name=request.name,
        )
        order_meta = OrderMeta(return_url=return_url)
        create_req = CreateOrderRequest(
            order_id=order_id,
            order_amount=float(plan["price"]),
            order_currency="INR",
            customer_details=customer_details,
            order_meta=order_meta,
        )

        response = cashfree.PGCreateOrder(API_VERSION, create_req, None, None)

        if response and response.data:
            await db.cashfree_orders.insert_one(
                {
                    "order_id": order_id,
                    "cf_order_id": response.data.cf_order_id,
                    "payment_session_id": response.data.payment_session_id,
                    "customer_email": request.email,
                    "customer_name": request.name,
                    "customer_phone": phone,
                    "amount": plan["price"],
                    "currency": "INR",
                    "product_type": "membership",
                    "product_id": f"NEVIKA_{request.tier.upper()}",
                    "membership_plan": request.tier,
                    "membership_tier": request.tier,
                    "member_age": request.age,
                    "member_address": request.address,
                    "order_status": "ACTIVE",
                    "payment_status": "PENDING",
                    "payment_gateway": "cashfree",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            return {
                "success": True,
                "payment_session_id": response.data.payment_session_id,
                "order_id": order_id,
                "amount": plan["price"],
                "tier": request.tier,
                "plan_name": plan["name"],
            }

        raise HTTPException(status_code=500, detail="Failed to create payment order")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Tier signup error: {e}")
        raise HTTPException(status_code=500, detail=f"Payment processing error: {str(e)}")


@router.get("/my-membership/{email}")
async def get_my_membership(email: str):
    """Get current membership status for a user"""
    membership = await db.memberships.find_one(
        {"email": email.lower(), "status": "active"},
        {"_id": 0},
    )

    if not membership:
        return {"has_membership": False}

    end_date = datetime.fromisoformat(
        membership.get("end_date", "").replace("Z", "+00:00")
    )
    now = datetime.now(timezone.utc)

    if now > end_date:
        return {"has_membership": True, "status": "expired"}

    days_remaining = (end_date - now).days
    tier = membership.get("membership_tier", "gold")
    plan = TIER_PLANS.get(tier, TIER_PLANS["gold"])

    return {
        "has_membership": True,
        "status": "active",
        "tier": tier,
        "plan_name": plan["name"],
        "color": plan["color"],
        "benefits": plan["benefits"],
        "days_remaining": days_remaining,
        "valid_until": membership.get("end_date"),
        "membership_code": membership.get("membership_code"),
    }



# ==================== TRIAL FEATURE DEFINITIONS ====================
TRIAL_FEATURES = {
    "evara": ["period_tracker", "pcos_guide", "pregnancy_guide", "pms_education"],
    "glydex": ["sugar_log", "warnings"],
}
TRIAL_DURATION_DAYS = 7


class TrialRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None


@router.post("/start-trial")
async def start_trial(request: TrialRequest):
    """Start a 7-day free trial"""
    if not request.email and not request.phone:
        return {"success": False, "detail": "Email or phone required"}

    identifier = {}
    if request.email:
        identifier["email"] = request.email.lower()
    elif request.phone:
        identifier["phone"] = request.phone

    # Check if already has active membership
    mem_query = {"status": "active"}
    if request.email:
        mem_query["email"] = request.email.lower()
    elif request.phone:
        mem_query["whatsapp_number"] = request.phone

    existing_mem = await db.memberships.find_one(mem_query, {"_id": 0})
    if existing_mem:
        return {"success": False, "detail": "You already have an active membership"}

    # Check if already used trial
    existing_trial = await db.trials.find_one(identifier, {"_id": 0})
    if existing_trial:
        return {"success": False, "detail": "You have already used your free trial"}

    now = datetime.now(timezone.utc)
    trial_doc = {
        **identifier,
        "started_at": now.isoformat(),
        "expires_at": (now + __import__('datetime').timedelta(days=TRIAL_DURATION_DAYS)).isoformat(),
        "allowed_features": TRIAL_FEATURES,
        "status": "active",
    }
    await db.trials.insert_one(trial_doc)

    return {
        "success": True,
        "trial": {
            "days_remaining": TRIAL_DURATION_DAYS,
            "expires_at": trial_doc["expires_at"],
            "allowed_features": TRIAL_FEATURES,
        }
    }


@router.get("/check-active")
async def check_active_membership(email: str = None, phone: str = None):
    """Quick check if user has active membership or trial - for freemium gating"""
    if not email and not phone:
        return {"active": False, "trial": None}

    # Check full membership first
    mem_query = {"status": "active"}
    if email:
        mem_query["email"] = email.lower()
    elif phone:
        mem_query["whatsapp_number"] = phone

    membership = await db.memberships.find_one(mem_query, {"_id": 0, "end_date": 1})
    if membership:
        try:
            end_date = datetime.fromisoformat(
                membership.get("end_date", "").replace("Z", "+00:00")
            )
            if datetime.now(timezone.utc) <= end_date:
                return {"active": True, "trial": None}
        except Exception:
            pass

    # Check trial
    trial_query = {}
    if email:
        trial_query["email"] = email.lower()
    elif phone:
        trial_query["phone"] = phone

    trial = await db.trials.find_one(trial_query, {"_id": 0})
    if trial and trial.get("status") == "active":
        try:
            expires = datetime.fromisoformat(
                trial.get("expires_at", "").replace("Z", "+00:00")
            )
            now = datetime.now(timezone.utc)
            if now <= expires:
                remaining = (expires - now).days
                return {
                    "active": False,
                    "trial": {
                        "active": True,
                        "days_remaining": max(remaining, 0),
                        "allowed_features": trial.get("allowed_features", TRIAL_FEATURES),
                    }
                }
            else:
                await db.trials.update_one(trial_query, {"$set": {"status": "expired"}})
        except Exception:
            pass

    return {"active": False, "trial": None}


# ==================== MEMBERSHIP INVOICE ====================

LOGO_NEVIKA_CURA = "https://customer-assets.emergentagent.com/job_1fa4546e-4936-4955-8a5d-dab926a22cbb/artifacts/fypykopb_3_20260311_124451_0002.png"
LOGO_CURAPAY = "https://customer-assets.emergentagent.com/job_1fa4546e-4936-4955-8a5d-dab926a22cbb/artifacts/bqr5vr04_file_00000000d14471faa6dd7695a521413d.png"

@router.get("/invoice/{order_id}", response_class=HTMLResponse)
async def get_membership_invoice(order_id: str):
    """Generate printable membership invoice HTML"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    membership = await db.memberships.find_one({"order_id": order_id}, {"_id": 0})
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")

    name = membership.get("customer_name", "Member")
    email = membership.get("email", "")
    phone = membership.get("customer_phone", "")
    plan = membership.get("plan_name", "CuraOne Membership")
    tier = membership.get("membership_tier", "gold").upper()
    amount = membership.get("amount", 0)
    code = membership.get("membership_code", "")
    formatted_code = ' '.join([code[i:i+4] for i in range(0, len(code), 4)]) if code else ""
    start_raw = membership.get("start_date", membership.get("created_at", ""))
    end_raw = membership.get("end_date", "")
    oid = membership.get("order_id", order_id)

    try:
        start_dt = datetime.fromisoformat(start_raw.replace("Z", "+00:00")) if start_raw else datetime.now(timezone.utc)
        start_str = start_dt.strftime("%d %b %Y")
    except Exception:
        start_str = str(start_raw)[:10] if start_raw else "N/A"
    try:
        end_dt = datetime.fromisoformat(end_raw.replace("Z", "+00:00")) if end_raw else datetime.now(timezone.utc)
        end_str = end_dt.strftime("%d %b %Y")
    except Exception:
        end_str = str(end_raw)[:10] if end_raw else "N/A"

    tier_color = {"GOLD": "#D4AF37", "SILVER": "#94A3B8", "BRONZE": "#CD7F32"}.get(tier, "#0D9488")

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice — {plan}</title>
<style>
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ font-family: 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7; color: #1e293b; }}
  .invoice {{ max-width: 600px; margin: 24px auto; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }}
  .header {{ background: linear-gradient(135deg, #134E4A, #0D9488); padding: 32px 28px 24px; text-align: center; }}
  .header img {{ height: 36px; margin-bottom: 14px; }}
  .header h1 {{ color: #fff; font-size: 22px; font-weight: 800; letter-spacing: 1px; }}
  .header p {{ color: rgba(255,255,255,0.65); font-size: 11px; margin-top: 4px; letter-spacing: 0.5px; }}
  .tier-badge {{ display: inline-block; background: {tier_color}; color: #fff; font-size: 11px; font-weight: 800; padding: 4px 16px; border-radius: 20px; margin-top: 12px; letter-spacing: 1.5px; }}
  .body {{ padding: 28px; }}
  .section-title {{ font-size: 9px; font-weight: 700; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px; }}
  .row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }}
  .row:last-child {{ border-bottom: none; }}
  .row .label {{ color: #64748b; font-size: 13px; }}
  .row .value {{ color: #1e293b; font-size: 13px; font-weight: 600; text-align: right; }}
  .code-box {{ background: linear-gradient(135deg, #134E4A, #0D9488); border-radius: 16px; padding: 20px; text-align: center; margin: 20px 0; }}
  .code-box .label {{ color: rgba(255,255,255,0.6); font-size: 9px; letter-spacing: 2px; font-weight: 700; }}
  .code-box .code {{ color: #fff; font-size: 24px; font-weight: 800; letter-spacing: 5px; font-family: 'Courier New', monospace; margin-top: 6px; }}
  .total-box {{ background: #f8fafc; border-radius: 14px; padding: 16px 20px; margin: 16px 0; display: flex; justify-content: space-between; align-items: center; }}
  .total-box .total-label {{ font-size: 13px; color: #64748b; }}
  .total-box .total-amount {{ font-size: 22px; font-weight: 800; color: #0D9488; }}
  .footer {{ padding: 20px 28px 28px; text-align: center; border-top: 1px solid #f1f5f9; }}
  .footer .powered {{ display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 10px; }}
  .footer .powered img {{ height: 28px; border-radius: 6px; }}
  .footer .powered span {{ font-size: 10px; color: #94a3b8; }}
  .footer .powered strong {{ font-size: 12px; color: #0D9488; font-weight: 700; }}
  .footer p {{ font-size: 10px; color: #94a3b8; line-height: 1.6; }}
  @media print {{
    body {{ background: #fff; }}
    .invoice {{ box-shadow: none; margin: 0; border-radius: 0; }}
    .no-print {{ display: none !important; }}
  }}
  .print-btn {{ display: block; width: fit-content; margin: 16px auto; background: #0D9488; color: #fff; border: none; padding: 12px 32px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; }}
  .print-btn:hover {{ background: #0B8175; }}
</style>
</head>
<body>
<div class="no-print" style="text-align:center;padding-top:16px;">
  <button class="print-btn" onclick="window.print()">Download / Print Invoice</button>
</div>
<div class="invoice">
  <div class="header">
    <img src="{LOGO_NEVIKA_CURA}" alt="Nevika Cura" />
    <h1>INVOICE</h1>
    <p>Membership Subscription Receipt</p>
    <div class="tier-badge">{tier}</div>
  </div>
  <div class="body">
    <p class="section-title">Invoice Details</p>
    <div class="row"><span class="label">Invoice No.</span><span class="value">{oid}</span></div>
    <div class="row"><span class="label">Date</span><span class="value">{start_str}</span></div>

    <p class="section-title" style="margin-top:20px;">Customer</p>
    <div class="row"><span class="label">Name</span><span class="value">{name}</span></div>
    {"<div class='row'><span class='label'>Email</span><span class='value'>" + email + "</span></div>" if email else ""}
    {"<div class='row'><span class='label'>Phone</span><span class='value'>" + phone + "</span></div>" if phone else ""}

    <p class="section-title" style="margin-top:20px;">Subscription</p>
    <div class="row"><span class="label">Plan</span><span class="value">{plan}</span></div>
    <div class="row"><span class="label">Tier</span><span class="value" style="color:{tier_color};font-weight:800;">{tier}</span></div>
    <div class="row"><span class="label">Valid From</span><span class="value">{start_str}</span></div>
    <div class="row"><span class="label">Valid Till</span><span class="value">{end_str}</span></div>

    <div class="code-box">
      <div class="label">MEMBERSHIP CODE</div>
      <div class="code">{formatted_code}</div>
    </div>

    <div class="total-box">
      <span class="total-label">Total Amount Paid</span>
      <span class="total-amount">&#8377;{amount}</span>
    </div>
  </div>
  <div class="footer">
    <div class="powered">
      <img src="{LOGO_CURAPAY}" alt="CuraPay" />
      <div><span>Powered by</span><br/><strong>CuraPay</strong></div>
    </div>
    <p>This is a computer-generated invoice.<br/>Nevika Cura Healthcare Pvt. Ltd. &bull; nevikacura.com</p>
  </div>
</div>
</body>
</html>"""
    return HTMLResponse(content=html)
