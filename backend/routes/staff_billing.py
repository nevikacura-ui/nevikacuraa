"""
Staff Billing Module
- Integrated billing for all services (DiaGyn, Proton, Pharmacy)
- Inventory lookup from all sources
- Loyalty points redemption
- Email invoice sending
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/staff-billing", tags=["Staff Billing"])

db = None

def get_db():
    global db
    return db

def set_db(database):
    global db
    db = database

# Models
class BillItem(BaseModel):
    item_type: str  # service, test, medicine, custom
    item_name: str
    item_code: Optional[str] = None
    quantity: int = 1
    unit_price: float
    discount_percent: float = 0
    notes: Optional[str] = None

class CreateBill(BaseModel):
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    items: List[BillItem]
    use_loyalty_points: bool = False
    loyalty_points_to_use: int = 0
    discount_amount: float = 0
    payment_method: str = "pending"  # cash, card, upi, pending
    notes: Optional[str] = None
    clinic: str = "pushpa"

class AddCustomItem(BaseModel):
    item_name: str
    category: str  # service, test, medicine
    default_price: float = 0
    description: Optional[str] = None

# ==================== SERVICE CATALOG ====================

# DiaGyn Services
DIAGYN_SERVICES = {
    "consultation": [
        {"code": "CONS-OBG", "name": "OB-GYN Consultation", "price": 500, "category": "OB-GYN"},
        {"code": "CONS-OBGF", "name": "OB-GYN Follow-up", "price": 300, "category": "OB-GYN"},
        {"code": "CONS-OBGE", "name": "OB-GYN Emergency", "price": 600, "category": "OB-GYN"},
        {"code": "CONS-ANT", "name": "Antenatal Check-up", "price": 400, "category": "OB-GYN"},
        {"code": "CONS-GEN", "name": "General Physician Consultation", "price": 400, "category": "General"},
        {"code": "CONS-GENF", "name": "General Follow-up", "price": 250, "category": "General"},
        {"code": "CONS-GENE", "name": "General Emergency", "price": 600, "category": "General"},
        {"code": "CONS-PED", "name": "Pediatric Consultation", "price": 450, "category": "Pediatric"},
    ],
    "procedures": [
        {"code": "PROC-USG", "name": "Ultrasound (USG)", "price": 800, "category": "Imaging"},
        {"code": "PROC-USGA", "name": "USG Abdomen", "price": 700, "category": "Imaging"},
        {"code": "PROC-USGP", "name": "USG Pelvis", "price": 700, "category": "Imaging"},
        {"code": "PROC-USGOB", "name": "USG Obstetric", "price": 900, "category": "Imaging"},
        {"code": "PROC-ECG", "name": "ECG", "price": 200, "category": "Cardiology"},
        {"code": "PROC-IUD", "name": "IUD Insertion", "price": 1500, "category": "OB-GYN"},
        {"code": "PROC-PAP", "name": "Pap Smear", "price": 500, "category": "OB-GYN"},
        {"code": "PROC-DRESS", "name": "Dressing", "price": 100, "category": "General"},
        {"code": "PROC-INJ", "name": "Injection", "price": 50, "category": "General"},
        {"code": "PROC-IV", "name": "IV Fluid Administration", "price": 300, "category": "General"},
    ]
}

# Proton Diagnostic Tests (comprehensive list)
PROTON_TESTS = [
    # Diabetes Tests
    {"code": "FBS", "name": "FBS (Fasting Blood Sugar)", "price": 80, "category": "Diabetes"},
    {"code": "PPBS", "name": "PPBS (Post Prandial Blood Sugar)", "price": 80, "category": "Diabetes"},
    {"code": "RBS", "name": "RBS (Random Blood Sugar)", "price": 70, "category": "Diabetes"},
    {"code": "HBA1C", "name": "HbA1c (Glycated Hemoglobin)", "price": 350, "category": "Diabetes"},
    {"code": "GTT", "name": "GTT (Glucose Tolerance Test)", "price": 300, "category": "Diabetes"},
    {"code": "OGTT3", "name": "OGTT - 3 Sample", "price": 400, "category": "Diabetes"},
    {"code": "INSULIN", "name": "Fasting Insulin", "price": 500, "category": "Diabetes"},
    {"code": "CPEP", "name": "C-Peptide", "price": 600, "category": "Diabetes"},
    # Lipid Profile
    {"code": "LIPID", "name": "Lipid Profile", "price": 400, "category": "Lipid"},
    {"code": "TCHOL", "name": "Total Cholesterol", "price": 150, "category": "Lipid"},
    {"code": "TG", "name": "Triglycerides", "price": 150, "category": "Lipid"},
    {"code": "HDL", "name": "HDL Cholesterol", "price": 150, "category": "Lipid"},
    {"code": "LDL", "name": "LDL Cholesterol", "price": 150, "category": "Lipid"},
    {"code": "VLDL", "name": "VLDL Cholesterol", "price": 150, "category": "Lipid"},
    # Liver Function
    {"code": "LFT", "name": "LFT (Liver Function Test)", "price": 450, "category": "Liver"},
    {"code": "SGOT", "name": "SGOT / AST", "price": 120, "category": "Liver"},
    {"code": "SGPT", "name": "SGPT / ALT", "price": 120, "category": "Liver"},
    {"code": "ALP", "name": "Alkaline Phosphatase", "price": 120, "category": "Liver"},
    {"code": "TBIL", "name": "Total Bilirubin", "price": 100, "category": "Liver"},
    {"code": "DBIL", "name": "Direct Bilirubin", "price": 100, "category": "Liver"},
    {"code": "GGT", "name": "Gamma GT", "price": 200, "category": "Liver"},
    {"code": "PROT", "name": "Total Protein", "price": 100, "category": "Liver"},
    {"code": "ALB", "name": "Albumin", "price": 100, "category": "Liver"},
    # Kidney Function
    {"code": "RFT", "name": "RFT (Renal Function Test)", "price": 400, "category": "Kidney"},
    {"code": "UREA", "name": "Blood Urea", "price": 100, "category": "Kidney"},
    {"code": "CREAT", "name": "Creatinine", "price": 100, "category": "Kidney"},
    {"code": "URIC", "name": "Uric Acid", "price": 120, "category": "Kidney"},
    {"code": "BUN", "name": "BUN (Blood Urea Nitrogen)", "price": 100, "category": "Kidney"},
    {"code": "EGFR", "name": "eGFR", "price": 150, "category": "Kidney"},
    # Thyroid
    {"code": "TSH", "name": "TSH", "price": 250, "category": "Thyroid"},
    {"code": "T3", "name": "T3 (Total)", "price": 200, "category": "Thyroid"},
    {"code": "T4", "name": "T4 (Total)", "price": 200, "category": "Thyroid"},
    {"code": "FT3", "name": "Free T3", "price": 300, "category": "Thyroid"},
    {"code": "FT4", "name": "Free T4", "price": 300, "category": "Thyroid"},
    {"code": "THYP", "name": "Thyroid Profile", "price": 600, "category": "Thyroid"},
    # Hematology
    {"code": "CBC", "name": "CBC (Complete Blood Count)", "price": 250, "category": "Hematology"},
    {"code": "HB", "name": "Hemoglobin", "price": 60, "category": "Hematology"},
    {"code": "PCV", "name": "PCV / Hematocrit", "price": 60, "category": "Hematology"},
    {"code": "RBC", "name": "RBC Count", "price": 80, "category": "Hematology"},
    {"code": "WBC", "name": "WBC Count", "price": 80, "category": "Hematology"},
    {"code": "PLT", "name": "Platelet Count", "price": 100, "category": "Hematology"},
    {"code": "ESR", "name": "ESR", "price": 80, "category": "Hematology"},
    {"code": "MCHC", "name": "MCHC", "price": 80, "category": "Hematology"},
    {"code": "MCV", "name": "MCV", "price": 80, "category": "Hematology"},
    {"code": "RETI", "name": "Reticulocyte Count", "price": 150, "category": "Hematology"},
    {"code": "BT", "name": "Bleeding Time", "price": 80, "category": "Hematology"},
    {"code": "CT", "name": "Clotting Time", "price": 80, "category": "Hematology"},
    {"code": "PT", "name": "Prothrombin Time", "price": 250, "category": "Hematology"},
    {"code": "APTT", "name": "APTT", "price": 300, "category": "Hematology"},
    {"code": "INR", "name": "INR", "price": 200, "category": "Hematology"},
    {"code": "PBSMR", "name": "Peripheral Blood Smear", "price": 200, "category": "Hematology"},
    # Urine & Stool
    {"code": "URINE", "name": "Urine Routine", "price": 80, "category": "Urine"},
    {"code": "UCUL", "name": "Urine Culture", "price": 400, "category": "Urine"},
    {"code": "24URIN", "name": "24hr Urine Protein", "price": 200, "category": "Urine"},
    {"code": "UALB", "name": "Urine Microalbumin", "price": 350, "category": "Urine"},
    {"code": "STOOL", "name": "Stool Routine", "price": 80, "category": "Stool"},
    {"code": "STOCC", "name": "Stool Occult Blood", "price": 150, "category": "Stool"},
    # Serology
    {"code": "HIV", "name": "HIV 1 & 2", "price": 300, "category": "Serology"},
    {"code": "HBSAG", "name": "HBsAg", "price": 250, "category": "Serology"},
    {"code": "HCV", "name": "HCV Antibody", "price": 400, "category": "Serology"},
    {"code": "VDRL", "name": "VDRL", "price": 150, "category": "Serology"},
    {"code": "WIDAL", "name": "Widal Test", "price": 200, "category": "Serology"},
    {"code": "RA", "name": "RA Factor", "price": 250, "category": "Serology"},
    {"code": "CRP", "name": "CRP", "price": 300, "category": "Serology"},
    {"code": "ASO", "name": "ASO Titre", "price": 250, "category": "Serology"},
    {"code": "DENGUE", "name": "Dengue NS1 Ag", "price": 500, "category": "Serology"},
    {"code": "MALARIA", "name": "Malaria Parasite", "price": 150, "category": "Serology"},
    # Hormones
    {"code": "PREG", "name": "Pregnancy Test (Blood)", "price": 300, "category": "Hormones"},
    {"code": "FSH", "name": "FSH", "price": 400, "category": "Hormones"},
    {"code": "LH", "name": "LH", "price": 400, "category": "Hormones"},
    {"code": "PROL", "name": "Prolactin", "price": 450, "category": "Hormones"},
    {"code": "EST", "name": "Estrogen", "price": 500, "category": "Hormones"},
    {"code": "PROG", "name": "Progesterone", "price": 500, "category": "Hormones"},
    {"code": "TEST", "name": "Testosterone", "price": 450, "category": "Hormones"},
    {"code": "CORT", "name": "Cortisol", "price": 500, "category": "Hormones"},
    {"code": "VITD", "name": "Vitamin D", "price": 800, "category": "Vitamins"},
    {"code": "VITB12", "name": "Vitamin B12", "price": 600, "category": "Vitamins"},
    {"code": "IRON", "name": "Serum Iron", "price": 200, "category": "Vitamins"},
    {"code": "FERR", "name": "Ferritin", "price": 400, "category": "Vitamins"},
    {"code": "CA", "name": "Calcium", "price": 120, "category": "Minerals"},
    {"code": "PHOS", "name": "Phosphorus", "price": 120, "category": "Minerals"},
    {"code": "MG", "name": "Magnesium", "price": 200, "category": "Minerals"},
    {"code": "NA", "name": "Sodium", "price": 100, "category": "Electrolytes"},
    {"code": "K", "name": "Potassium", "price": 100, "category": "Electrolytes"},
    {"code": "CL", "name": "Chloride", "price": 100, "category": "Electrolytes"},
    # Tumor Markers
    {"code": "PSA", "name": "PSA (Total)", "price": 600, "category": "Tumor Markers"},
    {"code": "CA125", "name": "CA-125", "price": 900, "category": "Tumor Markers"},
    {"code": "CEA", "name": "CEA", "price": 700, "category": "Tumor Markers"},
    {"code": "AFP", "name": "AFP", "price": 600, "category": "Tumor Markers"},
    # Cardiac
    {"code": "TROP", "name": "Troponin I", "price": 800, "category": "Cardiac"},
    {"code": "CKMB", "name": "CK-MB", "price": 400, "category": "Cardiac"},
    {"code": "BNP", "name": "BNP / NT-proBNP", "price": 1500, "category": "Cardiac"},
    {"code": "HOMO", "name": "Homocysteine", "price": 800, "category": "Cardiac"},
    # Microbiology
    {"code": "SPUTAFB", "name": "Sputum AFB", "price": 150, "category": "Microbiology"},
    {"code": "SPUTCUL", "name": "Sputum Culture", "price": 400, "category": "Microbiology"},
    {"code": "BCUL", "name": "Blood Culture", "price": 600, "category": "Microbiology"},
    {"code": "SWABCUL", "name": "Swab Culture", "price": 400, "category": "Microbiology"},
]

# ==================== INVENTORY SEARCH ====================

@router.get("/inventory/search")
async def search_inventory(q: str, category: Optional[str] = None, limit: int = 50):
    """Search across all inventories - services, tests, medicines"""
    db = get_db()
    results = []
    q_lower = q.lower()
    
    # Search DiaGyn Services
    if not category or category == "service":
        for section in DIAGYN_SERVICES.values():
            for item in section:
                if q_lower in item["name"].lower() or q_lower in item.get("code", "").lower():
                    results.append({
                        "type": "service",
                        "code": item["code"],
                        "name": item["name"],
                        "price": item["price"],
                        "category": item["category"],
                        "source": "DiaGyn"
                    })
    
    # Search Proton Tests
    if not category or category == "test":
        for test in PROTON_TESTS:
            if q_lower in test["name"].lower() or q_lower in test.get("code", "").lower():
                results.append({
                    "type": "test",
                    "code": test["code"],
                    "name": test["name"],
                    "price": test["price"],
                    "category": test["category"],
                    "source": "Proton"
                })
    
    # Search Pharmacy Medicines (from server.py MEDICINE_INVENTORY)
    if not category or category == "medicine":
        try:
            from server import MEDICINE_INVENTORY
            for medicine in MEDICINE_INVENTORY:
                if q_lower in medicine["name"].lower():
                    results.append({
                        "type": "medicine",
                        "code": f"MED-{medicine['name'][:4].upper()}",
                        "name": medicine["name"],
                        "price": 0,  # Manual entry for medicines
                        "category": medicine.get("form", "Medicine"),
                        "source": "Orange Pharmacy"
                    })
                    if len([r for r in results if r["type"] == "medicine"]) >= 20:
                        break
        except Exception:
            pass
    
    # Search custom items
    custom_items = await db.custom_bill_items.find(
        {"name": {"$regex": q, "$options": "i"}},
        {"_id": 0}
    ).limit(10).to_list(10)
    
    for item in custom_items:
        results.append({
            "type": item.get("category", "custom"),
            "code": item.get("code", "CUSTOM"),
            "name": item["name"],
            "price": item.get("default_price", 0),
            "category": "Custom",
            "source": "Custom"
        })
    
    return {"results": results[:limit], "total": len(results)}

@router.get("/inventory/service/{service_type}")
async def get_service_inventory(service_type: str):
    """Get inventory for a specific service type (diagyn, proton, pharmacy)"""
    if service_type == "diagyn":
        items = []
        for section in DIAGYN_SERVICES.values():
            items.extend(section)
        return {
            "service": "DiaGyn Healthcare",
            "service_type": "diagyn",
            "items": items
        }
    elif service_type == "proton":
        return {
            "service": "Proton Diagnostics",
            "service_type": "proton",
            "items": PROTON_TESTS
        }
    elif service_type == "pharmacy":
        # For pharmacy, we need to fetch from database
        db = get_db()
        medicines = await db.medicines.find({}, {"_id": 0}).limit(500).to_list(500)
        return {
            "service": "Orange Pharmacy",
            "service_type": "pharmacy",
            "items": medicines
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid service type")

@router.get("/inventory/categories")
async def get_inventory_categories():
    """Get all available categories"""
    service_cats = set()
    for section in DIAGYN_SERVICES.values():
        for item in section:
            service_cats.add(item["category"])
    
    test_cats = set(t["category"] for t in PROTON_TESTS)
    
    return {
        "services": {
            "source": "DiaGyn",
            "categories": sorted(list(service_cats))
        },
        "tests": {
            "source": "Proton Diagnostics",
            "categories": sorted(list(test_cats))
        },
        "medicines": {
            "source": "Orange Pharmacy",
            "categories": ["Tablet", "Capsule", "Syrup", "Injection", "Ointment", "Drops", "Powder"]
        }
    }

@router.post("/inventory/custom-item")
async def add_custom_item(item: AddCustomItem):
    """Add a custom item to inventory"""
    db = get_db()
    
    doc = {
        "id": str(uuid.uuid4()),
        "code": f"CUSTOM-{str(uuid.uuid4())[:6].upper()}",
        "name": item.item_name,
        "category": item.category,
        "default_price": item.default_price,
        "description": item.description,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.custom_bill_items.insert_one(doc)
    doc.pop("_id", None)
    
    return {"success": True, "item": doc}

# ==================== BILL CREATION ====================

@router.post("/create-bill")
async def create_bill(bill: CreateBill, background_tasks: BackgroundTasks):
    """Create a bill with items from any service"""
    db = get_db()
    
    # Calculate totals
    subtotal = 0
    bill_items = []
    
    for item in bill.items:
        item_total = item.unit_price * item.quantity
        discount = item_total * (item.discount_percent / 100)
        net_total = item_total - discount
        
        bill_items.append({
            "item_type": item.item_type,
            "item_name": item.item_name,
            "item_code": item.item_code,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "discount_percent": item.discount_percent,
            "discount_amount": discount,
            "net_total": net_total,
            "notes": item.notes
        })
        subtotal += net_total
    
    # Apply loyalty points if requested
    loyalty_discount = 0
    if bill.use_loyalty_points and bill.loyalty_points_to_use > 0:
        # Verify patient has enough points
        loyalty_data = await get_patient_loyalty(bill.patient_phone)
        if loyalty_data["available_points"] >= bill.loyalty_points_to_use:
            # 1 point = ₹0.10 (or 10 points = ₹1)
            loyalty_discount = bill.loyalty_points_to_use * 0.10
            loyalty_discount = min(loyalty_discount, subtotal * 0.10)  # Max 10% discount via points
    
    # Calculate final total
    total_before_discount = subtotal
    total_discount = bill.discount_amount + loyalty_discount
    final_total = subtotal - total_discount
    
    # Determine payment status
    payment_status = "paid" if bill.payment_method != "pending" else "pending"
    
    # Create bill document
    bill_doc = {
        "id": str(uuid.uuid4()),
        "bill_number": f"BILL-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}",
        "patient_name": bill.patient_name,
        "patient_phone": bill.patient_phone,
        "patient_email": bill.patient_email,
        "clinic": bill.clinic,
        "items": bill_items,
        "subtotal": subtotal,
        "discount_amount": bill.discount_amount,
        "loyalty_points_used": bill.loyalty_points_to_use if loyalty_discount > 0 else 0,
        "loyalty_discount": loyalty_discount,
        "total_discount": total_discount,
        "final_total": final_total,
        "payment_method": bill.payment_method,
        "payment_status": payment_status,
        "amount_paid": final_total if payment_status == "paid" else 0,
        "amount_due": 0 if payment_status == "paid" else final_total,
        "notes": bill.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": "staff"
    }
    
    await db.staff_bills.insert_one(bill_doc)
    
    # Deduct loyalty points if used
    if loyalty_discount > 0:
        await db.loyalty_redemptions.insert_one({
            "id": str(uuid.uuid4()),
            "patient_phone": bill.patient_phone,
            "points_used": bill.loyalty_points_to_use,
            "discount_amount": loyalty_discount,
            "bill_id": bill_doc["id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Add to due payments if pending
    if payment_status == "pending":
        await db.due_payments.insert_one({
            "id": str(uuid.uuid4()),
            "invoice_id": bill_doc["id"],
            "invoice_type": "staff_bill",
            "patient_name": bill.patient_name,
            "patient_phone": bill.patient_phone,
            "patient_email": bill.patient_email,
            "service_type": "mixed",
            "amount_due": final_total,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Send email invoice if email provided
    if bill.patient_email:
        background_tasks.add_task(send_email_invoice, bill_doc)
    
    return {
        "success": True,
        "bill": {
            "id": bill_doc["id"],
            "bill_number": bill_doc["bill_number"],
            "final_total": final_total,
            "payment_status": payment_status,
            "loyalty_discount": loyalty_discount
        }
    }

async def get_patient_loyalty(phone: str):
    """Get patient's available loyalty points"""
    db = get_db()
    
    # Get all earned points
    earned = await db.loyalty_transactions.find(
        {"patient_phone": phone},
        {"_id": 0, "points_earned": 1}
    ).to_list(1000)
    total_earned = sum(t.get("points_earned", 0) for t in earned)
    
    # Get all used points
    used = await db.loyalty_redemptions.find(
        {"patient_phone": phone},
        {"_id": 0, "points_used": 1}
    ).to_list(1000)
    total_used = sum(r.get("points_used", 0) for r in used)
    
    return {
        "total_earned": total_earned,
        "total_used": total_used,
        "available_points": total_earned - total_used
    }

@router.get("/patient-loyalty/{phone}")
async def get_patient_loyalty_api(phone: str):
    """API endpoint to get patient loyalty info"""
    return await get_patient_loyalty(phone)

async def send_email_invoice(bill: dict):
    """Send invoice email to patient"""
    from server import send_notification
    
    # Build email content
    items_html = ""
    for item in bill["items"]:
        items_html += f"""
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">{item['item_name']}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">{item['quantity']}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹{item['unit_price']}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹{item['net_total']:.2f}</td>
        </tr>
        """
    
    email_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0891b2, #0e7490); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">NEVIKA CURA</h1>
            <p style="margin: 5px 0 0 0;">Healthcare Services</p>
        </div>
        
        <div style="padding: 20px;">
            <h2 style="color: #0891b2; margin-top: 0;">Invoice</h2>
            <p><strong>Bill Number:</strong> {bill['bill_number']}</p>
            <p><strong>Date:</strong> {datetime.now().strftime('%d %b %Y, %I:%M %p')}</p>
            <p><strong>Patient:</strong> {bill['patient_name']}</p>
            <p><strong>Phone:</strong> {bill['patient_phone']}</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                    <tr style="background: #f3f4f6;">
                        <th style="padding: 10px; text-align: left;">Item</th>
                        <th style="padding: 10px; text-align: center;">Qty</th>
                        <th style="padding: 10px; text-align: right;">Price</th>
                        <th style="padding: 10px; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {items_html}
                </tbody>
            </table>
            
            <div style="text-align: right; margin-top: 20px;">
                <p><strong>Subtotal:</strong> ₹{bill['subtotal']:.2f}</p>
                {"<p><strong>Loyalty Discount:</strong> -₹" + f"{bill['loyalty_discount']:.2f}</p>" if bill.get('loyalty_discount', 0) > 0 else ""}
                {"<p><strong>Discount:</strong> -₹" + f"{bill['discount_amount']:.2f}</p>" if bill.get('discount_amount', 0) > 0 else ""}
                <p style="font-size: 1.2em; color: #0891b2;"><strong>Total: ₹{bill['final_total']:.2f}</strong></p>
                <p><strong>Status:</strong> <span style="color: {'green' if bill['payment_status'] == 'paid' else 'orange'};">{bill['payment_status'].upper()}</span></p>
            </div>
            
            <div style="margin-top: 30px; padding: 15px; background: #f0f9ff; border-radius: 8px;">
                <p style="margin: 0; color: #0891b2;"><strong>Thank you for choosing Nevika Cura!</strong></p>
                <p style="margin: 5px 0 0 0; font-size: 0.9em; color: #666;">For any queries, please contact us.</p>
            </div>
        </div>
        
        <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 0.8em; color: #666;">
            <p style="margin: 0;">Nevika Cura Healthcare Services</p>
            <p style="margin: 5px 0 0 0;">This is an auto-generated invoice. Please keep it for your records.</p>
        </div>
    </div>
    """
    
    await send_notification(
        patient_phone=bill["patient_phone"],
        patient_email=bill["patient_email"],
        patient_subject=f"Invoice {bill['bill_number']} - Nevika Cura",
        patient_body=email_body,
        staff_phone=None,
        staff_subject=None,
        staff_body=None
    )

# ==================== BILL MANAGEMENT ====================

@router.get("/bills")
async def get_bills(
    date: Optional[str] = None,
    clinic: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50
):
    """Get bills list"""
    db = get_db()
    
    query = {}
    if date:
        query["created_at"] = {"$regex": f"^{date}"}
    if clinic:
        query["clinic"] = clinic
    if status:
        query["payment_status"] = status
    
    bills = await db.staff_bills.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"bills": bills}

@router.get("/bills/{bill_id}")
async def get_bill(bill_id: str):
    """Get single bill details"""
    db = get_db()
    
    bill = await db.staff_bills.find_one({"id": bill_id}, {"_id": 0})
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    return bill

@router.post("/bills/{bill_id}/record-payment")
async def record_bill_payment(
    bill_id: str,
    amount: float,
    payment_method: str,
    reference: Optional[str] = None
):
    """Record payment for a bill"""
    db = get_db()
    
    bill = await db.staff_bills.find_one({"id": bill_id}, {"_id": 0})
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    current_paid = bill.get("amount_paid", 0)
    new_paid = current_paid + amount
    new_due = bill["final_total"] - new_paid
    
    new_status = "paid" if new_due <= 0 else "partial"
    
    await db.staff_bills.update_one(
        {"id": bill_id},
        {"$set": {
            "amount_paid": new_paid,
            "amount_due": max(0, new_due),
            "payment_status": new_status,
            "payment_method": payment_method
        }}
    )
    
    # Update due payments
    await db.due_payments.update_one(
        {"invoice_id": bill_id},
        {"$set": {"amount_due": max(0, new_due), "status": new_status}}
    )
    
    return {
        "success": True,
        "payment_status": new_status,
        "amount_paid": new_paid,
        "amount_due": max(0, new_due)
    }

@router.post("/bills/{bill_id}/send-invoice")
async def resend_invoice(bill_id: str, background_tasks: BackgroundTasks):
    """Resend invoice email"""
    db = get_db()
    
    bill = await db.staff_bills.find_one({"id": bill_id}, {"_id": 0})
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    if not bill.get("patient_email"):
        raise HTTPException(status_code=400, detail="No email address on file")
    
    background_tasks.add_task(send_email_invoice, bill)
    
    return {"success": True, "message": f"Invoice sent to {bill['patient_email']}"}
