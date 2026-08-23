"""
AI-powered test categorization and details using Gemini
Caches results in MongoDB for performance
"""
import os
import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from typing import Optional

logger = logging.getLogger(__name__)

router = APIRouter()
db = None
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

def set_db(database):
    global db
    db = database

CATEGORY_COLORS = {
    "Women's Health": {"gradient": "linear-gradient(135deg, #BE185D 0%, #EC4899 100%)", "color": "#EC4899"},
    "Diabetes": {"gradient": "linear-gradient(135deg, #047857 0%, #10B981 100%)", "color": "#10B981"},
    "Cardiac": {"gradient": "linear-gradient(135deg, #B91C1C 0%, #EF4444 100%)", "color": "#EF4444"},
    "Kidney": {"gradient": "linear-gradient(135deg, #6D28D9 0%, #A78BFA 100%)", "color": "#A78BFA"},
    "Thyroid": {"gradient": "linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)", "color": "#14B8A6"},
    "Liver": {"gradient": "linear-gradient(135deg, #C2410C 0%, #F97316 100%)", "color": "#F97316"},
    "Essential": {"gradient": "linear-gradient(135deg, #B45309 0%, #F59E0B 100%)", "color": "#F59E0B"},
    "Hormones": {"gradient": "linear-gradient(135deg, #7C2D12 0%, #EA580C 100%)", "color": "#EA580C"},
    "Infection": {"gradient": "linear-gradient(135deg, #991B1B 0%, #DC2626 100%)", "color": "#DC2626"},
    "Allergy": {"gradient": "linear-gradient(135deg, #4338CA 0%, #6366F1 100%)", "color": "#6366F1"},
    "Vitamin": {"gradient": "linear-gradient(135deg, #B45309 0%, #F59E0B 100%)", "color": "#F59E0B"},
    "Hematology": {"gradient": "linear-gradient(135deg, #9F1239 0%, #FB7185 100%)", "color": "#FB7185"},
    "General": {"gradient": "linear-gradient(135deg, #B45309 0%, #F59E0B 100%)", "color": "#F59E0B"},
}


@router.post("/tests/categorize")
async def categorize_tests(test_names: list[str]):
    """Use Gemini AI to categorize tests and generate details. Results cached in MongoDB."""
    if not test_names:
        raise HTTPException(status_code=400, detail="No test names provided")
    
    # Check cache first
    cached = {}
    uncached = []
    for name in test_names:
        cached_entry = await db.test_categories.find_one({"name": name}, {"_id": 0})
        if cached_entry:
            cached[name] = cached_entry
        else:
            uncached.append(name)
    
    if not uncached:
        return {"tests": cached, "source": "cache"}
    
    # Use Gemini to categorize uncached tests
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"test-categorize-{datetime.now().timestamp()}",
            system_message="""You are a medical laboratory expert. Categorize diagnostic tests into medical categories and provide detailed information.
            
Available categories: Women's Health, Diabetes, Cardiac, Kidney, Thyroid, Liver, Essential, Hormones, Infection, Allergy, Vitamin, Hematology, General

For each test, provide:
- category: one of the above categories
- description: 2-3 sentence description of what the test measures and why it's important
- sample_type: Blood, Urine, Serum, Plasma, Stool, Swab, etc.
- fasting: "Required (8-12 hours)" or "Not required" or "Preferably fasting"  
- preparation: Brief preparation instructions for the patient
- who_should_take: Who should consider this test
- normal_range: Typical normal range if applicable, or "Varies by method"
- turnaround: Typical report time

RESPOND ONLY WITH VALID JSON. No markdown, no code blocks. Format:
{"tests": {"Test Name": {"category": "...", "description": "...", "sample_type": "...", "fasting": "...", "preparation": "...", "who_should_take": "...", "normal_range": "...", "turnaround": "..."}}}"""
        ).with_model("gemini", "gemini-2.0-flash")
        
        # Batch in groups of 20 to avoid token limits
        all_results = {}
        for i in range(0, len(uncached), 20):
            batch = uncached[i:i+20]
            prompt = f"Categorize and provide details for these diagnostic tests:\n{json.dumps(batch)}"
            response = await chat.send_message(UserMessage(text=prompt))
            
            # Parse response
            try:
                clean = response.strip()
                if "```json" in clean:
                    clean = clean.split("```json")[1].split("```")[0]
                elif "```" in clean:
                    clean = clean.split("```")[1].split("```")[0]
                result = json.loads(clean)
                tests_data = result.get("tests", result)
                all_results.update(tests_data)
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse Gemini response for batch {i}")
                # Fallback: assign "General" category
                for name in batch:
                    all_results[name] = {
                        "category": "General",
                        "description": f"{name} is a diagnostic laboratory test.",
                        "sample_type": "Blood",
                        "fasting": "Consult your doctor",
                        "preparation": "Follow your doctor's instructions",
                        "who_should_take": "As recommended by your healthcare provider",
                        "normal_range": "Varies by method",
                        "turnaround": "24-48 hours"
                    }
        
        # Cache all results in MongoDB
        for name, data in all_results.items():
            data["name"] = name
            data["cached_at"] = datetime.now(timezone.utc).isoformat()
            await db.test_categories.update_one(
                {"name": name},
                {"$set": data},
                upsert=True
            )
            cached[name] = {k: v for k, v in data.items() if k != "_id"}
        
        return {"tests": cached, "source": "ai+cache", "newly_categorized": len(all_results)}
    
    except Exception as e:
        logger.error(f"Gemini categorization failed: {e}")
        # Return cached + fallback for uncached
        for name in uncached:
            cached[name] = {
                "name": name,
                "category": "General",
                "description": f"{name} is a diagnostic laboratory test.",
                "sample_type": "Blood",
                "fasting": "Consult your doctor",
                "preparation": "Follow your doctor's instructions",
                "who_should_take": "As recommended by your healthcare provider",
                "normal_range": "Varies by method",
                "turnaround": "24-48 hours"
            }
        return {"tests": cached, "source": "fallback"}


@router.get("/tests/details")
async def get_test_details(test_name: str):
    """Get detailed information about a specific test. Uses cache or generates via AI."""
    # Check cache - only use if it has full AI-generated details
    cached = await db.test_categories.find_one({"name": test_name}, {"_id": 0})
    if cached and cached.get("description") and cached.get("who_should_take") and cached.get("preparation"):
        return cached
    
    # Generate via AI
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"test-detail-{datetime.now().timestamp()}",
            system_message="""You are a medical laboratory expert. Provide detailed information about a diagnostic test.
            RESPOND ONLY WITH VALID JSON. No markdown. Format:
            {"category": "...", "description": "...", "sample_type": "...", "fasting": "...", "preparation": "...", "who_should_take": "...", "normal_range": "...", "turnaround": "...", "risks": "...", "related_tests": ["..."]}"""
        ).with_model("gemini", "gemini-2.0-flash")
        
        response = await chat.send_message(UserMessage(text=f"Provide detailed information about this diagnostic test: {test_name}"))
        
        clean = response.strip()
        if "```json" in clean:
            clean = clean.split("```json")[1].split("```")[0]
        elif "```" in clean:
            clean = clean.split("```")[1].split("```")[0]
        
        data = json.loads(clean)
        data["name"] = test_name
        data["cached_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.test_categories.update_one(
            {"name": test_name},
            {"$set": data},
            upsert=True
        )
        
        return {k: v for k, v in data.items() if k != "_id"}
    
    except Exception as e:
        logger.error(f"Failed to get test details: {e}")
        return {
            "name": test_name,
            "category": "General",
            "description": f"{test_name} is a diagnostic laboratory test. Please consult your doctor for more information.",
            "sample_type": "Blood",
            "fasting": "Consult your doctor",
            "preparation": "Follow your doctor's instructions",
            "who_should_take": "As recommended by your healthcare provider",
            "normal_range": "Varies by method",
            "turnaround": "24-48 hours"
        }
