"""
Data Migration Script
Migrates hardcoded data (medicines, tests, food database) to MongoDB
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

# Medicine Inventory Data
MEDICINE_INVENTORY = [
    {"name": "PARACETAMOL 500MG", "form": "Tablet", "category": "Pain Relief", "price": 15, "stock": 500},
    {"name": "METFORMIN 500MG", "form": "Tablet", "category": "Diabetes", "price": 25, "stock": 300},
    {"name": "METFORMIN 850MG", "form": "Tablet", "category": "Diabetes", "price": 35, "stock": 200},
    {"name": "GLIMEPIRIDE 1MG", "form": "Tablet", "category": "Diabetes", "price": 45, "stock": 150},
    {"name": "GLIMEPIRIDE 2MG", "form": "Tablet", "category": "Diabetes", "price": 55, "stock": 150},
    {"name": "INSULIN GLARGINE", "form": "Injection", "category": "Diabetes", "price": 850, "stock": 50},
    {"name": "SITAGLIPTIN 100MG", "form": "Tablet", "category": "Diabetes", "price": 120, "stock": 100},
    {"name": "EMPAGLIFLOZIN 10MG", "form": "Tablet", "category": "Diabetes", "price": 180, "stock": 80},
    {"name": "AMLODIPINE 5MG", "form": "Tablet", "category": "Blood Pressure", "price": 20, "stock": 400},
    {"name": "LOSARTAN 50MG", "form": "Tablet", "category": "Blood Pressure", "price": 35, "stock": 300},
    {"name": "ATORVASTATIN 10MG", "form": "Tablet", "category": "Cholesterol", "price": 40, "stock": 250},
    {"name": "OMEPRAZOLE 20MG", "form": "Capsule", "category": "Gastric", "price": 30, "stock": 400},
    {"name": "PANTOPRAZOLE 40MG", "form": "Tablet", "category": "Gastric", "price": 45, "stock": 300},
    {"name": "CETIRIZINE 10MG", "form": "Tablet", "category": "Allergy", "price": 15, "stock": 500},
    {"name": "MONTELUKAST 10MG", "form": "Tablet", "category": "Respiratory", "price": 60, "stock": 200},
    {"name": "AZITHROMYCIN 500MG", "form": "Tablet", "category": "Antibiotic", "price": 80, "stock": 150},
    {"name": "AMOXICILLIN 500MG", "form": "Capsule", "category": "Antibiotic", "price": 45, "stock": 200},
    {"name": "VITAMIN D3 60000IU", "form": "Capsule", "category": "Supplements", "price": 35, "stock": 300},
    {"name": "CALCIUM + D3", "form": "Tablet", "category": "Supplements", "price": 120, "stock": 200},
    {"name": "IRON + FOLIC ACID", "form": "Tablet", "category": "Supplements", "price": 80, "stock": 250},
    {"name": "B-COMPLEX", "form": "Tablet", "category": "Supplements", "price": 60, "stock": 300},
    {"name": "FOLIC ACID 5MG", "form": "Tablet", "category": "Prenatal", "price": 25, "stock": 400},
    {"name": "PROGESTERONE 200MG", "form": "Capsule", "category": "Gynecology", "price": 150, "stock": 100},
    {"name": "CLOMIPHENE 50MG", "form": "Tablet", "category": "Gynecology", "price": 120, "stock": 80},
]

# Diagnostic Tests Data
DIAGNOSTIC_TESTS = [
    {"name": "Complete Blood Count (CBC)", "category": "Hematology", "price": 350, "description": "Measures red blood cells, white blood cells, and platelets"},
    {"name": "Fasting Blood Sugar (FBS)", "category": "Diabetes", "price": 100, "description": "Measures blood glucose after 8-12 hours fasting"},
    {"name": "Post Prandial Blood Sugar (PPBS)", "category": "Diabetes", "price": 100, "description": "Measures blood glucose 2 hours after eating"},
    {"name": "HbA1c", "category": "Diabetes", "price": 450, "description": "Average blood sugar over past 2-3 months"},
    {"name": "Lipid Profile", "category": "Cardiac", "price": 550, "description": "Cholesterol, triglycerides, HDL, LDL"},
    {"name": "Thyroid Profile (T3, T4, TSH)", "category": "Thyroid", "price": 650, "description": "Complete thyroid function test"},
    {"name": "TSH", "category": "Thyroid", "price": 280, "description": "Thyroid stimulating hormone test"},
    {"name": "Liver Function Test (LFT)", "category": "Liver", "price": 600, "description": "SGOT, SGPT, Bilirubin, Alkaline Phosphatase"},
    {"name": "Kidney Function Test (KFT)", "category": "Kidney", "price": 550, "description": "Urea, Creatinine, Uric Acid"},
    {"name": "Urine Routine", "category": "Urology", "price": 150, "description": "Physical, chemical, and microscopic examination"},
    {"name": "Vitamin D", "category": "Vitamins", "price": 850, "description": "25-hydroxy vitamin D level"},
    {"name": "Vitamin B12", "category": "Vitamins", "price": 650, "description": "Cobalamin level in blood"},
    {"name": "Iron Studies", "category": "Hematology", "price": 750, "description": "Serum iron, TIBC, Ferritin"},
    {"name": "Pregnancy Test (Beta HCG)", "category": "Gynecology", "price": 450, "description": "Confirms pregnancy"},
    {"name": "PCOD Profile", "category": "Gynecology", "price": 2500, "description": "LH, FSH, Prolactin, Testosterone, DHEAS"},
    {"name": "AMH (Anti-Mullerian Hormone)", "category": "Gynecology", "price": 1800, "description": "Ovarian reserve test"},
    {"name": "Glucose Tolerance Test (GTT)", "category": "Diabetes", "price": 350, "description": "Gestational diabetes screening"},
    {"name": "ECG", "category": "Cardiac", "price": 200, "description": "Electrocardiogram"},
    {"name": "X-Ray Chest", "category": "Radiology", "price": 350, "description": "Chest X-ray PA view"},
    {"name": "Ultrasound Abdomen", "category": "Radiology", "price": 800, "description": "Abdominal ultrasound scan"},
    {"name": "Ultrasound Pelvis", "category": "Radiology", "price": 800, "description": "Pelvic ultrasound scan"},
    {"name": "Mammography", "category": "Radiology", "price": 1500, "description": "Breast screening"},
    {"name": "Pap Smear", "category": "Gynecology", "price": 600, "description": "Cervical cancer screening"},
]

# Food Database (Indian Foods)
INDIAN_FOOD_DATABASE = {
    "breakfast": [
        {"name": "Idli (2 pcs)", "calories": 156, "protein": 4, "carbs": 32, "fat": 0.5, "fiber": 2, "category": "South Indian"},
        {"name": "Dosa (Plain)", "calories": 168, "protein": 4, "carbs": 28, "fat": 5, "fiber": 1, "category": "South Indian"},
        {"name": "Masala Dosa", "calories": 250, "protein": 5, "carbs": 35, "fat": 10, "fiber": 2, "category": "South Indian"},
        {"name": "Upma (1 cup)", "calories": 200, "protein": 5, "carbs": 30, "fat": 7, "fiber": 2, "category": "South Indian"},
        {"name": "Poha (1 cup)", "calories": 180, "protein": 3, "carbs": 35, "fat": 4, "fiber": 1, "category": "Maharashtrian"},
        {"name": "Paratha (Plain)", "calories": 260, "protein": 5, "carbs": 30, "fat": 13, "fiber": 2, "category": "North Indian"},
        {"name": "Aloo Paratha", "calories": 300, "protein": 6, "carbs": 40, "fat": 12, "fiber": 3, "category": "North Indian"},
        {"name": "Poori (2 pcs)", "calories": 200, "protein": 4, "carbs": 25, "fat": 10, "fiber": 1, "category": "North Indian"},
        {"name": "Chole Bhature (1 plate)", "calories": 450, "protein": 12, "carbs": 55, "fat": 20, "fiber": 5, "category": "Punjabi"},
        {"name": "Oats Upma (1 bowl)", "calories": 180, "protein": 6, "carbs": 30, "fat": 5, "fiber": 4, "category": "Healthy"},
    ],
    "lunch_dinner": [
        {"name": "Rice (1 cup cooked)", "calories": 200, "protein": 4, "carbs": 45, "fat": 0.4, "fiber": 0.6, "category": "Staple"},
        {"name": "Roti/Chapati (1 pc)", "calories": 104, "protein": 3, "carbs": 20, "fat": 1.5, "fiber": 2, "category": "Staple"},
        {"name": "Dal Tadka (1 cup)", "calories": 180, "protein": 10, "carbs": 25, "fat": 5, "fiber": 6, "category": "Lentils"},
        {"name": "Rajma (1 cup)", "calories": 220, "protein": 12, "carbs": 35, "fat": 4, "fiber": 8, "category": "Punjabi"},
        {"name": "Chole/Chana (1 cup)", "calories": 240, "protein": 11, "carbs": 38, "fat": 5, "fiber": 7, "category": "Punjabi"},
        {"name": "Paneer Butter Masala (1 cup)", "calories": 350, "protein": 15, "carbs": 12, "fat": 28, "fiber": 2, "category": "North Indian"},
        {"name": "Chicken Curry (1 cup)", "calories": 280, "protein": 25, "carbs": 10, "fat": 16, "fiber": 2, "category": "Non-Veg"},
        {"name": "Fish Curry (1 cup)", "calories": 220, "protein": 22, "carbs": 8, "fat": 12, "fiber": 1, "category": "Non-Veg"},
        {"name": "Biryani (1 plate)", "calories": 400, "protein": 15, "carbs": 50, "fat": 15, "fiber": 2, "category": "Mughlai"},
        {"name": "Palak Paneer (1 cup)", "calories": 280, "protein": 14, "carbs": 10, "fat": 22, "fiber": 3, "category": "North Indian"},
        {"name": "Mixed Vegetable Curry (1 cup)", "calories": 150, "protein": 4, "carbs": 18, "fat": 7, "fiber": 4, "category": "Vegetarian"},
        {"name": "Sambar (1 cup)", "calories": 140, "protein": 6, "carbs": 22, "fat": 3, "fiber": 5, "category": "South Indian"},
        {"name": "Rasam (1 cup)", "calories": 60, "protein": 2, "carbs": 10, "fat": 1.5, "fiber": 1, "category": "South Indian"},
    ],
    "snacks": [
        {"name": "Samosa (1 pc)", "calories": 250, "protein": 4, "carbs": 30, "fat": 13, "fiber": 2, "category": "Street Food"},
        {"name": "Pakora (5 pcs)", "calories": 200, "protein": 4, "carbs": 20, "fat": 12, "fiber": 2, "category": "Street Food"},
        {"name": "Vada Pav (1 pc)", "calories": 290, "protein": 6, "carbs": 40, "fat": 12, "fiber": 3, "category": "Mumbai Street"},
        {"name": "Pav Bhaji (1 plate)", "calories": 400, "protein": 10, "carbs": 55, "fat": 16, "fiber": 5, "category": "Mumbai Street"},
        {"name": "Bhel Puri (1 cup)", "calories": 180, "protein": 4, "carbs": 30, "fat": 6, "fiber": 3, "category": "Chaat"},
        {"name": "Dhokla (4 pcs)", "calories": 160, "protein": 6, "carbs": 25, "fat": 4, "fiber": 2, "category": "Gujarati"},
        {"name": "Kachori (1 pc)", "calories": 200, "protein": 4, "carbs": 22, "fat": 11, "fiber": 2, "category": "Rajasthani"},
        {"name": "Roasted Chana (1 cup)", "calories": 150, "protein": 8, "carbs": 22, "fat": 3, "fiber": 6, "category": "Healthy"},
        {"name": "Makhana (1 cup)", "calories": 100, "protein": 4, "carbs": 18, "fat": 1, "fiber": 2, "category": "Healthy"},
    ],
    "beverages": [
        {"name": "Chai (1 cup)", "calories": 80, "protein": 2, "carbs": 12, "fat": 3, "fiber": 0, "category": "Hot"},
        {"name": "Black Coffee", "calories": 5, "protein": 0.3, "carbs": 0, "fat": 0, "fiber": 0, "category": "Hot"},
        {"name": "Filter Coffee", "calories": 94, "protein": 2, "carbs": 10, "fat": 5, "fiber": 0, "category": "South Indian"},
        {"name": "Lassi (Sweet)", "calories": 180, "protein": 5, "carbs": 28, "fat": 5, "fiber": 0, "category": "Cold"},
        {"name": "Buttermilk (Chaas)", "calories": 40, "protein": 2, "carbs": 5, "fat": 1, "fiber": 0, "category": "Cold"},
        {"name": "Coconut Water", "calories": 46, "protein": 1.7, "carbs": 9, "fat": 0.5, "fiber": 2.6, "category": "Natural"},
        {"name": "Nimbu Pani", "calories": 50, "protein": 0, "carbs": 12, "fat": 0, "fiber": 0, "category": "Cold"},
    ],
    "sweets_desserts": [
        {"name": "Gulab Jamun (2 pcs)", "calories": 300, "protein": 4, "carbs": 40, "fat": 14, "fiber": 0.5, "category": "Mithai"},
        {"name": "Rasgulla (2 pcs)", "calories": 180, "protein": 4, "carbs": 32, "fat": 4, "fiber": 0, "category": "Bengali"},
        {"name": "Jalebi (2 pcs)", "calories": 250, "protein": 2, "carbs": 38, "fat": 10, "fiber": 0, "category": "Mithai"},
        {"name": "Kheer (1 cup)", "calories": 200, "protein": 6, "carbs": 30, "fat": 7, "fiber": 0.5, "category": "Dessert"},
        {"name": "Gajar Halwa (1 cup)", "calories": 280, "protein": 5, "carbs": 35, "fat": 14, "fiber": 3, "category": "North Indian"},
        {"name": "Kulfi (1 stick)", "calories": 150, "protein": 3, "carbs": 18, "fat": 7, "fiber": 0, "category": "Frozen"},
    ],
    "diabetic_friendly": [
        {"name": "Multigrain Roti", "calories": 85, "protein": 3.5, "carbs": 16, "fat": 1.5, "fiber": 3, "category": "Low GI"},
        {"name": "Jowar Roti", "calories": 80, "protein": 3, "carbs": 17, "fat": 0.5, "fiber": 2.5, "category": "Low GI"},
        {"name": "Ragi Dosa", "calories": 120, "protein": 4, "carbs": 20, "fat": 3, "fiber": 4, "category": "Low GI"},
        {"name": "Sprouts Salad", "calories": 100, "protein": 8, "carbs": 14, "fat": 1, "fiber": 5, "category": "High Protein"},
        {"name": "Grilled Chicken (100g)", "calories": 165, "protein": 31, "carbs": 0, "fat": 3.6, "fiber": 0, "category": "High Protein"},
        {"name": "Greek Yogurt (1 cup)", "calories": 100, "protein": 17, "carbs": 6, "fat": 0.7, "fiber": 0, "category": "High Protein"},
    ]
}

async def migrate_data():
    """Migrate all hardcoded data to MongoDB"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("Starting data migration...")
    
    # 1. Migrate Medicines
    print("\n1. Migrating medicines...")
    existing_medicines = await db.medicines_catalog.count_documents({})
    if existing_medicines == 0:
        for med in MEDICINE_INVENTORY:
            med["id"] = str(__import__("uuid").uuid4())
            med["created_at"] = datetime.now(timezone.utc).isoformat()
            med["updated_at"] = datetime.now(timezone.utc).isoformat()
            med["active"] = True
        await db.medicines_catalog.insert_many(MEDICINE_INVENTORY)
        print(f"   ✓ Migrated {len(MEDICINE_INVENTORY)} medicines")
    else:
        print(f"   ⚠ Skipped - {existing_medicines} medicines already exist")
    
    # 2. Migrate Diagnostic Tests
    print("\n2. Migrating diagnostic tests...")
    existing_tests = await db.diagnostic_tests_catalog.count_documents({})
    if existing_tests == 0:
        for test in DIAGNOSTIC_TESTS:
            test["id"] = str(__import__("uuid").uuid4())
            test["created_at"] = datetime.now(timezone.utc).isoformat()
            test["active"] = True
        await db.diagnostic_tests_catalog.insert_many(DIAGNOSTIC_TESTS)
        print(f"   ✓ Migrated {len(DIAGNOSTIC_TESTS)} diagnostic tests")
    else:
        print(f"   ⚠ Skipped - {existing_tests} tests already exist")
    
    # 3. Migrate Food Database
    print("\n3. Migrating food database...")
    existing_foods = await db.food_catalog.count_documents({})
    if existing_foods == 0:
        food_docs = []
        for category, foods in INDIAN_FOOD_DATABASE.items():
            for food in foods:
                food_doc = {
                    "id": str(__import__("uuid").uuid4()),
                    "meal_category": category,
                    **food,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                food_docs.append(food_doc)
        await db.food_catalog.insert_many(food_docs)
        print(f"   ✓ Migrated {len(food_docs)} food items")
    else:
        print(f"   ⚠ Skipped - {existing_foods} food items already exist")
    
    # 4. Create indexes
    print("\n4. Creating indexes...")
    await db.medicines_catalog.create_index("name")
    await db.medicines_catalog.create_index("category")
    await db.diagnostic_tests_catalog.create_index("name")
    await db.diagnostic_tests_catalog.create_index("category")
    await db.food_catalog.create_index("name")
    await db.food_catalog.create_index("meal_category")
    await db.food_catalog.create_index("category")
    print("   ✓ Indexes created")
    
    print("\n✅ Migration complete!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_data())
