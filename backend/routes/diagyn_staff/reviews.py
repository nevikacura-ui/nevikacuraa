"""
DiaGyn Staff Portal — Google review requests + invoice WhatsApp.
"""

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
import logging

from . import shared
from .auth import verify_staff
from .utils import get_ist_date

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/whatsapp/send-review-request")
async def send_google_review_request(
    whatsapp_number: str,
    patient_name: str = "Patient",
    clinic_name: str = "Pushpa Clinic",
    doctor_name: str = "Dr. Vikas Jha",
    review_link: str = None,
):
    clean_number = whatsapp_number.replace("+", "").replace(" ", "").replace("-", "")
    if not clean_number.startswith("91"):
        clean_number = "91" + clean_number

    if not review_link:
        review_link = shared.GOOGLE_REVIEW_LINKS.get(clinic_name, shared.GOOGLE_REVIEW_LINKS["DiaGyn Healthcare"])

    try:
        from services.msg91_whatsapp import send_msg91_whatsapp

        result = await send_msg91_whatsapp(
            recipient_phone=clean_number,
            template_name="diagyn_google_review",
            variables=[patient_name, doctor_name, clinic_name, review_link],
            db=shared.db,
            reference_id=f"review_{clean_number}_{datetime.now().strftime('%Y%m%d%H%M')}",
            message_type="google_review_request",
        )

        return {
            "success": True,
            "message": f"Google Review request sent to {clean_number}",
            "details": {"patient": patient_name, "doctor": doctor_name, "clinic": clinic_name, "review_link": review_link},
            "msg91_response": result,
        }
    except Exception as e:
        return {"success": False, "error": str(e), "note": "MSG91 template 'diagyn_google_review' may need to be registered"}


@router.post("/whatsapp/bulk-review-request")
async def send_bulk_review_requests(clinic_name: str = "Pushpa Clinic", date_str: str = None):
    if not date_str:
        date_str = get_ist_date()

    appointments = await shared.db.diagyn_appointments.find(
        {"date": date_str, "clinic": clinic_name, "status": {"$in": ["completed", "visited"]}}
    ).to_list(length=100)

    if not appointments:
        return {"success": False, "message": f"No completed appointments found for {clinic_name} on {date_str}"}

    results = []
    success_count = 0

    for apt in appointments:
        if apt.get("phone"):
            try:
                result = await send_google_review_request(
                    whatsapp_number=apt["phone"],
                    patient_name=apt.get("patient_name", "Patient"),
                    clinic_name=clinic_name,
                    doctor_name=apt.get("doctor", "Doctor"),
                )
                if result.get("success"):
                    success_count += 1
                results.append({"patient": apt.get("patient_name"), "phone": apt.get("phone"), "result": result})
            except Exception as e:
                results.append({"patient": apt.get("patient_name"), "phone": apt.get("phone"), "error": str(e)})

    return {
        "success": True,
        "clinic": clinic_name,
        "date": date_str,
        "total_appointments": len(appointments),
        "review_requests_sent": success_count,
        "details": results,
    }


@router.get("/review-stats")
async def get_review_stats(clinic: str = "Pushpa Clinic", date: str = None):
    if not date:
        date = get_ist_date()

    try:
        today_reviews = await shared.db.diagyn_appointments.count_documents(
            {"clinic": clinic, "date": date, "review_request_sent": True}
        )

        week_start = (datetime.strptime(date, "%Y-%m-%d") - timedelta(days=7)).strftime("%Y-%m-%d")
        weekly_reviews = await shared.db.diagyn_appointments.count_documents(
            {"clinic": clinic, "date": {"$gte": week_start, "$lte": date}, "review_request_sent": True}
        )

        total_completed = await shared.db.diagyn_appointments.count_documents(
            {"clinic": clinic, "date": date, "status": "Completed"}
        )

        return {
            "today": today_reviews,
            "weekly": weekly_reviews,
            "total_completed_today": total_completed,
            "review_rate": round((today_reviews / total_completed * 100) if total_completed > 0 else 0, 1),
        }
    except Exception as e:
        return {"today": 0, "weekly": 0, "total_completed_today": 0, "review_rate": 0, "error": str(e)}


@router.post("/appointments/{appointment_id}/send-invoice")
async def send_appointment_invoice(appointment_id: str, staff=Depends(verify_staff)):
    appointment = await shared.db.appointments.find_one(
        {
            "$or": [
                {"id": appointment_id},
                {"booking_id": appointment_id},
                {"booking_id": str(appointment_id)},
                {"id": {"$regex": f"^{appointment_id}"}},
            ]
        },
        {"_id": 0},
    )

    if not appointment:
        logger.warning(f"Appointment {appointment_id} not found")
        raise HTTPException(status_code=404, detail=f"Appointment {appointment_id} not found")

    if appointment.get("status") != "Completed":
        raise HTTPException(status_code=400, detail="Invoice can only be sent for completed appointments")

    patient_phone = appointment.get("patient_phone") or appointment.get("mobile")
    patient_name = appointment.get("patient_name", "Patient")
    doctor_name = appointment.get("doctor", "Doctor")
    booking_id = appointment.get("booking_id", appointment_id)

    if not patient_phone:
        raise HTTPException(status_code=400, detail="Patient phone number not available")

    clean_number = patient_phone.replace("+", "").replace(" ", "").replace("-", "")
    if not clean_number.startswith("91"):
        clean_number = "91" + clean_number

    try:
        from services.msg91_whatsapp import send_document_delivery

        await send_document_delivery(
            phone=clean_number,
            patient_name=patient_name,
            document_type="Invoice",
            from_name=doctor_name,
            download_url=f"https://nevikacura.com/invoice/{booking_id}",
            reference_id=booking_id,
            db=shared.db,
        )

        await shared.db.appointments.update_one(
            {"$or": [{"id": appointment_id}, {"booking_id": appointment_id}]},
            {
                "$set": {
                    "invoice_whatsapp_sent": True,
                    "invoice_whatsapp_sent_at": datetime.now(timezone.utc).isoformat(),
                    "invoice_whatsapp_sent_by": staff.get("name", "Staff"),
                }
            },
        )

        return {
            "success": True,
            "message": f"Invoice sent via WhatsApp to {clean_number}",
            "details": {"patient": patient_name, "amount": appointment.get("total_amount", 0), "booking_id": booking_id},
        }
    except Exception as e:
        logger.error(f"Failed to send invoice WhatsApp: {e}")
        return {"success": False, "error": str(e)}
