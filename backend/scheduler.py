import asyncio
import aiohttp
import logging
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scheduler")

API_URL = "https://medcare-connect-12.preview.emergentagent.com"
CRON_SECRET = "nevikacura_cron_2026"

async def send_reminders():
    """Send all due reminders"""
    async with aiohttp.ClientSession() as session:
        # 1. Follow-up reminders
        try:
            async with session.post(
                f"{API_URL}/api/cron/send-follow-up-reminders?secret={CRON_SECRET}"
            ) as resp:
                result = await resp.json()
                logger.info(f"Follow-up reminders: {result}")
        except Exception as e:
            logger.error(f"Follow-up reminder error: {e}")

async def run_scheduler():
    """Run scheduler - checks every hour if it's 9 AM"""
    logger.info("Scheduler started")
    while True:
        now = datetime.now(timezone.utc)
        # Run at 9 AM UTC (adjust for your timezone)
        if now.hour == 9 and now.minute < 5:
            logger.info("Running daily reminders...")
            await send_reminders()
        await asyncio.sleep(300)  # Check every 5 minutes

if __name__ == "__main__":
    asyncio.run(run_scheduler())
