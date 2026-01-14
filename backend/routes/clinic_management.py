"""
Nevika Cura - Clinic Management Routes
Smart Queue, Appointment Optimizer, Staff Analytics, Patient Recall, Financial Dashboard
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta, date
import jwt
import os
import logging
import json
from collections import defaultdict

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/clinic-management", tags=["Clinic Management"])

# Will be injected from server.py
db = None
JWT_SECRET = None
JWT_ALGORITHM = "HS256"
EMERGENT_LLM_KEY = None
send_email_notification = None

def set_db(database):
    global db
    db = database

def set_jwt_config(secret, algorithm="HS256"):
    global JWT_SECRET, JWT_ALGORITHM
    JWT_SECRET = secret
    JWT_ALGORITHM = algorithm

def set_llm_key(key):
    global EMERGENT_LLM_KEY
    EMERGENT_LLM_KEY = key

def set_notification_functions(email_func):
    global send_email_notification
    send_email_notification = email_func

# ============ Auth Verification ============

async def verify_admin_or_staff(authorization: str = Header(None)):
    """Verify admin or staff token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization required")
    
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        role = payload.get("role", "")
        if role not in ["admin", "super_admin", "doctor", "staff", "doctor_pushpa", "doctor_amnion"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ MODELS ============

class QueueEntry(BaseModel):
    appointment_id: str
    patient_name: str
    patient_phone: Optional[str] = None
    patient_email: Optional[str] = None
    clinic: str  # pushpa or amnion
    check_in_time: Optional[str] = None
    priority: str = "normal"  # normal, high, emergency

class QueueNotification(BaseModel):
    appointment_id: str
    notification_type: str  # email, app
    message: Optional[str] = None

# ============ 1. SMART QUEUE & WAIT TIME MANAGEMENT ============

@router.get("/queue/{clinic}")
async def get_clinic_queue(clinic: str, auth = Depends(verify_admin_or_staff)):
    """Get real-time queue for a clinic"""
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Get today's appointments that are checked in or waiting
    appointments = await db.appointments.find({
        "clinic": {"$regex": clinic, "$options": "i"},
        "date": today,
        "status": {"$in": ["Confirmed", "Checked-In", "In-Progress"]}
    }, {"_id": 0}).sort("time", 1).to_list(100)
    
    # Calculate queue positions and wait times
    queue = []
    avg_consultation_time = 15  # Default 15 minutes per patient
    
    # Get average consultation time from history
    recent_completed = await db.appointments.find({
        "clinic": {"$regex": clinic, "$options": "i"},
        "status": "Completed",
        "completed_at": {"$exists": True},
        "check_in_time": {"$exists": True}
    }).sort("completed_at", -1).to_list(50)
    
    if recent_completed:
        total_time = 0
        count = 0
        for apt in recent_completed:
            try:
                check_in = datetime.fromisoformat(apt.get("check_in_time", ""))
                completed = datetime.fromisoformat(apt.get("completed_at", ""))
                duration = (completed - check_in).total_seconds() / 60
                if 5 <= duration <= 60:  # Valid range
                    total_time += duration
                    count += 1
            except:
                pass
        if count > 0:
            avg_consultation_time = total_time / count
    
    current_position = 0
    in_progress_count = len([a for a in appointments if a.get("status") == "In-Progress"])
    
    for apt in appointments:
        current_position += 1
        status = apt.get("status", "")
        
        # Calculate estimated wait time
        if status == "In-Progress":
            wait_time = 0
            position = 0
        elif status == "Checked-In":
            position = current_position - in_progress_count
            wait_time = max(0, (position - 1) * avg_consultation_time)
        else:
            position = current_position
            wait_time = position * avg_consultation_time
        
        queue.append({
            "appointment_id": apt.get("id"),
            "patient_name": apt.get("patient_name"),
            "patient_phone": apt.get("phone"),
            "patient_email": apt.get("email"),
            "time_slot": apt.get("time"),
            "doctor": apt.get("doctor_name", apt.get("doctor")),
            "status": status,
            "position": position if status != "In-Progress" else 0,
            "estimated_wait_minutes": round(wait_time),
            "check_in_time": apt.get("check_in_time"),
            "priority": apt.get("priority", "normal")
        })
    
    return {
        "success": True,
        "clinic": clinic,
        "date": today,
        "queue": queue,
        "total_waiting": len([q for q in queue if q["status"] == "Checked-In"]),
        "in_progress": in_progress_count,
        "avg_consultation_time": round(avg_consultation_time),
        "generated_at": datetime.now(timezone.utc).isoformat()
    }

@router.post("/queue/check-in")
async def check_in_patient(entry: QueueEntry, auth = Depends(verify_admin_or_staff)):
    """Check in a patient to the queue"""
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.appointments.update_one(
        {"id": entry.appointment_id},
        {"$set": {
            "status": "Checked-In",
            "check_in_time": now,
            "priority": entry.priority
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Log the check-in
    await db.queue_logs.insert_one({
        "appointment_id": entry.appointment_id,
        "action": "check_in",
        "clinic": entry.clinic,
        "timestamp": now,
        "priority": entry.priority
    })
    
    return {"success": True, "message": "Patient checked in", "check_in_time": now}

@router.post("/queue/notify")
async def send_queue_notification(notification: QueueNotification, auth = Depends(verify_admin_or_staff)):
    """Send queue notification to patient (email or in-app)"""
    # Get appointment details
    apt = await db.appointments.find_one({"id": notification.appointment_id}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Get queue position
    clinic = apt.get("clinic", "")
    today = datetime.now().strftime("%Y-%m-%d")
    
    waiting = await db.appointments.count_documents({
        "clinic": {"$regex": clinic, "$options": "i"},
        "date": today,
        "status": "Checked-In",
        "check_in_time": {"$lt": apt.get("check_in_time", datetime.now().isoformat())}
    })
    
    position = waiting + 1
    est_wait = position * 15  # Assume 15 min avg
    
    message = notification.message or f"Your position in queue: #{position}. Estimated wait: ~{est_wait} minutes."
    
    # Store notification for in-app display
    notif_doc = {
        "id": f"queue_{datetime.now().timestamp()}",
        "user_id": apt.get("user_id"),
        "type": "queue_update",
        "title": "Queue Update",
        "message": message,
        "appointment_id": notification.appointment_id,
        "position": position,
        "estimated_wait": est_wait,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "read": False
    }
    await db.notifications.insert_one(notif_doc)
    
    # Send email if requested
    if notification.notification_type == "email" and apt.get("email") and send_email_notification:
        try:
            await send_email_notification(
                apt.get("email"),
                "Queue Update - Nevika Cura",
                f"""
                <h2>Queue Update</h2>
                <p>Dear {apt.get('patient_name')},</p>
                <p>{message}</p>
                <p>Please be ready when called.</p>
                <p>Thank you for your patience!</p>
                """
            )
        except Exception as e:
            logger.error(f"Failed to send queue email: {e}")
    
    return {
        "success": True,
        "message": "Notification sent",
        "position": position,
        "estimated_wait": est_wait
    }

@router.get("/queue/analytics/{clinic}")
async def get_queue_analytics(clinic: str, days: int = 30, auth = Depends(verify_admin_or_staff)):
    """Get historical queue analytics - peak hours, average wait times"""
    from_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    # Get completed appointments with timing data
    appointments = await db.appointments.find({
        "clinic": {"$regex": clinic, "$options": "i"},
        "status": "Completed",
        "date": {"$gte": from_date},
        "check_in_time": {"$exists": True},
        "completed_at": {"$exists": True}
    }, {"_id": 0}).to_list(1000)
    
    # Analyze by hour
    hourly_stats = defaultdict(lambda: {"count": 0, "total_wait": 0})
    daily_stats = defaultdict(lambda: {"count": 0, "total_wait": 0})
    weekday_stats = defaultdict(lambda: {"count": 0, "total_wait": 0})
    
    for apt in appointments:
        try:
            check_in = datetime.fromisoformat(apt.get("check_in_time", ""))
            completed = datetime.fromisoformat(apt.get("completed_at", ""))
            wait_time = (completed - check_in).total_seconds() / 60
            
            if 5 <= wait_time <= 120:  # Valid range
                hour = check_in.hour
                date_str = check_in.strftime("%Y-%m-%d")
                weekday = check_in.strftime("%A")
                
                hourly_stats[hour]["count"] += 1
                hourly_stats[hour]["total_wait"] += wait_time
                
                daily_stats[date_str]["count"] += 1
                daily_stats[date_str]["total_wait"] += wait_time
                
                weekday_stats[weekday]["count"] += 1
                weekday_stats[weekday]["total_wait"] += wait_time
        except:
            pass
    
    # Calculate averages
    peak_hours = []
    for hour, stats in sorted(hourly_stats.items()):
        avg_wait = stats["total_wait"] / stats["count"] if stats["count"] > 0 else 0
        peak_hours.append({
            "hour": f"{hour:02d}:00",
            "patient_count": stats["count"],
            "avg_wait_minutes": round(avg_wait, 1)
        })
    
    weekday_summary = []
    for day, stats in weekday_stats.items():
        avg_wait = stats["total_wait"] / stats["count"] if stats["count"] > 0 else 0
        weekday_summary.append({
            "day": day,
            "patient_count": stats["count"],
            "avg_wait_minutes": round(avg_wait, 1)
        })
    
    # Find busiest hours
    busiest = sorted(peak_hours, key=lambda x: x["patient_count"], reverse=True)[:3]
    
    return {
        "success": True,
        "clinic": clinic,
        "period_days": days,
        "total_patients": len(appointments),
        "peak_hours": peak_hours,
        "busiest_hours": busiest,
        "weekday_summary": weekday_summary,
        "overall_avg_wait": round(sum(h["avg_wait_minutes"] * h["patient_count"] for h in peak_hours) / max(1, sum(h["patient_count"] for h in peak_hours)), 1)
    }

# ============ 2. AI APPOINTMENT OPTIMIZER ============

class OptimizeScheduleRequest(BaseModel):
    clinic: str
    date: str  # YYYY-MM-DD
    
@router.post("/appointments/optimize")
async def optimize_appointments(request: OptimizeScheduleRequest, auth = Depends(verify_admin_or_staff)):
    """AI-powered appointment optimization suggestions"""
    
    # Get existing appointments for the date
    appointments = await db.appointments.find({
        "clinic": {"$regex": request.clinic, "$options": "i"},
        "date": request.date,
        "status": {"$nin": ["Cancelled"]}
    }, {"_id": 0}).sort("time", 1).to_list(100)
    
    # Get historical no-show data for prediction
    historical = await db.appointments.find({
        "clinic": {"$regex": request.clinic, "$options": "i"},
        "status": {"$in": ["Completed", "No-Show", "Cancelled"]}
    }, {"_id": 0}).to_list(500)
    
    # Calculate no-show patterns
    user_noshow_rates = defaultdict(lambda: {"total": 0, "noshows": 0})
    time_noshow_rates = defaultdict(lambda: {"total": 0, "noshows": 0})
    
    for apt in historical:
        user_id = apt.get("user_id", "unknown")
        time_slot = apt.get("time", "")[:2]  # Hour only
        
        user_noshow_rates[user_id]["total"] += 1
        time_noshow_rates[time_slot]["total"] += 1
        
        if apt.get("status") == "No-Show":
            user_noshow_rates[user_id]["noshows"] += 1
            time_noshow_rates[time_slot]["noshows"] += 1
    
    # Analyze schedule
    suggestions = []
    gaps = []
    overbooked_slots = defaultdict(list)
    
    # Group by time slot
    for apt in appointments:
        slot = apt.get("time", "")
        overbooked_slots[slot].append(apt)
    
    # Find gaps between appointments
    times = sorted(set(apt.get("time", "") for apt in appointments))
    for i in range(len(times) - 1):
        try:
            current = datetime.strptime(times[i], "%H:%M")
            next_time = datetime.strptime(times[i + 1], "%H:%M")
            gap = (next_time - current).total_seconds() / 60
            
            if gap > 45:  # More than 45 min gap
                gaps.append({
                    "after": times[i],
                    "before": times[i + 1],
                    "gap_minutes": int(gap),
                    "suggestion": f"Consider adding appointment between {times[i]} and {times[i + 1]}"
                })
        except:
            pass
    
    # Predict no-shows
    no_show_predictions = []
    for apt in appointments:
        user_id = apt.get("user_id", "unknown")
        time_slot = apt.get("time", "")[:2]
        
        user_rate = user_noshow_rates[user_id]
        time_rate = time_noshow_rates[time_slot]
        
        user_noshow_pct = (user_rate["noshows"] / user_rate["total"] * 100) if user_rate["total"] > 2 else 0
        time_noshow_pct = (time_rate["noshows"] / time_rate["total"] * 100) if time_rate["total"] > 5 else 0
        
        combined_risk = (user_noshow_pct * 0.7 + time_noshow_pct * 0.3)
        
        if combined_risk > 20:
            no_show_predictions.append({
                "appointment_id": apt.get("id"),
                "patient_name": apt.get("patient_name"),
                "time": apt.get("time"),
                "no_show_risk": round(combined_risk, 1),
                "reason": "High historical no-show rate" if user_noshow_pct > 30 else "Time slot has higher no-shows",
                "suggestion": "Consider sending reminder or overbooking this slot"
            })
    
    # Check for overbooking
    overbooking_issues = []
    for slot, apts in overbooked_slots.items():
        if len(apts) > 1:
            overbooking_issues.append({
                "time": slot,
                "count": len(apts),
                "patients": [a.get("patient_name") for a in apts],
                "suggestion": "Multiple patients booked - ensure adequate buffer time"
            })
    
    # Buffer time recommendations
    buffer_suggestions = []
    consultation_types = defaultdict(list)
    for apt in appointments:
        apt_type = apt.get("appointment_type", "General")
        consultation_types[apt_type].append(apt)
    
    type_durations = {
        "General Consultation": 15,
        "Follow-up": 10,
        "New Patient": 25,
        "Procedure": 45,
        "Ultrasound": 30,
        "Pregnancy Checkup": 20
    }
    
    for apt_type, count in consultation_types.items():
        recommended = type_durations.get(apt_type, 15)
        buffer_suggestions.append({
            "appointment_type": apt_type,
            "count": len(count),
            "recommended_duration_minutes": recommended,
            "buffer_between": 5
        })
    
    return {
        "success": True,
        "clinic": request.clinic,
        "date": request.date,
        "total_appointments": len(appointments),
        "schedule_gaps": gaps,
        "no_show_predictions": sorted(no_show_predictions, key=lambda x: x["no_show_risk"], reverse=True),
        "overbooking_issues": overbooking_issues,
        "buffer_recommendations": buffer_suggestions,
        "optimization_score": max(0, 100 - len(gaps) * 5 - len(overbooking_issues) * 10 - len([n for n in no_show_predictions if n["no_show_risk"] > 40]) * 5)
    }

# ============ 3. STAFF PERFORMANCE ANALYTICS ============

@router.get("/staff/analytics")
async def get_staff_analytics(clinic: Optional[str] = None, days: int = 30, auth = Depends(verify_admin_or_staff)):
    """Get staff and doctor performance analytics"""
    from_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    # Build query
    query = {"date": {"$gte": from_date}}
    if clinic:
        query["clinic"] = {"$regex": clinic, "$options": "i"}
    
    # Get appointments
    appointments = await db.appointments.find(query, {"_id": 0}).to_list(2000)
    
    # Doctor metrics
    doctor_stats = defaultdict(lambda: {
        "total": 0, "completed": 0, "cancelled": 0, "no_show": 0,
        "total_time": 0, "time_count": 0, "revenue": 0
    })
    
    for apt in appointments:
        doctor = apt.get("doctor_name", apt.get("doctor", "Unknown"))
        doctor_stats[doctor]["total"] += 1
        
        status = apt.get("status", "")
        if status == "Completed":
            doctor_stats[doctor]["completed"] += 1
            doctor_stats[doctor]["revenue"] += apt.get("fee", 0)
            
            # Calculate consultation time
            if apt.get("check_in_time") and apt.get("completed_at"):
                try:
                    check_in = datetime.fromisoformat(apt.get("check_in_time"))
                    completed = datetime.fromisoformat(apt.get("completed_at"))
                    duration = (completed - check_in).total_seconds() / 60
                    if 5 <= duration <= 120:
                        doctor_stats[doctor]["total_time"] += duration
                        doctor_stats[doctor]["time_count"] += 1
                except:
                    pass
        elif status == "Cancelled":
            doctor_stats[doctor]["cancelled"] += 1
        elif status == "No-Show":
            doctor_stats[doctor]["no_show"] += 1
    
    # Format doctor analytics
    doctor_analytics = []
    for doctor, stats in doctor_stats.items():
        avg_time = stats["total_time"] / stats["time_count"] if stats["time_count"] > 0 else 0
        patients_per_day = stats["completed"] / days
        
        doctor_analytics.append({
            "doctor_name": doctor,
            "total_appointments": stats["total"],
            "completed": stats["completed"],
            "cancelled": stats["cancelled"],
            "no_shows": stats["no_show"],
            "completion_rate": round(stats["completed"] / stats["total"] * 100, 1) if stats["total"] > 0 else 0,
            "avg_consultation_minutes": round(avg_time, 1),
            "patients_per_day": round(patients_per_day, 1),
            "revenue_generated": stats["revenue"]
        })
    
    # Staff attendance (from staff_attendance collection if exists)
    staff_attendance = []
    try:
        attendance_records = await db.staff_attendance.find({
            "date": {"$gte": from_date}
        }, {"_id": 0}).to_list(500)
        
        staff_summary = defaultdict(lambda: {"present": 0, "absent": 0, "late": 0})
        for record in attendance_records:
            staff_id = record.get("staff_id", "")
            status = record.get("status", "present")
            staff_summary[staff_id][status] += 1
        
        for staff_id, summary in staff_summary.items():
            total = summary["present"] + summary["absent"]
            staff_attendance.append({
                "staff_id": staff_id,
                "days_present": summary["present"],
                "days_absent": summary["absent"],
                "late_arrivals": summary["late"],
                "attendance_rate": round(summary["present"] / total * 100, 1) if total > 0 else 0
            })
    except:
        pass
    
    return {
        "success": True,
        "period_days": days,
        "clinic": clinic or "All Clinics",
        "doctor_analytics": sorted(doctor_analytics, key=lambda x: x["completed"], reverse=True),
        "staff_attendance": staff_attendance,
        "summary": {
            "total_appointments": sum(d["total_appointments"] for d in doctor_analytics),
            "total_completed": sum(d["completed"] for d in doctor_analytics),
            "total_revenue": sum(d["revenue_generated"] for d in doctor_analytics),
            "overall_completion_rate": round(sum(d["completed"] for d in doctor_analytics) / max(1, sum(d["total_appointments"] for d in doctor_analytics)) * 100, 1)
        }
    }

@router.post("/staff/attendance")
async def log_staff_attendance(
    staff_id: str,
    status: str = "present",  # present, absent, late
    notes: Optional[str] = None,
    auth = Depends(verify_admin_or_staff)
):
    """Log staff attendance"""
    today = datetime.now().strftime("%Y-%m-%d")
    
    attendance_doc = {
        "staff_id": staff_id,
        "date": today,
        "status": status,
        "check_in_time": datetime.now(timezone.utc).isoformat() if status in ["present", "late"] else None,
        "notes": notes,
        "logged_by": auth.get("username", "system")
    }
    
    # Upsert - update if exists for today
    await db.staff_attendance.update_one(
        {"staff_id": staff_id, "date": today},
        {"$set": attendance_doc},
        upsert=True
    )
    
    return {"success": True, "message": f"Attendance logged for {staff_id}"}

# ============ 4. PATIENT RECALL & FOLLOW-UP SYSTEM ============

@router.get("/recall/due-followups")
async def get_due_followups(days_overdue: int = 7, auth = Depends(verify_admin_or_staff)):
    """Get patients due for follow-ups"""
    today = datetime.now()
    
    # Find completed appointments that had follow-up recommended
    appointments = await db.appointments.find({
        "status": "Completed",
        "follow_up_recommended": True,
        "follow_up_date": {"$exists": True}
    }, {"_id": 0}).to_list(500)
    
    due_followups = []
    for apt in appointments:
        try:
            follow_up_date = datetime.strptime(apt.get("follow_up_date", ""), "%Y-%m-%d")
            days_since = (today - follow_up_date).days
            
            if days_since >= 0:  # Due or overdue
                # Check if follow-up was booked
                existing_followup = await db.appointments.find_one({
                    "user_id": apt.get("user_id"),
                    "date": {"$gt": apt.get("date")},
                    "status": {"$nin": ["Cancelled"]}
                })
                
                if not existing_followup:
                    due_followups.append({
                        "original_appointment_id": apt.get("id"),
                        "patient_name": apt.get("patient_name"),
                        "patient_phone": apt.get("phone"),
                        "patient_email": apt.get("email"),
                        "user_id": apt.get("user_id"),
                        "last_visit_date": apt.get("date"),
                        "doctor": apt.get("doctor_name", apt.get("doctor")),
                        "clinic": apt.get("clinic"),
                        "follow_up_due_date": apt.get("follow_up_date"),
                        "days_overdue": days_since,
                        "reason": apt.get("follow_up_reason", "Regular follow-up"),
                        "priority": "high" if days_since > days_overdue else "normal"
                    })
        except:
            pass
    
    # Also check for chronic conditions needing regular check-ups
    # (e.g., diabetes patients who haven't visited in 3 months)
    
    return {
        "success": True,
        "due_followups": sorted(due_followups, key=lambda x: x["days_overdue"], reverse=True),
        "total_due": len(due_followups),
        "high_priority": len([f for f in due_followups if f["priority"] == "high"])
    }

@router.post("/recall/send-reminder")
async def send_followup_reminder(
    user_id: str,
    patient_name: str,
    patient_email: Optional[str] = None,
    reason: str = "Regular follow-up",
    auth = Depends(verify_admin_or_staff)
):
    """Send follow-up reminder to patient"""
    # Create in-app notification
    notif_doc = {
        "id": f"recall_{datetime.now().timestamp()}",
        "user_id": user_id,
        "type": "follow_up_reminder",
        "title": "Follow-up Reminder",
        "message": f"Hi {patient_name}! It's time for your follow-up visit. Reason: {reason}. Please book your appointment.",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "read": False,
        "action_url": "/appointments/book"
    }
    await db.notifications.insert_one(notif_doc)
    
    # Send email if available
    if patient_email and send_email_notification:
        try:
            await send_email_notification(
                patient_email,
                "Follow-up Reminder - Nevika Cura",
                f"""
                <h2>Follow-up Reminder</h2>
                <p>Dear {patient_name},</p>
                <p>This is a friendly reminder that you're due for a follow-up visit.</p>
                <p><strong>Reason:</strong> {reason}</p>
                <p>Please book your appointment at your earliest convenience.</p>
                <p>Stay healthy!</p>
                <p>Team Nevika Cura</p>
                """
            )
        except Exception as e:
            logger.error(f"Failed to send recall email: {e}")
    
    # Log the recall attempt
    await db.recall_logs.insert_one({
        "user_id": user_id,
        "patient_name": patient_name,
        "reason": reason,
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "sent_by": auth.get("username", "system"),
        "email_sent": patient_email is not None
    })
    
    return {"success": True, "message": f"Reminder sent to {patient_name}"}

@router.get("/recall/campaigns")
async def get_recall_campaigns(auth = Depends(verify_admin_or_staff)):
    """Get active recall campaigns and their status"""
    # Get recent recall logs grouped by reason
    recall_logs = await db.recall_logs.find({
        "sent_at": {"$gte": (datetime.now() - timedelta(days=30)).isoformat()}
    }, {"_id": 0}).to_list(500)
    
    campaigns = defaultdict(lambda: {"sent": 0, "booked": 0})
    for log in recall_logs:
        reason = log.get("reason", "General")
        campaigns[reason]["sent"] += 1
    
    # Check how many actually booked
    for log in recall_logs:
        user_id = log.get("user_id")
        sent_at = log.get("sent_at", "")
        
        # Check if user booked after reminder
        booking = await db.appointments.find_one({
            "user_id": user_id,
            "created_at": {"$gt": sent_at},
            "status": {"$nin": ["Cancelled"]}
        })
        
        if booking:
            reason = log.get("reason", "General")
            campaigns[reason]["booked"] += 1
    
    campaign_list = []
    for reason, stats in campaigns.items():
        campaign_list.append({
            "campaign_type": reason,
            "reminders_sent": stats["sent"],
            "appointments_booked": stats["booked"],
            "conversion_rate": round(stats["booked"] / stats["sent"] * 100, 1) if stats["sent"] > 0 else 0
        })
    
    return {
        "success": True,
        "campaigns": campaign_list,
        "total_reminders_sent": sum(c["reminders_sent"] for c in campaign_list),
        "total_conversions": sum(c["appointments_booked"] for c in campaign_list)
    }

# ============ 5. FINANCIAL DASHBOARD & BILLING ANALYTICS ============

@router.get("/finance/dashboard")
async def get_financial_dashboard(
    period: str = "month",  # day, week, month
    clinic: Optional[str] = None,
    auth = Depends(verify_admin_or_staff)
):
    """Get financial dashboard with revenue tracking"""
    today = datetime.now()
    
    if period == "day":
        from_date = today.strftime("%Y-%m-%d")
        period_label = "Today"
    elif period == "week":
        from_date = (today - timedelta(days=7)).strftime("%Y-%m-%d")
        period_label = "This Week"
    else:
        from_date = (today - timedelta(days=30)).strftime("%Y-%m-%d")
        period_label = "This Month"
    
    # Build query
    query = {"date": {"$gte": from_date}}
    if clinic:
        query["clinic"] = {"$regex": clinic, "$options": "i"}
    
    # Get appointments
    appointments = await db.appointments.find(query, {"_id": 0}).to_list(2000)
    
    # Revenue calculations
    total_revenue = 0
    revenue_by_service = defaultdict(float)
    revenue_by_day = defaultdict(float)
    revenue_by_doctor = defaultdict(float)
    payment_modes = defaultdict(lambda: {"count": 0, "amount": 0})
    
    for apt in appointments:
        if apt.get("status") == "Completed":
            fee = apt.get("fee", 0) or apt.get("amount", 0) or 0
            total_revenue += fee
            
            service = apt.get("appointment_type", apt.get("service_type", "Consultation"))
            revenue_by_service[service] += fee
            
            date = apt.get("date", "")
            revenue_by_day[date] += fee
            
            doctor = apt.get("doctor_name", apt.get("doctor", "Unknown"))
            revenue_by_doctor[doctor] += fee
            
            payment_mode = apt.get("payment_mode", "Cash")
            payment_modes[payment_mode]["count"] += 1
            payment_modes[payment_mode]["amount"] += fee
    
    # Get diagnostic orders revenue
    diag_query = {"created_at": {"$gte": from_date + "T00:00:00"}}
    if clinic:
        diag_query["clinic"] = {"$regex": clinic, "$options": "i"}
    
    diag_orders = await db.diagnostic_orders.find(diag_query, {"_id": 0}).to_list(500)
    diag_revenue = sum(o.get("total_amount", 0) for o in diag_orders if o.get("status") not in ["Cancelled"])
    
    # Get pharmacy orders revenue
    pharmacy_orders = await db.pharmacy_orders.find({
        "created_at": {"$gte": from_date + "T00:00:00"}
    }, {"_id": 0}).to_list(500)
    pharmacy_revenue = sum(o.get("total_amount", 0) for o in pharmacy_orders if o.get("status") not in ["Cancelled"])
    
    # Service-wise breakdown
    service_breakdown = [
        {"service": service, "revenue": amount, "percentage": round(amount / total_revenue * 100, 1) if total_revenue > 0 else 0}
        for service, amount in sorted(revenue_by_service.items(), key=lambda x: x[1], reverse=True)
    ]
    
    # Daily trend
    daily_trend = [
        {"date": date, "revenue": amount}
        for date, amount in sorted(revenue_by_day.items())
    ]
    
    # Payment mode breakdown
    payment_breakdown = [
        {"mode": mode, "transactions": stats["count"], "amount": stats["amount"]}
        for mode, stats in payment_modes.items()
    ]
    
    return {
        "success": True,
        "period": period_label,
        "clinic": clinic or "All Clinics",
        "summary": {
            "total_consultation_revenue": total_revenue,
            "diagnostic_revenue": diag_revenue,
            "pharmacy_revenue": pharmacy_revenue,
            "grand_total": total_revenue + diag_revenue + pharmacy_revenue,
            "total_appointments": len([a for a in appointments if a.get("status") == "Completed"]),
            "avg_revenue_per_patient": round(total_revenue / max(1, len([a for a in appointments if a.get("status") == "Completed"])), 2)
        },
        "service_breakdown": service_breakdown,
        "daily_trend": daily_trend,
        "payment_modes": payment_breakdown,
        "doctor_revenue": [
            {"doctor": doctor, "revenue": amount}
            for doctor, amount in sorted(revenue_by_doctor.items(), key=lambda x: x[1], reverse=True)
        ]
    }

@router.get("/finance/comparison")
async def get_financial_comparison(
    clinic: Optional[str] = None,
    auth = Depends(verify_admin_or_staff)
):
    """Compare current period with previous period"""
    today = datetime.now()
    
    # Current month
    current_start = today.replace(day=1).strftime("%Y-%m-%d")
    
    # Previous month
    prev_month = today.replace(day=1) - timedelta(days=1)
    prev_start = prev_month.replace(day=1).strftime("%Y-%m-%d")
    prev_end = prev_month.strftime("%Y-%m-%d")
    
    async def get_period_revenue(start_date, end_date=None):
        query = {"date": {"$gte": start_date}}
        if end_date:
            query["date"]["$lte"] = end_date
        if clinic:
            query["clinic"] = {"$regex": clinic, "$options": "i"}
        
        apts = await db.appointments.find(query, {"_id": 0}).to_list(2000)
        return sum(a.get("fee", 0) or 0 for a in apts if a.get("status") == "Completed")
    
    current_revenue = await get_period_revenue(current_start)
    previous_revenue = await get_period_revenue(prev_start, prev_end)
    
    growth = ((current_revenue - previous_revenue) / previous_revenue * 100) if previous_revenue > 0 else 0
    
    return {
        "success": True,
        "current_period": {
            "label": today.strftime("%B %Y"),
            "revenue": current_revenue
        },
        "previous_period": {
            "label": prev_month.strftime("%B %Y"),
            "revenue": previous_revenue
        },
        "growth_percentage": round(growth, 1),
        "growth_direction": "up" if growth > 0 else "down" if growth < 0 else "flat"
    }
