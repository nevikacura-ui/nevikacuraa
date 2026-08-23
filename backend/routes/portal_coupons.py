"""
Portal Coupon Generator & Email Sender
Generates coupons for each portal (Glydex, Evara, etc.) and sends to admin email
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import random
import string

router = APIRouter(prefix="/coupons", tags=["Portal Coupons"])

db = None

def set_db(database):
    global db
    db = database

PORTALS = {
    "glydex": {"name": "Glydex", "discount": 10, "color": "#3B82F6"},
    "evara": {"name": "Evara", "discount": 15, "color": "#EC4899"},
    "reneu": {"name": "Reneu", "discount": 10, "color": "#8B5CF6"},
    "alyne": {"name": "Alyne", "discount": 12, "color": "#14B8A6"},
    "nutricare": {"name": "Nutricare", "discount": 10, "color": "#F97316"},
}

def generate_code(portal: str, index: int) -> str:
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"{portal.upper()}{index+1:03d}{suffix}"


@router.post("/generate-and-send")
async def generate_and_send_coupons(count_per_portal: int = 50):
    """Generate coupons for all portals and email them to admin"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    all_coupons = []
    expiry = datetime.now(timezone.utc) + timedelta(days=90)

    for portal_key, portal_info in PORTALS.items():
        portal_coupons = []
        for i in range(count_per_portal):
            code = generate_code(portal_key, i)
            coupon = {
                "code": code,
                "portal": portal_key,
                "portal_name": portal_info["name"],
                "discount_percent": portal_info["discount"],
                "max_uses": 1,
                "used_count": 0,
                "active": True,
                "expires_at": expiry.isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            portal_coupons.append(coupon)
        all_coupons.extend(portal_coupons)

    # Store in DB
    if all_coupons:
        await db.portal_coupons.insert_many(all_coupons)

    # Build email HTML
    html = _build_coupon_email_html(all_coupons, count_per_portal)

    # Send email via Resend
    try:
        from services.email import send_email_notification
        await send_email_notification(
            subject=f"Portal Coupons Generated — {len(all_coupons)} codes",
            html_content=html,
        )
    except Exception as e:
        return {
            "success": True,
            "message": f"Generated {len(all_coupons)} coupons. Email send failed: {str(e)}",
            "total_generated": len(all_coupons),
            "email_sent": False,
        }

    return {
        "success": True,
        "message": f"Generated {len(all_coupons)} coupons and emailed to admin",
        "total_generated": len(all_coupons),
        "per_portal": count_per_portal,
        "portals": list(PORTALS.keys()),
        "email_sent": True,
    }


@router.get("/list")
async def list_portal_coupons(portal: Optional[str] = None, active_only: bool = True):
    """List generated portal coupons"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    query = {}
    if portal:
        query["portal"] = portal
    if active_only:
        query["active"] = True

    coupons = await db.portal_coupons.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"success": True, "coupons": coupons, "count": len(coupons)}


def _build_coupon_email_html(coupons: list, per_portal: int) -> str:
    """Build a nicely formatted HTML email with all coupons"""
    portal_groups = {}
    for c in coupons:
        key = c["portal"]
        if key not in portal_groups:
            portal_groups[key] = []
        portal_groups[key].append(c)

    sections = ""
    for portal_key, group in portal_groups.items():
        info = PORTALS.get(portal_key, {})
        codes_html = ", ".join([f'<code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:12px;">{c["code"]}</code>' for c in group])
        sections += f"""
        <div style="margin-bottom:24px;padding:16px;border:1px solid #e5e7eb;border-radius:12px;">
            <h3 style="color:{info.get('color','#333')};margin:0 0 8px 0;">{info.get('name', portal_key)} — {info.get('discount',10)}% Off ({len(group)} codes)</h3>
            <p style="font-size:13px;color:#6b7280;line-height:1.6;">{codes_html}</p>
        </div>
        """

    return f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#1F4F46,#2E6B5F);padding:24px;border-radius:12px 12px 0 0;">
            <h1 style="color:white;margin:0;font-size:22px;">Nevika Cura — Portal Coupons</h1>
            <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:14px;">Generated {len(coupons)} coupon codes ({per_portal} per portal)</p>
        </div>
        <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px;">
            {sections}
            <p style="font-size:12px;color:#9ca3af;margin-top:16px;">Valid for 90 days. Single use per coupon.</p>
        </div>
    </div>
    """
