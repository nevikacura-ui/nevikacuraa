"""
Medicine Image Upload API - No Login Required
Simple endpoints to add images to medicines
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
import os
import base64
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/medicine-images", tags=["Medicine Images"])

# Database reference
db = None

def set_db(database):
    global db
    db = database

# Models
class MedicineImageUpdate(BaseModel):
    medicine_name: str
    image_url: str

class BulkImageUpdate(BaseModel):
    images: List[MedicineImageUpdate]

class MedicineSearchResult(BaseModel):
    name: str
    form: str
    image: Optional[str] = None
    has_image: bool = False

# Simple endpoint to update single medicine image
@router.post("/update")
async def update_medicine_image(data: MedicineImageUpdate):
    """Update image for a single medicine - NO LOGIN REQUIRED"""
    
    # Update in medicines_catalog collection
    result = await db.medicines_catalog.update_one(
        {"name": {"$regex": f"^{data.medicine_name}$", "$options": "i"}},
        {"$set": {"image": data.image_url, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        # Medicine not in catalog, try to add it
        # First check if it exists in inventory
        from data.medicine_inventory import MEDICINE_INVENTORY
        found = next((m for m in MEDICINE_INVENTORY if m["name"].lower() == data.medicine_name.lower()), None)
        
        if found:
            # Add to catalog with image
            await db.medicines_catalog.insert_one({
                "id": str(uuid.uuid4()),
                "name": found["name"],
                "form": found.get("form", "Medicine"),
                "category": found.get("category", "General"),
                "image": data.image_url,
                "price": 0,
                "stock": 0,
                "active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
            return {"success": True, "message": f"Added {data.medicine_name} with image", "action": "created"}
        else:
            return {"success": False, "message": f"Medicine '{data.medicine_name}' not found in inventory"}
    
    return {"success": True, "message": f"Updated image for {data.medicine_name}", "action": "updated"}

# Bulk update endpoint
@router.post("/bulk-update")
async def bulk_update_images(data: BulkImageUpdate):
    """Update images for multiple medicines at once - NO LOGIN REQUIRED"""
    
    results = {"updated": 0, "created": 0, "failed": [], "success": []}
    
    for item in data.images:
        try:
            result = await update_medicine_image(item)
            if result.get("success"):
                if result.get("action") == "created":
                    results["created"] += 1
                else:
                    results["updated"] += 1
                results["success"].append(item.medicine_name)
            else:
                results["failed"].append({"name": item.medicine_name, "reason": result.get("message")})
        except Exception as e:
            results["failed"].append({"name": item.medicine_name, "reason": str(e)})
    
    return {
        "success": True,
        "summary": f"Updated: {results['updated']}, Created: {results['created']}, Failed: {len(results['failed'])}",
        "details": results
    }

# Search medicines (to find names for image upload)
@router.get("/search")
async def search_medicines(q: str = "", limit: int = 50):
    """Search medicines by name - NO LOGIN REQUIRED"""
    from data.medicine_inventory import MEDICINE_INVENTORY
    
    if not q:
        # Return first 50 medicines
        medicines = MEDICINE_INVENTORY[:limit]
    else:
        # Filter by name
        q_lower = q.lower()
        medicines = [m for m in MEDICINE_INVENTORY if q_lower in m["name"].lower()][:limit]
    
    # Check which ones have images
    results = []
    for med in medicines:
        # Check if image exists in catalog
        catalog_entry = await db.medicines_catalog.find_one(
            {"name": {"$regex": f"^{med['name']}$", "$options": "i"}},
            {"_id": 0, "image": 1}
        )
        
        results.append({
            "name": med["name"],
            "form": med.get("form", "Medicine"),
            "image": catalog_entry.get("image") if catalog_entry else None,
            "has_image": bool(catalog_entry and catalog_entry.get("image"))
        })
    
    return {
        "total": len(results),
        "medicines": results
    }

# Get medicines without images
@router.get("/without-images")
async def get_medicines_without_images(page: int = 1, per_page: int = 100):
    """Get list of medicines that don't have images - NO LOGIN REQUIRED"""
    from data.medicine_inventory import MEDICINE_INVENTORY
    
    # Get all medicines with images from catalog
    catalog_with_images = await db.medicines_catalog.find(
        {"image": {"$exists": True, "$ne": None, "$ne": ""}},
        {"_id": 0, "name": 1}
    ).to_list(None)
    
    names_with_images = {m["name"].lower() for m in catalog_with_images}
    
    # Filter inventory to get medicines without images
    without_images = [m for m in MEDICINE_INVENTORY if m["name"].lower() not in names_with_images]
    
    # Paginate
    start = (page - 1) * per_page
    end = start + per_page
    paginated = without_images[start:end]
    
    return {
        "total_without_images": len(without_images),
        "total_medicines": len(MEDICINE_INVENTORY),
        "page": page,
        "per_page": per_page,
        "medicines": [{"name": m["name"], "form": m.get("form", "Medicine")} for m in paginated]
    }

# Stats endpoint
@router.get("/stats")
async def get_image_stats():
    """Get statistics about medicine images - NO LOGIN REQUIRED"""
    from data.medicine_inventory import MEDICINE_INVENTORY
    
    total = len(MEDICINE_INVENTORY)
    
    # Count medicines with images in catalog
    with_images = await db.medicines_catalog.count_documents({
        "image": {"$exists": True, "$ne": None, "$ne": ""}
    })
    
    return {
        "total_medicines": total,
        "with_images": with_images,
        "without_images": total - with_images,
        "percentage_complete": round((with_images / total) * 100, 1) if total > 0 else 0
    }

# CSV format endpoint for easy data entry
@router.post("/upload-csv")
async def upload_csv_images(csv_data: str = Form(...)):
    """
    Upload medicine images via CSV format - NO LOGIN REQUIRED
    Format: medicine_name,image_url (one per line)
    Example:
    PARACETAMOL 500MG,https://example.com/paracetamol.jpg
    CROCIN ADVANCE,https://example.com/crocin.jpg
    """
    lines = csv_data.strip().split('\n')
    results = {"updated": 0, "created": 0, "failed": []}
    
    for line in lines:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        
        parts = line.split(',', 1)
        if len(parts) != 2:
            results["failed"].append({"line": line, "reason": "Invalid format"})
            continue
        
        medicine_name, image_url = parts[0].strip(), parts[1].strip()
        
        if not medicine_name or not image_url:
            results["failed"].append({"line": line, "reason": "Empty name or URL"})
            continue
        
        try:
            data = MedicineImageUpdate(medicine_name=medicine_name, image_url=image_url)
            result = await update_medicine_image(data)
            if result.get("success"):
                if result.get("action") == "created":
                    results["created"] += 1
                else:
                    results["updated"] += 1
            else:
                results["failed"].append({"name": medicine_name, "reason": result.get("message")})
        except Exception as e:
            results["failed"].append({"name": medicine_name, "reason": str(e)})
    
    return {
        "success": True,
        "summary": f"Updated: {results['updated']}, Created: {results['created']}, Failed: {len(results['failed'])}",
        "details": results
    }
