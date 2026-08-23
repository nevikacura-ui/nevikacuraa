"""
DiaGyn Staff Portal — Patient lookup, registration, recent patients.
"""

from fastapi import APIRouter, Depends
from datetime import datetime, timezone

from . import shared
from .auth import verify_staff
from .models import PatientLookup, PatientRegister
from .utils import get_ist_date

router = APIRouter()


@router.post("/patient/lookup")
async def lookup_patient(data: PatientLookup, staff=Depends(verify_staff)):
    mobile = data.mobile.strip().replace(" ", "")

    patient = await shared.db.patients.find_one(
        {"$or": [{"mobile": mobile}, {"phone": mobile}, {"patient_phone": mobile}]},
        {"_id": 0},
    )

    if patient:
        return {
            "found": True,
            "patient": {
                "id": patient.get("patient_id") or patient.get("id"),
                "name": patient.get("name") or patient.get("patient_name"),
                "mobile": mobile,
                "age": patient.get("age"),
                "gender": patient.get("gender"),
                "visit_count": patient.get("visit_count", 0),
                "last_visit": patient.get("last_visit"),
            },
        }

    last_appointment = await shared.db.appointments.find_one(
        {"patient_phone": mobile}, {"_id": 0}, sort=[("created_at", -1)]
    )

    if last_appointment:
        return {
            "found": True,
            "patient": {
                "id": last_appointment.get("patient_id"),
                "name": last_appointment.get("patient_name"),
                "mobile": mobile,
                "age": None,
                "gender": None,
                "visit_count": 1,
                "last_visit": last_appointment.get("date"),
            },
            "source": "appointments",
        }

    return {"found": False, "mobile": mobile}


@router.post("/patient/register")
async def register_patient(data: PatientRegister, staff=Depends(verify_staff)):
    mobile = data.mobile.strip().replace(" ", "")

    existing = await shared.db.patients.find_one({"mobile": mobile}, {"_id": 0})
    if existing:
        return {
            "success": True,
            "patient_id": existing.get("patient_id") or existing.get("id"),
            "message": "Patient already registered",
            "existing": True,
        }

    today = get_ist_date().replace("-", "")
    count = await shared.db.patients.count_documents({})
    patient_id = f"PAT-{today}-{(count + 1):04d}"

    patient_doc = {
        "patient_id": patient_id,
        "name": data.name.strip(),
        "mobile": mobile,
        "age": data.age,
        "gender": data.gender,
        "address": data.address,
        "visit_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": staff.get("name", "Staff"),
    }

    await shared.db.patients.insert_one(patient_doc)

    return {
        "success": True,
        "patient_id": patient_id,
        "message": f"Patient {data.name} registered successfully",
    }


@router.get("/patients/recent")
async def get_recent_patients(limit: int = 20, staff=Depends(verify_staff)):
    patients = (
        await shared.db.patients.find(
            {},
            {"_id": 0, "patient_id": 1, "name": 1, "mobile": 1, "age": 1, "visit_count": 1, "last_visit": 1},
        )
        .sort("last_visit", -1)
        .limit(limit)
        .to_list(limit)
    )
    return {"patients": patients}
