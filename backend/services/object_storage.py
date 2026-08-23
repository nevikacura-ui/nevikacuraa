"""
Emergent Object Storage Service for Nevika Cura
Handles file uploads (invoices, documents) to cloud storage
"""
import os
import uuid
import logging
import requests
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "nevika-cura"

storage_key: Optional[str] = None


def init_storage() -> str:
    """Initialize storage session. Call once at startup."""
    global storage_key
    if storage_key:
        return storage_key
    if not EMERGENT_KEY:
        raise ValueError("EMERGENT_LLM_KEY not configured")
    resp = requests.post(
        f"{STORAGE_URL}/init",
        json={"emergent_key": EMERGENT_KEY},
        timeout=30
    )
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    logger.info("Object storage initialized successfully")
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Upload file to object storage. Returns {"path": "...", "size": 123, "etag": "..."}"""
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120
    )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> Tuple[bytes, str]:
    """Download file from object storage. Returns (content_bytes, content_type)."""
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp", "pdf": "application/pdf",
    "json": "application/json", "csv": "text/csv", "txt": "text/plain"
}


def upload_invoice(order_id: str, filename: str, data: bytes, content_type: str) -> dict:
    """Upload invoice file and return storage path."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "pdf"
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/invoices/{order_id}/{file_id}.{ext}"
    result = put_object(path, data, content_type or MIME_TYPES.get(ext, "application/octet-stream"))
    logger.info(f"Invoice uploaded for order {order_id}: {result.get('path')}")
    return result


def get_invoice(storage_path: str) -> Tuple[bytes, str]:
    """Download invoice file from storage."""
    return get_object(storage_path)
