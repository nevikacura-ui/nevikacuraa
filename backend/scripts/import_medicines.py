"""
Import medicines from Google Sheets data into MongoDB.
Medicines (prescription_required) -> Orange Pharmacy
OTC (no prescription_required) -> Orange HealthPlus
"""
import csv
import io
import uuid
import asyncio
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "nevikacura")

async def import_from_csv(csv_text: str):
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    reader = csv.DictReader(io.StringIO(csv_text))
    
    pharmacy_count = 0
    healthplus_count = 0
    errors = []
    
    for i, row in enumerate(reader):
        try:
            name = (row.get("Product Name") or "").strip()
            if not name:
                continue
            
            mrp_str = (row.get("MRP") or "0").strip()
            try:
                mrp = float(mrp_str)
            except:
                mrp = 0
            
            rx_required = (row.get("prescription_required") or "").strip()
            is_prescription = rx_required.lower() == "prescription required"
            
            store = "orange_pharmacy" if is_prescription else "orange_healthplus"
            
            image_urls = (row.get("Image URL") or "").strip()
            first_image = image_urls.split("|")[0].strip().replace("\\", "") if image_urls else ""
            
            med_data = {
                "name": name,
                "product_id": (row.get("Product ID") or "").strip(),
                "generic_name": (row.get("Composition") or "").strip(),
                "manufacturer": (row.get("Marketer") or "").strip(),
                "category": (row.get("primary_use") or "General").strip(),
                "unit": (row.get("Product Form") or "Tablet").strip(),
                "mrp": mrp,
                "purchase_price": 0,
                "discount_percent": 0,
                "sale_price": mrp,
                "stock_quantity": 0,
                "batch_no": "",
                "expiry": "",
                "hsn_code": "",
                "barcode": "",
                "description": (row.get("description") or "").strip()[:500],
                "packaging": (row.get("Packaging Detail") or "").strip(),
                "prescription_required": is_prescription,
                "store": store,
                "image_url": first_image,
                "side_effects": (row.get("common_side_effect") or "").strip()[:300],
                "storage": (row.get("storage") or "").strip(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            
            existing = await db.medicines.find_one(
                {"$or": [
                    {"product_id": med_data["product_id"]},
                    {"name": {"$regex": f"^{name}$", "$options": "i"}}
                ]},
                {"_id": 1}
            )
            
            if existing:
                await db.medicines.update_one({"_id": existing["_id"]}, {"$set": med_data})
            else:
                med_data["id"] = str(uuid.uuid4())
                med_data["created_at"] = datetime.now(timezone.utc).isoformat()
                med_data["created_by"] = "CSV Import"
                await db.medicines.insert_one(med_data)
                med_data.pop("_id", None)
            
            if is_prescription:
                pharmacy_count += 1
            else:
                healthplus_count += 1
                
            if (i + 1) % 50 == 0:
                print(f"  Processed {i+1} rows...")
                
        except Exception as e:
            errors.append(f"Row {i+2}: {str(e)}")
    
    await db.medicines.create_index("store")
    await db.medicines.create_index("product_id")
    await db.medicines.create_index([("name", 1)])
    
    client.close()
    return {
        "pharmacy_medicines": pharmacy_count,
        "healthplus_otc": healthplus_count,
        "errors_count": len(errors),
        "errors": errors[:10],
        "total": pharmacy_count + healthplus_count
    }

async def main():
    csv_path = "/tmp/medicines_import.csv"
    
    if os.path.exists(csv_path):
        with open(csv_path, "r", encoding="utf-8") as f:
            csv_text = f.read()
        print(f"CSV loaded ({len(csv_text)} bytes)")
        result = await import_from_csv(csv_text)
        print(f"\nImport complete!")
        print(f"  Orange Pharmacy (Rx): {result['pharmacy_medicines']}")
        print(f"  Orange HealthPlus (OTC): {result['healthplus_otc']}")
        print(f"  Total: {result['total']}")
        if result['errors']:
            print(f"  Errors: {result['errors']}")
    else:
        print("No CSV file found. Run with CSV at /tmp/medicines_import.csv")

if __name__ == "__main__":
    asyncio.run(main())
