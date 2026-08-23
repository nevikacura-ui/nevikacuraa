"""
Test Details API — Generates and caches comprehensive test details using Gemini AI.
Used by Mango Health Labs, Proton Diagnostics, and Nexugene pages.
"""
import os
import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/tests", tags=["tests"])

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "test_database")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
test_details_col = db["test_details_cache"]


@router.get("/details/{test_name}")
async def get_test_details(test_name: str, source: str = "mango"):
    """Get AI-generated details for a lab test. Caches in MongoDB."""

    # Check cache first
    cached = await test_details_col.find_one(
        {"test_name": test_name},
        {"_id": 0}
    )
    if cached and cached.get("details"):
        return cached["details"]

    # Generate via Gemini
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        system_msg = """You are a senior clinical pathologist and diagnostic medicine expert.
Generate comprehensive, patient-friendly details for medical/diagnostic tests.
Always respond with ONLY valid JSON (no markdown, no backticks).
The JSON must have these exact keys:
{
  "description": "2-3 sentence patient-friendly explanation of what this test measures and why it matters",
  "diagnosis_use": "What conditions/diseases this test helps diagnose or monitor (2-3 sentences)",
  "preparation": "Specific preparation instructions (fasting, medications to avoid, timing, etc.)",
  "estimated_time": "How long the test procedure takes (e.g., '5-10 minutes')",
  "report_time": "When results are typically available (e.g., '6-24 hours')",
  "sample_type": "Type of sample collected (e.g., 'Blood (venous)', 'Urine', 'Serum')",
  "fasting": "Fasting requirement (e.g., 'Not required', '8-12 hours fasting required')",
  "who_should_test": "Who should consider getting this test and how often",
  "normal_range": "Brief normal range info or note that ranges vary by age/gender",
  "risks": "Any risks or discomfort associated with the test",
  "parameters": estimated number of parameters tested (integer)
}"""

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"test-details-{test_name}-{datetime.now(timezone.utc).timestamp()}",
            system_message=system_msg
        ).with_model("gemini", "gemini-2.5-flash")

        prompt = f"Generate comprehensive details for this medical/diagnostic test: \"{test_name}\". Source lab: {source}."
        response = await chat.send_message(UserMessage(text=prompt))

        # Parse JSON from response
        text = response.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()

        details = json.loads(text)

        # Cache in MongoDB
        await test_details_col.update_one(
            {"test_name": test_name},
            {"$set": {
                "test_name": test_name,
                "source": source,
                "details": details,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )

        return details

    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error for {test_name}: {e}")
        # Return a sensible fallback
        return {
            "description": f"A diagnostic test that helps evaluate your health. Please consult your doctor for specific details about {test_name}.",
            "diagnosis_use": "Consult your healthcare provider for specific diagnostic applications.",
            "preparation": "Follow your doctor's instructions. Contact the lab for specific preparation guidelines.",
            "estimated_time": "15-30 minutes",
            "report_time": "24-48 hours",
            "sample_type": "As directed by your doctor",
            "fasting": "Consult lab for fasting requirements",
            "who_should_test": "As recommended by your healthcare provider",
            "normal_range": "Ranges vary by age and gender. Consult your doctor.",
            "risks": "Minimal risks. Slight discomfort during sample collection.",
            "parameters": 1
        }
    except Exception as e:
        logger.error(f"AI generation error for {test_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/details/batch")
async def batch_generate_details(test_names: list[str], source: str = "mango"):
    """Generate details for multiple tests. Returns cached + newly generated."""
    results = {}
    to_generate = []

    # Check cache for all
    for name in test_names:
        cached = await test_details_col.find_one({"test_name": name}, {"_id": 0})
        if cached and cached.get("details"):
            results[name] = cached["details"]
        else:
            to_generate.append(name)

    # Generate missing ones (limit to 5 at a time to avoid timeout)
    for name in to_generate[:5]:
        try:
            details = await get_test_details(name, source)
            results[name] = details
        except Exception as e:
            logger.error(f"Batch generation failed for {name}: {e}")

    return results
