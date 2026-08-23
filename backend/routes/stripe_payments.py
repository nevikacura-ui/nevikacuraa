"""
Stripe Payment Routes for International Patients
Handles USD payments for online consultations
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime, timezone
import os
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payments/stripe", tags=["Stripe Payments"])

# Database reference
db = None

def set_db(database):
    global db
    db = database

# Stripe API key from environment
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')

# Fixed consultation packages (prices in USD)
CONSULTATION_PACKAGES = {
    "consultation": {"amount": 30.00, "description": "Online Consultation (15 min)", "currency": "usd"},
    "followup": {"amount": 15.00, "description": "Follow-up Consultation (15 min)", "currency": "usd"}
}


class CreateStripeSessionRequest(BaseModel):
    package_id: str  # 'consultation' or 'followup'
    origin_url: str
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    doctor_name: str
    appointment_date: str
    appointment_time: str
    

class StripeSessionResponse(BaseModel):
    url: str
    session_id: str
    amount: float
    currency: str


@router.post("/create-session", response_model=StripeSessionResponse)
async def create_stripe_checkout_session(request: CreateStripeSessionRequest, http_request: Request):
    """
    Create a Stripe checkout session for international patient payments
    """
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    # Validate package
    if request.package_id not in CONSULTATION_PACKAGES:
        raise HTTPException(status_code=400, detail=f"Invalid package: {request.package_id}")
    
    package = CONSULTATION_PACKAGES[request.package_id]
    
    try:
        from emergentintegrations.payments.stripe.checkout import (
            StripeCheckout, 
            CheckoutSessionRequest, 
            CheckoutSessionResponse
        )
        
        # Initialize Stripe checkout
        host_url = str(http_request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        # Build success and cancel URLs
        success_url = f"{request.origin_url}/online-appointment-success?session_id={{CHECKOUT_SESSION_ID}}&provider=stripe"
        cancel_url = f"{request.origin_url}/diagyn?payment=cancelled"
        
        # Create metadata
        metadata = {
            "patient_name": request.patient_name,
            "patient_phone": request.patient_phone,
            "patient_email": request.patient_email or "",
            "doctor_name": request.doctor_name,
            "appointment_date": request.appointment_date,
            "appointment_time": request.appointment_time,
            "package_id": request.package_id,
            "product_type": "online_consultation",
            "patient_type": "international"
        }
        
        # Create checkout session request
        checkout_request = CheckoutSessionRequest(
            amount=package["amount"],
            currency=package["currency"],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata
        )
        
        # Create the checkout session
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Store transaction record in database
        transaction_record = {
            "session_id": session.session_id,
            "provider": "stripe",
            "amount": package["amount"],
            "currency": package["currency"],
            "package_id": request.package_id,
            "patient_name": request.patient_name,
            "patient_phone": request.patient_phone,
            "patient_email": request.patient_email,
            "doctor_name": request.doctor_name,
            "appointment_date": request.appointment_date,
            "appointment_time": request.appointment_time,
            "status": "pending",
            "payment_status": "initiated",
            "created_at": datetime.now(timezone.utc),
            "product_type": "online_consultation",
            "patient_type": "international"
        }
        
        if db is not None:
            await db.payment_transactions.insert_one(transaction_record)
        
        logger.info(f"Stripe session created: {session.session_id} for {request.patient_name}")
        
        return StripeSessionResponse(
            url=session.url,
            session_id=session.session_id,
            amount=package["amount"],
            currency=package["currency"]
        )
        
    except ImportError as e:
        logger.error(f"Stripe library not available: {e}")
        raise HTTPException(status_code=500, detail="Payment service unavailable")
    except Exception as e:
        logger.error(f"Stripe session creation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create payment session: {str(e)}")


@router.get("/status/{session_id}")
async def get_stripe_payment_status(session_id: str):
    """
    Get the status of a Stripe checkout session
    """
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        status = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction in database
        if db is not None:
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "status": status.status,
                    "payment_status": status.payment_status,
                    "updated_at": datetime.now(timezone.utc)
                }}
            )
        
        return {
            "session_id": session_id,
            "status": status.status,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total,
            "currency": status.currency,
            "metadata": status.metadata
        }
        
    except Exception as e:
        logger.error(f"Stripe status check error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to check payment status: {str(e)}")


class PharmacyCheckoutRequest(BaseModel):
    origin_url: str
    items: list  # [{name, quantity, price, mrp}]
    patient_phone: str
    patient_name: Optional[str] = None


@router.post("/pharmacy-checkout")
async def create_pharmacy_checkout(request: PharmacyCheckoutRequest, http_request: Request):
    """
    Create a Stripe checkout session for international pharmacy orders.
    Amount is calculated server-side from the item list to prevent price manipulation.
    """
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    if not request.items or len(request.items) == 0:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    try:
        from emergentintegrations.payments.stripe.checkout import (
            StripeCheckout, 
            CheckoutSessionRequest, 
            CheckoutSessionResponse
        )
        
        # Calculate total server-side (prevent frontend price manipulation)
        total_amount = 0.0
        item_descriptions = []
        for item in request.items:
            price = float(item.get("price", 0) or item.get("mrp", 0) or 0)
            qty = int(item.get("quantity", 1))
            total_amount += price * qty
            item_descriptions.append(f"{item.get('name', 'Medicine')} x{qty}")
        
        if total_amount <= 0:
            raise HTTPException(status_code=400, detail="Invalid order total")
        
        # Convert INR to USD (approximate rate for international patients)
        usd_amount = round(total_amount / 85.0, 2)
        
        host_url = str(http_request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        success_url = f"{request.origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}&provider=stripe&type=pharmacy"
        cancel_url = f"{request.origin_url}/cart?payment=cancelled"
        
        metadata = {
            "patient_name": request.patient_name or "",
            "patient_phone": request.patient_phone,
            "product_type": "pharmacy_order",
            "items_count": str(len(request.items)),
            "inr_total": str(total_amount),
            "items_summary": "; ".join(item_descriptions[:5]),
        }
        
        checkout_request = CheckoutSessionRequest(
            amount=usd_amount,
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata
        )
        
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Store transaction
        transaction_record = {
            "session_id": session.session_id,
            "provider": "stripe",
            "amount_usd": usd_amount,
            "amount_inr": total_amount,
            "currency": "usd",
            "patient_name": request.patient_name,
            "patient_phone": request.patient_phone,
            "items": request.items[:10],
            "status": "pending",
            "payment_status": "initiated",
            "created_at": datetime.now(timezone.utc),
            "product_type": "pharmacy_order",
        }
        
        if db is not None:
            await db.payment_transactions.insert_one(transaction_record)
        
        logger.info(f"Stripe pharmacy session created: {session.session_id} — ${usd_amount} (₹{total_amount})")
        
        return {
            "url": session.url,
            "session_id": session.session_id,
            "amount_usd": usd_amount,
            "amount_inr": total_amount,
            "currency": "usd",
        }
        
    except ImportError as e:
        logger.error(f"Stripe library not available: {e}")
        raise HTTPException(status_code=500, detail="Payment service unavailable")
    except Exception as e:
        logger.error(f"Stripe pharmacy checkout error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create payment session: {str(e)}")


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhook events
    """
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        
        body = await request.body()
        signature = request.headers.get("Stripe-Signature", "")
        
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        logger.info(f"Stripe webhook received: {webhook_response.event_type} for session {webhook_response.session_id}")
        
        # Update transaction based on webhook event
        if db is not None and webhook_response.session_id:
            update_data = {
                "status": webhook_response.event_type,
                "payment_status": webhook_response.payment_status,
                "webhook_received_at": datetime.now(timezone.utc)
            }
            
            # If payment completed, mark as paid
            if webhook_response.payment_status == "paid":
                update_data["paid_at"] = datetime.now(timezone.utc)
            
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {"$set": update_data}
            )
        
        return {"status": "received", "event_type": webhook_response.event_type}
        
    except Exception as e:
        logger.error(f"Stripe webhook error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
