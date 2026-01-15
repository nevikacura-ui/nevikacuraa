"""
Nevika Cura - Clinic Analytics Dashboard
Admin-level analytics for clinic operations

Features:
1. Daily/weekly patient footfall trends
2. Revenue per clinic/doctor
3. Popular time slots & peak hours
4. Staff performance metrics
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timezone, timedelta
from collections import defaultdict
import jwt
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/clinic-analytics", tags=["Clinic Analytics"])

# Will be injected from server.py
db = None
JWT_SECRET = None
JWT_ALGORITHM = "HS256"

def set_db(database):
    global db
    db = database

def set_jwt_config(secret, algorithm="HS256"):
    global JWT_SECRET, JWT_ALGORITHM
    JWT_SECRET = secret
    JWT_ALGORITHM = algorithm


# ============ Helper Functions ============

def get_ist_now():
    """Get current IST time"""
    ist_offset = timedelta(hours=5, minutes=30)
    return datetime.now(timezone.utc) + ist_offset

def get_ist_today():
    """Get today's date in IST"""
    return get_ist_now().strftime("%Y-%m-%d")


# ============ Auth Helper ============

async def verify_admin_or_staff(authorization: str = Header(None)):
    """Verify admin or staff token"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        token = authorization.split(' ')[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        # Check if admin, staff, or doctor
        role = payload.get("role", "").lower()
        username = payload.get("username", "").lower()
        
        # Allow admin, staff, doctors - check various role patterns
        allowed = (
            "admin" in role or
            "staff" in role or
            "doctor" in role or
            "doc_" in username or
            "staff_" in username or
            role in ["admin", "staff", "doctor", "manager"]
        )
        
        if not allowed:
            raise HTTPException(status_code=403, detail="Admin/Staff access required")
        
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============ Dashboard Overview ============

@router.get("/overview")
async def get_dashboard_overview(
    clinic: str = "all",
    days: int = 7,
    auth = Depends(verify_admin_or_staff)
):
    """Get comprehensive dashboard overview"""
    end_date = get_ist_now()
    start_date = end_date - timedelta(days=days)
    start_str = start_date.strftime("%Y-%m-%d")
    end_str = end_date.strftime("%Y-%m-%d")
    today = get_ist_today()
    
    # Build clinic filter
    clinic_filter = {}
    if clinic != "all":
        clinic_filter = {"clinic": {"$regex": clinic, "$options": "i"}}
    
    # Fetch all data in parallel-like manner
    appointments = await db.appointments.find({
        **clinic_filter,
        "date": {"$gte": start_str, "$lte": end_str}
    }, {"_id": 0}).to_list(5000)
    
    pharmacy_orders = await db.pharmacy_orders.find({
        "created_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(1000)
    
    diagnostic_orders = await db.diagnostic_orders.find({
        "created_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(1000)
    
    # Calculate metrics
    total_appointments = len(appointments)
    completed = len([a for a in appointments if a.get("status") == "Completed"])
    cancelled = len([a for a in appointments if a.get("status") == "Cancelled"])
    no_shows = len([a for a in appointments if a.get("status") == "No-Show"])
    
    # Today's stats
    today_appointments = [a for a in appointments if a.get("date") == today]
    today_completed = len([a for a in today_appointments if a.get("status") == "Completed"])
    today_pending = len([a for a in today_appointments if a.get("status") in ["Booked", "Confirmed", "Checked-In"]])
    
    # Revenue calculation
    pharmacy_revenue = sum(o.get("total_amount", 0) for o in pharmacy_orders if o.get("status") != "Cancelled")
    diagnostic_revenue = sum(o.get("total_amount", 0) for o in diagnostic_orders if o.get("status") != "Cancelled")
    
    # Consultation fees (estimated)
    consultation_revenue = completed * 500  # Avg consultation fee
    total_revenue = pharmacy_revenue + diagnostic_revenue + consultation_revenue
    
    return {
        "success": True,
        "period": {"start": start_str, "end": end_str, "days": days},
        "clinic": clinic,
        "overview": {
            "total_appointments": total_appointments,
            "completed": completed,
            "cancelled": cancelled,
            "no_shows": no_shows,
            "completion_rate": round((completed / total_appointments) * 100, 1) if total_appointments > 0 else 0
        },
        "today": {
            "date": today,
            "total": len(today_appointments),
            "completed": today_completed,
            "pending": today_pending
        },
        "revenue": {
            "pharmacy": pharmacy_revenue,
            "diagnostics": diagnostic_revenue,
            "consultations": consultation_revenue,
            "total": total_revenue,
            "avg_daily": round(total_revenue / days, 2) if days > 0 else 0
        },
        "orders": {
            "pharmacy": len(pharmacy_orders),
            "diagnostics": len(diagnostic_orders)
        }
    }


# ============ Patient Footfall Trends ============

@router.get("/footfall")
async def get_footfall_trends(
    clinic: str = "all",
    days: int = 30,
    auth = Depends(verify_admin_or_staff)
):
    """Get daily patient footfall trends"""
    end_date = get_ist_now()
    start_date = end_date - timedelta(days=days)
    
    clinic_filter = {}
    if clinic != "all":
        clinic_filter = {"clinic": {"$regex": clinic, "$options": "i"}}
    
    appointments = await db.appointments.find({
        **clinic_filter,
        "date": {"$gte": start_date.strftime("%Y-%m-%d")}
    }, {"_id": 0, "date": 1, "status": 1, "clinic": 1}).to_list(10000)
    
    # Group by date
    daily_data = defaultdict(lambda: {"total": 0, "completed": 0, "cancelled": 0})
    
    for apt in appointments:
        date = apt.get("date", "")
        if date:
            daily_data[date]["total"] += 1
            if apt.get("status") == "Completed":
                daily_data[date]["completed"] += 1
            elif apt.get("status") == "Cancelled":
                daily_data[date]["cancelled"] += 1
    
    # Convert to sorted list
    trend_data = []
    current = start_date
    while current <= end_date:
        date_str = current.strftime("%Y-%m-%d")
        data = daily_data.get(date_str, {"total": 0, "completed": 0, "cancelled": 0})
        trend_data.append({
            "date": date_str,
            "day": current.strftime("%A"),
            "total": data["total"],
            "completed": data["completed"],
            "cancelled": data["cancelled"]
        })
        current += timedelta(days=1)
    
    # Calculate averages
    total_patients = sum(d["total"] for d in trend_data)
    avg_daily = round(total_patients / days, 1) if days > 0 else 0
    
    # Find peak day
    peak_day = max(trend_data, key=lambda x: x["total"]) if trend_data else None
    
    # Day of week analysis
    dow_stats = defaultdict(lambda: {"count": 0, "total": 0})
    for d in trend_data:
        dow_stats[d["day"]]["count"] += 1
        dow_stats[d["day"]]["total"] += d["total"]
    
    dow_averages = {
        day: round(stats["total"] / stats["count"], 1) if stats["count"] > 0 else 0
        for day, stats in dow_stats.items()
    }
    
    return {
        "success": True,
        "period_days": days,
        "clinic": clinic,
        "trend_data": trend_data,
        "summary": {
            "total_patients": total_patients,
            "avg_daily": avg_daily,
            "peak_day": peak_day,
            "day_of_week_averages": dow_averages
        }
    }


# ============ Revenue Analytics ============

@router.get("/revenue")
async def get_revenue_analytics(
    clinic: str = "all",
    days: int = 30,
    auth = Depends(verify_admin_or_staff)
):
    """Get detailed revenue analytics"""
    end_date = get_ist_now()
    start_date = end_date - timedelta(days=days)
    start_str = start_date.isoformat()
    
    # Fetch orders
    pharmacy_orders = await db.pharmacy_orders.find({
        "created_at": {"$gte": start_str},
        "status": {"$nin": ["Cancelled"]}
    }, {"_id": 0}).to_list(2000)
    
    diagnostic_orders = await db.diagnostic_orders.find({
        "created_at": {"$gte": start_str},
        "status": {"$nin": ["Cancelled"]}
    }, {"_id": 0}).to_list(2000)
    
    # Daily revenue breakdown
    daily_revenue = defaultdict(lambda: {"pharmacy": 0, "diagnostics": 0, "total": 0})
    
    for order in pharmacy_orders:
        date = order.get("created_at", "")[:10]
        amount = order.get("total_amount", 0)
        daily_revenue[date]["pharmacy"] += amount
        daily_revenue[date]["total"] += amount
    
    for order in diagnostic_orders:
        date = order.get("created_at", "")[:10]
        amount = order.get("total_amount", 0)
        daily_revenue[date]["diagnostics"] += amount
        daily_revenue[date]["total"] += amount
    
    # Convert to list
    revenue_data = []
    current = start_date
    while current <= end_date:
        date_str = current.strftime("%Y-%m-%d")
        data = daily_revenue.get(date_str, {"pharmacy": 0, "diagnostics": 0, "total": 0})
        revenue_data.append({
            "date": date_str,
            "pharmacy": data["pharmacy"],
            "diagnostics": data["diagnostics"],
            "total": data["total"]
        })
        current += timedelta(days=1)
    
    # Totals
    total_pharmacy = sum(d["pharmacy"] for d in revenue_data)
    total_diagnostics = sum(d["diagnostics"] for d in revenue_data)
    total_revenue = total_pharmacy + total_diagnostics
    
    # Top selling medicines
    medicine_sales = defaultdict(lambda: {"quantity": 0, "revenue": 0})
    for order in pharmacy_orders:
        for med in order.get("medicines", []):
            name = med.get("name", "Unknown")
            medicine_sales[name]["quantity"] += med.get("quantity", 1)
            medicine_sales[name]["revenue"] += med.get("price", 0) * med.get("quantity", 1)
    
    top_medicines = sorted(
        [{"name": k, **v} for k, v in medicine_sales.items()],
        key=lambda x: x["revenue"],
        reverse=True
    )[:10]
    
    # Top tests
    test_sales = defaultdict(lambda: {"count": 0, "revenue": 0})
    for order in diagnostic_orders:
        for test in order.get("tests", []):
            test_sales[test]["count"] += 1
    
    top_tests = sorted(
        [{"name": k, **v} for k, v in test_sales.items()],
        key=lambda x: x["count"],
        reverse=True
    )[:10]
    
    return {
        "success": True,
        "period_days": days,
        "revenue_data": revenue_data,
        "summary": {
            "total_revenue": total_revenue,
            "pharmacy_revenue": total_pharmacy,
            "diagnostic_revenue": total_diagnostics,
            "avg_daily_revenue": round(total_revenue / days, 2) if days > 0 else 0,
            "pharmacy_orders": len(pharmacy_orders),
            "diagnostic_orders": len(diagnostic_orders)
        },
        "top_medicines": top_medicines,
        "top_tests": top_tests
    }


# ============ Doctor Performance ============

@router.get("/doctor-performance")
async def get_doctor_performance(
    days: int = 30,
    auth = Depends(verify_admin_or_staff)
):
    """Get doctor-wise performance metrics"""
    end_date = get_ist_now()
    start_date = end_date - timedelta(days=days)
    start_str = start_date.strftime("%Y-%m-%d")
    
    appointments = await db.appointments.find({
        "date": {"$gte": start_str}
    }, {"_id": 0}).to_list(10000)
    
    # Group by doctor
    doctor_stats = defaultdict(lambda: {
        "total": 0,
        "completed": 0,
        "cancelled": 0,
        "no_shows": 0,
        "clinics": set(),
        "dates": set()
    })
    
    for apt in appointments:
        doctor = apt.get("doctor", "Unknown")
        doctor_stats[doctor]["total"] += 1
        doctor_stats[doctor]["clinics"].add(apt.get("clinic", ""))
        doctor_stats[doctor]["dates"].add(apt.get("date", ""))
        
        status = apt.get("status", "")
        if status == "Completed":
            doctor_stats[doctor]["completed"] += 1
        elif status == "Cancelled":
            doctor_stats[doctor]["cancelled"] += 1
        elif status == "No-Show":
            doctor_stats[doctor]["no_shows"] += 1
    
    # Convert to list with calculated metrics
    performance_data = []
    for doctor, stats in doctor_stats.items():
        completion_rate = round((stats["completed"] / stats["total"]) * 100, 1) if stats["total"] > 0 else 0
        avg_daily = round(stats["total"] / len(stats["dates"]), 1) if stats["dates"] else 0
        
        performance_data.append({
            "doctor": doctor,
            "total_appointments": stats["total"],
            "completed": stats["completed"],
            "cancelled": stats["cancelled"],
            "no_shows": stats["no_shows"],
            "completion_rate": completion_rate,
            "avg_daily_patients": avg_daily,
            "active_days": len(stats["dates"]),
            "clinics": list(stats["clinics"])
        })
    
    # Sort by total appointments
    performance_data.sort(key=lambda x: x["total_appointments"], reverse=True)
    
    return {
        "success": True,
        "period_days": days,
        "doctors": performance_data,
        "summary": {
            "total_doctors": len(performance_data),
            "total_appointments": sum(d["total_appointments"] for d in performance_data),
            "avg_completion_rate": round(
                sum(d["completion_rate"] for d in performance_data) / len(performance_data), 1
            ) if performance_data else 0
        }
    }


# ============ Time Slot Analytics ============

@router.get("/time-slots")
async def get_time_slot_analytics(
    clinic: str = "all",
    days: int = 30,
    auth = Depends(verify_admin_or_staff)
):
    """Get popular time slots and peak hours analysis"""
    end_date = get_ist_now()
    start_date = end_date - timedelta(days=days)
    
    clinic_filter = {}
    if clinic != "all":
        clinic_filter = {"clinic": {"$regex": clinic, "$options": "i"}}
    
    appointments = await db.appointments.find({
        **clinic_filter,
        "date": {"$gte": start_date.strftime("%Y-%m-%d")}
    }, {"_id": 0, "time": 1, "date": 1, "status": 1}).to_list(10000)
    
    # Group by hour
    hourly_stats = defaultdict(lambda: {"total": 0, "completed": 0})
    
    for apt in appointments:
        time_str = apt.get("time", "")
        if time_str:
            try:
                # Parse hour from various formats
                hour = int(time_str.split(":")[0].replace("AM", "").replace("PM", "").strip())
                if "PM" in time_str.upper() and hour != 12:
                    hour += 12
                elif "AM" in time_str.upper() and hour == 12:
                    hour = 0
                
                hourly_stats[hour]["total"] += 1
                if apt.get("status") == "Completed":
                    hourly_stats[hour]["completed"] += 1
            except:
                pass
    
    # Convert to list
    time_slot_data = []
    for hour in range(8, 22):  # 8 AM to 10 PM
        stats = hourly_stats.get(hour, {"total": 0, "completed": 0})
        time_slot_data.append({
            "hour": hour,
            "time_label": f"{hour:02d}:00",
            "total": stats["total"],
            "completed": stats["completed"],
            "popularity": "high" if stats["total"] > 50 else "medium" if stats["total"] > 20 else "low"
        })
    
    # Find peak hours
    sorted_hours = sorted(time_slot_data, key=lambda x: x["total"], reverse=True)
    peak_hours = sorted_hours[:3]
    low_hours = [h for h in time_slot_data if h["popularity"] == "low"]
    
    return {
        "success": True,
        "period_days": days,
        "clinic": clinic,
        "time_slot_data": time_slot_data,
        "insights": {
            "peak_hours": peak_hours,
            "recommended_slots": low_hours[:3],
            "busiest_hour": peak_hours[0] if peak_hours else None,
            "total_appointments": sum(h["total"] for h in time_slot_data)
        }
    }


# ============ Staff Performance ============

@router.get("/staff-performance")
async def get_staff_performance(
    clinic: str = "all",
    days: int = 30,
    auth = Depends(verify_admin_or_staff)
):
    """Get staff performance metrics (attendance, tasks completed)"""
    end_date = get_ist_now()
    start_date = end_date - timedelta(days=days)
    start_str = start_date.strftime("%Y-%m-%d")
    
    # Get staff attendance records
    attendance = await db.staff_attendance.find({
        "date": {"$gte": start_str}
    }, {"_id": 0}).to_list(5000)
    
    # Group by staff member
    staff_stats = defaultdict(lambda: {
        "present_days": 0,
        "late_days": 0,
        "absent_days": 0,
        "total_hours": 0,
        "clinic": ""
    })
    
    for record in attendance:
        staff_name = record.get("staff_name", "Unknown")
        status = record.get("status", "")
        
        if status == "present":
            staff_stats[staff_name]["present_days"] += 1
        elif status == "late":
            staff_stats[staff_name]["late_days"] += 1
        elif status == "absent":
            staff_stats[staff_name]["absent_days"] += 1
        
        # Calculate hours worked
        check_in = record.get("check_in_time")
        check_out = record.get("check_out_time")
        if check_in and check_out:
            try:
                in_time = datetime.fromisoformat(check_in.replace("Z", "+00:00"))
                out_time = datetime.fromisoformat(check_out.replace("Z", "+00:00"))
                hours = (out_time - in_time).total_seconds() / 3600
                staff_stats[staff_name]["total_hours"] += hours
            except:
                pass
        
        staff_stats[staff_name]["clinic"] = record.get("clinic", "")
    
    # Convert to list
    performance_data = []
    for staff_name, stats in staff_stats.items():
        total_days = stats["present_days"] + stats["late_days"] + stats["absent_days"]
        attendance_rate = round(
            ((stats["present_days"] + stats["late_days"]) / total_days) * 100, 1
        ) if total_days > 0 else 0
        
        performance_data.append({
            "staff_name": staff_name,
            "clinic": stats["clinic"],
            "present_days": stats["present_days"],
            "late_days": stats["late_days"],
            "absent_days": stats["absent_days"],
            "total_hours": round(stats["total_hours"], 1),
            "avg_hours_per_day": round(stats["total_hours"] / stats["present_days"], 1) if stats["present_days"] > 0 else 0,
            "attendance_rate": attendance_rate
        })
    
    # Sort by attendance rate
    performance_data.sort(key=lambda x: x["attendance_rate"], reverse=True)
    
    return {
        "success": True,
        "period_days": days,
        "staff": performance_data,
        "summary": {
            "total_staff": len(performance_data),
            "avg_attendance_rate": round(
                sum(s["attendance_rate"] for s in performance_data) / len(performance_data), 1
            ) if performance_data else 0
        }
    }


# ============ Clinic Comparison ============

@router.get("/clinic-comparison")
async def get_clinic_comparison(
    days: int = 30,
    auth = Depends(verify_admin_or_staff)
):
    """Compare performance across clinics"""
    end_date = get_ist_now()
    start_date = end_date - timedelta(days=days)
    start_str = start_date.strftime("%Y-%m-%d")
    
    appointments = await db.appointments.find({
        "date": {"$gte": start_str}
    }, {"_id": 0}).to_list(10000)
    
    # Group by clinic
    clinic_stats = defaultdict(lambda: {
        "total": 0,
        "completed": 0,
        "cancelled": 0,
        "doctors": set()
    })
    
    for apt in appointments:
        clinic = apt.get("clinic", "Unknown")
        clinic_stats[clinic]["total"] += 1
        clinic_stats[clinic]["doctors"].add(apt.get("doctor", ""))
        
        if apt.get("status") == "Completed":
            clinic_stats[clinic]["completed"] += 1
        elif apt.get("status") == "Cancelled":
            clinic_stats[clinic]["cancelled"] += 1
    
    # Convert to list
    comparison_data = []
    for clinic, stats in clinic_stats.items():
        completion_rate = round((stats["completed"] / stats["total"]) * 100, 1) if stats["total"] > 0 else 0
        
        comparison_data.append({
            "clinic": clinic,
            "total_appointments": stats["total"],
            "completed": stats["completed"],
            "cancelled": stats["cancelled"],
            "completion_rate": completion_rate,
            "doctors_count": len(stats["doctors"]),
            "avg_daily": round(stats["total"] / days, 1) if days > 0 else 0
        })
    
    # Sort by total
    comparison_data.sort(key=lambda x: x["total_appointments"], reverse=True)
    
    return {
        "success": True,
        "period_days": days,
        "clinics": comparison_data,
        "leader": comparison_data[0] if comparison_data else None
    }
