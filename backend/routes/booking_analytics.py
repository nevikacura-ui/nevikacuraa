"""
Booking Analytics Dashboard — Aggregated booking statistics for admins.
"""

import os
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import jwt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Analytics"])

db = None
JWT_SECRET = os.environ.get("JWT_SECRET", "nevika-cura-jwt-secret-key-2025")

def set_db(database):
    global db
    db = database


@router.get("/bookings")
async def get_booking_analytics(days: int = 30):
    """Get booking analytics for the given period"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    try:
        # Total bookings
        total = await db.appointments.count_documents({"created_at": {"$gte": cutoff}})
        completed = await db.appointments.count_documents({"created_at": {"$gte": cutoff}, "status": "Completed"})
        cancelled = await db.appointments.count_documents({"created_at": {"$gte": cutoff}, "status": {"$in": ["Cancelled", "cancelled"]}})
        voice_booked = await db.appointments.count_documents({"created_at": {"$gte": cutoff}, "source": "voice_booking"})

        # By doctor
        doc_pipeline = [
            {"$match": {"created_at": {"$gte": cutoff}}},
            {"$group": {"_id": "$doctor", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        by_doctor = []
        async for d in db.appointments.aggregate(doc_pipeline):
            by_doctor.append({"doctor": d["_id"] or "Unknown", "count": d["count"]})

        # By clinic
        clinic_pipeline = [
            {"$match": {"created_at": {"$gte": cutoff}}},
            {"$group": {"_id": "$clinic", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        by_clinic = []
        async for d in db.appointments.aggregate(clinic_pipeline):
            by_clinic.append({"clinic": d["_id"] or "Unknown", "count": d["count"]})

        # By day (last 7 days)
        daily = []
        for i in range(min(days, 7)):
            day = datetime.now(timezone.utc) - timedelta(days=i)
            day_str = day.strftime("%Y-%m-%d")
            count = await db.appointments.count_documents({
                "date": day_str
            })
            daily.append({"date": day_str, "day": day.strftime("%a"), "count": count})
        daily.reverse()

        # By status
        status_pipeline = [
            {"$match": {"created_at": {"$gte": cutoff}}},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        by_status = []
        async for d in db.appointments.aggregate(status_pipeline):
            by_status.append({"status": d["_id"] or "Unknown", "count": d["count"]})

        # By source
        source_pipeline = [
            {"$match": {"created_at": {"$gte": cutoff}}},
            {"$group": {"_id": "$source", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        by_source = []
        async for d in db.appointments.aggregate(source_pipeline):
            by_source.append({"source": d["_id"] or "manual", "count": d["count"]})

        return {
            "period_days": days,
            "total": total,
            "completed": completed,
            "cancelled": cancelled,
            "voice_booked": voice_booked,
            "completion_rate": round(completed / total * 100, 1) if total > 0 else 0,
            "by_doctor": by_doctor,
            "by_clinic": by_clinic,
            "daily": daily,
            "by_status": by_status,
            "by_source": by_source,
        }
    except Exception as e:
        logger.error(f"Analytics error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/revenue")
async def get_revenue_analytics(days: int = 30):
    """Get revenue analytics from payments"""
    if db is None:
        return {"total_revenue": 0, "by_service": []}

    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    try:
        revenue_pipeline = [
            {"$match": {"created_at": {"$gte": cutoff}, "status": {"$in": ["PAID", "paid", "completed"]}}},
            {"$group": {"_id": "$service_type", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
            {"$sort": {"total": -1}}
        ]
        by_service = []
        total_revenue = 0
        async for d in db.cashfree_orders.aggregate(revenue_pipeline):
            amt = d.get("total", 0) or 0
            by_service.append({"service": d["_id"] or "Other", "amount": amt, "count": d["count"]})
            total_revenue += amt

        return {"total_revenue": total_revenue, "by_service": by_service, "period_days": days}
    except Exception:
        return {"total_revenue": 0, "by_service": [], "period_days": days}
