"""
AI-Powered Health Insights using Claude via Emergent LLM
Analyzes user health data and generates personalized recommendations
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from utils.sanitize import sanitize_ai_input
import os
import uuid
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")
db = None

def init_db(database):
    global db
    db = database

class AnalyzeRequest(BaseModel):
    phone: str
    query: Optional[str] = None

async def _get_ai_analysis(health_data: dict, query: str = None) -> dict:
    """Use Claude via emergentintegrations to analyze health data"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            return None

        system_msg = """You are a professional health analyst AI for Nevika Cura, a healthcare platform in India.
Analyze the patient's health data and provide insights. Be specific, actionable, and empathetic.
Always respond in valid JSON with these keys:
- ai_summary: A 2-3 sentence overview of the patient's health status
- risk_factors: Array of {level: "high"|"medium"|"low", title: string, description: string, action: string}
- recommendations: Array of {category: string, tip: string, priority: "high"|"medium"|"low"}
- positive_trends: Array of strings highlighting good health behaviors
- next_steps: Array of specific actionable steps the patient should take
Do NOT include any markdown formatting or code blocks. Return ONLY the JSON object."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"health-{uuid.uuid4().hex[:8]}",
            system_message=system_msg,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        prompt = f"Patient health data:\n{json.dumps(health_data, indent=2)}"
        if query:
            prompt += f"\n\nPatient's specific question: {sanitize_ai_input(query)}"

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)

        # Parse JSON from response
        text = response.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        return json.loads(text)
    except json.JSONDecodeError:
        logger.warning("AI returned non-JSON, using raw text")
        return {"ai_summary": response, "risk_factors": [], "recommendations": [], "positive_trends": [], "next_steps": []}
    except Exception as e:
        logger.error(f"AI analysis error: {e}")
        return None


@router.post("/ai-health-insights")
async def get_ai_health_insights(req: AnalyzeRequest):
    """Generate AI-powered health insights from user's health history"""
    clean = req.phone[-10:]

    # Gather all health data
    appointments = await db.appointments.find(
        {"patient_phone": clean}, {"_id": 0}
    ).sort("date", -1).to_list(15)

    pharmacy_orders = await db.pharmacy_orders.find(
        {"phone": clean}, {"_id": 0}
    ).sort("created_at", -1).to_list(10)

    lab_orders = await db.diagnostic_orders.find(
        {"phone": clean}, {"_id": 0}
    ).sort("created_at", -1).to_list(10)

    streak = await db.health_streaks.find_one({"phone": clean}, {"_id": 0})
    wallet = await db.cura_wallets.find_one({"phone": clean}, {"_id": 0})

    health_data = {
        "total_consultations": len(appointments),
        "total_lab_tests": len(lab_orders),
        "total_pharmacy_orders": len(pharmacy_orders),
        "recent_appointments": [
            {"date": a.get("date"), "doctor": a.get("doctor_name"), "type": a.get("visit_type", "consultation")}
            for a in appointments[:5]
        ],
        "recent_lab_tests": [
            {"date": o.get("created_at"), "tests": o.get("tests", []), "status": o.get("status")}
            for o in lab_orders[:5]
        ],
        "recent_medicines": [
            {"date": o.get("created_at"), "items": [i.get("name") for i in o.get("items", [])[:3]]}
            for o in pharmacy_orders[:5]
        ],
        "health_streak": {
            "current": streak.get("current_streak", 0) if streak else 0,
            "longest": streak.get("longest_streak", 0) if streak else 0,
        },
        "loyalty_tier": wallet.get("tier", "none") if wallet else "none",
    }

    # Get AI analysis
    ai_result = await _get_ai_analysis(health_data, req.query)

    if ai_result:
        # Store the insight for history
        insight_doc = {
            "phone": clean,
            "type": "ai_analysis",
            "data": ai_result,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.health_ai_insights.insert_one(insight_doc)

        return {
            "success": True,
            "source": "ai",
            "ai_summary": ai_result.get("ai_summary", ""),
            "risk_factors": ai_result.get("risk_factors", []),
            "recommendations": ai_result.get("recommendations", []),
            "positive_trends": ai_result.get("positive_trends", []),
            "next_steps": ai_result.get("next_steps", []),
            "health_data": health_data,
        }
    else:
        # Fallback to rule-based insights
        return {
            "success": True,
            "source": "rules",
            "ai_summary": "AI analysis is currently unavailable. Here are your basic health insights based on your activity.",
            "risk_factors": [],
            "recommendations": [
                {"category": "Prevention", "tip": "Regular health checkups can detect issues early", "priority": "high"},
                {"category": "Nutrition", "tip": "Include seasonal fruits and vegetables in your diet", "priority": "medium"},
            ],
            "positive_trends": [],
            "next_steps": ["Book a routine health checkup", "Complete any pending lab tests"],
            "health_data": health_data,
        }


@router.get("/ai-health-insights/history/{phone}")
async def get_insight_history(phone: str, limit: int = 10):
    """Get past AI health insights"""
    clean = phone[-10:]
    insights = await db.health_ai_insights.find(
        {"phone": clean}, {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    return {"insights": insights}
