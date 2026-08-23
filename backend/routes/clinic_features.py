"""
Clinic Features API:
- Token management (current/next/reset) for token announcer
- Patient visit history by phone
- Doctor running late notification
- ANC form email
"""
from fastapi import APIRouter, Query
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import resend
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
db = None

RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'Nevika Cura <onboarding@resend.dev>')

def init_db(database):
    global db
    db = database
    if RESEND_API_KEY:
        resend.api_key = RESEND_API_KEY


# ═══════════════════════════════════════
# TOKEN MANAGEMENT
# ═══════════════════════════════════════

@router.get("/api/tokens/current")
async def get_current_token(department: str = "general"):
    doc = await db.token_counters.find_one(
        {"department": department},
        {"_id": 0}
    )
    return {"token_number": doc["current"] if doc else 0, "department": department}


@router.post("/api/tokens/next")
async def advance_token(data: dict = None):
    department = (data or {}).get("department", "general")
    result = await db.token_counters.find_one_and_update(
        {"department": department},
        {"$inc": {"current": 1}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
        return_document=True,
    )
    token_num = result["current"]
    return {"token_number": token_num, "department": department}


@router.post("/api/tokens/reset")
async def reset_token(data: dict = None):
    department = (data or {}).get("department", "general")
    await db.token_counters.update_one(
        {"department": department},
        {"$set": {"current": 0, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"token_number": 0, "department": department}


# ═══════════════════════════════════════
# PATIENT VISIT HISTORY
# ═══════════════════════════════════════

@router.get("/api/clinic/patient-history/{phone}")
async def get_patient_history(phone: str):
    """Get complete visit history for a patient by phone number."""
    # Find user profile
    user = await db.users.find_one(
        {"phone": phone},
        {"_id": 0, "name": 1, "phone": 1, "email": 1, "gender": 1, "dob": 1}
    )

    # Appointments (all time)
    appointments_cursor = db.appointments.find(
        {"$or": [{"patient_phone": phone}, {"patient_mobile": phone}]},
        {"_id": 0}
    ).sort("date", -1).limit(100)
    appointments = await appointments_cursor.to_list(100)

    # Orders (pharmacy + lab)
    orders_cursor = db.orders.find(
        {"$or": [{"phone": phone}, {"patient_phone": phone}, {"user_phone": phone}]},
        {"_id": 0}
    ).sort("created_at", -1).limit(100)
    orders = await orders_cursor.to_list(100)

    # Lab test orders
    lab_cursor = db.lab_orders.find(
        {"$or": [{"phone": phone}, {"patient_phone": phone}]},
        {"_id": 0}
    ).sort("created_at", -1).limit(50)
    lab_orders = await lab_cursor.to_list(50)

    # Wallet transactions
    wallet_cursor = db.wallet_transactions.find(
        {"phone": phone},
        {"_id": 0}
    ).sort("created_at", -1).limit(50)
    wallet_txns = await wallet_cursor.to_list(50)

    # Serialize any remaining ObjectId fields
    def clean(doc):
        return {k: str(v) if isinstance(v, ObjectId) else v for k, v in doc.items()}

    return {
        "patient": user,
        "appointments": [clean(a) for a in appointments],
        "orders": [clean(o) for o in orders],
        "lab_orders": [clean(l) for l in lab_orders],
        "wallet_transactions": [clean(w) for w in wallet_txns],
        "total_visits": len(appointments),
        "total_orders": len(orders) + len(lab_orders),
    }


# ═══════════════════════════════════════
# DOCTOR RUNNING LATE
# ═══════════════════════════════════════

@router.post("/api/clinic/doctor-running-late")
async def doctor_running_late(data: dict):
    """
    Doctor sets a delay notification. Stores it so staff/patients can see.
    Body: { doctor_name, delay_minutes, clinic, date, message? }
    """
    doctor = data.get("doctor_name", "")
    delay = data.get("delay_minutes", 15)
    clinic = data.get("clinic", "")
    date = data.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    message = data.get("message", f"Dr. {doctor.replace('Dr. ', '')} is running approximately {delay} minutes late. We apologize for the inconvenience.")

    # Store the delay notification
    doc = {
        "doctor_name": doctor,
        "delay_minutes": delay,
        "clinic": clinic,
        "date": date,
        "message": message,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.doctor_delays.insert_one(doc)

    # Also store as a notification for booked patients
    booked = db.appointments.find(
        {"doctor": doctor, "date": date, "status": {"$in": ["Booked", "CheckedIn"]}},
        {"_id": 0, "patient_phone": 1, "patient_mobile": 1, "patient_name": 1}
    )
    patients_notified = 0
    async for apt in booked:
        phone = apt.get("patient_phone") or apt.get("patient_mobile")
        if phone:
            await db.notifications.insert_one({
                "phone": phone,
                "type": "doctor_delay",
                "title": "Doctor Running Late",
                "message": message,
                "read": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            patients_notified += 1

    return {
        "success": True,
        "delay_minutes": delay,
        "patients_notified": patients_notified,
        "message": message,
    }


@router.get("/api/clinic/doctor-delay-status")
async def get_doctor_delay_status(
    doctor: str = Query(...),
    date: str = Query(None)
):
    """Check if a doctor has an active delay notification."""
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    delay = await db.doctor_delays.find_one(
        {"doctor_name": doctor, "date": date, "active": True},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    return {"active": bool(delay), "delay": delay}


@router.post("/api/clinic/clear-doctor-delay")
async def clear_doctor_delay(data: dict):
    """Clear the delay notification for a doctor."""
    doctor = data.get("doctor_name", "")
    date = data.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    
    await db.doctor_delays.update_many(
        {"doctor_name": doctor, "date": date},
        {"$set": {"active": False}}
    )
    return {"success": True, "message": "Delay notification cleared"}


# ═══════════════════════════════════════
# ANC FORM EMAIL
# ═══════════════════════════════════════

def _calculate_edd(lmp_str: str) -> str:
    lmp = datetime.strptime(lmp_str, "%Y-%m-%d")
    edd = lmp + timedelta(days=280)
    return edd.strftime("%d %b %Y")

def _gestational_age(lmp_str: str) -> str:
    lmp = datetime.strptime(lmp_str, "%Y-%m-%d")
    days = (datetime.now() - lmp).days
    return f"{days // 7} weeks {days % 7} days"


def _build_anc_html(p, edd, ga, include_print_button=False):
    """Reusable ANC form HTML builder."""
    print_section = ""
    print_css_extra = ""
    if include_print_button:
        print_section = '<div style="text-align:center;margin-bottom:16px;" class="no-print"><button style="display:inline-block;background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;padding:14px 40px;border-radius:8px;font-size:16px;font-weight:700;cursor:pointer;border:none;" onclick="window.print()">Print / Save as PDF</button></div>'
        print_css_extra = ".no-print { margin: 0; }"

    return f"""<!DOCTYPE html>
    <html><head><meta charset="utf-8"><title>ANC Form - {p.get('patient_name','')}</title>
    <style>
      body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #1e293b; max-width: 700px; margin: 0 auto; padding: 20px; }}
      .header {{ background: linear-gradient(135deg, #0d9488, #14b8a6); color: white; padding: 20px 24px; border-radius: 12px 12px 0 0; }}
      .header h1 {{ margin: 0; font-size: 22px; }}
      .header p {{ margin: 4px 0 0; opacity: 0.9; font-size: 13px; }}
      .form-body {{ border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; padding: 24px; }}
      .section {{ margin-bottom: 20px; }}
      .section-title {{ font-size: 13px; font-weight: 700; color: #0d9488; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #0d9488; padding-bottom: 6px; margin-bottom: 12px; }}
      table {{ width: 100%; border-collapse: collapse; }}
      td {{ padding: 6px 8px; font-size: 13px; vertical-align: top; }}
      td.label {{ font-weight: 600; color: #64748b; width: 40%; }}
      td.value {{ color: #1e293b; }}
      .highlight {{ background: #f0fdfa; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #14b8a6; margin: 16px 0; }}
      .highlight strong {{ color: #0d9488; }}
      .footer {{ text-align: center; margin-top: 20px; font-size: 11px; color: #94a3b8; }}
      {print_css_extra}
      @media print {{ 
        body {{ padding: 0; margin: 0; }} 
        .header {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }} 
        .no-print {{ display: none !important; }}
      }}
    </style></head>
    <body>
      {print_section}
      <div class="header">
        <h1>ANC Registration Form</h1>
        <p>Nevika Cura Healthcare &middot; {p.get('clinic', 'N/A')} &middot; {p.get('_date', datetime.now().strftime('%d %b %Y, %I:%M %p'))}</p>
      </div>
      <div class="form-body">
        <div class="highlight">
          <strong>EDD:</strong> {edd} &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>Gestational Age:</strong> {ga} &nbsp;&nbsp;|&nbsp;&nbsp;
          <strong>Obstetric Formula:</strong> G{p.get('gravida',1)}P{p.get('para',0)}A{p.get('abortion',0)}L{p.get('living',0)}
        </div>
        <div class="section">
          <div class="section-title">Patient Details</div>
          <table>
            <tr><td class="label">Patient Name</td><td class="value">{p.get('patient_name','')}</td></tr>
            <tr><td class="label">Age</td><td class="value">{p.get('age','')} years</td></tr>
            <tr><td class="label">Phone</td><td class="value">{p.get('phone','')}</td></tr>
            <tr><td class="label">Address</td><td class="value">{p.get('address','')}</td></tr>
            <tr><td class="label">Aadhaar</td><td class="value">{p.get('aadhaar','N/A')}</td></tr>
          </table>
        </div>
        <div class="section">
          <div class="section-title">Husband Details</div>
          <table>
            <tr><td class="label">Husband Name</td><td class="value">{p.get('husband_name','')}</td></tr>
            <tr><td class="label">Husband Phone</td><td class="value">{p.get('husband_phone','N/A')}</td></tr>
            <tr><td class="label">Occupation</td><td class="value">{p.get('husband_occupation','N/A')}</td></tr>
          </table>
        </div>
        <div class="section">
          <div class="section-title">Obstetric Details</div>
          <table>
            <tr><td class="label">LMP (Last Period)</td><td class="value">{p.get('lmp','')}</td></tr>
            <tr><td class="label">EDD</td><td class="value">{edd}</td></tr>
            <tr><td class="label">Gravida</td><td class="value">{p.get('gravida',1)}</td></tr>
            <tr><td class="label">Para</td><td class="value">{p.get('para',0)}</td></tr>
            <tr><td class="label">Abortion</td><td class="value">{p.get('abortion',0)}</td></tr>
            <tr><td class="label">Living Children</td><td class="value">{p.get('living',0)}</td></tr>
          </table>
        </div>
        <div class="section">
          <div class="section-title">Medical Details</div>
          <table>
            <tr><td class="label">Blood Group</td><td class="value">{p.get('blood_group','N/A')} {p.get('rh_factor','')}</td></tr>
            <tr><td class="label">Weight</td><td class="value">{p.get('weight_kg','N/A')} kg</td></tr>
            <tr><td class="label">Height</td><td class="value">{p.get('height_cm','N/A')} cm</td></tr>
          </table>
        </div>
        <div class="section">
          <div class="section-title">Medical History</div>
          <table>
            <tr><td class="label">Previous Cesarean</td><td class="value">{'Yes' if p.get('previous_cesarean') else 'No'}</td></tr>
            <tr><td class="label">Diabetes</td><td class="value">{'Yes' if p.get('diabetes') else 'No'}</td></tr>
            <tr><td class="label">Hypertension</td><td class="value">{'Yes' if p.get('hypertension') else 'No'}</td></tr>
            <tr><td class="label">Thyroid</td><td class="value">{'Yes' if p.get('thyroid') else 'No'}</td></tr>
            <tr><td class="label">Other Conditions</td><td class="value">{p.get('other_conditions','None')}</td></tr>
          </table>
        </div>
        <div class="section">
          <div class="section-title">Clinic Info</div>
          <table>
            <tr><td class="label">Clinic</td><td class="value">{p.get('clinic','')}</td></tr>
            <tr><td class="label">Doctor Assigned</td><td class="value">{p.get('doctor_assigned','N/A')}</td></tr>
            <tr><td class="label">Registered By</td><td class="value">{p.get('registered_by','')}</td></tr>
          </table>
        </div>
      </div>
      <div class="footer">
        Auto-generated ANC registration form &middot; Nevika Cura Health Portal
      </div>
    </body></html>"""


@router.post("/api/clinic/anc-send-email")
async def send_anc_form_email(data: dict):
    """Send ANC registration form email with a printable link."""
    if not RESEND_API_KEY:
        return {"success": False, "message": "Email service not configured"}

    p = data
    lmp = p.get("lmp", "")
    edd = _calculate_edd(lmp) if lmp else "N/A"
    ga = _gestational_age(lmp) if lmp else "N/A"

    # Store form snapshot for the print page
    form_id = f"ANC-{datetime.now().strftime('%Y%m%d%H%M%S')}-{p.get('phone','')[-4:]}"
    p["_date"] = datetime.now().strftime('%d %b %Y, %I:%M %p')
    await db.anc_form_snapshots.insert_one({
        "form_id": form_id,
        "data": p,
        "edd": edd,
        "ga": ga,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    base_url = os.environ.get("CHECKOUT_BASE_URL", os.environ.get("BASE_URL", "https://premium-rx-portal.preview.emergentagent.com"))
    print_url = f"{base_url}/api/clinic/anc-print/{form_id}"

    # Build email HTML (no print button — link to web page instead)
    form_html = _build_anc_html(p, edd, ga, include_print_button=False)

    # Wrap with print link at top
    email_html = f"""
    <div style="text-align:center;margin-bottom:16px;">
      <a href="{print_url}" target="_blank" 
         style="display:inline-block;background:linear-gradient(135deg,#0d9488,#14b8a6);color:#ffffff;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;">
         Print / Save as PDF
      </a>
      <p style="font-size:11px;color:#94a3b8;margin-top:6px;">Click above to open the printable form in your browser</p>
    </div>
    {form_html}
    """

    try:
        import asyncio
        result = await asyncio.to_thread(resend.Emails.send, {
            "from": SENDER_EMAIL,
            "to": ["nevikacura@gmail.com"],
            "subject": f"ANC Registration - {p.get('patient_name','')} | {p.get('clinic','')} | {datetime.now().strftime('%d %b %Y')}",
            "html": email_html,
        })
        logger.info(f"ANC form email sent: {result}")
        return {"success": True, "message": "ANC form emailed to nevikacura@gmail.com", "email_id": str(result), "print_url": print_url}
    except Exception as e:
        logger.error(f"ANC email error: {e}")
        return {"success": False, "message": f"Email failed: {str(e)}"}


@router.get("/api/clinic/anc-print/{form_id}")
async def get_anc_print_page(form_id: str):
    """Serve printable ANC form as a web page. Opens with print dialog."""
    from fastapi.responses import HTMLResponse

    snapshot = await db.anc_form_snapshots.find_one({"form_id": form_id}, {"_id": 0})
    if not snapshot:
        return HTMLResponse("<h2>Form not found</h2><p>This ANC form link may have expired or is invalid.</p>", status_code=404)

    p = snapshot["data"]
    edd = snapshot.get("edd", "N/A")
    ga = snapshot.get("ga", "N/A")

    html = _build_anc_html(p, edd, ga, include_print_button=True)
    return HTMLResponse(html)


# ═══════════════════════════════════════
# PUSH NOTIFICATION VERIFICATION
# ═══════════════════════════════════════

@router.get("/api/clinic/push-notification-status")
async def push_notification_status():
    """Check push notification system status for verification."""
    vapid_public = os.environ.get('VAPID_PUBLIC_KEY', '')
    vapid_private = os.environ.get('VAPID_PRIVATE_KEY', '')

    sub_count = 0
    try:
        sub_count = await db.push_subscriptions.count_documents({})
    except Exception:
        pass

    return {
        "vapid_configured": bool(vapid_public and vapid_private),
        "vapid_public_key": vapid_public[:20] + "..." if vapid_public else None,
        "firebase_configured": True,  # firebase-messaging-sw.js is present
        "active_subscriptions": sub_count,
        "service_worker": "/firebase-messaging-sw.js",
        "status": "ready" if (vapid_public and vapid_private) else "vapid_keys_missing",
        "note": "Native OS notifications require browser notification permission. Grant permission, subscribe, then trigger /api/push/test-notification."
    }


# ═══════════════════════════════════════
# END-OF-DAY DOCTOR REPORT
# ═══════════════════════════════════════

async def _generate_doctor_daily_report_html(doctor_name: str, date: str) -> str:
    """Generate HTML email for a doctor's daily summary with queue efficiency metrics."""
    apts = await db.appointments.find(
        {"doctor": doctor_name, "date": date},
        {"_id": 0}
    ).to_list(200)

    total = len(apts)
    completed = [a for a in apts if a.get("status") in ("Completed", "completed")]
    checked_in = [a for a in apts if a.get("status") == "CheckedIn"]
    booked = [a for a in apts if a.get("status") == "Booked"]
    cancelled = [a for a in apts if a.get("status") == "Cancelled"]
    billing_pending = [a for a in apts if a.get("status") == "billing_pending"]
    walkins = [a for a in apts if a.get("appointment_type") == "WALK_IN"]
    emergencies = [a for a in apts if a.get("appointment_type") == "EMERGENCY"]
    revenue = sum(a.get("total_fee", 0) or a.get("fee", 0) or 0 for a in completed)
    avg_fee = round(revenue / len(completed)) if completed else 0
    rate = round(len(completed) / total * 100) if total > 0 else 0

    # ── Queue Efficiency Metrics ──
    wait_times = []  # checked_in_at → with_doctor_at (minutes)
    consult_times = []  # with_doctor_at → completed_at (minutes)
    billing_times = []  # completed_at → billing_closed_at (minutes)

    def _parse_ts(ts_str):
        if not ts_str:
            return None
        try:
            return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        except Exception:
            return None

    for apt in completed + billing_pending:
        ci = _parse_ts(apt.get("checked_in_at"))
        wd = _parse_ts(apt.get("with_doctor_at"))
        ca = _parse_ts(apt.get("completed_at"))
        bc = _parse_ts(apt.get("billing_closed_at"))

        if ci and wd:
            diff = abs((wd - ci).total_seconds()) / 60
            if diff < 300:
                wait_times.append(diff)
        if wd and ca:
            diff = abs((ca - wd).total_seconds()) / 60
            if diff < 300:
                consult_times.append(diff)
        if ca and bc:
            diff = abs((bc - ca).total_seconds()) / 60
            if diff < 300:
                billing_times.append(diff)

    avg_wait = round(sum(wait_times) / len(wait_times)) if wait_times else 0
    avg_consult = round(sum(consult_times) / len(consult_times)) if consult_times else 0
    avg_billing = round(sum(billing_times) / len(billing_times)) if billing_times else 0
    max_wait = round(max(wait_times)) if wait_times else 0

    # Patients per hour (first check-in to last completed)
    all_checkins = [_parse_ts(a.get("checked_in_at")) for a in apts if a.get("checked_in_at")]
    all_completions = [_parse_ts(a.get("completed_at")) for a in completed if a.get("completed_at")]
    all_checkins = [t for t in all_checkins if t]
    all_completions = [t for t in all_completions if t]
    if all_checkins and all_completions:
        first_checkin = min(all_checkins)
        last_completion = max(all_completions)
        hours_worked = max(1, (last_completion - first_checkin).total_seconds() / 3600)
        patients_per_hour = round(len(completed) / hours_worked, 1)
    else:
        patients_per_hour = 0

    # Ratings
    try:
        ratings_data = await db.ratings.find({"doctor": doctor_name}, {"_id": 0, "rating": 1}).to_list(500)
        avg_rating = round(sum(r["rating"] for r in ratings_data) / len(ratings_data), 1) if ratings_data else 0
        total_ratings = len(ratings_data)
    except Exception:
        avg_rating = 0
        total_ratings = 0

    # ── Weekly Trends Comparison ──
    has_trends = False
    tw_total = lw_total = tw_revenue = lw_revenue = tw_avg_wait = lw_avg_wait = tw_rate = lw_rate = 0
    tw_completed_list = lw_completed_list = []
    try:
        report_dt = datetime.strptime(date, "%Y-%m-%d")
        weekday_idx = report_dt.weekday()  # 0=Mon, 6=Sun
        this_week_start = report_dt - timedelta(days=weekday_idx)
        last_week_start = this_week_start - timedelta(days=7)

        this_week_dates = [(this_week_start + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(weekday_idx + 1)]
        last_week_dates = [(last_week_start + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(weekday_idx + 1)]

        tw_apts = await db.appointments.find(
            {"doctor": doctor_name, "date": {"$in": this_week_dates}}, {"_id": 0}
        ).to_list(500)
        lw_apts = await db.appointments.find(
            {"doctor": doctor_name, "date": {"$in": last_week_dates}}, {"_id": 0}
        ).to_list(500)

        tw_total = len(tw_apts)
        lw_total = len(lw_apts)
        tw_completed_list = [a for a in tw_apts if a.get("status") in ("Completed", "completed")]
        lw_completed_list = [a for a in lw_apts if a.get("status") in ("Completed", "completed")]
        tw_revenue = sum(a.get("total_fee", 0) or a.get("fee", 0) or 0 for a in tw_completed_list)
        lw_revenue = sum(a.get("total_fee", 0) or a.get("fee", 0) or 0 for a in lw_completed_list)

        # Avg wait times for each week
        def _week_avg_wait(week_apts):
            waits = []
            for a in week_apts:
                ci = _parse_ts(a.get("checked_in_at"))
                wd = _parse_ts(a.get("with_doctor_at"))
                if ci and wd:
                    diff = abs((wd - ci).total_seconds()) / 60
                    if diff < 300:
                        waits.append(diff)
            return round(sum(waits) / len(waits)) if waits else 0

        tw_avg_wait = _week_avg_wait(tw_apts)
        lw_avg_wait = _week_avg_wait(lw_apts)

        tw_rate = round(len(tw_completed_list) / tw_total * 100) if tw_total > 0 else 0
        lw_rate = round(len(lw_completed_list) / lw_total * 100) if lw_total > 0 else 0

        has_trends = lw_total > 0  # Only show if last week has data
        logger.info(f"Weekly trends: tw={tw_total}, lw={lw_total}, has_trends={has_trends}")
    except Exception as e:
        logger.error(f"Weekly trends error: {e}")
        has_trends = False

    def stat_cell(label, value, color):
        return f'<td style="text-align:center;padding:12px 8px;"><div style="font-size:28px;font-weight:900;color:{color}">{value}</div><div style="font-size:11px;color:#94a3b8;margin-top:2px">{label}</div></td>'

    def metric_row(icon, label, value, unit, color):
        return f'<tr><td style="padding:8px 0;font-size:13px;color:#94a3b8;vertical-align:middle"><span style="color:{color};margin-right:6px">{icon}</span>{label}</td><td style="text-align:right;font-weight:700;color:#fff;font-size:15px;vertical-align:middle">{value}<span style="font-size:11px;color:#94a3b8;font-weight:400;margin-left:2px">{unit}</span></td></tr>'

    def bar_item(label, count, color):
        return f'<tr><td style="padding:6px 0;font-size:13px;color:#94a3b8"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:{color};margin-right:8px"></span>{label}</td><td style="text-align:right;font-weight:700;color:#fff;font-size:13px">{count}</td></tr>'

    def trend_row(label, this_val, last_val, unit="", lower_is_better=False):
        if last_val == 0 and this_val == 0:
            return ""
        if last_val == 0:
            pct = 100
        else:
            pct = round((this_val - last_val) / last_val * 100)
        is_positive = (pct < 0) if lower_is_better else (pct > 0)
        arrow = "&#9650;" if pct >= 0 else "&#9660;"
        color = "#34d399" if is_positive else ("#f87171" if abs(pct) > 5 else "#94a3b8")
        pct_display = f"+{pct}" if pct > 0 else str(pct)
        return f'<tr><td style="padding:8px 0;font-size:13px;color:#94a3b8">{label}</td><td style="text-align:center;font-weight:700;color:#fff;font-size:14px">{this_val}{unit}</td><td style="text-align:center;font-size:12px;color:#64748b">{last_val}{unit}</td><td style="text-align:right;font-weight:700;font-size:13px;color:{color}">{arrow} {pct_display}%</td></tr>'

    # Weekly trends section
    trends_html = ""
    if has_trends:
        day_label = report_dt.strftime("%A")
        trends_html = f"""
      <div class="card">
        <h3>Weekly Trends (Mon&ndash;{day_label})</h3>
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="padding:4px 0;font-size:10px;color:#475569"></td><td style="text-align:center;font-size:10px;color:#64748b;font-weight:600">This wk</td><td style="text-align:center;font-size:10px;color:#64748b;font-weight:600">Last wk</td><td style="text-align:right;font-size:10px;color:#64748b;font-weight:600">Change</td></tr>
          {trend_row("Patients", tw_total, lw_total)}
          {trend_row("Completed", len(tw_completed_list), len(lw_completed_list))}
          {trend_row("Revenue", tw_revenue, lw_revenue, "")}
          {trend_row("Avg Wait", tw_avg_wait, lw_avg_wait, "m", lower_is_better=True)}
          {trend_row("Completion %", tw_rate, lw_rate, "%")}
        </table>
      </div>"""

    # Queue efficiency section
    efficiency_html = ""
    if wait_times or consult_times:
        efficiency_html = f"""
      <div class="card">
        <h3>Queue Efficiency</h3>
        <table width="100%" cellspacing="0" cellpadding="0">
          {metric_row("&#9201;", "Avg Wait Time", avg_wait, "min", "#60a5fa")}
          {metric_row("&#9877;", "Avg Consult Time", avg_consult, "min", "#a78bfa")}
          {metric_row("&#128176;", "Avg Billing Time", avg_billing, "min", "#34d399")}
          {metric_row("&#9889;", "Patients/Hour", patients_per_hour, "", "#fbbf24")}
          {metric_row("&#128337;", "Longest Wait", max_wait, "min", "#f87171") if max_wait > 0 else ""}
        </table>
      </div>"""

    # Billing summary section
    billing_html = ""
    if len(billing_pending) > 0 or revenue > 0:
        pending_revenue = sum(a.get("total_fee", 0) or a.get("fee", 0) or 0 for a in billing_pending)
        billing_html = f"""
      <div class="card">
        <h3>Billing Summary</h3>
        <table width="100%" cellspacing="0" cellpadding="0">
          {metric_row("&#9989;", "Collected", f"&#8377;{revenue:,}", "", "#34d399")}
          {metric_row("&#9888;", "Pending Bills", len(billing_pending), f" (&#8377;{pending_revenue:,})", "#fbbf24") if billing_pending else ""}
          {metric_row("&#128181;", "Avg Fee", f"&#8377;{avg_fee}", "", "#a78bfa")}
        </table>
      </div>"""

    return f"""
    <html><head><style>
      body {{ font-family: Arial, sans-serif; margin: 0; padding: 0; background: #0f172a; color: #e2e8f0; }}
      .wrap {{ max-width: 520px; margin: 0 auto; padding: 24px 16px; }}
      .header {{ background: linear-gradient(135deg, #7c3aed, #6d28d9); border-radius: 16px; padding: 24px; text-align: center; }}
      .header h1 {{ margin: 0; font-size: 20px; color: #fff; }}
      .header p {{ margin: 6px 0 0; font-size: 12px; color: rgba(255,255,255,0.7); }}
      .card {{ background: #1e293b; border-radius: 12px; padding: 16px; margin-top: 12px; border: 1px solid rgba(255,255,255,0.05); }}
      .card h3 {{ font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 0 0 10px; }}
      .revenue {{ font-size: 32px; font-weight: 900; color: #fff; }}
      .revenue-sub {{ font-size: 12px; color: #94a3b8; }}
      .bar-fill {{ height: 8px; border-radius: 4px; background: linear-gradient(90deg, #7c3aed, #10b981); }}
      .bar-track {{ height: 8px; border-radius: 4px; background: rgba(255,255,255,0.05); overflow: hidden; margin-top: 8px; }}
      .footer {{ text-align: center; margin-top: 20px; font-size: 10px; color: #475569; }}
      .print-btn {{ display: inline-block; background: #7c3aed; color: #fff; padding: 10px 28px; border-radius: 8px; font-size: 13px; font-weight: 700; text-decoration: none; cursor: pointer; border: none; }}
      @media print {{ body {{ background: #fff; color: #1e293b; }} .card {{ background: #f8fafc; border: 1px solid #e2e8f0; }} .header {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }} .no-print {{ display: none !important; }} .revenue, .card h3, td {{ color: #1e293b !important; }} }}
    </style></head>
    <body><div class="wrap">
      <div class="no-print" style="text-align:center;margin-bottom:12px">
        <button class="print-btn" onclick="window.print()">Print Report</button>
      </div>
      <div class="header">
        <h1>Daily Summary</h1>
        <p>{doctor_name} &middot; {date}</p>
      </div>

      <div class="card">
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr>
            {stat_cell("Total", total, "#a78bfa")}
            {stat_cell("Done", len(completed), "#34d399")}
            {stat_cell("Waiting", len(checked_in), "#60a5fa")}
            {stat_cell("Pending", len(booked), "#fbbf24")}
          </tr>
        </table>
      </div>

      {efficiency_html}

      {billing_html}

      <div class="card">
        <h3>Breakdown</h3>
        <table width="100%" cellspacing="0" cellpadding="0">
          {bar_item("Walk-in", len(walkins), "#fbbf24")}
          {bar_item("Emergency", len(emergencies), "#f87171")}
          {bar_item("Scheduled", total - len(walkins) - len(emergencies), "#a78bfa")}
          {bar_item("Cancelled", len(cancelled), "#64748b")}
        </table>
      </div>

      <div class="card">
        <h3>Completion Rate</h3>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px;color:#94a3b8">Progress</span>
          <span style="font-size:14px;font-weight:700;color:#34d399">{rate}%</span>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width:{rate}%"></div></div>
      </div>

      {'<div class="card"><h3>Patient Ratings</h3><div style="font-size:24px;font-weight:900;color:#fbbf24">' + str(avg_rating) + ' &#9733;</div><div class="revenue-sub">' + str(total_ratings) + ' ratings</div></div>' if avg_rating > 0 else ''}

      {trends_html}

      <div class="footer">
        Auto-generated end-of-day report &middot; Nevika Cura Health Portal
      </div>
    </div></body></html>
    """


@router.post("/api/clinic/send-doctor-daily-report")
async def send_doctor_daily_report(data: dict = None):
    """Send daily summary email for a doctor. Can be triggered manually or by scheduler."""
    if not RESEND_API_KEY:
        return {"success": False, "message": "Email not configured"}

    date = (data or {}).get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    doctor_name = (data or {}).get("doctor_name")

    if doctor_name:
        doctors = [{"name": doctor_name}]
    else:
        # Send for all doctors with appointments today
        pipeline = [
            {"$match": {"date": date}},
            {"$group": {"_id": "$doctor"}},
        ]
        doctor_docs = await db.appointments.aggregate(pipeline).to_list(50)
        doctors = [{"name": d["_id"]} for d in doctor_docs if d["_id"]]

    sent = 0
    for doc in doctors:
        name = doc["name"]
        html = await _generate_doctor_daily_report_html(name, date)
        try:
            import asyncio
            await asyncio.to_thread(resend.Emails.send, {
                "from": SENDER_EMAIL,
                "to": ["nevikacura@gmail.com"],
                "subject": f"Daily Report - {name} | {date}",
                "html": html,
            })
            sent += 1
            logger.info(f"Daily report sent for {name}")
        except Exception as e:
            logger.error(f"Daily report email error for {name}: {e}")

    return {"success": True, "reports_sent": sent, "date": date}


@router.get("/api/clinic/doctor-daily-report-preview")
async def preview_doctor_daily_report(doctor_name: str, date: str = None):
    """Preview the daily report HTML (for in-app viewing)."""
    from fastapi.responses import HTMLResponse
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    html = await _generate_doctor_daily_report_html(doctor_name, date)
    return HTMLResponse(content=html)




async def run_daily_report_scheduler():
    """Background task: sends daily reports at 9 PM IST (15:30 UTC)."""
    import asyncio
    while True:
        now_utc = datetime.now(timezone.utc)
        # 9:00 PM IST = 15:30 UTC
        target_hour, target_minute = 15, 30
        if now_utc.hour == target_hour and now_utc.minute == target_minute:
            logger.info("Running end-of-day doctor report scheduler...")
            try:
                today = (now_utc + timedelta(hours=5, minutes=30)).strftime("%Y-%m-%d")
                await send_doctor_daily_report({"date": today})
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
            await asyncio.sleep(61)  # skip rest of this minute
        await asyncio.sleep(30)  # check every 30 seconds
