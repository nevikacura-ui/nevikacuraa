"""
Invoice Routes - API endpoints for generating and sending invoices
Supports all services: Nevika, DiaGyn, Orange Pharmacy, Mango Labs
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from io import BytesIO
import uuid
import logging
import base64

router = APIRouter(prefix="/invoices", tags=["Invoices"])

logger = logging.getLogger(__name__)

db = None

def get_db():
    global db
    return db

def set_db(database):
    global db
    db = database

# Import invoice generator
from services.invoice_generator import generate_invoice_pdf, get_invoice_base64

# ============ PYDANTIC MODELS ============

class InvoiceItem(BaseModel):
    name: str
    quantity: int = 1
    price: float
    total: float

class GenerateInvoiceRequest(BaseModel):
    service_type: str  # nevika, diagyn, orange, mango
    invoice_number: Optional[str] = None
    date: Optional[str] = None
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    items: List[InvoiceItem]
    subtotal: float
    discount: float = 0
    total: float
    payment_status: str = "paid"
    payment_method: Optional[str] = None
    # Service-specific fields
    clinic_name: Optional[str] = None      # DiaGyn
    doctor_name: Optional[str] = None      # DiaGyn
    lab_technician: Optional[str] = None   # Mango
    delivery_address: Optional[str] = None # Orange
    delivery_partner: Optional[str] = None # Orange
    delivery_time: Optional[str] = None    # Orange
    notes: Optional[str] = None

class SendInvoiceRequest(BaseModel):
    invoice_id: str
    send_whatsapp: bool = True
    send_email: bool = True

# ============ INVOICE GENERATION ENDPOINTS ============

@router.post("/generate")
async def generate_invoice(request: GenerateInvoiceRequest):
    """Generate a PDF invoice and return it as base64"""
    db = get_db()
    
    # Generate invoice number if not provided
    invoice_number = request.invoice_number
    if not invoice_number:
        prefix_map = {
            "nevika": "NC",
            "diagyn": "DG",
            "orange": "OP",
            "mango": "ML"
        }
        prefix = prefix_map.get(request.service_type.lower(), "INV")
        invoice_number = f"{prefix}-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
    
    # Prepare invoice data
    invoice_data = {
        "invoice_number": invoice_number,
        "date": request.date or datetime.now().strftime("%d %b %Y"),
        "patient_name": request.patient_name,
        "patient_phone": request.patient_phone,
        "patient_email": request.patient_email,
        "items": [item.dict() for item in request.items],
        "subtotal": request.subtotal,
        "discount": request.discount,
        "total": request.total,
        "payment_status": request.payment_status,
        "payment_method": request.payment_method,
        "clinic_name": request.clinic_name,
        "doctor_name": request.doctor_name,
        "lab_technician": request.lab_technician,
        "delivery_address": request.delivery_address,
        "delivery_partner": request.delivery_partner,
        "delivery_time": request.delivery_time,
        "notes": request.notes
    }
    
    try:
        # Generate PDF
        pdf_base64 = get_invoice_base64(invoice_data, request.service_type)
        
        # Store invoice record in database
        invoice_record = {
            "id": str(uuid.uuid4()),
            "invoice_number": invoice_number,
            "service_type": request.service_type,
            "patient_name": request.patient_name,
            "patient_phone": request.patient_phone,
            "patient_email": request.patient_email,
            "total": request.total,
            "payment_status": request.payment_status,
            "pdf_base64": pdf_base64,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "sent_whatsapp": False,
            "sent_email": False
        }
        
        await db.generated_invoices.insert_one(invoice_record)
        
        return {
            "success": True,
            "invoice_id": invoice_record["id"],
            "invoice_number": invoice_number,
            "pdf_base64": pdf_base64
        }
        
    except Exception as e:
        logger.error(f"Failed to generate invoice: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate invoice: {str(e)}")

@router.get("/download/{invoice_id}")
async def download_invoice(invoice_id: str):
    """Download invoice PDF"""
    db = get_db()
    
    invoice = await db.generated_invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    try:
        pdf_bytes = base64.b64decode(invoice["pdf_base64"])
        
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={invoice['invoice_number']}.pdf"
            }
        )
    except Exception as e:
        logger.error(f"Failed to download invoice: {e}")
        raise HTTPException(status_code=500, detail="Failed to download invoice")

@router.get("/view/{invoice_id}")
async def view_invoice(invoice_id: str):
    """View invoice PDF in browser"""
    db = get_db()
    
    invoice = await db.generated_invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    try:
        pdf_bytes = base64.b64decode(invoice["pdf_base64"])
        
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename={invoice['invoice_number']}.pdf"
            }
        )
    except Exception as e:
        logger.error(f"Failed to view invoice: {e}")
        raise HTTPException(status_code=500, detail="Failed to view invoice")

@router.post("/send/{invoice_id}")
async def send_invoice(invoice_id: str, request: SendInvoiceRequest, background_tasks: BackgroundTasks):
    """Send invoice via WhatsApp and/or Email"""
    db = get_db()
    
    invoice = await db.generated_invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    results = {"whatsapp": None, "email": None}
    
    if request.send_whatsapp:
        background_tasks.add_task(
            send_invoice_whatsapp,
            invoice["patient_phone"],
            invoice["patient_name"],
            invoice["invoice_number"],
            invoice["total"],
            invoice["service_type"],
            invoice_id
        )
        results["whatsapp"] = "queued"
    
    if request.send_email and invoice.get("patient_email"):
        background_tasks.add_task(
            send_invoice_email,
            invoice["patient_email"],
            invoice["patient_name"],
            invoice["invoice_number"],
            invoice["total"],
            invoice["service_type"],
            invoice["pdf_base64"]
        )
        results["email"] = "queued"
    elif request.send_email and not invoice.get("patient_email"):
        results["email"] = "no_email_provided"
    
    return {
        "success": True,
        "message": "Invoice delivery initiated",
        "results": results
    }

# ============ SERVICE-SPECIFIC INVOICE TRIGGERS ============

@router.post("/trigger/diagyn/{appointment_id}")
async def trigger_diagyn_invoice(appointment_id: str, background_tasks: BackgroundTasks):
    """Trigger invoice generation for DiaGyn after consultation completion"""
    db = get_db()
    
    # Find the appointment
    appointment = await db.diagyn_appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Check if consultation is completed
    if appointment.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Consultation not yet completed")
    
    # Prepare invoice data
    fee = appointment.get("consultation_fee", appointment.get("fee", 500))
    
    invoice_data = {
        "service_type": "diagyn",
        "patient_name": appointment.get("patient_name", "Patient"),
        "patient_phone": appointment.get("patient_mobile", appointment.get("patient_phone", "")),
        "patient_email": appointment.get("patient_email"),
        "items": [
            {
                "name": f"Consultation - {appointment.get('doctor', 'Doctor')}",
                "quantity": 1,
                "price": fee,
                "total": fee
            }
        ],
        "subtotal": fee,
        "discount": 0,
        "total": fee,
        "payment_status": appointment.get("payment_status", "paid"),
        "payment_method": appointment.get("payment_method", "cash"),
        "clinic_name": appointment.get("clinic", "DiaGyn Clinic"),
        "doctor_name": appointment.get("doctor", "Doctor")
    }
    
    # Generate and send invoice
    result = await _generate_and_send_invoice(invoice_data, background_tasks)
    
    # Update appointment with invoice ID
    await db.diagyn_appointments.update_one(
        {"id": appointment_id},
        {"$set": {"invoice_id": result["invoice_id"], "invoice_sent": True}}
    )
    
    return result

@router.post("/trigger/orange/{order_id}")
async def trigger_orange_invoice(order_id: str, background_tasks: BackgroundTasks):
    """Trigger invoice generation for Orange Pharmacy after delivery"""
    db = get_db()
    
    # Find the order
    order = await db.pharmacy_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if order is delivered
    if order.get("status") != "Delivered":
        raise HTTPException(status_code=400, detail="Order not yet delivered")
    
    # Prepare items
    items = []
    for med in order.get("medicines", []):
        item_total = med.get("price", 0) * med.get("quantity", 1)
        items.append({
            "name": med.get("name", "Medicine"),
            "quantity": med.get("quantity", 1),
            "price": med.get("price", 0),
            "total": item_total
        })
    
    subtotal = sum(item["total"] for item in items)
    discount = order.get("discount", 0)
    total = order.get("total", subtotal - discount)
    
    invoice_data = {
        "service_type": "orange",
        "patient_name": order.get("patient_name", order.get("name", "Customer")),
        "patient_phone": order.get("patient_phone", order.get("phone", "")),
        "patient_email": order.get("patient_email", order.get("email")),
        "items": items,
        "subtotal": subtotal,
        "discount": discount,
        "total": total,
        "payment_status": order.get("payment_status", "paid"),
        "payment_method": order.get("payment_method", "cod"),
        "delivery_address": order.get("address", ""),
        "delivery_time": datetime.now().strftime("%d %b %Y, %I:%M %p")
    }
    
    # Generate and send invoice
    result = await _generate_and_send_invoice(invoice_data, background_tasks)
    
    # Update order with invoice ID
    await db.pharmacy_orders.update_one(
        {"id": order_id},
        {"$set": {"invoice_id": result["invoice_id"], "invoice_sent": True}}
    )
    
    return result

@router.post("/trigger/mango/{booking_id}")
async def trigger_mango_invoice(booking_id: str, background_tasks: BackgroundTasks):
    """Trigger invoice generation for Mango Labs after report dispatch"""
    db = get_db()
    
    # Find the booking
    booking = await db.diagnostic_bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check if report is ready
    if booking.get("status") not in ["Reports Generated", "completed", "dispatched"]:
        raise HTTPException(status_code=400, detail="Report not yet dispatched")
    
    # Prepare items from tests
    items = []
    tests = booking.get("tests", [])
    for test in tests:
        if isinstance(test, dict):
            items.append({
                "name": test.get("name", "Test"),
                "quantity": 1,
                "price": test.get("price", 0),
                "total": test.get("price", 0)
            })
        else:
            items.append({
                "name": str(test),
                "quantity": 1,
                "price": 0,
                "total": 0
            })
    
    subtotal = sum(item["total"] for item in items)
    discount = booking.get("discount", 0)
    total = booking.get("total", subtotal - discount)
    
    invoice_data = {
        "service_type": "mango",
        "patient_name": booking.get("patient_name", "Patient"),
        "patient_phone": booking.get("patient_phone", booking.get("phone", "")),
        "patient_email": booking.get("patient_email", booking.get("email")),
        "items": items,
        "subtotal": subtotal,
        "discount": discount,
        "total": total,
        "payment_status": booking.get("payment_status", "paid"),
        "payment_method": booking.get("payment_method", "online"),
        "lab_technician": booking.get("lab_technician", booking.get("collected_by"))
    }
    
    # Generate and send invoice
    result = await _generate_and_send_invoice(invoice_data, background_tasks)
    
    # Update booking with invoice ID
    await db.diagnostic_bookings.update_one(
        {"id": booking_id},
        {"$set": {"invoice_id": result["invoice_id"], "invoice_sent": True}}
    )
    
    return result

@router.post("/trigger/nevika/{subscription_id}")
async def trigger_nevika_invoice(subscription_id: str, background_tasks: BackgroundTasks):
    """Trigger invoice generation for Nevika subscription after payment"""
    db = get_db()
    
    # Find the subscription
    subscription = await db.subscriptions.find_one({"id": subscription_id}, {"_id": 0})
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    # Check if payment is confirmed
    if subscription.get("payment_status") != "paid":
        raise HTTPException(status_code=400, detail="Payment not confirmed")
    
    # Prepare invoice
    plan_name = subscription.get("plan_name", "Subscription Plan")
    amount = subscription.get("amount", 0)
    
    invoice_data = {
        "service_type": "nevika",
        "patient_name": subscription.get("patient_name", subscription.get("user_name", "Customer")),
        "patient_phone": subscription.get("patient_phone", subscription.get("phone", "")),
        "patient_email": subscription.get("patient_email", subscription.get("email")),
        "items": [
            {
                "name": f"{plan_name} - {subscription.get('duration', '1 Month')}",
                "quantity": 1,
                "price": amount,
                "total": amount
            }
        ],
        "subtotal": amount,
        "discount": subscription.get("discount", 0),
        "total": subscription.get("total", amount),
        "payment_status": "paid",
        "payment_method": subscription.get("payment_method", "online"),
        "notes": f"Subscription ID: {subscription_id}"
    }
    
    # Generate and send invoice
    result = await _generate_and_send_invoice(invoice_data, background_tasks)
    
    # Update subscription with invoice ID
    await db.subscriptions.update_one(
        {"id": subscription_id},
        {"$set": {"invoice_id": result["invoice_id"], "invoice_sent": True}}
    )
    
    return result

# ============ HELPER FUNCTIONS ============

async def _generate_and_send_invoice(invoice_data: dict, background_tasks: BackgroundTasks):
    """Helper to generate and send invoice"""
    db = get_db()
    
    # Create request object
    request = GenerateInvoiceRequest(**invoice_data)
    
    # Generate invoice
    prefix_map = {
        "nevika": "NC",
        "diagyn": "DG",
        "orange": "OP",
        "mango": "ML"
    }
    prefix = prefix_map.get(request.service_type.lower(), "INV")
    invoice_number = f"{prefix}-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
    
    # Prepare full invoice data
    full_data = {
        "invoice_number": invoice_number,
        "date": datetime.now().strftime("%d %b %Y"),
        **invoice_data
    }
    
    # Generate PDF
    pdf_base64 = get_invoice_base64(full_data, request.service_type)
    
    # Store invoice record
    invoice_record = {
        "id": str(uuid.uuid4()),
        "invoice_number": invoice_number,
        "service_type": request.service_type,
        "patient_name": request.patient_name,
        "patient_phone": request.patient_phone,
        "patient_email": request.patient_email,
        "total": request.total,
        "payment_status": request.payment_status,
        "pdf_base64": pdf_base64,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "sent_whatsapp": False,
        "sent_email": False
    }
    
    await db.generated_invoices.insert_one(invoice_record)
    
    # Queue sending
    background_tasks.add_task(
        send_invoice_whatsapp,
        request.patient_phone,
        request.patient_name,
        invoice_number,
        request.total,
        request.service_type,
        invoice_record["id"]
    )
    
    if request.patient_email:
        background_tasks.add_task(
            send_invoice_email,
            request.patient_email,
            request.patient_name,
            invoice_number,
            request.total,
            request.service_type,
            pdf_base64
        )
    
    return {
        "success": True,
        "invoice_id": invoice_record["id"],
        "invoice_number": invoice_number
    }

async def send_invoice_whatsapp(phone: str, name: str, invoice_number: str, total: float, service_type: str, invoice_id: str):
    """Send invoice link via WhatsApp"""
    try:
        from services.msg91_whatsapp import send_msg91_whatsapp
        
        db = get_db()
        
        # Get service name
        service_names = {
            "nevika": "Nevika Cura",
            "diagyn": "DiaGyn Healthcare",
            "orange": "Orange Pharmacy",
            "mango": "Mango Health Labs"
        }
        service_name = service_names.get(service_type, "Nevika Cura")
        
        # Create invoice URL
        invoice_url = f"https://premium-rx-portal.preview.emergentagent.com/api/invoices/view/{invoice_id}"
        
        # Send WhatsApp message (using a generic template or custom message)
        message = f"""
🧾 *Invoice from {service_name}*

Hi {name},

Your invoice {invoice_number} for ₹{total:,.2f} is ready.

📥 View/Download: {invoice_url}

Thank you for choosing us!
"""
        
        # Use MSG91 to send
        result = await send_msg91_whatsapp(
            phone=phone,
            message=message,
            db=db
        )
        
        # Update invoice record
        await db.generated_invoices.update_one(
            {"id": invoice_id},
            {"$set": {"sent_whatsapp": True, "whatsapp_sent_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        logger.info(f"Invoice WhatsApp sent to {phone}: {invoice_number}")
        return result
        
    except Exception as e:
        logger.error(f"Failed to send invoice WhatsApp: {e}")
        return {"success": False, "error": str(e)}

async def send_invoice_email(email: str, name: str, invoice_number: str, total: float, service_type: str, pdf_base64: str):
    """Send invoice via email with PDF attachment"""
    try:
        import resend
        import os
        
        resend_api_key = os.environ.get('RESEND_API_KEY')
        if not resend_api_key:
            logger.warning("RESEND_API_KEY not configured")
            return {"success": False, "error": "Email not configured"}
        
        resend.api_key = resend_api_key
        
        # Get service theme
        service_themes = {
            "nevika": {"name": "Nevika Cura", "color": "#0D9488"},
            "diagyn": {"name": "DiaGyn Healthcare", "color": "#0D9488"},
            "orange": {"name": "Orange Pharmacy", "color": "#EA580C"},
            "mango": {"name": "Mango Health Labs", "color": "#16A34A"}
        }
        theme = service_themes.get(service_type, service_themes["nevika"])
        
        # Email HTML
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #F3F4F6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <!-- Header -->
                <div style="background: {theme['color']}; padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">{theme['name']}</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Invoice #{invoice_number}</p>
                </div>
                
                <!-- Content -->
                <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <p style="font-size: 16px; color: #374151;">
                        Hi <strong>{name}</strong>,
                    </p>
                    
                    <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                        Please find attached your invoice for your recent transaction with us.
                    </p>
                    
                    <!-- Amount Box -->
                    <div style="background: #F9FAFB; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center; border: 2px solid #E5E7EB;">
                        <p style="margin: 0 0 5px 0; color: #6B7280; font-size: 14px;">Total Amount</p>
                        <p style="margin: 0; color: {theme['color']}; font-size: 32px; font-weight: bold;">₹{total:,.2f}</p>
                    </div>
                    
                    <!-- Thank You -->
                    <div style="text-align: center; margin: 30px 0;">
                        <p style="color: {theme['color']}; font-size: 18px; font-weight: bold; margin: 0;">
                            Thank you for choosing {theme['name']}!
                        </p>
                    </div>
                    
                    <!-- Footer Note -->
                    <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin-top: 30px;">
                        This is a computer-generated invoice. No signature required.<br>
                        For queries, contact: nevikacura@gmail.com
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Decode PDF for attachment
        pdf_bytes = base64.b64decode(pdf_base64)
        
        # Send email with attachment
        result = resend.Emails.send({
            "from": "Nevika Cura <noreply@nevikacura.com>",
            "to": email,
            "subject": f"Invoice {invoice_number} - {theme['name']}",
            "html": html_content,
            "attachments": [
                {
                    "filename": f"{invoice_number}.pdf",
                    "content": pdf_base64
                }
            ]
        })
        
        logger.info(f"Invoice email sent to {email}: {invoice_number}")
        return {"success": True, "email_id": result.get("id")}
        
    except Exception as e:
        logger.error(f"Failed to send invoice email: {e}")
        return {"success": False, "error": str(e)}

# ============ LIST INVOICES ============

@router.get("/list")
async def list_invoices(
    service_type: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    """List all generated invoices"""
    db = get_db()
    
    query = {}
    if service_type:
        query["service_type"] = service_type
    
    skip = (page - 1) * limit
    total = await db.generated_invoices.count_documents(query)
    invoices = await db.generated_invoices.find(
        query,
        {"_id": 0, "pdf_base64": 0}  # Exclude large PDF data
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "invoices": invoices,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }


# ============ RECEIPT PDF CUSTOMIZATION ============

class ReceiptCustomizationRequest(BaseModel):
    """Request model for customizing receipt PDF"""
    invoice_id: str
    # Customization options
    show_clinic_address: bool = True
    show_doctor_signature: bool = False
    show_terms: bool = True
    show_qr_code: bool = True
    header_text: Optional[str] = None  # Custom header text
    footer_text: Optional[str] = None  # Custom footer text
    notes: Optional[str] = None
    # Regeneration options
    regenerate_pdf: bool = True
    resend_whatsapp: bool = False

@router.post("/customize")
async def customize_receipt(request: ReceiptCustomizationRequest, background_tasks: BackgroundTasks):
    """Customize and regenerate receipt PDF with options"""
    db = get_db()
    
    # Find the invoice
    invoice = await db.generated_invoices.find_one({"id": request.invoice_id}, {"_id": 0})
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Store customization options
    customization = {
        "show_clinic_address": request.show_clinic_address,
        "show_doctor_signature": request.show_doctor_signature,
        "show_terms": request.show_terms,
        "show_qr_code": request.show_qr_code,
        "header_text": request.header_text,
        "footer_text": request.footer_text,
        "notes": request.notes,
        "customized_at": datetime.now(timezone.utc).isoformat()
    }
    
    update_data = {"customization": customization}
    
    # Regenerate PDF if requested
    if request.regenerate_pdf:
        try:
            # Build invoice data from stored invoice
            invoice_data = {
                "invoice_number": invoice.get("invoice_number"),
                "date": invoice.get("created_at", datetime.now(timezone.utc).isoformat())[:10],
                "patient_name": invoice.get("patient_name"),
                "patient_phone": invoice.get("patient_phone"),
                "items": invoice.get("items", []),
                "subtotal": invoice.get("total", 0),
                "discount": invoice.get("discount", 0),
                "total": invoice.get("total", 0),
                "payment_status": invoice.get("payment_status", "paid"),
                "payment_method": invoice.get("payment_method"),
                "clinic_name": invoice.get("clinic_name"),
                "doctor_name": invoice.get("doctor_name"),
                "notes": request.notes or invoice.get("notes"),
                # Customization flags
                "show_clinic_address": request.show_clinic_address,
                "show_terms": request.show_terms,
                "show_qr_code": request.show_qr_code,
                "header_text": request.header_text,
                "footer_text": request.footer_text
            }
            
            # Regenerate PDF
            service_type = invoice.get("service_type", "diagyn")
            pdf_base64 = get_invoice_base64(invoice_data, service_type)
            
            update_data["pdf_base64"] = pdf_base64
            update_data["regenerated_at"] = datetime.now(timezone.utc).isoformat()
            
        except Exception as e:
            logger.error(f"Failed to regenerate PDF: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to regenerate PDF: {str(e)}")
    
    # Update invoice
    await db.generated_invoices.update_one(
        {"id": request.invoice_id},
        {"$set": update_data}
    )
    
    # Resend via WhatsApp if requested
    whatsapp_sent = False
    if request.resend_whatsapp:
        patient_phone = invoice.get("patient_phone")
        if patient_phone:
            try:
                from services.msg91_whatsapp import send_msg91_whatsapp
                import os
                
                clean_phone = patient_phone.replace("+", "").replace(" ", "").replace("-", "")
                if not clean_phone.startswith("91"):
                    clean_phone = "91" + clean_phone
                
                backend_url = os.environ.get("REACT_APP_BACKEND_URL", "https://nevikacura.com")
                invoice_url = f"{backend_url}/api/invoices/view/{request.invoice_id}"
                
                await send_msg91_whatsapp(
                    recipient_phone=clean_phone,
                    template_name="diagyn_receipt",
                    variables=[
                        invoice.get("patient_name", "Patient"),
                        invoice.get("doctor_name", "Doctor"),
                        str(int(invoice.get("total", 0))),
                        invoice.get("payment_method", "").upper(),
                        invoice_url
                    ],
                    db=db,
                    reference_id=f"resend_{request.invoice_id}",
                    message_type="receipt"
                )
                whatsapp_sent = True
                
            except Exception as wa_error:
                logger.error(f"Failed to resend WhatsApp: {wa_error}")
    
    return {
        "success": True,
        "message": "Receipt customized successfully",
        "invoice_id": request.invoice_id,
        "pdf_regenerated": request.regenerate_pdf,
        "whatsapp_sent": whatsapp_sent,
        "customization": customization
    }


@router.get("/customization-options")
async def get_customization_options():
    """Get available receipt customization options"""
    return {
        "options": {
            "show_clinic_address": {
                "type": "boolean",
                "default": True,
                "label": "Show Clinic Address",
                "description": "Display clinic address on the receipt"
            },
            "show_doctor_signature": {
                "type": "boolean",
                "default": False,
                "label": "Show Doctor Signature",
                "description": "Add doctor's digital signature"
            },
            "show_terms": {
                "type": "boolean",
                "default": True,
                "label": "Show Terms & Conditions",
                "description": "Include terms and conditions section"
            },
            "show_qr_code": {
                "type": "boolean",
                "default": True,
                "label": "Show QR Code",
                "description": "Display QR code for digital verification"
            },
            "header_text": {
                "type": "string",
                "default": None,
                "label": "Custom Header",
                "description": "Custom text to display in header"
            },
            "footer_text": {
                "type": "string",
                "default": None,
                "label": "Custom Footer",
                "description": "Custom text to display in footer"
            },
            "notes": {
                "type": "string",
                "default": None,
                "label": "Notes",
                "description": "Additional notes to include on receipt"
            }
        },
        "service_themes": {
            "diagyn": {
                "primary_color": "#0D9488",
                "name": "DiaGyn Healthcare"
            },
            "orange": {
                "primary_color": "#F59E0B",
                "name": "Orange Pharmacy"
            },
            "mango": {
                "primary_color": "#16A34A",
                "name": "Mango Health Labs"
            },
            "nevika": {
                "primary_color": "#0D9488",
                "name": "Nevika Cura"
            }
        }
    }

