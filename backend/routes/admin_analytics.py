"""
Admin Analytics Dashboard - API Routes
Provides engagement metrics, popular medicines, peak booking hours, order trends
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from datetime import datetime, timezone, timedelta
import jwt
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/analytics", tags=["Admin Analytics"])

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


async def verify_admin(authorization: str = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Admin authentication required")
    token = authorization.split(' ')[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        role = payload.get('role', '')
        if role not in ['admin', 'super_admin']:
            raise HTTPException(status_code=403, detail="Admin access required")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/overview")
async def get_overview(days: int = 30, admin=Depends(verify_admin)):
    """Get platform overview metrics for the given period"""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    total_appointments = await db.appointments.count_documents(
        {"created_at": {"$gte": cutoff}}
    )
    total_pharmacy_orders = await db.pharmacy_orders.count_documents(
        {"created_at": {"$gte": cutoff}}
    )
    total_lab_bookings = await db.lab_bookings.count_documents(
        {"created_at": {"$gte": cutoff}}
    )
    total_users = await db.users.count_documents({})
    new_users = await db.users.count_documents(
        {"created_at": {"$gte": cutoff}}
    )

    # Revenue from pharmacy orders
    revenue_pipeline = [
        {"$match": {"created_at": {"$gte": cutoff}, "status": {"$nin": ["cancelled"]}}},
        {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$total_amount", 0]}}}}
    ]
    revenue_result = await db.pharmacy_orders.aggregate(revenue_pipeline).to_list(1)
    pharmacy_revenue = revenue_result[0]["total"] if revenue_result else 0

    return {
        "period_days": days,
        "total_appointments": total_appointments,
        "total_pharmacy_orders": total_pharmacy_orders,
        "total_lab_bookings": total_lab_bookings,
        "total_users": total_users,
        "new_users": new_users,
        "pharmacy_revenue": round(pharmacy_revenue, 2)
    }


@router.get("/popular-medicines")
async def get_popular_medicines(limit: int = 15, admin=Depends(verify_admin)):
    """Get most ordered medicines"""
    pipeline = [
        {"$match": {"status": {"$nin": ["cancelled"]}}},
        {"$unwind": {"path": "$items", "preserveNullAndEmptyArrays": False}},
        {"$group": {
            "_id": "$items.name",
            "order_count": {"$sum": 1},
            "total_qty": {"$sum": {"$ifNull": ["$items.quantity", 1]}}
        }},
        {"$sort": {"order_count": -1}},
        {"$limit": limit},
        {"$project": {"_id": 0, "name": "$_id", "order_count": 1, "total_qty": 1}}
    ]

    # Try with items field first, then medicines field
    results = await db.pharmacy_orders.aggregate(pipeline).to_list(limit)
    if not results:
        pipeline[1] = {"$unwind": {"path": "$medicines", "preserveNullAndEmptyArrays": False}}
        pipeline[2] = {"$group": {
            "_id": "$medicines.name",
            "order_count": {"$sum": 1},
            "total_qty": {"$sum": {"$ifNull": ["$medicines.quantity", 1]}}
        }}
        results = await db.pharmacy_orders.aggregate(pipeline).to_list(limit)

    return {"medicines": results}


@router.get("/peak-hours")
async def get_peak_hours(days: int = 30, admin=Depends(verify_admin)):
    """Get peak booking/order hours distribution"""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    # Aggregate appointment hours
    hours = {str(h): {"appointments": 0, "pharmacy_orders": 0, "lab_bookings": 0} for h in range(24)}

    # Process appointments
    appointments = await db.appointments.find(
        {"created_at": {"$gte": cutoff}},
        {"_id": 0, "created_at": 1}
    ).to_list(5000)
    for apt in appointments:
        try:
            ts = apt.get("created_at", "")
            if isinstance(ts, str) and "T" in ts:
                hour = int(ts.split("T")[1][:2])
                hours[str(hour)]["appointments"] += 1
        except (ValueError, IndexError):
            pass

    # Process pharmacy orders
    orders = await db.pharmacy_orders.find(
        {"created_at": {"$gte": cutoff}},
        {"_id": 0, "created_at": 1}
    ).to_list(5000)
    for order in orders:
        try:
            ts = order.get("created_at", "")
            if isinstance(ts, str) and "T" in ts:
                hour = int(ts.split("T")[1][:2])
                hours[str(hour)]["pharmacy_orders"] += 1
        except (ValueError, IndexError):
            pass

    # Process lab bookings
    lab_bookings = await db.lab_bookings.find(
        {"created_at": {"$gte": cutoff}},
        {"_id": 0, "created_at": 1}
    ).to_list(5000)
    for booking in lab_bookings:
        try:
            ts = booking.get("created_at", "")
            if isinstance(ts, str) and "T" in ts:
                hour = int(ts.split("T")[1][:2])
                hours[str(hour)]["lab_bookings"] += 1
        except (ValueError, IndexError):
            pass

    # Convert to sorted list
    peak_data = [
        {"hour": int(h), "label": f"{int(h):02d}:00", **counts}
        for h, counts in sorted(hours.items(), key=lambda x: int(x[0]))
    ]

    return {"peak_hours": peak_data, "period_days": days}


@router.get("/order-trends")
async def get_order_trends(days: int = 30, admin=Depends(verify_admin)):
    """Get daily order/appointment trends"""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    # Build day-by-day data
    trends = {}
    for i in range(days):
        date = (datetime.now(timezone.utc) - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
        trends[date] = {"date": date, "appointments": 0, "pharmacy_orders": 0, "lab_bookings": 0, "revenue": 0}

    # Appointments
    appointments = await db.appointments.find(
        {"created_at": {"$gte": cutoff}},
        {"_id": 0, "created_at": 1}
    ).to_list(10000)
    for apt in appointments:
        date = apt.get("created_at", "")[:10]
        if date in trends:
            trends[date]["appointments"] += 1

    # Pharmacy orders
    orders = await db.pharmacy_orders.find(
        {"created_at": {"$gte": cutoff}},
        {"_id": 0, "created_at": 1, "total_amount": 1, "status": 1}
    ).to_list(10000)
    for order in orders:
        date = order.get("created_at", "")[:10]
        if date in trends:
            trends[date]["pharmacy_orders"] += 1
            if order.get("status") != "cancelled":
                trends[date]["revenue"] += order.get("total_amount", 0) or 0

    # Lab bookings
    lab_bookings = await db.lab_bookings.find(
        {"created_at": {"$gte": cutoff}},
        {"_id": 0, "created_at": 1}
    ).to_list(10000)
    for booking in lab_bookings:
        date = booking.get("created_at", "")[:10]
        if date in trends:
            trends[date]["lab_bookings"] += 1

    return {"trends": list(trends.values()), "period_days": days}


@router.get("/order-status-breakdown")
async def get_order_status_breakdown(admin=Depends(verify_admin)):
    """Get current order status distribution"""
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    results = await db.pharmacy_orders.aggregate(pipeline).to_list(20)

    return {
        "statuses": [{"status": r["_id"] or "unknown", "count": r["count"]} for r in results]
    }


@router.get("/engagement")
async def get_engagement_metrics(days: int = 30, admin=Depends(verify_admin)):
    """Get user engagement metrics"""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    # Users who placed orders
    active_pharmacy_users = await db.pharmacy_orders.distinct(
        "user_phone", {"created_at": {"$gte": cutoff}}
    )
    # Users who booked appointments
    active_appointment_users = await db.appointments.distinct(
        "patient_phone", {"created_at": {"$gte": cutoff}}
    )
    # Users who booked lab tests
    active_lab_users = await db.lab_bookings.distinct(
        "patient_phone", {"created_at": {"$gte": cutoff}}
    )

    all_active = set(active_pharmacy_users) | set(active_appointment_users) | set(active_lab_users)

    # Repeat users (appeared in more than one category)
    repeat_users = (
        set(active_pharmacy_users) & set(active_appointment_users) |
        set(active_pharmacy_users) & set(active_lab_users) |
        set(active_appointment_users) & set(active_lab_users)
    )

    return {
        "period_days": days,
        "active_users": len(all_active),
        "pharmacy_users": len(active_pharmacy_users),
        "appointment_users": len(active_appointment_users),
        "lab_users": len(active_lab_users),
        "cross_service_users": len(repeat_users)
    }
