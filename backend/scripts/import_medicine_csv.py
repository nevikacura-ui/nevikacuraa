#!/usr/bin/env python3
"""
Import massive medicine CSV data (195K+ products) into MongoDB pharmacy_inventory
"""

import asyncio
import csv
import io
import re
import uuid
import zipfile
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv('/app/backend/.env')

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME')

# Form detection based on product name keywords
FORM_PATTERNS = {
    'Tablet': ['tablet', 'tab', 'tabs', ' dt ', 'dispersible', 'chewable'],
    'Capsule': ['capsule', 'cap', 'caps', 'softgel'],
    'Syrup': ['syrup', 'suspension', 'liquid', 'oral solution', 'elixir'],
    'Injection': ['injection', 'inj', 'vial', 'ampoule', 'amp', 'prefilled'],
    'Cream': ['cream', 'ointment', 'gel', 'topical'],
    'Drops': ['drop', 'drops', 'eye drop', 'ear drop', 'nasal'],
    'Inhaler': ['inhaler', 'rotacap', 'respule', 'nebuliser', 'puff'],
    'Powder': ['powder', 'sachet', 'granules', 'effervescent'],
    'Lotion': ['lotion', 'solution', 'wash'],
    'Spray': ['spray', 'nasal spray'],
    'Patch': ['patch', 'transdermal'],
    'Suppository': ['suppository', 'supp'],
}

# Icon mapping for forms
FORM_ICONS = {
    'Tablet': '/assets/icons/pill.svg',
    'Capsule': '/assets/icons/capsule.svg',
    'Syrup': '/assets/icons/syrup.svg',
    'Injection': '/assets/icons/injection.svg',
    'Cream': '/assets/icons/tube.svg',
    'Drops': '/assets/icons/drops.svg',
    'Inhaler': '/assets/icons/inhaler.svg',
    'Powder': '/assets/icons/powder.svg',
    'Lotion': '/assets/icons/bottle.svg',
    'Spray': '/assets/icons/spray.svg',
    'Patch': '/assets/icons/patch.svg',
    'Suppository': '/assets/icons/pill.svg',
    'Other': '/assets/icons/pill.svg',
}

def detect_form(product_name: str) -> str:
    """Detect medicine form from product name"""
    name_lower = product_name.lower()
    for form, keywords in FORM_PATTERNS.items():
        for keyword in keywords:
            if keyword in name_lower:
                return form
    return 'Tablet'  # Default

def parse_price(price_str: str) -> float:
    """Parse price string like '₹133.93' to float"""
    if not price_str:
        return 0.0
    # Remove currency symbol and any whitespace
    cleaned = re.sub(r'[₹$,\s]', '', price_str)
    try:
        return float(cleaned)
    except ValueError:
        return 0.0

def get_icon_for_form(form: str) -> str:
    """Get icon URL for medicine form"""
    return FORM_ICONS.get(form, FORM_ICONS['Other'])

async def import_medicines():
    """Import all medicines from CSV ZIP file"""
    
    print("Connecting to MongoDB...")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Read ZIP file
    print("Reading ZIP file...")
    zip_path = '/app/medicine_data.zip'
    
    with zipfile.ZipFile(zip_path, 'r') as z:
        with z.open('medicine_data.csv') as f:
            content = f.read().decode('utf-8', errors='ignore')
    
    print("Parsing CSV...")
    reader = csv.DictReader(io.StringIO(content))
    rows = list(reader)
    total = len(rows)
    print(f"Found {total:,} medicines to import")
    
    # Clear existing inventory from this source
    print("Clearing previous CSV import data...")
    result = await db.pharmacy_inventory.delete_many({'source': 'MedicineCSV'})
    print(f"Removed {result.deleted_count:,} previous CSV import records")
    
    # Process in batches
    BATCH_SIZE = 5000
    imported = 0
    
    print(f"Importing in batches of {BATCH_SIZE}...")
    
    for batch_start in range(0, total, BATCH_SIZE):
        batch_end = min(batch_start + BATCH_SIZE, total)
        batch = rows[batch_start:batch_end]
        
        documents = []
        for row in batch:
            product_name = row.get('product_name', '').strip()
            if not product_name:
                continue
            
            form = detect_form(product_name)
            mrp = parse_price(row.get('product_price', '0'))
            
            doc = {
                'id': str(uuid.uuid4()),
                'name': product_name,
                'mrp': mrp,
                'sale_price': mrp,
                'discount_percent': 0,
                'form': form,
                'category': row.get('sub_category', 'General').strip(),
                'composition': row.get('salt_composition', '').strip(),
                'description': row.get('medicine_desc', '').strip()[:500],  # Truncate long descriptions
                'manufacturer': row.get('product_manufactured', '').strip(),
                'side_effects': row.get('side_effects', '').strip()[:500],
                'drug_interactions': row.get('drug_interactions', '').strip()[:500],
                'image_url': get_icon_for_form(form),
                'stock': 100,
                'unit': 'strip',
                'source': 'MedicineCSV',
                'created_at': datetime.now(timezone.utc).isoformat(),
                'created_by': 'system_import'
            }
            documents.append(doc)
        
        if documents:
            await db.pharmacy_inventory.insert_many(documents)
            imported += len(documents)
            progress = (imported / total) * 100
            print(f"  Imported {imported:,} / {total:,} ({progress:.1f}%)")
    
    # Get final stats
    total_count = await db.pharmacy_inventory.count_documents({})
    csv_count = await db.pharmacy_inventory.count_documents({'source': 'MedicineCSV'})
    
    print(f"\n{'='*50}")
    print(f"IMPORT COMPLETE!")
    print(f"{'='*50}")
    print(f"Medicines from CSV: {csv_count:,}")
    print(f"Total in database: {total_count:,}")
    
    client.close()
    return total_count, csv_count

if __name__ == '__main__':
    asyncio.run(import_medicines())
