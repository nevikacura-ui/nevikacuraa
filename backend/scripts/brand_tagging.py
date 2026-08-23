"""
Generate major Indian pharmacy + OTC brand lists using Gemini + Claude,
then tag medicines with brand names and add priority sorting.
Also recategorize non-medicine items.
"""
import os, asyncio, json, re
from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv()

client = MongoClient(os.environ["MONGO_URL"])
db = client[os.environ.get("DB_NAME", "nevikacura")]
col = db.medicines

API_KEY = os.environ["EMERGENT_LLM_KEY"]

BRAND_PROMPT = """List ALL major Indian pharmacy, healthcare, and consumer health brands sold in Indian pharmacies and online medical stores. Include:

1. **Prescription Drug Companies** (top 50): Sun Pharma, Cipla, Dr. Reddy's, Lupin, Mankind, etc.
2. **OTC Medicine Brands** (top 30): Crocin, Volini, Vicks, Zandu, Moov, etc.
3. **Ayurvedic/Herbal** (top 30): Patanjali, Himalaya, Dabur, Baidyanath, Hamdard, Zandu, etc.
4. **Personal Care / Hygiene sold in pharmacy** (top 40): Whisper, Stayfree, Dettol, Savlon, Lifebuoy, etc.
5. **Baby Care** (top 20): Johnson's Baby, Himalaya Baby, Chicco, Pigeon, Pampers, Huggies, etc.
6. **Nutrition/Protein** (top 30): Horlicks, Bournvita, Ensure, Protinex, Complan, MuscleBlaze, Optimum Nutrition, etc.
7. **Skin Care / Derma** (top 30): Cetaphil, Bioderma, La Roche-Posay, Neutrogena, Lotus, Mamaearth, WOW, etc.
8. **Hair Care** (top 20): Head & Shoulders, Dove, TRESemme, Indulekha, Kesh King, etc.
9. **Health Devices** (top 15): Omron, Dr. Morepen, Accu-Chek, OneTouch, Beurer, etc.
10. **Sexual Wellness** (top 10): Durex, Manforce, Skore, KamaSutra, etc.

Return a JSON object with categories as keys and arrays of brand names as values. Include 300+ brands total.
Example: {"Prescription": ["Sun Pharma", "Cipla"], "OTC": ["Crocin", "Vicks"]}"""

OTC_CATEGORIES = {
    "sanitary pad|sanitary napkin|panty liner|menstrual pad|period pad|feminine hygiene|tampon|menstrual cup": "Feminine Hygiene",
    "face wash|face cream|face serum|face moistur|face mask|face scrub|face toner|facial|cleanser|sunscreen|spf|bb cream|cc cream|foundation|concealer|compact|primer|kajal|mascara|eyeliner|lipstick|lip balm|lip gloss|nail polish|blush|bronzer|highlighter|makeup|beauty|cosmetic": "Beauty & Skin Care",
    "body spray|deodorant|perfume|fragrance|deo|roll.on|body mist|aftershave": "Fragrances & Deodorants",
    "shampoo|conditioner|hair oil|hair serum|hair mask|hair gel|hair spray|hair color|hair dye|anti.dandruff": "Hair Care",
    "body wash|shower gel|body lotion|body butter|body oil|hand cream|foot cream|moisturizer|body scrub": "Body Care",
    "toothpaste|toothbrush|mouthwash|dental floss|tongue cleaner|denture": "Oral Care",
    "hand wash|hand sanitiz|soap bar|liquid soap|disinfect": "Hand Wash & Sanitizers",
    "diaper|baby wipe|baby soap|baby oil|baby lotion|baby cream|baby powder|baby food|formula milk|lactogen|cerelac|pediasure|gripe water|teether|pacifier|feeding bottle|breast pump|nipple cream": "Baby Care",
    "condom|lubricant|intimate wash|intimate hygiene|pregnancy test|fertility": "Sexual Wellness",
    "protein powder|whey protein|mass gainer|bcaa|creatine|pre.workout|amino acid|protein bar|energy bar|meal replacement": "Sports Nutrition",
    "health drink|horlicks|bournvita|complan|boost|protinex|ensure|pediasure|glucose|electrolyte|ors": "Health Drinks",
    "bandage|gauze|cotton|surgical tape|first aid|thermometer|bp monitor|glucometer|oximeter|nebulizer|vaporizer|hot water bag|ice pack|wheelchair|walker|crutch|knee cap|wrist support|ankle support|cervical collar|back support|crepe bandage": "Health Devices & Accessories",
    "mosquito repell|insect repell|room freshener|air purif|humidif": "Home Health",
}

async def get_brands_from_llm(provider, model, session_id):
    chat = LlmChat(
        api_key=API_KEY,
        session_id=session_id,
        system_message="You are a pharmaceutical industry expert. Return only valid JSON."
    ).with_model(provider, model)
    
    response = await chat.send_message(UserMessage(text=BRAND_PROMPT))
    match = re.search(r'\{.*\}', response, re.DOTALL)
    if match:
        return json.loads(match.group())
    return {}

async def main():
    # Step 1: Get brand lists from both LLMs
    print("Fetching brand lists from Gemini...")
    gemini_brands = await get_brands_from_llm("gemini", "gemini-2.5-flash", "brands-gemini")
    print(f"Gemini returned {sum(len(v) for v in gemini_brands.values())} brands in {len(gemini_brands)} categories")
    
    print("Fetching brand lists from Claude...")
    try:
        claude_brands = await get_brands_from_llm("anthropic", "claude-sonnet-4-5-20250929", "brands-claude")
        print(f"Claude returned {sum(len(v) for v in claude_brands.values())} brands in {len(claude_brands)} categories")
    except Exception as e:
        print(f"Claude error: {e}, using Gemini only")
        claude_brands = {}
    
    # Step 2: Merge brand lists
    all_brands = set()
    for brands_dict in [gemini_brands, claude_brands]:
        for category, brands in brands_dict.items():
            for brand in brands:
                all_brands.add(brand.strip())
    
    # Clean up brand names and sort
    all_brands = sorted(all_brands, key=len, reverse=True)  # Longer names first for better matching
    print(f"\nTotal unique brands: {len(all_brands)}")
    
    # Save brands for reference
    with open("/tmp/major_brands.json", "w") as f:
        json.dump({"brands": list(all_brands), "gemini": gemini_brands, "claude": claude_brands}, f, indent=2)
    print("Saved to /tmp/major_brands.json")
    
    # Step 3: Tag medicines with brand and priority
    print("\nTagging medicines with brand names...")
    
    # Build regex patterns for each brand
    brand_patterns = []
    for brand in all_brands:
        if len(brand) < 3:
            continue
        escaped = re.escape(brand)
        brand_patterns.append((brand, re.compile(r'\b' + escaped + r'\b', re.IGNORECASE)))
    
    meds = col.find({}, {"_id": 0, "id": 1, "name": 1, "manufacturer": 1})
    
    ops = []
    branded = 0
    total = 0
    
    for med in meds:
        total += 1
        name = (med.get("name", "") or "")
        manufacturer = (med.get("manufacturer", "") or "")
        combined = f"{name} {manufacturer}"
        
        matched_brand = None
        for brand_name, pattern in brand_patterns:
            if pattern.search(combined):
                matched_brand = brand_name
                break
        
        if matched_brand:
            ops.append(UpdateOne(
                {"id": med["id"]},
                {"$set": {"brand": matched_brand, "is_branded": True}}
            ))
            branded += 1
        
        if len(ops) >= 5000:
            col.bulk_write(ops, ordered=False)
            ops = []
            if branded % 20000 == 0:
                print(f"  ...{total:,} processed, {branded:,} branded")
    
    if ops:
        col.bulk_write(ops, ordered=False)
    
    print(f"Branded: {branded:,} / {total:,}")
    
    # Step 4: Re-categorize non-medicine OTC items
    print("\nRe-categorizing non-medicine OTC items...")
    uncategorized = list(col.find(
        {"category": {"$in": ["General", "Health & Wellness"]}},
        {"_id": 0, "id": 1, "name": 1}
    ))
    
    otc_ops = []
    otc_count = 0
    
    otc_patterns = [(re.compile(pattern, re.IGNORECASE), cat) for pattern, cat in OTC_CATEGORIES.items()]
    
    for med in uncategorized:
        name = (med.get("name", "") or "").lower()
        
        for pattern, category in otc_patterns:
            if pattern.search(name):
                otc_ops.append(UpdateOne({"id": med["id"]}, {"$set": {"category": category}}))
                otc_count += 1
                break
        
        if len(otc_ops) >= 5000:
            col.bulk_write(otc_ops, ordered=False)
            otc_ops = []
    
    if otc_ops:
        col.bulk_write(otc_ops, ordered=False)
    
    print(f"OTC re-categorized: {otc_count:,}")
    
    # Step 5: Create index for brand priority
    col.create_index([("is_branded", -1), ("brand", 1)], name="brand_priority", sparse=True)
    
    # Final stats
    branded_total = col.count_documents({"is_branded": True})
    remaining_general = col.count_documents({"category": {"$in": ["General", "Health & Wellness"]}})
    print(f"\n=== Complete ===")
    print(f"Total branded medicines: {branded_total:,}")
    print(f"Remaining General: {remaining_general:,}")

asyncio.run(main())
