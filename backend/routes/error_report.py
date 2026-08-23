from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/error-report", tags=["Error Reports"])


class ErrorReport(BaseModel):
    error: str
    stack: Optional[str] = ""
    url: Optional[str] = ""
    userAgent: Optional[str] = ""
    timestamp: Optional[str] = ""
    type: Optional[str] = "auto"  # "auto" or "user_reported"


@router.post("")
async def receive_error_report(report: ErrorReport):
    """Receive frontend error reports and email to nevikacura@gmail.com"""
    try:
        from services.notification_service import send_email_notification

        is_user_reported = report.type == "user_reported"
        subject_prefix = "User Reported" if is_user_reported else "Auto-Caught"

        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: {'#f59e0b' if is_user_reported else '#ef4444'}; color: white; padding: 16px 20px; border-radius: 12px 12px 0 0;">
                <h2 style="margin: 0; font-size: 18px;">{subject_prefix} Error — Nevika Cura</h2>
                <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.85;">{report.timestamp or datetime.now(timezone.utc).isoformat()}</p>
            </div>
            <div style="background: #1a1a2e; color: #e2e8f0; padding: 20px; border-radius: 0 0 12px 12px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #94a3b8; font-size: 12px; width: 80px; vertical-align: top;">Type</td>
                        <td style="padding: 8px 0; font-size: 13px;">
                            <span style="background: {'#f59e0b33' if is_user_reported else '#ef444433'}; color: {'#fbbf24' if is_user_reported else '#f87171'}; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600;">
                                {subject_prefix.upper()}
                            </span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #94a3b8; font-size: 12px; vertical-align: top;">Error</td>
                        <td style="padding: 8px 0; font-size: 13px; color: #f87171; font-weight: 500;">{report.error}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #94a3b8; font-size: 12px; vertical-align: top;">Page</td>
                        <td style="padding: 8px 0; font-size: 13px;">{report.url}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #94a3b8; font-size: 12px; vertical-align: top;">Device</td>
                        <td style="padding: 8px 0; font-size: 11px; color: #64748b; word-break: break-all;">{report.userAgent}</td>
                    </tr>
                </table>
                {"<div style='margin-top: 16px; padding: 12px; background: #0f172a; border-radius: 8px; font-family: monospace; font-size: 11px; color: #94a3b8; white-space: pre-wrap; max-height: 300px; overflow-y: auto;'>" + report.stack.replace('<', '&lt;').replace('>', '&gt;') + "</div>" if report.stack else ""}
            </div>
        </div>
        """

        await send_email_notification(
            subject=f"[{subject_prefix}] {report.error[:80]}",
            html_content=html_content
        )

        logger.info(f"Error report emailed: {report.type} - {report.error[:100]}")
        return {"success": True, "message": "Report sent to team"}

    except Exception as e:
        logger.error(f"Failed to send error report email: {e}")
        return {"success": False, "message": "Report received but email failed"}
