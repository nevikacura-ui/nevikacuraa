"""
Superfone Webhook Integration
Receives incoming leads (calls, WhatsApp messages) from Superfone
and auto-creates patient inquiries + sends booking links.
"""
import os
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks/superfone", tags=["Superfone Webhook"])

db = None

def set_db(database):
    global db
    db = database

# ============ Models ============

class SuperfoneWebhookPayload(BaseModel):
    """Flexible model — Superfone may send varying payloads"""
    phone: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    message: Optional[str] = None
    source: Optional[str] = None
    type: Optional[str] = None  # call, whatsapp, missed_call, etc.
    # Catch-all for any extra fields Superfone sends
    class Config:
        extra = "allow"


# ============ Webhook Endpoint ============

@router.post("/incoming")
async def superfone_webhook(request: Request):
    """
    Receives webhook from Superfone.
    Stores the lead and can trigger auto-response with booking link.
    """
    # Parse body — accept both JSON and form-data
    content_type = request.headers.get("content-type", "")
    
    if "application/json" in content_type:
        raw_data = await request.json()
    elif "form" in content_type:
        form = await request.form()
        raw_data = dict(form)
    else:
        body = await request.body()
        try:
            import json
            raw_data = json.loads(body)
        except Exception:
            raw_data = {"raw_body": body.decode("utf-8", errors="replace")}
    
    logger.info(f"[SUPERFONE] Webhook received: {raw_data}")
    
    # Extract phone number — try common field names
    phone = (
        raw_data.get("phone") or 
        raw_data.get("mobile") or 
        raw_data.get("contact") or 
        raw_data.get("caller_number") or
        raw_data.get("from") or
        raw_data.get("number") or
        raw_data.get("Phone") or
        raw_data.get("Mobile") or
        ""
    )
    
    # Clean phone
    clean_phone = phone.replace("+", "").replace(" ", "").replace("-", "")
    if clean_phone and not clean_phone.startswith("91") and len(clean_phone) == 10:
        clean_phone = "91" + clean_phone
    
    # Extract name
    name = (
        raw_data.get("name") or 
        raw_data.get("caller_name") or 
        raw_data.get("Name") or
        raw_data.get("contact_name") or
        "Unknown"
    )
    
    # Extract message/notes
    message = (
        raw_data.get("message") or 
        raw_data.get("text") or 
        raw_data.get("notes") or
        raw_data.get("Message") or
        ""
    )
    
    # Extract source/type
    lead_type = (
        raw_data.get("type") or 
        raw_data.get("event") or 
        raw_data.get("call_type") or
        raw_data.get("source") or
        "webhook"
    )
    
    # Generate booking link
    app_url = os.environ.get("REACT_APP_BACKEND_URL", "https://nevikacura.com")
    booking_link = f"{app_url}/book?phone={clean_phone}&ref=superfone"
    
    # Store lead in MongoDB
    lead_record = {
        "id": f"sf_lead_{str(uuid.uuid4())[:12]}",
        "phone": clean_phone,
        "name": name,
        "message": message,
        "lead_type": lead_type,
        "source": "superfone",
        "booking_link": booking_link,
        "raw_payload": raw_data,
        "status": "new",  # new → contacted → booked → completed
        "created_at": datetime.now(timezone.utc).isoformat(),
        "processed": False
    }
    
    if db is not None:
        await db.superfone_leads.insert_one(lead_record)
        lead_record.pop("_id", None)
        
        # Check if patient already exists
        existing_patient = None
        if clean_phone:
            existing_patient = await db.patients.find_one(
                {"$or": [{"mobile": clean_phone}, {"mobile": clean_phone[-10:]}]},
                {"_id": 0, "name": 1, "mobile": 1, "id": 1}
            )
        
        if existing_patient:
            lead_record["existing_patient"] = True
            lead_record["patient_id"] = existing_patient.get("id")
            lead_record["patient_name"] = existing_patient.get("name")
            await db.superfone_leads.update_one(
                {"id": lead_record["id"]},
                {"$set": {"existing_patient": True, "patient_id": existing_patient.get("id")}}
            )
        
        # Auto-send booking link via WhatsApp (if MSG91 is configured)
        whatsapp_sent = False
        if clean_phone:
            try:
                from services.msg91_whatsapp import send_msg91_whatsapp
                
                patient_name = existing_patient.get("name") if existing_patient else name
                await send_msg91_whatsapp(
                    recipient_phone=clean_phone,
                    template_name="diagyn_walkin_emergency",
                    variables=[
                        patient_name or "there",
                        "Nevika Cura Healthcare",
                        booking_link
                    ],
                    db=db,
                    reference_id=f"superfone_{lead_record['id']}",
                    message_type="superfone_booking_link"
                )
                whatsapp_sent = True
                logger.info(f"[SUPERFONE] Booking link sent to {clean_phone}")
            except Exception as e:
                logger.warning(f"[SUPERFONE] WhatsApp send failed (non-critical): {e}")
        
        lead_record["whatsapp_sent"] = whatsapp_sent
    
    logger.info(f"[SUPERFONE] Lead processed: {clean_phone} - {name} - {lead_type}")
    
    return {
        "success": True,
        "message": "Lead received and processed",
        "lead_id": lead_record["id"],
        "booking_link": booking_link,
        "whatsapp_sent": lead_record.get("whatsapp_sent", False)
    }


@router.get("/leads")
async def get_superfone_leads(
    status: Optional[str] = None,
    limit: int = 50
):
    """Get all Superfone leads for the staff dashboard"""
    query = {"source": "superfone"}
    if status:
        query["status"] = status
    
    leads = await db.superfone_leads.find(query, {"_id": 0, "raw_payload": 0}).sort("created_at", -1).to_list(limit)
    
    return {
        "success": True,
        "total": len(leads),
        "leads": leads
    }


@router.put("/leads/{lead_id}/status")
async def update_lead_status(lead_id: str, status: str):
    """Update lead status: new → contacted → booked → completed"""
    valid_statuses = ["new", "contacted", "booked", "completed", "rejected"]
    if status not in valid_statuses:
        raise HTTPException(400, f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await db.superfone_leads.update_one(
        {"id": lead_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(404, "Lead not found")
    
    return {"success": True, "message": f"Lead {lead_id} status updated to {status}"}


# Health check for Superfone to verify webhook is active
@router.get("/health")
async def superfone_webhook_health():
    return {"status": "ok", "service": "nevika-cura-superfone-webhook"}
