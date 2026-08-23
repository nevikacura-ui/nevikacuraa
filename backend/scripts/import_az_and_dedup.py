"""
Phase 2: Import A-Z CSV + Full Deduplication Report + Cleanup
Run AFTER the first import completes.
"""
import csv, json, os, sys
sys.path.insert(0, '/app/backend')
from pymongo import MongoClient, UpdateOne
from datetime import datetime, timezone
import uuid
from collections import Counter

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')
client = MongoClient(MONGO_URL.strip('"'))
db = client[DB_NAME.strip('"')]
coll = db['medicines']

# ========== PHASE 1: Import A-Z CSV (upsert - adds any missing records) ==========
print("=" * 60)
print("PHASE 1: Importing A-Z Medicines CSV")
print("=" * 60)

AZ_CSV = '/tmp/az_medicines.csv'
with open(AZ_CSV, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

print(f"A-Z CSV records: {len(rows)}")

def extract_form(name, pack_label):
    name_lower = name.lower()
    pack_lower = (pack_label or '').lower()
    for kw, form in [('tablet','Tablet'),('capsule','Capsule'),('syrup','Syrup'),
                     ('oral solution','Syrup'),('suspension','Syrup'),('cream','Cream'),
                     ('gel','Gel'),('ointment','Ointment'),('drop','Drops'),
                     ('injection','Injection'),('infusion','Injection'),('spray','Spray'),
                     ('inhaler','Inhaler'),('powder','Powder'),('sachet','Powder'),('shampoo','Shampoo')]:
        if kw in name_lower or kw in pack_lower:
            return form
    return 'Other'

def categorize(comp, name):
    c = (comp or '').lower()
    n = name.lower()
    cats = [
        (['paracetamol','ibuprofen','diclofenac','aceclofenac','nimesulide'], 'Pain Relief'),
        (['amoxycillin','azithromycin','cefixime','ciprofloxacin','ofloxacin','levofloxacin','doxycycline','metronidazole'], 'Antibiotics'),
        (['cetirizine','montelukast','levocetrizine','fexofenadine','phenylephrine','chlorpheniramine'], 'Cough, Cold & Fever'),
        (['metformin','glimepiride','insulin','voglibose','sitagliptin'], 'Diabetes Care'),
        (['amlodipine','atenolol','telmisartan','losartan','ramipril','atorvastatin','rosuvastatin','clopidogrel'], 'Heart Care'),
        (['pantoprazole','omeprazole','rabeprazole','domperidone','ondansetron'], 'Stomach Care'),
        (['fluconazole','clotrimazole','ketoconazole','luliconazole','terbinafine','clobetasol'], 'Derma Care'),
        (['vitamin','folic acid','calcium','iron','zinc','multivitamin'], 'Vitamins & Supplements'),
    ]
    for keywords, cat in cats:
        if any(k in c for k in keywords):
            return cat
    return 'General'

# Deduplicate within CSV
seen = set()
unique_rows = []
for row in rows:
    key = (row['name'].strip().lower(), row['manufacturer_name'].strip().lower())
    if key not in seen:
        seen.add(key)
        unique_rows.append(row)

print(f"Unique A-Z records: {len(unique_rows)}")

now = datetime.now(timezone.utc).isoformat()
batch_size = 5000
az_inserted = 0
az_updated = 0

for i in range(0, len(unique_rows), batch_size):
    batch = unique_rows[i:i+batch_size]
    ops = []
    for row in batch:
        name = row['name'].strip()
        mfg = row['manufacturer_name'].strip()
        try:
            price = float(row.get('price(₹)', '0') or '0')
        except:
            price = 0.0
        is_disc = row.get('Is_discontinued', '').upper() == 'TRUE'
        comp = (row.get('short_composition1', '') or '').strip()
        
        doc = {
            "name": name,
            "manufacturer": mfg,
            "mrp": price,
            "unit": extract_form(name, row.get('pack_size_label', '')),
            "pack": (row.get('pack_size_label', '') or '').strip(),
            "generic_name": comp,
            "composition1": comp,
            "composition2": (row.get('short_composition2', '') or '').strip(),
            "category": categorize(comp, name),
            "is_discontinued": is_disc,
            "stock_quantity": 0 if is_disc else 100,
            "discount_percent": 0,
            "image_url": "",
            "source": "dataset",
            "updated_at": now,
        }
        ops.append(UpdateOne(
            {"name": name, "manufacturer": mfg},
            {"$set": doc, "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": now}},
            upsert=True
        ))
    if ops:
        result = coll.bulk_write(ops, ordered=False)
        az_inserted += result.upserted_count
        az_updated += result.modified_count
        print(f"  Batch {i//batch_size+1}: new={result.upserted_count}, updated={result.modified_count}")

print(f"\nA-Z Import: {az_inserted} new, {az_updated} updated")

# ========== PHASE 2: Full Duplicate Report ==========
print("\n" + "=" * 60)
print("PHASE 2: Full Duplicate Analysis")
print("=" * 60)

# Get all medicines
total = coll.count_documents({})
print(f"Total medicines in DB: {total:,}")

# Find exact name duplicates using aggregation
pipeline = [
    {"$group": {
        "_id": {"name": {"$toLower": "$name"}},
        "count": {"$sum": 1},
        "ids": {"$push": "$id"},
        "names": {"$push": "$name"},
        "manufacturers": {"$push": "$manufacturer"},
        "mrps": {"$push": "$mrp"},
        "sources": {"$push": "$source"}
    }},
    {"$match": {"count": {"$gt": 1}}},
    {"$sort": {"count": -1}}
]

dupes = list(coll.aggregate(pipeline, allowDiskUse=True))
print(f"Duplicate name groups: {len(dupes)}")
total_extra = sum(d['count'] - 1 for d in dupes)
print(f"Total extra duplicate records to remove: {total_extra:,}")

# Build detailed report
report = {
    "generated_at": now,
    "total_medicines_before": total,
    "duplicate_groups": len(dupes),
    "total_duplicate_rows_to_remove": total_extra,
    "after_cleanup": total - total_extra,
    "top_100_duplicates": [],
    "all_duplicates_summary": []
}

for d in dupes[:100]:
    group = {
        "name": d['_id']['name'],
        "occurrences": d['count'],
        "records": []
    }
    for j in range(min(d['count'], 5)):
        group["records"].append({
            "id": d['ids'][j] if j < len(d['ids']) else '',
            "display_name": d['names'][j] if j < len(d['names']) else '',
            "manufacturer": d['manufacturers'][j] if j < len(d['manufacturers']) else '',
            "mrp": d['mrps'][j] if j < len(d['mrps']) else 0,
            "source": d['sources'][j] if j < len(d['sources']) else ''
        })
    report["top_100_duplicates"].append(group)

for d in dupes:
    report["all_duplicates_summary"].append({
        "name": d['_id']['name'],
        "count": d['count']
    })

with open('/tmp/duplicate_report_full.json', 'w') as f:
    json.dump(report, f, indent=2, default=str)
print(f"\nFull report saved to /tmp/duplicate_report_full.json")

# ========== PHASE 3: Remove Duplicates ==========
print("\n" + "=" * 60)
print("PHASE 3: Removing Duplicates")
print("=" * 60)

# Strategy: For each duplicate group, keep the record with the most data
# (prefer dataset records with description, then highest MRP, then newest)
removed = 0
for d in dupes:
    name_lower = d['_id']['name']
    # Get all records for this name
    records = list(coll.find(
        {"name": {"$regex": f"^{name_lower}$", "$options": "i"}},
        {"_id": 1, "id": 1, "name": 1, "mrp": 1, "description": 1, "source": 1, "image_url": 1, "updated_at": 1}
    ))
    
    if len(records) <= 1:
        continue
    
    # Score each record - keep the best one
    def score(r):
        s = 0
        if r.get('description'): s += 10
        if r.get('image_url'): s += 5
        if r.get('mrp', 0) > 0: s += 3
        if r.get('source') == 'custom': s += 20  # Always prefer staff-added
        return s
    
    records.sort(key=lambda r: score(r), reverse=True)
    # Keep first (best), delete rest
    to_delete = [r['_id'] for r in records[1:]]
    if to_delete:
        result = coll.delete_many({"_id": {"$in": to_delete}})
        removed += result.deleted_count

final_count = coll.count_documents({})
print(f"Removed: {removed:,} duplicate records")
print(f"Final medicine count: {final_count:,}")

# Update report with final stats
report["duplicates_removed"] = removed
report["final_count"] = final_count
with open('/tmp/duplicate_report_full.json', 'w') as f:
    json.dump(report, f, indent=2, default=str)

# ========== Create indexes ==========
print("\n" + "=" * 60)
print("PHASE 4: Creating Search Indexes")
print("=" * 60)
try:
    coll.create_index([("name", "text"), ("generic_name", "text"), ("manufacturer", "text")])
    print("Text index created")
except:
    print("Text index exists")
try:
    coll.create_index([("name", 1)])
    print("Name index created")
except:
    pass

print("\n" + "=" * 60)
print("COMPLETE")
print("=" * 60)
print(f"Final DB: {final_count:,} unique medicines")
print(f"Duplicates removed: {removed:,}")
print(f"Report: /tmp/duplicate_report_full.json")
