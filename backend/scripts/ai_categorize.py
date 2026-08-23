"""
AI categorization with retry logic and smaller batches.
"""
import os, asyncio, json, re, time
from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv()

BATCH_SIZE = 50
DB_BATCH = 2000
MAX_RETRIES = 3
CATEGORIES = [
    "Pain Relief", "Antibiotics & Anti-Infectives", "Diabetes Care", "Heart & BP",
    "Respiratory", "Digestive Health", "Skin Care", "Hair Care", "Vitamins & Supplements",
    "Allergy", "Mental Health", "Eye Care", "ENT", "Women's Health", "Oncology",
    "Bone & Joint", "Urology", "Nutrition & Protein", "Baby Care", "Oral Care",
    "Hygiene & Safety", "Ayurvedic & Herbal", "Health Devices", "Sexual Wellness",
    "Liver Care", "Kidney Care", "Hormones & Thyroid", "Homeopathy", "General"
]

client = MongoClient(os.environ["MONGO_URL"])
db = client[os.environ.get("DB_NAME", "nevikacura")]
col = db.medicines

async def categorize_batch(names, chat, retry=0):
    names_text = "\n".join([f"{i+1}. {n}" for i, n in enumerate(names)])
    prompt = f"""Categorize each product into ONE category. Return ONLY a JSON array.
Categories: {', '.join(CATEGORIES)}

Products:
{names_text}"""
    
    try:
        response = await chat.send_message(UserMessage(text=prompt))
        match = re.search(r'\[.*?\]', response, re.DOTALL)
        if match:
            cats = json.loads(match.group())
            if len(cats) == len(names):
                return cats
    except Exception as e:
        if retry < MAX_RETRIES:
            await asyncio.sleep(2 ** retry)
            return await categorize_batch(names, chat, retry + 1)
        print(f"  Failed after {MAX_RETRIES} retries: {str(e)[:60]}")
    return None

async def main():
    chat = LlmChat(
        api_key=os.environ["EMERGENT_LLM_KEY"],
        session_id="med-cat-v2",
        system_message="Categorize medicines. Return only JSON array."
    ).with_model("gemini", "gemini-2.5-flash")

    print("Fetching uncategorized...")
    meds = list(col.find(
        {"category": {"$in": ["General", "Health & Wellness"]}},
        {"_id": 0, "id": 1, "name": 1}
    ).limit(50000))  # Process in chunks of 50K
    print(f"Batch: {len(meds):,}")

    ops = []
    categorized = 0
    errors = 0

    for i in range(0, len(meds), BATCH_SIZE):
        batch = meds[i:i+BATCH_SIZE]
        names = [m["name"] for m in batch]
        
        cats = await categorize_batch(names, chat)
        
        if cats:
            for med, cat in zip(batch, cats):
                if cat in CATEGORIES and cat != "General":
                    ops.append(UpdateOne({"id": med["id"]}, {"$set": {"category": cat}}))
                    categorized += 1
        else:
            errors += 1
        
        if len(ops) >= DB_BATCH:
            col.bulk_write(ops, ordered=False)
            ops = []
        
        if (i // BATCH_SIZE) % 20 == 0 and i > 0:
            print(f"  {i+len(batch):,}/{len(meds):,} — cat: {categorized:,}, err: {errors}")
        
        await asyncio.sleep(0.1)

    if ops:
        col.bulk_write(ops, ordered=False)

    remaining = col.count_documents({"category": {"$in": ["General", "Health & Wellness"]}})
    print(f"\n=== Done ===")
    print(f"Categorized: {categorized:,}, Errors: {errors}, Remaining: {remaining:,}")

asyncio.run(main())
