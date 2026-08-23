"""
DiaGyn Staff Portal — Daily / Weekly / Monthly summaries + portal config.
"""

from fastapi import APIRouter, Depends
from datetime import timedelta
from typing import Optional

from . import shared
from .auth import verify_staff
from .utils import get_ist_now, get_ist_date, TIME_SLOTS

router = APIRouter()


@router.get("/summary/daily")
async def get_daily_summary(date: Optional[str] = None, clinic: Optional[str] = None, staff=Depends(verify_staff)):
    if not date:
        date = get_ist_date()

    query = {"date": date, "status": "Completed"}
    if clinic and clinic != "all":
        query["clinic"] = clinic

    appointments = await shared.db.appointments.find(query, {"_id": 0}).to_list(200)

    total_collection = sum(a.get("total_amount", 0) for a in appointments)
    total_patients = len(appointments)

    by_clinic = {}
    for apt in appointments:
        c = apt.get("clinic", "Unknown")
        if c not in by_clinic:
            by_clinic[c] = {"count": 0, "amount": 0}
        by_clinic[c]["count"] += 1
        by_clinic[c]["amount"] += apt.get("total_amount", 0)

    return {
        "date": date,
        "total_patients": total_patients,
        "total_collection": total_collection,
        "by_clinic": by_clinic,
        "appointments": appointments,
    }


@router.get("/summary/weekly")
async def get_weekly_summary(clinic: Optional[str] = None, staff=Depends(verify_staff)):
    today_ist = get_ist_now()
    dates = [(today_ist - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)]

    query = {"date": {"$in": dates}, "status": "Completed"}
    if clinic and clinic != "all":
        query["clinic"] = clinic

    appointments = await shared.db.appointments.find(query, {"_id": 0}).to_list(500)

    by_date = {}
    for d in dates:
        by_date[d] = {"count": 0, "amount": 0}

    for apt in appointments:
        d = apt.get("date")
        if d in by_date:
            by_date[d]["count"] += 1
            by_date[d]["amount"] += apt.get("total_amount", 0)

    total_collection = sum(a.get("total_amount", 0) for a in appointments)
    total_patients = len(appointments)

    return {
        "period": "weekly",
        "dates": dates,
        "total_patients": total_patients,
        "total_collection": total_collection,
        "by_date": by_date,
    }


@router.get("/summary/monthly")
async def get_monthly_summary(
    month: Optional[int] = None,
    year: Optional[int] = None,
    clinic: Optional[str] = None,
    staff=Depends(verify_staff),
):
    today_ist = get_ist_now()
    if not month:
        month = today_ist.month
    if not year:
        year = today_ist.year

    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"

    query = {"date": {"$gte": start_date, "$lt": end_date}, "status": "Completed"}
    if clinic and clinic != "all":
        query["clinic"] = clinic

    appointments = await shared.db.appointments.find(query, {"_id": 0}).to_list(1000)

    total_collection = sum(a.get("total_amount", 0) for a in appointments)
    total_patients = len(appointments)

    by_clinic = {}
    for apt in appointments:
        c = apt.get("clinic", "Unknown")
        if c not in by_clinic:
            by_clinic[c] = {"count": 0, "amount": 0}
        by_clinic[c]["count"] += 1
        by_clinic[c]["amount"] += apt.get("total_amount", 0)

    return {
        "period": "monthly",
        "month": month,
        "year": year,
        "total_patients": total_patients,
        "total_collection": total_collection,
        "by_clinic": by_clinic,
    }


@router.get("/config")
async def get_portal_config(staff=Depends(verify_staff)):
    return {
        "clinics": shared.CLINICS,
        "doctor_schedule": shared.DOCTOR_SCHEDULE,
        "time_slots": TIME_SLOTS,
        "fee_codes": shared.FEE_CODES,
        "scan_fees": shared.SCAN_FEES,
        "appointment_types": ["SCHEDULED", "WALK_IN", "EMERGENCY"],
    }
