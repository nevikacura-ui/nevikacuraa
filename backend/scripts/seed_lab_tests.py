"""
Seed lab tests from frontend hardcoded data into MongoDB lab_tests collection.
Run: python scripts/seed_lab_tests.py
"""
import asyncio
import os
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "nevikacura")

# All test data with prices and categories
TEST_CATALOG = [
    # Pregnancy & OBGYN
    {"name": "Dual / Double Marker", "price": 2000, "category": "Pregnancy & OBGYN", "sample_type": "blood"},
    {"name": "Quadruple Marker", "price": 2600, "category": "Pregnancy & OBGYN", "sample_type": "blood"},
    {"name": "ANC (Ante Natal Profile)", "price": 1950, "category": "Pregnancy & OBGYN", "sample_type": "blood"},
    {"name": "Beta HCG", "price": 680, "category": "Pregnancy & OBGYN", "sample_type": "blood"},
    {"name": "AMH (Anti-Mullerian Hormone)", "price": 1550, "category": "Pregnancy & OBGYN", "sample_type": "blood"},
    {"name": "Hormonal Basic", "price": 800, "category": "Hormones", "sample_type": "blood"},
    {"name": "Hormonal Advance", "price": 1200, "category": "Hormones", "sample_type": "blood"},
    {"name": "LH (Luteinizing Hormone)", "price": 400, "category": "Hormones", "sample_type": "blood"},
    {"name": "FSH (Follicle Stimulating Hormone)", "price": 400, "category": "Hormones", "sample_type": "blood"},
    {"name": "Prolactin", "price": 350, "category": "Hormones", "sample_type": "blood"},
    {"name": "Estradiol (E2)", "price": 650, "category": "Hormones", "sample_type": "blood"},
    {"name": "Progesterone", "price": 500, "category": "Hormones", "sample_type": "blood"},
    {"name": "Serum Testosterone", "price": 500, "category": "Hormones", "sample_type": "blood"},
    # Diabetes & Sugar
    {"name": "FBS (Fasting Blood Sugar)", "price": 75, "category": "Diabetes & Sugar", "sample_type": "blood", "fasting_required": True, "preparation_instructions": "8-12 hours fasting required. Only water allowed."},
    {"name": "PPBS (Post Prandial Blood Sugar)", "price": 75, "category": "Diabetes & Sugar", "sample_type": "blood", "preparation_instructions": "Test 2 hours after a meal."},
    {"name": "Random Blood Sugar (RBS)", "price": 75, "category": "Diabetes & Sugar", "sample_type": "blood"},
    {"name": "HbA1c (Glycated Hemoglobin)", "price": 450, "category": "Diabetes & Sugar", "sample_type": "blood"},
    {"name": "Diabetes Basic", "price": 250, "category": "Diabetes & Sugar", "sample_type": "blood"},
    {"name": "Diabetes Screening", "price": 600, "category": "Diabetes & Sugar", "sample_type": "blood"},
    {"name": "OGTT - 3 Sample", "price": 450, "category": "Diabetes & Sugar", "sample_type": "blood", "fasting_required": True, "preparation_instructions": "10-12 hours fasting. Multiple samples over 2-3 hours."},
    {"name": "Insulin - Post Prandial", "price": 650, "category": "Diabetes & Sugar", "sample_type": "blood"},
    {"name": "Insulin Random", "price": 1100, "category": "Diabetes & Sugar", "sample_type": "blood"},
    {"name": "C-Peptide", "price": 1050, "category": "Diabetes & Sugar", "sample_type": "blood"},
    # Blood Tests
    {"name": "CBC (Complete Blood Count)", "price": 200, "category": "Blood Tests", "sample_type": "blood"},
    {"name": "CBC ESR", "price": 380, "category": "Blood Tests", "sample_type": "blood"},
    {"name": "Blood Group", "price": 150, "category": "Blood Tests", "sample_type": "blood"},
    {"name": "Hemoglobin (Hb)", "price": 100, "category": "Blood Tests", "sample_type": "blood"},
    {"name": "ESR", "price": 100, "category": "Blood Tests", "sample_type": "blood"},
    {"name": "BT CT", "price": 250, "category": "Blood Tests", "sample_type": "blood"},
    {"name": "PT INR", "price": 450, "category": "Blood Tests", "sample_type": "blood"},
    # Thyroid
    {"name": "TSH", "price": 200, "category": "Thyroid", "sample_type": "blood"},
    {"name": "Thyroid Profile - Free", "price": 550, "category": "Thyroid", "sample_type": "blood"},
    {"name": "Thyroid Profile - Total", "price": 350, "category": "Thyroid", "sample_type": "blood"},
    {"name": "T3", "price": 200, "category": "Thyroid", "sample_type": "blood"},
    {"name": "T4", "price": 200, "category": "Thyroid", "sample_type": "blood"},
    {"name": "Free T3 T4 TSH", "price": 550, "category": "Thyroid", "sample_type": "blood"},
    # Vitamins & Minerals
    {"name": "Vitamin D", "price": 850, "category": "Vitamins & Minerals", "sample_type": "blood"},
    {"name": "Vitamin B12", "price": 500, "category": "Vitamins & Minerals", "sample_type": "blood"},
    {"name": "Iron Studies", "price": 600, "category": "Vitamins & Minerals", "sample_type": "blood"},
    {"name": "Calcium", "price": 200, "category": "Vitamins & Minerals", "sample_type": "blood"},
    {"name": "Serum Magnesium", "price": 200, "category": "Vitamins & Minerals", "sample_type": "blood"},
    {"name": "Serum Phosphorus", "price": 200, "category": "Vitamins & Minerals", "sample_type": "blood"},
    {"name": "Sodium", "price": 150, "category": "Vitamins & Minerals", "sample_type": "blood"},
    {"name": "Potassium", "price": 150, "category": "Vitamins & Minerals", "sample_type": "blood"},
    {"name": "G6PD", "price": 470, "category": "Vitamins & Minerals", "sample_type": "blood"},
    # Liver Function
    {"name": "LFT (Liver Function Test)", "price": 450, "category": "Liver Function", "sample_type": "blood", "fasting_required": True, "preparation_instructions": "8-12 hours fasting recommended."},
    {"name": "SGPT (ALT)", "price": 180, "category": "Liver Function", "sample_type": "blood"},
    {"name": "SGOT (AST)", "price": 180, "category": "Liver Function", "sample_type": "blood"},
    {"name": "Total Bilirubin", "price": 150, "category": "Liver Function", "sample_type": "blood"},
    {"name": "Direct Bilirubin", "price": 150, "category": "Liver Function", "sample_type": "blood"},
    {"name": "Serum Albumin", "price": 300, "category": "Liver Function", "sample_type": "blood"},
    {"name": "Bile Acid", "price": 2000, "category": "Liver Function", "sample_type": "blood"},
    {"name": "Serum Amylase", "price": 500, "category": "Liver Function", "sample_type": "blood"},
    {"name": "Lipase", "price": 600, "category": "Liver Function", "sample_type": "blood"},
    {"name": "LDH", "price": 550, "category": "Liver Function", "sample_type": "blood"},
    # Kidney Function
    {"name": "RFT (Renal Function Test)", "price": 600, "category": "Kidney Function", "sample_type": "blood"},
    {"name": "Creatinine", "price": 180, "category": "Kidney Function", "sample_type": "blood"},
    {"name": "BUN", "price": 240, "category": "Kidney Function", "sample_type": "blood"},
    {"name": "Blood Urea", "price": 240, "category": "Kidney Function", "sample_type": "blood"},
    {"name": "Uric Acid", "price": 200, "category": "Kidney Function", "sample_type": "blood"},
    {"name": "Serum Electrolytes", "price": 400, "category": "Kidney Function", "sample_type": "blood"},
    {"name": "UPCR", "price": 660, "category": "Kidney Function", "sample_type": "blood"},
    {"name": "Cystatin C", "price": 1100, "category": "Kidney Function", "sample_type": "blood"},
    # Lipid Profile
    {"name": "Lipid Profile", "price": 500, "category": "Lipid Profile", "sample_type": "blood", "fasting_required": True, "preparation_instructions": "10-12 hours fasting for accurate results."},
    {"name": "Serum Cholesterol", "price": 220, "category": "Lipid Profile", "sample_type": "blood"},
    {"name": "Triglycerides", "price": 250, "category": "Lipid Profile", "sample_type": "blood", "fasting_required": True},
    {"name": "HDL", "price": 150, "category": "Lipid Profile", "sample_type": "blood"},
    {"name": "LDL", "price": 150, "category": "Lipid Profile", "sample_type": "blood"},
    # Cardiac
    {"name": "CPKMB", "price": 450, "category": "Cardiac", "sample_type": "blood"},
    {"name": "Troponin I", "price": 1050, "category": "Cardiac", "sample_type": "blood"},
    {"name": "ECG (Electrocardiogram)", "price": 300, "category": "Cardiac", "sample_type": "other"},
    # Infection
    {"name": "HIV - Rapid", "price": 550, "category": "Infection", "sample_type": "blood"},
    {"name": "HCV - Rapid", "price": 600, "category": "Infection", "sample_type": "blood"},
    {"name": "HBsAg", "price": 400, "category": "Infection", "sample_type": "blood"},
    {"name": "VDRL / RPR", "price": 200, "category": "Infection", "sample_type": "blood"},
    {"name": "Dengue NS1 Rapid", "price": 800, "category": "Infection", "sample_type": "blood"},
    {"name": "Dengue Profile (IgM+IgG+NS1)", "price": 1450, "category": "Infection", "sample_type": "blood"},
    {"name": "Widal Test", "price": 330, "category": "Infection", "sample_type": "blood"},
    {"name": "Filaria Antigen", "price": 360, "category": "Infection", "sample_type": "blood"},
    {"name": "MP Antigen (Malaria)", "price": 650, "category": "Infection", "sample_type": "blood"},
    {"name": "H3 Viral Marker", "price": 1200, "category": "Infection", "sample_type": "blood"},
    # Culture & Sensitivity
    {"name": "Blood Culture & Sensitivity", "price": 1000, "category": "Culture & Sensitivity", "sample_type": "blood"},
    {"name": "Urine Culture & Sensitivity", "price": 1000, "category": "Culture & Sensitivity", "sample_type": "urine"},
    {"name": "Sputum Routine", "price": 150, "category": "Culture & Sensitivity", "sample_type": "sputum"},
    {"name": "Pus C/S", "price": 1000, "category": "Culture & Sensitivity", "sample_type": "other"},
    # Arthritis & Autoimmune
    {"name": "RA Factor", "price": 600, "category": "Arthritis & Autoimmune", "sample_type": "blood"},
    {"name": "CRP (C-Reactive Protein)", "price": 450, "category": "Arthritis & Autoimmune", "sample_type": "blood"},
    {"name": "ASO Titre", "price": 550, "category": "Arthritis & Autoimmune", "sample_type": "blood"},
    {"name": "Anti CCP", "price": 1250, "category": "Arthritis & Autoimmune", "sample_type": "blood"},
    {"name": "ANA IFA", "price": 1000, "category": "Arthritis & Autoimmune", "sample_type": "blood"},
    {"name": "ANA Blot", "price": 3300, "category": "Arthritis & Autoimmune", "sample_type": "blood"},
    {"name": "C ANCA", "price": 1300, "category": "Arthritis & Autoimmune", "sample_type": "blood"},
    {"name": "P ANCA", "price": 1300, "category": "Arthritis & Autoimmune", "sample_type": "blood"},
    {"name": "Anti dsDNA", "price": 1200, "category": "Arthritis & Autoimmune", "sample_type": "blood"},
    {"name": "Arthritis Basic Panel", "price": 1650, "category": "Arthritis & Autoimmune", "sample_type": "blood"},
    # Tumor Markers
    {"name": "CA 19.9", "price": 1000, "category": "Tumor Markers", "sample_type": "blood"},
    {"name": "CA 125", "price": 1100, "category": "Tumor Markers", "sample_type": "blood"},
    {"name": "CA 15.3", "price": 1100, "category": "Tumor Markers", "sample_type": "blood"},
    {"name": "CEA", "price": 800, "category": "Tumor Markers", "sample_type": "blood"},
    {"name": "Alpha Fetoprotein", "price": 800, "category": "Tumor Markers", "sample_type": "blood"},
    {"name": "Serum PSA", "price": 1050, "category": "Tumor Markers", "sample_type": "blood"},
    # Urine Tests
    {"name": "Urine Routine & Microscopy", "price": 150, "category": "Urine Tests", "sample_type": "urine"},
    # Imaging / Sonography
    {"name": "Early Scan", "price": 800, "category": "Imaging", "sample_type": "imaging"},
    {"name": "NT Scan (Nuchal Translucency)", "price": 1500, "category": "Imaging", "sample_type": "imaging"},
    {"name": "Growth Scan", "price": 1000, "category": "Imaging", "sample_type": "imaging"},
    {"name": "USG Pelvis", "price": 700, "category": "Imaging", "sample_type": "imaging"},
    {"name": "Follicular Monitoring", "price": 500, "category": "Imaging", "sample_type": "imaging"},
    # Genetic / Special
    {"name": "Karyotyping", "price": 5500, "category": "Genetic & Special", "sample_type": "blood"},
    {"name": "NIPT", "price": 12000, "category": "Genetic & Special", "sample_type": "blood"},
    {"name": "Histopathology", "price": 2500, "category": "Genetic & Special", "sample_type": "tissue"},
    {"name": "Biopsy Growth", "price": 2000, "category": "Genetic & Special", "sample_type": "tissue"},
    {"name": "Coombs Test, Indirect", "price": 500, "category": "Blood Tests", "sample_type": "blood"},
    # Packages
    {"name": "Diabetes Screening Package", "price": 600, "category": "Health Packages", "sample_type": "blood", "turnaround_time": "6 hours"},
    {"name": "Diabetes Basic Package", "price": 250, "category": "Health Packages", "sample_type": "blood"},
    {"name": "Diabetes Advance Package", "price": 1200, "category": "Health Packages", "sample_type": "blood"},
    {"name": "Mango Basic Package", "price": 999, "category": "Health Packages", "sample_type": "blood"},
    {"name": "Mango Total Package", "price": 2499, "category": "Health Packages", "sample_type": "blood"},
    {"name": "Mango Xclusive Package", "price": 4999, "category": "Health Packages", "sample_type": "blood"},
    {"name": "Cardiac Risk Profile", "price": 1500, "category": "Health Packages", "sample_type": "blood"},
    {"name": "Anemia Profile", "price": 800, "category": "Health Packages", "sample_type": "blood"},
    {"name": "Arthritis Panel", "price": 1650, "category": "Health Packages", "sample_type": "blood"},
    {"name": "Fever Panel", "price": 1200, "category": "Health Packages", "sample_type": "blood"},
    {"name": "Pre-Operative Profile", "price": 2000, "category": "Health Packages", "sample_type": "blood"},
    {"name": "Master Health Checkup", "price": 3999, "category": "Health Packages", "sample_type": "blood"},
]

async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    existing = await db.lab_tests.count_documents({})
    if existing > 0:
        print(f"Already have {existing} tests in DB. Clearing and re-seeding...")
        await db.lab_tests.delete_many({})
    
    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for i, test in enumerate(TEST_CATALOG):
        doc = {
            "id": str(uuid.uuid4()),
            "code": f"MHL{i+1:04d}",
            "name": test["name"],
            "category": test.get("category", "General"),
            "price": test["price"],
            "home_collection_price": test["price"] + 50,
            "sample_type": test.get("sample_type", "blood"),
            "turnaround_time": test.get("turnaround_time", "24 hours"),
            "fasting_required": test.get("fasting_required", False),
            "preparation_instructions": test.get("preparation_instructions", ""),
            "description": "",
            "is_active": True,
            "created_by": "system_seed",
            "created_at": now,
            "updated_at": now
        }
        docs.append(doc)
    
    result = await db.lab_tests.insert_many(docs)
    print(f"Seeded {len(result.inserted_ids)} lab tests into MongoDB")
    
    # Create index
    await db.lab_tests.create_index("name")
    await db.lab_tests.create_index("category")
    await db.lab_tests.create_index("is_active")
    print("Created indexes on lab_tests collection")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed())
