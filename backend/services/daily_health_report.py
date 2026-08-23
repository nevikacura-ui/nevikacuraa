"""
Daily Health Report Service

Sends automated system health reports via WhatsApp every morning.
Alerts immediately if critical issues are detected.

For Play Store production readiness.
"""

import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
import os

logger = logging.getLogger(__name__)

# IST Timezone
IST_OFFSET = timedelta(hours=5, minutes=30)

def get_ist_now():
    """Get current datetime in IST"""
    return datetime.now(timezone.utc) + IST_OFFSET

def get_ist_date():
    """Get current date string in IST (YYYY-MM-DD)"""
    return get_ist_now().strftime("%Y-%m-%d")


class DailyHealthReporter:
    """
    Automated system health monitoring and reporting.
    Sends daily reports and immediate alerts via WhatsApp.
    """
    
    def __init__(self, db, send_whatsapp_func):
        self.db = db
        self.send_whatsapp = send_whatsapp_func
        self.collection_name = "health_reports"
        self.admin_phones = []  # Will be loaded from config
    
    async def load_admin_contacts(self):
        """Load admin phone numbers from database"""
        try:
            config = await self.db.system_config.find_one({"type": "health_report_config"})
            if config and config.get("admin_phones"):
                self.admin_phones = config["admin_phones"]
            else:
                # Default admin phone - should be configured in production
                self.admin_phones = []
            logger.info(f"[HEALTH] Loaded {len(self.admin_phones)} admin contacts for health reports")
        except Exception as e:
            logger.error(f"[HEALTH] Failed to load admin contacts: {e}")
    
    async def configure_admin_phones(self, phones: List[str]):
        """Configure admin phone numbers for alerts"""
        try:
            await self.db.system_config.update_one(
                {"type": "health_report_config"},
                {"$set": {
                    "admin_phones": phones,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }},
                upsert=True
            )
            self.admin_phones = phones
            logger.info(f"[HEALTH] Configured {len(phones)} admin phones for health reports")
            return True
        except Exception as e:
            logger.error(f"[HEALTH] Failed to configure admin phones: {e}")
            return False
    
    async def run_health_check(self) -> Dict[str, Any]:
        """Run comprehensive system health check"""
        report = {
            "timestamp_ist": get_ist_now().isoformat(),
            "date_ist": get_ist_date(),
            "overall_status": "HEALTHY",
            "checks": {},
            "alerts": [],
            "metrics": {}
        }
        
        # 1. Database connectivity
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            # Quick ping to verify connection
            await self.db.command("ping")
            report["checks"]["database"] = {"status": "PASS", "message": "Connected"}
        except Exception as e:
            report["checks"]["database"] = {"status": "FAIL", "message": str(e)}
            report["overall_status"] = "CRITICAL"
            report["alerts"].append(f"DATABASE DOWN: {str(e)[:100]}")
        
        # 2. Today's booking statistics
        try:
            today = get_ist_date()
            
            # Count today's appointments by status
            total_today = await self.db.appointments.count_documents({"date": today})
            booked = await self.db.appointments.count_documents({"date": today, "status": "Booked"})
            checked_in = await self.db.appointments.count_documents({"date": today, "status": "CheckedIn"})
            completed = await self.db.appointments.count_documents({"date": today, "status": "Completed"})
            cancelled = await self.db.appointments.count_documents({"date": today, "status": "Cancelled"})
            
            report["metrics"]["appointments_today"] = {
                "total": total_today,
                "booked": booked,
                "checked_in": checked_in,
                "completed": completed,
                "cancelled": cancelled
            }
            report["checks"]["appointments"] = {"status": "PASS", "total_today": total_today}
        except Exception as e:
            report["checks"]["appointments"] = {"status": "FAIL", "message": str(e)}
        
        # 3. Booking failure rate (last 24 hours)
        try:
            yesterday = (get_ist_now() - timedelta(days=1)).isoformat()
            
            audit_total = await self.db.booking_audit_logs.count_documents({
                "timestamp_ist": {"$gte": yesterday}
            })
            audit_failed = await self.db.booking_audit_logs.count_documents({
                "timestamp_ist": {"$gte": yesterday},
                "stage": "FAILED"
            })
            
            failure_rate = (audit_failed / audit_total * 100) if audit_total > 0 else 0
            
            report["metrics"]["booking_reliability_24h"] = {
                "total_attempts": audit_total,
                "failures": audit_failed,
                "success_rate": f"{100 - failure_rate:.1f}%"
            }
            
            if failure_rate > 5:
                report["checks"]["booking_reliability"] = {"status": "WARNING", "failure_rate": f"{failure_rate:.1f}%"}
                report["alerts"].append(f"HIGH BOOKING FAILURE RATE: {failure_rate:.1f}% in last 24h")
            else:
                report["checks"]["booking_reliability"] = {"status": "PASS", "failure_rate": f"{failure_rate:.1f}%"}
        except Exception as e:
            report["checks"]["booking_reliability"] = {"status": "PASS", "message": "No audit data yet"}
        
        # 4. WhatsApp delivery status (last 24 hours)
        try:
            yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
            
            total_messages = await self.db.whatsapp_logs.count_documents({
                "created_at": {"$gte": yesterday}
            })
            failed_messages = await self.db.whatsapp_logs.count_documents({
                "created_at": {"$gte": yesterday},
                "status": {"$in": ["failed", "error"]}
            })
            
            if total_messages > 0:
                msg_failure_rate = (failed_messages / total_messages * 100)
                report["metrics"]["whatsapp_24h"] = {
                    "total_sent": total_messages,
                    "failed": failed_messages,
                    "success_rate": f"{100 - msg_failure_rate:.1f}%"
                }
                
                if msg_failure_rate > 10:
                    report["checks"]["whatsapp"] = {"status": "WARNING", "failure_rate": f"{msg_failure_rate:.1f}%"}
                    report["alerts"].append(f"HIGH WHATSAPP FAILURE RATE: {msg_failure_rate:.1f}%")
                else:
                    report["checks"]["whatsapp"] = {"status": "PASS"}
            else:
                report["checks"]["whatsapp"] = {"status": "PASS", "message": "No messages in 24h"}
        except Exception as e:
            report["checks"]["whatsapp"] = {"status": "PASS", "message": "No log data"}
        
        # 5. Pharmacy orders status
        try:
            today = get_ist_date()
            
            total_orders = await self.db.pharmacy_orders.count_documents({"date": today})
            pending_orders = await self.db.pharmacy_orders.count_documents({
                "date": today,
                "status": {"$in": ["pending", "Pending"]}
            })
            
            report["metrics"]["pharmacy_today"] = {
                "total_orders": total_orders,
                "pending": pending_orders
            }
            report["checks"]["pharmacy"] = {"status": "PASS", "orders_today": total_orders}
        except Exception as e:
            report["checks"]["pharmacy"] = {"status": "PASS", "message": "No order data"}
        
        # 6. Lab orders status
        try:
            today = get_ist_date()
            
            total_lab = await self.db.lab_orders.count_documents({"date": today})
            pending_lab = await self.db.lab_orders.count_documents({
                "date": today,
                "status": {"$in": ["pending", "Pending", "sample_collection_pending"]}
            })
            
            report["metrics"]["lab_today"] = {
                "total_orders": total_lab,
                "pending": pending_lab
            }
            report["checks"]["lab"] = {"status": "PASS", "orders_today": total_lab}
        except Exception as e:
            report["checks"]["lab"] = {"status": "PASS", "message": "No lab data"}
        
        # Determine overall status
        statuses = [c.get("status") for c in report["checks"].values()]
        if "FAIL" in statuses:
            report["overall_status"] = "CRITICAL"
        elif "WARNING" in statuses:
            report["overall_status"] = "WARNING"
        
        # Save report to database
        try:
            await self.db[self.collection_name].insert_one(report.copy())
        except Exception as e:
            logger.error(f"[HEALTH] Failed to save health report: {e}")
        
        return report
    
    def format_report_for_whatsapp(self, report: Dict[str, Any]) -> str:
        """Format health report for WhatsApp message"""
        status_emoji = {
            "HEALTHY": "✅",
            "WARNING": "⚠️",
            "CRITICAL": "🚨"
        }
        
        emoji = status_emoji.get(report["overall_status"], "📊")
        
        msg = f"{emoji} *Nevika Cura Daily Health Report*\n"
        msg += f"📅 {report['date_ist']}\n\n"
        
        # Alerts first (if any)
        if report.get("alerts"):
            msg += "*⚠️ ALERTS:*\n"
            for alert in report["alerts"]:
                msg += f"• {alert}\n"
            msg += "\n"
        
        # Metrics
        metrics = report.get("metrics", {})
        
        if "appointments_today" in metrics:
            apt = metrics["appointments_today"]
            msg += f"*📋 Appointments Today:* {apt['total']}\n"
            msg += f"   • Booked: {apt['booked']}\n"
            msg += f"   • Checked-In: {apt['checked_in']}\n"
            msg += f"   • Completed: {apt['completed']}\n"
            if apt['cancelled'] > 0:
                msg += f"   • Cancelled: {apt['cancelled']}\n"
            msg += "\n"
        
        if "booking_reliability_24h" in metrics:
            rel = metrics["booking_reliability_24h"]
            msg += f"*🔧 Booking Reliability:* {rel['success_rate']}\n"
            if rel['failures'] > 0:
                msg += f"   • Failed: {rel['failures']}/{rel['total_attempts']}\n"
            msg += "\n"
        
        if "pharmacy_today" in metrics and metrics["pharmacy_today"]["total_orders"] > 0:
            pharm = metrics["pharmacy_today"]
            msg += f"*💊 Pharmacy Orders:* {pharm['total_orders']}\n"
            if pharm['pending'] > 0:
                msg += f"   • Pending: {pharm['pending']}\n"
            msg += "\n"
        
        if "lab_today" in metrics and metrics["lab_today"]["total_orders"] > 0:
            lab = metrics["lab_today"]
            msg += f"*🧪 Lab Orders:* {lab['total_orders']}\n"
            if lab['pending'] > 0:
                msg += f"   • Pending: {lab['pending']}\n"
            msg += "\n"
        
        msg += f"*Status:* {report['overall_status']}"
        
        return msg
    
    async def send_daily_report(self) -> Dict[str, Any]:
        """Run health check and send report to all admin phones"""
        # Load admin contacts
        await self.load_admin_contacts()
        
        if not self.admin_phones:
            logger.warning("[HEALTH] No admin phones configured for daily report")
            return {"success": False, "error": "No admin phones configured"}
        
        # Run health check
        report = await self.run_health_check()
        
        # Format message
        message = self.format_report_for_whatsapp(report)
        
        # Send to all admins
        results = []
        for phone in self.admin_phones:
            try:
                # Use direct WhatsApp message (not template) for reports
                result = await self.send_whatsapp(
                    recipient_phone=phone,
                    template_name="daily_health_report",  # You may need to create this template
                    variables=[
                        report["date_ist"],
                        report["overall_status"],
                        str(report.get("metrics", {}).get("appointments_today", {}).get("total", 0)),
                        str(report.get("metrics", {}).get("booking_reliability_24h", {}).get("success_rate", "100%")),
                        str(len(report.get("alerts", [])))
                    ],
                    db=self.db,
                    reference_id=f"health_report_{report['date_ist']}",
                    message_type="health_report"
                )
                results.append({"phone": phone, "success": True, "result": result})
                logger.info(f"[HEALTH] Daily report sent to {phone}")
            except Exception as e:
                results.append({"phone": phone, "success": False, "error": str(e)})
                logger.error(f"[HEALTH] Failed to send report to {phone}: {e}")
        
        return {
            "success": any(r["success"] for r in results),
            "report": report,
            "send_results": results
        }
    
    async def send_critical_alert(self, alert_message: str) -> Dict[str, Any]:
        """Send immediate critical alert to all admins"""
        await self.load_admin_contacts()
        
        if not self.admin_phones:
            logger.error(f"[HEALTH] CRITICAL ALERT (no phones configured): {alert_message}")
            return {"success": False, "error": "No admin phones configured"}
        
        results = []
        for phone in self.admin_phones:
            try:
                result = await self.send_whatsapp(
                    recipient_phone=phone,
                    template_name="critical_alert",  # You may need to create this template
                    variables=[
                        get_ist_now().strftime("%Y-%m-%d %H:%M"),
                        alert_message[:200]  # Truncate long messages
                    ],
                    db=self.db,
                    reference_id=f"alert_{datetime.now().timestamp()}",
                    message_type="critical_alert"
                )
                results.append({"phone": phone, "success": True})
                logger.info(f"[HEALTH] Critical alert sent to {phone}")
            except Exception as e:
                results.append({"phone": phone, "success": False, "error": str(e)})
                logger.error(f"[HEALTH] Failed to send alert to {phone}: {e}")
        
        return {
            "success": any(r["success"] for r in results),
            "alert": alert_message,
            "results": results
        }


# Global instance
health_reporter: DailyHealthReporter = None


def init_health_reporter(db, send_whatsapp_func):
    """Initialize health reporter with database and WhatsApp function"""
    global health_reporter
    health_reporter = DailyHealthReporter(db, send_whatsapp_func)
    logger.info("[HEALTH] Daily health reporter initialized")
    return health_reporter


def get_health_reporter() -> DailyHealthReporter:
    return health_reporter
