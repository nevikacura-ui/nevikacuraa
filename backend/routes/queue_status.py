"""Live Queue Status & Patient Position API Routes - Extracted from server.py"""
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from database import get_db
from services.notification_service import send_email_notification, send_push_notification, notify_staff_new_order
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

_live_sync_manager = None

def set_live_sync_manager(manager):
    global _live_sync_manager
    _live_sync_manager = manager


class DiagnosticOrderCreate(BaseModel):
    tests: List[str]
    prescription_url: Optional[str] = None
    preferred_date: str
    preferred_time_slot: Optional[str] = None
    collection_type: Optional[str] = "home"
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    patient_address: Optional[str] = None
    payment_method: Optional[str] = "cod"
    payment_status: Optional[str] = "pending"
    total_amount: Optional[float] = 0.0


class DiagnosticOrder(BaseModel):
    model_config = {"extra": "ignore"}
    id: str = ""
    user_id: Optional[str] = None
    tests: List[str] = []
    prescription_url: Optional[str] = None
    preferred_date: str = ""
    preferred_time_slot: Optional[str] = None
    collection_type: Optional[str] = "home"
    patient_name: str = ""
    patient_phone: str = ""
    patient_email: Optional[str] = None
    patient_address: Optional[str] = None
    status: str = "Order Booked"
    payment_method: Optional[str] = "cod"
    payment_status: Optional[str] = "pending"
    total_amount: Optional[float] = 0.0
    created_at: Optional[datetime] = None
    
    def __init__(self, **data):
        if 'id' not in data or not data['id']:
            data['id'] = f"DIAG_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:6]}"
        if 'created_at' not in data or not data['created_at']:
            data['created_at'] = datetime.now(timezone.utc)
        super().__init__(**data)


def _get_current_user():
    """Lazy import get_current_user from server to avoid circular imports"""
    from server import get_current_user
    return get_current_user


async def generate_booking_id(clinic: str, db_instance, booking_type: str = "appointment") -> str:
    """Use unified booking ID generator."""
    from utils.booking_utils import generate_booking_id as gen_id
    service = "mango" if any(k in clinic.lower() for k in ["proton", "diagnostic", "lab", "mango"]) else "diagyn"
    return await gen_id(service=service, source="web", db_instance=db_instance)

# ==================== LIVE QUEUE STATUS ====================

@router.get("/appointments/queue/{doctor_id}")
async def get_live_queue_status(doctor_id: str, date: str = None):
    """Get real-time queue status for a doctor"""
    db = get_db()
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")
    
    # Get today's appointments for this doctor
    appointments = await db.appointments.find({
        "doctor_id": doctor_id,
        "date": date,
        "status": {"$in": ["confirmed", "checked_in", "in_progress"]}
    }).sort("time", 1).to_list(50)
    
    # Count statuses
    waiting = 0
    in_progress = 0
    completed_today = await db.appointments.count_documents({
        "doctor_id": doctor_id,
        "date": date,
        "status": "completed"
    })
    
    queue = []
    for idx, appt in enumerate(appointments):
        appt.pop("_id", None)
        status = appt.get("status")
        
        if status == "checked_in":
            waiting += 1
            queue.append({
                "position": waiting,
                "patient_name": appt.get("patient_name", "")[:20],  # Privacy
                "time": appt.get("time"),
                "status": "waiting",
                "estimated_wait": f"{waiting * 15} min"  # ~15 min per patient
            })
        elif status == "in_progress":
            in_progress += 1
    
    return {
        "doctor_id": doctor_id,
        "date": date,
        "queue": queue,
        "stats": {
            "patients_waiting": waiting,
            "currently_with_doctor": in_progress,
            "completed_today": completed_today,
            "average_wait_time": f"{waiting * 12} min"
        },
        "last_updated": datetime.now(timezone.utc).isoformat()
    }

@router.get("/appointments/my-position/{appointment_id}")
async def get_my_queue_position(appointment_id: str):
    """Get patient's position in queue"""
    db = get_db()
    appointment = await db.appointments.find_one({"id": appointment_id})
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Count patients ahead
    patients_ahead = await db.appointments.count_documents({
        "doctor_id": appointment.get("doctor_id"),
        "date": appointment.get("date"),
        "status": {"$in": ["checked_in", "in_progress"]},
        "time": {"$lt": appointment.get("time")}
    })
    
    return {
        "appointment_id": appointment_id,
        "position": patients_ahead + 1,
        "patients_ahead": patients_ahead,
        "estimated_wait": f"{patients_ahead * 12} min",
        "your_time": appointment.get("time"),
        "status": appointment.get("status"),
        "message": f"You're #{patients_ahead + 1} in queue" if patients_ahead > 0 else "You're next!"
    }

@router.post("/appointments/check-in/{appointment_id}")
async def patient_check_in(appointment_id: str):
    """Patient checks in for their appointment"""
    db = get_db()
    result = await db.appointments.update_one(
        {"id": appointment_id, "status": "confirmed"},
        {
            "$set": {
                "status": "checked_in",
                "checked_in_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Appointment not found or already checked in")
    
    # Get position
    position_data = await get_my_queue_position(appointment_id)
    
    return {
        "success": True,
        "message": "Check-in successful!",
        **position_data
    }

@router.post("/diagnostics")
async def create_diagnostic_order(input: DiagnosticOrderCreate, user = Depends(_get_current_user())):
    """
    Create diagnostic order - HYBRID PAYMENT FLOW
    - COD: Create confirmed order, send email immediately
    - Online/Cashfree: Create draft order, email sent after payment webhook
    """
    db = get_db()
    # ORDER LIMIT REMOVED: Users can now place unlimited diagnostic orders
    # Previous limit of 2 active orders has been removed for better user experience
    # Staff manages order prioritization manually
    
    # Generate unique booking ID for lab test
    booking_id = await generate_booking_id("Proton Diagnostics", db, "lab_test")
    
    # HYBRID FLOW: Determine order status based on payment method
    is_online_payment = input.payment_method in ['cashfree', 'online']
    initial_status = "draft" if is_online_payment else "pending"  # COD = pending (ready to process)
    
    order = DiagnosticOrder(
        user_id=user.id if user else None,
        **input.model_dump()
    )
    order.status = initial_status
    
    doc = order.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['booking_id'] = booking_id  # Add booking ID to order
    doc['order_status'] = initial_status  # Explicit order status
    
    await db.diagnostic_orders.insert_one(doc)
    logger.info(f"Diagnostic order created: {order.id} with booking_id: {booking_id}, status: {initial_status}, payment: {input.payment_method}")
    
    # Generate and store Booking Code for sample collection verification
    booking_code = None
    try:
        from services.booking_otp import generate_booking_code_record, store_booking_code
        code_record = generate_booking_code_record(
            booking_id=booking_id,
            booking_type="mango",
            patient_phone=order.patient_phone,
            patient_name=order.patient_name,
            additional_data={
                "order_id": order.id,
                "booking_id": booking_id,
                "tests": order.tests,
                "total": order.total_amount,
                "date": order.preferred_date,
                "time": order.preferred_time,
                "collection_type": order.collection_type,
                "patient_name": order.patient_name
            }
        )
        await store_booking_code(db, code_record)
        booking_code = code_record["code"]
        
        # Update order with the booking code
        await db.diagnostic_orders.update_one(
            {"id": order.id},
            {"$set": {"booking_code": booking_code}}
        )
        
        logger.info(f"✅ Booking Code {booking_code} generated for diagnostic order {booking_id}")
    except Exception as e:
        logger.error(f"❌ Booking Code generation error: {e}")
    
    # Live sync notification to Mango staff
    try:
        if _live_sync_manager:
            await _live_sync_manager.notify_new_order("diagnostic", {
                "id": order.id,
                "patient_name": order.patient_name,
                "patient_phone": order.patient_phone,
                "status": initial_status,
                "total_amount": order.total_amount,
                "tests": order.tests,
                "created_at": order.created_at
            })
            logger.info(f"Live sync notification sent for diagnostic order {order.id}")
    except Exception as e:
        logger.warning(f"Could not send live sync notification: {e}")
    
    # HYBRID FLOW: Only send notifications for COD orders immediately
    # Online payment orders will get notifications after payment success webhook
    if not is_online_payment:
        await send_diagnostic_order_notifications(order, input, booking_id)
    else:
        logger.info(f"Online payment order {booking_id} - notifications deferred until payment confirmation")
    
    return {
        "id": order.id,
        "order_id": order.id,
        "booking_id": booking_id,
        "booking_code": booking_code,
        "status": initial_status,
        "payment_method": input.payment_method,
        "requires_payment": is_online_payment,
        "message": "Order created. Complete payment to confirm." if is_online_payment else "Order confirmed successfully!"
    }


async def send_diagnostic_order_notifications(order, input, booking_id):
    """Send email and WhatsApp notifications for diagnostic order"""
    db = get_db()
    try:
        # Generate WhatsApp link for order notification
        tests_text = ", ".join(order.tests[:3])
        if len(order.tests) > 3:
            tests_text += f" +{len(order.tests) - 3} more"
        
        whatsapp_message = f"""New Diagnostic Order - Proton Diagnostics

Patient: {order.patient_name}
Phone: {order.patient_phone}
Order ID: {order.id[:8]}

Tests: {tests_text}
Preferred Date: {order.preferred_date}
Prescription: {order.prescription_url or 'Not uploaded'}"""
        
        whatsapp_link = f"https://wa.me/917039040040?text={whatsapp_message.replace(chr(10), '%0A').replace(' ', '%20')}"
        
        # Format prescription as clickable link
        prescription_display = f'<a href="{order.prescription_url}" target="_blank" style="color: #8b5cf6;">📎 View Prescription</a>' if order.prescription_url else 'Not uploaded'
        
        # Format payment info
        payment_method_display = {
            'cod': '💵 Cash on Collection',
            'cashfree': '💳 Online Payment (Cashfree)',
            'online': '💳 Online Payment',
            'pay_later': '🕐 Pay Later'
        }.get(input.payment_method, '💵 Cash on Collection')
        
        payment_status_display = {
            'paid': '✅ Paid',
            'pending': '⏳ Pending',
            'failed': '❌ Failed'
        }.get(input.payment_status, '⏳ Pending')
        
        total_amount_display = f"₹{input.total_amount:.0f}" if input.total_amount and input.total_amount > 0 else "Price on confirmation"
        
        # Send email notification using premium templates
        from services.email_templates import diagnostic_admin_email, diagnostic_booking_email

        email_html = diagnostic_admin_email(
            patient_name=order.patient_name,
            patient_phone=order.patient_phone,
            patient_email=order.patient_email or "Not provided",
            booking_id=booking_id,
            tests=order.tests,
            preferred_date=order.preferred_date,
            time_slot=input.preferred_time_slot or "Any time",
            collection_type="Home Collection" if input.collection_type == "home" else "Visit Center",
            total_amount=total_amount_display,
            payment_method=payment_method_display,
            payment_status=payment_status_display,
            patient_address=input.patient_address or "Not provided",
            whatsapp_link=whatsapp_link,
        )

        patient_diag_html = diagnostic_booking_email(
            patient_name=order.patient_name,
            booking_id=booking_id,
            tests=order.tests,
            preferred_date=order.preferred_date,
            time_slot=input.preferred_time_slot or "Any time",
            collection_type="Home Collection" if input.collection_type == "home" else "Visit Center",
            total_amount=total_amount_display,
            payment_method=payment_method_display,
            payment_status=payment_status_display,
        )
        
        await send_email_notification(
            f"New Diagnostic Order - {order.patient_name}", 
            email_html,
            patient_email=order.patient_email,
            patient_subject="Test Booking Confirmed - Mango Health Labs",
            patient_html=patient_diag_html,
        )
        
        # Send staff notification
        await notify_staff_new_order({
            "id": order.id,
            "patient_name": order.patient_name,
            "test_name": ", ".join(order.tests[:2]) + ("..." if len(order.tests) > 2 else ""),
            "patient_phone": order.patient_phone,
            "preferred_date": order.preferred_date,
            "preferred_time": input.preferred_time_slot or "TBD",
            "address": input.patient_address or "See order details",
        }, "proton")
        
        # Send WhatsApp confirmation to PATIENT
        try:
            from services.msg91_whatsapp import send_proton_lab_confirmation
            tests_str = ", ".join(order.tests[:5])
            if len(order.tests) > 5:
                tests_str += f" +{len(order.tests)-5} more"
            await send_proton_lab_confirmation(
                phone=order.patient_phone,
                patient_name=order.patient_name,
                tests=tests_str,
                preferred_date=order.preferred_date,
                preferred_time=input.preferred_time_slot or "TBD",
                booking_id=booking_id,
                address=input.patient_address or "Home Collection",
                db=db
            )
            logger.info(f"Patient WhatsApp sent for COD diagnostic order {booking_id}")
        except Exception as wa_err:
            logger.warning(f"Patient WhatsApp for diagnostic order failed: {wa_err}")
        
        logger.info(f"✅ Diagnostic order notifications sent for {booking_id}")
        
    except Exception as e:
        logger.error(f"Failed to send diagnostic order notifications: {e}")


@router.get("/diagnostics", response_model=List[DiagnosticOrder])
async def get_diagnostic_orders(user = Depends(_get_current_user())):
    db = get_db()
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    orders = await db.diagnostic_orders.find({"user_id": user.id}, {"_id": 0}).to_list(100)
    
    for order in orders:
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
    
    return orders

