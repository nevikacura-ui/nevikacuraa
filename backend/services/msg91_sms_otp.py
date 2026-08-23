"""
Nevika Cura - MSG91 SMS OTP Service (Flow API)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Self-generated OTP → SHA-256 hashed → stored in MongoDB → sent via MSG91 Flow API.
MSG91's /api/v5/otp endpoint does NOT work with DLT-approved SMS templates.
The correct endpoint is /api/v5/flow/ with authkey header (lowercase, no Bearer).
"""

import hashlib
import httpx
import logging
import os
import secrets
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

# ── DB reference ──
db = None

def set_db(database):
    global db
    db = database

# ── Constants ──
OTP_TTL_MINUTES = 10
OTP_MAX_ATTEMPTS = 5
RESEND_COOLDOWN_SECONDS = 30
MAX_OTP_PER_HOUR = 5
MAX_OTP_PER_DAY = 10
FLOW_URL = "https://control.msg91.com/api/v5/flow/"


def normalize_phone(raw: str) -> str | None:
    """Strip non-digits, ensure 91XXXXXXXXXX format. Returns None if invalid."""
    d = "".join(c for c in str(raw) if c.isdigit())
    if len(d) == 10 and d[0] in "6789":
        return f"91{d}"
    if len(d) == 12 and d.startswith("91"):
        return d
    return None


def generate_otp() -> str:
    """Cryptographically random 6-digit OTP."""
    return str(100000 + secrets.randbelow(900000))


def hash_otp(phone: str, code: str) -> str:
    """SHA-256 hash of phone:code for secure storage."""
    return hashlib.sha256(f"{phone}:{code}".encode()).hexdigest()


async def _audit(phone: str, action: str, status: str, error: str = None, ip: str = None):
    """Write to otp_audit collection."""
    if db is None:
        return
    try:
        await db.otp_audit.insert_one({
            "phone": phone,
            "action": action,
            "status": status,
            "error": error,
            "ip": ip,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        logger.warning(f"Audit write failed: {e}")


async def _check_rate_limits(phone: str) -> dict | None:
    """Returns error dict if rate-limited, else None."""
    if db is None:
        return None

    now = datetime.now(timezone.utc)

    # 30-second cooldown
    last_sent = await db.otp_audit.find_one(
        {"phone": phone, "action": "send", "status": "success"},
        sort=[("created_at", -1)],
    )
    if last_sent:
        try:
            last_ts = datetime.fromisoformat(last_sent["created_at"])
            if last_ts.tzinfo is None:
                last_ts = last_ts.replace(tzinfo=timezone.utc)
            diff = (now - last_ts).total_seconds()
            if diff < RESEND_COOLDOWN_SECONDS:
                wait = int(RESEND_COOLDOWN_SECONDS - diff)
                return {"error": f"Please wait {wait}s before requesting another OTP", "retry_after": wait, "status": 429}
        except Exception:
            pass

    # 5 per hour
    hour_ago = (now - timedelta(hours=1)).isoformat()
    hour_count = await db.otp_audit.count_documents({
        "phone": phone, "action": "send", "status": "success",
        "created_at": {"$gte": hour_ago},
    })
    if hour_count >= MAX_OTP_PER_HOUR:
        return {"error": "Too many OTP requests. Try again in an hour.", "retry_after": 3600, "status": 429}

    # 10 per day
    day_ago = (now - timedelta(hours=24)).isoformat()
    day_count = await db.otp_audit.count_documents({
        "phone": phone, "action": "send", "status": "success",
        "created_at": {"$gte": day_ago},
    })
    if day_count >= MAX_OTP_PER_DAY:
        return {"error": "Daily OTP limit reached. Try again tomorrow.", "retry_after": 86400, "status": 429}

    return None


async def _send_via_flow(mobile: str, code: str) -> dict:
    """Send SMS via MSG91 Flow API. Header: authkey (lowercase, no Bearer)."""
    authkey = os.environ.get("MSG91_SMS_AUTH_KEY", "")
    template_id = os.environ.get("MSG91_SMS_TEMPLATE_ID", "6a67114083eac80188062975")
    sender = os.environ.get("MSG91_SMS_SENDER_ID", "NEVIKA")

    if not authkey:
        return {"ok": False, "error": "OTP service not configured (missing auth key)"}

    payload = {
        "template_id": template_id,
        "sender": sender,
        "short_url": "0",
        "realTimeResponse": "1",
        "recipients": [
            {"mobiles": mobile, "OTP": code, "var1": code}
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                FLOW_URL,
                json=payload,
                headers={
                    "authkey": authkey,
                    "Content-Type": "application/json",
                    "accept": "application/json",
                },
            )
            data = resp.json()

        logger.info(f"MSG91 Flow response: status={resp.status_code}, data={data}")

        if resp.status_code >= 400 or data.get("type") == "error":
            err_msg = data.get("message", str(data)) if isinstance(data.get("message"), str) else f"HTTP {resp.status_code}"
            return {"ok": False, "error": err_msg}

        return {"ok": True}

    except Exception as e:
        logger.error(f"MSG91 Flow API error: {e}")
        return {"ok": False, "error": str(e)}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PUBLIC API
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


async def send_sms_otp(phone: str, purpose: str = "verification", ip: str = None) -> dict:
    """Generate OTP, store hash, send via MSG91 Flow API."""
    mobile = normalize_phone(phone)
    if not mobile:
        return {"success": False, "error": "Invalid phone number. Use 10-digit Indian mobile.", "status": 400}

    # Rate-limit check
    rl = await _check_rate_limits(mobile)
    if rl:
        await _audit(mobile, "send", "rate_limited", rl["error"], ip)
        return {"success": False, "error": rl["error"], "retry_after": rl.get("retry_after"), "status": rl.get("status", 429)}

    code = generate_otp()
    code_hash = hash_otp(mobile, code)
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES)).isoformat()

    # Invalidate any previous active OTPs for this phone
    if db is not None:
        await db.otp_codes.update_many(
            {"phone": mobile, "consumed_at": None},
            {"$set": {"consumed_at": datetime.now(timezone.utc).isoformat()}},
        )
        await db.otp_codes.insert_one({
            "phone": mobile,
            "code_hash": code_hash,
            "attempts": 0,
            "expires_at": expires_at,
            "consumed_at": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    # Send via MSG91 Flow
    result = await _send_via_flow(mobile, code)
    if not result["ok"]:
        await _audit(mobile, "send", "failed", result["error"], ip)
        return {"success": False, "error": f"SMS delivery failed: {result['error']}", "status": 500}

    await _audit(mobile, "send", "success", ip=ip)
    return {
        "success": True,
        "message": f"OTP sent to +{mobile[:2]}******{mobile[-4:]}",
        "expires_in": OTP_TTL_MINUTES * 60,
        "phone_masked": f"******{mobile[-4:]}",
    }


async def verify_sms_otp(phone: str, otp: str, ip: str = None) -> dict:
    """Verify OTP against stored hash. Self-verified, NOT via MSG91."""
    mobile = normalize_phone(phone)
    if not mobile:
        return {"success": False, "error": "Invalid phone number.", "status": 400}

    if db is None:
        return {"success": False, "error": "Database not available.", "status": 500}

    # Find the latest unconsumed OTP for this phone
    row = await db.otp_codes.find_one(
        {"phone": mobile, "consumed_at": None},
        sort=[("created_at", -1)],
    )

    if not row:
        await _audit(mobile, "verify", "failed", "No active OTP", ip)
        return {"success": False, "error": "No active OTP. Request a new code.", "status": 400}

    # Check expiry
    try:
        exp = datetime.fromisoformat(row["expires_at"])
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < datetime.now(timezone.utc):
            await db.otp_codes.update_one({"_id": row["_id"]}, {"$set": {"consumed_at": datetime.now(timezone.utc).isoformat()}})
            await _audit(mobile, "verify", "failed", "OTP expired", ip)
            return {"success": False, "error": "OTP expired. Request a new code.", "status": 400}
    except Exception:
        pass

    # Check attempts
    if row.get("attempts", 0) >= OTP_MAX_ATTEMPTS:
        await db.otp_codes.update_one({"_id": row["_id"]}, {"$set": {"consumed_at": datetime.now(timezone.utc).isoformat()}})
        await _audit(mobile, "verify", "failed", "Max attempts exceeded", ip)
        return {"success": False, "error": "Too many attempts. Request a new code.", "status": 429}

    # Verify hash
    if hash_otp(mobile, otp) != row["code_hash"]:
        new_attempts = row.get("attempts", 0) + 1
        await db.otp_codes.update_one({"_id": row["_id"]}, {"$set": {"attempts": new_attempts}})
        left = OTP_MAX_ATTEMPTS - new_attempts
        await _audit(mobile, "verify", "failed", f"Wrong OTP, {left} left", ip)
        return {"success": False, "error": f"Incorrect OTP. {left} attempt(s) left.", "status": 400}

    # Success — consume OTP
    await db.otp_codes.update_one({"_id": row["_id"]}, {"$set": {"consumed_at": datetime.now(timezone.utc).isoformat()}})
    await _audit(mobile, "verify", "success", ip=ip)
    return {"success": True, "message": "OTP verified successfully", "phone": mobile}


async def resend_sms_otp(phone: str, ip: str = None) -> dict:
    """Resend = generate new OTP and send again (old one is invalidated)."""
    return await send_sms_otp(phone, purpose="resend", ip=ip)
