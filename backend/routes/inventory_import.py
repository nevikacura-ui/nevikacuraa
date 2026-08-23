"""
Bulk Inventory Import via CSV upload for Orange Pharmacy.
Parses CSV files with medicine data and bulk-inserts into medicine_inventory.
"""

import os
import io
import csv
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Header
from pydantic import BaseModel
import jwt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/inventory", tags=["Inventory Import"])

db = None
JWT_SECRET = os.environ.get("JWT_SECRET", "nevika-cura-jwt-secret-key-2025")
JWT_ALGORITHM = "HS256"

def set_db(database):
    global db
    db = database

async def get_staff(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        return jwt.decode(authorization.replace("Bearer ", ""), JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


class ImportResult(BaseModel):
    success: bool
    imported: int
    skipped: int
    errors: list
    message: str


@router.post("/bulk-import", response_model=ImportResult)
async def bulk_import_medicines(file: UploadFile = File(...), staff=None):
    """
    Bulk import medicines from CSV.
    CSV columns: name, form, mrp, sale_price, category, stock, manufacturer, description
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    if not file.filename or not file.filename.lower().endswith('.csv'):
        raise HTTPException(status_code=400, detail="Please upload a CSV file")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum 5MB.")

    try:
        text = content.decode('utf-8-sig')
    except UnicodeDecodeError:
        try:
            text = content.decode('latin-1')
        except Exception:
            raise HTTPException(status_code=400, detail="Could not decode file. Please use UTF-8 encoding.")

    reader = csv.DictReader(io.StringIO(text))

    imported = 0
    skipped = 0
    errors = []
    batch = []

    for row_num, row in enumerate(reader, start=2):
        name = (row.get('name') or row.get('Name') or row.get('medicine_name') or '').strip()
        if not name:
            skipped += 1
            continue

        try:
            mrp_raw = row.get('mrp') or row.get('MRP') or row.get('price') or '0'
            mrp = float(str(mrp_raw).replace(',', '').replace('₹', '').strip() or '0')

            sale_raw = row.get('sale_price') or row.get('Sale Price') or row.get('selling_price') or ''
            sale_price = float(str(sale_raw).replace(',', '').replace('₹', '').strip()) if sale_raw.strip() else mrp

            stock_raw = row.get('stock') or row.get('Stock') or row.get('quantity') or '100'
            stock = int(float(str(stock_raw).strip() or '100'))

            doc = {
                "id": str(uuid.uuid4()),
                "name": name,
                "form": (row.get('form') or row.get('Form') or row.get('type') or 'Tablet').strip(),
                "mrp": mrp,
                "sale_price": sale_price,
                "discount_percent": round(((mrp - sale_price) / mrp * 100) if mrp > 0 and sale_price < mrp else 0, 1),
                "category": (row.get('category') or row.get('Category') or 'General').strip(),
                "manufacturer": (row.get('manufacturer') or row.get('Manufacturer') or row.get('brand') or '').strip(),
                "description": (row.get('description') or row.get('Description') or '').strip(),
                "stock": stock,
                "active": True,
                "imported_at": datetime.now(timezone.utc).isoformat(),
                "source": "bulk_csv_import",
            }
            batch.append(doc)

        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)[:80]}")
            if len(errors) > 50:
                break

    if batch:
        try:
            result = await db.medicine_inventory.insert_many(batch, ordered=False)
            imported = len(result.inserted_ids)
        except Exception as e:
            logger.error(f"Bulk insert error: {e}")
            errors.append(f"Database insert error: {str(e)[:100]}")

    logger.info(f"Bulk import: {imported} imported, {skipped} skipped, {len(errors)} errors")

    return ImportResult(
        success=imported > 0,
        imported=imported,
        skipped=skipped,
        errors=errors[:10],
        message=f"Imported {imported} medicines. {skipped} rows skipped." + (f" {len(errors)} errors." if errors else "")
    )


@router.get("/export-template")
async def get_csv_template():
    """Return a CSV template for bulk import"""
    from fastapi.responses import StreamingResponse

    template = "name,form,mrp,sale_price,category,stock,manufacturer,description\n"
    template += "Paracetamol 500mg,Tablet,25.00,22.50,Pain Relief,200,Cipla,Fever and pain relief\n"
    template += "Metformin 500mg,Tablet,45.00,40.00,Diabetes,150,Sun Pharma,Blood sugar control\n"

    return StreamingResponse(
        io.StringIO(template),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=medicine_import_template.csv"}
    )


@router.get("/stats")
async def get_inventory_stats():
    """Get inventory statistics"""
    if db is None:
        return {"total": 0, "low_stock": 0, "categories": []}

    try:
        total = await db.medicine_inventory.count_documents({})
        low_stock = await db.medicine_inventory.count_documents({"stock": {"$lt": 10}})

        pipeline = [
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        categories = []
        async for doc in db.medicine_inventory.aggregate(pipeline):
            categories.append({"name": doc["_id"] or "Uncategorized", "count": doc["count"]})

        return {"total": total, "low_stock": low_stock, "categories": categories}
    except Exception as e:
        logger.error(f"Inventory stats error: {e}")
        return {"total": 0, "low_stock": 0, "categories": []}
