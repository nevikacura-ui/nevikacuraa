#!/usr/bin/env python3
"""
Import Glenmark products from JSON file into MongoDB pharmacy_inventory
"""

import asyncio
import json
import os
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME')

# Form to icon mapping (matching existing pattern in the app)
FORM_ICONS = {
    'tablet': '/assets/icons/pill.svg',
    'capsule': '/assets/icons/capsule.svg',
    'syrup': '/assets/icons/syrup.svg',
    'cream': '/assets/icons/tube.svg',
    'drops': '/assets/icons/drops.svg',
    'injection': '/assets/icons/injection.svg',
    'powder': '/assets/icons/powder.svg',
    'inhaler': '/assets/icons/inhaler.svg',
    'gel': '/assets/icons/tube.svg',
    'ointment': '/assets/icons/tube.svg',
    'lotion': '/assets/icons/bottle.svg',
    'suspension': '/assets/icons/syrup.svg',
}

def get_icon_for_form(form: str) -> str:
    """Get appropriate icon URL based on medicine form"""
    form_lower = form.lower() if form else 'tablet'
    for key, icon in FORM_ICONS.items():
        if key in form_lower:
            return icon
    return '/assets/icons/pill.svg'  # Default to pill icon

async def import_glenmark_products():
    """Import Glenmark products from JSON to MongoDB"""
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Read the JSON file
    json_path = '/app/glenmark_products.json'
    with open(json_path, 'r') as f:
        products = json.load(f)
    
    print(f"Found {len(products)} products in Glenmark JSON file")
    
    # Check for existing Glenmark products
    existing_count = await db.pharmacy_inventory.count_documents({'source': 'Glenmark'})
    print(f"Existing Glenmark products in database: {existing_count}")
    
    if existing_count > 0:
        print("Removing existing Glenmark products before reimport...")
        result = await db.pharmacy_inventory.delete_many({'source': 'Glenmark'})
        print(f"Deleted {result.deleted_count} existing Glenmark products")
    
    # Prepare documents for insertion
    documents = []
    for product in products:
        doc = {
            'id': str(uuid.uuid4()),
            'name': product['name'],
            'mrp': float(product['mrp']),
            'sale_price': float(product['mrp']),  # Sale price = MRP (no discount)
            'discount_percent': 0,
            'form': product.get('form', 'Tablet'),
            'category': product.get('category', 'General'),
            'composition': product.get('composition', ''),
            'description': product.get('composition', ''),  # Use composition as description
            'image_url': get_icon_for_form(product.get('form', 'Tablet')),
            'stock': 100,  # Default stock
            'unit': 'strip',
            'source': 'Glenmark',
            'created_at': datetime.now(timezone.utc).isoformat(),
            'created_by': 'system_import'
        }
        documents.append(doc)
    
    # Bulk insert
    if documents:
        result = await db.pharmacy_inventory.insert_many(documents)
        print(f"Successfully inserted {len(result.inserted_ids)} Glenmark products")
    
    # Verify total count
    total_count = await db.pharmacy_inventory.count_documents({})
    glenmark_count = await db.pharmacy_inventory.count_documents({'source': 'Glenmark'})
    
    print(f"\n=== Import Summary ===")
    print(f"Total products in database: {total_count}")
    print(f"Glenmark products: {glenmark_count}")
    
    # Close connection
    client.close()
    
    return total_count, glenmark_count

if __name__ == '__main__':
    asyncio.run(import_glenmark_products())
