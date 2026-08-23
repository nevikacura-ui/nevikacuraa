"""
Express Rx Flow API (#4)
- Quick consult → Instant Rx → Medicine dispatch with Zepto-style live tracking
- Status pipeline: reviewing → prescribed → packed → dispatched → delivered
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/express-rx", tags=["Express Rx Flow"])
db = None

def set_db(database):
    global db
    db = database

# Status flow with estimated times
STATUS_FLOW = [
    {"status": "consulting", "label": "Doctor Consulting", "icon": "stethoscope", "est_minutes": 5},
    {"status": "prescribed", "label": "Prescription Ready", "icon": "file-text", "est_minutes": 2},
    {"status": "preparing", "label": "Medicine Being Packed", "icon": "package", "est_minutes": 10},
    {"status": "dispatched", "label": "Out for Delivery", "icon": "truck", "est_minutes": 25},
    {"status": "delivered", "label": "Delivered", "icon": "check-circle", "est_minutes": 0},
]


@router.post("/start")
async def start_express_flow(data: dict):
    """Start an express Rx flow — quick consult to medicine delivery."""
    phone = data.get("phone", "")
    doctor_id = data.get("doctor_id", "vikas")
    symptoms = data.get("symptoms", "")
    
    if not phone:
        raise HTTPException(status_code=400, detail="Phone required")
    
    flow = {
        "flow_id": f"ERX-{ObjectId()}",
        "phone": phone,
        "doctor_id": doctor_id,
        "symptoms": symptoms,
        "status": "consulting",
        "status_history": [
            {"status": "consulting", "timestamp": datetime.now(timezone.utc).isoformat(), "note": "Doctor is reviewing your request"}
        ],
        "prescription": None,
        "pharmacy_order": None,
        "estimated_delivery_minutes": 45,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.express_rx_flows.insert_one({**flow, "_id": ObjectId()})
    flow.pop("_id", None)
    
    return {
        "success": True,
        "flow": flow,
        "status_pipeline": STATUS_FLOW,
        "message": "Express Rx started! Doctor is reviewing your request."
    }


@router.get("/track/{flow_id}")
async def track_express_flow(flow_id: str):
    """Get real-time status of an express Rx flow."""
    flow = await db.express_rx_flows.find_one({"flow_id": flow_id}, {"_id": 0})
    
    if not flow:
        raise HTTPException(status_code=404, detail="Flow not found")
    
    # Calculate progress
    current_status = flow.get("status", "consulting")
    status_names = [s["status"] for s in STATUS_FLOW]
    current_idx = status_names.index(current_status) if current_status in status_names else 0
    progress = (current_idx / (len(STATUS_FLOW) - 1)) * 100
    
    # Calculate ETA
    remaining_minutes = sum(s["est_minutes"] for s in STATUS_FLOW[current_idx:])
    
    return {
        "success": True,
        "flow": flow,
        "progress_percent": progress,
        "current_step": current_idx + 1,
        "total_steps": len(STATUS_FLOW),
        "remaining_minutes": remaining_minutes,
        "status_pipeline": STATUS_FLOW,
    }


@router.put("/update-status/{flow_id}")
async def update_express_status(flow_id: str, data: dict):
    """Update status of an express Rx flow (used by staff/doctor)."""
    new_status = data.get("status", "")
    note = data.get("note", "")
    prescription = data.get("prescription")
    
    valid_statuses = [s["status"] for s in STATUS_FLOW]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    update = {
        "status": new_status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    if prescription:
        update["prescription"] = prescription
    
    # Add to status history
    history_entry = {
        "status": new_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "note": note
    }
    
    await db.express_rx_flows.update_one(
        {"flow_id": flow_id},
        {"$set": update, "$push": {"status_history": history_entry}}
    )
    
    flow = await db.express_rx_flows.find_one({"flow_id": flow_id}, {"_id": 0})
    return {"success": True, "flow": flow}


@router.get("/active/{phone}")
async def get_active_flows(phone: str):
    """Get all active express Rx flows for a patient."""
    flows = await db.express_rx_flows.find(
        {"phone": phone, "status": {"$ne": "delivered"}},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "success": True,
        "active_flows": flows,
        "count": len(flows)
    }
