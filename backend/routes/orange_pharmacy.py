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
send_orange_pharmacy_confirmation = None

# Order Status Workflow
ORDER_STATUSES = [
    "order_placed",
    "prescription_validated",
    "in_process",
    "shipped",
    "delivered",
    "cancelled",
    # Legacy status keys for backward compatibility
    "booked",
    "pharmacist_call",
    "packing",
    "out_for_delivery",
    "completed"
]

STATUS_LABELS = {
    "order_placed": "Order Placed",
    "prescription_validated": "Prescription Validated",
    "in_process": "In Process",
    "shipped": "Shipped / Out for Delivery",
    "delivered": "Delivered",
    "cancelled": "Cancelled",
    # Legacy mappings
    "booked": "Order Placed",
    "pharmacist_call": "Prescription Validated",
    "packing": "In Process",
    "out_for_delivery": "Shipped / Out for Delivery",
    "completed": "Delivered"
}


def set_db(database):
    global db
    db = database


def set_jwt_config(secret, algorithm="HS256"):
    global JWT_SECRET, JWT_ALGORITHM
    JWT_SECRET = secret
    JWT_ALGORITHM = algorithm


def set_notification_functions(email_func, whatsapp_func=None, pharmacy_confirm_func=None):
    global send_email_notification, send_whatsapp_notification, send_orange_pharmacy_confirmation
    send_email_notification = email_func
    send_whatsapp_notification = whatsapp_func
    send_orange_pharmacy_confirmation = pharmacy_confirm_func


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
    composition: Optional[str] = None
    uses: Optional[str] = None
    side_effects: Optional[str] = None
    images: Optional[list] = None


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
    q: str = None,
    category: str = None,
    low_stock: bool = False,
    missing_images: bool = False,
    stock_filter: str = None,
    page: int = 1,
    limit: int = 50,
    staff=Depends(verify_pharmacy_staff)
):
    """Get medicines with pagination and optional filters"""
    query = {}
    
    search_term = search or q
    if search_term:
        query["$or"] = [
            {"name": {"$regex": search_term, "$options": "i"}},
            {"generic_name": {"$regex": search_term, "$options": "i"}},
            {"manufacturer": {"$regex": search_term, "$options": "i"}}
        ]
    
    if category:
        query["category"] = category
    
    if low_stock or stock_filter == 'low_stock':
        query["stock_quantity"] = {"$lt": 10, "$gt": 0}
    elif stock_filter == 'out_of_stock':
        query["stock_quantity"] = {"$lte": 0}
    elif stock_filter == 'in_stock':
        query["stock_quantity"] = {"$gt": 0}
    
    if missing_images:
        query["$and"] = query.get("$and", []) + [
            {"$or": [{"image_url": ""}, {"image_url": None}, {"image_url": {"$exists": False}}]}
        ]
    
    skip = (max(1, page) - 1) * limit
    total = await db.medicines.count_documents(query)
    medicines = await db.medicines.find(query, {"_id": 0}).sort("name", 1).skip(skip).limit(min(limit, 200)).to_list(min(limit, 200))
    
    categories = await db.medicines.distinct("category")
    
    return {
        "medicines": medicines,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
        "categories": [c for c in categories if c]
    }


# Auto-suggest endpoint for medicine names (must be before /{medicine_id})
@router.get("/medicines/suggest")
async def suggest_medicines(q: str = "", staff=Depends(verify_pharmacy_staff)):
    """Fast auto-suggest for medicine names - returns top 15 matches"""
    if not q or len(q) < 2:
        return {"suggestions": []}
    
    results = await db.medicines.find(
        {"name": {"$regex": f"^{q}", "$options": "i"}},
        {"_id": 0, "id": 1, "name": 1, "mrp": 1, "manufacturer": 1, "unit": 1,
         "generic_name": 1, "category": 1, "pack": 1, "description": 1,
         "stock_quantity": 1, "discount_percent": 1, "image_url": 1,
         "is_discontinued": 1, "side_effects": 1, "composition1": 1, "composition2": 1}
    ).sort("name", 1).limit(15).to_list(15)
    
    # If prefix match returns few results, try contains match
    if len(results) < 5:
        contains = await db.medicines.find(
            {"name": {"$regex": q, "$options": "i"}, "name": {"$not": {"$regex": f"^{q}", "$options": "i"}}},
            {"_id": 0, "id": 1, "name": 1, "mrp": 1, "manufacturer": 1, "unit": 1,
             "generic_name": 1, "category": 1, "pack": 1, "description": 1,
             "stock_quantity": 1, "discount_percent": 1, "image_url": 1,
             "is_discontinued": 1, "side_effects": 1, "composition1": 1, "composition2": 1}
        ).sort("name", 1).limit(15 - len(results)).to_list(15 - len(results))
        results.extend(contains)
    
    return {"suggestions": results}


# ============ TRUSTED FORMULARY MANAGEMENT ============

@router.get("/formulary")
async def get_formulary_medicines(
    search: str = None,
    category: str = None,
    page: int = 1,
    limit: int = 50,
    staff=Depends(verify_pharmacy_staff)
):
    """Get Trusted Formulary medicines (staff portal)"""
    query = {"is_formulary": True}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"generic_name": {"$regex": search, "$options": "i"}},
            {"manufacturer": {"$regex": search, "$options": "i"}}
        ]
    if category:
        query["category"] = category

    skip = (max(1, page) - 1) * limit
    total = await db.medicines.count_documents(query)
    medicines = await db.medicines.find(query, {"_id": 0}).sort("name", 1).skip(skip).limit(min(limit, 100)).to_list(min(limit, 100))

    categories_pipeline = [
        {"$match": {"is_formulary": True}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    cat_result = await db.medicines.aggregate(categories_pipeline).to_list(100)
    categories = [{"name": r["_id"], "count": r["count"]} for r in cat_result if r["_id"]]

    return {
        "medicines": medicines,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
        "categories": categories
    }


@router.post("/formulary/add/{medicine_id}")
async def add_to_formulary(medicine_id: str, staff=Depends(verify_pharmacy_staff)):
    """Add a medicine to Trusted Formulary"""
    result = await db.medicines.update_one(
        {"id": medicine_id},
        {"$set": {"is_formulary": True, "formulary_tagged_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return {"success": True, "message": "Added to Trusted Formulary"}


@router.post("/formulary/remove/{medicine_id}")
async def remove_from_formulary(medicine_id: str, staff=Depends(verify_pharmacy_staff)):
    """Remove a medicine from Trusted Formulary"""
    result = await db.medicines.update_one(
        {"id": medicine_id},
        {"$set": {"is_formulary": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return {"success": True, "message": "Removed from Trusted Formulary"}


# IMPORTANT: Bulk update route must be defined BEFORE parameterized routes
# to prevent "/medicines/bulk-update" from being matched as a medicine_id
@router.put("/medicines/bulk-update")
async def bulk_update_medicines(data: dict, staff=Depends(verify_pharmacy_staff)):
    """Bulk update medicines: [{id, mrp, discount, in_stock, image_url}]"""
    updates = data.get("medicines", [])
    if not updates:
        raise HTTPException(status_code=400, detail="No medicines to update")
    
    updated_count = 0
    for item in updates:
        mid = item.get("id")
        if not mid:
            continue
        update_fields = {"updated_at": datetime.now(timezone.utc).isoformat()}
        if "mrp" in item:
            update_fields["mrp"] = float(item["mrp"])
        if "discount" in item:
            update_fields["discount"] = float(item["discount"])
        if "discount_percent" in item:
            update_fields["discount_percent"] = float(item["discount_percent"])
        if "stock_quantity" in item:
            update_fields["stock_quantity"] = int(item["stock_quantity"])
        if "in_stock" in item:
            update_fields["in_stock"] = bool(item["in_stock"])
        if "image_url" in item and item["image_url"]:
            update_fields["image_url"] = item["image_url"]
        if "name" in item:
            update_fields["name"] = item["name"]
        
        result = await db.medicines.update_one({"id": mid}, {"$set": update_fields})
        if result.modified_count > 0:
            updated_count += 1
    
    return {"success": True, "updated": updated_count, "total": len(updates)}


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
                  'image_url', 'image_base64', 'composition', 'uses', 'side_effects',
                  'images']:
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
@router.post("/medicines/{medicine_id}/upload-image")
async def upload_medicine_image(
    medicine_id: str,
    file: UploadFile = File(...),
    staff=Depends(verify_pharmacy_staff)
):
    """Upload medicine image - stored in Object Storage, appended to images array"""
    medicine = await db.medicines.find_one({"id": medicine_id})
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    content = await file.read()
    content_type = file.content_type or "image/jpeg"
    
    # Upload to Object Storage
    try:
        from services.object_storage import put_object
        import uuid
        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
        file_id = str(uuid.uuid4())
        path = f"nevika-cura/medicines/{medicine_id}/{file_id}.{ext}"
        result = put_object(path, content, content_type)
        storage_path = result.get("path", path)
    except Exception as e:
        logger.error(f"Object storage upload failed for medicine image: {e}")
        # Fallback to base64
        encoded = base64.b64encode(content).decode('utf-8')
        storage_path = f"data:{content_type};base64,{encoded}"
    
    # Build the image URL (public download)
    frontend_url = os.environ.get("CHECKOUT_BASE_URL", os.environ.get("FRONTEND_URL", ""))
    image_download_url = f"{frontend_url}/api/pharmacy/medicines/{medicine_id}/images/{file_id}" if not storage_path.startswith("data:") else storage_path
    
    image_entry = {
        "id": file_id if 'file_id' in dir() else str(uuid.uuid4()),
        "storage_path": storage_path,
        "url": image_download_url,
        "filename": file.filename,
        "content_type": content_type,
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    existing_images = medicine.get("images", [])
    existing_images.append(image_entry)
    
    # Set first image as primary image_url if none set
    primary_url = image_download_url
    
    await db.medicines.update_one(
        {"id": medicine_id},
        {"$set": {
            "image_url": primary_url,
            "images": existing_images,
            "image_filename": file.filename,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Image uploaded", "image": image_entry, "images": existing_images}


@router.get("/medicines/{medicine_id}/images/{image_id}")
async def get_medicine_image(medicine_id: str, image_id: str):
    """Serve medicine image from Object Storage"""
    from fastapi.responses import Response
    medicine = await db.medicines.find_one({"id": medicine_id}, {"_id": 0, "images": 1})
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    images = medicine.get("images", [])
    image_entry = next((img for img in images if img.get("id") == image_id), None)
    if not image_entry:
        raise HTTPException(status_code=404, detail="Image not found")
    
    try:
        from services.object_storage import get_object
        data, ct = get_object(image_entry["storage_path"])
        return Response(content=data, media_type=image_entry.get("content_type", ct))
    except Exception as e:
        logger.error(f"Failed to get medicine image: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve image")


@router.delete("/medicines/{medicine_id}/images/{image_id}")
async def delete_medicine_image(medicine_id: str, image_id: str, staff=Depends(verify_pharmacy_staff)):
    """Delete a specific medicine image"""
    medicine = await db.medicines.find_one({"id": medicine_id})
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    images = medicine.get("images", [])
    images = [img for img in images if img.get("id") != image_id]
    
    # Update primary URL to first remaining image or clear
    primary_url = images[0]["url"] if images else ""
    
    await db.medicines.update_one(
        {"id": medicine_id},
        {"$set": {"images": images, "image_url": primary_url, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Image deleted", "images": images}


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
    """Search for medicine/product images using Pexels API (primary) with Pixabay fallback"""
    images = []
    pexels_key = os.environ.get("PEXELS_API_KEY", "")
    
    # Primary: Pexels API
    if pexels_key:
        search_queries = [query, f"{query} medicine", f"{query} pharmaceutical"]
        for q in search_queries:
            if len(images) >= 9:
                break
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        "https://api.pexels.com/v1/search",
                        params={"query": q, "per_page": 12, "size": "small"},
                        headers={"Authorization": pexels_key},
                        timeout=8
                    )
                    if response.status_code == 200:
                        data = response.json()
                        for photo in data.get("photos", []):
                            img_id = str(photo.get("id"))
                            if not any(i["id"] == img_id for i in images):
                                images.append({
                                    "id": img_id,
                                    "preview_url": photo.get("src", {}).get("small", ""),
                                    "full_url": photo.get("src", {}).get("medium", ""),
                                    "thumbnail": photo.get("src", {}).get("tiny", ""),
                                    "source": "pexels"
                                })
            except Exception as e:
                logger.error(f"Pexels search failed for '{q}': {e}")
    
    # Fallback: Pixabay
    if len(images) < 6:
        pixabay_key = "46518025-4a9f8cce1fd437c8d2e6f3e5c"
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://pixabay.com/api/?key={pixabay_key}&q={query}&image_type=photo&per_page=12&safesearch=true",
                    timeout=8
                )
                if response.status_code == 200:
                    data = response.json()
                    for hit in data.get("hits", []):
                        img_id = f"px_{hit.get('id')}"
                        if not any(i["id"] == img_id for i in images):
                            images.append({
                                "id": img_id,
                                "preview_url": hit.get("previewURL"),
                                "full_url": hit.get("webformatURL"),
                                "thumbnail": hit.get("previewURL"),
                                "source": "pixabay"
                            })
        except Exception as e:
            logger.error(f"Pixabay search failed: {e}")
    
    if images:
        return {"success": True, "images": images[:12], "total": len(images)}
    
    # Final fallback
    placeholders = [
        {"id": "ph_1", "preview_url": "https://placehold.co/150x150/F97316/white?text=Medicine", "full_url": "https://placehold.co/400x400/F97316/white?text=Medicine", "source": "placeholder"},
        {"id": "ph_2", "preview_url": "https://placehold.co/150x150/22C55E/white?text=Tablet", "full_url": "https://placehold.co/400x400/22C55E/white?text=Tablet", "source": "placeholder"},
        {"id": "ph_3", "preview_url": "https://placehold.co/150x150/3B82F6/white?text=Capsule", "full_url": "https://placehold.co/400x400/3B82F6/white?text=Capsule", "source": "placeholder"},
    ]
    return {"success": True, "images": placeholders, "note": "Using placeholder images"}


# ============ Orders ============

@router.get("/orders")
@router.get("/staff/orders")
async def get_orders(
    status: str = None,
    date: str = None,
    search: str = None,
    page: int = 1,
    limit: int = 50,
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
@router.put("/staff/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    data: OrderStatusUpdate,
    staff=Depends(verify_pharmacy_staff)
):
    """Update order status"""
    # Search by both order_id and id fields for compatibility
    order = await db.pharmacy_orders.find_one({
        "$or": [{"order_id": order_id}, {"id": order_id}]
    })
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if data.status not in ORDER_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    # Enforce invoice upload before dispatch (shipped/out_for_delivery)
    if data.status in ["shipped", "out_for_delivery"]:
        if not order.get("invoice_uploaded"):
            raise HTTPException(
                status_code=400, 
                detail="Invoice must be uploaded before dispatching the order. Please upload the invoice first."
            )
    
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
    
    # Update using the actual order's id or order_id field
    actual_order_id = order.get("order_id") or order.get("id")
    await db.pharmacy_orders.update_one(
        {"$or": [{"order_id": actual_order_id}, {"id": actual_order_id}]}, 
        {"$set": update_data}
    )
    
    # Log staff activity
    try:
        await db.staff_activity.insert_one({
            "staff_id": staff.get("sub"),
            "staff_name": staff.get("name"),
            "action": f"order_{data.status}",
            "details": {
                "order_id": order_id,
                "customer_name": order.get("customer_name"),
                "total_amount": order.get("total_amount")
            },
            "portal": "orange_pharmacy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d")
        })
    except Exception as e:
        logger.error(f"Failed to log activity: {e}")
    
    # Send notifications
    customer_phone = order.get("customer_phone") or order.get("patient_phone")
    customer_email = order.get("customer_email") or order.get("patient_email")
    customer_name = order.get("customer_name") or order.get("patient_name") or "Customer"
    
    # WhatsApp notification using MSG91 templates for real-time tracking
    if customer_phone:
        try:
            from services.msg91_whatsapp import (
                send_orange_order_confirmed,
                send_orange_order_packed,
                send_orange_order_dispatched,
                send_orange_order_delivered
            )
            
            whatsapp_result = None
            
            # Helper: build items string from order
            items_list = order.get("items", order.get("medicines", []))
            items_str = ", ".join([item.get("name", "Medicine") for item in items_list[:3]])
            if len(items_list) > 3:
                items_str += f" +{len(items_list)-3} more"
            items_str = items_str or "Your medicines"
            
            if data.status in ("order_placed", "booked", "prescription_validated", "pharmacist_call"):
                # Order confirmed / prescription validated - pharmacist will call
                estimated_time = "Today by 6 PM" if datetime.now(timezone.utc).hour < 14 else "Tomorrow by 12 PM"
                
                whatsapp_result = await send_orange_order_confirmed(
                    phone=customer_phone,
                    patient_name=customer_name,
                    order_id=order_id,
                    items=items_str,
                    estimated_time=estimated_time,
                    db=db
                )
                logger.info(f"[WhatsApp] Order confirmed notification sent for {order_id} (status: {data.status})")
                
            elif data.status in ("packing", "in_process"):
                # Order packed / in process
                total_amount = f"₹{order.get('total_amount', 0):.0f}"
                payment_status = "Paid" if order.get("payment_status") == "paid" else "Cash on Delivery"
                
                whatsapp_result = await send_orange_order_packed(
                    phone=customer_phone,
                    patient_name=customer_name,
                    order_id=order_id,
                    total_amount=total_amount,
                    payment_status=payment_status,
                    db=db
                )
                logger.info(f"[WhatsApp] Order packed notification sent for {order_id} (status: {data.status})")
                
            elif data.status in ("out_for_delivery", "shipped"):
                # Order dispatched / shipped
                delivery_partner = data.notes or "Orange Delivery"
                estimated_arrival = "30-45 mins"
                contact_number = "9833188288"
                
                whatsapp_result = await send_orange_order_dispatched(
                    phone=customer_phone,
                    patient_name=customer_name,
                    order_id=order_id,
                    delivery_partner=delivery_partner,
                    estimated_arrival=estimated_arrival,
                    contact_number=contact_number,
                    db=db
                )
                logger.info(f"[WhatsApp] Order dispatched notification sent for {order_id} (status: {data.status})")
                
                # Auto-send payment link for pay_later orders
                payment_method = order.get("payment_method", "")
                if payment_method == "pay_later" and not order.get("payment_link_sent"):
                    try:
                        total_amount = float(order.get("total_amount") or order.get("total") or 0)
                        if total_amount > 0:
                            from routes.cashfree import create_cashfree_order
                            from routes.payment_links import send_payment_link_whatsapp
                            
                            phone_clean = customer_phone.replace("+91", "").replace(" ", "")[-10:]
                            payment_order = await create_cashfree_order({
                                "customer_id": f"PHARM_{phone_clean}_{int(datetime.now(timezone.utc).timestamp())}",
                                "customer_name": customer_name,
                                "customer_email": order.get("patient_email") or f"{phone_clean}@pharmacy.nevikacura.com",
                                "customer_phone": phone_clean,
                                "amount": total_amount,
                                "product_type": "pharmacy",
                                "product_id": actual_order_id
                            })
                            payment_link = payment_order.get("payment_link")
                            if payment_link:
                                await send_payment_link_whatsapp(
                                    phone=phone_clean,
                                    patient_name=customer_name,
                                    amount=total_amount,
                                    payment_link=payment_link,
                                    order_id=order.get("booking_id", actual_order_id[:8])
                                )
                                await db.pharmacy_orders.update_one(
                                    {"$or": [{"order_id": actual_order_id}, {"id": actual_order_id}]},
                                    {"$set": {
                                        "payment_link": payment_link,
                                        "payment_link_sent": True,
                                        "payment_link_sent_at": datetime.now(timezone.utc).isoformat(),
                                        "cashfree_order_id": payment_order.get("order_id")
                                    }}
                                )
                                logger.info(f"[PayLater] Payment link sent for order {order_id}: {payment_link}")
                    except Exception as pl_err:
                        logger.error(f"[PayLater] Failed to send payment link for {order_id}: {pl_err}")
                
            elif data.status in ("completed", "delivered"):
                # Order delivered
                delivered_time = datetime.now(timezone.utc).strftime("%I:%M %p")
                invoice_url = order.get("invoice_url", "nevikacura.com/orders")
                
                whatsapp_result = await send_orange_order_delivered(
                    phone=customer_phone,
                    patient_name=customer_name,
                    order_id=order_id,
                    delivered_time=delivered_time,
                    invoice_url=invoice_url,
                    db=db
                )
                logger.info(f"[WhatsApp] Order delivered notification sent for {order_id} (status: {data.status})")
            
            # Update order with notification status
            if whatsapp_result:
                await db.pharmacy_orders.update_one(
                    {"$or": [{"order_id": actual_order_id}, {"id": actual_order_id}]},
                    {"$set": {
                        f"whatsapp_{data.status}_sent": True,
                        f"whatsapp_{data.status}_sent_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
        except Exception as e:
            logger.error(f"WhatsApp notification failed for order {order_id}: {e}")
    
    # Email notification for key statuses
    if send_email_notification and customer_email and data.status in ["out_for_delivery", "shipped", "completed", "delivered"]:
        try:
            from services.email_templates import pharmacy_out_for_delivery_email, pharmacy_delivered_email
            actual_oid = order.get("order_id") or order.get("booking_id") or str(order_id)
            items = [{"name": m.get("name", "Item"), "qty": m.get("quantity", 1)} for m in order.get("medicines", order.get("items", []))]
            total = order.get("total_amount") or order.get("total") or ""
            if total and not str(total).startswith("₹"):
                total = f"₹{total}"

            if data.status in ("out_for_delivery", "shipped"):
                html = pharmacy_out_for_delivery_email(customer_name, actual_oid, "30-60 mins", order.get("delivery_address", ""))
                subject = f"Your order is on the way! - #{actual_oid}"
            else:
                html = pharmacy_delivered_email(customer_name, actual_oid, items, total)
                subject = f"Order delivered! - #{actual_oid}"

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
    """Upload invoice PDF/image for order using Emergent Object Storage"""
    order = await db.pharmacy_orders.find_one({
        "$or": [{"order_id": order_id}, {"id": order_id}]
    })
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    content = await file.read()
    
    # Upload to object storage
    try:
        from services.object_storage import upload_invoice as storage_upload
        result = storage_upload(
            order_id=order_id,
            filename=file.filename,
            data=content,
            content_type=file.content_type
        )
        storage_path = result.get("path", "")
    except Exception as e:
        logger.error(f"Object storage upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    
    actual_order_id = order.get("order_id") or order.get("id")
    await db.pharmacy_orders.update_one(
        {"$or": [{"order_id": actual_order_id}, {"id": actual_order_id}]},
        {"$set": {
            "invoice_storage_path": storage_path,
            "invoice_filename": file.filename,
            "invoice_content_type": file.content_type,
            "invoice_uploaded": True,
            "invoice_uploaded_at": datetime.now(timezone.utc).isoformat(),
            "invoice_uploaded_by": staff.get('name', 'Staff')
        }}
    )
    
    return {"success": True, "message": "Invoice uploaded successfully", "path": storage_path}


@router.get("/orders/{order_id}/invoice")
async def get_invoice(order_id: str, staff=Depends(verify_pharmacy_staff)):
    """Get invoice for order - serves from object storage"""
    from fastapi.responses import Response
    order = await db.pharmacy_orders.find_one(
        {"$or": [{"order_id": order_id}, {"id": order_id}]},
        {"_id": 0, "invoice_storage_path": 1, "invoice_filename": 1, "invoice_content_type": 1, "invoice_uploaded": 1}
    )
    if not order or not order.get("invoice_uploaded"):
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    storage_path = order.get("invoice_storage_path")
    if not storage_path:
        raise HTTPException(status_code=404, detail="Invoice file not found in storage")
    
    try:
        from services.object_storage import get_invoice as storage_get
        data, content_type = storage_get(storage_path)
        return Response(
            content=data,
            media_type=order.get("invoice_content_type", content_type),
            headers={"Content-Disposition": f'inline; filename="{order.get("invoice_filename", "invoice.pdf")}"'}
        )
    except Exception as e:
        logger.error(f"Failed to get invoice from storage: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve invoice")


@router.get("/orders/{order_id}/invoice-download")
async def download_invoice_public(order_id: str):
    """Public endpoint for downloading invoice (used in email/WhatsApp links)"""
    from fastapi.responses import Response
    order = await db.pharmacy_orders.find_one(
        {"$or": [{"order_id": order_id}, {"id": order_id}]},
        {"_id": 0, "invoice_storage_path": 1, "invoice_filename": 1, "invoice_content_type": 1, "invoice_uploaded": 1}
    )
    if not order or not order.get("invoice_uploaded"):
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    storage_path = order.get("invoice_storage_path")
    if not storage_path:
        raise HTTPException(status_code=404, detail="Invoice file not found")
    
    try:
        from services.object_storage import get_invoice as storage_get
        data, content_type = storage_get(storage_path)
        return Response(
            content=data,
            media_type=order.get("invoice_content_type", content_type),
            headers={"Content-Disposition": f'attachment; filename="{order.get("invoice_filename", "invoice.pdf")}"'}
        )
    except Exception as e:
        logger.error(f"Failed to download invoice: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve invoice")


@router.post("/orders/{order_id}/send-invoice")
async def send_invoice_to_customer(order_id: str, staff=Depends(verify_pharmacy_staff)):
    """Send invoice to customer via email and WhatsApp"""
    order = await db.pharmacy_orders.find_one(
        {"$or": [{"order_id": order_id}, {"id": order_id}]},
        {"_id": 0}
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not order.get("invoice_uploaded"):
        raise HTTPException(status_code=400, detail="No invoice uploaded for this order")
    
    customer_email = order.get("customer_email") or order.get("patient_email")
    customer_phone = order.get("customer_phone") or order.get("patient_phone")
    customer_name = order.get("customer_name") or order.get("patient_name") or "Customer"
    total_amount = order.get("total_amount") or order.get("total") or order.get("grand_total") or 0
    actual_oid = order.get("order_id") or order.get("id")
    
    # Build the public invoice download URL
    frontend_url = os.environ.get("FRONTEND_URL", os.environ.get("CHECKOUT_BASE_URL", ""))
    invoice_url = f"{frontend_url}/api/pharmacy/orders/{actual_oid}/invoice-download"
    
    email_sent = False
    whatsapp_sent = False
    
    # Send email with invoice link
    if send_email_notification and customer_email:
        try:
            from services.email_templates import pharmacy_delivered_email
            items = [{"name": m.get("name", "Item"), "qty": m.get("quantity", 1)} for m in order.get("medicines", order.get("items", []))]
            total_str = f"₹{total_amount}" if total_amount and not str(total_amount).startswith("₹") else str(total_amount)
            html = pharmacy_delivered_email(customer_name, actual_oid, items, total_str)
            subject = f"Invoice for Order #{actual_oid} - Orange Pharmacy"
            await send_email_notification(
                subject=subject,
                html_content=html,
                patient_email=customer_email,
                patient_subject=subject,
                patient_html=html
            )
            email_sent = True
            logger.info(f"Invoice email sent for order {actual_oid} to {customer_email}")
        except Exception as e:
            logger.error(f"Failed to send invoice email: {e}")
    
    # Send WhatsApp notification with document_delivery template
    if customer_phone:
        try:
            from services.msg91_whatsapp import send_document_delivery
            result = await send_document_delivery(
                phone=customer_phone,
                patient_name=customer_name,
                document_type="invoice",
                from_name="Orange Pharmacy",
                download_url=invoice_url,
                reference_id=actual_oid,
                db=db
            )
            whatsapp_sent = result.get("success", False)
            logger.info(f"WhatsApp invoice notification result: {result}")
        except Exception as e:
            logger.error(f"Failed to send WhatsApp: {e}")
    
    # Mark as sent
    await db.pharmacy_orders.update_one(
        {"$or": [{"order_id": actual_oid}, {"id": actual_oid}]},
        {"$set": {
            "invoice_sent": True,
            "invoice_sent_at": datetime.now(timezone.utc).isoformat(),
            "invoice_sent_email": email_sent,
            "invoice_sent_whatsapp": whatsapp_sent,
            "invoice_url": invoice_url
        }}
    )
    
    return {
        "success": True,
        "email_sent": email_sent,
        "whatsapp_sent": whatsapp_sent,
        "invoice_url": invoice_url,
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
            "message": "Inventory synced successfully",
            "new_medicines_added": new_count,
            "medicines_updated": updated_count,
            "total_in_database": total
        }
        
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"Failed to import inventory: {str(e)}")
    except Exception as e:
        logger.error(f"Inventory sync failed: {e}")
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")



# ============ Duplicate Management ============

@router.get("/duplicates")
async def find_potential_duplicates(
    page: int = 1,
    limit: int = 20,
    staff=Depends(verify_pharmacy_staff)
):
    """Find potential duplicate medicines (same name, different manufacturers)"""
    pipeline = [
        {"$group": {
            "_id": {"$toLower": "$name"},
            "count": {"$sum": 1},
            "ids": {"$push": "$id"},
            "names": {"$push": "$name"},
            "manufacturers": {"$push": "$manufacturer"},
            "mrps": {"$push": "$mrp"},
            "categories": {"$push": "$category"},
        }},
        {"$match": {"count": {"$gt": 1}}},
        {"$sort": {"count": -1}},
        {"$facet": {
            "data": [{"$skip": (max(1, page) - 1) * limit}, {"$limit": limit}],
            "total": [{"$count": "count"}]
        }}
    ]
    
    result = await db.medicines.aggregate(pipeline).to_list(1)
    data = result[0] if result else {"data": [], "total": []}
    
    duplicates = []
    for group in data.get("data", []):
        items = []
        for i in range(len(group["ids"])):
            items.append({
                "id": group["ids"][i],
                "name": group["names"][i] if i < len(group["names"]) else "",
                "manufacturer": group["manufacturers"][i] if i < len(group["manufacturers"]) else "",
                "mrp": group["mrps"][i] if i < len(group["mrps"]) else 0,
                "category": group["categories"][i] if i < len(group["categories"]) else "",
            })
        duplicates.append({
            "name": group["_id"],
            "count": group["count"],
            "items": items
        })
    
    total = data["total"][0]["count"] if data.get("total") else 0
    
    return {
        "duplicates": duplicates,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit if total > 0 else 0
    }


@router.post("/duplicates/merge")
async def merge_duplicates(
    data: dict,
    staff=Depends(verify_pharmacy_staff)
):
    """Merge duplicate medicines: keep one, delete others"""
    keep_id = data.get("keep_id")
    delete_ids = data.get("delete_ids", [])
    
    if not keep_id or not delete_ids:
        raise HTTPException(status_code=400, detail="keep_id and delete_ids required")
    
    # Verify the keep medicine exists
    keep_med = await db.medicines.find_one({"id": keep_id})
    if not keep_med:
        raise HTTPException(status_code=404, detail="Medicine to keep not found")
    
    # Delete the duplicates
    deleted = 0
    for did in delete_ids:
        if did != keep_id:
            result = await db.medicines.delete_one({"id": did})
            deleted += result.deleted_count
    
    return {"success": True, "kept": keep_id, "deleted": deleted}



@router.post("/duplicates/auto-merge")
async def auto_merge_all_duplicates(
    data: dict = {},
    staff=Depends(verify_pharmacy_staff)
):
    """Auto-merge all duplicates: for each group, keep the one with highest MRP (most complete data)"""
    strategy = data.get("strategy", "highest_mrp")
    
    pipeline = [
        {"$group": {
            "_id": {"$toLower": "$name"},
            "count": {"$sum": 1},
            "docs": {"$push": {
                "id": "$id",
                "mrp": {"$ifNull": ["$mrp", 0]},
                "manufacturer": {"$ifNull": ["$manufacturer", ""]},
                "image_url": {"$ifNull": ["$image_url", ""]},
                "description": {"$ifNull": ["$description", ""]},
            }},
        }},
        {"$match": {"count": {"$gt": 1}}},
    ]
    
    groups = await db.medicines.aggregate(pipeline).to_list(None)
    
    total_groups = len(groups)
    total_deleted = 0
    
    for group in groups:
        docs = group["docs"]
        if strategy == "highest_mrp":
            # Sort by MRP desc, then by completeness (has image, description)
            docs.sort(key=lambda d: (
                d.get("mrp", 0) or 0,
                1 if d.get("image_url") else 0,
                1 if d.get("description") else 0,
            ), reverse=True)
        
        keep_id = docs[0]["id"]
        delete_ids = [d["id"] for d in docs[1:] if d["id"] != keep_id]
        
        if delete_ids:
            result = await db.medicines.delete_many({"id": {"$in": delete_ids}})
            total_deleted += result.deleted_count
    
    return {
        "success": True,
        "groups_processed": total_groups,
        "total_deleted": total_deleted,
        "strategy": strategy
    }


# ============ Live Delivery Tracking ============

class DeliveryLocationUpdate(BaseModel):
    order_id: str
    latitude: float
    longitude: float
    heading: Optional[float] = None
    speed: Optional[float] = None

class DeliveryAssignment(BaseModel):
    order_id: str
    driver_name: str
    driver_phone: str
    estimated_minutes: Optional[int] = 30
    pharmacy_lat: Optional[float] = None
    pharmacy_lng: Optional[float] = None
    delivery_lat: Optional[float] = None
    delivery_lng: Optional[float] = None


@router.post("/delivery/assign")
async def assign_delivery(data: DeliveryAssignment, staff=Depends(verify_pharmacy_staff)):
    """Staff assigns a delivery agent to an order"""
    order = await db.pharmacy_orders.find_one({"id": data.order_id}, {"_id": 0})
    if not order:
        order = await db.pharmacy_orders.find_one({"order_id": data.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    delivery_doc = {
        "order_id": data.order_id,
        "driver_name": data.driver_name,
        "driver_phone": data.driver_phone,
        "estimated_minutes": data.estimated_minutes,
        "pharmacy_location": {
            "lat": data.pharmacy_lat or 19.3725,
            "lng": data.pharmacy_lng or 72.8467
        },
        "delivery_location": {
            "lat": data.delivery_lat or order.get("delivery_lat", 19.3800),
            "lng": data.delivery_lng or order.get("delivery_lng", 72.8500)
        },
        "current_location": {
            "lat": data.pharmacy_lat or 19.3725,
            "lng": data.pharmacy_lng or 72.8467
        },
        "status": "active",
        "assigned_at": datetime.now(timezone.utc).isoformat(),
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "location_history": []
    }

    await db.delivery_tracking.update_one(
        {"order_id": data.order_id},
        {"$set": delivery_doc},
        upsert=True
    )

    return {"success": True, "message": f"Delivery assigned to {data.driver_name}"}


@router.put("/delivery/location")
async def update_delivery_location(data: DeliveryLocationUpdate):
    """Delivery agent updates their GPS location (no auth for simplicity on agent's phone)"""
    tracking = await db.delivery_tracking.find_one({"order_id": data.order_id}, {"_id": 0})
    if not tracking:
        raise HTTPException(status_code=404, detail="No active delivery for this order")

    location_entry = {
        "lat": data.latitude,
        "lng": data.longitude,
        "heading": data.heading,
        "speed": data.speed,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    await db.delivery_tracking.update_one(
        {"order_id": data.order_id},
        {
            "$set": {
                "current_location": {"lat": data.latitude, "lng": data.longitude},
                "last_updated": datetime.now(timezone.utc).isoformat()
            },
            "$push": {
                "location_history": {
                    "$each": [location_entry],
                    "$slice": -100
                }
            }
        }
    )

    return {"success": True}


@router.get("/orders/{order_id}/live-tracking")
async def get_live_tracking(order_id: str):
    """Customer gets live tracking data for their order (no auth - public link)"""
    # Try both id and order_id fields
    order = await db.pharmacy_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        order = await db.pharmacy_orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    tracking = await db.delivery_tracking.find_one({"order_id": order_id}, {"_id": 0})

    status = order.get("status", "order_placed")
    is_live = status in ("out_for_delivery", "shipped") and tracking and tracking.get("status") == "active"

    items = order.get("items", order.get("medicines", []))
    total = order.get("total", order.get("total_amount", 0))

    result = {
        "success": True,
        "order_id": order.get("id", order.get("order_id", order_id)),
        "status": status,
        "status_label": STATUS_LABELS.get(status, status),
        "total_amount": total,
        "items": [{"name": i.get("name", "Medicine"), "qty": i.get("quantity", i.get("qty", 1)), "price": i.get("price", 0)} for i in items],
        "created_at": order.get("created_at", ""),
        "is_live_tracking": is_live,
        "delivery_address": order.get("address", order.get("delivery_address", ""))
    }

    if is_live and tracking:
        result["driver"] = {
            "name": tracking.get("driver_name", "Delivery Partner"),
            "phone": tracking.get("driver_phone", ""),
            "estimated_minutes": tracking.get("estimated_minutes", 30)
        }
        result["current_location"] = tracking.get("current_location")
        result["pharmacy_location"] = tracking.get("pharmacy_location")
        result["delivery_location"] = tracking.get("delivery_location")
        result["last_updated"] = tracking.get("last_updated")
        # Return last 20 points for route trail
        history = tracking.get("location_history", [])
        result["route_trail"] = history[-20:]

    return result


# ============ Delivery Dashboard - All Active Deliveries ============

@router.get("/delivery/active")
async def get_active_deliveries(staff=Depends(verify_pharmacy_staff)):
    """Get all active deliveries with current GPS positions for the dashboard map"""
    active_trackings = await db.delivery_tracking.find(
        {"status": "active"},
        {"_id": 0}
    ).to_list(100)

    deliveries = []
    for tracking in active_trackings:
        order_id = tracking.get("order_id", "")
        order = await db.pharmacy_orders.find_one(
            {"$or": [{"id": order_id}, {"order_id": order_id}]},
            {"_id": 0, "id": 1, "order_id": 1, "customer": 1, "patient_name": 1,
             "address": 1, "delivery_address": 1, "total": 1, "total_amount": 1,
             "items": 1, "medicines": 1, "status": 1}
        )

        customer_name = ""
        address = ""
        total = 0
        item_count = 0
        if order:
            customer_name = order.get("customer", {}).get("name", "") or order.get("patient_name", "")
            addr = order.get("address") or order.get("delivery_address", "")
            if isinstance(addr, dict):
                address = ", ".join(filter(None, [addr.get("line1", ""), addr.get("city", ""), addr.get("pincode", "")]))
            else:
                address = str(addr)
            total = order.get("total", order.get("total_amount", 0))
            items = order.get("items", order.get("medicines", []))
            item_count = len(items) if items else 0

        deliveries.append({
            "order_id": order_id,
            "driver_name": tracking.get("driver_name", "Driver"),
            "driver_phone": tracking.get("driver_phone", ""),
            "current_location": tracking.get("current_location"),
            "pharmacy_location": tracking.get("pharmacy_location"),
            "delivery_location": tracking.get("delivery_location"),
            "estimated_minutes": tracking.get("estimated_minutes", 30),
            "last_updated": tracking.get("last_updated", ""),
            "assigned_at": tracking.get("assigned_at", ""),
            "customer_name": customer_name,
            "address": address,
            "total": total,
            "item_count": item_count,
            "order_status": order.get("status", "") if order else ""
        })

    return {"success": True, "deliveries": deliveries, "count": len(deliveries)}


# ============ OTP-Based Delivery Verification ============

class DeliveryVerification(BaseModel):
    order_id: str
    verification_code: str


@router.post("/delivery/verify")
async def verify_delivery(data: DeliveryVerification):
    """
    Delivery agent verifies delivery by entering the 6-digit order ID.
    The customer shares their order ID verbally as the verification code.
    """
    # Find order by id or order_id
    order = await db.pharmacy_orders.find_one({"id": data.order_id}, {"_id": 0})
    if not order:
        order = await db.pharmacy_orders.find_one({"order_id": data.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    actual_id = order.get("id") or order.get("order_id", "")

    # Verify code matches the order ID
    if data.verification_code.strip() != actual_id.strip():
        return {"success": False, "error": "Invalid verification code. Ask customer for their order number."}

    # Check if already delivered
    if order.get("status") in ("delivered", "completed"):
        return {"success": False, "error": "Order already marked as delivered."}

    # Mark as delivered
    now = datetime.now(timezone.utc).isoformat()
    update = {
        "status": "delivered",
        "delivered_at": now,
        "delivery_verified": True,
        "delivery_verification_time": now
    }

    await db.pharmacy_orders.update_one(
        {"$or": [{"id": actual_id}, {"order_id": actual_id}]},
        {"$set": update}
    )

    # Deactivate delivery tracking
    await db.delivery_tracking.update_one(
        {"order_id": data.order_id},
        {"$set": {"status": "completed", "completed_at": now}}
    )

    # Send WhatsApp delivery confirmation
    try:
        customer_phone = order.get("customer", {}).get("phone", "") or order.get("user_phone", "")
        customer_name = order.get("customer", {}).get("name", "Customer") or order.get("patient_name", "Customer")
        if customer_phone:
            from services.msg91_whatsapp import send_orange_order_delivered
            delivered_time = datetime.now(timezone.utc).strftime("%I:%M %p")
            invoice_url = order.get("invoice_url", "nevikacura.com/orders")
            await send_orange_order_delivered(
                phone=customer_phone,
                patient_name=customer_name,
                order_id=actual_id,
                delivered_time=delivered_time,
                invoice_url=invoice_url,
                db=db
            )
    except Exception as e:
        logger.warning(f"WhatsApp delivery notification failed: {e}")

    return {
        "success": True,
        "message": f"Delivery verified and confirmed for order #{actual_id}",
        "order_id": actual_id,
        "delivered_at": now
    }
