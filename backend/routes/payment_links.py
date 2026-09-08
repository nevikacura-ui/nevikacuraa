"""Payment Links, Invoice & Prescription Email Routes - Extracted from server.py"""
from fastapi import APIRouter, HTTPException, Depends, Body, Header
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from database import get_db
from services.notification_service import (
    send_email_notification, send_pharmacy_status_sms,
    send_diagnostic_status_sms, send_order_status_email,
    RESEND_API_KEY, SENDER_EMAIL
)
import os
import json
import asyncio
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_current_user():
    """Lazy import get_current_user from server to avoid circular imports"""
    from server import get_current_user
    return get_current_user


def _get_current_user_optional():
    """Lazy import get_current_user_optional from server"""
    from server import get_current_user_optional
    return get_current_user_optional

# ============ Send Payment Link via WhatsApp ============

class PaymentLinkRequest(BaseModel):
    order_id: str
    phone: str
    patient_name: str
    amount: float
    payment_link: str

async def send_payment_link_whatsapp(phone: str, patient_name: str, amount: float, payment_link: str, order_id: str) -> dict:
    """Send payment link via WhatsApp using payment_link_reminder template"""
    db = get_db()
    try:
        import httpx
        
        auth_key = os.getenv("MSG91_AUTH_KEY")
        if not auth_key:
            return {"success": False, "error": "MSG91 not configured"}
        
        whatsapp_number = os.getenv("MSG91_WHATSAPP_NUMBER", "918108888330")
        
        # Format phone number
        clean_phone = phone.replace("+", "").replace(" ", "")[-10:]
        full_phone = f"91{clean_phone}"
        
        url = f"https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/?authkey={auth_key}"
        
        # payment_link_reminder template - adjust components based on your template structure
        payload = {
            "integrated_number": whatsapp_number,
            "content_type": "template",
            "payload": {
                "messaging_product": "whatsapp",
                "type": "template",
                "template": {
                    "name": "payment_link_reminder",
                    "language": {
                        "code": "en_US",
                        "policy": "deterministic"
                    },
                    "to_and_components": [
                        {
                            "to": [full_phone],
                            "components": {
                                "body_1": {
                                    "type": "text",
                                    "value": patient_name
                                },
                                "body_2": {
                                    "type": "text",
                                    "value": f"₹{amount:.0f}"
                                },
                                "body_3": {
                                    "type": "text",
                                    "value": order_id
                                },
                                "button_1": {
                                    "subtype": "url",
                                    "type": "text",
                                    "value": payment_link
                                }
                            }
                        }
                    ]
                }
            }
        }
        
        headers = {"Content-Type": "application/json"}
        
        logger.info(f"Sending payment link WhatsApp to {full_phone}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=15)
            
            try:
                response_data = response.json()
            except Exception:
                response_data = {"raw": response.text}
            
            logger.info(f"Payment link WhatsApp response: status={response.status_code}, data={response_data}")
            
            if response.status_code == 200 and response_data.get("status") == "success":
                return {"success": True, "message": "Payment link sent via WhatsApp"}
            
            return {"success": False, "error": str(response_data)}
            
    except Exception as e:
        logger.error(f"Payment link WhatsApp error: {e}")
        return {"success": False, "error": str(e)}

@router.post("/pharmacy/send-payment-link")
async def send_payment_link(request: PaymentLinkRequest, user = Depends(_get_current_user())):
    """Staff endpoint to send payment link via WhatsApp"""
    db = get_db()
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Verify staff role
    if user.role not in ["admin", "pharmacy_staff", "staff"]:
        raise HTTPException(status_code=403, detail="Staff access required")
    
    result = await send_payment_link_whatsapp(
        phone=request.phone,
        patient_name=request.patient_name,
        amount=request.amount,
        payment_link=request.payment_link,
        order_id=request.order_id
    )
    
    if result["success"]:
        # Update order status
        await db.pharmacy_orders.update_one(
            {"$or": [{"id": request.order_id}, {"booking_id": request.order_id}]},
            {"$set": {"payment_link_sent": True, "payment_link_sent_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"success": True, "message": "Payment link sent to customer via WhatsApp"}
    else:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to send payment link"))

@router.post("/pharmacy/create-payment-link")
async def create_and_send_payment_link(
    order_id: str = Body(...),
    amount: float = Body(...),
    user = Depends(_get_current_user())
):
    """Create Cashfree payment link and send to customer via WhatsApp"""
    db = get_db()
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Verify staff role
    if user.role not in ["admin", "pharmacy_staff", "staff"]:
        raise HTTPException(status_code=403, detail="Staff access required")
    
    # Get order details
    order = await db.pharmacy_orders.find_one(
        {"$or": [{"id": order_id}, {"booking_id": order_id}]},
        {"_id": 0}
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    phone = order.get("patient_phone", "").replace("+91", "").replace(" ", "")[-10:]
    patient_name = order.get("patient_name", "Customer")
    
    # Create Cashfree payment order
    try:
        from routes.cashfree import create_cashfree_order
        
        payment_order = await create_cashfree_order({
            "customer_id": f"PHARM_{phone}_{int(datetime.now().timestamp())}",
            "customer_name": patient_name,
            "customer_email": order.get("patient_email") or f"{phone}@pharmacy.nevikacura.com",
            "customer_phone": phone,
            "amount": amount,
            "product_type": "pharmacy",
            "product_id": order_id
        })
        
        payment_link = payment_order.get("payment_link")
        
        if not payment_link:
            raise HTTPException(status_code=500, detail="Failed to create payment link")
        
        # Send via WhatsApp
        result = await send_payment_link_whatsapp(
            phone=phone,
            patient_name=patient_name,
            amount=amount,
            payment_link=payment_link,
            order_id=order.get("booking_id", order_id[:8])
        )
        
        # Update order with amount and payment link
        await db.pharmacy_orders.update_one(
            {"$or": [{"id": order_id}, {"booking_id": order_id}]},
            {"$set": {
                "total_amount": amount,
                "payment_link": payment_link,
                "payment_link_sent": result["success"],
                "payment_link_sent_at": datetime.now(timezone.utc).isoformat(),
                "cashfree_order_id": payment_order.get("order_id")
            }}
        )
        
        return {
            "success": True,
            "payment_link": payment_link,
            "whatsapp_sent": result["success"],
            "message": "Payment link created and sent to customer"
        }
        
    except Exception as e:
        logger.error(f"Create payment link error: {e}")
        raise HTTPException(status_code=500, detail=str(e))



class OrderStatusUpdate(BaseModel):
    order_id: str
    status: str
    delivery_partner: Optional[str] = None
    eta: Optional[str] = None
    delivery_contact: Optional[str] = None
    collected_by: Optional[str] = None
    expected_time: Optional[str] = None
    report_url: Optional[str] = None
    send_notification: bool = True

@router.patch("/pharmacy/order/{order_id}/status")
async def update_pharmacy_order_status(
    order_id: str,
    status_update: OrderStatusUpdate,
    user = Depends(_get_current_user())
):
    """
    Update pharmacy order status and send WhatsApp notification
    
    Status values: confirmed, packing, out_for_delivery, delivered, cancelled
    """
    db = get_db()
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if user.role not in ["admin", "pharmacy_staff", "staff"]:
        raise HTTPException(status_code=403, detail="Staff access required")
    
    # Get current order
    order = await db.pharmacy_orders.find_one(
        {"$or": [{"id": order_id}, {"booking_id": order_id}]},
        {"_id": 0}
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Update the order status
    update_data = {
        "status": status_update.status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user.username
    }
    
    # Add delivery info if provided
    if status_update.delivery_partner:
        update_data["delivery_partner"] = status_update.delivery_partner
    if status_update.eta:
        update_data["eta"] = status_update.eta
    if status_update.delivery_contact:
        update_data["delivery_contact"] = status_update.delivery_contact
    
    await db.pharmacy_orders.update_one(
        {"$or": [{"id": order_id}, {"booking_id": order_id}]},
        {"$set": update_data}
    )
    
    # Send WhatsApp notification if enabled
    notification_result = {"sent": False}
    email_result = {"sent": False}
    invoice_result = {"sent": False}
    if status_update.send_notification and order.get("patient_phone"):
        # Merge current order data with update data
        order_data = {**order, **update_data}
        notification_result = await send_pharmacy_status_sms(
            patient_phone=order.get("patient_phone"),
            order_id=order.get("booking_id", order_id),
            status=status_update.status,
            order_data=order_data,
            db=db
        )
        notification_result = {"sent": notification_result.get("success", False)}
        
        # Send email notification for key statuses
        if order.get("patient_email") and status_update.status in ['out_for_delivery', 'delivered', 'packing']:
            email_result = await send_order_status_email(
                patient_email=order.get("patient_email"),
                patient_name=order.get("patient_name", "Customer"),
                order_id=order.get("booking_id", order_id),
                order_type="pharmacy",
                status=status_update.status,
                order_data=order_data
            )
            email_result = {"sent": email_result.get("success", False)}
        
        # Trigger invoice generation when order is delivered
        if status_update.status.lower() == 'delivered':
            try:
                from routes.invoice_routes import trigger_orange_invoice
                from fastapi import BackgroundTasks
                background_tasks = BackgroundTasks()
                invoice_result = await trigger_orange_invoice(order_id, background_tasks)
                invoice_result = {"sent": True, "invoice_id": invoice_result.get("invoice_id")}
                logger.info(f"Invoice triggered for Orange order {order_id}")
            except Exception as e:
                logger.error(f"Failed to trigger invoice for order {order_id}: {e}")
                invoice_result = {"sent": False, "error": str(e)}
    
    # Create in-app notification for patient
    try:
        from routes.notifications import create_notification
        patient_phone = order.get("patient_phone", "")
        status_labels = {
            "confirmed": "Order Confirmed",
            "packing": "Order Being Packed",
            "out_for_delivery": "Out for Delivery",
            "delivered": "Order Delivered",
            "cancelled": "Order Cancelled",
        }
        label = status_labels.get(status_update.status, status_update.status.replace("_", " ").title())
        if patient_phone:
            await create_notification(
                user_id=patient_phone,
                title=label,
                message=f"Your pharmacy order {order.get('booking_id', order_id)} is now: {label}",
                notif_type="order",
                link="/track",
                icon="package",
            )
    except Exception as e:
        logger.warning(f"Could not create in-app notification for order: {e}")

    # Store order status notification for real-time patient widget
    try:
        from routes.order_notifications import STATUS_MESSAGES
        patient_phone = order.get("patient_phone") or order.get("phone", "")
        if patient_phone:
            msgs = STATUS_MESSAGES.get("pharmacy_order", {}).get(status_update.status, {})
            await db.order_notifications.insert_one({
                "phone": patient_phone[-10:],
                "order_type": "pharmacy_order",
                "order_id": order.get("booking_id", order_id),
                "status": status_update.status,
                "title": msgs.get("title", f"Order Update: {status_update.status}"),
                "body": msgs.get("body", f"Your pharmacy order status changed to {status_update.status}"),
                "read": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
    except Exception as e:
        logger.warning(f"Could not store order notification: {e}")

    return {
        "success": True,
        "order_id": order_id,
        "new_status": status_update.status,
        "notification": notification_result,
        "email": email_result,
        "invoice": invoice_result
    }


@router.patch("/diagnostics/order/{order_id}/status")
async def update_diagnostic_order_status(
    order_id: str,
    status_update: OrderStatusUpdate,
    user = Depends(_get_current_user())
):
    """
    Update diagnostic order status and send WhatsApp notification
    
    Status values: confirmed, sample_collected, processing, reports_ready, delivered, cancelled
    """
    db = get_db()
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if user.role not in ["admin", "lab_staff", "staff"]:
        raise HTTPException(status_code=403, detail="Staff access required")
    
    # Get current order
    order = await db.diagnostic_orders.find_one(
        {"$or": [{"id": order_id}, {"booking_id": order_id}]},
        {"_id": 0}
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Update the order status
    update_data = {
        "status": status_update.status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user.username
    }
    
    # Add phlebotomist info if provided
    if status_update.collected_by:
        update_data["collected_by"] = status_update.collected_by
    if status_update.expected_time:
        update_data["expected_time"] = status_update.expected_time
    if status_update.report_url:
        update_data["report_url"] = status_update.report_url
    
    await db.diagnostic_orders.update_one(
        {"$or": [{"id": order_id}, {"booking_id": order_id}]},
        {"$set": update_data}
    )
    
    # Send WhatsApp notification if enabled
    notification_result = {"sent": False}
    email_result = {"sent": False}
    invoice_result = {"sent": False}
    if status_update.send_notification and order.get("patient_phone"):
        # Merge current order data with update data
        order_data = {**order, **update_data}
        notification_result = await send_diagnostic_status_sms(
            patient_phone=order.get("patient_phone"),
            order_id=order.get("booking_id", order_id),
            status=status_update.status,
            order_data=order_data,
            db=db
        )
        notification_result = {"sent": notification_result.get("success", False)}
        
        # Send email notification for key statuses
        if order.get("patient_email") and status_update.status in ['sample_collected', 'in_process', 'report_generated', 'completed']:
            email_result = await send_order_status_email(
                patient_email=order.get("patient_email"),
                patient_name=order.get("patient_name", "Customer"),
                order_id=order.get("booking_id", order_id),
                order_type="lab",
                status=status_update.status,
                order_data=order_data
            )
            email_result = {"sent": email_result.get("success", False)}
        
        # Trigger invoice generation when reports are ready/dispatched
        if status_update.status.lower() in ['report_generated', 'reports_ready', 'completed', 'dispatched']:
            try:
                from routes.invoice_routes import trigger_mango_invoice
                from fastapi import BackgroundTasks
                background_tasks = BackgroundTasks()
                invoice_result = await trigger_mango_invoice(order_id, background_tasks)
                invoice_result = {"sent": True, "invoice_id": invoice_result.get("invoice_id")}
                logger.info(f"Invoice triggered for Mango order {order_id}")
            except Exception as e:
                logger.error(f"Failed to trigger invoice for diagnostic order {order_id}: {e}")
                invoice_result = {"sent": False, "error": str(e)}
    
    # Store order status notification for real-time patient widget
    try:
        from routes.order_notifications import STATUS_MESSAGES
        patient_phone = order.get("patient_phone") or order.get("phone", "")
        if patient_phone:
            msgs = STATUS_MESSAGES.get("lab_order", {}).get(status_update.status, {})
            await db.order_notifications.insert_one({
                "phone": patient_phone[-10:],
                "order_type": "lab_order",
                "order_id": order.get("booking_id", order_id),
                "status": status_update.status,
                "title": msgs.get("title", f"Lab Update: {status_update.status}"),
                "body": msgs.get("body", f"Your lab order status changed to {status_update.status}"),
                "read": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
    except Exception as e:
        logger.warning(f"Could not store order notification: {e}")

    return {
        "success": True,
        "order_id": order_id,
        "new_status": status_update.status,
        "notification": notification_result,
        "email": email_result,
        "invoice": invoice_result
    }
@router.get("/pharmacy/count")
async def get_medicine_count(store: str = None):
    """Get total medicine count in inventory - checks database first"""
    db = get_db()
    try:
        query = {}
        if store:
            query['store'] = store
        db_count = await db.medicines.count_documents(query)
        if db_count > 0:
            return {"total": db_count}
    except Exception as e:
        logger.warning(f"Database count failed, falling back to static: {e}")
    return {"total": 0}

@router.get("/pharmacy/all")
async def get_all_medicines(page: int = 1, per_page: int = 100, search: str = None, form: str = None, category: str = None, manufacturer: str = None, store: str = None):
    """Get all medicines with pagination and filtering - reads from database first"""
    db = get_db()
    
    # First try to get from database (medicines collection)
    try:
        db_count = await db.medicines.count_documents({})
        if db_count > 0:
            # Use database inventory
            query = {}
            
            # Filter by store (orange_pharmacy or orange_healthplus)
            if store:
                query['store'] = store
            
            if search:
                query['name'] = {'$regex': search, '$options': 'i'}
            
            if form:
                query['unit'] = {'$regex': f'^{form}$', '$options': 'i'}
            
            if category:
                query['category'] = {'$regex': category, '$options': 'i'}
            
            if manufacturer:
                query['manufacturer'] = {'$regex': manufacturer, '$options': 'i'}
            
            # Get total count
            total = await db.medicines.count_documents(query)
            
            # Paginate - prioritize: starred top-company first, then with images, then alphabetical
            skip = (page - 1) * per_page
            pipeline = [
                {"$match": query},
                {"$addFields": {
                    "_priority": {"$ifNull": ["$priority", 0]},
                    "_is_starred": {"$cond": [{"$eq": ["$is_starred", True]}, 1, 0]},
                    "_has_img": {"$cond": [{"$and": [{"$ne": ["$image_url", ""]}, {"$ne": ["$image_url", None]}]}, 1, 0]}
                }},
                {"$sort": {"_priority": -1, "_is_starred": -1, "_has_img": -1, "name": 1}},
                {"$skip": skip},
                {"$limit": per_page},
                {"$project": {
                    "_id": 0, "_has_img": 0, "_is_starred": 0, "_priority": 0,
                    "substitutes": 0, "side_effects": 0, "therapeutic_class": 0,
                    "generic_name": 0, "description": 0, "created_at": 0
                }}
            ]
            medicines = await db.medicines.aggregate(pipeline).to_list(per_page)
            
            # Add computed 'price' field and ensure form field exists
            for med in medicines:
                mrp = med.get('mrp', 0) or 0
                disc = med.get('discount_percent', 0) or 0
                med['price'] = round(mrp * (1 - disc / 100)) if disc > 0 else mrp
                med['sale_price'] = med['price']
                med['form'] = med.get('unit', med.get('form', 'Other'))
                if 'discount_percent' not in med:
                    med['discount_percent'] = 0
            
            return {
                "medicines": medicines,
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": (total + per_page - 1) // per_page if total > 0 else 1,
                "category": category,
                "manufacturer": manufacturer,
                "source": "database"
            }
    except Exception as e:
        logger.warning(f"Database medicines query failed: {e}")
    
    # Empty fallback when database has no medicines
    return {
        "medicines": [],
        "total": 0,
        "page": page,
        "per_page": per_page,
        "total_pages": 1,
        "category": category,
        "source": "empty"
    }

@router.get("/pharmacy/categories")
async def get_pharmacy_categories(store: str = None):
    """Get all categories with counts for a given store"""
    db = get_db()
    try:
        match_stage = {}
        if store:
            match_stage['store'] = store
        cats = await db.medicines.aggregate([
            {"$match": match_stage},
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]).to_list(100)
        return {"categories": [{"name": c["_id"] or "Uncategorized", "count": c["count"]} for c in cats if c["_id"]]}
    except Exception as e:
        logger.warning(f"Categories query failed: {e}")
        return {"categories": []}


@router.get("/pharmacy/search")
async def search_medicines(q: str, limit: int = 15, form: str = None, sort_by: str = None, min_price: float = None, max_price: float = None, manufacturer: str = None, store: str = None):
    """Search medicines for autocomplete - starts matching from first character"""
    db = get_db()
    if not q:
        return {"medicines": []}
    
    # First try database
    try:
        db_count = await db.medicines.count_documents({})
        if db_count > 0:
            query = {'name': {'$regex': q, '$options': 'i'}}
            if store:
                query['store'] = store
            if form:
                query['unit'] = {'$regex': f'^{form}$', '$options': 'i'}
            if manufacturer:
                query['manufacturer'] = {'$regex': manufacturer, '$options': 'i'}
            
            sort_field, sort_dir = "name", 1
            if sort_by == "price_low":
                sort_field, sort_dir = "mrp", 1
            elif sort_by == "price_high":
                sort_field, sort_dir = "mrp", -1
            
            # Use aggregation to prioritize starred/top-company first, then with images
            pipeline = [
                {"$match": query},
                {"$addFields": {
                    "_is_starred": {"$cond": [{"$eq": ["$is_starred", True]}, 1, 0]},
                    "_has_img": {"$cond": [{"$and": [{"$ne": ["$image_url", ""]}, {"$ne": ["$image_url", None]}]}, 1, 0]}
                }},
                {"$sort": {"_is_starred": -1, "_has_img": -1, sort_field: sort_dir}},
                {"$limit": limit},
                {"$project": {
                    "_id": 0, "_has_img": 0, "_is_starred": 0,
                    "substitutes": 0, "side_effects": 0, "therapeutic_class": 0,
                    "generic_name": 0, "description": 0, "created_at": 0
                }}
            ]
            medicines = await db.medicines.aggregate(pipeline).to_list(limit)
            
            # Add computed fields and apply price filter
            result = []
            for med in medicines:
                mrp = med.get('mrp', 0) or 0
                disc = med.get('discount_percent', 0) or 0
                price = round(mrp * (1 - disc / 100)) if disc > 0 else mrp
                if min_price is not None and price < min_price:
                    continue
                if max_price is not None and price > max_price:
                    continue
                med['price'] = price
                med['sale_price'] = price
                med['form'] = med.get('unit', med.get('form', 'Other'))
                # Ensure stock is never shown as 0 unless explicitly out of stock
                if not med.get('stock') and med.get('stock') != 0:
                    med['stock'] = 'In Stock'
                elif med.get('stock', 0) == 0 and not med.get('out_of_stock'):
                    med['stock'] = 'In Stock'
                result.append(med)
            
            return {"medicines": result, "total": len(result), "source": "database"}
    except Exception as e:
        logger.warning(f"Database search failed: {e}")
    
    # Empty fallback
    return {"medicines": [], "total": 0, "source": "empty"}

@router.get("/pharmacy/frequently-ordered")
async def get_frequently_ordered(user = Depends(_get_current_user_optional())):
    """Get user's frequently ordered medicines based on past orders"""
    db = get_db()
    if not user:
        return {"medicines": []}
    
    # Get user's past orders
    orders = await db.pharmacy_orders.find({"user_id": user.id}).to_list(50)
    
    # Count medicine occurrences
    medicine_counts = {}
    for order in orders:
        for med in order.get("medicines", []):
            name = med.get("name", "")
            if name:
                medicine_counts[name] = medicine_counts.get(name, 0) + med.get("quantity", 1)
    
    # Sort by count and return top medicines
    sorted_meds = sorted(medicine_counts.items(), key=lambda x: x[1], reverse=True)
    
    # Get full medicine info from database
    frequent = []
    for name, count in sorted_meds[:10]:
        med_info = await db.medicines.find_one({"name": name}, {"_id": 0})
        if med_info:
            med_info["order_count"] = count
            frequent.append(med_info)
    
    return {"medicines": frequent}

# ==================== PRESCRIPTION EMAIL NOTIFICATION ====================

@router.post("/pharmacy/prescription-upload")
async def upload_prescription_with_email(
    patient_name: str = Body(...),
    patient_phone: str = Body(...),
    prescription_url: str = Body(...),
    notes: str = Body("")
):
    """Upload prescription and send email notification to nevikacura@gmail.com"""
    db = get_db()
    
    upload = {
        "id": f"PRESC-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}",
        "patient_name": patient_name,
        "patient_phone": patient_phone,
        "prescription_url": prescription_url,
        "notes": notes,
        "status": "pending_review",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.prescription_uploads.insert_one(upload)
    
    # Send email to nevikacura@gmail.com
    try:
        email_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f97316;">📋 New Prescription Upload</h2>
            <p><strong>Patient:</strong> {patient_name}</p>
            <p><strong>Phone:</strong> {patient_phone}</p>
            <p><strong>Notes:</strong> {notes or 'No notes'}</p>
            <p><strong>Upload ID:</strong> {upload['id']}</p>
            <p><strong>Time:</strong> {datetime.now().strftime('%d %b %Y, %I:%M %p')}</p>
            <p style="margin-top: 20px;">
                <a href="{prescription_url}" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
                    📎 View Prescription
                </a>
            </p>
        </div>
        """
        
        await send_email_notification(
            subject=f"New Prescription Upload - {patient_name}",
            html_content=email_html
        )
        upload["email_sent"] = True
    except Exception as e:
        logger.error(f"Failed to send prescription email: {e}")
        upload["email_sent"] = False
    
    upload.pop("_id", None)
    
    return {
        "success": True,
        "upload_id": upload["id"],
        "message": "Prescription uploaded! Our pharmacy team will review and contact you."
    }


