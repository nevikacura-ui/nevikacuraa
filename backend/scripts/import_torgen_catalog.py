"""
Torgen Catalog PDF Import Script
Extracts medicine data (Name, MRP, Composition) from PDF tables
"""

import pdfplumber
import re
import json
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
from datetime import datetime, timezone
import os

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

def clean_text(text):
    """Clean and normalize text"""
    if not text:
        return ""
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text.strip())
    return text

def parse_mrp(mrp_str):
    """Parse MRP string to float"""
    try:
        # Remove any non-numeric characters except decimal point
        cleaned = re.sub(r'[^\d.]', '', str(mrp_str))
        return float(cleaned) if cleaned else 0.0
    except Exception:
        return 0.0

def extract_products_from_pdf(pdf_path):
    """Extract products from PDF tables"""
    products = []
    seen_names = set()  # To avoid duplicates
    
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            # Try extracting tables
            tables = page.extract_tables()
            
            for table in tables:
                if not table:
                    continue
                    
                for row in table:
                    if not row or len(row) < 5:
                        continue
                    
                    # Skip header rows
                    if any(h in str(row).upper() for h in ['SL. NO', 'BRAND NAME', 'COMPOSITION', 'PACK', 'MRP']):
                        # Check if this is actually a header row
                        if row[0] and 'SL' in str(row[0]).upper():
                            continue
                    
                    # Try to parse product data
                    try:
                        sl_no = row[0]
                        brand_name = row[1]
                        composition = row[2]
                        pack = row[3]
                        mrp = row[4]
                        
                        # Validate we have actual data
                        if not brand_name or not sl_no:
                            continue
                        
                        # Skip if sl_no is not numeric-like
                        try:
                            int(str(sl_no).strip())
                        except Exception:
                            continue
                        
                        brand_name = clean_text(brand_name)
                        composition = clean_text(composition)
                        
                        # Skip if name is empty or too short
                        if not brand_name or len(brand_name) < 2:
                            continue
                        
                        # Skip duplicates
                        name_key = brand_name.upper()
                        if name_key in seen_names:
                            continue
                        seen_names.add(name_key)
                        
                        # Parse MRP
                        mrp_value = parse_mrp(mrp)
                        if mrp_value <= 0:
                            continue
                        
                        # Determine form/category from name or composition
                        form = determine_form(brand_name, composition)
                        category = determine_category(brand_name, composition)
                        
                        product = {
                            'sl_no': sl_no,
                            'name': brand_name,
                            'composition': composition,
                            'pack': clean_text(pack) if pack else '',
                            'mrp': mrp_value,
                            'form': form,
                            'category': category
                        }
                        
                        products.append(product)
                        
                    except Exception as e:
                        continue
    
    return products

def determine_form(name, composition):
    """Determine medicine form from name/composition"""
    name_upper = (name or '').upper()
    comp_upper = (composition or '').upper()
    combined = name_upper + ' ' + comp_upper
    
    if any(x in combined for x in ['SYRUP', 'SUSP', 'SUSPENSION', 'ML ', ' ML']):
        return 'Syrup'
    elif any(x in combined for x in ['INJ', 'INJECTION', 'VIAL']):
        return 'Injection'
    elif any(x in combined for x in ['DROP', 'DROPS']):
        return 'Drops'
    elif any(x in combined for x in ['CREAM', 'OINTMENT', 'GEL', 'LOTION']):
        return 'Cream'
    elif any(x in combined for x in ['CAPSULE', 'CAP']):
        return 'Capsule'
    elif any(x in combined for x in ['RESPULE', 'INHALER', 'NEBULIZER']):
        return 'Inhaler'
    elif any(x in combined for x in ['POWDER', 'SACHET']):
        return 'Powder'
    else:
        return 'Tablet'

def determine_category(name, composition):
    """Determine medicine category from name/composition"""
    combined = ((name or '') + ' ' + (composition or '')).upper()
    
    if any(x in combined for x in ['PARACETAMOL', 'FEVER', 'COLD', 'COUGH']):
        return 'Cold & Fever'
    elif any(x in combined for x in ['ACECLOFENAC', 'DICLOFENAC', 'PAIN', 'NIMESULIDE', 'ETORICOXIB']):
        return 'Pain Relief'
    elif any(x in combined for x in ['OMEPRAZOLE', 'PANTOPRAZOLE', 'ANTACID', 'ALUMINIUM HYDROXIDE', 'DOMPERIDONE']):
        return 'Digestive Health'
    elif any(x in combined for x in ['ANTIBIOTIC', 'AMOXICILLIN', 'CEFUROXIME', 'CEFTRIAXONE', 'OFLOXACIN', 'AZITHROMYCIN']):
        return 'Antibiotics'
    elif any(x in combined for x in ['VITAMIN', 'CALCIUM', 'IRON', 'FOLIC', 'B12', 'ZINC']):
        return 'Vitamins & Supplements'
    elif any(x in combined for x in ['DIABETES', 'METFORMIN', 'GLIMEPIRIDE', 'INSULIN']):
        return 'Diabetes Care'
    elif any(x in combined for x in ['SKIN', 'DERMA', 'ACNE', 'FUNGAL', 'ANTIFUNGAL']):
        return 'Skin Care'
    elif any(x in combined for x in ['EYE', 'OPHTHALMIC']):
        return 'Eye Care'
    elif any(x in combined for x in ['CARDIAC', 'HEART', 'BP', 'AMLODIPINE', 'ATENOLOL']):
        return 'Heart Care'
    elif any(x in combined for x in ['RESPIRATORY', 'ASTHMA', 'SALBUTAMOL', 'BUDESONIDE']):
        return 'Respiratory'
    elif any(x in combined for x in ['ALLERGY', 'ANTIHISTAMINE', 'CETIRIZINE', 'FEXOFENADINE', 'LEVOCETRIZINE']):
        return 'Allergy'
    elif any(x in combined for x in ['MUSCLE', 'THIOCOLCHICOSIDE']):
        return 'Muscle Relaxant'
    else:
        return 'General'

async def import_products_to_db(products):
    """Import products to MongoDB pharmacy_inventory collection"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Clear existing inventory (fresh import)
    await db.pharmacy_inventory.delete_many({})
    print(f"Cleared existing pharmacy inventory")
    
    # Prepare documents for insertion
    docs = []
    for p in products:
        # Calculate sale price (no discount for now)
        sale_price = p['mrp']
        
        doc = {
            "id": str(uuid.uuid4()),
            "name": p['name'],
            "form": p['form'],
            "category": p['category'],
            "composition": p['composition'],  # Store composition as details
            "pack": p.get('pack', ''),
            "image_url": "",  # Will be updated later with actual images
            "mrp": p['mrp'],
            "discount_percent": 0,
            "sale_price": sale_price,
            "stock": 100,  # Default stock
            "unit": "strip",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "pdf_import"
        }
        docs.append(doc)
    
    if docs:
        result = await db.pharmacy_inventory.insert_many(docs)
        print(f"Inserted {len(result.inserted_ids)} products into pharmacy_inventory")
    
    client.close()
    return len(docs)

def main():
    pdf_path = '/app/backend/data/imports/torgen_catalog.pdf'
    
    print("="*60)
    print("TORGEN CATALOG IMPORT")
    print("="*60)
    
    # Extract products from PDF
    print("\nExtracting products from PDF...")
    products = extract_products_from_pdf(pdf_path)
    
    print(f"\nExtracted {len(products)} products")
    
    # Show sample products
    print("\nSample products:")
    for p in products[:10]:
        print(f"  {p['name'][:35]:35} | MRP: ₹{p['mrp']:.2f} | {p['category']}")
    
    # Save to JSON for review
    with open('/app/extracted_products.json', 'w') as f:
        json.dump(products, f, indent=2)
    print(f"\nSaved extracted products to /app/extracted_products.json")
    
    # Import to database
    print("\nImporting to database...")
    count = asyncio.run(import_products_to_db(products))
    
    print(f"\n{'='*60}")
    print(f"IMPORT COMPLETE: {count} products imported to pharmacy_inventory")
    print(f"{'='*60}")
    
    return count

if __name__ == "__main__":
    main()
