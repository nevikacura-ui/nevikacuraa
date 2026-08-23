"""
Pharmacy Trending & Recently Viewed APIs
"""
from fastapi import APIRouter, Query
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


def get_db():
    from server import db
    return db


@router.get("/pharmacy/trending")
async def get_trending_medicines(store: str = "orange_pharmacy", limit: int = 12):
    """Get trending medicines based on order frequency in last 30 days."""
    db = get_db()
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

    # Aggregate most-ordered medicines from pharmacy_orders
    pipeline = [
        {"$match": {"created_at": {"$gte": thirty_days_ago}, "status": {"$nin": ["cancelled"]}}},
        {"$unwind": "$medicines"},
        {"$group": {"_id": "$medicines.name", "order_count": {"$sum": 1}, "total_qty": {"$sum": "$medicines.quantity"}}},
        {"$sort": {"order_count": -1}},
        {"$limit": limit * 2}
    ]

    trending_names = []
    async for doc in db.pharmacy_orders.aggregate(pipeline):
        if doc["_id"]:
            trending_names.append(doc["_id"])

    if not trending_names:
        # Fallback: starred products with images
        cursor = db.medicines.find(
            {"store": store, "is_starred": True, "mrp": {"$gt": 0}},
            {"_id": 0, "id": 1, "name": 1, "price": 1, "mrp": 1, "sale_price": 1, "image_url": 1, "manufacturer": 1, "form": 1, "is_starred": 1, "source": 1, "category": 1, "discount_percent": 1}
        ).sort([("priority", -1), ("name", 1)]).limit(limit)
        results = []
        async for med in cursor:
            results.append(med)
        return {"trending": results, "source": "starred_fallback"}

    # Fetch medicine details
    results = []
    for name in trending_names[:limit]:
        med = await db.medicines.find_one(
            {"name": name, "store": store},
            {"_id": 0, "id": 1, "name": 1, "price": 1, "image_url": 1, "manufacturer": 1, "form": 1, "is_starred": 1}
        )
        if med:
            results.append(med)

    if len(results) < 6:
        # Supplement with starred products
        existing_ids = {r["id"] for r in results}
        cursor = db.medicines.find(
            {"store": store, "is_starred": True, "image_url": {"$nin": ["", None]}, "id": {"$nin": list(existing_ids)}},
            {"_id": 0, "id": 1, "name": 1, "price": 1, "image_url": 1, "manufacturer": 1, "form": 1, "is_starred": 1}
        ).sort("name", 1).limit(limit - len(results))
        async for med in cursor:
            results.append(med)

    return {"trending": results, "source": "orders"}


@router.post("/pharmacy/track-view")
async def track_medicine_view(medicine_id: str, store: str = "orange_pharmacy"):
    """Track a medicine view for analytics. Lightweight."""
    db = get_db()
    await db.medicine_views.update_one(
        {"medicine_id": medicine_id},
        {
            "$inc": {"view_count": 1},
            "$set": {"last_viewed": datetime.now(timezone.utc).isoformat(), "store": store}
        },
        upsert=True
    )
    return {"tracked": True}


@router.get("/pharmacy/recently-viewed")
async def get_recently_viewed(ids: str = Query(..., description="Comma-separated medicine IDs")):
    """Get medicine details for recently viewed IDs (client-tracked)."""
    db = get_db()
    id_list = [i.strip() for i in ids.split(",") if i.strip()][:20]
    if not id_list:
        return {"medicines": []}

    results = []
    for mid in id_list:
        med = await db.medicines.find_one(
            {"id": mid},
            {"_id": 0, "id": 1, "name": 1, "price": 1, "image_url": 1, "manufacturer": 1, "form": 1, "is_starred": 1, "store": 1}
        )
        if med:
            results.append(med)

    return {"medicines": results}
