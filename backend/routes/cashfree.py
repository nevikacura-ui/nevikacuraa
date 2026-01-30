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

# Initialize Cashfree - Set class attributes
def init_cashfree():
    """Initialize Cashfree SDK with credentials"""
    Cashfree.XClientId = os.environ.get("CASHFREE_CLIENT_ID")
    Cashfree.XClientSecret = os.environ.get("CASHFREE_CLIENT_SECRET")
    
    env = os.environ.get("CASHFREE_ENVIRONMENT", "sandbox")
    if env == "production":
        Cashfree.XEnvironment = Cashfree.PRODUCTION
    else:
        Cashfree.XEnvironment = Cashfree.SANDBOX
    
    return Cashfree()

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
    "monthly": 999,
    "half_yearly": 5499,
    "yearly": 9999
}

@router.post("/create-order", response_model=CashfreeOrderResponse)
async def create_cashfree_order(request: CashfreeOrderRequest):
    """
    Create a new payment order with Cashfree
    Returns payment_session_id for frontend checkout
    """
    try:
        # Validate membership pricing if applicable
        if request.product_type == "membership" and request.membership_plan:
            expected_price = MEMBERSHIP_PRICES.get(request.membership_plan)
            if expected_price and request.amount != expected_price:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid price for {request.membership_plan} plan. Expected ₹{expected_price}"
                )
        
        # Generate unique order ID
        timestamp = int(datetime.now(timezone.utc).timestamp())
        order_id = f"NC_{request.product_type.upper()}_{timestamp}"
        
        # Get return URL
        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
        return_url = request.return_url or f"{frontend_url}/one?order_id={order_id}"
        
        # Initialize Cashfree
        cashfree = init_cashfree()
        
        # Clean phone number - remove +91 and get last 10 digits
        clean_phone = request.customer_phone.replace("+91", "").replace("+", "").replace(" ", "")[-10:]
        
        # Create customer details
        customer_details = CustomerDetails(
            customer_id=request.customer_id,
            customer_phone=clean_phone,
            customer_email=request.customer_email,
            customer_name=request.customer_name
        )
        
        # Create order meta with return URL
        order_meta = OrderMeta(
            return_url=return_url
        )
        
        # Create order request
        create_order_request = CreateOrderRequest(
            order_id=order_id,
            order_amount=float(request.amount),
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
                "customer_id": request.customer_id,
                "customer_name": request.customer_name,
                "customer_email": request.customer_email,
                "customer_phone": request.customer_phone,
                "amount": request.amount,
                "currency": "INR",
                "product_type": request.product_type,
                "product_id": request.product_id,
                "membership_plan": request.membership_plan,
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
        raise HTTPException(status_code=500, detail=f"Payment error: {str(e)}")

@router.get("/order-status/{order_id}", response_model=PaymentStatusResponse)
async def get_order_status(order_id: str):
    """Get payment status for an order"""
    try:
        # First check our database
        order = await db.cashfree_orders.find_one({"order_id": order_id})
        
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
        order = await db.cashfree_orders.find_one({"order_id": order_id})
        
        if not order:
            logger.warning(f"Order not found for webhook: {order_id}")
            return {"status": "success"}  # Return success to prevent retries
        
        # Determine status
        order_status = "ACTIVE"
        if payment_status == "SUCCESS":
            order_status = "PAID"
        elif payment_status == "FAILED":
            order_status = "FAILED"
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
            
            if product_type == "membership":
                await activate_membership_after_payment(order)
            elif product_type == "pharmacy":
                await confirm_pharmacy_order(order)
            elif product_type == "lab_test":
                await confirm_lab_booking(order)
            elif product_type == "appointment":
                await confirm_appointment(order)
        
        logger.info(f"Webhook processed: order={order_id}, status={payment_status}")
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Webhook processing error: {str(e)}")
        return {"status": "success"}  # Return success to prevent retries

async def activate_membership_after_payment(order: dict):
    """Activate membership after successful payment"""
    try:
        plan_type = order.get("membership_plan", "monthly")
        customer_email = order.get("customer_email")
        customer_id = order.get("customer_id")
        
        # Determine duration
        duration_days = {
            "monthly": 30,
            "half_yearly": 180,
            "yearly": 365
        }.get(plan_type, 30)
        
        now = datetime.now(timezone.utc)
        end_date = now + timedelta(days=duration_days)
        
        # Create membership record
        membership = {
            "email": customer_email.lower(),
            "customer_id": customer_id,
            "plan_name": "Nevika Cura ONE",
            "plan_type": "premium",
            "billing_cycle": plan_type,
            "start_date": now.isoformat(),
            "end_date": end_date.isoformat(),
            "status": "active",
            "amount": order.get("amount"),
            "payment_gateway": "cashfree",
            "order_id": order.get("order_id"),
            "created_at": now.isoformat()
        }
        
        # Upsert membership
        await db.memberships.update_one(
            {"email": customer_email.lower()},
            {"$set": membership},
            upsert=True
        )
        
        logger.info(f"Membership activated for {customer_email} - {plan_type}")
        
    except Exception as e:
        logger.error(f"Error activating membership: {str(e)}")

async def confirm_pharmacy_order(order: dict):
    """Confirm pharmacy order after payment"""
    try:
        product_id = order.get("product_id")
        if product_id:
            await db.pharmacy_orders.update_one(
                {"_id": product_id},
                {"$set": {
                    "payment_status": "PAID",
                    "order_status": "confirmed",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        logger.info(f"Pharmacy order confirmed: {product_id}")
    except Exception as e:
        logger.error(f"Error confirming pharmacy order: {str(e)}")

async def confirm_lab_booking(order: dict):
    """Confirm lab booking after payment"""
    try:
        product_id = order.get("product_id")
        if product_id:
            await db.lab_bookings.update_one(
                {"_id": product_id},
                {"$set": {
                    "payment_status": "PAID",
                    "status": "confirmed",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        logger.info(f"Lab booking confirmed: {product_id}")
    except Exception as e:
        logger.error(f"Error confirming lab booking: {str(e)}")

async def confirm_appointment(order: dict):
    """Confirm appointment after payment"""
    try:
        product_id = order.get("product_id")
        if product_id:
            await db.appointments.update_one(
                {"_id": product_id},
                {"$set": {
                    "payment_status": "PAID",
                    "status": "confirmed",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        logger.info(f"Appointment confirmed: {product_id}")
    except Exception as e:
        logger.error(f"Error confirming appointment: {str(e)}")

@router.get("/verify/{order_id}")
async def verify_payment(order_id: str):
    """
    Verify payment status - called after redirect from Cashfree
    """
    try:
        order = await db.cashfree_orders.find_one({"order_id": order_id})
        
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
                
                await db.cashfree_orders.update_one(
                    {"order_id": order_id},
                    {"$set": update_data}
                )
                
                return {
                    "success": cf_status == "PAID",
                    "order_id": order_id,
                    "order_status": cf_status,
                    "payment_status": payment_info.get("payment_status") if payment_info else None,
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
