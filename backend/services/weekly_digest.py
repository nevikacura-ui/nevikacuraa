"""
Weekly Health Digest Email Service
Sends personalized weekly health summaries to users every Sunday at 10 AM IST.
"""
import logging
import asyncio
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

IST_OFFSET = timedelta(hours=5, minutes=30)

def get_ist_now():
    return datetime.now(timezone.utc) + IST_OFFSET


def build_digest_email(user_phone: str, user_name: str, user_email: str, stats: dict) -> str:
    """Build a premium weekly health digest email."""
    week_label = stats.get("week_label", "This Week")
    reminders_completed = stats.get("reminders_completed", 0)
    active_reminders = stats.get("active_reminders", 0)
    health_streak = stats.get("health_streak", 0)
    records_uploaded = stats.get("records_uploaded", 0)
    appointments_booked = stats.get("appointments_booked", 0)
    coins_earned = stats.get("coins_earned", 0)
    coins_balance = stats.get("coins_balance", 0)
    top_activity = stats.get("top_activity", "Staying healthy")

    # Streak message
    if health_streak >= 7:
        streak_msg = f"You're on fire with a {health_streak}-day streak!"
    elif health_streak >= 3:
        streak_msg = f"Nice! {health_streak}-day streak going strong."
    else:
        streak_msg = "Start a streak this week — check in daily!"

    # Motivation line
    if reminders_completed >= 10:
        motivation = "Outstanding week! You're taking amazing care of yourself."
    elif reminders_completed >= 5:
        motivation = "Great progress this week! Keep the momentum going."
    elif reminders_completed >= 1:
        motivation = "Good start! Every small step counts toward better health."
    else:
        motivation = "This week is a fresh start. Set a reminder and begin!"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light only">
    <style>
      [data-ogsc] *, [data-ogsb] * {{ color: inherit !important; background: inherit !important; }}
    </style>
    </head>
    <body style="margin:0; padding:0; background:#f0fdf4; font-family: 'Segoe UI', Arial, sans-serif;">
    <div style="max-width:600px; margin:0 auto; background:#ffffff;">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); padding:32px 24px; text-align:center; border-radius:0 0 24px 24px;">
        <img src="https://customer-assets.emergentagent.com/job_751dde3d-d15f-4912-b0d6-ce72259bb29f/artifacts/lpwfnyto_6841-removebg-preview.png"
             alt="Nevika Cura" style="height:48px; margin-bottom:12px;" />
        <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:700;">Your Weekly Health Digest</h1>
        <p style="color:rgba(255,255,255,0.85); margin:6px 0 0; font-size:13px;">{week_label}</p>
      </div>

      <!-- Greeting -->
      <div style="padding:24px 24px 8px;">
        <p style="font-size:16px; color:#1a2b28; margin:0;">Hi <strong>{user_name or 'there'}</strong>,</p>
        <p style="font-size:14px; color:#64748b; margin:8px 0 0;">{motivation}</p>
      </div>

      <!-- Stats Grid -->
      <div style="padding:16px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate; border-spacing:8px;">
          <tr>
            <td style="background:#f0fdf4; border-radius:12px; padding:16px; text-align:center; width:50%;">
              <p style="margin:0; font-size:28px; font-weight:800; color:#0d9488;">{reminders_completed}</p>
              <p style="margin:4px 0 0; font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">Reminders Done</p>
            </td>
            <td style="background:#fef3c7; border-radius:12px; padding:16px; text-align:center; width:50%;">
              <p style="margin:0; font-size:28px; font-weight:800; color:#d97706;">{health_streak}</p>
              <p style="margin:4px 0 0; font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">Day Streak</p>
            </td>
          </tr>
          <tr>
            <td style="background:#ede9fe; border-radius:12px; padding:16px; text-align:center;">
              <p style="margin:0; font-size:28px; font-weight:800; color:#7c3aed;">{records_uploaded}</p>
              <p style="margin:4px 0 0; font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">Records Uploaded</p>
            </td>
            <td style="background:#fce7f3; border-radius:12px; padding:16px; text-align:center;">
              <p style="margin:0; font-size:28px; font-weight:800; color:#db2777;">{appointments_booked}</p>
              <p style="margin:4px 0 0; font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">Appointments</p>
            </td>
          </tr>
        </table>
      </div>

      <!-- Streak Banner -->
      <div style="margin:8px 24px; padding:16px 20px; background:linear-gradient(135deg, #fef3c7, #fde68a); border-radius:12px; text-align:center;">
        <p style="margin:0; font-size:14px; color:#92400e; font-weight:600;">{streak_msg}</p>
      </div>

      <!-- CuraCoins -->
      <div style="margin:16px 24px; padding:16px 20px; background:#f8fafc; border-radius:12px; border:1px solid #e2e8f0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align:left;">
              <p style="margin:0; font-size:12px; color:#64748b; text-transform:uppercase;">CuraCoins Earned</p>
              <p style="margin:4px 0 0; font-size:20px; font-weight:700; color:#f59e0b;">+{coins_earned}</p>
            </td>
            <td style="text-align:right;">
              <p style="margin:0; font-size:12px; color:#64748b; text-transform:uppercase;">Total Balance</p>
              <p style="margin:4px 0 0; font-size:20px; font-weight:700; color:#0d9488;">{coins_balance}</p>
            </td>
          </tr>
        </table>
      </div>

      <!-- CTA -->
      <div style="padding:16px 24px; text-align:center;">
        <a href="https://nevikacura.com" style="display:inline-block; padding:14px 32px; background:linear-gradient(135deg, #0d9488, #14b8a6); color:#ffffff; text-decoration:none; border-radius:12px; font-size:14px; font-weight:700;">
          Open Nevika Cura
        </a>
      </div>

      <!-- Footer -->
      <div style="padding:20px 24px; text-align:center; border-top:1px solid #f1f5f9;">
        <p style="margin:0; font-size:11px; color:#94a3b8;">Nevika Cura - Your Health. Simplified.</p>
        <p style="margin:4px 0 0; font-size:10px; color:#cbd5e1;">You're receiving this because you're a Nevika Cura user. Manage preferences in the app.</p>
      </div>

    </div>
    </body>
    </html>
    """
    return html


async def gather_user_digest_stats(db, phone: str) -> dict:
    """Aggregate weekly health data for a single user."""
    now = get_ist_now()
    week_ago = now - timedelta(days=7)
    week_ago_str = week_ago.strftime("%Y-%m-%d")
    today_str = now.strftime("%Y-%m-%d")
    week_label = f"{week_ago.strftime('%b %d')} - {now.strftime('%b %d, %Y')}"

    # Reminders completed this week
    reminders_completed = 0
    async for rem in db.smart_reminders.find({"phone": phone}, {"completion_log": 1, "_id": 0}):
        for log in rem.get("completion_log", []):
            log_date = log.get("date", "")
            if log_date >= week_ago_str:
                reminders_completed += 1

    active_reminders = await db.smart_reminders.count_documents({"phone": phone, "is_active": True})

    # Health streak
    gam_profile = await db.gamification_profiles.find_one({"phone": phone}, {"_id": 0, "current_streak": 1})
    health_streak = gam_profile.get("current_streak", 0) if gam_profile else 0

    # Records uploaded this week
    records_uploaded = await db.medical_records.count_documents({
        "phone": phone,
        "created_at": {"$gte": week_ago.isoformat()}
    })

    # Appointments booked this week
    appointments_booked = await db.appointments.count_documents({
        "phone": phone,
        "date": {"$gte": week_ago_str, "$lte": today_str}
    })

    # CuraCoins
    coins_doc = await db.curacoins.find_one({"phone": phone}, {"_id": 0, "balance": 1})
    coins_balance = coins_doc.get("balance", 0) if coins_doc else 0

    # Coins earned this week (from transaction log)
    coins_earned = 0
    async for txn in db.curacoin_transactions.find({
        "phone": phone,
        "type": "credit",
        "created_at": {"$gte": week_ago.isoformat()}
    }, {"amount": 1, "_id": 0}):
        coins_earned += txn.get("amount", 0)

    return {
        "week_label": week_label,
        "reminders_completed": reminders_completed,
        "active_reminders": active_reminders,
        "health_streak": health_streak,
        "records_uploaded": records_uploaded,
        "appointments_booked": appointments_booked,
        "coins_earned": coins_earned,
        "coins_balance": coins_balance,
    }


async def send_weekly_digests(db):
    """Send weekly digest emails to all users with email addresses."""
    import os
    try:
        import resend
        resend_key = os.environ.get('RESEND_API_KEY', '')
        if not resend_key:
            logger.warning("[DIGEST] No RESEND_API_KEY, skipping weekly digests")
            return {"sent": 0, "skipped": True}
        resend.api_key = resend_key
    except ImportError:
        logger.warning("[DIGEST] Resend not installed")
        return {"sent": 0, "error": "resend not installed"}

    sender = os.environ.get('SENDER_EMAIL', 'Nevika Cura <noreply@nevikacura.com>')
    sent_count = 0
    error_count = 0

    # Find users with email addresses
    users = await db.users.find(
        {"email": {"$exists": True, "$nin": ["", None]}},
        {"_id": 0, "phone": 1, "email": 1, "name": 1}
    ).to_list(length=500)

    logger.info(f"[DIGEST] Found {len(users)} users with emails")

    for user in users:
        phone = user.get("phone", "")
        email = user.get("email", "")
        name = user.get("name", "")

        if not email or not phone:
            continue

        try:
            stats = await gather_user_digest_stats(db, phone)
            html = build_digest_email(phone, name, email, stats)

            await asyncio.to_thread(resend.Emails.send, {
                "from": sender,
                "to": [email],
                "subject": f"Your Weekly Health Summary - Nevika Cura",
                "html": html,
            })
            sent_count += 1
            # Throttle to avoid rate limits
            await asyncio.sleep(0.5)
        except Exception as e:
            logger.error(f"[DIGEST] Failed for {email}: {e}")
            error_count += 1

    logger.info(f"[DIGEST] Weekly digest sent: {sent_count}, errors: {error_count}")
    return {"sent": sent_count, "errors": error_count}


async def schedule_weekly_digest(db):
    """Background scheduler — runs every Sunday at 10 AM IST."""
    while True:
        try:
            now = get_ist_now()
            # Next Sunday at 10 AM IST
            days_until_sunday = (6 - now.weekday()) % 7
            if days_until_sunday == 0 and now.hour >= 10:
                days_until_sunday = 7
            next_sunday = now.replace(hour=10, minute=0, second=0, microsecond=0) + timedelta(days=days_until_sunday)
            wait_seconds = (next_sunday - now).total_seconds()

            logger.info(f"[DIGEST] Next weekly digest in {wait_seconds/3600:.1f}h ({next_sunday.strftime('%a %b %d, %I:%M %p')} IST)")
            await asyncio.sleep(wait_seconds)

            logger.info("[DIGEST] Running weekly digest...")
            result = await send_weekly_digests(db)
            logger.info(f"[DIGEST] Complete: {result}")

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"[DIGEST] Scheduler error: {e}")
            await asyncio.sleep(3600)
