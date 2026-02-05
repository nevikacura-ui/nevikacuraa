"""
Public Order Tracking API
Allows customers to track their pharmacy orders and lab test bookings
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/track", tags=["Order Tracking"])

# Database - injected from server.py
db = None

def set_db(database):
    global db
    db = database


# Status configurations
PHARMACY_STATUSES = [
    {"key": "booked", "label": "Order Placed", "icon": "📦"},
    {"key": "pharmacist_call", "label": "Pharmacist Confirmed", "icon": "📞"},
    {"key": "packing", "label": "Packing", "icon": "📋"},
    {"key": "out_for_delivery", "label": "Out for Delivery", "icon": "🚚"},
    {"key": "completed", "label": "Delivered", "icon": "✅"},
]

LAB_STATUSES = [
    {"key": "test_booked", "label": "Test Booked", "icon": "📅"},
    {"key": "sample_collected", "label": "Sample Collected", "icon": "🧪"},
    {"key": "in_process", "label": "Processing", "icon": "⚗️"},
    {"key": "report_generated", "label": "Report Ready", "icon": "📄"},
    {"key": "completed", "label": "Completed", "icon": "✅"},
]


class TrackingResponse(BaseModel):
    success: bool
    tracking_type: Optional[str] = None
    order_id: Optional[str] = None
    customer_name: Optional[str] = None
    current_status: Optional[str] = None
    current_status_label: Optional[str] = None
    status_timeline: Optional[list] = None
    items: Optional[list] = None
    total_amount: Optional[float] = None
    created_at: Optional[str] = None
    estimated_delivery: Optional[str] = None
    report_available: Optional[bool] = None
    message: Optional[str] = None


@router.get("/{tracking_id}")
async def track_order(tracking_id: str):
    """
    Track pharmacy order or lab booking by ID
    Supports: ORD*, LAB*, PHM*, MHL* prefixes
    """
    tracking_id = tracking_id.strip().upper()
    
    # Try pharmacy orders first
    pharmacy_order = await db.pharmacy_orders.find_one(
        {"$or": [
            {"order_id": {"$regex": f"^{tracking_id}$", "$options": "i"}},
            {"order_id": tracking_id}
        ]},
        {"_id": 0, "invoice_base64": 0}
    )
    
    if pharmacy_order:
        current_status = pharmacy_order.get("status", "booked")
        current_index = next((i for i, s in enumerate(PHARMACY_STATUSES) if s["key"] == current_status), 0)
        
        # Build timeline
        timeline = []
        for i, status in enumerate(PHARMACY_STATUSES):
            status_info = {
                "key": status["key"],
                "label": status["label"],
                "icon": status["icon"],
                "completed": i <= current_index,
                "current": i == current_index
            }
            # Add timestamp if available
            timestamp_key = f"{status['key']}_at"
            if pharmacy_order.get(timestamp_key):
                status_info["timestamp"] = pharmacy_order.get(timestamp_key)
            timeline.append(status_info)
        
        return TrackingResponse(
            success=True,
            tracking_type="pharmacy",
            order_id=pharmacy_order.get("order_id"),
            customer_name=pharmacy_order.get("customer_name"),
            current_status=current_status,
            current_status_label=PHARMACY_STATUSES[current_index]["label"],
            status_timeline=timeline,
            items=pharmacy_order.get("items", []),
            total_amount=pharmacy_order.get("total"),
            created_at=pharmacy_order.get("created_at"),
            estimated_delivery=pharmacy_order.get("estimated_delivery"),
            report_available=False
        )
    
    # Try lab bookings
    lab_booking = await db.lab_bookings.find_one(
        {"$or": [
            {"booking_id": {"$regex": f"^{tracking_id}$", "$options": "i"}},
            {"booking_id": tracking_id}
        ]},
        {"_id": 0, "report_base64": 0}
    )
    
    if lab_booking:
        current_status = lab_booking.get("status", "test_booked")
        current_index = next((i for i, s in enumerate(LAB_STATUSES) if s["key"] == current_status), 0)
        
        # Build timeline
        timeline = []
        for i, status in enumerate(LAB_STATUSES):
            status_info = {
                "key": status["key"],
                "label": status["label"],
                "icon": status["icon"],
                "completed": i <= current_index,
                "current": i == current_index
            }
            timestamp_key = f"{status['key']}_at"
            if lab_booking.get(timestamp_key):
                status_info["timestamp"] = lab_booking.get(timestamp_key)
            timeline.append(status_info)
        
        return TrackingResponse(
            success=True,
            tracking_type="lab",
            order_id=lab_booking.get("booking_id"),
            customer_name=lab_booking.get("patient_name"),
            current_status=current_status,
            current_status_label=LAB_STATUSES[current_index]["label"],
            status_timeline=timeline,
            items=[{"name": t} for t in lab_booking.get("tests", [])],
            total_amount=lab_booking.get("total_amount"),
            created_at=lab_booking.get("created_at"),
            report_available=lab_booking.get("report_uploaded", False)
        )
    
    # Not found
    return TrackingResponse(
        success=False,
        message=f"No order or booking found with ID: {tracking_id}. Please check the ID and try again."
    )


@router.get("/{tracking_id}/report")
async def get_report(tracking_id: str):
    """Get lab report if available (returns download info)"""
    tracking_id = tracking_id.strip().upper()
    
    lab_booking = await db.lab_bookings.find_one(
        {"$or": [
            {"booking_id": {"$regex": f"^{tracking_id}$", "$options": "i"}},
            {"booking_id": tracking_id}
        ]},
        {"report_base64": 1, "report_filename": 1, "report_uploaded": 1}
    )
    
    if not lab_booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if not lab_booking.get("report_uploaded"):
        raise HTTPException(status_code=404, detail="Report not yet available")
    
    return {
        "success": True,
        "report_base64": lab_booking.get("report_base64"),
        "filename": lab_booking.get("report_filename", "report.pdf")
    }
