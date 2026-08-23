"""
Nevika Cura - Medicine Inventory
Orange Pharmacy medicine database

This file will be populated with fresh inventory data.
Expected format for each medicine:
{
    "name": "Medicine Name",
    "form": "Tablet/Syrup/Capsule/Injection/etc",
    "mrp": 0.00,  # Price in INR
    "pack": "10's/30ml/etc",
    "company": "Manufacturer Name",
    "category": "antibiotics/antifungal/gastro/etc",
    "composition": "Active ingredients",
    "image": "/medicines/image_path.jpeg"  # Optional
}
"""

# Medicine inventory - will be populated with fresh data
MEDICINE_INVENTORY = []
