"""
Orange Pharmacy Staff Portal - Enhanced API Routes
Order management, medicine inventory, and notifications
"""

from fastapi import APIRouter, HTTPException, Depends, Header, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import jwt
import uuid
import logging
import base64
import httpx
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pharmacy", tags=["Orange Pharmacy"])

# Database and config - injected from server.py
db = None
JWT_SECRET = None
JWT_ALGORITHM = "HS256"
send_email_notification = None
send_whatsapp_notification = None

# Order Status Workflow
ORDER_STATUSES = [
    "booked",
    "pharmacist_call",
    "packing",
    "out_for_delivery",
    "completed",
    "cancelled"
]

STATUS_LABELS = {
    "booked": "Order Booked",
    "pharmacist_call": "Pharmacist Call",
    "packing": "Packing",
    "out_for_delivery": "Out for Delivery",
    "completed": "Completed",
    "cancelled": "Cancelled"
}


def set_db(database):
    global db
    db = database


def set_jwt_config(secret, algorithm="HS256"):
    global JWT_SECRET, JWT_ALGORITHM
    JWT_SECRET = secret
    JWT_ALGORITHM = algorithm


def set_notification_functions(email_func, whatsapp_func=None):
    global send_email_notification, send_whatsapp_notification
    send_email_notification = email_func
    send_whatsapp_notification = whatsapp_func


# ============ Auth ============

async def verify_pharmacy_staff(authorization: str = Header(None)):
    """Verify pharmacy staff token"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Staff authentication required")
    
    token = authorization.split(' ')[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        role = payload.get('role', '')
        dept = payload.get('department', '')
        valid = role in ['pharmacy_staff', 'admin', 'super_admin'] or 'pharmacy' in role.lower() or 'pharmacy' in dept.lower()
        if not valid:
            raise HTTPException(status_code=403, detail="Pharmacy staff access required")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============ Models ============

class MedicineCreate(BaseModel):
    name: str
    generic_name: Optional[str] = None
    manufacturer: Optional[str] = None
    category: Optional[str] = None
    mrp: float
    discount_percent: float = 0
    sale_price: Optional[float] = None
    stock_quantity: int = 0
    unit: str = "strip"
    description: Optional[str] = None
    image_url: Optional[str] = None
    image_base64: Optional[str] = None


class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    generic_name: Optional[str] = None
    manufacturer: Optional[str] = None
    category: Optional[str] = None
    mrp: Optional[float] = None
    discount_percent: Optional[float] = None
    sale_price: Optional[float] = None
    stock_quantity: Optional[int] = None
    unit: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    image_base64: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


class InvoiceUpload(BaseModel):
    invoice_base64: str
    invoice_filename: str


# ============ Medicine Inventory ============

@router.post("/medicines")
async def create_medicine(data: MedicineCreate, staff=Depends(verify_pharmacy_staff)):
    """Add a new medicine to inventory"""
    # Calculate sale price if not provided
    sale_price = data.sale_price
    if sale_price is None:
        sale_price = data.mrp * (1 - data.discount_percent / 100)
    
    medicine = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "generic_name": data.generic_name,
        "manufacturer": data.manufacturer,
        "category": data.category,
        "mrp": data.mrp,
        "discount_percent": data.discount_percent,
        "sale_price": round(sale_price, 2),
        "stock_quantity": data.stock_quantity,
        "unit": data.unit,
        "description": data.description,
        "image_url": data.image_url,
        "image_base64": data.image_base64,
        "created_by": staff.get('name', 'Staff'),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.medicines.insert_one(medicine)
    medicine.pop("_id", None)
    
    return {"success": True, "message": "Medicine added", "medicine": medicine}


@router.get("/medicines")
async def get_medicines(
    search: str = None,
    category: str = None,
    low_stock: bool = False,
    staff=Depends(verify_pharmacy_staff)
):
    """Get all medicines with optional filters"""
    query = {}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"generic_name": {"$regex": search, "$options": "i"}},
            {"manufacturer": {"$regex": search, "$options": "i"}}
        ]
    
    if category:
        query["category"] = category
    
    if low_stock:
        query["stock_quantity"] = {"$lt": 10}
    
    medicines = await db.medicines.find(query, {"_id": 0}).sort("name", 1).to_list(500)
    
    # Get categories for filter
    categories = await db.medicines.distinct("category")
    
    return {
        "medicines": medicines,
        "total": len(medicines),
        "categories": [c for c in categories if c]
    }


@router.get("/medicines/{medicine_id}")
async def get_medicine(medicine_id: str, staff=Depends(verify_pharmacy_staff)):
    """Get single medicine details"""
    medicine = await db.medicines.find_one({"id": medicine_id}, {"_id": 0})
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return medicine


@router.put("/medicines/{medicine_id}")
async def update_medicine(
    medicine_id: str,
    data: MedicineUpdate,
    staff=Depends(verify_pharmacy_staff)
):
    """Update medicine details"""
    medicine = await db.medicines.find_one({"id": medicine_id})
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    for field in ['name', 'generic_name', 'manufacturer', 'category', 'mrp', 
                  'discount_percent', 'stock_quantity', 'unit', 'description', 
                  'image_url', 'image_base64']:
        value = getattr(data, field, None)
        if value is not None:
            update_data[field] = value
    
    # Recalculate sale price if MRP or discount changed
    mrp = data.mrp if data.mrp is not None else medicine.get('mrp', 0)
    discount = data.discount_percent if data.discount_percent is not None else medicine.get('discount_percent', 0)
    
    if data.sale_price is not None:
        update_data['sale_price'] = data.sale_price
    elif data.mrp is not None or data.discount_percent is not None:
        update_data['sale_price'] = round(mrp * (1 - discount / 100), 2)
    
    await db.medicines.update_one({"id": medicine_id}, {"$set": update_data})
    
    updated = await db.medicines.find_one({"id": medicine_id}, {"_id": 0})
    return {"success": True, "message": "Medicine updated", "medicine": updated}


@router.delete("/medicines/{medicine_id}")
async def delete_medicine(medicine_id: str, staff=Depends(verify_pharmacy_staff)):
    """Delete a medicine from inventory"""
    result = await db.medicines.delete_one({"id": medicine_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return {"success": True, "message": "Medicine deleted"}


@router.post("/medicines/{medicine_id}/image")
async def upload_medicine_image(
    medicine_id: str,
    file: UploadFile = File(...),
    staff=Depends(verify_pharmacy_staff)
):
    """Upload medicine image from device"""
    medicine = await db.medicines.find_one({"id": medicine_id})
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    # Read and encode file
    content = await file.read()
    encoded = base64.b64encode(content).decode('utf-8')
    
    # Determine content type
    content_type = file.content_type or "image/jpeg"
    image_base64 = f"data:{content_type};base64,{encoded}"
    
    await db.medicines.update_one(
        {"id": medicine_id},
        {"$set": {
            "image_base64": image_base64,
            "image_filename": file.filename,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Image uploaded"}


@router.post("/medicines/{medicine_id}/image-url")
async def set_medicine_image_url(
    medicine_id: str,
    image_url: str,
    staff=Depends(verify_pharmacy_staff)
):
    """Set medicine image from URL"""
    medicine = await db.medicines.find_one({"id": medicine_id})
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    # Optionally fetch and store as base64
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(image_url, timeout=10)
            if response.status_code == 200:
                content_type = response.headers.get('content-type', 'image/jpeg')
                encoded = base64.b64encode(response.content).decode('utf-8')
                image_base64 = f"data:{content_type};base64,{encoded}"
                
                await db.medicines.update_one(
                    {"id": medicine_id},
                    {"$set": {
                        "image_url": image_url,
                        "image_base64": image_base64,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                return {"success": True, "message": "Image downloaded and saved"}
    except Exception as e:
        logger.error(f"Failed to fetch image from URL: {e}")
    
    # Fallback: just store URL
    await db.medicines.update_one(
        {"id": medicine_id},
        {"$set": {
            "image_url": image_url,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"success": True, "message": "Image URL saved"}


@router.get("/image-search")
async def search_images(query: str, staff=Depends(verify_pharmacy_staff)):
    """Search for medicine images using multiple providers"""
    images = []
    
    # Try Pixabay first (free tier)
    try:
        async with httpx.AsyncClient() as client:
            pixabay_url = f"https://pixabay.com/api/?key=46518025-4a9f8cce1fd437c8d2e6f3e5c&q={query}+medicine+pill+tablet&image_type=photo&per_page=12&safesearch=true"
            response = await client.get(pixabay_url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                for hit in data.get("hits", [])[:12]:
                    images.append({
                        "id": str(hit.get("id")),
                        "preview_url": hit.get("previewURL"),
                        "full_url": hit.get("webformatURL"),
                        "thumbnail": hit.get("previewURL"),
                        "source": "pixabay"
                    })
    except Exception as e:
        logger.error(f"Pixabay search failed: {e}")
    
    # Try Unsplash if Pixabay fails or returns few results
    if len(images) < 6:
        try:
            async with httpx.AsyncClient() as client:
                # Using Unsplash demo API endpoint
                unsplash_url = f"https://source.unsplash.com/featured/?medicine,{query}"
                # Generate multiple Unsplash random images
                for i in range(6):
                    images.append({
                        "id": f"unsplash_{i}",
                        "preview_url": f"https://source.unsplash.com/150x150/?medicine,{query}&sig={i}",
                        "full_url": f"https://source.unsplash.com/400x400/?medicine,{query}&sig={i}",
                        "thumbnail": f"https://source.unsplash.com/100x100/?medicine,{query}&sig={i}",
                        "source": "unsplash"
                    })
        except Exception as e:
            logger.error(f"Unsplash search failed: {e}")
    
    if images:
        return {"success": True, "images": images[:12], "total": len(images)}
    
    # Final fallback - placeholder images
    return {
        "success": True,
        "images": [
            {"id": "placeholder_1", "preview_url": "https://via.placeholder.com/150/f97316/white?text=Medicine", "full_url": "https://via.placeholder.com/400/f97316/white?text=Medicine"},
            {"id": "placeholder_2", "preview_url": "https://via.placeholder.com/150/22c55e/white?text=Tablet", "full_url": "https://via.placeholder.com/400/22c55e/white?text=Tablet"},
            {"id": "placeholder_3", "preview_url": "https://via.placeholder.com/150/3b82f6/white?text=Capsule", "full_url": "https://via.placeholder.com/400/3b82f6/white?text=Capsule"},
            {"id": "placeholder_4", "preview_url": "https://via.placeholder.com/150/8b5cf6/white?text=Syrup", "full_url": "https://via.placeholder.com/400/8b5cf6/white?text=Syrup"},
            {"id": "placeholder_5", "preview_url": "https://via.placeholder.com/150/f59e0b/white?text=Injection", "full_url": "https://via.placeholder.com/400/f59e0b/white?text=Injection"},
            {"id": "placeholder_6", "preview_url": "https://via.placeholder.com/150/06b6d4/white?text=Drops", "full_url": "https://via.placeholder.com/400/06b6d4/white?text=Drops"},
        ],
        "note": "Using placeholder images"
    }


# ============ Orders ============

@router.get("/orders")
async def get_orders(
    status: str = None,
    date: str = None,
    search: str = None,
    staff=Depends(verify_pharmacy_staff)
):
    """Get all pharmacy orders"""
    query = {}
    
    if status and status != "all":
        query["status"] = status
    
    if date:
        query["created_at"] = {"$regex": f"^{date}"}
    
    if search:
        query["$or"] = [
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"customer_phone": {"$regex": search}},
            {"order_id": {"$regex": search, "$options": "i"}}
        ]
    
    orders = await db.pharmacy_orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    
    # Get counts by status
    status_counts = {}
    for s in ORDER_STATUSES:
        count = await db.pharmacy_orders.count_documents({"status": s})
        status_counts[s] = count
    
    return {
        "orders": orders,
        "total": len(orders),
        "status_counts": status_counts
    }


@router.get("/orders/{order_id}")
async def get_order(order_id: str, staff=Depends(verify_pharmacy_staff)):
    """Get single order details"""
    order = await db.pharmacy_orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.put("/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    data: OrderStatusUpdate,
    staff=Depends(verify_pharmacy_staff)
):
    """Update order status"""
    order = await db.pharmacy_orders.find_one({"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if data.status not in ORDER_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {ORDER_STATUSES}")
    
    # Check if invoice required before dispatch
    if data.status == "out_for_delivery" and not order.get("invoice_uploaded"):
        raise HTTPException(status_code=400, detail="Please upload invoice before dispatching order")
    
    update_data = {
        "status": data.status,
        "status_label": STATUS_LABELS.get(data.status, data.status),
        f"{data.status}_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": staff.get('name', 'Staff'),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if data.notes:
        # Append to status history
        status_history = order.get("status_history", [])
        status_history.append({
            "status": data.status,
            "notes": data.notes,
            "by": staff.get('name', 'Staff'),
            "at": datetime.now(timezone.utc).isoformat()
        })
        update_data["status_history"] = status_history
    
    await db.pharmacy_orders.update_one({"order_id": order_id}, {"$set": update_data})
    
    # Send notifications
    customer_phone = order.get("customer_phone")
    customer_email = order.get("customer_email")
    customer_name = order.get("customer_name", "Customer")
    
    # WhatsApp notification
    if send_whatsapp_notification and customer_phone:
        try:
            status_msg = STATUS_LABELS.get(data.status, data.status)
            message = f"Orange Pharmacy Update!\n\nHi {customer_name},\nYour order #{order_id} status: {status_msg}\n\nThank you for choosing Orange Pharmacy!"
            await send_whatsapp_notification(customer_phone, message)
        except Exception as e:
            logger.error(f"WhatsApp notification failed: {e}")
    
    # Email notification for key statuses
    if send_email_notification and customer_email and data.status in ["out_for_delivery", "completed"]:
        try:
            subject = f"Order #{order_id} - {STATUS_LABELS.get(data.status)}"
            html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #f97316; color: white; padding: 20px; text-align: center;">
                    <h2>Orange Pharmacy</h2>
                </div>
                <div style="padding: 20px;">
                    <p>Hi {customer_name},</p>
                    <p>Your order <strong>#{order_id}</strong> has been updated:</p>
                    <div style="background: #fff7ed; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <h3 style="color: #f97316; margin: 0;">Status: {STATUS_LABELS.get(data.status)}</h3>
                    </div>
                    <p>Thank you for choosing Orange Pharmacy!</p>
                </div>
            </div>
            """
            await send_email_notification(
                subject=f"Orange Pharmacy - {subject}",
                html_content=html,
                patient_email=customer_email,
                patient_subject=subject,
                patient_html=html
            )
        except Exception as e:
            logger.error(f"Email notification failed: {e}")
    
    return {"success": True, "message": f"Order status updated to {data.status}"}


@router.post("/orders/{order_id}/invoice")
async def upload_invoice(
    order_id: str,
    file: UploadFile = File(...),
    staff=Depends(verify_pharmacy_staff)
):
    """Upload invoice PDF for order"""
    order = await db.pharmacy_orders.find_one({"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Read and encode file
    content = await file.read()
    encoded = base64.b64encode(content).decode('utf-8')
    
    await db.pharmacy_orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "invoice_base64": encoded,
            "invoice_filename": file.filename,
            "invoice_uploaded": True,
            "invoice_uploaded_at": datetime.now(timezone.utc).isoformat(),
            "invoice_uploaded_by": staff.get('name', 'Staff')
        }}
    )
    
    return {"success": True, "message": "Invoice uploaded successfully"}


@router.get("/orders/{order_id}/invoice")
async def get_invoice(order_id: str, staff=Depends(verify_pharmacy_staff)):
    """Get invoice for order"""
    order = await db.pharmacy_orders.find_one(
        {"order_id": order_id},
        {"invoice_base64": 1, "invoice_filename": 1}
    )
    if not order or not order.get("invoice_base64"):
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {
        "invoice_base64": order.get("invoice_base64"),
        "filename": order.get("invoice_filename", "invoice.pdf")
    }


@router.post("/orders/{order_id}/send-invoice")
async def send_invoice_to_customer(order_id: str, staff=Depends(verify_pharmacy_staff)):
    """Send invoice to customer via email and WhatsApp using MSG91 template"""
    order = await db.pharmacy_orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not order.get("invoice_uploaded"):
        raise HTTPException(status_code=400, detail="No invoice uploaded for this order")
    
    customer_email = order.get("customer_email")
    customer_phone = order.get("customer_phone")
    customer_name = order.get("customer_name", "Customer")
    total_amount = order.get("total_amount", 0)
    
    email_sent = False
    whatsapp_sent = False
    
    # Send email with invoice
    if send_email_notification and customer_email:
        try:
            subject = f"Invoice for Order #{order_id} - Orange Pharmacy"
            html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #f97316; color: white; padding: 20px; text-align: center;">
                    <h2>Orange Pharmacy</h2>
                </div>
                <div style="padding: 20px;">
                    <p>Dear {customer_name},</p>
                    <p>Your invoice for order <strong>#{order_id}</strong> is ready.</p>
                    <p><strong>Amount:</strong> ₹{total_amount}</p>
                    <p>Please download your invoice from the Nevika Cura app.</p>
                    <p>Thank you for shopping with Orange Pharmacy!</p>
                </div>
            </div>
            """
            await send_email_notification(
                subject=subject,
                html_content=html,
                patient_email=customer_email,
                patient_subject=subject,
                patient_html=html
            )
            email_sent = True
            logger.info(f"Invoice email sent for order {order_id}")
        except Exception as e:
            logger.error(f"Failed to send invoice email: {e}")
    
    # Send WhatsApp notification using MSG91 orange_pharmacy_confirm template
    if send_orange_pharmacy_confirmation and customer_phone:
        try:
            result = await send_orange_pharmacy_confirmation(
                phone=customer_phone,
                customer_name=customer_name,
                order_id=order_id,
                total_amount=f"₹{total_amount}"
            )
            whatsapp_sent = result.get("success", False)
            logger.info(f"WhatsApp invoice notification result: {result}")
        except Exception as e:
            logger.error(f"Failed to send WhatsApp: {e}")
    
    # Mark as sent
    await db.pharmacy_orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "invoice_sent": True,
            "invoice_sent_at": datetime.now(timezone.utc).isoformat(),
            "invoice_sent_email": email_sent,
            "invoice_sent_whatsapp": whatsapp_sent
        }}
    )
    
    return {
        "success": True,
        "email_sent": email_sent,
        "whatsapp_sent": whatsapp_sent,
        "message": "Invoice sent to customer"
    }


# ============ Dashboard Stats ============

@router.get("/dashboard/stats")
async def get_dashboard_stats(staff=Depends(verify_pharmacy_staff)):
    """Get dashboard statistics"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Today's orders
    today_orders = await db.pharmacy_orders.count_documents(
        {"created_at": {"$regex": f"^{today}"}}
    )
    
    # Pending orders
    pending = await db.pharmacy_orders.count_documents(
        {"status": {"$in": ["booked", "pharmacist_call", "packing"]}}
    )
    
    # Out for delivery
    out_for_delivery = await db.pharmacy_orders.count_documents({"status": "out_for_delivery"})
    
    # Completed today
    completed_today = await db.pharmacy_orders.count_documents(
        {"status": "completed", "completed_at": {"$regex": f"^{today}"}}
    )
    
    # Low stock medicines
    low_stock = await db.medicines.count_documents({"stock_quantity": {"$lt": 10}})
    
    # Total medicines
    total_medicines = await db.medicines.count_documents({})
    
    return {
        "today_orders": today_orders,
        "pending_orders": pending,
        "out_for_delivery": out_for_delivery,
        "completed_today": completed_today,
        "low_stock_count": low_stock,
        "total_medicines": total_medicines
    }


# ============ Medicine Sync ============

@router.post("/sync-inventory")
async def sync_medicine_inventory(staff=Depends(verify_pharmacy_staff)):
    """Sync all 4315 medicines from inventory file to database"""
    try:
        from data.medicine_inventory import MEDICINE_INVENTORY
        
        # Get existing medicine names to avoid duplicates
        existing_names = set()
        existing = await db.medicines.find({}, {"name": 1}).to_list(10000)
        for med in existing:
            existing_names.add(med.get("name", "").lower())
        
        new_count = 0
        updated_count = 0
        
        for med in MEDICINE_INVENTORY:
            name = med.get("name", "")
            if not name:
                continue
            
            # Check if already exists
            if name.lower() in existing_names:
                # Update if we have more info (like mrp, image)
                if med.get("mrp") or med.get("image"):
                    update_data = {}
                    if med.get("mrp"):
                        update_data["mrp"] = med["mrp"]
                        update_data["sale_price"] = med["mrp"]  # Default no discount
                    if med.get("image"):
                        update_data["image_url"] = med["image"]
                    if med.get("composition"):
                        update_data["generic_name"] = med["composition"]
                    if med.get("company"):
                        update_data["manufacturer"] = med["company"]
                    if med.get("category"):
                        update_data["category"] = med["category"]
                    if med.get("form"):
                        update_data["unit"] = med["form"]
                    
                    if update_data:
                        await db.medicines.update_one(
                            {"name": {"$regex": f"^{name}$", "$options": "i"}},
                            {"$set": update_data}
                        )
                        updated_count += 1
                continue
            
            # Create new medicine entry
            medicine = {
                "id": str(uuid.uuid4()),
                "name": name,
                "generic_name": med.get("composition", ""),
                "manufacturer": med.get("company", "Keep Mankind"),
                "category": med.get("category", "general"),
                "mrp": med.get("mrp", 0),
                "discount_percent": 0,
                "sale_price": med.get("mrp", 0),
                "stock_quantity": 100,  # Default stock
                "unit": med.get("form", "Tablet"),
                "pack": med.get("pack", ""),
                "description": "",
                "image_url": med.get("image", ""),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.medicines.insert_one(medicine)
            existing_names.add(name.lower())
            new_count += 1
        
        total = await db.medicines.count_documents({})
        
        return {
            "success": True,
            "message": f"Inventory synced successfully",
            "new_medicines_added": new_count,
            "medicines_updated": updated_count,
            "total_in_database": total
        }
        
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"Failed to import inventory: {str(e)}")
    except Exception as e:
        logger.error(f"Inventory sync failed: {e}")
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")
