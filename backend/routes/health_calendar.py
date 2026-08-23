"""
Health Calendar API — Unified calendar events across all platforms
(DiaGyn appointments, Orange medicine schedules, Mango lab bookings, Cura reminders)
"""
from fastapi import APIRouter
from datetime import datetime, timezone
from database import get_db
import calendar

router = APIRouter()

@router.get("/health-calendar/events")
async def get_calendar_events(phone: str, year: int = None, month: int = None):
    """Fetch all health events for a patient across all platforms"""
    db = get_db()
    now = datetime.now(timezone.utc)
    year = year or now.year
    month = month or now.month
    
    _, last_day = calendar.monthrange(year, month)
    start = f"{year}-{month:02d}-01"
    end = f"{year}-{month:02d}-{last_day:02d}"
    
    events = []
    
    # 1. DiaGyn Appointments
    try:
        appointments = await db.appointments.find({
            "patient_phone": phone,
            "date": {"$gte": start, "$lte": end}
        }, {"_id": 0}).to_list(50)
        for apt in appointments:
            events.append({
                "type": "appointment",
                "date": apt.get("date", ""),
                "time": apt.get("time_slot", ""),
                "title": f"Dr. {apt.get('doctor_name', 'Appointment')}",
                "platform": "diagyn",
            })
    except Exception:
        pass
    
    # 2. Medicine Reminders
    try:
        reminders = await db.medicine_reminders.find({
            "phone": phone,
            "active": True
        }, {"_id": 0}).to_list(50)
        for rem in reminders:
            for day in range(1, last_day + 1):
                date_str = f"{year}-{month:02d}-{day:02d}"
                events.append({
                    "type": "medicine",
                    "date": date_str,
                    "time": rem.get("time", "08:00 AM"),
                    "title": rem.get("medicine_name", "Medicine"),
                    "platform": "orange",
                })
    except Exception:
        pass
    
    # 3. Lab Orders / Bookings
    try:
        lab_orders = await db.lab_orders.find({
            "patient_phone": phone,
        }, {"_id": 0}).to_list(20)
        for lo in lab_orders:
            created = lo.get("created_at", "")
            if isinstance(created, datetime):
                date_str = created.strftime("%Y-%m-%d")
            elif isinstance(created, str):
                date_str = created[:10]
            else:
                continue
            if date_str >= start and date_str <= end:
                events.append({
                    "type": "lab",
                    "date": date_str,
                    "time": lo.get("preferred_time", ""),
                    "title": f"Lab: {lo.get('test_name', lo.get('package_name', 'Test'))}",
                    "platform": "mango",
                })
    except Exception:
        pass
    
    # 4. Pharmacy Orders
    try:
        pharmacy_orders = await db.pharmacy_orders.find({
            "customer_phone": phone,
        }, {"_id": 0}).to_list(20)
        for po in pharmacy_orders:
            created = po.get("created_at", "")
            if isinstance(created, datetime):
                date_str = created.strftime("%Y-%m-%d")
            elif isinstance(created, str):
                date_str = created[:10]
            else:
                continue
            if date_str >= start and date_str <= end:
                events.append({
                    "type": "medicine",
                    "date": date_str,
                    "time": "",
                    "title": f"Pharmacy Order #{po.get('order_id', '')[:8]}",
                    "platform": "orange",
                })
    except Exception:
        pass
    
    return {"success": True, "events": events, "count": len(events)}
