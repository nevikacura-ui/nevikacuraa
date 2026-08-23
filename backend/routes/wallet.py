"""
Nevika Wallet - Prepaid Wallet System
Supports UPI top-up with screenshot verification and balance management
"""

from fastapi import APIRouter, HTTPException, Depends, Header, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import os
import logging
import base64

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/wallet", tags=["Wallet"])

# MongoDB - injected by server.py
db = None

# Notification functions - injected by server.py
send_email_notification = None
send_sms_notification = None

def set_db(database):
    global db
    db = database

def set_notification_functions(email_fn, sms_fn):
    global send_email_notification, send_sms_notification
    send_email_notification = email_fn
    send_sms_notification = sms_fn

# Admin notification details
ADMIN_EMAIL = "nevikacura@gmail.com"
ADMIN_PHONE = "+919876543210"  # Update with actual admin phone

# ============ MODELS ============

class WalletTopUpRequest(BaseModel):
    amount: float
    payment_method: str = "upi"  # upi, bank_transfer
    transaction_id: Optional[str] = None
    upi_id: Optional[str] = None
    notes: Optional[str] = None

class WalletDeductRequest(BaseModel):
    amount: float
    service_type: str  # teleconsult, diagyn, proton, pharmacy
    reference_id: str  # booking/order ID
    description: str

# ============ AUTH HELPER ============

import jwt
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("sub") or payload.get("user_id")
        phone = payload.get("phone")
        patient_id = payload.get("patient_id")
        
        user = None
        # Try by user ID in both collections
        if user_id:
            user = await db.users.find_one({"id": user_id}, {"_id": 0})
            if not user:
                user = await db.patients.find_one({"id": user_id}, {"_id": 0})
        # Try by patient_id
        if not user and patient_id:
            user = await db.patients.find_one({"patient_id": patient_id}, {"_id": 0})
        # Try by phone in both collections
        if not user and phone:
            user = await db.users.find_one({"phone": phone}, {"_id": 0})
            if not user:
                user = await db.patients.find_one({"phone": phone}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        # Ensure a consistent 'id' field
        if not user.get("id"):
            user["id"] = user.get("patient_id") or user_id or phone
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

async def verify_admin(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Admin authentication required")
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        # Support both 'admin' and 'super_admin' roles
        role = payload.get("role", "")
        if role not in ["admin", "super_admin"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Admin token expired")
    except Exception as e:
        logger.error(f"Admin token validation error: {e}")
        raise HTTPException(status_code=401, detail="Invalid admin token")

# ============ CLINIC UPI DETAILS ============
# Pine Labs UPI for FIXED amount QR payments - prevents customer from modifying amount
CLINIC_UPI = {
    "upi_id": "pinelabs.stq4087704@pineaxis",
    "name": "Nevika Cura Healthcare",
    # Base QR without amount - amount will be added dynamically
    "base_qr_url": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data="
}

def generate_fixed_amount_qr(amount: float, transaction_ref: str = None) -> str:
    """Generate UPI QR code with FIXED amount that cannot be modified by customer"""
    import urllib.parse
    
    # UPI intent format with fixed amount (am=) - customer CANNOT change this
    upi_data = f"upi://pay?pa={CLINIC_UPI['upi_id']}&pn={urllib.parse.quote(CLINIC_UPI['name'])}&am={amount:.2f}&cu=INR"
    
    if transaction_ref:
        upi_data += f"&tn={urllib.parse.quote(f'NEVIKA-{transaction_ref}')}"
    
    # Encode for QR
    return CLINIC_UPI['base_qr_url'] + urllib.parse.quote(upi_data)

# ============ WALLET ROUTES ============

@router.get("/balance")
async def get_wallet_balance(user = Depends(get_current_user)):
    """Get user's wallet balance"""
    wallet = await db.wallets.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not wallet:
        # Create wallet if not exists
        wallet = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "balance": 0.0,
            "total_added": 0.0,
            "total_spent": 0.0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.wallets.insert_one(wallet)
        wallet.pop("_id", None)  # Remove _id if present
    
    # Get pending top-ups
    pending_topups = await db.wallet_transactions.find({
        "user_id": user["id"],
        "type": "topup",
        "status": "pending"
    }, {"_id": 0}).to_list(10)
    
    return {
        "balance": wallet.get("balance", 0),
        "total_added": wallet.get("total_added", 0),
        "total_spent": wallet.get("total_spent", 0),
        "pending_topups": pending_topups,
        "upi_details": CLINIC_UPI
    }

@router.post("/topup")
async def request_wallet_topup(
    data: WalletTopUpRequest,
    user = Depends(get_current_user)
):
    """Request wallet top-up with FIXED amount QR (customer cannot modify amount)"""
    if data.amount < 100:
        raise HTTPException(status_code=400, detail="Minimum top-up amount is ₹100")
    if data.amount > 50000:
        raise HTTPException(status_code=400, detail="Maximum top-up amount is ₹50,000")
    
    transaction_id = str(uuid.uuid4())
    transaction = {
        "id": transaction_id,
        "user_id": user["id"],
        "user_name": user.get("name", ""),
        "user_phone": user.get("phone", ""),
        "type": "topup",
        "amount": data.amount,
        "payment_method": data.payment_method,
        "transaction_id": data.transaction_id,
        "upi_id": data.upi_id,
        "notes": data.notes,
        "status": "pending",  # pending, approved, rejected
        "screenshot_url": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "approved_at": None,
        "approved_by": None
    }
    
    await db.wallet_transactions.insert_one(transaction)
    
    # Generate FIXED amount QR - customer CANNOT change this amount
    fixed_qr = generate_fixed_amount_qr(data.amount, transaction_id[:8])
    
    return {
        "success": True,
        "transaction_id": transaction["id"],
        "message": "Top-up request submitted. Please pay the exact amount using the QR code.",
        "upi_details": {
            "upi_id": CLINIC_UPI["upi_id"],
            "name": CLINIC_UPI["name"],
            "qr_code": fixed_qr,  # Fixed amount QR
            "amount": data.amount,
            "amount_locked": True  # Indicates amount is fixed
        }
    }

@router.post("/topup/{transaction_id}/screenshot")
async def upload_topup_screenshot(
    transaction_id: str,
    screenshot: UploadFile = File(...),
    user = Depends(get_current_user)
):
    """Upload payment screenshot for top-up verification"""
    transaction = await db.wallet_transactions.find_one({
        "id": transaction_id,
        "user_id": user["id"],
        "status": "pending"
    })
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found or already processed")
    
    # Read and store screenshot (base64 for simplicity, use cloud storage in production)
    content = await screenshot.read()
    if len(content) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(status_code=400, detail="Screenshot file too large (max 5MB)")
    
    # Store as base64 (in production, upload to S3/cloud storage)
    screenshot_data = f"data:{screenshot.content_type};base64,{base64.b64encode(content).decode()}"
    
    await db.wallet_transactions.update_one(
        {"id": transaction_id},
        {"$set": {
            "screenshot_url": screenshot_data,
            "screenshot_uploaded_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Send notification to admin about new top-up request with screenshot
    amount = transaction.get("amount", 0)
    user_name = user.get("name", "Unknown")
    user_phone = user.get("phone", "N/A")
    
    try:
        # Send Email to Admin
        if send_email_notification:
            email_html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #0d9488, #14b8a6); padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">💳 New Wallet Top-Up Request</h1>
                </div>
                <div style="padding: 20px; background: #f8fafc;">
                    <h2 style="color: #0d9488;">Payment Screenshot Received</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Amount:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #0d9488; font-size: 24px;"><strong>₹{amount:.2f}</strong></td></tr>
                        <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Customer:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">{user_name}</td></tr>
                        <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Phone:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">{user_phone}</td></tr>
                        <tr><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Transaction ID:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">{transaction_id[:12]}...</td></tr>
                        <tr><td style="padding: 10px;"><strong>Time:</strong></td><td style="padding: 10px;">{datetime.now(timezone.utc).strftime('%d %b %Y, %I:%M %p')} UTC</td></tr>
                    </table>
                    <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 8px;">
                        <p style="margin: 0; color: #92400e;">⚠️ <strong>Action Required:</strong> Please login to Admin Panel → Wallet → Pending Top-ups to verify and approve this request.</p>
                    </div>
                    <p style="margin-top: 20px; color: #64748b; font-size: 12px;">Screenshot has been uploaded and is available in the admin panel for verification.</p>
                </div>
            </div>
            """
            await send_email_notification(
                ADMIN_EMAIL,
                f"🔔 Wallet Top-Up ₹{amount:.2f} - {user_name}",
                email_html
            )
            logger.info(f"Admin email notification sent for wallet top-up: {transaction_id}")
    except Exception as e:
        logger.error(f"Failed to send admin email notification: {e}")
    
    try:
        # Send SMS to Admin
        if send_sms_notification:
            sms_text = f"💳 NEVIKA WALLET: New top-up ₹{amount:.2f} by {user_name} ({user_phone}). Screenshot uploaded. Verify in Admin Panel."
            await send_sms_notification(ADMIN_PHONE, sms_text)
            logger.info(f"Admin SMS notification sent for wallet top-up: {transaction_id}")
    except Exception as e:
        logger.error(f"Failed to send admin SMS notification: {e}")
    
    return {
        "success": True,
        "message": "Screenshot uploaded. Admin has been notified and will verify your top-up within 30 minutes."
    }

@router.get("/payment-qr")
async def get_fixed_amount_payment_qr(
    amount: float,
    purpose: str = "Payment",
    reference: str = None
):
    """Generate a FIXED amount QR code for any payment - customer CANNOT modify the amount"""
    if amount < 1:
        raise HTTPException(status_code=400, detail="Amount must be at least ₹1")
    if amount > 100000:
        raise HTTPException(status_code=400, detail="Amount cannot exceed ₹1,00,000")
    
    ref_id = reference or str(uuid.uuid4())[:8]
    qr_url = generate_fixed_amount_qr(amount, ref_id)
    
    return {
        "success": True,
        "qr_code": qr_url,
        "upi_id": CLINIC_UPI["upi_id"],
        "payee_name": CLINIC_UPI["name"],
        "amount": amount,
        "amount_locked": True,
        "purpose": purpose,
        "reference": ref_id,
        "message": f"Pay exactly ₹{amount:.2f} using this QR. Amount is fixed and cannot be changed."
    }

@router.get("/transactions")
async def get_wallet_transactions(
    limit: int = 20,
    user = Depends(get_current_user)
):
    """Get user's wallet transaction history"""
    transactions = await db.wallet_transactions.find(
        {"user_id": user["id"]},
        {"_id": 0, "screenshot_url": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"transactions": transactions}

@router.post("/deduct")
async def deduct_from_wallet(
    data: WalletDeductRequest,
    user = Depends(get_current_user)
):
    """Deduct amount from wallet for a service"""
    wallet = await db.wallets.find_one({"user_id": user["id"]})
    
    if not wallet:
        raise HTTPException(status_code=400, detail="Wallet not found. Please add balance first.")
    
    if wallet.get("balance", 0) < data.amount:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient balance. Current: ₹{wallet.get('balance', 0)}, Required: ₹{data.amount}"
        )
    
    # Deduct balance
    new_balance = wallet["balance"] - data.amount
    
    await db.wallets.update_one(
        {"user_id": user["id"]},
        {"$set": {
            "balance": new_balance,
            "total_spent": wallet.get("total_spent", 0) + data.amount,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Record transaction
    transaction = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "type": "debit",
        "amount": data.amount,
        "service_type": data.service_type,
        "reference_id": data.reference_id,
        "description": data.description,
        "status": "completed",
        "balance_after": new_balance,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.wallet_transactions.insert_one(transaction)
    
    return {
        "success": True,
        "deducted": data.amount,
        "new_balance": new_balance,
        "transaction_id": transaction["id"]
    }

# ============ ADMIN ROUTES ============

@router.get("/admin/pending")
async def get_pending_topups(admin = Depends(verify_admin)):
    """Get all pending top-up requests"""
    pending = await db.wallet_transactions.find(
        {"type": "topup", "status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"pending_topups": pending}

@router.post("/admin/approve/{transaction_id}")
async def approve_topup(
    transaction_id: str,
    admin = Depends(verify_admin)
):
    """Approve a wallet top-up request"""
    transaction = await db.wallet_transactions.find_one({
        "id": transaction_id,
        "type": "topup",
        "status": "pending"
    })
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found or already processed")
    
    user_id = transaction["user_id"]
    amount = transaction["amount"]
    
    # Update wallet balance
    wallet = await db.wallets.find_one({"user_id": user_id})
    if wallet:
        new_balance = wallet.get("balance", 0) + amount
        await db.wallets.update_one(
            {"user_id": user_id},
            {"$set": {
                "balance": new_balance,
                "total_added": wallet.get("total_added", 0) + amount,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    else:
        await db.wallets.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "balance": amount,
            "total_added": amount,
            "total_spent": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        new_balance = amount
    
    # Update transaction status
    await db.wallet_transactions.update_one(
        {"id": transaction_id},
        {"$set": {
            "status": "approved",
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "approved_by": "admin",
            "balance_after": new_balance
        }}
    )
    
    return {
        "success": True,
        "message": f"Top-up of ₹{amount} approved for user",
        "new_balance": new_balance
    }

@router.post("/admin/reject/{transaction_id}")
async def reject_topup(
    transaction_id: str,
    reason: str = "Payment not verified",
    admin = Depends(verify_admin)
):
    """Reject a wallet top-up request"""
    result = await db.wallet_transactions.update_one(
        {"id": transaction_id, "type": "topup", "status": "pending"},
        {"$set": {
            "status": "rejected",
            "rejected_at": datetime.now(timezone.utc).isoformat(),
            "rejection_reason": reason
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found or already processed")
    
    return {"success": True, "message": "Top-up request rejected"}

@router.get("/admin/all")
async def get_all_wallets(admin = Depends(verify_admin)):
    """Get all user wallets with balances"""
    wallets = await db.wallets.find({}, {"_id": 0}).to_list(500)
    
    total_balance = sum(w.get("balance", 0) for w in wallets)
    
    return {
        "wallets": wallets,
        "total_users": len(wallets),
        "total_balance": total_balance
    }

class GiftCashRequest(BaseModel):
    user_phone: str
    amount: float
    description: Optional[str] = "Gift cash from Nevika Cura"
    admin_note: Optional[str] = None

@router.post("/admin/gift-cash")
async def add_gift_cash(data: GiftCashRequest, admin = Depends(verify_admin)):
    """Admin: Add gift cash to a user's wallet"""
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    if data.amount > 10000:
        raise HTTPException(status_code=400, detail="Maximum gift cash is Rs.10,000 per transaction")
    
    # Clean phone
    clean_phone = data.user_phone.strip().replace(" ", "")
    if not clean_phone.startswith("91") and len(clean_phone) == 10:
        clean_phone = "91" + clean_phone
    
    # Find user by phone
    user = await db.users.find_one({"phone": {"$regex": clean_phone}}, {"_id": 0, "password": 0})
    user_id = user.get("id") if user else clean_phone
    user_name = user.get("name", "Unknown") if user else "New User"
    
    # Update or create wallet
    now = datetime.now(timezone.utc).isoformat()
    wallet = await db.wallets.find_one({"user_id": user_id})
    
    if wallet:
        new_balance = wallet.get("balance", 0) + data.amount
        await db.wallets.update_one(
            {"user_id": user_id},
            {"$set": {
                "balance": new_balance,
                "total_added": wallet.get("total_added", 0) + data.amount,
                "updated_at": now
            }}
        )
    else:
        new_balance = data.amount
        await db.wallets.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "user_phone": clean_phone,
            "user_name": user_name,
            "balance": data.amount,
            "total_added": data.amount,
            "total_spent": 0,
            "created_at": now,
            "updated_at": now
        })
    
    # Record transaction
    transaction = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_phone": clean_phone,
        "user_name": user_name,
        "type": "gift_cash",
        "amount": data.amount,
        "description": data.description,
        "admin_note": data.admin_note or "",
        "status": "completed",
        "balance_after": new_balance,
        "created_at": now
    }
    await db.wallet_transactions.insert_one(transaction)
    
    logger.info(f"[WALLET] Gift cash Rs.{data.amount} added to {clean_phone} ({user_name})")
    
    return {
        "success": True,
        "message": f"Rs.{data.amount} gift cash added to {user_name}",
        "new_balance": new_balance,
        "user_phone": clean_phone,
        "user_name": user_name
    }

@router.get("/admin/gift-cash/history")
async def get_gift_cash_history(limit: int = 50, admin = Depends(verify_admin)):
    """Admin: View gift cash transaction history"""
    transactions = await db.wallet_transactions.find(
        {"type": "gift_cash"}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"transactions": transactions, "count": len(transactions)}

@router.get("/admin/search-user")
async def search_user_for_gift(phone: str = "", admin = Depends(verify_admin)):
    """Admin: Search user by phone to add gift cash"""
    if not phone:
        wallets = await db.wallets.find({}, {"_id": 0}).sort("updated_at", -1).limit(10).to_list(10)
        return {"users": wallets}
    
    clean_phone = phone.strip().replace(" ", "")
    if not clean_phone.startswith("91") and len(clean_phone) == 10:
        clean_phone = "91" + clean_phone
    
    # Search users
    user = await db.users.find_one(
        {"phone": {"$regex": clean_phone}},
        {"_id": 0, "password": 0}
    )
    
    wallet = await db.wallets.find_one(
        {"$or": [{"user_phone": {"$regex": clean_phone}}, {"user_id": user.get("id") if user else ""}]},
        {"_id": 0}
    )
    
    if user:
        return {"users": [{
            "user_id": user.get("id", ""),
            "user_phone": user.get("phone", clean_phone),
            "user_name": user.get("name", ""),
            "balance": wallet.get("balance", 0) if wallet else 0,
            "has_wallet": bool(wallet)
        }]}
    else:
        return {"users": [{
            "user_id": "",
            "user_phone": clean_phone,
            "user_name": "New User",
            "balance": wallet.get("balance", 0) if wallet else 0,
            "has_wallet": bool(wallet)
        }]}


# ============ CASHFREE WALLET TOP-UP ============

class CashfreeTopUpRequest(BaseModel):
    amount: float
    return_url: Optional[str] = None

@router.post("/cashfree-topup")
async def create_cashfree_wallet_topup(
    data: CashfreeTopUpRequest,
    user = Depends(get_current_user)
):
    """Create Cashfree payment order for wallet top-up"""
    if data.amount < 50:
        raise HTTPException(status_code=400, detail="Minimum top-up is ₹50")
    if data.amount > 50000:
        raise HTTPException(status_code=400, detail="Maximum top-up is ₹50,000")
    
    try:
        from cashfree_pg.models.create_order_request import CreateOrderRequest
        from cashfree_pg.models.customer_details import CustomerDetails
        from cashfree_pg.models.order_meta import OrderMeta
        from cashfree_pg.api_client import Cashfree
        
        client_id = os.environ.get("CASHFREE_CLIENT_ID")
        client_secret = os.environ.get("CASHFREE_CLIENT_SECRET")
        env = os.environ.get("CASHFREE_ENVIRONMENT", "sandbox")
        cashfree = Cashfree(
            XEnvironment=Cashfree.PRODUCTION if env == "production" else Cashfree.SANDBOX,
            XClientId=client_id, XClientSecret=client_secret
        )
        
        timestamp = int(datetime.now(timezone.utc).timestamp())
        order_id = f"CP_TOPUP_{timestamp}_{user['id'][:8]}"
        
        frontend_url = os.environ.get("CHECKOUT_BASE_URL", os.environ.get("FRONTEND_URL", ""))
        return_url = data.return_url or f"{frontend_url}/cura-wallet?topup_order={order_id}"
        
        clean_phone = user.get("phone", "0000000000").replace("+91", "").replace("+", "").replace(" ", "")[-10:]
        if len(clean_phone) < 10:
            clean_phone = clean_phone.zfill(10)
        
        customer_name = user.get("name", "CuraPay User").strip()
        if len(customer_name) < 3:
            customer_name = f"{customer_name} User"
        
        customer = CustomerDetails(
            customer_id=user["id"],
            customer_phone=clean_phone,
            customer_email=user.get("email", f"{clean_phone}@nevikacura.com"),
            customer_name=customer_name
        )
        order_meta = OrderMeta(return_url=return_url)
        
        create_req = CreateOrderRequest(
            order_id=order_id,
            order_amount=float(data.amount),
            order_currency="INR",
            customer_details=customer,
            order_meta=order_meta
        )
        
        response = cashfree.PGCreateOrder("2023-08-01", create_req, None, None)
        
        if response and response.data:
            # Store top-up order
            await db.wallet_topup_orders.insert_one({
                "order_id": order_id,
                "cf_order_id": response.data.cf_order_id,
                "payment_session_id": response.data.payment_session_id,
                "user_id": user["id"],
                "user_phone": user.get("phone", ""),
                "user_name": user.get("name", ""),
                "amount": data.amount,
                "status": "PENDING",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            return {
                "success": True,
                "order_id": order_id,
                "payment_session_id": response.data.payment_session_id,
                "cf_order_id": response.data.cf_order_id,
                "amount": data.amount
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create payment order")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cashfree top-up error: {e}")
        raise HTTPException(status_code=500, detail=f"Payment error: {str(e)}")

@router.post("/cashfree-topup/verify/{order_id}")
async def verify_cashfree_topup(order_id: str, user = Depends(get_current_user)):
    """Verify Cashfree payment and credit wallet"""
    topup = await db.wallet_topup_orders.find_one({"order_id": order_id, "user_id": user["id"]})
    if not topup:
        raise HTTPException(status_code=404, detail="Top-up order not found")
    
    if topup.get("status") == "CREDITED":
        return {"success": True, "message": "Already credited", "amount": topup["amount"]}
    
    try:
        from cashfree_pg.api_client import Cashfree
        client_id = os.environ.get("CASHFREE_CLIENT_ID")
        client_secret = os.environ.get("CASHFREE_CLIENT_SECRET")
        env = os.environ.get("CASHFREE_ENVIRONMENT", "sandbox")
        cashfree = Cashfree(
            XEnvironment=Cashfree.PRODUCTION if env == "production" else Cashfree.SANDBOX,
            XClientId=client_id, XClientSecret=client_secret
        )
        
        response = cashfree.PGOrderFetchPayments("2023-08-01", order_id, None)
        
        if response and response.data:
            for payment in response.data:
                if payment.payment_status == "SUCCESS":
                    amount = topup["amount"]
                    
                    # Credit wallet
                    wallet = await db.wallets.find_one({"user_id": user["id"]})
                    now = datetime.now(timezone.utc).isoformat()
                    
                    if wallet:
                        new_balance = wallet.get("balance", 0) + amount
                        await db.wallets.update_one(
                            {"user_id": user["id"]},
                            {"$set": {
                                "balance": new_balance,
                                "total_added": wallet.get("total_added", 0) + amount,
                                "updated_at": now
                            }}
                        )
                    else:
                        new_balance = amount
                        await db.wallets.insert_one({
                            "id": str(uuid.uuid4()),
                            "user_id": user["id"],
                            "balance": amount,
                            "total_added": amount,
                            "total_spent": 0,
                            "created_at": now, "updated_at": now
                        })
                    
                    # Record transaction
                    await db.wallet_transactions.insert_one({
                        "id": str(uuid.uuid4()),
                        "user_id": user["id"],
                        "type": "topup",
                        "amount": amount,
                        "description": "CuraPay top-up via Cashfree",
                        "payment_method": "cashfree",
                        "cashfree_order_id": order_id,
                        "status": "completed",
                        "balance_after": new_balance,
                        "created_at": now
                    })
                    
                    # Award loyalty points (2% of top-up)
                    loyalty_points = int(amount * 0.02)
                    if loyalty_points > 0:
                        await db.wallets.update_one(
                            {"user_id": user["id"]},
                            {"$inc": {"loyalty_points": loyalty_points}}
                        )
                    
                    await db.wallet_topup_orders.update_one(
                        {"order_id": order_id},
                        {"$set": {"status": "CREDITED", "credited_at": now}}
                    )
                    
                    return {
                        "success": True,
                        "message": f"₹{amount} credited to CuraPay wallet",
                        "amount": amount,
                        "new_balance": new_balance,
                        "loyalty_points_earned": loyalty_points
                    }
        
        return {"success": False, "message": "Payment not completed yet"}
    except Exception as e:
        logger.error(f"Top-up verify error: {e}")
        return {"success": False, "message": "Verification failed. Try again."}

# ============ CURAPAY - PAY WITH WALLET ============

class CuraPayCheckoutRequest(BaseModel):
    amount: float
    service_type: str  # pharmacy, lab, diagyn
    reference_id: str
    description: str

@router.post("/curapay/checkout")
async def curapay_checkout(
    data: CuraPayCheckoutRequest,
    user = Depends(get_current_user)
):
    """Pay using CuraPay wallet balance — also awards loyalty points"""
    wallet = await db.wallets.find_one({"user_id": user["id"]})
    
    if not wallet or wallet.get("balance", 0) < data.amount:
        balance = wallet.get("balance", 0) if wallet else 0
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient CuraPay balance. Current: ₹{balance}, Required: ₹{data.amount}"
        )
    
    new_balance = wallet["balance"] - data.amount
    now = datetime.now(timezone.utc).isoformat()
    
    # Deduct from wallet
    await db.wallets.update_one(
        {"user_id": user["id"]},
        {"$set": {
            "balance": new_balance,
            "total_spent": wallet.get("total_spent", 0) + data.amount,
            "updated_at": now
        }}
    )
    
    # Award loyalty points (3% for wallet payments — better than other methods)
    loyalty_points = int(data.amount * 0.03)
    if loyalty_points > 0:
        await db.wallets.update_one(
            {"user_id": user["id"]},
            {"$inc": {"loyalty_points": loyalty_points}}
        )
    
    # Record transaction
    txn_id = str(uuid.uuid4())
    await db.wallet_transactions.insert_one({
        "id": txn_id,
        "user_id": user["id"],
        "type": "debit",
        "amount": data.amount,
        "service_type": data.service_type,
        "reference_id": data.reference_id,
        "description": data.description,
        "payment_method": "curapay",
        "status": "completed",
        "balance_after": new_balance,
        "loyalty_points_earned": loyalty_points,
        "created_at": now
    })
    
    logger.info(f"[CURAPAY] ₹{data.amount} paid by {user['id']} for {data.service_type}:{data.reference_id}")
    
    return {
        "success": True,
        "transaction_id": txn_id,
        "amount_paid": data.amount,
        "new_balance": new_balance,
        "loyalty_points_earned": loyalty_points,
        "message": f"₹{data.amount} paid via CuraPay. {loyalty_points} loyalty points earned!"
    }
