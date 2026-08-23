"""
Batch generate AI descriptions for all Orange Select medicines using GPT-5.2.
Generates: description, uses, composition, side_effects, how_to_use, storage
Caches results in DB to avoid re-generation.
Runs in batches to avoid rate limits.
"""

import asyncio
import os
import json
import logging
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from motor.motor_asyncio import AsyncIOMotorClient
from emergentintegrations.llm.chat import LlmChat, UserMessage

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME')
LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

BATCH_SIZE = 5
DELAY_BETWEEN_BATCHES = 2

async def generate_medicine_info(med_name, med_form, med_company, med_composition):
    """Generate AI info for a single medicine"""
    try:
        chat = LlmChat(
            api_key=LLM_KEY,
            session_id=f"med-batch-{med_name[:20]}",
            system_message="You are a licensed Indian pharmacist. Provide accurate, concise medicine information for Indian market medicines. Return ONLY valid JSON."
        ).with_model("openai", "gpt-5.2")

        prompt = f"""Medicine: "{med_name}"
Form: {med_form or 'Unknown'}
Company: {med_company or 'Unknown'}
Known composition: {med_composition or 'Unknown'}

Return JSON:
{{"description": "1-2 sentence description",
"uses": ["use 1", "use 2", "use 3"],
"composition": "active ingredients with strengths",
"side_effects": ["side effect 1", "side effect 2", "side effect 3"],
"how_to_use": "brief dosage guidance",
"storage": "storage instructions"}}"""

        response = await chat.send_message(UserMessage(text=prompt))
        clean = response.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
        if clean.endswith("```"):
            clean = clean[:-3]
        clean = clean.strip()
        if clean.startswith("json"):
            clean = clean[4:].strip()

        return json.loads(clean)
    except Exception as e:
        logger.error(f"AI error for {med_name}: {e}")
        return None

async def main():
    logger.info("=" * 60)
    logger.info("BATCH AI MEDICINE DATA GENERATION")
    logger.info("=" * 60)

    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # Get medicines without AI data
    total = await db.trusted_formulary.count_documents({})
    already_done = await db.trusted_formulary.count_documents({"ai_description": {"$exists": True, "$ne": ""}})
    remaining = await db.trusted_formulary.count_documents({
        "$or": [
            {"ai_description": {"$exists": False}},
            {"ai_description": ""},
            {"ai_description": None}
        ]
    })

    logger.info(f"Total medicines: {total}")
    logger.info(f"Already have AI data: {already_done}")
    logger.info(f"Need AI data: {remaining}")

    if remaining == 0:
        logger.info("All medicines already have AI data!")
        client.close()
        return

    cursor = db.trusted_formulary.find(
        {"$or": [
            {"ai_description": {"$exists": False}},
            {"ai_description": ""},
            {"ai_description": None}
        ]},
        {"_id": 0, "id": 1, "name": 1, "form": 1, "company": 1, "composition": 1}
    )

    medicines = await cursor.to_list(None)
    logger.info(f"Processing {len(medicines)} medicines in batches of {BATCH_SIZE}...")

    success_count = 0
    fail_count = 0

    for i in range(0, len(medicines), BATCH_SIZE):
        batch = medicines[i:i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        total_batches = (len(medicines) + BATCH_SIZE - 1) // BATCH_SIZE

        logger.info(f"Batch {batch_num}/{total_batches} ({i+1}-{min(i+BATCH_SIZE, len(medicines))} of {len(medicines)})")

        tasks = []
        for med in batch:
            tasks.append(generate_medicine_info(
                med['name'], med.get('form', ''), med.get('company', ''), med.get('composition', '')
            ))

        results = await asyncio.gather(*tasks)

        for med, result in zip(batch, results):
            if result:
                await db.trusted_formulary.update_one(
                    {"id": med['id']},
                    {"$set": {
                        "ai_description": result.get("description", ""),
                        "ai_uses": result.get("uses", []),
                        "ai_composition": result.get("composition", ""),
                        "ai_side_effects": result.get("side_effects", []),
                        "ai_how_to_use": result.get("how_to_use", ""),
                        "ai_storage": result.get("storage", ""),
                        "ai_generated_at": datetime.now(timezone.utc).isoformat(),
                    }}
                )
                success_count += 1
            else:
                fail_count += 1

        logger.info(f"  Batch done: {success_count} success, {fail_count} failed so far")

        if i + BATCH_SIZE < len(medicines):
            await asyncio.sleep(DELAY_BETWEEN_BATCHES)

    logger.info(f"\n{'=' * 60}")
    logger.info(f"COMPLETE: {success_count} success, {fail_count} failed")
    logger.info(f"{'=' * 60}")

    client.close()

if __name__ == "__main__":
    asyncio.run(main())
