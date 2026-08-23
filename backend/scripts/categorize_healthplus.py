"""
Re-categorize Orange HealthPlus 'Health & Wellness' products into proper OTC subcategories.
146K products need better classification.
"""
import os, re
from pymongo import MongoClient, UpdateOne

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

client = MongoClient(MONGO_URL)
db = client[DB_NAME]
col = db.medicines

# More comprehensive OTC category patterns for HealthPlus
HEALTHPLUS_CATEGORIES = [
    # Beauty & Skin Care
    (r"face wash|face cream|face serum|face moistur|face mask|face scrub|face toner|facial foam|facial wash|cleansing milk|cleansing lotion|face pack|face gel|face mist|face oil|face peel|face wipe|face tissue|micellar water|bb cream|cc cream|foundation|concealer|compact|primer|kajal|mascara|eyeliner|lipstick|lip balm|lip gloss|nail polish|blush|bronzer|highlighter|makeup|cosmetic|beauty cream|skin cream|skin serum|skin lotion|skin oil|night cream|day cream|anti.aging|anti.wrinkle|fairness|brightening cream|whitening cream|glow cream|acne cream|pimple cream|dark circle|dark spot|pigmentation|blemish|moisturising cream|moisturizing cream|body butter", "Beauty & Skin Care"),
    
    # Sunscreen & Sun Care
    (r"sunscreen|sun block|sun protection|spf|uv protect|sun care|sun lotion|after sun", "Sunscreen & Sun Care"),
    
    # Hair Care
    (r"shampoo|conditioner|hair oil|hair serum|hair mask|hair gel|hair spray|hair color|hair dye|anti.dandruff|hair fall|hair growth|hair cream|hair lotion|hair tonic|hair wash|scalp|hair treatment|keratin|argan oil|coconut oil for hair|amla oil|bhringraj|hair food|hair pack|hair butter|hair mist|henna", "Hair Care"),
    
    # Body Care & Bath
    (r"body wash|shower gel|body lotion|body butter|body oil|body cream|body milk|body mist|body scrub|body powder|body spray|bath salt|bath bomb|bath oil|soap bar|bathing bar|liquid soap|hand cream|foot cream|heel cream|body polish|body serum|body yogurt|body balm", "Body Care & Bath"),
    
    # Fragrances & Deodorants
    (r"deodorant|perfume|fragrance|deo stick|roll.on|body mist|aftershave|eau de|cologne|attar|deo spray", "Fragrances & Deodorants"),
    
    # Feminine Hygiene
    (r"sanitary pad|sanitary napkin|panty liner|menstrual pad|period pad|feminine hygiene|tampon|menstrual cup|period pant|feminine wash|intimate wash.*women|period care", "Feminine Hygiene"),
    
    # Oral Care
    (r"toothpaste|toothbrush|mouthwash|dental floss|tongue cleaner|denture|teeth whitening|tooth powder|oral rinse|tooth gel|gum care|dental care", "Oral Care"),
    
    # Baby Care
    (r"diaper|baby wipe|baby soap|baby oil|baby lotion|baby cream|baby powder|baby food|formula milk|lactogen|cerelac|pediasure|gripe water|teether|pacifier|feeding bottle|breast pump|nipple cream|baby wash|baby shampoo|baby bath|baby gel|baby balm|nappy|baby cereal|baby rusk|infant formula", "Baby Care"),
    
    # Protein & Sports Nutrition
    (r"protein powder|whey protein|mass gainer|bcaa|creatine|pre.workout|amino acid|protein bar|energy bar|meal replacement|protein shake|protein supplement|isolate protein|casein|weight gainer|muscle build|gym supplement|sports nutrition|fitness supplement|plant protein|pea protein|soy protein", "Protein & Sports Nutrition"),
    
    # Health Drinks & Nutrition
    (r"health drink|horlicks|bournvita|complan|boost|protinex|ensure|glucose|electrolyte|ors|energy drink|nutrition drink|malt drink|nutrition powder|nutritional supplement|meal supplement|health mix|ragi|sattu|chyawanprash", "Health Drinks & Nutrition"),
    
    # Vitamins & Supplements
    (r"vitamin|multivitamin|mineral|calcium|iron|zinc|magnesium|omega|fish oil|cod liver|biotin|folic acid|b.complex|vitamin d|vitamin c|vitamin e|vitamin b12|vitamin a|antioxidant|coq10|collagen|probiotics|prebiotics|melatonin|ashwagandha|giloy|turmeric|curcumin|moringa|spirulina|flaxseed|evening primrose|garlic capsule|ginseng|tulsi|neem capsule|triphala|amla capsule|shilajit|safed musli|supplement|nutraceutical|herbal capsule|herbal tablet|veg capsule|veggie capsule|capsule.*extract|tablet.*extract", "Vitamins & Supplements"),
    
    # Ayurvedic & Herbal
    (r"ayurved|herbal|unani|homeopath|churna|bhasma|ras|ark|asav|arishta|guggul|kwath|tail|ghrit|vati|mandur|pishti|lep|choorna|siddha|panchakarma", "Ayurvedic & Herbal"),
    
    # Sexual Wellness
    (r"condom|lubricant|intimate wash|intimate hygiene|pregnancy test|fertility|sexual wellness|delay spray|pleasure gel|stamina|vigor|libido|erectile|sexual health|kama|intimate gel|intimate oil|massage oil.*intimate", "Sexual Wellness"),
    
    # Eye Care
    (r"eye drop|eye wash|eye care|contact lens|lens solution|eye mask|eye cream|eye serum|under eye|eye gel|eye ointment", "Eye Care"),
    
    # Diabetes Care
    (r"diabetic|sugar free|glucometer|test strip|lancet|insulin|blood sugar|diabetes|glycemic|diabeto", "Diabetes Care"),
    
    # Pain Relief
    (r"pain relief|pain balm|pain spray|pain oil|pain gel|pain patch|pain killer|muscle relaxant|joint pain|back pain|knee pain|headache|migraine|body pain|ache relief|hot gel|cold gel|moov|volini|iodex|tiger balm|zandu balm", "Pain Relief"),
    
    # Hand Wash & Sanitizers
    (r"hand wash|hand sanitiz|hand rub|hand gel|hand soap|sanitizer|disinfect|antiseptic liquid|dettol|savlon", "Hand Wash & Sanitizers"),
    
    # Health Devices & Accessories
    (r"thermometer|bp monitor|blood pressure|glucometer|oximeter|nebulizer|vaporizer|hot water bag|ice pack|wheelchair|walker|crutch|knee cap|wrist support|ankle support|cervical collar|back support|crepe bandage|bandage|gauze|cotton|surgical tape|first aid|stethoscope|weighing scale|body scale|heating pad|massager|acupressure|compression sock|elastic bandage|arm sling|finger splint", "Health Devices & Accessories"),
    
    # Digestive Health
    (r"digestive|acidity|antacid|gastric|constipation|laxative|liver|probiotic|enzyme|bloating|gas relief|indigestion|heartburn|stomach|bowel|ibs|gut health|fiber supplement|isabgol|psyllium|triphala.*digestive", "Digestive Health"),
    
    # Weight Management
    (r"weight loss|weight management|fat burner|slim|slimming|appetite|metabolism|garcinia|green coffee|green tea.*extract|keto|detox|diet.*supplement|body cleanse|fat cutter|weight control", "Weight Management"),
    
    # Men's Grooming
    (r"beard oil|beard wash|beard balm|beard growth|shaving cream|shaving gel|shaving foam|razor|trimmer|after shave|men.s face wash|men.s cream|men.s lotion|men.s grooming|men.s body wash|men.s hair|men.s skin", "Men's Grooming"),
    
    # Mosquito & Insect Repellent
    (r"mosquito|insect repell|bug spray|pest|room freshener|air purif|humidif|fly|cockroach|ant repel", "Home Health"),
    
    # Tea & Herbal Beverages
    (r"green tea|herbal tea|detox tea|chamomile tea|jasmine tea|immunity tea|slim tea|weight loss tea|tulsi tea|ginger tea|lemon tea|matcha|black tea|tea bag|tisane", "Herbal Tea & Beverages"),
    
    # Pet Care (some pharmacies carry it)
    (r"pet care|dog food|cat food|pet shampoo|pet supplement|veterinary|animal health", "Pet Care"),
    
    # Elderly Care
    (r"adult diaper|incontinence|elderly|senior care|walking stick|bed pan|commode|urinal|catheter", "Elderly Care"),
]

def main():
    # Only re-categorize Health & Wellness in orange_healthplus store
    total_hw = col.count_documents({"store": "orange_healthplus", "category": "Health & Wellness"})
    print(f"HealthPlus 'Health & Wellness' products to re-categorize: {total_hw:,}")
    
    patterns = [(re.compile(pattern, re.IGNORECASE), cat) for pattern, cat in HEALTHPLUS_CATEGORIES]
    
    # Process in batches
    batch_size = 10000
    cursor = col.find(
        {"store": "orange_healthplus", "category": "Health & Wellness"},
        {"_id": 0, "id": 1, "name": 1}
    ).batch_size(batch_size)
    
    ops = []
    categorized = 0
    total_processed = 0
    category_counts = {}
    
    for med in cursor:
        total_processed += 1
        name = (med.get("name", "") or "")
        
        matched_cat = None
        for pattern, category in patterns:
            if pattern.search(name):
                matched_cat = category
                break
        
        if matched_cat:
            ops.append(UpdateOne({"id": med["id"]}, {"$set": {"category": matched_cat}}))
            categorized += 1
            category_counts[matched_cat] = category_counts.get(matched_cat, 0) + 1
        
        if len(ops) >= 5000:
            col.bulk_write(ops, ordered=False)
            ops = []
            if total_processed % 50000 == 0:
                print(f"  ...{total_processed:,} processed, {categorized:,} re-categorized")
    
    if ops:
        col.bulk_write(ops, ordered=False)
    
    print(f"\nTotal processed: {total_processed:,}")
    print(f"Re-categorized: {categorized:,}")
    print(f"Remaining 'Health & Wellness': {total_hw - categorized:,}")
    
    print(f"\n=== New category breakdown ===")
    for cat, count in sorted(category_counts.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count:,}")
    
    # Print final full HealthPlus category breakdown
    print(f"\n=== Final HealthPlus categories ===")
    cats = list(col.aggregate([
        {"$match": {"store": "orange_healthplus"}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]))
    for c in cats:
        print(f"  {c['_id']}: {c['count']:,}")

if __name__ == "__main__":
    main()
