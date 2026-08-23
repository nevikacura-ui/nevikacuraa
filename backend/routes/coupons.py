"""Coupon Validation & Management API Routes - Extracted from server.py"""
from fastapi import APIRouter, HTTPException, Depends, Body, Header
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from database import get_db
from services.notification_service import (
    send_email_notification, send_push_notification, send_push_to_staff, notify_staff_new_order
)
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class PharmacyOrderCreate(BaseModel):
    medicines: List[dict]
    prescription_url: Optional[str] = None
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    delivery_address: Optional[str] = None
    payment_method: Optional[str] = "cod"
    payment_status: Optional[str] = "pending"
    cashfree_order_id: Optional[str] = None
    points_used: Optional[int] = 0


class PharmacyOrder(BaseModel):
    model_config = {"extra": "ignore"}
    id: str = ""
    user_id: Optional[str] = None
    medicines: List[dict] = []
    prescription_url: Optional[str] = None
    patient_name: str = ""
    patient_phone: str = ""
    patient_email: Optional[str] = None
    delivery_address: Optional[str] = None
    status: str = "Order Booked"
    payment_method: Optional[str] = "cod"
    payment_status: Optional[str] = "pending"
    total_amount: Optional[float] = 0.0
    created_at: Optional[datetime] = None
    
    def __init__(self, **data):
        if 'id' not in data or not data['id']:
            data['id'] = f"PHARM_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:6]}"
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
    service = "orange" if "pharm" in clinic.lower() or "orange" in clinic.lower() else "diagyn"
    return await gen_id(service=service, source="web", db_instance=db_instance)

# ============ COUPON VALIDATION ============

class CouponValidateRequest(BaseModel):
    code: str
    amount: float
    type: str  # 'pharmacy', 'lab_test', 'appointment'


@router.get("/coupons/available")
async def get_available_coupons(order_type: str = "pharmacy", subtotal: float = 0):
    """Return available coupons for a given order type, ranked by discount value"""
    default_coupons = {
        "WELCOME10": {"discount_type": "percentage", "discount_value": 10, "max_discount": 100, "min_amount": 0, "applicable": ["pharmacy", "lab", "consultation"]},
        "FIRST50": {"discount_type": "percentage", "discount_value": 5, "max_discount": 50, "min_amount": 0, "applicable": ["pharmacy", "lab"]},
        "HEALTH20": {"discount_type": "percentage", "discount_value": 20, "max_discount": 200, "min_amount": 500, "applicable": ["pharmacy", "lab", "consultation"]},
        "NEVIKA100": {"discount_type": "flat", "discount_value": 100, "max_discount": 100, "min_amount": 500, "applicable": ["pharmacy", "lab", "consultation"]},
        "ORANGE15": {"discount_type": "percentage", "discount_value": 15, "max_discount": 150, "min_amount": 0, "applicable": ["pharmacy"]},
        "MANGO10": {"discount_type": "percentage", "discount_value": 10, "max_discount": 100, "min_amount": 0, "applicable": ["lab"]},
    }
    result = []
    for code, c in default_coupons.items():
        if order_type not in c["applicable"]:
            continue
        if subtotal < c.get("min_amount", 0):
            continue
        if c["discount_type"] == "percentage":
            val = min(subtotal * c["discount_value"] / 100, c.get("max_discount", float("inf")))
        else:
            val = c["discount_value"]
        result.append({"code": code, "discount_type": c["discount_type"], "discount_value": c["discount_value"], "max_discount": c.get("max_discount"), "min_amount": c.get("min_amount", 0), "estimated_savings": round(val, 2)})
    result.sort(key=lambda x: x["estimated_savings"], reverse=True)
    return {"coupons": result}

@router.post("/coupons/validate")
async def validate_coupon(request: CouponValidateRequest):
    """Validate a discount coupon code"""
    db = get_db()
    code = request.code.strip().upper()
    
    # Check coupon in database
    coupon = await db.coupons.find_one({
        "code": code,
        "active": True,
        "$or": [
            {"valid_for": {"$in": [request.type, "all"]}},
            {"valid_for": {"$exists": False}}
        ]
    })
    
    if not coupon:
        # Check for some default coupons
        default_coupons = {
            "WELCOME10": {"discount_percent": 10, "max_discount": 100},
            "FIRST50": {"discount_percent": 5, "max_discount": 50},
            "HEALTH20": {"discount_percent": 20, "max_discount": 200, "min_amount": 500},
            "NEVIKA100": {"discount_flat": 100, "min_amount": 500},
            "ORANGE15": {"discount_percent": 15},
            "MANGO10": {"discount_percent": 10},
        }
        
        if code in default_coupons:
            coupon_data = default_coupons[code]
            
            # Check minimum amount
            if coupon_data.get("min_amount", 0) > request.amount:
                return {
                    "valid": False,
                    "message": f"Minimum order amount ₹{coupon_data['min_amount']} required for this coupon"
                }
            
            # Calculate discount
            if "discount_flat" in coupon_data:
                discount = coupon_data["discount_flat"]
                discount_type = "flat"
            else:
                discount = (request.amount * coupon_data["discount_percent"]) / 100
                if coupon_data.get("max_discount"):
                    discount = min(discount, coupon_data["max_discount"])
                discount_type = "percent"
            
            return {
                "valid": True,
                "discount": round(discount, 2),
                "discount_type": discount_type,
                "code": code
            }
        
        return {"valid": False, "message": "Invalid or expired coupon code"}
    
    # Check minimum amount
    if coupon.get("min_amount", 0) > request.amount:
        return {
            "valid": False,
            "message": f"Minimum order amount ₹{coupon['min_amount']} required for this coupon"
        }
    
    # Check usage limit
    if coupon.get("usage_limit"):
        usage_count = await db.coupon_usage.count_documents({"coupon_code": code})
        if usage_count >= coupon["usage_limit"]:
            return {"valid": False, "message": "Coupon usage limit reached"}
    
    # Calculate discount
    if coupon.get("discount_flat"):
        discount = coupon["discount_flat"]
        discount_type = "flat"
    else:
        discount = (request.amount * coupon.get("discount_percent", 0)) / 100
        if coupon.get("max_discount"):
            discount = min(discount, coupon["max_discount"])
        discount_type = "percent"
    
    return {
        "valid": True,
        "discount": round(discount, 2),
        "discount_type": discount_type,
        "code": code
    }

@router.post("/pharmacy")
async def create_pharmacy_order(input: PharmacyOrderCreate, user = Depends(_get_current_user())):
    db = get_db()
    # ORDER LIMIT REMOVED: Users can now place unlimited pharmacy orders
    # Previous limit of 2 active orders has been removed for better user experience
    # Staff manages order prioritization and delivery scheduling manually
    
    # Validate medicine quantities - max 20 strips per medicine
    MAX_QUANTITY_PER_MEDICINE = 20
    for medicine in input.medicines:
        qty = medicine.get('quantity', 1)
        if qty > MAX_QUANTITY_PER_MEDICINE:
            raise HTTPException(
                status_code=400, 
                detail=f"Maximum {MAX_QUANTITY_PER_MEDICINE} strips allowed per medicine. '{medicine.get('name', 'Unknown')}' has {qty} strips."
            )
    
    # Handle loyalty points redemption
    points_used = input.points_used or 0
    discount_amount = 0.0
    
    if points_used > 0:
        if not user:
            raise HTTPException(status_code=401, detail="Login required to redeem loyalty points")
        
        # Verify user has enough points
        user_doc = await db.users.find_one({"id": user.id})
        current_points = user_doc.get('loyalty_points', 0) if user_doc else 0
        
        if points_used > current_points:
            raise HTTPException(status_code=400, detail=f"Insufficient loyalty points. You have {current_points} points.")
        
        # Calculate discount (100 points = ₹10)
        discount_amount = (points_used / 100) * 10
        
        # Deduct points from user
        await db.users.update_one(
            {"id": user.id},
            {"$inc": {"loyalty_points": -points_used}}
        )
        
        # Record transaction
        await db.loyalty_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user.id,
            "phone": user.phone,
            "type": "debit",
            "points": points_used,
            "reason": f"Pharmacy order discount - ₹{discount_amount:.0f} off",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "staff_id": "system"
        })
        
        logger.info(f"Loyalty points redeemed: {points_used} pts = ₹{discount_amount} for user {user.id}")
    
    # Create order data without points_used field (handled separately)
    order_data = input.model_dump()
    del order_data['points_used']  # Remove as we add it separately with discount
    
    # Generate unique booking ID for pharmacy order
    booking_id = await generate_booking_id("Orange Pharmacy", db, "pharmacy")
    
    # HYBRID FLOW: Determine order status based on payment method
    is_online_payment = input.payment_method in ['cashfree', 'online', 'pay_now']
    initial_status = "draft" if is_online_payment else "pending"  # COD/Pay Later = pending (ready to process)
    
    order = PharmacyOrder(
        user_id=user.id if user else None,
        points_used=points_used,
        discount_amount=discount_amount,
        **order_data
    )
    order.status = initial_status
    
    doc = order.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['booking_id'] = booking_id  # Add booking ID to order
    doc['order_status'] = initial_status  # Explicit order status for hybrid flow
    
    await db.pharmacy_orders.insert_one(doc)
    logger.info(f"Pharmacy order created: {order.id} with booking_id: {booking_id}, status: {initial_status}, payment: {input.payment_method}")
    
    # Generate and store Delivery Code for delivery verification
    delivery_code = None
    try:
        from services.booking_otp import generate_booking_code_record, store_booking_code
        code_record = generate_booking_code_record(
            booking_id=booking_id,
            booking_type="orange",
            patient_phone=order.patient_phone,
            patient_name=order.patient_name,
            additional_data={
                "order_id": order.id,
                "booking_id": booking_id,
                "items": order.medicines,
                "total": order.total,
                "address": order.address,
                "patient_name": order.patient_name
            }
        )
        await store_booking_code(db, code_record)
        delivery_code = code_record["code"]
        
        # Update order with the delivery code
        await db.pharmacy_orders.update_one(
            {"id": order.id},
            {"$set": {"delivery_code": delivery_code}}
        )
        
        logger.info(f"✅ Delivery Code {delivery_code} generated for pharmacy order {booking_id}")
    except Exception as e:
        logger.error(f"❌ Delivery Code generation error: {e}")
    
    # Live sync notification to Orange staff
    try:
        if live_sync_manager:
            await live_sync_manager.notify_new_order("pharmacy", {
                "id": order.id,
                "patient_name": order.patient_name,
                "patient_phone": order.patient_phone,
                "status": initial_status,
                "total_amount": order.total,
                "medicines": order.medicines,
                "created_at": order.created_at.isoformat() if hasattr(order.created_at, 'isoformat') else order.created_at
            })
            logger.info(f"Live sync notification sent for pharmacy order {order.id}")
    except Exception as e:
        logger.warning(f"Could not send live sync notification: {e}")
    
    # HYBRID FLOW: Only send notifications for non-online payment orders immediately
    # Online payment orders will get notifications after payment success webhook
    if not is_online_payment:
        await send_pharmacy_order_notifications(order, input, booking_id, user)
    else:
        logger.info(f"Online payment pharmacy order {booking_id} - notifications deferred until payment confirmation")
    
    # Send staff push notification for new pharmacy order
    try:
        medicines_preview = ", ".join([m.get('name', 'Unknown') for m in order.medicines[:2]]) if order.medicines else "See prescription"
        await send_push_to_staff(
            portal_types=["pharmacy_staff"],
            title="New Pharmacy Order! 💊",
            body=f"{order.patient_name} ordered {medicines_preview}",
            url="/pharmacy-staff",
            tag=f"pharmacy-new-{order.id}"
        )
    except Exception as e:
        logger.warning(f"Staff push notification failed for pharmacy order: {e}")
    
    return {
        "id": order.id,
        "order_id": order.id,
        "booking_id": booking_id,
        "delivery_code": delivery_code,
        "status": initial_status,
        "payment_method": input.payment_method,
        "requires_payment": is_online_payment,
        "message": "Order created. Complete payment to confirm." if is_online_payment else "Order confirmed successfully!"
    }


async def send_pharmacy_order_notifications(order, input, booking_id, user=None):
    """Send email and WhatsApp notifications for pharmacy order"""
    db = get_db()
    try:
        medicines_text = ", ".join([f"{m.get('name', 'Unknown')} x{m.get('quantity', 1)}" for m in order.medicines[:3]])
        if len(order.medicines) > 3:
            medicines_text += f" +{len(order.medicines) - 3} more"
        
        # Add discount info to WhatsApp message if applicable
        discount_text = f"\nLoyalty Discount: ₹{order.discount_amount:.0f} ({order.points_used} pts)" if order.points_used > 0 else ""
        
        whatsapp_message = f"""New Pharmacy Order - Orange Pharmacy

Patient: {order.patient_name}
Phone: {order.patient_phone}
Order ID: {order.id[:8]}{discount_text}

Medicines: {medicines_text if order.medicines else 'See prescription'}
Prescription: {order.prescription_url or 'Not uploaded'}
Delivery: {order.delivery_address or 'Not provided'}"""
        
        whatsapp_link = f"https://wa.me/917039030030?text={whatsapp_message.replace(chr(10), '%0A').replace(' ', '%20')}"
        
        # Format prescription as clickable link
        prescription_display = f'<a href="{order.prescription_url}" target="_blank" style="color: #f97316;">📎 View Prescription</a>' if order.prescription_url else 'Not uploaded'
        
        # Add loyalty discount row to email if applicable
        discount_html = f'<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>🎁 Loyalty Discount:</strong></td><td style="padding: 8px; border: 1px solid #ddd; color: #16a34a; font-weight: bold;">₹{order.discount_amount:.0f} ({order.points_used} points used)</td></tr>' if order.points_used > 0 else ''
        
        # Format payment info for pharmacy
        pharmacy_payment_method = {
            'cod': '💵 Cash on Delivery',
            'cashfree': '💳 Online Payment (Cashfree)',
            'online': '💳 Online Payment',
            'pay_later': '🕐 Pay Later'
        }.get(order.payment_method, '💵 Cash on Delivery')
        
        pharmacy_payment_status = {
            'paid': '✅ Paid',
            'pending': '⏳ Pending',
            'failed': '❌ Failed'
        }.get(order.payment_status, '⏳ Pending')
        
        pharmacy_total = f"₹{order.total_amount:.0f}" if order.total_amount and order.total_amount > 0 else "Calculated on confirmation"
        
        # Send email notification for new pharmacy order
        medicines_list = "<br>".join([f"• {m.get('name', 'Unknown')} (Qty: {m.get('quantity', 1)})" for m in order.medicines]) if order.medicines else '<em>No medicines specified - Check prescription</em>'
        email_html = f"""
        <h2>💊 New Orange Pharmacy Order</h2>
        <h3>Booking ID: <span style="color: #f97316;">{booking_id}</span></h3>
        <h3>Medicines Ordered:</h3>
        <p>{medicines_list}</p>
        <table style="border-collapse: collapse; width: 100%;">
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Booking ID:</strong></td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #f97316;">{booking_id}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Delivery Address:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{order.delivery_address or 'Not provided'}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Prescription:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{prescription_display}</td></tr>
            {discount_html}
        </table>
        <h3 style="margin-top: 20px; color: #f97316;">💰 Payment Details</h3>
        <table style="border-collapse: collapse; width: 100%;">
            <tr style="background: #fff7ed;"><td style="padding: 8px; border: 1px solid #ddd;"><strong>Total Amount:</strong></td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; font-size: 18px; color: #f97316;">{pharmacy_total}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Payment Method:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{pharmacy_payment_method}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Payment Status:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{pharmacy_payment_status}</td></tr>
        </table>
        <h3>Customer Details</h3>
        <p><strong>Name:</strong> {order.patient_name}</p>
        <p><strong>Phone:</strong> {order.patient_phone}</p>
        <p><strong>Email:</strong> {order.patient_email or 'Not provided'}</p>
        <p><strong>Ordered at:</strong> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC</p>
        <div style="margin-top: 20px; padding: 15px; background: #dcfce7; border-radius: 8px;">
            <p style="margin: 0;"><strong>📱 WhatsApp Forward Link:</strong></p>
            <p style="margin: 5px 0;"><a href="{whatsapp_link}" style="color: #16a34a;">Click to forward order on WhatsApp</a></p>
        </div>
        """
        
        # Discount info for patient email
        patient_discount_html = f'''
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center;">
                <p style="margin: 0; color: #d97706; font-weight: bold;">🎁 Loyalty Discount Applied!</p>
                <p style="margin: 5px 0 0 0; color: #92400e; font-size: 20px;">₹{order.discount_amount:.0f} OFF</p>
                <p style="margin: 5px 0 0 0; color: #78350f; font-size: 12px;">({order.points_used} points redeemed)</p>
            </div>
        ''' if order.points_used > 0 else ''
        
        # Patient confirmation email for pharmacy with QR code using CID
        medicines_list_patient = "".join([f"<li>{m.get('name', 'Unknown')} - Qty: {m.get('quantity', 1)}</li>" for m in order.medicines]) if order.medicines else '<li><em>Medicines as per prescription</em></li>'
        patient_pharmacy_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">Order Confirmed! 💊</h1>
            </div>
            <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
                <p style="font-size: 18px;">Hello <strong>{order.patient_name}</strong>,</p>
                <p>Your order has been successfully placed at <strong>Orange Pharmacy</strong>.</p>
                
                <!-- Booking ID Section - Primary Focus -->
                <div style="text-align: center; margin: 25px 0; padding: 25px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 12px;">
                    <p style="margin: 0 0 5px 0; color: white; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Your Order ID</p>
                    <p style="margin: 0; color: white; font-size: 32px; font-weight: bold; letter-spacing: 4px; font-family: monospace;">{booking_id}</p>
                    <p style="margin: 15px 0 0 0; color: rgba(255,255,255,0.8); font-size: 11px;">Show this ID for pickup/delivery verification</p>
                </div>
                
                <!-- Order ID shown prominently -->
                <div style="text-align: center; margin: 20px 0; padding: 15px; background: white; border-radius: 12px; border: 1px dashed #e2e8f0;">
                    <p style="margin: 0 0 10px 0; color: #94a3b8; font-size: 11px; text-transform: uppercase;">Show this ID for verification</p>
                    <p style="margin: 0; color: #f97316; font-size: 28px; font-weight: bold; letter-spacing: 3px; font-family: monospace;">{booking_id}</p>
                </div>
                
                {patient_discount_html}
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316;">
                    <h3 style="color: #f97316; margin-top: 0;">Order Details</h3>
                    <p><strong>Order ID:</strong> <span style="font-size: 18px; color: #f97316; font-weight: bold;">{booking_id}</span></p>
                    <p><strong>Status:</strong> <span style="background: #fef3c7; padding: 4px 8px; border-radius: 4px; color: #d97706;">Order Booked</span></p>
                    <h4>Medicines:</h4>
                    <ul style="line-height: 1.8;">{medicines_list_patient}</ul>
                    <p><strong>Delivery Address:</strong> {order.delivery_address or 'Will be confirmed'}</p>
                </div>
                
                <p style="color: #64748b; font-size: 14px;">
                    Your order is being processed. We'll notify you when it's out for delivery.
                </p>
                
                <div style="text-align: center; margin-top: 30px; padding: 15px; background: #ffedd5; border-radius: 8px;">
                    <p style="margin: 0; color: #c2410c;"><strong>Need help with your order?</strong></p>
                    <p style="margin: 5px 0 0 0; color: #ea580c;">Contact us: 7039030030</p>
                </div>
            </div>
        </div>
        """
        
        await send_email_notification(
            f"New Pharmacy Order - {order.patient_name} ({booking_id})", 
            email_html,
            patient_email=order.patient_email,
            patient_subject=f"Order Confirmed - Orange Pharmacy {booking_id}",
            patient_html=patient_pharmacy_html,
        )
        
        # Send push notification if user is logged in
        if user:
            medicine_count = len(order.medicines) if order.medicines else 0
            await send_push_notification(
                user_id=user.id,
                title="Order Placed! 💊",
                body=f"Your order {booking_id} with {medicine_count} item(s) has been placed. We'll notify you when it's out for delivery.",
                url="/profile",
                tag=f"pharmacy-{order.id}"
            )
        
        # Send SMS confirmation to patient
        await send_pharmacy_order_sms(order.patient_phone, {
            "id": order.id,
            "booking_id": booking_id,
            "medicines": order.medicines
        })
        
        # Send WhatsApp confirmation via MSG91
        try:
            medicines_text_wa = ", ".join([m.get('name', 'Medicine') for m in order.medicines[:3]]) if order.medicines else "As per prescription"
            if len(order.medicines) > 3:
                medicines_text_wa += "..."
            whatsapp_result = await send_orange_pharmacy_confirmation(
                phone=order.patient_phone,
                patient_name=order.patient_name,
                order_id=booking_id,
                items=medicines_text_wa,
                delivery_address=order.delivery_address or "To be confirmed",
                db=db
            )
            if whatsapp_result.get("success"):
                logger.info(f"✅ WhatsApp pharmacy confirmation sent for order {booking_id}")
            else:
                logger.warning(f"⚠️ WhatsApp pharmacy confirmation failed: {whatsapp_result.get('error')}")
        except Exception as e:
            logger.error(f"❌ WhatsApp pharmacy notification error: {e}")
        
        # Send WhatsApp notification to Orange Pharmacy staff
        await notify_staff_new_order({
            "id": order.id,
            "patient_name": order.patient_name,
            "patient_phone": order.patient_phone,
            "medicines": order.medicines,
            "address": order.delivery_address or "Pickup"
        }, "orange")
        
        logger.info(f"Pharmacy order notifications sent for {booking_id}")
        
    except Exception as e:
        logger.error(f"Failed to send pharmacy order notifications: {e}")


@router.get("/pharmacy", response_model=List[PharmacyOrder])
async def get_pharmacy_orders(user = Depends(_get_current_user())):
    db = get_db()
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    orders = await db.pharmacy_orders.find({"user_id": user.id}, {"_id": 0}).to_list(100)
    
    for order in orders:
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
    
    return orders

