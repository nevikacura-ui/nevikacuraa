"""
Shared utility to generate unique 6-digit numerical order/booking IDs.
Used across Pharmacy, Lab, and Diagnostics order creation.
"""
import random

async def generate_6digit_id(db, collection_name: str, field_name: str = "id") -> str:
    """Generate a unique 6-digit numerical ID for an order/booking.
    
    Checks against existing IDs in the given collection to ensure uniqueness.
    Range: 100000-999999 (always 6 digits).
    """
    for _ in range(50):
        code = str(random.randint(100000, 999999))
        existing = await db[collection_name].find_one({field_name: code})
        if not existing:
            # Also check other common id fields
            if field_name != "order_id":
                existing2 = await db[collection_name].find_one({"order_id": code})
                if existing2:
                    continue
            if field_name != "booking_id":
                existing3 = await db[collection_name].find_one({"booking_id": code})
                if existing3:
                    continue
            return code
    # Fallback: use timestamp-based 6-digit
    import time
    return str(int(time.time()) % 900000 + 100000)
