"""Booking Utilities - Extracted from server.py
Booking ID generation used across multiple routes.
"""
from datetime import datetime, timezone
import random
import logging

logger = logging.getLogger(__name__)

_db = None


def set_db(database):
    global _db
    _db = database


def _get_prefix(service: str, source: str) -> str:
    """
    Generate booking code prefix.
    Service: diagyn, mango, orange
    Source: web, whatsapp, clinic (walk-in/emergency)
    """
    service_map = {
        "diagyn": "DG",
        "mango": "MG",
        "orange": "OR",
    }

    source_map = {
        "web": "O",
        "website": "O",
        "online": "O",
        "whatsapp": "W",
        "clinic": "C",
        "walkin": "C",
        "walk_in": "C",
        "walk-in": "C",
        "emergency": "C",
        "staff": "C",
    }

    svc = service_map.get(service.lower().strip(), "NC")
    src = source_map.get(source.lower().strip(), "O")
    return f"{svc}{src}"


async def generate_booking_id(service: str = "diagyn", source: str = "web", db_instance=None) -> str:
    """
    Generate unique booking ID in format: PREFIX-DDMMYY-XXXX
    Examples: DGO-040626-1234, DGC-050426-5678, MGO-040626-9012, ORO-040626-3456
    The 4-digit code is random and also serves as verification code.
    """
    db_ref = db_instance if db_instance is not None else _db

    prefix = _get_prefix(service, source)
    today = datetime.now(timezone.utc)
    date_str = today.strftime("%d%m%y")

    max_attempts = 100
    for _ in range(max_attempts):
        code = str(random.randint(1000, 9999))
        booking_id = f"{prefix}-{date_str}-{code}"

        existing = None
        if db_ref is not None:
            existing = await db_ref.appointments.find_one({"booking_id": booking_id})
            if not existing:
                existing = await db_ref.pharmacy_orders.find_one({"booking_id": booking_id})
            if not existing:
                existing = await db_ref.diagnostic_orders.find_one({"booking_id": booking_id})

        if not existing:
            return booking_id

    # Fallback
    code = str(random.randint(1000, 9999))
    return f"{prefix}-{date_str}-{code}"


def generate_booking_email_template(booking_id: str, booking_type: str, details: dict) -> str:
    """Legacy unified email template. Returns tuple of (html_content, None)."""
    type_configs = {
        "appointment": {"color": "#0d9488", "icon": "📅", "title": "Appointment Confirmed"},
        "lab_test": {"color": "#8b5cf6", "icon": "🔬", "title": "Lab Test Booked"},
        "medicine_order": {"color": "#f97316", "icon": "💊", "title": "Medicine Order Confirmed"},
        "report_ready": {"color": "#22c55e", "icon": "📋", "title": "Report Ready"},
    }

    config = type_configs.get(booking_type, {"color": "#0d9488", "icon": "✓", "title": "Booking Confirmed"})

    details_rows = ""
    for key, value in details.items():
        if key not in ['patient_name', 'patient_email', 'patient_phone'] and value:
            label = key.replace('_', ' ').title()
            details_rows += f'<tr><td style="padding: 8px 0; color: #64748b;">{label}</td><td style="padding: 8px 0; font-weight: 600;">{value}</td></tr>'

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, {config['color']} 0%, {config['color']}cc 100%); border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">{config['icon']} {config['title']}</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px;">Hello <strong>{details.get('patient_name', 'Patient')}</strong>,</p>
            <div style="text-align: center; margin: 25px 0; padding: 25px; background: white; border-radius: 12px; border: 2px solid {config['color']};">
                <p style="margin: 0 0 5px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Your Booking ID</p>
                <p style="margin: 0; color: {config['color']}; font-size: 32px; font-weight: bold; letter-spacing: 4px; font-family: monospace;">{booking_id}</p>
                <p style="margin: 15px 0 0 0; color: #94a3b8; font-size: 11px;">Show this ID at the reception for quick check-in</p>
            </div>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid {config['color']};">
                <h3 style="color: {config['color']}; margin-top: 0;">Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    {details_rows}
                </table>
            </div>
            <div style="text-align: center; margin-top: 30px; padding: 15px; background: #f1f5f9; border-radius: 8px;">
                <p style="margin: 0; color: #475569;"><strong>Need help?</strong></p>
                <p style="margin: 5px 0 0 0; color: {config['color']}; font-size: 18px; font-weight: bold;">7039020020</p>
            </div>
        </div>
    </div>
    """

    return html, None
