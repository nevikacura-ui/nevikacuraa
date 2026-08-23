"""
Payment Webhooks & Real-time Status Updates
Enhanced payment management with WebSocket notifications
"""
from fastapi import APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime, timezone
import os
import logging
import json
import asyncio
import hashlib
import hmac

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payment-webhooks", tags=["Payment Webhooks"])

# MongoDB reference
db = None

def set_db(database):
    global db
    db = database

# WebSocket connection manager for real-time updates
class PaymentConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info(f"Payment WebSocket connected: {user_id}")
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"Payment WebSocket disconnected: {user_id}")
    
    async def send_payment_update(self, user_id: str, message: dict):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"WebSocket send error: {e}")
    
    async def broadcast_to_all(self, message: dict):
        for user_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"WebSocket broadcast error: {e}")

manager = PaymentConnectionManager()

# Models
class WebhookPayload(BaseModel):
    type: str
    data: dict

class PaymentDisputeCreate(BaseModel):
    order_id: str
    order_type: str  # pharmacy, lab_test, appointment
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    dispute_reason: str  # duplicate_charge, not_received, wrong_amount, refund_request, quality_issue, other
    description: str
    amount: float
    evidence_urls: Optional[List[str]] = []

class DisputeResponse(BaseModel):
    dispute_id: str
    admin_response: str
    resolution: str  # pending, approved_refund, partial_refund, rejected, escalated
    refund_amount: Optional[float] = None
    resolved_by: Optional[str] = None

# Webhook signature verification
def verify_cashfree_signature(payload: bytes, signature: str, timestamp: str) -> bool:
    """Verify Cashfree webhook signature"""
    try:
        secret = os.environ.get("CASHFREE_WEBHOOK_SECRET", "")
        if not secret:
            logger.warning("Webhook secret not configured")
            return True  # Skip verification if not configured
        
        # Create signature string
        sign_string = f"{timestamp}{payload.decode()}"
        
        # Calculate HMAC
        computed_signature = hmac.new(
            secret.encode(),
            sign_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(computed_signature, signature)
    except Exception as e:
        logger.error(f"Signature verification error: {e}")
        return False

# Real-time WebSocket endpoint
@router.websocket("/ws/{user_id}")
async def payment_websocket(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time payment status updates"""
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Keep connection alive and handle any incoming messages
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "ping":
                await websocket.send_json({"type": "pong", "timestamp": datetime.now(timezone.utc).isoformat()})
            elif message.get("type") == "subscribe":
                # Subscribe to specific order updates
                order_id = message.get("order_id")
                await websocket.send_json({
                    "type": "subscribed",
                    "order_id": order_id,
                    "message": f"Subscribed to updates for order {order_id}"
                })
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, user_id)

# Enhanced Webhook Handler — Production Hardened
@router.post("/cashfree")
async def handle_cashfree_webhook(request: Request):
    """
    Production-hardened Cashfree webhook handler.
    - Signature verification (strict when secret configured)
    - Idempotency: deduplicates by cf_payment_id + event_type
    - Audit trail: logs every raw webhook to webhook_audit
    - Fast 200: returns quickly, processes async where possible
    """
    received_at = datetime.now(timezone.utc).isoformat()
    body = b""
    try:
        # ── 1. Read raw body + headers ──
        signature = request.headers.get("x-webhook-signature", "")
        timestamp = request.headers.get("x-webhook-timestamp", "")
        body = await request.body()

        # ── 2. Audit log (raw, before any processing) ──
        audit_doc = {
            "received_at": received_at,
            "signature": signature,
            "timestamp_header": timestamp,
            "raw_body": body.decode("utf-8", errors="replace"),
            "processed": False,
            "error": None,
        }
        try:
            await db.webhook_audit.insert_one(audit_doc)
        except Exception:
            pass  # never fail because of audit

        # ── 3. Signature verification ──
        secret = os.environ.get("CASHFREE_WEBHOOK_SECRET", "")
        if secret and not verify_cashfree_signature(body, signature, timestamp):
            logger.warning("Cashfree webhook: INVALID SIGNATURE — rejecting")
            await _mark_audit(db, received_at, False, "invalid_signature")
            return {"status": "error", "reason": "invalid_signature"}

        # ── 4. Parse payload ──
        payload = json.loads(body.decode())
        event_type = payload.get("type", "")
        data = payload.get("data", {})
        order_data = data.get("order", {})
        payment_data = data.get("payment", {})

        order_id = order_data.get("order_id")
        payment_status = payment_data.get("payment_status", "")
        payment_amount = payment_data.get("payment_amount", 0)
        payment_method = payment_data.get("payment_group", "")
        cf_payment_id = payment_data.get("cf_payment_id", "")

        if not order_id:
            await _mark_audit(db, received_at, True, "no_order_id")
            return {"status": "ignored", "reason": "no_order_id"}

        logger.info(f"Cashfree webhook: event={event_type} order={order_id} status={payment_status} cf_pay={cf_payment_id}")

        # ── 5. Idempotency check ──
        idempotency_key = f"{order_id}:{event_type}:{cf_payment_id or payment_status}"
        existing = await db.cashfree_orders.find_one(
            {"order_id": order_id, "webhook_events.idempotency_key": idempotency_key},
            {"_id": 1}
        )
        if existing:
            logger.info(f"Cashfree webhook: DUPLICATE skipped — {idempotency_key}")
            await _mark_audit(db, received_at, True, "duplicate")
            return {"status": "success", "note": "duplicate_skipped"}

        # ── 6. Find order ──
        order = await db.cashfree_orders.find_one({"order_id": order_id})
        if not order:
            order = await db.cashfree_orders.find_one({"cf_order_id": order_id})
        if not order:
            logger.warning(f"Cashfree webhook: order not found — {order_id}")
            await _mark_audit(db, received_at, True, "order_not_found")
            return {"status": "success"}

        # ── 7. Status transition guard (prevent downgrade) ──
        status_map = {
            "SUCCESS": "PAID", "FAILED": "FAILED", "CANCELLED": "CANCELLED",
            "USER_DROPPED": "DROPPED", "PENDING": "PENDING",
        }
        order_status = status_map.get(payment_status, "ACTIVE")
        current_status = order.get("order_status", "")
        terminal_states = {"PAID", "REFUNDED"}
        if current_status in terminal_states and order_status not in terminal_states:
            logger.info(f"Cashfree webhook: ignoring downgrade {current_status} -> {order_status}")
            await _mark_audit(db, received_at, True, "status_downgrade_blocked")
            return {"status": "success", "note": "status_locked"}

        # ── 8. Update order ──
        update_data = {
            "order_status": order_status,
            "payment_status": payment_status,
            "payment_method": payment_method,
            "cf_payment_id": cf_payment_id,
            "webhook_received_at": received_at,
            "updated_at": received_at,
        }
        if payment_status == "SUCCESS":
            update_data["completed_at"] = received_at
            update_data["amount_paid"] = payment_amount

        await db.cashfree_orders.update_one(
            {"order_id": order_id},
            {
                "$set": update_data,
                "$push": {"webhook_events": {
                    "type": event_type,
                    "status": payment_status,
                    "cf_payment_id": cf_payment_id,
                    "idempotency_key": idempotency_key,
                    "received_at": received_at,
                }},
            },
        )

        # ── 9. WebSocket notifications ──
        customer_phone = order.get("customer_phone", "")
        user_id = customer_phone[-10:] if customer_phone else order.get("customer_id", "")

        notification = {
            "type": "payment_update",
            "order_id": order_id,
            "status": order_status,
            "payment_status": payment_status,
            "amount": payment_amount,
            "payment_method": payment_method,
            "timestamp": received_at,
            "message": get_status_message(payment_status),
        }

        await manager.send_payment_update(user_id, notification)
        await manager.send_payment_update("admin", {
            **notification,
            "customer_name": order.get("customer_name"),
            "customer_phone": customer_phone,
            "product_type": order.get("product_type"),
        })

        # Store notification for offline users
        await db.payment_notifications.insert_one({
            "user_id": user_id, "order_id": order_id,
            "notification": notification, "read": False,
            "created_at": received_at,
        })

        # ── 10. Post-payment actions ──
        if payment_status == "SUCCESS":
            try:
                await handle_successful_payment(order, order.get("product_type"))
            except Exception as post_err:
                logger.error(f"Post-payment action failed (non-fatal): {post_err}")
                # Mark for retry — a background job can pick these up
                await db.cashfree_orders.update_one(
                    {"order_id": order_id},
                    {"$set": {"post_payment_error": str(post_err), "needs_retry": True}}
                )

        await _mark_audit(db, received_at, True, None)
        logger.info(f"Cashfree webhook processed: {order_id} -> {payment_status}")
        return {"status": "success", "order_id": order_id}

    except Exception as e:
        logger.error(f"Cashfree webhook processing error: {str(e)}")
        await _mark_audit(db, received_at, False, str(e))
        # Always return 200 to prevent Cashfree from retrying endlessly
        return {"status": "success", "note": "internal_error_logged"}


async def _mark_audit(database, received_at: str, processed: bool, error):
    """Update the audit log entry."""
    try:
        await database.webhook_audit.update_one(
            {"received_at": received_at},
            {"$set": {"processed": processed, "error": error}},
        )
    except Exception:
        pass

def get_status_message(status: str) -> str:
    """Get user-friendly status message"""
    messages = {
        "SUCCESS": "Payment successful! Your order is confirmed.",
        "FAILED": "Payment failed. Please try again.",
        "CANCELLED": "Payment was cancelled.",
        "USER_DROPPED": "Payment was not completed.",
        "PENDING": "Payment is being processed..."
    }
    return messages.get(status, "Payment status updated")

async def handle_successful_payment(order: dict, product_type: str):
    """Handle successful payment - update related orders and send notifications"""
    try:
        product_id = order.get("product_id")
        customer_phone = order.get("customer_phone", "")[-10:]
        customer_name = order.get("customer_name", "")
        amount = order.get("amount", 0)
        
        if product_type == "pharmacy":
            # Update pharmacy order
            await db.pharmacy_orders.update_one(
                {"id": product_id},
                {"$set": {
                    "payment_status": "paid",
                    "status": "confirmed",
                    "paid_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Send full notifications (email + WhatsApp to patient + staff)
            try:
                order_doc = await db.pharmacy_orders.find_one({"id": product_id}, {"_id": 0})
                if order_doc:
                    from routes.coupons import send_pharmacy_order_notifications
                    from pydantic import BaseModel as _BM
                    class _FakeInput(_BM):
                        payment_method: str = "cashfree"
                        payment_status: str = "paid"
                        points_used: int = 0
                    class _FakeOrder:
                        def __init__(self, d):
                            for k, v in d.items():
                                setattr(self, k, v)
                    fake_order = _FakeOrder(order_doc)
                    fake_input = _FakeInput()
                    booking_id = order_doc.get("booking_id", product_id)
                    await send_pharmacy_order_notifications(fake_order, fake_input, booking_id)
                    logger.info(f"Full pharmacy notifications sent after payment for {product_id}")
            except Exception as e:
                logger.warning(f"Pharmacy post-payment notifications failed: {e}")
                # Fallback: at least send basic WhatsApp
                try:
                    from services.msg91_whatsapp import send_whatsapp_template
                    await send_whatsapp_template(
                        template_name="order_confirmed",
                        recipient_phone=customer_phone,
                        variables={"customer_name": customer_name, "order_id": product_id, "amount": str(amount)},
                        db=db
                    )
                except Exception as wa_e:
                    logger.warning(f"Fallback WhatsApp also failed: {wa_e}")
        
        elif product_type == "lab_test":
            # Update lab booking
            await db.diagnostic_orders.update_one(
                {"id": product_id},
                {"$set": {
                    "payment_status": "paid",
                    "status": "pending",
                    "paid_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Send full notifications (email + WhatsApp to patient + staff)
            try:
                order_doc = await db.diagnostic_orders.find_one({"id": product_id}, {"_id": 0})
                if order_doc:
                    from routes.queue_status import send_diagnostic_order_notifications
                    from pydantic import BaseModel as _BM2
                    class _FakeDiagInput(_BM2):
                        payment_method: str = "cashfree"
                        payment_status: str = "paid"
                        preferred_time_slot: str = order_doc.get("preferred_time", "Any time")
                        collection_type: str = order_doc.get("collection_type", "home")
                        patient_address: str = order_doc.get("patient_address", "")
                        total_amount: float = order_doc.get("total_amount", 0)
                    class _FakeDiagOrder:
                        def __init__(self, d):
                            for k, v in d.items():
                                setattr(self, k, v)
                    fake_order = _FakeDiagOrder(order_doc)
                    fake_input = _FakeDiagInput()
                    booking_id = order_doc.get("booking_id", product_id)
                    await send_diagnostic_order_notifications(fake_order, fake_input, booking_id)
                    logger.info(f"Full diagnostic notifications sent after payment for {product_id}")
            except Exception as e:
                logger.warning(f"Diagnostic post-payment notifications failed: {e}")
        
        elif product_type == "appointment":
            # Update appointment
            await db.diagyn_appointments.update_one(
                {"id": product_id},
                {"$set": {
                    "payment_status": "paid",
                    "status": "Booked",
                    "paid_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        logger.info(f"Post-payment actions completed for {product_type}: {product_id}")
        
    except Exception as e:
        logger.error(f"Post-payment action error: {e}")

# Payment Dispute Management
@router.post("/disputes")
async def create_dispute(dispute: PaymentDisputeCreate):
    """Create a new payment dispute"""
    try:
        # Generate dispute ID
        dispute_id = f"DISP_{datetime.now().strftime('%Y%m%d%H%M%S')}_{dispute.order_id[-4:]}"
        
        dispute_doc = {
            "dispute_id": dispute_id,
            "order_id": dispute.order_id,
            "order_type": dispute.order_type,
            "customer_name": dispute.customer_name,
            "customer_phone": dispute.customer_phone,
            "customer_email": dispute.customer_email,
            "dispute_reason": dispute.dispute_reason,
            "description": dispute.description,
            "amount": dispute.amount,
            "evidence_urls": dispute.evidence_urls,
            "status": "open",
            "resolution": "pending",
            "priority": determine_priority(dispute.dispute_reason, dispute.amount),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "responses": [],
            "timeline": [{
                "action": "dispute_created",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "by": "customer"
            }]
        }
        
        await db.payment_disputes.insert_one(dispute_doc)
        
        # Notify admin via WebSocket
        await manager.send_payment_update("admin", {
            "type": "new_dispute",
            "dispute_id": dispute_id,
            "order_id": dispute.order_id,
            "customer_name": dispute.customer_name,
            "reason": dispute.dispute_reason,
            "amount": dispute.amount,
            "priority": dispute_doc["priority"]
        })
        
        # Send confirmation to customer
        try:
            from services.msg91_whatsapp import send_whatsapp_text
            await send_whatsapp_text(
                recipient_phone=dispute.customer_phone[-10:],
                message=f"Hi {dispute.customer_name}, your dispute #{dispute_id} has been registered. Our team will review it within 24-48 hours. Amount: ₹{dispute.amount}",
                db=db
            )
        except Exception as e:
            logger.warning(f"Dispute confirmation SMS failed: {e}")
        
        return {
            "success": True,
            "dispute_id": dispute_id,
            "status": "open",
            "message": "Dispute registered successfully. Our team will review within 24-48 hours.",
            "estimated_resolution": "24-48 hours"
        }
        
    except Exception as e:
        logger.error(f"Error creating dispute: {e}")
        raise HTTPException(status_code=500, detail="Failed to create dispute")

def determine_priority(reason: str, amount: float) -> str:
    """Determine dispute priority based on reason and amount"""
    high_priority_reasons = ["duplicate_charge", "not_received", "refund_request"]
    
    if amount >= 5000 or reason in high_priority_reasons:
        return "high"
    elif amount >= 1000:
        return "medium"
    return "low"

@router.get("/disputes")
async def list_disputes(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    limit: int = 50
):
    """List all disputes with optional filters"""
    try:
        query = {}
        if status:
            query["status"] = status
        if priority:
            query["priority"] = priority
        
        disputes = await db.payment_disputes.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        # Get summary
        total = await db.payment_disputes.count_documents({})
        open_count = await db.payment_disputes.count_documents({"status": "open"})
        high_priority = await db.payment_disputes.count_documents({"priority": "high", "status": "open"})
        
        return {
            "disputes": disputes,
            "summary": {
                "total": total,
                "open": open_count,
                "high_priority": high_priority
            }
        }
        
    except Exception as e:
        logger.error(f"Error listing disputes: {e}")
        raise HTTPException(status_code=500, detail="Failed to list disputes")

@router.get("/disputes/{dispute_id}")
async def get_dispute(dispute_id: str):
    """Get dispute details"""
    try:
        dispute = await db.payment_disputes.find_one(
            {"dispute_id": dispute_id},
            {"_id": 0}
        )
        
        if not dispute:
            raise HTTPException(status_code=404, detail="Dispute not found")
        
        return dispute
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting dispute: {e}")
        raise HTTPException(status_code=500, detail="Failed to get dispute")

@router.post("/disputes/{dispute_id}/respond")
async def respond_to_dispute(dispute_id: str, response: DisputeResponse):
    """Admin response to a dispute"""
    try:
        dispute = await db.payment_disputes.find_one({"dispute_id": dispute_id})
        
        if not dispute:
            raise HTTPException(status_code=404, detail="Dispute not found")
        
        response_doc = {
            "admin_response": response.admin_response,
            "resolution": response.resolution,
            "refund_amount": response.refund_amount,
            "resolved_by": response.resolved_by,
            "responded_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Determine new status
        new_status = "resolved" if response.resolution in ["approved_refund", "partial_refund", "rejected"] else "in_progress"
        
        await db.payment_disputes.update_one(
            {"dispute_id": dispute_id},
            {
                "$set": {
                    "status": new_status,
                    "resolution": response.resolution,
                    "refund_amount": response.refund_amount,
                    "resolved_by": response.resolved_by,
                    "resolved_at": datetime.now(timezone.utc).isoformat() if new_status == "resolved" else None,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$push": {
                    "responses": response_doc,
                    "timeline": {
                        "action": f"admin_response_{response.resolution}",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "by": response.resolved_by or "admin"
                    }
                }
            }
        )
        
        # Notify customer
        customer_phone = dispute.get("customer_phone", "")[-10:]
        customer_name = dispute.get("customer_name", "Customer")
        
        resolution_messages = {
            "approved_refund": f"Good news! Your refund of ₹{response.refund_amount} has been approved and will be processed within 5-7 business days.",
            "partial_refund": f"Your dispute has been partially resolved. Refund of ₹{response.refund_amount} will be processed within 5-7 business days.",
            "rejected": f"After review, we were unable to approve your refund request. Reason: {response.admin_response}",
            "escalated": "Your dispute has been escalated to our senior team for further review.",
            "pending": "Your dispute is under review. We'll update you soon."
        }
        
        message = resolution_messages.get(response.resolution, "Your dispute has been updated.")
        
        try:
            from services.msg91_whatsapp import send_whatsapp_text
            await send_whatsapp_text(
                recipient_phone=customer_phone,
                message=f"Hi {customer_name}, update on dispute #{dispute_id}: {message}",
                db=db
            )
        except Exception as e:
            logger.warning(f"Dispute update SMS failed: {e}")
        
        # If refund approved, initiate refund process
        if response.resolution in ["approved_refund", "partial_refund"] and response.refund_amount:
            await initiate_refund(dispute, response.refund_amount)
        
        return {
            "success": True,
            "dispute_id": dispute_id,
            "status": new_status,
            "resolution": response.resolution,
            "message": "Response recorded successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error responding to dispute: {e}")
        raise HTTPException(status_code=500, detail="Failed to respond to dispute")

async def initiate_refund(dispute: dict, refund_amount: float):
    """Initiate refund via Cashfree"""
    try:
        order_id = dispute.get("order_id")
        
        # Find original payment
        payment_order = await db.cashfree_orders.find_one({"product_id": order_id})
        
        if not payment_order:
            logger.warning(f"Payment order not found for refund: {order_id}")
            return
        
        # Create refund record
        refund_doc = {
            "refund_id": f"REF_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "dispute_id": dispute.get("dispute_id"),
            "order_id": order_id,
            "payment_order_id": payment_order.get("order_id"),
            "cf_payment_id": payment_order.get("cf_payment_id"),
            "amount": refund_amount,
            "status": "initiated",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.refunds.insert_one(refund_doc)
        
        # In production, call Cashfree Refund API here
        # For now, mark as pending manual processing
        logger.info(f"Refund initiated: {refund_doc['refund_id']} for ₹{refund_amount}")
        
    except Exception as e:
        logger.error(f"Refund initiation error: {e}")

# Get unread notifications for a user
@router.get("/notifications/{user_id}")
async def get_payment_notifications(user_id: str, limit: int = 20):
    """Get payment notifications for a user"""
    try:
        notifications = await db.payment_notifications.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        unread_count = await db.payment_notifications.count_documents({
            "user_id": user_id,
            "read": False
        })
        
        return {
            "notifications": notifications,
            "unread_count": unread_count
        }
        
    except Exception as e:
        logger.error(f"Error getting notifications: {e}")
        raise HTTPException(status_code=500, detail="Failed to get notifications")

@router.post("/notifications/{user_id}/mark-read")
async def mark_notifications_read(user_id: str):
    """Mark all notifications as read for a user"""
    try:
        result = await db.payment_notifications.update_many(
            {"user_id": user_id, "read": False},
            {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {
            "success": True,
            "marked_read": result.modified_count
        }
        
    except Exception as e:
        logger.error(f"Error marking notifications: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark notifications")
