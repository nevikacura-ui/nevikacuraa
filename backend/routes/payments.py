"""
Stripe Payment Routes
Handles payment processing for appointments, pharmacy orders, and lab tests
"""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os
import logging
import resend
import asyncio
import io

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, 
    CheckoutSessionResponse, 
    CheckoutStatusResponse, 
    CheckoutSessionRequest
)

# PDF Generation
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

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
        transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        
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
        
        # Send payment receipt email and SMS confirmation
        if transaction:
            await send_payment_receipt(transaction, payment_type)
            await send_payment_sms_confirmation(transaction, payment_type)
        
    except Exception as e:
        logger.error(f"Error updating payment reference: {e}")


async def send_payment_receipt(transaction: dict, payment_type: str):
    """Send payment receipt email to patient"""
    if not RESEND_API_KEY:
        logger.warning("Resend not configured, skipping payment receipt email")
        return
    
    patient_name = transaction.get("patient_name", "Patient")
    patient_email = transaction.get("patient_email")
    amount = transaction.get("amount", 0)
    description = transaction.get("description", "Payment")
    session_id = transaction.get("session_id", "")[:12]
    payment_date = datetime.now(timezone.utc).strftime("%d %b %Y, %I:%M %p")
    
    # Get patient email from related record if not in transaction
    if not patient_email:
        if payment_type == "appointment":
            apt = await db.appointments.find_one({"appointment_id": transaction.get("reference_id")})
            patient_email = apt.get("patient_email") if apt else None
        elif payment_type == "pharmacy":
            order = await db.pharmacy_orders.find_one({"order_id": transaction.get("reference_id")})
            patient_email = order.get("patient_email") if order else None
        elif payment_type == "lab_test":
            booking = await db.lab_bookings.find_one({"booking_id": transaction.get("reference_id")})
            patient_email = booking.get("patient_email") if booking else None
    
    if not patient_email:
        logger.info(f"No patient email for receipt - payment type: {payment_type}")
        return
    
    type_label = {
        "appointment": "Doctor Appointment",
        "pharmacy": "Pharmacy Order",
        "lab_test": "Lab Test Booking"
    }.get(payment_type, "Service")
    
    receipt_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #14b8a6, #0891b2); border-radius: 15px 15px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Payment Receipt</h1>
            <p style="color: rgba(255,255,255,0.9); margin-top: 8px;">Nevika Cura Healthcare</p>
        </div>
        
        <div style="padding: 30px; background: #f8fafc; border: 1px solid #e2e8f0;">
            <div style="text-align: center; margin-bottom: 25px;">
                <div style="display: inline-block; background: #dcfce7; border-radius: 50%; padding: 15px; margin-bottom: 10px;">
                    <span style="font-size: 30px;">✓</span>
                </div>
                <h2 style="color: #16a34a; margin: 0;">Payment Successful!</h2>
            </div>
            
            <div style="background: white; border-radius: 10px; padding: 20px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Patient Name</td>
                        <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #1e293b; border-bottom: 1px solid #f1f5f9;">{patient_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Service Type</td>
                        <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #1e293b; border-bottom: 1px solid #f1f5f9;">{type_label}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Description</td>
                        <td style="padding: 10px 0; text-align: right; color: #1e293b; border-bottom: 1px solid #f1f5f9;">{description}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Transaction ID</td>
                        <td style="padding: 10px 0; text-align: right; font-family: monospace; color: #1e293b; border-bottom: 1px solid #f1f5f9;">{session_id}...</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Date & Time</td>
                        <td style="padding: 10px 0; text-align: right; color: #1e293b; border-bottom: 1px solid #f1f5f9;">{payment_date} IST</td>
                    </tr>
                    <tr>
                        <td style="padding: 15px 0; color: #1e293b; font-size: 18px; font-weight: bold;">Amount Paid</td>
                        <td style="padding: 15px 0; text-align: right; font-size: 24px; font-weight: bold; color: #14b8a6;">₹{amount}</td>
                    </tr>
                </table>
            </div>
            
            <p style="color: #64748b; font-size: 14px; text-align: center; margin: 0;">
                Thank you for choosing Nevika Cura Healthcare.<br>
                For any queries, contact us at <a href="tel:+919403890429" style="color: #14b8a6;">+91 9403890429</a>
            </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
            <p style="margin: 0;">Nevika Cura Healthcare | www.nevikacura.com</p>
            <p style="margin: 5px 0 0 0;">This is an automated receipt. Please save for your records.</p>
        </div>
    </div>
    """
    
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [patient_email],
            "subject": f"Payment Receipt - ₹{amount} | Nevika Cura",
            "html": receipt_html
        }
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Payment receipt email sent to {patient_email}: {result.get('id')}")
    except Exception as e:
        logger.error(f"Failed to send payment receipt email: {e}")


async def send_payment_sms_confirmation(transaction: dict, payment_type: str):
    """Send SMS confirmation for successful payment"""
    if not twilio_client or not TWILIO_PHONE_NUMBER:
        logger.warning("Twilio not configured, skipping payment SMS")
        return
    
    patient_phone = transaction.get("patient_phone")
    if not patient_phone:
        return
    
    patient_name = transaction.get("patient_name", "Patient")
    amount = transaction.get("amount", 0)
    
    type_label = {
        "appointment": "appointment booking",
        "pharmacy": "pharmacy order",
        "lab_test": "lab test booking"
    }.get(payment_type, "service")
    
    message = f"""Nevika Cura - Payment Confirmed!

Hi {patient_name.split()[0]},
Your payment of ₹{amount} for {type_label} is successful.

Thank you for choosing Nevika Cura!
- Nevika Cura Healthcare"""
    
    try:
        formatted_to = patient_phone.strip()
        if not formatted_to.startswith('+'):
            if len(formatted_to) == 10:
                formatted_to = f"+91{formatted_to}"
            else:
                formatted_to = f"+{formatted_to}"
        
        result = await asyncio.to_thread(
            twilio_client.messages.create,
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=formatted_to
        )
        logger.info(f"Payment confirmation SMS sent to {patient_phone}: {result.sid}")
    except Exception as e:
        logger.error(f"Failed to send payment SMS: {e}")


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


@router.get("/receipt/{session_id}/pdf")
async def generate_receipt_pdf(session_id: str):
    """Generate PDF receipt for a payment transaction"""
    
    # Find the transaction
    transaction = await db.payment_transactions.find_one(
        {"session_id": session_id},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Create PDF buffer
    buffer = io.BytesIO()
    
    # Create PDF document
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=30*mm,
        leftMargin=30*mm,
        topMargin=30*mm,
        bottomMargin=30*mm
    )
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=20,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#0d9488')
    )
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#64748b')
    )
    header_style = ParagraphStyle(
        'CustomHeader',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=10,
        textColor=colors.HexColor('#1e293b')
    )
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#334155')
    )
    
    # Build content
    elements = []
    
    # Header
    elements.append(Paragraph("NEVIKA CURA HEALTHCARE", title_style))
    elements.append(Paragraph("Payment Receipt", subtitle_style))
    elements.append(Spacer(1, 20))
    
    # Receipt number and date
    receipt_date = datetime.now(timezone.utc).strftime("%d %B %Y, %I:%M %p IST")
    receipt_no = session_id[:12] if session_id else "N/A"
    
    header_data = [
        ["Receipt No:", receipt_no],
        ["Date:", receipt_date],
    ]
    header_table = Table(header_data, colWidths=[100, 300])
    header_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#64748b')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1e293b')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 20))
    
    # Divider line
    elements.append(Table([[""]],colWidths=[500]))
    
    # Payment Status Banner
    payment_status = transaction.get("payment_status", "pending").upper()
    status_color = colors.HexColor('#16a34a') if payment_status == "PAID" else colors.HexColor('#ca8a04')
    status_data = [[f"Payment Status: {payment_status}"]]
    status_table = Table(status_data, colWidths=[500])
    status_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), status_color),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('ROUNDEDCORNERS', [5, 5, 5, 5]),
    ]))
    elements.append(status_table)
    elements.append(Spacer(1, 20))
    
    # Patient Details
    elements.append(Paragraph("Patient Details", header_style))
    patient_data = [
        ["Name:", transaction.get("patient_name", "N/A")],
        ["Phone:", transaction.get("patient_phone", "N/A")],
    ]
    patient_table = Table(patient_data, colWidths=[100, 300])
    patient_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#64748b')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(patient_table)
    elements.append(Spacer(1, 15))
    
    # Payment Details
    elements.append(Paragraph("Payment Details", header_style))
    
    type_labels = {
        "appointment": "Doctor Appointment",
        "pharmacy": "Pharmacy Order",
        "lab_test": "Lab Test Booking"
    }
    payment_type = transaction.get("payment_type", "service")
    
    payment_data = [
        ["Service Type:", type_labels.get(payment_type, payment_type.replace("_", " ").title())],
        ["Description:", transaction.get("description", "N/A")],
        ["Reference ID:", transaction.get("reference_id", "N/A")[:20] + "..." if transaction.get("reference_id") else "N/A"],
        ["Fee Code:", transaction.get("fee_code", "N/A")],
    ]
    payment_table = Table(payment_data, colWidths=[100, 300])
    payment_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#64748b')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(payment_table)
    elements.append(Spacer(1, 20))
    
    # Amount Box
    amount = transaction.get("amount", 0)
    amount_data = [
        ["Total Amount Paid"],
        [f"₹ {amount}"]
    ]
    amount_table = Table(amount_data, colWidths=[200])
    amount_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0fdfa')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#64748b')),
        ('TEXTCOLOR', (0, 1), (-1, 1), colors.HexColor('#0d9488')),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica'),
        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('FONTSIZE', (0, 1), (-1, 1), 24),
        ('TOPPADDING', (0, 0), (-1, -1), 15),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#99f6e4')),
        ('ROUNDEDCORNERS', [8, 8, 8, 8]),
    ]))
    elements.append(amount_table)
    elements.append(Spacer(1, 30))
    
    # Footer
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#94a3b8')
    )
    elements.append(Paragraph("Thank you for choosing Nevika Cura Healthcare!", footer_style))
    elements.append(Spacer(1, 5))
    elements.append(Paragraph("For queries, contact: +91 9403890429 | www.nevikacura.com", footer_style))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph("This is a computer-generated receipt and does not require a signature.", footer_style))
    
    # Build PDF
    doc.build(elements)
    
    # Prepare response
    buffer.seek(0)
    filename = f"receipt_{receipt_no}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
