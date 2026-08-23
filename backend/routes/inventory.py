"""
Inventory Management Routes for Pharmacy and Diagnostics Staff
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
import jwt
import os

# Import static medicine inventory (4266 medicines)
try:
    from data.medicine_inventory import MEDICINE_INVENTORY
except ImportError:
    MEDICINE_INVENTORY = []

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Inventory"])

# JWT Configuration
JWT_SECRET = os.environ.get("JWT_SECRET", "nevika-cura-jwt-secret-key-2025")
JWT_ALGORITHM = "HS256"

# Database reference
db = None

def set_db(database):
    global db
    db = database

# Auth dependency
async def get_staff_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ Pydantic Models ============

class MedicineCreate(BaseModel):
    name: str
    form: Optional[str] = "Tablet"
    image_url: Optional[str] = None
    mrp: float
    discount_percent: Optional[float] = 0
    sale_price: Optional[float] = None
    category: Optional[str] = "General"
    description: Optional[str] = None
    stock: Optional[int] = 100
    unit: Optional[str] = "strip"

class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    form: Optional[str] = None
    image_url: Optional[str] = None
    mrp: Optional[float] = None
    discount_percent: Optional[float] = None
    sale_price: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    stock: Optional[int] = None
    unit: Optional[str] = None

class TestCreate(BaseModel):
    name: str
    image_url: Optional[str] = None
    cost: float
    discount_percent: Optional[float] = 0
    sale_price: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    report_time: Optional[str] = None
    sample_type: Optional[str] = None
    preparation: Optional[str] = None

class TestUpdate(BaseModel):
    name: Optional[str] = None
    image_url: Optional[str] = None
    cost: Optional[float] = None
    discount_percent: Optional[float] = None
    sale_price: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    report_time: Optional[str] = None
    sample_type: Optional[str] = None
    preparation: Optional[str] = None

# ============ Public Medicine Catalog (for patients) ============

@router.get("/medicines/catalog")
async def get_public_medicines(
    page: int = 1,
    limit: int = 5000,
    search: str = None,
    form: str = None
):
    """Get medicines catalog for patients - public endpoint with 4266+ medicines"""
    try:
        # Start with static inventory (4266 medicines)
        all_medicines = MEDICINE_INVENTORY.copy()
        
        # Filter by search
        if search:
            search_lower = search.lower()
            all_medicines = [m for m in all_medicines if search_lower in m.get('name', '').lower()]
        
        # Filter by form/category
        if form and form.lower() != 'all':
            form_lower = form.lower()
            all_medicines = [m for m in all_medicines if form_lower in m.get('form', '').lower()]
        
        # Get unique forms for filter
        forms = list(set(m.get('form', 'Other') for m in MEDICINE_INVENTORY))
        
        # Paginate
        total = len(all_medicines)
        skip = (page - 1) * limit
        paginated = all_medicines[skip:skip + limit]
        
        # Format medicines
        medicines = []
        for med in paginated:
            medicines.append({
                'id': med.get('name', '').replace(' ', '_'),
                'name': med.get('name', ''),
                'form': med.get('form', 'Other'),
                'category': med.get('form', 'Other'),  # Use form as category
                'mrp': 0,  # Price not in static data
                'sale_price': 0,
                'stock': 100  # Default stock
            })
        
        return {
            "medicines": medicines,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit,
            "categories": sorted(forms)
        }
    except Exception as e:
        logger.error(f"Failed to get medicines catalog: {e}")
        raise HTTPException(status_code=500, detail="Failed to load medicines")

# ============ Staff Pharmacy Inventory Endpoints ============

@router.get("/pharmacy/inventory")
async def get_pharmacy_inventory(
    staff = Depends(get_staff_user),
    page: int = 1,
    limit: int = 100,
    search: str = None,
    category: str = None
):
    """Get all medicines in pharmacy inventory from database"""
    try:
        if db is None:
            raise HTTPException(status_code=500, detail="Database not initialized")
        
        # Build query
        query = {}
        if search:
            query['name'] = {'$regex': search, '$options': 'i'}
        if category and category.lower() != 'all':
            query['category'] = category
        
        # Get total count
        total = await db.pharmacy_inventory.count_documents(query)
        
        # Get medicines with pagination (newest first)
        skip = (page - 1) * limit
        cursor = db.pharmacy_inventory.find(query).sort('created_at', -1).skip(skip).limit(limit)
        db_medicines = await cursor.to_list(limit)
        
        # Format medicines
        medicines = []
        for med in db_medicines:
            medicines.append({
                'id': med.get('id', str(med.get('_id', ''))),
                'name': med.get('name', ''),
                'form': med.get('form', 'Tablet'),
                'category': med.get('category', 'General'),
                'image_url': med.get('image_url', ''),
                'mrp': med.get('mrp', 0),
                'sale_price': med.get('sale_price', 0),
                'discount_percent': med.get('discount_percent', 0),
                'stock': med.get('stock', 100),
                'unit': med.get('unit', 'strip'),
                'created_at': med.get('created_at', ''),
                'created_by': med.get('created_by', '')
            })
        
        # Get unique categories for filter
        categories = await db.pharmacy_inventory.distinct('category')
        
        return {
            "medicines": medicines,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit if total > 0 else 1,
            "categories": sorted([c for c in categories if c])
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get pharmacy inventory: {e}")
        raise HTTPException(status_code=500, detail="Failed to load inventory")

@router.post("/pharmacy/inventory")
async def create_medicine(medicine: MedicineCreate, staff = Depends(get_staff_user)):
    """Add a new medicine to inventory"""
    try:
        # Verify db is set
        if db is None:
            logger.error("Database not initialized in inventory router!")
            raise HTTPException(status_code=500, detail="Database not initialized")
        
        # Calculate sale price if not provided
        sale_price = medicine.sale_price
        if sale_price is None:
            sale_price = medicine.mrp - (medicine.mrp * (medicine.discount_percent or 0) / 100)
        
        doc = {
            "id": str(uuid.uuid4()),
            "name": medicine.name,
            "form": medicine.form or "Tablet",
            "image_url": medicine.image_url,
            "mrp": medicine.mrp,
            "discount_percent": medicine.discount_percent or 0,
            "sale_price": round(sale_price, 2),
            "category": medicine.category or "General",
            "description": medicine.description,
            "stock": medicine.stock or 100,
            "unit": medicine.unit or "strip",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": staff.get("username", "staff")
        }
        
        result = await db.pharmacy_inventory.insert_one(doc)
        logger.info(f"Medicine inserted with _id: {result.inserted_id}")
        doc.pop('_id', None)
        
        logger.info(f"Medicine added: {medicine.name}")
        return doc
    except Exception as e:
        logger.error(f"Failed to add medicine: {e}")
        raise HTTPException(status_code=500, detail="Failed to add medicine")

@router.put("/pharmacy/inventory/{medicine_id}")
async def update_medicine(medicine_id: str, medicine: MedicineUpdate, staff = Depends(get_staff_user)):
    """Update a medicine in inventory"""
    try:
        update_data = {k: v for k, v in medicine.dict().items() if v is not None}
        
        # Recalculate sale price if mrp or discount changed
        if 'mrp' in update_data or 'discount_percent' in update_data:
            existing = await db.pharmacy_inventory.find_one({"id": medicine_id})
            if existing:
                mrp = update_data.get('mrp', existing.get('mrp', 0))
                discount = update_data.get('discount_percent', existing.get('discount_percent', 0))
                update_data['sale_price'] = round(mrp - (mrp * discount / 100), 2)
        
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        result = await db.pharmacy_inventory.update_one(
            {"id": medicine_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Medicine not found")
        
        logger.info(f"Medicine updated: {medicine_id}")
        return {"success": True, "message": "Medicine updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update medicine: {e}")
        raise HTTPException(status_code=500, detail="Failed to update medicine")

@router.delete("/pharmacy/inventory/{medicine_id}")
async def delete_medicine(medicine_id: str, staff = Depends(get_staff_user)):
    """Delete a medicine from inventory"""
    try:
        result = await db.pharmacy_inventory.delete_one({"id": medicine_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Medicine not found")
        
        logger.info(f"Medicine deleted: {medicine_id}")
        return {"success": True, "message": "Medicine deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete medicine: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete medicine")

# ============ Diagnostics Inventory Endpoints ============

@router.get("/diagnostics/inventory")
async def get_diagnostics_inventory(staff = Depends(get_staff_user)):
    """Get all tests in diagnostics inventory - combines diagnostics_inventory and diagnostic_tests_catalog"""
    try:
        tests = []
        
        # Get from diagnostics_inventory (staff-added tests)
        staff_tests = await db.diagnostics_inventory.find({}).to_list(10000)
        for test in staff_tests:
            test['id'] = str(test.pop('_id'))
            test['source'] = 'staff'
            tests.append(test)
        
        # Get from diagnostic_tests_catalog (pre-loaded tests)
        catalog_tests = await db.diagnostic_tests_catalog.find({'active': {'$ne': False}}).to_list(10000)
        for test in catalog_tests:
            tests.append({
                'id': test.get('id') or str(test.get('_id', '')),
                'name': test.get('name', ''),
                'image_url': test.get('image') or test.get('image_url', ''),
                'cost': test.get('price') or test.get('cost', 0),
                'discount_percent': test.get('discount_percent', 0),
                'sale_price': test.get('sale_price') or test.get('price') or test.get('cost', 0),
                'category': test.get('category', ''),
                'description': test.get('description', ''),
                'report_time': test.get('report_time') or test.get('turnaround_time', ''),
                'sample_type': test.get('sample_type', ''),
                'preparation': test.get('preparation') or test.get('instructions', ''),
                'source': 'catalog'
            })
        
        return {"tests": tests, "total": len(tests)}
    except Exception as e:
        logger.error(f"Failed to get diagnostics inventory: {e}")
        raise HTTPException(status_code=500, detail="Failed to load inventory")

@router.post("/diagnostics/inventory")
async def create_test(test: TestCreate, staff = Depends(get_staff_user)):
    """Add a new test to inventory"""
    try:
        # Calculate sale price if not provided
        sale_price = test.sale_price
        if sale_price is None:
            sale_price = test.cost - (test.cost * (test.discount_percent or 0) / 100)
        
        doc = {
            "id": str(uuid.uuid4()),
            "name": test.name,
            "image_url": test.image_url,
            "cost": test.cost,
            "discount_percent": test.discount_percent or 0,
            "sale_price": round(sale_price, 2),
            "category": test.category,
            "description": test.description,
            "report_time": test.report_time,
            "sample_type": test.sample_type,
            "preparation": test.preparation,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": staff.get("username", "staff")
        }
        
        await db.diagnostics_inventory.insert_one(doc)
        doc.pop('_id', None)
        
        logger.info(f"Test added: {test.name}")
        return doc
    except Exception as e:
        logger.error(f"Failed to add test: {e}")
        raise HTTPException(status_code=500, detail="Failed to add test")

@router.put("/diagnostics/inventory/{test_id}")
async def update_test(test_id: str, test: TestUpdate, staff = Depends(get_staff_user)):
    """Update a test in inventory"""
    try:
        update_data = {k: v for k, v in test.dict().items() if v is not None}
        
        # Recalculate sale price if cost or discount changed
        if 'cost' in update_data or 'discount_percent' in update_data:
            existing = await db.diagnostics_inventory.find_one({"id": test_id})
            if existing:
                cost = update_data.get('cost', existing.get('cost', 0))
                discount = update_data.get('discount_percent', existing.get('discount_percent', 0))
                update_data['sale_price'] = round(cost - (cost * discount / 100), 2)
        
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        result = await db.diagnostics_inventory.update_one(
            {"id": test_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Test not found")
        
        logger.info(f"Test updated: {test_id}")
        return {"success": True, "message": "Test updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update test: {e}")
        raise HTTPException(status_code=500, detail="Failed to update test")

@router.delete("/diagnostics/inventory/{test_id}")
async def delete_test(test_id: str, staff = Depends(get_staff_user)):
    """Delete a test from inventory"""
    try:
        result = await db.diagnostics_inventory.delete_one({"id": test_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Test not found")
        
        logger.info(f"Test deleted: {test_id}")
        return {"success": True, "message": "Test deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete test: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete test")

# ============ Admin Order Cancellation ============

@router.post("/admin/orders/cancel/{order_type}/{order_id}")
async def cancel_order(order_type: str, order_id: str, staff = Depends(get_staff_user)):
    """Cancel a pharmacy or diagnostic order (admin only)"""
    role = staff.get("role", "")
    
    if role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        if order_type == "pharmacy":
            result = await db.pharmacy_orders.update_one(
                {"id": order_id},
                {"$set": {
                    "status": "cancelled",
                    "cancelled_at": datetime.now(timezone.utc).isoformat(),
                    "cancelled_by": staff.get("username", "admin")
                }}
            )
            collection_name = "Pharmacy"
        elif order_type == "diagnostics":
            result = await db.diagnostic_orders.update_one(
                {"id": order_id},
                {"$set": {
                    "status": "cancelled",
                    "cancelled_at": datetime.now(timezone.utc).isoformat(),
                    "cancelled_by": staff.get("username", "admin")
                }}
            )
            collection_name = "Diagnostic"
        else:
            raise HTTPException(status_code=400, detail="Invalid order type. Use 'pharmacy' or 'diagnostics'")
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Order not found")
        
        logger.info(f"{collection_name} order cancelled by admin: {order_id}")
        return {"success": True, "message": f"{collection_name} order cancelled successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel order: {e}")
        raise HTTPException(status_code=500, detail="Failed to cancel order")


# ============ Customer My Orders ============

@router.get("/orders/my-orders")
async def get_my_orders(phone: str = None, email: str = None, limit: int = 50):
    """
    Get orders for a customer by phone number or email.
    This is used by the 'My Orders' section in the frontend.
    """
    try:
        if not phone and not email:
            return {
                "success": False,
                "message": "Please provide phone number or email to fetch orders",
                "orders": []
            }
        
        # Build query - search by phone or email
        query_conditions = []
        if phone:
            # Clean phone number (remove +91, spaces, etc.)
            clean_phone = phone.replace("+91", "").replace(" ", "").replace("-", "").strip()
            query_conditions.append({"patient_phone": {"$regex": clean_phone}})
        if email:
            query_conditions.append({"patient_email": email.lower()})
        
        query = {"$or": query_conditions} if query_conditions else {}
        
        # Fetch pharmacy orders
        pharmacy_orders = await db.pharmacy_orders.find(
            query, 
            {"_id": 0}
        ).sort("created_at", -1).to_list(limit)
        
        # Fetch diagnostic orders
        diagnostic_orders = await db.diagnostic_orders.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).to_list(limit)
        
        # Add order type to each order
        for order in pharmacy_orders:
            order["order_type"] = "pharmacy"
            order["order_type_label"] = "Medicine Order"
        
        for order in diagnostic_orders:
            order["order_type"] = "diagnostic"
            order["order_type_label"] = "Lab Test"
        
        # Combine and sort by date
        all_orders = pharmacy_orders + diagnostic_orders
        all_orders.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        return {
            "success": True,
            "total_orders": len(all_orders),
            "pharmacy_count": len(pharmacy_orders),
            "diagnostic_count": len(diagnostic_orders),
            "orders": all_orders[:limit]
        }
    except Exception as e:
        logger.error(f"Failed to fetch orders: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch orders")


# ============ Batch Expiry Tracking ============

class BatchExpiryCreate(BaseModel):
    medicine_id: str
    batch_number: str
    quantity: int
    expiry_date: str  # ISO format YYYY-MM-DD
    purchase_price: Optional[float] = 0
    supplier: Optional[str] = ""

@router.post("/inventory/batch-expiry")
async def add_batch_expiry(data: BatchExpiryCreate, staff=Depends(get_staff_user)):
    """Add batch expiry tracking for a medicine"""
    batch_id = f"BATCH-{uuid.uuid4().hex[:8].upper()}"
    batch = {
        "batch_id": batch_id,
        "medicine_id": data.medicine_id,
        "batch_number": data.batch_number,
        "quantity": data.quantity,
        "remaining_quantity": data.quantity,
        "expiry_date": data.expiry_date,
        "purchase_price": data.purchase_price,
        "supplier": data.supplier,
        "status": "active",
        "added_by": staff.get("username", "staff"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.batch_expiry.insert_one(batch)
    return {"success": True, "batch_id": batch_id}

@router.get("/inventory/batch-expiry")
async def get_batch_expiry(medicine_id: Optional[str] = None, days_ahead: int = 90, staff=Depends(get_staff_user)):
    """Get batch expiry data. Shows expiring-soon items if no medicine_id given."""
    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
    query = {"status": "active"}
    if medicine_id:
        query["medicine_id"] = medicine_id
    else:
        query["expiry_date"] = {"$lte": cutoff}
    batches = await db.batch_expiry.find(query, {"_id": 0}).sort("expiry_date", 1).to_list(200)
    expired_count = sum(1 for b in batches if b["expiry_date"] < datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    expiring_soon = sum(1 for b in batches if b["expiry_date"] >= datetime.now(timezone.utc).strftime("%Y-%m-%d") and b["expiry_date"] <= cutoff)
    return {"batches": batches, "expired_count": expired_count, "expiring_soon": expiring_soon, "total": len(batches)}

@router.put("/inventory/batch-expiry/{batch_id}")
async def update_batch(batch_id: str, quantity: int = 0, status: str = "active", staff=Depends(get_staff_user)):
    """Update batch quantity or mark as disposed"""
    update = {"remaining_quantity": quantity, "status": status, "updated_at": datetime.now(timezone.utc).isoformat()}
    result = await db.batch_expiry.update_one({"batch_id": batch_id}, {"$set": update})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Batch not found")
    return {"success": True}


# ============ Bulk Price Updates ============

class BulkPriceUpdate(BaseModel):
    updates: List[dict]  # [{"medicine_id": "...", "mrp": 100, "sale_price": 90}, ...]

@router.post("/inventory/bulk-price-update")
async def bulk_price_update(data: BulkPriceUpdate, staff=Depends(get_staff_user)):
    """Bulk update prices for multiple medicines at once"""
    role = staff.get("role", "")
    if role not in ["super_admin", "admin", "pharmacist"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    updated = 0
    errors = []
    for item in data.updates:
        mid = item.get("medicine_id")
        if not mid:
            errors.append({"medicine_id": mid, "error": "Missing medicine_id"})
            continue
        update_fields = {}
        if "mrp" in item:
            update_fields["mrp"] = item["mrp"]
        if "sale_price" in item:
            update_fields["sale_price"] = item["sale_price"]
        if "discount_percent" in item:
            update_fields["discount_percent"] = item["discount_percent"]
        if "stock" in item:
            update_fields["stock"] = item["stock"]
        if not update_fields:
            continue
        update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        update_fields["updated_by"] = staff.get("username", "admin")
        result = await db.trusted_formulary.update_one({"id": mid}, {"$set": update_fields})
        if result.modified_count == 0:
            result = await db.pharmacy_medicines.update_one({"id": mid}, {"$set": update_fields})
        if result.modified_count > 0:
            updated += 1
        else:
            errors.append({"medicine_id": mid, "error": "Not found"})
    return {"success": True, "updated": updated, "errors": errors, "total": len(data.updates)}


# ============ Inventory Stock Summary (Admin Dashboard) ============

@router.get("/inventory/stock-summary")
async def get_stock_summary(staff=Depends(get_staff_user)):
    """Get overall stock summary for admin dashboard"""
    try:
        total_medicines = await db.trusted_formulary.count_documents({})
        low_stock = await db.trusted_formulary.count_documents({"stock": {"$gt": 0, "$lte": 10}})
        out_of_stock = await db.trusted_formulary.count_documents({"stock": 0})
        in_stock = total_medicines - out_of_stock

        # Get recently updated
        recent = await db.trusted_formulary.find(
            {"updated_at": {"$exists": True}}, {"_id": 0, "id": 1, "name": 1, "stock": 1, "mrp": 1, "updated_at": 1}
        ).sort("updated_at", -1).limit(10).to_list(10)

        # Get batch expiry summary
        from datetime import timedelta
        cutoff_30 = (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d")
        cutoff_90 = (datetime.now(timezone.utc) + timedelta(days=90)).strftime("%Y-%m-%d")
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        expired = await db.batch_expiry.count_documents({"expiry_date": {"$lt": today}, "status": "active"})
        expiring_30 = await db.batch_expiry.count_documents({"expiry_date": {"$gte": today, "$lte": cutoff_30}, "status": "active"})
        expiring_90 = await db.batch_expiry.count_documents({"expiry_date": {"$gte": today, "$lte": cutoff_90}, "status": "active"})

        return {
            "success": True,
            "pharmacy": {
                "total": total_medicines, "in_stock": in_stock, "low_stock": low_stock, "out_of_stock": out_of_stock,
            },
            "batch_expiry": {
                "expired": expired, "expiring_30_days": expiring_30, "expiring_90_days": expiring_90,
            },
            "recently_updated": recent,
        }
    except Exception as e:
        logger.error(f"Stock summary error: {e}")
        return {"success": True, "pharmacy": {"total": 0, "in_stock": 0, "low_stock": 0, "out_of_stock": 0}, "batch_expiry": {"expired": 0, "expiring_30_days": 0, "expiring_90_days": 0}, "recently_updated": []}
