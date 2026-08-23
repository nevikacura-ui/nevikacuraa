"""
Nevika Cura - Database Configuration
MongoDB connection and initialization
"""

import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

# Get environment variables
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "nevikacura")

# MongoDB client (initialized on startup)
client = None
db = None

async def init_db():
    """Initialize MongoDB connection"""
    global client, db
    
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Test connection
        await client.admin.command('ping')
        logger.info(f"MongoDB connection established successfully to {DB_NAME}")
        
        # Create indexes
        await create_indexes()
        
        return db
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise

async def create_indexes():
    """Create database indexes for better performance"""
    global db
    
    try:
        # User indexes
        await db.users.create_index("phone", unique=True, sparse=True)
        await db.users.create_index("email", unique=True, sparse=True)
        await db.users.create_index("id", unique=True)
        
        # Appointment indexes
        await db.appointments.create_index("id", unique=True)
        await db.appointments.create_index([("doctor", 1), ("clinic", 1), ("date", 1)])
        await db.appointments.create_index("patient_phone")
        await db.appointments.create_index("user_id")
        
        # Order indexes
        await db.pharmacy_orders.create_index("id", unique=True)
        await db.pharmacy_orders.create_index("patient_phone")
        await db.test_orders.create_index("id", unique=True)
        await db.diagnostic_orders.create_index("id", unique=True)
        
        # Staff indexes
        await db.staff.create_index("id", unique=True)
        await db.staff.create_index("username", unique=True, sparse=True)
        
        # Push subscription indexes
        await db.push_subscriptions.create_index("user_id")
        await db.push_subscriptions.create_index("endpoint", unique=True)
        
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.warning(f"Error creating indexes (may already exist): {e}")

async def close_db():
    """Close MongoDB connection"""
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed")

def get_db():
    """Get database instance - falls back to server.db if database module not initialized"""
    global db
    if db is not None:
        return db
    # Fallback: get db from the main server module (which initializes it directly)
    try:
        from server import db as server_db
        return server_db
    except ImportError:
        raise RuntimeError("Database not initialized. Call init_db() first.")
