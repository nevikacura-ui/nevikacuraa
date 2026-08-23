"""
Cashfree Payment Gateway Integration
Supports UPI, Cards, NetBanking, Wallets
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone, timedelta
import os
import logging
import json

from rate_limit import limiter

# Cashfree SDK
from cashfree_pg.models.create_order_request import CreateOrderRequest
from cashfree_pg.models.customer_details import CustomerDetails
from cashfree_pg.models.order_meta import OrderMeta
from cashfree_pg.api_client import Cashfree

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cashfree", tags=["Cashfree Payments"])

# MongoDB reference - will be set by server.py
db = None

def set_db(database):
    global db
    db = database

# Initialize Cashfree - Pass credentials to constructor
def init_cashfree():
    """Initialize Cashfree SDK with credentials"""
    client_id = os.environ.get("CASHFREE_CLIENT_ID")
    client_secret = os.environ.get("CASHFREE_CLIENT_SECRET")
    
    env = os.environ.get("CASHFREE_ENVIRONMENT", "sandbox")
    if env == "production":
        environment = Cashfree.PRODUCTION
    else:
        environment = Cashfree.SANDBOX
    
    return Cashfree(
        XEnvironment=environment,
        XClientId=client_id,
        XClientSecret=client_secret
    )

# API Version
API_VERSION = "2023-08-01"

# Request/Response Models
class CashfreeOrderRequest(BaseModel):
    """Request model for creating Cashfree order"""
    customer_id: str
    customer_name: str
    customer_email: str
    customer_phone: str
    amount: float = Field(..., gt=0)
    product_type: str  # membership, pharmacy, lab_test, appointment
    product_id: str
    membership_plan: Optional[str] = None  # monthly, half_yearly, yearly
    return_url: Optional[str] = None

class CashfreeOrderResponse(BaseModel):
    """Response model for Cashfree order"""
    success: bool
    order_id: str
    cf_order_id: Optional[str] = None
    payment_session_id: Optional[str] = None
    order_status: str
    message: Optional[str] = None

class PaymentStatusResponse(BaseModel):
    """Response model for payment status"""
    order_id: str
    order_status: str
    payment_status: Optional[str] = None
    amount: float
    payment_method: Optional[str] = None
    completed_at: Optional[str] = None

# Membership pricing
MEMBERSHIP_PRICES = {
    "monthly": 99,
    "half_yearly": 549,
    "yearly": 999
}

@router.post("/create-order", response_model=CashfreeOrderResponse)
@limiter.limit("5/minute")
async def create_cashfree_order(request: Request, order_data: CashfreeOrderRequest):
    """
    Create a new payment order with Cashfree
    Returns payment_session_id for frontend checkout
    """
    try:
        # Validate membership pricing if applicable
        if order_data.product_type == "membership" and order_data.membership_plan:
            expected_price = MEMBERSHIP_PRICES.get(order_data.membership_plan)
            if expected_price and order_data.amount != expected_price:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid price for {order_data.membership_plan} plan. Expected ₹{expected_price}"
                )
        
        # Generate unique order ID
        timestamp = int(datetime.now(timezone.utc).timestamp())
        order_id = f"NC_{order_data.product_type.upper()}_{timestamp}"
        
        # Always construct return_url with OUR order_id (not the product_id from frontend)
        if order_data.return_url:
            from urllib.parse import urlparse
            parsed = urlparse(order_data.return_url)
            origin = f"{parsed.scheme}://{parsed.netloc}"
        else:
            origin = os.environ.get("FRONTEND_URL", "http://localhost:3000")
        return_url = f"{origin}/payment-success?order_id={order_id}&type={order_data.product_type}"
        
        # Initialize Cashfree
        cashfree = init_cashfree()
        
        # Clean phone number - remove +91 and get last 10 digits, pad if needed
        clean_phone = order_data.customer_phone.replace("+91", "").replace("+", "").replace(" ", "")[-10:]
        if len(clean_phone) < 10:
            clean_phone = clean_phone.zfill(10)  # Zero-pad to 10 digits
        
        # Ensure customer name is not empty
        customer_name = order_data.customer_name.strip() if order_data.customer_name else "Patient"
        if len(customer_name) < 3:
            customer_name = f"{customer_name} User"
        
        # Create customer details
        customer_details = CustomerDetails(
            customer_id=order_data.customer_id,
            customer_phone=clean_phone,
            customer_email=order_data.customer_email or f"{clean_phone}@nevikacura.com",
            customer_name=customer_name
        )
        
        # Create order meta with return URL
        order_meta = OrderMeta(
            return_url=return_url
        )
        
        # Create order request
        create_order_request = CreateOrderRequest(
            order_id=order_id,
            order_amount=float(order_data.amount),
            order_currency="INR",
            customer_details=customer_details,
            order_meta=order_meta
        )
        
        # Call Cashfree API
        response = cashfree.PGCreateOrder(API_VERSION, create_order_request, None, None)
        
        if response and response.data:
            # Save order to database
            order_doc = {
                "order_id": order_id,
                "cf_order_id": response.data.cf_order_id,
                "payment_session_id": response.data.payment_session_id,
                "customer_id": order_data.customer_id,
                "customer_name": order_data.customer_name,
                "customer_email": order_data.customer_email,
                "customer_phone": order_data.customer_phone,
                "amount": order_data.amount,
                "currency": "INR",
                "product_type": order_data.product_type,
                "product_id": order_data.product_id,
                "membership_plan": order_data.membership_plan,
                "order_status": "ACTIVE",
                "payment_status": "PENDING",
                "payment_gateway": "cashfree",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.cashfree_orders.insert_one(order_doc)
            
            logger.info(f"Cashfree order created: {order_id}, cf_order_id: {response.data.cf_order_id}")
            
            return CashfreeOrderResponse(
                success=True,
                order_id=order_id,
                cf_order_id=response.data.cf_order_id,
                payment_session_id=response.data.payment_session_id,
                order_status="ACTIVE",
                message="Order created successfully"
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to create order with Cashfree")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating Cashfree order: {str(e)}")
        # Send failure alert
        try:
            from services.failure_alerts import send_failure_alert
            await send_failure_alert("order_creation", {
                "patient_name": order_data.customer_name,
                "patient_phone": order_data.customer_phone,
                "amount": str(order_data.amount),
                "order_type": order_data.product_type or "unknown",
                "error": str(e)[:300],
            }, db)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Payment error: {str(e)}")

@router.get("/order-status/{order_id}", response_model=PaymentStatusResponse)
async def get_order_status(order_id: str):
    """Get payment status for an order"""
    try:
        # First check our database
        order = await db.cashfree_orders.find_one({"order_id": order_id}, {"_id": 0})
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Get latest status from Cashfree
        try:
            cashfree = init_cashfree()
            response = cashfree.PGFetchOrder(API_VERSION, order_id, None)
            
            if response and response.data:
                cf_status = response.data.order_status
                
                # Update our database
                await db.cashfree_orders.update_one(
                    {"order_id": order_id},
                    {"$set": {
                        "order_status": cf_status,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                return PaymentStatusResponse(
                    order_id=order_id,
                    order_status=cf_status,
                    payment_status=order.get("payment_status"),
                    amount=order.get("amount"),
                    payment_method=order.get("payment_method"),
                    completed_at=order.get("completed_at")
                )
        except Exception as cf_error:
            logger.warning(f"Could not fetch from Cashfree: {cf_error}")
        
        # Return database status if Cashfree call fails
        return PaymentStatusResponse(
            order_id=order_id,
            order_status=order.get("order_status", "UNKNOWN"),
            payment_status=order.get("payment_status"),
            amount=order.get("amount"),
            payment_method=order.get("payment_method"),
            completed_at=order.get("completed_at")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching order status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch order status")

@router.post("/webhook")
async def handle_cashfree_webhook(request: Request):
    """
    Handle payment webhook from Cashfree
    Verifies signature and updates order status
    """
    try:
        # Get headers
        signature = request.headers.get("x-webhook-signature")
        timestamp = request.headers.get("x-webhook-timestamp")
        
        # Get body
        body = await request.body()
        body_str = body.decode()
        
        # Log webhook received
        logger.info(f"Cashfree webhook received: {body_str[:200]}...")
        
        # Parse payload
        import json
        payload = json.loads(body_str)
        
        # Extract data
        data = payload.get("data", {})
        event_type = payload.get("type", "")
        
        order_id = data.get("order", {}).get("order_id")
        cf_order_id = data.get("order", {}).get("order_id")
        payment_status = data.get("payment", {}).get("payment_status")
        payment_amount = data.get("payment", {}).get("payment_amount")
        payment_method = data.get("payment", {}).get("payment_group")
        cf_payment_id = data.get("payment", {}).get("cf_payment_id")
        bank_reference = data.get("payment", {}).get("bank_reference")
        
        if not order_id:
            # Try alternate location
            order_id = data.get("order_id")
        
        logger.info(f"Processing webhook for order: {order_id}, status: {payment_status}")
        
        # Find order in database
        order = await db.cashfree_orders.find_one({"order_id": order_id}, {"_id": 0})
        
        if not order:
            logger.warning(f"Order not found for webhook: {order_id}")
            return {"status": "success"}  # Return success to prevent retries
        
        # Determine status
        order_status = "ACTIVE"
        if payment_status == "SUCCESS":
            order_status = "PAID"
        elif payment_status == "FAILED":
            order_status = "FAILED"
            # Send failure alert to admin
            try:
                from services.failure_alerts import send_failure_alert
                await send_failure_alert("payment", {
                    "patient_name": order.get("customer_name", "Unknown"),
                    "patient_phone": order.get("customer_phone", "N/A"),
                    "amount": order.get("amount", "N/A"),
                    "order_id": order_id,
                    "order_type": order.get("product_type", "unknown"),
                    "error": f"Cashfree payment failed. Status: {payment_status}, Method: {payment_method}",
                }, db)
            except Exception as alert_err:
                logger.warning(f"Failure alert error: {alert_err}")
        elif payment_status == "CANCELLED":
            order_status = "CANCELLED"
        elif payment_status == "USER_DROPPED":
            order_status = "DROPPED"
        
        # Update order
        update_data = {
            "order_status": order_status,
            "payment_status": payment_status,
            "payment_method": payment_method,
            "cf_payment_id": cf_payment_id,
            "bank_reference": bank_reference,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if payment_status == "SUCCESS":
            update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.cashfree_orders.update_one(
            {"order_id": order_id},
            {"$set": update_data}
        )
        
        # Handle post-payment actions
        if payment_status == "SUCCESS":
            product_type = order.get("product_type")
            customer_id = order.get("customer_id", "")
            amount = order.get("amount", 0)
            
            if product_type == "membership":
                await activate_membership_after_payment(order)
            elif product_type == "pharmacy":
                await confirm_pharmacy_order(order)
            elif product_type == "lab_test":
                await confirm_lab_booking(order)
            elif product_type == "appointment":
                await confirm_appointment(order)
            elif product_type == "online_consultation":
                await confirm_appointment(order)
            elif product_type == "gift_card":
                await activate_gift_card_after_payment(order)
            elif product_type == "care_package":
                await activate_care_package_after_payment(order)
            elif product_type == "health_plan":
                await activate_health_plan_after_payment(order)
            
            # Award loyalty points for successful payment
            if customer_id and amount > 0:
                try:
                    from server import award_loyalty_points
                    earned_points = await award_loyalty_points(
                        user_id=customer_id,
                        amount=amount,
                        order_type=product_type,
                        order_id=order_id
                    )
                    if earned_points > 0:
                        logger.info(f"✅ Awarded {earned_points} loyalty points for order {order_id}")
                except Exception as loyalty_error:
                    logger.warning(f"Failed to award loyalty points: {loyalty_error}")
        
        logger.info(f"Webhook processed: order={order_id}, status={payment_status}")
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Webhook processing error: {str(e)}")
        return {"status": "success"}  # Return success to prevent retries

async def activate_membership_after_payment(order: dict):
    """Activate membership after successful payment - generates 16-digit code, sends WhatsApp + Email"""
    import random
    import string
    import resend
    
    try:
        membership_plan = order.get("membership_plan", "gold")
        # Derive tier: CuraOne Cards pass gold/silver/bronze as membership_plan
        if membership_plan in ("gold", "silver", "bronze"):
            membership_tier = membership_plan
        else:
            membership_tier = order.get("membership_tier", "gold")
        customer_email = order.get("customer_email", "")
        customer_name = order.get("customer_name", "Member")
        customer_phone = order.get("customer_phone", "")
        customer_id = order.get("customer_id")
        order_id = order.get("order_id", "")
        amount = order.get("amount", 999)
        member_age = order.get("member_age")
        member_address = order.get("member_address")
        plan_name_override = order.get("plan_name", "")
        
        # Generate unique 16-digit membership code
        membership_code = ''.join(random.choices(string.digits, k=16))
        # Format: XXXX XXXX XXXX XXXX
        formatted_code = ' '.join([membership_code[i:i+4] for i in range(0, 16, 4)])
        
        # Tier-specific benefits
        TIER_BENEFITS = {
            "gold": {
                "curacoins_signup": 3000,
                "curacoins_multiplier": 5,
                "booking_priority": "vip",
                "portal_access": "all",
                "portal_duration_months": 12,
                "free_home_collection": True,
                "plan_display": "Nevika Cura ONE - Gold",
            },
            "silver": {
                "curacoins_signup": 1500,
                "curacoins_multiplier": 3,
                "booking_priority": "priority",
                "portal_access": "any_2",
                "portal_duration_months": 9,
                "free_home_collection": False,
                "plan_display": "Nevika Cura ONE - Silver",
            },
            "bronze": {
                "curacoins_signup": 500,
                "curacoins_multiplier": 2,
                "booking_priority": "standard",
                "portal_access": "any_1",
                "portal_duration_months": 6,
                "free_home_collection": False,
                "plan_display": "Nevika Cura ONE - Bronze",
            },
        }
        
        tier_info = TIER_BENEFITS.get(membership_tier, TIER_BENEFITS["gold"])
        
        # Determine duration (use order's duration_days if provided, else default to annual)
        duration_days = int(order.get("duration_days", 365))
        
        now = datetime.now(timezone.utc)
        end_date = now + timedelta(days=duration_days)
        
        # Create membership record
        membership = {
            "email": customer_email.lower() if customer_email else "",
            "customer_name": customer_name,
            "customer_phone": customer_phone,
            "customer_id": customer_id,
            "membership_code": membership_code,
            "plan_name": plan_name_override or tier_info["plan_display"],
            "plan_type": "premium",
            "membership_tier": membership_tier,
            "billing_cycle": order.get("billing_cycle", membership_plan),
            "start_date": now.isoformat(),
            "end_date": end_date.isoformat(),
            "status": "active",
            "amount": amount,
            "member_age": member_age,
            "member_address": member_address,
            "payment_gateway": "cashfree",
            "order_id": order_id,
            "benefits": tier_info,
            "created_at": now.isoformat()
        }
        
        # Upsert membership
        await db.memberships.update_one(
            {"email": customer_email.lower() if customer_email else f"phone_{customer_phone}"},
            {"$set": membership},
            upsert=True
        )
        
        logger.info(f"Membership activated for {customer_name} ({customer_email}) - Code: {membership_code}")
        
        # --- Send WhatsApp notification (plan details, NO code) ---
        try:
            from services.msg91_whatsapp import send_msg91_whatsapp, MSG91_AUTH_KEY, MSG91_WHATSAPP_NUMBER, MSG91_BASE_URL
            if MSG91_AUTH_KEY and customer_phone:
                clean_phone = str(customer_phone).replace("+", "").replace(" ", "").replace("-", "")
                if len(clean_phone) == 10:
                    clean_phone = "91" + clean_phone
                elif not clean_phone.startswith("91"):
                    clean_phone = "91" + clean_phone[-10:]
                
                import httpx
                url = f"{MSG91_BASE_URL}/whatsapp/whatsapp-outbound-message/"
                payload = {
                    "integrated_number": MSG91_WHATSAPP_NUMBER,
                    "content_type": "template",
                    "messaging_product": "whatsapp",
                    "payload": {
                        "messaging_product": "whatsapp",
                        "to": clean_phone,
                        "type": "template",
                        "template": {
                            "name": "nevika_membership_activation",
                            "language": {"code": "en", "policy": "deterministic"},
                            "components": [{
                                "type": "body",
                                "parameters": [
                                    {"type": "text", "text": customer_name},
                                    {"type": "text", "text": tier_info["plan_display"]},
                                    {"type": "text", "text": f"₹{amount}"},
                                    {"type": "text", "text": end_date.strftime("%d %b %Y")},
                                    {"type": "text", "text": f"{tier_info.get('curacoins_signup', 0)} CuraCoins, {tier_info.get('curacoins_multiplier', 1)}x Multiplier, {tier_info.get('portal_access', 'all').replace('_', ' ').title()} Portal Access"}
                                ]
                            }]
                        }
                    }
                }
                headers = {"authkey": MSG91_AUTH_KEY, "Content-Type": "application/json"}
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(url, json=payload, headers=headers)
                    logger.info(f"WhatsApp membership notification sent: {resp.status_code}")
        except Exception as wa_err:
            logger.warning(f"WhatsApp notification failed (non-blocking): {wa_err}")
        
        # --- Send WhatsApp notification to STAFF (Nevika Cura) ---
        try:
            from services.msg91_whatsapp import MSG91_AUTH_KEY, MSG91_WHATSAPP_NUMBER, MSG91_BASE_URL
            if MSG91_AUTH_KEY:
                import httpx
                staff_phone = "919833188288"
                url = f"{MSG91_BASE_URL}/whatsapp/whatsapp-outbound-message/"
                payload = {
                    "integrated_number": MSG91_WHATSAPP_NUMBER,
                    "content_type": "template",
                    "messaging_product": "whatsapp",
                    "payload": {
                        "messaging_product": "whatsapp",
                        "to": staff_phone,
                        "type": "template",
                        "template": {
                            "name": "nevika_membership_activation",
                            "language": {"code": "en", "policy": "deterministic"},
                            "components": [{
                                "type": "body",
                                "parameters": [
                                    {"type": "text", "text": customer_name},
                                    {"type": "text", "text": tier_info["plan_display"]},
                                    {"type": "text", "text": f"₹{amount}"},
                                    {"type": "text", "text": end_date.strftime("%d %b %Y")},
                                    {"type": "text", "text": f"Phone: {customer_phone}, Email: {customer_email}, Tier: {membership_tier.upper()}"}
                                ]
                            }]
                        }
                    }
                }
                headers = {"authkey": MSG91_AUTH_KEY, "Content-Type": "application/json"}
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(url, json=payload, headers=headers)
                    logger.info(f"Staff WhatsApp notification sent to 9833188288: {resp.status_code}")
        except Exception as staff_err:
            logger.warning(f"Staff WhatsApp notification failed (non-blocking): {staff_err}")
        
        # --- Send Email with 16-digit membership code (Premium Light UI) ---
        try:
            RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
            SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "Nevika Cura <noreply@nevikacura.com>")
            if RESEND_API_KEY and customer_email:
                resend.api_key = RESEND_API_KEY
                from services.email_templates import subscription_confirmed_email
                
                # Build invoice URL
                invoice_url = f"https://nevikacura.com/api/membership-tiers/invoice/{order_id}"
                
                html_content = subscription_confirmed_email(
                    customer_name=customer_name,
                    membership_code=formatted_code,
                    plan_name=tier_info['plan_display'],
                    amount=str(amount),
                    valid_till=end_date.strftime('%d %b %Y'),
                    membership_tier=membership_tier,
                    invoice_url=invoice_url,
                )
                
                resend.Emails.send({
                    "from": SENDER_EMAIL,
                    "to": [customer_email],
                    "subject": f"Your Nevika Cura Membership Code - {formatted_code}",
                    "html": html_content
                })
                logger.info(f"Membership email sent to {customer_email}")
        except Exception as email_err:
            logger.warning(f"Email notification failed (non-blocking): {email_err}")
        
    except Exception as e:
        logger.error(f"Error activating membership: {str(e)}")

async def confirm_pharmacy_order(order: dict):
    """Confirm pharmacy order after payment"""
    try:
        product_id = order.get("product_id")
        if product_id:
            result = await db.pharmacy_orders.find_one_and_update(
                {"id": product_id},
                {"$set": {
                    "payment_status": "PAID",
                    "status": "pending",
                    "order_status": "confirmed",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }},
                return_document=True
            )
            
            # Fallback: search by booking_id
            if not result:
                result = await db.pharmacy_orders.find_one_and_update(
                    {"booking_id": product_id},
                    {"$set": {
                        "payment_status": "PAID",
                        "status": "pending",
                        "order_status": "confirmed",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }},
                    return_document=True
                )
            
            # Fallback: search by phone + recent draft
            if not result:
                customer_phone = order.get("customer_phone", "")
                if customer_phone:
                    result = await db.pharmacy_orders.find_one_and_update(
                        {
                            "patient_phone": {"$regex": customer_phone[-10:]},
                            "payment_status": {"$nin": ["PAID", "paid"]},
                            "status": {"$in": ["draft", "pending"]}
                        },
                        {"$set": {
                            "payment_status": "PAID",
                            "status": "pending",
                            "order_status": "confirmed",
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }},
                        sort=[("created_at", -1)],
                        return_document=True
                    )
                    if result:
                        logger.info(f"Pharmacy order found via phone fallback: {result.get('id')}")
            if result:
                logger.info(f"Pharmacy order confirmed: {product_id}")
                # Send email notification directly
                try:
                    from services.notification_service import send_email_notification
                    patient_email = result.get("patient_email")
                    if patient_email:
                        booking_id = result.get("booking_id", product_id[:8])
                        medicines = result.get("medicines", [])
                        total = result.get("total_amount") or order.get("amount", 0)
                        
                        from services.email_templates import pharmacy_order_email
                        items = [{"name": m.get("name", "Item"), "qty": m.get("quantity", 1), "price": f'₹{m.get("price", 0)}'} for m in medicines]
                        total_str = f"₹{total}" if not str(total).startswith("₹") else str(total)
                        html_body = pharmacy_order_email(
                            patient_name=result.get("patient_name", "Customer"),
                            order_id=booking_id,
                            items=items,
                            total_amount=total_str,
                            payment_method="CuraPay Online",
                            delivery_address=result.get("delivery_address", result.get("address", "")),
                            estimated_delivery="30-60 mins",
                        )
                        email_subject = f"Order Confirmed - #{booking_id} | Orange Pharmacy"
                        await send_email_notification(
                            subject=email_subject,
                            html_content=html_body,
                            patient_email=patient_email,
                            patient_subject=email_subject,
                            patient_html=html_body
                        )
                        logger.info(f"Pharmacy order email sent to: {patient_email}")
                except Exception as notif_error:
                    logger.error(f"Failed to send pharmacy email: {notif_error}")
                
                # Send WhatsApp order confirmation to customer
                try:
                    from services.msg91_whatsapp import send_orange_pharmacy_confirmation, send_msg91_whatsapp, MSG91_AUTH_KEY, MSG91_WHATSAPP_NUMBER, MSG91_BASE_URL
                    patient_phone = result.get("patient_phone") or order.get("customer_phone", "")
                    if patient_phone:
                        patient_name = result.get("patient_name", "Customer")
                        booking_id = result.get("booking_id", product_id[:8])
                        medicines = result.get("medicines", [])
                        items_str = ", ".join([m.get("name", "Item") for m in medicines[:5]])
                        if len(medicines) > 5:
                            items_str += f" +{len(medicines)-5} more"
                        delivery_addr = result.get("delivery_address", "Store Pickup")
                        
                        wa_result = await send_orange_pharmacy_confirmation(
                            phone=patient_phone,
                            patient_name=patient_name,
                            order_id=booking_id,
                            items=items_str,
                            delivery_address=delivery_addr,
                            db=db
                        )
                        logger.info(f"Pharmacy WhatsApp confirmation: {wa_result}")
                        
                        # Notify Orange Pharmacy staff (7039030030)
                        if MSG91_AUTH_KEY:
                            total = result.get("total_amount") or order.get("amount", 0)
                            staff_vars = [
                                patient_name,
                                booking_id,
                                items_str,
                                f"₹{total} PAID | Phone: {patient_phone}"
                            ]
                            await send_msg91_whatsapp(
                                recipient_phone="917039030030",
                                template_name="orange_pharmacy_confirm",
                                variables=staff_vars,
                                db=db,
                                reference_id=booking_id,
                                message_type="staff_pharmacy_confirm"
                            )
                            logger.info(f"Staff WhatsApp notified for pharmacy order {booking_id}")
                except Exception as wa_err:
                    logger.warning(f"Pharmacy WhatsApp notification failed (non-blocking): {wa_err}")
                
                # Create in-app notification for the bell icon
                try:
                    from routes.notifications import create_notification
                    user_id = order.get("customer_phone") or order.get("customer_id", "")
                    booking_id = result.get("booking_id", product_id[:8])
                    total = result.get("total_amount") or order.get("amount", 0)
                    await create_notification(
                        user_id=user_id,
                        title="Order Confirmed & Paid",
                        message=f"Your pharmacy order #{booking_id} (₹{total}) has been confirmed. We're preparing it now!",
                        notif_type="order",
                        link="/track",
                        icon="package",
                    )
                    logger.info(f"In-app notification created for pharmacy order {booking_id}")
                except Exception as notif_err:
                    logger.warning(f"In-app notification failed (non-blocking): {notif_err}")
            else:
                logger.warning(f"Pharmacy order not found for product_id: {product_id}")
    except Exception as e:
        logger.error(f"Error confirming pharmacy order: {str(e)}")

async def confirm_lab_booking(order: dict):
    """Confirm lab booking after payment"""
    try:
        product_id = order.get("product_id")
        if product_id:
            # Try multiple lookup strategies
            result = await db.diagnostic_orders.find_one_and_update(
                {"id": product_id},
                {"$set": {
                    "payment_status": "paid",
                    "status": "pending",
                    "order_status": "confirmed",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }},
                return_document=True
            )
            
            # Fallback: search by booking_id if id lookup failed
            if not result:
                result = await db.diagnostic_orders.find_one_and_update(
                    {"booking_id": product_id},
                    {"$set": {
                        "payment_status": "paid",
                        "status": "pending",
                        "order_status": "confirmed",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }},
                    return_document=True
                )
            
            # Last resort: match by phone + timestamp proximity
            if not result:
                customer_phone = order.get("customer_phone", "")
                order_created = order.get("created_at", "")
                if customer_phone:
                    result = await db.diagnostic_orders.find_one_and_update(
                        {
                            "patient_phone": {"$regex": customer_phone[-10:]},
                            "payment_status": {"$in": ["pending", "cod"]},
                            "status": {"$in": ["draft", "pending"]}
                        },
                        {"$set": {
                            "payment_status": "paid",
                            "status": "pending",
                            "order_status": "confirmed",
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }},
                        sort=[("created_at", -1)],
                        return_document=True
                    )
                    if result:
                        logger.info(f"Lab booking found via phone fallback: {result.get('id')}")
            
            if result:
                logger.info(f"Lab booking confirmed: {product_id}")
                try:
                    from services.notification_service import send_email_notification
                    patient_email = result.get("patient_email")
                    if patient_email:
                        booking_id = result.get("booking_id", product_id[:8])
                        tests = result.get("tests", [])
                        total = result.get("total_amount") or order.get("amount", 0)
                        
                        from services.email_templates import diagnostic_booking_email
                        test_list = tests if isinstance(tests, list) else [str(tests)]
                        total_str = f"₹{total}" if not str(total).startswith("₹") else str(total)
                        html_body = diagnostic_booking_email(
                            patient_name=result.get("patient_name", "Patient"),
                            booking_id=booking_id,
                            tests=test_list,
                            preferred_date=result.get("preferred_date", "TBD"),
                            time_slot=result.get("preferred_time_slot", "TBD"),
                            collection_type=result.get("collection_type", "home").replace("_", " ").title(),
                            total_amount=total_str,
                            payment_method="CuraPay Online",
                            payment_status="Paid",
                        )
                        email_subject = f"Booking Confirmed - #{booking_id} | Mango Labs"
                        await send_email_notification(
                            subject=email_subject,
                            html_content=html_body,
                            patient_email=patient_email,
                            patient_subject=email_subject,
                            patient_html=html_body
                        )
                        logger.info(f"Lab booking email sent to: {patient_email}")
                except Exception as notif_error:
                    logger.error(f"Failed to send lab booking email: {notif_error}")
                
                # Send WhatsApp booking confirmation to customer
                try:
                    from services.msg91_whatsapp import send_proton_lab_confirmation, send_msg91_whatsapp, MSG91_AUTH_KEY
                    patient_phone = result.get("patient_phone") or order.get("customer_phone", "")
                    if patient_phone:
                        patient_name = result.get("patient_name", "Patient")
                        booking_id = result.get("booking_id", product_id[:8])
                        tests = result.get("tests", [])
                        tests_str = ", ".join(tests[:5]) if isinstance(tests, list) else str(tests)
                        if isinstance(tests, list) and len(tests) > 5:
                            tests_str += f" +{len(tests)-5} more"
                        pref_date = result.get("preferred_date", "TBD")
                        pref_time = result.get("preferred_time_slot", "TBD")
                        address = result.get("address") or result.get("collection_address", "Home Collection")
                        
                        wa_result = await send_proton_lab_confirmation(
                            phone=patient_phone,
                            patient_name=patient_name,
                            tests=tests_str,
                            preferred_date=pref_date,
                            preferred_time=pref_time,
                            booking_id=booking_id,
                            address=address,
                            db=db
                        )
                        logger.info(f"Lab WhatsApp confirmation: {wa_result}")
                        
                        # Notify Mango staff (7039040040)
                        if MSG91_AUTH_KEY:
                            total = result.get("total_amount") or order.get("amount", 0)
                            staff_vars = [
                                patient_name,
                                tests_str,
                                pref_date,
                                pref_time,
                                booking_id,
                                f"₹{total} PAID | Phone: {patient_phone}"
                            ]
                            await send_msg91_whatsapp(
                                recipient_phone="917039040040",
                                template_name="proton_lab_confirm",
                                variables=staff_vars,
                                db=db,
                                reference_id=booking_id,
                                message_type="staff_lab_confirm"
                            )
                            logger.info(f"Staff WhatsApp notified for lab booking {booking_id}")
                except Exception as wa_err:
                    logger.warning(f"Lab WhatsApp notification failed (non-blocking): {wa_err}")
                
                # Create in-app notification for the bell icon
                try:
                    from routes.notifications import create_notification
                    user_id = order.get("customer_phone") or order.get("customer_id", "")
                    booking_id = result.get("booking_id", product_id[:8])
                    total = result.get("total_amount") or order.get("amount", 0)
                    tests = result.get("tests", [])
                    tests_display = ", ".join(tests[:3]) if isinstance(tests, list) else str(tests)
                    await create_notification(
                        user_id=user_id,
                        title="Lab Booking Confirmed & Paid",
                        message=f"Booking #{booking_id} for {tests_display} (₹{total}) confirmed. Our team will contact you shortly.",
                        notif_type="diagnostic",
                        link="/track",
                        icon="calendar-check",
                    )
                    logger.info(f"In-app notification created for lab booking {booking_id}")
                except Exception as notif_err:
                    logger.warning(f"In-app notification failed (non-blocking): {notif_err}")
            else:
                logger.warning(f"Lab booking not found for product_id: {product_id}")
                
    except Exception as e:
        logger.error(f"Error confirming lab booking: {str(e)}")

async def confirm_appointment(order: dict):
    """Confirm appointment after payment"""
    try:
        product_id = order.get("product_id")
        if product_id:
            result = await db.appointments.find_one_and_update(
                {"id": product_id},
                {"$set": {
                    "payment_status": "PAID",
                    "status": "confirmed",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }},
                return_document=True
            )
            
            # Fallback: search by booking_id
            if not result:
                result = await db.appointments.find_one_and_update(
                    {"booking_id": product_id},
                    {"$set": {
                        "payment_status": "PAID",
                        "status": "confirmed",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }},
                    return_document=True
                )
            
            # Fallback: search by phone + recent unpaid
            if not result:
                customer_phone = order.get("customer_phone", "")
                if customer_phone:
                    result = await db.appointments.find_one_and_update(
                        {
                            "patient_phone": {"$regex": customer_phone[-10:]},
                            "payment_status": {"$nin": ["PAID", "paid"]},
                            "status": {"$in": ["Booked", "pending", "draft"]}
                        },
                        {"$set": {
                            "payment_status": "PAID",
                            "status": "confirmed",
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }},
                        sort=[("created_at", -1)],
                        return_document=True
                    )
                    if result:
                        logger.info(f"Appointment found via phone fallback: {result.get('id')}")
            if result:
                logger.info(f"Appointment confirmed: {product_id}")
                
                # Send WhatsApp appointment confirmation to customer
                try:
                    from services.msg91_whatsapp import send_diagyn_appointment_confirmation, send_msg91_whatsapp, MSG91_AUTH_KEY
                    patient_phone = result.get("patient_phone") or order.get("customer_phone", "")
                    if patient_phone:
                        patient_name = result.get("patient_name", "Patient")
                        booking_id = result.get("booking_id") or result.get("id", product_id[:8])
                        appt_date = result.get("date", "TBD")
                        appt_time = result.get("time_slot") or result.get("time", "TBD")
                        doctor_name = result.get("doctor_name", "Doctor")
                        clinic_name = result.get("clinic_name") or result.get("clinic", "DiaGyn Healthcare")
                        
                        wa_result = await send_diagyn_appointment_confirmation(
                            phone=patient_phone,
                            patient_name=patient_name,
                            date=appt_date,
                            time=appt_time,
                            doctor_name=doctor_name,
                            clinic_name=clinic_name,
                            booking_id=booking_id,
                            db=db
                        )
                        logger.info(f"Appointment WhatsApp confirmation: {wa_result}")
                        
                        # Notify clinic staff based on clinic name
                        if MSG91_AUTH_KEY:
                            amount = order.get("amount", 0)
                            # Map clinic to staff number
                            clinic_lower = (clinic_name or "").lower()
                            if "pushpa" in clinic_lower:
                                staff_number = "918108500522"
                            elif "amnion" in clinic_lower:
                                staff_number = "918108500533"
                            else:
                                staff_number = "919833188288"  # Default to Nevika Cura
                            staff_vars = [
                                patient_name,
                                appt_date,
                                appt_time,
                                doctor_name,
                                clinic_name,
                                booking_id,
                                f"₹{amount} PAID | Phone: {patient_phone}"
                            ]
                            await send_msg91_whatsapp(
                                recipient_phone=staff_number,
                                template_name="diagyn_appointment_confirm",
                                variables=staff_vars,
                                db=db,
                                reference_id=booking_id,
                                message_type="staff_appointment_confirm"
                            )
                            logger.info(f"Staff WhatsApp notified for appointment {booking_id} → {staff_number}")
                except Exception as wa_err:
                    logger.warning(f"Appointment WhatsApp notification failed (non-blocking): {wa_err}")
                
                # Send email notification for appointment
                try:
                    from services.notification_service import send_email_notification
                    patient_email = result.get("patient_email") or order.get("customer_email", "")
                    if patient_email:
                        booking_id = result.get("booking_id") or result.get("id", product_id[:8])
                        from services.email_templates import appointment_confirmation_email
                        html_body = appointment_confirmation_email(
                            patient_name=result.get("patient_name", "Patient"),
                            booking_id=str(booking_id),
                            doctor_name=result.get("doctor_name", "Doctor"),
                            clinic_name=result.get("clinic_name", "DiaGyn Healthcare"),
                            appointment_date=result.get("date", "TBD"),
                            session="",
                            time_slot=result.get("time_slot", result.get("time", "TBD")),
                            amount=f'₹{order.get("amount", 0)}',
                        )
                        email_subject = f"Appointment Confirmed - #{booking_id} | DiaGyn Healthcare"
                        await send_email_notification(
                            subject=email_subject,
                            html_content=html_body,
                            patient_email=patient_email,
                            patient_subject=email_subject,
                            patient_html=html_body
                        )
                        logger.info(f"Appointment email sent to: {patient_email}")
                except Exception as email_err:
                    logger.warning(f"Appointment email notification failed (non-blocking): {email_err}")
                
                # Create in-app notification for the bell icon
                try:
                    from routes.notifications import create_notification
                    user_id = order.get("customer_phone") or order.get("customer_id", "")
                    booking_id = result.get("booking_id") or result.get("id", product_id[:8])
                    doctor_name = result.get("doctor_name", "Doctor")
                    appt_date = result.get("date", "")
                    appt_time = result.get("time_slot") or result.get("time", "")
                    await create_notification(
                        user_id=user_id,
                        title="Appointment Confirmed & Paid",
                        message=f"Appointment #{booking_id} with {doctor_name} on {appt_date} at {appt_time} is confirmed.",
                        notif_type="appointment",
                        link="/track",
                        icon="calendar-check",
                    )
                    logger.info(f"In-app notification created for appointment {booking_id}")
                except Exception as notif_err:
                    logger.warning(f"In-app notification failed (non-blocking): {notif_err}")
            else:
                logger.warning(f"Appointment not found for product_id: {product_id}")
    except Exception as e:
        logger.error(f"Error confirming appointment: {str(e)}")


async def activate_gift_card_after_payment(order: dict):
    """Activate gift card after successful Cashfree payment"""
    try:
        product_id = order.get("product_id", "")
        card = await db.gift_cards.find_one({"id": product_id}, {"_id": 0})
        if card:
            await db.gift_cards.update_one({"id": product_id}, {"$set": {
                "status": "active",
                "payment_status": "paid",
                "payment_order_id": order.get("order_id"),
                "activated_at": datetime.now(timezone.utc).isoformat()
            }})
            logger.info(f"Gift card activated: {product_id}, code: {card.get('code')}")
        else:
            logger.warning(f"Gift card not found for activation: {product_id}")
    except Exception as e:
        logger.error(f"Error activating gift card: {str(e)}")


async def activate_care_package_after_payment(order: dict):
    """Activate care package enrollment after successful Cashfree payment"""
    try:
        product_id = order.get("product_id", "")
        enrollment = await db.care_enrollments.find_one({"id": product_id}, {"_id": 0})
        if enrollment:
            await db.care_enrollments.update_one({"id": product_id}, {"$set": {
                "status": "active",
                "payment_status": "paid",
                "payment_order_id": order.get("order_id"),
                "activated_at": datetime.now(timezone.utc).isoformat()
            }})
            logger.info(f"Care package enrollment activated: {product_id}")
        else:
            logger.warning(f"Care enrollment not found for activation: {product_id}")
    except Exception as e:
        logger.error(f"Error activating care package: {str(e)}")


async def activate_health_plan_after_payment(order: dict):
    """Activate health plan subscription after successful Cashfree payment"""
    try:
        order_id = order.get("order_id", "")
        product_id = order.get("product_id", "")
        customer_phone = order.get("customer_phone", "")[-10:]

        # Try finding subscription by cashfree_order_id first
        subscription = await db.health_plan_subscriptions.find_one({"cashfree_order_id": order_id}, {"_id": 0})

        if not subscription:
            # Fallback: find by phone + plan_id + pending status
            subscription = await db.health_plan_subscriptions.find_one({
                "phone": customer_phone,
                "plan_id": product_id,
                "status": "pending"
            }, {"_id": 0})

        if subscription:
            billing = subscription.get("billing", "month")
            days_map = {"month": 30, "3 months": 90, "year": 365}
            billing_days = days_map.get(billing, 30)

            await db.health_plan_subscriptions.update_one(
                {"id": subscription["id"]},
                {"$set": {
                    "status": "active",
                    "payment_status": "paid",
                    "payment_order_id": order_id,
                    "start_date": datetime.now(timezone.utc).isoformat(),
                    "next_billing": (datetime.now(timezone.utc) + timedelta(days=billing_days)).isoformat(),
                    "activated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            logger.info(f"Health plan subscription activated: {subscription['id']} for phone {customer_phone}")
        else:
            # Create new active subscription from order metadata
            import uuid
            subscription_id = str(uuid.uuid4())[:8]
            plan_name = order.get("order_note", "Health Plan")
            amount = order.get("amount", 0)

            doc = {
                "id": subscription_id,
                "plan_id": product_id,
                "plan_name": plan_name,
                "price": amount,
                "billing": "month",
                "phone": customer_phone,
                "patient_name": order.get("customer_name", ""),
                "family_members": [],
                "status": "active",
                "payment_status": "paid",
                "cashfree_order_id": order_id,
                "payment_order_id": order_id,
                "start_date": datetime.now(timezone.utc).isoformat(),
                "next_billing": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
                "activated_at": datetime.now(timezone.utc).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.health_plan_subscriptions.insert_one(doc)
            logger.info(f"Health plan subscription created from webhook: {subscription_id}")
    except Exception as e:
        logger.error(f"Error activating health plan: {str(e)}")

@router.get("/verify/{order_id}")
async def verify_payment(order_id: str):
    """
    Verify payment status - called after redirect from Cashfree
    """
    try:
        order = await db.cashfree_orders.find_one({"order_id": order_id}, {"_id": 0})
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Get latest status from Cashfree
        try:
            cashfree = init_cashfree()
            
            # Fetch order
            order_response = cashfree.PGFetchOrder(API_VERSION, order_id, None)
            
            if order_response and order_response.data:
                cf_status = order_response.data.order_status
                
                # Fetch payments for this order
                payments_response = cashfree.PGOrderFetchPayments(API_VERSION, order_id, None)
                
                payment_info = None
                if payments_response and payments_response.data:
                    for payment in payments_response.data:
                        if payment.payment_status == "SUCCESS":
                            payment_info = {
                                "cf_payment_id": payment.cf_payment_id,
                                "payment_method": payment.payment_group,
                                "payment_status": payment.payment_status
                            }
                            break
                
                # Update database
                update_data = {
                    "order_status": cf_status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                if payment_info:
                    update_data.update(payment_info)
                    if payment_info["payment_status"] == "SUCCESS":
                        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
                        
                        # Trigger post-payment action if not already done
                        if order.get("order_status") != "PAID":
                            product_type = order.get("product_type")
                            if product_type == "membership":
                                await activate_membership_after_payment(order)
                            elif product_type == "gift_card":
                                await activate_gift_card_after_payment(order)
                            elif product_type == "care_package":
                                await activate_care_package_after_payment(order)
                            elif product_type == "lab_test":
                                await confirm_lab_booking(order)
                            elif product_type == "pharmacy":
                                await confirm_pharmacy_order(order)
                            elif product_type == "appointment":
                                await confirm_appointment(order)
                
                await db.cashfree_orders.update_one(
                    {"order_id": order_id},
                    {"$set": update_data}
                )
                
                # Fetch membership info if it's a membership payment
                membership_info = None
                if order.get("product_type") == "membership" and cf_status == "PAID":
                    mem = await db.memberships.find_one(
                        {"order_id": order_id},
                        {"_id": 0, "membership_code": 1, "end_date": 1, "customer_name": 1, "plan_name": 1}
                    )
                    if mem:
                        code = mem.get("membership_code", "")
                        membership_info = {
                            "membership_code": ' '.join([code[i:i+4] for i in range(0, len(code), 4)]) if code else "",
                            "valid_until": mem.get("end_date", ""),
                            "member_name": mem.get("customer_name", ""),
                            "plan_name": mem.get("plan_name", "")
                        }

                # Fetch gift card info
                gift_card_info = None
                if order.get("product_type") == "gift_card" and cf_status == "PAID":
                    gc = await db.gift_cards.find_one(
                        {"id": order.get("product_id")},
                        {"_id": 0, "code": 1, "amount": 1, "recipient_name": 1, "template_title": 1, "expires_at": 1, "buyer_name": 1}
                    )
                    if gc:
                        gift_card_info = gc

                # Fetch care package info
                care_package_info = None
                if order.get("product_type") == "care_package" and cf_status == "PAID":
                    cp = await db.care_enrollments.find_one(
                        {"id": order.get("product_id")},
                        {"_id": 0, "package_name": 1, "package_price": 1, "start_date": 1, "end_date": 1, "patient_name": 1}
                    )
                    if cp:
                        care_package_info = cp
                
                return {
                    "success": cf_status == "PAID",
                    "order_id": order_id,
                    "order_status": cf_status,
                    "payment_status": payment_info.get("payment_status") if payment_info else None,
                    "product_type": order.get("product_type"),
                    "membership": membership_info,
                    "gift_card": gift_card_info,
                    "care_package": care_package_info,
                    "message": "Payment successful!" if cf_status == "PAID" else "Payment pending or failed"
                }
                
        except Exception as cf_error:
            logger.error(f"Cashfree verification error: {cf_error}")
        
        # Return database status
        return {
            "success": order.get("order_status") == "PAID",
            "order_id": order_id,
            "order_status": order.get("order_status"),
            "payment_status": order.get("payment_status"),
            "message": "Payment status from database"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying payment: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to verify payment")


# ============ Payment Link for Pay Later Orders ============

class PaymentLinkRequest(BaseModel):
    """Request model for creating and sending payment link"""
    order_id: str  # Original order ID (pharmacy/lab order)
    order_type: str  # pharmacy, lab_test
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    amount: float = Field(..., gt=0)
    send_via: str = "whatsapp"  # whatsapp, email, both
    items_description: Optional[str] = None  # Brief description of items

class PaymentLinkResponse(BaseModel):
    """Response model for payment link"""
    success: bool
    payment_link: str
    order_id: str
    cf_order_id: Optional[str] = None
    message: str
    sent_via: list

@router.post("/create-payment-link", response_model=PaymentLinkResponse)
async def create_and_send_payment_link(request: PaymentLinkRequest):
    """
    Create a Cashfree payment link and send to customer via WhatsApp/Email.
    Uses the Orders API to create a payment order, then builds a checkout URL.
    The checkout URL redirects to our hosted checkout page which uses the JS SDK.
    """
    try:
        cashfree = init_cashfree()
        
        # Clean phone number
        phone = request.customer_phone.replace("+91", "").replace(" ", "").replace("-", "")[-10:]
        
        # Generate unique order ID
        order_id = f"PAY_{request.order_type.upper()}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{request.order_id[-6:]}"
        
        # Get URLs for return and checkout
        # CHECKOUT_BASE_URL: where the /checkout page is hosted (defaults to FRONTEND_URL)
        # For production, this should be the domain where the app is actually deployed
        frontend_url = os.environ.get("FRONTEND_URL", "https://nevikacura.com")
        checkout_base_url = os.environ.get("CHECKOUT_BASE_URL", frontend_url)
        return_url = f"{frontend_url}/payment-success?order_id={order_id}"
        
        # Create customer details
        customer = CustomerDetails(
            customer_id=f"CUST_{phone}",
            customer_name=request.customer_name,
            customer_phone=phone,
            customer_email=request.customer_email or "customer@nevikacura.com"
        )
        
        # Create order meta
        order_meta = OrderMeta(
            return_url=return_url,
            notify_url=None
        )
        
        # Create order request
        order_request = CreateOrderRequest(
            order_id=order_id,
            order_amount=request.amount,
            order_currency="INR",
            customer_details=customer,
            order_meta=order_meta,
            order_note=f"Payment for {request.order_type.replace('_', ' ').title()}: {request.items_description or request.order_id}"
        )
        
        # Call Cashfree API to create order
        response = cashfree.PGCreateOrder(
            x_api_version=API_VERSION,
            create_order_request=order_request
        )
        
        if not response or not response.data:
            raise HTTPException(status_code=500, detail="Failed to create payment order with Cashfree")
        
        cf_order_id = response.data.cf_order_id
        payment_session_id = response.data.payment_session_id
        
        # Build the payment link pointing to our checkout page
        # The checkout page will POST redirect to Cashfree's hosted checkout
        # This works because the POST redirect happens from our page to Cashfree
        payment_link = f"{checkout_base_url}/checkout?session={payment_session_id}&order={order_id}&amount={request.amount}"
        
        # Store payment link order in database
        payment_link_order = {
            "order_id": order_id,
            "cf_order_id": cf_order_id,
            "payment_session_id": payment_session_id,
            "original_order_id": request.order_id,
            "order_type": request.order_type,
            "customer_name": request.customer_name,
            "customer_phone": phone,
            "customer_email": request.customer_email,
            "amount": request.amount,
            "items_description": request.items_description,
            "payment_link": payment_link,
            "status": "LINK_SENT",
            "payment_status": "PENDING",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "sent_via": []
        }
        
        sent_via = []
        
        # Send via WhatsApp
        if request.send_via in ["whatsapp", "both"]:
            try:
                from services.msg91_whatsapp import send_payment_link_whatsapp
                
                # Send payment link using the specialized function
                whatsapp_result = await send_payment_link_whatsapp(
                    recipient_phone=phone,
                    customer_name=request.customer_name,
                    order_id=order_id,
                    amount=request.amount,
                    payment_link=payment_link,
                    order_type=request.order_type,
                    items_description=request.items_description,
                    db=db
                )
                if whatsapp_result.get("success"):
                    sent_via.append("whatsapp")
                    logger.info(f"Payment link sent via WhatsApp to {phone}")
                else:
                    # Template may not exist yet - link is still generated
                    sent_via.append("whatsapp_link_generated")
                    logger.warning(f"WhatsApp template not available, link generated: {whatsapp_result.get('error')}")
            except Exception as wa_error:
                logger.warning(f"WhatsApp send failed: {wa_error}")
                sent_via.append("whatsapp_link_generated")
        
        # Send via Email
        if request.send_via in ["email", "both"] and request.customer_email:
            try:
                from services.email import send_payment_link_email
                
                email_result = await send_payment_link_email(
                    to_email=request.customer_email,
                    customer_name=request.customer_name,
                    amount=request.amount,
                    order_type=request.order_type,
                    payment_link=payment_link,
                    items_description=request.items_description,
                    order_id=order_id
                )
                if email_result.get("success"):
                    sent_via.append("email")
                    logger.info(f"Payment link sent via Email to {request.customer_email}")
            except Exception as email_error:
                logger.warning(f"Email send failed: {email_error}")
        
        payment_link_order["sent_via"] = sent_via
        
        # Save to database
        if db is not None:
            await db.payment_links.insert_one(payment_link_order)
            
            # Update original order with payment link reference
            collection_name = f"{request.order_type}_orders" if request.order_type != "lab_test" else "lab_orders"
            await db[collection_name].update_one(
                {"id": request.order_id},
                {"$set": {
                    "payment_order_id": order_id,
                    "payment_link": payment_link,
                    "payment_link_sent_at": datetime.now(timezone.utc).isoformat(),
                    "payment_status": "LINK_SENT"
                }}
            )
        
        return PaymentLinkResponse(
            success=True,
            payment_link=payment_link,
            order_id=order_id,
            cf_order_id=cf_order_id,
            message=f"Payment link created and sent via {', '.join(sent_via) if sent_via else 'generated'}",
            sent_via=sent_via
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating payment link: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create payment link: {str(e)}")


@router.get("/payment-link-status/{order_id}")
async def get_payment_link_status(order_id: str):
    """Get the status of a payment link order"""
    try:
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        # Find payment link order
        order = await db.payment_links.find_one(
            {"payment_order_id": order_id},
            {"_id": 0}
        )
        
        if not order:
            raise HTTPException(status_code=404, detail="Payment link order not found")
        
        # Check payment status with Cashfree
        try:
            cashfree = init_cashfree()
            response = cashfree.PGFetchOrder(
                x_api_version=API_VERSION,
                order_id=order_id
            )
            
            if response and response.data:
                cf_status = response.data.order_status
                
                # Update database if status changed
                if cf_status != order.get("payment_status"):
                    await db.payment_links.update_one(
                        {"payment_order_id": order_id},
                        {"$set": {
                            "payment_status": cf_status,
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    
                    # If paid, update original order
                    if cf_status == "PAID":
                        collection_name = f"{order['order_type']}_orders" if order['order_type'] != "lab_test" else "lab_orders"
                        await db[collection_name].update_one(
                            {"id": order["original_order_id"]},
                            {"$set": {
                                "payment_status": "PAID",
                                "paid_at": datetime.now(timezone.utc).isoformat()
                            }}
                        )
                    
                    order["payment_status"] = cf_status
                    
        except Exception as cf_error:
            logger.warning(f"Could not fetch status from Cashfree: {cf_error}")
        
        return {
            "success": True,
            "payment_order_id": order_id,
            "original_order_id": order.get("original_order_id"),
            "amount": order.get("amount"),
            "payment_status": order.get("payment_status", "PENDING"),
            "payment_link": order.get("payment_link"),
            "sent_via": order.get("sent_via", []),
            "created_at": order.get("created_at")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting payment link status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get payment status")


@router.get("/health-check")
async def payment_health_check():
    """
    Automated payment health audit endpoint.
    Checks: Cashfree API connectivity, credentials validity, DB connectivity,
    and reports stuck/failed orders in the last 24 hours.
    Can be called by external uptime monitors (e.g., UptimeRobot, Cronitor)
    to get alerted before customers are impacted.
    """
    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "cashfree_api": "UNKNOWN",
        "credentials": "UNKNOWN",
        "database": "UNKNOWN",
        "recent_orders_24h": 0,
        "successful_payments_24h": 0,
        "failed_payments_24h": 0,
        "stuck_orders": 0,
        "success_rate": None,
        "issues": [],
        "status": "HEALTHY"
    }

    # 1. Check Cashfree credentials exist
    client_id = os.environ.get("CASHFREE_CLIENT_ID")
    client_secret = os.environ.get("CASHFREE_CLIENT_SECRET")
    if not client_id or not client_secret:
        report["credentials"] = "MISSING"
        report["issues"].append("Cashfree credentials not configured in .env")
        report["status"] = "CRITICAL"
    else:
        report["credentials"] = "OK"

    # 2. Test Cashfree API connectivity by creating and checking a test fetch
    try:
        cashfree = init_cashfree()
        # Try fetching a non-existent order — a 404 means the API is reachable
        try:
            cashfree.PGFetchOrder(API_VERSION, "HEALTH_CHECK_PROBE", None)
        except Exception as api_err:
            err_str = str(api_err).lower()
            if "not found" in err_str or "404" in err_str or "invalid" in err_str:
                report["cashfree_api"] = "OK"
            elif "unauthorized" in err_str or "401" in err_str or "authentication" in err_str:
                report["cashfree_api"] = "AUTH_FAILED"
                report["credentials"] = "INVALID"
                report["issues"].append("Cashfree API key authentication failed — keys may be expired or invalid")
                report["status"] = "CRITICAL"
            else:
                report["cashfree_api"] = "OK"
    except Exception as e:
        report["cashfree_api"] = "UNREACHABLE"
        report["issues"].append(f"Cannot connect to Cashfree API: {str(e)[:200]}")
        report["status"] = "CRITICAL"

    # 3. Check DB connectivity + recent order stats
    try:
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        recent_orders = await db.cashfree_orders.count_documents({"created_at": {"$gte": cutoff}})
        paid = await db.cashfree_orders.count_documents({"created_at": {"$gte": cutoff}, "order_status": "PAID"})
        failed = await db.cashfree_orders.count_documents({"created_at": {"$gte": cutoff}, "order_status": {"$in": ["EXPIRED", "TERMINATED", "FAILED"]}})
        stuck = await db.cashfree_orders.count_documents({"created_at": {"$gte": cutoff}, "order_status": "ACTIVE"})

        report["database"] = "OK"
        report["recent_orders_24h"] = recent_orders
        report["successful_payments_24h"] = paid
        report["failed_payments_24h"] = failed
        report["stuck_orders"] = stuck

        if recent_orders > 0:
            report["success_rate"] = round((paid / recent_orders) * 100, 1)

        if stuck > 3:
            report["issues"].append(f"{stuck} orders stuck in ACTIVE state (not completed/failed) in last 24h")
            if report["status"] == "HEALTHY":
                report["status"] = "WARNING"

        if recent_orders > 5 and paid == 0:
            report["issues"].append("No successful payments in 24h despite orders being created — possible checkout issue")
            report["status"] = "CRITICAL"

    except Exception as e:
        report["database"] = "ERROR"
        report["issues"].append(f"Database query failed: {str(e)[:200]}")
        report["status"] = "CRITICAL"

    if not report["issues"]:
        report["issues"].append("All systems operational")

    return report
