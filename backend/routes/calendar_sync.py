"""
Calendar Sync API
Generates calendar events for appointments in iCal format
Supports Google Calendar, Apple Calendar, and other calendar apps
"""

from fastapi import APIRouter, HTTPException, Depends, Header, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import os
import jwt
import logging
import io

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/calendar", tags=["Calendar Sync"])

db = None

def set_db(database):
    global db
    db = database

JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("sub") or payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ HELPER FUNCTIONS ============

def generate_ical_event(appointment: dict, clinic_details: dict = None) -> str:
    """Generate iCal format event for an appointment"""
    
    # Parse date and time
    apt_date = appointment.get("date", "")
    apt_time = appointment.get("time", "10:00")
    
    try:
        # Parse the datetime
        if "T" in apt_date:
            start_dt = datetime.fromisoformat(apt_date.replace("Z", "+00:00"))
        else:
            start_dt = datetime.strptime(f"{apt_date} {apt_time}", "%Y-%m-%d %H:%M")
    except Exception:
        start_dt = datetime.now() + timedelta(days=1)
    
    # Assume 30 minute appointment duration
    end_dt = start_dt + timedelta(minutes=30)
    
    # Format for iCal (UTC)
    def format_ical_datetime(dt):
        return dt.strftime("%Y%m%dT%H%M%S")
    
    # Generate unique ID
    uid = f"{appointment.get('id', uuid.uuid4())}@nevikacura.com"
    
    # Build description
    doctor = appointment.get("doctor", "Doctor")
    clinic = appointment.get("clinic", appointment.get("clinic_name", "Nevika Cura"))
    token_number = appointment.get("token_number", "")
    
    description = f"Appointment with {doctor}\\n"
    description += f"Clinic: {clinic}\\n"
    if token_number:
        description += f"Token Number: {token_number}\\n"
    description += f"\\nBooked via Nevika Cura Healthcare App"
    
    # Clinic address
    location = clinic
    if clinic_details:
        location = f"{clinic}, {clinic_details.get('address', '')}"
    elif "Pushpa" in clinic:
        location = "Pushpa Clinic, Naigaon"
    elif "Amnion" in clinic:
        location = "Amnion Clinic, Naigaon"
    
    # Build iCal content
    ical = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Nevika Cura Healthcare//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:{uid}
DTSTAMP:{format_ical_datetime(datetime.now())}
DTSTART:{format_ical_datetime(start_dt)}
DTEND:{format_ical_datetime(end_dt)}
SUMMARY:Doctor Appointment - {doctor}
DESCRIPTION:{description}
LOCATION:{location}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Appointment Reminder
TRIGGER:-PT1H
END:VALARM
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Appointment Tomorrow
TRIGGER:-PT24H
END:VALARM
END:VEVENT
END:VCALENDAR"""
    
    return ical

def generate_google_calendar_url(appointment: dict) -> str:
    """Generate Google Calendar event URL"""
    import urllib.parse
    
    apt_date = appointment.get("date", "")
    apt_time = appointment.get("time", "10:00")
    
    try:
        if "T" in apt_date:
            start_dt = datetime.fromisoformat(apt_date.replace("Z", "+00:00"))
        else:
            start_dt = datetime.strptime(f"{apt_date} {apt_time}", "%Y-%m-%d %H:%M")
    except Exception:
        start_dt = datetime.now() + timedelta(days=1)
    
    end_dt = start_dt + timedelta(minutes=30)
    
    # Format for Google Calendar
    def format_google_datetime(dt):
        return dt.strftime("%Y%m%dT%H%M%S")
    
    doctor = appointment.get("doctor", "Doctor")
    clinic = appointment.get("clinic", appointment.get("clinic_name", "Nevika Cura"))
    token_number = appointment.get("token_number", "")
    
    title = f"Doctor Appointment - {doctor}"
    
    details = f"Appointment with {doctor}\n"
    details += f"Clinic: {clinic}\n"
    if token_number:
        details += f"Token Number: {token_number}\n"
    details += f"\nBooked via Nevika Cura Healthcare App"
    
    location = clinic
    if "Pushpa" in clinic:
        location = "Pushpa Clinic, Naigaon"
    elif "Amnion" in clinic:
        location = "Amnion Clinic, Naigaon"
    
    params = {
        "action": "TEMPLATE",
        "text": title,
        "dates": f"{format_google_datetime(start_dt)}/{format_google_datetime(end_dt)}",
        "details": details,
        "location": location,
        "sf": "true",
        "output": "xml"
    }
    
    base_url = "https://calendar.google.com/calendar/render"
    return f"{base_url}?{urllib.parse.urlencode(params)}"

# ============ API ENDPOINTS ============

@router.get("/appointment/{appointment_id}/ical")
async def get_appointment_ical(
    appointment_id: str,
    user = Depends(get_current_user)
):
    """Download iCal file for an appointment"""
    
    # Find appointment
    appointment = await db.appointments.find_one(
        {"id": appointment_id, "user_id": user["id"]},
        {"_id": 0}
    )
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Generate iCal content
    ical_content = generate_ical_event(appointment)
    
    # Create response with .ics file
    filename = f"appointment_{appointment_id[:8]}.ics"
    
    return Response(
        content=ical_content,
        media_type="text/calendar",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.get("/appointment/{appointment_id}/google")
async def get_google_calendar_link(
    appointment_id: str,
    user = Depends(get_current_user)
):
    """Get Google Calendar link for an appointment"""
    
    appointment = await db.appointments.find_one(
        {"id": appointment_id, "user_id": user["id"]},
        {"_id": 0}
    )
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    google_url = generate_google_calendar_url(appointment)
    
    return {
        "google_calendar_url": google_url,
        "appointment_id": appointment_id
    }

@router.get("/appointment/{appointment_id}/links")
async def get_all_calendar_links(
    appointment_id: str,
    user = Depends(get_current_user)
):
    """Get all calendar links for an appointment"""
    
    appointment = await db.appointments.find_one(
        {"id": appointment_id, "user_id": user["id"]},
        {"_id": 0}
    )
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    google_url = generate_google_calendar_url(appointment)
    
    # For Apple Calendar, we return the iCal endpoint
    api_base = os.environ.get('REACT_APP_BACKEND_URL', '')
    ical_url = f"{api_base}/api/calendar/appointment/{appointment_id}/ical"
    
    return {
        "appointment": {
            "id": appointment_id,
            "doctor": appointment.get("doctor"),
            "clinic": appointment.get("clinic"),
            "date": appointment.get("date"),
            "time": appointment.get("time")
        },
        "calendar_links": {
            "google": google_url,
            "apple": ical_url,  # Opens in Apple Calendar when clicked
            "outlook": ical_url,  # Same iCal file works for Outlook
            "ical_download": ical_url
        }
    }

@router.get("/lab-test/{order_id}/ical")
async def get_lab_test_ical(
    order_id: str,
    user = Depends(get_current_user)
):
    """Download iCal file for a lab test booking"""
    
    order = await db.diagnostic_orders.find_one(
        {"id": order_id, "user_id": user["id"]},
        {"_id": 0}
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Lab test order not found")
    
    # Create appointment-like structure for iCal generation
    appointment = {
        "id": order_id,
        "date": order.get("date", order.get("scheduled_date", "")),
        "time": order.get("time", "09:00"),
        "doctor": "Lab Technician",
        "clinic": order.get("collection_type", "home") == "home" 
                  and "Home Collection" 
                  or order.get("lab_name", "Proton Diagnostics"),
        "token_number": order.get("order_number", "")
    }
    
    ical_content = generate_ical_event(appointment)
    filename = f"lab_test_{order_id[:8]}.ics"
    
    return Response(
        content=ical_content,
        media_type="text/calendar",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.get("/sync/upcoming")
async def get_upcoming_events_ical(user = Depends(get_current_user)):
    """Get all upcoming appointments as a single iCal file for calendar subscription"""
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Get upcoming appointments
    appointments = await db.appointments.find(
        {
            "user_id": user["id"],
            "date": {"$gte": today},
            "status": {"$nin": ["Cancelled", "Rejected"]}
        },
        {"_id": 0}
    ).sort("date", 1).to_list(50)
    
    # Build combined iCal
    events = []
    for apt in appointments:
        event_content = generate_ical_event(apt)
        # Extract just the VEVENT part
        start = event_content.find("BEGIN:VEVENT")
        end = event_content.find("END:VEVENT") + len("END:VEVENT")
        if start > 0 and end > start:
            events.append(event_content[start:end])
    
    # Build full calendar
    ical = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Nevika Cura Healthcare//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Nevika Cura Appointments
X-WR-CALDESC:Your healthcare appointments from Nevika Cura
{chr(10).join(events)}
END:VCALENDAR"""
    
    return Response(
        content=ical,
        media_type="text/calendar",
        headers={
            "Content-Disposition": "attachment; filename=nevika_appointments.ics"
        }
    )
