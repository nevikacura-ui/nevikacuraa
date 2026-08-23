"""
DiaGyn Staff Portal — Slot management routes.
"""

from fastapi import APIRouter, Depends, Query

from . import shared
from .auth import verify_staff
from .utils import get_slots_for_doctor_clinic_date

router = APIRouter()


@router.get("/slots/available")
async def get_available_slots(
    clinic: str,
    doctor: str,
    date: str,
    mode: str = Query(None, description="'walkin' for current session, 'book' for future sessions"),
    staff=Depends(verify_staff),
):
    session_filter = None
    if mode == "walkin":
        session_filter = "current"
    elif mode == "book":
        session_filter = "future"

    slot_data = get_slots_for_doctor_clinic_date(doctor, clinic, date, session_filter)

    if not slot_data or not slot_data.get("all"):
        return {
            "clinic": clinic,
            "doctor": doctor,
            "date": date,
            "available_slots": [],
            "morning_slots": [],
            "evening_slots": [],
            "booked_count": 0,
            "total_slots": 0,
            "current_session": slot_data.get("current_session") if slot_data else None,
            "message": f"{doctor} is not available at {clinic} for this session",
        }

    all_slots = slot_data.get("all", [])
    reserved_slots = {"11:00", "11:15"}

    booked = await shared.db.appointments.find(
        {"clinic": clinic, "doctor": doctor, "date": date, "status": {"$nin": ["Cancelled", "No Show"]}},
        {"_id": 0, "time": 1},
    ).to_list(100)

    booked_times = set(apt.get("time") for apt in booked if apt.get("time"))
    unavailable_times = booked_times.union(reserved_slots)

    available = [slot for slot in all_slots if slot["value"] not in unavailable_times]
    morning_available = [slot for slot in slot_data.get("morning", []) if slot["value"] not in unavailable_times]
    evening_available = [slot for slot in slot_data.get("evening", []) if slot["value"] not in unavailable_times]

    return {
        "clinic": clinic,
        "doctor": doctor,
        "date": date,
        "available_slots": available,
        "morning_slots": morning_available,
        "evening_slots": evening_available,
        "booked_count": len(booked_times),
        "total_slots": len(all_slots),
        "current_session": slot_data.get("current_session"),
        "mode": mode,
    }


@router.get("/slots/booked")
async def get_booked_slots(clinic: str, doctor: str, date: str, staff=Depends(verify_staff)):
    booked = await shared.db.appointments.find(
        {"clinic": clinic, "doctor": doctor, "date": date, "status": {"$nin": ["Cancelled", "No Show"]}},
        {"_id": 0, "time": 1},
    ).to_list(100)
    return {"booked_slots": [apt.get("time") for apt in booked if apt.get("time")]}
