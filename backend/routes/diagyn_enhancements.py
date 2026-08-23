"""
DiaGyn Flow Enhancements
- Staff check-in with fee collection
- Google review trigger after appointments
- Fee processing and tracking
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/diagyn", tags=["diagyn"])

# Fee structure for different consultation types
CONSULTATION_FEES = {
    "general": 500,
    "follow_up": 300,
    "urgent": 800,
    "procedure": 1500,
    "scan": 1200,
    "package": 2500
}

class StaffCheckInRequest(BaseModel):
    appointment_id: str
    staff_id: str
    fee_type: str = "general"
    fee_amount: Optional[float] = None
    payment_method: str = "cash"  # cash, upi, card
    notes: Optional[str] = None

class FeePaymentRequest(BaseModel):
    appointment_id: str
    amount: float
    payment_method: str
    staff_id: str
    receipt_number: Optional[str] = None

class GoogleReviewTriggerRequest(BaseModel):
    appointment_id: str
    patient_phone: str
    patient_name: str

def init_router(db):
    """Initialize the router with database connection"""
    
    @router.post("/staff-check-in")
    async def staff_check_in_patient(request: StaffCheckInRequest):
        """
        Staff checks in patient with fee collection
        Enhanced flow: Check-in → Fee Collection → Queue Position
        """
        # Get appointment
        appointment = await db.appointments.find_one(
            {"$or": [{"id": request.appointment_id}, {"booking_id": request.appointment_id}]},
            {"_id": 0}
        )
        
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        if appointment.get("status") not in ["confirmed", "scheduled", "Booked", "booked"]:
            raise HTTPException(status_code=400, detail=f"Cannot check-in appointment with status: {appointment.get('status')}")
        
        # Determine fee
        fee_amount = request.fee_amount if request.fee_amount else CONSULTATION_FEES.get(request.fee_type, 500)
        
        # Generate receipt number
        receipt_number = f"RCP-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
        
        # Update appointment with check-in and fee info
        check_in_data = {
            "status": "CheckedIn",
            "checked_in_at": datetime.now(timezone.utc).isoformat(),
            "checked_in_by": request.staff_id,
            "fee_type": request.fee_type,
            "fee_amount": fee_amount,
            "payment_method": request.payment_method,
            "payment_status": "collected",
            "receipt_number": receipt_number,
            "staff_notes": request.notes,
            "fee_collected_at": datetime.now(timezone.utc).isoformat()
        }
        
        apt_id = appointment.get("id") or appointment.get("booking_id")
        result = await db.appointments.update_one(
            {"$or": [{"id": apt_id}, {"booking_id": apt_id}]},
            {"$set": check_in_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to update appointment")
        
        # Create fee transaction record
        fee_transaction = {
            "id": f"fee_{str(uuid.uuid4())[:12]}",
            "appointment_id": request.appointment_id,
            "patient_id": appointment.get("patient_id"),
            "patient_name": appointment.get("patient_name"),
            "patient_phone": appointment.get("patient_phone"),
            "doctor_id": appointment.get("doctor_id"),
            "doctor_name": appointment.get("doctor_name"),
            "clinic_id": appointment.get("clinic_id"),
            "fee_type": request.fee_type,
            "amount": fee_amount,
            "payment_method": request.payment_method,
            "receipt_number": receipt_number,
            "collected_by": request.staff_id,
            "collected_at": datetime.now(timezone.utc).isoformat(),
            "status": "completed"
        }
        
        await db.fee_transactions.insert_one(fee_transaction)
        
        # Get queue position
        waiting_count = await db.appointments.count_documents({
            "clinic_id": appointment.get("clinic_id"),
            "appointment_date": appointment.get("appointment_date"),
            "status": "checked_in",
            "checked_in_at": {"$lt": check_in_data["checked_in_at"]}
        })
        
        logger.info(f"Staff check-in completed: {request.appointment_id}, Receipt: {receipt_number}")
        
        return {
            "success": True,
            "message": "Check-in successful with fee collected",
            "receipt_number": receipt_number,
            "fee_amount": fee_amount,
            "payment_method": request.payment_method,
            "queue_position": waiting_count + 1,
            "estimated_wait": f"~{(waiting_count + 1) * 15} mins"
        }
    
    @router.post("/complete-consultation")
    async def complete_consultation(appointment_id: str, doctor_notes: Optional[str] = None):
        """
        Complete consultation and trigger Google review request
        Also triggers invoice generation
        """
        appointment = await db.appointments.find_one(
            {"$or": [{"id": appointment_id}, {"booking_id": appointment_id}]},
            {"_id": 0}
        )
        
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        # Generate feedback token for Google review
        feedback_token = str(uuid.uuid4())
        google_review_url = "https://g.page/r/CYJ-example/review"  # Replace with actual Google review URL
        
        # Update appointment as completed
        completion_data = {
            "status": "Completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "doctor_notes": doctor_notes,
            "feedback_token": feedback_token,
            "google_review_url": google_review_url,
            "review_request_sent": False
        }
        
        apt_id = appointment.get("id") or appointment.get("booking_id")
        await db.appointments.update_one(
            {"$or": [{"id": apt_id}, {"booking_id": apt_id}]},
            {"$set": completion_data}
        )
        
        logger.info(f"Consultation completed: {appointment_id}")
        
        # Trigger invoice generation
        invoice_result = {"sent": False}
        try:
            from routes.invoice_routes import trigger_diagyn_invoice
            from fastapi import BackgroundTasks
            background_tasks = BackgroundTasks()
            invoice_result = await trigger_diagyn_invoice(appointment_id, background_tasks)
            invoice_result = {"sent": True, "invoice_id": invoice_result.get("invoice_id")}
            logger.info(f"Invoice triggered for DiaGyn appointment {appointment_id}")
        except Exception as e:
            logger.error(f"Failed to trigger invoice for appointment {appointment_id}: {e}")
            invoice_result = {"sent": False, "error": str(e)}
        
        return {
            "success": True,
            "message": "Consultation completed",
            "feedback_token": feedback_token,
            "google_review_url": google_review_url,
            "patient_phone": appointment.get("patient_phone"),
            "patient_name": appointment.get("patient_name"),
            "invoice": invoice_result
        }
    
    @router.post("/trigger-review-request")
    async def trigger_google_review_request(request: GoogleReviewTriggerRequest):
        """
        Send Google review request to patient via WhatsApp
        Called after consultation completion
        """
        appointment = await db.appointments.find_one(
            {"id": request.appointment_id},
            {"_id": 0}
        )
        
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        if appointment.get("status") != "completed":
            raise HTTPException(status_code=400, detail="Appointment must be completed first")
        
        google_review_url = appointment.get("google_review_url", "https://g.page/r/diagyn/review")
        
        # Mark review request as sent
        await db.appointments.update_one(
            {"id": request.appointment_id},
            {
                "$set": {
                    "review_request_sent": True,
                    "review_request_sent_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Create review request record
        review_request = {
            "id": f"review_{str(uuid.uuid4())[:12]}",
            "appointment_id": request.appointment_id,
            "patient_phone": request.patient_phone,
            "patient_name": request.patient_name,
            "doctor_name": appointment.get("doctor_name"),
            "clinic_id": appointment.get("clinic_id"),
            "google_review_url": google_review_url,
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "status": "sent"
        }
        
        await db.review_requests.insert_one(review_request)
        
        logger.info(f"Google review request triggered for: {request.appointment_id}")
        
        return {
            "success": True,
            "message": "Review request will be sent to patient",
            "google_review_url": google_review_url
        }
    
    @router.get("/fee-summary/{clinic_id}")
    async def get_fee_summary(clinic_id: str, date: Optional[str] = None):
        """
        Get fee collection summary for a clinic
        """
        query = {"clinic_id": clinic_id}
        
        if date:
            query["collected_at"] = {"$regex": f"^{date}"}
        else:
            # Today's summary
            today = datetime.now().strftime("%Y-%m-%d")
            query["collected_at"] = {"$regex": f"^{today}"}
        
        transactions = await db.fee_transactions.find(
            query,
            {"_id": 0}
        ).to_list(100)
        
        total_cash = sum(t["amount"] for t in transactions if t["payment_method"] == "cash")
        total_upi = sum(t["amount"] for t in transactions if t["payment_method"] == "upi")
        total_card = sum(t["amount"] for t in transactions if t["payment_method"] == "card")
        
        return {
            "clinic_id": clinic_id,
            "date": date or datetime.now().strftime("%Y-%m-%d"),
            "total_collections": len(transactions),
            "total_amount": sum(t["amount"] for t in transactions),
            "breakdown": {
                "cash": total_cash,
                "upi": total_upi,
                "card": total_card
            },
            "transactions": transactions[-10:]  # Last 10 transactions
        }
    
    @router.get("/consultation-fees")
    async def get_consultation_fees():
        """Get current consultation fee structure"""
        return {
            "fees": CONSULTATION_FEES,
            "description": {
                "general": "Standard consultation",
                "follow_up": "Follow-up visit within 7 days",
                "urgent": "Emergency/urgent consultation",
                "procedure": "Minor procedures",
                "scan": "Sonography/imaging",
                "package": "Comprehensive health package"
            }
        }
    
    return router
