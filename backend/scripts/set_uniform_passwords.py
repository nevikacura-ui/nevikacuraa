"""
Set Uniform Passwords for All Staff and Doctors
This script sets all staff and doctor accounts to use the same password: 'test1234'
"""

import asyncio
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "nevika_cura")

# Uniform password for all accounts
UNIFORM_PASSWORD = "test1234"

async def set_uniform_passwords():
    """Set all staff and doctor passwords to the same value"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Generate hash for uniform password
    password_hash = bcrypt.hashpw(UNIFORM_PASSWORD.encode(), bcrypt.gensalt()).decode()
    
    print(f"Setting uniform password '{UNIFORM_PASSWORD}' for all accounts...")
    print(f"Generated hash: {password_hash[:30]}...")
    
    # Staff accounts to create/update
    staff_accounts = [
        {
            "username": "staff_diagyn",
            "name": "DiaGyn Receptionist",
            "role": "clinic_staff",
            "department": "diagyn",
            "clinic": "Pushpa Clinic"
        },
        {
            "username": "staff_mango",
            "name": "Mango Labs Staff",
            "role": "diagnostic_staff",
            "department": "mango"
        },
        {
            "username": "staff_orange",
            "name": "Orange Pharmacy Staff",
            "role": "pharmacy_staff",
            "department": "orange"
        },
        {
            "username": "dr_vikas",
            "name": "Dr. Vikas Jha",
            "doctor_name": "Dr. Vikas Jha",
            "role": "doctor",
            "department": "diagyn",
            "clinic": "Pushpa Clinic",
            "clinics": ["Pushpa Clinic", "Amnion Clinic"]
        },
        {
            "username": "dr_neha",
            "name": "Dr. Neha Gupta",
            "doctor_name": "Dr. Neha Gupta",
            "role": "doctor",
            "department": "diagyn",
            "clinic": "Pushpa Clinic",
            "clinics": ["Pushpa Clinic"]
        },
        {
            "username": "admin",
            "name": "Admin",
            "role": "admin",
            "department": "admin"
        }
    ]
    
    for account in staff_accounts:
        username = account["username"]
        
        # Check if account exists
        existing = await db.staff.find_one({"username": username})
        
        if existing:
            # Update password
            result = await db.staff.update_one(
                {"username": username},
                {"$set": {
                    "password_hash": password_hash,
                    "active": True,
                    "is_active": True
                }}
            )
            print(f"✅ Updated {username} password")
        else:
            # Create new account
            account["password_hash"] = password_hash
            account["active"] = True
            account["is_active"] = True
            await db.staff.insert_one(account)
            print(f"✅ Created {username} account")
    
    print(f"\n{'='*50}")
    print("ALL ACCOUNTS NOW USE PASSWORD: test1234")
    print("="*50)
    print("\nLogin credentials for all portals:")
    print("-" * 40)
    print("DiaGyn Staff:    staff_diagyn / test1234")
    print("Mango Labs:      staff_mango / test1234")
    print("Orange Pharmacy: staff_orange / test1234")
    print("Dr. Vikas Jha:   dr_vikas / test1234")
    print("Dr. Neha Gupta:  dr_neha / test1234")
    print("Admin:           admin / test1234")
    print("-" * 40)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(set_uniform_passwords())
