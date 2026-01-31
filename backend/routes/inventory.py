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
    image_url: Optional[str] = None
    mrp: float
    discount_percent: Optional[float] = 0
    sale_price: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    stock: Optional[int] = 0
    unit: Optional[str] = "strip"

class MedicineUpdate(BaseModel):
    name: Optional[str] = None
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
    limit: int = 50,
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
async def get_pharmacy_inventory(staff = Depends(get_staff_user)):
    """Get all medicines in pharmacy inventory - combines pharmacy_inventory and medicines_catalog"""
    try:
        medicines = []
        
        # Get from pharmacy_inventory (staff-added medicines)
        staff_medicines = await db.pharmacy_inventory.find({}).to_list(10000)
        for med in staff_medicines:
            med['id'] = str(med.pop('_id'))
            med['source'] = 'staff'
            medicines.append(med)
        
        # Get from medicines_catalog (pre-loaded medicines)
        catalog_medicines = await db.medicines_catalog.find({'active': {'$ne': False}}).to_list(10000)
        for med in catalog_medicines:
            med['_id'] = str(med.get('_id', ''))
            medicines.append({
                'id': med.get('id') or med['_id'],
                'name': med.get('name', ''),
                'image_url': med.get('image') or med.get('image_url', ''),
                'mrp': med.get('price') or med.get('mrp', 0),
                'discount_percent': med.get('discount_percent', 0),
                'sale_price': med.get('sale_price') or med.get('price') or med.get('mrp', 0),
                'category': med.get('category', ''),
                'description': med.get('description', ''),
                'stock': med.get('stock', 0),
                'unit': med.get('unit') or med.get('form', 'strip'),
                'source': 'catalog'
            })
        
        return {"medicines": medicines, "total": len(medicines)}
    except Exception as e:
        logger.error(f"Failed to get pharmacy inventory: {e}")
        raise HTTPException(status_code=500, detail="Failed to load inventory")

@router.post("/pharmacy/inventory")
async def create_medicine(medicine: MedicineCreate, staff = Depends(get_staff_user)):
    """Add a new medicine to inventory"""
    try:
        # Calculate sale price if not provided
        sale_price = medicine.sale_price
        if sale_price is None:
            sale_price = medicine.mrp - (medicine.mrp * (medicine.discount_percent or 0) / 100)
        
        doc = {
            "id": str(uuid.uuid4()),
            "name": medicine.name,
            "image_url": medicine.image_url,
            "mrp": medicine.mrp,
            "discount_percent": medicine.discount_percent or 0,
            "sale_price": round(sale_price, 2),
            "category": medicine.category,
            "description": medicine.description,
            "stock": medicine.stock or 0,
            "unit": medicine.unit or "strip",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": staff.get("username", "staff")
        }
        
        await db.pharmacy_inventory.insert_one(doc)
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
