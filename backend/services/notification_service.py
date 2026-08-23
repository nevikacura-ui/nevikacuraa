"""
Notification Service - Extracted from server.py
Handles all notification functions: WhatsApp, SMS, Email, Push Notifications
"""
import os
import json
import asyncio
import uuid
import random
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from database import get_db

logger = logging.getLogger(__name__)

# ============ Configuration ============
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
NOTIFICATION_EMAIL = os.environ.get('NOTIFICATION_EMAIL', 'nevikacura@gmail.com')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'Nevika Cura <onboarding@resend.dev>')

VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', '')
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '')
VAPID_CLAIMS_EMAIL = os.environ.get('VAPID_CLAIMS_EMAIL', 'nevikacura@gmail.com')

DOCTOR_WHATSAPP_NUMBERS = {
    "Dr. Neha Patel": "917045266466",
    "Dr. Vikas Jha": "919699409888"
}

STAFF_NOTIFICATION_NUMBERS = {
    "pushpa clinic": "918108500522",
    "pushpa": "918108500522",
    "amnion clinic": "918108500533",
    "amnion": "918108500533",
    "nevika cura": "919833188288",
    "nevika": "919833188288",
    "diagyn": "918108500522",
    "vasai": "918108500522",
    "naigaon": "918108500522",
    "mango health labs": "917039040040",
    "mango labs": "917039040040",
    "mango": "917039040040",
    "orange": "917039030030",
    "orange pharmacy": "917039030030",
    "ornave": "917039030030",
    "ornave pharmacy": "917039030030",
}

# Initialize Resend
try:
    import resend
    if RESEND_API_KEY:
        resend.api_key = RESEND_API_KEY
except ImportError:
    resend = None
    logger.warning("Resend not installed")

# Initialize webpush
try:
    from pywebpush import webpush, WebPushException
except ImportError:
    webpush = None
    WebPushException = Exception
    logger.warning("pywebpush not installed")


def _get_ist_helpers():
    """Lazy import IST helpers from server"""
    try:
        from services.ist_helpers import get_ist_now, get_ist_display_time
        return get_ist_now, get_ist_display_time
    except ImportError:
        from server import get_ist_now, get_ist_display_time
        return get_ist_now, get_ist_display_time


def _get_msg91_helpers():
    """Lazy import MSG91 WhatsApp helpers"""
    from services.msg91_whatsapp import (
        send_diagyn_appointment_confirmation, send_diagyn_appointment_reminder,
        send_proton_lab_confirmation, send_proton_report_ready,
        send_orange_pharmacy_confirmation, send_orange_order_delivered,
        send_orange_order_confirmed, send_orange_order_packed,
        send_orange_order_dispatched,
        send_mango_sample_collected, send_mango_processing, send_mango_reports_ready
    )
    return {
        'send_diagyn_appointment_confirmation': send_diagyn_appointment_confirmation,
        'send_diagyn_appointment_reminder': send_diagyn_appointment_reminder,
        'send_proton_lab_confirmation': send_proton_lab_confirmation,
        'send_proton_report_ready': send_proton_report_ready,
        'send_orange_pharmacy_confirmation': send_orange_pharmacy_confirmation,
        'send_orange_order_delivered': send_orange_order_delivered,
        'send_orange_order_confirmed': send_orange_order_confirmed,
        'send_orange_order_packed': send_orange_order_packed,
        'send_orange_order_dispatched': send_orange_order_dispatched,
        'send_mango_sample_collected': send_mango_sample_collected,
        'send_mango_processing': send_mango_processing,
        'send_mango_reports_ready': send_mango_reports_ready,
    }


# ============ WhatsApp / SMS Functions ============

async def send_whatsapp_notification(to_number: str, message: str):
    """WhatsApp notification - Uses MSG91"""
    logger.info(f"WhatsApp notification via MSG91: to={to_number}")
    return {"type": "msg91", "note": "Using MSG91 WhatsApp templates"}


async def send_sms_notification(to_number: str, message: str):
    """SMS notification - DISABLED (using WhatsApp instead)"""
    logger.info(f"SMS disabled - using WhatsApp instead: to={to_number}")
    return {"success": True, "note": "SMS disabled - WhatsApp used instead"}


async def send_staff_sms_notification(department: str, message: str):
    """DISABLED: Staff SMS notifications are now sent via WhatsApp/email"""
    logger.info(f"Staff SMS DISABLED - Use WhatsApp/email instead. Department: {department}")
    return {"success": True, "note": "Staff SMS disabled - WhatsApp/email used instead"}


async def notify_staff_new_appointment(appointment_details: dict):
    """Notify clinic staff about new ONLINE appointment via WhatsApp."""
    db = get_db()
    get_ist_now, _ = _get_ist_helpers()
    msg91 = _get_msg91_helpers()

    booking_type = appointment_details.get('booking_type', '').lower().strip()
    appointment_type = appointment_details.get('appointment_type', '').upper().strip()

    notification_log = {
        "id": str(uuid.uuid4()),
        "type": "staff_appointment_notification",
        "clinic": appointment_details.get('clinic', ''),
        "booking_id": appointment_details.get('booking_id', ''),
        "booking_type": booking_type,
        "appointment_type": appointment_type,
        "created_at": get_ist_now().isoformat(),
        "status": "pending"
    }

    if booking_type in ['walk_in', 'walkin', 'emergency'] or appointment_type in ['WALK-IN', 'WALK_IN', 'EMERGENCY']:
        logger.info(f"Skipping staff notification for {booking_type or appointment_type} appointment")
        notification_log["status"] = "skipped"
        notification_log["reason"] = "walk-in/emergency - staff already present"
        await db.staff_notification_logs.insert_one(notification_log)
        return {"success": True, "skipped": True, "reason": "walk-in/emergency appointments don't need staff notification"}

    clinic = appointment_details.get('clinic', '').lower().strip()
    staff_phone = None
    for key, phone in STAFF_NOTIFICATION_NUMBERS.items():
        if key in clinic:
            staff_phone = phone
            break

    if not staff_phone:
        logger.warning(f"No staff number configured for clinic: {clinic}")
        notification_log["status"] = "failed"
        notification_log["reason"] = "No staff number configured"
        await db.staff_notification_logs.insert_one(notification_log)
        return {"success": False, "error": "No staff number for clinic"}

    notification_log["staff_phone"] = staff_phone

    patient_name = appointment_details.get('patient_name', 'Patient')
    doctor = appointment_details.get('doctor', 'Doctor')
    date = appointment_details.get('date', '')
    time = appointment_details.get('time', '')
    booking_id = appointment_details.get('booking_id', '')
    patient_phone = appointment_details.get('patient_phone', 'Not provided')

    try:
        result = await msg91['send_diagyn_appointment_confirmation'](
            phone=staff_phone,
            patient_name=patient_name,
            date=date, time=time,
            doctor_name=doctor,
            clinic_name=appointment_details.get('clinic', 'DiaGyn Clinic'),
            booking_id=f"STAFF | #{booking_id} | Ph: {patient_phone[-4:] if len(patient_phone) >= 4 else patient_phone}",
            db=db
        )
        logger.info(f"Staff notification sent to {staff_phone} for booking {booking_id}")
        return result
    except Exception as e:
        logger.error(f"Staff notification failed: {e}")
        return {"success": False, "error": str(e)}


async def notify_staff_new_signup(user_details: dict):
    """Notify staff about new user signup via WhatsApp"""
    logger.info(f"Staff notification: New signup - {user_details.get('name')}")
    return {"success": True, "method": "whatsapp"}


async def notify_staff_new_order(order_details: dict, department: str):
    """Notify staff about new order via WhatsApp"""
    db = get_db()
    msg91 = _get_msg91_helpers()

    department_phones = {
        "proton": "917039040040", "mango": "917039040040", "mango_labs": "917039040040",
        "orange": "917039030030", "orange_pharmacy": "917039030030",
        "ornave": "917039030030", "pharmacy": "917039030030",
    }

    staff_phone = department_phones.get(department.lower().strip())
    if not staff_phone:
        logger.warning(f"No staff number configured for department: {department}")
        return {"success": False, "error": "No staff number for department"}

    try:
        if department.lower() in ["proton", "mango", "mango_labs"]:
            result = await msg91['send_proton_lab_confirmation'](
                phone=staff_phone,
                patient_name=order_details.get('patient_name', 'Patient'),
                tests=order_details.get('test_name', order_details.get('tests', 'Tests')),
                preferred_date=order_details.get('preferred_date', 'TBD'),
                preferred_time=order_details.get('preferred_time', 'TBD'),
                booking_id=f"STAFF | {str(order_details.get('id', ''))[:8]} | Ph: {str(order_details.get('patient_phone', ''))[-4:]}",
                address=order_details.get('address', 'See order details'),
                db=db
            )
        else:
            items_list = order_details.get('medicines', [])
            items_str = ", ".join([m.get('name', str(m)) if isinstance(m, dict) else str(m) for m in items_list[:3]])[:80] if items_list else order_details.get('test_name', 'Order items')
            result = await msg91['send_orange_pharmacy_confirmation'](
                phone=staff_phone,
                patient_name=order_details.get('patient_name', 'Patient'),
                order_id=f"STAFF | {str(order_details.get('id', ''))[:8]} | Ph: {str(order_details.get('patient_phone', ''))[-4:]}",
                items=items_str,
                delivery_address=order_details.get('address', 'See order details'),
                db=db
            )
        logger.info(f"Staff notification sent to {staff_phone} for {department} order")
        return result
    except Exception as e:
        logger.error(f"Staff order notification failed: {e}")
        return {"success": False, "error": str(e)}


async def send_appointment_sms(patient_phone: str, appointment_details: dict):
    """Send appointment confirmation - Uses WhatsApp via MSG91"""
    db = get_db()
    msg91 = _get_msg91_helpers()
    try:
        result = await msg91['send_diagyn_appointment_confirmation'](
            phone=patient_phone,
            patient_name=appointment_details.get('patient_name', 'Patient'),
            date=appointment_details.get('date', ''),
            time=appointment_details.get('time', ''),
            doctor_name=appointment_details.get('doctor', appointment_details.get('doctor_name', 'Doctor')),
            clinic_name=appointment_details.get('clinic', 'DiaGyn Clinic'),
            booking_id=str(appointment_details.get('booking_id', appointment_details.get('id', '')))[:8],
            db=db
        )
        return result
    except Exception as e:
        logger.error(f"WhatsApp appointment confirmation failed: {e}")
        return {"success": False, "error": str(e)}


async def send_appointment_reminder_sms(patient_phone: str, appointment_details: dict):
    """Send appointment reminder - Uses WhatsApp via MSG91"""
    db = get_db()
    msg91 = _get_msg91_helpers()
    try:
        result = await msg91['send_diagyn_appointment_reminder'](
            phone=patient_phone,
            patient_name=appointment_details.get('patient_name', 'Patient'),
            date=appointment_details.get('date', ''),
            time=appointment_details.get('time', ''),
            doctor_name=appointment_details.get('doctor', appointment_details.get('doctor_name', 'Doctor')),
            clinic_name=appointment_details.get('clinic', 'DiaGyn Clinic'),
            booking_id=str(appointment_details.get('booking_id', appointment_details.get('id', '')))[:8],
            db=db
        )
        return result
    except Exception as e:
        logger.error(f"WhatsApp reminder failed: {e}")
        return {"success": False, "error": str(e)}


async def send_test_booking_sms(patient_phone: str, test_details: dict):
    """Send lab test booking confirmation - Uses WhatsApp via MSG91"""
    db = get_db()
    msg91 = _get_msg91_helpers()
    try:
        tests_str = ", ".join(test_details.get('tests', ['Lab Test']))[:50] if isinstance(test_details.get('tests'), list) else str(test_details.get('tests', 'Lab Test'))[:50]
        result = await msg91['send_proton_lab_confirmation'](
            phone=patient_phone,
            patient_name=test_details.get('patient_name', 'Patient'),
            tests=tests_str,
            preferred_date=test_details.get('date', ''),
            preferred_time=test_details.get('time', ''),
            booking_id=str(test_details.get('booking_id', test_details.get('id', '')))[:8],
            address=test_details.get('address', 'Home Collection'),
            db=db
        )
        return result
    except Exception as e:
        logger.error(f"WhatsApp lab booking failed: {e}")
        return {"success": False, "error": str(e)}


async def send_report_ready_sms(patient_phone: str, report_details: dict):
    """Send report ready notification - Uses WhatsApp via MSG91"""
    db = get_db()
    msg91 = _get_msg91_helpers()
    try:
        tests_str = ", ".join(report_details.get('tests', ['Lab Test']))[:50] if isinstance(report_details.get('tests'), list) else str(report_details.get('tests', 'Lab Test'))[:50]
        result = await msg91['send_proton_report_ready'](
            phone=patient_phone,
            patient_name=report_details.get('patient_name', 'Patient'),
            tests=tests_str,
            booking_id=str(report_details.get('booking_id', report_details.get('id', '')))[:8],
            report_date=report_details.get('date', ''),
            download_url=report_details.get('download_url', report_details.get('report_url', '')),
            db=db
        )
        return result
    except Exception as e:
        logger.error(f"WhatsApp report ready failed: {e}")
        return {"success": False, "error": str(e)}


async def send_medicine_order_sms(patient_phone: str, order_details: dict):
    """Send medicine order confirmation - Uses WhatsApp via MSG91"""
    db = get_db()
    msg91 = _get_msg91_helpers()
    try:
        items_str = ", ".join([item.get('name', '') for item in order_details.get('items', [])])[:50] if order_details.get('items') else 'Medicines'
        result = await msg91['send_orange_pharmacy_confirmation'](
            phone=patient_phone,
            patient_name=order_details.get('patient_name', order_details.get('name', 'Customer')),
            order_id=str(order_details.get('order_id', order_details.get('id', '')))[:8],
            items=items_str,
            delivery_address=order_details.get('address', order_details.get('delivery_address', '')),
            db=db
        )
        return result
    except Exception as e:
        logger.error(f"WhatsApp pharmacy order failed: {e}")
        return {"success": False, "error": str(e)}


async def send_medicine_delivered_sms(patient_phone: str, order_details: dict):
    """Send medicine delivered notification - Uses WhatsApp via MSG91"""
    db = get_db()
    msg91 = _get_msg91_helpers()
    _, get_ist_display_time = _get_ist_helpers()
    try:
        result = await msg91['send_orange_order_delivered'](
            phone=patient_phone,
            patient_name=order_details.get('patient_name', order_details.get('name', 'Customer')),
            order_id=str(order_details.get('order_id', order_details.get('id', '')))[:8],
            delivered_time=get_ist_display_time(),
            invoice_url=order_details.get('invoice_url', ''),
            db=db
        )
        return result
    except Exception as e:
        logger.error(f"WhatsApp delivery notification failed: {e}")
        return {"success": False, "error": str(e)}


async def send_pharmacy_order_sms(patient_phone: str, order_details: dict):
    """Send pharmacy order confirmation - Uses WhatsApp via MSG91"""
    return await send_medicine_order_sms(patient_phone, order_details)


async def send_pharmacy_status_sms(patient_phone: str, order_id: str, status: str, order_data: dict = None, db=None):
    """Send pharmacy status update - Uses WhatsApp via MSG91 templates"""
    msg91 = _get_msg91_helpers()
    logger.info(f"WhatsApp status update: Order {order_id} - {status}")
    if not order_data:
        order_data = {}
    patient_name = order_data.get("patient_name", "Customer")

    try:
        if status == "confirmed" or status == "Order Booked":
            items = ", ".join([m.get("name", "") for m in order_data.get("medicines", [])])[:100]
            result = await msg91['send_orange_order_confirmed'](
                phone=patient_phone, patient_name=patient_name, order_id=order_id,
                items=items or "Your medicines",
                estimated_time=order_data.get("estimated_time", "Today"), db=db
            )
        elif status == "packing":
            total = order_data.get("total", 0)
            payment_method = order_data.get("payment_method", "cod")
            payment_display = "Cash on Delivery" if payment_method == "cod" else "Paid" if order_data.get("payment_status") == "PAID" else "Pay via Link"
            result = await msg91['send_orange_order_packed'](
                phone=patient_phone, patient_name=patient_name, order_id=order_id,
                total_amount=f"₹{total}" if total else "To be confirmed",
                payment_status=payment_display, db=db
            )
        elif status == "out_for_delivery":
            result = await msg91['send_orange_order_dispatched'](
                phone=patient_phone, patient_name=patient_name, order_id=order_id,
                delivery_partner=order_data.get("delivery_partner", "Our delivery team"),
                estimated_arrival=order_data.get("eta", "30-45 mins"),
                contact_number=order_data.get("delivery_contact", "Our team will contact you"), db=db
            )
        elif status in ["Delivered", "delivered"]:
            result = await msg91['send_orange_order_delivered'](
                phone=patient_phone, patient_name=patient_name, order_id=order_id,
                delivered_time=datetime.now().strftime("%I:%M %p"),
                invoice_url=order_data.get("invoice_url", f"nevikacura.com/track?order={order_id}"), db=db
            )
        else:
            logger.info(f"No WhatsApp template for status: {status}")
            return {"success": True, "note": f"No template for status: {status}"}
        return result
    except Exception as e:
        logger.error(f"Failed to send pharmacy status WhatsApp: {e}")
        return {"success": False, "error": str(e)}


async def send_diagnostic_order_sms(patient_phone: str, order_details: dict):
    """Send diagnostic test booking - Uses WhatsApp via MSG91"""
    return await send_test_booking_sms(patient_phone, order_details)


async def send_diagnostic_status_sms(patient_phone: str, order_id: str, status: str, order_data: dict = None, db=None):
    """Send diagnostic status update - Uses WhatsApp via MSG91 templates"""
    msg91 = _get_msg91_helpers()
    logger.info(f"WhatsApp diagnostic status: {order_id} - {status}")
    if not order_data:
        order_data = {}
    patient_name = order_data.get("patient_name", "Customer")
    tests = ", ".join(order_data.get("tests", []))[:100] or "Your tests"

    try:
        if status in ["sample_collected", "Sample Collected"]:
            result = await msg91['send_mango_sample_collected'](
                phone=patient_phone, patient_name=patient_name, booking_id=order_id,
                tests=tests, collected_by=order_data.get("collected_by", "Our phlebotomist"),
                collection_time=datetime.now().strftime("%I:%M %p"), db=db
            )
        elif status in ["processing", "In Process"]:
            result = await msg91['send_mango_processing'](
                phone=patient_phone, patient_name=patient_name, booking_id=order_id,
                tests=tests, expected_time=order_data.get("expected_time", "Within 6-24 hours"), db=db
            )
        elif status in ["reports_ready", "Reports Generated"]:
            result = await msg91['send_mango_reports_ready'](
                phone=patient_phone, patient_name=patient_name, booking_id=order_id,
                tests=tests, report_url=order_data.get("report_url", f"nevikacura.com/report/{order_id}"), db=db
            )
        else:
            logger.info(f"No WhatsApp template for diagnostic status: {status}")
            return {"success": True, "note": f"No template for status: {status}"}
        return result
    except Exception as e:
        logger.error(f"Failed to send diagnostic status WhatsApp: {e}")
        return {"success": False, "error": str(e)}


# ============ Email Notifications ============

async def send_order_status_email(patient_email, patient_name, order_id, order_type, status, order_data=None):
    """Send premium HTML email for order status updates using brand illustrations"""
    if not patient_email or not RESEND_API_KEY:
        return {"success": False, "reason": "No email or API key"}
    order_data = order_data or {}

    # Use premium templates for Orange Pharmacy statuses
    if order_type == "pharmacy" and status in ("packing", "out_for_delivery", "delivered"):
        try:
            from services.email_templates import pharmacy_packing_email, pharmacy_out_for_delivery_email, pharmacy_delivered_email
            items = order_data.get("items", [])
            total = order_data.get("total_amount") or order_data.get("total") or ""
            if total and not str(total).startswith("₹"):
                total = f"₹{total}"

            if status == "packing":
                email_html = pharmacy_packing_email(patient_name, order_id, items, total)
                subject = f"Your order is being packed - {order_id}"
            elif status == "out_for_delivery":
                eta = order_data.get("estimated_delivery", "30-60 mins")
                addr = order_data.get("delivery_address", "")
                email_html = pharmacy_out_for_delivery_email(patient_name, order_id, eta, addr)
                subject = f"Your order is on the way! - {order_id}"
            else:
                email_html = pharmacy_delivered_email(patient_name, order_id, items, total)
                subject = f"Order delivered! - {order_id}"

            result = await asyncio.to_thread(resend.Emails.send, {
                "from": SENDER_EMAIL, "to": [patient_email],
                "subject": subject, "html": email_html
            })
            logger.info(f"Premium pharmacy status email sent: {order_id} -> {status}")
            return {"success": True, "email_id": result.get('id')}
        except Exception as e:
            logger.error(f"Failed to send premium pharmacy email, falling back: {e}")

    # Use premium templates for Mango Labs statuses
    if order_type == "lab" and status in ("sample_collected", "in_process", "report_generated"):
        try:
            from services.email_templates import mango_sample_collected_email, mango_in_process_email, mango_report_ready_email
            tests = order_data.get("tests", order_data.get("items", []))
            if tests and isinstance(tests[0], dict):
                tests = [t.get("name", str(t)) for t in tests]

            if status == "sample_collected":
                email_html = mango_sample_collected_email(patient_name, order_id, tests, order_data.get("preferred_date", ""))
                subject = f"Sample collected! - {order_id}"
            elif status == "in_process":
                email_html = mango_in_process_email(patient_name, order_id, tests)
                subject = f"Your tests are in progress - {order_id}"
            else:
                email_html = mango_report_ready_email(patient_name, order_id, tests)
                subject = f"Reports ready! - {order_id}"

            result = await asyncio.to_thread(resend.Emails.send, {
                "from": SENDER_EMAIL, "to": [patient_email],
                "subject": subject, "html": email_html
            })
            logger.info(f"Premium mango status email sent: {order_id} -> {status}")
            return {"success": True, "email_id": result.get('id')}
        except Exception as e:
            logger.error(f"Failed to send premium mango email, falling back: {e}")

    # Fallback / Mango Labs statuses (legacy template)
    STATUS_CONFIG = {
        'out_for_delivery': {'title': 'Your Order is On the Way!', 'subtitle': 'Our delivery partner is heading to you', 'color': '#3B82F6', 'icon': '🚚', 'message': 'Your order has been dispatched.', 'cta_text': 'Track Your Order'},
        'delivered': {'title': 'Order Delivered!', 'subtitle': 'Thank you for ordering with us', 'color': '#22C55E', 'icon': '✅', 'message': 'Your order has been successfully delivered.', 'cta_text': 'Rate Your Experience'},
        'packing': {'title': 'Order Being Packed', 'subtitle': 'We\'re preparing your order', 'color': '#8B5CF6', 'icon': '📦', 'message': 'Our team is carefully packing your medicines.', 'cta_text': 'View Order Details'},
        'sample_collected': {'title': 'Sample Collected!', 'subtitle': 'Your sample is on its way', 'color': '#22C55E', 'icon': '🧪', 'message': 'Our phlebotomist has collected your sample.', 'cta_text': 'View Booking Details'},
        'in_process': {'title': 'Tests in Progress', 'subtitle': 'Your samples are being analyzed', 'color': '#8B5CF6', 'icon': '🔬', 'message': 'Our lab technicians are running your tests.', 'cta_text': 'Check Status'},
        'report_generated': {'title': 'Reports Ready!', 'subtitle': 'Your test results are available', 'color': '#22C55E', 'icon': '📋', 'message': 'Your test reports are ready.', 'cta_text': 'View Reports'},
        'completed': {'title': 'Booking Completed', 'subtitle': 'Thank you for choosing us', 'color': '#22C55E', 'icon': '✅', 'message': 'Your booking has been completed.', 'cta_text': 'Book Again'}
    }

    config = STATUS_CONFIG.get(status, {'title': f'Order Update: {status.replace("_", " ").title()}', 'subtitle': 'Status updated', 'color': '#6B7280', 'icon': '📌', 'message': f'Status: {status}', 'cta_text': 'View Order'})
    brand_color = '#EA580C' if order_type == 'pharmacy' else '#22C55E'
    brand_name = 'Orange Pharmacy' if order_type == 'pharmacy' else 'Mango Health Labs'

    email_html = f'''<html><body style="font-family: Arial; margin: 0; padding: 0; background: #F3F4F6;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, {brand_color}, {config['color']}); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
    <div style="font-size: 48px;">{config['icon']}</div>
    <h1 style="color: white; margin: 0;">{config['title']}</h1>
    <p style="color: rgba(255,255,255,0.9);">{config['subtitle']}</p>
    </div>
    <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px;">
    <p>Hi <strong>{patient_name}</strong>,</p>
    <p>{config['message']}</p>
    <div style="background: #F9FAFB; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
    <p style="margin: 0 0 5px 0; color: #6B7280; font-size: 12px;">Order ID</p>
    <p style="margin: 0; color: {brand_color}; font-size: 24px; font-weight: bold;">{order_id}</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
    <a href="https://nevikacura.com/track?order={order_id}" style="background: {brand_color}; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none;">{config['cta_text']}</a>
    </div>
    <div style="border-top: 1px solid #E5E7EB; padding-top: 20px; text-align: center;">
    <p style="color: #6B7280; font-size: 14px;">Need help? Call <a href="tel:7039030030" style="color: {brand_color};">7039030030</a></p>
    <p style="color: #9CA3AF; font-size: 12px;">{brand_name} - Nevika Cura</p>
    </div></div></div></body></html>'''

    try:
        result = await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL, "to": [patient_email],
            "subject": f"{config['icon']} {config['title']} - {order_id}",
            "html": email_html
        })
        logger.info(f"Order status email sent: {order_id} -> {status}")
        return {"success": True, "email_id": result.get('id')}
    except Exception as e:
        logger.error(f"Failed to send order status email: {e}")
        return {"success": False, "error": str(e)}


async def notify_doctor_whatsapp(doctor_name: str, appointment_details: dict, booking_type: str = "walk_in"):
    """Send WhatsApp notification to doctor about new appointment"""
    # Try exact match first, then partial/case-insensitive match
    doctor_number = DOCTOR_WHATSAPP_NUMBERS.get(doctor_name)
    if not doctor_number:
        doctor_lower = doctor_name.lower().strip()
        for key, phone in DOCTOR_WHATSAPP_NUMBERS.items():
            if key.lower() in doctor_lower or doctor_lower in key.lower():
                doctor_number = phone
                break
    if not doctor_number:
        logger.warning(f"No WhatsApp number configured for {doctor_name}")
        return None
    appointment_type = "EMERGENCY" if appointment_details.get("appointment_type") == "EMERGENCY" else "Walk-in"
    time_info = appointment_details.get("time") or "No time slot (Emergency)"
    message = f"New Appointment: {appointment_type}\nDoctor: {doctor_name}\nClinic: {appointment_details.get('clinic', 'N/A')}\nDate: {appointment_details.get('date', 'N/A')}\nTime: {time_info}\nPatient: {appointment_details.get('patient_name', 'N/A')}\nPhone: {appointment_details.get('patient_phone', 'N/A')}"
    return await send_whatsapp_notification(doctor_number, message)


async def send_email_notification(subject, html_content, patient_email=None, patient_subject=None, patient_html=None, attachments=None):
    """Send email notification using Resend"""
    if not RESEND_API_KEY:
        logger.warning("Resend API key not configured")
        return None
    # Sanitize subjects — Resend rejects \n in subject
    subject = subject.replace('\n', ' ').replace('\r', ' ').strip()
    if patient_subject:
        patient_subject = patient_subject.replace('\n', ' ').replace('\r', ' ').strip()
    results = []
    try:
        params = {"from": SENDER_EMAIL, "to": [NOTIFICATION_EMAIL], "subject": subject, "html": html_content}
        email = await asyncio.to_thread(resend.Emails.send, params)
        results.append({"admin": email})
    except Exception as e:
        logger.error(f"Failed to send admin email: {e}")
        results.append({"admin": None})
    if patient_email:
        await asyncio.sleep(0.6)
        try:
            patient_params = {"from": SENDER_EMAIL, "to": [patient_email], "subject": patient_subject or subject, "html": patient_html or html_content}
            if attachments:
                patient_params["attachments"] = attachments
            patient_result = await asyncio.to_thread(resend.Emails.send, patient_params)
            results.append({"patient": patient_result})
        except Exception as e:
            logger.error(f"Failed to send patient email: {e}")
            results.append({"patient": None})
    return results


# ============ Email OTP ============

async def send_email_otp(email: str) -> dict:
    """Send OTP via Email for authentication"""
    db = get_db()
    if not RESEND_API_KEY:
        return {"success": False, "error": "Email service not configured"}
    otp = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    otp_key = f"email_{email}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    await db.otp_storage.update_one(
        {"key": otp_key},
        {"$set": {"key": otp_key, "otp": otp, "expires_at": expires_at.isoformat(), "attempts": 0, "verified": False, "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )

    email_html = f'''<div style="font-family: Arial; max-width: 500px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #14b8a6, #0891b2); border-radius: 10px;">
    <h1 style="color: white; margin: 0;">Nevika Cura</h1></div>
    <div style="padding: 30px; background: #f8fafc; text-align: center;">
    <h2 style="color: #1e293b;">Your Verification Code</h2>
    <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
    <p style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #14b8a6; margin: 0;">{otp}</p>
    </div><p style="color: #64748b;">This code expires in 10 minutes.</p></div></div>'''

    try:
        result = await asyncio.to_thread(resend.Emails.send, {"from": SENDER_EMAIL, "to": [email], "subject": f"Your Nevika Cura Verification Code: {otp}", "html": email_html})
        return {"success": True}
    except Exception as e:
        logger.error(f"Failed to send email OTP: {e}")
        return {"success": False, "error": str(e)}


async def verify_email_otp(email: str, otp: str) -> dict:
    """Verify Email OTP from MongoDB"""
    db = get_db()
    otp_key = f"email_{email}"
    stored = await db.otp_storage.find_one({"key": otp_key}, {"_id": 0})
    if not stored:
        return {"success": False, "error": "No OTP found. Please request a new one."}
    expires_at = datetime.fromisoformat(stored["expires_at"].replace("Z", "+00:00")) if isinstance(stored["expires_at"], str) else stored["expires_at"]
    if datetime.now(timezone.utc) > expires_at:
        await db.otp_storage.delete_one({"key": otp_key})
        return {"success": False, "error": "OTP expired. Please request a new one."}
    attempts = stored.get("attempts", 0) + 1
    if attempts > 5:
        await db.otp_storage.delete_one({"key": otp_key})
        return {"success": False, "error": "Too many attempts. Please request a new OTP."}
    await db.otp_storage.update_one({"key": otp_key}, {"$set": {"attempts": attempts}})
    if stored["otp"] == otp:
        verification_token = str(uuid.uuid4())
        await db.otp_storage.update_one({"key": otp_key}, {"$set": {"verified": True, "verification_token": verification_token, "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()}})
        return {"success": True, "verified": True, "verification_token": verification_token}
    return {"success": False, "error": "Invalid OTP"}


# ============ Push Notifications ============

async def send_push_notification(user_id=None, title="", body="", url="/", tag=None):
    """Send push notification to subscribed users"""
    db = get_db()
    if not VAPID_PUBLIC_KEY or not VAPID_PRIVATE_KEY:
        return None
    try:
        query = {"user_id": user_id} if user_id else {}
        subscriptions = await db.push_subscriptions.find(query, {"_id": 0}).to_list(1000)
        if not subscriptions:
            return {"sent": 0, "failed": 0}
        sent_count = 0
        failed_count = 0
        payload = json.dumps({"title": title, "body": body, "icon": "/icons/icon-192x192.png", "badge": "/icons/icon-72x72.png", "url": url, "tag": tag or f"nevika-{datetime.now().timestamp()}"})
        vapid_claims = {"sub": f"mailto:{VAPID_CLAIMS_EMAIL}"}
        for sub in subscriptions:
            try:
                webpush(subscription_info={"endpoint": sub["endpoint"], "keys": sub["keys"]}, data=payload, vapid_private_key=VAPID_PRIVATE_KEY, vapid_claims=vapid_claims)
                sent_count += 1
            except WebPushException as e:
                if hasattr(e, 'response') and e.response and e.response.status_code in [404, 410]:
                    await db.push_subscriptions.delete_one({"endpoint": sub["endpoint"]})
                failed_count += 1
            except Exception:
                failed_count += 1
        return {"sent": sent_count, "failed": failed_count}
    except Exception as e:
        logger.error(f"Push notifications failed: {e}")
        return None


async def broadcast_push_notification(title, body, url="/", tag=None):
    """Send push notification to all subscribed users"""
    return await send_push_notification(user_id=None, title=title, body=body, url=url, tag=tag)


async def send_push_to_staff(portal_types, title, body, url="/", tag=None, clinic=None):
    """Send push notification to staff/doctors by portal type"""
    db = get_db()
    if not VAPID_PUBLIC_KEY or not VAPID_PRIVATE_KEY:
        return {"sent": 0, "failed": 0, "reason": "VAPID not configured"}
    try:
        query = {"portal_type": {"$in": portal_types}}
        if clinic:
            query["clinic"] = {"$regex": clinic, "$options": "i"}
        subscriptions = await db.push_subscriptions.find(query, {"_id": 0}).to_list(500)
        if not subscriptions:
            return {"sent": 0, "failed": 0}
        sent_count = 0
        failed_count = 0
        payload = json.dumps({"title": title, "body": body, "icon": "/icons/icon-192x192.png", "badge": "/icons/icon-72x72.png", "url": url, "tag": tag or f"staff-notification-{datetime.now().timestamp()}", "requireInteraction": True, "vibrate": [200, 100, 200]})
        vapid_claims = {"sub": f"mailto:{VAPID_CLAIMS_EMAIL}"}
        for sub in subscriptions:
            try:
                webpush(subscription_info={"endpoint": sub["endpoint"], "keys": sub["keys"]}, data=payload, vapid_private_key=VAPID_PRIVATE_KEY, vapid_claims=vapid_claims)
                sent_count += 1
            except WebPushException as e:
                if hasattr(e, 'response') and e.response and e.response.status_code in [404, 410]:
                    await db.push_subscriptions.delete_one({"endpoint": sub["endpoint"]})
                failed_count += 1
            except Exception:
                failed_count += 1
        return {"sent": sent_count, "failed": failed_count}
    except Exception as e:
        logger.error(f"Staff push notifications failed: {e}")
        return {"sent": 0, "failed": 0, "error": str(e)}
