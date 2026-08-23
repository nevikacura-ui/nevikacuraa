"""
DiaGyn Staff Portal — Queue insights.
"""

from fastapi import APIRouter, Depends, Query
from datetime import datetime, timezone

from . import shared
from .auth import verify_staff
from .utils import get_ist_date

router = APIRouter()


@router.get("/queue/insights")
async def get_queue_insights(
    clinic: str = Query(None),
    date: str = Query(None),
    staff=Depends(verify_staff),
):
    today = date or get_ist_date()
    query = {"date": today}
    if clinic:
        query["clinic"] = clinic

    appointments = await shared.db.appointments.find(query, {"_id": 0}).to_list(500)

    waiting = [a for a in appointments if a.get("status") == "CheckedIn"]
    with_doctor = [a for a in appointments if a.get("status") == "WithDoctor"]
    billing = [a for a in appointments if a.get("status") == "billing_pending"]
    completed = [a for a in appointments if a.get("status") in ("Completed", "completed")]

    now = datetime.now(timezone.utc)
    IST_OFFSET = shared.IST_OFFSET

    waiting_details = []
    for apt in waiting:
        checkin = apt.get("checked_in_at")
        if checkin:
            try:
                checkin_dt = datetime.fromisoformat(checkin.replace("Z", "+00:00"))
                if checkin_dt.tzinfo is None:
                    checkin_dt = checkin_dt.replace(tzinfo=timezone.utc) - IST_OFFSET
                wait_mins = max(0, int((now - checkin_dt).total_seconds() / 60))
            except Exception:
                wait_mins = 0
        else:
            wait_mins = 0
        waiting_details.append(
            {
                "patient_name": apt.get("patient_name"),
                "token_number": apt.get("token_number"),
                "wait_minutes": wait_mins,
                "doctor": apt.get("doctor"),
            }
        )

    waiting_details.sort(key=lambda x: x["wait_minutes"], reverse=True)

    wait_times = []
    for apt in completed + with_doctor + billing:
        checkin = apt.get("checked_in_at")
        with_doc = apt.get("with_doctor_at")
        if checkin and with_doc:
            try:
                c = datetime.fromisoformat(checkin.replace("Z", "+00:00"))
                w = datetime.fromisoformat(with_doc.replace("Z", "+00:00"))
                if c.tzinfo is None:
                    c = c.replace(tzinfo=timezone.utc) - IST_OFFSET
                if w.tzinfo is None:
                    w = w.replace(tzinfo=timezone.utc)
                diff = max(0, int((w - c).total_seconds() / 60))
                if diff < 300:
                    wait_times.append(diff)
            except Exception:
                pass

    avg_wait = round(sum(wait_times) / len(wait_times)) if wait_times else 0
    longest_waiting = waiting_details[0] if waiting_details else None

    return {
        "success": True,
        "date": today,
        "clinic": clinic,
        "waiting_count": len(waiting),
        "with_doctor_count": len(with_doctor),
        "billing_count": len(billing),
        "completed_count": len(completed),
        "total_today": len(appointments),
        "avg_wait_minutes": avg_wait,
        "longest_waiting": longest_waiting,
        "waiting_patients": waiting_details,
    }
