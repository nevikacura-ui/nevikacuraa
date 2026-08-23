"""
Medical Records Vault
- Upload, categorize, search, download, delete medical documents
- Share records with doctors
- Categories: Prescription, Lab Report, Discharge Summary, Imaging, Vaccination, Insurance, Other
"""

import os
import uuid
import logging
import shutil
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel
from typing import Optional, List

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/medical-records", tags=["Medical Records Vault"])

db = None

UPLOAD_DIR = Path(__file__).parent.parent / "uploads" / "medical_records"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

ALLOWED_EXTENSIONS = {
    ".pdf", ".jpg", ".jpeg", ".png", ".webp", ".heic",
    ".doc", ".docx", ".xls", ".xlsx", ".txt", ".csv"
}

CATEGORIES = [
    "prescription", "lab_report", "discharge_summary",
    "imaging", "vaccination", "insurance", "other"
]

CATEGORY_LABELS = {
    "prescription": "Prescription",
    "lab_report": "Lab Report",
    "discharge_summary": "Discharge Summary",
    "imaging": "Imaging / X-Ray",
    "vaccination": "Vaccination Record",
    "insurance": "Insurance Document",
    "other": "Other",
}


def set_db(database):
    global db
    db = database


class RecordShareRequest(BaseModel):
    doctor_name: str
    doctor_phone: Optional[str] = None
    notes: Optional[str] = None


@router.post("/upload")
async def upload_record(
    file: UploadFile = File(...),
    phone: str = Form(...),
    category: str = Form("other"),
    title: str = Form(""),
    notes: str = Form(""),
    family_member: str = Form("self"),
    doctor_name: str = Form(""),
    record_date: str = Form(""),
):
    """Upload a medical record document."""
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed")

    if category not in CATEGORIES:
        category = "other"

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")

    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}{ext}"
    file_path = UPLOAD_DIR / safe_filename

    with open(file_path, "wb") as f:
        f.write(content)

    record = {
        "id": file_id,
        "phone": phone,
        "category": category,
        "title": title or file.filename,
        "original_filename": file.filename,
        "stored_filename": safe_filename,
        "file_size": len(content),
        "file_type": ext.lstrip("."),
        "notes": notes,
        "family_member": family_member,
        "doctor_name": doctor_name,
        "record_date": record_date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "shared_with": [],
        "is_starred": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.medical_records.insert_one(record)

    record.pop("_id", None)
    return {"success": True, "record": record, "message": "Record uploaded successfully"}


@router.get("/list/{phone}")
async def list_records(
    phone: str,
    category: Optional[str] = Query(None),
    family_member: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    starred_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """List medical records for a user with optional filters."""
    query = {"phone": phone}

    if category and category != "all":
        query["category"] = category
    if family_member and family_member != "all":
        query["family_member"] = family_member
    if starred_only:
        query["is_starred"] = True
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"notes": {"$regex": search, "$options": "i"}},
            {"doctor_name": {"$regex": search, "$options": "i"}},
        ]

    total = await db.medical_records.count_documents(query)
    records = await db.medical_records.find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)

    category_counts = {}
    for cat in CATEGORIES:
        count = await db.medical_records.count_documents({"phone": phone, "category": cat})
        if count > 0:
            category_counts[cat] = count

    return {
        "success": True,
        "records": records,
        "total": total,
        "category_counts": category_counts,
        "categories": CATEGORY_LABELS,
    }


@router.get("/download/{record_id}")
async def download_record(record_id: str):
    """Get the download URL for a record."""
    record = await db.medical_records.find_one({"id": record_id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    file_path = UPLOAD_DIR / record["stored_filename"]
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on server")

    from fastapi.responses import FileResponse
    return FileResponse(
        str(file_path),
        filename=record["original_filename"],
        media_type="application/octet-stream",
    )


@router.put("/star/{record_id}")
async def toggle_star(record_id: str):
    """Toggle star/favorite on a record."""
    record = await db.medical_records.find_one({"id": record_id})
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    new_val = not record.get("is_starred", False)
    await db.medical_records.update_one(
        {"id": record_id},
        {"$set": {"is_starred": new_val, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"success": True, "is_starred": new_val}


@router.put("/update/{record_id}")
async def update_record(
    record_id: str,
    title: str = Form(None),
    category: str = Form(None),
    notes: str = Form(None),
    doctor_name: str = Form(None),
    record_date: str = Form(None),
):
    """Update record metadata."""
    record = await db.medical_records.find_one({"id": record_id})
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if title is not None:
        updates["title"] = title
    if category is not None and category in CATEGORIES:
        updates["category"] = category
    if notes is not None:
        updates["notes"] = notes
    if doctor_name is not None:
        updates["doctor_name"] = doctor_name
    if record_date is not None:
        updates["record_date"] = record_date

    await db.medical_records.update_one({"id": record_id}, {"$set": updates})
    return {"success": True, "message": "Record updated"}


@router.delete("/delete/{record_id}")
async def delete_record(record_id: str):
    """Delete a medical record and its file."""
    record = await db.medical_records.find_one({"id": record_id})
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    file_path = UPLOAD_DIR / record["stored_filename"]
    if file_path.exists():
        file_path.unlink()

    await db.medical_records.delete_one({"id": record_id})
    return {"success": True, "message": "Record deleted"}


@router.post("/share/{record_id}")
async def share_record(record_id: str, req: RecordShareRequest):
    """Share a record with a doctor."""
    record = await db.medical_records.find_one({"id": record_id})
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    share_entry = {
        "share_id": str(uuid.uuid4()),
        "doctor_name": req.doctor_name,
        "doctor_phone": req.doctor_phone,
        "notes": req.notes,
        "shared_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.medical_records.update_one(
        {"id": record_id},
        {
            "$push": {"shared_with": share_entry},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
        },
    )
    return {"success": True, "message": f"Record shared with {req.doctor_name}"}


@router.get("/stats/{phone}")
async def get_stats(phone: str):
    """Get record vault stats for a user."""
    total = await db.medical_records.count_documents({"phone": phone})
    starred = await db.medical_records.count_documents({"phone": phone, "is_starred": True})

    category_counts = {}
    for cat in CATEGORIES:
        count = await db.medical_records.count_documents({"phone": phone, "category": cat})
        if count > 0:
            category_counts[cat] = count

    total_size = 0
    async for rec in db.medical_records.find({"phone": phone}, {"file_size": 1, "_id": 0}):
        total_size += rec.get("file_size", 0)

    return {
        "success": True,
        "total_records": total,
        "starred_records": starred,
        "total_size_bytes": total_size,
        "total_size_mb": round(total_size / (1024 * 1024), 2),
        "category_counts": category_counts,
    }
