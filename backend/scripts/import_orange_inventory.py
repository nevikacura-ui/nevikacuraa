"""
Import Orange Pharmacy inventory from parsed PDF data.
Clears existing inventory and replaces with new data.
Run: python3 scripts/import_orange_inventory.py
"""
import asyncio
import json
import os
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

async def import_inventory():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Load parsed data
    with open("/tmp/inventory_data.json", "r") as f:
        items = json.load(f)
    
    print(f"Loaded {len(items)} items from parsed PDF data")
    
    # Clear existing Orange Pharmacy inventory
    old_count = await db.pharmacy_inventory.count_documents({})
    if old_count > 0:
        result = await db.pharmacy_inventory.delete_many({})
        print(f"Cleared {result.deleted_count} existing items from pharmacy_inventory")
    
    # Prepare documents
    docs = []
    now = datetime.now(timezone.utc).isoformat()
    for item in items:
        docs.append({
            "id": str(uuid.uuid4()),
            "name": item["name"],
            "form": item["form"],
            "category": item["category"],
            "image_url": "",
            "mrp": item["mrp"],
            "sale_price": item["sale_price"],
            "discount_percent": item["discount_percent"],
            "stock": item["stock"],
            "unit": item["unit"],
            "description": "",
            "created_at": now,
            "created_by": "pdf_import",
            "source": "Stock_Summary_Report_28-03-2026",
        })
    
    # Bulk insert
    if docs:
        result = await db.pharmacy_inventory.insert_many(docs)
        print(f"Inserted {len(result.inserted_ids)} items into pharmacy_inventory")
    
    # Verify
    count = await db.pharmacy_inventory.count_documents({})
    print(f"Total items in pharmacy_inventory: {count}")
    
    # Sample
    sample = await db.pharmacy_inventory.find({}, {"_id": 0, "name": 1, "mrp": 1, "sale_price": 1, "discount_percent": 1}).limit(5).to_list(5)
    for s in sample:
        print(f"  {s['name']}: MRP ₹{s['mrp']} -> ₹{s['sale_price']} ({s['discount_percent']}% off)")
    
    client.close()
    print("\nDone!")

if __name__ == "__main__":
    asyncio.run(import_inventory())
