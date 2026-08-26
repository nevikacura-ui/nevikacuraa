from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Header, Query, Body, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import RedirectResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
import os
import logging
import hashlib
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Set
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import io
import asyncio
import resend
import json
import base64
from pywebpush import webpush, WebPushException
import base64
from io import BytesIO
from fastapi.responses import JSONResponse

# Global safety: Custom JSON encoder that handles MongoDB ObjectId
class SafeJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, bytes):
            return obj.decode('utf-8', errors='replace')
        return super().default(obj)

# Import MSG91 WhatsApp service
from services.msg91_whatsapp import (
    send_diagyn_appointment_confirmation,
    send_diagyn_appointment_reminder,
    send_diagyn_one_hour_reminder,
    send_diagyn_walkin_emergency,
    send_diagyn_appointment_completed,
    send_proton_lab_confirmation,
    send_proton_report_ready,
    send_proton_sonography_confirmation,
    send_orange_pharmacy_confirmation,
    send_orange_order_delivered,
    test_msg91_connection,
    send_msg91_whatsapp
)

# Import WhatsApp OTP service
from services.whatsapp_otp import set_db as set_otp_db, set_send_function as set_otp_send_func

# Import data from modular files
from data.medicine_inventory import MEDICINE_INVENTORY
from data.diagnostic_tests import DIAGNOSTIC_TESTS, DIAGNOSTIC_TEST_PRICES

# Import IST timezone utilities
from utils.timezone_utils import (
    get_ist_now, get_ist_date, get_ist_display_datetime, get_ist_display_time,
    normalize_time_to_24h, format_time_for_display
)

# Import booking reliability services
from services.booking_reliability import (
    init_reliability_services,
    get_audit_logger,
    get_db_writer,
    get_diagnostics,
    BookingAuditLogger,
    RetryableDBWriter,
    BookingDiagnostics
)

# Import daily health report service
from services.daily_health_report import (
    init_health_reporter,
    get_health_reporter,
    DailyHealthReporter
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Global exception handler: catch ObjectId serialization crashes
@app.exception_handler(TypeError)
async def handle_type_error(request, exc):
    error_msg = str(exc)
    if "ObjectId" in error_msg or "not JSON serializable" in error_msg:
        logger.error(f"ObjectId serialization error on {request.url}: {error_msg}")
        return JSONResponse(status_code=500, content={"detail": "Internal server error", "error": "data_serialization"})
    logger.error(f"TypeError on {request.url}: {error_msg}")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# Rate limiting
from rate_limit import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Mount uploads directory for static files (product images, etc.)
uploads_dir = ROOT_DIR / "uploads"
uploads_dir.mkdir(exist_ok=True)
(uploads_dir / "products").mkdir(exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


# Cache-control header for API responses
@app.middleware("http")
async def add_cache_headers(request, call_next):
    response = await call_next(request)
    path = request.url.path
    if "/uploads/" in path:
        response.headers["Cache-Control"] = "public, max-age=86400, stale-while-revalidate=3600"
    elif request.method == "GET" and "/api/" in path:
        response.headers["Cache-Control"] = "private, max-age=0, stale-while-revalidate=30"
    return response

# Startup event to ensure database connection is ready
@app.on_event("startup")
async def startup_db_client():
    """Initialize database connection and reliability services on startup"""
    try:
        # Ping MongoDB to ensure connection is ready
        await client.admin.command('ping')
        logger.info("MongoDB connection established successfully")
        
        # Initialize booking reliability services
        reliability_services = init_reliability_services(db)
        logger.info("Booking reliability services initialized")

        # Initialize push notification service db reference
        from services.push import set_db as set_push_db
        set_push_db(db)
        logger.info("Push notification service initialized")
        
        # Initialize daily health reporter
        from services.msg91_whatsapp import send_msg91_whatsapp
        health_reporter = init_health_reporter(db, send_msg91_whatsapp)
        logger.info("Daily health reporter initialized")
        
        # Start background cleanup scheduler
        import asyncio
        asyncio.create_task(run_cleanup_scheduler())
        logger.info("Background cleanup scheduler started")
        
        # Start appointment reminder scheduler (push 1hr before)
        try:
            from services.appointment_reminders import run_reminder_scheduler, set_db as set_reminder_db
            set_reminder_db(db)
            asyncio.create_task(run_reminder_scheduler())
            logger.info("Appointment reminder scheduler started")
        except Exception as re:
            logger.warning(f"Could not start reminder scheduler: {re}")
        
        # Start end-of-day doctor report scheduler (9 PM IST)
        try:
            from routes.clinic_features import run_daily_report_scheduler
            asyncio.create_task(run_daily_report_scheduler())
            logger.info("Doctor daily report scheduler started")
        except Exception as dre:
            logger.warning(f"Could not start daily report scheduler: {dre}")
        
        # Initialize Emergent Object Storage
        try:
            from services.object_storage import init_storage
            init_storage()
            logger.info("Emergent Object Storage initialized")
        except Exception as ose:
            logger.warning(f"Object storage init deferred: {ose}")

        # Start platform report scheduler (daily 11 PM IST + weekly Sunday)
        try:
            from utils.platform_reports import schedule_reports, set_db as set_platform_report_db
            set_platform_report_db(db)
            asyncio.create_task(schedule_reports())
            logger.info("Platform report scheduler started (daily 11PM IST)")
        except Exception as pre:
            logger.warning(f"Could not start platform report scheduler: {pre}")

        # Start smart reminder notification scheduler (every 5 minutes)
        asyncio.create_task(run_smart_reminder_scheduler())
        logger.info("Smart reminder notification scheduler started (every 5 min)")

        # Start medicine reminder notification scheduler (every 15 minutes)
        asyncio.create_task(run_medicine_reminder_scheduler())
        logger.info("Medicine reminder notification scheduler started (every 15 min)")

        # Start weekly health digest scheduler (Sundays 10 AM IST)
        try:
            from services.weekly_digest import schedule_weekly_digest
            asyncio.create_task(schedule_weekly_digest(db))
            logger.info("Weekly health digest scheduler started (Sundays 10AM IST)")
        except Exception as wde:
            logger.warning(f"Could not start weekly digest scheduler: {wde}")
        
    except Exception as e:
        logger.error(f"Startup initialization failed: {e}")
    
    # Create unique compound index to prevent double-booking at DB level
    try:
        await db.appointments.create_index(
            [("doctor", 1), ("clinic", 1), ("date", 1), ("time", 1)],
            unique=True,
            partialFilterExpression={"status": {"$eq": "Booked"}, "time": {"$exists": True}},
            name="unique_slot_booking",
            background=True
        )
        logger.info("Unique slot booking index created")
    except Exception as idx_err:
        logger.warning(f"Could not create unique slot index (may already exist): {idx_err}")

    # Pharmacy billing indexes for fast lookups
    try:
        await db.pharmacy_bills.create_index([("date", -1), ("created_at", -1)], background=True)
        await db.pharmacy_bills.create_index([("customer_phone", 1)], background=True)
        await db.pharmacy_bills.create_index([("bill_number", 1)], unique=True, background=True)
        await db.pharmacy_customers.create_index([("phone", 1)], unique=True, background=True)
        await db.medicines.create_index([("barcode", 1)], sparse=True, background=True)
        # High-performance medicine search indexes (3L+ records)
        try:
            await db.medicines.create_index([("name", "text"), ("generic_name", "text"), ("manufacturer", "text"), ("composition", "text")], background=True, name="medicines_text_search")
        except Exception:
            pass  # Text index already exists with compatible config
        await db.medicines.create_index([("category", 1), ("name", 1)], background=True)
        await db.medicines.create_index([("store", 1), ("category", 1)], background=True)
        await db.medicines.create_index([("name", 1)], background=True)
        logger.info("Pharmacy billing + medicine search indexes created")
    except Exception as idx_err:
        logger.warning(f"Could not create pharmacy indexes (may already exist): {idx_err}")

    # Performance compound indexes for queue/staff queries
    try:
        await db.appointments.create_index([("doctor", 1), ("date", 1), ("status", 1)], background=True)
        await db.appointments.create_index([("clinic", 1), ("date", 1), ("status", 1)], background=True)
        await db.appointments.create_index([("patient_phone", 1), ("date", -1)], background=True)
        await db.appointments.create_index([("date", 1), ("status", 1)], background=True)
        await db.appointments.create_index([("booking_id", 1)], sparse=True, background=True)
        await db.lab_orders.create_index([("date", -1), ("status", 1)], background=True)
        await db.lab_orders.create_index([("patient_phone", 1)], background=True)
        await db.orders.create_index([("patient_phone", 1), ("created_at", -1)], background=True)
        await db.orders.create_index([("order_id", 1)], unique=True, sparse=True, background=True)
        logger.info("Performance compound indexes created")
    except Exception as idx_err:
        logger.warning(f"Could not create compound indexes: {idx_err}")



async def run_cleanup_scheduler():
    """Background task that runs cleanup every 24 hours at midnight"""
    import asyncio
    while True:
        try:
            # Calculate time until next midnight
            now = datetime.now()
            next_midnight = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            seconds_until_midnight = (next_midnight - now).total_seconds()
            
            # For first run, if it's between 12 AM and 1 AM, run immediately
            if now.hour == 0 and now.minute < 30:
                logger.info("Running cleanup immediately (within midnight window)")
            else:
                logger.info(f"Next cleanup scheduled in {seconds_until_midnight/3600:.1f} hours")
                await asyncio.sleep(seconds_until_midnight)
            
            # Run cleanup
            logger.info("Running scheduled cleanup...")
            await run_automated_cleanup()
            
            # Sleep for 24 hours after running
            await asyncio.sleep(86400)  # 24 hours
            
        except asyncio.CancelledError:
            logger.info("Cleanup scheduler cancelled")
            break
        except Exception as e:
            logger.error(f"Cleanup scheduler error: {e}")
            await asyncio.sleep(3600)  # Wait 1 hour on error


async def run_automated_cleanup():
    """Archive old completed records via soft-delete flag (never hard-deletes real data)."""
    now_utc = datetime.now(timezone.utc)
    results = {"diagyn": 0, "orange": 0, "mango": 0}

    try:
        diagyn_cutoff = now_utc - timedelta(hours=24)
        diagyn_res = await db.appointments.update_many(
            {
                "status": "Completed",
                "completed_at": {"$exists": True, "$lt": diagyn_cutoff.isoformat()},
                "is_archived": {"$ne": True},
            },
            {"$set": {"is_archived": True, "archived_at": now_utc.isoformat(), "archive_reason": "auto_cleanup_24h"}},
        )
        results["diagyn"] = diagyn_res.modified_count

        orange_cutoff = now_utc - timedelta(hours=48)
        orange_res = await db.pharmacy_orders.update_many(
            {
                "status": {"$in": ["completed", "delivered", "Completed", "Delivered"]},
                "is_archived": {"$ne": True},
                "$or": [
                    {"completed_at": {"$exists": True, "$lt": orange_cutoff.isoformat()}},
                    {"created_at": {"$lt": orange_cutoff.isoformat()}},
                ],
            },
            {"$set": {"is_archived": True, "archived_at": now_utc.isoformat(), "archive_reason": "auto_cleanup_48h"}},
        )
        results["orange"] = orange_res.modified_count

        mango_cutoff = now_utc - timedelta(hours=72)
        mango_res = await db.diagnostic_orders.update_many(
            {
                "status": {"$in": ["completed", "Completed", "report_ready", "delivered"]},
                "is_archived": {"$ne": True},
                "$or": [
                    {"completed_at": {"$exists": True, "$lt": mango_cutoff.isoformat()}},
                    {"created_at": {"$lt": mango_cutoff.isoformat()}},
                ],
            },
            {"$set": {"is_archived": True, "archived_at": now_utc.isoformat(), "archive_reason": "auto_cleanup_72h"}},
        )
        results["mango"] = mango_res.modified_count

        total = results["diagyn"] + results["orange"] + results["mango"]
        logger.info(f"Automated cleanup complete: {total} items archived (DiaGyn: {results['diagyn']}, Orange: {results['orange']}, Mango: {results['mango']})")

    except Exception as e:
        logger.error(f"Automated cleanup failed: {e}")


async def run_smart_reminder_scheduler():
    """Background task that checks for due reminders every 5 minutes and sends push notifications."""
    import asyncio
    while True:
        try:
            await asyncio.sleep(300)  # 5 minutes
            from services.push import send_push_notification
            now = datetime.now(timezone.utc)
            current_time = now.strftime("%H:%M")
            today = now.strftime("%Y-%m-%d")

            hour, minute = int(current_time.split(":")[0]), int(current_time.split(":")[1])
            time_window = [f"{hour:02d}:{m:02d}" for m in range(max(0, minute - 5), minute + 1)]

            due_reminders = await db.smart_reminders.find({
                "is_active": True,
                "reminder_time": {"$in": time_window},
                "$or": [{"reminder_date": today}, {"recurrence": {"$ne": "once"}}],
            }, {"_id": 0}).to_list(length=50)

            for rem in due_reminders:
                phone = rem.get("phone")
                if phone:
                    try:
                        await send_push_notification(
                            user_id=phone,
                            title=f"Reminder: {rem.get('title', 'Health Reminder')}",
                            body=rem.get("description") or f"Time for your {rem.get('reminder_type', 'health')} reminder",
                            url="/smart-reminders",
                            tag=f"reminder-{rem.get('id', '')}",
                        )
                    except Exception:
                        pass

            if due_reminders:
                logger.info(f"Smart reminder check: {len(due_reminders)} due reminders processed")
        except asyncio.CancelledError:
            logger.info("Smart reminder scheduler cancelled")
            break
        except Exception as e:
            logger.error(f"Smart reminder scheduler error: {e}")
            await asyncio.sleep(60)


async def run_medicine_reminder_scheduler():
    """Background scheduler that checks medicine reminders every 15 minutes and sends push notifications."""
    import asyncio
    while True:
        try:
            await asyncio.sleep(900)  # 15 minutes
            from services.push import send_push_notification as push_notify

            ist_offset = timedelta(hours=5, minutes=30)
            now_ist = datetime.now(timezone.utc) + ist_offset
            current_hour = now_ist.hour
            current_minute = now_ist.minute
            today = now_ist.strftime("%Y-%m-%d")

            active_reminders = await db.medicine_reminders.find({
                "is_active": True,
                "start_date": {"$lte": today},
                "$or": [
                    {"end_date": None},
                    {"end_date": {"$gte": today}}
                ]
            }, {"_id": 0}).to_list(1000)

            notifications_sent = 0
            for reminder in active_reminders:
                for time_slot in reminder.get("time_slots", []):
                    try:
                        slot_hour, slot_minute = map(int, time_slot.split(":"))
                    except (ValueError, AttributeError):
                        continue

                    if slot_hour == current_hour and abs(slot_minute - current_minute) <= 7:
                        existing_log = await db.medicine_logs.find_one({
                            "reminder_id": reminder.get("id"),
                            "date": today,
                            "time": {"$regex": f"^{slot_hour:02d}"}
                        })

                        if not existing_log:
                            try:
                                await push_notify(
                                    user_id=reminder.get("user_id"),
                                    title="Medicine Reminder",
                                    body=f"Time to take {reminder.get('medicine_name', 'your medicine')} - {reminder.get('dosage', '')}",
                                    url="/smart-reminders",
                                    tag=f"med-{reminder.get('id', '')}-{time_slot}"
                                )
                                notifications_sent += 1
                            except Exception as e:
                                logger.error(f"Failed to send medicine reminder: {e}")

            if notifications_sent > 0:
                logger.info(f"Medicine reminder scheduler: sent {notifications_sent} notifications")
        except asyncio.CancelledError:
            logger.info("Medicine reminder scheduler cancelled")
            break
        except Exception as e:
            logger.error(f"Medicine reminder scheduler error: {e}")
            await asyncio.sleep(60)


# ── Patient Dashboard Endpoint → Extracted to routes/patient_dashboard.py ──


# Health check endpoint for Kubernetes liveness/readiness probes
@app.get("/health")
async def health_check():
    """Health check endpoint - verifies service and database are operational"""
    try:
        # Quick database ping to verify connection
        await client.admin.command('ping')
        return {"status": "healthy", "service": "nevika-cura-api", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "healthy", "service": "nevika-cura-api", "database": "reconnecting"}



@api_router.get("/health")
async def health_check():
    return {"status": "ok"}


# ── send-booking-email → Extracted to routes/booking_email.py ──


# ============ BOOKING DIAGNOSTICS, HEALTH REPORTS, TEST ENDPOINTS ============
# EXTRACTED TO: routes/debug_routes.py


# ============ PUSH NOTIFICATION ENDPOINTS → routes/push_routes.py ============

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ WEBSOCKET CONNECTION MANAGER ============
class SlotConnectionManager:
    """Manages WebSocket connections for real-time slot updates"""
    
    def __init__(self):
        # Store connections by room (doctor_clinic_date)
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    
    def get_room_key(self, doctor: str, clinic: str, date: str) -> str:
        """Generate a room key for grouping connections"""
        return f"{doctor}_{clinic}_{date}".replace(" ", "_").lower()
    
    async def connect(self, websocket: WebSocket, doctor: str, clinic: str, date: str):
        """Accept connection and add to room"""
        await websocket.accept()
        room_key = self.get_room_key(doctor, clinic, date)
        if room_key not in self.active_connections:
            self.active_connections[room_key] = set()
        self.active_connections[room_key].add(websocket)
        logger.info(f"WebSocket connected to room: {room_key}, total: {len(self.active_connections[room_key])}")
    
    def disconnect(self, websocket: WebSocket, doctor: str, clinic: str, date: str):
        """Remove connection from room"""
        room_key = self.get_room_key(doctor, clinic, date)
        if room_key in self.active_connections:
            self.active_connections[room_key].discard(websocket)
            if not self.active_connections[room_key]:
                del self.active_connections[room_key]
            logger.info(f"WebSocket disconnected from room: {room_key}")
    
    async def broadcast_slot_update(self, doctor: str, clinic: str, date: str, slot: str, status: str):
        """Broadcast slot update to all connections in the room"""
        room_key = self.get_room_key(doctor, clinic, date)
        if room_key in self.active_connections:
            message = json.dumps({
                "type": "slot_update",
                "doctor": doctor,
                "clinic": clinic,
                "date": date,
                "slot": slot,
                "status": status,  # "booked" or "available"
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            disconnected = set()
            for connection in self.active_connections[room_key]:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    logger.error(f"Failed to send WebSocket message: {e}")
                    disconnected.add(connection)
            # Clean up disconnected clients
            for conn in disconnected:
                self.active_connections[room_key].discard(conn)
            logger.info(f"Broadcast slot update to {len(self.active_connections.get(room_key, []))} clients: {slot} -> {status}")

# Initialize the WebSocket manager
slot_manager = SlotConnectionManager()

# ============ WEBSOCKET CONNECTION MANAGER FOR APPOINTMENTS ============
class AppointmentConnectionManager:
    """Manages WebSocket connections for real-time appointment updates across all portals"""
    
    def __init__(self):
        # Store connections by room type (clinic, portal_type)
        # Room types: "diagyn_staff", "mango_staff", "pharmacy_staff", "doctor", "patient_{mobile}"
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    
    def get_room_key(self, portal_type: str, clinic: str = None, date: str = None) -> str:
        """Generate a room key for grouping connections"""
        if clinic and date:
            return f"{portal_type}_{clinic}_{date}".replace(" ", "_").lower()
        elif clinic:
            return f"{portal_type}_{clinic}".replace(" ", "_").lower()
        return portal_type.lower()
    
    async def connect(self, websocket: WebSocket, portal_type: str, clinic: str = None, date: str = None):
        """Accept connection and add to room"""
        await websocket.accept()
        room_key = self.get_room_key(portal_type, clinic, date)
        if room_key not in self.active_connections:
            self.active_connections[room_key] = set()
        self.active_connections[room_key].add(websocket)
        logger.info(f"[WS-Appointments] Connected to room: {room_key}, total clients: {len(self.active_connections[room_key])}")
    
    def disconnect(self, websocket: WebSocket, portal_type: str, clinic: str = None, date: str = None):
        """Remove connection from room"""
        room_key = self.get_room_key(portal_type, clinic, date)
        if room_key in self.active_connections:
            self.active_connections[room_key].discard(websocket)
            if not self.active_connections[room_key]:
                del self.active_connections[room_key]
            logger.info(f"[WS-Appointments] Disconnected from room: {room_key}")
    
    async def broadcast_to_room(self, room_key: str, message: dict):
        """Broadcast message to all connections in a specific room"""
        if room_key in self.active_connections:
            message_str = json.dumps(message)
            disconnected = set()
            for connection in self.active_connections[room_key]:
                try:
                    await connection.send_text(message_str)
                except Exception as e:
                    logger.error(f"[WS-Appointments] Failed to send to {room_key}: {e}")
                    disconnected.add(connection)
            # Clean up disconnected clients
            for conn in disconnected:
                self.active_connections[room_key].discard(conn)
            logger.info(f"[WS-Appointments] Broadcast to {len(self.active_connections.get(room_key, []))} clients in {room_key}")
    
    async def broadcast_appointment_update(self, appointment: dict, event_type: str = "appointment_update"):
        """Broadcast appointment update to relevant rooms"""
        message = {
            "type": event_type,
            "appointment": appointment,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Get appointment details
        clinic = appointment.get('clinic', '').lower().replace(' ', '_')
        date = appointment.get('date', '')
        patient_mobile = appointment.get('patient_mobile', '')
        portal = appointment.get('portal', 'diagyn')  # diagyn, mango, pharmacy
        
        # Broadcast to staff portal rooms
        if 'diagyn' in clinic or 'pushpa' in clinic or 'amnion' in clinic or portal == 'diagyn':
            await self.broadcast_to_room(f"diagyn_staff_{clinic}_{date}", message)
            await self.broadcast_to_room(f"diagyn_staff_{clinic}", message)
            await self.broadcast_to_room("diagyn_staff", message)
        
        if 'mango' in clinic or portal == 'mango':
            await self.broadcast_to_room(f"mango_staff_{date}", message)
            await self.broadcast_to_room("mango_staff", message)
        
        if 'pharmacy' in clinic or 'orange' in clinic or portal == 'pharmacy':
            await self.broadcast_to_room(f"pharmacy_staff_{date}", message)
            await self.broadcast_to_room("pharmacy_staff", message)
        
        # Broadcast to doctor portal
        doctor = appointment.get('doctor', '').lower().replace(' ', '_').replace('.', '')
        if doctor:
            await self.broadcast_to_room(f"doctor_{doctor}_{date}", message)
            await self.broadcast_to_room(f"doctor_{doctor}", message)
        
        # Broadcast to patient's room if they're connected
        if patient_mobile:
            await self.broadcast_to_room(f"patient_{patient_mobile}", message)
        
        logger.info(f"[WS-Appointments] Broadcast {event_type} for clinic={clinic}, doctor={doctor}")
    
    async def broadcast_new_appointment(self, appointment: dict):
        """Broadcast new appointment notification"""
        await self.broadcast_appointment_update(appointment, "new_appointment")
    
    async def broadcast_status_change(self, appointment: dict):
        """Broadcast appointment status change"""
        await self.broadcast_appointment_update(appointment, "status_change")
    
    async def broadcast_queue_update(self, clinic: str, date: str, queue_data: dict):
        """Broadcast queue update for live queue displays"""
        message = {
            "type": "queue_update",
            "clinic": clinic,
            "date": date,
            "queue": queue_data,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        clinic_key = clinic.lower().replace(' ', '_')
        await self.broadcast_to_room(f"queue_{clinic_key}_{date}", message)
        await self.broadcast_to_room(f"queue_{clinic_key}", message)
        logger.info(f"[WS-Appointments] Queue update broadcast for {clinic}")

# Initialize the appointment WebSocket manager
appointment_manager = AppointmentConnectionManager()

JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
SIGNUP_WHATSAPP_NUMBER = os.environ.get('SIGNUP_WHATSAPP_NUMBER', '9833188288')

# Notification Service - Extracted to services/notification_service.py
from services.notification_service import (
    send_whatsapp_notification, send_sms_notification, send_staff_sms_notification,
    STAFF_NOTIFICATION_NUMBERS, DOCTOR_WHATSAPP_NUMBERS,
    notify_staff_new_appointment, notify_staff_new_signup, notify_staff_new_order,
    send_appointment_sms, send_appointment_reminder_sms,
    send_test_booking_sms, send_report_ready_sms,
    send_medicine_order_sms, send_medicine_delivered_sms,
    send_pharmacy_order_sms, send_pharmacy_status_sms,
    send_diagnostic_order_sms, send_diagnostic_status_sms,
    send_order_status_email, notify_doctor_whatsapp, send_email_notification,
    send_email_otp, verify_email_otp,
    send_push_notification, broadcast_push_notification, send_push_to_staff,
    RESEND_API_KEY, NOTIFICATION_EMAIL, SENDER_EMAIL,
    VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_CLAIMS_EMAIL,
)

# Keep PushSubscription/PushNotificationPayload models here (used by inline endpoints)

# User model and auth functions imported from utils.auth_utils
from utils.auth_utils import (
    User, get_current_user, get_current_user_optional,
    set_db as set_auth_utils_db
)
# Initialize auth_utils with database
set_auth_utils_db(db)
# Re-export for backward compatibility (routes import from server)
from routes.auth_routes import (
    UserCreate, UserLogin, award_loyalty_points,
    auth_otp_storage, guest_otp_storage
)

# GuestUser imported from utils.constants

# Booking ID Generator → Extracted to utils/booking_utils.py
from utils.booking_utils import generate_booking_id, generate_booking_email_template
from utils.booking_utils import set_db as set_booking_utils_db
set_booking_utils_db(db)

# Appointment models imported from routes.appointment_routes
from routes.appointment_routes import (
    Appointment, AppointmentCreate,
    normalize_date_format, get_date_patterns,
)

class DiagnosticOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    tests: List[str]
    prescription_url: Optional[str] = None
    preferred_date: str
    preferred_time_slot: Optional[str] = None
    collection_type: Optional[str] = "home"  # home, center
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    patient_address: Optional[str] = None
    status: str = "pending"
    payment_method: Optional[str] = "cod"  # cod, cashfree, online
    payment_status: Optional[str] = "pending"  # pending, paid, failed
    total_amount: Optional[float] = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DiagnosticOrderCreate(BaseModel):
    tests: List[str]
    prescription_url: Optional[str] = None
    preferred_date: str
    preferred_time_slot: Optional[str] = None
    collection_type: Optional[str] = "home"
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    patient_address: Optional[str] = None
    payment_method: Optional[str] = "cod"
    payment_status: Optional[str] = "pending"
    total_amount: Optional[float] = 0.0

class PharmacyOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    medicines: List[dict]
    prescription_url: Optional[str] = None
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    delivery_address: Optional[str] = None
    status: str = "Order Booked"
    payment_method: Optional[str] = "cod"  # cod, cashfree, pay_later
    payment_status: Optional[str] = "pending"  # pending, paid, failed
    total_amount: Optional[float] = 0.0
    cashfree_order_id: Optional[str] = None
    points_used: int = 0  # Loyalty points redeemed
    discount_amount: float = 0.0  # Discount in rupees (100 pts = ₹10)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PharmacyOrderCreate(BaseModel):
    medicines: List[dict]
    prescription_url: Optional[str] = None
    patient_name: str
    patient_phone: str
    patient_email: Optional[str] = None
    delivery_address: Optional[str] = None
    payment_method: Optional[str] = "cod"
    payment_status: Optional[str] = "pending"
    cashfree_order_id: Optional[str] = None
    points_used: Optional[int] = 0  # Loyalty points to redeem (100 pts = ₹10)

# OTP and Feedback models - moved to routes/service_routes.py and routes/appointment_routes.py
from routes.appointment_routes import AppointmentFeedback
from routes.service_routes import OTPRequest, OTPVerify

# ==================== AUTH ENDPOINTS EXTRACTED ====================
# -> routes/auth_routes.py

# ==================== SERVICE ENDPOINTS EXTRACTED ====================
# -> routes/service_routes.py (OTP, booking-code, drive, upload, pharmacy legacy, cleanup)


# ==================== APPOINTMENT ENDPOINTS EXTRACTED ====================
# -> routes/appointment_routes.py (create, booked-slots, next-available, guest, history, block/unblock)


# ============ WEBSOCKET ENDPOINT FOR REAL-TIME SLOT UPDATES ============
@app.websocket("/api/ws/slots")
async def websocket_slot_updates(
    websocket: WebSocket,
    doctor: str = Query(...),
    clinic: str = Query(...),
    date: str = Query(...)
):
    """WebSocket endpoint for real-time slot availability updates
    
    Connect with: ws://host/ws/slots?doctor=Dr.%20Neha%20Patel&clinic=Pushpa%20Clinic&date=2026-01-15
    
    Receives messages when slots are booked or become available:
    {
        "type": "slot_update",
        "doctor": "Dr. Neha Patel",
        "clinic": "Pushpa Clinic", 
        "date": "2026-01-15",
        "slot": "11:00 AM",
        "status": "booked" | "available",
        "timestamp": "2026-01-15T10:30:00Z"
    }
    """
    await slot_manager.connect(websocket, doctor, clinic, date)
    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connected",
            "message": "Connected to slot updates",
            "doctor": doctor,
            "clinic": clinic,
            "date": date
        })
        
        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Wait for messages (ping/pong or subscription changes)
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                message = json.loads(data)
                
                # Handle subscription change (user selects different date)
                if message.get("type") == "subscribe":
                    new_doctor = message.get("doctor", doctor)
                    new_clinic = message.get("clinic", clinic)
                    new_date = message.get("date", date)
                    
                    # Disconnect from old room
                    slot_manager.disconnect(websocket, doctor, clinic, date)
                    
                    # Update subscription
                    doctor, clinic, date = new_doctor, new_clinic, new_date
                    
                    # Connect to new room
                    room_key = slot_manager.get_room_key(doctor, clinic, date)
                    if room_key not in slot_manager.active_connections:
                        slot_manager.active_connections[room_key] = set()
                    slot_manager.active_connections[room_key].add(websocket)
                    
                    await websocket.send_json({
                        "type": "subscribed",
                        "doctor": doctor,
                        "clinic": clinic,
                        "date": date
                    })
                
                # Handle ping
                elif message.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                    
            except asyncio.TimeoutError:
                # Send heartbeat
                try:
                    await websocket.send_json({"type": "heartbeat"})
                except:
                    break
                    
    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected: {doctor}, {clinic}, {date}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        slot_manager.disconnect(websocket, doctor, clinic, date)

# ============ WEBSOCKET ENDPOINT FOR REAL-TIME APPOINTMENT UPDATES ============
@app.websocket("/api/ws/appointments")
async def websocket_appointment_updates(
    websocket: WebSocket,
    portal: str = Query(...),  # diagyn_staff, mango_staff, pharmacy_staff, doctor, patient
    clinic: str = Query(None),
    date: str = Query(None),
    doctor_name: str = Query(None),  # For doctor portal
    patient_mobile: str = Query(None)  # For patient portal
):
    """WebSocket endpoint for real-time appointment updates across all portals
    
    Connect examples:
    - Staff Portal: ws://host/api/ws/appointments?portal=diagyn_staff&clinic=Pushpa%20Clinic&date=2026-02-16
    - Doctor Portal: ws://host/api/ws/appointments?portal=doctor&doctor_name=Dr.%20Vikas&date=2026-02-16
    - Patient: ws://host/api/ws/appointments?portal=patient&patient_mobile=9876543210
    
    Receives messages:
    {
        "type": "new_appointment" | "status_change" | "queue_update",
        "appointment": {...},
        "timestamp": "2026-02-16T10:30:00Z"
    }
    """
    # Determine the room key based on portal type
    if portal == "patient" and patient_mobile:
        room_type = f"patient_{patient_mobile}"
    elif portal == "doctor" and doctor_name:
        doctor_key = doctor_name.lower().replace(' ', '_').replace('.', '')
        room_type = f"doctor_{doctor_key}" if not date else f"doctor_{doctor_key}_{date}"
    else:
        room_type = portal
    
    await appointment_manager.connect(websocket, room_type, clinic, date)
    
    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connected",
            "message": "Connected to appointment updates",
            "portal": portal,
            "clinic": clinic,
            "date": date,
            "room": appointment_manager.get_room_key(room_type, clinic, date)
        })
        
        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Wait for messages (ping/pong or subscription changes)
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                message = json.loads(data)
                
                # Handle subscription change (e.g., date change)
                if message.get("type") == "subscribe":
                    new_clinic = message.get("clinic", clinic)
                    new_date = message.get("date", date)
                    
                    # Disconnect from old room
                    appointment_manager.disconnect(websocket, room_type, clinic, date)
                    
                    # Update subscription
                    clinic, date = new_clinic, new_date
                    
                    # Connect to new room
                    room_key = appointment_manager.get_room_key(room_type, clinic, date)
                    if room_key not in appointment_manager.active_connections:
                        appointment_manager.active_connections[room_key] = set()
                    appointment_manager.active_connections[room_key].add(websocket)
                    
                    await websocket.send_json({
                        "type": "subscribed",
                        "clinic": clinic,
                        "date": date,
                        "room": room_key
                    })
                
                # Handle refresh request - send current appointments
                elif message.get("type") == "refresh":
                    # Client can request a full refresh
                    await websocket.send_json({
                        "type": "refresh_ack",
                        "message": "Use REST API to fetch full data"
                    })
                
                # Handle ping
                elif message.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                    
            except asyncio.TimeoutError:
                # Send heartbeat to keep connection alive
                try:
                    await websocket.send_json({"type": "heartbeat", "timestamp": datetime.now(timezone.utc).isoformat()})
                except:
                    break
                    
    except WebSocketDisconnect:
        logger.info(f"[WS-Appointments] Client disconnected: {portal}, {clinic}, {date}")
    except Exception as e:
        logger.error(f"[WS-Appointments] Error: {e}")
    finally:
        appointment_manager.disconnect(websocket, room_type, clinic, date)

# ==================== APPOINTMENT ENDPOINTS EXTRACTED ====================
# -> routes/appointment_routes.py (feedback, booking-limits, get_appointments)



# ==================== EXTRACTED TO ROUTE FILES ====================
# Live Queue Status -> routes/queue_status.py
# Proton Trend Analysis -> routes/diagnostics_extended.py
# Home Sample Collection -> routes/diagnostics_extended.py
# Coupon Validation -> routes/coupons.py

# ============ Pharmacy Inventory Endpoints (handled by inventory router) ============
# The main inventory endpoints are in /app/backend/routes/inventory.py
# This endpoint is kept for backward compatibility with public API calls

# ==================== PHARMACY & CLEANUP ENDPOINTS EXTRACTED ====================
# -> routes/service_routes.py (inventory-legacy, autocomplete, forms, cleanup-test-data)

# ==================== EXTRACTED TO ROUTE FILES ====================
# Send Payment Link via WhatsApp -> routes/payment_links.py
# Prescription Email Notification -> routes/payment_links.py

# ==================== EXTRACTED TO ROUTE FILES ====================
# Refill Reminders, Subscription Box, Express Delivery, Medicine History,
# Quick Reorder -> routes/pharmacy_extended.py
# Waitlist Notifications -> routes/waitlist.py

# ============ Admin Config & Models → utils/constants.py ============
from utils.constants import (
    ADMIN_PASSWORD, STAFF_ROLES, CLINICS, DOCTOR_CLINICS,
    APPOINTMENT_STATUSES, APPOINTMENT_TYPES, MAX_EMERGENCY_PER_DOCTOR_PER_DAY,
    PHARMACY_STATUSES, DIAGNOSTIC_STATUSES, SERVICE_TYPES, SERVICE_STATUSES,
    AdminLogin, StaffCreate, StaffLogin, WalkInAppointment,
    AppointmentStatusUpdate, StaffOrderStatusUpdate, StaffDiagnosticOrderCreate,
    EmergencyAppointment, AddServiceRequest, ServiceStatusUpdate, GuestUser,
)

# ============ DUPLICATE ADMIN/STAFF ROUTES REMOVED ============
# These routes are now in /routes/admin.py and /routes/staff.py
# Removed during code cleanup on Jan 15, 2026

# ==================== EXTRACTED TO ROUTE FILES ====================
# Portal Membership -> routes/portal_features.py
# Subscription/Refill Notifications -> routes/portal_features.py
# Digital Health Card -> routes/portal_features.py
# Google Review Nudge -> routes/portal_features.py


# Include router AFTER all routes are defined
app.include_router(api_router)

# Include modular routers
try:
    from routes.billing import router as billing_router
    app.include_router(billing_router, prefix="/api")
    logger.info("Billing router loaded")
except Exception as e:
    logger.warning(f"Could not load billing router: {e}")

try:
    from routes.reminders import router as reminders_router
    app.include_router(reminders_router, prefix="/api")
    logger.info("Reminders router loaded")
except Exception as e:
    logger.warning(f"Could not load reminders router: {e}")

try:
    from routes.community import router as community_router
    app.include_router(community_router, prefix="/api")
    logger.info("Community router loaded")
except Exception as e:
    logger.warning(f"Could not load community router: {e}")

try:
    from routes.pharmacy_loyalty import router as pharmacy_loyalty_router
    app.include_router(pharmacy_loyalty_router, prefix="/api")
    logger.info("Pharmacy Loyalty router loaded")
except Exception as e:
    logger.warning(f"Could not load pharmacy loyalty router: {e}")

# NEW FEATURE ROUTERS
try:
    from routes.health_records import router as health_records_router, set_db as set_health_records_db
    set_health_records_db(db)
    app.include_router(health_records_router, prefix="/api")
    logger.info("Health Records router loaded")
except Exception as e:
    logger.warning(f"Could not load health records router: {e}")

try:
    from routes.health_packages import router as health_packages_router, set_db as set_health_packages_db
    set_health_packages_db(db)
    app.include_router(health_packages_router, prefix="/api")
    logger.info("Health Packages router loaded")
except Exception as e:
    logger.warning(f"Could not load health packages router: {e}")

try:
    from routes.referral import router as referral_router, set_db as set_referral_db
    set_referral_db(db)
    app.include_router(referral_router, prefix="/api")
    logger.info("Referral router loaded")
except Exception as e:
    logger.warning(f"Could not load referral router: {e}")

try:
    from routes.health_tips import router as health_tips_router, set_db as set_health_tips_db
    set_health_tips_db(db)
    app.include_router(health_tips_router, prefix="/api")
    logger.info("Health Tips router loaded")
except Exception as e:
    logger.warning(f"Could not load health tips router: {e}")

# Appointment Routes (extracted from server.py) - MUST be before doctor_profiles to avoid /{doctor_id} catch-all conflict
# But needs live_sync_manager which is defined later. Using None as default, set_deps called after live_sync init.
try:
    from routes.appointment_routes import router as appointment_router, set_deps as set_appointment_deps
    app.include_router(appointment_router, prefix="/api")
    logger.info("Appointment router loaded (deps set after live_sync init)")
except Exception as e:
    logger.warning(f"Could not load appointment router: {e}")

try:
    from routes.doctor_profiles import router as doctor_profiles_router, set_db as set_doctor_profiles_db
    set_doctor_profiles_db(db)
    app.include_router(doctor_profiles_router, prefix="/api")
    logger.info("Doctor Profiles router loaded")
except Exception as e:
    logger.warning(f"Could not load doctor profiles router: {e}")

try:
    from routes.teleconsultation import router as teleconsult_router, set_db as set_teleconsult_db
    set_teleconsult_db(db)
    app.include_router(teleconsult_router, prefix="/api")
    logger.info("Teleconsultation router loaded")
except Exception as e:
    logger.warning(f"Could not load teleconsultation router: {e}")

# EMR (Electronic Medical Records) Router
try:
    from routes.emr import router as emr_router, set_db as set_emr_db
    set_emr_db(db)
    app.include_router(emr_router, prefix="/api")
    logger.info("EMR router loaded")
except Exception as e:
    logger.warning(f"Could not load EMR router: {e}")

# Wallet Router
try:
    from routes.wallet import router as wallet_router, set_db as set_wallet_db, set_notification_functions as set_wallet_notif
    set_wallet_db(db)
    set_wallet_notif(send_email_notification, send_sms_notification)
    app.include_router(wallet_router, prefix="/api")
    logger.info("Wallet router loaded")
except Exception as e:
    logger.warning(f"Could not load wallet router: {e}")

try:
    from routes.wearables import router as wearables_router, set_db as set_wearables_db
    set_wearables_db(db)
    app.include_router(wearables_router, prefix="/api")
    logger.info("Wearables router loaded")
except Exception as e:
    logger.warning(f"Could not load wearables router: {e}")

# Emergency Services Router
try:
    from routes.emergency import router as emergency_router, set_db as set_emergency_db
    set_emergency_db(db)
    app.include_router(emergency_router, prefix="/api")
    logger.info("Emergency Services router loaded")
except Exception as e:
    logger.warning(f"Could not load emergency router: {e}")

# Health Risk Assessment Router
try:
    from routes.health_assessment import router as health_assessment_router, set_db as set_health_assessment_db
    set_health_assessment_db(db)
    app.include_router(health_assessment_router, prefix="/api")
    logger.info("Health Assessment router loaded")
except Exception as e:
    logger.warning(f"Could not load health assessment router: {e}")

# Medication Tracker Router
try:
    from routes.medication_tracker import router as medication_tracker_router, set_db as set_medication_tracker_db
    set_medication_tracker_db(db)
    app.include_router(medication_tracker_router, prefix="/api")
    logger.info("Medication Tracker router loaded")
except Exception as e:
    logger.warning(f"Could not load medication tracker router: {e}")

# Patient Flow & Queue Management Router
try:
    from routes.patient_flow import router as patient_flow_router, set_db as set_patient_flow_db
    set_patient_flow_db(db)
    app.include_router(patient_flow_router, prefix="/api")
    logger.info("Patient Flow router loaded")
except Exception as e:
    logger.warning(f"Could not load patient flow router: {e}")

# Live Queue & Wait Time System
try:
    from routes.live_queue import router as live_queue_router, set_db as set_live_queue_db, set_jwt_config as set_live_queue_jwt, set_notification_functions as set_live_queue_notifications
    set_live_queue_db(db)
    set_live_queue_jwt(JWT_SECRET)
    set_live_queue_notifications(send_push_notification, send_sms_notification, send_whatsapp_notification)
    app.include_router(live_queue_router, prefix="/api")
    logger.info("Live Queue router loaded")
except Exception as e:
    logger.warning(f"Could not load live queue router: {e}")

# Smart Medicine Reminders
try:
    from routes.medicine_reminders import router as medicine_reminders_router, set_db as set_medicine_db, set_jwt_config as set_medicine_jwt, set_notification_function as set_medicine_notif
    set_medicine_db(db)
    set_medicine_jwt(JWT_SECRET)
    set_medicine_notif(send_push_notification)
    app.include_router(medicine_reminders_router, prefix="/api")
    logger.info("Medicine Reminders router loaded")
except Exception as e:
    logger.warning(f"Could not load medicine reminders router: {e}")

# Clinic Analytics Dashboard
try:
    from routes.clinic_analytics import router as clinic_analytics_router, set_db as set_analytics_db, set_jwt_config as set_analytics_jwt
    set_analytics_db(db)
    set_analytics_jwt(JWT_SECRET)
    app.include_router(clinic_analytics_router, prefix="/api")
    logger.info("Clinic Analytics router loaded")
except Exception as e:
    logger.warning(f"Could not load clinic analytics router: {e}")

# Doctor Handoff Notes Router
try:
    from routes.handoff_notes import router as handoff_notes_router, set_db as set_handoff_db, set_jwt_config as set_handoff_jwt
    set_handoff_db(db)
    set_handoff_jwt(JWT_SECRET)
    app.include_router(handoff_notes_router, prefix="/api")
    logger.info("Doctor Handoff Notes router loaded")
except Exception as e:
    logger.warning(f"Could not load handoff notes router: {e}")

# Revenue Dashboard Router
try:
    from routes.revenue_dashboard import router as revenue_router, set_db as set_revenue_db, set_jwt_config as set_revenue_jwt
    set_revenue_db(db)
    set_revenue_jwt(JWT_SECRET)
    app.include_router(revenue_router, prefix="/api")
    logger.info("Revenue Dashboard router loaded")
except Exception as e:
    logger.warning(f"Could not load revenue dashboard router: {e}")


# Staff Billing Router
try:
    from routes.staff_billing import router as staff_billing_router, set_db as set_staff_billing_db
    set_staff_billing_db(db)
    app.include_router(staff_billing_router, prefix="/api")
    logger.info("Staff Billing router loaded")
except Exception as e:
    logger.warning(f"Could not load staff billing router: {e}")

# DiaGyn Enhancements Router (Staff check-in, Fee processing, Google reviews)
try:
    from routes.diagyn_enhancements import init_router as init_diagyn_enhancements
    diagyn_enhancements_router = init_diagyn_enhancements(db)
    app.include_router(diagyn_enhancements_router, prefix="/api")
    logger.info("DiaGyn Enhancements router loaded (staff check-in, fees, reviews)")
except Exception as e:
    logger.warning(f"Could not load DiaGyn enhancements router: {e}")

# Live Sync WebSocket Router (Real-time updates for staff & doctors)
live_sync_manager = None
try:
    from routes.live_sync import init_router as init_live_sync
    live_sync_router, live_sync_manager = init_live_sync(db)
    app.include_router(live_sync_router, prefix="/api")
    logger.info("Live Sync WebSocket router loaded (real-time staff/doctor updates)")
except Exception as e:
    logger.warning(f"Could not load Live Sync router: {e}")

# Now set appointment deps (live_sync_manager is defined)
try:
    set_appointment_deps({
        "slot_manager": slot_manager,
        "appointment_manager": appointment_manager,
        "live_sync_manager": live_sync_manager,
        "get_audit_logger": get_audit_logger,
        "get_db_writer": get_db_writer,
        "send_email_notification": send_email_notification,
        "notify_doctor_whatsapp": notify_doctor_whatsapp,
        "send_push_notification": send_push_notification,
        "send_appointment_sms": send_appointment_sms,
        "send_diagyn_appointment_confirmation": send_diagyn_appointment_confirmation,
        "notify_staff_new_appointment": notify_staff_new_appointment,
        "send_push_to_staff": send_push_to_staff,
    })
    logger.info("Appointment router deps configured")
except Exception as e:
    logger.warning(f"Could not set appointment deps: {e}")

# ALYNE - Kids Health Router
try:
    from routes.alyne import router as alyne_router, set_db as set_alyne_db
    set_alyne_db(db)
    app.include_router(alyne_router, prefix="/api")
    logger.info("ALYNE Kids Health router loaded")
except Exception as e:
    logger.warning(f"Could not load ALYNE router: {e}")

# Evara - Women's Wellness Router
try:
    from routes.evara import router as evara_router, set_db as set_evara_db, set_auth_dependencies as set_evara_auth, set_sms_function, set_jwt_secret as set_evara_jwt
    set_evara_db(db)
    set_evara_auth(get_current_user, get_current_user_optional)
    set_evara_jwt(JWT_SECRET)
    set_sms_function(send_sms_notification)
    app.include_router(evara_router, prefix="/api")
    logger.info("Evara Women's Wellness router loaded")
except Exception as e:
    logger.warning(f"Could not load Evara router: {e}")

# Glydex - Diabetes Care Router
try:
    from routes.glydex import router as glydex_router, set_db as set_glydex_db, set_jwt_secret as set_glydex_jwt, set_notification_functions as set_glydex_notif
    set_glydex_db(db)
    set_glydex_jwt(JWT_SECRET)
    set_glydex_notif(send_email_notification, send_sms_notification)
    app.include_router(glydex_router, prefix="/api")
    logger.info("Glydex Diabetes Care router loaded")
except Exception as e:
    logger.warning(f"Could not load Glydex router: {e}")

# Subscription Management Router
try:
    from routes.subscriptions import router as subscriptions_router, set_db as set_subscriptions_db
    set_subscriptions_db(db)
    app.include_router(subscriptions_router, prefix="/api")
    logger.info("Subscription Management router loaded")
except Exception as e:
    logger.warning(f"Could not load Subscriptions router: {e}")

# Cross-Sell Engine Router
try:
    from routes.cross_sell import router as cross_sell_router
    app.include_router(cross_sell_router, prefix="/api")
    logger.info("Cross-Sell Engine router loaded")
except Exception as e:
    logger.warning(f"Could not load Cross-Sell router: {e}")

# Gift Health Cards Router
try:
    from routes.gift_cards import router as gift_cards_router
    app.include_router(gift_cards_router, prefix="/api")
    logger.info("Gift Cards router loaded")
except Exception as e:
    logger.warning(f"Could not load Gift Cards router: {e}")

# Care Packages (Outcome Programs) Router
try:
    from routes.care_packages import router as care_packages_router
    app.include_router(care_packages_router, prefix="/api")
    logger.info("Care Packages router loaded")
except Exception as e:
    logger.warning(f"Could not load Care Packages router: {e}")

# Reneu Wellness & Fitness Router
try:
    from routes.reneu import router as reneu_router, set_db as set_reneu_db, set_jwt_secret as set_reneu_jwt
    set_reneu_db(db)
    set_reneu_jwt(JWT_SECRET)
    app.include_router(reneu_router, prefix="/api")
    logger.info("Reneu Wellness & Fitness router loaded")
except Exception as e:
    logger.warning(f"Could not load Reneu router: {e}")

# Health Reminders Router
try:
    from routes.health_reminders import router as reminders_router, set_db as set_reminders_db, set_jwt_secret as set_reminders_jwt
    set_reminders_db(db)
    set_reminders_jwt(JWT_SECRET)
    app.include_router(reminders_router, prefix="/api")
    logger.info("Health Reminders router loaded")
except Exception as e:
    logger.warning(f"Could not load Health Reminders router: {e}")

# Cashfree Payment Gateway Router
try:
    from routes.cashfree import router as cashfree_router, set_db as set_cashfree_db
    set_cashfree_db(db)
    app.include_router(cashfree_router, prefix="/api/payments")
    logger.info("Cashfree Payment Gateway router loaded")
except Exception as e:
    logger.warning(f"Could not load Cashfree router: {e}")

# Membership Tiers Router (Gold/Silver/Bronze)
try:
    from routes.membership_tiers import router as membership_tiers_router, set_db as set_membership_tiers_db
    set_membership_tiers_db(db)
    app.include_router(membership_tiers_router, prefix="/api")
    logger.info("Membership Tiers router loaded")
except Exception as e:
    logger.warning(f"Could not load Membership Tiers router: {e}")

# FCM Push Notifications Router
try:
    from routes.fcm import router as fcm_router, set_db as set_fcm_db
    set_fcm_db(db)
    app.include_router(fcm_router, prefix="/api")
    logger.info("FCM Push Notifications router loaded")
except Exception as e:
    logger.warning(f"Could not load FCM router: {e}")





# Payment Methods + WhatsApp Wallet Notifications
try:
    from routes.payment_wallet_routes import router as payment_notify_router, init_db as init_pn_db, set_whatsapp_fn
    init_pn_db(db)
    try:
        set_whatsapp_fn(send_whatsapp)
    except:
        pass
    app.include_router(payment_notify_router)
    logger.info("Payment Methods + Wallet Notifications router loaded")
except Exception as e:
    logger.warning(f"Could not load Payment/Notify router: {e}")

# Health Insights, Streaks, Medicine Lookup, Family Wallet
try:
    from routes.health_insights_routes import router as insights_router, init_db as init_insights_db
    init_insights_db(db)
    app.include_router(insights_router)
    logger.info("Health Insights router loaded")
except Exception as e:
    logger.warning(f"Could not load Health Insights router: {e}")

# AI Health Insights (Claude-powered)
try:
    from routes.ai_health_insights import router as ai_insights_router, init_db as init_ai_insights_db
    init_ai_insights_db(db)
    app.include_router(ai_insights_router)
    logger.info("AI Health Insights router loaded")
except Exception as e:
    logger.warning(f"Could not load AI Health Insights router: {e}")

# Test Categorization AI
try:
    from routes.test_categorization import router as test_cat_router, set_db as set_test_cat_db
    set_test_cat_db(db)
    app.include_router(test_cat_router, prefix="/api")
    logger.info("Test Categorization AI router loaded")
except Exception as e:
    logger.warning(f"Could not load Test Categorization router: {e}")



# Order Status Notifications
try:
    from routes.order_notifications import router as notif_router, init_db as init_notif_db, set_whatsapp_func as set_notif_wa
    init_notif_db(db)
    set_notif_wa(send_msg91_whatsapp)
    app.include_router(notif_router)
    logger.info("Order Notifications router loaded (with WhatsApp)")
except Exception as e:
    logger.warning(f"Could not load Order Notifications router: {e}")

# Clinic Features (Tokens, Patient History, Doctor Delay)
try:
    from routes.clinic_features import router as clinic_features_router, init_db as init_clinic_features_db
    init_clinic_features_db(db)
    app.include_router(clinic_features_router)
    logger.info("Clinic Features router loaded")
except Exception as e:
    logger.warning(f"Could not load Clinic Features router: {e}")

# Cura Wallet + CuraX Coins
try:
    from routes.wallet_routes import router as wallet_router, init_db as init_wallet_db
    init_wallet_db(db)
    app.include_router(wallet_router)
    logger.info("Cura Wallet + CuraX Coins router loaded")
except Exception as e:
    logger.warning(f"Could not load Wallet router: {e}")

# Phase 4 Market Leader Features
try:
    from routes.phase4_features import router as phase4_router, set_db as set_phase4_db
    set_phase4_db(db)
    app.include_router(phase4_router, prefix="/api")
    logger.info("Phase 4 Market Leader features router loaded")
except Exception as e:
    logger.warning(f"Could not load Phase 4 router: {e}")

# Notifications Router
try:
    from routes.notifications import router as notifications_router, set_db as set_notifications_db
    set_notifications_db(db)
    app.include_router(notifications_router, prefix="/api")
    logger.info("Notifications router loaded")
except Exception as e:
    logger.warning(f"Could not load Notifications router: {e}")

# Stripe Payment Gateway Router (for International Patients)
try:
    from routes.stripe_payments import router as stripe_router, set_db as set_stripe_db
    set_stripe_db(db)
    app.include_router(stripe_router)
    logger.info("Stripe Payment Gateway router loaded")
except Exception as e:
    logger.warning(f"Could not load Stripe router: {e}")

# Payment Webhooks & Disputes Router
try:
    from routes.payment_webhooks import router as payment_webhooks_router, set_db as set_webhooks_db
    set_webhooks_db(db)
    app.include_router(payment_webhooks_router, prefix="/api")
    logger.info("Payment Webhooks & Disputes router loaded")
except Exception as e:
    logger.warning(f"Could not load Payment Webhooks router: {e}")

# Superfone Webhook Integration
try:
    from routes.superfone_webhook import router as superfone_router, set_db as set_superfone_db
    set_superfone_db(db)
    app.include_router(superfone_router, prefix="/api")
    logger.info("Superfone Webhook router loaded")
except Exception as e:
    logger.warning(f"Could not load Superfone Webhook router: {e}")


# Chatbot API (for MSG91 WhatsApp bot)
try:
    from routes.chatbot_api import router as chatbot_router, set_db as set_chatbot_db
    set_chatbot_db(db)
    app.include_router(chatbot_router, prefix="/api")
    logger.info("Chatbot API router loaded")
except Exception as e:
    logger.warning(f"Could not load Chatbot API router: {e}")


# Health Calendar API
try:
    from routes.health_calendar import router as health_calendar_router
    app.include_router(health_calendar_router, prefix="/api")
    logger.info("Health Calendar router loaded")
except Exception as e:
    logger.warning(f"Could not load Health Calendar router: {e}")


# Patient Registration System
try:
    from routes.patients import router as patients_router, set_db as set_patients_db, set_jwt_config as set_patients_jwt
    set_patients_db(db)
    set_patients_jwt(JWT_SECRET)
    app.include_router(patients_router, prefix="/api")
    logger.info("Patient Registration router loaded")
except Exception as e:
    logger.warning(f"Could not load Patient Registration router: {e}")

# Feedback Router
try:
    from routes.feedback_routes import router as feedback_router, set_db as set_feedback_db
    set_feedback_db(db)
    app.include_router(feedback_router, prefix="/api")
    logger.info("Feedback router loaded")
except Exception as e:
    logger.warning(f"Could not load Feedback router: {e}")

# Biometric Attendance Router
try:
    from routes.biometric_attendance import router as biometric_router, set_db as set_biometric_db, set_jwt_config as set_biometric_jwt
    set_biometric_db(db)
    set_biometric_jwt(JWT_SECRET, JWT_ALGORITHM)
    app.include_router(biometric_router, prefix="/api")
    logger.info("Biometric Attendance router loaded")
except Exception as e:
    logger.warning(f"Could not load Biometric Attendance router: {e}")

# ANC Registration Router
try:
    from routes.anc_registration import router as anc_router, set_db as set_anc_db, set_jwt_config as set_anc_jwt, set_notification_functions as set_anc_notif
    set_anc_db(db)
    set_anc_jwt(JWT_SECRET, JWT_ALGORITHM)
    set_anc_notif(send_email_notification, send_sms_notification)
    app.include_router(anc_router, prefix="/api")
    logger.info("ANC Registration router loaded")
except Exception as e:
    logger.warning(f"Could not load ANC Registration router: {e}")

# Admin Routes (extracted from server.py)
try:
    from routes.admin import router as admin_router, set_db as set_admin_db, set_jwt_config, set_admin_password, set_notification_functions
    set_admin_db(db)
    set_jwt_config(JWT_SECRET, JWT_ALGORITHM)
    set_admin_password(ADMIN_PASSWORD)
    set_notification_functions(send_email_notification, send_sms_notification)
    app.include_router(admin_router, prefix="/api")
    logger.info("Admin router loaded")
except Exception as e:
    logger.warning(f"Could not load Admin router: {e}")

# Staff Routes (extracted from server.py)
try:
    from routes.staff import router as staff_router, set_db as set_staff_db, set_jwt_config as set_staff_jwt, set_notification_functions as set_staff_notif, set_msg91_functions as set_staff_msg91
    set_staff_db(db)
    set_staff_jwt(JWT_SECRET, JWT_ALGORITHM)
    set_staff_notif(send_email_notification, send_sms_notification, send_whatsapp_notification)
    set_staff_msg91(completed_func=send_diagyn_appointment_completed)
    app.include_router(staff_router, prefix="/api")
    logger.info("Staff router loaded")
except Exception as e:
    logger.warning(f"Could not load Staff router: {e}")

# DiaGyn Staff Portal Routes (New Simplified Portal)
try:
    from routes.diagyn_staff import router as diagyn_staff_router, set_db as set_diagyn_staff_db, set_jwt_config as set_diagyn_staff_jwt, set_whatsapp_func as set_diagyn_staff_whatsapp, set_appointment_manager as set_diagyn_staff_ws
    set_diagyn_staff_db(db)
    set_diagyn_staff_jwt(JWT_SECRET, JWT_ALGORITHM)
    set_diagyn_staff_whatsapp(send_whatsapp_notification)
    set_diagyn_staff_ws(appointment_manager)  # Set WebSocket manager for real-time updates
    app.include_router(diagyn_staff_router, prefix="/api")
    logger.info("DiaGyn Staff Portal router loaded with WebSocket support")
except Exception as e:
    logger.warning(f"Could not load DiaGyn Staff Portal router: {e}")

# Inventory Management Routes (Medicine & Test Inventory for Staff)
try:
    from routes.inventory import router as inventory_router, set_db as set_inventory_db
    set_inventory_db(db)
    app.include_router(inventory_router, prefix="/api")
    logger.info("Inventory Management router loaded")
except Exception as e:
    logger.warning(f"Could not load Inventory router: {e}")

# Clinic Management Routes
try:
    from routes.clinic_management import router as clinic_mgmt_router, set_db as set_clinic_db, set_jwt_config as set_clinic_jwt, set_llm_key as set_clinic_llm, set_notification_functions as set_clinic_notif
    set_clinic_db(db)
    set_clinic_jwt(JWT_SECRET, JWT_ALGORITHM)
    set_clinic_llm(os.environ.get("EMERGENT_LLM_KEY", ""))
    set_clinic_notif(send_email_notification)
    app.include_router(clinic_mgmt_router, prefix="/api")
    logger.info("Clinic Management router loaded")
except Exception as e:
    logger.warning(f"Could not load Clinic Management router: {e}")

# Face Recognition Attendance Router (for mobile biometric)
try:
    from routes.face_attendance import router as face_router, set_db as set_face_db
    set_face_db(db)
    app.include_router(face_router, prefix="/api/face-attendance")
    logger.info("Face Recognition Attendance router loaded")
except Exception as e:
    logger.warning(f"Could not load Face Attendance router: {e}")

# Calories Tracking Router (for Evara, Glydex, Alyne food tracking)
try:
    from routes.calories import router as calories_router
    app.include_router(calories_router)
    logger.info("Calories Tracking router loaded")
except Exception as e:
    logger.warning(f"Could not load Calories router: {e}")

# Configuration Data Router (clinics, doctors, fees, etc.)
try:
    from routes.config import router as config_router
    app.include_router(config_router, prefix="/api")
    logger.info("Configuration Data router loaded")
except Exception as e:
    logger.warning(f"Could not load Config router: {e}")

# Enhanced Features Router (Notifications, Gamification, Health Dashboard, Smart Scheduling, Multi-language)
try:
    from routes.enhanced_features import router as enhanced_router, set_db as set_enhanced_db
    set_enhanced_db(db)
    app.include_router(enhanced_router, prefix="/api/features")
    logger.info("Enhanced Features router loaded")
except Exception as e:
    logger.warning(f"Could not load Enhanced Features router: {e}")

# Calendar Sync Router
try:
    from routes.calendar_sync import router as calendar_router, set_db as set_calendar_db
    set_calendar_db(db)
    app.include_router(calendar_router, prefix="/api")
    logger.info("Calendar Sync router loaded")
except Exception as e:
    logger.warning(f"Could not load Calendar Sync router: {e}")

# Staff Notifications Router
try:
    from routes.staff_notifications import setup_routes as setup_notifications_routes
    staff_notifications_router = setup_notifications_routes(db)
    app.include_router(staff_notifications_router, prefix="/api")
    logger.info("Staff Notifications router loaded")
except Exception as e:
    logger.warning(f"Could not load Staff Notifications router: {e}")

# Patient Enhancement Features Router
try:
    from routes.enhancements import setup_routes as setup_enhancement_routes
    enhancement_router = setup_enhancement_routes(db)
    app.include_router(enhancement_router, prefix="/api")
    logger.info("Patient Enhancement Features router loaded")
except Exception as e:
    logger.warning(f"Could not load Enhancement Features router: {e}")

# AI Features Router
try:
    from routes.ai_features import setup_routes as setup_ai_routes
    ai_router = setup_ai_routes(db)
    app.include_router(ai_router, prefix="/api")
    logger.info("AI Healthcare Features router loaded")
except Exception as e:
    logger.warning(f"Could not load AI Features router: {e}")

# Phase 3 Features Router
try:
    from routes.phase3_features import setup_routes as setup_phase3_routes
    phase3_router = setup_phase3_routes(db)
    app.include_router(phase3_router, prefix="/api")
    logger.info("Phase 3 Features router loaded")
except Exception as e:
    logger.warning(f"Could not load Phase 3 Features router: {e}")

# WhatsApp Notification Routes
try:
    from routes.whatsapp import router as whatsapp_router, set_whatsapp_function
    set_whatsapp_function(send_whatsapp_notification)
    app.include_router(whatsapp_router, prefix="/api")
    logger.info("WhatsApp notification router loaded")
except Exception as e:
    logger.warning(f"Could not load WhatsApp router: {e}")

# MSG91 WhatsApp Routes (Cost-effective alternative)
try:
    from routes.msg91_whatsapp import router as msg91_router, set_db as set_msg91_db
    set_msg91_db(db)
    app.include_router(msg91_router, prefix="/api")
    logger.info("MSG91 WhatsApp router loaded")
except Exception as e:
    logger.warning(f"Could not load MSG91 WhatsApp router: {e}")

# Enhancement Features V2 Routes (AI Triage, Teleconsultation, Community, etc.)
try:
    from routes.enhancements_v2 import router as enhancements_v2_router, set_db as set_enhancements_v2_db
    set_enhancements_v2_db(db)
    app.include_router(enhancements_v2_router, prefix="/api")
    logger.info("Enhancement Features V2 router loaded (AI Triage, Teleconsultation, Community, Insurance, Wearables)")
except Exception as e:
    logger.warning(f"Could not load Enhancement Features V2 router: {e}")

# Enhancement Features V3 Routes (Admin & Analytics)
try:
    from routes.enhancements_v3 import router as enhancements_v3_router, set_db as set_enhancements_v3_db
    set_enhancements_v3_db(db)
    app.include_router(enhancements_v3_router, prefix="/api")
    logger.info("Enhancement Features V3 router loaded (Audit Trail, Revenue Forecast, Health Outcomes, Shifts, Signage)")
except Exception as e:
    logger.warning(f"Could not load Enhancement Features V3 router: {e}")

# Medicine Images Upload (No Login Required)
try:
    from routes.medicine_images import router as medicine_images_router, set_db as set_medicine_images_db
    set_medicine_images_db(db)
    app.include_router(medicine_images_router, prefix="/api")
    logger.info("Medicine Images Upload router loaded (No Login Required)")
except Exception as e:
    logger.warning(f"Could not load Medicine Images router: {e}")

# Proton Report Download API
try:
    from routes.proton_reports import router as proton_reports_router, set_db as set_proton_reports_db
    set_proton_reports_db(db)
    app.include_router(proton_reports_router, prefix="/api")
    logger.info("Proton Reports Download router loaded")
except Exception as e:
    logger.warning(f"Could not load Proton Reports router: {e}")

# Authentication V2 Routes (Two-Tiered: Guest SMS OTP + Email Sign-up)
try:
    from routes.auth_v2 import router as auth_v2_router, set_db as set_auth_v2_db
    set_auth_v2_db(db)
    app.include_router(auth_v2_router, prefix="/api")
    logger.info("Authentication V2 router loaded (Guest SMS OTP + Email Sign-up)")
except Exception as e:
    logger.warning(f"Could not load Auth V2 router: {e}")

# Patient Authentication Routes (New Unified Login/Signup System)
try:
    from routes.patient_auth import router as patient_auth_router, set_db as set_patient_auth_db
    set_patient_auth_db(db)
    app.include_router(patient_auth_router, prefix="/api")
    logger.info("Patient Authentication router loaded (Email/WhatsApp OTP + Password)")
except Exception as e:
    logger.warning(f"Could not load Patient Auth router: {e}")

# Prescription OCR Routes
try:
    from routes.prescription_ocr import router as prescription_ocr_router, set_db as set_prescription_ocr_db
    set_prescription_ocr_db(db)
    app.include_router(prescription_ocr_router, prefix="/api")
    logger.info("Prescription OCR router loaded")
except Exception as e:
    logger.warning(f"Could not load Prescription OCR router: {e}")

# Voice Booking Routes
try:
    from routes.voice_booking import router as voice_booking_router, set_db as set_voice_booking_db
    set_voice_booking_db(db)
    app.include_router(voice_booking_router, prefix="/api")
    logger.info("Voice Booking router loaded")
except Exception as e:
    logger.warning(f"Could not load Voice Booking router: {e}")

# Inventory Import Routes
try:
    from routes.inventory_import import router as inventory_import_router, set_db as set_inventory_import_db
    set_inventory_import_db(db)
    app.include_router(inventory_import_router, prefix="/api")
    logger.info("Inventory Import router loaded")
except Exception as e:
    logger.warning(f"Could not load Inventory Import router: {e}")

# Family Health Vault Routes
try:
    from routes.family_vault import router as family_vault_router, set_db as set_family_vault_db
    set_family_vault_db(db)
    app.include_router(family_vault_router, prefix="/api")
    logger.info("Family Health Vault router loaded")
except Exception as e:
    logger.warning(f"Could not load Family Health Vault router: {e}")


# Booking Analytics Routes
try:
    from routes.booking_analytics import router as analytics_router, set_db as set_analytics_db
    set_analytics_db(db)
    app.include_router(analytics_router, prefix="/api")
    logger.info("Booking Analytics router loaded")
except Exception as e:
    logger.warning(f"Could not load Booking Analytics router: {e}")

# CuraCoins Loyalty Routes
try:
    from routes.curacoins import router as curacoins_router, set_db as set_curacoins_db
    set_curacoins_db(db)
    app.include_router(curacoins_router, prefix="/api")
    logger.info("CuraCoins router loaded")
except Exception as e:
    logger.warning(f"Could not load CuraCoins router: {e}")

# CuraBonus Gamified Loyalty
try:
    from routes.curabonus import router as curabonus_router
    app.include_router(curabonus_router, prefix="/api")
    logger.info("CuraBonus router loaded")
except Exception as e:
    logger.warning(f"Could not load CuraBonus router: {e}")


# Doctor Insights AI Routes
try:
    from routes.doctor_insights import router as doc_insights_router, set_db as set_doc_insights_db
    set_doc_insights_db(db)
    app.include_router(doc_insights_router, prefix="/api")
    logger.info("Doctor Insights router loaded")
except Exception as e:
    logger.warning(f"Could not load Doctor Insights router: {e}")

# Emergency SOS & WhatsApp Menu Routes
try:
    from routes.emergency_whatsapp import router as emergency_router, set_db as set_emergency_db
    set_emergency_db(db)
    app.include_router(emergency_router, prefix="/api")
    logger.info("Emergency & WhatsApp router loaded")
except Exception as e:
    logger.warning(f"Could not load Emergency router: {e}")


# Platform Report Routes
try:
    from routes.platform_report import router as report_router, set_db as set_report_db
    set_report_db(db)
    app.include_router(report_router, prefix="/api")
    logger.info("Platform Report router loaded")
except Exception as e:
    logger.warning(f"Could not load Platform Report router: {e}")



# Orange Pharmacy Staff Portal Routes (Enhanced)
try:
    from routes.orange_pharmacy import router as orange_pharmacy_router, set_db as set_orange_pharmacy_db, set_jwt_config as set_orange_pharmacy_jwt, set_notification_functions as set_orange_pharmacy_notif
    set_orange_pharmacy_db(db)
    set_orange_pharmacy_jwt(JWT_SECRET, JWT_ALGORITHM)
    set_orange_pharmacy_notif(send_email_notification, send_whatsapp_notification, send_orange_pharmacy_confirmation)
    app.include_router(orange_pharmacy_router, prefix="/api")
    logger.info("Orange Pharmacy Staff Portal router loaded")
except Exception as e:
    logger.warning(f"Could not load Orange Pharmacy router: {e}")

# Admin Analytics Dashboard Routes
try:
    from routes.admin_analytics import router as admin_analytics_router, set_db as set_admin_analytics_db, set_jwt_config as set_admin_analytics_jwt
    set_admin_analytics_db(db)
    set_admin_analytics_jwt(JWT_SECRET, JWT_ALGORITHM)
    app.include_router(admin_analytics_router, prefix="/api")
    logger.info("Admin Analytics Dashboard router loaded")
except Exception as e:
    logger.warning(f"Could not load Admin Analytics router: {e}")


# Pharmacy Billing & Management Routes
try:
    from routes.pharmacy_billing import router as pharmacy_billing_router, set_db as set_pharmacy_billing_db, set_jwt_config as set_pharmacy_billing_jwt
    set_pharmacy_billing_db(db)
    set_pharmacy_billing_jwt(JWT_SECRET, JWT_ALGORITHM)
    app.include_router(pharmacy_billing_router, prefix="/api")
    logger.info("Pharmacy Billing router loaded")
except Exception as e:
    logger.warning(f"Could not load Pharmacy Billing router: {e}")


# Mango Health Labs Staff Portal Routes (Enhanced)
try:
    from routes.mango_labs import router as mango_labs_router, set_db as set_mango_labs_db, set_jwt_config as set_mango_labs_jwt, set_notification_functions as set_mango_labs_notif
    set_mango_labs_db(db)
    set_mango_labs_jwt(JWT_SECRET, JWT_ALGORITHM)
    set_mango_labs_notif(send_email_notification, send_whatsapp_notification, send_proton_report_ready)
    app.include_router(mango_labs_router, prefix="/api")
    logger.info("Mango Health Labs Staff Portal router loaded")
except Exception as e:
    logger.warning(f"Could not load Mango Labs router: {e}")

# Public Order Tracking Routes
try:
    from routes.tracking import router as tracking_router, set_db as set_tracking_db
    set_tracking_db(db)
    app.include_router(tracking_router, prefix="/api")
    logger.info("Order Tracking router loaded")
except Exception as e:
    logger.warning(f"Could not load Order Tracking router: {e}")

# Portal Coupons Router
try:
    from routes.portal_coupons import router as portal_coupons_router, set_db as set_portal_coupons_db
    set_portal_coupons_db(db)
    app.include_router(portal_coupons_router, prefix="/api")
    logger.info("Portal Coupons router loaded")
except Exception as e:
    logger.warning(f"Could not load Portal Coupons router: {e}")


# WhatsApp OTP Routes (legacy — kept for backward compat)
try:
    from routes.whatsapp_otp import router as whatsapp_otp_router
    set_otp_db(db)
    set_otp_send_func(send_msg91_whatsapp)
    app.include_router(whatsapp_otp_router, prefix="/api")
    logger.info("WhatsApp OTP router loaded")
except Exception as e:
    logger.warning(f"Could not load WhatsApp OTP router: {e}")

# SMS OTP Routes (primary OTP channel via MSG91 SMS)
try:
    from routes.sms_otp import router as sms_otp_router
    from services.msg91_sms_otp import set_db as set_sms_otp_db
    set_sms_otp_db(db)
    app.include_router(sms_otp_router, prefix="/api")
    logger.info("SMS OTP router loaded")
except Exception as e:
    logger.warning(f"Could not load SMS OTP router: {e}")

# Super Admin Routes
try:
    from routes.super_admin import router as super_admin_router, set_db as set_super_admin_db, set_jwt_config as set_super_admin_jwt
    set_super_admin_db(db)
    set_super_admin_jwt(JWT_SECRET, JWT_ALGORITHM)
    app.include_router(super_admin_router, prefix="/api")
    logger.info("Super Admin router loaded")
except Exception as e:
    logger.warning(f"Could not load Super Admin router: {e}")

# Booking Verification Code Routes (Appointment Code, Booking Code, Delivery Code)
try:
    from routes.booking_otp_routes import router as booking_code_router, set_db as set_booking_code_db
    set_booking_code_db(db)
    app.include_router(booking_code_router, prefix="/api")
    logger.info("Booking Verification Code router loaded")
except Exception as e:
    logger.warning(f"Could not load Booking Code router: {e}")

# Doctor Schedule Routes
try:
    from routes.doctor_schedule import router as doctor_schedule_router, set_db as set_doctor_schedule_db, set_jwt_config as set_doctor_schedule_jwt
    set_doctor_schedule_db(db)
    set_doctor_schedule_jwt(JWT_SECRET, JWT_ALGORITHM)
    app.include_router(doctor_schedule_router, prefix="/api")
    logger.info("Doctor Schedule router loaded")
except Exception as e:
    logger.warning(f"Could not load Doctor Schedule router: {e}")

# Clinic Override Routes
try:
    from routes.clinic_override import router as clinic_override_router, set_db as set_clinic_override_db, set_jwt_config as set_clinic_override_jwt
    set_clinic_override_db(db)
    set_clinic_override_jwt(JWT_SECRET, JWT_ALGORITHM)
    app.include_router(clinic_override_router, prefix="/api")
    logger.info("Clinic Override router loaded")
except Exception as e:
    logger.warning(f"Could not load Clinic Override router: {e}")


# Invoice Generation Router
try:
    from routes.invoice_routes import router as invoice_router, set_db as set_invoice_db
    set_invoice_db(db)
    app.include_router(invoice_router, prefix="/api")
    logger.info("Invoice Generation router loaded")
except Exception as e:
    logger.warning(f"Could not load invoice router: {e}")


try:
    from routes.ratings import router as ratings_router, set_db as set_ratings_db
    set_ratings_db(db)
    app.include_router(ratings_router, prefix="/api")
    logger.info("App Ratings router loaded")
except Exception as e:
    logger.warning(f"Could not load ratings router: {e}")


try:
    from routes.token_announcer import router as token_router
    app.include_router(token_router, prefix="/api")
    logger.info("Token Announcer router loaded")
except Exception as e:
    logger.warning(f"Could not load token announcer router: {e}")

try:
    from routes.pharmacy_extended import router as pharmacy_ext_router
    app.include_router(pharmacy_ext_router, prefix="/api")
    logger.info("Pharmacy Extended router loaded")
except Exception as e:
    logger.warning(f"Could not load pharmacy_extended router: {e}")

try:
    from routes.admin_enrichment import router as admin_enrichment_router
    app.include_router(admin_enrichment_router, prefix="/api")
    logger.info("Admin AI Enrichment router loaded")
except Exception as e:
    logger.warning(f"Could not load admin_enrichment router: {e}")

try:
    from routes.pharmacy_trending import router as pharmacy_trending_router
    app.include_router(pharmacy_trending_router, prefix="/api")
    logger.info("Pharmacy Trending router loaded")
except Exception as e:
    logger.warning(f"Could not load pharmacy_trending router: {e}")


try:
    from routes.waitlist import router as waitlist_router
    app.include_router(waitlist_router, prefix="/api")
    logger.info("Waitlist router loaded")
except Exception as e:
    logger.warning(f"Could not load waitlist router: {e}")

try:
    from routes.portal_features import router as portal_features_router
    app.include_router(portal_features_router, prefix="/api")
    logger.info("Portal Features router loaded")
except Exception as e:
    logger.warning(f"Could not load portal_features router: {e}")

try:
    from routes.health_streak import router as health_streak_router
    app.include_router(health_streak_router, prefix="/api")
    logger.info("Health Streak router loaded")
except Exception as e:
    logger.warning(f"Could not load health_streak router: {e}")

try:
    from routes.queue_status import router as queue_status_router
    app.include_router(queue_status_router, prefix="/api")
    logger.info("Queue Status router loaded")
except Exception as e:
    logger.warning(f"Could not load queue_status router: {e}")

try:
    from routes.diagnostics_extended import router as diag_ext_router
    app.include_router(diag_ext_router, prefix="/api")
    logger.info("Diagnostics Extended router loaded")
except Exception as e:
    logger.warning(f"Could not load diagnostics_extended router: {e}")

try:
    from routes.coupons import router as coupons_router
    app.include_router(coupons_router, prefix="/api")
    logger.info("Coupons router loaded")
except Exception as e:
    logger.warning(f"Could not load coupons router: {e}")

try:
    from routes.payment_links import router as payment_links_router
    app.include_router(payment_links_router, prefix="/api")
    logger.info("Payment Links router loaded")
except Exception as e:
    logger.warning(f"Could not load payment_links router: {e}")

# Pharmacy V2 Routes (Alternatives, Reorder, Prescriptions)
try:
    from routes.pharmacy_v2 import router as pharmacy_v2_router, set_db as set_pharmacy_v2_db
    set_pharmacy_v2_db(db)
    app.include_router(pharmacy_v2_router, prefix="/api")
    logger.info("Pharmacy V2 router loaded")
except Exception as e:
    logger.warning(f"Could not load pharmacy_v2 router: {e}")

# Pharmacy V3 Browse API (optimized for 3L+ medicines)
try:
    from routes.pharmacy_browse import router as pharmacy_browse_router, set_db as set_pharmacy_browse_db
    set_pharmacy_browse_db(db)
    app.include_router(pharmacy_browse_router, prefix="/api")
    logger.info("Pharmacy V3 Browse router loaded")
except Exception as e:
    logger.warning(f"Could not load pharmacy_browse router: {e}")

# Medicine Migration Routes (one-time data migration)
try:
    from routes.medicine_migration import router as migration_router, set_db as set_migration_db, set_storage as set_migration_storage
    set_migration_db(db)
    from services import object_storage as obj_storage_mod
    set_migration_storage(obj_storage_mod)
    app.include_router(migration_router, prefix="/api")
    logger.info("Medicine migration router loaded")
except Exception as e:
    logger.warning(f"Could not load medicine migration router: {e}")

# Emergency Health Card Routes
try:
    from routes.emergency_card import router as emergency_card_router, set_db as set_emergency_card_db
    set_emergency_card_db(db)
    app.include_router(emergency_card_router, prefix="/api")
    logger.info("Emergency card router loaded")
except Exception as e:
    logger.warning(f"Could not load emergency card router: {e}")

# Health Timeline Routes
try:
    from routes.health_timeline import router as timeline_router, set_db as set_timeline_db
    set_timeline_db(db)
    app.include_router(timeline_router, prefix="/api")
    logger.info("Health timeline router loaded")
except Exception as e:
    logger.warning(f"Could not load health timeline router: {e}")

# Medicine Interaction Guardian Routes
try:
    from routes.medicine_interactions import router as interactions_router, set_db as set_interactions_db
    set_interactions_db(db)
    app.include_router(interactions_router, prefix="/api")
    logger.info("Medicine interactions router loaded")
except Exception as e:
    logger.warning(f"Could not load medicine interactions router: {e}")

# Post-Visit Pipeline Routes
try:
    from routes.post_visit_pipeline import router as post_visit_router, set_db as set_post_visit_db
    set_post_visit_db(db)
    app.include_router(post_visit_router, prefix="/api")
    logger.info("Post-visit pipeline router loaded")
except Exception as e:
    logger.warning(f"Could not load post-visit pipeline router: {e}")

# Express Rx Flow Routes
try:
    from routes.express_rx import router as express_rx_router, set_db as set_express_rx_db
    set_express_rx_db(db)
    app.include_router(express_rx_router, prefix="/api")
    logger.info("Express Rx router loaded")
except Exception as e:
    logger.warning(f"Could not load express rx router: {e}")




# Appointment V2 Routes (Calendar, Pre-consultation, Home Tests)
try:
    from routes.appointment_v2 import router as appointment_v2_router, set_db as set_appointment_v2_db
    set_appointment_v2_db(db)
    app.include_router(appointment_v2_router, prefix="/api")
    logger.info("Appointment V2 router loaded")
except Exception as e:
    logger.warning(f"Could not load appointment_v2 router: {e}")

# Debug & Test Routes (Diagnostics, Health Reports, Test WhatsApp, Credentials)
try:
    from routes.debug_routes import router as debug_router, set_db as set_debug_db, set_deps as set_debug_deps
    set_debug_db(db)
    set_debug_deps({
        "get_diagnostics": get_diagnostics,
        "get_health_reporter": get_health_reporter,
        "get_ist_now": get_ist_now,
        "test_msg91_connection": test_msg91_connection,
        "whatsapp_senders": {
            "diagyn_appointment_confirm": send_diagyn_appointment_confirmation,
            "diagyn_appointment_reminder": send_diagyn_appointment_reminder,
        }
    })
    app.include_router(debug_router, prefix="/api")
    logger.info("Debug routes router loaded")
except Exception as e:
    logger.warning(f"Could not load debug routes router: {e}")

# User Feature Routes (Family, Subscriptions, Prescription OCR)
try:
    from routes.user_features_routes import router as user_features_router, set_db as set_user_features_db
    set_user_features_db(db)
    app.include_router(user_features_router, prefix="/api")
    logger.info("User Features router loaded")
except Exception as e:
    logger.warning(f"Could not load user_features router: {e}")

# Waitlist & Reschedule Routes
try:
    from routes.waitlist_reschedule_routes import router as waitlist_reschedule_router, set_db as set_waitlist_db
    set_waitlist_db(db)
    app.include_router(waitlist_reschedule_router, prefix="/api")
    logger.info("Waitlist & Reschedule router loaded")
except Exception as e:
    logger.warning(f"Could not load waitlist_reschedule router: {e}")

# Auth Routes (extracted from server.py)
try:
    from routes.auth_routes import router as auth_router, set_deps as set_auth_deps
    set_auth_deps({
        "send_email_notification": send_email_notification,
        "notify_staff_new_signup": notify_staff_new_signup,
        "send_email_otp": send_email_otp,
        "verify_email_otp": verify_email_otp,
        "send_msg91_whatsapp": send_msg91_whatsapp,
    })
    app.include_router(auth_router, prefix="/api")
    logger.info("Auth router loaded")
except Exception as e:
    logger.warning(f"Could not load auth router: {e}")

# Service Routes (OTP, booking verify, drive, upload, pharmacy legacy, cleanup)
try:
    from routes.service_routes import router as service_router, set_deps as set_service_deps
    set_service_deps({
        "send_msg91_whatsapp": send_msg91_whatsapp,
        "MEDICINE_INVENTORY": MEDICINE_INVENTORY,
    })
    app.include_router(service_router, prefix="/api")
    logger.info("Service router loaded")
except Exception as e:
    logger.warning(f"Could not load service router: {e}")

# Push Notification Routes (extracted from server.py)
try:
    from routes.push_routes import router as push_router, set_deps as set_push_deps
    set_push_deps({
        "VAPID_PUBLIC_KEY": VAPID_PUBLIC_KEY,
        "send_push_notification": send_push_notification,
    })
    app.include_router(push_router, prefix="/api")
    logger.info("Push router loaded")
except Exception as e:
    logger.warning(f"Could not load push router: {e}")

# Symptom Checker router
try:
    from routes.symptom_checker import router as symptom_checker_router, set_db as set_symptom_checker_db
    set_symptom_checker_db(db)
    app.include_router(symptom_checker_router, prefix="/api")
    logger.info("Symptom Checker router loaded")
except Exception as e:
    logger.warning(f"Could not load symptom checker router: {e}")

# Lab Reports router
try:
    from routes.lab_reports import router as lab_reports_router, set_db as set_lab_reports_db
    set_lab_reports_db(db)
    app.include_router(lab_reports_router, prefix="/api")
    logger.info("Lab Reports router loaded")
except Exception as e:
    logger.warning(f"Could not load lab reports router: {e}")

try:
    from routes.test_details import router as test_details_router
    app.include_router(test_details_router)
    logger.info("Test Details AI router loaded")
except Exception as e:
    logger.warning(f"Could not load test details router: {e}")

# Error Report router (sends crash reports to nevikacura@gmail.com)
try:
    from routes.error_report import router as error_report_router
    app.include_router(error_report_router, prefix="/api")
    logger.info("Error Report router loaded")
except Exception as e:
    logger.warning(f"Could not load error report router: {e}")

# ABHA/NDHM Integration router
try:
    from routes.abha import router as abha_router, set_db as set_abha_db
    set_abha_db(db)
    app.include_router(abha_router, prefix="/api")
    logger.info("ABHA/NDHM router loaded")
except Exception as e:
    logger.warning(f"Could not load ABHA router: {e}")

# AI Health Assistant router
try:
    from routes.health_assistant import router as health_assistant_router, set_db as set_health_assistant_db
    set_health_assistant_db(db)
    app.include_router(health_assistant_router, prefix="/api")
    logger.info("Health Assistant router loaded")
except Exception as e:
    logger.warning(f"Could not load Health Assistant router: {e}")

# Hyperlocal Health Network router
try:
    from routes.hyperlocal import router as hyperlocal_router, set_db as set_hyperlocal_db
    set_hyperlocal_db(db)
    app.include_router(hyperlocal_router, prefix="/api")
    logger.info("Hyperlocal Health Network router loaded")
except Exception as e:
    logger.warning(f"Could not load Hyperlocal router: {e}")

# Video Consultation router (Daily.co)
try:
    from routes.video_consult import router as video_consult_router, set_db as set_video_consult_db
    set_video_consult_db(db)
    app.include_router(video_consult_router, prefix="/api")
    logger.info("Video Consultation router loaded")
except Exception as e:
    logger.warning(f"Could not load Video Consultation router: {e}")

# Gamification router
try:
    from routes.gamification import router as gamification_router, set_db as set_gamification_db
    set_gamification_db(db)
    app.include_router(gamification_router, prefix="/api")
    logger.info("Gamification router loaded")
except Exception as e:
    logger.warning(f"Could not load Gamification router: {e}")

# (Insurance and Mental Health features removed per user request)

# Medical Records Vault
try:
    from routes.medical_records import router as medical_records_router, set_db as set_medical_records_db
    set_medical_records_db(db)
    app.include_router(medical_records_router, prefix="/api")
    logger.info("Medical Records Vault router loaded")
except Exception as e:
    logger.warning(f"Could not load Medical Records Vault router: {e}")

# Smart Reminders
try:
    from routes.smart_reminders import router as smart_reminders_router, set_db as set_smart_reminders_db
    set_smart_reminders_db(db)
    app.include_router(smart_reminders_router, prefix="/api")
    logger.info("Smart Reminders router loaded")
except Exception as e:
    logger.warning(f"Could not load Smart Reminders router: {e}")

try:
    from routes.home_care import router as home_care_router, set_db as set_home_care_db
    set_home_care_db(db)
    app.include_router(home_care_router, prefix="/api")
    logger.info("Home Care router loaded")
except Exception as e:
    logger.warning(f"Could not load Home Care router: {e}")

# Patient Dashboard Routes (extracted from server.py)
try:
    from routes.patient_dashboard import router as patient_dashboard_router, set_db as set_patient_dashboard_db
    set_patient_dashboard_db(db)
    app.include_router(patient_dashboard_router, prefix="/api")
    logger.info("Patient Dashboard router loaded")
except Exception as e:
    logger.warning(f"Could not load Patient Dashboard router: {e}")

# Wellness Routes (Weekly Digest, Health Glance, Smart Reminder Notifications)
try:
    from routes.wellness import router as wellness_router, set_db as set_wellness_db, set_push_notification
    set_wellness_db(db)
    set_push_notification(send_push_notification)
    app.include_router(wellness_router, prefix="/api")
    logger.info("Wellness router loaded (weekly-digest, health-glance, smart-reminders/check-notifications)")
except Exception as e:
    logger.warning(f"Could not load Wellness router: {e}")

# Booking Email Routes (extracted from server.py)
try:
    from routes.booking_email import router as booking_email_router
    app.include_router(booking_email_router, prefix="/api")
    logger.info("Booking Email router loaded")
except Exception as e:
    logger.warning(f"Could not load Booking Email router: {e}")







_cors_raw = os.environ.get('CORS_ORIGINS', '')
_cors_origins = [o.strip() for o in _cors_raw.split(',') if o.strip()]
if not _cors_origins:
    _cors_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip compression for responses > 500 bytes
app.add_middleware(GZipMiddleware, minimum_size=500)

# Input sanitization middleware (pure ASGI to avoid BaseHTTPMiddleware issues)
from utils.sanitize import sanitize_dict
import json as json_module

class SanitizeInputMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] not in ("POST", "PUT", "PATCH"):
            await self.app(scope, receive, send)
            return

        # Check content-type from headers
        headers = dict((k.lower(), v) for k, v in [(h[0].decode(), h[1].decode()) for h in scope.get("headers", [])])
        content_type = headers.get("content-type", "")

        if "application/json" not in content_type:
            await self.app(scope, receive, send)
            return

        # Collect body chunks
        body_parts = []
        while True:
            message = await receive()
            body_parts.append(message.get("body", b""))
            if not message.get("more_body", False):
                break

        full_body = b"".join(body_parts)

        # Try to sanitize
        try:
            if full_body:
                data = json_module.loads(full_body)
                if isinstance(data, dict):
                    cleaned = sanitize_dict(data)
                    full_body = json_module.dumps(cleaned).encode()
        except Exception:
            pass

        # Create a new receive that returns the (possibly sanitized) body
        body_sent = False
        async def new_receive():
            nonlocal body_sent
            if not body_sent:
                body_sent = True
                return {"type": "http.request", "body": full_body, "more_body": False}
            # After body is sent, wait for disconnect
            while True:
                msg = await receive()
                if msg["type"] == "http.disconnect":
                    return msg

        await self.app(scope, new_receive, send)

app.add_middleware(SanitizeInputMiddleware)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


# ── Railway Single-Service: Serve React build + SPA Fallback ──
import pathlib
_build_dir = pathlib.Path("/app/frontend/build")
_spa_index = _build_dir / "index.html"

# Mount React build static assets (JS/CSS/media) — only when build exists
if _build_dir.is_dir():
    _static_dir = _build_dir / "static"
    if _static_dir.is_dir():
        app.mount("/static", StaticFiles(directory=str(_static_dir)), name="react_static")
        logger.info(f"Mounted React static assets from {_static_dir}")

    # Serve files from /icons/ and /images/ subdirectories in build
    for subdir in ["icons", "images", "fonts"]:
        sub_path = _build_dir / subdir
        if sub_path.is_dir():
            app.mount(f"/{subdir}", StaticFiles(directory=str(sub_path)), name=f"build_{subdir}")
            logger.info(f"Mounted /{subdir} from build directory")

    logger.info("Railway SPA mode: Frontend build detected and mounted")
else:
    logger.info("No frontend build found — running in API-only mode")

@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    """Catch-all for React Router. Serves any existing build file directly
    (images, service-worker.js, etc.) — otherwise falls back to index.html
    for client-side routing. API paths get a proper JSON 404, never HTML."""
    if full_path.startswith("api/") or full_path == "api":
        return JSONResponse(status_code=404, content={"detail": "Not found", "path": f"/{full_path}"})
    if _build_dir.is_dir():
        candidate = (_build_dir / full_path).resolve()
        if candidate.is_file() and _build_dir.resolve() in candidate.parents:
            return FileResponse(str(candidate))
    if _spa_index.is_file():
        return FileResponse(str(_spa_index))
    return JSONResponse(status_code=404, content={"detail": "Not found", "path": f"/{full_path}"})
