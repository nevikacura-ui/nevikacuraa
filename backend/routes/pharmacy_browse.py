"""
Optimized Pharmacy Browse API for 3L+ medicines
- Category-wise browsing with View More pattern
- Text-indexed search (10-100x faster than $regex)
- Server-side LRU cache for popular queries
"""

from fastapi import APIRouter, Query
from typing import Optional
import time
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pharmacy/v3", tags=["Pharmacy Browse V3"])

db = None

def set_db(database):
    global db
    db = database


# In-memory cache with TTL (5 min)
_cache = {}
_CACHE_TTL = 300  # 5 minutes

def cache_get(key):
    entry = _cache.get(key)
    if entry and (time.time() - entry["ts"]) < _CACHE_TTL:
        return entry["data"]
    return None

def cache_set(key, data):
    # Limit cache size to 500 entries
    if len(_cache) > 500:
        oldest = sorted(_cache.items(), key=lambda x: x[1]["ts"])[:100]
        for k, _ in oldest:
            _cache.pop(k, None)
    _cache[key] = {"data": data, "ts": time.time()}


@router.get("/categories")
async def get_categories_with_counts():
    """Get all categories with their medicine counts"""
    cache_key = "cat_counts"
    cached = cache_get(cache_key)
    if cached:
        return cached

    pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    
    results = await db.medicines.aggregate(pipeline).to_list(100)
    
    categories = []
    for r in results:
        cat = r["_id"]
        if cat and str(cat).strip():
            categories.append({"name": cat, "count": r["count"]})
    
    total = sum(c["count"] for c in categories)
    response = {"success": True, "categories": categories, "total": total}
    cache_set(cache_key, response)
    return response


@router.get("/browse")
async def browse_by_category(
    per_category: int = Query(8, ge=1, le=30),
    section: str = Query("all", description="Filter by store section: orange_pharmacy, orange_healthplus, all"),
):
    """
    Category-wise medicine browsing — returns top N medicines per category.
    Supports section filtering for Orange Pharmacy vs Orange Healthplus.
    """
    cache_key = f"browse_{per_category}_{section}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    base_filter = {}
    if section and section != "all":
        base_filter["store"] = section

    pipeline = [
        {"$match": base_filter} if base_filter else {"$match": {}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    cat_counts = await db.medicines.aggregate(pipeline).to_list(50)
    
    sections = []
    for cat_info in cat_counts:
        cat_name = cat_info["_id"]
        if not cat_name or not str(cat_name).strip():
            continue
        
        query = {"category": cat_name, **base_filter}
        meds = await db.medicines.find(
            query, {"_id": 0}
        ).sort([("priority", -1), ("name", 1)]).limit(per_category).to_list(per_category)
        
        for m in meds:
            if "id" not in m:
                m["id"] = m.get("barcode") or m.get("name", "").replace(" ", "_")
        
        sections.append({
            "category": cat_name,
            "total": cat_info["count"],
            "medicines": meds,
            "has_more": cat_info["count"] > per_category
        })
    
    total = sum(c["count"] for c in cat_counts)
    response = {"success": True, "sections": sections, "total_medicines": total, "section": section}
    cache_set(cache_key, response)
    return response


FEATURED_BRANDS = ["Minimalist", "The Derma Co", "Aqualogica", "Cetaphil", "Biluma"]

@router.get("/featured-brands")
async def get_featured_brands(per_brand: int = Query(6, ge=1, le=20)):
    """Get featured brand products for the 'Orange Healthplus' section"""
    cache_key = f"featured_brands_{per_brand}"
    cached = cache_get(cache_key)
    if cached:
        return cached
    
    if db is None:
        logger.error("DB is None in featured-brands endpoint")
        return {"success": True, "brands": []}
    
    brands = []
    for brand_name in FEATURED_BRANDS:
        try:
            meds = await db.medicines.find(
                {"manufacturer": brand_name, "mrp": {"$gt": 0}}, {"_id": 0}
            ).sort("name", 1).limit(per_brand).to_list(per_brand)
            
            total = await db.medicines.count_documents({"manufacturer": brand_name, "mrp": {"$gt": 0}})
            
            for m in meds:
                if "id" not in m:
                    m["id"] = m.get("barcode") or m.get("name", "").replace(" ", "_")
            
            if meds:
                brands.append({
                    "brand": brand_name,
                    "total": total,
                    "medicines": meds,
                    "has_more": total > per_brand
                })
        except Exception as e:
            logger.error(f"Error fetching brand {brand_name}: {e}")
    
    response = {"success": True, "brands": brands}
    cache_set(cache_key, response)
    return response


@router.get("/category/{category_name}")
async def get_category_medicines(
    category_name: str,
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100),
    sort: str = "name",
    section: str = Query("all", description="Filter by store section")
):
    """Get paginated medicines for a specific category — for 'View More' page"""
    query = {"category": {"$regex": f"^{category_name}$", "$options": "i"}}
    if section and section != "all":
        query["store"] = section
    
    skip = (page - 1) * limit
    sort_field = "name" if sort == "name" else "mrp" if sort == "price" else "name"
    sort_dir = 1 if sort != "price_desc" else -1
    
    total = await db.medicines.count_documents(query)
    meds = await db.medicines.find(
        query, {"_id": 0}
    ).sort([("priority", -1), (sort_field, sort_dir)]).skip(skip).limit(limit).to_list(limit)
    
    for m in meds:
        if "id" not in m:
            m["id"] = m.get("barcode") or m.get("name", "").replace(" ", "_")
    
    return {
        "success": True,
        "category": category_name,
        "medicines": meds,
        "total": total,
        "page": page,
        "pages": max(1, (total + limit - 1) // limit),
        "has_more": skip + limit < total
    }


@router.get("/search")
async def fast_search(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=50),
    page: int = Query(1, ge=1),
    section: str = Query("all", description="Filter by store section")
):
    """
    High-performance medicine search using MongoDB text index.
    Falls back to prefix-anchored regex if text search returns nothing.
    """
    if not q or not q.strip():
        return {"success": True, "medicines": [], "total": 0}
    
    q = q.strip()
    skip = (page - 1) * limit
    
    # Check cache for exact query
    cache_key = f"search_{q.lower()}_{page}_{limit}"
    cached = cache_get(cache_key)
    if cached:
        return cached
    
    # Strategy 1: Text index search (fastest for multi-word queries)
    # Prioritize products with images and actual prices (mrp > 0) at the top
    try:
        text_query = {"$text": {"$search": q}}
        total = await db.medicines.count_documents(text_query)
        if total > 0:
            # First: products with images AND price
            img_priced = await db.medicines.find(
                {"$text": {"$search": q}, "mrp": {"$gt": 0}, "image_url": {"$nin": [None, "", "null"]}},
                {"_id": 0, "score": {"$meta": "textScore"}}
            ).sort([("score", {"$meta": "textScore"})]).limit(limit).to_list(limit)

            meds = img_priced
            seen_names = {m["name"] for m in meds}

            # Second: products with images but no price
            if len(meds) < limit:
                img_no_price = await db.medicines.find(
                    {"$text": {"$search": q}, "image_url": {"$nin": [None, "", "null"]}},
                    {"_id": 0, "score": {"$meta": "textScore"}}
                ).sort([("score", {"$meta": "textScore"})]).limit(limit).to_list(limit)
                for m in img_no_price:
                    if m["name"] not in seen_names and len(meds) < limit:
                        meds.append(m)
                        seen_names.add(m["name"])

            # Third: products with price but no image
            if len(meds) < limit:
                priced_no_img = await db.medicines.find(
                    {"$text": {"$search": q}, "mrp": {"$gt": 0}},
                    {"_id": 0, "score": {"$meta": "textScore"}}
                ).sort([("score", {"$meta": "textScore"})]).limit(limit).to_list(limit)
                for m in priced_no_img:
                    if m["name"] not in seen_names and len(meds) < limit:
                        meds.append(m)
                        seen_names.add(m["name"])

            # Finally: fill remaining from all matches
            if len(meds) < limit:
                all_meds = await db.medicines.find(
                    text_query,
                    {"_id": 0, "score": {"$meta": "textScore"}}
                ).sort([("score", {"$meta": "textScore"})]).limit(limit * 2).to_list(limit * 2)
                for m in all_meds:
                    if m["name"] not in seen_names and len(meds) < limit:
                        meds.append(m)
                        seen_names.add(m["name"])
            
            for m in meds:
                m.pop("score", None)
                if "id" not in m:
                    m["id"] = m.get("barcode") or m.get("name", "").replace(" ", "_")
            
            response = {
                "success": True, "medicines": meds, "total": total,
                "page": page, "pages": max(1, (total + limit - 1) // limit),
                "search_method": "text_index"
            }
            cache_set(cache_key, response)
            return response
    except Exception as e:
        logger.debug(f"Text search fallback: {e}")
    
    # Strategy 2: Prefix-anchored regex (uses name index, fast for startsWith)
    prefix_query = {"name": {"$regex": f"^{q}", "$options": "i"}}
    total = await db.medicines.count_documents(prefix_query)
    if total > 0:
        meds = await db.medicines.find(
            prefix_query, {"_id": 0}
        ).sort("name", 1).skip(skip).limit(limit).to_list(limit)
        
        for m in meds:
            if "id" not in m:
                m["id"] = m.get("barcode") or m.get("name", "").replace(" ", "_")
        
        response = {
            "success": True, "medicines": meds, "total": total,
            "page": page, "pages": max(1, (total + limit - 1) // limit),
            "search_method": "prefix_index"
        }
        cache_set(cache_key, response)
        return response
    
    # Strategy 3: Fuzzy regex (slowest, but catches partial matches)
    fuzzy_query = {
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"generic_name": {"$regex": q, "$options": "i"}},
            {"manufacturer": {"$regex": q, "$options": "i"}},
            {"composition": {"$regex": q, "$options": "i"}}
        ]
    }
    total = await db.medicines.count_documents(fuzzy_query)
    meds = await db.medicines.find(
        fuzzy_query, {"_id": 0}
    ).sort("name", 1).skip(skip).limit(limit).to_list(limit)
    
    for m in meds:
        if "id" not in m:
            m["id"] = m.get("barcode") or m.get("name", "").replace(" ", "_")
    
    response = {
        "success": True, "medicines": meds, "total": total,
        "page": page, "pages": max(1, (total + limit - 1) // limit),
        "search_method": "fuzzy_regex"
    }
    cache_set(cache_key, response)
    return response



@router.get("/brands")
async def get_brands(
    section: str = Query("all", description="Filter by store section"),
    limit: int = Query(50, ge=1, le=200)
):
    """Get all brands (manufacturers) with product counts for Shop by Brand."""
    cache_key = f"brands_{section}_{limit}"
    cached = cache_get(cache_key)
    if cached:
        return cached
    
    match_filter = {"manufacturer": {"$exists": True, "$nin": [None, ""]}}
    if section and section != "all":
        match_filter["store"] = section
    
    pipeline = [
        {"$match": match_filter},
        {"$group": {
            "_id": "$manufacturer",
            "count": {"$sum": 1},
            "has_image": {"$sum": {"$cond": [{"$and": [{"$ne": ["$image_url", ""]}, {"$ne": ["$image_url", None]}]}, 1, 0]}},
            "avg_mrp": {"$avg": "$mrp"},
        }},
        {"$match": {"count": {"$gte": 3}}},
        {"$sort": {"count": -1}},
        {"$limit": limit}
    ]
    
    results = await db.medicines.aggregate(pipeline, allowDiskUse=True).to_list(limit)
    
    brands = []
    for r in results:
        if r["_id"] and str(r["_id"]).strip():
            brands.append({
                "name": r["_id"],
                "count": r["count"],
                "has_images": r["has_image"] > 0,
            })
    
    response = {"success": True, "brands": brands, "total": len(brands)}
    cache_set(cache_key, response)
    return response


@router.get("/brand/{brand_name}")
async def get_brand_products(
    brand_name: str,
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100),
    section: str = Query("all"),
    sort: str = "name"
):
    """Get all products from a specific brand — for Shop by Brand page."""
    query = {"manufacturer": {"$regex": f"^{brand_name}$", "$options": "i"}}
    if section and section != "all":
        query["store"] = section
    
    skip = (page - 1) * limit
    sort_field = "name" if sort == "name" else "mrp" if sort == "price" else "name"
    sort_dir = 1 if sort != "price_desc" else -1
    
    total = await db.medicines.count_documents(query)
    meds = await db.medicines.find(
        query, {"_id": 0}
    ).sort([(sort_field, sort_dir)]).skip(skip).limit(limit).to_list(limit)
    
    for m in meds:
        if "id" not in m:
            m["id"] = m.get("barcode") or m.get("name", "").replace(" ", "_")
    
    return {
        "success": True,
        "brand": brand_name,
        "medicines": meds,
        "total": total,
        "page": page,
        "pages": max(1, (total + limit - 1) // limit),
        "has_more": skip + limit < total
    }


@router.get("/section-stats")
async def get_section_stats():
    """Get product counts per store section."""
    cache_key = "section_stats"
    cached = cache_get(cache_key)
    if cached:
        return cached
    
    pipeline = [
        {"$group": {"_id": "$store", "count": {"$sum": 1}, "with_mrp": {"$sum": {"$cond": [{"$gt": ["$mrp", 0]}, 1, 0]}}}},
        {"$sort": {"count": -1}}
    ]
    results = await db.medicines.aggregate(pipeline).to_list(10)
    
    stats = {}
    for r in results:
        if r["_id"]:
            stats[r["_id"]] = {"total": r["count"], "with_mrp": r["with_mrp"]}
    
    response = {"success": True, "stats": stats}
    cache_set(cache_key, response)
    return response
