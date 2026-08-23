"""
Seed script to insert branded products (Minimalist, The Derma Co, Aqualogica, Cetaphil, Biluma)
into the medicines collection for Orange Healthplus inventory.
"""
import asyncio
import os
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "nevika_cura")

# ==================== MINIMALIST PRODUCTS ====================
MINIMALIST_PRODUCTS = [
    {
        "name": "Minimalist 10% Vitamin B5 Lightweight & Oil Free Moisturizer - 50g",
        "mrp": 349, "sale_price": 262, "category": "Skincare", "form": "Cream",
        "description": "Lightweight & Oil Free Moisturizer with 10% Vitamin B5 for deep hydration without greasiness",
        "image_url": "https://i.imgur.com/n3s4UeJ.png", "manufacturer": "Minimalist"
    },
    {
        "name": "Minimalist 2% Salicylic Acid Face Serum - 10ml",
        "mrp": 249, "sale_price": 187, "category": "Skincare", "form": "Serum",
        "description": "Anti-Acne serum for all skin types. Reduces blackheads, oiliness & bumpy texture. BHA based exfoliant.",
        "image_url": "https://i.imgur.com/9jS7k1X.png", "manufacturer": "Minimalist"
    },
    {
        "name": "Minimalist 2% Salicylic Acid Face Serum - 30ml",
        "mrp": 549, "sale_price": 412, "category": "Skincare", "form": "Serum",
        "description": "Anti-Acne serum for all skin types. Reduces blackheads, oiliness & bumpy texture. BHA based exfoliant.",
        "image_url": "https://i.imgur.com/33z6I1L.png", "manufacturer": "Minimalist"
    },
    {
        "name": "Minimalist Anti Dandruff Shampoo 3.5%",
        "mrp": 499, "sale_price": 374, "category": "Hair Care", "form": "Shampoo",
        "description": "Anti Dandruff Shampoo with 3.5% active ingredients for flake-free scalp",
        "image_url": "https://i.imgur.com/T2v316A.png", "manufacturer": "Minimalist"
    },
    {
        "name": "Minimalist 7% ALA & AHA Brightening Face Wash - 100ml",
        "mrp": 399, "sale_price": 299, "category": "Skincare", "form": "Face Wash",
        "description": "Brightening Face Wash with Vitamin B5 & Glycolic acid for glowing skin",
        "image_url": "https://i.imgur.com/Qx0q3yT.png", "manufacturer": "Minimalist"
    },
    {
        "name": "Minimalist 10% Niacinamide Face Serum - 30ml",
        "mrp": 599, "sale_price": 449, "category": "Skincare", "form": "Serum",
        "description": "Face Serum with Matmarine + Zinc for reducing oil & blemishes",
        "image_url": "https://i.imgur.com/qV3e4Jb.png", "manufacturer": "Minimalist"
    },
    {
        "name": "Minimalist Salicylic Acid & LHA 2% Body Wash - 200ml",
        "mrp": 349, "sale_price": 262, "category": "Body Care", "form": "Body Wash",
        "description": "Body wash with Salicylic Acid & LHA 2% for clean, smooth skin",
        "image_url": "https://i.imgur.com/k01b6M1.png", "manufacturer": "Minimalist"
    },
    {
        "name": "Minimalist Light Fluid Sunscreen SPF 50 - 30ml",
        "mrp": 349, "sale_price": 262, "category": "Sun Care", "form": "Sunscreen",
        "description": "Light fluid sunscreen SPF 50 for oily skin, non-greasy formula",
        "image_url": "https://i.imgur.com/r61E3nO.png", "manufacturer": "Minimalist"
    },
    {
        "name": "Minimalist 7% ALA + Glycolic Brightening Face Wash",
        "mrp": 399, "sale_price": 299, "category": "Skincare", "form": "Face Wash",
        "description": "Brightening Face Wash with ALA + Glycolic acid for radiant skin",
        "image_url": "https://i.imgur.com/RzM61wN.png", "manufacturer": "Minimalist"
    },
    {
        "name": "Minimalist 5% Aquaporin Booster Face Wash with Hyaluronic Acid",
        "mrp": 299, "sale_price": 224, "category": "Skincare", "form": "Face Wash",
        "description": "Face Wash for dry skin with 5% Aquaporin Booster & Hyaluronic Acid",
        "image_url": "https://i.imgur.com/H1s3T2c.png", "manufacturer": "Minimalist"
    },
    {
        "name": "Minimalist 0.3% Retinol Anti-Aging Night Serum with Q10",
        "mrp": 249, "sale_price": 187, "category": "Skincare", "form": "Serum",
        "description": "Anti-Aging Night Serum with 0.3% Retinol & Q10 for all skin types",
        "image_url": "https://i.imgur.com/Xl26IYS.png", "manufacturer": "Minimalist"
    },
]

# ==================== THE DERMA CO PRODUCTS ====================
DERMA_CO_PRODUCTS = [
    {
        "name": "The Derma Co 0.3% Retinol Serum - 30ml",
        "mrp": 799, "sale_price": 519, "category": "Skincare", "form": "Serum",
        "description": "Anti-Aging serum with Vitamin C & Glycerin. Reduces fine lines, wrinkles & pigmentation.",
        "image_url": "https://storage.googleapis.com/image-analysis-52582.appspot.com/images/2307725900475864913.png", "manufacturer": "The Derma Co"
    },
    {
        "name": "The Derma Co 4% Urea Deep Moisturizing Cream - 100g",
        "mrp": 329, "sale_price": 214, "category": "Skincare", "form": "Cream",
        "description": "Deep moisturizer with Lactic Acid & Ceramide Complex for very dry skin",
        "image_url": "https://storage.googleapis.com/image-analysis-52582.appspot.com/images/2307725899754663333.png", "manufacturer": "The Derma Co"
    },
    {
        "name": "The Derma Co Ceramide + HA Intense Moisturizer - 50g",
        "mrp": 349, "sale_price": 227, "category": "Skincare", "form": "Cream",
        "description": "With Hyaluronic Acid for dry skin. Repairs dry & dull skin, locks in moisture.",
        "image_url": "https://storage.googleapis.com/image-analysis-52582.appspot.com/images/2307725899983246300.png", "manufacturer": "The Derma Co"
    },
    {
        "name": "The Derma Co 5% Propylene Oil Free Moisturizer",
        "mrp": 329, "sale_price": 214, "category": "Skincare", "form": "Cream",
        "description": "Oil free moisturizer with 5% Propylene for lightweight hydration",
        "image_url": "https://storage.googleapis.com/image-analysis-52582.appspot.com/images/2307725899996818097.png", "manufacturer": "The Derma Co"
    },
    {
        "name": "The Derma Co 7% Glycolic Acid Hydrating Toner",
        "mrp": 499, "sale_price": 324, "category": "Skincare", "form": "Toner",
        "description": "Hydrating Toner with 7% Glycolic Acid for smooth, glowing skin",
        "image_url": "https://storage.googleapis.com/image-analysis-52582.appspot.com/images/2307725900317678068.png", "manufacturer": "The Derma Co"
    },
    {
        "name": "The Derma Co Kojic Acid + Glutathione Daily Syndet Soap",
        "mrp": 299, "sale_price": 194, "category": "Skincare", "form": "Soap",
        "description": "Daily Syndet Soap with Kojic Acid + Glutathione for skin brightening",
        "image_url": "https://storage.googleapis.com/image-analysis-52582.appspot.com/images/2307725900362218467.png", "manufacturer": "The Derma Co"
    },
    {
        "name": "The Derma Co 10% Niacinamide Face Serum - 10ml",
        "mrp": 249, "sale_price": 162, "category": "Skincare", "form": "Serum",
        "description": "Face serum for acne marks & acne prone skin",
        "image_url": "https://storage.googleapis.com/image-analysis-52582.appspot.com/images/2307725900374825235.png", "manufacturer": "The Derma Co"
    },
    {
        "name": "The Derma Co 10% Cica Glow Face Serum - 30ml",
        "mrp": 599, "sale_price": 389, "category": "Skincare", "form": "Serum",
        "description": "Face serum with 10% Cica extract for glowing, healthy skin",
        "image_url": "https://storage.googleapis.com/image-analysis-52582.appspot.com/images/2307725900386002868.png", "manufacturer": "The Derma Co"
    },
    {
        "name": "The Derma Co 2% Glutathione Face Serum - 30ml",
        "mrp": 699, "sale_price": 454, "category": "Skincare", "form": "Serum",
        "description": "Face serum with 2% Glutathione for skin brightening",
        "image_url": "https://storage.googleapis.com/image-analysis-52582.appspot.com/images/2307725900429810738.png", "manufacturer": "The Derma Co"
    },
    {
        "name": "The Derma Co 2% Kojic Acid Face Serum - 30ml",
        "mrp": 499, "sale_price": 324, "category": "Skincare", "form": "Serum",
        "description": "Face serum with 2% Kojic Acid for pigmentation & dark spots",
        "image_url": "https://storage.googleapis.com/image-analysis-52582.appspot.com/images/2307725900457402216.png", "manufacturer": "The Derma Co"
    },
    {
        "name": "The Derma Co 2% Salicylic Acid Face Serum - 30ml",
        "mrp": 499, "sale_price": 324, "category": "Skincare", "form": "Serum",
        "description": "Face serum with 2% Salicylic Acid for active acne treatment",
        "image_url": "https://storage.googleapis.com/image-analysis-52582.appspot.com/images/2307725900457516696.png", "manufacturer": "The Derma Co"
    },
    {
        "name": "The Derma Co 2% Vitamin C Gel Daily Face Wash - 80ml",
        "mrp": 249, "sale_price": 162, "category": "Skincare", "form": "Face Wash",
        "description": "With Vitamin C, Rosehip & Orange Peel Extract for glowing skin",
        "image_url": "https://storage.googleapis.com/image-analysis-52582.appspot.com/images/2307725900474740766.png", "manufacturer": "The Derma Co"
    },
    {
        "name": "The Derma Co Tran-Zelaic Pigmentation Corrector Face Wash - 80ml",
        "mrp": 249, "sale_price": 162, "category": "Skincare", "form": "Face Wash",
        "description": "With Tranexamic Acid & Azelaic Acid for pigmentation correction",
        "image_url": "https://storage.googleapis.com/image-analysis-52582.appspot.com/images/2307725900496056881.png", "manufacturer": "The Derma Co"
    },
    {
        "name": "The Derma Co Oil-Free Daily Face Wash - 100ml",
        "mrp": 275, "sale_price": 179, "category": "Skincare", "form": "Face Wash",
        "description": "Oil-Free with Hyaluronic Acid, Glycolic Acid & Multivitamins for clear & hydrated skin",
        "image_url": "https://storage.googleapis.com/image-analysis-52582.appspot.com/images/2307725900521784999.png", "manufacturer": "The Derma Co"
    },
    {
        "name": "The Derma Co 2% Salicylic Acid Gel Face Wash - 100ml",
        "mrp": 299, "sale_price": 194, "category": "Skincare", "form": "Face Wash",
        "description": "With Salicylic Acid & Witch Hazel for clear skin",
        "image_url": "https://storage.googleapis.com/image-analysis-52582.appspot.com/images/2307725900534467545.png", "manufacturer": "The Derma Co"
    },
    {
        "name": "The Derma Co 3% Niacinamide Foaming Face Wash - 100ml",
        "mrp": 349, "sale_price": 227, "category": "Skincare", "form": "Face Wash",
        "description": "Foaming Face Wash with 3% Niacinamide for oil control",
        "image_url": "https://storage.googleapis.com/image-analysis-52582.appspot.com/images/2307725900551114194.png", "manufacturer": "The Derma Co"
    },
    {
        "name": "The Derma Co 2% Cica-Glow Daily Face Wash",
        "mrp": 349, "sale_price": 227, "category": "Skincare", "form": "Face Wash",
        "description": "With Tranexamic Acid & Licorice Extract for glowing skin",
        "image_url": "https://storage.googleapis.com/image-analysis-52582.appspot.com/images/2307725900551364055.png", "manufacturer": "The Derma Co"
    },
    {
        "name": "The Derma Co Pore Minimizing Clay Daily Face Wash - 100ml",
        "mrp": 349, "sale_price": 227, "category": "Skincare", "form": "Face Wash",
        "description": "With 1% Niacinamide & 2% PHA for minimizing pores",
        "image_url": "https://storage.googleapis.com/image-analysis-52582.appspot.com/images/2307725900564120319.png", "manufacturer": "The Derma Co"
    },
]

# ==================== AQUALOGICA PRODUCTS ====================
AQUALOGICA_PRODUCTS = [
    {
        "name": "Aqualogica Hydrate+ Refresh Toning Mist",
        "mrp": 249, "sale_price": 162, "category": "Skincare", "form": "Toner",
        "description": "Refreshing toning mist for instant hydration",
        "image_url": "https://i.imgur.com/48zH3yB.png", "manufacturer": "Aqualogica"
    },
    {
        "name": "Aqualogica Glow Dewy Sunscreen SPF 50",
        "mrp": 449, "sale_price": 292, "category": "Sun Care", "form": "Sunscreen",
        "description": "Dewy sunscreen with SPF 50 for radiant, protected skin",
        "image_url": "https://i.imgur.com/25qH0m5.png", "manufacturer": "Aqualogica"
    },
    {
        "name": "Aqualogica Detan Dewy Sunscreen SPF 50",
        "mrp": 449, "sale_price": 292, "category": "Sun Care", "form": "Sunscreen",
        "description": "Detan dewy sunscreen with SPF 50 for tan removal & protection",
        "image_url": "https://i.imgur.com/2wM5g5L.png", "manufacturer": "Aqualogica"
    },
    {
        "name": "Aqualogica Radiance+ Dewy Sunscreen Gel SPF 50+ - 30g",
        "mrp": 299, "sale_price": 194, "category": "Sun Care", "form": "Sunscreen",
        "description": "Radiance boosting dewy sunscreen gel with SPF 50+",
        "image_url": "https://i.imgur.com/1G3W7dF.png", "manufacturer": "Aqualogica"
    },
    {
        "name": "Aqualogica Glow+ Concentrate Vitamin C Face Serum - 30ml",
        "mrp": 599, "sale_price": 389, "category": "Skincare", "form": "Serum",
        "description": "Concentrated Vitamin C face serum for glowing skin",
        "image_url": "https://i.imgur.com/t7q9iE7.png", "manufacturer": "Aqualogica"
    },
    {
        "name": "Aqualogica Radiance+ Concentrate Niacinamide Face Serum - 30ml",
        "mrp": 599, "sale_price": 389, "category": "Skincare", "form": "Serum",
        "description": "Concentrated Niacinamide face serum for radiant, even skin",
        "image_url": "https://i.imgur.com/Xq8Hxtg.png", "manufacturer": "Aqualogica"
    },
    {
        "name": "Aqualogica Hydrate+ Smoothie Face Wash - 100ml",
        "mrp": 249, "sale_price": 162, "category": "Skincare", "form": "Face Wash",
        "description": "Hydrating smoothie face wash for fresh, clean skin",
        "image_url": "https://i.imgur.com/Wp7VbE7.png", "manufacturer": "Aqualogica"
    },
    {
        "name": "Aqualogica Detan+ Smoothie Face Wash - 100ml",
        "mrp": 249, "sale_price": 162, "category": "Skincare", "form": "Face Wash",
        "description": "With Glycolic Acid & Cherry Tomato for tan removal, hydration & gentle exfoliation",
        "image_url": "https://i.imgur.com/x4N1eM5.png", "manufacturer": "Aqualogica"
    },
    {
        "name": "Aqualogica Radiance+ Smoothie Face Wash - 100ml",
        "mrp": 249, "sale_price": 162, "category": "Skincare", "form": "Face Wash",
        "description": "With Watermelon & Niacinamide. Reduces dark spots & blemishes.",
        "image_url": "https://i.imgur.com/j4q0rNf.png", "manufacturer": "Aqualogica"
    },
    {
        "name": "Aqualogica Glow+ Smoothie Face Wash with Vitamin C - 100ml",
        "mrp": 249, "sale_price": 162, "category": "Skincare", "form": "Face Wash",
        "description": "With Vitamin C, Hyaluronic Acid & Papaya for tan removal & glowing skin",
        "image_url": "https://i.imgur.com/Jb1tB0B.png", "manufacturer": "Aqualogica"
    },
    {
        "name": "Aqualogica Bright+ Smoothie Face Wash - 100ml",
        "mrp": 249, "sale_price": 162, "category": "Skincare", "form": "Face Wash",
        "description": "Brightening face wash with Blueberry, Kojic Acid, AHAs & BHAs for all skin types",
        "image_url": "https://i.imgur.com/JqWb9jB.png", "manufacturer": "Aqualogica"
    },
]

# ==================== CETAPHIL PRODUCTS (from Excel) ====================
CETAPHIL_PRODUCTS = [
    {"name": "Cetaphil Baby Daily Lotion 400ml", "mrp": 899, "sale_price": 764, "category": "Baby Care", "form": "Lotion", "description": "Hydrates baby skin for 24 hours, hypoallergenic", "manufacturer": "Cetaphil"},
    {"name": "Cetaphil Baby Wash & Shampoo 400ml", "mrp": 899, "sale_price": 764, "category": "Baby Care", "form": "Wash", "description": "Tear-free, gentle cleansing", "manufacturer": "Cetaphil"},
    {"name": "Cetaphil Baby Massage Oil 200ml", "mrp": 599, "sale_price": 509, "category": "Baby Care", "form": "Oil", "description": "Gentle oil for sensitive baby skin", "manufacturer": "Cetaphil"},
    {"name": "Cetaphil Baby Shampoo 200ml", "mrp": 499, "sale_price": 424, "category": "Baby Care", "form": "Shampoo", "description": "Chamomile soothing formula", "manufacturer": "Cetaphil"},
    {"name": "Cetaphil Baby Gentle Wash & Shampoo 230ml", "mrp": 549, "sale_price": 467, "category": "Baby Care", "form": "Wash", "description": "Head-to-toe cleansing", "manufacturer": "Cetaphil"},
    {"name": "Cetaphil Baby Bar 75g", "mrp": 299, "sale_price": 254, "category": "Baby Care", "form": "Soap", "description": "Soap-free bar with natural oils", "manufacturer": "Cetaphil"},
    {"name": "Cetaphil Baby Advanced Protection Cream 85g", "mrp": 549, "sale_price": 467, "category": "Baby Care", "form": "Cream", "description": "Prevents dryness and irritation", "manufacturer": "Cetaphil"},
    {"name": "Cetaphil Baby Moisturising Bath & Wash 230ml", "mrp": 599, "sale_price": 509, "category": "Baby Care", "form": "Wash", "description": "Tear-free newborn cleanser", "manufacturer": "Cetaphil"},
    {"name": "Cetaphil Baby Diaper Cream 70g", "mrp": 399, "sale_price": 339, "category": "Baby Care", "form": "Cream", "description": "Repairs rash damage", "manufacturer": "Cetaphil"},
    {"name": "Cetaphil Baby Wipes 40s", "mrp": 249, "sale_price": 212, "category": "Baby Care", "form": "Wipes", "description": "Moisturising biodegradable wipes", "manufacturer": "Cetaphil"},
    {"name": "Cetaphil Baby Wipes 80s", "mrp": 399, "sale_price": 339, "category": "Baby Care", "form": "Wipes", "description": "Moisturising biodegradable wipes", "manufacturer": "Cetaphil"},
    {"name": "Cetaphil Sun Kids SPF Lotion 100ml", "mrp": 799, "sale_price": 679, "category": "Sun Care", "form": "Sunscreen", "description": "UV protection for kids", "manufacturer": "Cetaphil"},
    {"name": "Cetaphil Sun Kids SPF Lotion 150ml", "mrp": 999, "sale_price": 849, "category": "Sun Care", "form": "Sunscreen", "description": "High protection sunscreen", "manufacturer": "Cetaphil"},
    {"name": "Cetaphil Gentle Skin Cleanser 250ml", "mrp": 599, "sale_price": 509, "category": "Skincare", "form": "Cleanser", "description": "Hydrating cleanser for sensitive skin", "manufacturer": "Cetaphil"},
    {"name": "Cetaphil Oily Skin Cleanser 125ml", "mrp": 449, "sale_price": 382, "category": "Skincare", "form": "Cleanser", "description": "Removes excess oil gently", "manufacturer": "Cetaphil"},
    {"name": "Cetaphil Moisturising Cream 250g", "mrp": 799, "sale_price": 679, "category": "Skincare", "form": "Cream", "description": "Long-lasting hydration for dry skin", "manufacturer": "Cetaphil"},
    {"name": "Cetaphil Daily Advance Lotion 100g", "mrp": 449, "sale_price": 382, "category": "Skincare", "form": "Lotion", "description": "48-hour hydration for sensitive skin", "manufacturer": "Cetaphil"},
    {"name": "Cetaphil Sun SPF 50 50ml", "mrp": 899, "sale_price": 764, "category": "Sun Care", "form": "Sunscreen", "description": "Broad spectrum protection SPF 50", "manufacturer": "Cetaphil"},
    {"name": "Cetaphil Brightening Day Cream 50g", "mrp": 699, "sale_price": 594, "category": "Skincare", "form": "Cream", "description": "Reduces dark spots and evens skin tone", "manufacturer": "Cetaphil"},
    {"name": "Cetaphil Brightening Night Cream 50g", "mrp": 699, "sale_price": 594, "category": "Skincare", "form": "Cream", "description": "Improves skin tone overnight", "manufacturer": "Cetaphil"},
    {"name": "Cetaphil Gentle Foaming Cleanser 236ml", "mrp": 649, "sale_price": 552, "category": "Skincare", "form": "Cleanser", "description": "Soap-free foaming cleanser", "manufacturer": "Cetaphil"},
    {"name": "Cetaphil Moisturising Lotion 500ml", "mrp": 999, "sale_price": 849, "category": "Skincare", "form": "Lotion", "description": "Smooth hydration for body", "manufacturer": "Cetaphil"},
]

# ==================== BILUMA PRODUCTS (from Excel) ====================
BILUMA_PRODUCTS = [
    {"name": "Biluma Advance Face Wash 100ml", "mrp": 399, "sale_price": 339, "category": "Skincare", "form": "Face Wash", "description": "Brightens and hydrates skin", "manufacturer": "Biluma"},
    {"name": "Biluma Advance Cream 25g", "mrp": 599, "sale_price": 509, "category": "Skincare", "form": "Cream", "description": "Brightens sensitive areas", "manufacturer": "Biluma"},
    {"name": "Biluma Advance Day Cream 50g", "mrp": 699, "sale_price": 594, "category": "Skincare", "form": "Cream", "description": "Day cream that protects skin from damage", "manufacturer": "Biluma"},
    {"name": "Biluma Advance Night Cream 45g", "mrp": 649, "sale_price": 552, "category": "Skincare", "form": "Cream", "description": "Night cream that rejuvenates skin", "manufacturer": "Biluma"},
    {"name": "Biluma Skin Brightening Lotion 45g", "mrp": 499, "sale_price": 424, "category": "Skincare", "form": "Lotion", "description": "Evens skin tone with regular use", "manufacturer": "Biluma"},
]

ALL_PRODUCTS = (
    MINIMALIST_PRODUCTS + DERMA_CO_PRODUCTS + AQUALOGICA_PRODUCTS +
    CETAPHIL_PRODUCTS + BILUMA_PRODUCTS
)


async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    now = datetime.now(timezone.utc).isoformat()
    inserted = 0
    skipped = 0

    for prod in ALL_PRODUCTS:
        # Check if product already exists by name + manufacturer
        existing = await db.medicines.find_one({
            "name": prod["name"],
            "manufacturer": prod.get("manufacturer", "")
        })
        if existing:
            skipped += 1
            continue

        discount = round((1 - prod["sale_price"] / prod["mrp"]) * 100) if prod["mrp"] > 0 else 0

        doc = {
            "id": str(uuid.uuid4()),
            "name": prod["name"],
            "mrp": prod["mrp"],
            "sale_price": prod["sale_price"],
            "price": prod["sale_price"],
            "discount_percent": discount,
            "category": prod.get("category", "Skincare"),
            "form": prod.get("form", "Other"),
            "manufacturer": prod.get("manufacturer", ""),
            "generic_name": "",
            "description": prod.get("description", ""),
            "image_url": prod.get("image_url", ""),
            "images": [{"id": str(uuid.uuid4()), "url": prod.get("image_url", "")}] if prod.get("image_url") else [],
            "prescription_required": False,
            "is_active": True,
            "store": "orange_pharmacy",
            "unit": "unit",
            "composition": "",
            "side_effects": "",
            "uses": prod.get("description", ""),
            "created_at": now,
            "updated_at": now,
        }

        await db.medicines.insert_one(doc)
        doc.pop("_id", None)
        inserted += 1

    print(f"Seeded {inserted} products, skipped {skipped} duplicates.")
    print(f"Brands: Minimalist ({len(MINIMALIST_PRODUCTS)}), The Derma Co ({len(DERMA_CO_PRODUCTS)}), Aqualogica ({len(AQUALOGICA_PRODUCTS)}), Cetaphil ({len(CETAPHIL_PRODUCTS)}), Biluma ({len(BILUMA_PRODUCTS)})")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
