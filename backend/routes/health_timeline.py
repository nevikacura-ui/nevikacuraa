"""
Smart Health Timeline (CuraLine) API
- Aggregates all health events into a unified chronological timeline
- Events: appointments, prescriptions, lab results, pharmacy orders, medicine purchases
"""

from fastapi import APIRouter, Query
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health-timeline", tags=["Health Timeline"])
db = None

def set_db(database):
    global db
    db = database


@router.get("/{phone}")
async def get_health_timeline(
    phone: str,
    limit: int = Query(30, ge=1, le=100),
    page: int = Query(1, ge=1)
):
    """Get unified health timeline for a patient."""
    skip = (page - 1) * limit
    events = []
    
    # 1. Appointments
    appointments = await db.appointments.find(
        {"$or": [{"phone": phone}, {"patient_phone": phone}]},
        {"_id": 0}
    ).sort("date", -1).limit(50).to_list(50)
    
    for apt in appointments:
        events.append({
            "type": "appointment",
            "icon": "stethoscope",
            "title": f"Consultation with {apt.get('doctor_name', 'Doctor')}",
            "subtitle": apt.get("clinic_name", apt.get("clinic", "")),
            "date": apt.get("date", apt.get("created_at", "")),
            "status": apt.get("status", "completed"),
            "details": {
                "doctor": apt.get("doctor_name", ""),
                "service": apt.get("service_type", ""),
                "clinic": apt.get("clinic_name", apt.get("clinic", "")),
                "time": apt.get("time_slot", apt.get("time", "")),
            },
            "color": "#14B8A6"
        })
    
    # 2. Prescriptions
    prescriptions = await db.prescriptions.find(
        {"patient_phone": phone},
        {"_id": 0}
    ).sort("created_at", -1).limit(30).to_list(30)
    
    for rx in prescriptions:
        med_names = [m.get("name", "") for m in rx.get("medicines", [])[:3]]
        events.append({
            "type": "prescription",
            "icon": "file-text",
            "title": f"Prescription — {rx.get('doctor_name', 'Doctor')}",
            "subtitle": ", ".join(med_names) + ("..." if len(rx.get("medicines", [])) > 3 else ""),
            "date": rx.get("created_at", ""),
            "status": "active",
            "details": {
                "medicines": [m.get("name", "") for m in rx.get("medicines", [])],
                "doctor": rx.get("doctor_name", ""),
                "diagnosis": rx.get("diagnosis", ""),
            },
            "color": "#F97316"
        })
    
    # 3. Lab Results
    lab_results = await db.lab_results.find(
        {"patient_phone": phone},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    for lab in lab_results:
        events.append({
            "type": "lab_result",
            "icon": "test-tube",
            "title": lab.get("test_name", "Lab Test"),
            "subtitle": f"Result: {lab.get('result', 'Pending')}",
            "date": lab.get("created_at", lab.get("date", "")),
            "status": "normal" if lab.get("is_normal", True) else "abnormal",
            "details": {
                "test": lab.get("test_name", ""),
                "result": lab.get("result", ""),
                "reference": lab.get("reference_range", ""),
                "lab": lab.get("lab_name", ""),
            },
            "color": "#8B5CF6"
        })
    
    # 4. Pharmacy Orders
    orders = await db.pharmacy_orders.find(
        {"$or": [{"phone": phone}, {"patient_phone": phone}]},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    for order in orders:
        item_count = len(order.get("items", []))
        events.append({
            "type": "pharmacy_order",
            "icon": "pill",
            "title": f"Medicine Order — {item_count} item{'s' if item_count != 1 else ''}",
            "subtitle": f"Total: Rs.{order.get('total', 0):.0f}",
            "date": order.get("created_at", ""),
            "status": order.get("status", "delivered"),
            "details": {
                "items": [i.get("name", "") for i in order.get("items", [])[:5]],
                "total": order.get("total", 0),
                "order_id": order.get("order_id", ""),
            },
            "color": "#EC4899"
        })
    
    # Sort all events by date (newest first)
    def parse_date(evt):
        d = evt.get("date", "")
        if not d:
            return datetime.min
        try:
            if isinstance(d, datetime):
                return d
            return datetime.fromisoformat(str(d).replace("Z", "+00:00"))
        except Exception:
            return datetime.min
    
    events.sort(key=parse_date, reverse=True)
    
    total = len(events)
    paginated = events[skip:skip + limit]
    
    # Group by month
    months = {}
    for evt in paginated:
        try:
            d = parse_date(evt)
            if d != datetime.min:
                month_key = d.strftime("%B %Y")
            else:
                month_key = "Other"
        except Exception:
            month_key = "Other"
        
        if month_key not in months:
            months[month_key] = []
        months[month_key].append(evt)
    
    # Stats
    stats = {
        "total_appointments": len(appointments),
        "total_prescriptions": len(prescriptions),
        "total_lab_tests": len(lab_results),
        "total_orders": len(orders),
    }
    
    return {
        "success": True,
        "events": paginated,
        "grouped": months,
        "stats": stats,
        "total": total,
        "page": page,
        "pages": max(1, (total + limit - 1) // limit)
    }
