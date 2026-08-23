"""
Platform Report API — Trigger reports manually + admin view.
"""

import os
import logging
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/platform-report", tags=["Platform Report"])

db = None

def set_db(database):
    global db
    db = database
    from utils.platform_reports import set_db as set_report_db
    set_report_db(database)


@router.get("/stats")
async def get_platform_stats(days: int = 1):
    """Get platform stats for admin dashboard"""
    from utils.platform_reports import gather_platform_stats
    stats = await gather_platform_stats(days)
    return stats


@router.post("/send")
async def trigger_report(report_type: str = "daily"):
    """Manually trigger a report email"""
    if report_type not in ("daily", "weekly"):
        raise HTTPException(status_code=400, detail="report_type must be 'daily' or 'weekly'")
    from utils.platform_reports import send_report_email
    success = await send_report_email(report_type)
    if success:
        return {"success": True, "message": f"{report_type.capitalize()} report sent to nevikacura@gmail.com"}
    raise HTTPException(status_code=500, detail="Failed to send report. Check Resend API key.")
