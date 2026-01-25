"""
Stripe Payment Routes
Handles payment processing for appointments, pharmacy orders, and lab tests
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os
import logging
import resend
import asyncio

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, 
    CheckoutSessionResponse, 
    CheckoutStatusResponse, 
    CheckoutSessionRequest
)

router = APIRouter(prefix="/payments", tags=["Payments"])
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

# Stripe API key
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

# Resend Configuration
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'Nevika Cura <onboarding@resend.dev>')
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Twilio Configuration
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', '')
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER', '')
twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    try:
        from twilio.rest import Client as TwilioClient
        twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    except Exception as e:
        logger.warning(f"Failed to initialize Twilio client: {e}")

# ============================================
# Fixed Payment Packages (Backend-defined only)
# ============================================

CONSULTATION_FEES = {
    "NF": {"label": "No Fees", "amount": 0.0},
    "G1": {"label": "General - First Visit", "amount": 150.0},
    "G2": {"label": "General - Follow up", "amount": 100.0},
    "S1": {"label": "Speciality - First Visit", "amount": 300.0},
    "S2": {"label": "Speciality - Follow up", "amount": 200.0},
    "D1": {"label": "Diabetes - First Visit", "amount": 500.0},
    "D2": {"label": "Diabetes - Follow up", "amount": 400.0},
    "D3": {"label": "Diabetes - Follow up", "amount": 300.0},
    "O1": {"label": "OBGY - First Visit", "amount": 500.0},
    "O2": {"label": "OBGY - Follow up", "amount": 400.0},
    "O3": {"label": "OBGY - Follow up", "amount": 300.0},
    "E1": {"label": "Emergency", "amount": 600.0},
}

SCAN_FEES = {
    "ES": {"label": "Early Scan", "amount": 1000.0},
    "NT": {"label": "NT Scan", "amount": 1200.0},
    "GS": {"label": "Growth Scan", "amount": 1500.0},
    "FL": {"label": "Follicular", "amount": 200.0},
    "UP": {"label": "USG Pelvis", "amount": 1000.0},
    "UT": {"label": "UpT", "amount": 100.0},
}

# ============================================
# Pydantic Models
# ============================================

class AppointmentPaymentRequest(BaseModel):
    appointment_id: str
    fee_code: str
    origin_url: str
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None

class PharmacyPaymentRequest(BaseModel):
    order_id: str
    origin_url: str
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None

class LabTestPaymentRequest(BaseModel):
    booking_id: str
    origin_url: str
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None

class GenericPaymentRequest(BaseModel):
    payment_type: str  # appointment, pharmacy, lab_test
    reference_id: str  # appointment_id, order_id, or booking_id
    fee_code: Optional[str] = None  # For appointments
    origin_url: str
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None

class PaymentStatusRequest(BaseModel):
    session_id: str

# ============================================
# Helper Functions
# ============================================

def get_fee_amount(fee_code: str) -> tuple:
    """Get amount and label for a fee code"""
    if fee_code in CONSULTATION_FEES:
        fee = CONSULTATION_FEES[fee_code]
        return fee["amount"], fee["label"]
    elif fee_code in SCAN_FEES:
        fee = SCAN_FEES[fee_code]
        return fee["amount"], fee["label"]
    else:
        raise HTTPException(status_code=400, detail=f"Invalid fee code: {fee_code}")

# ============================================
# API Endpoints
# ============================================

@router.post("/create-checkout")
async def create_checkout_session(request: GenericPaymentRequest, http_request: Request):
    """Create a Stripe checkout session for any payment type"""
    try:
        # Determine amount based on payment type
        amount = 0.0
        description = ""
        
        if request.payment_type == "appointment":
            if not request.fee_code:
                raise HTTPException(status_code=400, detail="Fee code required for appointment payment")
            amount, description = get_fee_amount(request.fee_code)
            description = f"Appointment Fee: {description}"
            
        elif request.payment_type == "pharmacy":
            # Get order total from database
            order = await db.pharmacy_orders.find_one({"_id": request.reference_id})
            if not order:
                # Try with order_id field
                order = await db.pharmacy_orders.find_one({"order_id": request.reference_id})
            if order:
                amount = float(order.get("total_amount", order.get("total", 0)))
                description = f"Pharmacy Order #{request.reference_id}"
            else:
                raise HTTPException(status_code=404, detail="Order not found")
                
        elif request.payment_type == "lab_test":
            # Get booking total from database
            booking = await db.lab_bookings.find_one({"booking_id": request.reference_id})
            if booking:
                amount = float(booking.get("total_amount", booking.get("amount", 0)))
                description = f"Lab Test Booking #{request.reference_id}"
            else:
                raise HTTPException(status_code=404, detail="Booking not found")
        else:
            raise HTTPException(status_code=400, detail="Invalid payment type")
        
        # Skip payment for zero amount
        if amount <= 0:
            return {
                "success": True,
                "payment_required": False,
                "message": "No payment required"
            }
        
        # Build URLs from provided origin
        success_url = f"{request.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{request.origin_url}/payment/cancel?type={request.payment_type}&id={request.reference_id}"
        
        # Initialize Stripe checkout
        host_url = str(http_request.base_url)
        webhook_url = f"{host_url}api/payments/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        # Create checkout session
        checkout_request = CheckoutSessionRequest(
            amount=amount,
            currency="inr",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "payment_type": request.payment_type,
                "reference_id": request.reference_id,
                "fee_code": request.fee_code or "",
                "patient_name": request.patient_name or "",
                "patient_phone": request.patient_phone or "",
                "description": description
            }
        )
        
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create payment transaction record
        transaction = {
            "session_id": session.session_id,
            "payment_type": request.payment_type,
            "reference_id": request.reference_id,
            "fee_code": request.fee_code,
            "amount": amount,
            "currency": "inr",
            "patient_name": request.patient_name,
            "patient_phone": request.patient_phone,
            "description": description,
            "payment_status": "pending",
            "status": "initiated",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.payment_transactions.insert_one(transaction)
        
        logger.info(f"Created checkout session {session.session_id} for {request.payment_type} - ₹{amount}")
        
        return {
            "success": True,
            "payment_required": True,
            "checkout_url": session.url,
            "session_id": session.session_id,
            "amount": amount,
            "currency": "INR",
            "description": description
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating checkout session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{session_id}")
async def get_payment_status(session_id: str, http_request: Request):
    """Get the status of a payment session"""
    try:
        # Check if we've already processed this payment
        transaction = await db.payment_transactions.find_one(
            {"session_id": session_id},
            {"_id": 0}
        )
        
        if transaction and transaction.get("payment_status") == "paid":
            return {
                "success": True,
                "status": "complete",
                "payment_status": "paid",
                "amount": transaction.get("amount"),
                "currency": transaction.get("currency"),
                "reference_id": transaction.get("reference_id"),
                "payment_type": transaction.get("payment_type")
            }
        
        # Initialize Stripe checkout
        host_url = str(http_request.base_url)
        webhook_url = f"{host_url}api/payments/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        # Get status from Stripe
        checkout_status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction record
        new_status = "complete" if checkout_status.payment_status == "paid" else checkout_status.status
        
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "payment_status": checkout_status.payment_status,
                    "status": new_status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # If payment is successful, update the related record
        if checkout_status.payment_status == "paid" and transaction:
            await update_payment_reference(
                transaction.get("payment_type"),
                transaction.get("reference_id"),
                session_id
            )
        
        return {
            "success": True,
            "status": checkout_status.status,
            "payment_status": checkout_status.payment_status,
            "amount": checkout_status.amount_total / 100,  # Convert from paise to rupees
            "currency": checkout_status.currency.upper(),
            "metadata": checkout_status.metadata
        }
        
    except Exception as e:
        logger.error(f"Error getting payment status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        host_url = str(request.base_url)
        webhook_url = f"{host_url}api/payments/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        logger.info(f"Webhook received: {webhook_response.event_type} for session {webhook_response.session_id}")
        
        # Update transaction based on webhook
        if webhook_response.payment_status == "paid":
            transaction = await db.payment_transactions.find_one({"session_id": webhook_response.session_id})
            
            if transaction and transaction.get("payment_status") != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {
                        "$set": {
                            "payment_status": "paid",
                            "status": "complete",
                            "webhook_event_id": webhook_response.event_id,
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
                
                # Update the related record
                await update_payment_reference(
                    transaction.get("payment_type"),
                    transaction.get("reference_id"),
                    webhook_response.session_id
                )
        
        return {"success": True, "event_type": webhook_response.event_type}
        
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


async def update_payment_reference(payment_type: str, reference_id: str, session_id: str):
    """Update the related record after successful payment"""
    try:
        if payment_type == "appointment":
            await db.appointments.update_one(
                {"_id": reference_id},
                {
                    "$set": {
                        "payment_status": "paid",
                        "payment_session_id": session_id,
                        "payment_date": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            # Also try with appointment_id field
            await db.appointments.update_one(
                {"appointment_id": reference_id},
                {
                    "$set": {
                        "payment_status": "paid",
                        "payment_session_id": session_id,
                        "payment_date": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
        elif payment_type == "pharmacy":
            await db.pharmacy_orders.update_one(
                {"order_id": reference_id},
                {
                    "$set": {
                        "payment_status": "paid",
                        "payment_session_id": session_id,
                        "payment_date": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
        elif payment_type == "lab_test":
            await db.lab_bookings.update_one(
                {"booking_id": reference_id},
                {
                    "$set": {
                        "payment_status": "paid",
                        "payment_session_id": session_id,
                        "payment_date": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
        logger.info(f"Updated payment reference for {payment_type} {reference_id}")
        
    except Exception as e:
        logger.error(f"Error updating payment reference: {e}")


@router.get("/fee-codes")
async def get_fee_codes():
    """Get all available fee codes for payments"""
    return {
        "consultation_fees": CONSULTATION_FEES,
        "scan_fees": SCAN_FEES
    }


@router.get("/transactions")
async def get_payment_transactions(
    payment_type: Optional[str] = None,
    reference_id: Optional[str] = None,
    patient_phone: Optional[str] = None,
    limit: int = 50
):
    """Get payment transactions with optional filters"""
    query = {}
    
    if payment_type:
        query["payment_type"] = payment_type
    if reference_id:
        query["reference_id"] = reference_id
    if patient_phone:
        query["patient_phone"] = patient_phone
    
    transactions = await db.payment_transactions.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"transactions": transactions, "count": len(transactions)}
