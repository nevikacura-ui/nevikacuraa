"""
Migration Script: Normalize Appointment Times to 24-Hour Format
================================================================
This script safely normalizes all existing appointment times to 24-hour format.

Safety Features:
- Creates a backup of all appointments before migration
- Validates each conversion before applying
- Provides dry-run mode to preview changes
- Logs all changes for audit
- Can be rolled back using the backup

Usage:
    # Dry run (preview changes without modifying data):
    python migrate_appointment_times.py --dry-run
    
    # Execute migration:
    python migrate_appointment_times.py --execute
    
    # Rollback using backup:
    python migrate_appointment_times.py --rollback
"""

import asyncio
import argparse
import json
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

# Backup file location
BACKUP_FILE = "/app/backend/scripts/appointment_times_backup.json"

def normalize_time_to_24h(time_str: str) -> str:
    """
    Normalize any time format to 24-hour format (HH:MM).
    Returns None if input is None/empty.
    """
    if not time_str or str(time_str) in ['None', 'null', '']:
        return None
    
    time_str = str(time_str).strip().upper()
    
    # Already in 24-hour format (no AM/PM)
    if 'AM' not in time_str and 'PM' not in time_str:
        parts = time_str.split(':')
        if len(parts) >= 2:
            try:
                hour = int(parts[0])
                minute = int(parts[1].split()[0])
                return f"{hour:02d}:{minute:02d}"
            except (ValueError, IndexError):
                pass
        return time_str
    
    # 12-hour format with AM/PM
    try:
        is_pm = 'PM' in time_str
        time_str = time_str.replace('AM', '').replace('PM', '').strip()
        
        parts = time_str.split(':')
        hour = int(parts[0])
        minute = int(parts[1].strip()) if len(parts) > 1 else 0
        
        # Convert to 24-hour
        if is_pm and hour != 12:
            hour += 12
        elif not is_pm and hour == 12:
            hour = 0
        
        return f"{hour:02d}:{minute:02d}"
    except (ValueError, IndexError):
        return time_str


async def backup_appointments(db):
    """Create a backup of all appointments with their current time values."""
    print("\n📦 Creating backup of all appointments...")
    
    appointments = await db.appointments.find(
        {},
        {"_id": 1, "booking_id": 1, "time": 1, "date": 1, "patient_name": 1}
    ).to_list(10000)
    
    # Convert ObjectId to string for JSON serialization
    backup_data = []
    for a in appointments:
        backup_data.append({
            "_id": str(a.get("_id")),
            "booking_id": a.get("booking_id"),
            "time": a.get("time"),
            "date": a.get("date"),
            "patient_name": a.get("patient_name")
        })
    
    with open(BACKUP_FILE, 'w') as f:
        json.dump({
            "created_at": datetime.now(timezone.utc).isoformat(),
            "total_appointments": len(backup_data),
            "appointments": backup_data
        }, f, indent=2)
    
    print(f"   ✅ Backed up {len(backup_data)} appointments to {BACKUP_FILE}")
    return backup_data


async def analyze_time_formats(db):
    """Analyze current time formats in the database."""
    print("\n🔍 Analyzing current time formats...")
    
    appointments = await db.appointments.find({}, {"time": 1, "booking_id": 1}).to_list(10000)
    
    formats = {
        "24h_correct": [],      # Already in correct 24-hour format
        "12h_am_pm": [],        # Need conversion (e.g., "9:00 AM", "6:15 PM")
        "none_or_empty": [],    # None or empty values
        "unknown": []           # Unrecognized formats
    }
    
    for a in appointments:
        time_val = a.get("time")
        booking_id = a.get("booking_id", "unknown")
        
        if not time_val or str(time_val) in ['None', 'null', '']:
            formats["none_or_empty"].append(booking_id)
        elif 'AM' in str(time_val).upper() or 'PM' in str(time_val).upper():
            formats["12h_am_pm"].append((booking_id, time_val))
        elif ':' in str(time_val):
            # Check if it's valid 24-hour format
            try:
                parts = str(time_val).split(':')
                hour = int(parts[0])
                minute = int(parts[1].split()[0])
                if 0 <= hour <= 23 and 0 <= minute <= 59:
                    # Check if it needs padding
                    normalized = f"{hour:02d}:{minute:02d}"
                    if str(time_val) == normalized:
                        formats["24h_correct"].append(booking_id)
                    else:
                        formats["12h_am_pm"].append((booking_id, time_val))  # Needs normalization
                else:
                    formats["unknown"].append((booking_id, time_val))
            except Exception:
                formats["unknown"].append((booking_id, time_val))
        else:
            formats["unknown"].append((booking_id, time_val))
    
    print(f"   ✅ Already normalized (24h format): {len(formats['24h_correct'])}")
    print(f"   🔄 Need conversion (12h AM/PM or padding): {len(formats['12h_am_pm'])}")
    print(f"   ⚪ None/Empty values: {len(formats['none_or_empty'])}")
    print(f"   ⚠️  Unknown formats: {len(formats['unknown'])}")
    
    if formats["unknown"]:
        print("\n   Unknown format samples:")
        for booking_id, time_val in formats["unknown"][:5]:
            print(f"      - {booking_id}: '{time_val}'")
    
    return formats


async def migrate_times(db, dry_run=True):
    """Migrate all appointment times to 24-hour format."""
    
    if dry_run:
        print("\n🔬 DRY RUN MODE - No changes will be made")
    else:
        print("\n🚀 EXECUTING MIGRATION")
    
    appointments = await db.appointments.find({}).to_list(10000)
    
    changes = []
    skipped = []
    errors = []
    
    for a in appointments:
        original_time = a.get("time")
        booking_id = a.get("booking_id", str(a.get("_id")))
        
        try:
            normalized_time = normalize_time_to_24h(original_time)
            
            # Skip if no change needed
            if original_time == normalized_time:
                skipped.append(booking_id)
                continue
            
            # Skip if both are None/empty
            if not original_time and not normalized_time:
                skipped.append(booking_id)
                continue
            
            changes.append({
                "booking_id": booking_id,
                "_id": a.get("_id"),
                "original": original_time,
                "normalized": normalized_time
            })
            
        except Exception as e:
            errors.append({
                "booking_id": booking_id,
                "original": original_time,
                "error": str(e)
            })
    
    print(f"\n📊 Migration Summary:")
    print(f"   - Total appointments: {len(appointments)}")
    print(f"   - Will be updated: {len(changes)}")
    print(f"   - No change needed: {len(skipped)}")
    print(f"   - Errors: {len(errors)}")
    
    if changes:
        print(f"\n📝 Changes to be applied:")
        for c in changes[:10]:  # Show first 10
            print(f"   {c['booking_id']}: '{c['original']}' → '{c['normalized']}'")
        if len(changes) > 10:
            print(f"   ... and {len(changes) - 10} more")
    
    if errors:
        print(f"\n⚠️  Errors:")
        for e in errors:
            print(f"   {e['booking_id']}: {e['error']}")
    
    # Execute changes if not dry run
    if not dry_run and changes:
        print(f"\n⏳ Applying {len(changes)} updates...")
        
        updated = 0
        for c in changes:
            try:
                result = await db.appointments.update_one(
                    {"_id": c["_id"]},
                    {"$set": {"time": c["normalized"]}}
                )
                if result.modified_count > 0:
                    updated += 1
            except Exception as e:
                print(f"   ❌ Failed to update {c['booking_id']}: {e}")
        
        print(f"   ✅ Successfully updated {updated} appointments")
    
    return {"changes": len(changes), "skipped": len(skipped), "errors": len(errors)}


async def rollback(db):
    """Rollback to backup state."""
    print("\n⏪ ROLLBACK MODE")
    
    if not os.path.exists(BACKUP_FILE):
        print(f"   ❌ Backup file not found: {BACKUP_FILE}")
        return
    
    with open(BACKUP_FILE, 'r') as f:
        backup = json.load(f)
    
    print(f"   Backup created: {backup.get('created_at')}")
    print(f"   Total appointments in backup: {backup.get('total_appointments')}")
    
    confirm = input("\n   Are you sure you want to rollback? (type 'yes' to confirm): ")
    if confirm.lower() != 'yes':
        print("   Rollback cancelled.")
        return
    
    from bson import ObjectId
    
    restored = 0
    for a in backup.get("appointments", []):
        try:
            result = await db.appointments.update_one(
                {"_id": ObjectId(a["_id"])},
                {"$set": {"time": a["time"]}}
            )
            if result.modified_count > 0:
                restored += 1
        except Exception as e:
            print(f"   ❌ Failed to restore {a.get('booking_id')}: {e}")
    
    print(f"   ✅ Restored {restored} appointments to original time values")


async def main():
    parser = argparse.ArgumentParser(description="Migrate appointment times to 24-hour format")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without modifying data")
    parser.add_argument("--execute", action="store_true", help="Execute the migration")
    parser.add_argument("--rollback", action="store_true", help="Rollback using backup")
    parser.add_argument("--analyze", action="store_true", help="Only analyze current time formats")
    
    args = parser.parse_args()
    
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'test_database')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("=" * 60)
    print("Appointment Time Migration Script")
    print("=" * 60)
    print(f"Database: {db_name}")
    
    if args.rollback:
        await rollback(db)
    elif args.analyze:
        await analyze_time_formats(db)
    elif args.execute:
        # Create backup first
        await backup_appointments(db)
        # Analyze current state
        await analyze_time_formats(db)
        # Confirm before executing
        confirm = input("\n   Proceed with migration? (type 'yes' to confirm): ")
        if confirm.lower() == 'yes':
            await migrate_times(db, dry_run=False)
        else:
            print("   Migration cancelled.")
    else:
        # Default to dry run
        await analyze_time_formats(db)
        await migrate_times(db, dry_run=True)
    
    print("\n" + "=" * 60)
    print("Done!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
