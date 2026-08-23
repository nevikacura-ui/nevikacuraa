"""
Revenue Dashboard API
Provides detailed financial analytics for the clinic including:
- Revenue breakdown by department (appointments, pharmacy, diagnostics)
- Daily/weekly/monthly trends
- Payment method distribution
- Top services by revenue
"""

from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional
from datetime import datetime, timezone, timedelta
from collections import defaultdict
import jwt
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/revenue", tags=["Revenue Dashboard"])

db = None
JWT_SECRET = None
JWT_ALGORITHM = "HS256"

def set_db(database):
    global db
    db = database

def set_jwt_config(secret, algorithm="HS256"):
    global JWT_SECRET, JWT_ALGORITHM
    JWT_SECRET = secret
    JWT_ALGORITHM = algorithm


def get_ist_now():
    ist = timezone(timedelta(hours=5, minutes=30))
    return datetime.now(ist)


async def verify_admin(authorization: str = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        token = authorization.split(' ')[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        role = payload.get("role", "").lower()
        username = payload.get("username", "").lower()
        if not any(x in role for x in ["admin", "doctor", "staff"]) and not any(x in username for x in ["admin", "dr_", "staff_"]):
            raise HTTPException(status_code=403, detail="Admin access required")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/summary")
async def revenue_summary(
    days: int = 30,
    authorization: str = Header(None)
):
    """Get overall revenue summary with comparisons"""
    await verify_admin(authorization)
    now = get_ist_now()
    
    # Current period
    current_start = (now - timedelta(days=days)).strftime("%Y-%m-%d")
    current_end = now.strftime("%Y-%m-%d")
    
    # Previous period (for comparison)
    prev_start = (now - timedelta(days=days * 2)).strftime("%Y-%m-%d")
    prev_end = current_start
    
    today = now.strftime("%Y-%m-%d")
    
    # Fetch all data
    appointments_current = await db.appointments.find(
        {"date": {"$gte": current_start, "$lte": current_end}}, {"_id": 0}
    ).to_list(10000)
    
    appointments_prev = await db.appointments.find(
        {"date": {"$gte": prev_start, "$lt": current_start}}, {"_id": 0}
    ).to_list(10000)
    
    pharmacy_current = await db.pharmacy_orders.find(
        {"created_at": {"$gte": (now - timedelta(days=days)).isoformat()}}, {"_id": 0}
    ).to_list(5000)
    
    pharmacy_prev = await db.pharmacy_orders.find(
        {"created_at": {"$gte": (now - timedelta(days=days*2)).isoformat(), "$lt": (now - timedelta(days=days)).isoformat()}}, {"_id": 0}
    ).to_list(5000)
    
    diagnostic_current = await db.diagnostic_orders.find(
        {"created_at": {"$gte": (now - timedelta(days=days)).isoformat()}}, {"_id": 0}
    ).to_list(5000)
    
    diagnostic_prev = await db.diagnostic_orders.find(
        {"created_at": {"$gte": (now - timedelta(days=days*2)).isoformat(), "$lt": (now - timedelta(days=days)).isoformat()}}, {"_id": 0}
    ).to_list(5000)
    
    # Invoices for actual payment data
    invoices = await db.invoices.find(
        {"created_at": {"$gte": (now - timedelta(days=days)).isoformat()}}, {"_id": 0}
    ).to_list(10000)
    
    # Calculate revenue
    def calc_revenue(appointments, pharmacy, diagnostics):
        completed_apts = [a for a in appointments if a.get("status") == "Completed"]
        consultation_rev = sum(float(a.get("consultation_fee", a.get("fee", 500))) for a in completed_apts)
        pharmacy_rev = sum(float(o.get("total_amount", o.get("grand_total", 0))) for o in pharmacy if o.get("status") not in ["Cancelled", "cancelled"])
        diag_rev = sum(float(o.get("total_amount", 0)) for o in diagnostics if o.get("status") not in ["cancelled"])
        return consultation_rev, pharmacy_rev, diag_rev
    
    curr_consult, curr_pharma, curr_diag = calc_revenue(appointments_current, pharmacy_current, diagnostic_current)
    prev_consult, prev_pharma, prev_diag = calc_revenue(appointments_prev, pharmacy_prev, diagnostic_prev)
    
    curr_total = curr_consult + curr_pharma + curr_diag
    prev_total = prev_consult + prev_pharma + prev_diag
    
    # Today's revenue
    today_apts = [a for a in appointments_current if a.get("date") == today]
    today_completed = [a for a in today_apts if a.get("status") == "Completed"]
    today_consult = sum(float(a.get("consultation_fee", a.get("fee", 500))) for a in today_completed)
    today_pharma = sum(float(o.get("total_amount", o.get("grand_total", 0))) for o in pharmacy_current if (o.get("created_at", "")[:10] == today and o.get("status") not in ["Cancelled", "cancelled"]))
    today_diag = sum(float(o.get("total_amount", 0)) for o in diagnostic_current if (o.get("created_at", "")[:10] == today and o.get("status") not in ["cancelled"]))
    
    # Payment method distribution from invoices
    payment_methods = defaultdict(float)
    for inv in invoices:
        for payment in inv.get("payments", []):
            method = payment.get("payment_method", "unknown")
            payment_methods[method] += float(payment.get("amount", 0))
    
    # Compute growth
    def growth(current, previous):
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return round(((current - previous) / previous) * 100, 1)
    
    return {
        "success": True,
        "period": {"days": days, "start": current_start, "end": current_end},
        "today": {
            "consultations": round(today_consult, 2),
            "pharmacy": round(today_pharma, 2),
            "diagnostics": round(today_diag, 2),
            "total": round(today_consult + today_pharma + today_diag, 2),
            "patients": len(today_apts),
            "completed": len(today_completed)
        },
        "current_period": {
            "consultations": round(curr_consult, 2),
            "pharmacy": round(curr_pharma, 2),
            "diagnostics": round(curr_diag, 2),
            "total": round(curr_total, 2),
            "avg_daily": round(curr_total / max(days, 1), 2)
        },
        "previous_period": {
            "total": round(prev_total, 2)
        },
        "growth": {
            "total": growth(curr_total, prev_total),
            "consultations": growth(curr_consult, prev_consult),
            "pharmacy": growth(curr_pharma, prev_pharma),
            "diagnostics": growth(curr_diag, prev_diag)
        },
        "payment_methods": dict(payment_methods),
        "patients": {
            "total_visits": len(appointments_current),
            "completed": len([a for a in appointments_current if a.get("status") == "Completed"]),
            "cancelled": len([a for a in appointments_current if a.get("status") == "Cancelled"]),
            "pharmacy_orders": len(pharmacy_current),
            "diagnostic_orders": len(diagnostic_current)
        }
    }


@router.get("/daily-trend")
async def revenue_daily_trend(
    days: int = 30,
    authorization: str = Header(None)
):
    """Get daily revenue trend data for charts"""
    await verify_admin(authorization)
    now = get_ist_now()
    start = now - timedelta(days=days)
    start_str = start.strftime("%Y-%m-%d")
    
    appointments = await db.appointments.find(
        {"date": {"$gte": start_str}, "status": "Completed"}, {"_id": 0, "date": 1, "consultation_fee": 1, "fee": 1}
    ).to_list(10000)
    
    pharmacy = await db.pharmacy_orders.find(
        {"created_at": {"$gte": start.isoformat()}, "status": {"$nin": ["Cancelled", "cancelled"]}},
        {"_id": 0, "created_at": 1, "total_amount": 1, "grand_total": 1}
    ).to_list(5000)
    
    diagnostics = await db.diagnostic_orders.find(
        {"created_at": {"$gte": start.isoformat()}, "status": {"$nin": ["cancelled"]}},
        {"_id": 0, "created_at": 1, "total_amount": 1}
    ).to_list(5000)
    
    # Build daily map
    daily = {}
    for i in range(days + 1):
        d = (start + timedelta(days=i)).strftime("%Y-%m-%d")
        daily[d] = {"date": d, "consultations": 0, "pharmacy": 0, "diagnostics": 0, "total": 0}
    
    for a in appointments:
        d = a.get("date", "")
        if d in daily:
            fee = float(a.get("consultation_fee", a.get("fee", 500)))
            daily[d]["consultations"] += fee
            daily[d]["total"] += fee
    
    for o in pharmacy:
        d = (o.get("created_at", ""))[:10]
        if d in daily:
            amt = float(o.get("total_amount", o.get("grand_total", 0)))
            daily[d]["pharmacy"] += amt
            daily[d]["total"] += amt
    
    for o in diagnostics:
        d = (o.get("created_at", ""))[:10]
        if d in daily:
            amt = float(o.get("total_amount", 0))
            daily[d]["diagnostics"] += amt
            daily[d]["total"] += amt
    
    trend = sorted(daily.values(), key=lambda x: x["date"])
    
    return {"success": True, "trend": trend, "days": days}


@router.get("/top-services")
async def top_revenue_services(
    days: int = 30,
    authorization: str = Header(None)
):
    """Get top revenue generating services"""
    await verify_admin(authorization)
    now = get_ist_now()
    start = now - timedelta(days=days)
    
    # Top doctors by revenue
    appointments = await db.appointments.find(
        {"date": {"$gte": start.strftime("%Y-%m-%d")}, "status": "Completed"},
        {"_id": 0, "doctor_name": 1, "consultation_fee": 1, "fee": 1, "clinic": 1}
    ).to_list(10000)
    
    doctor_rev = defaultdict(lambda: {"revenue": 0, "count": 0, "clinic": ""})
    for a in appointments:
        name = a.get("doctor_name", "Unknown")
        fee = float(a.get("consultation_fee", a.get("fee", 500)))
        doctor_rev[name]["revenue"] += fee
        doctor_rev[name]["count"] += 1
        doctor_rev[name]["clinic"] = a.get("clinic", "")
    
    top_doctors = sorted(
        [{"doctor": k, **v} for k, v in doctor_rev.items()],
        key=lambda x: x["revenue"], reverse=True
    )[:10]
    
    # Top pharmacy products
    pharmacy = await db.pharmacy_orders.find(
        {"created_at": {"$gte": start.isoformat()}, "status": {"$nin": ["Cancelled", "cancelled"]}},
        {"_id": 0, "items": 1}
    ).to_list(5000)
    
    product_rev = defaultdict(lambda: {"revenue": 0, "quantity": 0})
    for o in pharmacy:
        for item in o.get("items", []):
            name = item.get("name", item.get("medicine_name", "Unknown"))
            qty = int(item.get("quantity", 1))
            price = float(item.get("price", item.get("mrp", 0))) * qty
            product_rev[name]["revenue"] += price
            product_rev[name]["quantity"] += qty
    
    top_products = sorted(
        [{"product": k, **v} for k, v in product_rev.items()],
        key=lambda x: x["revenue"], reverse=True
    )[:10]
    
    # Top diagnostic tests
    diags = await db.diagnostic_orders.find(
        {"created_at": {"$gte": start.isoformat()}, "status": {"$nin": ["cancelled"]}},
        {"_id": 0, "tests": 1, "total_amount": 1}
    ).to_list(5000)
    
    test_rev = defaultdict(lambda: {"revenue": 0, "count": 0})
    for d in diags:
        tests = d.get("tests", [])
        amt = float(d.get("total_amount", 0))
        per_test = amt / max(len(tests), 1)
        for t in tests:
            test_rev[t]["revenue"] += per_test
            test_rev[t]["count"] += 1
    
    top_tests = sorted(
        [{"test": k, **v} for k, v in test_rev.items()],
        key=lambda x: x["revenue"], reverse=True
    )[:10]
    
    return {
        "success": True,
        "period_days": days,
        "top_doctors": top_doctors,
        "top_products": top_products,
        "top_tests": top_tests
    }
