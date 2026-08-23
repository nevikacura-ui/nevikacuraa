"""
AI Symptom Checker - Matches symptoms to specialists
Uses Claude AI via Emergent integrations
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import os
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/symptom-checker", tags=["Symptom Checker"])

db = None

def set_db(database):
    global db
    db = database

# Body area to symptom mapping
BODY_AREAS = {
    "head": {"label": "Head", "symptoms": ["Headache", "Migraine", "Dizziness", "Blurred vision", "Ear pain", "Sore throat"]},
    "chest": {"label": "Chest", "symptoms": ["Chest pain", "Shortness of breath", "Palpitations", "Cough", "Wheezing"]},
    "abdomen": {"label": "Abdomen", "symptoms": ["Stomach pain", "Nausea", "Bloating", "Acidity", "Diarrhea", "Constipation"]},
    "back": {"label": "Back", "symptoms": ["Lower back pain", "Upper back pain", "Stiffness", "Sciatica"]},
    "arms": {"label": "Arms & Hands", "symptoms": ["Joint pain", "Numbness", "Swelling", "Weakness"]},
    "legs": {"label": "Legs & Feet", "symptoms": ["Knee pain", "Ankle swelling", "Muscle cramps", "Varicose veins"]},
    "skin": {"label": "Skin", "symptoms": ["Rash", "Itching", "Acne", "Dryness", "Discoloration"]},
    "general": {"label": "General", "symptoms": ["Fever", "Fatigue", "Weight loss", "Insomnia", "Anxiety", "Loss of appetite"]}
}

SPECIALIST_MAP = {
    "Headache": "Neurologist", "Migraine": "Neurologist", "Dizziness": "ENT Specialist",
    "Blurred vision": "Ophthalmologist", "Ear pain": "ENT Specialist", "Sore throat": "ENT Specialist",
    "Chest pain": "Cardiologist", "Shortness of breath": "Pulmonologist", "Palpitations": "Cardiologist",
    "Cough": "Pulmonologist", "Wheezing": "Pulmonologist",
    "Stomach pain": "Gastroenterologist", "Nausea": "General Physician", "Bloating": "Gastroenterologist",
    "Acidity": "Gastroenterologist", "Diarrhea": "Gastroenterologist", "Constipation": "Gastroenterologist",
    "Lower back pain": "Orthopedic", "Upper back pain": "Orthopedic", "Stiffness": "Orthopedic", "Sciatica": "Neurologist",
    "Joint pain": "Orthopedic", "Numbness": "Neurologist", "Swelling": "General Physician", "Weakness": "General Physician",
    "Knee pain": "Orthopedic", "Ankle swelling": "General Physician", "Muscle cramps": "Orthopedic", "Varicose veins": "Vascular Surgeon",
    "Rash": "Dermatologist", "Itching": "Dermatologist", "Acne": "Dermatologist", "Dryness": "Dermatologist", "Discoloration": "Dermatologist",
    "Fever": "General Physician", "Fatigue": "General Physician", "Weight loss": "Endocrinologist",
    "Insomnia": "Psychiatrist", "Anxiety": "Psychiatrist", "Loss of appetite": "General Physician"
}


class SymptomInput(BaseModel):
    symptoms: List[str]
    severity: int = 5  # 1-10
    duration_days: int = 1
    age: Optional[int] = None
    gender: Optional[str] = None
    body_area: Optional[str] = None
    additional_notes: Optional[str] = None


class CheckerSession(BaseModel):
    phone: Optional[str] = None
    symptoms: List[str]
    severity: int = 5
    duration_days: int = 1


@router.get("/body-areas")
async def get_body_areas():
    """Get body areas and their associated symptoms"""
    return {"body_areas": BODY_AREAS}


@router.post("/analyze")
async def analyze_symptoms(data: SymptomInput):
    """Analyze symptoms and suggest specialists using AI"""
    # Get specialist recommendations
    specialists = {}
    for symptom in data.symptoms:
        spec = SPECIALIST_MAP.get(symptom, "General Physician")
        if spec not in specialists:
            specialists[spec] = []
        specialists[spec].append(symptom)

    # Build urgency assessment
    urgency = "low"
    if data.severity >= 8 or data.duration_days > 14:
        urgency = "high"
    elif data.severity >= 5 or data.duration_days > 3:
        urgency = "medium"

    # Try AI analysis
    ai_analysis = None
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if api_key:
            system_msg = """You are a medical triage AI for Nevika Cura healthcare platform.
Given symptoms, provide a brief assessment. Respond in JSON:
{
  "assessment": "2-3 sentence overview",
  "possible_conditions": [{"name": "string", "likelihood": "high|medium|low"}],
  "red_flags": ["warning signs to watch for"],
  "self_care_tips": ["immediate relief suggestions"],
  "when_to_seek_emergency": "guidance on emergency situations"
}
Be helpful but always recommend consulting a doctor. Return ONLY JSON."""

            chat = LlmChat(
                api_key=api_key,
                session_id=f"symptom-{uuid.uuid4().hex[:8]}",
                system_message=system_msg,
            ).with_model("anthropic", "claude-sonnet-4-5-20250929")

            prompt = f"Symptoms: {', '.join(data.symptoms)}\nSeverity: {data.severity}/10\nDuration: {data.duration_days} days"
            if data.age:
                prompt += f"\nAge: {data.age}"
            if data.gender:
                prompt += f"\nGender: {data.gender}"
            if data.additional_notes:
                prompt += f"\nNotes: {data.additional_notes}"

            response = await chat.send_message(UserMessage(text=prompt))
            text = response.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            ai_analysis = json.loads(text)
    except Exception as e:
        logger.warning(f"AI symptom analysis failed: {e}")

    # Save session
    session_id = f"SYM-{uuid.uuid4().hex[:8].upper()}"
    if db is not None:
        await db.symptom_sessions.insert_one({
            "session_id": session_id,
            "symptoms": data.symptoms,
            "severity": data.severity,
            "duration_days": data.duration_days,
            "body_area": data.body_area,
            "urgency": urgency,
            "specialists": specialists,
            "ai_analysis": ai_analysis,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    return {
        "session_id": session_id,
        "urgency": urgency,
        "recommended_specialists": [
            {"specialist": spec, "for_symptoms": syms, "priority": "primary" if i == 0 else "secondary"}
            for i, (spec, syms) in enumerate(specialists.items())
        ],
        "ai_analysis": ai_analysis,
        "disclaimer": "This is an AI-powered assessment tool and not a substitute for professional medical advice. Please consult a doctor for proper diagnosis."
    }


@router.get("/history/{phone}")
async def get_symptom_history(phone: str):
    """Get symptom check history for a user"""
    if db is None:
        return {"sessions": []}
    sessions = await db.symptom_sessions.find(
        {"phone": phone}, {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    return {"sessions": sessions}
