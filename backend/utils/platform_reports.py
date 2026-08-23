"""
Platform Analytics Report — Daily and Weekly automated email reports.
Aggregates users, appointments, orders, engagement metrics from MongoDB.
Sends via Resend to nevikacura@gmail.com.
"""

import os
import asyncio
import logging
import resend
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

REPORT_EMAIL = "nevikacura@gmail.com"
SENDER = "Nevika Cura <reports@nevikacura.com>"

db = None

def set_db(database):
    global db
    db = database


async def gather_platform_stats(days=1):
    """Gather all platform metrics for a given period"""
    if db is None:
        return {}

    now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
    cutoff = (now - timedelta(days=days)).isoformat()
    cutoff_date = (now - timedelta(days=days)).strftime("%Y-%m-%d")
    today_str = now.strftime("%Y-%m-%d")

    stats = {}

    try:
        # ──── Users & Registrations ────
        stats["total_users"] = await db.users.count_documents({})
        stats["total_registered"] = await db.registered_users.count_documents({})
        stats["new_users_period"] = await db.users.count_documents({"created_at": {"$gte": cutoff}})

        # Unique phones
        phones = set()
        async for u in db.users.find({"phone": {"$exists": True, "$ne": None}}, {"phone": 1, "_id": 0}):
            if u.get("phone"):
                phones.add(u["phone"])
        stats["unique_phones"] = len(phones)

        # Unique emails
        emails = set()
        async for u in db.users.find({"email": {"$exists": True, "$ne": None}}, {"email": 1, "_id": 0}):
            if u.get("email"):
                emails.add(u["email"])
        stats["unique_emails"] = len(emails)

        # ──── OTP & WhatsApp Logs ────
        stats["total_otp_sent"] = await db.otp_logs.count_documents({})
        stats["otp_sent_period"] = await db.otp_logs.count_documents({"created_at": {"$gte": cutoff}})
        stats["total_whatsapp_logs"] = await db.whatsapp_logs.count_documents({})
        stats["whatsapp_period"] = await db.whatsapp_logs.count_documents({"created_at": {"$gte": cutoff}})

        # ──── Appointments ────
        stats["total_appointments"] = await db.appointments.count_documents({})
        stats["appointments_period"] = await db.appointments.count_documents({"created_at": {"$gte": cutoff}})
        stats["appointments_booked"] = await db.appointments.count_documents({"status": "Booked"})
        stats["appointments_completed"] = await db.appointments.count_documents({"status": "Completed"})
        stats["appointments_cancelled"] = await db.appointments.count_documents({"status": {"$in": ["Cancelled", "cancelled"]}})
        stats["voice_bookings"] = await db.appointments.count_documents({"source": "voice_booking"})

        # By doctor
        doc_pipeline = [
            {"$group": {"_id": "$doctor", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}, {"$limit": 5}
        ]
        stats["by_doctor"] = []
        async for d in db.appointments.aggregate(doc_pipeline):
            stats["by_doctor"].append({"doctor": d["_id"] or "Unknown", "count": d["count"]})

        # ──── Diagnostic Orders (Mango Labs) ────
        stats["total_diagnostic_orders"] = await db.diagnostic_orders.count_documents({})
        stats["diagnostic_period"] = await db.diagnostic_orders.count_documents({"created_at": {"$gte": cutoff}})

        # ──── Pharmacy Orders (Orange) ────
        stats["total_pharmacy_orders"] = await db.pharmacy_orders.count_documents({})
        stats["pharmacy_period"] = await db.pharmacy_orders.count_documents({"created_at": {"$gte": cutoff}})

        # ──── Payments ────
        stats["total_payments"] = await db.cashfree_orders.count_documents({})
        stats["payments_paid"] = await db.cashfree_orders.count_documents({"status": {"$in": ["PAID", "paid", "completed"]}})

        revenue_pipeline = [
            {"$match": {"status": {"$in": ["PAID", "paid", "completed"]}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        rev = await db.cashfree_orders.aggregate(revenue_pipeline).to_list(1)
        stats["total_revenue"] = rev[0]["total"] if rev and rev[0].get("total") else 0

        # ──── Engagement ────
        stats["fcm_tokens"] = await db.fcm_tokens.count_documents({})
        stats["medicine_reminders"] = await db.medicine_reminders.count_documents({})
        stats["family_members"] = await db.family_members.count_documents({})
        stats["sos_events"] = await db.sos_events.count_documents({})

        # ──── CuraCoins ────
        coin_pipeline = [
            {"$group": {"_id": None, "total_earned": {"$sum": "$total_earned"}, "total_redeemed": {"$sum": "$total_redeemed"}}}
        ]
        coins = await db.curacoins.aggregate(coin_pipeline).to_list(1)
        stats["coins_earned"] = coins[0]["total_earned"] if coins and coins[0].get("total_earned") else 0
        stats["coins_redeemed"] = coins[0]["total_redeemed"] if coins and coins[0].get("total_redeemed") else 0

    except Exception as e:
        logger.error(f"Stats gather error: {e}", exc_info=True)
        stats["error"] = str(e)

    stats["generated_at"] = now.strftime("%d %b %Y, %I:%M %p IST")
    stats["period_days"] = days
    return stats


def build_report_html(stats, report_type="daily"):
    """Build HTML email for the platform report"""
    period_label = "Today" if stats.get("period_days", 1) == 1 else f"Last {stats.get('period_days', 7)} Days"
    title = "Daily Platform Report" if report_type == "daily" else "Weekly Platform Summary"

    def row(label, value, color="#fff"):
        return f'<tr><td style="padding:8px 12px;color:#9CA3AF;font-size:13px;border-bottom:1px solid #1E293B">{label}</td><td style="padding:8px 12px;color:{color};font-size:14px;font-weight:600;text-align:right;border-bottom:1px solid #1E293B">{value}</td></tr>'

    def section(title):
        return f'<tr><td colspan="2" style="padding:14px 12px 6px;color:#14B8A6;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px">{title}</td></tr>'

    doctors_html = ""
    for d in stats.get("by_doctor", []):
        doctors_html += f'<span style="display:inline-block;padding:3px 10px;margin:2px;border-radius:8px;background:#1E293B;color:#94A3B8;font-size:11px">{d["doctor"]}: {d["count"]}</span>'

    html = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0B14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:520px;margin:0 auto;padding:24px 16px">
    <!-- Header -->
    <div style="text-align:center;padding:20px 0 16px">
        <div style="display:inline-block;padding:6px 16px;border-radius:12px;background:linear-gradient(135deg,rgba(20,184,166,0.15),rgba(59,130,246,0.1));border:1px solid rgba(20,184,166,0.2)">
            <span style="color:#14B8A6;font-size:18px;font-weight:800;letter-spacing:-0.5px">Nevika Cura</span>
        </div>
        <h1 style="color:#fff;font-size:22px;margin:12px 0 4px;font-weight:700">{title}</h1>
        <p style="color:#64748B;font-size:12px;margin:0">{stats.get('generated_at', '')} &bull; {period_label}</p>
    </div>

    <!-- Stats Table -->
    <table style="width:100%;border-collapse:collapse;background:#111827;border-radius:16px;overflow:hidden;border:1px solid #1E293B">
        {section('Users & Reach')}
        {row('Total Registered Users', stats.get('total_users', 0), '#F1F5F9')}
        {row('Unique Phone Numbers', stats.get('unique_phones', 0), '#F1F5F9')}
        {row('Unique Emails', stats.get('unique_emails', 0), '#F1F5F9')}
        {row(f'New Registrations ({period_label})', stats.get('new_users_period', 0), '#22C55E')}

        {section('WhatsApp & OTP')}
        {row('Total OTPs Sent (All Time)', stats.get('total_otp_sent', 0))}
        {row(f'OTPs Sent ({period_label})', stats.get('otp_sent_period', 0), '#F59E0B')}
        {row('Total WhatsApp Messages', stats.get('total_whatsapp_logs', 0))}
        {row(f'WhatsApp ({period_label})', stats.get('whatsapp_period', 0), '#25D366')}

        {section('Appointments')}
        {row('Total Appointments (All Time)', stats.get('total_appointments', 0), '#F1F5F9')}
        {row(f'Booked ({period_label})', stats.get('appointments_period', 0), '#3B82F6')}
        {row('Currently Booked', stats.get('appointments_booked', 0), '#3B82F6')}
        {row('Completed', stats.get('appointments_completed', 0), '#22C55E')}
        {row('Cancelled', stats.get('appointments_cancelled', 0), '#EF4444')}
        {row('Voice AI Bookings', stats.get('voice_bookings', 0), '#A78BFA')}

        {section('Orders')}
        {row('Diagnostic Orders (Mango Labs)', stats.get('total_diagnostic_orders', 0), '#F59E0B')}
        {row(f'Diagnostic ({period_label})', stats.get('diagnostic_period', 0))}
        {row('Pharmacy Orders (Orange)', stats.get('total_pharmacy_orders', 0), '#F97316')}
        {row(f'Pharmacy ({period_label})', stats.get('pharmacy_period', 0))}

        {section('Payments & Revenue')}
        {row('Total Payment Orders', stats.get('total_payments', 0))}
        {row('Successful Payments', stats.get('payments_paid', 0), '#22C55E')}
        {row('Total Revenue', f"₹{stats.get('total_revenue', 0):,.0f}", '#14B8A6')}

        {section('Engagement')}
        {row('Push Notification Devices', stats.get('fcm_tokens', 0))}
        {row('Medicine Reminders Set', stats.get('medicine_reminders', 0))}
        {row('Family Members Added', stats.get('family_members', 0))}
        {row('SOS Events', stats.get('sos_events', 0), '#EF4444')}
        {row('CuraCoins Earned', stats.get('coins_earned', 0), '#F59E0B')}
        {row('CuraCoins Redeemed', stats.get('coins_redeemed', 0))}
    </table>

    <!-- Doctors Breakdown -->
    {"" if not doctors_html else f'''
    <div style="margin-top:16px;padding:14px;background:#111827;border-radius:12px;border:1px solid #1E293B">
        <p style="color:#14B8A6;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 8px">Top Doctors</p>
        {doctors_html}
    </div>'''}

    <!-- Footer -->
    <div style="text-align:center;padding:20px 0 8px">
        <p style="color:#475569;font-size:11px;margin:0">Automated report from Nevika Cura Platform</p>
        <p style="color:#334155;font-size:10px;margin:4px 0 0">nevikacura.com</p>
    </div>
</div>
</body></html>"""
    return html


async def send_report_email(report_type="daily"):
    """Generate and send the platform report email"""
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        logger.warning("RESEND_API_KEY not set, skipping report email")
        return False

    resend.api_key = api_key
    days = 1 if report_type == "daily" else 7

    try:
        stats = await gather_platform_stats(days)
        html = build_report_html(stats, report_type)

        title = "Daily Platform Report" if report_type == "daily" else "Weekly Platform Summary"
        date_str = datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime("%d %b %Y")
        subject = f"📊 {title} — {date_str}"

        sender = os.environ.get("RESEND_FROM", SENDER)
        resend.Emails.send({
            "from": sender,
            "to": [REPORT_EMAIL],
            "subject": subject,
            "html": html,
        })
        logger.info(f"✅ {report_type.capitalize()} report sent to {REPORT_EMAIL}")
        return True
    except Exception as e:
        logger.error(f"Report email error: {e}", exc_info=True)
        return False


async def schedule_reports():
    """Background scheduler: daily at 11 PM IST, weekly on Sunday at 11 PM IST"""
    logger.info("Report scheduler started")
    while True:
        try:
            now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
            # Target: 11 PM IST
            target_hour = 23
            target_minute = 0

            # Calculate seconds until next 11 PM IST
            target = now.replace(hour=target_hour, minute=target_minute, second=0, microsecond=0)
            if now >= target:
                target += timedelta(days=1)
            wait_seconds = (target - now).total_seconds()

            logger.info(f"Next report at {target.strftime('%Y-%m-%d %I:%M %p IST')} ({wait_seconds/3600:.1f}h)")
            await asyncio.sleep(wait_seconds)

            # Send daily report
            await send_report_email("daily")

            # If Sunday, also send weekly
            check_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
            if check_now.weekday() == 6:  # Sunday
                await send_report_email("weekly")
                logger.info("Weekly report also sent (Sunday)")

        except asyncio.CancelledError:
            logger.info("Report scheduler cancelled")
            break
        except Exception as e:
            logger.error(f"Scheduler error: {e}", exc_info=True)
            await asyncio.sleep(3600)  # Retry in 1 hour
