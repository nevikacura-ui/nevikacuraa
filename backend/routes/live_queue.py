"""
Nevika Cura - Live Queue & Wait Time System
Real-time queue management with public access for patients

Features:
1. Public queue status (no auth required)
2. Remote check-in ("I'm on my way")
3. Push notifications for queue position
4. Busy hours heatmap
5. Wait time estimation
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timezone, timedelta
import jwt
import os
import logging
import uuid
from collections import defaultdict

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/live-queue", tags=["Live Queue"])

# Will be injected from server.py
db = None
JWT_SECRET = None
JWT_ALGORITHM = "HS256"
send_push_notification = None
send_sms_notification = None
send_whatsapp_notification = None

def set_db(database):
    global db
    db = database

def set_jwt_config(secret, algorithm="HS256"):
    global JWT_SECRET, JWT_ALGORITHM
    JWT_SECRET = secret
    JWT_ALGORITHM = algorithm

def set_notification_functions(push_func, sms_func, whatsapp_func=None):
    global send_push_notification, send_sms_notification, send_whatsapp_notification
    send_push_notification = push_func
    send_sms_notification = sms_func
    send_whatsapp_notification = whatsapp_func


# ============ Models ============

class RemoteCheckIn(BaseModel):
    appointment_id: str
    patient_phone: str
    eta_minutes: Optional[int] = 15  # Estimated time of arrival

class QueuePositionRequest(BaseModel):
    appointment_id: Optional[str] = None
    patient_phone: Optional[str] = None
    token_number: Optional[int] = None


# ============ Helper Functions ============

def get_ist_now():
    """Get current IST time"""
    ist_offset = timedelta(hours=5, minutes=30)
    return datetime.now(timezone.utc) + ist_offset

def get_ist_today():
    """Get today's date in IST"""
    return get_ist_now().strftime("%Y-%m-%d")


# ============ PUBLIC ENDPOINTS (No Auth Required) ============

@router.get("/status/{clinic}")
async def get_public_queue_status(clinic: str):
    """
    PUBLIC: Get live queue status for a clinic
    No authentication required - for patient display boards and app
    """
    today = get_ist_today()
    clinic_lower = clinic.lower()
    
    # Get all today's appointments that are in queue
    appointments = await db.appointments.find({
        "clinic": {"$regex": clinic, "$options": "i"},
        "date": today,
        "status": {"$in": ["Confirmed", "Checked-In", "In-Progress", "Booked", "In Clinic"]}
    }, {"_id": 0}).sort("check_in_time", 1).to_list(200)
    
    # Get walk-in queue entries
    walk_ins = await db.patient_queue.find({
        "clinic": {"$regex": clinic, "$options": "i"},
        "date": today,
        "status": {"$in": ["waiting", "in_consultation"]}
    }, {"_id": 0}).sort([("priority_order", 1), ("check_in_time", 1)]).to_list(100)
    
    # Calculate average consultation time from recent history
    avg_consultation_time = await _calculate_avg_consultation_time(clinic)
    
    # Process queue data
    currently_serving = []
    waiting_queue = []
    
    # Process booked appointments
    for apt in appointments:
        status = apt.get("status", "")
        entry = {
            "id": apt.get("id"),
            "token_display": f"A{apt.get('token_number', '?')}" if apt.get('token_number') else apt.get("time", ""),
            "patient_name_masked": _mask_name(apt.get("patient_name", "")),
            "doctor": apt.get("doctor", ""),
            "status": status,
            "type": "appointment",
            "check_in_time": apt.get("check_in_time")
        }
        
        if status == "In-Progress":
            currently_serving.append(entry)
        elif status in ["Checked-In", "In Clinic"]:
            waiting_queue.append(entry)
    
    # Process walk-ins
    for wq in walk_ins:
        entry = {
            "id": wq.get("id"),
            "token_display": f"W{wq.get('token_number', '?')}",
            "patient_name_masked": _mask_name(wq.get("patient_name", "")),
            "doctor": wq.get("doctor", ""),
            "status": wq.get("status"),
            "type": "walk-in",
            "check_in_time": wq.get("check_in_time")
        }
        
        if wq.get("status") == "in_consultation":
            currently_serving.append(entry)
        else:
            waiting_queue.append(entry)
    
    # Sort waiting queue by check-in time
    waiting_queue.sort(key=lambda x: x.get("check_in_time") or "9999")
    
    # Add position numbers
    for i, entry in enumerate(waiting_queue):
        entry["position"] = i + 1
        entry["estimated_wait_minutes"] = i * avg_consultation_time
    
    return {
        "success": True,
        "clinic": clinic,
        "date": today,
        "current_time_ist": get_ist_now().strftime("%H:%M"),
        "currently_serving": currently_serving,
        "waiting_queue": waiting_queue[:20],  # Limit to 20 for display
        "stats": {
            "total_waiting": len(waiting_queue),
            "currently_serving": len(currently_serving),
            "avg_wait_time_minutes": avg_consultation_time,
            "estimated_queue_time": len(waiting_queue) * avg_consultation_time
        },
        "last_updated": datetime.now(timezone.utc).isoformat()
    }


@router.get("/position")
async def get_my_queue_position(
    appointment_id: Optional[str] = None,
    phone: Optional[str] = None,
    token: Optional[str] = None
):
    """
    PUBLIC: Get patient's queue position
    Can lookup by appointment_id, phone number, or token
    """
    today = get_ist_today()
    
    if not appointment_id and not phone and not token:
        raise HTTPException(status_code=400, detail="Provide appointment_id, phone, or token")
    
    query = {"date": today}
    
    if appointment_id:
        query["id"] = appointment_id
    elif phone:
        query["$or"] = [
            {"patient_phone": phone},
            {"phone": phone}
        ]
    elif token:
        # Try to parse token (e.g., "A5" or "W3")
        if token.startswith(("A", "W")):
            try:
                token_num = int(token[1:])
                query["token_number"] = token_num
            except:
                raise HTTPException(status_code=400, detail="Invalid token format")
    
    # Search in appointments
    appointment = await db.appointments.find_one(query, {"_id": 0})
    
    if not appointment:
        # Search in walk-in queue
        walk_in_query = {"date": today}
        if phone:
            walk_in_query["patient_phone"] = phone
        appointment = await db.patient_queue.find_one(walk_in_query, {"_id": 0})
    
    if not appointment:
        raise HTTPException(status_code=404, detail="No appointment found for today")
    
    clinic = appointment.get("clinic", "Pushpa")
    
    # Get position in queue
    position_info = await _calculate_queue_position(appointment, clinic)
    
    return {
        "success": True,
        "appointment": {
            "id": appointment.get("id"),
            "patient_name": appointment.get("patient_name"),
            "doctor": appointment.get("doctor"),
            "clinic": clinic,
            "time_slot": appointment.get("time"),
            "status": appointment.get("status")
        },
        "queue_position": position_info
    }


@router.get("/busy-hours/{clinic}")
async def get_busy_hours_heatmap(clinic: str, days: int = 7):
    """
    PUBLIC: Get busy hours heatmap for a clinic
    Shows historical patient volume by hour and day
    """
    end_date = get_ist_now()
    start_date = end_date - timedelta(days=days)
    
    # Aggregate appointments by day of week and hour
    appointments = await db.appointments.find({
        "clinic": {"$regex": clinic, "$options": "i"},
        "date": {
            "$gte": start_date.strftime("%Y-%m-%d"),
            "$lte": end_date.strftime("%Y-%m-%d")
        },
        "status": {"$nin": ["Cancelled", "No-Show"]}
    }, {"_id": 0, "date": 1, "time": 1, "check_in_time": 1}).to_list(1000)
    
    # Build heatmap data
    heatmap = defaultdict(lambda: defaultdict(int))
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    
    for apt in appointments:
        try:
            date_str = apt.get("date", "")
            time_str = apt.get("time", "") or ""
            
            if date_str:
                apt_date = datetime.strptime(date_str, "%Y-%m-%d")
                day_of_week = day_names[apt_date.weekday()]
                
                # Parse hour from time slot
                hour = 10  # Default
                if time_str:
                    if ":" in time_str:
                        hour_str = time_str.split(":")[0]
                        hour = int(hour_str.replace("AM", "").replace("PM", "").strip())
                        if "PM" in time_str.upper() and hour != 12:
                            hour += 12
                
                heatmap[day_of_week][hour] += 1
        except Exception as e:
            logger.debug(f"Error processing appointment for heatmap: {e}")
    
    # Convert to list format
    heatmap_data = []
    for day in day_names:
        for hour in range(8, 21):  # 8 AM to 8 PM
            count = heatmap[day].get(hour, 0)
            heatmap_data.append({
                "day": day,
                "hour": hour,
                "hour_label": f"{hour}:00",
                "patient_count": count,
                "intensity": "low" if count < 3 else "medium" if count < 6 else "high"
            })
    
    # Find peak hours
    sorted_hours = sorted(heatmap_data, key=lambda x: x["patient_count"], reverse=True)
    peak_hours = sorted_hours[:5] if sorted_hours else []
    
    return {
        "success": True,
        "clinic": clinic,
        "period_days": days,
        "heatmap": heatmap_data,
        "peak_hours": peak_hours,
        "recommendation": _generate_busy_hour_recommendation(peak_hours)
    }


# ============ PATIENT ACTIONS ============

@router.post("/remote-checkin")
async def remote_check_in(data: RemoteCheckIn):
    """
    Patient remote check-in: "I'm on my way"
    Updates status and notifies clinic staff
    """
    today = get_ist_today()
    
    # Find the appointment
    appointment = await db.appointments.find_one({
        "id": data.appointment_id,
        "date": today
    })
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found for today")
    
    # Verify phone matches
    apt_phone = appointment.get("patient_phone") or appointment.get("phone", "")
    if apt_phone and not apt_phone.endswith(data.patient_phone[-4:]):
        raise HTTPException(status_code=403, detail="Phone number doesn't match appointment")
    
    # Update appointment with remote check-in
    now = datetime.now(timezone.utc).isoformat()
    await db.appointments.update_one(
        {"id": data.appointment_id},
        {"$set": {
            "remote_checkin": True,
            "remote_checkin_time": now,
            "eta_minutes": data.eta_minutes,
            "status": "On-Way"  # New status
        }}
    )
    
    # Get queue position
    position_info = await _calculate_queue_position(appointment, appointment.get("clinic", ""))
    
    return {
        "success": True,
        "message": f"Check-in confirmed! You are {position_info['position']} in queue",
        "appointment_id": data.appointment_id,
        "queue_position": position_info,
        "eta_minutes": data.eta_minutes
    }


@router.post("/notify-patient/{appointment_id}")
async def notify_patient_queue_update(appointment_id: str, positions_ahead: int = 2):
    """
    Send notification to patient when they are X positions away
    Called by staff or automated system
    """
    appointment = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    patient_name = appointment.get("patient_name", "Patient")
    clinic = appointment.get("clinic", "Clinic")
    phone = appointment.get("patient_phone") or appointment.get("phone")
    user_id = appointment.get("user_id")
    
    message = f"Hi {patient_name}! {positions_ahead} patients ahead of you at {clinic}. Please be ready!"
    
    notifications_sent = []
    
    # Send push notification
    if user_id and send_push_notification:
        try:
            await send_push_notification(
                user_id=user_id,
                title="⏰ Almost Your Turn!",
                body=message,
                url="/appointments",
                tag=f"queue-{appointment_id}"
            )
            notifications_sent.append("push")
        except Exception as e:
            logger.error(f"Failed to send push notification: {e}")
    
    # Send SMS (optional - can be expensive)
    # Commented out to save costs, uncomment if needed
    # if phone and send_sms_notification:
    #     try:
    #         await send_sms_notification(phone, message)
    #         notifications_sent.append("sms")
    #     except Exception as e:
    #         logger.error(f"Failed to send SMS: {e}")
    
    # Log notification
    await db.queue_notifications.insert_one({
        "id": str(uuid.uuid4()),
        "appointment_id": appointment_id,
        "positions_ahead": positions_ahead,
        "message": message,
        "notifications_sent": notifications_sent,
        "sent_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "message": f"Notification sent to {patient_name}",
        "notifications_sent": notifications_sent
    }


# ============ STAFF ENDPOINTS ============

async def verify_staff(authorization: str = Header(None)):
    """Verify staff token"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Staff authentication required")
    
    try:
        token = authorization.split(' ')[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/staff/call-next/{clinic}")
async def staff_call_next_patient(clinic: str, staff = Depends(verify_staff)):
    """
    Staff action: Call next patient in queue
    """
    today = get_ist_today()
    
    # Find next waiting patient (priority-based)
    next_patient = await db.appointments.find_one(
        {
            "clinic": {"$regex": clinic, "$options": "i"},
            "date": today,
            "status": {"$in": ["Checked-In", "In Clinic", "On-Way"]}
        },
        {"_id": 0},
        sort=[("priority_order", 1), ("check_in_time", 1)]
    )
    
    if not next_patient:
        # Check walk-in queue
        next_patient = await db.patient_queue.find_one(
            {
                "clinic": {"$regex": clinic, "$options": "i"},
                "date": today,
                "status": "waiting"
            },
            {"_id": 0},
            sort=[("priority_order", 1), ("check_in_time", 1)]
        )
    
    if not next_patient:
        return {
            "success": False,
            "message": "No patients waiting in queue"
        }
    
    # Update status to In-Progress
    now = datetime.now(timezone.utc).isoformat()
    collection = db.appointments if next_patient.get("appointment_type") != "WALK-IN" else db.patient_queue
    
    await collection.update_one(
        {"id": next_patient["id"]},
        {"$set": {
            "status": "In-Progress",
            "called_time": now,
            "called_by": staff.get("name", "Staff")
        }}
    )
    
    # Notify patient
    await notify_patient_queue_update(next_patient["id"], 0)
    
    # Notify next 2 patients they're coming up
    await _notify_upcoming_patients(clinic, 2)
    
    return {
        "success": True,
        "called_patient": {
            "id": next_patient["id"],
            "name": next_patient.get("patient_name"),
            "token": next_patient.get("token_number"),
            "type": "walk-in" if next_patient.get("appointment_type") == "WALK-IN" else "appointment"
        }
    }


@router.post("/staff/complete/{appointment_id}")
async def staff_mark_complete(appointment_id: str, staff = Depends(verify_staff)):
    """
    Staff action: Mark patient consultation as complete
    """
    now = datetime.now(timezone.utc).isoformat()
    
    # Try appointments first
    result = await db.appointments.update_one(
        {"id": appointment_id},
        {"$set": {
            "status": "Completed",
            "completed_at": now,
            "completed_by": staff.get("name", "Staff")
        }}
    )
    
    if result.modified_count == 0:
        # Try walk-in queue
        result = await db.patient_queue.update_one(
            {"id": appointment_id},
            {"$set": {
                "status": "completed",
                "completed_time": now
            }}
        )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    return {
        "success": True,
        "message": "Consultation marked as complete"
    }


@router.get("/staff/analytics/{clinic}")
async def get_queue_analytics(clinic: str, staff = Depends(verify_staff)):
    """
    Staff: Get queue analytics and insights
    """
    today = get_ist_today()
    
    # Today's stats
    todays_appointments = await db.appointments.find({
        "clinic": {"$regex": clinic, "$options": "i"},
        "date": today
    }, {"_id": 0}).to_list(200)
    
    todays_walkkins = await db.patient_queue.find({
        "clinic": {"$regex": clinic, "$options": "i"},
        "date": today
    }, {"_id": 0}).to_list(100)
    
    total_patients = len(todays_appointments) + len(todays_walkkins)
    completed = len([a for a in todays_appointments if a.get("status") == "Completed"])
    waiting = len([a for a in todays_appointments if a.get("status") in ["Checked-In", "In Clinic"]])
    no_shows = len([a for a in todays_appointments if a.get("status") == "No-Show"])
    
    # Calculate average wait time today
    wait_times = []
    for apt in todays_appointments:
        if apt.get("check_in_time") and apt.get("called_time"):
            try:
                check_in = datetime.fromisoformat(apt["check_in_time"].replace("Z", "+00:00"))
                called = datetime.fromisoformat(apt["called_time"].replace("Z", "+00:00"))
                wait_times.append((called - check_in).total_seconds() / 60)
            except:
                pass
    
    avg_wait_today = sum(wait_times) / len(wait_times) if wait_times else 0
    
    return {
        "success": True,
        "clinic": clinic,
        "date": today,
        "today_stats": {
            "total_patients": total_patients,
            "completed": completed,
            "waiting": waiting,
            "no_shows": no_shows,
            "walk_ins": len(todays_walkkins),
            "avg_wait_time_minutes": round(avg_wait_today, 1)
        },
        "current_queue_length": waiting,
        "efficiency_score": round((completed / total_patients * 100) if total_patients > 0 else 0, 1)
    }


# ============ Helper Functions ============

def _mask_name(name: str) -> str:
    """Mask patient name for privacy on public displays"""
    if not name:
        return "Patient"
    parts = name.split()
    if len(parts) >= 2:
        return f"{parts[0]} {parts[1][0]}."
    return f"{name[0]}***"


async def _calculate_avg_consultation_time(clinic: str) -> int:
    """Calculate average consultation time from recent history"""
    recent = await db.appointments.find({
        "clinic": {"$regex": clinic, "$options": "i"},
        "status": "Completed",
        "check_in_time": {"$exists": True},
        "completed_at": {"$exists": True}
    }).sort("completed_at", -1).limit(50).to_list(50)
    
    times = []
    for apt in recent:
        try:
            check_in = datetime.fromisoformat(apt["check_in_time"].replace("Z", "+00:00"))
            completed = datetime.fromisoformat(apt["completed_at"].replace("Z", "+00:00"))
            duration = (completed - check_in).total_seconds() / 60
            if 5 <= duration <= 60:
                times.append(duration)
        except:
            pass
    
    return round(sum(times) / len(times)) if times else 12  # Default 12 min


async def _calculate_queue_position(appointment: dict, clinic: str) -> dict:
    """Calculate patient's position in queue"""
    today = get_ist_today()
    status = appointment.get("status", "")
    
    if status in ["In-Progress", "Completed"]:
        return {
            "position": 0,
            "patients_ahead": 0,
            "estimated_wait_minutes": 0,
            "status": status
        }
    
    check_in_time = appointment.get("check_in_time")
    
    # Count patients ahead
    query = {
        "clinic": {"$regex": clinic, "$options": "i"},
        "date": today,
        "status": {"$in": ["Checked-In", "In Clinic", "waiting"]}
    }
    
    if check_in_time:
        query["check_in_time"] = {"$lt": check_in_time}
    
    patients_ahead = await db.appointments.count_documents(query)
    walk_ins_ahead = await db.patient_queue.count_documents({
        "clinic": {"$regex": clinic, "$options": "i"},
        "date": today,
        "status": "waiting",
        "check_in_time": {"$lt": check_in_time} if check_in_time else {}
    })
    
    total_ahead = patients_ahead + walk_ins_ahead
    avg_time = await _calculate_avg_consultation_time(clinic)
    
    return {
        "position": total_ahead + 1,
        "patients_ahead": total_ahead,
        "estimated_wait_minutes": total_ahead * avg_time,
        "status": status
    }


async def _notify_upcoming_patients(clinic: str, count: int):
    """Notify next X patients in queue"""
    today = get_ist_today()
    
    upcoming = await db.appointments.find(
        {
            "clinic": {"$regex": clinic, "$options": "i"},
            "date": today,
            "status": {"$in": ["Checked-In", "In Clinic"]}
        },
        {"_id": 0}
    ).sort("check_in_time", 1).limit(count).to_list(count)
    
    for i, apt in enumerate(upcoming):
        try:
            await notify_patient_queue_update(apt["id"], i + 1)
        except Exception as e:
            logger.error(f"Failed to notify patient {apt.get('id')}: {e}")


def _generate_busy_hour_recommendation(peak_hours: list) -> str:
    """Generate recommendation based on busy hours"""
    if not peak_hours:
        return "Schedule flexibility available throughout the day."
    
    peak = peak_hours[0]
    return f"Tip: {peak['day']}s around {peak['hour_label']} tend to be busy. Consider scheduling during off-peak hours for shorter wait times."
