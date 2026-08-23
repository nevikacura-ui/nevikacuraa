"""
Fast Import: Orange HealthPlus OTC products from OneDrive Excel.
"""
import openpyxl, os, uuid
from datetime import datetime, timezone
from pymongo import MongoClient, UpdateOne, InsertOne
from dotenv import load_dotenv

load_dotenv()

XLSX_PATH = "/tmp/orange_healthplus_data.xlsx"
STORE = "orange_healthplus"
BATCH_SIZE = 10000

client = MongoClient(os.environ["MONGO_URL"])
db = client[os.environ.get("DB_NAME", "nevikacura")]
col = db.medicines

print("Loading Excel...")
wb = openpyxl.load_workbook(XLSX_PATH, read_only=True)
ws = wb.active

print(f"Indexing existing {STORE} products...")
existing_names = {}
for doc in col.find({"store": STORE}, {"_id": 0, "name": 1, "id": 1}):
    existing_names[doc["name"].strip().lower()] = doc["id"]
print(f"Existing: {len(existing_names)}")

col.create_index([("name", 1), ("store", 1)])

now = datetime.now(timezone.utc).isoformat()
updates = []
inserts = []
skip = 0
seen = set(existing_names.keys())

print("Processing rows...")
for i, row in enumerate(ws.iter_rows(min_row=2, values_only=True)):
    if i % 50000 == 0 and i > 0:
        print(f"  ...{i} rows ({len(inserts)} new, {len(updates)} updated, {skip} skipped)")

    product_id = row[0] if len(row) > 0 else None
    product_name = row[1] if len(row) > 1 else None
    image_urls_raw = row[2] if len(row) > 2 else None

    if not product_name or not str(product_name).strip():
        skip += 1
        continue

    name = str(product_name).strip()
    name_lower = name.lower()

    image_url = ""
    images_list = []
    if image_urls_raw and str(image_urls_raw).strip():
        urls = [u.strip() for u in str(image_urls_raw).split("|") if u.strip()]
        if urls:
            image_url = urls[0]
            for u in urls:
                images_list.append({
                    "id": str(uuid.uuid4()),
                    "url": u,
                    "filename": u.split("/")[-1] if "/" in u else "",
                    "content_type": "image/jpeg",
                })

    if name_lower in existing_names:
        if image_url:
            updates.append(UpdateOne(
                {"id": existing_names[name_lower]},
                {"$set": {"image_url": image_url, "images": images_list, "product_id_ext": str(product_id or ""), "updated_at": now}}
            ))
    elif name_lower not in seen:
        seen.add(name_lower)
        inserts.append(InsertOne({
            "id": str(uuid.uuid4()),
            "product_id_ext": str(product_id or ""),
            "name": name,
            "sale_price": 0, "mrp": 0, "price": 0, "discount_percent": 0,
            "category": "Health & Wellness", "unit": "unit", "form": "OTC",
            "manufacturer": "", "generic_name": "", "description": "",
            "image_url": image_url, "images": images_list,
            "prescription_required": False, "is_active": True,
            "store": STORE,
            "created_at": now, "updated_at": now,
            "composition": "", "side_effects": "", "uses": "",
        }))
    else:
        skip += 1

    if len(updates) >= BATCH_SIZE:
        col.bulk_write(updates, ordered=False)
        updates = []
    if len(inserts) >= BATCH_SIZE:
        col.bulk_write(inserts, ordered=False)
        inserts = []

wb.close()

if updates:
    col.bulk_write(updates, ordered=False)
if inserts:
    col.bulk_write(inserts, ordered=False)

final = col.count_documents({"store": STORE})
print(f"\n=== Import Complete ===")
print(f"New inserted: {len(seen) - len(existing_names)}")
print(f"Existing updated: {len(updates)}")
print(f"Skipped: {skip}")
print(f"Total {STORE} in DB: {final}")
