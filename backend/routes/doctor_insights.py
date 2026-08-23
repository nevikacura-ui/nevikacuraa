"""
Doctor Insights AI Panel — Gemini-powered patient trend analysis for doctors.
"""

import os
import re
import json
import uuid
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import jwt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/doctor-insights", tags=["Doctor Insights"])

db = None
JWT_SECRET = os.environ.get("JWT_SECRET", "nevika-cura-jwt-secret-key-2025")

def set_db(database):
    global db
    db = database


@router.get("/summary/{doctor_name}")
async def get_doctor_insights(doctor_name: str, days: int = 30):
    """Get AI-powered insights for a doctor"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")

    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")

    try:
        # Gather data
        appointments = await db.appointments.find(
            {"doctor": {"$regex": doctor_name, "$options": "i"}, "date": {"$gte": cutoff}},
            {"_id": 0, "status": 1, "date": 1, "time": 1, "patient_name": 1, "appointment_type": 1, "source": 1}
        ).to_list(500)

        total = len(appointments)
        completed = len([a for a in appointments if a.get("status") == "Completed"])
        cancelled = len([a for a in appointments if a.get("status") in ("Cancelled", "cancelled")])
        voice = len([a for a in appointments if a.get("source") == "voice_booking"])

        # Peak hours
        hour_counts = {}
        for apt in appointments:
            t = apt.get("time", "")
            if t:
                h = t.split(":")[0] if ":" in t else ""
                if h:
                    hour_counts[h] = hour_counts.get(h, 0) + 1
        peak_hours = sorted(hour_counts.items(), key=lambda x: -x[1])[:3]

        # Busiest days
        day_counts = {}
        for apt in appointments:
            d = apt.get("date", "")
            if d:
                try:
                    wd = datetime.strptime(d, "%Y-%m-%d").strftime("%A")
                    day_counts[wd] = day_counts.get(wd, 0) + 1
                except Exception:
                    pass
        busiest_days = sorted(day_counts.items(), key=lambda x: -x[1])[:3]

        # Generate AI insight
        ai_insight = None
        emergent_key = os.environ.get('EMERGENT_LLM_KEY')
        if emergent_key and total > 0:
            try:
                from emergentintegrations.llm.chat import LlmChat, UserMessage

                chat = LlmChat(
                    api_key=emergent_key,
                    session_id=f"doc-insight-{uuid.uuid4().hex[:8]}",
                    system_message="You are a healthcare analytics assistant. Provide brief, actionable insights for doctors based on their appointment data. Be concise (3-4 bullet points max)."
                ).with_model("gemini", "gemini-2.5-flash")

                prompt = f"""Analyze this doctor's appointment data for the last {days} days:
- Total appointments: {total}
- Completed: {completed} ({round(completed/total*100) if total else 0}%)
- Cancelled: {cancelled}
- Voice bookings: {voice}
- Peak hours: {', '.join([f'{h}:00 ({c} appts)' for h,c in peak_hours])}
- Busiest days: {', '.join([f'{d} ({c})' for d,c in busiest_days])}

Provide 3-4 brief, actionable insights as a JSON array of strings. No markdown."""

                response = await chat.send_message(UserMessage(text=prompt))
                cleaned = response.strip()
                if cleaned.startswith("```"):
                    cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
                    cleaned = re.sub(r'\s*```$', '', cleaned)
                json_match = re.search(r'\[[\s\S]*\]', cleaned)
                if json_match:
                    ai_insight = json.loads(json_match.group())

            except Exception as e:
                logger.warning(f"AI insight error: {e}")

        return {
            "doctor": doctor_name,
            "period_days": days,
            "total_appointments": total,
            "completed": completed,
            "cancelled": cancelled,
            "voice_booked": voice,
            "completion_rate": round(completed / total * 100, 1) if total > 0 else 0,
            "peak_hours": [{"hour": f"{h}:00", "count": c} for h, c in peak_hours],
            "busiest_days": [{"day": d, "count": c} for d, c in busiest_days],
            "ai_insights": ai_insight or ["No data available for insights"],
        }
    except Exception as e:
        logger.error(f"Doctor insights error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
