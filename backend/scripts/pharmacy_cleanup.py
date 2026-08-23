"""
Pharmacy cleanup script:
1. Deduplicate medicines (keep one with image + MRP)
2. Apply flat 15% discount (sale_price = MRP * 0.85)
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


async def deduplicate(db):
    """Find duplicates by name, keep the one with image_url + mrp > 0."""
    print("=== DEDUPLICATION ===")
    
    # Group by lowercase name to find duplicates
    pipeline = [
        {"$group": {
            "_id": {"$toLower": "$name"},
            "count": {"$sum": 1},
            "ids": {"$push": "$_id"},
        }},
        {"$match": {"count": {"$gt": 1}}},
        {"$limit": 50000}  # Process in batches
    ]
    
    duplicates = await db.medicines.aggregate(pipeline, allowDiskUse=True).to_list(50000)
    print(f"Found {len(duplicates)} duplicate groups")
    
    total_deleted = 0
    batch_count = 0
    
    for dup_group in duplicates:
        ids = dup_group["ids"]
        
        # Fetch all docs in this group
        docs = []
        for _id in ids:
            doc = await db.medicines.find_one({"_id": _id})
            if doc:
                docs.append(doc)
        
        if len(docs) <= 1:
            continue
        
        # Score each doc: prefer image + mrp
        def score(doc):
            s = 0
            if doc.get("image_url") and str(doc["image_url"]).strip():
                s += 2
            if doc.get("mrp") and doc["mrp"] > 0:
                s += 2
            if doc.get("sale_price") and doc["sale_price"] > 0:
                s += 1
            if doc.get("description") and str(doc["description"]).strip():
                s += 1
            return s
        
        # Sort by score descending, keep the best one
        docs.sort(key=score, reverse=True)
        keep = docs[0]
        delete_ids = [d["_id"] for d in docs[1:]]
        
        if delete_ids:
            result = await db.medicines.delete_many({"_id": {"$in": delete_ids}})
            total_deleted += result.deleted_count
            batch_count += 1
        
        if batch_count % 1000 == 0 and batch_count > 0:
            print(f"  Processed {batch_count} groups, deleted {total_deleted} so far...")
    
    print(f"Deduplication complete: deleted {total_deleted} duplicates from {len(duplicates)} groups")
    return total_deleted


async def apply_discount(db):
    """Apply flat 15% discount: sale_price = MRP * 0.85 for all products with MRP > 0."""
    print("\n=== APPLYING 15% DISCOUNT ===")
    
    # Count products that need update
    need_update = await db.medicines.count_documents({"mrp": {"$gt": 0}})
    print(f"Products with MRP > 0: {need_update}")
    
    # Batch update using aggregation pipeline update
    result = await db.medicines.update_many(
        {"mrp": {"$gt": 0}},
        [
            {"$set": {
                "sale_price": {"$round": [{"$multiply": ["$mrp", 0.85]}, 2]},
                "price": {"$round": [{"$multiply": ["$mrp", 0.85]}, 2]},
                "discount_percent": 15,
            }}
        ]
    )
    print(f"Updated {result.modified_count} products with 15% discount")
    
    # For products with MRP = 0, ensure sale_price is also 0
    result2 = await db.medicines.update_many(
        {"$or": [{"mrp": 0}, {"mrp": None}, {"mrp": {"$exists": False}}]},
        {"$set": {"sale_price": 0, "price": 0, "discount_percent": 0}}
    )
    print(f"Set {result2.modified_count} zero-MRP products to price 0")
    
    return result.modified_count


async def verify(db):
    """Verify the results."""
    print("\n=== VERIFICATION ===")
    total = await db.medicines.count_documents({})
    with_mrp = await db.medicines.count_documents({"mrp": {"$gt": 0}})
    with_discount = await db.medicines.count_documents({"discount_percent": 15})
    
    # Check store distribution
    for store in ["orange_pharmacy", "orange_healthplus"]:
        count = await db.medicines.count_documents({"store": store})
        with_price = await db.medicines.count_documents({"store": store, "mrp": {"$gt": 0}})
        print(f"  {store}: {count} total, {with_price} with MRP")
    
    # Sample a discounted product
    sample = await db.medicines.find_one(
        {"mrp": {"$gt": 0}, "discount_percent": 15},
        {"_id": 0, "name": 1, "mrp": 1, "sale_price": 1, "discount_percent": 1}
    )
    print(f"\n  Sample: {sample}")
    print(f"\n  Total: {total} | With MRP: {with_mrp} | With 15% discount: {with_discount}")


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    await deduplicate(db)
    await apply_discount(db)
    await verify(db)
    
    client.close()
    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
