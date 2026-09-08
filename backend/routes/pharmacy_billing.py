"""
Orange Pharmacy Billing & Management API
POS billing, customer management, reports, CSV import, barcode generation
"""
from fastapi import APIRouter, HTTPException, Depends, Header, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import jwt
import uuid
import logging
import csv
import io
import json
import math

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pharmacy-billing", tags=["Pharmacy Billing"])

db = None
JWT_SECRET = None
JWT_ALGORITHM = "HS256"


def set_db(database):
    global db
    db = database


def set_jwt_config(secret, algorithm="HS256"):
    global JWT_SECRET, JWT_ALGORITHM
    JWT_SECRET = secret
    JWT_ALGORITHM = algorithm


async def verify_staff(authorization: str = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(401, "Auth required")
    token = authorization.split(' ')[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        role = payload.get('role', '')
        dept = payload.get('department', '')
        if role in ['pharmacy_staff', 'admin', 'super_admin'] or 'pharmacy' in role.lower() or 'pharmacy' in dept.lower() or 'orange' in role.lower():
            return payload
        raise HTTPException(403, "Pharmacy access required")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


def ist_now():
    return datetime.now(timezone(timedelta(hours=5, minutes=30)))


def ist_date_str():
    return ist_now().strftime("%Y-%m-%d")


# ============ Models ============

class BillItem(BaseModel):
    medicine_id: str
    name: str
    batch_no: Optional[str] = ""
    expiry: Optional[str] = ""
    hsn_code: Optional[str] = ""
    quantity: int = 1
    mrp: float
    discount_percent: float = 0
    gst_percent: float = 0


class CreateBill(BaseModel):
    customer_name: str = "Walk-in"
    customer_phone: str = ""
    items: List[BillItem]
    payment_mode: str = "cash"
    paid_amount: Optional[float] = None
    notes: Optional[str] = ""


class CustomerCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = ""
    address: Optional[str] = ""


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None


class PaymentRecord(BaseModel):
    amount: float
    payment_mode: str = "cash"
    notes: Optional[str] = ""


# ============ BILLING / POS ============

@router.post("/bills")
async def create_bill(data: CreateBill, staff=Depends(verify_staff)):
    """Create a new bill (POS counter sale)"""
    if not data.items:
        raise HTTPException(400, "At least one item required")

    today = ist_date_str()
    count = await db.pharmacy_bills.count_documents({"date": today})
    bill_number = f"ORG-{today.replace('-', '')}-{(count + 1):04d}"

    items = []
    subtotal = 0
    total_discount = 0
    total_gst = 0

    for item in data.items:
        unit_price = round(item.mrp * (1 - item.discount_percent / 100), 2)
        line_total = round(unit_price * item.quantity, 2)
        gst_amount = round(line_total * item.gst_percent / 100, 2)
        discount_amount = round((item.mrp - unit_price) * item.quantity, 2)

        items.append({
            "medicine_id": item.medicine_id,
            "name": item.name,
            "batch_no": item.batch_no,
            "expiry": item.expiry,
            "hsn_code": item.hsn_code,
            "quantity": item.quantity,
            "mrp": item.mrp,
            "discount_percent": item.discount_percent,
            "unit_price": unit_price,
            "gst_percent": item.gst_percent,
            "gst_amount": gst_amount,
            "line_total": line_total,
        })

        subtotal += line_total
        total_discount += discount_amount
        total_gst += gst_amount

        # Deduct stock
        await db.medicines.update_one(
            {"id": item.medicine_id, "stock_quantity": {"$gte": item.quantity}},
            {"$inc": {"stock_quantity": -item.quantity}}
        )

    grand_total = round(subtotal + total_gst, 2)
    paid = data.paid_amount if data.paid_amount is not None else grand_total
    due = round(grand_total - paid, 2)

    bill = {
        "id": str(uuid.uuid4()),
        "bill_number": bill_number,
        "date": today,
        "customer_name": data.customer_name,
        "customer_phone": data.customer_phone.strip(),
        "items": items,
        "item_count": len(items),
        "total_quantity": sum(i["quantity"] for i in items),
        "subtotal": round(subtotal, 2),
        "total_discount": round(total_discount, 2),
        "total_gst": round(total_gst, 2),
        "grand_total": grand_total,
        "paid_amount": round(paid, 2),
        "due_amount": max(due, 0),
        "payment_mode": data.payment_mode,
        "status": "paid" if due <= 0 else "partial" if paid > 0 else "credit",
        "notes": data.notes or "",
        "created_by": staff.get("name", "Staff"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.pharmacy_bills.insert_one(bill)
    bill.pop("_id", None)

    # Update customer record if phone provided
    if data.customer_phone.strip():
        phone = data.customer_phone.strip()
        await db.pharmacy_customers.update_one(
            {"phone": phone},
            {
                "$set": {"name": data.customer_name, "last_purchase": today, "updated_at": datetime.now(timezone.utc).isoformat()},
                "$inc": {"total_purchases": grand_total, "total_due": max(due, 0), "visit_count": 1},
                "$setOnInsert": {"id": str(uuid.uuid4()), "phone": phone, "email": "", "address": "", "created_at": datetime.now(timezone.utc).isoformat()},
            },
            upsert=True,
        )

    return {"success": True, "bill": bill}


@router.get("/bills")
async def list_bills(
    date: Optional[str] = None,
    status: Optional[str] = None,
    customer_phone: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 30,
    staff=Depends(verify_staff),
):
    query = {}
    if date:
        query["date"] = date
    if status:
        query["status"] = status
    if customer_phone:
        query["customer_phone"] = {"$regex": customer_phone}
    if search:
        query["$or"] = [
            {"bill_number": {"$regex": search, "$options": "i"}},
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"customer_phone": {"$regex": search}},
        ]

    total = await db.pharmacy_bills.count_documents(query)
    bills = await db.pharmacy_bills.find(query, {"_id": 0}).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)

    return {"bills": bills, "total": total, "page": page, "pages": math.ceil(total / limit) if total else 1}


@router.get("/bills/{bill_id}")
async def get_bill(bill_id: str, staff=Depends(verify_staff)):
    bill = await db.pharmacy_bills.find_one({"id": bill_id}, {"_id": 0})
    if not bill:
        raise HTTPException(404, "Bill not found")
    return bill


@router.post("/bills/{bill_id}/payment")
async def record_payment(bill_id: str, data: PaymentRecord, staff=Depends(verify_staff)):
    """Record a payment against a bill (for partial/credit bills)"""
    bill = await db.pharmacy_bills.find_one({"id": bill_id}, {"_id": 0})
    if not bill:
        raise HTTPException(404, "Bill not found")

    new_paid = round(bill.get("paid_amount", 0) + data.amount, 2)
    new_due = round(bill.get("grand_total", 0) - new_paid, 2)
    new_status = "paid" if new_due <= 0 else "partial"

    payment_entry = {
        "amount": data.amount,
        "mode": data.payment_mode,
        "notes": data.notes or "",
        "recorded_by": staff.get("name", "Staff"),
        "recorded_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.pharmacy_bills.update_one(
        {"id": bill_id},
        {
            "$set": {"paid_amount": new_paid, "due_amount": max(new_due, 0), "status": new_status},
            "$push": {"payments": payment_entry},
        },
    )

    # Update customer due
    if bill.get("customer_phone"):
        await db.pharmacy_customers.update_one(
            {"phone": bill["customer_phone"]},
            {"$inc": {"total_due": -data.amount}},
        )

    return {"success": True, "new_paid": new_paid, "new_due": max(new_due, 0), "status": new_status}


# ============ CUSTOMERS ============

@router.post("/customers")
async def create_customer(data: CustomerCreate, staff=Depends(verify_staff)):
    existing = await db.pharmacy_customers.find_one({"phone": data.phone}, {"_id": 0})
    if existing:
        raise HTTPException(400, "Customer with this phone already exists")

    customer = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "phone": data.phone,
        "email": data.email or "",
        "address": data.address or "",
        "total_purchases": 0,
        "total_due": 0,
        "visit_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.pharmacy_customers.insert_one(customer)
    customer.pop("_id", None)
    return {"success": True, "customer": customer}


@router.get("/customers")
async def list_customers(
    search: Optional[str] = None,
    has_dues: Optional[bool] = None,
    page: int = 1,
    limit: int = 30,
    staff=Depends(verify_staff),
):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search}},
        ]
    if has_dues:
        query["total_due"] = {"$gt": 0}

    total = await db.pharmacy_customers.count_documents(query)
    customers = await db.pharmacy_customers.find(query, {"_id": 0}).sort("updated_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)

    return {"customers": customers, "total": total, "page": page, "pages": math.ceil(total / limit) if total else 1}


@router.get("/customers/{customer_id}")
async def get_customer(customer_id: str, staff=Depends(verify_staff)):
    cust = await db.pharmacy_customers.find_one({"id": customer_id}, {"_id": 0})
    if not cust:
        raise HTTPException(404, "Customer not found")
    return cust


@router.put("/customers/{customer_id}")
async def update_customer(customer_id: str, data: CustomerUpdate, staff=Depends(verify_staff)):
    updates = {k: v for k, v in data.dict().items() if v is not None}
    if not updates:
        raise HTTPException(400, "Nothing to update")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.pharmacy_customers.update_one({"id": customer_id}, {"$set": updates})
    return {"success": True}


@router.get("/customers/lookup/{phone}")
async def lookup_customer(phone: str, staff=Depends(verify_staff)):
    """Quick lookup by phone for billing"""
    cust = await db.pharmacy_customers.find_one(
        {"phone": {"$regex": phone}}, {"_id": 0}
    )
    if not cust:
        return {"found": False}
    # Get recent bills
    recent_bills = await db.pharmacy_bills.find(
        {"customer_phone": phone}, {"_id": 0, "bill_number": 1, "date": 1, "grand_total": 1, "status": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    cust["recent_bills"] = recent_bills
    return {"found": True, "customer": cust}


@router.get("/customers/{customer_id}/history")
async def customer_purchase_history(customer_id: str, page: int = 1, limit: int = 20, staff=Depends(verify_staff)):
    cust = await db.pharmacy_customers.find_one({"id": customer_id}, {"_id": 0, "phone": 1})
    if not cust:
        raise HTTPException(404, "Customer not found")
    bills = await db.pharmacy_bills.find(
        {"customer_phone": cust["phone"]}, {"_id": 0}
    ).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    total = await db.pharmacy_bills.count_documents({"customer_phone": cust["phone"]})
    return {"bills": bills, "total": total, "page": page}


# ============ CSV IMPORT ============

@router.get("/csv-template")
async def download_csv_template(staff=Depends(verify_staff)):
    """Download CSV template for medicine import"""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "name", "generic_name", "manufacturer", "category", "form",
        "mrp", "purchase_price", "discount_percent", "stock_quantity",
        "batch_no", "expiry", "hsn_code", "barcode", "description"
    ])
    writer.writerow([
        "Paracetamol 500mg", "Paracetamol", "GSK", "Pain Relief", "Tablet",
        "25.50", "18.00", "10", "500",
        "B2026-001", "2027-06", "30049099", "8901234567890", "Pain and fever relief"
    ])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=medicine_import_template.csv"},
    )


@router.post("/csv-import")
async def import_csv(file: UploadFile = File(...), staff=Depends(verify_staff)):
    """Import medicines from CSV file (like LocalWell auto-fill)"""
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    imported = 0
    updated = 0
    errors = []

    for i, row in enumerate(reader):
        try:
            name = (row.get("name") or row.get("Name") or row.get("Medicine Name") or "").strip()
            if not name:
                errors.append(f"Row {i+2}: Missing name")
                continue

            mrp = float(row.get("mrp") or row.get("MRP") or row.get("price") or 0)

            med_data = {
                "name": name,
                "generic_name": (row.get("generic_name") or row.get("Generic Name") or row.get("composition") or "").strip(),
                "manufacturer": (row.get("manufacturer") or row.get("Manufacturer") or row.get("company") or "").strip(),
                "category": (row.get("category") or row.get("Category") or "General").strip(),
                "unit": (row.get("form") or row.get("Form") or row.get("unit") or "Tablet").strip(),
                "mrp": mrp,
                "purchase_price": float(row.get("purchase_price") or row.get("Purchase Price") or 0),
                "discount_percent": float(row.get("discount_percent") or row.get("Discount") or 0),
                "sale_price": round(mrp * (1 - float(row.get("discount_percent") or 0) / 100), 2),
                "stock_quantity": int(row.get("stock_quantity") or row.get("Stock") or row.get("qty") or 0),
                "batch_no": (row.get("batch_no") or row.get("Batch") or "").strip(),
                "expiry": (row.get("expiry") or row.get("Expiry") or "").strip(),
                "hsn_code": (row.get("hsn_code") or row.get("HSN") or "").strip(),
                "barcode": (row.get("barcode") or row.get("Barcode") or "").strip(),
                "description": (row.get("description") or row.get("Description") or "").strip(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

            # Check if medicine exists (by name or barcode)
            existing = await db.medicines.find_one(
                {"$or": [{"name": {"$regex": f"^{name}$", "$options": "i"}}] + ([{"barcode": med_data["barcode"]}] if med_data["barcode"] else [])},
                {"_id": 1}
            )

            if existing:
                await db.medicines.update_one({"_id": existing["_id"]}, {"$set": med_data})
                updated += 1
            else:
                med_data["id"] = str(uuid.uuid4())
                med_data["created_at"] = datetime.now(timezone.utc).isoformat()
                med_data["created_by"] = staff.get("name", "Staff")
                med_data["image_url"] = ""
                await db.medicines.insert_one(med_data)
                med_data.pop("_id", None)
                imported += 1

        except Exception as e:
            errors.append(f"Row {i+2}: {str(e)}")

    return {
        "success": True,
        "imported": imported,
        "updated": updated,
        "errors": errors[:20],
        "total_processed": imported + updated + len(errors),
    }


@router.get("/csv-export")
async def export_csv(staff=Depends(verify_staff)):
    """Export all medicines as CSV"""
    medicines = await db.medicines.find({}, {"_id": 0}).to_list(50000)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "name", "generic_name", "manufacturer", "category", "form",
        "mrp", "purchase_price", "discount_percent", "stock_quantity",
        "batch_no", "expiry", "hsn_code", "barcode", "description"
    ])
    for m in medicines:
        writer.writerow([
            m.get("name", ""), m.get("generic_name", ""), m.get("manufacturer", ""),
            m.get("category", ""), m.get("unit", ""), m.get("mrp", ""),
            m.get("purchase_price", ""), m.get("discount_percent", ""),
            m.get("stock_quantity", ""), m.get("batch_no", ""), m.get("expiry", ""),
            m.get("hsn_code", ""), m.get("barcode", ""), m.get("description", ""),
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=orange_pharmacy_inventory_{ist_date_str()}.csv"},
    )


# ============ BARCODE ============

@router.post("/barcode/assign")
async def assign_barcode(medicine_id: str = Form(...), barcode: str = Form(None), staff=Depends(verify_staff)):
    """Assign or auto-generate a barcode for a medicine"""
    med = await db.medicines.find_one({"id": medicine_id}, {"_id": 0, "id": 1, "name": 1})
    if not med:
        raise HTTPException(404, "Medicine not found")

    if not barcode:
        # Auto-generate: ORG + 10-digit unique
        barcode = f"ORG{str(uuid.uuid4().int)[:10]}"

    # Check uniqueness
    existing = await db.medicines.find_one({"barcode": barcode, "id": {"$ne": medicine_id}})
    if existing:
        raise HTTPException(400, "Barcode already assigned to another medicine")

    await db.medicines.update_one({"id": medicine_id}, {"$set": {"barcode": barcode, "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"success": True, "barcode": barcode, "medicine_id": medicine_id}


@router.get("/barcode/lookup/{barcode}")
async def barcode_lookup(barcode: str, staff=Depends(verify_staff)):
    """Lookup medicine by barcode (for POS scanning)"""
    med = await db.medicines.find_one({"barcode": barcode}, {"_id": 0})
    if not med:
        return {"found": False}
    return {"found": True, "medicine": med}


@router.post("/barcode/bulk-generate")
async def bulk_generate_barcodes(medicine_ids: List[str] = [], staff=Depends(verify_staff)):
    """Generate barcodes for multiple medicines that don't have one"""
    if not medicine_ids:
        # Auto-generate for all medicines without barcode
        medicines = await db.medicines.find(
            {"$or": [{"barcode": {"$exists": False}}, {"barcode": ""}, {"barcode": None}]},
            {"_id": 0, "id": 1, "name": 1}
        ).to_list(5000)
        medicine_ids = [m["id"] for m in medicines]

    generated = 0
    for mid in medicine_ids:
        barcode = f"ORG{str(uuid.uuid4().int)[:10]}"
        result = await db.medicines.update_one(
            {"id": mid, "$or": [{"barcode": {"$exists": False}}, {"barcode": ""}, {"barcode": None}]},
            {"$set": {"barcode": barcode, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        if result.modified_count > 0:
            generated += 1

    return {"success": True, "generated": generated}


@router.get("/barcode/sticker-data")
async def get_sticker_data(
    medicine_ids: str = Query(None, description="Comma-separated medicine IDs"),
    category: str = Query(None),
    limit: int = 65,
    staff=Depends(verify_staff),
):
    """Get medicine data for barcode sticker sheet (65 stickers per page)"""
    query = {"barcode": {"$exists": True, "$nin": ["", None]}}
    if medicine_ids:
        ids = [x.strip() for x in medicine_ids.split(",")]
        query["id"] = {"$in": ids}
    if category:
        query["category"] = category

    medicines = await db.medicines.find(query, {"_id": 0, "id": 1, "name": 1, "barcode": 1, "mrp": 1, "batch_no": 1, "expiry": 1}).limit(limit).to_list(limit)

    return {"medicines": medicines, "count": len(medicines)}


# ============ REPORTS ============

@router.get("/reports/daily-sales")
async def daily_sales_report(date: str = None, staff=Depends(verify_staff)):
    if not date:
        date = ist_date_str()

    bills = await db.pharmacy_bills.find({"date": date}, {"_id": 0}).to_list(1000)

    total_revenue = sum(b.get("grand_total", 0) for b in bills)
    total_collected = sum(b.get("paid_amount", 0) for b in bills)
    total_due = sum(b.get("due_amount", 0) for b in bills)
    total_discount = sum(b.get("total_discount", 0) for b in bills)
    total_gst = sum(b.get("total_gst", 0) for b in bills)

    payment_breakdown = {}
    for b in bills:
        mode = b.get("payment_mode", "cash")
        payment_breakdown[mode] = payment_breakdown.get(mode, 0) + b.get("paid_amount", 0)

    # Hourly breakdown
    hourly = {}
    for b in bills:
        hour = b.get("created_at", "")[:13]
        if hour:
            hourly[hour] = hourly.get(hour, 0) + b.get("grand_total", 0)

    return {
        "date": date,
        "total_bills": len(bills),
        "total_revenue": round(total_revenue, 2),
        "total_collected": round(total_collected, 2),
        "total_due": round(total_due, 2),
        "total_discount": round(total_discount, 2),
        "total_gst": round(total_gst, 2),
        "payment_breakdown": payment_breakdown,
        "hourly_sales": hourly,
    }


@router.get("/reports/sales-summary")
async def sales_summary(days: int = 7, staff=Depends(verify_staff)):
    """Get sales summary for last N days"""
    results = []
    for i in range(days):
        d = (ist_now() - timedelta(days=i)).strftime("%Y-%m-%d")
        pipeline = [
            {"$match": {"date": d}},
            {"$group": {
                "_id": None,
                "revenue": {"$sum": "$grand_total"},
                "collected": {"$sum": "$paid_amount"},
                "bills": {"$sum": 1},
                "items": {"$sum": "$total_quantity"},
            }},
        ]
        agg = await db.pharmacy_bills.aggregate(pipeline).to_list(1)
        day_data = agg[0] if agg else {"revenue": 0, "collected": 0, "bills": 0, "items": 0}
        day_data.pop("_id", None)
        day_data["date"] = d
        results.append(day_data)

    return {"days": days, "summary": results}


@router.get("/reports/top-selling")
async def top_selling(days: int = 30, limit: int = 20, staff=Depends(verify_staff)):
    start_date = (ist_now() - timedelta(days=days)).strftime("%Y-%m-%d")
    pipeline = [
        {"$match": {"date": {"$gte": start_date}}},
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.name",
            "total_qty": {"$sum": "$items.quantity"},
            "total_revenue": {"$sum": "$items.line_total"},
            "times_sold": {"$sum": 1},
        }},
        {"$sort": {"total_qty": -1}},
        {"$limit": limit},
    ]
    results = await db.pharmacy_bills.aggregate(pipeline).to_list(limit)
    for r in results:
        r["name"] = r.pop("_id")
    return {"period_days": days, "top_items": results}


@router.get("/reports/stock")
async def stock_report(filter: str = "all", staff=Depends(verify_staff)):
    """filter: all, low_stock, out_of_stock, expiring_soon"""
    query = {}
    if filter == "low_stock":
        query["stock_quantity"] = {"$gt": 0, "$lt": 10}
    elif filter == "out_of_stock":
        query["stock_quantity"] = {"$lte": 0}
    elif filter == "expiring_soon":
        three_months = (ist_now() + timedelta(days=90)).strftime("%Y-%m")
        query["expiry"] = {"$lte": three_months, "$ne": ""}

    medicines = await db.medicines.find(query, {"_id": 0, "id": 1, "name": 1, "stock_quantity": 1, "mrp": 1, "expiry": 1, "batch_no": 1, "category": 1}).sort("stock_quantity", 1).limit(200).to_list(200)

    total_stock_value = 0
    for m in medicines:
        total_stock_value += (m.get("mrp", 0) * m.get("stock_quantity", 0))

    stats = {
        "total_items": await db.medicines.count_documents({}),
        "low_stock": await db.medicines.count_documents({"stock_quantity": {"$gt": 0, "$lt": 10}}),
        "out_of_stock": await db.medicines.count_documents({"stock_quantity": {"$lte": 0}}),
        "total_stock_value": round(total_stock_value, 2),
    }

    return {"filter": filter, "medicines": medicines, "stats": stats}


# ============ MEDICINE SEARCH (for POS) ============

@router.get("/medicine-search")
async def quick_medicine_search(q: str = "", staff=Depends(verify_staff)):
    """Fast medicine search for POS billing (by name or barcode)"""
    if not q:
        return {"medicines": []}

    query = {"$or": [
        {"name": {"$regex": q, "$options": "i"}},
        {"barcode": q},
        {"generic_name": {"$regex": q, "$options": "i"}},
    ]}

    medicines = await db.medicines.find(
        query, {"_id": 0, "id": 1, "name": 1, "mrp": 1, "sale_price": 1, "stock_quantity": 1, "unit": 1, "barcode": 1, "batch_no": 1, "expiry": 1, "hsn_code": 1, "discount_percent": 1, "category": 1, "manufacturer": 1, "image_url": 1}
    ).limit(15).to_list(15)

    return {"medicines": medicines}


# ============ DASHBOARD STATS ============

@router.get("/dashboard")
async def billing_dashboard(staff=Depends(verify_staff)):
    today = ist_date_str()

    # Today's billing
    today_pipeline = [
        {"$match": {"date": today}},
        {"$group": {
            "_id": None,
            "revenue": {"$sum": "$grand_total"},
            "collected": {"$sum": "$paid_amount"},
            "due": {"$sum": "$due_amount"},
            "bills": {"$sum": 1},
            "items_sold": {"$sum": "$total_quantity"},
        }},
    ]
    today_data = await db.pharmacy_bills.aggregate(today_pipeline).to_list(1)
    today_stats = today_data[0] if today_data else {"revenue": 0, "collected": 0, "due": 0, "bills": 0, "items_sold": 0}
    today_stats.pop("_id", None)

    # Inventory stats
    total_medicines = await db.medicines.count_documents({})
    low_stock = await db.medicines.count_documents({"stock_quantity": {"$gt": 0, "$lt": 10}})
    out_of_stock = await db.medicines.count_documents({"stock_quantity": {"$lte": 0}})

    # Total outstanding dues
    dues_pipeline = [
        {"$match": {"total_due": {"$gt": 0}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_due"}, "count": {"$sum": 1}}},
    ]
    dues_data = await db.pharmacy_customers.aggregate(dues_pipeline).to_list(1)
    total_dues = dues_data[0] if dues_data else {"total": 0, "count": 0}
    total_dues.pop("_id", None)

    # Pending orders
    pending_orders = await db.pharmacy_orders.count_documents(
        {"status": {"$in": ["booked", "pharmacist_call", "packing"]}}
    )

    return {
        "today": today_stats,
        "inventory": {"total": total_medicines, "low_stock": low_stock, "out_of_stock": out_of_stock},
        "outstanding_dues": total_dues,
        "pending_orders": pending_orders,
    }


# ============ BATCH-WISE INVENTORY ============

class BatchCreate(BaseModel):
    medicine_id: str
    medicine_name: str
    batch_no: str
    expiry: str
    mrp: float
    purchase_rate: float = 0
    stock_quantity: int = 0
    gst_percent: float = 0
    hsn_code: str = ""
    location: str = ""  # rack/shelf/bin


@router.post("/batches")
async def create_batch(data: BatchCreate, staff=Depends(verify_staff)):
    """Create or update a batch entry for a medicine"""
    existing = await db.inventory_batches.find_one(
        {"medicine_id": data.medicine_id, "batch_no": data.batch_no}, {"_id": 1}
    )
    batch = {
        "medicine_id": data.medicine_id,
        "medicine_name": data.medicine_name,
        "batch_no": data.batch_no,
        "expiry": data.expiry,
        "mrp": data.mrp,
        "purchase_rate": data.purchase_rate,
        "stock_quantity": data.stock_quantity,
        "gst_percent": data.gst_percent,
        "hsn_code": data.hsn_code,
        "location": data.location,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if existing:
        await db.inventory_batches.update_one({"_id": existing["_id"]}, {"$set": batch})
        return {"success": True, "action": "updated"}
    else:
        batch["id"] = str(uuid.uuid4())
        batch["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.inventory_batches.insert_one(batch)
        batch.pop("_id", None)
        return {"success": True, "action": "created", "batch": batch}


@router.get("/batches")
async def list_batches(
    medicine_id: str = None,
    search: str = None,
    filter: str = "all",
    page: int = 1,
    limit: int = 50,
    staff=Depends(verify_staff),
):
    query = {}
    if medicine_id:
        query["medicine_id"] = medicine_id
    if search:
        query["$or"] = [
            {"medicine_name": {"$regex": search, "$options": "i"}},
            {"batch_no": {"$regex": search, "$options": "i"}},
            {"location": {"$regex": search, "$options": "i"}},
        ]
    if filter == "expiring_soon":
        three_months = (ist_now() + timedelta(days=90)).strftime("%Y-%m")
        query["expiry"] = {"$lte": three_months, "$ne": ""}
    elif filter == "low_stock":
        query["stock_quantity"] = {"$gt": 0, "$lt": 10}
    elif filter == "out_of_stock":
        query["stock_quantity"] = {"$lte": 0}

    total = await db.inventory_batches.count_documents(query)
    batches = await db.inventory_batches.find(query, {"_id": 0}).sort("updated_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"batches": batches, "total": total, "page": page, "pages": math.ceil(total / limit) if total else 1}


@router.put("/batches/{batch_id}")
async def update_batch(batch_id: str, data: dict, staff=Depends(verify_staff)):
    allowed = {"stock_quantity", "mrp", "purchase_rate", "expiry", "location", "gst_percent", "hsn_code"}
    updates = {k: v for k, v in data.items() if k in allowed}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.inventory_batches.update_one({"id": batch_id}, {"$set": updates})
    return {"success": True}


# ============ SUPPLIER MANAGEMENT ============

class SupplierCreate(BaseModel):
    name: str
    phone: str = ""
    email: str = ""
    gst_number: str = ""
    address: str = ""
    notes: str = ""


@router.post("/suppliers")
async def create_supplier(data: SupplierCreate, staff=Depends(verify_staff)):
    supplier = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "phone": data.phone,
        "email": data.email,
        "gst_number": data.gst_number,
        "address": data.address,
        "notes": data.notes,
        "total_purchases": 0,
        "total_due": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.pharmacy_suppliers.insert_one(supplier)
    supplier.pop("_id", None)
    return {"success": True, "supplier": supplier}


@router.get("/suppliers")
async def list_suppliers(search: str = None, page: int = 1, limit: int = 30, staff=Depends(verify_staff)):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search}},
            {"gst_number": {"$regex": search, "$options": "i"}},
        ]
    total = await db.pharmacy_suppliers.count_documents(query)
    suppliers = await db.pharmacy_suppliers.find(query, {"_id": 0}).sort("name", 1).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"suppliers": suppliers, "total": total}


@router.put("/suppliers/{supplier_id}")
async def update_supplier(supplier_id: str, data: dict, staff=Depends(verify_staff)):
    allowed = {"name", "phone", "email", "gst_number", "address", "notes"}
    updates = {k: v for k, v in data.items() if k in allowed}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.pharmacy_suppliers.update_one({"id": supplier_id}, {"$set": updates})
    return {"success": True}


# ============ PURCHASE ENTRY ============

class PurchaseItem(BaseModel):
    medicine_name: str
    batch_no: str
    expiry: str
    quantity: int
    purchase_rate: float
    mrp: float
    gst_percent: float = 0
    location: str = ""


class PurchaseEntry(BaseModel):
    supplier_id: str = ""
    supplier_name: str = ""
    invoice_number: str = ""
    items: List[PurchaseItem]
    notes: str = ""


@router.post("/purchases")
async def create_purchase(data: PurchaseEntry, staff=Depends(verify_staff)):
    """Record a purchase and auto-update inventory/batches"""
    today = ist_date_str()
    count = await db.pharmacy_purchases.count_documents({"date": today})
    purchase_no = f"PUR-{today.replace('-', '')}-{(count + 1):04d}"

    items = []
    total_amount = 0
    total_gst = 0

    for item in data.items:
        line_total = round(item.purchase_rate * item.quantity, 2)
        gst = round(line_total * item.gst_percent / 100, 2)
        items.append({
            "medicine_name": item.medicine_name,
            "batch_no": item.batch_no,
            "expiry": item.expiry,
            "quantity": item.quantity,
            "purchase_rate": item.purchase_rate,
            "mrp": item.mrp,
            "gst_percent": item.gst_percent,
            "gst_amount": gst,
            "line_total": line_total,
            "location": item.location,
        })
        total_amount += line_total
        total_gst += gst

        # Find or create medicine
        med = await db.medicines.find_one({"name": {"$regex": f"^{item.medicine_name}$", "$options": "i"}}, {"_id": 0, "id": 1})
        med_id = med["id"] if med else str(uuid.uuid4())

        if not med:
            await db.medicines.insert_one({
                "id": med_id, "name": item.medicine_name, "mrp": item.mrp,
                "purchase_price": item.purchase_rate, "stock_quantity": item.quantity,
                "batch_no": item.batch_no, "expiry": item.expiry, "hsn_code": "",
                "barcode": "", "category": "General", "unit": "Unit",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        else:
            await db.medicines.update_one(
                {"id": med_id},
                {"$inc": {"stock_quantity": item.quantity}, "$set": {"mrp": item.mrp, "purchase_price": item.purchase_rate, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )

        # Upsert batch
        await db.inventory_batches.update_one(
            {"medicine_id": med_id, "batch_no": item.batch_no},
            {
                "$set": {"medicine_name": item.medicine_name, "expiry": item.expiry, "mrp": item.mrp, "purchase_rate": item.purchase_rate, "gst_percent": item.gst_percent, "location": item.location, "updated_at": datetime.now(timezone.utc).isoformat()},
                "$inc": {"stock_quantity": item.quantity},
                "$setOnInsert": {"id": str(uuid.uuid4()), "medicine_id": med_id, "created_at": datetime.now(timezone.utc).isoformat()},
            },
            upsert=True,
        )

    purchase = {
        "id": str(uuid.uuid4()),
        "purchase_no": purchase_no,
        "date": today,
        "supplier_id": data.supplier_id,
        "supplier_name": data.supplier_name,
        "invoice_number": data.invoice_number,
        "items": items,
        "item_count": len(items),
        "total_amount": round(total_amount, 2),
        "total_gst": round(total_gst, 2),
        "grand_total": round(total_amount + total_gst, 2),
        "notes": data.notes,
        "created_by": staff.get("name", "Staff"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.pharmacy_purchases.insert_one(purchase)
    purchase.pop("_id", None)

    # Update supplier totals
    if data.supplier_id:
        await db.pharmacy_suppliers.update_one(
            {"id": data.supplier_id},
            {"$inc": {"total_purchases": purchase["grand_total"]}}
        )

    return {"success": True, "purchase": purchase}


@router.get("/purchases")
async def list_purchases(date: str = None, search: str = None, page: int = 1, limit: int = 30, staff=Depends(verify_staff)):
    query = {}
    if date:
        query["date"] = date
    if search:
        query["$or"] = [
            {"purchase_no": {"$regex": search, "$options": "i"}},
            {"supplier_name": {"$regex": search, "$options": "i"}},
            {"invoice_number": {"$regex": search, "$options": "i"}},
        ]
    total = await db.pharmacy_purchases.count_documents(query)
    purchases = await db.pharmacy_purchases.find(query, {"_id": 0}).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"purchases": purchases, "total": total, "page": page}


# ============ PURCHASE CSV IMPORT ============

@router.get("/purchase-csv-template")
async def purchase_csv_template(staff=Depends(verify_staff)):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["medicine_name", "batch_no", "expiry", "quantity", "purchase_rate", "mrp", "gst_percent", "location"])
    writer.writerow(["Paracetamol 500mg", "B2026-001", "2027-06", "100", "18.00", "25.50", "12", "Rack-A/Shelf-2"])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()), media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=purchase_import_template.csv"},
    )


@router.post("/purchase-csv-import")
async def import_purchase_csv(
    file: UploadFile = File(...),
    supplier_name: str = Form(""),
    invoice_number: str = Form(""),
    staff=Depends(verify_staff),
):
    """Import purchase bill from CSV - auto-create/update inventory"""
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    items = []
    errors = []

    for i, row in enumerate(reader):
        try:
            name = (row.get("medicine_name") or row.get("name") or row.get("Medicine Name") or "").strip()
            if not name:
                errors.append(f"Row {i+2}: Missing medicine name")
                continue
            items.append(PurchaseItem(
                medicine_name=name,
                batch_no=(row.get("batch_no") or row.get("Batch") or "").strip(),
                expiry=(row.get("expiry") or row.get("Expiry") or "").strip(),
                quantity=int(row.get("quantity") or row.get("qty") or row.get("Quantity") or 0),
                purchase_rate=float(row.get("purchase_rate") or row.get("Purchase Rate") or 0),
                mrp=float(row.get("mrp") or row.get("MRP") or 0),
                gst_percent=float(row.get("gst_percent") or row.get("GST") or 0),
                location=(row.get("location") or row.get("Location") or "").strip(),
            ))
        except Exception as e:
            errors.append(f"Row {i+2}: {str(e)}")

    if not items and errors:
        return {"success": False, "errors": errors, "imported": 0}

    # Create purchase entry with parsed items
    purchase_data = PurchaseEntry(
        supplier_name=supplier_name,
        invoice_number=invoice_number,
        items=items,
        notes=f"Imported from CSV ({len(items)} items)",
    )
    result = await create_purchase(purchase_data, staff)
    result["errors"] = errors
    return result


# ============ GST INVOICE ============

@router.get("/invoice/{bill_id}")
async def get_invoice(bill_id: str, staff=Depends(verify_staff)):
    """Get GST-compliant invoice data for a bill"""
    bill = await db.pharmacy_bills.find_one({"id": bill_id}, {"_id": 0})
    if not bill:
        raise HTTPException(404, "Bill not found")

    invoice = {
        "pharmacy_name": "Orange Pharmacy",
        "pharmacy_address": "Nevika Cura Healthcare",
        "pharmacy_gstin": "",
        "bill": bill,
        "invoice_date": bill.get("date"),
        "invoice_number": bill.get("bill_number"),
        "customer_name": bill.get("customer_name"),
        "customer_phone": bill.get("customer_phone"),
        "items": bill.get("items", []),
        "subtotal": bill.get("subtotal", 0),
        "total_discount": bill.get("total_discount", 0),
        "cgst": round(bill.get("total_gst", 0) / 2, 2),
        "sgst": round(bill.get("total_gst", 0) / 2, 2),
        "total_gst": bill.get("total_gst", 0),
        "grand_total": bill.get("grand_total", 0),
        "payment_mode": bill.get("payment_mode"),
    }
    return invoice
