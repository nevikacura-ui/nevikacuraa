"""
Enrich Orange Pharmacy + HealthPlus medicines from Kaggle datasets.
- A-Z Dataset: MRP, manufacturer, composition, form/pack, type
- Medicine Dataset: uses, side effects, substitutes, therapeutic class
Matches by medicine name (normalized). Updates in-place.
"""
import csv, os, re
from datetime import datetime, timezone
from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv

load_dotenv()

AZ_CSV = "/tmp/kaggle_data/A_Z_medicines_dataset_of_India.csv"
USAGE_CSV = "/tmp/kaggle_data/medicine_dataset.csv"
BATCH_SIZE = 5000

client = MongoClient(os.environ["MONGO_URL"])
db = client[os.environ.get("DB_NAME", "nevikacura")]
col = db.medicines

def normalize(name):
    if not name:
        return ""
    return re.sub(r'\s+', ' ', name.strip().lower())

def parse_form(pack_label):
    if not pack_label:
        return "Other"
    pl = pack_label.lower()
    if "tablet" in pl: return "Tablet"
    if "capsule" in pl: return "Capsule"
    if "syrup" in pl: return "Syrup"
    if "injection" in pl: return "Injection"
    if "cream" in pl: return "Cream"
    if "ointment" in pl: return "Ointment"
    if "gel" in pl: return "Gel"
    if "drop" in pl: return "Drops"
    if "suspension" in pl: return "Suspension"
    if "inhaler" in pl: return "Inhaler"
    if "spray" in pl: return "Spray"
    if "powder" in pl: return "Powder"
    if "lotion" in pl: return "Lotion"
    if "shampoo" in pl: return "Shampoo"
    if "soap" in pl: return "Soap"
    if "sachet" in pl: return "Sachet"
    if "strip" in pl: return "Tablet"
    if "vial" in pl: return "Injection"
    if "bottle" in pl: return "Liquid"
    if "tube" in pl: return "Cream"
    return "Other"

def categorize(composition, form, therapeutic_class, name):
    tc = (therapeutic_class or "").lower()
    comp = (composition or "").lower()
    nm = (name or "").lower()
    
    if "anti infective" in tc or "antibiotic" in tc: return "Antibiotics & Anti-Infectives"
    if "analgesic" in tc or "pain" in tc or "nsaid" in tc: return "Pain Relief"
    if "anti diabetic" in tc or "diabetes" in tc: return "Diabetes Care"
    if "cardiac" in tc or "anti hypertensive" in tc or "heart" in tc: return "Heart & BP"
    if "respiratory" in tc or "anti asthmatic" in tc: return "Respiratory"
    if "gastro" in tc or "antacid" in tc or "anti ulcer" in tc: return "Digestive Health"
    if "derma" in tc or "skin" in tc: return "Skin Care"
    if "vitamin" in tc or "supplement" in tc or "nutra" in tc: return "Vitamins & Supplements"
    if "anti allerg" in tc: return "Allergy"
    if "anti depressant" in tc or "psycho" in tc or "neuro" in tc: return "Mental Health"
    if "ophthal" in tc or "eye" in tc: return "Eye Care"
    if "ent" in tc or "ear" in tc: return "ENT"
    if "gynae" in tc or "hormone" in tc: return "Women's Health"
    if "oncology" in tc or "anti cancer" in tc: return "Oncology"
    if "ortho" in tc or "bone" in tc or "calcium" in tc: return "Bone & Joint"
    if "uro" in tc: return "Urology"
    
    if "paracetamol" in comp or "ibuprofen" in comp or "diclofenac" in comp: return "Pain Relief"
    if "amoxycillin" in comp or "azithromycin" in comp or "cefixime" in comp: return "Antibiotics & Anti-Infectives"
    if "omeprazole" in comp or "pantoprazole" in comp or "ranitidine" in comp: return "Digestive Health"
    if "metformin" in comp or "glimepiride" in comp: return "Diabetes Care"
    if "amlodipine" in comp or "atenolol" in comp or "losartan" in comp: return "Heart & BP"
    if "cetirizine" in comp or "levocetirizine" in comp or "fexofenadine" in comp: return "Allergy"
    if "salbutamol" in comp or "montelukast" in comp: return "Respiratory"
    if "multivitamin" in comp or "vitamin" in comp or "folic acid" in comp: return "Vitamins & Supplements"
    
    if "protein" in nm or "whey" in nm or "nutrition" in nm: return "Nutrition & Protein"
    if "diaper" in nm or "baby" in nm or "infant" in nm: return "Baby Care"
    if "shampoo" in nm or "hair" in nm or "scalp" in nm: return "Hair Care"
    if "face" in nm or "sunscreen" in nm or "moistur" in nm or "serum" in nm: return "Skin Care"
    if "toothpaste" in nm or "mouthwash" in nm or "dental" in nm: return "Oral Care"
    if "sanitiz" in nm or "disinfect" in nm or "mask" in nm: return "Hygiene & Safety"
    if "ayurved" in nm or "organic" in nm or "herbal" in nm: return "Ayurvedic & Herbal"
    if "device" in nm or "monitor" in nm or "thermometer" in nm or "glucometer" in nm: return "Health Devices"
    if "condom" in nm or "lubricant" in nm: return "Sexual Wellness"
    
    return "General"

# --- Step 1: Load A-Z dataset ---
print("Loading A-Z Medicine Dataset...")
az_data = {}
with open(AZ_CSV, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        key = normalize(row.get("name", ""))
        if not key: continue
        price = 0
        try: price = float(row.get("price(₹)", 0) or 0)
        except Exception:
            pass
        comp1 = (row.get("short_composition1", "") or "").strip()
        comp2 = (row.get("short_composition2", "") or "").strip()
        composition = f"{comp1} + {comp2}" if comp2 else comp1
        
        az_data[key] = {
            "mrp": price,
            "manufacturer": (row.get("manufacturer_name", "") or "").strip(),
            "composition": composition,
            "form": parse_form(row.get("pack_size_label", "")),
            "unit": (row.get("pack_size_label", "") or "").strip(),
            "is_discontinued": str(row.get("Is_discontinued", "")).upper() == "TRUE",
        }
print(f"Loaded {len(az_data)} A-Z records")

# --- Step 2: Load Usage/Side Effects dataset ---
print("Loading Usage/Side Effects Dataset...")
usage_data = {}
with open(USAGE_CSV, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        key = normalize(row.get("name", ""))
        if not key: continue
        
        side_effects = []
        for i in range(42):
            se = (row.get(f"sideEffect{i}", "") or "").strip()
            if se: side_effects.append(se)
        
        uses = []
        for i in range(5):
            u = (row.get(f"use{i}", "") or "").strip()
            if u: uses.append(u)
        
        substitutes = []
        for i in range(5):
            s = (row.get(f"substitute{i}", "") or "").strip()
            if s: substitutes.append(s)
        
        usage_data[key] = {
            "side_effects": ", ".join(side_effects[:8]),
            "uses": ", ".join(uses),
            "substitutes": substitutes[:5],
            "therapeutic_class": (row.get("Therapeutic Class", "") or "").strip(),
            "chemical_class": (row.get("Chemical Class", "") or "").strip(),
            "habit_forming": (row.get("Habit Forming", "") or "").strip(),
        }
print(f"Loaded {len(usage_data)} usage records")

# --- Step 3: Match and update DB ---
print("Fetching medicine names from DB...")
db_meds = list(col.find({}, {"_id": 0, "id": 1, "name": 1}))
print(f"Total DB medicines: {len(db_meds)}")

now = datetime.now(timezone.utc).isoformat()
operations = []
matched_az = 0
matched_usage = 0
categorized = 0

for med in db_meds:
    key = normalize(med.get("name", ""))
    if not key: continue
    
    update = {}
    
    az = az_data.get(key)
    if az:
        matched_az += 1
        if az["mrp"] > 0:
            update["mrp"] = az["mrp"]
            update["sale_price"] = az["mrp"]
        if az["manufacturer"]:
            update["manufacturer"] = az["manufacturer"]
        if az["composition"]:
            update["composition"] = az["composition"]
        if az["form"] != "Other":
            update["form"] = az["form"]
        if az["unit"]:
            update["unit"] = az["unit"]
        if az["is_discontinued"]:
            update["is_discontinued"] = True
    
    usage = usage_data.get(key)
    if usage:
        matched_usage += 1
        if usage["side_effects"]:
            update["side_effects"] = usage["side_effects"]
        if usage["uses"]:
            update["uses"] = usage["uses"]
        if usage.get("substitutes"):
            update["substitutes"] = usage["substitutes"]
        if usage["therapeutic_class"] and usage["therapeutic_class"] != "NA":
            update["therapeutic_class"] = usage["therapeutic_class"]
        if usage["chemical_class"] and usage["chemical_class"] != "NA":
            update["chemical_class"] = usage["chemical_class"]
        if usage["habit_forming"] and usage["habit_forming"] != "NA":
            update["habit_forming"] = usage["habit_forming"] == "Yes"
    
    comp = update.get("composition", "")
    form = update.get("form", "")
    tc = update.get("therapeutic_class", "")
    cat = categorize(comp, form, tc, med.get("name", ""))
    if cat != "General":
        update["category"] = cat
        categorized += 1
    
    if update:
        update["updated_at"] = now
        operations.append(UpdateOne({"id": med["id"]}, {"$set": update}))
    
    if len(operations) >= BATCH_SIZE:
        col.bulk_write(operations, ordered=False)
        print(f"  ...flushed {BATCH_SIZE} (AZ:{matched_az}, Usage:{matched_usage}, Cat:{categorized})")
        operations = []

if operations:
    col.bulk_write(operations, ordered=False)

print(f"\n=== Enrichment Complete ===")
print(f"Matched A-Z (MRP/manufacturer/composition): {matched_az}")
print(f"Matched Usage (uses/side effects/substitutes): {matched_usage}")
print(f"Categorized: {categorized}")
print(f"Total DB medicines: {len(db_meds)}")
