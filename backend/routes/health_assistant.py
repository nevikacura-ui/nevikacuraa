from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import os
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health-assistant", tags=["AI Health Assistant"])

db = None

def set_db(database):
    global db
    db = database

# ── Models ──

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None
    phone: Optional[str] = None

class SessionRequest(BaseModel):
    phone: str

# ── AI Chat Endpoint ──

@router.post("/chat")
async def chat_with_assistant(req: ChatMessage):
    """Send a message to the AI Health Assistant and get a response"""
    session_id = req.session_id or str(uuid.uuid4())

    # Get conversation history
    history = []
    if req.session_id:
        session = await db.health_assistant_sessions.find_one(
            {"session_id": session_id}, {"_id": 0}
        )
        if session:
            history = session.get("messages", [])

    # Build context from user's health data if phone provided
    health_context = ""
    if req.phone:
        user = await db.users.find_one({"phone": req.phone}, {"_id": 0, "name": 1, "dob": 1, "gender": 1})
        if user:
            health_context += f"\nPatient: {user.get('name', 'Unknown')}"
            if user.get('gender'): health_context += f", Gender: {user['gender']}"

        # Recent appointments
        recent_apts = await db.appointments.find(
            {"phone": req.phone}, {"_id": 0, "doctor_name": 1, "specialty": 1, "date": 1}
        ).sort("date", -1).limit(3).to_list(3)
        if recent_apts:
            health_context += "\nRecent visits: " + "; ".join(
                f"{a.get('doctor_name', '')} ({a.get('specialty', '')}) on {a.get('date', '')}" for a in recent_apts
            )

    # Build conversation for LLM
    system_prompt = f"""You are CuraBot, Nevika Cura's AI Health Assistant. You are a helpful, empathetic, and knowledgeable health advisor.

IMPORTANT RULES:
- You are NOT a doctor. Always recommend consulting a qualified physician for diagnosis/treatment.
- Provide general health information, wellness tips, first-aid guidance, and lifestyle advice.
- For emergencies, IMMEDIATELY advise calling 112 (India emergency) or going to the nearest hospital.
- Be culturally sensitive to Indian healthcare context (Ayurveda, yoga, diet).
- Support queries about medicines, symptoms, nutrition, mental health, fitness.
- Keep responses concise (2-4 paragraphs max) and easy to understand.
- Use simple language, avoid complex medical jargon.
- If asked about specific medicines, mention generic names and advise consulting a doctor for dosage.
{health_context}
"""

    # Build recent conversation context for the prompt
    recent_context = ""
    if history:
        recent_msgs = history[-8:]  # Last 8 messages for context
        for msg in recent_msgs:
            role = "Patient" if msg["role"] == "user" else "CuraBot"
            recent_context += f"\n{role}: {msg['content']}"

    if recent_context:
        system_prompt += f"\n\nRecent conversation:{recent_context}\n"

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        emergent_key = os.environ.get("EMERGENT_LLM_KEY")

        chat = LlmChat(
            api_key=emergent_key,
            session_id=f"health-assistant-{session_id[:8]}",
            system_message=system_prompt
        ).with_model("gemini", "gemini-2.5-flash")

        response = await chat.send_message(UserMessage(text=req.message))
        ai_reply = response if isinstance(response, str) else str(response)

    except Exception as e:
        logger.error(f"AI chat error: {e}")
        ai_reply = "I'm having trouble connecting right now. For any health emergency, please call 112 or visit your nearest hospital. For non-urgent queries, please try again in a moment."

    # Save to session
    new_messages = history + [
        {"role": "user", "content": req.message, "timestamp": datetime.now(timezone.utc).isoformat()},
        {"role": "assistant", "content": ai_reply, "timestamp": datetime.now(timezone.utc).isoformat()},
    ]

    await db.health_assistant_sessions.update_one(
        {"session_id": session_id},
        {"$set": {
            "session_id": session_id,
            "phone": req.phone or "",
            "messages": new_messages,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True
    )

    return {
        "session_id": session_id,
        "reply": ai_reply,
        "message_count": len(new_messages),
    }


@router.get("/sessions/{phone}")
async def get_sessions(phone: str):
    """Get all chat sessions for a user"""
    sessions = await db.health_assistant_sessions.find(
        {"phone": phone},
        {"_id": 0, "session_id": 1, "updated_at": 1, "messages": {"$slice": -1}}
    ).sort("updated_at", -1).to_list(20)

    result = []
    for s in sessions:
        last_msg = s.get("messages", [{}])[-1] if s.get("messages") else {}
        result.append({
            "session_id": s["session_id"],
            "updated_at": s.get("updated_at", ""),
            "preview": last_msg.get("content", "")[:80] if last_msg else "",
        })

    return {"sessions": result}


@router.get("/session/{session_id}")
async def get_session(session_id: str):
    """Get a specific chat session with full history"""
    session = await db.health_assistant_sessions.find_one(
        {"session_id": session_id}, {"_id": 0}
    )
    if not session:
        raise HTTPException(404, "Session not found")
    return session


@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a chat session"""
    await db.health_assistant_sessions.delete_one({"session_id": session_id})
    return {"message": "Session deleted"}


# ── Quick Health Tips ──

@router.get("/tips")
async def get_health_tips():
    """Get daily health tips"""
    tips = [
        {"category": "Nutrition", "tip": "Include seasonal fruits in your diet. Indian gooseberry (amla) boosts immunity naturally.", "icon": "apple"},
        {"category": "Hydration", "tip": "Drink at least 8 glasses of water daily. Add jeera (cumin) water for better digestion.", "icon": "droplet"},
        {"category": "Exercise", "tip": "30 minutes of brisk walking daily reduces heart disease risk by 35%.", "icon": "footprints"},
        {"category": "Sleep", "tip": "Maintain a consistent sleep schedule. 7-8 hours of sleep boosts immunity and memory.", "icon": "moon"},
        {"category": "Mental Health", "tip": "Practice 10 minutes of pranayama (breathing exercises) daily for stress relief.", "icon": "brain"},
        {"category": "Preventive Care", "tip": "Get your blood sugar and BP checked every 6 months after age 30.", "icon": "heart-pulse"},
    ]
    return {"tips": tips}
