"""
Nevika Cura - Automated Scheduler
Handles periodic tasks like reminders via cron-like scheduling.

Run as a background process: python scheduler.py &
Or set up via system cron/supervisor
"""

import asyncio
import aiohttp
import logging
import os
from datetime import datetime, timezone, timedelta

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("nevika_scheduler")

# Configuration
API_URL = os.environ.get("API_URL", "https://patient-nexus.preview.emergentagent.com")
CRON_SECRET = os.environ.get("CRON_SECRET", "nevika_cron_2026")

# Scheduler intervals (in seconds)
REMINDER_CHECK_INTERVAL = 15 * 60  # Every 15 minutes


async def call_cron_endpoint(session: aiohttp.ClientSession, endpoint: str, name: str):
    """Call a cron endpoint and log the result"""
    try:
        url = f"{API_URL}/api/cron/{endpoint}?secret={CRON_SECRET}"
        async with session.post(url, timeout=aiohttp.ClientTimeout(total=60)) as resp:
            if resp.status == 200:
                result = await resp.json()
                logger.info(f"✅ {name}: {result.get('summary', 'Success')}")
                return result
            else:
                error_text = await resp.text()
                logger.error(f"❌ {name} failed (HTTP {resp.status}): {error_text}")
                return None
    except asyncio.TimeoutError:
        logger.error(f"❌ {name} timed out")
        return None
    except Exception as e:
        logger.error(f"❌ {name} error: {e}")
        return None


async def run_all_reminders():
    """Execute all reminder cron jobs"""
    logger.info("🔔 Running scheduled reminders...")
    
    async with aiohttp.ClientSession() as session:
        # Run all reminder jobs concurrently
        tasks = [
            call_cron_endpoint(session, "appointment-reminders", "Appointment Reminders"),
            call_cron_endpoint(session, "sonography-reminders", "Sonography Reminders"),
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        success_count = sum(1 for r in results if r and isinstance(r, dict) and r.get('success'))
        logger.info(f"📊 Reminder batch complete: {success_count}/{len(tasks)} succeeded")
        
        return results


async def run_daily_tasks():
    """Execute daily maintenance tasks (run once at 9 AM IST)"""
    logger.info("📅 Running daily maintenance tasks...")
    
    async with aiohttp.ClientSession() as session:
        # Check expiring subscriptions
        await call_cron_endpoint(session, "check-expiring-subscriptions", "Subscription Check")


async def scheduler_loop():
    """Main scheduler loop - runs continuously"""
    logger.info("=" * 50)
    logger.info("🚀 Nevika Cura Scheduler Started")
    logger.info(f"📡 API URL: {API_URL}")
    logger.info(f"⏱️  Reminder interval: {REMINDER_CHECK_INTERVAL // 60} minutes")
    logger.info("=" * 50)
    
    last_daily_run = None
    
    while True:
        try:
            # Get current IST time
            ist_offset = timedelta(hours=5, minutes=30)
            now_utc = datetime.now(timezone.utc)
            now_ist = now_utc + ist_offset
            
            # Run reminders every interval
            logger.info(f"⏰ Scheduler check at {now_ist.strftime('%Y-%m-%d %H:%M:%S')} IST")
            await run_all_reminders()
            
            # Run daily tasks at 9 AM IST (once per day)
            current_date = now_ist.date()
            if now_ist.hour == 9 and now_ist.minute < 20:
                if last_daily_run != current_date:
                    await run_daily_tasks()
                    last_daily_run = current_date
            
        except Exception as e:
            logger.error(f"🔥 Scheduler error: {e}")
        
        # Wait for next interval
        await asyncio.sleep(REMINDER_CHECK_INTERVAL)


def run_once():
    """Run all reminders once (useful for manual testing)"""
    logger.info("🔄 Running one-time reminder check...")
    asyncio.run(run_all_reminders())
    logger.info("✅ One-time check complete")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--once":
        # Run once for testing
        run_once()
    else:
        # Run continuous scheduler
        asyncio.run(scheduler_loop())
