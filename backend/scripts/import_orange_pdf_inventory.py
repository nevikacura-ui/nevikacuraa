"""
Import Orange Pharmacy inventory from Stock_Summary_Report_24-08-2026.pdf (1316 items).
Replaces `medicines` + `pharmacy_inventory` collections entirely with this PDF's data.
Confirmed rules (via ask_human, Sep 2026):
- Exclude injectables/IV/consultation/delivery-charge rows (32 items)
- Collapse 14 pack-size-only variant groups into ONE product using the largest pack's price
- Merge 8 typo/near-duplicate pairs, keeping the correctly-spelled name
- Price shown is the PDF's sale price as-is (no recalculation); UI adds a
  "Price shown is after 15-20% discount" label separately
- Auto-categorize via Emergent LLM key (gemini-2.5-flash), same 29-category taxonomy as ai_categorize.py
Run: python3 scripts/import_orange_pdf_inventory.py
"""
import asyncio
import json
import os
import re
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

try:
    import pdfplumber
except ImportError:
    import subprocess
    subprocess.check_call(["pip", "install", "pdfplumber"])
    import pdfplumber

PDF_PATH = "/app/backend/data/imports/orange_pharmacy_stock_24-08-2026.pdf"
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

EXCLUDE_NAMES = {
    "INJ ABHAYRAB", "INJ AVIL", "INJ BOOSTRIX", "INJ DEXONA", "INJ DICLO", "INJ DROTIN",
    "INJ DYNAPA", "INJ EMSET 4MG", "INJ FASTAG", "INJ FLUARIX", "INJ HCG 5000",
    "INJ HETPARIN 40", "INJ HYDROCORT 100MG", "INJ INDIRAB", "INJ MECOVIXR 2500MG",
    "INJ MONOCEF", "INJ OROFER S-200ML", "INJ PAN 40MG", "INJ PCM", "INJ PROLUTON 500MG",
    "INJ TD VAC", "INJ TT", "INJ VAXIFLU", "INJ VIT K", "INJ WINGLAD FSH 75",
    "INJ/IV IRON SEACURE 200", "IV PCEM", "IV PCM 100ML (MACFAST)", "LONOPIN 40MG INJ",
    "CONSULTATION - GENERAL - G2", "CONSULTATION- GENERAL- G1", "DELIVERY CHARGES",
}

# Pack-size-only variant groups: collapse to the entry with the MAX price (largest pack)
PACK_VARIANT_GROUPS = [
    {"CHYMORIXL FORTE 10TAB", "CHYMORIXL FORTE 4TAB", "CHYMORIXL FORTE 6TAB", "CHYMORIXL FORTE TAB"},
    {"FLUMONT LC KID 5TAB", "FLUMONT LC KID TAB"},
    {"MONTECIP LC 5TAB", "MONTECIP LC TAB"},
    {"MONTECIP FX 6TAB", "MONTECIP FX TAB"},
    {"FEXOVAX M 10TAB", "FEXOVAX M 5TAB", "FEXOVAX M 6TAB", "FEXOVAX M TAB"},
    {"DROTACLEAR SPAS", "DROTACLEAR SPAS 2TAB", "DROTACLEAR SPAS 4TAB", "DROTACLEAR SPAS 6TAB"},
    {"DROZIVER 80 2TAB", "DROZIVER 80 4TAB", "DROZIVER 80 6TAB"},
    {"DROTIKIND M", "DROTIKIND M 2TAB", "DROTIKIND M 4TAB", "DROTIKIND M 6TAB"},
    {"DROTAWAYS M", "DROTAWAYS M 6TAB", "DROTAWAYS M 4TAB"},
    {"ORTHAL FORTE", "ORTHAL FORTE 5TAB", "ORTHAL FORTE 10TAB", "ORTHAL FORTE 6TAB"},
    {"FERTYL M 25", "FERTYL M 25 10TAB", "FERTYL M 25 20TAB"},
    {"DR EXCEL D3 4 CAP", "DR EXCEL D3 8 CAP"},
    {"TAVERA M", "TAVERA M 2TAB", "TAVERA M 4TAB", "TAVERA M 6TAB"},
    {"TRYZEN D", "TRYZEN D 4TAB", "TRYZEN D 6TAB"},
]

# Typo/near-duplicate merges: drop `drop_name`, keep `keep_name` as-is (name + price)
TYPO_MERGES = [
    {"keep": "VEET HAIR REMOVAL", "drop": "VEET HAIR REMOVEL"},
    {"keep": "LULIEASE CREAM 10 GM", "drop": "LIULIEASE CREAM 10G"},
    {"keep": "SUPRA RECLER O 200", "drop": "SUCRA RECLER O 200"},
    {"keep": "TELTAN 20", "drop": "TETAN 20"},
    {"keep": "TELTAN 40", "drop": "TETAN 40"},
    {"keep": "ROSAVE EZ 10", "drop": "ROSUVE-EZ 10"},
    {"keep": "DANFREE 1% SHAMPOO", "drop": "DANFREE SHAMPOO"},
    {"keep": "LETROLIM 2.5", "drop": "ZETROLIM 2.5"},
]

RENAME_ONLY = {
    "VENUS SAITARY 240MM": "VENUS SANITARY 240MM",
}

CATEGORIES = [
    "Pain Relief", "Antibiotics & Anti-Infectives", "Diabetes Care", "Heart & BP",
    "Respiratory", "Digestive Health", "Skin Care", "Hair Care", "Vitamins & Supplements",
    "Allergy", "Mental Health", "Eye Care", "ENT", "Women's Health", "Oncology",
    "Bone & Joint", "Urology", "Nutrition & Protein", "Baby Care", "Oral Care",
    "Hygiene & Safety", "Ayurvedic & Herbal", "Health Devices", "Sexual Wellness",
    "Liver Care", "Kidney Care", "Hormones & Thyroid", "Homeopathy", "General"
]


def extract_rows():
    """Extract (name, price) rows directly from the source PDF."""
    skip_starts = ("Orange Pharmacy", "Address:", "Drug License", "FSSAI", "Stock Summary", "Sl No.", "Page ")
    rows = []
    with pdfplumber.open(PDF_PATH) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if not text:
                continue
            for line in text.split("\n"):
                line = line.strip()
                if not line or line.startswith(skip_starts) or "vyaparapp" in line:
                    continue
                m = re.match(r"^(\d+)\s+(.+?)\s+₹\s*([\d,]+\.\d{2})", line)
                if m:
                    rows.append({"name": m.group(2).strip(), "price": float(m.group(3).replace(",", ""))})
    return rows


def clean_and_dedup(rows):
    """Apply exclusions, pack-variant collapsing, and typo merges."""
    by_name = {r["name"]: r["price"] for r in rows}

    # 1. Exclusions
    for name in EXCLUDE_NAMES:
        by_name.pop(name, None)

    # 2. Pack-size variant collapsing (keep max price in each group)
    for group in PACK_VARIANT_GROUPS:
        present = {n: by_name[n] for n in group if n in by_name}
        if not present:
            continue
        keep_name = max(present, key=present.get)
        for n in present:
            if n != keep_name:
                by_name.pop(n, None)

    # 3. Typo merges (drop the misspelled one)
    for merge in TYPO_MERGES:
        by_name.pop(merge["drop"], None)

    # 4. Spelling-only renames
    for old, new in RENAME_ONLY.items():
        if old in by_name:
            by_name[new] = by_name.pop(old)

    return [{"name": n, "price": p} for n, p in by_name.items()]


async def categorize_all(items):
    """Batch-categorize via Emergent LLM key, same taxonomy as ai_categorize.py."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    chat = LlmChat(
        api_key=os.environ["EMERGENT_LLM_KEY"],
        session_id="orange-pdf-import-cat",
        system_message="Categorize medicines. Return only a JSON array of category strings, same length and order as input."
    ).with_model("gemini", "gemini-2.5-flash")

    BATCH = 50
    for i in range(0, len(items), BATCH):
        batch = items[i:i + BATCH]
        names_text = "\n".join(f"{j+1}. {it['name']}" for j, it in enumerate(batch))
        prompt = f"""Categorize each product into ONE category. Return ONLY a JSON array of strings.
Categories: {', '.join(CATEGORIES)}

Products:
{names_text}"""
        try:
            response = await chat.send_message(UserMessage(text=prompt))
            match = re.search(r"\[.*?\]", response, re.DOTALL)
            cats = json.loads(match.group()) if match else None
            if cats and len(cats) == len(batch):
                for it, c in zip(batch, cats):
                    it["category"] = c if c in CATEGORIES else "General"
            else:
                for it in batch:
                    it["category"] = "General"
        except Exception as e:
            print(f"  Categorize batch failed at {i}: {str(e)[:80]}")
            for it in batch:
                it["category"] = "General"
        if (i // BATCH) % 10 == 0:
            print(f"  Categorized {min(i+BATCH, len(items))}/{len(items)}")
        await asyncio.sleep(0.1)


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    print("=" * 60)
    print("ORANGE PHARMACY PDF IMPORT (Stock_Summary_Report_24-08-2026)")
    print("=" * 60)

    raw_rows = extract_rows()
    print(f"Extracted {len(raw_rows)} raw rows from PDF")

    cleaned = clean_and_dedup(raw_rows)
    print(f"After exclusions + pack-collapse + typo-merge: {len(cleaned)} items")

    print("Categorizing via Emergent LLM key...")
    await categorize_all(cleaned)

    old_medicines = await db.medicines.count_documents({"source": "orange_pharmacy_pdf_2026"})
    old_inventory = await db.pharmacy_inventory.count_documents({"source": "orange_pharmacy_pdf_2026"})
    if old_medicines:
        await db.medicines.delete_many({"source": "orange_pharmacy_pdf_2026"})
    if old_inventory:
        await db.pharmacy_inventory.delete_many({"source": "orange_pharmacy_pdf_2026"})
    print(f"Cleared previous PDF-import rows: medicines={old_medicines}, pharmacy_inventory={old_inventory}")

    # Wipe the entire existing Orange Pharmacy inventory (replace, per user confirmation)
    wiped_medicines = await db.medicines.count_documents({})
    wiped_inventory = await db.pharmacy_inventory.count_documents({})
    if wiped_medicines:
        await db.medicines.drop()
    if wiped_inventory:
        await db.pharmacy_inventory.drop()
    print(f"Dropped old collections: medicines={wiped_medicines}, pharmacy_inventory={wiped_inventory}")

    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for item in cleaned:
        price = round(item["price"], 2)
        docs.append({
            "id": str(uuid.uuid4()),
            "name": item["name"],
            "form": "",
            "company": "",
            "manufacturer": "",
            "category": item.get("category", "General"),
            "image_url": "",
            "barcode": "",
            "mrp": price,
            "sale_price": price,
            "discount_percent": 0,
            "stock": 100,
            "unit": "Unit",
            "store": "orange_pharmacy",
            "priority": 0,
            "description": "",
            "source": "orange_pharmacy_pdf_2026",
            "created_at": now,
            "created_by": "import_orange_pdf_inventory",
        })

    if docs:
        result = await db.pharmacy_inventory.insert_many(docs)
        print(f"Inserted {len(result.inserted_ids)} items into pharmacy_inventory")
        docs_for_medicines = [{**d, "id": d["id"]} for d in docs]
        for d in docs_for_medicines:
            d.pop("_id", None)
        await db.medicines.insert_many(docs_for_medicines)
        print(f"Inserted {len(docs_for_medicines)} items into medicines")

    await db.pharmacy_inventory.create_index([("name", 1)])
    await db.pharmacy_inventory.create_index([("category", 1)])
    await db.medicines.create_index([("category", 1)])
    await db.medicines.create_index([("store", 1)])
    await db.medicines.create_index(
        [("name", "text"), ("generic_name", "text"), ("manufacturer", "text"), ("composition", "text")],
        name="medicines_text_search"
    )

    final_count = await db.pharmacy_inventory.count_documents({})
    print(f"\nFinal pharmacy_inventory count: {final_count}")

    cat_counts = {}
    async for doc in db.pharmacy_inventory.find({}, {"_id": 0, "category": 1}):
        cat_counts[doc["category"]] = cat_counts.get(doc["category"], 0) + 1
    print("\nCategory breakdown:")
    for cat, count in sorted(cat_counts.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}")

    client.close()
    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
