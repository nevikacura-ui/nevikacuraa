"""
Nevika Cura Healthcare Application
Main FastAPI Server - Modular Architecture

This is the main entry point that sets up the FastAPI app,
middleware, and includes all route modules.
"""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import database
from database import init_db, close_db, get_db

# Import services
from services.push import set_db as set_push_db

# ============ Lifespan Context ============

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown"""
    # Startup
    logger.info("Starting Nevika Cura Healthcare Application...")
    
    # Initialize database
    db = await init_db()
    
    # Set database reference for push notifications
    set_push_db(db)
    
    # Create upload directories
    os.makedirs("uploads/bills", exist_ok=True)
    os.makedirs("uploads/reports", exist_ok=True)
    os.makedirs("uploads/prescriptions", exist_ok=True)
    
    logger.info("Application startup complete")
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    await close_db()

# ============ Create FastAPI App ============

app = FastAPI(
    title="Nevika Cura Healthcare API",
    description="Healthcare management system for DiaGyn, Proton Diagnostics, and Orange Pharmacy",
    version="2.0.0",
    lifespan=lifespan
)

# ============ CORS Middleware ============

CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")
origins = CORS_ORIGINS.split(",") if CORS_ORIGINS != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ Static Files ============

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ============ Import and Include Routers ============

# Auth routes
from routes.auth import router as auth_router
app.include_router(auth_router, prefix="/api")

# Note: Other routes will be added as they are modularized
# For now, we import from the legacy server_legacy.py

# ============ Health Check ============

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    try:
        db = get_db()
        await db.command("ping")
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "service": "Nevika Cura Healthcare API",
        "version": "2.0.0",
        "database": db_status
    }

@app.get("/health")
async def health():
    """Legacy health endpoint"""
    return await health_check()

# ============ Error Handlers ============

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

# ============ Main Entry Point ============

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server_new:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
