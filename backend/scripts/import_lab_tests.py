"""
Import lab tests from the Integrated Lab List spreadsheet into Mango Health Labs.
Handles deduplication against existing tests and within the import list.
"""
import asyncio
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"

# Raw data from spreadsheet (188 rows) - department, test_name
RAW_TESTS = [
    ("BIOCHEMISTRY", "24hrs Microalbumin Creatinine Ratio"),
    ("BIOCHEMISTRY", "24hrs Urinary Protein Creatinine Ratio"),
    ("BIOCHEMISTRY", "Urine Creatinine"),
    ("BIOCHEMISTRY", "A:G Ratio"),
    ("BIOCHEMISTRY", "ADA-Adenosine De Aminase"),
    ("BIOCHEMISTRY", "Acid Phosphatase - Total"),
    ("BIOCHEMISTRY", "Albumin- Serum"),
    ("BIOCHEMISTRY", "Alcohol"),
    ("BIOCHEMISTRY", "Alkaline Phosphatase"),
    ("BIOCHEMISTRY", "Ammonia"),
    ("BIOCHEMISTRY", "Amphetamines (AMP)"),
    ("BIOCHEMISTRY", "Amylase"),
    ("BIOCHEMISTRY", "Anti GAD Antibody"),
    ("BIOCHEMISTRY", "Apolipoprotein-A1"),
    ("BIOCHEMISTRY", "Apolipoprotein-B"),
    ("BIOCHEMISTRY", "BUN-Blood Urea Nitrogen"),
    ("BIOCHEMISTRY", "BUN/CREATININE Ratio"),
    ("BIOCHEMISTRY", "Bence Jones Protein - BJP"),
    ("BIOCHEMISTRY", "Benzodiazepines(BZD) - Urine"),
    ("BIOCHEMISTRY", "Benzodiazepines(BZD)-Blood"),
    ("BIOCHEMISTRY", "Bilirubin Direct"),
    ("BIOCHEMISTRY", "Bilirubin Indirect"),
    ("BIOCHEMISTRY", "Bilirubin Total"),
    ("BIOCHEMISTRY", "Body Fluid - LDH (Lactate Dehydrogenase)"),
    ("BIOCHEMISTRY", "C-Peptide"),
    ("BIOCHEMISTRY", "C-Peptide (Post Prandial)"),
    ("BIOCHEMISTRY", "C3-Complement 3"),
    ("BIOCHEMISTRY", "C4 - Complement 4"),
    ("BIOCHEMISTRY", "CK-MB"),
    ("BIOCHEMISTRY", "Calcium"),
    ("BIOCHEMISTRY", "Calcium - Total"),
    ("BIOCHEMISTRY", "Cannabinoids/Marijuana"),
    ("BIOCHEMISTRY", "Carbamazepine"),
    ("BIOCHEMISTRY", "Ceruloplasmin"),
    ("BIOCHEMISTRY", "Chloride - CSF"),
    ("BIOCHEMISTRY", "Chloride - Cl-"),
    ("BIOCHEMISTRY", "Chol/HDL Ratio"),
    ("BIOCHEMISTRY", "Cholesterol - Total"),
    ("BIOCHEMISTRY", "Cocaine(COC)"),
    ("BIOCHEMISTRY", "Copper - Serum"),
    ("BIOCHEMISTRY", "Creatinine"),
    ("BIOCHEMISTRY", "Creatinine Clearance Test"),
    ("BIOCHEMISTRY", "Creatinine Kinase(CPK)"),
    ("BIOCHEMISTRY", "DHEA-Sulphate"),
    ("BIOCHEMISTRY", "Fasting Blood Glucose"),
    ("BIOCHEMISTRY", "Ferritin"),
    ("BIOCHEMISTRY", "Ferritin SERUM"),
    ("BIOCHEMISTRY", "Folic Acid"),
    ("BIOCHEMISTRY", "Gamma GT"),
    ("BIOCHEMISTRY", "Gastrin-Serum"),
    ("BIOCHEMISTRY", "Globulin"),
    ("BIOCHEMISTRY", "Glucose Challenge Test (GCT)"),
    ("BIOCHEMISTRY", "Glucose Random Blood"),
    ("BIOCHEMISTRY", "Homocysteine Level"),
    ("BIOCHEMISTRY", "Immuno Fixation Electrophoresis - Serum"),
    ("BIOCHEMISTRY", "Immunoglobulins - IgA"),
    ("BIOCHEMISTRY", "Immunoglobulins - IgG"),
    ("BIOCHEMISTRY", "Immunoglobulins - IgM"),
    ("BIOCHEMISTRY", "Ionised Calcium"),
    ("BIOCHEMISTRY", "LDH - Lactate Dehydrogenase"),
    ("BIOCHEMISTRY", "LDL - Cholesterol"),
    ("BIOCHEMISTRY", "Lactate"),
    ("BIOCHEMISTRY", "Lipase - Serum"),
    ("BIOCHEMISTRY", "Lipid Profile"),
    ("BIOCHEMISTRY", "Lipoprotein A - LpA"),
    ("BIOCHEMISTRY", "Lithium"),
    ("BIOCHEMISTRY", "Magnesium"),
    ("BIOCHEMISTRY", "Magnesium-CSF"),
    ("BIOCHEMISTRY", "Magnesium-Urine"),
    ("BIOCHEMISTRY", "Opiates/Morphine(MOR)"),
    ("BIOCHEMISTRY", "Oral Glucose Tolerance Test (OGTT)"),
    ("BIOCHEMISTRY", "Osmolality Serum"),
    ("BIOCHEMISTRY", "Osmolality-Urine"),
    ("BIOCHEMISTRY", "Phencyclidine"),
    ("BIOCHEMISTRY", "Phenobarbitone"),
    ("BIOCHEMISTRY", "Phenytoin /Dilantin /Eptoin"),
    ("BIOCHEMISTRY", "Phosphorus Inorganic"),
    ("BIOCHEMISTRY", "Post Lunch Blood Glucose"),
    ("BIOCHEMISTRY", "Potassium - K+"),
    ("BIOCHEMISTRY", "Potassium Urine(SPOT)"),
    ("BIOCHEMISTRY", "Prostatic Acid Phosphatase"),
    ("BIOCHEMISTRY", "Protein - Total"),
    ("BIOCHEMISTRY", "Pseudocholinesterase"),
    ("BIOCHEMISTRY", "Random Blood Glucose"),
    ("BIOCHEMISTRY", "Random Urinary Micro Total Protein"),
    ("BIOCHEMISTRY", "Random Urinary Protein Creatinine Ratio"),
    ("BIOCHEMISTRY", "Random Urine Calcium"),
    ("BIOCHEMISTRY", "Random Urine Microalb Creatinine Ratio"),
    ("BIOCHEMISTRY", "Random Urine Microalbumin"),
    ("BIOCHEMISTRY", "Random Urine Uric Acid"),
    ("BIOCHEMISTRY", "SGOT/AST"),
    ("BIOCHEMISTRY", "SGPT/ALT"),
    ("BIOCHEMISTRY", "STONE ANALYSIS"),
    ("BIOCHEMISTRY", "Serum Bicarbonate"),
    ("BIOCHEMISTRY", "Serum Carbamazepine (Tegretol)"),
    ("BIOCHEMISTRY", "Serum IgE - Total"),
    ("BIOCHEMISTRY", "Sodium - Na+"),
    ("BIOCHEMISTRY", "Sodium Urine(SPOT)"),
    ("BIOCHEMISTRY", "Spot Urine Creatinine"),
    ("BIOCHEMISTRY", "Total Iron"),
    ("BIOCHEMISTRY", "Total Iron Binding Capacity(TIBC)"),
    ("BIOCHEMISTRY", "Triglycerides"),
    ("BIOCHEMISTRY", "Troponin I"),
    ("BIOCHEMISTRY", "Troponin-T"),
    ("BIOCHEMISTRY", "Urea"),
    ("BIOCHEMISTRY", "Uric Acid"),
    ("BIOCHEMISTRY", "Urine For VMA"),
    ("BIOCHEMISTRY", "Urine Lead"),
    ("BIOCHEMISTRY", "Urine Nickel"),
    ("BIOCHEMISTRY", "Urine for Nicotine"),
    ("BIOCHEMISTRY", "VLDL - Cholesterol"),
    ("BIOCHEMISTRY", "Valproic Acid / Valproate"),
    ("BIOCHEMISTRY", "Vitamin B12"),
    ("BIOCHEMISTRY", "Vitamin B12 (Cyanocobalamin)"),
    ("BIOCHEMISTRY", "Zinc - Serum"),
    ("BIOCHEMISTRY", "eGFR -Estimated Glomerular Filtration Rate"),
    ("CLINICAL PATHOLOGY", "Ascitic fluid analysis"),
    ("CLINICAL PATHOLOGY", "CSF analysis"),
    ("CLINICAL PATHOLOGY", "Pericardial fluid analysis"),
    ("CLINICAL PATHOLOGY", "Pleural fluid analysis"),
    ("CLINICAL PATHOLOGY", "Stool Complete"),
    ("CLINICAL PATHOLOGY", "Stool hanging drop"),
    ("CLINICAL PATHOLOGY", "Stool occult blood"),
    ("CLINICAL PATHOLOGY", "Stool reducing substances"),
    ("CLINICAL PATHOLOGY", "Synovial fluid analysis"),
    ("CLINICAL PATHOLOGY", "Urine Complete analysis"),
    ("CYTOLOGY", "FNAC"),
    ("CYTOLOGY", "FNAC - Breast"),
    ("CYTOLOGY", "FNAC - Lymph node"),
    ("CYTOLOGY", "FNAC - Thyroid"),
    ("HAEMATOLOGY", "Absolute Eosinophil Count (AEC)"),
    ("HAEMATOLOGY", "Antithrombin III (AT-III)"),
    ("HAEMATOLOGY", "Bleeding Time - BT"),
    ("HAEMATOLOGY", "Blood Group and Rh Factor"),
    ("HAEMATOLOGY", "Bone Marrow Aspiration Report"),
    ("HAEMATOLOGY", "CBC Complete Blood Count"),
    ("HAEMATOLOGY", "CD4 Count"),
    ("HAEMATOLOGY", "CD8 Count"),
    ("HAEMATOLOGY", "Clotting Time - CT"),
    ("HAEMATOLOGY", "Complete Blood Count (CBC)"),
    ("HAEMATOLOGY", "Complete Haemogram"),
    ("HAEMATOLOGY", "D - Dimer"),
    ("HAEMATOLOGY", "Direct Coombs Test (DCT)"),
    ("HAEMATOLOGY", "Du Factor"),
    ("HAEMATOLOGY", "FDP"),
    ("HAEMATOLOGY", "Factor IX Assay"),
    ("HAEMATOLOGY", "Factor V Leiden mutation Test"),
    ("HAEMATOLOGY", "Factor VIII Assay"),
    ("HAEMATOLOGY", "G6PDH"),
    ("HAEMATOLOGY", "Haemoglobin"),
    ("HAEMATOLOGY", "Haemoglobin Electrophoresis"),
    ("HAEMATOLOGY", "LE Cell Phenomenon"),
    ("HAEMATOLOGY", "MCH"),
    ("HAEMATOLOGY", "MCHC"),
    ("HAEMATOLOGY", "MCV"),
    ("HAEMATOLOGY", "MP - QBC"),
    ("HAEMATOLOGY", "Malarial Parasite Thick smear"),
    ("HAEMATOLOGY", "Malarial Parasite Thin smear"),
    ("HAEMATOLOGY", "Malarial Parasite-Smear"),
    ("HAEMATOLOGY", "Peripheral Smear Study (PS)"),
    ("HAEMATOLOGY", "Platelet Count"),
    ("HAEMATOLOGY", "Protein - C"),
    ("HAEMATOLOGY", "Protein - S"),
    ("HAEMATOLOGY", "Prothrombin Time"),
    ("HAEMATOLOGY", "RBC Count"),
    ("HAEMATOLOGY", "Reticulocyte Count"),
    ("HAEMATOLOGY", "Sickle Test"),
    ("HAEMATOLOGY", "Thrombin time (TT)"),
    ("HAEMATOLOGY", "aPTT"),
    ("HISTOPATHOLOGY/CYTOLOGY", "Body fluid cytology"),
    ("HISTOPATHOLOGY/CYTOLOGY", "Large Biopsy"),
    ("HISTOPATHOLOGY/CYTOLOGY", "Medium Biopsy"),
    ("HISTOPATHOLOGY/CYTOLOGY", "PAP smear cytology"),
    ("HISTOPATHOLOGY/CYTOLOGY", "Punch Biopsy"),
    ("HISTOPATHOLOGY/CYTOLOGY", "Small Biopsy"),
    ("HISTOPATHOLOGY/CYTOLOGY", "Tru cut Biopsy"),
    ("HORMONES", "TSH Thyroid Stimulating Hormone"),
    ("HORMONES & IMMUNOASSAY", "17 OH Progesterone"),
    ("HORMONES & IMMUNOASSAY", "25-OH Vitamin D3"),
    ("HORMONES & IMMUNOASSAY", "AMH"),
    ("HORMONES & IMMUNOASSAY", "Androstenedione"),
    ("HORMONES & IMMUNOASSAY", "Anti TPO"),
    ("HORMONES & IMMUNOASSAY", "Anti-TG"),
    ("HORMONES & IMMUNOASSAY", "Beta HCG"),
    ("HORMONES & IMMUNOASSAY", "CA-125"),
    ("HORMONES & IMMUNOASSAY", "CA-15.3"),
    ("HORMONES & IMMUNOASSAY", "CA-19.9"),
    ("HORMONES & IMMUNOASSAY", "CEA"),
    ("HORMONES & IMMUNOASSAY", "Cortisol Evening"),
    ("HORMONES & IMMUNOASSAY", "Cortisol Morning"),
    ("HORMONES & IMMUNOASSAY", "Cortisol Random"),
    ("HORMONES & IMMUNOASSAY", "Estradiol"),
    ("HORMONES & IMMUNOASSAY", "Estriol"),
    ("HORMONES & IMMUNOASSAY", "FSH"),
    ("HORMONES & IMMUNOASSAY", "Free Beta HCG"),
    ("HORMONES & IMMUNOASSAY", "Free PSA"),
    ("HORMONES & IMMUNOASSAY", "Free T3"),
    ("HORMONES & IMMUNOASSAY", "Free T4"),
    ("HORMONES & IMMUNOASSAY", "Free Testosterone"),
    ("HORMONES & IMMUNOASSAY", "Growth Hormone"),
    ("HORMONES & IMMUNOASSAY", "Inhibin B"),
    ("HORMONES & IMMUNOASSAY", "Insulin Fasting"),
    ("HORMONES & IMMUNOASSAY", "Insulin PP"),
    ("HORMONES & IMMUNOASSAY", "Insulin Random"),
    ("HORMONES & IMMUNOASSAY", "PSA"),
    ("HORMONES & IMMUNOASSAY", "PTH"),
    ("HORMONES & IMMUNOASSAY", "Progesterone"),
    ("HORMONES & IMMUNOASSAY", "Prolactin"),
    ("HORMONES & IMMUNOASSAY", "SHBG"),
    ("HORMONES & IMMUNOASSAY", "T3"),
    ("HORMONES & IMMUNOASSAY", "T4"),
    ("HORMONES & IMMUNOASSAY", "TSH"),
    ("HORMONES & IMMUNOASSAY", "Testosterone Total"),
    ("MICROBIOLOGY", "AFB Culture"),
    ("MICROBIOLOGY", "Culture & Sensitivity - Body Fluid"),
    ("MICROBIOLOGY", "Culture & Sensitivity - CSF"),
    ("MICROBIOLOGY", "Culture & Sensitivity - Pus"),
    ("MICROBIOLOGY", "Culture & Sensitivity - Sputum"),
    ("MICROBIOLOGY", "Culture & Sensitivity - Stool"),
    ("MICROBIOLOGY", "Culture & Sensitivity - Urine"),
    ("MICROBIOLOGY", "Fungal Culture"),
    ("MICROBIOLOGY", "India Ink Preparation - CSF"),
    ("MICROBIOLOGY", "KOH Preparation"),
    ("MICROBIOLOGY", "MRSA"),
    ("MICROBIOLOGY", "Mantoux Test"),
    ("MICROBIOLOGY", "OT Swab PACKAGE"),
    ("MICROBIOLOGY", "AAROGYAM 1.1"),
    ("MICROBIOLOGY", "PAP / CERVICAL SCREENING"),
    ("MICROBIOLOGY", "PAP Smear"),
    ("SEROLOGY", "ANA"),
    ("SEROLOGY", "ANA PROFILE"),
    ("SEROLOGY", "ANCA (c-ANCA)"),
    ("SEROLOGY", "ANCA (p-ANCA)"),
    ("SEROLOGY", "ASLO"),
    ("SEROLOGY", "Anti CCP"),
    ("SEROLOGY", "Anti Cardiolipin Antibody-IgA"),
    ("SEROLOGY", "Anti Cardiolipin Antibody-IgG"),
    ("SEROLOGY", "Anti Cardiolipin Antibody-IgM"),
    ("SEROLOGY", "Anti HCV - ELISA"),
    ("SEROLOGY", "Anti Leptospira Antibody-IgG"),
    ("SEROLOGY", "Anti Leptospira Antibody-IgM"),
    ("SEROLOGY", "Anti Mitochondrial Ab"),
    ("SEROLOGY", "Anti Phospholipid Antibody - IgG"),
    ("SEROLOGY", "Anti Phospholipid Antibody - IgM"),
    ("SEROLOGY", "Anti Smooth Muscle Antibody"),
    ("SEROLOGY", "Anti sperm Antibody"),
    ("SEROLOGY", "Anti Typhoid Antibodies"),
    ("SEROLOGY", "B2 Glycoprotein- IgG"),
    ("SEROLOGY", "B2 Glycoprotein- IgM"),
    ("SEROLOGY", "Brucella - IgM"),
    ("SEROLOGY", "Brucella - IgG"),
    ("SEROLOGY", "CHLAMYDIA - IgG"),
    ("SEROLOGY", "CMV IgG"),
    ("SEROLOGY", "CMV IgM"),
    ("SEROLOGY", "CRP"),
    ("SEROLOGY", "Chikungunya - IgG"),
    ("SEROLOGY", "Chikungunya - IgM"),
    ("SEROLOGY", "Dengue - IgM"),
    ("SEROLOGY", "Dengue - NS1"),
    ("SEROLOGY", "Ds-DNA"),
    ("SEROLOGY", "EBV-IgG"),
    ("SEROLOGY", "H Pylori - IgG"),
    ("SEROLOGY", "HAV IgG"),
    ("SEROLOGY", "HAV IgM"),
    ("SEROLOGY", "HBcAb IgM"),
    ("SEROLOGY", "HBcAb Total"),
    ("SEROLOGY", "HBcAg IgM"),
    ("SEROLOGY", "HBeAb"),
    ("SEROLOGY", "HBeAg"),
    ("SEROLOGY", "HBsAb Total"),
    ("SEROLOGY", "HBsAg"),
    ("SEROLOGY", "HBsAg Elisa"),
    ("SEROLOGY", "HCV Ab Total"),
    ("SEROLOGY", "HCV Screening"),
    ("SEROLOGY", "HCVAb IgG"),
    ("SEROLOGY", "HEV IgM"),
    ("SEROLOGY", "HIV ELISA"),
    ("SEROLOGY", "HIV Screening"),
    ("SEROLOGY", "HLA B-27"),
    ("SEROLOGY", "HSV1 IgG"),
    ("SEROLOGY", "HSV1 IgM"),
    ("SEROLOGY", "HSV2 IgG"),
    ("SEROLOGY", "HSV2 IgM"),
    ("SEROLOGY", "High Sensitivity CRP"),
    ("SEROLOGY", "Infectious Mononucleosis"),
    ("SEROLOGY", "Leptospira IgG"),
    ("SEROLOGY", "Leptospira IgM"),
    ("SEROLOGY", "Measles IgG"),
    ("SEROLOGY", "Measles IgM"),
    ("SEROLOGY", "Mumps IgG"),
    ("SEROLOGY", "Mumps IgM"),
    ("SEROLOGY", "Mycobacterium TB IgA"),
    ("SEROLOGY", "Mycobacterium TB IgG"),
    ("SEROLOGY", "Mycobacterium TB IgM"),
    ("SEROLOGY", "RA Factor"),
    ("SEROLOGY", "TPHA"),
    ("SEROLOGY", "Toxoplasma IgG"),
    ("SEROLOGY", "Toxoplasma IgM"),
    ("SEROLOGY", "VDRL"),
    ("SEROLOGY", "Western Blot HIV"),
]

# Normalize name for duplicate detection
def normalize(name):
    """Normalize a test name for fuzzy matching."""
    n = name.lower().strip()
    # Remove common parenthetical duplicates
    for r in [" - serum", " serum", "(serum)", "- total"]:
        n = n.replace(r, "")
    # Common abbreviation mappings
    n = n.replace("sgot/ast", "sgot").replace("sgpt/alt", "sgpt")
    n = n.replace("(cbc)", "").replace("cbc ", "").replace(" cbc", "")
    n = n.replace("complete blood count", "cbc")
    n = n.replace("complete haemogram", "cbc")
    n = n.replace("(cyanocobalamin)", "")
    n = n.replace("thyroid stimulating hormone", "tsh")
    # Strip extra whitespace
    import re
    n = re.sub(r'\s+', ' ', n).strip()
    return n


# Known mappings: spreadsheet test -> existing DB test (exact or near match)
KNOWN_DUPLICATES_MAP = {
    # Spreadsheet name -> existing DB name (when they are the same test)
    "Ferritin SERUM": "Ferritin",
    "CBC Complete Blood Count": "Complete Blood Count (CBC)",
    "Complete Blood Count (CBC)": "CBC Complete Blood Count",  # within-list dup
    "Vitamin B12 (Cyanocobalamin)": "Vitamin B12",
    "Calcium - Total": "Calcium",
    "TSH Thyroid Stimulating Hormone": "TSH",  # dup of TSH in HORMONES & IMMUNOASSAY
    "Complete Haemogram": "CBC Complete Blood Count",  # same as CBC
    "Carbamazepine": "Serum Carbamazepine (Tegretol)",  # within-list dup
    "Serum Carbamazepine (Tegretol)": "Carbamazepine",
    "Glucose Random Blood": "Random Blood Glucose",  # within-list dup
    "Random Blood Glucose": "Glucose Random Blood",
    "Anti Leptospira Antibody-IgG": "Leptospira IgG",  # within-list dup
    "Leptospira IgG": "Anti Leptospira Antibody-IgG",
    "Anti Leptospira Antibody-IgM": "Leptospira IgM",
    "Leptospira IgM": "Anti Leptospira Antibody-IgM",
    "HBsAg Elisa": "HBsAg",  # within-list dup
    "HIV Screening": "HIV ELISA",  # within-list dup
    "HCV Screening": "Anti HCV - ELISA",  # within-list dup
    "PAP / CERVICAL SCREENING": "PAP Smear",  # within-list dup
    "PAP smear cytology": "PAP Smear",
}


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # 1. Get existing tests
    existing = await db.lab_tests.find({}, {"_id": 0, "id": 1, "name": 1, "category": 1}).to_list(500)
    existing_names = {t["name"] for t in existing}
    existing_normalized = {normalize(t["name"]): t["name"] for t in existing}

    print(f"Existing tests in DB: {len(existing_names)}")

    # 2. Deduplicate within the spreadsheet list
    seen_normalized = {}
    within_list_dupes = []
    unique_tests = []

    for dept, name in RAW_TESTS:
        n = normalize(name)
        if n in seen_normalized:
            within_list_dupes.append((name, seen_normalized[n], "within-spreadsheet duplicate"))
        else:
            seen_normalized[n] = name
            unique_tests.append((dept, name))

    # Also check KNOWN_DUPLICATES_MAP for named duplicates
    final_tests = []
    named_dupes = []
    seen_final = set()
    for dept, name in unique_tests:
        # Check if this is a known dup of another test in the list
        if name in KNOWN_DUPLICATES_MAP:
            target = KNOWN_DUPLICATES_MAP[name]
            n_target = normalize(target)
            if n_target in seen_final:
                named_dupes.append((name, target, "known duplicate pair"))
                continue
        n = normalize(name)
        if n not in seen_final:
            seen_final.add(n)
            final_tests.append((dept, name))
        else:
            named_dupes.append((name, "already seen normalized", "normalized duplicate"))

    # 3. Check against existing DB tests
    db_dupes = []
    to_insert = []
    for dept, name in final_tests:
        n = normalize(name)
        if n in existing_normalized:
            db_dupes.append((name, existing_normalized[n], "already exists in DB"))
        elif name in existing_names:
            db_dupes.append((name, name, "exact match in DB"))
        else:
            to_insert.append((dept, name))

    # 4. Generate test code starting from current max
    count = await db.lab_tests.count_documents({})
    code_counter = count + 1

    # 5. Insert new tests
    inserted = 0
    for dept, name in to_insert:
        test = {
            "id": str(uuid.uuid4()),
            "code": f"MHL{code_counter:04d}",
            "name": name,
            "category": dept.title(),
            "department": dept.title(),
            "description": "",
            "price": 0,
            "home_collection_price": 0,
            "sample_type": "blood",
            "turnaround_time": "24-48 hours",
            "fasting_required": False,
            "preparation_instructions": "",
            "is_active": True,
            "created_by": "Spreadsheet Import",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.lab_tests.insert_one(test)
        test.pop("_id", None)
        inserted += 1
        code_counter += 1

    # 6. Also update existing tests with department field if they match
    for dept, name in final_tests:
        if name in existing_names:
            await db.lab_tests.update_one({"name": name}, {"$set": {"department": dept.title()}})

    # Print results
    all_dupes = within_list_dupes + named_dupes + db_dupes

    print(f"\n=== IMPORT RESULTS ===")
    print(f"Spreadsheet total: {len(RAW_TESTS)}")
    print(f"Within-spreadsheet duplicates removed: {len(within_list_dupes)}")
    print(f"Known duplicate pairs removed: {len(named_dupes)}")
    print(f"Already in DB (skipped): {len(db_dupes)}")
    print(f"New tests inserted: {inserted}")

    final_count = await db.lab_tests.count_documents({})
    print(f"Total lab_tests in DB now: {final_count}")

    print(f"\n=== ALL DUPLICATES FOUND ({len(all_dupes)}) ===")
    for test_name, dup_of, reason in sorted(all_dupes):
        print(f"  {test_name:50s} -> dup of '{dup_of}' ({reason})")

    client.close()
    return all_dupes


if __name__ == "__main__":
    asyncio.run(main())
