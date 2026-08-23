"""
Debug & Test Routes - Booking diagnostics, health reports, test SMS/WhatsApp, credentials
Extracted from server.py for modularization.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import logging

logger = logging.getLogger("server")
router = APIRouter(tags=["Debug & Test"])

_db = None
_deps = {}

def set_db(db):
    global _db
    _db = db

def set_deps(deps_dict):
    """Set external dependencies (functions from server.py)."""
    global _deps
    _deps = deps_dict

def get_db():
    return _db


# ============ BOOKING DIAGNOSTICS ENDPOINTS ============

@router.get("/diagnostics/booking-system")
async def get_booking_diagnostics():
    get_diagnostics = _deps.get("get_diagnostics")
    if not get_diagnostics:
        return {"error": "Diagnostics service not available", "status": "UNAVAILABLE"}
    diagnostics = get_diagnostics()
    if not diagnostics:
        return {"error": "Diagnostics service not initialized", "status": "UNAVAILABLE"}
    try:
        return await diagnostics.run_full_diagnostic()
    except Exception as e:
        logger.error(f"Diagnostic failed: {e}")
        return {"error": str(e), "status": "ERROR"}


@router.post("/diagnostics/test-booking-flow")
async def test_booking_flow():
    get_diagnostics = _deps.get("get_diagnostics")
    if not get_diagnostics:
        return {"error": "Diagnostics service not available", "status": "UNAVAILABLE"}
    diagnostics = get_diagnostics()
    if not diagnostics:
        return {"error": "Diagnostics service not initialized", "status": "UNAVAILABLE"}
    try:
        return await diagnostics.test_booking_flow()
    except Exception as e:
        logger.error(f"Booking flow test failed: {e}")
        return {"error": str(e), "status": "ERROR"}


@router.get("/diagnostics/recent-failures")
async def get_recent_booking_failures(hours: int = 24, limit: int = 50):
    get_diagnostics = _deps.get("get_diagnostics")
    if not get_diagnostics:
        return {"error": "Diagnostics service not available", "status": "UNAVAILABLE"}
    diagnostics = get_diagnostics()
    if not diagnostics:
        return {"error": "Diagnostics service not initialized", "status": "UNAVAILABLE"}
    try:
        failures = await diagnostics.get_recent_failures(hours=hours, limit=limit)
        return {"timeframe_hours": hours, "total_failures": len(failures), "failures": failures}
    except Exception as e:
        logger.error(f"Failed to get recent failures: {e}")
        return {"error": str(e), "status": "ERROR"}


@router.get("/diagnostics/booking-audit/{booking_id}")
async def get_booking_audit_trail(booking_id: str):
    db = get_db()
    try:
        audit_logs = await db.booking_audit_logs.find({
            "$or": [{"booking_id": booking_id}, {"booking_data.booking_id": booking_id}]
        }).to_list(100)
        for log in audit_logs:
            log.pop("_id", None)
        appointment = await db.appointments.find_one({"booking_id": booking_id}, {"_id": 0})
        return {
            "booking_id": booking_id,
            "appointment_exists": appointment is not None,
            "appointment": appointment,
            "audit_trail": audit_logs
        }
    except Exception as e:
        logger.error(f"Failed to get audit trail: {e}")
        return {"error": str(e), "status": "ERROR"}


# ============ DAILY HEALTH REPORT ENDPOINTS ============

@router.get("/health-report/run")
async def run_health_report():
    get_health_reporter = _deps.get("get_health_reporter")
    if not get_health_reporter:
        return {"error": "Health reporter not available", "status": "UNAVAILABLE"}
    reporter = get_health_reporter()
    if not reporter:
        return {"error": "Health reporter not initialized", "status": "UNAVAILABLE"}
    try:
        return await reporter.run_health_check()
    except Exception as e:
        logger.error(f"Health report failed: {e}")
        return {"error": str(e), "status": "ERROR"}


@router.post("/health-report/send")
async def send_health_report():
    get_health_reporter = _deps.get("get_health_reporter")
    if not get_health_reporter:
        return {"error": "Health reporter not available", "status": "UNAVAILABLE"}
    reporter = get_health_reporter()
    if not reporter:
        return {"error": "Health reporter not initialized", "status": "UNAVAILABLE"}
    try:
        return await reporter.send_daily_report()
    except Exception as e:
        logger.error(f"Failed to send health report: {e}")
        return {"error": str(e), "status": "ERROR"}


class HealthReportConfigRequest(BaseModel):
    admin_phones: List[str]

@router.post("/health-report/configure")
async def configure_health_report(config: HealthReportConfigRequest):
    get_health_reporter = _deps.get("get_health_reporter")
    if not get_health_reporter:
        return {"error": "Health reporter not available", "status": "UNAVAILABLE"}
    reporter = get_health_reporter()
    if not reporter:
        return {"error": "Health reporter not initialized", "status": "UNAVAILABLE"}
    try:
        success = await reporter.configure_admin_phones(config.admin_phones)
        if success:
            return {"success": True, "message": f"Configured {len(config.admin_phones)} admin phones", "phones": config.admin_phones}
        return {"success": False, "error": "Failed to save configuration"}
    except Exception as e:
        logger.error(f"Failed to configure health report: {e}")
        return {"error": str(e), "status": "ERROR"}


@router.get("/health-report/config")
async def get_health_report_config():
    db = get_db()
    try:
        config = await db.system_config.find_one({"type": "health_report_config"}, {"_id": 0})
        return config or {"admin_phones": [], "message": "Not configured"}
    except Exception as e:
        logger.error(f"Failed to get health report config: {e}")
        return {"error": str(e), "status": "ERROR"}


@router.post("/health-report/alert")
async def send_critical_alert(message: str):
    get_health_reporter = _deps.get("get_health_reporter")
    if not get_health_reporter:
        return {"error": "Health reporter not available", "status": "UNAVAILABLE"}
    reporter = get_health_reporter()
    if not reporter:
        return {"error": "Health reporter not initialized", "status": "UNAVAILABLE"}
    try:
        return await reporter.send_critical_alert(message)
    except Exception as e:
        logger.error(f"Failed to send critical alert: {e}")
        return {"error": str(e), "status": "ERROR"}


# ============ TEST SMS/WHATSAPP ENDPOINTS ============

class TestSMSRequest(BaseModel):
    phone: str
    message: Optional[str] = None
    template_type: Optional[str] = "appointment"

@router.post("/test/send-sms")
async def send_test_sms(request: TestSMSRequest):
    return {"success": False, "error": "SMS service disabled - Use WhatsApp OTP instead"}


class TestWhatsAppRequest(BaseModel):
    phone: str
    template: str = "diagyn_appointment_confirm"

@router.post("/test/send-whatsapp")
async def send_test_whatsapp(request: TestWhatsAppRequest):
    """Send test WhatsApp message via MSG91 to verify integration."""
    db = get_db()
    from datetime import timedelta
    
    def _get_ist_now():
        get_ist_now = _deps.get("get_ist_now")
        if get_ist_now:
            return get_ist_now()
        from datetime import datetime, timezone
        return datetime.now(timezone.utc)
    
    ist_now = _get_ist_now()
    
    sample_data = {
        "diagyn_appointment_confirm": {
            "patient_name": "Test Patient", "date": ist_now.strftime("%d/%m/%Y"),
            "time": "10:30 AM", "doctor_name": "Dr. Vikas Jha",
            "clinic_name": "Pushpa Clinic", "booking_id": f"PC-TEST{ist_now.strftime('%H%M')}"
        },
        "diagyn_appointment_reminder": {
            "patient_name": "Test Patient", "date": (ist_now + timedelta(days=1)).strftime("%d/%m/%Y"),
            "time": "11:00 AM", "doctor_name": "Dr. Neha Patel",
            "clinic_name": "Amnion Clinic", "booking_id": f"AC-TEST{ist_now.strftime('%H%M')}"
        },
        "proton_lab_confirm": {
            "patient_name": "Test Patient", "tests": "CBC, Lipid Profile, HbA1c",
            "preferred_date": ist_now.strftime("%d/%m/%Y"), "preferred_time": "8:00 AM - 10:00 AM",
            "booking_id": f"PD-TEST{ist_now.strftime('%H%M')}", "address": "Test Address, Naigaon East"
        },
        "orange_pharmacy_confirm": {
            "patient_name": "Test Patient", "order_id": f"OP-TEST{ist_now.strftime('%H%M')}",
            "items": "Metformin 500mg, Paracetamol", "delivery_address": "Test Delivery Address, Naigaon"
        },
    }
    
    try:
        data = sample_data.get(request.template)
        if not data:
            return {"success": False, "error": f"Unknown template: {request.template}", "available_templates": list(sample_data.keys())}
        
        # Dynamically dispatch to the appropriate WhatsApp sender
        send_fns = _deps.get("whatsapp_senders", {})
        send_fn = send_fns.get(request.template)
        if not send_fn:
            return {"success": False, "error": f"No handler for template: {request.template}"}
        
        result = await send_fn(phone=request.phone, db=db, **data)
        return {"success": result.get("success", False), "template": request.template, "phone": request.phone, "sample_data": data, "msg91_response": result}
    except Exception as e:
        logger.error(f"Test WhatsApp failed: {str(e)}")
        return {"success": False, "error": str(e)}


@router.get("/test/msg91-status")
async def check_msg91_status():
    test_msg91 = _deps.get("test_msg91_connection")
    if test_msg91:
        return await test_msg91()
    return {"status": "unavailable"}


# ============ SEND CREDENTIALS EMAIL ============

class CredentialsEmailRequest(BaseModel):
    email: str

@router.post("/test/send-credentials")
async def send_credentials_email(request: CredentialsEmailRequest):
    """Send all staff/doctor login credentials to the specified email."""
    import asyncio
    try:
        import resend as resend_lib
    except ImportError:
        return {"success": False, "error": "Resend library not installed"}
    
    import os
    api_key = os.environ.get("RESEND_API_KEY")
    sender_email = os.environ.get("SENDER_EMAIL", "Nevika Cura <noreply@nevikacura.com>")
    if not api_key:
        return {"success": False, "error": "Email not configured"}
    
    resend_lib.api_key = api_key
    app_url = "https://premium-rx-portal.preview.emergentagent.com"
    
    credentials_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); border-radius: 15px 15px 0 0;">
            <h1 style="color: white; margin: 0;">Nevika Cura - Login Credentials</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 15px 15px;">
            <p>All login credentials for the healthcare application at <a href="{app_url}">{app_url}</a></p>
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <tr style="background: #f1f5f9;"><th style="padding: 10px; border: 1px solid #e2e8f0;">Role</th><th style="padding: 10px; border: 1px solid #e2e8f0;">Username</th><th style="padding: 10px; border: 1px solid #e2e8f0;">Password</th></tr>
                <tr><td style="padding: 10px; border: 1px solid #e2e8f0;">DiaGyn Staff</td><td style="padding: 10px; border: 1px solid #e2e8f0;"><b>staff_diagyn</b></td><td style="padding: 10px; border: 1px solid #e2e8f0;"><b>test1234</b></td></tr>
                <tr><td style="padding: 10px; border: 1px solid #e2e8f0;">Orange Pharmacy Staff</td><td style="padding: 10px; border: 1px solid #e2e8f0;"><b>staff_orange</b></td><td style="padding: 10px; border: 1px solid #e2e8f0;"><b>test1234</b></td></tr>
                <tr><td style="padding: 10px; border: 1px solid #e2e8f0;">Mango Labs Staff</td><td style="padding: 10px; border: 1px solid #e2e8f0;"><b>staff_mango</b></td><td style="padding: 10px; border: 1px solid #e2e8f0;"><b>test1234</b></td></tr>
                <tr><td style="padding: 10px; border: 1px solid #e2e8f0;">Admin</td><td style="padding: 10px; border: 1px solid #e2e8f0;"><b>admin</b></td><td style="padding: 10px; border: 1px solid #e2e8f0;"><b>test1234</b></td></tr>
                <tr><td style="padding: 10px; border: 1px solid #e2e8f0;">Doctor</td><td style="padding: 10px; border: 1px solid #e2e8f0;"><b>dr_vikas</b></td><td style="padding: 10px; border: 1px solid #e2e8f0;"><b>test1234</b></td></tr>
            </table>
            <p>Staff Portal: <a href="{app_url}/staff">{app_url}/staff</a></p>
        </div>
    </div>
    """
    
    try:
        result = await asyncio.to_thread(resend_lib.Emails.send, {
            "from": sender_email, "to": request.email,
            "subject": "Nevika Cura - All Login Credentials",
            "html": credentials_html
        })
        logger.info(f"Credentials email sent to {request.email}")
        return {"success": True, "email_id": result.get('id'), "sent_to": request.email}
    except Exception as e:
        logger.error(f"Failed to send credentials email: {str(e)}")
        return {"success": False, "error": str(e)}
