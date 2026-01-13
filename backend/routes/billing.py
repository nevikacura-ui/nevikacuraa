"""
Billing & Due Payments System
Handles invoices, due payments, payment tracking, and billing reports
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import uuid

router = APIRouter(prefix="/billing", tags=["Billing"])

# Models
class InvoiceItem(BaseModel):
    description: str
    quantity: int = 1
    unit_price: float
    total: float

class CreateInvoice(BaseModel):
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    service_type: str  # appointment, diagnostic, pharmacy
    service_id: str  # ID of the appointment/order
    items: List[InvoiceItem]
    discount: float = 0
    tax_percent: float = 0
    notes: Optional[str] = None
    due_date: Optional[str] = None
    payment_status: str = "pending"  # pending, partial, paid, overdue

class RecordPayment(BaseModel):
    invoice_id: str
    amount: float
    payment_method: str  # cash, card, upi, insurance
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class DuePaymentFilter(BaseModel):
    status: Optional[str] = None  # pending, overdue, partial
    service_type: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None

# Helper to get DB
def get_db():
    from server import db
    return db

# Routes
@router.post("/invoices")
async def create_invoice(invoice: CreateInvoice):
    """Create a new invoice"""
    db = get_db()
    
    subtotal = sum(item.total for item in invoice.items)
    tax_amount = subtotal * (invoice.tax_percent / 100)
    total = subtotal - invoice.discount + tax_amount
    
    invoice_doc = {
        "id": str(uuid.uuid4()),
        "invoice_number": f"INV-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}",
        "patient_name": invoice.patient_name,
        "patient_phone": invoice.patient_phone,
        "patient_email": invoice.patient_email,
        "service_type": invoice.service_type,
        "service_id": invoice.service_id,
        "items": [item.dict() for item in invoice.items],
        "subtotal": subtotal,
        "discount": invoice.discount,
        "tax_percent": invoice.tax_percent,
        "tax_amount": tax_amount,
        "total": total,
        "amount_paid": 0,
        "amount_due": total,
        "payment_status": invoice.payment_status,
        "payments": [],
        "notes": invoice.notes,
        "due_date": invoice.due_date or (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%d"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.invoices.insert_one(invoice_doc)
    
    # Create due payment record if not fully paid
    if invoice.payment_status != "paid":
        due_record = {
            "id": str(uuid.uuid4()),
            "invoice_id": invoice_doc["id"],
            "invoice_number": invoice_doc["invoice_number"],
            "patient_name": invoice.patient_name,
            "patient_phone": invoice.patient_phone,
            "service_type": invoice.service_type,
            "amount_due": total,
            "due_date": invoice_doc["due_date"],
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.due_payments.insert_one(due_record)
    
    return {"success": True, "invoice": {k: v for k, v in invoice_doc.items() if k != "_id"}}

@router.get("/invoices")
async def list_invoices(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    service_type: Optional[str] = None,
    search: Optional[str] = None
):
    """List all invoices with filters"""
    db = get_db()
    
    query = {}
    if status:
        query["payment_status"] = status
    if service_type:
        query["service_type"] = service_type
    if search:
        query["$or"] = [
            {"patient_name": {"$regex": search, "$options": "i"}},
            {"patient_phone": {"$regex": search}},
            {"invoice_number": {"$regex": search, "$options": "i"}}
        ]
    
    skip = (page - 1) * limit
    total = await db.invoices.count_documents(query)
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "invoices": invoices,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str):
    """Get invoice by ID"""
    db = get_db()
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@router.post("/invoices/{invoice_id}/payment")
async def record_payment(invoice_id: str, payment: RecordPayment):
    """Record a payment against an invoice"""
    db = get_db()
    
    invoice = await db.invoices.find_one({"id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if payment.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be positive")
    
    new_paid = invoice.get("amount_paid", 0) + payment.amount
    new_due = invoice.get("total", 0) - new_paid
    
    # Determine new status
    if new_due <= 0:
        new_status = "paid"
        new_due = 0
    elif new_paid > 0:
        new_status = "partial"
    else:
        new_status = "pending"
    
    payment_record = {
        "id": str(uuid.uuid4()),
        "amount": payment.amount,
        "payment_method": payment.payment_method,
        "reference_number": payment.reference_number,
        "notes": payment.notes,
        "recorded_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.invoices.update_one(
        {"id": invoice_id},
        {
            "$set": {
                "amount_paid": new_paid,
                "amount_due": new_due,
                "payment_status": new_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {"payments": payment_record}
        }
    )
    
    # Update due payment record
    if new_status == "paid":
        await db.due_payments.update_one(
            {"invoice_id": invoice_id},
            {"$set": {"status": "paid", "amount_due": 0}}
        )
    else:
        await db.due_payments.update_one(
            {"invoice_id": invoice_id},
            {"$set": {"status": new_status, "amount_due": new_due}}
        )
    
    return {
        "success": True,
        "payment": payment_record,
        "invoice_status": new_status,
        "amount_paid": new_paid,
        "amount_due": new_due
    }

@router.get("/dashboard")
async def get_billing_dashboard():
    """Get billing dashboard stats"""
    db = get_db()
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Get counts
    total_due = 0
    overdue_count = 0
    pending_count = 0
    partial_count = 0
    
    dues = await db.due_payments.find({"status": {"$ne": "paid"}}, {"_id": 0}).to_list(1000)
    for due in dues:
        total_due += due.get("amount_due", 0)
        status = due.get("status", "pending")
        if status == "overdue":
            overdue_count += 1
        elif status == "pending":
            pending_count += 1
        elif status == "partial":
            partial_count += 1
    
    # Get today's collection
    today_invoices = await db.invoices.find(
        {"updated_at": {"$regex": f"^{today}"}},
        {"_id": 0, "payments": 1}
    ).to_list(500)
    
    collected_today = 0
    for inv in today_invoices:
        for payment in inv.get("payments", []):
            if payment.get("recorded_at", "").startswith(today):
                collected_today += payment.get("amount", 0)
    
    return {
        "total_due": total_due,
        "overdue_count": overdue_count,
        "pending_count": pending_count,
        "partial_count": partial_count,
        "collected_today": collected_today
    }

@router.get("/due-payments")
async def get_due_payments(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    service_type: Optional[str] = None,
    overdue_only: bool = False
):
    """Get all due payments"""
    db = get_db()
    
    query = {"status": {"$ne": "paid"}}
    if status:
        query["status"] = status
    if service_type:
        query["service_type"] = service_type
    if overdue_only:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        query["due_date"] = {"$lt": today}
        query["status"] = {"$ne": "paid"}
    
    skip = (page - 1) * limit
    total = await db.due_payments.count_documents(query)
    dues = await db.due_payments.find(query, {"_id": 0}).sort("due_date", 1).skip(skip).limit(limit).to_list(limit)
    
    # Mark overdue items
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    for due in dues:
        if due.get("due_date") and due["due_date"] < today and due["status"] != "paid":
            due["is_overdue"] = True
            # Update in DB if not already marked
            if due["status"] != "overdue":
                await db.due_payments.update_one(
                    {"id": due["id"]},
                    {"$set": {"status": "overdue"}}
                )
                due["status"] = "overdue"
        else:
            due["is_overdue"] = False
    
    return {
        "due_payments": dues,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@router.get("/summary")
async def get_billing_summary(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None
):
    """Get billing summary with totals"""
    db = get_db()
    
    query = {}
    if date_from:
        query["created_at"] = {"$gte": date_from}
    if date_to:
        if "created_at" in query:
            query["created_at"]["$lte"] = date_to
        else:
            query["created_at"] = {"$lte": date_to}
    
    # Get all invoices
    invoices = await db.invoices.find(query, {"_id": 0}).to_list(10000)
    
    total_billed = sum(inv.get("total", 0) for inv in invoices)
    total_collected = sum(inv.get("amount_paid", 0) for inv in invoices)
    total_due = sum(inv.get("amount_due", 0) for inv in invoices)
    
    # Count by status
    status_counts = {}
    for inv in invoices:
        status = inv.get("payment_status", "pending")
        status_counts[status] = status_counts.get(status, 0) + 1
    
    # Count by service type
    service_counts = {}
    service_revenue = {}
    for inv in invoices:
        stype = inv.get("service_type", "other")
        service_counts[stype] = service_counts.get(stype, 0) + 1
        service_revenue[stype] = service_revenue.get(stype, 0) + inv.get("amount_paid", 0)
    
    # Get overdue count
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    overdue_count = await db.due_payments.count_documents({
        "due_date": {"$lt": today},
        "status": {"$ne": "paid"}
    })
    overdue_amount = 0
    overdue_docs = await db.due_payments.find({
        "due_date": {"$lt": today},
        "status": {"$ne": "paid"}
    }, {"_id": 0, "amount_due": 1}).to_list(1000)
    overdue_amount = sum(d.get("amount_due", 0) for d in overdue_docs)
    
    return {
        "total_invoices": len(invoices),
        "total_billed": round(total_billed, 2),
        "total_collected": round(total_collected, 2),
        "total_due": round(total_due, 2),
        "collection_rate": round((total_collected / total_billed * 100) if total_billed > 0 else 0, 1),
        "status_counts": status_counts,
        "service_counts": service_counts,
        "service_revenue": service_revenue,
        "overdue": {
            "count": overdue_count,
            "amount": round(overdue_amount, 2)
        }
    }

@router.post("/send-reminder/{invoice_id}")
async def send_payment_reminder(invoice_id: str):
    """Send payment reminder for an invoice"""
    db = get_db()
    
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Invoice already paid")
    
    # Import notification function
    try:
        from server import send_sms_notification, send_email_notification
        
        # Send SMS reminder
        message = f"Payment Reminder from Nevika Cura\n\nInvoice: {invoice['invoice_number']}\nAmount Due: ₹{invoice['amount_due']}\nDue Date: {invoice['due_date']}\n\nPlease clear your dues at the earliest."
        
        await send_sms_notification(invoice["patient_phone"], message)
        
        # Send email if available
        if invoice.get("patient_email"):
            await send_email_notification(
                invoice["patient_email"],
                f"Payment Reminder - Invoice {invoice['invoice_number']}",
                f"Dear {invoice['patient_name']},\n\nThis is a reminder for your pending payment.\n\nInvoice Number: {invoice['invoice_number']}\nAmount Due: ₹{invoice['amount_due']}\nDue Date: {invoice['due_date']}\n\nPlease clear your dues at the earliest.\n\nThank you,\nNevika Cura"
            )
        
        # Record reminder sent
        await db.invoices.update_one(
            {"id": invoice_id},
            {
                "$push": {
                    "reminders_sent": {
                        "sent_at": datetime.now(timezone.utc).isoformat(),
                        "type": "payment_reminder"
                    }
                }
            }
        )
        
        return {"success": True, "message": "Reminder sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send reminder: {str(e)}")
