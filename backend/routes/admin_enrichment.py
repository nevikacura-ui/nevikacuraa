"""
Admin AI Enrichment API — Trigger Gemini description generation on-demand.
"""
from fastapi import APIRouter, BackgroundTasks
from datetime import datetime, timezone
import asyncio
import json
import re
import time
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory job tracker
_enrichment_jobs = {}


def get_db():
    from server import db
    return db


async def _run_enrichment(job_id: str, store: str, batch_size: int, max_batches: int):
    """Background task: enrich missing descriptions via Gemini."""
    import os
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    db = get_db()
    col = db.medicines
    api_key = os.environ.get("EMERGENT_LLM_KEY")

    job = _enrichment_jobs[job_id]
    job["status"] = "running"
    job["started_at"] = datetime.now(timezone.utc).isoformat()

    if not api_key:
        job["status"] = "failed"
        job["error"] = "EMERGENT_LLM_KEY not configured"
        return

    store_filter = {"store": store} if store != "all" else {}
    query = {
        **store_filter,
        "$or": [
            {"composition": {"$in": [None, ""]}},
            {"uses": {"$in": [None, ""]}}
        ]
    }

    total_missing = await col.count_documents(query)
    job["total_missing"] = total_missing
    job["total_updated"] = 0
    job["batches_done"] = 0

    cursor = col.find(query, {"_id": 0, "id": 1, "name": 1, "category": 1}).limit(max_batches * batch_size)
    batch = []

    async for med in cursor:
        batch.append(med)
        if len(batch) >= batch_size:
            job["batches_done"] += 1
            if job["batches_done"] > max_batches:
                break
            updated = await _process_batch(batch, api_key, col, job)
            job["total_updated"] += updated
            batch = []
            await asyncio.sleep(0.5)

    if batch and job["batches_done"] < max_batches:
        job["batches_done"] += 1
        updated = await _process_batch(batch, api_key, col, job)
        job["total_updated"] += updated

    remaining = await col.count_documents(query)
    job["remaining"] = remaining
    job["status"] = "completed"
    job["completed_at"] = datetime.now(timezone.utc).isoformat()


async def _process_batch(batch, api_key, col, job):
    """Send batch to Gemini, parse, update DB."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    from pymongo import UpdateOne

    chat = LlmChat(
        api_key=api_key,
        session_id=f"med-desc-{int(time.time())}",
        system_message="""You are a pharmaceutical database assistant. For each medicine/product name provided, generate:
- composition: active ingredients with strengths
- uses: primary medical uses, comma-separated
- side_effects: common side effects, comma-separated

For OTC products, adapt accordingly.
Return ONLY a valid JSON array with objects having keys: index (1-based), composition, uses, side_effects. No markdown."""
    )
    chat.with_model("gemini", "gemini-2.5-flash")

    names_list = "\n".join([f"{i+1}. {m['name']}" for i, m in enumerate(batch)])
    msg = UserMessage(text=f"Generate descriptions for these {len(batch)} products:\n{names_list}")

    try:
        response = await chat.send_message(msg)
        text = response.strip()
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        parsed = json.loads(text)

        ops = []
        for item in parsed:
            idx = item.get('index', 0) - 1
            if idx < 0 or idx >= len(batch):
                continue
            med = batch[idx]
            update = {}
            if item.get('composition'):
                update['composition'] = item['composition']
            if item.get('uses'):
                update['uses'] = item['uses']
            if item.get('side_effects'):
                update['side_effects'] = item['side_effects']
            if update:
                ops.append(UpdateOne({"id": med["id"]}, {"$set": update}))

        if ops:
            await col.bulk_write(ops, ordered=False)
        return len(ops)
    except Exception as e:
        logger.error(f"Gemini batch error: {e}")
        job["last_error"] = str(e)
        return 0


@router.post("/admin/ai-enrichment/trigger")
async def trigger_enrichment(background_tasks: BackgroundTasks, store: str = "all", batch_size: int = 25, max_batches: int = 40):
    """Trigger AI description enrichment. Runs in background."""
    # Check if already running
    for jid, j in _enrichment_jobs.items():
        if j["status"] == "running":
            return {"success": False, "message": "An enrichment job is already running", "job_id": jid, "progress": j}

    job_id = f"enrich-{int(time.time())}"
    _enrichment_jobs[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "store": store,
        "batch_size": batch_size,
        "max_batches": max_batches,
        "total_missing": 0,
        "total_updated": 0,
        "batches_done": 0,
        "remaining": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    background_tasks.add_task(_run_enrichment, job_id, store, batch_size, max_batches)
    return {"success": True, "job_id": job_id, "message": "Enrichment job started"}


@router.get("/admin/ai-enrichment/status")
async def get_enrichment_status():
    """Get current enrichment stats and latest job status."""
    db = get_db()
    col = db.medicines

    # Count missing descriptions per store
    pipeline = [
        {"$match": {"$or": [{"composition": {"$in": [None, ""]}}, {"uses": {"$in": [None, ""]}}]}},
        {"$group": {"_id": "$store", "count": {"$sum": 1}}}
    ]
    missing_by_store = {}
    async for doc in col.aggregate(pipeline):
        missing_by_store[doc["_id"] or "unknown"] = doc["count"]

    total_products = await col.count_documents({})
    total_missing = sum(missing_by_store.values())
    enriched_pct = round((1 - total_missing / max(total_products, 1)) * 100, 1)

    latest_job = None
    if _enrichment_jobs:
        latest_job = list(_enrichment_jobs.values())[-1]

    return {
        "total_products": total_products,
        "total_missing": total_missing,
        "enriched_percentage": enriched_pct,
        "missing_by_store": missing_by_store,
        "latest_job": latest_job
    }
