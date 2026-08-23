"""
Tag medicines from user-provided top 48 pharma companies.
Sets is_top_company=True, is_starred=True, and top_company=<name>.
Also re-categorizes OTC items using regex patterns.
"""
import os
from pymongo import MongoClient, UpdateOne

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

client = MongoClient(MONGO_URL)
db = client[DB_NAME]
col = db.medicines

# 48 companies from user's Excel file - use partial match on manufacturer field
TOP_COMPANIES = [
    ("Sun Pharmaceutical Industries", "Sun Pharma"),
    ("Cipla", "Cipla"),
    ("Dr. Reddy's Laboratories", "Dr. Reddy"),
    ("Lupin", "Lupin"),
    ("Torrent Pharmaceuticals", "Torrent"),
    ("Aurobindo Pharma", "Aurobindo"),
    ("Zydus Lifesciences", "Zydus"),
    ("Alkem Laboratories", "Alkem"),
    ("Mankind Pharma", "Mankind"),
    ("Intas Pharmaceuticals", "Intas"),
    ("Glenmark Pharmaceuticals", "Glenmark"),
    ("Abbott India", "Abbott"),
    ("Aristo Pharmaceuticals", "Aristo"),
    ("Micro Labs", "Micro Labs"),
    ("Ipca Laboratories", "Ipca"),
    ("Ajanta Pharma", "Ajanta"),
    ("USV Private Limited", "USV"),
    ("Franco-Indian Pharmaceuticals", "Franco.Indian"),
    ("La Renon Healthcare", "La Renon"),
    ("Eris Lifesciences", "Eris"),
    ("Pfizer India", "Pfizer"),
    ("GlaxoSmithKline Pharmaceuticals", "GlaxoSmithKline|GSK"),
    ("Sanofi India", "Sanofi"),
    ("Novartis India", "Novartis"),
    ("Merck India", "Merck"),
    ("Bayer Pharmaceuticals India", "Bayer"),
    ("AstraZeneca India", "AstraZeneca"),
    ("Eli Lilly and Company India", "Eli Lilly"),
    ("Boehringer Ingelheim India", "Boehringer"),
    ("Johnson & Johnson India", "Johnson"),
    ("Biocon", "Biocon"),
    ("Natco Pharma", "Natco"),
    ("Hetero Drugs", "Hetero"),
    ("Strides Pharma Science", "Strides"),
    ("Gland Pharma", "Gland Pharma"),
    ("Alembic Pharmaceuticals", "Alembic"),
    ("Wockhardt", "Wockhardt"),
    ("Neuland Laboratories", "Neuland"),
    ("Medley Pharmaceuticals", "Medley"),
    ("Leeford Healthcare", "Leeford"),
    ("Knoll Healthcare", "Knoll"),
    ("Scott Edil Pharmacia", "Scott.Edil"),
    ("Kabir Lifesciences", "Kabir"),
    ("Biochem Pharmaceutical Industries", "Biochem"),
    ("Anthem Pharma", "Anthem"),
    ("Covxyl Pharma", "Covxyl"),
    ("Win Ovulation", "Win Ovulation"),
    ("Biotic Pharmacy", "Biotic"),
]

# OTC categories for re-classification
OTC_CATEGORIES = {
    r"sanitary pad|sanitary napkin|panty liner|menstrual pad|period pad|feminine hygiene|tampon|menstrual cup": "Feminine Hygiene",
    r"face wash|face cream|face serum|face moistur|face mask|face scrub|face toner|facial|cleanser|sunscreen|spf|bb cream|cc cream|foundation|concealer|compact|primer|kajal|mascara|eyeliner|lipstick|lip balm|lip gloss|nail polish|blush|bronzer|highlighter|makeup|beauty|cosmetic": "Beauty & Skin Care",
    r"body spray|deodorant|perfume|fragrance|deo|roll.on|body mist|aftershave": "Fragrances & Deodorants",
    r"shampoo|conditioner|hair oil|hair serum|hair mask|hair gel|hair spray|hair color|hair dye|anti.dandruff": "Hair Care",
    r"body wash|shower gel|body lotion|body butter|body oil|hand cream|foot cream|moisturizer|body scrub": "Body Care",
    r"toothpaste|toothbrush|mouthwash|dental floss|tongue cleaner|denture": "Oral Care",
    r"hand wash|hand sanitiz|soap bar|liquid soap|disinfect": "Hand Wash & Sanitizers",
    r"diaper|baby wipe|baby soap|baby oil|baby lotion|baby cream|baby powder|baby food|formula milk|lactogen|cerelac|pediasure|gripe water|teether|pacifier|feeding bottle|breast pump|nipple cream": "Baby Care",
    r"condom|lubricant|intimate wash|intimate hygiene|pregnancy test|fertility": "Sexual Wellness",
    r"protein powder|whey protein|mass gainer|bcaa|creatine|pre.workout|amino acid|protein bar|energy bar|meal replacement": "Sports Nutrition",
    r"health drink|horlicks|bournvita|complan|boost|protinex|ensure|pediasure|glucose|electrolyte|ors": "Health Drinks",
    r"bandage|gauze|cotton|surgical tape|first aid|thermometer|bp monitor|glucometer|oximeter|nebulizer|vaporizer|hot water bag|ice pack|wheelchair|walker|crutch|knee cap|wrist support|ankle support|cervical collar|back support|crepe bandage": "Health Devices & Accessories",
    r"mosquito repell|insect repell|room freshener|air purif|humidif": "Home Health",
}

import re

def main():
    total_medicines = col.count_documents({})
    print(f"Total medicines in DB: {total_medicines:,}")

    # Step 1: Reset any previous tags
    print("\nResetting previous tags...")
    col.update_many({}, {"$unset": {"is_top_company": "", "top_company": "", "is_starred": "", "is_branded": "", "brand": ""}})

    # Step 2: Tag each company's medicines
    print("\nTagging top company medicines...")
    total_tagged = 0
    for full_name, regex_pattern in TOP_COMPANIES:
        result = col.update_many(
            {"manufacturer": {"$regex": regex_pattern, "$options": "i"}},
            {"$set": {"is_top_company": True, "is_starred": True, "top_company": full_name}}
        )
        count = result.modified_count
        if count > 0:
            print(f"  {full_name}: {count:,} tagged")
        else:
            print(f"  {full_name}: 0 (no match)")
        total_tagged += count

    print(f"\nTotal tagged as top company: {total_tagged:,}")

    # Step 3: Re-categorize OTC items
    print("\nRe-categorizing OTC items...")
    otc_patterns = [(re.compile(pattern, re.IGNORECASE), cat) for pattern, cat in OTC_CATEGORIES.items()]
    
    uncategorized = list(col.find(
        {"category": {"$in": ["General", "Health & Wellness", None, ""]}},
        {"_id": 0, "id": 1, "name": 1}
    ))
    print(f"  Found {len(uncategorized):,} uncategorized medicines")

    otc_ops = []
    otc_count = 0
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
    print(f"  OTC re-categorized: {otc_count:,}")

    # Step 4: Create indexes
    print("\nCreating indexes...")
    col.create_index([("is_top_company", -1), ("is_starred", -1)], name="top_company_priority", sparse=True)
    col.create_index([("manufacturer", 1)], name="manufacturer_idx")

    # Final stats
    starred = col.count_documents({"is_starred": True})
    with_img = col.count_documents({"image_url": {"$nin": ["", None]}})
    starred_with_img = col.count_documents({"is_starred": True, "image_url": {"$nin": ["", None]}})
    print(f"\n=== Summary ===")
    print(f"Total medicines: {total_medicines:,}")
    print(f"Starred (top company): {starred:,}")
    print(f"With images: {with_img:,}")
    print(f"Starred + images: {starred_with_img:,}")

if __name__ == "__main__":
    main()
