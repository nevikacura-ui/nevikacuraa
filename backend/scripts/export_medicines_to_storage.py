"""
Export medicines from local DB to object storage for production migration.
Exports in gzipped JSON chunks for efficient transfer.
"""
import asyncio
import json
import gzip
import os
import sys
import requests
import logging

from motor.motor_asyncio import AsyncIOMotorClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
CHUNK_SIZE = 10000  # medicines per chunk

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "nevika-cura"

# Essential fields to export (skip large/unnecessary fields)
PROJECTION = {
    "_id": 0,
    "id": 1, "name": 1, "category": 1, "mrp": 1, "sale_price": 1, "price": 1,
    "discount_percent": 1, "store": 1, "form": 1, "unit": 1,
    "generic_name": 1, "manufacturer": 1, "composition": 1,
    "description": 1, "uses": 1, "side_effects": 1,
    "prescription_required": 1, "image_url": 1, "is_active": 1,
    "product_id_ext": 1, "created_at": 1, "updated_at": 1,
    "images": 1, "is_formulary": 1
}


def init_storage():
    resp = requests.post(
        f"{STORAGE_URL}/init",
        json={"emergent_key": EMERGENT_KEY},
        timeout=30
    )
    resp.raise_for_status()
    return resp.json()["storage_key"]


def upload_chunk(storage_key, chunk_num, data_bytes):
    path = f"{APP_NAME}/medicine-migration/chunk_{chunk_num:04d}.json.gz"
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": storage_key, "Content-Type": "application/gzip"},
        data=data_bytes,
        timeout=180
    )
    resp.raise_for_status()
    return resp.json()


async def export_medicines():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    total = await db.medicines.count_documents({})
    logger.info(f"Total medicines to export: {total}")

    if not EMERGENT_KEY:
        logger.error("EMERGENT_LLM_KEY not set")
        return

    storage_key = init_storage()
    logger.info("Object storage initialized")

    chunk_num = 0
    exported = 0
    cursor = db.medicines.find({}, PROJECTION).sort("name", 1)

    batch = []
    async for doc in cursor:
        # Convert any non-serializable types
        for k, v in doc.items():
            if hasattr(v, 'isoformat'):
                doc[k] = v.isoformat()
        batch.append(doc)

        if len(batch) >= CHUNK_SIZE:
            # Compress and upload
            json_bytes = json.dumps(batch, default=str).encode("utf-8")
            compressed = gzip.compress(json_bytes, compresslevel=6)
            
            result = upload_chunk(storage_key, chunk_num, compressed)
            exported += len(batch)
            logger.info(f"Chunk {chunk_num}: {len(batch)} medicines ({len(compressed) / 1024:.0f} KB compressed) -> {result.get('path')}")
            
            batch = []
            chunk_num += 1

    # Upload remaining
    if batch:
        json_bytes = json.dumps(batch, default=str).encode("utf-8")
        compressed = gzip.compress(json_bytes, compresslevel=6)
        result = upload_chunk(storage_key, chunk_num, compressed)
        exported += len(batch)
        logger.info(f"Chunk {chunk_num}: {len(batch)} medicines ({len(compressed) / 1024:.0f} KB compressed) -> {result.get('path')}")
        chunk_num += 1

    # Upload manifest
    manifest = {
        "total_medicines": exported,
        "chunks": chunk_num,
        "chunk_size": CHUNK_SIZE,
        "version": "1.0"
    }
    manifest_bytes = json.dumps(manifest).encode("utf-8")
    requests.put(
        f"{STORAGE_URL}/objects/{APP_NAME}/medicine-migration/manifest.json",
        headers={"X-Storage-Key": storage_key, "Content-Type": "application/json"},
        data=manifest_bytes,
        timeout=30
    ).raise_for_status()

    logger.info(f"\nExport complete! {exported} medicines in {chunk_num} chunks")
    logger.info(f"Manifest uploaded to {APP_NAME}/medicine-migration/manifest.json")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(export_medicines())
