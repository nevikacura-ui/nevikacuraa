"""
Generate descriptions (composition, uses, side effects) for medicines using Gemini AI.
Processes in batches: starred/top-company products first, then products with images.
Runs as background job - processes in chunks to avoid timeouts.
"""
import os, sys, json, asyncio, time, re
from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
API_KEY = os.environ.get("EMERGENT_LLM_KEY")

client = MongoClient(MONGO_URL)
db = client[DB_NAME]
col = db.medicines

BATCH_SIZE = 25  # Products per Gemini call
MAX_BATCHES = 80  # ~2000 products per run

async def generate_descriptions(medicines_batch):
    """Send batch of medicine names to Gemini and get structured descriptions."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    chat = LlmChat(
        api_key=API_KEY,
        session_id=f"med-desc-{int(time.time())}",
        system_message="""You are a pharmaceutical database assistant. For each medicine/product name provided, generate:
- composition: active ingredients with strengths (e.g., "Paracetamol (500mg) + Caffeine (65mg)")
- uses: primary medical uses, comma-separated (e.g., "Fever, Pain relief, Headache")
- side_effects: common side effects, comma-separated (e.g., "Nausea, Dizziness, Stomach upset")

For OTC/non-medicine products (face wash, shampoo, supplements, etc.), adapt:
- composition: key ingredients
- uses: primary benefits/purpose
- side_effects: any precautions or "No significant side effects"

Return ONLY a valid JSON array. No markdown, no explanation."""
    )
    chat.with_model("gemini", "gemini-2.5-flash")
    
    names_list = "\n".join([f"{i+1}. {m['name']}" for i, m in enumerate(medicines_batch)])
    
    msg = UserMessage(
        text=f"""Generate descriptions for these {len(medicines_batch)} products. Return a JSON array with objects having keys: index (1-based), composition, uses, side_effects.

{names_list}"""
    )
    
    try:
        response = await chat.send_message(msg)
        # Clean response - extract JSON
        text = response.strip()
        # Remove markdown code blocks if present
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        parsed = json.loads(text)
        return parsed
    except Exception as e:
        print(f"  Gemini error: {e}")
        return None

async def process_batch(batch, batch_num):
    """Process a batch of medicines and update DB."""
    result = await generate_descriptions(batch)
    if not result:
        return 0
    
    ops = []
    for item in result:
        idx = item.get('index', 0) - 1
        if idx < 0 or idx >= len(batch):
            continue
        med = batch[idx]
        update = {}
        if item.get('composition'):
            update['composition'] = item['composition']
        if item.get('uses'):
            update['uses'] = item['uses']
        if item.get('side_effects'):
            update['side_effects'] = item['side_effects']
        if update:
            ops.append(UpdateOne({"id": med["id"]}, {"$set": update}))
    
    if ops:
        col.bulk_write(ops, ordered=False)
    
    return len(ops)

async def main():
    print(f"=== Gemini Description Generator ===")
    print(f"API Key: {'Present' if API_KEY else 'MISSING!'}")
    
    if not API_KEY:
        print("ERROR: EMERGENT_LLM_KEY not found in environment!")
        return
    
    # Priority 1: Starred products missing descriptions
    query_starred = {
        "is_starred": True,
        "$or": [
            {"composition": {"$in": [None, ""]}},
            {"uses": {"$in": [None, ""]}}
        ]
    }
    starred_missing = col.count_documents(query_starred)
    print(f"\nStarred products missing descriptions: {starred_missing:,}")
    
    # Priority 2: Products with images missing descriptions
    query_img = {
        "is_starred": {"$ne": True},
        "image_url": {"$nin": ["", None]},
        "$or": [
            {"composition": {"$in": [None, ""]}},
            {"uses": {"$in": [None, ""]}}
        ]
    }
    img_missing = col.count_documents(query_img)
    print(f"Image products missing descriptions: {img_missing:,}")
    
    total_updated = 0
    batch_count = 0
    
    # Process starred first
    for query, label in [(query_starred, "Starred"), (query_img, "With-Image")]:
        if batch_count >= MAX_BATCHES:
            break
            
        cursor = col.find(query, {"_id": 0, "id": 1, "name": 1, "category": 1}).limit(MAX_BATCHES * BATCH_SIZE)
        batch = []
        
        for med in cursor:
            batch.append(med)
            if len(batch) >= BATCH_SIZE:
                batch_count += 1
                if batch_count > MAX_BATCHES:
                    break
                print(f"  [{label}] Batch {batch_count}/{MAX_BATCHES}: {batch[0]['name'][:40]}...")
                updated = await process_batch(batch, batch_count)
                total_updated += updated
                print(f"    Updated: {updated}")
                batch = []
                await asyncio.sleep(0.5)  # Rate limit
        
        # Process remaining
        if batch and batch_count < MAX_BATCHES:
            batch_count += 1
            print(f"  [{label}] Batch {batch_count}/{MAX_BATCHES}: {batch[0]['name'][:40]}... (partial: {len(batch)})")
            updated = await process_batch(batch, batch_count)
            total_updated += updated
            print(f"    Updated: {updated}")
    
    # Final stats
    remaining_starred = col.count_documents(query_starred)
    remaining_img = col.count_documents(query_img)
    print(f"\n=== Results ===")
    print(f"Total descriptions generated: {total_updated:,}")
    print(f"Remaining starred missing: {remaining_starred:,}")
    print(f"Remaining image products missing: {remaining_img:,}")
    print(f"Batches used: {batch_count}")

if __name__ == "__main__":
    asyncio.run(main())
