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
        # Support both 'sub' (from server.py) and 'user_id' (legacy) for user ID
        user_id = payload.get("sub") or payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
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
