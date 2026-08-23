"""
Phase 4 - Market Leader Features
1. Prescription Photo Upload
2. Family Profiles
3. Clinic-to-Home Continuity (post-visit recommendations)
4. Medicine Stock Status
5. Subscription Health Plans
"""

import os
import uuid
import base64
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Phase4-MarketLeader"])

db = None

def set_db(database):
    global db
    db = database


# ============ 1. PRESCRIPTION PHOTO UPLOAD ============

@router.post("/pharmacy/upload-prescription")
async def upload_prescription(
    phone: str = Form(...),
    patient_name: str = Form(""),
    notes: str = Form(""),
    file: UploadFile = File(...)
):
    """Upload a prescription photo for pharmacy order"""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files allowed")
    
    # Read file and save
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    
    # Save to uploads directory
    upload_dir = "/app/backend/uploads/prescriptions"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_ext = file.filename.split(".")[-1] if file.filename else "jpg"
    file_id = str(uuid.uuid4())[:8]
    filename = f"rx_{file_id}.{file_ext}"
    filepath = os.path.join(upload_dir, filename)
    
    with open(filepath, "wb") as f:
        f.write(contents)
    
    # Store record in DB
    record = {
        "id": file_id,
        "phone": phone[-10:],
        "patient_name": patient_name,
        "notes": notes,
        "filename": filename,
        "file_url": f"/api/uploads/prescriptions/{filename}",
        "status": "pending",  # pending, processing, completed, rejected
        "created_at": datetime.now(timezone.utc).isoformat(),
        "items_extracted": [],
        "staff_notes": ""
    }
    
    await db.prescriptions.insert_one(record)
    record.pop("_id", None)
    
    return {
        "success": True,
        "prescription_id": file_id,
        "message": "Prescription uploaded. Our pharmacist will review and prepare your order.",
        "status": "pending"
    }


@router.get("/pharmacy/prescriptions/{phone}")
async def get_prescriptions(phone: str):
    """Get prescription upload history for a phone number"""
    records = await db.prescriptions.find(
        {"phone": phone[-10:]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    return {"prescriptions": records}


# ============ 2. FAMILY PROFILES ============

class FamilyMember(BaseModel):
    name: str
    relation: str  # self, spouse, child, parent, sibling, other
    age: Optional[int] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[List[str]] = []
    conditions: Optional[List[str]] = []  # diabetes, hypertension, etc.

@router.post("/family/members")
async def add_family_member(member: FamilyMember, phone: str = ""):
    """Add a family member profile (max 5 per patient)"""
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number required")
    
    # Enforce max 5 members
    count = await db.family_members.count_documents({"owner_phone": phone[-10:]})
    if count >= 5:
        raise HTTPException(status_code=400, detail="Maximum 5 family members allowed. Delete one to add a new member.")
    
    member_id = str(uuid.uuid4())[:8]
    doc = {
        "id": member_id,
        "owner_phone": phone[-10:],
        **member.dict(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.family_members.insert_one(doc)
    doc.pop("_id", None)
    return {"success": True, "member": doc}


@router.get("/family/members/{phone}")
async def get_family_members(phone: str):
    """Get all family members for a phone number"""
    members = await db.family_members.find(
        {"owner_phone": phone[-10:]},
        {"_id": 0}
    ).to_list(20)
    return {"members": members}


@router.delete("/family/members/{member_id}")
async def delete_family_member(member_id: str):
    """Delete a family member"""
    result = await db.family_members.delete_one({"id": member_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"success": True}



# ============ SAVED ADDRESSES ============

class SavedAddress(BaseModel):
    label: str  # home, work, other
    full_address: str
    landmark: Optional[str] = ""
    pincode: str
    city: Optional[str] = ""
    state: Optional[str] = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_default: Optional[bool] = False

@router.post("/addresses")
async def save_address(address: SavedAddress, phone: str = ""):
    """Save a delivery address for a patient"""
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number required")
    
    addr_id = str(uuid.uuid4())[:8]
    doc = {
        "id": addr_id,
        "owner_phone": phone[-10:],
        **address.dict(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # If this is default, unset other defaults
    if address.is_default:
        await db.saved_addresses.update_many(
            {"owner_phone": phone[-10:]},
            {"$set": {"is_default": False}}
        )
    
    await db.saved_addresses.insert_one(doc)
    doc.pop("_id", None)
    return {"success": True, "address": doc}

@router.get("/addresses/{phone}")
async def get_saved_addresses(phone: str):
    """Get all saved addresses for a phone number"""
    addresses = await db.saved_addresses.find(
        {"owner_phone": phone[-10:]},
        {"_id": 0}
    ).to_list(20)
    return {"addresses": addresses}

@router.delete("/addresses/{address_id}")
async def delete_address(address_id: str):
    """Delete a saved address"""
    result = await db.saved_addresses.delete_one({"id": address_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Address not found")
    return {"success": True}

@router.put("/addresses/{address_id}/default")
async def set_default_address(address_id: str, phone: str = ""):
    """Set an address as default"""
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number required")
    await db.saved_addresses.update_many(
        {"owner_phone": phone[-10:]},
        {"$set": {"is_default": False}}
    )
    await db.saved_addresses.update_one(
        {"id": address_id},
        {"$set": {"is_default": True}}
    )
    return {"success": True}

# ============ HEALTH STATS ============

@router.get("/health-stats/{phone}")
async def get_health_stats(phone: str):
    """Get health parameter stats for a patient from Reneu wellness data"""
    clean = phone[-10:]
    
    # Check if custom stats exist
    stats = await db.health_stats.find_one({"phone": clean}, {"_id": 0})
    if stats:
        return stats
    
    # Return default stats for new users
    return {
        "phone": clean,
        "metrics": [
            {"key": "sleep", "label": "Sleep", "value": 7.2, "unit": "hrs", "target": 8, "trend": "up", "color": "#818cf8"},
            {"key": "steps", "label": "Steps", "value": 6540, "unit": "", "target": 10000, "trend": "up", "color": "#14b8a6"},
            {"key": "heart_rate", "label": "Heart Rate", "value": 72, "unit": "bpm", "target": 80, "trend": "stable", "color": "#ef4444"},
            {"key": "bmi", "label": "BMI", "value": 23.5, "unit": "", "target": 25, "trend": "stable", "color": "#f59e0b"},
            {"key": "water", "label": "Water", "value": 2.1, "unit": "L", "target": 3, "trend": "down", "color": "#3b82f6"},
            {"key": "calories", "label": "Calories", "value": 1850, "unit": "kcal", "target": 2000, "trend": "up", "color": "#22c55e"}
        ]
    }

# ============ REORDER ============

@router.get("/recent-orders/{phone}")
async def get_recent_orders(phone: str):
    """Get recent orders for quick reorder"""
    clean = phone[-10:]
    
    pharma = await db.pharmacy_orders.find(
        {"phone": clean},
        {"_id": 0}
    ).sort("created_at", -1).to_list(5)
    
    lab_tests = await db.diagnostic_orders.find(
        {"phone": clean},
        {"_id": 0}
    ).sort("created_at", -1).to_list(5)
    
    return {"pharmacy_orders": pharma, "lab_tests": lab_tests}


# ============ FAVORITES ============

class FavoriteItem(BaseModel):
    item_type: str  # "medicine" or "test"
    name: str
    price: Optional[float] = 0
    description: Optional[str] = ""

@router.post("/favorites")
async def add_favorite(fav: FavoriteItem, phone: str = ""):
    """Save a medicine or test as favorite"""
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number required")
    
    clean = phone[-10:]
    existing = await db.favorites.find_one({"owner_phone": clean, "name": fav.name, "item_type": fav.item_type})
    if existing:
        return {"success": True, "message": "Already in favorites", "favorite": {k: v for k, v in existing.items() if k != "_id"}}
    
    fav_id = str(uuid.uuid4())[:8]
    doc = {
        "id": fav_id,
        "owner_phone": clean,
        **fav.dict(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.favorites.insert_one(doc)
    doc.pop("_id", None)
    return {"success": True, "favorite": doc}

@router.get("/favorites/{phone}")
async def get_favorites(phone: str, item_type: Optional[str] = None):
    """Get all favorites for a phone number"""
    query = {"owner_phone": phone[-10:]}
    if item_type:
        query["item_type"] = item_type
    favs = await db.favorites.find(query, {"_id": 0}).to_list(50)
    return {"favorites": favs}

@router.delete("/favorites/{fav_id}")
async def remove_favorite(fav_id: str):
    """Remove a favorite"""
    result = await db.favorites.delete_one({"id": fav_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Favorite not found")
    return {"success": True}


# ============ 3. CLINIC-TO-HOME CONTINUITY ============

@router.get("/appointments/{appointment_id}/recommendations")
async def get_post_visit_recommendations(appointment_id: str):
    """Get medicine + lab test recommendations after a doctor visit"""
    appointment = await db.appointments.find_one(
        {"$or": [{"id": appointment_id}, {"booking_id": appointment_id}]},
        {"_id": 0}
    )
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    doctor = appointment.get("doctor", "")
    recommendations = {
        "medicines": [],
        "lab_tests": [],
        "follow_up": appointment.get("follow_up_date"),
        "doctor_notes": appointment.get("doctor_notes", "")
    }
    
    # Check if doctor added specific recommendations
    if appointment.get("prescribed_medicines"):
        recommendations["medicines"] = appointment["prescribed_medicines"]
    if appointment.get("recommended_tests"):
        recommendations["lab_tests"] = appointment["recommended_tests"]
    
    # Default recommendations based on appointment type/doctor specialty
    if not recommendations["medicines"] and not recommendations["lab_tests"]:
        if "Vikas" in doctor:  # Diabetologist
            recommendations["lab_tests"] = [
                {"name": "HbA1c", "price": 550, "description": "3-month blood sugar average"},
                {"name": "Fasting Blood Sugar", "price": 150, "description": "Blood glucose level"},
                {"name": "Lipid Profile", "price": 450, "description": "Cholesterol check"}
            ]
            recommendations["medicines"] = [
                {"name": "Glucometer Strips (50)", "price": 650, "in_stock": True},
                {"name": "Vitamin D3 60K", "price": 120, "in_stock": True}
            ]
        elif "Neha" in doctor:  # OBGYN
            recommendations["lab_tests"] = [
                {"name": "Thyroid Profile", "price": 450, "description": "TSH, T3, T4"},
                {"name": "Complete Blood Count", "price": 250, "description": "CBC with differential"},
                {"name": "Vitamin B12", "price": 550, "description": "B12 level check"}
            ]
            recommendations["medicines"] = [
                {"name": "Folic Acid 5mg", "price": 45, "in_stock": True},
                {"name": "Iron + Folic Acid", "price": 85, "in_stock": True}
            ]
    
    return recommendations


# ============ 4. MEDICINE STOCK STATUS ============

@router.get("/pharmacy/stock-status")
async def get_stock_status(search: str = ""):
    """Get stock status for medicines"""
    query = {}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    
    medicines = await db.medicine_inventory.find(
        query,
        {"_id": 0, "name": 1, "price": 1, "stock_status": 1, "stock_quantity": 1, "available_in": 1}
    ).to_list(50)
    
    # If no stock data, return default (in_stock)
    if not medicines:
        return {"medicines": [], "message": "Search for a specific medicine"}
    
    return {"medicines": medicines}


@router.post("/pharmacy/update-stock")
async def update_stock_status(
    medicine_name: str = "",
    stock_status: str = "in_stock",
    stock_quantity: int = 0,
    available_in: str = ""
):
    """Staff: Update medicine stock status"""
    if not medicine_name:
        raise HTTPException(status_code=400, detail="Medicine name required")
    
    await db.medicine_inventory.update_one(
        {"name": medicine_name},
        {"$set": {
            "stock_status": stock_status,
            "stock_quantity": stock_quantity,
            "available_in": available_in,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"success": True}


# ============ 5. SUBSCRIPTION HEALTH PLANS ============

HEALTH_PLANS = [
    {
        "id": "diabetes-care",
        "name": "Diabetes Care",
        "price": 499,
        "billing": "monthly",
        "description": "Complete diabetes management",
        "includes": [
            "1 Doctor Consultation/month",
            "Monthly HbA1c Test",
            "Medicine Delivery (at cost)",
            "WhatsApp Health Coach",
            "Diet Plan"
        ],
        "doctor": "Dr. Vikas Jha",
        "popular": True,
        "color": "from-teal-500 to-cyan-500"
    },
    {
        "id": "womens-health",
        "name": "Women's Health",
        "price": 599,
        "billing": "monthly",
        "description": "Comprehensive women's care",
        "includes": [
            "1 OBGYN Consultation/month",
            "Quarterly Thyroid Test",
            "Medicine Delivery (at cost)",
            "Period Tracker Integration",
            "Nutrition Guidance"
        ],
        "doctor": "Dr. Neha Patel",
        "color": "from-pink-500 to-rose-500"
    },
    {
        "id": "family-wellness",
        "name": "Family Wellness",
        "price": 999,
        "billing": "monthly",
        "description": "Health coverage for the whole family",
        "includes": [
            "2 Doctor Consultations/month",
            "Annual Health Checkup (4 members)",
            "Priority Appointment Booking",
            "Medicine Delivery (free)",
            "24/7 WhatsApp Support"
        ],
        "doctor": "All Doctors",
        "best_value": True,
        "color": "from-violet-500 to-purple-500"
    }
]

@router.get("/health-plans")
async def get_health_plans():
    """Get available subscription health plans"""
    return {"plans": HEALTH_PLANS}


class HealthPlanSubscription(BaseModel):
    plan_id: str
    phone: str
    patient_name: str
    family_members: Optional[List[str]] = []
    cashfree_order_id: Optional[str] = None

@router.post("/health-plans/subscribe")
async def subscribe_health_plan(sub: HealthPlanSubscription):
    """Subscribe to a health plan"""
    plan = next((p for p in HEALTH_PLANS if p["id"] == sub.plan_id), None)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    subscription_id = str(uuid.uuid4())[:8]
    doc = {
        "id": subscription_id,
        "plan_id": sub.plan_id,
        "plan_name": plan["name"],
        "price": plan["price"],
        "billing": plan["billing"],
        "phone": sub.phone[-10:],
        "patient_name": sub.patient_name,
        "family_members": sub.family_members,
        "status": "pending" if sub.cashfree_order_id else "active",
        "cashfree_order_id": sub.cashfree_order_id,
        "start_date": datetime.now(timezone.utc).isoformat(),
        "next_billing": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.health_plan_subscriptions.insert_one(doc)
    doc.pop("_id", None)
    
    return {
        "success": True,
        "subscription": doc,
        "message": f"Subscribed to {plan['name']}! Your first consultation can be booked immediately."
    }


@router.get("/health-plans/my-subscriptions/{phone}")
async def get_my_subscriptions(phone: str):
    """Get user's health plan subscriptions"""
    subs = await db.health_plan_subscriptions.find(
        {"phone": phone[-10:], "status": {"$in": ["active", "pending"]}},
        {"_id": 0}
    ).to_list(10)
    return {"subscriptions": subs}


# ============ 6. UNIFIED CHECKOUT ============

class UnifiedCheckoutRequest(BaseModel):
    customer: dict
    address: dict
    payment_method: str = "pay_later"
    items: list
    subtotal: float = 0
    discount: float = 0
    delivery_fee: float = 0
    loyalty_points_used: int = 0
    loyalty_discount: float = 0
    wallet_discount: float = 0
    total: float = 0
    order_type: str = "unified"

@router.post("/checkout/unified")
async def unified_checkout(req: UnifiedCheckoutRequest):
    """Process unified checkout for pharmacy, lab, and consultation items"""
    order_id = f"UC-{str(uuid.uuid4())[:8].upper()}"
    
    pharmacy_items = [i for i in req.items if i.get("type") == "pharmacy"]
    lab_items = [i for i in req.items if i.get("type") == "lab"]
    consultation_items = [i for i in req.items if i.get("type") == "consultation"]
    
    sub_orders = []
    
    if pharmacy_items:
        from utils.id_generator import generate_6digit_id
        ph_id = await generate_6digit_id(db, "pharmacy_orders", "id")
        ph_doc = {
            "id": ph_id,
            "unified_order_id": order_id,
            "type": "pharmacy",
            "items": pharmacy_items,
            "customer": req.customer,
            "address": req.address,
            "payment_method": req.payment_method,
            "status": "confirmed",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.pharmacy_orders.insert_one(ph_doc)
        ph_doc.pop("_id", None)
        sub_orders.append({"type": "pharmacy", "order_id": ph_id, "items_count": len(pharmacy_items)})
    
    if lab_items:
        from utils.id_generator import generate_6digit_id
        lab_id = await generate_6digit_id(db, "lab_orders", "id")
        lab_doc = {
            "id": lab_id,
            "unified_order_id": order_id,
            "type": "lab",
            "items": lab_items,
            "customer": req.customer,
            "address": req.address,
            "payment_method": req.payment_method,
            "status": "confirmed",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.lab_orders.insert_one(lab_doc)
        lab_doc.pop("_id", None)
        sub_orders.append({"type": "lab", "order_id": lab_id, "items_count": len(lab_items)})
    
    if consultation_items:
        con_id = f"CN-{str(uuid.uuid4())[:6].upper()}"
        con_doc = {
            "id": con_id,
            "unified_order_id": order_id,
            "type": "consultation",
            "items": consultation_items,
            "customer": req.customer,
            "status": "confirmed",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.consultation_orders.insert_one(con_doc)
        con_doc.pop("_id", None)
        sub_orders.append({"type": "consultation", "order_id": con_id, "items_count": len(consultation_items)})
    
    unified_doc = {
        "id": order_id,
        "order_type": req.order_type,
        "customer": req.customer,
        "address": req.address,
        "payment_method": req.payment_method,
        "items_count": len(req.items),
        "subtotal": req.subtotal,
        "discount": req.discount,
        "delivery_fee": req.delivery_fee,
        "loyalty_discount": req.loyalty_discount,
        "wallet_discount": req.wallet_discount,
        "total": req.total,
        "sub_orders": sub_orders,
        "status": "confirmed",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.unified_orders.insert_one(unified_doc)
    unified_doc.pop("_id", None)
    
    return {
        "success": True,
        "order_id": order_id,
        "booking_id": order_id,
        "sub_orders": sub_orders,
        "total": req.total,
        "message": f"Order placed successfully! {len(sub_orders)} service(s) confirmed."
    }


# ============ 6.5. PHARMACY AND LAB ORDER ENDPOINTS ============

class PharmacyOrderRequest(BaseModel):
    customer: dict
    address: dict
    payment_method: str
    items: List[dict]
    subtotal: Optional[float] = 0
    discount: Optional[float] = 0
    delivery_fee: Optional[float] = 0
    loyalty_points_used: Optional[int] = 0
    loyalty_discount: Optional[float] = 0
    wallet_discount: Optional[float] = 0
    total: Optional[float] = 0
    order_type: Optional[str] = "pharmacy"


class LabBookingRequest(BaseModel):
    customer: dict
    address: dict
    payment_method: str
    items: List[dict]
    subtotal: Optional[float] = 0
    discount: Optional[float] = 0
    delivery_fee: Optional[float] = 0
    loyalty_points_used: Optional[int] = 0
    loyalty_discount: Optional[float] = 0
    wallet_discount: Optional[float] = 0
    total: Optional[float] = 0
    order_type: Optional[str] = "lab"


@router.post("/pharmacy/order")
async def create_pharmacy_order(req: PharmacyOrderRequest):
    """Create pharmacy order from unified checkout"""
    from utils.booking_utils import generate_booking_id
    order_id = await generate_booking_id(service="orange", source="web", db_instance=db)
    
    # Check if any item requires prescription → needs doctor approval
    has_rx_items = False
    for item in req.items:
        if item.get("prescription_required") or item.get("requires_rx"):
            has_rx_items = True
            break
    
    # If not explicitly flagged, check the DB
    if not has_rx_items:
        for item in req.items:
            med = await db.medicines.find_one(
                {"name": {"$regex": f"^{item.get('name', '')}$", "$options": "i"}},
                {"_id": 0, "prescription_required": 1}
            )
            if med and med.get("prescription_required"):
                has_rx_items = True
                break
    
    initial_status = "pending_doctor_approval" if has_rx_items else "confirmed"
    
    order_doc = {
        "id": order_id,
        "type": "pharmacy",
        "items": req.items,
        "customer": req.customer,
        "address": req.address,
        "payment_method": req.payment_method,
        "subtotal": req.subtotal,
        "discount": req.discount,
        "delivery_fee": req.delivery_fee,
        "loyalty_discount": req.loyalty_discount,
        "wallet_discount": req.wallet_discount,
        "total": req.total,
        "status": initial_status,
        "has_rx_items": has_rx_items,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.pharmacy_orders.insert_one(order_doc)
    order_doc.pop("_id", None)
    
    message = "Order requires doctor approval before fulfillment" if has_rx_items else "Pharmacy order placed successfully!"
    
    return {
        "success": True,
        "order_id": order_id,
        "booking_id": order_id,
        "status": initial_status,
        "total": req.total,
        "requires_approval": has_rx_items,
        "message": message
    }


@router.post("/lab/booking")
async def create_lab_booking(req: LabBookingRequest):
    """Create lab booking from unified checkout"""
    from utils.booking_utils import generate_booking_id
    booking_id = await generate_booking_id(service="mango", source="web", db_instance=db)
    
    booking_doc = {
        "id": booking_id,
        "type": "lab",
        "items": req.items,
        "customer": req.customer,
        "address": req.address,
        "payment_method": req.payment_method,
        "subtotal": req.subtotal,
        "discount": req.discount,
        "delivery_fee": req.delivery_fee,
        "loyalty_discount": req.loyalty_discount,
        "wallet_discount": req.wallet_discount,
        "total": req.total,
        "status": "confirmed",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.lab_orders.insert_one(booking_doc)
    booking_doc.pop("_id", None)
    
    return {
        "success": True,
        "order_id": booking_id,
        "booking_id": booking_id,
        "status": "confirmed",
        "total": req.total,
        "message": "Lab booking confirmed!"
    }


# ============ 7. POST-VISIT FLOW AUTOMATION ============

SPECIALTY_RECOMMENDATIONS = {
    "gynecology": {
        "medicines": [
            {"name": "Folic Acid 5mg", "price": 45, "reason": "Recommended supplement"},
            {"name": "Iron + Calcium Tablets", "price": 120, "reason": "Post-visit supplement"},
        ],
        "lab_tests": [
            {"name": "Complete Blood Count", "price": 350, "reason": "Routine monitoring"},
            {"name": "Thyroid Profile", "price": 450, "reason": "Hormonal check"},
        ]
    },
    "diabetes": {
        "medicines": [
            {"name": "Glucometer Strips (50)", "price": 650, "reason": "Blood sugar monitoring"},
            {"name": "Metformin 500mg", "price": 85, "reason": "Diabetes management"},
        ],
        "lab_tests": [
            {"name": "HbA1c Test", "price": 400, "reason": "3-month sugar average"},
            {"name": "Kidney Function Test", "price": 550, "reason": "Diabetes complication check"},
        ]
    },
    "general": {
        "medicines": [
            {"name": "Multivitamin Daily", "price": 180, "reason": "General wellness"},
        ],
        "lab_tests": [
            {"name": "Complete Health Checkup", "price": 999, "reason": "Annual screening"},
        ]
    }
}

class CompleteAppointmentRequest(BaseModel):
    notes: str = ""
    prescription: str = ""
    follow_up_days: int = 30

@router.post("/appointments/{appointment_id}/complete")
async def complete_appointment(appointment_id: str, req: CompleteAppointmentRequest):
    """Mark appointment as complete and auto-generate post-visit recommendations"""
    appointment = await db.appointments.find_one(
        {"$or": [{"id": appointment_id}, {"booking_id": appointment_id}]},
        {"_id": 0}
    )
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    specialty = "general"
    doctor_name = appointment.get("doctor", "").lower()
    clinic_name = appointment.get("clinic", "").lower()
    reason = appointment.get("reason", "").lower()
    
    if any(k in doctor_name + clinic_name + reason for k in ["gyn", "obst", "women", "pregn"]):
        specialty = "gynecology"
    elif any(k in doctor_name + clinic_name + reason for k in ["diab", "sugar", "endo"]):
        specialty = "diabetes"
    
    recs = SPECIALTY_RECOMMENDATIONS.get(specialty, SPECIALTY_RECOMMENDATIONS["general"])
    
    follow_up_date = (datetime.now(timezone.utc) + timedelta(days=req.follow_up_days)).isoformat()
    
    await db.appointments.update_one(
        {"$or": [{"id": appointment_id}, {"booking_id": appointment_id}]},
        {"$set": {
            "status": "Completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "notes": req.notes,
            "prescription": req.prescription,
            "follow_up_date": follow_up_date,
            "recommendations_generated": True
        }}
    )
    
    rec_doc = {
        "id": str(uuid.uuid4())[:8],
        "appointment_id": appointment_id,
        "patient_phone": appointment.get("patient_phone") or appointment.get("phone"),
        "doctor": appointment.get("doctor"),
        "specialty": specialty,
        "medicines": recs["medicines"],
        "lab_tests": recs["lab_tests"],
        "follow_up_date": follow_up_date,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.post_visit_recommendations.insert_one(rec_doc)
    rec_doc.pop("_id", None)
    
    return {
        "success": True,
        "message": "Appointment completed. Recommendations generated.",
        "recommendations": rec_doc,
        "follow_up_date": follow_up_date
    }


@router.get("/post-visit/pending/{phone}")
async def get_pending_recommendations(phone: str):
    """Get pending post-visit recommendations for a patient"""
    phone = phone[-10:]
    recs = await db.post_visit_recommendations.find(
        {"patient_phone": {"$regex": phone}, "status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(5)
    return {"recommendations": recs}


@router.post("/post-visit/{rec_id}/dismiss")
async def dismiss_recommendation(rec_id: str):
    """Dismiss a post-visit recommendation"""
    await db.post_visit_recommendations.update_one(
        {"id": rec_id},
        {"$set": {"status": "dismissed"}}
    )
    return {"success": True}



# ============ 8. MEMBERSHIP APPLICATION ============

class MembershipApplyRequest(BaseModel):
    name: str
    email: str
    phone: str
    plan: str = "premium"

@router.post("/membership/apply")
async def apply_membership(req: MembershipApplyRequest):
    """Submit membership application after WhatsApp OTP verification"""
    membership_id = f"NM-{str(uuid.uuid4())[:6].upper()}"
    doc = {
        "id": membership_id,
        "name": req.name,
        "email": req.email,
        "phone": req.phone[-10:],
        "plan": req.plan,
        "status": "pending_payment",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.memberships.insert_one(doc)
    doc.pop("_id", None)
    return {"success": True, "membership_id": membership_id, "status": "pending_payment"}
