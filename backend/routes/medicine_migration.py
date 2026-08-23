"""
One-time medicine migration endpoint.
Downloads medicine data from object storage and imports into the connected database.
Designed to be called once after deploying to a new/empty database.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
import json
import gzip
import logging
import asyncio
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin Migration"])

db = None
storage_module = None

def set_db(database):
    global db
    db = database

def set_storage(storage):
    global storage_module
    storage_module = storage


# Track migration status in-memory
_migration_status = {
    "running": False,
    "progress": 0,
    "total_chunks": 0,
    "imported": 0,
    "errors": [],
    "completed": False,
    "message": ""
}


async def _run_migration():
    """Background task: download chunks from object storage and insert into DB."""
    global _migration_status
    
    try:
        _migration_status["message"] = "Downloading manifest..."
        
        # Download manifest
        manifest_bytes, _ = storage_module.get_object("nevika-cura/medicine-migration/manifest.json")
        manifest = json.loads(manifest_bytes)
        
        total_chunks = manifest["chunks"]
        total_medicines = manifest["total_medicines"]
        _migration_status["total_chunks"] = total_chunks
        _migration_status["message"] = f"Starting import of {total_medicines} medicines in {total_chunks} chunks..."
        
        logger.info(f"Migration: {total_medicines} medicines in {total_chunks} chunks")
        
        imported = 0
        for chunk_num in range(total_chunks):
            try:
                _migration_status["message"] = f"Importing chunk {chunk_num + 1}/{total_chunks}..."
                _migration_status["progress"] = chunk_num
                
                # Download chunk
                path = f"nevika-cura/medicine-migration/chunk_{chunk_num:04d}.json.gz"
                compressed_bytes, _ = storage_module.get_object(path)
                
                # Decompress
                json_bytes = gzip.decompress(compressed_bytes)
                medicines = json.loads(json_bytes)
                
                # Bulk insert (skip duplicates by name)
                if medicines:
                    # Use ordered=False to continue on duplicate errors
                    try:
                        result = await db.medicines.insert_many(medicines, ordered=False)
                        imported += len(result.inserted_ids)
                    except Exception as bulk_err:
                        # BulkWriteError — some docs inserted, some duplicates skipped
                        err_str = str(bulk_err)
                        if "duplicate" in err_str.lower() or "E11000" in err_str:
                            # Count successful inserts from the error
                            if hasattr(bulk_err, 'details'):
                                imported += bulk_err.details.get('nInserted', 0)
                            else:
                                imported += len(medicines) // 2  # estimate
                            logger.info(f"Chunk {chunk_num}: some duplicates skipped")
                        else:
                            raise
                
                _migration_status["imported"] = imported
                logger.info(f"Chunk {chunk_num + 1}/{total_chunks}: {len(medicines)} medicines (total imported: {imported})")
                
                # Small delay to avoid overwhelming DB
                await asyncio.sleep(0.1)
                
            except Exception as chunk_err:
                error_msg = f"Chunk {chunk_num}: {str(chunk_err)[:200]}"
                _migration_status["errors"].append(error_msg)
                logger.error(error_msg)
        
        # Create indexes
        _migration_status["message"] = "Creating indexes..."
        try:
            await db.medicines.create_index("store")
            await db.medicines.create_index("category")
            await db.medicines.create_index([("name", 1)])
            await db.medicines.create_index("id", unique=True, sparse=True)
            await db.medicines.create_index(
                [("name", "text"), ("generic_name", "text"), ("manufacturer", "text"), ("composition", "text")],
                name="medicine_text_search"
            )
            logger.info("Indexes created successfully")
        except Exception as idx_err:
            logger.warning(f"Index creation (may already exist): {idx_err}")
        
        final_count = await db.medicines.count_documents({})
        _migration_status["completed"] = True
        _migration_status["imported"] = imported
        _migration_status["message"] = f"Migration complete! {imported} medicines imported. Total in DB: {final_count}"
        logger.info(_migration_status["message"])
        
    except Exception as e:
        _migration_status["message"] = f"Migration failed: {str(e)}"
        _migration_status["errors"].append(str(e))
        logger.error(f"Migration failed: {e}")
    finally:
        _migration_status["running"] = False


@router.post("/migrate-medicines")
async def start_medicine_migration(background_tasks: BackgroundTasks):
    """
    Start medicine data migration from object storage.
    Call this ONCE after deploying to a new database.
    Returns immediately — check progress at GET /api/admin/migrate-medicines/status
    """
    global _migration_status
    
    if _migration_status["running"]:
        return {"status": "already_running", "progress": _migration_status}
    
    if not storage_module:
        raise HTTPException(status_code=500, detail="Object storage not configured")
    
    # Check if medicines already exist
    existing = await db.medicines.count_documents({})
    if existing > 100000:
        return {
            "status": "skipped",
            "message": f"Database already has {existing} medicines. Migration not needed.",
            "existing_count": existing
        }
    
    # Reset status
    _migration_status = {
        "running": True,
        "progress": 0,
        "total_chunks": 0,
        "imported": 0,
        "errors": [],
        "completed": False,
        "message": "Starting migration..."
    }
    
    # Run in background
    background_tasks.add_task(_run_migration_wrapper)
    
    return {
        "status": "started",
        "message": "Medicine migration started in background. Check progress at GET /api/admin/migrate-medicines/status",
        "existing_count": existing
    }


async def _run_migration_wrapper():
    """Wrapper to run async migration in background."""
    await _run_migration()


@router.get("/migrate-medicines/status")
async def get_migration_status():
    """Check the current status of the medicine migration."""
    total_in_db = await db.medicines.count_documents({})
    return {
        **_migration_status,
        "total_in_db": total_in_db
    }
